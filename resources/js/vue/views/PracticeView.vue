<template>
  <div class="practice-page">
    <el-card shadow="hover" class="practice-shell">
      <template #header>
        <div class="card-header">练功房 · {{ moduleLabel }}</div>
      </template>

      <div class="practice-toolbar">
        <el-space wrap>
          <el-button
            v-for="item in modules"
            :key="item.type"
            :type="item.type === currentType ? 'primary' : 'default'"
            @click="switchModule(item.type)"
          >
            {{ item.label }}
          </el-button>
          <el-button type="warning" plain @click="openLegacy(currentType)">经典模式</el-button>
        </el-space>
      </div>

      <template v-if="sessionState === 'idle'">
        <div class="level-box">
          <div class="level-title">当前关卡</div>
          <div class="level-main">{{ currentLevel.levelId }}</div>
          <div class="level-sub">{{ currentLevel.realm }} · 第{{ String(currentLevel.stageNo).padStart(2, '0') }}关</div>
          <div class="level-sub">进度：{{ currentLevel.index + 1 }}/{{ currentLevel.total }}</div>
        </div>
        <div class="practice-actions">
          <el-button type="primary" @click="startChallenge">开始修炼</el-button>
          <el-button @click="backHall">返回大厅</el-button>
        </div>
      </template>

      <template v-else-if="sessionState === 'confirm'">
        <el-alert
          type="warning"
          :closable="false"
          show-icon
          :title="`本次将消耗灵力 ${spiritCost}`"
          :description="`当前灵力：${currentSpirit}`"
        />
        <div class="practice-actions">
          <el-button type="primary" @click="confirmChallenge">确认开始</el-button>
          <el-button @click="cancelChallenge">取消</el-button>
        </div>
      </template>

      <template v-else-if="sessionState === 'answering' && !isWritingModule">
        <div class="question-head">
          <el-tag type="info">{{ currentIndex + 1 }} / {{ questions.length }}</el-tag>
          <span class="question-level">{{ currentLevel.levelId }}</span>
        </div>
        <div class="question-stem">{{ currentQuestionText }}</div>

        <el-radio-group v-model="selectedAnswer" class="option-group">
          <el-radio
            v-for="option in optionEntries"
            :key="option.key"
            :label="option.key"
            border
            class="option-item"
          >
            {{ option.key }}. {{ option.text }}
          </el-radio>
        </el-radio-group>

        <div class="practice-actions">
          <el-button @click="backQuestion">上一题</el-button>
          <el-button type="primary" @click="nextQuestion">{{ isLastQuestion ? '提交结算' : '下一题' }}</el-button>
        </div>
      </template>

      <template v-else-if="sessionState === 'answering' && isWritingModule">
        <div class="question-head">
          <el-tag type="success">写作题 {{ currentIndex + 1 }} / {{ questions.length }}</el-tag>
          <span class="question-level">{{ currentLevel.levelId }}</span>
        </div>

        <div class="writing-meta">
          <h3>{{ currentWritingPrompt.title || '写作任务' }}</h3>
          <p>{{ currentWritingPrompt.topic || '请根据要求完成写作。' }}</p>
          <el-alert
            v-if="currentWritingPrompt.passage"
            type="info"
            :closable="false"
            show-icon
            title="原文段落"
            :description="currentWritingPrompt.passage"
            style="margin-top:8px"
          />
          <p class="writing-word-limit">
            建议字数：{{ currentWritingPrompt.word_limit_min || 50 }} - {{ currentWritingPrompt.word_limit_max || 150 }} 词
          </p>
        </div>

        <el-input
          v-model="writingContent"
          type="textarea"
          :rows="8"
          maxlength="5000"
          show-word-limit
          placeholder="请输入英文内容"
        />

        <div class="practice-actions">
          <el-button @click="saveWritingDraft">暂存草稿</el-button>
          <el-button type="primary" :loading="writingSubmitting" @click="submitWritingPrompt">
            {{ isLastQuestion ? '提交并结算' : '提交本题' }}
          </el-button>
        </div>
      </template>

      <template v-else-if="sessionState === 'result'">
        <el-result
          :icon="resultPassed ? 'success' : 'warning'"
          :title="resultPassed ? '修炼完成' : '修炼未达标'"
          :sub-title="resultSubtitle"
        >
          <template #extra>
            <el-space>
              <el-button type="primary" @click="retryLevel">再试一次</el-button>
              <el-button v-if="resultPassed" @click="nextLevel">下一关</el-button>
              <el-button @click="backHall">返回大厅</el-button>
            </el-space>
          </template>
        </el-result>
      </template>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useApiClient } from '../services/api';
