<template>
  <div class="rune-hunt" :class="[`fx-${feedback}`]">
    <div class="rune-bg-scene" :style="{ backgroundImage: `url(${assets.bgVocabRune})` }"></div>
    <div class="rune-bg-glow"></div>

    <div class="rune-hud">
      <div class="hud-chip timer" :class="{ urgent: timeLeft <= 20 }">
        <span class="chip-label">灵砂时漏</span>
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
        <span class="chip-label">连击</span>
        <span class="chip-value">x{{ combo }}</span>
      </div>
    </div>

    <div class="rune-progress">
      <span>第 {{ roundIndex + 1 }} / {{ rounds.length }} 符</span>
      <div class="progress-track">
        <div class="progress-fill" :style="{ width: `${roundProgress}%` }"></div>
      </div>
    </div>

    <div v-if="burst" class="rune-burst" aria-hidden="true">
      <img :src="assets.successBurst" alt="">
    </div>

    <div class="rune-scroll" :style="{ backgroundImage: `url(${assets.scrollPanel})` }">
      <div class="scroll-deco">✦ 符文追猎 ✦</div>
      <div class="rune-hint-label">天机释义</div>
      <div class="rune-hint-text">{{ currentHint }}</div>
      <div class="rune-task">请拼出对应的英文单词（{{ targetLength }} 个字母）</div>
    </div>

    <div class="rune-slots-wrap" :style="{ '--tile-bg': `url(${assets.runeTile})` }">
      <div class="rune-slots">
        <span
          v-for="(ch, idx) in slotLetters"
          :key="idx"
          class="rune-slot"
          :class="{ filled: !!ch, pop: lastPopIdx === idx }"
          @click="removeAt(idx)"
        >
          <span class="slot-glow"></span>
          {{ ch || '?' }}
        </span>
      </div>
      <div class="slot-tip">点击已填入的符文可撤回</div>
    </div>

    <div class="rune-bank-wrap">
      <div class="bank-title">散落符文</div>
      <div class="rune-bank" :style="{ '--tile-bg': `url(${assets.runeTile})` }">
        <button
          v-for="tile in bankTiles"
          :key="tile.id"
          type="button"
          class="rune-tile"
          :class="{ used: tile.used }"
          :disabled="tile.used"
          @click="pickTile(tile)"
        >
          {{ tile.letter }}
        </button>
      </div>
    </div>

    <div class="rune-actions">
      <button type="button" class="rune-btn ghost" @click="clearSlots">重排符文</button>
      <button type="button" class="rune-btn primary" :disabled="!canSubmit" @click="submitWord">封印确认</button>
      <button type="button" class="rune-btn ghost" @click="skipRound">遁走下一题</button>
    </div>

    <transition name="toast-fade">
      <div v-if="toast" class="rune-toast" :class="toast.type">{{ toast.text }}</div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import type { ArcadeModeDefinition } from '../../data/arcadeModes';
import { sanitizeArcadeWord } from '../../data/arcadeModes';
import { ARCADE_ASSETS } from '../../data/arcadeAssets';

const assets = ARCADE_ASSETS;

export type WordRound = {
  word: string;
  hint: string;
  questionId: string;
};

type BankTile = {
  id: string;
  letter: string;
  used: boolean;
};

