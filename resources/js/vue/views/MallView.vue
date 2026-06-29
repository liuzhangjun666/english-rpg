<template>
  <div v-if="sceneReady" class="mall-page cultivation-theme">
    <div class="mall-scene">
      <img class="mall-scene-bg" :src="sceneBg" alt="" />
      <div class="mall-scene-vignette" />
      <div class="mall-scene-glow mall-scene-glow--left" />
      <div class="mall-scene-glow mall-scene-glow--right" />

      <button type="button" class="mall-back-btn" @click="goBack">← 返回宗门</button>

      <div class="mall-shell">
        <header class="mall-header">
          <div class="mall-title-ornament" aria-hidden="true">
            <span class="mall-title-ornament__line" />
            <span class="mall-title-ornament__gem">◆</span>
            <span class="mall-title-ornament__line" />
          </div>
          <h1 class="mall-title">灵石坊市</h1>
          <p class="mall-subtitle">以灵石易奇珍 · 助君修行破境</p>
        </header>

        <div class="mall-wallet">
          <span class="mall-wallet-label">灵石余额</span>
          <span class="mall-wallet-value">💎 {{ stones }}</span>
        </div>

        <div class="mall-filters" role="tablist" aria-label="商品分类">
          <button
            v-for="tab in categoryTabs"
            :key="tab.key"
            type="button"
            class="mall-filter-btn"
            :class="{ 'is-active': activeCategory === tab.key }"
            role="tab"
            :aria-selected="activeCategory === tab.key"
            @click="activeCategory = tab.key"
          >
            {{ tab.label }}
          </button>
        </div>

        <div class="mall-list" v-loading="loading" element-loading-background="rgba(10, 10, 26, 0.82)">
          <div v-if="!loading && items.length === 0" class="mall-empty">
            坊市暂无商品，掌柜正在备货中…
          </div>
          <div v-else-if="!loading && filteredItems.length === 0" class="mall-empty">
            该分类暂无商品
          </div>
          <transition-group v-else-if="!loading" name="list" tag="div" class="mall-grid">
            <article
              v-for="item in filteredItems"
              :key="item.id"
              class="mall-item"
              :class="`mall-item--${item.category || 'consumable'}`"
            >
              <div class="mall-item-badge">{{ categoryLabel(item.category) }}</div>
              <div class="mall-item-icon-wrap">
                <span class="mall-item-icon">{{ item.icon || '📦' }}</span>
              </div>
              <div class="mall-item-info">
                <div class="mall-item-name">{{ item.name }}</div>
                <div class="mall-item-desc">{{ item.description || '' }}</div>
              </div>
              <div class="mall-item-action">
                <div class="mall-price">💎 {{ item.price || 0 }}</div>
                <button
                  class="mall-buy-btn"
                  :disabled="stones < (item.price || 0) || buyingId === item.id"
                  @click="buyItem(item)"
                >
                  {{ buyingId === item.id ? '兑换中…' : stones < (item.price || 0) ? '灵石不足' : '兑换' }}
                </button>
              </div>
            </article>
          </transition-group>
        </div>

        <transition name="fade">
          <div v-if="errorMsg" class="mall-msg is-error">
            {{ errorMsg }}
          </div>
        </transition>
      </div>
    </div>

    <Teleport to="body">
      <transition name="fade">
        <div v-if="purchasePrompt.visible" class="purchase-overlay" @click.self="storePurchasedItem">
          <div class="purchase-dialog">
            <div class="purchase-header">兑换成功</div>
            <div class="purchase-body">
              <div class="purchase-icon">{{ purchasePrompt.item?.icon || '📦' }}</div>
              <div class="purchase-name">{{ purchasePrompt.item?.name }}</div>
              <div class="purchase-desc">{{ purchasePrompt.item?.description || '' }}</div>
              <p class="purchase-hint">灵材已入手，请选择处置方式：</p>
            </div>
            <div class="purchase-actions">
              <button
                type="button"
                class="purchase-btn purchase-btn--use"
                :disabled="usingPurchased"
                @click="usePurchasedItem"
              >
                {{ usingPurchased ? '使用中…' : '立即使用' }}
              </button>
              <button
                type="button"
                class="purchase-btn purchase-btn--store"
                :disabled="usingPurchased"
                @click="storePurchasedItem"
              >
                放入仓库
              </button>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useApiClient } from '../services/api';
import { useUserStore } from '../stores/user';
import { useSceneEntry } from '../composables/useSceneEntry';
import { useReturnToHall } from '../composables/useReturnToHall';
import { getMallSceneAssets, SCENE_ENTRY_TEXT } from '../data/sceneViewAssets';
import { vLoading } from 'element-plus';

