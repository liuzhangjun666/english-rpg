<template>
  <div class="vocabulary-game">
    <header class="game-header">
      <div class="scene-title">练功房 · 灵草园</div>
      <div class="meta-row">
        <span>题目 {{ displayIndex }} / {{ totalCount }}</span>
        <span>灵气奖励 +{{ currentReward }}</span>
      </div>
    </header>

    <section v-if="!hasQuestions" class="result-card">
      <h3>暂无词汇题目</h3>
      <p>请先在 <code>src/data/questions.js</code> 中补充 <code>skill = vocabulary</code> 的题目。</p>
    </section>

    <section v-else-if="!isFinished" class="question-card">
      <div class="question-text">{{ currentQuestion.question }}</div>

      <div v-if="currentMode === 'word_choice'" class="choice-grid">
        <button
          v-for="option in currentOptions"
          :key="option.key"
          class="choice-btn"
          :class="{ selected: selectedChoice === option.key }"
          @click="selectChoice(option.key)"
        >
          <strong>{{ option.key }}.</strong>
          <span v-if="option.image" class="option-image-placeholder">[图片占位] {{ option.text }}</span>
          <span v-else>{{ option.text }}</span>
        </button>
      </div>

      <div v-else-if="currentMode === 'spelling'" class="spelling-wrap">
        <div class="answer-slots">
          <button
            v-for="(letter, idx) in answerSlots"
            :key="`slot-${idx}`"
            class="slot-btn"
            :disabled="!letter"
            @click="removeLetter(idx)"
          >
            {{ letter || '·' }}
          </button>
        </div>

        <div class="letters-pool">
          <button
            v-for="item in letterPool"
            :key="item.id"
            class="letter-btn"
            :disabled="item.used"
            @click="pickLetter(item.id)"
          >
            {{ item.char }}
          </button>
        </div>
      </div>

      <div class="footer-zone">
        <button class="confirm-btn" @click="onConfirm">{{ confirmButtonText }}</button>
        <div class="feedback" :class="feedbackClass">{{ feedbackText }}</div>
      </div>
    </section>

    <section v-else class="result-card">
      <h3>修炼结算</h3>
      <p>正确数：{{ correctCount }} / {{ totalCount }}</p>
      <p>获得灵气：{{ totalSpirit }}</p>
      <p>vocabulary 能力提升：+{{ vocabularyGain }}</p>
    </section>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import allQuestions from '../data/questions.js';

const vocabularyQuestions = (Array.isArray(allQuestions) ? allQuestions : [])
  .filter((q) => String(q?.skill || '').toLowerCase() === 'vocabulary')
  .filter((q) => ['word_choice', 'spelling'].includes(String(q?.mode || '').toLowerCase()));

const questionIndex = ref(0);
const correctCount = ref(0);
const totalSpirit = ref(0);
const feedbackText = ref('');
const feedbackState = ref('idle'); // idle | success | error

const selectedChoice = ref('');
const answered = ref(false);

const letterPool = ref([]);
const answerSlots = ref([]);
const slotPickedIds = ref([]);

const totalCount = computed(() => vocabularyQuestions.length);
const hasQuestions = computed(() => totalCount.value > 0);
const displayIndex = computed(() => Math.min(questionIndex.value + 1, Math.max(1, totalCount.value)));
const currentQuestion = computed(() => vocabularyQuestions[questionIndex.value] || {});
const currentMode = computed(() => String(currentQuestion.value?.mode || '').toLowerCase());
const currentReward = computed(() => Number(currentQuestion.value?.spiritReward || 10));
const isFinished = computed(() => questionIndex.value >= totalCount.value && totalCount.value > 0);
const vocabularyGain = computed(() => correctCount.value * 2);

