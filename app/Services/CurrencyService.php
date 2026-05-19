<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * LevelUp 经济系统引擎
 * 管理：修为(exp)、灵力(spirit_power)、灵石(spirit_stone)
 */
class CurrencyService
{
    const SPIRIT_COST_PER_QUESTION = 1;
    const SPIRIT_RECOVER_INTERVAL_SECONDS = 300;
    const SPIRIT_RECOVER_PER_TICK = 1;
    const EXP_PER_CORRECT = 10;
    const EXP_BONUS_PERFECT = 5;
    const EXP_BONUS_STREAK = 2;
    const PASS_THRESHOLD = 60;
    const STONE_PER_CORRECT = 1;
    const STONE_PERFECT_BONUS = 3;

    // 连续签到倍率（PRD 7.1）
    const STREAK_MULTIPLIERS = [1, 1, 1.2, 1.2, 1.5, 1.5, 2.0, 2.0, 2.0, 2.5];

    /**
     * 每日灵力恢复 + 连续签到倍率
     */
    public function dailyCheck(User $user): array
    {
        $this->recoverSpiritPower($user);
        $today = now()->format('Y-m-d');
        $changed = false;
        $streakDays = 0;

        if ($user->spirit_power_date !== $today) {
            // 计算连续天数
            $dates = \App\Models\LearningRecord::where('user_id', $user->id)
                ->selectRaw('DATE(created_at) as d')
                ->groupBy('d')->orderByDesc('d')->pluck('d');

            $check = $today;
            $yesterday = date('Y-m-d', strtotime($today . ' -1 day'));
            // 判断昨天是否学习过
            $yesterdayLearned = $dates->contains($yesterday);
            $streakDays = 1;
            foreach ($dates as $d) {
                if ($d === $check) { $streakDays++; $check = date('Y-m-d', strtotime($check.' -1 day')); }
                else break;
            }

            // 倍率
            $index = min($streakDays - 1, count(self::STREAK_MULTIPLIERS) - 1);
            $multiplier = self::STREAK_MULTIPLIERS[$index] ?? 1.0;

            // 恢复灵力（×倍率额外恢复）
            $bonusRecovery = (int)(10 * ($multiplier - 1));  // 额外恢复
            $user->spirit_power = $user->spirit_power_max + max(0, $bonusRecovery);
            if ((bool) $user->is_minor) {
                $user->spirit_power = min($user->spirit_power, 50);
            }
            $user->spirit_power_date = $today;
            $user->spirit_power_last_recover_at = now();
            $user->daily_minutes = 0;
            $user->daily_minutes_date = $today;
            $changed = true;
        }

        if ($changed) $user->save();

        return [
            'recovered' => $changed,
            'streak_days' => $streakDays,
            'spirit_power' => $user->spirit_power,
            'spirit_power_max' => $user->spirit_power_max,
            'spirit_power_last_recover_at' => optional($user->spirit_power_last_recover_at)->toIso8601String(),
        ];
    }

