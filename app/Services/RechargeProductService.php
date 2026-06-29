<?php

namespace App\Services;

use App\Models\RechargeOrder;
use App\Models\RechargeProduct;
use App\Models\User;
use Database\Seeders\RechargeProductSeeder;

class RechargeProductService
{
    public function ensureSeeded(): void
    {
        if (RechargeProduct::query()->exists()) {
            return;
        }

        RechargeProductSeeder::seed();
    }

    /** @return array<int, array<string, mixed>> */
    public function listForUser(User $user): array
    {
        $this->ensureSeeded();

        $hasFirstRecharge = $user->first_recharge_at !== null;

        return RechargeProduct::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('price_cents')
            ->get()
            ->map(function (RechargeProduct $product) use ($user, $hasFirstRecharge) {
                $limits = $product->limits ?? [];
                $firstBonus = (int) ($limits['first_bonus_jade'] ?? $product->bonus_jade);
                $eligibleFirstBonus = ! $hasFirstRecharge && $product->category === 'jade_pack';

                return [
                    'product_key' => $product->product_key,
                    'name' => $product->name,
                    'description' => $product->description,
                    'category' => $product->category,
                    'price_cents' => $product->price_cents,
                    'price_yuan' => round($product->price_cents / 100, 2),
                    'jade_amount' => $product->jade_amount,
                    'bonus_jade' => $eligibleFirstBonus ? $firstBonus : 0,
                    'total_jade' => $product->jade_amount + ($eligibleFirstBonus ? $firstBonus : 0),
                    'vip_days' => $product->vip_days,
                    'vip_type' => $product->vip_type,
                    'badge' => $eligibleFirstBonus && $firstBonus > 0 ? '首充双倍' : null,
                ];
            })
            ->values()
            ->all();
    }

    public function findPurchasable(string $productKey): ?RechargeProduct
    {
        $this->ensureSeeded();

        return RechargeProduct::query()
            ->where('product_key', $productKey)
            ->where('is_active', true)
            ->first();
    }

    public function assertLimits(User $user, RechargeProduct $product): void
    {
        $limits = $product->limits ?? [];
        if (! empty($limits['once_per_user'])) {
            $exists = RechargeOrder::query()
                ->where('user_id', $user->id)
                ->where('product_key', $product->product_key)
                ->where('status', 'paid')
                ->exists();
            if ($exists) {
                throw new \InvalidArgumentException('该礼包仅限购买一次');
            }
        }
    }
}
