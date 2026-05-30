<?php

namespace App\Services;

use App\Models\Question;
use App\Models\User;
use App\Models\UserLearningProfile;
use App\Models\VocabularyAssessment;
use App\Models\VocabularyAssessmentRecord;
use Illuminate\Support\Facades\DB;

class VocabAssessmentService
{
    public const TOTAL_QUESTIONS = 25;

    private const MIN_LEVEL = 1;
    private const MAX_LEVEL = 7;

    private const CORRECT_STREAK_TO_UP = 3;
    private const WRONG_STREAK_TO_DOWN = 3;

    private const MAJOR_REALM_BY_LEVEL = [
        1 => '练气',
        2 => '练气',
        3 => '筑基',
        4 => '金丹',
        5 => '元婴',
        6 => '元婴',
        7 => '化神',
    ];

    private const REALM_CODE_BY_LEVEL = [
        1 => 'L1',
        2 => 'L1',
        3 => 'Z1',
        4 => 'J1',
        5 => 'Y1',
        6 => 'Y1',
        7 => 'H1',
    ];

    public function getAssessmentStatusForUser(User $user): array
    {
        $profile = UserLearningProfile::query()->where('user_id', $user->id)->first();
        $done = (int) ($profile?->initial_assessment_done ?? 0) === 1;

        return [
            'done' => $done,
            'current_realm' => $done ? ($profile?->current_realm ?? $user->current_realm) : null,
            'current_level' => $done ? ($profile?->current_level ?? null) : null,
        ];
    }

    public function getOwnedAssessment(int $assessmentId, int $userId): ?VocabularyAssessment
    {
        return VocabularyAssessment::query()
            ->where('id', $assessmentId)
            ->where('user_id', $userId)
            ->first();
    }

    public function getStartLevelByStage(string $schoolStage, ?string $learningGoal = null): int
    {
        $stage = trim($schoolStage);
        $goal = trim((string) $learningGoal);

        if ($stage === '小学') {
            return 1;
        }
        if ($stage === '初中') {
            return 3;
        }
        if ($stage === '高中') {
            return 4;
        }
        if ($stage === '研究生') {
            return 7;
        }

        if ($stage === '大学') {
            if ($this->containsAny($goal, ['六级', 'cet6', 'c e t 6', '考研'])) {
                return 6;
            }

            return 5;
        }

        if ($this->containsAny($stage, ['学术']) || $this->containsAny($goal, ['学术'])) {
            return 7;
        }

        return 1;
    }

    public function startAssessment(User $user, string $schoolStage, ?string $learningGoal = null): VocabularyAssessment
    {
        $startLevel = $this->getStartLevelByStage($schoolStage, $learningGoal);

        return DB::transaction(function () use ($user, $schoolStage, $learningGoal, $startLevel) {
            VocabularyAssessment::query()
                ->where('user_id', $user->id)
                ->where('status', 'running')
                ->update(['status' => 'cancelled']);

            $assessment = VocabularyAssessment::query()->create([
                'user_id' => $user->id,
                'school_stage' => $schoolStage,
                'learning_goal' => $learningGoal,
                'start_level' => $startLevel,
                'current_level' => $startLevel,
                'total_questions' => self::TOTAL_QUESTIONS,
                'status' => 'running',
            ]);

            UserLearningProfile::query()->updateOrCreate(
                ['user_id' => $user->id],
                [
                    'school_stage' => $schoolStage,
                    'learning_goal' => $learningGoal,
                    'current_realm' => $user->current_realm ?? '练气一层',
                    'current_level' => 1,
                    'current_stage' => (string) max(1, (int) ($user->realm_stage ?? 1)),
                ]
            );

            return $assessment;
        });
    }

