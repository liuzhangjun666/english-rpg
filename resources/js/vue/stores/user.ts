import { defineStore } from 'pinia';

export type UserProfile = Record<string, any> | null;

export const useUserStore = defineStore('user', {
  state: () => ({
    profile: null as UserProfile,
  }),
  getters: {
    isLoggedIn: (state) => !!state.profile,
    nickname: (state) => state.profile?.nickname || '',
  },
  actions: {
    setProfile(profile: Record<string, any>) {
      this.profile = profile;
    },
    updateProfile(updates: Record<string, any>) {
      if (!this.profile) return;
      this.profile = { ...this.profile, ...updates };
    },
    clearProfile() {
      this.profile = null;
    },
  },
});
