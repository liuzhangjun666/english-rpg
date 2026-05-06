// LevelUp 英语修仙 - 成就系统面板
const ACHIEVEMENT_LIST = [
    { id:'first_practice',  title:'初入练功房',       desc:'完成第一次修炼',             icon:'📖', cond: c=>c.total_practice>=1 },
    { id:'hundred_questions', title:'百题斩',         desc:'累计完成100道题',            icon:'⚔️', cond: c=>c.total_questions>=100 },
    { id:'five_hundred_q', title:'五百题斩',          desc:'累计完成500道题',            icon:'⚔️', cond: c=>c.total_questions>=500 },
    { id:'thousand_q',     title:'千题宗师',          desc:'累计完成1000道题',           icon:'🏆', cond: c=>c.total_questions>=1000 },
    { id:'streak_3',       title:'三花聚顶',          desc:'连续修炼3天',               icon:'🌸', cond: c=>c.streak_days>=3 },
    { id:'streak_7',       title:'七星连珠',          desc:'连续修炼7天',               icon:'⭐', cond: c=>c.streak_days>=7 },
    { id:'streak_30',      title:'月满乾坤',          desc:'连续修炼30天',              icon:'🌙', cond: c=>c.streak_days>=30 },
    { id:'exam_s',         title:'天道认可',          desc:'渡劫获得S级评价',           icon:'👑', cond: c=>c.exam_s_count>=1 },
    { id:'exam_a',         title:'青云直上',          desc:'渡劫获得A级以上评价3次',      icon:'☁️', cond: c=>c.exam_a_count>=3 },
    { id:'realm_l3',       title:'练气登堂',          desc:'达到练气中期(L3)',           icon:'🌊', cond: c=>c.top_realm_idx>=3 },
    { id:'realm_l6',       title:'练气入室',          desc:'达到练气后期(L6)',           icon:'🌊', cond: c=>c.top_realm_idx>=6 },
    { id:'realm_z1',       title:'筑基成功',          desc:'突破到筑基期',               icon:'🏔️', cond: c=>c.top_realm_idx>=10 },
    { id:'realm_j1',       title:'金丹大成',          desc:'突破到金丹期',               icon:'🟡', cond: c=>c.top_realm_idx>=13 },
    { id:'realm_y1',       title:'元婴出窍',          desc:'突破到元婴期',               icon:'🟣', cond: c=>c.top_realm_idx>=16 },
    { id:'perfect_10',     title:'十题全对',          desc:'单次修炼10题全部答对',        icon:'💯', cond: c=>c.perfect_count>=1 },
    { id:'accuracy_90',    title:'精准如神',          desc:'总正确率达到90%以上',        icon:'🎯', cond: c=>c.total_questions>0 && c.accuracy>=90 },
    { id:'first_share',    title:'初传道法',          desc:'第一次分享修炼成果',          icon:'📤', cond: c=>c.share_count>=1 },
    { id:'invite_3',       title:'广纳门徒',          desc:'成功邀请3位好友',            icon:'👋', cond: c=>c.invite_count>=3 },
    { id:'invite_10',      title:'桃李满天下',        desc:'成功邀请10位好友',           icon:'🎓', cond: c=>c.invite_count>=10 },
    { id:'master_demon',   title:'心魔克星',          desc:'降服10条心魔',               icon:'🧘', cond: c=>c.mastered_demons>=10 },
];

export class AchievementPanel {
    constructor(game) { this.game = game; }

    async show() {
        this.game.ui.hideAllPanels();
        this.game.ui.showLoading('查询成就...');
        const res = await this.game.api.get('/achievements');
        this.game.ui.hideLoading();
        const all = ACHIEVEMENT_LIST;
        const unlocked = new Set((res.success ? res.data.unlocked_ids : []));
        const stats = res.success ? res.data.stats : {};

        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.id = 'achievement-panel';
        panel.innerHTML = `
            <div class="panel-title">🏆 成就</div>
            <div style="margin-bottom:12px;text-align:center;color:var(--parchment-dark);font-size:13px;">
                已解锁 ${Math.round(unlocked.size/all.length*100)}% · ${unlocked.size}/${all.length}
            </div>
            <div style="max-height:380px;overflow-y:auto;">
                ${all.map(a => {
                    const done = unlocked.has(a.id);
                    return `
                    <div style="display:flex;align-items:center;gap:10px;padding:10px;margin-bottom:6px;background:${done ? 'rgba(212,168,67,0.08)' : 'rgba(255,255,255,0.02)'};border-radius:10px;border:1px solid ${done ? 'rgba(212,168,67,0.2)' : 'rgba(255,255,255,0.05)'};opacity:${done ? 1 : 0.4};">
                        <span style="font-size:24px;">${done ? a.icon : '🔒'}</span>
                        <div style="flex:1;">
                            <div style="font-size:13px;color:${done ? 'var(--gold)' : 'var(--parchment-dark)'};">${a.title}</div>
                            <div style="font-size:11px;color:var(--parchment-dark);">${a.desc}</div>
                        </div>
                        ${done ? '<span style="font-size:16px;">✅</span>' : ''}
                    </div>`;
                }).join('')}
            </div>
            <button class="btn btn-secondary" id="achievement-back-btn" style="margin-top:8px;">返回宗门</button>
        `;
        this.game.ui.overlay.appendChild(panel);
        document.getElementById('achievement-back-btn').addEventListener('click', () => { panel.remove(); this.game.ui.showHallScene(); });
    }
}
