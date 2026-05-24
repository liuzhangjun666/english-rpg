<template>
  <div class="vue-shell" :class="{ 'is-login': isLoginRoute }">
    <div v-if="!auth.bootstrapped" class="boot-splash">
      <div class="boot-text">正在恢复会话...</div>
    </div>

    <template v-else>
    <header v-if="auth.bootstrapped && auth.isAuthenticated" class="shell-header">
      <!-- 左侧：修仙者信息看板 -->
      <div class="cultivator-board">
        <!-- 灵力头像（带聚灵法阵） -->
        <div class="board-avatar-wrap" @click="openProfile" title="点击查看个人中心">
          <img 
            :src="user.profile?.avatar_url || '/build/assets/avatar_default-kzYH69OO.png'" 
            class="board-avatar" 
            alt="头像" 
          />
          <div class="board-avatar-halo"></div>
        </div>
        <!-- 姓名与境界标签 -->
        <div class="board-meta">
          <div class="meta-row">
            <span class="cultivator-name">{{ user.profile?.nickname || '匿名前辈' }}</span>
            <span class="realm-chip-mini">
              <span class="realm-major-wrap">
                <img class="realm-major-badge" :src="realmMajorBadge" alt="">
                <span class="realm-major-text">{{ getMajorRealmText(user.profile?.current_realm) }}</span>
              </span>
              <span class="realm-minor-wrap">
                <img class="realm-minor-badge" :src="realmMinorBadge" alt="">
                <span class="realm-minor-text">{{ user.profile?.current_realm || '初入仙途' }}</span>
              </span>
            </span>
          </div>
          <!-- 灵气/修为经验条 -->
          <div class="cultivator-exp-bar" :title="'剩余修为: ' + (user.profile?.remaining_exp ?? 0)">
            <div 
              class="exp-progress" 
              :style="{ width: (user.profile?.progress_percent ?? 0) + '%' }"
            >
              <div class="exp-flow"></div>
            </div>
            <span class="exp-text">
              修为: {{ user.profile?.exp ?? 0 }} / {{ user.profile?.next_threshold ?? 100 }}
            </span>
          </div>
        </div>
      </div>

      <!-- 中间：资源资产看板 -->
      <div class="cultivator-assets">
        <!-- 灵力/灵液 -->
        <div class="asset-item" title="每日修炼消耗灵力，随时间自动恢复">
          <span class="asset-icon">⚡</span>
          <span class="asset-label">灵力:</span>
          <span class="asset-value">{{ user.profile?.spirit_power ?? 0 }}/{{ user.profile?.spirit_power_max ?? 100 }}</span>
        </div>
        <!-- 灵石/灵玉 -->
        <div class="asset-item" title="在仙坊中购买修行道具和灵药">
          <span class="asset-icon">💎</span>
          <span class="asset-label">灵石:</span>
          <span class="asset-value">{{ user.profile?.spirit_stone ?? 0 }}</span>
        </div>
      </div>

      <div class="shell-nav">
        <el-button class="nav-portal-btn logout-btn" type="danger" plain @click="logout">退出</el-button>
      </div>
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
import realmMajorBadge from '../../assets/images/ui/realm_major_badge.png';
import realmMinorBadge from '../../assets/images/ui/realm_minor_badge.png';

function getMajorRealmText(realmLabel?: string): string {
  const text = String(realmLabel || '').trim();
  if (!text) return '练';
  if (text.includes('练气') || text.includes('炼气')) return '练';
  if (text.includes('筑基')) return '筑';
  if (text.includes('金丹')) return '金';
  if (text.includes('元婴')) return '元';
  if (text.includes('化神')) return '化';
  if (text.includes('炼虚')) return '虚';
  if (text.includes('合体')) return '合';
  if (text.includes('大乘')) return '乘';
  if (text.includes('渡劫')) return '劫';
  return text.charAt(0) || '练';
}

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

function openProfile() {
  bridge.openProfilePanel();
}
</script>
