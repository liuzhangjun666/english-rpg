<template>
  <div class="practice-page" :class="{ 'practice-page-arena': sessionState === 'answering' && isVocabModule }">
    <el-card shadow="hover" class="practice-shell" :class="{ 'practice-shell-arena': sessionState === 'answering' && isVocabModule }">
      <template v-if="!(sessionState === 'answering' && isVocabModule)" #header>
        <div class="card-header">练功房 · {{ moduleLabel }}</div>
      </template>

      <template v-if="sessionState === 'idle'">
        <el-alert
          v-if="resumeSession"
          type="warning"
          :closable="false"
          show-icon
          title="检测到上次修炼进度"
          description="你可以继续上次修炼，或重新开始本关。"
          style="margin-bottom: 12px;"
        />
        <div class="level-box">
          <div class="level-title">当前关卡</div>
          <div class="level-main">{{ currentLevel.levelId }}</div>
          <div class="level-sub">{{ currentLevel.realm }} · 第{{ String(currentLevel.stageNo).padStart(2, '0') }}关</div>
          <div class="level-sub">进度：{{ currentLevel.index + 1 }}/{{ currentLevel.total }}</div>
        </div>
        <div class="practice-actions">
          <template v-if="resumeSession">
            <el-button type="primary" @click="continueFromResume">继续上次进度</el-button>
            <el-button @click="restartFromResume">重新开始本关</el-button>
          </template>
          <el-button v-else type="primary" @click="startChallenge">开始修炼</el-button>
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
        <div v-if="isVocabModule" class="vocab-arena">
          <img class="ws-bg" :src="wsSceneBg" alt="木桩场景" />
          <div class="ws-mask"></div>

          <div class="ws-top">
            <button class="ws-nav-btn" type="button" @click="backHall">
              <img :src="wsTopBack" alt="返回" />
            </button>
            <img class="ws-title" :src="wsTopTitlePlate" alt="练功房·木桩连击" />
            <button class="ws-nav-btn" type="button">
              <img :src="wsTopHelp" alt="说明" />
            </button>
          </div>

          <div class="ws-progress-wrap">
            <div class="ws-progress-panel"></div>
            <div class="ws-progress-level">{{ currentLevel.realm }} · 第{{ String(currentLevel.stageNo).padStart(2, '0') }}关</div>
            <div class="ws-progress-text">{{ currentIndex + 1 }}/{{ questions.length }}</div>
            <div class="ws-progress-track">
              <div class="ws-progress-fill" :style="{ width: `${progressPercent}%` }"></div>
            </div>
          </div>

          <div class="ws-combo-wrap" :class="{ 'is-hidden': vocabCombo < 2 }">
            <img v-if="vocabCombo >= 2" class="ws-combo-bg" :src="wsTopCombo" alt="连击" />
            <div v-if="vocabCombo >= 2" class="ws-combo-text">x{{ vocabCombo }}</div>
          </div>

          <div class="ws-stake-zone">
            <img class="ws-stake-main" :src="wsStakePlain" alt="木桩" />
            <div class="ws-word-row">
              <div ref="wsWordRef" class="ws-word" :class="getWordTextClass(currentWord)">{{ currentWord }}</div>
              <button class="ws-speaker-btn" type="button" title="播放读音" @click="playCurrentWordAudio">🔊</button>
            </div>
            <img v-if="vocabFeedbackType === 'success'" class="ws-hit-fx" :src="wsFxHit" alt="击中" />
          </div>

          <div class="ws-options">
            <button
              v-for="(option, idx) in woodStakeOptions"
              :key="option.key"
              class="ws-option-btn"
              :class="getArenaOptionClass(option.key)"
              :disabled="vocabAnswerLocked"
              @click="selectVocabOption(option.key)"
            >
              <img class="ws-option-board" :src="resolveOptionBoard(option.key)" alt="" />
              <span class="ws-option-index">{{ idx + 1 }}</span>
              <span :ref="(el) => setOptionTextRef(option.key, el)" class="ws-option-text" :class="getOptionTextClass(option.text)">{{ option.text }}</span>
            </button>
          </div>
        </div>

        <template v-else>
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
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useApiClient } from '../services/api';
import { useLegacyBridge } from '../composables/useLegacyBridge';
import { useUiStore } from '../stores/ui';
import { useUserStore } from '../stores/user';
import wsSceneBg from '../../../assets/images/ui/wood_stake/background.png';
import wsTopBack from '../../../assets/images/ui/wood_stake/back.png';
import wsTopHelp from '../../../assets/images/ui/wood_stake/introduction.png';
import wsTopTitlePlate from '../../../assets/images/ui/wood_stake/title.png';
import wsTopCombo from '../../../assets/images/ui/wood_stake/lianji.png';
import wsStakePlain from '../../../assets/images/ui/wood_stake/question.png';
import wsOptionBoard from '../../../assets/images/ui/wood_stake/choose.png';
import wsOptionBoardActive from '../../../assets/images/ui/wood_stake/correct_choose.png';
import wsFxHit from '../../../assets/images/ui/wood_stake/zhengquetexiao.png';

