<template>
  <div class="echo-trial" :class="[`fx-${feedback}`]">
    <div v-if="burst" class="echo-burst" aria-hidden="true">
      <img :src="assets.successBurst" alt="">
    </div>

    <div class="echo-hud">
      <div class="hud-chip timer" :class="{ urgent: timeLeft <= 20 }">
        <span class="chip-label">听风时漏</span>
        <span class="chip-value">{{ timeLeft }}s</span>
        <div class="timer-bar">
          <div class="timer-fill" :style="{ width: `${timerPercent}%` }"></div>
        </div>
      </div>
      <div class="hud-chip score">
        <span class="chip-label">灵力得分</span>
        <span class="chip-value">{{ score }}</span>
      </div>
      <div class="hud-chip combo" :class="{ hot: combo >= 3, pulse: comboPulse }">
        <span class="chip-label">{{ comboLabel }}</span>
        <span class="chip-value">x{{ combo }}</span>
      </div>
    </div>

    <div class="echo-progress">
      <span>第 {{ roundIndex + 1 }} / {{ props.rounds.length }} 音 · {{ phaseLabel }}</span>
      <div class="progress-track">
        <div class="progress-fill" :style="{ width: `${roundProgress}%` }"></div>
      </div>
    </div>

    <div class="echo-scroll">
      <div class="scroll-deco">✦ 回声识音 ✦</div>
      <div class="topic-row">
        <span v-if="topicLabel" class="topic-badge">{{ topicLabel }}风境</span>
        <span v-if="focusUsedThisRound" class="topic-badge skill-glow">降噪诀生效</span>
        <span v-if="slowReplayArmed" class="topic-badge slow-glow">慢放待发</span>
      </div>
      <div class="echo-hint-label">听风要诀</div>
      <div class="echo-hint-text">{{ taskLine }}</div>
      <div class="echo-task">先听音，再补全印诀，最后判断答案。</div>
    </div>

    <div class="echo-panel material">
      <div class="panel-label">第一步 · 听风辨声</div>
      <div class="panel-desc">可重听 2 次，重听越多越难维持高分连击。</div>
      <div v-if="topicLabel" class="topic-collection">
        <span class="collection-label">风铃碎片</span>
        <div class="collection-chip" :class="{ collected: collectedThisTopic }">
          <span class="collection-dot"></span>
          {{ topicLabel }}
        </div>
      </div>
      <div class="sound-wave" :class="{ active: isPlaying }" aria-hidden="true">
        <span v-for="n in 8" :key="n" class="wave-bar" :style="{ '--i': n }"></span>
      </div>
      <button
        type="button"
        class="play-btn"
        :disabled="isPlaying || !canPlayMaterial || (hasListened && replayCount >= maxReplays)"
        @click="handlePlay"
      >
        {{ playButtonLabel }}
      </button>
      <div class="listen-meta">
        <span>剩余重听 {{ Math.max(0, maxReplays - replayCount) }} / {{ maxReplays }}</span>
        <span>当前倍率 {{ playbackLabel }}</span>
        <span v-if="!materialText">缺少听力材料</span>
        <span v-else-if="!hasListened">先听风语，再补印诀</span>
      </div>
      <div class="skill-row">
        <button
          type="button"
          class="skill-btn"
          :class="{ active: slowUsedThisRound }"
          :disabled="slowUsedThisRound || !canPlayMaterial"
          @click="useSlowReplay"
        >
          慢放诀
          <span class="skill-cost">-{{ skillPenalty }}</span>
        </button>
        <button
          type="button"
          class="skill-btn"
          :class="{ active: focusUsedThisRound }"
          :disabled="focusUsedThisRound || !puzzle"
          @click="useFocusSkill"
        >
          降噪诀
          <span class="skill-cost">-{{ skillPenalty }}</span>
        </button>
      </div>
      <div class="skill-tip">
        慢放使下次风语减速播放；降噪会显露一枚真叶并排除一项伪音。
      </div>
    </div>

    <div class="echo-panel seal" :class="{ muted: !hasListened, complete: sealComplete, shake: sealShake }">
      <div class="panel-label">第二步 · 回声印诀</div>
      <div class="panel-desc">选择风叶填补空位，印诀全对后方可作答。</div>
      <div v-if="puzzle" class="seal-sentence">
        <template v-for="(part, idx) in puzzle.templateParts" :key="`part-${idx}`">
          <span class="seal-text">{{ part }}</span>
          <button
            v-if="idx < puzzle.blanks.length"
            type="button"
            class="seal-slot"
            :class="{
              filled: Boolean(slotTexts[puzzle.blanks[idx].id]),
              correct: sealComplete,
              wrong: wrongSlotId === puzzle.blanks[idx].id,
            }"
            :disabled="!hasListened || sealComplete"
            @click="handleSlotClick(puzzle.blanks[idx].id)"
          >
            {{ slotTexts[puzzle.blanks[idx].id] || '印' }}
          </button>
        </template>
      </div>
      <div class="leaf-pool">
        <button
          v-for="leaf in availableLeaves"
          :key="leaf.id"
          type="button"
          class="wind-leaf"
          :class="{ selected: selectedLeafId === leaf.id, hinted: hintLeafIds.includes(leaf.id) }"
          :disabled="!hasListened || sealComplete"
          @click="handleLeafClick(leaf.id)"
        >
          {{ leaf.text }}
        </button>
      </div>
      <div v-if="sealComplete" class="seal-status success">印诀已成，回声共鸣。</div>
      <div v-else-if="hasListened" class="seal-status">印诀进度 {{ filledBlankCount }} / {{ puzzle?.blanks.length || 0 }}</div>
    </div>

    <div class="echo-panel question" :class="{ muted: !sealComplete }">
      <div class="panel-label">第三步 · 判定真音</div>
      <div class="question-stem">{{ currentRound?.question || '请根据听力内容作答。' }}</div>
      <div class="options-container">
        <button
          v-for="opt in currentRound?.options || []"
          :key="opt.key"
          type="button"
          class="option-btn"
          :class="{ selected: selectedAnswerKey === opt.key, dimmed: removedOptionKeys.includes(opt.key) }"
          :disabled="!sealComplete || removedOptionKeys.includes(opt.key)"
          @click="selectedAnswerKey = opt.key"
        >
          <span class="option-key">{{ opt.key }}</span>
          <span class="option-text">{{ opt.text }}</span>
        </button>
      </div>
    </div>

    <div class="echo-actions">
      <button type="button" class="echo-btn ghost" @click="clearSeal">重排印诀</button>
      <button type="button" class="echo-btn primary" :disabled="!canSubmit" @click="submitRound">定音判诀</button>
      <button type="button" class="echo-btn ghost" @click="skipRound">遁走下一题</button>
    </div>

    <transition name="toast-fade">
      <div v-if="toast" class="echo-toast" :class="toast.type">{{ toast.text }}</div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import type { ArcadeModeDefinition } from '../../data/arcadeModes';
