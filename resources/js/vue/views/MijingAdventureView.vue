<template>
  <div class="mijing-page">
    <el-card class="mijing-shell" shadow="hover">
      <template #header>
        <div class="card-header">
          <span>秘境试炼 · 限时挑战</span>
          <button class="mijing-close-btn" @click="backHall" title="返回大厅">✕</button>
        </div>
      </template>

      <div class="mijing-toolbar" v-if="stage === 'entry'">
        <el-space wrap>
          <el-button @click="backHall">返回大厅</el-button>
        </el-space>
      </div>

      <template v-if="stage === 'entry'">
        <el-alert
          v-if="resumeCandidate"
          type="warning"
          :closable="false"
          show-icon
          title="检测到上次秘境进度"
          description="请选择继续上次挑战，或重新开始新的限时挑战。"
          style="margin-bottom: 10px;"
        />
        <el-alert
          type="info"
          :closable="false"
          show-icon
          title="60 秒限时挑战"
          description="答题越快、连对越高，得分越高。每次挑战消耗灵力 5 点。"
        />
        <div class="mijing-entry-grid">
          <el-form-item label="试炼类型">
            <el-select v-model="entry.moduleType" placeholder="选择类型">
              <el-option label="采药识灵" value="vocab" />
              <el-option label="基础功法" value="grammar" />
              <el-option label="听风谷" value="listening" />
              <el-option label="阅读副本" value="reading" />
            </el-select>
          </el-form-item>
          <el-form-item label="境界">
            <el-input v-model="entry.level" maxlength="3" />
          </el-form-item>
          <el-form-item label="关卡">
            <el-input v-model="entry.stage" maxlength="2" />
          </el-form-item>
        </div>
        <div v-if="resumeCandidate" class="module-actions">
          <el-button type="primary" @click="continueChallenge">继续上次进度</el-button>
          <el-button type="danger" @click="restartChallenge">重新开始挑战</el-button>
        </div>
        <div v-else class="module-actions">
          <el-button type="primary" @click="startChallenge">开始限时挑战</el-button>
        </div>
      </template>

      <template v-else-if="stage === 'challenge'">
        <div class="mijing-hud">
          <div class="hud-item hud-timer" :class="{ 'hud-urgent': remainSec <= 10 }">
            <span class="hud-icon">⏳</span>
            <span class="hud-val">{{ remainSec }}s</span>
          </div>
          <div class="hud-item hud-score">
            <span class="hud-icon">✦</span>
            <span class="hud-val">{{ score }}</span>
          </div>
          <div class="hud-item hud-combo" v-if="combo > 0">
            <span class="hud-icon">🔥</span>
            <span class="hud-val">×{{ combo }}</span>
          </div>
        </div>

        <div class="mijing-quest-scroll">
          <div class="quest-ornament left">✧</div>
          <div class="quest-text">{{ currentQuestion?.stem || '正在加载题目...' }}</div>
          <div class="quest-ornament right">✧</div>
        </div>

        <div class="mijing-bottom-bar">
          <button class="mijing-settle-btn" @click="finishChallenge">提前结算</button>
        </div>
      </template>

      <template v-else-if="stage === 'result' && resultData">
        <el-result
          icon="success"
          title="限时试炼结算"
          :sub-title="`得分 ${resultData.final_score || 0} ｜ 正确率 ${resultData.accuracy || 0}%`"
        >
          <template #extra>
            <el-space>
              <el-button type="primary" @click="retry">再闯一局</el-button>
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

type Stage = 'entry' | 'challenge' | 'result';
type MijingSession = {
  stage: Stage;
  challengeId: string;
  durationSec: number;
  startedAtMs: number;
  moduleType: string;
  level: string;
  stageCode: string;
  score: number;
  combo: number;
  currentQuestion: Record<string, any> | null;
};

const router = useRouter();
const api = useApiClient();
const bridge = useLegacyBridge();
const ui = useUiStore();
const user = useUserStore();
const story = useStoryStore();

const stage = ref<Stage>('entry');
const challengeId = ref('');
const durationSec = ref(60);
const startedAtMs = ref(0);
const score = ref(0);
const combo = ref(0);
const currentQuestion = ref<Record<string, any> | null>(null);
const selectedAnswer = ref('');
const answerSubmitting = ref(false);
const finishing = ref(false);
const resultData = ref<Record<string, any> | null>(null);
const ticker = ref<number | null>(null);
const resumeCandidate = ref<MijingSession | null>(null);

const entry = reactive({
  moduleType: 'vocab',
  level: String(user.profile?.realm || 'L1').toUpperCase(),
  stage: String(user.profile?.realm_stage || 1).padStart(2, '0'),
});

