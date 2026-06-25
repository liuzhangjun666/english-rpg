<template>
  <div class="forge-hunt" :class="[`fx-${feedback}`, `heat-${heatTier}`, { 'round-enter': roundEnter }]">
    <div class="forge-bg-scene" :style="{ backgroundImage: `url(${assets.bgGrammarForge})` }"></div>
    <div class="forge-bg-glow"></div>
    <div class="forge-embers" aria-hidden="true">
      <span v-for="n in 8" :key="n" class="ember" :style="{ '--i': n }"></span>
    </div>

    <div v-if="burst" class="spark-burst" aria-hidden="true">
      <img class="burst-img" :src="assets.successBurst" alt="">
      <span v-for="n in 12" :key="n" class="spark" :style="{ '--a': n }"></span>
    </div>

    <div class="forge-hud">
      <div class="hud-chip timer" :class="{ urgent: timeLeft <= 20 }">
        <span class="chip-label">铸炉时漏</span>
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

    <div class="forge-progress">
      <span>第 {{ roundIndex + 1 }} / {{ rounds.length }} 句 · {{ phaseLabel }}</span>
      <div class="progress-track">
        <div class="progress-fill" :style="{ width: `${roundProgress}%` }"></div>
      </div>
    </div>

    <div class="forge-core">
      <div class="furnace" :class="{ shake: feedback === 'fail', strike: hammerStrike }">
        <div class="furnace-ring"></div>
        <div class="furnace-flame" :style="{ opacity: heatOpacity }"></div>
        <img class="furnace-icon" :src="assets.furnaceCore" alt="铸炉">
        <div class="heat-bar">
          <span class="heat-label">炉温</span>
          <div class="heat-track">
            <div class="heat-fill" :style="{ width: `${heatPercent}%` }"></div>
          </div>
        </div>
        <div class="flame-lives" title="本句剩余熔铸机会">
          <span
            v-for="n in MAX_MISSES"
            :key="n"
            class="flame-pip"
            :class="{ out: n > MAX_MISSES - misses }"
          >🔥</span>
        </div>
      </div>

      <div class="forge-scroll" :class="[scrollVariant, { 'scroll-revealed': revealedAnalysis }]" :style="{ backgroundImage: `url(${assets.scrollPanel})` }">
        <div class="scroll-deco">✦ 句式铸炉 ✦</div>
        <template v-if="revealedAnalysis">
          <div class="forge-hint-label">天机解析</div>
          <div class="forge-hint-text analysis-text">{{ currentAnalysis }}</div>
          <div class="forge-task">悟此要诀，再择词块重铸</div>
        </template>
        <template v-else>
          <div class="forge-hint-label">铸句要诀</div>
          <div class="forge-hint-text task-text">{{ taskLine }}</div>
          <div class="forge-task">天机未露 · 答错后方可窥探解析</div>
        </template>
      </div>
    </div>

    <div class="forge-sentence" :class="{ complete: roundSolvedFlash, glow: !!selectedLabel }">
      <span v-if="currentRound?.stemBefore" class="stem-part">{{ currentRound.stemBefore }}</span>
      <span
        class="forge-slot"
        :class="{ filled: !!selectedLabel, pop: slotPop, landing: tileLanding }"
        @click="clearSelection"
        @dragover.prevent
        @drop.prevent="onSlotDrop"
      >
        <span v-if="!selectedLabel" class="slot-placeholder">?</span>
        <span v-else class="slot-word">{{ selectedLabel }}</span>
      </span>
      <span v-if="currentRound?.stemAfter" class="stem-part">{{ currentRound.stemAfter }}</span>
    </div>
    <div class="slot-tip">点击句槽可撤回词块 · 选对后全句会共鸣发光</div>

    <div class="forge-bank-wrap">
      <div class="bank-title">散落词块 <span class="bank-sub">（点选或拖入句槽）</span></div>
      <div class="forge-bank" :style="{ '--tile-bg': `url(${assets.wordTile})` }">
        <button
          v-for="(tile, idx) in bankTiles"
          :key="tile.id"
          type="button"
          class="forge-tile"
          :class="{ used: tile.used, active: selectedKey === tile.key, 'tile-in': roundEnter }"
          :style="{ '--delay': `${idx * 55}ms` }"
          :disabled="tile.used"
          draggable="true"
          @click="pickTile(tile)"
          @dragstart="onDragStart(tile, $event)"
          @dragend="onDragEnd"
        >
          <span class="tile-shine"></span>
          {{ tile.label }}
        </button>
      </div>
    </div>

    <div class="forge-actions">
      <button type="button" class="forge-btn ghost" data-btn-skin="重排词块" @click="clearSelection">重排词块</button>
      <button
        type="button"
        class="forge-btn primary"
        data-btn-skin="熔铸确认"
        :disabled="!canSubmit"
        @click="submitAnswer"
      >
        <span class="btn-hammer"><img :src="assets.hammerStrike" alt=""></span> 熔铸确认
      </button>
      <button type="button" class="forge-btn ghost" data-btn-skin="遁走下一句" @click="skipRound">遁走下一句</button>
    </div>

    <transition name="toast-fade">
      <div v-if="toast" class="forge-toast" :class="toast.type">
        <span v-if="toast.emoji" class="toast-emoji">{{ toast.emoji }}</span>
        {{ toast.text }}
      </div>
    </transition>

    <transition name="verse-fade">
      <div v-if="verseLine" class="forge-verse">{{ verseLine }}</div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import type { ArcadeModeDefinition } from '../../data/arcadeModes';
