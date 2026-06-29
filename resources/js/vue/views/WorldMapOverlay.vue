<template>
  <Teleport to="body">
    <Transition name="map-overlay">
      <div v-if="visible" class="map-overlay" @keydown.esc.capture="handleEsc" tabindex="-1" ref="overlayRef">

        <!-- 返回大厅（全景时显示） -->
        <button v-if="!activeRadialBuilding" class="map-lobby-btn" @click="returnToLobby" title="返回大厅">
          ← 返回大厅
        </button>

        <!-- 关闭按钮 -->
        <button class="map-close-btn" @click="close" title="关闭地图 (ESC)">✕</button>

        <!-- 返回全景按钮（飞入建筑特写时显示） -->
        <button v-if="activeRadialBuilding" class="map-back-btn" @click="closeFocus" title="返回全景 (ESC)">
          ↩ 返回全景
        </button>

        <!-- Three.js + CSS2DRenderer 挂载点 -->
        <div class="hall-scene" ref="hallSceneRef"></div>

        <!-- 特写时的点击空白遮罩：pointer-events 穿透，由 3D 场景处理空白点击 -->
        <div v-if="activeRadialBuilding" class="radial-backdrop"></div>

        <!-- 每日修炼悬浮按钮 -->
        <button class="daily-quest-fab" @click="panels.showDailyQuest = true" title="今日修炼任务">
          <span class="daily-quest-icon">📅</span>
          <span class="daily-quest-label">每日修炼</span>
        </button>

        <!-- 环形菜单 -->
        <RadialMenu v-if="activeRadialBuilding" :visible="!!activeRadialBuilding" :x="radialPos.x" :y="radialPos.y"
          :nodes="activeRadialBuilding.subNodes" @close="activeRadialBuilding = null" />

        <!-- GlobalHud 已提升至 App.vue 全局挂载，此处不再重复实例 -->

        <!-- 弹窗 -->
        <HallModals :panels="panels" @go-mijing="navigation.goMijing()" @go-world-boss="navigation.goWorldBoss()" />
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { onUnmounted, ref, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useLegacyBridge } from '../composables/useLegacyBridge';
import { useUiStore } from '../stores/ui';
import { useUserStore } from '../stores/user';
import { findMapBuilding, getSceneBuildingImages } from '../composables/useMapBuildings';
import { getDisplayRealm } from '../../utils/cultivation.js';
import { preloadHallEssentials, hallPreloadCounts, areHallAssetsReady } from '../services/assetPreloader';
import { useHallPanels } from '../composables/useHallPanels';
import { WorldSceneManager } from '../core/sect/WorldSceneManager';
import { returnToHall } from '../services/hallNavigation';

import RadialMenu from '../components/map/RadialMenu.vue';
import HallModals from '../components/features/HallModals.vue';

const props = defineProps<{ visible: boolean }>();

const bridge = useLegacyBridge();
const router = useRouter();
const ui = useUiStore();
const userStore = useUserStore();

const overlayRef = ref<HTMLElement | null>(null);
const hallSceneRef = ref<HTMLElement | null>(null);
let worldManager: WorldSceneManager | null = null;
const userRealmLevel = ref(0);
const radialPos = ref({ x: '50%', y: '50%' });

const activeRadialBuilding = ref<any>(null);

function dismissMapOverlay() {
  activeRadialBuilding.value = null;
  ui.hideMapOverlay();
  void bridge.closeLegacyPanels();
}

function returnToLobby() {
  void returnToHall(router);
}

const { panels, navigation, mapBuildings } = useHallPanels({ beforeNavigate: dismissMapOverlay });

