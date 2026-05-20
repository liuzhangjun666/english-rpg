// LevelUp 英语修仙 - 错题复习模式（不消耗灵力）
export class ReviewPanel {
    constructor(game) {
        this.game = game;
        this.questions = [];
        this.answers = {};
        this.currentIndex = 0;
        this.results = null;
    }

    exitReview(panel = null) {
        if (panel) panel.remove();
        this.clearSession();
        this.questions = [];
        this.answers = {};
        this.currentIndex = 0;
        this.results = null;
        this.game.enterHall();
    }

    /** 打开错题复习 */
    async startReview() {
        if (this.resumeSessionIfAvailable()) return;

        this.game.ui.showLoading('提取错题灵脉...');
        const res = await this.game.api.get('/review/list');
        this.game.ui.hideLoading();

        if (!res.success || res.data.total === 0) {
            this.game.ui.showHermesBubble('暂无错题。修炼之路一帆风顺，善。');
            this.game.enterHall();
            return;
        }

        this.questions = res.data.questions;
        this.answers = {};
        this.currentIndex = 0;
        this.results = null;
        this.persistSession();

        this.game.scene.switchTo('practice');
        this.game.ui.hideAllPanels();
        this.showIntro();
    }

    showIntro() {
        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.id = 'review-panel';
        panel.innerHTML = `
            <div class="panel-title">🔄 错题复习</div>
            <div style="text-align:center;padding:16px 0;line-height:1.8;color:var(--parchment-dark);font-size:14px;">
                <p>共 ${this.questions.length} 道待复习错题</p>
                <p style="color:var(--jade-light);margin-top:8px;">💡 复习不消耗灵力</p>
                <p style="color:var(--gold-light);font-size:13px;margin-top:4px;">每道题答对后掌握度+20</p>
            </div>
            <button class="btn btn-primary" id="review-start-btn">开始复习</button>
            <button class="btn btn-secondary" id="review-back-btn" style="margin-top:8px;">返回宗门</button>
        `;
        this.game.ui.overlay.appendChild(panel);

        document.getElementById('review-start-btn').addEventListener('click', () => { panel.remove(); this.showQuestion(); });
        document.getElementById('review-back-btn').addEventListener('click', () => { panel.remove(); this.game.enterHall(); });
    }