import type { GrammarForgeRound } from '../../data/grammarArcade';
import { ARCADE_ASSETS } from '../../data/arcadeAssets';

const assets = ARCADE_ASSETS;

const MAX_MISSES = 4;

const PHASE_LABELS = ['凝句', '淬火', '锻形', '回火', '开光'];
const SUCCESS_VERSES = [
  '句式成型，剑意通顺。',
  '炉火正旺，语法共鸣！',
  '一锤定音，句读生光。',
  '铸句成功，灵纹浮现。',
  '文锋锐利，结构稳固。',
];
const TASK_LINES = [
  '将正确词块熔铸入句槽，组成本句',
  '结合句意与时态，挑选最合语法的词块',
  '句槽只容一词，熔铸前可重选',
];

const props = defineProps<{
  mode: ArcadeModeDefinition;
  rounds: GrammarForgeRound[];
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

type BankTile = GrammarForgeRound['tokens'][number] & { used: boolean };

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
const selectedKey = ref('');
const bankTiles = ref<BankTile[]>([]);
const feedback = ref<'idle' | 'success' | 'fail'>('idle');
const slotPop = ref(false);
const tileLanding = ref(false);
const roundEnter = ref(false);
const burst = ref(false);
const hammerStrike = ref(false);
const roundSolvedFlash = ref(false);
const verseLine = ref('');
const revealedAnalysis = ref(false);
const toast = ref<{ type: 'success' | 'fail' | 'info'; text: string; emoji?: string } | null>(null);
let timerId: number | null = null;
let toastTimer: number | null = null;
let feedbackTimer: number | null = null;
let verseTimer: number | null = null;
let burstTimer: number | null = null;
let dragTileKey = '';

const currentRound = computed(() => props.rounds[roundIndex.value] || null);
const currentAnalysis = computed(() => currentRound.value?.hint || '暂无解析');
const selectedLabel = computed(() => {
  const key = selectedKey.value;
  if (!key) return '';
  return bankTiles.value.find((t) => t.key === key)?.label || '';
});
const timerPercent = computed(() => Math.max(0, Math.min(100, (timeLeft.value / props.mode.durationSec) * 100)));
const roundProgress = computed(() => ((roundIndex.value + (roundSolved.value ? 1 : 0)) / Math.max(1, props.rounds.length)) * 100);
const canSubmit = computed(() => !!selectedKey.value);

const heatTier = computed(() => {
  if (combo.value >= 8) return 'legend';
  if (combo.value >= 5) return 'high';
  if (combo.value >= 3) return 'mid';
  return 'low';
});

const comboTitle = computed(() => {
  if (combo.value >= 8) return '仙火连击';
  if (combo.value >= 5) return '天火连击';
  if (combo.value >= 3) return '武火连击';
  return '连击';
});

const heatPercent = computed(() => Math.min(100, 18 + combo.value * 9 + (selectedLabel.value ? 8 : 0)));
const heatOpacity = computed(() => 0.35 + Math.min(0.65, combo.value * 0.07));

const phaseLabel = computed(() => PHASE_LABELS[roundIndex.value % PHASE_LABELS.length]);
const scrollVariant = computed(() => (roundIndex.value % 3 === 1 ? 'scroll-ember' : roundIndex.value % 3 === 2 ? 'scroll-frost' : 'scroll-azure'));
const taskLine = computed(() => TASK_LINES[roundIndex.value % TASK_LINES.length]);

function showToast(type: 'success' | 'fail' | 'info', text: string, emoji = '') {
  toast.value = { type, text, emoji: emoji || undefined };
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { toast.value = null; }, 1400);
}

