<template>
  <div class="assessment-page">
    <el-card class="assessment-card" shadow="hover">
      <template #header>
        <div class="title">词汇灵根测试 · 准备开始</div>
      </template>

      <p class="desc">学习阶段将根据你注册时填写的年级自动匹配。</p>
      <p class="desc">无需再选择学习目标，点击下方按钮即可开始灵根测试。</p>

      <div class="actions">
        <el-button data-btn-skin="back" @click="goBack">返回</el-button>
        <el-button
          type="primary"
          data-btn-skin="challenge"
          :loading="starting"
          @click="startAssessment"
        >
          开始试炼
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { useRouter } from 'vue-router';
import { useApiClient } from '../services/api';

const router = useRouter();
const api = useApiClient();

const starting = ref(false);

function goBack() {
  router.push('/vocab-assessment/intro');
}

async function startAssessment() {
  starting.value = true;
  try {
    const res = await api.post('/vocab-assessment/start', {});

    if (!res?.success || !res?.data?.assessment_id) {
      ElMessage.error(res?.message || '开启测试失败');
      return;
    }

    router.replace(`/vocab-assessment/question/${res.data.assessment_id}`);
  } finally {
    starting.value = false;
  }
}
</script>

<style scoped>
.assessment-page {
  max-width: 860px;
  margin: 24px auto;
  padding: 0 12px;
}

.title {
  font-size: 22px;
  font-weight: 700;
  color: #f5de9e;
  letter-spacing: 1px;
}

:deep(.assessment-card.el-card) {
  border: 1px solid rgba(212, 168, 67, 0.45);
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(16, 23, 44, 0.94) 0%, rgba(9, 14, 30, 0.92) 100%);
  box-shadow:
    0 14px 34px rgba(0, 0, 0, 0.4),
    inset 0 0 0 1px rgba(255, 235, 182, 0.08);
  color: #f4ecd0;
}

:deep(.assessment-card .el-card__header) {
  border-bottom: 1px solid rgba(212, 168, 67, 0.3);
  padding: 18px 20px;
  background: linear-gradient(180deg, rgba(25, 35, 62, 0.75) 0%, rgba(18, 26, 48, 0.42) 100%);
}

:deep(.assessment-card .el-card__body) {
  padding: 20px;
}

.desc {
  margin: 8px 0;
  line-height: 1.7;
  color: #f4ecd0;
}

.actions {
  margin-top: 24px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.actions :deep(.el-button.btn-art) {
  --btn-art-scale: 0.68;
  margin: 0;
}

@media (max-width: 640px) {
  .actions {
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }

  .actions :deep(.el-button.btn-art) {
    --btn-art-scale: 0.62;
  }
}
</style>
