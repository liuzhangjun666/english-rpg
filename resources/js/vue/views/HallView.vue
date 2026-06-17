<template>
  <div class="hall-page" @wheel.prevent>
    <div class="map-stage">
      <!-- Three.js + CSS2DRenderer 挂载点 -->
      <div class="hall-scene" ref="hallSceneRef"></div>

      <!-- 每日任务悬浮提醒 -->
      <button class="daily-quest-fab" @click="showDailyQuest = true" title="今日修炼任务">
        <span class="daily-quest-icon">📅</span>
        <span class="daily-quest-label">每日修炼</span>
      </button>
    </div>
    <GlobalHud 
      @open-review="showReview = true"
      @open-achievements="showAchievements = true"
      @open-profile="showProfile = true"
    />

    <!-- 环形菜单 -->
    <RadialMenu
      v-if="activeRadialBuilding"
      :visible="!!activeRadialBuilding"
      :x="radialPos.x"
      :y="radialPos.y"
      :nodes="activeRadialBuilding.subNodes"
      @close="activeRadialBuilding = null"
    />
    
    <!-- 弹窗组件 (后续将逐个改造) -->
    <ReviewModal v-model:visible="showReview" />
    <HeartDemonRecord v-model:visible="showDemons" />
    <AchievementsModal v-model:visible="showAchievements" />
    <ProfilePanel v-model:visible="showProfile" />
    <DailyQuestPanel v-model:visible="showDailyQuest" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useLegacyBridge } from '../composables/useLegacyBridge';
import { useUiStore } from '../stores/ui';
import { useUserStore } from '../stores/user';
import { WorldSceneManager } from '../core/sect/WorldSceneManager';

import hallPractice    from '../../../assets/images/ui/hall_practice.png';
import hallShilianchang from '../../../assets/images/ui/hall_shilianchang.png';
import hallReading     from '../../../assets/images/ui/hall_reading.png';
import hallWriting     from '../../../assets/images/ui/hall_writing.png';
import hallMijing      from '../../../assets/images/ui/hall_mijing.png';
import hallDemons      from '../../../assets/images/ui/hall_demons.png';
import hallProfile     from '../../../assets/images/ui/hall_profile.png';

import abilityReading  from '../../../assets/images/ui/ability_reading.png';
import abilityVocab    from '../../../assets/images/ui/ability_vocab.png';
import abilityGrammar  from '../../../assets/images/ui/ability_grammar.png';
import abilityListening from '../../../assets/images/ui/ability_listening.png';
import abilityWriting  from '../../../assets/images/ui/ability_writing.png';
import abilitySpeaking from '../../../assets/images/ui/ability_speaking.png';

const router      = useRouter();
const bridge      = useLegacyBridge();
const ui          = useUiStore();
const userStore   = useUserStore();

const hallSceneRef    = ref<HTMLElement | null>(null);
let worldManager: WorldSceneManager | null = null;
const userRealmLevel  = ref(0);
const radialPos       = ref({ x: '50%', y: '50%' }); // RadialMenu 定位

onMounted(async () => {
  ui.showLoading('加载天地灵气...');
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
        buildingImages: {
          practice: hallPractice,
          reading:  hallReading,
          writing:  hallWriting,
          exam:     hallShilianchang,
          demons:   hallDemons,
          profile:  hallProfile,
          mijing:   hallMijing,
        },
      });

      worldManager.onBuildingClick = (nodeDef, screenX, screenY) => {
        radialPos.value = { x: screenX + 'px', y: screenY + 'px' };
        const building = mapBuildings.value.find(b => b.key === nodeDef.id);
        if (building) handleBuildingClick(building);
      };
    }
  } catch {
    ElMessage.error('地图加载失败，请刷新重试');
  } finally {
    ui.hideLoading();
  }
});

onUnmounted(() => {
  worldManager?.dispose();
  worldManager = null;
});

function goPractice(mode = 'vocab') {
  router.push({ path: '/practice', query: { mode } });
}

function goReading() { router.push('/reading'); }
function goExam() { router.push('/exam'); }
function goMijing() { router.push('/mijing'); }
function openDemons() { showDemons.value = true; }
function openAchievements() { showAchievements.value = true; }
function openProfile() { showProfile.value = true; }

function handleBuildingClick(building: any) {
  if (building.unlockRealm !== undefined && userRealmLevel.value < building.unlockRealm) {
    ElMessage.warning('道友资历不够，还需努力修行');
    return;
  }

  if (building.subNodes && building.subNodes.length > 0) {
    activeRadialBuilding.value = building;
  } else if (building.onClick) {
    activeRadialBuilding.value = null;
    building.onClick();
  }
}

