<template>
  <Teleport to="body">
    <Transition name="idp-fade">
      <div v-if="visible" class="idp-overlay" @click.self="close">
        <div class="idp-panel">
          <!-- 关闭 -->
          <button class="idp-close" @click="close">✕</button>

          <!-- 头部：封印阵 + 标题 -->
          <div class="idp-header">
            <div class="seal-array" :class="'danger-' + danger.key">
              <div class="seal-ring r1"></div>
              <div class="seal-ring r2"></div>
              <div class="seal-ring r3"></div>
              <div class="seal-core">{{ demons.length }}</div>
            </div>
            <div class="idp-title-box">
              <h2 class="idp-title">心魔殿</h2>
              <p class="idp-subtitle">错知化魔，封于此殿 · 战而净之，化为道行</p>
            </div>
          </div>

          <!-- 统计 -->
          <div class="idp-stats">
            <div class="stat">
              <span class="stat-label">封印心魔</span>
              <span class="stat-value">{{ demons.length }}</span>
            </div>
            <div class="stat">
              <span class="stat-label">总心魔值</span>
              <span class="stat-value">{{ totalDemonPower }}</span>
            </div>
            <div class="stat">
              <span class="stat-label">危险等级</span>
              <span class="stat-value" :style="{ color: danger.color }">{{ danger.label }}</span>
            </div>
          </div>

          <!-- 危险条 -->
          <div class="danger-bar">
            <div class="danger-fill" :style="{ width: dangerPercent + '%', background: danger.color }"></div>
          </div>

          <!-- 操作 -->
          <div class="idp-actions">
            <button class="idp-btn primary" :disabled="dueDemons.length === 0" @click="challengeAll">
              ⚔ 一键试炼 ({{ dueDemons.length }})
            </button>
            <button class="idp-btn ghost" @click="purifyMastered">🧹 净化已掌握</button>
          </div>

          <!-- 心魔列表 -->
          <div class="idp-list" v-loading="loading">
            <div v-if="!loading && demons.length === 0" class="idp-empty">
              心境澄明，暂无心魔 ☯
            </div>

            <div
              v-for="item in demons"
              :key="item.demon.id"
              class="demon-card"
              :class="['tier-' + tierOf(item).tier, 'status-' + statusOf(item)]"
            >
              <div class="demon-icon">{{ categoryOf(item).icon }}</div>
              <div class="demon-main">
                <div class="demon-name-row">
                  <span class="demon-name">{{ categoryOf(item).name }}</span>
                  <span class="tier-badge">{{ tierOf(item).name }}</span>
                  <span class="status-tag" :class="statusOf(item)">{{ statusLabel(statusOf(item)) }}</span>
                </div>
                <div class="demon-word">{{ item.question?.word || item.demon.word || item.question?.question || '未知魔念' }}</div>
                <div class="demon-meta">
                  <span class="meta-item">魔念层数 {{ item.demon.wrong_count }}</span>
                  <div class="seal-progress">
                    <span class="sp-label">封印</span>
                    <div class="sp-bar"><div class="sp-fill" :style="{ width: (item.demon.mastery || 0) + '%' }"></div></div>
                    <span class="sp-num">{{ item.demon.mastery || 0 }}%</span>
                  </div>
                </div>
              </div>
              <button class="demon-fight" @click="challengeOne(item)">挑战</button>
            </div>
          </div>

          <!-- 净化动画层 -->
          <Transition name="purify">
            <div v-if="purifying" class="purify-fx">
              <div class="purify-mist"></div>
              <div class="purify-qi"></div>
              <div class="purify-text">心魔净化 · 道行增长</div>
            </div>
          </Transition>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { useApiClient } from '../../services/api';
import { useDemonStore } from '../../stores/demon';

interface DemonRecord {
  id: number; question_id: string; word?: string; realm?: string; type: string;
  wrong_count: number; reviewed_count: number; mastery: number; is_mastered: boolean;
  next_review_at?: string | null; last_wrong_at?: string | null;
}
interface DemonItem { demon: DemonRecord; question: any }

const props = defineProps<{ visible: boolean; autoChallenge?: boolean }>();
const emit  = defineEmits<{ (e: 'update:visible', v: boolean): void }>();

const api    = useApiClient();
const demonStore = useDemonStore();

const demons   = ref<DemonItem[]>([]);
const loading  = ref(false);
const purifying = ref(false);

// ── 派生：心魔等级（凡/灵/玄/地阶 ← wrong_count） ──
function tierOf(item: DemonItem): { tier: number; name: string } {
  const w = item.demon.wrong_count || 1;
  if (w > 10) return { tier: 4, name: '地阶心魔' };
  if (w >= 6) return { tier: 3, name: '玄阶心魔' };
  if (w >= 3) return { tier: 2, name: '灵阶心魔' };
  return { tier: 1, name: '凡阶心魔' };
}

