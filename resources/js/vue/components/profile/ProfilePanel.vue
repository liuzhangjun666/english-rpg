<template>
  <Teleport to="body">
    <transition name="profile-fade">
      <div v-if="visible" class="profile-backdrop cultivation-theme" @click.self="closePanel">
        <div class="cultivation-profile-panel" id="profile-panel">
          <div class="profile-header">
            <div class="profile-header-title">
              <div class="avatar-trigger" title="点击更换道影" @click="triggerAvatarUpload">
                <img :src="profile.avatar_url || defaultAvatar" class="profile-header-avatar" alt="avatar">
                <div class="avatar-hover-mask">更换</div>
              </div>
              <input ref="fileInput" type="file" accept="image/png,image/jpeg,image/gif,image/webp" class="hidden-input"
                @change="handleAvatarUpload">

              <div class="profile-header-meta">
                <div class="nickname-row">
                  <span v-if="!isEditingNickname" class="nickname-display" title="点击修改道号" @click="startEditNickname">{{
                    profile.nickname || '匿名前辈' }}</span>
                  <input v-else ref="nicknameInputRef" v-model="editNicknameValue" class="nickname-input" maxlength="50"
                    @blur="finishEditNickname" @keyup.enter="finishEditNickname" @keyup.esc="cancelEditNickname">
                  <span class="profile-subtitle">的仙躯 · 命盘</span>
                </div>
                <div class="header-actions">
                  <span class="header-action-btn" @click="openPasswordModal">🔒 {{ hasPassword ? '修改密令' : '设置密令' }}</span>
                  <span class="header-action-btn" @click="shareInvite">📤 邀请道友</span>
                  <span class="header-action-btn" @click="openReview">🔄 温故复盘</span>
                  <span class="header-action-btn" @click="openParentDashboard">📋 护道人</span>
                  <span class="header-action-btn text-danger" @click="logout">退出登出</span>
                </div>
              </div>
            </div>
            <button type="button" class="profile-close-btn" @click="closePanel">关闭</button>
          </div>

          <div class="profile-body">
            <div class="profile-main-pane">
              <div class="profile-section-title">仙躯核心</div>
              <div class="profile-stats-grid">
                <div class="profile-stat-item">
                  <span class="profile-stat-label">当前境界</span>
                  <span class="profile-stat-val">{{ currentRealmLabel }}</span>
                </div>
                <div class="profile-stat-item">
                  <span class="profile-stat-label">道心值</span>
                  <span class="profile-stat-val text-red">{{ profile.dao_heart || 0 }}</span>
                </div>
                <div class="profile-stat-item">
                  <span class="profile-stat-label">剧情钥匙</span>
                  <span class="profile-stat-val text-blue">{{ profile.story_keys || 0 }}</span>
                </div>
                <div class="profile-stat-item">
                  <span class="profile-stat-label">修为灵气</span>
                  <span class="profile-stat-val">⚡ {{ profile.exp || 0 }}</span>
                </div>
                <div v-if="equippedTitle" class="profile-stat-item">
                  <span class="profile-stat-label">佩戴称号</span>
                  <span class="profile-stat-val text-gold">「{{ equippedTitle }}」</span>
                </div>
              </div>

              <div class="profile-section-title">境界进度</div>
              <div class="realm-profile-progress">
                <div v-if="progressLoading" class="realm-profile-loading">正在推演境界数据...</div>
                <template v-else-if="realmProgress">
                  <div class="realm-profile-topline">{{ realmProgress.currentRealm }}</div>
                  <div class="realm-profile-meta">
                    修为值：{{ realmProgress.energy }} · 距离下一层：{{ realmProgress.remain }}
                  </div>
                  <div v-for="row in realmProgress.rows" :key="row.label" class="realm-progress-row">
                    <div class="realm-progress-label">{{ row.label }}</div>
                    <div class="realm-progress-track">
                      <div class="realm-progress-fill" :class="row.className" :style="{ width: `${row.percent}%` }">
                      </div>
                    </div>
                    <div class="realm-progress-value">{{ row.percent }}%</div>
                  </div>
                  <div class="realm-profile-note">{{ realmProgress.note }}</div>
                  <div class="realm-profile-dimensions">
                    <span v-for="chip in realmProgress.dimensionChips" :key="chip.key" class="realm-dimension-chip">
                      <img :src="chip.icon" alt="">
                      <span>{{ chip.label }} {{ chip.value }}</span>
                    </span>
                  </div>
                </template>
              </div>

              <div class="profile-section-title">英语根骨 (六维)</div>
              <div class="profile-eng-grid">
                <div v-for="item in abilityItems" :key="item.key" class="profile-eng-item">
                  <div class="profile-stat-label">
                    <img :src="item.icon" alt="" class="ability-icon">
                    {{ item.label }}
                  </div>
                  <div class="profile-eng-val">{{ item.value }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>

  <Teleport to="body">
    <transition name="profile-fade">
      <div v-if="showPasswordModal" class="password-modal-backdrop" @click.self="closePasswordModal">
        <div class="password-modal">
          <div class="password-modal-head">
            <h3>{{ hasPassword ? '修改护道密令' : '设置护道密令' }}</h3>
            <button type="button" class="profile-close-btn" @click="closePasswordModal">关闭</button>
          </div>
          <form class="password-form" @submit.prevent="submitPassword">
            <div v-if="!hasPassword" class="password-field code-field">
              <input v-model="passwordForm.code" type="text" maxlength="6" placeholder="短信验证码">
              <button type="button" class="password-code-btn" :disabled="passwordCodeCountdown > 0"
                @click="sendPasswordCode">
                {{ passwordCodeCountdown > 0 ? `${passwordCodeCountdown}s` : '获取验证码' }}
              </button>
            </div>
            <div v-else class="password-field">
              <input v-model="passwordForm.current_password" type="password" maxlength="64" placeholder="当前密码">
            </div>
            <div class="password-field">
              <input v-model="passwordForm.password" type="password" maxlength="64" placeholder="新密码（至少6位）">
            </div>
            <div class="password-field">
              <input v-model="passwordForm.password_confirmation" type="password" maxlength="64" placeholder="确认新密码">
            </div>
            <button type="submit" class="password-submit-btn">{{ hasPassword ? '保存修改' : '确认设置' }}</button>
          </form>
        </div>
      </div>
    </transition>
  </Teleport>

  <InviteFriendsPanel v-model:visible="showInvitePanel" />
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { resolveProfileRealm, getDisplayRealm } from '../../../utils/cultivation.js';
import { useApiClient } from '../../services/api';
import { refreshUserProfileFromApi } from '../../services/profile';
import { useLegacyBridge } from '../../composables/useLegacyBridge';
import { useUserStore } from '../../stores/user';
import { useUiStore } from '../../stores/ui';
import InviteFriendsPanel from './InviteFriendsPanel.vue';
import defaultAvatar from '../../../../assets/images/avatar_default.png';
import abilityReading from '../../../../assets/images/ui/ability_reading.png';
import abilityVocab from '../../../../assets/images/ui/ability_vocab.png';
import abilityGrammar from '../../../../assets/images/ui/ability_grammar.png';
import abilityListening from '../../../../assets/images/ui/ability_listening.png';
import abilityWriting from '../../../../assets/images/ui/ability_writing.png';
import abilitySpeaking from '../../../../assets/images/ui/ability_speaking.png';

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'open-review'): void;
  (e: 'open-parent'): void;
}>();