const currentOptions = computed(() => {
  const options = currentQuestion.value?.options;
  if (Array.isArray(options)) {
    return options.map((item, idx) => {
      if (typeof item === 'string') {
        return { key: String.fromCharCode(65 + idx), text: item, image: '' };
      }
      return {
        key: String(item?.key || String.fromCharCode(65 + idx)),
        text: String(item?.text || ''),
        image: String(item?.image || ''),
      };
    });
  }

  if (options && typeof options === 'object') {
    return Object.entries(options).map(([key, text]) => ({ key: String(key), text: String(text), image: '' }));
  }

  return [];
});

const confirmButtonText = computed(() => {
  if (answered.value) return '下一题';
  return '确认';
});

const feedbackClass = computed(() => {
  if (feedbackState.value === 'success') return 'feedback-success';
  if (feedbackState.value === 'error') return 'feedback-error';
  return '';
});

watch(
  () => currentQuestion.value,
  () => {
    resetQuestionState();
    if (currentMode.value === 'spelling') {
      initSpellingState();
    }
  },
  { immediate: true }
);

function resetQuestionState() {
  selectedChoice.value = '';
  answered.value = false;
  feedbackText.value = '';
  feedbackState.value = 'idle';
  letterPool.value = [];
  answerSlots.value = [];
  slotPickedIds.value = [];
}

function initSpellingState() {
  const answerWord = normalizedAnswerWord();
  const chars = Array.isArray(currentQuestion.value?.shuffledLetters)
    ? [...currentQuestion.value.shuffledLetters]
    : shuffleChars(answerWord.split(''));

  letterPool.value = chars.map((char, idx) => ({
    id: `${idx}-${char}`,
    char: String(char || '').toLowerCase(),
    used: false,
  }));
  answerSlots.value = new Array(answerWord.length).fill('');
  slotPickedIds.value = new Array(answerWord.length).fill('');
}

function selectChoice(key) {
  if (answered.value) return;
  selectedChoice.value = key;
}

function pickLetter(letterId) {
  if (answered.value) return;
  const poolIdx = letterPool.value.findIndex((it) => it.id === letterId);
  if (poolIdx < 0 || letterPool.value[poolIdx].used) return;

  const slotIdx = answerSlots.value.findIndex((ch) => !ch);
  if (slotIdx < 0) return;

  answerSlots.value[slotIdx] = letterPool.value[poolIdx].char;
  slotPickedIds.value[slotIdx] = letterId;
  letterPool.value[poolIdx].used = true;
}

function removeLetter(slotIdx) {
  if (answered.value) return;
  const letterId = slotPickedIds.value[slotIdx];
  if (!letterId) return;

  const poolIdx = letterPool.value.findIndex((it) => it.id === letterId);
  if (poolIdx >= 0) {
    letterPool.value[poolIdx].used = false;
  }
  answerSlots.value[slotIdx] = '';
  slotPickedIds.value[slotIdx] = '';
}

function onConfirm() {
  if (isFinished.value) return;

  if (answered.value) {
    goNext();
    return;
  }

  if (currentMode.value === 'word_choice') {
    submitWordChoice();
    return;
  }

  if (currentMode.value === 'spelling') {
    submitSpelling();
  }
}

function submitWordChoice() {
  if (!selectedChoice.value) {
    feedbackText.value = '请先选择一个答案。';
    feedbackState.value = 'error';
    return;
  }

  const rightAnswer = normalizedChoiceAnswer();
  const ok = selectedChoice.value.toUpperCase() === rightAnswer;

  if (ok) {
    answered.value = true;
    correctCount.value += 1;
    totalSpirit.value += currentReward.value;
    feedbackText.value = `采集成功，灵气 +${currentReward.value}`;
    feedbackState.value = 'success';
    return;
  }

  answered.value = true;
  const explain = String(currentQuestion.value?.explanation || '');
  feedbackText.value = `回答错误，正确答案：${rightAnswer}${explain ? `。${explain}` : ''}`;
  feedbackState.value = 'error';
}

