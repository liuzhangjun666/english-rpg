<?php

namespace Database\Seeders;

use App\Models\Question;
use Illuminate\Database\Seeder;

class SkillModuleTestDataSeeder extends Seeder
{
    /**
     * Generate full speaking/listening/reading/writing test banks
     * for all realms and stages used by the practice module.
     */
    public function run(): void
    {
        // Cleanup legacy skill test ids from older seed format, e.g. LS-L1-001.
        Question::query()
            ->whereIn('type', ['listening', 'speaking', 'reading', 'writing'])
            ->whereRaw("question_id REGEXP '^(LS|SP|RD|WR)-L[1-3]-[0-9]{3}$'")
            ->delete();

        $templateBanks = [
            'listening' => $this->listeningTemplates(),
            'speaking' => $this->speakingTemplates(),
            'reading' => $this->readingTemplates(),
            'writing' => $this->writingTemplates(),
        ];

        $realms = ['L1', 'L2', 'L3'];
        $count = 0;

        foreach ($realms as $realm) {
            for ($stageNo = 1; $stageNo <= 9; $stageNo++) {
                $stage = str_pad((string)$stageNo, 2, '0', STR_PAD_LEFT);

                foreach ($templateBanks as $type => $templates) {
                    foreach ($templates as $index => $t) {
                        $questionId = $this->buildQuestionId($type, $realm, $stage, $index + 1);

                        Question::updateOrCreate(
                            ['question_id' => $questionId],
                            [
                                'type' => $type,
                                'realm' => $realm,
                                'stage' => $stage,
                                'word' => $t['word'],
                                'listening_text' => $t['listening_text'] ?? null,
                                'question' => $t['question'],
                                'options' => $t['options'],
                                'correct_answer' => $t['correct_answer'],
                                'explanation' => $t['explanation'],
                            ]
                        );

                        $count++;
                    }
                }
            }
        }

        echo "Seeded {$count} skill module test questions (listening/speaking/reading/writing, full level coverage).\n";
    }

    private function buildQuestionId(string $type, string $realm, string $stage, int $serial): string
    {
        $prefixMap = [
            'listening' => 'LS',
            'speaking' => 'SP',
            'reading' => 'RD',
            'writing' => 'WR',
        ];

        $prefix = $prefixMap[$type] ?? 'SK';
        $serialStr = str_pad((string)$serial, 3, '0', STR_PAD_LEFT);

        return "{$prefix}-{$realm}-{$stage}-{$serialStr}";
    }

