<template>
  <div class="hall-page">
    <div class="game-stage" ref="stageRef" :style="stageStyle">
      <div class="hall-scene">
        <!-- 背景场景容器，不再包含散落的图标 -->
      </div>

      <!-- 底部导航 Dock (全部图标集中于此) -->
      <div class="hall-dock">
        <template v-for="item in dockItems" :key="item.key">
          <div v-if="item.isSpacer" class="dock-spacer"></div>
          <button 
            v-else
            type="button" 
            :class="['action-card-icon-only', item.key === 'practice' ? 'core-icon' : 'dock-icon']" 
            @click="item.onClick" 
            :title="item.title"
          >
            <img :src="item.image" :alt="item.title" class="action-thumb-icon" />
          </button>
        </template>
      </div>
    </div>
    
    <!-- 弹窗组件 -->
    <MallView v-model:visible="showMall" />
    <LeaderboardView v-model:visible="showLeaderboard" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useLegacyBridge } from '../composables/useLegacyBridge';
import { useUiStore } from '../stores/ui';
import hallPractice from '../../../assets/images/ui/hall_practice.png';
import hallShilianchang from '../../../assets/images/ui/hall_shilianchang.png';
import hallCangjingge from '../../../assets/images/ui/hall_cangjingge.png';
import hallListening from '../../../assets/images/ui/hall_listening.png';
import hallSpeaking from '../../../assets/images/ui/hall_speaking.png';
import hallReading from '../../../assets/images/ui/hall_reading.png';
import hallWriting from '../../../assets/images/ui/hall_writing.png';
import hallMijing from '../../../assets/images/ui/hall_mijing.png';
import hallMall from '../../../assets/images/ui/hall_mall.png';
import hallLeaderboard from '../../../assets/images/ui/hall_leaderboard.png';
import hallReview from '../../../assets/images/ui/hall_review.png';
import hallDemons from '../../../assets/images/ui/hall_demons.png';
import hallAchievements from '../../../assets/images/ui/hall_achievements.png';
import hallProfile from '../../../assets/images/ui/hall_profile.png';
const router = useRouter();
const bridge = useLegacyBridge();
const ui = useUiStore();

const stageRef = ref<HTMLElement | null>(null);
const scale = ref(1);
const isPortraitMode = ref(false);
const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;

const stageStyle = computed(() => ({
  width: `${DESIGN_WIDTH}px`,
  height: `${DESIGN_HEIGHT}px`,
  // 如果是竖屏，则顺时针旋转 90 度，并应用计算出的缩放
  transform: `translate(-50%, -50%) rotate(${isPortraitMode.value ? '90deg' : '0deg'}) scale(${scale.value})`,
}));

const updateScale = () => {
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  
  // 判定是否为竖屏
  isPortraitMode.value = windowHeight > windowWidth;
  
  if (isPortraitMode.value) {
    // 竖屏下，屏幕的高对应设计稿的宽，屏幕的宽对应设计稿的高
    scale.value = Math.min(windowHeight / DESIGN_WIDTH, windowWidth / DESIGN_HEIGHT);
  } else {
    // 横屏正常逻辑
    scale.value = Math.min(windowWidth / DESIGN_WIDTH, windowHeight / DESIGN_HEIGHT);
  }
};