function showVerse(line: string) {
  verseLine.value = line;
  if (verseTimer) clearTimeout(verseTimer);
  verseTimer = window.setTimeout(() => { verseLine.value = ''; }, 1600);
}

function flashBurst() {
  burst.value = true;
  if (burstTimer) clearTimeout(burstTimer);
  burstTimer = window.setTimeout(() => { burst.value = false; }, 700);
}

function flashFeedback(type: 'success' | 'fail') {
  feedback.value = type;
  if (feedbackTimer) clearTimeout(feedbackTimer);
  feedbackTimer = window.setTimeout(() => { feedback.value = 'idle'; }, 450);
}

function triggerHammer() {
  hammerStrike.value = true;
  window.setTimeout(() => { hammerStrike.value = false; }, 320);
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
  const round = currentRound.value;
  if (!round) {
    nextRound();
    return;
  }
  roundSolved.value = false;
  roundSolvedFlash.value = false;
  revealedAnalysis.value = false;
  misses.value = 0;
  selectedKey.value = '';
  bankTiles.value = round.tokens.map((t) => ({ ...t, used: false }));
  animateRoundEnter();
}

function pickTile(tile: BankTile) {
  if (tile.used) return;
  if (selectedKey.value) {
    const prev = bankTiles.value.find((t) => t.key === selectedKey.value);
    if (prev) prev.used = false;
  }
  tile.used = true;
  selectedKey.value = tile.key;
  slotPop.value = true;
  tileLanding.value = true;
  window.setTimeout(() => {
    slotPop.value = false;
    tileLanding.value = false;
  }, 260);
}

function onDragStart(tile: BankTile, event: DragEvent) {
  if (tile.used) {
    event.preventDefault();
    return;
  }
  dragTileKey = tile.key;
  event.dataTransfer?.setData('text/plain', tile.key);
  event.dataTransfer?.setDragImage(event.target as HTMLElement, 20, 16);
}

function onDragEnd() {
  dragTileKey = '';
}

function onSlotDrop(event: DragEvent) {
  event.preventDefault();
  const key = event.dataTransfer?.getData('text/plain') || dragTileKey;
  const tile = bankTiles.value.find((t) => t.key === key);
  if (tile) pickTile(tile);
}

