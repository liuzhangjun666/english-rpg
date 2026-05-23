import { defineStore } from 'pinia';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: '' as string,
    bootstrapped: false,
  }),
  getters: {
    isAuthenticated: (state) => !!state.token,
  },
  actions: {
    setToken(token: string) {
      this.token = token || '';
    },
    clearToken() {
      this.token = '';
    },
    markBootstrapped() {
      this.bootstrapped = true;
    },
  },
});
