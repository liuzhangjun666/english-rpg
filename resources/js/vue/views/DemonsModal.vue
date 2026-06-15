<template>
  <Teleport to="body">
    <transition name="fade">
      <div v-if="visible" class="cultivation-overlay" @click.self="closePanel">
        <div class="cultivation-container">
          <div class="cultivation-header">
            <span class="cultivation-title">🧘 心魔录</span>
            <button class="cultivation-close-btn" @click="closePanel">关闭</button>
          </div>

          <div class="cultivation-body">
            <!-- loading -->
            <div v-if="stage === 'idle'" class="cult-center-tip">探查心魔中...</div>

            <!-- list -->
            <template v-else-if="stage === 'list'">
              <div v-if="!demons.length" class="cult-empty-tip">
                当前没有未降服心魔。<br>各功能答错的题目会自动进入心魔录。
              </div>
              <template v-else>
                <div class="demons-intro">
                  这里是你的错题本。可在心魔录中作答消除，也可在后续修炼中答对后消除。
                </div>
                <div class="demons-list">
                  <div
                    v-for="(entry, idx) in demons"
                    :key="entry.demon?.id ?? idx"
                    class="demon-card"
                    :class="demonSeverityClass(entry.demon)"
                  >
                    <div class="demon-meta">
                      <span>#{{ idx + 1 }} · 错 {{ entry.demon.wrong_count }} · 对 {{ entry.demon.reviewed_count }}</span>
                      <span :class="masteryClass(entry.demon.mastery)">掌握度 {{ entry.demon.mastery }}%</span>
                    </div>
                    <div class="demon-question">{{ entry.question.question || entry.question.question_id }}</div>
                  </div>
                </div>
                <div class="cult-actions">
                  <el-button type="danger" plain size="small" @click="clearMastered">清理已掌握心魔</el-button>
                  <el-button @click="closePanel">返回</el-button>
                  <el-button type="primary" @click="startAnswering">开始降魔作答</el-button>
                </div>
              </template>

              <div v-if="!demons.length" class="cult-actions">
                <el-button @click="closePanel">返回</el-button>
              </div>
            </template>

            <!-- question -->
            <template v-else-if="stage === 'question' && currentEntry">
              <div class="review-progress-header">
                <span>心魔录作答 {{ currentIndex + 1 }}/{{ demons.length }}</span>
                <span>错 {{ currentEntry.demon.wrong_count }} · 掌握度 {{ currentEntry.demon.mastery }}%</span>
              </div>
              <div class="progress-track">
                <div class="progress-fill" :style="{ width: `${progressPercent}%` }"></div>
              </div>

              <div class="cult-question-text">{{ currentEntry.question.question }}</div>

              <div class="cult-options">
                <button
                  v-for="[key, text] in currentOptions"
                  :key="key"
                  class="cult-option-btn"
                  :class="getOptionClass(key)"
                  :disabled="feedbackShown"
                  @click="selectAnswer(key)"
                >
                  <span class="option-label">{{ key }}</span>
                  <span class="option-text">{{ text }}</span>
                </button>
              </div>

              <div class="cult-actions">
                <el-button @click="exitToList">退出</el-button>
                <el-button type="primary" :disabled="!feedbackShown" @click="nextQuestion">
                  {{ currentIndex < demons.length - 1 ? '下一题' : '提交结果' }}
                </el-button>
              </div>
            </template>

            <!-- result -->
            <template v-else-if="stage === 'result' && resultData">
              <div class="review-result">
                <div class="result-title">心魔作答结果</div>
                <div class="result-score">{{ resultData.correct_count }}/{{ resultData.total }}</div>
                <div class="result-accuracy">正确率 {{ resultData.accuracy }}%</div>
                <div class="result-tip">同一心魔累计答对 3 次即可消除。</div>
              </div>
              <div class="cult-actions">
                <el-button @click="closePanel">返回宗门</el-button>
                <el-button type="primary" @click="backToList">返回心魔录</el-button>
              </div>
            </template>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { useApiClient } from '../services/api';
import { useUiStore } from '../stores/ui';

