<template>
  <div
    class="relative min-h-screen w-full overflow-hidden bg-gray-900 text-white font-sans selection:bg-yellow-500 selection:text-black">
    <!-- 全屏 3D 仙门场景 (Three.js + Bloom) -->
    <div ref="gateCanvasRef" class="absolute inset-0 z-0 gate-canvas"></div>
    <!-- 渐变遮罩：让表单/文字始终清晰可读 -->
    <div class="absolute inset-0 z-0 bg-gradient-to-b from-black/30 via-transparent to-black/70 pointer-events-none"></div>

    <!-- 仙门匾额 -->
    <h1 class="gate-title" :class="{ entering, 'title-up': showForm }">太虚仙门</h1>

    <!-- 点击门洞的提示（表单未展开时） -->
    <div v-if="!showForm && !entering" class="gate-hint" @click="showForm = true">
      <div class="hint-ring"></div>
      <span class="hint-text">点击仙门 · 踏入修行</span>
    </div>

    <!-- 玻璃拟态登录区 -->
    <Transition name="portal-reveal">
      <div v-if="showForm" class="gate-ui" :class="{ entering }">
        <div class="glass-portal">
          <span class="portal-glow"></span>

          <div class="portal-head">
            <h2>{{ isLogin ? '修士登入' : '凝聚仙魂' }}</h2>
            <button class="switch-link" @click="toggleFormType">
              {{ isLogin ? '前往注册 →' : '← 返回登入' }}
            </button>
          </div>

          <!-- 登录 -->
          <form v-if="isLogin" class="form" @submit.prevent="doLogin">
            <div class="field">
              <span class="field-ico">📡</span>
              <input v-model="loginForm.phone" type="tel" maxlength="11" placeholder="传音符（手机号）" />
            </div>
            <div class="field code-field">
              <span class="field-ico">✦</span>
              <input v-model="loginForm.code" type="text" maxlength="6" placeholder="灵力印记（验证码）" />
              <button type="button" class="code-btn" :disabled="loginCountdown > 0" @click="sendCode('login')">
                {{ loginCountdown > 0 ? `${loginCountdown}息` : '获取印记' }}
              </button>
            </div>
            <button type="submit" class="jade-btn"><span>破 关 登 入</span></button>
            <button type="button" class="ghost-btn" @click="guestLogin">神游太虚（游客体验）</button>
          </form>

          <!-- 注册 -->
          <form v-else class="form" @submit.prevent="doRegister">
            <div class="field">
              <span class="field-ico">📡</span>
              <input v-model="registerForm.phone" type="tel" maxlength="11" placeholder="传音符（手机号）" />
            </div>
            <div class="field code-field">
              <span class="field-ico">✦</span>
              <input v-model="registerForm.code" type="text" maxlength="6" placeholder="灵力印记（验证码）" />
              <button type="button" class="code-btn" :disabled="registerCountdown > 0" @click="sendCode('register')">
                {{ registerCountdown > 0 ? `${registerCountdown}息` : '获取印记' }}
              </button>
            </div>

            <!-- 修炼学段 -->
            <div class="stage-block">
              <div class="stage-label">
                <span class="field-ico">⛰</span>
                <span>修炼学段（用于匹配灵根试炼起点）</span>
              </div>
              <div class="stage-grid">
                <button
                  v-for="stage in schoolStages"
                  :key="stage.value"
                  type="button"
                  class="stage-chip"
                  :class="{ 'is-active': registerForm.school_grade === stage.value }"
                  @click="registerForm.school_grade = stage.value"
                >
                  {{ stage.label }}
                </button>
              </div>
            </div>

            <div class="field">
              <span class="field-ico">⚝</span>
              <input v-model="registerForm.nickname" type="text" maxlength="50" placeholder="道号（选填，不填由天道赐名）" />
            </div>

            <button type="submit" class="jade-btn"><span>塑 魂 注 册</span></button>
          </form>
        </div>
        <p class="brand-sub">英语修仙 · 背单词，修大道</p>
      </div>
    </Transition>

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
/* === 仙门匾额 === */
.gate-title {
  position: absolute;
  top: 8%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
  margin: 0;
  font-family: 'Ma Shan Zheng', 'STXingkai', serif;
  font-size: clamp(40px, 6vw, 80px);
  letter-spacing: 0.25em;
  color: #f3d98a;
  text-shadow:
    0 0 18px rgba(243, 201, 90, 0.7),
    0 4px 18px rgba(0, 0, 0, 0.6);
  pointer-events: none;
  transition: transform 0.7s cubic-bezier(0.7, 0, 0.3, 1), opacity 0.6s;
}
.gate-title.title-up {
  top: 4%;
  font-size: clamp(28px, 4vw, 48px);
}
.gate-title.entering {
  opacity: 0;
  transform: translateX(-50%) scale(1.4);
}

