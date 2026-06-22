<?php

namespace Database\Seeders;

use App\Models\ReadingPassage;
use App\Models\ReadingQuestion;
use Illuminate\Database\Seeder;

/**
 * L1–L3 每关一篇短文 + 3 道小题，保证藏经阁可玩。
 */
class ReadingBankSeeder extends Seeder
{
    public function run(): void
    {
        $realms = ['L1', 'L2', 'L3', 'Z1', 'J1', 'Y1', 'H1'];
        $count = 0;

        foreach ($realms as $realmIdx => $realm) {
            for ($stageNo = 1; $stageNo <= 9; $stageNo++) {
                $stage = str_pad((string) $stageNo, 2, '0', STR_PAD_LEFT);
                $template = $this->templateFor($realmIdx, $stageNo);

                $passage = ReadingPassage::updateOrCreate(
                    [
                        'realm' => $realm,
                        'stage' => $stage,
                        'passage_code' => "RP-{$realm}-{$stage}",
                    ],
                    [
                        'level_tag' => '小学',
                        'grade_level' => $this->gradeLabel($realmIdx, $stageNo),
                        'title' => $template['title'],
                        'content' => $template['content'],
                        'meta' => ['seeded' => true],
                    ]
                );

                ReadingQuestion::query()->where('passage_id', $passage->id)->delete();

                foreach ($template['questions'] as $idx => $q) {
                    ReadingQuestion::create([
                        'passage_id' => $passage->id,
                        'question_no' => $idx + 1,
                        'question_type' => $q['question_type'],
                        'question' => $q['question'],
                        'options' => $q['options'] ?? null,
                        'correct_answer' => $q['correct_answer'],
                        'explanation' => $q['explanation'] ?? null,
                    ]);
                    $count++;
                }
            }
        }

        echo "Seeded reading bank: {$count} questions across L1-H1.\n";
    }

    private function gradeLabel(int $realmIdx, int $stageNo): string
    {
        $base = match ($realmIdx) {
            0 => '一年级',
            1 => '二年级',
            2 => '三年级',
            3 => '七年级',
            4 => '高一',
            5 => '大一',
            6 => '研一',
            default => '一年级',
        };
        if ($stageNo >= 7 && $realmIdx <= 2) {
            return match ($realmIdx) {
                0 => '二年级',
                1 => '三年级',
                default => '四年级',
            };
        }
        if ($stageNo >= 7 && $realmIdx === 3) {
            return '八年级';
        }
        if ($stageNo >= 7 && $realmIdx === 4) {
            return '高二';
        }
        if ($stageNo >= 7 && $realmIdx === 5) {
            return '大三';
        }
        if ($stageNo >= 7 && $realmIdx === 6) {
            return '研二';
        }

        return $base;
    }

    private function templateFor(int $realmIdx, int $stageNo): array
    {
        $templateRealmIdx = min($realmIdx, 2);
        $animals = ['cat', 'dog', 'lion', 'giraffe', 'panda', 'rabbit', 'tiger', 'elephant'];
        $animal = $animals[($templateRealmIdx * 9 + $stageNo - 1) % count($animals)];
        $heightWord = $animal === 'giraffe' ? 'very tall' : ($animal === 'rabbit' ? 'small' : 'strong');

        $content = "My name is Tom. I have a pet {$animal}. The {$animal} is {$heightWord}. "
            . "Every morning, I feed it and play with it in the garden. "
            . "My friends like my pet because it is friendly and cute.";

        return [
            'title' => "Tom and the {$animal}",
            'content' => $content,
            'questions' => [
                [
                    'question_type' => 'detail',
                    'question' => "What pet does Tom have?",
                    'options' => ['A' => $animal, 'B' => 'fish', 'C' => 'bird', 'D' => 'horse'],
                    'correct_answer' => 'A',
                    'explanation' => "文中提到 pet {$animal}。",
                ],
                [
                    'question_type' => 'word',
                    'question' => "Tom plays with the pet in the garden.",
                    'options' => ['A' => 'True', 'B' => 'False'],
                    'correct_answer' => 'True',
                    'explanation' => '文中说 play with it in the garden。',
                ],
                [
                    'question_type' => 'infer',
                    'question' => "Why do Tom's friends like the pet?",
                    'options' => ['A' => 'It is friendly and cute', 'B' => 'It is very fast', 'C' => 'It can fly', 'D' => 'It is noisy'],
                    'correct_answer' => 'A',
                    'explanation' => '最后一句说明 because it is friendly and cute。',
                ],
            ],
        ];
    }
}
