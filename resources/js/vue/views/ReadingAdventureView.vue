<template>
  <div class="cangjing-page" :style="{ backgroundImage: `url(${bgImage})` }">
    <div class="cangjing-shell">
      <template v-if="stage === 'lobby'">
        <div class="lobby-card" :style="{ backgroundImage: `url(${bgImage})` }">
          <div class="lobby-mask"></div>
          <div class="lobby-content">
            <div class="lobby-title">准备进入经文机关</div>
            <div class="lobby-meta">当前境界：{{ currentRealmLabel }}</div>
            <div class="lobby-meta">当前关卡：{{ currentLevel.levelId }}（{{ currentLevel.index + 1 }}/{{ currentLevel.total }}）</div>
            <div class="lobby-meta">本关题数：{{ totalCount }} ｜ 消耗灵力：{{ spiritCost }} ｜ 当前灵力：{{ currentSpirit }}</div>
            <div class="lobby-actions">
              <el-button type="primary" @click="startMechanism">进入机关</el-button>
              <el-button @click="backHall">返回大厅</el-button>
            </div>
          </div>
        </div>
      </template>

      <template v-else-if="stage === 'answer' && currentQuestion">
        <div class="mechanism-stage" :style="{ backgroundImage: `url(${bgImage})` }">
          <div class="stage-mask"></div>
          <div class="stage-content">
            <div class="stage-top">
              <button class="icon-btn" type="button" @click="cancelChallenge" title="返回关卡">
                <img :src="backIcon" alt="返回" />
              </button>
              <div class="stage-title">藏经阁·经文机关</div>
              <div class="stage-realm">{{ currentRealmLabel }}</div>
            </div>

            <div class="lock-panel">
              <div class="lock-title">机关锁 {{ solvedCount }}/{{ totalCount }}</div>
              <div class="lock-track"><div class="lock-fill" :style="{ width: `${lockPercent}%` }"></div></div>
              <div class="lantern-row">
                <div
                  v-for="n in 3"
                  :key="`lamp-${n}`"
                  class="lantern"
                  :class="{ unlocked: n <= unlockedLampCount }"
                >
                  <span>{{ n <= unlockedLampCount ? '已解锁' : '待解锁' }}</span>
                </div>
              </div>
            </div>

            <div class="scroll-panel">
              <div class="scroll-title">经文探秘</div>
              <div class="scroll-text">{{ passageText }}</div>
            </div>

            <div class="question-panel" :style="{ backgroundImage: `url(${questionIcon})` }">
              <div class="question-head">真伪灵签 {{ currentQuestionIndex + 1 }}/{{ totalCount }}</div>
              <div class="question-stem">{{ currentQuestionStem }}</div>
              <div class="question-claim">命题：{{ currentClaimText }}</div>
            </div>

            <div class="judge-panel" :style="{ backgroundImage: `url(${optionIcon})` }">
              <button
                class="judge-btn judge-true"
                :class="{ selected: currentChoice === 'T' }"
                type="button"
                @click="selectJudge('T')"
              >T 正确</button>
              <button
                class="judge-btn judge-false"
                :class="{ selected: currentChoice === 'F' }"
                type="button"
                @click="selectJudge('F')"
              >F 错误</button>
            </div>

            <div class="feedback-panel" :class="{ good: currentChoiceCorrect === true, bad: currentChoiceCorrect === false }">
              {{ feedbackText }}
            </div>

            <div class="nav-panel">
              <button class="nav-arrow" type="button" :disabled="currentQuestionIndex === 0" @click="prevQuestion">上一题</button>
              <div class="index-list">
                <button
                  v-for="(q, idx) in questions"
                  :key="String(q.question_id || idx)"
                  class="index-btn"
                  :class="{
                    active: idx === currentQuestionIndex,
                    done: Boolean(judgeChoices[String(q.question_id)]),
                    solved: isQuestionSolved(String(q.question_id))
                  }"
                  type="button"
                  @click="jumpTo(idx)"
                >{{ idx + 1 }}</button>
              </div>
              <button class="nav-arrow" type="button" :disabled="currentQuestionIndex >= totalCount - 1" @click="nextQuestion">下一题</button>
            </div>

            <div class="reward-strip">
              <div class="reward-item">
                <span class="label">阅读悟性</span>
                <span class="value">+{{ solvedCount * 4 }}</span>
              </div>
              <div class="reward-item">
                <span class="label">残卷修复</span>
                <span class="value">+{{ solvedCount }}</span>
              </div>
              <div class="reward-item">
                <span class="label">已收集</span>
                <span class="value">{{ currentLevel.index + 1 }}/{{ currentLevel.total }}</span>
              </div>
            </div>

            <div class="bottom-actions">
              <el-button @click="useHint" :disabled="hintCount <= 0">提示（{{ hintCount }}）</el-button>
              <el-button type="primary" @click="submitChallenge">提交本关</el-button>
              <el-button @click="cancelChallenge">退出机关</el-button>
            </div>
          </div>
        </div>
      </template>

      <template v-else-if="stage === 'result'">
        <el-result
          :icon="result.passed ? 'success' : 'warning'"
          :title="result.passed ? '机关通关' : '机关未破'"
          :sub-title="`正确率 ${result.accuracy}% ｜ 灵气 +${result.exp} ｜ 灵石 +${result.stones}`"
        >
          <template #extra>
            <el-space>
              <el-button type="primary" @click="retryLevel">再试一次</el-button>
              <el-button v-if="result.passed" @click="nextLevel">下一关</el-button>
              <el-button @click="backHall">返回大厅</el-button>
            </el-space>
          </template>
        </el-result>
      </template>
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
import bgImage from '../../../assets/images/ui/cangjingge/background.png';
import backIcon from '../../../assets/images/ui/cangjingge/back.png';
import questionIcon from '../../../assets/images/ui/cangjingge/question.png';
import optionIcon from '../../../assets/images/ui/cangjingge/options.png';

