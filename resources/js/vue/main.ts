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
import btnEnterIcon from '../../assets/images/ui/btn_enter.png';
import btnChallengeIcon from '../../assets/images/ui/btn_challenge.png';
import btnSubmitIcon from '../../assets/images/ui/btn_submit.png';
import btnConfirmIcon from '../../assets/images/ui/btn_confirm.png';
import btnBackIcon from '../../assets/images/ui/btn_back.png';
import btnContinueIcon from '../../assets/images/ui/btn_continue.png';
import btnRestartIcon from '../../assets/images/ui/btn_restart.png';

normalizeLegacyHashRoute();

const BUTTON_SKIN_CLASSES = [
  'btn-art-enter',
  'btn-art-challenge',
  'btn-art-submit',
  'btn-art-confirm',
  'btn-art-back',
  'btn-art-continue',
  'btn-art-restart',
];

function normalizeButtonLabel(label: string) {
  return String(label || '')
    .replace(/[\s\r\n\t]/g, '')
    .replace(/[^\u4e00-\u9fa5A-Za-z0-9]/g, '')
    .trim();
}

function resolveSkinKey(label: string) {
  const normalized = normalizeButtonLabel(label);
  if (!normalized) return '';
  if (normalized.includes('重新开始') || normalized.includes('重开') || normalized.includes('再来') || normalized.includes('再试') || normalized.includes('重试') || normalized.includes('再闯')) return 'restart';
  if (normalized.includes('继续') || normalized.includes('下一')) return 'continue';
  if (normalized.includes('挑战') || normalized.includes('试炼')) return 'challenge';
  if (normalized.includes('提交') || normalized.includes('交卷')) return 'submit';
  if (normalized.includes('确定') || normalized.includes('确认')) return 'confirm';
  if (normalized.includes('返回') || normalized.includes('取消') || normalized.includes('离开') || normalized.includes('退出')) return 'back';
  if (normalized.includes('进入') || normalized.includes('前往') || normalized.includes('开始')) return 'enter';
  return '';
}

function resolveSkinAsset(skinKey: string) {
  const map: Record<string, string> = {
    enter: btnEnterIcon,
    challenge: btnChallengeIcon,
    submit: btnSubmitIcon,
    confirm: btnConfirmIcon,
    back: btnBackIcon,
    continue: btnContinueIcon,
    restart: btnRestartIcon,
  };
  return map[String(skinKey || '').trim()] || '';
}

function applyVueButtonSkins(root?: ParentNode) {
  const scope = root && 'querySelectorAll' in root ? root : document;
  const buttons = Array.from(scope.querySelectorAll('button.el-button'));
  buttons.forEach((btn) => {
    if (btn.classList.contains('nav-portal-btn')) return;
    const forcedSkin = String(btn.getAttribute('data-btn-skin') || '').trim();
    const skinKey = forcedSkin || resolveSkinKey(btn.textContent || '');
    BUTTON_SKIN_CLASSES.forEach((cls) => btn.classList.remove(cls));
    btn.classList.remove('btn-art');
    btn.style.removeProperty('--btn-art-bg');
    if (!skinKey) return;
    const asset = resolveSkinAsset(skinKey);
    if (!asset) return;
    btn.classList.add('btn-art', `btn-art-${skinKey}`);
    btn.style.setProperty('--btn-art-bg', `url("${asset}")`);
  });
}

const app = createApp(App);
export const pinia = createPinia();
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
  requestAnimationFrame(() => applyVueButtonSkins(document.body));
});

app.mount('#vue-app');

let pendingSkinApply = false;
const skinObserver = new MutationObserver(() => {
  if (pendingSkinApply) return;
  pendingSkinApply = true;
  requestAnimationFrame(() => {
    pendingSkinApply = false;
    applyVueButtonSkins(document.body);
  });
});
skinObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
router.afterEach(() => {
  requestAnimationFrame(() => applyVueButtonSkins(document.body));
});