// 建筑配置（仅保留交互数据，坐标由 CSS2DRenderer 管理）
const mapBuildings = ref([
  {
    key: 'practice', title: '练功殿', unlockRealm: 0,
    subNodes: [
      { key: 'practice-act',  title: '修炼',  icon: abilityVocab,    onClick: () => goPractice('vocab') },
      { key: 'breakthrough',  title: '突破',  icon: abilityReading,  onClick: () => ElMessage.info('暂无心魔，无需突破！') },
      { key: 'quest',         title: '任务',  icon: abilityGrammar,  onClick: () => { showDailyQuest.value = true } },
      { key: 'signin',        title: '签到',  icon: abilityListening, onClick: () => { showDailyQuest.value = true } },
    ],
  },
  {
    key: 'reading', title: '藏经阁', unlockRealm: 0,
    subNodes: [
      { key: 'reading-game', title: '阅读', icon: abilityReading,   onClick: () => goReading() },
      { key: 'vocab',        title: '单词', icon: abilityVocab,     onClick: () => goPractice('vocab') },
      { key: 'grammar',      title: '语法', icon: abilityGrammar,   onClick: () => goPractice('grammar') },
      { key: 'listening',    title: '听力', icon: abilityListening, onClick: () => goPractice('listening') },
    ],
  },
  {
    key: 'writing', title: '符箓峰', unlockRealm: 0,
    subNodes: [
      { key: 'writing-game', title: '写作',   icon: abilityWriting,  onClick: () => goPractice('writing') },
      { key: 'speaking',     title: '口语',   icon: abilitySpeaking, onClick: () => goPractice('speaking') },
      { key: 'ai',           title: 'AI问道', icon: abilityReading,  onClick: () => ElMessage.info('通灵玉简连接中...') },
    ],
  },
  {
    key: 'exam', title: '天道峰', unlockRealm: 1,
    subNodes: [
      { key: 'exam-act', title: '考试',  icon: abilityWriting,  onClick: () => goExam() },
      { key: 'rank',     title: '排行榜', icon: abilityReading,  onClick: () => ElMessage.info('天机阁榜单更新中...') },
      { key: 'dujie',    title: '渡劫',  icon: abilityListening, onClick: () => ElMessage.info('雷劫尚未凝聚...') },
    ],
  },
  {
    key: 'demons', title: '心魔禁地', unlockRealm: 2,
    subNodes: [
      { key: 'demon-record', title: '心魔录', icon: abilityVocab,    onClick: () => openDemons() },
      { key: 'ask-heart',    title: '问心崖', icon: abilitySpeaking, onClick: () => ElMessage.info('问心阵法推演中...') },
    ],
  },
  {
    key: 'profile', title: '洞府', unlockRealm: 0,
    subNodes: [
      { key: 'info',    title: '个人信息', icon: abilityVocab,    onClick: () => openProfile() },
      { key: 'achieve', title: '成就碑',  icon: abilityReading,  onClick: () => openAchievements() },
      { key: 'pets',    title: '灵宠园',  icon: abilityGrammar,  onClick: () => ElMessage.info('灵宠园修建中...') },
      { key: 'storage', title: '仓库',    icon: abilityListening, onClick: () => ElMessage.info('储物袋整理中...') },
    ],
  },
  {
    key: 'mijing', title: '虚空秘境', unlockRealm: 3,
    subNodes: [
      { key: 'dungeon',    title: '副本',    icon: abilityWriting,  onClick: () => goMijing() },
      { key: 'event',      title: '活动',    icon: abilitySpeaking, onClick: () => ElMessage.info('秘境异象尚未开启') },
      { key: 'world-boss', title: '世界挑战', icon: abilityReading,  onClick: () => ElMessage.info('上古大妖沉睡中...') },
    ],
  },
]);

const activeRadialBuilding = ref<any>(null);

import GlobalHud from '../components/map/GlobalHud.vue';
import RadialMenu from '../components/map/RadialMenu.vue';
import ReviewModal from './ReviewModal.vue';
import HeartDemonRecord from '../components/demons/HeartDemonRecord.vue';
import AchievementsModal from './AchievementsModal.vue';
import ProfilePanel from '../components/profile/ProfilePanel.vue';
import DailyQuestPanel from './DailyQuestPanel.vue';


const showReview = ref(false);
const showDemons = ref(false);
const showAchievements = ref(false);
const showProfile = ref(false);
const showDailyQuest = ref(false);
</script>

<style scoped>
.hall-page {
  position: relative;
  width: 100vw;
  height: 100vh;
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

.daily-quest-fab {
  position: absolute;
  top: 80px;
  right: 20px;
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

.daily-quest-icon { font-size: 22px; }
.daily-quest-label { font-size: 11px; color: #d4a843; white-space: nowrap; }
</style>
