<?php

/**
 * 生成大学（元婴 Y1）与研究生（化神 H1）阅读短文，供 ReadingBankSeeder 导入。
 */
class UniversityReadingGenerator
{
    /** @return list<array<string, mixed>> */
    public function forRealm(string $realm): array
    {
        $realm = strtoupper(trim($realm));
        $templates = $realm === 'H1' ? $this->graduateTemplates() : $this->undergraduateTemplates();
        $levelTag = $realm === 'H1' ? '研究生' : '大学';
        $baseGrade = $realm === 'H1' ? '研一' : '大一';

        $passages = [];
        foreach ($templates as $index => $template) {
            $stageNo = $index + 1;
            $stage = str_pad((string) $stageNo, 2, '0', STR_PAD_LEFT);
            $grade = $this->gradeLabel($baseGrade, $stageNo, $realm === 'H1');

            $passages[] = [
                'realm' => $realm,
                'stage' => $stage,
                'level_tag' => $levelTag,
                'grade_level' => $grade,
                'title' => $template['title'],
                'content' => $template['content'],
                'questions' => $template['questions'],
            ];
        }

        return $passages;
    }

  /** @return list<array<string, mixed>> */
    private function undergraduateTemplates(): array
    {
        return [
            $this->passage(
                'The First University Lecture',
                'My first university lecture had more than two hundred students in a hall with steep rows of seats. The professor walked in without calling names and began with a question: "Why does evidence matter more than confidence?" Students typed quickly on laptops while others took notes by hand. I missed part of the introduction because I sat too far back and hesitated to ask classmates. After class, I moved to the second row and introduced myself to the student beside me. She shared her annotated slides and suggested joining a study group on Thursday evenings. University learning, I realized, rewards those who prepare before class and connect with others early.',
                [
                    $this->q('How many students were in the lecture?', 'C', ['A' => 'About fifty.', 'B' => 'About one hundred.', 'C' => 'More than two hundred.', 'D' => 'Fewer than twenty.'], '课堂有两百多人。', 'detail'),
                    $this->q('What did the writer do after the first class?', 'B', ['A' => 'Stopped taking notes.', 'B' => 'Moved forward and joined a study network.', 'C' => 'Dropped the course.', 'D' => 'Asked the professor to reduce seats.'], '作者前移座位并结识同学。', 'detail'),
                    $this->q('What does university learning reward according to the writer?', 'A', ['A' => 'Preparing before class and connecting with others early.', 'B' => 'Sitting far back silently.', 'C' => 'Avoiding study groups.', 'D' => 'Confidence without evidence.'], '大学学习奖励课前准备和主动联结。', 'infer'),
                ]
            ),
            $this->passage(
                'Life in the Dormitory',
                'During my first semester, I shared a dormitory with three roommates from different majors. We agreed on quiet hours after eleven p.m., but one roommate often edited videos late at night with bright lights. Instead of arguing, we bought a small desk lamp with a warm shade and set a rotating schedule for laundry day. We also taped a whiteboard near the door for messages about packages and exam weeks. The small system reduced friction and made the room feel like a team. I learned that adult roommates do not need identical habits; they need clear agreements and small compromises.',
                [
                    $this->q('What problem appeared at night?', 'D', ['A' => 'Laundry machines broke.', 'B' => 'The dormitory banned lights.', 'C' => 'Everyone studied loudly.', 'D' => 'A roommate edited videos late with bright lights.'], '室友深夜用亮灯剪辑视频。', 'detail'),
                    $this->q('What solution did they use?', 'A', ['A' => 'A softer lamp and a laundry schedule.', 'B' => 'A new dormitory building.', 'C' => 'Separate majors by floor.', 'D' => 'No messages allowed.'], '他们用暖色台灯和洗衣轮班解决。', 'detail'),
                    $this->q('What did the writer learn about roommates?', 'C', ['A' => 'They must share one major.', 'B' => 'They should never compromise.', 'C' => 'Clear agreements and small compromises matter.', 'D' => 'Whiteboards cause arguments.'], '室友间需要明确约定与适度妥协。', 'infer'),
                ]
            ),
            $this->passage(
                'Joining a Research Lab',
                'In my second year, I emailed five professors about research opportunities. Only one replied, inviting me to read two papers before an interview. I summarized each paper in one page and listed questions about methods I did not understand. During the interview, the professor cared less about my grades and more about whether I could explain why the research mattered. I joined a lab studying bilingual education and spent weeks coding interview transcripts. The work was slower than exams, yet it taught me patience and how knowledge is built step by step.',
                [
                    $this->q('How did the writer prepare for the interview?', 'B', ['A' => 'By memorizing grades only.', 'B' => 'By summarizing papers and listing method questions.', 'C' => 'By skipping the reading.', 'D' => 'By emailing ten more professors.'], '作者精读论文并整理问题。', 'detail'),
                    $this->q('What mattered most to the professor?', 'D', ['A' => 'Perfect exam scores.', 'B' => 'Fast coding speed only.', 'C' => 'Avoiding interviews.', 'D' => 'Whether the writer could explain why the research mattered.'], '教授更看重能否说明研究意义。', 'detail'),
                    $this->q('What did lab work teach the writer?', 'A', ['A' => 'Patience and how knowledge is built step by step.', 'B' => 'That research is faster than exams.', 'C' => 'That summaries are useless.', 'D' => 'That grades replace reading.'], '实验工作教会耐心与知识累积。', 'infer'),
                ]
            ),
            $this->passage(
                'The Campus Career Fair',
                'Our career center hosted a fair with companies, NGOs, and graduate programs. I arrived with thirty copies of my resume and a short self-introduction in English. After two hours, I realized recruiters cared more about projects than course titles. One NGO manager asked how I handled failure in a team project. I described a science fair filter that failed twice before working. She said practical stories are more memorable than perfect GPAs. I followed up with a thank-you email that night and received an internship interview invitation the next week.',
                [
                    $this->q('What did recruiters care about more?', 'C', ['A' => 'Only course titles.', 'B' => 'The number of resumes printed.', 'C' => 'Projects and practical stories.', 'D' => 'Perfect GPAs alone.'], '招聘方更看重项目与实践故事。', 'detail'),
                    $this->q('What example did the writer share?', 'B', ['A' => 'Winning every competition.', 'B' => 'A science fair filter that failed before working.', 'C' => 'Avoiding team projects.', 'D' => 'Skipping follow-up emails.'], '作者分享科学展过滤器经历。', 'detail'),
                    $this->q('What happened after the thank-you email?', 'D', ['A' => 'The fair was cancelled.', 'B' => 'The writer lost the resume.', 'C' => 'NGOs refused interviews.', 'D' => 'The writer received an internship interview invitation.'], '感谢信后收到实习面试邀请。', 'infer'),
                ]
            ),
            $this->passage(
                'Studying Abroad for One Term',
                'I spent one term at a partner university in Canada. The first month was difficult: grocery labels, bus routes, and academic citations all followed different rules. I joined a conversation partner program and cooked dinner with local students every Sunday. They corrected my expressions gently and taught me campus slang I would never find in textbooks. My sociology professor required weekly reading responses instead of one final exam. That rhythm forced me to stay engaged all term. Studying abroad, I learned, is not only about seeing new places; it is about rebuilding daily systems in another language.',
                [
                    $this->q('What made the first month difficult?', 'A', ['A' => 'Different daily and academic rules.', 'B' => 'No grocery stores.', 'C' => 'No conversation partners.', 'D' => 'Only one final exam.'], '生活与学术规则都不同。', 'detail'),
                    $this->q('How did the writer improve language skills?', 'C', ['A' => 'By avoiding local students.', 'B' => 'By reading only textbooks.', 'C' => 'Through conversation partners and Sunday dinners.', 'D' => 'By skipping citations.'], '通过语伴和周日聚餐提升语言。', 'detail'),
                    $this->q('What is studying abroad really about for the writer?', 'B', ['A' => 'Only tourism.', 'B' => 'Rebuilding daily systems in another language.', 'C' => 'Avoiding weekly responses.', 'D' => 'Memorizing bus slang.'], '留学是重建另一语言中的日常系统。', 'infer'),
                ]
            ),
            $this->passage(
                'Managing Part-Time Work',
                'To cover living costs, I worked twelve hours a week at the campus café. At first I rushed between shifts and evening classes, often skipping dinner. My manager noticed tired mistakes and suggested we map my class timetable on the staff board. She also allowed me to swap shifts with trained coworkers during exam weeks. I started preparing simple meals on Sundays and setting phone reminders for assignment deadlines. My grades stabilized, and I even trained a new barista. The job taught me that time management is a skill practiced with others, not a secret formula.',
                [
                    $this->q('How many hours did the writer work weekly?', 'B', ['A' => 'Five hours.', 'B' => 'Twelve hours.', 'C' => 'Twenty hours.', 'D' => 'Forty hours.'], '每周工作十二小时。', 'detail'),
                    $this->q('What help did the manager offer?', 'D', ['A' => 'Free tuition.', 'B' => 'Longer shifts before exams.', 'C' => 'No timetable planning.', 'D' => 'Mapping classes and allowing shift swaps during exams.'], '经理排课表并允许考试周换班。', 'detail'),
                    $this->q('What did the job teach about time management?', 'A', ['A' => 'It is practiced with others, not a secret formula.', 'B' => 'It requires skipping meals.', 'C' => 'It means working more hours.', 'D' => 'It avoids reminders.'], '时间管理是与他人协作练出的技能。', 'infer'),
                ]
            ),
            $this->passage(
                'A Public Speaking Course',
                'University required a public speaking course that terrified me. Each student delivered four speeches on values, solutions, and personal stories. I chose to speak about reducing plastic use in student clubs. My first draft was full of statistics without a clear storyline. The instructor asked, "Who is affected on our campus tomorrow?" I rewrote the speech around a photo of bins overflowing after a rainy sports day. Classmates gave structured feedback on eye contact and pacing. My final speech was not flawless, but classmates signed a pledge to reuse event banners. I learned that persuasion begins with a scene people can see.',
                [
                    $this->q('How many speeches were required?', 'C', ['A' => 'One.', 'B' => 'Two.', 'C' => 'Four.', 'D' => 'Ten.'], '课程要求四次演讲。', 'detail'),
                    $this->q('What question improved the writer’s draft?', 'B', ['A' => 'How many statistics exist?', 'B' => 'Who is affected on our campus tomorrow?', 'C' => 'Why avoid personal stories?', 'D' => 'Who won the sports day?'], '“明天校园里谁受影响”改进了演讲。', 'detail'),
                    $this->q('What does persuasion begin with?', 'D', ['A' => 'Perfect eye contact only.', 'B' => 'Overflowing statistics.', 'C' => 'Avoiding feedback.', 'D' => 'A scene people can see.'], '说服始于可见的场景。', 'infer'),
                ]
            ),
            $this->passage(
                'Starting a Campus Podcast',
                'Two friends and I launched a podcast interviewing alumni about their first jobs. We borrowed recorders from the media center and edited episodes in the library’s quiet room. Downloads were low for the first month, so we asked listeners which topics they wanted—internships, switching majors, or moving to new cities. Episode quality improved when we prepared follow-up questions instead of reading scripts. A career counselor shared our channel in a newsletter, and listens tripled. The project showed me that creative work on campus grows through feedback loops, not one perfect launch.',
                [
                    $this->q('What was the podcast about?', 'A', ['A' => 'Alumni first jobs.', 'B' => 'Sports scores.', 'C' => 'Exam answer keys.', 'D' => 'Library fines.'], '播客采访校友第一份工作。', 'detail'),
                    $this->q('What improved episode quality?', 'C', ['A' => 'Reading scripts word for word.', 'B' => 'Stopping listener feedback.', 'C' => 'Preparing follow-up questions.', 'D' => 'Avoiding the media center.'], '追问准备提升节目质量。', 'detail'),
                    $this->q('What did the project show about creative work?', 'B', ['A' => 'One perfect launch is enough.', 'B' => 'It grows through feedback loops.', 'C' => 'Newsletters reduce listeners.', 'D' => 'Downloads never change.'], '创作靠反馈循环成长。', 'infer'),
                ]
            ),
            $this->passage(
                'Preparing for Graduation',
                'In my final year, I met with an academic advisor to review degree requirements and capstone progress. I had completed most credits but still needed an advanced writing course. The advisor helped me compare two seminars: one focused on policy writing, the other on science communication. I chose science communication because it matched my lab experience. We also discussed graduate school timelines and backup plans if applications were delayed. Leaving university now feels less like jumping off a cliff and more like choosing the next route with maps and spare tools.',
                [
                    $this->q('What credit was still needed?', 'D', ['A' => 'A sports course.', 'B' => 'A language test only.', 'C' => 'A first-year lecture.', 'D' => 'An advanced writing course.'], '还差一门高级写作课。', 'detail'),
                    $this->q('Why did the writer choose science communication?', 'B', ['A' => 'It had fewer assignments.', 'B' => 'It matched lab experience.', 'C' => 'Policy writing was banned.', 'D' => 'The advisor refused seminars.'], '科学传播课与实验经历契合。', 'detail'),
                    $this->q('How does leaving university feel now?', 'A', ['A' => 'Like choosing the next route with maps and tools.', 'B' => 'Like jumping off a cliff blindly.', 'C' => 'Like avoiding backup plans.', 'D' => 'Like cancelling capstone work.'], '毕业像带地图与工具选择下一段路。', 'infer'),
                ]
            ),
        ];
    }