const sceneBg = '/images/bg_hall_map.png';

const categoryTabs = [
  { key: 'all', label: '全部' },
  { key: 'consumable', label: '灵材' },
  { key: 'boost', label: '符箓' },
  { key: 'title', label: '奇物' },
] as const;

type MallCategory = typeof categoryTabs[number]['key'];

const router = useRouter();
const api = useApiClient();
const userStore = useUserStore();
const { sceneReady, runSceneEntry } = useSceneEntry();
const { returnToHall } = useReturnToHall();

const goBack = () => {
  void returnToHall();
};

const loading = ref(false);
const items = ref<any[]>([]);
const activeCategory = ref<MallCategory>('all');
const buyingId = ref<string | null>(null);
const usingPurchased = ref(false);
const errorMsg = ref('');
const purchasePrompt = ref<{ visible: boolean; item: any | null }>({ visible: false, item: null });

const stones = computed(() => Number(userStore.profile?.spirit_stone || 0));

const filteredItems = computed(() => {
  if (activeCategory.value === 'all') return items.value;
  return items.value.filter((item) => (item.category || 'consumable') === activeCategory.value);
});

const categoryLabel = (category?: string) => {
  switch (category) {
    case 'boost': return '符箓';
    case 'title': return '奇物';
    default: return '灵材';
  }
};

onMounted(async () => {
  try {
    await runSceneEntry({
      text: SCENE_ENTRY_TEXT.mall,
      assets: getMallSceneAssets(),
      bootstrap: fetchItems,
    });
  } catch {
    ElMessage.error('坊市加载失败');
  }
});

const fetchItems = async () => {
  loading.value = true;
  try {
    const res = await api.get('/mall/items');
    if (res?.success && Array.isArray(res.data?.items)) {
      items.value = res.data.items;
    }
  } catch (error) {
    console.error('Failed to load mall items', error);
  } finally {
    loading.value = false;
  }
};

const buyItem = async (item: any) => {
  const price = Number(item.price || 0);
  if (stones.value < price) {
    errorMsg.value = '灵石不足！';
    return;
  }

  buyingId.value = item.id;
  errorMsg.value = '';

  try {
    const res = await api.post('/mall/buy', { item_id: item.id });
    if (res.success) {
      if (res.data?.user) {
        userStore.updateProfile(res.data.user);
      }
      purchasePrompt.value = { visible: true, item };
    } else {
      errorMsg.value = res.message || '兑换失败';
      setTimeout(() => { errorMsg.value = ''; }, 3000);
    }
  } catch (err: any) {
    errorMsg.value = err.message || '网络异常';
    setTimeout(() => { errorMsg.value = ''; }, 3000);
  } finally {
    buyingId.value = null;
  }
};

function closePurchasePrompt() {
  purchasePrompt.value = { visible: false, item: null };
}

function storePurchasedItem() {
  if (usingPurchased.value) return;
  closePurchasePrompt();
  ElMessage.success('已收入储物袋');
}

async function usePurchasedItem() {
  const item = purchasePrompt.value.item;
  if (!item?.id || usingPurchased.value) return;

  usingPurchased.value = true;
  try {
    const res = await api.post('/mall/use', { item_id: item.id });
    if (res?.success) {
      if (res.data?.user) userStore.updateProfile(res.data.user);
      closePurchasePrompt();
      ElMessage.success(res.message || '使用成功');
    } else {
      ElMessage.warning(res?.message || '使用失败');
    }
  } catch {
    ElMessage.error('使用失败');
  } finally {
    usingPurchased.value = false;
  }
}
</script>

<style scoped>
.mall-page {
  position: relative;
  width: 100%;
  min-height: var(--app-dvh, 100vh);
  height: var(--app-dvh, 100vh);
  overflow: hidden;
}

.mall-scene {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding:
    calc(12px + env(safe-area-inset-top, 0px))
    max(12px, env(safe-area-inset-right, 0px))
    calc(12px + env(safe-area-inset-bottom, 0px))
    max(12px, env(safe-area-inset-left, 0px));
}

.mall-scene-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 42%;
  z-index: 0;
}

.mall-scene-vignette {
  position: absolute;
  inset: 0;
  z-index: 1;
  background:
    radial-gradient(ellipse at 50% 35%, rgba(8, 12, 28, 0.15) 0%, rgba(8, 12, 28, 0.72) 72%),
    linear-gradient(180deg, rgba(6, 8, 18, 0.55) 0%, rgba(6, 8, 18, 0.82) 100%);
  pointer-events: none;
}

