<template>
  <div class="vue-shell" :class="{ 'is-login': isLoginRoute }">
    <div v-if="!auth.bootstrapped" class="boot-splash">
      <div class="boot-text">正在恢复会话...</div>
    </div>

    <template v-else>
    <TopHud 
      v-if="auth.bootstrapped && auth.isAuthenticated" 
      @open-profile="openProfile"
      @logout="logout"
    />

    <main class="shell-main">
      <router-view v-slot="{ Component }">
        <transition name="scene-fade" mode="out-in">
          <component :is="Component" :key="$route.path" />
        </transition>
      </router-view>
    </main>
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

import { onMounted, onUnmounted, ref } from 'vue';
import TopHud from './components/layout/TopHud.vue';
import ProfilePanel from './components/profile/ProfilePanel.vue';
import DemonEncounter from './components/demons/DemonEncounter.vue';
import WorldMapOverlay from './views/WorldMapOverlay.vue';

const showProfile = ref(false);

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

  // 后台预热地图 3D 模型缓存（不阻塞首屏），让首次打开地图就能瞬间显示真实模型
  if (auth.isAuthenticated) {
    setTimeout(() => {
      import('./core/sect/WorldSceneManager')
        .then(m => m.WorldSceneManager.preload())
        .catch(() => {});
    }, 1500);
  }
});

onUnmounted(() => {
  window.removeEventListener('profile-updated', handleProfileUpdate);
});
</script>
