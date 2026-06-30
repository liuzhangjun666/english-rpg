<?php

namespace App\Services;

use App\Models\ListeningQuestion;
use App\Models\ListeningPassage;
use App\Models\Question;
use App\Models\User;
use App\Models\VocabularyWord;
use App\Models\WritingPrompt;
use App\Support\AssessmentLevelResolver;
use Illuminate\Support\Collection;

/**
 * 按用户当前境界（对应年级题库）划分练功关卡。
 */
class PracticeLevelService
{
  /** 每关（一次修炼）抽取的题目数 */
    public const PER_SESSION = [
        'vocab' => 15,
        'grammar' => 10,
        'listening' => 10,
        'speaking' => 10,
        'writing' => 2,
    ];

    /** 题库 type → 六维字段名 */
    public const QUESTION_TYPE_TO_DIMENSION = [
        'vocab' => 'vocabulary',
        'grammar' => 'grammar',
        'listening' => 'listening',
        'speaking' => 'speaking',
        'reading' => 'reading',
    ];

    public function getGradeLabelsForUser(User $user): array
    {
        $realmCode = (string) ($user->realm ?? 'L1');
        $realmStage = max(1, min(9, (int) ($user->realm_stage ?? 1)));

        $mapped = $this->realmMappedGradeLabels($realmCode, $realmStage);
        if (!empty($mapped)) {
            return $mapped;
        }

        $base = $this->parseGradeNumber($user->school_grade ?? null);
        if ($base === null) {
            return [];
        }

        $target = max(1, min(16, $base + ($realmStage - 1)));
        return $this->gradeNumberToLabels($target);
    }

    public function getRealmCode(User $user): string
    {
        return strtoupper((string) ($user->realm ?? 'L1'));
    }

    public function getRealmPrefix(User $user): string
    {
        return strtoupper(substr($this->getRealmCode($user), 0, 1));
    }

    public function getEducationStageLabel(User $user): ?string
    {
        return match ($this->getRealmPrefix($user)) {
            'L' => '小学',
            'Z' => '初中',
            'J' => '高中',
            'Y' => '大学',
            default => null,
        };
    }

    public function getQuestionPool(User $user, string $type): Collection
    {
        if ($type === 'listening') {
            $listeningPool = $this->getListeningPassageQuestionPool($user);
            if ($listeningPool->isNotEmpty()) {
                return $listeningPool;
            }
        }

        $query = Question::query()->where('type', $type);
        $this->applyStrictRealmScope($query, $user);

        $gradeLabels = $this->getGradeLabelsForUser($user);
        if (!empty($gradeLabels)) {
            $this->applyGradeScope($query, $gradeLabels);
        }

        if ($type === 'grammar') {
            AssessmentLevelResolver::applyGrammarPracticeScope($query);
        }

        $questions = $query->orderBy('question_id')->get();

        if ($type === 'grammar') {
            $questions = $questions
                ->reject(fn (Question $question) => AssessmentLevelResolver::isVocabularyClassificationStem($question->question))
                ->values();
        }

        return $questions;
    }

    public function isQuestionInUserPool(User $user, string $type, string $questionId): bool
    {
        $questionId = trim($questionId);
        if ($questionId === '') {
            return false;
        }

        if ($type === 'listening' && preg_match('/^LQ-(\d+)$/', $questionId, $m)) {
            return $this->isListeningPassageQuestionInPool($user, (int) $m[1]);
        }

        static $cache = [];
        $key = $user->id . ':' . $type;
        if (!array_key_exists($key, $cache)) {
            $cache[$key] = $this->getQuestionPool($user, $type)
                ->pluck('question_id')
                ->mapWithKeys(fn ($id) => [(string) $id => true])
                ->all();
        }

        return !empty($cache[$key][$questionId]);
    }

