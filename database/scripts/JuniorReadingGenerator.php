<?php

/**
 * 生成初中（筑基 Z1）阅读短文与小题，供 ReadingBankSeeder 导入。
 */
class JuniorReadingGenerator
{
    /** @return list<array<string, mixed>> */
    public function generate(): array
    {
        $passages = [];

        foreach ($this->templates() as $index => $template) {
            $stageNo = $index + 1;
            $stage = str_pad((string) $stageNo, 2, '0', STR_PAD_LEFT);
            $grade = $stageNo <= 3 ? '七年级' : ($stageNo <= 6 ? '八年级' : '九年级');

            $passages[] = [
                'realm' => 'Z1',
                'stage' => $stage,
                'level_tag' => '初中',
                'grade_level' => $grade,
                'title' => $template['title'],
                'content' => $template['content'],
                'questions' => $template['questions'],
            ];
        }

        return $passages;
    }

    /** @return list<array<string, mixed>> */
    private function templates(): array
    {
        return [
            [
                'title' => 'My First Week in Middle School',
                'content' => 'On my first day of middle school, I got lost twice before finding Classroom 705. The building looked huge compared with my primary school. Our homeroom teacher, Ms. Wu, asked each student to write a goal card for the term. I wrote, "Speak English bravely in class." At lunch, I sat with two classmates from different primary schools. We discovered that we all loved basketball and the same science podcast. By Friday, I had joined the school basketball team and borrowed three English storybooks from the library. Middle school still feels new, but I am beginning to feel that I belong here.',
                'questions' => [
                    $this->q('What goal did the writer write on the card?', 'B', [
                        'A' => 'Win every basketball game.',
                        'B' => 'Speak English bravely in class.',
                        'C' => 'Become a homeroom teacher.',
                        'D' => 'Find the library alone.',
                    ], '目标卡上写的是勇敢开口说英语。', 'detail'),
                    $this->q('What did the writer and new classmates have in common?', 'C', [
                        'A' => 'They went to the same primary school.',
                        'B' => 'They disliked science.',
                        'C' => 'They all loved basketball and the same podcast.',
                        'D' => 'They lived in the same building.',
                    ], '三人都喜欢篮球和同一档科学播客。', 'detail'),
                    $this->q('How does the writer feel about middle school by Friday?', 'A', [
                        'A' => 'Still new but starting to belong.',
                        'B' => 'Boring and lonely.',
                        'C' => 'Too easy to get lost.',
                        'D' => 'Ready to leave school.',
                    ], '周五时作者仍觉新鲜，但开始有归属感。', 'infer'),
                ],
            ],
            [
                'title' => 'The English Corner',
                'content' => 'Every Wednesday after class, our English teacher runs an English Corner in the school garden. Students can talk about books, movies, or daily life in simple English. At first I only listened because I was afraid of making mistakes. One rainy day, only four students came. The teacher asked us to describe our favorite weather. I said, "I like sunny days because I can play badminton." Everyone nodded and asked follow-up questions. I realized they cared more about my ideas than perfect grammar. Since then, I try to speak at least two sentences each week. My pronunciation is still improving, but my confidence is growing.',
                'questions' => [
                    $this->q('When does the English Corner take place?', 'B', [
                        'A' => 'Every Monday morning.',
                        'B' => 'Every Wednesday after class.',
                        'C' => 'Only on rainy days.',
                        'D' => 'Every Friday in the library.',
                    ], '英语角在每周三课后举行。', 'detail'),
                    $this->q('Why did the writer begin to speak?', 'D', [
                        'A' => 'The teacher forced everyone to read aloud.',
                        'B' => 'There were too many students.',
                        'C' => 'Grammar tests became easier.',
                        'D' => 'A small group talk showed that ideas mattered more than perfect grammar.',
                    ], '小规模交流让作者意识到想法比语法完美更重要。', 'detail'),
                    $this->q('What change has the writer noticed?', 'C', [
                        'A' => 'Confidence is growing though pronunciation still needs work.',
                        'B' => 'He stopped attending the English Corner.',
                        'C' => 'He now speaks at least two sentences each week and feels more confident.',
                        'D' => 'He only talks about grammar rules.',
                    ], '作者每周至少说两句，信心在增强。', 'infer'),
                ],
            ],
            [
                'title' => 'Sports Day Memories',
                'content' => 'Last month our grade held a sports day on the new playground. I signed up for the 800-meter race even though I had never run that far in a competition. During training, my legs hurt and I wanted to quit. My deskmate Lin ran beside me after school and taught me how to control breathing. On sports day, I fell behind in the second lap, but classmates cheered along the track. I finished last in my heat, yet the PE teacher gave me a "Never Give Up" badge. That small badge now hangs on my schoolbag. It reminds me that effort can be as valuable as winning.',
                'questions' => [
                    $this->q('Which event did the writer join?', 'A', [
                        'A' => 'The 800-meter race.',
                        'B' => 'The long jump.',
                        'C' => 'The basketball final.',
                        'D' => 'The relay only as a referee.',
                    ], '作者参加了八百米比赛。', 'detail'),
                    $this->q('How did Lin help the writer?', 'B', [
                        'A' => 'By writing a report for the teacher.',
                        'B' => 'By running with the writer and teaching breathing control.',
                        'C' => 'By replacing the writer in the race.',
                        'D' => 'By buying a new playground.',
                    ], '同桌陪跑并教作者控制呼吸。', 'detail'),
                    $this->q('Why is the badge important to the writer?', 'D', [
                        'A' => 'It proves he won first place.',
                        'B' => 'It was a gift from the playground.',
                        'C' => 'It allows him to skip PE class.',
                        'D' => 'It reminds him that effort can be as valuable as winning.',
                    ], '徽章提醒作者努力同样珍贵。', 'infer'),
                ],
            ],
            [
                'title' => 'A Letter from My Pen Pal',
                'content' => 'I have a pen pal named Emma who lives in New Zealand. We exchange emails twice a month. In her latest message, Emma described her school camp in the mountains. Students cooked simple meals, studied stars at night, and learned basic first aid. She sent photos of a glowworm cave that looked like a green sky underground. I told her about our school art festival and sent a picture of my paper-cut work. Emma replied that she had never tried paper-cutting and asked for a short video tutorial. Writing to her makes English feel useful, not just a subject on an exam paper. We are planning to meet online during the winter holiday.',
                'questions' => [
                    $this->q('How often do the writer and Emma exchange emails?', 'C', [
                        'A' => 'Every day.',
                        'B' => 'Once a year.',
                        'C' => 'Twice a month.',
                        'D' => 'Only before exams.',
                    ], '两人每月通信两次。', 'detail'),
                    $this->q('What did Emma do at school camp?', 'B', [
                        'A' => 'She sold paper-cut works.',
                        'B' => 'She cooked, studied stars, and learned first aid.',
                        'C' => 'She taught English grammar online.',
                        'D' => 'She visited the writer in person.',
                    ], 'Emma 在营地做饭、观星并学急救。', 'detail'),
                    $this->q('What does writing to Emma make the writer feel?', 'A', [
                        'A' => 'English feels useful in real communication.',
                        'B' => 'English is too difficult to use.',
                        'C' => 'Art festivals are boring.',
                        'D' => 'Pen pals should only use paper letters.',
                    ], '与笔友通信让作者感到英语有实际用途。', 'infer'),
                ],
            ],
            [
                'title' => 'Learning About the Dragon Boat Festival',
                'content' => 'In our history class, Mr. Li asked us to research a traditional festival and present it in English. I chose the Dragon Boat Festival. I read about Qu Yuan, zongzi, and dragon boat races. My grandmother taught me to wrap zongzi at home, and I took photos for my slides. During the presentation, a classmate asked why people throw rice into the river in some old stories. I explained that the custom shows respect and memory for Qu Yuan. After class, three students said they wanted to try making zongzi together. I learned that culture is easier to understand when we connect stories with real family experiences.',
                'questions' => [
                    $this->q('What was the class assignment?', 'D', [
                        'A' => 'To race dragon boats on campus.',
                        'B' => 'To cook every festival dish in one day.',
                        'C' => 'To write a poem about Qu Yuan in Chinese only.',
                        'D' => 'To research a traditional festival and present it in English.',
                    ], '作业是调研传统节日并用英语展示。', 'detail'),
                    $this->q('How did the writer prepare for the presentation?', 'A', [
                        'A' => 'By reading about the festival and learning to wrap zongzi with his grandmother.',
                        'B' => 'By buying slides from the internet.',
                        'C' => 'By skipping history class.',
                        'D' => 'By interviewing tourists in English only.',
                    ], '作者查阅资料并向奶奶学包粽子。', 'detail'),
                    $this->q('What did the writer learn from the project?', 'C', [
                        'A' => 'Festivals should not be discussed in class.',
                        'B' => 'Only grandmothers understand culture.',
                        'C' => 'Culture is easier to understand when stories connect with family experiences.',
                        'D' => 'English presentations must avoid photos.',
                    ], '作者体会到结合家庭经历更容易理解文化。', 'infer'),
                ],
            ],
            [
                'title' => 'Our Science Fair Project',
                'content' => 'Mei and I spent three weeks preparing a science fair project about water purification. We built a simple filter with sand, charcoal, and cotton cloth. On the first test, the water still looked cloudy. We changed the order of materials and recorded each result in a table. Our classmates joked that we were "water chefs." On fair day, judges asked why clean water matters for rural schools. Mei answered with data we found online about children walking long distances to fetch water. We won second prize, but the judge’s question mattered more to us. It pushed us to think about science as a tool for solving real problems.',
                'questions' => [
                    $this->q('What was the project topic?', 'B', [
                        'A' => 'Cooking with clean water.',
                        'B' => 'Water purification.',
                        'C' => 'Building a new school.',
                        'D' => 'Growing cotton plants.',
                    ], '课题是净水。', 'detail'),
                    $this->q('Why did the first test fail?', 'A', [
                        'A' => 'The water still looked cloudy after filtering.',
                        'B' => 'They forgot to use a table.',
                        'C' => 'Judges arrived too early.',
                        'D' => 'They did not attend the fair.',
                    ], '第一次过滤后水仍浑浊。', 'detail'),
                    $this->q('What mattered more than winning second prize?', 'D', [
                        'A' => 'The joke about water chefs.',
                        'B' => 'Changing schools.',
                        'C' => 'Avoiding judges’ questions.',
                        'D' => 'Thinking about science as a tool for real problems.',
                    ], '更重要的是把科学当作解决现实问题的工具。', 'infer'),
                ],
            ],
            [
                'title' => 'A Weekend at the Bookstore',
                'content' => 'During the winter holiday, I worked part-time at a small bookstore near the subway station. My job was to shelve books and recommend children’s readers to parents. One afternoon, a boy about ten years old asked for a science book, but his budget was only twenty yuan. I helped him find a thin but well-illustrated book about space. He read the first page right there and smiled. The shop owner said I could borrow one book each week as a reward. I chose a bilingual edition of *The Old Man and the Sea*. Working at the bookstore taught me that recommending a book is like opening a door—people walk through only when they feel welcome.',
                'questions' => [
                    $this->q('What was the writer’s main job?', 'C', [
                        'A' => 'Driving the subway.',
                        'B' => 'Writing novels for children.',
                        'C' => 'Shelving books and recommending readers.',
                        'D' => 'Teaching parents English grammar.',
                    ], '主要工作是上架图书并推荐读物。', 'detail'),
                    $this->q('How did the writer help the boy?', 'B', [
                        'A' => 'By giving him money.',
                        'B' => 'By finding an affordable science book he enjoyed.',
                        'C' => 'By telling him to leave the store.',
                        'D' => 'By refusing to sell cheap books.',
                    ], '作者帮男孩挑了一本买得起且喜欢的科普书。', 'detail'),
                    $this->q('What does the writer compare recommending a book to?', 'A', [
                        'A' => 'Opening a door when people feel welcome.',
                        'B' => 'Closing a shop early.',
                        'C' => 'Winning a speech contest.',
                        'D' => 'Borrowing subway tickets.',
                    ], '荐书像打开一扇让人愿意走进的门。', 'infer'),
                ],
            ],
            [
                'title' => 'The River Cleanup',
                'content' => 'Our geography teacher organized a river cleanup near the old bridge. Twenty students joined on Saturday morning. We wore gloves, picked up plastic bags, and sorted waste into recycling bins. A local reporter interviewed us and asked why teenagers care about the river. I said, "We drink water from this city too." An elderly fisherman thanked us and shared photos of the river from thirty years ago when fish were common. His stories made the pollution feel personal, not just a news headline. After the cleanup, our class wrote a proposal asking the community center to place more bins along the path. Two weeks later, six new bins appeared. Small actions can invite bigger changes.',
                'questions' => [
                    $this->q('What did students do during the cleanup?', 'D', [
                        'A' => 'They fished for dinner.',
                        'B' => 'They painted the bridge only.',
                        'C' => 'They interviewed tourists for homework.',
                        'D' => 'They picked up waste and sorted it into recycling bins.',
                    ], '学生捡垃圾并分类回收。', 'detail'),
                    $this->q('Why did the fisherman’s photos matter?', 'B', [
                        'A' => 'They proved the reporter was wrong.',
                        'B' => 'They made pollution feel personal by showing how the river used to be.',
                        'C' => 'They showed students how to fish.',
                        'D' => 'They replaced the class proposal.',
                    ], '老照片让污染问题变得切身可感。', 'detail'),
                    $this->q('What happened after the class proposal?', 'C', [
                        'A' => 'The river was closed forever.',
                        'B' => 'Students stopped caring about recycling.',
                        'C' => 'Six new bins appeared along the path.',
                        'D' => 'The teacher cancelled geography class.',
                    ], '两周后路边新增了六个垃圾桶。', 'infer'),
                ],
            ],
            [
                'title' => 'Before the High School Exam',
                'content' => 'In the last term of junior high, time feels both fast and heavy. Every week we have mock exams, and the bulletin board updates target scores. I used to compare myself with the top student and feel anxious. Our English teacher asked us to keep a "growth notebook" recording one improvement each day, such as five new words or one corrected mistake. I also formed a study pair with my friend Jun. We quiz each other before breakfast and share healthy snacks instead of staying up too late. Last Friday, Jun said, "We may not control the score, but we can control today’s effort." That sentence calmed me. The exam is important, yet it is only one station on a longer road.',
                'questions' => [
                    $this->q('What did the English teacher ask students to keep?', 'A', [
                        'A' => 'A growth notebook.',
                        'B' => 'A list of top students.',
                        'C' => 'A phone game record.',
                        'D' => 'A bulletin board at home.',
                    ], '老师让大家记录成长笔记本。', 'detail'),
                    $this->q('How do the writer and Jun support each other?', 'B', [
                        'A' => 'By comparing scores every hour.',
                        'B' => 'By quizzing each other and avoiding staying up too late.',
                        'C' => 'By skipping mock exams.',
                        'D' => 'By hiding notebooks from teachers.',
                    ], '两人互考并避免熬夜。', 'detail'),
                    $this->q('What attitude does the writer develop toward the exam?', 'D', [
                        'A' => 'The exam is the only goal in life.',
                        'B' => 'Effort no longer matters.',
                        'C' => 'Scores can be fully controlled.',
                        'D' => 'The exam matters, but it is only one station on a longer road.',
                    ], '作者认为考试重要，只是长路中的一站。', 'infer'),
                ],
            ],
        ];
    }

    /**
     * @param  array<string, string>  $options
     * @return array<string, mixed>
     */
    private function q(string $stem, string $correctKey, array $options, string $explanation, string $type): array
    {
        return [
            'question_type' => $type,
            'question' => $stem,
            'options' => $options,
            'correct_answer' => $correctKey,
            'explanation' => $explanation . '。（来源：初中阅读 · ' . ($type === 'infer' ? '推理' : '细节') . '）',
        ];
    }
}
