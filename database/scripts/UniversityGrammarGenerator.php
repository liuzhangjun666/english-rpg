<?php

/**
 * 生成大学（元婴 Y1）全阶段语法填空题，供 grammar:import-json 导入。
 */
class UniversityGrammarGenerator
{
    /** @var array<string, int> */
    private array $seqByStage = [];

    /** @return list<array<string, mixed>> */
    public function generate(): array
    {
        return array_merge(
            $this->buildYear1(),
            $this->buildYear2(),
            $this->buildYear3(),
            $this->buildYear4(),
        );
    }

    /** @return array<string, int> */
    public function stageCounts(array $questions): array
    {
        $counts = [];
        foreach ($questions as $row) {
            $key = ($row['realm'] ?? 'Y1') . '-' . ($row['stage'] ?? '01');
            $counts[$key] = ($counts[$key] ?? 0) + 1;
        }
        ksort($counts);

        return $counts;
    }

    /**
     * @param array<string, string> $options
     */
    private function row(
        string $grade,
        string $stage,
        string $stem,
        array $options,
        string $correctKey,
        string $explanation
    ): array {
        $stage = str_pad($stage, 2, '0', STR_PAD_LEFT);
        $this->seqByStage[$stage] = ($this->seqByStage[$stage] ?? 0) + 1;
        $seq = str_pad((string) $this->seqByStage[$stage], 4, '0', STR_PAD_LEFT);

        return [
            'question_id' => "JGV-Y1-{$stage}-{$seq}",
            'type' => 'grammar',
            'realm' => 'Y1',
            'stage' => $stage,
            'education_stage' => '大学',
            'grade_level' => $grade,
            'play_mode' => '语法机关桥',
            'scene' => '阵法峰',
            'question' => $stem,
            'options' => $options,
            'correct_answer' => $correctKey,
            'explanation' => $explanation . '。（来源：大学语法 · ' . $grade . '）',
            'word' => '',
        ];
    }

    /** @param list<array{0:string,1:string,2:array<string,string>,3:string,4:string}> $items */
    private function batch(string $grade, array $stages, array $items): array
    {
        $out = [];
        $i = 0;
        foreach ($items as $item) {
            [$stem, $correctKey, $options, $explanation] = $item;
            $stage = $stages[$i % count($stages)];
            $out[] = $this->row($grade, $stage, $stem, $options, $correctKey, $explanation);
            $i++;
        }

        return $out;
    }

