<?php

namespace Database\Seeders;

use App\Models\WritingPrompt;
use Illuminate\Database\Seeder;

/**
 * 写作模块题目数据填充
 * 每个 realm×stage 组合生成2道题：1道命题作文(topic) + 1道续写(continuation)
 */
class WritingPromptSeeder extends Seeder
{
    public function run(): void
    {
        WritingPrompt::query()->delete();

        $realms = ['L1', 'L2', 'L3'];
        $count = 0;

        foreach ($realms as $realmIdx => $realm) {
            for ($stageNo = 1; $stageNo <= 9; $stageNo++) {
                $stage = str_pad((string)$stageNo, 2, '0', STR_PAD_LEFT);
                $templates = $this->getTemplates($realmIdx, $stageNo);

                foreach ($templates as $i => $t) {
                    $serial = $i + 1;
                    $promptId = "WP-{$realm}-{$stage}-{$serial}";

                    WritingPrompt::updateOrCreate(
                        ['prompt_id' => $promptId],
                        array_merge($t, [
                            'realm' => $realm,
                            'stage' => $stage,
                        ])
                    );
                    $count++;
                }
            }
        }

        echo "Seeded {$count} writing prompts (topic + continuation per stage).\n";
    }

    /**
     * 根据境界和关卡难度选择题目模板
     * @param int $realmIdx 0=L1, 1=L2, 2=L3
     * @param int $stageNo  1-9
     */
    private function getTemplates(int $realmIdx, int $stageNo): array
    {
        // L1 练气期：50-80词，基础主题
        if ($realmIdx === 0) {
            return $this->l1Templates($stageNo);
        }
        // L2 筑基期：80-120词，进阶主题
        if ($realmIdx === 1) {
            return $this->l2Templates($stageNo);
        }
        // L3 金丹期：120-180词，综合主题
        return $this->l3Templates($stageNo);
    }