    public function recoverSpiritPower(User $user): array
    {
        $maxSpirit = max(0, (int) ($user->spirit_power_max ?? 0));
        $currentSpirit = max(0, (int) ($user->spirit_power ?? 0));
        $now = now();
        $lastRecoverAt = $user->spirit_power_last_recover_at
            ? $user->spirit_power_last_recover_at->copy()
            : $now->copy();

        if ($currentSpirit >= $maxSpirit) {
            if (!$user->spirit_power_last_recover_at) {
                $user->spirit_power_last_recover_at = $now;
                $user->save();
            }
            return [
                'recovered' => 0,
                'spirit_power' => $currentSpirit,
                'spirit_power_max' => $maxSpirit,
            ];
        }

        $elapsedSeconds = max(0, (int) $lastRecoverAt->diffInSeconds($now));
        $ticks = (int) floor($elapsedSeconds / self::SPIRIT_RECOVER_INTERVAL_SECONDS);
        if ($ticks <= 0) {
            if (!$user->spirit_power_last_recover_at) {
                $user->spirit_power_last_recover_at = $now;
                $user->save();
            }
            return [
                'recovered' => 0,
                'spirit_power' => $currentSpirit,
                'spirit_power_max' => $maxSpirit,
            ];
        }

        $recoverAmount = min($ticks * self::SPIRIT_RECOVER_PER_TICK, max(0, $maxSpirit - $currentSpirit));
        if ($recoverAmount <= 0) {
            return [
                'recovered' => 0,
                'spirit_power' => $currentSpirit,
                'spirit_power_max' => $maxSpirit,
            ];
        }

        $secondsUsed = (int) floor($recoverAmount / self::SPIRIT_RECOVER_PER_TICK) * self::SPIRIT_RECOVER_INTERVAL_SECONDS;
        $user->spirit_power = min($maxSpirit, $currentSpirit + $recoverAmount);
        $user->spirit_power_last_recover_at = $lastRecoverAt->addSeconds($secondsUsed);
        $user->save();

        return [
            'recovered' => $recoverAmount,
            'spirit_power' => (int) $user->spirit_power,
            'spirit_power_max' => $maxSpirit,
        ];
    }

    public function hasEnoughSpirit(User $user, int $required): bool
    {
        $this->recoverSpiritPower($user);
        return $user->spirit_power >= $required;
    }

    public function consumeSpirit(User $user, int $amount): bool
    {
        $this->recoverSpiritPower($user);
        if ($user->spirit_power < $amount) return false;
        $user->spirit_power = max(0, (int) $user->spirit_power - $amount);
        $user->spirit_power_last_recover_at = now();
        $user->save();
        return true;
    }

    public function settleBatch(User $user, array $results, int $totalQuestions): array
    {
        $correctCount = count(array_filter($results, fn($r) => $r['correct']));
        $accuracy = $totalQuestions > 0 ? (int) round(($correctCount / $totalQuestions) * 100) : 0;

        $spiritCost = $totalQuestions * self::SPIRIT_COST_PER_QUESTION;
        if (!$this->consumeSpirit($user, $spiritCost)) {
            return ['exp_gained'=>0,'spirit_cost'=>0,'accuracy'=>$accuracy,'passed'=>false,'stones_gained'=>0,'error'=>'INSUFFICIENT_SPIRIT_POWER','message'=>"灵力不足（当前{$user->spirit_power}，需要{$spiritCost}）"];
        }

        $expGained = $correctCount * self::EXP_PER_CORRECT;
        if ($accuracy === 100) $expGained += self::EXP_BONUS_PERFECT;

        $stonesGained = $correctCount * self::STONE_PER_CORRECT;
        if ($accuracy === 100) $stonesGained += self::STONE_PERFECT_BONUS;

        $user->increment('exp', $expGained);
        $user->increment('spirit_stone', $stonesGained);
        $user->save();

        $passed = $accuracy >= self::PASS_THRESHOLD;

        return ['exp_gained'=>$expGained,'spirit_cost'=>$spiritCost,'accuracy'=>$accuracy,'correct_count'=>$correctCount,'passed'=>$passed,'stones_gained'=>$stonesGained];
    }

    public static function getStageExpThreshold(string $realm, int $stage): int
    {
        $prefix = strtoupper(substr(trim($realm), 0, 1));
        $stage = max(1, $stage);
        $prefixOrder = ['L' => 0, 'Z' => 1, 'J' => 2, 'Y' => 3, 'H' => 4, 'X' => 5, 'T' => 6, 'D' => 7, 'U' => 8];
        $group = $prefixOrder[$prefix] ?? 0;
        $globalTier = ($group * 9) + ($stage - 1);

        // 累进曲线：越高境界单层所需修为越高
        return (int) (($globalTier * 120) + (25 * $globalTier * max(0, $globalTier - 1) / 2));
    }
}
