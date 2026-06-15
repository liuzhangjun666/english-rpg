<template>
  <Teleport to="body">
    <transition name="fade">
      <div v-if="visible" class="cultivation-profile-panel profile-overlay" @click.self="closePanel">
        <div class="profile-container">
          <!-- 头部信息区 -->
          <div class="profile-header">
            <div class="profile-header-info">
              <!-- 头像 -->
              <div class="avatar-wrapper" title="点击更换道影" @click="triggerAvatarUpload">
                <img :src="user.avatar_url || defaultAvatar" class="profile-header-avatar" alt="avatar">
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
                  <span class="sub-title">的仙躯 · 命盘</span>
                </div>
                
                <div class="header-actions">
                  <span class="header-action-btn">📤 邀请道友</span>
                  <span class="header-action-btn">🔄 温故复盘</span>
                  <span class="header-action-btn">📋 护道人</span>
                  <span class="header-action-btn text-danger">退出登出</span>
                </div>
              </div>
            </div>
            <button class="profile-close-btn" @click="closePanel">关闭</button>
          </div>

          <!-- 主体内容区 -->
          <div class="profile-body">
            <!-- 左侧：仙躯核心与六维 -->
            <div class="profile-left-pane">
              <div class="profile-section-title">仙躯核心</div>
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
                  <div class="profile-stat-label">
                    <img :src="getAbilityIcon(key)" alt="" class="ability-icon">{{ formatAbilityName(key) }}
                  </div>
                  <div class="profile-eng-val">{{ val }}</div>
                </div>
              </div>
            </div>

            <!-- 右侧：命盘图鉴 -->
            <div class="profile-right-pane">
              <div class="profile-section-title">已通关命盘图鉴</div>
              <div class="fate-nodes-list">
                <div v-if="fateNodes.length === 0" class="fate-node-empty">
                  暂无命盘记录，去藏经阁推演天机吧。
                </div>
                <div v-else class="fate-node-item" v-for="node in fateNodes" :key="node.id">
                  <div class="fate-node-title">{{ node.title }}</div>
                  <div class="fate-node-desc">{{ node.description || node.hint || '' }}</div>
                </div>
              </div>

              <div class="profile-section-title section-mt">隐藏结局缺口</div>
              <div class="fate-nodes-list">
                <div class="fate-node-item hidden-gap-item" v-for="(item, idx) in hiddenGap.requirements" :key="idx">
                  <div class="fate-node-title">{{ item.label }}</div>
                  <div class="fate-node-desc">{{ item.progressText }}</div>
                </div>
                <div class="fate-node-item hidden-gap-status" :class="hiddenGap.ready ? 'is-ready' : 'not-ready'">
                  <div class="fate-node-title">{{ hiddenGap.ready ? '条件已满足' : '尚未满足' }}</div>
                  <div class="fate-node-desc">{{ hiddenGap.summary }}</div>
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
import { ref, computed, onMounted, nextTick } from 'vue';

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
}>();

// 状态
const user = ref<any>({});
const isEditingNickname = ref(false);
const editNicknameValue = ref('');
const fileInput = ref<HTMLInputElement | null>(null);
const nicknameInputRef = ref<HTMLInputElement | null>(null);

const defaultAvatar = '/images/avatar_default.png'; // 根据实际情况调整路径

// 获取数据
onMounted(async () => {
  if (props.visible) {
    await fetchProfileData();
  }
});

const fetchProfileData = async () => {
  // TODO: 使用实际的 API 获取数据
  // const res = await api.get('/user/profile');
  // if (res.success) user.value = res.data;
  
  // 模拟数据
  user.value = {
    nickname: '修仙狂徒',
    dao_heart: 100,
    story_keys: 5,
    exp: 3000,
    vocabulary: 120,
    grammar: 80,
    reading: 90,
    listening: 60,
    speaking: 40,
    writing: 50
  };
};

// 计算属性
const dimensions = computed(() => ({
  vocabulary: Number(user.value.vocabulary || 0),
  grammar: Number(user.value.grammar || 0),
  reading: Number(user.value.reading || 0),
  listening: Number(user.value.listening || 0),
  speaking: Number(user.value.speaking || 0),
  writing: Number(user.value.writing || 0),
}));

const currentRealmLabel = computed(() => '筑基中期'); // TODO: 替换为实际计算逻辑
const fateNodes = computed(() => []); // TODO: 替换为实际计算逻辑
const hiddenGap = computed(() => ({
  requirements: [
    { label: '隐藏道具 A', progressText: '已获取 1/1' },
    { label: '修为要求', progressText: '当前 3000 / 5000' }
  ],
  ready: false,
  summary: '还差一点点修为即可解锁隐藏结局。'
}));

// 方法
const closePanel = () => {
  emit('update:visible', false);
};

const triggerAvatarUpload = () => {
  fileInput.value?.click();
};

const handleAvatarUpload = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) {
    console.log('上传头像:', file);
    // TODO: 实现上传逻辑
  }
};

const startEditNickname = async () => {
  editNicknameValue.value = user.value.nickname || '';
  isEditingNickname.value = true;
  await nextTick();
  nicknameInputRef.value?.focus();
  nicknameInputRef.value?.select();
};

const finishEditNickname = () => {
  if (!isEditingNickname.value) return;
  isEditingNickname.value = false;
  if (editNicknameValue.value.trim() !== '') {
    user.value.nickname = editNicknameValue.value.trim();
    // TODO: 调用 API 保存昵称
  }
};

const formatAbilityName = (key: string) => {
  const map: Record<string, string> = {
    vocabulary: '词汇', grammar: '语法', reading: '阅读',
    listening: '听力', speaking: '口语', writing: '写作'
  };
  return map[key] || key;
};

const getAbilityIcon = (key: string) => `/images/icons/${key}.png`; // 替换为实际图标路径

</script>

<style scoped>
/* 核心布局 */
.profile-overlay {
  position: fixed;
  top: 0; left: 0; width: 100vw; height: 100vh;
  background: rgba(10, 10, 26, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
}
.profile-container {
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  background: #1a1a2e;
  border: 2px solid var(--gold);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
}

/* 头部 */
.profile-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: rgba(255,255,255,0.05);
  border-bottom: 1px solid rgba(212,168,67,0.3);
}
.profile-header-info {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
}
.avatar-wrapper {
  position: relative;
  width: 48px;
  height: 48px;
  cursor: pointer;
  flex-shrink: 0;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid var(--gold);
}
.profile-header-avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
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
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