type Stage = 'lobby' | 'answer' | 'result';
type JudgeChoice = 'T' | 'F';
type LevelInfo = {
  realm: string;
  stageNo: number;
  levelId: string;
  index: number;
  total: number;
};
type OptionEntry = {
  label: string;
  value: string;
  text: string;
};
type JudgeState = {
  claimIsTrue: boolean;
  claimValue: string;
  claimText: string;
  correctValue: string;
  wrongValue: string;
};

const router = useRouter();
const api = useApiClient();
const bridge = useLegacyBridge();
const ui = useUiStore();
const user = useUserStore();

const stage = ref<Stage>('lobby');
const questions = ref<Array<Record<string, any>>>([]);
const spiritCost = ref(5);
const currentSpirit = ref(0);
const currentQuestionIndex = ref(0);
const hintCount = ref(3);
const judgeStateCache = ref<Record<string, JudgeState>>({});
const judgeChoices = reactive<Record<string, JudgeChoice>>({});
const answers = reactive<Record<string, string>>({});
const feedbackText = ref('请选择 T/F，破解本题经文机关。');

const result = ref({
  passed: false,
  accuracy: 0,
  exp: 0,
  stones: 0,
});

const currentRealmLabel = computed(() => {
  const currentRealm = String(user.profile?.current_realm || '').trim();
  if (currentRealm) return currentRealm;
  const realm = String(user.profile?.realm || 'L1').toUpperCase();
  const stageNo = Number(user.profile?.realm_stage || 1);
  return `${realm} · ${stageNo}重`;
});

