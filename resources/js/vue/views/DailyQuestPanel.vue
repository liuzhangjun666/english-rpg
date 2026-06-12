<template>
  <Teleport to="body">
    <transition name="fade">
      <div v-if="visible" class="cultivation-overlay" @click.self="close">
        <div class="cultivation-container daily-container">
          <div class="cultivation-header">
            <span class="cultivation-title">📅 今日修炼</span>
            <div class="header-right">
              <span class="streak-badge" v-if="streakDays > 0">
                🔥 连续 {{ streakDays }} 天
              </span>
              <button class="cultivation-close-btn" @click="close">关闭</button>
            </div>
          </div>

          <div class="cultivation-body">
            <div v-if="loading" class="cult-center-tip">加载今日任务...</div>

            <template v-else>
              <!-- 今日奖励预览 -->
              <div class="daily-reward-bar">
                <span class="reward-label">今日奖励</span>
                <span class="reward-items">
                  <span class="reward-chip">⚡ 灵力 +20</span>
                  <span class="reward-chip">💎 灵石 +50</span>
                </span>
              </div>

              <!-- 任务列表 -->
              <div class="quest-list">
                <div
                  v-for="quest in quests"
                  :key="quest.key"
                  class="quest-item"
                  :class="{ 'quest-done': quest.done }"
                >
                  <div class="quest-icon">{{ quest.icon }}</div>
                  <div class="quest-info">
                    <div class="quest-name">{{ quest.name }}</div>
                    <div class="quest-desc">{{ quest.desc }}</div>
                  </div>
                  <div class="quest-status">
                    <span v-if="quest.done" class="status-done">✅</span>
                    <span v-else class="status-progress">
                      {{ quest.current }}/{{ quest.required }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- 签到连续天数提示 -->
              <div v-if="streakDays === 0" class="streak-warning">
                ⚠️ 道心动摇——今日尚未修炼，断签将影响修炼效率
              </div>
              <div v-else-if="streakDays >= 7" class="streak-celebrate">
                🌟 连续 {{ streakDays }} 天修炼，道心坚定，境界精进！
              </div>

              <!-- 领取按钮 -->
              <div class="cult-actions">
                <el-button
                  type="primary"
                  :disabled="!allDone || claimed"
                  @click="claimReward"
                  class="claim-btn"
                >
                  {{ claimed ? '已领取' : allDone ? '领取今日奖励' : `还差 ${remaining} 项任务` }}
                </el-button>
                <el-button @click="close">返回大厅</el-button>
              </div>
            </template>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { useApiClient } from '../services/api';
import { useUserStore } from '../stores/user';

interface Quest {
  key: string;
  icon: string;
  name: string;
  desc: string;
  current: number;
  required: number;
  done: boolean;
}

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{ (e: 'update:visible', value: boolean): void }>();

const api = useApiClient();
const user = useUserStore();

const loading = ref(false);
const claimed = ref(false);
const streakDays = ref(0);

const quests = ref<Quest[]>([
  { key: 'practice', icon: '⚔️', name: '今日修炼', desc: '完成 5 道词汇题', current: 0, required: 5, done: false },
  { key: 'mijing',   icon: '🌀', name: '宗门试炼', desc: '进入一次秘境挑战', current: 0, required: 1, done: false },
  { key: 'reading',  icon: '📖', name: '问道悟道',  desc: '完成一篇阅读理解', current: 0, required: 1, done: false },
]);

const allDone = computed(() => quests.value.every(q => q.done));
const remaining = computed(() => quests.value.filter(q => !q.done).length);

watch(() => props.visible, async (val) => {
  if (!val) return;
  await fetchDailyStatus();
});

async function fetchDailyStatus() {
  loading.value = true;
  try {
    const res = await api.get('/daily/tasks');
    if (res?.success && res.data) {
      const data = res.data;
      streakDays.value = data.streak_days ?? 0;
      claimed.value = !!data.claimed;
      if (Array.isArray(data.tasks)) {
        data.tasks.forEach((t: any) => {
          const q = quests.value.find(q => q.key === t.key);
          if (q) {
            q.current = t.current ?? 0;
            q.done = t.done ?? false;
          }
        });
      }
    }
  } catch {
    // Use default zero-state if API not ready yet
  } finally {
    loading.value = false;
  }
}

async function claimReward() {
  if (claimed.value || !allDone.value) return;
  try {
    const res = await api.post('/daily/tasks/claim');
    if (res?.success) {
      claimed.value = true;
      if (res.data) {
        user.updateProfile(res.data);
      }
      ElMessage.success('道心巩固！今日奖励已领取');
    }
  } catch {
    ElMessage.error('领取失败，请稍后再试');
  }
}

function close() {
  emit('update:visible', false);
}
</script>

<style scoped>
.cultivation-overlay {
  position: fixed;
  inset: 0;
  background: rgba(10, 10, 26, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(5px);
}

.cultivation-container {
  width: 90%;
  max-width: 460px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  background: #1a1a2e;
  border: 2px solid var(--gold, #d4a843);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

.cultivation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(212, 168, 67, 0.3);
  flex-shrink: 0;
}

.cultivation-title { font-size: 18px; color: var(--gold, #d4a843); font-weight: 700; }

.header-right { display: flex; align-items: center; gap: 10px; }

.streak-badge {
  font-size: 13px;
  color: #ff8c00;
  background: rgba(255,140,0,0.15);
  border: 1px solid rgba(255,140,0,0.3);
  padding: 3px 10px;
  border-radius: 20px;
}

.cultivation-close-btn {
  background: transparent;
  border: 1px solid var(--gold, #d4a843);
  color: var(--gold, #d4a843);
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
}

.cultivation-body { flex: 1; overflow-y: auto; padding: 20px; }
.cult-center-tip { text-align: center; color: #c8b685; padding: 40px 0; }

/* Reward bar */
.daily-reward-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(212,168,67,0.07);
  border: 1px solid rgba(212,168,67,0.2);
  border-radius: 8px;
  padding: 10px 14px;
  margin-bottom: 16px;
}

.reward-label { font-size: 12px; color: #8a8a9a; }
.reward-items { display: flex; gap: 8px; }
.reward-chip {
  font-size: 12px;
  color: #d4a843;
  background: rgba(212,168,67,0.1);
  padding: 3px 10px;
  border-radius: 12px;
}

/* Quest list */
.quest-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }

.quest-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 10px;
  transition: background 0.2s, border-color 0.2s;
}

.quest-item.quest-done {
  background: rgba(76,221,140,0.06);
  border-color: rgba(76,221,140,0.2);
}

.quest-icon { font-size: 24px; flex-shrink: 0; }
.quest-info { flex: 1; }
.quest-name { font-size: 14px; color: #c8b685; font-weight: 600; }
.quest-desc { font-size: 11px; color: #8a8a9a; margin-top: 2px; }

.quest-status { flex-shrink: 0; min-width: 40px; text-align: right; }
.status-done { font-size: 18px; }
.status-progress { font-size: 12px; color: #7a7a8a; }

/* Streak messages */
.streak-warning {
  font-size: 12px;
  color: #ffa040;
  background: rgba(255,160,64,0.08);
  border: 1px solid rgba(255,160,64,0.2);
  padding: 8px 12px;
  border-radius: 8px;
  margin-bottom: 14px;
}

.streak-celebrate {
  font-size: 12px;
  color: #d4a843;
  background: rgba(212,168,67,0.08);
  border: 1px solid rgba(212,168,67,0.2);
  padding: 8px 12px;
  border-radius: 8px;
  margin-bottom: 14px;
}

.cult-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.claim-btn { font-weight: 700; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