const remainSec = computed(() => {
  if (!startedAtMs.value || stage.value !== 'challenge') return durationSec.value;
  const elapsed = Math.max(0, Math.floor((Date.now() - startedAtMs.value) / 1000));
  return Math.max(0, durationSec.value - elapsed);
});

const optionEntries = computed(() => normalizeOptions(currentQuestion.value?.options));

const onSceneInteract = (e: Event) => {
  const customEvent = e as CustomEvent;
  if (customEvent.detail?.action === 'answer_option') {
    const clickedValue = customEvent.detail.object?.userData?.value;
    if (clickedValue && !answerSubmitting.value && stage.value === 'challenge') {
      selectedAnswer.value = clickedValue;
      void submitAnswer();
    }
  }
};

const sync3dOptions = () => {
  if (stage.value === 'challenge' && optionEntries.value.length > 0) {
    if ((window as any).__legacyGame?.scene?.currentSceneObj?.spawnOptions) {
      try {
        const rawOptions = JSON.parse(JSON.stringify(optionEntries.value));
        (window as any).__legacyGame.scene.currentSceneObj.spawnOptions(rawOptions);
      } catch (e: any) {
        console.error('生成3D选项报错:', e);
      }
    }
  } else {
    if ((window as any).__legacyGame?.scene?.currentSceneObj?.spawnOptions) {
      (window as any).__legacyGame.scene.currentSceneObj.spawnOptions([]);
    }
  }
};

watch(
  () => optionEntries.value,
  () => {
    sync3dOptions();
  },
  { deep: true } // 去掉 immediate: true 避免场景未切换完成时执行
);

