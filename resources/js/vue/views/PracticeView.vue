<template>
  <div class="practice-page" :class="{ 'practice-page-arena': isArenaMode }">
    <template v-if="isArenaMode">
      <div v-if="sessionState === 'answering' && isVocabModule" class="vocab-arena">
        <img class="ws-bg" :src="wsSceneBg" alt="木桩场景" />
        <div class="ws-mask"></div>

        <div class="ws-top">
          <button class="ws-nav-btn" type="button" @click="backHall">
            <img :src="wsTopBack" alt="返回" />
          </button>
          <img class="ws-title" :src="wsTopTitlePlate" alt="练功房·木桩连击" />
          <button class="ws-nav-btn" type="button">
            <img :src="wsTopHelp" alt="说明" />
          </button>
        </div>

        <div class="ws-progress-wrap">
          <div class="ws-progress-panel"></div>
          <div class="ws-progress-level">{{ currentLevel.realm }} · 第{{ String(currentLevel.stageNo).padStart(2, '0')
            }}关</div>
          <div class="ws-progress-text">{{ currentIndex + 1 }}/{{ questions.length }}</div>
          <div class="ws-progress-track">
            <div class="ws-progress-fill" :style="{ width: `${progressPercent}%` }"></div>
          </div>
        </div>

        <div class="ws-combo-wrap" :class="{ 'is-hidden': vocabCombo < 2 }">
          <img v-if="vocabCombo >= 2" class="ws-combo-bg" :src="wsTopCombo" alt="连击" />
          <div v-if="vocabCombo >= 2" class="ws-combo-text">x{{ vocabCombo }}</div>
        </div>

        <div class="ws-stake-zone">
          <img class="ws-stake-main" :src="wsStakePlain" alt="木桩" />
          <div class="ws-word-row">
            <div ref="wsWordRef" class="ws-word" :class="getWordTextClass(currentWord)">{{ currentWord }}</div>
            <button class="ws-speaker-btn" type="button" title="播放读音" @click="playCurrentWordAudio">🔊</button>
          </div>
          <img v-if="vocabFeedbackType === 'success'" class="ws-hit-fx" :src="wsFxHit" alt="击中" />
        </div>

        <div class="ws-options">
          <button v-for="(option, idx) in woodStakeOptions" :key="option.key" class="ws-option-btn"
            :class="getArenaOptionClass(option.key)" :disabled="vocabAnswerLocked"
            @click="selectVocabOption(option.key)">
            <img class="ws-option-board" :src="resolveOptionBoard(option.key)" alt="" />
            <span class="ws-option-index">{{ idx + 1 }}</span>
            <span :ref="(el) => setOptionTextRef(option.key, el)" class="ws-option-text"
              :class="getOptionTextClass(option.text)">{{ option.text }}</span>
          </button>
        </div>
      </div>

      <div v-else-if="isGrammarModule" class="grammar-arena">
        <div class="zf-scene-frame">
          <div class="zf-scene-stage">
            <img class="zf-bg" :src="zfSceneBg" alt="阵法峰场景" />
            <div class="zf-scene-mask"></div>
          </div>
        </div>
        <div class="zf-bridge-frame">
          <div
            class="zf-bridge-wrap"
            :class="{
              'is-bridge-active': grammarBridgeVisible,
              'is-bridge-success': grammarFeedbackType === 'success',
              'is-bridge-error': grammarFeedbackType === 'error',
            }"
          >
            <img v-if="grammarBridgeVisible" class="zf-bridge" :src="grammarBridgeImage" alt="机关桥" />
          </div>
        </div>
        <div class="zf-arena-mask"></div>

        <div class="zf-ui-layer">
          <div class="zf-top">
            <button class="zf-back-btn" type="button" @click="backHall">
              <img :src="zfTopBack" alt="返回" />
            </button>
            <img class="zf-title" :src="zfTopTitlePlate" alt="阵法峰·语法机关桥" />
            <div class="zf-level-chip">{{ currentLevel.realm }} · 第{{ String(currentLevel.stageNo).padStart(2, '0') }}关
            </div>
            <div class="zf-progress-chip">
              <div class="zf-progress-text">{{ currentIndex + 1 }}/{{ questions.length }}</div>
              <div class="zf-progress-track">
                <div class="zf-progress-fill" :style="{ width: `${progressPercent}%` }"></div>
              </div>
            </div>
          </div>

          <div class="zf-question-wrap">
            <img class="zf-question-bg" :src="zfQuestionPanel" alt="" />
            <div ref="zfQuestionRef" class="zf-question-text">{{ currentQuestionText }}</div>
          </div>

          <div class="zf-options">
            <button v-for="option in grammarOptions" :key="option.key" class="zf-option-btn"
              :class="getGrammarOptionClass(option.key)" :disabled="grammarAnswerLocked"
              @click="selectGrammarOption(option.key)">
              <img class="zf-option-stone" :src="resolveGrammarStone(option.key)" alt="" />
              <span :ref="(el) => setGrammarOptionTextRef(option.key, el)" class="zf-option-text">{{ option.text }}</span>
            </button>
          </div>
        </div>
      </div>

      <div v-else-if="sessionState === 'answering' && isWritingModule" class="writing-arena">
        <img class="fz-bg" :src="fzSceneBg" alt="" aria-hidden="true" />
        <div class="fz-mask"></div>

        <div class="fz-toolbar">
          <button class="fz-back-btn" type="button" @click="backHall" title="返回大厅">
            <img :src="fzTopBack" alt="返回大厅" />
          </button>
          <div class="fz-title-block">
            <div class="fz-title">符箓台 · 炼符修炼</div>
            <div class="fz-level">{{ currentLevel.realm }} · 第{{ String(currentLevel.stageNo).padStart(2, '0') }}关</div>
          </div>
          <div class="fz-progress-chip">
            <div class="fz-progress-text">{{ currentIndex + 1 }}/{{ questions.length }}</div>
            <div class="fz-progress-track">
              <div class="fz-progress-fill" :style="{ width: `${progressPercent}%` }"></div>
            </div>
          </div>
        </div>

        <div v-if="writingCombo >= 2" class="fz-combo">连符 ×{{ writingCombo }}</div>

        <div class="fz-module-wrap">
          <WritingModule :key="String(currentWritingPrompt.prompt_id || currentIndex)" :question="currentWritingPrompt"
            :initial-content="writingInitialContent" :submitting="writingSubmitting" :show-back-button="false"
            @submit-answer="onWritingSubmit" @save-draft="onWritingSaveDraft" @back-hall="backHall" />
        </div>
      </div>

      <div v-else-if="sessionState === 'answering' && isSpeakingModule" class="speaking-arena">
        <img class="sz-bg" :src="szSceneBg" alt="" aria-hidden="true" />
        <div class="sz-mask"></div>

        <div class="sz-toolbar">
          <button class="sz-back-btn" type="button" @click="backHall" title="返回大厅">
            <img :src="szTopBack" alt="返回大厅" />
          </button>
          <div class="sz-title-block">
            <div class="sz-title">诵咒峰 · 回声崖</div>
            <div class="sz-level">{{ currentLevel.realm }} · 第{{ String(currentLevel.stageNo).padStart(2, '0') }}关</div>
          </div>
          <div class="sz-progress-chip">
            <div class="sz-progress-text">{{ currentIndex + 1 }}/{{ questions.length }}</div>
            <div class="sz-progress-track">
              <div class="sz-progress-fill" :style="{ width: `${progressPercent}%` }"></div>
            </div>
          </div>
        </div>

        <div v-if="speakingCombo >= 2" class="sz-combo">连声 ×{{ speakingCombo }}</div>

        <div class="sz-module-wrap">
          <SpeakingModule
            :key="String(currentQuestion.question_id || currentIndex)"
            :question="speakingQuestion"
            @submit-answer="onSpeakingSubmit"
          />
        </div>
      </div>
    </template>

    <div v-else class="cult-panel practice-panel">
      <header class="cult-panel-header">
        <div class="cult-panel-title">
          <span class="cult-panel-icon">⚔</span>
          <span>{{ venueTitle }}</span>
        </div>
        <button class="cult-panel-back" type="button" @click="backHall">返回大厅</button>
      </header>

      <div class="cult-panel-body">
        <template v-if="sessionState === 'rules'">
          <ModuleRulesIntro :module-key="rulesModuleKey" @confirm="sessionState = 'idle'" @back="backHall" />
        </template>

        <template v-else-if="sessionState === 'idle'">
          <div v-if="!hasQuestionBank" class="cult-notice warning">
            <span class="cult-notice-icon">☁</span>
            <div class="cult-notice-body">
              <div class="cult-notice-title">当前境界暂无题目</div>
              <div class="cult-notice-desc">
                {{ venueTitle }}在本境界（{{ levelLayout?.grade_labels?.join(' / ') || displayRealm
                }}）尚未配置题库，请先修炼其他模块或提升境界后再来。
              </div>
            </div>
          </div>
          <div v-if="resumeSession && hasQuestionBank" class="cult-notice warning">
            <span class="cult-notice-icon">⟳</span>
            <div class="cult-notice-body">
              <div class="cult-notice-title">检测到上次修炼进度</div>
              <div class="cult-notice-desc">你可以继续上次修炼，或重新开始本关。</div>
            </div>
          </div>
          <div class="level-box">
            <div class="level-title">当前境界</div>
            <div class="level-main">{{ levelLayout?.current_realm || displayRealm }}</div>
            <template v-if="hasQuestionBank">
              <div class="level-sub">第 {{ String(currentLevel.stageNo).padStart(2, '0') }} 关 · {{ currentLevel.levelId
                }}</div>
              <div class="level-sub">境界题库 {{ levelLayout?.total_questions ?? 0 }} 题，进度 {{ currentLevel.index + 1 }}/{{
                currentLevel.total }}</div>
            </template>
            <template v-else>
              <div class="level-sub">境界题库 {{ levelLayout?.total_questions ?? 0 }} 题，暂无可修炼关卡</div>
            </template>
            <div v-if="levelLayout?.grade_labels?.length" class="level-sub">
              对应年级：{{ levelLayout.grade_labels.join(' / ') }}
            </div>
          </div>
          <div class="cult-actions">
            <template v-if="hasQuestionBank && resumeSession">
              <el-button type="primary" @click="continueFromResume">继续上次进度</el-button>
              <el-button @click="restartFromResume">重新开始本关</el-button>
            </template>
            <el-button v-else-if="hasQuestionBank" type="primary" @click="startChallenge">开始修炼</el-button>
            <el-button @click="backHall">返回大厅</el-button>
          </div>
        </template>

        <template v-else-if="sessionState === 'confirm'">
          <div class="cult-notice warning">
            <span class="cult-notice-icon">⚡</span>
            <div class="cult-notice-body">
              <div class="cult-notice-title">本次将消耗灵力 {{ spiritCost }}</div>
              <div class="cult-notice-desc">当前灵力：{{ currentSpirit }}</div>
            </div>
          </div>
          <div class="cult-actions">
            <el-button type="primary" @click="confirmChallenge">确认开始</el-button>
            <el-button @click="cancelChallenge">取消</el-button>
          </div>
        </template>

        <template v-else-if="sessionState === 'answering' && isListeningModule">
          <div class="cult-tag-row">
            <span class="cult-tag info">{{ currentIndex + 1 }} / {{ questions.length }}</span>
            <span class="cult-tag warning">{{ currentLevel.levelId }}</span>
          </div>
          <ListeningModule :key="String(currentQuestion.question_id || currentIndex)" :question="listeningQuestion"
            @submit-answer="onListeningSubmit" />
        </template>

        <template v-else-if="sessionState === 'answering'">
          <div class="cult-tag-row">
            <span class="cult-tag info">{{ currentIndex + 1 }} / {{ questions.length }}</span>
            <span class="cult-tag warning">{{ currentLevel.levelId }}</span>
          </div>
          <div class="cult-question-stem">{{ currentQuestionText }}</div>
          <el-radio-group v-model="selectedAnswer" class="cult-option-group">
            <el-radio v-for="option in optionEntries" :key="option.key" :label="option.key" border
              class="cult-option-item">
              {{ option.key }}. {{ option.text }}
            </el-radio>
          </el-radio-group>
          <div class="cult-actions">
            <el-button @click="backQuestion">上一题</el-button>
            <el-button type="primary" @click="nextQuestion">{{ isLastQuestion ? '提交结算' : '下一题' }}</el-button>
          </div>
        </template>

        <template v-else-if="sessionState === 'result'">
          <div class="cult-result" :class="resultPassed ? 'success' : 'warning'">
            <div class="cult-result-icon">{{ resultPassed ? '✦' : '☁' }}</div>
            <div class="cult-result-title">{{ resultPassed ? '修炼完成' : '修炼未达标' }}</div>

            <div class="cult-result-stats">
              <div class="cult-result-stat">
                <span class="cult-result-stat-label">正确率</span>
                <span class="cult-result-stat-value">{{ resultAccuracy }}%</span>
              </div>
              <div class="cult-result-stat highlight">
                <span class="cult-result-stat-label">修为</span>
                <span class="cult-result-stat-value">+{{ resultExp }}</span>
              </div>
              <div class="cult-result-stat">
                <span class="cult-result-stat-label">灵石</span>
                <span class="cult-result-stat-value">+{{ resultStones }}</span>
              </div>
              <div v-if="resultAbilityLabel && resultCorrectCount > 0" class="cult-result-stat">
                <span class="cult-result-stat-label">{{ resultAbilityLabel }}</span>
                <span class="cult-result-stat-value">+{{ resultCorrectCount }}</span>
              </div>
            </div>

            <div v-if="resultBuffMessages.length" class="cult-result-buffs">
              <div v-for="(msg, idx) in resultBuffMessages" :key="idx" class="cult-result-buff-item">✨ {{ msg }}</div>
            </div>

            <div v-if="realmProgress" class="cult-result-realm">
              <div class="cult-result-realm-head">
                <span>境界进境</span>
                <span class="cult-result-realm-name">{{ realmProgress.current_realm || displayRealm }}</span>
              </div>
              <div class="cult-progress-track cult-result-realm-track">
                <div class="cult-progress-fill"
                  :style="{ width: `${Math.min(100, Math.max(0, Number(realmProgress.realm_progress_percent || 0)))}%` }">
                </div>
              </div>
              <p class="cult-result-realm-sub">
                突破进度 {{ Math.min(100, Math.max(0, Number(realmProgress.realm_progress_percent || 0))) }}%
                <template v-if="realmProgress.next_realm">
                  · 下一境界 {{ realmProgress.next_realm }}
                </template>
              </p>
            </div>

            <div class="cult-actions">
              <el-button type="primary" @click="retryLevel">再试一次</el-button>
              <el-button v-if="resultPassed" @click="nextLevel">下一关</el-button>
              <el-button @click="backHall">返回大厅</el-button>
            </div>
          </div>
        </template>
      </div>
    </div>

  <WritingScorePanel
    v-if="writingScorePanel.visible"
    :loading="writingScorePanel.loading"
    :score="writingScorePanel.score"
    :feedback="writingScorePanel.feedback"
    :details="writingScorePanel.details"
    :validation="writingScorePanel.validation"
    :exp-gained="writingScorePanel.expGained"
    :stones-gained="writingScorePanel.stonesGained"
    :combo-bonus="writingScorePanel.comboBonus"
    :is-last="isLastQuestion"
    @continue="onWritingScoreContinue"
  />

  <DemonTransition :visible="showDemonTransition" @update:visible="showDemonTransition = $event"
    @enter-encounter="handleEnterEncounter" />
