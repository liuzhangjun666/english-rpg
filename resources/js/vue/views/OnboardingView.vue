<template>
  <div class="onboarding-page">
    <!-- 背景粒子装饰 -->
    <div class="onboarding-bg"></div>

    <!-- Hermes 对话气泡区 -->
    <transition name="hermes-enter" appear>
      <div v-if="stage !== 'done'" class="hermes-dialog-wrap">
        <div class="hermes-avatar-wrap">
          <img :src="hermesAvatar" class="hermes-avatar" alt="Hermes" />
          <div class="hermes-halo"></div>
        </div>
        <div class="hermes-bubble">
          <span class="hermes-name">赫尔墨斯</span>
          <p class="hermes-text">{{ currentDialog }}</p>
          <button
            v-if="stage === 'intro' || stage === 'praise'"
            class="hermes-next-btn"
            @click="advance"
          >
            {{ stage === 'praise' ? '前往大厅' : '开始修炼' }}
          </button>
        </div>
      </div>
    </transition>

    <!-- 引导练习题区 -->
    <transition name="quiz-enter">
      <div v-if="stage === 'quiz'" class="onboarding-quiz">
        <div class="quiz-header">
          <span class="quiz-step">第 {{ currentQuestion + 1 }} / {{ ONBOARDING_QUESTIONS.length }} 题</span>
          <span class="quiz-hint">道友，试试自己的英语实力</span>
        </div>

        <div class="quiz-word">{{ currentQ?.word }}</div>
        <div class="quiz-phonetic" v-if="currentQ?.phonetic">{{ currentQ.phonetic }}</div>

        <div class="quiz-options">
          <button
            v-for="(opt, i) in currentQ?.options"
            :key="i"
            class="quiz-option"
            :class="{
              'option-correct': answered && opt === currentQ?.answer,
              'option-wrong':   answered && selectedOpt === opt && opt !== currentQ?.answer,
            }"
            :disabled="answered"
            @click="selectOption(opt)"
          >
            {{ opt }}
          </button>
        </div>

        <transition name="feedback-pop">
          <div v-if="answered" class="quiz-feedback" :class="lastCorrect ? 'feedback-correct' : 'feedback-wrong'">
            {{ lastCorrect ? '✨ 太棒了！道友天资不凡' : '💡 已记录，继续修炼即可精通' }}
          </div>
        </transition>
      </div>
    </transition>

    <!-- 境界突破动画 -->
    <transition name="breakthrough-enter">
      <div v-if="stage === 'breakthrough'" class="breakthrough-wrap">
        <div class="breakthrough-ring"></div>
        <div class="breakthrough-text">境界突破</div>
        <div class="breakthrough-realm">练气初期 → 练气二层</div>
        <div class="breakthrough-rewards">
          <span>灵气 +50</span>
          <span>灵石 +20</span>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { returnToHall } from '../services/hallNavigation';
import { useApiClient } from '../services/api';
import { useUserStore } from '../stores/user';
import hermesAvatar from '../../../assets/images/hermes_avatar.png';

const ONBOARDING_QUESTIONS = [
  {
    word: 'Apple',
    phonetic: '/ˈæp.əl/',
    options: ['苹果', '香蕉', '橙子', '葡萄'],
    answer: '苹果',
  },
  {
    word: 'Happy',
    phonetic: '/ˈhæp.i/',
    options: ['悲伤的', '快乐的', '愤怒的', '疲倦的'],
    answer: '快乐的',
  },
  {
    word: 'Run',
    phonetic: '/rʌn/',
    options: ['游泳', '飞翔', '奔跑', '跳跃'],
    answer: '奔跑',
  },
];

const DIALOGS = {
  intro: '道友，你终于来了。此处乃英语修仙界，以词汇为剑、以语法为阵，修炼语言大道。且先试试道友的天资，做三道简单的题目。',
  praise: '道友天资异禀！继续修炼可突破更高境界，解锁秘境、参加宗门试炼。修仙之路，此处为起点——祝道友早日飞升！',
};

type Stage = 'intro' | 'quiz' | 'breakthrough' | 'praise' | 'done';

const router = useRouter();
const api = useApiClient();
const user = useUserStore();

