import { defineStore } from 'pinia';

// ─── 侧边栏个人偏好持久化 ─────────────────────────────────────
// sidebarVisible 的 UI 切换入口已移除，侧边栏保持恒定显示；
// 顺手清掉用户之前可能存下的旧 key，避免被遗留的 '0' 锁死。
const SIDEBAR_VISIBLE_KEY = 'levelup_sidebar_visible';
const SIDEBAR_EXPANDED_KEY = 'levelup_sidebar_expanded';

try { localStorage.removeItem(SIDEBAR_VISIBLE_KEY); } catch { /* ignore */ }

function readSidebarExpanded(): boolean {
  try {
    const v = localStorage.getItem(SIDEBAR_EXPANDED_KEY);
    return v === null ? false : v === '1';
  } catch { return false; }
}

export const useUiStore = defineStore('ui', {
  state: () => ({
    loading: false,
    loadingText: '加载中...',
    loadingProgress: null as number | null,
    legacyPracticeOpen: false,
    isMapDragging: false,
    mapOverlayVisible: false,
    sidebarVisible: true,
    sidebarExpanded: readSidebarExpanded(),
  }),
  actions: {
    showLoading(text = '加载中...') {
      this.loading = true;
      this.loadingText = text;
      this.loadingProgress = null;
    },
    setLoadingProgress(progress: number) {
      this.loadingProgress = Math.min(1, Math.max(0, progress));
    },
    hideLoading() {
      this.loading = false;
      this.loadingProgress = null;
    },
    setLegacyPracticeOpen(open: boolean) {
      this.legacyPracticeOpen = open;
    },
    setMapDragging(dragging: boolean) {
      this.isMapDragging = dragging;
    },
    showMapOverlay() { this.mapOverlayVisible = true; },
    hideMapOverlay() { this.mapOverlayVisible = false; },
    setSidebarExpanded(v: boolean) {
      this.sidebarExpanded = v;
      try { localStorage.setItem(SIDEBAR_EXPANDED_KEY, v ? '1' : '0'); } catch { /* ignore */ }
    },
  },
});