// ── 派生：状态（sealed 已封印 / active 躁动可挑战 / purified 已净化） ──
function statusOf(item: DemonItem): 'sealed' | 'active' | 'purified' {
  const d = item.demon;
  if (d.is_mastered) return 'purified';
  const due = !d.next_review_at || new Date(d.next_review_at).getTime() <= Date.now();
  return due ? 'active' : 'sealed';
}
function statusLabel(s: string) {
  return s === 'active' ? '躁动' : s === 'purified' ? '已净化' : '封印中';
}

// ── 派生：心魔类别（按题型给修仙化名） ──
function categoryOf(item: DemonItem): { name: string; icon: string } {
  switch (item.demon.type) {
    case 'vocab':   case 'word':      return { name: '遗忘心魔', icon: '📖' };
    case 'grammar':                   return { name: '虚妄心魔', icon: '🌀' };
    case 'listening':                 return { name: '混沌心魔', icon: '👂' };
    case 'exam':                      return { name: '业障心魔', icon: '⚖' };
    default:                          return { name: '杂念心魔', icon: '🔮' };
  }
}

// 可挑战（躁动到复习期）的心魔
const dueDemons = computed(() => demons.value.filter(d => statusOf(d) === 'active'));

// 总心魔值 = 各心魔魔念层数累加
const totalDemonPower = computed(() => demons.value.reduce((s, d) => s + (d.demon.wrong_count || 0), 0));

// 危险等级（spec 七）
const danger = computed(() => {
  const p = totalDemonPower.value;
  if (p > 100) return { key: 'critical', label: '魔影临世', color: '#ff4d6d' };
  if (p > 50)  return { key: 'high',     label: '黑雾扩散', color: '#c45cff' };
  if (p > 20)  return { key: 'mid',      label: '封印裂纹', color: '#a07bff' };
  return { key: 'stable', label: '封印稳定', color: '#3ad6ff' };
});
const dangerPercent = computed(() => Math.min(100, (totalDemonPower.value / 120) * 100));

async function loadDemons() {
  loading.value = true;
  try {
    const res = await api.get('/demons');
    demons.value = (res?.data?.demons || []) as DemonItem[];
  } catch {
    ElMessage.error('心魔殿封印查询失败');
  } finally {
    loading.value = false;
  }
}

async function runChallenge(items: DemonItem[]) {
  if (items.length === 0) {
    ElMessage.info('暂无可挑战的躁动心魔');
    return;
  }
  const before = demons.value.length;
  await demonStore.triggerEncounter(items, {
    type: 'manual',
    theme: 'void',
    title: '镇魔试炼',
    subtitle: '直面识海魔念，以正知斩之',
  });
  await loadDemons();
  if (demons.value.length < before) {
    playPurify();
  }
}
const challengeOne = (item: DemonItem) => runChallenge([item]);
const challengeAll  = () => runChallenge(dueDemons.value);

function playPurify() {
  purifying.value = true;
  setTimeout(() => { purifying.value = false; }, 2600);
}

async function purifyMastered() {
  try {
    const res = await api.post('/demons/clear-mastered');
    const n = res?.data?.deleted ?? 0;
    ElMessage.success(n > 0 ? `已净化 ${n} 道已掌握心魔` : '暂无已掌握心魔');
    await loadDemons();
  } catch {
    ElMessage.error('净化失败');
  }
}

function close() {
  emit('update:visible', false);
}

watch(() => props.visible, (v) => {
  if (v) {
    loadDemons().then(() => {
      if (props.autoChallenge) challengeAll();
    });
  }
});
</script>