import type { ListeningEchoRound } from '../../data/listeningArcade';
import { ARCADE_ASSETS } from '../../data/arcadeAssets';
import { useAudioPlayer } from '../../composables/useAudioPlayer';
import { buildWindSeal, isBlankAnswerCorrect, type WindSealLeaf, type WindSealPuzzle } from '../../utils/windSealBuilder';
import {
  WIND_CHIME_LABELS,
  collectWindChimeFragment,
  normalizeWindChimeTopic,
  readWindChimeFragments,
} from '../../utils/listeningWindChimes';

const MAX_MISSES = 4;
const PHASE_LABELS = ['凝神', '辨音', '回响', '定音'];
const TASK_LINES = [
  '先听关键词，再用风叶补全印诀。',
  '印诀正确，才能开启判题选项。',
  '重听可保稳，但会打断高分节奏。',
];

const props = defineProps<{
  mode: ArcadeModeDefinition;
  rounds: ListeningEchoRound[];
}>();

const emit = defineEmits<{
  (e: 'finished', payload: {
    score: number;
    correct: number;
    total: number;
    comboMax: number;
    wrongQuestionIds: string[];
  }): void;
}>();

const assets = ARCADE_ASSETS;
const { isPlaying, replayCount, maxReplays, playbackRate, loadAudio, play, stop, resetReplayCount, setPlaybackRate } = useAudioPlayer();
const skillPenalty = Math.max(16, Math.round(props.mode.score.missPenalty * 0.6));

