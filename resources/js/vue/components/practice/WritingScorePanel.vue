<template>
  <div class="writing-score-panel">
    <div class="panel-inner" :class="`grade-${gradeInfo.grade}`">
      <div class="grade-icon">{{ gradeInfo.icon }}</div>
      <div class="grade-label" :style="{ color: gradeInfo.color }">{{ gradeInfo.label }}</div>
      <div class="score-value">{{ score }} 分</div>

      <div v-if="validation" class="validation-box">
        <div class="validation-title" :style="{ color: validationHeader.color }">
          {{ validationHeader.text }}
        </div>
        <div v-for="check in validation.checks" :key="check.key" class="check-line">
          <span>{{ check.passed ? '✓' : '✗' }}</span>
          <span>{{ check.label }}</span>
        </div>
      </div>

      <div v-if="details" class="radar-box">
        <div class="radar-title">天劫判符 · 四维明细</div>
        <div v-for="dim in dimensionRows" :key="dim.key" class="dim-row">
          <span class="dim-label">{{ dim.label }}</span>
          <div class="dim-track">
            <div class="dim-fill" :style="{ width: `${dim.percent}%` }"></div>
          </div>
          <span class="dim-score">{{ dim.value }}/25</span>
        </div>
      </div>

      <p class="feedback-text">{{ feedback || '炼符完成，继续精进。' }}</p>

      <div class="reward-row">
        <span>修为 +{{ expGained }}</span>
        <span>灵石 +{{ stonesGained }}</span>
        <span v-if="comboBonus">连符 ×{{ comboBonus }}</span>
      </div>

      <button class="btn-continue" type="button" @click="$emit('continue')">
        {{ isLast ? '查看关末结算' : '炼制下一符' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  getTalismanGrade,
  getValidationHeader,
  type WritingValidation,
} from '../../utils/writingTalisman';

const props = defineProps<{
  score: number;
  feedback?: string;
  details?: Record<string, number> | null;
  validation?: WritingValidation | null;
  expGained?: number;
  stonesGained?: number;
  comboBonus?: number;
  isLast?: boolean;
}>();

defineEmits(['continue']);

const gradeInfo = computed(() => getTalismanGrade(props.score));

const validationHeader = computed(() => {
  if (!props.validation) return { text: '', color: '#f4dfa1' };
  return getValidationHeader(props.validation.status);
});

const dimensionRows = computed(() => {
  const d = props.details || {};
  const items = [
    { key: 'relevance', label: '内容', value: Number(d.relevance || 0) },
    { key: 'language', label: '语言', value: Number(d.language || 0) },
    { key: 'grammar', label: '语法', value: Number(d.grammar || 0) },
    { key: 'coherence', label: '连贯', value: Number(d.coherence || 0) },
  ];
  return items.map((it) => ({
    ...it,
    percent: Math.min(100, Math.round((it.value / 25) * 100)),
  }));
});
</script>

<style scoped>
.writing-score-panel {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: rgba(0, 0, 0, 0.82);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.panel-inner {
  width: min(440px, 100%);
  max-height: 90vh;
  overflow-y: auto;
  padding: 28px 24px;
  border-radius: 16px;
  border: 2px solid rgba(212, 168, 67, 0.5);
  background: linear-gradient(180deg, rgba(20, 12, 4, 0.96), rgba(10, 6, 2, 0.98));
  text-align: center;
  box-shadow: 0 0 40px rgba(255, 180, 60, 0.15);
}
.panel-inner.grade-heaven {
  border-color: #ffd700;
  box-shadow: 0 0 50px rgba(255, 215, 0, 0.35);
}
.panel-inner.grade-earth { border-color: #7bed9f; }
.panel-inner.grade-human { border-color: #f0c040; }
.panel-inner.grade-broken { border-color: #ff6b6b; }

.grade-icon { font-size: 56px; margin-bottom: 4px; }
.grade-label { font-size: 22px; font-weight: 800; margin-bottom: 4px; }
.score-value { font-size: 36px; font-weight: 800; color: var(--gold-light, #f4d98a); margin-bottom: 16px; }

.validation-box,
.radar-box {
  text-align: left;
  padding: 12px;
  border-radius: 10px;
  border: 1px dashed rgba(212, 168, 67, 0.35);
  background: rgba(255, 255, 255, 0.03);
  margin-bottom: 14px;
  font-size: 12px;
  color: var(--parchment-dark, #c9b896);
  line-height: 1.8;
}
.validation-title { font-weight: 700; margin-bottom: 6px; }
.check-line span:first-child { margin-right: 6px; }

.radar-title {
  font-size: 13px;
  color: var(--gold, #d4a843);
  font-weight: 700;
  margin-bottom: 10px;
  text-align: center;
}
.dim-row {
  display: grid;
  grid-template-columns: 36px 1fr 48px;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.dim-label { font-size: 12px; }
.dim-track {
  height: 8px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.4);
  overflow: hidden;
}
.dim-fill {
  height: 100%;
  background: linear-gradient(90deg, #c9a227, #ffd700);
  border-radius: 999px;
  transition: width 0.4s ease;
}
.dim-score { font-size: 11px; color: var(--gold-light, #f4d98a); text-align: right; }

.feedback-text {
  font-size: 13px;
  color: #9ee8bf;
  line-height: 1.7;
  margin: 0 0 14px;
  padding: 10px;
  background: rgba(78, 192, 122, 0.08);
  border-radius: 8px;
}

.reward-row {
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
  font-size: 13px;
  color: var(--gold, #d4a843);
  font-weight: 700;
  margin-bottom: 18px;
}

.btn-continue {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(180deg, #d4a843, #a07820);
  color: #1a1004;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
}
.btn-continue:hover { filter: brightness(1.08); }
</style>
