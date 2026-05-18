import { APIClient } from './APIClient.js';
import { Store } from './Store.js';
import { Router } from './Router.js';
import { UIManager } from '../ui/UIManager.js';
import { SceneManager } from '../scenes/SceneManager.js';
import { PracticePanel } from '../ui/PracticePanel.js';
import { ExamPanel } from '../ui/ExamPanel.js';
import { InitiationPanel } from '../ui/InitiationPanel.js';
import { ReviewPanel } from '../ui/ReviewPanel.js';
import { DemonsPanel } from '../ui/DemonsPanel.js';
import { ParentPanel } from '../ui/ParentPanel.js';
import { AchievementPanel } from '../ui/AchievementPanel.js';
import { LeaderboardPanel } from '../ui/LeaderboardPanel.js';
import { MallPanel } from '../ui/MallPanel.js';
import { MijingPanel } from '../ui/MijingPanel.js';
import { ShareCard } from '../ui/ShareCard.js';
import { ReadingPanel } from '../ui/ReadingPanel.js';
import { HermesClient } from '../hermes/HermesClient.js';

export class Game {
    constructor() {
        this.api = new APIClient();
        this.store = new Store();
        this.router = new Router(this);
        this.ui = new UIManager(this);
        this.scene = new SceneManager();
        this.practice = new PracticePanel(this);
        this.exam = new ExamPanel(this);
        this.initiation = new InitiationPanel(this);
        this.review = new ReviewPanel(this);
        this.demons = new DemonsPanel(this);
        this.parentPanel = new ParentPanel(this);
        this.achievements = new AchievementPanel(this);
        this.leaderboard = new LeaderboardPanel(this);
        this.mall = new MallPanel(this);
        this.mijing = new MijingPanel(this);
        this.reading = new ReadingPanel(this);
        this.shareCard = new ShareCard(this);
        this.hermes = new HermesClient(this);
        this.isLoggedIn = false;
        this.isNewUser = false;
        this.sceneInitialized = false;
        this.routeRestoring = false;
        window.addEventListener('auth:logout', () => this.handleForceLogout());
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
        this.isLoggedIn = true;

        const isFresh =
            res.data.exp === 0 &&
            res.data.realm === 'L1' &&
            res.data.realm_stage === 1;

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

    startPracticeModule(type) {
        this.navigateIfNeeded(type);

        if (type === 'reading') {
            this.startReadingAdventure();
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
        this.showLevelSelect(type);
    }

    startReadingAdventure() {
        this.ensureSceneInitialized();
        this.scene.switchTo('cangjingge');
        const stage = Number(this.store.getState().user?.realm_stage || 1);
        const targetLevel = stage >= 2 ? 2 : 1;
        this.reading.showChapterList(targetLevel);
    }

    showLevelSelect(type) {
        this.ui.hideAllPanels();
        this.practice.showLevelSelect(type);
    }

    startPractice(type, level) {
        if (type === 'vocab') {
            const mode = Number(level) >= 2 ? 'dange' : 'vocab';
            this.scene.switchTo('practice', { mode });
        }
        this.practice.startLevel(type, level);
    }

    startExam() {
        this.exam.checkPreExamReview();
    }

    startReview() {
        this.review.startReview();
    }

    showDemons() {
        this.demons.show();
    }

    showParentDashboard() {
        this.parentPanel.show();
    }

    showAchievements() {
        this.achievements.show();
    }

    showLeaderboard() {
        this.leaderboard.show();
    }

    showMall() {
        this.mall.show();
    }

    async logout() {
        await this.api.post('/auth/logout');
        this.api.clearToken();
        this.store.setUser(null);
        this.isLoggedIn = false;
        this.showLogin();
    }

    handleForceLogout() {
        this.isLoggedIn = false;
        this.store.setUser(null);
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