function clearSelection() {
  bankTiles.value.forEach((t) => { t.used = false; });
  selectedKey.value = '';
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

function submitAnswer() {
  const round = currentRound.value;
  if (!round || !selectedKey.value) return;
  triggerHammer();

  if (selectedKey.value === round.correctKey) {
    roundSolved.value = true;
    roundSolvedFlash.value = true;
    correctCount.value += 1;
    combo.value += 1;
    comboMax.value = Math.max(comboMax.value, combo.value);
    comboPulse.value = true;
    window.setTimeout(() => { comboPulse.value = false; }, 400);
    const mul = Math.min(props.mode.score.comboCap, 1 + combo.value * props.mode.score.comboStep);
    applyScore(Math.round(props.mode.score.basePerAction * mul));
    flashFeedback('success');
    flashBurst();
    const emoji = combo.value >= 5 ? '✨' : combo.value >= 3 ? '🔥' : '⚒';
    showToast(
      'success',
      combo.value >= 8 ? `仙火 x${combo.value}！句式通神` : combo.value >= 3 ? `连击 x${combo.value}！句式共鸣` : '铸句正确！',
      emoji,
    );
    showVerse(SUCCESS_VERSES[roundIndex.value % SUCCESS_VERSES.length]);
    window.setTimeout(() => nextRound(), 520);
    return;
  }

  combo.value = 0;
  misses.value += 1;
  revealedAnalysis.value = true;
  applyScore(-props.mode.score.missPenalty);
  flashFeedback('fail');
  showToast('fail', misses.value >= MAX_MISSES - 1 ? '炉温骤降，再错则熄' : '词块熔铸失败，再试一次', '💨');
  clearSelection();
  if (misses.value >= MAX_MISSES) {
    recordRoundFailure();
    applyScore(-props.mode.score.timeoutPenalty);
    showToast('info', '本句熔炉熄灭，进入下一句', '🌑');
    window.setTimeout(() => nextRound(), 550);
    misses.value = 0;
  }
}

function skipRound() {
  combo.value = 0;
  recordRoundFailure();
  applyScore(-props.mode.score.missPenalty);
  showToast('info', '遁走下一句', '🌫');
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
  if (verseTimer) clearTimeout(verseTimer);
  if (burstTimer) clearTimeout(burstTimer);
});
</script>

<style scoped>
.forge-hunt {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 4px 2px 8px;
  border-radius: 14px;
  overflow: hidden;
  min-height: 420px;
}

.forge-bg-scene {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center top;
  opacity: 0.42;
  pointer-events: none;
  z-index: 0;
}

.forge-bg-scene::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(6, 14, 32, 0.35) 0%, rgba(6, 14, 32, 0.82) 55%, rgba(4, 10, 24, 0.94) 100%);
}

.forge-hunt.fx-success {
  animation: forge-flash-ok 0.45s ease;
}

.forge-hunt.fx-fail {
  animation: forge-flash-bad 0.45s ease;
}

.forge-hunt.heat-mid .forge-bg-glow {
  background: radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255, 160, 80, 0.14), transparent 70%);
}

.forge-hunt.heat-high .forge-bg-glow,
.forge-hunt.heat-legend .forge-bg-glow {
  background: radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255, 120, 60, 0.2), transparent 70%);
}

@keyframes forge-flash-ok {
  0%, 100% { box-shadow: inset 0 0 0 0 transparent; }
  50% { box-shadow: inset 0 0 48px rgba(95, 211, 248, 0.28); }
}

@keyframes forge-flash-bad {
  0%, 100% { box-shadow: inset 0 0 0 0 transparent; }
  50% { box-shadow: inset 0 0 40px rgba(255, 100, 100, 0.22); }
}

.forge-bg-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 80% 50% at 50% 0%, rgba(39, 152, 245, 0.12), transparent 70%);
  pointer-events: none;
  transition: background 0.4s ease;
}

.forge-embers {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.ember {
  position: absolute;
  bottom: -8px;
  left: calc(10% + var(--i) * 10%);
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: rgba(255, 180, 90, 0.7);
  animation: ember-rise 4s ease-in infinite;
  animation-delay: calc(var(--i) * 0.35s);
  opacity: 0;
}

@keyframes ember-rise {
  0% { transform: translateY(0) scale(1); opacity: 0; }
  15% { opacity: 0.85; }
  100% { transform: translateY(-120px) scale(0.2); opacity: 0; }
}

.spark-burst {
  position: absolute;
  left: 50%;
  top: 38%;
  width: 0;
  height: 0;
  z-index: 30;
  pointer-events: none;
}

.burst-img {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 180px;
  height: 180px;
  transform: translate(-50%, -50%);
  object-fit: contain;
  animation: burst-pop 0.65s ease-out forwards;
  opacity: 0.9;
}

@keyframes burst-pop {
  0% { transform: translate(-50%, -50%) scale(0.4); opacity: 0.2; }
  40% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(1.35); opacity: 0; }
}

.spark {
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ffe9a8;
  box-shadow: 0 0 8px #5fd3f8;
  animation: spark-fly 0.65s ease-out forwards;
  transform: rotate(calc(var(--a) * 30deg)) translateX(0);
}

@keyframes spark-fly {
  to {
    transform: rotate(calc(var(--a) * 30deg)) translateX(72px);
    opacity: 0;
  }
}

