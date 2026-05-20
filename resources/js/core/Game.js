import { APIClient } from './APIClient.js';
import { Store } from './Store.js';
import { Router } from './Router.js';
import { UIManager } from '../ui/UIManager.js';
import { SceneManager } from '../scenes/SceneManager.js';
import { ExamPanel } from '../ui/ExamPanel.js';
import { InitiationPanel } from '../ui/InitiationPanel.js';
import { ReviewPanel } from '../ui/ReviewPanel.js';
import { MijingPanel } from '../ui/MijingPanel.js';
import { ShareCard } from '../ui/ShareCard.js';
import { HermesClient } from '../hermes/HermesClient.js';
import {
    defaultProgressCurrency,
    defaultStoryProgress,
    normalizeProgressCurrency,
    normalizeStoryProgress,
} from './StoryState.js';

export class Game {
    constructor() {
        this.api = new APIClient();
        this.store = new Store();
        this.router = new Router(this);
        this.ui = new UIManager(this);
        this.scene = new SceneManager();
        this.exam = new ExamPanel(this);
        this.initiation = new InitiationPanel(this);
        this.review = new ReviewPanel(this);
        this.mijing = new MijingPanel(this);
        this.shareCard = new ShareCard(this);
        this.hermes = new HermesClient(this);
        
        // Cache for lazy loaded panels
        this._panelCache = {};
        this.isLoggedIn = false;
        this.isNewUser = false;
        this.sceneInitialized = false;
        this.routeRestoring = false;
        this.storySyncTimer = null;
        window.addEventListener('auth:logout', () => this.handleForceLogout());
    }

    // Getters for lazy‑loaded panels
    get reading() { return this._panelCache['reading']; }
    get practice() { return this._panelCache['practice']; }
    get demons() { return this._panelCache['demons']; }
    get parentPanel() { return this._panelCache['parent']; }
    get achievements() { return this._panelCache['achievements']; }
    get leaderboard() { return this._panelCache['leaderboard']; }
    get mall() { return this._panelCache['mall']; }

    async loadPanel(name) {
        if (this._panelCache[name]) return this._panelCache[name];
        const loader = this.router.panelLoaders[name];
        if (!loader) throw new Error(`No panel loader defined for '${name}'`);
        this.ui.showLoading('加载中…');
        try {
            const PanelClass = await loader();
            const instance = new PanelClass(this);
            this._panelCache[name] = instance;
            return instance;
        } catch (e) {
            this.ui.showHermesBubble('加载失败，请稍后重试');
            console.error(`Failed to load panel ${name}:`, e);
            throw e;
        } finally {
            this.ui.hideLoading();
        }
    }

    init() {
        // Never block startup on network: always show login first.
        this.showLogin();

        const token = this.api.getStoredToken();
        if (!token) return;

        this.api.setToken(token);
        this.tryAutoLogin();
    }

    async tryAutoLogin() {
        const res = await this.api.get('/user/profile');
        if (!res?.success) {
            // 仅在明确鉴权失效时清理 token；网络抖动/超时不应导致刷新即掉线。
            if (res?.code === 'TOKEN_EXPIRED') {
                this.api.clearToken();
            }
            return;
        }

        this.store.setUser(res.data);
        this.hydrateStoryState(res.data);
        this.isLoggedIn = true;

        const isFresh =
            res.data.exp === 0 &&
            res.data.realm === 'L1' &&
            res.data.realm_stage === 1 &&
            !res.data.initiation_completed_at;

        if (isFresh) {
            this.isNewUser = true;
            this.startInitiation();
        } else {
            this.restoreRouteAfterLogin();
        }
    }

    restoreRouteAfterLogin() {
        const rawHash = window.location.hash.slice(1);
        const [path] = (rawHash || '').split('?');
        if (!path || path === 'login') {
            this.enterHall();
            return;
        }

        this.routeRestoring = true;
        this.router.handleRoute();
        this.routeRestoring = false;
    }

