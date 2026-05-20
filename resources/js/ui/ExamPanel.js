// LevelUp 英语修仙 - 渡劫检测面板
import { getRealmDisplayName } from '../utils/cultivation.js';

export class ExamPanel {
    constructor(game) {
        this.game = game;
        this.questions = [];
        this.currentIndex = 0;
        this.answers = {};
        this.timerId = null;
        this.timeLeft = 600;
        this.examActive = false;
        this.timerTick = 0;
        this.examInfoRequestId = 0;
        this.examInfoBusy = false;
    }

    /** 渡劫前检查心魔，强制强化复习 */
    async checkPreExamReview() {
        if (this.examInfoBusy) return;
        await this.showExamInfo();
    }

    /** 心魔强化复习面板 */
    showDemonReview() {
        this.game.ui.hideAllPanels();
        const d = this.preExamDemons || [];
        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.id = 'exam-demon-review';
        panel.style.borderColor = 'var(--cinnabar)';
        panel.innerHTML = `
            <div class="panel-title">🧘 渡劫前·心魔强化复习</div>
            <div style="text-align:center;padding:12px 0;color:var(--cinnabar);font-size:14px;line-height:1.8;">
                <p>⚠ 检测到 ${d.length} 条未降服的心魔</p>
                <p style="color:var(--parchment-dark);font-size:13px;margin-top:8px;">渡劫前务必先巩固这些薄弱之处</p>
            </div>
            <button class="btn btn-primary" id="exam-demon-review-btn" style="background:linear-gradient(135deg,var(--cinnabar),#e74c3c);">开始强化复习</button>
            <button class="btn btn-secondary" id="exam-demon-skip-btn" style="margin-top:8px;">跳过，直接渡劫</button>
        `;
        this.game.ui.overlay.appendChild(panel);

        document.getElementById('exam-demon-review-btn').addEventListener('click', () => {
            panel.remove();
            this.startDemonReview(0);
        });
        document.getElementById('exam-demon-skip-btn').addEventListener('click', () => {
            panel.remove();
            this.showExamInfo();
        });
    }

