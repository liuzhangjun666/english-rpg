<template>
  <div class="assessment-page">
    <div class="cult-panel assessment-panel">
      <header class="cult-panel-header">
        <div class="cult-panel-title">
          <div class="header-left">
            <span>词汇+语法灵根测试</span>
            <span class="subtitle">天机问心 · 双维灵根鉴定</span>
          </div>
        </div>
        <span class="counter-pill">{{ progress.current }}/{{ progress.total }}</span>
      </header>

      <div class="cult-panel-body">
      <div v-if="loading" class="status-box">正在抽取题目...</div>

      <div v-else-if="loadError" class="status-box">
        <div class="cult-notice warning">
          <span class="cult-notice-icon">!</span>
          <div class="cult-notice-body">
            <div class="cult-notice-title">{{ loadError }}</div>
          </div>
        </div>
        <div class="cult-actions">
          <el-button @click="goIntro">返回引导页</el-button>
        </div>
      </div>

      <div v-else-if="question">
        <div class="progress-wrap">
          <div class="progress-top">
            <span>试炼进度</span>
            <span>{{ progress.current }}/{{ progress.total }}</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" :style="{ width: `${progressPercent}%` }" />
          </div>
        </div>

        <div class="meta-grid">
          <div class="meta-item meta-item-wide">
            <span class="meta-label">双轨难度</span>
            <div class="dual-level-row">
              <span class="level-pill" :class="{ active: activeDimension === 'vocabulary' }">
                词汇 {{ formatAssessmentLevel(progress.vocab_current_level) }}
              </span>
              <span class="level-pill" :class="{ active: activeDimension === 'grammar' }">
                语法 {{ formatAssessmentLevel(progress.grammar_current_level) }}
              </span>
            </div>
          </div>
          <div class="meta-item">
            <span class="meta-label">试炼起点</span>
            <span class="meta-value">{{ formatAssessmentLevel(progress.start_level) }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">本题类型</span>
            <span class="meta-value">{{ questionTypeLabel }}</span>
          </div>
        </div>

        <div class="level-range-hint">
          升降范围：最低 L{{ progress.min_level }}（比起点低一级）· 最高 L{{ progress.max_level }}
        </div>

        <div class="question-panel">
          <div class="question-mark">问</div>
          <div class="stem">{{ question.question }}</div>
        </div>

        <el-radio-group v-model="selectedAnswer" class="cult-option-group">
          <el-radio
            v-for="(text, key) in question.options"
            :key="key"
            :label="String(key)"
            border
            class="cult-option-item"
            :disabled="submitted || submitting || loading"
            @change="onAnswerChange"
          >
            {{ key }}. {{ text }}
          </el-radio>
        </el-radio-group>

        <div
          v-if="feedback"
          class="cult-notice"
          :class="feedback.is_correct ? 'info' : 'warning'"
        >
          <span class="cult-notice-icon">{{ feedback.is_correct ? '✓' : '✗' }}</span>
          <div class="cult-notice-body">
            <div class="cult-notice-title">
              {{ feedback.is_correct ? '回答正确' : '回答错误' }}
              <span v-if="levelChangeText" class="level-change">{{ levelChangeText }}</span>
            </div>
            <div v-if="feedbackDescription" class="cult-notice-desc">{{ feedbackDescription }}</div>
          </div>
        </div>

        <div class="cult-actions">
          <el-button data-btn-skin="back" @click="goIntro">暂停 · 返回引导</el-button>
        </div>
      </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { useRoute, useRouter } from 'vue-router';
import { useApiClient } from '../services/api';
import { formatAssessmentLevel } from '../data/assessmentLevels';

const defaultProgress = () => ({
  current: 0,
  total: 25,
  current_level: 1,
  vocab_current_level: 1,
  grammar_current_level: 1,
  start_level: 1,
  min_level: 1,
  max_level: 7,
  active_dimension: '',
  school_stage: '',
});

const route = useRoute();
const router = useRouter();
const api = useApiClient();

const assessmentId = Number(route.params.assessmentId || 0);

function resultLocation() {
  const query: Record<string, string> = {};
  const redirect = String(route.query.redirect || '').trim();
  if (redirect) query.redirect = redirect;
  return {
    path: `/vocab-assessment/result/${assessmentId}`,
    query,
  };
}

const loading = ref(false);
const submitting = ref(false);
const loadError = ref('');

const question = ref<any>(null);
const progress = ref(defaultProgress());
const selectedAnswer = ref('');
const submitted = ref(false);
const feedback = ref<any>(null);

const activeDimension = computed(() => {
  const fromQuestion = String(question.value?.type || '').toLowerCase();
  if (fromQuestion === 'grammar') return 'grammar';
  if (fromQuestion === 'vocabulary' || fromQuestion === 'vocab') return 'vocabulary';
  return String(progress.value.active_dimension || '');
});

const questionTypeLabel = computed(() => {
  const stem = String(question.value?.question || '');
  if (/选出不同类|不同类的一项|哪一项不同/i.test(stem)) {
    return '词汇分类';
  }
  return activeDimension.value === 'grammar' ? '语法选择' : '词汇选择';
});

const levelChangeText = computed(() => {
  if (!feedback.value) return '';
  const before = Number(feedback.value.level_before || 0);
  const after = Number(feedback.value.level_after || 0);
  if (!before || !after || before === after) return ' · 难度不变';
  if (after > before) return ` · ${feedback.value.question_type === 'grammar' ? '语法' : '词汇'}升至 L${after}`;
  return ` · ${feedback.value.question_type === 'grammar' ? '语法' : '词汇'}降至 L${after}`;
});
const progressPercent = computed(() => {
  const total = Math.max(1, Number(progress.value.total || 1));
  const current = Math.max(0, Math.min(total, Number(progress.value.current || 0)));
  return Math.round((current / total) * 100);
});

const startTs = ref(0);
let autoNextTimer: number | null = null;

function mergeProgress(next: Record<string, any> | undefined) {
  if (!next) return;
  progress.value = {
    ...defaultProgress(),
    ...progress.value,
    ...next,
  };
}

const feedbackDescription = computed(() => {
  if (!feedback.value) return '';
  if (feedback.value.is_correct) return '';
  const base = `正确答案：${feedback.value.correct_answer}`;
  const detail = String(feedback.value.explanation || '').trim();
  return detail ? `${base}。${detail}` : base;
});

function resetTimer() {
  startTs.value = Date.now();
}

function stopTimer() {
  // kept for lifecycle compatibility
}

function clearAutoNextTimer() {
  if (autoNextTimer) {
    window.clearTimeout(autoNextTimer);
    autoNextTimer = null;
  }
}

async function nextQuestion() {
  loading.value = true;
  clearAutoNextTimer();
  loadError.value = '';
  feedback.value = null;
  submitted.value = false;
  selectedAnswer.value = '';

  try {
    const res = await api.get(`/vocab-assessment/next-question?assessment_id=${assessmentId}`);
    if (!res?.success) {
      loadError.value = res?.message || '获取题目失败';
      return;
    }

    if (res?.data?.finished) {
      stopTimer();
      router.replace(resultLocation());
      return;
    }

    question.value = res.data.question;
    mergeProgress(res.data.progress);
    resetTimer();
  } finally {
    loading.value = false;
  }
}

async function submitAnswer() {
  if (!question.value || !selectedAnswer.value) return;

  submitting.value = true;
  try {
    const timeSpent = Math.max(0, Math.floor((Date.now() - startTs.value) / 1000));
    const res = await api.post('/vocab-assessment/submit-answer', {
      assessment_id: assessmentId,
      question_id: question.value.question_id,
      user_answer: selectedAnswer.value,
      time_spent: timeSpent,
    });

    if (!res?.success) {
      ElMessage.error(res?.message || '提交失败');
      return;
    }

    feedback.value = res.data;
    submitted.value = true;
    mergeProgress(res.data.progress);

    stopTimer();
    const delay = res.data.is_correct ? 450 : 3000;
    clearAutoNextTimer();
    autoNextTimer = window.setTimeout(() => {
      autoNextTimer = null;
      if (res.data.finished) {
        router.replace(resultLocation());
        return;
      }
      void nextQuestion();
    }, delay);
  } finally {
    submitting.value = false;
  }
}

function onAnswerChange(value: string | number | boolean) {
  if (submitted.value || submitting.value || loading.value) return;
  selectedAnswer.value = String(value);
  void submitAnswer();
}

function goIntro() {
  stopTimer();
  clearAutoNextTimer();
  const query: Record<string, string> = {};
  const redirect = String(route.query.redirect || '').trim();
  if (redirect) query.redirect = redirect;
  router.replace({ path: '/vocab-assessment/intro', query });
}

onMounted(async () => {
  if (!assessmentId || Number.isNaN(assessmentId)) {
    loadError.value = 'assessment_id 无效';
    return;
  }
  await nextQuestion();
});

onBeforeUnmount(() => {
  stopTimer();
  clearAutoNextTimer();
});
</script>

<style scoped>
.assessment-page {
  max-width: 920px;
  min-height: calc(var(--app-dvh, 100vh) - var(--hud-offset-top, var(--top-hud-height, 76px)));
  padding-bottom: max(10px, env(safe-area-inset-bottom, 0px));
}

.assessment-panel .cult-panel-header {
  align-items: flex-start;
}

.header-left {
  display: grid;
  gap: 4px;
}

.header-left > span:first-child {
  font-size: 17px;
}

.subtitle {
  color: var(--cult-parchment-dim, #c8b685);
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.5px;
}

.counter-pill {
  flex-shrink: 0;
  border: 1px solid rgba(212, 168, 67, 0.45);
  border-radius: 999px;
  padding: 6px 12px;
  color: var(--cult-gold, #f4d98a);
  font-weight: 700;
  font-size: 13px;
  background: rgba(0, 0, 0, 0.25);
}

.status-box {
  padding: 12px 0;
}

.progress-wrap {
  margin-bottom: 14px;
  padding: 10px 12px 12px;
  border: 1px solid rgba(212, 168, 67, 0.18);
  border-radius: var(--cult-radius-sm, 10px);
  background: rgba(0, 0, 0, 0.2);
}

.progress-top {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  color: var(--cult-parchment-dim, #c8b685);
  font-size: 13px;
}

.progress-track {
  width: 100%;
  height: 8px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.08);
}

.progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #8b6914, #f4d98a);
  transition: width 0.35s ease;
}

.meta-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr;
  gap: 10px;
  margin-bottom: 10px;
}

.meta-item-wide {
  grid-column: span 1;
}

.dual-level-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.level-pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid rgba(212, 168, 67, 0.22);
  background: rgba(0, 0, 0, 0.18);
  color: var(--cult-parchment-dim, #c8b685);
  font-size: 12px;
  font-weight: 600;
}

.level-pill.active {
  border-color: rgba(244, 217, 138, 0.55);
  background: rgba(212, 168, 67, 0.14);
  color: var(--cult-gold, #f4d98a);
}

.level-range-hint {
  margin-bottom: 14px;
  font-size: 12px;
  color: var(--cult-parchment-muted, #9a8f6e);
  line-height: 1.5;
}

.level-change {
  font-size: 12px;
  font-weight: 600;
  color: var(--cult-parchment-dim, #c8b685);
}

.meta-item {
  border: 1px solid rgba(212, 168, 67, 0.18);
  border-radius: var(--cult-radius-sm, 10px);
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.2);
}

.meta-label {
  display: block;
  font-size: 12px;
  color: var(--cult-parchment-muted, #9a8f6e);
  margin-bottom: 4px;
}

.meta-value {
  font-size: 14px;
  color: var(--cult-parchment, #f7f3e8);
  font-weight: 700;
}

.question-panel {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 12px 0 14px;
  padding: 14px;
  border-radius: var(--cult-radius-sm, 10px);
  border: 1px solid rgba(212, 168, 67, 0.28);
  background: rgba(0, 0, 0, 0.22);
}

.question-mark {
  width: 30px;
  height: 30px;
  min-width: 30px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #1a1208;
  font-weight: 800;
  background: radial-gradient(circle at 30% 30%, #fff0bd 0%, #e0b85a 75%);
}

.stem {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--cult-gold, #f4d98a);
  line-height: 1.6;
}

@media (max-width: 860px) {
  .meta-grid {
    grid-template-columns: 1fr;
  }

  .stem {
    font-size: 18px;
  }
}

@media (max-width: 640px) {
  .assessment-page {
    padding-bottom: calc(14px + env(safe-area-inset-bottom, 0px));
  }

  .counter-pill {
    padding: 4px 10px;
    font-size: 12px;
  }

  .question-panel {
    padding: 10px;
  }

  .stem {
    font-size: 16px;
  }
}
</style>
