<template>
  <div class="arcade-panel">
    <div class="arcade-toolbar">
      <div class="arcade-head">
        <img v-if="modeDef" class="arcade-icon" :src="modeDef.iconPath" :alt="modeDef.title">
        <div>
          <div class="arcade-title">试炼 · {{ modeDef?.title || '悟道试炼' }}</div>
          <div class="arcade-sub">{{ modeDef?.durationSec || 90 }} 秒限时 · 连击越高奖励越高</div>
        </div>
      </div>
      <button type="button" class="arcade-back-btn" @click="handleBack">返回大厅</button>
    </div>

    <template v-if="phase === 'intro'">
      <ul v-if="modeDef" class="arcade-rules">
        <li v-for="(line, idx) in modeDef.coreLoop" :key="idx">{{ line }}</li>
      </ul>
      <div v-if="!playable" class="arcade-soon">
        该模块试炼玩法接入中，可先体验「常规」模式；词汇「符文追猎」、语法「句式铸炉」、听力「回声识音」、阅读「残卷推理」已开放。
      </div>
      <div class="cult-actions">
        <el-button
          v-if="playable"
          type="primary"
          data-btn-skin="challenge"
          :loading="loading"
          @click="startGame"
        >
          开始试炼
        </el-button>
        <el-button v-else data-btn-skin="continue" @click="emit('switch-classic')">返回常规修炼</el-button>
      </div>
    </template>

    <VocabRuneHunt
      v-else-if="phase === 'playing' && ability === 'vocab' && modeDef && vocabRounds.length"
      :mode="modeDef"
      :rounds="vocabRounds"
      @finished="onFinished"
    />

    <GrammarSentenceForge
      v-else-if="phase === 'playing' && ability === 'grammar' && modeDef && grammarRounds.length"
      :mode="modeDef"
      :rounds="grammarRounds"
      @finished="onFinished"
    />

    <ListeningEchoTrial
      v-else-if="phase === 'playing' && ability === 'listening' && modeDef && listeningRounds.length"
      :mode="modeDef"
      :rounds="listeningRounds"
      @finished="onFinished"
    />

    <ReadingDetective
      v-else-if="phase === 'playing' && ability === 'reading' && modeDef && readingRounds.length"
      :mode="modeDef"
      :rounds="readingRounds"
      @finished="onFinished"
    />

    <template v-else-if="phase === 'result' && result">
      <div class="cult-result" :class="resultTone">
        <img class="cult-result-badge" :src="rankBadgeSrc" :alt="`评级 ${result.rank.toUpperCase()}`">
        <div class="cult-result-title">试炼落幕</div>
        <div class="cult-result-sub">评级 · {{ result.rank.toUpperCase() }}</div>

        <div class="cult-result-stats">
          <div class="cult-result-stat highlight">
            <span class="cult-result-stat-label">灵力得分</span>
            <span class="cult-result-stat-value">{{ result.score }}</span>
          </div>
          <div class="cult-result-stat">
            <span class="cult-result-stat-label">{{ resultCorrectLabel }}</span>
            <span class="cult-result-stat-value">{{ result.correct }}/{{ result.total }}</span>
          </div>
          <div class="cult-result-stat">
            <span class="cult-result-stat-label">修为</span>
            <span class="cult-result-stat-value">+{{ result.exp }}</span>
          </div>
          <div class="cult-result-stat">
            <span class="cult-result-stat-label">灵石 · 令牌</span>
            <span class="cult-result-stat-value">+{{ result.stones }} · +{{ result.tokens }}</span>
          </div>
        </div>

        <div class="cult-actions">
          <el-button type="primary" data-btn-skin="restart" @click="startGame">再来一局</el-button>
          <el-button data-btn-skin="continue" @click="emit('switch-classic')">去常规修炼</el-button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { useApiClient } from '../../services/api';
import { useUserStore } from '../../stores/user';
import {
  calcArcadeRewards,
  getArcadeModeByAbility,
  isArcadePlayable,
  sanitizeArcadeWord,
  type ArcadeAbility,
} from '../../data/arcadeModes';
import { mapGrammarArcadeRounds, type GrammarForgeRound } from '../../data/grammarArcade';
import { mapListeningArcadeRounds, type ListeningEchoRound } from '../../data/listeningArcade';
import { mapReadingArcadeRounds, type ReadingDetectiveRound } from '../../data/readingArcade';
import { getArcadeRankBadge } from '../../data/arcadeAssets';
import GrammarSentenceForge from './GrammarSentenceForge.vue';
import ListeningEchoTrial from './ListeningEchoTrial.vue';
import ReadingDetective from './ReadingDetective.vue';
import VocabRuneHunt from './VocabRuneHunt.vue';

