<?php

namespace Database\Seeders;

use App\Models\Question;
use Illuminate\Database\Seeder;

class QuestionSeeder extends Seeder
{
    public function run(): void
    {
        $questions = [
            // ===== L1-01 练气初·采药识灵 =====
            ['question_id' => 'C-L1-001', 'type' => 'vocab', 'realm' => 'L1', 'stage' => '01', 'word' => 'apple', 'question' => '"apple" 的中文意思是？', 'options' => json_encode(['A'=>'苹果','B'=>'香蕉','C'=>'橘子','D'=>'葡萄']), 'correct_answer' => 'A', 'explanation' => 'apple = 苹果'],
            ['question_id' => 'C-L1-002', 'type' => 'vocab', 'realm' => 'L1', 'stage' => '01', 'word' => 'book', 'question' => '"book" 的中文意思是？', 'options' => json_encode(['A'=>'笔','B'=>'书','C'=>'纸','D'=>'桌']), 'correct_answer' => 'B', 'explanation' => 'book = 书'],
            ['question_id' => 'C-L1-003', 'type' => 'vocab', 'realm' => 'L1', 'stage' => '01', 'word' => 'cat', 'question' => '"cat" 的中文意思是？', 'options' => json_encode(['A'=>'狗','B'=>'鸟','C'=>'鱼','D'=>'猫']), 'correct_answer' => 'D', 'explanation' => 'cat = 猫'],
            ['question_id' => 'C-L1-004', 'type' => 'vocab', 'realm' => 'L1', 'stage' => '01', 'word' => 'dog', 'question' => '"dog" 的中文意思是？', 'options' => json_encode(['A'=>'猫','B'=>'狗','C'=>'兔','D'=>'鼠']), 'correct_answer' => 'B', 'explanation' => 'dog = 狗'],
            ['question_id' => 'C-L1-005', 'type' => 'vocab', 'realm' => 'L1', 'stage' => '01', 'word' => 'egg', 'question' => '"egg" 的中文意思是？', 'options' => json_encode(['A'=>'面','B'=>'米','C'=>'蛋','D'=>'奶']), 'correct_answer' => 'C', 'explanation' => 'egg = 鸡蛋'],
            ['question_id' => 'C-L1-006', 'type' => 'vocab', 'realm' => 'L1', 'stage' => '01', 'word' => 'fish', 'question' => '"fish" 的中文意思是？', 'options' => json_encode(['A'=>'肉','B'=>'鱼','C'=>'虾','D'=>'蟹']), 'correct_answer' => 'B', 'explanation' => 'fish = 鱼'],
            ['question_id' => 'C-L1-007', 'type' => 'vocab', 'realm' => 'L1', 'stage' => '01', 'word' => 'girl', 'question' => '"girl" 的中文意思是？', 'options' => json_encode(['A'=>'男孩','B'=>'男人','C'=>'女孩','D'=>'女人']), 'correct_answer' => 'C', 'explanation' => 'girl = 女孩'],
            ['question_id' => 'C-L1-008', 'type' => 'vocab', 'realm' => 'L1', 'stage' => '01', 'word' => 'hat', 'question' => '"hat" 的中文意思是？', 'options' => json_encode(['A'=>'鞋','B'=>'帽','C'=>'袜','D'=>'衣']), 'correct_answer' => 'B', 'explanation' => 'hat = 帽子'],
            ['question_id' => 'C-L1-009', 'type' => 'vocab', 'realm' => 'L1', 'stage' => '01', 'word' => 'ice', 'question' => '"ice" 的中文意思是？', 'options' => json_encode(['A'=>'水','B'=>'火','C'=>'冰','D'=>'风']), 'correct_answer' => 'C', 'explanation' => 'ice = 冰'],
            ['question_id' => 'C-L1-010', 'type' => 'vocab', 'realm' => 'L1', 'stage' => '01', 'word' => 'jump', 'question' => '"jump" 的中文意思是？', 'options' => json_encode(['A'=>'跑','B'=>'走','C'=>'跳','D'=>'坐']), 'correct_answer' => 'C', 'explanation' => 'jump = 跳'],
            ['question_id' => 'C-L1-011', 'type' => 'vocab', 'realm' => 'L1', 'stage' => '01', 'word' => 'kite', 'question' => '"kite" 的中文意思是？', 'options' => json_encode(['A'=>'球','B'=>'风筝','C'=>'飞机','D'=>'船']), 'correct_answer' => 'B', 'explanation' => 'kite = 风筝'],
            ['question_id' => 'C-L1-012', 'type' => 'vocab', 'realm' => 'L1', 'stage' => '01', 'word' => 'lion', 'question' => '"lion" 的中文意思是？', 'options' => json_encode(['A'=>'老虎','B'=>'狮子','C'=>'大象','D'=>'长颈鹿']), 'correct_answer' => 'B', 'explanation' => 'lion = 狮子'],
            ['question_id' => 'C-L1-013', 'type' => 'vocab', 'realm' => 'L1', 'stage' => '01', 'word' => 'milk', 'question' => '"milk" 的中文意思是？', 'options' => json_encode(['A'=>'水','B'=>'果汁','C'=>'茶','D'=>'牛奶']), 'correct_answer' => 'D', 'explanation' => 'milk = 牛奶'],
            ['question_id' => 'C-L1-014', 'type' => 'vocab', 'realm' => 'L1', 'stage' => '01', 'word' => 'nose', 'question' => '"nose" 的中文意思是？', 'options' => json_encode(['A'=>'眼睛','B'=>'耳朵','C'=>'鼻子','D'=>'嘴巴']), 'correct_answer' => 'C', 'explanation' => 'nose = 鼻子'],
            ['question_id' => 'C-L1-015', 'type' => 'vocab', 'realm' => 'L1', 'stage' => '01', 'word' => 'open', 'question' => '反义词："open" 的反义词是？', 'options' => json_encode(['A'=>'close','B'=>'big','C'=>'small','D'=>'fast']), 'correct_answer' => 'A', 'explanation' => 'open = 打开，反义词 close = 关闭'],

            // ===== L1-02 =====
            ['question_id' => 'C-L1-016', 'type' => 'vocab', 'realm' => 'L1', 'stage' => '02', 'word' => 'pencil', 'question' => '"pencil" 的中文意思是？', 'options' => json_encode(['A'=>'钢笔','B'=>'铅笔','C'=>'橡皮','D'=>'尺子']), 'correct_answer' => 'B', 'explanation' => 'pencil = 铅笔'],
            ['question_id' => 'C-L1-017', 'type' => 'vocab', 'realm' => 'L1', 'stage' => '02', 'word' => 'queen', 'question' => '"queen" 的中文意思是？', 'options' => json_encode(['A'=>'国王','B'=>'王子','C'=>'公主','D'=>'女王']), 'correct_answer' => 'D', 'explanation' => 'queen = 女王'],
            ['question_id' => 'C-L1-018', 'type' => 'vocab', 'realm' => 'L1', 'stage' => '02', 'word' => 'rain', 'question' => '"rain" 的中文意思是？', 'options' => json_encode(['A'=>'雪','B'=>'雨','C'=>'风','D'=>'云']), 'correct_answer' => 'B', 'explanation' => 'rain = 雨'],
            ['question_id' => 'C-L1-019', 'type' => 'vocab', 'realm' => 'L1', 'stage' => '02', 'word' => 'sun', 'question' => '"sun" 的中文意思是？', 'options' => json_encode(['A'=>'月亮','B'=>'星星','C'=>'太阳','D'=>'地球']), 'correct_answer' => 'C', 'explanation' => 'sun = 太阳'],
            ['question_id' => 'C-L1-020', 'type' => 'vocab', 'realm' => 'L1', 'stage' => '02', 'word' => 'tree', 'question' => '"tree" 的中文意思是？', 'options' => json_encode(['A'=>'花','B'=>'草','C'=>'树','D'=>'叶']), 'correct_answer' => 'C', 'explanation' => 'tree = 树'],
            ['question_id' => 'C-L1-021', 'type' => 'vocab', 'realm' => 'L1', 'stage' => '02', 'word' => 'umbrella', 'question' => '下面哪个是 "umbrella"？', 'options' => json_encode(['A'=>'伞','B'=>'包','C'=>'表','D'=>'灯']), 'correct_answer' => 'A', 'explanation' => 'umbrella = 雨伞'],
            ['question_id' => 'C-L1-022', 'type' => 'vocab', 'realm' => 'L1', 'stage' => '02', 'word' => 'violin', 'question' => '"violin" 的中文意思是？', 'options' => json_encode(['A'=>'吉他','B'=>'钢琴','C'=>'小提琴','D'=>'鼓']), 'correct_answer' => 'C', 'explanation' => 'violin = 小提琴'],
            ['question_id' => 'C-L1-023', 'type' => 'vocab', 'realm' => 'L1', 'stage' => '02', 'word' => 'water', 'question' => '"water" 的中文意思是？', 'options' => json_encode(['A'=>'火','B'=>'水','C'=>'土','D'=>'气']), 'correct_answer' => 'B', 'explanation' => 'water = 水'],
            ['question_id' => 'C-L1-024', 'type' => 'vocab', 'realm' => 'L1', 'stage' => '02', 'word' => 'yellow', 'question' => '"yellow" 的中文意思是？', 'options' => json_encode(['A'=>'红色','B'=>'蓝色','C'=>'黄色','D'=>'绿色']), 'correct_answer' => 'C', 'explanation' => 'yellow = 黄色'],
            ['question_id' => 'C-L1-025', 'type' => 'vocab', 'realm' => 'L1', 'stage' => '02', 'word' => 'zoo', 'question' => '"zoo" 的中文意思是？', 'options' => json_encode(['A'=>'公园','B'=>'学校','C'=>'动物园','D'=>'图书馆']), 'correct_answer' => 'C', 'explanation' => 'zoo = 动物园'],
            ['question_id' => 'C-L1-026', 'type' => 'vocab', 'realm' => 'L1', 'stage' => '02', 'word' => 'happy', 'question' => '"I am happy" 中 "happy" 的意思是？', 'options' => json_encode(['A'=>'悲伤的','B'=>'快乐的','C'=>'生气的','D'=>'累的']), 'correct_answer' => 'B', 'explanation' => 'happy = 快乐的'],
            ['question_id' => 'C-L1-027', 'type' => 'vocab', 'realm' => 'L1', 'stage' => '02', 'word' => 'big', 'question' => '"a big house" 中 "big" 的意思是？', 'options' => json_encode(['A'=>'小的','B'=>'大的','C'=>'新的','D'=>'旧的']), 'correct_answer' => 'B', 'explanation' => 'big = 大的'],
            ['question_id' => 'C-L1-028', 'type' => 'vocab', 'realm' => 'L1', 'stage' => '02', 'word' => 'small', 'question' => '"small" 的中文意思是？', 'options' => json_encode(['A'=>'大','B'=>'小','C'=>'快','D'=>'慢']), 'correct_answer' => 'B', 'explanation' => 'small = 小的'],
            ['question_id' => 'C-L1-029', 'type' => 'vocab', 'realm' => 'L1', 'stage' => '02', 'word' => 'tall', 'question' => '"tall" 的中文意思是？', 'options' => json_encode(['A'=>'矮的','B'=>'高的','C'=>'胖的','D'=>'瘦的']), 'correct_answer' => 'B', 'explanation' => 'tall = 高的'],
            ['question_id' => 'C-L1-030', 'type' => 'vocab', 'realm' => 'L1', 'stage' => '02', 'word' => 'short', 'question' => '"short" 不是以下哪个意思？', 'options' => json_encode(['A'=>'短的','B'=>'矮的','C'=>'高的','D'=>'缺少的']), 'correct_answer' => 'C', 'explanation' => 'short = 短的/矮的，不是高的'],

            // ===== L1-03 =====
            ['question_id' => 'C-L1-031', 'type' => 'vocab', 'realm' => 'L1', 'stage' => '03', 'word' => 'eat', 'question' => '"I eat an apple" 中 "eat" 的中文是？', 'options' => json_encode(['A'=>'喝','B'=>'吃','C'=>'看','D'=>'听']), 'correct_answer' => 'B', 'explanation' => 'eat = 吃'],
            ['question_id' => 'C-L1-032', 'type' => 'vocab', 'realm' => 'L1', 'stage' => '03', 'word' => 'drink', 'question' => '"drink water" 的中文是？', 'options' => json_encode(['A'=>'喝水','B'=>'吃饭','C'=>'跑步','D'=>'睡觉']), 'correct_answer' => 'A', 'explanation' => 'drink = 喝'],
            ['question_id' => 'C-L1-033', 'type' => 'vocab', 'realm' => 'L1', 'stage' => '03', 'word' => 'read', 'question' => '"read a book" 的中文是？', 'options' => json_encode(['A'=>'写书','B'=>'买书','C'=>'看书','D'=>'借书']), 'correct_answer' => 'C', 'explanation' => 'read = 阅读'],
            ['question_id' => 'C-L1-034', 'type' => 'vocab', 'realm' => 'L1', 'stage' => '03', 'word' => 'write', 'question' => '"write" 的中文意思是？', 'options' => json_encode(['A'=>'读','B'=>'写','C'=>'说','D'=>'听']), 'correct_answer' => 'B', 'explanation' => 'write = 写'],
            ['question_id' => 'C-L1-035', 'type' => 'vocab', 'realm' => 'L1', 'stage' => '03', 'word' => 'run', 'question' => '"run fast" 的中文是？', 'options' => json_encode(['A'=>'跑得快','B'=>'走得慢','C'=>'跳得高','D'=>'飞得远']), 'correct_answer' => 'A', 'explanation' => 'run = 跑'],
            ['question_id' => 'C-L1-036', 'type' => 'vocab', 'realm' => 'L1', 'stage' => '03', 'word' => 'sleep', 'question' => '"sleep" 的中文意思是？', 'options' => json_encode(['A'=>'醒','B'=>'睡','C'=>'坐','D'=>'站']), 'correct_answer' => 'B', 'explanation' => 'sleep = 睡觉'],
            ['question_id' => 'C-L1-037', 'type' => 'vocab', 'realm' => 'L1', 'stage' => '03', 'word' => 'sing', 'question' => '"sing a song" 的中文是？', 'options' => json_encode(['A'=>'跳舞','B'=>'唱歌','C'=>'弹琴','D'=>'画画']), 'correct_answer' => 'B', 'explanation' => 'sing = 唱歌'],
            ['question_id' => 'C-L1-038', 'type' => 'vocab', 'realm' => 'L1', 'stage' => '03', 'word' => 'dance', 'question' => '"dance" 的中文意思是？', 'options' => json_encode(['A'=>'唱歌','B'=>'跳舞','C'=>'演奏','D'=>'表演']), 'correct_answer' => 'B', 'explanation' => 'dance = 跳舞'],
            ['question_id' => 'C-L1-039', 'type' => 'vocab', 'realm' => 'L1', 'stage' => '03', 'word' => 'swim', 'question' => '"swim" 的中文意思是？', 'options' => json_encode(['A'=>'游泳','B'=>'跑步','C'=>'骑车','D'=>'爬山']), 'correct_answer' => 'A', 'explanation' => 'swim = 游泳'],
            ['question_id' => 'C-L1-040', 'type' => 'vocab', 'realm' => 'L1', 'stage' => '03', 'word' => 'fly', 'question' => '"fly" 的中文意思是？', 'options' => json_encode(['A'=>'跑','B'=>'飞','C'=>'走','D'=>'爬']), 'correct_answer' => 'B', 'explanation' => 'fly = 飞'],
            ['question_id' => 'C-L1-041', 'type' => 'vocab', 'realm' => 'L1', 'stage' => '03', 'word' => 'classroom', 'question' => '以下哪个是 "classroom"？', 'options' => json_encode(['A'=>'食堂','B'=>'教室','C'=>'操场','D'=>'图书馆']), 'correct_answer' => 'B', 'explanation' => 'classroom = 教室'],
            ['question_id' => 'C-L1-042', 'type' => 'vocab', 'realm' => 'L1', 'stage' => '03', 'word' => 'teacher', 'question' => '"teacher" 的中文意思是？', 'options' => json_encode(['A'=>'学生','B'=>'老师','C'=>'校长','D'=>'家长']), 'correct_answer' => 'B', 'explanation' => 'teacher = 老师'],
            ['question_id' => 'C-L1-043', 'type' => 'vocab', 'realm' => 'L1', 'stage' => '03', 'word' => 'student', 'question' => '"student" 的中文意思是？', 'options' => json_encode(['A'=>'老师','B'=>'学生','C'=>'工人','D'=>'医生']), 'correct_answer' => 'B', 'explanation' => 'student = 学生'],
            ['question_id' => 'C-L1-044', 'type' => 'vocab', 'realm' => 'L1', 'stage' => '03', 'word' => 'hospital', 'question' => '生病了应该去？', 'options' => json_encode(['A'=>'school','B'=>'hospital','C'=>'library','D'=>'market']), 'correct_answer' => 'B', 'explanation' => 'hospital = 医院'],
            ['question_id' => 'C-L1-045', 'type' => 'vocab', 'realm' => 'L1', 'stage' => '03', 'word' => 'beautiful', 'question' => '"a beautiful flower" 中 "beautiful" 的意思是？', 'options' => json_encode(['A'=>'丑陋的','B'=>'美丽的','C'=>'高大的','D'=>'弱小的']), 'correct_answer' => 'B', 'explanation' => 'beautiful = 美丽的'],

            // ===== L1-01 基础功法（语法） =====
            ['question_id' => 'G-L1-001', 'type' => 'grammar', 'realm' => 'L1', 'stage' => '01', 'word' => 'be', 'question' => 'I ___ a student.', 'options' => json_encode(['A'=>'is','B'=>'am','C'=>'are','D'=>'be']), 'correct_answer' => 'B', 'explanation' => 'I 后面用 am'],
            ['question_id' => 'G-L1-002', 'type' => 'grammar', 'realm' => 'L1', 'stage' => '01', 'word' => 'be', 'question' => 'She ___ a teacher.', 'options' => json_encode(['A'=>'am','B'=>'are','C'=>'is','D'=>'be']), 'correct_answer' => 'C', 'explanation' => '第三人称单数 She 后面用 is'],
            ['question_id' => 'G-L1-003', 'type' => 'grammar', 'realm' => 'L1', 'stage' => '01', 'word' => 'be', 'question' => 'They ___ happy.', 'options' => json_encode(['A'=>'is','B'=>'am','C'=>'are','D'=>'be']), 'correct_answer' => 'C', 'explanation' => 'They 是复数，后面用 are'],
            ['question_id' => 'G-L1-004', 'type' => 'grammar', 'realm' => 'L1', 'stage' => '01', 'word' => 'a/an', 'question' => '___ apple a day keeps the doctor away.', 'options' => json_encode(['A'=>'A','B'=>'An','C'=>'The','D'=>'/']), 'correct_answer' => 'B', 'explanation' => 'apple 以元音音素开头，用 an'],
            ['question_id' => 'G-L1-005', 'type' => 'grammar', 'realm' => 'L1', 'stage' => '01', 'word' => 'a/an', 'question' => 'I have ___ book.', 'options' => json_encode(['A'=>'a','B'=>'an','C'=>'the','D'=>'/']), 'correct_answer' => 'A', 'explanation' => 'book 以辅音音素开头，用 a'],
            ['question_id' => 'G-L1-006', 'type' => 'grammar', 'realm' => 'L1', 'stage' => '01', 'word' => 'plural', 'question' => '"cat" 的复数形式是？', 'options' => json_encode(['A'=>'cat','B'=>'cats','C'=>'cates','D'=>'caties']), 'correct_answer' => 'B', 'explanation' => '一般名词加 s 变复数'],
            ['question_id' => 'G-L1-007', 'type' => 'grammar', 'realm' => 'L1', 'stage' => '01', 'word' => 'plural', 'question' => '"box" 的复数形式是？', 'options' => json_encode(['A'=>'boxs','B'=>'boxes','C'=>'boxies','D'=>'box']), 'correct_answer' => 'B', 'explanation' => '以 s/x/ch/sh 结尾加 es'],
            ['question_id' => 'G-L1-008', 'type' => 'grammar', 'realm' => 'L1', 'stage' => '01', 'word' => 'pronoun', 'question' => '"____ is my friend." 填入正确的主语代词', 'options' => json_encode(['A'=>'He','B'=>'Him','C'=>'His','D'=>'Her']), 'correct_answer' => 'A', 'explanation' => '主语位置用主格代词 He'],
            ['question_id' => 'G-L1-009', 'type' => 'grammar', 'realm' => 'L1', 'stage' => '01', 'word' => 'pronoun', 'question' => '"This is ____ book." 填入正确的物主代词', 'options' => json_encode(['A'=>'I','B'=>'me','C'=>'my','D'=>'mine']), 'correct_answer' => 'C', 'explanation' => '名词前用形容词性物主代词 my'],
            ['question_id' => 'G-L1-010', 'type' => 'grammar', 'realm' => 'L1', 'stage' => '01', 'word' => 'word order', 'question' => '正确的句子顺序是？', 'options' => json_encode(['A'=>'like I apples','B'=>'I apples like','C'=>'I like apples','D'=>'apples I like']), 'correct_answer' => 'C', 'explanation' => '英语基本语序：主语+谓语+宾语'],
        ];

        foreach ($questions as $q) {
            $q['options'] = json_decode($q['options'], true);
            Question::create($q);
        }

        echo "Seeded " . count($questions) . " questions (L1-01~L1-03 vocab + L1-01 grammar).\n";
    }
}
