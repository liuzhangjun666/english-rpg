<template>
  <div class="exam-page">
    <div class="cult-panel exam-panel">
      <header class="cult-panel-header">
        <div class="cult-panel-title">
          <span class="cult-panel-icon">⚡</span>
          <span>试炼场 · 渡劫检测</span>
        </div>
        <button class="cult-panel-back" type="button" @click="backHall">返回大厅</button>
      </header>

      <div class="cult-panel-body">
        <template v-if="stage === 'rules'">
          <ModuleRulesIntro module-key="exam" @confirm="stage = 'info'" @back="backHall" />
        </template>

        <template v-else-if="stage === 'info'">
          <div v-if="resumeCandidate" class="cult-notice warning">
            <span class="cult-notice-icon">⟳</span>
            <div class="cult-notice-body">
              <div class="cult-notice-title">检测到上次渡劫进度</div>
              <div class="cult-notice-desc">请选择继续上次渡劫，或重新开始本轮试炼。</div>
            </div>
          </div>

          <div class="cult-realm-banner" :class="{ ready: canBreakthrough }">
            <div class="cult-realm-side">
              <span class="cult-realm-label">当前</span>
              <span class="cult-realm-name">{{ examInfo.current_realm || '-' }}</span>
            </div>
            <div class="cult-realm-arrow">⟹</div>
            <div class="cult-realm-side highlight">
              <span class="cult-realm-label">下一境界</span>
              <span class="cult-realm-name">{{ examInfo.next_realm || '-' }}</span>
            </div>
            <p class="cult-realm-msg">{{ examInfo.breakthrough_status?.message || '请先完成突破条件。' }}</p>
          </div>

          <div class="cult-stat-grid">
            <div class="cult-stat-card">
              <span class="cult-stat-label">灵力储备</span>
              <span class="cult-stat-value">{{ examInfo.spirit_power ?? 0 }}</span>
              <span class="cult-stat-sub">渡劫消耗 {{ examInfo.spirit_cost ?? 30 }}</span>
            </div>
            <div class="cult-stat-card">
              <span class="cult-stat-label">当前境界</span>
              <span class="cult-stat-value sm">{{ examInfo.current_realm || '-' }}</span>
            </div>
            <div class="cult-stat-card">
              <span class="cult-stat-label">突破目标</span>
              <span class="cult-stat-value sm">{{ examInfo.next_realm || '-' }}</span>
            </div>
          </div>

          <div v-if="dimensionRows.length" class="cult-progress-section">
            <div class="cult-section-title">六维修行进度</div>
            <div class="cult-progress-list">
              <div
                v-for="item in dimensionRows"
                :key="item.key"
                class="cult-progress-item"
                :class="{ met: item.met, unmet: !item.met }"
              >
                <div class="cult-progress-head">
                  <span class="cult-progress-label">{{ item.label }}</span>
                  <span class="cult-progress-value">{{ item.current }} / {{ item.required }}</span>
                  <span class="cult-progress-status">{{ item.met ? '已达标' : `差 ${item.gap}` }}</span>
                </div>
                <div class="cult-progress-track">
                  <div
                    class="cult-progress-fill"
                    :style="{ width: `${dimensionPercent(item)}%` }"
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="resumeCandidate" class="cult-actions">
            <el-button type="primary" @click="continueExam">继续上次进度</el-button>
            <el-button type="danger" @click="restartExam">重新开始渡劫</el-button>
            <el-button @click="loadCurrent">刷新状态</el-button>
          </div>
          <div v-else class="cult-actions">
            <el-button type="primary" :disabled="!canBreakthrough" @click="manualBreakthrough">手动突破</el-button>
            <el-button type="danger" :disabled="!canTakeExam" @click="startExam">开始渡劫</el-button>
            <el-button @click="loadCurrent">刷新状态</el-button>
          </div>
        </template>

        <template v-else-if="stage === 'exam' && questions.length > 0">
          <div class="cult-tag-row">
            <span class="cult-tag danger">渡劫 {{ currentIndex + 1 }}/{{ questions.length }}</span>
            <span class="cult-tag warning">剩余 {{ formatTime(timeLeft) }}</span>
            <span class="cult-tag info">已答 {{ answeredCount }}/{{ questions.length }}</span>
          </div>

          <div class="cult-question-stem">{{ currentQuestion.question }}</div>

          <el-radio-group v-model="answers[currentQuestion.question_id]" class="cult-option-group">
            <el-radio
              v-for="opt in optionEntries"
              :key="`${currentQuestion.question_id}-${opt.key}`"
              :label="opt.key"
              border
              class="cult-option-item"
            >
              {{ opt.key }}. {{ opt.text }}
            </el-radio>
          </el-radio-group>

          <div class="cult-actions">
            <el-button :disabled="currentIndex === 0" @click="prevQuestion">上一题</el-button>
            <el-button :disabled="currentIndex >= questions.length - 1" @click="nextQuestion">下一题</el-button>
            <el-button type="primary" @click="submitExam">提交应劫</el-button>
          </div>
        </template>

        <template v-else-if="stage === 'result' && resultData">
          <div class="cult-result" :class="resultData.grade_result?.passed ? 'success' : 'warning'">
            <div class="cult-result-icon">{{ resultData.grade_result?.passed ? '✦' : '☁' }}</div>
            <div class="cult-result-title">{{ resultData.grade_result?.passed ? '渡劫成功' : '渡劫未过' }}</div>
            <div class="cult-result-sub">
              评级 {{ resultData.grade_result?.grade || '-' }} ｜ 得分 {{ resultData.grade_result?.score || 0 }}
            </div>
            <div class="cult-actions">
              <el-button type="primary" @click="afterResult">返回试炼信息</el-button>
              <el-button @click="backHall">返回大厅</el-button>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useApiClient } from '../services/api';