const timeLeft = ref(props.mode.durationSec);
const score = ref(0);
const combo = ref(0);
const comboMax = ref(0);
const comboPulse = ref(false);
const roundIndex = ref(0);
const misses = ref(0);
const correctCount = ref(0);
const failedQuestionIds = ref<string[]>([]);
const feedback = ref<'idle' | 'success' | 'fail'>('idle');
const burst = ref(false);
const hasListened = ref(false);
const sealComplete = ref(false);
const sealShake = ref(false);
const wrongSlotId = ref('');
const selectedLeafId = ref<string | null>(null);
const selectedAnswerKey = ref('');
const slotTexts = reactive<Record<string, string>>({});
const slotLeafIds = reactive<Record<string, string>>({});
const useTtsFallback = ref(false);
const puzzle = ref<WindSealPuzzle | null>(null);
const toast = ref<{ type: 'success' | 'fail' | 'info'; text: string } | null>(null);
const ttsUtterance = ref<SpeechSynthesisUtterance | null>(null);
const slowUsedThisRound = ref(false);
const slowReplayArmed = ref(false);
const focusUsedThisRound = ref(false);
const hintLeafIds = ref<string[]>([]);
const removedOptionKeys = ref<string[]>([]);
const chimeTick = ref(0);

let timerId: number | null = null;
let toastTimer: number | null = null;
let feedbackTimer: number | null = null;
let burstTimer: number | null = null;
let ttsReplayCount = 0;

const currentRound = computed(() => props.rounds[roundIndex.value] || null);
const materialText = computed(() => currentRound.value?.listeningText || '');
const canPlayMaterial = computed(() => Boolean(currentRound.value?.audioUrl || materialText.value));
const availableLeaves = computed(() => {
  if (!puzzle.value) return [];
  const usedIds = new Set(Object.values(slotLeafIds));
  return puzzle.value.leaves.filter((leaf) => !usedIds.has(leaf.id));
});
const filledBlankCount = computed(() => {
  if (!puzzle.value) return 0;
  return puzzle.value.blanks.filter((blank) => Boolean(slotTexts[blank.id])).length;
});
const timerPercent = computed(() => Math.max(0, Math.min(100, (timeLeft.value / props.mode.durationSec) * 100)));
const roundProgress = computed(() => ((roundIndex.value) / Math.max(1, props.rounds.length)) * 100);
const canSubmit = computed(() => sealComplete.value && !!selectedAnswerKey.value);
const playButtonLabel = computed(() => {
  if (isPlaying.value) return '风语回荡中...';
  return hasListened.value ? '重听风语' : '播放风语';
});
const playbackLabel = computed(() => `${playbackRate.value.toFixed(2).replace(/\.00$/, '')}x`);
const comboLabel = computed(() => (combo.value >= 3 ? '回响连击' : '连击'));
const phaseLabel = computed(() => PHASE_LABELS[roundIndex.value % PHASE_LABELS.length]);
const taskLine = computed(() => TASK_LINES[roundIndex.value % TASK_LINES.length]);
const topicKey = computed(() => normalizeWindChimeTopic(String(currentRound.value?.word || '')));
const topicLabel = computed(() => (topicKey.value ? WIND_CHIME_LABELS[topicKey.value] : ''));
const collectedThisTopic = computed(() => {
  void chimeTick.value;
  return topicKey.value ? readWindChimeFragments().includes(topicKey.value) : false;
});

function showToast(type: 'success' | 'fail' | 'info', text: string) {
  toast.value = { type, text };
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { toast.value = null; }, 1400);
}

