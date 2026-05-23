<template>
  <div class="leaderboard-page">
    <el-card class="leaderboard-shell" shadow="hover">
      <template #header>
        <div class="card-header">天榜 · 宗门排行</div>
      </template>

      <div class="leaderboard-toolbar">
        <el-space wrap>
          <el-button type="warning" plain @click="openLegacy">经典模式</el-button>
          <el-button @click="backHall">返回大厅</el-button>
        </el-space>
      </div>

      <el-tabs v-model="activeType" @tab-change="onTabChange">
        <el-tab-pane label="道心连修" name="streak" />
        <el-tab-pane label="修炼勤勉" name="volume" />
        <el-tab-pane label="悟性命中" name="accuracy" />
        <el-tab-pane label="心魔净化" name="demon_clear" />
        <el-tab-pane label="境界进境" name="realm" />
      </el-tabs>

      <div class="leaderboard-meta" v-if="currentData?.my_rank">
        你的名次：第 {{ currentData.my_rank }} 位（超过 {{ currentData.my_percentile || 1 }}% 道友）
      </div>
      <div class="leaderboard-meta" v-else>继续修炼，登上宗门榜</div>

      <div v-if="!rows.length" class="leaderboard-empty">暂无数据</div>
      <div v-else class="leaderboard-list">
        <div v-for="(item, idx) in rows" :key="`${activeType}-${item.user_id}`" class="leaderboard-row" :class="{ top3: idx < 3 }">
          <div class="leaderboard-rank">{{ rankLabel(idx) }}</div>
          <div class="leaderboard-user">
            <div class="leaderboard-name">{{ item.nickname || '匿名道友' }}</div>
            <div class="leaderboard-realm">{{ item.realm_name || item.realm || '-' }} · {{ item.realm_stage || 1 }}重</div>
          </div>
          <div class="leaderboard-metric">{{ item.metric_text || item.metric || '-' }}</div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useApiClient } from '../services/api';
import { useLegacyBridge } from '../composables/useLegacyBridge';
import { useUiStore } from '../stores/ui';

const router = useRouter();
const api = useApiClient();
const bridge = useLegacyBridge();
const ui = useUiStore();

const activeType = ref('streak');
const cache = ref<Record<string, any>>({});

const currentData = computed(() => cache.value[activeType.value] || null);
const rows = computed(() => Array.isArray(currentData.value?.leaderboard) ? currentData.value.leaderboard : []);

onMounted(async () => {
  ui.showLoading('进入天榜...');
  try {
    await bridge.switchToHall();
    await bridge.closeLegacyPanels();
    await loadType(activeType.value, true);
  } catch {
    ElMessage.error('天榜加载失败');
  } finally {
    ui.hideLoading();
  }
});

onBeforeUnmount(() => {
  void bridge.closeLegacyPanels();
});

async function loadType(type: string, withLoading = false) {
  if (cache.value[type]) return;
  if (withLoading) ui.showLoading('读取榜单...');
  try {
    const res = await api.get(`/leaderboard?type=${encodeURIComponent(type)}`);
    if (!res?.success || !res?.data) {
      ElMessage.error(res?.message || '读取榜单失败');
      return;
    }
    cache.value = { ...cache.value, [type]: res.data };
  } finally {
    if (withLoading) ui.hideLoading();
  }
}

async function onTabChange(tab: string | number) {
  const type = String(tab || 'streak');
  activeType.value = type;
  await loadType(type, true);
}

function rankLabel(index: number) {
  if (index === 0) return '🥇';
  if (index === 1) return '🥈';
  if (index === 2) return '🥉';
  return `#${index + 1}`;
}

async function openLegacy() {
  ui.showLoading('切换经典天榜...');
  try {
    await bridge.openLeaderboard();
  } catch {
    ElMessage.error('经典模式加载失败');
  } finally {
    ui.hideLoading();
  }
}

function backHall() {
  void bridge.closeLegacyPanels();
  router.push('/hall');
}
</script>
