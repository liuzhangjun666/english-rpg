<template>
  <Teleport to="body">
    <transition name="fade">
      <div v-if="visible" class="cultivation-overlay" @click.self="closePanel">
        <div class="cultivation-container">
          <div class="cultivation-header">
            <span class="cultivation-title">🔄 温故复盘</span>
            <button class="cultivation-close-btn" @click="closePanel">关闭</button>
          </div>

          <div class="cultivation-body">
            <!-- idle / loading -->
            <div v-if="stage === 'idle'" class="cultivation-loading">
              <div class="cultivation-tip">提取错题灵脉中...</div>
            </div>

            <!-- intro -->
            <template v-else-if="stage === 'intro'">
              <div class="review-intro">
                <p class="review-intro-count">共 <strong>{{ questions.length }}</strong> 道待复习错题</p>
                <p class="review-intro-tip">💡 复习不消耗灵力</p>
                <p class="review-intro-sub">每道题答对后掌握度 +20</p>
              </div>
              <div class="cult-actions">
                <el-button type="primary" @click="startQuestions">开始复习</el-button>
                <el-button @click="closePanel">返回宗门</el-button>
              </div>
            </template>

            <!-- question -->
            <template v-else-if="stage === 'question' && currentQuestion">
              <div class="review-progress-bar">
                <div class="review-progress-header">
                  <span>错题复习 {{ currentIndex + 1 }}/{{ questions.length }}</span>
                  <span>已复习 {{ answeredCount }} 题</span>
                </div>
                <div class="progress-track">
                  <div class="progress-fill" :style="{ width: `${progressPercent}%` }"></div>
                </div>
              </div>

              <div class="cult-question-text">{{ currentQuestion.question }}</div>

              <div class="cult-options">
                <button
                  v-for="[key, text] in optionEntries"
                  :key="key"
                  class="cult-option-btn"
                  :class="{ selected: selectedAnswer === key }"
                  :disabled="!!selectedAnswer"
                  @click="selectAnswer(key)"
                >
                  <span class="option-label">{{ key }}</span>
                  <span class="option-text">{{ text }}</span>
                </button>
              </div>

              <div class="cult-actions">
                <el-button @click="closePanel">返回宗门</el-button>
                <el-button type="primary" :disabled="!selectedAnswer" @click="confirmAnswer">
                  {{ currentIndex < questions.length - 1 ? '下一题 →' : '完成复习' }}
                </el-button>
              </div>
            </template>

            <!-- feedback -->
            <template v-else-if="stage === 'feedback' && lastQuestion">
              <div class="review-feedback" :class="lastCorrect ? 'feedback-correct' : 'feedback-wrong'">
                <div class="feedback-icon">{{ lastCorrect ? '✅' : '❌' }}</div>
                <div class="feedback-verdict" :class="lastCorrect ? 'text-jade' : 'text-cinnabar'">
                  {{ lastCorrect ? '答对了！掌握度 +20' : '又错了，再记一次' }}
                </div>
                <div v-if="!lastCorrect" class="feedback-explanation">
                  <div class="explanation-label">正确答案：{{ lastQuestion.correct_answer }}</div>
                  <div v-if="lastQuestion.explanation" class="explanation-text">{{ lastQuestion.explanation }}</div>
                </div>
              </div>
              <div class="cult-actions">
                <el-button @click="closePanel">返回宗门</el-button>
                <el-button type="primary" @click="nextAfterFeedback">
                  {{ currentIndex < questions.length - 1 ? '继续下一题' : '查看复习成果' }}
                </el-button>
              </div>
            </template>

            <!-- result -->
            <template v-else-if="stage === 'result' && resultData">
              <div class="review-result">
                <div class="result-icon">{{ resultData.accuracy >= 60 ? '📘' : '🔁' }}</div>
                <div class="result-title">{{ resultData.accuracy >= 60 ? '复盘通关奖励' : '复盘结果' }}</div>
                <div class="result-rows">
                  <div class="result-row">
                    <span>正确题数</span>
                    <span class="text-gold">{{ resultData.correct_count }}/{{ questions.length }}</span>
                  </div>
                  <div class="result-row">
                    <span>正确率</span>
                    <span :class="resultData.accuracy >= 60 ? 'text-gold' : 'text-cinnabar'">{{ resultData.accuracy }}%</span>
                  </div>
                  <div class="result-row">
                    <span>净化心魔</span>
                    <span class="text-jade">+{{ resultData.correct_count }}</span>
                  </div>
                  <div class="result-row">
                    <span>获得修为</span>
                    <span class="text-gold">+{{ resultData.exp_gained ?? 0 }}</span>
                  </div>
                  <div class="result-row">
                    <span>获得灵石</span>
                    <span class="text-gold">+{{ resultData.stones_gained ?? 0 }}</span>
                  </div>
                </div>
                <div class="result-verdict">
                  {{ resultData.accuracy >= 80 ? '善！错题已基本掌握。' : resultData.accuracy >= 50 ? '尚可，仍有部分错题需巩固。' : '错题较多，建议多复习几次。' }}
                </div>
              </div>
              <div class="cult-actions">
                <el-button @click="closePanel">返回宗门</el-button>
                <el-button type="primary" @click="restart">再来一轮</el-button>
              </div>
            </template>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { useApiClient } from '../services/api';
