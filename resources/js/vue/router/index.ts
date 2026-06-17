import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useApiClient } from '../services/api';
import { useUserStore } from '../stores/user';
import { restoreSessionFromStorage } from '../services/session';

const LEGACY_HASH_MAP: Record<string, string> = {
  '#hall': '/hall',
  '#practice': '/practice',
  '#grammar': '/grammar',
  '#login': '/login',
  '#vocab': '/practice',
  '#listening': '/practice',
  '#speaking': '/practice',
  '#writing': '/practice',
  '#reading': '/reading',
  '#cangjingge': '/reading',
  '#shilianchang': '/exam',
  '#mijing': '/mijing',
  '#mall': '/mall',
  '#leaderboard': '/leaderboard',
  '#vocab-assessment-intro': '/vocab-assessment/intro',
  '#initiation': '/onboarding',
};

const LEGACY_HASH_MODE: Record<string, string> = {
  '#vocab': 'vocab',
  '#listening': 'listening',
  '#speaking': 'speaking',
  '#writing': 'writing',
};

/** Must run before createRouter so history mode reads the migrated path. */
export function normalizeLegacyHashRoute() {
  const raw = window.location.hash || '';
  if (!raw) return;

  const hashBase = raw.split('?')[0];
  const mapped = LEGACY_HASH_MAP[hashBase];
  if (!mapped) return;

  const mode = LEGACY_HASH_MODE[hashBase];
  const url = mode ? `${mapped}?mode=${mode}` : mapped;
  window.history.replaceState({}, '', url);
}

normalizeLegacyHashRoute();

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/hall',
    redirect: '/practice',
  },
  {
    path: '/practice',
    name: 'practice',
    component: () => import('../views/PracticeView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/grammar',
    name: 'grammar',
    component: () => import('../views/PracticeView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/reading',
    name: 'reading',
    component: () => import('../views/ReadingAdventureView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/exam',
    name: 'exam',
    component: () => import('../views/ExamAdventureView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/mijing',
    name: 'mijing',
    component: () => import('../views/MijingAdventureView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/mall',
    name: 'mall',
    component: () => import('../views/MallView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/leaderboard',
    name: 'leaderboard',
    component: () => import('../views/LeaderboardView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/onboarding',
    name: 'onboarding',
    component: () => import('../views/OnboardingView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/vocab-assessment/intro',
    name: 'vocab-assessment-intro',
    component: () => import('../views/VocabularyAssessmentIntro.vue'),
    meta: { requiresAuth: true, assessmentFlow: true },
  },
  {
    path: '/vocab-assessment/profile',
    name: 'vocab-assessment-profile',
    component: () => import('../views/VocabularyAssessmentProfile.vue'),
    meta: { requiresAuth: true, assessmentFlow: true },
  },
  {
    path: '/vocab-assessment/question/:assessmentId',
    name: 'vocab-assessment-question',
    component: () => import('../views/VocabularyAssessmentQuestion.vue'),
    meta: { requiresAuth: true, assessmentFlow: true },
  },
  {
    path: '/vocab-assessment/result/:assessmentId',
    name: 'vocab-assessment-result',
    component: () => import('../views/VocabularyAssessmentResult.vue'),
    meta: { requiresAuth: true, assessmentFlow: true },
  },
  { path: '/', redirect: '/hall' },
  { path: '/:pathMatch(.*)*', name: 'not-found', redirect: '/hall' },
  {
    path: '/map',
    name: 'map',
    component: () => import('../views/SectWorldView.vue'),
    meta: { requiresAuth: true },
  },
  { path: '/', redirect: '/practice' },
  { path: '/:pathMatch(.*)*', redirect: '/practice' },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

let bootstrapReady: Promise<void> | null = null;

export function setBootstrapWaiter(promise: Promise<void>) {
  bootstrapReady = promise;
}

function waitForBootstrap() {
  return bootstrapReady ?? Promise.resolve();
}

export async function resolveAssessmentDone(): Promise<boolean> {
  const user = useUserStore();
  let done = Number(user.profile?.initial_assessment_done ?? 0) === 1;
  if (done) return true;

  const api = useApiClient();
  try {
    const res = await api.get('/vocab-assessment/status', { skipAuthLogout: true });
    if (res?.success) {
      done = !!res.data?.done;
      if (user.profile) {
        const patch: Record<string, any> = {
          initial_assessment_done: done ? 1 : 0,
        };
        if (res.data?.current_realm) {
          patch.current_realm = res.data.current_realm;
        }
        user.updateProfile(patch);
      }
    }
  } catch {
    // 状态接口不可用时，沿用本地缓存判断。
  }

  return done;
}

function pickRedirectQuery(source: Record<string, unknown>, fallback = '/hall') {
  const redirect = String(source.redirect || '').trim();
  if (redirect && redirect.startsWith('/')) {
    return redirect;
  }
  return fallback;
}

function buildAssessmentIntroLocation(redirect?: string, extra: Record<string, string> = {}) {
  const query: Record<string, string> = { ...extra };
  if (redirect && redirect !== '/hall') {
    query.redirect = redirect;
  }
  return { path: '/vocab-assessment/intro', query };
}

router.beforeEach(async (to) => {
  await waitForBootstrap();

  const auth = useAuthStore();
  restoreSessionFromStorage();

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { path: '/login', query: { redirect: to.fullPath } };
  }

  if (to.meta.guestOnly && auth.isAuthenticated) {
    const done = await resolveAssessmentDone();
    const redirect = pickRedirectQuery(to.query as Record<string, unknown>);
    if (done) {
      return redirect;
    }
    const query: Record<string, string> = {};
    if (redirect !== '/hall') query.redirect = redirect;
    return buildAssessmentIntroLocation(undefined, query);
  }

  if (auth.isAuthenticated) {
    const isAssessmentRoute = to.meta.assessmentFlow === true;
    if (!isAssessmentRoute) {
      const done = await resolveAssessmentDone();
      if (!done) {
        const redirect = to.fullPath !== '/hall' ? to.fullPath : '';
        const query: Record<string, string> = {};
        if (redirect) query.redirect = redirect;
        return buildAssessmentIntroLocation(undefined, query);
      }
    }
    return { path: '/practice' };
  }

  return true;
});

export function normalizeLegacyHashRoute() {
  const hash = window.location.hash || '';
  const mapping: Record<string, string> = {
    '#hall': '/practice',
    '#practice': '/practice',
    '#login': '/login',
    '#vocab': '/practice',
    '#listening': '/practice',
    '#speaking': '/practice',
    '#writing': '/practice',
    '#reading': '/reading',
    '#shilianchang': '/exam',
    '#mijing': '/mijing',
    '#mall': '/mall',
    '#leaderboard': '/leaderboard',
  };
  const mapped = mapping[hash];
  if (mapped) {
    window.history.replaceState({}, '', mapped);
  }
}
