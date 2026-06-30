<?php

namespace App\Services;

use App\Models\HeartDemon;
use App\Models\Question;
use App\Models\User;
use App\Models\VocabularyWord;

class HeartDemonService
{
    public function __construct(
        private readonly PracticeLevelService $levelService,
        private readonly QuestionResolverService $questionResolver,
    ) {
    }

    // Base ratio of injected demon questions in each practice batch.
    public const INJECTION_RATIO = 0.2;
    // Clear a demon after this many correct answers.
    public const MASTERED_REVIEW_COUNT = 3;
    // Simplified spaced-repetition intervals (days).
    private const REVIEW_INTERVALS = [1, 3, 7, 14, 30, 60];

    public function recordWrong(int $userId, string $questionId, string $type, ?string $realm = null): void
    {
        $question = Question::where('question_id', $questionId)->first();
        $demon = HeartDemon::where('user_id', $userId)
            ->where('question_id', $questionId)
            ->first();

        $wordLemma = $question?->word;
        if (!$wordLemma && $type === 'vocab' && preg_match('/^VW-(\d+)$/', $questionId, $m)) {
            $vw = VocabularyWord::query()->find((int) $m[1]);
            $wordLemma = $vw?->lemma;
        }

        if (!$demon) {
            HeartDemon::create([
                'user_id' => $userId,
                'question_id' => $questionId,
                'word' => $wordLemma,
                'realm' => $realm ?? $question?->realm,
                'type' => $type,
                'wrong_count' => 1,
                'mastery' => 0,
                'last_wrong_at' => now(),
                'next_review_at' => now()->addDay(),
                'is_mastered' => false,
            ]);
            return;
        }

        $demon->word = $wordLemma ?? $demon->word;
        $demon->realm = $realm ?? $question?->realm ?? $demon->realm;
        $demon->type = $type ?: $demon->type;
        $demon->wrong_count = (int) $demon->wrong_count + 1;
        $demon->reviewed_count = 0;
        $demon->mastery = max(0, (int) $demon->mastery - 10);
        $demon->last_wrong_at = now();
        $demon->next_review_at = now()->addDay();
        $demon->is_mastered = false;
        $demon->save();
    }

    public function recordCorrect(int $userId, string $questionId): void
    {
        $demon = HeartDemon::where('user_id', $userId)
            ->where('question_id', $questionId)
            ->first();

        if (!$demon) {
            return;
        }

        $demon->increment('reviewed_count');
        $demon->mastery = min(100, ((int) $demon->mastery) + 20);
        $demon->last_reviewed_at = now();

        $reviewedCount = (int) $demon->reviewed_count;
        if ($reviewedCount >= self::MASTERED_REVIEW_COUNT && (int) $demon->mastery >= 80) {
            $demon->is_mastered = true;
            $demon->next_review_at = null;
        } else {
            $idx = min($reviewedCount, count(self::REVIEW_INTERVALS) - 1);
            $demon->next_review_at = now()->addDays(self::REVIEW_INTERVALS[$idx]);
        }

        $demon->save();
    }

    public function getPendingDemons(int $userId, int $limit = 10, ?string $type = null, ?string $realm = null): array
    {
        $query = HeartDemon::where('user_id', $userId)
            ->where('is_mastered', false);

        if ($type) {
            $query->where('type', $type);
        }

        if ($realm) {
            $query->where('realm', $realm);
        }

        return $query
            ->where(function ($q) {
                $q->whereNull('next_review_at')->orWhere('next_review_at', '<=', now());
            })
            ->orderBy('next_review_at')
            ->orderByDesc('wrong_count')
            ->limit($limit)
            ->get()
            ->toArray();
    }

