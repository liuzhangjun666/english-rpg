<template>
  <div class="detective-hunt" :class="[`fx-${feedback}`, { 'round-enter': roundEnter }]">
    <div class="detective-bg-scrim" aria-hidden="true"></div>
    <div class="detective-bg-glow"></div>

    <div v-if="burst" class="detective-burst" aria-hidden="true">
      <img :src="assets.successBurst" alt="">
    </div>

    <div class="detective-hud">
      <div class="hud-chip timer" :class="{ urgent: timeLeft <= 25 }">
        <span class="chip-label">残卷时漏</span>
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
        <span class="chip-label">{{ comboTitle }}</span>
        <span class="chip-value">x{{ combo }}</span>
      </div>
    </div>

    <div class="detective-progress">
      <span>第 {{ roundIndex + 1 }} / {{ rounds.length }} 卷 · {{ phaseLabel }}</span>
      <div class="progress-track">
        <div class="progress-fill" :style="{ width: `${roundProgress}%` }"></div>
      </div>
    </div>

    <div class="detective-scroll" :class="{ revealed: revealedAnalysis }">
      <div class="scroll-deco">✦ 残卷推理 ✦</div>
      <div class="scroll-title">{{ currentRound?.passageTitle || '密卷' }}</div>
      <template v-if="revealedAnalysis">
        <div class="hint-label">天机解析</div>
        <div class="hint-analysis">{{ currentAnalysis }}</div>
      </template>
      <template v-else>
        <div class="hint-label">推理要诀</div>
        <div class="hint-task">{{ taskLine }}</div>
      </template>
    </div>

    <div class="passage-panel" :class="{ glow: !!selectedClueId }">
      <div class="panel-label">点击标注证据句</div>
      <div class="sentence-list">
        <button
          v-for="(sentence, idx) in currentRound?.sentences || []"
          :key="sentence.id"
          type="button"
          class="sentence-chip"
          :class="{
            active: selectedClueId === sentence.id,
            'chip-in': roundEnter,
          }"
          :style="{ '--delay': `${idx * 40}ms` }"
          @click="pickClue(sentence.id)"
        >
          {{ sentence.text }}
        </button>
      </div>
    </div>

    <div class="question-panel">
      <div class="question-label">推理命题</div>
      <div class="question-stem">{{ currentRound?.question || '加载中...' }}</div>
      <div class="option-bank">
        <button
          v-for="(opt, idx) in currentRound?.options || []"
          :key="opt.id"
          type="button"
          class="option-chip"
          :class="{ active: selectedAnswerKey === opt.key, 'chip-in': roundEnter }"
          :style="{ '--delay': `${idx * 45}ms` }"
          @click="pickAnswer(opt.key)"
        >
          <span class="opt-key">{{ opt.key }}</span>
          <span class="opt-label">{{ opt.label }}</span>
        </button>
      </div>
    </div>

    <div class="detective-actions">
      <button type="button" class="detective-btn ghost" @click="clearSelection">重选线索</button>
      <button
        type="button"
        class="detective-btn primary"
        data-btn-skin="熔铸确认"
        :disabled="!canSubmit"
        @click="submitRound"
      >
        确认推理
      </button>
      <button type="button" class="detective-btn ghost" @click="skipRound">遁走下一卷</button>
    </div>

    <transition name="toast-fade">
      <div v-if="toast" class="detective-toast" :class="toast.type">
        <span v-if="toast.emoji" class="toast-emoji">{{ toast.emoji }}</span>
        {{ toast.text }}
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import type { ArcadeModeDefinition } from '../../data/arcadeModes';
import type { ReadingDetectiveRound } from '../../data/readingArcade';
import { ARCADE_ASSETS } from '../../data/arcadeAssets';

const MAX_MISSES = 3;
const PHASE_LABELS = ['寻证', '对读', '推敲', '定谳'];
const TASK_LINES = [
  '先在文中标出证据句，再选择最合逻辑的选项',
  '证据与答案需相互支撑，方可算推理成功',
  '标错证据会扣连击，答错后可见解析',
];

