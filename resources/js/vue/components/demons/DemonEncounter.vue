<template>
  <Teleport to="body">
    <transition name="demon-fade">
      <div v-if="demonStore.isEncounterActive" class="demon-overlay" :class="'theme-' + demonStore.encounterTheme">
        
        <!-- 阶段1: 入场动画 -->
        <div v-if="internalStage === 'intro'" class="demon-intro-container">
          <div class="blood-vignette"></div>
          <div class="intro-content">
            <h1 class="encounter-title demon-serif">{{ demonStore.encounterTitle }}</h1>
            <p class="encounter-desc demon-serif">{{ demonStore.encounterSubtitle }}</p>
            <button class="rpg-btn-slay demon-serif" @click="startBattle">拔剑迎战</button>
          </div>
        </div>

        <!-- 阶段2: 战斗中 -->
        <div v-else-if="internalStage === 'battle'" class="demon-battle-container">
          <div class="blood-vignette pulse"></div>
          
          <div class="battle-header">
            <div class="battle-progress demon-serif">
              心魔残影: {{ currentIndex + 1 }} / {{ demonQueue.length }}
            </div>
            <div class="demon-stats" v-if="currentDemonMeta">
              <span class="stat-badge severity" v-if="currentDemonMeta.wrong_count">魔念层数: {{ currentDemonMeta.wrong_count }}</span>
              <span class="stat-badge mastery" v-if="currentDemonMeta.mastery !== undefined">封印进度: {{ currentDemonMeta.mastery }}%</span>
            </div>
          </div>

          <div class="battle-arena" v-if="currentQuestion">
            <div class="question-box">
              {{ currentQuestionText }}
            </div>

            <div class="options-grid">
              <button 
                v-for="[key, text] in currentOptions" 
                :key="key"
                class="slash-btn"
                :class="getOptionClass(key)"
                :disabled="feedbackShown"
                @click="slashAnswer(key)"
              >
                <span class="slash-key">{{ key }}</span>
                <span class="slash-text">{{ text }}</span>
                <!-- 斩击特效层 -->
                <div class="slash-fx"></div>
              </button>
            </div>
          </div>

          <div class="battle-footer">
            <transition name="slide-up">
              <button v-if="feedbackShown" class="rpg-btn-next demon-serif" @click="nextDemon">
                {{ currentIndex < demonQueue.length - 1 ? '追击下一道残影' : '万剑归宗 (封印)' }}
              </button>
            </transition>
          </div>
        </div>

        <!-- 阶段3: 结算 -->
        <div v-else-if="internalStage === 'result'" class="demon-result-container">
          <div class="result-box" :class="resultData?.passed ? 'success' : 'fail'">
            <h2 class="result-title demon-serif">{{ resultData?.passed ? '心魔溃散' : '魔气缠身' }}</h2>
            <div class="result-stats">
              <p>斩灭残影: <span class="highlight">{{ resultData?.correct_count }} / {{ resultData?.total }}</span></p>
              <p>封印完美度: <span class="highlight">{{ resultData?.accuracy }}%</span></p>
            </div>
            <p class="result-tip demon-serif">同一心魔累计斩杀3次且进度达80%方可彻底超度。</p>
            <button class="rpg-btn-exit demon-serif" @click="exitEncounter">收剑回气</button>
          </div>
        </div>

      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue';
import { useDemonStore } from '../../stores/demon';
import { useApiClient } from '../../services/api';
import { useUiStore } from '../../stores/ui';
import { ElMessage } from 'element-plus';

const demonStore = useDemonStore();
const api = useApiClient();
const ui = useUiStore();

const internalStage = ref<'intro' | 'battle' | 'result'>('intro');
const currentIndex = ref(0);
const selectedAnswer = ref('');
const feedbackShown = ref(false);
const answers = ref<Record<string, string>>({});
const resultData = ref<any>(null);

const demonQueue = computed(() => demonStore.encounterQueue || []);
const currentItem = computed(() => demonQueue.value[currentIndex.value] || null);

function resolveEncounterQuestion(item: any): Record<string, any> | null {
  if (!item || typeof item !== 'object') return null;

  const nested = item.question;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    return nested;
  }

  if (item.question_id || item.options || item.prompt_id) {
    return item;
  }

  return null;
}

// 兼容：{ demon, question: {...} }、练功注入的扁平题、pre-exam 扁平题
const currentQuestion = computed(() => resolveEncounterQuestion(currentItem.value));