const stage = ref<Stage>('intro');
const currentQuestion = ref(0);
const answered = ref(false);
const selectedOpt = ref('');
const lastCorrect = ref(false);

const currentQ = computed(() => ONBOARDING_QUESTIONS[currentQuestion.value]);
const currentDialog = computed(() =>
  stage.value === 'intro' ? DIALOGS.intro : DIALOGS.praise,
);

function advance() {
  if (stage.value === 'intro') {
    stage.value = 'quiz';
  } else if (stage.value === 'praise') {
    finishOnboarding();
  }
}

function selectOption(opt: string) {
  if (answered.value) return;
  answered.value = true;
  selectedOpt.value = opt;
  lastCorrect.value = opt === currentQ.value?.answer;

  setTimeout(() => {
    answered.value = false;
    selectedOpt.value = '';

    if (currentQuestion.value < ONBOARDING_QUESTIONS.length - 1) {
      currentQuestion.value++;
    } else {
      stage.value = 'breakthrough';
      setTimeout(() => {
        stage.value = 'praise';
      }, 2200);
    }
  }, 1100);
}

async function finishOnboarding() {
  stage.value = 'done';
  try {
    await api.post('/user/complete-tutorial');
    if (user.profile) {
      user.updateProfile({ tutorial_step: 1 });
    }
  } catch {
    // Non-critical — proceed anyway
  }
  void returnToHall(router, { replace: true, loadingText: '正在进入宗门...' });
}

onMounted(() => {
  // If tutorial already done, skip straight to hall
  if (user.profile && (user.profile as any).tutorial_step > 0) {
    void returnToHall(router, { replace: true, loadingText: '正在进入宗门...' });
  }
});
</script>

<style scoped>
.onboarding-page {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(ellipse at 50% 30%, #1a2a4a 0%, #0a0a1a 70%);
  overflow: hidden;
}

.onboarding-bg {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(2px 2px at 20% 30%, rgba(212,168,67,0.4) 0%, transparent 100%),
    radial-gradient(2px 2px at 80% 70%, rgba(100,180,255,0.3) 0%, transparent 100%),
    radial-gradient(1px 1px at 60% 20%, rgba(255,255,255,0.3) 0%, transparent 100%);
  animation: bg-twinkle 6s ease-in-out infinite alternate;
}

@keyframes bg-twinkle {
  from { opacity: 0.6; }
  to   { opacity: 1; }
}

/* Hermes */
.hermes-dialog-wrap {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  max-width: 600px;
  padding: 24px;
}

.hermes-avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.hermes-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 2px solid #d4a843;
  object-fit: cover;
}

.hermes-halo {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid rgba(212,168,67,0.4);
  animation: halo-pulse 2s ease-in-out infinite;
}

@keyframes halo-pulse {
  0%, 100% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.08); opacity: 1; }
}

.hermes-bubble {
  background: rgba(20, 30, 60, 0.9);
  border: 1px solid rgba(212,168,67,0.4);
  border-radius: 12px;
  padding: 18px 22px;
  position: relative;
  backdrop-filter: blur(8px);
}

.hermes-bubble::before {
  content: '';
  position: absolute;
  left: -10px;
  top: 20px;
  border: 10px solid transparent;
  border-right-color: rgba(212,168,67,0.4);
}

.hermes-name {
  font-size: 12px;
  color: #d4a843;
  font-weight: 700;
  letter-spacing: 1px;
  display: block;
  margin-bottom: 8px;
}

.hermes-text {
  font-size: 15px;
  color: #e8d5a0;
  line-height: 1.7;
  margin: 0 0 16px;
}

.hermes-next-btn {
  background: linear-gradient(135deg, #c8921a, #d4a843);
  color: #1a0e00;
  border: none;
  padding: 10px 28px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}

.hermes-next-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(212,168,67,0.5);
}

/* Quiz */
.onboarding-quiz {
  max-width: 480px;
  width: 90%;
  text-align: center;
  padding: 32px 24px;
  background: rgba(10,15,35,0.85);
  border: 1px solid rgba(212,168,67,0.3);
  border-radius: 16px;
  backdrop-filter: blur(10px);
}

.quiz-header {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #8a8a9a;
  margin-bottom: 24px;
}

