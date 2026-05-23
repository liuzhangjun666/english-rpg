<template>
  <div class="hall-page">
    <el-card class="hall-status" shadow="hover">
      <template #header>
        <div class="card-header">宗门大厅</div>
      </template>
      <div class="status-grid">
        <div><span class="label">道号</span><span>{{ user.profile?.nickname || '-' }}</span></div>
        <div><span class="label">境界</span><span>{{ user.profile?.current_realm || user.profile?.realm || '-' }}</span></div>
        <div><span class="label">灵气</span><span>{{ user.profile?.exp ?? 0 }}</span></div>
        <div><span class="label">灵力</span><span>{{ user.profile?.spirit_power ?? 0 }}/{{ user.profile?.spirit_power_max ?? 0 }}</span></div>
      </div>
    </el-card>

    <el-row :gutter="12" class="hall-actions">
      <el-col :xs="24" :sm="12" :md="8">
        <el-card class="action-card" shadow="hover" @click="goPractice('vocab')">
          <h3>练功房</h3>
          <p>词汇采集、炼丹拼词、语法修炼</p>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="8">
        <el-card class="action-card" shadow="hover" @click="goPractice('listening')">
          <h3>听风谷</h3>
          <p>听力/口语练习，沿用当前题库流程</p>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="8">
        <el-card class="action-card" shadow="hover" @click="goPractice('writing')">
          <h3>符箓台</h3>
          <p>写作、阅读等高级模块入口</p>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="8">
        <el-card class="action-card" shadow="hover" @click="goReading">
          <h3>藏经阁</h3>
          <p>剧情阅读冒险（legacy 面板）</p>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="8">
        <el-card class="action-card" shadow="hover" @click="goExam">
          <h3>试炼场</h3>
          <p>章节试炼与关卡验证</p>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="8">
        <el-card class="action-card" shadow="hover" @click="goMijing">
          <h3>秘境</h3>
          <p>限时挑战与剧情收集物</p>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="8">
        <el-card class="action-card" shadow="hover" @click="goMall">
          <h3>仙坊</h3>
          <p>商城道具与资源补给</p>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="8">
        <el-card class="action-card" shadow="hover" @click="goLeaderboard">
          <h3>天榜</h3>
          <p>查看修士排行与进度</p>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useLegacyBridge } from '../composables/useLegacyBridge';
import { useUserStore } from '../stores/user';
import { useUiStore } from '../stores/ui';

const router = useRouter();
const bridge = useLegacyBridge();
const user = useUserStore();
const ui = useUiStore();

onMounted(async () => {
  ui.showLoading('进入大厅...');
  try {
    await bridge.switchToHall();
  } catch (error) {
    ElMessage.error('大厅加载失败，请刷新重试');
  } finally {
    ui.hideLoading();
  }
});

function goPractice(mode = 'vocab') {
  router.push({ path: '/practice', query: { mode } });
}

function goReading() {
  router.push('/reading');
}

function goExam() {
  router.push('/exam');
}

function goMijing() {
  router.push('/mijing');
}

function goMall() {
  router.push('/mall');
}

function goLeaderboard() {
  router.push('/leaderboard');
}
</script>
