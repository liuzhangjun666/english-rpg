<?php

namespace App\Services;

use App\Models\HeartDemon;
use App\Models\Question;

class HeartDemonService
{
    // Ratio of injected demon questions in each practice batch.
    public const INJECTION_RATIO = 0.2;
    // Clear a demon after this many correct answers.
    public const MASTERED_REVIEW_COUNT = 3;

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
                'is_mastered' => false,
            ]);
            return;
        }

        $demon->word = $question?->word ?? $demon->word;
        $demon->realm = $realm ?? $question?->realm ?? $demon->realm;
        $demon->type = $type ?: $demon->type;
        $demon->wrong_count = (int) $demon->wrong_count + 1;
        $demon->mastery = max(0, (int) $demon->mastery - 10);
        $demon->last_wrong_at = now();
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

        if ((int) $demon->reviewed_count >= self::MASTERED_REVIEW_COUNT) {
            $demon->is_mastered = true;
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

        $demonCount = max(1, (int) round($normalCount * self::INJECTION_RATIO));
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
}
