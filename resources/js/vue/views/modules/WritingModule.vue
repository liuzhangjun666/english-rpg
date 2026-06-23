<template>
  <div class="writing-module" :class="{ 'is-reveal': revealed, [`phase-${phase}`]: true }">
    <img class="deco deco-lantern deco-lantern-l" :src="assets.decoLantern" alt="" aria-hidden="true" />
    <img class="deco deco-lantern deco-lantern-r" :src="assets.decoLantern" alt="" aria-hidden="true" />
    <img class="deco deco-incense" :src="assets.decoIncense" alt="" aria-hidden="true" />

    <!-- 揭符动画层 -->
    <div class="talisman-reveal" :class="{ 'is-visible': revealed }">
      <div class="reveal-paper">
        <img class="reveal-paper-bg" :src="assets.talismanPaper" alt="" aria-hidden="true" />
        <div class="reveal-paper-inner">
          <div class="reveal-tag">{{ modeLabel }}</div>
          <div class="reveal-title">{{ question.title || '符篆任务' }}</div>
          <div class="reveal-hint">符纸飘落，请观题立意…</div>
        </div>
      </div>
    </div>

    <div class="mode-banner">
      <img class="mode-icon-img" :src="assets.hallIcon" alt="" aria-hidden="true" />
      <div class="mode-banner-text">
        <span class="mode-title">炼符台</span>
        <span class="mode-sub">以灵墨书符，引雷封箓</span>
      </div>
      <div class="writing-top-meta">
        <span class="mode-badge">{{ modeLabel }}</span>
        <span class="word-limit">{{ minWords }}–{{ maxWords }} 词</span>
      </div>
    </div>

    <!-- 炼符工序 -->
    <div class="forge-steps">
      <div class="forge-step" :class="{ active: phase === 'brief', done: phase === 'forge' }">
        <span class="step-dot">1</span>
        <span>观符立意</span>
      </div>
      <div class="forge-step-line" :class="{ lit: phase === 'forge' }"></div>
      <div class="forge-step" :class="{ active: phase === 'forge' }">
        <span class="step-dot">2</span>
        <span>落墨炼符</span>
      </div>
      <div class="forge-step-line" :class="{ lit: sealReady }"></div>
      <div class="forge-step" :class="{ active: sealReady }">
        <span class="step-dot">3</span>
        <span>引雷封符</span>
      </div>
    </div>

    <!-- 阶段一：观符立意 -->
    <div v-if="phase === 'brief'" class="brief-phase">
      <div class="scroll-panel prompt-panel">
        <img class="scroll-panel-bg" :src="assets.scrollPrompt" alt="" aria-hidden="true" />
        <div class="scroll-panel-inner">
          <div class="panel-label">
            <img class="panel-label-icon" :src="assets.hintScroll" alt="" aria-hidden="true" />
            <span>符题卷轴</span>
          </div>
          <div class="title">{{ question.title || '写作任务' }}</div>
          <div class="topic">{{ question.topic || '请根据要求完成英文写作。' }}</div>
        </div>
      </div>

      <div v-if="question.passage" class="passage-box">
        <div class="passage-label">📖 原文符卷（续写须衔接）</div>
        <div class="passage-content">{{ question.passage }}</div>
      </div>

      <div class="angle-section">
        <div class="angle-title">择一立意诀，指引落墨方向</div>
        <div class="angle-cards">
          <button
            v-for="angle in FORGE_ANGLES"
            :key="angle.id"
            type="button"
            class="angle-card"
            :class="{ selected: selectedAngle?.id === angle.id }"
            @click="selectedAngle = angle"
          >
            <img class="angle-card-bg" :src="assets.angleCard" alt="" aria-hidden="true" />
            <span class="angle-icon">{{ angle.icon }}</span>
            <span class="angle-label">{{ angle.label }}</span>
            <span class="angle-hint">{{ angle.hint }}</span>
          </button>
        </div>
      </div>

      <div class="rules-box">
        <div><b>炼符规则：</b>灵墨落笔、符首大写、符尾标点{{ rules.requiredWords.length ? '、灵词聚齐' : '' }}，符纹全亮方可引雷封符。</div>
      </div>

      <div class="actions actions-center">
        <button class="btn-forge" type="button" @click="startForge(selectedAngle || FORGE_ANGLES[0])">
          <img class="btn-forge-bg" :src="assets.btnForge" alt="" aria-hidden="true" />
          <span class="btn-forge-text">蘸墨开炼</span>
        </button>
      </div>
    </div>

    <!-- 阶段二：落墨炼符 -->
    <div v-else class="forge-phase">
      <div class="forge-layout">
        <aside class="forge-aside">
          <WritingForgeBoard
            :title="String(question.title || '')"
            :ink-percent="inkPoolPercent"
            :rune-nodes="runeNodes"
            :runes-lit="runesLit"
            :runes-total="runesTotal"
            :talisman-grade="talismanGrade"
            :forge-heat="forgeHeat"
            :ink-streak="inkStreak"
          />
          <div v-if="selectedAngle" class="angle-reminder">
            <span class="angle-reminder-tag">{{ selectedAngle.icon }} {{ selectedAngle.label }}</span>
            <span class="angle-reminder-hint">{{ selectedAngle.hint }}</span>
          </div>
        </aside>

        <div class="forge-main">
          <div class="scroll-panel prompt-panel compact">
            <img class="scroll-panel-bg" :src="assets.scrollPrompt" alt="" aria-hidden="true" />
            <div class="scroll-panel-inner">
              <div class="panel-label">
                <img class="panel-label-icon" :src="assets.hintScroll" alt="" aria-hidden="true" />
                <span>符题卷轴</span>
              </div>
              <div class="title">{{ question.title || '写作任务' }}</div>
              <div class="topic">{{ question.topic || '请根据要求完成英文写作。' }}</div>
            </div>
          </div>

          <div v-if="question.passage" class="passage-box">
            <div class="passage-label">📖 原文符卷</div>
            <div class="passage-content">{{ question.passage }}</div>
          </div>

          <!-- 灵词御符：点击嵌入正文 -->
          <div v-if="requiredWordStatus.length" class="spirit-words-panel">
            <div class="spirit-words-head">
              <span>灵词御符</span>
              <span class="spirit-words-tip">点击灵词，嵌入符卷正文</span>
            </div>
            <div class="spirit-words">
              <button
                v-for="item in requiredWordStatus"
                :key="item.word"
                type="button"
                class="spirit-word"
                :class="{ 'is-active': item.active }"
                @click="insertWord(item.word)"
              >
                {{ item.active ? '✓ ' : '+ ' }}{{ item.word }}
              </button>
            </div>
          </div>

          <div class="ink-pool-bar">
            <img class="ink-stone-icon" :src="assets.inkStone" alt="" aria-hidden="true" />
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
            <img class="editor-scroll-bg" :src="assets.scrollEditor" alt="" aria-hidden="true" />
            <textarea
              ref="textareaRef"
              v-model="content"
              class="writing-textarea"
              placeholder="以灵墨书写英文符咒…符纹随落笔逐一点亮"
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
            <div class="check-grid">
              <div v-for="check in liveValidation.checks" :key="check.key" class="check-line">
                <span>{{ check.passed ? '✓' : '✗' }}</span>
                <span>{{ check.label }}</span>
              </div>
            </div>
            <div v-if="liveValidation.missingRequiredWords.length" class="missing-words">
              缺失灵词：{{ liveValidation.missingRequiredWords.join(', ') }}
            </div>
          </div>

          <div class="actions">
            <button class="btn btn-draft" type="button" @click="handleSaveDraft">封符入袖</button>
            <button class="btn btn-ghost" type="button" @click="phase = 'brief'" v-if="showBrief">重观符卷</button>
            <button
              class="btn-forge"
              :class="{ 'btn-seal-ready': sealReady, 'is-sealing': submitting }"
              type="button"
              :disabled="submitting || !canSubmit"
              @click="handleSubmit"
            >
              <img class="btn-forge-bg" :src="assets.btnForge" alt="" aria-hidden="true" />
              <span class="btn-forge-text">{{ submitting ? '天劫炼符中…' : sealReady ? '⚡ 引雷封符' : '炼符提交' }}</span>
            </button>
          </div>

    <div v-if="submitting" class="seal-flash" aria-hidden="true">
      <div class="seal-flash-ring"></div>
      <div class="seal-flash-text">引雷封符中…</div>
    </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useWritingValidator } from '../../composables/useWritingValidator';
