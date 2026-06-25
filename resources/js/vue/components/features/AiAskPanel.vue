<template>
  <Teleport to="body">
    <transition name="fade">
      <div v-if="visible" class="cultivation-overlay" @click.self="close">
        <div class="cultivation-container">
          <div class="cultivation-header">
            <span class="cultivation-title">🔮 AI问道 · 通灵玉简</span>
            <button class="cultivation-close-btn" @click="close">关闭</button>
          </div>
          <div class="cultivation-body" v-loading="loading">
            <div class="hermes-bubble">
              <div class="hermes-text">{{ answer || '道友有何疑惑？输入问题或点击下方常见问题。' }}</div>
              <div v-if="answerSource" class="source-tag">{{ answerSource === 'ai' ? '天机推演' : '修行指南' }}</div>
            </div>
            <div class="ask-row">
              <input
                v-model="questionInput"
                class="ask-input"
                maxlength="300"
                placeholder="输入你的修炼疑惑..."
                @keyup.enter="submitQuestion"
              >
              <button class="ask-submit" :disabled="loading" @click="submitQuestion">问道</button>
            </div>
            <div class="quick-list">
              <button v-for="q in quickQuestions" :key="q.key" class="quick-btn" :disabled="loading" @click="askQuick(q)">{{ q.label }}</button>
            </div>
            <div v-if="weakTags.length" class="weak-block">
              <div class="block-title">薄弱执念</div>
              <span v-for="tag in weakTags" :key="tag" class="tag">{{ tag }}</span>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useApiClient } from '../../services/api';

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{ (e: 'update:visible', value: boolean): void }>();

const api = useApiClient();
const loading = ref(false);
const answer = ref('');
const answerSource = ref('');
const questionInput = ref('');
const weakTags = ref<string[]>([]);

const quickQuestions = [
  { key: 'start', label: '今日如何修炼？', question: '今日如何修炼？' },
  { key: 'spirit', label: '灵力不够怎么办？', question: '灵力不够怎么办？' },
  { key: 'realm', label: '如何突破境界？', question: '如何突破境界？' },
  { key: 'demon', label: '心魔如何应对？', question: '心魔如何应对？' },
];

watch(() => props.visible, async (val) => {
  if (!val) return;
  loading.value = true;
  answer.value = '';
  answerSource.value = '';
  questionInput.value = '';
  try {
    const res = await api.post('/ai-ask', {});
    if (res?.success) {
      answer.value = res.data?.answer || '';
      answerSource.value = res.data?.source || 'guide';
      weakTags.value = res.data?.context?.weak_tags || [];
    }
  } catch { /* ignore */ } finally {
    loading.value = false;
  }
});

async function fetchAnswer(question?: string) {
  loading.value = true;
  try {
    const res = await api.post('/ai-ask', question ? { question } : {});
    if (res?.success) {
      answer.value = res.data?.answer || '';
      answerSource.value = res.data?.source || 'guide';
      if (res.data?.context?.weak_tags) {
        weakTags.value = res.data.context.weak_tags;
      }
    }
  } catch {
    answer.value = '天机混沌，请稍后再试。';
    answerSource.value = '';
  } finally {
    loading.value = false;
  }
}

function askQuick(q: { question: string }) {
  questionInput.value = q.question;
  fetchAnswer(q.question);
}

function submitQuestion() {
  const q = questionInput.value.trim();
  if (!q) return;
  fetchAnswer(q);
}

function close() {
  emit('update:visible', false);
}
</script>

<style scoped>
.cultivation-overlay { position: fixed; inset: 0; z-index: 2200; background: rgba(10,10,26,0.85); display: flex; align-items: center; justify-content: center; }
.cultivation-container { width: min(480px, 92vw); background: #1a1a2e; border: 2px solid #d4a843; border-radius: 12px; }
.cultivation-header { display: flex; justify-content: space-between; padding: 16px; border-bottom: 1px solid rgba(212,168,67,0.3); }
.cultivation-title { color: #d4a843; font-weight: 700; }
.cultivation-close-btn { background: transparent; border: 1px solid #d4a843; color: #d4a843; padding: 4px 12px; border-radius: 4px; cursor: pointer; }
.cultivation-body { padding: 20px; color: #c8b685; }
.hermes-bubble { padding: 16px; border-radius: 12px; background: rgba(255,255,255,0.04); margin-bottom: 12px; min-height: 80px; line-height: 1.7; }
.source-tag { margin-top: 8px; font-size: 11px; color: #8a8a9a; }
.ask-row { display: flex; gap: 8px; margin-bottom: 12px; }
.ask-input { flex: 1; background: rgba(0,0,0,0.3); border: 1px solid rgba(212,168,67,0.3); border-radius: 8px; padding: 8px 12px; color: #f7f3e8; font-size: 13px; }
.ask-submit { border: 1px solid #d4a843; background: rgba(212,168,67,0.15); color: #d4a843; padding: 8px 14px; border-radius: 8px; cursor: pointer; white-space: nowrap; }
.ask-submit:disabled { opacity: 0.5; cursor: not-allowed; }
.quick-list { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.quick-btn { border: 1px solid rgba(212,168,67,0.4); background: rgba(212,168,67,0.08); color: #d4a843; padding: 8px 12px; border-radius: 20px; cursor: pointer; font-size: 12px; }
.quick-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.weak-block .block-title { color: #d4a843; margin-bottom: 8px; }
.tag { display: inline-block; margin: 0 6px 6px 0; padding: 4px 10px; border-radius: 12px; background: rgba(192,57,43,0.15); color: #f0a080; font-size: 12px; }
</style>
