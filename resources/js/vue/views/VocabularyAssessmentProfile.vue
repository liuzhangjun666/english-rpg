<template>
  <div class="assessment-page">
    <div class="cult-panel">
      <header class="cult-panel-header">
        <div class="cult-panel-title">
          <span class="cult-panel-icon">✧</span>
          <span>词汇灵根测试 · 准备开始</span>
        </div>
      </header>
      <div class="cult-panel-body">
        <p class="assessment-desc">注册时选择的学段将匹配试炼起点，<strong>初始境界由灵根测试结果决定</strong>。</p>
        <p class="assessment-desc">点击下方按钮即可开始灵根测试。</p>
        <div class="cult-actions">
          <el-button data-btn-skin="back" @click="goBack">返回</el-button>
          <el-button type="primary" data-btn-skin="challenge" :loading="starting" @click="startAssessment">
            开始试炼
          </el-button>
        </div>
      </div>
    </div>
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
  min-height: calc(var(--app-dvh, 100vh) - var(--hud-offset-top, var(--top-hud-height, 76px)));
  padding-bottom: max(10px, env(safe-area-inset-bottom, 0px));
}

.assessment-desc {
  color: var(--cult-parchment-dim, #c8b685);
  font-size: 14px;
  line-height: 1.7;
  margin: 0 0 10px;
}

.assessment-desc strong {
  color: var(--cult-gold, #f4d98a);
}
</style>
