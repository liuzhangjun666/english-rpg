<template>
  <header ref="hudRef" class="top-hud cultivation-theme">
    <!-- 角饰 -->
    <span class="hud-corner corner-tl"></span>
    <span class="hud-corner corner-tr"></span>
    <span class="hud-corner corner-bl"></span>
    <span class="hud-corner corner-br"></span>

    <!-- LEFT 角色区 -->
    <div class="hud-left">
      <div class="avatar-box" @click="emit('open-profile')">
        <div class="avatar-frame">
          <img :src="user.profile?.avatar_url || defaultAvatar" class="avatar-img" alt="头像" />
        </div>
        <div class="avatar-ring"></div>
        <div class="avatar-ring outer"></div>
        <div class="avatar-level" :title="`修为 ${animatedExp}`">
          <span>{{ levelNumber }}</span>
        </div>
      </div>
      <div class="role-info">
        <div class="name-realm-row">
          <span class="role-name">{{ user.profile?.nickname || '匿名前辈' }}</span>
          <div class="realm-plaque">
            <span class="realm-text">{{ displayRealm }}</span>
          </div>
        </div>
        <div class="exp-bar-container">
          <div class="exp-bar-bg">
            <div class="exp-bar-fill" :style="{ width: expPercent + '%' }">
              <div class="exp-flow-light"></div>
            </div>
            <span class="exp-text">{{ animatedExp }} / {{ user.profile?.next_threshold ?? 100 }}</span>
          </div>
          <span class="hud-exp-text">修为 {{ animatedExp }} / {{ user.profile?.next_threshold ?? 100 }}</span>
        </div>
      </div>
    </div>

    <span class="hud-divider"></span>

    <!-- CENTER 资源区 -->
    <div class="hud-center">
      <div class="resource-item" title="词汇量">
        <span class="res-icon">📚</span>
        <div class="res-copy">
          <span class="res-value">{{ animatedVocab }}</span>
          <span class="res-label">词汇</span>
        </div>
      </div>
      <div class="resource-item" :title="spiritTitle">
        <span class="res-icon">⚡</span>
        <div class="res-copy">
          <span class="res-value">{{ spiritDisplay }}</span>
          <span class="res-label">{{ spiritSubLabel }}</span>
        </div>
      </div>
      <div class="resource-item" title="灵石">
        <span class="res-icon">💎</span>
        <div class="res-copy">
          <span class="res-value">{{ animatedSpiritStone }}</span>
          <span class="res-label">灵石</span>
        </div>
      </div>
    </div>

    <span class="hud-divider"></span>

    <!-- RIGHT 系统区 -->
    <div class="hud-right">
      <button class="map-btn" title="打开宗门地图" @click="ui.showMapOverlay()">
        <img class="map-btn-icon" :src="'/images/hud-icons/map.png'" alt="地图" />
        <span class="map-btn-label">宗门地图</span>
      </button>
      <div class="sys-group">
        <button class="sys-btn" title="传音信箱" @click="emit('open-mail')">
          <img class="sys-icon-img" :src="'/images/hud-icons/mail.png'" alt="邮件" />
          <span v-if="mail.unread > 0" class="sys-badge">{{ mail.unread > 99 ? '99+' : mail.unread }}</span>
        </button>
        <el-popover ref="settingsPopRef" placement="bottom-end" :width="160" trigger="click" popper-class="hud-settings-popover">
          <template #reference>
            <button class="sys-btn" title="设置">
              <img class="sys-icon-img" :src="'/images/hud-icons/settings.png'" alt="设置" />
            </button>
          </template>
          <div class="settings-menu">
            <div class="settings-item" @click="openSettings">
              <span class="item-icon">⚙️</span>
              <span>修炼设置</span>
            </div>
            <div class="settings-item" @click="emit('logout')">
              <span class="item-icon">🚪</span>
              <span>退出宗门</span>
            </div>
          </div>
        </el-popover>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useUserStore } from '../../stores/user';
import { useUiStore } from '../../stores/ui';
import { useMailStore } from '../../stores/mail';
import { getDisplayRealm } from '../../../utils/cultivation.js';
import { useCountUp } from '../../composables/useCountUp';
import { useSpiritPower } from '../../composables/useSpiritPower';
import gsap from 'gsap';
import defaultAvatarImg from '../../../../assets/images/avatar_default.png';

const emit = defineEmits<{
  (e: 'open-profile'): void;
  (e: 'logout'): void;
  (e: 'open-settings'): void;
  (e: 'open-mail'): void;
}>();