import { useLegacyBridge } from '../composables/useLegacyBridge';
import { useUiStore } from '../stores/ui';
import { useUserStore } from '../stores/user';

type PracticeType = 'vocab' | 'grammar' | 'listening' | 'speaking' | 'reading' | 'writing';

type LevelInfo = {
  realm: string;
  stageNo: number;
  levelId: string;
  index: number;
  total: number;
};

const modules: Array<{ type: PracticeType; label: string }> = [
  { type: 'vocab', label: '词汇' },
  { type: 'grammar', label: '语法' },
  { type: 'listening', label: '听力' },
  { type: 'speaking', label: '口语' },
  { type: 'reading', label: '阅读' },
  { type: 'writing', label: '写作' },
];

const route = useRoute();
const router = useRouter();
const api = useApiClient();
const bridge = useLegacyBridge();
const ui = useUiStore();
const user = useUserStore();

const currentType = ref<PracticeType>('vocab');
const sessionState = ref<'idle' | 'confirm' | 'answering' | 'result'>('idle');
const questions = ref<Array<Record<string, any>>>([]);
const currentIndex = ref(0);
const selectedAnswer = ref('');
const writingContent = ref('');
const writingSubmitting = ref(false);
const answers = reactive<Record<string, string>>({});
const spiritCost = ref(5);
const currentSpirit = ref(0);
const resultAccuracy = ref(0);
const resultExp = ref(0);
const resultStones = ref(0);
const resultPassed = ref(false);
const writingSubmittedCount = ref(0);
const writingPassedCount = ref(0);
const writingTotalScore = ref(0);

const moduleLabel = computed(() => modules.find((m) => m.type === currentType.value)?.label || '练功');
const isWritingModule = computed(() => currentType.value === 'writing');
const currentLevel = computed(() => getCurrentPlayableLevel(currentType.value));
const isLastQuestion = computed(() => currentIndex.value >= questions.value.length - 1);
const currentQuestion = computed(() => questions.value[currentIndex.value] || {});
const currentWritingPrompt = computed(() => currentQuestion.value || {});
const currentQuestionText = computed(() => {
  const q = currentQuestion.value;
  return String(q.question || q.stem || q.prompt || q.topic || '请选择正确答案');
});
const optionEntries = computed(() => {
  if (isWritingModule.value) return [];
  const options = currentQuestion.value?.options;
  if (!options || typeof options !== 'object') return [];
  return Object.entries(options).map(([key, value]) => ({ key: String(key), text: String(value ?? '') }));
});
const resultSubtitle = computed(() => {
  if (isWritingModule.value) {
    return `平均分 ${resultAccuracy.value} ｜ 通过 ${writingPassedCount.value}/${Math.max(1, writingSubmittedCount.value)} ｜ 灵气 +${resultExp.value} ｜ 灵石 +${resultStones.value}`;
  }
  return `正确率 ${resultAccuracy.value}% ｜ 灵气 +${resultExp.value} ｜ 灵石 +${resultStones.value}`;
});

onMounted(async () => {
  window.addEventListener('legacy:enterHall', onLegacyEnterHall);
  await bootstrapModuleFromRoute();
});

onBeforeUnmount(() => {
  window.removeEventListener('legacy:enterHall', onLegacyEnterHall);
  void bridge.closeLegacyPanels();
});

watch(
  () => route.query.mode,
  async () => {
    await bootstrapModuleFromRoute();
  }
);

function levelSequence(): Array<Omit<LevelInfo, 'index' | 'total'>> {
  const list: Array<Omit<LevelInfo, 'index' | 'total'>> = [];
  ['L1', 'L2', 'L3'].forEach((realm) => {
    for (let stageNo = 1; stageNo <= 9; stageNo += 1) {
      list.push({
        realm,
        stageNo,
        levelId: `${realm}-${String(stageNo).padStart(2, '0')}`,
      });
    }
  });
  return list;
}

function progressKey(type: PracticeType) {
  return `levelup_progress_${type}`;
}

function getCurrentPlayableLevel(type: PracticeType): LevelInfo {
  const list = levelSequence();
  const unlocked = Number(localStorage.getItem(progressKey(type)) || '0');
  const index = Math.min(Math.max(unlocked, 0), list.length - 1);
  return {
    ...list[index],
    index,
    total: list.length,
  };
}

function unlockNextLevel(type: PracticeType, levelId: string) {
  const list = levelSequence();
  const idx = list.findIndex((it) => it.levelId === levelId);
  if (idx < 0) return;
  const unlocked = Number(localStorage.getItem(progressKey(type)) || '0');
  const next = Math.min(list.length - 1, idx + 1);
  if (next > unlocked) {
    localStorage.setItem(progressKey(type), String(next));
  }
}