</div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useApiClient } from '../services/api';
import { useLegacyBridge } from '../composables/useLegacyBridge';
import { useUiStore } from '../stores/ui';
import { useUserStore } from '../stores/user';
import { useDemonStore } from '../stores/demon';
import DemonTransition from '../components/demons/DemonTransition.vue';
import wsSceneBg from '../../../assets/images/ui/wood_stake/background.png';
import wsTopBack from '../../../assets/images/ui/wood_stake/back.png';
import wsTopHelp from '../../../assets/images/ui/wood_stake/introduction.png';
import wsTopTitlePlate from '../../../assets/images/ui/wood_stake/title.png';
import wsTopCombo from '../../../assets/images/ui/wood_stake/lianji.png';
import wsStakePlain from '../../../assets/images/ui/wood_stake/question.png';
import wsOptionBoard from '../../../assets/images/ui/wood_stake/choose.png';
import wsOptionBoardActive from '../../../assets/images/ui/wood_stake/correct_choose.png';
import wsFxHit from '../../../assets/images/ui/wood_stake/zhengquetexiao.png';
import zfSceneBg from '../../../assets/images/ui/zhenfafeng/background.png';
import zfTopBack from '../../../assets/images/ui/zhenfafeng/back.png';
import zfTopTitlePlate from '../../../assets/images/ui/zhenfafeng/title.png';
import zfQuestionPanel from '../../../assets/images/ui/zhenfafeng/question.png';
import zfOptionStone from '../../../assets/images/ui/zhenfafeng/choose.png';
import zfOptionStoneActive from '../../../assets/images/ui/zhenfafeng/correct_choose.png';
import zfBridgeCorrect from '../../../assets/images/ui/zhenfafeng/correct_bridge.png';
import zfBridgeError from '../../../assets/images/ui/zhenfafeng/error_bridge.png';
import fzSceneBg from '../../../assets/images/ui/writing/background.png';
import fzTopBack from '../../../assets/images/ui/zhenfafeng/back.png';
import szSceneBg from '../../../assets/images/ui/speaking/background.png';
import szTopBack from '../../../assets/images/ui/zhenfafeng/back.png';
import WritingModule from './modules/WritingModule.vue';
import ListeningModule from './modules/ListeningModule.vue';
import SpeakingModule from './modules/SpeakingModule.vue';
import WritingScorePanel from '../components/practice/WritingScorePanel.vue';
import WritingFinalResult from '../components/practice/WritingFinalResult.vue';
import ModuleRulesIntro from '../components/ModuleRulesIntro.vue';
import type { ModuleRulesKey } from '../data/moduleRules';
import {
  clearWritingDraft,
  loadWritingDraft,
  saveWritingDraft as persistWritingDraft,
  triggerWritingSceneEffect,
  type WritingValidation,
} from '../utils/writingTalisman';
import { resolveProfileRealm } from '../../utils/cultivation.js';

type PracticeType = 'vocab' | 'grammar' | 'listening' | 'speaking' | 'reading' | 'writing';

type LevelInfo = {
  realm: string;
  stageNo: number;
  levelId: string;
  index: number;
  total: number;
};

type PracticeStageMeta = {
  stage_no: number;
  stage_code: string;
  level_id: string;
  question_count: number;
};

type PracticeLevelLayout = {
  realm: string;
  realm_stage: number;
  current_realm: string;
  grade_labels: string[];
  total_questions: number;
  questions_per_stage: number;
  total_stages: number;
  stages: PracticeStageMeta[];
  progress_key: string;
};

type PracticeSession = {
  mode: PracticeType;
  sessionState: 'confirm' | 'answering';
  questions: Array<Record<string, any>>;
  currentIndex: number;
  answers: Record<string, string>;
  selectedAnswer: string;
  writingContent: string;
  spiritCost: number;
  currentSpirit: number;
  resultExp: number;
  resultStones: number;
  writingSubmittedCount: number;
  writingPassedCount: number;
  writingTotalScore: number;
  vocabCombo: number;
  writingCombo: number;
  writingMaxCombo: number;
  writingResults: Array<Record<string, unknown>>;
};

type RealmProgressSnapshot = {
  current_realm?: string;
  cultivation_energy?: number;
  next_realm_energy?: number;
  next_realm?: string;
  realm_progress_percent?: number;
  remaining_energy_to_next_realm?: number;
  abilities?: Record<string, { value: number; target: number; met: boolean }>;
};

const PRACTICE_ABILITY_LABELS: Partial<Record<PracticeType, string>> = {
  vocab: '词汇修行',
  grammar: '语法修行',
  listening: '听力修行',
  speaking: '口语修行',
  writing: '写作修行',
};

const VENUE_TITLES: Record<PracticeType, string> = {
  vocab: '练功房',
  grammar: '阵法峰',
  listening: '听风谷',
  speaking: '诵咒峰',
  reading: '藏经阁',
  writing: '符箓台',
};

const route = useRoute();
const router = useRouter();
const api = useApiClient();
const bridge = useLegacyBridge();
const ui = useUiStore();
const user = useUserStore();
const demonStore = useDemonStore();

const levelLayout = ref<PracticeLevelLayout | null>(null);
const sceneType = computed<'practice' | 'grammar'>(() => (route.path === '/grammar' ? 'grammar' : 'practice'));
const modules = [
  { type: 'vocab' as const, label: '词汇' },
  { type: 'grammar' as const, label: '语法' },
  { type: 'listening' as const, label: '听力' },
  { type: 'speaking' as const, label: '口语' },
  { type: 'writing' as const, label: '写作' },
];
const displayRealm = computed(() => resolveProfileRealm(user.profile));
const venueTitle = computed(() => {
  if (sceneType.value === 'grammar') return VENUE_TITLES.grammar;
  return VENUE_TITLES[currentType.value] || '练功房';
});