function submitSpelling() {
  const joined = answerSlots.value.join('').toLowerCase();
  const rightWord = normalizedAnswerWord();

  if (joined.length !== rightWord.length) {
    feedbackText.value = '请先填满答案槽。';
    feedbackState.value = 'error';
    return;
  }

  if (joined === rightWord) {
    answered.value = true;
    correctCount.value += 1;
    totalSpirit.value += currentReward.value;
    feedbackText.value = `炼丹成功，灵气 +${currentReward.value}`;
    feedbackState.value = 'success';
    return;
  }

  feedbackText.value = '丹炉不稳，再试一次';
  feedbackState.value = 'error';
}

function goNext() {
  questionIndex.value += 1;
}

function normalizedChoiceAnswer() {
  const raw = String(currentQuestion.value?.answer || currentQuestion.value?.correct_answer || '').trim();
  if (!raw) return '';
  const upper = raw.toUpperCase();
  if (/^[A-D]$/.test(upper)) return upper;

  const matched = currentOptions.value.find((it) => String(it.text).trim() === raw);
  if (matched) return String(matched.key).toUpperCase();

  return upper;
}

function normalizedAnswerWord() {
  return String(currentQuestion.value?.answerWord || currentQuestion.value?.answer || currentQuestion.value?.word || '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

function shuffleChars(chars) {
  const list = [...chars];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}
</script>

<style scoped>
.vocabulary-game {
  max-width: 860px;
  margin: 0 auto;
  padding: 18px;
  color: #f4edd7;
}

.game-header {
  margin-bottom: 14px;
}

.scene-title {
  font-size: 24px;
  font-weight: 700;
  color: #f4d98a;
}

.meta-row {
  margin-top: 8px;
  display: flex;
  gap: 18px;
  font-size: 14px;
  color: #c8b685;
}

.question-card,
.result-card {
  background: rgba(9, 18, 40, 0.68);
  border: 1px solid rgba(212, 168, 67, 0.35);
  border-radius: 12px;
  padding: 16px;
}

.question-text {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 14px;
}

.choice-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.choice-btn {
  border: 1px solid rgba(212, 168, 67, 0.45);
  background: rgba(255, 255, 255, 0.06);
  color: #f7f3e8;
  padding: 12px;
  border-radius: 10px;
  text-align: left;
  cursor: pointer;
}

.choice-btn.selected {
  border-color: #f4d98a;
  box-shadow: 0 0 10px rgba(212, 168, 67, 0.35);
}

.option-image-placeholder {
  display: inline-block;
  color: #cde3ff;
}

.spelling-wrap {
  display: grid;
  gap: 12px;
}

.answer-slots,
.letters-pool {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.slot-btn,
.letter-btn {
  min-width: 42px;
  height: 42px;
  border-radius: 8px;
  border: 1px solid rgba(212, 168, 67, 0.5);
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
}

.letter-btn:disabled,
.slot-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.footer-zone {
  margin-top: 16px;
  border-top: 1px solid rgba(212, 168, 67, 0.25);
  padding-top: 14px;
}

.confirm-btn {
  border: 1px solid rgba(212, 168, 67, 0.65);
  background: linear-gradient(135deg, rgba(212, 168, 67, 0.35), rgba(212, 168, 67, 0.1));
  color: #fff2cf;
  min-width: 110px;
  height: 40px;
  border-radius: 8px;
  cursor: pointer;
}

.feedback {
  margin-top: 10px;
  min-height: 22px;
  font-size: 14px;
  color: #d8cfb2;
}

.feedback-success {
  color: #7ee7a4;
}

.feedback-error {
  color: #ff9f9f;
}

.result-card h3 {
  margin: 0 0 10px;
  color: #f4d98a;
}

.result-card p {
  margin: 6px 0;
}

@media (max-width: 768px) {
  .choice-grid {
    grid-template-columns: 1fr;
  }
}
</style>
