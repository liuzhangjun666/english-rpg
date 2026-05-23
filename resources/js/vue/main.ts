import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router, normalizeLegacyHashRoute } from './router';
import { useApiClient } from './services/api';
import { useAuthStore } from './stores/auth';
import { useUserStore } from './stores/user';
import { useStoryStore } from './stores/story';
import { useLegacyBridge } from './composables/useLegacyBridge';
import { installElementPlus } from './plugins/element';
import '../../css/vue/app.css';

normalizeLegacyHashRoute();

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);
app.use(router);
installElementPlus(app);

const api = useApiClient();
const bridge = useLegacyBridge();
const auth = useAuthStore();
const user = useUserStore();
const story = useStoryStore();

async function bootstrapSession() {
  const token = api.getStoredToken();
  if (!token) {
    auth.clearToken();
    auth.markBootstrapped();
    return;
  }

  auth.setToken(token);
  api.setToken(token);

  try {
    const res = await api.get('/user/profile');
    if (!res?.success || !res?.data) {
      auth.clearToken();
      api.clearToken();
      return;
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
  } catch {
    auth.clearToken();
    api.clearToken();
  } finally {
    auth.markBootstrapped();
  }
}

window.addEventListener('auth:logout', async () => {
  await bridge.clearSession();
  auth.clearToken();
  user.clearProfile();
  story.setSnapshot(null);
  router.replace('/login');
});

bootstrapSession().finally(async () => {
  await router.isReady();
  if (auth.isAuthenticated && router.currentRoute.value.path === '/login') {
    router.replace('/hall');
  }
  if (!auth.isAuthenticated && router.currentRoute.value.path !== '/login') {
    router.replace('/login');
  }
});

app.mount('#vue-app');
