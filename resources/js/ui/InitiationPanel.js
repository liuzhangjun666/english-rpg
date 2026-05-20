import { getRealmDisplayName } from '../utils/cultivation.js';

// LevelUp 英语修仙 - 天机测试（25题自适应定级）
// 教研员工作包标准：词汇8+语法8+阅读5+综合4 = 25题，L1~L10均衡分布

const TIANJI_QUESTIONS = [
    // ── 词汇题 8题 (L1~L8各一题) ──
    { id: 'T-V01', diff: 1, type: 'vocab', question: '"apple" 的中文意思是？', options: { A: '苹果', B: '香蕉', C: '橘子', D: '葡萄' }, answer: 'A' },
    { id: 'T-V02', diff: 2, type: 'vocab', question: '"beautiful" 的中文意思是？', options: { A: '丑陋的', B: '美丽的', C: '高大的', D: '弱小的' }, answer: 'B' },
    { id: 'T-V03', diff: 3, type: 'vocab', question: '"The book is very _____（有趣的）." 选择正确单词', options: { A: 'interest', B: 'interesting', C: 'interested', D: 'interests' }, answer: 'B' },
    { id: 'T-V04', diff: 4, type: 'vocab', question: '"important" 的反义词是？', options: { A: 'unimportant', B: 'inimportant', C: 'disimportant', D: 'nonimportant' }, answer: 'A' },
    { id: 'T-V05', diff: 5, type: 'vocab', question: 'He _____ (成功) in passing the exam.', options: { A: 'success', B: 'successful', C: 'succeed', D: 'succeeded' }, answer: 'D' },
    { id: 'T-V06', diff: 6, type: 'vocab', question: 'The _____ (环境) here is very beautiful.', options: { A: 'environment', B: 'enviroment', C: 'environmant', D: 'envirnment' }, answer: 'A' },
    { id: 'T-V07', diff: 7, type: 'vocab', question: '"inevitable" 的中文意思是？', options: { A: '不可能的', B: '不可避免的', C: '不可想象的', D: '不可靠的' }, answer: 'B' },
    { id: 'T-V08', diff: 8, type: 'vocab', question: '"sophisticated" 的中文意思是？', options: { A: '简单的', B: '复杂的/精密的', C: '过时的', D: '便宜的' }, answer: 'B' },

    // ── 语法题 8题 (L1~L8各一题) ──
    { id: 'T-G01', diff: 1, type: 'grammar', question: 'She _____ a teacher.', options: { A: 'are', B: 'is', C: 'am', D: 'be' }, answer: 'B' },
    { id: 'T-G02', diff: 2, type: 'grammar', question: 'There _____ a book and two pens on the desk.', options: { A: 'is', B: 'are', C: 'have', D: 'has' }, answer: 'A' },
    { id: 'T-G03', diff: 3, type: 'grammar', question: 'I _____ breakfast at 7 o\'clock yesterday.', options: { A: 'have', B: 'has', C: 'had', D: 'having' }, answer: 'C' },
    { id: 'T-G04', diff: 4, type: 'grammar', question: '_____ the rain, we still went out.', options: { A: 'Because', B: 'Although', C: 'Despite', D: 'Since' }, answer: 'C' },
    { id: 'T-G05', diff: 5, type: 'grammar', question: 'If I _____ you, I would study harder.', options: { A: 'am', B: 'was', C: 'were', D: 'be' }, answer: 'C' },
    { id: 'T-G06', diff: 6, type: 'grammar', question: 'The man _____ is standing there is my teacher.', options: { A: 'who', B: 'whom', C: 'which', D: 'what' }, answer: 'A' },
    { id: 'T-G07', diff: 7, type: 'grammar', question: '_____ the meeting, he went home.', options: { A: 'Finished', B: 'Having finished', C: 'Finishing', D: 'To finish' }, answer: 'B' },
    { id: 'T-G08', diff: 8, type: 'grammar', question: 'Not until he came back _____ leave.', options: { A: 'I did', B: 'did I', C: 'I do', D: 'do I' }, answer: 'B' },

    // ── 阅读题 5题 (L3~L7各一题) ──
    { id: 'T-R01', diff: 3, type: 'reading', question: '文章首句"The weather was nice, so we decided to go to the beach." 问：天气如何？', options: { A: '下雨', B: '很好', C: '很冷', D: '刮风' }, answer: 'B' },
    { id: 'T-R02', diff: 4, type: 'reading', question: '"The main purpose of this passage is to..." 这种题考什么？', options: { A: '细节理解', B: '主旨大意', C: '词义猜测', D: '推理判断' }, answer: 'B' },
    { id: 'T-R03', diff: 5, type: 'reading', question: '"It can be inferred from the passage that..." 这种题考什么？', options: { A: '细节定位', B: '主旨概括', C: '推理判断', D: '作者态度' }, answer: 'C' },
    { id: 'T-R04', diff: 6, type: 'reading', question: '议论文中"However"后面的内容通常表示？', options: { A: '并列关系', B: '转折关系', C: '因果关系', D: '递进关系' }, answer: 'B' },
    { id: 'T-R05', diff: 7, type: 'reading', question: '考研阅读中"Which of the following is true according to the passage?"属于什么题型？', options: { A: '主旨题', B: '细节题', C: '推断题', D: '态度题' }, answer: 'B' },

    // ── 综合题 4题 (L4~L7各一题) ──
    { id: 'T-C01', diff: 4, type: 'comprehensive', question: '根据词根"port"(搬运)，"export"最可能的意思是？', options: { A: '进口', B: '出口', C: '运输', D: '报告' }, answer: 'B' },
    { id: 'T-C02', diff: 5, type: 'comprehensive', question: '根据语境："The exam was a piece of cake." 这句话的意思是？', options: { A: '考试有蛋糕吃', B: '考试很简单', C: '考试很甜', D: '考试很长' }, answer: 'B' },
    { id: 'T-C03', diff: 6, type: 'comprehensive', question: '以下哪句口语表达更地道？', options: { A: 'I very like it.', B: 'I like it very much.', C: 'I like very it.', D: 'I very much like it.' }, answer: 'B' },
    { id: 'T-C04', diff: 7, type: 'comprehensive', question: '"Some people believe that... Others argue that..." 这种段落结构属于？', options: { A: '举例论证', B: '对比论证', C: '因果论证', D: '数据论证' }, answer: 'B' },
];