    navigateIfNeeded(path) {
        if (this.routeRestoring) return;
        const currentPath = (window.location.hash.slice(1).split('?')[0] || '');
        if (currentPath !== path) {
            this.router.navigate(path);
        }
    }

    showLogin() {
        this.ui.hideLoading();
        this.ui.hideAllPanels();
        const bar = document.getElementById('character-bar');
        if (bar) bar.remove();
        this.ui.showLoginPanel();
    }

    onRegisterSuccess(user) {
        this.store.setUser(user);
        this.hydrateStoryState(user);
        this.isLoggedIn = true;
        this.isNewUser = true;
        this.startInitiation();
    }

    startInitiation() {
        this.ensureSceneInitialized();
        this.ui.hideLoading();
        this.initiation.start();
    }

    async enterHall() {
        this.ensureSceneInitialized();
        await this.syncDailyStatus();
        this.scene.switchTo('hall');
        this.ui.hideAllPanels();
        this.ui.showCharacterBar();
        this.ui.showHallScene();
        this.navigateIfNeeded('hall');
    }

    async syncDailyStatus() {
        if (!this.isLoggedIn) return;
        const res = await this.api.post('/currency/daily-check');
        if (!res?.success || !res?.data) return;

        const user = this.store.getState().user;
        if (!user) return;

        this.store.updateUser({
            spirit_power: res.data.spirit_power ?? user.spirit_power,
            spirit_power_max: res.data.spirit_power_max ?? user.spirit_power_max,
            spirit_power_date: new Date().toISOString().slice(0, 10),
        });
    }

    goToScene(sceneName) {
        this.ensureSceneInitialized();
        switch (sceneName) {
            case 'practice':
                this.navigateIfNeeded('practice');
                this.scene.switchTo('practice', { mode: 'vocab' });
                this.showLevelSelect('vocab');
                break;
            case 'shilianchang':
                this.navigateIfNeeded('shilianchang');
                this.scene.switchTo('shilianchang');
                this.startExam();
                break;
            case 'cangjingge':
                this.navigateIfNeeded('cangjingge');
                this.scene.switchTo('grammar');
                this.showLevelSelect('grammar');
                break;
            case 'mijing':
                this.navigateIfNeeded('mijing');
                this.scene.switchTo('mijing');
                this.ui.hideAllPanels();
                this.ui.showCharacterBar();
                this.mijing.showEntry();
                break;
            default:
                this.enterHall();
        }
    }

    async startPracticeModule(type) {
        this.navigateIfNeeded(type);

        if (type === 'reading') {
            await this.startReadingAdventure();
            return;
        }

        const modeMap = {
            listening: 'listening',
            speaking: 'speaking',
            writing: 'writing',
            vocab: 'vocab',
        };

        this.ensureSceneInitialized();
        this.scene.switchTo('practice', { mode: modeMap[type] || 'vocab' });
        await this.showLevelSelect(type);
    }

    async startPracticeModuleAsync(type) {
        await this.startPracticeModule(type);
    }

    async startReadingAdventure() {
        this.ensureSceneInitialized();
        this.scene.switchTo('cangjingge');
        const stage = Number(this.store.getState().user?.realm_stage || 1);
        const targetLevel = stage >= 2 ? 2 : 1;
        const readingPanel = await this.loadPanel('reading');
        readingPanel.showChapterList(targetLevel);
    }

    async showLevelSelect(type) {
        this.ui.hideAllPanels();
        const practicePanel = await this.loadPanel('practice');
        practicePanel.showLevelSelect(type);
    }

    async startPractice(type, level) {
        if (type === 'vocab') {
            const mode = Number(level) >= 2 ? 'dange' : 'vocab';
            this.scene.switchTo('practice', { mode });
        }
        const practicePanel = await this.loadPanel('practice');
        practicePanel.startLevel(type, level);
    }

    startExam() {
        this.exam.checkPreExamReview();
    }

