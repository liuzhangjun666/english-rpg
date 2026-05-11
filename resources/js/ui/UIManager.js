// LevelUp 英语修仙 - UI 总管理器（P1+P2 完整版）
import avatarDefault from '../../assets/images/avatar_default.png';
import hermesAvatar from '../../assets/images/hermes_avatar.png';
import loadingTai from '../../assets/images/loading_tai.png';
import realmBadge from '../../assets/images/realm_badge.png';

export class UIManager {
    constructor(game) {
        this.game = game;
        this.overlay = document.getElementById('ui-overlay');
        this.container = document.getElementById('game-container');
        this.assets = { avatarDefault, hermesAvatar, loadingTai, realmBadge };
        this.errorCountdownTimers = {};
    }

    showLoading(text = '加载中...') {
        this.removeLoading();
        const el = document.createElement('div');
        el.className = 'loading-overlay';
        el.id = 'loading-overlay';
        el.innerHTML = `
            <div class="loading-tai-container">
                <img src="${this.assets.loadingTai}" class="loading-tai-img" alt="loading">
            </div>
            <div class="text">${text}</div>
        `;
        document.body.appendChild(el);
    }

    hideLoading() { this.removeLoading(); }
    removeLoading() { const el = document.getElementById('loading-overlay'); if (el) el.remove(); }

    // ========== 登录面板 ==========
    showLoginPanel() {
        this.hideAllPanels();
        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.id = 'login-panel';
        panel.innerHTML = `
            <div class="panel-title">登入宗门</div>
            <div class="input-group">
                <label>手机号</label>
                <input type="tel" id="login-phone" maxlength="11" placeholder="请输入手机号">
            </div>
            <div class="input-group">
                <label>验证码</label>
                <div class="code-row">
                    <input type="text" id="login-code" maxlength="6" placeholder="输入6位验证码">
                    <button class="code-btn" id="login-get-code">获取</button>
                </div>
            </div>
            <button class="btn btn-primary" id="login-btn">登 录</button>
            <div class="link-text">还没有道号？<a id="go-register">注册新道友</a></div>
            <div class="error-msg" id="login-error"></div>
        `;
        this.overlay.appendChild(panel);
        this.bindLoginEvents();
    }

    bindLoginEvents() {
        document.getElementById('login-btn').addEventListener('click', () => this.handleLogin());
        document.getElementById('go-register').addEventListener('click', () => this.showRegisterPanel());
        document.getElementById('login-get-code').addEventListener('click', () => {
            const p = document.getElementById('login-phone').value;
            if (p.length !== 11) { this.showError('login-error', '请输入11位手机号'); return; }
            this.handleSendCode(document.getElementById('login-get-code'), p, 'login');
        });
        document.getElementById('login-code').addEventListener('keydown', (e) => { if (e.key === 'Enter') this.handleLogin(); });
    }

    /** 发送验证码（含倒计时） */
    async handleSendCode(btn, phone, action) {
        const errorId = action === 'register' ? 'register-error' : 'login-error';
        btn.disabled = true;
        btn.textContent = '发送中...';
        try {
            const res = await this.game.api.post('/sms/send', { phone, action });
            if (res.success) {
                this.clearErrorCountdown(errorId);
                this.hideError(errorId);
                // 开发模式在控制台输出验证码
                if (res.debug_code) {
                    console.log(`[SMS-DEV] 验证码: ${res.debug_code}`);
                }
                this.showHermesBubble('验证码已发送', 2000);
                // 60秒倒计时
                let sec = 60;
                btn.textContent = `${sec}s`;
                const timer = setInterval(() => {
                    sec--;
                    btn.textContent = `${sec}s`;
                    if (sec <= 0) {
                        clearInterval(timer);
                        btn.disabled = false;
                        btn.textContent = '获取';
                    }
                }, 1000);
            } else {
                btn.disabled = false;
                btn.textContent = '获取';
                if (action === 'register' && res.code === 'PHONE_ALREADY_REGISTERED') {
                    this.redirectToLoginFromRegister(phone, res.message);
                    return;
                }
                if (res.code === 'SMS_RESEND_COOLDOWN' && Number(res.retry_after) > 0) {
                    this.startErrorCountdown(errorId, Number(res.retry_after));
                    return;
                }
                this.clearErrorCountdown(errorId);
                this.showError(errorId, res.message || '发送失败');
            }
        } catch (e) {
            btn.disabled = false;
            btn.textContent = '获取';
            this.clearErrorCountdown(errorId);
            this.showError(errorId, '网络错误');
        }
    }