type DemonEntry = {
  demon: { id?: number; wrong_count: number; reviewed_count: number; mastery: number };
  question: { question_id: string; question: string; options: unknown; correct_answer: string };
};

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{ (e: 'update:visible', value: boolean): void }>();

const api = useApiClient();
const ui = useUiStore();

const stage = ref<'idle' | 'list' | 'question' | 'result'>('idle');
const demons = ref<DemonEntry[]>([]);
const currentIndex = ref(0);
const selectedAnswer = ref('');
const answers = ref<Record<string, string>>({});
const feedbackShown = ref(false);
const resultData = ref<Record<string, any> | null>(null);

const currentEntry = computed(() => demons.value[currentIndex.value] ?? null);

const currentOptions = computed((): [string, string][] => {
  const opts = currentEntry.value?.question?.options;
  if (!opts) return [];
  if (Array.isArray(opts)) {
    const labels = ['A', 'B', 'C', 'D'];
    return opts.map((text: string, i: number) => [labels[i] ?? String(i + 1), text]);
  }
  if (typeof opts === 'object') {
    return Object.entries(opts as Record<string, string>);
  }
  return [];
});

const progressPercent = computed(() =>
  demons.value.length ? Math.round((currentIndex.value / demons.value.length) * 100) : 0
);

watch(() => props.visible, async (val) => {
  if (!val) return;
  stage.value = 'idle';
  demons.value = [];
  currentIndex.value = 0;
  selectedAnswer.value = '';
  answers.value = {};
  feedbackShown.value = false;
  resultData.value = null;
  await loadDemons();
});

async function loadDemons() {
  ui.showLoading('探查心魔中...');
  try {
    const res = await api.get('/demons');
    if (!res?.success) {
      ElMessage.error(res?.message || '心魔录加载失败');
      emit('update:visible', false);
      return;
    }
    const raw = Array.isArray(res.data?.demons) ? res.data.demons : [];
    demons.value = raw.filter(
      (item: any) => item?.question?.question_id && item?.question?.options
    );
    stage.value = 'list';
  } catch {
    ElMessage.error('心魔录加载失败');
    emit('update:visible', false);
  } finally {
    ui.hideLoading();
  }
}

function demonSeverityClass(demon: DemonEntry['demon']) {
  if (demon.wrong_count >= 5) return 'severity-high';
  if (demon.wrong_count >= 3) return 'severity-mid';
  return '';
}

function masteryClass(mastery: number) {
  if (mastery >= 80) return 'text-jade';
  if (mastery >= 40) return 'text-gold';
  return 'text-cinnabar';
}

function startAnswering() {
  currentIndex.value = 0;
  selectedAnswer.value = '';
  answers.value = {};
  feedbackShown.value = false;
  stage.value = 'question';
}

function selectAnswer(key: string) {
  if (feedbackShown.value) return;
  selectedAnswer.value = key;
  const qid = String(currentEntry.value?.question.question_id || '');
  if (qid) answers.value[qid] = key;
  feedbackShown.value = true;
}

function getOptionClass(key: string) {
  if (!feedbackShown.value) {
    return { selected: selectedAnswer.value === key };
  }
  const correct = String(currentEntry.value?.question.correct_answer || '').trim();
  if (key === correct) return { 'answer-correct': true };
  if (key === selectedAnswer.value) return { 'answer-wrong': true };
  return {};
}

async function nextQuestion() {
  if (currentIndex.value < demons.value.length - 1) {
    currentIndex.value += 1;
    selectedAnswer.value = '';
    feedbackShown.value = false;
  } else {
    await submitAnswers();
  }
}

async function submitAnswers() {
  const payload = Object.entries(answers.value).map(([question_id, answer]) => ({ question_id, answer }));
  if (!payload.length) {
    stage.value = 'list';
    return;
  }
  ui.showLoading('提交心魔作答中...');
  try {
    const res = await api.post('/demons/review-submit', { answers: payload });
    const data = res?.data || {};
    const correct = Number(data.correct_count || 0);
    const total = Number(data.total || payload.length);
    resultData.value = {
      correct_count: correct,
      total,
      accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
    };
    stage.value = 'result';
  } catch {
    ElMessage.error('提交失败，请重试');
  } finally {
    ui.hideLoading();
  }
}

