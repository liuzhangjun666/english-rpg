<template>
  <div class="listening-module" :style="{ backgroundImage: `url(${moduleBg})` }">
    <div class="listening-overlay"></div>

    <div class="listening-content">
      <div class="mode-banner">
        <img class="mode-icon-img" :src="hallListeningIcon" alt="" aria-hidden="true" />
        <div class="mode-banner-text">
          <span class="mode-title">捕风印</span>
          <span class="mode-sub">听风辨词，印成线索，再破题关</span>
          <span v-if="sceneLabel" class="scene-topic">{{ sceneLabel }}</span>
        </div>
        <div class="chime-collection" :title="`风铃碎片 ${chimeCollectedCount}/${WIND_CHIME_TOPICS.length}`">
          <span class="chime-label">风铃 {{ chimeCollectedCount }}/{{ WIND_CHIME_TOPICS.length }}</span>
          <div class="chime-slots">
            <span
              v-for="topic in WIND_CHIME_TOPICS"
              :key="topic"
              class="chime-slot"
              :class="{ collected: collectedChimes.has(topic) }"
              :style="chimeSlotStyle(topic)"
              :title="WIND_CHIME_LABELS[topic]"
            >
              <img class="chime-slot-icon" :src="windChimeFragment" alt="" aria-hidden="true" />
            </span>
          </div>
        </div>
      </div>

      <div class="material-panel">
        <img class="panel-deco panel-deco-left" :src="windLeafIcon" alt="" aria-hidden="true" />
        <img class="panel-deco panel-deco-right" :src="windLeafIcon" alt="" aria-hidden="true" />
        <div class="panel-label">第一步 · 听风</div>
      <p class="panel-desc">风中有声，记下关键词，莫让风叶散落。</p>
      <button
        class="play-btn"
        :disabled="isPlaying || (hasListened && replayCount >= maxReplays) || !canPlayMaterial"
        @click="handlePlay"
      >
        <img class="play-btn-icon" :src="windBellPlay" alt="" aria-hidden="true" />
        <span class="text">{{ playButtonLabel }}</span>
      </button>
      <div v-if="useTtsFallback && materialText" class="tts-hint">暂无音频，已用浏览器朗读材料</div>
      <div v-if="!materialText" class="tts-hint warn">本题缺少听力材料</div>
      <div class="replay-info">可重听：{{ Math.max(0, maxReplays - replayCount) }} / {{ maxReplays }}</div>
      <div v-if="!hasListened && materialText" class="listen-tip">先听风，再捕叶印诀</div>
    </div>

    <div class="seal-panel" :class="{ muted: !hasListened, complete: sealComplete, shake: sealShake }">
      <img class="seal-panel-bg" :src="sealPanelBg" alt="" aria-hidden="true" />
      <div class="seal-panel-inner">
      <div class="panel-label">第二步 · 捕风印</div>
      <p class="panel-desc">点选风叶，填入印诀空位。印成则现题目。</p>

      <div v-if="puzzle" class="seal-sentence">
        <template v-for="(part, idx) in puzzle.templateParts" :key="`part-${idx}`">
          <span class="seal-text">{{ part }}</span>
          <button
            v-if="idx < puzzle.blanks.length"
            class="seal-slot"
            :class="{
              filled: Boolean(slotTexts[puzzle.blanks[idx].id]),
              correct: sealComplete,
              wrong: wrongSlotId === puzzle.blanks[idx].id,
            }"
            type="button"
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
          class="wind-leaf"
          :class="{ selected: selectedLeafId === leaf.id }"
          type="button"
          :disabled="!hasListened || sealComplete"
          @click="handleLeafClick(leaf.id)"
        >
          <img class="wind-leaf-icon" :src="windLeafIcon" alt="" aria-hidden="true" />
          <span class="wind-leaf-text">{{ leaf.text }}</span>
        </button>
      </div>

      <div v-if="sealComplete" class="seal-success">印诀已成！风纹解锁，可作答矣</div>
      <div v-else-if="hasListened" class="seal-progress">印诀进度 {{ filledBlankCount }} / {{ puzzle?.blanks.length || 0 }}</div>
      </div>
    </div>

    <div v-if="chimeToast" class="chime-toast">{{ chimeToast }}</div>

    <div class="question-panel" :class="{ muted: !sealComplete, unlocked: sealComplete }">
      <div class="panel-label">第三步 · 破风关</div>
      <div class="question-stem">{{ questionStem }}</div>
      <div class="options-container">
        <button
          v-for="(opt, idx) in displayOptions"
          :key="opt.key"
          class="option-btn"
          :class="{ 'is-selected': selectedOption === opt.key }"
          :disabled="isLocked || !sealComplete"
          @click="handleSelect(opt.key)"
        >
          <span class="option-index">{{ idx + 1 }}</span>
          <span class="option-text">{{ opt.text }}</span>
        </button>
      </div>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { useAudioPlayer } from '../../composables/useAudioPlayer';
