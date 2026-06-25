<template>
  <div class="variant-switch" role="tablist" aria-label="修炼模式">
    <button
      type="button"
      class="variant-btn"
      :class="{ active: modelValue === 'classic' }"
      role="tab"
      :aria-selected="modelValue === 'classic'"
      @click="select('classic')"
    >
      常规
    </button>
    <button
      type="button"
      class="variant-btn"
      :class="{ active: modelValue === 'arcade', disabled: !arcadeEnabled }"
      role="tab"
      :aria-selected="modelValue === 'arcade'"
      :disabled="!arcadeEnabled"
      @click="select('arcade')"
    >
      试炼
      <span v-if="!arcadePlayable && arcadeEnabled" class="variant-tag">预告</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import type { PracticeVariant } from '../../data/arcadeModes';

defineProps<{
  modelValue: PracticeVariant;
  arcadeEnabled?: boolean;
  arcadePlayable?: boolean;
}>();

const emit = defineEmits<{ (e: 'update:modelValue', value: PracticeVariant): void }>();

function select(value: PracticeVariant) {
  emit('update:modelValue', value);
}
</script>

<style scoped>
.variant-switch {
  display: inline-flex;
  padding: 4px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(212, 168, 67, 0.35);
  gap: 4px;
}

.variant-btn {
  position: relative;
  border: none;
  background: transparent;
  color: #a89b7a;
  padding: 6px 18px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.variant-btn.active {
  background: linear-gradient(135deg, rgba(212, 168, 67, 0.35), rgba(212, 168, 67, 0.15));
  color: #ffd978;
  box-shadow: inset 0 0 0 1px rgba(212, 168, 67, 0.45);
}

.variant-btn.disabled:not(.active) {
  opacity: 0.45;
  cursor: not-allowed;
}

.variant-tag {
  margin-left: 4px;
  font-size: 10px;
  color: #8cc5ff;
  font-weight: 500;
}
</style>