    private function listeningTemplates(): array
    {
        return [
            [
                'word' => 'time',
                'listening_text' => 'I get up at seven and eat breakfast at seven thirty.',
                'question' => 'What time does the speaker eat breakfast?',
                'options' => ['A' => '7:00', 'B' => '7:15', 'C' => '7:30', 'D' => '8:00'],
                'correct_answer' => 'C',
                'explanation' => 'The speaker says "eat breakfast at seven thirty."',
            ],
            [
                'word' => 'location',
                'listening_text' => 'The library is next to the bank.',
                'question' => 'Where is the library?',
                'options' => ['A' => 'Behind the bank', 'B' => 'Next to the bank', 'C' => 'Across from the bank', 'D' => 'Inside the bank'],
                'correct_answer' => 'B',
                'explanation' => '"Next to" means beside.',
            ],
            [
                'word' => 'weather',
                'listening_text' => 'It is raining, so take an umbrella.',
                'question' => 'Why does the speaker mention an umbrella?',
                'options' => ['A' => 'It is sunny', 'B' => 'It is windy', 'C' => 'It is raining', 'D' => 'It is snowing'],
                'correct_answer' => 'C',
                'explanation' => 'Umbrella is used because it is raining.',
            ],
            [
                'word' => 'number',
                'listening_text' => 'My phone number ends with eight two four.',
                'question' => 'What are the last three digits?',
                'options' => ['A' => '842', 'B' => '824', 'C' => '284', 'D' => '428'],
                'correct_answer' => 'B',
                'explanation' => 'The sequence spoken is 8-2-4.',
            ],
            [
                'word' => 'preference',
                'listening_text' => 'I like tea, but my brother prefers coffee.',
                'question' => 'Who likes coffee?',
                'options' => ['A' => 'The speaker', 'B' => 'The brother', 'C' => 'Both of them', 'D' => 'Neither of them'],
                'correct_answer' => 'B',
                'explanation' => 'The sentence says the brother prefers coffee.',
            ],
            [
                'word' => 'direction',
                'listening_text' => 'Go straight and turn left at the second light.',
                'question' => 'What should you do at the second light?',
                'options' => ['A' => 'Turn right', 'B' => 'Go back', 'C' => 'Turn left', 'D' => 'Stop and wait'],
                'correct_answer' => 'C',
                'explanation' => 'Instruction is "turn left at the second light."',
            ],
            [
                'word' => 'schedule',
                'listening_text' => 'The class starts at 9:10 and finishes at 10:00.',
                'question' => 'When does class finish?',
                'options' => ['A' => '9:10', 'B' => '9:50', 'C' => '10:00', 'D' => '10:10'],
                'correct_answer' => 'C',
                'explanation' => 'Finish time is explicitly 10:00.',
            ],
            [
                'word' => 'action',
                'listening_text' => 'Please close the window before you leave.',
                'question' => 'What is the request?',
                'options' => ['A' => 'Open the window', 'B' => 'Close the window', 'C' => 'Clean the window', 'D' => 'Paint the window'],
                'correct_answer' => 'B',
                'explanation' => 'The key verb is "close".',
            ],
            [
                'word' => 'food',
                'listening_text' => 'For lunch, I had rice, chicken, and an apple.',
                'question' => 'Which fruit did the speaker eat?',
                'options' => ['A' => 'Banana', 'B' => 'Orange', 'C' => 'Apple', 'D' => 'Grape'],
                'correct_answer' => 'C',
                'explanation' => 'The only fruit mentioned is apple.',
            ],
            [
                'word' => 'transport',
                'listening_text' => 'I usually go to school by bus, not by bike.',
                'question' => 'How does the speaker usually go to school?',
                'options' => ['A' => 'By bike', 'B' => 'By bus', 'C' => 'On foot', 'D' => 'By train'],
                'correct_answer' => 'B',
                'explanation' => 'The speaker contrasts bus with bike and says bus.',
            ],
        ];
    }

    private function speakingTemplates(): array
    {
        return [
            [
                'word' => 'greeting',
                'question' => 'Choose the most natural response: "How are you today?"',
                'options' => ['A' => 'I am fine, thank you.', 'B' => 'I am at school.', 'C' => 'It is a chair.', 'D' => 'Blue is nice.'],
                'correct_answer' => 'A',
                'explanation' => 'A polite status response fits the question.',
            ],
            [
                'word' => 'introductions',
                'question' => 'You meet a new classmate. What should you say first?',
                'options' => ['A' => 'Close the door.', 'B' => 'Nice to meet you.', 'C' => 'I have three apples.', 'D' => 'Turn left now.'],
                'correct_answer' => 'B',
                'explanation' => '"Nice to meet you" fits first-time introductions.',
            ],
            [
                'word' => 'requests',
                'question' => 'Which sentence is a polite request?',
                'options' => ['A' => 'Give me that pen!', 'B' => 'You must do it now.', 'C' => 'Could you help me, please?', 'D' => 'No talking.'],
                'correct_answer' => 'C',
                'explanation' => 'Polite request uses "Could you ... please?"',
            ],
            [
                'word' => 'classroom',
                'question' => 'Teacher says: "Please read line three." What is the best reply?',
                'options' => ['A' => 'Sure, I will read it now.', 'B' => 'I am a pencil.', 'C' => 'Yesterday is sunny.', 'D' => 'No, blue.'],
                'correct_answer' => 'A',
                'explanation' => 'Reply should acknowledge and act on instruction.',
            ],
            [
                'word' => 'apology',
                'question' => 'Your friend drops a book and you step on it by mistake. What should you say?',
                'options' => ['A' => 'Thank you very much.', 'B' => 'I am sorry.', 'C' => 'Good night.', 'D' => 'See you Monday.'],
                'correct_answer' => 'B',
                'explanation' => 'Apology context requires "I am sorry."',
            ],
            [
                'word' => 'pronunciation',
                'question' => 'Which word has the same first sound as "cat"?',
                'options' => ['A' => 'kite', 'B' => 'city', 'C' => 'chair', 'D' => 'cake'],
                'correct_answer' => 'D',
                'explanation' => '"cat" and "cake" begin with the /k/ sound.',
            ],
            [
                'word' => 'stress',
                'question' => 'In "GOOD morning", which word is stressed more in natural greeting?',
                'options' => ['A' => 'GOOD', 'B' => 'morning', 'C' => 'both equally always', 'D' => 'neither'],
                'correct_answer' => 'A',
                'explanation' => 'Greeting usually places stronger stress on "good".',
            ],
            [
                'word' => 'daily-talk',
                'question' => 'Friend asks: "What time is it?" Choose the best answer.',
                'options' => ['A' => 'It is half past two.', 'B' => 'I like oranges.', 'C' => 'My bag is heavy.', 'D' => 'This is my sister.'],
                'correct_answer' => 'A',
                'explanation' => 'Only option A answers a time question.',
            ],
            [
                'word' => 'conversation',
                'question' => 'Complete the dialog: A: "Can you swim?" B: "____"',
                'options' => ['A' => 'Yes, I can.', 'B' => 'Yes, I do.', 'C' => 'Yes, I am.', 'D' => 'Yes, I have.'],
                'correct_answer' => 'A',
                'explanation' => 'Modal verb question with "can" takes "can" in short answer.',
            ],
            [
                'word' => 'permission',
                'question' => 'You want to open the window in class. Choose the best sentence.',
                'options' => ['A' => 'Open the window now.', 'B' => 'May I open the window?', 'C' => 'Window is opening.', 'D' => 'You open window.'],
                'correct_answer' => 'B',
                'explanation' => 'Asking permission uses "May I ...?"',
            ],
        ];
    }