import { buildWindSeal, isBlankAnswerCorrect, type WindSealPuzzle } from '../../utils/windSealBuilder';
import {
  WIND_CHIME_HUE,
  WIND_CHIME_LABELS,
  WIND_CHIME_TOPICS,
  collectWindChimeFragment,
  normalizeWindChimeTopic,
  readWindChimeFragments,
  sceneImageForTopic,
} from '../../utils/listeningWindChimes';
import valleyBg from '../../../../assets/images/ui/listening/valley_bg.png';
import windLeafIcon from '../../../../assets/images/ui/listening/wind_leaf.png';
import sealPanelBg from '../../../../assets/images/ui/listening/seal_panel.png';
import windBellPlay from '../../../../assets/images/ui/listening/wind_bell_play.png';
import windChimeFragment from '../../../../assets/images/ui/listening/wind_chime_fragment.png';
import hallListeningIcon from '../../../../assets/images/ui/hall_listening.png';

const props = defineProps<{
  question: {
    listening_text?: string;
    question?: string;
    stem?: string;
    word?: string;
    correct_answer?: string;
    audioUrl?: string;
    audio_url?: string;
    wind_seal?: {
      template?: string;
      answers?: string[];
      distractors?: string[];
    };
    options?: Record<string, string> | Array<{ key: string; text: string }>;
  };
}>();

const emit = defineEmits<{
  (e: 'submit-answer', payload: { answer: string }): void;
}>();

const { isPlaying, replayCount, maxReplays, loadAudio, play, resetReplayCount } = useAudioPlayer();

const selectedOption = ref<string | null>(null);
const isLocked = ref(false);
const hasListened = ref(false);
const sealComplete = ref(false);
const sealShake = ref(false);
const wrongSlotId = ref('');
const selectedLeafId = ref<string | null>(null);
const slotTexts = reactive<Record<string, string>>({});
const slotLeafIds = reactive<Record<string, string>>({});
const ttsUtterance = ref<SpeechSynthesisUtterance | null>(null);
const useTtsFallback = ref(false);
const puzzle = ref<WindSealPuzzle | null>(null);
const chimeTick = ref(0);
const chimeToast = ref('');
let chimeToastTimer: ReturnType<typeof setTimeout> | null = null;

const topicKey = computed(() => normalizeWindChimeTopic(String(props.question?.word || '')));
const sceneImage = computed(() => sceneImageForTopic(String(props.question?.word || '')));
const moduleBg = computed(() => (topicKey.value ? sceneImage.value : valleyBg));
const sceneLabel = computed(() => {
  const key = topicKey.value;
  return key ? `${WIND_CHIME_LABELS[key]}风境` : '';
});
const collectedChimes = computed(() => {
  void chimeTick.value;
  return new Set(readWindChimeFragments());
});
const chimeCollectedCount = computed(() => collectedChimes.value.size);

function chimeSlotStyle(topic: (typeof WIND_CHIME_TOPICS)[number]) {
  const collected = collectedChimes.value.has(topic);
  return {
    filter: collected ? `hue-rotate(${WIND_CHIME_HUE[topic]}deg) saturate(1.15)` : 'grayscale(1) opacity(0.35)',
  };
}

function showChimeToast(message: string) {
  chimeToast.value = message;
  if (chimeToastTimer) clearTimeout(chimeToastTimer);
  chimeToastTimer = setTimeout(() => {
    chimeToast.value = '';
  }, 2200);
}

