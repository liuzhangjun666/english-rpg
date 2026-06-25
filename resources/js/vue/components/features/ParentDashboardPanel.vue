<template>
  <Teleport to="body">
    <transition name="fade">
      <div v-if="visible" class="cultivation-overlay" @click.self="close">
        <div class="cultivation-container">
          <div class="cultivation-header">
            <span class="cultivation-title">📋 护道人札记</span>
            <button class="cultivation-close-btn" @click="close">关闭</button>
          </div>
          <div class="cultivation-body" v-loading="loading">
            <div class="bind-block">
              <div class="block-title">护道人绑定</div>
              <p v-if="parentBound" class="bind-done">已绑定护道人：{{ parentPhone }}</p>
              <template v-else>
                <div class="bind-row">
                  <input v-model="bindPhone" class="bind-input" maxlength="11" placeholder="家长手机号" />
                  <button class="bind-code-btn" type="button" :disabled="codeCooldown > 0 || sendingCode" @click="sendBindCode">
                    {{ codeCooldown > 0 ? `${codeCooldown}s` : '获取验证码' }}
                  </button>
                </div>
                <input v-model="bindCode" class="bind-input" maxlength="6" placeholder="6位验证码" />
                <el-button type="primary" size="small" :loading="binding" @click="submitBind">确认绑定</el-button>
              </template>
            </div>

            <template v-if="dashboard">
              <div class="stat-grid">
                <div class="stat-card">
                  <div class="stat-value">{{ today.questions_done || 0 }}</div>
                  <div class="stat-label">今日修炼题数</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value" :class="{ good: Number(today.accuracy || 0) >= 70 }">{{ today.accuracy || 0 }}%</div>
                  <div class="stat-label">今日悟性命中</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">{{ progress.streak_days || 0 }}</div>
                  <div class="stat-label">连修天数</div>
                </div>
              </div>
              <div class="info-block">
                <div>当前境界：{{ progress.realm_name || '-' }} · {{ progress.stage || 1 }}重</div>
                <div class="tip">建议：每日保持 10-20 分钟稳修，优先温故复盘心魔题。</div>
              </div>
              <div class="info-block" v-if="weakTags.length">
                <div class="block-title">心魔执念（前5）</div>
                <div v-for="tag in weakTags" :key="tag.tag">{{ tag.tag }}（误{{ tag.wrong_count || 0 }}）</div>
              </div>
              <div class="advice">💡 护道人建议：{{ tip }}</div>
              <div class="actions">
                <el-button type="primary" @click="copyReport">复制札记</el-button>
                <el-button @click="close">返回</el-button>
              </div>
            </template>
            <div v-else-if="!loading" class="empty">暂无护道人数据</div>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, computed, onBeforeUnmount } from 'vue';
import { ElMessage } from 'element-plus';
import { useApiClient } from '../../services/api';
import { useUserStore } from '../../stores/user';

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{ (e: 'update:visible', value: boolean): void }>();

const api = useApiClient();
const user = useUserStore();
const loading = ref(false);
const dashboard = ref<any>(null);
const analytics = ref<any>(null);
const bindPhone = ref('');
const bindCode = ref('');
const binding = ref(false);
const sendingCode = ref(false);
const codeCooldown = ref(0);
let cooldownTimer: ReturnType<typeof setInterval> | null = null;

const parentPhone = computed(() => user.profile?.parent_phone || '');
const parentBound = computed(() => Boolean(user.profile?.parent_verified && parentPhone.value));

const today = computed(() => dashboard.value?.card1_today || {});
const progress = computed(() => dashboard.value?.card2_progress || {});
const tip = computed(() => dashboard.value?.card3_tip?.message || '今日修炼平稳，道心可嘉。');
const weakTags = computed(() => (Array.isArray(analytics.value?.weak_tags) ? analytics.value.weak_tags.slice(0, 5) : []));

watch(() => props.visible, async (val) => {
  if (!val) return;
  loading.value = true;
  try {
    const [dashRes, analyticsRes] = await Promise.all([
      api.get('/parent/dashboard'),
      api.get('/parent/report?type=analytics&days=30'),
    ]);
    dashboard.value = dashRes?.success ? dashRes.data : null;
    analytics.value = analyticsRes?.success ? analyticsRes.data : null;
  } catch {
    ElMessage.error('获取护道人札记失败');
  } finally {
    loading.value = false;
  }
});

