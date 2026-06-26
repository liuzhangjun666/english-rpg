<template>
  <Teleport to="body">
    <transition name="fade">
      <div v-if="visible" class="cultivation-overlay" @click.self="close">
        <div class="cultivation-container">
          <div class="cultivation-header">
            <span class="cultivation-title">✉️ 传音信箱</span>
            <span v-if="unread > 0" class="unread-badge">{{ unread }} 未读</span>
            <button class="cultivation-close-btn" @click="close">关闭</button>
          </div>
          <div class="cultivation-body" v-loading="loading">
            <div v-if="messages.length === 0 && !loading" class="empty">暂无传音</div>
            <div v-for="msg in messages" :key="msg.id" class="mail-item" :class="{ unread: !msg.read }" @click="handleMail(msg)">
              <div class="mail-row">
                <span class="mail-title">{{ msg.title }}</span>
                <span v-if="!msg.read" class="dot" />
              </div>
              <div class="mail-body">{{ msg.body }}</div>
              <div v-if="msg.time" class="mail-time">{{ msg.time }}</div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useMailStore, type MailMessage } from '../../stores/mail';

const props = defineProps<{
  visible: boolean;
  onOpenDailyQuest?: () => void;
  onOpenSignIn?: () => void;
}>();
const emit = defineEmits<{ (e: 'update:visible', value: boolean): void }>();

const router = useRouter();
const mail = useMailStore();

const loading = computed(() => mail.loading);
const messages = computed(() => mail.messages);
const unread = computed(() => mail.unread);

// 打开面板即刷新一次：保证未读数与内容是最新的（其它入口可能已读过）。
watch(() => props.visible, (val) => {
  if (val) mail.fetchInbox();
});

function handleMail(msg: MailMessage) {
  mail.markRead(msg.id);
  close();
  if (msg.action === 'signin') props.onOpenSignIn?.();
  else if (msg.action === 'dailyQuest') props.onOpenDailyQuest?.();
  else if (msg.action === 'exam') router.push('/exam');
}

function close() {
  emit('update:visible', false);
}
</script>

<style scoped>
.cultivation-overlay { position: fixed; inset: 0; z-index: 2200; background: rgba(10,10,26,0.85); display: flex; align-items: center; justify-content: center; }
.cultivation-container { width: min(480px, 92vw); max-height: 90vh; background: #1a1a2e; border: 2px solid #d4a843; border-radius: 12px; display: flex; flex-direction: column; }
.cultivation-header { display: flex; align-items: center; gap: 10px; padding: 16px; border-bottom: 1px solid rgba(212,168,67,0.3); }
.cultivation-title { color: #d4a843; font-weight: 700; flex: 1; }
.unread-badge { font-size: 12px; color: #ff8c00; }
.cultivation-close-btn { background: transparent; border: 1px solid #d4a843; color: #d4a843; padding: 4px 12px; border-radius: 4px; cursor: pointer; }
.cultivation-body { padding: 16px; overflow-y: auto; }
.mail-item { padding: 12px; margin-bottom: 8px; border-radius: 10px; background: rgba(255,255,255,0.03); cursor: pointer; color: #c8b685; }
.mail-item.unread { border: 1px solid rgba(212,168,67,0.35); }
.mail-item:hover { background: rgba(212,168,67,0.08); }
.mail-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.mail-title { color: #f7f3e8; font-weight: 600; flex: 1; }
.dot { width: 7px; height: 7px; border-radius: 50%; background: #ff8c00; box-shadow: 0 0 6px rgba(255,140,0,0.7); flex-shrink: 0; }
.mail-body { font-size: 13px; line-height: 1.6; }
.mail-time { font-size: 11px; color: #6c6c80; margin-top: 6px; }
.empty { text-align: center; padding: 30px; color: #8a8a9a; }
</style>