const currentType = ref<PracticeType>('vocab');
const sessionState = ref<'rules' | 'idle' | 'confirm' | 'answering' | 'result'>('rules');
const questions = ref<Array<Record<string, any>>>([]);
const currentIndex = ref(0);
const selectedAnswer = ref('');
const writingContent = ref('');
const writingSubmitting = ref(false);
const answers = reactive<Record<string, string>>({});
const spiritCost = ref(5);
const currentSpirit = ref(0);
const resultAccuracy = ref(0);
const resultExp = ref(0);
const resultStones = ref(0);
const resultCorrectCount = ref(0);
const realmProgress = ref<RealmProgressSnapshot | null>(null);
const resultPassed = ref(false);
const resultBuffMessages = ref<string[]>([]);
const writingSubmittedCount = ref(0);
const writingPassedCount = ref(0);
const writingTotalScore = ref(0);
const writingCombo = ref(0);
const writingMaxCombo = ref(0);
const speakingCombo = ref(0);
const speakingMaxCombo = ref(0);
const writingResults = ref<Array<{ score: number; passed?: boolean }>>([]);
const writingScorePanel = ref({
  visible: false,
  loading: false,
  score: 0,
  feedback: '',
  details: null as Record<string, number> | null,
  validation: null as WritingValidation | null,
  expGained: 0,
  stonesGained: 0,
  comboBonus: 0,
});
const resumeSession = ref<PracticeSession | null>(null);
const vocabAnswerLocked = ref(false);
const vocabFeedbackText = ref('');
const vocabFeedbackType = ref<'idle' | 'success' | 'error'>('idle');
const autoAdvanceTimer = ref<number | null>(null);
const vocabCombo = ref(0);
const wsWordRef = ref<HTMLElement | null>(null);
const optionTextRefs = reactive<Record<string, HTMLElement | null>>({});
const grammarAnswerLocked = ref(false);
const grammarFeedbackType = ref<'idle' | 'success' | 'error'>('idle');
const grammarAutoAdvanceTimer = ref<number | null>(null);
const grammarOptionTextRefs = reactive<Record<string, HTMLElement | null>>({});
const zfQuestionRef = ref<HTMLElement | null>(null);
const grammarBridgeVisible = computed(() => grammarFeedbackType.value !== 'idle');
const grammarBridgeImage = computed(() => {
  if (grammarFeedbackType.value === 'success') return zfBridgeCorrect;
  if (grammarFeedbackType.value === 'error') return zfBridgeError;
  return zfBridgeCorrect;
});

const showDemonTransition = ref(false);

const moduleLabel = computed(() => modules.find((m) => m.type === currentType.value)?.label || '练功');
const isVocabModule = computed(() => currentType.value === 'vocab');
const isGrammarModule = computed(() => currentType.value === 'grammar');
const isWritingModule = computed(() => currentType.value === 'writing');
const isListeningModule = computed(() => currentType.value === 'listening');
const isSpeakingModule = computed(() => currentType.value === 'speaking');
const isArenaMode = computed(
  () => sessionState.value === 'answering' && (isVocabModule.value || isGrammarModule.value || isWritingModule.value || isSpeakingModule.value)
);
const rulesModuleKey = computed<ModuleRulesKey>(() => {
  if (sceneType.value === 'grammar' || currentType.value === 'grammar') return 'grammar';
  if (currentType.value === 'listening') return 'listening';
  if (currentType.value === 'speaking') return 'speaking';
  if (currentType.value === 'writing') return 'writing';
  return 'vocab';
});
const currentLevel = computed(() => getCurrentPlayableLevel(currentType.value));
const hasQuestionBank = computed(() => (levelLayout.value?.total_questions ?? 0) > 0);
const isLastQuestion = computed(() => currentIndex.value >= questions.value.length - 1);
const currentQuestion = computed(() => questions.value[currentIndex.value] || {});
const currentWritingPrompt = computed(() => currentQuestion.value || {});
const writingInitialContent = computed(() => {
  const promptId = String(currentWritingPrompt.value?.prompt_id || '');
  if (!promptId) return '';
  const uid = user.profile?.id || 'guest';
  return answers[promptId] || loadWritingDraft(uid, promptId) || '';
});
const currentQuestionText = computed(() => {
  const q = currentQuestion.value;
  return String(q.question || q.stem || q.prompt || q.topic || '请选择正确答案');
});
const optionEntries = computed(() => {
  if (isWritingModule.value) return [];
  const options = currentQuestion.value?.options;
  if (!options || typeof options !== 'object') return [];
  return Object.entries(options).map(([key, value]) => ({ key: String(key), text: String(value ?? '') }));
});
const listeningQuestion = computed(() => {
  const q = currentQuestion.value;
  const opts = q?.options;
  let options: Array<{ key: string; text: string }> = [];
  let windSeal: Record<string, unknown> | undefined;
  if (Array.isArray(opts)) {
    options = opts.map((item: Record<string, unknown>) => ({
      key: String(item.key ?? ''),
      text: String(item.text ?? ''),
    }));
  } else if (opts && typeof opts === 'object') {
    options = Object.entries(opts)
      .filter(([key]) => key !== '__wind_seal')
      .map(([key, value]) => ({ key: String(key), text: String(value ?? '') }));
    const meta = (opts as Record<string, unknown>).__wind_seal;
    if (meta && typeof meta === 'object') {
      windSeal = meta as Record<string, unknown>;
    }
  }
  return {
    ...q,
    audioUrl: String(q.audio_url || q.audioUrl || ''),
    listening_text: String(q.listening_text || ''),
    question: String(q.question || q.stem || ''),
    word: String(q.word || ''),
    correct_answer: String(q.correct_answer || ''),
    wind_seal: windSeal,
    options: opts,
  };
});
const speakingQuestion = computed(() => {
  const q = currentQuestion.value;
  const opts = q?.options;
  const correctKey = String(q?.correct_answer || 'A').trim().toUpperCase();
  let correctText = '';
  if (opts && typeof opts === 'object' && !Array.isArray(opts)) {
    correctText = String((opts as Record<string, string>)[correctKey] || '');
  }
  const content = String(
    q.speaking_text ||
    q.listening_text ||
    correctText ||
    q.question ||
    q.stem ||
    ''
  );
  return {
    ...q,
    content,
    expectedText: correctText || content,
    correctAnswerKey: correctKey,
  };
});
const woodStakeOptions = computed(() => optionEntries.value.slice(0, 4));
const grammarOptions = computed(() => optionEntries.value.slice(0, 4));
const correctAnswerKey = computed(() => String(currentQuestion.value?.correct_answer || '').trim().toUpperCase());
const progressPercent = computed(() => {
  if (!questions.value.length) return 0;
  return Math.round(((currentIndex.value + 1) / questions.value.length) * 100);
});
const currentWord = computed(() => {
  const q = currentQuestion.value || {};
  const explicit = String(q.word || '').trim();
  if (explicit) return explicit;
  const raw = String(q.question || q.stem || '');
  const match = raw.match(/["“'「]([^"”'」]+)["”'」]/);
  if (match?.[1]) return match[1];
  return raw.replace(/的中文意思是.*/g, '').trim() || 'word';
});
const vocabRewardHint = computed(() => 5);
const grammarRewardHint = computed(() => 6);
const resultAbilityLabel = computed(() => PRACTICE_ABILITY_LABELS[currentType.value] || '');

function applySettlementFromResponse(data: Record<string, any>, options?: { accumulate?: boolean }) {
  const accumulate = Boolean(options?.accumulate);
  const expDelta = Number(data.total_exp ?? data.exp_gained ?? 0);
  const stonesDelta = Number(data.stones_gained || 0);

  if (accumulate) {
    resultExp.value += expDelta;
    resultStones.value += stonesDelta;
  } else {
    resultAccuracy.value = Number(data.accuracy || 0);
    resultExp.value = expDelta;
    resultStones.value = stonesDelta;
    resultPassed.value = Boolean(data.passed);
    resultCorrectCount.value = Number(data.correct_count ?? 0);
    resultBuffMessages.value = Array.isArray(data.buff_messages)
      ? data.buff_messages.filter((m: unknown) => typeof m === 'string' && m)
      : [];
  }

  const rp = (data.realm_progress || null) as RealmProgressSnapshot | null;
  if (rp) {
    realmProgress.value = rp;
  }

  if (expDelta || stonesDelta) {
    user.updateProfile({
      exp: Number(user.profile?.exp || 0) + expDelta,
      spirit_stone: Number(user.profile?.spirit_stone || 0) + stonesDelta,
      spirit_power: currentSpirit.value,
      ...(rp?.current_realm ? { current_realm: rp.current_realm } : {}),
      ...(rp?.cultivation_energy != null ? { cultivation_energy: rp.cultivation_energy } : {}),
    });
  }
}

const onSceneInteract = (e: Event) => {
  const customEvent = e as CustomEvent;
  if (customEvent.detail?.action === 'answer_option') {
    const clickedValue = customEvent.detail.object?.userData?.value;
    if (clickedValue) {
      selectVocabOption(clickedValue);
    }
  }
};

onMounted(async () => {
  window.addEventListener('legacy:enterHall', onLegacyEnterHall);
  window.addEventListener('resize', fitArenaTexts);
  window.addEventListener('scene:interact', onSceneInteract);
  await bootstrapModuleFromRoute();
});

onBeforeUnmount(() => {
  window.removeEventListener('legacy:enterHall', onLegacyEnterHall);
  window.removeEventListener('resize', fitArenaTexts);
  window.removeEventListener('scene:interact', onSceneInteract);
  clearAutoAdvanceTimer();
  clearGrammarAutoAdvanceTimer();
  persistPracticeSession();
  void bridge.closeLegacyPanels();
});

watch(
  () => [route.path, route.query.mode],
  async () => {
    await bootstrapModuleFromRoute();
  }
);

watch(
  () => currentQuestion.value,
  async (newQ) => {
    if (!newQ) return;

    // 心魔突袭检测
    if (sessionState.value === 'answering' && newQ._is_demon) {
      if (checkDemonTrigger()) {
        showDemonTransition.value = true;
        // 不执行常规的问题状态重置和音频播放，等待心魔战结束
        return;
      }
    }

    resetVocabRoundState();
    resetGrammarRoundState();
    if (sessionState.value === 'answering' && isVocabModule.value) {
      queueWordAudioPlay();
    }
    if (sessionState.value === 'answering' && (isVocabModule.value || isGrammarModule.value)) {
      fitArenaTexts();
    }
  },
  { immediate: true }
);

function checkDemonTrigger() {
  const lastTime = Number(localStorage.getItem('last_demon_encounter_time') || '0');
  const now = Date.now();
  // 5分钟冷却
  if (now - lastTime < 5 * 60 * 1000) return false;

  // 35% 遭遇概率
  if (Math.random() > 0.35) return false;

  localStorage.setItem('last_demon_encounter_time', String(now));
  return true;
}

async function handleEnterEncounter() {
  const q = currentQuestion.value;
  const demonPayload = {
    question: { ...q },
    demon: {
      wrong_count: q?._demon_wrong_count,
      last_wrong_at: q?._last_wrong_at,
      mastery: q?._demon_mastery,
    },
  };

  const result = await demonStore.triggerEncounter([demonPayload], {
    type: 'random',
    theme: 'red',
    title: '走火入魔',
    subtitle: '修炼途中，杂念丛生。心魔化作你最薄弱的执念，向你的识海发起了突袭。'
  });

  // 心魔战结束后，返回正常练习界面继续作答当前题
  // 不干涉当前题状态，避免污染正常正确率统计
}