const api = useApiClient();
const user = useUserStore();
const ui = useUiStore();
const bridge = useLegacyBridge();

const fileInput = ref<HTMLInputElement | null>(null);
const nicknameInputRef = ref<HTMLInputElement | null>(null);
const showInvitePanel = ref(false);
const showPasswordModal = ref(false);
const passwordCodeCountdown = ref(0);
const passwordForm = ref({
  code: '',
  current_password: '',
  password: '',
  password_confirmation: '',
});
const isEditingNickname = ref(false);
const editNicknameValue = ref('');
const progressLoading = ref(false);
const realmProgress = ref<Record<string, any> | null>(null);

const profile = computed(() => user.profile || {});
const hasPassword = computed(() => Boolean(profile.value?.has_password));
const currentRealmLabel = computed(() => getDisplayRealm(profile.value));
const equippedTitle = computed(() => {
  const pc = profile.value?.progress_currency;
  if (pc && typeof pc === 'object' && pc.equipped_title) {
    return String(pc.equipped_title);
  }
  return profile.value?.equipped_title ? String(profile.value.equipped_title) : '';
});

const abilityIcons: Record<string, string> = {
  vocabulary: abilityVocab,
  grammar: abilityGrammar,
  reading: abilityReading,
  listening: abilityListening,
  speaking: abilitySpeaking,
  writing: abilityWriting,
};

