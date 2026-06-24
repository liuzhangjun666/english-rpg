<script setup lang="ts">
defineProps<{ icon: string; label: string; value: string | number }>();
</script>
<template>
  <div class="tower-reward-card">
    <div class="tower-reward-card__icon">{{ icon }}</div>
    <div class="tower-reward-card__label">{{ label }}</div>
    <div class="tower-reward-card__value">{{ value }}</div>
  </div>
</template>
<style scoped>
.tower-reward-card {
  padding: 16px; background: rgba(196,30,58,0.15); border: 1px solid #c41e3a;
  border-radius: 6px; text-align: center; min-width: 120px;
}
.tower-reward-card__icon { font-size: 28px; }
.tower-reward-card__label { font-size: 12px; opacity: 0.7; margin-top: 4px; }
.tower-reward-card__value { font-size: 18px; font-weight: bold; margin-top: 6px; color: #ffe28a; }
</style>