type PracticeType = 'vocab' | 'grammar' | 'listening' | 'speaking' | 'reading' | 'writing';

type LevelInfo = {
  realm: string;
  stageNo: number;
  levelId: string;
  index: number;
  total: number;
};

type PracticeSession = {
  mode: PracticeType;
  sessionState: 'confirm' | 'answering';
  questions: Array<Record<string, any>>;
  currentIndex: number;
  answers: Record<string, string>;
  selectedAnswer: string;
  writingContent: string;
  spiritCost: number;
  currentSpirit: number;
  resultExp: number;
  resultStones: number;
  writingSubmittedCount: number;
  writingPassedCount: number;
  writingTotalScore: number;
  vocabCombo: number;
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
const resumeSession = ref<PracticeSession | null>(null);
const vocabAnswerLocked = ref(false);
const vocabFeedbackText = ref('');
const vocabFeedbackType = ref<'idle' | 'success' | 'error'>('idle');
const autoAdvanceTimer = ref<number | null>(null);
const vocabCombo = ref(0);
const wsWordRef = ref<HTMLElement | null>(null);
const optionTextRefs = reactive<Record<string, HTMLElement | null>>({});

const moduleLabel = computed(() => modules.find((m) => m.type === currentType.value)?.label || '练功');
const isVocabModule = computed(() => currentType.value === 'vocab');
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
const woodStakeOptions = computed(() => optionEntries.value.slice(0, 4));
const correctAnswerKey = computed(() => String(currentQuestion.value?.correct_answer || '').trim().toUpperCase());
const progressPercent = computed(() => {
  if (!questions.value.length) return 0;
  return Math.round(((currentIndex.value + 1) / questions.value.length) * 100);
});
const currentWord = computed(() => {
  const q = currentQuestion.value || {};
  const explicit = String(q.word || '').trim();
  if (explicit) return explicit;
  const raw = String(q.question || q.stem || '');
  const match = raw.match(/["“'「]([^"”'」]+)["”'」]/);
  if (match?.[1]) return match[1];
  return raw.replace(/的中文意思是.*/g, '').trim() || 'word';
});
const vocabRewardHint = computed(() => 5);
const resultSubtitle = computed(() => {
  if (isWritingModule.value) {
    return `平均分 ${resultAccuracy.value} ｜ 通过 ${writingPassedCount.value}/${Math.max(1, writingSubmittedCount.value)} ｜ 灵气 +${resultExp.value} ｜ 灵石 +${resultStones.value}`;
  }
  return `正确率 ${resultAccuracy.value}% ｜ 灵气 +${resultExp.value} ｜ 灵石 +${resultStones.value}`;
});

onMounted(async () => {
  window.addEventListener('legacy:enterHall', onLegacyEnterHall);
  window.addEventListener('resize', fitArenaTexts);
  await bootstrapModuleFromRoute();
});

onBeforeUnmount(() => {
  window.removeEventListener('legacy:enterHall', onLegacyEnterHall);
  window.removeEventListener('resize', fitArenaTexts);
  clearAutoAdvanceTimer();
  persistPracticeSession();
  void bridge.closeLegacyPanels();
});

watch(
  () => route.query.mode,
  async () => {
    await bootstrapModuleFromRoute();
  }
);

watch(
  () => currentQuestion.value?.question_id,
  () => {
    resetVocabRoundState();
    if (sessionState.value === 'answering' && isVocabModule.value) {
      queueWordAudioPlay();
      fitArenaTexts();
    }
  }
);

watch(
  () => [currentWord.value, ...woodStakeOptions.value.map((it) => `${it.key}:${it.text}`)],
  () => {
    if (sessionState.value === 'answering' && isVocabModule.value) {
      fitArenaTexts();
    }
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

function sessionKey(type: PracticeType) {
  const uid = user.profile?.id || 'guest';
  return `levelup_vue_practice_session_${uid}_${type}`;
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
  vocabCombo.value = 0;
  sessionState.value = 'idle';
  resetVocabRoundState();
}

function resetVocabRoundState() {
  clearAutoAdvanceTimer();
  vocabAnswerLocked.value = false;
  selectedAnswer.value = '';
  vocabFeedbackText.value = '';
  vocabFeedbackType.value = 'idle';
}

function clearAutoAdvanceTimer() {
  if (autoAdvanceTimer.value !== null) {
    clearTimeout(autoAdvanceTimer.value);
    autoAdvanceTimer.value = null;
  }
}

function clearPracticeSession(type = currentType.value) {
  localStorage.removeItem(sessionKey(type));
}

function loadPracticeSession(type = currentType.value): PracticeSession | null {
  try {
    const raw = localStorage.getItem(sessionKey(type));
    if (!raw) return null;
    const data = JSON.parse(raw) as PracticeSession;
    if (String(data?.mode || '') !== String(type)) return null;
    if (!['confirm', 'answering'].includes(String(data?.sessionState || ''))) return null;
    if (!Array.isArray(data.questions) || data.questions.length === 0) return null;
    return data;
  } catch {
    return null;
  }
}

function persistPracticeSession() {
  if (!['confirm', 'answering'].includes(sessionState.value) || !questions.value.length) {
    clearPracticeSession();
    return;
  }
  const payload: PracticeSession = {
    mode: currentType.value,
    sessionState: sessionState.value as 'confirm' | 'answering',
    questions: questions.value.map((q) => ({ ...q })),
    currentIndex: currentIndex.value,
    answers: { ...answers },
    selectedAnswer: String(selectedAnswer.value || ''),
    writingContent: String(writingContent.value || ''),
    spiritCost: Number(spiritCost.value || 5),
    currentSpirit: Number(currentSpirit.value || 0),
    resultExp: Number(resultExp.value || 0),
    resultStones: Number(resultStones.value || 0),
    writingSubmittedCount: Number(writingSubmittedCount.value || 0),
    writingPassedCount: Number(writingPassedCount.value || 0),
    writingTotalScore: Number(writingTotalScore.value || 0),
    vocabCombo: Number(vocabCombo.value || 0),
  };
  localStorage.setItem(sessionKey(currentType.value), JSON.stringify(payload));
}

function restorePracticeSession(session: PracticeSession) {
  questions.value = session.questions || [];
  currentIndex.value = Math.max(0, Math.min(Number(session.currentIndex || 0), Math.max(0, questions.value.length - 1)));
  Object.keys(answers).forEach((key) => delete answers[key]);
  Object.entries(session.answers || {}).forEach(([k, v]) => {
    answers[k] = String(v || '');
  });
  selectedAnswer.value = String(session.selectedAnswer || '');
  writingContent.value = String(session.writingContent || '');
  spiritCost.value = Number(session.spiritCost || 5);
  currentSpirit.value = Number(session.currentSpirit || 0);
  resultExp.value = Number(session.resultExp || 0);
  resultStones.value = Number(session.resultStones || 0);
  writingSubmittedCount.value = Number(session.writingSubmittedCount || 0);
  writingPassedCount.value = Number(session.writingPassedCount || 0);
  writingTotalScore.value = Number(session.writingTotalScore || 0);
  vocabCombo.value = Number(session.vocabCombo || 0);
  sessionState.value = session.sessionState;
  restoreAnswerForCurrentQuestion();
  if (sessionState.value === 'answering' && isVocabModule.value) {
    queueWordAudioPlay();
  }
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
  resumeSession.value = null;

  ui.showLoading('切换练功场景...');
  try {
    await bridge.switchToPracticeScene(type);
    await bridge.closeLegacyPanels();
    resumeSession.value = loadPracticeSession(type);
    if (resumeSession.value) {
      ElMessage.info('检测到上次修炼进度，请选择继续或重开');
    }
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
  resumeSession.value = null;
  resetVocabRoundState();
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
    persistPracticeSession();
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
  vocabCombo.value = 0;
  sessionState.value = 'answering';
  restoreAnswerForCurrentQuestion();
  if (isVocabModule.value) {
    queueWordAudioPlay();
  }
  persistPracticeSession();
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
  clearPracticeSession();
}

function backQuestion() {
  if (currentIndex.value <= 0 || isWritingModule.value) return;
  const currentQid = String(currentQuestion.value.question_id || '');
  if (currentQid && selectedAnswer.value) {
    answers[currentQid] = selectedAnswer.value;
  }

  currentIndex.value -= 1;
  restoreAnswerForCurrentQuestion();
  if (isVocabModule.value) {
    queueWordAudioPlay();
  }
  persistPracticeSession();
}

async function nextQuestion() {
  if (isVocabModule.value) return;
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
  persistPracticeSession();
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
    clearPracticeSession();
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
      clearPracticeSession();
      return;
    }

    currentIndex.value += 1;
    restoreAnswerForCurrentQuestion();
    persistPracticeSession();
  } finally {
    ui.hideLoading();
    writingSubmitting.value = false;
  }
}

function retryLevel() {
  clearPracticeSession();
  resetQuestionState();
  startChallenge();
}

function nextLevel() {
  clearPracticeSession();
  resetQuestionState();
  startChallenge();
}

function continueFromResume() {
  if (!resumeSession.value) return;
  restorePracticeSession(resumeSession.value);
  resumeSession.value = null;
  ElMessage.info('已恢复上次修炼进度');
}

async function restartFromResume() {
  clearPracticeSession();
  resumeSession.value = null;
  resetQuestionState();
  await startChallenge();
}

function getArenaOptionClass(optionKey: string) {
  const key = String(optionKey || '').toUpperCase();
  if (!vocabAnswerLocked.value) {
    return { selected: selectedAnswer.value === key };
  }
  const correct = correctAnswerKey.value;
  return {
    selected: selectedAnswer.value === key,
    correct: key === correct,
    wrong: selectedAnswer.value === key && key !== correct,
  };
}

function setOptionTextRef(optionKey: string, el: Element | null) {
  const key = String(optionKey || '').toUpperCase();
  optionTextRefs[key] = el as HTMLElement | null;
}

function getOptionTextClass(optionText: string) {
  const score = visualTextScore(optionText);
  if (score >= 16) return 'is-xlong';
  if (score >= 12) return 'is-long';
  if (score >= 8) return 'is-medium';
  return 'is-short';
}

function getWordTextClass(wordText: string) {
  const score = visualTextScore(wordText);
  if (score >= 15) return 'is-xlong';
  if (score >= 11) return 'is-long';
  if (score >= 8) return 'is-medium';
  return 'is-short';
}

function visualTextScore(text: string) {
  const chars = Array.from(String(text || '').trim());
  return chars.reduce((sum, ch) => {
    if (/[\u4e00-\u9fff]/.test(ch)) return sum + 1.8;
    if (/[A-Z]/.test(ch)) return sum + 1.1;
    if (/[a-z0-9]/.test(ch)) return sum + 1;
    return sum + 0.7;
  }, 0);
}

function fitArenaTexts() {
  void nextTick(() => {
    applyArenaTextFit();
    window.setTimeout(applyArenaTextFit, 120);
  });
}

function applyArenaTextFit() {
  if (wsWordRef.value) {
    fitTextToBounds(wsWordRef.value, 12, 36);
  }
  const optionMin = window.innerWidth <= 900 ? 10 : 14;
  const optionMax = window.innerWidth <= 900 ? 20 : 28;
  woodStakeOptions.value.forEach((it) => {
    const key = String(it.key || '').toUpperCase();
    const el = optionTextRefs[key];
    if (el) {
      fitTextToBounds(el, optionMin, optionMax);
    }
  });
}

function fitTextToBounds(el: HTMLElement, minPx: number, maxPx: number) {
  if (!el.clientWidth || !el.clientHeight) return;
  let size = Math.max(Number(maxPx || 56), Number(minPx || 10));
  const min = Number(minPx || 10);
  el.style.fontSize = `${size}px`;
  while (size > min && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)) {
    size -= 1;
    el.style.fontSize = `${size}px`;
  }
  // Keep text contained by tightening line-height for dense entries.
  if (el.scrollHeight > el.clientHeight + 1) {
    el.style.lineHeight = '1.05';
    while (size > min && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)) {
      size -= 1;
      el.style.fontSize = `${size}px`;
    }
  }
}