.quiz-step { color: #d4a843; }

.quiz-word {
  font-size: 42px;
  font-weight: 900;
  color: #ffffff;
  letter-spacing: 2px;
  margin-bottom: 6px;
  text-shadow: 0 0 20px rgba(212,168,67,0.4);
}

.quiz-phonetic {
  font-size: 14px;
  color: #7a90b0;
  margin-bottom: 28px;
}

.quiz-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 20px;
}

.quiz-option {
  padding: 14px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 10px;
  color: #c8b685;
  font-size: 15px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, transform 0.1s;
}

.quiz-option:hover:not(:disabled) {
  background: rgba(212,168,67,0.12);
  border-color: rgba(212,168,67,0.4);
  transform: translateY(-1px);
}

.quiz-option.option-correct {
  background: rgba(76,221,140,0.2);
  border-color: #4cdd8c;
  color: #4cdd8c;
}

.quiz-option.option-wrong {
  background: rgba(255,95,95,0.2);
  border-color: #ff5f5f;
  color: #ff5f5f;
}

.quiz-feedback {
  font-size: 13px;
  padding: 10px;
  border-radius: 8px;
}

.feedback-correct { background: rgba(76,221,140,0.1); color: #4cdd8c; }
.feedback-wrong   { background: rgba(255,95,95,0.1);  color: #ffa0a0; }

/* Breakthrough */
.breakthrough-wrap {
  text-align: center;
  animation: breakthrough-pulse 0.6s ease-out;
}

@keyframes breakthrough-pulse {
  from { transform: scale(0.5); opacity: 0; }
  to   { transform: scale(1);   opacity: 1; }
}

.breakthrough-ring {
  width: 160px;
  height: 160px;
  border-radius: 50%;
  border: 3px solid #d4a843;
  margin: 0 auto 20px;
  animation: ring-expand 1.5s ease-out forwards;
  box-shadow: 0 0 40px rgba(212,168,67,0.6), inset 0 0 40px rgba(212,168,67,0.2);
}

@keyframes ring-expand {
  0%   { transform: scale(0.3); opacity: 0; }
  60%  { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1);   opacity: 1; }
}

.breakthrough-text {
  font-size: 32px;
  font-weight: 900;
  color: #d4a843;
  letter-spacing: 4px;
  text-shadow: 0 0 30px rgba(212,168,67,0.8);
  margin-bottom: 10px;
}

.breakthrough-realm {
  font-size: 16px;
  color: #c8b685;
  margin-bottom: 16px;
}

.breakthrough-rewards {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.breakthrough-rewards span {
  background: rgba(212,168,67,0.15);
  border: 1px solid rgba(212,168,67,0.3);
  color: #d4a843;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 13px;
}

/* Transitions */
.hermes-enter-enter-active { animation: slide-in-left 0.5s ease-out; }
@keyframes slide-in-left {
  from { transform: translateX(-30px); opacity: 0; }
  to   { transform: translateX(0);     opacity: 1; }
}

.quiz-enter-enter-active { animation: fade-scale-in 0.4s ease-out; }
@keyframes fade-scale-in {
  from { transform: scale(0.93); opacity: 0; }
  to   { transform: scale(1);    opacity: 1; }
}

.feedback-pop-enter-active { animation: pop-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
@keyframes pop-in {
  from { transform: scale(0.5); opacity: 0; }
  to   { transform: scale(1);   opacity: 1; }
}

.breakthrough-enter-enter-active { animation: fade-in 0.4s ease-out; }
@keyframes fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@media (max-width: 768px) {
  .onboarding-page {
    min-height: var(--app-dvh, 100vh);
    padding: calc(8px + env(safe-area-inset-top, 0px)) max(8px, env(safe-area-inset-right, 0px))
      calc(10px + env(safe-area-inset-bottom, 0px)) max(8px, env(safe-area-inset-left, 0px));
  }

  .hermes-dialog-wrap {
    flex-direction: column;
    align-items: center;
    gap: 10px;
    max-width: 100%;
    padding: 12px;
  }

  .hermes-bubble {
    padding: 14px;
  }

  .onboarding-quiz {
    width: 100%;
    padding: 18px 12px;
  }

  .quiz-word {
    font-size: 34px;
  }

  .quiz-options {
    grid-template-columns: 1fr;
  }
}
</style>
