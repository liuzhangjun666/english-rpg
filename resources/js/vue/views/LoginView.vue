<template>
  <div class="relative min-h-screen w-full overflow-hidden bg-gray-900 text-white font-sans selection:bg-yellow-500 selection:text-black">
    <!-- 全屏背景 -->
    <div class="absolute inset-0 bg-cover bg-center z-0 animate-slow-zoom" style="background-image: url('/images/ui/login_bg_fantasy.png');">
      <!-- 渐变遮罩 -->
      <div class="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/80"></div>
    </div>

    <!-- 顶层交互容器 -->
    <div class="relative z-10 flex flex-col items-center justify-center min-h-screen p-6">
      
      <!-- Logo 区域 -->
      <div class="text-center mb-16 transform transition-all duration-700" :class="showForm ? 'translate-y-[-2rem] scale-90' : 'translate-y-0'">
        <h1 class="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-500 to-yellow-600 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)] mb-4" style="font-family: 'Ma Shan Zheng', 'STXingkai', serif; letter-spacing: 0.1em;">
          英语修仙
        </h1>
        <p class="text-xl md:text-2xl text-gray-300 tracking-widest font-light drop-shadow-lg">
          背单词，修大道
        </p>
      </div>

      <!-- 中心交互区 (未展开表单时) -->
      <transition name="fade-slide">
        <div v-if="!showForm" class="flex flex-col items-center">
          <button 
            @click="showForm = true"
            class="relative group px-12 py-5 bg-gradient-to-r from-yellow-600 to-yellow-800 text-yellow-100 text-2xl font-bold rounded-full overflow-hidden shadow-[0_0_40px_rgba(202,138,4,0.6)] hover:shadow-[0_0_60px_rgba(202,138,4,0.9)] hover:scale-105 transition-all duration-300"
          >
            <span class="relative z-10 tracking-widest">踏入修仙界</span>
            <div class="absolute inset-0 bg-gradient-to-r from-yellow-400 to-yellow-600 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            <!-- 光效流转动画 -->
            <div class="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-shine"></div>
          </button>
        </div>
      </transition>

      <!-- 登录/注册表单区 (展开时) -->
      <transition name="fade-up">
        <div v-if="showForm" class="flex flex-col md:flex-row gap-8 max-w-5xl w-full">
          
          <!-- 左侧：表单面板 -->
          <div class="flex-1 bg-black/40 backdrop-blur-xl border border-yellow-500/30 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
            <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent opacity-50"></div>
            
            <div class="flex justify-between items-center mb-8">
              <h2 class="text-2xl text-yellow-500 font-bold tracking-wider">{{ isLogin ? '修士登入' : '凝聚仙魂' }}</h2>
              <button @click="toggleFormType" class="text-sm text-gray-400 hover:text-yellow-400 transition-colors">
                {{ isLogin ? '前往注册 →' : '← 返回登入' }}
              </button>
            </div>

            <!-- 登录表单 -->
            <form v-if="isLogin" @submit.prevent="doLogin" class="space-y-6">
              <div>
                <label class="block text-sm text-gray-400 mb-2">传音符 (手机号)</label>
                <input 
                  v-model="loginForm.phone"
                  type="tel" 
                  maxlength="11"
                  class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all"
                  placeholder="请输入手机号"
                >
              </div>

              <div>
                <label class="block text-sm text-gray-400 mb-2">灵力印记 (验证码)</label>
                <div class="flex gap-4">
                  <input 
                    v-model="loginForm.code"
                    type="text" 
                    maxlength="6"
                    class="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all"
                    placeholder="输入6位验证码"
                  >
                  <button 
                    type="button"
                    @click="sendCode('login')"
                    :disabled="loginCountdown > 0"
                    class="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-yellow-500 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {{ loginCountdown > 0 ? `${loginCountdown}息后重试` : '获取印记' }}
                  </button>
                </div>
              </div>

              <div class="pt-4 space-y-4">
                <button 
                  type="submit"
                  class="w-full py-4 bg-gradient-to-r from-yellow-600 to-yellow-800 hover:from-yellow-500 hover:to-yellow-700 text-white font-bold rounded-lg shadow-lg hover:shadow-yellow-500/25 transition-all"
                >
                  破关登入
                </button>
                
                <button 
                  type="button"
                  @click="guestLogin"
                  class="w-full py-3 bg-transparent border border-white/20 hover:border-yellow-500/50 hover:bg-white/5 text-gray-300 font-medium rounded-lg transition-all"
                >
                  神游太虚 (游客体验)
                </button>
              </div>
            </form>

            <!-- 注册表单 -->
            <form v-else @submit.prevent="doRegister" class="space-y-4">
              <div>
                <label class="block text-sm text-gray-400 mb-2">传音符 (手机号)</label>
                <input 
                  v-model="registerForm.phone"
                  type="tel" 
                  maxlength="11"
                  class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all"
                  placeholder="请输入手机号"
                >
              </div>

              <div>
                <label class="block text-sm text-gray-400 mb-2">灵力印记 (验证码)</label>
                <div class="flex gap-4">
                  <input 
                    v-model="registerForm.code"
                    type="text" 
                    maxlength="6"
                    class="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all"
                    placeholder="输入6位验证码"
                  >
                  <button 
                    type="button"
                    @click="sendCode('register')"
                    :disabled="registerCountdown > 0"
                    class="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-yellow-500 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {{ registerCountdown > 0 ? `${registerCountdown}息后重试` : '获取印记' }}
                  </button>
                </div>
              </div>

              <div>
                <label class="block text-sm text-gray-400 mb-2">道号 (选填)</label>
                <input 
                  v-model="registerForm.nickname"
                  type="text" 
                  maxlength="50"
                  class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all"
                  placeholder="不填则由天道自动生成"
                >
              </div>

              <div class="pt-4">
                <button 
                  type="submit"
                  class="w-full py-4 bg-gradient-to-r from-yellow-600 to-yellow-800 hover:from-yellow-500 hover:to-yellow-700 text-white font-bold rounded-lg shadow-lg hover:shadow-yellow-500/25 transition-all"
                >
                  塑魂注册
                </button>
              </div>
            </form>
          </div>

          <!-- 右侧：成长预览 -->
          <div class="hidden md:flex flex-1 bg-black/30 backdrop-blur-md border border-white/10 rounded-2xl p-8 flex-col justify-center">
            <h3 class="text-xl text-center text-gray-300 font-medium mb-8 tracking-widest">修仙之路预览</h3>
            
            <div class="relative space-y-8 pl-8 before:absolute before:inset-y-4 before:left-3 before:w-px before:bg-gradient-to-b before:from-yellow-500/80 before:via-yellow-500/30 before:to-transparent">
              
              <div class="relative group" v-for="(stage, index) in growthStages" :key="index">
                <div class="absolute -left-[38px] top-2 w-4 h-4 rounded-full bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.8)] border-2 border-black transform group-hover:scale-125 transition-transform"></div>
                <div class="bg-white/5 border border-white/10 p-4 rounded-lg group-hover:bg-white/10 group-hover:border-yellow-500/30 transition-all cursor-default">
                  <div class="flex items-end gap-3 mb-2">
                    <h4 class="text-lg font-bold text-yellow-400">{{ stage.name }}</h4>
                    <span class="text-xs text-yellow-500/70 border border-yellow-500/30 px-2 py-0.5 rounded">{{ stage.desc }}</span>
                  </div>
                  <p class="text-sm text-gray-400">掌握 <span class="text-yellow-500 font-bold mx-1">{{ stage.words }}</span> 个核心词汇</p>
                </div>
              </div>

            </div>
          </div>
          
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useApiClient } from '../services/api';
import { useAuthStore } from '../stores/auth';
import { useUserStore } from '../stores/user';
import { useStoryStore } from '../stores/story';
import { useUiStore } from '../stores/ui';
import { useLegacyBridge } from '../composables/useLegacyBridge';