    startReview() {
        this.review.startReview();
    }

    async showDemons() {
        const demonsPanel = await this.loadPanel('demons');
        demonsPanel.show();
    }

    async showParentDashboard() {
        const parentPanel = await this.loadPanel('parent');
        parentPanel.show();
    }

    async showAchievements() {
        const achievementsPanel = await this.loadPanel('achievements');
        achievementsPanel.show();
    }

    async showLeaderboard() {
        const leaderboardPanel = await this.loadPanel('leaderboard');
        leaderboardPanel.show();
    }

    async showMall() {
        const mallPanel = await this.loadPanel('mall');
        mallPanel.show();
    }

    onReadingAdventureCompleted(data = {}, chapterId = null) {
        if (data.story_progress || data.progress_currency) {
            this.applyStorySnapshot({
                story_progress: data.story_progress,
                progress_currency: data.progress_currency,
                current_chapter: data.story_progress?.current_chapter_id || data.next_chapter_id || chapterId || null,
                current_node: data.selected_branch_id || null,
                dao_heart: data.progress_currency?.daoxin,
                story_keys: data.progress_currency?.story_keys,
                unlocked_nodes: data.story_progress?.collected_nodes || [],
            });
            return;
        }
        this.scheduleStorySync('reading-submit');
    }

    onMijingCompleted(data = {}) {
        if (data.story_progress || data.progress_currency) {
            this.applyStorySnapshot({
                story_progress: data.story_progress,
                progress_currency: data.progress_currency,
                current_chapter: data.story_progress?.current_chapter_id || null,
                current_node: data.story_progress?.selected_branches?.[data.story_progress?.current_chapter_id] || null,
                dao_heart: data.progress_currency?.daoxin,
                story_keys: data.progress_currency?.story_keys,
                unlocked_nodes: data.story_progress?.collected_nodes || [],
            });
            return;
        }
        this.scheduleStorySync('mijing-finish');
    }

    hydrateStoryState(userData = {}) {
        const progress = normalizeStoryProgress(userData.story_progress || defaultStoryProgress());
        const currencies = normalizeProgressCurrency(userData.progress_currency || defaultProgressCurrency());

        this.store.setStoryProgress(progress);
        this.store.setProgressCurrencies(currencies);
        this.store.updateUser({
            story_progress: progress,
            progress_currency: currencies,
            current_chapter: userData.current_chapter || progress.current_chapter_id,
            current_node: userData.current_node || progress.selected_branches?.[progress.current_chapter_id] || null,
            dao_heart: Number(userData.dao_heart ?? currencies.daoxin),
            story_keys: Number(userData.story_keys ?? currencies.story_keys),
            unlocked_nodes: Array.isArray(userData.unlocked_nodes) ? userData.unlocked_nodes : (progress.collected_nodes || []),
        });
    }

    getStorySnapshot() {
        const state = this.store.getState();
        const user = state.user || {};
        const progress = normalizeStoryProgress(state.story.progress || user.story_progress || defaultStoryProgress());
        const currencies = normalizeProgressCurrency(state.story.currencies || user.progress_currency || defaultProgressCurrency());
        const currentChapter = String(user.current_chapter || progress.current_chapter_id || 'R1-01');
        const currentNode = String(user.current_node || progress.selected_branches?.[currentChapter] || '');
        const unlockedNodes = Array.isArray(user.unlocked_nodes) ? user.unlocked_nodes : (progress.collected_nodes || []);

        return {
            current_chapter: currentChapter,
            current_node: currentNode || null,
            dao_heart: Number(user.dao_heart ?? currencies.daoxin),
            story_keys: Number(user.story_keys ?? currencies.story_keys),
            unlocked_nodes: unlockedNodes,
            story_progress: progress,
            progress_currency: currencies,
        };
    }