    /** @return list<array<string, mixed>> */
    private function buildYear1(): array
    {
        $grade = '大一';
        $stages = ['01', '02', '03'];
        $items = [
            ['The professor, as well as his assistants, ___ the experiment carefully.', 'B', ['A' => 'are conducting', 'B' => 'is conducting', 'C' => 'were conducting', 'D' => 'have conducted'], 'along with 就远原则，谓语与 professor 一致'],
            ['It is high time that freshmen ___ more attention to academic writing.', 'B', ['A' => 'pay', 'B' => 'paid', 'C' => 'will pay', 'D' => 'paying'], 'It is high time that + 过去式'],
            ['Had I known the deadline, I ___ the application earlier.', 'C', ['A' => 'submit', 'B' => 'submitted', 'C' => 'would have submitted', 'D' => 'will submit'], '与过去事实相反的虚拟语气'],
            ['The research findings suggest that sleep ___ memory consolidation.', 'B', ['A' => 'promote', 'B' => 'promotes', 'C' => 'promoting', 'D' => 'promoted'], '宾语从句陈述事实用一般现在时'],
            ['Not until the lecture ended ___ realize how valuable it was.', 'B', ['A' => 'I did', 'B' => 'did I', 'C' => 'I had', 'D' => 'had I'], 'Not until 置于句首部分倒装'],
            ['The book is written in such simple English ___ beginners can understand it.', 'C', ['A' => 'as', 'B' => 'so', 'C' => 'that', 'D' => 'which'], 'such...that 如此……以至于'],
            ['I would rather you ___ the report by Friday.', 'B', ['A' => 'finish', 'B' => 'finished', 'C' => 'will finish', 'D' => 'finishing'], 'would rather sb did'],
            ['The number of international students on campus ___ risen sharply.', 'B', ['A' => 'have', 'B' => 'has', 'C' => 'are', 'D' => 'were'], 'the number of 谓语单数'],
            ['A number of graduates ___ found jobs in tech companies.', 'C', ['A' => 'has', 'B' => 'is', 'C' => 'have', 'D' => 'was'], 'a number of 谓语复数'],
            ['It was in the library ___ I first met my research partner.', 'B', ['A' => 'which', 'B' => 'that', 'C' => 'where', 'D' => 'when'], '强调地点 It was...that'],
            ['The manager insisted that every employee ___ the safety training.', 'A', ['A' => 'attend', 'B' => 'attends', 'C' => 'attended', 'D' => 'attending'], 'insist 表示坚持要求，从句用 (should) + 原形'],
            ['With the final exam ___, students are reviewing harder than ever.', 'B', ['A' => 'approach', 'B' => 'approaching', 'C' => 'approached', 'D' => 'to approach'], 'with + n + doing 复合结构'],
            ['He speaks English as if he ___ in the UK for years.', 'C', ['A' => 'lives', 'B' => 'lived', 'C' => 'had lived', 'D' => 'has lived'], 'as if 与过去事实相反用 had lived'],
            ['The project proved ___ more challenging than we expected.', 'A', ['A' => 'to be', 'B' => 'being', 'C' => 'be', 'D' => 'been'], 'prove to be 证明是'],
            ['There is no point ___ about things you cannot change.', 'C', ['A' => 'worry', 'B' => 'to worry', 'C' => 'in worrying', 'D' => 'worried'], 'there is no point in doing'],
            ['The data collected ___ analyzed by the research team last week.', 'C', ['A' => 'is', 'B' => 'are', 'C' => 'were', 'D' => 'was'], 'data 作复数时谓语用 were'],
            ['Only by practicing daily ___ improve your spoken English.', 'B', ['A' => 'you can', 'B' => 'can you', 'C' => 'you could', 'D' => 'could you'], 'Only by doing 置于句首倒装'],
            ['I have no idea ___ the professor will postpone the test.', 'B', ['A' => 'what', 'B' => 'whether', 'C' => 'which', 'D' => 'who'], 'whether 引导宾语从句表是否'],
            ['He is the very person ___ I am looking for.', 'C', ['A' => 'who', 'B' => 'whom', 'C' => 'that', 'D' => 'which'], 'the very person that'],
            ['It remains a question ___ the policy will be effective.', 'C', ['A' => 'what', 'B' => 'which', 'C' => 'whether', 'D' => 'that'], 'whether 是否'],
            ['The lecture, ___ was given by a Nobel laureate, attracted a large audience.', 'B', ['A' => 'that', 'B' => 'which', 'C' => 'who', 'D' => 'what'], '非限制性定语从句用 which'],
            ['She avoided ___ personal questions during the interview.', 'C', ['A' => 'answer', 'B' => 'to answer', 'C' => 'answering', 'D' => 'answered'], 'avoid doing'],
            ['The university requires that each student ___ a thesis proposal.', 'A', ['A' => 'submit', 'B' => 'submits', 'C' => 'submitted', 'D' => 'submitting'], 'require that (should) do'],
            ['Hardly ___ the dormitory when the fire alarm went off.', 'A', ['A' => 'had he entered', 'B' => 'he had entered', 'C' => 'did he enter', 'D' => 'he entered'], 'Hardly had...when 倒装'],
            ['The more exposure you have to English, the ___ confident you become.', 'C', ['A' => 'much', 'B' => 'many', 'C' => 'more', 'D' => 'most'], 'the more...the more'],
            ['He was seen ___ into the laboratory late at night.', 'C', ['A' => 'sneak', 'B' => 'to sneak', 'C' => 'sneaking', 'D' => 'sneaked'], 'see sb doing 看见正在做'],
            ['I cannot help but ___ that the argument is flawed.', 'A', ['A' => 'think', 'B' => 'thinking', 'C' => 'to think', 'D' => 'thought'], 'cannot help but do 不得不'],
        ];
        $items[27] = ['The committee will discuss the proposal ___ at the meeting next Monday.', 'B', ['A' => 'holding', 'B' => 'to be held', 'C' => 'held', 'D' => 'hold'], '不定式被动作后置定语'];
        $items[] = ['It is essential that every freshman ___ the orientation program.', 'A', ['A' => 'attend', 'B' => 'attends', 'C' => 'attended', 'D' => 'attending'], 'essential that (should) do'];
        $items[] = ['Scarcely ___ the presentation when the power went out.', 'A', ['A' => 'had she begun', 'B' => 'she had begun', 'C' => 'did she begin', 'D' => 'she began'], 'Scarcely had...when'];
        $items[] = ['The professor recommended that we ___ more academic journals.', 'A', ['A' => 'read', 'B' => 'reads', 'C' => 'reading', 'D' => 'readed'], 'recommend that (should) do'];
        $items[] = ['He acted as if nothing ___ happened.', 'B', ['A' => 'has', 'B' => 'had', 'C' => 'have', 'D' => 'having'], 'as if + 过去完成时'];
        $items[] = ['The way ___ the professor explains complex ideas is impressive.', 'C', ['A' => 'which', 'B' => 'in which', 'C' => 'that', 'D' => 'who'], 'the way that/in which'];
        $items[] = ['I would appreciate ___ if you could reply before noon.', 'B', ['A' => 'that', 'B' => 'it', 'C' => 'this', 'D' => 'one'], 'appreciate it if 固定句型'];
        $items[] = ['The scholarship is available to anyone ___ academic performance is outstanding.', 'D', ['A' => 'who', 'B' => 'which', 'C' => 'whom', 'D' => 'whose'], 'whose 表所属'];
        $items[] = ['Little ___ that this discovery would change the field.', 'B', ['A' => 'they knew', 'B' => 'did they know', 'C' => 'they know', 'D' => 'do they know'], 'Little 置于句首倒装'];
        $items[] = ['The experiment needs ___ under strict supervision.', 'C', ['A' => 'conduct', 'B' => 'to conduct', 'C' => 'conducting', 'D' => 'conducted'], 'need doing 需要被……'];
        $items[] = ['He is accustomed to ___ up early for morning classes.', 'C', ['A' => 'get', 'B' => 'got', 'C' => 'getting', 'D' => 'gets'], 'be accustomed to doing'];
        $items[] = ['What impressed the judges most was ___ she handled the Q&A session.', 'C', ['A' => 'what', 'B' => 'which', 'C' => 'how', 'D' => 'that'], 'how 引导表语从句表方式'];
        $items[] = ['The dean ordered that the report ___ submitted by Friday.', 'B', ['A' => 'is', 'B' => 'be', 'C' => 'was', 'D' => 'being'], 'order that (should) be done'];
        $items[] = ['So absorbed ___ in the book that he missed the announcement.', 'B', ['A' => 'he was', 'B' => 'was he', 'C' => 'did he', 'D' => 'he did'], 'So absorbed was he 倒装'];
        $items[] = ['It is generally acknowledged ___ education plays a vital role in society.', 'C', ['A' => 'what', 'B' => 'which', 'C' => 'that', 'D' => 'who'], 'It is acknowledged that'];
        $items[] = ['The student was caught ___ on his phone during the lecture.', 'C', ['A' => 'text', 'B' => 'to text', 'C' => 'texting', 'D' => 'texted'], 'be caught doing'];
        $items[] = ['Rather than ___ passive, she took the initiative to lead the group.', 'A', ['A' => 'remain', 'B' => 'remaining', 'C' => 'remained', 'D' => 'to remain'], 'rather than do'];
        $items[] = ['The findings are consistent ___ previous studies in this area.', 'C', ['A' => 'to', 'B' => 'for', 'C' => 'with', 'D' => 'of'], 'consistent with 与……一致'];
        $items[] = ['He devoted himself ___ advancing renewable energy research.', 'C', ['A' => 'in', 'B' => 'for', 'C' => 'to', 'D' => 'on'], 'devote oneself to doing'];
        $items[] = ['There is no denying ___ teamwork is crucial in university projects.', 'C', ['A' => 'what', 'B' => 'which', 'C' => 'that', 'D' => 'who'], 'no denying that'];
        $items[] = ['The lecture hall, ___ seats 500 students, was fully booked.', 'A', ['A' => 'which', 'B' => 'that', 'C' => 'where', 'D' => 'who'], '非限制性定语从句 which'];
        $items[] = ['I look forward to ___ from you regarding the internship.', 'B', ['A' => 'hear', 'B' => 'hearing', 'C' => 'heard', 'D' => 'hear from'], 'look forward to doing'];
        $items[] = ['The issue is too complex ___ in a single paragraph.', 'B', ['A' => 'explain', 'B' => 'to explain', 'C' => 'explaining', 'D' => 'explained'], 'too...to 太……而不能'];
        $items[] = ['He is considered ___ one of the brightest students in the department.', 'B', ['A' => 'be', 'B' => 'to be', 'C' => 'being', 'D' => 'been'], 'be considered to be'];
        $items[] = ['By the end of this semester, I ___ all the required courses.', 'C', ['A' => 'complete', 'B' => 'completed', 'C' => 'will have completed', 'D' => 'am completing'], 'by the end of 将来完成时'];
        $items[] = ['The professor had us ___ a summary after each chapter.', 'A', ['A' => 'write', 'B' => 'writing', 'C' => 'to write', 'D' => 'wrote'], 'have sb do'];
        $items[] = ['It was not until midnight ___ he finished revising the paper.', 'B', ['A' => 'which', 'B' => 'that', 'C' => 'when', 'D' => 'then'], 'not until 强调句'];
        $items[] = ['The policy aims ___ reducing carbon emissions on campus.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'at', 'D' => 'to'], 'aim at 旨在'];
        $items[] = ['She insisted on ___ treated as an equal partner.', 'C', ['A' => 'be', 'B' => 'been', 'C' => 'being', 'D' => 'to be'], 'insist on being done'];
        $items[] = ['Whatever difficulties you face, never ___ sight of your goals.', 'A', ['A' => 'lose', 'B' => 'loses', 'C' => 'losing', 'D' => 'lost'], 'lose sight of 忽视'];

        return $this->batch($grade, $stages, $items);
    }

    /** @return list<array<string, mixed>> */
    private function buildYear2(): array
    {
        $grade = '大二';
        $stages = ['04', '05', '06'];
        $items = [
            ['The report is believed ___ by a team of senior researchers.', 'C', ['A' => 'write', 'B' => 'to write', 'C' => 'to have been written', 'D' => 'writing'], 'be believed to have been done 据说已被写'],
            ['The conference, ___ in Beijing next spring, will attract scholars worldwide.', 'B', ['A' => 'hold', 'B' => 'to be held', 'C' => 'held', 'D' => 'holding'], '不定式被动表示将来被举行'],
            ['Were it not for scholarships, many students ___ afford tuition.', 'C', ['A' => 'cannot', 'B' => 'could not', 'C' => 'could not', 'D' => 'will not'], 'Were it not for 含蓄虚拟'],
            ['The professor spoke slowly ___ the students could take notes.', 'A', ['A' => 'so that', 'B' => 'such that', 'C' => 'in order', 'D' => 'because'], 'so that 以便'],
            ['It is the ability to think critically ___ distinguishes top students.', 'B', ['A' => 'who', 'B' => 'that', 'C' => 'which', 'D' => 'what'], '强调句 It is...that'],
            ['The experiment, ___ carefully, yielded unexpected results.', 'B', ['A' => 'design', 'B' => 'designed', 'C' => 'designing', 'D' => 'to design'], '过去分词作状语表被动'],
            ['He denied ___ the confidential files to outsiders.', 'C', ['A' => 'give', 'B' => 'to give', 'C' => 'having given', 'D' => 'giving'], 'deny having done 否认做过'],
            ['The more data we collect, the ___ our conclusions will be.', 'C', ['A' => 'reliable', 'B' => 'much reliable', 'C' => 'more reliable', 'D' => 'most reliable'], 'the more...the more 比较级'],
            ['Not only ___ the theory, but he also applied it in practice.', 'B', ['A' => 'he understood', 'B' => 'did he understand', 'C' => 'he did understand', 'D' => 'understood he'], 'Not only 倒装'],
            ['The article was written in ___ academic style that few undergraduates could follow.', 'C', ['A' => 'so', 'B' => 'very', 'C' => 'such an', 'D' => 'too'], 'such an...that'],
            ['I would rather have ___ the workshop than missed it.', 'B', ['A' => 'attend', 'B' => 'attended', 'C' => 'attending', 'D' => 'to attend'], 'would rather have done 宁愿做过'],
            ['The committee is composed ___ experts from various disciplines.', 'C', ['A' => 'for', 'B' => 'with', 'C' => 'of', 'D' => 'by'], 'be composed of 由……组成'],
            ['He is qualified ___ the position of research assistant.', 'C', ['A' => 'for', 'B' => 'with', 'C' => 'for', 'D' => 'to'], 'be qualified for 有资格'],
            ['The hypothesis, ___ at first, was eventually confirmed by experiments.', 'B', ['A' => 'reject', 'B' => 'rejected', 'C' => 'rejecting', 'D' => 'to reject'], 'rejected 过去分词作定语'],
            ['Seldom ___ a lecture so engaging and informative.', 'C', ['A' => 'I have attended', 'B' => 'I had attended', 'C' => 'have I attended', 'D' => 'had I attended'], 'Seldom 倒装'],
            ['The university is committed ___ fostering innovation among students.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'to', 'D' => 'on'], 'be committed to doing'],
            ['It is imperative that the lab ___ kept clean at all times.', 'B', ['A' => 'is', 'B' => 'be', 'C' => 'was', 'D' => 'being'], 'imperative that (should) be'],
            ['The findings contribute ___ our understanding of climate change.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'to', 'D' => 'on'], 'contribute to 有助于'],
            ['He is said ___ three papers in top journals this year.', 'C', ['A' => 'publish', 'B' => 'to publish', 'C' => 'to have published', 'D' => 'publishing'], 'be said to have done'],
            ['Under no circumstances ___ cheat on exams.', 'B', ['A' => 'students should', 'B' => 'should students', 'C' => 'students will', 'D' => 'will students'], 'Under no circumstances 倒装'],
            ['The professor, together with two colleagues, ___ a new textbook.', 'B', ['A' => 'are writing', 'B' => 'is writing', 'C' => 'were writing', 'D' => 'have written'], 'together with 就远原则'],
            ['What we need is not more theory but practical skills ___ can be applied.', 'C', ['A' => 'who', 'B' => 'whom', 'C' => 'that', 'D' => 'whose'], 'skills that 定语从句'],
            ['The survey indicates that a majority of students ___ online resources.', 'B', ['A' => 'rely', 'B' => 'rely on', 'C' => 'rely in', 'D' => 'rely at'], 'rely on 依赖'],
            ['He objected to ___ referred to as a beginner.', 'C', ['A' => 'be', 'B' => 'been', 'C' => 'being', 'D' => 'to be'], 'object to being done'],
            ['The thesis must ___ in accordance with university guidelines.', 'B', ['A' => 'write', 'B' => 'be written', 'C' => 'writing', 'D' => 'wrote'], 'must be done 被动'],
            ['Given more time, the team ___ the problem more thoroughly.', 'C', ['A' => 'analyze', 'B' => 'analyzed', 'C' => 'would analyze', 'D' => 'will analyze'], 'Given 含蓄条件 would do'],
            ['The lecture was so boring ___ half the audience fell asleep.', 'C', ['A' => 'as', 'B' => 'very', 'C' => 'that', 'D' => 'which'], 'so...that'],
            ['He cannot have ___ the exam. I saw him in the classroom.', 'B', ['A' => 'miss', 'B' => 'missed', 'C' => 'missing', 'D' => 'misses'], 'cannot have done 不可能已经'],
            ['The research is aimed ___ improving teaching quality.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'at', 'D' => 'to'], 'be aimed at'],
            ['It was because of his dedication ___ he won the award.', 'B', ['A' => 'which', 'B' => 'that', 'C' => 'why', 'D' => 'because'], '强调原因 It was because...that'],
            ['The students are prohibited from ___ electronic devices in the exam hall.', 'C', ['A' => 'use', 'B' => 'to use', 'C' => 'using', 'D' => 'used'], 'prohibit from doing'],
            ['He is the last person ___ I would suspect of cheating.', 'C', ['A' => 'who', 'B' => 'whom', 'C' => 'that', 'D' => 'which'], 'the last person that'],
            ['The impact of technology on education ___ widely debated.', 'B', ['A' => 'are', 'B' => 'is', 'C' => 'were', 'D' => 'have been'], 'impact 单数谓语'],
            ['All that is required ___ a willingness to learn.', 'B', ['A' => 'are', 'B' => 'is', 'C' => 'were', 'D' => 'be'], 'all that is required is'],
            ['He spoke as though he ___ an expert on the subject.', 'B', ['A' => 'is', 'B' => 'were', 'C' => 'was', 'D' => 'be'], 'as though + were 虚拟'],
            ['The proposal, if ___, will benefit thousands of students.', 'C', ['A' => 'approve', 'B' => 'approving', 'C' => 'approved', 'D' => 'to approve'], 'if approved 省略 if it is approved'],
            ['No sooner ___ the question than she gave the answer.', 'B', ['A' => 'she had heard', 'B' => 'had she heard', 'C' => 'did she hear', 'D' => 'she heard'], 'No sooner had...than'],
            ['The course is designed ___ students with fundamental research skills.', 'C', ['A' => 'provide', 'B' => 'providing', 'C' => 'to provide', 'D' => 'provided'], 'be designed to do'],
            ['He prides himself on ___ able to solve complex problems.', 'C', ['A' => 'be', 'B' => 'been', 'C' => 'being', 'D' => 'to be'], 'pride oneself on being'],
            ['The evidence is insufficient ___ a firm conclusion.', 'C', ['A' => 'draw', 'B' => 'drawing', 'C' => 'to draw', 'D' => 'drawn'], 'adj + enough / insufficient to do'],
            ['What matters is not speed but ___ you understand the material.', 'C', ['A' => 'what', 'B' => 'which', 'C' => 'whether', 'D' => 'that'], 'whether 是否'],
            ['The professor, ___ I have great respect, will retire next year.', 'C', ['A' => 'who', 'B' => 'whom', 'C' => 'for whom', 'D' => 'whose'], 'for whom 定语从句'],
            ['He would have passed CET-4 if he ___ harder.', 'B', ['A' => 'study', 'B' => 'had studied', 'C' => 'studied', 'D' => 'studies'], '与过去相反 if had studied'],
            ['The library provides students ___ access to academic databases.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'with', 'D' => 'to'], 'provide sb with sth'],
            ['It is advisable that you ___ a backup of your files.', 'A', ['A' => 'make', 'B' => 'makes', 'C' => 'made', 'D' => 'making'], 'advisable that (should) do'],
            ['The phenomenon, ___ scientists still cannot fully explain, remains a mystery.', 'B', ['A' => 'that', 'B' => 'which', 'C' => 'who', 'D' => 'what'], '非限制性定语从句 which'],
            ['He is too absorbed in research ___ notice the time.', 'B', ['A' => 'notice', 'B' => 'to notice', 'C' => 'noticing', 'D' => 'noticed'], 'too...to'],
            ['The grant enabled him ___ his studies abroad.', 'C', ['A' => 'continue', 'B' => 'continuing', 'C' => 'to continue', 'D' => 'continued'], 'enable sb to do'],
            ['By no means ___ this result be considered final.', 'B', ['A' => 'can', 'B' => 'should', 'C' => 'must', 'D' => 'will'], 'by no means should 绝不'],
            ['The survey was conducted ___ gather student feedback.', 'C', ['A' => 'for', 'B' => 'in order', 'C' => 'to', 'D' => 'so that'], '不定式表目的 to gather'],
            ['He is known ___ his contributions to environmental science.', 'C', ['A' => 'for', 'B' => 'as', 'C' => 'for', 'D' => 'to'], 'be known for 因……闻名'],
            ['The debate centered ___ the ethics of artificial intelligence.', 'C', ['A' => 'in', 'B' => 'at', 'C' => 'on', 'D' => 'to'], 'center on 围绕'],
            ['She was awarded a fellowship, ___ enabled her to pursue a PhD.', 'B', ['A' => 'that', 'B' => 'which', 'C' => 'who', 'D' => 'what'], 'which 引导非限制性定语从句'],
            ['The internship offers valuable experience, without ___ many graduates struggle to find jobs.', 'C', ['A' => 'it', 'B' => 'that', 'C' => 'which', 'D' => 'what'], 'without which 介词+关系代词'],
            ['He attributed his success ___ hard work and perseverance.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'to', 'D' => 'on'], 'attribute to 归因于'],
            ['The regulations stipulate that all papers ___ in English.', 'B', ['A' => 'write', 'B' => 'be written', 'C' => 'written', 'D' => 'writing'], 'stipulate that (should) be done'],
            ['Much as I admire his talent, I ___ agree with his approach.', 'B', ['A' => 'cannot', 'B' => 'cannot', 'C' => 'must', 'D' => 'should'], 'much as 尽管'],
            ['The workshop focuses on ___ academic papers effectively.', 'C', ['A' => 'write', 'B' => 'write', 'C' => 'writing', 'D' => 'written'], 'focus on doing'],
            ['He left the meeting, his face ___ with anger.', 'B', ['A' => 'fill', 'B' => 'filled', 'C' => 'filling', 'D' => 'to fill'], '独立主格 filled with'],
        ];
        $items[2] = ['Were it not for scholarships, many students ___ afford tuition.', 'B', ['A' => 'cannot', 'B' => 'could not', 'C' => 'will not', 'D' => 'would not'], 'Were it not for 含蓄虚拟'];
        $items[12] = ['He is qualified ___ the position of research assistant.', 'A', ['A' => 'for', 'B' => 'with', 'C' => 'to', 'D' => 'on'], 'be qualified for'];
        $items[22] = ['The survey indicates that a majority of students ___ online resources for study.', 'A', ['A' => 'rely on', 'B' => 'rely in', 'C' => 'rely at', 'D' => 'rely for'], 'rely on 依赖'];
        $items[41] = ['The professor, ___ I have great respect, will retire next year.', 'C', ['A' => 'who', 'B' => 'whom', 'C' => 'for whom', 'D' => 'whose'], 'have respect for whom'];
        $items[48] = ['He is known ___ his contributions to environmental science.', 'A', ['A' => 'for', 'B' => 'as', 'C' => 'to', 'D' => 'with'], 'be known for'];
        $items[54] = ['Much as I admire his talent, I ___ agree with his approach.', 'A', ['A' => 'cannot', 'B' => 'must', 'C' => 'should', 'D' => 'may'], 'much as 尽管……但'];
        $items[55] = ['The workshop focuses on ___ academic papers effectively.', 'C', ['A' => 'write', 'B' => 'to write', 'C' => 'writing', 'D' => 'written'], 'focus on doing'];

        return $this->batch($grade, $stages, $items);
    }

    /** @return list<array<string, mixed>> */
    private function buildYear3(): array
    {
        $grade = '大三';
        $stages = ['07', '08', '09'];
        $items = [
            ['The study concludes that prolonged screen time ___ cognitive performance.', 'B', ['A' => 'affect', 'B' => 'affects', 'C' => 'affecting', 'D' => 'affected'], '宾语从句主语单数用 affects'],
            ['Had the funding been available, the project ___ completed on schedule.', 'C', ['A' => 'will be', 'B' => 'would be', 'C' => 'would have been', 'D' => 'had been'], '与过去相反的虚拟被动'],
            ['The theory, ___ is widely accepted today, was once considered radical.', 'B', ['A' => 'that', 'B' => 'which', 'C' => 'who', 'D' => 'what'], '非限制性定语从句 which'],
            ['It is widely held ___ critical thinking is essential for academic success.', 'C', ['A' => 'what', 'B' => 'which', 'C' => 'that', 'D' => 'who'], 'It is held that'],
            ['The manuscript needs ___ before submission to the journal.', 'C', ['A' => 'revise', 'B' => 'to revise', 'C' => 'revising', 'D' => 'revised'], 'need doing 需要被修改'],
            ['So complex ___ the problem that no simple solution exists.', 'B', ['A' => 'the problem is', 'B' => 'is the problem', 'C' => 'was the problem', 'D' => 'the problem was'], 'So complex is... 倒装'],
            ['The researcher is credited ___ discovering the new compound.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'with', 'D' => 'to'], 'be credited with 因……受到赞誉'],
            ['The data suggest that further investigation ___ necessary.', 'B', ['A' => 'are', 'B' => 'is', 'C' => 'were', 'D' => 'be'], 'investigation 单数 is necessary'],
            ['He is inclined ___ that the results are statistically significant.', 'C', ['A' => 'believe', 'B' => 'to believe', 'C' => 'to believe', 'D' => 'believing'], 'be inclined to do'],
            ['The argument rests ___ the assumption that all participants were honest.', 'C', ['A' => 'in', 'B' => 'at', 'C' => 'on', 'D' => 'to'], 'rest on 基于'],
            ['Not until the data were verified ___ the paper published.', 'B', ['A' => 'was', 'B' => 'was', 'C' => 'is', 'D' => 'were'], 'Not until 倒装'],
            ['The professor recommended that the methodology ___ described in detail.', 'B', ['A' => 'is', 'B' => 'be', 'C' => 'was', 'D' => 'being'], 'recommend that (should) be'],
            ['Whatever the outcome, the experiment ___ valuable insights.', 'C', ['A' => 'provide', 'B' => 'provides', 'C' => 'will provide', 'D' => 'provided'], 'whatever 引导让步，主句将来时'],
            ['The findings are subject ___ revision as new evidence emerges.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'to', 'D' => 'on'], 'be subject to 受制于'],
            ['He is alleged ___ manipulated the research data.', 'C', ['A' => 'have', 'B' => 'to have', 'C' => 'to have', 'D' => 'having'], 'be alleged to have done'],
            ['The conference proceedings, ___ over 300 pages, cover diverse topics.', 'B', ['A' => 'span', 'B' => 'spanning', 'C' => 'spanned', 'D' => 'to span'], '现在分词作定语'],
            ['It is conceivable ___ technology will reshape higher education.', 'C', ['A' => 'what', 'B' => 'which', 'C' => 'that', 'D' => 'who'], 'It is conceivable that'],
            ['The reviewer found the argument less convincing than ___.', 'C', ['A' => 'expected', 'B' => 'expecting', 'C' => 'expected', 'D' => 'to expect'], 'than expected 省略 than it was expected'],
            ['Students are encouraged ___ interdisciplinary collaboration.', 'C', ['A' => 'pursue', 'B' => 'to pursue', 'C' => 'to pursue', 'D' => 'pursuing'], 'encourage sb to do'],
            ['The policy is intended ___ inequality in access to education.', 'C', ['A' => 'reduce', 'B' => 'reducing', 'C' => 'to reduce', 'D' => 'reduced'], 'be intended to do'],
            ['Rarely ___ such a comprehensive analysis of the issue.', 'C', ['A' => 'we see', 'B' => 'we have seen', 'C' => 'do we see', 'D' => 'have we seen'], 'Rarely 倒装'],
            ['The hypothesis was tested, ___ proved to be accurate.', 'B', ['A' => 'that', 'B' => 'which', 'C' => 'who', 'D' => 'what'], 'which 指代前面整件事'],
            ['He is entitled ___ a full refund if the course is cancelled.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'to', 'D' => 'with'], 'be entitled to 有权获得'],
            ['The lecture challenged students ___ conventional assumptions.', 'C', ['A' => 'question', 'B' => 'to question', 'C' => 'to question', 'D' => 'questioning'], 'challenge sb to do'],
            ['The results are indicative ___ a broader trend in the field.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'of', 'D' => 'to'], 'indicative of 表明'],
            ['___ you require further assistance, please contact the office.', 'A', ['A' => 'Should', 'B' => 'Would', 'C' => 'Could', 'D' => 'Might'], 'Should you require 倒装'],
            ['The study was conducted so as ___ bias in sampling.', 'C', ['A' => 'avoid', 'B' => 'avoiding', 'C' => 'to avoid', 'D' => 'avoided'], 'so as to do 为了'],
            ['He is prone ___ making hasty judgments without sufficient evidence.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'to', 'D' => 'on'], 'be prone to doing'],
            ['The committee voted unanimously, ___ was unexpected.', 'B', ['A' => 'that', 'B' => 'which', 'C' => 'who', 'D' => 'what'], 'which 引导非限制性定语从句'],
            ['It is doubtful ___ the current approach will yield better results.', 'C', ['A' => 'what', 'B' => 'which', 'C' => 'whether', 'D' => 'that'], 'doubtful whether'],
            ['The author argues that globalization ___ both opportunities and challenges.', 'B', ['A' => 'present', 'B' => 'presents', 'C' => 'presenting', 'D' => 'presented'], 'globalization 单数谓语'],
            ['The experiment was repeated three times, each trial ___ consistent results.', 'C', ['A' => 'produce', 'B' => 'producing', 'C' => 'producing', 'D' => 'produced'], '独立主格 producing'],
            ['He could not have achieved this without his mentor\'s ___.', 'C', ['A' => 'guide', 'B' => 'guided', 'C' => 'guidance', 'D' => 'guiding'], '名词 guidance 指导'],
            ['The paper has been cited over 200 times, ___ its influence in the field.', 'C', ['A' => 'reflect', 'B' => 'reflecting', 'C' => 'reflecting', 'D' => 'reflected'], '现在分词作状语'],
            ['The university prohibits plagiarism in ___ form.', 'C', ['A' => 'some', 'B' => 'any', 'C' => 'any', 'D' => 'every'], 'in any form 任何形式'],
            ['He spoke in a manner ___ suggested deep knowledge of the subject.', 'C', ['A' => 'who', 'B' => 'whom', 'C' => 'that', 'D' => 'whose'], 'manner that'],
            ['The grant application must be accompanied ___ a detailed budget.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'by', 'D' => 'with'], 'be accompanied by'],
            ['It is estimated ___ over 60% of graduates pursue further studies.', 'C', ['A' => 'what', 'B' => 'which', 'C' => 'that', 'D' => 'who'], 'It is estimated that'],
            ['The professor emphasized the importance of ___ primary sources.', 'C', ['A' => 'consult', 'B' => 'consult', 'C' => 'consulting', 'D' => 'consulted'], 'of doing 动名词'],
            ['He was awarded the prize, an honor ___ he had long dreamed.', 'C', ['A' => 'that', 'B' => 'which', 'C' => 'of which', 'D' => 'for which'], 'dream of which'],
            ['The debate highlighted the need ___ stricter academic standards.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'for', 'D' => 'to'], 'the need for'],
            ['She is regarded ___ one of the leading experts in linguistics.', 'C', ['A' => 'for', 'B' => 'to', 'C' => 'as', 'D' => 'with'], 'be regarded as'],
            ['The findings contradict ___ was previously believed.', 'C', ['A' => 'that', 'B' => 'which', 'C' => 'what', 'D' => 'who'], 'what 引导宾语从句'],
            ['He submitted the assignment late, for ___ he lost ten points.', 'C', ['A' => 'that', 'B' => 'which', 'C' => 'which', 'D' => 'what'], 'for which 定语从句'],
            ['The seminar is open to all students, regardless ___ their major.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'of', 'D' => 'to'], 'regardless of 不管'],
            ['The research team is composed of twelve members, each ___ a specific role.', 'C', ['A' => 'play', 'B' => 'plays', 'C' => 'playing', 'D' => 'played'], 'each playing 独立主格'],
            ['He would sooner resign ___ compromise his principles.', 'C', ['A' => 'as', 'B' => 'to', 'C' => 'than', 'D' => 'for'], 'would sooner do than do'],
            ['The article provides a framework ___ analyzing social media trends.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'for', 'D' => 'to'], 'framework for doing'],
            ['It is paradoxical ___ success often comes after repeated failure.', 'C', ['A' => 'what', 'B' => 'which', 'C' => 'that', 'D' => 'who'], 'paradoxical that'],
            ['The speaker paused, as if ___ for the right words.', 'C', ['A' => 'search', 'B' => 'searched', 'C' => 'searching', 'D' => 'to search'], 'as if searching 好像正在寻找'],
            ['The contract is binding ___ both parties.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'on', 'D' => 'to'], 'binding on 对……有约束力'],
            ['He is skeptical ___ the validity of the survey results.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'about', 'D' => 'to'], 'skeptical about 对……怀疑'],
            ['The methodology is comparable ___ that used in earlier studies.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'to', 'D' => 'with'], 'comparable to 与……可比'],
            ['The thesis defense went smoothly, much to the student\'s ___.', 'C', ['A' => 'relieve', 'B' => 'relieved', 'C' => 'relief', 'D' => 'relieving'], 'to one\'s relief 令人宽慰'],
            ['He is intent ___ completing his dissertation before the deadline.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'on', 'D' => 'to'], 'be intent on doing'],
            ['The panel raised concerns ___ the ethical implications of the study.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'about', 'D' => 'to'], 'raise concerns about'],
            ['The volume of research in this field ___ grown exponentially.', 'B', ['A' => 'have', 'B' => 'has', 'C' => 'are', 'D' => 'were'], 'volume 单数 has grown'],
            ['He spoke with an authority ___ commanded the audience\'s attention.', 'C', ['A' => 'who', 'B' => 'whom', 'C' => 'that', 'D' => 'whose'], 'authority that'],
            ['The proposal was rejected, ___ came as a surprise to many.', 'B', ['A' => 'that', 'B' => 'which', 'C' => 'who', 'D' => 'what'], 'which 指代整件事'],
        ];
        $items[2] = ['The theory, ___ is widely accepted today, was once considered radical.', 'B', ['A' => 'that', 'B' => 'which', 'C' => 'who', 'D' => 'what'], '非限制性定语从句 which'];
        $items[10] = ['Not until the data were verified ___ the paper published.', 'A', ['A' => 'was', 'B' => 'is', 'C' => 'were', 'D' => 'be'], 'Not until 倒装 was'];
        $items[14] = ['He is alleged ___ manipulated the research data.', 'B', ['A' => 'have', 'B' => 'to have', 'C' => 'having', 'D' => 'to'], 'be alleged to have done'];
        $items[8] = ['He is inclined ___ that the results are statistically significant.', 'B', ['A' => 'believe', 'B' => 'to believe', 'C' => 'believing', 'D' => 'believed'], 'be inclined to believe'];
        $items[17] = ['The reviewer found the argument less convincing than ___.', 'A', ['A' => 'expected', 'B' => 'expecting', 'C' => 'to expect', 'D' => 'expects'], 'than expected 省略'];
        $items[18] = ['Students are encouraged ___ interdisciplinary collaboration.', 'B', ['A' => 'pursue', 'B' => 'to pursue', 'C' => 'pursuing', 'D' => 'pursued'], 'encourage to pursue'];
        $items[23] = ['The lecture challenged students ___ conventional assumptions.', 'B', ['A' => 'question', 'B' => 'to question', 'C' => 'questioning', 'D' => 'questioned'], 'challenge sb to do'];
        $items[24] = ['The results are indicative ___ a broader trend in the field.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'of', 'D' => 'to'], 'indicative of 表明'];
        $items[32] = ['The experiment was repeated three times, each trial ___ consistent results.', 'B', ['A' => 'produce', 'B' => 'producing', 'C' => 'produced', 'D' => 'produces'], '独立主格 each trial producing'];
        $items[33] = ['The paper has been cited over 200 times, ___ its influence in the field.', 'B', ['A' => 'reflect', 'B' => 'reflecting', 'C' => 'reflected', 'D' => 'reflects'], 'reflecting 现在分词状语'];
        $items[35] = ['The university prohibits plagiarism in ___ form.', 'B', ['A' => 'some', 'B' => 'any', 'C' => 'every', 'D' => 'no'], 'in any form'];
        $items[40] = ['The debate highlighted the need ___ stricter academic standards.', 'A', ['A' => 'for', 'B' => 'in', 'C' => 'to', 'D' => 'on'], 'the need for'];
        $items[44] = ['He submitted the assignment late, for ___ he lost ten points.', 'B', ['A' => 'that', 'B' => 'which', 'C' => 'what', 'D' => 'whom'], 'for which'];
        $items[46] = ['The article provides a framework ___ analyzing social media trends.', 'A', ['A' => 'for', 'B' => 'in', 'C' => 'to', 'D' => 'on'], 'framework for'];

        return $this->batch($grade, $stages, $items);
    }

    /** @return list<array<string, mixed>> */
    private function buildYear4(): array
    {
        $grade = '大四';
        $stages = ['07', '08', '09'];
        $items = [
            ['The dissertation, ___ over two years, reflects original research.', 'B', ['A' => 'write', 'B' => 'written', 'C' => 'writing', 'D' => 'to write'], '过去分词作定语表被动'],
            ['It is mandatory that all graduates ___ their transcripts before leaving.', 'B', ['A' => 'submit', 'B' => 'submit', 'C' => 'submits', 'D' => 'submitted'], 'mandatory that (should) do'],
            ['But for the pandemic, the graduation ceremony ___ held as scheduled.', 'C', ['A' => 'will be', 'B' => 'would be', 'C' => 'would have been', 'D' => 'had been'], 'but for 与过去相反'],
            ['The CEO, along with the board members, ___ the final decision.', 'B', ['A' => 'make', 'B' => 'makes', 'C' => 'making', 'D' => 'made'], 'along with 就远原则'],
            ['The report attributes the decline ___ a lack of investment in R&D.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'to', 'D' => 'on'], 'attribute to 归因于'],
            ['He is bound ___ succeed given his track record and determination.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'to', 'D' => 'on'], 'be bound to do 注定'],
            ['The symposium served ___ a platform for exchanging cutting-edge ideas.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'as', 'D' => 'to'], 'serve as 充当'],
            ['The policy has far-reaching implications ___ the job market.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'for', 'D' => 'to'], 'implications for'],
            ['He was the only applicant ___ met all the eligibility criteria.', 'C', ['A' => 'who', 'B' => 'whom', 'C' => 'that', 'D' => 'which'], 'the only applicant that'],
            ['The study lends support ___ the hypothesis that exercise boosts cognition.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'to', 'D' => 'on'], 'lend support to 支持'],
            ['It is incumbent ___ graduates to contribute positively to society.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'on', 'D' => 'to'], 'incumbent on sb to do'],
            ['The negotiations broke down, ___ led to a prolonged strike.', 'B', ['A' => 'that', 'B' => 'which', 'C' => 'who', 'D' => 'what'], 'which 引导非限制性定语从句'],
            ['He is widely regarded ___ a pioneer in sustainable architecture.', 'C', ['A' => 'for', 'B' => 'to', 'C' => 'as', 'D' => 'with'], 'be regarded as'],
            ['The company is on the verge ___ bankruptcy.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'of', 'D' => 'to'], 'on the verge of 濒临'],
            ['She was reluctant ___ the offer without consulting her advisor.', 'C', ['A' => 'accept', 'B' => 'accepting', 'C' => 'to accept', 'D' => 'accepted'], 'reluctant to do'],
            ['The evidence falls short ___ proving guilt beyond reasonable doubt.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'of', 'D' => 'to'], 'fall short of 不足'],
            ['He spoke with such conviction ___ everyone was persuaded.', 'C', ['A' => 'as', 'B' => 'so', 'C' => 'that', 'D' => 'which'], 'such...that'],
            ['The reform is designed to be compatible ___ international standards.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'with', 'D' => 'to'], 'compatible with'],
            ['It is preferable ___ the meeting be postponed until next week.', 'C', ['A' => 'what', 'B' => 'which', 'C' => 'that', 'D' => 'who'], 'preferable that'],
            ['The alumni network provides graduates ___ valuable career connections.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'with', 'D' => 'to'], 'provide sb with sth'],
            ['He was deprived ___ the opportunity due to bureaucratic delays.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'of', 'D' => 'from'], 'be deprived of 被剥夺'],
            ['The professor\'s lecture was met ___ enthusiastic applause.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'with', 'D' => 'by'], 'be met with 受到'],
            ['The initiative is geared ___ promoting lifelong learning.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'toward', 'D' => 'to'], 'be geared toward 面向'],
            ['He is competent ___ handling complex negotiations.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'in', 'D' => 'at'], 'competent in/at doing'],
            ['The outcome is predicated ___ several key assumptions.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'on', 'D' => 'to'], 'be predicated on 基于'],
            ['She was instrumental ___ securing funding for the project.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'in', 'D' => 'to'], 'instrumental in doing'],
            ['The treaty is binding ___ all signatory nations.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'on', 'D' => 'to'], 'binding on'],
            ['He is wary ___ making promises he cannot keep.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'of', 'D' => 'to'], 'wary of doing'],
            ['The analysis is premised ___ the notion that markets are efficient.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'on', 'D' => 'to'], 'premised on 以……为前提'],
            ['He acquitted himself well in the interview, ___ impressed the panel.', 'B', ['A' => 'that', 'B' => 'which', 'C' => 'who', 'D' => 'what'], 'which 非限制性定语从句'],
            ['The degree confers ___ graduates a competitive edge in the job market.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'on', 'D' => 'to'], 'confer on 授予'],
            ['It is plausible ___ the trend will continue in the coming decade.', 'C', ['A' => 'what', 'B' => 'which', 'C' => 'that', 'D' => 'who'], 'plausible that'],
            ['The committee is tasked ___ evaluating all grant proposals.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'with', 'D' => 'to'], 'be tasked with'],
            ['He is adamant ___ his refusal to compromise on quality.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'about', 'D' => 'to'], 'adamant about'],
            ['The legislation is intended to curb pollution, ___ has long plagued the city.', 'B', ['A' => 'that', 'B' => 'which', 'C' => 'who', 'D' => 'what'], 'which 非限制性定语从句'],
            ['She was commended ___ her outstanding contribution to the community.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'for', 'D' => 'to'], 'commend for'],
            ['The venture proved ___ than anyone had anticipated.', 'C', ['A' => 'success', 'B' => 'successful', 'C' => 'more successful', 'D' => 'most successful'], 'more successful than'],
            ['He is exempt ___ taking the elective course due to prior experience.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'from', 'D' => 'to'], 'exempt from'],
            ['The symposium coincided ___ the university\'s centennial celebration.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'with', 'D' => 'to'], 'coincide with'],
            ['He is receptive ___ constructive criticism.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'to', 'D' => 'of'], 'receptive to'],
            ['The findings have profound ramifications ___ public health policy.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'for', 'D' => 'to'], 'ramifications for'],
            ['She was nominated ___ the prestigious scholarship.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'for', 'D' => 'to'], 'nominate for'],
            ['The project ran ___ budget, forcing the team to cut costs.', 'C', ['A' => 'over', 'B' => 'in', 'C' => 'over', 'D' => 'on'], 'run over budget 超支'],
            ['He is conversant ___ the latest developments in AI research.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'with', 'D' => 'to'], 'conversant with 熟悉'],
            ['The board voted to divest ___ fossil fuel investments.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'from', 'D' => 'of'], 'divest from 撤资'],
            ['The ceremony marked the culmination ___ four years of hard work.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'of', 'D' => 'to'], 'culmination of'],
            ['He is poised ___ take on a leadership role in the organization.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'to', 'D' => 'on'], 'be poised to do'],
            ['The agreement stipulates that disputes ___ resolved through arbitration.', 'B', ['A' => 'are', 'B' => 'be', 'C' => 'was', 'D' => 'being'], 'stipulate that (should) be'],
            ['She was lauded ___ her groundbreaking research in neuroscience.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'for', 'D' => 'to'], 'laud for'],
            ['The economy is showing signs ___ recovery after the recession.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'of', 'D' => 'to'], 'signs of'],
            ['He is synonymous ___ innovation in the tech industry.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'with', 'D' => 'to'], 'synonymous with'],
            ['The policy is contingent ___ approval from the board of directors.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'on', 'D' => 'to'], 'contingent on'],
            ['Graduates are expected ___ uphold the university\'s values.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'to', 'D' => 'on'], 'be expected to do'],
            ['The lecture series is tailored ___ the needs of senior students.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'to', 'D' => 'on'], 'tailored to'],
            ['He was conferred ___ an honorary doctorate at the commencement.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'with', 'D' => 'on'], 'confer on sb sth / be conferred'],
            ['The capstone project is indicative ___ a student\'s overall competence.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'of', 'D' => 'to'], 'indicative of'],
            ['She emerged ___ the most promising candidate in the cohort.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'as', 'D' => 'to'], 'emerge as 成为'],
            ['The curriculum is structured ___ foster critical and creative thinking.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'to', 'D' => 'on'], 'structured to do'],
            ['His thesis was deemed worthy ___ publication in a top-tier journal.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'of', 'D' => 'to'], 'worthy of'],
            ['The commencement address inspired graduates ___ pursue meaningful careers.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'to', 'D' => 'on'], 'inspire sb to do'],
        ];
        $items[7] = ['The policy has far-reaching implications ___ the job market.', 'A', ['A' => 'for', 'B' => 'in', 'C' => 'to', 'D' => 'on'], 'implications for'];
        $items[23] = ['He is competent ___ handling complex negotiations.', 'D', ['A' => 'for', 'B' => 'in', 'C' => 'on', 'D' => 'at'], 'competent at doing'];
        $items[25] = ['She was instrumental ___ securing funding for the project.', 'B', ['A' => 'for', 'B' => 'in', 'C' => 'on', 'D' => 'to'], 'instrumental in'];
        $items[34] = ['She was commended ___ her outstanding contribution to the community.', 'A', ['A' => 'for', 'B' => 'in', 'C' => 'to', 'D' => 'on'], 'commend for'];
        $items[40] = ['The findings have profound ramifications ___ public health policy.', 'A', ['A' => 'for', 'B' => 'in', 'C' => 'to', 'D' => 'on'], 'ramifications for'];
        $items[41] = ['She was nominated ___ the prestigious scholarship.', 'A', ['A' => 'for', 'B' => 'in', 'C' => 'to', 'D' => 'on'], 'nominate for'];
        $items[42] = ['The project ran ___ budget, forcing the team to cut costs.', 'A', ['A' => 'over', 'B' => 'in', 'C' => 'on', 'D' => 'beyond'], 'run over budget'];
        $items[46] = ['She was lauded ___ her groundbreaking research in neuroscience.', 'A', ['A' => 'for', 'B' => 'in', 'C' => 'to', 'D' => 'on'], 'laud for'];
        $items[51] = ['He was conferred ___ an honorary doctorate at the commencement.', 'D', ['A' => 'for', 'B' => 'in', 'C' => 'with', 'D' => 'with'], 'be conferred with'];
        $items[51] = ['He was ___ an honorary doctorate at the commencement.', 'B', ['A' => 'conferred', 'B' => 'awarded', 'C' => 'rewarded', 'D' => 'granted with'], 'be awarded sth 被授予'];

        return $this->batch($grade, $stages, $items);
    }
}
