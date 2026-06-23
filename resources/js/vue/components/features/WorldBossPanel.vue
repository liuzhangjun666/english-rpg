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
            </ul>
            <div class="actions">
              <el-button type="danger" @click="startBoss">挑战大妖</el-button>
              <el-button @click="close">暂避锋芒</el-button>
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
.cultivation-container { width: min(460px, 92vw); background: linear-gradient(180deg, #2a1020, #1a1a2e); border: 2px solid #c0392b; border-radius: 12px; }
.cultivation-header { display: flex; justify-content: space-between; padding: 16px; border-bottom: 1px solid rgba(192,57,43,0.4); }
.cultivation-title { color: #ff8060; font-weight: 700; }
.cultivation-close-btn { background: transparent; border: 1px solid #c0392b; color: #ff8060; padding: 4px 12px; border-radius: 4px; cursor: pointer; }
.cultivation-body { padding: 24px; text-align: center; color: #c8b685; }
.boss-art { font-size: 64px; margin-bottom: 8px; }
.boss-name { color: #ff8060; margin: 0 0 12px; }
.boss-desc { font-size: 14px; line-height: 1.7; margin-bottom: 16px; }
.boss-rules { text-align: left; font-size: 13px; line-height: 1.8; margin-bottom: 20px; padding-left: 20px; }
.actions { display: flex; gap: 10px; justify-content: center; }
</style>
