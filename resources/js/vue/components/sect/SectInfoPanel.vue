<script setup lang="ts">
import { defineProps } from 'vue'

const props = defineProps<{
  nodeInfo: {
    id: string
    name: string
    route?: string
  } | null
  position: { x: number, y: number } | null
}>()
</script>

<template>
  <transition name="fade">
    <div 
      v-if="nodeInfo && position"
      class="absolute z-50 pointer-events-none transform -translate-x-1/2 -translate-y-[120%]"
      :style="{ left: position.x + 'px', top: position.y + 'px' }"
    >
      <div class="relative bg-[#0b1021]/90 backdrop-blur-md border border-[#d4af37]/50 p-4 rounded-lg shadow-[0_0_20px_rgba(212,175,55,0.2)] min-w-[160px]">
        <!-- 装饰角 -->
        <div class="absolute -top-1 -left-1 w-2 h-2 border-t border-l border-[#d4af37]"></div>
        <div class="absolute -bottom-1 -right-1 w-2 h-2 border-b border-r border-[#d4af37]"></div>
        
        <h3 class="text-[#d4af37] text-lg font-bold tracking-widest text-center border-b border-[#d4af37]/30 pb-2 mb-2">
          {{ nodeInfo.name }}
        </h3>
        
        <!-- 模拟数据，后续可从 store 获取 -->
        <div class="text-gray-300 text-sm space-y-1">
          <p class="flex justify-between"><span>等级：</span> <span class="text-cyan-400">Lv.1</span></p>
          <p class="flex justify-between"><span>今日进度：</span> <span class="text-green-400">0/10</span></p>
        </div>

        <p v-if="!nodeInfo.route" class="text-xs text-gray-500 mt-2 text-center">暂未开放</p>
      </div>
      
      <!-- 向下的指针 -->
      <div class="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-[#d4af37]/50"></div>
    </div>
  </transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -100%) scale(0.95);
}
</style>
