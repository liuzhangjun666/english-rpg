<script setup lang="ts">
import { computed, ref } from 'vue';
import { useTowerStore } from '../../stores/towerStore';
import TowerMCQQuestion from './TowerMCQQuestion.vue';

const store = useTowerStore();
const feedback = ref<'correct' | 'wrong' | null>(null);
const submitting = ref(false);

const currentQ = computed(() => store.currentRun?.questions?.[store.answerIndex] ?? null);
const total = computed(() => store.currentRun?.questions.length ?? 0);

async function onSubmit(answer: string) {
  if (!currentQ.value || submitting.value) return;
  submitting.value = true;
  try {
    const correct = await store.submitAnswer(currentQ.value.id, answer);
    feedback.value = correct ? 'correct' : 'wrong';
    await new Promise(r => setTimeout(r, 1200));
    feedback.value = null;
    store.advanceAfterAnswer();
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="tower-runner">
    <TowerMCQQuestion
      v-if="currentQ"
      :key="currentQ.id"
      :question="currentQ"
      :index="store.answerIndex"
      :total="total"
      :disabled="submitting"
      @submit="onSubmit"
    />
    <div v-else class="tower-runner__empty">题目加载失败，请返回大厅重新开始</div>
    <transition name="fade">
      <div v-if="feedback" class="tower-runner__feedback" :class="`is-${feedback}`">
        {{ feedback === 'correct' ? '✓ 答对了' : '✗ 答错' }}
      </div>
    </transition>
  </div>
</template>

<style scoped>
.tower-runner { position: relative; min-height: 40vh; }
.tower-runner__empty {
  display: grid; place-items: center; min-height: 40vh;
  color: #f4e7c1; font-size: 16px;
}
.tower-runner__feedback {
  position: absolute; inset: 0; display: grid; place-items: center;
  font-size: 48px; font-weight: bold; pointer-events: none;
}
.is-correct { color: #6dd17c; text-shadow: 0 0 16px #6dd17c; }
.is-wrong   { color: #d34c4c; text-shadow: 0 0 16px #d34c4c; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
