<template>
  <div class="character-status-panel group">
    <!-- 面板背景，国风水墨纹理/暗黑半透明 -->
    <div class="panel-bg"></div>

    <!-- 头部信息：道号与境界 -->
    <div class="panel-header">
      <div class="avatar-frame">
        <div class="avatar-inner">悟</div>
      </div>
      <div class="user-meta">
        <div class="nickname">{{ profile?.nickname || '无名散修' }}</div>
        <div class="realm-badge">{{ realmName }}</div>
      </div>
    </div>

    <!-- 战力大字 -->
    <div class="power-display">
      <div class="power-label">境界灵力</div>
      <div class="power-value-wrapper">
        <span class="power-icon">⚔</span>
        <span class="power-value">{{ combatPower.toLocaleString() }}</span>
      </div>
    </div>

    <!-- 修为进度条 -->
    <div class="cultivation-section">
      <div class="exp-header">
        <span class="exp-label">修为</span>
        <span class="exp-text">{{ profile?.cultivation_energy || 0 }} / {{ profile?.next_realm_energy || '???' }}</span>
      </div>
      <div class="exp-bar-bg">
        <div class="exp-bar-fill" :style="{ width: Math.min(100, profile?.realm_progress_percent || 0) + '%' }">
          <div class="exp-bar-glow"></div>
        </div>
      </div>
    </div>

    <!-- 六维灵根 (折叠区，默认展开或悬浮高亮) -->
    <div class="dimensions-section">
      <div class="dim-title">灵根属性</div>
      <div class="dimensions-grid">
        <div class="dim-item" v-for="dim in dimensionsList" :key="dim.key">
          <div class="dim-header">
            <span class="dim-name">{{ dim.label }}</span>
            <span class="dim-val">{{ dim.value }}</span>
          </div>
          <!-- 采用无限进度条视觉：数值越高，条越满，超过一定值后重置颜色 -->
          <div class="dim-bar-bg">
            <div class="dim-bar-fill" :style="getDimBarStyle(dim.value)"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useUserStore } from '../../stores/user';
import { getRealmDisplayName } from '../../../utils/cultivation.js';

const userStore = useUserStore();
const profile = computed(() => userStore.profile);

const realmName = computed(() => {
  if (profile.value?.realm_name) return profile.value.realm_name;
  return getRealmDisplayName(profile.value?.realm, profile.value?.stage || profile.value?.realm_stage);
});

const dimensions = computed(() => profile.value?.six_dimensions || {});

const dimensionsList = computed(() => [
  { key: 'vocab', label: '词汇', value: Number(dimensions.value.vocab) || 0 },
  { key: 'grammar', label: '语法', value: Number(dimensions.value.grammar) || 0 },
  { key: 'reading', label: '阅读', value: Number(dimensions.value.reading) || 0 },
  { key: 'listening', label: '听风', value: Number(dimensions.value.listening) || 0 },
  { key: 'speaking', label: '言灵', value: Number(dimensions.value.speaking) || 0 },
  { key: 'writing', label: '符箓', value: Number(dimensions.value.writing) || 0 },
]);

// 战力计算公式：修为 * 1.5 + 六维总和 * 20 (产生数值膨胀的养成感)
const combatPower = computed(() => {
  const basePower = (profile.value?.cultivation_energy || 0) * 1.5;
  const dimSum = dimensionsList.value.reduce((sum, dim) => sum + dim.value, 0);
  return Math.floor(basePower + (dimSum * 20));
});

// 计算六维条的宽度和颜色（每突破 100/500/1000 换一种颜色表现）
function getDimBarStyle(val: number) {
  const breakpoints = [100, 500, 1500, 3000, 5000, 10000];
  let currentMax = breakpoints[0];
  let color = '#a3b8cc'; // 默认灰蓝 (练气)

  if (val >= 100) { currentMax = 500; color = '#73c991'; } // 绿 (筑基)
  if (val >= 500) { currentMax = 1500; color = '#51a1ff'; } // 蓝 (金丹)
  if (val >= 1500) { currentMax = 3000; color = '#c388ff'; } // 紫 (元婴)
  if (val >= 3000) { currentMax = 5000; color = '#ff9800'; } // 橙 (化神)
  if (val >= 5000) { currentMax = 10000; color = '#ff4d4f'; } // 红 (炼虚及以上)

  // 为了让条有成长感，计算在当前区间内的百分比。但为了避免条太空，如果是高级阶段，基础宽度给个最低保障
  const ratio = Math.min(100, (val / currentMax) * 100);
  
  return {
    width: `${Math.max(5, ratio)}%`,
    backgroundColor: color,
    boxShadow: `0 0 8px ${color}80`
  };
}
</script>