function flashFeedback(type: 'success' | 'fail') {
  feedback.value = type;
  if (type === 'success') {
    burst.value = true;
    if (burstTimer) clearTimeout(burstTimer);
    burstTimer = window.setTimeout(() => { burst.value = false; }, 700);
  }
  if (feedbackTimer) clearTimeout(feedbackTimer);
  feedbackTimer = window.setTimeout(() => { feedback.value = 'idle'; }, 450);
}

function applyScore(delta: number) {
  score.value = Math.max(0, score.value + delta);
}

function recordRoundFailure() {
  const qid = String(currentRound.value?.questionId || '').trim();
  if (!qid || failedQuestionIds.value.includes(qid)) return;
  failedQuestionIds.value.push(qid);
}

function resetSealState() {
  const round = currentRound.value;
  puzzle.value = buildWindSeal({
    listening_text: round?.listeningText || '',
    question: round?.question || '',
    options: Object.fromEntries((round?.options || []).map((item) => [item.key, item.text])),
    wind_seal: round?.windSeal,
  });
  Object.keys(slotTexts).forEach((key) => delete slotTexts[key]);
  Object.keys(slotLeafIds).forEach((key) => delete slotLeafIds[key]);
  selectedLeafId.value = null;
  selectedAnswerKey.value = '';
  sealComplete.value = false;
  sealShake.value = false;
  wrongSlotId.value = '';
  hintLeafIds.value = [];
  removedOptionKeys.value = [];
}

function stopTts() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  ttsUtterance.value = null;
}

function prepareAudioSource() {
  stop();
  stopTts();
  if (materialText.value) {
    useTtsFallback.value = true;
    return;
  }
  const audioUrl = String(currentRound.value?.audioUrl || '').trim();
  useTtsFallback.value = false;
  if (audioUrl) loadAudio(audioUrl);
}

function playWithTts() {
  if (!materialText.value || typeof window === 'undefined' || !window.speechSynthesis) return;
  stopTts();
  const utterance = new SpeechSynthesisUtterance(materialText.value);
  utterance.lang = 'en-US';
  utterance.rate = playbackRate.value <= 0.76 ? 0.72 : 0.9;
  utterance.onstart = () => { isPlaying.value = true; };
  utterance.onend = () => {
    isPlaying.value = false;
    hasListened.value = true;
    if (slowReplayArmed.value) {
      slowReplayArmed.value = false;
      setPlaybackRate(1);
    }
  };
  utterance.onerror = () => {
    isPlaying.value = false;
    if (slowReplayArmed.value) {
      slowReplayArmed.value = false;
      setPlaybackRate(1);
    }
  };
  ttsUtterance.value = utterance;
  window.speechSynthesis.speak(utterance);
}

function loadRound() {
  if (!currentRound.value) {
    finishGame();
    return;
  }
  misses.value = 0;
  hasListened.value = false;
  resetReplayCount();
  ttsReplayCount = 0;
  slowUsedThisRound.value = false;
  slowReplayArmed.value = false;
  focusUsedThisRound.value = false;
  setPlaybackRate(1);
  prepareAudioSource();
  resetSealState();
}

function nextRound() {
  roundIndex.value += 1;
  if (roundIndex.value >= props.rounds.length) {
    finishGame();
    return;
  }
  loadRound();
}

function handlePlay() {
  if (!canPlayMaterial.value) return;
  if (hasListened.value && replayCount.value >= maxReplays.value) return;

  if (useTtsFallback.value) {
    if (hasListened.value) {
      if (ttsReplayCount >= maxReplays.value) return;
      ttsReplayCount += 1;
      replayCount.value = ttsReplayCount;
    }
    playWithTts();
    return;
  }

  const started = play(hasListened.value);
  if (started) hasListened.value = true;
}

function useSlowReplay() {
  if (slowUsedThisRound.value || !canPlayMaterial.value) return;
  slowUsedThisRound.value = true;
  slowReplayArmed.value = true;
  setPlaybackRate(0.72);
  combo.value = 0;
  applyScore(-skillPenalty);
  showToast('info', '慢放诀已启用，下次风语将减速。');
}