.mall-scene-glow {
  position: absolute;
  width: 42vw;
  height: 42vw;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.35;
  pointer-events: none;
  z-index: 1;
}

.mall-scene-glow--left {
  left: -8vw;
  top: 18%;
  background: rgba(212, 168, 67, 0.35);
}

.mall-scene-glow--right {
  right: -10vw;
  bottom: 8%;
  background: rgba(86, 127, 197, 0.28);
}

.mall-back-btn {
  position: absolute;
  top: calc(12px + env(safe-area-inset-top, 0px));
  left: max(16px, env(safe-area-inset-left, 0px));
  z-index: 4;
  padding: 8px 14px;
  border: 1px solid rgba(244, 217, 138, 0.45);
  border-radius: 999px;
  background: rgba(8, 12, 24, 0.62);
  color: #f4d98a;
  font-size: 14px;
  cursor: pointer;
  backdrop-filter: blur(8px);
  transition: background 0.2s, border-color 0.2s, transform 0.2s;
}

.mall-back-btn:hover {
  background: rgba(196, 30, 58, 0.28);
  border-color: rgba(244, 180, 138, 0.65);
  transform: translateY(-1px);
}

.mall-shell {
  position: relative;
  z-index: 2;
  width: min(980px, 100%);
  max-height: calc(100% - 8px);
  display: flex;
  flex-direction: column;
  padding: 22px 24px 18px;
  border-radius: 18px;
  border: 1px solid rgba(212, 168, 67, 0.42);
  background:
    linear-gradient(165deg, rgba(18, 24, 46, 0.92) 0%, rgba(10, 14, 30, 0.96) 100%);
  box-shadow:
    0 24px 60px rgba(0, 0, 0, 0.55),
    inset 0 1px 0 rgba(255, 236, 184, 0.12);
  backdrop-filter: blur(14px);
}

.mall-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}

.mall-title-ornament {
  display: flex;
  align-items: center;
  gap: 10px;
  width: min(280px, 70%);
}

.mall-title-ornament__line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(212, 168, 67, 0.65), transparent);
}

.mall-title-ornament__gem {
  color: #f4d98a;
  font-size: 10px;
  opacity: 0.85;
}

.mall-title {
  margin: 0;
  font-size: clamp(22px, 3vw, 30px);
  font-weight: 700;
  letter-spacing: 0.18em;
  color: #f4d98a;
  text-shadow: 0 2px 12px rgba(212, 168, 67, 0.35);
}

.mall-subtitle {
  margin: 0;
  font-size: 13px;
  color: #c8b685;
  letter-spacing: 0.08em;
}

.mall-wallet {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 10px 18px;
  border-radius: 999px;
  border: 1px solid rgba(212, 168, 67, 0.28);
  background: rgba(0, 0, 0, 0.28);
}

.mall-wallet-label {
  font-size: 13px;
  color: #c8b685;
}

.mall-wallet-value {
  font-size: 18px;
  font-weight: 700;
  color: #f4d98a;
}

.mall-filters {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-bottom: 14px;
}

.mall-filter-btn {
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid rgba(212, 168, 67, 0.28);
  background: rgba(0, 0, 0, 0.22);
  color: #c8b685;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, color 0.2s;
}

.mall-filter-btn:hover {
  border-color: rgba(212, 168, 67, 0.45);
  color: #f4d98a;
}

.mall-filter-btn.is-active {
  border-color: rgba(212, 168, 67, 0.65);
  background: rgba(212, 168, 67, 0.16);
  color: #f4d98a;
  font-weight: 600;
}

.mall-list {
  flex: 1;
  min-height: 180px;
  max-height: min(56vh, 520px);
  overflow-y: auto;
  padding-right: 4px;
}

.mall-list::-webkit-scrollbar {
  width: 6px;
}

.mall-list::-webkit-scrollbar-thumb {
  background: rgba(212, 168, 67, 0.35);
  border-radius: 999px;
}

.mall-empty {
  text-align: center;
  color: #c8b685;
  padding: 48px 16px;
  font-size: 14px;
}

.mall-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}

.mall-item {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px 16px 14px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%);
  transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
}

.mall-item:hover {
  transform: translateY(-3px);
  border-color: rgba(212, 168, 67, 0.45);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.35);
}

.mall-item--boost {
  border-color: rgba(120, 170, 255, 0.22);
}

