<template>
  <div class="forge-board" :class="`grade-${talismanGrade}`">
    <div class="forge-scroll">
      <img class="forge-scroll-img" :src="talismanImg" alt="" aria-hidden="true" />
      <div class="scroll-ink" :style="{ height: `${inkPercent}%` }"></div>
      <div class="scroll-glow" :style="{ opacity: glowOpacity }"></div>
      <div class="scroll-title">{{ title || '无字天书' }}</div>
    </div>

    <div class="rune-ring">
      <div
        v-for="(rune, idx) in runeNodes"
        :key="rune.key"
        class="rune-node"
        :class="{ lit: rune.passed, pulse: rune.passed && talismanGrade === 'perfect' }"
        :style="runePosition(idx, runeNodes.length)"
        :title="rune.label"
      >
        <span class="rune-glyph">{{ rune.glyph }}</span>
        <span class="rune-label">{{ rune.label }}</span>
      </div>
      <div class="rune-core">
        <span class="rune-core-icon">{{ coreIcon }}</span>
        <span class="rune-core-text">{{ runesLit }}/{{ runesTotal }}</span>
      </div>
    </div>

    <div v-if="forgeHeat > 0" class="forge-heat">
      <span class="forge-heat-label">炼符火候</span>
      <div class="forge-heat-track">
        <div class="forge-heat-fill" :style="{ width: `${forgeHeat}%` }"></div>
      </div>
      <span v-if="inkStreak >= 8" class="forge-streak">连墨 ×{{ Math.min(inkStreak, 99) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { writingAssets } from '../../data/writingAssets';

const talismanImg = writingAssets.talismanPaper;

const props = defineProps<{
  title?: string;
  inkPercent: number;
  runeNodes: Array<{ key: string; label: string; glyph: string; passed: boolean }>;
  runesLit: number;
  runesTotal: number;
  talismanGrade: string;
  forgeHeat: number;
  inkStreak: number;
}>();

const coreIcon = computed(() => {
  if (props.talismanGrade === 'perfect') return '✦';
  if (props.talismanGrade === 'forming') return '◈';
  if (props.talismanGrade === 'sketch') return '◇';
  return '○';
});

const glowOpacity = computed(() => {
  if (props.talismanGrade === 'perfect') return 0.85;
  if (props.talismanGrade === 'forming') return 0.45;
  return 0.15 + props.inkPercent / 400;
});

function runePosition(index: number, total: number) {
  const angle = (index / Math.max(1, total)) * 360 - 90;
  const rad = (angle * Math.PI) / 180;
  const radius = 54;
  const x = 50 + Math.cos(rad) * (radius / 1.4);
  const y = 50 + Math.sin(rad) * (radius / 1.6);
  return { left: `${x}%`, top: `${y}%` };
}
</script>

<style scoped>
.forge-board {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 8px 0 4px;
}

.forge-scroll {
  position: relative;
  width: 100%;
  max-width: 200px;
  margin: 0 auto;
}

.forge-scroll-img {
  width: 100%;
  display: block;
  filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.4));
}

.scroll-title {
  position: absolute;
  top: 12%;
  left: 14%;
  right: 14%;
  font-size: 10px;
  color: rgba(58, 35, 15, 0.65);
  text-align: center;
  line-height: 1.35;
  z-index: 3;
  pointer-events: none;
}

.scroll-ink {
  position: absolute;
  bottom: 8%;
  left: 12%;
  right: 12%;
  background: linear-gradient(180deg, transparent, rgba(74, 50, 0, 0.2) 20%, rgba(74, 50, 0, 0.55));
  transition: height 0.35s ease;
  z-index: 1;
  border-radius: 0 0 8px 8px;
}

.scroll-glow {
  position: absolute;
  inset: 8% 10%;
  background: radial-gradient(ellipse at 50% 80%, rgba(255, 215, 0, 0.35), transparent 70%);
  transition: opacity 0.4s ease;
  pointer-events: none;
  z-index: 2;
  border-radius: 8px;
}

.grade-perfect .scroll-body {
  box-shadow: inset 0 0 20px rgba(255, 215, 0, 0.25);
}

.grade-forming .scroll-ink {
  background: linear-gradient(180deg, transparent, rgba(74, 50, 0, 0.2) 20%, rgba(120, 80, 20, 0.5));
}

.rune-ring {
  position: relative;
  width: 160px;
  height: 120px;
  margin-top: -8px;
}

.rune-node {
  position: absolute;
  transform: translate(-50%, -50%);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid rgba(212, 168, 67, 0.35);
  background: rgba(10, 5, 0, 0.75);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  opacity: 0.55;
}

.rune-node.lit {
  opacity: 1;
  border-color: #ffd700;
  background: rgba(255, 215, 0, 0.15);
  box-shadow: 0 0 12px rgba(255, 215, 0, 0.45);
}

.rune-node.pulse {
  animation: runePulse 1.6s ease-in-out infinite;
}

@keyframes runePulse {
  0%, 100% { box-shadow: 0 0 8px rgba(255, 215, 0, 0.4); }
  50% { box-shadow: 0 0 18px rgba(255, 215, 0, 0.85); }
}

.rune-glyph {
  font-size: 12px;
  font-weight: 800;
  color: #c9b896;
  line-height: 1;
}

.rune-node.lit .rune-glyph {
  color: #ffd700;
}

.rune-label {
  font-size: 8px;
  color: rgba(201, 184, 150, 0.8);
  margin-top: 1px;
}

.rune-node.lit .rune-label {
  color: #f4d98a;
}

.rune-core {
  position: absolute;
  left: 50%;
  top: 58%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.rune-core-icon {
  display: block;
  font-size: 18px;
  color: #d4a843;
  text-shadow: 0 0 8px rgba(255, 215, 0, 0.5);
}

.rune-core-text {
  font-size: 10px;
  color: #c9b896;
}

.forge-heat {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  max-width: 280px;
  font-size: 10px;
}

.forge-heat-label {
  color: #c9b896;
  white-space: nowrap;
}

.forge-heat-track {
  flex: 1;
  height: 6px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(212, 168, 67, 0.25);
  overflow: hidden;
}

.forge-heat-fill {
  height: 100%;
  background: linear-gradient(90deg, #8b4513, #ff6b35, #ffd700);
  border-radius: 999px;
  transition: width 0.25s ease;
  box-shadow: 0 0 8px rgba(255, 107, 53, 0.5);
}

.forge-streak {
  color: #ff9e6d;
  font-weight: 700;
  white-space: nowrap;
  animation: streakBlink 0.8s ease infinite alternate;
}

@keyframes streakBlink {
  from { opacity: 0.7; }
  to { opacity: 1; }
}
</style>
