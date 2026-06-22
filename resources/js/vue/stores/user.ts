import { defineStore } from 'pinia';
import { mergeRealmPatch, normalizeUserProfile } from '../../utils/cultivation.js';

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
      this.profile = normalizeUserProfile(profile);
    },
    updateProfile(updates: Record<string, any>) {
      if (!this.profile) return;
      const patch = mergeRealmPatch(this.profile, updates);
      this.profile = normalizeUserProfile({ ...this.profile, ...patch });
    },
    clearProfile() {
      this.profile = null;
    },
  },
});
