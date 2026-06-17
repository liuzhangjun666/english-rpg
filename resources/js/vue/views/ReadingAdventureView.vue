<template>
  <div class="reading-page">
    <div class="rpg-reading-container">
      <!-- 顶部导航条 -->
      <div class="rpg-header">
        <div class="rpg-title">藏经阁 · 宗门秘辛</div>
        <div class="rpg-toolbar">
          <div class="level-tabs">
            <button class="level-tab" :class="{ active: level === 1 }" @click="switchLevel(1)">卷一：初窥门径</button>
            <button class="level-tab" :class="{ active: level === 2, locked: !isLevelUnlocked(2) }" @click="switchLevel(2)">
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
            <div
              v-for="(chapter, index) in chapters"
              :key="chapter.id"
              class="timeline-node"
              :class="{ completed: chapter.completed }"
              @click="openChapter(chapter.id)"
            >
              <div class="node-line"></div>
              <div class="node-dot"></div>
              <div class="node-content">
                <div class="node-meta">
                  <span class="node-id">{{ chapter.id }}</span>
                  <span class="node-type">{{ chapter.difficulty === 1 ? '主线' : chapter.difficulty === 2 ? '支线' : '突破' }}</span>
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
            <div class="branch-container" v-if="Array.isArray(chapterDetail.branch_options) && chapterDetail.branch_options.length > 0">
              <div class="branch-title">命运抉择</div>
              <div class="branch-desc">你的选择将影响天道因果，请慎重决断。</div>
              <div class="branch-options">
                <button 
                  v-for="branch in chapterDetail.branch_options" 
                  :key="branch.id" 
                  class="branch-btn"
                  :class="{ selected: selectedBranchId === branch.id }"
                  @click="selectedBranchId = branch.id"
                >
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
                  <label v-for="opt in normalizeDemonOptions(q.options)" :key="`${q.question_id}-${opt.value}`" class="demon-radio">
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
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useApiClient } from '../services/api';
import { useLegacyBridge } from '../composables/useLegacyBridge';
import { useUiStore } from '../stores/ui';
import { useUserStore } from '../stores/user';
import { useStoryStore } from '../stores/story';

type ChapterSummary = Record<string, any>;
type ChapterDetail = Record<string, any> | null;
type ReadingStage = 'list' | 'confirm' | 'answer' | 'demon' | 'result';
type ReadingSession = {
  level: number;
  stage: ReadingStage;
  chapterDetail: Record<string, any> | null;
  spiritCost: number;
  currentSpirit: number;
  selectedBranchId: string;
  answers: Record<string, string>;
  demonTrialQuestions: Array<Record<string, any>>;
  demonAnswers: Record<string, string>;
};

const router = useRouter();
const api = useApiClient();
const bridge = useLegacyBridge();
const ui = useUiStore();
const user = useUserStore();
const story = useStoryStore();

const stage = ref<ReadingStage>('list');
const level = ref(1);
const unlockedLevels = ref<Record<string, boolean>>({ 1: true, 2: false });
const chapters = ref<ChapterSummary[]>([]);
const chapterDetail = ref<ChapterDetail>(null);
const spiritCost = ref(5);
const currentSpirit = ref(0);
const selectedBranchId = ref('');
const resultData = ref<Record<string, any> | null>(null);
const demonTrialQuestions = ref<Array<Record<string, any>>>([]);

const answers = reactive<Record<string, string>>({});
const demonAnswers = reactive<Record<string, string>>({});
const sessionRestoring = ref(false);
const resumeCandidate = ref<ReadingSession | null>(null);

const chapterTaskCount = computed(() => Array.isArray(chapterDetail.value?.tasks) ? chapterDetail.value.tasks.length : 0);
const answeredTaskCount = computed(() => {
  if (!chapterDetail.value?.tasks) return 0;
  return chapterDetail.value.tasks.filter((task: Record<string, any>) => String(answers[String(task.id)] || '').trim()).length;
});
const demonAnsweredCount = computed(() => {
  return demonTrialQuestions.value.filter((q) => String(demonAnswers[String(q.question_id)] || '').trim()).length;
});