function pickHintLeaf(leaves: WindSealLeaf[]) {
  if (!puzzle.value) return;
  const remainingCorrect = puzzle.value.blanks
    .filter((blank) => !slotTexts[blank.id])
    .map((blank) => blank.answer.toLowerCase());
  const hinted = leaves.find((leaf) => remainingCorrect.includes(leaf.text.toLowerCase()));
  if (hinted) {
    hintLeafIds.value = [hinted.id];
  }
}

function useFocusSkill() {
  if (focusUsedThisRound.value || !puzzle.value) return;
  focusUsedThisRound.value = true;
  combo.value = 0;
  applyScore(-skillPenalty);
  pickHintLeaf(availableLeaves.value);

  const wrongOption = (currentRound.value?.options || []).find((opt) => opt.key !== currentRound.value?.correctKey);
  if (wrongOption) {
    removedOptionKeys.value = [wrongOption.key];
  }
  showToast('info', '降噪诀已施展，真叶微亮，伪音散去。');
}

function handleLeafClick(leafId: string) {
  if (!hasListened.value || sealComplete.value) return;
  selectedLeafId.value = selectedLeafId.value === leafId ? null : leafId;
}

function triggerSealShake(slotId: string) {
  wrongSlotId.value = slotId;
  sealShake.value = true;
  window.setTimeout(() => {
    sealShake.value = false;
    wrongSlotId.value = '';
  }, 420);
}

function checkSealComplete() {
  if (!puzzle.value) return;
  sealComplete.value = puzzle.value.blanks.every((blank) => {
    const placed = slotTexts[blank.id];
    return placed && isBlankAnswerCorrect(blank.answer, placed);
  });
}

function handleSlotClick(blankId: string) {
  if (!hasListened.value || sealComplete.value || !puzzle.value) return;

  if (slotTexts[blankId]) {
    delete slotTexts[blankId];
    delete slotLeafIds[blankId];
    return;
  }

  if (!selectedLeafId.value) return;
  const leaf = puzzle.value.leaves.find((item) => item.id === selectedLeafId.value);
  const blank = puzzle.value.blanks.find((item) => item.id === blankId);
  if (!leaf || !blank) return;

  if (!isBlankAnswerCorrect(blank.answer, leaf.text)) {
    selectedLeafId.value = null;
    triggerSealShake(blankId);
    return;
  }

  slotTexts[blankId] = leaf.text;
  slotLeafIds[blankId] = leaf.id;
  hintLeafIds.value = hintLeafIds.value.filter((id) => id !== leaf.id);
  selectedLeafId.value = null;
  checkSealComplete();
}

function clearSeal() {
  if (!puzzle.value) return;
  Object.keys(slotTexts).forEach((key) => delete slotTexts[key]);
  Object.keys(slotLeafIds).forEach((key) => delete slotLeafIds[key]);
  selectedLeafId.value = null;
  selectedAnswerKey.value = '';
  sealComplete.value = false;
  wrongSlotId.value = '';
}

function submitRound() {
  const round = currentRound.value;
  if (!round || !sealComplete.value || !selectedAnswerKey.value) return;

  if (selectedAnswerKey.value === round.correctKey) {
    correctCount.value += 1;
    combo.value += 1;
    comboMax.value = Math.max(comboMax.value, combo.value);
    comboPulse.value = true;
    window.setTimeout(() => { comboPulse.value = false; }, 400);
    const mul = Math.min(props.mode.score.comboCap, 1 + combo.value * props.mode.score.comboStep);
    let delta = Math.round(props.mode.score.basePerAction * mul);
    if (replayCount.value === 0) {
      delta += Math.round((props.mode.score.bonusScore || 0) * 0.35);
    }
    if (focusUsedThisRound.value || slowUsedThisRound.value) {
      delta = Math.max(0, delta - skillPenalty);
    }
    applyScore(delta);
    flashFeedback('success');
    if (topicKey.value && collectWindChimeFragment(topicKey.value)) {
      chimeTick.value += 1;
      showToast('success', `辨音正确！已收录${topicLabel.value}风铃碎片`);
    } else {
      showToast('success', replayCount.value === 0 ? '一气呵成，回声尽收！' : '辨音正确！');
    }
    window.setTimeout(() => nextRound(), 520);
    return;
  }

  combo.value = 0;
  misses.value += 1;
  applyScore(-props.mode.score.missPenalty);
  flashFeedback('fail');
  showToast('fail', '判音失误，再听再定。');
  selectedAnswerKey.value = '';

  if (misses.value >= MAX_MISSES) {
    recordRoundFailure();
    applyScore(-props.mode.score.timeoutPenalty);
    showToast('info', '本题回声散去，进入下一题。');
    window.setTimeout(() => nextRound(), 580);
  }
}

