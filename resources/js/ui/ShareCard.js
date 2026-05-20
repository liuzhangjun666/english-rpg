// LevelUp 英语修仙 - 天道认证卡分享组件（PRD 11.4）
// 高光时刻自动弹出分享窗
export class ShareCard {
    constructor(game) { this.game = game; }

    /**
     * 渡劫成功 → 天道认证卡
     * @param {object} data - { grade, score, realm_new, grade_name, streak_days, time_spent }
     */
    showExamCard(data) {
        const grades = { S:'天道认可 · 真龙之姿', A:'上等资质 · 人中龙凤', B:'根基扎实 · 后劲可期', C:'初窥门径 · 继续努力', D:'差强人意 · 再接再厉' };
        const gradeStr = grades[data.grade] || '';
        const texts = {
            S: '"百年难遇的修炼奇才！"',
            A: '"天资聪颖，前途无量！"',
            B: '"稳步提升，未来可期。"',
            C: '"勤能补拙，继续修炼。"',
            D: '"路漫漫其修远兮。"',
        };

        const shareText = `🎮 我刚渡劫成功了！【${data.realm_new} · ${data.grade}级评价】\n\n${gradeStr}\n${texts[data.grade] || ''}\n\n正确率：${data.score}%\n连续修炼：${data.streak_days}天\n\n用英语修仙，成就更好的自己！`;

        this.showPopup(
            '⚔️ 天道认证 ⚔️',
            `🎉 恭喜突破【${data.realm_new}】！`,
            `评价：${data.grade}级（${gradeStr}）`,
            [
                `正确率：${data.score}%`,
                data.streak_days ? `🔥 连续修炼第${data.streak_days}天` : '',
                `用时：${data.time_spent}分钟`,
                texts[data.grade] || '',
            ].filter(Boolean),
            shareText,
        );
    }

    /**
     * 关卡通关卡
     * @param {object} data - { level_id, accuracy, exp_gained, title }
     */
    showLevelCard(data) {
        const shareText = `📖 我在 LevelUp 英语修仙闯关成功！\n\n关卡：${data.title}\n正确率：${data.accuracy}%\n获得修为：+${data.exp_gained}\n\n一起来修炼吧！`;

        this.showPopup(
            '📖 闯关成功',
            `完成【${data.title}】`,
            `正确率 ${data.accuracy}% · 修为 +${data.exp_gained}`,
            [],
            shareText,
        );
    }

    /** 通用分享弹窗 */
    showPopup(title, subtitle, desc, details, shareText) {
        const existing = document.getElementById('share-card-popup');
        if (existing) existing.remove();

        const popup = document.createElement('div');
        const safeTitle = this.escapeHtml(title);
        const safeSubtitle = this.escapeHtml(subtitle);
        const safeDesc = this.escapeHtml(desc);
        popup.id = 'share-card-popup';
        popup.style.cssText = `
            position:fixed;top:0;left:0;width:100%;height:100%;z-index:300;
            background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;
            animation:fadeIn 0.3s ease;
        `;
        popup.innerHTML = `
            <div style="background:linear-gradient(135deg,#1a1a2e,#2d2d44);border:2px solid var(--gold);border-radius:20px;padding:28px;max-width:360px;width:88vw;box-shadow:0 16px 48px rgba(0,0,0,0.6);text-align:center;">
                <div style="font-size:32px;margin-bottom:8px;">${safeTitle}</div>
                <div style="font-family:var(--font-title);font-size:18px;color:var(--gold);margin-bottom:4px;">${safeSubtitle}</div>
                <div style="font-size:13px;color:var(--gold-light);margin-bottom:16px;">${safeDesc}</div>
                ${details.length > 0 ? `<div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:12px;margin-bottom:16px;text-align:left;font-size:13px;color:var(--parchment-dark);line-height:1.8;">
                    ${details.map(d => `<div>${this.escapeHtml(d)}</div>`).join('')}
                </div>` : ''}
                <div style="font-size:11px;color:var(--parchment-dark);margin-bottom:16px;">🎁 分享即可获得灵力奖励</div>
                <button id="share-do-btn" style="width:100%;padding:12px;background:linear-gradient(135deg,var(--gold),#b8922e);border:none;border-radius:10px;color:var(--ink);font-family:var(--font-title);font-size:15px;font-weight:bold;cursor:pointer;">📤 分享到微信</button>
                <button id="share-close-btn" style="width:100%;padding:10px;margin-top:8px;background:transparent;border:1px solid rgba(212,168,67,0.3);border-radius:10px;color:var(--parchment-dark);font-size:13px;cursor:pointer;">稍后再说</button>
            </div>
        `;
        document.body.appendChild(popup);

        popup.querySelector('#share-do-btn').addEventListener('click', () => {
            if (navigator.clipboard?.writeText) {
                navigator.clipboard.writeText(shareText).then(() => {
                    popup.remove();
                    this.game.ui.showHermesBubble('📋 已复制天道认证！快去分享给好友吧 🎉', 5000);
                });
            } else {
                prompt('复制以下内容分享：', shareText);
            }
        });
        popup.querySelector('#share-close-btn').addEventListener('click', () => popup.remove());
    }

    escapeHtml(str) {
        return this.game.ui.escapeHtml(str);
    }
}
