import { createRouter, createWebHistory } from 'vue-router';
import { watch } from 'vue';
import { useAuthStore } from '../stores/auth';

/**
 * 等待 auth bootstrap 完成。
 *
 * 背景：bootstrap 是异步的（要去后端 /user/profile 拉 profile），但浏览器直接打开
 * 受保护路由时，beforeEach 在 bootstrap 完成之前就触发了——如果直接放行，
 * 用户会卡在错误的路由上（典型场景：带 token 直访 /login，guard 没等 bootstrap
 * 完成就放行，bootstrap 完成时已经停在 /login 不会再触发 guard）。
 *
 * 用 watch 而不是 polling：bootstrap 完成时立刻 resolve，不会有轮询间隔的延迟。
 * 加 5 秒超时兜底，防止后端挂掉时整个 SPA 死锁。
 */
function waitForBootstrap(auth: ReturnType<typeof useAuthStore>, timeoutMs = 5000): Promise<void> {
  return new Promise((resolve) => {
    if (auth.bootstrapped) return resolve();
    const stop = watch(() => auth.bootstrapped, (v) => {
      if (v) { cleanup(); resolve(); }
    });
    const timeout = setTimeout(() => { cleanup(); resolve(); }, timeoutMs);
    function cleanup() { stop(); clearTimeout(timeout); }
  });
}

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

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  // 阻塞导航直到 bootstrap 完成。否则带 token 直访 /login 时会因 bootstrap 异步
  // 没就绪而被放行，等 bootstrap 完成已经停在 /login 卡死了。5 秒超时兜底防死锁。
  if (!auth.bootstrapped) await waitForBootstrap(auth);

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { path: '/login', query: { redirect: to.fullPath } };
  }

  if (to.meta.guestOnly && auth.isAuthenticated) {
    // 尊重 redirect 参数：用户从 /practice 被踢回 /login 时带的 redirect 应该送回去
    const redirect = typeof to.query.redirect === 'string' ? to.query.redirect : '/practice';
    return redirect;
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