import { useLegacyBridge } from '../composables/useLegacyBridge';
import { useUiStore } from '../stores/ui';
import { useUserStore } from '../stores/user';
import ModuleRulesIntro from '../components/ModuleRulesIntro.vue';

type Stage = 'rules' | 'info' | 'exam' | 'result';
type ExamSession = {
  stage: Stage;
  questions: Array<Record<string, any>>;
  currentIndex: number;
  answers: Record<string, string>;
  timeLeft: number;
  timeLimit: number;
};

const router = useRouter();
const api = useApiClient();
const bridge = useLegacyBridge();
const ui = useUiStore();
const user = useUserStore();

const stage = ref<Stage>('rules');
const examInfo = ref<Record<string, any>>({});
const questions = ref<Array<Record<string, any>>>([]);
const currentIndex = ref(0);
const answers = reactive<Record<string, string>>({});
const timeLimit = ref(600);
const timeLeft = ref(600);
const timer = ref<number | null>(null);
const resultData = ref<Record<string, any> | null>(null);
const resumeCandidate = ref<ExamSession | null>(null);

const canBreakthrough = computed(() => Boolean(examInfo.value?.breakthrough_status?.can_breakthrough));
const canTakeExam = computed(() => Boolean(examInfo.value?.can_take));
const currentQuestion = computed(() => questions.value[currentIndex.value] || {});
const optionEntries = computed(() => {
  const options = currentQuestion.value?.options;
  if (!options || typeof options !== 'object') return [];
  return Object.entries(options).map(([key, value]) => ({ key: String(key), text: String(value ?? '') }));
});
const answeredCount = computed(() => Object.values(answers).filter((v) => String(v || '').trim()).length);
const dimensionRows = computed(() => {
  const dimensions = examInfo.value?.breakthrough_status?.dimensions || {};
  return Object.keys(dimensions).map((key) => ({
    key,
    label: dimensions[key]?.label || key,
    current: Number(dimensions[key]?.current || 0),
    required: Number(dimensions[key]?.required || 0),
    gap: Number(dimensions[key]?.gap || 0),
    met: Boolean(dimensions[key]?.met),
  }));
});