.forge-hud {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  position: relative;
  z-index: 1;
}

.hud-chip {
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid rgba(95, 211, 248, 0.25);
  background: rgba(8, 20, 42, 0.55);
  text-align: center;
}

.hud-chip.timer.urgent {
  border-color: rgba(255, 140, 100, 0.55);
  animation: forge-pulse 1s infinite;
}

@keyframes forge-pulse {
  50% { box-shadow: 0 0 12px rgba(255, 140, 100, 0.35); }
}

.chip-label {
  display: block;
  font-size: 10px;
  color: #7eb8d8;
  margin-bottom: 2px;
}

.chip-value {
  display: block;
  font-size: 18px;
  font-weight: 800;
  color: #d4f0ff;
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
  background: linear-gradient(90deg, #2798f5, #5fd3f8);
  transition: width 0.3s ease;
}

.hud-chip.combo.hot .chip-value {
  color: #ffe9a8;
  text-shadow: 0 0 12px rgba(255, 200, 80, 0.45);
}

.hud-chip.combo.pulse {
  animation: combo-pop 0.4s ease;
}

@keyframes combo-pop {
  50% { transform: scale(1.08); }
}

.forge-progress {
  position: relative;
  z-index: 1;
  font-size: 12px;
  color: #8cb8d4;
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
  background: linear-gradient(90deg, #1a6eb8, #5fd3f8);
  transition: width 0.35s ease;
}

.forge-core {
  display: grid;
  grid-template-columns: minmax(100px, 130px) 1fr;
  gap: 12px;
  align-items: stretch;
  position: relative;
  z-index: 1;
}

.furnace {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 8px;
  border-radius: 14px;
  border: 1px solid rgba(255, 160, 80, 0.35);
  background: linear-gradient(180deg, rgba(40, 18, 8, 0.75), rgba(12, 20, 42, 0.85));
  min-height: 140px;
}

.furnace.shake {
  animation: furnace-shake 0.4s ease;
}

.furnace.strike {
  animation: furnace-strike 0.32s ease;
}

@keyframes furnace-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}

@keyframes furnace-strike {
  0%, 100% { transform: scale(1); }
  40% { transform: scale(0.96); }
  70% { transform: scale(1.03); }
}

.furnace-ring {
  position: absolute;
  inset: 8px;
  border-radius: 12px;
  border: 1px dashed rgba(255, 180, 100, 0.25);
  pointer-events: none;
}

.furnace-flame {
  position: absolute;
  bottom: 10px;
  left: 50%;
  width: 56px;
  height: 48px;
  transform: translateX(-50%);
  background: radial-gradient(ellipse at center bottom, rgba(255, 140, 40, 0.9), rgba(255, 80, 20, 0.2) 55%, transparent 70%);
  filter: blur(2px);
  animation: flame-flicker 1.2s ease-in-out infinite alternate;
  pointer-events: none;
  transition: opacity 0.3s ease;
}

@keyframes flame-flicker {
  from { transform: translateX(-50%) scaleY(0.92); }
  to { transform: translateX(-50%) scaleY(1.08); }
}

.furnace-icon {
  width: 72px;
  height: 72px;
  object-fit: contain;
  z-index: 1;
  filter: drop-shadow(0 0 10px rgba(255, 200, 100, 0.45));
}

.heat-bar {
  width: 100%;
  padding: 0 6px;
  z-index: 1;
}

.heat-label {
  display: block;
  font-size: 9px;
  color: #c9a06a;
  text-align: center;
  margin-bottom: 4px;
}

.heat-track {
  height: 5px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.4);
  overflow: hidden;
}

