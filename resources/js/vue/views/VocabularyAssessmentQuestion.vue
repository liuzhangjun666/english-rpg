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
          <div class="meta-item">
            <span class="meta-label">当前难度</span>
            <span class="meta-value">L{{ progress.current_level }} · {{ currentMajorRealm }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">题型</span>
            <span class="meta-value">{{ questionTypeLabel }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">本题计时</span>
            <span class="meta-value">{{ timerText }} 秒</span>
          </div>
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
            <div class="cult-notice-title">{{ feedback.is_correct ? '回答正确' : '回答错误' }}</div>
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
const progress = ref({ current: 0, total: 25, current_level: 1 });
const selectedAnswer = ref('');
const submitted = ref(false);
const feedback = ref<any>(null);

const elapsed = ref(0);
const startTs = ref(0);
let timer: number | null = null;
let autoNextTimer: number | null = null;

const currentMajorRealm = computed(() => {
  const map: Record<number, string> = {
    1: '练气期',
    2: '练气期',
    3: '筑基期',
    4: '金丹期',
    5: '元婴期',
    6: '元婴期',
    7: '化神期',
  };
  return map[Number(progress.value.current_level || 1)] || '练气期';
});

const questionTypeLabel = computed(() => {
  const type = String(question.value?.type || '').toLowerCase();
  if (type === 'grammar') {
    return '语法选择';
  }
  return '词汇选择';
});

const timerText = computed(() => String(elapsed.value));
const progressPercent = computed(() => {
  const total = Math.max(1, Number(progress.value.total || 1));
  const current = Math.max(0, Math.min(total, Number(progress.value.current || 0)));
  return Math.round((current / total) * 100);
});

const feedbackDescription = computed(() => {
  if (!feedback.value) return '';
  if (feedback.value.is_correct) return '';
  const base = `正确答案：${feedback.value.correct_answer}`;
  const detail = String(feedback.value.explanation || '').trim();
  return detail ? `${base}。${detail}` : base;
});

function resetTimer() {
  elapsed.value = 0;
  startTs.value = Date.now();
  if (timer) {
    window.clearInterval(timer);
  }
  timer = window.setInterval(() => {
    elapsed.value = Math.max(0, Math.floor((Date.now() - startTs.value) / 1000));
  }, 1000);
}

function stopTimer() {
  if (timer) {
    window.clearInterval(timer);
    timer = null;
  }
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
    progress.value = res.data.progress;
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
    progress.value.current_level = Number(res.data.level_after || progress.value.current_level);

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
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 14px;
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
</style>
