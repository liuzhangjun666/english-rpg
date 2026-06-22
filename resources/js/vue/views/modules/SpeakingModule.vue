<template>
  <div class="speaking-module">
    <div v-if="!asrSupported" class="beta-banner warn">
      当前浏览器不支持语音识别，请使用 Chrome / Edge，或点下方按钮手动继续。
    </div>
    <div v-else class="beta-banner">
      按住按钮朗读英文句子，松开后自动识别并判分（相似度 ≥ {{ Math.round(passThreshold * 100) }}% 为通过）
    </div>

    <div class="question-display">
      <div class="title">请朗读以下句子：</div>
      <div class="sentence">{{ question.content }}</div>
    </div>

    <div class="recorder-container">
      <button
        class="record-btn"
        :class="{ 'is-recording': isListening }"
        :disabled="isJudging"
        @mousedown="handleStart"
        @mouseup="handleStop"
        @mouseleave="handleStop"
        @touchstart.prevent="handleStart"
        @touchend.prevent="handleStop"
      >
        {{ isListening ? '松开识别' : '按住朗读' }}
      </button>

      <button class="skip-btn" type="button" :disabled="isJudging" @click="handleSkip">
        已完成朗读，继续（免识别）
      </button>

      <div v-if="isJudging" class="status-text">识别中...</div>
      <div v-if="displayError" class="error-text">{{ displayError }}</div>

      <div v-if="lastResult" class="result-box" :class="lastResult.passed ? 'pass' : 'fail'">
        <div class="result-line">识别：{{ lastResult.transcript || '（未识别到内容）' }}</div>
        <div class="result-line">相似度：{{ Math.round(lastResult.similarity * 100) }}%</div>
        <div class="result-verdict">{{ lastResult.passed ? '诵读通过' : '尚未达标，可再试一次' }}</div>
        <button
          v-if="!lastResult.passed"
          class="skip-btn fail-next"
          type="button"
          @click="handleContinueAfterFail"
        >
          继续下一题（记为未通过）
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useSpeechRecognizer } from '../../composables/useSpeechRecognizer';
import { speechSimilarity, SPEAKING_PASS_THRESHOLD } from '../../utils/speechSimilarity';

const props = defineProps<{
  question: {
    content?: string;
    expectedText?: string;
    correctAnswerKey?: string;
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

const asrSupported = computed(() => isSupported());
const passThreshold = SPEAKING_PASS_THRESHOLD;
const isJudging = ref(false);
const lastResult = ref<{ transcript: string; similarity: number; passed: boolean } | null>(null);
const displayError = computed(() => asrError.value);

watch(() => props.question?.content, () => {
  reset();
  lastResult.value = null;
  isJudging.value = false;
});

function expectedText(): string {
  return String(
    props.question?.expectedText ||
    props.question?.content ||
    ''
  ).trim();
}

async function handleStart() {
  if (isJudging.value || isListening.value) return;
  lastResult.value = null;
  reset();
  start();
}

async function handleStop() {
  if (!isListening.value || isJudging.value) return;
  isJudging.value = true;
  const said = await stop();
  const expected = expectedText();
  const similarity = speechSimilarity(expected, said);
  const passed = similarity >= passThreshold;
  lastResult.value = { transcript: said, similarity, passed };
  isJudging.value = false;

  if (passed) {
    emit('submit-answer', { transcript: said, similarity, passed: true, skipped: false });
  }
}

function handleContinueAfterFail() {
  if (!lastResult.value) return;
  emit('submit-answer', {
    transcript: lastResult.value.transcript,
    similarity: lastResult.value.similarity,
    passed: false,
    skipped: false,
  });
}

function handleSkip() {
  lastResult.value = { transcript: '', similarity: 1, passed: true };
  emit('submit-answer', { transcript: '', similarity: 1, passed: true, skipped: true });
}
</script>

<style scoped>
.speaking-module {
  display: flex;
  flex-direction: column;
  gap: 24px;
  align-items: center;
  padding: 20px 0;
  width: 100%;
}
.beta-banner {
  width: 100%;
  max-width: 560px;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid rgba(212, 168, 67, 0.35);
  background: rgba(212, 168, 67, 0.08);
  color: #e8dcc8;
  font-size: 13px;
  line-height: 1.5;
  text-align: center;
}
.beta-banner.warn {
  border-color: rgba(255, 107, 107, 0.35);
  background: rgba(255, 107, 107, 0.08);
}
.question-display {
  text-align: center;
  max-width: 640px;
}
.title {
  font-size: 14px;
  color: var(--parchment-dark);
  margin-bottom: 10px;
}
.sentence {
  font-size: 24px;
  color: var(--gold);
  line-height: 1.5;
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
}
.recorder-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
  max-width: 560px;
}
.record-btn {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: rgba(26, 26, 46, 0.8);
  border: 2px solid var(--gold);
  color: var(--gold-light);
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
}
.record-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.record-btn:active:not(:disabled) {
  transform: scale(0.95);
}
.record-btn.is-recording {
  background: rgba(255, 107, 107, 0.15);
  border-color: #ff6b6b;
  color: #ff6b6b;
  animation: pulse 1.5s infinite;
}
.skip-btn {
  padding: 10px 20px;
  border-radius: 999px;
  border: 1px solid rgba(212, 168, 67, 0.45);
  background: transparent;
  color: #e8dcc8;
  cursor: pointer;
  font-size: 14px;
}
.skip-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.status-text {
  color: #a8f5ff;
  font-size: 13px;
}
.error-text {
  color: #ff6b6b;
  font-size: 12px;
  text-align: center;
}
.result-box {
  width: 100%;
  padding: 12px 14px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.6;
}
.result-box.pass {
  border: 1px solid rgba(52, 211, 153, 0.45);
  background: rgba(16, 185, 129, 0.1);
  color: #bbf7d0;
}
.result-box.fail {
  border: 1px solid rgba(248, 113, 113, 0.45);
  background: rgba(239, 68, 68, 0.08);
  color: #fecaca;
}
.result-verdict {
  margin-top: 4px;
  font-weight: 700;
}
.fail-next {
  margin-top: 10px;
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(255, 107, 107, 0.4); }
  70% { box-shadow: 0 0 0 15px rgba(255, 107, 107, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 107, 107, 0); }
}
</style>
