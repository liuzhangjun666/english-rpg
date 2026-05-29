<template>
  <div class="vocab-module">
    <!-- 木桩连击 / 灵草采集 场景 -->
    <div class="arena-display">
      <div class="word-display">{{ question.content }}</div>
      <button class="speaker-btn" @click="playAudio" title="播放发音">🔊</button>
    </div>

    <div class="options-container">
      <button 
        v-for="(opt, idx) in options" 
        :key="idx"
        class="option-btn"
        :class="{ 'is-selected': selectedOption === opt.key }"
        :disabled="isLocked"
        @click="handleSelect(opt.key)"
      >
        <span class="option-index">{{ idx + 1 }}</span>
        <span class="option-text">{{ opt.text }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
  question: any;
}>();

const emit = defineEmits<{
  (e: 'submit-answer', payload: { answer: string }): void;
}>();

const selectedOption = ref<string | null>(null);
const isLocked = ref(false);

const options = computed(() => {
  if (!props.question) return [];
  // 假设题目带有 options 数组或以某种形式提供选项
  return props.question.options || [];
});

const playAudio = () => {
  // 播放单词音频逻辑
};

const handleSelect = (key: string) => {
  if (isLocked.value) return;
  selectedOption.value = key;
  isLocked.value = true;
  
  emit('submit-answer', { answer: key });
  
  // 重置状态
  setTimeout(() => {
    isLocked.value = false;
    selectedOption.value = null;
  }, 1000); // 假装需要一点时间显示特效
};
</script>

<style scoped>
.vocab-module {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.arena-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 30px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
}
.word-display {
  font-size: 28px;
  font-weight: bold;
  color: var(--gold);
}
.speaker-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  transition: transform 0.2s;
}
.speaker-btn:hover {
  transform: scale(1.1);
}
.options-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}
.option-btn {
  padding: 15px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(212, 168, 67, 0.3);
  border-radius: 8px;
  color: var(--parchment);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.2s;
}
.option-btn:hover:not(:disabled) {
  background: rgba(212, 168, 67, 0.1);
}
.option-btn.is-selected {
  background: rgba(212, 168, 67, 0.3);
  border-color: var(--gold);
}
.option-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.option-index {
  color: var(--gold-light);
  font-weight: bold;
}
</style>
