export class MijingPanel {
    constructor(game) {
        this.game = game;
        this.challengeId = null;
        this.currentQuestion = null;
        this.timerId = null;
        this.startedAtMs = 0;
        this.durationSec = 60;
        this.score = 0;
        this.combo = 0;
        this.finishing = false;
        this.lastConfig = null;
    }

    showEntry() {
        this.stopTicker();
        this.challengeId = null;
        this.currentQuestion = null;
        this.score = 0;
        this.combo = 0;
        this.finishing = false;
        this.game.ui.hideAllPanels();

        const defaults = this.getDefaultLevelStage();
        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.id = 'mijing-entry-panel';
        panel.style.maxWidth = '440px';
        panel.innerHTML = `
            <div class="panel-title">秘境试炼（限时）</div>
            <div style="color:var(--parchment-dark);font-size:13px;line-height:1.8;margin-bottom:12px;">
                60息内尽可能答对更多试题。题目混合当前境界与心魔录内容，助你锤炼回忆速度。
            </div>
            <div class="input-group">
                <label>试炼类型</label>
                <select id="mijing-module-type">
                    <option value="vocab">采药识灵</option>
                    <option value="grammar">基础功法</option>
                    <option value="listening">听风谷</option>
                    <option value="reading">阅读副本</option>
                </select>
            </div>
            <div style="display:flex;gap:10px;">
                <div class="input-group" style="flex:1;">
                    <label>境界</label>
                    <input id="mijing-level" value="${defaults.level}" maxlength="3">
                </div>
                <div class="input-group" style="flex:1;">
                    <label>关卡</label>
                    <input id="mijing-stage" value="${defaults.stage}" maxlength="2">
                </div>
            </div>
            <div style="font-size:12px;color:var(--parchment-dark);margin-bottom:12px;">
                每次试炼消耗灵力 5 点
            </div>
            <button class="btn btn-primary" id="mijing-start-btn">开始限时挑战</button>
            <button class="btn btn-secondary" id="mijing-exit-btn" style="margin-top:8px;">返回大厅</button>
        `;
        this.game.ui.overlay.appendChild(panel);

        document.getElementById('mijing-start-btn')?.addEventListener('click', () => {
            const moduleType = document.getElementById('mijing-module-type')?.value || 'vocab';
            const level = (document.getElementById('mijing-level')?.value || defaults.level).trim().toUpperCase();
            const stageRaw = (document.getElementById('mijing-stage')?.value || defaults.stage).trim();
            const stage = stageRaw.padStart(2, '0');
            this.startChallenge(moduleType, level, stage);
        });
        document.getElementById('mijing-exit-btn')?.addEventListener('click', () => this.game.enterHall());
    }

    async startChallenge(moduleType, level, stage) {
        this.game.ui.showLoading('正在开启秘境试炼...');
        const res = await this.game.api.post('/mijing/timed-challenge/start', {
            module_type: moduleType,
            level,
            stage,
        });
        this.game.ui.hideLoading();

        if (!res?.success) {
            this.game.ui.showHermesBubble(res?.message || '开启挑战失败，请稍后再试');
            return;
        }

        const data = res.data || {};
        this.challengeId = data.challenge_id;
        this.durationSec = Number(data.duration_sec || 60);
        this.startedAtMs = Date.parse(data.start_at || new Date().toISOString());
        this.score = 0;
        this.combo = 0;
        this.finishing = false;
        this.lastConfig = { moduleType, level, stage };

        document.getElementById('mijing-entry-panel')?.remove();
        this.renderChallengeShell(moduleType, level, stage);
        this.startTicker();
        await this.loadNextQuestion();
    }

