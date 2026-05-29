<template>
  <div v-if="visible" class="level-select-overlay">
    <div class="panel dialog-panel">
      <div class="panel-title">准备修炼</div>
      
      <div class="info-section">
        <div class="module-info">模块：{{ moduleName }} · {{ levelId }}</div>
        <div class="question-count">题数：{{ totalQuestions }}题</div>
        <div class="spirit-cost">消耗灵力：<span class="cost-val">💧 {{ spiritCost }}</span></div>
        <div class="current-spirit">当前灵力：💧 {{ currentSpirit }}</div>
      </div>
      
      <div v-if="currentSpirit < spiritCost" class="error-tip">
        灵力不足，请稍后等待恢复。
      </div>

      <div class="actions">
        <button 
          class="btn btn-primary" 
          :disabled="currentSpirit < spiritCost || isLoading"
          @click="handleConfirm"
        >
          {{ isLoading ? '注入灵力中...' : '开始修炼' }}
        </button>
        <button 
          class="btn btn-secondary" 
          :disabled="isLoading"
          @click="handleCancel"
        >
          返回
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  visible: boolean;
  moduleName: string;
  levelId: string;
  totalQuestions: number;
  spiritCost: number;
  currentSpirit: number;
}>();

const emit = defineEmits<{
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();

const isLoading = ref(false);

const handleConfirm = () => {
  isLoading.value = true;
  emit('confirm');
  // 假定外部会在请求完成后重置状态或关闭弹窗
};

const handleCancel = () => {
  emit('cancel');
};
</script>

<style scoped>
.level-select-overlay {
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.dialog-panel {
  max-width: 380px;
  background: var(--panel-bg, #1a1a2e);
  padding: 20px;
  border-radius: 12px;
  border: 1px solid var(--gold);
}
.panel-title {
  text-align: center;
  font-size: 18px;
  color: var(--gold);
  margin-bottom: 15px;
}
.info-section {
  text-align: center;
  color: var(--parchment-dark);
  font-size: 14px;
  line-height: 2;
  margin: 12px 0;
}
.cost-val {
  color: var(--spirit-blue, #8cc5ff);
  font-weight: bold;
}
.current-spirit {
  margin-top: 8px;
  font-size: 12px;
}
.error-tip {
  color: #ff6b6b;
  font-size: 12px;
  text-align: center;
  margin-bottom: 10px;
}
.actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