const props = defineProps<{
  mode: ArcadeModeDefinition;
  rounds: ReadingDetectiveRound[];
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

const timeLeft = ref(props.mode.durationSec);
const score = ref(0);
const combo = ref(0);
const comboMax = ref(0);
const comboPulse = ref(false);
const roundIndex = ref(0);
const misses = ref(0);
const roundSolved = ref(false);
const failedQuestionIds = ref<string[]>([]);
const correctCount = ref(0);
const selectedClueId = ref('');
const selectedAnswerKey = ref('');
const revealedAnalysis = ref(false);
const feedback = ref<'idle' | 'success' | 'fail'>('idle');
const burst = ref(false);
const roundEnter = ref(false);
const toast = ref<{ type: 'success' | 'fail' | 'info'; text: string; emoji?: string } | null>(null);

let timerId: number | null = null;
let toastTimer: number | null = null;
let feedbackTimer: number | null = null;
let burstTimer: number | null = null;

const currentRound = computed(() => props.rounds[roundIndex.value] || null);
const currentAnalysis = computed(() => currentRound.value?.analysis || '请回到文中定位支撑答案的句子。');
const timerPercent = computed(() => Math.max(0, Math.min(100, (timeLeft.value / props.mode.durationSec) * 100)));
const roundProgress = computed(() => ((roundIndex.value + (roundSolved.value ? 1 : 0)) / Math.max(1, props.rounds.length)) * 100);
const canSubmit = computed(() => !!selectedClueId.value && !!selectedAnswerKey.value);
const phaseLabel = computed(() => PHASE_LABELS[roundIndex.value % PHASE_LABELS.length]);
const taskLine = computed(() => TASK_LINES[roundIndex.value % TASK_LINES.length]);
const comboTitle = computed(() => {
  if (combo.value >= 6) return '洞烛连推';
  if (combo.value >= 3) return '连推';
  return '连击';
});

function showToast(type: 'success' | 'fail' | 'info', text: string, emoji = '') {
  toast.value = { type, text, emoji: emoji || undefined };
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

function animateRoundEnter() {
  roundEnter.value = false;
  requestAnimationFrame(() => {
    roundEnter.value = true;
    window.setTimeout(() => { roundEnter.value = false; }, 700);
  });
}

function loadRound() {
  if (!currentRound.value) {
    finishGame();
    return;
  }
  roundSolved.value = false;
  revealedAnalysis.value = false;
  misses.value = 0;
  selectedClueId.value = '';
  selectedAnswerKey.value = '';
  animateRoundEnter();
}

function pickClue(id: string) {
  selectedClueId.value = id;
}

function pickAnswer(key: string) {
  selectedAnswerKey.value = key;
}

function clearSelection() {
  selectedClueId.value = '';
  selectedAnswerKey.value = '';
}

function nextRound() {
  roundIndex.value += 1;
  if (roundIndex.value >= props.rounds.length) {
    finishGame();
    return;
  }
  loadRound();
}

function submitRound() {
  const round = currentRound.value;
  if (!round || !selectedClueId.value || !selectedAnswerKey.value) return;

  const clueOk = selectedClueId.value === round.correctClueId;
  const answerOk = selectedAnswerKey.value === round.correctKey;

  if (clueOk && answerOk) {
    roundSolved.value = true;
    correctCount.value += 1;
    combo.value += 1;
    comboMax.value = Math.max(comboMax.value, combo.value);
    comboPulse.value = true;
    window.setTimeout(() => { comboPulse.value = false; }, 400);
    const mul = Math.min(props.mode.score.comboCap, 1 + combo.value * props.mode.score.comboStep);
    applyScore(Math.round(props.mode.score.basePerAction * mul));
    flashFeedback('success');
    showToast('success', combo.value >= 3 ? `连推 x${combo.value}！证据命中` : '推理正确！', combo.value >= 3 ? '✨' : '📜');
    window.setTimeout(() => nextRound(), 520);
    return;
  }

  combo.value = 0;
  misses.value += 1;
  revealedAnalysis.value = true;
  applyScore(-props.mode.score.missPenalty);
  flashFeedback('fail');

  if (!clueOk && !answerOk) {
    showToast('fail', '证据与答案均未命中，请重读残卷', '💨');
  } else if (!clueOk) {
    showToast('fail', '证据句标注有误，答案方向可参考解析', '🔍');
  } else {
    showToast('fail', '证据正确但答案有误，请看解析', '📖');
  }

  if (misses.value >= MAX_MISSES) {
    recordRoundFailure();
    applyScore(-props.mode.score.timeoutPenalty);
    showToast('info', '本卷推理失败，进入下一卷', '🌑');
    window.setTimeout(() => nextRound(), 580);
    return;
  }

  selectedAnswerKey.value = '';
}

function skipRound() {
  combo.value = 0;
  recordRoundFailure();
  applyScore(-props.mode.score.missPenalty);
  showToast('info', '遁走下一卷', '🌫');
  nextRound();
}

function finishGame() {
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

onBeforeUnmount(() => {
  if (timerId !== null) clearInterval(timerId);
  if (toastTimer) clearTimeout(toastTimer);
  if (feedbackTimer) clearTimeout(feedbackTimer);
  if (burstTimer) clearTimeout(burstTimer);
});
</script>

<style scoped>
.detective-hunt {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 12px 16px;
  border-radius: 14px;
  overflow: hidden;
  min-height: 420px;
  border: 1px solid rgba(95, 211, 190, 0.28);
  background: linear-gradient(165deg, rgba(10, 18, 38, 0.98) 0%, rgba(5, 10, 22, 0.99) 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 12px 32px rgba(0, 0, 0, 0.45);
}

.detective-bg-scrim {
  position: absolute;
  inset: 0;
  background: rgba(4, 8, 18, 0.55);
  pointer-events: none;
  z-index: 0;
}

.detective-bg-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 80% 50% at 50% 0%, rgba(72, 196, 170, 0.12), transparent 70%);
  pointer-events: none;
}

.detective-hunt.fx-success {
  animation: detective-flash-ok 0.45s ease;
}

.detective-hunt.fx-fail {
  animation: detective-shake 0.45s ease;
}

@keyframes detective-flash-ok {
  50% { box-shadow: inset 0 0 48px rgba(95, 211, 200, 0.22); }
}

@keyframes detective-shake {
  25% { transform: translateX(-3px); }
  75% { transform: translateX(3px); }
}

.detective-burst {
  position: absolute;
  left: 50%;
  top: 40%;
  transform: translate(-50%, -50%);
  z-index: 20;
  pointer-events: none;
}

.detective-burst img {
  width: 150px;
  height: 150px;
  object-fit: contain;
  animation: burst-pop 0.65s ease-out forwards;
}

@keyframes burst-pop {
  0% { transform: scale(0.4); opacity: 0.2; }
  40% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1.35); opacity: 0; }
}