function resetQuestionState() {
  questions.value = [];
  currentIndex.value = 0;
  selectedAnswer.value = '';
  writingContent.value = '';
  writingSubmitting.value = false;
  Object.keys(answers).forEach((key) => delete answers[key]);
  resultAccuracy.value = 0;
  resultExp.value = 0;
  resultStones.value = 0;
  resultPassed.value = false;
  writingSubmittedCount.value = 0;
  writingPassedCount.value = 0;
  writingTotalScore.value = 0;
  sessionState.value = 'idle';
}

function parseMode(raw: unknown): PracticeType {
  const str = String(raw || 'vocab').toLowerCase();
  const supported: PracticeType[] = ['vocab', 'grammar', 'listening', 'speaking', 'reading', 'writing'];
  return supported.includes(str as PracticeType) ? (str as PracticeType) : 'vocab';
}

async function bootstrapModuleFromRoute() {
  const type = parseMode(route.query.mode);
  currentType.value = type;
  resetQuestionState();

  ui.showLoading('切换练功场景...');
  try {
    await bridge.switchToPracticeScene(type);
    await bridge.closeLegacyPanels();
  } catch {
    ElMessage.error('练功场景切换失败');
  } finally {
    ui.hideLoading();
  }
}

function onLegacyEnterHall() {
  router.replace('/hall');
}

async function switchModule(type: PracticeType) {
  if (type === currentType.value && route.query.mode === type) return;
  await router.replace({ path: '/practice', query: { mode: type } });
}

async function startChallenge() {
  const level = currentLevel.value;
  ui.showLoading('加载题库...');
  try {
    const endpoint = isWritingModule.value
      ? `/writing/prompts?level=${level.realm}&stage=${String(level.stageNo).padStart(2, '0')}`
      : `/${currentType.value}/questions?level=${level.realm}&stage=${String(level.stageNo).padStart(2, '0')}`;
    const res = await api.get(endpoint);

    if (!res?.success) {
      ElMessage.error(res?.message || '题库加载失败');
      return;
    }

    questions.value = Array.isArray(isWritingModule.value ? res?.data?.prompts : res?.data?.questions)
      ? (isWritingModule.value ? res.data.prompts : res.data.questions)
      : [];

    if (!questions.value.length) {
      ElMessage.warning('该关卡暂无题目');
      return;
    }

    if (!isWritingModule.value && currentType.value === 'speaking') {
      ElMessage.info('口语模块暂走经典模式（录音与跟读链路未迁移）');
      await openLegacy(currentType.value);
      return;
    }

    if (!isWritingModule.value) {
      const hasComplexQuestion = questions.value.some((q) => !q?.options || typeof q.options !== 'object');
      if (hasComplexQuestion) {
        ElMessage.warning('当前题型不支持 Vue 原生渲染，请使用经典模式');
        return;
      }
    }

    spiritCost.value = Number(res?.data?.spirit_cost || 5);
    currentSpirit.value = Number(res?.data?.current_spirit_power ?? user.profile?.spirit_power ?? 0);
    sessionState.value = 'confirm';
  } finally {
    ui.hideLoading();
  }
}

async function confirmChallenge() {
  const level = currentLevel.value;
  const consumeRes = await api.post('/user/consume-spirit', {
    amount: spiritCost.value,
    reason: `${currentType.value}:${level.levelId}`,
  });

  if (Number.isFinite(Number(consumeRes?.data?.current_spirit_power))) {
    user.updateProfile({ spirit_power: Number(consumeRes.data.current_spirit_power) });
    currentSpirit.value = Number(consumeRes.data.current_spirit_power);
  }

  if (!consumeRes?.success) {
    ElMessage.error(consumeRes?.message || '灵力不足，无法开始修炼');
    return;
  }

  currentIndex.value = 0;
  selectedAnswer.value = '';
  writingContent.value = '';
  Object.keys(answers).forEach((key) => delete answers[key]);
  sessionState.value = 'answering';
  restoreAnswerForCurrentQuestion();
}

function restoreAnswerForCurrentQuestion() {
  const qid = String(currentQuestion.value?.question_id || currentQuestion.value?.prompt_id || '');
  if (!qid) return;
  if (isWritingModule.value) {
    writingContent.value = answers[qid] || '';
  } else {
    selectedAnswer.value = answers[qid] || '';
  }
}

function cancelChallenge() {
  resetQuestionState();
}

function backQuestion() {
  if (currentIndex.value <= 0 || isWritingModule.value) return;
  const currentQid = String(currentQuestion.value.question_id || '');
  if (currentQid && selectedAnswer.value) {
    answers[currentQid] = selectedAnswer.value;
  }

  currentIndex.value -= 1;
  restoreAnswerForCurrentQuestion();
}

