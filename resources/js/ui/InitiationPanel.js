// LevelUp 英语修仙 - 天机测试（25题自适应定级）
// 教研员工作包标准：词汇8+语法8+阅读5+综合4 = 25题，L1~L10均衡分布

const TIANJI_QUESTIONS = [
    // ── 词汇题 8题 (L1~L8各一题) ──
    { id:'T-V01', diff:1, type:'vocab', question:'"apple" 的中文意思是？', options:{A:'苹果',B:'香蕉',C:'橘子',D:'葡萄'}, answer:'A' },
    { id:'T-V02', diff:2, type:'vocab', question:'"beautiful" 的中文意思是？', options:{A:'丑陋的',B:'美丽的',C:'高大的',D:'弱小的'}, answer:'B' },
    { id:'T-V03', diff:3, type:'vocab', question:'"The book is very _____（有趣的）." 选择正确单词', options:{A:'interest',B:'interesting',C:'interested',D:'interests'}, answer:'B' },
    { id:'T-V04', diff:4, type:'vocab', question:'"important" 的反义词是？', options:{A:'unimportant',B:'inimportant',C:'disimportant',D:'nonimportant'}, answer:'A' },
    { id:'T-V05', diff:5, type:'vocab', question:'He _____ (成功) in passing the exam.', options:{A:'success',B:'successful',C:'succeed',D:'succeeded'}, answer:'D' },
    { id:'T-V06', diff:6, type:'vocab', question:'The _____ (环境) here is very beautiful.', options:{A:'environment',B:'enviroment',C:'environmant',D:'envirnment'}, answer:'A' },
    { id:'T-V07', diff:7, type:'vocab', question:'"inevitable" 的中文意思是？', options:{A:'不可能的',B:'不可避免的',C:'不可想象的',D:'不可靠的'}, answer:'B' },
    { id:'T-V08', diff:8, type:'vocab', question:'"sophisticated" 的中文意思是？', options:{A:'简单的',B:'复杂的/精密的',C:'过时的',D:'便宜的'}, answer:'B' },

    // ── 语法题 8题 (L1~L8各一题) ──
    { id:'T-G01', diff:1, type:'grammar', question:'She _____ a teacher.', options:{A:'are',B:'is',C:'am',D:'be'}, answer:'B' },
    { id:'T-G02', diff:2, type:'grammar', question:'There _____ a book and two pens on the desk.', options:{A:'is',B:'are',C:'have',D:'has'}, answer:'A' },
    { id:'T-G03', diff:3, type:'grammar', question:'I _____ breakfast at 7 o\'clock yesterday.', options:{A:'have',B:'has',C:'had',D:'having'}, answer:'C' },
    { id:'T-G04', diff:4, type:'grammar', question:'_____ the rain, we still went out.', options:{A:'Because',B:'Although',C:'Despite',D:'Since'}, answer:'C' },
    { id:'T-G05', diff:5, type:'grammar', question:'If I _____ you, I would study harder.', options:{A:'am',B:'was',C:'were',D:'be'}, answer:'C' },
    { id:'T-G06', diff:6, type:'grammar', question:'The man _____ is standing there is my teacher.', options:{A:'who',B:'whom',C:'which',D:'what'}, answer:'A' },
    { id:'T-G07', diff:7, type:'grammar', question:'_____ the meeting, he went home.', options:{A:'Finished',B:'Having finished',C:'Finishing',D:'To finish'}, answer:'B' },
    { id:'T-G08', diff:8, type:'grammar', question:'Not until he came back _____ leave.', options:{A:'I did',B:'did I',C:'I do',D:'do I'}, answer:'B' },

    // ── 阅读题 5题 (L3~L7各一题) ──
    { id:'T-R01', diff:3, type:'reading', question:'文章首句"The weather was nice, so we decided to go to the beach." 问：天气如何？', options:{A:'下雨',B:'很好',C:'很冷',D:'刮风'}, answer:'B' },
    { id:'T-R02', diff:4, type:'reading', question:'"The main purpose of this passage is to..." 这种题考什么？', options:{A:'细节理解',B:'主旨大意',C:'词义猜测',D:'推理判断'}, answer:'B' },
    { id:'T-R03', diff:5, type:'reading', question:'"It can be inferred from the passage that..." 这种题考什么？', options:{A:'细节定位',B:'主旨概括',C:'推理判断',D:'作者态度'}, answer:'C' },
    { id:'T-R04', diff:6, type:'reading', question:'议论文中"However"后面的内容通常表示？', options:{A:'并列关系',B:'转折关系',C:'因果关系',D:'递进关系'}, answer:'B' },
    { id:'T-R05', diff:7, type:'reading', question:'考研阅读中"Which of the following is true according to the passage?"属于什么题型？', options:{A:'主旨题',B:'细节题',C:'推断题',D:'态度题'}, answer:'B' },

    // ── 综合题 4题 (L4~L7各一题) ──
    { id:'T-C01', diff:4, type:'comprehensive', question:'根据词根"port"(搬运)，"export"最可能的意思是？', options:{A:'进口',B:'出口',C:'运输',D:'报告'}, answer:'B' },
    { id:'T-C02', diff:5, type:'comprehensive', question:'根据语境："The exam was a piece of cake." 这句话的意思是？', options:{A:'考试有蛋糕吃',B:'考试很简单',C:'考试很甜',D:'考试很长'}, answer:'B' },
    { id:'T-C03', diff:6, type:'comprehensive', question:'以下哪句口语表达更地道？', options:{A:'I very like it.',B:'I like it very much.',C:'I like very it.',D:'I very much like it.'}, answer:'B' },
    { id:'T-C04', diff:7, type:'comprehensive', question:'"Some people believe that... Others argue that..." 这种段落结构属于？', options:{A:'举例论证',B:'对比论证',C:'因果论证',D:'数据论证'}, answer:'B' },
];

