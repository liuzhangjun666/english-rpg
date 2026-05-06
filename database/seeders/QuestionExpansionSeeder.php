<?php

namespace Database\Seeders;

use App\Models\Question;
use Illuminate\Database\Seeder;

class QuestionExpansionSeeder extends Seeder
{
    public function run(): void
    {
        $questions = [
            // ===== L1-04 练气初·采药识灵 =====
            ['C-L1-046','vocab','L1','04','blue','"blue" 的中文意思是？',['A'=>'红色','B'=>'蓝色','C'=>'绿色','D'=>'黄色'],'B','blue = 蓝色'],
            ['C-L1-047','vocab','L1','04','white','"white" 的中文意思是？',['A'=>'黑色','B'=>'白色','C'=>'灰色','D'=>'紫色'],'B','white = 白色'],
            ['C-L1-048','vocab','L1','04','black','"black" 的中文意思是？',['A'=>'白色','B'=>'黑色','C'=>'棕色','D'=>'粉色'],'B','black = 黑色'],
            ['C-L1-049','vocab','L1','04','green','"green" 的中文意思是？',['A'=>'红色','B'=>'蓝色','C'=>'绿色','D'=>'黄色'],'C','green = 绿色'],
            ['C-L1-050','vocab','L1','04','red','"red" 的中文意思是？',['A'=>'红色','B'=>'蓝色','C'=>'绿色','D'=>'黄色'],'A','red = 红色'],
            ['C-L1-051','vocab','L1','04','family','"family" 的中文意思是？',['A'=>'朋友','B'=>'家庭','C'=>'学校','D'=>'工作'],'B','family = 家庭'],
            ['C-L1-052','vocab','L1','04','father','"father" 的中文意思是？',['A'=>'母亲','B'=>'父亲','C'=>'兄弟','D'=>'姐妹'],'B','father = 父亲'],
            ['C-L1-053','vocab','L1','04','mother','"mother" 的中文意思是？',['A'=>'父亲','B'=>'母亲','C'=>'叔叔','D'=>'阿姨'],'B','mother = 母亲'],
            ['C-L1-054','vocab','L1','04','brother','"brother" 的中文意思是？',['A'=>'姐妹','B'=>'兄弟','C'=>'父母','D'=>'孩子'],'B','brother = 兄弟'],
            ['C-L1-055','vocab','L1','04','sister','"sister" 的中文意思是？',['A'=>'兄弟','B'=>'姐妹','C'=>'朋友','D'=>'同学'],'B','sister = 姐妹'],
            ['C-L1-056','vocab','L1','04','baby','"baby" 的中文意思是？',['A'=>'孩子','B'=>'婴儿','C'=>'青年','D'=>'老人'],'B','baby = 婴儿'],
            ['C-L1-057','vocab','L1','04','happy','"happy" 的中文意思是？',['A'=>'悲伤','B'=>'快乐','C'=>'生气','D'=>'害怕'],'B','happy = 快乐'],
            ['C-L1-058','vocab','L1','04','sad','"sad" 的中文意思是？',['A'=>'快乐','B'=>'悲伤','C'=>'兴奋','D'=>'平静'],'B','sad = 悲伤'],
            ['C-L1-059','vocab','L1','04','hungry','"hungry" 的中文意思是？',['A'=>'渴了','B'=>'饿了','C'=>'累了','D'=>'困了'],'B','hungry = 饿了'],
            ['C-L1-060','vocab','L1','04','thirsty','"thirsty" 的中文意思是？',['A'=>'饿了','B'=>'渴了','C'=>'累了','D'=>'困了'],'B','thirsty = 渴了'],
            ['C-L1-061','vocab','L1','04','tired','"tired" 的中文意思是？',['A'=>'兴奋的','B'=>'疲倦的','C'=>'开心的','D'=>'悲伤的'],'B','tired = 疲倦的'],
            ['C-L1-062','vocab','L1','04','cold','"cold" 的中文意思是？',['A'=>'热','B'=>'冷','C'=>'温','D'=>'凉'],'B','cold = 冷'],
            ['C-L1-063','vocab','L1','04','hot','"hot" 的中文意思是？',['A'=>'冷','B'=>'热','C'=>'温','D'=>'凉'],'B','hot = 热'],

            // ===== L1-05 =====
            ['C-L1-064','vocab','L1','05','one','数字 "one" 是？',['A'=>'1','B'=>'2','C'=>'3','D'=>'4'],'A','one = 1'],
            ['C-L1-065','vocab','L1','05','two','数字 "two" 是？',['A'=>'1','B'=>'2','C'=>'3','D'=>'4'],'B','two = 2'],
            ['C-L1-066','vocab','L1','05','three','数字 "three" 是？',['A'=>'1','B'=>'2','C'=>'3','D'=>'4'],'C','three = 3'],
            ['C-L1-067','vocab','L1','05','four','数字 "four" 是？',['A'=>'2','B'=>'3','C'=>'4','D'=>'5'],'C','four = 4'],
            ['C-L1-068','vocab','L1','05','five','数字 "five" 是？',['A'=>'4','B'=>'5','C'=>'6','D'=>'7'],'B','five = 5'],
            ['C-L1-069','vocab','L1','05','six','数字 "six" 是？',['A'=>'5','B'=>'6','C'=>'7','D'=>'8'],'B','six = 6'],
            ['C-L1-070','vocab','L1','05','seven','数字 "seven" 是？',['A'=>'6','B'=>'7','C'=>'8','D'=>'9'],'B','seven = 7'],
            ['C-L1-071','vocab','L1','05','eight','数字 "eight" 是？',['A'=>'7','B'=>'8','C'=>'9','D'=>'10'],'B','eight = 8'],
            ['C-L1-072','vocab','L1','05','nine','数字 "nine" 是？',['A'=>'8','B'=>'9','C'=>'10','D'=>'11'],'B','nine = 9'],
            ['C-L1-073','vocab','L1','05','ten','数字 "ten" 是？',['A'=>'9','B'=>'10','C'=>'11','D'=>'12'],'B','ten = 10'],
            ['C-L1-074','vocab','L1','05','head','"head" 的中文意思是？',['A'=>'手','B'=>'头','C'=>'脚','D'=>'腿'],'B','head = 头'],
            ['C-L1-075','vocab','L1','05','hand','"hand" 的中文意思是？',['A'=>'头','B'=>'手','C'=>'脚','D'=>'腿'],'B','hand = 手'],
            ['C-L1-076','vocab','L1','05','foot','"foot" 的中文意思是？',['A'=>'手','B'=>'头','C'=>'脚','D'=>'腿'],'C','foot = 脚'],
            ['C-L1-077','vocab','L1','05','arm','"arm" 的中文意思是？',['A'=>'手','B'=>'头','C'=>'脚','D'=>'胳膊'],'D','arm = 胳膊'],
            ['C-L1-078','vocab','L1','05','leg','"leg" 的中文意思是？',['A'=>'胳膊','B'=>'腿','C'=>'脚','D'=>'手'],'B','leg = 腿'],
            ['C-L1-079','vocab','L1','05','eye','"eye" 的中文意思是？',['A'=>'耳朵','B'=>'眼睛','C'=>'鼻子','D'=>'嘴巴'],'B','eye = 眼睛'],
            ['C-L1-080','vocab','L1','05','ear','"ear" 的中文意思是？',['A'=>'眼睛','B'=>'耳朵','C'=>'鼻子','D'=>'嘴巴'],'B','ear = 耳朵'],
            ['C-L1-081','vocab','L1','05','mouth','"mouth" 的中文意思是？',['A'=>'耳朵','B'=>'眼睛','C'=>'鼻子','D'=>'嘴巴'],'D','mouth = 嘴巴'],

            // ===== L1-06 =====
            ['C-L1-082','vocab','L1','06','weather','"weather" 的中文是？',['A'=>'气候','B'=>'天气','C'=>'季节','D'=>'温度'],'B','weather = 天气'],
            ['C-L1-083','vocab','L1','06','spring','"spring" 除了春天还可表示？',['A'=>'夏天','B'=>'秋天','C'=>'泉水','D'=>'冬天'],'C','spring = 春天/泉水'],
            ['C-L1-084','vocab','L1','06','summer','"summer" 的中文意思是？',['A'=>'春天','B'=>'夏天','C'=>'秋天','D'=>'冬天'],'B','summer = 夏天'],
            ['C-L1-085','vocab','L1','06','autumn','"autumn" 的中文意思是？',['A'=>'春天','B'=>'夏天','C'=>'秋天','D'=>'冬天'],'C','autumn = 秋天'],
            ['C-L1-086','vocab','L1','06','winter','"winter" 的中文意思是？',['A'=>'春天','B'=>'夏天','C'=>'秋天','D'=>'冬天'],'D','winter = 冬天'],
            ['C-L1-087','vocab','L1','06','Monday','"Monday" 的中文是？',['A'=>'星期二','B'=>'星期三','C'=>'星期一','D'=>'星期四'],'C','Monday = 星期一'],
            ['C-L1-088','vocab','L1','06','Tuesday','"Tuesday" 的中文是？',['A'=>'星期一','B'=>'星期二','C'=>'星期三','D'=>'星期四'],'B','Tuesday = 星期二'],
            ['C-L1-089','vocab','L1','06','Wednesday','"Wednesday" 的中文是？',['A'=>'星期二','B'=>'星期三','C'=>'星期四','D'=>'星期五'],'B','Wednesday = 星期三'],
            ['C-L1-090','vocab','L1','06','Thursday','"Thursday" 的中文是？',['A'=>'星期三','B'=>'星期四','C'=>'星期五','D'=>'星期六'],'B','Thursday = 星期四'],
            ['C-L1-091','vocab','L1','06','Friday','"Friday" 的中文是？',['A'=>'星期四','B'=>'星期五','C'=>'星期六','D'=>'星期日'],'B','Friday = 星期五'],
            ['C-L1-092','vocab','L1','06','Saturday','"Saturday" 的中文是？',['A'=>'星期五','B'=>'星期六','C'=>'星期日','D'=>'星期一'],'B','Saturday = 星期六'],
            ['C-L1-093','vocab','L1','06','Sunday','"Sunday" 的中文是？',['A'=>'星期六','B'=>'星期日','C'=>'星期一','D'=>'星期二'],'B','Sunday = 星期日'],
            ['C-L1-094','vocab','L1','06','month','"month" 的中文意思是？',['A'=>'年','B'=>'月','C'=>'日','D'=>'周'],'B','month = 月'],
            ['C-L1-095','vocab','L1','06','year','"year" 的中文意思是？',['A'=>'月','B'=>'日','C'=>'年','D'=>'周'],'C','year = 年'],
            ['C-L1-096','vocab','L1','06','today','"today" 的中文意思是？',['A'=>'昨天','B'=>'今天','C'=>'明天','D'=>'后天'],'B','today = 今天'],
            ['C-L1-097','vocab','L1','06','yesterday','"yesterday" 的中文意思是？',['A'=>'今天','B'=>'明天','C'=>'昨天','D'=>'前天'],'C','yesterday = 昨天'],
            ['C-L1-098','vocab','L1','06','tomorrow','"tomorrow" 的中文意思是？',['A'=>'昨天','B'=>'今天','C'=>'明天','D'=>'后天'],'C','tomorrow = 明天'],
            ['C-L1-099','vocab','L1','06','clock','"clock" 的中文意思是？',['A'=>'手表','B'=>'时钟','C'=>'闹钟','D'=>'秒表'],'B','clock = 时钟'],

            // ===== L1-07 =====
            ['C-L1-100','vocab','L1','07','kitchen','"kitchen" 的中文意思是？',['A'=>'卧室','B'=>'厨房','C'=>'客厅','D'=>'浴室'],'B','kitchen = 厨房'],
            ['C-L1-101','vocab','L1','07','bedroom','"bedroom" 的中文意思是？',['A'=>'厨房','B'=>'客厅','C'=>'卧室','D'=>'书房'],'C','bedroom = 卧室'],
            ['C-L1-102','vocab','L1','07','bathroom','"bathroom" 的中文意思是？',['A'=>'厨房','B'=>'浴室','C'=>'卧室','D'=>'客厅'],'B','bathroom = 浴室'],
            ['C-L1-103','vocab','L1','07','garden','"garden" 的中文意思是？',['A'=>'房间','B'=>'花园','C'=>'阳台','D'=>'车库'],'B','garden = 花园'],
            ['C-L1-104','vocab','L1','07','table','"table" 的中文意思是？',['A'=>'椅子','B'=>'桌子','C'=>'床','D'=>'柜子'],'B','table = 桌子'],
            ['C-L1-105','vocab','L1','07','chair','"chair" 的中文意思是？',['A'=>'桌子','B'=>'椅子','C'=>'沙发','D'=>'床'],'B','chair = 椅子'],
            ['C-L1-106','vocab','L1','07','door','"door" 的中文意思是？',['A'=>'窗户','B'=>'门','C'=>'墙','D'=>'地板'],'B','door = 门'],
            ['C-L1-107','vocab','L1','07','window','"window" 的中文意思是？',['A'=>'门','B'=>'窗户','C'=>'屋顶','D'=>'墙壁'],'B','window = 窗户'],
            ['C-L1-108','vocab','L1','07','bed','"bed" 的中文意思是？',['A'=>'桌子','B'=>'椅子','C'=>'床','D'=>'沙发'],'C','bed = 床'],
            ['C-L1-109','vocab','L1','07','lamp','"lamp" 的中文意思是？',['A'=>'灯泡','B'=>'灯','C'=>'蜡烛','D'=>'手电'],'B','lamp = 灯'],
            ['C-L1-110','vocab','L1','07','phone','"phone" 的中文意思是？',['A'=>'电视','B'=>'电话','C'=>'电脑','D'=>'收音机'],'B','phone = 电话'],
            ['C-L1-111','vocab','L1','07','computer','"computer" 的中文意思是？',['A'=>'电话','B'=>'电视','C'=>'电脑','D'=>'平板'],'C','computer = 电脑'],
            ['C-L1-112','vocab','L1','07','television','"television" 的缩写是？',['A'=>'PC','B'=>'TV','C'=>'CD','D'=>'DVD'],'B','television = 电视，缩写 TV'],
            ['C-L1-113','vocab','L1','07','radio','"radio" 的中文意思是？',['A'=>'电视','B'=>'电脑','C'=>'收音机','D'=>'手机'],'C','radio = 收音机'],
            ['C-L1-114','vocab','L1','07','cook','"cook" 的中文意思是？',['A'=>'吃','B'=>'喝','C'=>'烹饪','D'=>'洗'],'C','cook = 烹饪'],

            // ===== L1-08 =====
            ['C-L1-115','vocab','L1','08','animal','"animal" 的中文意思是？',['A'=>'植物','B'=>'动物','C'=>'矿物','D'=>'食物'],'B','animal = 动物'],
            ['C-L1-116','vocab','L1','08','bird','"bird" 的中文意思是？',['A'=>'鱼','B'=>'鸟','C'=>'虫','D'=>'兽'],'B','bird = 鸟'],
            ['C-L1-117','vocab','L1','08','horse','"horse" 的中文意思是？',['A'=>'牛','B'=>'羊','C'=>'马','D'=>'猪'],'C','horse = 马'],
            ['C-L1-118','vocab','L1','08','pig','"pig" 的中文意思是？',['A'=>'牛','B'=>'羊','C'=>'马','D'=>'猪'],'D','pig = 猪'],
            ['C-L1-119','vocab','L1','08','sheep','"sheep" 的中文意思是？',['A'=>'牛','B'=>'羊','C'=>'马','D'=>'猪'],'B','sheep = 羊'],
            ['C-L1-120','vocab','L1','08','monkey','"monkey" 的中文意思是？',['A'=>'猴子','B'=>'猩猩','C'=>'熊猫','D'=>'老虎'],'A','monkey = 猴子'],
            ['C-L1-121','vocab','L1','08','panda','"panda" 的中文意思是？',['A'=>'猴子','B'=>'猩猩','C'=>'熊猫','D'=>'老虎'],'C','panda = 熊猫'],
            ['C-L1-122','vocab','L1','08','elephant','"elephant" 的中文意思是？',['A'=>'老虎','B'=>'狮子','C'=>'大象','D'=>'长颈鹿'],'C','elephant = 大象'],
            ['C-L1-123','vocab','L1','08','tiger','"tiger" 的中文意思是？',['A'=>'狮子','B'=>'老虎','C'=>'豹子','D'=>'狼'],'B','tiger = 老虎'],
            ['C-L1-124','vocab','L1','08','rabbit','"rabbit" 的中文意思是？',['A'=>'猫','B'=>'狗','C'=>'兔子','D'=>'老鼠'],'C','rabbit = 兔子'],
            ['C-L1-125','vocab','L1','08','snake','"snake" 的中文意思是？',['A'=>'龙','B'=>'蛇','C'=>'虫','D'=>'鱼'],'B','snake = 蛇'],
            ['C-L1-126','vocab','L1','08','forest','"forest" 的中文意思是？',['A'=>'森林','B'=>'草原','C'=>'沙漠','D'=>'海洋'],'A','forest = 森林'],
            ['C-L1-127','vocab','L1','08','river','"river" 的中文意思是？',['A'=>'海','B'=>'河','C'=>'湖','D'=>'溪'],'B','river = 河流'],
            ['C-L1-128','vocab','L1','08','mountain','"mountain" 的中文意思是？',['A'=>'山','B'=>'河','C'=>'湖','D'=>'海'],'A','mountain = 山'],

            // ===== L1-09 =====
            ['C-L1-129','vocab','L1','09','car','"car" 的中文意思是？',['A'=>'公交车','B'=>'小汽车','C'=>'卡车','D'=>'火车'],'B','car = 小汽车'],
            ['C-L1-130','vocab','L1','09','bus','"bus" 的中文意思是？',['A'=>'小汽车','B'=>'公交车','C'=>'卡车','D'=>'自行车'],'B','bus = 公交车'],
            ['C-L1-131','vocab','L1','09','bike','"bike" 的中文意思是？',['A'=>'汽车','B'=>'公交车','C'=>'自行车','D'=>'摩托车'],'C','bike = 自行车'],
            ['C-L1-132','vocab','L1','09','train','"train" 的中文意思是？',['A'=>'汽车','B'=>'公交车','C'=>'火车','D'=>'飞机'],'C','train = 火车'],
            ['C-L1-133','vocab','L1','09','plane','"plane" 的中文意思是？',['A'=>'火车','B'=>'轮船','C'=>'飞机','D'=>'汽车'],'C','plane = 飞机'],
            ['C-L1-134','vocab','L1','09','ship','"ship" 的中文意思是？',['A'=>'飞机','B'=>'轮船','C'=>'火车','D'=>'汽车'],'B','ship = 轮船'],
            ['C-L1-135','vocab','L1','09','street','"street" 的中文意思是？',['A'=>'街道','B'=>'公园','C'=>'广场','D'=>'小区'],'A','street = 街道'],
            ['C-L1-136','vocab','L1','09','shop','"shop" 的中文意思是？',['A'=>'超市','B'=>'商店','C'=>'市场','D'=>'商场'],'B','shop = 商店'],
            ['C-L1-137','vocab','L1','09','park','"park" 的中文意思是？',['A'=>'街道','B'=>'商店','C'=>'公园','D'=>'广场'],'C','park = 公园'],
            ['C-L1-138','vocab','L1','09','bridge','"bridge" 的中文意思是？',['A'=>'桥','B'=>'路','C'=>'塔','D'=>'墙'],'A','bridge = 桥'],
            ['C-L1-139','vocab','L1','09','restaurant','"restaurant" 的中文意思是？',['A'=>'超市','B'=>'医院','C'=>'餐厅','D'=>'学校'],'C','restaurant = 餐厅'],
            ['C-L1-140','vocab','L1','09','supermarket','"supermarket" 的中文意思是？',['A'=>'商店','B'=>'超市','C'=>'市场','D'=>'商场'],'B','supermarket = 超市'],
            ['C-L1-141','vocab','L1','09','library','"library" 的中文意思是？',['A'=>'教室','B'=>'图书馆','C'=>'办公室','D'=>'实验室'],'B','library = 图书馆'],
            ['C-L1-142','vocab','L1','09','school','"school" 的中文意思是？',['A'=>'医院','B'=>'学校','C'=>'银行','D'=>'邮局'],'B','school = 学校'],
            ['C-L1-143','vocab','L1','09','hospital','"hospital" 的中文意思是？',['A'=>'学校','B'=>'医院','C'=>'银行','D'=>'邮局'],'B','hospital = 医院'],
            ['C-L1-144','vocab','L1','09','bank','"bank" 的中文意思是？',['A'=>'医院','B'=>'学校','C'=>'银行','D'=>'邮局'],'C','bank = 银行'],

            // ===== L1-02 ~ L1-09 语法 =====
            ['G-L1-011','grammar','L1','02','be','"____ you a student?" 填入正确的 be 动词',['A'=>'Is','B'=>'Am','C'=>'Are','D'=>'Be'],'C','You 是第二人称，用 Are'],
            ['G-L1-012','grammar','L1','02','be','"My parents ____ at home." 填入正确的 be 动词',['A'=>'is','B'=>'am','C'=>'are','D'=>'be'],'C','复数主语用 are'],
            ['G-L1-013','grammar','L1','02','have/has','"She ____ a cat." 填入正确的动词',['A'=>'have','B'=>'has','C'=>'had','D'=>'having'],'B','第三人称单数用 has'],
            ['G-L1-014','grammar','L1','02','have/has','"I ____ two books." 填入正确的动词',['A'=>'have','B'=>'has','C'=>'had','D'=>'having'],'A','I 用 have'],
            ['G-L1-015','grammar','L1','02','do/does','"____ you like apples?" 填入正确的助动词',['A'=>'Do','B'=>'Does','C'=>'Is','D'=>'Are'],'A','You 前用 Do 提问'],
            ['G-L1-016','grammar','L1','02','do/does','"____ he play football?" 填入正确的助动词',['A'=>'Do','B'=>'Does','C'=>'Is','D'=>'Are'],'B','He 是第三人称单数用 Does'],
            ['G-L1-017','grammar','L1','02','negation','"I am a student." 的否定句是？',['A'=>'I am not a student.','B'=>'I no am a student.','C'=>'I amn\'t a student.','D'=>'I not a student.'],'A','am 后加 not 变否定'],
            ['G-L1-018','grammar','L1','02','negation','"She likes cats." 的否定句是？',['A'=>'She likes not cats.','B'=>'She don\'t like cats.','C'=>'She doesn\'t like cats.','D'=>'She not like cats.'],'C','第三人称用 doesn\'t + 动词原形'],
            ['G-L1-019','grammar','L1','02','question','陈述句变一般疑问句："You are a teacher." →',['A'=>'Are you a teacher?','B'=>'You are a teacher?','C'=>'Do you a teacher?','D'=>'Is you a teacher?'],'A','be 动词提前变疑问句'],
            ['G-L1-020','grammar','L1','02','question','陈述句变一般疑问句："They have a car." →',['A'=>'Have they a car?','B'=>'Do they have a car?','C'=>'Are they have a car?','D'=>'Does they have a car?'],'B','实义动词用 Do/Does 提问'],

            ['G-L1-021','grammar','L1','03','present tense','"He ____ (go) to school every day."',['A'=>'go','B'=>'goes','C'=>'going','D'=>'went'],'B','第三人称单数一般现在时加 s/es'],
            ['G-L1-022','grammar','L1','03','present tense','"They ____ (play) football on Sundays."',['A'=>'play','B'=>'plays','C'=>'playing','D'=>'played'],'A','复数主语用动词原形'],
            ['G-L1-023','grammar','L1','03','adjective','"The flower is ____." 填入正确的形容词',['A'=>'beautifully','B'=>'beautiful','C'=>'beauty','D'=>'beautify'],'B','be 动词后接形容词'],
            ['G-L1-024','grammar','L1','03','adjective','"This is a ____ book." 填入正确的形容词',['A'=>'interest','B'=>'interested','C'=>'interesting','D'=>'interests'],'C','修饰物用 interesting'],
            ['G-L1-025','grammar','L1','03','preposition','"The book is ____ the table." 填入正确介词',['A'=>'in','B'=>'on','C'=>'at','D'=>'to'],'B','在桌子表面用 on'],
            ['G-L1-026','grammar','L1','03','preposition','"The cat is ____ the box."（猫在盒子里）',['A'=>'on','B'=>'at','C'=>'in','D'=>'under'],'C','在盒子里面用 in'],
            ['G-L1-027','grammar','L1','03','preposition','"I get up ____ 7 o\'clock." 填入正确介词',['A'=>'in','B'=>'on','C'=>'at','D'=>'to'],'C','具体时间点用 at'],
            ['G-L1-028','grammar','L1','03','conjunction','"I like apples ____ bananas." 填入正确连词',['A'=>'but','B'=>'and','C'=>'or','D'=>'so'],'B','并列关系用 and'],
            ['G-L1-029','grammar','L1','03','conjunction','"It\'s raining, ____ I take an umbrella."',['A'=>'but','B'=>'and','C'=>'or','D'=>'so'],'D','因果关系用 so'],
            ['G-L1-030','grammar','L1','03','conjunction','"I want to go, ____ I\'m too tired."',['A'=>'but','B'=>'and','C'=>'or','D'=>'so'],'A','转折关系用 but'],
        ];

        foreach ($questions as $q) {
            Question::create([
                'question_id' => $q[0],
                'type' => $q[1],
                'realm' => $q[2],
                'stage' => $q[3],
                'word' => $q[4],
                'question' => $q[5],
                'options' => $q[6],
                'correct_answer' => $q[7],
                'explanation' => $q[8],
            ]);
        }

        echo "Seeded " . count($questions) . " expansion questions (L1-04~L1-09 vocab + L1-02~L1-09 grammar).\n";
    }
}
