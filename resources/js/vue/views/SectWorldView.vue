<script setup lang="ts">
import { useRouter } from 'vue-router'
import SectCanvas from '../components/sect/SectCanvas.vue'

const router = useRouter()

const goBack = () => {
  router.push('/hall')
}
</script>

<template>
  <div class="relative w-full h-screen bg-[#050914] overflow-hidden">
    <!-- 3D 渲染核心层 -->
    <SectCanvas />

    <!-- 顶层 UI 覆盖 -->
    <div class="absolute top-0 left-0 w-full p-6 z-50 flex items-center justify-between pointer-events-none">
      <!-- 返回按钮 -->
      <button 
        @click="goBack"
        class="pointer-events-auto px-5 py-2.5 bg-[#0b1021]/80 backdrop-blur-md border border-[#d4af37]/60 rounded-lg text-[#d4af37] hover:text-[#ffea99] hover:bg-[#1a233a] hover:shadow-[0_0_15px_rgba(212,175,55,0.4)] transition-all flex items-center group font-bold tracking-widest"
      >
        <span class="mr-2 group-hover:-translate-x-1 transition-transform">←</span> 
        退出宗门大阵
      </button>

      <!-- 宗门牌匾 -->
      <div class="pointer-events-auto px-10 py-3 bg-[url('/images/plaque_bg.png')] bg-cover bg-center bg-[#0b1021]/80 backdrop-blur border-y-2 border-[#d4af37] shadow-[0_0_30px_rgba(212,175,55,0.2)]">
        <h1 class="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-[#ffea99] to-[#d4af37] tracking-[0.3em] filter drop-shadow-md">
          修仙世界
        </h1>
      </div>

      <div class="w-32"><!-- 占位以保持居中平衡 --></div>
    </div>
  </div>
</template>

<style scoped>
/* 修仙风格字体和发光可以在这里加，或者在 tailwind 统一定义 */
</style>