// 当 overlay 变为可见时初始化 3D 场景
watch(() => props.visible, async (val) => {
  if (!val) {
    worldManager?.dispose();
    worldManager = null;
    return;
  }

  await nextTick();
  overlayRef.value?.focus();

  try {
    if (!areHallAssetsReady()) {
      let progressTimer: number | null = null;
      const tick = () => {
        const { done, total } = hallPreloadCounts.value;
        ui.showLoading(`正在加载宗门建筑 (${done}/${total})...`);
      };
      tick();
      progressTimer = window.setInterval(tick, 250);
      try {
        await preloadHallEssentials();
      } finally {
        if (progressTimer !== null) window.clearInterval(progressTimer);
        ui.hideLoading();
      }
    }

    const game = await bridge.getGame();
    await game.syncDailyStatus();
    game.ui.hideAllPanels();

    if (!hallSceneRef.value) return;
    if (!props.visible) return;

    const realmStr = getDisplayRealm(userStore.profile, '练气一层');
    if (realmStr.includes('筑基')) userRealmLevel.value = 1;
    else if (realmStr.includes('金丹')) userRealmLevel.value = 2;
    else if (realmStr.includes('元婴') || realmStr.includes('化神')) userRealmLevel.value = 3;

    worldManager = new WorldSceneManager(hallSceneRef.value, {
      userRealmLevel: userRealmLevel.value,
      buildingImages: getSceneBuildingImages(),
    });
    // 3D 场景分阶段初始化；不在此处弹出 CultLoadingOverlay（避免与全局 LoadingSplash 重叠）
    await worldManager.init();
    if (!props.visible || !hallSceneRef.value) {
      worldManager.dispose();
      worldManager = null;
      return;
    }

    worldManager.onBuildingClick = (nodeDef, screenX, screenY) => {
      radialPos.value = { x: screenX + 'px', y: screenY + 'px' };
      const building = findMapBuilding(mapBuildings.value, nodeDef.id);
      if (building) handleBuildingClick(building);
    };

    worldManager.onFocusDismiss = () => {
      closeFocus();
    };

    // 特写时每帧跟随建筑更新菜单坐标
    worldManager.onFocusedMove = (screenX, screenY) => {
      radialPos.value = { x: screenX + 'px', y: screenY + 'px' };
    };
  } catch (err) {
    console.error('[WorldMapOverlay] 地图加载失败：', err);
    ElMessage.error('地图加载失败，请重试');
  } finally {
    ui.hideLoading();
  }
}, { immediate: false });

onUnmounted(() => {
  worldManager?.dispose();
  worldManager = null;
});

function close() {
  ui.hideMapOverlay();
}

function closeFocus() {
  activeRadialBuilding.value = null;
}

function handleEsc() {
  if (activeRadialBuilding.value) {
    closeFocus();
  } else {
    close();
  }
}

function handleBuildingClick(building: any) {
  if (building.unlockRealm !== undefined && userRealmLevel.value < building.unlockRealm) {
    ElMessage.warning('道友境界不足，还需努力修行');
    closeFocus();
    return;
  }
  if (building.subNodes?.length > 0) {
    activeRadialBuilding.value = building;
  } else if (building.onClick) {
    activeRadialBuilding.value = null;
    building.onClick();
  }
}

// RadialMenu 关闭时飞回全景
watch(activeRadialBuilding, (val) => {
  if (!val) worldManager?.flyToOverview();
});
</script>

<style scoped>
/* ── Overlay 容器 ── */
.map-overlay {
  position: fixed;
  inset: 0;
  z-index: 950;
  background: #030810;
  outline: none;
}

.hall-scene {
  position: absolute;
  inset: 0;
  z-index: 0;
}

/* ── 关闭按钮 ── */
.map-close-btn {
  position: absolute;
  top: calc(var(--hud-offset-top, var(--top-hud-height, 76px)) + 8px);
  right: max(14px, env(safe-area-inset-right, 0px));
  z-index: 100;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid rgba(212, 168, 67, 0.5);
  background: rgba(4, 12, 28, 0.85);
  color: #ffd700;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  backdrop-filter: blur(4px);
}

.map-close-btn:hover {
  background: rgba(212, 168, 67, 0.2);
  border-color: #ffd700;
  transform: scale(1.1) rotate(90deg);
}

