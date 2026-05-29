<template>
  <div class="practice-container">
    <!-- 顶部通用信息与进度条 -->
    <div v-if="sessionState === 'answering'" class="practice-header">
      <div class="level-info">{{ currentLevelInfo }}</div>
      <div class="progress-info">{{ currentIndex + 1 }} / {{ questions.length }}</div>
      
      <!-- 连击提示 -->
      <div v-if="combo > 1" class="combo-badge">
        x{{ combo }} 连击！
      </div>
    </div>

    <!-- 关卡选择弹窗 -->
    <LevelSelectDialog 
      :visible="sessionState === 'idle'"
      :moduleName="moduleName"
      :levelId="levelId"
      :totalQuestions="questions.length"
      :spiritCost="spiritCost"
      :currentSpirit="userSpirit"
      @confirm="startLevel"
      @cancel="exitToHall"
    />

    <!-- 核心答题模块（动态组件） -->
    <div v-if="sessionState === 'answering'" class="module-wrapper">
      <component 
        :is="activeModuleComponent"
        :question="currentQuestion"
        @submit-answer="handleAnswerSubmit"
      />
    </div>

    <!-- 即时答题反馈特效 -->
    <FeedbackOverlay 
      :visible="feedback.visible"
      :type="feedback.type"
      :message="feedback.message"
    />

    <!-- 最终结算面板 -->
    <FinalScoreBoard 
      v-if="sessionState === 'finished'"
      :results="submittedResults"
      :total="questions.length"
      :expGained="totalExp"
      :stonesGained="totalStones"
      @restart="resetSession"
      @exit="exitToHall"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useComboSystem } from '../../composables/useComboSystem';
import { usePracticeTimer } from '../../composables/usePracticeTimer';

// 导入所有重构后的子组件
import VocabModule from './modules/VocabModule.vue';
import GrammarModule from './modules/GrammarModule.vue';
import ListeningModule from './modules/ListeningModule.vue';
import SpeakingModule from './modules/SpeakingModule.vue';
import WritingModule from './modules/WritingModule.vue';
import LevelSelectDialog from '../../components/practice/LevelSelectDialog.vue';
import FeedbackOverlay from '../../components/practice/FeedbackOverlay.vue';
import FinalScoreBoard from '../../components/practice/FinalScoreBoard.vue';

const route = useRoute();
const router = useRouter();

// 状态定义
const moduleType = computed(() => route.query.mode as string || 'vocab');
const sessionState = ref<'idle' | 'answering' | 'finished'>('idle');
const questions = ref<any[]>([]);
const currentIndex = ref(0);
const submittedResults = ref<any[]>([]);
const currentQuestion = computed(() => questions.value[currentIndex.value]);

// 模拟数据变量 (实际需对接 Store 和 API)
const moduleName = ref('灵草园');
const levelId = ref('L1-1');
const spiritCost = ref(5);
const userSpirit = ref(10);
const totalExp = ref(0);
const totalStones = ref(0);

// 组合式函数
const { combo, addCombo, resetCombo, clearAll: clearCombo } = useComboSystem();
const { startTimer: startNextQuestionTimer } = usePracticeTimer();

// 即时反馈状态
const feedback = ref({
  visible: false,
  type: 'success' as 'success' | 'error',
  message: ''
});

// 动态组件映射
const activeModuleComponent = computed(() => {
  const map: Record<string, any> = {
    vocab: VocabModule,
    grammar: GrammarModule,
    listening: ListeningModule,
    speaking: SpeakingModule,
    writing: WritingModule,
  };
  return map[moduleType.value] || VocabModule;
});

const currentLevelInfo = computed(() => {
  return `${moduleName.value} - 炼气期 第1关`;
});

// 方法
const startLevel = async () => {
  // TODO: 调用 API 扣除灵力并获取题目
  // 模拟加载数据
  questions.value = [
    { id: 1, content: 'apple', options: [{key:'a', text:'苹果'}, {key:'b', text:'香蕉'}] },
    { id: 2, content: 'banana', options: [{key:'a', text:'苹果'}, {key:'b', text:'香蕉'}] }
  ];
  sessionState.value = 'answering';
};

const handleAnswerSubmit = async (payload: any) => {
  // TODO: 向后端 API 提交答案
  const isCorrect = Math.random() > 0.5; // 模拟对错
  
  // 记录结果
  submittedResults.value.push({
    questionId: currentQuestion.value.id,
    answer: payload.answer || payload.content || payload.audioBlob,
    isCorrect
  });

  // 处理连击与反馈
  if (isCorrect) {
    addCombo();
    showFeedback('success', '太棒了！');
    totalExp.value += 10;
    totalStones.value += 2;
  } else {
    resetCombo();
    showFeedback('error', '再接再厉');
  }

  // 延迟后进入下一题
  startNextQuestionTimer(() => {
    feedback.value.visible = false;
    if (currentIndex.value < questions.value.length - 1) {
      currentIndex.value++;
    } else {
      sessionState.value = 'finished';
    }
  }, 1500);
};

const showFeedback = (type: 'success' | 'error', message: string) => {
  feedback.value = { visible: true, type, message };
};

const resetSession = () => {
  currentIndex.value = 0;
  submittedResults.value = [];
  clearCombo();
  totalExp.value = 0;
  totalStones.value = 0;
  sessionState.value = 'idle';
};

const exitToHall = () => {
  router.push('/hall');
};
</script>

<style scoped>
.practice-container {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  position: relative;
  min-height: 100vh;
}
.practice-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: rgba(0,0,0,0.5);
  border-radius: 12px;
  border: 1px solid rgba(212,168,67,0.3);
  margin-bottom: 20px;
}
.level-info {
  color: var(--gold-light);
  font-weight: bold;
}
.progress-info {
  color: var(--parchment-dark);
}
.combo-badge {
  color: #ff9e9e;
  font-weight: bold;
  animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.module-wrapper {
  background: rgba(255,255,255,0.02);
  border-radius: 12px;
  padding: 20px;
}
@keyframes popIn {
  0% { transform: scale(0.5); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
</style>