    private function readingTemplates(): array
    {
        return [
            [
                'word' => 'school',
                'question' => 'Read: "Tom goes to school at 8:00. He has math on Monday." What subject does Tom have on Monday?',
                'options' => ['A' => 'English', 'B' => 'Math', 'C' => 'Science', 'D' => 'Music'],
                'correct_answer' => 'B',
                'explanation' => 'The text directly says he has math on Monday.',
            ],
            [
                'word' => 'family',
                'question' => 'Read: "Lily has one brother and two sisters." How many siblings does Lily have?',
                'options' => ['A' => '1', 'B' => '2', 'C' => '3', 'D' => '4'],
                'correct_answer' => 'C',
                'explanation' => 'One brother + two sisters = three siblings.',
            ],
            [
                'word' => 'food',
                'question' => 'Read: "For breakfast, Sam drinks milk and eats bread." What does Sam drink?',
                'options' => ['A' => 'Tea', 'B' => 'Milk', 'C' => 'Juice', 'D' => 'Water'],
                'correct_answer' => 'B',
                'explanation' => 'The sentence states he drinks milk.',
            ],
            [
                'word' => 'weather',
                'question' => 'Read: "It is cold today, so Amy wears a coat." Why does Amy wear a coat?',
                'options' => ['A' => 'Because it is hot', 'B' => 'Because it is cold', 'C' => 'Because it is raining', 'D' => 'Because it is windy'],
                'correct_answer' => 'B',
                'explanation' => 'Cause-and-effect is explicit: cold -> coat.',
            ],
            [
                'word' => 'time',
                'question' => 'Read: "The movie starts at 6:15 and ends at 8:00." When does it start?',
                'options' => ['A' => '6:15', 'B' => '6:50', 'C' => '7:15', 'D' => '8:00'],
                'correct_answer' => 'A',
                'explanation' => 'Start time is 6:15.',
            ],
            [
                'word' => 'direction',
                'question' => 'Read: "Go straight, then turn right at the hospital." Where do you turn right?',
                'options' => ['A' => 'At the school', 'B' => 'At the bank', 'C' => 'At the hospital', 'D' => 'At the park'],
                'correct_answer' => 'C',
                'explanation' => 'Instruction says turn right at the hospital.',
            ],
            [
                'word' => 'habit',
                'question' => 'Read: "Nina reads English for 20 minutes every night." When does Nina read English?',
                'options' => ['A' => 'Every morning', 'B' => 'Every afternoon', 'C' => 'Every night', 'D' => 'Only Sunday'],
                'correct_answer' => 'C',
                'explanation' => 'The line says every night.',
            ],
            [
                'word' => 'pets',
                'question' => 'Read: "Our dog is friendly, but our cat is shy." Which pet is shy?',
                'options' => ['A' => 'The dog', 'B' => 'The cat', 'C' => 'Both pets', 'D' => 'No pet'],
                'correct_answer' => 'B',
                'explanation' => 'Text contrasts friendly dog and shy cat.',
            ],
            [
                'word' => 'transport',
                'question' => 'Read: "I walk to school on sunny days, but I take the bus on rainy days." What does the writer do on rainy days?',
                'options' => ['A' => 'Walks to school', 'B' => 'Rides a bike', 'C' => 'Takes the bus', 'D' => 'Stays home'],
                'correct_answer' => 'C',
                'explanation' => 'Rainy days correspond to taking the bus.',
            ],
            [
                'word' => 'shopping',
                'question' => 'Read: "The apple is $2 and the banana is $1." Which is cheaper?',
                'options' => ['A' => 'Apple', 'B' => 'Banana', 'C' => 'Both same price', 'D' => 'Cannot know'],
                'correct_answer' => 'B',
                'explanation' => '$1 is cheaper than $2.',
            ],
        ];
    }

