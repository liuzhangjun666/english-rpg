<template>
  <div
    class="login-view relative w-full min-h-full overflow-x-hidden bg-gray-900 text-white font-sans selection:bg-yellow-500 selection:text-black">
    <!-- 全屏背景 -->
    <div class="absolute inset-0 bg-cover bg-center z-0 animate-slow-zoom"
      style="background-image: url('/images/ui/login_bg_fantasy.png');">
      <!-- 渐变遮罩 -->
      <div class="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/80"></div>
    </div>

    <!-- 顶层交互容器 -->
    <div class="login-shell relative z-10" :class="{ 'is-form-open': showForm }">

      <!-- Logo 区域 -->
      <div class="login-hero text-center" :class="{ compact: showForm }">
        <h1 class="login-title">
          英语修仙
        </h1>
        <p class="login-subtitle">
          背单词，修大道
        </p>
      </div>

      <!-- 中心交互区 (未展开表单时) -->
      <transition name="fade-slide">
        <div v-if="!showForm" class="login-enter-wrap">
          <button @click="showForm = true" class="login-enter-btn">
            <span class="relative z-10 tracking-widest">踏入修仙界</span>
            <div class="login-enter-btn-glow"></div>
            <div class="login-enter-btn-shine"></div>
          </button>
        </div>
      </transition>

      <!-- 登录/注册表单区 (展开时) -->
      <transition name="fade-up">
        <div v-if="showForm" class="login-form-stage">

          <!-- 左侧：表单面板 -->
          <div class="login-form-panel">
            <div class="login-form-panel-accent"></div>

            <div class="login-form-head">
              <h2 class="login-form-title">{{ isLogin ? '修士登入' : '凝聚仙魂' }}</h2>
              <button type="button" @click="toggleFormType" class="login-form-switch">
                {{ isLogin ? '前往注册 →' : '← 返回登入' }}
              </button>
            </div>

            <!-- 登录表单 -->
            <form v-if="isLogin" @submit.prevent="doLogin" class="login-form">
              <div class="login-field">
                <label class="login-label">手机号</label>
                <input v-model="loginForm.phone" type="tel" maxlength="11" class="login-input" placeholder="请输入11位手机号"
                  autocomplete="tel">
              </div>

              <div class="login-field">
                <label class="login-label">验证码</label>
                <div class="login-code-row">
                  <input v-model="loginForm.code" type="text" maxlength="6" class="login-input" placeholder="输入6位验证码"
                    autocomplete="one-time-code">
                  <button type="button" @click="sendCode('login')" :disabled="loginCountdown > 0"
                    class="login-code-btn">
                    {{ loginCountdown > 0 ? `${loginCountdown}息后重试` : '获取验证码' }}
                  </button>
                </div>
              </div>

              <div class="login-actions">
                <button type="submit" class="login-submit-btn">
                  确认登入
                </button>

                <button type="button" @click="guestLogin" class="login-guest-btn">
                  游客登入（试玩体验）
                </button>
              </div>
            </form>

            <!-- 注册表单 -->
            <form v-else @submit.prevent="doRegister" class="login-form">
              <div class="login-field">
                <label class="login-label">手机号</label>
                <input v-model="registerForm.phone" type="tel" maxlength="11" class="login-input"
                  placeholder="请输入11位手机号" autocomplete="tel">
              </div>

              <div class="login-field">
                <label class="login-label">验证码</label>
                <div class="login-code-row">
                  <input v-model="registerForm.code" type="text" maxlength="6" class="login-input" placeholder="输入6位验证码"
                    autocomplete="one-time-code">
                  <button type="button" @click="sendCode('register')" :disabled="registerCountdown > 0"
                    class="login-code-btn">
                    {{ registerCountdown > 0 ? `${registerCountdown}息后重试` : '获取验证码' }}
                  </button>
                </div>
              </div>

              <div class="login-field">
                <label class="login-label">修炼学段（必选）</label>
                <p class="login-hint">用于匹配灵根试炼起点；初始境界由测试测定，与学段无关。</p>
                <div class="school-stage-grid">
                  <button v-for="stage in schoolStages" :key="stage.value" type="button" class="school-stage-btn"
                    :class="{ 'is-active': registerForm.school_grade === stage.value }"
                    @click="registerForm.school_grade = stage.value">
                    {{ stage.label }}
                  </button>
                </div>
              </div>

              <div class="login-field">
                <label class="login-label">道号（选填）</label>
                <input v-model="registerForm.nickname" type="text" maxlength="50" class="login-input"
                  placeholder="不填则由天道自动生成" autocomplete="nickname">
              </div>

              <div class="login-actions">
                <button type="submit" class="login-submit-btn">
                  塑魂注册
                </button>
              </div>
            </form>
          </div>

          <!-- 右侧：成长预览 -->
          <div class="login-growth-panel">
            <h3 class="text-xl text-center text-gray-300 font-medium mb-8 tracking-widest">修仙之路预览</h3>

            <div class="login-growth-track">

              <div class="relative group login-growth-item" v-for="(stage, index) in growthStages" :key="index">
                <div class="login-growth-dot"></div>
                <div class="login-growth-card">
                  <div class="flex items-end gap-3 mb-2">
                    <h4 class="text-lg font-bold text-yellow-400">{{ stage.name }}</h4>
                    <span class="text-xs text-yellow-500/70 border border-yellow-500/30 px-2 py-0.5 rounded">{{
                      stage.desc }}</span>
                  </div>
                  <p class="text-sm text-gray-400">掌握 <span class="text-yellow-500 font-bold mx-1">{{ stage.words
                  }}</span> 个核心词汇</p>
                </div>
              </div>

            </div>
          </div>

        </div>
      </transition>

      <p class="brand-sub">英语修仙 · 背单词，修大道</p>
    </div>

    <!-- 开门白光过场 -->
    <div class="enter-flash" :class="{ on: entering }"></div>

  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useApiClient } from '../services/api';
