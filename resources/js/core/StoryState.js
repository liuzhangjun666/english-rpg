const STORY_ARCS = {
    chapter_1: {
        title: '第一章·宗门初启',
        theme: '入门、立誓、选择第一条修行方向',
    },
    chapter_2: {
        title: '第二章·山门试炼',
        theme: '外门试炼、路线强化、第一次结局分化',
    },
    chapter_3: {
        title: '第三章·天命回响',
        theme: '隐藏残卷、分支回收、最终命盘',
    },
};

const STORY_CHAPTERS = {
    'R1-01': {
        arc: STORY_ARCS.chapter_1.title,
        title: '晨钟入门',
        summary: '你刚入宗门，先用基础词汇和句型稳住灵气。',
        nextGoal: '完成练功房基础修炼，开启第一段阅读剧情',
        recommendedModule: 'practice',
        unlockHint: '新号默认开启。',
    },
    'R1-05': {
        arc: STORY_ARCS.chapter_1.title,
        title: '藏经阁残页',
        summary: '藏经阁发现残缺英文符文，你需要读懂线索并选择路线。',
        nextGoal: '通关阅读副本并选择守正、探秘或问心路线',
        recommendedModule: 'reading',
        unlockHint: '练功积累基础灵气后进入阅读。',
    },
    'R1-10': {
        arc: STORY_ARCS.chapter_1.title,
        title: '山门小试',
        summary: '宗门要求用阶段考试证明路线选择不是一时冲动。',
        nextGoal: '通过试炼场，稳定正确率后继续主线',
        recommendedModule: 'shilianchang',
        unlockHint: '完成 R1-05 分支后进入。',
    },
    'R1-15': {
        arc: STORY_ARCS.chapter_1.title,
        title: '入门终幕',
        summary: '第一章收束，系统根据你的路线生成第一轮结局节点。',
        nextGoal: '回到阅读终章，收束第一章结局并进入第二章',
        recommendedModule: 'reading',
        unlockHint: '通过 R1-10 试炼后进入。',
    },
    'R2-05': {
        arc: STORY_ARCS.chapter_2.title,
        title: '外门令牌',
        summary: '你获得外门令牌，可以把第一章路线延伸成新的修行身份。',
        nextGoal: '完成第二章第一段阅读，确认外门路线',
        recommendedModule: 'reading',
        unlockHint: '解锁任意第一章结局后进入。',
    },
    'R2-10': {
        arc: STORY_ARCS.chapter_2.title,
        title: '秘境前哨',
        summary: '外门路线开始分化，秘境残卷会影响隐藏分支。',
        nextGoal: '先去秘境收集残卷，再回阅读推进关键分支',
        recommendedModule: 'mijing',
        unlockHint: '完成 R2-05 分支后进入。',
    },
    'R2-15': {
        arc: STORY_ARCS.chapter_2.title,
        title: '山门终局',
        summary: '第二章根据路线、残卷和道心值进入不同结局。',
        nextGoal: '完成终章阅读，解锁长明、玄迹或逆命结局',
        recommendedModule: 'reading',
        unlockHint: '完成 R2-10 分支并通过必要试炼后进入。',
    },
};