const props = defineProps<{
  ability: ArcadeAbility;
  stageNo?: number;
  realm?: string;
}>();

const emit = defineEmits<{
  (e: 'back'): void;
  (e: 'switch-classic'): void;
  (e: 'settled', payload: { exp: number; stones: number }): void;
}>();

const api = useApiClient();
const user = useUserStore();

const phase = ref<'intro' | 'playing' | 'result'>('intro');
const loading = ref(false);
const vocabRounds = ref<Array<{ word: string; hint: string; questionId: string }>>([]);
const grammarRounds = ref<GrammarForgeRound[]>([]);
const listeningRounds = ref<ListeningEchoRound[]>([]);
const readingRounds = ref<ReadingDetectiveRound[]>([]);
const result = ref<{
  score: number;
  correct: number;
  total: number;
  rank: string;
  exp: number;
  stones: number;
  tokens: number;
} | null>(null);

const modeDef = computed(() => getArcadeModeByAbility(props.ability));
const playable = computed(() => isArcadePlayable(props.ability));

const rankBadgeSrc = computed(() => getArcadeRankBadge(result.value?.rank || 'c'));

const resultCorrectLabel = computed(() => {
  if (props.ability === 'grammar') return '铸对';
  if (props.ability === 'listening') return '辨音命中';
  if (props.ability === 'reading') return '推理命中';
  return '封印成功';
});

const resultTone = computed(() => {
  const rank = result.value?.rank || 'c';
  return rank === 's' || rank === 'a' ? 'success' : 'warning';
});

function handleBack() {
  emit('back');
}

async function loadVocabRounds(stage: string) {
  const res = await api.get(`/vocab/questions?stage=${stage}`);
  const list = Array.isArray(res?.data?.questions) ? res.data.questions : [];
  return list
    .map((q: any) => {
      const word = sanitizeArcadeWord(String(q.word || q.lemma || ''));
      const hint = String(q.explanation || q.question || '')
        .replace(/^"[^"]*"\s*/, '')
        .replace(/^"|"$/g, '')
        .split('；')[0]
        .split(';')[0]
        .trim();
      return {
        word,
        hint,
        questionId: String(q.question_id || '').trim(),
      };
    })
    .filter((r) => r.word.length >= 3 && r.word.length <= 12 && r.hint && /^[a-z]+$/.test(r.word) && r.questionId)
    .slice(0, 12);
}

async function loadGrammarRounds(stage: string) {
  const res = await api.get(`/grammar/questions?stage=${stage}`);
  const list = Array.isArray(res?.data?.questions) ? res.data.questions : [];
  return mapGrammarArcadeRounds(list);
}

async function loadListeningRounds(stage: string) {
  const res = await api.get(`/listening/questions?stage=${stage}`);
  const list = Array.isArray(res?.data?.questions) ? res.data.questions : [];
  return mapListeningArcadeRounds(list);
}

async function loadReadingRounds(realm: string, stage: string) {
  const res = await api.get(`/reading/questions?level=${realm}&stage=${stage}`);
  if (!res?.success || !res?.data) return [];
  const list = Array.isArray(res.data.questions) ? res.data.questions : [];
  const passage = res.data.passage || {};
  return mapReadingArcadeRounds(list, {
    title: String(passage.title || '残卷密文'),
    content: String(passage.content || ''),
  });
}

