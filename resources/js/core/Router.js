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