const SCHOOL_GRADE_OPTIONS = [
    ['grade_1', '1年级'],
    ['grade_2', '2年级'],
    ['grade_3', '3年级'],
    ['grade_4', '4年级'],
    ['grade_5', '5年级'],
    ['grade_6', '6年级'],
    ['grade_7', '7年级'],
    ['grade_8', '8年级'],
    ['grade_9', '9年级'],
    ['grade_10', '10年级'],
    ['grade_11', '11年级'],
    ['grade_12', '12年级'],
    ['college', '本科阶段'],
    ['exam', '考研 / 英专'],
    ['graduate', '硕士 / 博士'],
    ['advanced', '留学 / 考试 / 发表'],
];

const GRADE_GROUP_RULES = {
    lower_primary: {
        label: '小学低年级',
        grades: ['grade_1', 'grade_2', 'grade_3'],
        tiers: {
            weak: { realm: 'L1', realmStage: 1, progressIndex: 0, desc: '基础薄弱，从当前年级对应的最低境界起步，先稳住字母与基础词。' },
            medium: { realm: 'L1', realmStage: 2, progressIndex: 1, desc: '基础中等，从当前年级区间的中段起步，循序渐进巩固。' },
            strong: { realm: 'L1', realmStage: 3, progressIndex: 2, desc: '基础良好，从当前年级对应的最高起点开始修炼。' },
        },
    },
    upper_primary: {
        label: '小学高年级',
        grades: ['grade_4', 'grade_5', 'grade_6'],
        tiers: {
            weak: { realm: 'L1', realmStage: 4, progressIndex: 3, desc: '基础薄弱，从小学高年级对应的最低境界开始，先补词汇与简单句。' },
            medium: { realm: 'L1', realmStage: 6, progressIndex: 5, desc: '基础中等，从小学高年级的中段起步，兼顾阅读与拼词。' },
            strong: { realm: 'L1', realmStage: 9, progressIndex: 8, desc: '基础良好，从小学高年级对应的最高境界起步。' },
        },
    },
    junior: {
        label: '初中',
        grades: ['grade_7', 'grade_8', 'grade_9'],
        tiers: {
            weak: { realm: 'Z1', realmStage: 1, progressIndex: 9, desc: '基础薄弱，从初中对应的筑基起点最低层开始，先补语法与基础阅读。' },
            medium: { realm: 'Z1', realmStage: 3, progressIndex: 13, desc: '基础中等，从初中区间第3层起步，逐步把句型、时态和阅读做扎实。' },
            strong: { realm: 'Z1', realmStage: 5, progressIndex: 17, desc: '基础良好，从初中对应境界的第5层开始，直接进入更完整的语法与阅读修炼。' },
        },
    },
    senior: {
        label: '高中',
        grades: ['grade_10', 'grade_11', 'grade_12'],
        tiers: {
            weak: { realm: 'J1', realmStage: 1, progressIndex: 18, desc: '基础薄弱，从高中对应的金丹起点最低层开始，先把长难句与基础写作框架补稳。' },
            medium: { realm: 'J1', realmStage: 3, progressIndex: 22, desc: '基础中等，从高中区间第3层起步，重点强化长阅读、语法结构与表达。' },
            strong: { realm: 'J1', realmStage: 5, progressIndex: 26, desc: '基础良好，从高中对应境界的第5层开始，直接进入更高强度训练。' },
        },
    },
    college_non_english: {
        label: '大学',
        grades: ['college'],
        tiers: {
            weak: { realm: 'Y1', realmStage: 1, progressIndex: 21, desc: '基础薄弱，从大学对应的元婴起点最低层开始，先补四六级词汇、听力与基础写作。' },
            medium: { realm: 'Y1', realmStage: 3, progressIndex: 24, desc: '基础中等，从大学区间第3层起步，逐步拉升听说读写综合能力。' },
            strong: { realm: 'Y1', realmStage: 5, progressIndex: 26, desc: '基础良好，从大学对应境界的第5层开始，可直接进入更高强度综合训练。' },
        },
    },
    college_english: {
        label: '考研 / 英专',
        grades: ['exam'],
        tiers: {
            weak: { realm: 'H1', realmStage: 1, progressIndex: 22, desc: '基础薄弱，从考研 / 英专对应的化神起点最低层开始，先把学术阅读和长难句根基补稳。' },
            medium: { realm: 'H1', realmStage: 3, progressIndex: 24, desc: '基础中等，从考研 / 英专区间第3层起步，重点强化翻译、学术阅读与写作。' },
            strong: { realm: 'H1', realmStage: 5, progressIndex: 26, desc: '基础良好，从考研 / 英专对应境界的第5层开始，直接承接高强度训练。' },
        },
    },
    graduate: {
        label: '研究生',
        grades: ['graduate'],
        tiers: {
            weak: { realm: 'X1', realmStage: 1, progressIndex: 23, desc: '基础薄弱，从研究生对应境界最低层开始，优先补齐学术阅读与写作根基。' },
            medium: { realm: 'X1', realmStage: 3, progressIndex: 25, desc: '基础中等，从研究生区间第3层起步，逐步强化学术表达与汇报能力。' },
            strong: { realm: 'X1', realmStage: 5, progressIndex: 26, desc: '基础良好，从研究生对应境界第5层开始，直接进入更高强度训练。' },
        },
    },
    advanced: {
        label: '高阶挑战',
        grades: ['advanced'],
        tiers: {
            weak: { realm: 'U1', realmStage: 1, progressIndex: 24, desc: '基础薄弱，从高阶挑战对应境界最低层开始，先稳住高难表达与学术听读。' },
            medium: { realm: 'U1', realmStage: 3, progressIndex: 25, desc: '基础中等，从高阶区间第3层起步，持续提升高难任务处理能力。' },
            strong: { realm: 'U1', realmStage: 5, progressIndex: 26, desc: '基础良好，从高阶对应境界第5层开始，直接进入最强挑战内容。' },
        },
    },
};

