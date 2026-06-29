<template>
  <Teleport to="body">
    <transition name="recharge-fade">
      <div v-if="visible" class="recharge-overlay" @click.self="close">
        <div class="recharge-panel cultivation-theme">
          <div class="panel-header">
            <div>
              <h2>仙府宝库</h2>
              <p class="panel-sub">充值仙玉 · 兑换灵石 · 开通仙籍加速</p>
            </div>
            <button type="button" class="close-btn" @click="close">✕</button>
          </div>

          <div class="balance-row">
            <div class="balance-chip">
              <span class="chip-label">仙玉</span>
              <span class="chip-value">💠 {{ jadeBalance }}</span>
            </div>
            <div class="balance-chip">
              <span class="chip-label">灵石</span>
              <span class="chip-value">💎 {{ spiritStone }}</span>
            </div>
            <div v-if="vipInfo.is_vip" class="balance-chip is-vip">
              <span class="chip-label">仙籍</span>
              <span class="chip-value">加速中</span>
            </div>
          </div>

          <div class="tab-row">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              type="button"
              class="tab-btn"
              :class="{ 'is-active': activeTab === tab.key }"
              @click="switchTab(tab.key)"
            >
              {{ tab.label }}
            </button>
          </div>

          <div
            v-if="panelNotice"
            class="panel-notice"
            :class="`panel-notice--${panelNotice.type}`"
            role="status"
          >
            {{ panelNotice.text }}
          </div>

          <div v-if="guestBlocked" class="guest-block">
            游客无法充值，请先
            <button type="button" class="link-btn" @click="emit('register')">注册正式道号</button>
          </div>

          <div v-else class="panel-body" v-loading="loading">
            <template v-if="activeTab === 'jade'">
              <div class="product-grid">
                <article
                  v-for="item in jadeProducts"
                  :key="item.product_key"
                  class="product-card"
                >
                  <div v-if="item.badge" class="product-badge">{{ item.badge }}</div>
                  <div class="product-name">{{ item.name }}</div>
                  <div class="product-jade">💠 {{ item.total_jade }}</div>
                  <div class="product-desc">{{ item.description }}</div>
                  <button
                    type="button"
                    class="buy-btn"
                    :disabled="payingKey === item.product_key"
                    @click="purchase(item)"
                  >
                    ¥{{ item.price_yuan }}
                  </button>
                </article>
              </div>
            </template>

            <template v-else-if="activeTab === 'vip'">
              <div class="vip-benefits">
                <p>仙籍加速：灵力上限 +20%、恢复加速、修为 +15%、灵石 +10%</p>
              </div>
              <div class="product-grid">
                <article
                  v-for="item in vipProducts"
                  :key="item.product_key"
                  class="product-card is-vip-card"
                >
                  <div class="product-name">{{ item.name }}</div>
                  <div class="product-jade" v-if="item.jade_amount">赠 💠 {{ item.jade_amount }}</div>
                  <div class="product-desc">{{ item.description }}</div>
                  <button
                    type="button"
                    class="buy-btn"
                    :disabled="payingKey === item.product_key"
                    @click="purchase(item)"
                  >
                    ¥{{ item.price_yuan }}
                  </button>
                </article>
              </div>
              <p v-if="vipInfo.vip_expired_at" class="vip-expire">
                当前仙籍至：{{ formatExpire(vipInfo.vip_expired_at) }}
              </p>
            </template>

            <template v-else>
              <div class="exchange-box">
                <p class="exchange-tip">
                  {{ exchangeRate }} 仙玉 = 1 灵石（仅支持仙玉兑换，不能直接购买灵石）
                </p>
                <div class="exchange-input-row">
                  <input
                    v-model.number="exchangeJade"
                    type="number"
                    min="0"
                    step="10"
                    class="exchange-input"
                    placeholder="输入仙玉数量"
                  />
                  <span class="exchange-arrow">→</span>
                  <span class="exchange-result">💎 {{ exchangePreview }}</span>
                </div>
                <button
                  type="button"
                  class="buy-btn exchange-btn"
                  :disabled="exchanging || exchangePreview <= 0"
                  @click="doExchange"
                >
                  {{ exchanging ? '兑换中…' : '兑换灵石' }}
                </button>
              </div>
            </template>
          </div>

          <p class="legal-tip">请理性消费。未成年修士充值受限额保护。</p>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useApiClient } from '../../services/api';
import { useUserStore } from '../../stores/user';
import { useUiStore } from '../../stores/ui';
import { vLoading } from 'element-plus';

type TabKey = 'jade' | 'vip' | 'exchange';
type PanelNoticeType = 'success' | 'error' | 'warning';

const props = defineProps<{
  visible: boolean;
  initialTab?: TabKey;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'register'): void;
}>();

const api = useApiClient();
const user = useUserStore();
const ui = useUiStore();

const tabs = [
  { key: 'jade' as const, label: '充值仙玉' },
  { key: 'vip' as const, label: '仙籍加速' },
  { key: 'exchange' as const, label: '兑换灵石' },
];

