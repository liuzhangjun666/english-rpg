<template>
  <div class="vue-shell" :class="{ 'is-login': isLoginRoute }">
    <div v-if="!auth.bootstrapped" class="boot-splash">
      <div class="boot-text">正在恢复会话...</div>
    </div>

    <template v-else>
    <header v-if="auth.bootstrapped && auth.isAuthenticated" class="shell-header">
      <div class="brand">LevelUp · 英语修仙</div>
      <el-space>
        <el-button text @click="goHall">大厅</el-button>
        <el-button text @click="goPractice">练功</el-button>
        <el-button text @click="goReading">藏经阁</el-button>
        <el-button text @click="goExam">试炼</el-button>
        <el-button text @click="goMijing">秘境</el-button>
        <el-button text @click="goMall">仙坊</el-button>
        <el-button text @click="goLeaderboard">天榜</el-button>
        <el-button type="danger" plain @click="logout">退出</el-button>
      </el-space>
    </header>

    <main class="shell-main">
      <router-view />
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

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const user = useUserStore();
const ui = useUiStore();
const story = useStoryStore();
const bridge = useLegacyBridge();
const api = useApiClient();

const isLoginRoute = computed(() => route.path === '/login');
function goHall() {
  router.push('/hall');
}

function goPractice() {
  router.push('/practice');
}

function goReading() {
  router.push('/reading');
}

function goExam() {
  router.push('/exam');
}

function goMijing() {
  router.push('/mijing');
}

function goMall() {
  router.push('/mall');
}

function goLeaderboard() {
  router.push('/leaderboard');
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
</script>
