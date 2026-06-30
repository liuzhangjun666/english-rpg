<?php

namespace Database\Seeders;

use App\Models\ListeningPassage;
use App\Models\ListeningQuestion;
use Illuminate\Database\Seeder;

class ListeningBankSeeder extends Seeder
{
    /** @var list<string> */
    private const REALMS = ['L1', 'L2', 'L3', 'Z1', 'J1', 'Y1', 'H1'];

    public function run(): void
    {
        $passageCount = 0;
        $questionCount = 0;

        foreach (self::REALMS as $realm) {
            for ($stageNo = 1; $stageNo <= 9; $stageNo++) {
                $stage = str_pad((string) $stageNo, 2, '0', STR_PAD_LEFT);
                $templates = $this->passageTemplatesForStage($stageNo);

                foreach ($templates as $index => $template) {
                    $passageNo = str_pad((string) ($index + 1), 2, '0', STR_PAD_LEFT);
                    $passage = ListeningPassage::updateOrCreate(
                        ['passage_code' => "LP-{$realm}-{$stage}-{$passageNo}"],
                        [
                            'realm' => $realm,
                            'stage' => $stage,
                            'title' => $template['title'],
                            'listening_text' => $template['listening_text'],
                            'word' => $template['word'],
                            'meta' => ['seeded' => true],
                        ]
                    );

                    ListeningQuestion::query()->where('passage_id', $passage->id)->delete();

                    foreach ($template['questions'] as $qIndex => $q) {
                        ListeningQuestion::create([
                            'passage_id' => $passage->id,
                            'question_no' => $qIndex + 1,
                            'question' => $q['question'],
                            'options' => $this->optionsWithSeal($q),
                            'correct_answer' => $q['correct_answer'],
                            'explanation' => $q['explanation'] ?? null,
                            'word' => $q['word'] ?? $template['word'],
                        ]);
                        $questionCount++;
                    }

                    $passageCount++;
                }
            }
        }

        echo "Seeded listening bank: {$passageCount} passages, {$questionCount} questions.\n";
    }

    /**
     * @return list<array{title:string,word:string,listening_text:string,questions:list<array<string,mixed>>}>
     */
    private function passageTemplatesForStage(int $stageNo): array
    {
        $sets = [
            $this->schoolSchedulePassages(),
            $this->cityGuidePassages(),
            $this->dailyLifePassages(),
        ];

        return $sets[($stageNo - 1) % count($sets)];
    }

  /**
     * @param  array<string, mixed>  $question
     * @return array<string, mixed>
     */
    private function optionsWithSeal(array $question): array
    {
        $options = $question['options'];
        if (!empty($question['wind_seal'])) {
            $options['__wind_seal'] = $question['wind_seal'];
        }

        return $options;
    }