import { useAuthStore } from '../stores/auth';
import { useUserStore } from '../stores/user';
import { useStoryStore } from '../stores/story';
import { useUiStore } from '../stores/ui';
import { useLegacyBridge } from '../composables/useLegacyBridge';
import { resolveAssessmentDone } from '../router';
import { refreshUserProfileFromApi } from '../services/profile';
import { LoginGateScene } from '../core/login/LoginGateScene';

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

const gateCanvasRef = ref<HTMLDivElement | null>(null);
let gateScene: LoginGateScene | null = null;

onMounted(() => {
  if (gateCanvasRef.value) {
    try {
      gateScene = new LoginGateScene(gateCanvasRef.value);
    } catch (err) {
      console.error('[LoginView] LoginGateScene 初始化失败：', err);
    }
  }
});

onBeforeUnmount(() => {
  gateScene?.dispose();
  gateScene = null;
});

const loginCountdown = ref(0);
const registerCountdown = ref(0);

const loginForm = reactive({
  phone: '',
  code: '',
});

const schoolStages = [
  { value: 'primary', label: '小学' },
  { value: 'junior', label: '初中' },
  { value: 'senior', label: '高中' },
  { value: 'college', label: '大学' },
  { value: 'graduate', label: '研究生' },
] as const;

const growthStages = [
  { name: '练气期', desc: '入门', words: 100 },
  { name: '筑基期', desc: '筑基', words: 500 },
  { name: '金丹期', desc: '结丹', words: 2000 },
  { name: '元婴期', desc: '化婴', words: 5000 },
  { name: '化神期', desc: '神识', words: 8000 },
];

const registerForm = reactive({
  phone: '',
  code: '',
  nickname: '',
  school_grade: '',
  birth_year: '',
});

