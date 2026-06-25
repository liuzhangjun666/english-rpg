<?php

/**
 * 生成高中（金丹 J1）阅读短文与小题，供 ReadingBankSeeder 导入。
 */
class SeniorReadingGenerator
{
    /** @return list<array<string, mixed>> */
    public function generate(): array
    {
        $passages = [];
        $templates = $this->templates();
        // 游戏每境界 9 关：优先使用较新的 9 篇（索引 9-17），保留前 9 篇作扩展池
        $stageTemplates = count($templates) > 9
            ? array_slice($templates, 9, 9)
            : array_slice($templates, 0, 9);

        foreach ($stageTemplates as $index => $template) {
            $stageNo = $index + 1;
            $stage = str_pad((string) $stageNo, 2, '0', STR_PAD_LEFT);
            $grade = $stageNo <= 3 ? '高一' : ($stageNo <= 6 ? '高二' : '高三');

            $passages[] = [
                'realm' => 'J1',
                'stage' => $stage,
                'level_tag' => '高中',
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
                'title' => 'The School Newspaper',
                'content' => 'When I entered senior high, I was too shy to speak in class. One day, our English teacher encouraged us to join the school newspaper. I loved writing but doubted whether my English was good enough. Still, I submitted a short article about campus recycling. To my surprise, it was published in the next issue. Other students began discussing my ideas in the hallway. Encouraged by their response, I interviewed the cafeteria manager about food waste and wrote a follow-up story. The experience taught me that clear writing is not about using difficult words, but about helping readers understand what matters. Now I edit the environment column and help new members revise their drafts.',
                'questions' => [
                    $this->single('Why did the writer doubt joining the newspaper at first?', 'A', [
                        'A' => 'He was not interested in writing.',
                        'B' => 'He worried his English was not good enough.',
                        'C' => 'He disliked the English teacher.',
                        'D' => 'He had no time after class.',
                    ], '他起初担心自己英语不够好。', 'detail'),
                    $this->single('What was the writer’s first published article about?', 'B', [
                        'A' => 'Interview skills',
                        'B' => 'Campus recycling',
                        'C' => 'Food waste only',
                        'D' => 'Classroom speaking',
                    ], '首篇文章写的是校园回收。', 'detail'),
                    $this->single('What lesson did the writer learn from the experience?', 'C', [
                        'A' => 'Writers should use difficult words.',
                        'B' => 'Shy students should avoid interviews.',
                        'C' => 'Clear writing helps readers understand what matters.',
                        'D' => 'Newspaper work is easier than speaking in class.',
                    ], '作者体会到清晰写作在于让读者理解重点。', 'infer'),
                ],
            ],
            [
                'title' => 'A Volunteer Trip',
                'content' => 'Last summer, our class volunteered in a mountain village for two weeks. We helped repair an old library, catalog books, and teach children simple science experiments. The village had limited internet access, so we prepared paper materials in advance. On the first day, the children were quiet, but when we showed them how to make a small volcano with baking soda, they laughed and asked questions eagerly. One boy told me he wanted to become a teacher so he could help more kids in his hometown. Before leaving, the villagers organized a simple farewell dinner. Although we were tired, none of us complained. The trip changed my understanding of education: knowledge becomes meaningful only when it is shared with others.',
                'questions' => [
                    $this->single('How long did the volunteer trip last?', 'B', [
                        'A' => 'One week',
                        'B' => 'Two weeks',
                        'C' => 'One month',
                        'D' => 'Three days',
                    ], '支教持续了十四天。', 'detail'),
                    $this->single('Why did the students prepare paper materials in advance?', 'A', [
                        'A' => 'The village had limited internet access.',
                        'B' => 'The children disliked experiments.',
                        'C' => 'Books were not allowed in the library.',
                        'D' => 'The teacher cancelled online classes.',
                    ], '村里网络有限，因此提前准备纸质材料。', 'detail'),
                    $this->single('What did the writer learn from the trip?', 'D', [
                        'A' => 'Science experiments are always easy.',
                        'B' => 'Villagers dislike visitors.',
                        'C' => 'Education should stay in cities.',
                        'D' => 'Knowledge matters when it is shared with others.',
                    ], '作者认识到知识在分享中才有意义。', 'infer'),
                ],
            ],
            [
                'title' => 'Learning from Failure',
                'content' => 'In my first physics competition, I was confident because I had memorized many formulas. During the final problem, however, I realized I did not understand how to apply them to a real-world situation involving bridge design. I spent so much time on one question that I failed to finish the paper. After the results came out, my teacher did not criticize me. Instead, she asked me to explain my thinking step by step. Together we found that I had ignored the importance of units and practical limits. The next month, I joined a small study group where we solved open-ended problems every Friday. I still make mistakes, but now I treat each error as data that shows what I need to improve.',
                'questions' => [
                    $this->single('Why did the writer fail to finish the competition paper?', 'C', [
                        'A' => 'He forgot all the formulas.',
                        'B' => 'The teacher took his paper early.',
                        'C' => 'He spent too much time on one question.',
                        'D' => 'The bridge design topic was not taught.',
                    ], '他在一题上耗时过多导致未能做完。', 'detail'),
                    $this->single('What mistake did the writer and teacher discover?', 'B', [
                        'A' => 'He studied with the wrong group.',
                        'B' => 'He ignored units and practical limits.',
                        'C' => 'He refused to explain his thinking.',
                        'D' => 'He memorized too few formulas.',
                    ], '问题在于忽视单位与实际限制。', 'detail'),
                    $this->single('How does the writer treat mistakes now?', 'A', [
                        'A' => 'As data showing what to improve.',
                        'B' => 'As signs to quit competitions.',
                        'C' => 'As proof that formulas are useless.',
                        'D' => 'As reasons to avoid group study.',
                    ], '现在他把错误当作改进线索。', 'infer'),
                ],
            ],
            [
                'title' => 'The City Library at Night',
                'content' => 'Our city library recently began opening until 10 p.m. on weekdays. The change was designed for students who share small apartments with noisy families and for office workers preparing for evening exams. I started going there twice a week after dinner. The reading room is quiet, but not silent: you can hear pages turning and keyboards tapping softly. Librarians also host short writing workshops near the window seats. Some people argue that late hours waste electricity, yet the library uses motion-sensor lights and solar panels installed last year. Since the new schedule began, the number of borrowed books has risen by eighteen percent. For me, the library has become a place where concentration is respected.',
                'questions' => [
                    $this->single('Why was the library schedule changed?', 'C', [
                        'A' => 'To replace online courses.',
                        'B' => 'To attract tourists.',
                        'C' => 'To help students and workers who need quiet study time at night.',
                        'D' => 'To reduce the number of borrowed books.',
                    ], '延长开放是为需要夜间安静学习的人服务。', 'detail'),
                    $this->single('What has happened since the new schedule began?', 'B', [
                        'A' => 'Borrowing dropped sharply.',
                        'B' => 'Borrowed books increased by eighteen percent.',
                        'C' => 'Workshops were cancelled.',
                        'D' => 'Solar panels were removed.',
                    ], '借书量上升了百分之十八。', 'detail'),
                    $this->single('What does the library mean to the writer?', 'D', [
                        'A' => 'A place to avoid families.',
                        'B' => 'A noisy social club.',
                        'C' => 'A building that wastes electricity.',
                        'D' => 'A place where concentration is respected.',
                    ], '对作者而言图书馆是尊重专注的地方。', 'infer'),
                ],
            ],
            [
                'title' => 'A Debate on Phones',
                'content' => 'Our school held a debate on whether students should be allowed to use phones during lunch breaks. Supporters said phones help them check schedules, contact parents, and relax with music. Opponents worried that online games and short videos would spread quickly and reduce face-to-face conversation. I spoke for limited use: phones may stay in pockets, but screens must remain off unless a teacher approves educational use. After the debate, the student council collected suggestions and designed phone lockers near the cafeteria. Students who volunteer to store their phones receive small reward points for reading clubs. Two months later, teachers reported fewer arguments at lunch, though some students still missed their games. The policy is not perfect, but it shows that rules work better when students help create them.',
                'questions' => [
                    $this->single('What concern did opponents raise?', 'B', [
                        'A' => 'Phones cannot check schedules.',
                        'B' => 'Games and videos might reduce face-to-face talk.',
                        'C' => 'Parents refuse to call students.',
                        'D' => 'Music damages hearing at lunch.',
                    ], '反对方担心游戏和视频减少面对面交流。', 'detail'),
                    $this->single('What solution did the student council design?', 'C', [
                        'A' => 'Banning all phones forever.',
                        'B' => 'Deleting game apps for everyone.',
                        'C' => 'Phone lockers near the cafeteria.',
                        'D' => 'Longer lunch breaks for gaming.',
                    ], '学生会设计了餐厅旁的手机保管柜。', 'detail'),
                    $this->single('What is the writer’s main point?', 'A', [
                        'A' => 'Rules work better when students help create them.',
                        'B' => 'Debates should never change school policy.',
                        'C' => 'Teachers should ignore student opinions.',
                        'D' => 'Phones must be used freely at lunch.',
                    ], '作者强调规则由学生参与制定更有效。', 'infer'),
                ],
            ],
            [
                'title' => 'The Community Garden',
                'content' => 'Behind our apartment building stood an empty lot filled with broken bricks and plastic bags. Last spring, neighbors turned it into a community garden. Retired engineer Mr. Chen built raised beds, while teenagers carried soil on weekends. We planted tomatoes, mint, and sunflowers. At first, some residents complained that the garden attracted insects. The organizers explained that native flowers support local bees and that organic methods reduce pests naturally. Children labeled each plant with English and Chinese names, turning the garden into an outdoor classroom. By autumn, families shared harvest soup at a small festival. The lot that once looked abandoned now connects people who previously only nodded in the elevator.',
                'questions' => [
                    $this->single('What was the lot like before the project?', 'D', [
                        'A' => 'A busy market.',
                        'B' => 'A school playground.',
                        'C' => 'A finished garden.',
                        'D' => 'A messy empty space with bricks and plastic.',
                    ], '原先是一块堆着砖块和塑料袋的空地。', 'detail'),
                    $this->single('How did children use the garden?', 'B', [
                        'A' => 'They sold insects to visitors.',
                        'B' => 'They labeled plants in two languages.',
                        'C' => 'They removed all the flowers.',
                        'D' => 'They refused to help carry soil.',
                    ], '孩子用中英双语给植物做标签。', 'detail'),
                    $this->single('What change happened among neighbors?', 'C', [
                        'A' => 'They stopped using the elevator.',
                        'B' => 'They moved out of the building.',
                        'C' => 'They became more connected through the garden.',
                        'D' => 'They banned weekend work.',
                    ], '花园让邻居从点头之交变得更有联系。', 'infer'),
                ],
            ],
            [
                'title' => 'Preparing for a Speech',
                'content' => 'When I was chosen to represent our grade in an English speech contest, panic replaced pride. I wrote five versions of the opening paragraph and still disliked all of them. My classmate Mei suggested recording myself on her phone so I could hear rushed sentences and unclear stress. Listening was uncomfortable, but it worked. I shortened long clauses, added pauses before key ideas, and practiced gestures in front of a mirror. On contest day, my hands shook during the first sentence, yet I remembered Mei’s advice to breathe and look at friendly faces in the audience. I did not win first prize, but judges praised my clear structure. The real victory was learning that practice can turn fear into focus.',
                'questions' => [
                    $this->single('How did Mei help the writer improve?', 'A', [
                        'A' => 'By recording the speech so the writer could hear problems.',
                        'B' => 'By writing the whole speech for the writer.',
                        'C' => 'By asking the writer to skip practice.',
                        'D' => 'By telling the writer to read faster.',
                    ], '梅用录音帮助作者发现问题。', 'detail'),
                    $this->single('What happened on contest day?', 'B', [
                        'A' => 'The writer refused to speak.',
                        'B' => 'The writer felt nervous but continued with breathing and eye contact.',
                        'C' => 'The writer won first prize.',
                        'D' => 'Mei replaced the writer on stage.',
                    ], '比赛当天作者紧张但坚持完成演讲。', 'detail'),
                    $this->single('What does the writer consider the real victory?', 'D', [
                        'A' => 'Winning first prize.',
                        'B' => 'Deleting every draft.',
                        'C' => 'Avoiding the audience.',
                        'D' => 'Learning that practice can turn fear into focus.',
                    ], '真正的收获是练习能把恐惧转化为专注。', 'infer'),
                ],
            ],
            [
                'title' => 'A Museum Guide',
                'content' => 'During the winter holiday, I worked as a volunteer guide in the city museum. My job was to explain a new exhibition on ancient trade routes. To prepare, I read historians’ articles and practiced answers to visitors’ questions. One afternoon, a group of middle school students arrived. They were more interested in a broken pottery jar than in maps on the wall. Instead of continuing my script, I asked them to guess what the jar once carried. Their ideas—salt, tea, medicine—led to a lively discussion about how ordinary objects reveal history. My supervisor later told me that good guides listen before they lecture. That sentence now appears above my desk.',
                'questions' => [
                    $this->single('What did the writer do to prepare for the job?', 'C', [
                        'A' => 'Ignored historians’ articles.',
                        'B' => 'Only memorized one sentence.',
                        'C' => 'Read articles and practiced answering questions.',
                        'D' => 'Refused to talk with visitors.',
                    ], '作者阅读史料并练习回答问题。', 'detail'),
                    $this->single('Why did the discussion become lively?', 'B', [
                        'A' => 'The students damaged the pottery jar.',
                        'B' => 'The guide invited students to guess what the jar carried.',
                        'C' => 'Maps were removed from the wall.',
                        'D' => 'The supervisor cancelled the tour.',
                    ], '导游让学生猜测陶罐用途引发讨论。', 'detail'),
                    $this->single('What advice did the supervisor give?', 'A', [
                        'A' => 'Good guides listen before they lecture.',
                        'B' => 'Guides should never change the script.',
                        'C' => 'Students should not visit museums.',
                        'D' => 'Broken objects should be hidden.',
                    ], '主管说优秀讲解员先倾听再讲解。', 'infer'),
                ],
            ],
            [
                'title' => 'Choosing a Major',
                'content' => 'As graduation approaches, classmates constantly ask one another about university majors. My parents hope I will study medicine because they believe it offers a stable future. I respect their concern, yet I am drawn to environmental science after joining a river cleanup project. The work was tiring: we pulled tires, plastic bottles, and even a broken chair from the water. Still, seeing fish return to a clearer section made the effort worthwhile. I know choosing a major is not only about interest or income. It is about the problems I am willing to work on for many years. This month I scheduled a long talk with my parents, bringing data on green jobs and internship plans. Communication, I hope, will help us choose a path together.',
                'questions' => [
                    $this->single('Why are the writer’s parents interested in medicine?', 'B', [
                        'A' => 'They dislike environmental work.',
                        'B' => 'They believe it offers a stable future.',
                        'C' => 'They met doctors during a river cleanup.',
                        'D' => 'They want the writer to avoid university.',
                    ], '父母认为医学前景稳定。', 'detail'),
                    $this->single('What made the river cleanup worthwhile for the writer?', 'D', [
                        'A' => 'Finding a broken chair to sell.',
                        'B' => 'Convincing classmates to quit school.',
                        'C' => 'Avoiding communication with parents.',
                        'D' => 'Seeing fish return to clearer water.',
                    ], '看到鱼回到更清澈的水域让努力值得。', 'detail'),
                    $this->single('How does the writer plan to discuss the decision with parents?', 'C', [
                        'A' => 'By refusing to share any plans.',
                        'B' => 'By choosing a major secretly.',
                        'C' => 'By bringing data on green jobs and internship plans.',
                        'D' => 'By asking teachers to decide alone.',
                    ], '作者准备用绿色就业数据和实习计划与父母沟通。', 'infer'),
                ],
            ],
            [
                'title' => 'AI Tools in the Classroom',
                'content' => 'Our school recently introduced an AI writing assistant that suggests grammar corrections and clearer sentence structures. Some teachers welcomed it because students could receive faster feedback on drafts. Others worried that students might copy suggestions without thinking. Our class discussed guidelines: AI may check grammar, but ideas and evidence must come from the student. I tested the tool on an essay about local traffic safety. It corrected tense mistakes, yet it could not judge whether my statistics were reliable. I had to verify numbers on the city website myself. The experience showed me that AI is a helper, not a replacement for careful research and personal judgment.',
                'questions' => [
                    $this->single('What can the AI tool do according to the passage?', 'B', [
                        'A' => 'Write original ideas for students.',
                        'B' => 'Suggest grammar corrections and clearer structures.',
                        'C' => 'Replace teachers in every class.',
                        'D' => 'Guarantee reliable statistics automatically.',
                    ], 'AI 可提示语法和句式修改。', 'detail'),
                    $this->single('What rule did the class agree on?', 'C', [
                        'A' => 'Students must copy all AI suggestions.',
                        'B' => 'AI should choose essay topics.',
                        'C' => 'AI may check grammar, but ideas and evidence must come from students.',
                        'D' => 'Statistics do not need verification.',
                    ], '班级约定观点与论据须由学生本人完成。', 'detail'),
                    $this->single('What conclusion did the writer reach?', 'A', [
                        'A' => 'AI helps, but cannot replace careful research and judgment.',
                        'B' => 'AI makes research unnecessary.',
                        'C' => 'Teachers should ban all drafts.',
                        'D' => 'Traffic data is always wrong online.',
                    ], '作者认为 AI 是助手，不能替代严谨研究。', 'infer'),
                ],
            ],
            [
                'title' => 'A Cultural Exchange Online',
                'content' => 'Last term, our school connected with a partner school in Spain through a video exchange program. Each week, four students shared presentations about daily life, school clubs, and local food. I introduced Sichuan hotpot and explained why sharing meals matters in my family. A Spanish student named Lucia showed pictures of her town’s tomato festival. At first, we spoke slowly and sometimes searched for words, but classmates on both sides were patient. After six sessions, we collaborated on a bilingual poster about reducing food waste in school cafeterias. The project taught me that cultural exchange is not only about language performance; it is about listening carefully and building ideas together.',
                'questions' => [
                    $this->single('What did students share in the program?', 'D', [
                        'A' => 'Only grammar rules.',
                        'B' => 'Exam answers.',
                        'C' => 'Travel tickets.',
                        'D' => 'Presentations about daily life, clubs, and local food.',
                    ], '学生分享日常生活、社团和当地美食。', 'detail'),
                    $this->single('What final product did both sides create?', 'B', [
                        'A' => 'A hotpot restaurant menu.',
                        'B' => 'A bilingual poster about reducing cafeteria food waste.',
                        'C' => 'A new language textbook.',
                        'D' => 'A tomato festival ticket.',
                    ], '双方合作完成减少食堂浪费的双语海报。', 'detail'),
                    $this->single('What does the writer think cultural exchange requires?', 'C', [
                        'A' => 'Perfect pronunciation only.',
                        'B' => 'Avoiding slow speech.',
                        'C' => 'Careful listening and building ideas together.',
                        'D' => 'Competing against partner schools.',
                    ], '文化交流需要倾听并共同建构想法。', 'infer'),
                ],
            ],
            [
                'title' => 'The School Orchestra',
                'content' => 'I joined the school orchestra without knowing how to read music fluently. The conductor, Mr. Park, paired me with a violin partner who marked breathing and bowing cues on my sheet. Rehearsals were strict: we repeated eight measures twenty times until the rhythm matched. Before the winter concert, I wanted to quit because my hands shook on stage during practice. Mr. Park said, "Nerves mean you care. Prepare more than you fear." On concert night, I still felt nervous, but muscle memory carried me through the opening piece. Afterward, a parent told me the slow movement sounded peaceful. That comment made me understand that discipline and teamwork can turn anxiety into music.',
                'questions' => [
                    $this->single('How did the writer’s partner help?', 'A', [
                        'A' => 'By marking cues on the sheet.',
                        'B' => 'By replacing the writer on stage.',
                        'C' => 'By cancelling rehearsals.',
                        'D' => 'By choosing concert clothes.',
                    ], '搭档在谱面上标注提示。', 'detail'),
                    $this->single('What advice did Mr. Park give?', 'B', [
                        'A' => 'Quit if you feel nervous.',
                        'B' => 'Prepare more than you fear.',
                        'C' => 'Skip the opening piece.',
                        'D' => 'Ignore rhythm practice.',
                    ], '指挥说准备要胜过恐惧。', 'detail'),
                    $this->single('What did the writer learn from the experience?', 'D', [
                        'A' => 'Music requires no teamwork.',
                        'B' => 'Concerts should avoid slow movements.',
                        'C' => 'Nerves mean a student does not care.',
                        'D' => 'Discipline and teamwork can turn anxiety into music.',
                    ], '作者体会到纪律与合作能把焦虑化为演奏。', 'infer'),
                ],
            ],
            [
                'title' => 'Starting a Recycling Club',
                'content' => 'When I noticed our classroom bin mixed paper with plastic bottles, I asked three classmates to start a recycling club. We surveyed every floor and found that most students wanted clearer labels but did not know where sorted waste went. The club invited a city environmental officer to explain the recycling route from school to factory. We then designed color-coded posters and placed them beside bins. Teachers worried the project would disturb study time, so we limited meetings to twenty minutes at lunch. Within a month, paper collection doubled. The principal featured our project in the school newsletter. I learned that change on campus begins with observation, data, and respectful communication with adults.',
                'questions' => [
                    $this->single('Why did the writer start the club?', 'C', [
                        'A' => 'To cancel environmental classes.',
                        'B' => 'To sell bottles for profit.',
                        'C' => 'Because classroom waste was not sorted properly.',
                        'D' => 'Because the factory needed workers.',
                    ], '教室垃圾桶混投促使作者成立社团。', 'detail'),
                    $this->single('What did the survey show?', 'A', [
                        'A' => 'Students wanted clearer labels but lacked knowledge about recycling routes.',
                        'B' => 'Students refused to recycle.',
                        'C' => 'Teachers banned all posters.',
                        'D' => 'Paper collection was already perfect.',
                    ], '调查表明大家需要更清楚标识和流程说明。', 'detail'),
                    $this->single('What lesson did the writer learn?', 'B', [
                        'A' => 'Adults should not be involved.',
                        'B' => 'Campus change begins with observation, data, and respectful communication.',
                        'C' => 'Meetings must last two hours.',
                        'D' => 'Newsletters replace recycling bins.',
                    ], '作者学到观察、数据与沟通是校园改变的起点。', 'infer'),
                ],
            ],
            [
                'title' => 'An Internship at a Local Lab',
                'content' => 'During the summer, I interned at a university lab that studies clean energy materials. My tasks included labeling samples, recording temperatures, and cleaning equipment. I expected exciting discoveries every day, but much of the work was repetitive. One afternoon, a graduate student showed me how a tiny error in labeling could ruin a week of experiments. I began checking each number twice. Near the end of the internship, the team let me help test a new solar film. The results were not perfect, yet the lead researcher explained how failed tests narrow the path to success. I left the lab with a quieter kind of excitement—respect for careful process, not just dramatic breakthroughs.',
                'questions' => [
                    $this->single('What was part of the writer’s daily work?', 'D', [
                        'A' => 'Teaching university courses.',
                        'B' => 'Selling solar films.',
                        'C' => 'Writing the school newsletter.',
                        'D' => 'Labeling samples and recording temperatures.',
                    ], '日常工作包括贴标签和记录温度。', 'detail'),
                    $this->single('Why did the writer start checking numbers twice?', 'B', [
                        'A' => 'The lab banned experiments.',
                        'B' => 'A graduate student showed how labeling errors could ruin a week of work.',
                        'C' => 'Temperatures were always unimportant.',
                        'D' => 'The internship ended early.',
                    ], '标签错误可能毁掉一周实验。', 'detail'),
                    $this->single('What kind of excitement did the writer leave with?', 'A', [
                        'A' => 'Respect for careful process, not only dramatic breakthroughs.',
                        'B' => 'Disappointment with science.',
                        'C' => 'A plan to avoid labs.',
                        'D' => 'Certainty that every test succeeds.',
                    ], '作者带着对严谨过程的敬意离开。', 'infer'),
                ],
            ],
            [
                'title' => 'Balancing Clubs and Study',
                'content' => 'In Grade 11, I joined the debate club and the photography club at the same time. For two weeks I felt energized, but soon assignments piled up. My debate partner reminded me that we had a tournament on the same day as a photography exhibition. I tried to do everything alone and slept only five hours for three nights. My grades slipped in chemistry, and my photos looked rushed. I met with our counselor, who helped me build a weekly plan with fixed study blocks and one free evening for rest. I kept debate and photography, but I stopped joining every optional event. Performance improved in both clubs after I learned to choose depth over quantity.',
                'questions' => [
                    $this->single('What problem did the writer face?', 'C', [
                        'A' => 'Both clubs were cancelled.',
                        'B' => 'The counselor refused to help.',
                        'C' => 'Assignments piled up and schedules conflicted.',
                        'D' => 'Photography was banned at school.',
                    ], '作业堆积且赛程与展览冲突。', 'detail'),
                    $this->single('How did the counselor help?', 'B', [
                        'A' => 'By forcing the writer to quit all clubs.',
                        'B' => 'By helping build a weekly plan with study blocks and rest.',
                        'C' => 'By changing the tournament date.',
                        'D' => 'By writing chemistry homework.',
                    ], '咨询师帮助制定含学习块与休息的计划。', 'detail'),
                    $this->single('What strategy worked in the end?', 'D', [
                        'A' => 'Joining every optional event.',
                        'B' => 'Sleeping five hours every night.',
                        'C' => 'Doing everything alone without planning.',
                        'D' => 'Choosing depth over quantity.',
                    ], '最终策略是重深度而非贪多。', 'infer'),
                ],
            ],
            [
                'title' => 'Reading Classics in English',
                'content' => 'Our literature teacher assigned *Of Mice and Men* and asked us to keep reading journals in English. The language was harder than the short stories we read in Grade 10. I read each chapter twice: first for plot, second for character motives. In my journal, I argued that George’s decisions came from loyalty mixed with fear. A class debate followed, and students cited different chapters as evidence. I initially felt embarrassed when I mispronounced a character’s name, but the teacher said mistakes are normal when entering a new literary world. By the end of the unit, I could summarize the theme in five sentences without looking at notes. Classics now feel less like punishment and more like training for deeper thinking.',
                'questions' => [
                    $this->single('How did the writer read each chapter?', 'A', [
                        'A' => 'First for plot, then for character motives.',
                        'B' => 'Only once for vocabulary lists.',
                        'C' => 'Only in Chinese translation.',
                        'D' => 'By skipping difficult chapters.',
                    ], '作者先读情节再读人物动机。', 'detail'),
                    $this->single('What was the class activity after journaling?', 'C', [
                        'A' => 'A chemistry lab.',
                        'B' => 'A photography exhibition.',
                        'C' => 'A debate citing chapters as evidence.',
                        'D' => 'A silent spelling test.',
                    ], '之后进行以章节为据的辩论。', 'detail'),
                    $this->single('How does the writer view classics now?', 'B', [
                        'A' => 'As punishment for mispronunciation.',
                        'B' => 'As training for deeper thinking.',
                        'C' => 'As easier than short stories.',
                        'D' => 'As unnecessary for exams.',
                    ], '作者现在把经典当作深度思维训练。', 'infer'),
                ],
            ],
            [
                'title' => 'Planning a Gap Year',
                'content' => 'After mock exams, my cousin told me she would take a gap year before university to volunteer abroad and improve her Spanish. My parents worried she might lose study habits, but she showed them a detailed plan with language courses, service hours, and a return date. I helped her compare programs and noticed that the best ones required application essays about personal values, not just grades. Her example made me rethink my own future timeline. I may go straight to university, yet I now believe a gap year can be purposeful if it includes goals, budgets, and accountability. Growth, I realize, does not always follow the fastest path.',
                'questions' => [
                    $this->single('Why were the writer’s parents worried?', 'D', [
                        'A' => 'Spanish was too easy.',
                        'B' => 'Volunteering abroad is illegal.',
                        'C' => 'Universities banned gap years.',
                        'D' => 'They feared she might lose study habits.',
                    ], '父母担心她荒废学习习惯。', 'detail'),
                    $this->single('What did strong programs require?', 'A', [
                        'A' => 'Application essays about personal values.',
                        'B' => 'Only perfect grades.',
                        'C' => 'No return date.',
                        'D' => 'Avoiding language courses.',
                    ], '优质项目看重价值观申请文书。', 'detail'),
                    $this->single('What belief does the writer express about growth?', 'C', [
                        'A' => 'Growth must follow the fastest path.',
                        'B' => 'Gap years never include goals.',
                        'C' => 'Growth does not always follow the fastest path.',
                        'D' => 'Budgets are unnecessary for volunteering.',
                    ], '成长不必总是走最快的路。', 'infer'),
                ],
            ],
            [
                'title' => 'The Youth Climate Forum',
                'content' => 'I represented our school at a youth climate forum where students presented local environmental data. Our team measured air quality near three busy intersections during rush hour. The results were worse than we expected, especially beside the old bus station. Some adults in the audience said students should focus on exams instead of public issues. A scientist replied that data collection is exactly the kind of thinking exams cannot measure alone. We proposed planting trees along the bus route and adjusting drop-off zones. Two months later, the traffic office replied with a pilot plan. I learned that respectful evidence can open doors that shouting cannot.',
                'questions' => [
                    $this->single('What did the team measure?', 'B', [
                        'A' => 'Exam scores near schools.',
                        'B' => 'Air quality near busy intersections.',
                        'C' => 'Tree height in the forest only.',
                        'D' => 'Bus ticket prices.',
                    ], '团队测量了繁忙路口的空气质量。', 'detail'),
                    $this->single('What proposal did the team make?', 'C', [
                        'A' => 'Cancel all buses.',
                        'B' => 'Stop planting trees.',
                        'C' => 'Plant trees along the bus route and adjust drop-off zones.',
                        'D' => 'Remove all student forums.',
                    ], '提议在公交沿线植树并调整上下客区。', 'detail'),
                    $this->single('What did the writer learn about creating change?', 'A', [
                        'A' => 'Respectful evidence can open doors that shouting cannot.',
                        'B' => 'Public issues should be ignored before exams.',
                        'C' => 'Data collection is useless.',
                        'D' => 'Adults never respond to students.',
                    ], '有礼有据的证据比喊叫更能打开局面。', 'infer'),
                ],
            ],
        ];
    }

    /** @return list<array<string, mixed>> */
    public function generateAll(): array
    {
        $passages = [];

        foreach ($this->templates() as $index => $template) {
            $passages[] = [
                'realm' => 'J1',
                'stage' => str_pad((string) (($index % 9) + 1), 2, '0', STR_PAD_LEFT),
                'level_tag' => '高中',
                'grade_level' => ($index % 9) + 1 <= 3 ? '高一' : (($index % 9) + 1 <= 6 ? '高二' : '高三'),
                'title' => $template['title'],
                'content' => $template['content'],
                'questions' => $template['questions'],
                'pool_index' => $index + 1,
            ];
        }

        return $passages;
    }

    /**
     * @param  array<string, string>  $options
     * @return array<string, mixed>
     */
    private function single(string $stem, string $correctKey, array $options, string $explanation, string $type): array
    {
        return [
            'question_type' => $type,
            'question' => $stem,
            'options' => $options,
            'correct_answer' => $correctKey,
            'explanation' => $explanation . '。（来源：高中阅读 · 真题风格）',
        ];
    }
}
