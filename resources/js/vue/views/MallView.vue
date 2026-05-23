<template>
  <div class="mall-page">
    <el-card class="mall-shell" shadow="hover">
      <template #header>
        <div class="card-header">仙坊 · 灵石商城</div>
      </template>

      <div class="mall-toolbar">
        <el-space wrap>
          <el-button type="warning" plain @click="openLegacy">经典模式</el-button>
          <el-button @click="reload">刷新商品</el-button>
          <el-button @click="backHall">返回大厅</el-button>
        </el-space>
      </div>

      <div class="mall-stones">当前灵石：💎 {{ stones }}</div>

      <div v-if="!items.length" class="mall-empty">坊市暂无商品</div>
      <div v-else class="mall-list">
        <div v-for="item in items" :key="item.item_id" class="mall-item">
          <div class="mall-item-icon">{{ item.icon || '📦' }}</div>
          <div class="mall-item-body">
            <div class="mall-item-name">{{ item.name }}</div>
            <div class="mall-item-desc">{{ item.description || '暂无描述' }}</div>
          </div>
          <div class="mall-item-right">
            <div class="mall-item-price">💎 {{ Number(item.price_stones || 0) }}</div>
            <el-button
              size="small"
              type="primary"
              :disabled="buyingId === item.item_id || stones < Number(item.price_stones || 0)"
              :loading="buyingId === item.item_id"
              @click="buyItem(item)"
            >
              购买
            </el-button>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useApiClient } from '../services/api';
import { useLegacyBridge } from '../composables/useLegacyBridge';
import { useUiStore } from '../stores/ui';
import { useUserStore } from '../stores/user';

const router = useRouter();
const api = useApiClient();
const bridge = useLegacyBridge();
const ui = useUiStore();
const user = useUserStore();

const items = ref<Array<Record<string, any>>>([]);
const buyingId = ref('');

const stones = computed(() => Number(user.profile?.spirit_stone || 0));

onMounted(async () => {
  ui.showLoading('进入仙坊...');
  try {
    await bridge.switchToHall();
    await bridge.closeLegacyPanels();
    await loadItems();
  } catch {
    ElMessage.error('仙坊加载失败');
  } finally {
    ui.hideLoading();
  }
});

onBeforeUnmount(() => {
  void bridge.closeLegacyPanels();
});

async function loadItems() {
  const res = await api.get('/mall/items');
  if (!res?.success || !res?.data) {
    ElMessage.error(res?.message || '读取商品失败');
    items.value = [];
    return;
  }
  const list = Array.isArray(res.data.items) ? res.data.items : Array.isArray(res.data) ? res.data : [];
  items.value = list;
}

async function buyItem(item: Record<string, any>) {
  const itemId = String(item.item_id || '');
  if (!itemId) return;
  buyingId.value = itemId;
  try {
    const res = await api.post('/mall/buy', { item_id: itemId, quantity: 1 });
    if (!res?.success || !res?.data) {
      ElMessage.error(res?.message || '购买失败');
      return;
    }
    ElMessage.success(res.data.message || '购买成功');
    if (res.data.user) {
      user.updateProfile(res.data.user);
    } else {
      user.updateProfile({ spirit_stone: Math.max(0, stones.value - Number(item.price_stones || 0)) });
    }
    await loadItems();
  } finally {
    buyingId.value = '';
  }
}

async function openLegacy() {
  ui.showLoading('切换经典仙坊...');
  try {
    await bridge.openMall();
  } catch {
    ElMessage.error('经典模式加载失败');
  } finally {
    ui.hideLoading();
  }
}

async function reload() {
  ui.showLoading('刷新商品...');
  try {
    await loadItems();
  } finally {
    ui.hideLoading();
  }
}

function backHall() {
  void bridge.closeLegacyPanels();
  router.push('/hall');
}
</script>