const router = useRouter();
const route = useRoute();
const api = useApiClient();
const auth = useAuthStore();
const user = useUserStore();
const story = useStoryStore();
const ui = useUiStore();
const bridge = useLegacyBridge();

const showForm = ref(false);
const isLogin = ref(true);

const loginCountdown = ref(0);
const registerCountdown = ref(0);

const loginForm = reactive({
  phone: '',
  code: '',
});

const registerForm = reactive({
  phone: '',
  code: '',
  nickname: '',
  birth_year: '',
});

const growthStages = [
  { name: '炼气期', desc: '初窥门径', words: 100 },
  { name: '筑基期', desc: '融会贯通', words: 500 },
  { name: '金丹期', desc: '过目不忘', words: 2000 },
  { name: '元婴期', desc: '出口成章', words: 5000 },
];

function toggleFormType() {
  isLogin.value = !isLogin.value;
}

function startCountdown(target: 'login' | 'register', seconds = 60) {
  const refTarget = target === 'login' ? loginCountdown : registerCountdown;
  refTarget.value = seconds;
  const timer = setInterval(() => {
    refTarget.value -= 1;
    if (refTarget.value <= 0) clearInterval(timer);
  }, 1000);
}

async function sendCode(action: 'login' | 'register') {
  const phone = action === 'login' ? loginForm.phone.trim() : registerForm.phone.trim();
  if (phone.length !== 11) {
    ElMessage.error('请输入11位手机号');
    return;
  }
  const res = await api.post('/sms/send', { phone, action });
  if (!res?.success) {
    ElMessage.error(res?.message || '发送失败');
    return;
  }
  if (res?.debug_code) {
    if (action === 'login') loginForm.code = String(res.debug_code);
    if (action === 'register') registerForm.code = String(res.debug_code);
  }
  startCountdown(action);
  ElMessage.success('验证码已发送');
}

