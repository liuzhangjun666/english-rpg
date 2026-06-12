<template>
  <div class="relative min-h-screen w-full overflow-hidden bg-slate-950 text-white font-sans selection:bg-cyan-500/30">
    <!-- 背景图层 -->
    <div class="absolute inset-0 z-0">
      <!-- 深色仙境渐变 -->
      <div class="absolute inset-0 bg-gradient-to-b from-slate-900 via-indigo-950/80 to-slate-950 opacity-90 z-10"></div>
      
      <!-- 星空/灵气漂浮效果 -->
      <div class="stars-bg z-0"></div>
      
      <!-- 底部迷雾效果模拟 -->
      <div class="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-slate-950 to-transparent z-10"></div>
    </div>

    <!-- 主体内容 -->
    <div class="relative z-20 flex flex-col min-h-screen">
      
      <!-- Logo与副标题 -->
      <header :class="['transition-all duration-1000 ease-in-out flex flex-col items-center w-full', showLogin ? 'pt-8 pb-4' : 'pt-[20vh]']">
        <h1 class="text-6xl md:text-8xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-cyan-200 to-blue-600 drop-shadow-[0_0_20px_rgba(34,211,238,0.4)] logo-text">
          英语修仙
        </h1>
        <p class="mt-6 text-xl md:text-2xl text-cyan-100/80 tracking-[0.6em] font-light uppercase">
          背单词，修大道
        </p>
      </header>

      <!-- 中间交互区域 -->
      <main class="flex-1 flex flex-col items-center justify-center p-4 md:p-8 w-full max-w-7xl mx-auto">
        <transition name="fade-scale" mode="out-in">
          
          <!-- 首页：大按钮 -->
          <div v-if="!showLogin" key="enter-btn" class="flex flex-col items-center justify-center mt-12">
            <button 
              @click="showLogin = true"
              class="relative overflow-hidden group px-16 py-6 rounded-full bg-slate-900/50 backdrop-blur-md text-white text-3xl font-bold tracking-widest transition-all duration-500 hover:scale-105 border border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.3)] hover:shadow-[0_0_50px_rgba(6,182,212,0.6)] hover:bg-slate-800/80"
            >
              <span class="relative z-10 text-cyan-50 drop-shadow-md">踏入修仙界</span>
              <!-- 按钮划过流光动画 -->
              <div class="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent z-0"></div>
            </button>
          </div>

          <!-- 登录界面 -->
          <div v-else key="login-panel" class="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center animate-fade-in-up mt-8">
            
            <!-- 左侧：登录/注册卡片 -->
            <div class="w-full max-w-md mx-auto lg:col-span-5 p-8 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-cyan-500/30 shadow-2xl shadow-cyan-900/20 relative overflow-hidden group">
              <!-- 卡片顶部高光边缘 -->
              <div class="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-70"></div>
              
              <h2 class="text-2xl font-bold text-center mb-8 text-cyan-50 tracking-wider">仙友，请出示命牌</h2>
              
              <form @submit.prevent="handleLogin" class="space-y-6 relative z-10">
                <div>
                  <label class="block text-sm font-medium text-cyan-200/70 mb-2">道号 (用户名)</label>
                  <div class="relative">
                    <input type="text" v-model="username" class="w-full bg-slate-950/60 border border-slate-700/80 rounded-xl px-4 py-3.5 text-cyan-50 placeholder-slate-500 focus:outline-none focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-inner" placeholder="输入您的道号" />
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-cyan-200/70 mb-2">秘钥 (密码)</label>
                  <div class="relative">
                    <input type="password" v-model="password" class="w-full bg-slate-950/60 border border-slate-700/80 rounded-xl px-4 py-3.5 text-cyan-50 placeholder-slate-500 focus:outline-none focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-inner" placeholder="输入秘钥" />
                  </div>
                </div>
                
                <div class="pt-6 space-y-4">
                  <button type="submit" class="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-700 to-blue-700 hover:from-cyan-600 hover:to-blue-600 text-white font-bold tracking-[0.2em] transition-all shadow-[0_0_20px_rgba(8,145,178,0.3)] hover:shadow-[0_0_25px_rgba(8,145,178,0.5)] transform hover:-translate-y-0.5">
                    凝聚真气 (登录)
                  </button>
                  <div class="flex flex-col sm:flex-row gap-4 pt-2">
                    <button type="button" class="flex-1 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-600/50 text-cyan-100/90 tracking-wider transition-all hover:border-cyan-500/30">
                      凝练新命牌 (注册)
                    </button>
                    <button type="button" class="flex-1 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-600/50 text-cyan-100/90 tracking-wider transition-all hover:border-cyan-500/30">
                      神游太虚 (游客)
                    </button>
                  </div>
                </div>
              </form>
              
              <!-- 装饰性阵法背景 -->
              <div class="absolute -bottom-24 -right-24 w-64 h-64 bg-cyan-600/5 rounded-full blur-3xl pointer-events-none"></div>
            </div>

            <!-- 右侧：修炼境界路线图 -->
            <div class="hidden lg:block lg:col-span-7 pl-12">
              <div class="bg-slate-900/40 backdrop-blur-md rounded-3xl p-10 border border-slate-800/80">
                <h3 class="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-300 mb-10 tracking-widest flex items-center">
                  <span class="w-8 h-px bg-cyan-500/50 mr-4"></span>
                  修仙境界录
                  <span class="w-8 h-px bg-cyan-500/50 ml-4"></span>
                </h3>
                
                <div class="relative space-y-8 before:absolute before:inset-0 before:ml-6 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-cyan-900 before:via-slate-700 before:to-transparent">
                  
                  <!-- 炼气期 -->
                  <div class="relative flex items-center group">
                    <div class="flex items-center justify-center w-12 h-12 rounded-full border-2 border-cyan-500 bg-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.6)] text-cyan-400 z-10 shrink-0 font-bold font-serif text-lg transition-transform group-hover:scale-110">
                      壹
                    </div>
                    <div class="ml-8 p-5 rounded-2xl bg-slate-800/30 backdrop-blur-sm border border-cyan-900/50 group-hover:border-cyan-500/50 group-hover:bg-slate-800/50 transition-all flex-1 shadow-lg">
                      <div class="flex items-center justify-between mb-2">
                        <span class="font-bold text-xl text-cyan-50 tracking-wider">炼气期</span>
                        <span class="px-3 py-1 rounded-full bg-cyan-950 border border-cyan-800 text-xs text-cyan-300 font-mono tracking-wider">100 词</span>
                      </div>
                      <p class="text-slate-400 leading-relaxed text-sm">初窥门径，引气入体。掌握基础日常词汇，凝结第一缕英语真气，方能踏上漫漫修仙路。</p>
                    </div>
                  </div>

                  <!-- 筑基期 -->
                  <div class="relative flex items-center group">
                    <div class="flex items-center justify-center w-12 h-12 rounded-full border-2 border-slate-700 bg-slate-950 text-slate-500 z-10 shrink-0 font-bold font-serif text-lg group-hover:border-blue-500 group-hover:text-blue-400 group-hover:shadow-[0_0_15px_rgba(59,130,246,0.4)] transition-all">
                      贰
                    </div>
                    <div class="ml-8 p-5 rounded-2xl bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 group-hover:border-blue-500/50 group-hover:bg-slate-800/50 transition-all flex-1">
                      <div class="flex items-center justify-between mb-2">
                        <span class="font-bold text-xl text-slate-300 group-hover:text-blue-100 transition-colors tracking-wider">筑基期</span>
                        <span class="px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-xs text-slate-400 group-hover:text-blue-300 group-hover:border-blue-800 transition-colors font-mono tracking-wider">500 词</span>
                      </div>
                      <p class="text-slate-500 group-hover:text-slate-400 leading-relaxed text-sm transition-colors">百日筑基，洗髓易筋。核心高频词汇融会贯通，基础语基初成，可施展初级法术阅读短文。</p>
                    </div>
                  </div>

                  <!-- 金丹期 -->
                  <div class="relative flex items-center group">
                    <div class="flex items-center justify-center w-12 h-12 rounded-full border-2 border-slate-700 bg-slate-950 text-slate-500 z-10 shrink-0 font-bold font-serif text-lg group-hover:border-yellow-600 group-hover:text-yellow-500 group-hover:shadow-[0_0_15px_rgba(202,138,4,0.4)] transition-all">
                      叁
                    </div>
                    <div class="ml-8 p-5 rounded-2xl bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 group-hover:border-yellow-600/50 group-hover:bg-slate-800/50 transition-all flex-1">
                      <div class="flex items-center justify-between mb-2">
                        <span class="font-bold text-xl text-slate-300 group-hover:text-yellow-100 transition-colors tracking-wider">金丹期</span>
                        <span class="px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-xs text-slate-400 group-hover:text-yellow-400 group-hover:border-yellow-800 transition-colors font-mono tracking-wider">2000 词</span>
                      </div>
                      <p class="text-slate-500 group-hover:text-slate-400 leading-relaxed text-sm transition-colors">结丹破境，神识大增。进阶英语词汇运用自如，一粒金丹吞入腹，长篇大论不在话下。</p>
                    </div>
                  </div>

                  <!-- 元婴期 -->
                  <div class="relative flex items-center group">
                    <div class="flex items-center justify-center w-12 h-12 rounded-full border-2 border-slate-700 bg-slate-950 text-slate-500 z-10 shrink-0 font-bold font-serif text-lg group-hover:border-purple-500 group-hover:text-purple-400 group-hover:shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all">
                      肆
                    </div>
                    <div class="ml-8 p-5 rounded-2xl bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 group-hover:border-purple-500/50 group-hover:bg-slate-800/50 transition-all flex-1">
                      <div class="flex items-center justify-between mb-2">
                        <span class="font-bold text-xl text-slate-300 group-hover:text-purple-100 transition-colors tracking-wider">元婴期</span>
                        <span class="px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-xs text-slate-400 group-hover:text-purple-300 group-hover:border-purple-800 transition-colors font-mono tracking-wider">5000 词</span>
                      </div>
                      <p class="text-slate-500 group-hover:text-slate-400 leading-relaxed text-sm transition-colors">元神出窍，遨游外网天地。海量专业词汇信手拈来，与海外大能斗法交流游刃有余。</p>
                    </div>
                  </div>
                  
                </div>
              </div>
            </div>

          </div>
        </transition>
      </main>

      <!-- 底部统计与链接 -->
      <footer class="w-full relative z-30 border-t border-slate-800/60 bg-slate-950/80 backdrop-blur-md">
        <div class="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between text-slate-400 text-sm">
          
          <div class="flex items-center space-x-6 md:space-x-10 mb-4 md:mb-0">
            <div class="flex flex-col">
              <span class="text-xs text-slate-500 uppercase tracking-wider mb-1">今日修仙者</span>
              <span class="text-cyan-400 font-mono font-bold text-base flex items-center">
                <span class="w-2 h-2 rounded-full bg-cyan-400 mr-2 animate-pulse"></span>
                12,345
              </span>
            </div>
            <div class="w-px h-10 bg-slate-800"></div>
            <div class="flex flex-col">
              <span class="text-xs text-slate-500 uppercase tracking-wider mb-1">全服累计斩获单词</span>
              <span class="text-blue-400 font-mono font-bold text-base">8,765,432</span>
            </div>
          </div>
          
          <div class="flex items-center space-x-8">
            <a href="#" class="flex items-center hover:text-cyan-400 transition-colors group">
              <svg class="w-5 h-5 mr-2 opacity-70 group-hover:opacity-100" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd" /></svg>
              GitHub 开源
            </a>
            <a href="#" class="hover:text-cyan-400 transition-colors">联系作者</a>
            <span class="text-slate-600 font-mono text-xs border border-slate-800 px-2 py-1 rounded">v1.0.0</span>
          </div>
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const showLogin = ref(false);
const username = ref('');
const password = ref('');

