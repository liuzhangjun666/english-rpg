import { useApiClient } from './api';
import { useUserStore } from '../stores/user';
import { useStoryStore } from '../stores/story';
import { useLegacyBridge } from '../composables/useLegacyBridge';

export async function refreshUserProfileFromApi(options: { skipAuthLogout?: boolean } = {}) {
  const api = useApiClient();
  const user = useUserStore();
  const story = useStoryStore();
  const bridge = useLegacyBridge();

  const res = await api.get('/user/profile', { skipAuthLogout: options.skipAuthLogout ?? true });
  if (!res?.success || !res?.data) {
    return null;
  }

  user.setProfile(res.data);
  story.setSnapshot({
    current_chapter: res.data.current_chapter,
    current_node: res.data.current_node,
    dao_heart: res.data.dao_heart,
    story_keys: res.data.story_keys,
    unlocked_nodes: res.data.unlocked_nodes,
    story_progress: res.data.story_progress,
    progress_currency: res.data.progress_currency,
  });
  await bridge.applySessionFromProfile(res.data);

  return res.data;
}