const materialText = computed(() => String(props.question?.listening_text || '').trim());
const questionStem = computed(() => {
  return String(props.question?.question || props.question?.stem || '请根据捕风印诀作答。').trim();
});
const canPlayMaterial = computed(() => {
  const audioUrl = String(props.question?.audioUrl || props.question?.audio_url || '').trim();
  return Boolean(audioUrl || materialText.value);
});
const playButtonLabel = computed(() => {
  if (isPlaying.value) return '播放中...';
  return hasListened.value ? '重听风语' : '播放风语';
});

const displayOptions = computed(() => {
  const raw = props.question?.options;
  if (Array.isArray(raw)) {
    return raw.filter((item) => item.key !== '__wind_seal');
  }
  if (raw && typeof raw === 'object') {
    return Object.entries(raw)
      .filter(([key]) => key !== '__wind_seal')
      .map(([key, text]) => ({ key, text: String(text ?? '') }));
  }
  return [];
});

const availableLeaves = computed(() => {
  if (!puzzle.value) return [];
  const usedIds = new Set(Object.values(slotLeafIds));
  return puzzle.value.leaves.filter((leaf) => !usedIds.has(leaf.id));
});

const filledBlankCount = computed(() => {
  if (!puzzle.value) return 0;
  return puzzle.value.blanks.filter((blank) => Boolean(slotTexts[blank.id])).length;
});

function resetSealState() {
  puzzle.value = buildWindSeal(props.question);
  Object.keys(slotTexts).forEach((key) => delete slotTexts[key]);
  Object.keys(slotLeafIds).forEach((key) => delete slotLeafIds[key]);
  selectedLeafId.value = null;
  sealComplete.value = false;
  sealShake.value = false;
  wrongSlotId.value = '';
}

function stopTts() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  ttsUtterance.value = null;
}

function playWithTts() {
  const text = materialText.value;
  if (!text || typeof window === 'undefined' || !window.speechSynthesis) return;
  stopTts();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.9;
  utterance.onstart = () => { isPlaying.value = true; };
  utterance.onend = () => {
    isPlaying.value = false;
    hasListened.value = true;
  };
  utterance.onerror = () => { isPlaying.value = false; };
  ttsUtterance.value = utterance;
  window.speechSynthesis.speak(utterance);
}

function prepareAudioSource() {
  stopTts();
  const audioUrl = String(props.question?.audioUrl || props.question?.audio_url || '').trim();
  if (audioUrl) {
    useTtsFallback.value = false;
    loadAudio(audioUrl);
    return;
  }
  useTtsFallback.value = materialText.value !== '';
}

function triggerSealShake(slotId: string) {
  wrongSlotId.value = slotId;
  sealShake.value = true;
  window.setTimeout(() => {
    sealShake.value = false;
    wrongSlotId.value = '';
  }, 450);
}

function checkSealComplete() {
  if (!puzzle.value) return;
  const done = puzzle.value.blanks.every((blank) => {
    const placed = slotTexts[blank.id];
    return placed && isBlankAnswerCorrect(blank.answer, placed);
  });
  sealComplete.value = done;
}

function handleLeafClick(leafId: string) {
  if (!hasListened.value || sealComplete.value) return;
  selectedLeafId.value = selectedLeafId.value === leafId ? null : leafId;
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
    triggerSealShake(blankId);
    selectedLeafId.value = null;
    return;
  }

  slotTexts[blankId] = leaf.text;
  slotLeafIds[blankId] = leaf.id;
  selectedLeafId.value = null;
  checkSealComplete();
}

watch(() => props.question, (newQ) => {
  if (!newQ) return;
  prepareAudioSource();
  resetReplayCount();
  isLocked.value = false;
  hasListened.value = false;
  selectedOption.value = null;
  resetSealState();
}, { immediate: true });

onBeforeUnmount(() => {
  stopTts();
  if (chimeToastTimer) clearTimeout(chimeToastTimer);
});

const handlePlay = () => {
  if (!canPlayMaterial.value) return;
  if (hasListened.value && replayCount.value >= maxReplays.value) return;
  if (hasListened.value) replayCount.value += 1;

  if (useTtsFallback.value) {
    playWithTts();
    return;
  }
  play(false);
  hasListened.value = true;
};