  /** @return list<array<string, mixed>> */
    private function graduateTemplates(): array
    {
        return [
            $this->passage(
                'Reading Papers Critically',
                'In my first graduate seminar, the professor assigned three empirical papers per week and asked us to write one-page critiques. I initially summarized conclusions and thought that was enough. After feedback, I learned to compare sample size, measurement tools, and whether authors acknowledged limits. One paper on online learning showed strong results, but the survey reached only private-school students. Pointing out that limit did not mean rejecting the paper; it meant understanding where findings apply. Graduate reading, I realized, is less about finishing pages and more about judging how evidence is built.',
                [
                    $this->q('What was wrong with the writer’s first critiques?', 'C', ['A' => 'They were too long.', 'B' => 'They ignored conclusions.', 'C' => 'They only summarized conclusions.', 'D' => 'They refused feedback.'], '起初只复述结论不够。', 'detail'),
                    $this->q('What limit did one online-learning paper have?', 'B', ['A' => 'No measurement tools.', 'B' => 'The survey reached only private-school students.', 'C' => 'It had no results.', 'D' => 'It banned seminars.'], '样本仅限私立学校学生。', 'detail'),
                    $this->q('What is graduate reading about?', 'A', ['A' => 'Judging how evidence is built.', 'B' => 'Finishing pages quickly.', 'C' => 'Rejecting every limit.', 'D' => 'Avoiding comparisons.'], '研究生阅读重在评判证据构建。', 'infer'),
                ]
            ),
            $this->passage(
                'Designing a Small Study',
                'My advisor asked me to design a pilot study on peer feedback in writing classes. I proposed comparing two groups of ten students each. The ethics board reminded me to obtain consent forms and store data anonymously. During the pilot, two students dropped out, so I revised the plan and documented changes transparently. Results were inconclusive, yet the advisor called the pilot successful because it revealed recruitment problems before the full study. I learned that good research documents failures as carefully as successes.',
                [
                    $this->q('What did the ethics board require?', 'D', ['A' => 'Publishing names online.', 'B' => 'Skipping consent.', 'C' => 'Larger groups only.', 'D' => 'Consent forms and anonymous storage.'], '伦理审查要求知情同意与匿名存储。', 'detail'),
                    $this->q('Why was the pilot still successful?', 'A', ['A' => 'It revealed recruitment problems early.', 'B' => 'No students dropped out.', 'C' => 'Results were perfect.', 'D' => 'The advisor cancelled the study.'], '试点提前暴露招募问题。', 'detail'),
                    $this->q('What did the writer learn about research?', 'C', ['A' => 'Failures should be hidden.', 'B' => 'Pilots are useless.', 'C' => 'Good research documents failures as carefully as successes.', 'D' => 'Ethics boards block all studies.'], '好研究同样认真记录失败。', 'infer'),
                ]
            ),
            $this->passage(
                'Presenting at a Conference',
                'I presented a poster at a regional linguistics conference. Visitors asked sharp questions about whether my coding categories overlapped. I had prepared a one-minute summary, but I had not practiced shorter answers for busy professors walking between posters. After the session, a researcher suggested merging two categories and emailing a revised chart. I sent the chart within two days and received an invitation to join a reading group. Conferences, I learned, are conversations that continue after the hall closes.',
                [
                    $this->q('What challenge appeared during the session?', 'B', ['A' => 'No visitors came.', 'B' => 'Busy professors needed shorter answers.', 'C' => 'Posters were banned.', 'D' => 'Categories never overlapped.'], '忙碌学者需要更短回答。', 'detail'),
                    $this->q('What did the writer send within two days?', 'C', ['A' => 'A new poster only.', 'B' => 'A conference ticket.', 'C' => 'A revised chart merging categories.', 'D' => 'A refusal email.'], '两天内寄出修订图表。', 'detail'),
                    $this->q('What are conferences really like?', 'D', ['A' => 'One-minute events only.', 'B' => 'Conversations that end in the hall.', 'C' => 'Places to avoid questions.', 'D' => 'Conversations that continue afterward.'], '会议是会后仍在继续的对话。', 'infer'),
                ]
            ),
            $this->passage(
                'Teaching Undergraduates',
                'As a teaching assistant, I led discussion sections for thirty undergraduates. I prepared slides, but students stayed silent until I asked them to write one-sentence responses on paper first. Small written answers became seeds for debate. When a student gave a wrong example, I learned to thank the attempt and redirect with evidence from the reading. Office hours grew crowded before midterms, so I created a shared FAQ document. Teaching taught me that clarity grows when students feel safe to try.',
                [
                    $this->q('What made students start talking?', 'A', ['A' => 'Writing one-sentence responses first.', 'B' => 'Longer slides only.', 'C' => 'Removing office hours.', 'D' => 'Banning wrong examples.'], '先写一句话促使讨论。', 'detail'),
                    $this->q('How did the writer handle wrong examples?', 'B', ['A' => 'By ignoring students.', 'B' => 'By thanking attempts and redirecting with evidence.', 'C' => 'By cancelling sections.', 'D' => 'By removing readings.'], '感谢尝试并用文本证据引导。', 'detail'),
                    $this->q('What helps clarity grow?', 'C', ['A' => 'Silence in class.', 'B' => 'Hiding FAQs.', 'C' => 'Students feeling safe to try.', 'D' => 'Avoiding midterms.'], '学生敢尝试时讲解更清晰。', 'infer'),
                ]
            ),
            $this->passage(
                'Balancing Research and Health',
                'During thesis drafting, I worked late nights and drank too much coffee. Headaches slowed my writing, and my advisor noticed uneven chapter quality. She recommended time blocks: ninety minutes of writing, fifteen minutes away from screens, and no email before breakfast. I also scheduled a weekly run with labmates. Progress felt slower at first, yet chapters became more coherent. Health, I learned, is not a reward after graduation; it is part of sustainable scholarship.',
                [
                    $this->q('What problem followed late nights?', 'D', ['A' => 'More coherent chapters immediately.', 'B' => 'Fewer advisor meetings.', 'C' => 'No coffee available.', 'D' => 'Headaches and uneven chapter quality.'], '熬夜导致头痛与章节质量不稳。', 'detail'),
                    $this->q('What schedule did the advisor recommend?', 'B', ['A' => 'Email before breakfast.', 'B' => 'Ninety-minute blocks with breaks and no early email.', 'C' => 'All-night writing only.', 'D' => 'No exercise ever.'], '建议九十分钟后休息并早起少看邮件。', 'detail'),
                    $this->q('What is health in scholarship?', 'A', ['A' => 'Part of sustainable scholarship.', 'B' => 'A reward only after graduation.', 'C' => 'Unrelated to writing.', 'D' => 'Something to avoid during thesis work.'], '健康是可持续学术的一部分。', 'infer'),
                ]
            ),
            $this->passage(
                'Collaborating Across Labs',
                'Our lab partnered with an engineering team to build a language-learning app for migrant children. Weekly meetings failed at first because vocabulary differed: we said "learners," they said "users," and deadlines slipped. We created a shared glossary and assigned one note-taker to publish minutes within six hours. When engineers needed simpler survey wording, linguistics students tested sentences with five families. The app prototype improved, and I learned that interdisciplinary work needs translation between fields, not just between languages.',
                [
                    $this->q('Why did early meetings fail?', 'C', ['A' => 'Families refused surveys.', 'B' => 'No prototype existed.', 'C' => 'Vocabulary differed and deadlines slipped.', 'D' => 'Minutes were too fast.'], '术语不一且进度拖延。', 'detail'),
                    $this->q('What tools improved collaboration?', 'A', ['A' => 'A shared glossary and quick minutes.', 'B' => 'Removing all engineers.', 'C' => 'Avoiding families.', 'D' => 'Longer deadlines only.'], '共享术语表与快速纪要改善合作。', 'detail'),
                    $this->q('What does interdisciplinary work need?', 'D', ['A' => 'Only language translation.', 'B' => 'No user testing.', 'C' => 'Separate glossaries.', 'D' => 'Translation between fields.'], '跨学科合作需要不同领域之间的翻译。', 'infer'),
                ]
            ),
            $this->passage(
                'Applying for Funding',
                'I applied for a small research grant to support interview travel. The application required a budget, a timeline, and a plain-language summary for non-experts. I asked a friend outside my field to read the summary and highlight confusing sentences. Reviewers rejected my first attempt but praised the revised budget and community impact section. They funded the second proposal. Grant writing taught me that expert work must be understandable to people who care about outcomes, not only methods.',
                [
                    $this->q('What did the application require?', 'B', ['A' => 'Only exam scores.', 'B' => 'Budget, timeline, and plain-language summary.', 'C' => 'A published book.', 'D' => 'No community impact section.'], '申请需预算、时间表与通俗摘要。', 'detail'),
                    $this->q('Why was the first attempt rejected?', 'A', ['A' => 'It still needed clearer impact and revision though budget later praised.', 'B' => 'Travel was unnecessary.', 'C' => 'Friends refused to read.', 'D' => 'Funding was illegal.'], '首轮因影响阐述不足等原因未过。', 'detail'),
                    $this->q('What does grant writing teach?', 'C', ['A' => 'Only methods matter.', 'B' => 'Experts should avoid plain language.', 'C' => 'Work must be understandable to people who care about outcomes.', 'D' => 'Budgets are optional.'], '经费写作要让关注结果的人也能理解。', 'infer'),
                ]
            ),
            $this->passage(
                'Publishing a First Article',
                'After revising my thesis chapter, I submitted it to a journal and received major revision comments. Reviewer 2 asked for clearer definitions and more recent references. I initially felt defensive, but my advisor said reviewers were pointing to places readers might stumble. I reorganized the literature review and added a limitations paragraph. The article was accepted eight months later. Publication taught me that revision is dialogue with future readers I may never meet.',
                [
                    $this->q('What did Reviewer 2 request?', 'D', ['A' => 'Removing all references.', 'B' => 'Shorter definitions only.', 'C' => 'Immediate acceptance.', 'D' => 'Clearer definitions and newer references.'], '审稿人要求定义更清晰并补充新文献。', 'detail'),
                    $this->q('How did the advisor frame the comments?', 'B', ['A' => 'As personal attacks.', 'B' => 'As signs where readers might stumble.', 'C' => 'As reasons to withdraw.', 'D' => 'As optional suggestions.'], '导师把意见看作读者易困惑之处。', 'detail'),
                    $this->q('What is revision according to the writer?', 'A', ['A' => 'Dialogue with future readers.', 'B' => 'A sign of failure.', 'C' => 'Unnecessary after submission.', 'D' => 'A way to avoid limitations.'], '修改是与未来读者的对话。', 'infer'),
                ]
            ),
            $this->passage(
                'Planning After the Degree',
                'Near graduation, I weighed three paths: industry research, a postdoctoral fellowship, and public education policy. I interviewed alumni in each track and noticed that none described a straight line. One friend moved from a lab to a museum education team and said skills transferred through projects, not job titles. I built a portfolio showcasing studies, teaching, and community workshops. Planning after the degree feels less like choosing forever and more like arranging the next experiments in a longer career.',
                [
                    $this->q('How many paths did the writer consider?', 'C', ['A' => 'One.', 'B' => 'Two.', 'C' => 'Three.', 'D' => 'Five.'], '作者考虑三条职业路径。', 'detail'),
                    $this->q('What did alumni interviews show?', 'B', ['A' => 'Everyone followed one straight line.', 'B' => 'Careers rarely follow a straight line.', 'C' => 'Job titles transfer all skills.', 'D' => 'Portfolios are useless.'], '校友职业路径很少笔直。', 'detail'),
                    $this->q('How does planning after the degree feel?', 'D', ['A' => 'Like choosing forever.', 'B' => 'Like avoiding experiments.', 'C' => 'Like hiding workshops.', 'D' => 'Like arranging the next experiments in a longer career.'], '毕业后规划像安排更长职业中的下几步实验。', 'infer'),
                ]
            ),
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $questions
     * @return array<string, mixed>
     */
    private function passage(string $title, string $content, array $questions): array
    {
        return [
            'title' => $title,
            'content' => $content,
            'questions' => $questions,
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
            'explanation' => $explanation . '。（来源：' . ($type === 'infer' ? '研究生' : '大学') . '阅读）',
        ];
    }

    private function gradeLabel(string $baseGrade, int $stageNo, bool $graduate): string
    {
        if ($graduate) {
            return match (true) {
                $stageNo <= 2 => '研一',
                $stageNo <= 4 => '研二',
                default => '研三',
            };
        }

        return match (true) {
            $stageNo <= 2 => '大一',
            $stageNo <= 4 => '大二',
            $stageNo <= 6 => '大三',
            default => '大四',
        };
    }
}
