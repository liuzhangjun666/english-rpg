// LevelUp 英语修仙 - UI 总管理器（P1+P2 完整版）
import avatarDefault from '../../assets/images/avatar_default.png';
import hermesAvatar from '../../assets/images/hermes_avatar.png';
import loadingTai from '../../assets/images/loading_tai.png';
import realmBadge from '../../assets/images/realm_badge.png';
import abilityVocabIcon from '../../assets/images/ui/ability_vocab.png';
import abilityGrammarIcon from '../../assets/images/ui/ability_grammar.png';
import abilityReadingIcon from '../../assets/images/ui/ability_reading.png';
import abilityListeningIcon from '../../assets/images/ui/ability_listening.png';
import abilityWritingIcon from '../../assets/images/ui/ability_writing.png';
import abilitySpeakingIcon from '../../assets/images/ui/ability_speaking.png';
import cultBreakthroughIcon from '../../assets/images/ui/cult_breakthrough_compass.png';
import cultRealmTokenIcon from '../../assets/images/ui/cult_realm_token.png';
import cultTaskScrollIcon from '../../assets/images/ui/cult_task_scroll.png';
import cultManualBookIcon from '../../assets/images/ui/cult_manual_book.png';
import cultQiOrbIcon from '../../assets/images/ui/cult_qi_orb.png';
import cultXiuliiCrystalIcon from '../../assets/images/ui/cult_xiulii_crystal.png';
import hintScrollIcon from '../../assets/images/ui/hint_scroll.png';
import btnEnterIcon from '../../assets/images/ui/btn_enter.png';
import btnChallengeIcon from '../../assets/images/ui/btn_challenge.png';
import btnSubmitIcon from '../../assets/images/ui/btn_submit.png';
import btnConfirmIcon from '../../assets/images/ui/btn_confirm.png';
import btnBackIcon from '../../assets/images/ui/btn_back.png';
import btnContinueIcon from '../../assets/images/ui/btn_continue.png';
import btnRestartIcon from '../../assets/images/ui/btn_restart.png';
import realmLianqiIcon from '../../assets/images/ui/realm_lianqi.png';
import realmZhujiIcon from '../../assets/images/ui/realm_zhuji.png';
import realmJindanIcon from '../../assets/images/ui/realm_jindan.png';
import realmYuanyingIcon from '../../assets/images/ui/realm_yuanying.png';
import realmHuashenIcon from '../../assets/images/ui/realm_huashen.png';
import realmLianxuIcon from '../../assets/images/ui/realm_lianxu.png';
import realmHetiIcon from '../../assets/images/ui/realm_heti.png';
import realmDachengIcon from '../../assets/images/ui/realm_dacheng.png';
import realmDujieIcon from '../../assets/images/ui/realm_dujie.png';
import hallPracticeIcon from '../../assets/images/ui/hall_practice.png';
import hallShilianchangIcon from '../../assets/images/ui/hall_shilianchang.png';
import hallCangjinggeIcon from '../../assets/images/ui/hall_cangjingge.png';
import hallListeningIcon from '../../assets/images/ui/hall_listening.png';
import hallSpeakingIcon from '../../assets/images/ui/hall_speaking.png';
import hallReadingIcon from '../../assets/images/ui/hall_reading.png';
import hallWritingIcon from '../../assets/images/ui/hall_writing.png';
import hallMijingIcon from '../../assets/images/ui/hall_mijing.png';
import hallMallIcon from '../../assets/images/ui/hall_mall.png';
import hallLeaderboardIcon from '../../assets/images/ui/hall_leaderboard.png';
import hallReviewIcon from '../../assets/images/ui/hall_review.png';
import hallDemonsIcon from '../../assets/images/ui/hall_demons.png';
import hallAchievementsIcon from '../../assets/images/ui/hall_achievements.png';
import hallProfileIcon from '../../assets/images/ui/hall_profile.png';
import realmMajorBadgeIcon from '../../assets/images/ui/realm_major_badge.png';
import realmMinorBadgeIcon from '../../assets/images/ui/realm_minor_badge.png';
import { getRealmDisplayName } from '../utils/cultivation.js';
import {
    buildDailyDestiny,
    buildHallStoryGuide,
    buildWeeklyBranchWindow,
    storyNodeCatalog,
} from '../core/StoryState.js';

