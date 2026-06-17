<template>
  <div class="reading-page">
    <div class="rpg-reading-container">
      <!-- 顶部导航条 -->
      <div class="rpg-header">
        <div class="rpg-title">藏经阁 · 宗门秘辛</div>
        <div class="rpg-toolbar">
          <div class="level-tabs">
            <button class="level-tab" :class="{ active: level === 1 }" @click="switchLevel(1)">卷一：初窥门径</button>
            <button class="level-tab" :class="{ active: level === 2, locked: !isLevelUnlocked(2) }"
              @click="switchLevel(2)">
              卷二：迷雾重重
              <span v-if="!isLevelUnlocked(2)" class="lock-icon">🔒</span>
            </button>
          </div>
          <div class="header-actions">
            <button class="rpg-btn-sub" @click="openLegacy">前人旧录(经典)</button>
            <button class="rpg-btn-sub" @click="backHall">返回大厅</button>
          </div>
        </div>
      </div>

      <!-- 阶段：章节列表 (卷宗节点) -->
      <template v-if="stage === 'list'">
        <div class="scroll-wrapper">
          <div v-if="resumeCandidate" class="resume-alert">
            <div class="alert-icon">⚠️</div>
            <div class="alert-content">
              <div class="alert-title">神识驻留</div>
              <div class="alert-desc">检测到上次你的神识曾在此停留，是否继续？</div>
            </div>
            <div class="alert-actions">
              <button class="rpg-btn primary" @click="continueReadingProgress">继续推演</button>
              <button class="rpg-btn danger" @click="restartReadingProgress">重新入世</button>
            </div>
          </div>

          <div class="story-timeline">
            <div v-for="(chapter, index) in chapters" :key="chapter.id" class="timeline-node"
              :class="{ completed: chapter.completed }" @click="openChapter(chapter.id)">
              <div class="node-line"></div>
              <div class="node-dot"></div>
              <div class="node-content">
                <div class="node-meta">
                  <span class="node-id">{{ chapter.id }}</span>
                  <span class="node-type">{{ chapter.difficulty === 1 ? '主线' : chapter.difficulty === 2 ? '支线' : '突破'
                    }}</span>
                </div>
                <div class="node-title">{{ chapter.title }}</div>
                <div class="node-desc">{{ chapter.scene }} · 包含 {{ chapter.task_count }} 重推演</div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- 阶段：入阁确认 -->
      <template v-else-if="stage === 'confirm' && chapterDetail">
        <div class="confirm-overlay">
          <div class="confirm-box">
            <div class="confirm-title">即将神游太虚</div>
            <div class="confirm-info">
              <div class="info-item"><span>卷宗：</span><span>{{ chapterDetail.title }}</span></div>
              <div class="info-item"><span>幻境：</span><span>{{ chapterDetail.scene }}</span></div>
              <div class="info-item"><span>神识消耗：</span><span class="cost">{{ spiritCost }} 点灵力</span></div>
              <div class="info-item"><span>当前灵力：</span><span>{{ currentSpirit }}</span></div>
            </div>
            <div class="confirm-actions">
              <button class="rpg-btn primary large" @click="confirmStart">注入灵力，开启幻境</button>
              <button class="rpg-btn" @click="cancelChapter">收回神识</button>
            </div>
          </div>
        </div>
      </template>

      <!-- 阶段：沉浸阅读与推演 -->
      <template v-else-if="stage === 'answer' && chapterDetail">
        <div class="story-reader">
          <div class="reader-header">
            <span class="reader-id">{{ chapterDetail.id }}</span>
            <span class="reader-title">{{ chapterDetail.title }}</span>
            <span class="reader-progress">推演进度：{{ answeredTaskCount }}/{{ chapterTaskCount }}</span>
          </div>

          <div class="reader-content-wrap">
            <div class="passage-text">{{ chapterDetail.text }}</div>

            <div class="tasks-container" v-if="chapterDetail.tasks && chapterDetail.tasks.length > 0">
              <div class="tasks-title">天道考验 (阅后推演)</div>
              <div v-for="(task, idx) in chapterDetail.tasks" :key="task.id" class="task-card">
                <div class="task-q">
                  <span class="task-num">第{{ idx + 1 }}重：</span>{{ task.question }}
                  <span v-if="answers[String(task.id)]" class="task-status" :class="taskStatusType(task)">
                    {{ taskStatusText(task) }}
                  </span>
                </div>
                <div class="task-options" v-if="Array.isArray(task.options) && task.options.length > 0">
                  <label v-for="opt in task.options" :key="`${task.id}-${opt}`" class="rpg-radio">
                    <input type="radio" :value="String(opt)" v-model="answers[task.id]" />
                    <span class="radio-ui"></span>
                    <span class="radio-label">{{ String(opt) }}</span>
                  </label>
                </div>
                <input v-else type="text" class="rpg-input" v-model="answers[task.id]" placeholder="输入你的推演结果..." />
              </div>
            </div>

            <!-- 分支选项 -->
            <div class="branch-container"
              v-if="Array.isArray(chapterDetail.branch_options) && chapterDetail.branch_options.length > 0">
              <div class="branch-title">命运抉择</div>
              <div class="branch-desc">你的选择将影响天道因果，请慎重决断。</div>
              <div class="branch-options">
                <button v-for="branch in chapterDetail.branch_options" :key="branch.id" class="branch-btn"
                  :class="{ selected: selectedBranchId === branch.id }" @click="selectedBranchId = branch.id">
                  <div class="branch-label">{{ branch.label }}</div>
                  <div class="branch-hint">{{ branch.hint }}</div>
                </button>
              </div>
            </div>
          </div>

          <div class="reader-actions">
            <button class="rpg-btn primary large" @click="submitChapter">确认推演结果，勘破此局</button>
            <button class="rpg-btn" @click="cancelChapter">神识退出</button>
          </div>
        </div>
      </template>

      <!-- 阶段：心魔试炼 -->
      <template v-else-if="stage === 'demon' && demonTrialQuestions.length > 0">
        <div class="demon-overlay">
          <div class="demon-box">
            <div class="demon-title">心魔骤起</div>
            <div class="demon-desc">你在推演中动了无名业火，触发了问心之路。必须斩破心魔，方可继续前行。</div>
            <div class="demon-progress">已斩破 {{ demonAnsweredCount }}/{{ demonTrialQuestions.length }}</div>

            <div class="demon-tasks">
              <div v-for="(q, idx) in demonTrialQuestions" :key="q.question_id" class="demon-task-card">
                <div class="demon-q">{{ idx + 1 }}. {{ q.question }}</div>
                <div class="demon-options">
                  <label v-for="opt in normalizeDemonOptions(q.options)" :key="`${q.question_id}-${opt.value}`"
                    class="demon-radio">
                    <input type="radio" :value="opt.value" v-model="demonAnswers[q.question_id]" />
                    <span class="radio-ui"></span>
                    <span class="radio-label">{{ opt.label }}. {{ opt.text }}</span>
                  </label>
                </div>
              </div>
            </div>

            <div class="demon-actions">
              <button class="rpg-btn danger large" @click="submitDemonTrial">斩除心魔</button>
              <button class="rpg-btn" @click="skipDemonTrial">神识受挫，退回原境</button>
            </div>
          </div>
        </div>
      </template>

      <!-- 阶段：结算 -->
      <template v-else-if="stage === 'result' && resultData">
        <div class="result-overlay">
          <div class="result-box" :class="resultData.passed ? 'success' : 'fail'">
            <div class="result-title">{{ resultData.passed ? '勘破此局 · 顿悟' : '一叶障目 · 迷惘' }}</div>
            <div class="result-stats">
              <div class="stat-item">
                <span class="stat-label">推演完美度</span>
                <span class="stat-val">{{ resultData.accuracy || 0 }}%</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">天道反哺(灵气)</span>
                <span class="stat-val">+{{ resultData.xp_gained || 0 }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">秘境遗珍(灵石)</span>
                <span class="stat-val">+{{ resultData.spirit_stone_gained || 0 }}</span>
              </div>
            </div>
            <div class="result-actions">
              <button class="rpg-btn primary large" @click="reloadChapterList">继续历练</button>
              <button class="rpg-btn" @click="backHall">回洞府歇息</button>
            </div>
          </div>
        </div>
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
import ModuleRulesIntro from '../components/ModuleRulesIntro.vue';

type Stage = 'rules' | 'lobby' | 'answer' | 'result';
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

const stage = ref<Stage>('rules');
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

async function submitChapter() {
  if (!chapterDetail.value) return;
  if (hasMissingAnswers()) {
    ElMessage.warning('请完成全部考验后再提交');
    return;
  }
  if (Array.isArray(chapterDetail.value.branch_options) && chapterDetail.value.branch_options.length > 0 && !selectedBranchId.value) {
    ElMessage.warning('请先选择命运抉择（命盘分支）');
    return;
  }

  ui.showLoading('结算中...');
  try {
    const res = await api.post('/reading/submit-adventure', buildBaseSubmitPayload());
    if (!res?.success || !res?.data) {
      ElMessage.error(res?.message || '提交失败');
      return;
    }

    if (res.data.need_demon_trial) {
      demonTrialQuestions.value = Array.isArray(res.data.demon_trial_questions) ? res.data.demon_trial_questions : [];
      demonTrialQuestions.value.forEach((q) => {
        demonAnswers[String(q.question_id)] = '';
      });
      stage.value = 'demon';
      return;
    }

    applySubmitResult(res.data);
  } finally {
    ui.hideLoading();
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

function taskStatusText(task: Record<string, any>) {
  const value = answers[String(task.id)];
  if (!value) return '未推演';
  return isTaskAnswerCorrect(task, value) ? '推演正确' : '可再推敲';
}

async function submitDemonTrial() {
  const missing = demonTrialQuestions.value.some((q) => !String(demonAnswers[String(q.question_id)] || '').trim());
  if (missing) {
    ElMessage.warning('请完成全部心魔考验后再提交');
    return;
  }

  ui.showLoading('问心判定中...');
  try {
    const payload = {
      ...buildBaseSubmitPayload(),
      demon_trial_answers: demonTrialQuestions.value.map((q) => ({
        question_id: String(q.question_id),
        answer: String(demonAnswers[String(q.question_id)] || ''),
      })),
    };

    const res = await api.post('/reading/submit-adventure', payload);
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
  if (totalCount.value <= 0) {
    ElMessage.warning('当前境界暂无阅读题目');
    return;
  }
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
.reading-page {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(10, 12, 18, 0.85);
  backdrop-filter: blur(10px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 50;
  font-family: 'Ma Shan Zheng', 'STXingkai', 'KaiTi', serif;
  color: #e2e8f0;
}

.rpg-reading-container {
  width: 90%;
  max-width: 1000px;
  height: 85%;
  background: linear-gradient(180deg, #161b24 0%, #0d1117 100%);
  border: 2px solid #d4a843;
  border-radius: 12px;
  box-shadow: 0 0 40px rgba(212, 168, 67, 0.2), inset 0 0 20px rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

/* 顶部栏 */
.rpg-header {
  padding: 16px 24px;
  border-bottom: 1px solid rgba(212, 168, 67, 0.3);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(0, 0, 0, 0.4);
}

.rpg-title {
  font-size: 24px;
  color: #fceea7;
  font-weight: bold;
  letter-spacing: 2px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
}

.rpg-toolbar {
  display: flex;
  gap: 20px;
  align-items: center;
}

.level-tabs {
  display: flex;
  gap: 8px;
}

.level-tab {
  background: transparent;
  border: 1px solid rgba(212, 168, 67, 0.5);
  color: #a3b8cc;
  padding: 6px 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

.level-tab.active {
  background: rgba(212, 168, 67, 0.2);
  color: #fceea7;
  border-color: #d4a843;
  box-shadow: 0 0 10px rgba(212, 168, 67, 0.2);
}

.level-tab.locked {
  opacity: 0.5;
  cursor: not-allowed;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.rpg-btn-sub {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #cbd5e1;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
}

.rpg-btn-sub:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* 通用按钮 */
.rpg-btn {
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid #475569;
  color: #e2e8f0;
  padding: 8px 24px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.3s;
  letter-spacing: 1px;
}

.rpg-btn:hover {
  background: rgba(51, 65, 85, 0.8);
  border-color: #64748b;
}

.rpg-btn.primary {
  background: rgba(212, 168, 67, 0.15);
  border-color: #d4a843;
  color: #fceea7;
}

.rpg-btn.primary:hover {
  background: rgba(212, 168, 67, 0.3);
  box-shadow: 0 0 15px rgba(212, 168, 67, 0.4);
}

.rpg-btn.danger {
  background: rgba(220, 38, 38, 0.15);
  border-color: #ef4444;
  color: #fca5a5;
}

.rpg-btn.danger:hover {
  background: rgba(220, 38, 38, 0.3);
}

.rpg-btn.large {
  padding: 12px 36px;
  font-size: 18px;
}

/* 滚动区 */
.scroll-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 30px;
}

.scroll-wrapper::-webkit-scrollbar {
  width: 6px;
}

.scroll-wrapper::-webkit-scrollbar-thumb {
  background: rgba(212, 168, 67, 0.3);
  border-radius: 3px;
}

/* 时间线列表 */
.story-timeline {
  display: flex;
  flex-direction: column;
  gap: 0;
  max-width: 600px;
  margin: 0 auto;
}

.timeline-node {
  position: relative;
  padding: 20px 0 20px 40px;
  cursor: pointer;
  transition: transform 0.3s;
}

.timeline-node:hover {
  transform: translateX(10px);
}

.node-line {
  position: absolute;
  left: 10px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: rgba(212, 168, 67, 0.2);
}

.timeline-node:first-child .node-line {
  top: 20px;
}

.timeline-node:last-child .node-line {
  bottom: auto;
  height: 20px;
}

.node-dot {
  position: absolute;
  left: 6px;
  top: 30px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #1e293b;
  border: 2px solid #d4a843;
  box-shadow: 0 0 8px rgba(212, 168, 67, 0.5);
}

.timeline-node.completed .node-dot {
  background: #d4a843;
}

.node-content {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 16px 20px;
  transition: all 0.3s;
}

.timeline-node:hover .node-content {
  background: rgba(212, 168, 67, 0.05);
  border-color: rgba(212, 168, 67, 0.3);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

.node-meta {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
  font-size: 14px;
}

.node-id {
  color: #d4a843;
}

.node-type {
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.node-title {
  font-size: 20px;
  color: #f8fafc;
  margin-bottom: 8px;
  font-weight: bold;
}

.node-desc {
  font-size: 14px;
  color: #cbd5e1;
}

/* 弹窗覆层 (确认 / 心魔 / 结算) */
.confirm-overlay,
.demon-overlay,
.result-overlay {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.confirm-box,
.demon-box,
.result-box {
  background: rgba(15, 20, 30, 0.95);
  border: 1px solid #d4a843;
  padding: 40px;
  border-radius: 12px;
  text-align: center;
  max-width: 500px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
}

.confirm-title,
.demon-title,
.result-title {
  font-size: 28px;
  color: #fceea7;
  margin-bottom: 24px;
  font-weight: bold;
}

.confirm-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 30px;
  text-align: left;
  background: rgba(0, 0, 0, 0.3);
  padding: 20px;
  border-radius: 8px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  font-size: 16px;
}

.info-item .cost {
  color: #ef4444;
  font-weight: bold;
}

.confirm-actions,
.demon-actions,
.result-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
}

/* 沉浸阅读区 */
.story-reader {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.reader-header {
  padding: 12px 24px;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  gap: 16px;
  border-bottom: 1px dashed rgba(212, 168, 67, 0.3);
}

.reader-id {
  color: #d4a843;
  font-weight: bold;
}

.reader-title {
  font-size: 18px;
  color: #f8fafc;
  flex: 1;
}

.reader-progress {
  color: #94a3b8;
  font-size: 14px;
}

.reader-content-wrap {
  flex: 1;
  overflow-y: auto;
  padding: 40px;
}

.reader-content-wrap::-webkit-scrollbar {
  width: 6px;
}

.reader-content-wrap::-webkit-scrollbar-thumb {
  background: rgba(212, 168, 67, 0.3);
  border-radius: 3px;
}

.passage-text {
  font-size: 20px;
  line-height: 2;
  color: #e2e8f0;
  text-indent: 2em;
  margin-bottom: 40px;
  font-family: 'STSong', 'SimSun', serif;
}

/* 天道考验区 */
.tasks-container {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 30px;
  margin-bottom: 40px;
}

.tasks-title {
  text-align: center;
  font-size: 22px;
  color: #d4a843;
  margin-bottom: 24px;
  position: relative;
}

.tasks-title::before,
.tasks-title::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 30%;
  height: 1px;
  background: rgba(212, 168, 67, 0.3);
}

.tasks-title::before {
  left: 0;
}

.tasks-title::after {
  right: 0;
}

.task-card {
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.1);
}

.task-card:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.task-q {
  font-size: 18px;
  margin-bottom: 16px;
  color: #f8fafc;
}

.task-num {
  color: #94a3b8;
}

.task-status {
  margin-left: 10px;
  font-size: 14px;
  padding: 2px 8px;
  border-radius: 4px;
}

.task-status.success {
  background: rgba(34, 197, 94, 0.2);
  color: #4ade80;
}

.task-status.danger {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
}

.task-status.info {
  background: rgba(148, 163, 184, 0.2);
  color: #94a3b8;
}

.rpg-radio {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  cursor: pointer;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid transparent;
  border-radius: 6px;
  transition: all 0.2s;
}

.rpg-radio:hover {
  background: rgba(255, 255, 255, 0.08);
}

.rpg-radio input {
  display: none;
}

.rpg-radio .radio-ui {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid #64748b;
  position: relative;
}

.rpg-radio input:checked+.radio-ui {
  border-color: #d4a843;
}

.rpg-radio input:checked+.radio-ui::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  right: 3px;
  bottom: 3px;
  background: #d4a843;
  border-radius: 50%;
}

.rpg-radio input:checked~.radio-label {
  color: #fceea7;
}

.radio-label {
  font-size: 16px;
  color: #cbd5e1;
}

.rpg-input {
  width: 100%;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid #475569;
  color: #f8fafc;
  padding: 12px 16px;
  font-size: 16px;
  border-radius: 6px;
  outline: none;
}

.rpg-input:focus {
  border-color: #d4a843;
  box-shadow: 0 0 10px rgba(212, 168, 67, 0.2);
}

/* 分支抉择 */
.branch-container {
  text-align: center;
  margin-top: 40px;
  padding-top: 40px;
  border-top: 1px solid rgba(212, 168, 67, 0.3);
}

.branch-title {
  font-size: 28px;
  color: #fceea7;
  margin-bottom: 8px;
  font-weight: bold;
}

.branch-desc {
  color: #94a3b8;
  margin-bottom: 30px;
}

.branch-options {
  display: flex;
  gap: 20px;
  justify-content: center;
  flex-wrap: wrap;
}

.branch-btn {
  background: rgba(15, 23, 42, 0.8);
  border: 2px solid #334155;
  padding: 20px 40px;
  border-radius: 8px;
  cursor: pointer;
  min-width: 250px;
  transition: all 0.3s;
}

.branch-btn:hover {
  background: rgba(30, 41, 59, 0.9);
  border-color: #64748b;
  transform: translateY(-5px);
}

.branch-btn.selected {
  background: rgba(212, 168, 67, 0.1);
  border-color: #d4a843;
  box-shadow: 0 0 20px rgba(212, 168, 67, 0.3);
}

.branch-label {
  font-size: 20px;
  color: #f8fafc;
  font-weight: bold;
  margin-bottom: 8px;
}

.branch-hint {
  font-size: 14px;
  color: #cbd5e1;
}

.reader-actions {
  padding: 20px;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  gap: 20px;
  border-top: 1px solid rgba(212, 168, 67, 0.3);
}

/* 心魔区 */
.demon-box {
  border-color: #ef4444;
  box-shadow: 0 10px 40px rgba(239, 68, 68, 0.3);
}

.demon-title {
  color: #fca5a5;
}

.demon-desc {
  color: #cbd5e1;
  margin-bottom: 20px;
}

.demon-progress {
  color: #ef4444;
  margin-bottom: 20px;
  font-weight: bold;
}

.demon-tasks {
  text-align: left;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 10px;
  margin-bottom: 30px;
}

.demon-q {
  font-size: 18px;
  color: #f8fafc;
  margin-bottom: 12px;
}

.demon-radio input:checked+.radio-ui {
  border-color: #ef4444;
}

.demon-radio input:checked+.radio-ui::after {
  background: #ef4444;
}

.demon-radio input:checked~.radio-label {
  color: #fca5a5;
}

/* 结算区 */
.result-box.success {
  border-color: #4ade80;
  box-shadow: 0 10px 40px rgba(34, 197, 94, 0.2);
}

.result-box.fail {
  border-color: #f87171;
  box-shadow: 0 10px 40px rgba(239, 68, 68, 0.2);
}

.result-stats {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 30px;
  background: rgba(0, 0, 0, 0.3);
  padding: 20px;
  border-radius: 8px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  font-size: 18px;
}

.stat-label {
  color: #94a3b8;
}

.stat-val {
  color: #fceea7;
  font-weight: bold;
  font-family: monospace;
  font-size: 20px;
}
</style>