onMounted(async () => {
  ui.showLoading('进入试炼场...');
  try {
    await bridge.switchToExamScene();
    await bridge.closeLegacyPanels();
    await loadCurrent();
    const restored = loadSession();
    if (restored) {
      resumeCandidate.value = restored;
      ElMessage.info('检测到上次渡劫进度，请选择继续或重开');
    }
  } catch {
    ElMessage.error('试炼场加载失败');
  } finally {
    ui.hideLoading();
  }
});

onBeforeUnmount(() => {
  stopTimer();
  persistSession();
  void bridge.closeLegacyPanels();
});

function getSessionKey() {
  const userId = user.profile?.id || 'guest';
  return `levelup_vue_exam_session_${userId}`;
}

function clearSession() {
  localStorage.removeItem(getSessionKey());
}

function persistSession() {
  if (stage.value !== 'exam' || !questions.value.length) {
    clearSession();
    return;
  }
  const payload: ExamSession = {
    stage: stage.value,
    questions: questions.value.map((q) => ({ ...q })),
    currentIndex: currentIndex.value,
    answers: { ...answers },
    timeLeft: timeLeft.value,
    timeLimit: timeLimit.value,
  };
  localStorage.setItem(getSessionKey(), JSON.stringify(payload));
}

function loadSession(): ExamSession | null {
  try {
    const raw = localStorage.getItem(getSessionKey());
    if (!raw) return null;
    const data = JSON.parse(raw) as ExamSession;
    if (data?.stage !== 'exam' || !Array.isArray(data.questions) || !data.questions.length) return null;
    return data;
  } catch {
    return null;
  }
}

function restoreSession(session: ExamSession) {
  questions.value = session.questions || [];
  currentIndex.value = Math.max(0, Math.min(Number(session.currentIndex || 0), Math.max(0, questions.value.length - 1)));
  Object.keys(answers).forEach((key) => delete answers[key]);
  Object.entries(session.answers || {}).forEach(([k, v]) => {
    answers[k] = String(v || '');
  });
  timeLimit.value = Number(session.timeLimit || 600);
  timeLeft.value = Math.max(1, Number(session.timeLeft || 600));
  stage.value = 'exam';
  startTimer();
  ElMessage.info('已恢复上次渡劫进度');
}

async function loadCurrent() {
  const res = await api.get('/exam/current');
  if (!res?.success || !res?.data) {
    ElMessage.error(res?.message || '读取试炼信息失败');
    return;
  }
  examInfo.value = res.data;
}

async function manualBreakthrough() {
  ui.showLoading('冲击瓶颈中...');
  try {
    const res = await api.post('/exam/breakthrough');
    if (!res?.success || !res?.data) {
      ElMessage.error(res?.message || '突破失败');
      await loadCurrent();
      return;
    }
    const userData = res.data.user || {};
    user.updateProfile({
      realm: userData.realm ?? user.profile?.realm,
      realm_stage: userData.realm_stage ?? user.profile?.realm_stage,
      current_realm: userData.current_realm ?? user.profile?.current_realm,
      cultivation_energy: Number(userData.cultivation_energy ?? user.profile?.cultivation_energy ?? 0),
      vocabulary: Number(userData.vocabulary ?? user.profile?.vocabulary ?? 0),
      grammar: Number(userData.grammar ?? user.profile?.grammar ?? 0),
      reading: Number(userData.reading ?? user.profile?.reading ?? 0),
      listening: Number(userData.listening ?? user.profile?.listening ?? 0),
      writing: Number(userData.writing ?? user.profile?.writing ?? 0),
      speaking: Number(userData.speaking ?? user.profile?.speaking ?? 0),
    });
    ElMessage.success(res.data.message || '突破成功');
    await loadCurrent();
  } finally {
    ui.hideLoading();
  }
}

