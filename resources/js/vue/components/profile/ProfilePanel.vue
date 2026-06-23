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
              <input
                ref="fileInput"
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                class="hidden-input"
                @change="handleAvatarUpload"
              >

              <div class="profile-header-meta">
                <div class="nickname-row">
                  <span
                    v-if="!isEditingNickname"
                    class="nickname-display"
                    title="点击修改道号"
                    @click="startEditNickname"
                  >{{ profile.nickname || '匿名前辈' }}</span>
                  <input
                    v-else
                    ref="nicknameInputRef"
                    v-model="editNicknameValue"
                    class="nickname-input"
                    maxlength="50"
                    @blur="finishEditNickname"
                    @keyup.enter="finishEditNickname"
                    @keyup.esc="cancelEditNickname"
                  >
                  <span class="profile-subtitle">的仙躯 · 命盘</span>
                </div>
                <div class="header-actions">
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
                      <div class="realm-progress-fill" :class="row.className" :style="{ width: `${row.percent}%` }"></div>
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
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { resolveProfileRealm } from '../../../utils/cultivation.js';
import { useApiClient } from '../../services/api';
import { refreshUserProfileFromApi } from '../../services/profile';
import { useLegacyBridge } from '../../composables/useLegacyBridge';
import { useUserStore } from '../../stores/user';
import { useUiStore } from '../../stores/ui';
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
const isEditingNickname = ref(false);
const editNicknameValue = ref('');
const progressLoading = ref(false);
const realmProgress = ref<Record<string, any> | null>(null);

const profile = computed(() => user.profile || {});
const currentRealmLabel = computed(() => resolveProfileRealm(profile.value) || '练气一层');
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

.text-red { color: #ff9e9e; }
.text-gold { color: #d4a843; }
.text-blue { color: #8cc5ff; }
.text-danger { color: var(--cinnabar, #ff6b6b); }

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
</style>
