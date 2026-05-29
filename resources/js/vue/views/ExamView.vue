<template>
  <Teleport to="body">
    <transition name="fade">
      <div v-if="visible" class="profile-overlay cultivation-theme" @click.self="handleOverlayClick">
        <!-- 容器根据状态变化大小 -->
        <div class="profile-container" :style="{ maxWidth: containerWidth }">
          
          <!-- 标题栏 -->
          <div class="profile-header">
            <div class="card-header" style="font-size: 20px; text-align: center; width: 100%; color: var(--cinnabar, #e74c3c);" v-if="step.includes('demon')">
              🧘 渡劫前·心魔强化
            </div>
            <div class="card-header" style="font-size: 20px; text-align: center; width: 100%;" v-else-if="step === 'exam_info'">
              ⚡ 突破台
            </div>
            <div class="card-header" style="font-size: 20px; text-align: center; width: 100%; color: var(--cinnabar, #e74c3c);" v-else-if="step === 'exam_question'">
              ⚡ 渡劫中 ({{ currentExamIndex + 1 }}/{{ examQuestions.length }})
            </div>
            <div class="card-header" style="font-size: 20px; text-align: center; width: 100%;" v-else-if="step === 'exam_result'">
              {{ examPassed ? '✨ 渡劫成功' : '🔁 渡劫未过' }}
            </div>
            
            <button v-if="['exam_info', 'exam_result'].includes(step)" class="profile-close-btn" @click="closePanel">返回</button>
          </div>

          <!-- 内容区：根据步骤渲染 -->
          <div class="profile-body" style="flex-direction: column; padding: 20px; position: relative;" v-loading="loading" element-loading-background="rgba(10, 10, 26, 0.8)">
            
            <!-- 1. 心魔拦截介绍 -->
            <div v-if="step === 'demon_review_intro'" class="exam-section">
              <div style="text-align:center;padding:12px 0;color:#e74c3c;font-size:16px;line-height:1.8;">
                  <p>⚠ 检测到 {{ preExamDemons.length }} 条未降服的心魔</p>
                  <p style="color:#c8b685;font-size:13px;margin-top:8px;">渡劫前务必先巩固这些薄弱之处</p>
              </div>
              <button class="el-button full-btn btn-danger" @click="startDemonReviewQuestion">开始强化复习</button>
              <button class="el-button full-btn" style="margin-top:8px;" @click="skipDemonReview">跳过，直接渡劫</button>
            </div>

            <!-- 2. 心魔复习题目 -->
            <div v-if="step === 'demon_review_question'" class="exam-section">
               <div class="practice-header">
                  <span class="practice-progress" style="color:#e74c3c;">错 {{ currentDemonQuestion._demon_wrong_count }} 次</span>
              </div>
              <div class="question-text">{{ currentDemonQuestion.question }}</div>
              <div class="options-container">
                  <div 
                    v-for="(text, key) in currentDemonQuestion.options" 
                    :key="key"
                    class="option-btn" 
                    :class="{ 
                      'selected': demonAnswer === key,
                      'answer-correct': demonAnswer && key === currentDemonQuestion.correct_answer,
                      'answer-wrong': demonAnswer === key && key !== currentDemonQuestion.correct_answer
                    }"
                    @click="selectDemonAnswer(key)"
                  >
                    <span class="option-label">{{ key }}</span>
                    <span class="option-text">{{ text }}</span>
                  </div>
              </div>
              <button class="el-button full-btn" :disabled="!demonAnswer" @click="nextDemonReview">下一题</button>
            </div>

            <!-- 3. 突破条件展示 -->
            <div v-if="step === 'exam_info'" class="exam-section">
              <div class="breakthrough-header">
                  <div class="breakthrough-realm-flow" style="text-align:center; font-size:18px; color:#f4d98a; font-weight:bold; margin-bottom:8px;">
                    {{ currentRealmName }} → {{ nextRealmName }}
                  </div>
                  <div class="breakthrough-hint" style="text-align:center; font-size:13px; color:#c8b685; margin-bottom: 16px;">
                    {{ examInfo?.message || '请达成六维与修为要求' }}
                  </div>
              </div>

              <div class="breakthrough-condition-list" v-if="examInfo">
                <div v-for="(item, key) in examInfo.dimensions" :key="key" class="breakthrough-condition" :class="item.met ? 'met' : 'unmet'">
                    <span>{{ item.label || key }} {{ item.current }}/{{ item.required }}</span>
                    <span>{{ item.met ? '✓' : `差 ${Math.max(0, item.required - item.current)}` }}</span>
                </div>
                <!-- 灵气修为 -->
                <div v-if="examInfo.cultivation_energy" class="breakthrough-condition" :class="examInfo.cultivation_energy.met ? 'met' : 'unmet'">
                    <span>修为 {{ examInfo.cultivation_energy.current }}/{{ examInfo.cultivation_energy.required }}</span>
                    <span>{{ examInfo.cultivation_energy.met ? '✓' : `差 ${Math.max(0, examInfo.cultivation_energy.required - examInfo.cultivation_energy.current)}` }}</span>
                </div>
              </div>

              <div v-if="missingRequirementsText" style="font-size:12px; color:#e74c3c; margin-top:12px; text-align:center;">
                {{ missingRequirementsText }}
              </div>
              <div v-if="examInfo?.is_max_realm" style="font-size:12px; color:#d4a843; margin-top:12px; text-align:center;">
                当前已达最高境界
              </div>

              <button class="el-button full-btn" style="margin-top:20px;" :disabled="!canBreakthrough" @click="startBreakthroughOrExam">开始突破</button>
            </div>

            <!-- 4. 渡劫做题界面 -->
            <div v-if="step === 'exam_question'" class="exam-section">
              <div class="practice-header" style="justify-content: flex-end;">
                  <span class="practice-progress" style="font-weight:bold; color:#e74c3c; font-size:16px;">⏱ {{ formattedTime }}</span>
              </div>
              
              <!-- 进度条 -->
              <div class="progress-bar" style="margin-bottom: 16px; background: rgba(255,255,255,0.1); height: 6px; border-radius: 3px; overflow:hidden;">
                  <div class="progress-fill" :style="{ width: examProgressPercent + '%', background: 'linear-gradient(90deg, #e74c3c, #c0392b)', height: '100%', transition: 'width 0.3s' }"></div>
              </div>
              
              <div class="badge" :style="{ background: currentExamQuestion.type === 'vocab' ? 'rgba(74,144,217,0.2)' : 'rgba(78,192,122,0.2)', color: currentExamQuestion.type === 'vocab' ? '#4a90d9' : '#4ec07a', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', display: 'inline-block', marginBottom: '8px' }">
                  {{ currentExamQuestion.type === 'vocab' ? '📖 词汇' : '🔮 语法' }}
              </div>
              <div class="question-text" style="font-size: 16px; margin-bottom: 16px; color: #f7f3e8;">{{ currentExamQuestion.question }}</div>
              
              <div class="options-container">
                  <div 
                    v-for="(text, key) in currentExamQuestion.options" 
                    :key="key"
                    class="option-btn" 
                    :class="{ 'selected': examAnswers[currentExamQuestion.question_id] === key }"
                    @click="selectExamAnswer(key)"
                  >
                    <span class="option-label">{{ key }}</span>
                    <span class="option-text">{{ text }}</span>
                  </div>
              </div>
              
              <button class="el-button full-btn btn-danger" :disabled="!examAnswers[currentExamQuestion.question_id]" @click="nextExamQuestion">
                  {{ currentExamIndex < examQuestions.length - 1 ? '下一题 →' : '提交应劫' }}
              </button>
            </div>

            <!-- 5. 渡劫结果界面 -->
            <div v-if="step === 'exam_result' && examResult" class="exam-section" style="text-align: center;">
              <div style="font-size:60px; margin-bottom:10px;">{{ examPassed ? '✨' : '🔁' }}</div>
              <div style="font-size: 52px; font-weight: bold; margin-bottom: 5px; text-shadow: 0 0 20px rgba(212,168,67,0.4);" :style="{ color: gradeColor(examResult.grade_result?.grade) }">
                  {{ examResult.grade_result?.grade || 'C' }}
              </div>
              <div style="font-size:14px; color:#c8b685; margin-bottom:20px;">
                {{ examResult.grade_result?.score || 0 }}分 · {{ examResult.grade_result?.correct || 0 }}/{{ examResult.grade_result?.total || 0 }}题正确
              </div>
              
              <div class="reward-details" style="background:rgba(255,255,255,0.05); padding:16px; border-radius:12px; margin-bottom:20px; text-align:left; font-size:14px;">
                  <div style="display:flex; justify-content:space-between; margin-bottom:8px;"><span>关卡评级</span><span style="color:#d4a843;">{{ examResult.grade_result?.grade }}</span></div>
                  <div style="display:flex; justify-content:space-between; margin-bottom:8px;"><span>获得修为</span><span style="color:#d4a843;">+{{ examResult.reward?.exp_gained || 0 }}</span></div>
                  <div style="display:flex; justify-content:space-between; margin-bottom:8px;"><span>获得灵石</span><span style="color:#d4a843;">+{{ examResult.reward?.stones_gained || 0 }}</span></div>
                  <div style="display:flex; justify-content:space-between;"><span>消耗灵力</span><span style="color:#4a90d9;">-30</span></div>
              </div>
              
              <div v-if="examResult.breakthrough" style="margin-bottom: 20px; color: #f4d98a; font-weight: bold;">
                 ✨ 突破至 {{ getRealmDisplayName(examResult.breakthrough.new_realm) }} · {{ examResult.breakthrough.new_stage }}重
              </div>

              <button class="el-button full-btn" @click="closePanel">{{ examPassed ? '收下奖励，返回宗门' : '返回宗门' }}</button>
            </div>

          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';