function resolveOptionBoard(optionKey: string) {
  const key = String(optionKey || '').toUpperCase();
  if (!vocabAnswerLocked.value) {
    return selectedAnswer.value === key ? wsOptionBoardActive : wsOptionBoard;
  }
  const correct = correctAnswerKey.value;
  if (key === correct) return wsOptionBoardActive;
  if (selectedAnswer.value === key && key !== correct) return wsOptionBoard;
  return wsOptionBoard;
}

function selectVocabOption(optionKey: string) {
  if (!isVocabModule.value || sessionState.value !== 'answering' || vocabAnswerLocked.value) return;
  const qid = String(currentQuestion.value?.question_id || '');
  if (!qid) return;
  const selected = String(optionKey || '').toUpperCase();
  const correct = correctAnswerKey.value;
  if (!selected || !correct) return;

  selectedAnswer.value = selected;
  answers[qid] = selected;
  vocabAnswerLocked.value = true;

  const isCorrect = selected === correct;
  if (isCorrect) {
    vocabCombo.value += 1;
    vocabFeedbackType.value = 'success';
    vocabFeedbackText.value = `采集成功，灵气 +${vocabRewardHint.value}`;
  } else {
    vocabCombo.value = 0;
    vocabFeedbackType.value = 'error';
    const correctText = optionEntries.value.find((it) => String(it.key).toUpperCase() === correct)?.text || correct;
    const explanation = String(currentQuestion.value?.explanation || '').trim();
    vocabFeedbackText.value = `回答错误，正确答案：${correctText}${explanation ? `。${explanation}` : ''}`;
  }

  persistPracticeSession();
  const delay = isCorrect ? 900 : 2200;
  clearAutoAdvanceTimer();
  autoAdvanceTimer.value = window.setTimeout(async () => {
    autoAdvanceTimer.value = null;
    if (isLastQuestion.value) {
      await submitChallenge();
      return;
    }
    currentIndex.value += 1;
    restoreAnswerForCurrentQuestion();
    resetVocabRoundState();
    queueWordAudioPlay();
    persistPracticeSession();
  }, delay);
}

