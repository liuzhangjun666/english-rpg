<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { WorldSceneManager, SectNodeDef } from '../../core/sect/WorldSceneManager'
import SectInfoPanel from './SectInfoPanel.vue'

const router = useRouter()
const canvasContainer = ref<HTMLElement | null>(null)

// 悬浮面板状态
const hoverNode = ref<SectNodeDef | null>(null)
const hoverPos = ref<{ x: number, y: number } | null>(null)

let worldManager: WorldSceneManager | null = null

onMounted(() => {
  if (!canvasContainer.value) return

  // 初始化 3D 场景
  worldManager = new WorldSceneManager(canvasContainer.value)

  // 绑定悬浮回调
  worldManager.onBuildingHover = (node) => {
    hoverNode.value = node
  }

  // 绑定点击回调（新签名：node, screenX, screenY）
  worldManager.onBuildingClick = (node, _sx, _sy) => {
    console.log(`[SectCanvas] 点击建筑: ${node.name}`)
  }
})

onBeforeUnmount(() => {
  if (worldManager) {
    worldManager.dispose()
    worldManager = null
  }
})
</script>

<template>
  <div class="relative w-full h-screen overflow-hidden bg-black select-none">
    <!-- Three.js 画布容器 -->
    <div ref="canvasContainer" class="w-full h-full absolute inset-0 cursor-default"></div>

    <!-- 交互 UI 覆盖层 -->
    <div class="absolute inset-0 pointer-events-none z-10">
      <SectInfoPanel :node-info="hoverNode" :position="hoverPos" />
    </div>
  </div>
</template>
