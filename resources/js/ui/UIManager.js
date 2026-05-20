// LevelUp 英语修仙 - UI 总管理器（P1+P2 完整版）
import avatarDefault from '../../assets/images/avatar_default.png';
import hermesAvatar from '../../assets/images/hermes_avatar.png';
import loadingTai from '../../assets/images/loading_tai.png';
import realmBadge from '../../assets/images/realm_badge.png';
import { getRealmDisplayName } from '../utils/cultivation.js';

export class UIManager {
    constructor(game) {
        this.game = game;
        this.overlay = document.getElementById('ui-overlay');
        this.container = document.getElementById('game-container');
        this.assets = { avatarDefault, hermesAvatar, loadingTai, realmBadge };
        this.errorCountdownTimers = {};
        this.learningProgressCacheKey = 'levelup_learning_progress_cache_v1';
        this._learningProgressCache = this.readLearningProgressCache();
        this.learningProgressRefreshIntervalMs = 30000;
        this.spiritRecoverIntervalSec = 300;
        this._spiritRecoverTicker = null;
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
            <div class="input-group"><label>当前年级 / 学习阶段</label><select id="reg-school-grade"><option value="">-- 请选择 --</option>${this.generateSchoolGradeOptions()}</select></div>
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

    generateSchoolGradeOptions(selectedValue = '') {
        const options = [
            ['grade_1', '1年级'],
            ['grade_2', '2年级'],
            ['grade_3', '3年级'],
            ['grade_4', '4年级'],
            ['grade_5', '5年级'],
            ['grade_6', '6年级'],
            ['grade_7', '7年级'],
            ['grade_8', '8年级'],
            ['grade_9', '9年级'],
            ['grade_10', '10年级'],
            ['grade_11', '11年级'],
            ['grade_12', '12年级'],
            ['college', '本科阶段'],
            ['exam', '考研 / 英专'],
            ['graduate', '硕士 / 博士'],
            ['advanced', '留学 / 考试 / 发表'],
        ];
        return options.map(([value, label]) => `<option value="${value}" ${selectedValue === value ? 'selected' : ''}>${label}</option>`).join('');
    }

    async handleRegister() {
        const phone = document.getElementById('reg-phone').value.trim();
        const code = document.getElementById('reg-code').value.trim();
        const nickname = document.getElementById('reg-nickname').value.trim();
        const schoolGrade = document.getElementById('reg-school-grade').value;
        const birthYear = document.getElementById('reg-birth-year').value;
        const inviteCode = document.getElementById('reg-invite').value.trim();
        if (!phone || phone.length !== 11) { this.showError('register-error', '请输入正确的手机号'); return; }
        if (!code || code.length !== 6) { this.showError('register-error', '请输入6位验证码'); return; }
        this.hideError('register-error');
        this.showLoading('正在注册...');
        const payload = {
            phone,
            code,
            nickname: nickname || undefined,
            school_grade: schoolGrade || undefined,
            birth_year: birthYear ? parseInt(birthYear) : undefined,
        };
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
            this.showHermesBubble('⏰ 护道人模式已开启，每日修炼时长受限。请在「我的→护道人」查看详情。', 6000);
        }
    }

