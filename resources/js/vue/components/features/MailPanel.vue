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
            <div
              v-for="msg in messages"
              :key="msg.id"
              class="mail-item"
              :class="{ unread: !msg.read }"
              @click="onRead(msg)"
            >
              <div class="mail-row">
                <span class="mail-title">{{ msg.title }}</span>
                <span v-if="msg.sender" class="mail-sender">{{ msg.sender }}</span>
                <span v-if="!msg.read" class="dot" />
              </div>
              <div class="mail-body">{{ msg.body }}</div>

              <!-- 附件奖励 -->
              <div v-if="msg.has_rewards && msg.rewards" class="reward-box">
                <div class="reward-chips">
                  <span v-for="(chip, i) in rewardChips(msg.rewards)" :key="i" class="reward-chip">
                    {{ chip }}
                  </span>
                </div>
                <button
                  v-if="msg.claimed"
                  class="claim-btn claimed"
                  disabled
                  @click.stop
                >已领取</button>
                <button
                  v-else
                  class="claim-btn"
                  :disabled="claimingId === msg.id"
                  @click.stop="onClaim(msg)"
                >{{ claimingId === msg.id ? '领取中…' : '领取奖励' }}</button>
              </div>

              <div class="mail-footer">
                <span v-if="msg.time" class="mail-time">{{ msg.time }}</span>
                <button v-if="msg.action" class="goto-btn" @click.stop="onGoto(msg)">前往 ›</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useMailStore, type MailMessage, type MailRewards } from '../../stores/mail';
import { refreshUserProfileFromApi } from '../../services/profile';

const props = defineProps<{
  visible: boolean;
  onOpenDailyQuest?: () => void;
  onOpenSignIn?: () => void;
}>();
const emit = defineEmits<{ (e: 'update:visible', value: boolean): void }>();

const router = useRouter();
const mail = useMailStore();
const claimingId = ref<string | null>(null);

const loading = computed(() => mail.loading);
const messages = computed(() => mail.messages);
const unread = computed(() => mail.unread);

// 打开面板即刷新一次：保证未读数与内容是最新的（其它入口可能已读过）。
watch(() => props.visible, (val) => {
  if (val) mail.fetchInbox();
});

function rewardChips(rewards: MailRewards): string[] {
  const chips: string[] = [];
  if (rewards.spirit_stone) chips.push(`💎 灵石 ×${rewards.spirit_stone}`);
  if (rewards.exp) chips.push(`🌟 修为 +${rewards.exp}`);
  if (rewards.spirit_power) chips.push(`⚡ 灵力 +${rewards.spirit_power}`);
  for (const it of rewards.items ?? []) {
    chips.push(`🎁 ${it.name || it.item_id} ×${it.quantity}`);
  }
  return chips;
}

// 点击邮件主体：仅标记已读，不关闭面板（让用户能继续领奖/查看）。
function onRead(msg: MailMessage) {
  if (!msg.read) mail.markRead(msg.id);
}

async function onClaim(msg: MailMessage) {
  if (claimingId.value) return;
  claimingId.value = msg.id;
  try {
    const result = await mail.claim(msg.id);
    if (result.success) {
      ElMessage.success(result.message || '奖励已领取');
      // 灵石/修为/灵力已入账，刷新顶栏资源
      await refreshUserProfileFromApi().catch(() => {});
    } else {
      ElMessage.warning(result.message || '领取失败');
    }
  } finally {
    claimingId.value = null;
  }
}

function onGoto(msg: MailMessage) {
  if (!msg.read) mail.markRead(msg.id);
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
.mail-sender { font-size: 11px; color: #9a8c5a; flex-shrink: 0; }
.dot { width: 7px; height: 7px; border-radius: 50%; background: #ff8c00; box-shadow: 0 0 6px rgba(255,140,0,0.7); flex-shrink: 0; }
.mail-body { font-size: 13px; line-height: 1.6; }
.reward-box { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 10px; padding: 8px 10px; border-radius: 8px; background: rgba(212,168,67,0.08); border: 1px solid rgba(212,168,67,0.2); }
.reward-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.reward-chip { font-size: 12px; color: #ffd27a; background: rgba(0,0,0,0.25); border-radius: 4px; padding: 2px 7px; }
.claim-btn { flex-shrink: 0; background: linear-gradient(135deg, #d4a843, #b8902f); border: none; color: #1a1a2e; font-weight: 700; font-size: 12px; padding: 6px 14px; border-radius: 5px; cursor: pointer; }
.claim-btn:hover:not(:disabled) { filter: brightness(1.1); }
.claim-btn:disabled { cursor: default; }
.claim-btn.claimed { background: rgba(255,255,255,0.1); color: #8a8a9a; }
.mail-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; }
.mail-time { font-size: 11px; color: #6c6c80; }
.goto-btn { background: transparent; border: 1px solid rgba(212,168,67,0.4); color: #d4a843; font-size: 12px; padding: 3px 10px; border-radius: 4px; cursor: pointer; }
.goto-btn:hover { background: rgba(212,168,67,0.15); }
.empty { text-align: center; padding: 30px; color: #8a8a9a; }
</style>