onMounted(async () => {
  window.addEventListener('scene:interact', onSceneInteract);
  ui.showLoading('进入秘境...');
  try {
    await bridge.switchToMijingScene();
    await bridge.closeLegacyPanels();
    const restored = loadSession();
    if (restored && restored.stage === 'challenge' && Date.now() - restored.startedAtMs < restored.durationSec * 1000) {
      resumeCandidate.value = restored;
      ElMessage.info('检测到上次秘境进度，请选择继续或重开');
    } else {
      clearSession();
    }
    // 场景加载完毕后，手动同步一次 3D 选项
    sync3dOptions();
  } catch {
    ElMessage.error('秘境加载失败');
  } finally {
    ui.hideLoading();
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('scene:interact', onSceneInteract);
  stopTicker();
  persistSession();
  void bridge.closeLegacyPanels();
});

function getSessionKey() {
  const uid = user.profile?.id || 'guest';
  return `levelup_vue_mijing_session_${uid}`;
}

function persistSession() {
  if (stage.value !== 'challenge' || !challengeId.value) {
    clearSession();
    return;
  }
  const payload: MijingSession = {
    stage: stage.value,
    challengeId: challengeId.value,
    durationSec: durationSec.value,
    startedAtMs: startedAtMs.value,
    moduleType: entry.moduleType,
    level: entry.level,
    stageCode: entry.stage,
    score: score.value,
    combo: combo.value,
    currentQuestion: currentQuestion.value ? { ...currentQuestion.value } : null,
  };
  localStorage.setItem(getSessionKey(), JSON.stringify(payload));
}

function clearSession() {
  localStorage.removeItem(getSessionKey());
}

function loadSession(): MijingSession | null {
  try {
    const raw = localStorage.getItem(getSessionKey());
    if (!raw) return null;
    const data = JSON.parse(raw) as MijingSession;
    if (!data?.challengeId || data.stage !== 'challenge') return null;
    return data;
  } catch {
    return null;
  }
}

function restoreSession(session: MijingSession) {
  stage.value = 'challenge';
  challengeId.value = session.challengeId;
  durationSec.value = Number(session.durationSec || 60);
  startedAtMs.value = Number(session.startedAtMs || Date.now());
  entry.moduleType = String(session.moduleType || 'vocab');
  entry.level = String(session.level || 'L1');
  entry.stage = String(session.stageCode || '01');
  score.value = Number(session.score || 0);
  combo.value = Number(session.combo || 0);
  currentQuestion.value = session.currentQuestion || null;
  selectedAnswer.value = '';
  startTicker();
  ElMessage.info('已恢复上次秘境进度');
}

async function startChallenge() {
  resumeCandidate.value = null;
  clearSession();
  ui.showLoading('正在开启秘境试炼...');
  try {
    const res = await api.post('/mijing/timed-challenge/start', {
      module_type: entry.moduleType,
      level: entry.level.trim().toUpperCase(),
      stage: entry.stage.trim().padStart(2, '0'),
    });
    if (!res?.success || !res?.data) {
      ElMessage.error(res?.message || '开启挑战失败');
      return;
    }

    challengeId.value = String(res.data.challenge_id || '');
    durationSec.value = Number(res.data.duration_sec || 60);
    startedAtMs.value = Date.parse(res.data.start_at || new Date().toISOString());
    score.value = 0;
    combo.value = 0;
    currentQuestion.value = null;
    selectedAnswer.value = '';
    resultData.value = null;
    stage.value = 'challenge';
    startTicker();
    await loadNextQuestion();
  } finally {
    ui.hideLoading();
  }
}

async function continueChallenge() {
  if (!resumeCandidate.value) return;
  restoreSession(resumeCandidate.value);
  resumeCandidate.value = null;
  if (!currentQuestion.value) {
    await loadNextQuestion();
  }
}

async function restartChallenge() {
  clearSession();
  resumeCandidate.value = null;
  await startChallenge();
}

async function loadNextQuestion() {
  if (!challengeId.value || finishing.value) return;
  if (remainSec.value <= 0) {
    await finishChallenge();
    return;
  }
  const res = await api.post('/mijing/timed-challenge/next-question', {
    challenge_id: challengeId.value,
  });
  if (!res?.success || !res?.data) {
    await finishChallenge();
    return;
  }
  currentQuestion.value = res.data;
  selectedAnswer.value = '';
  persistSession();
}

async function submitAnswer() {
  if (!challengeId.value || !currentQuestion.value || answerSubmitting.value) return;
  const answer = String(selectedAnswer.value || '').trim();
  if (!answer) {
    ElMessage.warning('请先选择答案');
    return;
  }

  answerSubmitting.value = true;
  try {
    const res = await api.post('/mijing/timed-challenge/submit-answer', {
      challenge_id: challengeId.value,
      question_id: currentQuestion.value.question_id,
      answer,
      elapsed_ms: 0,
    });
    if (!res?.success || !res?.data) {
      await finishChallenge();
      return;
    }

    const oldCombo = combo.value;
    score.value = Number(res.data.score || 0);
    combo.value = Number(res.data.combo || 0);
    
    // 如果 combo 增加，说明答对了，触发 3D 特效
    if (combo.value > oldCombo) {
      if ((window as any).__legacyGame?.scene?.currentSceneObj?.triggerCorrectEffect) {
        const clickedMesh = (window as any).__legacyGame.scene.currentSceneObj.optionsGroup?.children?.find((c: any) => c.userData.value === answer);
        (window as any).__legacyGame.scene.currentSceneObj.triggerCorrectEffect(clickedMesh);
      }
    } else {
      if ((window as any).__legacyGame?.scene?.currentSceneObj?.triggerErrorEffect) {
        (window as any).__legacyGame.scene.currentSceneObj.triggerErrorEffect();
      }
    }
    
    if ((window as any).__legacyGame?.scene?.currentSceneObj?.updateEnvironment) {
      (window as any).__legacyGame.scene.currentSceneObj.updateEnvironment(combo.value, Number(res.data.remain_sec || 0));
    }

    if (Number(res.data.remain_sec || 0) <= 0) {
      await finishChallenge();
      return;
    }
    await loadNextQuestion();
  } finally {
    answerSubmitting.value = false;
  }
}

function startTicker() {
  stopTicker();
  ticker.value = window.setInterval(() => {
    if (stage.value !== 'challenge') return;
    if (remainSec.value <= 0) {
      void finishChallenge();
      return;
    }
    persistSession();
    if ((window as any).__legacyGame?.scene?.currentSceneObj?.updateEnvironment) {
      (window as any).__legacyGame.scene.currentSceneObj.updateEnvironment(combo.value, remainSec.value);
    }
  }, 500);
}

function stopTicker() {
  if (ticker.value !== null) {
    clearInterval(ticker.value);
    ticker.value = null;
  }
}

async function finishChallenge(opts: { silent?: boolean } = {}) {
  if (!challengeId.value || finishing.value) return;
  const silent = Boolean(opts.silent);
  finishing.value = true;
  stopTicker();

  try {
    const res = await api.post('/mijing/timed-challenge/finish', {
      challenge_id: challengeId.value,
    });
    if (!res?.success || !res?.data) {
      if (!silent) ElMessage.error(res?.message || '结算失败');
      return;
    }

    challengeId.value = '';
    currentQuestion.value = null;
    selectedAnswer.value = '';
    stage.value = silent ? 'entry' : 'result';
    resultData.value = silent ? null : res.data;
    clearSession();

    const data = res.data || {};
    user.updateProfile({
      exp: Number(user.profile?.exp || 0) + Number(data.exp_gained || 0),
      spirit_stone: Number(user.profile?.spirit_stone || 0) + Number(data.points_gained || 0),
      story_progress: data.story_progress ?? user.profile?.story_progress,
      progress_currency: data.progress_currency ?? user.profile?.progress_currency,
      unlocked_nodes: data.story_progress?.collected_nodes ?? user.profile?.unlocked_nodes,
      dao_heart: Number(data.progress_currency?.daoxin ?? user.profile?.dao_heart ?? 0),
      story_keys: Number(data.progress_currency?.story_keys ?? user.profile?.story_keys ?? 0),
    });
    story.setSnapshot({
      current_chapter: data.story_progress?.current_chapter_id ?? user.profile?.current_chapter,
      current_node: user.profile?.current_node,
      dao_heart: Number(data.progress_currency?.daoxin ?? user.profile?.dao_heart ?? 0),
      story_keys: Number(data.progress_currency?.story_keys ?? user.profile?.story_keys ?? 0),
      unlocked_nodes: data.story_progress?.collected_nodes ?? user.profile?.unlocked_nodes ?? [],
      story_progress: data.story_progress ?? user.profile?.story_progress,
      progress_currency: data.progress_currency ?? user.profile?.progress_currency,
    });
  } finally {
    finishing.value = false;
  }
}

function retry() {
  stage.value = 'entry';
  resultData.value = null;
  score.value = 0;
  combo.value = 0;
}

function normalizeOptions(options: unknown) {
  if (Array.isArray(options)) {
    if (options.length && typeof options[0] === 'object') {
      return options.map((item: any, idx: number) => ({
        label: String(item.label || String.fromCharCode(65 + idx)),
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



function backHall() {
  stopTicker();
  persistSession();
  void bridge.closeLegacyPanels();
  router.push('/hall');
}
</script>

<style scoped>
/* ===== HUD 状态栏 ===== */
.mijing-hud {
  display: flex;
  justify-content: center;
  gap: 20px;
  padding: 8px 0;
  position: relative;
  z-index: 10;
}
.hud-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 18px;
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(20, 10, 40, 0.85), rgba(40, 20, 60, 0.75));
  border: 1px solid rgba(162, 155, 254, 0.4);
  box-shadow: 0 0 12px rgba(162, 155, 254, 0.15);
  font-family: 'Microsoft YaHei', sans-serif;
}
.hud-icon { font-size: 18px; }
.hud-val {
  font-size: 22px;
  font-weight: 900;
  color: #e8e4ff;
  text-shadow: 0 0 8px rgba(162, 155, 254, 0.6);
}
.hud-timer .hud-val { color: #55efc4; }
.hud-urgent .hud-val {
  color: #ff6b6b !important;
  animation: pulse-red 0.6s ease-in-out infinite alternate;
}
.hud-combo {
  border-color: rgba(255, 165, 0, 0.5);
  background: linear-gradient(135deg, rgba(60, 30, 0, 0.85), rgba(80, 40, 0, 0.7));
}
.hud-combo .hud-val { color: #ffa502; text-shadow: 0 0 10px rgba(255, 165, 0, 0.5); }

@keyframes pulse-red {
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0.6; transform: scale(1.1); }
}

/* ===== 题目卷轴 ===== */
.mijing-quest-scroll {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin: 12px auto;
  padding: 14px 28px;
  max-width: 700px;
  background: linear-gradient(135deg, rgba(15, 8, 30, 0.9), rgba(30, 15, 50, 0.85));
  border: 1px solid rgba(162, 155, 254, 0.35);
  border-radius: 12px;
  box-shadow: 0 0 20px rgba(162, 155, 254, 0.1), inset 0 0 30px rgba(85, 239, 196, 0.03);
  position: relative;
  z-index: 10;
}
.quest-ornament {
  font-size: 20px;
  color: #a29bfe;
  text-shadow: 0 0 8px rgba(162, 155, 254, 0.6);
  animation: ornament-glow 2s ease-in-out infinite alternate;
}
.quest-text {
  font-size: 20px;
  font-weight: 700;
  color: #f0ecff;
  text-shadow: 0 0 6px rgba(200, 190, 255, 0.3);
  text-align: center;
  line-height: 1.4;
}
@keyframes ornament-glow {
  from { opacity: 0.5; }
  to { opacity: 1; }
}


/* ===== 底部操作栏 ===== */
.mijing-bottom-bar {
  display: flex;
  justify-content: flex-end;
  padding: 8px 24px;
  position: relative;
  z-index: 10;
}
.mijing-settle-btn {
  padding: 6px 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}
.mijing-settle-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.4);
}

/* ===== 卡片头部 ===== */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.mijing-close-btn {
  width: 32px;
  height: 32px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.7);
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mijing-close-btn:hover {
  background: rgba(255, 80, 80, 0.3);
  border-color: rgba(255, 80, 80, 0.5);
  color: #ff6b6b;
}
</style>
