<?php

namespace App\Services;

use App\Models\HeartDemon;
use App\Models\Question;

class HeartDemonService
{
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

        if (!$demon) {
            HeartDemon::create([
                'user_id' => $userId,
                'question_id' => $questionId,
                'word' => $question?->word,
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

        $demon->word = $question?->word ?? $demon->word;
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
            $query->where(function ($q) use ($realm) {
                $q->where('realm', $realm)->orWhereNull('realm');
            });
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

    public function getInjectedQuestions(int $userId, string $type, string $realm, string $stage, int $normalCount): array
    {
        $normalQuestions = Question::where('type', $type)
            ->where('realm', $realm)
            ->where('stage', $stage)
            ->get()
            ->keyBy('question_id')
            ->toArray();

        $demonCount = (int) round($normalCount * $this->dynamicInjectionRatio($userId, $type, $realm));
        if ($demonCount > 0) {
            $demonCount = max(1, $demonCount);
        }
        $demons = $this->getPendingDemons($userId, $demonCount, $type, $realm);

        $injected = [];
        foreach ($demons as $demon) {
            $q = Question::where('question_id', $demon['question_id'])->first();
            if ($q && $q->type === $type) {
                $qArr = $q->toArray();
                $qArr['_is_demon'] = true;
                $qArr['_demon_wrong_count'] = $demon['wrong_count'];
                $injected[] = $qArr;
            }
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
        $demons = HeartDemon::where('user_id', $userId)
            ->where('is_mastered', false)
            ->where(function ($q) use ($realm) {
                $q->where('realm', $realm)->orWhereNull('realm');
            })
            ->orderByDesc('wrong_count')
            ->limit($limit)
            ->get();

        $questions = [];
        foreach ($demons as $demon) {
            $q = Question::where('question_id', $demon['question_id'])->first();
            if ($q) {
                $qArr = $q->toArray();
                $qArr['_is_demon'] = true;
                $qArr['_demon_wrong_count'] = $demon['wrong_count'];
                $questions[] = $qArr;
            }
        }

        return $questions;
    }

    public function getRecentWrongQuestions(int $userId, int $min = 3, int $max = 5): array
    {
        $take = max($min, $max);
        $demons = HeartDemon::where('user_id', $userId)
            ->where('is_mastered', false)
            ->orderByDesc('last_wrong_at')
            ->orderByDesc('wrong_count')
            ->limit($take)
            ->get();

        $questions = [];
        foreach ($demons as $demon) {
            $q = Question::where('question_id', $demon->question_id)->first();
            if (!$q) {
                continue;
            }
            $arr = $q->toArray();
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

    public function evaluateDemonTrial(int $userId, array $answers): array
    {
        $resultItems = [];
        $correctCount = 0;

        foreach ($answers as $item) {
            $questionId = trim((string) ($item['question_id'] ?? ''));
            if ($questionId === '') {
                continue;
            }
            $answer = trim((string) ($item['answer'] ?? ''));
            $question = Question::where('question_id', $questionId)->first();
            if (!$question) {
                continue;
            }

            $correct = $this->isAnswerCorrect($question->correct_answer, $answer);
            if ($correct) {
                $correctCount++;
                $this->recordCorrect($userId, $questionId);
            } else {
                $this->recordWrong($userId, $questionId, (string) $question->type, (string) $question->realm);
            }

            $resultItems[] = [
                'question_id' => $questionId,
                'correct' => $correct,
            ];
        }

        $total = count($resultItems);
        return [
            'total' => $total,
            'correct_count' => $correctCount,
            'passed' => $total > 0 && $correctCount === $total,
            'results' => $resultItems,
        ];
    }

    private function dynamicInjectionRatio(int $userId, ?string $type = null, ?string $realm = null): float
    {
        $query = HeartDemon::where('user_id', $userId)->where('is_mastered', false);
        if ($type) {
            $query->where('type', $type);
        }
        if ($realm) {
            $query->where(function ($q) use ($realm) {
                $q->where('realm', $realm)->orWhereNull('realm');
            });
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
