<template>
  <Teleport to="body">
    <Transition name="map-overlay">
      <div v-if="visible" class="map-overlay" @keydown.esc.capture="handleEsc" tabindex="-1" ref="overlayRef">

        <!-- 关闭按钮 -->
        <button class="map-close-btn" @click="close" title="关闭地图 (ESC)">✕</button>

        <!-- 返回全景按钮（飞入建筑特写时显示） -->
        <button v-if="activeRadialBuilding" class="map-back-btn" @click="closeFocus" title="返回全景 (ESC)">
          ↩ 返回全景
        </button>

        <!-- Three.js + CSS2DRenderer 挂载点 -->
        <div class="hall-scene" ref="hallSceneRef"></div>

        <!-- 特写时的点击空白遮罩：点空白处返回全景 -->
        <div v-if="activeRadialBuilding" class="radial-backdrop" @click="closeFocus"></div>

        <!-- 每日修炼悬浮按钮 -->
        <button class="daily-quest-fab" @click="showDailyQuest = true" title="今日修炼任务">
          <span class="daily-quest-icon">📅</span>
          <span class="daily-quest-label">每日修炼</span>
        </button>

        <!-- 环形菜单 -->
        <RadialMenu
          v-if="activeRadialBuilding"
          :visible="!!activeRadialBuilding"
          :x="radialPos.x"
          :y="radialPos.y"
          :nodes="activeRadialBuilding.subNodes"
          @close="activeRadialBuilding = null"
        />

        <GlobalHud
          @open-review="showReview = true"
          @open-achievements="showAchievements = true"
          @open-profile="showProfile = true"
        />

        <!-- 弹窗 -->
        <ReviewModal      v-model:visible="showReview" />
        <HeartDemonRecord v-model:visible="showDemons" />
        <AchievementsModal v-model:visible="showAchievements" />
        <ProfilePanel     v-model:visible="showProfile" @open-review="openReviewFromProfile" />
        <DailyQuestPanel  v-model:visible="showDailyQuest" />
        <InnerDemonPanel  v-model:visible="showInnerDemon" :auto-challenge="innerDemonAutoChallenge" />
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { onUnmounted, ref, watch, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import { useLegacyBridge } from '../composables/useLegacyBridge';
import { useUiStore } from '../stores/ui';
import { useUserStore } from '../stores/user';
import { useMapBuildings, findMapBuilding, getSceneBuildingImages } from '../composables/useMapBuildings';
import { useMapNavigation } from '../composables/useMapNavigation';
import { WorldSceneManager } from '../core/sect/WorldSceneManager';

import RadialMenu       from '../components/map/RadialMenu.vue';
import GlobalHud        from '../components/map/GlobalHud.vue';
import ReviewModal      from './ReviewModal.vue';
import HeartDemonRecord from '../components/demons/HeartDemonRecord.vue';
import AchievementsModal from './AchievementsModal.vue';
import ProfilePanel     from '../components/profile/ProfilePanel.vue';
import DailyQuestPanel  from './DailyQuestPanel.vue';
import InnerDemonPanel  from '../components/demons/InnerDemonPanel.vue';

const props = defineProps<{ visible: boolean }>();
const emit  = defineEmits<{ (e: 'close'): void }>();

const bridge    = useLegacyBridge();
const ui        = useUiStore();
const userStore = useUserStore();

const overlayRef   = ref<HTMLElement | null>(null);
const hallSceneRef = ref<HTMLElement | null>(null);
let worldManager: WorldSceneManager | null = null;
const userRealmLevel = ref(0);
const radialPos      = ref({ x: '50%', y: '50%' });

const activeRadialBuilding = ref<any>(null);
const showReview      = ref(false);
const showDemons      = ref(false);
const showAchievements = ref(false);
const showProfile     = ref(false);
const showDailyQuest  = ref(false);
const showInnerDemon  = ref(false);
const innerDemonAutoChallenge = ref(false);

function openReviewFromProfile() {
  showReview.value = true;
}

const { goPractice, goReading, goExam, goMijing, goMall } = useMapNavigation({ beforeNavigate: close });
const { mapBuildings } = useMapBuildings({
  goPractice,
  goReading,
  goExam,
  goMijing,
  goMall,
  showDailyQuest: () => { showDailyQuest.value = true; },
  showAchievements: () => { showAchievements.value = true; },
  showProfile: () => { showProfile.value = true; },
  showReview: () => { showReview.value = true; },
  showDemons: () => { showDemons.value = true; },
  showInnerDemon: (autoChallenge) => {
    innerDemonAutoChallenge.value = autoChallenge;
    showInnerDemon.value = true;
  },
});

// 当 overlay 变为可见时初始化 3D 场景
watch(() => props.visible, async (val) => {
  if (!val) {
    worldManager?.dispose();
    worldManager = null;
    return;
  }

  await nextTick();
  overlayRef.value?.focus();

  ui.showLoading('云海散开，宗门出现...');
  try {
    const game = await bridge.getGame();
    await game.syncDailyStatus();
    game.ui.hideAllPanels();

    if (!hallSceneRef.value) return;

    const realmStr = userStore.profile?.current_realm || '练气一层';
    if (realmStr.includes('筑基')) userRealmLevel.value = 1;
    else if (realmStr.includes('金丹')) userRealmLevel.value = 2;
    else if (realmStr.includes('元婴') || realmStr.includes('化神')) userRealmLevel.value = 3;

    worldManager = new WorldSceneManager(hallSceneRef.value, {
      userRealmLevel: userRealmLevel.value,
      buildingImages: getSceneBuildingImages(),
    });

    worldManager.onBuildingClick = (nodeDef, screenX, screenY) => {
      radialPos.value = { x: screenX + 'px', y: screenY + 'px' };
      const building = findMapBuilding(mapBuildings.value, nodeDef.id);
      if (building) handleBuildingClick(building);
    };

    // 特写时每帧跟随建筑更新菜单坐标
    worldManager.onFocusedMove = (screenX, screenY) => {
      radialPos.value = { x: screenX + 'px', y: screenY + 'px' };
    };
  } catch {
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
  emit('close');
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
    worldManager?.flyToOverview();
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
  top: 88px; /* TopHud 76px + 12px 间距 */
  right: 24px;
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

/* ── 返回全景按钮 ── */
.map-back-btn {
  position: absolute;
  top: 88px;
  left: 24px;
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
  z-index: 30;            /* 在 canvas(2) 之上，RadialMenu(50) 之下 */
  background: transparent;
  cursor: default;
}

/* ── 每日任务 FAB ── */
.daily-quest-fab {
  position: absolute;
  top: 88px;
  right: 80px;
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
  0%, 100% { box-shadow: 0 0 0 0 rgba(212, 168, 67, 0.3); }
  50%       { box-shadow: 0 0 0 8px rgba(212, 168, 67, 0); }
}
.daily-quest-icon  { font-size: 22px; }
.daily-quest-label { font-size: 11px; color: #d4a843; white-space: nowrap; }

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
