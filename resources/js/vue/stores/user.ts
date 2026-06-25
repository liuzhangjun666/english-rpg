import { defineStore } from 'pinia';
import { mergeRealmPatch, normalizeUserProfile } from '../../utils/cultivation.js';

export type UserProfile = Record<string, any> | null;

/**
 * 上次成功拉取的用户资料缓存键。用于「先展示缓存、后台再校验」(stale-while-revalidate)：
 * 冷启动 / 弱网时 /user/profile 可能慢或瞬时失败，此时若无缓存，TopHud 会回退到
 * 「匿名前辈 / 0 / 0」默认值并卡住直到下次刷新。缓存可让界面立即显示上次真实资料。
 */
const PROFILE_CACHE_KEY = 'levelup_profile';

function persistProfile(profile: UserProfile) {
  try {
    if (profile) {
      localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
    } else {
      localStorage.removeItem(PROFILE_CACHE_KEY);
    }
  } catch {
    // localStorage 不可用（隐私模式 / 配额）时忽略，不影响主流程。
  }
}

function readCachedProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

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
      persistProfile(this.profile);
    },
    updateProfile(updates: Record<string, any>) {
      if (!this.profile) return;
      const patch = mergeRealmPatch(this.profile, updates);
      this.profile = normalizeUserProfile({ ...this.profile, ...patch });
      persistProfile(this.profile);
    },
    /**
     * 同步从本地缓存恢复资料（仅在已有 token 时调用）。返回是否命中缓存。
     * 后续 bootstrap 的网络拉取会用最新数据覆盖。
     */
    restoreCachedProfile(): boolean {
      if (this.profile) return true;
      const cached = readCachedProfile();
      if (!cached) return false;
      this.profile = normalizeUserProfile(cached);
      return true;
    },
    clearProfile() {
      this.profile = null;
      persistProfile(null);
    },
  },
});
