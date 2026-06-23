<template>
  <Teleport to="body">
    <transition name="fade">
      <div v-if="visible" class="heart-demon-overlay" @click.self="closePanel">
        <div class="heart-demon-container">
          <!-- 顶部统计区 -->
          <div class="hd-header">
            <div class="hd-title">
              <span class="title-text">心魔回廊</span>
              <span class="title-sub">你的神识深处，蛰伏着 {{ totalDemons }} 道魔念</span>
            </div>
            <div class="hd-stats">
              <div class="stat-block">
                <div class="stat-val">{{ sealedCount }}</div>
                <div class="stat-label">已封印</div>
              </div>
              <div class="stat-block">
                <div class="stat-val text-red-400">{{ activeDemons.length }}</div>
                <div class="stat-label">蛰伏中</div>
              </div>
            </div>
            <button class="hd-close-btn" @click="closePanel">返回现世</button>
          </div>

          <!-- 内容区 -->
          <div class="hd-body">
            <div v-if="loading" class="hd-loading">探查识海中...</div>
            <div v-else-if="!allDemons.length" class="hd-empty">
              你的识海清明，暂无心魔侵扰。
            </div>
            <template v-else>
              <!-- Boss 区 (本命心魔) -->
              <div class="hd-section" v-if="bossDemons.length">
                <div class="section-title text-red-500">本命心魔 (劫难)</div>
                <div class="boss-grid">
                  <div 
                    v-for="demon in bossDemons" 
                    :key="demon.id" 
                    class="demon-card boss-card"
                    :class="demon.auraClass"
                    @click="openDetail(demon)"
                  >
                    <div class="card-glow"></div>
                    <div class="demon-realm">{{ demon.realm.name }}</div>
                    <div class="demon-title">{{ demon.title }}</div>
                    <div class="demon-meta">
                      <span class="meta-item">魔念 {{ demon.wrongCount }} 层</span>
                      <span class="meta-item">封印 {{ demon.sealProgress }}%</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 普通心魔区 -->
              <div class="hd-section" v-if="normalDemons.length">
                <div class="section-title text-gray-400">散逸魔念</div>
                <div class="normal-grid">
                  <div 
                    v-for="demon in normalDemons" 
                    :key="demon.id" 
                    class="demon-card normal-card"
                    :class="demon.auraClass"
                    @click="openDetail(demon)"
                  >
                    <div class="demon-realm">{{ demon.realm.name }}</div>
                    <div class="demon-title">{{ demon.title }}</div>
                    <div class="demon-progress-bar">
                      <div class="progress-fill" :style="{ width: demon.sealProgress + '%' }"></div>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <div class="hd-footer" v-if="allDemons.length">
             <button class="rpg-btn" @click="clearMastered">清理已彻底超度的心魔</button>
          </div>

          <!-- 详情弹层 (引魔入体) -->
          <transition name="pop">
            <div v-if="selectedDemon" class="demon-detail-overlay" @click.self="selectedDemon = null">
              <div class="demon-detail-box" :class="selectedDemon.auraClass">
                <div class="detail-header">
                  <span class="detail-realm">{{ selectedDemon.realm.name }}</span>
                  <button class="detail-close" @click="selectedDemon = null">×</button>
                </div>
                <div class="detail-body">
                  <h3 class="detail-title">{{ selectedDemon.title }}</h3>
                  <div class="detail-story">
                    此魔曾使你堕入歧途 <span class="text-red-400 font-bold">{{ selectedDemon.wrongCount }}</span> 次。<br>
                    当前封印进度：<span class="text-green-400 font-bold">{{ selectedDemon.sealProgress }}%</span>。<br>
                    若能将其斩落，你的道心必将更进一层。
                  </div>
                </div>
                <div class="detail-actions">
                  <button class="rpg-btn-slay" @click="startEncounter(selectedDemon)">引魔入体</button>
                </div>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { useApiClient } from '../../services/api';
import { useDemonStore } from '../../stores/demon';
import { useUiStore } from '../../stores/ui';
import { DemonViewModel } from '../../models/DemonViewModel';

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{ (e: 'update:visible', value: boolean): void }>();

const api = useApiClient();
const ui = useUiStore();
const demonStore = useDemonStore();

