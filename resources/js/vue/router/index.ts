import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

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
  { path: '/', redirect: '/hall' },
  { path: '/:pathMatch(.*)*', redirect: '/hall' },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (!auth.bootstrapped) return true;

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { path: '/login', query: { redirect: to.fullPath } };
  }

  if (to.meta.guestOnly && auth.isAuthenticated) {
    return { path: '/hall' };
  }

  return true;
});

export function normalizeLegacyHashRoute() {
  const hash = window.location.hash || '';
  const mapping: Record<string, string> = {
    '#hall': '/hall',
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
