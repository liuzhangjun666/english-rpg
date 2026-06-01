<template>
  <div class="assessment-page">
    <el-card class="assessment-card" shadow="hover">
      <template #header>
        <div class="title">词汇+语法灵根测试结果</div>
      </template>

      <div v-if="loading" class="status-box">正在结算中...</div>

      <div v-else-if="result">
        <div class="result-hero">
          <div class="hero-emblem">成</div>
          <div class="hero-title">{{ result.final_realm }}</div>
          <div class="hero-subtitle">综合境界（词汇55% + 语法45%，受语法上限约束）</div>
        </div>

        <div class="stat-grid">
          <div class="stat-card">
            <div class="stat-label">稳定水平</div>
            <div class="stat-value">L{{ stableLevel || result.final_level }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">词汇等级</div>
            <div class="stat-value">L{{ result.vocab_final_level }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">语法等级</div>
            <div class="stat-value">L{{ result.grammar_final_level }}</div>
          </div>
        </div>

        <div class="challenge-tip" v-if="challengeLevel">可挑战等级：L{{ challengeLevel }}</div>

        <el-table :data="levelRows" size="small" class="level-table">
          <el-table-column prop="level" label="Level" width="90" />
          <el-table-column prop="total" label="总题数" width="110" />
          <el-table-column prop="correct" label="正确数" width="110" />
          <el-table-column prop="accuracy" label="正确率(%)" />
        </el-table>

        <el-alert
          type="info"
          :closable="false"
          title="推荐修炼路线"
          class="route-alert"
        >
          <template #default>
            <div v-for="(item, idx) in result.suggestions" :key="idx" class="tip-line">{{ idx + 1 }}. {{ item }}</div>
          </template>
        </el-alert>

        <div class="note">本次测试主要基于词汇与语法能力，后续会通过阅读、听力等继续校准。</div>

        <div class="actions">
          <el-button type="primary" data-btn-skin="enter" @click="goHall">进入首页</el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { useRoute, useRouter } from 'vue-router';
import { useApiClient } from '../services/api';
import { useUserStore } from '../stores/user';

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
  const row = levelRows.value.find((item) => Number(String(item.level).replace('L', '')) === next);
  if (row && row.accuracy >= 50) {
    return next;
  }
  return 0;
});

function goHall() {
  router.replace('/hall');
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
  margin: 24px auto;
  padding: 0 12px;
}

.assessment-card {
  position: relative;
  overflow: hidden;
}

.assessment-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 10% 6%, rgba(255, 227, 153, 0.09) 0%, transparent 34%),
    radial-gradient(circle at 88% 14%, rgba(112, 226, 255, 0.1) 0%, transparent 38%),
    linear-gradient(180deg, rgba(16, 23, 44, 0.96) 0%, rgba(8, 13, 28, 0.94) 100%);
  z-index: 0;
}

:deep(.assessment-card.el-card) {
  border: 1px solid rgba(212, 168, 67, 0.45);
  border-radius: 14px;
  background: transparent;
  box-shadow:
    0 16px 36px rgba(0, 0, 0, 0.42),
    inset 0 0 0 1px rgba(255, 235, 182, 0.08);
  color: #f4ecd0;
}

:deep(.assessment-card .el-card__header) {
  position: relative;
  z-index: 1;
  border-bottom: 1px solid rgba(212, 168, 67, 0.3);
  padding: 18px 20px;
  background: linear-gradient(180deg, rgba(25, 35, 62, 0.72) 0%, rgba(18, 26, 48, 0.3) 100%);
}

:deep(.assessment-card .el-card__body) {
  position: relative;
  z-index: 1;
  padding: 20px;
}

.title {
  font-size: 24px;
  font-weight: 800;
  color: #f5de9e;
  letter-spacing: 1px;
}

.status-box {
  padding: 20px 0;
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
  color: #14233f;
  background: radial-gradient(circle at 30% 30%, #fff0bd 0%, #e0b85a 78%);
  box-shadow: 0 0 18px rgba(255, 216, 136, 0.55);
}

.hero-title {
  font-size: 34px;
  font-weight: 800;
  color: #fff2cf;
  margin-bottom: 6px;
  text-shadow: 0 2px 0 rgba(0, 0, 0, 0.35);
}

.hero-subtitle {
  color: #c8d7fa;
  font-size: 15px;
}

.stat-grid {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.stat-card {
  border: 1px solid rgba(173, 208, 255, 0.24);
  border-radius: 12px;
  padding: 10px 12px;
  background: linear-gradient(180deg, rgba(15, 26, 50, 0.72), rgba(8, 16, 34, 0.66));
}

.stat-label {
  font-size: 12px;
  color: #9eb4de;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 24px;
  font-weight: 800;
  color: #fef0c8;
}

.challenge-tip {
  margin-top: 10px;
  color: #97d8ff;
  text-align: center;
  font-weight: 700;
}

.level-table {
  margin-top: 14px;
}

:deep(.level-table.el-table) {
  --el-table-bg-color: rgba(8, 16, 34, 0.62);
  --el-table-tr-bg-color: rgba(8, 16, 34, 0.52);
  --el-table-row-hover-bg-color: rgba(39, 70, 118, 0.5);
  --el-table-border-color: rgba(173, 208, 255, 0.2);
  --el-table-header-bg-color: rgba(28, 43, 73, 0.78);
  --el-table-text-color: #e7efff;
  --el-table-header-text-color: #f6dfaa;
  border: 1px solid rgba(173, 208, 255, 0.2);
  border-radius: 12px;
  overflow: hidden;
}

.route-alert {
  margin-top: 14px;
}

:deep(.route-alert.el-alert) {
  border: 1px solid rgba(212, 168, 67, 0.33);
  background: linear-gradient(180deg, rgba(28, 34, 55, 0.78), rgba(18, 24, 44, 0.68));
  color: #f4ecd0;
}

.tip-line {
  margin: 8px 0;
  line-height: 1.65;
  color: #e6edff;
}

.note {
  margin-top: 14px;
  color: #c8d7fa;
}

.actions {
  margin-top: 18px;
}

.actions :deep(.el-button.btn-art) {
  --btn-art-scale: 0.68;
  margin: 0;
}

@media (max-width: 760px) {
  .hero-title {
    font-size: 28px;
  }

  .stat-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .title {
    font-size: 20px;
  }

  .hero-title {
    font-size: 24px;
  }

  .actions :deep(.el-button.btn-art) {
    --btn-art-scale: 0.62;
  }
}
</style>