.heat-fill {
  height: 100%;
  background: linear-gradient(90deg, #4a8cff, #ffb347, #ff6b3d);
  transition: width 0.35s ease;
}

.flame-lives {
  display: flex;
  gap: 2px;
  font-size: 12px;
  z-index: 1;
}

.flame-pip {
  transition: opacity 0.25s, filter 0.25s;
}

.flame-pip.out {
  opacity: 0.25;
  filter: grayscale(1);
}

.forge-scroll {
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid rgba(95, 211, 248, 0.28);
  background-color: rgba(8, 18, 36, 0.55);
  background-size: cover;
  background-position: center;
  text-align: center;
  transition: border-color 0.3s, box-shadow 0.3s;
}

.forge-scroll.scroll-ember {
  border-color: rgba(255, 160, 90, 0.35);
  box-shadow: inset 0 0 24px rgba(255, 120, 40, 0.06);
}

.forge-scroll.scroll-frost {
  border-color: rgba(140, 220, 255, 0.4);
  box-shadow: inset 0 0 20px rgba(95, 211, 248, 0.08);
}

.scroll-deco {
  font-size: 11px;
  color: #5fd3f8;
  letter-spacing: 2px;
  margin-bottom: 8px;
}

.forge-hint-label {
  font-size: 11px;
  color: #7eb8d8;
  margin-bottom: 6px;
}

.forge-scroll.scroll-revealed {
  border-color: rgba(255, 180, 100, 0.45);
  box-shadow: inset 0 0 28px rgba(255, 140, 60, 0.1), 0 0 20px rgba(255, 160, 80, 0.12);
  animation: scroll-reveal 0.45s ease;
}

@keyframes scroll-reveal {
  0% { filter: brightness(0.85); }
  50% { filter: brightness(1.15); }
  100% { filter: brightness(1); }
}

.forge-hint-text {
  font-size: 15px;
  line-height: 1.55;
  font-weight: 600;
}

.forge-hint-text.task-text {
  font-size: 14px;
  color: #a8cce8;
  font-weight: 500;
}

.forge-hint-text.analysis-text {
  color: #ffe9c8;
}

.forge-task {
  margin-top: 8px;
  font-size: 12px;
  color: #7eb8d8;
}

.forge-sentence {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 12px;
  border-radius: 12px;
  border: 1px dashed rgba(95, 211, 248, 0.35);
  background: rgba(8, 20, 42, 0.4);
  font-size: clamp(14px, 2vw, 18px);
  line-height: 1.5;
  color: #d4ecff;
  transition: box-shadow 0.3s, border-color 0.3s;
}

.forge-sentence.glow {
  border-color: rgba(255, 217, 120, 0.45);
  box-shadow: 0 0 16px rgba(95, 211, 248, 0.12);
}

.forge-sentence.complete {
  border-color: rgba(95, 211, 248, 0.65);
  box-shadow: 0 0 28px rgba(95, 211, 248, 0.35);
  animation: sentence-complete 0.55s ease;
}

@keyframes sentence-complete {
  0% { transform: scale(1); }
  45% { transform: scale(1.02); }
  100% { transform: scale(1); }
}

.stem-part {
  text-align: center;
}

.forge-slot {
  min-width: 80px;
  min-height: 40px;
  padding: 4px 14px;
  border-radius: 10px;
  border: 2px solid rgba(95, 211, 248, 0.45);
  background: rgba(39, 152, 245, 0.15);
  color: #a8d4ff;
  font-weight: 700;
  text-align: center;
  cursor: pointer;
  transition: transform 0.15s, border-color 0.15s, background 0.15s;
}

.forge-slot.filled {
  color: #fff8e8;
  border-color: rgba(255, 217, 120, 0.55);
  background: rgba(212, 168, 67, 0.22);
}

.forge-slot.pop,
.forge-slot.landing {
  animation: slot-pop 0.26s ease;
}

.slot-placeholder {
  opacity: 0.45;
  font-size: 20px;
}

@keyframes slot-pop {
  50% { transform: scale(1.1); }
}

.slot-tip {
  text-align: center;
  font-size: 11px;
  color: #6a9ab8;
  margin-top: -6px;
}

.forge-bank-wrap {
  position: relative;
  z-index: 1;
}

.bank-title {
  font-size: 12px;
  color: #7eb8d8;
  margin-bottom: 8px;
  text-align: center;
}

.bank-sub {
  font-size: 10px;
  color: #5a8aa8;
}

.forge-bank {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

.forge-tile {
  position: relative;
  overflow: hidden;
  min-width: 72px;
  max-width: 160px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid rgba(95, 211, 248, 0.45);
  background-color: rgba(12, 28, 52, 0.55);
  background-image: var(--tile-bg);
  background-size: cover;
  background-position: center;
  color: #eef8ff;
  font-size: 14px;
  font-weight: 600;
  cursor: grab;
  transition: transform 0.15s, opacity 0.15s;
  word-break: break-word;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.65);
}

.forge-tile.tile-in {
  animation: tile-in 0.45s ease backwards;
  animation-delay: var(--delay, 0ms);
}

@keyframes tile-in {
  from {
    opacity: 0;
    transform: translateY(14px) scale(0.92);
  }
}

.tile-shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, transparent 30%, rgba(255, 255, 255, 0.12) 50%, transparent 70%);
  transform: translateX(-100%);
  animation: tile-shine 2.5s ease-in-out infinite;
}

