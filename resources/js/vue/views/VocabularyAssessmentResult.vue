<template>
  <div class="assessment-page">
    <el-card class="assessment-card" shadow="hover">
      <template #header>
        <div class="title">词汇灵根测试结果</div>
      </template>

      <div v-if="loading" class="status-box">正在结算中...</div>

      <div v-else-if="result">
        <el-result icon="success" :title="result.final_realm" sub-title="综合词汇境界">
          <template #extra>
            <div class="summary">稳定水平：L{{ stableLevel || result.final_level }}</div>
            <div class="summary" v-if="challengeLevel">挑战水平：L{{ challengeLevel }}</div>
          </template>
        </el-result>

        <el-table :data="levelRows" size="small" style="width: 100%; margin-top: 10px">
          <el-table-column prop="level" label="Level" width="90" />
          <el-table-column prop="total" label="总题数" width="110" />
          <el-table-column prop="correct" label="正确数" width="110" />
          <el-table-column prop="accuracy" label="正确率(%)" />
        </el-table>

        <el-alert
          type="info"
          :closable="false"
          title="推荐修炼路线"
          style="margin-top: 14px"
        >
          <template #default>
            <div v-for="(item, idx) in result.suggestions" :key="idx" class="tip-line">{{ idx + 1 }}. {{ item }}</div>
          </template>
        </el-alert>

        <div class="note">本次测试主要基于词汇能力，后续会通过语法、阅读、听力等继续校准。</div>

        <div class="actions">
          <el-button type="primary" @click="goHall">进入修炼地图</el-button>
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

.title {
  font-size: 22px;
  font-weight: 700;
}

.status-box {
  padding: 20px 0;
}

.summary {
  margin: 4px 0;
}

.tip-line {
  margin: 6px 0;
}

.note {
  margin-top: 14px;
  color: #cfdaf3;
}

.actions {
  margin-top: 16px;
}
</style>
