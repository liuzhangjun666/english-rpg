import { defineStore } from 'pinia';

export const useUiStore = defineStore('ui', {
  state: () => ({
    loading: false,
    loadingText: '加载中...',
    legacyPracticeOpen: false,
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
  },
});
