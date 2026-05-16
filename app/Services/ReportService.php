<?php

namespace App\Services;

use App\Models\ExamResult;
use App\Models\HeartDemon;
use App\Models\LearningRecord;
use App\Models\User;
use App\Support\CultivationProfile;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

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

        $analytics = $this->learningAnalytics($user, 30);
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
            'analytics' => $analytics,
        ];
    }

    public function learningAnalytics(User $user, int $days = 30): array
    {
        $days = max(7, min(90, $days));
        $from = now()->subDays($days - 1)->startOfDay();

        $records = LearningRecord::where('user_id', $user->id)
            ->where('created_at', '>=', $from)
            ->get();

        $total = $records->count();
        $correct = $records->where('is_correct', true)->count();
        $accuracy = $total > 0 ? (int) round(($correct / $total) * 100) : 0;

        $typeCount = $records->groupBy('activity_type')->map(fn ($g) => $g->count())->toArray();
        $typeCorrect = $records->where('is_correct', true)->groupBy('activity_type')->map(fn ($g) => $g->count())->toArray();

        $dailyTrend = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $date = now()->subDays($i)->format('Y-m-d');
            $day = $records->filter(fn ($r) => $r->created_at && $r->created_at->format('Y-m-d') === $date);
            $dTotal = $day->count();
            $dCorrect = $day->where('is_correct', true)->count();
            $dailyTrend[] = [
                'date' => $date,
                'count' => $dTotal,
                'accuracy' => $dTotal > 0 ? (int) round(($dCorrect / $dTotal) * 100) : 0,
            ];
        }

        $weakTags = HeartDemon::where('user_id', $user->id)
            ->where('is_mastered', false)
            ->orderByDesc('wrong_count')
            ->limit(5)
            ->get(['question_id', 'word', 'type', 'wrong_count', 'mastery'])
            ->map(fn ($d) => [
                'tag' => $d->word ?: $d->question_id,
                'type' => $d->type,
                'wrong_count' => (int) $d->wrong_count,
                'mastery' => (int) $d->mastery,
            ])
            ->toArray();

        $newWords = LearningRecord::where('user_id', $user->id)
            ->where('activity_type', 'vocab')
            ->where('is_correct', true)
            ->where('created_at', '>=', $from)
            ->join('levelup_questions as q', 'q.question_id', '=', 'levelup_learning_records.question_id')
            ->whereNotNull('q.word')
            ->distinct()
            ->count('q.word');

        $typeAccuracy = [];
        foreach ($typeCount as $type => $totalCount) {
            $c = (int) ($typeCorrect[$type] ?? 0);
            $t = (int) $totalCount;
            $typeAccuracy[$type] = $t > 0 ? (int) round(($c / $t) * 100) : 0;
        }

        return [
            'period_days' => $days,
            'total_questions' => $total,
            'correct_questions' => $correct,
            'accuracy' => $accuracy,
            'type_count' => $typeCount,
            'type_accuracy' => $typeAccuracy,
            'daily_trend' => $dailyTrend,
            'weak_tags' => $weakTags,
            'new_words' => $newWords,
            'streak_days' => $this->getStreakDays($user),
            'best_study_hour' => $this->bestStudyHour($user, $from),
        ];
    }

    private function getRealmName(string $realm): string
    {
        return CultivationProfile::realmName($realm);
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

    private function bestStudyHour(User $user, Carbon $from): ?int
    {
        $row = LearningRecord::where('user_id', $user->id)
            ->where('created_at', '>=', $from)
            ->selectRaw('HOUR(created_at) as h, COUNT(*) as c')
            ->groupBy('h')
            ->orderByDesc('c')
            ->first();
        if (!$row) return null;
        return (int) $row->h;
    }
}
