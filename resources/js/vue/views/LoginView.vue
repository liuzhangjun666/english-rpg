<template>
  <div class="login-page">
    <el-card class="login-card" shadow="always">
      <template #header>
        <div class="card-header">登入宗门</div>
      </template>

      <el-tabs v-model="activeTab" stretch>
        <el-tab-pane label="登录" name="login">
          <el-form :model="loginForm" label-position="top">
            <el-form-item label="手机号">
              <el-input v-model="loginForm.phone" maxlength="11" placeholder="请输入手机号" />
            </el-form-item>
            <el-form-item label="验证码">
              <div class="code-row">
                <el-input v-model="loginForm.code" maxlength="6" placeholder="输入6位验证码" />
                <el-button :disabled="loginCountdown > 0" @click="sendCode('login')">
                  {{ loginCountdown > 0 ? `${loginCountdown}s` : '获取' }}
                </el-button>
              </div>
            </el-form-item>
            <el-button type="primary" class="full-btn" @click="doLogin">登录</el-button>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="注册" name="register">
          <el-form :model="registerForm" label-position="top">
            <el-form-item label="手机号">
              <el-input v-model="registerForm.phone" maxlength="11" placeholder="请输入手机号" />
            </el-form-item>
            <el-form-item label="验证码">
              <div class="code-row">
                <el-input v-model="registerForm.code" maxlength="6" placeholder="输入6位验证码" />
                <el-button :disabled="registerCountdown > 0" @click="sendCode('register')">
                  {{ registerCountdown > 0 ? `${registerCountdown}s` : '获取' }}
                </el-button>
              </div>
            </el-form-item>
            <el-form-item label="道号（选填）">
              <el-input v-model="registerForm.nickname" maxlength="50" placeholder="不填则自动生成" />
            </el-form-item>
            <el-form-item label="当前年级（必填）">
              <select v-model="registerForm.school_grade" class="grade-select">
                <option value="" disabled>请选择当前年级</option>
                <option
                  v-for="option in schoolGradeOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
            </el-form-item>
            <el-form-item label="出生年份（选填）">
              <el-input v-model="registerForm.birth_year" maxlength="4" placeholder="如 2002" />
            </el-form-item>
            <el-button type="primary" class="full-btn" @click="doRegister">注册</el-button>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
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

const activeTab = ref<'login' | 'register'>('login');
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
  school_grade: '',
  birth_year: '',
});

const schoolGradeOptions = [
  { value: 'grade_1', label: '1年级' },
  { value: 'grade_2', label: '2年级' },
  { value: 'grade_3', label: '3年级' },
  { value: 'grade_4', label: '4年级' },
  { value: 'grade_5', label: '5年级' },
  { value: 'grade_6', label: '6年级' },
  { value: 'grade_7', label: '初一' },
  { value: 'grade_8', label: '初二' },
  { value: 'grade_9', label: '初三' },
  { value: 'grade_10', label: '高一' },
  { value: 'grade_11', label: '高二' },
  { value: 'grade_12', label: '高三' },
  { value: 'college', label: '大一~大二（本科）' },
  { value: 'exam', label: '大三~大四 / 考研英专' },
  { value: 'graduate', label: '硕士 / 博士' },
  { value: 'advanced', label: '留学 / 考试 / 发表' },
];

function switchToLoginForRegisteredPhone(phone: string) {
  const normalizedPhone = String(phone || '').trim();
  activeTab.value = 'login';
  loginForm.phone = normalizedPhone;
  loginForm.code = '';
}

function promptRegisteredPhoneAndGoLogin(phone: string) {
  const normalizedPhone = String(phone || '').trim();
  ElMessageBox.alert('该手机号已被注册，请返回登录页面进行登录', '提示', {
    confirmButtonText: '去登录',
    type: 'warning',
    customClass: 'registered-phone-msgbox',
    confirmButtonClass: 'registered-phone-msgbox__confirm',
    closeOnClickModal: false,
  })
    .then(() => {
      switchToLoginForRegisteredPhone(normalizedPhone);
    })
    .catch(() => {});
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

  ui.showLoading('正在登录...');
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
  if (!registerForm.school_grade.trim()) {
    ElMessage.error('请选择当前年级');
    return;
  }

  ui.showLoading('正在注册...');
  try {
    const payload: Record<string, any> = {
      phone: registerForm.phone.trim(),
      code: registerForm.code.trim(),
      school_grade: registerForm.school_grade.trim(),
    };
    if (registerForm.nickname.trim()) payload.nickname = registerForm.nickname.trim();
    if (registerForm.birth_year.trim()) payload.birth_year = Number(registerForm.birth_year.trim());

    const res = await api.post('/auth/register', payload);
    if (!res?.success && res?.code === 'PHONE_ALREADY_REGISTERED') {
      promptRegisteredPhoneAndGoLogin(registerForm.phone);
      return;
    }

    if (!res?.success || !res?.data?.token) {
      ElMessage.error(res?.message || '注册失败');
      return;
    }

    api.setToken(res.data.token);
    await applyProfile(res.data.user);
    ElMessage.success('注册成功');
    router.replace('/vocab-assessment/intro');
  } finally {
    ui.hideLoading();
  }
}
</script>

<style scoped>
.grade-select {
  width: 100%;
  height: 40px;
  border-radius: 10px;
  border: 1px solid rgba(201, 162, 69, 0.6);
  background: rgba(6, 13, 38, 0.88);
  color: #f5e8ba;
  padding: 0 12px;
  outline: none;
  font-size: 15px;
}

.grade-select:focus {
  border-color: rgba(238, 204, 118, 0.95);
}

.grade-select option {
  background: #1c2647;
  color: #f6e8b8;
}

.grade-select option[value=''] {
  color: #a7b0d2;
}
</style>
