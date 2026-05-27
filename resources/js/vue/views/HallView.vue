<template>
  <div class="hall-page">
    <div class="hall-actions">
      <button
        v-for="item in actionItems"
        :key="item.key"
        type="button"
        class="action-card-icon-only"
        @click="item.onClick"
        :title="item.title"
      >
        <img :src="item.image" :alt="item.title" class="action-thumb-icon" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
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

onMounted(async () => {
  ui.showLoading('进入大厅...');
  try {
    await bridge.switchToHall();
  } catch (error) {
    ElMessage.error('大厅加载失败，请刷新重试');
  } finally {
    ui.hideLoading();
  }
});

function goPractice(mode = 'vocab') {
  router.push({ path: '/practice', query: { mode } });
}

function goGrammar() {
  router.push('/grammar');
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
    onClick: () => goGrammar(),
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
