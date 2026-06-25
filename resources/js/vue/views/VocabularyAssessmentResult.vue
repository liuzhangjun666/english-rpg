<template>
  <div class="assessment-page">
    <div class="cult-panel">
      <header class="cult-panel-header">
        <div class="cult-panel-title">
          <span class="cult-panel-icon">✦</span>
          <span>词汇+语法灵根测试结果</span>
        </div>
      </header>

      <div class="cult-panel-body">
      <div v-if="loading" class="status-box">正在结算中...</div>

      <div v-else-if="result">
        <div class="result-hero">
          <div class="hero-emblem">成</div>
          <div class="hero-title">{{ result.final_realm }}</div>
          <div class="hero-subtitle">{{ result.realm_explanation || '境界由学段上限、实测题难度与正确率共同决定' }}</div>
        </div>

        <div v-if="result.school_stage" class="stage-banner">
          <span class="stage-label">注册学段</span>
          <span class="stage-value">{{ result.school_stage }}</span>
          <span class="stage-hint">
            试炼起点 L{{ result.start_level || '-' }} · 本学段上限 L{{ result.max_level_by_school }}（{{ majorRealmLabel }}境）
          </span>
        </div>

        <div class="dual-result-grid">
          <div class="dual-result-card">
            <div class="dual-result-label">词汇稳定等级</div>
            <div class="dual-result-value">L{{ result.vocab_final_level }}</div>
            <div class="dual-result-hint">{{ formatAssessmentLevel(result.vocab_final_level) }}</div>
          </div>
          <div class="dual-result-card">
            <div class="dual-result-label">语法稳定等级</div>
            <div class="dual-result-value">L{{ result.grammar_final_level }}</div>
            <div class="dual-result-hint">{{ formatAssessmentLevel(result.grammar_final_level) }}</div>
          </div>
        </div>

        <div class="stat-grid">
          <div class="stat-card">
            <div class="stat-label">稳定掌握</div>
            <div class="stat-value">L{{ result.proven_level || stableLevel || result.final_level }}</div>
            <div class="stat-hint">按实际做题难度统计</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">实测最高难度</div>
            <div class="stat-value">L{{ result.peak_question_level || '-' }}</div>
            <div class="stat-hint">本场出现过的最难题目</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">综合等级</div>
            <div class="stat-value">L{{ result.final_level }}</div>
            <div class="stat-hint">词汇 55% + 语法 45% 加权</div>
          </div>
        </div>

        <div class="challenge-tip" v-if="challengeLevel && challengeLevel <= (result.max_level_by_school || 7)">
          在本学段范围内，可挑战等级：L{{ challengeLevel }}
        </div>

        <el-table :data="levelRows" size="small" class="level-table">
          <el-table-column prop="level" label="题目难度" width="100" />
          <el-table-column prop="total" label="总题数" width="110" />
          <el-table-column prop="correct" label="正确数" width="110" />
          <el-table-column prop="accuracy" label="正确率(%)" />
        </el-table>

        <div class="cult-notice info">
          <span class="cult-notice-icon">☯</span>
          <div class="cult-notice-body">
            <div class="cult-notice-title">推荐修炼路线</div>
            <div v-for="(item, idx) in result.suggestions" :key="idx" class="tip-line">{{ idx + 1 }}. {{ item }}</div>
          </div>
        </div>

        <div class="note">境界已按你的学段与实测表现测定，修炼内容将匹配{{ majorRealmLabel }}词库与关卡。</div>

        <div class="cult-actions">
          <el-button type="primary" data-btn-skin="enter" @click="goHall">开启修仙之旅</el-button>
        </div>
      </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { useRoute, useRouter } from 'vue-router';
import { useApiClient } from '../services/api';
import { useUserStore } from '../stores/user';
import { formatAssessmentLevel } from '../data/assessmentLevels';

const route = useRoute();
const router = useRouter();
const api = useApiClient();
const user = useUserStore();

const assessmentId = Number(route.params.assessmentId || 0);

const loading = ref(true);
const result = ref<any>(null);

const levelRows = computed(() => {
  const rows: Array<{ level: string; total: number; correct: number; accuracy: number }> = [];
  const map = result.value?.level_results || {};
  Object.keys(map)
    .sort((a, b) => Number(a) - Number(b))
    .forEach((key) => {
      const item = map[key] || {};
      if (Number(item.total || 0) <= 0) return;
      rows.push({
        level: `L${key}`,
        total: Number(item.total || 0),
        correct: Number(item.correct || 0),
        accuracy: Number(item.accuracy || 0),
      });
    });
  return rows;
});

const stableLevel = computed(() => {
  let stable = 0;
  for (const row of levelRows.value) {
    const lv = Number(String(row.level).replace('L', ''));
    if (row.accuracy >= 70 && lv > stable) {
      stable = lv;
    }
  }
  return stable;
});

