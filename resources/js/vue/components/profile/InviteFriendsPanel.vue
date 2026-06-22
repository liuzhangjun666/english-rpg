<template>
  <Transition name="invite-fade">
    <div v-if="visible" class="invite-overlay" @click.self="close">
      <div class="invite-modal">
        <!-- Header -->
        <div class="invite-header">
          <span class="invite-title">☯ 招募道友</span>
          <button class="invite-close" @click="close" aria-label="关闭">✕</button>
        </div>

        <!-- 招募令卡片 -->
        <div class="invite-card">
          <div class="invite-card-corner top-left"></div>
          <div class="invite-card-corner top-right"></div>
          <div class="invite-card-corner bottom-left"></div>
          <div class="invite-card-corner bottom-right"></div>

          <div class="invite-card-title">太虚仙门 · 招募令</div>

          <div class="invite-card-avatar-row">
            <div class="invite-card-avatar">
              <img v-if="user.avatar_url" :src="user.avatar_url" alt="" />
              <span v-else class="invite-card-avatar-fallback">{{ avatarInitial }}</span>
            </div>
            <div class="invite-card-user">
              <div class="invite-card-nickname">{{ user.nickname || '匿名前辈' }}</div>
              <div class="invite-card-realm">{{ user.current_realm || '凡人' }}</div>
            </div>
          </div>

          <div class="invite-card-quote">
            "邀你共渡英语劫，同入太虚仙门。"
          </div>

          <div class="invite-card-bottom">
            <div class="invite-card-code">
              <span class="invite-card-code-label">邀请码</span>
              <span class="invite-card-code-value">{{ inviteCode }}</span>
            </div>
            <div class="invite-card-qr" v-if="qrDataUrl">
              <img :src="qrDataUrl" alt="招募二维码" />
              <span class="invite-card-qr-hint">扫码加入</span>
            </div>
          </div>
        </div>

        <!-- 复制邀请码 -->
        <div class="invite-section">
          <div class="invite-section-label">你的邀请码</div>
          <div class="invite-input-row">
            <div class="invite-input">{{ inviteCode }}</div>
            <button class="invite-copy-btn" @click="copy(inviteCode, '邀请码')">
              📋 复制
            </button>
          </div>
        </div>

        <!-- 复制邀请链接 -->
        <div class="invite-section">
          <div class="invite-section-label">邀请链接</div>
          <div class="invite-input-row">
            <div class="invite-input invite-link" :title="inviteUrl">{{ inviteUrl }}</div>
            <button class="invite-copy-btn" @click="copy(inviteUrl, '链接')">
              📋 复制
            </button>
          </div>
        </div>

        <!-- 邀请人信息（如果当前用户是被别人邀请进来的） -->
        <div v-if="inviter" class="invite-inviter">
          <span class="invite-inviter-label">引你入门：</span>
          <span class="invite-inviter-name">{{ inviter.nickname }}</span>
          <span v-if="inviter.current_realm" class="invite-inviter-realm">{{ inviter.current_realm }}</span>
        </div>

        <!-- 进度 + 奖励提示 -->
        <div class="invite-progress">
          <div class="invite-progress-row">
            <span class="invite-progress-label">已招募道友</span>
            <span class="invite-progress-val">{{ invitedCount }} / {{ nextTierTarget }}</span>
          </div>
          <div class="invite-progress-track">
            <div class="invite-progress-fill" :style="{ width: progressPercent + '%' }"></div>
          </div>
          <div class="invite-progress-tier">
            累计获得 <span class="reward">+{{ totalReward }} 灵力</span>
          </div>
        </div>

        <!-- 奖励规则 -->
        <div class="invite-rules">
          <div class="invite-rules-title">渡人功德 · 奖励机制</div>
          <ul>
            <li>新道友注册成功 → 你获得 <span class="reward">+{{ perInviteReward }} 灵力</span></li>
            <li>新道友注册成功 → 他获得 <span class="reward">+{{ newUserReward }} 灵力</span></li>
            <li>每邀请一位道友 → 渡人功德 +1</li>
          </ul>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import QRCode from 'qrcode';
