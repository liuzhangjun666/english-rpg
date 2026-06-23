<?php

namespace App\Services;

use App\Models\LearningRecord;
use App\Models\TimedChallengeSession;
use App\Models\User;

class DailyTaskService
{
    public function __construct(
        private readonly ReportService $reportService,
        private readonly CurrencyService $currencyService,
    ) {}

    public function getStatus(User $user): array
    {
        $today = now()->format('Y-m-d');
        $start = now()->startOfDay();

        $practiceCount = LearningRecord::where('user_id', $user->id)
            ->where('created_at', '>=', $start)
            ->whereIn('activity_type', ['vocab', 'grammar', 'listening', 'speaking', 'writing'])
            ->count();

        $mijingCount = TimedChallengeSession::where('user_id', $user->id)
            ->where('started_at', '>=', $start)
            ->whereIn('status', ['finished', 'completed', 'done'])
            ->count();

        if ($mijingCount === 0) {
            $mijingCount = TimedChallengeSession::where('user_id', $user->id)
                ->where('started_at', '>=', $start)
                ->whereNotNull('ended_at')
                ->count();
        }

        $readingCount = LearningRecord::where('user_id', $user->id)
            ->where('created_at', '>=', $start)
            ->where('activity_type', 'reading')
            ->count();

        $currency = is_array($user->progress_currency) ? $user->progress_currency : [];
        $claimed = ($currency['daily_quest_claimed_date'] ?? '') === $today;

        return [
            'streak_days' => $this->reportService->getStreakDays($user),
            'claimed' => $claimed,
            'signin_done' => ($currency['daily_signin_date'] ?? '') === $today,
            'tasks' => [
                [
                    'key' => 'practice',
                    'current' => $practiceCount,
                    'required' => 5,
                    'done' => $practiceCount >= 5,
                ],
                [
                    'key' => 'mijing',
                    'current' => min(1, $mijingCount),
                    'required' => 1,
                    'done' => $mijingCount >= 1,
                ],
                [
                    'key' => 'reading',
                    'current' => min(1, $readingCount),
                    'required' => 1,
                    'done' => $readingCount >= 1,
                ],
            ],
        ];
    }

    public function claim(User $user): array
    {
        $status = $this->getStatus($user);
        if ($status['claimed']) {
            return ['success' => false, 'message' => '今日奖励已领取'];
        }

        $allDone = collect($status['tasks'])->every(fn (array $task) => (bool) ($task['done'] ?? false));
        if (!$allDone) {
            return ['success' => false, 'message' => '尚有任务未完成'];
        }

        $user->increment('exp', 20);
        $user->increment('spirit_stone', 50);
        $user->spirit_power = min(
            (int) $user->spirit_power_max,
            (int) $user->spirit_power + 20
        );

        $currency = is_array($user->progress_currency) ? $user->progress_currency : [];
        $currency['daily_quest_claimed_date'] = now()->format('Y-m-d');
        $user->progress_currency = $currency;
        $user->save();

        return [
            'success' => true,
            'message' => '道心巩固！今日奖励已领取',
            'user' => $user->fresh(),
        ];
    }

    public function signIn(User $user): array
    {
        $user = $user->fresh();
        $currency = is_array($user->progress_currency) ? $user->progress_currency : [];
        $today = now()->format('Y-m-d');

        if (($currency['daily_signin_date'] ?? '') === $today) {
            return [
                'success' => true,
                'already_signed' => true,
                'message' => '今日已签到',
                'streak_days' => $this->reportService->getStreakDays($user),
                'user' => $user,
            ];
        }

        $check = $this->currencyService->dailyCheck($user->fresh());
        $user = $user->fresh();
        $currency = is_array($user->progress_currency) ? $user->progress_currency : [];
        $currency['daily_signin_date'] = $today;
        $user->progress_currency = $currency;
        $user->increment('spirit_stone', 10);
        $user->save();

        return [
            'success' => true,
            'already_signed' => false,
            'message' => '签到成功，灵石 +10',
            'streak_days' => $check['streak_days'] ?? $this->reportService->getStreakDays($user),
            'spirit_recovered' => (bool) ($check['recovered'] ?? false),
            'user' => $user->fresh(),
        ];
    }
}
