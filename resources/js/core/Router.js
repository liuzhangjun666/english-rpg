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
            'listening': () => this.game.startPracticeModule('listening'),
            'speaking': () => this.game.startPracticeModule('speaking'),
            'reading': () => this.game.startPracticeModule('reading'),
            'writing': () => this.game.startPracticeModule('writing'),
            'mijing': () => this.game.goToScene('mijing'),
            'profile': () => this.game.ui.showProfilePanel(),
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
