<?php

namespace App\Services;

use App\Models\ShopItem;
use App\Models\User;
use App\Models\UserItem;

/**
 * 灵石商城引擎
 */
class MallService
{
    /** 获取商城可购买物品列表 */
    public function getAvailableItems(): array
    {
        return ShopItem::where('is_active', true)->orderBy('price_stones')->get()->toArray();
    }

    /** 购买物品 */
    public function purchase(User $user, string $itemId, int $quantity = 1): array
    {
        $item = ShopItem::where('item_id', $itemId)->where('is_active', true)->first();
        if (!$item) {
            return ['success' => false, 'message' => '该商品不存在'];
        }

        $totalCost = $item->price_stones * $quantity;
        if ($user->spirit_stone < $totalCost) {
            return ['success' => false, 'message' => "灵石不足（需要{$totalCost}，当前{$user->spirit_stone}）"];
        }

        $user->decrement('spirit_stone', $totalCost);

        UserItem::create([
            'user_id' => $user->id,
            'item_id' => $itemId,
            'quantity' => $quantity,
        ]);

        // 即时生效类在购买时直接应用
        $effect = $item->effect ?? [];
        $instantMessage = $this->applyInstantEffect($user, (string) ($effect['type'] ?? ''), $effect);

        return [
            'success' => true,
            'message' => $instantMessage
                ? "购买成功！{$instantMessage}"
                : "购买成功！消耗{$totalCost}灵石",
            'item' => $item->name,
        ];
    }

    /** 从储物袋使用物品 */
    public function useItem(User $user, string $itemId): array
    {
        $user = $user->fresh();
        $row = $this->findInventoryRow($user->id, $itemId);
        if (!$row) {
            return ['success' => false, 'message' => '储物袋中没有该物品'];
        }

        $shopItem = ShopItem::where('item_id', $itemId)->where('is_active', true)->first();
        if (!$shopItem) {
            return ['success' => false, 'message' => '物品已失效'];
        }

        $effect = $shopItem->effect ?? [];
        $type = (string) ($effect['type'] ?? '');
        $message = $this->applyUsableEffect($user, $type, $effect);
        if ($message === null) {
            return ['success' => false, 'message' => '该物品请直接在坊市购买后自动生效，或暂不可使用'];
        }

        $this->consumeInventoryRow($row);
        $user->save();

        return [
            'success' => true,
            'message' => $message,
            'buffs' => $this->getActiveBuffs($user->fresh()),
        ];
    }

    /** 获取用户物品列表（按 item_id 合并数量） */
    public function getUserItems(int $userId): array
    {
        $rows = UserItem::where('user_id', $userId)
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->orderBy('purchased_at')
            ->get();

        $grouped = [];
        foreach ($rows as $row) {
            $itemId = (string) $row->item_id;
            if (!isset($grouped[$itemId])) {
                $grouped[$itemId] = [
                    'item_id' => $itemId,
                    'quantity' => 0,
                ];
            }
            $grouped[$itemId]['quantity'] += (int) $row->quantity;
        }

        return array_values($grouped);
    }

    /** 当前生效中的道具增益 */
    public function getActiveBuffs(User $user): array
    {
        $currency = is_array($user->progress_currency) ? $user->progress_currency : [];
        $buffs = [];

        if (!empty($currency['exp_multiplier'])) {
            $buffs[] = [
                'key' => 'exp_multiplier',
                'label' => '聚灵符',
                'detail' => '下次修炼修为 ×' . $currency['exp_multiplier'],
            ];
        }
        if (!empty($currency['herb_bonus']['remaining'])) {
            $buffs[] = [
                'key' => 'herb_bonus',
                'label' => '灵草药包',
                'detail' => '剩余 ' . (int) $currency['herb_bonus']['remaining'] . ' 次，每题 +' . (int) ($currency['herb_bonus']['value'] ?? 5) . ' 修为',
            ];
        }
        if (!empty($currency['streak_freeze'])) {
            $buffs[] = [
                'key' => 'streak_freeze',
                'label' => '时光沙漏',
                'detail' => '可抵消一次断签',
            ];
        }
        if (!empty($currency['equipped_title'])) {
            $buffs[] = [
                'key' => 'title',
                'label' => '称号',
                'detail' => (string) $currency['equipped_title'],
            ];
        }

        return $buffs;
    }

    /**
     * 在批量结算后应用增益，返回调整后的修为。
     *
     * @return array{exp_bonus: int, adjusted_exp: int, messages: string[]}
     */
    public function applySettlementBuffs(User $user, int $baseExp, int $correctCount): array
    {
        $currency = is_array($user->progress_currency) ? $user->progress_currency : [];
        $messages = [];
        $totalExp = $baseExp;

        if (!empty($currency['exp_multiplier']) && $totalExp > 0) {
            $multiplier = (float) $currency['exp_multiplier'];
            $totalExp = (int) round($totalExp * $multiplier);
            unset($currency['exp_multiplier']);
            $messages[] = '聚灵符生效，修为 ×' . $multiplier;
        }

        if (!empty($currency['herb_bonus']['remaining']) && $correctCount > 0) {
            $herbValue = (int) ($currency['herb_bonus']['value'] ?? 5);
            $remaining = (int) $currency['herb_bonus']['remaining'];
            $used = min($correctCount, $remaining);
            $herbBonus = $used * $herbValue;
            $totalExp += $herbBonus;
            $remaining -= $used;
            if ($remaining > 0) {
                $currency['herb_bonus']['remaining'] = $remaining;
            } else {
                unset($currency['herb_bonus']);
            }
            if ($herbBonus > 0) {
                $messages[] = "灵草药包 +{$herbBonus} 修为";
            }
        }

        $user->progress_currency = $currency;
        $user->save();

        return [
            'exp_bonus' => max(0, $totalExp - $baseExp),
            'adjusted_exp' => $totalExp,
            'messages' => $messages,
        ];
    }