onMounted(async () => {
  updateScale();
  window.addEventListener('resize', updateScale);
  
  ui.showLoading('进入大厅...');
  try {
    await bridge.switchToHall();
  } catch (error) {
    ElMessage.error('大厅加载失败，请刷新重试');
  } finally {
    ui.hideLoading();
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', updateScale);
});

function goPractice(mode = 'vocab') {
  router.push({ path: '/practice', query: { mode } });
}

const actionItems = computed(() => [
  {
    key: 'practice',
    title: '练功房',
    image: hallPractice,
    onClick: () => goPractice('vocab'),
  },
  {
    key: 'exam',
    title: '试炼场',
    image: hallShilianchang,
    onClick: () => goExam(),
  },
  {
    key: 'practice-grammar',
    title: '阵法峰',
    image: hallCangjingge,
    onClick: () => goPractice('grammar'),
  },
  {
    key: 'practice-listening',
    title: '听风谷',
    image: hallListening,
    onClick: () => goPractice('listening'),
  },
  {
    key: 'practice-speaking',
    title: '诵咒峰',
    image: hallSpeaking,
    onClick: () => goPractice('speaking'),
  },
  {
    key: 'reading',
    title: '藏经阁',
    image: hallReading,
    onClick: () => goReading(),
  },
  {
    key: 'practice-writing',
    title: '符箓台',
    image: hallWriting,
    onClick: () => goPractice('writing'),
  },
  {
    key: 'mijing',
    title: '秘境',
    image: hallMijing,
    onClick: () => goMijing(),
  },
  {
    key: 'mall',
    title: '坊市',
    image: hallMall,
    onClick: () => goMall(),
  },
  {
    key: 'leaderboard',
    title: '宗门榜',
    image: hallLeaderboard,
    onClick: () => goLeaderboard(),
  },
  {
    key: 'review',
    title: '温故复盘',
    image: hallReview,
    onClick: () => openReview(),
  },
  {
    key: 'demons',
    title: '心魔录',
    image: hallDemons,
    onClick: () => openDemons(),
  },
  {
    key: 'achievements',
    title: '成就碑',
    image: hallAchievements,
    onClick: () => openAchievements(),
  },
  {
    key: 'profile',
    title: '我的洞府',
    image: hallProfile,
    onClick: () => openProfile(),
  },
]);

// 重新组织底部 Dock 的顺序，以“练功房”为核心绝对居中
// 共 14 个图标。为了让 practice 绝对居中，我们在左侧加入一个占位符(spacer)，使得左右两边都是 7 个等宽元素。
const dockItems = computed(() => {
  const allItems = actionItems.value;
  
  const leftKeys = ['exam', 'mijing', 'practice-grammar', 'practice-listening', 'practice-speaking', 'reading'];
  const rightKeys = ['practice-writing', 'mall', 'leaderboard', 'review', 'demons', 'achievements', 'profile'];
  
  const items = [];
  
  // 补齐左侧 7 个元素，插入一个透明占位符
  items.push({ key: 'spacer', isSpacer: true });
  leftKeys.forEach(k => items.push(allItems.find(i => i.key === k)));
  
  // 核心居中
  items.push(allItems.find(i => i.key === 'practice'));
  
  // 右侧 7 个元素
  rightKeys.forEach(k => items.push(allItems.find(i => i.key === k)));
  
  return items;
});

import MallView from './MallView.vue';
import LeaderboardView from './LeaderboardView.vue';

const showMall = ref(false);
const showLeaderboard = ref(false);

function goReading() {
  router.push('/reading');
}

function goExam() {
  router.push('/exam');
}

function goMijing() {
  router.push('/mijing');
}

function goMall() {
  showMall.value = true;
}

function goLeaderboard() {
  showLeaderboard.value = true;
}

async function openReview() {
  await openLegacyPanel(() => bridge.openReview(), '开启温故复盘...', '温故复盘加载失败');
}

async function openDemons() {
  await openLegacyPanel(() => bridge.openDemons(), '开启心魔录...', '心魔录加载失败');
}

async function openAchievements() {
  await openLegacyPanel(() => bridge.openAchievements(), '开启成就碑...', '成就碑加载失败');
}

async function openProfile() {
  await openLegacyPanel(() => bridge.openProfilePanel(), '开启我的洞府...', '洞府面板加载失败');
}

async function openLegacyPanel(task: () => Promise<unknown>, loadingText: string, failText: string) {
  ui.showLoading(loadingText);
  try {
    await task();
  } catch {
    ElMessage.error(failText);
  } finally {
    ui.hideLoading();
  }
}
</script>
