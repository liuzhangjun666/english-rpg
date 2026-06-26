<template>
  <Teleport to="body">
    <transition name="fade">
      <div v-if="visible" class="cultivation-overlay" @click.self="close">
        <div class="cultivation-container">
          <div class="cultivation-header">
            <span class="cultivation-title">🎒 储物袋 · 仓库</span>
            <button class="cultivation-close-btn" @click="close">关闭</button>
          </div>
          <div class="cultivation-body" v-loading="loading">
            <div v-if="activeBuffs.length" class="buff-block">
              <div class="buff-title">当前增益</div>
              <div v-for="buff in activeBuffs" :key="buff.key" class="buff-chip">{{ buff.label }}：{{ buff.detail }}</div>
            </div>

            <div v-if="items.length === 0 && !loading" class="empty-block">
              <p class="empty-text">袋中空空，可前往坊市购置灵材。</p>
              <button type="button" class="mall-btn" @click="goMall">前往坊市</button>
            </div>
            <div v-for="item in items" :key="item.item_id" class="item-row">
              <div class="item-icon-wrap">
                <span class="item-icon">{{ item.icon || '📦' }}</span>
              </div>
              <div class="item-main">
                <div class="item-name">{{ item.name }}</div>
                <div class="item-desc">{{ item.description || item.item_id }}</div>
              </div>
              <div class="item-side">
                <div class="item-qty">×{{ item.quantity || 1 }}</div>
                <button
                  type="button"
                  class="use-btn"
                  :disabled="usingId === item.item_id"
                  @click="useItem(item.item_id)"
                >
                  {{ usingId === item.item_id ? '使用中...' : '使用' }}
                </button>
              </div>
            </div>
            <div v-if="items.length > 0" class="actions">
              <button type="button" class="mall-btn" @click="goMall">前往坊市</button>
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
import { ElMessage } from 'element-plus';
import { useApiClient } from '../../services/api';
import { useUserStore } from '../../stores/user';

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{ (e: 'update:visible', value: boolean): void }>();

const api = useApiClient();
const router = useRouter();
const user = useUserStore();
const loading = ref(false);
const usingId = ref('');
const items = ref<any[]>([]);
const activeBuffs = ref<any[]>([]);
const shopMap = ref<Record<string, any>>({});

watch(() => props.visible, async (val) => {
  if (!val) return;
  await loadInventory();
});

async function loadInventory() {
  loading.value = true;
  try {
    const [invRes, shopRes, buffRes] = await Promise.all([
      api.get('/mall/inventory'),
      api.get('/mall/items'),
      api.get('/mall/buffs'),
    ]);
    const shopItems = shopRes?.success && Array.isArray(shopRes.data?.items) ? shopRes.data.items : [];
    shopMap.value = Object.fromEntries(shopItems.map((s: any) => [s.id, s]));
    const raw = invRes?.success ? invRes.data : [];
    items.value = (Array.isArray(raw) ? raw : []).map((row: any) => ({
      ...row,
      name: shopMap.value[row.item_id]?.name || row.item_id,
      description: shopMap.value[row.item_id]?.description || '',
      icon: shopMap.value[row.item_id]?.icon || '📦',
    }));
    activeBuffs.value = buffRes?.success && Array.isArray(buffRes.data) ? buffRes.data : [];
  } catch {
    items.value = [];
    activeBuffs.value = [];
  } finally {
    loading.value = false;
  }
}

async function useItem(itemId: string) {
  usingId.value = itemId;
  try {
    const res = await api.post('/mall/use', { item_id: itemId });
    if (res?.success) {
      ElMessage.success(res.message || '使用成功');
      if (res.data?.user) user.updateProfile(res.data.user);
      activeBuffs.value = res.data?.buffs || [];
      await loadInventory();
    } else {
      ElMessage.warning(res?.message || '使用失败');
    }
  } catch {
    ElMessage.error('使用失败');
  } finally {
    usingId.value = '';
  }
}

function goMall() {
  close();
  router.push('/mall');
}

function close() {
  emit('update:visible', false);
}
</script>

<style scoped>
.cultivation-overlay { position: fixed; inset: 0; z-index: 2200; background: rgba(10,10,26,0.85); display: flex; align-items: center; justify-content: center; }
.cultivation-container { width: min(480px, 92vw); max-height: 90vh; background: #1a1a2e; border: 2px solid #d4a843; border-radius: 12px; display: flex; flex-direction: column; }
.cultivation-header { display: flex; justify-content: space-between; padding: 16px; border-bottom: 1px solid rgba(212,168,67,0.3); }
.cultivation-title { color: #d4a843; font-weight: 700; }
.cultivation-close-btn { background: transparent; border: 1px solid #d4a843; color: #d4a843; padding: 4px 12px; border-radius: 4px; cursor: pointer; }
.cultivation-body { padding: 20px; overflow-y: auto; color: #c8b685; }
.buff-block { margin-bottom: 14px; padding: 12px; border-radius: 10px; background: rgba(76,221,140,0.08); border: 1px solid rgba(76,221,140,0.2); }
.buff-title { color: #4ec07a; font-size: 12px; margin-bottom: 6px; font-weight: 700; }
.buff-chip { font-size: 12px; line-height: 1.6; }
.item-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px; margin-bottom: 8px; border-radius: 10px; background: rgba(255,255,255,0.03); }
.item-icon-wrap { flex-shrink: 0; width: 44px; display: flex; align-items: center; justify-content: center; }
.item-icon { font-size: 32px; line-height: 1; filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.35)); }
.item-main { flex: 1; min-width: 0; }
.item-side { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex-shrink: 0; }
.item-name { color: #f7f3e8; font-weight: 600; }
.item-desc { font-size: 12px; margin-top: 4px; }
.item-qty { color: #d4a843; font-weight: 700; }
.empty-block { text-align: center; padding: 24px 0 8px; }
.empty-text { margin: 0 0 20px; color: #c8b685; line-height: 1.6; }
.mall-btn {
  border: 1px solid #d4a843;
  background: linear-gradient(135deg, rgba(212, 168, 67, 0.28), rgba(212, 168, 67, 0.12));
  color: #fceea7;
  padding: 10px 28px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
  transition: transform 0.2s, box-shadow 0.2s;
}
.mall-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 0 14px rgba(212, 168, 67, 0.35);
}
.use-btn {
  border: 1px solid #8cc5ff;
  background: rgba(140, 197, 255, 0.12);
  color: #8cc5ff;
  padding: 4px 12px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 12px;
}
.use-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.actions { display: flex; gap: 10px; justify-content: center; margin-top: 16px; }
</style>

