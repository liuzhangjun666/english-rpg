<template>
  <Teleport to="body">
    <transition name="fade">
      <div v-if="visible" class="profile-overlay cultivation-theme" @click.self="closePanel">
        <div class="profile-container" style="max-width: 460px;">
          <div class="profile-header">
            <div class="card-header" style="font-size: 20px; text-align: center; width: 100%;">
              🏪 藏经阁 (坊市)
            </div>
            <button class="profile-close-btn" @click="closePanel">关闭</button>
          </div>

          <div class="profile-body" style="flex-direction: column; padding: 20px;">
            <!-- User Stones -->
            <div class="mall-stones">
              灵石：💎 <span class="text-gold">{{ stones }}</span>
            </div>

            <!-- List -->
            <div class="mall-list" v-loading="loading" element-loading-background="rgba(10, 10, 26, 0.8)">
              <div v-if="!loading && items.length === 0" class="mall-empty">
                坊市暂无商品
              </div>
              <transition-group name="list" tag="div" v-else>
                <div v-for="item in items" :key="item.id" class="mall-item">
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
            <div class="mall-msg" :class="{ 'is-error': !!errorMsg }">
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
.profile-overlay {
  position: fixed;
  top: 0; left: 0; width: 100vw; height: 100vh;
  background: rgba(10, 10, 26, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(5px);
}
.profile-container {
  width: 90%;
  background: #1a1a2e;
  border: 2px solid var(--gold, #d4a843);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
}
.profile-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: rgba(255,255,255,0.05);
  border-bottom: 1px solid rgba(212,168,67,0.3);
}
.profile-close-btn {
  background: transparent;
  border: 1px solid var(--gold, #d4a843);
  color: var(--gold, #d4a843);
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
}

.mall-stones {
  text-align: center;
  margin-bottom: 16px;
  font-size: 14px;
  color: #f4d98a;
}
.text-gold {
  color: #d4a843;
  font-weight: bold;
}

.mall-list {
  flex: 1;
  max-height: 400px;
  overflow-y: auto;
  position: relative;
  min-height: 150px;
}
.mall-empty {
  text-align: center;
  color: #c8b685;
  padding: 40px 0;
}
.mall-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  margin-bottom: 8px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: all 0.3s;
}
.mall-item:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(212, 168, 67, 0.2);
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
  color: #f7f3e8;
  font-weight: bold;
}
.mall-item-desc {
  font-size: 12px;
  color: #c8b685;
  margin-top: 4px;
}

.mall-item-action {
  text-align: right;
}
.mall-price {
  font-size: 13px;
  color: #d4a843;
  font-weight: bold;
  margin-bottom: 6px;
}
.mall-buy-btn {
  background: rgba(212, 168, 67, 0.1);
  border: 1px solid rgba(212, 168, 67, 0.5);
  color: #f4d98a;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.mall-buy-btn:hover:not(:disabled) {
  background: rgba(212, 168, 67, 0.2);
  box-shadow: 0 0 8px rgba(212, 168, 67, 0.3);
}
.mall-buy-btn:disabled {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.3);
  cursor: not-allowed;
}

.mall-msg {
  text-align: center;
  font-size: 13px;
  min-height: 20px;
  margin-top: 12px;
  color: #4ec07a;
}
.mall-msg.is-error {
  color: #ff6b6b;
}

.list-enter-active,
.list-leave-active {
  transition: all 0.4s ease;
}
.list-enter-from {
  opacity: 0;
  transform: translateY(20px);
}
.list-leave-to {
  opacity: 0;
  transform: translateY(-20px);
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
