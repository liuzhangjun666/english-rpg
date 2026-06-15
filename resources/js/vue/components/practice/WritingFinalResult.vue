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

const props = defineProps<{
  results: Array<{ score: number; passed?: boolean }>;
  expGained: number;
  stonesGained: number;
  maxCombo?: number;
}>();

defineEmits(['retry', 'next', 'exit']);

const total = computed(() => props.results.length);
const avgScore = computed(() => {
  if (!props.results.length) return 0;
  const sum = props.results.reduce((acc, r) => acc + Number(r.score || 0), 0);
  return Math.round(sum / props.results.length);
});
const passedCount = computed(() => props.results.filter((r) => Number(r.score || 0) >= 60).length);
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
  z-index: 250;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.result-inner {
  width: min(420px, 100%);
  padding: 30px 24px;
  border-radius: 16px;
  border: 2px solid;
  background: linear-gradient(180deg, rgba(18, 10, 4, 0.97), rgba(8, 4, 2, 0.98));
  text-align: center;
}
.result-inner.is-pass {
  border-color: #7bed9f;
  box-shadow: 0 0 30px rgba(123, 237, 159, 0.2);
}
.result-inner.is-fail {
  border-color: #ff6b6b;
  box-shadow: 0 0 30px rgba(255, 107, 107, 0.2);
}
.result-icon { font-size: 64px; margin-bottom: 8px; }
.result-title { font-size: 24px; color: var(--gold, #d4a843); margin: 0 0 6px; }
.result-sub { font-size: 13px; color: var(--parchment-dark, #c9b896); margin: 0 0 18px; }

.grade-stats {
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}
.grade-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(212, 168, 67, 0.25);
  min-width: 64px;
}
.stat-icon { font-size: 22px; }
.stat-count { font-size: 18px; font-weight: 800; color: var(--gold-light, #f4d98a); }
.stat-label { font-size: 11px; color: var(--parchment-dark, #c9b896); }

.combo-line {
  font-size: 14px;
  color: #ff9e9e;
  font-weight: 700;
  margin-bottom: 14px;
}

.reward-box {
  background: rgba(0, 0, 0, 0.35);
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 14px;
}
.reward-line {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: var(--parchment-dark, #c9b896);
  margin-bottom: 6px;
}
.reward-line:last-child { margin-bottom: 0; }
.gold { color: var(--gold, #d4a843); font-weight: 700; }

.hermes {
  font-size: 13px;
  color: #9ee8bf;
  padding: 12px;
  border: 1px dashed rgba(78, 192, 122, 0.4);
  border-radius: 8px;
  background: rgba(78, 192, 122, 0.08);
  margin: 0 0 18px;
  line-height: 1.6;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.btn {
  padding: 11px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  border: none;
}
.btn-primary {
  background: linear-gradient(180deg, #d4a843, #a07820);
  color: #1a1004;
}
.btn-secondary {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(212, 168, 67, 0.4);
  color: var(--gold-light, #f4d98a);
}
</style>