const abilityLabels: Record<string, string> = {
  vocabulary: '词汇',
  grammar: '语法',
  reading: '阅读',
  listening: '听力',
  speaking: '口语',
  writing: '写作',
};

const abilityItems = computed(() =>
  Object.keys(abilityLabels).map((key) => ({
    key,
    label: abilityLabels[key],
    icon: abilityIcons[key],
    value: Number(profile.value[key] || 0),
  }))
);

watch(() => props.visible, async (val) => {
  if (!val) return;
  ui.showLoading('正在推演命盘天机...');
  try {
    await refreshUserProfileFromApi();
    await loadRealmProgress();
  } finally {
    ui.hideLoading();
  }
});

async function loadRealmProgress() {
  progressLoading.value = true;
  realmProgress.value = null;
  try {
    const res = await api.get('/user/learning-progress');
    const data = res?.success ? (res.data || {}) : {};
    const fallbackDimensions = {
      vocabulary: Number(profile.value.vocabulary || 0),
      grammar: Number(profile.value.grammar || 0),
      reading: Number(profile.value.reading || 0),
      listening: Number(profile.value.listening || 0),
      writing: Number(profile.value.writing || 0),
      speaking: Number(profile.value.speaking || 0),
    };
    const percent = Math.max(0, Math.min(100, Number(data.realm_progress_percent ?? 0)));
    const currentRealm = resolveProfileRealm({ ...profile.value, current_realm: data.current_realm }) || currentRealmLabel.value;
    const energy = Number(data.cultivation_energy ?? profile.value.cultivation_energy ?? 0);
    const remain = Number(data.remaining_energy_to_next_realm ?? 0);
    const conditions = data.breakthrough_conditions || {};
    const abilityCondition = conditions.abilities || {};
    const energyCondition = conditions.energy || {};
    const dimensions = data.six_dimensions || fallbackDimensions;
    const requiredAbility = Number(abilityCondition.required_each ?? 0);
    const abilityAvg = Object.keys(abilityLabels).reduce((acc, key) => acc + Number(dimensions[key] || 0), 0) / 6;
    const abilityPercent = requiredAbility > 0
      ? Math.max(0, Math.min(100, Math.round((abilityAvg / requiredAbility) * 100)))
      : 0;
    const readyPercent = data.can_breakthrough ? 100 : Math.min(percent, abilityPercent || percent);
    const remainPercent = Math.max(0, 100 - percent);
    const abilityRequiredEach = typeof abilityCondition.required_each === 'number'
      ? abilityCondition.required_each
      : '按当前境界条件';

    realmProgress.value = {
      currentRealm,
      energy,
      remain,
      note: `突破条件：修为 ${energyCondition.current ?? energy}/${energyCondition.required ?? energy}，六维单项 ≥ ${abilityRequiredEach}`,
      rows: [
        { label: '修为进度', percent: Math.round(percent), className: 'realm-progress-gold' },
        { label: '六维达标', percent: Math.round(abilityPercent), className: 'realm-progress-green' },
        { label: '突破准备', percent: Math.round(readyPercent), className: 'realm-progress-blue' },
        { label: '瓶颈压力', percent: Math.round(remainPercent), className: 'realm-progress-red' },
      ],
      dimensionChips: Object.keys(abilityLabels).map((key) => ({
        key,
        label: abilityLabels[key],
        icon: abilityIcons[key],
        value: Number(dimensions[key] || 0),
      })),
    };

    user.updateProfile({
      ...(data.current_realm ? { current_realm: data.current_realm } : {}),
      cultivation_energy: energy,
      vocabulary: Number(dimensions.vocabulary || 0),
      grammar: Number(dimensions.grammar || 0),
      reading: Number(dimensions.reading || 0),
      listening: Number(dimensions.listening || 0),
      writing: Number(dimensions.writing || 0),
      speaking: Number(dimensions.speaking || 0),
    });
  } catch {
    realmProgress.value = null;
  } finally {
    progressLoading.value = false;
  }
}

function closePanel() {
  emit('update:visible', false);
}