const currentLevel = computed<LevelInfo>(() => getCurrentPlayableLevel());
const totalCount = computed(() => questions.value.length);
const answeredCount = computed(() => {
  return questions.value.filter((q) => Boolean(judgeChoices[String(q.question_id)])).length;
});
const solvedCount = computed(() => {
  return questions.value.filter((q) => isQuestionSolved(String(q.question_id || ''))).length;
});
const lockPercent = computed(() => {
  if (totalCount.value <= 0) return 0;
  return Math.round((solvedCount.value / totalCount.value) * 100);
});
const unlockedLampCount = computed(() => {
  if (totalCount.value <= 0) return 0;
  return Math.min(3, Math.max(0, Math.ceil((solvedCount.value / totalCount.value) * 3)));
});
const currentQuestion = computed(() => questions.value[currentQuestionIndex.value] || null);
const currentQuestionId = computed(() => String(currentQuestion.value?.question_id || ''));
const currentChoice = computed(() => judgeChoices[currentQuestionId.value] || '');
const currentChoiceCorrect = computed<boolean | null>(() => {
  const qid = currentQuestionId.value;
  if (!qid || !judgeChoices[qid]) return null;
  return isQuestionSolved(qid);
});
const currentQuestionStem = computed(() => String(currentQuestion.value?.question || '请判断命题真伪'));
const passageText = computed(() => getPassageText(currentQuestion.value));
const currentClaimText = computed(() => {
  const qid = currentQuestionId.value;
  if (!qid) return '';
  return getJudgeState(currentQuestion.value)?.claimText || '';
});

onMounted(async () => {
  ui.showLoading('进入藏经阁...');
  try {
    await bridge.switchToReadingScene();
    await bridge.closeLegacyPanels();
    syncProgressWithRealmFloor();
    await reloadQuestions();
  } catch {
    ElMessage.error('藏经阁加载失败');
  } finally {
    ui.hideLoading();
  }
});

onBeforeUnmount(() => {
  void bridge.closeLegacyPanels();
});

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

function progressKey() {
  return 'levelup_progress_reading';
}

function realmFloorIndex() {
  const realm = String(user.profile?.realm || 'L1').toUpperCase();
  const stageNoRaw = Number(user.profile?.realm_stage || 1);
  const stageNo = Math.min(9, Math.max(1, Number.isFinite(stageNoRaw) ? stageNoRaw : 1));
  const baseMap: Record<string, number> = { L1: 0, L2: 9, L3: 18 };
  const base = baseMap[realm] ?? 0;
  return base + stageNo - 1;
}

function syncProgressWithRealmFloor() {
  const floor = realmFloorIndex();
  const unlocked = Number(localStorage.getItem(progressKey()) || '0');
  if (floor > unlocked) {
    localStorage.setItem(progressKey(), String(floor));
  }
}

function getCurrentPlayableLevel(): LevelInfo {
  const list = levelSequence();
  const unlocked = Number(localStorage.getItem(progressKey()) || '0');
  const floor = realmFloorIndex();
  const index = Math.min(Math.max(Math.max(unlocked, floor), 0), list.length - 1);
  return {
    ...list[index],
    index,
    total: list.length,
  };
}

function unlockNextLevel(levelId: string) {
  const list = levelSequence();
  const idx = list.findIndex((it) => it.levelId === levelId);
  if (idx < 0) return;
  const unlocked = Number(localStorage.getItem(progressKey()) || '0');
  const next = Math.min(list.length - 1, idx + 1);
  if (next > unlocked) {
    localStorage.setItem(progressKey(), String(next));
  }
}

function optionEntries(options: unknown): OptionEntry[] {
  if (Array.isArray(options)) {
    if (options.length > 0 && typeof options[0] === 'object') {
      return options.map((item: any, idx: number) => ({
        label: String(item.label || String.fromCharCode(65 + idx)),
        value: String(item.value || item.label || String.fromCharCode(65 + idx)),
        text: String(item.text || item.value || ''),
      }));
    }
    return options.map((item: any, idx: number) => ({
      label: String.fromCharCode(65 + idx),
      value: String.fromCharCode(65 + idx),
      text: String(item),
    }));
  }
  if (options && typeof options === 'object') {
    return Object.keys(options as Record<string, any>).map((key) => ({
      label: key,
      value: key,
      text: String((options as Record<string, any>)[key]),
    }));
  }
  return [];
}