    public function pickNextVocabularyQuestion(int $assessmentId): array
    {
        $assessment = VocabularyAssessment::query()->find($assessmentId);
        if (!$assessment) {
            return ['question' => null, 'reason' => 'ASSESSMENT_NOT_FOUND'];
        }

        if ((int) $assessment->answered_count >= (int) $assessment->total_questions) {
            return ['question' => null, 'finished' => true, 'reason' => 'ASSESSMENT_ANSWERED_COMPLETED'];
        }

        $usedQuestionIds = VocabularyAssessmentRecord::query()
            ->where('assessment_id', $assessmentId)
            ->pluck('question_id')
            ->all();

        $currentLevel = max(self::MIN_LEVEL, min(self::MAX_LEVEL, (int) $assessment->current_level));

        $question = $this->pickQuestionByLevels([$currentLevel], $usedQuestionIds, $currentLevel);

        if (!$question) {
            $neighbors = array_values(array_unique(array_filter([
                $currentLevel - 1,
                $currentLevel + 1,
            ], fn (int $value) => $value >= self::MIN_LEVEL && $value <= self::MAX_LEVEL)));

            $question = $this->pickQuestionByLevels($neighbors, $usedQuestionIds, $currentLevel);
        }

        if (!$question) {
            $allLevels = range(self::MIN_LEVEL, self::MAX_LEVEL);
            $question = $this->pickQuestionByLevels($allLevels, $usedQuestionIds, $currentLevel);
        }

        if (!$question) {
            return ['question' => null, 'reason' => 'NO_QUESTIONS_FOR_ASSESSMENT'];
        }

        return [
            'question' => $this->serializeQuestionForClient($question),
            'reason' => null,
        ];
    }

    public function checkVocabularyAnswer(Question $question, string $userAnswer): array
    {
        $normalized = strtoupper(trim($userAnswer));
        $correctAnswer = strtoupper(trim((string) $question->correct_answer));

        return [
            'is_correct' => $normalized !== '' && $normalized === $correctAnswer,
            'normalized_answer' => $normalized,
            'correct_answer' => $correctAnswer,
            'explanation' => (string) ($question->explanation ?? ''),
        ];
    }

    public function adjustAssessmentLevel(VocabularyAssessment $assessment, bool $isCorrect, int $timeSpent, int $expectedTime): array
    {
        $levelBefore = max(self::MIN_LEVEL, min(self::MAX_LEVEL, (int) $assessment->current_level));
        $levelAfter = $levelBefore;

        $recentCorrectStreak = $this->countRecentConsecutive($assessment->id, true);
        $recentWrongStreak = $this->countRecentConsecutive($assessment->id, false);

        $currentCorrectStreak = $isCorrect ? ($recentCorrectStreak + 1) : 0;
        $currentWrongStreak = $isCorrect ? 0 : ($recentWrongStreak + 1);

        if ($currentWrongStreak >= self::WRONG_STREAK_TO_DOWN) {
            $levelAfter = max(self::MIN_LEVEL, $levelBefore - 1);
        } elseif ($isCorrect && $timeSpent <= max(1, $expectedTime) * 2 && $currentCorrectStreak >= self::CORRECT_STREAK_TO_UP) {
            $levelAfter = min(self::MAX_LEVEL, $levelBefore + 1);
        }

        return [
            'level_before' => $levelBefore,
            'level_after' => $levelAfter,
            'correct_streak' => $currentCorrectStreak,
            'wrong_streak' => $currentWrongStreak,
        ];
    }