    public function isVocabWordInUserPool(User $user, int $wordId): bool
    {
        if ($wordId <= 0) {
            return false;
        }

        static $cache = [];
        $key = (string) $user->id;
        if (!array_key_exists($key, $cache)) {
            $cache[$key] = $this->getVocabWordPool($user)
                ->pluck('id')
                ->mapWithKeys(fn ($id) => [(int) $id => true])
                ->all();
        }

        return !empty($cache[$key][$wordId]);
    }

    private function applyStrictRealmScope($query, User $user): void
    {
        $realmCode = $this->getRealmCode($user);
        $prefix = $this->getRealmPrefix($user);

        $query->where(function ($q) use ($realmCode, $prefix) {
            $q->where('realm', $realmCode)
                ->orWhere('realm', 'like', $prefix . '%');
        });

        $educationStage = $this->getEducationStageLabel($user);
        if ($educationStage) {
            $query->where(function ($q) use ($educationStage) {
                $q->whereNull('education_stage')
                    ->orWhere('education_stage', '')
                    ->orWhere('education_stage', $educationStage);
            });
        }
    }

    private function applyGradeScope($query, array $gradeLabels): void
    {
        $query->where(function ($q) use ($gradeLabels) {
            $q->whereNull('grade_level')
                ->orWhere('grade_level', '');

            $q->orWhere(function ($inner) use ($gradeLabels) {
                foreach ($gradeLabels as $label) {
                    $label = trim((string) $label);
                    if ($label === '') {
                        continue;
                    }
                    $inner->orWhere('grade_level', $label)
                        ->orWhere('grade_level', 'like', '%' . $label . '%');
                }
            });
        });
    }

    public function getStageLayout(User $user, string $type): array
    {
        $perSession = self::PER_SESSION[$type] ?? 10;
        $pool = $type === 'writing'
            ? $this->getWritingPromptPool($user)
            : ($type === 'vocab' ? $this->getVocabWordPool($user) : $this->getQuestionPool($user, $type));
        $realmCode = strtoupper((string) ($user->realm ?? 'L1'));
        $realmStage = max(1, min(9, (int) ($user->realm_stage ?? 1)));
        $currentRealm = trim((string) ($user->current_realm ?? ''));
        if ($currentRealm === '') {
            $currentRealm = $this->fallbackRealmLabel($realmCode, $realmStage);
        }

        $stages = [];
        $stageNo = 1;
        foreach ($pool->chunk($perSession) as $chunk) {
            $stages[] = [
                'stage_no' => $stageNo,
                'stage_code' => str_pad((string) $stageNo, 2, '0', STR_PAD_LEFT),
                'level_id' => sprintf('%s-%02d', $realmCode, $stageNo),
                'question_count' => $chunk->count(),
            ];
            $stageNo++;
        }

        return [
            'realm' => $realmCode,
            'realm_stage' => $realmStage,
            'current_realm' => $currentRealm,
            'grade_labels' => $this->getGradeLabelsForUser($user),
            'total_questions' => $pool->count(),
            'questions_per_stage' => $perSession,
            'total_stages' => count($stages),
            'stages' => $stages,
            'progress_key' => $this->progressStorageKey($user, $type),
        ];
    }

    public function getStageQuestions(User $user, string $type, int $stageNo): Collection
    {
        $perSession = self::PER_SESSION[$type] ?? 10;
        $pool = $type === 'writing'
            ? $this->getWritingPromptPool($user)
            : ($type === 'vocab' ? $this->getVocabWordPool($user) : $this->getQuestionPool($user, $type));
        $index = max(1, $stageNo) - 1;

        return $pool->slice($index * $perSession, $perSession)->values();
    }

