<template>
  <Teleport to="body">
    <transition name="fade">
      <div v-if="visible" class="cultivation-overlay" @click.self="closePanel">
        <div class="cultivation-container">
          <div class="cultivation-header">
            <span class="cultivation-title">🏆 成就碑</span>
            <button class="cultivation-close-btn" @click="closePanel">关闭</button>
          </div>

          <div class="cultivation-body">
            <div v-if="loading" class="cult-center-tip">查询成就...</div>

            <template v-else>
              <div class="achieve-summary">
                已解锁 {{ unlockedPercent }}% · {{ unlockedCount }}/{{ ACHIEVEMENT_LIST.length }}
              </div>

              <div class="achieve-list">
                <div
                  v-for="achievement in ACHIEVEMENT_LIST"
                  :key="achievement.id"
                  class="achieve-card"
                  :class="{ unlocked: unlockedIds.has(achievement.id) }"
                >
                  <span class="achieve-icon">{{ unlockedIds.has(achievement.id) ? achievement.icon : '🔒' }}</span>
                  <div class="achieve-info">
                    <div class="achieve-title" :class="{ 'text-gold': unlockedIds.has(achievement.id) }">
                      {{ achievement.title }}
                    </div>
                    <div class="achieve-desc">{{ achievement.desc }}</div>
                  </div>
                  <span v-if="unlockedIds.has(achievement.id)" class="achieve-check">✅</span>
                </div>
              </div>

              <div class="cult-actions">
                <el-button @click="closePanel">返回宗门</el-button>
              </div>
            </template>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { useApiClient } from '../services/api';
import { useUiStore } from '../stores/ui';

const ACHIEVEMENT_LIST = [
  { id: 'first_practice', title: '初入练功房', desc: '完成第一次修炼', icon: '📖' },
  { id: 'hundred_questions', title: '百题斩', desc: '累计完成100道题', icon: '⚔️' },
  { id: 'five_hundred_q', title: '五百题斩', desc: '累计完成500道题', icon: '⚔️' },
  { id: 'thousand_q', title: '千题宗师', desc: '累计完成1000道题', icon: '🏆' },
  { id: 'streak_3', title: '三花聚顶', desc: '连续修炼3天', icon: '🌸' },
  { id: 'streak_7', title: '七星连珠', desc: '连续修炼7天', icon: '⭐' },
  { id: 'streak_30', title: '月满乾坤', desc: '连续修炼30天', icon: '🌙' },
  { id: 'exam_s', title: '天道认可', desc: '渡劫获得S级评价', icon: '👑' },
  { id: 'exam_a', title: '青云直上', desc: '渡劫获得A级以上评价3次', icon: '☁️' },
  { id: 'realm_l3', title: '练气登堂', desc: '达到练气中期(L3)', icon: '🌊' },
  { id: 'realm_l6', title: '练气入室', desc: '达到练气后期(L6)', icon: '🌊' },
  { id: 'realm_z1', title: '筑基成功', desc: '突破到筑基期', icon: '🏔️' },
  { id: 'realm_j1', title: '金丹大成', desc: '突破到金丹期', icon: '🟡' },
  { id: 'realm_y1', title: '元婴出窍', desc: '突破到元婴期', icon: '🟣' },
  { id: 'perfect_10', title: '十题全对', desc: '单次修炼10题全部答对', icon: '💯' },
  { id: 'accuracy_90', title: '精准如神', desc: '总正确率达到90%以上', icon: '🎯' },
  { id: 'first_share', title: '初传道法', desc: '第一次分享修炼成果', icon: '📤' },
  { id: 'invite_3', title: '广纳门徒', desc: '成功邀请3位好友', icon: '👋' },
  { id: 'invite_10', title: '桃李满天下', desc: '成功邀请10位好友', icon: '🎓' },
  { id: 'master_demon', title: '心魔克星', desc: '降服10条心魔', icon: '🧘' },
];

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{ (e: 'update:visible', value: boolean): void }>();

const api = useApiClient();
const ui = useUiStore();

const loading = ref(false);
const unlockedIds = ref<Set<string>>(new Set());

const unlockedCount = computed(() => unlockedIds.value.size);
const unlockedPercent = computed(() =>
  ACHIEVEMENT_LIST.length ? Math.round((unlockedCount.value / ACHIEVEMENT_LIST.length) * 100) : 0
);

watch(() => props.visible, async (val) => {
  if (!val) return;
  loading.value = true;
  ui.showLoading('查询成就...');
  try {
    const res = await api.get('/achievements');
    if (res?.success && Array.isArray(res.data?.unlocked_ids)) {
      unlockedIds.value = new Set(res.data.unlocked_ids);
    }
  } catch {
    ElMessage.error('成就碑加载失败');
  } finally {
    loading.value = false;
    ui.hideLoading();
  }
});

function closePanel() {
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
  max-width: 480px;
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

.achieve-summary {
  text-align: center;
  font-size: 13px;
  color: #c8b685;
  margin-bottom: 14px;
}

.achieve-list { display: flex; flex-direction: column; gap: 8px; }
.achieve-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  opacity: 0.4;
  transition: opacity 0.2s;
}
.achieve-card.unlocked {
  opacity: 1;
  background: rgba(212, 168, 67, 0.08);
  border-color: rgba(212, 168, 67, 0.2);
}
.achieve-icon { font-size: 24px; flex-shrink: 0; }
.achieve-info { flex: 1; }
.achieve-title { font-size: 13px; color: #c8b685; }
.achieve-title.text-gold { color: #d4a843; }
.achieve-desc { font-size: 11px; color: #8a8a9a; margin-top: 2px; }
.achieve-check { font-size: 16px; }

.cult-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 16px;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