const user = useUserStore();
const ui = useUiStore();
const mail = useMailStore();
const defaultAvatar = defaultAvatarImg;
const settingsPopRef = ref<{ hide: () => void } | null>(null);

function openSettings() {
  settingsPopRef.value?.hide();
  emit('open-settings');
}

const animatedExp = useCountUp(() => user.profile?.exp ?? 0);
const animatedVocab = useCountUp(() => user.profile?.vocabulary ?? 0);
const animatedSpiritStone = useCountUp(() => user.profile?.spirit_stone ?? 0);
const { view: spiritView, spiritTitle } = useSpiritPower();

const spiritDisplay = computed(() => `${spiritView.value.current}/${spiritView.value.max}`);
const spiritSubLabel = computed(() => {
  if (spiritView.value.isNaturalFull) {
    return spiritView.value.current > spiritView.value.max ? '灵力·溢满' : '灵力·已满';
  }
  return `灵力 · ${spiritView.value.countdownText}`;
});

const expPercent = computed(() => {
  const current = user.profile?.exp ?? 0;
  const max = user.profile?.next_threshold ?? 100;
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, (current / max) * 100));
});

const powerPercent = computed(() => {
  const current = spiritView.value.current;
  const max = spiritView.value.max;
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, (Math.min(current, max) / max) * 100));
});

const levelNumber = computed(() => user.profile?.level ?? 1);
const displayRealm = computed(() => getDisplayRealm(user.profile));

const hudRef = ref<HTMLElement | null>(null);

const onMapDragEvent = (e: Event) => {
  const customEvent = e as CustomEvent;
  ui.setMapDragging(customEvent.detail);
};

onMounted(() => {
  window.addEventListener('map-drag', onMapDragEvent);
});

onUnmounted(() => {
  window.removeEventListener('map-drag', onMapDragEvent);
});

watch(() => ui.isMapDragging, (isDragging) => {
  if (!hudRef.value) return;
  if (isDragging) {
    gsap.to(hudRef.value, {
      height: 52,
      backgroundColor: 'rgba(11, 16, 32, 0.7)',
      duration: 0.4,
      ease: 'power2.out'
    });
    // 文字淡出
    gsap.to(hudRef.value.querySelectorAll('.role-name, .hud-exp-text, .realm-text, .res-label'), {
      opacity: 0,
      duration: 0.3
    });
  } else {
    gsap.to(hudRef.value, {
      height: 80,
      backgroundColor: 'rgba(11, 16, 32, 0.95)',
      duration: 0.4,
      ease: 'power2.out'
    });
    // 文字恢复
    gsap.to(hudRef.value.querySelectorAll('.role-name, .hud-exp-text, .realm-text, .res-label'), {
      opacity: 1,
      duration: 0.4,
      delay: 0.1
    });
  }
});
</script>

<style scoped>
.top-hud {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 80px;
  background:
    linear-gradient(180deg, rgba(11, 16, 32, 0.98) 0%, rgba(11, 16, 32, 0.92) 100%);
  border-bottom: 1px solid rgba(200, 169, 106, 0.7);
  box-shadow:
    0 4px 24px rgba(0, 0, 0, 0.6),
    inset 0 -1px 0 rgba(255, 215, 0, 0.18),
    inset 0 1px 0 rgba(255, 215, 0, 0.12);
  display: flex;
  align-items: center;
  padding: env(safe-area-inset-top, 0px) max(10px, env(safe-area-inset-right, 0px)) 0 max(10px, env(safe-area-inset-left, 0px));
  z-index: 1000;
  backdrop-filter: blur(10px);
  pointer-events: auto;
  user-select: none;
}

/* 角饰：四角的小金色三角点缀 */
.hud-corner {
  position: absolute;
  width: 14px;
  height: 14px;
  pointer-events: none;
}

.corner-tl {
  top: 4px;
  left: 4px;
  border-top: 2px solid #FFD700;
  border-left: 2px solid #FFD700;
}

.corner-tr {
  top: 4px;
  right: 4px;
  border-top: 2px solid #FFD700;
  border-right: 2px solid #FFD700;
}

.corner-bl {
  bottom: 4px;
  left: 4px;
  border-bottom: 2px solid #C8A96A;
  border-left: 2px solid #C8A96A;
  opacity: 0.6;
}

.corner-br {
  bottom: 4px;
  right: 4px;
  border-bottom: 2px solid #C8A96A;
  border-right: 2px solid #C8A96A;
  opacity: 0.6;
}

/* 分隔线 */
.hud-divider {
  width: 1px;
  height: 48px;
  background: linear-gradient(180deg, transparent, rgba(200, 169, 106, 0.6), transparent);
  margin: 0 8px;
  flex-shrink: 0;
}