const activeTab = ref<TabKey>('jade');
const loading = ref(false);
const payingKey = ref('');
const exchanging = ref(false);
const exchangeJade = ref(100);
const exchangeRate = ref(10);
const products = ref<any[]>([]);
const vipInfo = ref<Record<string, any>>({ is_vip: false });
const payChannel = ref('mock');
const panelNotice = ref<{ type: PanelNoticeType; text: string } | null>(null);
let panelNoticeTimer: ReturnType<typeof setTimeout> | null = null;

const guestBlocked = computed(() => !!user.isGuest);
const jadeBalance = computed(() => Number(user.profile?.jade_balance ?? 0));
const spiritStone = computed(() => Number(user.profile?.spirit_stone ?? 0));

const jadeProducts = computed(() =>
  products.value.filter((p) => p.category === 'jade_pack'),
);
const vipProducts = computed(() =>
  products.value.filter((p) => String(p.category).startsWith('vip_')),
);

const exchangePreview = computed(() => {
  const rate = Math.max(1, exchangeRate.value);
  const amount = Math.max(0, Number(exchangeJade.value || 0));
  if (amount < rate || amount % rate !== 0) return 0;
  return amount / rate;
});

watch(
  () => props.visible,
  (val) => {
    if (!val) {
      clearPanelNotice();
      return;
    }
    activeTab.value = props.initialTab ?? ui.rechargePanelTab ?? 'jade';
    void loadCatalog();
  },
);

function switchTab(key: TabKey) {
  activeTab.value = key;
  clearPanelNotice();
}

function showPanelNotice(type: PanelNoticeType, text: string) {
  panelNotice.value = { type, text };
  if (panelNoticeTimer) clearTimeout(panelNoticeTimer);
  panelNoticeTimer = setTimeout(() => {
    panelNotice.value = null;
    panelNoticeTimer = null;
  }, 4000);
}

function clearPanelNotice() {
  if (panelNoticeTimer) {
    clearTimeout(panelNoticeTimer);
    panelNoticeTimer = null;
  }
  panelNotice.value = null;
}

async function loadCatalog() {
  loading.value = true;
  try {
    const res = await api.get('/recharge/catalog');
    if (!res?.success) {
      showPanelNotice('error', res?.message || '加载商品失败');
      return;
    }
    products.value = res.data?.products ?? [];
    exchangeRate.value = Number(res.data?.jade_to_stone_rate ?? 10);
    vipInfo.value = res.data?.vip ?? { is_vip: false };
    const channels = res.data?.pay_channels ?? [];
    const hasWechat = channels.some((c: any) => c.key === 'wechat_h5');
    payChannel.value = hasWechat ? 'wechat_h5' : 'mock';
  } catch {
    showPanelNotice('error', '加载仙府宝库失败');
  } finally {
    loading.value = false;
  }
}

async function purchase(item: any) {
  if (guestBlocked.value) return;
  payingKey.value = item.product_key;
  try {
    const res = await api.post('/recharge/orders', {
      product_key: item.product_key,
      pay_channel: payChannel.value,
    });
    if (!res?.success) {
      showPanelNotice('error', res?.message || '下单失败');
      return;
    }

    const pay = res.data?.pay ?? {};
    const orderNo = res.data?.order?.order_no;

    if (pay.pay_mode === 'wechat_h5' && pay.mweb_url) {
      window.location.href = pay.mweb_url;
      return;
    }

    if (pay.pay_mode === 'mock' && orderNo) {
      const mockRes = await api.post(`/recharge/mock-pay/${orderNo}`);
      if (mockRes?.success && mockRes.data?.user) {
        user.setProfile(mockRes.data.user);
        showPanelNotice('success', '充值成功，仙玉已入账');
      } else {
        showPanelNotice('error', mockRes?.message || '模拟支付失败');
      }
      return;
    }

    if (orderNo) {
      await pollOrder(orderNo);
    }
  } catch (e: any) {
    showPanelNotice('error', e?.message || '支付失败');
  } finally {
    payingKey.value = '';
  }
}

async function pollOrder(orderNo: string, attempts = 12) {
  for (let i = 0; i < attempts; i += 1) {
    await sleep(1500);
    const res = await api.get(`/recharge/orders/${orderNo}`);
    if (res?.success && res.data?.order?.status === 'paid') {
      if (res.data.user) user.setProfile(res.data.user);
      showPanelNotice('success', '充值成功');
      return;
    }
  }
  showPanelNotice('warning', '支付结果确认中，请稍后查看余额');
}

async function doExchange() {
  if (exchangePreview.value <= 0) {
    showPanelNotice('warning', `请输入 ${exchangeRate.value} 的整数倍仙玉`);
    return;
  }
  exchanging.value = true;
  try {
    const res = await api.post('/recharge/exchange', {
      jade_amount: Number(exchangeJade.value),
    });
    if (res?.success) {
      if (res.data?.user) user.setProfile(res.data.user);
      showPanelNotice('success', `已兑换 ${res.data?.stones_gained ?? exchangePreview.value} 灵石`);
    } else {
      showPanelNotice('error', res?.message || '兑换失败');
    }
  } catch {
    showPanelNotice('error', '兑换失败');
  } finally {
    exchanging.value = false;
  }
}

