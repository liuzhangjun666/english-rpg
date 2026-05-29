<template>
  <transition name="fade">
    <div v-if="visible" class="feedback-overlay" :class="type">
      <div class="feedback-content">
        <div class="icon">{{ type === 'success' ? '✨' : '❌' }}</div>
        <div class="message">{{ message }}</div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  visible: boolean;
  type: 'success' | 'error';
  message: string;
}>();
</script>

<style scoped>
.feedback-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 50;
}
.feedback-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  background: rgba(0, 0, 0, 0.8);
  padding: 20px 40px;
  border-radius: 16px;
  border: 2px solid;
}
.success .feedback-content {
  border-color: #7bed9f;
  color: #7bed9f;
  box-shadow: 0 0 20px rgba(123, 237, 159, 0.3);
}
.error .feedback-content {
  border-color: #ff6b6b;
  color: #ff6b6b;
  box-shadow: 0 0 20px rgba(255, 107, 107, 0.3);
}
.icon {
  font-size: 48px;
}
.message {
  font-size: 18px;
  font-weight: bold;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -40%);
}
</style>