    /** @return list<array<string, mixed>> */
    private function schoolSchedulePassages(): array
    {
        return [
            [
                'title' => '校园作息',
                'word' => 'schedule',
                'listening_text' => 'Tom: What time does school start? Amy: It starts at eight o\'clock. Tom: When does it finish? Amy: At three in the afternoon.',
                'questions' => [
                    [
                        'question' => 'What time does school start?',
                        'options' => ['A' => '7:00', 'B' => '8:00', 'C' => '9:00', 'D' => '10:00'],
                        'correct_answer' => 'B',
                        'explanation' => 'Amy says school starts at eight.',
                        'wind_seal' => [
                            'template' => 'School starts at ___ o\'clock.',
                            'answers' => ['eight'],
                            'distractors' => ['seven', 'nine'],
                        ],
                    ],
                    [
                        'question' => 'When does school finish?',
                        'options' => ['A' => 'At noon', 'B' => 'At two', 'C' => 'At three', 'D' => 'At four'],
                        'correct_answer' => 'C',
                        'explanation' => 'School finishes at three in the afternoon.',
                        'wind_seal' => [
                            'template' => 'School finishes at ___ in the afternoon.',
                            'answers' => ['three'],
                            'distractors' => ['two', 'four'],
                        ],
                    ],
                    [
                        'question' => 'Who asks about the finish time?',
                        'options' => ['A' => 'Amy', 'B' => 'Tom', 'C' => 'Both', 'D' => 'Neither'],
                        'correct_answer' => 'B',
                        'explanation' => 'Tom asks "When does it finish?"',
                        'wind_seal' => [
                            'template' => '___ asks when school finishes.',
                            'answers' => ['Tom'],
                            'distractors' => ['Amy', 'Teacher'],
                        ],
                    ],
                ],
            ],
            [
                'title' => '课间对话',
                'word' => 'class',
                'listening_text' => 'The class starts at 9:10 and finishes at 10:00. Please close the window before you leave.',
                'questions' => [
                    [
                        'question' => 'When does the class start?',
                        'options' => ['A' => '9:00', 'B' => '9:10', 'C' => '9:30', 'D' => '10:00'],
                        'correct_answer' => 'B',
                        'wind_seal' => [
                            'template' => 'The class starts at ___.',
                            'answers' => ['9:10'],
                            'distractors' => ['9:00', '10:00'],
                        ],
                    ],
                    [
                        'question' => 'What should students do before leaving?',
                        'options' => ['A' => 'Open the door', 'B' => 'Close the window', 'C' => 'Turn on the light', 'D' => 'Clean the board'],
                        'correct_answer' => 'B',
                        'wind_seal' => [
                            'template' => 'Please ___ the window before you leave.',
                            'answers' => ['close'],
                            'distractors' => ['open', 'clean'],
                        ],
                    ],
                    [
                        'question' => 'How long is the class?',
                        'options' => ['A' => '40 minutes', 'B' => '45 minutes', 'C' => '50 minutes', 'D' => '60 minutes'],
                        'correct_answer' => 'C',
                        'explanation' => 'From 9:10 to 10:00 is 50 minutes.',
                    ],
                ],
            ],
            [
                'title' => '上学路上',
                'word' => 'transport',
                'listening_text' => 'I usually go to school by bus, not by bike. My brother walks to school every day.',
                'questions' => [
                    [
                        'question' => 'How does the speaker usually go to school?',
                        'options' => ['A' => 'By bike', 'B' => 'By bus', 'C' => 'On foot', 'D' => 'By car'],
                        'correct_answer' => 'B',
                        'wind_seal' => [
                            'template' => 'I usually go to school by ___.',
                            'answers' => ['bus'],
                            'distractors' => ['bike', 'car'],
                        ],
                    ],
                    [
                        'question' => 'How does the brother go to school?',
                        'options' => ['A' => 'By bus', 'B' => 'By bike', 'C' => 'He walks', 'D' => 'By taxi'],
                        'correct_answer' => 'C',
                        'wind_seal' => [
                            'template' => 'My brother ___ to school every day.',
                            'answers' => ['walks'],
                            'distractors' => ['rides', 'runs'],
                        ],
                    ],
                    [
                        'question' => 'Which way does the speaker NOT use?',
                        'options' => ['A' => 'Bus', 'B' => 'Bike', 'C' => 'Walking', 'D' => 'Train'],
                        'correct_answer' => 'B',
                    ],
                    [
                        'question' => 'Who walks to school?',
                        'options' => ['A' => 'The speaker', 'B' => 'The brother', 'C' => 'Both', 'D' => 'Neither'],
                        'correct_answer' => 'B',
                    ],
                ],
            ],
        ];
    }

    /** @return list<array<string, mixed>> */
    private function cityGuidePassages(): array
    {
        return [
            [
                'title' => '问路',
                'word' => 'location',
                'listening_text' => 'The library is next to the bank. Go straight and turn left at the second light.',
                'questions' => [
                    [
                        'question' => 'Where is the library?',
                        'options' => ['A' => 'Behind the bank', 'B' => 'Next to the bank', 'C' => 'Across from the bank', 'D' => 'Inside the bank'],
                        'correct_answer' => 'B',
                        'wind_seal' => [
                            'template' => 'The library is ___ to the bank.',
                            'answers' => ['next'],
                            'distractors' => ['far', 'behind'],
                        ],
                    ],
                    [
                        'question' => 'Which way should you turn at the second light?',
                        'options' => ['A' => 'Right', 'B' => 'Left', 'C' => 'Back', 'D' => 'Straight'],
                        'correct_answer' => 'B',
                        'wind_seal' => [
                            'template' => 'Turn ___ at the second light.',
                            'answers' => ['left'],
                            'distractors' => ['right', 'back'],
                        ],
                    ],
                    [
                        'question' => 'What should you do first?',
                        'options' => ['A' => 'Turn left', 'B' => 'Go straight', 'C' => 'Stop', 'D' => 'Turn right'],
                        'correct_answer' => 'B',
                    ],
                ],
            ],
            [
                'title' => '天气提醒',
                'word' => 'weather',
                'listening_text' => 'It is raining, so take an umbrella. The wind is strong this morning.',
                'questions' => [
                    [
                        'question' => 'Why should you take an umbrella?',
                        'options' => ['A' => 'It is sunny', 'B' => 'It is windy', 'C' => 'It is raining', 'D' => 'It is snowing'],
                        'correct_answer' => 'C',
                        'wind_seal' => [
                            'template' => 'It is ___, so take an umbrella.',
                            'answers' => ['raining'],
                            'distractors' => ['snowing', 'windy'],
                        ],
                    ],
                    [
                        'question' => 'How is the wind this morning?',
                        'options' => ['A' => 'Weak', 'B' => 'Strong', 'C' => 'Warm', 'D' => 'Cold'],
                        'correct_answer' => 'B',
                    ],
                    [
                        'question' => 'What item is mentioned for rain?',
                        'options' => ['A' => 'Coat', 'B' => 'Hat', 'C' => 'Umbrella', 'D' => 'Boots'],
                        'correct_answer' => 'C',
                    ],
                ],
            ],
            [
                'title' => '电话号码',
                'word' => 'number',
                'listening_text' => 'My phone number ends with eight two four. Please call me after six.',
                'questions' => [
                    [
                        'question' => 'What are the last three digits?',
                        'options' => ['A' => '842', 'B' => '824', 'C' => '284', 'D' => '428'],
                        'correct_answer' => 'B',
                        'wind_seal' => [
                            'template' => 'The number ends with eight two ___.',
                            'answers' => ['four'],
                            'distractors' => ['five', 'nine'],
                        ],
                    ],
                    [
                        'question' => 'When should you call?',
                        'options' => ['A' => 'Before six', 'B' => 'At six', 'C' => 'After six', 'D' => 'At noon'],
                        'correct_answer' => 'C',
                    ],
                    [
                        'question' => 'Which digit comes first in the ending?',
                        'options' => ['A' => 'Two', 'B' => 'Four', 'C' => 'Eight', 'D' => 'Six'],
                        'correct_answer' => 'C',
                    ],
                ],
            ],
        ];
    }