const allDemons = ref<DemonViewModel[]>([]);
const loading = ref(false);
const selectedDemon = ref<DemonViewModel | null>(null);

const activeDemons = computed(() => allDemons.value.filter(d => d.sealProgress < 100));
const bossDemons = computed(() => activeDemons.value.filter(d => d.isBoss));
const normalDemons = computed(() => activeDemons.value.filter(d => !d.isBoss));
const sealedCount = computed(() => allDemons.value.filter(d => d.sealProgress >= 100).length); // 后端可能有 is_mastered
const totalDemons = computed(() => allDemons.value.length);

watch(() => props.visible, async (val) => {
  if (val) {
    selectedDemon.value = null;
    await loadDemons();
  }
});

async function loadDemons() {
  loading.value = true;
  try {
    const res = await api.get('/demons');
    if (!res?.success) {
      ElMessage.error(res?.message || '无法感应心魔');
      return;
    }
    const rawList = Array.isArray(res.data?.demons) ? res.data.demons : [];
    allDemons.value = rawList.map((raw: any) => new DemonViewModel(raw));
  } catch (err) {
    ElMessage.error('心魔录被瘴气遮蔽');
  } finally {
    loading.value = false;
  }
}

function closePanel() {
  emit('update:visible', false);
}

function openDetail(demon: DemonViewModel) {
  selectedDemon.value = demon;
}

async function startEncounter(demon: DemonViewModel) {
  if (!demon.rawData) return;
  // 关闭详情弹窗和主面板
  selectedDemon.value = null;
  emit('update:visible', false);
  
  // 构建挑战队列 (这里只挑战选中的单只心魔)
  const questionPayload = { ...demon.rawData.question };
  questionPayload._is_demon = true;
  questionPayload._demon_wrong_count = demon.wrongCount;
  questionPayload._demon_mastery = demon.sealProgress;
  
  // 调用全局战斗组件
  const result = await demonStore.triggerEncounter([{
    question: questionPayload,
    demon: demon.rawData.demon
  }], {
    type: 'manual',
    theme: demon.isBoss ? 'boss' : 'red',
    title: demon.isBoss ? '本命心魔' : '引魔入体',
    subtitle: demon.title
  });
  
  // 战斗结束后重新拉取
  await loadDemons();
  // 重新选择的逻辑可以在以后优化，这里简单关闭面板
  selectedDemon.value = null;
  // 但为了体验，先关掉面板进入全屏遭遇战更沉浸。
}

async function clearMastered() {
  ui.showLoading('净化中...');
  try {
    await api.post('/demons/clear');
    await loadDemons();
  } catch {
    ElMessage.error('清理失败');
  } finally {
    ui.hideLoading();
  }
}
</script>

