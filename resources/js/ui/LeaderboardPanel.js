// [DEPRECATED] 该原生面板已废弃，请使用 Vue 3 组件 LeaderboardView.vue 代替
export class LeaderboardPanel {
    constructor(game) {
        this.game = game;
        this.currentTab = 'streak';
        this.cache = {};
    }

    async show() {
        this.game.ui.hideAllPanels();
        await this.loadAndRender(this.currentTab, true);
    }

    async loadAndRender(tab, withLoading = false) {
        if (withLoading) this.game.ui.showLoading('加载宗门榜...');
        const res = await this.game.api.get(`/leaderboard?type=${encodeURIComponent(tab)}`);
        if (withLoading) this.game.ui.hideLoading();

        if (res?.success) {
            this.cache[tab] = res.data;
            this.currentTab = tab;
            this.render();
            return;
        }

        this.game.ui.showHermesBubble(res?.message || '获取宗门榜失败');
    }

    render() {
        const existing = document.getElementById('leaderboard-panel');
        if (existing) existing.remove();

        const data = this.cache[this.currentTab] || { leaderboard: [], my_rank: null };
        const list = data.leaderboard || [];
        const tabs = {
            streak: '道心连修',
            volume: '修炼勤勉',
            accuracy: '悟性命中',
            demon_clear: '心魔净化',
            realm: '境界进境',
        };

        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.id = 'leaderboard-panel';
        panel.style.maxWidth = '460px';
        panel.innerHTML = `
            <div class="panel-title">📊 宗门榜</div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:12px;">
                ${Object.entries(tabs).map(([key, title]) => `
                    <button class="btn btn-sm ${this.currentTab === key ? 'btn-primary' : 'btn-secondary'}" data-lb-tab="${key}" style="font-size:12px;padding:8px 4px;">
                        ${this.game.ui.escapeHtml(title)}
                    </button>
                `).join('')}
            </div>
            <div style="font-size:12px;color:var(--parchment-dark);margin-bottom:8px;">
                ${data.my_rank ? `你的名次：第 ${data.my_rank} 位（超过 ${data.my_percentile || 1}% 道友）` : '继续修炼，登上宗门榜'}
            </div>
            <div style="max-height:360px;overflow-y:auto;">
                ${list.length === 0 ? '<div style="text-align:center;color:var(--parchment-dark);padding:24px;">暂无数据</div>' : list.map((item, i) => `
                    <div style="display:flex;align-items:center;gap:8px;padding:8px 10px;margin-bottom:4px;background:${i < 3 ? 'rgba(212,168,67,0.06)' : 'rgba(255,255,255,0.02)'};border-radius:8px;">
                        <span style="width:28px;text-align:center;color:${i===0?'var(--gold)':i===1?'var(--gold-light)':i===2?'var(--parchment)':'var(--parchment-dark)'};">
                            ${i < 3 ? ['🥇', '🥈', '🥉'][i] : `#${i + 1}`}
                        </span>
                        <span style="flex:1;font-size:13px;color:var(--parchment);">${this.game.ui.escapeHtml(item.nickname || '匿名道友')}</span>
                        <span style="font-size:12px;color:var(--gold-light);">${this.game.ui.escapeHtml(item.metric_text || String(item.metric || ''))}</span>
                    </div>
                `).join('')}
            </div>
            <button class="btn btn-secondary" id="lb-back-btn" style="margin-top:10px;">返回宗门</button>
        `;
        this.game.ui.overlay.appendChild(panel);

        panel.querySelectorAll('[data-lb-tab]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const tab = btn.dataset.lbTab;
                if (this.currentTab === tab && this.cache[tab]) return;
                if (this.cache[tab]) {
                    this.currentTab = tab;
                    this.render();
                    return;
                }
                await this.loadAndRender(tab, true);
            });
        });

        document.getElementById('lb-back-btn')?.addEventListener('click', () => {
            panel.remove();
            this.game.enterHall();
        });
    }
}
