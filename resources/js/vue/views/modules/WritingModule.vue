<template>
  <div class="writing-module">
    <div class="writing-header">
      <div class="title">{{ question.title }}</div>
      <div class="topic">{{ question.topic }}</div>
    </div>
    
    <div v-if="question.passage" class="passage-box">
      <div class="passage-label">📖 原文段落</div>
      <div class="passage-content">{{ question.passage }}</div>
    </div>

    <div class="editor-container">
      <textarea 
        v-model="content" 
        class="writing-textarea" 
        placeholder="在此输入你的英文写作..."
      ></textarea>
      <div class="word-count" :class="{ 'is-enough': wordCount >= minWords }">
        {{ wordCount }} 词 (至少 {{ minWords }} 词)
      </div>
    </div>

    <div class="actions">
      <button 
        class="btn btn-primary" 
        :disabled="wordCount < minWords"
        @click="handleSubmit"
      >
        炼符提交
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
  question: any;
}>();

const emit = defineEmits<{
  (e: 'submit-answer', payload: { content: string }): void;
}>();

const content = ref('');

const minWords = computed(() => {
  return props.question.word_limit_min || 50;
});

const wordCount = computed(() => {
  const text = content.value.trim();
  return text ? text.split(/\s+/).filter(w => w.length > 0).length : 0;
});

const handleSubmit = () => {
  if (wordCount.value < minWords.value) return;
  emit('submit-answer', { content: content.value });
};
</script>

<style scoped>
.writing-module {
  display: flex;
  flex-direction: column;
  gap: 15px;
}
.writing-header {
  padding: 14px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(212,168,67,0.2);
  border-radius: 10px;
}
.title {
  font-size: 15px;
  color: var(--gold-light);
  font-weight: bold;
  margin-bottom: 8px;
}
.topic {
  font-size: 13px;
  color: var(--parchment-dark);
  line-height: 1.7;
}
.passage-box {
  padding: 12px 14px;
  background: rgba(78,192,122,0.06);
  border: 1px dashed rgba(78,192,122,0.4);
  border-radius: 10px;
}
.passage-label {
  font-size: 12px;
  color: #9ee8bf;
  margin-bottom: 6px;
}
.passage-content {
  font-size: 13px;
  color: var(--parchment);
  line-height: 1.8;
  font-style: italic;
}
.editor-container {
  position: relative;
}
.writing-textarea {
  width: 100%;
  min-height: 160px;
  padding: 12px 12px 30px;
  background: rgba(0,0,0,0.3);
  border: 1px solid rgba(212,168,67,0.3);
  border-radius: 10px;
  color: var(--parchment);
  font-size: 14px;
  line-height: 1.7;
  resize: vertical;
  font-family: var(--font-body);
  outline: none;
  transition: border-color 0.2s;
}
.writing-textarea:focus {
  border-color: rgba(212,168,67,0.7);
}
.word-count {
  position: absolute;
  bottom: 10px;
  right: 12px;
  font-size: 11px;
  color: var(--parchment-dark);
  pointer-events: none;
}
.word-count.is-enough {
  color: var(--gold);
}
.actions {
  display: flex;
  justify-content: flex-end;
}
</style>