    redirectToLoginFromRegister(phone, message) {
        const registerPanel = document.getElementById('register-panel');
        if (registerPanel) registerPanel.remove();
        this.showLoginPanel();
        const loginPhoneInput = document.getElementById('login-phone');
        if (loginPhoneInput) loginPhoneInput.value = phone;
        this.showError('login-error', message || '该手机号已注册，请直接登录');
    }

    async handleLogin() {
        const phone = document.getElementById('login-phone').value.trim();
        const code = document.getElementById('login-code').value.trim();
        if (!phone || phone.length !== 11) { this.showError('login-error', '请输入正确的手机号'); return; }
        if (!code || code.length !== 6) { this.showError('login-error', '请输入6位验证码'); return; }
        this.hideError('login-error');
        this.showLoading('正在登录...');
        const res = await this.game.api.post('/auth/login', { phone, code });
        this.hideLoading();
        if (res.success) {
            this.game.api.setToken(res.data.token);
            this.game.store.setUser(res.data.user);
            this.game.isLoggedIn = true;
            this.game.enterHall();
        } else {
            this.showError('login-error', res.message || '登录失败');
        }
    }

    showRegisterPanel() {
        const existing = document.getElementById('register-panel');
        if (existing) existing.remove();
        const loginPanel = document.getElementById('login-panel');
        if (loginPanel) loginPanel.remove();
        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.id = 'register-panel';
        panel.innerHTML = `
            <div class="panel-title">注册道号</div>
            <div class="input-group"><label>手机号</label><input type="tel" id="reg-phone" maxlength="11" placeholder="请输入手机号"></div>
            <div class="input-group"><label>验证码</label><div class="code-row"><input type="text" id="reg-code" maxlength="6" placeholder="输入6位验证码"><button class="code-btn" id="reg-get-code">获取</button></div></div>
            <div class="input-group"><label>道号（选填）</label><input type="text" id="reg-nickname" maxlength="50" placeholder="不填则自动生成"></div>
            <div class="input-group"><label>出生年份（选填）</label><select id="reg-birth-year"><option value="">-- 选择年份 --</option>${this.generateYearOptions()}</select></div>
            <div class="input-group"><label>邀请码（选填）</label><input type="text" id="reg-invite" maxlength="20" placeholder="朋友的邀请码"></div>
            <button class="btn btn-primary" id="register-btn">注 册</button>
            <div class="link-text">已有道号？<a id="go-login">返回登录</a></div>
            <div class="error-msg" id="register-error"></div>
        `;
        this.overlay.appendChild(panel);
        document.getElementById('register-btn').addEventListener('click', () => this.handleRegister());
        document.getElementById('go-login').addEventListener('click', () => { const rp = document.getElementById('register-panel'); if (rp) rp.remove(); this.showLoginPanel(); });
        document.getElementById('reg-get-code').addEventListener('click', () => {
            const p = document.getElementById('reg-phone').value;
            if (p.length !== 11) { this.showError('register-error', '请输入11位手机号'); return; }
            this.handleSendCode(document.getElementById('reg-get-code'), p, 'register');
        });
    }

    generateYearOptions() {
        const cy = new Date().getFullYear();
        let o = '';
        for (let y = cy; y >= 1950; y--) o += `<option value="${y}">${y}年</option>`;
        return o;
    }

