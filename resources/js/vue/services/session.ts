import { useApiClient } from './api';
import { useAuthStore } from '../stores/auth';
import { useUserStore } from '../stores/user';
import { useStoryStore } from '../stores/story';
import { useLegacyBridge } from '../composables/useLegacyBridge';

/** Restore token from storage into API client + auth store (sync). */
export function restoreSessionFromStorage() {
  const api = useApiClient();
  const auth = useAuthStore();
  const token = api.getStoredToken();
  if (!token) {
    auth.clearToken();
    return false;
  }
  api.setToken(token);
  auth.setToken(token);
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