<style scoped>
.idp-overlay {
  position: fixed; inset: 0; z-index: 2000;
  display: flex; align-items: center; justify-content: center;
  background: rgba(2, 6, 16, 0.78);
  backdrop-filter: blur(6px);
}
.idp-panel {
  position: relative;
  width: 90%; max-width: 720px; max-height: 86vh;
  display: flex; flex-direction: column;
  background:
    radial-gradient(120% 80% at 50% 0%, rgba(28, 60, 110, 0.55), transparent 60%),
    linear-gradient(160deg, #071228 0%, #040a18 100%);
  border: 1px solid rgba(58, 214, 255, 0.35);
  border-radius: 16px;
  box-shadow: 0 0 60px rgba(58, 214, 255, 0.15), inset 0 0 40px rgba(10, 20, 45, 0.6);
  padding: 28px;
  overflow: hidden;
}
.idp-close {
  position: absolute; top: 16px; right: 18px; z-index: 5;
  width: 34px; height: 34px; border-radius: 50%;
  border: 1px solid rgba(58, 214, 255, 0.4);
  background: rgba(4, 12, 28, 0.8); color: #7fe0ff; cursor: pointer;
  font-size: 15px; transition: all 0.2s;
}
.idp-close:hover { background: rgba(58, 214, 255, 0.2); transform: rotate(90deg); }

/* 头部封印阵 */
.idp-header { display: flex; align-items: center; gap: 22px; margin-bottom: 22px; }
.seal-array {
  position: relative; width: 96px; height: 96px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.seal-ring {
  position: absolute; inset: 0; border-radius: 50%;
  border: 1px solid rgba(212, 168, 67, 0.5);
}
.seal-ring.r1 { animation: spin 14s linear infinite; border-style: dashed; border-color: rgba(58, 214, 255, 0.6); }
.seal-ring.r2 { inset: 12px; animation: spin 9s linear infinite reverse; border-color: rgba(212, 168, 67, 0.6); }
.seal-ring.r3 { inset: 24px; animation: spin 6s linear infinite; border-style: dotted; border-color: rgba(155, 107, 255, 0.7); }
.seal-core {
  width: 44px; height: 44px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; font-weight: bold; color: #cfeeff;
  background: radial-gradient(circle, rgba(58, 214, 255, 0.35), rgba(10, 20, 45, 0.9));
  box-shadow: 0 0 18px rgba(58, 214, 255, 0.5);
}
.seal-array.danger-mid .seal-core { box-shadow: 0 0 18px rgba(160, 123, 255, 0.6); }
.seal-array.danger-high .seal-core { box-shadow: 0 0 22px rgba(196, 92, 255, 0.7); }
.seal-array.danger-critical .seal-core { box-shadow: 0 0 28px rgba(255, 77, 109, 0.8); animation: pulse 1.6s ease-in-out infinite; }

.idp-title { font-size: 26px; color: #eaf6ff; margin: 0; letter-spacing: 3px; text-shadow: 0 0 16px rgba(58, 214, 255, 0.5); }
.idp-subtitle { font-size: 13px; color: #7fa8c8; margin: 6px 0 0; }

/* 统计 */
.idp-stats { display: flex; gap: 14px; margin-bottom: 12px; }
.stat {
  flex: 1; text-align: center; padding: 12px 8px;
  background: rgba(10, 22, 44, 0.6); border: 1px solid rgba(58, 214, 255, 0.18);
  border-radius: 10px;
}
.stat-label { display: block; font-size: 12px; color: #6f93b3; margin-bottom: 4px; }
.stat-value { font-size: 22px; font-weight: bold; color: #cfeeff; font-family: monospace; }

.danger-bar { height: 6px; border-radius: 3px; background: rgba(10, 22, 44, 0.8); overflow: hidden; margin-bottom: 18px; }
.danger-fill { height: 100%; transition: width 0.6s ease, background 0.4s; box-shadow: 0 0 10px currentColor; }

/* 操作 */
.idp-actions { display: flex; gap: 12px; margin-bottom: 16px; }
.idp-btn {
  flex: 1; padding: 11px; border-radius: 10px; cursor: pointer; font-size: 15px;
  transition: all 0.2s; font-weight: bold;
}
.idp-btn.primary {
  background: linear-gradient(135deg, rgba(58, 214, 255, 0.25), rgba(155, 107, 255, 0.2));
  border: 1px solid rgba(58, 214, 255, 0.6); color: #d6f5ff;
}
.idp-btn.primary:hover:not(:disabled) { box-shadow: 0 0 20px rgba(58, 214, 255, 0.4); transform: translateY(-1px); }
.idp-btn.primary:disabled { opacity: 0.4; cursor: not-allowed; }
.idp-btn.ghost { background: rgba(10, 22, 44, 0.6); border: 1px solid rgba(120, 140, 170, 0.3); color: #9bb6d0; }
.idp-btn.ghost:hover { border-color: rgba(212, 168, 67, 0.6); color: #ffd97a; }

/* 列表 */
.idp-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; padding-right: 4px; }
.idp-empty { text-align: center; color: #6f93b3; padding: 40px 0; font-size: 16px; }

.demon-card {
  display: flex; align-items: center; gap: 14px;
  padding: 12px 14px; border-radius: 12px;
  background: rgba(10, 20, 40, 0.7);
  border: 1px solid rgba(58, 214, 255, 0.15);
  border-left: 3px solid #3ad6ff;
  transition: all 0.2s;
}
.demon-card:hover { background: rgba(16, 30, 56, 0.85); transform: translateX(2px); }
.demon-card.tier-2 { border-left-color: #a07bff; }
.demon-card.tier-3 { border-left-color: #c45cff; }
.demon-card.tier-4 { border-left-color: #ff4d6d; }
.demon-card.status-active { box-shadow: inset 0 0 14px rgba(196, 92, 255, 0.12); }

.demon-icon { font-size: 26px; width: 40px; text-align: center; flex-shrink: 0; }
.demon-main { flex: 1; min-width: 0; }
.demon-name-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.demon-name { font-size: 15px; color: #eaf6ff; font-weight: bold; }
.tier-badge {
  font-size: 11px; padding: 1px 7px; border-radius: 8px;
  background: rgba(58, 214, 255, 0.15); color: #9fdcff; border: 1px solid rgba(58, 214, 255, 0.3);
}
.tier-2 .tier-badge { background: rgba(160, 123, 255, 0.15); color: #c2adff; border-color: rgba(160, 123, 255, 0.35); }
.tier-3 .tier-badge { background: rgba(196, 92, 255, 0.15); color: #dcb0ff; border-color: rgba(196, 92, 255, 0.4); }
.tier-4 .tier-badge { background: rgba(255, 77, 109, 0.15); color: #ffb0bf; border-color: rgba(255, 77, 109, 0.45); }
.status-tag { font-size: 11px; padding: 1px 7px; border-radius: 8px; }
.status-tag.active { background: rgba(196, 92, 255, 0.2); color: #e0bdff; }
.status-tag.sealed { background: rgba(120, 140, 170, 0.15); color: #9bb6d0; }
.status-tag.purified { background: rgba(52, 211, 153, 0.2); color: #9af5cf; }

.demon-word { font-size: 13px; color: #9bb6d0; margin: 4px 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.demon-meta { display: flex; align-items: center; gap: 14px; }
.meta-item { font-size: 12px; color: #7fa8c8; font-family: monospace; }
.seal-progress { display: flex; align-items: center; gap: 6px; flex: 1; }
.sp-label { font-size: 11px; color: #6f93b3; }
.sp-bar { flex: 1; max-width: 120px; height: 5px; background: rgba(10, 22, 44, 0.9); border-radius: 3px; overflow: hidden; }
.sp-fill { height: 100%; background: linear-gradient(90deg, #3ad6ff, #9af5cf); }
.sp-num { font-size: 11px; color: #9af5cf; font-family: monospace; }

.demon-fight {
  flex-shrink: 0; padding: 8px 16px; border-radius: 8px; cursor: pointer;
  background: rgba(58, 214, 255, 0.12); border: 1px solid rgba(58, 214, 255, 0.5);
  color: #d6f5ff; font-size: 14px; transition: all 0.2s;
}
.demon-fight:hover { background: rgba(58, 214, 255, 0.3); box-shadow: 0 0 14px rgba(58, 214, 255, 0.4); }

/* 净化动画 */
.purify-fx {
  position: absolute; inset: 0; z-index: 10; pointer-events: none;
  display: flex; align-items: center; justify-content: center;
}
.purify-mist {
  position: absolute; inset: 0;
  background: radial-gradient(circle at center, rgba(0,0,0,0.6), transparent 70%);
  animation: mist-clear 2.4s ease-out forwards;
}
.purify-qi {
  position: absolute; bottom: 0; left: 50%; width: 200px; height: 100%;
  transform: translateX(-50%);
  background: linear-gradient(to top, rgba(58, 214, 255, 0.5), rgba(155, 107, 255, 0.2), transparent);
  animation: qi-rise 2.2s ease-out forwards;
}
.purify-text {
  position: relative; z-index: 2; font-size: 26px; color: #9af5cf; font-weight: bold;
  letter-spacing: 4px; text-shadow: 0 0 24px rgba(58, 214, 255, 0.8);
  animation: text-pop 2.2s ease-out forwards;
}

@keyframes spin { to { transform: rotate(360deg); } }
@keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.12); } }
@keyframes mist-clear { 0% { opacity: 1; } 100% { opacity: 0; } }
@keyframes qi-rise { 0% { opacity: 0; transform: translateX(-50%) translateY(40px); } 30% { opacity: 1; } 100% { opacity: 0; transform: translateX(-50%) translateY(-30px); } }
@keyframes text-pop { 0% { opacity: 0; transform: scale(0.6); } 30% { opacity: 1; transform: scale(1.1); } 70% { opacity: 1; transform: scale(1); } 100% { opacity: 0; } }

.idp-fade-enter-active, .idp-fade-leave-active { transition: opacity 0.3s ease; }
.idp-fade-enter-from, .idp-fade-leave-to { opacity: 0; }
.purify-enter-active, .purify-leave-active { transition: opacity 0.3s; }
.purify-enter-from, .purify-leave-to { opacity: 0; }
</style>
