<template>
  <div class="vue-shell" :class="{ 'is-login': isLoginRoute }">
    <div v-if="!auth.bootstrapped" class="boot-splash">
      <div class="boot-text">正在恢复会话...</div>
    </div>

    <template v-else>
    <!-- 资源预热遮罩：登录后到进入游戏之间承载 GLB 下载 + 解码 -->
    <LoadingSplash
      :visible="showAssetSplash"
      :progress="preloadProgress"
      :done="preloadCounts.done"
      :total="preloadCounts.total"
    />

    <TopHud
      v-if="auth.bootstrapped && auth.isAuthenticated && !showAssetSplash"
      @open-profile="openProfile"
      @logout="logout"
    />

    <main class="shell-main" v-show="!showAssetSplash">
      <router-view v-slot="{ Component }">
        <transition name="scene-fade" mode="out-in">
          <component :is="Component" :key="$route.path" />
        </transition>
      </router-view>
    </main>

    <!-- 全局侧边栏：登录后所有路由可见，hide 由用户偏好控制（ui.sidebarVisible） -->
    <GlobalHud
      v-if="auth.bootstrapped && auth.isAuthenticated && !showAssetSplash && !isLoginRoute && ui.sidebarVisible"
      @open-review="showGlobalReview = true"
      @open-achievements="showGlobalAchievements = true"
      @open-profile="openProfile"
    />
    <ReviewModal v-model:visible="showGlobalReview" />
    <AchievementsModal v-model:visible="showGlobalAchievements" />
    </template>

    <el-dialog
      :model-value="ui.loading"
      width="280px"
      :show-close="false"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      class="loading-dialog"
    >
      <div class="loading-content">{{ ui.loadingText }}</div>
    </el-dialog>

    <ProfilePanel v-model:visible="showProfile" />
    <DemonEncounter />

    <WorldMapOverlay :visible="ui.mapOverlayVisible" @close="ui.hideMapOverlay()" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useApiClient } from './services/api';
import { useAuthStore } from './stores/auth';
import { useUserStore } from './stores/user';
import { useUiStore } from './stores/ui';
import { useStoryStore } from './stores/story';
import { useLegacyBridge } from './composables/useLegacyBridge';
// 废弃的辅助函数 getMajorRealmText 已移动/不再使用

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const user = useUserStore();
const ui = useUiStore();
const story = useStoryStore();
const bridge = useLegacyBridge();
const api = useApiClient();

const isLoginRoute = computed(() => route.path === '/login');
const showHallBackButton = computed(() => auth.isAuthenticated && route.path !== '/hall' && route.path !== '/login');
function goHall() {
  router.push('/hall');
}