    /** 逐题强化复习心魔 */
    startDemonReview(index) {
        const d = this.preExamDemons || [];
        if (index >= d.length) { this.showExamInfo(); return; }
        const q = d[index];
        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.id = 'exam-demon-q';
        panel.style.borderColor = 'var(--cinnabar)';
        panel.innerHTML = `
            <div class="practice-header">
                <span class="practice-title" style="color:var(--cinnabar);">🧘 心魔强化 ${index+1}/${d.length}</span>
                <span class="practice-progress">错${q._demon_wrong_count}次</span>
            </div>
            <div class="question-text">${this.game.ui.escapeHtml(q.question)}</div>
            <div class="options-container">
                ${Object.entries(q.options).map(([k, v]) =>
                    `<div class="option-btn" data-value="${this.game.ui.escapeHtml(k)}"><span class="option-label">${this.game.ui.escapeHtml(k)}</span><span class="option-text">${this.game.ui.escapeHtml(v)}</span></div>`
                ).join('')}
            </div>
            <button class="btn btn-primary btn-sm" id="demon-review-next-btn" disabled>下一题</button>
        `;
        this.game.ui.overlay.appendChild(panel);

        panel.querySelectorAll('.option-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                panel.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                const correct = btn.dataset.value === q.correct_answer;
                if (correct) { btn.classList.add('answer-correct'); }
                else {
                    btn.classList.add('answer-wrong');
                    const correctBtn = Array.from(panel.querySelectorAll('.option-btn'))
                        .find((node) => node.dataset.value === q.correct_answer);
                    correctBtn?.classList.add('answer-correct');
                }
                // 记录心魔复习
                this.game.api.post('/vocab/submit-batch', {
                    level: q.realm || 'L1', stage: 'review',
                    answers: [{ question_id: q.question_id, answer: btn.dataset.value }]
                });
                document.getElementById('demon-review-next-btn').disabled = false;
            });
        });

        document.getElementById('demon-review-next-btn').addEventListener('click', () => { panel.remove(); this.startDemonReview(index + 1); });
    }

    /** 显示渡劫准备界面 */
    async showExamInfo() {
        const requestId = ++this.examInfoRequestId;
        this.examInfoBusy = true;
        this.game.ui.hideAllPanels();
        const existing = document.getElementById('exam-info-panel');
        if (existing) existing.remove();

        const user = this.game.store.getState().user;
        if (!user) {
            this.examInfoBusy = false;
            return;
        }

        this.game.ui.showLoading('推演突破条件...');
        const res = await this.game.api.get('/exam/current');
        this.game.ui.hideLoading();
        if (requestId !== this.examInfoRequestId) {
            this.examInfoBusy = false;
            return;
        }
        const status = res?.success ? (res.data?.breakthrough_status || {}) : {};
        const currentRealm = status.current_realm || user.current_realm || this.getRealmName(user.realm);
        const nextRealm = status.next_realm || '暂无';
        const canBreakthrough = Boolean(status.can_breakthrough);
        const isMaxRealm = Boolean(status.is_max_realm);
        const missingText = this.renderMissingText(status);
        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.id = 'exam-info-panel';
        panel.innerHTML = `
            <div class="panel-title">突破台</div>
            <div class="breakthrough-header">
                <div class="breakthrough-realm-flow">${this.game.ui.escapeHtml(currentRealm)} → ${this.game.ui.escapeHtml(nextRealm)}</div>
                <div class="breakthrough-hint">${this.game.ui.escapeHtml(status.message || '请达成六维与修为要求')}</div>
            </div>
            ${this.renderBreakthroughRequirements(status)}
            ${missingText ? `<div class="breakthrough-missing">${missingText}</div>` : ''}
            ${isMaxRealm ? '<div class="breakthrough-max-tip">当前已达 MVP 最高境界</div>' : ''}
            <button class="btn btn-primary" id="exam-start-btn" ${(canBreakthrough && !isMaxRealm) ? '' : 'disabled'}>开始突破</button>
            <button class="btn btn-secondary" id="exam-info-back-btn" style="margin-top:8px;">返回宗门</button>
        `;
        this.game.ui.overlay.appendChild(panel);
        this.examInfoBusy = false;

        document.getElementById('exam-start-btn').addEventListener('click', () => this.startBreakthrough());
        document.getElementById('exam-info-back-btn').addEventListener('click', () => {
            this.examInfoRequestId++;
            this.examInfoBusy = false;
            panel.remove();
            this.game.enterHall();
        });
    }

    renderBreakthroughRequirements(status) {
        const dimensions = status?.dimensions || {};
        const keys = ['vocabulary', 'grammar', 'reading', 'listening', 'writing', 'speaking'];
        const rows = keys.map((key) => {
            const item = dimensions[key] || {};
            const met = Boolean(item.met);
            const label = item.label || key;
            const current = Number(item.current || 0);
            const required = Number(item.required || 0);
            const gap = Number(item.gap || Math.max(0, required - current));
            return `
                <div class="breakthrough-condition ${met ? 'met' : 'unmet'}">
                    <span>${this.game.ui.escapeHtml(label)} ${current}/${required}</span>
                    <span>${met ? '✓' : `差 ${gap}`}</span>
                </div>
            `;
        }).join('');

        const energy = status?.cultivation_energy || {};
        const energyMet = Boolean(energy.met);
        const energyCurrent = Number(energy.current || 0);
        const energyRequired = Number(energy.required || 0);
        const energyGap = Number(energy.gap || Math.max(0, energyRequired - energyCurrent));
        const energyRow = `
            <div class="breakthrough-condition ${energyMet ? 'met' : 'unmet'}">
                <span>修为 ${energyCurrent}/${energyRequired}</span>
                <span>${energyMet ? '✓' : `差 ${energyGap}`}</span>
            </div>
        `;

        return `
            <div class="breakthrough-condition-list">
                ${rows}
                ${energyRow}
            </div>
        `;
    }

    renderMissingText(status) {
        const missing = Array.isArray(status?.missing_requirements) ? status.missing_requirements : [];
        if (!missing.length) return '';
        return `未满足：${missing.map((item) => `${item.label} 差${item.gap}`).join('、')}`;
    }

    async startBreakthrough() {
        this.examInfoRequestId++;
        this.examInfoBusy = false;
        this.game.ui.showLoading('引动灵气，冲击瓶颈...');
        const res = await this.game.api.post('/exam/breakthrough');
        this.game.ui.hideLoading();

        if (!res?.success) {
            this.game.ui.showHermesBubble(res?.message || '突破失败');
            await this.showExamInfo();
            return;
        }

        const user = this.game.store.getState().user;
        const userData = res.data?.user || {};
        if (user) {
            this.game.store.updateUser({
                realm: userData.realm ?? user.realm,
                realm_stage: userData.realm_stage ?? user.realm_stage,
                current_realm: userData.current_realm ?? user.current_realm,
                cultivation_energy: Number(userData.cultivation_energy ?? user.cultivation_energy ?? 0),
                vocabulary: Number(userData.vocabulary ?? user.vocabulary ?? 0),
                grammar: Number(userData.grammar ?? user.grammar ?? 0),
                reading: Number(userData.reading ?? user.reading ?? 0),
                listening: Number(userData.listening ?? user.listening ?? 0),
                writing: Number(userData.writing ?? user.writing ?? 0),
                speaking: Number(userData.speaking ?? user.speaking ?? 0),
            });
        }

        this.showBreakthroughResult(res.data);
    }

    showBreakthroughResult(data) {
        const existing = document.getElementById('exam-result-panel');
        if (existing) existing.remove();

        const bt = data?.breakthrough || {};
        const fromRealm = bt.from_current_realm || data?.status?.current_realm || '当前境界';
        const toRealm = bt.to_current_realm || data?.user?.current_realm || '下一境界';

        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.id = 'exam-result-panel';
        panel.innerHTML = `
            <div class="panel-title">突破完成</div>
            <div class="breakthrough-success">
                <div class="breakthrough-success-icon">✨</div>
                <div class="breakthrough-success-text">突破成功：${this.game.ui.escapeHtml(fromRealm)} → ${this.game.ui.escapeHtml(toRealm)}</div>
            </div>
            <button class="btn btn-primary" id="exam-done-btn">返回宗门</button>
        `;
        this.game.ui.overlay.appendChild(panel);
        this.game.ui.showHermesBubble(`突破成功：${fromRealm} → ${toRealm}`, 3500);

        document.getElementById('exam-done-btn').addEventListener('click', () => {
            panel.remove();
            this.game.enterHall();
        });
    }

    /** 开始渡劫 */
    async startExam() {
        const panel = document.getElementById('exam-info-panel');
        if (panel) panel.remove();

        this.game.ui.showLoading('天道感应中...');
        const res = await this.game.api.post('/exam/start');
        this.game.ui.hideLoading();

        if (!res.success) {
            this.game.ui.showHermesBubble(res.message || '渡劫条件不足');
            this.game.enterHall();
            return;
        }

        this.questions = res.data.questions;
        this.currentIndex = 0;
        this.answers = {};
        this.timeLeft = res.data.time_limit || 600;
        this.examActive = true;
        this.timerTick = 0;

        this.renderExamQuestion();
        this.startTimer();
        this.persistSession();
    }

    renderExamQuestion() {
        const existing = document.getElementById('exam-panel');
        if (existing) existing.remove();

        const q = this.questions[this.currentIndex];
        if (!q) return;

        const total = this.questions.length;
        const answered = Object.keys(this.answers).length;
        const savedAnswer = this.answers[q.question_id] || null;

        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.id = 'exam-panel';
        panel.style.maxWidth = '560px';
        panel.style.borderColor = 'var(--cinnabar)';
        panel.innerHTML = `
            <div class="practice-header">
                <span class="practice-title" style="color:var(--cinnabar);">⚡ 渡劫(${this.currentIndex + 1}/${total})</span>
                <span class="practice-progress" id="exam-timer">⏱ ${this.formatTime(this.timeLeft)}</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width:${(answered / total) * 100}%;background:linear-gradient(90deg,var(--cinnabar),#e74c3c);"></div>
            </div>
            <div class="badge" style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;margin-bottom:8px;background:${q.type === 'vocab' ? 'rgba(74,144,217,0.2)' : 'rgba(78,192,122,0.2)'};color:${q.type === 'vocab' ? '#4a90d9' : '#4ec07a'};">
                ${q.type === 'vocab' ? '📖 词汇' : '🔮 语法'}
            </div>
            <div class="question-text">${this.game.ui.escapeHtml(q.question)}</div>
            <div class="options-container">
                ${this.renderOptions(q.options, savedAnswer)}
            </div>
            <div class="practice-actions">
                <button class="btn btn-primary btn-sm" id="exam-next-btn" ${savedAnswer ? '' : 'disabled'}>
                    ${this.currentIndex < total - 1 ? '下一题 →' : '提交应劫'}
                </button>
            </div>
        `;
        this.game.ui.overlay.appendChild(panel);

        const optionBtns = panel.querySelectorAll('.option-btn');
        optionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                optionBtns.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                this.answers[q.question_id] = btn.dataset.value;
                this.game.store.answerQuestion(q.question_id, btn.dataset.value);
                document.getElementById('exam-next-btn').disabled = false;
                this.persistSession();
            });
        });

        document.getElementById('exam-next-btn').addEventListener('click', () => {
            if (this.currentIndex < total - 1) {
                this.currentIndex++;
                this.persistSession();
                this.renderExamQuestion();
            } else {
                this.submitExam();
            }
        });
    }

    renderOptions(options, savedAnswer) {
        if (!options) return '';
        return Object.entries(options).map(([key, text]) => {
            const isSelected = savedAnswer === key;
            return `<div class="option-btn ${isSelected ? 'selected' : ''}" data-value="${this.game.ui.escapeHtml(key)}">
                <span class="option-label">${this.game.ui.escapeHtml(key)}</span>
                <span class="option-text">${this.game.ui.escapeHtml(text)}</span>
            </div>`;
        }).join('');
    }

    startTimer() {
        this.stopTimer();
        this.timerId = setInterval(() => {
            this.timeLeft--;
            this.timerTick++;
            const timerEl = document.getElementById('exam-timer');
            if (timerEl) timerEl.textContent = `⏱ ${this.formatTime(this.timeLeft)}`;
            if (this.timerTick % 5 === 0) this.persistSession();

            if (this.timeLeft <= 0) {
                clearInterval(this.timerId);
                this.timerId = null;
                this.submitExam();
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
    }

    formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${String(s).padStart(2, '0')}`;
    }

    async submitExam() {
        this.stopTimer();

        const panel = document.getElementById('exam-panel');
        if (panel) panel.remove();

        this.game.ui.showLoading('天道感应中...');

        const answersList = Object.entries(this.answers).map(([qid, ans]) => ({
            question_id: qid,
            answer: ans,
        }));

        const res = await this.game.api.post('/exam/submit', {
            answers: answersList,
            time_spent: 600 - this.timeLeft,
        });

        this.game.ui.hideLoading();
        this.examActive = false;
        this.clearSession();

        if (res.success) {
            this.showExamResult(res.data);
        } else {
            this.game.ui.showHermesBubble(res.message || '渡劫失败');
            this.game.enterHall();
        }
    }

    showExamResult(data) {
        const existing = document.getElementById('exam-result-panel');
        if (existing) existing.remove();

        const { grade_result, reward, breakthrough } = data;
        const colors = { 'S':'#f0d68a', 'A':'#4ec07a', 'B':'#4a90d9', 'C':'#d4a843', 'D':'#c0392b' };
        const judgeMsg = this.game.hermes.getMessage('exam_result', { grade: grade_result.grade });

        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.id = 'exam-result-panel';
        panel.style.maxWidth = '420px';
        panel.innerHTML = `
            <div class="panel-title">${grade_result.passed ? '🎉 渡劫成功' : '💔 渡劫未过'}</div>
            <div style="text-align:center;margin-bottom:20px;">
                <div style="font-size:56px;font-weight:bold;color:${colors[grade_result.grade] || '#d4a843'};text-shadow:0 0 30px ${colors[grade_result.grade] || '#d4a843'}40;">
                    ${grade_result.grade}
                </div>
                <div style="font-size:16px;color:var(--gold-light);margin-top:4px;">${grade_result.score}分 · ${grade_result.correct}/${grade_result.total}题正确</div>
            </div>
            <div class="reward-details">
                <div class="reward-row"><span>获得修为</span><span class="text-gold">+${reward.exp_gained}</span></div>
                <div class="reward-row"><span>修为倍率</span><span class="text-gold">×${reward.multiplier}</span></div>
                <div class="reward-row"><span>获得灵石</span><span class="text-gold">+${reward.stones_gained}</span></div>
                <div class="reward-row"><span>消耗灵力</span><span class="text-blue">-30</span></div>
            </div>
            <div class="hermes-judge">${judgeMsg}</div>
            ${breakthrough ? `
            <div style="text-align:center;padding:16px;background:rgba(212,168,67,0.12);border-radius:12px;margin-bottom:16px;animation:pulse 2s infinite;">
                <div style="font-size:32px;">✨</div>
                <div style="color:var(--gold);font-family:var(--font-title);font-size:18px;margin-top:4px;">
                    ${this.getRealmName(breakthrough.new_realm)} · ${breakthrough.new_stage}重
                </div>
                <div style="color:var(--gold-light);font-size:13px;margin-top:4px;">
                    ${breakthrough.type === 'realm_up' ? '境界突破！' : '修为精进！'}
                </div>
            </div>` : ''}
            <button class="btn btn-primary" id="exam-done-btn">返回宗门</button>
        `;
        this.game.ui.overlay.appendChild(panel);

        // 更新用户数据
        const user = this.game.store.getState().user;
        if (user) {
            this.game.store.updateUser({
                exp: (user.exp || 0) + reward.exp_gained,
                spirit_power: Math.max(0, (user.spirit_power || 0) - 30),
            });
            if (breakthrough) {
                this.game.store.updateUser({
                    realm: breakthrough.new_realm,
                    realm_stage: breakthrough.new_stage,
                });
            }
        }

        document.getElementById('exam-done-btn').addEventListener('click', () => {
            panel.remove();
            this.game.enterHall();
            // 渡劫成功 → 弹出天道认证卡（PRD 11.4）
            if (data.grade_result.passed) {
                setTimeout(async () => {
                    const shareCard = await this.game.ensureShareCard();
                    shareCard.showExamCard({
                        grade: data.grade_result.grade,
                        score: data.grade_result.score,
                        realm_new: data.current_realm ? this.getRealmName(data.current_realm) : this.getRealmName(data.grade_result.grade >= 'C' ? data.current_realm : ''),
                        streak_days: 0, // 可从后端获取
                        time_spent: Math.ceil((600 - (this.timeLeft || 0)) / 60),
                    });
                }, 1500);
            }
        });
    }

    getRealmName(realm) {
        return getRealmDisplayName(realm);
    }

    getSessionKey() {
        const userId = this.game.store.getState().user?.id || 'guest';
        return `levelup_session_exam_${userId}`;
    }

    persistSession() {
        if (!this.examActive || !this.questions?.length) return;
        const payload = {
            questions: this.questions,
            currentIndex: this.currentIndex,
            answers: this.answers,
            timeLeft: this.timeLeft,
            ts: Date.now(),
        };
        localStorage.setItem(this.getSessionKey(), JSON.stringify(payload));
    }

    loadSession() {
        try {
            const raw = localStorage.getItem(this.getSessionKey());
            if (!raw) return null;
            const data = JSON.parse(raw);
            if (!Array.isArray(data.questions) || !data.questions.length) return null;
            return data;
        } catch {
            return null;
        }
    }

    resumeSessionIfAvailable() {
        const data = this.loadSession();
        if (!data) return false;
        this.questions = data.questions;
        this.currentIndex = Math.max(0, Math.min(data.currentIndex || 0, this.questions.length - 1));
        this.answers = data.answers || {};
        this.timeLeft = Math.max(1, Number(data.timeLeft || 600));
        this.examActive = true;
        this.timerTick = 0;
        this.game.scene.switchTo('shilianchang');
        this.game.ui.hideAllPanels();
        this.renderExamQuestion();
        this.startTimer();
        return true;
    }

    clearSession() {
        localStorage.removeItem(this.getSessionKey());
    }

    cleanup() {
        if (this.examActive) {
            this.persistSession();
        }
        this.stopTimer();
    }
}
