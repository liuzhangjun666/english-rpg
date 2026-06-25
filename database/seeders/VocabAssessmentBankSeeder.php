<?php

namespace Database\Seeders;

use App\Models\Question;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class VocabAssessmentBankSeeder extends Seeder
{
    /** 每个测评等级、每种题型至少保留的可用题量（单场测试 25 题，留足余量） */
    private const MIN_PER_LEVEL = 30;

    /** 高中/大学重点等级需要更大题池，避免连对升阶后重复过快 */
    private const MIN_PER_LEVEL_SENIOR = 50;

    private const IMPORT_CAP_PER_LEVEL = 80;

    private const REALM_BY_LEVEL = [
        1 => 'L1',
        2 => 'L1',
        3 => 'L2',
        4 => 'L2',
        5 => 'L2',
        6 => 'L3',
        7 => 'L3',
    ];

    private const STAGE_BY_LEVEL = [
        1 => '02',
        2 => '05',
        3 => '02',
        4 => '05',
        5 => '08',
        6 => '02',
        7 => '05',
    ];

    public function run(): void
    {
        $backfilled = $this->backfillAssessmentFlags();
        $fromJson = $this->importSchoolVocabularyBanks();
        $created = $this->ensureMinimumPools();

        echo "VocabAssessmentBankSeeder: backfilled {$backfilled} questions, imported {$fromJson} from school word banks, created {$created} supplemental items.\n";
        $this->printInventory();
        $this->printSchoolStageReadiness();
    }

    private function backfillAssessmentFlags(): int
    {
        $updated = 0;

        Question::query()
            ->whereIn('type', ['vocab', 'vocabulary', 'grammar'])
            ->orderBy('id')
            ->chunkById(500, function ($rows) use (&$updated) {
                foreach ($rows as $question) {
                    $level = $this->resolveAssessmentLevel(
                        (string) $question->realm,
                        (string) $question->stage,
                        $question,
                    );
                    $include = \App\Support\AssessmentLevelResolver::shouldIncludeInAssessment(
                        (string) $question->type,
                        $question->question,
                    );
                    $question->assessment_level = $level;
                    $question->is_assessment = $include ? 1 : 0;
                    $question->expected_time = 5;
                    if (in_array((string) $question->type, ['vocabulary'], true)) {
                        $question->type = 'vocab';
                    }
                    $question->save();
                    $updated++;
                }
            });

        return $updated;
    }

    private function ensureMinimumPools(): int
    {
        $created = 0;

        foreach ([1, 2, 3, 4, 5, 6, 7] as $level) {
            $created += $this->topUpType('vocab', $level, $this->vocabTemplates($level));
            $created += $this->topUpType('grammar', $level, $this->grammarTemplates($level));
        }

        return $created;
    }

    private function topUpType(string $type, int $level, array $templates): int
    {
        $existing = Question::query()
            ->where('type', $type)
            ->where('is_assessment', 1)
            ->where('assessment_level', $level)
            ->count();

        $needed = max(0, $this->minimumForLevel($level) - $existing);
        if ($needed === 0) {
            return 0;
        }

        $prefix = $type === 'grammar' ? 'GA' : 'VA';
        $realm = self::REALM_BY_LEVEL[$level];
        $stage = self::STAGE_BY_LEVEL[$level];
        $created = 0;
        $templateCount = max(1, count($templates));

        for ($i = 0; $i < $needed; $i++) {
            $template = $templates[$i % $templateCount];
            $seq = str_pad((string) ($existing + $i + 1), 3, '0', STR_PAD_LEFT);
            $questionId = "{$prefix}-L{$level}-{$seq}";

            if (Question::query()->where('question_id', $questionId)->exists()) {
                continue;
            }

            Question::query()->create([
                'question_id' => $questionId,
                'type' => $type,
                'realm' => $realm,
                'stage' => $stage,
                'word' => (string) ($template['word'] ?? ''),
                'question' => (string) $template['question'],
                'options' => $template['options'],
                'correct_answer' => (string) $template['correct_answer'],
                'explanation' => (string) ($template['explanation'] ?? ''),
                'assessment_level' => $level,
                'is_assessment' => 1,
                'expected_time' => 5,
            ]);
            $created++;
        }

        return $created;
    }

    private function minimumForLevel(int $level): int
    {
        return $level >= 4 ? self::MIN_PER_LEVEL_SENIOR : self::MIN_PER_LEVEL;
    }

    private function importSchoolVocabularyBanks(): int
    {
        $created = 0;
        $files = [
            database_path('seeders/data/vocabulary_words_import_小学词汇（统一表）.json') => 'primary',
            database_path('seeders/data/vocabulary_words_import_初中词汇111.json') => 'junior',
            database_path('seeders/data/vocabulary_words_import_高中词汇最终版.json') => 'senior',
        ];

        foreach ($files as $path => $profile) {
            if (!File::exists($path)) {
                continue;
            }
            $created += $this->importVocabJsonFile($path, $profile);
        }

        $created += $this->importCollegeVocabFromSeniorBank(
            database_path('seeders/data/vocabulary_words_import_高中词汇最终版.json')
        );

        return $created;
    }

    private function importVocabJsonFile(string $path, string $profile): int
    {
        $payload = json_decode(File::get($path), true);
        if (!is_array($payload)) {
            return 0;
        }

        $poolByLevel = [];
        $rowsByLevel = [];
        foreach ($payload as $row) {
            if (!is_array($row)) {
                continue;
            }
            $lemma = trim((string) ($row['lemma'] ?? ''));
            $meaning = $this->primaryMeaning($row);
            if ($lemma === '' || $meaning === '') {
                continue;
            }

            foreach ($this->resolveImportLevels($row, $profile) as $level) {
                $rowsByLevel[$level][] = ['lemma' => $lemma, 'meaning' => $meaning, 'row' => $row];
                $poolByLevel[$level][] = $meaning;
            }
        }

        $created = 0;
        foreach ($rowsByLevel as $level => $rows) {
            $pool = array_values(array_unique($poolByLevel[$level] ?? []));
            if (empty($pool)) {
                continue;
            }

            $existing = Question::query()
                ->where('type', 'vocab')
                ->where('is_assessment', 1)
                ->where('assessment_level', $level)
                ->count();

            $remaining = max(0, self::IMPORT_CAP_PER_LEVEL - max(0, $existing - $this->minimumForLevel($level)));
            if ($remaining === 0) {
                continue;
            }

            $seq = 0;
            foreach ($rows as $item) {
                if ($seq >= $remaining) {
                    break;
                }

                $lemma = $item['lemma'];
                $meaning = $item['meaning'];
                $slug = $this->slugLemma($lemma);
                $questionId = match ($profile) {
                    'primary' => "VAP-L{$level}-{$slug}",
                    'junior' => "VAJ-L{$level}-{$slug}",
                    default => "VAH-L{$level}-{$slug}",
                };

                if (Question::query()->where('question_id', $questionId)->exists()) {
                    continue;
                }

                $built = $this->buildMeaningOptions($meaning, $pool);
                if ($built === null) {
                    continue;
                }

                Question::query()->create([
                    'question_id' => $questionId,
                    'type' => 'vocab',
                    'realm' => self::REALM_BY_LEVEL[$level],
                    'stage' => self::STAGE_BY_LEVEL[$level],
                    'word' => $lemma,
                    'grade_level' => (string) ($item['row']['grade_level'] ?? ''),
                    'question' => '"' . $lemma . '" 的中文意思是？',
                    'options' => $built['options'],
                    'correct_answer' => $built['answer_key'],
                    'explanation' => $lemma . ' = ' . $meaning,
                    'assessment_level' => $level,
                    'is_assessment' => 1,
                    'expected_time' => 5,
                ]);

                $seq++;
                $created++;
            }
        }

        return $created;
    }

    private function importCollegeVocabFromSeniorBank(string $path): int
    {
        if (!File::exists($path)) {
            return 0;
        }

        $payload = json_decode(File::get($path), true);
        if (!is_array($payload)) {
            return 0;
        }

        $candidates = [];
        $pool = [];
        foreach ($payload as $row) {
            if (!is_array($row)) {
                continue;
            }
            $lemma = trim((string) ($row['lemma'] ?? ''));
            $meaning = $this->primaryMeaning($row);
            $grade = (string) ($row['grade_level'] ?? '');
            if ($lemma === '' || $meaning === '') {
                continue;
            }
            if (!str_contains($grade, '高三') && mb_strlen($lemma) < 10) {
                continue;
            }
            $candidates[] = ['lemma' => $lemma, 'meaning' => $meaning, 'row' => $row];
            $pool[] = $meaning;
        }

        $pool = array_values(array_unique($pool));
        if (empty($candidates) || count($pool) < 4) {
            return 0;
        }

        $created = 0;
        foreach ([5, 6] as $level) {
            $existing = Question::query()
                ->where('type', 'vocab')
                ->where('is_assessment', 1)
                ->where('assessment_level', $level)
                ->count();
            $remaining = max(0, self::IMPORT_CAP_PER_LEVEL - max(0, $existing - $this->minimumForLevel($level)));
            $seq = 0;

            foreach ($candidates as $item) {
                if ($seq >= $remaining) {
                    break;
                }
                $lemma = $item['lemma'];
                $meaning = $item['meaning'];
                $questionId = 'VAC-L' . $level . '-' . $this->slugLemma($lemma);
                if (Question::query()->where('question_id', $questionId)->exists()) {
                    continue;
                }

                $built = $this->buildMeaningOptions($meaning, $pool);
                if ($built === null) {
                    continue;
                }

                Question::query()->create([
                    'question_id' => $questionId,
                    'type' => 'vocab',
                    'realm' => self::REALM_BY_LEVEL[$level],
                    'stage' => self::STAGE_BY_LEVEL[$level],
                    'word' => $lemma,
                    'grade_level' => (string) ($item['row']['grade_level'] ?? '大学'),
                    'question' => '"' . $lemma . '" 的中文意思是？',
                    'options' => $built['options'],
                    'correct_answer' => $built['answer_key'],
                    'explanation' => $lemma . ' = ' . $meaning,
                    'assessment_level' => $level,
                    'is_assessment' => 1,
                    'expected_time' => 5,
                ]);
                $seq++;
                $created++;
            }
        }

        return $created;
    }

    /** @return int[] */
    private function resolveImportLevels(array $row, string $profile): array
    {
        $grade = (string) ($row['grade_level'] ?? '');

        if ($profile === 'primary') {
            if (preg_match('/三年级|四年级/u', $grade)) {
                return [1];
            }
            return [2];
        }

        if ($profile === 'junior') {
            return [3];
        }

        if (preg_match('/高一|高二/u', $grade)) {
            return [4];
        }
        if (str_contains($grade, '高三')) {
            return [5];
        }

        return [4];
    }

    private function primaryMeaning(array $row): string
    {
        $meanings = $row['meanings'] ?? [];
        if (!is_array($meanings) || empty($meanings)) {
            return '';
        }
        $first = trim((string) $meanings[0]);
        if ($first === '') {
            return '';
        }

        return explode('/', $first)[0];
    }

    private function buildMeaningOptions(string $correct, array $pool): ?array
    {
        $distractors = [];
        $shuffled = $pool;
        shuffle($shuffled);
        foreach ($shuffled as $item) {
            $text = trim((string) $item);
            if ($text === '' || $text === $correct) {
                continue;
            }
            $distractors[$text] = true;
            if (count($distractors) >= 3) {
                break;
            }
        }
        if (count($distractors) < 3) {
            return null;
        }

        $choices = array_merge([$correct], array_keys($distractors));
        shuffle($choices);
        $keys = ['A', 'B', 'C', 'D'];
        $options = [];
        $answerKey = 'A';
        foreach ($keys as $index => $key) {
            $text = $choices[$index] ?? '';
            if ($text === '') {
                return null;
            }
            $options[$key] = $text;
            if ($text === $correct) {
                $answerKey = $key;
            }
        }

        return ['options' => $options, 'answer_key' => $answerKey];
    }

    private function slugLemma(string $lemma): string
    {
        $slug = strtolower(preg_replace('/[^a-z0-9]+/i', '-', $lemma) ?? '');
        $slug = trim($slug, '-');
        if ($slug === '') {
            $slug = substr(md5($lemma), 0, 10);
        }

        return substr($slug, 0, 40);
    }

    private function printSchoolStageReadiness(): void
    {
        $stages = [
            '小学' => [1, 2],
            '初中' => [1, 2, 3],
            '高中' => [1, 2, 3, 4],
            '大学' => [1, 2, 3, 4, 5, 6],
            '研究生' => [1, 2, 3, 4, 5, 6, 7],
        ];

        echo "School-stage readiness (vocab+grammar pool):\n";
        foreach ($stages as $label => $levels) {
            $vocab = Question::query()
                ->where('type', 'vocab')
                ->where('is_assessment', 1)
                ->whereIn('assessment_level', $levels)
                ->count();
            $grammar = Question::query()
                ->where('type', 'grammar')
                ->where('is_assessment', 1)
                ->whereIn('assessment_level', $levels)
                ->count();
            echo "  {$label}: vocab={$vocab}, grammar={$grammar}\n";
        }
    }

    private function resolveAssessmentLevel(string $realm, string $stage, ?Question $question = null): int
    {
        if ($question) {
            return \App\Support\AssessmentLevelResolver::resolveFromParts(
                $question->grade_level,
                $question->explanation,
                $question->question,
                $realm,
                $stage,
                $question->question_id,
            );
        }

        return \App\Support\AssessmentLevelResolver::resolveFromGameRealmStage($realm, $stage);
    }

    private function vocabTemplates(int $level): array
    {
        $banks = [
            1 => [
                ['word' => 'apple', 'question' => '"apple" 的中文意思是？', 'options' => ['A' => '苹果', 'B' => '香蕉', 'C' => '梨', 'D' => '桃'], 'correct_answer' => 'A', 'explanation' => 'apple = 苹果'],
                ['word' => 'book', 'question' => '"book" 的中文意思是？', 'options' => ['A' => '笔', 'B' => '书', 'C' => '纸', 'D' => '桌'], 'correct_answer' => 'B', 'explanation' => 'book = 书'],
                ['word' => 'cat', 'question' => '"cat" 的中文意思是？', 'options' => ['A' => '狗', 'B' => '鸟', 'C' => '猫', 'D' => '鱼'], 'correct_answer' => 'C', 'explanation' => 'cat = 猫'],
                ['word' => 'dog', 'question' => '"dog" 的中文意思是？', 'options' => ['A' => '猫', 'B' => '狗', 'C' => '兔', 'D' => '鼠'], 'correct_answer' => 'B', 'explanation' => 'dog = 狗'],
                ['word' => 'water', 'question' => '"water" 的中文意思是？', 'options' => ['A' => '火', 'B' => '水', 'C' => '土', 'D' => '风'], 'correct_answer' => 'B', 'explanation' => 'water = 水'],
            ],
            2 => [
                ['word' => 'family', 'question' => '"family" 的中文意思是？', 'options' => ['A' => '朋友', 'B' => '家庭', 'C' => '学校', 'D' => '工作'], 'correct_answer' => 'B', 'explanation' => 'family = 家庭'],
                ['word' => 'weather', 'question' => '"weather" 的中文意思是？', 'options' => ['A' => '气候', 'B' => '天气', 'C' => '季节', 'D' => '温度'], 'correct_answer' => 'B', 'explanation' => 'weather = 天气'],
                ['word' => 'hospital', 'question' => '"hospital" 的中文意思是？', 'options' => ['A' => '学校', 'B' => '医院', 'C' => '银行', 'D' => '邮局'], 'correct_answer' => 'B', 'explanation' => 'hospital = 医院'],
                ['word' => 'library', 'question' => '"library" 的中文意思是？', 'options' => ['A' => '教室', 'B' => '图书馆', 'C' => '办公室', 'D' => '实验室'], 'correct_answer' => 'B', 'explanation' => 'library = 图书馆'],
                ['word' => 'beautiful', 'question' => '"beautiful" 的中文意思是？', 'options' => ['A' => '丑陋的', 'B' => '美丽的', 'C' => '高大的', 'D' => '弱小的'], 'correct_answer' => 'B', 'explanation' => 'beautiful = 美丽的'],
            ],
            3 => [
                ['word' => 'environment', 'question' => '"environment" 的中文意思是？', 'options' => ['A' => '环境', 'B' => '经验', 'C' => '娱乐', 'D' => '设备'], 'correct_answer' => 'A', 'explanation' => 'environment = 环境'],
                ['word' => 'experience', 'question' => '"experience" 在此句中表示？ I have rich experience.', 'options' => ['A' => '实验', 'B' => '经验', 'C' => '表达', 'D' => '解释'], 'correct_answer' => 'B', 'explanation' => 'experience = 经验'],
                ['word' => 'improve', 'question' => '"improve" 的中文意思是？', 'options' => ['A' => '提高', 'B' => '证明', 'C' => '打印', 'D' => '保护'], 'correct_answer' => 'A', 'explanation' => 'improve = 提高、改善'],
                ['word' => 'protect', 'question' => '"protect" 的中文意思是？', 'options' => ['A' => '预测', 'B' => '保护', 'C' => '准备', 'D' => '呈现'], 'correct_answer' => 'B', 'explanation' => 'protect = 保护'],
                ['word' => 'communicate', 'question' => '"communicate" 的中文意思是？', 'options' => ['A' => '交流', 'B' => '计算', 'C' => '比较', 'D' => '完成'], 'correct_answer' => 'A', 'explanation' => 'communicate = 交流'],
            ],
            4 => [
                ['word' => 'achieve', 'question' => '"achieve" 的中文意思是？', 'options' => ['A' => '达到', 'B' => '同意', 'C' => '允许', 'D' => '吸引'], 'correct_answer' => 'A', 'explanation' => 'achieve = 达到、实现'],
                ['word' => 'challenge', 'question' => '"challenge" 作名词时意思是？', 'options' => ['A' => '挑战', 'B' => '改变', 'C' => '选择', 'D' => '机会'], 'correct_answer' => 'A', 'explanation' => 'challenge = 挑战'],
                ['word' => 'influence', 'question' => '"influence" 的中文意思是？', 'options' => ['A' => '影响', 'B' => '信息', 'C' => '邀请', 'D' => '发明'], 'correct_answer' => 'A', 'explanation' => 'influence = 影响'],
                ['word' => 'opportunity', 'question' => '"opportunity" 的中文意思是？', 'options' => ['A' => '操作', 'B' => '机会', 'C' => '意见', 'D' => '组织'], 'correct_answer' => 'B', 'explanation' => 'opportunity = 机会'],
                ['word' => 'responsible', 'question' => '"responsible" 的中文意思是？', 'options' => ['A' => '负责的', 'B' => '可能的', 'C' => '明显的', 'D' => '紧张的'], 'correct_answer' => 'A', 'explanation' => 'responsible = 负责的'],
            ],
            5 => [
                ['word' => 'appreciate', 'question' => '"appreciate" 的中文意思是？', 'options' => ['A' => '欣赏', 'B' => '申请', 'C' => '出现', 'D' => '同意'], 'correct_answer' => 'A', 'explanation' => 'appreciate = 欣赏、感激'],
                ['word' => 'consequence', 'question' => '"consequence" 的中文意思是？', 'options' => ['A' => '结果', 'B' => '会议', 'C' => '信心', 'D' => '内容'], 'correct_answer' => 'A', 'explanation' => 'consequence = 结果'],
                ['word' => 'efficient', 'question' => '"efficient" 的中文意思是？', 'options' => ['A' => '有效的', 'B' => '足够的', 'C' => '兴奋的', 'D' => '昂贵的'], 'correct_answer' => 'A', 'explanation' => 'efficient = 高效的'],
                ['word' => 'maintain', 'question' => '"maintain" 的中文意思是？', 'options' => ['A' => '维持', 'B' => '提及', 'C' => '测量', 'D' => '记忆'], 'correct_answer' => 'A', 'explanation' => 'maintain = 维持'],
                ['word' => 'significant', 'question' => '"significant" 的中文意思是？', 'options' => ['A' => '重要的', 'B' => '相似的', 'C' => '简单的', 'D' => '严肃的'], 'correct_answer' => 'A', 'explanation' => 'significant = 重要的'],
            ],
            6 => [
                ['word' => 'comprehensive', 'question' => '"comprehensive" 的中文意思是？', 'options' => ['A' => '全面的', 'B' => '复杂的', 'C' => '压缩的', 'D' => '竞争的'], 'correct_answer' => 'A', 'explanation' => 'comprehensive = 全面的'],
                ['word' => 'hypothesis', 'question' => '"hypothesis" 的中文意思是？', 'options' => ['A' => '假设', 'B' => '历史', 'C' => '医院', 'D' => '习惯'], 'correct_answer' => 'A', 'explanation' => 'hypothesis = 假设'],
                ['word' => 'phenomenon', 'question' => '"phenomenon" 的中文意思是？', 'options' => ['A' => '现象', 'B' => '哲学', 'C' => '照片', 'D' => '短语'], 'correct_answer' => 'A', 'explanation' => 'phenomenon = 现象'],
                ['word' => 'sustainable', 'question' => '"sustainable" 的中文意思是？', 'options' => ['A' => '可持续的', 'B' => '可接受的', 'C' => '可获得的', 'D' => '可比较的'], 'correct_answer' => 'A', 'explanation' => 'sustainable = 可持续的'],
                ['word' => 'inevitable', 'question' => '"inevitable" 的中文意思是？', 'options' => ['A' => '不可避免的', 'B' => '不可信的', 'C' => '不可用的', 'D' => '不可爱的'], 'correct_answer' => 'A', 'explanation' => 'inevitable = 不可避免的'],
            ],
            7 => [
                ['word' => 'paradigm', 'question' => '"paradigm" 的中文意思是？', 'options' => ['A' => '范式', 'B' => '天堂', 'C' => '段落', 'D' => '平行'], 'correct_answer' => 'A', 'explanation' => 'paradigm = 范式'],
                ['word' => 'empirical', 'question' => '"empirical" 的中文意思是？', 'options' => ['A' => '经验的', 'B' => '帝国的', 'C' => '强调的', 'D' => '空的'], 'correct_answer' => 'A', 'explanation' => 'empirical = 经验的、实证的'],
                ['word' => 'methodology', 'question' => '"methodology" 的中文意思是？', 'options' => ['A' => '方法论', 'B' => '金属', 'C' => '记忆', 'D' => '方法'], 'correct_answer' => 'A', 'explanation' => 'methodology = 方法论'],
                ['word' => 'substantiate', 'question' => '"substantiate" 的中文意思是？', 'options' => ['A' => '证实', 'B' => '替代', 'C' => '订阅', 'D' => '提交'], 'correct_answer' => 'A', 'explanation' => 'substantiate = 证实'],
                ['word' => 'correlation', 'question' => '"correlation" 的中文意思是？', 'options' => ['A' => '相关性', 'B' => '合作', 'C' => '修正', 'D' => '公司'], 'correct_answer' => 'A', 'explanation' => 'correlation = 相关性'],
            ],
        ];

        return $banks[$level] ?? $banks[1];
    }

    private function grammarTemplates(int $level): array
    {
        $banks = [
            1 => [
                ['word' => 'be', 'question' => 'I ___ a student.', 'options' => ['A' => 'is', 'B' => 'am', 'C' => 'are', 'D' => 'be'], 'correct_answer' => 'B', 'explanation' => 'I 后用 am'],
                ['word' => 'be', 'question' => 'She ___ a teacher.', 'options' => ['A' => 'am', 'B' => 'are', 'C' => 'is', 'D' => 'be'], 'correct_answer' => 'C', 'explanation' => 'She 后用 is'],
                ['word' => 'a/an', 'question' => 'I have ___ apple.', 'options' => ['A' => 'a', 'B' => 'an', 'C' => 'the', 'D' => '/'], 'correct_answer' => 'B', 'explanation' => 'apple 以元音音素开头用 an'],
                ['word' => 'plural', 'question' => '"box" 的复数形式是？', 'options' => ['A' => 'boxs', 'B' => 'boxes', 'C' => 'boxies', 'D' => 'box'], 'correct_answer' => 'B', 'explanation' => '以 x 结尾加 es'],
                ['word' => 'word order', 'question' => '正确的句子是？', 'options' => ['A' => 'like I apples', 'B' => 'I apples like', 'C' => 'I like apples', 'D' => 'apples I like'], 'correct_answer' => 'C', 'explanation' => '主语 + 谓语 + 宾语'],
            ],
            2 => [
                ['word' => 'do/does', 'question' => '____ you like apples?', 'options' => ['A' => 'Do', 'B' => 'Does', 'C' => 'Is', 'D' => 'Are'], 'correct_answer' => 'A', 'explanation' => 'you 前用 Do'],
                ['word' => 'do/does', 'question' => '____ he play football?', 'options' => ['A' => 'Do', 'B' => 'Does', 'C' => 'Is', 'D' => 'Are'], 'correct_answer' => 'B', 'explanation' => 'he 后用 Does'],
                ['word' => 'present tense', 'question' => 'He ____ (go) to school every day.', 'options' => ['A' => 'go', 'B' => 'goes', 'C' => 'going', 'D' => 'went'], 'correct_answer' => 'B', 'explanation' => '第三人称单数加 s'],
                ['word' => 'preposition', 'question' => 'The book is ____ the table.', 'options' => ['A' => 'in', 'B' => 'on', 'C' => 'at', 'D' => 'to'], 'correct_answer' => 'B', 'explanation' => '在桌面上用 on'],
                ['word' => 'conjunction', 'question' => 'I like apples ____ bananas.', 'options' => ['A' => 'but', 'B' => 'and', 'C' => 'or', 'D' => 'so'], 'correct_answer' => 'B', 'explanation' => '并列用 and'],
            ],
            3 => [
                ['word' => 'past tense', 'question' => 'He ____ to the park yesterday.', 'options' => ['A' => 'go', 'B' => 'goes', 'C' => 'went', 'D' => 'going'], 'correct_answer' => 'C', 'explanation' => 'yesterday 用过去式 went'],
                ['word' => 'comparative', 'question' => 'Tom is ____ than Jim.', 'options' => ['A' => 'tall', 'B' => 'taller', 'C' => 'tallest', 'D' => 'more tall'], 'correct_answer' => 'B', 'explanation' => 'than 前用比较级 taller'],
                ['word' => 'passive', 'question' => 'The book ____ by Tom.', 'options' => ['A' => 'write', 'B' => 'writes', 'C' => 'is written', 'D' => 'wrote'], 'correct_answer' => 'C', 'explanation' => '被动语态 is written'],
                ['word' => 'infinitive', 'question' => 'I want ____ English.', 'options' => ['A' => 'learn', 'B' => 'learning', 'C' => 'to learn', 'D' => 'learned'], 'correct_answer' => 'C', 'explanation' => 'want to do'],
                ['word' => 'question tag', 'question' => 'She is a student, ____?', 'options' => ['A' => 'is she', 'B' => "isn't she", 'C' => 'does she', 'D' => "doesn't she"], 'correct_answer' => 'B', 'explanation' => '肯定陈述句反意疑问用否定'],
            ],
            4 => [
                ['word' => 'present perfect', 'question' => 'I ____ finished my homework.', 'options' => ['A' => 'have', 'B' => 'has', 'C' => 'had', 'D' => 'having'], 'correct_answer' => 'A', 'explanation' => 'I have finished'],
                ['word' => 'relative clause', 'question' => 'The boy ____ is reading is my brother.', 'options' => ['A' => 'who', 'B' => 'which', 'C' => 'whom', 'D' => 'whose'], 'correct_answer' => 'A', 'explanation' => '指人用 who'],
                ['word' => 'conditional', 'question' => 'If it rains, I ____ at home.', 'options' => ['A' => 'stay', 'B' => 'stayed', 'C' => 'will stay', 'D' => 'staying'], 'correct_answer' => 'C', 'explanation' => '真实条件句主句用 will'],
                ['word' => 'gerund', 'question' => '____ is good for health.', 'options' => ['A' => 'Swim', 'B' => 'Swimming', 'C' => 'Swam', 'D' => 'To swimming'], 'correct_answer' => 'B', 'explanation' => '动名词作主语'],
                ['word' => 'adverb clause', 'question' => 'He left ____ he finished the work.', 'options' => ['A' => 'after', 'B' => 'before', 'C' => 'because', 'D' => 'although'], 'correct_answer' => 'A', 'explanation' => 'after 表示之后'],
            ],
            5 => [
                ['word' => 'subjunctive', 'question' => 'I wish I ____ taller.', 'options' => ['A' => 'am', 'B' => 'was', 'C' => 'were', 'D' => 'be'], 'correct_answer' => 'C', 'explanation' => 'wish 后用虚拟语气 were'],
                ['word' => 'inversion', 'question' => 'Never ____ such a beautiful place.', 'options' => ['A' => 'I have seen', 'B' => 'have I seen', 'C' => 'I saw', 'D' => 'did I saw'], 'correct_answer' => 'B', 'explanation' => '否定词放句首部分倒装'],
                ['word' => 'non-finite', 'question' => '____ from the hill, the city looks beautiful.', 'options' => ['A' => 'See', 'B' => 'Seeing', 'C' => 'Seen', 'D' => 'To see'], 'correct_answer' => 'C', 'explanation' => '过去分词作状语'],
                ['word' => 'modal perfect', 'question' => 'He ____ have missed the train.', 'options' => ['A' => 'must', 'B' => 'can', 'C' => 'may', 'D' => 'will'], 'correct_answer' => 'A', 'explanation' => 'must have done 表肯定推测'],
                ['word' => 'emphasis', 'question' => 'It was Tom ____ broke the window.', 'options' => ['A' => 'who', 'B' => 'which', 'C' => 'whom', 'D' => 'that'], 'correct_answer' => 'D', 'explanation' => '强调句型 It was ... that'],
            ],
            6 => [
                ['word' => 'complex sentence', 'question' => '____ he was tired, he kept working.', 'options' => ['A' => 'Although', 'B' => 'Because', 'C' => 'If', 'D' => 'Unless'], 'correct_answer' => 'A', 'explanation' => 'although 表让步'],
                ['word' => 'participle', 'question' => 'The man ____ in the corner is my uncle.', 'options' => ['A' => 'sit', 'B' => 'sitting', 'C' => 'sat', 'D' => 'sits'], 'correct_answer' => 'B', 'explanation' => '现在分词作定语'],
                ['word' => 'parallel', 'question' => 'She likes singing, dancing and ____.', 'options' => ['A' => 'to draw', 'B' => 'draw', 'C' => 'drawing', 'D' => 'drew'], 'correct_answer' => 'C', 'explanation' => '并列结构用 drawing'],
                ['word' => 'ellipsis', 'question' => '—Would you like some tea? —Yes, I ____.', 'options' => ['A' => 'would', 'B' => 'would like', 'C' => 'like', 'D' => 'do'], 'correct_answer' => 'A', 'explanation' => '省略 like some tea'],
                ['word' => 'formal subject', 'question' => '____ is important to read every day.', 'options' => ['A' => 'That', 'B' => 'This', 'C' => 'It', 'D' => 'There'], 'correct_answer' => 'C', 'explanation' => 'It is important to...'],
            ],
            7 => [
                ['word' => 'academic style', 'question' => 'The data ____ that the method is effective.', 'options' => ['A' => 'suggest', 'B' => 'suggests', 'C' => 'suggesting', 'D' => 'suggested'], 'correct_answer' => 'A', 'explanation' => 'data 复数概念常用 suggest'],
                ['word' => 'nominalization', 'question' => 'The ____ of the project took two years.', 'options' => ['A' => 'complete', 'B' => 'completed', 'C' => 'completion', 'D' => 'completing'], 'correct_answer' => 'C', 'explanation' => '名词 completion'],
                ['word' => 'concession', 'question' => '____ difficult the task is, we must finish it.', 'options' => ['A' => 'However', 'B' => 'Whatever', 'C' => 'Whichever', 'D' => 'Wherever'], 'correct_answer' => 'A', 'explanation' => 'However + adj. 表让步'],
                ['word' => 'subordinate', 'question' => 'This is the reason ____ he was late.', 'options' => ['A' => 'why', 'B' => 'which', 'C' => 'that', 'D' => 'what'], 'correct_answer' => 'A', 'explanation' => 'reason 后用 why'],
                ['word' => 'advanced passive', 'question' => 'The problem is believed ____ solved.', 'options' => ['A' => 'to be', 'B' => 'being', 'C' => 'be', 'D' => 'been'], 'correct_answer' => 'A', 'explanation' => 'be believed to be done'],
            ],
        ];

        return $banks[$level] ?? $banks[1];
    }

    private function printInventory(): void
    {
        $rows = DB::table('levelup_questions')
            ->select('type', 'assessment_level', DB::raw('COUNT(*) as total'))
            ->where('is_assessment', 1)
            ->whereIn('type', ['vocab', 'grammar'])
            ->groupBy('type', 'assessment_level')
            ->orderBy('type')
            ->orderBy('assessment_level')
            ->get();

        foreach ($rows as $row) {
            echo "  {$row->type} L{$row->assessment_level}: {$row->total}\n";
        }
    }
}
