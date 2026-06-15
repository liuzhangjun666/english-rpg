// [DEPRECATED] 该原生面板已废弃，请使用 Vue 3 组件 MallView.vue 代替
// LevelUp 英语修仙 - 灵石商城面板
export class MallPanel {
    constructor(game) {
        this.game = game;
        this.refreshTimer = null;
    }

    async show() {
        this.clearRefreshTimer();
        this.game.ui.hideAllPanels();
        this.game.ui.showLoading('打开坊市...');
        const res = await this.game.api.get('/mall/items');
        this.game.ui.hideLoading();

        const items = res.success && Array.isArray(res.data?.items) ? res.data.items : [];
        const user = this.game.store.getState().user;
        const stones = Number(user?.spirit_stone || 0);

        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.id = 'mall-panel';
        panel.innerHTML = `
            <div class="panel-title">🏪 坊市</div>
            <div style="text-align:center;margin-bottom:12px;font-size:13px;color:var(--gold-light);">灵石：💎 ${stones}</div>
            <div style="max-height:360px;overflow-y:auto;">
                ${items.length === 0 ? '<div style="text-align:center;color:var(--parchment-dark);padding:24px;">坊市暂无商品</div>' :
                items.map(item => {
                    const itemId = this.game.ui.escapeHtml(item.id);
                    const price = Number(item.price || 0);
                    return `
                    <div style="display:flex;align-items:center;gap:10px;padding:12px;margin-bottom:6px;background:rgba(255,255,255,0.03);border-radius:10px;border:1px solid rgba(255,255,255,0.06);">
                        <span style="font-size:28px;">${this.game.ui.escapeHtml(item.icon || '📦')}</span>
                        <div style="flex:1;">
                            <div style="font-size:13px;color:var(--parchment);">${this.game.ui.escapeHtml(item.name)}</div>
                            <div style="font-size:11px;color:var(--parchment-dark);">${this.game.ui.escapeHtml(item.description || '')}</div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:13px;color:var(--gold);">💎 ${price}</div>
                            <button class="btn btn-primary btn-sm mall-buy-btn" data-id="${itemId}" data-price="${price}" style="margin-top:4px;font-size:11px;padding:4px 10px;" ${stones < price ? 'disabled' : ''}>购买</button>
                        </div>
                    </div>
                `; }).join('')}
            </div>
            <div id="mall-msg" style="text-align:center;font-size:12px;margin:4px 0;min-height:18px;color:var(--cinnabar);"></div>
            <button class="btn btn-secondary" id="mall-back-btn">返回宗门</button>
        `;
        this.game.ui.overlay.appendChild(panel);

        panel.querySelectorAll('.mall-buy-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (btn.disabled) return;
                const id = btn.dataset.id;
                const price = Number.parseInt(btn.dataset.price, 10);
                if (stones < price) { document.getElementById('mall-msg').textContent = '灵石不足！'; return; }
                const res = await this.game.api.post('/mall/buy', { item_id: id });
                if (res.success) {
                    document.getElementById('mall-msg').textContent = '✅ 购买成功！';
                    if (res.data.user) this.game.store.updateUser(res.data.user);
                    // 刷新商城（更新灵石）
                    this.refreshTimer = setTimeout(() => {
                        this.refreshTimer = null;
                        if (!panel.isConnected || document.getElementById('mall-panel') !== panel) return;
                        panel.remove();
                        this.show();
                    }, 1200);
                } else {
                    document.getElementById('mall-msg').textContent = res.message || '购买失败';
                }
            });
        });
        document.getElementById('mall-back-btn').addEventListener('click', () => {
            this.clearRefreshTimer();
            panel.remove();
            this.game.ui.showHallScene();
        });
    }

    clearRefreshTimer() {
        if (!this.refreshTimer) return;
        clearTimeout(this.refreshTimer);
        this.refreshTimer = null;
    }

    cleanup() {
        this.clearRefreshTimer();
    }
}
