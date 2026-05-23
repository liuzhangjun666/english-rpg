<template>
  <div class="hall-page">

    <el-row :gutter="12" class="hall-actions">
      <el-col v-for="item in actionItems" :key="item.key" :xs="24" :sm="12" :md="8" :lg="6" :xl="6">
        <button type="button" class="action-card" @click="item.onClick">
          <img :src="item.image" :alt="item.title" class="action-thumb" />
          <div class="action-meta">
            <h3>{{ item.title }}</h3>
          </div>
          <span class="action-enter">进入</span>
        </button>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useLegacyBridge } from '../composables/useLegacyBridge';
import { useUserStore } from '../stores/user';
import { useUiStore } from '../stores/ui';
import hallPractice from '../../../assets/images/ui/hall_practice.png';
import hallListening from '../../../assets/images/ui/hall_listening.png';
import hallWriting from '../../../assets/images/ui/hall_writing.png';
import hallReading from '../../../assets/images/ui/hall_reading.png';
import hallExam from '../../../assets/images/ui/hall_shilianchang.png';
import hallMijing from '../../../assets/images/ui/hall_mijing.png';
import hallMall from '../../../assets/images/ui/hall_mall.png';
import hallLeaderboard from '../../../assets/images/ui/hall_leaderboard.png';

const router = useRouter();
const bridge = useLegacyBridge();
const user = useUserStore();
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

const actionItems = computed(() => [
  {
    key: 'practice-vocab',
    title: '练功房',
    desc: '炼词筑基，语法淬体',
    image: hallPractice,
    onClick: () => goPractice('vocab'),
  },
  {
    key: 'practice-listening',
    title: '听风谷',
    desc: '听音辨律，口诵仙诀',
    image: hallListening,
    onClick: () => goPractice('listening'),
  },
  {
    key: 'practice-writing',
    title: '符箓台',
    desc: '以笔画符，书写乾坤',
    image: hallWriting,
    onClick: () => goPractice('writing'),
  },
  {
    key: 'reading',
    title: '藏经阁',
    desc: '阅外域残卷，寻无上机缘',
    image: hallReading,
    onClick: () => goReading(),
  },
  {
    key: 'exam',
    title: '试炼场',
    desc: '答题渡劫，宗门考核',
    image: hallExam,
    onClick: () => goExam(),
  },
  {
    key: 'mijing',
    title: '秘境',
    desc: '限时历练，夺取真意',
    image: hallMijing,
    onClick: () => goMijing(),
  },
  {
    key: 'mall',
    title: '仙坊',
    desc: '灵石交易，法宝补给',
    image: hallMall,
    onClick: () => goMall(),
  },
  {
    key: 'leaderboard',
    title: '天榜',
    desc: '诸天万界，群仙斗法',
    image: hallLeaderboard,
    onClick: () => goLeaderboard(),
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
</script>