    /** 种子数据：初始化商城物品 */
    public static function seedItems(): void
    {
        $items = [
            ['item_id' => 'spirit_potion', 'name' => '灵泉水', 'description' => '恢复30灵力', 'category' => 'consumable', 'price_stones' => 10, 'effect' => ['type' => 'spirit_restore', 'value' => 30]],
            ['item_id' => 'exp_pill', 'name' => '修为丹', 'description' => '立即获得100修为', 'category' => 'consumable', 'price_stones' => 20, 'effect' => ['type' => 'exp_boost', 'value' => 100]],
            ['item_id' => 'exp_boost_talisman', 'name' => '聚灵符', 'description' => '下次答题修为×1.5', 'category' => 'boost', 'price_stones' => 50, 'effect' => ['type' => 'exp_multiplier', 'value' => 1.5, 'duration' => 'next_batch']],
            ['item_id' => 'streak_freeze', 'name' => '时光沙漏', 'description' => '保存一天连续修炼纪录', 'category' => 'consumable', 'price_stones' => 30, 'effect' => ['type' => 'streak_freeze']],
            ['item_id' => 'herb_bundle', 'name' => '灵草药包', 'description' => '答题额外+5修为，共10次', 'category' => 'consumable', 'price_stones' => 15, 'effect' => ['type' => 'exp_bonus', 'value' => 5, 'count' => 10]],
            ['item_id' => 'title_scroll', 'name' => '道号卷轴', 'description' => '解锁特殊称号「灵草居士」', 'category' => 'title', 'price_stones' => 100, 'effect' => ['type' => 'title', 'value' => '灵草居士']],
        ];
        foreach ($items as $item) {
            ShopItem::firstOrCreate(['item_id' => $item['item_id']], $item);
        }
    }

    private function findInventoryRow(int $userId, string $itemId): ?UserItem
    {
        return UserItem::where('user_id', $userId)
            ->where('item_id', $itemId)
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->orderBy('purchased_at')
            ->first();
    }

    private function consumeInventoryRow(UserItem $row): void
    {
        if ((int) $row->quantity > 1) {
            $row->decrement('quantity');
            return;
        }
        $row->delete();
    }

    private function applyInstantEffect(User $user, string $type, array $effect): ?string
    {
        if ($type === 'exp_boost') {
            $boostExp = (int) ($effect['value'] ?? 0);
            $user->increment('exp', $boostExp);
            $user->save();

            return "修为 +{$boostExp}";
        }
        if ($type === 'spirit_restore') {
            $restore = (int) ($effect['value'] ?? 0);
            $user->spirit_power = min((int) $user->spirit_power_max, (int) $user->spirit_power + $restore);
            $user->save();

            return "灵力 +{$restore}";
        }

        return null;
    }

    private function applyUsableEffect(User $user, string $type, array $effect): ?string
    {
        $currency = is_array($user->progress_currency) ? $user->progress_currency : [];

        return match ($type) {
            'spirit_restore' => $this->applyInstantEffect($user, $type, $effect),
            'exp_boost' => $this->applyInstantEffect($user, $type, $effect),
            'exp_multiplier' => $this->applyExpMultiplier($user, $currency, $effect),
            'streak_freeze' => $this->applyStreakFreeze($user, $currency),
            'exp_bonus' => $this->applyHerbBundle($user, $currency, $effect),
            'title' => $this->applyTitle($user, $currency, $effect),
            default => null,
        };
    }

    private function applyExpMultiplier(User $user, array $currency, array $effect): string
    {
        $currency['exp_multiplier'] = (float) ($effect['value'] ?? 1.5);
        $user->progress_currency = $currency;

        return '聚灵符已激活，下次修炼结算修为 ×' . $currency['exp_multiplier'];
    }

    private function applyStreakFreeze(User $user, array $currency): string
    {
        $currency['streak_freeze'] = true;
        $user->progress_currency = $currency;

        return '时光沙漏已启用，可抵消一次断签';
    }

    private function applyHerbBundle(User $user, array $currency, array $effect): string
    {
        $count = max(1, (int) ($effect['count'] ?? 10));
        $value = max(1, (int) ($effect['value'] ?? 5));
        $existing = (int) ($currency['herb_bonus']['remaining'] ?? 0);
        $currency['herb_bonus'] = [
            'value' => $value,
            'remaining' => $existing + $count,
        ];
        $user->progress_currency = $currency;

        return "灵草药包已启用，答题额外 +{$value} 修为（共 {$currency['herb_bonus']['remaining']} 次）";
    }

    private function applyTitle(User $user, array $currency, array $effect): string
    {
        $title = (string) ($effect['value'] ?? '灵草居士');
        $currency['equipped_title'] = $title;
        $user->progress_currency = $currency;

        return "称号已解锁：{$title}";
    }
}
