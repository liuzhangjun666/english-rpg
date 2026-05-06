// LevelUp 英语修仙 - 家长端（极简三卡 + 分享奖励）
export class ParentPanel {
    constructor(game) { this.game = game; this.shareInfo = null; }

    async show() {
        this.game.ui.showLoading('生成修炼报告...');
        const res = await this.game.api.get('/parent/dashboard');
        this.game.ui.hideLoading();

        if (!res.success) { this.game.ui.showHermesBubble('获取报告失败'); return; }

        this.render(res.data);
    }

    render(d) {
        this.game.ui.hideAllPanels();
        const hallEntry = document.getElementById('hall-entry');
        if (hallEntry) hallEntry.classList.add('hidden');

        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.id = 'parent-panel';
        panel.style.maxWidth = '440px';
        panel.innerHTML = `
            <div class="panel-title">📋 学习周报</div>

            <!-- 卡1：今日概况 -->
            <div style="padding:14px;background:rgba(255,255,255,0.04);border-radius:12px;margin-bottom:10px;">
                <div style="font-size:13px;color:var(--gold-light);margin-bottom:10px;">📊 今日修炼</div>
                <div style="display:flex;gap:8px;">
                    <div style="flex:1;text-align:center;padding:8px;background:rgba(255,255,255,0.04);border-radius:8px;">
                        <div style="font-size:22px;color:var(--gold);font-weight:bold;">${d.card1_today.daily_minutes}</div>
                        <div style="font-size:11px;color:var(--parchment-dark);">学习分钟</div>
                    </div>
                    <div style="flex:1;text-align:center;padding:8px;background:rgba(255,255,255,0.04);border-radius:8px;">
                        <div style="font-size:22px;color:var(--gold);font-weight:bold;">${d.card1_today.questions_done}</div>
                        <div style="font-size:11px;color:var(--parchment-dark);">完成题数</div>
                    </div>
                    <div style="flex:1;text-align:center;padding:8px;background:rgba(255,255,255,0.04);border-radius:8px;">
                        <div style="font-size:22px;color:${d.card1_today.accuracy >= 70 ? 'var(--jade-light)' : 'var(--cinnabar)'};font-weight:bold;">${d.card1_today.accuracy}%</div>
                        <div style="font-size:11px;color:var(--parchment-dark);">正确率</div>
                    </div>
                </div>
            </div>

            <!-- 卡2：修为进度 -->
            <div style="padding:14px;background:rgba(255,255,255,0.04);border-radius:12px;margin-bottom:10px;">
                <div style="font-size:13px;color:var(--gold-light);margin-bottom:8px;">📈 修炼进度</div>
                <div style="display:flex;justify-content:space-between;font-size:13px;">
                    <span style="color:var(--parchment);">${d.card2_progress.realm_name} · ${d.card2_progress.stage}重</span>
                    <span style="color:var(--parchment-dark);">🔥 连续 ${d.card2_progress.streak_days} 天</span>
                </div>
                <div style="margin-top:8px;height:6px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;">
                    <div style="height:100%;width:${Math.min(100, (d.card2_progress.exp % 1000) / 10)}%;background:linear-gradient(90deg,var(--gold),var(--gold-light));border-radius:3px;"></div>
                </div>
            </div>

            <!-- 卡3：提醒 -->
            ${d.card3_tip ? `
            <div style="padding:14px;background:rgba(192,57,43,0.08);border-radius:12px;margin-bottom:10px;border:1px solid rgba(192,57,43,0.2);">
                <div style="font-size:13px;color:var(--cinnabar);margin-bottom:6px;">💡 温馨提示</div>
                <div style="font-size:13px;color:var(--parchment-dark);line-height:1.6;">${d.card3_tip.message}</div>
            </div>` : `
            <div style="padding:14px;background:rgba(78,192,122,0.08);border-radius:12px;margin-bottom:10px;border:1px solid rgba(78,192,122,0.2);">
                <div style="font-size:13px;color:var(--jade-light);">✅ 今日表现良好，继续保持。</div>
            </div>`}

            <button class="btn btn-secondary" id="parent-share-btn" style="margin-top:4px;">📤 分享周报</button>
            <button class="btn btn-secondary" id="parent-back-btn" style="margin-top:8px;">返回宗门</button>
        `;
        this.game.ui.overlay.appendChild(panel);

        // 分享开关
        const toggle = document.getElementById('share-toggle');
        if (toggle) {
            toggle.addEventListener('change', async () => {
                await this.game.api.post('/share/toggle');
            });
        }

        // 一键分享
        document.getElementById('parent-share-btn')?.addEventListener('click', () => this.shareReport(d));
        document.getElementById('parent-back-btn').addEventListener('click', () => { panel.remove(); if (hallEntry) hallEntry.classList.remove('hidden'); });
    }

    shareReport(d) {
        const tip = d.card3_tip ? d.card3_tip.message : '今日表现良好，继续保持！';
        const text = `【LevelUp英语修仙 · 学习周报】
📊 今日：${d.card1_today.daily_minutes}分钟 · ${d.card1_today.questions_done}题 · 正确率${d.card1_today.accuracy}%
📈 进度：${d.card2_progress.realm_name} · ${d.card2_progress.stage}重 · 连续${d.card2_progress.streak_days}天
💡 ${tip}

—— 来自 LevelUp英语修仙`;

        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                this.game.ui.showHermesBubble('📋 复制成功！可粘贴到微信', 3000);
            }).catch(() => this.fallbackCopy(text));
        } else {
            this.fallbackCopy(text);
        }
    }

    fallbackCopy(text) {
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.cssText = 'position:fixed;left:-9999px';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); this.game.ui.showHermesBubble('📋 复制成功，快去分享吧！', 4000); }
        catch (e) { alert('请手动复制：\n\n' + text); }
        document.body.removeChild(ta);
    }
}
