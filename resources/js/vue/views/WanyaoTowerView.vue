<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useTowerStore } from '../stores/towerStore';
import { useLegacyBridge } from '../composables/useLegacyBridge';
import TowerLobby from '../components/wanyaoTower/TowerLobby.vue';
import TowerQuestionRunner from '../components/wanyaoTower/TowerQuestionRunner.vue';
import TowerBossPanel from '../components/wanyaoTower/TowerBossPanel.vue';
import TowerSettleModal from '../components/wanyaoTower/TowerSettleModal.vue';

const router = useRouter();
const store = useTowerStore();
const bridge = useLegacyBridge();

const showExit = computed(() => store.status === 'answering' || store.status === 'boss');

onMounted(async () => {
  bridge.switchToWanyaoTowerScene?.();
  try {
    await store.fetchStatus();
  } catch {
    ElMessage.error('塔层信息加载失败');
  }
});

async function onStart() {
  try {
    await store.startRun();
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '启动闯关失败');
  }
}

async function onResume() {
  try {
    await store.resumeRun();
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '恢复闯关失败');
  }
}

async function onRestart() {
  try {
    await ElMessageBox.confirm(
      '重新闯关将放弃当前进度并抽取新题，确定继续吗？',
      '重新闯关',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' },
    );
    await store.restartRun();
  } catch (e: unknown) {
    if (e === 'cancel' || e === 'close') return;
    ElMessage.error(e instanceof Error ? e.message : '重新闯关失败');
  }
}

function onBack() { router.push('/hall'); }

function onExit() {
  store.pauseRun();
  ElMessage.success('进度已保存，可稍后继续闯关');
}

function onContinue() {
  store.resetToIdle();
  void store.fetchStatus();
}
</script>

<template>
  <div class="wanyao-tower-view">
    <button
      v-if="showExit"
      type="button"
      class="wanyao-tower-view__exit"
      @click="onExit"
    >
      ← 暂离闯关
    </button>
    <TowerLobby
      v-if="store.status === 'idle'"
      @start="onStart"
      @resume="onResume"
      @restart="onRestart"
      @back="onBack"
    />
    <TowerQuestionRunner v-else-if="store.status === 'answering'" />
    <TowerBossPanel v-else-if="store.status === 'boss'" />
    <div v-else-if="store.status === 'starting' || store.status === 'settling'" class="wanyao-tower-view__loading">
      载入中…
    </div>
    <TowerSettleModal
      v-if="store.status === 'reward' || store.status === 'failed'"
      @continue="onContinue"
      @back="onBack"
    />
  </div>
</template>

<style scoped>
.wanyao-tower-view {
  position: fixed;
  top: var(--hud-offset-top, var(--top-hud-height, 80px));
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: auto;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  min-height: calc(var(--app-dvh, 100vh) - var(--hud-offset-top, var(--top-hud-height, 80px)));
  padding-bottom: env(safe-area-inset-bottom, 0px);
  background: linear-gradient(180deg, rgba(20,0,10,0.5), rgba(0,0,0,0.85));
}
.wanyao-tower-view__exit {
  position: sticky;
  top: 0;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  margin: 12px 0 0 16px;
  padding: 8px 14px;
  border: 1px solid rgba(244, 231, 193, 0.35);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.45);
  color: #f4e7c1;
  font-size: 14px;
  cursor: pointer;
}
.wanyao-tower-view__exit:hover {
  background: rgba(196, 30, 58, 0.25);
  border-color: rgba(196, 30, 58, 0.55);
}
.wanyao-tower-view__loading {
  display: grid; place-items: center;
  min-height: calc(var(--app-dvh, 100vh) - var(--hud-offset-top, var(--top-hud-height, 80px)));
  color: #f4e7c1;
}
</style>