const STORY_NODE_CATALOG = [
    {
        id: 'R1-05_path_guardian',
        chapterId: 'R1-05',
        arc: STORY_ARCS.chapter_1.title,
        title: '守正之路',
        type: 'branch',
        description: '把残页交给藏经阁长老，按宗门规矩修复符文。',
        unlockRule: '通关 R1-05 阅读副本，并选择“交还残页”。',
        rewardHint: '道心更稳，后续试炼容错更高。',
        recommendedModule: 'reading',
        hint: '适合先把主线走稳的新玩家。',
    },
    {
        id: 'R1-05_path_explorer',
        chapterId: 'R1-05',
        arc: STORY_ARCS.chapter_1.title,
        title: '探秘之路',
        type: 'branch',
        description: '暂存残页，追查符文出处，后续更容易发现隐藏线索。',
        unlockRule: '通关 R1-05 阅读副本，并选择“追查来源”。',
        rewardHint: '更容易获得剧情钥匙和秘境提示。',
        recommendedModule: 'reading',
        hint: '适合想收集分支和隐藏结局的玩家。',
    },
    {
        id: 'R1-05_path_heretic',
        chapterId: 'R1-05',
        arc: STORY_ARCS.chapter_1.title,
        title: '问心之路',
        type: 'branch',
        description: '不急于相信宗门解释，先用自己的理解破解残页。',
        unlockRule: '通关 R1-05 阅读副本，并选择“自行参悟”。',
        rewardHint: '路线风险更高，但能打开逆命类选项。',
        recommendedModule: 'reading',
        hint: '需要保持较高正确率，避免道心过低。',
    },
    {
        id: 'R1-10_path_guardian',
        chapterId: 'R1-10',
        arc: STORY_ARCS.chapter_1.title,
        title: '守正进阶',
        type: 'branch',
        description: '你在山门小试中证明自己能按规则稳定输出。',
        unlockRule: '选择守正路线后，通过 R1-10 试炼场。',
        rewardHint: '提升道心，降低后续章节门槛。',
        recommendedModule: 'shilianchang',
        hint: '若无法解锁，先回练功房补基础题。',
    },
    {
        id: 'R1-10_path_explorer',
        chapterId: 'R1-10',
        arc: STORY_ARCS.chapter_1.title,
        title: '探秘进阶',
        type: 'branch',
        description: '你在试炼里发现题目与残页符文存在对应关系。',
        unlockRule: '选择探秘路线后，通过 R1-10 试炼场。',
        rewardHint: '增加剧情钥匙，强化秘境收益。',
        recommendedModule: 'shilianchang',
        hint: '试炼前先完成一次阅读或写作，能补钥匙。',
    },
    {
        id: 'R1-10_path_heretic',
        chapterId: 'R1-10',
        arc: STORY_ARCS.chapter_1.title,
        title: '问心进阶',
        type: 'branch',
        description: '你用非标准解法通过小试，开始被宗门记录观察。',
        unlockRule: '选择问心路线后，通过 R1-10 试炼场。',
        rewardHint: '后续可能进入逆命结局，但失败惩罚更明显。',
        recommendedModule: 'shilianchang',
        hint: '道心不足时先做错题复习，避免路线断档。',
    },
    {
        id: 'R1-15_path_guardian',
        chapterId: 'R1-15',
        arc: STORY_ARCS.chapter_1.title,
        title: '守正终幕',
        type: 'ending',
        description: '你成为外门认可的新弟子，获得长明路线的起点。',
        unlockRule: '守正路线推进到 R1-15 并完成终章阅读。',
        rewardHint: '解锁第二章长明方向。',
        recommendedModule: 'reading',
        hint: '回到阅读终章补完第一章结局。',
    },
    {
        id: 'R1-15_path_explorer',
        chapterId: 'R1-15',
        arc: STORY_ARCS.chapter_1.title,
        title: '探秘终幕',
        type: 'ending',
        description: '你没有公开全部发现，而是带着残页线索进入外门。',
        unlockRule: '探秘路线推进到 R1-15 并完成终章阅读。',
        rewardHint: '解锁第二章玄迹方向。',
        recommendedModule: 'reading',
        hint: '适合继续追隐藏残卷。',
    },
    {
        id: 'R1-15_path_heretic',
        chapterId: 'R1-15',
        arc: STORY_ARCS.chapter_1.title,
        title: '问心终幕',
        type: 'ending',
        description: '你拒绝完全照抄宗门答案，获得逆命方向的第一枚印记。',
        unlockRule: '问心路线推进到 R1-15 并完成终章阅读。',
        rewardHint: '解锁第二章逆命方向。',
        recommendedModule: 'reading',
        hint: '路线可继续，但要注意道心值。',
    },
    {
        id: 'R2-05_path_guardian',
        chapterId: 'R2-05',
        arc: STORY_ARCS.chapter_2.title,
        title: '山门守正',
        type: 'branch',
        description: '你代表外门协助维持山门秩序，剧情更偏稳定成长。',
        unlockRule: '进入第二章后，在 R2-05 阅读选择守正处理。',
        rewardHint: '道心稳定增长。',
        recommendedModule: 'reading',
        hint: '如果只想先跑通主线，选这条路线。',
    },
    {
        id: 'R2-05_path_explorer',
        chapterId: 'R2-05',
        arc: STORY_ARCS.chapter_2.title,
        title: '山门探秘',
        type: 'branch',
        description: '你调查山门异动，把日常学习转成线索追踪。',
        unlockRule: '进入第二章后，在 R2-05 阅读选择调查异动。',
        rewardHint: '更容易触发秘境收集。',
        recommendedModule: 'reading',
        hint: '后续要配合秘境模块。',
    },
    {
        id: 'R2-05_path_heretic',
        chapterId: 'R2-05',
        arc: STORY_ARCS.chapter_2.title,
        title: '山门问心',
        type: 'branch',
        description: '你开始质疑山门规则，剧情会进入更高风险分支。',
        unlockRule: '进入第二章后，在 R2-05 阅读选择质疑规则。',
        rewardHint: '可走逆命结局，但需要更高正确率支撑。',
        recommendedModule: 'reading',
        hint: '建议先把错题复习清掉。',
    },
    {
        id: 'R2-10_path_guardian',
        chapterId: 'R2-10',
        arc: STORY_ARCS.chapter_2.title,
        title: '险途守正',
        type: 'branch',
        description: '秘境前哨中，你选择保护队伍并按规则撤离。',
        unlockRule: 'R2-05 选择守正后，完成 R2-10 前置任务。',
        rewardHint: '提高道心，稳定解锁长明结局。',
        recommendedModule: 'mijing',
        hint: '先去秘境获得前哨线索，再回阅读。',
    },
    {
        id: 'R2-10_path_explorer',
        chapterId: 'R2-10',
        arc: STORY_ARCS.chapter_2.title,
        title: '险途探秘',
        type: 'branch',
        description: '你深入前哨调查残卷，隐藏结局条件开始累积。',
        unlockRule: 'R2-05 选择探秘后，完成秘境或阅读前置。',
        rewardHint: '提高剧情钥匙收益。',
        recommendedModule: 'mijing',
        hint: '优先打秘境，拿到残卷后再推进。',
    },
    {
        id: 'R2-10_path_heretic',
        chapterId: 'R2-10',
        arc: STORY_ARCS.chapter_2.title,
        title: '险途问心',
        type: 'branch',
        description: '你绕开宗门命令追踪异常灵气，可能打开逆命终局。',
        unlockRule: 'R2-05 选择问心后，完成 R2-10 前置任务。',
        rewardHint: '逆命结局进度提升。',
        recommendedModule: 'mijing',
        hint: '道心过低时先复习，否则路线容易卡住。',
    },
    {
        id: 'R2-15_path_guardian',
        chapterId: 'R2-15',
        arc: STORY_ARCS.chapter_2.title,
        title: '长明结局',
        type: 'ending',
        description: '你以稳定修行为核心，成为山门长明灯的守灯人。',
        unlockRule: '第二章守正路线推进到 R2-15 并完成终章。',
        rewardHint: '普通结局之一，计入隐藏结局前置。',
        recommendedModule: 'reading',
        hint: '保持主线连续推进即可。',
    },
    {
        id: 'R2-15_path_explorer',
        chapterId: 'R2-15',
        arc: STORY_ARCS.chapter_2.title,
        title: '玄迹结局',
        type: 'ending',
        description: '你破解残卷与山门异动的联系，获得玄迹记录。',
        unlockRule: '第二章探秘路线推进到 R2-15，并至少完成一次秘境收集。',
        rewardHint: '普通结局之一，更接近隐藏结局。',
        recommendedModule: 'reading',
        hint: '缺线索时先去秘境。',
    },
    {
        id: 'R2-15_path_heretic',
        chapterId: 'R2-15',
        arc: STORY_ARCS.chapter_2.title,
        title: '逆命结局',
        type: 'ending',
        description: '你保留自己的答案，不完全服从山门命盘。',
        unlockRule: '第二章问心路线推进到 R2-15，并维持足够道心。',
        rewardHint: '普通结局之一，影响隐藏结局判定。',
        recommendedModule: 'reading',
        hint: '若道心不足，先刷错题复习。',
    },
    {
        id: 'hidden_ending_void',
        chapterId: 'R3-H1',
        arc: '隐藏结局',
        title: '太虚归一',
        type: 'hidden-ending',
        description: '所有路线回收到同一残卷源头，你发现宗门试炼本身就是一场语言阵法。',
        unlockRule: '至少 2 个普通结局、秘境残卷、6 把剧情钥匙、30 灵气。',
        rewardHint: '隐藏结局，作为长期收集目标。',
        recommendedModule: 'mijing',
        hint: '缺残卷就打秘境，缺钥匙就做阅读或写作。',
    },
    {
        id: 'hidden_ending_starlight',
        chapterId: 'R3-H2',
        arc: '隐藏结局',
        title: '星河悟道',
        type: 'hidden-ending',
        description: '你把不同路线的英文符文重新排列，拼出星河中的最终句子。',
        unlockRule: '至少 2 个普通结局、秘境残卷、6 把剧情钥匙、30 灵气。',
        rewardHint: '隐藏结局，适合二周目收集。',
        recommendedModule: 'mijing',
        hint: '优先补图鉴缺口，再推进终章。',
    },
];