function queueWordAudioPlay() {
  window.setTimeout(() => {
    playCurrentWordAudio();
  }, 120);
}

function playCurrentWordAudio() {
  const word = String(currentWord.value || '').trim();
  if (!word || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(word);
    utter.lang = 'en-US';
    utter.rate = 0.9;
    utter.pitch = 1;
    window.speechSynthesis.speak(utter);
  } catch {
    // ignore audio errors
  }
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
  persistPracticeSession();
  void bridge.closeLegacyPanels();
  router.push('/hall');
}
</script>

<style scoped>
:deep(.practice-shell-arena .el-card__body) {
  padding: 0;
}

.vocab-arena {
  position: fixed;
  inset: 0;
  z-index: 80;
  width: 100vw;
  min-height: 100vh;
  overflow: hidden;
  border-radius: 0;
}

.ws-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.ws-mask {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(8, 14, 28, 0.25), rgba(8, 14, 28, 0.45));
}

.ws-top,
.ws-progress-wrap,
.ws-combo-wrap,
.ws-stake-zone,
.ws-options {
  position: relative;
  z-index: 1;
}

.ws-top {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 12px 16px 0;
}

.ws-title {
  width: min(72vw, 620px);
}

.ws-nav-btn {
  width: 62px;
  height: 62px;
  border: 0;
  background: transparent;
  cursor: pointer;
  justify-self: start;
  padding: 0;
}