function triggerAvatarUpload() {
  fileInput.value?.click();
}

async function handleAvatarUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const formData = new FormData();
  formData.append('avatar', file);
  ui.showLoading('正在凝结道影...');
  try {
    const res = await api.post('/user/avatar', formData);
    if (res?.success) {
      user.updateProfile({ avatar_url: res.data.avatar_url });
      ElMessage.success('道影已焕然一新。');
      window.dispatchEvent(new CustomEvent('profile-updated', { detail: res.data }));
    } else {
      ElMessage.error(res?.message || '道影凝结失败');
    }
  } catch {
    ElMessage.error('道影凝结失败');
  } finally {
    ui.hideLoading();
    if (fileInput.value) fileInput.value.value = '';
  }
}

async function startEditNickname() {
  editNicknameValue.value = profile.value.nickname || '';
  isEditingNickname.value = true;
  await nextTick();
  nicknameInputRef.value?.focus();
  nicknameInputRef.value?.select();
}

function cancelEditNickname() {
  isEditingNickname.value = false;
  editNicknameValue.value = profile.value.nickname || '';
}

async function finishEditNickname() {
  if (!isEditingNickname.value) return;
  const next = editNicknameValue.value.trim();
  isEditingNickname.value = false;
  if (!next) {
    ElMessage.warning('请填写道号');
    return;
  }
  if (next === (profile.value.nickname || '')) return;
  try {
    const res = await api.put('/user/profile', { nickname: next });
    if (res?.success) {
      user.updateProfile({ nickname: res.data.nickname });
      ElMessage.success('道号已更新。');
      window.dispatchEvent(new CustomEvent('profile-updated', { detail: res.data }));
    } else {
      ElMessage.error('更新失败');
    }
  } catch {
    ElMessage.error('更新失败');
  }
}

async function shareInvite() {
  try {
    const res = await api.get('/share/info');
    const code = res?.success ? res.data.invite_code : '';
    const text = `我用 LevelUp 英语修仙学英语！🎯\n邀请码：${code}\n输入邀请码注册，我们各得灵力奖励！\n👉 一起来修炼吧～`;
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      ElMessage.success('邀请码已复制！分享给好友一起修炼吧 🎁');
      try { await api.post('/share/record'); } catch { /* ignore */ }
    } else {
      window.prompt('复制以下内容去分享：', text);
    }
  } catch {
    ElMessage.error('获取邀请码失败');
  }
}

function openReview() {
  closePanel();
  emit('open-review');
}

function openParentDashboard() {
  closePanel();
  emit('open-parent');
}

function resetPasswordForm() {
  passwordForm.value = {
    code: '',
    current_password: '',
    password: '',
    password_confirmation: '',
  };
  passwordCodeCountdown.value = 0;
}

function openPasswordModal() {
  resetPasswordForm();
  showPasswordModal.value = true;
}

function closePasswordModal() {
  showPasswordModal.value = false;
  resetPasswordForm();
}

function startPasswordCodeCountdown(seconds = 60) {
  passwordCodeCountdown.value = seconds;
  const timer = setInterval(() => {
    passwordCodeCountdown.value -= 1;
    if (passwordCodeCountdown.value <= 0) clearInterval(timer);
  }, 1000);
}

async function sendPasswordCode() {
  const res = await api.post('/auth/password/send-code', {});
  if (!res?.success) {
    ElMessage.error(res?.message || '发送失败');
    return;
  }
  if (res?.debug_code) {
    passwordForm.value.code = String(res.debug_code);
  }
  startPasswordCodeCountdown();
  ElMessage.success('验证码已发送');
}

async function submitPassword() {
  if (passwordForm.value.password.length < 6) {
    ElMessage.error('密码至少6位');
    return;
  }
  if (passwordForm.value.password !== passwordForm.value.password_confirmation) {
    ElMessage.error('两次输入的密码不一致');
    return;
  }
  if (!hasPassword.value && passwordForm.value.code.trim().length !== 6) {
    ElMessage.error('请输入验证码');
    return;
  }
  if (hasPassword.value && !passwordForm.value.current_password) {
    ElMessage.error('请输入当前密码');
    return;
  }

  ui.showLoading('正在更新密令...');
  try {
    const payload: Record<string, string> = {
      password: passwordForm.value.password,
      password_confirmation: passwordForm.value.password_confirmation,
    };
    if (hasPassword.value) {
      payload.current_password = passwordForm.value.current_password;
    } else {
      payload.code = passwordForm.value.code.trim();
    }

    const res = await api.post('/auth/password', payload);
    if (!res?.success) {
      ElMessage.error(res?.message || '更新失败');
      return;
    }

    user.updateProfile({ has_password: true });
    ElMessage.success(res?.message || '密令已更新');
    closePasswordModal();
  } finally {
    ui.hideLoading();
  }
}

