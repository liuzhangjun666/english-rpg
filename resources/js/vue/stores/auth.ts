import { defineStore } from 'pinia';
import { useApiClient } from '../services/api';

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
      const normalized = String(token || '').trim();
      this.token = normalized;
      if (normalized) {
        useApiClient().setToken(normalized);
      }
    },
    clearToken() {
      this.token = '';
      useApiClient().clearToken();
    },
    markBootstrapped() {
      this.bootstrapped = true;
    },
  },
});