export class InitiationPanel {
    constructor(game) {
        this.game = game;
        this.currentIndex = 0;
        this.correctCount = 0;
        this.answers = {};
        this.currentLevel = 5; // 从L5(中等难度)开局
        this.convergedLevel = 5;
        this.levelHits = {}; // 统计各级答题情况
        this.schoolGrade = '';
    }

    start() {
        this.currentIndex = 0;
        this.correctCount = 0;
        this.answers = {};
        this.currentLevel = 5;
        this.convergedLevel = 5;
        this.levelHits = {};
        this.schoolGrade = String(this.game.store.getState().user?.school_grade || '');

        // 初始排序：从中级难度开始，自适应调整
        this.questions = [...TIANJI_QUESTIONS].sort((a, b) => Math.abs(a.diff - 5) - Math.abs(b.diff - 5));

        this.game.scene.switchTo('initiation');
        this.game.ui.hideAllPanels();
        this.showHermesIntro();
    }

    /** 自适应定级核心算法：五步阶梯 */
    getAdaptiveQuestion() {
        // 策略：从剩余题目中选最接近当前难度的
        const remaining = this.questions.slice(this.currentIndex);
        if (remaining.length === 0) return null;

        // 找与当前难度最匹配的题
        let best = remaining[0];
        let bestDiff = Math.abs(best.diff - this.currentLevel);
        for (const q of remaining) {
            const d = Math.abs(q.diff - this.currentLevel);
            if (d < bestDiff) { best = q; bestDiff = d; }
        }
        return best;
    }

