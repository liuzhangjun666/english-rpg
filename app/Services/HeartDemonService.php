<?php

namespace App\Services;

use App\Models\HeartDemon;
use App\Models\Question;
use App\Models\User;

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
        $normalQuestions = $this->pickNormalQuestions($userId, $type, $realm, $stage)
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

    private function pickNormalQuestions(int $userId, string $type, string $realm, string $stage)
    {
        $baseQuery = Question::query()->where('type', $type);
        $user = User::query()->select(['id', 'school_grade'])->find($userId);
        $gradeLabels = $this->targetGradeLabels($user?->school_grade, $realm);

        // New rule: same module first, but match by "student grade + realm breakthrough progression".
        if (!empty($gradeLabels)) {
            $gradeMatched = (clone $baseQuery)
                ->whereIn('grade_level', $gradeLabels)
                ->get();
            if ($gradeMatched->isNotEmpty()) {
                return $gradeMatched;
            }
        }

        // Compatibility fallback: old realm+stage bucket.
        $legacyMatched = (clone $baseQuery)
            ->where('realm', $realm)
            ->where('stage', $stage)
            ->get();
        if ($legacyMatched->isNotEmpty()) {
            return $legacyMatched;
        }

        // Final fallback: same module only.
        return $baseQuery->get();
    }

    private function targetGradeLabels(?string $schoolGrade, string $realm): array
    {
        $mapped = $this->realmMappedGradeLabels($realm);
        if (!empty($mapped)) {
            return $mapped;
        }

        $base = $this->parseGradeNumber($schoolGrade);
        if ($base === null) {
            return [];
        }

        // Fallback only: when realm is unknown, keep linear progression by current grade.
        $target = max(1, min(16, $base + ($this->realmLayer($realm) - 1)));
        return $this->gradeNumberToLabels($target);
    }

    private function parseGradeNumber(?string $schoolGrade): ?int
    {
        $value = trim((string) $schoolGrade);
        if ($value === '') {
            return null;
        }

        if (preg_match('/^grade_(\d{1,2})$/', $value, $m)) {
            return max(1, min(16, (int) $m[1]));
        }

        if (preg_match('/^(\d{1,2})年级$/u', $value, $m)) {
            return max(1, min(16, (int) $m[1]));
        }

        $cnMap = ['一' => 1, '二' => 2, '三' => 3, '四' => 4, '五' => 5, '六' => 6, '七' => 7, '八' => 8, '九' => 9];
        if (preg_match('/^([一二三四五六七八九])年级$/u', $value, $m)) {
            return $cnMap[$m[1]] ?? null;
        }

        return match ($value) {
            '高一' => 10,
            '高二' => 11,
            '高三' => 12,
            '大一' => 13,
            '大二' => 14,
            '大三' => 15,
            '大四' => 16,
            default => null,
        };
    }

    private function realmLayer(string $realm): int
    {
        if (preg_match('/(\d+)$/', strtoupper(trim($realm)), $m)) {
            return max(1, min(9, (int) $m[1]));
        }
        return 1;
    }

    private function gradeNumberToLabels(int $gradeNo): array
    {
        $cn = [1 => '一', 2 => '二', 3 => '三', 4 => '四', 5 => '五', 6 => '六', 7 => '七', 8 => '八', 9 => '九'];
        $labels = [];

        if ($gradeNo >= 1 && $gradeNo <= 9) {
            $labels[] = $gradeNo . '年级';
            if (isset($cn[$gradeNo])) {
                $labels[] = $cn[$gradeNo] . '年级';
            }
        } elseif ($gradeNo === 10) {
            $labels[] = '高一';
            $labels[] = '10年级';
        } elseif ($gradeNo === 11) {
            $labels[] = '高二';
            $labels[] = '11年级';
        } elseif ($gradeNo === 12) {
            $labels[] = '高三';
            $labels[] = '12年级';
        } elseif ($gradeNo === 13) {
            $labels[] = '大一';
        } elseif ($gradeNo === 14) {
            $labels[] = '大二';
        } elseif ($gradeNo === 15) {
            $labels[] = '大三';
        } elseif ($gradeNo >= 16) {
            $labels[] = '大四';
        }

        return array_values(array_unique(array_filter($labels)));
    }

    private function realmMappedGradeLabels(string $realm): array
    {
        $prefix = strtoupper(substr(trim($realm), 0, 1));
        $layer = $this->realmLayer($realm);

        $gradeKey = match ($prefix) {
            // 练气一层~练气三层 => 1~2年级
            'L' => match (true) {
                $layer <= 2 => 'g1',
                $layer === 3 => 'g2',
                // 练气四层~练气六层 => 3~4年级
                $layer <= 5 => 'g3',
                $layer === 6 => 'g4',
                // 练气七层~练气九层 => 5~6年级
                $layer <= 8 => 'g5',
                default => 'g6',
            },
            // 筑基一层~筑基九层 => 7~9年级
            'Z' => match (true) {
                $layer <= 3 => 'g7',
                $layer <= 6 => 'g8',
                default => 'g9',
            },
            // 金丹一层~金丹九层 => 高一~高三
            'J' => match (true) {
                $layer <= 3 => 's1',
                $layer <= 6 => 's2',
                default => 's3',
            },
            // 元婴一层~元婴四层 => 大一~大二 / CET4
            // 元婴五层~元婴九层 => 大三~大四 / CET6
            'Y' => match (true) {
                $layer <= 2 => 'u1_cet4',
                $layer <= 4 => 'u2_cet4',
                $layer <= 7 => 'u3_cet6',
                default => 'u4_cet6',
            },
            // 化神一层~化神三层 => 研一
            // 化神四层~化神六层 => 研二
            // 化神七层~化神九层 => 研三及以上
            'H' => match (true) {
                $layer <= 3 => 'm1',
                $layer <= 6 => 'm2',
                default => 'm3plus',
            },
            default => null,
        };

        if ($gradeKey === null) {
            return [];
        }

        return $this->gradeAliasesByKey($gradeKey);
    }

    private function gradeAliasesByKey(string $gradeKey): array
    {
        return match ($gradeKey) {
            'g1' => ['1年级', '一年级'],
            'g2' => ['2年级', '二年级'],
            'g3' => ['3年级', '三年级'],
            'g4' => ['4年级', '四年级'],
            'g5' => ['5年级', '五年级'],
            'g6' => ['6年级', '六年级'],
            'g7' => ['7年级', '七年级', '初一'],
            'g8' => ['8年级', '八年级', '初二'],
            'g9' => ['9年级', '九年级', '初三'],
            's1' => ['高一', '10年级'],
            's2' => ['高二', '11年级'],
            's3' => ['高三', '12年级'],
            'u1_cet4' => ['大一', 'CET4'],
            'u2_cet4' => ['大二', 'CET4'],
            'u3_cet6' => ['大三', 'CET6'],
            'u4_cet6' => ['大四', 'CET6'],
            'm1' => ['研一'],
            'm2' => ['研二'],
            'm3plus' => ['研三', '研三及以上'],
            default => [],
        };
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
