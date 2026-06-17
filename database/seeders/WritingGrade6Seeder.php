<?php

namespace Database\Seeders;

use App\Models\WritingPrompt;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

/**
 * 导入六年级（小升初）写作题库
 * 数据来源：database/seeders/data/writing_grade6.json
 * 生成方式：python tools/import_writing_grade6.py
 */
class WritingGrade6Seeder extends Seeder
{
    public function run(): void
    {
        $jsonPath = database_path('seeders/data/writing_grade6.json');
        if (!File::exists($jsonPath)) {
            $this->command?->error("Missing data file: {$jsonPath}");
            $this->command?->line('Run: python tools/import_writing_grade6.py');
            return;
        }

        $rows = json_decode(File::get($jsonPath), true);
        if (!is_array($rows) || empty($rows)) {
            $this->command?->error('writing_grade6.json is empty or invalid.');
            return;
        }

        // 仅替换 L3（六年级）写作题，保留其他境界旧数据。
        WritingPrompt::query()->where('realm', 'L3')->delete();

        $count = 0;
        foreach ($rows as $row) {
            if (!is_array($row) || empty($row['prompt_id'])) {
                continue;
            }

            WritingPrompt::updateOrCreate(
                ['prompt_id' => (string) $row['prompt_id']],
                [
                    'writing_type' => (string) ($row['writing_type'] ?? 'topic'),
                    'realm' => (string) ($row['realm'] ?? 'L3'),
                    'stage' => (string) ($row['stage'] ?? '01'),
                    'title' => (string) ($row['title'] ?? 'Writing Task'),
                    'topic' => (string) ($row['topic'] ?? ''),
                    'passage' => $row['passage'] ?? null,
                    'word_limit_min' => (int) ($row['word_limit_min'] ?? 50),
                    'word_limit_max' => (int) ($row['word_limit_max'] ?? 150),
                    'scoring_criteria' => $row['scoring_criteria'] ?? null,
                ]
            );
            $count++;
        }

        $this->command?->info("Imported {$count} grade-6 writing prompts into L3.");
    }
}