    async handleRegister() {
        const phone = document.getElementById('reg-phone').value.trim();
        const code = document.getElementById('reg-code').value.trim();
        const nickname = document.getElementById('reg-nickname').value.trim();
        const birthYear = document.getElementById('reg-birth-year').value;
        const inviteCode = document.getElementById('reg-invite').value.trim();
        if (!phone || phone.length !== 11) { this.showError('register-error', '请输入正确的手机号'); return; }
        if (!code || code.length !== 6) { this.showError('register-error', '请输入6位验证码'); return; }
        this.hideError('register-error');
        this.showLoading('正在注册...');
        const payload = { phone, code, nickname: nickname || undefined, birth_year: birthYear ? parseInt(birthYear) : undefined };
        if (inviteCode) payload.invite_code = inviteCode;
        const res = await this.game.api.post('/auth/register', payload);
        this.hideLoading();
        if (res.success) {
            this.game.api.setToken(res.data.token);
            this.game.onRegisterSuccess(res.data.user);
        } else {
            this.showError('register-error', res.message || '注册失败');
        }
    }

    // ========== 角色信息栏（水墨头像） ==========
    /** 统一入口：检查未成年提示 */
    checkMinorWarning() {
        const user = this.game.store.getState().user;
        if (user && user.is_minor) {
            this.showHermesBubble('⏰ 家长模式已开启，每日修炼时间受限。请在「我的→家长端」查看详情。', 6000);
        }
    }

    showCharacterBar() {
        const existing = document.getElementById('character-bar');
        if (existing) existing.remove();
        const user = this.game.store.getState().user;
        if (!user) return;

        // 首次进入大厅时检查未成年提示
        this.checkMinorWarning();
        const bar = document.createElement('div');
        bar.className = 'character-bar';
        bar.id = 'character-bar';
        bar.innerHTML = `
            <img src="${this.assets.avatarDefault}" class="avatar" alt="avatar">
            <div class="info"><div class="name">${this.escapeHtml(user.nickname)}</div><div class="realm">${this.getRealmName(user.realm)} · ${user.realm_stage}重</div></div>
            <div class="stats">
                <div class="stat">⚡ ${user.exp}</div>
                <div class="stat">💧 ${user.spirit_power}/${user.spirit_power_max}</div>
                <div class="stat">💎 ${user.spirit_stone}</div>
            </div>
        `;
        document.body.appendChild(bar);
        this.storeUnsubscribe = this.game.store.subscribe((state) => {
            if (state.user) {
                const n = bar.querySelector('.name'); const r = bar.querySelector('.realm'); const s = bar.querySelectorAll('.stat');
                if (n) n.textContent = state.user.nickname;
                if (r) r.textContent = `${this.getRealmName(state.user.realm)} · ${state.user.realm_stage}重`;
                if (s[0]) s[0].innerHTML = `⚡ ${state.user.exp}`;
                if (s[1]) s[1].innerHTML = `💧 ${state.user.spirit_power}/${state.user.spirit_power_max}`;
                if (s[2]) s[2].innerHTML = `💎 ${state.user.spirit_stone}`;
            }
        });
    }

    getRealmName(realm) {
        const names = { 'L1':'练气初','L2':'练气初','L3':'练气初','L4':'练气中','L5':'练气中','L6':'练气中','L7':'练气后','L8':'练气后','L9':'练气后','Z1':'筑基','Z2':'筑基','Z3':'筑基','J1':'金丹','J2':'金丹','J3':'金丹','Y1':'元婴','Y2':'元婴','Y3':'元婴','H1':'化神','H2':'化神','H3':'化神','D1':'大乘','D2':'大乘','D3':'大乘' };
        return names[realm] || realm;
    }

