<template>
  <div class="echo-staff" :class="{ casting: isCasting, returned: isReturned }">
    <img class="staff-panel-bg" :src="panelBg" alt="" aria-hidden="true" />
    <div class="staff-inner">
      <div class="staff-rail">
        <div class="rail-line"></div>
        <div class="rail-line rail-line-mid"></div>
        <div class="rail-line rail-line-low"></div>
      </div>

      <div class="token-row">
        <span
          v-for="(token, idx) in staffTokens"
          :key="`${token.word}-${idx}`"
          class="staff-token"
          :class="{
            hit: token.hit,
            pulse: token.hit && isCasting,
            stamp: token.hit && isReturned,
          }"
          :style="{ animationDelay: `${idx * 0.06}s` }"
        >{{ token.word }}</span>
      </div>

      <div class="staff-sentence">{{ sentence }}</div>

      <div v-if="isCasting" class="wave-bars" aria-hidden="true">
        <span
          v-for="(h, i) in waveBars"
          :key="i"
          class="wave-bar"
          :style="{ height: `${Math.round(h * 100)}%` }"
        ></span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { speakingAssets } from '../../data/speakingAssets';
import type { StaffToken } from '../../utils/speakingEcho';

defineProps<{
  sentence: string;
  staffTokens: StaffToken[];
  waveBars: number[];
  isCasting?: boolean;
  isReturned?: boolean;
}>();

const panelBg = speakingAssets.staffPanel;
</script>

<style scoped>
.echo-staff {
  position: relative;
  width: 100%;
  overflow: hidden;
}
.echo-staff.casting .staff-panel-bg {
  filter: drop-shadow(0 0 20px rgba(80, 180, 255, 0.35));
}
.echo-staff.returned .staff-panel-bg {
  filter: drop-shadow(0 0 16px rgba(100, 220, 160, 0.3));
}

.staff-panel-bg {
  width: 100%;
  display: block;
  transition: filter 0.3s ease;
}

.staff-inner {
  position: absolute;
  inset: 12% 5% 10%;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.staff-rail {
  position: absolute;
  inset: 18px 8px auto;
  height: 48px;
  pointer-events: none;
  opacity: 0.6;
}
.rail-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background: rgba(126, 232, 255, 0.25);
}
.rail-line-mid { top: 22px; }
.rail-line-low { top: 44px; }

.token-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  min-height: 52px;
  align-items: center;
  position: relative;
  z-index: 1;
}

.staff-token {
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 700;
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
  color: rgba(180, 200, 230, 0.5);
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(100, 140, 200, 0.25);
  transition: all 0.2s ease;
}
.staff-token.hit {
  color: #e8f4ff;
  background: rgba(60, 140, 220, 0.35);
  border-color: rgba(126, 232, 255, 0.65);
  box-shadow: 0 0 12px rgba(80, 180, 255, 0.4);
  transform: translateY(-2px);
}
.staff-token.pulse {
  animation: tokenPulse 0.7s ease-in-out infinite;
}
.staff-token.stamp {
  border-color: rgba(158, 232, 191, 0.75);
  box-shadow: 0 0 14px rgba(100, 220, 160, 0.4);
}

.staff-sentence {
  margin-top: 12px;
  text-align: center;
  font-size: 12px;
  color: rgba(180, 210, 240, 0.5);
  font-style: italic;
  line-height: 1.5;
}

.wave-bars {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 4px;
  height: 32px;
  margin-top: 10px;
}
.wave-bar {
  width: 5px;
  min-height: 4px;
  border-radius: 3px;
  background: linear-gradient(180deg, #7ee8ff, #3a8fd4);
  animation: barDance 0.5s ease-in-out infinite alternate;
}
.wave-bar:nth-child(odd) { animation-duration: 0.35s; }
.wave-bar:nth-child(3n) { animation-duration: 0.55s; }

@keyframes tokenPulse {
  0%, 100% { transform: translateY(-2px) scale(1); }
  50% { transform: translateY(-4px) scale(1.04); }
}
@keyframes barDance {
  from { opacity: 0.55; }
  to { opacity: 1; }
}
</style>