onMounted(async () => {
  ui.showLoading('进入藏经阁...');
  try {
    await bridge.switchToReadingScene();
    await bridge.closeLegacyPanels();
    const restored = loadSession();
    const initialLevel = restored?.level || level.value;
    await loadChapters(initialLevel, true);
    if (restored) {
      resumeCandidate.value = restored;
      ElMessage.info('检测到上次藏经阁进度，请选择继续或重开');
    }
  } catch {
    ElMessage.error('藏经阁加载失败');
  } finally {
    ui.hideLoading();
  }
});

onBeforeUnmount(() => {
  void bridge.closeLegacyPanels();
});

watch(
  [stage, level, chapterDetail, selectedBranchId],
  () => {
    persistSession();
  },
  { deep: true }
);

watch(
  [answers, demonAnswers, demonTrialQuestions],
  () => {
    persistSession();
  },
  { deep: true }
);

function clearAnswerState() {
  Object.keys(answers).forEach((key) => delete answers[key]);
  Object.keys(demonAnswers).forEach((key) => delete demonAnswers[key]);
  selectedBranchId.value = '';
  demonTrialQuestions.value = [];
}

function getSessionKey() {
  const userId = user.profile?.id || 'guest';
  return `levelup_vue_reading_session_${userId}`;
}

function clearSession() {
  localStorage.removeItem(getSessionKey());
}

function persistSession() {
  if (sessionRestoring.value) return;
  if (stage.value === 'list' || stage.value === 'result') {
    clearSession();
    return;
  }
  const payload: ReadingSession = {
    level: Number(level.value || 1),
    stage: stage.value,
    chapterDetail: chapterDetail.value ? JSON.parse(JSON.stringify(chapterDetail.value)) : null,
    spiritCost: Number(spiritCost.value || 5),
    currentSpirit: Number(currentSpirit.value || 0),
    selectedBranchId: String(selectedBranchId.value || ''),
    answers: { ...answers },
    demonTrialQuestions: demonTrialQuestions.value.map((q) => ({ ...q })),
    demonAnswers: { ...demonAnswers },
  };
  localStorage.setItem(getSessionKey(), JSON.stringify(payload));
}

function loadSession(): ReadingSession | null {
  try {
    const raw = localStorage.getItem(getSessionKey());
    if (!raw) return null;
    const data = JSON.parse(raw) as ReadingSession;
    if (!data?.chapterDetail?.id) return null;
    if (!['confirm', 'answer', 'demon'].includes(data.stage)) return null;
    return data;
  } catch {
    return null;
  }
}

function restoreSession(session: ReadingSession) {
  sessionRestoring.value = true;
  try {
    stage.value = session.stage;
    level.value = Number(session.level || 1);
    chapterDetail.value = session.chapterDetail || null;
    spiritCost.value = Number(session.spiritCost || 5);
    currentSpirit.value = Number(session.currentSpirit || 0);
    clearAnswerState();
    selectedBranchId.value = String(session.selectedBranchId || '');
    Object.entries(session.answers || {}).forEach(([k, v]) => {
      answers[k] = String(v || '');
    });
    demonTrialQuestions.value = Array.isArray(session.demonTrialQuestions) ? session.demonTrialQuestions : [];
    Object.entries(session.demonAnswers || {}).forEach(([k, v]) => {
      demonAnswers[k] = String(v || '');
    });
    ElMessage.info('已恢复上次藏经阁进度');
  } finally {
    sessionRestoring.value = false;
  }
}

function isLevelUnlocked(targetLevel: number) {
  return Boolean(unlockedLevels.value[String(targetLevel)] || unlockedLevels.value[targetLevel]);
}

