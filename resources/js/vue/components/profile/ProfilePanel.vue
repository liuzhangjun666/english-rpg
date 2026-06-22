<template>
  <transition name="slide-right">
    <div v-if="visible" class="drawer-overlay cultivation-theme" @click.self="closePanel">
      <div class="drawer-container">
        <div class="drawer-header">
          <div class="card-header" style="font-size: 20px;">
            🪔 个人洞府
          </div>
          <button class="drawer-close-btn" @click="closePanel">关闭</button>
        </div>

        <div class="drawer-body">
          <div class="profile-scroll">
            <!-- 头部信息区 -->
            <div class="profile-header">
              <div class="profile-header-info">
                <!-- 头像：图片加载失败时降级为渐变 + 首字符，避免破图占位 -->
                <div class="avatar-wrapper" title="点击更换道影" @click="triggerAvatarUpload">
                  <img
                    v-if="user.avatar_url && !avatarBroken"
                    :src="user.avatar_url"
                    class="profile-header-avatar"
                    alt=""
                    @error="avatarBroken = true"
                  >
                  <div v-else class="profile-header-avatar avatar-fallback">
                    {{ avatarInitial }}
                  </div>
                  <div class="avatar-hover-mask">更换</div>
                </div>
                <input type="file" ref="fileInput" accept="image/png, image/jpeg, image/gif, image/webp" class="hidden-input" @change="handleAvatarUpload">
                
                <!-- 昵称与操作 -->
                <div class="user-meta">
                  <div class="nickname-row">
                    <span v-if="!isEditingNickname" class="nickname-display" title="点击修改道号" @click="startEditNickname">
                      {{ user.nickname || '匿名前辈' }}
                    </span>
                    <input 
                      v-else 
                      ref="nicknameInputRef"
                      type="text" 
                      v-model="editNicknameValue" 
                      class="nickname-input" 
                      maxlength="50"
                      @blur="finishEditNickname"
                      @keyup.enter="finishEditNickname"
                    >
                  </div>
                  <div class="header-actions">
                    <span class="header-action-btn" @click="showInvite = true">📤 邀请道友</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 主体内容区 -->
            <div class="profile-section-title mt-4">仙躯核心</div>
            <div class="profile-stats-grid">
              <div class="profile-stat-item">
                <span class="profile-stat-label">当前境界</span>
                <span class="profile-stat-val realm-badge">{{ currentRealmLabel }}</span>
              </div>
              <div class="profile-stat-item">
                <span class="profile-stat-label">道心值</span>
                <span class="profile-stat-val text-red">{{ user.dao_heart || 0 }}</span>
              </div>
              <div class="profile-stat-item">
                <span class="profile-stat-label">剧情钥匙</span>
                <span class="profile-stat-val text-blue">{{ user.story_keys || 0 }}</span>
              </div>
              <div class="profile-stat-item">
                <span class="profile-stat-label">修为灵气</span>
                <span class="profile-stat-val">⚡ {{ user.exp || 0 }}</span>
              </div>
            </div>

            <div class="profile-section-title">英语根骨 (六维)</div>
            <div class="profile-eng-grid">
              <div class="profile-eng-item" v-for="(val, key) in dimensions" :key="key">
                <div class="profile-stat-label">{{ formatAbilityName(key) }}</div>
                <div class="profile-eng-val">{{ val }}</div>
              </div>
            </div>

            <div class="profile-section-title">命盘图鉴</div>
            <div class="fate-nodes-list">
              <div v-if="fateNodes.length === 0" class="fate-node-empty">
                暂无命盘记录。
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 招募道友（嵌在 ProfilePanel 内的居中模态） -->
      <InviteFriendsPanel v-model:visible="showInvite" />
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import { useUserStore } from '../../stores/user';
import InviteFriendsPanel from './InviteFriendsPanel.vue';

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
}>();

const userStore = useUserStore();
// 唯一数据源：Pinia user store。本组件不再持有副本，避免和 TopHud 显示不一致。
const user = computed(() => userStore.profile || {});
// 本地持久化 key：未接后端时把头像 dataURL 存进来，刷新后可还原
const AVATAR_LS_KEY = 'levelup_user_avatar';

const isEditingNickname = ref(false);
const editNicknameValue = ref('');
const fileInput = ref<HTMLInputElement | null>(null);
const nicknameInputRef = ref<HTMLInputElement | null>(null);
const avatarBroken = ref(false);
const showInvite = ref(false);

// 面板打开时重置头像错误标记，避免一次加载失败后永远显示降级
watch(
  () => props.visible,
  (v) => {
    if (v) avatarBroken.value = false;
  },
);

