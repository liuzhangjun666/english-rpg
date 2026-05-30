<template>
  <div class="assessment-page">
    <el-card class="assessment-card" shadow="hover">
      <template #header>
        <div class="title">词汇灵根测试</div>
      </template>

      <p>系统将通过 25 道词汇题判断你的初始英语境界。</p>
      <p>连续答对，试炼升阶。</p>
      <p>答错或耗时过长，试炼降阶。</p>
      <p>本测试主要判断词汇能力，后续会根据语法、阅读、听力等继续校准。</p>

      <div class="actions">
        <el-button type="primary" @click="goProfile">开始测试</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useApiClient } from '../services/api';
import { useUserStore } from '../stores/user';

const router = useRouter();
const api = useApiClient();
const user = useUserStore();

function goProfile() {
  router.push('/vocab-assessment/profile');
}

onMounted(async () => {
  const res = await api.get('/vocab-assessment/status');
  if (res?.success && res?.data?.done) {
    if (user.profile) {
      user.updateProfile({
        initial_assessment_done: 1,
        current_realm: res.data.current_realm ?? user.profile.current_realm,
      });
    }
    router.replace('/hall');
  }
});
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

.assessment-card p {
  margin: 10px 0;
  line-height: 1.7;
  color: #f4ecd0;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.35);
}

.actions {
  margin-top: 20px;
}
</style>