const DAILY_DESTINY_EVENTS = [
    { id: 'destiny_morning_chant', title: '晨钟悟字', reward: { lingqi: 4, daoxin: 1, story_keys: 0 }, reward_hint: '灵气+4 道心+1' },
    { id: 'destiny_sword_script', title: '剑意抄录', reward: { lingqi: 3, daoxin: 0, story_keys: 1 }, reward_hint: '灵气+3 剧情钥匙+1' },
    { id: 'destiny_beast_trace', title: '灵兽追踪', reward: { lingqi: 5, daoxin: 0, story_keys: 0 }, reward_hint: '灵气+5' },
    { id: 'destiny_moon_quiz', title: '月下问答', reward: { lingqi: 2, daoxin: 2, story_keys: 0 }, reward_hint: '灵气+2 道心+2' },
    { id: 'destiny_hidden_scroll', title: '残卷觅迹', reward: { lingqi: 2, daoxin: 0, story_keys: 1 }, reward_hint: '灵气+2 剧情钥匙+1' },
];

export function defaultStoryProgress() {
    return {
        current_mainline: 'chapter_1',
        current_chapter_id: 'R1-01',
        recommended_module: 'reading',
        selected_branches: {},
        collected_nodes: [],
        collected_items: [],
        unlocked_endings: [],
        chapter_completion: {},
        daily_destiny: {
            date: null,
            event_id: null,
            event_title: null,
            reward_hint: null,
        },
        weekly_branch_window: {
            week_key: null,
            branch_ids: [],
        },
    };
}

