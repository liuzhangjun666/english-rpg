<?php

namespace App\Services;

use App\Models\RechargeOrder;
use App\Models\User;
use Illuminate\Http\Request;

class RechargeGuardService
{
    public function assertCanRecharge(User $user, int $amountCents): void
    {
        if (! config('recharge.enabled', true)) {
            throw new \RuntimeException('充值功能暂未开放');
        }

        if ($user->is_guest) {
            throw new \InvalidArgumentException('游客无法充值，请先注册正式道号');
        }

        if ((bool) $user->is_minor && ! (bool) $user->parent_verified) {
            throw new \InvalidArgumentException('未成年修士需护道人验证后方可充值');
        }

        if ((bool) $user->is_minor) {
            $singleLimit = (int) config('recharge.minor_single_limit_cents', 5000);
            if ($amountCents > $singleLimit) {
                throw new \InvalidArgumentException('单笔充值超过未成年限额');
            }

            $monthlyLimit = (int) config('recharge.minor_monthly_limit_cents', 20000);
            $monthSpent = (int) RechargeOrder::query()
                ->where('user_id', $user->id)
                ->where('status', 'paid')
                ->where('created_at', '>=', now()->startOfMonth())
                ->sum('amount_cents');

            if ($monthSpent + $amountCents > $monthlyLimit) {
                throw new \InvalidArgumentException('本月充值已达未成年上限');
            }
        }
    }

    /** @return array<string, mixed> */
    public function clientMeta(Request $request): array
    {
        return [
            'ip' => $request->ip(),
            'ua' => substr((string) $request->userAgent(), 0, 255),
            'platform' => (string) $request->input('platform', 'web'),
        ];
    }
}