import { useWritingForge, FORGE_ANGLES } from '../../composables/useWritingForge';
import { getInkPoolRatio, triggerWritingSceneEffect } from '../../utils/writingTalisman';
import { writingAssets as assets } from '../../data/writingAssets';
import WritingForgeBoard from '../../components/writing/WritingForgeBoard.vue';

const props = withDefaults(defineProps<{
  question: Record<string, unknown>;
  initialContent?: string;
  submitting?: boolean;
  showBackButton?: boolean;
}>(), {
  showBackButton: true,
});

const emit = defineEmits<{
  (e: 'submit-answer', payload: { content: string; validation: ReturnType<typeof validate> }): void;
  (e: 'save-draft', content: string): void;
  (e: 'word-count-change', payload: { wordCount: number; ratio: number }): void;
  (e: 'back-hall'): void;
}>();

const content = ref('');
const revealed = ref(false);
const textareaRef = ref<HTMLTextAreaElement | null>(null);

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

const {
  phase,
  selectedAngle,
  forgeHeat,
  inkStreak,
  showBrief,
  runeNodes,
  runesLit,
  runesTotal,
  talismanGrade,
  sealReady,
  startForge,
  resetForge,
  insertSpiritWord,
} = useWritingForge({
  minWords,
  liveValidation,
  content: contentRef,
});

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
    resetForge();
    if (!showBrief.value || content.value.trim()) {
      phase.value = 'forge';
    }
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

