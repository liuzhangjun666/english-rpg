<template>
  <div class="assessment-page">
    <el-card class="assessment-card" shadow="hover">
      <template #header>
        <div class="header-row">
          <div class="header-left">
            <span class="title">词汇+语法灵根测试</span>
            <span class="subtitle">天机问心 · 双维灵根鉴定</span>
          </div>
          <div class="counter-pill">{{ progress.current }}/{{ progress.total }}</div>
        </div>
      </template>

      <div v-if="loading" class="status-box">正在抽取题目...</div>

      <div v-else-if="loadError" class="status-box">
        <el-alert type="warning" :closable="false" :title="loadError" />
        <div class="actions">
          <el-button @click="goHall">返回大厅</el-button>
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

        <el-radio-group v-model="selectedAnswer" class="option-group">
          <el-radio
            v-for="(text, key) in question.options"
            :key="key"
            :label="String(key)"
            border
            class="option-item"
            :disabled="submitted || submitting || loading"
            @change="onAnswerChange"
          >
            {{ key }}. {{ text }}
          </el-radio>
        </el-radio-group>

        <el-alert
          v-if="feedback"
          :type="feedback.is_correct ? 'success' : 'error'"
          :closable="false"
          :title="feedback.is_correct ? '回答正确' : '回答错误'"
          :description="feedbackDescription || undefined"
          class="feedback-alert"
        />

        <div class="actions">
          <el-button data-btn-skin="back" @click="goHall">退出测试</el-button>
        </div>
      </div>
    </el-card>
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
      router.replace(`/vocab-assessment/result/${assessmentId}`);
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
        router.replace(`/vocab-assessment/result/${assessmentId}`);
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

function goHall() {
  stopTimer();
  clearAutoNextTimer();
  router.replace('/hall');
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
  margin: 24px auto;
  padding: 0 12px;
}

.assessment-card {
  position: relative;
  overflow: hidden;
}

.assessment-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 12% 8%, rgba(255, 227, 153, 0.1) 0%, transparent 34%),
    radial-gradient(circle at 90% 16%, rgba(117, 224, 255, 0.12) 0%, transparent 36%),
    linear-gradient(180deg, rgba(16, 23, 44, 0.96) 0%, rgba(8, 13, 28, 0.94) 100%);
  z-index: 0;
}

:deep(.assessment-card.el-card) {
  border: 1px solid rgba(212, 168, 67, 0.45);
  border-radius: 14px;
  box-shadow:
    0 16px 36px rgba(0, 0, 0, 0.42),
    inset 0 0 0 1px rgba(255, 235, 182, 0.08);
  color: #f4ecd0;
  background: transparent;
}

:deep(.assessment-card .el-card__header) {
  position: relative;
  z-index: 1;
  border-bottom: 1px solid rgba(212, 168, 67, 0.3);
  padding: 18px 20px;
  background: linear-gradient(180deg, rgba(25, 35, 62, 0.72) 0%, rgba(18, 26, 48, 0.3) 100%);
}

:deep(.assessment-card .el-card__body) {
  position: relative;
  z-index: 1;
  padding: 20px;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.header-left {
  display: grid;
  gap: 4px;
}

.title {
  font-size: 24px;
  font-weight: 800;
  color: #f5de9e;
  letter-spacing: 1px;
}

.subtitle {
  color: #b7c8ef;
  font-size: 13px;
  letter-spacing: 1px;
}

.counter-pill {
  border: 1px solid rgba(212, 168, 67, 0.56);
  border-radius: 999px;
  padding: 6px 12px;
  color: #f9e7b6;
  font-weight: 700;
  background: linear-gradient(180deg, rgba(47, 58, 89, 0.78), rgba(25, 33, 56, 0.58));
  box-shadow: inset 0 0 10px rgba(255, 229, 158, 0.12);
}

.status-box {
  padding: 20px 0;
}

.progress-wrap {
  margin-bottom: 14px;
  padding: 10px 12px 12px;
  border: 1px solid rgba(175, 203, 255, 0.18);
  border-radius: 12px;
  background: rgba(8, 16, 34, 0.6);
}

.progress-top {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  color: #d7e2ff;
  font-size: 13px;
  letter-spacing: 0.4px;
}

.progress-track {
  width: 100%;
  height: 10px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.1);
}

