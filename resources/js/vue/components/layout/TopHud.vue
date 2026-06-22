<template>
  <header ref="hudRef" class="top-hud cultivation-theme">
    <!-- LEFT 角色区 -->
    <div class="hud-left">
      <div class="avatar-box" @click="emit('open-profile')">
        <img :src="user.profile?.avatar_url || defaultAvatar" class="avatar-img" alt="头像" />
        <div class="avatar-ring"></div>
      </div>
      <div class="role-info">
        <div class="name-realm-row">
          <span class="role-name">{{ user.profile?.nickname || '匿名前辈' }}</span>
          <div class="realm-plaque">
            <span class="realm-text">{{ user.profile?.current_realm || '初入仙途' }}</span>
          </div>
        </div>
        <div class="exp-bar-container">
          <div class="exp-bar-bg">
            <div class="exp-bar-fill" :style="{ width: expPercent + '%' }">
              <div class="exp-flow-light"></div>
            </div>
          </div>
          <span class="hud-exp-text">修为 {{ animatedExp }} / {{ user.profile?.next_threshold ?? 100 }}</span>
        </div>
      </div>
    </div>

    <!-- CENTER 资源区 -->
    <div class="hud-center">
      <div class="resource-item" title="词汇量">
        <span class="res-icon">📚</span>
        <div class="res-copy">
          <span class="res-value">{{ animatedVocab }}</span>
          <span class="res-label">词汇</span>
        </div>
      </div>
      <div class="resource-item" title="灵力">
        <span class="res-icon">⚡</span>
        <div class="res-copy">
          <span class="res-value">{{ animatedSpiritPower }}/{{ user.profile?.spirit_power_max ?? 100 }}</span>
          <span class="res-label">灵力</span>
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

    <!-- RIGHT 系统区 -->
    <div class="hud-right">
      <button class="sys-btn map-btn" title="打开宗门地图" @click="ui.showMapOverlay()">
        <span class="sys-icon">🗺</span>
        <span class="map-btn-label">地图</span>
      </button>
      <button class="sys-btn" title="邮件">
        <span class="sys-icon">📬</span>
      </button>
      <el-popover
        placement="bottom-end"
        :width="150"
        trigger="click"
        popper-class="hud-settings-popover"
      >
        <template #reference>
          <button class="sys-btn" title="设置">
            <span class="sys-icon">⚙</span>
          </button>
        </template>
        <!-- 弹窗内容 -->
        <div class="settings-menu">
          <div class="settings-item" @click="emit('logout')">
            <span class="item-icon">🚪</span>
            <span>退出宗门</span>
          </div>
        </div>
      </el-popover>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useUserStore } from '../../stores/user';
import { useUiStore } from '../../stores/ui';
import { useCountUp } from '../../composables/useCountUp';
import gsap from 'gsap';
import { ElMessage } from 'element-plus';
import defaultAvatarImg from '../../../../assets/images/avatar_default.png';

const emit = defineEmits<{
  (e: 'open-profile'): void;
  (e: 'logout'): void;
}>();

const user = useUserStore();
const ui = useUiStore();
const defaultAvatar = defaultAvatarImg;

const animatedExp = useCountUp(() => user.profile?.exp ?? 0);
const animatedVocab = useCountUp(() => user.profile?.vocabulary ?? 0);
const animatedSpiritPower = useCountUp(() => user.profile?.spirit_power ?? 0);
const animatedSpiritStone = useCountUp(() => user.profile?.spirit_stone ?? 0);

const expPercent = computed(() => {
  const current = user.profile?.exp ?? 0;
  const max = user.profile?.next_threshold ?? 100;
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, (current / max) * 100));
});

const hudRef = ref<HTMLElement | null>(null);

// 监听拖拽状态
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