    public function getVocabWordPool(User $user): Collection
    {
        $prefix = $this->getRealmPrefix($user);
        $levelTag = $this->getEducationStageLabel($user);

        $query = VocabularyWord::query();
        if ($prefix === 'Y') {
            // 大学境界：level_tag=大学，或 grade_level 含 CET4/CET6（与中小学词共用词条时）
            $query->where(function ($q) {
                $q->where('level_tag', '大学')
                    ->orWhere('grade_level', 'like', '%CET4%')
                    ->orWhere('grade_level', 'like', '%CET6%');
            });
        } elseif ($levelTag) {
            $query->where('level_tag', $levelTag);
        }

        $gradeLabels = $this->getGradeLabelsForUser($user);
        if (!empty($gradeLabels)) {
            $query->where(function ($q) use ($gradeLabels) {
                $q->whereNull('grade_level')
                    ->orWhere('grade_level', '');

                $q->orWhere(function ($inner) use ($gradeLabels) {
                    foreach ($gradeLabels as $label) {
                        $label = trim((string) $label);
                        if ($label === '') {
                            continue;
                        }
                        $inner->orWhere('grade_level', $label)
                            ->orWhere('grade_level', 'like', '%' . $label . '%');
                    }
                });
            });
        }

        $pool = $query->orderBy('lemma')->get();
        if ($pool->isNotEmpty()) {
            return $pool;
        }

        // 兜底1：年级过滤落空时（如低境界 L1/L2 映射到“一年级/二年级”，但小学英语词库从
        // 三年级起、无对应词），仅按学段（level_tag）取词，避免练功房“境界暂无题目”死路。
        if ($levelTag) {
            $byTag = VocabularyWord::query()->where('level_tag', $levelTag)->orderBy('lemma')->get();
            if ($byTag->isNotEmpty()) {
                return $byTag;
            }
        }

        // 兜底2：词库未标注 level_tag 时，返回全部词，保证练功房永不空转。
        return VocabularyWord::query()->orderBy('lemma')->get();
    }

    public function progressStorageKey(User $user, string $type): string
    {
        $realmCode = strtoupper((string) ($user->realm ?? 'L1'));
        $realmStage = max(1, min(9, (int) ($user->realm_stage ?? 1)));

        return "levelup_progress_{$user->id}_{$type}_{$realmCode}_{$realmStage}";
    }

    /** 练气七层（五年级）起解锁写作，与前端 HallView / PracticeView 一致 */
    public function isWritingUnlocked(User $user): bool
    {
        $realmCode = strtoupper((string) ($user->realm ?? 'L1'));
        $layer = max(1, min(9, (int) ($user->realm_stage ?? 1)));
        $prefix = strtoupper(substr($realmCode, 0, 1));

        if ($prefix === 'L') {
            return $layer >= 7;
        }

        return true;
    }

    public function getWritingPromptPool(User $user): Collection
    {
        if (!$this->isWritingUnlocked($user)) {
            return collect();
        }

        $realmCode = strtoupper((string) ($user->realm ?? 'L1'));
        $prefix = strtoupper(substr($realmCode, 0, 1));
        $realmStage = str_pad((string) max(1, min(9, (int) ($user->realm_stage ?? 1))), 2, '0', STR_PAD_LEFT);

        return WritingPrompt::query()
            ->where(function ($q) use ($realmCode, $prefix) {
                $q->where('realm', $realmCode)
                    ->orWhere('realm', 'like', $prefix . '%');
            })
            ->where('stage', $realmStage)
            ->orderBy('prompt_id')
            ->get();
    }

    /**
     * 当前境界突破门槛：六维目标 = 各模块题库总量；突破修为 = 全部答对一遍可获得的能量总和。
     *
     * @return array<string, int>
     */
    public function getBreakthroughRequirements(User $user): array
    {
        $requirements = [];
        $requiredEnergy = 0;
        $totalQuestions = 0;

        foreach (self::QUESTION_TYPE_TO_DIMENSION as $type => $dimension) {
            $count = $this->getQuestionPool($user, $type)->count();
            $requirements[$dimension] = $count;
            $totalQuestions += $count;
            $rate = (int) (RealmService::ENERGY_PER_CORRECT_BY_DIMENSION[$dimension] ?? RealmService::ENERGY_PER_CORRECT);
            $requiredEnergy += $count * $rate;
        }

        $writingCount = $this->getWritingPromptPool($user)->count();
        $requirements['writing'] = $writingCount;
        $totalQuestions += $writingCount;
        $writingRate = (int) (RealmService::ENERGY_PER_CORRECT_BY_DIMENSION['writing'] ?? 5);
        $requiredEnergy += $writingCount * $writingRate;

        $requirements['requiredEnergy'] = $requiredEnergy;
        $requirements['total_curriculum'] = $totalQuestions;

        return $requirements;
    }

