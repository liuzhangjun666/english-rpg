<?php

namespace Database\Seeders;

use App\Models\VocabularyWord;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

class VocabularyWordsSeeder extends Seeder
{
    public function run(): void
    {
        $files = [
            database_path('seeders/data/vocabulary_words_import_小学词汇（统一表）.json'),
            database_path('seeders/data/vocabulary_words_import_初中词汇111.json'),
            database_path('seeders/data/vocabulary_words_import_高中词汇最终版.json'),
        ];

        $imported = 0;
        foreach ($files as $file) {
            if (!File::exists($file)) {
                continue;
            }
            $imported += $this->importFile($file);
        }

        if ($imported === 0) {
            $imported += $this->seedFallbackWords();
        }

        echo "Vocabulary words ready: {$imported} rows processed.\n";
    }

    private function importFile(string $filePath): int
    {
        $payload = json_decode(File::get($filePath), true);
        if (!is_array($payload)) {
            return 0;
        }

        $count = 0;
        foreach ($payload as $row) {
            if (!is_array($row)) {
                continue;
            }
            $lemma = trim((string) ($row['lemma'] ?? ''));
            if ($lemma === '') {
                continue;
            }

            VocabularyWord::updateOrCreate(
                ['lemma' => $lemma],
                [
                    'phonetic' => $row['phonetic'] ?? null,
                    'pos' => $row['pos'] ?? null,
                    'grade_level' => $row['grade_level'] ?? null,
                    'level_tag' => $row['level_tag'] ?? $this->inferLevelTag($row['grade_level'] ?? null),
                    'meanings' => $this->normalizeList($row['meanings'] ?? null),
                    'examples' => $this->normalizeList($row['examples'] ?? null),
                ]
            );
            $count++;
        }

        return $count;
    }

    private function seedFallbackWords(): int
    {
        $fallback = [
            ['lemma' => 'apple', 'meanings' => ['苹果'], 'grade_level' => '一年级', 'level_tag' => '小学'],
            ['lemma' => 'book', 'meanings' => ['书'], 'grade_level' => '一年级', 'level_tag' => '小学'],
            ['lemma' => 'cat', 'meanings' => ['猫'], 'grade_level' => '一年级', 'level_tag' => '小学'],
            ['lemma' => 'dog', 'meanings' => ['狗'], 'grade_level' => '一年级', 'level_tag' => '小学'],
            ['lemma' => 'fish', 'meanings' => ['鱼'], 'grade_level' => '一年级', 'level_tag' => '小学'],
            ['lemma' => 'giraffe', 'meanings' => ['长颈鹿'], 'grade_level' => '二年级', 'level_tag' => '小学'],
            ['lemma' => 'lion', 'meanings' => ['狮子'], 'grade_level' => '二年级', 'level_tag' => '小学'],
            ['lemma' => 'morning', 'meanings' => ['早晨'], 'grade_level' => '三年级', 'level_tag' => '小学'],
            ['lemma' => 'pencil', 'meanings' => ['铅笔'], 'grade_level' => '二年级', 'level_tag' => '小学'],
            ['lemma' => 'school', 'meanings' => ['学校'], 'grade_level' => '一年级', 'level_tag' => '小学'],
            ['lemma' => 'tall', 'meanings' => ['高的'], 'grade_level' => '二年级', 'level_tag' => '小学'],
            ['lemma' => 'water', 'meanings' => ['水'], 'grade_level' => '一年级', 'level_tag' => '小学'],
        ];

        foreach ($fallback as $row) {
            VocabularyWord::updateOrCreate(['lemma' => $row['lemma']], $row);
        }

        return count($fallback);
    }

    private function inferLevelTag(?string $gradeLevel): ?string
    {
        $grade = trim((string) $gradeLevel);
        if ($grade === '') {
            return null;
        }
        if (str_contains($grade, '高') || str_contains($grade, '10') || str_contains($grade, '11') || str_contains($grade, '12')) {
            return '高中';
        }
        if (str_contains($grade, '初') || str_contains($grade, '7') || str_contains($grade, '8') || str_contains($grade, '9')) {
            return '初中';
        }

        return '小学';
    }

    private function normalizeList(mixed $value): ?array
    {
        if ($value === null) {
            return null;
        }
        if (is_array($value)) {
            return array_values(array_filter(array_map(fn ($v) => trim((string) $v), $value)));
        }

        $text = trim((string) $value);

        return $text === '' ? null : [$text];
    }
}