const handleLogin = () => {
  console.log('Login attempt:', username.value, password.value);
  // Implement login/redirect logic here
};
</script>

<style scoped>
@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}

.animate-fade-in-up {
  animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 星空/灵气漂浮背景特效 */
.stars-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: 
    radial-gradient(2px 2px at 20px 30px, #a5f3fc, rgba(0,0,0,0)),
    radial-gradient(2px 2px at 40px 70px, #fff, rgba(0,0,0,0)),
    radial-gradient(3px 3px at 50px 160px, #e0f2fe, rgba(0,0,0,0)),
    radial-gradient(2px 2px at 90px 40px, #fff, rgba(0,0,0,0)),
    radial-gradient(2px 2px at 130px 80px, #bae6fd, rgba(0,0,0,0)),
    radial-gradient(3px 3px at 160px 120px, #fff, rgba(0,0,0,0));
  background-repeat: repeat;
  background-size: 250px 250px;
  animation: stars-drift 120s linear infinite;
  opacity: 0.4;
}

@keyframes stars-drift {
  from { background-position: 0 0; }
  to { background-position: -10000px 5000px; }
}

.logo-text {
  font-family: 'STXingkai', 'KaiTi', 'SimSun', serif; /* 国风字体回退 */
}

/* Vue 过渡动画 */
.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-scale-enter-from {
  opacity: 0;
  transform: scale(0.95) translateY(20px);
}
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(1.05) translateY(-20px);
}
</style>