async function copyReport() {
  const text = `【护道人札记】
今日修炼题数：${today.value.questions_done || 0} 题
今日悟性命中：${today.value.accuracy || 0}%
连修天数：${progress.value.streak_days || 0} 天
建议：${tip.value}`;
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success('已复制到剪贴板');
  } catch {
    ElMessage.info(text);
  }
}

async function sendBindCode() {
  const phone = bindPhone.value.trim();
  if (!/^1\d{10}$/.test(phone)) {
    ElMessage.warning('请输入11位家长手机号');
    return;
  }
  sendingCode.value = true;
  try {
    const res = await api.post('/sms/send', { phone, action: 'bind' });
    if (res?.success) {
      ElMessage.success(res.message || '验证码已发送');
      codeCooldown.value = 60;
      cooldownTimer = setInterval(() => {
        codeCooldown.value -= 1;
        if (codeCooldown.value <= 0 && cooldownTimer) {
          clearInterval(cooldownTimer);
          cooldownTimer = null;
        }
      }, 1000);
    } else {
      ElMessage.warning(res?.message || '发送失败');
    }
  } catch {
    ElMessage.error('发送验证码失败');
  } finally {
    sendingCode.value = false;
  }
}

async function submitBind() {
  const phone = bindPhone.value.trim();
  const code = bindCode.value.trim();
  if (!/^1\d{10}$/.test(phone)) {
    ElMessage.warning('请输入11位家长手机号');
    return;
  }
  if (!/^\d{6}$/.test(code)) {
    ElMessage.warning('请输入6位验证码');
    return;
  }
  binding.value = true;
  try {
    const res = await api.post('/parent/bind', { parent_phone: phone, code });
    if (res?.success) {
      user.updateProfile(res.data || { parent_phone: phone, parent_verified: true });
      ElMessage.success('护道人绑定成功');
      bindCode.value = '';
    } else {
      ElMessage.warning(res?.message || '绑定失败');
    }
  } catch {
    ElMessage.error('绑定失败');
  } finally {
    binding.value = false;
  }
}

function close() {
  emit('update:visible', false);
}

onBeforeUnmount(() => {
  if (cooldownTimer) clearInterval(cooldownTimer);
});
</script>

<style scoped>
.cultivation-overlay {
  position: fixed; inset: 0; z-index: 2200;
  background: rgba(10, 10, 26, 0.85);
  display: flex; align-items: center; justify-content: center;
  backdrop-filter: blur(5px);
}
.cultivation-container {
  width: min(520px, 92vw); max-height: 90vh;
  background: #1a1a2e; border: 2px solid #d4a843; border-radius: 12px;
  display: flex; flex-direction: column; overflow: hidden;
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
.cultivation-body { padding: 20px; overflow-y: auto; color: #c8b685; }
.bind-block {
  padding: 12px; border-radius: 10px; background: rgba(255,255,255,0.03);
  margin-bottom: 14px;
}
.bind-row { display: flex; gap: 8px; margin-bottom: 8px; }
.bind-input {
  flex: 1; padding: 8px 10px; border-radius: 8px;
  border: 1px solid rgba(212,168,67,0.35); background: rgba(0,0,0,0.25); color: #f7f3e8;
  margin-bottom: 8px;
}
.bind-code-btn {
  flex-shrink: 0; padding: 0 12px; border-radius: 8px;
  border: 1px solid rgba(212,168,67,0.45); background: rgba(212,168,67,0.12);
  color: #d4a843; cursor: pointer;
}
.bind-code-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.bind-done { font-size: 13px; color: #4ec07a; margin: 0; }
.stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px; }
.stat-card { text-align: center; padding: 10px; border-radius: 10px; background: rgba(255,255,255,0.04); }
.stat-value { font-size: 20px; color: #d4a843; font-weight: 700; }
.stat-value.good { color: #4ec07a; }
.stat-label { font-size: 11px; margin-top: 4px; }
.info-block, .advice {
  padding: 12px; border-radius: 10px; background: rgba(255,255,255,0.03);
  margin-bottom: 10px; font-size: 13px; line-height: 1.7;
}
.block-title { color: #d4a843; margin-bottom: 6px; }
.tip { margin-top: 6px; font-size: 12px; opacity: 0.85; }
.actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 12px; }
.empty { text-align: center; padding: 40px 0; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