// 难度→境界映射
// 难度→境界映射（用自然意象代替等级标签，无歧视性）
const DIFF_TO_REALM = [
    { maxDiff:2, realm:'L1', stage:1, title:'练气初·一重',   label:'灵芽境', desc:'初入道途，从最基础开始修行，根基将更加稳固。' },
    { maxDiff:3, realm:'L1', stage:2, title:'练气初·二重',   label:'青苗境', desc:'有基础感知，从练气初二重开始稳步提升。' },
    { maxDiff:4, realm:'L1', stage:3, title:'练气初·三重',   label:'翠竹境', desc:'根基初见成效，从练气初三重开始修炼。' },
    { maxDiff:5, realm:'L2', stage:1, title:'练气中·一重',   label:'灵泉境', desc:'已有不错基础，可直接从中段开始修炼。' },
    { maxDiff:6, realm:'L3', stage:1, title:'练气后·一重',   label:'碧潭境', desc:'水平扎实，从练气后段开始，向筑基迈进。' },
    { maxDiff:7, realm:'L4', stage:1, title:'筑基·前期',     label:'流云境', desc:'已有筑基潜质，直接进入筑基期修炼！' },
    { maxDiff:8, realm:'L5', stage:1, title:'筑基·中期',     label:'皓月境', desc:'筑基中段实力，可直接挑战更高难度的内容。' },
    { maxDiff:9, realm:'J1', stage:1, title:'金丹·前期',     label:'星辰境', desc:'已具备金丹期实力，可越级挑战高阶内容！' },
    { maxDiff:10, realm:'Y1', stage:1, title:'元婴·前期',    label:'天光境', desc:'天赋异禀，直接进入元婴期修炼！未来不可限量。' },
];

export class InitiationPanel {
    constructor(game) {
        this.game = game;
        this.currentIndex = 0;
        this.correctCount = 0;
        this.answers = {};
        this.currentLevel = 5; // 从L5(中等难度)开局
        this.convergedLevel = 5;
        this.levelHits = {}; // 统计各级答题情况
    }

