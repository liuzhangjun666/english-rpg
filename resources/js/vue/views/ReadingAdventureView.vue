<template>
  <div v-if="sceneReady" class="cangjing-page" :style="{ backgroundImage: `url(${bgImage})` }">
    <div class="cangjing-shell">
      <template v-if="stage === 'rules'">
        <div class="lobby-card" :style="{ backgroundImage: `url(${bgImage})` }">
          <div class="lobby-mask"></div>
          <div class="lobby-content">
            <ModuleRulesIntro
              module-key="reading"
              :show-back="true"
              @confirm="stage = 'lobby'"
              @back="backHall"
            />
          </div>
        </div>
      </template>

      <template v-else-if="stage === 'lobby'">
        <div class="lobby-card" :style="{ backgroundImage: `url(${bgImage})` }">
          <div class="lobby-mask"></div>
          <div class="lobby-content">
            <div class="lobby-head-row">
              <div class="lobby-title">准备进入经文机关</div>
              <div class="lobby-head-actions">
                <PracticeVariantSwitch
                  :model-value="practiceVariant"
                  :arcade-enabled="true"
                  :arcade-playable="arcadePlayable"
                  @update:model-value="setPracticeVariant"
                />
                <button
                  v-if="!isArcadeVariant"
                  type="button"
                  class="lobby-back-btn"
                  @click="backHall"
                >
                  返回大厅
                </button>
              </div>
            </div>

            <ArcadePracticePanel
              v-if="isArcadeVariant"
              ability="reading"
              :stage-no="currentLevel.stageNo"
              :realm="currentLevel.realm"
              @back="backHall"
              @switch-classic="setPracticeVariant('classic')"
              @settled="onArcadeSettled"
            />

            <template v-else>
              <div class="lobby-meta">当前境界：{{ currentRealmLabel }}</div>
              <div class="lobby-meta">当前关卡：{{ currentLevel.levelId }}（{{ currentLevel.index + 1 }}/{{ currentLevel.total }}）</div>
              <div class="lobby-meta">本关题数：{{ totalCount }} ｜ 消耗灵力：{{ spiritCost }} ｜ 当前灵力：{{ currentSpirit }}</div>
              <div class="lobby-meta">残卷已收集：{{ scrollFragmentCount }} 片</div>
              <div v-if="totalCount <= 0" class="lobby-meta lobby-empty-hint">当前境界暂无阅读题目，请先修炼其他模块。</div>
              <div class="lobby-actions">
                <el-button type="primary" :disabled="totalCount <= 0" @click="startMechanism">进入机关</el-button>
                <el-button @click="backHall">返回大厅</el-button>
              </div>
            </template>
          </div>
        </div>
      </template>

      <template v-else-if="stage === 'answer' && currentQuestion">
        <div class="mechanism-stage" :style="{ backgroundImage: `url(${bgImage})` }">
          <div class="stage-mask"></div>
          <div class="stage-content">
            <div class="stage-top">
              <button class="icon-btn" type="button" @click="cancelChallenge" title="返回关卡">
                <img :src="backIcon" alt="返回" />
              </button>
              <div class="stage-title">藏经阁·经文机关</div>
              <div class="stage-realm">{{ currentRealmLabel }}</div>
            </div>

            <div class="lock-panel" :class="{ 'lock-burst': verdictFlash === 'correct' }">
              <div class="lock-title">机关锁 {{ solvedCount }}/{{ totalCount }}</div>
              <div class="lock-track"><div class="lock-fill" :style="{ width: `${lockPercent}%` }"></div></div>
              <div class="lantern-row">
                <div
                  v-for="(lamp, idx) in lanternDefs"
                  :key="lamp.key"
                  class="lantern"
                  :class="{
                    unlocked: isLampUnlocked(idx),
                    active: idx === currentQuestionIndex,
                    pulsing: verdictFlash === 'correct' && idx === currentQuestionIndex,
                  }"
                >
                  <span class="lantern-name">{{ lamp.name }}</span>
                  <span class="lantern-sub">{{ isLampUnlocked(idx) ? '已点亮' : lamp.sub }}</span>
                </div>
              </div>
            </div>

            <div
              class="scroll-panel"
              :class="{
                'scroll-good': currentChoiceCorrect === true,
                'scroll-bad': verdictFlash === 'wrong',
                'scroll-flash-good': verdictFlash === 'correct',
                'scroll-flash-bad': verdictFlash === 'wrong',
              }"
            >
              <img class="scroll-bg" :src="questionIcon" alt="" aria-hidden="true" />
              <div class="scroll-inner">
                <div class="scroll-title">经文探秘</div>
                <div class="scroll-text" v-html="passageDisplayHtml"></div>
                <div class="scroll-question-block">
                  <div class="scroll-question-head">{{ questionBlockTitle }} {{ currentQuestionIndex + 1 }}/{{ totalCount }}</div>
                  <div class="scroll-question-stem">{{ currentQuestionStem }}</div>
                  <div v-if="isTfJudgeMode" class="scroll-question-claim">命题：{{ currentClaimText }}</div>
                </div>
              </div>
            </div>

            <div
              v-if="isTfJudgeMode"
              class="judge-panel"
              :class="{ 'judge-shake': verdictFlash === 'wrong' }"
            >
              <button
                class="judge-btn judge-true"
                :class="{
                  selected: currentChoice === 'T' && currentChoiceCorrect === null,
                  'pick-correct': currentChoice === 'T' && currentChoiceCorrect === true,
                  'pick-wrong': currentChoice === 'T' && verdictFlash === 'wrong',
                  'answer-hint': showAnswerHint && correctJudgeChoice === 'T',
                }"
                type="button"
                @click="selectJudge('T')"
              >
                <img class="judge-bg" :src="optionIcon" alt="" aria-hidden="true" />
                <span class="judge-label">T 正确</span>
                <span v-if="currentChoice === 'T' && currentChoiceCorrect === true" class="judge-verdict-icon">✓</span>
              </button>
              <button
                class="judge-btn judge-false"
                :class="{
                  selected: currentChoice === 'F' && currentChoiceCorrect === null,
                  'pick-correct': currentChoice === 'F' && currentChoiceCorrect === true,
                  'pick-wrong': currentChoice === 'F' && verdictFlash === 'wrong',
                  'answer-hint': showAnswerHint && correctJudgeChoice === 'F',
                }"
                type="button"
                @click="selectJudge('F')"
              >
                <img class="judge-bg" :src="optionIcon" alt="" aria-hidden="true" />
                <span class="judge-label">F 错误</span>
                <span v-if="currentChoice === 'F' && currentChoiceCorrect === true" class="judge-verdict-icon">✓</span>
              </button>
            </div>

            <div
              v-else
              class="choice-panel"
              :class="{
                'choice-shake': verdictFlash === 'wrong',
                'choice-panel--triple': currentQuestionOptions.length === 3,
              }"
            >
              <button
                v-for="opt in currentQuestionOptions"
                :key="`${currentQuestionId}-${opt.value}`"
                class="choice-btn"
                :class="{
                  selected: currentChoice === opt.value && !isQuestionSolved(currentQuestionId),
                  'pick-correct': currentChoice === opt.value && isQuestionSolved(currentQuestionId),
                  'pick-wrong': currentChoice === opt.value && verdictFlash === 'wrong',
                  'answer-hint': showAnswerHint && correctOptionKey === opt.value,
                }"
                type="button"
                @click="selectChoice(opt.value)"
              >
                <img class="choice-bg" :src="optionIcon" alt="" aria-hidden="true" />
                <span class="choice-key">{{ opt.label }}</span>
                <span class="choice-text">{{ opt.text }}</span>
                <span v-if="currentChoice === opt.value && isQuestionSolved(currentQuestionId)" class="choice-verdict-icon">✓</span>
              </button>
            </div>

            <div
              class="feedback-panel"
              :class="{
                good: currentChoiceCorrect === true,
                bad: verdictFlash === 'wrong',
                pop: verdictFlash !== null,
              }"
            >
              <span v-if="currentChoiceCorrect === true" class="feedback-icon good">✓</span>
              <span v-else-if="verdictFlash === 'wrong'" class="feedback-icon bad">✗</span>
              <span class="feedback-text">{{ feedbackText }}</span>
            </div>

            <div class="nav-panel">
              <button class="nav-arrow" type="button" :disabled="currentQuestionIndex === 0" @click="prevQuestion">上一题</button>
              <div class="index-list">
                <button
                  v-for="(q, idx) in questions"
                  :key="String(q.question_id || idx)"
                  class="index-btn"
                  :class="{
                    active: idx === currentQuestionIndex,
                    done: Boolean(answerChoices[String(q.question_id)]),
                    solved: isQuestionSolved(String(q.question_id))
                  }"
                  type="button"
                  @click="jumpTo(idx)"
                >{{ idx + 1 }}</button>
              </div>
              <button class="nav-arrow" type="button" :disabled="currentQuestionIndex >= totalCount - 1" @click="nextQuestion">下一题</button>
            </div>

            <div class="reward-strip">
              <div class="reward-item">
                <span class="label">阅读悟性</span>
                <span class="value">+{{ solvedCount * 4 }}</span>
              </div>
              <div class="reward-item">
                <span class="label">残卷收集</span>
                <span class="value">{{ scrollFragmentCount }} 片</span>
              </div>
              <div class="reward-item">
                <span class="label">已收集</span>
                <span class="value">{{ currentLevel.index + 1 }}/{{ currentLevel.total }}</span>
              </div>
            </div>

            <div class="bottom-actions">
              <el-button @click="useHint" :disabled="hintCount <= 0">燃香问典（{{ hintCount }}）</el-button>
              <el-button type="primary" :disabled="!allMechanismsSolved" @click="submitChallenge">收卷破关</el-button>
              <el-button @click="cancelChallenge">退出机关</el-button>
            </div>
          </div>
        </div>
      </template>

      <template v-else-if="stage === 'result'">
        <div class="cult-panel result-panel">
          <div class="cult-panel-body">
            <div class="cult-result" :class="result.passed ? 'success' : 'warning'">
              <div class="cult-result-icon">{{ result.passed ? '✦' : '☁' }}</div>
              <div class="cult-result-title">{{ result.passed ? '机关通关' : '机关未破' }}</div>
              <div class="cult-result-sub">
                正确率 {{ result.accuracy }}% ｜ 灵气 +{{ result.exp }} ｜ 灵石 +{{ result.stones }}
              </div>
              <div v-if="result.perfectCombo" class="cult-result-bonus">顿悟连破 · 灵气额外 +20%</div>
              <div v-if="result.newFragment" class="cult-result-bonus">残卷收录 +1，已藏入经阁</div>
              <div class="cult-actions">
                <el-button type="primary" @click="retryLevel">再试一次</el-button>
                <el-button v-if="result.passed" @click="nextLevel">下一关</el-button>
                <el-button @click="backHall">返回大厅</el-button>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useApiClient } from '../services/api';
