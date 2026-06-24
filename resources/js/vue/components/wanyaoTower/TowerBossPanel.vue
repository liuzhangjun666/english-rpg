<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useTowerStore } from '../../stores/towerStore';

const store = useTowerStore();
const boss = computed(() => store.currentRun?.boss_prompt);
const text = ref('');
const remaining = ref(boss.value?.time_limit ?? 60);
const submitted = ref(false);
let timer: ReturnType<typeof setInterval> | null = null;

const minChars = computed(() => boss.value?.min_chars ?? 30);
const canSubmit = computed(() => text.value.trim().length >= minChars.value);
const bloodPercent = computed(() => Math.max(0, (remaining.value / (boss.value?.time_limit ?? 60)) * 100));

onMounted(() => {
  timer = setInterval(() => {
    remaining.value -= 1;
    if (remaining.value <= 0) {
      remaining.value = 0;
      if (!submitted.value) submit(true);
    }
  }, 1000);
});
onUnmounted(() => { if (timer) clearInterval(timer); });

async function submit(timeout = false) {
  if (submitted.value) return;
  submitted.value = true;
  if (timer) clearInterval(timer);
  // 提交：字数不够 / 超时 → boss_text 留空，后端降级
  const bossText = !timeout && canSubmit.value ? text.value.trim() : null;
  await store.settle(bossText);
}
</script>

<template>
  <div v-if="boss" class="tower-boss">
    <div class="tower-boss__title">{{ boss.title }}</div>
    <div class="tower-boss__blood">
      <div class="tower-boss__blood-fill" :style="{ width: bloodPercent + '%' }"></div>
      <div class="tower-boss__blood-text">{{ remaining }}s</div>
    </div>
    <textarea
      v-model="text"
      class="tower-boss__input"
      :placeholder="`写至少 ${minChars} 字`"
      :disabled="submitted"
      rows="6"
    />
    <div class="tower-boss__footer">
      <span class="tower-boss__count">{{ text.length }} / {{ minChars }}+</span>
      <button class="tower-boss__btn" :disabled="!canSubmit || submitted" @click="submit(false)">
        提交破关
      </button>
    </div>
  </div>
</template>

<style scoped>
.tower-boss { padding: 24px; color: #f4e7c1; }
.tower-boss__title { font-size: 20px; margin-bottom: 12px; }
.tower-boss__blood {
  position: relative; height: 28px; background: rgba(60,0,0,0.5);
  border: 1px solid #c41e3a; border-radius: 4px; overflow: hidden; margin-bottom: 16px;
}
.tower-boss__blood-fill {
  position: absolute; inset: 0 auto 0 0; background: linear-gradient(90deg, #c41e3a, #ff6b6b);
  transition: width 1s linear;
}
.tower-boss__blood-text {
  position: absolute; inset: 0; display: grid; place-items: center;
  font-weight: bold; text-shadow: 0 1px 2px rgba(0,0,0,0.8);
}
.tower-boss__input {
  width: 100%; padding: 12px; background: rgba(0,0,0,0.3);
  border: 1px solid #4a4a6a; color: #f4e7c1; border-radius: 4px; font-size: 15px;
}
.tower-boss__footer { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; }
.tower-boss__btn {
  padding: 10px 24px; background: #c41e3a; color: #fff; border: none; border-radius: 4px;
  cursor: pointer; font-size: 16px;
}
.tower-boss__btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