.detective-hud {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  position: relative;
  z-index: 1;
}

.hud-chip {
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid rgba(95, 211, 190, 0.35);
  background: rgba(6, 14, 32, 0.94);
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
}

.hud-chip.timer.urgent {
  border-color: rgba(255, 140, 100, 0.55);
}

.chip-label {
  display: block;
  font-size: 11px;
  color: #9ed4cc;
  margin-bottom: 2px;
}

.chip-value {
  display: block;
  font-size: 18px;
  font-weight: 800;
  color: #f0fffb;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.65);
}

.timer-bar {
  margin-top: 6px;
  height: 4px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.35);
  overflow: hidden;
}

.timer-fill {
  height: 100%;
  background: linear-gradient(90deg, #2a9d8f, #7bdcb5);
  transition: width 0.3s ease;
}

.hud-chip.combo.hot .chip-value {
  color: #ffe9a8;
}

.hud-chip.combo.pulse {
  animation: combo-pop 0.4s ease;
}

@keyframes combo-pop {
  50% { transform: scale(1.08); }
}

.detective-progress {
  position: relative;
  z-index: 1;
  font-size: 13px;
  color: #c8e6e0;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.progress-track {
  margin-top: 6px;
  height: 6px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #1a7a6e, #7bdcb5);
  transition: width 0.35s ease;
}

.detective-scroll {
  position: relative;
  z-index: 1;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid rgba(212, 168, 67, 0.38);
  background: linear-gradient(180deg, rgba(18, 28, 52, 0.97), rgba(10, 16, 34, 0.98));
  text-align: center;
  box-shadow: inset 0 0 0 1px rgba(255, 236, 184, 0.06);
}

.detective-scroll.revealed {
  border-color: rgba(255, 200, 120, 0.5);
  box-shadow: inset 0 0 28px rgba(255, 180, 90, 0.1);
}

.scroll-deco {
  font-size: 12px;
  color: #a8e8dc;
  letter-spacing: 2px;
  margin-bottom: 8px;
  font-weight: 700;
}

.scroll-title {
  font-size: 16px;
  color: #fff8e8;
  font-weight: 700;
  margin-bottom: 10px;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.55);
}