async function logout() {
  ui.showLoading('正在退出...');
  // 后端登出接口失败不阻塞：本地状态必须清干净 + 必须跳走，不然用户卡死。
  // 加 3 秒超时，避免后端慢/挂时 loading 永远转。
  try {
    await Promise.race([
      api.post('/auth/logout'),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);
  } catch { /* ignore */ }

  // 每一步独立 try：legacy bridge / pinia store 任何一步抛错都不能阻塞后续清理和跳转。
  try { await bridge.clearSession(); } catch { /* ignore */ }
  try { auth.clearToken(); } catch { /* ignore */ }
  try { user.clearProfile(); } catch { /* ignore */ }
  try { story.setSnapshot(null); } catch { /* ignore */ }
  try { ui.hideLoading(); } catch { /* ignore */ }
  // 清掉本地头像缓存，避免下个登录用户继承前一个用户的头像
  try { localStorage.removeItem('levelup_user_avatar'); } catch { /* ignore */ }

  // 整页跳转而非 router.replace：彻底丢弃组件树、Pinia 内存状态、Three.js 资源，
  // 避免 PracticeView 等组件的 onBeforeUnmount 钩子或 legacy game 残留把流程卡住。
  window.location.assign('/login');
}

import { onMounted, onUnmounted, ref, watch } from 'vue';
import TopHud from './components/layout/TopHud.vue';
import ProfilePanel from './components/profile/ProfilePanel.vue';
import DemonEncounter from './components/demons/DemonEncounter.vue';
import WorldMapOverlay from './views/WorldMapOverlay.vue';
import LoadingSplash from './components/layout/LoadingSplash.vue';
import GlobalHud from './components/map/GlobalHud.vue';
import ReviewModal from './views/ReviewModal.vue';
import AchievementsModal from './views/AchievementsModal.vue';
import {
  preloadEssentials,
  preloadProgress,
  preloadCounts,
  essentialDone,
} from './services/assetPreloader';

const showProfile = ref(false);
const showGlobalReview = ref(false);
const showGlobalAchievements = ref(false);

// ─── 资源预热遮罩 ─────────────────────────────────────────────
// auth 通过后 splash 立刻显示；预热完成（或保护超时）后隐藏。
// 用 ref 而非 computed，是为了能加保护性超时 / 手动控制。
const showAssetSplash = ref(false);
let splashWatchdog: number | null = null;

watch(
  () => auth.bootstrapped && auth.isAuthenticated,
  (isReady) => {
    if (!isReady) {
      // 登出 / token 失效后重置，下次登录会再次显示
      showAssetSplash.value = false;
      if (splashWatchdog !== null) {
        clearTimeout(splashWatchdog);
        splashWatchdog = null;
      }
      return;
    }

    // ── 路由竞态修复 ──
    // 浏览器直接访问 /login?redirect=/practice 时，beforeEach 在 auth.bootstrapped 之前触发，
    // 守卫只能 return true，把用户留在了 /login。等 bootstrap 异步完成、auth.isAuthenticated 变 true 时，
    // route 不会自动重新评估，用户卡在 /login 看到一个"奇怪的半透明场景"。
    // 这里主动把已认证的用户从 guestOnly 路由（/login）踢到 redirect 参数或 /practice。
    if (route.meta.guestOnly) {
      const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/practice';
      router.replace(redirect).catch(() => router.replace('/practice'));
    }

    // 已经预热过就不重复显示（同一会话内 logout → login 是 window.location.assign 整页刷新，
    // 走的是新页面，这里的 essentialDone 已经回到初始 false。所以这条主要是防御 watch 重复触发）
    if (essentialDone.value) return;

    // 头像本地持久化：未接 /user/avatar 接口前，头像 dataURL 存在 localStorage 里。
    // auth 通过后第一时间合并回 store，让 TopHud / ProfilePanel 立即能看到上次设置的头像。
    try {
      const savedAvatar = localStorage.getItem('levelup_user_avatar');
      if (savedAvatar && user.profile && !user.profile.avatar_url) {
        user.updateProfile({ avatar_url: savedAvatar });
      }
    } catch { /* localStorage 不可用（隐私模式）就算了 */ }

    showAssetSplash.value = true;
    preloadEssentials().finally(() => {
      // 至少展示 600ms 避免一闪而过
      setTimeout(() => { showAssetSplash.value = false; }, 600);
    });

    // 网慢 / 失败兜底：12 秒强制放行，避免用户卡在 splash
    splashWatchdog = window.setTimeout(() => {
      if (showAssetSplash.value) {
        console.warn('[assetPreloader] 预热超时，强制进入游戏');
        showAssetSplash.value = false;
      }
    }, 12000);
  },
  { immediate: true },
);

function openProfile() {
  showProfile.value = true;
}

const handleProfileUpdate = (e: Event) => {
  const customEvent = e as CustomEvent;
  if (customEvent.detail) {
    user.updateProfile(customEvent.detail);
  }
};

onMounted(() => {
  window.addEventListener('profile-updated', handleProfileUpdate);
  router.afterEach(() => { ui.hideMapOverlay(); });
  // 后台预热改由 LoadingSplash + assetPreloader.preloadEssentials() 统一承载，
  // 不再在这里 setTimeout 触发——避免重复加载和预热进度无法被 splash 感知的问题。
});

onUnmounted(() => {
  window.removeEventListener('profile-updated', handleProfileUpdate);
  if (splashWatchdog !== null) clearTimeout(splashWatchdog);
});
</script>