function logout() {
  closePanel();
  window.dispatchEvent(new CustomEvent('auth:logout'));
}
</script>

<style scoped>
.profile-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2100;
  background: rgba(4, 8, 18, 0.72);
  backdrop-filter: blur(4px);
}

.profile-backdrop .cultivation-profile-panel {
  position: absolute;
  width: min(520px, 95%);
  height: auto;
  max-height: 90vh;
}

.profile-main-pane {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.avatar-trigger {
  position: relative;
  width: 48px;
  height: 48px;
  cursor: pointer;
  flex-shrink: 0;
}

.profile-header-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid var(--gold, #d4a843);
  object-fit: cover;
}

.avatar-hover-mask {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #fff;
  opacity: 0;
  transition: opacity 0.2s;
}

.avatar-trigger:hover .avatar-hover-mask {
  opacity: 1;
}

.hidden-input {
  display: none;
}

.profile-header-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  align-items: flex-start;
  line-height: 1.2;
}

.nickname-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}

.nickname-display {
  font-size: 20px;
  font-weight: bold;
  color: var(--gold, #d4a843);
  cursor: pointer;
  border-bottom: 1px dashed var(--gold, #d4a843);
}

.nickname-input {
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid var(--gold, #d4a843);
  color: #fff;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 18px;
  width: 140px;
  outline: none;
}

.profile-subtitle {
  font-size: 14px;
  color: var(--parchment, #f7f3e8);
  opacity: 0.8;
}

.header-actions {
  display: flex;
  gap: 12px;
  font-size: 13px;
  flex-wrap: wrap;
}

.header-action-btn {
  color: var(--primary, #8cc5ff);
  cursor: pointer;
  opacity: 0.8;
  transition: all 0.2s;
  user-select: none;
}

.header-action-btn:hover {
  opacity: 1;
  text-shadow: 0 0 5px currentColor;
  transform: scale(1.05);
}

.text-red {
  color: #ff9e9e;
}

.text-blue {
  color: #8cc5ff;
}

.text-danger {
  color: var(--cinnabar, #ff6b6b);
}

.ability-icon {
  width: 16px;
  height: 16px;
  object-fit: contain;
  vertical-align: middle;
  margin-right: 4px;
}

.profile-fade-enter-active,
.profile-fade-leave-active {
  transition: opacity 0.25s ease;
}

.profile-fade-enter-from,
.profile-fade-leave-to {
  opacity: 0;
}

.password-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2200;
  background: rgba(4, 8, 18, 0.78);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.password-modal {
  width: min(400px, 92vw);
  padding: 20px;
  border-radius: 16px;
  background: rgba(14, 28, 52, 0.95);
  border: 1px solid rgba(150, 210, 255, 0.3);
  box-shadow: 0 0 40px rgba(40, 90, 160, 0.35);
}

.password-modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.password-modal-head h3 {
  margin: 0;
  font-size: 18px;
  color: var(--gold, #d4a843);
}

.password-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.password-field {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(150, 210, 255, 0.2);
  border-radius: 10px;
  padding: 0 12px;
}

.password-field input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #eaf2ff;
  font-size: 14px;
  padding: 12px 0;
}

.password-field input::placeholder {
  color: #6f93b8;
}

.password-code-btn {
  white-space: nowrap;
  flex-shrink: 0;
  background: rgba(243, 201, 90, 0.12);
  border: 1px solid rgba(243, 201, 90, 0.4);
  color: #f3d98a;
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
}

.password-code-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.password-submit-btn {
  margin-top: 4px;
  padding: 12px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 15px;
  font-weight: bold;
  color: #3a2606;
  background: linear-gradient(135deg, #ffe6a0 0%, #f0c45e 45%, #cf9a34 100%);
}
</style>
