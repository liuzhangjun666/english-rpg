// LevelUp 英语修仙 - 答题面板（即时反馈+连击版）
import herbIcon from '../../assets/images/herb_icon.png';

export class PracticePanel {
    constructor(game) {
        this.game = game;
        this.container = null;
        this.currentLevel = null;
        this.currentType = null;
        this.questions = [];
        this.currentIndex = 0;
        this.answers = {};
        this.selectedOption = null;
        this.combo = 0;
        this.maxCombo = 0;
    }

    /** 打开关卡选择列表 */
    showLevelSelect(type) {
        this.game.ui.hideAllPanels();
        this.currentLevel = null;
        this.combo = 0;
        this.maxCombo = 0;

        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.id = 'level-select-panel';
        panel.style.maxWidth = '480px';
        panel.style.maxHeight = '80vh';
        panel.style.overflowY = 'auto';
        panel.innerHTML = `
            <div class="panel-title">${type === 'vocab' ? '📖 采药识灵' : '🔮 基础功法'}</div>
            <div class="level-grid" id="level-grid"></div>
            <button class="btn btn-secondary" id="level-select-back" style="margin-top:12px;">返回宗门</button>
        `;
        this.game.ui.overlay.appendChild(panel);

        const grid = document.getElementById('level-grid');
        const realms = ['L1', 'L2', 'L3'];

        realms.forEach(realm => {
            const title = document.createElement('div');
            title.className = 'level-realm-title';
            title.textContent = this.game.ui.getRealmName(realm);
            grid.appendChild(title);

            for (let s = 1; s <= 9; s++) {
                const stage = String(s).padStart(2, '0');
                const levelId = `${realm}-${stage}`;
                const btn = document.createElement('div');
                btn.className = 'level-card';
                btn.dataset.level = levelId;
                btn.dataset.type = type;
                btn.innerHTML = `
                    <div class="level-card-name">第${stage}关</div>
                    <div class="level-card-info">${type === 'vocab' ? s <= 3 ? '15题' : s <= 6 ? '18题' : '20题' : '10题'}</div>
                `;
                btn.addEventListener('click', () => this.startLevel(type, levelId));
                grid.appendChild(btn);
            }
        });

        document.getElementById('level-select-back').addEventListener('click', () => {
            panel.remove();
            this.game.enterHall();
        });
    }

    /** 开始一关的答题 */
    async startLevel(type, levelId) {
        this.game.ui.showLoading('加载灵草题库...');
        this.currentType = type;
        this.currentLevel = levelId;
        this.currentIndex = 0;
        this.answers = {};
        this.combo = 0;
        this.maxCombo = 0;

        const [realm, stage] = levelId.split('-');
        const res = await this.game.api.get(`/${type}/questions?level=${realm}&stage=${stage}`);

        this.game.ui.hideLoading();

        if (!res.success) {
            this.game.ui.showHermesBubble(res.message || '该关卡暂无题目');
            return;
        }

        this.questions = res.data.questions;
        const cost = res.data.spirit_cost || this.questions.length;

        // 检查灵力
        const user = this.game.store.getState().user;
        if (user && user.spirit_power < cost) {
            this.game.ui.showHermesBubble(`灵力不足（当前${user.spirit_power}，需要${cost}），请明日再来修炼。`);
            return;
        }

        // 灵力消耗确认弹窗
        const confirmPanel = document.createElement('div');
        confirmPanel.className = 'panel';
        confirmPanel.id = 'spirit-confirm';
        confirmPanel.style.maxWidth = '380px';
        confirmPanel.innerHTML = `
            <div class="panel-title">准备修炼</div>
            <div style="text-align:center;color:var(--parchment-dark);font-size:14px;line-height:2;margin:12px 0;">
                <div>关口：${type === 'vocab' ? '采药识灵' : '基础功法'} · ${levelId}</div>
                <div>题数：${this.questions.length}题</div>
                <div>消耗灵力：<span style="color:var(--spirit-blue);font-weight:bold;">💧 ${cost}</span>
                    ${res.data.demon_injected ? `<span style="color:var(--gold);font-size:12px;">（含${res.data.demon_injected}心魔题，不扣灵力）</span>` : ''}
                </div>
                <div style="margin-top:8px;font-size:12px;">当前灵力：💧 ${user?.spirit_power || 0}</div>
            </div>
            <button class="btn btn-primary" id="spirit-confirm-yes">开始修炼</button>
            <button class="btn btn-secondary" id="spirit-confirm-no" style="margin-top:8px;">返回</button>
        `;
        this.game.ui.overlay.appendChild(confirmPanel);

        document.getElementById('spirit-confirm-yes').addEventListener('click', () => {
            confirmPanel.remove();
            const selectPanel = document.getElementById('level-select-panel');
            if (selectPanel) selectPanel.remove();
            this.renderQuestion();
            this.game.store.startLevel(type, realm, stage, this.questions);
        });
        document.getElementById('spirit-confirm-no').addEventListener('click', () => { confirmPanel.remove(); });
    }

