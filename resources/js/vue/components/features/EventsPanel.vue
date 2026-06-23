<template>
  <Teleport to="body">
    <transition name="fade">
      <div v-if="visible" class="cultivation-overlay" @click.self="close">
        <div class="cultivation-container">
          <div class="cultivation-header">
            <span class="cultivation-title">🎁 秘境活动</span>
            <button class="cultivation-close-btn" @click="close">关闭</button>
          </div>
          <div class="cultivation-body">
            <div v-for="ev in events" :key="ev.id" class="event-card">
              <div class="event-title">{{ ev.title }}</div>
              <div class="event-desc">{{ ev.desc }}</div>
              <div class="event-reward">{{ ev.reward }}</div>
              <el-button size="small" type="primary" @click="ev.action()">{{ ev.btn }}</el-button>
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

const events = computed(() => [
  {
    id: 'daily',
    title: '每日修炼赏',
    desc: '完成词汇、秘境、阅读三项任务领取灵石与灵力。',
    reward: '⚡灵力+20 · 💎灵石+50',
    btn: '查看任务',
    action: () => { close(); props.onOpenDailyQuest?.(); },
  },
  {
    id: 'signin',
    title: '晨签纳灵',
    desc: '每日签到领取灵石，并恢复灵力。',
    reward: '💎灵石+10',
    btn: '去签到',
    action: () => { close(); props.onOpenSignIn?.(); },
  },
  {
    id: 'mijing',
    title: '限时秘境',
    desc: '60 秒连击挑战，答题越快得分越高。',
    reward: '修为与灵石奖励',
    btn: '进入秘境',
    action: () => { close(); props.onOpenMijing?.(); },
  },
]);

function close() {
  emit('update:visible', false);
}
</script>

<style scoped>
.cultivation-overlay { position: fixed; inset: 0; z-index: 2200; background: rgba(10,10,26,0.85); display: flex; align-items: center; justify-content: center; }
.cultivation-container { width: min(460px, 92vw); max-height: 90vh; background: #1a1a2e; border: 2px solid #d4a843; border-radius: 12px; overflow: hidden; }
.cultivation-header { display: flex; justify-content: space-between; padding: 16px; border-bottom: 1px solid rgba(212,168,67,0.3); }
.cultivation-title { color: #d4a843; font-weight: 700; }
.cultivation-close-btn { background: transparent; border: 1px solid #d4a843; color: #d4a843; padding: 4px 12px; border-radius: 4px; cursor: pointer; }
.cultivation-body { padding: 20px; overflow-y: auto; }
.event-card { padding: 14px; margin-bottom: 12px; border-radius: 12px; background: rgba(255,255,255,0.04); color: #c8b685; }
.event-title { color: #d4a843; font-weight: 700; margin-bottom: 6px; }
.event-desc { font-size: 13px; line-height: 1.6; margin-bottom: 6px; }
.event-reward { font-size: 12px; color: #4ec07a; margin-bottom: 10px; }
</style>