    private function l1Templates(int $stageNo): array
    {
        $topicBank = [
            1 => [
                'title' => 'My Family',
                'topic' => 'Write about your family. Who are they? What do they do? Use at least 3 family member words.',
                'word_limit_min' => 40,
                'word_limit_max' => 80,
            ],
            2 => [
                'title' => 'My Favorite Food',
                'topic' => 'Describe your favorite food. What does it look like? Why do you like it?',
                'word_limit_min' => 40,
                'word_limit_max' => 80,
            ],
            3 => [
                'title' => 'My School Day',
                'topic' => 'What do you do at school? Write about your daily routine at school.',
                'word_limit_min' => 50,
                'word_limit_max' => 80,
            ],
            4 => [
                'title' => 'My Favorite Animal',
                'topic' => 'Write about an animal you like. Describe what it looks like and why you like it.',
                'word_limit_min' => 50,
                'word_limit_max' => 80,
            ],
            5 => [
                'title' => 'My Weekend',
                'topic' => 'Describe what you usually do on weekends. Use time words like "first", "then", "finally".',
                'word_limit_min' => 50,
                'word_limit_max' => 80,
            ],
            6 => [
                'title' => 'My Best Friend',
                'topic' => 'Write about your best friend. What is he/she like? What do you do together?',
                'word_limit_min' => 50,
                'word_limit_max' => 80,
            ],
            7 => [
                'title' => 'My Home',
                'topic' => 'Describe your home. What rooms are there? Which room do you like best and why?',
                'word_limit_min' => 50,
                'word_limit_max' => 80,
            ],
            8 => [
                'title' => 'My Hobby',
                'topic' => 'Write about your favorite hobby. How often do you do it? Why do you enjoy it?',
                'word_limit_min' => 50,
                'word_limit_max' => 80,
            ],
            9 => [
                'title' => 'A Happy Day',
                'topic' => 'Write about a day when you were very happy. What happened? Why were you happy?',
                'word_limit_min' => 50,
                'word_limit_max' => 80,
            ],
        ];

        $continuationBank = [
            1 => [
                'title' => 'Continue the Story: The Lost Puppy',
                'passage' => 'One morning, Tom found a small puppy near the school gate. The puppy was wet and hungry. Tom picked it up carefully.',
                'topic' => 'Continue the story. What did Tom do next? Did the puppy find its owner? Write at least 40 words.',
            ],
            2 => [
                'title' => 'Continue the Story: A Strange Gift',
                'passage' => 'On her birthday, Lucy received a mysterious box. There was no name on it. When she opened it, she saw...',
                'topic' => 'What was inside the box? Continue the story. Write at least 40 words.',
            ],
            3 => [
                'title' => 'Continue the Story: A Rainy Day',
                'passage' => 'It was raining heavily outside. Sam sat by the window and looked at the gray sky. He felt a little bored.',
                'topic' => 'What did Sam decide to do? Continue the story. Write at least 40 words.',
            ],
            4 => [
                'title' => 'Continue the Story: The New Student',
                'passage' => 'A new student named Li Ming joined the class today. He looked shy and didn\'t talk to anyone. At lunch time...',
                'topic' => 'What happened at lunch time? Continue the story. Write at least 40 words.',
            ],
            5 => [
                'title' => 'Continue the Story: The Magic Pencil',
                'passage' => 'Ann found a red pencil on the ground. When she drew a flower with it, the flower came to life! She was amazed.',
                'topic' => 'What did Ann do next with the magic pencil? Continue the story. Write at least 40 words.',
            ],
            6 => [
                'title' => 'Continue the Story: Lost in the Forest',
                'passage' => 'During a school trip, Ben got separated from his group. He walked around but everything looked the same. He took a deep breath.',
                'topic' => 'How did Ben find his way back? Continue the story. Write at least 40 words.',
            ],
            7 => [
                'title' => 'Continue the Story: The Big Match',
                'passage' => 'It was the last minute of the football match. The score was 1-1. Mike had the ball and ran toward the goal.',
                'topic' => 'What happened next? Did Mike score? Continue the story. Write at least 40 words.',
            ],
            8 => [
                'title' => 'Continue the Story: Grandma\'s Visit',
                'passage' => 'Grandma came to visit last Sunday. She brought some special food from the countryside. The whole family gathered around the table.',
                'topic' => 'What happened during Grandma\'s visit? Write at least 40 words.',
            ],
            9 => [
                'title' => 'Continue the Story: A Surprise in the Garden',
                'passage' => 'One afternoon, Lily was watering the flowers in the garden when she noticed something strange under the rose bush.',
                'topic' => 'What did Lily find? What did she do? Continue the story. Write at least 40 words.',
            ],
        ];

        $t = $topicBank[$stageNo] ?? $topicBank[1];
        $c = $continuationBank[$stageNo] ?? $continuationBank[1];

        return [
            array_merge($t, ['writing_type' => 'topic', 'passage' => null,
                'scoring_criteria' => ['relevance' => 25, 'language' => 25, 'grammar' => 25, 'coherence' => 25]]),
            array_merge($c, ['writing_type' => 'continuation', 'word_limit_min' => 40, 'word_limit_max' => 80,
                'scoring_criteria' => ['relevance' => 30, 'language' => 25, 'grammar' => 25, 'coherence' => 20]]),
        ];
    }

