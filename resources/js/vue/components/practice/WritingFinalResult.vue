<template>
  <div class="writing-final-result">
    <div class="result-inner" :class="passed ? 'is-pass' : 'is-fail'">
      <div class="result-icon">{{ passed ? (avgScore >= 90 ? '🌟' : '✨') : '📝' }}</div>
      <h2 class="result-title">{{ passed ? '炼符圆满' : '符力未足' }}</h2>
      <p class="result-sub">平均分 {{ avgScore }} ｜ 通过 {{ passedCount }}/{{ total }}</p>

      <div class="grade-stats">
        <div v-for="stat in gradeStats" :key="stat.label" class="grade-stat">
          <span class="stat-icon">{{ stat.icon }}</span>
          <span class="stat-count">×{{ stat.count }}</span>
          <span class="stat-label">{{ stat.label }}</span>
        </div>
      </div>

      <div v-if="maxCombo > 1" class="combo-line">最高连符 ×{{ maxCombo }}</div>

      <div class="reward-box">
        <div class="reward-line"><span>获得修为</span><span class="gold">+{{ expGained }}</span></div>
        <div class="reward-line"><span>获得灵石</span><span class="gold">+{{ stonesGained }}</span></div>
        <div v-if="passedCount > 0" class="reward-line"><span>写作修行</span><span class="gold">+{{ passedCount }}</span></div>
      </div>

      <div v-if="realmProgress" class="realm-box">
        <div class="realm-head">
          <span>境界进境</span>
          <span class="realm-name">{{ realmProgress.current_realm || '—' }}</span>
        </div>
        <div class="realm-track">
          <div
            class="realm-fill"
            :style="{ width: `${Math.min(100, Math.max(0, Number(realmProgress.realm_progress_percent || 0)))}%` }"
          ></div>
        </div>
        <p class="realm-sub">
          突破进度 {{ Math.min(100, Math.max(0, Number(realmProgress.realm_progress_percent || 0))) }}%
          <template v-if="realmProgress.next_realm"> · 下一境界 {{ realmProgress.next_realm }}</template>
        </p>
      </div>

      <p class="hermes">{{ hermesMessage }}</p>

      <div class="actions">
        <button class="btn btn-primary" type="button" @click="$emit('retry')">重炼此关</button>
        <button v-if="passed" class="btn btn-secondary" type="button" @click="$emit('next')">下一关</button>
        <button class="btn btn-secondary" type="button" @click="$emit('exit')">返回宗门</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { getTalismanGrade } from '../../utils/writingTalisman';

type RealmProgressSnapshot = {
  current_realm?: string;
  cultivation_energy?: number;
  next_realm_energy?: number;
  next_realm?: string;
  realm_progress_percent?: number;
};

const props = defineProps<{
  results: Array<{ score: number; passed?: boolean }>;
  expGained: number;
  stonesGained: number;
  passedCount?: number;
  realmProgress?: RealmProgressSnapshot | null;
  maxCombo?: number;
}>();

defineEmits(['retry', 'next', 'exit']);

const total = computed(() => props.results.length);
const avgScore = computed(() => {
  if (!props.results.length) return 0;
  const sum = props.results.reduce((acc, r) => acc + Number(r.score || 0), 0);
  return Math.round(sum / props.results.length);
});
const passedCount = computed(() => props.passedCount ?? props.results.filter((r) => Number(r.score || 0) >= 60).length);
const passed = computed(() => avgScore.value >= 60);

const gradeStats = computed(() => {
  const counts = { heaven: 0, earth: 0, human: 0, broken: 0 };
  props.results.forEach((r) => {
    counts[getTalismanGrade(Number(r.score || 0)).grade] += 1;
  });
  return [
    { label: '天符', icon: '🌟', count: counts.heaven },
    { label: '地符', icon: '✨', count: counts.earth },
    { label: '人符', icon: '📜', count: counts.human },
    { label: '残符', icon: '💔', count: counts.broken },
  ].filter((s) => s.count > 0);
});

const hermesMessage = computed(() => {
  if (avgScore.value >= 90) return '天符降世，英文通神！你的符篆之力已臻化境。';
  if (avgScore.value >= 75) return '地符稳固，灵力充沛，继续保持笔耕不辍。';
  if (avgScore.value >= 60) return '人符初成，道基已立，打磨细节可更进一步。';
  return '残符涣散，莫灰心，温故知新后再来符篆台。';
});
</script>

<style scoped>
.writing-final-result {
  position: fixed;
  inset: 0;
  z-index: 2200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(8, 10, 22, 0.88);
  backdrop-filter: blur(8px);
}

.result-inner {
  width: min(420px, 100%);
  max-height: min(90vh, 720px);
  overflow-y: auto;
  padding: 24px 20px;
  border-radius: 14px;
  border: 1px solid rgba(212, 168, 67, 0.35);
  background: linear-gradient(165deg, rgba(12, 16, 32, 0.95), rgba(8, 10, 22, 0.92));
  text-align: center;
}

.result-inner.is-pass {
  box-shadow: 0 0 40px rgba(212, 168, 67, 0.15);
}

.result-icon {
  font-size: 42px;
  margin-bottom: 8px;
}

.result-title {
  margin: 0 0 6px;
  color: #f4d98a;
  font-size: 22px;
}

.result-sub {
  margin: 0 0 14px;
  color: #c8b685;
  font-size: 13px;
}

.grade-stats {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-bottom: 12px;
}

.grade-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 56px;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid rgba(212, 168, 67, 0.2);
  background: rgba(0, 0, 0, 0.2);
}

.stat-icon { font-size: 18px; }
.stat-count { color: #f4d98a; font-weight: 700; }
.stat-label { color: #9a8f6e; font-size: 11px; }

.combo-line {
  color: #d4a843;
  font-size: 13px;
  margin-bottom: 12px;
}

.reward-box {
  margin: 0 0 14px;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid rgba(212, 168, 67, 0.2);
  background: rgba(0, 0, 0, 0.22);
}

.reward-line {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  color: #c8b685;
  font-size: 14px;
}

.reward-line .gold {
  color: #f4d98a;
  font-weight: 700;
}

.realm-box {
  margin: 0 0 14px;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid rgba(212, 168, 67, 0.25);
  background: rgba(212, 168, 67, 0.05);
  text-align: left;
}

.realm-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  color: #c8b685;
  font-size: 12px;
}

.realm-name {
  color: #f4d98a;
  font-weight: 700;
}

.realm-track {
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.realm-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #8b6914, #f4d98a);
}

.realm-sub {
  margin: 8px 0 0;
  color: #9a8f6e;
  font-size: 12px;
  line-height: 1.5;
}

.hermes {
  margin: 0 0 16px;
  color: #c8b685;
  font-size: 13px;
  line-height: 1.6;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.btn {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid rgba(212, 168, 67, 0.35);
  cursor: pointer;
  font-size: 13px;
}

.btn-primary {
  background: rgba(212, 168, 67, 0.2);
  color: #f4d98a;
}

.btn-secondary {
  background: rgba(0, 0, 0, 0.25);
  color: #c8b685;
}
</style>