    renderChallengeShell(moduleType, level, stage) {
        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.id = 'mijing-challenge-panel';
        panel.style.maxWidth = '520px';
        panel.innerHTML = `
            <div class="practice-header">
                <span class="practice-title">秘境限时挑战 · ${this.escapeHtml(moduleType.toUpperCase())}</span>
                <span class="practice-progress">${this.escapeHtml(level)}-${this.escapeHtml(stage)}</span>
            </div>
            <div style="display:flex;gap:8px;margin:8px 0 12px;">
                <div style="flex:1;padding:8px;border:1px solid rgba(212,168,67,0.25);border-radius:8px;text-align:center;">
                    <div style="font-size:12px;color:var(--parchment-dark);">剩余时间</div>
                    <div id="mijing-timer" style="font-size:20px;color:var(--gold);font-weight:700;">60s</div>
                </div>
                <div style="flex:1;padding:8px;border:1px solid rgba(212,168,67,0.25);border-radius:8px;text-align:center;">
                    <div style="font-size:12px;color:var(--parchment-dark);">当前分数</div>
                    <div id="mijing-score" style="font-size:20px;color:var(--gold);font-weight:700;">0</div>
                </div>
                <div style="flex:1;padding:8px;border:1px solid rgba(212,168,67,0.25);border-radius:8px;text-align:center;">
                    <div style="font-size:12px;color:var(--parchment-dark);">连对</div>
                    <div id="mijing-combo" style="font-size:20px;color:var(--gold);font-weight:700;">0</div>
                </div>
            </div>
            <div id="mijing-question-stem" class="question-text">正在加载题目...</div>
            <div id="mijing-options" class="options-container"></div>
            <div class="practice-actions">
                <button class="btn btn-secondary btn-sm" id="mijing-finish-btn">提前结算</button>
                <button class="btn btn-secondary btn-sm" id="mijing-abort-btn">退出秘境</button>
            </div>
        `;
        this.game.ui.overlay.appendChild(panel);

        document.getElementById('mijing-finish-btn')?.addEventListener('click', () => this.finishChallenge());
        document.getElementById('mijing-abort-btn')?.addEventListener('click', async () => {
            const ok = await this.game.ui.showConfirmDialog({
                title: '退出确认',
                message: '确定退出限时挑战并立即结算吗？',
                confirmText: '立即结算',
                cancelText: '继续挑战',
            });
            if (ok) this.finishChallenge();
        });
    }

    async loadNextQuestion() {
        if (!this.challengeId || this.finishing) return;
        const remain = this.getRemainSec();
        if (remain <= 0) {
            await this.finishChallenge();
            return;
        }

        const res = await this.game.api.post('/mijing/timed-challenge/next-question', {
            challenge_id: this.challengeId,
        });
        if (!res?.success) {
            await this.finishChallenge();
            return;
        }

        this.currentQuestion = res.data;
        this.renderQuestion(res.data);
    }

    renderQuestion(question) {
        const stemEl = document.getElementById('mijing-question-stem');
        const optionsEl = document.getElementById('mijing-options');
        if (!stemEl || !optionsEl) return;

        stemEl.textContent = question?.stem || '题目加载失败';
        const options = this.normalizeOptions(question?.options);
        optionsEl.innerHTML = options.map((opt) => `
            <button class="option-btn" data-value="${this.escapeHtml(opt.value)}">
                <span class="option-letter">${this.escapeHtml(opt.label)}</span>
                <span class="option-text">${this.escapeHtml(opt.text)}</span>
            </button>
        `).join('');

        optionsEl.querySelectorAll('.option-btn').forEach((btn) => {
            btn.addEventListener('click', async () => {
                if (!this.currentQuestion || this.finishing) return;
                optionsEl.querySelectorAll('.option-btn').forEach((b) => { b.style.pointerEvents = 'none'; });
                btn.classList.add('selected');
                await this.submitCurrentAnswer(btn.dataset.value, btn);
            });
        });
    }

    async submitCurrentAnswer(answer, btn) {
        const sentAt = Date.now();
        const res = await this.game.api.post('/mijing/timed-challenge/submit-answer', {
            challenge_id: this.challengeId,
            question_id: this.currentQuestion?.question_id,
            answer,
            elapsed_ms: 0,
        });
        if (!res?.success) {
            await this.finishChallenge();
            return;
        }

        const data = res.data || {};
        this.score = Number(data.score || 0);
        this.combo = Number(data.combo || 0);
        this.updateIndicators();

        if (btn) {
            btn.classList.add(data.correct ? 'answer-correct' : 'answer-wrong');
        }

        const spent = Date.now() - sentAt;
        const waitMs = Math.max(120, data.correct ? 200 : 500) + Math.min(spent, 300);
        await this.wait(waitMs);

        if (Number(data.remain_sec || 0) <= 0) {
            await this.finishChallenge();
            return;
        }
        await this.loadNextQuestion();
    }

    async finishChallenge() {
        if (!this.challengeId || this.finishing) return;
        this.finishing = true;
        this.stopTicker();

        const res = await this.game.api.post('/mijing/timed-challenge/finish', {
            challenge_id: this.challengeId,
        });
        if (!res?.success) {
            this.finishing = false;
            this.game.ui.showHermesBubble(res?.message || '结算失败，请稍后重试');
            return;
        }

        this.renderResult(res.data || {});
    }