import { useLegacyBridge } from '../composables/useLegacyBridge';
import { useSceneEntry } from '../composables/useSceneEntry';
import { useReturnToHall } from '../composables/useReturnToHall';
import { getReadingSceneAssets, SCENE_ENTRY_TEXT } from '../data/sceneViewAssets';
import { useUiStore } from '../stores/ui';
import { useUserStore } from '../stores/user';
import {
  isArcadePlayable,
  loadVariantPreference,
  parsePracticeVariant,
  saveVariantPreference,
  type PracticeVariant,
} from '../data/arcadeModes';
import bgImage from '../../../assets/images/ui/cangjingge/background.png';
import backIcon from '../../../assets/images/ui/cangjingge/back.png';
import questionIcon from '../../../assets/images/ui/cangjingge/question.png';
import optionIcon from '../../../assets/images/ui/cangjingge/options.png';
import ModuleRulesIntro from '../components/ModuleRulesIntro.vue';
import PracticeVariantSwitch from '../components/practice/PracticeVariantSwitch.vue';
import ArcadePracticePanel from '../components/practice/ArcadePracticePanel.vue';

type Stage = 'rules' | 'lobby' | 'answer' | 'result';
type JudgeChoice = 'T' | 'F';
type AnswerChoice = JudgeChoice | 'A' | 'B' | 'C' | 'D';
type LevelInfo = {
  realm: string;
  stageNo: number;
  levelId: string;
  index: number;
  total: number;
};
type OptionEntry = {
  label: string;
  value: string;
  text: string;
};
type JudgeState = {
  claimIsTrue: boolean;
  claimValue: string;
  claimText: string;
  correctValue: string;
  wrongValue: string;
};

const SCROLL_FRAGMENTS_KEY = 'reading_scroll_fragments';
const lanternTypeDefs: Record<string, { key: string; name: string; sub: string }> = {
  detail: { key: 'detail', name: '寻物灯', sub: '待寻线索' },
  word: { key: 'word', name: '辨意灯', sub: '待辨经义' },
  infer: { key: 'infer', name: '悟道灯', sub: '待悟道' },
  tf: { key: 'word', name: '辨意灯', sub: '待辨经义' },
  single: { key: 'detail', name: '寻物灯', sub: '待寻线索' },
};

const lanternDefs = computed(() => {
  const fallback = [
    lanternTypeDefs.detail,
    lanternTypeDefs.word,
    lanternTypeDefs.infer,
  ];
  return questions.value.map((q, idx) => {
    const type = String(q.question_type || '').toLowerCase();
    return lanternTypeDefs[type] || fallback[idx % fallback.length];
  });
});

const router = useRouter();
const route = useRoute();
const api = useApiClient();
const bridge = useLegacyBridge();
const ui = useUiStore();
const { sceneReady, runSceneEntry } = useSceneEntry();
const { returnToHall } = useReturnToHall();
const user = useUserStore();

const stage = ref<Stage>('rules');
const practiceVariant = ref<PracticeVariant>(
  parsePracticeVariant(route.query.variant) || loadVariantPreference('reading'),
);
const arcadePlayable = computed(() => isArcadePlayable('reading'));
const isArcadeVariant = computed(() => practiceVariant.value === 'arcade' && arcadePlayable.value);
const questions = ref<Array<Record<string, any>>>([]);
const spiritCost = ref(5);
const currentSpirit = ref(0);
const currentQuestionIndex = ref(0);
const hintCount = ref(3);
const judgeStateCache = ref<Record<string, JudgeState>>({});
const answerChoices = reactive<Record<string, AnswerChoice>>({});
const answers = reactive<Record<string, string>>({});
const firstTryCorrect = reactive<Record<string, boolean>>({});
const wrongAttempts = reactive<Record<string, number>>({});
const clueHighlights = reactive<Record<string, string>>({});
const feedbackText = ref('');
const verdictFlash = ref<'correct' | 'wrong' | null>(null);
let verdictFlashTimer: ReturnType<typeof setTimeout> | null = null;