const currentQuestionText = computed(() => {
  const q = currentQuestion.value;
  if (!q) return '';
  return String(q.question || q.stem || q.prompt || q.topic || q.word || '请选择正确答案');
});

const currentDemonMeta = computed(() => {
  if (!currentItem.value) return null;
  if (currentItem.value.demon) return currentItem.value.demon;
  const q = currentQuestion.value;
  return {
    wrong_count: currentItem.value._demon_wrong_count ?? q?._demon_wrong_count ?? 1,
    mastery: currentItem.value._demon_mastery ?? q?._demon_mastery,
  };
});

const currentOptions = computed((): [string, string][] => {
  const opts = currentQuestion.value?.options;
  if (!opts) return [];
  if (Array.isArray(opts)) {
    const labels = ['A', 'B', 'C', 'D'];
    return opts.map((entry: unknown, i: number) => {
      if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
        const row = entry as Record<string, unknown>;
        const key = String(row.key ?? labels[i] ?? String(i + 1));
        const text = String(row.text ?? row.label ?? row.value ?? '');
        return [key, text] as [string, string];
      }
      return [labels[i] ?? String(i + 1), String(entry ?? '')] as [string, string];
    });
  }
  if (typeof opts === 'object') {
    return Object.entries(opts as Record<string, string>);
  }
  return [];
});

watch(() => demonStore.isEncounterActive, (isActive) => {
  if (isActive) {
    internalStage.value = 'intro';
    currentIndex.value = 0;
    answers.value = {};
    selectedAnswer.value = '';
    resultData.value = null;
  }
});

const startTime = ref(0);

onBeforeUnmount(() => {
  if (demonStore.isEncounterActive) {
    demonStore.finishEncounter({ passed: false, total: 0, correct_count: 0 });
  }
});

function startBattle() {
  startTime.value = Date.now();
  internalStage.value = 'battle';
}

function slashAnswer(key: string) {
  if (feedbackShown.value) return;
  selectedAnswer.value = key;
  const qid = String(currentQuestion.value?.question_id || '');
  if (qid) answers.value[qid] = key;
  feedbackShown.value = true;
}

function getOptionClass(key: string) {
  if (!feedbackShown.value) {
    return { selected: selectedAnswer.value === key };
  }
  const correct = String(currentQuestion.value?.correct_answer || '').trim();
  const isCorrect = key.toLowerCase() === correct.toLowerCase();
  
  if (isCorrect) return { 'slashed-correct': true };
  if (key === selectedAnswer.value) return { 'slashed-wrong': true };
  return { 'dimmed': true };
}

async function nextDemon() {
  if (currentIndex.value < demonQueue.length - 1) {
    currentIndex.value++;
    selectedAnswer.value = '';
    feedbackShown.value = false;
  } else {
    await submitEncounter();
  }
}

async function submitEncounter() {
  const payload = Object.entries(answers.value).map(([question_id, answer]) => ({ question_id, answer }));
  if (!payload.length) {
    demonStore.finishEncounter({ total: 0 });
    return;
  }
  
  ui.showLoading('万剑归宗，判定中...');
  try {
    const timeSpent = Math.floor((Date.now() - startTime.value) / 1000);
    // 增加 encounter_type, theme, time_spent 的提交
    let reqType = demonStore.encounterType;
    if (demonStore.encounterTheme === 'boss') reqType = 'boss';
    
    const res = await api.post('/demons/review-submit', { 
      answers: payload,
      encounter_type: reqType,
      time_spent: timeSpent
    });
    const data = res?.data || {};
    const correct = Number(data.correct_count || 0);
    const total = Number(data.total || payload.length);
    resultData.value = {
      correct_count: correct,
      total,
      accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
      passed: correct === total
    };
    internalStage.value = 'result';
  } catch {
    ElMessage.error('封印仪式受干扰，请重试');
  } finally {
    ui.hideLoading();
  }
}

function exitEncounter() {
  demonStore.finishEncounter(resultData.value);
}
</script>

<style scoped>
.demon-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: #000;
  display: flex;
  justify-content: center;
  align-items: center;
  font-family: system-ui, -apple-system, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  color: #fff;
  overflow: hidden;
}

.demon-serif {
  font-family: 'Ma Shan Zheng', 'STXingkai', 'KaiTi', serif;
}