watch(talismanGrade, (grade) => {
  if (grade === 'perfect') {
    triggerWritingSceneEffect('partial');
  }
});

onMounted(() => {
  window.setTimeout(() => { revealed.value = true; }, 300);
});

function onInput() {
  const ratio = getInkPoolRatio(wordCount.value, minWords.value, maxWords.value);
  emit('word-count-change', { wordCount: wordCount.value, ratio });
  triggerWritingSceneEffect('ink', ratio);
}

function insertWord(word: string) {
  insertSpiritWord(word, textareaRef.value);
  onInput();
}

function handleSaveDraft() {
  emit('save-draft', content.value);
}

function handleSubmit() {
  const validation = validate();
  if (validation.status === 'fail') {
    ElMessage.warning('符文残缺，请补全符纹要求后再引雷封符');
    triggerWritingSceneEffect('fail');
    return;
  }
  if (sealReady.value) {
    triggerWritingSceneEffect('heaven');
  }
  emit('submit-answer', { content: content.value.trim(), validation });
}
</script>

<style scoped>
.writing-module {
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
  overflow: hidden;
}

.deco {
  position: absolute;
  pointer-events: none;
  z-index: 0;
  opacity: 0.75;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.45));
}
.deco-lantern { width: 72px; }
.deco-lantern-l { top: 120px; left: -12px; animation: lanternFloat 4s ease-in-out infinite; }
.deco-lantern-r { top: 180px; right: -12px; transform: scaleX(-1); animation: lanternFloat 4.6s ease-in-out infinite reverse; }
.deco-incense { width: 56px; bottom: 40px; right: 8px; opacity: 0.55; }

