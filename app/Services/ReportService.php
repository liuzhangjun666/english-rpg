<?php

namespace App\Services;

use App\Models\ExamResult;
use App\Models\HeartDemon;
use App\Models\LearningRecord;
use App\Models\User;

class ReportService
{
    public function dailySummary(User $user): array
    {
        $today = now()->format('Y-m-d');
        $records = LearningRecord::where('user_id', $user->id)->whereDate('created_at', $today)->get();
        $total = $records->count();
        $correct = $records->where('is_correct', true)->count();
        $accuracy = $total > 0 ? round(($correct / $total) * 100) : 0;

        return [
            'daily_minutes' => $user->daily_minutes ?? 0,
            'questions_done' => $total,
            'correct_count' => $correct,
            'accuracy' => $accuracy,
            'date' => $today,
        ];
    }

    /** 获取更详细的日报数据 */
    public function dailyReport(User $user): array
    {
        $daily = $this->dailySummary($user);

        $records = LearningRecord::where('user_id', $user->id)
            ->whereDate('created_at', now()->format('Y-m-d'))
            ->get();

        $vocabCorrect = $records->where('activity_type', 'vocab')->where('is_correct', true)->count();
        $vocabTotal = $records->where('activity_type', 'vocab')->count();
        $grammarCorrect = $records->where('activity_type', 'grammar')->where('is_correct', true)->count();
        $grammarTotal = $records->where('activity_type', 'grammar')->count();

        $demonsToday = HeartDemon::where('user_id', $user->id)
            ->whereDate('last_wrong_at', now()->format('Y-m-d'))->count();

        return [
            'daily' => $daily,
            'vocab' => ['correct' => $vocabCorrect, 'total' => $vocabTotal],
            'grammar' => ['correct' => $grammarCorrect, 'total' => $grammarTotal],
            'new_demons_today' => $demonsToday,
        ];
    }

    /** 获取周报 */
    public function weeklyReport(User $user): array
    {
        $weekAgo = now()->subDays(7)->startOfDay();
        $records = LearningRecord::where('user_id', $user->id)
            ->where('created_at', '>=', $weekAgo)->get();

        $total = $records->count();
        $correct = $records->where('is_correct', true)->count();
        $accuracy = $total > 0 ? round(($correct / $total) * 100) : 0;

        // 每日统计
        $dailyStats = [];
        for ($i = 6; $i >= 0; $i--) {
            $d = now()->subDays($i)->format('Y-m-d');
            $dayRecords = $records->filter(fn($r) => $r->created_at->format('Y-m-d') === $d);
            $dailyStats[] = [
                'date' => $d,
                'count' => $dayRecords->count(),
                'correct' => $dayRecords->where('is_correct', true)->count(),
            ];
        }

        return [
            'weekly_total' => $total,
            'weekly_correct' => $correct,
            'weekly_accuracy' => $accuracy,
            'daily_breakdown' => $dailyStats,
            'streak' => $this->getStreakDays($user),
        ];
    }

    public function parentDashboard(User $user): array
    {
        $daily = $this->dailySummary($user);

        $weaknessTip = '';
        if ($daily['questions_done'] > 0 && $daily['accuracy'] < 60) {
            $weaknessTip = '今日正确率偏低，建议鼓励孩子复习错题。';
        } elseif ($daily['questions_done'] === 0) {
            $weaknessTip = '今日尚未修炼，提醒孩子该学习了。';
        }

        $lastExam = ExamResult::where('user_id', $user->id)->latest('created_at')->first();

        return [
            'card1_today' => $daily,
            'card2_progress' => [
                'realm' => $user->realm,
                'realm_name' => $this->getRealmName($user->realm),
                'stage' => $user->realm_stage,
                'exp' => $user->exp,
                'streak_days' => $this->getStreakDays($user),
            ],
            'card3_tip' => $weaknessTip ? ['message' => $weaknessTip, 'has_exam' => $lastExam ? ['grade'=>$lastExam->grade,'score'=>$lastExam->score,'date'=>$lastExam->created_at->format('Y-m-d')] : null] : null,
        ];
    }

    private function getRealmName(string $realm): string
    {
        $map = ['L1'=>'练气初','L2'=>'练气中','L3'=>'练气后','L4'=>'筑基','L5'=>'筑基中','L6'=>'筑基后','J1'=>'金丹','Y1'=>'元婴','H1'=>'化神','D1'=>'大乘'];
        return $map[$realm] ?? $realm;
    }

    private function getStreakDays(User $user): int
    {
        $dates = LearningRecord::where('user_id', $user->id)
            ->selectRaw('DATE(created_at) as d')->groupBy('d')->orderByDesc('d')->pluck('d');
        $streak = 0; $check = now()->format('Y-m-d');
        foreach ($dates as $d) {
            if ($d === $check) { $streak++; $check = date('Y-m-d', strtotime($check.' -1 day')); }
            else break;
        }
        return $streak;
    }
}
