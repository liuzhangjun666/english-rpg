<script setup lang="ts">
import { computed } from 'vue';
import { useTowerStore } from '../../stores/towerStore';

const store = useTowerStore();
const emit = defineEmits<{ start: []; resume: []; back: [] }>();
const hasInProgress = computed(() => !!store.inProgressRunId);
</script>

<template>
  <div class="tower-lobby">
    <button class="tower-lobby__back" @click="emit('back')">← 返回大厅</button>
    <div class="tower-lobby__title">万妖古塔</div>
    <div class="tower-lobby__stats">
      <div>当前层：<b>{{ store.currentFloor }}</b></div>
      <div>历史最高：<b>{{ store.highestFloor }}</b></div>
    </div>
    <button v-if="hasInProgress" class="tower-lobby__cta" @click="emit('resume')">继续上次闯关</button>
    <button v-else class="tower-lobby__cta" @click="emit('start')">登塔挑战</button>
  </div>
</template>

<style scoped>
.tower-lobby { padding: 40px; text-align: center; color: #f4e7c1; }
.tower-lobby__back { background: none; border: none; color: #f4e7c1; cursor: pointer; }
.tower-lobby__title { font-size: 36px; margin: 24px 0; letter-spacing: 8px; }
.tower-lobby__stats { display: flex; gap: 40px; justify-content: center; margin-bottom: 32px; font-size: 18px; }
.tower-lobby__cta {
  padding: 16px 48px; font-size: 20px; background: #c41e3a; color: #fff;
  border: none; border-radius: 6px; cursor: pointer;
}
</style>
