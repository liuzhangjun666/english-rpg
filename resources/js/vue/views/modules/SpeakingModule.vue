<template>
  <div class="speaking-module">
    <div class="question-display">
      <div class="title">请朗读以下句子：</div>
      <div class="sentence">{{ question.content }}</div>
    </div>

    <div class="recorder-container">
      <button 
        class="record-btn" 
        :class="{ 'is-recording': isRecording }"
        @mousedown="handleStartRecord" 
        @mouseup="handleStopRecord"
        @mouseleave="handleStopRecord"
        @touchstart.prevent="handleStartRecord"
        @touchend.prevent="handleStopRecord"
      >
        {{ isRecording ? '松开提交' : '按住录音' }}
      </button>
      <div v-if="error" class="error-text">{{ error }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useVoiceRecorder } from '../../composables/useVoiceRecorder';

const props = defineProps<{
  question: any;
}>();

const emit = defineEmits<{
  (e: 'submit-answer', payload: { audioBlob: Blob }): void;
}>();

const { isRecording, error, start, stop } = useVoiceRecorder();

const handleStartRecord = async () => {
  if (isRecording.value) return;
  await start();
};

const handleStopRecord = async () => {
  if (!isRecording.value) return;
  const audioBlob = await stop();
  if (audioBlob) {
    emit('submit-answer', { audioBlob });
  }
};
</script>

<style scoped>
.speaking-module {
  display: flex;
  flex-direction: column;
  gap: 30px;
  align-items: center;
  padding: 20px 0;
}
.question-display {
  text-align: center;
}
.title {
  font-size: 14px;
  color: var(--parchment-dark);
  margin-bottom: 10px;
}
.sentence {
  font-size: 24px;
  color: var(--gold);
  line-height: 1.5;
  font-family: var(--font-title);
}
.recorder-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.record-btn {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: rgba(26, 26, 46, 0.8);
  border: 2px solid var(--gold);
  color: var(--gold-light);
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
}
.record-btn:active {
  transform: scale(0.95);
}
.record-btn.is-recording {
  background: rgba(255, 107, 107, 0.15);
  border-color: #ff6b6b;
  color: #ff6b6b;
  animation: pulse 1.5s infinite;
}
.error-text {
  color: #ff6b6b;
  font-size: 12px;
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(255, 107, 107, 0.4); }
  70% { box-shadow: 0 0 0 15px rgba(255, 107, 107, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 107, 107, 0); }
}
</style>
