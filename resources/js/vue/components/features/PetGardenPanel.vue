<template>
  <Teleport to="body">
    <transition name="fade">
      <div v-if="visible" class="cultivation-overlay" @click.self="close">
        <div class="cultivation-container">
          <div class="cultivation-header">
            <span class="cultivation-title">🐾 灵宠园</span>
            <button class="cultivation-close-btn" @click="close">关闭</button>
          </div>
          <div class="cultivation-body" v-loading="loading">
            <div v-if="selectedPet" class="selected-pet">
              <div class="selected-emoji">{{ petEmoji(selectedPet.id) }}</div>
              <div class="selected-name">{{ selectedPet.name }}</div>
              <div class="affinity-bar">
                <div class="affinity-fill" :style="{ width: `${Math.min(100, selectedPet.affinity)}%` }"></div>
              </div>
              <div class="affinity-label">亲昵度 {{ selectedPet.affinity }}</div>
              <button
                class="interact-btn"
                :disabled="!canInteractToday || interacting"
                @click="interactPet(selectedPet.id)"
              >
                {{ canInteractToday ? '抚摸灵宠' : '今日已抚灵' }}
              </button>
            </div>
            <div class="pet-grid">
              <div
                v-for="pet in pets"
                :key="pet.id"
                class="pet-card"
                :class="{ locked: !pet.unlocked, active: pet.selected }"
                @click="selectPet(pet)"
              >
                <div class="pet-emoji">{{ petEmoji(pet.id) }}</div>
                <div class="pet-name">{{ pet.name }}</div>
                <div class="pet-req">{{ pet.unlocked ? `亲昵 ${pet.affinity}` : pet.requirement }}</div>
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
import { ElMessage } from 'element-plus';
import { useApiClient } from '../../services/api';

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{ (e: 'update:visible', value: boolean): void }>();

const api = useApiClient();
const loading = ref(false);
const interacting = ref(false);
const pets = ref<any[]>([]);
const canInteractToday = ref(true);

const PET_EMOJI: Record<string, string> = {
  fox: '🦊',
  crane: '🕊️',
  turtle: '🐢',
  dragon: '🐉',
};

const selectedPet = computed(() => pets.value.find((p) => p.selected) || pets.value.find((p) => p.unlocked) || null);

function petEmoji(id: string) {
  return PET_EMOJI[id] || '🐾';
}

async function loadGarden() {
  loading.value = true;
  try {
    const res = await api.get('/pet/garden');
    if (res?.success) {
      pets.value = res.data?.pets || [];
      canInteractToday.value = Boolean(res.data?.can_interact_today);
    }
  } catch {
    pets.value = [];
  } finally {
    loading.value = false;
  }
}

watch(() => props.visible, (val) => {
  if (val) loadGarden();
});

async function selectPet(pet: any) {
  if (!pet.unlocked) {
    ElMessage.info(`解锁条件：${pet.requirement}`);
    return;
  }
  try {
    const res = await api.post('/pet/select', { pet_id: pet.id });
    if (res?.success) {
      pets.value = res.data?.pets || [];
      ElMessage.success(`已选中 ${pet.name}`);
    } else {
      ElMessage.warning(res?.message || '选择失败');
    }
  } catch {
    ElMessage.error('选择失败');
  }
}

async function interactPet(petId: string) {
  interacting.value = true;
  try {
    const res = await api.post('/pet/interact', { pet_id: petId });
    if (res?.success) {
      pets.value = res.data?.pets || [];
      canInteractToday.value = false;
      ElMessage.success(res.message || '灵宠亲昵度提升');
    } else {
      ElMessage.warning(res?.message || '互动失败');
    }
  } catch {
    ElMessage.error('互动失败');
  } finally {
    interacting.value = false;
  }
}

function close() {
  emit('update:visible', false);
}
</script>

<style scoped>
.cultivation-overlay { position: fixed; inset: 0; z-index: 2200; background: rgba(10,10,26,0.85); display: flex; align-items: center; justify-content: center; }
.cultivation-container { width: min(480px, 92vw); background: #1a1a2e; border: 2px solid #d4a843; border-radius: 12px; }
.cultivation-header { display: flex; justify-content: space-between; padding: 16px; border-bottom: 1px solid rgba(212,168,67,0.3); }
.cultivation-title { color: #d4a843; font-weight: 700; }
.cultivation-close-btn { background: transparent; border: 1px solid #d4a843; color: #d4a843; padding: 4px 12px; border-radius: 4px; cursor: pointer; }
.cultivation-body { padding: 20px; }
.selected-pet { text-align: center; margin-bottom: 16px; padding: 16px; border-radius: 12px; background: rgba(76,221,140,0.06); border: 1px solid rgba(76,221,140,0.2); }
.selected-emoji { font-size: 48px; }
.selected-name { color: #d4a843; font-weight: 700; margin: 8px 0; }
.affinity-bar { height: 8px; background: rgba(0,0,0,0.3); border-radius: 4px; overflow: hidden; margin: 8px auto; max-width: 200px; }
.affinity-fill { height: 100%; background: linear-gradient(90deg, #44ee88, #d4a843); transition: width 0.3s; }
.affinity-label { font-size: 12px; color: #8a8a9a; margin-bottom: 10px; }
.interact-btn { border: 1px solid #44ee88; background: rgba(68,238,136,0.12); color: #44ee88; padding: 8px 20px; border-radius: 20px; cursor: pointer; }
.interact-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.pet-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.pet-card { text-align: center; padding: 16px; border-radius: 12px; background: rgba(76,221,140,0.08); border: 1px solid rgba(76,221,140,0.25); cursor: pointer; transition: border-color 0.2s; }
.pet-card.active { border-color: #d4a843; box-shadow: 0 0 12px rgba(212,168,67,0.25); }
.pet-card.locked { opacity: 0.45; filter: grayscale(0.8); background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.08); cursor: default; }
.pet-emoji { font-size: 36px; }
.pet-name { color: #d4a843; font-weight: 700; margin-top: 8px; }
.pet-req { font-size: 11px; color: #8a8a9a; margin-top: 4px; }
</style>
