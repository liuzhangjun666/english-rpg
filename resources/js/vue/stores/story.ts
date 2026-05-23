import { defineStore } from 'pinia';

export const useStoryStore = defineStore('story', {
  state: () => ({
    snapshot: null as Record<string, any> | null,
  }),
  actions: {
    setSnapshot(snapshot: Record<string, any> | null) {
      this.snapshot = snapshot;
    },
  },
});
