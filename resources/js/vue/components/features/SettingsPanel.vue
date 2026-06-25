<template>
  <Teleport to="body">
    <transition name="fade">
      <div v-if="visible" class="cultivation-overlay" @click.self="close">
        <div class="cultivation-container">
          <div class="cultivation-header">
            <span class="cultivation-title">⚙️ 修炼设置</span>
            <button class="cultivation-close-btn" @click="close">关闭</button>
          </div>
          <div class="cultivation-body">
            <label class="setting-row">
              <span>答题音效</span>
              <el-switch v-model="soundEnabled" @change="saveSettings" />
            </label>
            <label class="setting-row">
              <span>修炼震动反馈</span>
              <el-switch v-model="hapticEnabled" @change="saveSettings" />
            </label>
            <div class="setting-row">
              <span>当前道号</span>
              <span class="val">{{ profile?.nickname || '匿名前辈' }}</span>
            </div>
            <div class="actions">
              <el-button @click="openParent">护道人札记</el-button>
              <el-button type="danger" @click="logout">退出登出</el-button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useUserStore } from '../../stores/user';
import { useGameSound } from '../../composables/useGameSound';

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'open-parent'): void;
}>();

const user = useUserStore();
const sound = useGameSound();
const profile = computed(() => user.profile);
const soundEnabled = ref(true);
const hapticEnabled = ref(false);

watch(() => props.visible, (val) => {
  if (!val) return;
  soundEnabled.value = !sound.isMuted();
  hapticEnabled.value = localStorage.getItem('settings_haptic') === '1';
});

function saveSettings() {
  sound.setMuted(!soundEnabled.value);
  localStorage.setItem('settings_haptic', hapticEnabled.value ? '1' : '0');
}

function openParent() {
  close();
  emit('open-parent');
}

function logout() {
  close();
  window.dispatchEvent(new CustomEvent('auth:logout'));
}

function close() {
  emit('update:visible', false);
}
</script>

<style scoped>
.cultivation-overlay { position: fixed; inset: 0; z-index: 2200; background: rgba(10,10,26,0.85); display: flex; align-items: center; justify-content: center; }
.cultivation-container { width: min(420px, 92vw); background: #1a1a2e; border: 2px solid #d4a843; border-radius: 12px; }
.cultivation-header { display: flex; justify-content: space-between; padding: 16px; border-bottom: 1px solid rgba(212,168,67,0.3); }
.cultivation-title { color: #d4a843; font-weight: 700; }
.cultivation-close-btn { background: transparent; border: 1px solid #d4a843; color: #d4a843; padding: 4px 12px; border-radius: 4px; cursor: pointer; }
.cultivation-body { padding: 20px; color: #c8b685; }
.setting-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
.val { color: #d4a843; }
.actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
</style>
