// LevelUp - Heart Demons Panel (wrong-question notebook + self review)
export class DemonsPanel {
    constructor(game) {
        this.game = game;
        this.demons = [];
        this.answers = {};
        this.currentIndex = 0;
        this.feedbackShown = false;
    }

    async show() {
        this.game.ui.showLoading('探查心魔中...');
        const res = await this.game.api.get('/demons');
        this.game.ui.hideLoading();

        if (!res.success) {
            this.game.ui.showHermesBubble(res.message || '心魔录加载失败');
            return;
        }

        const demons = Array.isArray(res.data?.demons) ? res.data.demons : [];
        this.demons = demons.filter((item) => item?.question?.question_id && item?.question?.options);
        this.answers = {};
        this.currentIndex = 0;
        this.feedbackShown = false;

        this.game.ui.hideAllPanels();
        this.renderList(res.data?.total || this.demons.length);
    }

    renderList(total) {
        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.id = 'demons-panel';
        panel.style.maxWidth = '520px';
        panel.style.maxHeight = '80vh';
        panel.style.overflowY = 'auto';

        if (!this.demons.length) {
            panel.innerHTML = `
                <div class="panel-title">心魔录</div>
                <div style="text-align:center;padding:18px 10px;color:var(--jade-light);line-height:1.8;">
                    当前没有未降服心魔。<br>
                    各功能答错的题目会自动进入心魔录。
                </div>
                <button class="btn btn-secondary" id="demons-back-btn">返回</button>
            `;
            this.game.ui.overlay.appendChild(panel);
            document.getElementById('demons-back-btn')?.addEventListener('click', () => {
                panel.remove();
                this.game.enterHall();
            });
            return;
        }

        let html = `
            <div class="panel-title">心魔录 <span style="font-size:13px;color:var(--cinnabar);">(${total})</span></div>
            <div style="font-size:12px;color:var(--parchment-dark);line-height:1.7;margin-bottom:10px;">
                这里是你的错题本。<br>
                可在心魔录中作答消除，也可在后续修炼中答对后消除。
            </div>
        `;

        this.demons.forEach(({ demon, question }, idx) => {
            const color = demon.wrong_count >= 5 ? 'var(--cinnabar)' : demon.wrong_count >= 3 ? 'var(--gold)' : 'var(--parchment-dark)';
            html += `
                <div style="padding:10px;margin-bottom:8px;background:rgba(255,255,255,0.03);border-radius:8px;border-left:3px solid ${color};">
                    <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--parchment-dark);margin-bottom:4px;">
                        <span>#${idx + 1} · 错 ${demon.wrong_count} · 对 ${demon.reviewed_count}</span>
                        <span style="color:${color};">掌握度 ${demon.mastery}%</span>
                    </div>
                    <div style="font-size:13px;color:var(--parchment);">${this.game.ui.escapeHtml(question.question || question.question_id)}</div>
                </div>
            `;
        });

        html += `
            <button class="btn btn-primary" id="demons-start-btn">开始降魔作答</button>
            <button class="btn btn-secondary" id="demons-clear-btn" style="margin-top:8px;border-color:var(--cinnabar);color:var(--cinnabar);">清理已掌握心魔</button>
            <button class="btn btn-secondary" id="demons-back-btn" style="margin-top:8px;">返回</button>
        `;

        panel.innerHTML = html;
        this.game.ui.overlay.appendChild(panel);

        document.getElementById('demons-start-btn')?.addEventListener('click', () => {
            panel.remove();
            this.renderQuestion();
        });
        document.getElementById('demons-clear-btn')?.addEventListener('click', async () => {
            await this.game.api.post('/demons/clear');
            panel.remove();
            this.show();
        });
        document.getElementById('demons-back-btn')?.addEventListener('click', () => {
            panel.remove();
            this.game.enterHall();
        });
    }