    /** @return list<array<string, mixed>> */
    private function dailyLifePassages(): array
    {
        return [
            [
                'title' => '早餐时间',
                'word' => 'time',
                'listening_text' => 'I get up at seven and eat breakfast at seven thirty. I leave home at eight.',
                'questions' => [
                    [
                        'question' => 'What time does the speaker get up?',
                        'options' => ['A' => '6:30', 'B' => '7:00', 'C' => '7:30', 'D' => '8:00'],
                        'correct_answer' => 'B',
                        'wind_seal' => [
                            'template' => 'I get up at ___.',
                            'answers' => ['seven'],
                            'distractors' => ['six', 'eight'],
                        ],
                    ],
                    [
                        'question' => 'When does the speaker eat breakfast?',
                        'options' => ['A' => '7:00', 'B' => '7:15', 'C' => '7:30', 'D' => '8:00'],
                        'correct_answer' => 'C',
                    ],
                    [
                        'question' => 'When does the speaker leave home?',
                        'options' => ['A' => '7:00', 'B' => '7:30', 'C' => '8:00', 'D' => '8:30'],
                        'correct_answer' => 'C',
                    ],
                ],
            ],
            [
                'title' => '饮食偏好',
                'word' => 'preference',
                'listening_text' => 'I like tea, but my brother prefers coffee. For lunch, I had rice, chicken, and an apple.',
                'questions' => [
                    [
                        'question' => 'Who likes coffee?',
                        'options' => ['A' => 'The speaker', 'B' => 'The brother', 'C' => 'Both', 'D' => 'Neither'],
                        'correct_answer' => 'B',
                        'wind_seal' => [
                            'template' => 'My brother prefers ___.',
                            'answers' => ['coffee'],
                            'distractors' => ['tea', 'milk'],
                        ],
                    ],
                    [
                        'question' => 'What did the speaker have for lunch?',
                        'options' => ['A' => 'Rice and fish', 'B' => 'Rice, chicken, and an apple', 'C' => 'Bread and milk', 'D' => 'Noodles only'],
                        'correct_answer' => 'B',
                    ],
                    [
                        'question' => 'What does the speaker like to drink?',
                        'options' => ['A' => 'Coffee', 'B' => 'Tea', 'C' => 'Juice', 'D' => 'Milk'],
                        'correct_answer' => 'B',
                    ],
                ],
            ],
            [
                'title' => '周末计划',
                'word' => 'plan',
                'listening_text' => 'On Saturday we will visit the museum and have dinner with our grandparents.',
                'questions' => [
                    [
                        'question' => 'When will they visit the museum?',
                        'options' => ['A' => 'Friday', 'B' => 'Saturday', 'C' => 'Sunday', 'D' => 'Monday'],
                        'correct_answer' => 'B',
                        'wind_seal' => [
                            'template' => 'On ___ we will visit the museum.',
                            'answers' => ['Saturday'],
                            'distractors' => ['Sunday', 'Friday'],
                        ],
                    ],
                    [
                        'question' => 'Who will they have dinner with?',
                        'options' => ['A' => 'Friends', 'B' => 'Teachers', 'C' => 'Grandparents', 'D' => 'Neighbors'],
                        'correct_answer' => 'C',
                    ],
                    [
                        'question' => 'How many activities are planned?',
                        'options' => ['A' => 'One', 'B' => 'Two', 'C' => 'Three', 'D' => 'Four'],
                        'correct_answer' => 'B',
                    ],
                ],
            ],
        ];
    }
}
