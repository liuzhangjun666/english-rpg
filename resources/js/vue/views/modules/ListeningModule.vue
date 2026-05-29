<template>
  <div class="listening-module">
    <div class="audio-controls">
      <button 
        class="play-btn" 
        :disabled="isPlaying || replayCount >= maxReplays"
        @click="handlePlay"
      >
        <span class="icon">{{ isPlaying ? '🔊' : '▶️' }}</span>
        <span class="text">{{ isPlaying ? '播放中...' : '播放音频' }}</span>
      </button>
      <div class="replay-info">
        可重听次数：{{ Math.max(0, maxReplays - replayCount) }} / {{ maxReplays }}
      </div>
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
import { ref, computed, watch, onMounted } from 'vue';
import { useAudioPlayer } from '../../composables/useAudioPlayer';

const props = defineProps<{
  question: any;
}>();

const emit = defineEmits<{
  (e: 'submit-answer', payload: { answer: string }): void;
}>();

const { isPlaying, replayCount, maxReplays, loadAudio, play, resetReplayCount } = useAudioPlayer();

const selectedOption = ref<string | null>(null);
const isLocked = ref(false);

const options = computed(() => {
  return props.question?.options || [];
});

// 当题目变化时，自动加载音频并重置状态
watch(() => props.question, (newQ) => {
  if (newQ && newQ.audioUrl) {
    loadAudio(newQ.audioUrl);
    resetReplayCount();
    isLocked.value = false;
    selectedOption.value = null;
  }
}, { immediate: true });

const handlePlay = () => {
  // 如果是第一次播放不算重放，之后的算重放
  const isReplay = replayCount.value > 0 || (replayCount.value === 0 && !isPlaying.value && document.readyState === 'complete'); // 简单逻辑，可根据实际需求调整
  play(isReplay);
};

const handleSelect = (key: string) => {
  if (isLocked.value) return;
  selectedOption.value = key;
  isLocked.value = true;
  
  emit('submit-answer', { answer: key });
};
</script>

<style scoped>
.listening-module {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.audio-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(212,168,67,0.2);
  border-radius: 12px;
}
.play-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: var(--gold);
  border: none;
  border-radius: 20px;
  color: #1a1a2e;
  font-weight: bold;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
}
.play-btn:disabled {
  background: rgba(212,168,67,0.3);
  color: rgba(255,255,255,0.5);
  cursor: not-allowed;
}
.play-btn:hover:not(:disabled) {
  transform: scale(1.05);
}
.replay-info {
  font-size: 12px;
  color: var(--parchment-dark);
}
.options-container {
  display: flex;
  flex-direction: column;
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
  text-align: left;
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