async function startExam() {
  resumeCandidate.value = null;
  ui.showLoading('天道感应中...');
  try {
    const res = await api.post('/exam/start');
    if (!res?.success || !res?.data) {
      ElMessage.error(res?.message || '无法开始渡劫');
      return;
    }
    questions.value = Array.isArray(res.data.questions) ? res.data.questions : [];
    currentIndex.value = 0;
    Object.keys(answers).forEach((key) => delete answers[key]);
    questions.value.forEach((q) => {
      answers[String(q.question_id)] = '';
    });
    timeLimit.value = Number(res.data.time_limit || 600);
    timeLeft.value = timeLimit.value;
    stage.value = 'exam';
    resultData.value = null;
    startTimer();
    persistSession();
  } finally {
    ui.hideLoading();
  }
}

function continueExam() {
  if (!resumeCandidate.value) return;
  restoreSession(resumeCandidate.value);
  resumeCandidate.value = null;
}

async function restartExam() {
  clearSession();
  resumeCandidate.value = null;
  await startExam();
}

function startTimer() {
  stopTimer();
  timer.value = window.setInterval(() => {
    timeLeft.value -= 1;
    if (timeLeft.value <= 0) {
      timeLeft.value = 0;
      void submitExam();
      return;
    }
    if (timeLeft.value % 5 === 0) {
      persistSession();
    }
  }, 1000);
}

function stopTimer() {
  if (timer.value !== null) {
    clearInterval(timer.value);
    timer.value = null;
  }
}

function prevQuestion() {
  if (currentIndex.value <= 0) return;
  currentIndex.value -= 1;
}

function nextQuestion() {
  if (currentIndex.value >= questions.value.length - 1) return;
  currentIndex.value += 1;
}

function formatTime(seconds: number) {
  const safe = Math.max(0, Number(seconds || 0));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function dimensionPercent(item: { current: number; required: number }) {
  const required = Math.max(1, Number(item.required || 0));
  return Math.min(100, Math.round((Number(item.current || 0) / required) * 100));
}

function hasMissingAnswers() {
  return questions.value.some((q) => !String(answers[String(q.question_id)] || '').trim());
}

async function submitExam() {
  if (stage.value !== 'exam') return;
  if (hasMissingAnswers()) {
    ElMessage.warning('请完成全部题目后再提交');
    return;
  }

  stopTimer();
  ui.showLoading('天道判定中...');
  try {
    const payload = {
      answers: questions.value.map((q) => ({
        question_id: String(q.question_id),
        answer: String(answers[String(q.question_id)] || ''),
      })),
      time_spent: Math.max(0, timeLimit.value - timeLeft.value),
    };
    const res = await api.post('/exam/submit', payload);
    if (!res?.success || !res?.data) {
      ElMessage.error(res?.message || '提交失败');
      if (stage.value === 'exam') startTimer();
      return;
    }

    resultData.value = res.data;
    stage.value = 'result';
    clearSession();

    const reward = res.data.reward || {};
    user.updateProfile({
      exp: Number(user.profile?.exp || 0) + Number(reward.exp_gained || 0),
      spirit_stone: Number(user.profile?.spirit_stone || 0) + Number(reward.stones_gained || 0),
      spirit_power: Math.max(0, Number(user.profile?.spirit_power || 0) - Number(examInfo.value?.spirit_cost || 30)),
      realm: res.data.current_realm ?? user.profile?.realm,
      realm_stage: res.data.current_stage ?? user.profile?.realm_stage,
    });
  } finally {
    ui.hideLoading();
  }
}

async function afterResult() {
  stage.value = 'info';
  resultData.value = null;
  await loadCurrent();
}

function backHall() {
  stopTimer();
  persistSession();
  void bridge.closeLegacyPanels();
  router.push('/hall');
}
</script>