.talisman-reveal {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 5, 0, 0.88);
  border-radius: 12px;
  opacity: 1;
  transition: opacity 0.6s ease;
  pointer-events: none;
}
.talisman-reveal.is-visible { opacity: 0; }

@keyframes lanternFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.mode-banner {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 14px;
  background: rgba(8, 5, 2, 0.55);
  border: 1px solid rgba(212, 168, 67, 0.28);
  backdrop-filter: blur(4px);
}
.mode-icon-img { width: 44px; height: 44px; object-fit: contain; }
.mode-banner-text { display: flex; flex-direction: column; gap: 2px; flex: 1; }
.mode-title { font-size: 16px; font-weight: 800; color: #f4d98a; }
.mode-sub { font-size: 11px; color: #c9b896; }

.reveal-paper {
  position: relative;
  width: min(320px, 80vw);
  animation: paperFlyIn 0.5s ease;
}
.reveal-paper-bg {
  width: 100%;
  display: block;
  filter: drop-shadow(0 12px 24px rgba(0, 0, 0, 0.5));
}
.reveal-paper-inner {
  position: absolute;
  inset: 14% 12% 18%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #3a230f;
}
.reveal-tag { font-size: 12px; margin-bottom: 8px; opacity: 0.7; }
.reveal-title { font-size: 18px; font-weight: 800; }
.reveal-hint { font-size: 12px; margin-top: 8px; opacity: 0.65; }

@keyframes paperFlyIn {
  from { transform: scale(0.6) translateY(30px); opacity: 0; }
  to { transform: scale(1) translateY(0); opacity: 1; }
}

.writing-top-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}

.scroll-panel {
  position: relative;
  z-index: 1;
  width: 100%;
}
.scroll-panel-bg {
  width: 100%;
  display: block;
  filter: drop-shadow(0 8px 18px rgba(0, 0, 0, 0.35));
}
.scroll-panel-inner {
  position: absolute;
  inset: 12% 8% 14%;
  overflow: auto;
}
.prompt-panel.compact .scroll-panel-inner { inset: 14% 9% 16%; }
.panel-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #8a5a20;
  font-weight: 700;
  margin-bottom: 8px;
}
.panel-label-icon { width: 22px; height: 22px; object-fit: contain; }

