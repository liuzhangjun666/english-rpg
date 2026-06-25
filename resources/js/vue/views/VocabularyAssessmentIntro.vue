<template>
  <div class="assessment-gate">
    <div class="gate-bg" />
    <div class="gate-glow gate-glow-left" />
    <div class="gate-glow gate-glow-right" />

    <div class="gate-content">
      <div v-if="fromRegister" class="welcome-badge">仙魂凝聚 · 初入仙途</div>

      <h1 class="gate-title">灵根测试</h1>
      <p class="gate-lead">
        {{ fromRegister ? '道友，欢迎踏入英语修仙界。' : '道友，你尚未测定灵根。' }}
        须先通过试炼，方能知晓真实境界、匹配最适合的修炼内容。
      </p>

      <div class="stage-chip" v-if="schoolGradeLabel">
        <span class="stage-chip-label">已选学段</span>
        <span class="stage-chip-value">{{ schoolGradeLabel }}</span>
        <span class="stage-chip-hint">仅用于匹配试炼起点</span>
      </div>

      <div class="flow-steps">
        <div class="flow-step">
          <span class="flow-num">壹</span>
          <div>
            <div class="flow-name">天机问心</div>
            <div class="flow-desc">25 题自适应试炼（词汇 15 + 语法 10）</div>
          </div>
        </div>
        <div class="flow-step">
          <span class="flow-num">贰</span>
          <div>
            <div class="flow-name">测定境界</div>
            <div class="flow-desc">连对升阶、答错降阶，得出练气至化神真实层级</div>
          </div>
        </div>
        <div class="flow-step">
          <span class="flow-num">叁</span>
          <div>
            <div class="flow-name">开启修炼</div>
            <div class="flow-desc">匹配词库难度、推荐关卡与秘境，获得完整修仙体验</div>
          </div>
        </div>
      </div>

      <div class="gate-note">
        未完成灵根测试前，大厅、练功房、秘境等功能暂不可进入。
      </div>

      <div class="gate-actions">
        <el-button
          type="primary"
          size="large"
          data-btn-skin="challenge"
          class="start-btn"
          :loading="starting"
          @click="startAssessment"
        >
          {{ fromRegister ? '立即测定灵根' : '开始灵根测试' }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { useRoute, useRouter } from 'vue-router';
import { useApiClient } from '../services/api';
import { useUserStore } from '../stores/user';

const SCHOOL_GRADE_LABELS: Record<string, string> = {
  primary: '小学',
  junior: '初中',
  senior: '高中',
  college: '大学',
  graduate: '研究生',
};

const router = useRouter();
const route = useRoute();
const api = useApiClient();
const user = useUserStore();
const starting = ref(false);

const fromRegister = computed(() => route.query.from === 'register');
const schoolGradeLabel = computed(() => {
  const fromProfile = String(user.profile?.school_grade_label || '').trim();
  if (fromProfile) return fromProfile;
  const key = String(user.profile?.school_grade || '').trim();
  return SCHOOL_GRADE_LABELS[key] || '';
});

async function startAssessment() {
  starting.value = true;
  try {
    const res = await api.post('/vocab-assessment/start', {});
    if (!res?.success || !res?.data?.assessment_id) {
      ElMessage.error(res?.message || '开启测试失败');
      return;
    }
    const query: Record<string, string> = {};
    const redirect = String(route.query.redirect || '').trim();
    if (redirect) query.redirect = redirect;
    if (fromRegister.value) query.from = 'register';
    router.replace({
      path: `/vocab-assessment/question/${res.data.assessment_id}`,
      query,
    });
  } finally {
    starting.value = false;
  }
}

onMounted(async () => {
  if (fromRegister.value) return;

  const res = await api.get('/vocab-assessment/status', { skipAuthLogout: true });
  if (res?.success && res?.data?.done) {
    if (user.profile) {
      user.updateProfile({
        initial_assessment_done: 1,
        current_realm: res.data.current_realm ?? user.profile.current_realm,
      });
    }
    const redirect = String(route.query.redirect || '/practice');
    router.replace(redirect);
  }
});
</script>

<style scoped>
.assessment-gate {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 16px 48px;
  overflow: hidden;
}

.gate-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 50% 0%, rgba(212, 168, 67, 0.16) 0%, transparent 42%),
    linear-gradient(180deg, rgba(8, 12, 28, 0.98) 0%, rgba(12, 18, 38, 0.96) 100%);
  z-index: 0;
}

.gate-glow {
  position: absolute;
  width: 360px;
  height: 360px;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.35;
  z-index: 0;
}

.gate-glow-left {
  left: -80px;
  top: 20%;
  background: rgba(234, 179, 8, 0.35);
}

.gate-glow-right {
  right: -80px;
  bottom: 10%;
  background: rgba(96, 165, 250, 0.25);
}

.gate-content {
  position: relative;
  z-index: 1;
  width: min(760px, 100%);
  padding: 36px 32px 32px;
  border-radius: 20px;
  border: 1px solid rgba(212, 168, 67, 0.42);
  background: linear-gradient(180deg, rgba(18, 26, 48, 0.92) 0%, rgba(10, 15, 32, 0.94) 100%);
  box-shadow:
    0 24px 48px rgba(0, 0, 0, 0.45),
    inset 0 0 0 1px rgba(255, 235, 182, 0.06);
  color: #f4ecd0;
}

.welcome-badge {
  display: inline-block;
  margin-bottom: 14px;
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid rgba(234, 179, 8, 0.45);
  background: rgba(234, 179, 8, 0.12);
  color: #fde68a;
  font-size: 13px;
  letter-spacing: 2px;
}

.gate-title {
  margin: 0 0 12px;
  font-size: clamp(28px, 5vw, 38px);
  font-weight: 800;
  color: #f5de9e;
  letter-spacing: 4px;
}

.gate-lead {
  margin: 0 0 22px;
  line-height: 1.8;
  color: #d8ccb0;
  font-size: 15px;
}

.stage-chip {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  margin-bottom: 24px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.stage-chip-label {
  font-size: 12px;
  color: #9ca3af;
}

.stage-chip-value {
  font-size: 15px;
  font-weight: 700;
  color: #fde68a;
}

.stage-chip-hint {
  font-size: 12px;
  color: #6b7280;
}

.flow-steps {
  display: grid;
  gap: 12px;
  margin-bottom: 20px;
}

.flow-step {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  padding: 14px 16px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid rgba(212, 168, 67, 0.18);
}

.flow-num {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(234, 179, 8, 0.15);
  color: #fbbf24;
  font-weight: 700;
  font-size: 14px;
}

.flow-name {
  font-size: 15px;
  font-weight: 700;
  color: #f5de9e;
  margin-bottom: 4px;
}

.flow-desc {
  font-size: 13px;
  line-height: 1.6;
  color: #b8ad92;
}

.gate-note {
  margin-bottom: 24px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.22);
  color: #fca5a5;
  font-size: 13px;
  line-height: 1.6;
}

.gate-actions {
  display: flex;
  justify-content: center;
}

.start-btn {
  min-width: 220px;
  font-size: 16px;
  letter-spacing: 2px;
}

@media (max-width: 640px) {
  .gate-content {
    padding: 28px 20px 24px;
  }
}
</style>