.progress-fill {
  height: 100%;
  width: 0;
  border-radius: 999px;
  background: linear-gradient(90deg, #38c0ff 0%, #78f0ff 45%, #ffe59a 100%);
  box-shadow: 0 0 14px rgba(138, 229, 255, 0.55);
  transition: width 0.35s ease;
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}

.meta-item {
  border: 1px solid rgba(173, 208, 255, 0.2);
  border-radius: 12px;
  padding: 10px 12px;
  background: linear-gradient(180deg, rgba(15, 26, 50, 0.72), rgba(8, 16, 34, 0.66));
}

.meta-label {
  display: block;
  font-size: 12px;
  color: #9eb4de;
  margin-bottom: 4px;
}

.meta-value {
  font-size: 15px;
  color: #eff5ff;
  font-weight: 700;
}

.question-panel {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 12px 0 14px;
  padding: 14px;
  border-radius: 12px;
  border: 1px solid rgba(212, 168, 67, 0.38);
  background: linear-gradient(180deg, rgba(42, 34, 19, 0.45), rgba(20, 18, 11, 0.3));
  box-shadow: inset 0 0 0 1px rgba(255, 232, 173, 0.08);
}

.question-mark {
  width: 30px;
  height: 30px;
  min-width: 30px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #0f1a34;
  font-weight: 800;
  background: radial-gradient(circle at 30% 30%, #fff0bd 0%, #e0b85a 75%);
  box-shadow: 0 0 10px rgba(255, 217, 136, 0.5);
}

.stem {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: #fff3d0;
  line-height: 1.7;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.3);
}

.option-group {
  display: grid;
  gap: 10px;
}

.option-item {
  margin-right: 0;
  width: 100%;
}

:deep(.option-item.el-radio.is-bordered) {
  height: auto;
  min-height: 52px;
  margin: 0;
  border-radius: 12px;
  border: 1px solid rgba(173, 208, 255, 0.25);
  background: linear-gradient(180deg, rgba(8, 16, 34, 0.68), rgba(7, 13, 28, 0.7));
  color: #e7efff;
  transition: all 0.2s ease;
}

:deep(.option-item.el-radio.is-bordered:hover) {
  transform: translateY(-1px);
  border-color: rgba(137, 205, 255, 0.65);
  box-shadow: 0 8px 18px rgba(8, 19, 42, 0.45);
}

:deep(.option-item.el-radio.is-bordered.is-checked) {
  border-color: rgba(255, 217, 129, 0.9);
  background: linear-gradient(180deg, rgba(45, 38, 22, 0.72), rgba(27, 22, 12, 0.66));
  box-shadow:
    0 0 0 1px rgba(255, 225, 147, 0.2),
    inset 0 0 18px rgba(255, 212, 117, 0.12);
}

:deep(.option-item .el-radio__label) {
  color: inherit;
  font-size: 17px;
  font-weight: 600;
  line-height: 1.45;
  white-space: normal;
  padding-left: 10px;
}

:deep(.option-item .el-radio__inner) {
  width: 18px;
  height: 18px;
  border-color: rgba(161, 194, 245, 0.75);
  background: rgba(8, 16, 34, 0.92);
}

:deep(.option-item.is-checked .el-radio__inner) {
  border-color: #f6d27c;
  background: #f6d27c;
}

:deep(.option-item .el-radio__inner::after) {
  width: 6px;
  height: 6px;
  background: #1f283f;
}

.feedback-alert {
  margin-top: 14px;
}

:deep(.feedback-alert.el-alert) {
  border: 1px solid rgba(185, 219, 255, 0.28);
  background: rgba(8, 16, 34, 0.7);
}

.actions {
  margin-top: 20px;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 16px;
}

.actions :deep(.el-button.btn-art) {
  --btn-art-scale: 0.68;
  margin: 0;
}

@media (max-width: 860px) {
  .meta-grid {
    grid-template-columns: 1fr;
  }

  .stem {
    font-size: 20px;
  }
}

@media (max-width: 640px) {
  .assessment-page {
    margin: 14px auto;
  }

  .title {
    font-size: 20px;
  }

  .subtitle {
    font-size: 12px;
  }

  .counter-pill {
    padding: 5px 10px;
    font-size: 12px;
  }

  .stem {
    font-size: 18px;
  }

  :deep(.option-item .el-radio__label) {
    font-size: 16px;
  }

  .actions {
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .actions :deep(.el-button.btn-art) {
    --btn-art-scale: 0.62;
  }
}
</style>