async function clearMastered() {
  ui.showLoading('清理中...');
  try {
    await api.post('/demons/clear');
    await loadDemons();
  } catch {
    ElMessage.error('清理失败');
  } finally {
    ui.hideLoading();
  }
}

function exitToList() {
  stage.value = 'list';
  selectedAnswer.value = '';
  feedbackShown.value = false;
}

async function backToList() {
  await loadDemons();
}

function closePanel() {
  emit('update:visible', false);
}
</script>

<style scoped>
.cultivation-overlay {
  position: fixed;
  inset: 0;
  background: rgba(10, 10, 26, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(5px);
}
.cultivation-container {
  width: 90%;
  max-width: 520px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  background: #1a1a2e;
  border: 2px solid var(--gold, #d4a843);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}
.cultivation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(212, 168, 67, 0.3);
  flex-shrink: 0;
}
.cultivation-title { font-size: 18px; color: var(--gold, #d4a843); font-weight: 700; }
.cultivation-close-btn {
  background: transparent;
  border: 1px solid var(--gold, #d4a843);
  color: var(--gold, #d4a843);
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
}
.cultivation-body { flex: 1; overflow-y: auto; padding: 20px; }
.cult-center-tip, .cult-empty-tip {
  text-align: center;
  color: #c8b685;
  padding: 30px 0;
  line-height: 1.8;
}

.demons-intro {
  font-size: 12px;
  color: #c8b685;
  line-height: 1.7;
  margin-bottom: 12px;
}
.demons-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
.demon-card {
  padding: 10px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  border-left: 3px solid rgba(200, 182, 133, 0.4);
}
.demon-card.severity-mid { border-left-color: rgba(212, 168, 67, 0.7); }
.demon-card.severity-high { border-left-color: rgba(231, 76, 60, 0.7); }
.demon-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #c8b685;
  margin-bottom: 4px;
}
.demon-question { font-size: 13px; color: #f7f3e8; }

.review-progress-header {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #c8b685;
  margin-bottom: 6px;
}
.progress-track {
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
  margin-bottom: 14px;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #a29bfe, #6c5ce7);
  border-radius: 999px;
  transition: width 0.3s;
}

.cult-question-text {
  font-size: 15px;
  color: #f7f3e8;
  line-height: 1.7;
  margin-bottom: 16px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 8px;
  border-left: 3px solid rgba(162, 155, 254, 0.5);
}

.cult-options { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
.cult-option-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  cursor: pointer;
  color: #f7f3e8;
  text-align: left;
  transition: all 0.15s;
  width: 100%;
}
.cult-option-btn:hover:not(:disabled) {
  background: rgba(162, 155, 254, 0.1);
  border-color: rgba(162, 155, 254, 0.4);
}
.cult-option-btn.selected { background: rgba(162, 155, 254, 0.12); border-color: rgba(162, 155, 254, 0.7); }
.cult-option-btn.answer-correct { background: rgba(0, 184, 148, 0.15); border-color: rgba(0, 184, 148, 0.6); }
.cult-option-btn.answer-wrong { background: rgba(231, 76, 60, 0.12); border-color: rgba(231, 76, 60, 0.5); }
.cult-option-btn:disabled { cursor: not-allowed; }
.option-label {
  min-width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(162, 155, 254, 0.2);
  color: #a29bfe;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}
.option-text { font-size: 14px; }

.review-result { text-align: center; padding: 20px 0; }
.result-title { font-size: 18px; color: #d4a843; font-weight: 700; margin-bottom: 10px; }
.result-score { font-size: 36px; color: #d4a843; font-weight: 900; }
.result-accuracy { font-size: 14px; color: #c8b685; margin-top: 6px; }
.result-tip { font-size: 13px; color: #55efc4; margin-top: 10px; }

.cult-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 16px;
  flex-wrap: wrap;
}

.text-gold { color: #d4a843; font-weight: 600; }
.text-jade { color: #55efc4; font-weight: 600; }
.text-cinnabar { color: #e74c3c; font-weight: 600; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
