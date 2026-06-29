<template>
  <Teleport to="body">
    <transition name="fade">
      <div v-if="visible" class="cultivation-overlay cultivation-theme" @click.self="close">
        <div class="cultivation-container">
          <div class="cultivation-header">
            <span class="cultivation-title">🎁 秘境活动</span>
            <button class="cultivation-close-btn" type="button" @click="close">关闭</button>
          </div>
          <div class="cultivation-body">
            <div v-for="ev in events" :key="ev.id" class="event-card">
              <div class="event-title">{{ ev.title }}</div>
              <div class="event-desc">{{ ev.desc }}</div>
              <div class="event-reward">{{ ev.reward }}</div>
              <button type="button" class="event-action-btn" @click="ev.action()">{{ ev.btn }}</button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  visible: boolean;
  onOpenDailyQuest?: () => void;
  onOpenSignIn?: () => void;
  onOpenMijing?: () => void;
}>();
const emit = defineEmits<{ (e: 'update:visible', value: boolean): void }>();

function close() {
  emit('update:visible', false);
}

const events = computed(() => [
  {
    id: 'daily',
    title: '每日修炼赏',
    desc: '完成词汇、秘境、阅读三项任务领取灵石与灵力。',
    reward: '⚡灵力+20 · 💎灵石+50',
    btn: '查看任务',
    action: () => {
      close();
      props.onOpenDailyQuest?.();
    },
  },
  {
    id: 'signin',
    title: '晨签纳灵',
    desc: '每日签到领取灵石，并恢复灵力。',
    reward: '💎灵石+10',
    btn: '去签到',
    action: () => {
      close();
      props.onOpenSignIn?.();
    },
  },
  {
    id: 'mijing',
    title: '限时秘境',
    desc: '60 秒连击挑战，答题越快得分越高。',
    reward: '修为与灵石奖励',
    btn: '前往秘境',
    action: () => {
      close();
      props.onOpenMijing?.();
    },
  },
]);
</script>

<style scoped>
.cultivation-overlay {
  position: fixed;
  inset: 0;
  z-index: 2200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  box-sizing: border-box;
  background: rgba(10, 10, 26, 0.85);
}

.cultivation-container {
  width: 100%;
  max-width: 460px;
  background: #1a1a2e;
  border: 2px solid #d4a843;
  border-radius: 12px;
}

.cultivation-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid rgba(212, 168, 67, 0.3);
}

.cultivation-title {
  color: #d4a843;
  font-weight: 700;
}

.cultivation-close-btn {
  padding: 4px 12px;
  border: 1px solid #d4a843;
  border-radius: 4px;
  background: transparent;
  color: #d4a843;
  cursor: pointer;
}

.cultivation-body {
  max-height: 70vh;
  padding: 20px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.event-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  margin-bottom: 12px;
  padding: 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  color: #c8b685;
}

.event-card:last-child {
  margin-bottom: 0;
}

.event-title {
  color: #d4a843;
  font-weight: 700;
}

.event-desc {
  font-size: 13px;
  line-height: 1.6;
}

.event-reward {
  margin-bottom: 4px;
  font-size: 12px;
  color: #4ec07a;
}

.event-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  margin-top: 4px;
  padding: 6px 18px;
  border: 1px solid rgba(90, 150, 240, 0.75);
  border-radius: 6px;
  background: linear-gradient(180deg, #5b9df0 0%, #2f6fcc 100%);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.2;
  cursor: pointer;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(47, 111, 204, 0.35);
}

.event-action-btn:hover {
  filter: brightness(1.08);
}

.event-action-btn:active {
  transform: translateY(1px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