export function defaultProgressCurrency() {
    return {
        lingqi: 0,
        daoxin: 100,
        story_keys: 0,
    };
}

export function normalizeStoryProgress(raw) {
    const defaults = defaultStoryProgress();
    const source = raw && typeof raw === 'object' ? raw : {};

    return {
        ...defaults,
        ...source,
        selected_branches: normalizeMap(source.selected_branches),
        collected_nodes: normalizeList(source.collected_nodes),
        collected_items: normalizeList(source.collected_items),
        unlocked_endings: normalizeList(source.unlocked_endings),
        chapter_completion: normalizeMap(source.chapter_completion),
        daily_destiny: {
            ...defaults.daily_destiny,
            ...(source.daily_destiny && typeof source.daily_destiny === 'object' ? source.daily_destiny : {}),
        },
        weekly_branch_window: {
            ...defaults.weekly_branch_window,
            ...(source.weekly_branch_window && typeof source.weekly_branch_window === 'object' ? source.weekly_branch_window : {}),
            branch_ids: normalizeList(source?.weekly_branch_window?.branch_ids),
        },
    };
}

export function normalizeProgressCurrency(raw) {
    const defaults = defaultProgressCurrency();
    const source = raw && typeof raw === 'object' ? raw : {};

    return {
        lingqi: Math.max(0, Number(source.lingqi ?? defaults.lingqi) || 0),
        daoxin: Math.max(0, Number(source.daoxin ?? defaults.daoxin) || 0),
        story_keys: Math.max(0, Number(source.story_keys ?? defaults.story_keys) || 0),
    };
}

export function storyNodeCatalog() {
    return STORY_NODE_CATALOG;
}

export function storyChapterCatalog() {
    return STORY_CHAPTERS;
}

export function getStoryChapterMeta(chapterId) {
    const id = String(chapterId || 'R1-01');
    return STORY_CHAPTERS[id] || {
        arc: mainlineLabel('chapter_1'),
        title: id,
        summary: '继续完成当前学习任务，系统会根据完成情况推进主线。',
        nextGoal: '完成推荐模块，等待下一段剧情开启',
        recommendedModule: 'reading',
        unlockHint: '完成前置章节后开启。',
    };
}

export function buildHallStoryGuide(storyProgress, progressCurrency) {
    const chapterId = String(storyProgress?.current_chapter_id || 'R1-01');
    const chapterNo = Number((chapterId.split('-')[1] || '01'));
    const mainline = String(storyProgress?.current_mainline || 'chapter_1');
    const branchCount = Object.keys(storyProgress?.selected_branches || {}).length;
    const chapterMeta = getStoryChapterMeta(chapterId);

    const recommendedModule = resolveRecommendedModule(storyProgress, chapterNo, chapterMeta);
    const nextGoal = chapterMeta.nextGoal || (branchCount < 1
        ? '完成当前章节并选择第一条命盘分支'
        : chapterNo >= 15
            ? '进入下一大章并收集新分支'
            : '推进下一章节，积累命盘节点');

    return {
        currentMainlineLabel: mainlineLabel(mainline),
        currentChapterId: chapterId,
        chapterTitle: chapterMeta.title,
        chapterSummary: chapterMeta.summary,
        chapterUnlockHint: chapterMeta.unlockHint,
        nextGoal,
        recommendedModule,
        branchCollected: normalizeList(storyProgress?.collected_nodes).length,
        endingCollected: normalizeList(storyProgress?.unlocked_endings).length,
        totalBranches: STORY_NODE_CATALOG.filter((n) => n.type === 'branch' || n.type === 'ending').length,
        totalEndings: STORY_NODE_CATALOG.filter((n) => n.type.includes('ending')).length,
        currencies: normalizeProgressCurrency(progressCurrency),
        dailyDestiny: normalizeDailyDestiny(storyProgress?.daily_destiny),
        weeklyBranchWindow: normalizeWeeklyBranchWindow(storyProgress?.weekly_branch_window),
    };
}