import { useApiClient } from '../../services/api';
import { useUserStore } from '../../stores/user';
import { getRealmDisplayName } from '../../utils/cultivation';
import { ElMessage } from 'element-plus';

const props = defineProps<{
  visible: boolean;
  preExamDemons?: any[]; // 由外部传入的心魔列表
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'exam-success', result: any): void; // 用于外部调用分享卡片
}>();

const api = useApiClient();
const userStore = useUserStore();

type Step = 'demon_review_intro' | 'demon_review_question' | 'exam_info' | 'exam_question' | 'exam_result';
const step = ref<Step>('exam_info');
const loading = ref(false);

const containerWidth = computed(() => {
  if (step.value === 'exam_question') return '560px';
  return '460px';
});

// --- 心魔复习逻辑 ---
const currentDemonIndex = ref(0);
const demonAnswer = ref<string | null>(null);

const currentDemonQuestion = computed(() => {
  if (!props.preExamDemons || props.preExamDemons.length === 0) return null;
  return props.preExamDemons[currentDemonIndex.value];
});

const startDemonReviewQuestion = () => {
  currentDemonIndex.value = 0;
  demonAnswer.value = null;
  step.value = 'demon_review_question';
};

const skipDemonReview = () => {
  fetchExamInfo();
};

const selectDemonAnswer = (key: string | number) => {
  if (demonAnswer.value) return; // 已经回答过了
  demonAnswer.value = String(key);
  
  // 记录心魔复习请求
  const q = currentDemonQuestion.value;
  if (q) {
    api.post('/vocab/submit-batch', {
        level: q.realm || 'L1', stage: 'review',
        answers: [{ question_id: q.question_id, answer: demonAnswer.value }]
    }).catch(console.error);
  }
};