    showCharacterBar() {
        this.stopSpiritRecoverTicker();
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
            <div class="info">
                <div class="name">${this.escapeHtml(user.nickname)}</div>
                <div class="realm">${this.getCurrentRealmLabel(user)}</div>
                <div id="learning-progress-mini" style="margin-top:4px;padding:4px 6px;border:1px solid rgba(212,168,67,0.18);border-radius:8px;background:rgba(255,255,255,0.03);">
                    <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--parchment-dark);margin-bottom:3px;">
                        <span>修为进度</span>
                        <span id="learning-progress-text">--</span>
                    </div>
                    <div style="height:3px;background:rgba(255,255,255,0.12);border-radius:4px;overflow:hidden;">
                        <div id="learning-progress-fill" style="height:100%;width:0%;background:linear-gradient(90deg,var(--gold),#f4d98a);"></div>
                    </div>
                    <div id="learning-progress-breakthrough" style="display:none;margin-top:4px;font-size:9px;line-height:1.35;color:var(--parchment-dark);"></div>
                </div>
            </div>
            <div class="stats">
                <div class="stat">⚡ ${user.exp}</div>
                <div class="stat">💧 <span id="spirit-power-value">${user.spirit_power}/${user.spirit_power_max}</span> <span id="spirit-recover-countdown" style="font-size:10px;color:var(--gold-light);margin-left:4px;">--</span></div>
                <div class="stat">💎 ${user.spirit_stone}</div>
            </div>
        `;
        document.body.appendChild(bar);
        this.applyLearningProgressToBar(bar, this._learningProgressCache);
        this.renderSpiritRecoverInBar(bar, user);
        this.startSpiritRecoverTicker(bar);
        this.refreshLearningProgress(bar);
        this.storeUnsubscribe = this.game.store.subscribe((state) => {
            if (state.user) {
                const n = bar.querySelector('.name'); const r = bar.querySelector('.realm'); const s = bar.querySelectorAll('.stat');
                if (n) n.textContent = state.user.nickname;
                if (r) r.textContent = this.getCurrentRealmLabel(state.user);
                if (s[0]) s[0].innerHTML = `⚡ ${state.user.exp}`;
                this.renderSpiritRecoverInBar(bar, state.user);
                if (s[2]) s[2].innerHTML = `💎 ${state.user.spirit_stone}`;
                this.refreshLearningProgress(bar);
            }
        });
    }

    async refreshLearningProgress(bar) {
        const fill = bar.querySelector('#learning-progress-fill');
        const text = bar.querySelector('#learning-progress-text');
        if (!fill || !text) return;
        if (this._learningProgressLoading) return;
        const now = Date.now();
        if (this._learningProgressLastAt && now - this._learningProgressLastAt < this.learningProgressRefreshIntervalMs) return;

        this._learningProgressLoading = true;
        try {
            const res = await this.game.api.get('/user/learning-progress');
            this._learningProgressLastAt = Date.now();
            if (!res?.success) {
                text.textContent = '暂无数据';
                fill.style.width = '0%';
                return;
            }

            const data = res.data || {};
            const percent = Math.max(0, Math.min(100, Number(data.realm_progress_percent ?? data.progress_percent ?? 0)));
            const remain = Number(data.remaining_energy_to_next_realm ?? data.remaining_exp ?? 0);
            this.applyLearningProgressToBar(bar, {
                percent,
                remain,
                breakthroughTip: this.buildLearningBreakthroughTip(data),
            });
            this.saveLearningProgressCache({ percent, remain });

            const user = this.game.store.getState().user;
            if (user) {
                this.game.store.updateUser({
                    current_realm: data.current_realm || user.current_realm,
                    cultivation_energy: Number(data.cultivation_energy ?? user.cultivation_energy ?? 0),
                    vocabulary: Number(data?.six_dimensions?.vocabulary ?? user.vocabulary ?? 0),
                    grammar: Number(data?.six_dimensions?.grammar ?? user.grammar ?? 0),
                    reading: Number(data?.six_dimensions?.reading ?? user.reading ?? 0),
                    listening: Number(data?.six_dimensions?.listening ?? user.listening ?? 0),
                    writing: Number(data?.six_dimensions?.writing ?? user.writing ?? 0),
                    speaking: Number(data?.six_dimensions?.speaking ?? user.speaking ?? 0),
                });
            }
        } catch (error) {
            if (!this._learningProgressCache) {
                text.textContent = '加载失败';
                fill.style.width = '0%';
            }
        } finally {
            this._learningProgressLoading = false;
        }
    }

    readLearningProgressCache() {
        try {
            const raw = localStorage.getItem(this.learningProgressCacheKey);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return null;
            const percent = Number(parsed.percent);
            const remain = Number(parsed.remain);
            if (!Number.isFinite(percent) || !Number.isFinite(remain)) return null;
            return {
                percent: Math.max(0, Math.min(100, percent)),
                remain: Math.max(0, remain),
            };
        } catch (error) {
            return null;
        }
    }

    saveLearningProgressCache(progress) {
        if (!progress) return;
        const normalized = {
            percent: Math.max(0, Math.min(100, Number(progress.percent || 0))),
            remain: Math.max(0, Number(progress.remain || 0)),
        };
        this._learningProgressCache = normalized;
        try {
            localStorage.setItem(this.learningProgressCacheKey, JSON.stringify(normalized));
        } catch (error) {
            // ignore storage failures
        }
    }

    applyLearningProgressToBar(bar, progress) {
        if (!bar || !progress) return;
        const fill = bar.querySelector('#learning-progress-fill');
        const text = bar.querySelector('#learning-progress-text');
        const tip = bar.querySelector('#learning-progress-breakthrough');
        if (!fill || !text) return;

        const percent = Math.max(0, Math.min(100, Number(progress.percent || 0)));
        const remain = Math.max(0, Number(progress.remain || 0));
        fill.style.width = `${percent}%`;
        text.textContent = `还需 ${remain} 修为`;
        this.applyLearningBreakthroughTip(tip, progress.breakthroughTip || null);
    }

    buildLearningBreakthroughTip(data) {
        if (!data || typeof data !== 'object') return null;
        if (data.can_breakthrough === true) {
            return { type: 'ready', text: '突破条件已满足，可突破' };
        }

        const requiredEach = data?.breakthrough_conditions?.abilities?.required_each;
        const dimensions = data?.six_dimensions;
        if (!requiredEach || typeof requiredEach !== 'object' || !dimensions || typeof dimensions !== 'object') {
            return null;
        }

        const labels = this.getDimensionLabelMap();
        const missing = [];
        Object.keys(labels).forEach((key) => {
            const required = Number(requiredEach[key]);
            if (!Number.isFinite(required)) return;
            const current = Number(dimensions[key] ?? 0);
            const gap = Math.max(0, required - current);
            if (gap > 0) missing.push(`${labels[key]}差${gap}`);
        });

        if (!missing.length) return null;

        return {
            type: 'missing',
            text: `未满足：${missing.join('、')}`,
        };
    }

    applyLearningBreakthroughTip(tipEl, tip) {
        if (!tipEl) return;
        if (!tip || !tip.text) {
            tipEl.style.display = 'none';
            tipEl.textContent = '';
            return;
        }

        tipEl.style.display = 'block';
        tipEl.textContent = tip.text;
        tipEl.style.color = tip.type === 'ready' ? '#9ee8bf' : 'var(--parchment-dark)';
    }

    startSpiritRecoverTicker(bar) {
        this.stopSpiritRecoverTicker();
        this._spiritRecoverTicker = setInterval(() => {
            if (!bar || !document.body.contains(bar)) {
                this.stopSpiritRecoverTicker();
                return;
            }
            const user = this.game.store.getState().user;
            if (!user) return;
            this.renderSpiritRecoverInBar(bar, user);
        }, 1000);
    }

    stopSpiritRecoverTicker() {
        if (this._spiritRecoverTicker) {
            clearInterval(this._spiritRecoverTicker);
            this._spiritRecoverTicker = null;
        }
    }

    getSpiritRecoverView(user, nowMs = Date.now()) {
        const maxSpirit = Math.max(0, Number(user?.spirit_power_max || 0));
        const spiritBase = Math.max(0, Number(user?.spirit_power || 0));
        if (maxSpirit <= 0) {
            return { spirit: spiritBase, max: maxSpirit, countdownText: '--' };
        }

        if (spiritBase >= maxSpirit) {
            return { spirit: maxSpirit, max: maxSpirit, countdownText: '已满' };
        }

        const rawLast = user?.spirit_power_last_recover_at;
        const parsed = rawLast ? new Date(rawLast).getTime() : nowMs;
        const lastMs = Number.isFinite(parsed) ? parsed : nowMs;
        const elapsedSec = Math.max(0, Math.floor((nowMs - lastMs) / 1000));
        const ticks = Math.floor(elapsedSec / this.spiritRecoverIntervalSec);
        const spirit = Math.min(maxSpirit, spiritBase + Math.max(0, ticks));

        if (spirit >= maxSpirit) {
            return { spirit, max: maxSpirit, countdownText: '已满' };
        }

        const remainSec = this.spiritRecoverIntervalSec - (elapsedSec % this.spiritRecoverIntervalSec);
        const mm = String(Math.floor(remainSec / 60)).padStart(2, '0');
        const ss = String(remainSec % 60).padStart(2, '0');
        return { spirit, max: maxSpirit, countdownText: `${mm}:${ss}` };
    }

    renderSpiritRecoverInBar(bar, user) {
        if (!bar || !user) return;
        const valueEl = bar.querySelector('#spirit-power-value');
        const cdEl = bar.querySelector('#spirit-recover-countdown');
        if (!valueEl || !cdEl) return;

        const view = this.getSpiritRecoverView(user);
        valueEl.textContent = `${view.spirit}/${view.max}`;
        cdEl.textContent = view.countdownText;
        cdEl.style.color = view.countdownText === '已满' ? '#9ee8bf' : 'var(--gold-light)';
    }

    getRealmName(realm, stage = null) {
        return getRealmDisplayName(realm, stage);
    }

    getCurrentRealmLabel(user) {
        if (user?.current_realm) return user.current_realm;
        return this.getRealmName(user?.realm, user?.realm_stage);
    }

    getDimensionLabelMap() {
        return {
            vocabulary: '词汇',
            grammar: '语法',
            reading: '阅读',
            listening: '听力',
            writing: '写作',
            speaking: '口语',
        };
    }

    // ========== 宗门大厅（P1+P2 完整入口） ==========
    showHallScene() {
        const user = this.game.store.getState().user;
        const tutorialStep = Number(user?.tutorial_step || 0);
        const entry = document.createElement('div');
        entry.className = 'hall-entry';
        entry.id = 'hall-entry';

        const entries = [
            { key: 'practice', icon: '\u{1F4D6}', label: '练功房' },
            { key: 'shilianchang', icon: '\u26A1', label: '试炼场' },
            { key: 'cangjingge', icon: '\u{1F4DA}', label: '阵法峰' },
            { key: 'listening', icon: '\u{1F3A7}', label: '听风谷' },
            { key: 'speaking', icon: '\u{1F5E3}', label: '诵咒峰' },
            { key: 'reading', icon: '\u{1F4D8}', label: '藏经阁' },
            { key: 'writing', icon: '\u270D', label: '符箓台' },
            { key: 'mijing', icon: '\u{1F33F}', label: '秘境' },
            { key: 'mall', icon: '\u{1F3EA}', label: '坊市' },
            { key: 'leaderboard', icon: '\u{1F3C5}', label: '宗门榜' },
            { key: 'review', icon: '\u{1F504}', label: '温故复盘' },
            { key: 'demons', icon: '\u{1F9D8}', label: '心魔录' },
            { key: 'achievements', icon: '\u{1F3C6}', label: '成就碑' },
            { key: 'profile', icon: '\u{1F464}', label: '我的洞府' },
        ];

        entry.innerHTML = entries
            .map((item) => `<div class="entry-btn ${this.getTutorialEntryClass(item.key, tutorialStep)}" data-scene="${item.key}"><span class="entry-icon">${item.icon}</span>${this.escapeHtml(item.label)}</div>`)
            .join('');

        this.overlay.appendChild(entry);
        this.showTutorialGuideIfNeeded(entry, tutorialStep);
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

    getTutorialEntryClass(sceneKey, tutorialStep) {
        if (tutorialStep === 1 && sceneKey === 'practice') return 'tutorial-focus tutorial-pulse';
        if (tutorialStep === 2 && sceneKey === 'cangjingge') return 'tutorial-focus tutorial-pulse';
        return '';
    }

    showTutorialGuideIfNeeded(entry, tutorialStep) {
        if (tutorialStep === 1) {
            this.showHermesBubble('建议先入【练功房】采药识灵，每日修炼 10-15 分钟。', 6000);
            return;
        }
        if (tutorialStep === 2) {
            this.showHermesBubble('不错，继续前往【阵法峰】研习功法，词义与句法同修更稳。', 6000);
            this.maybeShowSpiritExhaustedGuide();
        }
    }

    async maybeShowSpiritExhaustedGuide() {
        const user = this.game.store.getState().user;
        if (!user || Number(user.tutorial_step || 0) !== 2 || Number(user.spirit_power || 0) > 0) return;

        const statsRes = await this.game.api.get('/user/stats');
        const stats = statsRes?.success ? statsRes.data : {};
        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.id = 'tutorial-finish-panel';
        panel.style.maxWidth = '420px';
        panel.innerHTML = `
            <div class="panel-title">今日修炼任务完成</div>
            <div style="color:var(--parchment-dark);line-height:1.9;font-size:13px;">
                <div>修炼题数：<span style="color:var(--gold);">${Number(stats.questions_done || 0)}</span></div>
                <div>悟性命中：<span style="color:var(--gold);">${Number(stats.accuracy || 0)}%</span></div>
                <div>新识灵词：<span style="color:var(--gold);">${Number(stats.new_word_count || 0)}</span></div>
                <div style="margin-top:8px;">明日再温习今日所学，道基更稳。</div>
            </div>
            <button class="btn btn-primary" id="tutorial-finish-ok" style="margin-top:12px;">我已知晓，继续修炼</button>
        `;
        this.overlay.appendChild(panel);
        document.getElementById('tutorial-finish-ok')?.addEventListener('click', () => panel.remove());

        this.game.store.updateUser({ tutorial_step: 3 });
        try {
            await this.game.api.patch('/user/tutorial-step', { tutorial_step: 3 });
        } catch {
            // keep local state
        }
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
            <div class="input-group"><label>当前境界</label><input type="text" value="${this.getCurrentRealmLabel(user)}" disabled style="opacity:0.6;"></div>
            <div class="input-group" style="display:flex;gap:8px;">
                <span style="flex:1;text-align:center;padding:8px;background:rgba(255,255,255,0.05);border-radius:8px;">⚡ ${user.exp}</span>
                <span style="flex:1;text-align:center;padding:8px;background:rgba(255,255,255,0.05);border-radius:8px;">💧 ${user.spirit_power}/${user.spirit_power_max}</span>
                <span style="flex:1;text-align:center;padding:8px;background:rgba(255,255,255,0.05);border-radius:8px;">💎 ${user.spirit_stone}</span>
            </div>
            <div id="realm-profile-progress" style="padding:10px;background:rgba(255,255,255,0.04);border-radius:10px;border:1px solid rgba(212,168,67,0.15);margin:10px 0;">
                <div style="font-size:12px;color:var(--gold-light);margin-bottom:6px;">境界与修为</div>
                <div style="font-size:12px;color:var(--parchment-dark);">加载中...</div>
            </div>
            <div style="padding:12px;background:rgba(212,168,67,0.06);border-radius:10px;margin:12px 0;border:1px solid rgba(212,168,67,0.15);">
                <div style="font-size:12px;color:var(--gold-light);margin-bottom:6px;">🎁 邀请好友得灵力</div>
                <div style="font-size:11px;color:var(--parchment-dark);line-height:1.6;">
                    好友注册填你的邀请码 → 双方各得灵力奖励
                </div>
                <button class="btn btn-primary btn-sm" id="profile-share-btn" style="margin-top:8px;font-size:12px;padding:8px;">📤 复制邀请码去分享</button>
            </div>
            <button class="btn btn-primary" id="profile-save-btn" style="margin-top:4px;">保存道号</button>
            <button class="btn btn-secondary" id="profile-review-btn" style="margin-top:8px;">🔄 温故复盘</button>
            <button class="btn btn-secondary" id="profile-demons-btn" style="margin-top:8px;">🧘 心魔录</button>
            <button class="btn btn-secondary" id="profile-achievements-btn" style="margin-top:8px;">🏆 成就</button>
            <button class="btn btn-secondary" id="profile-parent-btn" style="margin-top:8px;">📋 护道人</button>
            <button class="btn btn-secondary" id="profile-back-btn" style="margin-top:8px;">返回宗门</button>
            <button class="btn btn-secondary" id="profile-logout-btn" style="margin-top:8px;border-color:var(--cinnabar);color:var(--cinnabar);">退出登录</button>
        `;
        this.overlay.appendChild(panel);
        this.refreshRealmProfileProgress(panel);
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

