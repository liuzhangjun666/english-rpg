<template>
  <div class="ripple-bell-zone" :class="{ casting: isCasting }">
    <img v-if="pedestalImg" class="pedestal-img" :src="pedestalImg" alt="" aria-hidden="true" />

    <div class="ripples" aria-hidden="true">
      <span v-for="n in 4" :key="n" class="ripple" :style="{ animationDelay: `${n * 0.35}s` }"></span>
    </div>

    <button
      class="bell-core"
      type="button"
      :class="{ casting: isCasting, disabled: disabled }"
      :disabled="disabled"
      @mousedown="emit('press')"
      @mouseup="emit('release')"
      @mouseleave="emit('release')"
      @touchstart.prevent="emit('press')"
      @touchend.prevent="emit('release')"
    >
      <img class="bell-img" :src="bellImg" alt="" aria-hidden="true" />
      <span class="bell-hint">{{ isCasting ? '松手，等回声' : '按住传声' }}</span>
    </button>

    <div v-if="isCasting" class="cast-tag">声浪送出中…</div>
  </div>
</template>

<script setup lang="ts">
import { speakingAssets } from '../../data/speakingAssets';

withDefaults(
  defineProps<{
    bellImg?: string;
    pedestalImg?: string;
    isCasting?: boolean;
    disabled?: boolean;
  }>(),
  {
    bellImg: speakingAssets.spiritBell,
    pedestalImg: speakingAssets.bellPedestal,
  },
);

const emit = defineEmits<{
  press: [];
  release: [];
}>();
</script>

<style scoped>
.ripple-bell-zone {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0;
  min-height: 220px;
  justify-content: flex-end;
}

.pedestal-img {
  position: absolute;
  bottom: 28px;
  width: min(240px, 70vw);
  opacity: 0.9;
  pointer-events: none;
  z-index: 0;
}

.ripples {
  position: absolute;
  bottom: 80px;
  width: 200px;
  height: 200px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s;
}
.ripple-bell-zone.casting .ripples {
  opacity: 1;
}

.ripple {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid rgba(126, 232, 255, 0.5);
  animation: rippleOut 1.4s ease-out infinite;
}

.bell-core {
  position: relative;
  z-index: 2;
  width: 150px;
  height: 150px;
  border: 0;
  background: transparent;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  transition: transform 0.15s;
  user-select: none;
  margin-bottom: 36px;
}
.bell-core.casting {
  transform: scale(1.08);
  animation: bellHum 0.5s ease-in-out infinite alternate;
}
.bell-core.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.bell-img {
  width: 110px;
  height: 110px;
  object-fit: contain;
  filter: drop-shadow(0 4px 16px rgba(80, 180, 255, 0.55));
}
.bell-hint {
  font-size: 12px;
  font-weight: 700;
  color: #b8e8ff;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
}

.cast-tag {
  margin-top: 4px;
  font-size: 12px;
  color: #7ee8ff;
  letter-spacing: 0.08em;
}

@keyframes rippleOut {
  0% { transform: scale(0.5); opacity: 0.9; }
  100% { transform: scale(1.4); opacity: 0; }
}
@keyframes bellHum {
  from { filter: brightness(1); }
  to { filter: brightness(1.12); }
}
</style>
