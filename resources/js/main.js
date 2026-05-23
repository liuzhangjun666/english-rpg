// LevelUp 英语修仙 - 入口文件
import { Game } from './core/Game.js';
import '../css/game.css';
import '../css/components.css';
import '../css/animations.css';
import '../css/mobile.css';

let gameInstance = null;

export function ensureLegacyGame({ autoInit = false } = {}) {
    if (!gameInstance) {
        gameInstance = new Game();
        window.__legacyGame = gameInstance;
    }
    if (autoInit) {
        gameInstance.init();
    }
    return gameInstance;
}

const migrationMode = window.__VUE_MIGRATION_ACTIVE__ === true;
if (!migrationMode) {
    ensureLegacyGame({ autoInit: true });
}

if ('serviceWorker' in navigator) {
    const host = window.location.hostname;
    const isLocalHost = host === '127.0.0.1' || host === 'localhost' || host === '::1';

    window.addEventListener('load', async () => {
        if (isLocalHost) {
            // Avoid stale cache during local debugging, which may cause blank pages.
            try {
                const regs = await navigator.serviceWorker.getRegistrations();
                await Promise.all(regs.map((reg) => reg.unregister()));
            } catch {
                // ignore
            }
            return;
        }

        navigator.serviceWorker.register('/sw.js').catch(() => {
            // ignore service worker registration failure
        });
    });
}