    async refreshRealmProfileProgress(panel) {
        const container = panel.querySelector('#realm-profile-progress');
        if (!container) return;
        const user = this.game.store.getState().user;
        if (!user) return;

        const fallbackDimensions = {
            vocabulary: Number(user.vocabulary || 0),
            grammar: Number(user.grammar || 0),
            reading: Number(user.reading || 0),
            listening: Number(user.listening || 0),
            writing: Number(user.writing || 0),
            speaking: Number(user.speaking || 0),
        };

        let data = {};
        try {
            const res = await this.game.api.get('/user/learning-progress');
            data = res?.success ? (res.data || {}) : {};
        } catch (error) {
            data = {};
        }
        const percent = Math.max(0, Math.min(100, Number(data.realm_progress_percent ?? 0)));
        const currentRealm = data.current_realm || user.current_realm || '练气一层';
        const energy = Number(data.cultivation_energy ?? user.cultivation_energy ?? 0);
        const remain = Number(data.remaining_energy_to_next_realm ?? 0);
        const conditions = data.breakthrough_conditions || {};
        const abilityCondition = conditions.abilities || {};
        const energyCondition = conditions.energy || {};
        const dimensions = data.six_dimensions || fallbackDimensions;
        const dimensionLabels = this.getDimensionLabelMap();
        const abilityRequiredEach = typeof abilityCondition.required_each === 'number'
            ? abilityCondition.required_each
            : '按当前境界条件';

        const dimensionRows = Object.keys(dimensionLabels)
            .map((key) => `<span style="display:inline-block;min-width:80px;margin:2px 4px 2px 0;">${dimensionLabels[key]} ${Number(dimensions[key] || 0)}</span>`)
            .join('');

        container.innerHTML = `
            <div style="font-size:12px;color:var(--gold-light);margin-bottom:6px;">境界与修为</div>
            <div style="font-size:12px;color:var(--parchment-dark);line-height:1.8;">当前境界：${this.escapeHtml(currentRealm)}</div>
            <div style="font-size:12px;color:var(--parchment-dark);line-height:1.8;">修为值：${energy}</div>
            <div style="height:6px;background:rgba(255,255,255,0.12);border-radius:5px;overflow:hidden;margin:6px 0 8px;">
                <div style="height:100%;width:${percent}%;background:linear-gradient(90deg,var(--gold),#f4d98a);"></div>
            </div>
            <div style="font-size:11px;color:var(--parchment-dark);line-height:1.8;">突破条件：修为 ${energyCondition.current ?? energy}/${energyCondition.required ?? energy}</div>
            <div style="font-size:11px;color:var(--parchment-dark);line-height:1.8;">突破条件：六维单项 ≥ ${abilityRequiredEach}</div>
            <div style="font-size:11px;color:var(--parchment-dark);line-height:1.8;">距离下一层：${remain}</div>
            <div style="font-size:11px;color:var(--parchment-dark);line-height:1.8;margin-top:4px;">六维能力：${dimensionRows}</div>
        `;

        this.game.store.updateUser({
            current_realm: currentRealm,
            cultivation_energy: energy,
            vocabulary: Number(dimensions.vocabulary || 0),
            grammar: Number(dimensions.grammar || 0),
            reading: Number(dimensions.reading || 0),
            listening: Number(dimensions.listening || 0),
            writing: Number(dimensions.writing || 0),
            speaking: Number(dimensions.speaking || 0),
        });
    }

    // ========== 通用 ==========
    hideAllPanels() {
        ['level-select-panel', 'practice-panel', 'reward-popup', 'exam-panel', 'exam-info-panel', 'exam-result-panel', 'login-panel', 'register-panel', 'profile-panel',
         'achievement-panel', 'leaderboard-panel', 'mall-panel', 'demons-panel', 'reading-panel', 'reading-task-panel', 'reading-result-popup', 'mijing-entry-panel',
         'mijing-challenge-panel', 'mijing-result-panel', 'confirm-dialog-mask', 'confirm-dialog-panel'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.remove();
        });
        document.getElementById('tutorial-finish-panel')?.remove();
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