    public function getInjectedQuestions(int $userId, string $type, int $stageNo, int $normalCount): array
    {
        $user = User::query()->find($userId);
        if (!$user) {
            return [];
        }

        $realmCode = (string) ($user->realm ?? 'L1');
        $stageQuestions = $this->levelService->getStageQuestions($user, $type, $stageNo);
        if ($stageQuestions->isEmpty()) {
            return [];
        }

        $normalQuestions = $stageQuestions->keyBy('question_id')->toArray();

        $demonCount = (int) round($normalCount * $this->dynamicInjectionRatio($userId, $type, $realmCode));
        if ($demonCount > 0) {
            $demonCount = max(1, $demonCount);
        }
        $demons = $this->getPendingDemons($userId, $demonCount, $type, $realmCode);

        $injected = [];
        foreach ($demons as $demon) {
            $q = Question::where('question_id', $demon['question_id'])->first();
            if (!$q || $q->type !== $type) {
                continue;
            }
            if (!$this->levelService->isQuestionInUserPool($user, $type, (string) $q->question_id)) {
                continue;
            }
            $qArr = $q->toArray();
            $qArr['_is_demon'] = true;
            $qArr['_demon_wrong_count'] = $demon['wrong_count'];
            $injected[] = $qArr;
        }

        $injectedIds = array_column($injected, 'question_id');
        $remaining = array_filter($normalQuestions, fn ($q) => !in_array($q['question_id'], $injectedIds));
        $remaining = array_values($remaining);
        shuffle($remaining);

        $keepCount = $normalCount - count($injected);
        $normal = array_slice($remaining, 0, max(0, $keepCount));

        $all = array_merge($normal, $injected);
        shuffle($all);

        return $all;
    }

    public function getPreExamReview(int $userId, string $realm, int $limit = 5): array
    {
        $user = User::query()->find($userId);
        if (!$user) {
            return [];
        }

        $demons = HeartDemon::where('user_id', $userId)
            ->where('is_mastered', false)
            ->where('realm', $realm)
            ->orderByDesc('wrong_count')
            ->limit($limit * 3)
            ->get();

        $questions = [];
        foreach ($demons as $demon) {
            $qArr = $this->questionResolver->resolve((string) $demon->question_id);
            if (!$qArr) {
                continue;
            }
            $type = (string) ($qArr['type'] ?? $demon->type ?? '');
            if (preg_match('/^VW-(\d+)$/', (string) $demon->question_id, $m)) {
                if (!$this->levelService->isVocabWordInUserPool($user, (int) $m[1])) {
                    continue;
                }
            } elseif ($type !== '' && !$this->levelService->isQuestionInUserPool($user, $type, (string) $demon->question_id)) {
                continue;
            }
            $qArr['_is_demon'] = true;
            $qArr['_demon_wrong_count'] = (int) $demon->wrong_count;
            $questions[] = $qArr;
            if (count($questions) >= $limit) {
                break;
            }
        }

        return $questions;
    }

    public function getRecentWrongQuestions(int $userId, int $min = 3, int $max = 5): array
    {
        $user = User::query()->find($userId);
        if (!$user) {
            return [];
        }

        $take = max($min, $max);
        $demons = HeartDemon::where('user_id', $userId)
            ->where('is_mastered', false)
            ->where('realm', (string) ($user->realm ?? ''))
            ->orderByDesc('last_wrong_at')
            ->orderByDesc('wrong_count')
            ->limit($take * 3)
            ->get();

        $questions = [];
        foreach ($demons as $demon) {
            $arr = $this->questionResolver->resolve((string) $demon->question_id);
            if (!$arr) {
                continue;
            }
            $type = (string) ($arr['type'] ?? $demon->type ?? '');
            if (preg_match('/^VW-(\d+)$/', (string) $demon->question_id, $m)) {
                if (!$this->levelService->isVocabWordInUserPool($user, (int) $m[1])) {
                    continue;
                }
            } elseif ($type !== '' && !$this->levelService->isQuestionInUserPool($user, $type, (string) $demon->question_id)) {
                continue;
            }
            $arr['_is_demon'] = true;
            $arr['_demon_wrong_count'] = (int) $demon->wrong_count;
            $arr['_last_wrong_at'] = optional($demon->last_wrong_at)?->toIso8601String();
            $questions[] = $arr;
            if (count($questions) >= $max) {
                break;
            }
        }

        if (count($questions) < $min) {
            return $questions;
        }

        return array_slice($questions, 0, $max);
    }

