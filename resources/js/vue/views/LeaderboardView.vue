<template>
  <Teleport to="body">
    <transition name="fade">
      <div v-if="visible" class="cult-overlay" @click.self="closePanel">
        <div class="cult-overlay-panel">
          <header class="cult-panel-header">
            <div class="cult-panel-title">
              <span class="cult-panel-icon">📊</span>
              <span>宗门天骄榜</span>
            </div>
            <button class="cult-panel-back" type="button" @click="closePanel">关闭</button>
          </header>

          <div class="cult-overlay-body">
            <div class="cult-tabs">
              <button
                v-for="(title, key) in tabs"
                :key="key"
                class="cult-tab-btn"
                :class="{ 'is-active': currentTab === key }"
                @click="switchTab(key as keyof typeof tabs)"
              >
                {{ title }}
              </button>
            </div>

            <div class="lb-my-rank">
              <span v-if="myRank">你的名次：第 <span class="text-gold">{{ myRank }}</span> 位（超过 {{ myPercentile }}% 道友）</span>
              <span v-else>继续修炼，登上宗门榜</span>
            </div>

            <div class="lb-list" v-loading="loading" element-loading-background="rgba(10, 10, 26, 0.8)">
              <div v-if="!loading && leaderboard.length === 0" class="cult-empty">
                暂无数据
              </div>
              <transition-group name="list" tag="div" v-else>
                <div
                  v-for="(item, index) in leaderboard"
                  :key="item.nickname + index"
                  class="cult-list-item lb-item"
                  :class="{ 'is-highlight': index < 3 }"
                >
                  <div class="lb-rank" :class="'rank-' + index">
                    {{ index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}` }}
                  </div>
                  <div class="lb-name">{{ item.nickname || '匿名道友' }}</div>
                  <div class="lb-metric">{{ item.metric_text || item.metric }}</div>
                </div>
              </transition-group>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useApiClient } from '../services/api';
import { vLoading } from 'element-plus';

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
}>();

const api = useApiClient();

const tabs = {
  streak: '道心连修',
  volume: '修炼勤勉',
  accuracy: '悟性命中',
  demon_clear: '心魔净化',
  realm: '境界进境',
};

const currentTab = ref<keyof typeof tabs>('streak');
const loading = ref(false);
const cache = ref<Record<string, any>>({});

const leaderboard = ref<any[]>([]);
const myRank = ref<number | null>(null);
const myPercentile = ref<number>(1);

watch(() => props.visible, (val) => {
  if (val && leaderboard.value.length === 0) {
    fetchLeaderboard(currentTab.value);
  }
});

const switchTab = (tab: keyof typeof tabs) => {
  if (currentTab.value === tab) return;
  currentTab.value = tab;
  fetchLeaderboard(tab);
};

const fetchLeaderboard = async (tab: string) => {
  if (cache.value[tab]) {
    leaderboard.value = cache.value[tab].leaderboard || [];
    myRank.value = cache.value[tab].my_rank || null;
    myPercentile.value = cache.value[tab].my_percentile || 1;
    return;
  }

  loading.value = true;
  try {
    const res = await api.get(`/leaderboard?type=${encodeURIComponent(tab)}`);
    if (res?.success) {
      cache.value[tab] = res.data;
      leaderboard.value = res.data.leaderboard || [];
      myRank.value = res.data.my_rank || null;
      myPercentile.value = res.data.my_percentile || 1;
    }
  } catch (error) {
    console.error('Failed to load leaderboard', error);
  } finally {
    loading.value = false;
  }
};

const closePanel = () => {
  emit('update:visible', false);
};
</script>

<style scoped>
.lb-my-rank {
  font-size: 13px;
  color: var(--cult-parchment-dim, #c8b685);
  margin-bottom: 12px;
  text-align: center;
}

.text-gold {
  color: var(--cult-gold, #f4d98a);
  font-weight: 700;
}

.lb-list {
  max-height: 400px;
  overflow-y: auto;
  position: relative;
  min-height: 120px;
}

.lb-rank {
  width: 36px;
  text-align: center;
  font-weight: 700;
}

.lb-rank.rank-0,
.lb-rank.rank-1,
.lb-rank.rank-2 {
  font-size: 18px;
}

.lb-rank.rank-0 { color: var(--cult-gold-dim, #d4a843); }
.lb-rank.rank-1 { color: var(--cult-gold, #f4d98a); }
.lb-rank.rank-2 { color: var(--cult-parchment-dim, #c8b685); }
.lb-rank.rank-3,
.lb-rank.rank-4,
.lb-rank.rank-5,
.lb-rank.rank-6,
.lb-rank.rank-7,
.lb-rank.rank-8,
.lb-rank.rank-9 {
  color: var(--cult-parchment-muted, #9a8f6e);
}

.lb-name {
  flex: 1;
  font-size: 14px;
  color: var(--cult-parchment, #f7f3e8);
}

.lb-metric {
  font-size: 13px;
  color: var(--cult-gold-dim, #d4a843);
  font-weight: 700;
}

.list-enter-active,
.list-leave-active {
  transition: all 0.35s ease;
}

.list-enter-from {
  opacity: 0;
  transform: translateX(16px);
}

.list-leave-to {
  opacity: 0;
  transform: translateX(-16px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
