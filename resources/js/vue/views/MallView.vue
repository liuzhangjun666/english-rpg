<template>
  <Teleport to="body">
    <transition name="fade">
      <div v-if="visible" class="cult-overlay" @click.self="closePanel">
        <div class="cult-overlay-panel">
          <header class="cult-panel-header">
            <div class="cult-panel-title">
              <span class="cult-panel-icon">🏪</span>
              <span>藏经阁坊市</span>
            </div>
            <button class="cult-panel-back" type="button" @click="closePanel">关闭</button>
          </header>

          <div class="cult-overlay-body">
            <div class="mall-stones">
              灵石：💎 <span class="text-gold">{{ stones }}</span>
            </div>

            <div class="mall-list" v-loading="loading" element-loading-background="rgba(10, 10, 26, 0.8)">
              <div v-if="!loading && items.length === 0" class="cult-empty">
                坊市暂无商品
              </div>
              <transition-group name="list" tag="div" v-else>
                <div v-for="item in items" :key="item.id" class="cult-list-item mall-item">
                  <div class="mall-item-icon">{{ item.icon || '📦' }}</div>
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
                      {{ buyingId === item.id ? '兑换中...' : '兑换' }}
                    </button>
                  </div>
                </div>
              </transition-group>
            </div>

            <!-- Message -->
            <div class="cult-msg" :class="{ 'is-error': !!errorMsg }">
              {{ errorMsg || successMsg }}
            </div>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useApiClient } from '../services/api';
import { useUserStore } from '../stores/user';
import { vLoading } from 'element-plus';

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
}>();

const api = useApiClient();
const userStore = useUserStore();

const loading = ref(false);
const items = ref<any[]>([]);
const buyingId = ref<string | null>(null);
const errorMsg = ref('');
const successMsg = ref('');

const stones = computed(() => Number(userStore.profile?.spirit_stone || 0));

watch(() => props.visible, (val) => {
  if (val) {
    errorMsg.value = '';
    successMsg.value = '';
    fetchItems();
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
    successMsg.value = '';
    return;
  }

  buyingId.value = item.id;
  errorMsg.value = '';
  successMsg.value = '';

  try {
    const res = await api.post('/mall/buy', { item_id: item.id });
    if (res.success) {
      successMsg.value = `✅ 成功兑换 ${item.name}！`;
      if (res.data.user) {
        userStore.updateProfile(res.data.user);
      }
    } else {
      errorMsg.value = res.message || '兑换失败';
    }
  } catch (err: any) {
    errorMsg.value = err.message || '网络异常';
  } finally {
    buyingId.value = null;
    setTimeout(() => {
      successMsg.value = '';
      errorMsg.value = '';
    }, 3000);
  }
};

const closePanel = () => {
  emit('update:visible', false);
};
</script>

<style scoped>
.mall-stones {
  text-align: center;
  margin-bottom: 14px;
  font-size: 14px;
  color: var(--cult-parchment-dim, #c8b685);
}

.text-gold {
  color: var(--cult-gold, #f4d98a);
  font-weight: 700;
}

.mall-list {
  max-height: 400px;
  overflow-y: auto;
  position: relative;
  min-height: 120px;
}

.mall-item-icon {
  font-size: 28px;
  width: 40px;
  text-align: center;
}

.mall-item-info {
  flex: 1;
}

.mall-item-name {
  font-size: 14px;
  color: var(--cult-parchment, #f7f3e8);
  font-weight: 700;
}

.mall-item-desc {
  font-size: 12px;
  color: var(--cult-parchment-dim, #c8b685);
  margin-top: 4px;
}

.mall-item-action {
  text-align: right;
}

.mall-price {
  font-size: 13px;
  color: var(--cult-gold-dim, #d4a843);
  font-weight: 700;
  margin-bottom: 6px;
}

.mall-buy-btn {
  background: rgba(212, 168, 67, 0.1);
  border: 1px solid rgba(212, 168, 67, 0.45);
  color: var(--cult-gold, #f4d98a);
  padding: 5px 12px;
  border-radius: 8px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.mall-buy-btn:hover:not(:disabled) {
  background: rgba(212, 168, 67, 0.18);
  box-shadow: 0 0 10px rgba(212, 168, 67, 0.2);
}

.mall-buy-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
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
</style>