    showHermesIntro() {
        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.id = 'tianji-panel';
        panel.innerHTML = `
            <div class="panel-title">☯ 天机测试</div>
            <div style="text-align:center;padding:16px 0;line-height:1.8;color:var(--parchment-dark);font-size:14px;">
                <p>"善。今日有缘至此，且让老夫测你英语根骨。"</p>
                <p style="margin-top:12px;">共 25 题，自适应难度。</p>
                <p>答对升难，答错降易，五步定位你的真实水平。</p>
                <p style="margin-top:8px;color:var(--gold-light);">成绩越好，起步境界越高！</p>
            </div>
            <div class="input-group" style="margin-bottom:12px;">
                <label>当前年级 / 学习阶段</label>
                <select id="initiation-school-grade">
                    <option value="">-- 请选择 --</option>
                    ${this.renderSchoolGradeOptions(this.schoolGrade)}
                </select>
            </div>
            <button class="btn btn-primary" id="tianji-start-btn">开始天机测试</button>
        `;
        this.game.ui.overlay.appendChild(panel);
        this.game.ui.showHermesBubble('善，今日有缘人至此。让老夫用天机测试测你根骨。', 8000);
        document.getElementById('tianji-start-btn').addEventListener('click', async () => {
            const schoolGrade = String(document.getElementById('initiation-school-grade')?.value || '').trim();
            if (!schoolGrade) {
                this.game.ui.showHermesBubble('请先选择当前年级或学习阶段，再开始定级。');
                return;
            }
            this.schoolGrade = schoolGrade;
            await this.syncSchoolGrade(schoolGrade);
            panel.remove();
            this.showQuestion();
        });
    }

    renderSchoolGradeOptions(selectedValue = '') {
        return SCHOOL_GRADE_OPTIONS.map(([value, label]) => (
            `<option value="${value}" ${selectedValue === value ? 'selected' : ''}>${label}</option>`
        )).join('');
    }

    getSchoolGradeGroup(schoolGrade) {
        const grade = String(schoolGrade || '').trim();
        return Object.values(GRADE_GROUP_RULES).find((rule) => rule.grades.includes(grade)) || GRADE_GROUP_RULES.upper_primary;
    }

    getFoundationTier(avgLevel, accuracy) {
        if (avgLevel <= 3 || accuracy < 45) return 'weak';
        if (avgLevel >= 7 || accuracy >= 75) return 'strong';
        return 'medium';
    }

    formatCurrentRealmTitle(realm, realmStage) {
        return getRealmDisplayName(realm, realmStage).replace('期 · ', '');
    }