async function startGame() {
  if (!playable.value || !modeDef.value) return;
  loading.value = true;
  try {
    const stage = String(props.stageNo || 1).padStart(2, '0');
    if (props.ability === 'vocab') {
      const mapped = await loadVocabRounds(stage);
      if (!mapped.length) {
        ElMessage.warning('当前关卡暂无可用词汇，请切换常规模式或提升境界');
        return;
      }
      vocabRounds.value = mapped;
      grammarRounds.value = [];
      listeningRounds.value = [];
      readingRounds.value = [];
    } else if (props.ability === 'grammar') {
      const mapped = await loadGrammarRounds(stage);
      if (!mapped.length) {
        ElMessage.warning('当前关卡暂无适合试炼的语法填空题，请切换常规模式或提升境界');
        return;
      }
      grammarRounds.value = mapped;
      vocabRounds.value = [];
      listeningRounds.value = [];
      readingRounds.value = [];
    } else if (props.ability === 'listening') {
      const mapped = await loadListeningRounds(stage);
      if (!mapped.length) {
        ElMessage.warning('当前关卡暂无适合试炼的听力题，请切换常规模式或提升境界');
        return;
      }
      listeningRounds.value = mapped;
      vocabRounds.value = [];
      grammarRounds.value = [];
      readingRounds.value = [];
    } else if (props.ability === 'reading') {
      const realm = String(props.realm || 'L1').toUpperCase();
      const mapped = await loadReadingRounds(realm, stage);
      if (!mapped.length) {
        ElMessage.warning('当前关卡暂无适合试炼的阅读题，请切换常规模式或提升境界');
        return;
      }
      readingRounds.value = mapped;
      vocabRounds.value = [];
      grammarRounds.value = [];
      listeningRounds.value = [];
    } else {
      return;
    }
    result.value = null;
    phase.value = 'playing';
  } catch {
    ElMessage.error('试炼题库加载失败');
  } finally {
    loading.value = false;
  }
}

async function reportWrongQuestions(questionIds: string[]) {
  const ids = [...new Set(questionIds.map((id) => String(id || '').trim()).filter(Boolean))];
  if (!ids.length) return;
  try {
    await api.post('/demons/report-wrongs', {
      question_ids: ids,
      type: props.ability,
    });
  } catch {
    // 心魔写入失败不阻断试炼结算
  }
}

async function onFinished(payload: {
  score: number;
  correct: number;
  total: number;
  wrongQuestionIds?: string[];
}) {
  const mode = modeDef.value;
  if (!mode) return;
  await reportWrongQuestions(payload.wrongQuestionIds || []);
  const streakDays = Number((user.profile as any)?.streak_days || 0);
  const rewards = calcArcadeRewards({ mode, score: payload.score, streakDays });
  result.value = {
    ...payload,
    rank: rewards.rank,
    exp: rewards.exp,
    stones: rewards.stones,
    tokens: rewards.tokens,
  };
  user.updateProfile({
    exp: Number(user.profile?.exp || 0) + rewards.exp,
    spirit_stone: Number(user.profile?.spirit_stone || 0) + rewards.stones,
  });
  emit('settled', { exp: rewards.exp, stones: rewards.stones });
  phase.value = 'result';
}
</script>

<style scoped>
.arcade-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.arcade-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.arcade-back-btn {
  flex-shrink: 0;
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

.arcade-back-btn:hover {
  border-color: rgba(212, 168, 67, 0.7);
  color: #f4d98a;
  background: rgba(212, 168, 67, 0.1);
}

.arcade-head {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.arcade-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 1px solid rgba(212, 168, 67, 0.35);
  background: rgba(0, 0, 0, 0.25);
  padding: 6px;
}

.arcade-title {
  color: #ffd978;
  font-size: 18px;
  font-weight: 700;
}

.arcade-sub {
  color: #8a8a9a;
  font-size: 12px;
  margin-top: 4px;
}

.arcade-rules {
  margin: 0;
  padding-left: 18px;
  color: #c8b685;
  line-height: 1.7;
  font-size: 14px;
}

.arcade-soon {
  padding: 12px;
  border-radius: 10px;
  background: rgba(140, 197, 255, 0.08);
  border: 1px solid rgba(140, 197, 255, 0.25);
  color: #a8d4ff;
  font-size: 13px;
  line-height: 1.6;
}

.cult-result-badge {
  width: 96px;
  height: 96px;
  object-fit: contain;
  margin: 0 auto 8px;
  display: block;
  filter: drop-shadow(0 0 16px rgba(255, 217, 120, 0.35));
  animation: badge-reveal 0.6s ease;
}

@keyframes badge-reveal {
  0% { transform: scale(0.5) rotate(-8deg); opacity: 0; }
  70% { transform: scale(1.08) rotate(2deg); opacity: 1; }
  100% { transform: scale(1) rotate(0); opacity: 1; }
}
</style>
