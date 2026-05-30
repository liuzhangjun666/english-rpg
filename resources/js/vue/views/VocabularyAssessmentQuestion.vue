<template>
  <div class="assessment-page">
    <el-card class="assessment-card" shadow="hover">
      <template #header>
        <div class="header-row">
          <span>词汇灵根测试</span>
          <el-tag type="info">{{ progress.current }}/{{ progress.total }}</el-tag>
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
        <div class="meta">
          <div>当前试炼难度：L{{ progress.current_level }} / {{ currentMajorRealm }}</div>
          <div>当前题型：词汇选择</div>
          <div>本题计时：{{ timerText }} 秒</div>
        </div>

        <div class="stem">{{ question.question }}</div>

        <el-radio-group v-model="selectedAnswer" class="option-group">
          <el-radio
            v-for="(text, key) in question.options"
            :key="key"
            :label="String(key)"
            border
            class="option-item"
            :disabled="submitted"
          >
            {{ key }}. {{ text }}
          </el-radio>
        </el-radio-group>

        <el-alert
          v-if="feedback"
          :type="feedback.is_correct ? 'success' : 'error'"
          :closable="false"
          :title="feedback.is_correct ? '回答正确' : '回答错误'"
          :description="feedbackDescription"
          style="margin-top: 12px"
        />

        <div class="actions">
          <el-button @click="goHall">退出测试</el-button>
          <el-button
            v-if="!submitted"
            type="primary"
            :disabled="!selectedAnswer"
            :loading="submitting"
            @click="submitAnswer"
          >
            提交
          </el-button>
          <el-button
            v-else
            type="primary"
            :loading="loading"
            @click="nextQuestion"
          >
            下一题
          </el-button>
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

const timerText = computed(() => String(elapsed.value));

const feedbackDescription = computed(() => {
  if (!feedback.value) return '';
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

async function nextQuestion() {
  loading.value = true;
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

    if (res.data.finished) {
      stopTimer();
      router.replace(`/vocab-assessment/result/${assessmentId}`);
    }
  } finally {
    submitting.value = false;
  }
}

function goHall() {
  stopTimer();
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
});
</script>

<style scoped>
.assessment-page {
  max-width: 920px;
  margin: 24px auto;
  padding: 0 12px;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 20px;
  font-weight: 700;
}

.status-box {
  padding: 20px 0;
}

.meta {
  display: grid;
  gap: 6px;
  margin-bottom: 12px;
  color: #d9e7ff;
}

.stem {
  margin: 12px 0;
  font-size: 18px;
  line-height: 1.7;
}

.option-group {
  display: grid;
  gap: 10px;
}

.option-item {
  margin-right: 0;
}

.actions {
  margin-top: 16px;
  display: flex;
  gap: 10px;
}
</style>
