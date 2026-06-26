<template>
  <Teleport to="body">
    <transition name="fade">
      <div v-if="visible" class="cultivation-overlay" @click.self="close">
        <div class="cultivation-container boss-panel">
          <div class="cultivation-header">
            <span class="cultivation-title">👹 世界挑战 · 上古大妖</span>
            <button class="cultivation-close-btn" @click="close">关闭</button>
          </div>
          <div class="cultivation-body">
            <div class="boss-art">🐲</div>
            <h3 class="boss-name">虚空蜃龙</h3>
            <p class="boss-desc">
              限时 90 秒高强度秘境挑战。连击越高伤害越大，击败蜃龙可获得额外灵石与修为。
            </p>
            <ul class="boss-rules">
              <li>推荐境界：虚空秘境解锁后</li>
              <li>消耗灵力：8 点</li>
              <li>题型：综合六维随机</li>
              <li>每位道友每周仅可挑战 1 次</li>
              <li>本周内可继续未完成进度；下周一次数与进度重置</li>
            </ul>
            <div class="actions">
              <button type="button" class="boss-btn boss-btn--start" @click="startBoss">挑战大妖</button>
              <button type="button" class="boss-btn boss-btn--close" @click="close">暂避锋芒</button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'start'): void;
}>();

function startBoss() {
  close();
  emit('start');
}

function close() {
  emit('update:visible', false);
}
</script>

<style scoped>
.cultivation-overlay { position: fixed; inset: 0; z-index: 2200; background: rgba(10,10,26,0.9); display: flex; align-items: center; justify-content: center; }
.cultivation-container { width: min(460px, 92vw); max-height: min(90vh, 720px); display: flex; flex-direction: column; background: linear-gradient(180deg, #2a1020, #1a1a2e); border: 2px solid #c0392b; border-radius: 12px; overflow: hidden; }
.cultivation-header { display: flex; justify-content: space-between; padding: 16px; border-bottom: 1px solid rgba(192,57,43,0.4); flex-shrink: 0; }
.cultivation-title { color: #ff8060; font-weight: 700; }
.cultivation-close-btn { background: transparent; border: 1px solid #c0392b; color: #ff8060; padding: 4px 12px; border-radius: 4px; cursor: pointer; }
.cultivation-body { padding: 24px; text-align: center; color: #c8b685; overflow-y: auto; }
.boss-art { font-size: 64px; margin-bottom: 8px; }
.boss-name { color: #ff8060; margin: 0 0 12px; }
.boss-desc { font-size: 14px; line-height: 1.7; margin-bottom: 16px; }
.boss-rules { text-align: left; font-size: 13px; line-height: 1.8; margin-bottom: 20px; padding-left: 20px; }
.actions { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
.boss-btn {
  min-width: 120px;
  padding: 10px 22px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}
.boss-btn--start {
  border: 1px solid #ff6b6b;
  background: linear-gradient(135deg, rgba(255, 80, 80, 0.35), rgba(192, 57, 43, 0.22));
  color: #ffe0e0;
  box-shadow: 0 0 12px rgba(255, 80, 80, 0.2);
}
.boss-btn--start:hover {
  transform: translateY(-1px);
  box-shadow: 0 0 16px rgba(255, 80, 80, 0.35);
}
.boss-btn--close {
  border: 1px solid rgba(200, 182, 133, 0.45);
  background: rgba(255, 255, 255, 0.06);
  color: #e8dcc0;
}
.boss-btn--close:hover {
  background: rgba(255, 255, 255, 0.12);
  transform: translateY(-1px);
}
</style>