watch(
  () => [currentQuestionText.value, currentWord.value, ...optionEntries.value.map((it) => `${it.key}:${it.text}`)],
  () => {
    if (sessionState.value === 'answering' && (isVocabModule.value || isGrammarModule.value)) {
      fitArenaTexts();
    }
  }
);

watch(
  () => woodStakeOptions.value,
  (newVal) => {
    if (sessionState.value === 'answering' && isVocabModule.value && newVal.length > 0) {
      if ((window as any).game?.scene?.currentSceneObj?.spawnOptions) {
        (window as any).game.scene.currentSceneObj.spawnOptions(newVal);
      }
    }
  },
  { deep: true, immediate: true }
);

function levelSequence(): Array<Omit<LevelInfo, 'index' | 'total'>> {
  const stages = levelLayout.value?.stages ?? [];
  const realm = levelLayout.value?.realm || String(user.profile?.realm || 'L1').toUpperCase();
  if (!stages.length) {
    return [];
  }
  return stages.map((stage) => ({
    realm,
    stageNo: stage.stage_no,
    levelId: stage.level_id,
  }));
}

async function fetchLevelLayout(type: PracticeType) {
  if (type === 'reading') {
    levelLayout.value = null;
    return null;
  }
  try {
    const res = await api.get(`/practice/levels/${type}`);
    if (res?.success && res.data) {
      levelLayout.value = res.data as PracticeLevelLayout;
      return levelLayout.value;
    }
  } catch {
  }
  levelLayout.value = null;
  return null;
}

function progressKey(type: PracticeType) {
  if (levelLayout.value?.progress_key) {
    return levelLayout.value.progress_key;
  }
  const uid = user.profile?.id || 'guest';
  const realm = String(user.profile?.realm || 'L1').toUpperCase();
  const realmStage = Number(user.profile?.realm_stage || 1);
  return `levelup_progress_${uid}_${type}_${realm}_${realmStage}`;
}

function sessionKey(type: PracticeType) {
  const uid = user.profile?.id || 'guest';
  const realm = String(user.profile?.realm || 'L1').toUpperCase();
  const realmStage = Number(user.profile?.realm_stage || 1);
  return `levelup_vue_practice_session_${uid}_${type}_${realm}_${realmStage}`;
}

function getCurrentPlayableLevel(type: PracticeType): LevelInfo {
  const list = levelSequence();
  if (!list.length) {
    const realm = String(levelLayout.value?.realm || user.profile?.realm || 'L1').toUpperCase();
    return {
      realm,
      stageNo: 1,
      levelId: `${realm}-01`,
      index: 0,
      total: 0,
    };
  }
  const unlocked = Number(localStorage.getItem(progressKey(type)) || '0');
  const index = Math.min(Math.max(unlocked, 0), list.length - 1);
  return {
    ...list[index],
    index,
    total: list.length,
  };
}

function unlockNextLevel(type: PracticeType, levelId: string) {
  const list = levelSequence();
  const idx = list.findIndex((it) => it.levelId === levelId);
  if (idx < 0) return;
  const unlocked = Number(localStorage.getItem(progressKey(type)) || '0');
  const next = Math.min(list.length - 1, idx + 1);
  if (next > unlocked) {
    localStorage.setItem(progressKey(type), String(next));
  }
}

function resetQuestionState() {
  questions.value = [];
  currentIndex.value = 0;
  selectedAnswer.value = '';
  writingContent.value = '';
  writingSubmitting.value = false;
  Object.keys(answers).forEach((key) => delete answers[key]);
  resultAccuracy.value = 0;
  resultExp.value = 0;
  resultStones.value = 0;
  resultCorrectCount.value = 0;
  realmProgress.value = null;
  resultPassed.value = false;
  resultBuffMessages.value = [];
  writingSubmittedCount.value = 0;
  writingPassedCount.value = 0;
  writingTotalScore.value = 0;
  writingCombo.value = 0;
  writingMaxCombo.value = 0;
  speakingCombo.value = 0;
  speakingMaxCombo.value = 0;
  writingResults.value = [];
  writingScorePanel.value.visible = false;
  writingScorePanel.value.loading = false;
  vocabCombo.value = 0;
  sessionState.value = 'idle';
  resetVocabRoundState();
  resetGrammarRoundState();
}

function resetVocabRoundState() {
  clearAutoAdvanceTimer();
  vocabAnswerLocked.value = false;
  selectedAnswer.value = '';
  vocabFeedbackText.value = '';
  vocabFeedbackType.value = 'idle';
}

function clearAutoAdvanceTimer() {
  if (autoAdvanceTimer.value !== null) {
    clearTimeout(autoAdvanceTimer.value);
    autoAdvanceTimer.value = null;
  }
}

function clearGrammarAutoAdvanceTimer() {
  if (grammarAutoAdvanceTimer.value !== null) {
    clearTimeout(grammarAutoAdvanceTimer.value);
    grammarAutoAdvanceTimer.value = null;
  }
}

function resetGrammarRoundState() {
  clearGrammarAutoAdvanceTimer();
  grammarAnswerLocked.value = false;
  grammarFeedbackType.value = 'idle';
}

function clearPracticeSession(type = currentType.value) {
  localStorage.removeItem(sessionKey(type));
}

function loadPracticeSession(type = currentType.value): PracticeSession | null {
  try {
    const raw = localStorage.getItem(sessionKey(type));
    if (!raw) return null;
    const data = JSON.parse(raw) as PracticeSession;
    if (String(data?.mode || '') !== String(type)) return null;
    if (!['confirm', 'answering'].includes(String(data?.sessionState || ''))) return null;
    if (!Array.isArray(data.questions) || data.questions.length === 0) return null;
    return data;
  } catch {
    return null;
  }
}

function persistPracticeSession() {
  if (!['confirm', 'answering'].includes(sessionState.value) || !questions.value.length) {
    clearPracticeSession();
    return;
  }
  const payload: PracticeSession = {
    mode: currentType.value,
    sessionState: sessionState.value as 'confirm' | 'answering',
    questions: questions.value.map((q) => ({ ...q })),
    currentIndex: currentIndex.value,
    answers: { ...answers },
    selectedAnswer: String(selectedAnswer.value || ''),
    writingContent: String(writingContent.value || ''),
    spiritCost: Number(spiritCost.value || 5),
    currentSpirit: Number(currentSpirit.value || 0),
    resultExp: Number(resultExp.value || 0),
    resultStones: Number(resultStones.value || 0),
    writingSubmittedCount: Number(writingSubmittedCount.value || 0),
    writingPassedCount: Number(writingPassedCount.value || 0),
    writingTotalScore: Number(writingTotalScore.value || 0),
    vocabCombo: Number(vocabCombo.value || 0),
    writingCombo: Number(writingCombo.value || 0),
    writingMaxCombo: Number(writingMaxCombo.value || 0),
    writingResults: writingResults.value.map((r) => ({ ...r })),
  };
  localStorage.setItem(sessionKey(currentType.value), JSON.stringify(payload));
}

function restorePracticeSession(session: PracticeSession) {
  questions.value = session.questions || [];
  currentIndex.value = Math.max(0, Math.min(Number(session.currentIndex || 0), Math.max(0, questions.value.length - 1)));
  Object.keys(answers).forEach((key) => delete answers[key]);
  Object.entries(session.answers || {}).forEach(([k, v]) => {
    answers[k] = String(v || '');
  });
  selectedAnswer.value = String(session.selectedAnswer || '');
  writingContent.value = String(session.writingContent || '');
  spiritCost.value = Number(session.spiritCost || 5);
  currentSpirit.value = Number(session.currentSpirit || 0);
  resultExp.value = Number(session.resultExp || 0);
  resultStones.value = Number(session.resultStones || 0);
  writingSubmittedCount.value = Number(session.writingSubmittedCount || 0);
  writingPassedCount.value = Number(session.writingPassedCount || 0);
  writingTotalScore.value = Number(session.writingTotalScore || 0);
  vocabCombo.value = Number(session.vocabCombo || 0);
  writingCombo.value = Number(session.writingCombo || 0);
  writingMaxCombo.value = Number(session.writingMaxCombo || 0);
  writingResults.value = Array.isArray(session.writingResults)
    ? session.writingResults.map((r) => ({ score: Number(r.score || 0), passed: Boolean(r.passed) }))
    : [];
  sessionState.value = session.sessionState;
  restoreAnswerForCurrentQuestion();
  if (sessionState.value === 'answering' && isVocabModule.value) {
    queueWordAudioPlay();
  }
  if (sessionState.value === 'answering' && (isVocabModule.value || isGrammarModule.value)) {
    fitArenaTexts();
  }
}

function isWritingUnlocked(): boolean {
  const realmCode = String(user.profile?.realm || 'L1').toUpperCase();
  const layer = Math.max(1, Math.min(9, Number(user.profile?.realm_stage || 1)));
  if (realmCode.startsWith('L')) {
    return layer >= 7;
  }
  return true;
}

function parseMode(raw: unknown): PracticeType {
  if (sceneType.value === 'grammar') return 'grammar';
  const str = String(raw || 'vocab').toLowerCase();
  const supported: PracticeType[] = ['vocab', 'listening', 'speaking', 'reading', 'writing'];
  return supported.includes(str as PracticeType) ? (str as PracticeType) : 'vocab';
}

function sceneLoadingText(type: PracticeType): string {
  return `切换${VENUE_TITLES[type] || '练功房'}场景...`;
}

async function bootstrapModuleFromRoute() {
  const type = parseMode(route.query.mode);

  if (type === 'writing' && !isWritingUnlocked()) {
    ElMessage.warning('符篆台将在练气七层解锁');
    backHall();
    return;
  }

  currentType.value = type;
  resetQuestionState();
  resumeSession.value = null;

  ui.showLoading(sceneType.value === 'grammar' ? sceneLoadingText('grammar') : sceneLoadingText(type));
  try {
    await fetchLevelLayout(type);
    if (sceneType.value === 'grammar') {
      await bridge.switchToGrammarScene();
    } else {
      await bridge.switchToPracticeScene(type);
    }
    await bridge.closeLegacyPanels();
    if ((levelLayout.value?.total_questions ?? 0) <= 0) {
      clearPracticeSession(type);
      resumeSession.value = null;
    } else {
      resumeSession.value = loadPracticeSession(type);
      if (resumeSession.value) {
        ElMessage.info('检测到上次修炼进度，请选择继续或重开');
      }
    }
    sessionState.value = 'rules';
  } catch {
    ElMessage.error('练功场景切换失败');
  } finally {
    ui.hideLoading();
  }
}

function onLegacyEnterHall() {
  router.replace('/hall');
}

async function switchModule(type: PracticeType) {
  if (type === 'grammar') {
    if (sceneType.value === 'grammar') return;
    await router.replace('/grammar');
    return;
  }
  if (sceneType.value === 'practice' && type === currentType.value && route.query.mode === type) return;
  await router.replace({ path: '/practice', query: { mode: type } });
}