const HALL_ENTRY_ICON_MAP = {
    practice: hallPracticeIcon,
    shilianchang: hallShilianchangIcon,
    cangjingge: hallCangjinggeIcon,
    listening: hallListeningIcon,
    speaking: hallSpeakingIcon,
    reading: hallReadingIcon,
    writing: hallWritingIcon,
    mijing: hallMijingIcon,
    mall: hallMallIcon,
    leaderboard: hallLeaderboardIcon,
    review: hallReviewIcon,
    demons: hallDemonsIcon,
    achievements: hallAchievementsIcon,
    profile: hallProfileIcon,
};

const BUTTON_SKIN_CLASS_NAMES = [
    'btn-art-enter',
    'btn-art-challenge',
    'btn-art-submit',
    'btn-art-confirm',
    'btn-art-back',
    'btn-art-continue',
    'btn-art-restart',
];

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
        this.initButtonSkinObserver();
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
                let sentMessage = '验证码已发送';
                // 开发模式在控制台输出验证码
                if (res.debug_code) {
                    console.log(`[SMS-DEV] 验证码: ${res.debug_code}`);
                    if (this.tryAutoFillDebugCode(action, res.debug_code)) {
                        sentMessage = '验证码已发送（测试环境已自动填充）';
                    }
                }
                this.showHermesBubble(sentMessage, 2000);
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

    tryAutoFillDebugCode(action, code) {
        const inputId = action === 'register'
            ? 'reg-code'
            : action === 'login'
                ? 'login-code'
                : null;
        if (!inputId) return false;
        const input = document.getElementById(inputId);
        if (!input) return false;
        input.value = String(code ?? '');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
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
            <div class="character-card-top">
                <div class="character-id-block">
                    <img src="${this.assets.avatarDefault}" class="avatar" alt="avatar">
                    <div class="info">
                        <div class="name">${this.escapeHtml(user.nickname)}</div>
                        <div class="realm realm-with-icon">${this.renderRealmBadge(this.getCurrentRealmLabel(user))}</div>
                    </div>
                </div>
                <div class="stats character-resource-stats">
                    <div class="stat resource-pill">
                        <span class="stat-glyph">⚡</span>
                        <span class="stat-value" id="stat-exp-value">${user.exp}</span>
                        <span class="stat-label">灵力</span>
                    </div>
                    <div class="stat resource-pill">
                        <span class="stat-glyph">💧</span>
                        <span class="stat-value" id="spirit-power-value">${user.spirit_power}/${user.spirit_power_max}</span>
                        <span class="stat-label">灵液</span>
                        <span class="stat-tag" id="spirit-recover-countdown">--</span>
                    </div>
                    <div class="stat resource-pill">
                        <span class="stat-glyph">💎</span>
                        <span class="stat-value" id="stat-stone-value">${user.spirit_stone}</span>
                        <span class="stat-label">灵玉</span>
                    </div>
                </div>
            </div>

            <div id="learning-progress-mini" class="learning-progress-mini">
                <div class="learning-progress-head">
                    <span>修为进度</span>
                    <span id="learning-progress-text">--</span>
                </div>
                <div class="learning-progress-track">
                    <div id="learning-progress-fill" class="learning-progress-fill"></div>
                </div>
                <div id="learning-progress-breakthrough" class="learning-progress-breakthrough"></div>
            </div>
        `;
        document.body.appendChild(bar);
        this.applyLearningProgressToBar(bar, this._learningProgressCache);
        this.renderSpiritRecoverInBar(bar, user);
        this.startSpiritRecoverTicker(bar);
        this.refreshLearningProgress(bar);
        this.storeUnsubscribe = this.game.store.subscribe((state) => {
            if (state.user) {
                const n = bar.querySelector('.name');
                const r = bar.querySelector('.realm');
                const expEl = bar.querySelector('#stat-exp-value');
                const stoneEl = bar.querySelector('#stat-stone-value');
                if (n) n.textContent = state.user.nickname;
                if (r) r.innerHTML = this.renderRealmBadge(this.getCurrentRealmLabel(state.user));
                if (expEl) expEl.textContent = String(state.user.exp ?? 0);
                this.renderSpiritRecoverInBar(bar, state.user);
                if (stoneEl) stoneEl.textContent = String(state.user.spirit_stone ?? 0);
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
        const isFull = view.countdownText === '已满';
        cdEl.style.color = isFull ? '#8fe7d1' : '#f2d79b';
        cdEl.style.borderColor = isFull ? 'rgba(111, 224, 196, 0.5)' : 'rgba(236, 190, 99, 0.45)';
        cdEl.style.background = isFull ? 'rgba(46, 166, 150, 0.16)' : 'rgba(199, 146, 52, 0.15)';
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

    getAbilityIconByKey(key) {
        const map = {
            vocabulary: abilityVocabIcon,
            grammar: abilityGrammarIcon,
            reading: abilityReadingIcon,
            listening: abilityListeningIcon,
            writing: abilityWritingIcon,
            speaking: abilitySpeakingIcon,
        };
        return map[String(key || '').trim()] || '';
    }

    getRealmIconByLabel(realmLabel) {
        const name = String(realmLabel || '').trim();
        if (!name) return '';
        if (name.includes('渡劫')) return realmDujieIcon;
        if (name.includes('大乘')) return realmDachengIcon;
        if (name.includes('合体')) return realmHetiIcon;
        if (name.includes('炼虚')) return realmLianxuIcon;
        if (name.includes('化神')) return realmHuashenIcon;
        if (name.includes('元婴')) return realmYuanyingIcon;
        if (name.includes('金丹')) return realmJindanIcon;
        if (name.includes('筑基')) return realmZhujiIcon;
        return realmLianqiIcon;
    }

    renderRealmBadge(realmLabel) {
        const safeLabel = this.escapeHtml(String(realmLabel || '练气一层'));
        const majorText = this.escapeHtml(this.getMajorRealmText(realmLabel));
        return `
            <span class="realm-chip realm-chip-badges">
                <span class="realm-major-wrap">
                    <img class="realm-major-badge" src="${realmMajorBadgeIcon}" alt="">
                    <span class="realm-major-text">${majorText}</span>
                </span>
                <span class="realm-minor-wrap">
                    <img class="realm-minor-badge" src="${realmMinorBadgeIcon}" alt="">
                    <span class="realm-minor-text">${safeLabel}</span>
                </span>
            </span>
        `;
    }

    getMajorRealmText(realmLabel) {
        const text = String(realmLabel || '').trim();
        if (!text) return '炼';
        if (text.includes('练气') || text.includes('炼气')) return '炼';
        if (text.includes('筑基')) return '筑';
        if (text.includes('金丹')) return '金';
        if (text.includes('元婴')) return '元';
        if (text.includes('化神')) return '化';
        if (text.includes('炼虚')) return '虚';
        if (text.includes('合体')) return '合';
        if (text.includes('大乘')) return '乘';
        if (text.includes('渡劫')) return '劫';
        return text.charAt(0) || '炼';
    }

    // ========== 宗门大厅（P1+P2 完整入口） ==========
    showHallScene() {
        const user = this.game.store.getState().user;
        const tutorialStep = Number(user?.tutorial_step || 0);
        const storyGuide = this.ensureHallStoryGuide();
        const recommendedLabel = this.getModuleDisplayLabel(storyGuide.recommendedModule);
        const dailyTitle = this.escapeHtml(storyGuide.dailyDestiny?.event_title || '晨钟悟字');
        const dailyRewardHint = this.escapeHtml(storyGuide.dailyDestiny?.reward_hint || '完成推荐修炼可获得命盘奖励');
        const entry = document.createElement('div');
        entry.className = 'hall-entry';
        entry.id = 'hall-entry';

        const entries = [
            { key: 'practice', label: '练功房' },
            { key: 'shilianchang', label: '试炼场' },
            { key: 'cangjingge', label: '阵法峰' },
            { key: 'listening', label: '听风谷' },
            { key: 'speaking', label: '诵咒峰' },
            { key: 'reading', label: '藏经阁' },
            { key: 'writing', label: '符箓台' },
            { key: 'mijing', label: '秘境' },
            { key: 'mall', label: '坊市' },
            { key: 'leaderboard', label: '宗门榜' },
            { key: 'review', label: '温故复盘' },
            { key: 'demons', label: '心魔录' },
            { key: 'achievements', label: '成就碑' },
            { key: 'profile', label: '我的洞府' },
        ];

        entry.innerHTML = `
            <div style="grid-column:1 / -1;padding:10px 12px;margin-bottom:2px;border:1px solid rgba(212,168,67,0.35);border-radius:10px;background:linear-gradient(180deg,rgba(212,168,67,0.14),rgba(212,168,67,0.05));">
                <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:12px;color:var(--gold-light);margin-bottom:6px;">
                    <span>今日命盘：${dailyTitle}</span>
                    <span>${dailyRewardHint}</span>
                </div>
                <div style="font-size:13px;color:var(--parchment-dark);line-height:1.8;">
                    <div>当前主线：${this.escapeHtml(storyGuide.currentMainlineLabel || '第一章·宗门初启')} · ${this.escapeHtml(storyGuide.currentChapterId || 'R1-01')} ${this.escapeHtml(storyGuide.chapterTitle || '')}</div>
                    <div>下一步：${this.escapeHtml(storyGuide.nextGoal || '完成推荐修炼并推进主线')}</div>
                    <div>推荐入口：<span style="color:var(--gold);font-weight:600;">${this.escapeHtml(recommendedLabel)}</span></div>
                </div>
            </div>
            ${entries
            .map((item) => {
                const tutorialClass = this.getTutorialEntryClass(item.key, tutorialStep);
                const isRecommended = item.key === storyGuide.recommendedModule;
                const recommendStyle = isRecommended
                    ? 'border-color:rgba(212,168,67,0.88);box-shadow:0 0 14px rgba(212,168,67,0.35);'
                    : '';
                return `<div class="entry-btn entry-btn-icon ${tutorialClass}" data-scene="${item.key}" title="${this.escapeHtml(item.label)}" aria-label="${this.escapeHtml(item.label)}" style="${recommendStyle}">${this.renderHallEntryIcon(item.key)}</div>`;
            })
            .join('')}
        `;

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

    renderHallEntryIcon(sceneKey) {
        const icon = HALL_ENTRY_ICON_MAP[String(sceneKey || '').trim()];
        if (!icon) return '';
        return `<span class="entry-icon entry-icon-wrap"><img class="entry-icon-img" src="${icon}" alt=""></span>`;
    }

    ensureHallStoryGuide() {
        const state = this.game.store.getState();
        const currentProgress = state.story?.progress || state.user?.story_progress || {};
        const currentCurrencies = state.story?.currencies || state.user?.progress_currency || {};

        const todayDestiny = buildDailyDestiny();
        const weeklyWindow = buildWeeklyBranchWindow(new Date());
        const updates = {};

        if ((currentProgress?.daily_destiny?.date || null) !== todayDestiny.date) {
            updates.daily_destiny = todayDestiny;
        }
        if ((currentProgress?.weekly_branch_window?.week_key || null) !== weeklyWindow.week_key) {
            updates.weekly_branch_window = weeklyWindow;
        }

        let effectiveProgress = currentProgress;
        if (Object.keys(updates).length > 0 && typeof this.game?.updateStoryProgress === 'function') {
            this.game.updateStoryProgress(updates);
            effectiveProgress = { ...currentProgress, ...updates };
        }

        return buildHallStoryGuide(effectiveProgress, currentCurrencies);
    }

    getModuleDisplayLabel(moduleKey) {
        const map = {
            practice: '练功房',
            shilianchang: '试炼场',
            cangjingge: '阵法峰',
            listening: '听风谷',
            speaking: '诵咒峰',
            reading: '藏经阁',
            writing: '符箓台',
            mijing: '秘境',
            review: '温故复盘',
            demons: '心魔录',
        };
        return map[String(moduleKey || '').toLowerCase()] || '藏经阁';
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
        if (existing) {
            existing.classList.add('fade-out');
            setTimeout(() => existing.remove(), 300);
            return;
        }

        const hallEntry = document.getElementById('hall-entry');
        if (hallEntry) hallEntry.classList.add('hidden');

        const user = this.game.store.getState().user || {};
        const catalog = typeof storyNodeCatalog === 'function' ? storyNodeCatalog() : [];
        const unlockedIds = Array.isArray(user.unlocked_nodes) ? user.unlocked_nodes : [];
        const fateNodes = catalog.filter(n => unlockedIds.includes(n.id) || (n.type && n.type.includes('ending') && unlockedIds.includes(n.id)));
        const hiddenGap = this.buildHiddenEndingGap(user, catalog);

        const panel = document.createElement('div');
        panel.className = 'cultivation-profile-panel';
        panel.id = 'profile-panel';

        // 整理六维数据
        const dimensions = {
            vocabulary: Number(user.vocabulary || 0),
            grammar: Number(user.grammar || 0),
            reading: Number(user.reading || 0),
            listening: Number(user.listening || 0),
            writing: Number(user.writing || 0),
            speaking: Number(user.speaking || 0),
        };

        const fateNodesHtml = fateNodes.length > 0
            ? fateNodes.map(n => `
                <div class="fate-node-item">
                    <div class="fate-node-title">${this.escapeHtml(n.title)}</div>
                    <div class="fate-node-desc">${this.escapeHtml(n.description || n.hint || '')}</div>
                </div>
            `).join('')
            : `<div class="fate-node-empty">暂无命盘记录，去藏经阁推演天机吧。</div>`;
        const hiddenGapRows = hiddenGap.requirements
            .map((item) => `<div class="fate-node-item" style="padding:8px 10px;">
                    <div class="fate-node-title">${this.escapeHtml(item.label)}</div>
                    <div class="fate-node-desc">${this.escapeHtml(item.progressText)}</div>
                </div>`)
            .join('');

        panel.innerHTML = `
            <div class="profile-header">
                <div class="profile-header-title">
                    <img src="${this.assets.realmBadge}" class="realm-badge-img" alt="badge" style="width:28px;height:28px;">
                    仙躯根骨 · 命盘
                </div>
                <button class="profile-close-btn" id="profile-close-btn">闭关 / 离开</button>
            </div>
            <div class="profile-body">
                <div class="profile-left-pane">
                    <div class="profile-section-title">仙躯核心</div>
                    <div class="profile-stats-grid">
                        <div class="profile-stat-item">
                            <span class="profile-stat-label">当前境界</span>
                            <span class="profile-stat-val">${this.renderRealmBadge(this.getCurrentRealmLabel(user))}</span>
                        </div>
                        <div class="profile-stat-item">
                            <span class="profile-stat-label">道心值</span>
                            <span class="profile-stat-val" style="color: #ff9e9e;">${Number(user.dao_heart || 0)}</span>
                        </div>
                        <div class="profile-stat-item">
                            <span class="profile-stat-label">剧情钥匙</span>
                            <span class="profile-stat-val" style="color: #8cc5ff;">${Number(user.story_keys || 0)}</span>
                        </div>
                        <div class="profile-stat-item">
                            <span class="profile-stat-label">修为灵气</span>
                            <span class="profile-stat-val">⚡ ${Number(user.exp || 0)}</span>
                        </div>
                    </div>

                    <div class="profile-section-title">境界进度</div>
                    <div id="realm-profile-progress" class="realm-profile-progress">
                        <div class="realm-profile-loading">正在推演境界数据...</div>
                    </div>

                    <div class="profile-section-title">英语根骨 (六维)</div>
                    <div class="profile-eng-grid" style="margin-bottom: 24px;">
                        <div class="profile-eng-item"><div class="profile-stat-label"><img src="${this.getAbilityIconByKey('vocabulary')}" alt="" style="width:16px;height:16px;object-fit:contain;vertical-align:middle;margin-right:4px;">词汇</div><div class="profile-eng-val">${dimensions.vocabulary}</div></div>
                        <div class="profile-eng-item"><div class="profile-stat-label"><img src="${this.getAbilityIconByKey('grammar')}" alt="" style="width:16px;height:16px;object-fit:contain;vertical-align:middle;margin-right:4px;">语法</div><div class="profile-eng-val">${dimensions.grammar}</div></div>
                        <div class="profile-eng-item"><div class="profile-stat-label"><img src="${this.getAbilityIconByKey('reading')}" alt="" style="width:16px;height:16px;object-fit:contain;vertical-align:middle;margin-right:4px;">阅读</div><div class="profile-eng-val">${dimensions.reading}</div></div>
                        <div class="profile-eng-item"><div class="profile-stat-label"><img src="${this.getAbilityIconByKey('listening')}" alt="" style="width:16px;height:16px;object-fit:contain;vertical-align:middle;margin-right:4px;">听力</div><div class="profile-eng-val">${dimensions.listening}</div></div>
                        <div class="profile-eng-item"><div class="profile-stat-label"><img src="${this.getAbilityIconByKey('speaking')}" alt="" style="width:16px;height:16px;object-fit:contain;vertical-align:middle;margin-right:4px;">口语</div><div class="profile-eng-val">${dimensions.speaking}</div></div>
                        <div class="profile-eng-item"><div class="profile-stat-label"><img src="${this.getAbilityIconByKey('writing')}" alt="" style="width:16px;height:16px;object-fit:contain;vertical-align:middle;margin-right:4px;">写作</div><div class="profile-eng-val">${dimensions.writing}</div></div>
                    </div>
                    
                    <div class="profile-section-title">宗门杂务</div>
                    <div style="display:flex; flex-direction:column; gap:10px;">
                        <div class="input-group" style="margin-bottom:8px;">
                            <label style="color:var(--parchment-dark);font-size:12px;">道号</label>
                            <div style="display:flex; gap:8px;">
                                <input type="text" id="profile-nickname" maxlength="50" value="${this.escapeHtml(user.nickname)}" style="flex:1;">
                                <button class="btn btn-primary btn-sm" id="profile-save-btn">更名</button>
                            </div>
                        </div>
                        <div style="display:flex; gap:8px; flex-wrap:wrap;">
                            <button class="btn btn-secondary btn-sm" id="profile-share-btn">📤 邀请道友</button>
                            <button class="btn btn-secondary btn-sm" id="profile-review-btn">🔄 温故复盘</button>
                            <button class="btn btn-secondary btn-sm" id="profile-parent-btn">📋 护道人</button>
                            <button class="btn btn-secondary btn-sm" id="profile-logout-btn" style="border-color:var(--cinnabar);color:var(--cinnabar);">退出登出</button>
                        </div>
                    </div>
                </div>

                <div class="profile-right-pane">
                    <div class="profile-section-title">已通关命盘图鉴</div>
                    <div class="fate-nodes-list">
                        ${fateNodesHtml}
                    </div>
                    <div class="profile-section-title" style="margin-top:12px;">隐藏结局缺口</div>
                    <div class="fate-nodes-list">
                        ${hiddenGapRows}
                        <div class="fate-node-item" style="padding:8px 10px;border-color:${hiddenGap.ready ? 'rgba(78,192,122,0.45)' : 'rgba(212,168,67,0.25)'};">
                            <div class="fate-node-title">${hiddenGap.ready ? '条件已满足' : '尚未满足'}</div>
                            <div class="fate-node-desc">${this.escapeHtml(hiddenGap.summary)}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        this.overlay.appendChild(panel);
        this.applyButtonSkins(panel);

        const closePanel = () => {
            panel.classList.add('fade-out');
            setTimeout(() => {
                panel.remove();
                if (hallEntry) hallEntry.classList.remove('hidden');
            }, 300);
        };

        document.getElementById('profile-close-btn')?.addEventListener('click', closePanel);

        document.getElementById('profile-save-btn')?.addEventListener('click', async () => {
            const n = document.getElementById('profile-nickname').value.trim();
            if (!n) { this.showError('请填写道号'); return; }
            const r = await this.game.api.put('/user/profile', { nickname: n });
            if (r.success) { this.game.store.updateUser({ nickname: r.data.nickname }); this.showHermesBubble('道号已更新。'); }
        });

        document.getElementById('profile-share-btn')?.addEventListener('click', async () => {
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

        document.getElementById('profile-review-btn')?.addEventListener('click', () => { closePanel(); this.game.startReview(); });
        document.getElementById('profile-parent-btn')?.addEventListener('click', () => { closePanel(); this.game.showParentDashboard(); });

        document.getElementById('profile-logout-btn')?.addEventListener('click', async () => {
            const ok = await this.showConfirmDialog({
                title: '退出确认',
                message: '确定要退出宗门吗？',
                confirmText: '退出',
                cancelText: '取消',
            });
            if (ok) {
                closePanel();
                this.game.logout();
            }
        });
        
        // 静默刷新一下用户数据
        this.refreshRealmProfileProgress(panel).catch(() => {});
    }

    buildHiddenEndingGap(user, catalog = []) {
        const storyProgress = user?.story_progress || {};
        const progressCurrency = user?.progress_currency || {};
        const unlockedEndings = Array.isArray(storyProgress.unlocked_endings) ? storyProgress.unlocked_endings : [];
        const collectedItems = Array.isArray(storyProgress.collected_items) ? storyProgress.collected_items : [];
        const endingNodes = catalog.filter((node) => node.type === 'ending');
        const ordinaryEndingCount = endingNodes.filter((node) => unlockedEndings.includes(node.id)).length;
        const hasMijingScroll = collectedItems.includes('mijing_scroll');
        const storyKeys = Number(user?.story_keys ?? progressCurrency.story_keys ?? 0);
        const lingqi = Number(progressCurrency?.lingqi ?? 0);

        const requirements = [
            {
                label: '普通结局',
                current: ordinaryEndingCount,
                target: 2,
                progressText: `${Math.min(ordinaryEndingCount, 2)}/2`,
            },
            {
                label: '秘境残卷',
                current: hasMijingScroll ? 1 : 0,
                target: 1,
                progressText: `${hasMijingScroll ? 1 : 0}/1`,
            },
            {
                label: '剧情钥匙',
                current: storyKeys,
                target: 6,
                progressText: `${Math.min(storyKeys, 6)}/6`,
            },
            {
                label: '灵气储备',
                current: lingqi,
                target: 30,
                progressText: `${Math.min(lingqi, 30)}/30`,
            },
        ];

        const ready = requirements.every((item) => item.current >= item.target);
        const missing = requirements
            .filter((item) => item.current < item.target)
            .map((item) => `${item.label}差 ${item.target - item.current}`);

        return {
            ready,
            requirements,
            summary: ready
                ? '可前往藏经阁终章或秘境继续触发隐藏结局。'
                : `仍需补齐：${missing.join('、')}`,
        };
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
            .map((key) => `
                <span class="realm-dimension-chip">
                    <img src="${this.getAbilityIconByKey(key)}" alt="">
                    <span>${dimensionLabels[key]} ${Number(dimensions[key] || 0)}</span>
                </span>
            `)
            .join('');
        const requiredAbility = Number(abilityCondition.required_each ?? 0);
        const abilityAvg = Object.keys(dimensionLabels).reduce((acc, key) => acc + Number(dimensions[key] || 0), 0) / 6;
        const abilityPercent = requiredAbility > 0
            ? Math.max(0, Math.min(100, (abilityAvg / requiredAbility) * 100))
            : 0;
        const readyPercent = data.can_breakthrough
            ? 100
            : Math.min(percent, abilityPercent || percent);
        const remainPercent = Math.max(0, 100 - percent);

        container.innerHTML = `
            <div class="realm-profile-topline">${this.renderRealmBadge(currentRealm)}</div>
            <div class="realm-profile-meta">修为值：${energy} · 距离下一层：${remain}</div>
            <div class="realm-progress-row">
                <div class="realm-progress-label">修为进度</div>
                <div class="realm-progress-track">
                    <div class="realm-progress-fill realm-progress-gold" style="width:${percent}%;"></div>
                </div>
                <div class="realm-progress-value">${Math.round(percent)}%</div>
            </div>
            <div class="realm-progress-row">
                <div class="realm-progress-label">六维达标</div>
                <div class="realm-progress-track">
                    <div class="realm-progress-fill realm-progress-green" style="width:${abilityPercent}%;"></div>
                </div>
                <div class="realm-progress-value">${Math.round(abilityPercent)}%</div>
            </div>
            <div class="realm-progress-row">
                <div class="realm-progress-label">突破准备</div>
                <div class="realm-progress-track">
                    <div class="realm-progress-fill realm-progress-blue" style="width:${readyPercent}%;"></div>
                </div>
                <div class="realm-progress-value">${Math.round(readyPercent)}%</div>
            </div>
            <div class="realm-progress-row">
                <div class="realm-progress-label">瓶颈压力</div>
                <div class="realm-progress-track">
                    <div class="realm-progress-fill realm-progress-red" style="width:${remainPercent}%;"></div>
                </div>
                <div class="realm-progress-value">${Math.round(remainPercent)}%</div>
            </div>
            <div class="realm-profile-note">突破条件：修为 ${energyCondition.current ?? energy}/${energyCondition.required ?? energy}，六维单项 ≥ ${abilityRequiredEach}</div>
            <div class="realm-profile-dimensions">${dimensionRows}</div>
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
                    <button class="btn btn-secondary" data-btn-skin="back" id="confirm-dialog-cancel">${this.escapeHtml(cancelText)}</button>
                    <button class="btn btn-primary" data-btn-skin="confirm" id="confirm-dialog-ok">${this.escapeHtml(confirmText)}</button>
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
            this.applyButtonSkins(panel);

            panel.querySelector('#confirm-dialog-cancel')?.addEventListener('click', () => cleanup(false));
            panel.querySelector('#confirm-dialog-ok')?.addEventListener('click', () => cleanup(true));
        });
    }

    initButtonSkinObserver() {
        if (typeof MutationObserver === 'undefined' || !document?.body) return;
        this.applyButtonSkins(document.body);
        let pending = false;
        this._buttonSkinObserver = new MutationObserver(() => {
            if (pending) return;
            pending = true;
            requestAnimationFrame(() => {
                pending = false;
                this.applyButtonSkins(document.body);
            });
        });
        this._buttonSkinObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
    }

    normalizeButtonLabel(label) {
        return String(label || '')
            .replace(/[\s\r\n\t]/g, '')
            .replace(/[^\u4e00-\u9fa5A-Za-z0-9]/g, '')
            .trim();
    }

    getButtonSkinKeyByLabel(label) {
        const normalized = this.normalizeButtonLabel(label);
        if (!normalized) return '';
        if (normalized.includes('重新开始') || normalized.includes('重开') || normalized.includes('再来')) return 'restart';
        if (normalized.includes('继续')) return 'continue';
        if (normalized.includes('挑战') || normalized.includes('试炼')) return 'challenge';
        if (normalized.includes('提交') || normalized.includes('交卷')) return 'submit';
        if (normalized.includes('确定') || normalized.includes('确认')) return 'confirm';
        if (normalized.includes('返回') || normalized.includes('取消') || normalized.includes('离开') || normalized.includes('退出')) return 'back';
        if (normalized.includes('进入') || normalized.includes('前往') || normalized.includes('开始')) return 'enter';
        return '';
    }

    getButtonSkinAssetByKey(skinKey) {
        const map = {
            enter: btnEnterIcon,
            challenge: btnChallengeIcon,
            submit: btnSubmitIcon,
            confirm: btnConfirmIcon,
            back: btnBackIcon,
            continue: btnContinueIcon,
            restart: btnRestartIcon,
        };
        return map[String(skinKey || '').trim()] || '';
    }

    applyButtonSkins(root) {
        const scope = root && root.querySelectorAll ? root : document;
        const buttons = Array.from(scope.querySelectorAll('button.btn'));
        buttons.forEach((btn) => {
            if (btn.classList.contains('code-btn')) return;
            const forcedSkin = String(btn.dataset?.btnSkin || '').trim();
            const skinKey = forcedSkin || this.getButtonSkinKeyByLabel(btn.textContent);
            BUTTON_SKIN_CLASS_NAMES.forEach((cls) => btn.classList.remove(cls));
            btn.classList.remove('btn-art');
            btn.style.removeProperty('--btn-art-bg');
            if (!skinKey) return;
            const asset = this.getButtonSkinAssetByKey(skinKey);
            if (!asset) return;
            btn.classList.add('btn-art', `btn-art-${skinKey}`);
            btn.style.setProperty('--btn-art-bg', `url("${asset}")`);
        });
    }

    escapeHtml(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }
}
