<?php

namespace App\Services;

use App\Models\User;

/**
 * 会员权益：偏游戏加速（灵力上限、恢复速度、修为加成）。
 */
class VipService
{
    public function isActive(User $user): bool
    {
        $type = (string) ($user->vip_type ?? 'free');
        if ($type === 'free') {
            return false;
        }

        $expires = $user->vip_expired_at;
        if (! $expires) {
            return false;
        }

        return $expires->isFuture();
    }

    public function effectiveSpiritMax(User $user): int
    {
        $base = max(0, (int) ($user->spirit_power_max ?? 0));

        return $this->isActive($user) ? (int) round($base * 1.2) : $base;
    }

    public function spiritRecoverIntervalSeconds(User $user): int
    {
        return $this->isActive($user) ? 240 : CurrencyService::SPIRIT_RECOVER_INTERVAL_SECONDS;
    }

    public function expMultiplier(User $user): float
    {
        return $this->isActive($user) ? 1.15 : 1.0;
    }

    public function stoneMultiplier(User $user): float
    {
        return $this->isActive($user) ? 1.1 : 1.0;
    }

    /** @return array<string, mixed> */
    public function snapshot(User $user): array
    {
        return [
            'is_vip' => $this->isActive($user),
            'vip_type' => (string) ($user->vip_type ?? 'free'),
            'vip_expired_at' => optional($user->vip_expired_at)?->toIso8601String(),
            'benefits' => $this->isActive($user) ? [
                'spirit_max_bonus' => '+20%',
                'spirit_recover' => '加速 20%',
                'exp_bonus' => '+15%',
                'stone_bonus' => '+10%',
            ] : [],
        ];
    }
}