    applyStorySnapshot(data = {}) {
        const snapshot = {
            story_progress: normalizeStoryProgress(data.story_progress || {}),
            progress_currency: normalizeProgressCurrency(data.progress_currency || {}),
            current_chapter: data.current_chapter || null,
            current_node: data.current_node || null,
            dao_heart: Number(data.dao_heart ?? 0),
            story_keys: Number(data.story_keys ?? 0),
            unlocked_nodes: Array.isArray(data.unlocked_nodes) ? data.unlocked_nodes : [],
        };

        this.store.setStoryProgress(snapshot.story_progress);
        this.store.setProgressCurrencies(snapshot.progress_currency);
        this.store.updateUser({
            story_progress: snapshot.story_progress,
            progress_currency: snapshot.progress_currency,
            current_chapter: snapshot.current_chapter || snapshot.story_progress.current_chapter_id,
            current_node: snapshot.current_node || snapshot.story_progress.selected_branches?.[snapshot.story_progress.current_chapter_id] || null,
            dao_heart: snapshot.dao_heart || snapshot.progress_currency.daoxin,
            story_keys: snapshot.story_keys || snapshot.progress_currency.story_keys,
            unlocked_nodes: snapshot.unlocked_nodes.length ? snapshot.unlocked_nodes : (snapshot.story_progress.collected_nodes || []),
        });
    }

    updateStoryProgress(updates = {}, currencyUpdates = null) {
        const snapshot = this.getStorySnapshot();
        const nextProgress = normalizeStoryProgress({ ...snapshot.story_progress, ...updates });
        const nextCurrency = currencyUpdates
            ? normalizeProgressCurrency({ ...snapshot.progress_currency, ...currencyUpdates })
            : snapshot.progress_currency;

        this.applyStorySnapshot({
            story_progress: nextProgress,
            progress_currency: nextCurrency,
            current_chapter: nextProgress.current_chapter_id,
            current_node: nextProgress.selected_branches?.[nextProgress.current_chapter_id] || snapshot.current_node,
            dao_heart: nextCurrency.daoxin,
            story_keys: nextCurrency.story_keys,
            unlocked_nodes: nextProgress.collected_nodes || [],
        });

        this.scheduleStorySync('local-update');
    }

    scheduleStorySync(reason = 'manual') {
        if (!this.isLoggedIn) return;
        if (this.storySyncTimer) {
            clearTimeout(this.storySyncTimer);
        }

        this.storySyncTimer = setTimeout(async () => {
            this.storySyncTimer = null;
            const snapshot = this.getStorySnapshot();
            const res = await this.api.syncStoryProgress({
                ...snapshot,
                sync_reason: reason,
            });
            if (res?.success && res?.data) {
                this.applyStorySnapshot(res.data);
            }
        }, 350);
    }

    async submitStoryChoice(payload = {}) {
        const res = await this.api.submitStoryChoice(payload);
        if (res?.success && res?.data) {
            this.applyStorySnapshot(res.data);
            return res.data;
        }
        return null;
    }

    async logout() {
        if (this.storySyncTimer) {
            clearTimeout(this.storySyncTimer);
            this.storySyncTimer = null;
        }
        await this.api.post('/auth/logout');
        this.api.clearToken();
        this.store.setUser(null);
        this.store.setStoryProgress(null);
        this.store.setProgressCurrencies(null);
        this.isLoggedIn = false;
        this.showLogin();
    }

    handleForceLogout() {
        if (this.storySyncTimer) {
            clearTimeout(this.storySyncTimer);
            this.storySyncTimer = null;
        }
        this.isLoggedIn = false;
        this.store.setUser(null);
        this.store.setStoryProgress(null);
        this.store.setProgressCurrencies(null);
        this.ui.hideAllPanels();
        const bar = document.getElementById('character-bar');
        if (bar) bar.remove();
        this.showLogin();
    }

    ensureSceneInitialized() {
        if (this.sceneInitialized) return;
        const container = document.getElementById('game-container');
        if (!container) return;
        this.scene.init(container);
        this.sceneInitialized = true;
    }
}