    public function calculateVocabularyAssessmentResult(int $assessmentId): array
    {
        $assessment = VocabularyAssessment::query()->findOrFail($assessmentId);

        $records = VocabularyAssessmentRecord::query()
            ->where('assessment_id', $assessmentId)
            ->orderBy('id')
            ->get();

        $levelResults = [];
        for ($level = self::MIN_LEVEL; $level <= self::MAX_LEVEL; $level++) {
            $levelResults[$level] = [
                'total' => 0,
                'correct' => 0,
                'accuracy' => 0,
            ];
        }

        foreach ($records as $record) {
            $level = max(self::MIN_LEVEL, min(self::MAX_LEVEL, (int) $record->assessment_level));
            $levelResults[$level]['total']++;
            if ((int) $record->is_correct === 1) {
                $levelResults[$level]['correct']++;
            }
        }

        foreach ($levelResults as $level => $result) {
            $accuracy = $result['total'] > 0
                ? round(($result['correct'] / $result['total']) * 100, 2)
                : 0;

            $levelResults[$level]['accuracy'] = $accuracy;
        }

        $attemptedLevels = array_values(array_filter(
            array_keys($levelResults),
            fn (int $level) => $levelResults[$level]['total'] > 0
        ));

        $stableLevels = array_values(array_filter(
            $attemptedLevels,
            fn (int $level) => $levelResults[$level]['accuracy'] >= 70
        ));

        if (!empty($stableLevels)) {
            $finalLevel = max($stableLevels);
        } elseif (!empty($attemptedLevels)) {
            usort($attemptedLevels, function (int $a, int $b) use ($levelResults) {
                $aScore = ($levelResults[$a]['total'] * 1000) + ($levelResults[$a]['accuracy'] * 10);
                $bScore = ($levelResults[$b]['total'] * 1000) + ($levelResults[$b]['accuracy'] * 10);

                if ($aScore === $bScore) {
                    return $a <=> $b;
                }

                return $bScore <=> $aScore;
            });

            $candidate = $attemptedLevels[0];
            $candidateAccuracy = (float) $levelResults[$candidate]['accuracy'];
            $finalLevel = $candidateAccuracy < 60 && $candidate > self::MIN_LEVEL
                ? ($candidate - 1)
                : $candidate;
        } else {
            $finalLevel = (int) $assessment->start_level;
        }

        $finalLevel = max(self::MIN_LEVEL, min(self::MAX_LEVEL, $finalLevel));
        $finalLevelAccuracy = (float) ($levelResults[$finalLevel]['accuracy'] ?? 0);

        $mappedRealm = $this->mapLevelToRealm($finalLevel, $finalLevelAccuracy);

        $nextLevel = min(self::MAX_LEVEL, $finalLevel + 1);
        $nearBreakthrough = $nextLevel > $finalLevel
            && ($levelResults[$nextLevel]['total'] ?? 0) > 0
            && ($levelResults[$nextLevel]['accuracy'] ?? 0) >= 50;

        $suggestions = [
            sprintf('你的稳定词汇水平在 L%d。', $finalLevel),
            sprintf('建议从%s词库开始修炼。', $mappedRealm['major_realm']),
        ];

        if ($nearBreakthrough) {
            $suggestions[] = sprintf('你在 L%d 已接近突破，可少量挑战更高等级词汇。', $nextLevel);
        }

        $suggestions[] = '本次测试主要基于词汇能力，后续会通过语法、阅读、听力等继续校准。';

        return [
            'assessment_id' => $assessmentId,
            'final_level' => $finalLevel,
            'final_realm' => $mappedRealm['realm_label'],
            'final_stage' => $mappedRealm['stage'],
            'realm_code' => $mappedRealm['realm_code'],
            'realm_stage' => $mappedRealm['realm_stage'],
            'major_realm' => $mappedRealm['major_realm'],
            'level_results' => $levelResults,
            'near_breakthrough' => $nearBreakthrough,
            'suggestions' => $suggestions,
        ];
    }

    public function mapLevelToRealm(int $level, float $accuracy): array
    {
        $normalizedLevel = max(self::MIN_LEVEL, min(self::MAX_LEVEL, $level));
        $majorRealm = self::MAJOR_REALM_BY_LEVEL[$normalizedLevel] ?? '练气';

        $stage = $this->mapAccuracyToStage($accuracy);

        return [
            'major_realm' => $majorRealm,
            'stage' => (string) $stage,
            'realm_label' => $majorRealm . $this->chineseLayer($stage),
            'realm_code' => self::REALM_CODE_BY_LEVEL[$normalizedLevel] ?? 'L1',
            'realm_stage' => $stage,
        ];
    }