function skipRound() {
  combo.value = 0;
  recordRoundFailure();
  applyScore(-props.mode.score.missPenalty);
  showToast('info', '遁走下一题');
  nextRound();
}

function finishGame() {
  stop();
  stopTts();
  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }
  emit('finished', {
    score: score.value,
    correct: correctCount.value,
    total: props.rounds.length,
    comboMax: comboMax.value,
    wrongQuestionIds: [...failedQuestionIds.value],
  });
}

onMounted(() => {
  loadRound();
  timerId = window.setInterval(() => {
    timeLeft.value -= 1;
    if (timeLeft.value <= 0) finishGame();
  }, 1000);
});

watch(isPlaying, (playing) => {
  if (!playing && slowReplayArmed.value && !useTtsFallback.value) {
    slowReplayArmed.value = false;
    setPlaybackRate(1);
  }
});

onBeforeUnmount(() => {
  stop();
  stopTts();
  if (timerId !== null) clearInterval(timerId);
  if (toastTimer) clearTimeout(toastTimer);
  if (feedbackTimer) clearTimeout(feedbackTimer);
  if (burstTimer) clearTimeout(burstTimer);
});
</script>

<style scoped>
.echo-trial {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 12px 16px;
  min-height: 420px;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(122, 162, 255, 0.28);
  background:
    radial-gradient(ellipse at top, rgba(76, 130, 255, 0.16), transparent 60%),
    linear-gradient(165deg, rgba(9, 16, 38, 0.98) 0%, rgba(5, 10, 22, 0.99) 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 12px 32px rgba(0, 0, 0, 0.45);
}

.echo-trial.fx-success {
  animation: echo-flash-ok 0.45s ease;
}

.echo-trial.fx-fail {
  animation: echo-shake 0.45s ease;
}

@keyframes echo-flash-ok {
  50% { box-shadow: inset 0 0 48px rgba(107, 187, 255, 0.22); }
}

@keyframes echo-shake {
  25% { transform: translateX(-3px); }
  75% { transform: translateX(3px); }
}

.echo-burst {
  position: absolute;
  left: 50%;
  top: 38%;
  transform: translate(-50%, -50%);
  z-index: 20;
  pointer-events: none;
}

.echo-burst img {
  width: 150px;
  height: 150px;
  object-fit: contain;
  animation: echo-burst-pop 0.65s ease-out forwards;
}

@keyframes echo-burst-pop {
  0% { transform: scale(0.4); opacity: 0.2; }
  40% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1.35); opacity: 0; }
}

