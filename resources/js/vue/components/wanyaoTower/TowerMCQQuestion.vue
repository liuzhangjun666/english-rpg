<script setup lang="ts">
import { ref } from 'vue';
import type { TowerQuestion } from '../../types/wanyaoTower';

const props = defineProps<{ question: TowerQuestion; index: number; total: number; disabled?: boolean }>();
const emit = defineEmits<{ submit: [answer: string] }>();
const selected = ref<string | null>(null);

function pick(opt: string) {
  if (props.disabled || selected.value) return;
  selected.value = opt;
  emit('submit', opt);
}
</script>

<template>
  <div class="tower-mcq">
    <div class="tower-mcq__progress">第 {{ index + 1 }} / {{ total }} 题</div>
    <div class="tower-mcq__prompt">{{ question.prompt }}</div>
    <div class="tower-mcq__options">
      <button
        v-for="opt in question.options"
        :key="opt"
        class="tower-mcq__option"
        :class="{ 'is-selected': selected === opt }"
        :disabled="!!selected || disabled"
        @click="pick(opt)"
      >
        {{ opt }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.tower-mcq { padding: 20px; color: #f4e7c1; }
.tower-mcq__progress { font-size: 12px; opacity: 0.7; margin-bottom: 8px; }
.tower-mcq__prompt { font-size: 22px; margin-bottom: 24px; }
.tower-mcq__options { display: grid; gap: 12px; }
.tower-mcq__option {
  padding: 12px 16px; background: rgba(196, 30, 58, 0.18); border: 1px solid #c41e3a;
  color: #f4e7c1; border-radius: 6px; cursor: pointer; transition: all 0.15s;
}
.tower-mcq__option:hover:not(:disabled) { background: rgba(196, 30, 58, 0.35); }
.tower-mcq__option.is-selected { background: #c41e3a; color: #fff; }
.tower-mcq__option:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