    renderResult(data) {
        document.getElementById('mijing-challenge-panel')?.remove();
        const weakTags = Array.isArray(data.weak_tags) ? data.weak_tags : [];
        const weakText = weakTags.length ? weakTags.map((tag) => this.escapeHtml(tag)).join('、') : '暂无';

        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.id = 'mijing-result-panel';
        panel.style.maxWidth = '480px';
        panel.innerHTML = `
            <div class="panel-title">限时试炼结算</div>
            <div style="padding:12px;border:1px solid rgba(212,168,67,0.25);border-radius:10px;margin-bottom:12px;">
                <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                    <span>总分</span><b style="color:var(--gold);">${Number(data.final_score || 0)}</b>
                </div>
                <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                    <span>答题数</span><b>${Number(data.total_answered || 0)}</b>
                </div>
                <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                    <span>正确数</span><b>${Number(data.correct_count || 0)}</b>
                </div>
                <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                    <span>正确率</span><b>${Number(data.accuracy || 0)}%</b>
                </div>
                <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                    <span>获得修为</span><b style="color:var(--gold);">+${Number(data.exp_gained || 0)}</b>
                </div>
                <div style="display:flex;justify-content:space-between;">
                    <span>获得灵石</span><b style="color:var(--gold);">+${Number(data.points_gained || 0)}</b>
                </div>
            </div>
            <div style="font-size:12px;color:var(--parchment-dark);margin-bottom:12px;">
                本次心魔执念：${weakText}
            </div>
            <button class="btn btn-primary" id="mijing-retry-btn">再闯一局</button>
            <button class="btn btn-secondary" id="mijing-back-hall-btn" style="margin-top:8px;">返回大厅</button>
        `;
        this.game.ui.overlay.appendChild(panel);

        document.getElementById('mijing-retry-btn')?.addEventListener('click', () => {
            const cfg = this.lastConfig || this.getDefaultLevelStage();
            this.challengeId = null;
            panel.remove();
            this.startChallenge(cfg.moduleType || 'vocab', cfg.level, cfg.stage);
        });
        document.getElementById('mijing-back-hall-btn')?.addEventListener('click', () => this.game.enterHall());
    }

    startTicker() {
        this.stopTicker();
        this.updateIndicators();
        this.timerId = setInterval(() => {
            this.updateIndicators();
            if (this.getRemainSec() <= 0) {
                this.finishChallenge();
            }
        }, 200);
    }

    stopTicker() {
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
    }

    updateIndicators() {
        const timerEl = document.getElementById('mijing-timer');
        const scoreEl = document.getElementById('mijing-score');
        const comboEl = document.getElementById('mijing-combo');
        if (timerEl) timerEl.textContent = `${this.getRemainSec()}s`;
        if (scoreEl) scoreEl.textContent = `${this.score}`;
        if (comboEl) comboEl.textContent = `${this.combo}`;
    }

    getRemainSec() {
        const now = Date.now();
        const elapsed = Math.max(0, Math.floor((now - this.startedAtMs) / 1000));
        return Math.max(0, this.durationSec - elapsed);
    }

    getDefaultLevelStage() {
        const user = this.game.store.getState().user || {};
        return {
            level: String(user.realm || 'L1').toUpperCase(),
            stage: String(user.realm_stage || 1).padStart(2, '0'),
            moduleType: 'vocab',
        };
    }

    normalizeOptions(options) {
        if (Array.isArray(options)) {
            if (options.length && typeof options[0] === 'object') {
                return options.map((item, idx) => ({
                    label: item.label || String.fromCharCode(65 + idx),
                    text: item.text || item.value || '',
                    value: item.value || item.label || String.fromCharCode(65 + idx),
                }));
            }
            return options.map((text, idx) => ({
                label: String.fromCharCode(65 + idx),
                text: String(text),
                value: String.fromCharCode(65 + idx),
            }));
        }
        if (options && typeof options === 'object') {
            return Object.keys(options).map((key) => ({
                label: key,
                text: String(options[key]),
                value: key,
            }));
        }
        return [];
    }

    wait(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    escapeHtml(str) {
        return this.game.ui.escapeHtml(String(str ?? ''));
    }
}
