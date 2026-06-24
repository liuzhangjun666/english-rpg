<script setup lang="ts">
import { computed } from 'vue';
import { useTowerStore } from '../../stores/towerStore';
import TowerRewardCard from './TowerRewardCard.vue';

const store = useTowerStore();
const emit = defineEmits<{ continue: []; back: [] }>();
const result = computed(() => store.lastSettle);
const isCleared = computed(() => result.value?.cleared);
</script>

<template>
  <div v-if="result" class="tower-settle-overlay">
    <div class="tower-settle">
      <div class="tower-settle__title">
        {{ isCleared ? (result.breakthrough ? '🎉 境界突破！' : '通关！') : '挑战失败' }}
      </div>
      <div v-if="isCleared" class="tower-settle__rewards">
        <TowerRewardCard icon="💎" label="灵石" :value="`+${result.stones}`" />
        <TowerRewardCard v-if="result.breakthrough" icon="📜" label="心法碎片" value="+1" />
        <TowerRewardCard v-if="result.is_first_clear" icon="⭐" label="首通" :value="`第 ${result.new_floor - 1} 层`" />
      </div>
      <div v-else class="tower-settle__fail">
        <div>本层错题已入心魔池</div>
        <TowerRewardCard icon="👹" label="新生心魔" :value="result.demons_added" />
      </div>
      <div class="tower-settle__actions">
        <button v-if="isCleared" class="tower-settle__btn" @click="emit('continue')">挑战下一层</button>
        <button v-else class="tower-settle__btn" @click="emit('continue')">重试本层</button>
        <button class="tower-settle__btn tower-settle__btn--ghost" @click="emit('back')">返回</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tower-settle-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.7);
  display: grid; place-items: center; z-index: 1000;
}
.tower-settle {
  background: #1a0a14; border: 2px solid #c41e3a; border-radius: 12px;
  padding: 32px; color: #f4e7c1; min-width: 480px;
}
.tower-settle__title { font-size: 28px; text-align: center; margin-bottom: 24px; }
.tower-settle__rewards, .tower-settle__fail {
  display: flex; gap: 16px; justify-content: center; margin: 24px 0;
}
.tower-settle__fail { flex-direction: column; align-items: center; }
.tower-settle__actions { display: flex; gap: 12px; justify-content: center; margin-top: 24px; }
.tower-settle__btn {
  padding: 10px 24px; background: #c41e3a; color: #fff; border: none;
  border-radius: 4px; cursor: pointer; font-size: 15px;
}
.tower-settle__btn--ghost { background: transparent; border: 1px solid #c41e3a; }
</style>