const result = ref({
  passed: false,
  accuracy: 0,
  exp: 0,
  stones: 0,
  perfectCombo: false,
  newFragment: false,
});
const scrollFragmentTick = ref(0);

const currentRealmLabel = computed(() => {
  const currentRealm = String(user.profile?.current_realm || '').trim();
  if (currentRealm) return currentRealm;
  const realm = String(user.profile?.realm || 'L1').toUpperCase();
  const stageNo = Number(user.profile?.realm_stage || 1);
  return `${realm} · ${stageNo}重`;
});

const currentLevel = computed<LevelInfo>(() => getCurrentPlayableLevel());
const totalCount = computed(() => questions.value.length);
const answeredCount = computed(() => {
  return questions.value.filter((q) => Boolean(answerChoices[String(q.question_id)])).length;
});
const solvedCount = computed(() => {
  return questions.value.filter((q) => isQuestionSolved(String(q.question_id || ''))).length;
});
const lockPercent = computed(() => {
  if (totalCount.value <= 0) return 0;
  return Math.round((solvedCount.value / totalCount.value) * 100);
});
const allMechanismsSolved = computed(() => {
  if (totalCount.value <= 0) return false;
  return questions.value.every((q) => isQuestionSolved(String(q.question_id || '')));
});
const scrollFragmentCount = computed(() => {
  void scrollFragmentTick.value;
  return readScrollFragments().length;
});
const isTfJudgeMode = computed(() => /^L[123]$/.test(readingRealmCode()));
const questionBlockTitle = computed(() => (isTfJudgeMode.value ? '真伪灵签' : '阅读灵签'));
const currentQuestionOptions = computed(() => optionEntries(currentQuestion.value?.options));
const currentQuestion = computed(() => questions.value[currentQuestionIndex.value] || null);
const currentQuestionId = computed(() => String(currentQuestion.value?.question_id || ''));
const correctOptionKey = computed(() => getCorrectOptionKey(currentQuestion.value));
const currentChoice = computed(() => answerChoices[currentQuestionId.value] || '');
const currentChoiceCorrect = computed<boolean | null>(() => {
  const qid = currentQuestionId.value;
  if (!qid || !isQuestionSolved(qid)) return null;
  return true;
});
const showAnswerHint = computed(() => {
  const qid = currentQuestionId.value;
  if (!qid || isQuestionSolved(qid)) return false;
  return (wrongAttempts[qid] || 0) >= 2;
});
const correctJudgeChoice = computed<JudgeChoice | ''>(() => {
  const state = getJudgeState(currentQuestion.value);
  if (!state) return '';
  return state.claimIsTrue ? 'T' : 'F';
});
const currentQuestionStem = computed(() => {
  const stem = String(currentQuestion.value?.question || '').trim();
  if (stem) return stem;
  return isTfJudgeMode.value ? '请判断命题真伪' : '请选择正确答案';
});
const passageText = computed(() => getPassageText(currentQuestion.value));
const currentClaimText = computed(() => {
  const qid = currentQuestionId.value;
  if (!qid) return '';
  return getJudgeState(currentQuestion.value)?.claimText || '';
});
const passageDisplayHtml = computed(() => {
  const text = getPassageText(currentQuestion.value);
  const qid = currentQuestionId.value;
  const highlight = clueHighlights[qid] || '';
  return buildPassageHtml(text, highlight);
});

onMounted(async () => {
  try {
    await runSceneEntry({
      text: SCENE_ENTRY_TEXT.reading,
      assets: getReadingSceneAssets(),
      bootstrap: async () => {
        await bridge.switchToReadingScene();
        await bridge.closeLegacyPanels();
        syncProgressWithRealmFloor();
        await reloadQuestions();
      },
    });
  } catch {
    ElMessage.error('藏经阁加载失败');
  }
});

onBeforeUnmount(() => {
  if (verdictFlashTimer) clearTimeout(verdictFlashTimer);
  if (autoAdvanceTimer) clearTimeout(autoAdvanceTimer);
  void bridge.closeLegacyPanels();
});

function readingRealmCode(): string {
  const realm = String(user.profile?.realm || 'L1').toUpperCase();
  const supported = new Set(['L1', 'L2', 'L3', 'Z1', 'J1', 'Y1', 'H1']);
  return supported.has(realm) ? realm : 'L1';
}

function levelSequence(): Array<Omit<LevelInfo, 'index' | 'total'>> {
  const realm = readingRealmCode();
  const list: Array<Omit<LevelInfo, 'index' | 'total'>> = [];
  for (let stageNo = 1; stageNo <= 9; stageNo += 1) {
    list.push({
      realm,
      stageNo,
      levelId: `${realm}-${String(stageNo).padStart(2, '0')}`,
    });
  }
  return list;
}

function progressKey() {
  const uid = user.profile?.id || 'guest';
  return `levelup_progress_reading_${uid}_${readingRealmCode()}`;
}

function realmFloorIndex() {
  const stageNoRaw = Number(user.profile?.realm_stage || 1);
  const stageNo = Math.min(9, Math.max(1, Number.isFinite(stageNoRaw) ? stageNoRaw : 1));
  return stageNo - 1;
}

function syncProgressWithRealmFloor() {
  const floor = realmFloorIndex();
  const unlocked = Number(localStorage.getItem(progressKey()) || '0');
  if (floor > unlocked) {
    localStorage.setItem(progressKey(), String(floor));
  }
}

function getCurrentPlayableLevel(): LevelInfo {
  const list = levelSequence();
  const unlocked = Number(localStorage.getItem(progressKey()) || '0');
  const floor = realmFloorIndex();
  const index = Math.min(Math.max(Math.max(unlocked, floor), 0), list.length - 1);
  return {
    ...list[index],
    index,
    total: list.length,
  };
}

function unlockNextLevel(levelId: string) {
  const list = levelSequence();
  const idx = list.findIndex((it) => it.levelId === levelId);
  if (idx < 0) return;
  const unlocked = Number(localStorage.getItem(progressKey()) || '0');
  const next = Math.min(list.length - 1, idx + 1);
  if (next > unlocked) {
    localStorage.setItem(progressKey(), String(next));
  }
}

