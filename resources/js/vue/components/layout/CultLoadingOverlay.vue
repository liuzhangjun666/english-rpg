<template>
  <Teleport to="body">
    <Transition name="cult-loading-fade">
      <div
        v-if="visible"
        class="cult-loading-overlay"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div class="cult-loading-panel">
          <div class="cult-loading-spinner" aria-hidden="true">
            <div class="cult-loading-ring"></div>
            <img class="cult-loading-tai" :src="loadingTai" alt="">
          </div>
          <p class="cult-loading-text">{{ text }}</p>
          <div class="cult-loading-bar" aria-hidden="true">
            <span
              class="cult-loading-bar-fill"
              :class="{ 'is-determinate': progress != null }"
              :style="progress != null ? { width: `${Math.round(progress * 100)}%` } : undefined"
            ></span>
          </div>
          <p v-if="progress != null" class="cult-loading-pct">{{ Math.round(progress * 100) }}%</p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import loadingTai from '../../../../assets/images/clean/loading_tai_clean.svg';

defineProps<{
  visible: boolean;
  text?: string;
  progress?: number | null;
}>();
</script>

<style scoped>
.cult-loading-overlay {
  position: fixed;
  inset: 0;
  z-index: 10050;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(4, 8, 18, 0.78);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  pointer-events: all;
}

.cult-loading-panel {
  width: min(320px, 92vw);
  padding: 28px 24px 22px;
  border-radius: 16px;
  border: 1px solid rgba(212, 168, 67, 0.42);
  background:
    radial-gradient(ellipse at 50% 0%, rgba(212, 168, 67, 0.12), transparent 58%),
    linear-gradient(165deg, rgba(14, 20, 40, 0.96) 0%, rgba(8, 12, 26, 0.98) 100%);
  box-shadow:
    0 20px 48px rgba(0, 0, 0, 0.55),
    inset 0 1px 0 rgba(255, 236, 184, 0.1),
    0 0 32px rgba(212, 168, 67, 0.08);
  text-align: center;
}

.cult-loading-spinner {
  position: relative;
  width: 76px;
  height: 76px;
  margin: 0 auto 18px;
}

.cult-loading-tai {
  width: 100%;
  height: 100%;
  object-fit: contain;
  animation: cult-tai-spin 2.8s linear infinite;
  filter: drop-shadow(0 0 10px rgba(244, 217, 138, 0.35));
}

.cult-loading-ring {
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  border: 1px dashed rgba(212, 168, 67, 0.45);
  animation: cult-ring-spin 8s linear infinite reverse;
}

.cult-loading-text {
  margin: 0;
  color: #f4d98a;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.12em;
  font-family: 'STKaiti', 'KaiTi', 'Microsoft YaHei', sans-serif;
  text-shadow: 0 0 12px rgba(244, 217, 138, 0.25);
}

.cult-loading-bar {
  margin-top: 16px;
  height: 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
}

.cult-loading-bar-fill {
  display: block;
  width: 36%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #8b6914, #f4d98a, #8b6914);
  animation: cult-bar-slide 1.4s ease-in-out infinite;
}

.cult-loading-bar-fill.is-determinate {
  width: 0;
  animation: none;
  transition: width 0.25s ease;
}

.cult-loading-pct {
  margin: 10px 0 0;
  font-size: 12px;
  color: rgba(244, 217, 138, 0.75);
  letter-spacing: 0.08em;
  font-family: 'Inter', sans-serif;
}

@keyframes cult-tai-spin {
  to { transform: rotate(360deg); }
}

@keyframes cult-ring-spin {
  to { transform: rotate(360deg); }
}

@keyframes cult-bar-slide {
  0% { transform: translateX(-120%); }
  100% { transform: translateX(320%); }
}

.cult-loading-fade-enter-active,
.cult-loading-fade-leave-active {
  transition: opacity 0.28s ease;
}

.cult-loading-fade-enter-from,
.cult-loading-fade-leave-to {
  opacity: 0;
}
</style>