    public function evaluateDemonTrial(int $userId, array $answers, string $encounterType = 'manual', int $timeSpent = 0): array
    {
        $resultItems = [];
        $correctCount = 0;
        $metricRows = [];
        $encounterId = (string) \Illuminate\Support\Str::uuid();

        foreach ($answers as $item) {
            $questionId = trim((string) ($item['question_id'] ?? ''));
            if ($questionId === '') {
                continue;
            }
            $answer = trim((string) ($item['answer'] ?? ''));
            $answerText = isset($item['answer_text']) ? trim((string) $item['answer_text']) : null;
            $resolved = $this->questionResolver->resolve($questionId);
            if (!$resolved) {
                continue;
            }

            $correct = $this->questionResolver->isCorrect($questionId, $answer, $answerText);
            
            // 查询心魔记录以获取 wrong_count (用于埋点) 和更新 V1.2 字段
            $demon = HeartDemon::where('user_id', $userId)->where('question_id', $questionId)->first();
            $wrongCountAtEncounter = $demon ? $demon->wrong_count : 1;
            $masteryBefore = $demon ? $demon->mastery : 0;
            
            if ($correct) {
                $correctCount++;
                $this->recordCorrect($userId, $questionId);
            } else {
                $this->recordWrong($userId, $questionId, (string) ($resolved['type'] ?? 'vocab'), (string) ($resolved['realm'] ?? null));
            }
            
            // 重新获取心魔记录以更新遭遇次数、得到 mastery_after
            $demonAfter = HeartDemon::where('user_id', $userId)->where('question_id', $questionId)->first();
            $masteryAfter = $demonAfter ? $demonAfter->mastery : 0;
            
            // V1.2 更新：遭遇次数和最后遭遇时间
            if ($demonAfter) {
                $demonAfter->increment('encounter_count');
                $demonAfter->last_seen_at = now();
                $demonAfter->save();
            }

            $resultItems[] = [
                'question_id' => $questionId,
                'correct' => $correct,
            ];

            // 组装埋点数据
            $metricRows[] = [
                'encounter_id' => $encounterId,
                'user_id' => $userId,
                'question_id' => $questionId,
                'encounter_type' => $encounterType,
                'is_passed' => $correct,
                'time_spent' => $timeSpent,
                'wrong_count_at_encounter' => $wrongCountAtEncounter,
                'mastery_before' => $masteryBefore,
                'mastery_after' => $masteryAfter,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        $total = count($resultItems);

        // 如果整场通关，为参与的所有心魔增加击败次数
        if ($total > 0 && $correctCount === $total) {
            foreach ($answers as $item) {
                $qId = trim((string) ($item['question_id'] ?? ''));
                if ($qId) {
                    HeartDemon::where('user_id', $userId)->where('question_id', $qId)->increment('defeat_count');
                }
            }
        }

        if (!empty($metricRows)) {
            \Illuminate\Support\Facades\DB::table('levelup_demon_metrics')->insert($metricRows);
        }

        $total = count($resultItems);
        return [
            'total' => $total,
            'correct_count' => $correctCount,
            'passed' => $total > 0 && $correctCount === $total,
            'results' => $resultItems,
        ];
    }

    public function injectionRatioFor(int $userId, string $type, string $realm): float
    {
        return $this->dynamicInjectionRatio($userId, $type, $realm);
    }

    private function dynamicInjectionRatio(int $userId, ?string $type = null, ?string $realm = null): float
    {
        $query = HeartDemon::where('user_id', $userId)->where('is_mastered', false);
        if ($type) {
            $query->where('type', $type);
        }
        if ($realm) {
            $query->where('realm', $realm);
        }

        $demonCount = (int) $query->count();
        return match (true) {
            $demonCount === 0 => 0.0,
            $demonCount <= 5 => 0.1,
            $demonCount <= 15 => 0.2,
            $demonCount <= 30 => 0.3,
            default => 0.4,
        };
    }

    private function isAnswerCorrect(string $correctAnswer, string $userAnswer): bool
    {
        return mb_strtolower(trim($correctAnswer)) === mb_strtolower(trim($userAnswer));
    }
}