.mode-badge {
  background: rgba(212, 168, 67, 0.2);
  color: var(--gold, #d4a843);
  font-size: 12px;
  padding: 4px 12px;
  border-radius: 20px;
  border: 1px solid rgba(212, 168, 67, 0.4);
}
.word-limit { font-size: 12px; color: #c9b896; }

/* 炼符工序 */
.forge-steps {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 10px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(212, 168, 67, 0.2);
}
.forge-step {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: rgba(201, 184, 150, 0.55);
  transition: color 0.25s;
}
.forge-step.active { color: #f4d98a; font-weight: 700; }
.forge-step.done { color: #9ee8bf; }
.step-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1px solid currentColor;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
}
.forge-step.active .step-dot,
.forge-step.done .step-dot {
  background: rgba(255, 215, 0, 0.15);
  border-color: #ffd700;
}
.forge-step-line {
  width: 24px;
  height: 2px;
  background: rgba(212, 168, 67, 0.2);
  transition: background 0.3s;
}
.forge-step-line.lit {
  background: linear-gradient(90deg, #a07820, #ffd700);
}

/* 观符立意 */
.brief-phase { display: flex; flex-direction: column; gap: 12px; }

.angle-section { display: flex; flex-direction: column; gap: 10px; }
.angle-title {
  font-size: 13px;
  color: #f4d98a;
  font-weight: 700;
  text-align: center;
}
.angle-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.angle-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 14px 8px 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: transform 0.2s, filter 0.2s;
  text-align: center;
  min-height: 132px;
}
.angle-card-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
  z-index: 0;
  opacity: 0.92;
}
.angle-card > :not(.angle-card-bg) { position: relative; z-index: 1; }
.angle-card:hover { transform: translateY(-2px); filter: brightness(1.08); }
.angle-card.selected {
  transform: translateY(-3px) scale(1.02);
  filter: drop-shadow(0 0 12px rgba(255, 215, 0, 0.35));
}
.angle-icon { font-size: 22px; margin-top: 4px; }
.angle-label { font-size: 13px; font-weight: 700; color: #f4d98a; }
.angle-hint { font-size: 10px; color: #d8c8a8; line-height: 1.4; padding: 0 4px; }

.btn-forge {
  position: relative;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  min-width: 220px;
  height: 56px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.btn-forge:disabled { opacity: 0.45; cursor: not-allowed; }
.btn-forge-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
}
.btn-forge-text {
  position: relative;
  z-index: 1;
  font-size: 15px;
  font-weight: 800;
  color: #2a1806;
  text-shadow: 0 1px 0 rgba(255, 235, 180, 0.5);
}
.btn-forge.btn-seal-ready .btn-forge-text {
  color: #4a2800;
  animation: sealPulse 1.4s ease-in-out infinite;
}

.seal-flash {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(8, 4, 0, 0.55);
  pointer-events: none;
  animation: sealFlashIn 0.25s ease;
}
.seal-flash-ring {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 3px solid rgba(255, 215, 0, 0.8);
  box-shadow: 0 0 40px rgba(255, 215, 0, 0.5), inset 0 0 20px rgba(255, 180, 60, 0.3);
  animation: sealRingPulse 1s ease-in-out infinite;
}
.seal-flash-text {
  margin-top: 16px;
  font-size: 16px;
  font-weight: 800;
  color: #ffd700;
  text-shadow: 0 0 12px rgba(255, 215, 0, 0.6);
}
@keyframes sealFlashIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes sealRingPulse {
  0%, 100% { transform: scale(1); opacity: 0.85; }
  50% { transform: scale(1.12); opacity: 1; }
}

.rules-box {
  padding: 8px 10px;
  border: 1px dashed rgba(212, 168, 67, 0.35);
  border-radius: 10px;
  background: rgba(212, 168, 67, 0.08);
  font-size: 12px;
  color: #c9b896;
  line-height: 1.7;
}

.writing-header {
  padding: 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(212, 168, 67, 0.2);
  border-radius: 10px;
}
.writing-header.compact { padding: 10px 12px; }
.title {
  font-size: 15px;
  color: #4a2e12;
  font-weight: bold;
  margin-bottom: 6px;
}
.topic { font-size: 13px; color: #5c4528; line-height: 1.7; }
.forge-main .title,
.forge-main .topic {
  color: #4a2e12;
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
  color: #e8dcc8;
  line-height: 1.8;
  font-style: italic;
}

/* 落墨布局 */
.forge-layout {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 16px;
  align-items: start;
}

.forge-aside {
  position: sticky;
  top: 64px;
}

.angle-reminder {
  margin-top: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(255, 215, 0, 0.06);
  border: 1px solid rgba(212, 168, 67, 0.25);
  font-size: 11px;
}
.angle-reminder-tag { display: block; color: #f4d98a; font-weight: 700; margin-bottom: 4px; }
.angle-reminder-hint { color: #c9b896; line-height: 1.5; }

.spirit-words-panel {
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255, 215, 0, 0.05);
  border: 1px solid rgba(212, 168, 67, 0.25);
}
.spirit-words-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
  color: #f4d98a;
  font-weight: 700;
}
.spirit-words-tip { font-size: 10px; color: #c9b896; font-weight: 400; }

.spirit-words { display: flex; flex-wrap: wrap; gap: 8px; }
.spirit-word {
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 12px;
  border: 1px solid rgba(212, 168, 67, 0.35);
  color: #c9b896;
  background: rgba(0, 0, 0, 0.3);
  cursor: pointer;
  transition: all 0.2s;
}
.spirit-word:hover {
  border-color: #ffd700;
  color: #ffd700;
}
.spirit-word.is-active {
  border-color: #ffd700;
  color: #ffd700;
  background: rgba(255, 215, 0, 0.12);
  box-shadow: 0 0 10px rgba(255, 215, 0, 0.25);
  cursor: default;
}

.ink-pool-bar {
  display: grid;
  grid-template-columns: 40px 56px 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(212, 168, 67, 0.2);
}
.ink-stone-icon {
  width: 36px;
  height: 36px;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));
}
.ink-pool-label { font-size: 11px; color: #d4a843; }
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
.ink-pool-text { font-size: 11px; color: #c9b896; white-space: nowrap; }

.editor-container { position: relative; min-height: 220px; }
.editor-scroll-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
  pointer-events: none;
  filter: drop-shadow(0 6px 16px rgba(0, 0, 0, 0.3));
}
.editor-container.editor-fail .writing-textarea { border-color: rgba(255, 107, 107, 0.6); }
.editor-container.editor-pass .writing-textarea { border-color: rgba(158, 232, 191, 0.6); }

.writing-textarea {
  position: relative;
  z-index: 1;
  width: calc(100% - 24px);
  min-height: 180px;
  margin: 10% 12px 12%;
  padding: 8px 10px 28px;
  background: rgba(255, 250, 240, 0.55);
  border: 1px dashed rgba(140, 100, 50, 0.35);
  border-radius: 8px;
  color: #2a1a08;
  font-size: 14px;
  line-height: 1.7;
  resize: vertical;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
}
.writing-textarea:focus {
  border-color: rgba(212, 168, 67, 0.7);
  box-shadow: 0 0 12px rgba(255, 215, 0, 0.15);
  background: rgba(255, 252, 245, 0.72);
}

.word-count {
  position: absolute;
  bottom: 14%;
  right: 8%;
  z-index: 2;
  font-size: 11px;
  color: #6a5030;
  pointer-events: none;
}
.word-count.is-enough { color: #d4a843; }
.word-count.is-over { color: #ff6b6b; }

.validate-box {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(212, 168, 67, 0.25);
  background: rgba(255, 255, 255, 0.04);
  font-size: 12px;
  color: #c9b896;
}
.validate-header { font-weight: 700; margin-bottom: 6px; }
.check-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px 12px;
  line-height: 1.7;
}
.check-line span:first-child { margin-right: 4px; }
.missing-words { margin-top: 6px; color: #ffd6d2; }

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}
.actions-center { justify-content: center; }

.btn {
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}
.btn-start { padding: 12px 32px; font-size: 15px; }
.btn-draft {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(212, 168, 67, 0.4);
  color: #f4d98a;
}
.btn-ghost {
  background: transparent;
  border: 1px solid rgba(201, 184, 150, 0.35);
  color: #c9b896;
}
.btn-primary {
  background: linear-gradient(180deg, #d4a843, #a07820);
  color: #1a1004;
}
.btn-primary.btn-seal-ready {
  background: linear-gradient(180deg, #ffe566, #d4a843);
  box-shadow: 0 0 16px rgba(255, 215, 0, 0.45);
  animation: sealPulse 1.4s ease-in-out infinite;
}
@keyframes sealPulse {
  0%, 100% { box-shadow: 0 0 10px rgba(255, 215, 0, 0.35); }
  50% { box-shadow: 0 0 22px rgba(255, 215, 0, 0.7); }
}
.btn-primary:disabled { opacity: 0.45; cursor: not-allowed; animation: none; }

@media (max-width: 720px) {
  .forge-layout { grid-template-columns: 1fr; }
  .forge-aside { position: static; }
  .angle-cards { grid-template-columns: 1fr; }
  .check-grid { grid-template-columns: 1fr; }
}
</style>
