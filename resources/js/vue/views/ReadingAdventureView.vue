<template>
  <div class="reading-page">
    <el-card class="reading-shell" shadow="hover">
      <template #header>
        <div class="card-header">藏经阁 · 剧情阅读</div>
      </template>

      <div class="reading-toolbar">
        <el-space wrap>
          <el-button :type="level === 1 ? 'primary' : 'default'" @click="switchLevel(1)">练气一层</el-button>
          <el-button :type="level === 2 ? 'primary' : 'default'" :disabled="!isLevelUnlocked(2)" @click="switchLevel(2)">练气二层</el-button>
          <el-button type="warning" plain @click="openLegacy">经典模式</el-button>
          <el-button @click="backHall">返回大厅</el-button>
        </el-space>
      </div>

      <template v-if="stage === 'list'">
        <el-alert
          v-if="resumeCandidate"
          type="warning"
          :closable="false"
          show-icon
          title="检测到上次藏经阁进度"
          description="请选择继续上次进度，或重新开始当前层章节。"
          style="margin-bottom: 10px;"
        />
        <div v-if="resumeCandidate" class="module-actions" style="margin-bottom: 12px;">
          <el-button type="primary" @click="continueReadingProgress">继续上次进度</el-button>
          <el-button type="danger" @click="restartReadingProgress">重新开始</el-button>
        </div>
        <div class="chapter-grid">
          <button
            v-for="chapter in chapters"
            :key="chapter.id"
            class="chapter-card"
            :class="{ completed: chapter.completed }"
            @click="openChapter(chapter.id)"
          >
            <div class="chapter-top">
              <span>{{ chapter.id }}</span>
              <span>{{ chapter.difficulty === 1 ? '入门' : chapter.difficulty === 2 ? '进阶' : '突破' }}</span>
            </div>
            <div class="chapter-title">{{ chapter.title }}</div>
            <div class="chapter-meta">{{ chapter.scene }} · {{ chapter.task_count }}任务</div>
          </button>
        </div>
      </template>

      <template v-else-if="stage === 'confirm' && chapterDetail">
        <el-alert
          type="warning"
          :closable="false"
          show-icon
          :title="`进入 ${chapterDetail.id} 将消耗灵力 ${spiritCost}`"
          :description="`当前灵力：${currentSpirit}`"
        />
        <div class="reading-confirm">
          <div>章节：{{ chapterDetail.title }}</div>
          <div>场景：{{ chapterDetail.scene }}</div>
          <div>任务：{{ chapterDetail.tasks?.length || 0 }} 题</div>
        </div>
        <div class="module-actions">
          <el-button type="primary" @click="confirmStart">确认入阁</el-button>
          <el-button @click="cancelChapter">返回章节列表</el-button>
        </div>
      </template>

      <template v-else-if="stage === 'answer' && chapterDetail">
        <div class="reading-answer-header">
          <el-tag type="info">{{ chapterDetail.id }}</el-tag>
          <span>{{ chapterDetail.title }}</span>
          <el-tag type="warning">已完成 {{ answeredTaskCount }}/{{ chapterTaskCount }}</el-tag>
        </div>
        <p class="reading-passage">{{ chapterDetail.text }}</p>

        <div v-for="(task, idx) in chapterDetail.tasks || []" :key="task.id" class="reading-task-block">
          <div class="reading-task-title">
            <span>{{ idx + 1 }}. {{ task.question }}</span>
            <el-tag v-if="answers[String(task.id)]" size="small" :type="taskStatusType(task)">
              {{ taskStatusText(task) }}
            </el-tag>
          </div>
          <el-radio-group
            v-if="Array.isArray(task.options) && task.options.length > 0"
            v-model="answers[task.id]"
            class="reading-option-group"
          >
            <el-radio v-for="opt in task.options" :key="`${task.id}-${opt}`" :label="String(opt)" border class="option-item">
              {{ String(opt) }}
            </el-radio>
          </el-radio-group>
          <el-input
            v-else
            v-model="answers[task.id]"
            placeholder="请输入答案"
            maxlength="200"
          />
        </div>

        <div v-if="Array.isArray(chapterDetail.branch_options) && chapterDetail.branch_options.length > 0" class="reading-branch-box">
          <div class="reading-branch-title">命盘分支（必选）</div>
          <el-radio-group v-model="selectedBranchId" class="reading-option-group">
            <el-radio v-for="branch in chapterDetail.branch_options" :key="branch.id" :label="branch.id" border class="option-item">
              {{ branch.label }}：{{ branch.hint }}
            </el-radio>
          </el-radio-group>
        </div>

        <div class="module-actions">
          <el-button type="primary" @click="submitChapter">提交本章</el-button>
          <el-button @click="cancelChapter">返回章节列表</el-button>
        </div>
      </template>

      <template v-else-if="stage === 'demon' && demonTrialQuestions.length > 0">
        <el-alert
          type="error"
          :closable="false"
          show-icon
          title="问心试炼"
          description="你触发了问心之路，请先完成心魔题再判定分支。"
        />
        <div class="reading-demon-progress">已作答 {{ demonAnsweredCount }}/{{ demonTrialQuestions.length }}</div>
        <div v-for="(q, idx) in demonTrialQuestions" :key="q.question_id" class="reading-task-block">
          <div class="reading-task-title">{{ idx + 1 }}. {{ q.question }}</div>
          <el-radio-group v-model="demonAnswers[q.question_id]" class="reading-option-group">
            <el-radio v-for="opt in normalizeDemonOptions(q.options)" :key="`${q.question_id}-${opt.value}`" :label="opt.value" border class="option-item">
              {{ opt.label }}. {{ opt.text }}
            </el-radio>
          </el-radio-group>
        </div>
        <div class="module-actions">
          <el-button type="primary" @click="submitDemonTrial">提交问心试炼</el-button>
          <el-button type="warning" plain @click="skipDemonTrial">放弃问心，退回常规节点</el-button>
        </div>
      </template>

      <template v-else-if="stage === 'result' && resultData">
        <el-result
          :icon="resultData.passed ? 'success' : 'warning'"
          :title="resultData.passed ? '阅读通关' : '继续修炼'"
          :sub-title="`正确率 ${resultData.accuracy || 0}% ｜ 灵气 +${resultData.xp_gained || 0} ｜ 灵石 +${resultData.spirit_stone_gained || 0}`"
        >
          <template #extra>
            <el-space>
              <el-button type="primary" @click="reloadChapterList">继续阅读</el-button>
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
    ElMessage.warning('请完成全部任务后再提交');
    return;
  }
  if (Array.isArray(chapterDetail.value.branch_options) && chapterDetail.value.branch_options.length > 0 && !selectedBranchId.value) {
    ElMessage.warning('请先选择命盘分支');
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
  if (!value) return '未作答';
  return isTaskAnswerCorrect(task, value) ? '推演正确' : '可再推敲';
}

async function submitDemonTrial() {
  const missing = demonTrialQuestions.value.some((q) => !String(demonAnswers[String(q.question_id)] || '').trim());
  if (missing) {
    ElMessage.warning('请完成全部心魔题后再提交');
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