async function applyProfile(profile: Record<string, any>) {
  auth.setToken(api.getStoredToken() || '');
  user.setProfile(profile);
  story.setSnapshot({
    current_chapter: profile.current_chapter,
    current_node: profile.current_node,
    dao_heart: profile.dao_heart,
    story_keys: profile.story_keys,
    unlocked_nodes: profile.unlocked_nodes,
    story_progress: profile.story_progress,
    progress_currency: profile.progress_currency,
  });
  await bridge.applySessionFromProfile(profile);
}

async function doLogin() {
  if (loginForm.phone.trim().length !== 11 || loginForm.code.trim().length !== 6) {
    ElMessage.error('请填写正确的手机号和验证码');
    return;
  }

  ui.showLoading('正在登入...');
  try {
    const res = await api.post('/auth/login', {
      phone: loginForm.phone.trim(),
      code: loginForm.code.trim(),
    });

    if (!res?.success || !res?.data?.token) {
      ElMessage.error(res?.message || '登录失败');
      return;
    }

    api.setToken(res.data.token);
    await applyProfile(res.data.user);
    ElMessage.success('登录成功');
    router.replace(String(route.query.redirect || '/hall'));
  } finally {
    ui.hideLoading();
  }
}

async function doRegister() {
  if (registerForm.phone.trim().length !== 11 || registerForm.code.trim().length !== 6) {
    ElMessage.error('请填写正确的手机号和验证码');
    return;
  }

  ui.showLoading('正在凝聚仙魂...');
  try {
    const payload: Record<string, any> = {
      phone: registerForm.phone.trim(),
      code: registerForm.code.trim(),
    };
    if (registerForm.nickname.trim()) payload.nickname = registerForm.nickname.trim();
    if (registerForm.birth_year.trim()) payload.birth_year = Number(registerForm.birth_year.trim());

    const res = await api.post('/auth/register', payload);
    if (!res?.success || !res?.data?.token) {
      ElMessage.error(res?.message || '注册失败');
      return;
    }

    api.setToken(res.data.token);
    await applyProfile(res.data.user);
    ElMessage.success('注册成功');
    router.replace('/hall');
  } finally {
    ui.hideLoading();
  }
}

async function guestLogin() {
  // 模拟发送验证码并登录
  loginForm.phone = '13800138000';
  await sendCode('login');
  if (loginForm.code) {
    await doLogin();
  }
}
</script>

<style scoped>
.animate-slow-zoom {
  animation: slowZoom 20s infinite alternate linear;
}

@keyframes slowZoom {
  0% { transform: scale(1); }
  100% { transform: scale(1.05); }
}

@keyframes shine {
  100% { left: 125%; }
}

.animate-shine {
  animation: shine 2.5s infinite;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.5s ease;
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

.fade-up-enter-active,
.fade-up-leave-active {
  transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-up-enter-from,
.fade-up-leave-to {
  opacity: 0;
  transform: translateY(40px);
}
</style>