import { useUserStore } from '../../stores/user';
import { useApiClient } from '../../services/api';

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{ (e: 'update:visible', value: boolean): void }>();

const userStore = useUserStore();
const api = useApiClient();
const user = computed(() => userStore.profile || {});

// 邀请数据由后端 /api/share/info 提供。未到达时使用 profile 里的 invite_code 兜底。
const shareInfo = ref<{
  invite_code: string;
  invited_count: number;
  total_sharer_reward: number;
  inviter: { nickname: string; avatar_url?: string; current_realm?: string } | null;
  rewards: { register: { sharer: number; new_user_spirit: number } };
} | null>(null);
const loading = ref(false);

const inviteCode = computed(() => {
  return shareInfo.value?.invite_code
    || String((user.value as any)?.invite_code || '')
    || '——';
});

const inviteUrl = computed(() => {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return inviteCode.value !== '——' ? `${origin}/login?ref=${inviteCode.value}` : '';
});

const avatarInitial = computed(() => {
  const name = String(user.value?.nickname || '匿名前辈').trim();
  return name.charAt(0) || '道';
});

const invitedCount = computed(() => Number(shareInfo.value?.invited_count || 0));

// 二维码：邀请链接变化时异步生成 dataURL，写进 img.src
const qrDataUrl = ref<string>('');
async function generateQR(url: string) {
  if (!url) { qrDataUrl.value = ''; return; }
  try {
    qrDataUrl.value = await QRCode.toDataURL(url, {
      width: 220,
      margin: 1,
      color: { dark: '#0e1730', light: '#fff2c6' },  // 仙侠配色：深蓝 on 米黄
      errorCorrectionLevel: 'M',
    });
  } catch (e) {
    qrDataUrl.value = '';
  }
}
const totalReward = computed(() => Number(shareInfo.value?.total_sharer_reward || 0));
const perInviteReward = computed(() => Number(shareInfo.value?.rewards?.register?.sharer || 100));
const newUserReward = computed(() => Number(shareInfo.value?.rewards?.register?.new_user_spirit || 200));
const inviter = computed(() => shareInfo.value?.inviter || null);

// 阶梯式目标：N <3 时下一档是 3，N <10 时下一档是 10，已达 10 后保持 10 满
const nextTierTarget = computed(() => {
  const n = invitedCount.value;
  if (n < 1) return 1;
  if (n < 3) return 3;
  if (n < 10) return 10;
  return Math.max(10, Math.ceil(n / 10) * 10 + 10);
});

const progressPercent = computed(() => {
  return Math.min(100, Math.round((invitedCount.value / nextTierTarget.value) * 100));
});

// 面板打开时拉一次最新数据
watch(
  () => props.visible,
  async (v) => {
    if (!v) return;
    loading.value = true;
    try {
      const res = await api.get('/share/info');
      if (res?.success && res?.data) {
        shareInfo.value = res.data;
      }
    } catch {
      // 静默失败：用户照样能看到 profile 里的 invite_code，只是 stats 是 0
    } finally {
      loading.value = false;
    }
  },
  { immediate: true },
);

// 邀请链接出来后立即生成二维码
watch(inviteUrl, (url) => { void generateQR(url); }, { immediate: true });

function close() {
  emit('update:visible', false);
}

async function copy(text: string, label: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback：iframe 内 / HTTP 站点 / 老浏览器 clipboard API 不可用
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    ElMessage.success(`${label}已复制到剪贴板`);
  } catch {
    ElMessage.error('复制失败，请手动选中复制');
  }
}
</script>

