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
              <div class="mail-title">{{ msg.title }}</div>
              <div class="mail-body">{{ msg.body }}</div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useApiClient } from '../../services/api';

const props = defineProps<{
  visible: boolean;
  onOpenDailyQuest?: () => void;
  onOpenSignIn?: () => void;
}>();
const emit = defineEmits<{ (e: 'update:visible', value: boolean): void }>();

const api = useApiClient();
const router = useRouter();
const loading = ref(false);
const messages = ref<any[]>([]);
const unread = ref(0);

watch(() => props.visible, async (val) => {
  if (!val) return;
  loading.value = true;
  try {
    const res = await api.get('/mail/inbox');
    if (res?.success) {
      messages.value = res.data?.messages || [];
      unread.value = res.data?.unread ?? 0;
    }
  } catch {
    messages.value = [];
  } finally {
    loading.value = false;
  }
});

function handleMail(msg: any) {
  if (!msg.read && msg.id !== 'welcome') {
    api.post('/mail/read', { message_id: msg.id }).catch(() => {});
    msg.read = true;
    unread.value = messages.value.filter((m) => !m.read).length;
  }
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
.mail-title { color: #f7f3e8; font-weight: 600; margin-bottom: 4px; }
.mail-body { font-size: 13px; line-height: 1.6; }
.empty { text-align: center; padding: 30px; color: #8a8a9a; }
</style>