function toggleFormType() {
  isLogin.value = !isLogin.value;
  if (!isLogin.value) {
    registerForm.school_grade = '';
  }
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
  if (!res?.success && res?.code === 'PHONE_ALREADY_REGISTERED' && action === 'register') {
    promptRegisteredPhoneAndGoLogin(phone);
    return;
  }
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

async function syncProfileFromApi(fallback?: Record<string, any>) {
  try {
    const profile = await refreshUserProfileFromApi({ skipAuthLogout: true });
    if (profile) return;
  } catch {
    // 回退到登录/注册接口返回的用户快照。
  }
  if (fallback) {
    await applyProfile(fallback);
  }
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

const entering = ref(false);

function navigateAfterAuth(needsAssessment: boolean, options?: { fromRegister?: boolean }) {
  const redirect = String(route.query.redirect || '/hall');
  const target = needsAssessment
    ? {
      path: '/vocab-assessment/intro',
      query: {
        ...(options?.fromRegister ? { from: 'register' } : {}),
        ...(redirect && redirect !== '/hall' ? { redirect } : {}),
      },
    }
    : (redirect as any);

  // 仙门开门过场：放大推镜穿门白光 → 跳转目标路由。
  // 没有 3D 场景（初始化失败）时直接跳转，避免卡死。
  if (gateScene && !entering.value) {
    entering.value = true;
    gateScene.openGate(() => router.replace(target));
  } else {
    router.replace(target);
  }
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

    const token = String(res.data.token || '');
    api.setToken(token);
    auth.setToken(token);
    await syncProfileFromApi(res.data.user);
    ElMessage.success('登录成功');
    const done = await resolveAssessmentDone();
    navigateAfterAuth(!done);
  } finally {
    ui.hideLoading();
  }
}

async function doRegister() {
  if (registerForm.phone.trim().length !== 11 || registerForm.code.trim().length !== 6) {
    ElMessage.error('请填写正确的手机号和验证码');
    return;
  }
  if (!registerForm.school_grade.trim()) {
    ElMessage.error('请选择修炼学段');
    return;
  }

  ui.showLoading('正在凝聚仙魂...');
  try {
    const payload: Record<string, any> = {
      phone: registerForm.phone.trim(),
      code: registerForm.code.trim(),
      school_grade: registerForm.school_grade.trim(),
    };
    if (registerForm.nickname.trim()) payload.nickname = registerForm.nickname.trim();
    if (registerForm.birth_year.trim()) payload.birth_year = Number(registerForm.birth_year.trim());

    // 邀请码：URL ?ref=XXX 直接用；否则尝试 localStorage（兜底之前访问时缓存的码）
    // 字段名必须是 invite_code（后端 AuthController::register validator 里期望的字段）。
    const refFromUrl = String(route.query.ref || '').trim().toUpperCase();
    const refFromLs = (() => {
      try { return localStorage.getItem('levelup_pending_invite_ref') || ''; } catch { return ''; }
    })();
    const inviteCode = refFromUrl || refFromLs;
    if (inviteCode) payload.invite_code = inviteCode;

    const res = await api.post('/auth/register', payload);
    if (!res?.success && res?.code === 'PHONE_ALREADY_REGISTERED') {
      promptRegisteredPhoneAndGoLogin(registerForm.phone);
      return;
    }

    if (!res?.success || !res?.data?.token) {
      ElMessage.error(res?.message || '注册失败');
      return;
    }

    const token = String(res.data.token || '');
    if (!token) {
      ElMessage.error('注册失败：未获取到登录凭证');
      return;
    }

    api.setToken(token);
    auth.setToken(token);
    await syncProfileFromApi(res.data.user);
    // 注册成功后清掉本地缓存的邀请码，避免下次注册再次带上
    try { localStorage.removeItem('levelup_pending_invite_ref'); } catch { /* ignore */ }
    ElMessage.success('仙魂凝聚成功！正在前往灵根测试...');
    navigateAfterAuth(true, { fromRegister: true });
    return;
  } finally {
    ui.hideLoading();
  }
}

async function guestLogin() {
  loginForm.phone = '13800138000';
  await sendCode('login');
  if (loginForm.code) {
    await doLogin();
  }
}

async function promptRegisteredPhoneAndGoLogin(phone: string) {
  try {
    await ElMessageBox.confirm(
      '该手机号已被注册，是否返回登录页面？',
      '手机号已注册',
      { confirmButtonText: '去登录', cancelButtonText: '取消', type: 'warning' }
    );
    isLogin.value = true;
    loginForm.phone = String(phone || '').trim();
    loginForm.code = '';
  } catch {
    // user cancelled
  }
}
</script>

<style scoped>
.login-view {
  min-height: 100vh;
  min-height: 100dvh;
}

.login-shell {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  min-height: 100dvh;
  padding: 24px 16px 40px;
}

.login-shell.is-form-open {
  justify-content: flex-start;
  padding-top: 16px;
  padding-bottom: 48px;
}

.login-hero {
  text-align: center;
  margin-bottom: 48px;
  transition: all 0.45s ease;
}

.login-hero.compact {
  margin-bottom: 20px;
}

.login-title {
  margin: 0 0 12px;
  font-family: 'Ma Shan Zheng', 'STXingkai', serif;
  font-size: clamp(3.5rem, 12vw, 6rem);
  font-weight: 900;
  letter-spacing: 0.1em;
  color: transparent;
  background-image: linear-gradient(to right, #fde047, #eab308, #ca8a04);
  background-clip: text;
  -webkit-background-clip: text;
  filter: drop-shadow(0 0 15px rgba(234, 179, 8, 0.5));
}

.login-hero.compact .login-title {
  font-size: clamp(2rem, 7vw, 2.75rem);
  margin-bottom: 6px;
}

.login-subtitle {
  margin: 0;
  font-size: clamp(1rem, 3vw, 1.35rem);
  color: #d1d5db;
  letter-spacing: 0.35em;
  font-weight: 300;
}

.login-hero.compact .login-subtitle {
  font-size: 0.95rem;
  letter-spacing: 0.2em;
}

.login-enter-wrap {
  display: flex;
  justify-content: center;
}

.login-enter-btn {
  position: relative;
  overflow: hidden;
  padding: 18px 48px;
  border: none;
  border-radius: 999px;
  background: linear-gradient(to right, #ca8a04, #854d0e);
  color: #fef9c3;
  font-size: 1.5rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 0 40px rgba(202, 138, 4, 0.6);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.login-enter-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 0 60px rgba(202, 138, 4, 0.9);
}

.login-enter-btn-glow {
  position: absolute;
  inset: 0;
  background: linear-gradient(to right, #facc15, #ca8a04);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.login-enter-btn:hover .login-enter-btn-glow {
  opacity: 0.2;
}

.login-enter-btn-shine {
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  transform: skewX(-12deg);
  background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.2), transparent);
}

.login-enter-btn:hover .login-enter-btn-shine {
  animation: shine 2.5s infinite;
}

.login-form-stage {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: min(1100px, 100%);
}

@media (min-width: 768px) {
  .login-form-stage {
    flex-direction: row;
    align-items: flex-start;
    gap: 28px;
  }
}

.login-form-panel {
  flex: 1;
  position: relative;
  overflow: hidden;
  padding: 24px 22px 28px;
  border-radius: 18px;
  border: 1px solid rgba(234, 179, 8, 0.3);
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(18px);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.35);
}

@media (min-width: 768px) {
  .login-form-panel {
    padding: 28px 28px 32px;
  }
}

.login-form-panel-accent {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background: linear-gradient(to right, transparent, rgba(234, 179, 8, 0.65), transparent);
}

.login-form-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 24px;
}

