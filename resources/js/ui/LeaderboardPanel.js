// LevelUp 英语修仙 - 排行榜面板
export class LeaderboardPanel {
    constructor(game) { this.game = game; }
    currentTab = 'realm';

    async show() {
        this.game.ui.hideAllPanels();
        this.game.ui.showLoading('查询宗门榜...');
        const res = await this.game.api.get('/leaderboard');
        this.game.ui.hideLoading();
        this.data = res.success ? res.data : { realm:[], exp:[], streak:[] };
        this.render();
    }

    render() {
        const existing = document.getElementById('leaderboard-panel');
        if (existing) existing.remove();

        const list = this.data[this.currentTab] || [];
        const tabNames = { realm:'境界榜', exp:'修为榜', streak:'连续榜' };

        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.id = 'leaderboard-panel';
        panel.innerHTML = `
            <div class="panel-title">🏅 宗门榜</div>
            <div style="display:flex;gap:6px;margin-bottom:12px;">
                ${Object.entries(tabNames).map(([k,v]) =>
                    `<button class="btn btn-sm ${this.currentTab===k?'btn-primary':'btn-secondary'}" data-lb-tab="${k}" style="flex:1;font-size:12px;padding:8px 4px;">${v}</button>`
                ).join('')}
            </div>
            <div style="max-height:360px;overflow-y:auto;">
                ${list.length === 0 ? '<div style="text-align:center;color:var(--parchment-dark);padding:24px;">暂无数据</div>' :
                list.map((item, i) => `
                    <div style="display:flex;align-items:center;gap:8px;padding:8px 10px;margin-bottom:4px;background:${i<3?'rgba(212,168,67,0.06)':''};border-radius:8px;">
                        <span style="width:24px;text-align:center;font-size:14px;color:${i===0?'var(--gold)':i===1?'var(--gold-light)':i===2?'var(--parchment)':'var(--parchment-dark)'};">${i<3 ? ['🥇','🥈','🥉'][i] : `#${i+1}`}</span>
                        <span style="flex:1;font-size:13px;color:var(--parchment);">${this.game.ui.escapeHtml(item.nickname)}</span>
                        <span style="font-size:12px;color:var(--gold-light);">
                            ${this.currentTab==='realm' ? `${this.game.ui.getRealmName(item.realm)}·${item.realm_stage}重` :
                              this.currentTab==='exp' ? `${item.exp}修为` :
                              `${item.streak_days}天`}
                        </span>
                    </div>
                `).join('')}
            </div>
            <button class="btn btn-secondary" id="lb-back-btn" style="margin-top:8px;">返回宗门</button>
        `;
        this.game.ui.overlay.appendChild(panel);

        panel.querySelectorAll('[data-lb-tab]').forEach(btn => {
            btn.addEventListener('click', () => { this.currentTab = btn.dataset.lbTab; this.render(); });
        });
        document.getElementById('lb-back-btn').addEventListener('click', () => { panel.remove(); this.game.ui.showHallScene(); });
    }
}
