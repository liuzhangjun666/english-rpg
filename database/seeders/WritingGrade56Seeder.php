<?php

namespace Database\Seeders;

use App\Models\WritingPrompt;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

/**
 * 导入五、六年级写作题库（含范文）
 * 数据来源：database/seeders/data/writing_grade56.json
 * 生成方式：python tools/import_writing_grade56.py
 */
class WritingGrade56Seeder extends Seeder
{
    public function run(): void
    {
        $jsonPath = database_path('seeders/data/writing_grade56.json');
        if (!File::exists($jsonPath)) {
            $this->command?->error("Missing data file: {$jsonPath}");
            $this->command?->line('Run: python tools/import_writing_grade56.py');
            return;
        }

        $rows = json_decode(File::get($jsonPath), true);
        if (!is_array($rows) || empty($rows)) {
            $this->command?->error('writing_grade56.json is empty or invalid.');
            return;
        }

        // 仅替换五、六年级对应关卡，保留 L1-01~06 及其他境界数据。
        WritingPrompt::query()
            ->where(function ($query) {
                $query->where(function ($q) {
                    $q->where('realm', 'L1')->whereIn('stage', ['07', '08', '09']);
                })->orWhere(function ($q) {
                    $q->where('realm', 'L2')->where('stage', '01');
                });
            })
            ->delete();

        $count = 0;
        foreach ($rows as $row) {
            if (!is_array($row) || empty($row['prompt_id'])) {
                continue;
            }

            WritingPrompt::updateOrCreate(
                ['prompt_id' => (string) $row['prompt_id']],
                [
                    'writing_type' => (string) ($row['writing_type'] ?? 'topic'),
                    'realm' => (string) ($row['realm'] ?? 'L1'),
                    'stage' => (string) ($row['stage'] ?? '07'),
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

        $this->command?->info("Imported {$count} grade 5-6 writing prompts (L1-07~09, L2-01).");
    }
}