/* LEFT 角色区 */
.hud-left {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
}

.avatar-box {
  position: relative;
  width: 56px;
  height: 56px;
  cursor: pointer;
  flex-shrink: 0;
  transition: transform 0.2s;
}

.avatar-box:hover {
  transform: scale(1.05);
}

.avatar-frame {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 2px solid #C8A96A;
  background:
    radial-gradient(circle at 30% 30%, rgba(255, 215, 0, 0.15), transparent 60%),
    #000;
  padding: 2px;
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.6),
    0 0 12px rgba(255, 215, 0, 0.35),
    inset 0 0 8px rgba(0, 0, 0, 0.8);
}

.avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.avatar-ring {
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  border: 1px dashed rgba(255, 215, 0, 0.5);
  animation: rotateRing 10s linear infinite;
  pointer-events: none;
}

.avatar-ring.outer {
  inset: -7px;
  border: 1px solid rgba(200, 169, 106, 0.2);
  border-top-color: rgba(255, 215, 0, 0.6);
  animation: rotateRing 6s linear infinite reverse;
}

@keyframes rotateRing {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

.avatar-level {
  position: absolute;
  right: -4px;
  bottom: -4px;
  min-width: 22px;
  height: 22px;
  padding: 0 5px;
  border-radius: 11px;
  background: linear-gradient(135deg, #FFD700, #C8A96A);
  border: 1.5px solid #0B1020;
  color: #1a0d00;
  font-size: 12px;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.7), 0 0 8px rgba(255, 215, 0, 0.5);
  font-family: 'Times New Roman', serif;
}

.role-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
}

.name-realm-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.role-name {
  color: #FFD700;
  font-size: 15px;
  font-weight: bold;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.9), 0 0 6px rgba(255, 215, 0, 0.3);
  white-space: nowrap;
  letter-spacing: 0.5px;
}

.realm-plaque {
  background: linear-gradient(135deg, rgba(200, 169, 106, 0.35), rgba(80, 60, 30, 0.6));
  border: 1px solid rgba(255, 215, 0, 0.5);
  border-radius: 3px;
  padding: 2px 8px;
  box-shadow: inset 0 0 6px rgba(255, 215, 0, 0.25), 0 1px 3px rgba(0, 0, 0, 0.6);
  position: relative;
}

.realm-plaque::before,
.realm-plaque::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 4px;
  height: 4px;
  background: #FFD700;
  transform: translateY(-50%) rotate(45deg);
}

.realm-plaque::before {
  left: -2px;
}

.realm-plaque::after {
  right: -2px;
}

.realm-text {
  color: #FFF6D5;
  font-size: 11px;
  font-weight: bold;
  letter-spacing: 1px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
}

.exp-bar-container {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
}

.exp-bar-bg {
  width: 200px;
  height: 14px;
  background: rgba(0, 0, 0, 0.75);
  border: 1px solid rgba(200, 169, 106, 0.5);
  border-radius: 7px;
  overflow: hidden;
  position: relative;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.9);
}

.exp-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #C8A96A 0%, #FFD700 60%, #FFF3A0 100%);
  transition: width 0.3s ease-out;
  position: relative;
  box-shadow: 0 0 6px rgba(255, 215, 0, 0.6);
}

.exp-flow-light {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent);
  animation: flowLight 2.4s infinite;
}

@keyframes flowLight {
  0% {
    transform: translateX(-100%);
  }

  100% {
    transform: translateX(100%);
  }
}

.hud-exp-text {
  position: static;
  flex-shrink: 0;
  color: #C8A96A;
  font-size: 11px;
  font-family: monospace;
  white-space: nowrap;
  line-height: 1;
}

/* CENTER 资源区 */
.hud-center {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  justify-content: center;
  min-width: 0;
}

.resource-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(200, 169, 106, 0.2);
  padding: 4px 12px;
  border-radius: 20px;
  box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.8);
}

.res-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  line-height: 1;
}

.res-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.res-value {
  color: #F7F3E8;
  font-size: 14px;
  font-weight: bold;
  font-family: 'Courier New', monospace;
  text-shadow: 0 1px 2px #000;
  white-space: nowrap;
}

.res-label {
  color: rgba(200, 169, 106, 0.95);
  font-size: 10px;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

/* RIGHT 系统区 */
.hud-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-shrink: 0;
}

.map-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 4px;
  border: 1px solid #C8A96A;
  background: linear-gradient(180deg, rgba(200, 169, 106, 0.25), rgba(80, 60, 30, 0.4));
  color: #FFD700;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow:
    inset 0 1px 0 rgba(255, 215, 0, 0.25),
    0 2px 4px rgba(0, 0, 0, 0.5);
  position: relative;
}

