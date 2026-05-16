<?php

namespace App\Services;

use App\Models\User;

/**
 * 境界突破引擎
 */
class RealmService
{
    // 境界顺序映射（九大境界，每境九层）
    const REALM_ORDER = [
        'L1','L2','L3','L4','L5','L6','L7','L8','L9',
        'Z1','Z2','Z3',
        'J1','J2','J3',
        'Y1','Y2','Y3',
        'H1','H2','H3',
        'D1','D2','D3',
    ];

    /** 获取境界序号 */
    public function getRealmIndex(string $realm): int
    {
        $index = array_search($realm, self::REALM_ORDER);
        return $index !== false ? $index : -1;
    }

    /** 检查是否可突破到下一个境界/阶段 */
    public function canBreakthrough(User $user): array
    {
        $realm = $user->realm;
        $stage = $user->realm_stage;
        $index = $this->getRealmIndex($realm);

        if ($index < 0) {
            return ['can' => false, 'reason' => '已达最高境界'];
        }

        // 兼容旧逻辑：通过渡劫后可突破（当前实现默认允许）
        return ['can' => true, 'reason' => ''];
    }

    /** 执行突破 */
    public function breakthrough(User $user): array
    {
        $realm = $user->realm;
        $stage = $user->realm_stage;

        if ($stage < 9) {
            // 同境界内升小阶段
            $user->realm_stage = $stage + 1;
            // 每个小阶段突破奖励
            $bonusExp = 50;
            $user->increment('exp', $bonusExp);
            $user->save();

            return [
                'type' => 'stage_up',
                'old_realm' => $realm,
                'new_realm' => $realm,
                'old_stage' => $stage,
                'new_stage' => $stage + 1,
                'bonus_exp' => $bonusExp,
                'breakthrough' => false,
            ];
        }

        // 大境界突破
        $index = $this->getRealmIndex($realm);
        $nextRealm = self::REALM_ORDER[$index + 1] ?? null;

        if (!$nextRealm) {
            return ['type' => 'maxed', 'message' => '已达最高境界'];
        }

        $user->realm = $nextRealm;
        $user->realm_stage = 1;
        $bonusExp = 200;
        $user->increment('exp', $bonusExp);
        $user->spirit_power_max += 50; // 突破后灵力上限增加
        $user->save();

        return [
            'type' => 'realm_up',
            'old_realm' => $realm,
            'new_realm' => $nextRealm,
            'old_stage' => $stage,
            'new_stage' => 1,
            'bonus_exp' => $bonusExp,
            'spirit_power_max_increased' => 50,
            'breakthrough' => true,
        ];
    }
}