function formatExpire(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function close() {
  clearPanelNotice();
  emit('update:visible', false);
  ui.hideRechargePanel();
}
</script>

<style scoped>
.recharge-overlay {
  position: fixed;
  inset: 0;
  z-index: 10060;
  background: rgba(6, 10, 24, 0.88);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.recharge-panel {
  width: min(720px, 96vw);
  max-height: min(88vh, 820px);
  overflow: auto;
  border-radius: 16px;
  border: 1px solid rgba(212, 168, 67, 0.45);
  background: linear-gradient(180deg, rgba(12, 22, 44, 0.98), rgba(8, 14, 30, 0.98));
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 18px 20px 10px;
  border-bottom: 1px solid rgba(212, 168, 67, 0.2);
}

.panel-header h2 {
  margin: 0;
  color: #f4d98a;
  font-size: 20px;
  letter-spacing: 0.12em;
}

.panel-sub {
  margin: 6px 0 0;
  color: #9eb6d4;
  font-size: 12px;
}

.close-btn {
  border: none;
  background: transparent;
  color: #9fc4e6;
  font-size: 18px;
  cursor: pointer;
}

.balance-row {
  display: flex;
  gap: 10px;
  padding: 12px 20px 0;
  flex-wrap: wrap;
}

.balance-chip {
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
}

.balance-chip.is-vip {
  border-color: rgba(212, 168, 67, 0.5);
  color: #ffd700;
}

.chip-label {
  display: block;
  font-size: 11px;
  color: #8fa8c6;
}

.chip-value {
  font-size: 15px;
  font-weight: 700;
  color: #f7f3e8;
}

.tab-row {
  display: flex;
  gap: 8px;
  padding: 14px 20px 0;
}

.tab-btn {
  flex: 1;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid rgba(150, 210, 255, 0.18);
  background: rgba(255, 255, 255, 0.03);
  color: #b9d0ea;
  cursor: pointer;
}

.tab-btn.is-active {
  border-color: rgba(212, 168, 67, 0.7);
  color: #ffe7a3;
  background: rgba(212, 168, 67, 0.12);
}

.panel-notice {
  margin: 12px 20px 0;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.5;
  text-align: center;
}

.panel-notice--success {
  color: #b8f0c8;
  background: rgba(76, 221, 140, 0.12);
  border: 1px solid rgba(76, 221, 140, 0.35);
}

.panel-notice--error {
  color: #ffc4c4;
  background: rgba(255, 95, 95, 0.12);
  border: 1px solid rgba(255, 95, 95, 0.35);
}

.panel-notice--warning {
  color: #ffe7a3;
  background: rgba(212, 168, 67, 0.12);
  border: 1px solid rgba(212, 168, 67, 0.35);
}

.panel-body {
  padding: 16px 20px;
  min-height: 240px;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}

.product-card {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 14px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
}

.product-card.is-vip-card {
  border-color: rgba(212, 168, 67, 0.35);
}

.product-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255, 107, 107, 0.2);
  color: #ffb4b4;
  font-size: 10px;
}

.product-name {
  color: #f7f3e8;
  font-weight: 700;
  font-size: 15px;
}

.product-jade {
  margin-top: 8px;
  color: #9fd6ff;
  font-size: 18px;
  font-weight: 700;
}

.product-desc {
  flex: 1;
  margin-top: 6px;
  min-height: 50px;
  color: #9eb0c8;
  font-size: 12px;
  line-height: 1.4;
}

.buy-btn {
  width: 100%;
  margin-top: 12px;
  flex-shrink: 0;
  padding: 9px 12px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #ffe6a0, #cf9a34);
  color: #3a2606;
  font-weight: 700;
  cursor: pointer;
}

.buy-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.vip-benefits,
.exchange-tip,
.vip-expire,
.legal-tip,
.guest-block {
  color: #9eb0c8;
  font-size: 13px;
  line-height: 1.5;
}

.vip-benefits {
  margin-bottom: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(212, 168, 67, 0.08);
  border: 1px solid rgba(212, 168, 67, 0.2);
}

.exchange-box {
  max-width: 420px;
  margin: 0 auto;
}

.exchange-input-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 14px 0;
}

.exchange-input {
  flex: 1;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(150, 210, 255, 0.25);
  background: rgba(0, 0, 0, 0.25);
  color: #eaf2ff;
}

.exchange-arrow {
  color: #d4a843;
}

.exchange-result {
  min-width: 72px;
  font-weight: 700;
  color: #f4d98a;
}

.exchange-btn {
  max-width: 220px;
  margin: 0 auto;
  display: block;
}

.guest-block {
  padding: 24px 20px;
  text-align: center;
}

.link-btn {
  border: none;
  background: none;
  color: #ffd700;
  cursor: pointer;
  text-decoration: underline;
}

.legal-tip {
  padding: 0 20px 16px;
  text-align: center;
  font-size: 11px;
}

.recharge-fade-enter-active,
.recharge-fade-leave-active {
  transition: opacity 0.2s ease;
}

.recharge-fade-enter-from,
.recharge-fade-leave-to {
  opacity: 0;
}
</style>
