<?php

namespace App\Services;

use App\Models\Question;
use App\Support\AssessmentLevelResolver;
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

    /** 定级时取各维度末尾若干题 level_after 的中位数，避免单题失手定终身 */
    private const STABLE_TAIL_RECORDS = 4;

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

    /** 学段对应的自适应等级上限（L1–L7） */
    private const MAX_LEVEL_BY_SCHOOL_STAGE = [
        '小学' => 2,
        '初中' => 3,
        '高中' => 4,
        '大学' => 6,
        '研究生' => 7,
    ];

    /** 学段对应的大境界（与注册学段一致，不随连对升阶越界） */
    private const REALM_CODE_BY_SCHOOL_STAGE = [
        '小学' => 'L1',
        '初中' => 'Z1',
        '高中' => 'J1',
        '大学' => 'Y1',
        '研究生' => 'H1',
    ];

    private const MAJOR_REALM_BY_CODE = [
        'L1' => '练气',
        'Z1' => '筑基',
        'J1' => '金丹',
        'Y1' => '元婴',
        'H1' => '化神',
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

    public function getMaxLevelBySchoolStage(?string $schoolStage): int
    {
        $stage = trim((string) $schoolStage);

        return self::MAX_LEVEL_BY_SCHOOL_STAGE[$stage] ?? self::MAX_LEVEL;
    }

    /**
     * 自适应降级的下限：最多比试炼起点低一级，避免高中学段连错后直接掉到小学题库。
     */
    public function getMinLevelByStartLevel(int $startLevel): int
    {
        $startLevel = max(self::MIN_LEVEL, min(self::MAX_LEVEL, $startLevel));

        return max(self::MIN_LEVEL, $startLevel - 1);
    }

    public function getMinLevelByAssessment(VocabularyAssessment $assessment): int
    {
        return $this->getMinLevelByStartLevel((int) ($assessment->start_level ?? self::MIN_LEVEL));
    }

    public function buildAssessmentProgress(
        VocabularyAssessment $assessment,
        ?string $activeDimension = null,
        ?int $activeLevel = null,
        ?int $currentQuestionIndex = null,
    ): array {
        $maxLevel = $this->getMaxLevelBySchoolStage($assessment->school_stage ?? '');
        $minLevel = $this->getMinLevelByAssessment($assessment);
        $startLevel = max(self::MIN_LEVEL, min(self::MAX_LEVEL, (int) ($assessment->start_level ?? self::MIN_LEVEL)));
        $vocabLevel = $this->clampLevel(
            (int) ($assessment->vocab_current_level ?? $startLevel),
            $minLevel,
            $maxLevel
        );
        $grammarLevel = $this->clampLevel(
            (int) ($assessment->grammar_current_level ?? $startLevel),
            $minLevel,
            $maxLevel
        );
        $answered = (int) $assessment->answered_count;
        $total = (int) $assessment->total_questions;
        $current = $currentQuestionIndex ?? min($answered + 1, $total);

        return [
            'current' => $current,
            'total' => $total,
            'current_level' => $activeLevel ?? ($activeDimension === self::DIMENSION_GRAMMAR ? $grammarLevel : $vocabLevel),
            'vocab_current_level' => $vocabLevel,
            'grammar_current_level' => $grammarLevel,
            'start_level' => $startLevel,
            'min_level' => $minLevel,
            'max_level' => $maxLevel,
            'active_dimension' => $activeDimension,
            'school_stage' => trim((string) ($assessment->school_stage ?? '')),
        ];
    }

    /**
     * @param array<int, VocabularyAssessmentRecord> $records
     */
    public function resolveStableLevelByDimension(array $records, string $dimension, int $fallbackLevel): int
    {
        $dimensionRecords = [];
        foreach ($records as $record) {
            if ($this->normalizeQuestionType((string) $record->question_type) !== $dimension) {
                continue;
            }
            $dimensionRecords[] = $record;
        }

        if ($dimensionRecords === []) {
            return $this->clampLevel($fallbackLevel, self::MIN_LEVEL, self::MAX_LEVEL);
        }

        $tail = array_slice($dimensionRecords, -self::STABLE_TAIL_RECORDS);
        $levels = array_map(
            fn ($record) => $this->clampLevel(
                (int) ($record->level_after ?? $record->assessment_level ?? $fallbackLevel),
                self::MIN_LEVEL,
                self::MAX_LEVEL
            ),
            $tail
        );
        sort($levels);
        $count = count($levels);
        $mid = intdiv($count, 2);

        if ($count % 2 === 1) {
            return $levels[$mid];
        }

        return (int) round(($levels[$mid - 1] + $levels[$mid]) / 2);
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
            $maxLevel = $this->getMaxLevelBySchoolStage($assessment->school_stage ?? '');
            $minLevel = $this->getMinLevelByAssessment($assessment);
            $currentLevel = min($this->getDimensionCurrentLevel($assessment, $dimension), $maxLevel);
            $currentLevel = max($minLevel, $currentLevel);
            $question = $this->pickQuestionForDimension($dimension, $currentLevel, $usedQuestionIds, $maxLevel, $minLevel);
            if (!$question) {
                continue;
            }

            return [
                'question' => $this->serializeQuestionForClient($question, $dimension),
                'dimension' => $dimension,
                'current_level' => $currentLevel,
                'progress' => $this->buildAssessmentProgress($assessment, $dimension, $currentLevel),
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
        $maxLevel = $this->getMaxLevelBySchoolStage($assessment->school_stage ?? '');
        $minLevel = $this->getMinLevelByAssessment($assessment);
        $levelBefore = min($this->getDimensionCurrentLevel($assessment, $dimension), $maxLevel);
        $levelBefore = max($minLevel, $levelBefore);
        $levelAfter = $levelBefore;

        if (!$isCorrect) {
            $levelAfter = max($minLevel, $levelBefore - 1);
            return [
                'level_before' => $levelBefore,
                'level_after' => $levelAfter,
                'correct_streak' => 0,
                'dimension' => $dimension,
            ];
        }

        $levelAfter = min($maxLevel, $levelBefore + 1);

        return [
            'level_before' => $levelBefore,
            'level_after' => $levelAfter,
            'correct_streak' => 1,
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

        $schoolStage = trim((string) ($assessment->school_stage ?? ''));
        $maxBySchool = $this->getMaxLevelBySchoolStage($schoolStage);
        $provenLevel = $this->resolveProvenLevelFromRecords($records);
        $peakQuestionLevel = $this->resolvePeakQuestionLevel($records);
        $ceilingFromQuestions = min($provenLevel + 1, $maxBySchool, self::MAX_LEVEL);

        $vocabFinalLevel = $this->resolveStableLevelByDimension(
            $records->all(),
            self::DIMENSION_VOCAB,
            $assessment->vocab_current_level ?? $assessment->start_level ?? 1
        );
        $grammarFinalLevel = $this->resolveStableLevelByDimension(
            $records->all(),
            self::DIMENSION_GRAMMAR,
            $assessment->grammar_current_level ?? $assessment->start_level ?? 1
        );

        $vocabFinalLevel = min($vocabFinalLevel, $ceilingFromQuestions);
        $grammarFinalLevel = min($grammarFinalLevel, $ceilingFromQuestions);

        $rawLevel = (int) round(($vocabFinalLevel * 0.55) + ($grammarFinalLevel * 0.45));
        $rawLevel = max(self::MIN_LEVEL, min(self::MAX_LEVEL, $rawLevel));
        $finalLevel = min($rawLevel, $grammarFinalLevel + 1, $ceilingFromQuestions);
        $finalLevel = max(self::MIN_LEVEL, min(self::MAX_LEVEL, $finalLevel));

        $accuracy = (float) ($assessment->accuracy ?? 0);
        $mappedRealm = $this->mapLevelToRealm($finalLevel, $accuracy, $schoolStage);

        $suggestions = $this->buildResultSuggestions(
            $schoolStage,
            $mappedRealm,
            $provenLevel,
            $peakQuestionLevel,
            $vocabFinalLevel,
            $grammarFinalLevel,
            $finalLevel,
            $accuracy
        );

        return [
            'assessment_id' => $assessmentId,
            'school_stage' => $schoolStage,
            'start_level' => max(self::MIN_LEVEL, min(self::MAX_LEVEL, (int) ($assessment->start_level ?? self::MIN_LEVEL))),
            'proven_level' => $provenLevel,
            'peak_question_level' => $peakQuestionLevel,
            'max_level_by_school' => $maxBySchool,
            'vocab_final_level' => $vocabFinalLevel,
            'grammar_final_level' => $grammarFinalLevel,
            'raw_level' => $rawLevel,
            'final_level' => $finalLevel,
            'final_realm' => $mappedRealm['realm_label'],
            'final_stage' => $mappedRealm['stage'],
            'realm_code' => $mappedRealm['realm_code'],
            'realm_stage' => $mappedRealm['realm_stage'],
            'major_realm' => $mappedRealm['major_realm'],
            'realm_explanation' => $mappedRealm['explanation'],
            'level_results' => $overallLevelResults,
            'dimension_results' => $dimensionResults,
            'near_breakthrough' => false,
            'suggestions' => $suggestions,
        ];
    }

    public function mapLevelToRealm(int $level, float $accuracy, ?string $schoolStage = null): array
    {
        $normalizedLevel = max(self::MIN_LEVEL, min(self::MAX_LEVEL, $level));
        $stage = $this->mapAccuracyToStage($accuracy);
        $schoolStage = trim((string) $schoolStage);

        if ($schoolStage !== '' && isset(self::REALM_CODE_BY_SCHOOL_STAGE[$schoolStage])) {
            $realmCode = self::REALM_CODE_BY_SCHOOL_STAGE[$schoolStage];
            $majorRealm = self::MAJOR_REALM_BY_CODE[$realmCode] ?? '练气';
            $explanation = sprintf(
                '按注册学段「%s」评定，大境界为%s；「%s」中的层数由本场正确率（%.0f%%）决定。',
                $schoolStage,
                $majorRealm,
                $majorRealm . $this->chineseLayer($stage),
                $accuracy
            );
        } else {
            $majorRealm = self::MAJOR_REALM_BY_LEVEL[$normalizedLevel] ?? '练气';
            $realmCode = self::REALM_CODE_BY_LEVEL[$normalizedLevel] ?? 'L1';
            $explanation = sprintf(
                '综合试炼等级 L%d 对应%s境；层数由本场正确率（%.0f%%）决定。',
                $normalizedLevel,
                $majorRealm,
                $accuracy
            );
        }

        return [
            'major_realm' => $majorRealm,
            'stage' => (string) $stage,
            'realm_label' => $majorRealm . $this->chineseLayer($stage),
            'realm_code' => $realmCode,
            'realm_stage' => $stage,
            'explanation' => $explanation,
        ];
    }

    private function buildResultSuggestions(
        string $schoolStage,
        array $mappedRealm,
        int $provenLevel,
        int $peakQuestionLevel,
        int $vocabFinalLevel,
        int $grammarFinalLevel,
        int $finalLevel,
        float $accuracy
    ): array {
        $lines = [];
        if ($schoolStage !== '') {
            $lines[] = sprintf(
                '注册学段：%s；本学段境界上限为%s境（试炼等级不超过 L%d）。',
                $schoolStage,
                $mappedRealm['major_realm'],
                $this->getMaxLevelBySchoolStage($schoolStage)
            );
        }
        $lines[] = sprintf(
            '实测题目最高难度 L%d，稳定掌握 L%d（按实际做题难度与正确率统计）。',
            $peakQuestionLevel,
            $provenLevel
        );
        $lines[] = sprintf(
            '词汇稳定 L%d、语法稳定 L%d（取各维度末 %d 题难度中位数），综合 L%d。',
            $vocabFinalLevel,
            $grammarFinalLevel,
            self::STABLE_TAIL_RECORDS,
            $finalLevel
        );
        $lines[] = sprintf('测定境界：%s（正确率 %.0f%%）。', $mappedRealm['realm_label'], $accuracy);
        $lines[] = sprintf('建议从%s词库与语法关卡开始修炼。', $mappedRealm['major_realm']);

        return $lines;
    }

    private function clampLevel(int $level, int $minLevel, int $maxLevel): int
    {
        return max($minLevel, min($maxLevel, $level));
    }

    private function resolveProvenLevelFromRecords($records): int
    {
        $byLevel = [];
        foreach ($records as $record) {
            $level = max(self::MIN_LEVEL, min(self::MAX_LEVEL, (int) $record->assessment_level));
            if (!isset($byLevel[$level])) {
                $byLevel[$level] = ['total' => 0, 'correct' => 0];
            }
            $byLevel[$level]['total']++;
            if ((int) $record->is_correct === 1) {
                $byLevel[$level]['correct']++;
            }
        }

        $proven = self::MIN_LEVEL;
        foreach ($byLevel as $level => $stats) {
            if ((int) $stats['total'] <= 0) {
                continue;
            }
            $accuracy = ((int) $stats['correct']) / (int) $stats['total'];
            if ($accuracy >= 0.7 && (int) $level > $proven) {
                $proven = (int) $level;
            }
        }

        return $proven;
    }

    private function resolvePeakQuestionLevel($records): int
    {
        $peak = self::MIN_LEVEL;
        foreach ($records as $record) {
            $level = max(self::MIN_LEVEL, min(self::MAX_LEVEL, (int) $record->assessment_level));
            if ($level > $peak) {
                $peak = $level;
            }
        }

        return $peak;
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

    private function pickQuestionForDimension(
        string $dimension,
        int $currentLevel,
        array $usedQuestionIds,
        int $maxLevel = self::MAX_LEVEL,
        int $minLevel = self::MIN_LEVEL,
    ): ?Question {
        $types = self::QUESTION_TYPES_BY_DIMENSION[$dimension] ?? [];
        if (empty($types)) {
            return null;
        }

        $maxLevel = max(self::MIN_LEVEL, min(self::MAX_LEVEL, $maxLevel));
        $minLevel = max(self::MIN_LEVEL, min($maxLevel, $minLevel));
        $currentLevel = max($minLevel, min($maxLevel, $currentLevel));

        $levels = [$currentLevel];
        $question = $this->pickQuestionByTypesAndLevels($types, $levels, $usedQuestionIds, $currentLevel, $dimension);
        if ($question) {
            return $question;
        }

        $neighbors = array_values(array_unique(array_filter([
            $currentLevel - 1,
            $currentLevel + 1,
        ], fn (int $value) => $value >= $minLevel && $value <= $maxLevel)));
        if (!empty($neighbors)) {
            $question = $this->pickQuestionByTypesAndLevels($types, $neighbors, $usedQuestionIds, $currentLevel, $dimension);
            if ($question) {
                return $question;
            }
        }

        return $this->pickQuestionByTypesAndLevels($types, range($minLevel, $maxLevel), $usedQuestionIds, $currentLevel, $dimension);
    }

    /**
     * 灵根测试语法轨：排除小学「选出不同类」等词汇分类题（与语法机关桥一致）。
     */
    public function isAssessmentSuitableGrammar(Question $question): bool
    {
        $stem = trim((string) ($question->question ?? ''));

        return $stem !== '' && !AssessmentLevelResolver::isVocabularyClassificationStem($stem);
    }

    private function applyGrammarAssessmentScope($query): void
    {
        AssessmentLevelResolver::applyGrammarPracticeScope($query);
    }

    private function pickQuestionByTypesAndLevels(
        array $types,
        array $levels,
        array $usedQuestionIds,
        int $currentLevel,
        string $dimension = self::DIMENSION_VOCAB,
    ): ?Question {
        if (empty($types) || empty($levels)) {
            return null;
        }

        $query = Question::query()
            ->whereIn('type', $types)
            ->where('is_assessment', 1)
            ->whereIn('assessment_level', $levels);

        if ($dimension === self::DIMENSION_GRAMMAR) {
            $this->applyGrammarAssessmentScope($query);
        }

        if (!empty($usedQuestionIds)) {
            $query->whereNotIn('question_id', $usedQuestionIds);
        }

        if (count($levels) === 1) {
            $candidates = $query->inRandomOrder()->limit(12)->get();
            return $candidates->first(fn (Question $question) => $this->isAssessmentSuitableGrammar($question))
                ?? $candidates->first();
        }

        $candidates = $query
            ->orderByRaw('ABS(CAST(assessment_level AS SIGNED) - ?)', [$currentLevel])
            ->inRandomOrder()
            ->limit(12)
            ->get();

        if ($dimension !== self::DIMENSION_GRAMMAR) {
            return $candidates->first();
        }

        return $candidates->first(fn (Question $question) => $this->isAssessmentSuitableGrammar($question))
            ?? $candidates->first();
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