    private function writingTemplates(): array
    {
        return [
            [
                'word' => 'sentence-order',
                'question' => 'Choose the correct sentence.',
                'options' => ['A' => 'I every day read books.', 'B' => 'I read books every day.', 'C' => 'Read I books every day.', 'D' => 'Every day books I read.'],
                'correct_answer' => 'B',
                'explanation' => 'Standard order: subject + verb + object + time expression.',
            ],
            [
                'word' => 'be-verb',
                'question' => 'Fill in the blank: "She ____ my friend."',
                'options' => ['A' => 'am', 'B' => 'are', 'C' => 'is', 'D' => 'be'],
                'correct_answer' => 'C',
                'explanation' => 'Third-person singular subject takes "is".',
            ],
            [
                'word' => 'punctuation',
                'question' => 'Which sentence has correct punctuation?',
                'options' => ['A' => 'what is your name', 'B' => 'What is your name?', 'C' => 'What is your name.', 'D' => 'What is your name!'],
                'correct_answer' => 'B',
                'explanation' => 'A question should end with a question mark.',
            ],
            [
                'word' => 'capitalization',
                'question' => 'Which option uses capitalization correctly?',
                'options' => ['A' => 'i am from china.', 'B' => 'I am from china.', 'C' => 'I am from China.', 'D' => 'i am from China.'],
                'correct_answer' => 'C',
                'explanation' => 'Pronoun I and country names are capitalized.',
            ],
            [
                'word' => 'plural',
                'question' => 'Choose the correct plural form.',
                'options' => ['A' => 'two book', 'B' => 'two books', 'C' => 'two bookes', 'D' => 'two bookses'],
                'correct_answer' => 'B',
                'explanation' => 'Regular plural of book is books.',
            ],
            [
                'word' => 'article',
                'question' => 'Complete: "I have ____ orange."',
                'options' => ['A' => 'a', 'B' => 'an', 'C' => 'the', 'D' => '/'],
                'correct_answer' => 'B',
                'explanation' => 'Use "an" before vowel sound.',
            ],
            [
                'word' => 'verb-tense',
                'question' => 'Choose the best sentence for a daily habit.',
                'options' => ['A' => 'He go to school every day.', 'B' => 'He goes to school every day.', 'C' => 'He going to school every day.', 'D' => 'He gone to school every day.'],
                'correct_answer' => 'B',
                'explanation' => 'Third-person singular in present simple takes goes.',
            ],
            [
                'word' => 'word-choice',
                'question' => 'Fill in: "Please ____ the door."',
                'options' => ['A' => 'close', 'B' => 'closed', 'C' => 'closing', 'D' => 'closes'],
                'correct_answer' => 'A',
                'explanation' => 'Imperative sentence uses base form.',
            ],
            [
                'word' => 'question-form',
                'question' => 'Choose the correct question.',
                'options' => ['A' => 'You are ready?', 'B' => 'Are you ready?', 'C' => 'Do you are ready?', 'D' => 'Ready are you?'],
                'correct_answer' => 'B',
                'explanation' => 'Be verb moves before subject in yes/no question.',
            ],
            [
                'word' => 'preposition',
                'question' => 'Complete: "The cat is ____ the box."',
                'options' => ['A' => 'in', 'B' => 'on', 'C' => 'at', 'D' => 'to'],
                'correct_answer' => 'A',
                'explanation' => 'Inside a container uses "in".',
            ],
        ];
    }
}