async function startChallenge() {
  if (!hasQuestionBank.value) {
    ElMessage.warning('当前境界暂无题目，无法开始修炼');
    return;
  }
  resumeSession.value = null;
  resetVocabRoundState();
  resetGrammarRoundState();
  const level = currentLevel.value;
  ui.showLoading('加载题库...');
  try {
    const endpoint = isWritingModule.value
      ? `/writing/prompts?stage=${String(level.stageNo).padStart(2, '0')}`
      : `/${currentType.value}/questions?stage=${String(level.stageNo).padStart(2, '0')}`;
    const res = await api.get(endpoint);

    if (!res?.success) {
      ElMessage.error(res?.message || '题库加载失败');
      return;
    }

    questions.value = Array.isArray(isWritingModule.value ? res?.data?.prompts : res?.data?.questions)
      ? (isWritingModule.value ? res.data.prompts : res.data.questions)
      : [];

    if (!questions.value.length) {
      ElMessage.warning('该关卡暂无题目');
      return;
    }

    spiritCost.value = Number(res?.data?.spirit_cost || 5);
    currentSpirit.value = Number(res?.data?.current_spirit_power ?? user.profile?.spirit_power ?? 0);
    sessionState.value = 'confirm';
    persistPracticeSession();
  } finally {
    ui.hideLoading();
  }
}

async function confirmChallenge() {
  const level = currentLevel.value;
  const consumeRes = await api.post('/user/consume-spirit', {
    amount: spiritCost.value,
    reason: `${currentType.value}:${level.levelId}`,
  });

  if (Number.isFinite(Number(consumeRes?.data?.current_spirit_power))) {
    user.updateProfile({ spirit_power: Number(consumeRes.data.current_spirit_power) });
    currentSpirit.value = Number(consumeRes.data.current_spirit_power);
  }

  if (!consumeRes?.success) {
    ElMessage.error(consumeRes?.message || '灵力不足，无法开始修炼');
    return;
  }

  currentIndex.value = 0;
  selectedAnswer.value = '';
  writingContent.value = '';
  Object.keys(answers).forEach((key) => delete answers[key]);
  vocabCombo.value = 0;
  writingCombo.value = 0;
  writingMaxCombo.value = 0;
  speakingCombo.value = 0;
  speakingMaxCombo.value = 0;
  writingResults.value = [];
  resetGrammarRoundState();
  sessionState.value = 'answering';
  restoreAnswerForCurrentQuestion();
  if (isVocabModule.value) {
    queueWordAudioPlay();
  }
  if (isGrammarModule.value) {
    fitArenaTexts();
  }
  persistPracticeSession();
}

function restoreAnswerForCurrentQuestion() {
  const qid = String(currentQuestion.value?.question_id || currentQuestion.value?.prompt_id || '');
  if (!qid) return;
  if (isWritingModule.value) {
    writingContent.value = answers[qid] || '';
  } else {
    selectedAnswer.value = answers[qid] || '';
  }
}

function cancelChallenge() {
  resetQuestionState();
  clearPracticeSession();
}

function backQuestion() {
  if (currentIndex.value <= 0 || isWritingModule.value) return;
  const currentQid = String(currentQuestion.value.question_id || '');
  if (currentQid && selectedAnswer.value) {
    answers[currentQid] = selectedAnswer.value;
  }

  currentIndex.value -= 1;
  restoreAnswerForCurrentQuestion();
  if (isVocabModule.value) {
    queueWordAudioPlay();
  }
  persistPracticeSession();
}

async function nextQuestion() {
  if (isVocabModule.value) return;
  if (isGrammarModule.value) return;
  if (isWritingModule.value) return;
  if (isListeningModule.value) return;
  if (isSpeakingModule.value) return;
  const qid = String(currentQuestion.value?.question_id || '');
  if (!qid) return;
  if (!selectedAnswer.value) {
    ElMessage.warning('请先选择一个答案');
    return;
  }

  answers[qid] = selectedAnswer.value;

  if (isLastQuestion.value) {
    await submitChallenge();
    return;
  }

  currentIndex.value += 1;
  restoreAnswerForCurrentQuestion();
  persistPracticeSession();
}

async function submitChallenge() {
  const level = currentLevel.value;
  ui.showLoading('结算中...');
  try {
    const payload = {
      level: level.realm,
      stage: String(level.stageNo).padStart(2, '0'),
      answers: questions.value.map((q) => ({
        question_id: String(q.question_id),
        answer: answers[String(q.question_id)] || '',
        answer_text:
          (isVocabModule.value && (q as any)?.options && (answers[String(q.question_id)] || ''))
            ? String(((q as any).options || {})[answers[String(q.question_id)] || ''] || '')
            : undefined,
        mode: 'choice',
      })),
    };

    const res = await api.post(`/${currentType.value}/submit-batch`, payload);
    if (!res?.success) {
      ElMessage.error(res?.message || '提交失败');
      return;
    }

    const data = res?.data || {};
    applySettlementFromResponse(data);

    if (resultPassed.value) {
      unlockNextLevel(currentType.value, level.levelId);
    }

    sessionState.value = 'result';
    clearPracticeSession();
  } finally {
    ui.hideLoading();
  }
}

function onWritingSaveDraft(content: string) {
  const promptId = String(currentWritingPrompt.value?.prompt_id || '');
  if (!promptId) return;
  const uid = user.profile?.id || 'guest';
  answers[promptId] = content;
  persistWritingDraft(uid, promptId, content);
  ElMessage.success('符纸已封入袖中');
}

function applyWritingCombo(validation: WritingValidation, aiPassed: boolean) {
  if (validation.status === 'pass' && aiPassed) {
    writingCombo.value += 1;
    if (writingCombo.value > writingMaxCombo.value) {
      writingMaxCombo.value = writingCombo.value;
    }
    return writingCombo.value;
  }
  writingCombo.value = 0;
  return 0;
}

function calcComboBonus(combo: number, baseExp: number): number {
  if (combo >= 3) return 1;
  if (combo >= 2) return Math.round(baseExp * 0.1);
  return 0;
}

function estimateWritingFallbackScore(validation: WritingValidation): number {
  const ratio = validation.passedCount / Math.max(1, validation.totalCount);
  return Math.min(85, Math.max(45, Math.round(50 + ratio * 35)));
}

function openWritingScorePanel(partial: Partial<typeof writingScorePanel.value>) {
  writingScorePanel.value = {
    ...writingScorePanel.value,
    visible: true,
    ...partial,
  };
}

async function onWritingSubmit(payload: { content: string; validation: WritingValidation }) {
  const prompt = currentWritingPrompt.value;
  const promptId = String(prompt?.prompt_id || '');
  const content = String(payload.content || '').trim();
  const validation = payload.validation;
  if (!promptId || validation.status === 'fail') {
    ElMessage.warning('符文残缺，请补全要求后再炼符');
    triggerWritingSceneEffect('fail');
    return;
  }
  if (writingSubmitting.value) return;

  writingSubmitting.value = true;
  answers[promptId] = content;
  openWritingScorePanel({
    loading: true,
    score: 0,
    feedback: '',
    details: null,
    validation,
    expGained: 0,
    stonesGained: 0,
    comboBonus: 0,
  });

  try {
    const res = await api.post(
      '/writing/submit-one',
      { prompt_id: promptId, content },
      { timeoutMs: 45000 },
    );

    if (!res?.success || !res?.data) {
      const fallbackScore = estimateWritingFallbackScore(validation);
      ElMessage.warning(res?.message || '天劫未应，已按符纹完成度给出初判');
      triggerWritingSceneEffect('partial');
      openWritingScorePanel({
        loading: false,
        score: fallbackScore,
        feedback: '服务端判符暂不可用，此为本地初判分数（未计入修为与灵石）。请稍后重试或检查网络。',
        details: null,
        validation,
        expGained: 0,
        stonesGained: 0,
        comboBonus: 0,
      });
      return;
    }

    const data = res.data;
    const score = Number(data.score || 0);
    const exp = Number(data.exp_gained || 0);
    const stones = Number(data.stones_gained || 0);
    const passed = Boolean(data.passed);

    const combo = applyWritingCombo(validation, passed);
    const bonusStones = combo >= 3 ? 1 : 0;

    writingSubmittedCount.value += 1;
    writingTotalScore.value += score;
    if (passed) writingPassedCount.value += 1;
    writingResults.value.push({ score, passed });

    applySettlementFromResponse(
      {
        exp_gained: exp,
        stones_gained: stones + bonusStones,
        realm_progress: data.realm_progress,
      },
      { accumulate: true },
    );

    const uid = user.profile?.id || 'guest';
    clearWritingDraft(uid, promptId);

    const sceneEffect = score >= 90 ? 'heaven' : passed ? (validation.status === 'pass' ? 'success' : 'partial') : 'fail';
    triggerWritingSceneEffect(sceneEffect);

    openWritingScorePanel({
      loading: false,
      score,
      feedback: String(data.feedback || ''),
      details: data.details || null,
      validation,
      expGained: exp,
      stonesGained: stones + bonusStones,
      comboBonus: combo >= 2 ? combo : 0,
    });
    persistPracticeSession();
  } catch {
    const fallbackScore = estimateWritingFallbackScore(validation);
    ElMessage.error('判符请求异常，已显示本地初判');
    triggerWritingSceneEffect('fail');
    openWritingScorePanel({
      loading: false,
      score: fallbackScore,
      feedback: '判符过程出现异常，此为本地初判分数（未计入修为与灵石）。',
      details: null,
      validation,
      expGained: 0,
      stonesGained: 0,
      comboBonus: 0,
    });
  } finally {
    writingSubmitting.value = false;
  }
}

function onWritingScoreContinue() {
  if (writingScorePanel.value.loading) return;
  writingScorePanel.value.visible = false;
  writingScorePanel.value.loading = false;

  if (isLastQuestion.value) {
    const avgScore = Math.round(writingTotalScore.value / Math.max(1, writingSubmittedCount.value));
    resultAccuracy.value = avgScore;
    resultPassed.value = avgScore >= 60;
    resultCorrectCount.value = writingPassedCount.value;
    if (resultPassed.value) {
      unlockNextLevel(currentType.value, currentLevel.value.levelId);
    }
    sessionState.value = 'result';
    clearPracticeSession();
    return;
  }

  currentIndex.value += 1;
  persistPracticeSession();
}

function retryLevel() {
  clearPracticeSession();
  resetQuestionState();
  startChallenge();
}

function nextLevel() {
  clearPracticeSession();
  resetQuestionState();
  void startChallenge();
}

function continueFromResume() {
  if (!resumeSession.value) return;
  restorePracticeSession(resumeSession.value);
  resumeSession.value = null;
  ElMessage.info('已恢复上次修炼进度');
}

async function restartFromResume() {
  clearPracticeSession();
  resumeSession.value = null;
  resetQuestionState();
  await startChallenge();
}

function getArenaOptionClass(optionKey: string) {
  const key = String(optionKey || '').toUpperCase();
  if (!vocabAnswerLocked.value) {
    return { selected: selectedAnswer.value === key };
  }
  const correct = correctAnswerKey.value;
  return {
    selected: selectedAnswer.value === key,
    correct: key === correct,
    wrong: selectedAnswer.value === key && key !== correct,
  };
}

