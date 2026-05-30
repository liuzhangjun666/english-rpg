<template>
  <div class="assessment-page">
    <el-card class="assessment-card" shadow="hover">
      <template #header>
        <div class="title">词汇灵根测试 · 基础信息</div>
      </template>

      <el-form label-position="top">
        <el-form-item label="选择当前学习阶段">
          <el-select v-model="schoolStage" placeholder="请选择阶段" style="width: 100%">
            <el-option label="小学" value="小学" />
            <el-option label="初中" value="初中" />
            <el-option label="高中" value="高中" />
            <el-option label="大学" value="大学" />
            <el-option label="研究生" value="研究生" />
          </el-select>
        </el-form-item>

        <el-form-item label="学习目标（选填）">
          <el-select v-model="learningGoal" clearable placeholder="可选" style="width: 100%">
            <el-option
              v-for="item in goalOptions"
              :key="item"
              :label="item"
              :value="item"
            />
          </el-select>
        </el-form-item>
      </el-form>

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
import { computed, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { useRouter } from 'vue-router';
import { useApiClient } from '../services/api';

const router = useRouter();
const api = useApiClient();

const schoolStage = ref('');
const learningGoal = ref('');
const starting = ref(false);

const goalMap: Record<string, string[]> = {
  小学: ['校内同步', '词汇打底'],
  初中: ['中考', '校内同步'],
  高中: ['高考', '词汇强化'],
  大学: ['四级', '六级', '考研'],
  研究生: ['学术英语', '论文阅读', '综合提升'],
};

const goalOptions = computed(() => goalMap[schoolStage.value] || []);

function goBack() {
  router.push('/vocab-assessment/intro');
}

async function startAssessment() {
  if (!schoolStage.value) {
    ElMessage.warning('请先选择学习阶段');
    return;
  }

  starting.value = true;
  try {
    const res = await api.post('/vocab-assessment/start', {
      school_stage: schoolStage.value,
      learning_goal: learningGoal.value || undefined,
    });

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

:deep(.assessment-card .el-form-item__label) {
  color: #d8c997;
  font-weight: 600;
}

:deep(.assessment-card .el-select__wrapper) {
  background-color: rgba(9, 14, 30, 0.75);
  border: 1px solid rgba(212, 168, 67, 0.3);
  box-shadow: none;
  border-radius: 10px;
  min-height: 42px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

:deep(.assessment-card .el-select__wrapper.is-focused),
:deep(.assessment-card .el-select__wrapper:hover) {
  border-color: rgba(238, 205, 124, 0.75);
  box-shadow: 0 0 0 2px rgba(212, 168, 67, 0.2);
}

:deep(.assessment-card .el-select__placeholder) {
  color: rgba(226, 212, 170, 0.62);
}

:deep(.assessment-card .el-select__selected-item),
:deep(.assessment-card .el-select__caret) {
  color: #f2e6c5;
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