async function loadChapters(targetLevel: number, resetView = true) {
  ui.showLoading('读取章节...');
  try {
    const res = await api.get(`/reading/chapters?level=${targetLevel}`);
    if (!res?.success || !res?.data) {
      if (res?.code === 'LEVEL_LOCKED' && targetLevel !== 1) {
        level.value = 1;
        await loadChapters(1);
        return;
      }
      ElMessage.error(res?.message || '读取章节失败');
      return;
    }

    level.value = Number(res.data.level || targetLevel);
    unlockedLevels.value = res.data.unlocked_levels || { 1: true, 2: false };
    chapters.value = Array.isArray(res.data.chapters) ? res.data.chapters : [];
    if (resetView) {
      stage.value = 'list';
      chapterDetail.value = null;
      resultData.value = null;
      clearAnswerState();
      clearSession();
    }
  } finally {
    ui.hideLoading();
  }
}

async function switchLevel(nextLevel: number) {
  if (nextLevel === level.value) return;
  if (!isLevelUnlocked(nextLevel)) {
    ElMessage.warning('该层尚未解锁');
    return;
  }
  resumeCandidate.value = null;
  await loadChapters(nextLevel);
}

async function openChapter(chapterId: string) {
  resumeCandidate.value = null;
  ui.showLoading('读取章节内容...');
  try {
    const res = await api.get(`/reading/chapters/${chapterId}`);
    if (!res?.success || !res?.data) {
      ElMessage.error(res?.message || '读取章节失败');
      return;
    }
    chapterDetail.value = res.data;
    spiritCost.value = Number(res.data.spirit_cost || 5);
    currentSpirit.value = Number(res.data.current_spirit_power ?? user.profile?.spirit_power ?? 0);
    stage.value = 'confirm';
    resultData.value = null;
    clearAnswerState();
  } finally {
    ui.hideLoading();
  }
}

function continueReadingProgress() {
  if (!resumeCandidate.value) return;
  restoreSession(resumeCandidate.value);
  resumeCandidate.value = null;
}

async function restartReadingProgress() {
  clearSession();
  resumeCandidate.value = null;
  await loadChapters(level.value, true);
}

async function confirmStart() {
  if (!chapterDetail.value?.id) return;
  const consumeRes = await api.post('/user/consume-spirit', {
    amount: spiritCost.value,
    reason: `reading:${chapterDetail.value.id}`,
  });

  if (Number.isFinite(Number(consumeRes?.data?.current_spirit_power))) {
    const spirit = Number(consumeRes.data.current_spirit_power);
    currentSpirit.value = spirit;
    user.updateProfile({ spirit_power: spirit });
  }

  if (!consumeRes?.success) {
    ElMessage.error(consumeRes?.message || '灵力不足，无法入阁');
    return;
  }

  for (const task of chapterDetail.value.tasks || []) {
    answers[String(task.id)] = '';
  }
  stage.value = 'answer';
}

function cancelChapter() {
  chapterDetail.value = null;
  stage.value = 'list';
  clearAnswerState();
  clearSession();
}

function hasMissingAnswers() {
  if (!chapterDetail.value?.tasks) return true;
  return chapterDetail.value.tasks.some((task: Record<string, any>) => !String(answers[String(task.id)] || '').trim());
}