function normalize(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

function hashSeed(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

function fallbackWrongValue(correctValue: string) {
  const pool = ['A', 'B', 'C', 'D'];
  const found = pool.find((v) => normalize(v) !== normalize(correctValue));
  return found || 'A';
}

function getJudgeState(question: Record<string, any> | null): JudgeState | null {
  if (!question) return null;
  const qid = String(question.question_id || '');
  if (!qid) return null;
  if (judgeStateCache.value[qid]) return judgeStateCache.value[qid];

  const options = optionEntries(question.options);
  const correctRaw = String(question.correct_answer || '').trim();
  const correct = options.find((opt) => normalize(opt.value) === normalize(correctRaw)
    || normalize(opt.label) === normalize(correctRaw)
    || normalize(opt.text) === normalize(correctRaw)) || options[0] || {
      label: 'A',
      value: correctRaw || 'A',
      text: correctRaw || 'A',
    };

  const wrong = options.find((opt) => normalize(opt.value) !== normalize(correct.value)
    && normalize(opt.label) !== normalize(correct.value)) || {
      label: 'B',
      value: fallbackWrongValue(correct.value),
      text: '错误项',
    };

  const claimIsTrue = options.length > 1 ? (hashSeed(qid) % 2 === 0) : true;
  const claim = claimIsTrue ? correct : wrong;

  const state: JudgeState = {
    claimIsTrue,
    claimValue: String(claim.value),
    claimText: `${String(claim.text)} 是本题正确答案。`,
    correctValue: String(correct.value),
    wrongValue: String(wrong.value || fallbackWrongValue(String(correct.value))),
  };

  judgeStateCache.value[qid] = state;
  return state;
}

function mapJudgeToAnswer(question: Record<string, any>, choice: JudgeChoice) {
  const state = getJudgeState(question);
  if (!state) return '';
  if (choice === 'T') {
    return state.claimValue;
  }
  return state.claimIsTrue ? state.wrongValue : state.correctValue;
}

function resetRoundState() {
  Object.keys(judgeChoices).forEach((key) => delete judgeChoices[key]);
  Object.keys(answers).forEach((key) => delete answers[key]);
  judgeStateCache.value = {};
  currentQuestionIndex.value = 0;
  hintCount.value = 3;
  feedbackText.value = '请选择 T/F，破解本题经文机关。';
}

function getPassageText(question: Record<string, any> | null) {
  if (!question) return '经文尚未显现。';
  const content = String(
    question.reading_passage
    || question.passage
    || question.material
    || question.article
    || question.context
    || question.question
    || ''
  ).trim();
  if (!content) return '经文尚未显现。';
  return content;
}

function isQuestionSolved(questionId: string) {
  const choice = judgeChoices[questionId];
  if (!choice) return false;
  const question = questions.value.find((q) => String(q.question_id || '') === questionId);
  const state = getJudgeState(question || null);
  if (!state) return false;
  return state.claimIsTrue ? choice === 'T' : choice === 'F';
}

async function reloadQuestions() {
  const level = currentLevel.value;
  ui.showLoading('读取关卡...');
  try {
    const res = await api.get(`/reading/questions?level=${level.realm}&stage=${String(level.stageNo).padStart(2, '0')}`);
    if (!res?.success || !res?.data) {
      ElMessage.error(res?.message || '读取题目失败');
      return;
    }

    questions.value = Array.isArray(res.data.questions) ? res.data.questions : [];
    spiritCost.value = Number(res.data.spirit_cost || 5);
    currentSpirit.value = Number(res.data.current_spirit_power ?? user.profile?.spirit_power ?? 0);
    user.updateProfile({ spirit_power: currentSpirit.value });
    stage.value = 'lobby';
    result.value = { passed: false, accuracy: 0, exp: 0, stones: 0 };
    resetRoundState();
  } finally {
    ui.hideLoading();
  }
}

async function startMechanism() {
  const level = currentLevel.value;
  const consumeRes = await api.post('/user/consume-spirit', {
    amount: spiritCost.value,
    reason: `reading:${level.levelId}`,
  });

  if (Number.isFinite(Number(consumeRes?.data?.current_spirit_power))) {
    currentSpirit.value = Number(consumeRes.data.current_spirit_power);
    user.updateProfile({ spirit_power: currentSpirit.value });
  }

  if (!consumeRes?.success) {
    ElMessage.error(consumeRes?.message || '灵力不足，无法闯关');
    return;
  }

  stage.value = 'answer';
  feedbackText.value = '请选择 T/F，破解本题经文机关。';
}

function selectJudge(choice: JudgeChoice) {
  const q = currentQuestion.value;
  if (!q) return;
  const qid = String(q.question_id || '');
  if (!qid) return;

  judgeChoices[qid] = choice;
  answers[qid] = mapJudgeToAnswer(q, choice);
  const correct = isQuestionSolved(qid);
  feedbackText.value = correct
    ? '回答正确！机关锁 +1，原文线索完全匹配。'
    : '回答有误，请回看经文线索再判断。';
}

function prevQuestion() {
  currentQuestionIndex.value = Math.max(0, currentQuestionIndex.value - 1);
  feedbackText.value = '请选择 T/F，破解本题经文机关。';
}

function nextQuestion() {
  currentQuestionIndex.value = Math.min(totalCount.value - 1, currentQuestionIndex.value + 1);
  feedbackText.value = '请选择 T/F，破解本题经文机关。';
}

function jumpTo(index: number) {
  currentQuestionIndex.value = Math.max(0, Math.min(totalCount.value - 1, index));
  feedbackText.value = '请选择 T/F，破解本题经文机关。';
}

function useHint() {
  if (hintCount.value <= 0) {
    ElMessage.warning('提示次数已用尽');
    return;
  }
  const state = getJudgeState(currentQuestion.value);
  if (!state) return;
  hintCount.value -= 1;
  const hint = state.claimIsTrue
    ? '提示：该命题与经文线索一致。'
    : `提示：命题并非正确答案，留意正确选项方向。`;
  feedbackText.value = hint;
}

async function submitChallenge() {
  if (questions.value.length === 0) {
    ElMessage.warning('当前关卡暂无题目');
    return;
  }
  if (questions.value.some((q) => !judgeChoices[String(q.question_id || '')])) {
    ElMessage.warning('请完成全部题目后再提交');
    return;
  }

  const level = currentLevel.value;
  ui.showLoading('结算中...');
  try {
    const payload = {
      level: level.realm,
      stage: String(level.stageNo).padStart(2, '0'),
      answers: questions.value.map((q) => ({
        question_id: String(q.question_id),
        answer: String(answers[String(q.question_id)] || ''),
        mode: 'choice',
      })),
    };

    const res = await api.post('/reading/submit-batch', payload);
    if (!res?.success) {
      ElMessage.error(res?.message || '提交失败');
      return;
    }

    const data = res.data || {};
    result.value = {
      passed: Boolean(data.passed),
      accuracy: Number(data.accuracy || 0),
      exp: Number(data.total_exp ?? data.exp_gained ?? 0),
      stones: Number(data.stones_gained || 0),
    };

    user.updateProfile({
      exp: Number(user.profile?.exp || 0) + result.value.exp,
      spirit_stone: Number(user.profile?.spirit_stone || 0) + result.value.stones,
      spirit_power: currentSpirit.value,
    });

    if (result.value.passed) {
      unlockNextLevel(level.levelId);
    }

    stage.value = 'result';
  } finally {
    ui.hideLoading();
  }
}

function cancelChallenge() {
  stage.value = 'lobby';
  feedbackText.value = '请选择 T/F，破解本题经文机关。';
}

async function retryLevel() {
  await reloadQuestions();
}

async function nextLevel() {
  syncProgressWithRealmFloor();
  await reloadQuestions();
}

function backHall() {
  void bridge.closeLegacyPanels();
  router.push('/hall');
}
</script>

<style scoped>
.cangjing-page {
  min-height: 100vh;
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
  padding: 10px;
}

.cangjing-shell {
  min-height: calc(100vh - 20px);
  padding: 10px;
  overflow: hidden;
  border: 1px solid rgba(212, 168, 67, 0.4);
  background: rgba(4, 10, 22, 0.42);
  backdrop-filter: blur(2px);
}

.lobby-card {
  position: relative;
  border-radius: 12px;
  background-position: center;
  background-size: cover;
  min-height: 220px;
  border: 1px solid rgba(212, 168, 67, 0.35);
}

.lobby-mask {
  position: absolute;
  inset: 0;
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(8, 14, 30, 0.72), rgba(6, 10, 24, 0.86));
}

.lobby-content {
  position: relative;
  z-index: 1;
  padding: 16px;
}

.lobby-title {
  font-size: 24px;
  color: var(--gold-light);
  font-family: var(--font-title);
  margin-bottom: 8px;
}

.lobby-meta {
  color: var(--parchment-dark);
  font-size: 13px;
  line-height: 1.7;
}

.lobby-actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.mechanism-stage {
  position: relative;
  border-radius: 12px;
  background-position: center;
  background-size: cover;
  min-height: 760px;
  border: 1px solid rgba(212, 168, 67, 0.35);
}

.stage-mask {
  position: absolute;
  inset: 0;
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(5, 10, 20, 0.52), rgba(4, 8, 18, 0.75));
}