// GSAP 动画：根据拖拽状态调整 HUD 大小
watch(() => ui.isMapDragging, (isDragging) => {
  if (!hudRef.value) return;
  if (isDragging) {
    gsap.to(hudRef.value, {
      height: 48,
      backgroundColor: 'rgba(11, 16, 32, 0.7)', // #0B1020 70% opacity
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
      height: 76,
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
  height: 76px;
  background-color: rgba(11, 16, 32, 0.95); /* #0B1020 */
  border-bottom: 2px solid rgba(200, 169, 106, 0.6); /* #C8A96A */
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6), inset 0 -1px 0 rgba(255, 215, 0, 0.15);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  z-index: 1000;
  backdrop-filter: blur(8px);
  pointer-events: auto;
  user-select: none;
}

/* LEFT 角色区 */
.hud-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
}

.avatar-box {
  position: relative;
  width: 54px;
  height: 54px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid #C8A96A;
  background: #000;
  flex-shrink: 0;
  transition: transform 0.2s;
}

.avatar-box:hover {
  transform: scale(1.05);
}

.avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.avatar-ring {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 1px dashed rgba(255, 215, 0, 0.4);
  animation: rotateRing 10s linear infinite;
  pointer-events: none;
}

@keyframes rotateRing {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.role-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}

.name-realm-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.role-name {
  color: #FFD700;
  font-size: 16px;
  font-weight: bold;
  text-shadow: 0 2px 4px rgba(0,0,0,0.8);
  white-space: nowrap;
}

.realm-plaque {
  background: linear-gradient(135deg, rgba(200, 169, 106, 0.2), rgba(11, 16, 32, 0.8));
  border: 1px solid #C8A96A;
  border-radius: 4px;
  padding: 2px 8px;
  box-shadow: inset 0 0 8px rgba(200, 169, 106, 0.2);
}

.realm-text {
  color: #F7F3E8;
  font-size: 12px;
  font-weight: bold;
  letter-spacing: 1px;
}

.exp-bar-container {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
}

.exp-bar-bg {
  width: 160px;
  height: 8px;
  background: rgba(0,0,0,0.6);
  border: 1px solid rgba(200, 169, 106, 0.3);
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.exp-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #C8A96A, #FFD700);
  transition: width 0.3s ease-out;
  position: relative;
}

.exp-flow-light {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
  animation: flowLight 2s infinite;
}

@keyframes flowLight {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
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
  gap: 30px;
  flex: 1;
  justify-content: center;
}

.resource-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0,0,0,0.4);
  border: 1px solid rgba(200, 169, 106, 0.2);
  padding: 4px 12px;
  border-radius: 20px;
  box-shadow: inset 0 0 10px rgba(0,0,0,0.8);
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
  font-family: monospace;
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
  gap: 16px;
  flex: 1;
}

.sys-btn {
  background: transparent;
  border: none;
  color: #C8A96A;
  font-size: 20px;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sys-btn:hover {
  background: rgba(200, 169, 106, 0.15);
  color: #FFD700;
  transform: scale(1.1);
}

.map-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid rgba(200, 169, 106, 0.4);
  background: rgba(0,0,0,0.3);
}
.map-btn:hover {
  border-color: #FFD700;
  transform: scale(1.05);
}
.map-btn-label {
  font-size: 13px;
  font-weight: bold;
  color: #C8A96A;
  letter-spacing: 1px;
}

/* 响应式调整 */
@media (max-width: 900px) {
  .exp-bar-bg { width: 100px; }
  .hud-center { gap: 10px; }
  .hud-exp-text { font-size: 10px; }
  .res-label { font-size: 9px; }
  .res-value { font-size: 12px; }
}
@media (max-width: 600px) {
  .hud-center { display: none; } /* 移动端过小可直接隐藏中央资源，或改变布局 */
  .realm-plaque { display: none; }
}
</style>

<style>
/* 全局样式覆盖 el-popover，实现暗金修仙风 */
.el-popover.hud-settings-popover {
  background: rgba(11, 16, 32, 0.95) !important;
  border: 1px solid rgba(200, 169, 106, 0.4) !important;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.8) !important;
  padding: 8px !important;
  color: #F7F3E8 !important;
  backdrop-filter: blur(8px);
}
.el-popper[data-popper-placement^="bottom"] .el-popper__arrow::before {
  background: rgba(11, 16, 32, 0.95) !important;
  border-top-color: rgba(200, 169, 106, 0.4) !important;
  border-left-color: rgba(200, 169, 106, 0.4) !important;
}
.settings-menu {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.settings-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
  color: #F7F3E8;
  font-size: 14px;
}
.settings-item:hover {
  background: rgba(200, 169, 106, 0.2);
  color: #FFD700;
}
</style>