    public function parseStageNo(mixed $stage): int
    {
        $value = trim((string) $stage);
        if ($value === '') {
            return 1;
        }
        if (ctype_digit($value)) {
            return max(1, (int) $value);
        }
        if (preg_match('/(\d+)/', $value, $m)) {
            return max(1, (int) $m[1]);
        }

        return 1;
    }

    private function fallbackRealmLabel(string $realmCode, int $realmStage): string
    {
        $prefix = strtoupper(substr($realmCode, 0, 1));
        $names = [
            'L' => '练气期',
            'Z' => '筑基期',
            'J' => '金丹期',
            'Y' => '元婴期',
            'H' => '化神期',
            'X' => '炼虚期',
            'T' => '合体期',
            'D' => '大乘期',
            'U' => '渡劫期',
        ];
        $layerCn = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
        $layer = $layerCn[max(0, min(8, $realmStage - 1))] ?? (string) $realmStage;

        return ($names[$prefix] ?? $realmCode) . ' · ' . $layer . '层';
    }

    private function realmMappedGradeLabels(string $realmCode, int $realmStage): array
    {
        $prefix = strtoupper(substr(trim($realmCode), 0, 1));
        $layer = max(1, min(9, $realmStage));

        $gradeKey = match ($prefix) {
            'L' => match (true) {
                $layer <= 2 => 'g1',
                $layer === 3 => 'g2',
                $layer <= 5 => 'g3',
                $layer === 6 => 'g4',
                $layer <= 8 => 'g5',
                default => 'g6',
            },
            'Z' => match (true) {
                $layer <= 3 => 'g7',
                $layer <= 6 => 'g8',
                default => 'g9',
            },
            'J' => match (true) {
                $layer <= 3 => 's1',
                $layer <= 6 => 's2',
                default => 's3',
            },
            'Y' => match (true) {
                $layer <= 2 => 'u1_cet4',
                $layer <= 4 => 'u2_cet4',
                $layer <= 7 => 'u3_cet6',
                default => 'u4_cet6',
            },
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

    private function getListeningPassageQuestionPool(User $user): Collection
    {
        $realmCode = $this->getRealmCode($user);
        $prefix = $this->getRealmPrefix($user);

        $passages = ListeningPassage::query()
            ->where(function ($q) use ($realmCode, $prefix) {
                $q->where('realm', $realmCode)
                    ->orWhere('realm', 'like', $prefix . '%');
            })
            ->with(['questions' => function ($q) {
                $q->orderBy('question_no');
            }])
            ->orderBy('passage_code')
            ->get();

        if ($passages->isEmpty()) {
            return collect();
        }

        $rows = collect();
        foreach ($passages as $passage) {
            $total = $passage->questions->count();
            foreach ($passage->questions as $question) {
                $rows->push([
                    'question_id' => 'LQ-' . (string) $question->id,
                    'type' => 'listening',
                    'realm' => $passage->realm,
                    'stage' => $passage->stage,
                    'passage_id' => 'LP-' . (string) $passage->id,
                    'question_no_in_passage' => (int) $question->question_no,
                    'passage_question_total' => max(1, $total),
                ]);
            }
        }

        return $rows;
    }

    private function isListeningPassageQuestionInPool(User $user, int $questionId): bool
    {
        $question = ListeningQuestion::query()->with('passage')->find($questionId);
        if (!$question || !$question->passage) {
            return false;
        }

        $realm = strtoupper((string) ($question->passage->realm ?? ''));
        $userRealm = $this->getRealmCode($user);
        $prefix = $this->getRealmPrefix($user);

        return $realm === $userRealm || str_starts_with($realm, $prefix);
    }
}
