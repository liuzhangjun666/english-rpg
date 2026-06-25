<?php

namespace Database\Seeders;

use App\Models\ReadingPassage;
use App\Models\ReadingQuestion;
use App\Support\ReadingQuestionNormalizer;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

/**
 * 阅读题库：小学用真题导入，初中/高中/大学/研究生用生成器。
 */
class ReadingBankSeeder extends Seeder
{
    private const QUESTIONS_PER_PASSAGE = 3;

    /** @var list<string> */
    private const REALM_ORDER = ['L1', 'L2', 'L3', 'Z1', 'J1', 'Y1', 'H1'];

    public function run(): void
    {
        require_once database_path('scripts/JuniorReadingGenerator.php');
        require_once database_path('scripts/SeniorReadingGenerator.php');
        require_once database_path('scripts/UniversityReadingGenerator.php');

        $normalizer = new ReadingQuestionNormalizer();
        $importPassages = $this->loadImportPassages();
        $plan = $this->buildRealmPlan($importPassages);

        $passageCount = 0;
        $questionCount = 0;

        foreach (self::REALM_ORDER as $realm) {
            $entries = $plan[$realm] ?? [];
            foreach ($entries as $entry) {
                [$passageCount, $questionCount] = $this->seedPassage(
                    $normalizer,
                    $entry,
                    $passageCount,
                    $questionCount,
                );
            }
        }

        echo "Seeded reading bank: {$passageCount} passages, {$questionCount} questions.\n";
    }

    /**
     * @param  list<array<string, mixed>>  $importPassages
     * @return array<string, list<array<string, mixed>>>
     */
    private function buildRealmPlan(array $importPassages): array
    {
        return [
            'L1' => $this->sliceImport($importPassages, 0, 'L1', '小学', '一年级'),
            'L2' => $this->sliceImport($importPassages, 9, 'L2', '小学', '三年级'),
            'L3' => $this->sliceImport($importPassages, 18, 'L3', '小学', '六年级'),
            'Z1' => $this->tagPassages((new \JuniorReadingGenerator())->generate(), 'junior_reading_generator'),
            'J1' => $this->tagPassages((new \SeniorReadingGenerator())->generate(), 'senior_reading_generator'),
            'Y1' => $this->tagPassages((new \UniversityReadingGenerator())->forRealm('Y1'), 'university_reading_generator'),
            'H1' => $this->tagPassages((new \UniversityReadingGenerator())->forRealm('H1'), 'graduate_reading_generator'),
        ];
    }

    /**
     * @param  array<string, mixed>  $entry
     * @return array{0:int,1:int}
     */
    private function seedPassage(
        ReadingQuestionNormalizer $normalizer,
        array $entry,
        int $passageCount,
        int $questionCount,
    ): array {
        $stage = str_pad((string) $entry['stage'], 2, '0', STR_PAD_LEFT);
        $realmCode = strtoupper((string) $entry['realm']);

        $passage = ReadingPassage::updateOrCreate(
            [
                'realm' => $realmCode,
                'stage' => $stage,
                'passage_code' => "RP-{$realmCode}-{$stage}",
            ],
            [
                'level_tag' => (string) ($entry['level_tag'] ?? ''),
                'grade_level' => (string) ($entry['grade_level'] ?? ''),
                'title' => $entry['title'] ?? $this->fallbackTitle((string) ($entry['content'] ?? '')),
                'content' => (string) ($entry['content'] ?? ''),
                'meta' => [
                    'seeded' => true,
                    'source' => $entry['source'] ?? 'import',
                ],
            ]
        );

        ReadingQuestion::query()->where('passage_id', $passage->id)->delete();

        $questions = array_slice($entry['questions'] ?? [], 0, self::QUESTIONS_PER_PASSAGE);
        foreach ($questions as $idx => $rawQuestion) {
            $normalized = $normalizer->normalize($rawQuestion);
            if ($normalized['question'] === '' || count($normalized['options']) < 2) {
                continue;
            }

            ReadingQuestion::create([
                'passage_id' => $passage->id,
                'question_no' => $idx + 1,
                'question_type' => $normalized['question_type'],
                'question' => $normalized['question'],
                'options' => $normalized['options'],
                'correct_answer' => $normalized['correct_answer'],
                'explanation' => $normalized['explanation'],
            ]);
            $questionCount++;
        }

        return [$passageCount + 1, $questionCount];
    }

    /** @return list<array<string, mixed>> */
    private function loadImportPassages(): array
    {
        $path = database_path('seeders/data/reading_grade6_import.json');
        if (!File::exists($path)) {
            return [];
        }

        $payload = json_decode(File::get($path), true);
        if (!is_array($payload)) {
            return [];
        }

        $passages = $payload['passages'] ?? [];
        if (!is_array($passages)) {
            return [];
        }

        usort($passages, function (array $a, array $b): int {
            return $this->wordCount((string) ($a['content'] ?? '')) <=> $this->wordCount((string) ($b['content'] ?? ''));
        });

        return array_values($passages);
    }

    /**
     * @param  list<array<string, mixed>>  $importPassages
     * @return list<array<string, mixed>>
     */
    private function sliceImport(
        array $importPassages,
        int $offset,
        string $realm,
        string $levelTag,
        string $baseGrade,
    ): array {
        $entries = [];
        $total = max(1, count($importPassages));

        for ($stageNo = 1; $stageNo <= 9; $stageNo++) {
            $source = $importPassages[$offset + $stageNo - 1]
                ?? $importPassages[($offset + $stageNo - 1) % $total]
                ?? ['content' => 'Reading practice passage.', 'questions' => []];

            $entries[] = [
                'realm' => $realm,
                'stage' => $stageNo,
                'level_tag' => $levelTag,
                'grade_level' => $this->gradeLabel($baseGrade, $stageNo),
                'title' => $source['title'] ?? null,
                'content' => (string) ($source['content'] ?? ''),
                'questions' => is_array($source['questions'] ?? null) ? $source['questions'] : [],
                'source' => 'reading_grade6_import.json',
            ];
        }

        return $entries;
    }

    /**
     * @param  list<array<string, mixed>>  $passages
     * @return list<array<string, mixed>>
     */
    private function tagPassages(array $passages, string $source): array
    {
        return array_map(function (array $passage) use ($source) {
            $passage['source'] = $source;

            return $passage;
        }, $passages);
    }

    private function gradeLabel(string $baseGrade, int $stageNo): string
    {
        $ladder = match ($baseGrade) {
            '一年级' => ['一年级', '一年级', '二年级', '二年级', '三年级', '三年级', '四年级', '四年级', '五年级'],
            '三年级' => ['三年级', '三年级', '四年级', '四年级', '五年级', '五年级', '六年级', '六年级', '六年级'],
            '六年级' => ['四年级', '五年级', '五年级', '六年级', '六年级', '六年级', '六年级', '六年级', '六年级'],
            default => array_fill(0, 9, $baseGrade),
        };

        return $ladder[$stageNo - 1] ?? $baseGrade;
    }

    private function fallbackTitle(string $content): string
    {
        $snippet = trim(preg_replace('/\s+/', ' ', $content) ?? '');
        if ($snippet === '') {
            return '阅读短文';
        }

        return mb_substr($snippet, 0, 24) . (mb_strlen($snippet) > 24 ? '…' : '');
    }

    private function wordCount(string $content): int
    {
        $content = trim($content);
        if ($content === '') {
            return 0;
        }

        return count(preg_split('/\s+/u', $content, -1, PREG_SPLIT_NO_EMPTY) ?: []);
    }
}
