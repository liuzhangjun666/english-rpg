<template>
  <Teleport to="body">
    <transition name="fade">
      <div v-if="visible" class="profile-overlay cultivation-theme" @click.self="closePanel">
        <div class="profile-container" style="max-width: 460px;">
          <div class="profile-header">
            <div class="card-header" style="font-size: 20px; text-align: center; width: 100%;">
              📊 宗门天骄榜
            </div>
            <button class="profile-close-btn" @click="closePanel">关闭</button>
          </div>

          <div class="profile-body" style="flex-direction: column; padding: 20px;">
            <!-- Tabs -->
            <div class="lb-tabs">
              <button 
                v-for="(title, key) in tabs" 
                :key="key"
                class="lb-tab-btn"
                :class="{ 'is-active': currentTab === key }"
                @click="switchTab(key as keyof typeof tabs)"
              >
                {{ title }}
              </button>
            </div>

            <!-- My Rank -->
            <div class="lb-my-rank">
              <span v-if="myRank">你的名次：第 <span class="text-gold">{{ myRank }}</span> 位（超过 {{ myPercentile }}% 道友）</span>
              <span v-else>继续修炼，登上宗门榜</span>
            </div>

            <!-- Loading & List -->
            <div class="lb-list" v-loading="loading" element-loading-background="rgba(10, 10, 26, 0.8)">
              <div v-if="!loading && leaderboard.length === 0" class="lb-empty">
                暂无数据
              </div>
              <transition-group name="list" tag="div" v-else>
                <div 
                  v-for="(item, index) in leaderboard" 
                  :key="item.nickname + index" 
                  class="lb-item"
                  :class="{ 'is-top3': index < 3 }"
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
import { useApiClient } from '../../services/api';

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
.profile-overlay {
  position: fixed;
  top: 0; left: 0; width: 100vw; height: 100vh;
  background: rgba(10, 10, 26, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(5px);
}
.profile-container {
  width: 90%;
  background: #1a1a2e;
  border: 2px solid var(--gold, #d4a843);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
}
.profile-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: rgba(255,255,255,0.05);
  border-bottom: 1px solid rgba(212,168,67,0.3);
}
.profile-close-btn {
  background: transparent;
  border: 1px solid var(--gold, #d4a843);
  color: var(--gold, #d4a843);
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
}

.lb-tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}
.lb-tab-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(212, 168, 67, 0.2);
  color: #c8b685;
  padding: 8px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}
.lb-tab-btn:hover {
  background: rgba(212, 168, 67, 0.1);
}
.lb-tab-btn.is-active {
  background: rgba(212, 168, 67, 0.2);
  border-color: #d4a843;
  color: #f4d98a;
  font-weight: bold;
}

.lb-my-rank {
  font-size: 13px;
  color: #c8b685;
  margin-bottom: 12px;
  text-align: center;
}
.text-gold {
  color: #d4a843;
  font-weight: bold;
}

.lb-list {
  flex: 1;
  max-height: 400px;
  overflow-y: auto;
  position: relative;
  min-height: 150px;
}
.lb-empty {
  text-align: center;
  color: #c8b685;
  padding: 40px 0;
}
.lb-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  margin-bottom: 6px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  border: 1px solid transparent;
  transition: all 0.3s;
}
.lb-item.is-top3 {
  background: rgba(212, 168, 67, 0.06);
  border-color: rgba(212, 168, 67, 0.15);
}
.lb-item:hover {
  background: rgba(255, 255, 255, 0.05);
}
.lb-rank {
  width: 32px;
  text-align: center;
  font-weight: bold;
}
.rank-0 { color: #d4a843; font-size: 18px; }
.rank-1 { color: #f4d98a; font-size: 18px; }
.rank-2 { color: #c8b685; font-size: 18px; }
.rank-3, .rank-4, .rank-5, .rank-6, .rank-7, .rank-8, .rank-9 { color: #8a8a8a; }

.lb-name {
  flex: 1;
  font-size: 14px;
  color: #f7f3e8;
}
.lb-metric {
  font-size: 13px;
  color: #d4a843;
  font-weight: bold;
}

.list-enter-active,
.list-leave-active {
  transition: all 0.4s ease;
}
.list-enter-from {
  opacity: 0;
  transform: translateX(30px);
}
.list-leave-to {
  opacity: 0;
  transform: translateX(-30px);
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