function setOptionTextRef(optionKey: string, el: Element | null) {
  const key = String(optionKey || '').toUpperCase();
  optionTextRefs[key] = el as HTMLElement | null;
}

function setGrammarOptionTextRef(optionKey: string, el: Element | null) {
  const key = String(optionKey || '').toUpperCase();
  grammarOptionTextRefs[key] = el as HTMLElement | null;
}

function getOptionTextClass(optionText: string) {
  const score = visualTextScore(optionText);
  if (score >= 16) return 'is-xlong';
  if (score >= 12) return 'is-long';
  if (score >= 8) return 'is-medium';
  return 'is-short';
}

function getWordTextClass(wordText: string) {
  const score = visualTextScore(wordText);
  if (score >= 15) return 'is-xlong';
  if (score >= 11) return 'is-long';
  if (score >= 8) return 'is-medium';
  return 'is-short';
}

function visualTextScore(text: string) {
  const chars = Array.from(String(text || '').trim());
  return chars.reduce((sum, ch) => {
    if (/[\u4e00-\u9fff]/.test(ch)) return sum + 1.8;
    if (/[A-Z]/.test(ch)) return sum + 1.1;
    if (/[a-z0-9]/.test(ch)) return sum + 1;
    return sum + 0.7;
  }, 0);
}

function fitArenaTexts() {
  void nextTick(() => {
    applyArenaTextFit();
    window.setTimeout(applyArenaTextFit, 120);
  });
}

function applyArenaTextFit() {
  if (isVocabModule.value && wsWordRef.value) {
    fitTextToBounds(wsWordRef.value, 12, 36);
  }
  if (isVocabModule.value) {
    const optionMin = window.innerWidth <= 900 ? 10 : 14;
    const optionMax = window.innerWidth <= 900 ? 20 : 28;
    woodStakeOptions.value.forEach((it) => {
      const key = String(it.key || '').toUpperCase();
      const el = optionTextRefs[key];
      if (el) {
        fitTextToBounds(el, optionMin, optionMax);
      }
    });
  }
  if (isGrammarModule.value) {
    if (zfQuestionRef.value) {
      fitGrammarQuestionText(zfQuestionRef.value);
    }
    const optionMin = window.innerWidth <= 900 ? 10 : 12;
    const optionMax = window.innerWidth <= 900 ? 30 : 44;
    grammarOptions.value.forEach((it) => {
      const key = String(it.key || '').toUpperCase();
      const el = grammarOptionTextRefs[key];
      if (el) {
        fitTextToBounds(el, optionMin, optionMax);
      }
    });
  }
}

function fitTextToBounds(el: HTMLElement, minPx: number, maxPx: number) {
  if (!el.clientWidth || !el.clientHeight) return;
  let size = Math.max(Number(maxPx || 56), Number(minPx || 10));
  const min = Number(minPx || 10);
  el.style.lineHeight = '';
  el.style.fontSize = `${size}px`;
  while (size > min && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)) {
    size -= 1;
    el.style.fontSize = `${size}px`;
  }
  // Keep text contained by tightening line-height for dense entries.
  if (el.scrollHeight > el.clientHeight + 1) {
    el.style.lineHeight = '1.05';
    while (size > min && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)) {
      size -= 1;
      el.style.fontSize = `${size}px`;
    }
  }
}

/** 语法题干：优先完整展示，过长则缩小字号并允许卷轴内滚动 */
function fitGrammarQuestionText(el: HTMLElement) {
  if (!el.clientWidth || !el.clientHeight) return;
  const min = 16;
  const max = 40;
  let size = max;
  el.style.lineHeight = '1.35';
  el.style.overflowY = 'auto';
  el.style.fontSize = `${size}px`;
  while (size > min && el.scrollWidth > el.clientWidth + 1) {
    size -= 1;
    el.style.fontSize = `${size}px`;
  }
}

function resolveOptionBoard(optionKey: string) {
  const key = String(optionKey || '').toUpperCase();
  if (!vocabAnswerLocked.value) {
    return selectedAnswer.value === key ? wsOptionBoardActive : wsOptionBoard;
  }
  const correct = correctAnswerKey.value;
  if (key === correct) return wsOptionBoardActive;
  if (selectedAnswer.value === key && key !== correct) return wsOptionBoard;
  return wsOptionBoard;
}

function getGrammarOptionClass(optionKey: string) {
  const key = String(optionKey || '').toUpperCase();
  if (!grammarAnswerLocked.value) {
    return { selected: selectedAnswer.value === key };
  }
  const correct = correctAnswerKey.value;
  return {
    selected: selectedAnswer.value === key,
    correct: key === correct,
    wrong: selectedAnswer.value === key && key !== correct,
    locked: true,
  };
}

function resolveGrammarStone(optionKey: string) {
  const key = String(optionKey || '').toUpperCase();
  if (!grammarAnswerLocked.value) {
    return selectedAnswer.value === key ? zfOptionStoneActive : zfOptionStone;
  }
  const correct = correctAnswerKey.value;
  if (key === correct) return zfOptionStoneActive;
  return zfOptionStone;
}

function selectGrammarOption(optionKey: string) {
  if (!isGrammarModule.value || sessionState.value !== 'answering' || grammarAnswerLocked.value) return;
  selectedAnswer.value = String(optionKey || '').toUpperCase();
  submitGrammarAnswer();
}

function showGrammarHint() {
  const hint = String(currentQuestion.value?.explanation || currentQuestion.value?.hint || '').trim();
  if (hint) {
    ElMessage.info(hint);
    return;
  }
  ElMessage.info('请先找主语，再判断时态和主谓一致。');
}

async function submitGrammarAnswer() {
  if (!isGrammarModule.value || sessionState.value !== 'answering' || grammarAnswerLocked.value) return;
  const qid = String(currentQuestion.value?.question_id || '');
  if (!qid) return;
  const selected = String(selectedAnswer.value || '').toUpperCase();
  const correct = correctAnswerKey.value;
  if (!selected) {
    ElMessage.warning('请先选择一个答案');
    return;
  }
  if (!correct) return;

  answers[qid] = selected;
  grammarAnswerLocked.value = true;
  grammarFeedbackType.value = selected === correct ? 'success' : 'error';
  persistPracticeSession();

  const delay = grammarFeedbackType.value === 'success' ? 2000 : 5000;
  clearGrammarAutoAdvanceTimer();
  grammarAutoAdvanceTimer.value = window.setTimeout(async () => {
    grammarAutoAdvanceTimer.value = null;
    if (isLastQuestion.value) {
      await submitChallenge();
      return;
    }
    currentIndex.value += 1;
    restoreAnswerForCurrentQuestion();
    resetGrammarRoundState();
    fitArenaTexts();
    persistPracticeSession();
  }, delay);
}

function selectVocabOption(optionKey: string) {
  if (!isVocabModule.value || sessionState.value !== 'answering' || vocabAnswerLocked.value) return;
  const qid = String(currentQuestion.value?.question_id || '');
  if (!qid) return;
  const selected = String(optionKey || '').toUpperCase();
  const correct = correctAnswerKey.value;
  if (!selected || !correct) return;

  selectedAnswer.value = selected;
  answers[qid] = selected;
  vocabAnswerLocked.value = true;

  const isCorrect = selected === correct;
  if (isCorrect) {
    vocabCombo.value += 1;
    vocabFeedbackType.value = 'success';
    vocabFeedbackText.value = `采集成功，灵气 +${vocabRewardHint.value}`;

    if ((window as any).game?.scene?.currentSceneObj?.triggerCorrectEffect) {
      (window as any).game.scene.currentSceneObj.triggerCorrectEffect();
    }
  } else {
    vocabCombo.value = 0;
    vocabFeedbackType.value = 'error';
    const correctText = optionEntries.value.find((it) => String(it.key).toUpperCase() === correct)?.text || correct;
    const explanation = String(currentQuestion.value?.explanation || '').trim();
    vocabFeedbackText.value = `回答错误，正确答案：${correctText}${explanation ? `。${explanation}` : ''}`;
  }

  persistPracticeSession();
  const delay = isCorrect ? 900 : 2200;
  clearAutoAdvanceTimer();
  autoAdvanceTimer.value = window.setTimeout(async () => {
    autoAdvanceTimer.value = null;
    if (isLastQuestion.value) {
      await submitChallenge();
      return;
    }
    currentIndex.value += 1;
    restoreAnswerForCurrentQuestion();
    resetVocabRoundState();
    queueWordAudioPlay();
    persistPracticeSession();
  }, delay);
}

function queueWordAudioPlay() {
  window.setTimeout(() => {
    playCurrentWordAudio();
  }, 120);
}

function playCurrentWordAudio() {
  const word = String(currentWord.value || '').trim();
  if (!word || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(word);
    utter.lang = 'en-US';
    utter.rate = 0.9;
    utter.pitch = 1;
    window.speechSynthesis.speak(utter);
  } catch {
    // ignore audio errors
  }
}

async function onListeningSubmit(payload: { answer: string }) {
  const qid = String(currentQuestion.value?.question_id || '');
  if (!qid) return;
  answers[qid] = payload.answer;
  if (isLastQuestion.value) {
    await submitChallenge();
    return;
  }
  currentIndex.value += 1;
  persistPracticeSession();
}

async function onSpeakingSubmit(payload?: {
  transcript?: string;
  similarity?: number;
  passed?: boolean;
  skipped?: boolean;
}) {
  const q = currentQuestion.value;
  const qid = String(q?.question_id || '');
  if (!qid) return;

  const correctKey = String(q.correct_answer || 'A').trim().toUpperCase();
  const optionKeys = ['A', 'B', 'C', 'D'];
  const wrongKey = optionKeys.find((key) => key !== correctKey) || 'B';
  const passed = Boolean(payload?.passed ?? payload?.skipped);
  const similarity = Number(payload?.similarity ?? 0);

  if (passed && !payload?.skipped) {
    speakingCombo.value += 1;
    if (speakingCombo.value > speakingMaxCombo.value) {
      speakingMaxCombo.value = speakingCombo.value;
    }
    if (similarity >= 0.9) {
      ElMessage.success('清音贯谷！');
    } else if (similarity >= 0.75) {
      ElMessage.success('正音稳落');
    }
  } else if (!payload?.skipped) {
    speakingCombo.value = 0;
  }

  answers[qid] = passed ? correctKey : wrongKey;

  if (isLastQuestion.value) {
    await submitChallenge();
    return;
  }
  currentIndex.value += 1;
  persistPracticeSession();
}

function backHall() {
  clearGrammarAutoAdvanceTimer();
  persistPracticeSession();
  void bridge.closeLegacyPanels();
  router.push('/hall');
}
</script>

<style scoped>
:deep(.practice-shell-arena .el-card__body) {
  padding: 0;
}

.writing-arena {
  position: fixed;
  top: var(--arena-below-hud, calc(var(--top-hud-height, 76px) + 10px));
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 80;
  width: 100vw;
  overflow: auto;
  scroll-padding-top: 12px;
  padding: 8px 0 24px;
  color: #e8dcc8;
  box-sizing: border-box;
}

