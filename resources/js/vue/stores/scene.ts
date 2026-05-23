import { defineStore } from 'pinia';

export const useSceneStore = defineStore('scene', {
  state: () => ({
    current: 'hall' as 'hall' | 'practice' | 'login',
  }),
  actions: {
    setScene(scene: 'hall' | 'practice' | 'login') {
      this.current = scene;
    },
  },
});