import { useUserStore } from '../stores/user';
import { useUiStore } from '../stores/ui';

type ReviewStage = 'idle' | 'intro' | 'question' | 'feedback' | 'result';

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{ (e: 'update:visible', value: boolean): void }>();

const api = useApiClient();
const user = useUserStore();
const ui = useUiStore();

const stage = ref<ReviewStage>('idle');
const questions = ref<Array<Record<string, any>>>([]);
const currentIndex = ref(0);
const selectedAnswer = ref('');
const answers = reactive<Record<string, string>>({});
const lastQuestion = ref<Record<string, any> | null>(null);
const lastCorrect = ref(false);
const resultData = ref<Record<string, any> | null>(null);

const currentQuestion = computed(() => questions.value[currentIndex.value] ?? null);
const optionEntries = computed(() => {
  const opts = currentQuestion.value?.options;
  if (!opts || typeof opts !== 'object') return [];
  if (Array.isArray(opts)) {
    const labels = ['A', 'B', 'C', 'D'];
    return opts.map((text: string, i: number) => [labels[i] ?? String(i + 1), text] as [string, string]);
  }
  return Object.entries(opts) as [string, string][];
});
const answeredCount = computed(() => Object.keys(answers).length);
const progressPercent = computed(() =>
  questions.value.length ? Math.round((answeredCount.value / questions.value.length) * 100) : 0
);

function sessionKey() {
  return `levelup_vue_review_session_${user.profile?.id || 'guest'}`;
}

function saveSession() {
  if (!questions.value.length) return;
  localStorage.setItem(sessionKey(), JSON.stringify({
    questions: questions.value,
    answers: { ...answers },
    currentIndex: currentIndex.value,
    stage: stage.value,
  }));
}

function loadSession(): Record<string, any> | null {
  try {
    const raw = localStorage.getItem(sessionKey());
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!Array.isArray(data.questions) || !data.questions.length) return null;
    return data;
  } catch { return null; }
}

function clearSession() {
  localStorage.removeItem(sessionKey());
}

function resetState() {
  stage.value = 'idle';
  questions.value = [];
  currentIndex.value = 0;
  selectedAnswer.value = '';
  Object.keys(answers).forEach((k) => delete answers[k]);
  lastQuestion.value = null;
  lastCorrect.value = false;
  resultData.value = null;
}

watch(() => props.visible, async (val) => {
  if (!val) return;
  resetState();
  const saved = loadSession();
  if (saved) {
    questions.value = saved.questions;
    Object.entries(saved.answers || {}).forEach(([k, v]) => { answers[k] = String(v); });
    currentIndex.value = Math.max(0, Math.min(Number(saved.currentIndex || 0), questions.value.length - 1));
    selectedAnswer.value = String(answers[questions.value[currentIndex.value]?.question_id || ''] || '');
    stage.value = 'question';
    ElMessage.info('已恢复上次复盘进度');
    return;
  }
  await loadReviewList();
});

async function loadReviewList() {
  stage.value = 'idle';
  ui.showLoading('提取错题灵脉...');
  try {
    const res = await api.get('/review/list');
    if (!res?.success || !res?.data?.total) {
      ElMessage.info('暂无错题。修炼之路一帆风顺，善。');
      emit('update:visible', false);
      return;
    }
    questions.value = res.data.questions || [];
    currentIndex.value = 0;
    Object.keys(answers).forEach((k) => delete answers[k]);
    selectedAnswer.value = '';
    stage.value = 'intro';
  } catch {
    ElMessage.error('温故复盘加载失败');
    emit('update:visible', false);
  } finally {
    ui.hideLoading();
  }
}

function startQuestions() {
  stage.value = 'question';
  selectedAnswer.value = '';
  saveSession();
}

function selectAnswer(key: string) {
  if (selectedAnswer.value) return;
  selectedAnswer.value = key;
  const qid = String(currentQuestion.value?.question_id || '');
  if (qid) answers[qid] = key;
  saveSession();
}

