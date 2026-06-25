import { useApiClient } from './api';
import { useAuthStore } from '../stores/auth';
import { useUserStore } from '../stores/user';
import { useStoryStore } from '../stores/story';
import { useLegacyBridge } from '../composables/useLegacyBridge';

/** Restore token from storage into API client + auth store (sync). */
export function restoreSessionFromStorage() {
  const api = useApiClient();
  const auth = useAuthStore();
  const user = useUserStore();
  const token = api.getStoredToken();
  if (!token) {
    auth.clearToken();
    user.clearProfile();
    return false;
  }
  api.setToken(token);
  auth.setToken(token);
  // 先用上次缓存的资料水合，避免冷启动/弱网时 /user/profile 慢或瞬时失败导致
  // TopHud 回退到默认值并卡住；bootstrap 拉取成功后会覆盖为最新数据。
  user.restoreCachedProfile();
  return true;
}

/** Clear client session state immediately (sync, no network). */
export function clearClientSession() {
  const auth = useAuthStore();
  const user = useUserStore();
  const story = useStoryStore();

  auth.clearToken();
  user.clearProfile();
  story.setSnapshot(null);
}

/** Full sign-out including legacy game cleanup. */
export async function signOut() {
  clearClientSession();
  const bridge = useLegacyBridge();
  try {
    await bridge.clearSession();
  } catch {
    // Legacy cleanup must not block logout.
  }
}