.stage-content {
  position: relative;
  z-index: 1;
  padding: 14px;
  display: grid;
  gap: 10px;
}

.stage-top {
  display: grid;
  grid-template-columns: 54px 1fr auto;
  align-items: center;
  gap: 8px;
}

.icon-btn {
  width: 54px;
  height: 54px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
}

.icon-btn img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.stage-title {
  text-align: center;
  color: #f7dc9d;
  font-size: 30px;
  letter-spacing: 2px;
  font-family: var(--font-title);
  text-shadow: 0 3px 10px rgba(0, 0, 0, 0.6);
}

.stage-realm {
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(121, 174, 245, 0.55);
  color: #bcdfff;
  font-size: 12px;
  white-space: nowrap;
  background: rgba(7, 18, 38, 0.62);
}

.lock-panel {
  border: 1px solid rgba(212, 168, 67, 0.35);
  border-radius: 12px;
  padding: 10px;
  background: rgba(7, 14, 30, 0.62);
}

.lock-title {
  color: #f7dc9d;
  font-size: 20px;
  margin-bottom: 8px;
}

.lock-track {
  height: 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  overflow: hidden;
}

.lock-fill {
  height: 100%;
  background: linear-gradient(90deg, #2be6ff, #ffe59a);
  box-shadow: 0 0 12px rgba(43, 230, 255, 0.35);
  transition: width 0.2s ease;
}

.lantern-row {
  margin-top: 8px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.lantern {
  border: 1px solid rgba(125, 140, 170, 0.52);
  border-radius: 10px;
  text-align: center;
  padding: 8px 4px;
  color: #bcc7df;
  font-size: 12px;
  background: rgba(6, 12, 24, 0.66);
}

.lantern.unlocked {
  border-color: rgba(247, 220, 157, 0.7);
  color: #ffecba;
  background: rgba(85, 64, 20, 0.38);
  box-shadow: 0 0 12px rgba(255, 220, 120, 0.26);
}

.scroll-panel {
  border: 1px solid rgba(160, 118, 56, 0.55);
  border-radius: 12px;
  padding: 12px;
  background: linear-gradient(180deg, rgba(244, 226, 188, 0.95), rgba(218, 185, 126, 0.92));
  color: #2f2212;
}

.scroll-title {
  font-size: 14px;
  color: #674720;
  margin-bottom: 6px;
  font-weight: 700;
}

.scroll-text {
  font-size: 28px;
  line-height: 1.55;
  max-height: 210px;
  overflow-y: auto;
}

.question-panel {
  border: 1px solid rgba(212, 168, 67, 0.35);
  border-radius: 12px;
  padding: 10px;
  background-color: rgba(8, 13, 28, 0.68);
  background-repeat: no-repeat;
  background-size: 138px 138px;
  background-position: right 10px top 10px;
}

.question-head {
  color: #f6d98f;
  font-size: 26px;
  font-family: var(--font-title);
}

.question-stem {
  margin-top: 8px;
  color: #ffe7b3;
  font-size: 20px;
  line-height: 1.6;
}

.question-claim {
  margin-top: 8px;
  color: #d6f1ff;
  font-size: 20px;
  line-height: 1.6;
}

.judge-panel {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 8px;
  border-radius: 12px;
  border: 1px solid rgba(212, 168, 67, 0.3);
  background-color: rgba(9, 16, 30, 0.62);
  background-repeat: no-repeat;
  background-size: cover;
}

.judge-btn {
  border: none;
  border-radius: 10px;
  min-height: 68px;
  color: #f8e9c5;
  font-size: 28px;
  font-family: var(--font-title);
  cursor: pointer;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.75);
  background: rgba(10, 18, 34, 0.65);
}

.judge-btn.selected {
  box-shadow: 0 0 0 2px rgba(255, 235, 179, 0.72), 0 0 18px rgba(255, 234, 170, 0.48);
}

.judge-true.selected {
  box-shadow: 0 0 0 2px rgba(140, 255, 184, 0.75), 0 0 16px rgba(101, 255, 164, 0.45);
}

.judge-false.selected {
  box-shadow: 0 0 0 2px rgba(255, 167, 167, 0.75), 0 0 16px rgba(255, 120, 120, 0.42);
}

.feedback-panel {
  min-height: 22px;
  border-radius: 10px;
  border: 1px solid rgba(212, 168, 67, 0.25);
  padding: 8px 10px;
  color: var(--parchment-dark);
  background: rgba(255, 255, 255, 0.04);
  font-size: 13px;
}

.feedback-panel.good {
  color: #b6f2cd;
  border-color: rgba(78, 192, 122, 0.45);
  background: rgba(78, 192, 122, 0.12);
}

.feedback-panel.bad {
  color: #ffd6d2;
  border-color: rgba(231, 76, 60, 0.45);
  background: rgba(231, 76, 60, 0.12);
}

.nav-panel {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 8px;
  align-items: center;
}

.nav-arrow {
  border: 1px solid rgba(212, 168, 67, 0.4);
  border-radius: 999px;
  color: #ffe5a8;
  background: rgba(9, 18, 36, 0.82);
  padding: 8px 12px;
  cursor: pointer;
}

.nav-arrow:disabled {
  opacity: 0.45;
  cursor: default;
}

.index-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.index-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid rgba(240, 214, 138, 0.45);
  background: rgba(7, 14, 29, 0.78);
  color: #f6e9c5;
  cursor: pointer;
}