const props = defineProps<{
  mode: ArcadeModeDefinition;
  rounds: WordRound[];
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
const slotLetters = ref<string[]>([]);
const bankTiles = ref<BankTile[]>([]);
const feedback = ref<'idle' | 'success' | 'fail'>('idle');
const burst = ref(false);
const lastPopIdx = ref(-1);
const toast = ref<{ type: 'success' | 'fail' | 'info'; text: string } | null>(null);
let timerId: number | null = null;
let toastTimer: number | null = null;
let feedbackTimer: number | null = null;
let burstTimer: number | null = null;

const currentRound = computed(() => props.rounds[roundIndex.value] || null);
const currentWord = computed(() => sanitizeArcadeWord(currentRound.value?.word || ''));
const currentHint = computed(() => currentRound.value?.hint || '加载中...');
const targetLength = computed(() => currentWord.value.length);
const timerPercent = computed(() => Math.max(0, Math.min(100, (timeLeft.value / props.mode.durationSec) * 100)));
const roundProgress = computed(() => ((roundIndex.value) / Math.max(1, props.rounds.length)) * 100);
const canSubmit = computed(() => slotLetters.value.filter(Boolean).length === targetLength.value && targetLength.value > 0);

function buildBank(word: string): BankTile[] {
  const letters = word.split('').filter((c) => /[a-z]/.test(c));
  const decoys = 'aeiostrnlphd'.split('').filter((c) => !letters.includes(c));
  const extra = decoys.sort(() => Math.random() - 0.5).slice(0, Math.min(4, Math.max(2, 6 - letters.length)));
  const pool = [...letters, ...extra].sort(() => Math.random() - 0.5);
  return pool.map((letter, idx) => ({ id: `${letter}-${idx}-${Math.random().toString(36).slice(2, 6)}`, letter, used: false }));
}

function showToast(type: 'success' | 'fail' | 'info', text: string) {
  toast.value = { type, text };
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { toast.value = null; }, 1200);
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

function recordRoundFailure() {
  const qid = String(currentRound.value?.questionId || '').trim();
  if (!qid || failedQuestionIds.value.includes(qid)) return;
  failedQuestionIds.value.push(qid);
}

function loadRound() {
  const word = currentWord.value;
  if (!word) {
    nextRound();
    return;
  }
  roundSolved.value = false;
  misses.value = 0;
  slotLetters.value = Array(word.length).fill('');
  bankTiles.value = buildBank(word);
  lastPopIdx.value = -1;
}

function pickTile(tile: BankTile) {
  if (tile.used) return;
  const emptyIdx = slotLetters.value.findIndex((ch) => !ch);
  if (emptyIdx < 0) return;
  tile.used = true;
  slotLetters.value[emptyIdx] = tile.letter;
  lastPopIdx.value = emptyIdx;
  window.setTimeout(() => { lastPopIdx.value = -1; }, 200);
}

function removeAt(idx: number) {
  const ch = slotLetters.value[idx];
  if (!ch) return;
  const tile = bankTiles.value.find((t) => t.letter === ch && t.used);
  if (tile) tile.used = false;
  slotLetters.value[idx] = '';
}

function clearSlots() {
  bankTiles.value.forEach((t) => { t.used = false; });
  slotLetters.value = slotLetters.value.map(() => '');
}

function applyScore(delta: number) {
  score.value = Math.max(0, score.value + delta);
}

function nextRound() {
  roundIndex.value += 1;
  if (roundIndex.value >= props.rounds.length) {
    finishGame();
    return;
  }
  loadRound();
}

function submitWord() {
  const target = currentWord.value;
  if (!target) return;
  const attempt = slotLetters.value.join('').toLowerCase();
  if (attempt === target) {
    roundSolved.value = true;
    correctCount.value += 1;
    combo.value += 1;
    comboMax.value = Math.max(comboMax.value, combo.value);
    comboPulse.value = true;
    window.setTimeout(() => { comboPulse.value = false; }, 400);
    const mul = Math.min(props.mode.score.comboCap, 1 + combo.value * props.mode.score.comboStep);
    applyScore(Math.round(props.mode.score.basePerAction * mul));
    flashFeedback('success');
    showToast('success', combo.value >= 3 ? `连击 x${combo.value}！符文共鸣` : '拼词正确！');
    window.setTimeout(() => nextRound(), 380);
    return;
  }
  combo.value = 0;
  misses.value += 1;
  applyScore(-props.mode.score.missPenalty);
  flashFeedback('fail');
  showToast('fail', '符文错乱，再试一次');
  clearSlots();
  if (misses.value >= 3) {
    recordRoundFailure();
    applyScore(-props.mode.score.timeoutPenalty);
    showToast('info', '本题符文消散，进入下一符');
    window.setTimeout(() => nextRound(), 500);
    misses.value = 0;
  }
}

function skipRound() {
  combo.value = 0;
  recordRoundFailure();
  applyScore(-props.mode.score.missPenalty);
  showToast('info', '遁走本题');
  nextRound();
}

function finishGame() {
  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }
  if (!roundSolved.value && roundIndex.value < props.rounds.length) {
    recordRoundFailure();
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
.rune-hunt {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 14px;
  border-radius: 16px;
  overflow: hidden;
  min-height: 420px;
  border: 1px solid rgba(82, 214, 255, 0.25);
  box-shadow: inset 0 0 40px rgba(82, 214, 255, 0.06), 0 8px 32px rgba(0, 0, 0, 0.35);
}

.rune-bg-scene {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  opacity: 0.38;
  pointer-events: none;
  z-index: 0;
}

.rune-bg-scene::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(10, 18, 36, 0.3) 0%, rgba(8, 14, 28, 0.88) 60%, rgba(6, 10, 22, 0.95) 100%);
}

