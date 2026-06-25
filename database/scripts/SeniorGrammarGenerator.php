<?php

/**
 * 生成高中（金丹 J1）全阶段语法填空题，供 grammar:import-json 导入。
 */
class SeniorGrammarGenerator
{
    /** @var array<string, int> */
    private array $seqByStage = [];

    /** @return list<array<string, mixed>> */
    public function generate(): array
    {
        return array_merge(
            $this->buildGrade10(),
            $this->buildGrade11(),
            $this->buildGrade12(),
        );
    }

    /** @return array<string, int> */
    public function stageCounts(array $questions): array
    {
        $counts = [];
        foreach ($questions as $row) {
            $key = ($row['realm'] ?? 'J1') . '-' . ($row['stage'] ?? '01');
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
            'question_id' => "JGV-J1-{$stage}-{$seq}",
            'type' => 'grammar',
            'realm' => 'J1',
            'stage' => $stage,
            'education_stage' => '高中',
            'grade_level' => $grade,
            'play_mode' => '语法机关桥',
            'scene' => '阵法峰',
            'question' => $stem,
            'options' => $options,
            'correct_answer' => $correctKey,
            'explanation' => $explanation . '。（来源：高中语法 · ' . $grade . '）',
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
    private function buildGrade10(): array
    {
        $grade = '高一';
        $stages = ['01', '02', '03'];
        $items = [];

        $tenses = [
            ['By the time I arrived, the lecture ___.', 'C', ['A' => 'starts', 'B' => 'started', 'C' => 'had started', 'D' => 'has started'], '过去的过去用过去完成时'],
            ['She ___ in this city since she graduated from college.', 'D', ['A' => 'works', 'B' => 'worked', 'C' => 'is working', 'D' => 'has worked'], 'since 引导的时间状语用现在完成时'],
            ['While I ___ along the street, I met an old friend.', 'B', ['A' => 'walk', 'B' => 'was walking', 'C' => 'walked', 'D' => 'have walked'], 'while 引导过去进行时'],
            ['I ___ my homework when the power went out.', 'C', ['A' => 'do', 'B' => 'did', 'C' => 'was doing', 'D' => 'have done'], 'when 从句一般过去，主句过去进行'],
            ['They ___ three cities by the end of last month.', 'D', ['A' => 'visit', 'B' => 'visited', 'C' => 'have visited', 'D' => 'had visited'], 'by the end of last month 用过去完成时'],
            ['The scientist ___ on this project for five years.', 'C', ['A' => 'works', 'B' => 'worked', 'C' => 'has been working', 'D' => 'had worked'], 'for five years 可用现在完成进行时'],
            ['At this time tomorrow, we ___ an English exam.', 'B', ['A' => 'take', 'B' => 'will be taking', 'C' => 'are taking', 'D' => 'took'], 'at this time tomorrow 用将来进行时'],
            ['He said he ___ the book the week before.', 'C', ['A' => 'reads', 'B' => 'read', 'C' => 'had read', 'D' => 'has read'], '间接引语中 the week before 用 had read'],
            ['I have never ___ such a beautiful sunset before.', 'C', ['A' => 'see', 'B' => 'saw', 'C' => 'seen', 'D' => 'seeing'], 'never 与现在完成时连用 have seen'],
            ['When we got to the cinema, the film ___ for ten minutes.', 'C', ['A' => 'begins', 'B' => 'began', 'C' => 'had been on', 'D' => 'has been on'], '电影已开始用 had been on'],
        ];
        foreach ($tenses as $q) {
            $items[] = $q;
        }

        $nonFinite = [
            ['The boy ___ on the sofa is my cousin.', 'B', ['A' => 'sleep', 'B' => 'sleeping', 'C' => 'slept', 'D' => 'to sleep'], '现在分词作后置定语'],
            ['I have a lot of homework ___.', 'C', ['A' => 'do', 'B' => 'doing', 'C' => 'to do', 'D' => 'done'], '不定式作定语'],
            ['___ from the hill, the city looks more beautiful.', 'A', ['A' => 'Seen', 'B' => 'Seeing', 'C' => 'To see', 'D' => 'See'], '过去分词作状语表被动'],
            ['The teacher came in, ___ by two students.', 'C', ['A' => 'follow', 'B' => 'following', 'C' => 'followed', 'D' => 'to follow'], 'followed 表被动“被跟随”'],
            ['It is important for us ___ a foreign language.', 'B', ['A' => 'learn', 'B' => 'to learn', 'C' => 'learning', 'D' => 'learned'], 'It is + adj + for sb to do'],
            ['She seems ___ the truth.', 'C', ['A' => 'know', 'B' => 'knowing', 'C' => 'to know', 'D' => 'known'], 'seem to do'],
            ['I regret ___ you that you failed the test.', 'B', ['A' => 'tell', 'B' => 'to tell', 'C' => 'telling', 'D' => 'told'], 'regret to do 遗憾地做（将做）'],
            ['Remember ___ the door when you leave.', 'B', ['A' => 'lock', 'B' => 'to lock', 'C' => 'locking', 'D' => 'locked'], 'remember to do 记得去做'],
            ['The problem is difficult ___.', 'C', ['A' => 'solve', 'B' => 'solving', 'C' => 'to solve', 'D' => 'solved'], '不定式作表语补语'],
            ['He was made ___ the truth.', 'B', ['A' => 'say', 'B' => 'to say', 'C' => 'saying', 'D' => 'said'], '被动语态 make 后 to 不省略'],
        ];
        foreach ($nonFinite as $q) {
            $items[] = $q;
        }

        $clauses = [
            ['This is the school ___ I studied for three years.', 'B', ['A' => 'who', 'B' => 'where', 'C' => 'which', 'D' => 'that'], 'where 引导定语从句表地点'],
            ['The reason ___ he was late was that he missed the bus.', 'C', ['A' => 'which', 'B' => 'who', 'C' => 'why', 'D' => 'that'], 'the reason why 固定搭配'],
            ['I will never forget the day ___ I first met my best friend.', 'B', ['A' => 'which', 'B' => 'when', 'C' => 'where', 'D' => 'that'], '时间先行词用 when'],
            ['Anyone ___ breaks the law will be punished.', 'A', ['A' => 'who', 'B' => 'which', 'C' => 'whom', 'D' => 'whose'], '修饰人用 who'],
            ['The house ___ windows face south is for sale.', 'D', ['A' => 'who', 'B' => 'which', 'C' => 'whom', 'D' => 'whose'], 'whose 表所属关系'],
            ['He is not the man ___ he used to be.', 'C', ['A' => 'who', 'B' => 'whom', 'C' => 'that', 'D' => 'which'], 'the man that he used to be'],
            ['___ is known to all, the earth goes around the sun.', 'A', ['A' => 'As', 'B' => 'Which', 'C' => 'That', 'D' => 'What'], 'as 引导非限制性定语从句'],
            ['I don\'t like the way ___ he speaks to his parents.', 'C', ['A' => 'which', 'B' => 'who', 'C' => 'that', 'D' => 'whom'], 'the way that/in which'],
            ['The book ___ cover is red belongs to Tom.', 'D', ['A' => 'who', 'B' => 'which', 'C' => 'whom', 'D' => 'whose'], 'whose cover 书的封面'],
            ['He has two sons, both of ___ are doctors.', 'C', ['A' => 'who', 'B' => 'which', 'C' => 'whom', 'D' => 'them'], 'both of whom 非限制性定语从句'],
        ];
        foreach ($clauses as $q) {
            $items[] = $q;
        }

        $adverbial = [
            ['___ it was raining heavily, they continued their journey.', 'B', ['A' => 'Because', 'B' => 'Although', 'C' => 'Since', 'D' => 'As'], 'although 表让步“尽管”'],
            ['He spoke loudly ___ everyone could hear him.', 'C', ['A' => 'so that', 'B' => 'in order', 'C' => 'so that', 'D' => 'such that'], 'so that 表目的'],
            ['I will call you ___ I arrive at the airport.', 'A', ['A' => 'as soon as', 'B' => 'while', 'C' => 'until', 'D' => 'since'], 'as soon as 一……就'],
            ['___ you work hard, you will succeed.', 'A', ['A' => 'If', 'B' => 'Unless', 'C' => 'Until', 'D' => 'While'], 'if 引导条件状语从句'],
            ['She has been living here ___ she was born.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'since', 'D' => 'from'], 'since + 时间点'],
            ['He didn\'t go to bed ___ he finished his work.', 'C', ['A' => 'when', 'B' => 'while', 'C' => 'until', 'D' => 'since'], 'not...until 直到……才'],
            ['___ hard you try, you can\'t solve it alone.', 'B', ['A' => 'What', 'B' => 'However', 'C' => 'Whatever', 'D' => 'Whichever'], 'however hard 无论怎样努力'],
            ['___ I have time, I will help you.', 'A', ['A' => 'If', 'B' => 'Although', 'C' => 'Because', 'D' => 'Since'], 'if 表条件'],
        ];
        $adverbial[1] = ['He spoke loudly ___ everyone could hear him.', 'A', ['A' => 'so that', 'B' => 'because', 'C' => 'although', 'D' => 'unless'], 'so that 表目的“以便”'];
        foreach ($adverbial as $q) {
            $items[] = $q;
        }

        $vocabGrammar = [
            ['The ___ look on her face told us something was wrong.', 'B', ['A' => 'worry', 'B' => 'worried', 'C' => 'worrying', 'D' => 'worries'], 'worried look 担忧的表情'],
            ['The ___ news made everyone excited.', 'C', ['A' => 'excite', 'B' => 'excited', 'C' => 'exciting', 'D' => 'excites'], 'exciting news 令人兴奋的消息'],
            ['He spoke in a ___ voice.', 'B', ['A' => 'fright', 'B' => 'frightened', 'C' => 'frightening', 'D' => 'frighten'], 'frightened voice 惊恐的声音'],
            ['It is ___ to travel without a map in a strange city.', 'C', ['A' => 'danger', 'B' => 'dangerous', 'C' => 'dangerous', 'D' => 'endanger'], 'It is dangerous to do'],
            ['The number of students in our school ___ increasing.', 'B', ['A' => 'are', 'B' => 'is', 'C' => 'were', 'D' => 'be'], 'the number of 谓语单数'],
            ['A large number of students ___ against the plan.', 'C', ['A' => 'is', 'B' => 'was', 'C' => 'are', 'D' => 'be'], 'a large number of 谓语复数'],
            ['Not only the students but also the teacher ___ present.', 'B', ['A' => 'are', 'B' => 'was', 'C' => 'were', 'D' => 'be'], '就近原则 teacher → was'],
            ['Every student and every teacher ___ to attend.', 'B', ['A' => 'are', 'B' => 'is', 'C' => 'were', 'D' => 'be'], 'every...and every... 谓语单数'],
            ['The United States ___ a developed country.', 'B', ['A' => 'are', 'B' => 'is', 'C' => 'were', 'D' => 'be'], '国名单数谓语'],
            ['Mathematics ___ my favorite subject.', 'B', ['A' => 'are', 'B' => 'is', 'C' => 'were', 'D' => 'be'], '学科名单数谓语'],
        ];
        $vocabGrammar[3] = ['It is ___ to travel without a map in a strange city.', 'B', ['A' => 'danger', 'B' => 'dangerous', 'C' => 'endangered', 'D' => 'endanger'], 'It is dangerous to do'];
        foreach ($vocabGrammar as $q) {
            $items[] = $q;
        }

        $extra10 = [
            ['It was in this lab ___ the experiment was carried out.', 'B', ['A' => 'which', 'B' => 'that', 'C' => 'where', 'D' => 'when'], '强调句 It was...that'],
            ['Only when he apologized ___ she forgive him.', 'B', ['A' => 'did', 'B' => 'did', 'C' => 'does', 'D' => 'do'], 'Only when 置于句首部分倒装'],
            ['Never ___ such a wonderful performance.', 'C', ['A' => 'I have seen', 'B' => 'I had seen', 'C' => 'have I seen', 'D' => 'had I seen'], 'Never 置于句首倒装'],
            ['If I ___ you, I would accept the offer.', 'B', ['A' => 'am', 'B' => 'were', 'C' => 'was', 'D' => 'be'], '虚拟语气 If I were you'],
            ['I wish I ___ taller.', 'C', ['A' => 'am', 'B' => 'was', 'C' => 'were', 'D' => 'be'], 'wish 从句用过去式表虚拟'],
            ['He suggested that we ___ early.', 'B', ['A' => 'go', 'B' => 'should go', 'C' => 'went', 'D' => 'going'], 'suggest that sb (should) do'],
            ['It is necessary that he ___ the rules.', 'B', ['A' => 'obey', 'B' => 'should obey', 'C' => 'obeys', 'D' => 'obeyed'], 'necessary that 用 (should) do'],
            ['The doctor insisted that he ___ nothing serious.', 'C', ['A' => 'has', 'B' => 'have', 'C' => 'had', 'D' => 'having'], 'insist 坚持说，用陈述语气过去时'],
            ['What he said sounds ___.', 'B', ['A' => 'reason', 'B' => 'reasonable', 'C' => 'reasonably', 'D' => 'reasoning'], 'sound 系动词后接形容词'],
            ['The project is well worth ___.', 'C', ['A' => 'do', 'B' => 'to do', 'C' => 'doing', 'D' => 'done'], 'be worth doing'],
            ['He is used to ___ up early.', 'C', ['A' => 'get', 'B' => 'getting', 'C' => 'getting', 'D' => 'got'], 'be used to doing 习惯于'],
            ['There is no point ___ about it.', 'C', ['A' => 'worry', 'B' => 'to worry', 'C' => 'in worrying', 'D' => 'worried'], 'there is no point in doing'],
            ['She can\'t help ___ when she hears the joke.', 'C', ['A' => 'laugh', 'B' => 'to laugh', 'C' => 'laughing', 'D' => 'laughed'], 'can\'t help doing 忍不住'],
            ['I would appreciate ___ if you could help me.', 'B', ['A' => 'that', 'B' => 'it', 'C' => 'this', 'D' => 'one'], 'appreciate it if 固定句型'],
            ['It is the first time that I ___ Beijing.', 'C', ['A' => 'visit', 'B' => 'visited', 'C' => 'have visited', 'D' => 'had visited'], 'It is the first time + 现在完成时'],
            ['Hardly ___ home when it began to rain.', 'B', ['A' => 'had he got', 'B' => 'had he got', 'C' => 'he had got', 'D' => 'did he get'], 'Hardly...when 倒装'],
            ['So difficult ___ that few students can answer it.', 'B', ['A' => 'the problem is', 'B' => 'is the problem', 'C' => 'was the problem', 'D' => 'the problem was'], 'So + adj 置于句首倒装'],
            ['The meeting ___ next Monday has been put off.', 'C', ['A' => 'hold', 'B' => 'to hold', 'C' => 'to be held', 'D' => 'holding'], '不定式被动作定语'],
            ['I have no idea ___ he will come back.', 'B', ['A' => 'what', 'B' => 'when', 'C' => 'which', 'D' => 'who'], 'when 引导同位语从句/宾语从句'],
            ['He devoted all his time ___ the research.', 'C', ['A' => 'do', 'B' => 'to do', 'C' => 'to doing', 'D' => 'doing'], 'devote...to doing'],
        ];
        $extra10[5] = ['Only when he apologized ___ she forgive him.', 'A', ['A' => 'did', 'B' => 'does', 'C' => 'do', 'D' => 'would'], 'Only when 部分倒装 did'];
        $extra10[10] = ['He is used to ___ up early.', 'B', ['A' => 'get', 'B' => 'getting', 'C' => 'got', 'D' => 'gets'], 'be used to doing'];
        $extra10[15] = ['Hardly ___ home when it began to rain.', 'A', ['A' => 'had he got', 'B' => 'he had got', 'C' => 'did he get', 'D' => 'he got'], 'Hardly had he got when'];
        $extra10[16] = ['So difficult ___ that few students can answer it.', 'B', ['A' => 'the problem is', 'B' => 'is the problem', 'C' => 'was the problem', 'D' => 'the problem was'], 'So difficult is the problem 倒装'];
        foreach ($extra10 as $q) {
            $items[] = $q;
        }

        return $this->batch($grade, $stages, $items);
    }

    /** @return list<array<string, mixed>> */
    private function buildGrade11(): array
    {
        $grade = '高二';
        $stages = ['04', '05', '06'];
        $items = [];

        $passive = [
            ['The bridge ___ next year.', 'C', ['A' => 'builds', 'B' => 'built', 'C' => 'will be built', 'D' => 'is building'], '将来被动 will be built'],
            ['The problem is believed ___ by human activity.', 'C', ['A' => 'cause', 'B' => 'to cause', 'C' => 'to be caused', 'D' => 'causing'], 'be believed to be done 被动不定式'],
            ['He is said ___ abroad for three years.', 'B', ['A' => 'study', 'B' => 'to have studied', 'C' => 'to study', 'D' => 'studying'], 'be said to have done 据说已经'],
            ['The book is worth ___.', 'C', ['A' => 'read', 'B' => 'to read', 'C' => 'reading', 'D' => 'being read'], 'be worth reading 值得读'],
            ['The window needs ___.', 'C', ['A' => 'repair', 'B' => 'to repair', 'C' => 'repairing', 'D' => 'repaired'], 'need doing 需要被修'],
            ['He had his wallet ___ on the bus.', 'C', ['A' => 'steal', 'B' => 'to steal', 'C' => 'stolen', 'D' => 'stealing'], 'have sth done 使某事被做'],
            ['I\'d like my hair ___ this afternoon.', 'C', ['A' => 'cut', 'B' => 'to cut', 'C' => 'cut', 'D' => 'cutting'], 'have/get sth done'],
            ['The murderer was reported ___ in a nearby village.', 'C', ['A' => 'see', 'B' => 'to see', 'C' => 'to have been seen', 'D' => 'seeing'], '据报道曾被看见'],
            ['English ___ as an official language in many countries.', 'B', ['A' => 'speaks', 'B' => 'is spoken', 'C' => 'spoke', 'D' => 'speaking'], '被动 is spoken'],
            ['A new teaching building ___ in our school now.', 'C', ['A' => 'builds', 'B' => 'built', 'C' => 'is being built', 'D' => 'was built'], '现在进行被动 is being built'],
        ];
        foreach ($passive as $q) {
            $items[] = $q;
        }

        $objectClauses = [
            ['The fact ___ he succeeded encouraged us.', 'C', ['A' => 'what', 'B' => 'which', 'C' => 'that', 'D' => 'who'], 'the fact that 同位语从句'],
            ['It is obvious ___ he is lying.', 'C', ['A' => 'what', 'B' => 'which', 'C' => 'that', 'D' => 'who'], 'It is obvious that'],
            ['I have no doubt ___ she will win the competition.', 'C', ['A' => 'what', 'B' => 'which', 'C' => 'that', 'D' => 'if'], 'no doubt that 毫无疑问'],
            ['The question is ___ we can finish it on time.', 'C', ['A' => 'what', 'B' => 'which', 'C' => 'whether', 'D' => 'that'], 'whether 是否'],
            ['Word came ___ our team had won the game.', 'C', ['A' => 'what', 'B' => 'which', 'C' => 'that', 'D' => 'who'], 'word came that 消息传来'],
            ['What surprised me was ___ he refused the offer.', 'C', ['A' => 'what', 'B' => 'which', 'C' => 'that', 'D' => 'who'], '表语从句 that'],
            ['It remains to be seen ___ the plan will work.', 'C', ['A' => 'what', 'B' => 'which', 'C' => 'whether', 'D' => 'that'], 'whether 是否'],
            ['He told me ___ he had already finished the task.', 'C', ['A' => 'what', 'B' => 'which', 'C' => 'that', 'D' => 'who'], '陈述句转 that 从句'],
            ['I wonder ___ caused the accident.', 'A', ['A' => 'what', 'B' => 'that', 'C' => 'which', 'D' => 'who'], 'what 作主语'],
            ['The reason why he left is ___ he was unhappy.', 'C', ['A' => 'what', 'B' => 'which', 'C' => 'that', 'D' => 'because'], 'the reason is that 不用 because'],
        ];
        foreach ($objectClauses as $q) {
            $items[] = $q;
        }

        $participles = [
            ['___ from the top of the mountain, the city is breathtaking.', 'A', ['A' => 'Seen', 'B' => 'Seeing', 'C' => 'To see', 'D' => 'See'], 'Seen 表被动“被看”'],
            ['___ carefully, the problem can be solved.', 'B', ['A' => 'Analyze', 'B' => 'Analyzed', 'C' => 'Analyzing', 'D' => 'To analyze'], 'Analyzed 表条件“如果被分析”'],
            ['The girl ___ in the corner is my sister.', 'C', ['A' => 'seat', 'B' => 'seated', 'C' => 'seated', 'D' => 'seating'], 'seated 表状态“坐着的”'],
            ['___ more attention, the trees could have grown better.', 'A', ['A' => 'Given', 'B' => 'Giving', 'C' => 'To give', 'D' => 'Give'], 'Given 表假设“如果被给予”'],
            ['The building ___ last year is our library.', 'C', ['A' => 'complete', 'B' => 'completing', 'C' => 'completed', 'D' => 'to complete'], 'completed 表被动完成'],
            ['___ tired, he went to bed early.', 'B', ['A' => 'Feel', 'B' => 'Feeling', 'C' => 'Felt', 'D' => 'To feel'], 'feeling 表原因状语'],
            ['The speech ___ at the meeting was inspiring.', 'C', ['A' => 'deliver', 'B' => 'delivering', 'C' => 'delivered', 'D' => 'to deliver'], 'delivered 被动定语'],
            ['___ time and money, we finished the project.', 'B', ['A' => 'Lack', 'B' => 'Lacking', 'C' => 'Lacked', 'D' => 'To lack'], 'lacking 表原因“由于缺乏”'],
        ];
        $participles[2] = ['The girl ___ in the corner is my sister.', 'B', ['A' => 'seat', 'B' => 'seated', 'C' => 'seating', 'D' => 'sit'], 'seated 表状态'];
        foreach ($participles as $q) {
            $items[] = $q;
        }

        $emphasis = [
            ['It was Tom ___ broke the window.', 'B', ['A' => 'who', 'B' => 'that', 'C' => 'which', 'D' => 'whom'], '强调人可用 who/that'],
            ['It was yesterday ___ we met the famous writer.', 'B', ['A' => 'which', 'B' => 'that', 'C' => 'when', 'D' => 'where'], '强调时间用 that'],
            ['It is kindness ___ the world needs most.', 'C', ['A' => 'who', 'B' => 'which', 'C' => 'that', 'D' => 'what'], '强调句型 It is...that'],
            ['Was it in the library ___ you lost your keys?', 'B', ['A' => 'which', 'B' => 'that', 'C' => 'where', 'D' => 'when'], '强调地点用 that'],
            ['It was not until midnight ___ he came back.', 'B', ['A' => 'which', 'B' => 'that', 'C' => 'when', 'D' => 'then'], 'not until 强调句'],
            ['___ I need is your support.', 'A', ['A' => 'What', 'B' => 'That', 'C' => 'Which', 'D' => 'Who'], 'What 引导主语从句'],
            ['___ matters most is not money but health.', 'A', ['A' => 'What', 'B' => 'That', 'C' => 'Which', 'D' => 'Who'], 'What matters most'],
            ['It doesn\'t matter ___ you start, as long as you don\'t stop.', 'C', ['A' => 'what', 'B' => 'which', 'C' => 'when', 'D' => 'who'], 'when 引导从句'],
        ];
        foreach ($emphasis as $q) {
            $items[] = $q;
        }

        $inversion = [
            ['Little ___ that he would become a scientist.', 'B', ['A' => 'he knew', 'B' => 'did he know', 'C' => 'he did know', 'D' => 'knew he'], 'Little 置于句首倒装'],
            ['Not until he came back ___ go to bed.', 'B', ['A' => 'did she', 'B' => 'did she', 'C' => 'she did', 'D' => 'she'], 'Not until 倒装'],
            ['Only in this way ___ solve the problem.', 'B', ['A' => 'we can', 'B' => 'can we', 'C' => 'we could', 'D' => 'could we'], 'Only in this way can we'],
            ['Seldom ___ such a beautiful place.', 'C', ['A' => 'I have seen', 'B' => 'I had seen', 'C' => 'have I seen', 'D' => 'had I seen'], 'Seldom 倒装'],
            ['Under the tree ___ two old men playing chess.', 'B', ['A' => 'are sitting', 'B' => 'sat', 'C' => 'sitting', 'D' => 'sit'], '地点状语前置倒装'],
            ['Such ___ the result that everyone was shocked.', 'B', ['A' => 'is', 'B' => 'was', 'C' => 'were', 'D' => 'are'], 'Such was the result 倒装'],
        ];
        $inversion[1] = ['Not until he came back ___ go to bed.', 'A', ['A' => 'did she', 'B' => 'she did', 'C' => 'does she', 'D' => 'she does'], 'Not until 倒装 did she'];
        foreach ($inversion as $q) {
            $items[] = $q;
        }

        $subjunctive = [
            ['If it ___ for your help, I would have failed.', 'B', ['A' => 'is not', 'B' => 'had not been', 'C' => 'were not', 'D' => 'has not been'], '与过去相反 had not been'],
            ['If I ___ more time, I would travel around the world.', 'C', ['A' => 'have', 'B' => 'had', 'C' => 'had', 'D' => 'will have'], '与现在相反用过去式 had'],
            ['I wish I ___ harder when I was in senior high.', 'B', ['A' => 'study', 'B' => 'had studied', 'C' => 'studied', 'D' => 'would study'], 'wish 与过去相反 had studied'],
            ['But for the rain, we ___ the sports meeting.', 'C', ['A' => 'hold', 'B' => 'held', 'C' => 'would have held', 'D' => 'will hold'], 'but for 含蓄虚拟 would have done'],
            ['Without electricity, modern life ___ impossible.', 'B', ['A' => 'is', 'B' => 'would be', 'C' => 'was', 'D' => 'will be'], 'without 含蓄虚拟 would be'],
            ['It is high time that we ___ action.', 'C', ['A' => 'take', 'B' => 'took', 'C' => 'took', 'D' => 'will take'], 'It is high time that + 过去式'],
            ['If only he ___ here now!', 'B', ['A' => 'is', 'B' => 'were', 'C' => 'was', 'D' => 'be'], 'If only 与现在相反 were'],
            ['The boss ordered that the report ___ submitted by Friday.', 'B', ['A' => 'is', 'B' => 'be', 'C' => 'was', 'D' => 'being'], 'order that sb (should) be'],
        ];
        $subjunctive[1] = ['If I ___ more time, I would travel around the world.', 'B', ['A' => 'have', 'B' => 'had', 'C' => 'will have', 'D' => 'would have'], '与现在相反用 had'];
        $subjunctive[5] = ['It is high time that we ___ action.', 'B', ['A' => 'take', 'B' => 'took', 'C' => 'will take', 'D' => 'would take'], 'It is high time that + 过去式'];
        foreach ($subjunctive as $q) {
            $items[] = $q;
        }

        $extra11 = [
            ['The way ___ he explained the problem was clear.', 'C', ['A' => 'which', 'B' => 'in which', 'C' => 'that', 'D' => 'who'], 'the way that 或 in which'],
            ['He is a man of few words but ___ he says counts.', 'C', ['A' => 'which', 'B' => 'that', 'C' => 'what', 'D' => 'who'], 'what he says 主语从句'],
            ['It is no wonder ___ he passed the exam.', 'C', ['A' => 'what', 'B' => 'which', 'C' => 'that', 'D' => 'who'], 'no wonder that'],
            ['There is no denying ___ practice makes perfect.', 'C', ['A' => 'what', 'B' => 'which', 'C' => 'that', 'D' => 'who'], 'no denying that'],
            ['He is thought ___ honest.', 'B', ['A' => 'be', 'B' => 'to be', 'C' => 'being', 'D' => 'been'], 'be thought to be'],
            ['I object to ___ treated like a child.', 'C', ['A' => 'be', 'B' => 'being', 'C' => 'being', 'D' => 'been'], 'object to doing'],
            ['Rather than ___ idle, he volunteered to help.', 'A', ['A' => 'stay', 'B' => 'staying', 'C' => 'stayed', 'D' => 'to stay'], 'rather than do 而不是'],
            ['The more you read, the ___ you will understand.', 'C', ['A' => 'much', 'B' => 'many', 'C' => 'more', 'D' => 'most'], 'the more...the more'],
            ['He is the last person ___ I want to see.', 'C', ['A' => 'who', 'B' => 'whom', 'C' => 'that', 'D' => 'which'], 'the last person that'],
            ['All ___ is needed is time and patience.', 'C', ['A' => 'what', 'B' => 'which', 'C' => 'that', 'D' => 'who'], 'all that is needed'],
            ['He spoke as if he ___ everything.', 'C', ['A' => 'knows', 'B' => 'knew', 'C' => 'had known', 'D' => 'know'], 'as if 与过去相反 had known'],
            ['You might as well ___ the truth.', 'A', ['A' => 'tell', 'B' => 'telling', 'C' => 'to tell', 'D' => 'told'], 'might as well do'],
            ['It is likely ___ it will rain tomorrow.', 'C', ['A' => 'what', 'B' => 'which', 'C' => 'that', 'D' => 'who'], 'It is likely that'],
            ['He avoided ___ eye contact with the teacher.', 'C', ['A' => 'make', 'B' => 'to make', 'C' => 'making', 'D' => 'made'], 'avoid doing'],
            ['The accident resulted ___ three deaths.', 'C', ['A' => 'in', 'B' => 'from', 'C' => 'in', 'D' => 'to'], 'result in 导致'],
            ['His success resulted ___ hard work.', 'B', ['A' => 'in', 'B' => 'from', 'C' => 'of', 'D' => 'to'], 'result from 源于'],
            ['She is capable ___ solving the problem.', 'C', ['A' => 'for', 'B' => 'with', 'C' => 'of', 'D' => 'to'], 'capable of doing'],
            ['He is independent ___ his parents now.', 'C', ['A' => 'with', 'B' => 'from', 'C' => 'of', 'D' => 'to'], 'independent of 不依赖'],
            ['We must adapt ourselves ___ the new environment.', 'C', ['A' => 'with', 'B' => 'for', 'C' => 'to', 'D' => 'in'], 'adapt to 适应'],
            ['The plan aims ___ improving students\' English.', 'C', ['A' => 'for', 'B' => 'in', 'C' => 'at', 'D' => 'to'], 'aim at 旨在'],
        ];
        $extra11[5] = ['I object to ___ treated like a child.', 'B', ['A' => 'be', 'B' => 'being', 'C' => 'been', 'D' => 'to be'], 'object to being done'];
        $extra11[14] = ['The accident resulted ___ three deaths.', 'A', ['A' => 'in', 'B' => 'from', 'C' => 'of', 'D' => 'to'], 'result in 导致'];
        foreach ($extra11 as $q) {
            $items[] = $q;
        }

        return $this->batch($grade, $stages, $items);
    }

    /** @return list<array<string, mixed>> */
    private function buildGrade12(): array
    {
        $grade = '高三';
        $stages = ['07', '08', '09'];
        $items = [];

        $ellipsis = [
            ['—Will you join us? —I\'d love to if ___.', 'B', ['A' => 'invite', 'B' => 'invited', 'C' => 'inviting', 'D' => 'to invite'], 'if invited 省略 if I am invited'],
            ['He didn\'t come, though ___.', 'C', ['A' => 'ask', 'B' => 'asking', 'C' => 'asked', 'D' => 'to ask'], 'though asked 省略 he was asked'],
            ['—Are you a teacher? —No, but I ___.', 'C', ['A' => 'want', 'B' => 'want to', 'C' => 'want to be', 'D' => 'want be'], 'want to be 省略 a teacher'],
            ['He can play the piano and so ___.', 'B', ['A' => 'can I', 'B' => 'can I', 'C' => 'I can', 'D' => 'do I'], 'so can I 倒装'],
            ['He doesn\'t like coffee and neither ___.', 'B', ['A' => 'I do', 'B' => 'do I', 'C' => 'I don\'t', 'D' => 'don\'t I'], 'neither do I'],
            ['If ___ possible, I will come tomorrow.', 'B', ['A' => 'is', 'B' => 'it is', 'C' => 'that is', 'D' => 'be'], 'if it is possible 不可过度省略'],
            ['When ___, the machine should be checked.', 'C', ['A' => 'use', 'B' => 'using', 'C' => 'used', 'D' => 'to use'], 'when used 省略 when it is used'],
            ['While ___, he fell asleep.', 'B', ['A' => 'read', 'B' => 'reading', 'C' => 'readed', 'D' => 'to read'], 'while reading 省略 while he was reading'],
        ];
        $ellipsis[3] = ['He can play the piano and so ___.', 'A', ['A' => 'can I', 'B' => 'I can', 'C' => 'do I', 'D' => 'I do'], 'so can I'];
        $ellipsis[4] = ['He doesn\'t like coffee and neither ___.', 'B', ['A' => 'I do', 'B' => 'do I', 'C' => 'I don\'t', 'D' => 'am I'], 'neither do I'];
        $ellipsis[5] = ['If ___, I will come tomorrow.', 'B', ['A' => 'possible', 'B' => 'possible', 'C' => 'it possible', 'D' => 'is possible'], 'if possible 省略 if it is'];
        foreach ($ellipsis as $q) {
            $items[] = $q;
        }

        $advanced = [
            ['Had I known the truth, I ___ you.', 'C', ['A' => 'tell', 'B' => 'told', 'C' => 'would have told', 'D' => 'will tell'], 'Had I known 倒装虚拟'],
            ['Were it not for the doctor, the patient ___ dead.', 'B', ['A' => 'is', 'B' => 'would be', 'C' => 'was', 'D' => 'will be'], 'Were it not for 虚拟'],
            ['___ you need help, please let me know.', 'A', ['A' => 'Should', 'B' => 'Would', 'C' => 'Could', 'D' => 'Might'], 'Should you need 倒装条件句'],
            ['It was his courage ___ saved the child.', 'B', ['A' => 'who', 'B' => 'that', 'C' => 'which', 'D' => 'what'], '强调主语 that'],
            ['No matter ___ hard it is, don\'t give up.', 'C', ['A' => 'what', 'B' => 'which', 'C' => 'how', 'D' => 'who'], 'no matter how hard'],
            ['Whatever ___ said, he wouldn\'t change his mind.', 'B', ['A' => 'is', 'B' => 'was', 'C' => 'were', 'D' => 'be'], 'whatever was said'],
            ['The more carefully you plan, the ___ mistakes you will make.', 'C', ['A' => 'little', 'B' => 'less', 'C' => 'fewer', 'D' => 'fewest'], 'fewer mistakes 可数名词'],
            ['Not only ___ intelligent, but he is also hardworking.', 'B', ['A' => 'he is', 'B' => 'is he', 'C' => 'he was', 'D' => 'was he'], 'Not only 倒装 is he'],
            ['Such a strange thing ___ never happened before.', 'B', ['A' => 'I have heard', 'B' => 'have I heard', 'C' => 'I heard', 'D' => 'did I hear'], 'Such 置于句首倒装'],
            ['It is generally believed ___ education is the key to success.', 'C', ['A' => 'what', 'B' => 'which', 'C' => 'that', 'D' => 'who'], 'It is believed that'],
        ];
        $advanced[2] = ['___ you need help, please let me know.', 'A', ['A' => 'Should', 'B' => 'Would', 'C' => 'Could', 'D' => 'Might'], 'Should you need 倒装'];
        foreach ($advanced as $q) {
            $items[] = $q;
        }

        $discourse = [
            ['___, let me introduce our guest speaker.', 'A', ['A' => 'First of all', 'B' => 'After all', 'C' => 'In all', 'D' => 'At all'], 'First of all 首先'],
            ['He studied hard. ___, he passed the exam.', 'B', ['A' => 'However', 'B' => 'Therefore', 'C' => 'Although', 'D' => 'Unless'], 'Therefore 因此'],
            ['___, the plan sounds good, but it costs too much.', 'C', ['A' => 'Therefore', 'B' => 'Moreover', 'C' => 'However', 'D' => 'Besides'], 'However 然而'],
            ['___, we must consider the environmental impact.', 'B', ['A' => 'In addition', 'B' => 'In addition', 'C' => 'Instead', 'D' => 'Otherwise'], 'In addition 此外'],
            ['You must hurry; ___, you will miss the train.', 'C', ['A' => 'however', 'B' => 'therefore', 'C' => 'otherwise', 'D' => 'moreover'], 'otherwise 否则'],
            ['___, I disagree with your opinion.', 'B', ['A' => 'In my opinion', 'B' => 'Personally', 'C' => 'Generally', 'D' => 'Actually'], 'Personally 就个人而言'],
            ['The evidence is clear. ___, he is guilty.', 'B', ['A' => 'However', 'B' => 'In conclusion', 'C' => 'Although', 'D' => 'Besides'], 'In conclusion 总之'],
            ['___, technology has changed our lives greatly.', 'A', ['A' => 'On the whole', 'B' => 'On the contrary', 'C' => 'In contrast', 'D' => 'Instead'], 'On the whole 总体而言'],
        ];
        $discourse[3] = ['___, we must consider the environmental impact.', 'A', ['A' => 'In addition', 'B' => 'Instead', 'C' => 'However', 'D' => 'Therefore'], 'In addition 此外'];
        foreach ($discourse as $q) {
            $items[] = $q;
        }

        $speculation = [
            ['He ___ be at home now. His car is not here.', 'D', ['A' => 'must', 'B' => 'should', 'C' => 'can', 'D' => 'can\'t'], 'can\'t 不可能（否定推测）'],
            ['She ___ have left. Her bag is still here.', 'D', ['A' => 'must', 'B' => 'should', 'C' => 'can', 'D' => 'can\'t'], 'can\'t have done 不可能已经'],
            ['He ___ have missed the train. That\'s why he\'s late.', 'B', ['A' => 'can', 'B' => 'may', 'C' => 'must', 'D' => 'should'], 'may have done 可能已经'],
            ['You ___ have seen him yesterday. He was abroad.', 'D', ['A' => 'must', 'B' => 'should', 'C' => 'can', 'D' => 'couldn\'t'], 'couldn\'t have done 不可能'],
            ['He ___ be the thief. I saw him at the scene.', 'A', ['A' => 'must', 'B' => 'can', 'C' => 'may', 'D' => 'might'], 'must 一定（肯定推测）'],
            ['You ___ have been more careful.', 'B', ['A' => 'can', 'B' => 'should', 'C' => 'must', 'D' => 'may'], 'should have done 本应该'],
            ['I ___ have told you earlier, but I forgot.', 'B', ['A' => 'can', 'B' => 'should', 'C' => 'must', 'D' => 'may'], 'should have done 本应该却未'],
            ['He ___ have forgotten the appointment.', 'C', ['A' => 'can', 'B' => 'should', 'C' => 'must', 'D' => 'need'], 'must have done 一定已经'],
        ];
        foreach ($speculation as $q) {
            $items[] = $q;
        }

        $complex = [
            ['It was not what he said but what he did ___ moved us.', 'B', ['A' => 'which', 'B' => 'that', 'C' => 'who', 'D' => 'what'], '强调句 not...but...that'],
            ['There is no doubt ___ climate change is a serious problem.', 'C', ['A' => 'what', 'B' => 'which', 'C' => 'that', 'D' => 'whether'], 'no doubt that'],
            ['He is such a good teacher ___ we all respect him.', 'C', ['A' => 'who', 'B' => 'which', 'C' => 'that', 'D' => 'as'], 'such...that 如此……以至于'],
            ['He is so kind a person ___ everyone likes him.', 'C', ['A' => 'who', 'B' => 'which', 'C' => 'that', 'D' => 'as'], 'so...that 句型'],
            ['The reason he gave ___ he was too busy.', 'C', ['A' => 'what', 'B' => 'which', 'C' => 'was that', 'D' => 'because'], 'the reason was that'],
            ['He is one of the students who ___ been awarded.', 'B', ['A' => 'has', 'B' => 'have', 'C' => 'is', 'D' => 'was'], '定语从句修饰 students → have'],
            ['He is the only one of the students who ___ passed.', 'A', ['A' => 'has', 'B' => 'have', 'C' => 'is', 'D' => 'are'], 'the only one of → has'],
            ['I\'d rather you ___ here tomorrow.', 'B', ['A' => 'come', 'B' => 'came', 'C' => 'will come', 'D' => 'coming'], 'would rather sb did'],
            ['It is essential that every student ___ the rules.', 'B', ['A' => 'follow', 'B' => 'should follow', 'C' => 'follows', 'D' => 'followed'], 'essential that (should) do'],
            ['Were I in your position, I ___ the same decision.', 'C', ['A' => 'make', 'B' => 'made', 'C' => 'would make', 'D' => 'will make'], 'Were I... would do 虚拟'],
        ];
        $complex[4] = ['The reason he gave ___ he was too busy.', 'C', ['A' => 'what', 'B' => 'which', 'C' => 'was that', 'D' => 'because'], '表语从句 was that'];
        foreach ($complex as $q) {
            $items[] = $q;
        }

        $extra12 = [
            ['With the economy ___, more jobs are being created.', 'B', ['A' => 'grow', 'B' => 'growing', 'C' => 'grown', 'D' => 'to grow'], 'with + n + doing 复合结构'],
            ['With all the work ___, she felt relaxed.', 'C', ['A' => 'finish', 'B' => 'finishing', 'C' => 'finished', 'D' => 'to finish'], 'with work finished 工作完成后'],
            ['The professor, along with his students, ___ the experiment.', 'B', ['A' => 'are doing', 'B' => 'is doing', 'C' => 'were doing', 'D' => 'be doing'], 'along with 就远原则，谓语与 professor 一致'],
            ['More than one student ___ absent today.', 'B', ['A' => 'are', 'B' => 'is', 'C' => 'were', 'D' => 'be'], 'more than one + 单数谓语'],
            ['Many a student ___ against the proposal.', 'B', ['A' => 'are', 'B' => 'is', 'C' => 'were', 'D' => 'be'], 'many a + 单数谓语'],
            ['What he needs is ___ good rest.', 'C', ['A' => 'have', 'B' => 'to have', 'C' => 'a', 'D' => 'having'], 'What he needs is a good rest'],
            ['It ___ me an hour to get to school every day.', 'B', ['A' => 'spends', 'B' => 'takes', 'C' => 'costs', 'D' => 'pays'], 'It takes sb time to do'],
            ['The police ___ searching for the missing child.', 'B', ['A' => 'is', 'B' => 'are', 'C' => 'was', 'D' => 'be'], 'police 集体名词复数谓语'],
            ['The audience ___ enjoying the performance.', 'B', ['A' => 'is', 'B' => 'are', 'C' => 'was', 'D' => 'be'], 'audience 强调整体单数/强调成员复数'],
            ['A good knowledge of English ___ helpful.', 'B', ['A' => 'are', 'B' => 'is', 'C' => 'were', 'D' => 'be'], 'knowledge 不可数单数'],
            ['He came ___ he had promised.', 'C', ['A' => 'like', 'B' => 'as', 'C' => 'as', 'D' => 'like'], 'as 按照/as he had promised'],
            ['He works hard, ___ his brother is lazy.', 'B', ['A' => 'and', 'B' => 'while', 'C' => 'so', 'D' => 'because'], 'while 表对比'],
            ['He treated me as if I ___ his best friend.', 'B', ['A' => 'am', 'B' => 'were', 'C' => 'was', 'D' => 'be'], 'as if 虚拟 were'],
            ['By no means ___ give up your dreams.', 'B', ['A' => 'you should', 'B' => 'should you', 'C' => 'you will', 'D' => 'will you'], 'by no means 倒装 should you'],
            ['So loudly ___ that everyone could hear him.', 'B', ['A' => 'he spoke', 'B' => 'did he speak', 'C' => 'he did speak', 'D' => 'spoke he'], 'So loudly did he speak 倒装'],
            ['It was because he was ill ___ he didn\'t come.', 'B', ['A' => 'which', 'B' => 'that', 'C' => 'why', 'D' => 'because'], '强调原因 It was because...that'],
            ['He is too young ___ such a responsibility.', 'B', ['A' => 'bear', 'B' => 'to bear', 'C' => 'bearing', 'D' => 'bore'], 'too...to 太……而不能'],
            ['He is old enough ___ care of himself.', 'B', ['A' => 'take', 'B' => 'to take', 'C' => 'taking', 'D' => 'took'], 'enough to do'],
            ['I cannot emphasize ___ important education is.', 'C', ['A' => 'what', 'B' => 'which', 'C' => 'how', 'D' => 'who'], 'emphasize how important'],
            ['The situation is ___ serious that we must act now.', 'B', ['A' => 'very', 'B' => 'so', 'C' => 'such', 'D' => 'too'], 'so...that 句型'],
            ['He is ___ honest man that we all trust him.', 'C', ['A' => 'very', 'B' => 'so', 'C' => 'such an', 'D' => 'too'], 'such an honest man that'],
            ['Not until all the work ___ did he go home.', 'B', ['A' => 'finish', 'B' => 'was finished', 'C' => 'finished', 'D' => 'finishes'], '被动 was finished'],
            ['I would appreciate ___ back by Friday.', 'B', ['A' => 'you call', 'B' => 'your calling', 'C' => 'you to call', 'D' => 'you calling'], 'appreciate your doing'],
            ['There is no sense ___ about the past.', 'C', ['A' => 'worry', 'B' => 'to worry', 'C' => 'in worrying', 'D' => 'worried'], 'no sense in doing'],
            ['He insisted on ___ to the party.', 'C', ['A' => 'invite', 'B' => 'inviting', 'C' => 'being invited', 'D' => 'be invited'], 'insist on being invited'],
            ['The plan proved ___ successful.', 'A', ['A' => 'to be', 'B' => 'being', 'C' => 'be', 'D' => 'been'], 'prove to be 证明是'],
            ['He is considered ___ the best player on the team.', 'B', ['A' => 'be', 'B' => 'to be', 'C' => 'being', 'D' => 'been'], 'be considered to be'],
            ['I look forward to ___ from you soon.', 'C', ['A' => 'hear', 'B' => 'hearing', 'C' => 'hearing', 'D' => 'heard'], 'look forward to doing'],
            ['The experiment needs ___.', 'C', ['A' => 'repeat', 'B' => 'to repeat', 'C' => 'repeating', 'D' => 'repeated'], 'need doing 需要被重复'],
            ['He was caught ___ in the exam.', 'C', ['A' => 'cheat', 'B' => 'to cheat', 'C' => 'cheating', 'D' => 'cheated'], 'be caught doing 被抓正在做'],
        ];
        $extra12[5] = ['What he needs is ___ good rest.', 'C', ['A' => 'have', 'B' => 'to have', 'C' => 'a', 'D' => 'having'], 'What he needs is a good rest'];
        $extra12[10] = ['He came ___ he had promised.', 'B', ['A' => 'like', 'B' => 'as', 'C' => 'for', 'D' => 'with'], 'as 正如/按照'];
        $extra12[20] = ['He is ___ honest man that we all trust him.', 'C', ['A' => 'a very', 'B' => 'so', 'C' => 'such an', 'D' => 'too'], 'such an honest man that'];
        $extra12[27] = ['I look forward to ___ from you soon.', 'B', ['A' => 'hear', 'B' => 'hearing', 'C' => 'heard', 'D' => 'hear from'], 'look forward to hearing'];
        foreach ($extra12 as $q) {
            $items[] = $q;
        }

        return $this->batch($grade, $stages, $items);
    }
}