.hint-label {
  font-size: 12px;
  color: #9ed4cc;
  font-weight: 600;
}

.hint-task,
.hint-analysis {
  margin-top: 8px;
  font-size: 14px;
  line-height: 1.65;
  color: #eef8f4;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.45);
}

.hint-analysis {
  color: #ffe9c8;
}

.passage-panel {
  position: relative;
  z-index: 1;
  padding: 14px;
  border-radius: 12px;
  border: 1px solid rgba(95, 211, 190, 0.4);
  background: rgba(6, 14, 32, 0.96);
  transition: box-shadow 0.3s;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.passage-panel.glow {
  box-shadow: 0 0 16px rgba(95, 211, 190, 0.15);
}

.panel-label,
.question-label {
  font-size: 12px;
  color: #a8e8dc;
  margin-bottom: 10px;
  letter-spacing: 1px;
  font-weight: 700;
}

.sentence-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 160px;
  overflow-y: auto;
}

.sentence-chip {
  text-align: left;
  border: 1px solid rgba(123, 220, 181, 0.4);
  background: rgba(12, 24, 48, 0.95);
  color: #f4fbff;
  border-radius: 10px;
  padding: 12px 14px;
  font-size: 14px;
  line-height: 1.6;
  cursor: pointer;
  transition: border-color 0.15s, transform 0.12s, background 0.15s;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
}

.sentence-chip.chip-in {
  animation: chip-in 0.4s ease backwards;
  animation-delay: var(--delay, 0ms);
}

@keyframes chip-in {
  from { opacity: 0; transform: translateY(8px); }
}

.sentence-chip:hover {
  border-color: rgba(123, 220, 181, 0.55);
}

.sentence-chip.active {
  border-color: rgba(255, 217, 120, 0.75);
  background: rgba(48, 36, 12, 0.92);
  color: #fff8e8;
  box-shadow: 0 0 12px rgba(255, 217, 120, 0.2);
}

.question-panel {
  position: relative;
  z-index: 1;
  padding: 14px;
  border-radius: 12px;
  border: 1px solid rgba(212, 168, 67, 0.38);
  background: rgba(6, 14, 32, 0.96);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.question-stem {
  font-size: 16px;
  line-height: 1.6;
  color: #fff8e8;
  font-weight: 700;
  margin-bottom: 12px;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.45);
}

.option-bank {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option-chip {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  text-align: left;
  border: 1px solid rgba(212, 168, 67, 0.42);
  background: rgba(14, 22, 44, 0.95);
  border-radius: 10px;
  padding: 12px 14px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
}

.option-chip.chip-in {
  animation: chip-in 0.4s ease backwards;
  animation-delay: var(--delay, 0ms);
}

.option-chip.active {
  border-color: rgba(255, 217, 120, 0.75);
  background: rgba(48, 36, 12, 0.9);
  box-shadow: 0 0 12px rgba(255, 217, 120, 0.18);
}

.opt-key {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(212, 168, 67, 0.28);
  color: #ffe9a8;
  font-size: 13px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}

.opt-label {
  color: #f7f3e8;
  font-size: 14px;
  line-height: 1.5;
  font-weight: 500;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
}

.detective-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  position: relative;
  z-index: 1;
}

.detective-btn {
  border-radius: 10px;
  padding: 10px 18px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid transparent;
}

.detective-btn.primary {
  border-color: rgba(95, 211, 190, 0.55);
  background: linear-gradient(180deg, rgba(42, 157, 143, 0.5), rgba(20, 90, 80, 0.65));
  color: #fff8e8;
}

.detective-btn.primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.detective-btn.ghost {
  border-color: rgba(95, 211, 190, 0.3);
  background: rgba(8, 20, 42, 0.5);
  color: #a8d4ff;
}

.detective-toast {
  position: fixed;
  left: 50%;
  bottom: 18%;
  transform: translateX(-50%);
  z-index: 50;
  padding: 10px 16px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  border: 1px solid rgba(95, 211, 190, 0.4);
  background: rgba(8, 20, 42, 0.92);
  color: #d4fff4;
}

.detective-toast.success {
  border-color: rgba(123, 220, 181, 0.5);
  color: #b8f0d8;
}

.detective-toast.fail {
  border-color: rgba(255, 140, 100, 0.45);
  color: #ffc4b8;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}
</style>