/* ── 返回大厅按钮 ── */
.map-lobby-btn {
  position: absolute;
  top: calc(var(--hud-offset-top, var(--top-hud-height, 76px)) + 8px);
  left: max(14px, env(safe-area-inset-left, 0px));
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 18px;
  border-radius: 22px;
  border: 1px solid rgba(212, 168, 67, 0.55);
  background: rgba(4, 12, 28, 0.85);
  color: #ffd700;
  font-size: 14px;
  font-weight: bold;
  letter-spacing: 1px;
  cursor: pointer;
  backdrop-filter: blur(4px);
  transition: all 0.2s;
}

.map-lobby-btn:hover {
  background: rgba(212, 168, 67, 0.2);
  border-color: #ffd700;
  transform: translateX(-3px);
}

/* ── 返回全景按钮 ── */
.map-back-btn {
  position: absolute;
  top: calc(var(--hud-offset-top, var(--top-hud-height, 76px)) + 8px);
  left: max(14px, env(safe-area-inset-left, 0px));
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 18px;
  border-radius: 22px;
  border: 1px solid rgba(212, 168, 67, 0.55);
  background: rgba(4, 12, 28, 0.85);
  color: #ffd700;
  font-size: 14px;
  font-weight: bold;
  letter-spacing: 1px;
  cursor: pointer;
  backdrop-filter: blur(4px);
  transition: all 0.2s;
}

.map-back-btn:hover {
  background: rgba(212, 168, 67, 0.2);
  border-color: #ffd700;
  transform: translateX(-3px);
}

/* ── 特写点击遮罩（透明，仅用于捕获空白处点击） ── */
.radial-backdrop {
  position: absolute;
  inset: 0;
  z-index: 30;
  pointer-events: none;
  background: transparent;
}

/* ── 每日任务 FAB ── */
.daily-quest-fab {
  position: absolute;
  top: calc(var(--hud-offset-top, var(--top-hud-height, 76px)) + 8px);
  right: max(62px, calc(env(safe-area-inset-right, 0px) + 48px));
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: rgba(20, 30, 60, 0.85);
  border: 1px solid rgba(212, 168, 67, 0.5);
  border-radius: 12px;
  padding: 10px 14px;
  cursor: pointer;
  z-index: 100;
  transition: transform 0.15s, box-shadow 0.15s;
  animation: fab-pulse 3s ease-in-out infinite;
}

.daily-quest-fab:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(212, 168, 67, 0.4);
  animation: none;
}

@keyframes fab-pulse {

  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(212, 168, 67, 0.3);
  }

  50% {
    box-shadow: 0 0 0 8px rgba(212, 168, 67, 0);
  }
}

.daily-quest-icon {
  font-size: 22px;
}

.daily-quest-label {
  font-size: 11px;
  color: #d4a843;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .map-close-btn {
    top: calc(var(--hud-offset-top, var(--top-hud-height, 76px)) + 4px);
    right: max(8px, env(safe-area-inset-right, 0px));
    width: 36px;
    height: 36px;
  }

  .map-lobby-btn {
    top: calc(var(--hud-offset-top, var(--top-hud-height, 76px)) + 4px);
    left: max(8px, env(safe-area-inset-left, 0px));
    padding: 8px 12px;
    font-size: 12px;
  }

  .map-back-btn {
    top: calc(var(--hud-offset-top, var(--top-hud-height, 76px)) + 4px);
    left: max(8px, env(safe-area-inset-left, 0px));
    padding: 8px 12px;
    font-size: 12px;
  }

  .daily-quest-fab {
    top: calc(var(--hud-offset-top, var(--top-hud-height, 76px)) + 4px);
    right: max(50px, calc(env(safe-area-inset-right, 0px) + 42px));
    padding: 8px 10px;
  }

  .daily-quest-icon {
    font-size: 18px;
  }

  .daily-quest-label {
    font-size: 10px;
  }
}

/* ── 进入/离开动画 ── */
.map-overlay-enter-active {
  transition: opacity 0.4s ease;
}

.map-overlay-leave-active {
  transition: opacity 0.25s ease;
}

.map-overlay-enter-from,
.map-overlay-leave-to {
  opacity: 0;
}
</style>