    private function l2Templates(int $stageNo): array
    {
        $topicBank = [
            1 => [
                'title' => 'The Importance of Reading',
                'topic' => 'Why is reading important? Write about the benefits of reading books. Give at least 2 reasons with examples.',
                'word_limit_min' => 80,
                'word_limit_max' => 120,
            ],
            2 => [
                'title' => 'My Dream Job',
                'topic' => 'What do you want to be when you grow up? Describe your dream job and explain why you want it.',
                'word_limit_min' => 80,
                'word_limit_max' => 120,
            ],
            3 => [
                'title' => 'Technology in Our Life',
                'topic' => 'How does technology help us in daily life? Give 2-3 examples and your opinion.',
                'word_limit_min' => 80,
                'word_limit_max' => 120,
            ],
            4 => [
                'title' => 'Protecting the Environment',
                'topic' => 'What can students do to protect the environment? Write at least 3 suggestions with brief explanations.',
                'word_limit_min' => 80,
                'word_limit_max' => 120,
            ],
            5 => [
                'title' => 'A Memorable Trip',
                'topic' => 'Describe a trip or journey you have been on. Where did you go? What made it memorable?',
                'word_limit_min' => 80,
                'word_limit_max' => 120,
            ],
            6 => [
                'title' => 'Healthy Habits',
                'topic' => 'Write about healthy habits that are important for young people. Give specific advice and reasons.',
                'word_limit_min' => 80,
                'word_limit_max' => 120,
            ],
            7 => [
                'title' => 'My Favourite Season',
                'topic' => 'Which season do you like best and why? Describe what you can do in that season.',
                'word_limit_min' => 80,
                'word_limit_max' => 120,
            ],
            8 => [
                'title' => 'School Life vs Holiday',
                'topic' => 'Compare school life and holiday time. What are the advantages of each? Which do you prefer?',
                'word_limit_min' => 80,
                'word_limit_max' => 120,
            ],
            9 => [
                'title' => 'What Makes a Good Friend?',
                'topic' => 'What qualities should a good friend have? Give 3 qualities and explain why they are important.',
                'word_limit_min' => 80,
                'word_limit_max' => 120,
            ],
        ];

        $continuationBank = [
            1 => [
                'title' => 'Continue: The Old Library',
                'passage' => 'Emma had never been to the old library at the end of Pine Street. One afternoon, curiosity got the better of her. She pushed open the heavy wooden door and stepped inside. The smell of old books filled the air.',
                'topic' => 'What did Emma discover inside the library? Was there something unusual? Continue the story. Write 80-120 words.',
            ],
            2 => [
                'title' => 'Continue: An Unexpected Phone Call',
                'passage' => 'Jack was doing his homework when his phone rang. He didn\'t recognize the number, but he answered anyway. A strange voice said, "I know where your lost dog is."',
                'topic' => 'Who was calling? Was the dog really found? Continue the story. Write 80-120 words.',
            ],
            3 => [
                'title' => 'Continue: The Science Experiment',
                'passage' => 'During the science class, something went terribly wrong. The mixture in Maya\'s test tube suddenly turned bright purple and began to bubble rapidly. Everyone stepped back.',
                'topic' => 'What happened next? How did the teacher handle the situation? Continue the story. Write 80-120 words.',
            ],
            4 => [
                'title' => 'Continue: Moving to a New City',
                'passage' => 'When Zhang Wei arrived at his new school in Beijing, he felt completely lost. The classrooms were bigger, the teachers spoke faster, and everyone seemed to already have their own group of friends.',
                'topic' => 'How did Zhang Wei adapt to his new school? Did he make any friends? Continue the story. Write 80-120 words.',
            ],
            5 => [
                'title' => 'Continue: The Talent Show',
                'passage' => 'It was the night of the school talent show. Sarah had practiced her piano piece for months. But as she walked on stage, she saw the large audience and suddenly forgot the first note.',
                'topic' => 'What happened next? Did Sarah succeed? Continue the story. Write 80-120 words.',
            ],
            6 => [
                'title' => 'Continue: The Mysterious Neighbour',
                'passage' => 'For three years, no one had ever seen the new neighbour come out of the house. Packages arrived daily, strange sounds came at night, and the curtains were always shut.',
                'topic' => 'One day, the door opened. What did the children find? Continue the story. Write 80-120 words.',
            ],
            7 => [
                'title' => 'Continue: First Day at Camp',
                'passage' => 'Oliver arrived at the summer camp with high hopes. But on the first night, he couldn\'t sleep. His tent-mates were strangers, the bed was hard, and somewhere in the dark, an owl was hooting loudly.',
                'topic' => 'How did Oliver\'s week at camp turn out? Continue the story. Write 80-120 words.',
            ],
            8 => [
                'title' => 'Continue: The Storm',
                'passage' => 'The weather forecast had warned of a severe storm, but no one expected it to be this bad. The lights went out at 7 PM, and the wind howled outside like a living thing.',
                'topic' => 'What did the family do during the storm? Was anyone in danger? Continue the story. Write 80-120 words.',
            ],
            9 => [
                'title' => 'Continue: The Championship',
                'passage' => 'Our school team had waited two years for this moment — the regional basketball championship. We had trained every day. Now, down by two points with ten seconds left, our captain held the ball.',
                'topic' => 'How did the game end? Continue the story with a satisfying conclusion. Write 80-120 words.',
            ],
        ];

        $t = $topicBank[$stageNo] ?? $topicBank[1];
        $c = $continuationBank[$stageNo] ?? $continuationBank[1];

        return [
            array_merge($t, ['writing_type' => 'topic', 'passage' => null,
                'scoring_criteria' => ['relevance' => 25, 'language' => 25, 'grammar' => 25, 'coherence' => 25]]),
            array_merge($c, ['writing_type' => 'continuation', 'word_limit_min' => 80, 'word_limit_max' => 120,
                'scoring_criteria' => ['relevance' => 30, 'language' => 25, 'grammar' => 25, 'coherence' => 20]]),
        ];
    }