.index-btn.done {
  border-color: rgba(121, 174, 245, 0.7);
  color: #cde6ff;
}

.index-btn.solved {
  border-color: rgba(140, 255, 184, 0.8);
  color: #9effbf;
}

.index-btn.active {
  box-shadow: 0 0 0 2px rgba(255, 225, 154, 0.6), 0 0 14px rgba(255, 225, 154, 0.4);
}

.reward-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.reward-item {
  border: 1px solid rgba(212, 168, 67, 0.25);
  border-radius: 10px;
  padding: 8px;
  text-align: center;
  background: rgba(8, 14, 28, 0.66);
}

.reward-item .label {
  display: block;
  color: var(--parchment-dark);
  font-size: 12px;
}

.reward-item .value {
  color: #7bf1ac;
  font-size: 24px;
  font-weight: 700;
}

.bottom-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

@media (max-width: 900px) {
  .stage-title {
    font-size: 22px;
  }

  .scroll-text {
    font-size: 20px;
    max-height: 160px;
  }

  .question-head {
    font-size: 20px;
  }

  .question-stem,
  .question-claim {
    font-size: 16px;
  }

  .judge-btn {
    min-height: 54px;
    font-size: 20px;
  }

  .nav-panel {
    grid-template-columns: 1fr;
  }

  .nav-arrow {
    width: 100%;
  }

  .reward-strip {
    grid-template-columns: 1fr;
  }
}
</style>
