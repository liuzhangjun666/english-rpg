<script setup lang="ts">
import { computed } from 'vue';
import { useTowerStore } from '../../stores/towerStore';

const store = useTowerStore();
const emit = defineEmits<{ start: []; resume: []; restart: []; back: [] }>();
const hasInProgress = computed(() => !!store.inProgressRunId);
</script>

<template>
  <div class="tower-lobby">
    <button type="button" class="tower-lobby__back" @click="emit('back')">← 返回大厅</button>
    <div class="tower-lobby__main">
      <div class="tower-lobby__title">万妖古塔</div>
      <div class="tower-lobby__stats">
        <div>当前层：<b>{{ store.currentFloor }}</b></div>
        <div>历史最高：<b>{{ store.highestFloor }}</b></div>
      </div>
      <div class="tower-lobby__actions">
        <button v-if="hasInProgress" class="tower-lobby__cta" @click="emit('resume')">继续上次闯关</button>
        <button
          v-if="hasInProgress"
          class="tower-lobby__cta tower-lobby__cta--secondary"
          @click="emit('restart')"
        >
          重新闯关
        </button>
        <button v-else class="tower-lobby__cta" @click="emit('start')">登塔挑战</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tower-lobby {
  position: relative;
  min-height: 100%;
  color: #f4e7c1;
}
.tower-lobby__back {
  position: absolute;
  top: 12px;
  left: 16px;
  z-index: 2;
  padding: 8px 14px;
  border: 1px solid rgba(244, 231, 193, 0.35);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.45);
  color: #f4e7c1;
  font-size: 14px;
  cursor: pointer;
}
.tower-lobby__back:hover {
  background: rgba(196, 30, 58, 0.25);
  border-color: rgba(196, 30, 58, 0.55);
}
.tower-lobby__main {
  padding: 56px 40px 40px;
  text-align: center;
}
.tower-lobby__title { font-size: 36px; margin: 24px 0; letter-spacing: 8px; }
.tower-lobby__stats { display: flex; gap: 40px; justify-content: center; margin-bottom: 32px; font-size: 18px; }
.tower-lobby__actions { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.tower-lobby__cta {
  padding: 16px 48px; font-size: 20px; background: #c41e3a; color: #fff;
  border: none; border-radius: 6px; cursor: pointer;
}
.tower-lobby__cta--secondary {
  background: transparent; color: #f4e7c1;
  border: 1px solid rgba(244, 231, 193, 0.45);
}
.tower-lobby__cta--secondary:hover { background: rgba(244, 231, 193, 0.08); }
</style>