const challengeLevel = computed(() => {
  if (!stableLevel.value) return 0;
  const next = stableLevel.value + 1;
  const maxSchool = Number(result.value?.max_level_by_school || 7);
  if (next > maxSchool) return 0;
  const row = levelRows.value.find((item) => Number(String(item.level).replace('L', '')) === next);
  if (row && row.accuracy >= 50) {
    return next;
  }
  return 0;
});

const majorRealmLabel = computed(() => {
  const realm = String(result.value?.final_realm || '');
  const match = realm.match(/^(练气|筑基|金丹|元婴|化神|炼虚|合体|大乘|渡劫)/);
  return match?.[1] || '对应';
});

function goHall() {
  const redirect = String(route.query.redirect || '/practice');
  router.replace(redirect);
}

onMounted(async () => {
  if (!assessmentId || Number.isNaN(assessmentId)) {
    ElMessage.error('assessment_id 无效');
    router.replace('/hall');
    return;
  }

  try {
    const res = await api.post('/vocab-assessment/finish', {
      assessment_id: assessmentId,
    });

    if (!res?.success) {
      ElMessage.error(res?.message || '结算失败');
      router.replace('/hall');
      return;
    }

    result.value = res.data;
    if (user.profile) {
      user.updateProfile({
        initial_assessment_done: 1,
        current_realm: res.data.final_realm || user.profile.current_realm,
        realm: res.data.realm_code || user.profile.realm,
        realm_stage: res.data.realm_stage ?? user.profile.realm_stage,
      });
    }
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.assessment-page {
  max-width: 920px;
}

.status-box {
  padding: 12px 0;
  color: var(--cult-parchment-dim, #c8b685);
}

.result-hero {
  text-align: center;
  padding: 4px 0 10px;
}

.hero-emblem {
  width: 64px;
  height: 64px;
  margin: 0 auto 12px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  font-size: 30px;
  font-weight: 800;
  color: #1a1208;
  background: radial-gradient(circle at 30% 30%, #fff0bd 0%, #e0b85a 78%);
  box-shadow: 0 0 18px rgba(244, 217, 138, 0.4);
}

.hero-title {
  font-size: 32px;
  font-weight: 800;
  color: var(--cult-gold, #f4d98a);
  margin-bottom: 6px;
  font-family: var(--cult-font-title, 'KaiTi', serif);
}

.hero-subtitle {
  color: var(--cult-parchment-dim, #c8b685);
  font-size: 14px;
}

.stat-grid {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.stat-card {
  border: 1px solid rgba(212, 168, 67, 0.2);
  border-radius: var(--cult-radius-sm, 10px);
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.22);
  text-align: center;
}

.stat-label {
  font-size: 12px;
  color: var(--cult-parchment-muted, #9a8f6e);
  margin-bottom: 4px;
}

.stat-value {
  font-size: 22px;
  font-weight: 800;
  color: var(--cult-gold, #f4d98a);
}

.stat-hint {
  margin-top: 4px;
  font-size: 11px;
  color: var(--cult-parchment-muted, #9a8f6e);
  line-height: 1.4;
}

.stage-banner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  margin-top: 14px;
  padding: 10px 12px;
  border-radius: var(--cult-radius-sm, 10px);
  border: 1px solid rgba(212, 168, 67, 0.28);
  background: rgba(212, 168, 67, 0.06);
}

.stage-label {
  font-size: 12px;
  color: var(--cult-parchment-muted, #9a8f6e);
}

.stage-value {
  font-size: 15px;
  font-weight: 700;
  color: var(--cult-gold, #f4d98a);
}

.stage-hint {
  font-size: 12px;
  color: var(--cult-parchment-dim, #c8b685);
}

.dual-result-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
}

.dual-result-card {
  border: 1px solid rgba(212, 168, 67, 0.28);
  border-radius: var(--cult-radius-sm, 10px);
  padding: 12px 14px;
  background: rgba(212, 168, 67, 0.06);
  text-align: center;
}

.dual-result-label {
  font-size: 12px;
  color: var(--cult-parchment-muted, #9a8f6e);
  margin-bottom: 4px;
}

.dual-result-value {
  font-size: 24px;
  font-weight: 800;
  color: var(--cult-gold, #f4d98a);
}

.dual-result-hint {
  margin-top: 4px;
  font-size: 12px;
  color: var(--cult-parchment-dim, #c8b685);
}

.challenge-tip {
  margin-top: 10px;
  color: var(--cult-gold-dim, #d4a843);
  text-align: center;
  font-weight: 700;
}

.level-table {
  margin-top: 14px;
}

.tip-line {
  margin: 6px 0 0;
  line-height: 1.65;
  color: var(--cult-parchment-dim, #c8b685);
  font-size: 13px;
}

.note {
  margin-top: 14px;
  color: var(--cult-parchment-dim, #c8b685);
  font-size: 13px;
  line-height: 1.6;
}

@media (max-width: 760px) {
  .hero-title {
    font-size: 26px;
  }

  .dual-result-grid,
  .stat-grid {
    grid-template-columns: 1fr;
  }
}
</style>