@keyframes tile-shine {
  0%, 100% { transform: translateX(-100%); }
  50% { transform: translateX(100%); }
}

.forge-tile:hover:not(:disabled) {
  transform: translateY(-3px);
}

.forge-tile.used {
  opacity: 0.32;
  cursor: not-allowed;
}

.forge-tile.active:not(.used) {
  border-color: rgba(255, 217, 120, 0.7);
  box-shadow: 0 0 12px rgba(255, 217, 120, 0.3);
}

.forge-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  position: relative;
  z-index: 1;
}

.forge-btn.primary .btn-hammer {
  display: inline-flex;
  align-items: center;
  margin-right: 4px;
}

.forge-btn.primary .btn-hammer img {
  width: 20px;
  height: 20px;
  object-fit: contain;
  vertical-align: middle;
}

.forge-btn {
  border-radius: 10px;
  padding: 10px 18px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid transparent;
}

.forge-btn.primary {
  border-color: rgba(95, 211, 248, 0.55);
  background: linear-gradient(180deg, rgba(39, 152, 245, 0.5), rgba(20, 90, 160, 0.65));
  color: #fff8e8;
}

.forge-btn.primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.forge-btn.ghost {
  border-color: rgba(95, 211, 248, 0.3);
  background: rgba(8, 20, 42, 0.5);
  color: #a8d4ff;
}

.forge-btn:not(:disabled):hover {
  filter: brightness(1.08);
}

.btn-hammer {
  display: inline-block;
  transition: transform 0.15s;
}

.forge-btn.primary:not(:disabled):active .btn-hammer {
  transform: rotate(-28deg) scale(1.1);
}

.forge-toast {
  position: absolute;
  left: 50%;
  top: 40%;
  transform: translate(-50%, -50%);
  z-index: 20;
  padding: 12px 20px;
  border-radius: 12px;
  font-weight: 700;
  font-size: 15px;
  pointer-events: none;
  display: flex;
  align-items: center;
  gap: 8px;
}

.toast-emoji {
  font-size: 18px;
}

.forge-toast.success {
  background: rgba(39, 152, 245, 0.92);
  color: #fff;
  box-shadow: 0 0 24px rgba(95, 211, 248, 0.55);
}

.forge-toast.fail {
  background: rgba(180, 60, 60, 0.9);
  color: #fff;
}

.forge-toast.info {
  background: rgba(40, 60, 90, 0.92);
  color: #d4ecff;
  border: 1px solid rgba(95, 211, 248, 0.35);
}

.forge-verse {
  position: absolute;
  left: 50%;
  bottom: 18%;
  transform: translateX(-50%);
  z-index: 19;
  padding: 8px 16px;
  border-radius: 999px;
  font-size: 13px;
  color: #ffe9c8;
  background: rgba(20, 40, 70, 0.88);
  border: 1px solid rgba(255, 200, 100, 0.35);
  pointer-events: none;
  white-space: nowrap;
}

.verse-fade-enter-active,
.verse-fade-leave-active,
.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.28s ease, transform 0.28s ease;
}

.verse-fade-enter-from,
.verse-fade-leave-to,
.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -40%);
}

@media (max-width: 640px) {
  .forge-core {
    grid-template-columns: 1fr;
  }

  .furnace {
    flex-direction: row;
    flex-wrap: wrap;
    min-height: auto;
    padding: 10px 12px;
  }

  .furnace-flame {
    display: none;
  }
}
</style>