function readScrollFragments(): string[] {
  try {
    const raw = localStorage.getItem(SCROLL_FRAGMENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function collectScrollFragment(levelId: string): boolean {
  const list = readScrollFragments();
  if (list.includes(levelId)) return false;
  list.push(levelId);
  localStorage.setItem(SCROLL_FRAGMENTS_KEY, JSON.stringify(list));
  scrollFragmentTick.value += 1;
  return true;
}

function isLampUnlocked(idx: number) {
  const q = questions.value[idx];
  if (!q) return false;
  return isQuestionSolved(String(q.question_id || ''));
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildPassageHtml(passage: string, highlight: string) {
  const safe = escapeHtml(passage);
  const needle = highlight.trim();
  if (!needle) return safe;
  const safeNeedle = escapeHtml(needle);
  const idx = safe.toLowerCase().indexOf(safeNeedle.toLowerCase());
  if (idx < 0) return safe;
  return `${safe.slice(0, idx)}<mark class="clue-mark">${safe.slice(idx, idx + safeNeedle.length)}</mark>${safe.slice(idx + safeNeedle.length)}`;
}

function splitSentences(passage: string) {
  return passage.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
}

function findClueSentence(question: Record<string, any> | null) {
  if (!question) return '';
  const clue = String(question.clue_sentence || '').trim();
  if (clue) return clue;

  const passage = getPassageText(question);
  const sentences = splitSentences(passage);
  if (sentences.length === 0) return passage;

  const q = String(question.question || '').toLowerCase();
  if (q.includes('what pet') || q.includes('who') || q.includes('where')) {
    return sentences.find((s) => /pet|name|have/i.test(s)) || sentences[0];
  }
  if (q.includes('play') || q.includes('garden') || q.includes('morning')) {
    return sentences.find((s) => /garden|play|morning|feed/i.test(s)) || sentences[1] || sentences[0];
  }
  if (q.includes('why') || q.includes('friend')) {
    return sentences.find((s) => /friend|friendly|cute|because/i.test(s)) || sentences[sentences.length - 1];
  }

  const words = q.split(/\W+/).filter((w) => w.length > 4);
  for (const word of words) {
    const hit = sentences.find((s) => s.toLowerCase().includes(word));
    if (hit) return hit;
  }
  return sentences[Math.min(Number(question.question_no || 1) - 1, sentences.length - 1)] || sentences[0];
}

function lampFeedbackMessage(index: number) {
  const lamp = lanternDefs.value[index] || lanternDefs.value[0];
  if (lamp.key === 'detail') return '寻物灯亮！细节线索已与经文吻合。';
  if (lamp.key === 'word') return '辨意灯亮！经义判断无误。';
  return '悟道灯亮！机关洞开，推理成立。';
}

function optionEntries(options: unknown): OptionEntry[] {
  if (Array.isArray(options)) {
    if (options.length > 0 && typeof options[0] === 'object') {
      return options.map((item: any, idx: number) => ({
        label: String(item.label || String.fromCharCode(65 + idx)),
        value: String(item.value || item.label || String.fromCharCode(65 + idx)),
        text: String(item.text || item.value || ''),
      }));
    }
    return options.map((item: any, idx: number) => ({
      label: String.fromCharCode(65 + idx),
      value: String.fromCharCode(65 + idx),
      text: String(item),
    }));
  }
  if (options && typeof options === 'object') {
    return Object.keys(options as Record<string, any>).map((key) => ({
      label: key,
      value: key,
      text: String((options as Record<string, any>)[key]),
    }));
  }
  return [];
}

function normalize(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

function hashSeed(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

function getCorrectOptionKey(question: Record<string, any> | null): string {
  if (!question) return '';
  const correctRaw = String(question.correct_answer || '').trim().toUpperCase();
  const options = optionEntries(question.options);
  const hit = options.find((opt) => normalize(opt.value) === normalize(correctRaw)
    || normalize(opt.label) === normalize(correctRaw));
  return hit?.value || correctRaw;
}

function defaultFeedbackText() {
  return isTfJudgeMode.value ? '细读经文，判断真伪灵签。' : '细读经文，选择正确灵签。';
}

function wrongAttemptFeedback(wrongCount: number) {
  if (wrongCount >= 2) {
    return isTfJudgeMode.value
      ? '机关回弹！文中线索已标出，正确答案方向也已暗示。'
      : '机关回弹！文中线索已标出，正确选项方向也已暗示。';
  }
  return isTfJudgeMode.value
    ? '机关回弹！线索已在文中标出，请再选 T/F。'
    : '机关回弹！线索已在文中标出，请再选一项。';
}

function fallbackWrongValue(correctValue: string) {
  const pool = ['A', 'B', 'C', 'D'];
  const found = pool.find((v) => normalize(v) !== normalize(correctValue));
  return found || 'A';
}

function getJudgeState(question: Record<string, any> | null): JudgeState | null {
  if (!question) return null;
  const qid = String(question.question_id || '');
  if (!qid) return null;
  if (judgeStateCache.value[qid]) return judgeStateCache.value[qid];

  const options = optionEntries(question.options);
  const correctRaw = String(question.correct_answer || '').trim();
  const correct = options.find((opt) => normalize(opt.value) === normalize(correctRaw)
    || normalize(opt.label) === normalize(correctRaw)
    || normalize(opt.text) === normalize(correctRaw)) || options[0] || {
      label: 'A',
      value: correctRaw || 'A',
      text: correctRaw || 'A',
    };

  const wrong = options.find((opt) => normalize(opt.value) !== normalize(correct.value)
    && normalize(opt.label) !== normalize(correct.value)) || {
      label: 'B',
      value: fallbackWrongValue(correct.value),
      text: '错误项',
    };

  const claimIsTrue = options.length > 1 ? (hashSeed(qid) % 2 === 0) : true;
  const claim = claimIsTrue ? correct : wrong;

  const state: JudgeState = {
    claimIsTrue,
    claimValue: String(claim.value),
    claimText: `${String(claim.text)} 是本题正确答案。`,
    correctValue: String(correct.value),
    wrongValue: String(wrong.value || fallbackWrongValue(String(correct.value))),
  };

  judgeStateCache.value[qid] = state;
  return state;
}

function mapJudgeToAnswer(question: Record<string, any>, choice: JudgeChoice) {
  const state = getJudgeState(question);
  if (!state) return '';
  if (choice === 'T') {
    return state.claimValue;
  }
  return state.claimIsTrue ? state.wrongValue : state.correctValue;
}

function resetRoundState() {
  Object.keys(answerChoices).forEach((key) => delete answerChoices[key]);
  Object.keys(answers).forEach((key) => delete answers[key]);
  Object.keys(firstTryCorrect).forEach((key) => delete firstTryCorrect[key]);
  Object.keys(wrongAttempts).forEach((key) => delete wrongAttempts[key]);
  Object.keys(clueHighlights).forEach((key) => delete clueHighlights[key]);
  judgeStateCache.value = {};
  currentQuestionIndex.value = 0;
  hintCount.value = 3;
  verdictFlash.value = null;
  if (verdictFlashTimer) {
    clearTimeout(verdictFlashTimer);
    verdictFlashTimer = null;
  }
  feedbackText.value = defaultFeedbackText();
}

function triggerVerdictFlash(type: 'correct' | 'wrong') {
  verdictFlash.value = type;
  if (verdictFlashTimer) clearTimeout(verdictFlashTimer);
  verdictFlashTimer = setTimeout(() => {
    verdictFlash.value = null;
    verdictFlashTimer = null;
  }, 900);
}

function restoreFeedbackForCurrent() {
  const qid = currentQuestionId.value;
  if (!qid) {
    feedbackText.value = defaultFeedbackText();
    return;
  }
  if (isQuestionSolved(qid)) {
    feedbackText.value = lampFeedbackMessage(currentQuestionIndex.value);
    return;
  }
  if (answerChoices[qid]) {
    feedbackText.value = wrongAttemptFeedback(wrongAttempts[qid] || 0);
    return;
  }
  feedbackText.value = defaultFeedbackText();
}

function getPassageText(question: Record<string, any> | null) {
  if (!question) return '经文尚未显现。';
  const content = String(
    question.reading_passage
    || question.passage
    || question.material
    || question.article
    || question.context
    || question.question
    || ''
  ).trim();
  if (!content) return '经文尚未显现。';
  return content;
}

function isQuestionSolved(questionId: string) {
  const choice = answerChoices[questionId];
  if (!choice) return false;
  const question = questions.value.find((q) => String(q.question_id || '') === questionId);
  if (!question) return false;

  if (isTfJudgeMode.value) {
    const state = getJudgeState(question);
    if (!state) return false;
    return state.claimIsTrue ? choice === 'T' : choice === 'F';
  }

  return normalize(choice) === normalize(getCorrectOptionKey(question));
}

function mapChoiceToAnswer(question: Record<string, any>, choice: AnswerChoice) {
  if (isTfJudgeMode.value) {
    return mapJudgeToAnswer(question, choice as JudgeChoice);
  }
  return String(choice);
}

async function reloadQuestions() {
  const level = currentLevel.value;
  ui.showLoading('读取关卡...');
  try {
    const res = await api.get(`/reading/questions?level=${level.realm}&stage=${String(level.stageNo).padStart(2, '0')}`);
    if (!res?.success || !res?.data) {
      ElMessage.error(res?.message || '读取题目失败');
      return;
    }

    questions.value = Array.isArray(res.data.questions) ? res.data.questions : [];
    spiritCost.value = Number(res.data.spirit_cost || 5);
    currentSpirit.value = Number(res.data.current_spirit_power ?? user.profile?.spirit_power ?? 0);
    user.updateProfile({ spirit_power: currentSpirit.value });
    stage.value = 'lobby';
    result.value = { passed: false, accuracy: 0, exp: 0, stones: 0, perfectCombo: false, newFragment: false };
    resetRoundState();
  } finally {
    ui.hideLoading();
  }
}

async function startMechanism() {
  if (totalCount.value <= 0) {
    ElMessage.warning('当前境界暂无阅读题目');
    return;
  }
  const level = currentLevel.value;
  const consumeRes = await api.post('/user/consume-spirit', {
    amount: spiritCost.value,
    reason: `reading:${level.levelId}`,
  });

  if (Number.isFinite(Number(consumeRes?.data?.current_spirit_power))) {
    currentSpirit.value = Number(consumeRes.data.current_spirit_power);
    user.updateProfile({ spirit_power: currentSpirit.value });
  }

  if (!consumeRes?.success) {
    ElMessage.error(consumeRes?.message || '灵力不足，无法闯关');
    return;
  }

  stage.value = 'answer';
  feedbackText.value = defaultFeedbackText();
}

let autoAdvanceTimer: ReturnType<typeof setTimeout> | null = null;

function selectJudge(choice: JudgeChoice) {
  selectChoice(choice);
}

function selectChoice(choice: AnswerChoice) {
  const q = currentQuestion.value;
  if (!q) return;
  const qid = String(q.question_id || '');
  if (!qid) return;
  if (isQuestionSolved(qid)) return;

  answerChoices[qid] = choice;
  const correct = isQuestionSolved(qid);

  if (!(qid in firstTryCorrect)) {
    firstTryCorrect[qid] = correct;
  }

  if (correct) {
    answers[qid] = mapChoiceToAnswer(q, choice);
    triggerVerdictFlash('correct');
    feedbackText.value = lampFeedbackMessage(currentQuestionIndex.value);
    if (autoAdvanceTimer) clearTimeout(autoAdvanceTimer);
    autoAdvanceTimer = setTimeout(() => {
      autoAdvanceTimer = null;
      if (currentQuestionIndex.value < totalCount.value - 1 && allMechanismsSolved.value === false) {
        nextQuestion();
      }
    }, 1100);
    return;
  }

  wrongAttempts[qid] = (wrongAttempts[qid] || 0) + 1;
  clueHighlights[qid] = findClueSentence(q);
  triggerVerdictFlash('wrong');
  feedbackText.value = wrongAttemptFeedback(wrongAttempts[qid]);
}

function prevQuestion() {
  currentQuestionIndex.value = Math.max(0, currentQuestionIndex.value - 1);
  restoreFeedbackForCurrent();
}

function nextQuestion() {
  currentQuestionIndex.value = Math.min(totalCount.value - 1, currentQuestionIndex.value + 1);
  restoreFeedbackForCurrent();
}

function jumpTo(index: number) {
  currentQuestionIndex.value = Math.max(0, Math.min(totalCount.value - 1, index));
  restoreFeedbackForCurrent();
}

function useHint() {
  if (hintCount.value <= 0) {
    ElMessage.warning('燃香已尽，暂无问典之机');
    return;
  }
  const q = currentQuestion.value;
  if (!q) return;
  const qid = String(q.question_id || '');
  if (!qid) return;
  hintCount.value -= 1;
  clueHighlights[qid] = findClueSentence(q);
  feedbackText.value = '燃香问典：文中关键句已标出，请细读再判。';
}

async function submitChallenge() {
  if (questions.value.length === 0) {
    ElMessage.warning('当前关卡暂无题目');
    return;
  }
  if (questions.value.some((q) => !isQuestionSolved(String(q.question_id || '')))) {
    ElMessage.warning('三盏灯未齐亮，请先破解全部机关');
    return;
  }

  const level = currentLevel.value;
  ui.showLoading('结算中...');
  try {
    const payload = {
      level: level.realm,
      stage: String(level.stageNo).padStart(2, '0'),
      answers: questions.value.map((q) => ({
        question_id: String(q.question_id),
        answer: String(answers[String(q.question_id)] || ''),
        mode: 'choice',
      })),
    };

    const res = await api.post('/reading/submit-batch', payload);
    if (!res?.success) {
      ElMessage.error(res?.message || '提交失败');
      return;
    }

    const data = res.data || {};
    const baseExp = Number(data.total_exp ?? data.exp_gained ?? 0);
    const perfectCombo = questions.value.every((q) => firstTryCorrect[String(q.question_id || '')] === true);
    const bonusExp = perfectCombo ? Math.round(baseExp * 0.2) : 0;
    const totalExp = baseExp + bonusExp;
    const passed = Boolean(data.passed);
    const newFragment = passed ? collectScrollFragment(level.levelId) : false;

    result.value = {
      passed,
      accuracy: Number(data.accuracy || 0),
      exp: totalExp,
      stones: Number(data.stones_gained || 0),
      perfectCombo,
      newFragment,
    };

    user.updateProfile({
      exp: Number(user.profile?.exp || 0) + totalExp,
      spirit_stone: Number(user.profile?.spirit_stone || 0) + result.value.stones,
      spirit_power: currentSpirit.value,
    });

    if (result.value.passed) {
      unlockNextLevel(level.levelId);
    }

    stage.value = 'result';
  } finally {
    ui.hideLoading();
  }
}

function cancelChallenge() {
  if (autoAdvanceTimer) clearTimeout(autoAdvanceTimer);
  stage.value = 'lobby';
  feedbackText.value = defaultFeedbackText();
}

async function retryLevel() {
  await reloadQuestions();
}

async function nextLevel() {
  syncProgressWithRealmFloor();
  await reloadQuestions();
}

function setPracticeVariant(variant: PracticeVariant) {
  if (variant === 'arcade' && !arcadePlayable.value) {
    ElMessage.info('阅读试炼「残卷推理」接入中');
    return;
  }
  practiceVariant.value = variant;
  saveVariantPreference('reading', variant);
  const nextQuery = { ...route.query } as Record<string, string>;
  if (variant === 'arcade') nextQuery.variant = 'arcade';
  else delete nextQuery.variant;
  router.replace({ query: nextQuery });
}

function onArcadeSettled(payload: { exp: number; stones: number }) {
  ElMessage.success(`试炼结算：修为 +${payload.exp}，灵石 +${payload.stones}`);
}

function backHall() {
  void returnToHall();
}
</script>

<style scoped>
.cangjing-page {
  min-height: calc(var(--app-dvh, 100vh) - var(--hud-offset-top, var(--top-hud-height, 76px)));
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
  padding: 10px;
  box-sizing: border-box;
}

.cangjing-shell {
  min-height: calc(var(--app-dvh, 100vh) - var(--hud-offset-top, var(--top-hud-height, 76px)) - 20px);
  padding: 10px;
  overflow: hidden;
  border: 1px solid rgba(212, 168, 67, 0.4);
  background: rgba(4, 10, 22, 0.42);
  backdrop-filter: blur(2px);
}

.lobby-card {
  position: relative;
  border-radius: 12px;
  background-position: center;
  background-size: cover;
  min-height: 220px;
  border: 1px solid rgba(212, 168, 67, 0.35);
}

.lobby-mask {
  position: absolute;
  inset: 0;
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(8, 14, 30, 0.72), rgba(6, 10, 24, 0.86));
}

.lobby-content {
  position: relative;
  z-index: 1;
  padding: 16px;
}

.lobby-head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.lobby-head-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.lobby-back-btn {
  padding: 6px 14px;
  border: 1px solid rgba(212, 168, 67, 0.35);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.25);
  color: #c8b685;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: 'STKaiti', 'KaiTi', 'Microsoft YaHei', sans-serif;
}

.lobby-back-btn:hover {
  border-color: rgba(212, 168, 67, 0.7);
  color: #f4d98a;
  background: rgba(212, 168, 67, 0.1);
}

.lobby-content :deep(.arcade-panel) {
  padding: 12px;
  border-radius: 12px;
  background: rgba(6, 10, 22, 0.94);
  border: 1px solid rgba(212, 168, 67, 0.32);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.4);
}

.lobby-content :deep(.arcade-title) {
  color: #ffd978;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.55);
}

.lobby-content :deep(.arcade-sub),
.lobby-content :deep(.arcade-rules) {
  color: #d8c8a0;
}

.lobby-title {
  font-size: 24px;
  color: var(--gold-light);
  font-family: var(--font-title);
  margin-bottom: 0;
}

.lobby-meta {
  color: var(--parchment-dark);
  font-size: 13px;
  line-height: 1.7;
}

.lobby-actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.mechanism-stage {
  position: relative;
  border-radius: 12px;
  background-position: center;
  background-size: cover;
  min-height: 720px;
  border: 1px solid rgba(212, 168, 67, 0.35);
}

.stage-mask {
  position: absolute;
  inset: 0;
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(5, 10, 20, 0.52), rgba(4, 8, 18, 0.75));
}

.stage-content {
  position: relative;
  z-index: 1;
  padding: 14px;
  display: grid;
  gap: 10px;
}

.stage-top {
  display: grid;
  grid-template-columns: 54px 1fr auto;
  align-items: center;
  gap: 8px;
}

.icon-btn {
  width: 54px;
  height: 54px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
}

.icon-btn img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.stage-title {
  text-align: center;
  color: #f7dc9d;
  font-size: 30px;
  letter-spacing: 2px;
  font-family: var(--font-title);
  text-shadow: 0 3px 10px rgba(0, 0, 0, 0.6);
}

.stage-realm {
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(121, 174, 245, 0.55);
  color: #bcdfff;
  font-size: 12px;
  white-space: nowrap;
  background: rgba(7, 18, 38, 0.62);
}

.lock-panel {
  border: 1px solid rgba(212, 168, 67, 0.35);
  border-radius: 12px;
  padding: 10px;
  background: rgba(7, 14, 30, 0.62);
}

.lock-title {
  color: #f7dc9d;
  font-size: 20px;
  margin-bottom: 8px;
}

.lock-track {
  height: 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  overflow: hidden;
}

.lock-fill {
  height: 100%;
  background: linear-gradient(90deg, #2be6ff, #ffe59a);
  box-shadow: 0 0 12px rgba(43, 230, 255, 0.35);
  transition: width 0.35s cubic-bezier(0.34, 1.2, 0.64, 1);
}

.lock-panel.lock-burst .lock-fill {
  animation: lock-glow 0.85s ease;
}

.lock-panel.lock-burst .lock-title {
  animation: lock-title-pop 0.85s ease;
}

@keyframes lock-glow {
  0%, 100% { box-shadow: 0 0 12px rgba(43, 230, 255, 0.35); }
  40% { box-shadow: 0 0 28px rgba(43, 255, 196, 0.95), 0 0 48px rgba(255, 229, 154, 0.55); }
}

@keyframes lock-title-pop {
  0%, 100% { transform: scale(1); color: #f7dc9d; }
  35% { transform: scale(1.06); color: #fff4c8; text-shadow: 0 0 16px rgba(255, 236, 160, 0.8); }
}

.lantern-row {
  margin-top: 8px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.lantern {
  border: 1px solid rgba(125, 140, 170, 0.52);
  border-radius: 10px;
  text-align: center;
  padding: 8px 4px;
  color: #bcc7df;
  font-size: 12px;
  background: rgba(6, 12, 24, 0.66);
  display: flex;
  flex-direction: column;
  gap: 2px;
  transition: box-shadow 0.25s ease, border-color 0.25s ease;
}

.lantern-name {
  font-family: var(--font-title);
  font-size: 13px;
}

.lantern-sub {
  font-size: 11px;
  opacity: 0.85;
}

.lantern.active {
  border-color: rgba(255, 220, 150, 0.55);
}

.lantern.pulsing {
  animation: lantern-pulse 0.85s ease;
}

.lantern.unlocked {
  border-color: rgba(247, 220, 157, 0.7);
  color: #ffecba;
  background: rgba(85, 64, 20, 0.38);
  box-shadow: 0 0 12px rgba(255, 220, 120, 0.26);
}

@keyframes lantern-pulse {
  0%, 100% { box-shadow: 0 0 8px rgba(255, 220, 120, 0.2); }
  45% { box-shadow: 0 0 22px rgba(255, 236, 160, 0.75); }
}

.scroll-panel {
  position: relative;
  width: 100%;
  max-width: 980px;
  margin: 0 auto;
  line-height: 0;
  transition: filter 0.25s ease;
}

.scroll-panel.scroll-good .scroll-bg {
  filter:
    drop-shadow(0 0 1px rgba(8, 6, 4, 0.92))
    drop-shadow(0 0 22px rgba(72, 220, 140, 0.55))
    drop-shadow(0 10px 28px rgba(0, 0, 0, 0.38));
}

.scroll-panel.scroll-bad .scroll-bg {
  filter:
    drop-shadow(0 0 1px rgba(8, 6, 4, 0.92))
    drop-shadow(0 0 20px rgba(255, 96, 84, 0.5))
    drop-shadow(0 10px 28px rgba(0, 0, 0, 0.38));
}

.scroll-panel.scroll-flash-good::after,
.scroll-panel.scroll-flash-bad::after {
  content: '';
  position: absolute;
  inset: 8% 10%;
  border-radius: 18px;
  pointer-events: none;
  z-index: 2;
  animation: scroll-verdict-flash 0.85s ease;
}

.scroll-panel.scroll-flash-good::after {
  background: radial-gradient(ellipse at center, rgba(92, 255, 168, 0.42) 0%, transparent 72%);
  box-shadow: inset 0 0 40px rgba(110, 255, 180, 0.35);
}

.scroll-panel.scroll-flash-bad::after {
  background: radial-gradient(ellipse at center, rgba(255, 88, 72, 0.38) 0%, transparent 72%);
  box-shadow: inset 0 0 36px rgba(255, 72, 58, 0.32);
}

@keyframes scroll-verdict-flash {
  0% { opacity: 0; transform: scale(0.96); }
  25% { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(1.02); }
}

.scroll-bg {
  display: block;
  width: 100%;
  height: auto;
  pointer-events: none;
  user-select: none;
  /* 1px dark halo masks leftover white matte on transparent edges */
  filter:
    drop-shadow(0 0 1px rgba(8, 6, 4, 0.92))
    drop-shadow(0 10px 28px rgba(0, 0, 0, 0.38));
}

.scroll-inner {
  position: absolute;
  left: 12.5%;
  right: 12.5%;
  top: 11%;
  bottom: 12%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-x: hidden;
  overflow-y: auto;
  box-sizing: border-box;
  padding: 0 6px;
  line-height: normal;
  scrollbar-width: thin;
  scrollbar-color: rgba(103, 71, 32, 0.45) transparent;
}

.scroll-title {
  flex: 0 0 auto;
  font-size: 16px;
  color: #674720;
  font-weight: 700;
  text-align: center;
}

.scroll-text {
  flex: 1 1 auto;
  min-height: 0;
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
  font-size: clamp(15px, 1.45vw, 18px);
  line-height: 1.55;
  color: #2f2515;
  text-align: left;
  word-break: break-word;
}

.scroll-text :deep(.clue-mark) {
  background: rgba(255, 214, 108, 0.55);
  color: #2a1d08;
  padding: 0 3px;
  border-radius: 3px;
  box-shadow: 0 0 10px rgba(255, 196, 72, 0.45);
  animation: clue-pulse 1.4s ease-in-out infinite;
}

@keyframes clue-pulse {
  0%, 100% { background: rgba(255, 214, 108, 0.45); }
  50% { background: rgba(255, 232, 156, 0.72); }
}

.scroll-question-block {
  flex: 0 0 auto;
  margin-top: 4px;
  border-top: 1px dashed rgba(121, 79, 27, 0.35);
  padding-top: 8px;
}

.scroll-question-head {
  color: #694722;
  font-size: clamp(16px, 1.6vw, 20px);
  font-family: var(--font-title);
  text-align: center;
}

.scroll-question-stem {
  margin-top: 6px;
  color: #2d2113;
  font-size: clamp(15px, 1.5vw, 19px);
  line-height: 1.5;
  text-align: center;
}

.scroll-question-claim {
  margin-top: 6px;
  color: #4b2d16;
  font-size: clamp(14px, 1.35vw, 17px);
  line-height: 1.45;
  text-align: center;
}

.judge-panel {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  max-width: 920px;
  margin: 0 auto;
  width: 100%;
  padding: 0 4px;
}

.judge-panel.judge-shake {
  animation: judge-shake 0.55s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
}

@keyframes judge-shake {
  0%, 100% { transform: translateX(0); }
  15% { transform: translateX(-8px); }
  30% { transform: translateX(8px); }
  45% { transform: translateX(-6px); }
  60% { transform: translateX(6px); }
  75% { transform: translateX(-3px); }
}

.judge-btn {
  position: relative;
  border: none;
  border-radius: 0;
  width: 100%;
  padding: 0;
  background: transparent;
  cursor: pointer;
  line-height: 0;
  transition: transform 0.2s ease;
  box-shadow: none;
  outline: none;
}

.judge-btn:focus,
.judge-btn:focus-visible {
  outline: none;
  box-shadow: none;
}

.judge-btn:active {
  transform: scale(0.97);
}

.judge-bg {
  display: block;
  width: 100%;
  height: auto;
  pointer-events: none;
  user-select: none;
  transition: filter 0.25s ease;
  filter:
    drop-shadow(0 0 1px rgba(8, 6, 4, 0.9))
    drop-shadow(0 6px 16px rgba(0, 0, 0, 0.32));
}

.judge-btn.selected .judge-bg {
  filter:
    drop-shadow(0 0 1px rgba(8, 6, 4, 0.9))
    drop-shadow(0 0 16px rgba(255, 234, 170, 0.5))
    drop-shadow(0 6px 16px rgba(0, 0, 0, 0.32));
}

.judge-btn.pick-correct {
  animation: judge-correct-pop 0.65s ease;
}

.judge-btn.pick-correct .judge-bg {
  filter:
    drop-shadow(0 0 1px rgba(8, 6, 4, 0.9))
    drop-shadow(0 0 22px rgba(72, 220, 140, 0.72))
    drop-shadow(0 6px 16px rgba(0, 0, 0, 0.32));
}

.judge-btn.pick-wrong {
  animation: judge-wrong-pop 0.55s ease;
}

.judge-btn.pick-wrong .judge-bg {
  filter:
    drop-shadow(0 0 1px rgba(8, 6, 4, 0.9))
    drop-shadow(0 0 20px rgba(255, 72, 58, 0.62))
    drop-shadow(0 6px 16px rgba(0, 0, 0, 0.32));
}

.judge-btn.answer-hint .judge-bg {
  filter:
    drop-shadow(0 0 1px rgba(8, 6, 4, 0.9))
    drop-shadow(0 0 18px rgba(92, 220, 140, 0.48))
    drop-shadow(0 6px 16px rgba(0, 0, 0, 0.32));
}

.judge-label {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #f8e9c5;
  font-size: clamp(22px, 2.4vw, 32px);
  font-family: var(--font-title);
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.75);
  line-height: 1;
  pointer-events: none;
}

.judge-btn.answer-hint .judge-label {
  color: #d8ffe8;
}

.judge-verdict-icon {
  position: absolute;
  top: 8%;
  right: 10%;
  width: clamp(28px, 3vw, 38px);
  height: clamp(28px, 3vw, 38px);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: clamp(16px, 1.8vw, 22px);
  font-weight: 700;
  line-height: 1;
  pointer-events: none;
  animation: verdict-icon-pop 0.45s cubic-bezier(0.34, 1.4, 0.64, 1);
}

.pick-correct .judge-verdict-icon {
  background: rgba(28, 120, 72, 0.92);
  color: #e8fff2;
  box-shadow: 0 0 16px rgba(92, 255, 168, 0.8);
}

.pick-wrong .judge-verdict-icon {
  background: rgba(140, 28, 24, 0.92);
  color: #ffe8e6;
  box-shadow: 0 0 14px rgba(255, 96, 84, 0.75);
}

@keyframes judge-correct-pop {
  0% { transform: scale(1); }
  35% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

@keyframes judge-wrong-pop {
  0%, 100% { transform: scale(1); }
  20% { transform: scale(0.96); }
  45% { transform: scale(1.02); }
}

@keyframes verdict-icon-pop {
  0% { transform: scale(0); opacity: 0; }
  70% { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}

.choice-panel {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  max-width: 980px;
  margin: 0 auto;
  width: 100%;
  padding: 0 4px;
}

.choice-panel--triple {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.choice-panel.choice-shake {
  animation: judge-shake 0.55s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
}

.choice-btn {
  position: relative;
  border: none;
  border-radius: 0;
  width: 100%;
  min-height: 92px;
  padding: 0;
  background: transparent;
  cursor: pointer;
  line-height: 0;
  transition: transform 0.2s ease;
  box-shadow: none;
  outline: none;
}

.choice-btn:focus,
.choice-btn:focus-visible {
  outline: none;
  box-shadow: none;
}

.choice-btn:active {
  transform: scale(0.98);
}

.choice-bg {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 92px;
  object-fit: fill;
  pointer-events: none;
}

.choice-btn.selected .choice-bg {
  filter:
    drop-shadow(0 0 1px rgba(8, 6, 4, 0.9))
    drop-shadow(0 0 14px rgba(255, 214, 120, 0.45))
    drop-shadow(0 6px 16px rgba(0, 0, 0, 0.28));
}

.choice-btn.pick-correct {
  animation: judge-correct-pop 0.65s ease;
}

.choice-btn.pick-correct .choice-bg {
  filter:
    drop-shadow(0 0 1px rgba(8, 6, 4, 0.9))
    drop-shadow(0 0 22px rgba(72, 220, 140, 0.72))
    drop-shadow(0 6px 16px rgba(0, 0, 0, 0.32));
}

.choice-btn.pick-wrong .choice-bg {
  filter:
    drop-shadow(0 0 1px rgba(8, 6, 4, 0.9))
    drop-shadow(0 0 20px rgba(255, 72, 58, 0.62))
    drop-shadow(0 6px 16px rgba(0, 0, 0, 0.32));
}

.choice-btn.answer-hint .choice-bg {
  filter:
    drop-shadow(0 0 1px rgba(8, 6, 4, 0.9))
    drop-shadow(0 0 18px rgba(92, 220, 140, 0.48))
    drop-shadow(0 6px 16px rgba(0, 0, 0, 0.32));
}

.choice-key {
  position: absolute;
  left: 12%;
  top: 50%;
  transform: translateY(-50%);
  color: #f8e9c5;
  font-size: clamp(20px, 2.1vw, 28px);
  font-family: var(--font-title);
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.75);
  pointer-events: none;
}

.choice-text {
  position: absolute;
  left: 24%;
  right: 8%;
  top: 50%;
  transform: translateY(-50%);
  color: #f8e9c5;
  font-size: clamp(13px, 1.25vw, 17px);
  line-height: 1.35;
  text-align: left;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.75);
  pointer-events: none;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.choice-btn.answer-hint .choice-key,
.choice-btn.answer-hint .choice-text {
  color: #d8ffe8;
}

.choice-verdict-icon {
  position: absolute;
  top: 8%;
  right: 8%;
  color: #7dffb0;
  font-size: clamp(18px, 2vw, 24px);
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.75);
  pointer-events: none;
}

.feedback-panel {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  border-radius: 12px;
  border: 1px solid rgba(212, 168, 67, 0.25);
  padding: 10px 14px;
  color: var(--parchment-dark);
  background: rgba(255, 255, 255, 0.04);
  font-size: 14px;
  line-height: 1.45;
}

.feedback-panel.pop {
  animation: feedback-pop 0.55s cubic-bezier(0.34, 1.25, 0.64, 1);
}

.feedback-icon {
  flex: 0 0 auto;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
}

.feedback-icon.good {
  background: rgba(48, 160, 96, 0.9);
  color: #eafff3;
  box-shadow: 0 0 14px rgba(92, 255, 168, 0.65);
}

.feedback-icon.bad {
  background: rgba(180, 48, 40, 0.92);
  color: #ffecea;
  box-shadow: 0 0 12px rgba(255, 96, 84, 0.6);
}

.feedback-text {
  flex: 1 1 auto;
}

@keyframes feedback-pop {
  0% { transform: translateY(8px) scale(0.96); opacity: 0.35; }
  55% { transform: translateY(-2px) scale(1.02); opacity: 1; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}

.feedback-panel.good {
  color: #d8ffe8;
  border-color: rgba(78, 192, 122, 0.65);
  background: linear-gradient(90deg, rgba(48, 130, 82, 0.28), rgba(78, 192, 122, 0.16));
  box-shadow: 0 0 20px rgba(72, 200, 120, 0.22);
}

.feedback-panel.bad {
  color: #ffe2de;
  border-color: rgba(231, 76, 60, 0.65);
  background: linear-gradient(90deg, rgba(150, 40, 32, 0.3), rgba(231, 76, 60, 0.14));
  box-shadow: 0 0 18px rgba(255, 88, 72, 0.2);
}

.nav-panel {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 8px;
  align-items: center;
}

.nav-arrow {
  border: 1px solid rgba(212, 168, 67, 0.4);
  border-radius: 999px;
  color: #ffe5a8;
  background: rgba(9, 18, 36, 0.82);
  padding: 8px 12px;
  cursor: pointer;
}

.nav-arrow:disabled {
  opacity: 0.45;
  cursor: default;
}

.index-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.index-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid rgba(240, 214, 138, 0.45);
  background: rgba(7, 14, 29, 0.78);
  color: #f6e9c5;
  cursor: pointer;
}

.index-btn.done {
  border-color: rgba(121, 174, 245, 0.7);
  color: #cde6ff;
}

.index-btn.solved {
  border-color: rgba(140, 255, 184, 0.8);
  color: #9effbf;
}

.index-btn.active {
  box-shadow: 0 0 0 2px rgba(255, 225, 154, 0.6), 0 0 14px rgba(255, 225, 154, 0.4);
}

.reward-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.reward-item {
  border: 1px solid rgba(212, 168, 67, 0.25);
  border-radius: 10px;
  padding: 8px;
  text-align: center;
  background: rgba(8, 14, 28, 0.66);
}

.reward-item .label {
  display: block;
  color: var(--parchment-dark);
  font-size: 12px;
}

.reward-item .value {
  color: #7bf1ac;
  font-size: 24px;
  font-weight: 700;
}

.bottom-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.cult-result-bonus {
  margin-top: 8px;
  color: #ffe9a8;
  font-size: 14px;
  text-shadow: 0 0 12px rgba(255, 220, 120, 0.35);
}

@media (max-width: 900px) {
  .stage-title {
    font-size: 22px;
  }

  .scroll-panel {
    max-width: 100%;
  }

  .scroll-inner {
    left: 11%;
    right: 11%;
    top: 10%;
    bottom: 11%;
    padding: 0 4px;
  }

  .scroll-text {
    font-size: 14px;
  }

  .scroll-question-head {
    font-size: 16px;
  }

  .scroll-question-stem,
  .scroll-question-claim {
    font-size: 14px;
  }

  .judge-label {
    font-size: 20px;
  }

  .choice-panel,
  .choice-panel--triple {
    grid-template-columns: 1fr;
  }

  .choice-btn {
    min-height: 78px;
  }

  .choice-text {
    font-size: 13px;
    -webkit-line-clamp: 2;
  }

  .nav-panel {
    grid-template-columns: 1fr;
  }

  .nav-arrow {
    width: 100%;
  }

  .reward-strip {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .cangjing-page {
    padding: 6px;
  }

  .cangjing-shell {
    min-height: calc(var(--app-dvh, 100vh) - var(--hud-offset-top, var(--top-hud-height, 76px)) - 12px);
    padding: 8px;
  }

  .mechanism-stage {
    min-height: 560px;
  }
}
</style>