.ws-nav-btn:last-child {
  justify-self: end;
}

.ws-nav-btn img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.ws-progress-wrap {
  position: relative;
  margin: 2px auto 0;
  width: min(95%, 980px);
  height: 112px;
}

.ws-progress-panel {
  position: absolute;
  inset: 0;
  border: 1px solid rgba(229, 190, 115, 0.55);
  border-radius: 26px;
  background: linear-gradient(180deg, rgba(10, 18, 36, 0.76), rgba(10, 18, 36, 0.6));
  box-shadow: inset 0 0 20px rgba(255, 205, 120, 0.08);
}

.ws-progress-level {
  position: absolute;
  left: 26px;
  top: 20px;
  color: #f3d481;
  font-size: 20px;
  font-weight: 700;
}

.ws-progress-text {
  position: absolute;
  left: 50%;
  top: 20px;
  transform: translateX(-50%);
  color: #edf1ff;
  font-size: 20px;
  font-weight: 800;
}

.ws-progress-track {
  position: absolute;
  left: 26px;
  right: 26px;
  bottom: 20px;
  height: 14px;
  border-radius: 999px;
  border: 1px solid rgba(123, 176, 244, 0.38);
  background: rgba(8, 16, 34, 0.9);
  overflow: hidden;
}

.ws-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #2798f5, #5fd3f8);
  box-shadow: 0 0 12px rgba(108, 196, 255, 0.7);
  transition: width 0.25s ease;
}