const avatarInitial = computed(() => {
  const name = String(user.value?.nickname || '匿名前辈').trim();
  return name.charAt(0) || '道';
});

// 测试数据 fetchProfileData 已移除：本组件不再持有副本数据，
// 真实数据由 auth bootstrap 写入 userStore.profile，本组件 reactive 读取。

const dimensions = computed(() => ({
  vocabulary: Number(user.value.vocabulary || 0),
  grammar: Number(user.value.grammar || 0),
  reading: Number(user.value.reading || 0),
  listening: Number(user.value.listening || 0),
  speaking: Number(user.value.speaking || 0),
  writing: Number(user.value.writing || 0),
}));

// 与 TopHud 同源：读 userStore.profile.current_realm；缺失时显示占位
const currentRealmLabel = computed(() => String(user.value?.current_realm || '凡人').trim());
const fateNodes = computed(() => Array.isArray(user.value?.fate_nodes) ? user.value.fate_nodes : []);

const closePanel = () => {
  emit('update:visible', false);
};

const triggerAvatarUpload = () => {
  fileInput.value?.click();
};

const handleAvatarUpload = (e: Event) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  // 类型校验：accept 属性只是建议，用户改后缀也能绕过，必须代码层兜底
  if (!/^image\/(png|jpe?g|gif|webp)$/i.test(file.type)) {
    ElMessage.error('请选择 PNG / JPG / GIF / WebP 格式的图片');
    input.value = '';
    return;
  }
  // 大小限制 5MB —— 头像图通常远小于此，超大基本是误选
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error('图片不能超过 5MB');
    input.value = '';
    return;
  }

  // 本地预览：FileReader → dataURL → 写入 Pinia store（TopHud 同步更新）+ localStorage（刷新保留）
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = String(reader.result || '');
    userStore.updateProfile({ avatar_url: dataUrl });
    try { localStorage.setItem(AVATAR_LS_KEY, dataUrl); } catch { /* 超 5MB 配额则放弃持久化，内存里仍生效 */ }
    avatarBroken.value = false;
    ElMessage.success('头像已更换');
    // TODO: 后端接口就绪后，这里改为：
    //   const fd = new FormData(); fd.append('avatar', file);
    //   const res = await api.post('/user/avatar', fd);
    //   userStore.updateProfile({ avatar_url: res.data.url });
    //   localStorage.removeItem(AVATAR_LS_KEY); // 不再需要本地持久化
  };
  reader.onerror = () => {
    ElMessage.error('读取图片失败，请换一张试试');
  };
  reader.readAsDataURL(file);

  // 清空 input.value，避免选同一张图时 @change 不触发
  input.value = '';
};

const startEditNickname = async () => {
  editNicknameValue.value = user.value.nickname || '';
  isEditingNickname.value = true;
  await nextTick();
  nicknameInputRef.value?.focus();
};

const finishEditNickname = () => {
  if (!isEditingNickname.value) return;
  isEditingNickname.value = false;
  const next = editNicknameValue.value.trim();
  if (next && next !== user.value.nickname) {
    // 写到 store —— TopHud 等所有引用方都会同步刷新
    userStore.updateProfile({ nickname: next });
    // TODO: 后端就绪后 await api.post('/user/nickname', { nickname: next })
  }
};

const formatAbilityName = (key: string) => {
  const map: Record<string, string> = {
    vocabulary: '词汇', grammar: '语法', reading: '阅读',
    listening: '听力', speaking: '口语', writing: '写作'
  };
  return map[key] || key;
};
</script>

<style scoped>
.slide-right-enter-active, .slide-right-leave-active { transition: transform 0.3s ease; }
.slide-right-enter-from, .slide-right-leave-to { transform: translateX(100%); }

.drawer-overlay {
  position: fixed;
  top: 0; left: 0; width: 100vw; height: 100vh;
  background: rgba(10, 10, 26, 0.6);
  z-index: 2000;
  display: flex;
  justify-content: flex-end;
  backdrop-filter: blur(3px);
}

