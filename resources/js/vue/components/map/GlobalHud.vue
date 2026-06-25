<template>
  <div class="global-hud" :class="{ expanded: isExpanded }">
    <!-- 折叠触发按钮 -->
    <button class="toggle-btn" @click="toggleExpanded" :title="isExpanded ? '收起' : '展开功能'">
      <span class="toggle-arrow">{{ isExpanded ? '›' : '‹' }}</span>
    </button>

    <!-- 功能面板 -->
    <transition name="slide">
      <div v-show="isExpanded" class="hud-dock">
        <div v-for="item in dockItems" :key="item.id" class="hud-item" @click="item.onClick" :title="item.name">
          <div class="hud-icon-wrapper">
            <img v-if="item.iconUrl" :src="item.iconUrl" :alt="item.name" class="hud-icon-img" />
            <span v-else class="hud-icon-emoji">{{ item.emoji }}</span>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUiStore } from '../../stores/ui';
import hallMall from '../../../../assets/images/ui/hall_mall.png';
import hallLeaderboard from '../../../../assets/images/ui/hall_leaderboard.png';
import hallReview from '../../../../assets/images/ui/hall_review.png';
import hallAchievements from '../../../../assets/images/ui/hall_achievements.png';
import hallProfile from '../../../../assets/images/ui/hall_profile.png';

const router = useRouter();
const ui = useUiStore();

const emit = defineEmits<{
  (e: 'open-review'): void;
  (e: 'open-achievements'): void;
  (e: 'open-profile'): void;
  (e: 'open-events'): void;
  (e: 'open-mail'): void;
  (e: 'open-settings'): void;
}>();

// 展开/收起状态由 ui store 持有，跨路由 + 跨会话保留
const isExpanded = computed(() => ui.sidebarExpanded);
function toggleExpanded() {
  ui.setSidebarExpanded(!ui.sidebarExpanded);
}

const dockItems = ref([
  { id: 'mall', name: '坊市', iconUrl: hallMall, onClick: () => router.push('/mall') },
  { id: 'leaderboard', name: '排行榜', iconUrl: hallLeaderboard, onClick: () => router.push('/leaderboard') },
  { id: 'activities', name: '活动', emoji: '🎁', onClick: () => emit('open-events') },
  { id: 'mail', name: '邮件', emoji: '✉️', onClick: () => emit('open-mail') },
  { id: 'review', name: '复盘', iconUrl: hallReview, onClick: () => emit('open-review') },
  { id: 'achievements', name: '成就碑', iconUrl: hallAchievements, onClick: () => emit('open-achievements') },
  { id: 'profile', name: '洞府', iconUrl: hallProfile, onClick: () => emit('open-profile') },
  { id: 'settings', name: '设置', emoji: '⚙️', onClick: () => emit('open-settings') },
]);
</script>

<style scoped>
.global-hud {
  position: absolute;
  /* 从顶部导航栏下方开始，避免最上方图标顶进导航栏 */
  top: calc(var(--top-hud-height, 76px) + 8px);
  right: 0;
  bottom: 8px;
  z-index: 1000;
  pointer-events: none;
  display: flex;
  align-items: center;
}

.toggle-btn {
  pointer-events: auto;
  width: 28px;
  height: 60px;
  border: 1px solid rgba(212, 168, 67, 0.4);
  border-right: none;
  border-radius: 8px 0 0 8px;
  background: rgba(15, 20, 35, 0.7);
  color: #ffd700;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(6px);
  transition: all 0.3s;
  flex-shrink: 0;
}

.toggle-btn:hover {
  background: rgba(15, 20, 35, 0.9);
  border-color: rgba(255, 215, 0, 0.7);
  width: 32px;
}

.toggle-arrow {
  transition: transform 0.3s;
  font-weight: bold;
}

.hud-dock {
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
  align-self: stretch;
  gap: 8px;
  background: rgba(15, 20, 35, 0.7);
  border: 1px solid rgba(212, 168, 67, 0.3);
  border-right: none;
  border-top: none;
  border-bottom: none;
  padding: 16px 8px;
  border-radius: 12px 0 0 12px;
  backdrop-filter: blur(8px);
  pointer-events: auto;
}

.hud-item {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s, filter 0.2s;
}

.hud-item:hover {
  transform: scale(1.15);
  filter: brightness(1.3);
}

.hud-icon-wrapper {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(10, 15, 25, 0.6);
  border: 1px solid rgba(212, 168, 67, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: inset 0 0 8px rgba(212, 168, 67, 0.15);
}

.hud-item:hover .hud-icon-wrapper {
  border-color: rgba(255, 215, 0, 0.8);
  box-shadow: 0 0 12px rgba(212, 168, 67, 0.4), inset 0 0 8px rgba(255, 215, 0, 0.3);
}

.hud-icon-img {
  width: 26px;
  height: 26px;
  object-fit: contain;
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.5));
}

.hud-icon-emoji {
  font-size: 20px;
}

/* 滑出动画 */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateX(60px);
}
</style>