    public function updateUserLearningProfile(int $userId, array $result, ?string $schoolStage = null, ?string $learningGoal = null): UserLearningProfile
    {
        $profile = UserLearningProfile::query()->updateOrCreate(
            ['user_id' => $userId],
            [
                'school_stage' => $schoolStage,
                'learning_goal' => $learningGoal,
                'initial_assessment_done' => 1,
                'initial_level' => (int) $result['final_level'],
                'current_level' => (int) $result['final_level'],
                'initial_realm' => (string) $result['final_realm'],
                'current_realm' => (string) $result['final_realm'],
                'current_stage' => (string) $result['final_stage'],
                'vocabulary_realm' => (string) $result['final_realm'],
                'vocabulary_level' => (int) $result['final_level'],
            ]
        );

        User::query()->where('id', $userId)->update([
            'realm' => (string) $result['realm_code'],
            'realm_stage' => (int) $result['realm_stage'],
            'current_realm' => (string) $result['final_realm'],
        ]);

        return $profile;
    }

    private function pickQuestionByLevels(array $levels, array $usedQuestionIds, int $currentLevel): ?Question
    {
        if (empty($levels)) {
            return null;
        }

        $query = Question::query()
            ->where('type', 'vocab')
            ->where('is_assessment', 1)
            ->whereIn('assessment_level', $levels);

        if (!empty($usedQuestionIds)) {
            $query->whereNotIn('question_id', $usedQuestionIds);
        }

        if (count($levels) === 1) {
            return $query->inRandomOrder()->first();
        }

        return $query
            ->orderByRaw('ABS(assessment_level - ?)', [$currentLevel])
            ->inRandomOrder()
            ->first();
    }

    private function serializeQuestionForClient(Question $question): array
    {
        return [
            'id' => $question->id,
            'question_id' => $question->question_id,
            'type' => $question->type,
            'play_mode' => $question->play_mode,
            'assessment_level' => (int) ($question->assessment_level ?? 1),
            'question' => $question->question,
            'options' => is_array($question->options) ? $question->options : [],
            'word' => $question->word,
            'expected_time' => (int) ($question->expected_time ?? 5),
        ];
    }

    private function countRecentConsecutive(int $assessmentId, bool $isCorrect): int
    {
        $records = VocabularyAssessmentRecord::query()
            ->where('assessment_id', $assessmentId)
            ->orderByDesc('id')
            ->limit(15)
            ->get(['is_correct']);

        $count = 0;
        foreach ($records as $record) {
            if ((int) $record->is_correct === ($isCorrect ? 1 : 0)) {
                $count++;
                continue;
            }
            break;
        }

        return $count;
    }

    private function containsAny(string $value, array $needles): bool
    {
        $target = mb_strtolower(trim($value));
        foreach ($needles as $needle) {
            if ($needle !== '' && str_contains($target, mb_strtolower($needle))) {
                return true;
            }
        }

        return false;
    }

    private function mapAccuracyToStage(float $accuracy): int
    {
        $value = max(0, min(100, $accuracy));

        if ($value <= 20) {
            return 1;
        }
        if ($value <= 35) {
            return 2;
        }
        if ($value <= 50) {
            return 3;
        }
        if ($value <= 60) {
            return 4;
        }
        if ($value <= 70) {
            return 5;
        }
        if ($value <= 80) {
            return 6;
        }
        if ($value <= 88) {
            return 7;
        }
        if ($value <= 95) {
            return 8;
        }

        return 9;
    }

    private function chineseLayer(int $stage): string
    {
        $map = [
            1 => '一层',
            2 => '二层',
            3 => '三层',
            4 => '四层',
            5 => '五层',
            6 => '六层',
            7 => '七层',
            8 => '八层',
            9 => '九层',
        ];

        return $map[$stage] ?? ($stage . '层');
    }
}