.drawer-container {
  width: 460px;
  max-width: 100%;
  height: 100vh;
  background: #1a1a2e;
  border-left: 2px solid var(--gold, #d4a843);
  display: flex;
  flex-direction: column;
  box-shadow: -10px 0 30px rgba(0,0,0,0.6);
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: rgba(255,255,255,0.05);
  border-bottom: 1px solid rgba(212,168,67,0.3);
  color: var(--gold);
}

.drawer-close-btn {
  background: transparent;
  border: 1px solid var(--gold);
  color: var(--gold);
  padding: 6px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.drawer-body { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
/* 底部留出 40px 安全区，避免最后一行（暂无命盘记录）贴着视口边缘被裁 */
.profile-scroll { flex: 1; overflow-y: auto; padding: 20px 20px 40px; }

.profile-header { margin-bottom: 20px; }
.profile-header-info { display: flex; align-items: center; gap: 16px; }

.avatar-wrapper {
  position: relative;
  width: 60px;
  height: 60px;
  cursor: pointer;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid var(--gold);
}
.profile-header-avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.avatar-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #3a2a5a 0%, #1a3a5a 60%, #0e2440 100%);
  color: #f3d481;
  font-family: 'Ma Shan Zheng', 'STXingkai', 'KaiTi', serif;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 0;
  text-shadow: 0 0 8px rgba(243, 212, 129, 0.6);
}
.avatar-hover-mask {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: white;
  opacity: 0;
  transition: opacity 0.2s;
}
.avatar-wrapper:hover .avatar-hover-mask {
  opacity: 1;
}
.hidden-input {
  display: none;
}
.user-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}
.nickname-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.nickname-display {
  font-size: 20px;
  font-weight: bold;
  color: var(--gold);
  cursor: pointer;
  border-bottom: 1px dashed var(--gold);
}
.nickname-input {
  background: rgba(0,0,0,0.5);
  border: 1px solid var(--gold);
  color: #fff;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 18px;
  width: 140px;
  outline: none;
}
.sub-title {
  font-size: 14px;
  color: var(--parchment);
  opacity: 0.8;
}
.header-actions {
  display: flex;
  gap: 12px;
  font-size: 13px;
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
.text-danger {
  color: var(--cinnabar, #ff6b6b);
}
.profile-close-btn {
  background: transparent;
  border: 1px solid var(--gold);
  color: var(--gold);
  padding: 6px 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}
.profile-close-btn:hover {
  background: rgba(212,168,67,0.2);
}

/* 主体 */
.profile-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}
.profile-left-pane {
  flex: 1;
  padding: 20px;
  border-right: 1px solid rgba(212,168,67,0.2);
  overflow-y: auto;
}
.profile-right-pane {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background: rgba(0,0,0,0.2);
}
.profile-section-title {
  font-size: 16px;
  font-weight: bold;
  color: var(--gold-light);
  margin-bottom: 12px;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(212,168,67,0.2);
}
.section-mt {
  margin-top: 24px;
}

/* 统计网格 */
.profile-stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}
.profile-stat-item {
  background: rgba(255,255,255,0.05);
  padding: 10px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.profile-stat-label {
  font-size: 12px;
  color: var(--parchment-dark);
}
.profile-stat-val {
  font-size: 16px;
  font-weight: bold;
}
.text-red { color: #ff9e9e; }
.text-blue { color: #8cc5ff; }
.realm-badge { color: var(--gold); }

/* 六维网格 */
.profile-eng-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 24px;
}
.profile-eng-item {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(212,168,67,0.1);
  padding: 8px;
  border-radius: 6px;
  text-align: center;
}
.ability-icon {
  width: 14px;
  height: 14px;
  vertical-align: middle;
  margin-right: 4px;
}
.profile-eng-val {
  font-size: 18px;
  color: var(--gold);
  margin-top: 4px;
  font-weight: bold;
}

/* 命盘列表 */
.fate-nodes-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.fate-node-empty {
  color: var(--parchment-dark);
  font-size: 13px;
  text-align: center;
  padding: 20px;
}
.fate-node-item {
  background: rgba(255,255,255,0.05);
  border-left: 3px solid var(--gold);
  padding: 10px 12px;
  border-radius: 0 6px 6px 0;
}
.fate-node-title {
  font-size: 14px;
  color: var(--gold-light);
  font-weight: bold;
  margin-bottom: 4px;
}
.fate-node-desc {
  font-size: 12px;
  color: var(--parchment);
}
.hidden-gap-item {
  padding: 8px 10px;
  border-left-color: rgba(212,168,67,0.5);
}
.hidden-gap-status {
  padding: 8px 10px;
  border: 1px solid;
  border-left-width: 4px;
}
.hidden-gap-status.is-ready {
  background: rgba(78,192,122,0.1);
  border-color: rgba(78,192,122,0.45);
}
.hidden-gap-status.not-ready {
  background: rgba(212,168,67,0.05);
  border-color: rgba(212,168,67,0.25);
}

/* 过渡动画 */
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.slide-right-enter-from,
.slide-right-leave-to {
  opacity: 0;
}
.slide-right-enter-from .drawer-container,
.slide-right-leave-to .drawer-container {
  transform: translateX(100%);
}
</style>