const nextDemonReview = () => {
  if (currentDemonIndex.value < (props.preExamDemons?.length || 0) - 1) {
    currentDemonIndex.value++;
    demonAnswer.value = null;
  } else {
    fetchExamInfo();
  }
};

// --- 渡劫信息逻辑 ---
const examInfo = ref<any>(null);
const currentRealmName = computed(() => examInfo.value?.current_realm || userStore.profile?.current_realm || getRealmDisplayName(userStore.profile?.realm || ''));
const nextRealmName = computed(() => examInfo.value?.next_realm || '暂无');
const canBreakthrough = computed(() => Boolean(examInfo.value?.can_breakthrough) && !examInfo.value?.is_max_realm);

const missingRequirementsText = computed(() => {
  const missing = examInfo.value?.missing_requirements || [];
  if (!missing.length) return '';
  return `未满足：${missing.map((item: any) => `${item.label} 差${item.gap}`).join('、')}`;
});

const fetchExamInfo = async () => {
  step.value = 'exam_info';
  loading.value = true;
  try {
    const res = await api.get('/exam/current');
    if (res?.success) {
      examInfo.value = res.data?.breakthrough_status || {};
    } else {
      ElMessage.warning(res?.message || '获取突破条件失败');
      closePanel();
    }
  } catch (err) {
    console.error(err);
    closePanel();
  } finally {
    loading.value = false;
  }
};