.mall-item--title {
  border-color: rgba(255, 196, 120, 0.24);
}

.mall-item-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  color: #f4d98a;
  border: 1px solid rgba(212, 168, 67, 0.35);
  background: rgba(0, 0, 0, 0.35);
}

.mall-item-icon-wrap {
  display: flex;
  justify-content: center;
  padding-top: 4px;
}

.mall-item-icon {
  font-size: 42px;
  line-height: 1;
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.35));
}

.mall-item-info {
  flex: 1;
  text-align: center;
}

.mall-item-name {
  font-size: 15px;
  font-weight: 700;
  color: #f7f3e8;
}

.mall-item-desc {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.5;
  color: #c8b685;
  min-height: 36px;
}

.mall-item-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.mall-price {
  font-size: 15px;
  font-weight: 700;
  color: #f4d98a;
  white-space: nowrap;
}

.mall-buy-btn {
  min-width: 84px;
  padding: 7px 14px;
  border-radius: 999px;
  border: 1px solid rgba(212, 168, 67, 0.55);
  background: linear-gradient(180deg, rgba(212, 168, 67, 0.22) 0%, rgba(212, 168, 67, 0.08) 100%);
  color: #f4d98a;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, box-shadow 0.2s, opacity 0.2s;
}

.mall-buy-btn:hover:not(:disabled) {
  background: linear-gradient(180deg, rgba(212, 168, 67, 0.34) 0%, rgba(212, 168, 67, 0.14) 100%);
  box-shadow: 0 0 14px rgba(212, 168, 67, 0.25);
}

.mall-buy-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.mall-msg {
  margin-top: 12px;
  text-align: center;
  font-size: 13px;
  color: #8fd4a0;
  min-height: 20px;
}

.mall-msg.is-error {
  color: #f0a0a0;
}

.purchase-overlay {
  position: fixed;
  inset: 0;
  z-index: 3000;
  background: rgba(10, 10, 26, 0.88);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.purchase-dialog {
  width: min(400px, 92vw);
  background: #1a1a2e;
  border: 2px solid #d4a843;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.55);
}

.purchase-header {
  padding: 16px 20px;
  border-bottom: 1px solid rgba(212, 168, 67, 0.3);
  color: #d4a843;
  font-weight: 700;
  font-size: 16px;
  text-align: center;
  letter-spacing: 0.12em;
}

.purchase-body {
  padding: 24px 20px 12px;
  text-align: center;
  color: #c8b685;
}

.purchase-icon {
  font-size: 48px;
  line-height: 1;
  margin-bottom: 12px;
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.35));
}

.purchase-name {
  color: #f7f3e8;
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 8px;
}

.purchase-desc {
  font-size: 13px;
  line-height: 1.5;
  margin-bottom: 16px;
}

.purchase-hint {
  margin: 0;
  font-size: 13px;
  color: #a89870;
}

.purchase-actions {
  display: flex;
  gap: 12px;
  padding: 16px 20px 20px;
}

.purchase-btn {
  flex: 1;
  padding: 11px 16px;
  border-radius: 22px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
}

.purchase-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.purchase-btn--use {
  border: 1px solid #8cc5ff;
  background: linear-gradient(135deg, rgba(140, 197, 255, 0.28), rgba(140, 197, 255, 0.1));
  color: #b8dcff;
}

.purchase-btn--use:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 0 14px rgba(140, 197, 255, 0.3);
}

.purchase-btn--store {
  border: 1px solid #d4a843;
  background: linear-gradient(135deg, rgba(212, 168, 67, 0.28), rgba(212, 168, 67, 0.1));
  color: #fceea7;
}

.purchase-btn--store:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 0 14px rgba(212, 168, 67, 0.35);
}

.list-enter-active,
.list-leave-active {
  transition: all 0.35s ease;
}

.list-enter-from {
  opacity: 0;
  transform: translateY(12px);
}

.list-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .mall-scene {
    align-items: stretch;
    padding:
      calc(8px + env(safe-area-inset-top, 0px))
      max(8px, env(safe-area-inset-right, 0px))
      calc(8px + env(safe-area-inset-bottom, 0px))
      max(8px, env(safe-area-inset-left, 0px));
  }

  .mall-shell {
    width: 100%;
    max-height: none;
    height: 100%;
    padding: 16px 14px 12px;
    border-radius: 14px;
  }

  .mall-list {
    max-height: none;
  }

  .mall-grid {
    grid-template-columns: 1fr;
  }

  .mall-title {
    letter-spacing: 0.1em;
  }
}
</style>