    private function l3Templates(int $stageNo): array
    {
        $topicBank = [
            1 => [
                'title' => 'Social Media: Friend or Foe?',
                'topic' => 'Discuss the advantages and disadvantages of social media for teenagers. Give your personal view with examples.',
                'word_limit_min' => 120,
                'word_limit_max' => 180,
            ],
            2 => [
                'title' => 'Should Students Have Homework?',
                'topic' => 'Some people think homework is necessary; others disagree. Discuss both views and give your own opinion.',
                'word_limit_min' => 120,
                'word_limit_max' => 180,
            ],
            3 => [
                'title' => 'Climate Change: What Can We Do?',
                'topic' => 'Climate change is one of the biggest challenges of our time. What can individuals, schools, and governments do to help?',
                'word_limit_min' => 120,
                'word_limit_max' => 180,
            ],
            4 => [
                'title' => 'A Person Who Inspires Me',
                'topic' => 'Write about a person who has inspired you — a family member, teacher, or public figure. What have you learned from them?',
                'word_limit_min' => 120,
                'word_limit_max' => 180,
            ],
            5 => [
                'title' => 'City Life vs Country Life',
                'topic' => 'Compare living in a city with living in the countryside. Consider lifestyle, opportunities, and environment.',
                'word_limit_min' => 120,
                'word_limit_max' => 180,
            ],
            6 => [
                'title' => 'The Value of Learning a Foreign Language',
                'topic' => 'Why should people learn foreign languages? Discuss at least 3 benefits and give examples from your own experience.',
                'word_limit_min' => 120,
                'word_limit_max' => 180,
            ],
            7 => [
                'title' => 'Success: Talent or Hard Work?',
                'topic' => 'Is success mainly the result of natural talent or hard work? Support your argument with reasons and examples.',
                'word_limit_min' => 120,
                'word_limit_max' => 180,
            ],
            8 => [
                'title' => 'The Impact of Artificial Intelligence',
                'topic' => 'How is artificial intelligence changing our world? Discuss its benefits and potential risks for society.',
                'word_limit_min' => 120,
                'word_limit_max' => 180,
            ],
            9 => [
                'title' => 'Looking Back, Looking Forward',
                'topic' => 'Reflect on your English learning journey. What challenges have you faced? What goals do you have for the future?',
                'word_limit_min' => 120,
                'word_limit_max' => 180,
            ],
        ];

        $continuationBank = [
            1 => [
                'title' => 'Continue: The Interview',
                'passage' => 'Mei Lin had applied for a spot on the national debate team. After three rounds of selection, she was the only student from her school to reach the final interview. The examiner looked at her over reading glasses and asked, "Tell me about a time you changed your mind about something important."',
                'topic' => 'Write Mei Lin\'s answer and describe how the interview unfolded. Show her character. Write 120-180 words.',
            ],
            2 => [
                'title' => 'Continue: The Last Forest',
                'passage' => 'The year was 2047. In the entire eastern province, only one small patch of natural forest remained, protected by an elderly man named Grandpa Hua, who had guarded it for forty years. When a property developer arrived with official documents, Grandpa Hua stood at the gate and said calmly, "Over my body."',
                'topic' => 'Continue this story. What happened? Did the forest survive? Develop the conflict and resolution. Write 120-180 words.',
            ],
            3 => [
                'title' => 'Continue: The Exchange Student',
                'passage' => 'When Clara arrived in China from Germany as an exchange student, she was prepared for the food, the language, and even the different school system. What she wasn\'t prepared for was meeting her host sister, Xiao Yu — who, it turned out, was deeply afraid of the very thing Clara loved most.',
                'topic' => 'What did Clara love most? How did the two girls learn from each other? Continue the story. Write 120-180 words.',
            ],
            4 => [
                'title' => 'Continue: The Photograph',
                'passage' => 'While sorting through an old box in the attic, Daniel found a black-and-white photograph of a young soldier. On the back, in faded ink, were the words: "To whoever finds this — please remember us." There was a date: June 1944.',
                'topic' => 'What did Daniel decide to do with the photograph? Continue the story, exploring its emotional impact. Write 120-180 words.',
            ],
            5 => [
                'title' => 'Continue: Midnight Decision',
                'passage' => 'At midnight, 17-year-old Alex sat at the kitchen table staring at two letters. One was an acceptance from a top university in Shanghai. The other was from a music school in Vienna — where his dream of becoming a composer could finally become real. His parents were asleep.',
                'topic' => 'What decision did Alex make, and why? Explore his thoughts and feelings. Write 120-180 words.',
            ],
            6 => [
                'title' => 'Continue: The Protest',
                'passage' => 'A hundred students stood outside the school gates holding signs. They weren\'t angry — they were quiet and organized. The sign in Wang Fang\'s hand read: "We deserve a library, not a parking lot." The principal watched from her office window.',
                'topic' => 'What happened next? How was the conflict resolved? Write from any character\'s perspective. Write 120-180 words.',
            ],
            7 => [
                'title' => 'Continue: An Unexpected Journey',
                'passage' => 'The train was supposed to arrive in Chengdu at 3 PM. It was now 9 PM, the train had stopped in an unknown small town due to flooding on the tracks, and Lin Xia had only one full charge on her phone. She was travelling alone for the first time.',
                'topic' => 'How did Lin Xia handle the unexpected situation? What did she discover about herself? Write 120-180 words.',
            ],
            8 => [
                'title' => 'Continue: The Last Practice',
                'passage' => 'It was Coach Zheng\'s final day before retirement. He sat alone on the empty basketball court, thinking about the thirty years he had spent coaching young players. Most had gone on to ordinary lives, but one — Chen Bo — had just been selected for the national team.',
                'topic' => 'Continue the story. Did Chen Bo visit Coach Zheng? What did they say to each other? Write 120-180 words.',
            ],
            9 => [
                'title' => 'Continue: Ten Years Later',
                'passage' => 'Ten years had passed since graduation. Five former classmates met again at a reunion in their hometown. They had all taken very different paths — some expected, some surprising. As they sat down together for the first time in a decade, the silence was filled with unspoken words.',
                'topic' => 'Describe the reunion scene. What did they share? What had changed? Write 120-180 words.',
            ],
        ];

        $t = $topicBank[$stageNo] ?? $topicBank[1];
        $c = $continuationBank[$stageNo] ?? $continuationBank[1];

        return [
            array_merge($t, ['writing_type' => 'topic', 'passage' => null,
                'scoring_criteria' => ['relevance' => 25, 'language' => 25, 'grammar' => 25, 'coherence' => 25]]),
            array_merge($c, ['writing_type' => 'continuation', 'word_limit_min' => 120, 'word_limit_max' => 180,
                'scoring_criteria' => ['relevance' => 30, 'language' => 25, 'grammar' => 25, 'coherence' => 20]]),
        ];
    }
}
