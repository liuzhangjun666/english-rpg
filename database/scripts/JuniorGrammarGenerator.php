<?php

/**
 * 生成初中（筑基 Z1）全阶段语法填空题，供 grammar:import-json 导入。
 */
class JuniorGrammarGenerator
{
    /** @var array<string, int> */
    private array $seqByStage = [];

    /** @return list<array<string, mixed>> */
    public function generate(): array
    {
        $all = [];
        $all = array_merge($all, $this->buildGrade7());
        $all = array_merge($all, $this->buildGrade8());
        $all = array_merge($all, $this->buildGrade9());

        return $all;
    }

    /** @return array<string, int> */
    public function stageCounts(array $questions): array
    {
        $counts = [];
        foreach ($questions as $row) {
            $key = ($row['realm'] ?? 'Z1') . '-' . ($row['stage'] ?? '01');
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
            'question_id' => "JGV-Z1-{$stage}-{$seq}",
            'type' => 'grammar',
            'realm' => 'Z1',
            'stage' => $stage,
            'education_stage' => '初中',
            'grade_level' => $grade,
            'play_mode' => '语法机关桥',
            'scene' => '阵法峰',
            'question' => $stem,
            'options' => $options,
            'correct_answer' => $correctKey,
            'explanation' => $explanation . '。（来源：初中语法 · ' . $grade . '）',
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
    private function buildGrade7(): array
    {
        $grade = '七年级';
        $stages = ['01', '02', '03'];
        $items = [];

        $beVerbs = [
            ['I ___ a student in Grade Seven.', 'B', ['A' => 'am', 'B' => 'is', 'C' => 'are', 'D' => 'be'], '主语 I 搭配 be 动词 am'],
            ['Tom and Jerry ___ good friends.', 'C', ['A' => 'am', 'B' => 'is', 'C' => 'are', 'D' => 'be'], '复数主语用 are'],
            ['There ___ a library in our school.', 'B', ['A' => 'am', 'B' => 'is', 'C' => 'are', 'D' => 'be'], 'There be 句型：单数名词用 is'],
            ['My parents ___ both teachers.', 'C', ['A' => 'am', 'B' => 'is', 'C' => 'are', 'D' => 'be'], '复数主语 parents 用 are'],
            ['___ your sister at home now?', 'B', ['A' => 'Am', 'B' => 'Is', 'C' => 'Are', 'D' => 'Be'], '第三人称单数疑问句用 Is'],
            ['The books on the desk ___ mine.', 'C', ['A' => 'am', 'B' => 'is', 'C' => 'are', 'D' => 'be'], 'books 为复数，谓语用 are'],
            ['She ___ not from Beijing.', 'B', ['A' => 'am', 'B' => 'is', 'C' => 'are', 'D' => 'be'], '第三人称单数否定用 is not'],
            ['We ___ very happy today.', 'C', ['A' => 'am', 'B' => 'is', 'C' => 'are', 'D' => 'be'], '主语 We 用 are'],
        ];
        foreach ($beVerbs as $q) {
            $items[] = $q;
        }

        $presentSimple = [
            ['My brother ___ basketball after school.', 'B', ['A' => 'play', 'B' => 'plays', 'C' => 'playing', 'D' => 'played'], '第三人称单数谓语加 -s'],
            ['They ___ to the music club on Fridays.', 'A', ['A' => 'go', 'B' => 'goes', 'C' => 'going', 'D' => 'went'], '复数主语用动词原形'],
            ['She ___ her homework every evening.', 'C', ['A' => 'do', 'B' => 'doing', 'C' => 'does', 'D' => 'did'], 'does 用于第三人称单数'],
            ['He ___ English very well.', 'B', ['A' => 'speak', 'B' => 'speaks', 'C' => 'speaking', 'D' => 'spoke'], 'speak → speaks'],
            ['The sun ___ in the east.', 'B', ['A' => 'rise', 'B' => 'rises', 'C' => 'rising', 'D' => 'rose'], '客观真理用一般现在时，第三人称单数'],
            ['We ___ TV only on weekends.', 'A', ['A' => 'watch', 'B' => 'watches', 'C' => 'watching', 'D' => 'watched'], '主语 We 用动词原形'],
            ['Lucy ___ a letter to her pen pal every month.', 'C', ['A' => 'write', 'B' => 'writing', 'C' => 'writes', 'D' => 'wrote'], 'writes 第三人称单数'],
            ['I ___ milk for breakfast every day.', 'A', ['A' => 'drink', 'B' => 'drinks', 'C' => 'drinking', 'D' => 'drank'], '主语 I 用动词原形'],
            ['His father ___ in a hospital.', 'B', ['A' => 'work', 'B' => 'works', 'C' => 'working', 'D' => 'worked'], 'works 第三人称单数'],
            ['Do you ___ music?', 'A', ['A' => 'like', 'B' => 'likes', 'C' => 'liking', 'D' => 'liked'], '助动词 Do 后接动词原形'],
            ['She doesn\'t ___ coffee.', 'A', ['A' => 'like', 'B' => 'likes', 'C' => 'liking', 'D' => 'liked'], '否定句：doesn\'t + 动词原形'],
            ['___ he play the guitar?', 'A', ['A' => 'Does', 'B' => 'Do', 'C' => 'Is', 'D' => 'Are'], '第三人称单数疑问句用 Does'],
        ];
        foreach ($presentSimple as $q) {
            $items[] = $q;
        }

        $presentContinuous = [
            ['Look! The children ___ in the playground.', 'C', ['A' => 'play', 'B' => 'plays', 'C' => 'are playing', 'D' => 'played'], 'Look 提示现在进行时'],
            ['She ___ a book in the classroom now.', 'B', ['A' => 'read', 'B' => 'is reading', 'C' => 'reads', 'D' => 'readed'], 'now 提示现在进行时'],
            ['They ___ for the bus at the moment.', 'C', ['A' => 'wait', 'B' => 'waits', 'C' => 'are waiting', 'D' => 'waited'], 'at the moment 用现在进行时'],
            ['I ___ my room right now.', 'B', ['A' => 'clean', 'B' => 'am cleaning', 'C' => 'cleans', 'D' => 'cleaned'], 'right now 用 am cleaning'],
            ['Listen! Someone ___ at the door.', 'B', ['A' => 'knock', 'B' => 'is knocking', 'C' => 'knocks', 'D' => 'knocked'], 'Listen 提示正在进行'],
            ['The students ___ an English song now.', 'C', ['A' => 'sing', 'B' => 'sings', 'C' => 'are singing', 'D' => 'sang'], 'now + 复数主语 → are singing'],
            ['He ___ TV, so don\'t talk to him.', 'B', ['A' => 'watch', 'B' => 'is watching', 'C' => 'watches', 'D' => 'watched'], '语境表明正在看电视'],
            ['We ___ dinner at home this evening.', 'C', ['A' => 'have', 'B' => 'has', 'C' => 'are having', 'D' => 'had'], 'this evening 可表计划中的进行时'],
        ];
        foreach ($presentContinuous as $q) {
            $items[] = $q;
        }

        $articles = [
            ['I have ___ uncle. He is a doctor.', 'B', ['A' => 'a', 'B' => 'an', 'C' => 'the', 'D' => '/'], 'uncle 以元音音素开头，用 an'],
            ['She wants to be ___ engineer in the future.', 'B', ['A' => 'a', 'B' => 'an', 'C' => 'the', 'D' => '/'], 'engineer 以元音音素开头'],
            ['___ sun rises in the east.', 'C', ['A' => 'A', 'B' => 'An', 'C' => 'The', 'D' => '/'], '世界上独一无二的事物用 the'],
            ['He plays ___ piano every day.', 'C', ['A' => 'a', 'B' => 'an', 'C' => 'the', 'D' => '/'], '西洋乐器前常用 the'],
            ['I eat ___ apple after lunch.', 'B', ['A' => 'a', 'B' => 'an', 'C' => 'the', 'D' => '/'], 'apple 以元音音素开头'],
            ['This is ___ useful book.', 'A', ['A' => 'a', 'B' => 'an', 'C' => 'the', 'D' => '/'], 'useful 发音以辅音 /j/ 开头，用 a'],
            ['We live near ___ school.', 'C', ['A' => 'a', 'B' => 'an', 'C' => 'the', 'D' => '/'], '特指双方都知道的学校用 the'],
            ['She is ___ honest girl.', 'B', ['A' => 'a', 'B' => 'an', 'C' => 'the', 'D' => '/'], 'honest 的 h 不发音，用 an'],
        ];
        foreach ($articles as $q) {
            $items[] = $q;
        }

        $prepositions = [
            ['We have classes ___ Monday morning.', 'B', ['A' => 'in', 'B' => 'on', 'C' => 'at', 'D' => 'to'], '具体某天的上午用 on'],
            ['My birthday is ___ July 5th.', 'B', ['A' => 'in', 'B' => 'on', 'C' => 'at', 'D' => 'by'], '具体日期用 on'],
            ['They usually get up ___ 6:30.', 'C', ['A' => 'in', 'B' => 'on', 'C' => 'at', 'D' => 'to'], '具体时刻用 at'],
            ['The cat is hiding ___ the bed.', 'B', ['A' => 'in', 'B' => 'under', 'C' => 'on', 'D' => 'at'], 'under 表示在……下面'],
            ['There is a picture ___ the wall.', 'C', ['A' => 'in', 'B' => 'under', 'C' => 'on', 'D' => 'at'], '在墙上用 on the wall'],
            ['We will meet ___ the school gate.', 'C', ['A' => 'in', 'B' => 'on', 'C' => 'at', 'D' => 'to'], 'at the gate 表示在门口'],
            ['She was born ___ 2012.', 'A', ['A' => 'in', 'B' => 'on', 'C' => 'at', 'D' => 'by'], '年份前用 in'],
            ['The ball rolled ___ the table.', 'B', ['A' => 'in', 'B' => 'under', 'C' => 'on', 'D' => 'at'], 'under the table 在桌子底下'],
            ['He sits ___ front of the classroom.', 'C', ['A' => 'in', 'B' => 'on', 'C' => 'in', 'D' => 'at'], 'in front of 在……前面'],
            ['Put the book ___ your bag.', 'A', ['A' => 'in', 'B' => 'on', 'C' => 'at', 'D' => 'to'], 'in 表示在……里面'],
        ];
        foreach ($prepositions as $q) {
            $items[] = $q;
        }

        $canModals = [
            ['___ you swim?', 'A', ['A' => 'Can', 'B' => 'Do', 'C' => 'Are', 'D' => 'Does'], '询问能力用 Can'],
            ['Birds ___ fly, but pigs can\'t.', 'A', ['A' => 'can', 'B' => 'cans', 'C' => 'can to', 'D' => 'canning'], 'can 后接动词原形'],
            ['You ___ finish your homework first.', 'B', ['A' => 'can', 'B' => 'must', 'C' => 'may', 'D' => 'might'], 'must 表示必须'],
            ['___ I borrow your ruler?', 'C', ['A' => 'Must', 'B' => 'Should', 'C' => 'May', 'D' => 'Need'], '请求许可用 May I'],
            ['She ___ speak a little French.', 'A', ['A' => 'can', 'B' => 'cans', 'C' => 'is', 'D' => 'does'], '表示能力用 can'],
            ['We ___ be late for class.', 'B', ['A' => 'can', 'B' => 'mustn\'t', 'C' => 'may', 'D' => 'need'], 'mustn\'t 表示禁止'],
        ];
        foreach ($canModals as $q) {
            $items[] = $q;
        }

        $plurals = [
            ['I have two ___.', 'C', ['A' => 'box', 'B' => 'boxs', 'C' => 'boxes', 'D' => 'boxies'], '以 x 结尾变复数加 -es'],
            ['There are many ___ in the river.', 'B', ['A' => 'fishs', 'B' => 'fish', 'C' => 'fishes', 'D' => 'fishies'], 'fish 表示鱼（条数）时复数常为 fish'],
            ['The ___ are playing football.', 'B', ['A' => 'child', 'B' => 'children', 'C' => 'childs', 'D' => 'childrens'], 'child 的复数是 children'],
            ['She bought three ___ yesterday.', 'C', ['A' => 'tomatos', 'B' => 'tomato', 'C' => 'tomatoes', 'D' => 'tomatoe'], 'tomato 复数加 -es'],
            ['Those ___ are my teachers.', 'B', ['A' => 'woman', 'B' => 'women', 'C' => 'womans', 'D' => 'womens'], 'woman → women'],
            ['We need two ___ of water.', 'A', ['A' => 'bottles', 'B' => 'bottle', 'C' => 'bottleses', 'D' => 'bottled'], 'two bottles 两瓶'],
            ['The ___ are running in the park.', 'C', ['A' => 'goose', 'B' => 'gooses', 'C' => 'geese', 'D' => 'goosen'], 'goose → geese'],
            ['There are five ___ in the classroom.', 'B', ['A' => 'mans', 'B' => 'men', 'C' => 'man', 'D' => 'mens'], 'man → men'],
        ];
        foreach ($plurals as $q) {
            $items[] = $q;
        }

        $pronouns = [
            ['This is my book. ___ is on the desk.', 'B', ['A' => 'You', 'B' => 'It', 'C' => 'They', 'D' => 'We'], '指代单数事物用 It'],
            ['These are ___ pencils. (I)', 'C', ['A' => 'my', 'B' => 'me', 'C' => 'mine', 'D' => 'I'], '名词性物主代词 mine'],
            ['___ is your English teacher?', 'A', ['A' => 'Who', 'B' => 'What', 'C' => 'Where', 'D' => 'When'], '询问人用 Who'],
            ['___ do you live?', 'C', ['A' => 'Who', 'B' => 'What', 'C' => 'Where', 'D' => 'Why'], '询问地点用 Where'],
            ['___ old is your sister?', 'B', ['A' => 'What', 'B' => 'How', 'C' => 'Who', 'D' => 'Where'], 'How old 询问年龄'],
            ['The bag is ___. (she)', 'C', ['A' => 'her', 'B' => 'she', 'C' => 'hers', 'D' => 'herself'], '名词性物主代词 hers'],
            ['___ students are there in your class?', 'A', ['A' => 'How many', 'B' => 'How much', 'C' => 'How long', 'D' => 'How often'], 'How many 修饰可数名词'],
            ['Give ___ the map, please. (we)', 'B', ['A' => 'we', 'B' => 'us', 'C' => 'our', 'D' => 'ours'], '动词后用人称代词宾格 us'],
        ];
        foreach ($pronouns as $q) {
            $items[] = $q;
        }

        $thereBe = [
            ['There ___ some milk in the glass.', 'B', ['A' => 'are', 'B' => 'is', 'C' => 'be', 'D' => 'am'], 'milk 不可数，用 is'],
            ['There ___ two pens on the table.', 'A', ['A' => 'are', 'B' => 'is', 'C' => 'be', 'D' => 'am'], 'two pens 复数用 are'],
            ['There ___ going to be a meeting tomorrow.', 'B', ['A' => 'are', 'B' => 'is', 'C' => 'be', 'D' => 'am'], 'a meeting 单数用 is'],
            ['___ there any apples in the fridge?', 'A', ['A' => 'Are', 'B' => 'Is', 'C' => 'Do', 'D' => 'Does'], 'apples 复数疑问句用 Are'],
            ['There ___ not any students in the lab now.', 'B', ['A' => 'are', 'B' => 'is', 'C' => 'be', 'D' => 'am'], 'students 复数，但 any students → are；修正：应为 are'],
        ];
        $thereBe[4] = ['There ___ not any students in the lab now.', 'A', ['A' => 'are', 'B' => 'is', 'C' => 'be', 'D' => 'am'], 'students 为复数，用 are'];
        foreach ($thereBe as $q) {
            $items[] = $q;
        }

        $imperatives = [
            ['___, please. The teacher is coming.', 'B', ['A' => 'Quiet', 'B' => 'Be quiet', 'C' => 'To be quiet', 'D' => 'Being quiet'], '祈使句用动词原形开头'],
            ['___ left at the second crossing.', 'A', ['A' => 'Turn', 'B' => 'Turning', 'C' => 'To turn', 'D' => 'Turned'], '指路祈使句用动词原形'],
            ['Don\'t ___ in the library.', 'A', ['A' => 'talk', 'B' => 'talks', 'C' => 'talking', 'D' => 'to talk'], 'Don\'t + 动词原形'],
            ['Please ___ the window. It\'s hot.', 'A', ['A' => 'open', 'B' => 'opens', 'C' => 'opening', 'D' => 'opened'], 'Please + 动词原形'],
            ['___ your hands before dinner.', 'A', ['A' => 'Wash', 'B' => 'Washes', 'C' => 'Washing', 'D' => 'Washed'], '祈使句省略主语'],
        ];
        foreach ($imperatives as $q) {
            $items[] = $q;
        }

        $frequency = [
            ['Tom ___ goes to bed after 11 p.m.', 'C', ['A' => 'always', 'B' => 'usually', 'C' => 'seldom', 'D' => 'often'], 'after 11 p.m. 提示很少晚睡'],
            ['I ___ get up at six on school days.', 'B', ['A' => 'never', 'B' => 'usually', 'C' => 'seldom', 'D' => 'hardly'], '上学日通常六点起床'],
            ['She is ___ late for school.', 'A', ['A' => 'never', 'B' => 'always', 'C' => 'often', 'D' => 'usually'], 'never 表示从不迟到'],
            ['We ___ have PE on Wednesday.', 'D', ['A' => 'never', 'B' => 'seldom', 'C' => 'hardly', 'D' => 'often'], 'often 表示经常'],
            ['He ___ eats vegetables. That\'s unhealthy.', 'C', ['A' => 'always', 'B' => 'usually', 'C' => 'seldom', 'D' => 'often'], '不吃蔬菜不健康 → seldom'],
        ];
        foreach ($frequency as $q) {
            $items[] = $q;
        }

        $extra7 = [
            ['English is ___ useful subject.', 'A', ['A' => 'a', 'B' => 'an', 'C' => 'the', 'D' => '/'], 'useful 以辅音/j/音素开头用 a'],
            ['___ does your father do?', 'A', ['A' => 'What', 'B' => 'Who', 'C' => 'Where', 'D' => 'How'], 'What does sb do 询问职业'],
            ['My shoes are under the bed. What about ___?', 'C', ['A' => 'you', 'B' => 'your', 'C' => 'yours', 'D' => 'yourself'], 'yours = your shoes'],
            ['Let\'s ___ basketball after school.', 'A', ['A' => 'play', 'B' => 'plays', 'C' => 'playing', 'D' => 'to play'], 'Let\'s + 动词原形'],
            ['How ___ milk do you need?', 'B', ['A' => 'many', 'B' => 'much', 'C' => 'often', 'D' => 'long'], 'milk 不可数用 much'],
            ['The weather in Beijing is colder than ___ in Shanghai.', 'B', ['A' => 'it', 'B' => 'that', 'C' => 'this', 'D' => 'one'], '同类事物比较用 that'],
            ['She likes music and she can play ___ guitar.', 'C', ['A' => 'a', 'B' => 'an', 'C' => 'the', 'D' => '/'], '乐器前加 the'],
            ['___ beautiful the flowers are!', 'A', ['A' => 'How', 'B' => 'What', 'C' => 'What a', 'D' => 'How a'], 'How + adj 感叹句'],
            ['I have two cousins. One is a doctor and ___ is a teacher.', 'C', ['A' => 'other', 'B' => 'others', 'C' => 'the other', 'D' => 'another'], 'one...the other 一个……另一个'],
            ['We should thank those ___ help us.', 'A', ['A' => 'who', 'B' => 'which', 'C' => 'whom', 'D' => 'whose'], '修饰人用 who'],
            ['It takes me half an hour ___ to school.', 'B', ['A' => 'walk', 'B' => 'to walk', 'C' => 'walking', 'D' => 'walked'], 'It takes sb time to do'],
            ['My mother tells me ___ late for school.', 'C', ['A' => 'not be', 'B' => 'to not be', 'C' => 'not to be', 'D' => 'don\'t be'], 'tell sb not to do'],
            ['There are ___ students in our grade.', 'C', ['A' => 'hundred', 'B' => 'hundreds', 'C' => 'hundreds of', 'D' => 'two hundreds'], 'hundreds of 数百'],
            ['The little boy is old enough ___ himself.', 'B', ['A' => 'dress', 'B' => 'to dress', 'C' => 'dressing', 'D' => 'dressed'], 'adj enough to do'],
            ['Would you like ___ tea or coffee?', 'A', ['A' => 'some', 'B' => 'any', 'C' => 'many', 'D' => 'much'], 'Would you like some 礼貌邀请'],
            ['He is ___ honest boy in our class.', 'B', ['A' => 'a', 'B' => 'an', 'C' => 'the', 'D' => '/'], 'honest 用 an'],
            ['The girl ___ long hair is my sister.', 'C', ['A' => 'have', 'B' => 'has', 'C' => 'with', 'D' => 'and'], 'with long hair 介词短语作定语'],
            ['___ is difficult to learn a foreign language well.', 'A', ['A' => 'It', 'B' => 'That', 'C' => 'This', 'D' => 'One'], 'It is + adj + to do 形式主语'],
            ['Please keep the classroom ___.', 'B', ['A' => 'cleanly', 'B' => 'clean', 'C' => 'cleaning', 'D' => 'to clean'], 'keep + 宾语 + 形容词'],
            ['My father often ___ me stories before bedtime.', 'B', ['A' => 'speak', 'B' => 'tells', 'C' => 'says', 'D' => 'talks'], 'tell stories 讲故事'],
        ];
        foreach ($extra7 as $q) {
            $items[] = $q;
        }

        return $this->batch($grade, $stages, $items);
    }

    /** @return list<array<string, mixed>> */
    private function buildGrade8(): array
    {
        $grade = '八年级';
        $stages = ['04', '05', '06'];
        $items = [];

        $pastSimple = [
            ['I ___ my keys at home yesterday.', 'C', ['A' => 'leave', 'B' => 'leaves', 'C' => 'left', 'D' => 'leaving'], 'yesterday 用一般过去时 leave→left'],
            ['She ___ to the zoo last Sunday.', 'D', ['A' => 'go', 'B' => 'goes', 'C' => 'going', 'D' => 'went'], 'last Sunday 用过去时 went'],
            ['They ___ a film two days ago.', 'B', ['A' => 'see', 'B' => 'saw', 'C' => 'seen', 'D' => 'seeing'], 'see→saw'],
            ['He ___ breakfast and rushed to school.', 'A', ['A' => 'had', 'B' => 'has', 'C' => 'have', 'D' => 'having'], 'had breakfast 吃早餐'],
            ['We ___ in this city in 2018.', 'C', ['A' => 'live', 'B' => 'lives', 'C' => 'lived', 'D' => 'living'], 'in 2018 用过去时'],
            ['Did you ___ the museum last week?', 'A', ['A' => 'visit', 'B' => 'visited', 'C' => 'visits', 'D' => 'visiting'], 'Did 后接动词原形'],
            ['She didn\'t ___ TV last night.', 'A', ['A' => 'watch', 'B' => 'watched', 'C' => 'watches', 'D' => 'watching'], 'didn\'t + 动词原形'],
            ['___ they finish the project on time?', 'A', ['A' => 'Did', 'B' => 'Do', 'C' => 'Does', 'D' => 'Are'], '过去时疑问句用 Did'],
            ['He ___ his leg when he fell off the bike.', 'B', ['A' => 'hurt', 'B' => 'hurt', 'C' => 'hurts', 'D' => 'hurting'], 'hurt 过去式仍为 hurt'],
            ['The story ___ very interesting.', 'C', ['A' => 'sound', 'B' => 'sounds', 'C' => 'sounded', 'D' => 'sounding'], '过去时 sounded'],
            ['I ___ an email to my teacher just now.', 'B', ['A' => 'write', 'B' => 'wrote', 'C' => 'written', 'D' => 'writing'], 'write→wrote'],
            ['They ___ happy when they heard the news.', 'C', ['A' => 'are', 'B' => 'were', 'C' => 'were', 'D' => 'was'], '复数主语过去时用 were'],
        ];
        foreach ($pastSimple as $q) {
            $items[] = $q;
        }

        $pastContinuous = [
            ['At 8 p.m. yesterday, I ___ my homework.', 'C', ['A' => 'do', 'B' => 'did', 'C' => 'was doing', 'D' => 'am doing'], '过去具体时刻用过去进行时'],
            ['While I ___ TV, my mother came in.', 'B', ['A' => 'watch', 'B' => 'was watching', 'C' => 'watched', 'D' => 'am watching'], 'while 引导过去进行时'],
            ['They ___ football when it started to rain.', 'C', ['A' => 'play', 'B' => 'played', 'C' => 'were playing', 'D' => 'are playing'], 'when 从句一般过去，主句过去进行'],
            ['She ___ at that time, so she didn\'t answer the phone.', 'B', ['A' => 'sleep', 'B' => 'was sleeping', 'C' => 'slept', 'D' => 'sleeps'], 'at that time 用过去进行时'],
            ['What ___ you doing at this time yesterday?', 'C', ['A' => 'do', 'B' => 'did', 'C' => 'were', 'D' => 'are'], '过去进行时疑问句用 were'],
            ['The students ___ quietly when the head teacher entered.', 'B', ['A' => 'read', 'B' => 'were reading', 'C' => 'are reading', 'D' => 'readed'], 'entered 提示过去进行时'],
        ];
        foreach ($pastContinuous as $q) {
            $items[] = $q;
        }

        $comparative = [
            ['Tom is ___ than his brother.', 'B', ['A' => 'tall', 'B' => 'taller', 'C' => 'tallest', 'D' => 'more tall'], 'than 用比较级 taller'],
            ['This book is ___ than that one.', 'C', ['A' => 'interesting', 'B' => 'interestinger', 'C' => 'more interesting', 'D' => 'most interesting'], '多音节形容词比较级用 more'],
            ['She runs ___ in our class.', 'D', ['A' => 'fast', 'B' => 'faster', 'C' => 'more fast', 'D' => 'fastest'], 'in our class 用最高级'],
            ['Winter is the ___ season in the north.', 'C', ['A' => 'cold', 'B' => 'colder', 'C' => 'coldest', 'D' => 'more cold'], '最高级 coldest'],
            ['The Yellow River is the second ___ river in China.', 'B', ['A' => 'long', 'B' => 'longest', 'C' => 'longer', 'D' => 'most long'], 'the second longest 第二长'],
            ['Health is ___ than wealth.', 'C', ['A' => 'important', 'B' => 'importanter', 'C' => 'more important', 'D' => 'most important'], 'more important than'],
            ['Of the three girls, Lucy is ___.', 'B', ['A' => 'young', 'B' => 'the youngest', 'C' => 'younger', 'D' => 'more young'], '三者比较用最高级'],
            ['He speaks English ___ than before.', 'B', ['A' => 'well', 'B' => 'better', 'C' => 'best', 'D' => 'more well'], 'well 比较级 better'],
        ];
        foreach ($comparative as $q) {
            $items[] = $q;
        }

        $future = [
            ['We ___ a class meeting tomorrow afternoon.', 'C', ['A' => 'have', 'B' => 'had', 'C' => 'will have', 'D' => 'having'], 'tomorrow 用一般将来时'],
            ['She ___ Beijing next week.', 'B', ['A' => 'visits', 'B' => 'is going to visit', 'C' => 'visited', 'D' => 'visiting'], 'be going to 表计划'],
            ['They ___ us if they have time.', 'A', ['A' => 'will help', 'B' => 'helped', 'C' => 'help', 'D' => 'helping'], 'if 条件从句一般现在，主句 will'],
            ['I think it ___ rain this evening.', 'B', ['A' => 'is', 'B' => 'will', 'C' => 'was', 'D' => 'did'], 'will rain 将会下雨'],
            ['Are you ___ to join the club?', 'C', ['A' => 'go', 'B' => 'went', 'C' => 'going', 'D' => 'gone'], 'Are you going to'],
            ['He ___ be fourteen years old next month.', 'A', ['A' => 'will', 'B' => 'is', 'C' => 'was', 'D' => 'did'], 'next month 用 will'],
            ['We ___ for you at the station.', 'B', ['A' => 'wait', 'B' => 'will wait', 'C' => 'waited', 'D' => 'waiting'], '承诺/打算用 will wait'],
        ];
        foreach ($future as $q) {
            $items[] = $q;
        }

        $objectClauses = [
            ['I wonder ___ he will come on time.', 'B', ['A' => 'what', 'B' => 'if', 'C' => 'which', 'D' => 'who'], 'whether/if 引导宾语从句表是否'],
            ['Can you tell me ___ the library is?', 'C', ['A' => 'what', 'B' => 'who', 'C' => 'where', 'D' => 'which'], '询问地点用 where'],
            ['She said ___ she liked the gift very much.', 'A', ['A' => 'that', 'B' => 'what', 'C' => 'if', 'D' => 'who'], '陈述句用 that 引导宾语从句'],
            ['Do you know ___ they are waiting for?', 'A', ['A' => 'who', 'B' => 'where', 'C' => 'when', 'D' => 'how'], 'wait for 后缺宾语 who'],
            ['I don\'t know ___ we should leave now.', 'C', ['A' => 'what', 'B' => 'who', 'C' => 'whether', 'D' => 'which'], 'whether 表是否'],
            ['He asked me ___ I had finished the work.', 'C', ['A' => 'what', 'B' => 'who', 'C' => 'if', 'D' => 'which'], '一般疑问句转宾语从句用 if/whether'],
            ['Tell me ___ happened yesterday.', 'A', ['A' => 'what', 'B' => 'who', 'C' => 'where', 'D' => 'when'], 'what happened 发生了什么'],
            ['I believe ___ practice makes perfect.', 'A', ['A' => 'that', 'B' => 'what', 'C' => 'if', 'D' => 'who'], 'that 可省略的宾语从句'],
        ];
        foreach ($objectClauses as $q) {
            $items[] = $q;
        }

        $passive = [
            ['English ___ in many countries.', 'B', ['A' => 'speak', 'B' => 'is spoken', 'C' => 'spoke', 'D' => 'speaks'], '被动语态 is spoken'],
            ['The bridge ___ last year.', 'C', ['A' => 'build', 'B' => 'built', 'C' => 'was built', 'D' => 'is built'], 'last year 用 was built'],
            ['These flowers ___ every day.', 'C', ['A' => 'water', 'B' => 'watered', 'C' => 'are watered', 'D' => 'were watered'], '每天被浇水 are watered'],
            ['The room ___ by Tom just now.', 'B', ['A' => 'clean', 'B' => 'was cleaned', 'C' => 'cleans', 'D' => 'is clean'], 'just now 用 was cleaned'],
            ['Rice ___ in the south of China.', 'B', ['A' => 'grow', 'B' => 'is grown', 'C' => 'grew', 'D' => 'grows'], '被动 is grown'],
            ['The song ___ by many students.', 'C', ['A' => 'sing', 'B' => 'sang', 'C' => 'is sung', 'D' => 'sings'], 'is sung 被传唱'],
        ];
        foreach ($passive as $q) {
            $items[] = $q;
        }

        $usedTo = [
            ['He ___ play chess, but now he likes basketball.', 'A', ['A' => 'used to', 'B' => 'is used to', 'C' => 'was used to', 'D' => 'uses to'], 'used to do 过去常常'],
            ['I ___ get up late, but now I get up early.', 'A', ['A' => 'used to', 'B' => 'am used to', 'C' => 'use to', 'D' => 'was use to'], 'used to 表过去习惯'],
            ['She is ___ the cold weather in the north.', 'B', ['A' => 'used to', 'B' => 'used to', 'C' => 'use to', 'D' => 'using to'], 'be used to 习惯于'],
        ];
        $usedTo[2] = ['She is ___ the cold weather in the north.', 'B', ['A' => 'used to', 'B' => 'used to', 'C' => 'use to', 'D' => 'using to'], 'be used to + n. 习惯于'];
        $usedTo[2] = ['She is ___ the cold weather in the north.', 'B', ['A' => 'use to', 'B' => 'used to', 'C' => 'using to', 'D' => 'uses to'], 'be used to the weather 习惯于天气'];
        foreach ($usedTo as $q) {
            $items[] = $q;
        }

        $gerundInfinitive = [
            ['Would you mind ___ the window?', 'C', ['A' => 'open', 'B' => 'to open', 'C' => 'opening', 'D' => 'opened'], 'mind doing sth'],
            ['He decided ___ harder from then on.', 'B', ['A' => 'study', 'B' => 'to study', 'C' => 'studying', 'D' => 'studied'], 'decide to do'],
            ['It\'s important ___ English every day.', 'A', ['A' => 'to practice', 'B' => 'practice', 'C' => 'practicing', 'D' => 'practiced'], 'It\'s + adj. + to do'],
            ['She enjoys ___ music after class.', 'C', ['A' => 'listen', 'B' => 'to listen', 'C' => 'listening', 'D' => 'listened'], 'enjoy doing'],
            ['I hope ___ good news soon.', 'B', ['A' => 'hear', 'B' => 'to hear', 'C' => 'hearing', 'D' => 'heard'], 'hope to do'],
            ['Remember ___ off the lights when you leave.', 'B', ['A' => 'turn', 'B' => 'to turn', 'C' => 'turning', 'D' => 'turned'], 'remember to do 记得去做'],
            ['Stop ___ and listen to me.', 'C', ['A' => 'talk', 'B' => 'to talk', 'C' => 'talking', 'D' => 'talked'], 'stop doing 停止正在做的事'],
            ['He wants ___ a doctor in the future.', 'B', ['A' => 'be', 'B' => 'to be', 'C' => 'being', 'D' => 'been'], 'want to be'],
        ];
        foreach ($gerundInfinitive as $q) {
            $items[] = $q;
        }

        $conditional1 = [
            ['If it ___ tomorrow, we will stay at home.', 'B', ['A' => 'will rain', 'B' => 'rains', 'C' => 'rained', 'D' => 'is raining'], 'if 条件句用一般现在时'],
            ['If you ___ hard, you will pass the exam.', 'A', ['A' => 'work', 'B' => 'worked', 'C' => 'will work', 'D' => 'working'], '主将从现'],
            ['I will call you if I ___ free.', 'C', ['A' => 'will be', 'B' => 'was', 'C' => 'am', 'D' => 'be'], 'if 从句用 am'],
            ['Unless you hurry, you ___ miss the bus.', 'C', ['A' => 'miss', 'B' => 'missed', 'C' => 'will miss', 'D' => 'missing'], 'unless = if not，主句 will'],
            ['If she ___ early, she can catch the train.', 'A', ['A' => 'leaves', 'B' => 'left', 'C' => 'will leave', 'D' => 'leaving'], '第三人称单数 leaves'],
        ];
        foreach ($conditional1 as $q) {
            $items[] = $q;
        }

        $conjunctions = [
            ['I was tired, ___ I went to bed early.', 'A', ['A' => 'so', 'B' => 'but', 'C' => 'because', 'D' => 'and'], '结果用 so'],
            ['She stayed at home ___ it was raining heavily.', 'C', ['A' => 'so', 'B' => 'but', 'C' => 'because', 'D' => 'and'], '原因用 because'],
            ['He is young, ___ he knows a lot.', 'B', ['A' => 'so', 'B' => 'but', 'C' => 'because', 'D' => 'and'], '转折用 but'],
            ['Study hard, ___ you will make progress.', 'A', ['A' => 'and', 'B' => 'but', 'C' => 'or', 'D' => 'so'], '祈使句 + and 表顺承结果'],
            ['Hurry up, ___ we will be late.', 'C', ['A' => 'and', 'B' => 'but', 'C' => 'or', 'D' => 'so'], 'or 否则'],
        ];
        foreach ($conjunctions as $q) {
            $items[] = $q;
        }

        $extra8 = [
            ['My sister is good ___ drawing.', 'C', ['A' => 'in', 'B' => 'on', 'C' => 'at', 'D' => 'for'], 'be good at 擅长'],
            ['The film was ___ interesting that I watched it twice.', 'B', ['A' => 'very', 'B' => 'so', 'C' => 'too', 'D' => 'such'], 'so...that 如此……以至于'],
            ['He arrived ___ the airport an hour ago.', 'C', ['A' => 'in', 'B' => 'on', 'C' => 'at', 'D' => 'to'], 'arrive at 到达'],
            ['We should learn from ___.', 'B', ['A' => 'other', 'B' => 'others', 'C' => 'another', 'D' => 'the other'], 'others 其他人'],
            ['Neither of the answers ___ correct.', 'B', ['A' => 'are', 'B' => 'is', 'C' => 'were', 'D' => 'be'], 'neither of 谓语单数'],
            ['The boy ___ father is a policeman is my classmate.', 'D', ['A' => 'who', 'B' => 'which', 'C' => 'whom', 'D' => 'whose'], 'whose 表所属'],
            ['I was doing my homework ___ my brother was watching TV.', 'B', ['A' => 'when', 'B' => 'while', 'C' => 'after', 'D' => 'before'], 'while 两动作同时进行'],
            ['She has been in Beijing ___ three days.', 'C', ['A' => 'since', 'B' => 'from', 'C' => 'for', 'D' => 'in'], 'for + 时间段'],
            ['Could you tell me how ___ this word?', 'B', ['A' => 'spell', 'B' => 'to spell', 'C' => 'spelling', 'D' => 'spelled'], 'how to do'],
            ['The teacher made us ___ the passage twice.', 'A', ['A' => 'read', 'B' => 'to read', 'C' => 'reading', 'D' => 'reads'], 'make sb do'],
            ['It\'s necessary ___ enough sleep every night.', 'B', ['A' => 'have', 'B' => 'to have', 'C' => 'having', 'D' => 'had'], 'necessary to do'],
            ['He is the tallest ___ the three brothers.', 'C', ['A' => 'between', 'B' => 'in', 'C' => 'of', 'D' => 'among'], 'the tallest of the three'],
            ['I prefer walking ___ taking a bus.', 'C', ['A' => 'than', 'B' => 'over', 'C' => 'to', 'D' => 'for'], 'prefer doing to doing'],
            ['The news ___ very exciting.', 'B', ['A' => 'are', 'B' => 'is', 'C' => 'were', 'D' => 'be'], 'news 不可数，谓语单数'],
            ['Both Tom and I ___ interested in science.', 'C', ['A' => 'is', 'B' => 'was', 'C' => 'are', 'D' => 'am'], 'both...and 复数谓语'],
            ['He asked me ___ I could help him.', 'B', ['A' => 'what', 'B' => 'if', 'C' => 'who', 'D' => 'which'], 'if 引导宾语从句'],
            ['The classroom needs ___ every day.', 'C', ['A' => 'clean', 'B' => 'to clean', 'C' => 'cleaning', 'D' => 'cleaned'], 'need doing 需要被……'],
            ['She looks ___ today.', 'B', ['A' => 'happy', 'B' => 'happily', 'C' => 'happiness', 'D' => 'happier'], 'look 系动词后接形容词'],
            ['I have known him ___ we were children.', 'A', ['A' => 'since', 'B' => 'for', 'C' => 'in', 'D' => 'from'], 'since + 过去时间点'],
            ['You\'d better ___ too much junk food.', 'C', ['A' => 'eat', 'B' => 'to eat', 'C' => 'not eat', 'D' => 'not eating'], 'had better not do'],
            ['The meeting will be ___ in the hall.', 'B', ['A' => 'hold', 'B' => 'held', 'C' => 'holding', 'D' => 'holds'], 'will be held 将被举行'],
            ['He runs as ___ as his brother.', 'A', ['A' => 'fast', 'B' => 'faster', 'C' => 'fastest', 'D' => 'more fast'], 'as...as 中间用原级'],
        ];
        foreach ($extra8 as $q) {
            $items[] = $q;
        }

        return $this->batch($grade, $stages, $items);
    }

    /** @return list<array<string, mixed>> */
    private function buildGrade9(): array
    {
        $grade = '九年级';
        $stages = ['07', '08', '09'];
        $items = [];

        $presentPerfect = [
            ['I ___ this book for two weeks.', 'C', ['A' => 'borrow', 'B' => 'borrowed', 'C' => 'have had', 'D' => 'had'], 'for two weeks 用现在完成时 have had'],
            ['She ___ to London twice.', 'B', ['A' => 'goes', 'B' => 'has been', 'C' => 'went', 'D' => 'is going'], 'has been to 去过'],
            ['They ___ the project already.', 'C', ['A' => 'finish', 'B' => 'finished', 'C' => 'have finished', 'D' => 'finishing'], 'already 用现在完成时'],
            ['We ___ each other since 2020.', 'B', ['A' => 'know', 'B' => 'have known', 'C' => 'knew', 'D' => 'knowing'], 'since + 时间点用 have known'],
            ['Have you ever ___ a plane?', 'D', ['A' => 'fly', 'B' => 'flew', 'C' => 'flying', 'D' => 'flown'], 'ever 与现在完成时连用 Have...flown'],
            ['He has just ___ his homework.', 'C', ['A' => 'finish', 'B' => 'finishes', 'C' => 'finished', 'D' => 'finishing'], 'just 与 has finished 连用'],
            ['How long have you ___ here?', 'C', ['A' => 'live', 'B' => 'lives', 'C' => 'lived', 'D' => 'living'], 'How long 用 have lived'],
            ['I haven\'t seen him ___.', 'C', ['A' => 'already', 'B' => 'ever', 'C' => 'yet', 'D' => 'just'], '否定句用 yet'],
            ['She has ___ finished reading the novel.', 'A', ['A' => 'already', 'B' => 'yet', 'C' => 'ever', 'D' => 'never'], '肯定句用 already'],
            ['This is the first time I ___ sushi.', 'C', ['A' => 'eat', 'B' => 'ate', 'C' => 'have eaten', 'D' => 'am eating'], 'This is the first time + 现在完成时'],
        ];
        foreach ($presentPerfect as $q) {
            $items[] = $q;
        }

        $pastPerfect = [
            ['When I got to the station, the train ___.', 'D', ['A' => 'leave', 'B' => 'left', 'C' => 'has left', 'D' => 'had left'], '过去的过去用过去完成时'],
            ['She told me she ___ the letter before lunch.', 'C', ['A' => 'write', 'B' => 'wrote', 'C' => 'had written', 'D' => 'has written'], 'told 之前已完成用 had written'],
            ['By the end of last year, he ___ three novels.', 'C', ['A' => 'write', 'B' => 'wrote', 'C' => 'had written', 'D' => 'has written'], 'By the end of last year 用过去完成时'],
            ['They ___ the house before it started to snow.', 'B', ['A' => 'reach', 'B' => 'had reached', 'C' => 'reached', 'D' => 'have reached'], '下雪前已到达'],
        ];
        foreach ($pastPerfect as $q) {
            $items[] = $q;
        }

        $passiveAdv = [
            ['The meeting ___ at 3 p.m. yesterday.', 'C', ['A' => 'hold', 'B' => 'held', 'C' => 'was held', 'D' => 'is held'], 'was held 被举行'],
            ['A new hospital ___ in our town next year.', 'B', ['A' => 'builds', 'B' => 'will be built', 'C' => 'built', 'D' => 'is building'], '将来被动 will be built'],
            ['The problem must ___ at once.', 'C', ['A' => 'solve', 'B' => 'solved', 'C' => 'be solved', 'D' => 'be solving'], '情态动词被动 be solved'],
            ['English ___ all over the world.', 'B', ['A' => 'speaks', 'B' => 'is spoken', 'C' => 'spoke', 'D' => 'speaking'], 'is spoken 被使用'],
            ['The children ___ to bed early last night.', 'C', ['A' => 'send', 'B' => 'sent', 'C' => 'were sent', 'D' => 'are sent'], 'were sent 被送去'],
        ];
        foreach ($passiveAdv as $q) {
            $items[] = $q;
        }

        $relativeClauses = [
            ['The boy ___ is wearing a red hat is my cousin.', 'A', ['A' => 'who', 'B' => 'which', 'C' => 'whom', 'D' => 'whose'], '修饰人用 who'],
            ['This is the book ___ I bought yesterday.', 'B', ['A' => 'who', 'B' => 'that', 'C' => 'whose', 'D' => 'whom'], '修饰物用 that/which'],
            ['The girl ___ mother is a nurse studies hard.', 'D', ['A' => 'who', 'B' => 'which', 'C' => 'whom', 'D' => 'whose'], 'whose 表所属'],
            ['Do you know the man ___ we met yesterday?', 'C', ['A' => 'who', 'B' => 'which', 'C' => 'whom', 'D' => 'whose'], '宾格 whom'],
            ['I will never forget the day ___ I joined the club.', 'B', ['A' => 'who', 'B' => 'when', 'C' => 'which', 'D' => 'whose'], '时间用 when'],
            ['This is the place ___ we visited last summer.', 'C', ['A' => 'who', 'B' => 'when', 'C' => 'which', 'D' => 'whose'], 'visit 缺宾语 which/that'],
            ['Anyone ___ breaks the rule will be punished.', 'A', ['A' => 'who', 'B' => 'which', 'C' => 'whom', 'D' => 'whose'], 'anyone who 任何人……'],
            ['The house ___ roof is red belongs to Mr. Wang.', 'D', ['A' => 'who', 'B' => 'which', 'C' => 'whom', 'D' => 'whose'], 'whose roof 屋顶'],
        ];
        foreach ($relativeClauses as $q) {
            $items[] = $q;
        }

        $conditional2 = [
            ['If I ___ you, I would take the offer.', 'B', ['A' => 'am', 'B' => 'were', 'C' => 'was', 'D' => 'be'], '虚拟语气 If I were you'],
            ['If it ___ fine tomorrow, we would go hiking.', 'A', ['A' => 'were', 'B' => 'is', 'C' => 'will be', 'D' => 'was'], '与将来事实相反用 were'],
            ['I wish I ___ fly like a bird.', 'C', ['A' => 'can', 'B' => 'will', 'C' => 'could', 'D' => 'may'], 'wish 从句用过去式 could'],
            ['If he ___ harder, he would pass the exam.', 'A', ['A' => 'worked', 'B' => 'works', 'C' => 'will work', 'D' => 'work'], '与现在事实相反用过去式'],
        ];
        foreach ($conditional2 as $q) {
            $items[] = $q;
        }

        $modals = [
            ['You ___ smoke here. It\'s forbidden.', 'C', ['A' => 'can', 'B' => 'may', 'C' => 'mustn\'t', 'D' => 'needn\'t'], '禁止 mustn\'t'],
            ['You ___ worry. I can help you.', 'D', ['A' => 'must', 'B' => 'should', 'C' => 'need', 'D' => 'needn\'t'], 'needn\'t 不必'],
            ['Students ___ wear uniforms on weekdays.', 'B', ['A' => 'can', 'B' => 'must', 'C' => 'may', 'D' => 'might'], '必须 must'],
            ['It ___ rain this afternoon. Take an umbrella.', 'C', ['A' => 'can', 'B' => 'must', 'C' => 'might', 'D' => 'should'], 'might 可能'],
            ['You ___ listen carefully in class.', 'B', ['A' => 'can', 'B' => 'should', 'C' => 'may', 'D' => 'might'], 'should 应该'],
            ['He ___ be at home. The lights are off.', 'D', ['A' => 'can', 'B' => 'must', 'C' => 'should', 'D' => 'can\'t'], '否定推测 can\'t'],
        ];
        foreach ($modals as $q) {
            $items[] = $q;
        }

        $reportedSpeech = [
            ['He said he ___ tired.', 'B', ['A' => 'is', 'B' => 'was', 'C' => 'will be', 'D' => 'be'], '间接引语时态后退 was'],
            ['She told me she ___ the film the day before.', 'C', ['A' => 'see', 'B' => 'sees', 'C' => 'had seen', 'D' => 'has seen'], 'the day before 用 had seen'],
            ['Tom asked if I ___ help him.', 'C', ['A' => 'can', 'B' => 'will', 'C' => 'could', 'D' => 'may'], 'asked 后用 could'],
            ['The teacher said the earth ___ around the sun.', 'A', ['A' => 'goes', 'B' => 'went', 'C' => 'go', 'D' => 'going'], '客观真理仍用一般现在时'],
            ['She asked me where I ___.', 'B', ['A' => 'live', 'B' => 'lived', 'C' => 'will live', 'D' => 'living'], '特殊疑问句转间接引语用 lived'],
        ];
        foreach ($reportedSpeech as $q) {
            $items[] = $q;
        }

        $tagQuestions = [
            ['She is a good student, ___?', 'B', ['A' => 'is she', 'B' => 'isn\'t she', 'C' => 'does she', 'D' => 'doesn\'t she'], '前肯后否 isn\'t she'],
            ['You don\'t like coffee, ___?', 'A', ['A' => 'do you', 'B' => 'don\'t you', 'C' => 'are you', 'D' => 'aren\'t you'], '前否后肯 do you'],
            ['They have finished the work, ___?', 'D', ['A' => 'have they', 'B' => 'do they', 'C' => 'did they', 'D' => 'haven\'t they'], 'have 完成时反义疑问'],
            ['Let\'s go to the park, ___?', 'C', ['A' => 'will we', 'B' => 'do we', 'C' => 'shall we', 'D' => 'don\'t we'], 'Let\'s 用 shall we'],
        ];
        foreach ($tagQuestions as $q) {
            $items[] = $q;
        }

        $subjectVerb = [
            ['Neither Tom nor his parents ___ at home.', 'B', ['A' => 'is', 'B' => 'are', 'C' => 'was', 'D' => 'be'], 'neither...nor 就近原则 parents → are'],
            ['The number of students ___ increasing.', 'B', ['A' => 'are', 'B' => 'is', 'C' => 'were', 'D' => 'be'], 'the number of 谓语用单数 is'],
            ['A lot of people ___ waiting outside.', 'C', ['A' => 'is', 'B' => 'was', 'C' => 'are', 'D' => 'be'], 'people 复数 are'],
            ['Each of the boys ___ a new bike.', 'B', ['A' => 'have', 'B' => 'has', 'C' => 'having', 'D' => 'had'], 'each of 谓语单数 has'],
            ['Physics ___ my favorite subject.', 'B', ['A' => 'are', 'B' => 'is', 'C' => 'were', 'D' => 'be'], '学科 physics 单数 is'],
        ];
        foreach ($subjectVerb as $q) {
            $items[] = $q;
        }

        $phrases = [
            ['We should ___ our best to protect the environment.', 'B', ['A' => 'do', 'B' => 'try', 'C' => 'make', 'D' => 'take'], 'try one\'s best 尽某人最大努力'],
            ['It\'s time for us ___ action.', 'C', ['A' => 'take', 'B' => 'taking', 'C' => 'to take', 'D' => 'took'], 'It\'s time to do'],
            ['He is familiar ___ this area.', 'A', ['A' => 'with', 'B' => 'to', 'C' => 'for', 'D' => 'at'], 'be familiar with 熟悉'],
            ['She is proud ___ her son.', 'C', ['A' => 'with', 'B' => 'for', 'C' => 'of', 'D' => 'to'], 'be proud of 为……骄傲'],
            ['Please ___ attention to the spelling.', 'A', ['A' => 'pay', 'B' => 'give', 'C' => 'make', 'D' => 'take'], 'pay attention to 注意'],
            ['The meeting was put ___ until next Monday.', 'C', ['A' => 'on', 'B' => 'up', 'C' => 'off', 'D' => 'away'], 'put off 推迟'],
            ['He ran ___ an old friend in the street.', 'B', ['A' => 'on', 'B' => 'into', 'C' => 'at', 'D' => 'for'], 'run into 偶遇'],
            ['We need to ___ up with new ideas.', 'A', ['A' => 'come', 'B' => 'go', 'C' => 'get', 'D' => 'make'], 'come up with 想出'],
        ];
        foreach ($phrases as $q) {
            $items[] = $q;
        }

        $extra9 = [
            ['By the time we arrived, the movie ___.', 'C', ['A' => 'start', 'B' => 'started', 'C' => 'had started', 'D' => 'has started'], '过去的过去用 had started'],
            ['Not only he but also his friends ___ fond of music.', 'C', ['A' => 'is', 'B' => 'was', 'C' => 'are', 'D' => 'am'], 'not only...but also 就近原则 friends → are'],
            ['It is said that the bridge ___ next month.', 'B', ['A' => 'completes', 'B' => 'will be completed', 'C' => 'completed', 'D' => 'is completing'], '将来被动 will be completed'],
            ['I wonder ___ we can finish the work on time.', 'B', ['A' => 'what', 'B' => 'whether', 'C' => 'who', 'D' => 'which'], 'whether 是否'],
            ['The man ___ spoke at the meeting is our headmaster.', 'A', ['A' => 'who', 'B' => 'which', 'C' => 'whom', 'D' => 'whose'], '修饰人用 who'],
            ['You should keep on ___ until you succeed.', 'C', ['A' => 'try', 'B' => 'to try', 'C' => 'trying', 'D' => 'tried'], 'keep on doing'],
            ['He avoided ___ the same mistake again.', 'C', ['A' => 'make', 'B' => 'to make', 'C' => 'making', 'D' => 'made'], 'avoid doing'],
            ['I would rather ___ at home than go out.', 'A', ['A' => 'stay', 'B' => 'to stay', 'C' => 'staying', 'D' => 'stayed'], 'would rather do than do'],
            ['The harder you work, the ___ progress you will make.', 'C', ['A' => 'much', 'B' => 'many', 'C' => 'more', 'D' => 'most'], 'the more...the more 句型'],
            ['He is one of the students who ___ passed the exam.', 'B', ['A' => 'has', 'B' => 'have', 'C' => 'is', 'D' => 'was'], '定语从句修饰 students 用 have'],
            ['Great changes ___ in my hometown in recent years.', 'C', ['A' => 'take place', 'B' => 'took place', 'C' => 'have taken place', 'D' => 'were taken'], 'in recent years 用现在完成时'],
            ['She suggested ___ to the museum on Sunday.', 'C', ['A' => 'go', 'B' => 'to go', 'C' => 'going', 'D' => 'went'], 'suggest doing'],
            ['It\'s no use ___ about it. Just do it.', 'C', ['A' => 'worry', 'B' => 'to worry', 'C' => 'worrying', 'D' => 'worried'], 'It\'s no use doing'],
            ['He is too young ___ such a difficult job.', 'B', ['A' => 'do', 'B' => 'to do', 'C' => 'doing', 'D' => 'done'], 'too...to 太……而不能'],
            ['The book ___ I borrowed from the library is very useful.', 'B', ['A' => 'who', 'B' => 'that', 'C' => 'whose', 'D' => 'whom'], '修饰物用 that'],
            ['You are supposed ___ on time for the interview.', 'B', ['A' => 'come', 'B' => 'to come', 'C' => 'coming', 'D' => 'came'], 'be supposed to do'],
            ['I can\'t imagine ___ without the Internet.', 'C', ['A' => 'live', 'B' => 'to live', 'C' => 'living', 'D' => 'lived'], 'imagine doing'],
            ['He has devoted himself ___ teaching.', 'C', ['A' => 'in', 'B' => 'on', 'C' => 'to', 'D' => 'for'], 'devote oneself to'],
            ['We are looking forward to ___ you soon.', 'B', ['A' => 'see', 'B' => 'seeing', 'C' => 'seen', 'D' => 'saw'], 'look forward to doing'],
            ['She was seen ___ into the building just now.', 'B', ['A' => 'go', 'B' => 'to go', 'C' => 'going', 'D' => 'went'], 'see sb do 被动省略 to'],
            ['It was ___ a difficult problem that nobody could solve it.', 'C', ['A' => 'very', 'B' => 'too', 'C' => 'such', 'D' => 'so'], 'such a/an + adj + n'],
            ['He failed the exam because he didn\'t work ___.', 'B', ['A' => 'hard', 'B' => 'hard enough', 'C' => 'hardly', 'D' => 'harder'], 'not...enough 不够努力'],
            ['The students are busy ___ for the final exam.', 'C', ['A' => 'prepare', 'B' => 'to prepare', 'C' => 'preparing', 'D' => 'prepared'], 'be busy doing'],
            ['I have no idea ___ he will come back.', 'B', ['A' => 'what', 'B' => 'when', 'C' => 'which', 'D' => 'who'], 'when 引导同位语从句/宾语从句'],
            ['You must ___ your temper when things go wrong.', 'A', ['A' => 'keep', 'B' => 'make', 'C' => 'take', 'D' => 'hold'], 'keep one\'s temper 控制脾气'],
            ['He is the only one of the boys who ___ the truth.', 'B', ['A' => 'know', 'B' => 'knows', 'C' => 'knowing', 'D' => 'known'], 'the only one of 谓语单数 knows'],
            ['The old man lives ___.', 'B', ['A' => 'lonely', 'B' => 'alone', 'C' => 'loneliness', 'D' => 'lone'], 'live alone 独自生活'],
            ['We must prevent the river from ___.', 'C', ['A' => 'pollute', 'B' => 'polluted', 'C' => 'being polluted', 'D' => 'polluting'], 'prevent from being done'],
            ['She used to ___ shy, but now she is outgoing.', 'A', ['A' => 'be', 'B' => 'being', 'C' => 'been', 'D' => 'was'], 'used to be 过去是'],
            ['It ___ me two hours to finish the report yesterday.', 'B', ['A' => 'spends', 'B' => 'took', 'C' => 'cost', 'D' => 'paid'], 'It takes sb time to do'],
        ];
        foreach ($extra9 as $q) {
            $items[] = $q;
        }

        return $this->batch($grade, $stages, $items);
    }
}