.echo-hud {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.hud-chip {
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid rgba(122, 162, 255, 0.35);
  background: rgba(7, 16, 36, 0.94);
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
}

.hud-chip.timer.urgent {
  border-color: rgba(255, 140, 100, 0.55);
}

.hud-chip.combo.hot {
  border-color: rgba(212, 168, 67, 0.55);
  box-shadow: 0 0 16px rgba(212, 168, 67, 0.15);
}

.hud-chip.combo.pulse {
  animation: combo-pulse 0.4s ease;
}

.chip-label {
  display: block;
  font-size: 11px;
  color: #b3d4ff;
  margin-bottom: 2px;
}

.chip-value {
  display: block;
  font-size: 18px;
  font-weight: 800;
  color: #f5fbff;
}

.timer-bar,
.progress-track {
  margin-top: 6px;
  height: 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.timer-fill,
.progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #6bbcff, #ffd978);
}

.echo-progress {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #b8d7f8;
  font-size: 13px;
}

.echo-progress .progress-track {
  flex: 1;
  margin-top: 0;
}

.echo-scroll,
.echo-panel {
  position: relative;
  padding: 16px 18px;
  border-radius: 12px;
  background: rgba(8, 16, 32, 0.7);
  border: 1px solid rgba(212, 168, 67, 0.22);
  backdrop-filter: blur(3px);
}

.echo-scroll {
  text-align: center;
}

.topic-row {
  margin-top: 8px;
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

.topic-badge {
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(91, 141, 255, 0.18);
  border: 1px solid rgba(122, 162, 255, 0.28);
  color: #dce8ff;
  font-size: 11px;
}

.topic-badge.skill-glow {
  background: rgba(34, 197, 94, 0.16);
  border-color: rgba(74, 222, 128, 0.3);
  color: #d7ffe4;
}

.topic-badge.slow-glow {
  background: rgba(250, 204, 21, 0.12);
  border-color: rgba(250, 204, 21, 0.28);
  color: #ffe8a6;
}

.scroll-deco,
.panel-label {
  font-size: 13px;
  color: var(--gold-light);
  font-family: var(--font-title);
}

.echo-hint-label {
  margin-top: 8px;
  color: #dbe9ff;
  font-weight: 700;
}

.echo-hint-text,
.panel-desc,
.listen-meta,
.seal-status {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.6;
  color: #b9c7db;
}

.material {
  text-align: center;
}

.sound-wave {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 5px;
  min-height: 44px;
  margin-top: 10px;
}

.wave-bar {
  width: 5px;
  height: 10px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(107, 188, 255, 0.95), rgba(212, 168, 67, 0.75));
  opacity: 0.35;
  transform-origin: bottom center;
}

.sound-wave.active .wave-bar {
  opacity: 1;
  animation: wave-bounce calc(0.85s + var(--i) * 0.04s) ease-in-out infinite;
}

@keyframes wave-bounce {
  0%, 100% { transform: scaleY(0.45); }
  50% { transform: scaleY(calc(1 + var(--i) * 0.08)); }
}

.play-btn {
  margin-top: 12px;
  padding: 10px 18px;
  border: 1px solid rgba(255, 236, 160, 0.45);
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(212, 168, 67, 0.95), rgba(180, 140, 50, 0.95));
  color: #151b2e;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 4px 14px rgba(212, 168, 67, 0.25);
}

.play-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.play-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.listen-meta {
  display: flex;
  justify-content: center;
  gap: 14px;
  flex-wrap: wrap;
}

.topic-collection {
  margin-top: 10px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(9, 18, 40, 0.62);
  border: 1px solid rgba(122, 162, 255, 0.2);
}

.collection-label {
  font-size: 11px;
  color: #96afcf;
}

.collection-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  color: #d5e2f6;
  font-size: 12px;
}

.collection-chip.collected {
  background: rgba(16, 185, 129, 0.16);
  color: #d7ffef;
}

.collection-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(148, 163, 184, 0.9);
}

.collection-chip.collected .collection-dot {
  background: #6ee7b7;
  box-shadow: 0 0 8px rgba(110, 231, 183, 0.45);
}

.skill-row {
  margin-top: 12px;
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
}

