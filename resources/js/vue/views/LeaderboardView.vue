<template>
  <div class="leaderboard-page cultivation-theme">
    <div class="profile-container">
      <div class="profile-header">
        <div class="card-header" style="font-size: 24px; text-align: center; width: 100%;">
          📊 宗门天骄榜
        </div>
        <button class="profile-close-btn" @click="goBack">返回宗门</button>
      </div>

      <div class="profile-body" style="flex-direction: column; padding: 30px;">
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
          <transition-group name="list" tag="div" v-else class="lb-grid">
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
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useApiClient } from '../services/api';
import { vLoading } from 'element-plus';

const router = useRouter();
const api = useApiClient();

const goBack = () => {
  router.push('/hall');
};

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

onMounted(() => {
  fetchLeaderboard(currentTab.value);
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

</script>

<style scoped>
.leaderboard-page {
  position: relative;
  width: 100vw;
  height: 100vh;
  background: #0a0a1a url('../../../assets/images/bg_mall.jpg') center/cover no-repeat;
  display: flex;
  align-items: center;
  justify-content: center;
}

.profile-container {
  width: 90%;
  max-width: 1000px;
  height: 85vh;
  background: rgba(26, 26, 46, 0.95);
  border: 2px solid var(--gold, #d4a843);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0,0,0,0.8);
  backdrop-filter: blur(10px);
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
.lb-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  padding: 10px;
}
.lb-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.3s;
}
.lb-item.is-top3 {
  background: rgba(212, 168, 67, 0.08);
  border-color: rgba(212, 168, 67, 0.25);
  box-shadow: inset 0 0 15px rgba(212, 168, 67, 0.1);
}
.lb-item:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(212, 168, 67, 0.4);
  transform: translateY(-2px);
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
