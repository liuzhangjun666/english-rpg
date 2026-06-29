<?php

namespace App\Services;

use App\Models\RechargeProduct;
use App\Models\RechargeOrder;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class RechargeFulfillmentService
{
    public function __construct(
        private readonly JadeLedgerService $jadeLedger,
    ) {
    }

    public function deliver(RechargeOrder $order): void
    {
        if ($order->status === 'paid') {
            return;
        }

        DB::transaction(function () use ($order) {
            $lockedOrder = RechargeOrder::query()->whereKey($order->id)->lockForUpdate()->first();
            if (! $lockedOrder || $lockedOrder->status === 'paid') {
                return;
            }

            $user = User::query()->whereKey($lockedOrder->user_id)->lockForUpdate()->first();
            $product = RechargeProduct::query()->where('product_key', $lockedOrder->product_key)->first();
            if (! $user || ! $product) {
                throw new \RuntimeException('发货失败：用户或商品不存在');
            }

            $jadeTotal = $this->resolveJadeTotal($user, $product);
            if ($jadeTotal > 0) {
                $this->jadeLedger->credit(
                    $user,
                    $jadeTotal,
                    'recharge',
                    $lockedOrder->order_no,
                    "充值 {$product->name}"
                );
            }

            if ($product->vip_days > 0 && $product->vip_type) {
                $this->extendVip($user, (string) $product->vip_type, (int) $product->vip_days);
            }

            if (! $user->first_recharge_at) {
                $user->first_recharge_at = now();
            }
            $user->save();

            $lockedOrder->status = 'paid';
            $lockedOrder->paid_at = now();
            $lockedOrder->save();
        });
    }

    private function resolveJadeTotal(User $user, RechargeProduct $product): int
    {
        $base = (int) $product->jade_amount;
        if ($base <= 0) {
            return 0;
        }

        $limits = $product->limits ?? [];
        $bonus = 0;
        if ($product->category === 'jade_pack' && ! $user->first_recharge_at) {
            $bonus = (int) ($limits['first_bonus_jade'] ?? $product->bonus_jade);
        }

        return $base + max(0, $bonus);
    }

    private function extendVip(User $user, string $vipType, int $days): void
    {
        $base = $user->vip_expired_at && $user->vip_expired_at->isFuture()
            ? $user->vip_expired_at->copy()
            : now();

        $user->vip_type = $vipType;
        $user->vip_expired_at = $base->addDays($days);
    }
}
