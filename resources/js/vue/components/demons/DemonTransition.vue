<template>
  <Teleport to="body">
    <div v-if="visible" class="demon-transition-overlay">
      <div class="transition-bg" :class="stageClass"></div>
      
      <div class="transition-content">
        <h2 class="transition-text main-text" v-if="stage >= 1">{{ mainText }}</h2>
        <h3 class="transition-text sub-text" v-if="stage >= 2">{{ subText }}</h3>
        
        <div class="flash-overlay" v-if="stage === 3"></div>
        <h1 class="scare-text" v-if="stage === 3">魔念突袭！</h1>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void;
  (e: 'enter-encounter'): void;
}>();

const stage = ref(0);
const stageClass = ref('');
const mainText = ref('识海震荡...');
const subText = ref('尘封魔念被惊醒...');

watch(() => props.visible, (val) => {
  if (val) {
    startSequence();
  } else {
    stage.value = 0;
    stageClass.value = '';
  }
});

function startSequence() {
  // 阶段 1: 识海震荡 (300ms)
  stage.value = 1;
  stageClass.value = 'stage-1';
  
  setTimeout(() => {
    // 阶段 2: 尘封魔念 (500ms)
    stage.value = 2;
    stageClass.value = 'stage-2';
    
    setTimeout(() => {
      // 阶段 3: 屏幕闪红，突袭 (300ms)
      stage.value = 3;
      stageClass.value = 'stage-3';
      
      setTimeout(() => {
        emit('enter-encounter');
        emit('update:visible', false);
      }, 400);
      
    }, 600);
  }, 400);
}
</script>

<style scoped>
.demon-transition-overlay {
  position: fixed;
  inset: 0;
  z-index: 9990; /* 略低于 DemonEncounter */
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Ma Shan Zheng', 'STXingkai', 'KaiTi', serif;
  pointer-events: none;
}

.transition-bg {
  position: absolute;
  inset: 0;
  background: #000;
  opacity: 0;
  transition: all 0.3s ease;
}

.transition-bg.stage-1 { opacity: 0.6; }
.transition-bg.stage-2 { opacity: 0.85; background: radial-gradient(circle, #000 60%, #450a0a 100%); }
.transition-bg.stage-3 { opacity: 1; background: #450a0a; }

.transition-content {
  position: relative;
  z-index: 10;
  text-align: center;
  width: 100%;
}

.transition-text {
  color: #fca5a5;
  text-shadow: 0 0 10px rgba(220, 38, 38, 0.5);
  animation: text-fade-in 0.3s ease-out;
  margin-bottom: 20px;
}

.main-text { font-size: 32px; letter-spacing: 4px; }
.sub-text { font-size: 24px; color: #f87171; }

.scare-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(1.5);
  font-size: 80px;
  color: #fff;
  text-shadow: 0 0 30px #ef4444, 0 0 50px #b91c1c;
  animation: scare-pop 0.1s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
  z-index: 20;
  white-space: nowrap;
}

.flash-overlay {
  position: absolute;
  inset: -200%;
  background: #ef4444;
  mix-blend-mode: overlay;
  animation: flash 0.3s ease-out forwards;
}

@keyframes text-fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes scare-pop {
  from { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
  to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}

@keyframes flash {
  0% { opacity: 1; }
  100% { opacity: 0; }
}
</style>