.fz-bg {
  position: fixed;
  top: var(--arena-below-hud, calc(var(--top-hud-height, 76px) + 10px));
  left: 0;
  width: 100%;
  height: calc(100vh - var(--arena-below-hud, calc(var(--top-hud-height, 76px) + 10px)));
  object-fit: cover;
  object-position: center 70%;
  pointer-events: none;
  z-index: 0;
}

.fz-mask {
  position: fixed;
  top: var(--arena-below-hud, calc(var(--top-hud-height, 76px) + 10px));
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, rgba(10, 5, 0, 0.45), rgba(10, 5, 0, 0.72));
  pointer-events: none;
  z-index: 0;
}

.fz-toolbar,
.fz-combo,
.fz-module-wrap {
  position: relative;
  z-index: 1;
}

.fz-toolbar {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  max-width: 820px;
  margin: 0 auto 8px;
  position: sticky;
  top: 0;
  z-index: 12;
}

.fz-back-btn {
  width: 56px;
  height: 56px;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  justify-self: start;
}

.fz-back-btn img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.5));
}

.fz-title-block {
  text-align: center;
}

.fz-title {
  font-size: 18px;
  font-weight: 800;
  color: #f4d98a;
  text-shadow: 0 0 12px rgba(255, 200, 80, 0.4);
}

.fz-level {
  font-size: 12px;
  color: #c9b896;
  margin-top: 2px;
}

.fz-progress-chip {
  min-width: 100px;
}

.fz-progress-text {
  text-align: center;
  font-size: 14px;
  font-weight: 700;
  color: #f4d98a;
}

.fz-progress-track {
  margin-top: 6px;
  height: 8px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(212, 168, 67, 0.3);
  overflow: hidden;
}

.fz-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #a07820, #ffd700);
  box-shadow: 0 0 8px rgba(255, 215, 0, 0.5);
  transition: width 0.25s ease;
}

.fz-combo {
  text-align: center;
  font-size: 20px;
  font-weight: 800;
  color: #ff9e9e;
  text-shadow: 0 0 10px rgba(255, 120, 80, 0.8);
  margin-bottom: 4px;
}

.fz-module-wrap {
  max-width: 720px;
  margin: 0 auto;
  padding: 0 20px 40px;
}

.speaking-arena {
  position: fixed;
  top: var(--arena-below-hud, calc(var(--top-hud-height, 76px) + 10px));
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 80;
  width: 100vw;
  overflow: auto;
  scroll-padding-top: 12px;
  padding: 8px 0 24px;
  color: #e8dcc8;
  box-sizing: border-box;
}

.sz-bg {
  position: fixed;
  top: var(--arena-below-hud, calc(var(--top-hud-height, 76px) + 10px));
  left: 0;
  width: 100%;
  height: calc(100vh - var(--arena-below-hud, calc(var(--top-hud-height, 76px) + 10px)));
  object-fit: cover;
  object-position: center 40%;
  pointer-events: none;
  z-index: 0;
}

.sz-mask {
  position: fixed;
  top: var(--arena-below-hud, calc(var(--top-hud-height, 76px) + 10px));
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, rgba(18, 8, 32, 0.5), rgba(10, 5, 20, 0.78));
  pointer-events: none;
  z-index: 0;
}

.sz-toolbar,
.sz-combo,
.sz-module-wrap {
  position: relative;
  z-index: 1;
}

.sz-toolbar {
  display: grid;
  grid-template-columns: 88px 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  max-width: 820px;
  margin: 0 auto 8px;
  position: sticky;
  top: 0;
  z-index: 12;
}

.sz-back-btn {
  width: 80px;
  height: 80px;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  justify-self: start;
}

.sz-back-btn img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.55));
  transition: transform 0.15s ease;
}

.sz-back-btn:hover img {
  transform: scale(1.06);
}

.sz-back-btn:active img {
  transform: scale(0.96);
}

.sz-title-block { text-align: center; }

.sz-title {
  font-size: 18px;
  font-weight: 800;
  color: #e8d4ff;
  text-shadow: 0 0 12px rgba(180, 120, 255, 0.45);
}

.sz-level {
  font-size: 12px;
  color: #b8a0d0;
  margin-top: 2px;
}

.sz-progress-chip { min-width: 100px; }

.sz-progress-text {
  text-align: center;
  font-size: 14px;
  font-weight: 700;
  color: #e8d4ff;
}

.sz-progress-track {
  margin-top: 6px;
  height: 8px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(180, 120, 255, 0.35);
  overflow: hidden;
}

.sz-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #7c4dff, #c9a0ff);
  box-shadow: 0 0 8px rgba(180, 120, 255, 0.5);
  transition: width 0.25s ease;
}

.sz-combo {
  text-align: center;
  font-size: 20px;
  font-weight: 800;
  color: #c9a0ff;
  text-shadow: 0 0 10px rgba(180, 120, 255, 0.7);
  margin-bottom: 4px;
}

.sz-module-wrap {
  max-width: 820px;
  margin: 0 auto;
  padding: 0 12px 40px;
}

.vocab-arena {
  position: fixed;
  inset: 0;
  z-index: 80;
  width: 100vw;
  min-height: 100vh;
  overflow: hidden;
  border-radius: 0;
}

.ws-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.ws-mask {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(8, 14, 28, 0.25), rgba(8, 14, 28, 0.45));
}

.ws-top,
.ws-progress-wrap,
.ws-combo-wrap,
.ws-stake-zone,
.ws-options {
  position: relative;
  z-index: 1;
}

.ws-top {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 12px 16px 0;
}

.ws-title {
  width: min(72vw, 620px);
}

.ws-nav-btn {
  width: 62px;
  height: 62px;
  border: 0;
  background: transparent;
  cursor: pointer;
  justify-self: start;
  padding: 0;
}

.ws-nav-btn:last-child {
  justify-self: end;
}

.ws-nav-btn img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.ws-progress-wrap {
  position: relative;
  margin: 2px auto 0;
  width: min(95%, 980px);
  height: 112px;
}

.ws-progress-panel {
  position: absolute;
  inset: 0;
  border: 1px solid rgba(229, 190, 115, 0.55);
  border-radius: 26px;
  background: linear-gradient(180deg, rgba(10, 18, 36, 0.76), rgba(10, 18, 36, 0.6));
  box-shadow: inset 0 0 20px rgba(255, 205, 120, 0.08);
}

.ws-progress-level {
  position: absolute;
  left: 26px;
  top: 20px;
  color: #f3d481;
  font-size: 20px;
  font-weight: 700;
}

.ws-progress-text {
  position: absolute;
  left: 50%;
  top: 20px;
  transform: translateX(-50%);
  color: #edf1ff;
  font-size: 20px;
  font-weight: 800;
}

.ws-progress-track {
  position: absolute;
  left: 26px;
  right: 26px;
  bottom: 20px;
  height: 14px;
  border-radius: 999px;
  border: 1px solid rgba(123, 176, 244, 0.38);
  background: rgba(8, 16, 34, 0.9);
  overflow: hidden;
}

.ws-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #2798f5, #5fd3f8);
  box-shadow: 0 0 12px rgba(108, 196, 255, 0.7);
  transition: width 0.25s ease;
}

.ws-combo-wrap {
  width: min(95%, 980px);
  margin: 6px auto 0;
  height: 72px;
  position: relative;
}

.ws-combo-bg {
  width: 170px;
  height: auto;
  margin-left: 10px;
}

.ws-combo-text {
  position: absolute;
  left: 98px;
  top: 24px;
  color: #ffe5b1;
  font-size: 29px;
  font-weight: 800;
  text-shadow: 0 0 10px rgba(255, 160, 70, 0.9);
}

.ws-combo-wrap.is-hidden {
  opacity: 0;
  pointer-events: none;
}

.ws-stake-zone {
  width: min(92%, 920px);
  margin: 76px auto 0;
  height: 560px;
}

.ws-stake-main {
  position: absolute;
  left: 50%;
  bottom: 10px;
  transform: translateX(-50%);
  width: 640px;
}

.ws-word-row {
  position: absolute;
  left: 50%;
  bottom: 414px;
  transform: translateX(-50%);
  width: min(64vw, 230px);
  height: 88px;
}

.ws-word {
  width: 100%;
  max-width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: clamp(17px, 2vw, 24px);
  line-height: 1.06;
  font-weight: 700;
  color: #fff1cf;
  text-shadow: 0 4px 0 rgba(0, 0, 0, 0.32);
  overflow-wrap: anywhere;
  white-space: normal;
  word-break: break-word;
  overflow: hidden;
  box-sizing: border-box;
}

.ws-word.is-medium {
  font-size: clamp(14px, 1.8vw, 21px);
}

.ws-word.is-long {
  font-size: clamp(12px, 1.6vw, 17px);
}

.ws-word.is-xlong {
  font-size: clamp(11px, 1.3vw, 15px);
  line-height: 1.08;
}

.ws-speaker-btn {
  position: absolute;
  top: 50%;
  right: -52px;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid rgba(248, 221, 171, 0.9);
  background: rgba(10, 24, 54, 0.88);
  color: #ffe4b3;
  font-size: 20px;
  cursor: pointer;
}

.ws-hit-fx {
  position: absolute;
  right: 162px;
  bottom: 128px;
  width: 132px;
}

.ws-options {
  width: min(96%, 1140px);
  margin: -72px auto 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: clamp(12px, 1.5vw, 20px);
}

.ws-option-btn {
  position: relative;
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
  display: flex;
  justify-content: center;
}

.ws-option-btn:disabled {
  cursor: not-allowed;
}

.ws-option-board {
  width: min(100%, 460px);
  display: block;
  margin: 0 auto;
}

.ws-option-btn.wrong .ws-option-board {
  filter: hue-rotate(325deg) saturate(1.65) brightness(0.88) contrast(1.06);
}

.ws-option-index {
  position: absolute;
  top: 19.2%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff8d9;
  font-size: clamp(18px, 1.2vw, 24px);
  font-weight: 800;
  line-height: 1;
  text-shadow: 0 1px 2px rgba(39, 19, 2, 0.9);
  pointer-events: none;
}

.ws-option-text {
  position: absolute;
  left: 50%;
  top: 37.6%;
  transform: translate(-50%, -50%);
  width: 62%;
  height: 42%;
  padding: 0 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #3a230f;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0;
  writing-mode: horizontal-tb;
  text-orientation: mixed;
  white-space: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
  overflow: hidden;
  pointer-events: none;
  box-sizing: border-box;
}

.ws-option-text.is-medium {
  font-size: 19px;
}

.ws-option-text.is-long {
  width: 64%;
  font-size: 15px;
  line-height: 1.14;
}

.ws-option-text.is-xlong {
  width: 66%;
  font-size: 13px;
  line-height: 1.12;
}

