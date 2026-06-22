import { defineStore } from 'pinia';

// ─── 侧边栏个人偏好持久化 ─────────────────────────────────────
// 用 localStorage 而不是 Pinia plugin：偏好不需要响应式持久化，App 启动时一次性读，
// 用户切换时一次性写。简单可靠，未接后端 /user/preferences 接口前最轻量的方案。
const SIDEBAR_VISIBLE_KEY = 'levelup_sidebar_visible';
const SIDEBAR_EXPANDED_KEY = 'levelup_sidebar_expanded';

function readSidebarVisible(): boolean {
  try {
    const v = localStorage.getItem(SIDEBAR_VISIBLE_KEY);
    return v === null ? true : v === '1';
  } catch { return true; }
}
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
    legacyPracticeOpen: false,
    isMapDragging: false,
    mapOverlayVisible: false,
    sidebarVisible: readSidebarVisible(),
    sidebarExpanded: readSidebarExpanded(),
  }),
  actions: {
    showLoading(text = '加载中...') {
      this.loading = true;
      this.loadingText = text;
    },
    hideLoading() {
      this.loading = false;
    },
    setLegacyPracticeOpen(open: boolean) {
      this.legacyPracticeOpen = open;
    },
    setMapDragging(dragging: boolean) {
      this.isMapDragging = dragging;
    },
    showMapOverlay() { this.mapOverlayVisible = true; },
    hideMapOverlay() { this.mapOverlayVisible = false; },
    setSidebarVisible(v: boolean) {
      this.sidebarVisible = v;
      try { localStorage.setItem(SIDEBAR_VISIBLE_KEY, v ? '1' : '0'); } catch { /* ignore */ }
    },
    setSidebarExpanded(v: boolean) {
      this.sidebarExpanded = v;
      try { localStorage.setItem(SIDEBAR_EXPANDED_KEY, v ? '1' : '0'); } catch { /* ignore */ }
    },
  },
});