    // ========== 宗门大厅（P1+P2 完整入口） ==========
    showHallScene() {
        const entry = document.createElement('div');
        entry.className = 'hall-entry';
        entry.id = 'hall-entry';

        const entries = [
            { key: 'practice', icon: '\u{1F4D6}', label: '\u7ec3\u529f\u623f' },
            { key: 'shilianchang', icon: '\u26A1', label: '\u8bd5\u70bc\u573a' },
            { key: 'cangjingge', icon: '\u{1F4DA}', label: '\u85cf\u7ecf\u9601' },
            { key: 'listening', icon: '\u{1F3A7}', label: '\u542c\u529b' },
            { key: 'speaking', icon: '\u{1F5E3}', label: '\u53e3\u8bed' },
            { key: 'reading', icon: '\u{1F4D8}', label: '\u9605\u8bfb' },
            { key: 'writing', icon: '\u270D', label: '\u5199\u4f5c' },
            { key: 'mijing', icon: '\u{1F33F}', label: '\u79d8\u5883' },
            { key: 'mall', icon: '\u{1F3EA}', label: '\u574a\u5e02' },
            { key: 'leaderboard', icon: '\u{1F3C5}', label: '\u5b97\u95e8\u699c' },
            { key: 'review', icon: '\u{1F504}', label: '\u590d\u4e60' },
            { key: 'demons', icon: '\u{1F9D8}', label: '\u5fc3\u9b54\u5f55' },
            { key: 'achievements', icon: '\u{1F3C6}', label: '\u6210\u5c31' },
            { key: 'profile', icon: '\u{1F464}', label: '\u6211\u7684' },
        ];

        entry.innerHTML = entries
            .map((item) => `<div class="entry-btn" data-scene="${item.key}"><span class="entry-icon">${item.icon}</span>${this.escapeHtml(item.label)}</div>`)
            .join('');

        this.overlay.appendChild(entry);
        entry.querySelectorAll('.entry-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                const scene = btn.dataset.scene;
                switch (scene) {
                    case 'profile': this.showProfilePanel(); break;
                    case 'review': this.sceneTransition(() => this.game.startReview()); break;
                    case 'demons': this.sceneTransition(() => { this.game.showDemons(); }); break;
                    case 'achievements': this.sceneTransition(() => { this.game.showAchievements(); }); break;
                    case 'leaderboard': this.sceneTransition(() => { this.game.showLeaderboard(); }); break;
                    case 'mall': this.sceneTransition(() => { this.game.showMall(); }); break;
                    case 'practice': this.sceneTransition(() => this.game.goToScene('practice')); break;
                    case 'shilianchang': this.sceneTransition(() => this.game.goToScene('shilianchang')); break;
                    case 'cangjingge': this.sceneTransition(() => this.game.goToScene('cangjingge')); break;
                    case 'listening': this.sceneTransition(() => this.game.startPracticeModule('listening')); break;
                    case 'speaking': this.sceneTransition(() => this.game.startPracticeModule('speaking')); break;
                    case 'reading': this.sceneTransition(() => this.game.startPracticeModule('reading')); break;
                    case 'writing': this.sceneTransition(() => this.game.startPracticeModule('writing')); break;
                    case 'mijing': this.sceneTransition(() => this.game.goToScene('mijing')); break;
                }
            });
        });
    }

    /** 场景切换过渡动画 */
    sceneTransition(callback) {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#0a0a1a;z-index:200;opacity:0;transition:opacity 0.3s;pointer-events:none;';
        document.body.appendChild(overlay);
        overlay.style.opacity = '1';
        setTimeout(() => {
            callback();
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 300);
        }, 350);
    }

    // ========== Hermes 气泡 ==========
    showHermesBubble(text, duration = 5000) {
        const existing = document.getElementById('hermes-bubble');
        if (existing) existing.remove();
        const bubble = document.createElement('div');
        bubble.className = 'hermes-bubble';
        bubble.id = 'hermes-bubble';
        bubble.innerHTML = `
            <img src="${this.assets.hermesAvatar}" class="hermes-avatar" alt="Hermes">
            <div class="hermes-text">${this.escapeHtml(text)}</div>
        `;
        document.body.appendChild(bubble);
        setTimeout(() => { if (bubble.parentNode) bubble.remove(); }, duration);
    }

    showHermesPanel() {
        this.showHermesBubble(this.game.hermes.getMessage('default'));
    }

    // ========== 个人面板（P1+P2 完整版） ==========
    showProfilePanel() {
        const existing = document.getElementById('profile-panel');
        if (existing) existing.remove();
        const hallEntry = document.getElementById('hall-entry');
        if (hallEntry) hallEntry.classList.add('hidden');
        const user = this.game.store.getState().user;
        if (!user) return;
        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.id = 'profile-panel';
        panel.innerHTML = `
            <div class="panel-title">
                <img src="${this.assets.realmBadge}" class="realm-badge-img" alt="badge">
                我的信息
            </div>
            <div class="profile-avatar-section">
                <img src="${this.assets.avatarDefault}" class="profile-avatar" alt="avatar">
            </div>
            <div class="input-group"><label>道号</label><input type="text" id="profile-nickname" maxlength="50" value="${this.escapeHtml(user.nickname)}"></div>
            <div class="input-group"><label>手机号</label><input type="text" value="${user.phone}" disabled style="opacity:0.6;"></div>
            <div class="input-group"><label>当前境界</label><input type="text" value="${this.getRealmName(user.realm)} · ${user.realm_stage}重" disabled style="opacity:0.6;"></div>
            <div class="input-group" style="display:flex;gap:8px;">
                <span style="flex:1;text-align:center;padding:8px;background:rgba(255,255,255,0.05);border-radius:8px;">⚡ ${user.exp}</span>
                <span style="flex:1;text-align:center;padding:8px;background:rgba(255,255,255,0.05);border-radius:8px;">💧 ${user.spirit_power}/${user.spirit_power_max}</span>
                <span style="flex:1;text-align:center;padding:8px;background:rgba(255,255,255,0.05);border-radius:8px;">💎 ${user.spirit_stone}</span>
            </div>
            <div style="padding:12px;background:rgba(212,168,67,0.06);border-radius:10px;margin:12px 0;border:1px solid rgba(212,168,67,0.15);">
                <div style="font-size:12px;color:var(--gold-light);margin-bottom:6px;">🎁 邀请好友得灵力</div>
                <div style="font-size:11px;color:var(--parchment-dark);line-height:1.6;">
                    好友注册填你的邀请码 → 双方各得灵力奖励
                </div>
                <button class="btn btn-primary btn-sm" id="profile-share-btn" style="margin-top:8px;font-size:12px;padding:8px;">📤 复制邀请码去分享</button>
            </div>
            <button class="btn btn-primary" id="profile-save-btn" style="margin-top:4px;">保存道号</button>
            <button class="btn btn-secondary" id="profile-review-btn" style="margin-top:8px;">🔄 错题复习</button>
            <button class="btn btn-secondary" id="profile-demons-btn" style="margin-top:8px;">🧘 心魔录</button>
            <button class="btn btn-secondary" id="profile-achievements-btn" style="margin-top:8px;">🏆 成就</button>
            <button class="btn btn-secondary" id="profile-parent-btn" style="margin-top:8px;">📋 家长端</button>
            <button class="btn btn-secondary" id="profile-back-btn" style="margin-top:8px;">返回宗门</button>
            <button class="btn btn-secondary" id="profile-logout-btn" style="margin-top:8px;border-color:var(--cinnabar);color:var(--cinnabar);">退出登录</button>
        `;
        this.overlay.appendChild(panel);
        document.getElementById('profile-save-btn').addEventListener('click', async () => {
            const n = document.getElementById('profile-nickname').value.trim();
            if (!n) { this.showError('请填写道号'); return; }
            const r = await this.game.api.put('/user/profile', { nickname: n });
            if (r.success) { this.game.store.updateUser({ nickname: r.data.nickname }); this.showHermesBubble('道号已更新。'); }
        });
        document.getElementById('profile-share-btn').addEventListener('click', async () => {
            const res = await this.game.api.get('/share/info');
            const code = res.success ? res.data.invite_code : '';
            const text = `我用 LevelUp 英语修仙学英语！🎯\n邀请码：${code}\n输入邀请码注册，我们各得灵力奖励！\n👉 一起来修炼吧～`;
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
                this.showHermesBubble('📋 邀请码已复制！分享给好友一起修炼吧 🎁', 4000);
            } else {
                prompt('复制以下内容去分享：', text);
            }
        });
        document.getElementById('profile-review-btn').addEventListener('click', () => { const p = document.getElementById('profile-panel'); if (p) p.remove(); if (hallEntry) hallEntry.classList.remove('hidden'); this.game.startReview(); });
        document.getElementById('profile-demons-btn').addEventListener('click', () => { const p = document.getElementById('profile-panel'); if (p) p.remove(); if (hallEntry) hallEntry.classList.remove('hidden'); this.game.showDemons(); });
        document.getElementById('profile-achievements-btn').addEventListener('click', () => { const p = document.getElementById('profile-panel'); if (p) p.remove(); if (hallEntry) hallEntry.classList.remove('hidden'); this.game.showAchievements(); });
        document.getElementById('profile-parent-btn').addEventListener('click', () => { const p = document.getElementById('profile-panel'); if (p) p.remove(); if (hallEntry) hallEntry.classList.remove('hidden'); this.game.showParentDashboard(); });
        document.getElementById('profile-back-btn').addEventListener('click', () => { const p = document.getElementById('profile-panel'); if (p) p.remove(); if (hallEntry) hallEntry.classList.remove('hidden'); });
        document.getElementById('profile-logout-btn').addEventListener('click', async () => {
            const ok = await this.showConfirmDialog({
                title: '退出确认',
                message: '确定要退出宗门吗？',
                confirmText: '退出',
                cancelText: '取消',
            });
            if (ok) this.game.logout();
        });
    }

    // ========== 通用 ==========
    hideAllPanels() {
        ['level-select-panel', 'practice-panel', 'reward-popup', 'exam-panel', 'exam-info-panel', 'exam-result-panel', 'login-panel', 'register-panel', 'profile-panel',
         'achievement-panel', 'leaderboard-panel', 'mall-panel', 'demons-panel', 'reading-panel', 'reading-task-panel', 'reading-result-popup', 'confirm-dialog-mask', 'confirm-dialog-panel'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.remove();
        });
        const hallEntry = document.getElementById('hall-entry');
        if (hallEntry) hallEntry.remove();
        const bubble = document.getElementById('hermes-bubble');
        if (bubble) bubble.remove();
    }

    showError(id, msg) {
        const el = typeof id === 'string' ? document.getElementById(id) : id;
        if (el) { el.textContent = msg; el.style.display = 'block'; } else { alert(msg); }
    }

    clearErrorCountdown(id) {
        if (!id) return;
        const timer = this.errorCountdownTimers[id];
        if (timer) {
            clearInterval(timer);
            delete this.errorCountdownTimers[id];
        }
    }

    startErrorCountdown(id, seconds) {
        this.clearErrorCountdown(id);

        let remain = Math.max(1, Math.floor(seconds));
        this.showError(id, `请 ${remain} 秒后再试`);

        this.errorCountdownTimers[id] = setInterval(() => {
            remain -= 1;
            const el = document.getElementById(id);
            if (!el) {
                this.clearErrorCountdown(id);
                return;
            }

            if (remain <= 0) {
                this.hideError(id);
                this.clearErrorCountdown(id);
                return;
            }

            this.showError(id, `请 ${remain} 秒后再试`);
        }, 1000);
    }

    hideError(id) {
        this.clearErrorCountdown(id);
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    }

    showConfirmDialog({ title = '确认操作', message = '确定继续吗？', confirmText = '确定', cancelText = '取消' } = {}) {
        const oldMask = document.getElementById('confirm-dialog-mask');
        const oldPanel = document.getElementById('confirm-dialog-panel');
        if (oldMask) oldMask.remove();
        if (oldPanel) oldPanel.remove();

        return new Promise((resolve) => {
            const mask = document.createElement('div');
            mask.id = 'confirm-dialog-mask';
            mask.className = 'confirm-dialog-mask';

            const panel = document.createElement('div');
            panel.id = 'confirm-dialog-panel';
            panel.className = 'panel confirm-dialog-panel';
            panel.innerHTML = `
                <div class="panel-title">${this.escapeHtml(title)}</div>
                <div class="confirm-dialog-text">${this.escapeHtml(message)}</div>
                <div class="confirm-dialog-actions">
                    <button class="btn btn-secondary" id="confirm-dialog-cancel">${this.escapeHtml(cancelText)}</button>
                    <button class="btn btn-primary" id="confirm-dialog-ok">${this.escapeHtml(confirmText)}</button>
                </div>
            `;

            const cleanup = (ok) => {
                mask.remove();
                panel.remove();
                resolve(ok);
            };

            mask.addEventListener('click', () => cleanup(false));
            this.overlay.appendChild(mask);
            this.overlay.appendChild(panel);

            panel.querySelector('#confirm-dialog-cancel')?.addEventListener('click', () => cleanup(false));
            panel.querySelector('#confirm-dialog-ok')?.addEventListener('click', () => cleanup(true));
        });
    }

    escapeHtml(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }
}
