<template>
  <div class="module-rules">
    <div class="module-rules-head">
      <div class="module-rules-icon">{{ rules.icon }}</div>
      <div>
        <div class="module-rules-title">{{ rules.title }}</div>
        <div v-if="rules.subtitle" class="module-rules-subtitle">{{ rules.subtitle }}</div>
      </div>
    </div>

    <p v-if="rules.summary" class="module-rules-summary">{{ rules.summary }}</p>

    <div class="module-rules-section">
      <div class="cult-section-title">玩法规则</div>
      <ul class="module-rules-list">
        <li v-for="(item, index) in rules.items" :key="index" class="module-rules-item">
          <span class="module-rules-index">{{ index + 1 }}</span>
          <span class="module-rules-text">{{ item }}</span>
        </li>
      </ul>
    </div>

    <div v-if="rules.tips?.length" class="module-rules-tips">
      <div class="cult-section-title">修炼贴士</div>
      <p v-for="(tip, index) in rules.tips" :key="index" class="module-rules-tip">{{ tip }}</p>
    </div>

    <div class="cult-actions">
      <el-button type="primary" data-btn-skin="enter" @click="emit('confirm')">{{ rules.confirmText || '已了解，开始修炼' }}</el-button>
      <el-button v-if="showBack" data-btn-skin="back" @click="emit('back')">返回大厅</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { getModuleRules, type ModuleRulesKey } from '../data/moduleRules';

const props = withDefaults(
  defineProps<{
    moduleKey: ModuleRulesKey;
    showBack?: boolean;
  }>(),
  {
    showBack: false,
  }
);

const emit = defineEmits<{
  (e: 'confirm'): void;
  (e: 'back'): void;
}>();

const rules = computed(() => getModuleRules(props.moduleKey));
</script>
