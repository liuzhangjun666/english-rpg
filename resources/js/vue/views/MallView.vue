<template>
  <div class="mall-page cultivation-theme">
    <div class="profile-container">
      <div class="profile-header">
        <div class="card-header" style="font-size: 24px; text-align: center; width: 100%;">
          🏪 藏经阁 (坊市)
        </div>
        <button class="profile-close-btn" @click="goBack">返回宗门</button>
      </div>

      <div class="profile-body" style="flex-direction: column; padding: 30px;">
        <!-- User Stones -->
        <div class="mall-stones">
          灵石余额：💎 <span class="text-gold">{{ stones }}</span>
        </div>

        <!-- List -->
        <div class="mall-list" v-loading="loading" element-loading-background="rgba(10, 10, 26, 0.8)">
          <div v-if="!loading && items.length === 0" class="mall-empty">
            坊市暂无商品
          </div>
          <transition-group name="list" tag="div" v-else class="mall-grid">
            <div v-for="item in items" :key="item.id" class="mall-item">
              <div class="mall-item-icon">{{ item.icon || '📦' }}</div>
              <div class="mall-item-info">
                <div class="mall-item-name">{{ item.name }}</div>
                <div class="mall-item-desc">{{ item.description || '' }}</div>
              </div>
              <div class="mall-item-action">
                <div class="mall-price">💎 {{ item.price || 0 }}</div>
                <button class="mall-buy-btn" :disabled="stones < (item.price || 0) || buyingId === item.id"
                  @click="buyItem(item)">
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
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useApiClient } from '../services/api';
import { useUserStore } from '../stores/user';
import { vLoading } from 'element-plus';

const router = useRouter();
const api = useApiClient();
const userStore = useUserStore();

const goBack = () => {
  router.push('/hall');
};



const loading = ref(false);
const items = ref<any[]>([]);
const buyingId = ref<string | null>(null);
const errorMsg = ref('');
const successMsg = ref('');

const stones = computed(() => Number(userStore.profile?.spirit_stone || 0));

onMounted(() => {
  fetchItems();
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

</script>

<style scoped>
.mall-page {
  position: relative;
  width: 100vw;
  height: 100vh;
  background: #0a0a1a url('../../../assets/images/bg_mall.jpg') center/cover no-repeat;
  display: flex;
  align-items: center;
  justify-content: center;
}

.profile-container {
  width: 90%;
  max-width: 1000px;
  height: 80vh;
  background: rgba(26, 26, 46, 0.95);
  border: 2px solid var(--gold, #d4a843);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
}

.profile-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(212, 168, 67, 0.3);
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
  min-height: 150px;
}

.mall-empty {
  text-align: center;
  color: #c8b685;
  padding: 40px 0;
}

.mall-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  padding: 10px;
}

.mall-item {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: all 0.3s;
}

.mall-item:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(212, 168, 67, 0.4);
  transform: translateY(-4px);
}

.mall-item-icon {
  font-size: 40px;
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
  margin-top: auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 12px;
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