.grammar-arena {
  position: fixed;
  inset: 0;
  z-index: 80;
  width: 100vw;
  min-height: 100vh;
  overflow: hidden;
  border-radius: 0;
  color: #e9f4ff;
  background: #010816;
  /* background.png 941×1672，桥段锚点 y=860 x≈50.5% */
  --zf-bg-w: 941;
  --zf-bg-h: 1672;
  --zf-bridge-x: 50.5%;
  --zf-bridge-y: 51.45%;
  --zf-bridge-w: 58%;
  --zf-bridge-tilt-x: 24deg;
  --zf-bridge-scale-y: 0.68;
}

.zf-scene-frame {
  position: absolute;
  inset: 0;
  overflow: hidden;
  z-index: 0;
}

/* 与 object-fit: cover 等价：铺满视口，桥段仍按原图百分比锚定 */
.zf-scene-stage {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  aspect-ratio: var(--zf-bg-w) / var(--zf-bg-h);
  width: max(100vw, calc(100vh * var(--zf-bg-w) / var(--zf-bg-h)));
  height: max(100vh, calc(100vw * var(--zf-bg-h) / var(--zf-bg-w)));
}

.zf-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
}

.zf-scene-mask {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(1, 8, 22, 0.12), rgba(1, 8, 22, 0.28));
  pointer-events: none;
}

.zf-bridge-frame {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  aspect-ratio: var(--zf-bg-w) / var(--zf-bg-h);
  width: max(100vw, calc(100vh * var(--zf-bg-w) / var(--zf-bg-h)));
  height: max(100vh, calc(100vw * var(--zf-bg-h) / var(--zf-bg-w)));
  z-index: 2;
  pointer-events: none;
}

.zf-arena-mask {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(1, 8, 22, 0.22) 0%, rgba(1, 8, 22, 0.04) 38%, rgba(1, 8, 22, 0.32) 100%);
}

.zf-ui-layer {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
}

.zf-ui-layer .zf-top,
.zf-ui-layer .zf-question-wrap,
.zf-ui-layer .zf-options,
.zf-ui-layer .zf-back-btn {
  pointer-events: auto;
}

.zf-top,
.zf-subtitle,
.zf-reward,
.zf-question-wrap,
.zf-options,
.zf-actions {
  position: relative;
  z-index: 1;
}

.zf-top {
  width: min(94%, 1280px);
  margin: 12px auto 0;
  min-height: 120px;
}

.zf-back-btn {
  position: fixed;
  left: 24px;
  top: 24px;
  z-index: 100;
  width: 94px;
  height: 94px;
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
}

.zf-back-btn img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.zf-title {
  display: block;
  width: min(72vw, 760px);
  margin: 0 auto;
}

.zf-level-chip {
  position: absolute;
  right: 0;
  top: 14px;
  padding: 10px 20px;
  border-radius: 18px;
  border: 1px solid rgba(98, 214, 244, 0.62);
  background: transparent;
  color: #a8f5ff;
  font-size: 27px;
  font-weight: 700;
}

.zf-progress-chip {
  position: absolute;
  right: 0;
  top: 72px;
  width: min(230px, 26vw);
}

.zf-progress-text {
  text-align: center;
  font-size: 38px;
  line-height: 1;
  font-weight: 800;
  color: #f7fcff;
}

.zf-progress-track {
  margin-top: 8px;
  width: 100%;
  height: 14px;
  border-radius: 999px;
  border: 1px solid rgba(141, 236, 253, 0.56);
  background: rgba(0, 18, 45, 0.86);
  overflow: hidden;
}

.zf-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #7ff5ff, #47d0ff);
  box-shadow: 0 0 12px rgba(130, 237, 255, 0.85);
  transition: width 0.25s ease;
}

.zf-subtitle {
  width: min(88%, 980px);
  margin: 10px auto 0;
  text-align: center;
  font-size: clamp(20px, 2vw, 40px);
  letter-spacing: 1px;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.45);
}

.zf-reward {
  width: fit-content;
  margin: 12px auto 0;
  padding: 10px 28px;
  border-radius: 999px;
  border: 1px solid rgba(255, 214, 136, 0.8);
  background: transparent;
  color: #8af899;
  font-size: clamp(24px, 2vw, 42px);
  font-weight: 800;
  box-shadow: 0 0 20px rgba(255, 190, 86, 0.28);
}

.zf-question-wrap {
  position: relative;
  width: min(90%, 980px);
  margin: 20px auto 0;
  aspect-ratio: 1300 / 385;
}

.zf-question-bg {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.zf-question-text {
  position: absolute;
  left: 50%;
  top: 51%;
  transform: translate(-50%, -50%);
  width: 72%;
  max-height: 58%;
  min-height: 36%;
  display: block;
  text-align: center;
  color: #1b1b1b;
  font-size: clamp(18px, 2.4vw, 42px);
  line-height: 1.35;
  font-weight: 700;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 6px 8px;
  scrollbar-width: thin;
}

.zf-bridge-wrap {
  position: absolute;
  left: var(--zf-bridge-x);
  top: var(--zf-bridge-y);
  width: var(--zf-bridge-w);
  margin: 0;
  transform: translate(-50%, -50%) perspective(760px) rotateX(var(--zf-bridge-tilt-x)) scaleY(var(--zf-bridge-scale-y)) scale(0.76);
  transform-origin: center center;
  opacity: 0;
  pointer-events: none;
  z-index: 2;
  transition: opacity 0.28s ease, transform 0.38s cubic-bezier(0.22, 0.85, 0.3, 1);
}

.zf-bridge-wrap.is-bridge-active {
  opacity: 1;
  transform: translate(-50%, -50%) perspective(760px) rotateX(var(--zf-bridge-tilt-x)) scaleY(var(--zf-bridge-scale-y)) scale(1);
}

.zf-bridge {
  width: 100%;
  height: auto;
  object-fit: contain;
  display: block;
}

.zf-bridge-wrap.is-bridge-error .zf-bridge {
  opacity: 0.82;
  filter: saturate(0.72) brightness(0.9) contrast(1.02);
}

.zf-bridge-wrap.is-bridge-success .zf-bridge {
  opacity: 0.9;
  filter: saturate(0.95) brightness(1.02);
}

.zf-options {
  position: absolute;
  left: 50%;
  bottom: max(18px, env(safe-area-inset-bottom));
  transform: translateX(-50%);
  z-index: 3;
  width: min(98%, 1280px);
  margin: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: clamp(6px, 1vw, 16px);
}

.zf-option-btn {
  position: relative;
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
  transition: transform 0.16s ease;
}

.zf-option-btn:hover {
  transform: translateY(-4px);
}

.zf-option-btn:disabled {
  cursor: default;
}

.zf-option-stone {
  width: 100%;
  display: block;
  object-fit: contain;
  transform: scale(1.24);
  transform-origin: center;
}

.zf-option-btn.wrong .zf-option-stone {
  filter: hue-rotate(320deg) saturate(1.55) brightness(0.84);
}

.zf-option-text {
  position: absolute;
  left: 50%;
  top: 25%;
  transform: translate(-50%, -50%);
  width: 58%;
  height: 22%;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #121212;
  font-size: 34px;
  line-height: 1.05;
  font-weight: 700;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
  overflow: hidden;
  pointer-events: none;
}



@media (max-width: 900px) {
  .vocab-arena {
    min-height: 100vh;
  }

  .ws-top {
    padding: 10px 8px 0;
  }

  .ws-nav-btn {
    width: 56px;
    height: 56px;
  }

  .ws-title {
    width: min(78vw, 410px);
  }

  .ws-progress-wrap {
    margin-top: 2px;
    width: 97%;
    height: 86px;
  }

  .ws-progress-level {
    left: 14px;
    top: 12px;
    font-size: 14px;
  }

  .ws-progress-text {
    top: 12px;
    font-size: 15px;
  }

  .ws-progress-track {
    left: 14px;
    right: 14px;
    bottom: 12px;
    height: 10px;
  }

  .ws-combo-wrap {
    height: 44px;
    margin-top: 6px;
  }

  .ws-combo-bg {
    width: 108px;
    margin-left: 4px;
  }

  .ws-combo-text {
    left: 64px;
    top: 12px;
    font-size: 18px;
  }

  .ws-stake-zone {
    margin-top: 58px;
    height: 420px;
  }

  .ws-stake-main {
    bottom: 6px;
    width: 440px;
  }

  .ws-word-row {
    bottom: 280px;
    width: min(72vw, 170px);
    height: 62px;
  }

  .ws-word {
    font-size: clamp(13px, 2.8vw, 17px);
  }

  .ws-word.is-medium {
    font-size: clamp(11px, 2.4vw, 14px);
  }

  .ws-word.is-long {
    font-size: clamp(9px, 2.1vw, 12px);
  }

  .ws-word.is-xlong {
    font-size: clamp(8px, 1.8vw, 10px);
  }

  .ws-speaker-btn {
    right: -38px;
    width: 26px;
    height: 26px;
    font-size: 13px;
  }

  .ws-hit-fx {
    right: 14px;
    bottom: 96px;
    width: 88px;
  }

  .ws-options {
    margin-top: -52px;
    gap: 8px;
  }

  .ws-option-index {
    top: 19.4%;
    font-size: 15px;
  }

  .ws-option-text {
    top: 37.6%;
    width: 63%;
    height: 42%;
    font-size: 15px;
    letter-spacing: 0;
  }

  .ws-option-text.is-medium {
    font-size: 13px;
  }

  .ws-option-text.is-long {
    width: 65%;
    font-size: 11px;
  }

  .ws-option-text.is-xlong {
    width: 66%;
    font-size: 10px;
  }

  .zf-top {
    width: 96%;
    margin-top: 8px;
    min-height: 84px;
  }

  .zf-back-btn {
    width: 62px;
    height: 62px;
    left: 12px;
    top: 12px;
  }

  .zf-title {
    width: min(74vw, 430px);
  }

  .zf-level-chip {
    right: 0;
    top: 8px;
    padding: 6px 12px;
    font-size: 14px;
  }

  .zf-progress-chip {
    top: 40px;
    width: min(132px, 34vw);
  }

  .zf-progress-text {
    font-size: 21px;
  }

  .zf-progress-track {
    margin-top: 5px;
    height: 8px;
  }

  .zf-subtitle {
    margin-top: 8px;
    font-size: clamp(13px, 2.8vw, 18px);
  }

  .zf-reward {
    margin-top: 8px;
    padding: 6px 16px;
    font-size: clamp(14px, 3vw, 20px);
  }

  .zf-question-wrap {
    width: 95%;
    margin-top: 12px;
  }

  .zf-question-text {
    width: 74%;
    height: 46%;
    font-size: 26px;
  }

  .zf-scene-stage {
    --zf-bridge-y: 51.8%;
    --zf-bridge-w: 62%;
    --zf-bridge-tilt-x: 20deg;
    --zf-bridge-scale-y: 0.72;
  }

  .zf-options {
    width: 99%;
    bottom: max(10px, env(safe-area-inset-bottom));
    margin: 0;
    gap: 4px;
  }

  .zf-option-text {
    width: 62%;
    top: 26%;
    height: 24%;
    font-size: 18px;
  }



}
</style>
