<template>
  <div v-if="visible" class="guest-banner" role="status">
    <div class="guest-banner__copy">
      <span class="guest-banner__badge">神游太虚</span>
      <span class="guest-banner__text">游客体验中 · 进度保存在本设备，注册后可永久保留修行成果</span>
    </div>
    <button type="button" class="guest-banner__cta" @click="emit('register')">立即注册</button>
    <button type="button" class="guest-banner__close" title="关闭提示" @click="dismiss">✕</button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

const props = defineProps<{ show: boolean }>();
const emit = defineEmits<{ register: [] }>();

const dismissed = ref(false);

const visible = computed(() => props.show && !dismissed.value);

function dismiss() {
  dismissed.value = true;
}
</script>

<style scoped>
.guest-banner {
  position: fixed;
  top: calc(var(--hud-offset-top, var(--top-hud-height, 76px)) + 6px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 10040;
  display: flex;
  align-items: center;
  gap: 12px;
  width: min(920px, calc(100vw - 24px));
  padding: 10px 14px;
  border-radius: 14px;
  border: 1px solid rgba(212, 168, 67, 0.45);
  background: linear-gradient(135deg, rgba(8, 18, 40, 0.94), rgba(18, 36, 72, 0.92));
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(8px);
}

.guest-banner__copy {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.guest-banner__badge {
  flex-shrink: 0;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(212, 168, 67, 0.18);
  border: 1px solid rgba(212, 168, 67, 0.45);
  color: #ffd700;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.guest-banner__text {
  color: #d7e7ff;
  font-size: 13px;
  line-height: 1.4;
}

.guest-banner__cta {
  flex-shrink: 0;
  padding: 8px 14px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #ffe6a0, #cf9a34);
  color: #3a2606;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.guest-banner__close {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: #9fc4e6;
  cursor: pointer;
}

@media (max-width: 768px) {
  .guest-banner {
    flex-wrap: wrap;
    top: calc(var(--hud-offset-top, var(--top-hud-height, 76px)) + 4px);
    padding: 10px 12px;
  }

  .guest-banner__copy {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .guest-banner__cta {
    width: 100%;
  }
}
</style>