    getPlacementByGradeAndTest(schoolGrade, avgLevel, accuracy) {
        const group = this.getSchoolGradeGroup(schoolGrade);
        const tier = this.getFoundationTier(avgLevel, accuracy);
        const tierConfig = group.tiers[tier] || group.tiers.medium;
        const realm = tierConfig.realm || 'L1';
        const currentRealm = this.formatCurrentRealmTitle(realm, tierConfig.realmStage);
        return {
            schoolStageLabel: group.label,
            foundationTier: tier,
            foundationLabel: tier === 'weak' ? '基础薄弱' : (tier === 'strong' ? '基础良好' : '基础中等'),
            realm,
            realmStage: tierConfig.realmStage,
            currentRealm,
            title: currentRealm,
            label: currentRealm,
            desc: tierConfig.desc,
            progressIndex: tierConfig.progressIndex,
        };
    }

    showQuestion() {
        const q = this.questions[this.currentIndex];
        if (!q) { this.showResult(); return; }
        const total = TIANJI_QUESTIONS.length;
        const savedAnswer = this.answers[q.id] || null;

        const diffLabel = ['', '基础', '初级', '初阶', '中级', '中高级', '高级', '高阶', '精深'][q.diff] || '未知';

        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.id = 'tianji-panel';
        panel.style.maxWidth = '520px';
        panel.innerHTML = `
            <div class="practice-header">
                <span class="practice-title">☯ 天机测试 ${this.currentIndex + 1}/${total}</span>
                <span style="font-size:12px;color:var(--parchment-dark);">难度:${diffLabel} · ✓ ${this.correctCount}题</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width:${(this.currentIndex / total) * 100}%"></div>
            </div>
            <div style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;margin-bottom:8px;
                background:${q.type === 'vocab' ? 'rgba(74,144,217,0.2)' : q.type === 'grammar' ? 'rgba(78,192,122,0.2)' : q.type === 'reading' ? 'rgba(212,168,67,0.2)' : 'rgba(240,214,138,0.2)'};
                color:${q.type === 'vocab' ? '#4a90d9' : q.type === 'grammar' ? '#4ec07a' : q.type === 'reading' ? '#d4a843' : '#f0d68a'};">
                ${q.type === 'vocab' ? '📖词汇' : q.type === 'grammar' ? '🔮语法' : q.type === 'reading' ? '📚阅读' : '🎯综合'}
            </div>
            <div class="question-text">${this.game.ui.escapeHtml(q.question)}</div>
            <div class="options-container">
                ${Object.entries(q.options).map(([k, v]) =>
            `<div class="option-btn ${savedAnswer === k ? 'selected' : ''}" data-value="${this.game.ui.escapeHtml(k)}">
                        <span class="option-label">${this.game.ui.escapeHtml(k)}</span>
                        <span class="option-text">${this.game.ui.escapeHtml(v)}</span>
                    </div>`
        ).join('')}
            </div>
            <button class="btn btn-primary" id="tianji-next-btn" ${savedAnswer ? '' : 'disabled'}>
                ${this.currentIndex < total - 1 ? '下一题 →' : '查看结果'}
            </button>
        `;
        this.game.ui.overlay.appendChild(panel);

        panel.querySelectorAll('.option-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                panel.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                this.answers[q.id] = btn.dataset.value;
                document.getElementById('tianji-next-btn').disabled = false;
            });
        });

        document.getElementById('tianji-next-btn').addEventListener('click', () => {
            const isCorrect = this.answers[q.id] === q.answer;
            if (isCorrect) this.correctCount++;

            // 自适应调难度：答对升一级，答错降一级，不越界
            this.currentLevel = Math.max(1, Math.min(10, this.currentLevel + (isCorrect ? 1 : -1)));
            // 记录收敛水平（加权平均最近5题）
            this.levelHits[this.currentIndex] = this.currentLevel;

            panel.remove();
            this.currentIndex++;
            this.showQuestion();
        });
    }

    showResult() {
        // 计算收敛难度：取后10题的平均难度
        const recentLevels = Object.values(this.levelHits).slice(-10);
        const avgLevel = recentLevels.length > 0
            ? Math.round(recentLevels.reduce((a, b) => a + b, 0) / recentLevels.length)
            : 3;
        const accuracy = Math.round((this.correctCount / Math.max(1, TIANJI_QUESTIONS.length)) * 100);

        const placement = this.getPlacementByGradeAndTest(this.schoolGrade, avgLevel, accuracy);

        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.id = 'tianji-result';
        panel.innerHTML = `
            <div class="panel-title">🎉 入宗成功</div>
            <div style="text-align:center;">
                <div style="font-size:38px;color:var(--gold);font-weight:bold;">${this.correctCount}/${TIANJI_QUESTIONS.length}</div>
                <div style="font-size:13px;color:var(--parchment-dark);margin-top:4px;">${placement.schoolStageLabel} · ${placement.foundationLabel} · 收敛难度 Lv.${avgLevel}</div>
                <div style="margin-top:16px;padding:16px;background:rgba(212,168,67,0.1);border-radius:12px;border:1px solid rgba(212,168,67,0.2);">
                    <div style="font-size:20px;color:var(--gold);font-family:var(--font-title);">${placement.title}</div>
                    <div style="font-size:13px;color:var(--gold-light);margin-top:8px;">${placement.desc}</div>
                    <div style="font-size:12px;color:var(--parchment-dark);margin-top:8px;">起点依据：${placement.schoolStageLabel} + ${placement.foundationLabel}</div>
                </div>
            </div>
            <div class="hermes-judge" style="margin-top:16px;">
                ${placement.foundationTier === 'strong'
                ? '善！根基良好，已按你当前年级对应的最高起点入门。'
                : (placement.foundationTier === 'medium'
                    ? '不错！基础中等，已落在当前年级区间的中间起点。'
                    : '先稳住根基。已按当前年级对应的最低起点开始修炼。')}
            </div>
            <button class="btn btn-primary" id="tianji-done-btn">踏入宗门 · 开始修炼</button>
        `;
        this.game.ui.overlay.appendChild(panel);

        // 更新用户境界到后端
        this.updateUserPlacement(placement);

        document.getElementById('tianji-done-btn').addEventListener('click', () => {
            panel.remove();
            const bubble = document.getElementById('hermes-bubble');
            if (bubble) bubble.remove();
            this.progressTutorialStep(1);
            this.game.enterHall();
            setTimeout(() => {
                const bubbleMessage = placement.foundationTier === 'strong'
                    ? `根基不错，你将从 ${placement.currentRealm} 开始修炼。`
                    : (placement.foundationTier === 'medium'
                        ? `基础稳当，你将从 ${placement.currentRealm} 起步，循序精进。`
                        : `先稳住根基，你将从 ${placement.currentRealm} 开始补齐基础。`);
                this.game.ui.showHermesBubble(bubbleMessage, 6000);
            }, 1000);
        });
    }

    async syncSchoolGrade(schoolGrade) {
        const user = this.game.store.getState().user;
        if (!user) return;
        this.game.store.updateUser({ school_grade: schoolGrade });
        try {
            await this.game.api.put('/user/profile', { school_grade: schoolGrade });
        } catch {
            // keep local state on patch failure
        }
    }

    applyStartingProgress(progressIndex) {
        const startIndex = Math.max(0, Number(progressIndex || 0));
        ['vocab', 'grammar', 'listening', 'speaking', 'writing'].forEach((type) => {
            localStorage.setItem(`levelup_progress_${type}`, String(startIndex));
        });
    }

    async updateUserPlacement(placement) {
        const user = this.game.store.getState().user;
        if (user) {
            this.game.store.updateUser({
                realm: placement.realm,
                realm_stage: placement.realmStage,
                current_realm: placement.currentRealm,
                school_grade: this.schoolGrade,
            });
        }
        this.applyStartingProgress(placement.progressIndex);
        try {
            await this.game.api.put('/user/profile', {
                realm: placement.realm,
                realm_stage: placement.realmStage,
                current_realm: placement.currentRealm,
                school_grade: this.schoolGrade,
            });
        } catch {
            // keep local state on patch failure
        }
    }

    async progressTutorialStep(step) {
        const user = this.game.store.getState().user;
        if (!user) return;
        const currentStep = Number(user.tutorial_step || 0);
        if (step <= currentStep) return;

        this.game.store.updateUser({ tutorial_step: step });
        try {
            await this.game.api.patch('/user/tutorial-step', { tutorial_step: step });
        } catch {
            // keep local state on patch failure
        }
    }
}