<style scoped>
.heart-demon-overlay {
  position: fixed;
  inset: 0;
  background: rgba(5, 5, 10, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(8px);
  font-family: 'Ma Shan Zheng', 'STXingkai', 'KaiTi', serif;
}

.heart-demon-container {
  width: 90%;
  max-width: 900px;
  height: 85vh;
  background: #0f1219;
  border: 1px solid #3f3f46;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 0 50px rgba(0,0,0,0.8), inset 0 0 20px rgba(153, 27, 27, 0.1);
}

.hd-header {
  padding: 24px 30px;
  border-bottom: 1px solid #27272a;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(0,0,0,0.3);
}

.hd-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.title-text { font-size: 28px; color: #fca5a5; font-weight: bold; text-shadow: 0 0 10px rgba(239, 68, 68, 0.4); }
.title-sub { font-size: 14px; color: #71717a; }

.hd-stats {
  display: flex;
  gap: 30px;
}

.stat-block {
  text-align: center;
}
.stat-val { font-size: 24px; color: #e4e4e7; font-family: monospace; font-weight: bold; }
.stat-label { font-size: 12px; color: #71717a; }

.hd-close-btn {
  background: rgba(255,255,255,0.05);
  border: 1px solid #3f3f46;
  color: #a1a1aa;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}
.hd-close-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }

.hd-body {
  flex: 1;
  overflow-y: auto;
  padding: 30px;
}
.hd-body::-webkit-scrollbar { width: 6px; }
.hd-body::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 3px; }

.hd-empty, .hd-loading {
  text-align: center;
  color: #71717a;
  padding: 60px 0;
  font-size: 18px;
}

.hd-section { margin-bottom: 40px; }
.section-title { font-size: 20px; font-weight: bold; margin-bottom: 16px; border-bottom: 1px solid #27272a; padding-bottom: 8px; }

.boss-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px; }
.normal-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }

.demon-card {
  background: #18181b;
  border: 1px solid #3f3f46;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  overflow: hidden;
}
.demon-card:hover { transform: translateY(-3px); box-shadow: 0 10px 20px rgba(0,0,0,0.5); }

/* 境界外观映射 */
.demon-realm-1 { border-left: 3px solid #71717a; }
.demon-realm-2 { border-left: 3px solid #fbbf24; }
.demon-realm-3 { border-left: 3px solid #ef4444; }
.demon-realm-4 { border-left: 3px solid #9333ea; }
.demon-realm-5 { border-left: 3px solid #e11d48; box-shadow: 0 0 15px rgba(225, 29, 72, 0.2); }

.boss-card {
  padding: 24px;
  background: linear-gradient(180deg, #18181b 0%, #2a0a0a 100%);
  border: 1px solid #7f1d1d;
}
.boss-card:hover { border-color: #ef4444; box-shadow: 0 0 20px rgba(239, 68, 68, 0.3); }

.demon-realm { font-size: 12px; color: #a1a1aa; margin-bottom: 4px; }
.boss-card .demon-realm { color: #fca5a5; }

.demon-title { font-size: 16px; color: #e4e4e7; margin-bottom: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.boss-card .demon-title { font-size: 20px; color: #f87171; font-weight: bold; }

.demon-meta { display: flex; justify-content: space-between; font-size: 12px; color: #a1a1aa; }

.demon-progress-bar { height: 4px; background: #27272a; border-radius: 2px; overflow: hidden; margin-top: 10px; }
.progress-fill { height: 100%; background: #10b981; }

.hd-footer {
  padding: 16px 30px;
  border-top: 1px solid #27272a;
  text-align: right;
  background: rgba(0,0,0,0.3);
}

.rpg-btn {
  background: rgba(255,255,255,0.05);
  border: 1px solid #52525b;
  color: #d4d4d8;
  padding: 8px 20px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}
.rpg-btn:hover { background: rgba(255,255,255,0.1); border-color: #a1a1aa; }

/* 详情弹层 */
.demon-detail-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}
.demon-detail-box {
  width: 400px;
  background: #18181b;
  border: 2px solid #3f3f46;
  border-radius: 8px;
  padding: 30px;
  text-align: center;
  position: relative;
  box-shadow: 0 20px 40px rgba(0,0,0,0.9);
}
.demon-detail-box.demon-realm-4 { border-color: #9333ea; box-shadow: 0 0 30px rgba(147, 51, 234, 0.3); }
.demon-detail-box.demon-realm-5 { border-color: #e11d48; box-shadow: 0 0 30px rgba(225, 29, 72, 0.4); }

.detail-header { display: flex; justify-content: space-between; margin-bottom: 20px; }
.detail-realm { color: #f87171; font-weight: bold; border: 1px solid #f87171; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
.detail-close { background: none; border: none; color: #a1a1aa; font-size: 24px; cursor: pointer; }
.detail-close:hover { color: #fff; }

.detail-title { font-size: 24px; color: #e4e4e7; margin-bottom: 20px; }
.detail-story { font-size: 16px; color: #a1a1aa; line-height: 1.8; margin-bottom: 30px; text-align: left; background: #0f1219; padding: 16px; border-radius: 4px; }

.rpg-btn-slay {
  background: rgba(153, 27, 27, 0.2);
  border: 1px solid #ef4444;
  color: #fca5a5;
  padding: 12px 30px;
  font-size: 18px;
  font-family: inherit;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.3s;
  width: 100%;
}
.rpg-btn-slay:hover { background: rgba(220, 38, 38, 0.4); box-shadow: 0 0 20px rgba(220, 38, 38, 0.5); color: #fff; transform: scale(1.02); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.pop-enter-active, .pop-leave-active { transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
.pop-enter-from, .pop-leave-to { opacity: 0; transform: scale(0.9); }
</style>
