<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { TowerQuestion } from '../../types/wanyaoTower';

const props = defineProps<{ question: TowerQuestion; index: number; total: number; disabled?: boolean }>();
const emit = defineEmits<{ submit: [answer: string] }>();
const selected = ref<string | null>(null);

watch(() => props.question.id, () => {
  selected.value = null;
});

watch(() => props.disabled, (disabled, wasDisabled) => {
  if (wasDisabled && !disabled) {
    selected.value = null;
  }
});

const displayPrompt = computed(() => {
  const prompt = props.question.prompt?.trim();
  if (prompt) return prompt;
  const word = props.question.word?.trim();
  if (word) return `"${word}" 的中文意思是？`;
  return '请选择正确答案';
});

function pick(opt: string) {
  if (props.disabled || selected.value) return;
  selected.value = opt;
  emit('submit', opt);
}
</script>

<template>
  <div class="tower-mcq">
    <div class="tower-mcq__progress">第 {{ index + 1 }} / {{ total }} 题</div>
    <div v-if="question.listening_text" class="tower-mcq__listening">{{ question.listening_text }}</div>
    <div class="tower-mcq__prompt">{{ displayPrompt }}</div>
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
.tower-mcq { padding: 20px; color: #f4e7c1; max-width: 720px; margin: 0 auto; }
.tower-mcq__progress { font-size: 13px; opacity: 0.85; margin-bottom: 12px; }
.tower-mcq__listening {
  font-size: 14px; line-height: 1.6; margin-bottom: 12px;
  padding: 10px 12px; border-radius: 6px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(244,231,193,0.2);
}
.tower-mcq__prompt {
  font-size: 22px; line-height: 1.6; margin-bottom: 24px;
  padding: 14px 16px; border-radius: 8px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(244,231,193,0.18);
}
.tower-mcq__options { display: grid; gap: 12px; }
.tower-mcq__option {
  padding: 12px 16px; background: rgba(196, 30, 58, 0.18); border: 1px solid #c41e3a;
  color: #f4e7c1; border-radius: 6px; cursor: pointer; transition: all 0.15s;
}
.tower-mcq__option:hover:not(:disabled) { background: rgba(196, 30, 58, 0.35); }
.tower-mcq__option.is-selected { background: #c41e3a; color: #fff; }
.tower-mcq__option:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