.skill-btn {
  min-width: 116px;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid rgba(122, 162, 255, 0.34);
  background: rgba(20, 32, 68, 0.82);
  color: #d8e7ff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.skill-btn.active,
.skill-btn:hover:not(:disabled) {
  border-color: rgba(212, 168, 67, 0.58);
  background: rgba(57, 43, 17, 0.92);
  color: #ffe29e;
}

.skill-btn:disabled {
  opacity: 0.52;
  cursor: not-allowed;
}

.skill-cost {
  margin-left: 6px;
  color: #f4c77d;
  font-size: 12px;
}

.skill-tip {
  margin-top: 8px;
  font-size: 12px;
  color: #8fb0d8;
}

.seal.muted,
.question.muted {
  opacity: 0.68;
}

.seal.complete {
  border-color: rgba(107, 188, 255, 0.48);
  box-shadow: 0 0 18px rgba(107, 188, 255, 0.16);
}

.seal.shake {
  animation: seal-shake 0.4s ease;
}

@keyframes seal-shake {
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}

.seal-sentence {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  color: #f7f3e8;
  line-height: 2;
  margin-top: 12px;
}

.seal-text,
.wind-leaf,
.option-btn,
.question-stem {
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
}

.seal-slot {
  min-width: 72px;
  min-height: 36px;
  padding: 4px 10px;
  border-radius: 8px;
  border: 1px dashed rgba(122, 162, 255, 0.55);
  background: rgba(8, 20, 36, 0.72);
  color: #b8e2ff;
  cursor: pointer;
}

.seal-slot.filled {
  border-style: solid;
  background: rgba(16, 185, 129, 0.16);
  color: #ebfff7;
}

.seal-slot.correct {
  border-color: rgba(52, 211, 153, 0.75);
  box-shadow: 0 0 12px rgba(52, 211, 153, 0.35);
}

.seal-slot.wrong {
  border-color: rgba(248, 113, 113, 0.85);
}

.leaf-pool {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.wind-leaf {
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid rgba(122, 162, 255, 0.35);
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(212, 168, 67, 0.14));
  color: #edf7ff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.wind-leaf.selected {
  border-color: rgba(255, 236, 160, 0.9);
  box-shadow: 0 0 14px rgba(255, 236, 160, 0.3);
}

.wind-leaf.hinted {
  border-color: rgba(125, 247, 196, 0.85);
  box-shadow: 0 0 14px rgba(125, 247, 196, 0.28);
}

.wind-leaf:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.seal-status.success {
  color: #bbf7d0;
}

.question-stem {
  margin-top: 10px;
  font-size: 17px;
  line-height: 1.55;
  color: var(--parchment);
}

.options-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
}

.option-btn {
  padding: 14px;
  border-radius: 8px;
  border: 1px solid rgba(212, 168, 67, 0.3);
  background: rgba(255, 255, 255, 0.05);
  color: var(--parchment);
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
}

.option-btn:hover:not(:disabled),
.option-btn.selected {
  background: rgba(212, 168, 67, 0.16);
  border-color: rgba(212, 168, 67, 0.55);
}

.option-btn.dimmed {
  opacity: 0.36;
  filter: grayscale(0.45);
}

.option-btn:disabled {
  cursor: not-allowed;
}

.option-key {
  color: var(--gold-light);
  font-weight: 700;
}

.echo-actions {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.echo-btn {
  min-width: 120px;
  padding: 10px 16px;
  border-radius: 10px;
  border: 1px solid rgba(122, 162, 255, 0.28);
  background: rgba(9, 18, 40, 0.88);
  color: #d7e7ff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.echo-btn.primary {
  border-color: rgba(212, 168, 67, 0.4);
  background: linear-gradient(180deg, rgba(212, 168, 67, 0.22), rgba(65, 44, 10, 0.58));
  color: #ffe7a1;
}

.echo-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.echo-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.echo-toast {
  align-self: center;
  padding: 8px 16px;
  border-radius: 999px;
  font-size: 13px;
}

.echo-toast.success {
  background: rgba(16, 185, 129, 0.18);
  border: 1px solid rgba(52, 211, 153, 0.45);
  color: #bbf7d0;
}

.echo-toast.fail {
  background: rgba(239, 68, 68, 0.16);
  border: 1px solid rgba(248, 113, 113, 0.42);
  color: #fecaca;
}

.echo-toast.info {
  background: rgba(59, 130, 246, 0.16);
  border: 1px solid rgba(96, 165, 250, 0.42);
  color: #dbeafe;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

@keyframes combo-pulse {
  50% { transform: scale(1.04); }
}

@media (max-width: 720px) {
  .echo-hud {
    grid-template-columns: 1fr;
  }

  .echo-progress {
    flex-direction: column;
    align-items: stretch;
  }

  .echo-actions {
    flex-direction: column;
  }

  .echo-btn {
    width: 100%;
  }
}
</style>