const startBreakthroughOrExam = async () => {
  loading.value = true;
  try {
    // 尝试直接突破（后端处理可能不需要做题，或者直接返回做题数据）
    const res = await api.post('/exam/breakthrough');
    
    if (!res.success) {
      // 突破失败，可能是需要渡劫做题
      if (res.message && res.message.includes('条件')) {
         ElMessage.warning(res.message);
         fetchExamInfo();
         return;
      }
    }
    
    // 更新数据
    if (res.data?.user) {
      userStore.updateProfile(res.data.user);
    }
    
    // 如果直接突破完成 (不用做题的情况)
    if (res.data?.breakthrough) {
      examResult.value = {
        passed: true,
        grade_result: { grade: 'S', score: 100, correct: 0, total: 0 },
        reward: { exp_gained: 0, stones_gained: 0 },
        breakthrough: res.data.breakthrough
      };
      step.value = 'exam_result';
      loading.value = false;
      return;
    }
  } catch(e) {}
  
  // 开始渡劫请求
  const res = await api.post('/exam/start');
  loading.value = false;
  if (!res.success) {
      ElMessage.warning(res.message || '渡劫条件不足');
      return;
  }

  // 初始化渡劫题库
  examQuestions.value = res.data.questions || [];
  currentExamIndex.value = 0;
  examAnswers.value = {};
  timeLeft.value = res.data.time_limit || 600;
  startExamTimer();
  step.value = 'exam_question';
};

// --- 渡劫做题逻辑 ---
const examQuestions = ref<any[]>([]);
const currentExamIndex = ref(0);
const examAnswers = ref<Record<string, string>>({});
const timeLeft = ref(600);
let timerId: ReturnType<typeof setInterval> | null = null;

const currentExamQuestion = computed(() => examQuestions.value[currentExamIndex.value] || {});
const examProgressPercent = computed(() => {
  if (examQuestions.value.length === 0) return 0;
  return (Object.keys(examAnswers.value).length / examQuestions.value.length) * 100;
});

const formattedTime = computed(() => {
  const m = Math.floor(timeLeft.value / 60);
  const s = timeLeft.value % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
});

const selectExamAnswer = (key: string | number) => {
  const qid = currentExamQuestion.value.question_id;
  examAnswers.value[qid] = String(key);
};

const nextExamQuestion = () => {
  if (currentExamIndex.value < examQuestions.value.length - 1) {
    currentExamIndex.value++;
  } else {
    submitExam();
  }
};

const startExamTimer = () => {
  stopExamTimer();
  timerId = setInterval(() => {
    timeLeft.value--;
    if (timeLeft.value <= 0) {
      stopExamTimer();
      submitExam();
    }
  }, 1000);
};

const stopExamTimer = () => {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
};

// --- 提交与结算 ---
const examResult = ref<any>(null);
const examPassed = computed(() => Boolean(examResult.value?.grade_result?.passed));