    showQuestion() {
        if (this.currentIndex >= this.questions.length) { this.showResult(); return; }

        const q = this.questions[this.currentIndex];
        const savedAnswer = this.answers[q.question_id] || null;
        const total = this.questions.length;
        const answered = Object.keys(this.answers).length;

        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.id = 'review-panel';
        panel.style.maxWidth = '520px';
        panel.innerHTML = `
            <div class="practice-header">
                <span class="practice-title">🔄 错题复习 ${this.currentIndex + 1}/${total}</span>
                <span class="practice-progress">已复习 ${answered} 题</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width:${(answered/total)*100}%;background:linear-gradient(90deg,var(--jade),var(--jade-light));"></div>
            </div>
            <div class="question-text">${this.game.ui.escapeHtml(q.question)}</div>
            <div class="options-container">
                ${Object.entries(q.options).map(([k, v]) =>
                    `<div class="option-btn ${savedAnswer === k ? 'selected' : ''}" data-value="${k}">
                        <span class="option-label">${k}</span>
                        <span class="option-text">${v}</span>
                    </div>`
                ).join('')}
            </div>
            <button class="btn btn-primary btn-sm" id="review-next-btn" ${savedAnswer ? '' : 'disabled'}>
                ${this.currentIndex < total - 1 ? '下一题 →' : '完成复习'}
            </button>
            <button class="btn btn-secondary btn-sm" id="review-exit-btn" style="margin-top:8px;">返回宗门</button>
        `;
        this.game.ui.overlay.appendChild(panel);

        panel.querySelectorAll('.option-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                panel.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                this.answers[q.question_id] = btn.dataset.value;
                document.getElementById('review-next-btn').disabled = false;
                this.persistSession();
            });
        });

        document.getElementById('review-next-btn').addEventListener('click', () => {
            panel.remove();
            this.showFeedback(q);
        });
        document.getElementById('review-exit-btn').addEventListener('click', () => {
            this.exitReview(panel);
        });
    }

    /** 答完一题立即显示对错反馈 */
    showFeedback(q) {
        const userAnswer = this.answers[q.question_id];
        const correct = userAnswer === q.correct_answer;

        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.id = 'review-feedback';
        panel.style.maxWidth = '480px';
        panel.style.borderColor = correct ? 'var(--jade)' : 'var(--cinnabar)';
        panel.innerHTML = `
            <div style="text-align:center;padding:16px 0;">
                <div style="font-size:36px;margin-bottom:8px;">${correct ? '✅' : '❌'}</div>
                <div style="font-size:16px;color:${correct ? 'var(--jade-light)' : 'var(--cinnabar)'};font-family:var(--font-title);">
                    ${correct ? '答对了！掌握度 +20' : '又错了，再记一次'}
                </div>
                ${!correct ? `
                <div style="margin-top:12px;padding:12px;background:rgba(192,57,43,0.08);border-radius:8px;text-align:left;">
                    <div style="font-size:13px;color:var(--gold-light);margin-bottom:4px;">正确答案：${q.correct_answer}</div>
                    <div style="font-size:13px;color:var(--parchment-dark);">${q.explanation || ''}</div>
                </div>` : ''}
            </div>
            <button class="btn btn-primary btn-sm" id="feedback-next-btn">
                ${this.currentIndex < this.questions.length - 1 ? '继续下一题' : '查看复习成果'}
            </button>
            <button class="btn btn-secondary btn-sm" id="feedback-exit-btn" style="margin-top:8px;">返回宗门</button>
        `;
        this.game.ui.overlay.appendChild(panel);

        document.getElementById('feedback-next-btn').addEventListener('click', () => {
            panel.remove();
            this.currentIndex++;
            this.persistSession();
            this.showQuestion();
        });
        document.getElementById('feedback-exit-btn').addEventListener('click', () => {
            this.exitReview(panel);
        });
    }

    async showResult() {
        this.game.ui.showLoading('汇总灵脉数据...');

        const answersList = Object.entries(this.answers).map(([qid, ans]) => ({
            question_id: qid, answer: ans,
        }));

        const res = await this.game.api.post('/review/submit', { answers: answersList });
        this.game.ui.hideLoading();

        const correct = res.success ? res.data.correct_count : 0;
        const total = this.questions.length;
        const accuracy = total > 0 ? Math.round(correct / total * 100) : 0;

        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.id = 'review-result';
        panel.innerHTML = `
            <div class="panel-title">📊 复习成果</div>
            <div style="text-align:center;padding:12px 0;">
                <div style="font-size:36px;color:var(--gold);font-weight:bold;">${correct}/${total}</div>
                <div style="font-size:13px;color:var(--parchment-dark);margin-top:4px;">正确率 ${accuracy}%</div>
                <div style="margin-top:12px;padding:12px;background:rgba(255,255,255,0.04);border-radius:8px;font-size:14px;color:var(--gold-light);">
                    ${accuracy >= 80 ? '善！错题已基本掌握。' : accuracy >= 50 ? '尚可，仍有部分错题需巩固。' : '错题较多，建议多复习几次。'}
                </div>
            </div>
            <button class="btn btn-primary" id="review-done-btn">返回宗门</button>
            <button class="btn btn-secondary" id="review-again-btn" style="margin-top:8px;">再来一轮</button>
        `;
        this.game.ui.overlay.appendChild(panel);
        this.clearSession();

        document.getElementById('review-done-btn').addEventListener('click', () => { panel.remove(); this.game.enterHall(); });
        document.getElementById('review-again-btn').addEventListener('click', () => { panel.remove(); this.startReview(); });
    }

    getSessionKey() {
        const userId = this.game.store.getState().user?.id || 'guest';
        return `levelup_session_review_${userId}`;
    }

    persistSession() {
        if (!this.questions?.length) return;
        const payload = {
            questions: this.questions,
            answers: this.answers,
            currentIndex: this.currentIndex,
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
        this.answers = data.answers || {};
        this.currentIndex = Math.max(0, Math.min(data.currentIndex || 0, this.questions.length - 1));
        this.results = null;
        this.game.scene.switchTo('practice');
        this.game.ui.hideAllPanels();
        this.showQuestion();
        return true;
    }

    clearSession() {
        localStorage.removeItem(this.getSessionKey());
    }
}
