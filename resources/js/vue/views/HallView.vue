<template>
  <div class="hall-page" @wheel.prevent @keydown.esc.capture="handleEsc" tabindex="-1" ref="hallPageRef">
    <div class="map-stage">
      <div class="hall-scene" ref="hallSceneRef"></div>

      <button v-if="activeRadialBuilding" class="map-back-btn" type="button" @click="closeFocus" title="返回全景 (ESC)">
        ↩ 返回全景
      </button>

      <button class="daily-quest-fab" @click="panels.showDailyQuest = true" title="今日修炼任务">
        <span class="daily-quest-icon">📅</span>
        <span class="daily-quest-label">每日修炼</span>
      </button>
    </div>
    <!-- GlobalHud 已提升至 App.vue 全局挂载，此处不再重复实例 -->

    <RadialMenu v-if="activeRadialBuilding" :visible="!!activeRadialBuilding" :x="radialPos.x" :y="radialPos.y"
      :nodes="activeRadialBuilding.subNodes" @close="closeFocus" />

    <HallModals :panels="panels" @go-mijing="navigation.goMijing()" @go-world-boss="navigation.goWorldBoss()" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { useLegacyBridge } from '../composables/useLegacyBridge';
import { useUserStore } from '../stores/user';
import { useUiStore } from '../stores/ui';
import { WorldSceneManager } from '../core/sect/WorldSceneManager';
import { findMapBuilding, getSceneBuildingImages } from '../composables/useMapBuildings';
import { useHallPanels } from '../composables/useHallPanels';

import RadialMenu from '../components/map/RadialMenu.vue';
import HallModals from '../components/features/HallModals.vue';

const bridge = useLegacyBridge();
const userStore = useUserStore();
const ui = useUiStore();

const hallPageRef = ref<HTMLElement | null>(null);
const hallSceneRef = ref<HTMLElement | null>(null);
let worldManager: WorldSceneManager | null = null;
const userRealmLevel = ref(0);
const radialPos = ref({ x: '50%', y: '50%' });
const activeRadialBuilding = ref<any>(null);

const { mapBuildings, panels, navigation } = useHallPanels();

onMounted(async () => {
  try {
    const game = await bridge.getGame();
    await game.syncDailyStatus();
    game.ui.hideAllPanels();

    if (hallSceneRef.value) {
      const realmStr = userStore.profile?.current_realm || '练气一层';
      if (realmStr.includes('筑基')) userRealmLevel.value = 1;
      else if (realmStr.includes('金丹')) userRealmLevel.value = 2;
      else if (realmStr.includes('元婴') || realmStr.includes('化神')) userRealmLevel.value = 3;

      worldManager = new WorldSceneManager(hallSceneRef.value, {
        userRealmLevel: userRealmLevel.value,
        buildingImages: getSceneBuildingImages(),
      });
      // 重活分阶段做、每阶段让出一帧给浏览器画 loading
      await worldManager.init((label) => ui.showLoading(label));
      if (!hallSceneRef.value) {
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

      worldManager.onFocusedMove = (screenX, screenY) => {
        radialPos.value = { x: screenX + 'px', y: screenY + 'px' };
      };

      hallPageRef.value?.focus();
    }
  } catch (error) {
    console.error('[HallView] 地图初始化失败', error);
    ElMessage.error('地图加载失败，请刷新重试');
  } finally {
    ui.hideLoading();
  }
});

onUnmounted(() => {
  worldManager?.dispose();
  worldManager = null;
});

function closeFocus() {
  activeRadialBuilding.value = null;
}

function handleEsc() {
  if (activeRadialBuilding.value) {
    closeFocus();
  }
}

watch(activeRadialBuilding, (val) => {
  if (!val) worldManager?.flyToOverview();
});

function handleBuildingClick(building: any) {
  if (building.unlockRealm !== undefined && userRealmLevel.value < building.unlockRealm) {
    ElMessage.warning('道友资历不够，还需努力修行');
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
</script>

<style scoped>
.hall-page {
  position: relative;
  width: 100vw;
  height: var(--app-dvh, 100vh);
  overflow: hidden;
  background: #000;
  pointer-events: auto !important;
}

.map-stage {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.hall-scene {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
}

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

.daily-quest-fab {
  position: absolute;
  top: calc(var(--hud-offset-top, var(--top-hud-height, 80px)) + 8px);
  right: max(12px, env(safe-area-inset-right, 0px));
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
  .map-back-btn {
    top: calc(var(--hud-offset-top, var(--top-hud-height, 76px)) + 4px);
    left: max(8px, env(safe-area-inset-left, 0px));
    padding: 8px 12px;
    font-size: 12px;
  }

  .daily-quest-fab {
    padding: 8px 10px;
    border-radius: 10px;
    top: calc(var(--hud-offset-top, var(--top-hud-height, 80px)) + 4px);
    right: max(8px, env(safe-area-inset-right, 0px));
  }

  .daily-quest-icon {
    font-size: 18px;
  }

  .daily-quest-label {
    font-size: 10px;
  }
}
</style>
