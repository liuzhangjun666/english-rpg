<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useTowerStore } from '../stores/towerStore';
import { useLegacyBridge } from '../composables/useLegacyBridge';
import TowerLobby from '../components/wanyaoTower/TowerLobby.vue';
import TowerQuestionRunner from '../components/wanyaoTower/TowerQuestionRunner.vue';
import TowerBossPanel from '../components/wanyaoTower/TowerBossPanel.vue';
import TowerSettleModal from '../components/wanyaoTower/TowerSettleModal.vue';

const router = useRouter();
const store = useTowerStore();
const bridge = useLegacyBridge();

onMounted(async () => {
  bridge.switchToWanyaoTowerScene?.();
  await store.fetchStatus();
});

function onStart()   { store.startRun(); }
function onResume()  { store.startRun(); /* 后端拒绝时显示已有 run；Phase 1 简化 */ }
function onBack()    { router.push('/practice'); }
function onContinue() {
  store.resetToIdle();
  store.fetchStatus();
}
</script>

<template>
  <div class="wanyao-tower-view">
    <TowerLobby
      v-if="store.status === 'idle'"
      @start="onStart"
      @resume="onResume"
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
  position: fixed; inset: 0; pointer-events: auto;
  background: linear-gradient(180deg, rgba(20,0,10,0.5), rgba(0,0,0,0.85));
}
.wanyao-tower-view__loading { display: grid; place-items: center; height: 100vh; color: #f4e7c1; }
</style>
