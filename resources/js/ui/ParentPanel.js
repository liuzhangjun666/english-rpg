export class ParentPanel {
    constructor(game) {
        this.game = game;
    }

    async show() {
        this.game.ui.showLoading('生成护道人札记...');
        const [dashboardRes, analyticsRes] = await Promise.all([
            this.game.api.get('/parent/dashboard'),
            this.game.api.get('/parent/report?type=analytics&days=30'),
        ]);
        this.game.ui.hideLoading();

        if (!dashboardRes?.success) {
            this.game.ui.showHermesBubble('获取护道人札记失败');
            return;
        }

        const dashboard = dashboardRes.data || {};
        const analytics = analyticsRes?.success ? analyticsRes.data : (dashboard.analytics || {});
        this.render(dashboard, analytics);
    }

    render(dashboard, analytics) {
        this.game.ui.hideAllPanels();
        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.id = 'parent-panel';
        panel.style.maxWidth = '520px';

        const today = dashboard.card1_today || {};
        const progress = dashboard.card2_progress || {};
        const tip = dashboard.card3_tip?.message || '今日修炼平稳，道心可嘉。';
        const trend7 = Array.isArray(analytics.daily_trend) ? analytics.daily_trend.slice(-7) : [];
        const maxCount = Math.max(1, ...trend7.map((x) => Number(x.count || 0)));
        const weakTags = Array.isArray(analytics.weak_tags) ? analytics.weak_tags.slice(0, 5) : [];
        const typeAcc = analytics.type_accuracy || {};

        panel.innerHTML = `
            <div class="panel-title">📋 护道人札记</div>

            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px;">
                <div style="padding:10px;border-radius:10px;background:rgba(255,255,255,0.04);text-align:center;">
                    <div style="font-size:20px;color:var(--gold);font-weight:700;">${Number(today.questions_done || 0)}</div>
                    <div style="font-size:11px;color:var(--parchment-dark);">今日修炼题数</div>
                </div>
                <div style="padding:10px;border-radius:10px;background:rgba(255,255,255,0.04);text-align:center;">
                    <div style="font-size:20px;color:${Number(today.accuracy || 0) >= 70 ? 'var(--jade-light)' : 'var(--cinnabar)'};font-weight:700;">${Number(today.accuracy || 0)}%</div>
                    <div style="font-size:11px;color:var(--parchment-dark);">今日悟性命中</div>
                </div>
                <div style="padding:10px;border-radius:10px;background:rgba(255,255,255,0.04);text-align:center;">
                    <div style="font-size:20px;color:var(--gold);font-weight:700;">${Number(progress.streak_days || 0)}</div>
                    <div style="font-size:11px;color:var(--parchment-dark);">连修天数</div>
                </div>
            </div>

            <div style="padding:10px 12px;border:1px solid rgba(212,168,67,0.2);border-radius:10px;background:rgba(255,255,255,0.03);margin-bottom:10px;">
                <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--parchment-dark);margin-bottom:4px;">
                    <span>当前境界</span>
                    <span>${this.game.ui.escapeHtml(progress.realm_name || '')} · ${Number(progress.stage || 1)}重</span>
                </div>
                <div style="font-size:12px;color:var(--parchment-dark);">建议：每日保持 10-20 分钟稳修，优先温故复盘心魔题。</div>
            </div>

            <div style="padding:12px;border-radius:10px;background:rgba(255,255,255,0.03);margin-bottom:10px;">
                <div style="font-size:12px;color:var(--gold-light);margin-bottom:8px;">近7日修炼题量</div>
                <div style="display:flex;align-items:flex-end;gap:6px;height:84px;">
                    ${trend7.map((item) => `
                        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;">
                            <div title="${item.date} · ${item.count}题" style="width:100%;height:${Math.max(6, Math.round((Number(item.count || 0) / maxCount) * 58))}px;background:linear-gradient(180deg, rgba(212,168,67,0.9), rgba(212,168,67,0.45));border-radius:6px 6px 2px 2px;"></div>
                            <div style="font-size:10px;color:var(--parchment-dark);">${String(item.date || '').slice(5)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:10px;">
                <div style="padding:10px;border-radius:10px;background:rgba(255,255,255,0.03);">
                    <div style="font-size:12px;color:var(--gold-light);margin-bottom:6px;">功法命中率</div>
                    <div style="font-size:12px;color:var(--parchment-dark);line-height:1.8;">
                        <div>词汇：${Number(typeAcc.vocab || 0)}%</div>
                        <div>语法：${Number(typeAcc.grammar || 0)}%</div>
                        <div>阅读：${Number(typeAcc.reading || 0)}%</div>
                        <div>听力：${Number(typeAcc.listening || 0)}%</div>
                    </div>
                </div>
                <div style="padding:10px;border-radius:10px;background:rgba(255,255,255,0.03);">
                    <div style="font-size:12px;color:var(--gold-light);margin-bottom:6px;">心魔执念（前5）</div>
                    <div style="font-size:12px;color:var(--parchment-dark);line-height:1.8;">
                        ${weakTags.length ? weakTags.map((t) => `<div>${this.game.ui.escapeHtml(t.tag)}（误${Number(t.wrong_count || 0)}）</div>`).join('') : '<div>暂无明显执念</div>'}
                    </div>
                </div>
            </div>

            <div style="padding:10px;border-radius:10px;border:1px solid rgba(192,57,43,0.2);background:rgba(192,57,43,0.08);font-size:12px;color:var(--parchment-dark);margin-bottom:10px;">
                💡 护道人建议：${this.game.ui.escapeHtml(tip)}
            </div>

            <button class="btn btn-secondary" id="parent-share-btn">📤 复制护道人札记</button>
            <button class="btn btn-secondary" id="parent-back-btn" style="margin-top:8px;">返回宗门</button>
        `;
        this.game.ui.overlay.appendChild(panel);

        document.getElementById('parent-share-btn')?.addEventListener('click', () => this.shareReport(today, progress, analytics, tip));
        document.getElementById('parent-back-btn')?.addEventListener('click', () => {
            panel.remove();
            this.game.enterHall();
        });
    }

    shareReport(today, progress, analytics, tip) {
        const text = `【LevelUp 护道人札记】
今日修炼题数：${Number(today.questions_done || 0)} 题
今日悟性命中：${Number(today.accuracy || 0)}%
连修天数：${Number(progress.streak_days || 0)} 天
30日累计修炼：${Number(analytics.total_questions || 0)} 题
30日整体命中：${Number(analytics.accuracy || 0)}%
建议：${tip}`;

        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(text)
                .then(() => this.game.ui.showHermesBubble('护道人札记已复制，可转发给护道人群', 2800))
                .catch(() => this.fallbackCopy(text));
            return;
        }
        this.fallbackCopy(text);
    }

    fallbackCopy(text) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;left:-9999px';
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            this.game.ui.showHermesBubble('护道人札记已复制', 2800);
        } catch {
            alert(text);
        }
        document.body.removeChild(ta);
    }
}