const handleSelect = (key: string) => {
  if (isLocked.value || !sealComplete.value) return;
  selectedOption.value = key;
  isLocked.value = true;

  const correctKey = String(props.question?.correct_answer || '').trim().toUpperCase();
  if (correctKey && key.toUpperCase() === correctKey && topicKey.value) {
    const isNew = collectWindChimeFragment(topicKey.value);
    if (isNew) {
      chimeTick.value += 1;
      showChimeToast(`风铃碎片收录 · ${WIND_CHIME_LABELS[topicKey.value]}`);
    }
  }

  emit('submit-answer', { answer: key });
};
</script>

<style scoped>
.listening-module {
  position: relative;
  border-radius: 14px;
  overflow: hidden;
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
  border: 1px solid rgba(168, 245, 255, 0.22);
}

.listening-overlay {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(6, 12, 28, 0.42) 0%, rgba(8, 14, 30, 0.78) 100%),
    radial-gradient(ellipse at center, transparent 0%, rgba(4, 8, 20, 0.35) 100%);
  pointer-events: none;
}

.listening-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 14px;
}

.mode-banner {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(168, 245, 255, 0.28);
  background: linear-gradient(90deg, rgba(56, 189, 248, 0.16), rgba(212, 168, 67, 0.1));
  backdrop-filter: blur(4px);
  flex-wrap: wrap;
}

.mode-banner-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 140px;
}

.mode-icon-img {
  width: 42px;
  height: 42px;
  object-fit: contain;
  filter: drop-shadow(0 0 8px rgba(168, 245, 255, 0.35));
  flex: 0 0 auto;
}
.mode-title {
  font-family: var(--font-title);
  color: #d9f6ff;
  font-size: 16px;
}
.mode-sub {
  font-size: 12px;
  color: #9fd9e8;
}

.scene-topic {
  display: inline-block;
  margin-top: 4px;
  font-size: 11px;
  color: #d9f6ff;
  background: rgba(8, 20, 36, 0.55);
  border: 1px solid rgba(168, 245, 255, 0.28);
  border-radius: 999px;
  padding: 2px 10px;
  width: fit-content;
}

.chime-collection {
  margin-left: auto;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  min-width: 0;
}

.chime-label {
  font-size: 11px;
  color: #c4e8f4;
  white-space: nowrap;
}

.chime-slots {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 3px;
  max-width: 220px;
}

.chime-slot {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background: rgba(8, 16, 32, 0.5);
  transition: filter 0.25s ease, transform 0.2s ease;
}

.chime-slot.collected {
  transform: scale(1.05);
  box-shadow: 0 0 8px rgba(168, 245, 255, 0.35);
}

.chime-slot-icon {
  width: 14px;
  height: 14px;
  object-fit: contain;
  background: transparent;
}

.material-panel,
.seal-panel,
.question-panel {
  position: relative;
  padding: 18px;
  background: rgba(8, 16, 32, 0.62);
  border: 1px solid rgba(212, 168, 67, 0.25);
  border-radius: 12px;
  backdrop-filter: blur(3px);
}

.material-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  overflow: hidden;
}

.panel-deco {
  position: absolute;
  width: 56px;
  height: 56px;
  object-fit: contain;
  opacity: 0.35;
  pointer-events: none;
}

.panel-deco-left {
  left: 8px;
  top: 8px;
  transform: rotate(-18deg);
}

.panel-deco-right {
  right: 8px;
  bottom: 8px;
  transform: rotate(24deg) scaleX(-1);
}

.seal-panel {
  overflow: hidden;
  min-height: 220px;
}

.seal-panel-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.42;
  pointer-events: none;
}

.seal-panel-inner {
  position: relative;
  z-index: 1;
}

.panel-label {
  font-size: 13px;
  color: var(--gold-light);
  font-family: var(--font-title);
  margin-bottom: 8px;
}

.panel-desc {
  margin: 0 0 12px;
  font-size: 12px;
  color: var(--parchment-dark);
  line-height: 1.5;
}

.play-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 22px 10px 14px;
  background: linear-gradient(135deg, rgba(212, 168, 67, 0.95), rgba(180, 140, 50, 0.95));
  border: 1px solid rgba(255, 236, 160, 0.45);
  border-radius: 24px;
  color: #1a1a2e;
  font-weight: bold;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 14px rgba(212, 168, 67, 0.25);
}