.rune-burst {
  position: absolute;
  left: 50%;
  top: 42%;
  transform: translate(-50%, -50%);
  z-index: 20;
  pointer-events: none;
}

.rune-burst img {
  width: 160px;
  height: 160px;
  object-fit: contain;
  animation: burst-pop 0.65s ease-out forwards;
}

@keyframes burst-pop {
  0% { transform: scale(0.4); opacity: 0.2; }
  40% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1.35); opacity: 0; }
}

.rune-bg-glow {
  position: absolute;
  inset: -40% -20%;
  background: radial-gradient(circle at 50% 30%, rgba(255, 215, 120, 0.12), transparent 55%);
  pointer-events: none;
}

.rune-hunt.fx-success {
  animation: flash-success 0.45s ease;
}

.rune-hunt.fx-fail {
  animation: shake-fail 0.45s ease;
}

@keyframes flash-success {
  0%, 100% { box-shadow: inset 0 0 40px rgba(82, 214, 255, 0.06); }
  50% { box-shadow: inset 0 0 60px rgba(125, 255, 158, 0.25); }
}

@keyframes shake-fail {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}

.rune-hud {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  position: relative;
  z-index: 1;
}

.hud-chip {
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(212, 168, 67, 0.25);
  text-align: center;
}

.hud-chip.timer.urgent {
  border-color: rgba(255, 120, 80, 0.6);
  animation: pulse-urgent 1s infinite;
}

.hud-chip.combo.hot {
  border-color: rgba(125, 255, 158, 0.6);
  background: rgba(125, 255, 158, 0.08);
}

.hud-chip.combo.pulse {
  animation: combo-pop 0.4s ease;
}

@keyframes pulse-urgent {
  50% { box-shadow: 0 0 12px rgba(255, 100, 60, 0.35); }
}

@keyframes combo-pop {
  50% { transform: scale(1.06); }
}

.chip-label {
  display: block;
  font-size: 10px;
  color: #8a8a9a;
  margin-bottom: 2px;
}

.chip-value {
  font-size: 16px;
  font-weight: 800;
  color: #ffd978;
}

.timer-bar {
  height: 4px;
  margin-top: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 2px;
  overflow: hidden;
}

