<template>
  <div class="final-score-board">
    <div class="reward-popup" :class="passed ? 'reward-pass' : 'reward-fail'">
      <div class="reward-icon">{{ passed ? (score >= 90 ? '🌟' : '✓') : '📝' }}</div>
      <div class="reward-title">{{ title }}</div>
      
      <div class="reward-details">
        <div class="reward-row">
          <span>{{ scoreLabel }}</span>
          <span :class="score >= 80 ? 'text-gold' : score >= 60 ? 'text-green' : 'text-red'">{{ score }}{{ isWriting ? ' 分' : '%' }}</span>
        </div>
        <div v-if="isWriting && maxCombo && maxCombo > 1" class="reward-row">
          <span>最高连符</span>
          <span class="text-gold">×{{ maxCombo }}</span>
        </div>
        <div class="reward-row">
          <span>完成题数</span>
          <span class="text-gold">{{ results.length }} / {{ total }}</span>
        </div>
        <div class="reward-row">
          <span>获得修为</span>
          <span class="text-gold">+{{ expGained }}</span>
        </div>
        <div class="reward-row">
          <span>获得灵石</span>
          <span class="text-gold">+{{ stonesGained }}</span>
        </div>
      </div>

      <div class="hermes-judge">{{ hermesMessage }}</div>

      <div class="reward-actions">
        <button class="btn btn-primary" @click="$emit('restart')">再练一关</button>
        <button class="btn btn-secondary" @click="$emit('exit')">返回宗门</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  results: any[];
  total: number;
  expGained: number;
  stonesGained: number;
  moduleType?: string;
  maxCombo?: number;
}>();

defineEmits(['restart', 'exit']);

const isWriting = computed(() => props.moduleType === 'writing');

const score = computed(() => {
  if (isWriting.value) {
    if (!props.results.length) return 0;
    const sum = props.results.reduce((acc, r) => acc + Number(r.score || 0), 0);
    return Math.round(sum / props.results.length);
  }
  if (props.total === 0) return 0;
  const passed = props.results.filter(r => r.isCorrect).length;
  return Math.round((passed / props.total) * 100);
});

const passed = computed(() => score.value >= 60);

const title = computed(() => {
  if (isWriting.value) return passed.value ? '炼符圆满' : '符力未足';
  return passed.value ? '修炼圆满' : '需再精进';
});

const hermesMessage = computed(() => {
  if (isWriting.value) {
    if (score.value >= 90) return '天符降世，英文通神！';
    if (score.value >= 75) return '地符稳固，灵力充沛，继续笔耕不辍。';
    if (score.value >= 60) return '人符初成，道基已立。';
    return '残符涣散，温故知新后再来符篆台。';
  }
  if (score.value >= 90) return '完美！你的仙道根基极其扎实！';
  if (score.value >= 60) return '干得不错，但仍有提升空间，继续加油。';
  return '失败乃兵家常事，回去翻翻古籍再来挑战吧。';
});

const scoreLabel = computed(() => (isWriting.value ? '平均符品分' : '准确率'));
</script>

<style scoped>
.final-score-board {
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.8);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: 200;
  overflow-y: auto;
  padding: 40px 0;
}
.reward-popup {
  margin: auto;
  background: var(--panel-bg, #1a1a2e);
  padding: 30px;
  border-radius: 16px;
  border: 2px solid;
  max-width: 400px;
  width: 90%;
  text-align: center;
}
.reward-pass { border-color: #7bed9f; box-shadow: 0 0 30px rgba(123, 237, 159, 0.2); }
.reward-fail { border-color: #ff6b6b; box-shadow: 0 0 30px rgba(255, 107, 107, 0.2); }

.reward-icon { font-size: 64px; margin-bottom: 10px; }
.reward-title { font-size: 24px; color: var(--gold); font-weight: bold; margin-bottom: 20px; }

.reward-details {
  background: rgba(0,0,0,0.3);
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
}
.reward-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
  color: var(--parchment-dark);
}
.reward-row:last-child { margin-bottom: 0; }

.text-gold { color: var(--gold); font-weight: bold; }
.text-green { color: #7bed9f; font-weight: bold; }
.text-red { color: #ff6b6b; font-weight: bold; }

.hermes-judge {
  font-size: 13px;
  color: #9ee8bf;
  padding: 12px;
  background: rgba(78, 192, 122, 0.1);
  border: 1px dashed rgba(78, 192, 122, 0.4);
  border-radius: 8px;
  margin-bottom: 20px;
}

.reward-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