.login-form-title {
  margin: 0;
  font-size: 1.5rem;
  color: #eab308;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.login-form-switch {
  border: none;
  background: transparent;
  color: #9ca3af;
  font-size: 0.875rem;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.2s ease;
}

.login-form-switch:hover {
  color: #facc15;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.login-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.login-label {
  font-size: 0.9rem;
  color: #d1d5db;
  line-height: 1.4;
}

.login-hint {
  margin: 0;
  font-size: 0.75rem;
  color: #9ca3af;
  line-height: 1.5;
}

.login-input {
  width: 100%;
  min-height: 48px;
  padding: 12px 14px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);
  color: #f9fafb;
  font-size: 16px;
  line-height: 1.4;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.login-input::placeholder {
  color: rgba(156, 163, 175, 0.85);
}

.login-input:focus {
  border-color: rgba(234, 179, 8, 0.55);
  box-shadow: 0 0 0 2px rgba(234, 179, 8, 0.18);
  background: rgba(255, 255, 255, 0.08);
}

.login-code-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: stretch;
}

.login-code-btn {
  min-height: 48px;
  padding: 0 14px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.08);
  color: #facc15;
  font-size: 0.875rem;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.login-code-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.14);
  border-color: rgba(234, 179, 8, 0.35);
}

.login-code-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.login-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 8px;
}

