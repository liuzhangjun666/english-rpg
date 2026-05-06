<?php

namespace App\Services;

use App\Models\HeartDemon;
use App\Models\Question;
use App\Models\User;

/**
 * 心魔录引擎：错题自动追踪 + 注入修炼 + 强化复习
 */
class HeartDemonService
{
    // 每次答题混入心魔题的比例
    const INJECTION_RATIO = 0.2;

    /** 记录答错（新增或累加心魔） */
    public function recordWrong(int $userId, string $questionId, string $type, ?string $realm = null): void
    {
        $question = Question::where('question_id', $questionId)->first();

        HeartDemon::updateOrCreate(
            ['user_id' => $userId, 'question_id' => $questionId],
            [
                'word' => $question?->word,
                'realm' => $realm ?? $question?->realm,
                'type' => $type,
                'wrong_count' => \DB::raw('wrong_count + 1'),
                'mastery' => \DB::raw('GREATEST(0, mastery - 10)'),
                'last_wrong_at' => now(),
                'is_mastered' => false,
            ]
        );
    }

    /** 记录复习正确 */
    public function recordCorrect(int $userId, string $questionId): void
    {
        $demon = HeartDemon::where('user_id', $userId)
            ->where('question_id', $questionId)
            ->first();

        if ($demon) {
            $demon->increment('reviewed_count');
            $demon->mastery = min(100, $demon->mastery + 20);
            $demon->last_reviewed_at = now();
            // 掌握度 >= 80 且复习正确3次以上 → 标记已掌握
            if ($demon->mastery >= 80 && $demon->reviewed_count >= 3) {
                $demon->is_mastered = true;
            }
            $demon->save();
        }
    }

    /** 获取用户未掌握的心魔题（待复习队列） */
    public function getPendingDemons(int $userId, int $limit = 10): array
    {
        return HeartDemon::where('user_id', $userId)
            ->where('is_mastered', false)
            ->orderBy('next_review_at')
            ->orderByDesc('wrong_count')
            ->limit($limit)
            ->get()
            ->toArray();
    }

    /** 获取混入心魔题的完整题目列表（正答 + 心魔注入） */
    public function getInjectedQuestions(int $userId, string $type, string $realm, string $stage, int $normalCount): array
    {
        // 1. 获取正常题目
        $normalQuestions = Question::where('type', $type)
            ->where('realm', $realm)
            ->where('stage', $stage)
            ->get()->keyBy('question_id')->toArray();

        // 2. 获取用户心魔题
        $demonCount = max(1, (int)round($normalCount * self::INJECTION_RATIO));
        $demons = $this->getPendingDemons($userId, $demonCount);

        // 3. 从心魔中找出对应题目
        $injected = [];
        foreach ($demons as $demon) {
            $q = Question::where('question_id', $demon['question_id'])->first();
            if ($q) {
                $qArr = $q->toArray();
                $qArr['_is_demon'] = true;
                $qArr['_demon_wrong_count'] = $demon['wrong_count'];
                $injected[] = $qArr;
            }
        }

        // 4. 从正常题中去掉已注入的题，打乱后取剩余
        $injectedIds = array_column($injected, 'question_id');
        $remaining = array_filter($normalQuestions, fn($q) => !in_array($q['question_id'], $injectedIds));
        $remaining = array_values($remaining);
        shuffle($remaining);
        $keepCount = $normalCount - count($injected);
        $normal = array_slice($remaining, 0, max(0, $keepCount));

        // 5. 合并后打乱
        $all = array_merge($normal, $injected);
        shuffle($all);

        return $all;
    }

    /** 渡劫前强制心魔复习：取该用户未掌握的心魔题 */
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