.map-btn::before,
.map-btn::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 5px;
  height: 5px;
  background: #FFD700;
  transform: translateY(-50%) rotate(45deg);
}

.map-btn::before {
  left: -3px;
}

.map-btn::after {
  right: -3px;
}

.map-btn:hover {
  border-color: #FFD700;
  background: linear-gradient(180deg, rgba(255, 215, 0, 0.35), rgba(120, 90, 40, 0.5));
  box-shadow:
    inset 0 1px 0 rgba(255, 215, 0, 0.4),
    0 2px 12px rgba(255, 215, 0, 0.4);
}

.map-btn-icon {
  width: 22px;
  height: 22px;
  object-fit: contain;
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.85));
  pointer-events: none;
}

.map-btn-label {
  font-size: 13px;
  font-weight: bold;
  letter-spacing: 2px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
}

.sys-group {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(200, 169, 106, 0.3);
  border-radius: 4px;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.7);
}

.sys-btn {
  background: transparent;
  border: none;
  color: #C8A96A;
  font-size: 16px;
  cursor: pointer;
  width: 32px;
  height: 32px;
  border-radius: 3px;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.sys-btn:hover {
  background: rgba(200, 169, 106, 0.2);
  color: #FFD700;
  text-shadow: 0 0 6px rgba(255, 215, 0, 0.6);
}

.sys-icon-img {
  width: 22px;
  height: 22px;
  object-fit: contain;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.85));
  pointer-events: none;
  transition: filter 0.2s;
}

.sys-btn:hover .sys-icon-img {
  filter: drop-shadow(0 0 6px rgba(255, 215, 0, 0.7));
}

.sys-badge {
  position: absolute;
  top: 1px;
  right: 1px;
  min-width: 14px;
  height: 14px;
  padding: 0 3px;
  border-radius: 7px;
  background: linear-gradient(135deg, #ff4d4d, #c41a1a);
  color: #fff;
  font-size: 9px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #0B1020;
  box-shadow: 0 0 6px rgba(255, 80, 80, 0.7);
}

/* 响应式 */
@media (max-width: 1100px) {
  .exp-bar-bg {
    width: 130px;
  }
}

@media (max-width: 900px) {
  .exp-bar-bg {
    width: 100px;
  }

  .hud-center {
    gap: 10px;
  }

  .hud-exp-text {
    font-size: 10px;
  }

  .res-label {
    font-size: 9px;
  }

  .res-value {
    font-size: 12px;
  }
}

@media (max-width: 600px) {
  .top-hud {
    height: 68px;
    padding-right: max(8px, env(safe-area-inset-right, 0px));
    padding-left: max(8px, env(safe-area-inset-left, 0px));
  }

  .hud-left {
    gap: 8px;
  }

  .avatar-box {
    width: 46px;
    height: 46px;
  }

  .role-name {
    font-size: 13px;
    max-width: 104px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .exp-bar-bg {
    width: 92px;
  }

  .map-btn {
    padding: 5px 9px;
  }

  .map-btn-label {
    font-size: 11px;
    letter-spacing: 1px;
  }

  .map-btn-icon,
  .sys-icon-img {
    width: 18px;
    height: 18px;
  }

  .sys-btn {
    width: 28px;
    height: 28px;
  }

  .hud-center {
    display: none;
  }

  .realm-plaque {
    display: none;
  }
}
</style>

<style>
.el-popover.hud-settings-popover {
  background: rgba(11, 16, 32, 0.97) !important;
  border: 1px solid rgba(200, 169, 106, 0.5) !important;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.8), 0 0 12px rgba(255, 215, 0, 0.15) !important;
  padding: 6px !important;
  color: #F7F3E8 !important;
  backdrop-filter: blur(10px);
  border-radius: 4px !important;
}

.el-popper[data-popper-placement^="bottom"] .el-popper__arrow::before {
  background: rgba(11, 16, 32, 0.97) !important;
  border-top-color: rgba(200, 169, 106, 0.5) !important;
  border-left-color: rgba(200, 169, 106, 0.5) !important;
}

.settings-menu {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.settings-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  cursor: pointer;
  border-radius: 3px;
  transition: all 0.15s;
  color: #F7F3E8;
  font-size: 13px;
}

.settings-item:hover {
  background: linear-gradient(90deg, rgba(200, 169, 106, 0.25), transparent);
  color: #FFD700;
  text-shadow: 0 0 4px rgba(255, 215, 0, 0.5);
}
</style>