    start() {
        this.currentIndex = 0;
        this.correctCount = 0;
        this.answers = {};
        this.currentLevel = 5;
        this.convergedLevel = 5;
        this.levelHits = {};

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
            <button class="btn btn-primary" id="tianji-start-btn">开始天机测试</button>
        `;
        this.game.ui.overlay.appendChild(panel);
        this.game.ui.showHermesBubble('善，今日有缘人至此。让老夫用天机测试测你根骨。', 8000);
        document.getElementById('tianji-start-btn').addEventListener('click', () => { panel.remove(); this.showQuestion(); });
    }

    showQuestion() {
        const q = this.questions[this.currentIndex];
        if (!q) { this.showResult(); return; }
        const total = TIANJI_QUESTIONS.length;
        const savedAnswer = this.answers[q.id] || null;

        const diffLabel = ['','基础','初级','初阶','中级','中高级','高级','高阶','精深'][q.diff] || '未知';

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
                <div class="progress-fill" style="width:${(this.currentIndex/total)*100}%"></div>
            </div>
            <div style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;margin-bottom:8px;
                background:${q.type==='vocab'?'rgba(74,144,217,0.2)':q.type==='grammar'?'rgba(78,192,122,0.2)':q.type==='reading'?'rgba(212,168,67,0.2)':'rgba(240,214,138,0.2)'};
                color:${q.type==='vocab'?'#4a90d9':q.type==='grammar'?'#4ec07a':q.type==='reading'?'#d4a843':'#f0d68a'};">
                ${q.type==='vocab'?'📖词汇':q.type==='grammar'?'🔮语法':q.type==='reading'?'📚阅读':'🎯综合'}
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

        // 映射到境界
        const matchedLevel = DIFF_TO_REALM.find(l => avgLevel <= l.maxDiff) || DIFF_TO_REALM[0];

        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.id = 'tianji-result';
        panel.innerHTML = `
            <div class="panel-title">🎉 入宗成功</div>
            <div style="text-align:center;">
                <div style="font-size:38px;color:var(--gold);font-weight:bold;">${this.correctCount}/${TIANJI_QUESTIONS.length}</div>
                <div style="font-size:13px;color:var(--parchment-dark);margin-top:4px;">收敛难度 Lv.${avgLevel} · ${matchedLevel.label}</div>
                <div style="margin-top:16px;padding:16px;background:rgba(212,168,67,0.1);border-radius:12px;border:1px solid rgba(212,168,67,0.2);">
                    <div style="font-size:20px;color:var(--gold);font-family:var(--font-title);">${matchedLevel.title}</div>
                    <div style="font-size:13px;color:var(--gold-light);margin-top:8px;">${matchedLevel.desc}</div>
                </div>
            </div>
            <div class="hermes-judge" style="margin-top:16px;">
                ${avgLevel >= 8 ? '善！已有高阶修为，可直接挑战高阶修炼。' : avgLevel >= 6 ? '不错！已有筑基基础，可从中段起步。' : avgLevel >= 4 ? '根基扎实，从基础开始循序渐进即可。' : '初入道途，从最基础开始，厚积薄发。'}
            </div>
            <button class="btn btn-primary" id="tianji-done-btn">踏入宗门 · 开始修炼</button>
        `;
        this.game.ui.overlay.appendChild(panel);

        // 更新用户境界到后端
        this.updateUserRealm(matchedLevel);

        document.getElementById('tianji-done-btn').addEventListener('click', () => {
            panel.remove();
            const bubble = document.getElementById('hermes-bubble');
            if (bubble) bubble.remove();
            this.progressTutorialStep(1);
            this.game.enterHall();
            setTimeout(() => {
                const msgs = {
                    '灵芽境':'初入道途，从基础开始，一步一个脚印。灵脉已开，去练功房看看吧。',
                    '青苗境':'迈出了第一步。从练功房开始稳步修炼，路还很长。',
                    '翠竹境':'根基初见成效。从练功房高阶关卡开始吧。',
                    '灵泉境':'已有不错基础，可直接挑战更高难度的关卡。',
                    '碧潭境':'水平扎实！可挑战练气后期关卡，向筑基迈进。',
                    '流云境':'已有筑基潜质，直接进入筑基期修炼。',
                    '皓月境':'筑基中段实力。可挑战筑基中期高阶内容。',
                    '星辰境':'金丹期实力，可挑战高阶修炼内容。',
                    '天光境':'元婴期实力，可直接进入高阶修炼。未来不可限量。',
                };
                this.game.ui.showHermesBubble(msgs[matchedLevel.label] || '欢迎入宗！开始修炼吧。', 6000);
            }, 1000);
        });
    }

    async updateUserRealm(level) {
        const user = this.game.store.getState().user;
        if (user) {
            this.game.store.updateUser({
                realm: level.realm,
                realm_stage: level.stage,
                initiation_completed_at: new Date().toISOString(),
            });
        }
        try {
            await this.game.api.put('/user/profile', {
                realm: level.realm,
                realm_stage: level.stage,
                initiation_completed: true,
            });
        } catch (e) { /* 静默 */ }
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