function buildBaseSubmitPayload() {
  return {
    chapter_id: String(chapterDetail.value?.id || ''),
    answers: (chapterDetail.value?.tasks || []).map((task: Record<string, any>) => ({
      task_id: String(task.id),
      answer: String(answers[String(task.id)] || '').trim(),
    })),
    selected_branch_id: selectedBranchId.value || undefined,
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

function normalizeDemonOptions(options: unknown) {
  if (Array.isArray(options)) {
    if (options.length > 0 && typeof options[0] === 'object') {
      return options.map((item: any, idx: number) => ({
        label: item.label || String.fromCharCode(65 + idx),
        text: String(item.text || item.value || ''),
        value: String(item.value || item.label || String.fromCharCode(65 + idx)),
      }));
    }
    return options.map((item: any, idx: number) => ({
      label: String.fromCharCode(65 + idx),
      text: String(item),
      value: String.fromCharCode(65 + idx),
    }));
  }
  if (options && typeof options === 'object') {
    return Object.keys(options as Record<string, any>).map((key) => ({
      label: key,
      text: String((options as Record<string, any>)[key]),
      value: key,
    }));
  }
  return [];
}

function normalizeValue(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

function isTaskAnswerCorrect(task: Record<string, any>, answerValue: string) {
  const answer = task?.answer;
  const value = normalizeValue(answerValue);
  if (!value) return false;
  if (Array.isArray(answer)) {
    return answer.some((item) => normalizeValue(item) === value);
  }
  return normalizeValue(answer) === value;
}

function taskStatusType(task: Record<string, any>) {
  const value = answers[String(task.id)];
  if (!value) return 'info';
  return isTaskAnswerCorrect(task, value) ? 'success' : 'danger';
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
      ElMessage.error(res?.message || '问心判定失败');
      return;
    }

    applySubmitResult(res.data);
  } finally {
    ui.hideLoading();
  }
}

async function skipDemonTrial() {
  ui.showLoading('退回常规节点...');
  try {
    const payload = {
      ...buildBaseSubmitPayload(),
      skip_demon_trial: true,
    };
    const res = await api.post('/reading/submit-adventure', payload);
    if (!res?.success || !res?.data) {
      ElMessage.error(res?.message || '提交失败');
      return;
    }
    applySubmitResult(res.data);
  } finally {
    ui.hideLoading();
  }
}

async function openLegacy() {
  ui.showLoading('切换经典藏经阁...');
  try {
    await bridge.openReadingAdventure();
  } catch {
    ElMessage.error('经典模式加载失败');
  } finally {
    ui.hideLoading();
  }
}

function applySubmitResult(data: Record<string, any>) {
  resultData.value = data;
  stage.value = 'result';
  clearSession();

  const expGain = Number(data.xp_gained || 0);
  const stoneGain = Number(data.spirit_stone_gained || 0);
  user.updateProfile({
    exp: Number(user.profile?.exp || 0) + expGain,
    spirit_stone: Number(user.profile?.spirit_stone || 0) + stoneGain,
    story_progress: data.story_progress ?? user.profile?.story_progress,
    progress_currency: data.progress_currency ?? user.profile?.progress_currency,
    current_chapter: data.story_progress?.current_chapter_id ?? user.profile?.current_chapter,
    current_node: data.selected_branch_id ?? user.profile?.current_node,
    dao_heart: Number(data.progress_currency?.daoxin ?? user.profile?.dao_heart ?? 0),
    story_keys: Number(data.progress_currency?.story_keys ?? user.profile?.story_keys ?? 0),
    unlocked_nodes: data.story_progress?.collected_nodes ?? user.profile?.unlocked_nodes,
  });

  story.setSnapshot({
    current_chapter: data.story_progress?.current_chapter_id ?? user.profile?.current_chapter,
    current_node: data.selected_branch_id ?? user.profile?.current_node,
    dao_heart: Number(data.progress_currency?.daoxin ?? user.profile?.dao_heart ?? 0),
    story_keys: Number(data.progress_currency?.story_keys ?? user.profile?.story_keys ?? 0),
    unlocked_nodes: data.story_progress?.collected_nodes ?? user.profile?.unlocked_nodes ?? [],
    story_progress: data.story_progress ?? user.profile?.story_progress,
    progress_currency: data.progress_currency ?? user.profile?.progress_currency,
  });
}

async function reloadChapterList() {
  await loadChapters(level.value);
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
  box-shadow: 0 0 40px rgba(212, 168, 67, 0.2), inset 0 0 20px rgba(0,0,0,0.8);
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
  background: rgba(0,0,0,0.4);
}

.rpg-title {
  font-size: 24px;
  color: #fceea7;
  font-weight: bold;
  letter-spacing: 2px;
  text-shadow: 0 2px 4px rgba(0,0,0,0.8);
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
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.2);
  color: #cbd5e1;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
}
.rpg-btn-sub:hover {
  background: rgba(255,255,255,0.1);
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
.rpg-btn:hover { background: rgba(51, 65, 85, 0.8); border-color: #64748b; }
.rpg-btn.primary { background: rgba(212, 168, 67, 0.15); border-color: #d4a843; color: #fceea7; }
.rpg-btn.primary:hover { background: rgba(212, 168, 67, 0.3); box-shadow: 0 0 15px rgba(212, 168, 67, 0.4); }
.rpg-btn.danger { background: rgba(220, 38, 38, 0.15); border-color: #ef4444; color: #fca5a5; }
.rpg-btn.danger:hover { background: rgba(220, 38, 38, 0.3); }
.rpg-btn.large { padding: 12px 36px; font-size: 18px; }

/* 滚动区 */
.scroll-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 30px;
}
.scroll-wrapper::-webkit-scrollbar { width: 6px; }
.scroll-wrapper::-webkit-scrollbar-thumb { background: rgba(212, 168, 67, 0.3); border-radius: 3px; }

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

.timeline-node:first-child .node-line { top: 20px; }
.timeline-node:last-child .node-line { bottom: auto; height: 20px; }

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
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px;
  padding: 16px 20px;
  transition: all 0.3s;
}

.timeline-node:hover .node-content {
  background: rgba(212, 168, 67, 0.05);
  border-color: rgba(212, 168, 67, 0.3);
  box-shadow: 0 4px 20px rgba(0,0,0,0.5);
}

.node-meta {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
  font-size: 14px;
}

.node-id { color: #d4a843; }
.node-type { color: #94a3b8; background: rgba(255,255,255,0.1); padding: 2px 8px; border-radius: 4px; font-size: 12px;}
.node-title { font-size: 20px; color: #f8fafc; margin-bottom: 8px; font-weight: bold; }
.node-desc { font-size: 14px; color: #cbd5e1; }

/* 弹窗覆层 (确认 / 心魔 / 结算) */
.confirm-overlay, .demon-overlay, .result-overlay {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.confirm-box, .demon-box, .result-box {
  background: rgba(15, 20, 30, 0.95);
  border: 1px solid #d4a843;
  padding: 40px;
  border-radius: 12px;
  text-align: center;
  max-width: 500px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.8);
}

.confirm-title, .demon-title, .result-title {
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
  background: rgba(0,0,0,0.3);
  padding: 20px;
  border-radius: 8px;
}

.info-item { display: flex; justify-content: space-between; font-size: 16px; }
.info-item .cost { color: #ef4444; font-weight: bold; }
.confirm-actions, .demon-actions, .result-actions { display: flex; gap: 16px; justify-content: center; }

/* 沉浸阅读区 */
.story-reader {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.reader-header {
  padding: 12px 24px;
  background: rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  gap: 16px;
  border-bottom: 1px dashed rgba(212, 168, 67, 0.3);
}

.reader-id { color: #d4a843; font-weight: bold; }
.reader-title { font-size: 18px; color: #f8fafc; flex: 1; }
.reader-progress { color: #94a3b8; font-size: 14px; }

.reader-content-wrap {
  flex: 1;
  overflow-y: auto;
  padding: 40px;
}
.reader-content-wrap::-webkit-scrollbar { width: 6px; }
.reader-content-wrap::-webkit-scrollbar-thumb { background: rgba(212, 168, 67, 0.3); border-radius: 3px; }

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
  background: rgba(0,0,0,0.2);
  border: 1px solid rgba(255,255,255,0.05);
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
.tasks-title::before, .tasks-title::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 30%;
  height: 1px;
  background: rgba(212, 168, 67, 0.3);
}
.tasks-title::before { left: 0; }
.tasks-title::after { right: 0; }

.task-card {
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px dashed rgba(255,255,255,0.1);
}
.task-card:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }

.task-q {
  font-size: 18px;
  margin-bottom: 16px;
  color: #f8fafc;
}

.task-num { color: #94a3b8; }
.task-status { margin-left: 10px; font-size: 14px; padding: 2px 8px; border-radius: 4px; }
.task-status.success { background: rgba(34, 197, 94, 0.2); color: #4ade80; }
.task-status.danger { background: rgba(239, 68, 68, 0.2); color: #f87171; }
.task-status.info { background: rgba(148, 163, 184, 0.2); color: #94a3b8; }

.rpg-radio {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  cursor: pointer;
  padding: 10px 16px;
  background: rgba(255,255,255,0.03);
  border: 1px solid transparent;
  border-radius: 6px;
  transition: all 0.2s;
}
.rpg-radio:hover { background: rgba(255,255,255,0.08); }
.rpg-radio input { display: none; }
.rpg-radio .radio-ui {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid #64748b;
  position: relative;
}
.rpg-radio input:checked + .radio-ui { border-color: #d4a843; }
.rpg-radio input:checked + .radio-ui::after {
  content: ''; position: absolute; top: 3px; left: 3px; right: 3px; bottom: 3px; background: #d4a843; border-radius: 50%;
}
.rpg-radio input:checked ~ .radio-label { color: #fceea7; }
.radio-label { font-size: 16px; color: #cbd5e1; }

.rpg-input {
  width: 100%;
  background: rgba(0,0,0,0.3);
  border: 1px solid #475569;
  color: #f8fafc;
  padding: 12px 16px;
  font-size: 16px;
  border-radius: 6px;
  outline: none;
}
.rpg-input:focus { border-color: #d4a843; box-shadow: 0 0 10px rgba(212, 168, 67, 0.2); }

/* 分支抉择 */
.branch-container {
  text-align: center;
  margin-top: 40px;
  padding-top: 40px;
  border-top: 1px solid rgba(212, 168, 67, 0.3);
}
.branch-title { font-size: 28px; color: #fceea7; margin-bottom: 8px; font-weight: bold; }
.branch-desc { color: #94a3b8; margin-bottom: 30px; }
.branch-options { display: flex; gap: 20px; justify-content: center; flex-wrap: wrap; }

.branch-btn {
  background: rgba(15, 23, 42, 0.8);
  border: 2px solid #334155;
  padding: 20px 40px;
  border-radius: 8px;
  cursor: pointer;
  min-width: 250px;
  transition: all 0.3s;
}
.branch-btn:hover { background: rgba(30, 41, 59, 0.9); border-color: #64748b; transform: translateY(-5px); }
.branch-btn.selected {
  background: rgba(212, 168, 67, 0.1);
  border-color: #d4a843;
  box-shadow: 0 0 20px rgba(212, 168, 67, 0.3);
}
.branch-label { font-size: 20px; color: #f8fafc; font-weight: bold; margin-bottom: 8px; }
.branch-hint { font-size: 14px; color: #cbd5e1; }

.reader-actions {
  padding: 20px;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  gap: 20px;
  border-top: 1px solid rgba(212, 168, 67, 0.3);
}

/* 心魔区 */
.demon-box { border-color: #ef4444; box-shadow: 0 10px 40px rgba(239, 68, 68, 0.3); }
.demon-title { color: #fca5a5; }
.demon-desc { color: #cbd5e1; margin-bottom: 20px; }
.demon-progress { color: #ef4444; margin-bottom: 20px; font-weight: bold; }
.demon-tasks { text-align: left; max-height: 400px; overflow-y: auto; padding-right: 10px; margin-bottom: 30px; }
.demon-q { font-size: 18px; color: #f8fafc; margin-bottom: 12px; }
.demon-radio input:checked + .radio-ui { border-color: #ef4444; }
.demon-radio input:checked + .radio-ui::after { background: #ef4444; }
.demon-radio input:checked ~ .radio-label { color: #fca5a5; }

/* 结算区 */
.result-box.success { border-color: #4ade80; box-shadow: 0 10px 40px rgba(34, 197, 94, 0.2); }
.result-box.fail { border-color: #f87171; box-shadow: 0 10px 40px rgba(239, 68, 68, 0.2); }
.result-stats { display: flex; flex-direction: column; gap: 16px; margin-bottom: 30px; background: rgba(0,0,0,0.3); padding: 20px; border-radius: 8px; }
.stat-item { display: flex; justify-content: space-between; font-size: 18px; }
.stat-label { color: #94a3b8; }
.stat-val { color: #fceea7; font-weight: bold; font-family: monospace; font-size: 20px; }
</style>
