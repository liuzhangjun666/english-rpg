import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router, resolveAssessmentDone, setBootstrapWaiter } from './router';
import { useApiClient } from './services/api';
import { useAuthStore } from './stores/auth';
import { useUserStore } from './stores/user';
import { useStoryStore } from './stores/story';
import { useLegacyBridge } from './composables/useLegacyBridge';
import { signOut, restoreSessionFromStorage } from './services/session';
import { refreshUserProfileFromApi } from './services/profile';
import { installElementPlus } from './plugins/element';
import '../../css/vue/app.css';
import btnEnterIcon from '../../assets/images/ui/btn_enter.png';
import btnChallengeIcon from '../../assets/images/ui/btn_challenge.png';
import btnSubmitIcon from '../../assets/images/ui/btn_submit.png';
import btnConfirmIcon from '../../assets/images/ui/btn_confirm.png';
import btnBackIcon from '../../assets/images/ui/btn_back.png';
import btnContinueIcon from '../../assets/images/ui/btn_continue.png';
import btnRestartIcon from '../../assets/images/ui/btn_restart.png';

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
installElementPlus(app);

const api = useApiClient();
const bridge = useLegacyBridge();
const auth = useAuthStore();
const user = useUserStore();
const story = useStoryStore();

(window as any).__VUE_API_CLIENT__ = api;

restoreSessionFromStorage();

async function bootstrapSession() {
  const hasToken = restoreSessionFromStorage();
  if (!hasToken) {
    auth.markBootstrapped();
    return;
  }

  try {
    let profile = await refreshUserProfileFromApi({ skipAuthLogout: true });
    if (!profile) {
      const refreshed = await api.post('/auth/refresh', null, { skipAuthLogout: true });
      if (refreshed?.success && refreshed?.data?.token) {
        const nextToken = String(refreshed.data.token);
        api.setToken(nextToken);
        auth.setToken(nextToken);
        profile = await refreshUserProfileFromApi({ skipAuthLogout: true });
      }
    }
  } catch {
    // 网络异常时保留本地 token，允许用户继续使用。
  } finally {
    auth.markBootstrapped();
  }
}

window.addEventListener('auth:logout', async () => {
  await signOut();
  window.location.replace('/login');
});

const bootstrapDone = bootstrapSession();
setBootstrapWaiter(bootstrapDone);

app.use(router);

bootstrapDone.finally(async () => {
  await router.isReady();
  const current = router.currentRoute.value;
  if (auth.isAuthenticated && current.path === '/login') {
    const done = await resolveAssessmentDone();
    const redirect = String(current.query.redirect || '/hall');
    if (done) {
      router.replace(redirect);
    } else {
      const query: Record<string, string> = {};
      if (redirect && redirect !== '/hall') query.redirect = redirect;
      router.replace({ path: '/vocab-assessment/intro', query });
    }
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
