<template>
  <div
    class="vue-shell"
    :class="{
      'is-login': isLoginRoute,
      'is-assessment': isAssessmentRoute,
      'has-top-hud': showGlobalHeader,
    }"
  >
    <div v-if="!auth.bootstrapped" class="boot-splash">
      <div class="boot-text">正在恢复会话...</div>
    </div>

    <template v-else>
      <TopHud v-if="showGlobalHeader" @open-profile="openProfile" @logout="logout" />

      <main class="shell-main">
        <router-view v-slot="{ Component }">
          <transition name="scene-fade" mode="out-in">
            <component :is="Component" :key="$route.path" />
          </transition>
        </router-view>
      </main>
    </template>

    <el-dialog :model-value="ui.loading" width="280px" :show-close="false" :close-on-click-modal="false"
      :close-on-press-escape="false" class="loading-dialog">
      <div class="loading-content">{{ ui.loadingText }}</div>
    </el-dialog>

    <ProfilePanel v-model:visible="showProfile" @open-review="openReviewFromProfile" />
    <ReviewModal v-model:visible="showReviewFromProfile" />
    <DemonEncounter />

    <WorldMapOverlay :visible="ui.mapOverlayVisible" @close="ui.hideMapOverlay()" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useApiClient } from './services/api';
import { useAuthStore } from './stores/auth';
import { useUserStore } from './stores/user';
import { useUiStore } from './stores/ui';
import { useStoryStore } from './stores/story';
import { resolveProfileRealm } from '../utils/cultivation.js';
import { useLegacyBridge } from './composables/useLegacyBridge';
import TopHud from './components/layout/TopHud.vue';
import ProfilePanel from './components/profile/ProfilePanel.vue';
import ReviewModal from './views/ReviewModal.vue';
import DemonEncounter from './components/demons/DemonEncounter.vue';
import WorldMapOverlay from './views/WorldMapOverlay.vue';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const user = useUserStore();
const ui = useUiStore();
const story = useStoryStore();
const api = useApiClient();
const bridge = useLegacyBridge();

const displayRealm = computed(() => resolveProfileRealm(user.profile));

const isLoginRoute = computed(() => route.path === '/login');
const isAssessmentRoute = computed(() => route.meta.assessmentFlow === true);
const showGlobalHeader = computed(() => auth.bootstrapped && auth.isAuthenticated && !isAssessmentRoute.value);
const showHallBackButton = computed(() => auth.isAuthenticated && route.path !== '/hall' && route.path !== '/login' && !isAssessmentRoute.value);
function goHall() {
  router.push('/hall');
}

async function logout() {
  ui.showLoading('正在退出...');
  try {
    await api.post('/auth/logout');
  } finally {
    await bridge.clearSession();
    auth.clearToken();
    user.clearProfile();
    story.setSnapshot(null);
    ui.hideLoading();
    router.replace('/login');
  }
}

const showProfile = ref(false);
const showReviewFromProfile = ref(false);

async function openProfile() {
  showProfile.value = true;
}

function openReviewFromProfile() {
  showReviewFromProfile.value = true;
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

  // 后台预热地图 3D 模型缓存：先关键建筑，再在空闲时补全全部模型
  if (auth.isAuthenticated) {
    setTimeout(() => {
      import('./core/sect/WorldSceneManager')
        .then(m => {
          m.WorldSceneManager.preload('critical');
          const runAll = () => m.WorldSceneManager.preload('all');
          const idle = (window as Window & {
            requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number;
          }).requestIdleCallback;
          if (idle) {
            idle(runAll, { timeout: 4000 });
          } else {
            setTimeout(runAll, 2500);
          }
        })
        .catch(() => { });
    }, 1500);
  }
});

onUnmounted(() => {
  window.removeEventListener('profile-updated', handleProfileUpdate);
});
</script>
