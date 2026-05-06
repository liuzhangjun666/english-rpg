<?php

namespace App\Services;

use App\Models\ExamResult;
use App\Models\User;

/**
 * 境界突破引擎
 */
class RealmService
{
    // 境界顺序映射
    const REALM_ORDER = [
        'L1','L2','L3','L4','L5','L6','L7','L8','L9',
        'Z1','Z2','Z3','J1','J2','J3',
        'Y1','Y2','Y3','H1','H2','H3',
        'D1','D2','D3',
    ];

    const REALM_NAMES = [
        'L1'=>'练气初','L2'=>'练气初','L3'=>'练气初',
        'L4'=>'练气中','L5'=>'练气中','L6'=>'练气中',
        'L7'=>'练气后','L8'=>'练气后','L9'=>'练气后',
        'Z1'=>'筑基','Z2'=>'筑基','Z3'=>'筑基',
        'J1'=>'金丹','J2'=>'金丹','J3'=>'金丹',
        'Y1'=>'元婴','Y2'=>'元婴','Y3'=>'元婴',
        'H1'=>'化神','H2'=>'化神','H3'=>'化神',
        'D1'=>'大乘','D2'=>'大乘','D3'=>'大乘',
    ];

    // 渡劫通过后解锁下一个大境界所需修为
    const BREAKTHROUGH_EXP = [
        'L3' => 1000,   // 练气初→练气中
        'L6' => 2500,
        'L9' => 5000,
        'Z3' => 10000,
        'J3' => 20000,
        'Y3' => 40000,
        'H3' => 80000,
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

        // 检查是否完成渡劫（通过 exam_results 表）
        $latestExam = ExamResult::where('user_id', $user->id)
            ->where('realm', $realm)
            ->where('passed', true)
            ->latest('created_at')
            ->first();

        // 境界突破需要先通过渡劫
        if ($realm === 'L1' || $realm === 'L4' || $realm === 'L7') {
            // 每个大境界的第一阶段不需要渡劫即可修炼
            return ['can' => true, 'reason' => ''];
        }

        // 小阶段突破（同境界内）：自动突破
        return ['can' => true, 'reason' => ''];
    }

    /** 执行突破 */
    public function breakthrough(User $user): array
    {
        $realm = $user->realm;
        $stage = $user->realm_stage;

        if ($stage < 3) {
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