.timer-fill {
  height: 100%;
  background: linear-gradient(90deg, #52d6ff, #ffd978);
  transition: width 1s linear;
}

.rune-progress {
  position: relative;
  z-index: 1;
  font-size: 12px;
  color: #a8b4c8;
}

.progress-track {
  height: 6px;
  margin-top: 6px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #7b68ee, #52d6ff);
  transition: width 0.3s ease;
}

.rune-scroll {
  position: relative;
  z-index: 1;
  padding: 16px;
  border-radius: 14px;
  background-color: rgba(0, 0, 0, 0.35);
  background-size: cover;
  background-position: center;
  border: 1px solid rgba(212, 168, 67, 0.35);
  text-align: center;
}

.scroll-deco {
  font-size: 11px;
  letter-spacing: 3px;
  color: #d4a843;
  margin-bottom: 8px;
}

.rune-hint-label {
  font-size: 11px;
  color: #8a8a9a;
}

.rune-hint-text {
  font-size: 22px;
  font-weight: 700;
  color: #f7f3e8;
  margin: 8px 0;
  line-height: 1.4;
}

.rune-task {
  font-size: 12px;
  color: #8cc5ff;
}

.rune-slots-wrap {
  position: relative;
  z-index: 1;
  text-align: center;
}

.rune-slots {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

.rune-slot {
  position: relative;
  width: 48px;
  height: 54px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 2px dashed rgba(212, 168, 67, 0.45);
  font-size: 22px;
  font-weight: 800;
  color: #6a7a8a;
  cursor: pointer;
  transition: transform 0.15s, border-color 0.15s, color 0.15s;
  background-color: rgba(0, 0, 0, 0.35);
  background-image: var(--tile-bg);
  background-size: cover;
  background-position: center;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.7);
}

.rune-slot.filled {
  border-style: solid;
  border-color: #ffd978;
  color: #ffd978;
  background: linear-gradient(180deg, rgba(255, 215, 120, 0.2), rgba(255, 215, 120, 0.05));
  box-shadow: 0 0 16px rgba(255, 215, 120, 0.25);
}

.rune-slot.pop {
  animation: slot-pop 0.2s ease;
}

@keyframes slot-pop {
  50% { transform: scale(1.12); }
}

.slot-glow {
  position: absolute;
  inset: 0;
  border-radius: 8px;
  opacity: 0;
  background: radial-gradient(circle, rgba(255, 215, 120, 0.3), transparent);
}

.rune-slot.filled .slot-glow {
  opacity: 1;
}

.slot-tip {
  margin-top: 8px;
  font-size: 11px;
  color: #6a7a8a;
}

.rune-bank-wrap {
  position: relative;
  z-index: 1;
}

.bank-title {
  text-align: center;
  font-size: 12px;
  color: #52d6ff;
  margin-bottom: 10px;
  letter-spacing: 2px;
}

.rune-bank {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  padding: 12px;
  border-radius: 12px;
  background: rgba(82, 214, 255, 0.04);
  border: 1px dashed rgba(82, 214, 255, 0.2);
}

.rune-tile {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  border: 1px solid rgba(82, 214, 255, 0.5);
  background-color: rgba(30, 60, 90, 0.45);
  background-image: var(--tile-bg);
  background-size: cover;
  background-position: center;
  color: #e8f8ff;
  font-size: 20px;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.12s, box-shadow 0.12s, opacity 0.2s;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.65);
}

.rune-tile:not(:disabled):hover {
  transform: translateY(-3px) scale(1.05);
  box-shadow: 0 6px 20px rgba(82, 214, 255, 0.35);
}

.rune-tile.used {
  opacity: 0;
  transform: scale(0.6);
  pointer-events: none;
}

.rune-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
  position: relative;
  z-index: 1;
}

.rune-btn {
  border: none;
  border-radius: 22px;
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.12s, box-shadow 0.12s;
}

.rune-btn.primary {
  background: linear-gradient(135deg, #d4a843, #a67c2e);
  color: #1a1208;
  box-shadow: 0 4px 16px rgba(212, 168, 67, 0.4);
}

.rune-btn.primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}

.rune-btn.ghost {
  background: rgba(255, 255, 255, 0.06);
  color: #c8b685;
  border: 1px solid rgba(212, 168, 67, 0.3);
}

.rune-btn:not(:disabled):hover {
  transform: translateY(-2px);
}

.rune-toast {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: 700;
  font-size: 15px;
  pointer-events: none;
}

.rune-toast.success {
  background: rgba(125, 255, 158, 0.2);
  border: 1px solid rgba(125, 255, 158, 0.5);
  color: #7dff9e;
}

.rune-toast.fail {
  background: rgba(255, 100, 80, 0.2);
  border: 1px solid rgba(255, 100, 80, 0.5);
  color: #ff9e8a;
}

.rune-toast.info {
  background: rgba(140, 197, 255, 0.15);
  border: 1px solid rgba(140, 197, 255, 0.4);
  color: #a8d4ff;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.25s, transform 0.25s;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -40%);
}
</style>