    /** 渲染当前题目（即时反馈版） */
    renderQuestion() {
        const existing = document.getElementById('practice-panel');
        if (existing) existing.remove();

        const q = this.questions[this.currentIndex];
        if (!q) return;
        const total = this.questions.length;
        const isDemon = q._is_demon;
        const hasFeedback = this._feedbackShown; // 当前题是否已作答+显示反馈

        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.id = 'practice-panel';
        panel.style.maxWidth = '520px';
        panel.innerHTML = `
            <div class="practice-header">
                <span class="practice-title"><img src="${herbIcon}" class="herb-icon"> ${this.currentLevel} ${isDemon ? '🧘' : ''}</span>
                <span class="practice-progress">${this.currentIndex + 1}/${total}</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width:${(this.currentIndex / total) * 100}%"></div>
            </div>
            ${this.combo >= 3 ? `<div class="combo-display">🔥 ${this.combo} 连击</div>` : ''}
            <div class="question-text">${this.game.ui.escapeHtml(q.question)}</div>
            <div class="options-container" id="options-container">
                ${this.renderOptions(q.options, null)}
            </div>
            <div class="practice-actions">
                <button class="btn btn-secondary btn-sm" id="practice-back-btn">退出</button>
                <button class="btn btn-primary btn-sm" id="practice-next-btn" disabled>
                    ${this.currentIndex < total - 1 ? '下一题 →' : '查看结果'}
                </button>
            </div>
        `;
        this.game.ui.overlay.appendChild(panel);

        // 选项点击 → 即时反馈
        const optionBtns = panel.querySelectorAll('.option-btn');
        optionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                if (this._feedbackShown) return; // 已作答，不能改
                optionBtns.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');

                const selected = btn.dataset.value;
                const correct = selected === q.correct_answer;
                this.answers[q.question_id] = selected;
                this.game.store.answerQuestion(q.question_id, selected);

                // 即时反馈：正确绿闪，错误红闪
                optionBtns.forEach(b => b.style.pointerEvents = 'none');
                if (correct) {
                    btn.classList.add('answer-correct');
                    this.combo++;
                    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
                    // 显示连击特效
                    if (this.combo >= 3) {
                        this.showComboFx(this.combo);
                    }
                } else {
                    btn.classList.add('answer-wrong');
                    this.combo = 0; // 连击中断
                    // 显示正确答案
                    optionBtns.forEach(b => {
                        if (b.dataset.value === q.correct_answer) b.classList.add('answer-correct');
                    });
                }
                this._feedbackShown = true;
                document.getElementById('practice-next-btn').disabled = false;
            });
        });

        // 下一题/提交
        document.getElementById('practice-next-btn').addEventListener('click', () => {
            this._feedbackShown = false;
            if (this.currentIndex < total - 1) {
                this.currentIndex++;
                this.renderQuestion();
            } else {
                this.submitAll();
            }
        });

        // 退出
        document.getElementById('practice-back-btn').addEventListener('click', () => {
            if (confirm('确定退出？当前进度不会丢失。')) {
                panel.remove();
                this.game.enterHall();
            }
        });
    }

    renderOptions(options, savedAnswer) {
        if (!options) return '';
        return Object.entries(options).map(([key, text]) => {
            return `<div class="option-btn" data-value="${key}">
                <span class="option-label">${key}</span>
                <span class="option-text">${this.game.ui.escapeHtml(text)}</span>
            </div>`;
        }).join('');
    }

    /** 连击特效 */
    showComboFx(count) {
        const existing = document.getElementById('combo-fx');
        if (existing) existing.remove();
        const el = document.createElement('div');
        el.id = 'combo-fx';
        el.className = 'combo-fx';
        el.textContent = `🔥 ${count}连击！`;
        document.body.appendChild(el);
        setTimeout(() => { if (el.parentNode) el.remove(); }, 1200);
    }

    /** 批量提交 */
    async submitAll() {
        const panel = document.getElementById('practice-panel');
        if (panel) panel.remove();

        this.game.ui.showLoading('提交灵草...');

        const [realm, stage] = this.currentLevel.split('-');
        const answersList = Object.entries(this.answers).map(([qid, ans]) => ({
            question_id: qid,
            answer: ans,
        }));

        const res = await this.game.api.post(`/${this.currentType}/submit-batch`, {
            level: realm,
            stage,
            answers: answersList,
        });

        this.game.ui.hideLoading();

        if (res.success) {
            const updates = {};
            if (res.data.total_exp) {
                updates.exp = (this.game.store.getState().user?.exp || 0) + res.data.total_exp;
            }
            if (res.data.total_spirit_cost) {
                updates.spirit_power = Math.max(0, (this.game.store.getState().user?.spirit_power || 0) - res.data.total_spirit_cost);
            }
            this.game.store.updateUser(updates);

            // 附加 maxCombo 数据传给结果面板
            res.data._maxCombo = this.maxCombo;
            this.showRewardPopup(res.data);
        } else {
            this.game.ui.showHermesBubble(res.message || '提交失败');
            this.game.enterHall();
        }
    }

    /** 结果弹窗（含连击统计） */
    showRewardPopup(data) {
        const existing = document.getElementById('reward-popup');
        if (existing) existing.remove();

        const passed = data.passed;
        const perfect = data.accuracy === 100;
        const popup = document.createElement('div');
        popup.className = `reward-popup ${passed ? 'reward-pass' : 'reward-fail'}`;
        popup.id = 'reward-popup';

        const hermesMsg = passed
            ? (perfect ? '妙哉！此关已通，修为大进。继续修炼，筑基可期。' : '尚可。略有瑕疵，但无伤大雅。')
            : '无妨。修炼之路本有坎坷。不妨回顾错处，再战一局。';

        popup.innerHTML = `
            <div class="reward-icon">${passed ? (perfect ? '🌟' : '✓') : '🔄'}</div>
            <div class="reward-title">${passed ? (perfect ? '完美通关！' : '通关') : '未通过'}</div>
            <div class="reward-details">
                <div class="reward-row"><span>正确率</span><span class="${data.accuracy >= 80 ? 'text-gold' : data.accuracy >= 60 ? 'text-green' : 'text-red'}">${data.accuracy}%</span></div>
                <div class="reward-row"><span>最大连击</span><span class="text-gold">🔥 ${data._maxCombo || 0}</span></div>
                <div class="reward-row"><span>获得修为</span><span class="text-gold">+${data.total_exp}</span></div>
                <div class="reward-row"><span>消耗灵力</span><span class="text-blue">-${data.total_spirit_cost}</span></div>
                <div class="reward-row"><span>获得灵石</span><span class="text-gold">+${data.stones_gained || 0}</span></div>
            </div>
            <div class="hermes-judge">${hermesMsg}</div>
            <div class="reward-actions">
                ${passed
                    ? `<button class="btn btn-primary" id="reward-next-btn">继续下一关</button>`
                    : `<button class="btn btn-primary" id="reward-retry-btn">再来一次</button>`
                }
                <button class="btn btn-secondary" id="reward-back-btn">返回宗门</button>
            </div>
        `;
        this.game.ui.overlay.appendChild(popup);

        if (passed) {
            document.getElementById('reward-next-btn').addEventListener('click', () => {
                popup.remove();
                this.game.enterHall();
                setTimeout(() => {
                    this.game.shareCard.showLevelCard({
                        level_id: this.currentLevel,
                        accuracy: data.accuracy,
                        exp_gained: data.total_exp,
                        title: `${this.currentType === 'vocab' ? '采药识灵' : '基础功法'}·${this.currentLevel}`,
                    });
                }, 1500);
            });
        } else {
            document.getElementById('reward-retry-btn').addEventListener('click', () => {
                popup.remove();
                this.startLevel(this.currentType, this.currentLevel);
            });
        }
        document.getElementById('reward-back-btn').addEventListener('click', () => {
            popup.remove();
            this.game.enterHall();
        });
    }
}
