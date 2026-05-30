import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useApiClient } from '../services/api';
import { useUserStore } from '../stores/user';

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/hall',
    name: 'hall',
    component: () => import('../views/HallView.vue'),
    meta: { requiresAuth: true },
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
    path: '/vocab-assessment/intro',
    name: 'vocab-assessment-intro',
    component: () => import('../views/VocabularyAssessmentIntro.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/vocab-assessment/profile',
    name: 'vocab-assessment-profile',
    component: () => import('../views/VocabularyAssessmentProfile.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/vocab-assessment/question/:assessmentId',
    name: 'vocab-assessment-question',
    component: () => import('../views/VocabularyAssessmentQuestion.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/vocab-assessment/result/:assessmentId',
    name: 'vocab-assessment-result',
    component: () => import('../views/VocabularyAssessmentResult.vue'),
    meta: { requiresAuth: true },
  },
  { path: '/', redirect: '/hall' },
  { path: '/:pathMatch(.*)*', redirect: '/hall' },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  const user = useUserStore();
  if (!auth.bootstrapped) return true;

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { path: '/login', query: { redirect: to.fullPath } };
  }

  if (to.meta.guestOnly && auth.isAuthenticated) {
    return { path: '/hall' };
  }

  if (auth.isAuthenticated) {
    const isAssessmentRoute = to.path.startsWith('/vocab-assessment');
    if (!isAssessmentRoute) {
      let done = Number(user.profile?.initial_assessment_done ?? -1) === 1;

      if (!done) {
        const api = useApiClient();
        try {
          const res = await api.get('/vocab-assessment/status');
          if (res?.success) {
            done = !!res.data?.done;
            if (user.profile) {
              user.updateProfile({
                initial_assessment_done: done ? 1 : 0,
                current_realm: res.data?.current_realm ?? user.profile.current_realm,
              });
            }
          }
        } catch {
          // Fallback to current route when status api is unavailable.
        }
      }

      if (!done) {
        return { path: '/vocab-assessment/intro', query: { redirect: to.fullPath } };
      }
    }
  }

  return true;
});

export function normalizeLegacyHashRoute() {
  const hash = window.location.hash || '';
  const mapping: Record<string, string> = {
    '#hall': '/hall',
    '#practice': '/practice',
    '#grammar': '/grammar',
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
    '#vocab-assessment-intro': '/vocab-assessment/intro',
  };
  const mapped = mapping[hash];
  if (mapped) {
    window.history.replaceState({}, '', mapped);
  }
}