.ws-combo-wrap {
  width: min(95%, 980px);
  margin: 6px auto 0;
  height: 72px;
  position: relative;
}

.ws-combo-bg {
  width: 170px;
  height: auto;
  margin-left: 10px;
}

.ws-combo-text {
  position: absolute;
  left: 98px;
  top: 24px;
  color: #ffe5b1;
  font-size: 29px;
  font-weight: 800;
  text-shadow: 0 0 10px rgba(255, 160, 70, 0.9);
}

.ws-combo-wrap.is-hidden {
  opacity: 0;
  pointer-events: none;
}

.ws-stake-zone {
  width: min(92%, 920px);
  margin: 76px auto 0;
  height: 560px;
}

.ws-stake-main {
  position: absolute;
  left: 50%;
  bottom: 10px;
  transform: translateX(-50%);
  width: 640px;
}

.ws-word-row {
  position: absolute;
  left: 50%;
  bottom: 414px;
  transform: translateX(-50%);
  width: min(64vw, 230px);
  height: 88px;
}

.ws-word {
  width: 100%;
  max-width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: clamp(17px, 2vw, 24px);
  line-height: 1.06;
  font-weight: 700;
  color: #fff1cf;
  text-shadow: 0 4px 0 rgba(0, 0, 0, 0.32);
  overflow-wrap: anywhere;
  white-space: normal;
  word-break: break-word;
  overflow: hidden;
  box-sizing: border-box;
}

.ws-word.is-medium {
  font-size: clamp(14px, 1.8vw, 21px);
}

.ws-word.is-long {
  font-size: clamp(12px, 1.6vw, 17px);
}

.ws-word.is-xlong {
  font-size: clamp(11px, 1.3vw, 15px);
  line-height: 1.08;
}

.ws-speaker-btn {
  position: absolute;
  top: 50%;
  right: -52px;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid rgba(248, 221, 171, 0.9);
  background: rgba(10, 24, 54, 0.88);
  color: #ffe4b3;
  font-size: 20px;
  cursor: pointer;
}

