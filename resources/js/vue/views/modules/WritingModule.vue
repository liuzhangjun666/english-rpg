<template>
  <div class="writing-module" :class="{ 'is-reveal': revealed }">
    <!-- 揭符动画层 -->
    <div class="talisman-reveal" :class="{ 'is-visible': revealed }">
      <div class="reveal-paper">
        <div class="reveal-tag">{{ modeLabel }}</div>
        <div class="reveal-title">{{ question.title || '符篆任务' }}</div>
      </div>
    </div>

    <div class="writing-top">
      <span class="mode-badge">{{ modeLabel }}</span>
      <span class="word-limit">{{ minWords }}–{{ maxWords }} 词</span>
    </div>

    <div class="rules-box">
      <div><b>炼符规则：</b>灵墨落笔、符首大写、符尾标点{{ rules.requiredWords.length ? '、灵词聚齐' : '' }}</div>
    </div>

    <div class="writing-header">
      <div class="title">{{ question.title || '写作任务' }}</div>
      <div class="topic">{{ question.topic || '请根据要求完成英文写作。' }}</div>
    </div>

    <div v-if="question.passage" class="passage-box">
      <div class="passage-label">📖 原文符卷（请续写衔接）</div>
      <div class="passage-content">{{ question.passage }}</div>
    </div>

    <div v-if="requiredWordStatus.length" class="spirit-words">
      <span
        v-for="item in requiredWordStatus"
        :key="item.word"
        class="spirit-word"
        :class="{ 'is-active': item.active }"
      >{{ item.word }}</span>
    </div>

    <!-- 灵墨池 -->
    <div class="ink-pool-bar">
      <div class="ink-pool-label">灵墨池</div>
      <div class="ink-pool-track">
        <div
          class="ink-pool-fill"
          :class="{ 'is-full': inkPoolPercent >= 100, 'is-overflow': isOverLimit }"
          :style="{ width: `${Math.min(100, inkPoolPercent)}%` }"
        ></div>
      </div>
      <div class="ink-pool-text">{{ wordCount }} / {{ minWords }} 词</div>
    </div>

    <div class="editor-container" :class="editorStateClass">
      <textarea
        v-model="content"
        class="writing-textarea"
        placeholder="以灵墨书写英文符咒..."
        maxlength="5000"
        @input="onInput"
      ></textarea>
      <div class="word-count" :class="{ 'is-enough': wordCount >= minWords, 'is-over': isOverLimit }">
        {{ wordCount }} 词
      </div>
    </div>

    <div v-if="liveValidation" class="validate-box" :class="`status-${liveValidation.status}`">
      <div class="validate-header" :style="{ color: validationHeader(liveValidation.status).color }">
        {{ validationHeader(liveValidation.status).text }}
      </div>
      <div v-for="check in liveValidation.checks" :key="check.key" class="check-line">
        <span>{{ check.passed ? '✓' : '✗' }}</span>
        <span>{{ check.label }}</span>
      </div>
      <div v-if="liveValidation.missingRequiredWords.length" class="missing-words">
        缺失灵词：{{ liveValidation.missingRequiredWords.join(', ') }}
      </div>
    </div>

    <div class="actions">
      <button class="btn btn-draft" type="button" @click="handleSaveDraft">封符入袖</button>
      <button
        class="btn btn-primary"
        type="button"
        :disabled="submitting || !canSubmit"
        @click="handleSubmit"
      >
        {{ submitting ? '炼符中...' : '炼符提交' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useWritingValidator } from '../../composables/useWritingValidator';
import { getInkPoolRatio, triggerWritingSceneEffect } from '../../utils/writingTalisman';

const props = defineProps<{
  question: Record<string, unknown>;
  initialContent?: string;
  submitting?: boolean;
}>();

const emit = defineEmits<{
  (e: 'submit-answer', payload: { content: string; validation: ReturnType<typeof validate> }): void;
  (e: 'save-draft', content: string): void;
  (e: 'word-count-change', payload: { wordCount: number; ratio: number }): void;
}>();

const content = ref('');
const revealed = ref(false);

const questionRef = computed(() => props.question);
const contentRef = computed({
  get: () => content.value,
  set: (v: string) => { content.value = v; },
});

const {
  modeLabel,
  rules,
  minWords,
  maxWords,
  wordCount,
  inkPoolPercent,
  isOverLimit,
  requiredWordStatus,
  liveValidation,
  validate,
  validationHeader,
} = useWritingValidator(questionRef, contentRef);

const canSubmit = computed(() => {
  if (!content.value.trim()) return false;
  const v = liveValidation.value;
  return v && v.status !== 'fail';
});

const editorStateClass = computed(() => {
  if (!liveValidation.value) return '';
  return `editor-${liveValidation.value.status}`;
});

watch(
  () => props.question?.prompt_id,
  () => {
    content.value = props.initialContent || '';
    revealed.value = false;
    window.setTimeout(() => { revealed.value = true; }, 80);
    triggerWritingSceneEffect('ink', 0);
  },
  { immediate: true }
);

watch(
  () => props.initialContent,
  (val) => {
    if (val !== undefined && val !== content.value) {
      content.value = val;
    }
  }
);

onMounted(() => {
  window.setTimeout(() => { revealed.value = true; }, 300);
});

function onInput() {
  const ratio = getInkPoolRatio(wordCount.value, minWords.value, maxWords.value);
  emit('word-count-change', { wordCount: wordCount.value, ratio });
  triggerWritingSceneEffect('ink', ratio);
}

function handleSaveDraft() {
  emit('save-draft', content.value);
}

function handleSubmit() {
  const validation = validate();
  if (validation.status === 'fail') return;
  emit('submit-answer', { content: content.value.trim(), validation });
}
</script>

<style scoped>
.writing-module {
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
}

.talisman-reveal {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 5, 0, 0.92);
  border-radius: 12px;
  opacity: 1;
  transition: opacity 0.6s ease;
  pointer-events: none;
}
.talisman-reveal.is-visible {
  opacity: 0;
}
.reveal-paper {
  padding: 24px 32px;
  border: 2px solid rgba(212, 168, 67, 0.6);
  border-radius: 8px;
  background: linear-gradient(180deg, #fff5e6, #e8d4a8);
  color: #3a230f;
  text-align: center;
  animation: paperFlyIn 0.5s ease;
}
.reveal-tag { font-size: 12px; margin-bottom: 8px; opacity: 0.7; }
.reveal-title { font-size: 18px; font-weight: 800; }

@keyframes paperFlyIn {
  from { transform: scale(0.6) translateY(30px); opacity: 0; }
  to { transform: scale(1) translateY(0); opacity: 1; }
}

.writing-top {
  display: flex;
  align-items: center;
  gap: 10px;
}
.mode-badge {
  background: rgba(212, 168, 67, 0.2);
  color: var(--gold, #d4a843);
  font-size: 12px;
  padding: 4px 12px;
  border-radius: 20px;
  border: 1px solid rgba(212, 168, 67, 0.4);
}
.word-limit {
  font-size: 12px;
  color: var(--parchment-dark, #c9b896);
}

.rules-box {
  padding: 8px 10px;
  border: 1px dashed rgba(212, 168, 67, 0.35);
  border-radius: 10px;
  background: rgba(212, 168, 67, 0.08);
  font-size: 12px;
  color: var(--parchment-dark, #c9b896);
  line-height: 1.7;
}

.writing-header {
  padding: 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(212, 168, 67, 0.2);
  border-radius: 10px;
}
.title {
  font-size: 15px;
  color: var(--gold-light, #f4d98a);
  font-weight: bold;
  margin-bottom: 8px;
}
.topic {
  font-size: 13px;
  color: var(--parchment-dark, #c9b896);
  line-height: 1.7;
}

.passage-box {
  padding: 12px 14px;
  background: rgba(78, 192, 122, 0.06);
  border: 1px dashed rgba(78, 192, 122, 0.4);
  border-radius: 10px;
}
.passage-label { font-size: 12px; color: #9ee8bf; margin-bottom: 6px; }
.passage-content {
  font-size: 13px;
  color: var(--parchment, #e8dcc8);
  line-height: 1.8;
  font-style: italic;
}

.spirit-words {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.spirit-word {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  border: 1px solid rgba(212, 168, 67, 0.3);
  color: var(--parchment-dark, #c9b896);
  background: rgba(0, 0, 0, 0.25);
  transition: all 0.25s;
}
.spirit-word.is-active {
  border-color: #ffd700;
  color: #ffd700;
  background: rgba(255, 215, 0, 0.12);
  box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
}

.ink-pool-bar {
  display: grid;
  grid-template-columns: 56px 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(212, 168, 67, 0.2);
}
.ink-pool-label { font-size: 11px; color: var(--gold, #d4a843); }
.ink-pool-track {
  height: 10px;
  border-radius: 999px;
  background: rgba(20, 10, 0, 0.8);
  overflow: hidden;
  border: 1px solid rgba(212, 168, 67, 0.25);
}
.ink-pool-fill {
  height: 100%;
  background: linear-gradient(90deg, #4a3200, #ffd700);
  border-radius: 999px;
  transition: width 0.2s ease;
  box-shadow: 0 0 8px rgba(255, 215, 0, 0.4);
}
.ink-pool-fill.is-full { box-shadow: 0 0 14px rgba(255, 215, 0, 0.7); }
.ink-pool-fill.is-overflow { background: linear-gradient(90deg, #8b2020, #ff6b6b); }
.ink-pool-text { font-size: 11px; color: var(--parchment-dark, #c9b896); white-space: nowrap; }

.editor-container { position: relative; }
.editor-container.editor-fail .writing-textarea { border-color: rgba(255, 107, 107, 0.6); }
.editor-container.editor-pass .writing-textarea { border-color: rgba(158, 232, 191, 0.6); }

.writing-textarea {
  width: 100%;
  min-height: 160px;
  padding: 12px 12px 30px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(212, 168, 67, 0.3);
  border-radius: 10px;
  color: var(--parchment, #e8dcc8);
  font-size: 14px;
  line-height: 1.7;
  resize: vertical;
  font-family: var(--font-body, inherit);
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
}
.writing-textarea:focus {
  border-color: rgba(212, 168, 67, 0.7);
  box-shadow: 0 0 12px rgba(255, 215, 0, 0.1);
}

.word-count {
  position: absolute;
  bottom: 10px;
  right: 12px;
  font-size: 11px;
  color: var(--parchment-dark, #c9b896);
  pointer-events: none;
}
.word-count.is-enough { color: var(--gold, #d4a843); }
.word-count.is-over { color: #ff6b6b; }

.validate-box {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(212, 168, 67, 0.25);
  background: rgba(255, 255, 255, 0.04);
  font-size: 12px;
  color: var(--parchment-dark, #c9b896);
  line-height: 1.8;
}
.validate-header { font-weight: 700; margin-bottom: 4px; }
.check-line span:first-child { margin-right: 6px; }
.missing-words { margin-top: 4px; color: #ffd6d2; }

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.btn {
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}
.btn-draft {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(212, 168, 67, 0.4);
  color: var(--gold-light, #f4d98a);
}
.btn-primary {
  background: linear-gradient(180deg, #d4a843, #a07820);
  color: #1a1004;
}
.btn-primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