<style scoped>
.character-status-panel {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 260px;
  background: rgba(15, 18, 25, 0.85);
  border: 1px solid rgba(212, 168, 67, 0.4);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8), inset 0 0 20px rgba(212, 168, 67, 0.05);
  backdrop-filter: blur(12px);
  z-index: 1000;
  padding: 16px;
  color: #e2e8f0;
  font-family: 'Ma Shan Zheng', 'STXingkai', 'KaiTi', serif; /* 优先使用书法字体 */
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.character-status-panel:hover {
  transform: scale(1.02);
  border-color: rgba(212, 168, 67, 0.8);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8), inset 0 0 20px rgba(212, 168, 67, 0.15);
}

.panel-bg {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle at 100% 0%, rgba(212, 168, 67, 0.1) 0%, transparent 50%);
  pointer-events: none;
  border-radius: 8px;
}

/* 头部 */
.panel-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  position: relative;
  z-index: 1;
}

.avatar-frame {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #d4a843, #8a6d2b);
  padding: 2px;
  box-shadow: 0 0 10px rgba(212, 168, 67, 0.3);
}

.avatar-inner {
  width: 100%;
  height: 100%;
  background: #1a1c23;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #d4a843;
  font-weight: bold;
}

.user-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nickname {
  font-size: 16px;
  font-weight: bold;
  color: #f8fafc;
  letter-spacing: 1px;
}

.realm-badge {
  font-size: 12px;
  color: #0f1219;
  background: linear-gradient(90deg, #d4a843, #fceea7);
  padding: 2px 8px;
  border-radius: 4px;
  display: inline-block;
  align-self: flex-start;
  font-weight: bold;
  box-shadow: 0 2px 4px rgba(212, 168, 67, 0.4);
}

/* 战力大字 */
.power-display {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 16px;
  text-align: center;
  position: relative;
  z-index: 1;
}

.power-label {
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 4px;
  letter-spacing: 2px;
}

.power-value-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.power-icon {
  font-size: 18px;
  color: #ef4444;
  text-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
}

.power-value {
  font-size: 28px;
  font-family: 'Arial', sans-serif;
  font-weight: 900;
  color: #fceea7;
  text-shadow: 0 2px 10px rgba(212, 168, 67, 0.5);
  letter-spacing: 1px;
}

/* 修为区 */
.cultivation-section {
  margin-bottom: 16px;
  position: relative;
  z-index: 1;
}

.exp-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 6px;
}

.exp-label {
  font-size: 13px;
  color: #cbd5e1;
}

.exp-text {
  font-size: 11px;
  color: #d4a843;
  font-family: monospace;
}

.exp-bar-bg {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
  position: relative;
}

.exp-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #8a6d2b, #d4a843);
  border-radius: 3px;
  position: relative;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.exp-bar-glow {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 20px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.8));
  filter: blur(2px);
  animation: scanning 2s infinite linear;
}

@keyframes scanning {
  0% { transform: translateX(-100%); opacity: 0; }
  50% { opacity: 1; }
  100% { transform: translateX(20px); opacity: 0; }
}

/* 六维区 */
.dimensions-section {
  position: relative;
  z-index: 1;
}

.dim-title {
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 10px;
  text-align: center;
  position: relative;
}
.dim-title::before, .dim-title::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 30%;
  height: 1px;
  background: rgba(255,255,255,0.1);
}
.dim-title::before { left: 0; }
.dim-title::after { right: 0; }

.dimensions-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.dim-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dim-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dim-name {
  font-size: 12px;
  color: #e2e8f0;
}

.dim-val {
  font-size: 11px;
  color: #cbd5e1;
  font-family: monospace;
}

.dim-bar-bg {
  height: 4px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 2px;
  overflow: hidden;
}

.dim-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.4s ease, background-color 0.4s ease;
}

/* 响应式：在极小屏幕时可以适当缩小或隐藏面板，但为了保留养成感，默认展示 */
@media (max-width: 768px) {
  .character-status-panel {
    transform: scale(0.85);
    transform-origin: top right;
    top: 10px;
    right: 10px;
  }
}
</style>