    renderQuestion() {
        const entry = this.demons[this.currentIndex];
        if (!entry) {
            this.submitReview();
            return;
        }

        const { question, demon } = entry;
        const total = this.demons.length;
        const selected = this.answers[question.question_id] || null;
        const options = this.normalizeOptions(question.options);
        const hasFeedback = this.feedbackShown && !!selected;

        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.id = 'demons-panel';
        panel.style.maxWidth = '520px';
        panel.innerHTML = `
            <div class="practice-header">
                <span class="practice-title">心魔录作答</span>
                <span class="practice-progress">${this.currentIndex + 1}/${total}</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width:${(this.currentIndex / total) * 100}%"></div>
            </div>
            <div style="font-size:12px;color:var(--parchment-dark);margin:8px 0 10px;">
                错 ${demon.wrong_count} · 对 ${demon.reviewed_count} · 掌握度 ${demon.mastery}%
            </div>
            <div class="question-text">${this.game.ui.escapeHtml(question.question || '')}</div>
            <div class="options-container">
                ${Object.entries(options).map(([key, text]) => `
                    <div class="option-btn ${selected === key ? 'selected' : ''}" data-value="${this.game.ui.escapeHtml(key)}">
                        <span class="option-label">${this.game.ui.escapeHtml(key)}</span>
                        <span class="option-text">${this.game.ui.escapeHtml(text)}</span>
                    </div>
                `).join('')}
            </div>
            <div class="practice-actions">
                <button class="btn btn-secondary btn-sm" id="demons-exit-btn">退出</button>
                <button class="btn btn-primary btn-sm" id="demons-next-btn" ${hasFeedback ? '' : 'disabled'}>
                    ${this.currentIndex < total - 1 ? '下一题' : '提交结果'}
                </button>
            </div>
        `;
        this.game.ui.overlay.appendChild(panel);

        const optionBtns = panel.querySelectorAll('.option-btn');
        if (hasFeedback) {
            optionBtns.forEach((btn) => {
                if (btn.dataset.value === selected) {
                    btn.classList.add(selected === question.correct_answer ? 'answer-correct' : 'answer-wrong');
                }
                if (btn.dataset.value === question.correct_answer) {
                    btn.classList.add('answer-correct');
                }
                btn.style.pointerEvents = 'none';
            });
        }

        optionBtns.forEach((btn) => {
            btn.addEventListener('click', () => {
                if (this.feedbackShown) return;
                optionBtns.forEach((b) => b.classList.remove('selected'));
                btn.classList.add('selected');

                const value = btn.dataset.value;
                const correct = value === question.correct_answer;
                this.answers[question.question_id] = value;
                optionBtns.forEach((b) => b.style.pointerEvents = 'none');

                if (correct) {
                    btn.classList.add('answer-correct');
                } else {
                    btn.classList.add('answer-wrong');
                    optionBtns.forEach((b) => {
                        if (b.dataset.value === question.correct_answer) {
                            b.classList.add('answer-correct');
                        }
                    });
                }

                this.feedbackShown = true;
                const nextBtn = document.getElementById('demons-next-btn');
                if (nextBtn) nextBtn.disabled = false;
            });
        });

        document.getElementById('demons-next-btn')?.addEventListener('click', () => {
            panel.remove();
            this.feedbackShown = false;
            this.currentIndex++;
            this.renderQuestion();
        });

        document.getElementById('demons-exit-btn')?.addEventListener('click', () => {
            panel.remove();
            this.show();
        });
    }

    async submitReview() {
        const answers = Object.entries(this.answers).map(([question_id, answer]) => ({
            question_id,
            answer,
        }));

        if (!answers.length) {
            this.show();
            return;
        }

        this.game.ui.showLoading('提交心魔作答中...');
        const res = await this.game.api.post('/demons/review-submit', { answers });
        this.game.ui.hideLoading();

        if (!res.success) {
            this.game.ui.showHermesBubble(res.message || '心魔作答提交失败');
            this.show();
            return;
        }

        const correct = Number(res.data?.correct_count || 0);
        const total = Number(res.data?.total || answers.length);
        const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.id = 'demons-panel';
        panel.style.maxWidth = '480px';
        panel.innerHTML = `
            <div class="panel-title">心魔作答结果</div>
            <div style="text-align:center;padding:12px 0;color:var(--parchment-dark);line-height:1.8;">
                <div style="font-size:32px;color:var(--gold);font-family:var(--font-title);">${correct}/${total}</div>
                <div>正确率 ${accuracy}%</div>
                <div style="margin-top:6px;color:var(--jade-light);">同一心魔累计答对 3 次即可消除。</div>
            </div>
            <button class="btn btn-primary" id="demons-refresh-btn">返回心魔录</button>
            <button class="btn btn-secondary" id="demons-back-hall-btn" style="margin-top:8px;">返回宗门</button>
        `;
        this.game.ui.overlay.appendChild(panel);

        document.getElementById('demons-refresh-btn')?.addEventListener('click', () => {
            panel.remove();
            this.show();
        });
        document.getElementById('demons-back-hall-btn')?.addEventListener('click', () => {
            panel.remove();
            this.game.enterHall();
        });
    }

    normalizeOptions(options) {
        if (Array.isArray(options)) {
            const labels = ['A', 'B', 'C', 'D'];
            return options.reduce((acc, item, idx) => {
                const key = labels[idx] || String(idx + 1);
                acc[key] = item;
                return acc;
            }, {});
        }
        if (options && typeof options === 'object') {
            return options;
        }
        return {};
    }
}