export function buildStoryCodexView(storyProgress) {
    const selected = normalizeList(storyProgress?.collected_nodes);
    const endings = normalizeList(storyProgress?.unlocked_endings);

    const nodes = STORY_NODE_CATALOG.map((node) => {
        const unlocked = selected.includes(node.id) || endings.includes(node.id);
        return {
            ...node,
            unlocked,
        };
    });

    return {
        nodes,
        unlockedCount: nodes.filter((node) => node.unlocked).length,
        totalCount: nodes.length,
    };
}

export function buildDailyDestiny(dateKey) {
    const normalizedDate = String(dateKey || toDateKey(new Date()));
    const seed = hashNumber(normalizedDate);
    const event = DAILY_DESTINY_EVENTS[Math.abs(seed) % DAILY_DESTINY_EVENTS.length];
    return {
        date: normalizedDate,
        event_id: event.id,
        event_title: event.title,
        reward_hint: event.reward_hint,
        reward: { ...event.reward },
    };
}

export function buildWeeklyBranchWindow(date = new Date()) {
    const weekKey = getWeekKey(date);
    const branchPool = STORY_NODE_CATALOG.filter((node) => node.type === 'branch').map((node) => node.id);
    const seed = Math.abs(hashNumber(weekKey));
    const picks = [];
    for (let i = 0; i < Math.min(3, branchPool.length); i += 1) {
        const idx = (seed + i * 7) % branchPool.length;
        picks.push(branchPool[idx]);
    }
    return {
        week_key: weekKey,
        branch_ids: Array.from(new Set(picks)),
    };
}

export function toDateKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function resolveRecommendedModule(storyProgress, chapterNo, chapterMeta = null) {
    const chapterModule = String(chapterMeta?.recommendedModule || '').toLowerCase();
    if (chapterModule) return chapterModule;
    if (chapterNo % 5 === 0) return 'reading';
    const hinted = String(storyProgress?.recommended_module || '').toLowerCase();
    if (hinted && ['practice', 'shilianchang', 'cangjingge', 'mijing', 'reading', 'listening', 'speaking', 'writing'].includes(hinted)) {
        return hinted;
    }
    if (chapterNo < 6) return 'practice';
    if (chapterNo < 11) return 'shilianchang';
    return 'mijing';
}

function mainlineLabel(mainline) {
    const map = {
        chapter_1: '第一章·宗门初启',
        chapter_2: '第二章·山门试炼',
        chapter_3: '第三章·天命回响',
    };
    return map[mainline] || '主线修行';
}

function normalizeList(value) {
    if (!Array.isArray(value)) return [];
    const arr = value.map((item) => String(item ?? '').trim()).filter(Boolean);
    return Array.from(new Set(arr));
}

function normalizeMap(value) {
    if (!value || typeof value !== 'object') return {};
    const out = {};
    Object.entries(value).forEach(([key, val]) => {
        const safeKey = String(key || '').trim();
        if (!safeKey) return;
        out[safeKey] = val;
    });
    return out;
}

function normalizeDailyDestiny(value) {
    const source = value && typeof value === 'object' ? value : {};
    return {
        date: source.date || null,
        event_id: source.event_id || null,
        event_title: source.event_title || null,
        reward_hint: source.reward_hint || null,
    };
}

function normalizeWeeklyBranchWindow(value) {
    const source = value && typeof value === 'object' ? value : {};
    return {
        week_key: source.week_key || null,
        branch_ids: normalizeList(source.branch_ids),
    };
}

function getWeekKey(date = new Date()) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return toDateKey(d);
}

function hashNumber(text) {
    const str = String(text || '');
    let hash = 0;
    for (let i = 0; i < str.length; i += 1) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return hash;
}