.ws-hit-fx {
  position: absolute;
  right: 162px;
  bottom: 128px;
  width: 132px;
}

.ws-options {
  width: min(96%, 1140px);
  margin: -72px auto 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: clamp(12px, 1.5vw, 20px);
}

.ws-option-btn {
  position: relative;
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
  display: flex;
  justify-content: center;
}

.ws-option-btn:disabled {
  cursor: not-allowed;
}

.ws-option-board {
  width: min(100%, 460px);
  display: block;
  margin: 0 auto;
}

.ws-option-btn.wrong .ws-option-board {
  filter: hue-rotate(325deg) saturate(1.65) brightness(0.88) contrast(1.06);
}

.ws-option-index {
  position: absolute;
  top: 19.2%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff8d9;
  font-size: clamp(18px, 1.2vw, 24px);
  font-weight: 800;
  line-height: 1;
  text-shadow: 0 1px 2px rgba(39, 19, 2, 0.9);
  pointer-events: none;
}

.ws-option-text {
  position: absolute;
  left: 50%;
  top: 39.5%;
  transform: translate(-50%, -50%);
  width: 62%;
  height: 42%;
  padding: 0 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #3a230f;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0;
  writing-mode: horizontal-tb;
  text-orientation: mixed;
  white-space: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
  overflow: hidden;
  pointer-events: none;
  box-sizing: border-box;
}

.ws-option-text.is-medium {
  font-size: 19px;
}

.ws-option-text.is-long {
  width: 64%;
  font-size: 15px;
  line-height: 1.14;
}

.ws-option-text.is-xlong {
  width: 66%;
  font-size: 13px;
  line-height: 1.12;
}

@media (max-width: 900px) {
  .vocab-arena {
    min-height: 100vh;
  }

  .ws-top {
    padding: 10px 8px 0;
  }

  .ws-nav-btn {
    width: 56px;
    height: 56px;
  }

  .ws-title {
    width: min(78vw, 410px);
  }

  .ws-progress-wrap {
    margin-top: 2px;
    width: 97%;
    height: 86px;
  }

  .ws-progress-level {
    left: 14px;
    top: 12px;
    font-size: 14px;
  }

  .ws-progress-text {
    top: 12px;
    font-size: 15px;
  }

  .ws-progress-track {
    left: 14px;
    right: 14px;
    bottom: 12px;
    height: 10px;
  }

  .ws-combo-wrap {
    height: 44px;
    margin-top: 6px;
  }

  .ws-combo-bg {
    width: 108px;
    margin-left: 4px;
  }

  .ws-combo-text {
    left: 64px;
    top: 12px;
    font-size: 18px;
  }

  .ws-stake-zone {
    margin-top: 58px;
    height: 420px;
  }

  .ws-stake-main {
    bottom: 6px;
    width: 440px;
  }

  .ws-word-row {
    bottom: 280px;
    width: min(72vw, 170px);
    height: 62px;
  }

  .ws-word {
    font-size: clamp(13px, 2.8vw, 17px);
  }

  .ws-word.is-medium {
    font-size: clamp(11px, 2.4vw, 14px);
  }

  .ws-word.is-long {
    font-size: clamp(9px, 2.1vw, 12px);
  }

  .ws-word.is-xlong {
    font-size: clamp(8px, 1.8vw, 10px);
  }

  .ws-speaker-btn {
    right: -38px;
    width: 26px;
    height: 26px;
    font-size: 13px;
  }

  .ws-hit-fx {
    right: 14px;
    bottom: 96px;
    width: 88px;
  }

  .ws-options {
    margin-top: -52px;
    gap: 8px;
  }

  .ws-option-index {
    top: 19.4%;
    font-size: 15px;
  }

  .ws-option-text {
    top: 39.5%;
    width: 63%;
    height: 42%;
    font-size: 15px;
    letter-spacing: 0;
  }

  .ws-option-text.is-medium {
    font-size: 13px;
  }

  .ws-option-text.is-long {
    width: 65%;
    font-size: 11px;
  }

  .ws-option-text.is-xlong {
    width: 66%;
    font-size: 10px;
  }

}
</style>

