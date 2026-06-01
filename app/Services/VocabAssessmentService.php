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
    public const VOCAB_QUESTIONS = 15;
    public const GRAMMAR_QUESTIONS = 10;

    public const DIMENSION_VOCAB = 'vocabulary';
    public const DIMENSION_GRAMMAR = 'grammar';

    private const MIN_LEVEL = 1;
    private const MAX_LEVEL = 7;

    private const CORRECT_STREAK_TO_UP = 2;

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

    private const QUESTION_TYPES_BY_DIMENSION = [
        self::DIMENSION_VOCAB => ['vocabulary', 'vocab'],
        self::DIMENSION_GRAMMAR => ['grammar'],
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

    public function normalizeQuestionType(?string $type): string
    {
        $value = strtolower(trim((string) $type));
        if ($value === 'grammar') {
            return self::DIMENSION_GRAMMAR;
        }
        return self::DIMENSION_VOCAB;
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
                'vocab_current_level' => $startLevel,
                'grammar_current_level' => $startLevel,
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

        $dimensionProgress = $this->getDimensionProgress($assessmentId);
        $nextDimension = $this->decideNextDimension($dimensionProgress);
        if ($nextDimension === null) {
            return ['question' => null, 'finished' => true, 'reason' => 'ASSESSMENT_DIMENSION_COMPLETED'];
        }

        $dimensionCandidates = [$nextDimension];
        $other = $nextDimension === self::DIMENSION_VOCAB ? self::DIMENSION_GRAMMAR : self::DIMENSION_VOCAB;
        if ($this->remainingForDimension($other, $dimensionProgress) > 0) {
            $dimensionCandidates[] = $other;
        }

        foreach ($dimensionCandidates as $dimension) {
            $currentLevel = $this->getDimensionCurrentLevel($assessment, $dimension);
            $question = $this->pickQuestionForDimension($dimension, $currentLevel, $usedQuestionIds);
            if (!$question) {
                continue;
            }

            return [
                'question' => $this->serializeQuestionForClient($question, $dimension),
                'dimension' => $dimension,
                'current_level' => $currentLevel,
                'reason' => null,
            ];
        }

        return ['question' => null, 'reason' => 'NO_QUESTIONS_FOR_ASSESSMENT'];
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

    public function adjustAssessmentLevel(
        VocabularyAssessment $assessment,
        string $dimension,
        bool $isCorrect,
        int $timeSpent,
        int $expectedTime
    ): array {
        $levelBefore = $this->getDimensionCurrentLevel($assessment, $dimension);
        $levelAfter = $levelBefore;

        if (!$isCorrect) {
            $levelAfter = max(self::MIN_LEVEL, $levelBefore - 1);
            return [
                'level_before' => $levelBefore,
                'level_after' => $levelAfter,
                'correct_streak' => 0,
                'dimension' => $dimension,
            ];
        }

        $recentCorrectStreak = $this->countRecentConsecutive($assessment->id, $dimension, true);
        $currentCorrectStreak = $recentCorrectStreak + 1;
        $canPromote = $timeSpent <= max(1, $expectedTime) * 2
            && $currentCorrectStreak >= self::CORRECT_STREAK_TO_UP;

        if ($canPromote) {
            $levelAfter = min(self::MAX_LEVEL, $levelBefore + 1);
        }

        return [
            'level_before' => $levelBefore,
            'level_after' => $levelAfter,
            'correct_streak' => $currentCorrectStreak,
            'dimension' => $dimension,
        ];
    }

    public function calculateVocabularyAssessmentResult(int $assessmentId): array
    {
        $assessment = VocabularyAssessment::query()->findOrFail($assessmentId);

        $records = VocabularyAssessmentRecord::query()
            ->where('assessment_id', $assessmentId)
            ->orderBy('id')
            ->get();

        $dimensionResults = $this->buildDimensionLevelResults($records);
        $overallLevelResults = $this->buildOverallLevelResults($records);

        $vocabFinalLevel = $this->resolveFinalLevelByDimension(
            $records->all(),
            self::DIMENSION_VOCAB,
            $assessment->vocab_current_level ?? $assessment->start_level ?? 1
        );
        $grammarFinalLevel = $this->resolveFinalLevelByDimension(
            $records->all(),
            self::DIMENSION_GRAMMAR,
            $assessment->grammar_current_level ?? $assessment->start_level ?? 1
        );

        $rawLevel = (int) round(($vocabFinalLevel * 0.55) + ($grammarFinalLevel * 0.45));
        $rawLevel = max(self::MIN_LEVEL, min(self::MAX_LEVEL, $rawLevel));
        $finalLevel = min($rawLevel, $grammarFinalLevel + 1);
        $finalLevel = max(self::MIN_LEVEL, min(self::MAX_LEVEL, $finalLevel));

        $mappedRealm = $this->mapLevelToRealm($finalLevel, (float) ($assessment->accuracy ?? 0));

        $suggestions = [
            sprintf('词汇维度：L%d；语法维度：L%d。', $vocabFinalLevel, $grammarFinalLevel),
            sprintf('综合判定等级：L%d（语法上限约束已生效）。', $finalLevel),
            sprintf('建议从%s词库与语法关卡同步修炼。', $mappedRealm['major_realm']),
        ];

        return [
            'assessment_id' => $assessmentId,
            'vocab_final_level' => $vocabFinalLevel,
            'grammar_final_level' => $grammarFinalLevel,
            'raw_level' => $rawLevel,
            'final_level' => $finalLevel,
            'final_realm' => $mappedRealm['realm_label'],
            'final_stage' => $mappedRealm['stage'],
            'realm_code' => $mappedRealm['realm_code'],
            'realm_stage' => $mappedRealm['realm_stage'],
            'major_realm' => $mappedRealm['major_realm'],
            'level_results' => $overallLevelResults,
            'dimension_results' => $dimensionResults,
            'near_breakthrough' => false,
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
                'vocabulary_level' => (int) $result['vocab_final_level'],
                'grammar_level' => (int) $result['grammar_final_level'],
            ]
        );

        User::query()->where('id', $userId)->update([
            'realm' => (string) $result['realm_code'],
            'realm_stage' => (int) $result['realm_stage'],
            'current_realm' => (string) $result['final_realm'],
        ]);

        return $profile;
    }

    private function pickQuestionForDimension(string $dimension, int $currentLevel, array $usedQuestionIds): ?Question
    {
        $types = self::QUESTION_TYPES_BY_DIMENSION[$dimension] ?? [];
        if (empty($types)) {
            return null;
        }

        $levels = [$currentLevel];
        $question = $this->pickQuestionByTypesAndLevels($types, $levels, $usedQuestionIds, $currentLevel);
        if ($question) {
            return $question;
        }

        $neighbors = array_values(array_unique(array_filter([
            $currentLevel - 1,
            $currentLevel + 1,
        ], fn (int $value) => $value >= self::MIN_LEVEL && $value <= self::MAX_LEVEL)));
        if (!empty($neighbors)) {
            $question = $this->pickQuestionByTypesAndLevels($types, $neighbors, $usedQuestionIds, $currentLevel);
            if ($question) {
                return $question;
            }
        }

        return $this->pickQuestionByTypesAndLevels($types, range(self::MIN_LEVEL, self::MAX_LEVEL), $usedQuestionIds, $currentLevel);
    }

    private function pickQuestionByTypesAndLevels(array $types, array $levels, array $usedQuestionIds, int $currentLevel): ?Question
    {
        if (empty($types) || empty($levels)) {
            return null;
        }

        $query = Question::query()
            ->whereIn('type', $types)
            ->where('is_assessment', 1)
            ->whereIn('assessment_level', $levels);

        if (!empty($usedQuestionIds)) {
            $query->whereNotIn('question_id', $usedQuestionIds);
        }

        if (count($levels) === 1) {
            return $query->inRandomOrder()->first();
        }

        return $query
            ->orderByRaw('ABS(CAST(assessment_level AS SIGNED) - ?)', [$currentLevel])
            ->inRandomOrder()
            ->first();
    }

    private function serializeQuestionForClient(Question $question, string $dimension): array
    {
        return [
            'id' => $question->id,
            'question_id' => $question->question_id,
            'type' => $dimension,
            'raw_type' => (string) $question->type,
            'play_mode' => $question->play_mode,
            'assessment_level' => (int) ($question->assessment_level ?? 1),
            'question' => $question->question,
            'options' => is_array($question->options) ? $question->options : [],
            'word' => $question->word,
            'expected_time' => (int) ($question->expected_time ?? 5),
        ];
    }

    private function getDimensionCurrentLevel(VocabularyAssessment $assessment, string $dimension): int
    {
        $value = $dimension === self::DIMENSION_GRAMMAR
            ? (int) ($assessment->grammar_current_level ?? $assessment->current_level ?? $assessment->start_level ?? 1)
            : (int) ($assessment->vocab_current_level ?? $assessment->current_level ?? $assessment->start_level ?? 1);

        return max(self::MIN_LEVEL, min(self::MAX_LEVEL, $value));
    }

    private function getDimensionProgress(int $assessmentId): array
    {
        $result = [
            self::DIMENSION_VOCAB => 0,
            self::DIMENSION_GRAMMAR => 0,
        ];

        $rows = VocabularyAssessmentRecord::query()
            ->selectRaw('question_type, COUNT(*) as total_count')
            ->where('assessment_id', $assessmentId)
            ->groupBy('question_type')
            ->get();

        foreach ($rows as $row) {
            $dimension = $this->normalizeQuestionType((string) ($row->question_type ?? ''));
            $result[$dimension] += (int) ($row->total_count ?? 0);
        }

        return $result;
    }

    private function decideNextDimension(array $dimensionProgress): ?string
    {
        $vocabRemaining = $this->remainingForDimension(self::DIMENSION_VOCAB, $dimensionProgress);
        $grammarRemaining = $this->remainingForDimension(self::DIMENSION_GRAMMAR, $dimensionProgress);

        if ($vocabRemaining <= 0 && $grammarRemaining <= 0) {
            return null;
        }
        if ($vocabRemaining <= 0) {
            return self::DIMENSION_GRAMMAR;
        }
        if ($grammarRemaining <= 0) {
            return self::DIMENSION_VOCAB;
        }

        $vocabDone = (int) ($dimensionProgress[self::DIMENSION_VOCAB] ?? 0);
        $grammarDone = (int) ($dimensionProgress[self::DIMENSION_GRAMMAR] ?? 0);
        $vocabRatio = $vocabDone / max(1, self::VOCAB_QUESTIONS);
        $grammarRatio = $grammarDone / max(1, self::GRAMMAR_QUESTIONS);

        if (abs($vocabRatio - $grammarRatio) < 0.0001) {
            return $vocabRemaining >= $grammarRemaining ? self::DIMENSION_VOCAB : self::DIMENSION_GRAMMAR;
        }

        return $vocabRatio < $grammarRatio ? self::DIMENSION_VOCAB : self::DIMENSION_GRAMMAR;
    }

    private function remainingForDimension(string $dimension, array $progress): int
    {
        $target = $dimension === self::DIMENSION_GRAMMAR ? self::GRAMMAR_QUESTIONS : self::VOCAB_QUESTIONS;
        $done = (int) ($progress[$dimension] ?? 0);
        return max(0, $target - $done);
    }

    private function countRecentConsecutive(int $assessmentId, string $dimension, bool $isCorrect): int
    {
        $records = VocabularyAssessmentRecord::query()
            ->where('assessment_id', $assessmentId)
            ->where('question_type', $dimension)
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

    /**
     * @param array<int, VocabularyAssessmentRecord> $records
     */
    private function resolveFinalLevelByDimension(array $records, string $dimension, int $fallbackLevel): int
    {
        $target = max(self::MIN_LEVEL, min(self::MAX_LEVEL, $fallbackLevel));
        for ($i = count($records) - 1; $i >= 0; $i--) {
            $record = $records[$i];
            if ($this->normalizeQuestionType((string) $record->question_type) !== $dimension) {
                continue;
            }

            $target = max(self::MIN_LEVEL, min(self::MAX_LEVEL, (int) ($record->level_after ?? $fallbackLevel)));
            break;
        }

        return $target;
    }

    private function buildDimensionLevelResults($records): array
    {
        $build = function () {
            $rows = [];
            for ($level = self::MIN_LEVEL; $level <= self::MAX_LEVEL; $level++) {
                $rows[$level] = ['total' => 0, 'correct' => 0, 'accuracy' => 0];
            }
            return $rows;
        };

        $result = [
            self::DIMENSION_VOCAB => $build(),
            self::DIMENSION_GRAMMAR => $build(),
        ];

        foreach ($records as $record) {
            $dimension = $this->normalizeQuestionType((string) ($record->question_type ?? ''));
            $level = max(self::MIN_LEVEL, min(self::MAX_LEVEL, (int) $record->assessment_level));
            $result[$dimension][$level]['total']++;
            if ((int) $record->is_correct === 1) {
                $result[$dimension][$level]['correct']++;
            }
        }

        foreach ($result as $dimension => $levels) {
            foreach ($levels as $level => $row) {
                $result[$dimension][$level]['accuracy'] = $row['total'] > 0
                    ? round(($row['correct'] / $row['total']) * 100, 2)
                    : 0;
            }
        }

        return $result;
    }

    private function buildOverallLevelResults($records): array
    {
        $rows = [];
        for ($level = self::MIN_LEVEL; $level <= self::MAX_LEVEL; $level++) {
            $rows[$level] = ['total' => 0, 'correct' => 0, 'accuracy' => 0];
        }

        foreach ($records as $record) {
            $level = max(self::MIN_LEVEL, min(self::MAX_LEVEL, (int) $record->assessment_level));
            $rows[$level]['total']++;
            if ((int) $record->is_correct === 1) {
                $rows[$level]['correct']++;
            }
        }

        foreach ($rows as $level => $row) {
            $rows[$level]['accuracy'] = $row['total'] > 0
                ? round(($row['correct'] / $row['total']) * 100, 2)
                : 0;
        }

        return $rows;
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
