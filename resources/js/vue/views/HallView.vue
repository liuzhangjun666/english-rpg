<template>
  <div class="hall-page">
    <div class="game-stage" ref="stageRef" :style="stageStyle">
      <div class="hall-scene">
        
        <!-- 核心中央图标 -->
        <div class="core-container" v-if="centerItem">
          <button type="button" class="action-card-icon-only core-icon" @click="centerItem.onClick" :title="centerItem.title">
            <img :src="centerItem.image" :alt="centerItem.title" class="action-thumb-icon" />
          </button>
        </div>

        <!-- 3D 半环形透视排列的周围图标 -->
        <div class="arc-container">
          <button
            v-for="(item, index) in arcItems"
            :key="item.key"
            type="button"
            class="action-card-icon-only arc-icon"
            :style="getArcStyle(index, arcItems.length)"
            @click="item.onClick"
            :title="item.title"
          >
            <img :src="item.image" :alt="item.title" class="action-thumb-icon" />
          </button>
        </div>

      </div>

      <!-- 底部导航 Dock -->
      <div class="hall-dock">
        <button v-for="item in dockItems" :key="item.key" type="button" class="action-card-icon-only dock-icon" @click="item.onClick" :title="item.title">
          <img :src="item.image" :alt="item.title" class="action-thumb-icon" />
        </button>
      </div>
    </div>
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

// --- 动态等比例缩放视口 (Safe Wrapper) ---
const stageRef = ref<HTMLElement | null>(null);
const scale = ref(1);
const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;

const stageStyle = computed(() => ({
  width: `${DESIGN_WIDTH}px`,
  height: `${DESIGN_HEIGHT}px`,
  transform: `translate(-50%, -50%) scale(${scale.value})`,
}));

const updateScale = () => {
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  // 保持宽高比完全容纳在窗口内 (类似 object-fit: contain)
  scale.value = Math.min(windowWidth / DESIGN_WIDTH, windowHeight / DESIGN_HEIGHT);
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

// 核心中心玩法 (练功房为主位)
const centerItem = computed(() => actionItems.value.find(i => i.key === 'practice'));

// 环绕在主位周围的系统玩法 (7个)
const arcItems = computed(() => {
  return actionItems.value.filter(i => 
    ['exam', 'mijing', 'practice-grammar', 'practice-listening', 'practice-speaking', 'reading', 'practice-writing'].includes(i.key)
  );
});

// 底部系统功能
const dockItems = computed(() => {
  return actionItems.value.filter(i => 
    ['mall', 'leaderboard', 'review', 'demons', 'achievements', 'profile'].includes(i.key)
  );
});

/**
 * 计算 3D 环形布局样式 (近大远小)
 * @param {number} index 当前图标的索引
 * @param {number} total 环形图标的总数
 */
function getArcStyle(index: number, total: number) {
  // 定义起始和结束角度（弧度制）。
  // Math.PI = 180度（左侧），0 = 0度（右侧）
  // 加上一点偏移量让圆弧不要完全平展开，形成约 165度 到 15度 的优美弧线
  const startAngle = Math.PI - 0.25; 
  const endAngle = 0.25; 
  
  // 根据索引计算当前图标的进度占比 (0 到 1)
  const progress = total > 1 ? index / (total - 1) : 0.5;
  // 当前图标对应的角度
  const angle = startAngle + progress * (endAngle - startAngle);
  
  // 椭圆长短半轴：基于 1920x1080 视口的百分比
  const rx = 36; // 长半轴 (占用约 72%)
  const ry = 22; // 短半轴 (占用约 44%)
  
  // 极坐标转笛卡尔坐标
  const x = Math.cos(angle) * rx; 
  const y = Math.sin(angle) * ry; 
  
  // Z轴深度计算：sin(angle) 在顶端（最远处）接近1，在两端接近0
  const depth = Math.sin(angle); 
  
  // 透视缩放：远处的缩小至 0.6，近处的保持 1.0
  const scale = 1 - (depth * 0.4); 
  // 透明度衰减：远处的稍微透明，增加空气透视感
  const opacity = 1 - (depth * 0.25); 
  // Z-index：离屏幕越近（depth 越小）层级越高
  const zIndex = Math.round(100 - depth * 50);
  
  return {
    position: 'absolute',
    left: `calc(50% + ${x}%)`,
    top: `calc(50% - ${y}%)`,
    transform: `translate(-50%, -50%) scale(${scale})`,
    opacity,
    zIndex
  };
}

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
  router.push('/mall');
}

function goLeaderboard() {
  router.push('/leaderboard');
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
