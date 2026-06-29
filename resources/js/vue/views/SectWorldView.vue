<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUiStore } from '../stores/ui';
import { returnToHall } from '../services/hallNavigation';

const router = useRouter();
const ui = useUiStore();

onMounted(() => {
  ui.showMapOverlay();
  void returnToHall(router, { replace: true, loadingText: '正在进入宗门大阵...' });
});
</script>

<template>
  <div class="map-redirect">正在进入宗门大阵...</div>
</template>

<style scoped>
.map-redirect {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  color: #d4a843;
  background: #050914;
}
</style>