const submitExam = async () => {
  stopExamTimer();
  loading.value = true;
  
  const answersList = Object.entries(examAnswers.value).map(([qid, ans]) => ({
      question_id: qid,
      answer: ans,
  }));

  try {
    const res = await api.post('/exam/submit', {
        answers: answersList,
        time_spent: 600 - timeLeft.value,
    });
    
    if (res.success) {
      examResult.value = res.data;
      
      // 更新用户本地状态
      const reward = res.data.reward || {};
      const bt = res.data.breakthrough;
      userStore.updateProfile({
          exp: (userStore.profile?.exp || 0) + (reward.exp_gained || 0),
          spirit_power: Math.max(0, (userStore.profile?.spirit_power || 0) - 30),
      });
      if (bt) {
          userStore.updateProfile({
              realm: bt.new_realm,
              realm_stage: bt.new_stage,
          });
      }
      
      step.value = 'exam_result';
    } else {
      ElMessage.warning(res.message || '渡劫提交失败');
      closePanel();
    }
  } catch(err) {
    console.error(err);
    ElMessage.error('网络异常，提交失败');
    closePanel();
  } finally {
    loading.value = false;
  }
};

const gradeColor = (grade: string) => {
  const colors: Record<string, string> = { 'S':'#f0d68a', 'A':'#4ec07a', 'B':'#4a90d9', 'C':'#d4a843', 'D':'#c0392b' };
  return colors[grade] || '#d4a843';
};

// --- 弹窗基础控制 ---
watch(() => props.visible, (val) => {
  if (val) {
    if (props.preExamDemons && props.preExamDemons.length > 0) {
      step.value = 'demon_review_intro';
    } else {
      fetchExamInfo();
    }
  } else {
    stopExamTimer();
  }
});

onUnmounted(() => {
  stopExamTimer();
});

const handleOverlayClick = () => {
  if (step.value === 'exam_question') return; // 做题时不准点蒙版关闭
  closePanel();
};

const closePanel = () => {
  if (examPassed.value) {
    emit('exam-success', examResult.value);
  }
  emit('update:visible', false);
};
</script>

<style scoped>
.profile-overlay {
  position: fixed;
  top: 0; left: 0; width: 100vw; height: 100vh;
  background: rgba(10, 10, 26, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(5px);
}
.profile-container {
  width: 90%;
  background: #1a1a2e;
  border: 2px solid var(--gold, #d4a843);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  transition: max-width 0.3s ease;
}
.profile-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: rgba(255,255,255,0.05);
  border-bottom: 1px solid rgba(212,168,67,0.3);
}
.profile-close-btn {
  background: transparent;
  border: 1px solid var(--gold, #d4a843);
  color: var(--gold, #d4a843);
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
  position: absolute;
  right: 16px;
}

/*突破条件样式*/
.breakthrough-condition-list {
  background: rgba(0,0,0,0.2);
  padding: 12px;
  border-radius: 8px;
}
.breakthrough-condition {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  margin-bottom: 4px;
  border-radius: 6px;
  font-size: 13px;
}
.breakthrough-condition.met {
  background: rgba(78,192,122,0.1);
  color: #4ec07a;
  border-left: 3px solid #4ec07a;
}
.breakthrough-condition.unmet {
  background: rgba(231,76,60,0.1);
  color: #e74c3c;
  border-left: 3px solid #e74c3c;
}

/* 选项样式 */
.options-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}
.option-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(212, 168, 67, 0.3);
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  color: #f7f3e8;
  transition: all 0.2s;
}
.option-btn:hover {
  background: rgba(212, 168, 67, 0.1);
}
.option-btn.selected {
  background: rgba(212, 168, 67, 0.2);
  border-color: #d4a843;
}
.option-btn.answer-correct {
  background: rgba(78, 192, 122, 0.2);
  border-color: #4ec07a;
  color: #4ec07a;
}
.option-btn.answer-wrong {
  background: rgba(231, 76, 60, 0.2);
  border-color: #e74c3c;
  color: #e74c3c;
  opacity: 0.7;
}
.option-label {
  width: 24px;
  height: 24px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  font-size: 12px;
}
.option-btn.selected .option-label {
  background: #d4a843;
  color: #1a1a2e;
}
.option-btn.answer-correct .option-label { background: #4ec07a; }
.option-btn.answer-wrong .option-label { background: #e74c3c; }

/* 按钮 */
.full-btn {
  width: 100%;
}
.btn-danger {
  background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%) !important;
  border: none !important;
  color: #fff !important;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
