<template>
  <Teleport to="body">
    <transition name="fade">
      <div v-if="visible" class="cultivation-overlay" @click.self="close">
        <div class="cultivation-container">
          <div class="cultivation-header">
            <span class="cultivation-title">🌅 每日签到</span>
            <button class="cultivation-close-btn" @click="close">关闭</button>
          </div>
          <div class="cultivation-body">
            <div class="signin-ring">
              <div class="signin-day">{{ streakDays }}</div>
              <div class="signin-sub">连续修炼天</div>
            </div>
            <p class="hint">签到可领取灵石 +10，并触发每日灵力恢复。</p>
            <p v-if="signedToday" class="done-tip">今日已签到，道心稳固。</p>
            <div class="actions">
              <el-button type="primary" :disabled="signedToday || loading" @click="doSignIn">
                {{ signedToday ? '已签到' : '签到领赏' }}
              </el-button>
              <el-button @click="close">返回</el-button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { useApiClient } from '../../services/api';
import { useUserStore } from '../../stores/user';

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{ (e: 'update:visible', value: boolean): void }>();

const api = useApiClient();
const user = useUserStore();
const loading = ref(false);
const signedToday = ref(false);
const streakDays = ref(0);

watch(() => props.visible, async (val) => {
  if (!val) return;
  try {
    const res = await api.get('/daily/tasks');
    if (res?.success) {
      signedToday.value = !!res.data?.signin_done;
      streakDays.value = res.data?.signin_streak ?? 0;
    }
  } catch { /* ignore */ }
});

async function doSignIn() {
  loading.value = true;
  try {
    const res = await api.post('/daily/signin');
    if (res?.success) {
      signedToday.value = true;
      streakDays.value = res.data?.signin_streak ?? streakDays.value;
      if (res.data?.user) user.updateProfile(res.data.user);
      ElMessage.success(res.message || '签到成功');
    }
  } catch {
    ElMessage.error('签到失败');
  } finally {
    loading.value = false;
  }
}

function close() {
  emit('update:visible', false);
}
</script>

<style scoped>
.cultivation-overlay {
  position: fixed; inset: 0; z-index: 2200;
  background: rgba(10, 10, 26, 0.85);
  display: flex; align-items: center; justify-content: center;
}
.cultivation-container {
  width: min(400px, 92vw); background: #1a1a2e; border: 2px solid #d4a843;
  border-radius: 12px; overflow: hidden;
}
.cultivation-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px; border-bottom: 1px solid rgba(212, 168, 67, 0.3);
}
.cultivation-title { color: #d4a843; font-weight: 700; }
.cultivation-close-btn {
  background: transparent; border: 1px solid #d4a843; color: #d4a843;
  padding: 4px 12px; border-radius: 4px; cursor: pointer;
}
.cultivation-body { padding: 24px; text-align: center; color: #c8b685; }
.signin-ring {
  width: 120px; height: 120px; margin: 0 auto 16px; border-radius: 50%;
  border: 3px solid rgba(212, 168, 67, 0.5);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  background: radial-gradient(circle, rgba(212,168,67,0.15), transparent);
}
.signin-day { font-size: 36px; color: #d4a843; font-weight: 800; }
.signin-sub { font-size: 12px; }
.hint { font-size: 13px; margin-bottom: 12px; }
.done-tip { color: #4ec07a; margin-bottom: 12px; }
.actions { display: flex; gap: 10px; justify-content: center; }
</style>