/* === 点击门洞提示 === */
.gate-hint {
  position: absolute;
  bottom: 22%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  padding: 24px 36px;
}
.hint-ring {
  width: 64px;
  height: 64px;
  border: 2px solid rgba(243, 201, 90, 0.6);
  border-radius: 50%;
  box-shadow:
    0 0 24px rgba(243, 201, 90, 0.4),
    inset 0 0 12px rgba(243, 201, 90, 0.2);
  animation: ringPulse 2.4s ease-in-out infinite;
  margin-bottom: 14px;
}
@keyframes ringPulse {
  0%, 100% { transform: scale(1); opacity: 0.85; }
  50%      { transform: scale(1.15); opacity: 1; }
}
.hint-text {
  color: #f3d98a;
  font-size: 16px;
  letter-spacing: 0.3em;
  font-family: 'Ma Shan Zheng', serif;
  text-shadow: 0 0 12px rgba(243, 201, 90, 0.6), 0 2px 6px rgba(0, 0, 0, 0.6);
}

/* === 表单弹出过渡 === */
.portal-reveal-enter-active { transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
.portal-reveal-leave-active { transition: all 0.3s ease-in; }
.portal-reveal-enter-from   { opacity: 0; transform: scale(0.85) translateY(30px); }
.portal-reveal-leave-to     { opacity: 0; transform: scale(0.9); }

/* === 玻璃拟态登录区 === */
.gate-ui {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  transition: opacity 0.6s, transform 0.8s cubic-bezier(0.7, 0, 0.84, 0);
}
.gate-ui.entering { opacity: 0; transform: scale(1.25); }

.glass-portal {
  pointer-events: auto;
  position: relative;
  width: min(380px, 88vw);
  margin-top: 40px;
  padding: 26px 26px 22px;
  border-radius: 20px;
  background: rgba(14, 28, 52, 0.5);
  border: 1px solid rgba(150, 210, 255, 0.3);
  box-shadow: 0 0 50px rgba(40, 90, 160, 0.3), inset 0 0 40px rgba(30, 70, 130, 0.25);
  backdrop-filter: blur(18px) saturate(120%);
  -webkit-backdrop-filter: blur(18px) saturate(120%);
  animation: breathe 4s ease-in-out infinite;
}
.portal-glow {
  position: absolute; inset: -1px; border-radius: 20px; pointer-events: none;
  box-shadow: 0 0 0 1px rgba(243, 201, 90, 0.4);
  animation: glowPulse 3.2s ease-in-out infinite;
}
@keyframes glowPulse {
  0%, 100% { box-shadow: 0 0 18px rgba(243, 201, 90, 0.25), 0 0 0 1px rgba(243, 201, 90, 0.35); }
  50%      { box-shadow: 0 0 40px rgba(243, 201, 90, 0.5),  0 0 0 1px rgba(243, 201, 90, 0.7); }
}
@keyframes breathe { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }

.portal-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.portal-head h2 {
  margin: 0; font-size: 20px; letter-spacing: 0.15em; color: #f3d98a;
  font-family: 'Ma Shan Zheng', serif; text-shadow: 0 0 14px rgba(243, 201, 90, 0.5);
}
.switch-link { background: none; border: none; color: #8fbfe6; font-size: 13px; cursor: pointer; transition: color 0.2s; }
.switch-link:hover { color: #f3d98a; }

.form { display: flex; flex-direction: column; gap: 14px; }
.field {
  display: flex; align-items: center; gap: 10px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(150, 210, 255, 0.2);
  border-radius: 12px;
  padding: 0 14px;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.field:focus-within { border-color: rgba(243, 201, 90, 0.6); box-shadow: 0 0 0 3px rgba(243, 201, 90, 0.12); }
.field-ico { color: #7fc8ff; font-size: 15px; flex-shrink: 0; }
.field input {
  flex: 1; background: transparent; border: none; outline: none;
  color: #eaf2ff; font-size: 15px; padding: 13px 0;
}
.field input::placeholder { color: #6f93b8; }

.code-field .code-btn {
  white-space: nowrap; flex-shrink: 0;
  background: rgba(243, 201, 90, 0.12); border: 1px solid rgba(243, 201, 90, 0.4);
  color: #f3d98a; font-size: 13px; padding: 6px 12px; border-radius: 9px; cursor: pointer; transition: all 0.2s;
}
.code-field .code-btn:hover:not(:disabled) { background: rgba(243, 201, 90, 0.22); }
.code-field .code-btn:disabled { opacity: 0.45; cursor: not-allowed; }

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
.stage-label .field-ico { font-size: 14px; }
.stage-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 6px;
}
.stage-chip {
  padding: 8px 4px;
  border-radius: 9px;
  border: 1px solid rgba(150, 210, 255, 0.22);
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
  box-shadow: 0 0 14px rgba(243, 201, 90, 0.3);
}
@media (max-width: 480px) {
  .stage-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

/* === 玉牌主按钮 === */
.jade-btn {
  position: relative; margin-top: 6px; padding: 15px; border: none; border-radius: 12px; cursor: pointer;
  font-size: 17px; font-weight: bold; letter-spacing: 0.25em; color: #3a2606; overflow: hidden;
  background: linear-gradient(135deg, #ffe6a0 0%, #f0c45e 45%, #cf9a34 100%);
  box-shadow: 0 6px 24px rgba(207, 154, 52, 0.45), inset 0 1px 2px rgba(255, 255, 255, 0.6);
  transition: transform 0.15s, box-shadow 0.2s;
}
.jade-btn span { position: relative; z-index: 2; padding-left: 0.25em; }
.jade-btn::after {
  content: ''; position: absolute; top: 0; left: -60%; width: 40%; height: 100%;
  background: linear-gradient(120deg, transparent, rgba(255, 255, 255, 0.75), transparent);
  transform: skewX(-20deg); animation: shine 3s infinite;
}
.jade-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 32px rgba(207, 154, 52, 0.65); }
@keyframes shine { 0% { left: -60%; } 60%, 100% { left: 150%; } }

.ghost-btn {
  padding: 11px; border-radius: 12px; background: transparent;
  border: 1px solid rgba(150, 210, 255, 0.25); color: #9fc4e6; font-size: 14px; cursor: pointer; transition: all 0.2s;
}
.ghost-btn:hover { border-color: rgba(243, 201, 90, 0.5); color: #f3d98a; background: rgba(255, 255, 255, 0.04); }

.brand-sub {
  pointer-events: none;
  margin-top: 22px; font-size: 13px; letter-spacing: 0.3em; color: rgba(200, 220, 245, 0.7);
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
}

/* === 开门白光 === */
.enter-flash {
  position: absolute; inset: 0; z-index: 3; pointer-events: none;
  background: radial-gradient(circle at 50% 42%, #ffffff, rgba(255, 255, 255, 0) 60%);
  opacity: 0; transition: opacity 1.4s ease-in;
}
.enter-flash.on { opacity: 1; }
</style>
