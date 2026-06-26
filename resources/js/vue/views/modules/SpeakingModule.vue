<template>
  <div class="echo-cliff" :class="`state-${echoState}`">
    <img class="deco-mist deco-mist-l" :src="assets.decoMist" alt="" aria-hidden="true" />
    <img class="deco-mist deco-mist-r" :src="assets.decoMist" alt="" aria-hidden="true" />

    <div v-if="questionStem" class="scene-bubble">
      <img class="scene-bg" :src="assets.contextBubble" alt="" aria-hidden="true" />
      <div class="scene-inner">
        <span class="scene-tag">崖下情境</span>
        <p class="scene-text">{{ questionStem }}</p>
      </div>
    </div>

    <SpeakingEchoStaff
      :sentence="mantraText"
      :staff-tokens="staffTokens"
      :wave-bars="waveBars"
      :is-casting="echoState === 'casting'"
      :is-returned="echoState === 'returned'"
    />

    <div class="staff-tools">
      <button class="btn-listen" type="button" title="听领诵" @click="playDemo">
        <img class="btn-listen-bg" :src="assets.btnListen" alt="" aria-hidden="true" />
        <span class="btn-listen-text">领诵一遍</span>
      </button>
      <span class="tool-hint">共鸣 ≥ {{ Math.round(passThreshold * 100) }}% 即传声过关</span>
    </div>

    <SpeakingRippleBell
      v-if="echoState !== 'returned'"
      :disabled="isJudging"
      :is-casting="echoState === 'casting'"
      @press="handlePress"
      @release="handleRelease"
    />

    <div v-if="isJudging" class="status-line">崖壁辨音中…</div>
    <div v-if="displayError" class="error-text">{{ displayError }}</div>

    <Transition name="echo-slide">
      <div v-if="echoState === 'returned'" class="echo-gallery">
        <img class="gallery-bg" :src="assets.echoGallery" alt="" aria-hidden="true" />
        <div class="gallery-inner">
          <div class="gallery-head">
            <span v-if="echoTier" class="tier-badge" :style="{ color: echoTier.color }">
              {{ echoTier.icon }} {{ echoTier.label }}
            </span>
            <span class="match-badge">{{ Math.round(finalSimilarity * 100) }}% 共鸣</span>
          </div>
          <p class="verdict">{{ verdictText }}</p>

          <div class="echo-compare">
            <div class="echo-line yours">
              <span class="echo-label">你的传声</span>
              <span class="echo-content">{{ finalSpoken || '（未拾到声音）' }}</span>
            </div>
            <div class="echo-divider">⟷ 崖壁回响</div>
            <div class="echo-line target">
              <span class="echo-label">崖上真言</span>
              <span class="echo-content">{{ mantraText }}</span>
            </div>
          </div>

          <div class="gallery-actions">
            <button v-if="!passed && !skippedVerify" class="btn-outline" type="button" @click="retryCast">
              再喊一次
            </button>
            <button class="btn-cast" type="button" @click="handleContinue">
              <span class="btn-cast-text">{{ passed || skippedVerify ? '传声过关 →' : '强行过关（记未过）' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <div v-if="echoState === 'ready' && !asrSupported" class="fallback-row">
      <button class="btn-outline" type="button" @click="handleSkip">无声传声（免麦克风）</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue';
import { useSpeechRecognizer } from '../../composables/useSpeechRecognizer';
import { useSpeakingEcho } from '../../composables/useSpeakingEcho';
import { speakingAssets as assets } from '../../data/speakingAssets';
import SpeakingEchoStaff from '../../components/speaking/SpeakingEchoStaff.vue';
import SpeakingRippleBell from '../../components/speaking/SpeakingRippleBell.vue';
import { getEchoVerdict } from '../../utils/speakingEcho';
import { SPEAKING_PASS_THRESHOLD } from '../../utils/speechSimilarity';

const props = defineProps<{
  question: {
    content?: string;
    expectedText?: string;
    question?: string;
    stem?: string;
    correct_answer?: string;
    options?: Record<string, string>;
  };
}>();

const emit = defineEmits<{
  (e: 'submit-answer', payload: {
    transcript?: string;
    similarity: number;
    passed: boolean;
    skipped?: boolean;
  }): void;
}>();

const {
  isListening,
  transcript,
  error: asrError,
  isSupported,
  start,
  stop,
  reset,
} = useSpeechRecognizer();

const mantraText = computed(() => String(props.question?.expectedText || props.question?.content || '').trim());
const questionStem = computed(() => String(props.question?.question || props.question?.stem || '').trim());
const expectedRef = toRef(() => mantraText.value);

const {
  echoState,
  liveSpoken,
  finalSpoken,
  finalSimilarity,
  staffTokens,
  waveBars,
  echoTier,
  resetEcho,
  startCast,
  returnEcho,
  retryCast,
} = useSpeakingEcho(expectedRef);

const asrSupported = computed(() => isSupported());
const passThreshold = SPEAKING_PASS_THRESHOLD;
const isJudging = ref(false);
const skippedVerify = ref(false);

const displayError = computed(() => asrError.value);
const passed = computed(() => finalSimilarity.value >= passThreshold);
const verdictText = computed(() => getEchoVerdict(finalSimilarity.value, passed.value));

watch(transcript, (val) => {
  if (echoState.value === 'casting') liveSpoken.value = val;
});

watch(() => props.question?.content, () => {
  reset();
  resetEcho();
  isJudging.value = false;
  skippedVerify.value = false;
});

function playDemo() {
  const text = mantraText.value;
  if (!text || typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'en-US';
  utter.rate = 0.88;
  window.speechSynthesis.speak(utter);
}

function handlePress() {
  if (isJudging.value || isListening.value || echoState.value === 'returned') return;
  startCast();
  liveSpoken.value = '';
  reset();
  start();
}

async function handleRelease() {
  if (!isListening.value || isJudging.value) return;
  isJudging.value = true;
  const said = await stop();
  liveSpoken.value = said;
  returnEcho(said);
  isJudging.value = false;
}

function handleContinue() {
  emit('submit-answer', {
    transcript: finalSpoken.value,
    similarity: skippedVerify.value ? 1 : finalSimilarity.value,
    passed: skippedVerify.value ? true : passed.value,
    skipped: skippedVerify.value,
  });
}

function handleSkip() {
  skippedVerify.value = true;
  returnEcho('');
  finalSimilarity.value = 1;
}
</script>

<style scoped>
.echo-cliff {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
  padding: 0 8px 24px;
  color: #d8e8f8;
}

.deco-mist {
  position: absolute;
  width: 140px;
  opacity: 0.45;
  pointer-events: none;
  z-index: 0;
}
.deco-mist-l { top: 120px; left: -20px; }
.deco-mist-r { top: 200px; right: -20px; transform: scaleX(-1); }

.scene-bubble {
  position: relative;
  width: 100%;
  z-index: 1;
}
.scene-bg {
  width: 100%;
  display: block;
}
.scene-inner {
  position: absolute;
  inset: 14% 8% 22% 10%;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.scene-tag {
  font-size: 11px;
  font-weight: 700;
  color: #7ee8ff;
  letter-spacing: 0.08em;
}
.scene-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.55;
  color: #d8e8f8;
}

.staff-tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  z-index: 1;
}
.btn-listen {
  position: relative;
  min-width: 140px;
  height: 40px;
  border: 0;
  background: transparent;
  cursor: pointer;
  padding: 0;
}
.btn-listen-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
}
.btn-listen-text {
  position: relative;
  z-index: 1;
  font-size: 13px;
  font-weight: 700;
  color: #b8e8ff;
  padding-left: 28px;
}
.tool-hint { color: rgba(180, 200, 230, 0.55); }

.status-line {
  text-align: center;
  color: #7ee8ff;
  font-size: 13px;
}
.error-text {
  text-align: center;
  color: #ff9e9e;
  font-size: 12px;
}

.echo-gallery {
  position: relative;
  width: 100%;
  z-index: 1;
  overflow: hidden;
}
.gallery-bg {
  width: 100%;
  display: block;
}
.gallery-inner {
  position: absolute;
  inset: 10% 6% 8%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.gallery-head {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 6px;
  flex-shrink: 0;
}
.tier-badge {
  font-size: 20px;
  font-weight: 800;
}
.match-badge {
  font-size: 13px;
  color: #8ab8d8;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.3);
}

.verdict {
  text-align: center;
  font-size: 13px;
  color: #c8dce8;
  margin: 0 0 10px;
  line-height: 1.5;
  flex-shrink: 0;
}

.echo-compare {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  margin-bottom: 10px;
  padding-right: 2px;
}
.echo-line {
  padding: 8px 10px;
  border-radius: 10px;
  font-size: 12px;
  line-height: 1.45;
}
.echo-line.yours {
  background: rgba(60, 100, 160, 0.2);
  border: 1px solid rgba(100, 160, 220, 0.3);
}
.echo-line.target {
  background: rgba(40, 120, 80, 0.15);
  border: 1px solid rgba(100, 200, 140, 0.25);
}
.echo-label {
  display: block;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  opacity: 0.65;
  margin-bottom: 4px;
}
.echo-content {
  display: block;
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
  color: #e8f4ff;
  word-break: break-word;
  overflow-wrap: anywhere;
}
.echo-divider {
  text-align: center;
  font-size: 11px;
  color: rgba(126, 232, 255, 0.5);
  flex-shrink: 0;
}

.gallery-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  flex-shrink: 0;
  margin-top: auto;
}

.btn-cast {
  padding: 10px 20px;
  min-height: 44px;
  border-radius: 999px;
  border: 1px solid rgba(126, 232, 255, 0.55);
  background: linear-gradient(135deg, #7ecfff 0%, #4da8e8 50%, #2d7ec0 100%);
  box-shadow: 0 2px 10px rgba(45, 126, 192, 0.35);
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}
.btn-cast:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(45, 126, 192, 0.45);
}
.btn-cast-text {
  font-size: 13px;
  font-weight: 800;
  color: #0a1830;
  line-height: 1.3;
}
.btn-outline {
  padding: 10px 18px;
  border-radius: 999px;
  border: 1px solid rgba(126, 232, 255, 0.4);
  background: transparent;
  color: #b8e8ff;
  cursor: pointer;
  font-size: 13px;
}

.fallback-row {
  display: flex;
  justify-content: center;
}

.echo-slide-enter-active {
  animation: echoIn 0.45s ease-out;
}
@keyframes echoIn {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