.login-submit-btn {
  width: 100%;
  min-height: 50px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(to right, #ca8a04, #854d0e);
  color: #fff;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(202, 138, 4, 0.28);
  transition: transform 0.2s ease, filter 0.2s ease;
}

.login-submit-btn:hover {
  filter: brightness(1.06);
  transform: translateY(-1px);
}

.login-guest-btn {
  width: 100%;
  min-height: 46px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 12px;
  background: transparent;
  color: #d1d5db;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease, color 0.2s ease;
}

.login-guest-btn:hover {
  border-color: rgba(234, 179, 8, 0.45);
  background: rgba(255, 255, 255, 0.05);
  color: #f3f4f6;
}

.login-growth-panel {
  display: none;
  flex: 1;
  padding: 28px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(12px);
}

@media (min-width: 768px) {
  .login-growth-panel {
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
}

.login-growth-track {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding-left: 32px;
}

.login-growth-track::before {
  content: '';
  position: absolute;
  top: 8px;
  bottom: 8px;
  left: 11px;
  width: 1px;
  background: linear-gradient(to bottom, rgba(234, 179, 8, 0.8), rgba(234, 179, 8, 0.25), transparent);
}

.login-growth-item {
  position: relative;
}

.login-growth-dot {
  position: absolute;
  left: -32px;
  top: 10px;
  width: 14px;
  height: 14px;
  border: 2px solid #000;
  border-radius: 50%;
  background: #eab308;
  box-shadow: 0 0 10px rgba(234, 179, 8, 0.8);
  transition: transform 0.2s ease;
}

.login-growth-item:hover .login-growth-dot {
  transform: scale(1.15);
}

.login-growth-card {
  padding: 16px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  transition: border-color 0.2s ease, background 0.2s ease;
}

.login-growth-item:hover .login-growth-card {
  border-color: rgba(234, 179, 8, 0.3);
  background: rgba(255, 255, 255, 0.08);
}

.animate-slow-zoom {
  animation: slowZoom 20s infinite alternate linear;
}

@keyframes ringPulse {

  0%,
  100% {
    transform: scale(1);
    opacity: 0.85;
  }

  50% {
    transform: scale(1.15);
    opacity: 1;
  }
}

@keyframes shine {
  100% {
    left: 125%;
  }
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.5s ease;
}

.portal-glow {
  position: absolute;
  inset: -1px;
  border-radius: 20px;
  pointer-events: none;
  box-shadow: 0 0 0 1px rgba(243, 201, 90, 0.4);
  animation: glowPulse 3.2s ease-in-out infinite;
}

@keyframes glowPulse {

  0%,
  100% {
    box-shadow: 0 0 18px rgba(243, 201, 90, 0.25), 0 0 0 1px rgba(243, 201, 90, 0.35);
  }

  50% {
    box-shadow: 0 0 40px rgba(243, 201, 90, 0.5), 0 0 0 1px rgba(243, 201, 90, 0.7);
  }
}

@keyframes breathe {

  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-4px);
  }
}

.portal-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.portal-head h2 {
  margin: 0;
  font-size: 20px;
  letter-spacing: 0.15em;
  color: #f3d98a;
  font-family: 'Ma Shan Zheng', serif;
  text-shadow: 0 0 14px rgba(243, 201, 90, 0.5);
}

.switch-link {
  background: none;
  border: none;
  color: #8fbfe6;
  font-size: 13px;
  cursor: pointer;
  transition: color 0.2s;
}

.switch-link:hover {
  color: #f3d98a;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(150, 210, 255, 0.2);
  border-radius: 12px;
  padding: 0 14px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.field:focus-within {
  border-color: rgba(243, 201, 90, 0.6);
  box-shadow: 0 0 0 3px rgba(243, 201, 90, 0.12);
}

.field-ico {
  color: #7fc8ff;
  font-size: 15px;
  flex-shrink: 0;
}

.field input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #eaf2ff;
  font-size: 15px;
  padding: 13px 0;
}

.field input::placeholder {
  color: #6f93b8;
}

.code-field .code-btn {
  white-space: nowrap;
  flex-shrink: 0;
  background: rgba(243, 201, 90, 0.12);
  border: 1px solid rgba(243, 201, 90, 0.4);
  color: #f3d98a;
  font-size: 13px;
  padding: 6px 12px;
  border-radius: 9px;
  cursor: pointer;
  transition: all 0.2s;
}

.code-field .code-btn:hover:not(:disabled) {
  background: rgba(243, 201, 90, 0.22);
}

.code-field .code-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* === 修炼学段 === */
.stage-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 2px 0;
}

.stage-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #9fc4e6;
  letter-spacing: 0.05em;
}

.stage-label .field-ico {
  font-size: 14px;
}

.stage-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

@media (min-width: 640px) {
  .school-stage-grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}

.school-stage-btn {
  min-height: 44px;
  padding: 10px 8px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: #c8dcec;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: all 0.2s ease;
}

.stage-chip:hover {
  border-color: rgba(243, 201, 90, 0.55);
  color: #f3d98a;
}

.stage-chip.is-active {
  border-color: rgba(243, 201, 90, 0.85);
  background: rgba(243, 201, 90, 0.16);
  color: #fde68a;
}

.school-stage-btn.is-active {
  border-color: rgba(234, 179, 8, 0.75);
  background: rgba(234, 179, 8, 0.14);
  color: #fde68a;
  box-shadow: 0 0 12px rgba(234, 179, 8, 0.2);
}

@media (max-width: 420px) {
  .login-code-row {
    grid-template-columns: 1fr;
  }

  .login-code-btn {
    width: 100%;
  }
}
</style>
