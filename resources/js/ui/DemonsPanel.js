// LevelUp 英语修仙 - 心魔录面板（错题自动追踪）
export class DemonsPanel {
    constructor(game) { this.game = game; }

    /** 打开心魔录 */
    async show() {
        this.game.ui.showLoading('探查心魔...');
        const res = await this.game.api.get('/demons');
        this.game.ui.hideLoading();

        if (!res.success) { this.game.ui.showHermesBubble('心魔探查失败'); return; }

        const { demons, total } = res.data;
        this.game.ui.hideAllPanels();

        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.id = 'demons-panel';
        panel.style.maxWidth = '480px';
        panel.style.maxHeight = '80vh';
        panel.style.overflowY = 'auto';

        if (total === 0) {
            panel.innerHTML = `
                <div class="panel-title">🧘 心魔录</div>
                <div style="text-align:center;padding:20px;color:var(--jade-light);font-size:14px;">
                    ✨ 心魔已清，灵台清明。暂无待降服的心魔。
                </div>
                <button class="btn btn-secondary" id="demons-back-btn">返回</button>
            `;
            this.game.ui.overlay.appendChild(panel);
            document.getElementById('demons-back-btn').addEventListener('click', () => { panel.remove(); this.game.enterHall(); });
            return;
        }

        let html = `<div class="panel-title">🧘 心魔录 <span style="font-size:14px;color:var(--cinnabar);">(${total}条未降服)</span></div>
            <div style="font-size:12px;color:var(--parchment-dark);text-align:center;margin-bottom:12px;">
                答错的题目自动收入心魔录，会在后续修炼中自动出现
            </div>`;

        demons.forEach(({ demon, question }) => {
            const color = demon.wrong_count >= 5 ? 'var(--cinnabar)' : demon.wrong_count >= 3 ? 'var(--gold)' : 'var(--parchment-dark)';
            html += `
                <div style="padding:10px;margin-bottom:6px;background:rgba(255,255,255,0.03);border-radius:8px;border-left:3px solid ${color};">
                    <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--parchment-dark);margin-bottom:4px;">
                        <span>❌ 错${demon.wrong_count}次 ✓ 对${demon.reviewed_count}次</span>
                        <span style="color:${color};">掌握度 ${demon.mastery}%</span>
                    </div>
                    <div style="font-size:13px;color:var(--parchment);">${question ? this.game.ui.escapeHtml(question.question) : demon.question_id}</div>
                </div>`;
        });

        html += `<button class="btn btn-secondary" id="demons-back-btn" style="margin-top:8px;">返回宗门</button>`;
        if (total > 0) {
            html += `<button class="btn btn-secondary" id="demons-clear-btn" style="margin-top:8px;border-color:var(--cinnabar);color:var(--cinnabar);">清除已掌握心魔</button>`;
        }
        panel.innerHTML = html;
        this.game.ui.overlay.appendChild(panel);

        document.getElementById('demons-back-btn').addEventListener('click', () => { panel.remove(); this.game.enterHall(); });
        const clearBtn = document.getElementById('demons-clear-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', async () => {
                await this.game.api.post('/demons/clear');
                panel.remove();
                this.show();
            });
        }
    }
}