<style scoped>
.invite-overlay {
  position: fixed;
  inset: 0;
  z-index: 2500;
  background: rgba(5, 10, 24, 0.65);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.invite-modal {
  width: min(440px, 100%);
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  background: linear-gradient(180deg, #161931 0%, #0d1129 100%);
  border: 1px solid rgba(212, 168, 67, 0.4);
  border-radius: 14px;
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.6),
    0 0 32px rgba(212, 168, 67, 0.12);
  padding: 24px;
}

.invite-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.invite-title {
  font-size: 20px;
  font-weight: 700;
  color: #f3d481;
  letter-spacing: 0.1em;
}

.invite-close {
  background: transparent;
  border: 1px solid rgba(212, 168, 67, 0.5);
  color: #f3d481;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}
.invite-close:hover {
  background: rgba(212, 168, 67, 0.15);
  border-color: #f3d481;
}

/* ─── 招募令卡片 ──────────────────────────────────────── */

.invite-card {
  position: relative;
  background:
    radial-gradient(ellipse at center, rgba(243, 212, 129, 0.08) 0%, transparent 70%),
    linear-gradient(180deg, #1c2447 0%, #0e1730 100%);
  border: 1px solid rgba(243, 212, 129, 0.45);
  border-radius: 10px;
  padding: 22px 20px;
  margin-bottom: 22px;
}

.invite-card-corner {
  position: absolute;
  width: 14px;
  height: 14px;
  border: 2px solid #f3d481;
}
.invite-card-corner.top-left     { top: 6px; left: 6px;    border-right: 0; border-bottom: 0; }
.invite-card-corner.top-right    { top: 6px; right: 6px;   border-left: 0; border-bottom: 0; }
.invite-card-corner.bottom-left  { bottom: 6px; left: 6px; border-right: 0; border-top: 0; }
.invite-card-corner.bottom-right { bottom: 6px; right: 6px; border-left: 0; border-top: 0; }

.invite-card-title {
  font-size: 18px;
  font-family: 'Ma Shan Zheng', 'STXingkai', 'KaiTi', serif;
  font-weight: 700;
  color: #f3d481;
  text-align: center;
  letter-spacing: 0.2em;
  text-shadow: 0 0 12px rgba(243, 212, 129, 0.45);
  margin-bottom: 18px;
}

.invite-card-avatar-row {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 14px;
}

.invite-card-avatar {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  border: 2px solid #f3d481;
  overflow: hidden;
  background: linear-gradient(135deg, #3a2a5a, #1a3a5a);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.invite-card-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.invite-card-avatar-fallback {
  color: #f3d481;
  font-family: 'Ma Shan Zheng', serif;
  font-size: 24px;
  font-weight: 700;
}

.invite-card-nickname {
  font-size: 17px;
  font-weight: 700;
  color: #fff2c6;
}
.invite-card-realm {
  font-size: 12px;
  color: rgba(244, 222, 175, 0.7);
  margin-top: 2px;
  letter-spacing: 0.05em;
}

.invite-card-quote {
  font-style: italic;
  text-align: center;
  font-size: 13px;
  color: rgba(190, 210, 240, 0.7);
  padding: 12px 0;
  border-top: 1px dashed rgba(243, 212, 129, 0.25);
  border-bottom: 1px dashed rgba(243, 212, 129, 0.25);
  margin-bottom: 14px;
}

.invite-card-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.invite-card-code {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.invite-card-qr {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 6px;
  background: #fff2c6;
  border-radius: 6px;
  border: 1px solid rgba(243, 212, 129, 0.6);
}
.invite-card-qr img {
  width: 72px;
  height: 72px;
  display: block;
}
.invite-card-qr-hint {
  font-size: 10px;
  color: #5a3a1e;
  letter-spacing: 0.08em;
}
.invite-card-code-label {
  font-size: 12px;
  color: rgba(244, 222, 175, 0.65);
  letter-spacing: 0.1em;
}
.invite-card-code-value {
  font-family: 'Inter', monospace;
  font-size: 22px;
  font-weight: 800;
  color: #f3d481;
  letter-spacing: 0.18em;
  text-shadow: 0 0 8px rgba(243, 212, 129, 0.5);
}

/* ─── 复制行 ──────────────────────────────────────── */

.invite-section {
  margin-bottom: 16px;
}

.invite-section-label {
  font-size: 12px;
  color: rgba(244, 222, 175, 0.7);
  margin-bottom: 6px;
  letter-spacing: 0.08em;
}

.invite-input-row {
  display: flex;
  gap: 8px;
}

.invite-input {
  flex: 1;
  min-width: 0;
  padding: 9px 12px;
  background: rgba(8, 14, 32, 0.85);
  border: 1px solid rgba(212, 168, 67, 0.3);
  border-radius: 6px;
  color: #fff2c6;
  font-family: 'Inter', monospace;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
}

.invite-link {
  letter-spacing: 0;
}

.invite-copy-btn {
  flex-shrink: 0;
  padding: 9px 14px;
  background: linear-gradient(180deg, rgba(243, 212, 129, 0.18), rgba(200, 145, 52, 0.18));
  border: 1px solid rgba(243, 212, 129, 0.55);
  color: #f3d481;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.invite-copy-btn:hover {
  background: linear-gradient(180deg, rgba(243, 212, 129, 0.32), rgba(200, 145, 52, 0.28));
  border-color: #f3d481;
  box-shadow: 0 0 12px rgba(243, 212, 129, 0.25);
}

/* ─── 进度 ──────────────────────────────────────── */

.invite-inviter {
  background: rgba(8, 14, 32, 0.4);
  border: 1px solid rgba(140, 197, 255, 0.25);
  border-radius: 6px;
  padding: 8px 12px;
  margin-top: 14px;
  font-size: 12.5px;
  color: rgba(190, 210, 240, 0.8);
}
.invite-inviter-label {
  margin-right: 6px;
}
.invite-inviter-name {
  color: #8cc5ff;
  font-weight: 600;
}
.invite-inviter-realm {
  margin-left: 8px;
  font-size: 11px;
  color: rgba(140, 197, 255, 0.65);
}

.invite-progress {
  background: rgba(8, 14, 32, 0.6);
  border: 1px solid rgba(212, 168, 67, 0.2);
  border-radius: 8px;
  padding: 14px;
  margin-top: 14px;
  margin-bottom: 16px;
}

.invite-progress-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: rgba(244, 222, 175, 0.85);
  margin-bottom: 8px;
}

.invite-progress-val {
  font-family: 'Inter', monospace;
  font-weight: 700;
  color: #f3d481;
}

.invite-progress-track {
  height: 6px;
  background: rgba(20, 30, 60, 0.9);
  border-radius: 999px;
  border: 1px solid rgba(212, 168, 67, 0.25);
  overflow: hidden;
}

.invite-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #c8893a 0%, #f3d481 50%, #fff2c6 100%);
  box-shadow: 0 0 8px rgba(243, 212, 129, 0.5);
  border-radius: 999px;
  transition: width 0.4s ease;
}

.invite-progress-tier {
  margin-top: 10px;
  font-size: 12px;
  color: rgba(190, 210, 240, 0.75);
}

/* ─── 奖励规则 ──────────────────────────────────────── */

.invite-rules {
  background: rgba(8, 14, 32, 0.4);
  border-left: 3px solid rgba(243, 212, 129, 0.5);
  border-radius: 0 6px 6px 0;
  padding: 12px 16px;
}

.invite-rules-title {
  font-size: 13px;
  color: #f3d481;
  font-weight: 600;
  margin-bottom: 8px;
  letter-spacing: 0.08em;
}

.invite-rules ul {
  margin: 0;
  padding-left: 20px;
  color: rgba(244, 222, 175, 0.75);
  font-size: 12.5px;
  line-height: 1.8;
}

.reward {
  color: #f3d481;
  font-weight: 700;
}

/* ─── 过渡 ──────────────────────────────────────── */

.invite-fade-enter-active,
.invite-fade-leave-active {
  transition: opacity 0.25s ease;
}
.invite-fade-enter-active .invite-modal,
.invite-fade-leave-active .invite-modal {
  transition: transform 0.25s ease;
}
.invite-fade-enter-from,
.invite-fade-leave-to {
  opacity: 0;
}
.invite-fade-enter-from .invite-modal,
.invite-fade-leave-to .invite-modal {
  transform: scale(0.94);
}
</style>
