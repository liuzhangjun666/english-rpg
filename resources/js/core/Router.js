// LevelUp 英语修仙 - 客户端路由（五大场景）
export class Router {
    constructor(game) {
        this.game = game;
        this.routes = {
            'login': () => this.game.showLogin(),
            'initiation': () => this.game.startInitiation(),
            'hall': () => this.game.enterHall(),
            'practice': () => this.game.goToScene('practice'),
            'shilianchang': () => this.game.goToScene('shilianchang'),
            'cangjingge': () => this.game.goToScene('cangjingge'),
            'listening': async () => await this.game.startPracticeModuleAsync('listening'),
            'speaking': async () => await this.game.startPracticeModuleAsync('speaking'),
            'reading': async () => await this.game.startPracticeModuleAsync('reading'),
            'writing': async () => await this.game.startPracticeModuleAsync('writing'),
            'mijing': () => this.game.goToScene('mijing'),
            'profile': () => this.game.ui.showProfilePanel(),
        };
        // Lazy‑load panel modules only when needed
        this.panelLoaders = {
            reading: () => import('../ui/ReadingPanel.js').then(m => m.ReadingPanel),
            practice: () => import('../ui/PracticePanel.js').then(m => m.PracticePanel),
            listening: () => import('../ui/PracticePanel.js').then(m => m.PracticePanel),
            speaking: () => import('../ui/PracticePanel.js').then(m => m.PracticePanel),
            writing: () => import('../ui/PracticePanel.js').then(m => m.PracticePanel),
            demons: () => import('../ui/DemonsPanel.js').then(m => m.DemonsPanel),
            parent: () => import('../ui/ParentPanel.js').then(m => m.ParentPanel),
            achievements: () => import('../ui/AchievementPanel.js').then(m => m.AchievementPanel),
            leaderboard: () => import('../ui/LeaderboardPanel.js').then(m => m.LeaderboardPanel),
            mall: () => import('../ui/MallPanel.js').then(m => m.MallPanel),
        };
        window.addEventListener('hashchange', () => this.handleRoute());
    }

    navigate(path, params = {}) {
        const query = Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '';
        window.location.hash = `#${path}${query}`;
    }

    handleRoute() {
        const hash = window.location.hash.slice(1) || 'login';
        const [path] = hash.split('?');

        if (path === 'login' && this.game.isLoggedIn) {
            this.navigate('hall');
            return;
        }

        if (path !== 'login' && !this.game.isLoggedIn) {
            this.navigate('login');
            return;
        }

        for (const [route, handler] of Object.entries(this.routes)) {
            if (path.startsWith(route)) {
                handler();
                return;
            }
        }
        if (this.game.isLoggedIn) this.navigate('hall');
        else this.navigate('login');
    }
}
