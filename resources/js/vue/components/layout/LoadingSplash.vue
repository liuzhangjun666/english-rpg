<template>
  <Transition name="splash-fade">
    <div v-if="visible" class="splash-root">
      <!-- 背景星空 + 雾气 -->
      <div class="splash-bg">
        <div class="splash-nebula"></div>
        <div class="splash-stars"></div>
      </div>

      <!-- 主视觉 -->
      <div class="splash-center">
        <div class="splash-logo">太虚仙门</div>
        <div class="splash-subtitle">{{ subtitle }}</div>

        <div class="splash-progress">
          <div class="splash-progress-track">
            <div
              class="splash-progress-fill"
              :style="{ width: `${Math.round(progress * 100)}%` }"
            ></div>
            <div class="splash-progress-shine"></div>
          </div>
          <div class="splash-progress-text">
            <span>{{ statusText }}</span>
            <span class="splash-progress-pct">{{ Math.round(progress * 100) }}%</span>
          </div>
        </div>

        <div class="splash-tip">{{ tipText }}</div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

const props = defineProps<{
  visible: boolean;
  progress: number; // 0-1
  done?: number;
  total?: number;
}>();

// 4 个修仙阶段文本，按进度阶梯切换，避免长时间停在同一句
const STAGES = [
  { at: 0,    label: '凝聚灵气...',  tip: '云海正缓缓散开' },
  { at: 0.25, label: '推演星图...',  tip: '七星方位正在归位' },
  { at: 0.55, label: '贯通灵脉...',  tip: '宗门殿宇逐一显形' },
  { at: 0.85, label: '即将入门...',  tip: '收束最后一缕仙气' },
];

const currentStage = computed(() => {
  const p = props.progress;
  let best = STAGES[0];
  for (const s of STAGES) {
    if (p >= s.at) best = s;
  }
  return best;
});

const subtitle = computed(() => '入门历劫，洗髓筑基');
const statusText = computed(() => {
  const stage = currentStage.value;
  if (typeof props.done === 'number' && typeof props.total === 'number' && props.total > 0) {
    return `${stage.label} (${props.done}/${props.total})`;
  }
  if (props.visible && props.progress > 0 && props.progress < 1) {
    return `${stage.label} (${Math.round(props.progress * 100)}%)`;
  }
  if (props.visible && (props.total ?? 0) === 0) {
    return '正在开启仙门...';
  }
  return stage.label;
});
const tipText = computed(() => currentStage.value.tip);

// 给一点点的进度"平滑"——避免数字跳变，看起来连贯
const smoothProgress = ref(0);
watch(
  () => props.progress,
  (v) => {
    // 立即跟随但 round 到 1% 步进，防止抖动
    smoothProgress.value = v;
  },
  { immediate: true },
);
</script>

<style scoped>
.splash-root {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: radial-gradient(ellipse at center, #0a1530 0%, #03060f 70%, #000 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  pointer-events: all;
}

.splash-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.splash-nebula {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 30% 40%, rgba(64, 110, 200, 0.25) 0%, transparent 45%),
    radial-gradient(circle at 70% 60%, rgba(212, 168, 67, 0.18) 0%, transparent 50%),
    radial-gradient(circle at 50% 90%, rgba(80, 180, 220, 0.16) 0%, transparent 55%);
  filter: blur(8px);
  animation: nebulaDrift 24s ease-in-out infinite alternate;
}

@keyframes nebulaDrift {
  0%   { transform: translate(0, 0) scale(1); }
  100% { transform: translate(2%, -1%) scale(1.06); }
}

.splash-stars {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(1.5px 1.5px at 12% 18%, rgba(255, 230, 180, 0.9), transparent),
    radial-gradient(1px 1px at 28% 60%, rgba(180, 220, 255, 0.7), transparent),
    radial-gradient(2px 2px at 55% 30%, rgba(255, 240, 200, 0.85), transparent),
    radial-gradient(1px 1px at 78% 75%, rgba(180, 220, 255, 0.6), transparent),
    radial-gradient(1.5px 1.5px at 90% 22%, rgba(255, 220, 170, 0.8), transparent),
    radial-gradient(1px 1px at 42% 88%, rgba(160, 200, 255, 0.5), transparent);
  animation: starsTwinkle 5s ease-in-out infinite alternate;
}

@keyframes starsTwinkle {
  0%   { opacity: 0.6; }
  100% { opacity: 1; }
}

.splash-center {
  position: relative;
  z-index: 1;
  text-align: center;
  width: min(560px, 88vw);
  padding: 20px;
}

.splash-logo {
  font-size: clamp(38px, 6vw, 64px);
  font-family: 'Ma Shan Zheng', 'STXingkai', 'KaiTi', serif;
  font-weight: 700;
  background: linear-gradient(180deg, #fff2c6 0%, #f3d481 40%, #c89134 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  letter-spacing: 0.18em;
  text-shadow: 0 0 24px rgba(255, 215, 130, 0.45);
  margin-bottom: 8px;
}

.splash-subtitle {
  font-size: clamp(13px, 1.4vw, 16px);
  color: rgba(244, 222, 175, 0.7);
  letter-spacing: 0.4em;
  padding-left: 0.4em; /* 视觉补偿字距 */
  margin-bottom: 48px;
}

.splash-progress {
  margin: 0 auto;
  width: 100%;
}

.splash-progress-track {
  position: relative;
  height: 10px;
  border-radius: 999px;
  background: rgba(20, 30, 60, 0.9);
  border: 1px solid rgba(212, 168, 67, 0.4);
  box-shadow:
    inset 0 1px 3px rgba(0, 0, 0, 0.6),
    0 0 14px rgba(255, 215, 130, 0.15);
  overflow: hidden;
}

.splash-progress-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: linear-gradient(90deg,
    #c8893a 0%,
    #f3d481 35%,
    #fff2c6 55%,
    #f3d481 75%,
    #c8893a 100%
  );
  background-size: 200% 100%;
  border-radius: 999px;
  box-shadow: 0 0 10px rgba(255, 215, 130, 0.7);
  transition: width 0.3s ease;
  animation: fillFlow 2.4s linear infinite;
}

@keyframes fillFlow {
  0%   { background-position: 0% 0; }
  100% { background-position: 200% 0; }
}

.splash-progress-shine {
  position: absolute;
  top: 0;
  bottom: 0;
  left: -40%;
  width: 30%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  animation: shineSweep 2.2s ease-in-out infinite;
  pointer-events: none;
}

@keyframes shineSweep {
  0%   { left: -40%; }
  100% { left: 120%; }
}

.splash-progress-text {
  display: flex;
  justify-content: space-between;
  margin-top: 14px;
  font-size: 13px;
  color: rgba(244, 222, 175, 0.85);
  letter-spacing: 0.08em;
}

.splash-progress-pct {
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  color: #f3d481;
  min-width: 3em;
  text-align: right;
}

.splash-tip {
  margin-top: 36px;
  font-size: 13px;
  color: rgba(190, 210, 240, 0.55);
  letter-spacing: 0.12em;
  font-style: italic;
}

/* 出场 / 退场 */
.splash-fade-enter-active,
.splash-fade-leave-active {
  transition: opacity 0.5s ease;
}
.splash-fade-enter-from,
.splash-fade-leave-to {
  opacity: 0;
}
</style>
