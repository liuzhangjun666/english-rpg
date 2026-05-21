<?php

namespace App\Services;

use App\Models\ShopItem;
use App\Models\UserItem;
use App\Models\User;

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
        if (!$item) return ['success'=>false, 'message'=>'该商品不存在'];

        $totalCost = $item->price_stones * $quantity;
        if ($user->spirit_stone < $totalCost) {
            return ['success'=>false, 'message'=>"灵石不足（需要$totalCost，当前{$user->spirit_stone}）"];
        }

        $user->decrement('spirit_stone', $totalCost);

        UserItem::create([
            'user_id' => $user->id,
            'item_id' => $itemId,
            'quantity' => $quantity,
        ]);

        // 如果是修为加成类，立即生效
        $effect = $item->effect ?? [];
        if (($effect['type'] ?? '') === 'exp_boost') {
            $boostExp = (int)($effect['value'] ?? 0);
            $user->increment('exp', $boostExp);
        }
        if (($effect['type'] ?? '') === 'spirit_restore') {
            $restore = (int)($effect['value'] ?? 0);
            $user->spirit_power = min($user->spirit_power_max, $user->spirit_power + $restore);
            $user->save();
        }

        return ['success'=>true, 'message'=>"购买成功！消耗{$totalCost}灵石", 'item'=>$item->name];
    }

    /** 获取用户物品列表 */
    public function getUserItems(int $userId): array
    {
        return UserItem::where('user_id', $userId)
            ->where(function($q) { $q->whereNull('expires_at')->orWhere('expires_at', '>', now()); })
            ->get()->toArray();
    }

    /** 种子数据：初始化商城物品 */
    public static function seedItems(): void
    {
        $items = [
            ['item_id'=>'spirit_potion', 'name'=>'灵泉水', 'description'=>'恢复30灵力', 'category'=>'consumable', 'price_stones'=>10, 'effect'=>['type'=>'spirit_restore','value'=>30]],
            ['item_id'=>'exp_pill', 'name'=>'修为丹', 'description'=>'立即获得100修为', 'category'=>'consumable', 'price_stones'=>20, 'effect'=>['type'=>'exp_boost','value'=>100]],
            ['item_id'=>'exp_boost_talisman', 'name'=>'聚灵符', 'description'=>'下次答题修为×1.5', 'category'=>'boost', 'price_stones'=>50, 'effect'=>['type'=>'exp_multiplier','value'=>1.5,'duration'=>'next_batch']],
            ['item_id'=>'streak_freeze', 'name'=>'时光沙漏', 'description'=>'保存一天连续修炼纪录', 'category'=>'consumable', 'price_stones'=>30, 'effect'=>['type'=>'streak_freeze']],
            ['item_id'=>'herb_bundle', 'name'=>'灵草药包', 'description'=>'练功房随机掉落灵草，答题额外+5修为', 'category'=>'consumable', 'price_stones'=>15, 'effect'=>['type'=>'exp_bonus','value'=>5,'count'=>10]],
            ['item_id'=>'title_scroll', 'name'=>'道号卷轴', 'description'=>'解锁特殊称号「灵草居士」', 'category'=>'title', 'price_stones'=>100, 'effect'=>['type'=>'title','value'=>'灵草居士']],
        ];
        foreach ($items as $item) {
            ShopItem::firstOrCreate(['item_id'=>$item['item_id']], $item);
        }
    }
}