.play-btn-icon {
  width: 36px;
  height: 36px;
  object-fit: contain;
  background: transparent;
  filter: drop-shadow(0 0 6px rgba(168, 245, 255, 0.4));
}

.play-btn:disabled {
  background: rgba(212, 168, 67, 0.3);
  color: rgba(255, 255, 255, 0.5);
  cursor: not-allowed;
}

.play-btn:hover:not(:disabled) { transform: scale(1.05); }

.replay-info,
.tts-hint,
.listen-tip {
  font-size: 12px;
  color: var(--parchment-dark);
  text-align: center;
}

.tts-hint.warn { color: #f59e0b; }
.listen-tip { color: #a8f5ff; }

.seal-panel.muted,
.question-panel.muted {
  opacity: 0.68;
}

.seal-panel.complete {
  border-color: rgba(56, 189, 248, 0.45);
  box-shadow: 0 0 18px rgba(56, 189, 248, 0.18);
}

.seal-panel.shake {
  animation: seal-shake 0.45s ease;
}

@keyframes seal-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-6px); }
  75% { transform: translateX(6px); }
}

.seal-sentence {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  line-height: 2;
  font-size: 17px;
  color: #f7f3e8;
  margin-bottom: 14px;
}

.seal-text {
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
}

.seal-slot {
  min-width: 72px;
  min-height: 36px;
  padding: 4px 10px;
  border-radius: 8px;
  border: 1px dashed rgba(168, 245, 255, 0.55);
  background: rgba(8, 20, 36, 0.72);
  color: #a8f5ff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.seal-slot.filled {
  border-style: solid;
  color: #e8fff8;
  background: rgba(16, 185, 129, 0.16);
}

.seal-slot.correct {
  border-color: rgba(52, 211, 153, 0.75);
  box-shadow: 0 0 12px rgba(52, 211, 153, 0.35);
}

.seal-slot.wrong {
  border-color: rgba(248, 113, 113, 0.85);
  animation: slot-wrong 0.35s ease;
}

@keyframes slot-wrong {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.leaf-pool {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.wind-leaf {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px 6px 8px;
  border-radius: 999px;
  border: 1px solid rgba(168, 245, 255, 0.35);
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.22), rgba(212, 168, 67, 0.14));
  color: #e8f7ff;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
}

.wind-leaf-icon {
  width: 28px;
  height: 28px;
  object-fit: contain;
  flex: 0 0 auto;
  background: transparent;
  filter: drop-shadow(0 0 6px rgba(168, 245, 255, 0.4));
}

.wind-leaf-text {
  line-height: 1.2;
}

.wind-leaf:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(56, 189, 248, 0.25);
}

.wind-leaf.selected {
  border-color: rgba(255, 236, 160, 0.9);
  box-shadow: 0 0 14px rgba(255, 236, 160, 0.35);
}

.wind-leaf:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.seal-success {
  margin-top: 10px;
  color: #bbf7d0;
  font-size: 13px;
  text-align: center;
}

.seal-progress {
  margin-top: 10px;
  color: #9fd9e8;
  font-size: 12px;
  text-align: center;
}

.question-panel.unlocked {
  border-color: rgba(212, 168, 67, 0.45);
}

.question-stem {
  font-size: 18px;
  line-height: 1.55;
  color: var(--parchment);
  margin-bottom: 12px;
}

.options-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.option-btn {
  padding: 15px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(212, 168, 67, 0.3);
  border-radius: 8px;
  color: var(--parchment);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.2s;
  text-align: left;
}

.option-btn:hover:not(:disabled) {
  background: rgba(212, 168, 67, 0.1);
}

.option-btn.is-selected {
  background: rgba(212, 168, 67, 0.3);
  border-color: var(--gold);
}

.option-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.option-index {
  color: var(--gold-light);
  font-weight: bold;
}

.chime-toast {
  align-self: center;
  padding: 8px 16px;
  border-radius: 999px;
  background: rgba(16, 185, 129, 0.2);
  border: 1px solid rgba(52, 211, 153, 0.45);
  color: #bbf7d0;
  font-size: 13px;
  animation: chime-toast-in 0.35s ease;
}

@keyframes chime-toast-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