async function nextQuestion() {
  if (isWritingModule.value) return;
  const qid = String(currentQuestion.value?.question_id || '');
  if (!qid) return;
  if (!selectedAnswer.value) {
    ElMessage.warning('请先选择一个答案');
    return;
  }

  answers[qid] = selectedAnswer.value;

  if (isLastQuestion.value) {
    await submitChallenge();
    return;
  }

  currentIndex.value += 1;
  restoreAnswerForCurrentQuestion();
}

async function submitChallenge() {
  const level = currentLevel.value;
  ui.showLoading('结算中...');
  try {
    const payload = {
      level: level.realm,
      stage: String(level.stageNo).padStart(2, '0'),
      answers: questions.value.map((q) => ({
        question_id: String(q.question_id),
        answer: answers[String(q.question_id)] || '',
        mode: 'choice',
      })),
    };

    const res = await api.post(`/${currentType.value}/submit-batch`, payload);
    if (!res?.success) {
      ElMessage.error(res?.message || '提交失败');
      return;
    }

    const data = res?.data || {};
    resultAccuracy.value = Number(data.accuracy || 0);
    resultExp.value = Number(data.total_exp ?? data.exp_gained ?? 0);
    resultStones.value = Number(data.stones_gained || 0);
    resultPassed.value = Boolean(data.passed);

    user.updateProfile({
      exp: Number(user.profile?.exp || 0) + resultExp.value,
      spirit_stone: Number(user.profile?.spirit_stone || 0) + resultStones.value,
      spirit_power: currentSpirit.value,
    });

    if (resultPassed.value) {
      unlockNextLevel(currentType.value, level.levelId);
    }

    sessionState.value = 'result';
  } finally {
    ui.hideLoading();
  }
}

function saveWritingDraft() {
  const promptId = String(currentWritingPrompt.value?.prompt_id || '');
  if (!promptId) return;
  answers[promptId] = writingContent.value;
  ElMessage.success('草稿已暂存');
}

async function submitWritingPrompt() {
  const prompt = currentWritingPrompt.value;
  const promptId = String(prompt?.prompt_id || '');
  const content = String(writingContent.value || '').trim();
  if (!promptId) return;
  if (content.length < 10) {
    ElMessage.warning('写作内容至少 10 个字符');
    return;
  }
  if (writingSubmitting.value) return;

  writingSubmitting.value = true;
  answers[promptId] = content;
  ui.showLoading('炼符中...');
  try {
    const res = await api.post('/writing/submit-one', {
      prompt_id: promptId,
      content,
    });

    if (!res?.success || !res?.data) {
      ElMessage.error(res?.message || '写作提交失败');
      return;
    }

    const data = res.data;
    const score = Number(data.score || 0);
    const exp = Number(data.exp_gained || 0);
    const stones = Number(data.stones_gained || 0);
    const passed = Boolean(data.passed);

    writingSubmittedCount.value += 1;
    writingTotalScore.value += score;
    if (passed) writingPassedCount.value += 1;

    resultExp.value += exp;
    resultStones.value += stones;

    user.updateProfile({
      exp: Number(user.profile?.exp || 0) + exp,
      spirit_stone: Number(user.profile?.spirit_stone || 0) + stones,
      spirit_power: currentSpirit.value,
    });

    ElMessage.success(`本题评分 ${score} 分：${data.feedback || '提交成功'}`);

    if (isLastQuestion.value) {
      const avgScore = Math.round(writingTotalScore.value / Math.max(1, writingSubmittedCount.value));
      resultAccuracy.value = avgScore;
      resultPassed.value = avgScore >= 60;
      if (resultPassed.value) {
        unlockNextLevel(currentType.value, currentLevel.value.levelId);
      }
      sessionState.value = 'result';
      return;
    }

    currentIndex.value += 1;
    restoreAnswerForCurrentQuestion();
  } finally {
    ui.hideLoading();
    writingSubmitting.value = false;
  }
}

function retryLevel() {
  resetQuestionState();
  startChallenge();
}

function nextLevel() {
  resetQuestionState();
  startChallenge();
}

async function openLegacy(type: PracticeType) {
  ui.showLoading('加载经典面板...');
  try {
    await bridge.openPracticePanel(type);
    ElMessage.success('已切换到经典练功面板');
  } catch {
    ElMessage.error('经典面板加载失败');
  } finally {
    ui.hideLoading();
  }
}

function backHall() {
  void bridge.closeLegacyPanels();
  router.push('/hall');
}
</script>
