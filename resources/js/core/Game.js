// LevelUp 英语修仙 - 主游戏类（完整版 P1+P2）
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
import { ShareCard } from '../ui/ShareCard.js';
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
        this.shareCard = new ShareCard(this);
        this.hermes = new HermesClient(this);
        this.isLoggedIn = false;
        this.isNewUser = false;
        window.addEventListener('auth:logout', () => this.handleForceLogout());
    }

    init() {
        console.log('🌿 LevelUp 英语修仙 启动中...');
        const c = document.getElementById('game-container');
        if (c) this.scene.init(c);
        this.ui.showLoading('灵脉连接中...');
        const t = this.api.getStoredToken();
        if (t) {
            this.api.setToken(t);
            this.api.get('/user/profile').then(r => {
                if (r.success) { this.store.setUser(r.data); this.isLoggedIn = true; if (r.data.exp === 0 && r.data.realm === 'L1' && r.data.realm_stage === 1) { this.isNewUser = true; this.startInitiation(); } else { this.enterHall(); } }
                else { this.api.clearToken(); this.showLogin(); }
            }).catch(() => { this.api.clearToken(); this.showLogin(); });
        } else { setTimeout(() => this.showLogin(), 600); }
    }

    showLogin() { this.ui.hideLoading(); this.ui.hideAllPanels(); const b = document.getElementById('character-bar'); if (b) b.remove(); this.ui.showLoginPanel(); }
    onRegisterSuccess(d) { this.store.setUser(d); this.isLoggedIn = true; this.isNewUser = true; this.startInitiation(); }
    startInitiation() { this.ui.hideLoading(); this.initiation.start(); }

    enterHall() { this.scene.switchTo('hall'); this.ui.hideAllPanels(); this.ui.showCharacterBar(); this.ui.showHallScene(); this.router.navigate('hall'); }

    goToScene(s) {
        switch (s) {
            case 'practice': this.scene.switchTo('practice'); this.showLevelSelect('vocab'); break;
            case 'shilianchang': this.scene.switchTo('shilianchang'); this.startExam(); break;
            case 'cangjingge': this.scene.switchTo('cangjingge'); this.showLevelSelect('grammar'); break;
            case 'mijing': this.scene.switchTo('mijing'); this.ui.hideAllPanels(); this.ui.showCharacterBar(); this.ui.showHallScene(); break;
            default: this.enterHall();
        }
    }

    showLevelSelect(t) { this.ui.hideAllPanels(); this.practice.showLevelSelect(t); }
    startPractice(t, l) { this.practice.startLevel(t, l); }
    startExam() { this.exam.checkPreExamReview(); }
    startReview() { this.review.startReview(); }
    showDemons() { this.demons.show(); }
    showParentDashboard() { this.parentPanel.show(); }
    showAchievements() { this.achievements.show(); }
    showLeaderboard() { this.leaderboard.show(); }
    showMall() { this.mall.show(); }

    async logout() { await this.api.post('/auth/logout'); this.api.clearToken(); this.store.setUser(null); this.isLoggedIn = false; this.showLogin(); }
    handleForceLogout() { this.isLoggedIn = false; this.store.setUser(null); this.ui.hideAllPanels(); const b = document.getElementById('character-bar'); if (b) b.remove(); this.showLogin(); }
}