.blood-vignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(circle at center, transparent 40%, rgba(153, 27, 27, 0.4) 80%, rgba(69, 10, 10, 0.9) 100%);
  z-index: 1;
}

.blood-vignette.pulse {
  animation: heart-pulse 3s infinite ease-in-out;
}

@keyframes heart-pulse {
  0%, 100% { opacity: 0.8; }
  50% { opacity: 1; transform: scale(1.02); }
}

/* 阶段1：入场 */
.demon-intro-container {
  position: relative;
  z-index: 10;
  text-align: center;
  max-width: 600px;
  padding: 40px;
}

.encounter-title {
  font-size: 48px;
  margin-bottom: 24px;
  font-weight: bold;
  letter-spacing: 4px;
  text-shadow: 0 0 20px rgba(220, 38, 38, 0.8);
  animation: drop-in 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.theme-thunder .encounter-title { color: #c084fc; text-shadow: 0 0 30px rgba(147, 51, 234, 0.8); }
.theme-boss .encounter-title { color: #facc15; text-shadow: 0 0 30px rgba(234, 179, 8, 0.8); }
.theme-red .encounter-title { color: #f87171; }
.theme-void .encounter-title { color: #9ca3af; text-shadow: 0 0 20px rgba(255, 255, 255, 0.5); }

/* 主题颜色覆写 */
.theme-thunder .blood-vignette {
  background: radial-gradient(circle at center, transparent 40%, rgba(76, 29, 149, 0.4) 80%, rgba(46, 16, 101, 0.9) 100%);
}
.theme-boss .blood-vignette {
  background: radial-gradient(circle at center, transparent 40%, rgba(120, 53, 15, 0.4) 80%, rgba(69, 26, 3, 0.9) 100%);
}
.theme-thunder .question-box { border-left-color: #8b5cf6; box-shadow: 0 10px 40px rgba(139, 92, 246, 0.2); }
.theme-boss .question-box { border-left-color: #ea580c; box-shadow: 0 10px 40px rgba(234, 88, 12, 0.2); }

.encounter-desc {
  font-size: 18px;
  color: #d1d5db;
  line-height: 1.8;
  margin-bottom: 40px;
  opacity: 0;
  animation: fade-in 1s forwards 0.5s;
}

.rpg-btn-slay {
  background: rgba(153, 27, 27, 0.2);
  border: 1px solid #ef4444;
  color: #fca5a5;
  padding: 16px 48px;
  font-size: 24px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.3s;
  opacity: 0;
  animation: fade-in 1s forwards 1s;
}
.rpg-btn-slay:hover {
  background: rgba(220, 38, 38, 0.4);
  box-shadow: 0 0 30px rgba(220, 38, 38, 0.6);
  transform: scale(1.05);
  color: #fff;
}

/* 阶段2：战区 */
.demon-battle-container {
  position: relative;
  z-index: 10;
  width: 90%;
  max-width: 800px;
  height: 80%;
  display: flex;
  flex-direction: column;
}

.battle-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 0;
  border-bottom: 1px solid rgba(220, 38, 38, 0.3);
  margin-bottom: 30px;
}

.battle-progress {
  font-size: 20px;
  color: #fca5a5;
}

.demon-stats {
  display: flex;
  gap: 12px;
}

.stat-badge {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 14px;
  font-family: monospace;
}
.stat-badge.severity { background: rgba(153, 27, 27, 0.4); border: 1px solid #ef4444; color: #fecaca; }
.stat-badge.mastery { background: rgba(21, 128, 61, 0.3); border: 1px solid #22c55e; color: #bbf7d0; }

.battle-arena {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.question-box {
  background: rgba(0, 0, 0, 0.5);
  border-left: 4px solid #ef4444;
  padding: 24px;
  font-family: system-ui, -apple-system, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 24px;
  font-weight: 600;
  line-height: 1.65;
  letter-spacing: 0.02em;
  color: #f9fafb;
  border-radius: 4px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8);
}

.options-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.slash-btn {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(31, 41, 55, 0.6);
  border: 1px solid #374151;
  padding: 16px 24px;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  overflow: hidden;
  transition: all 0.2s;
  color: #e5e7eb;
}

.slash-btn:hover:not(:disabled) {
  background: rgba(153, 27, 27, 0.2);
  border-color: #ef4444;
}

.slash-key {
  width: 32px;
  height: 32px;
  background: rgba(0,0,0,0.5);
  border: 1px solid #4b5563;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-family: Arial, sans-serif;
  font-weight: bold;
  color: #9ca3af;
}

.slash-text {
  font-family: system-ui, -apple-system, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 20px;
  font-weight: 500;
  line-height: 1.5;
  letter-spacing: 0.01em;
  flex: 1;
  position: relative;
  z-index: 2;
}

/* 斩击反馈效果 */
.slash-btn.slashed-correct {
  background: rgba(6, 78, 59, 0.4);
  border-color: #10b981;
  box-shadow: 0 0 20px rgba(16, 185, 129, 0.3);
}
.slash-btn.slashed-correct .slash-key { color: #34d399; border-color: #10b981; }
.slash-btn.slashed-correct .slash-fx {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.5), transparent);
  transform: skewX(-45deg) translateX(-150%);
  animation: slash-animation 0.4s ease-out forwards;
}

.slash-btn.slashed-wrong {
  background: rgba(127, 29, 29, 0.6);
  border-color: #ef4444;
  animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
}
.slash-btn.slashed-wrong .slash-key { color: #fca5a5; border-color: #ef4444; }
.slash-btn.slashed-wrong .slash-fx {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(239, 68, 68, 0.8), transparent);
  transform: skewX(45deg) translateX(-150%);
  animation: slash-animation 0.4s ease-out forwards;
}

.slash-btn.dimmed { opacity: 0.4; }

.battle-footer {
  height: 80px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.rpg-btn-next {
  background: transparent;
  border: 1px solid #d4a843;
  color: #fceea7;
  padding: 12px 32px;
  font-size: 20px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.3s;
}
.rpg-btn-next:hover {
  background: rgba(212, 168, 67, 0.2);
  box-shadow: 0 0 20px rgba(212, 168, 67, 0.4);
}

/* 阶段3：结算 */
.demon-result-container {
  position: relative;
  z-index: 10;
  text-align: center;
}

.result-box {
  background: rgba(15, 23, 42, 0.9);
  border: 2px solid #334155;
  padding: 50px;
  border-radius: 8px;
  box-shadow: 0 20px 50px rgba(0,0,0,0.8);
}
.result-box.success { border-color: #10b981; box-shadow: 0 20px 50px rgba(16, 185, 129, 0.2); }
.result-box.fail { border-color: #ef4444; box-shadow: 0 20px 50px rgba(239, 68, 68, 0.2); }

.result-title {
  font-size: 40px;
  margin-bottom: 30px;
  font-weight: bold;
}
.result-box.success .result-title { color: #34d399; }
.result-box.fail .result-title { color: #f87171; }

.result-stats {
  font-size: 24px;
  color: #e5e7eb;
  line-height: 2;
  margin-bottom: 20px;
}
.result-stats .highlight { color: #facc15; font-weight: bold; font-family: monospace; }

.result-tip {
  font-size: 16px;
  color: #9ca3af;
  margin-bottom: 40px;
}

.rpg-btn-exit {
  background: rgba(255,255,255,0.05);
  border: 1px solid #6b7280;
  color: #d1d5db;
  padding: 12px 40px;
  font-size: 20px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.3s;
}
.rpg-btn-exit:hover {
  background: rgba(255,255,255,0.1);
  border-color: #9ca3af;
  color: #fff;
}

/* 动画系统 */
.demon-fade-enter-active, .demon-fade-leave-active { transition: opacity 0.5s ease; }
.demon-fade-enter-from, .demon-fade-leave-to { opacity: 0; }

.slide-up-enter-active, .slide-up-leave-active { transition: all 0.3s ease; }
.slide-up-enter-from, .slide-up-leave-to { opacity: 0; transform: translateY(20px); }

@keyframes drop-in {
  0% { opacity: 0; transform: translateY(-50px) scale(1.2); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes fade-in {
  to { opacity: 1; }
}

@keyframes slash-animation {
  0% { transform: skewX(-45deg) translateX(-150%); opacity: 1; }
  100% { transform: skewX(-45deg) translateX(250%); opacity: 0; }
}

@keyframes shake {
  10%, 90% { transform: translate3d(-1px, 0, 0); }
  20%, 80% { transform: translate3d(2px, 0, 0); }
  30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
  40%, 60% { transform: translate3d(4px, 0, 0); }
}
</style>
