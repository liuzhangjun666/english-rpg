<template>
  <div class="grammar-module">
    <div class="question-header">
      <div class="question-title">排列以下碎片的顺序组成正确的句子：</div>
      <div class="cn-hint" v-if="question.cn_meaning">{{ question.cn_meaning }}</div>
    </div>

    <!-- 已排序的区域 -->
    <div class="ordered-slots">
      <div 
        v-for="(slot, idx) in orderedItems" 
        :key="'slot-'+idx"
        class="slot-item"
        @click="removeItem(idx)"
      >
        {{ slot }}
      </div>
      <div v-if="orderedItems.length === 0" class="slot-placeholder">点击下方碎片填入</div>
    </div>

    <!-- 待选碎片区域 -->
    <div class="fragments-pool">
      <div 
        v-for="(frag, idx) in availableFragments" 
        :key="'frag-'+idx"
        class="fragment-item"
        :class="{ 'is-used': frag.used }"
        @click="selectItem(idx)"
      >
        {{ frag.text }}
      </div>
    </div>

    <div class="actions">
      <button 
        class="btn btn-secondary" 
        @click="resetOrder"
      >
        重置
      </button>
      <button 
        class="btn btn-primary" 
        :disabled="orderedItems.length !== fragments.length"
        @click="handleSubmit"
      >
        确认阵法
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

const props = defineProps<{
  question: any;
}>();

const emit = defineEmits<{
  (e: 'submit-answer', payload: { answer: string[] }): void;
}>();

const fragments = ref<string[]>([]);
const availableFragments = ref<{text: string, used: boolean}[]>([]);
const orderedItems = ref<string[]>([]);

// 初始化题目数据
watch(() => props.question, (newQ) => {
  if (newQ && newQ.fragments) {
    fragments.value = newQ.fragments;
    availableFragments.value = newQ.fragments.map((f: string) => ({ text: f, used: false }));
    orderedItems.value = [];
  }
}, { immediate: true });

const selectItem = (index: number) => {
  const frag = availableFragments.value[index];
  if (frag && !frag.used) {
    frag.used = true;
    orderedItems.value.push(frag.text);
  }
};

const removeItem = (index: number) => {
  const item = orderedItems.value[index];
  orderedItems.value.splice(index, 1);
  
  // 在可用列表中找回第一个匹配且被使用过的元素，标记为未使用
  const found = availableFragments.value.find(f => f.text === item && f.used);
  if (found) {
    found.used = false;
  }
};

const resetOrder = () => {
  orderedItems.value = [];
  availableFragments.value.forEach(f => f.used = false);
};

const handleSubmit = () => {
  if (orderedItems.value.length === fragments.value.length) {
    emit('submit-answer', { answer: [...orderedItems.value] });
  }
};
</script>

<style scoped>
.grammar-module {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.question-header {
  margin-bottom: 10px;
}
.question-title {
  color: var(--gold-light);
  font-size: 15px;
  font-weight: bold;
}
.cn-hint {
  color: var(--parchment-dark);
  font-size: 13px;
  margin-top: 4px;
}
.ordered-slots {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 16px;
  min-height: 80px;
  background: rgba(0,0,0,0.3);
  border: 1px dashed rgba(212,168,67,0.4);
  border-radius: 8px;
  align-items: center;
}
.slot-placeholder {
  color: rgba(255,255,255,0.3);
  font-size: 13px;
  width: 100%;
  text-align: center;
}
.slot-item {
  padding: 8px 12px;
  background: var(--gold);
  color: #1a1a2e;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  user-select: none;
  animation: popIn 0.2s ease-out;
}
.fragments-pool {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 16px;
  background: rgba(255,255,255,0.02);
  border-radius: 8px;
}
.fragment-item {
  padding: 8px 12px;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.2);
  color: var(--parchment);
  border-radius: 4px;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s;
}
.fragment-item:hover:not(.is-used) {
  background: rgba(212,168,67,0.2);
  border-color: var(--gold);
}
.fragment-item.is-used {
  opacity: 0.3;
  cursor: not-allowed;
  transform: scale(0.95);
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 10px;
}
@keyframes popIn {
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
</style>