function confirmAnswer() {
  if (!selectedAnswer.value || !currentQuestion.value) return;
  lastQuestion.value = currentQuestion.value;
  lastCorrect.value = selectedAnswer.value === String(currentQuestion.value.correct_answer || '').trim().toUpperCase()
    || selectedAnswer.value === String(currentQuestion.value.correct_answer || '').trim();
  stage.value = 'feedback';
}

async function nextAfterFeedback() {
  if (currentIndex.value >= questions.value.length - 1) {
    await submitReview();
    return;
  }
  currentIndex.value += 1;
  selectedAnswer.value = String(answers[questions.value[currentIndex.value]?.question_id || ''] || '');
  stage.value = 'question';
  saveSession();
}

async function submitReview() {
  const payload = Object.entries(answers).map(([question_id, answer]) => ({ question_id, answer }));
  ui.showLoading('汇总灵脉数据...');
  try {
    const res = await api.post('/review/submit', { answers: payload });
    clearSession();
    const data = res?.data || {};
    const correct = Number(data.correct_count ?? 0);
    const total = questions.value.length;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    resultData.value = {
      correct_count: correct,
      accuracy,
      exp_gained: Number(data.exp_gained ?? data.reward?.exp_gained ?? 0),
      stones_gained: Number(data.stones_gained ?? data.spirit_stone_gained ?? data.reward?.stones_gained ?? 0),
    };
    if (resultData.value.exp_gained) {
      user.updateProfile({ exp: Number(user.profile?.exp ?? 0) + resultData.value.exp_gained });
    }
    if (resultData.value.stones_gained) {
      user.updateProfile({ spirit_stone: Number(user.profile?.spirit_stone ?? 0) + resultData.value.stones_gained });
    }
    stage.value = 'result';
  } catch {
    ElMessage.error('提交失败，请重试');
  } finally {
    ui.hideLoading();
  }
}

async function restart() {
  resetState();
  await loadReviewList();
}

function closePanel() {
  clearSession();
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
.cultivation-title {
  font-size: 18px;
  color: var(--gold, #d4a843);
  font-weight: 700;
}
.cultivation-close-btn {
  background: transparent;
  border: 1px solid var(--gold, #d4a843);
  color: var(--gold, #d4a843);
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
}
.cultivation-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}
.cultivation-loading,
.cultivation-tip {
  text-align: center;
  color: #c8b685;
  padding: 40px 0;
}

.review-intro {
  text-align: center;
  padding: 16px 0;
  line-height: 1.9;
}
.review-intro-count { font-size: 16px; color: #f7f3e8; }
.review-intro-tip { color: #55efc4; margin-top: 8px; }
.review-intro-sub { font-size: 13px; color: #c8b685; margin-top: 4px; }

.review-progress-bar { margin-bottom: 16px; }
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
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #55efc4, #00b894);
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
  border-left: 3px solid rgba(212, 168, 67, 0.5);
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
  background: rgba(212, 168, 67, 0.1);
  border-color: rgba(212, 168, 67, 0.4);
}
.cult-option-btn.selected {
  background: rgba(212, 168, 67, 0.12);
  border-color: rgba(212, 168, 67, 0.7);
}
.cult-option-btn:disabled { cursor: not-allowed; opacity: 0.7; }
.option-label {
  min-width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(212, 168, 67, 0.2);
  color: #d4a843;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}
.option-text { font-size: 14px; }

.review-feedback {
  text-align: center;
  padding: 20px 0;
  border-radius: 10px;
  margin-bottom: 16px;
}
.feedback-icon { font-size: 40px; margin-bottom: 10px; }
.feedback-verdict { font-size: 17px; font-weight: 700; margin-bottom: 12px; }
.feedback-explanation {
  margin-top: 12px;
  padding: 12px;
  background: rgba(192, 57, 43, 0.08);
  border-radius: 8px;
  text-align: left;
}
.explanation-label { font-size: 13px; color: #d4a843; margin-bottom: 4px; }
.explanation-text { font-size: 13px; color: #c8b685; }

.review-result { text-align: center; padding-bottom: 12px; }
.result-icon { font-size: 40px; margin-bottom: 8px; }
.result-title { font-size: 18px; color: #d4a843; font-weight: 700; margin-bottom: 14px; }
.result-rows { text-align: left; margin-bottom: 14px; }
.result-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 14px;
  color: #c8b685;
}
.result-verdict { font-size: 13px; color: #c8b685; margin-top: 10px; }

.cult-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 16px;
}

.text-gold { color: #d4a843; font-weight: 700; }
.text-jade { color: #55efc4; font-weight: 700; }
.text-cinnabar { color: #e74c3c; font-weight: 700; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
