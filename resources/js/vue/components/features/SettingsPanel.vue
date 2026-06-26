<template>
  <Teleport to="body">
    <transition name="settings-fade">
      <div v-if="visible" class="settings-overlay" @click.self="close">
        <div class="settings-panel">

          <!-- Header -->
          <div class="panel-header">
            <div class="header-ornament left"></div>
            <span class="panel-title">修炼设置</span>
            <div class="header-ornament right"></div>
            <button class="close-btn" @click="close" title="关闭">✕</button>
          </div>

          <div class="panel-body">

            <!-- ── 听觉灵境 ── -->
            <div class="section">
              <div class="section-label">
                <span class="section-icon">🎵</span>
                <span>听觉灵境</span>
              </div>

              <div class="setting-row">
                <div class="row-info">
                  <span class="row-name">背景仙音</span>
                  <span class="row-desc">宗门氛围背景音乐</span>
                </div>
                <el-switch v-model="bgmEnabled" @change="onBgmToggle" class="cult-switch" />
              </div>

              <div class="setting-row sub-row" :class="{ disabled: !bgmEnabled }">
                <span class="row-name vol-label">音量</span>
                <div class="slider-wrap">
                  <span class="vol-icon">🔈</span>
                  <el-slider
                    v-model="bgmVolume"
                    :disabled="!bgmEnabled"
                    :min="0" :max="100" :step="1"
                    class="cult-slider"
                    @change="onBgmVolume"
                  />
                  <span class="vol-value">{{ bgmVolume }}%</span>
                </div>
              </div>

              <div class="setting-row">
                <div class="row-info">
                  <span class="row-name">答题音效</span>
                  <span class="row-desc">正确、错误、连击等反馈音</span>
                </div>
                <el-switch v-model="sfxEnabled" @change="onSfxToggle" class="cult-switch" />
              </div>

              <div class="setting-row sub-row" :class="{ disabled: !sfxEnabled }">
                <span class="row-name vol-label">音量</span>
                <div class="slider-wrap">
                  <span class="vol-icon">🔉</span>
                  <el-slider
                    v-model="sfxVolume"
                    :disabled="!sfxEnabled"
                    :min="0" :max="100" :step="1"
                    class="cult-slider"
                    @change="onSfxVolume"
                  />
                  <span class="vol-value">{{ sfxVolume }}%</span>
                </div>
              </div>
            </div>

            <!-- ── 修炼体验 ── -->
            <div class="section">
              <div class="section-label">
                <span class="section-icon">✨</span>
                <span>修炼体验</span>
              </div>

              <div class="setting-row">
                <div class="row-info">
                  <span class="row-name">震动反馈</span>
                  <span class="row-desc">移动设备答题震动提示</span>
                </div>
                <el-switch v-model="hapticEnabled" @change="onHapticToggle" class="cult-switch" />
              </div>

              <div class="setting-row">
                <div class="row-info">
                  <span class="row-name">粒子特效</span>
                  <span class="row-desc">灵脉流光、云气缭绕等动效</span>
                </div>
                <el-switch v-model="particlesEnabled" @change="onParticlesToggle" class="cult-switch" />
              </div>
            </div>

            <!-- ── 道侣中枢 ── -->
            <div class="section">
              <div class="section-label">
                <span class="section-icon">👤</span>
                <span>道侣中枢</span>
              </div>

              <div class="setting-row">
                <span class="row-name">当前道号</span>
                <span class="nickname">{{ profile?.nickname || '匿名前辈' }}</span>
              </div>

              <div class="setting-row">
                <span class="row-name">修为境界</span>
                <span class="realm-badge">{{ profile?.current_realm || '初入仙途' }}</span>
              </div>
            </div>

            <!-- Actions -->
            <div class="actions">
              <button class="action-btn secondary" @click="openParent">
                <span>📜</span>
                <span>护道人札记</span>
              </button>
              <button class="action-btn danger" @click="logout">
                <span>🚪</span>
                <span>退出宗门</span>
              </button>
            </div>

          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useUserStore } from '../../stores/user'
import { useSettingsStore } from '../../stores/settings'
import { useGameSound } from '../../composables/useGameSound'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
  (e: 'open-parent'): void
}>()

const user = useUserStore()
const settings = useSettingsStore()
const sound = useGameSound()
const profile = computed(() => user.profile)

// Local reactive copies of settings (sync from store when panel opens)
const bgmEnabled       = ref(settings.bgmEnabled)
const bgmVolume        = ref(settings.bgmVolume)
const sfxEnabled       = ref(settings.sfxEnabled)
const sfxVolume        = ref(settings.sfxVolume)
const hapticEnabled    = ref(settings.hapticEnabled)
const particlesEnabled = ref(settings.particlesEnabled)

watch(() => props.visible, (val) => {
  if (!val) return
  bgmEnabled.value       = settings.bgmEnabled
  bgmVolume.value        = settings.bgmVolume
  sfxEnabled.value       = settings.sfxEnabled
  sfxVolume.value        = settings.sfxVolume
  hapticEnabled.value    = settings.hapticEnabled
  particlesEnabled.value = settings.particlesEnabled
})

function onBgmToggle(v: boolean) {
  settings.setBgmEnabled(v)
  sound.setBgmEnabled(v)
}
function onBgmVolume(v: number) {
  settings.setBgmVolume(v)
  sound.setBgmVolume(v)
}
function onSfxToggle(v: boolean) {
  settings.setSfxEnabled(v)
  sound.setSfxEnabled(v)
}
function onSfxVolume(v: number) {
  settings.setSfxVolume(v)
  sound.setSfxVolume(v)
}
function onHapticToggle(v: boolean) {
  settings.setHapticEnabled(v)
}
function onParticlesToggle(v: boolean) {
  settings.setParticlesEnabled(v)
}

function openParent() {
  close()
  emit('open-parent')
}
function logout() {
  close()
  window.dispatchEvent(new CustomEvent('auth:logout'))
}
function close() {
  emit('update:visible', false)
}
</script>

<style scoped>
.settings-overlay {
  position: fixed;
  inset: 0;
  z-index: 2200;
  background: rgba(6, 8, 20, 0.88);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}

.settings-panel {
  width: min(480px, 94vw);
  background: linear-gradient(160deg, #0f1528 0%, #131a35 60%, #0e1220 100%);
  border: 1px solid rgba(200, 169, 106, 0.55);
  border-radius: 10px;
  box-shadow:
    0 0 0 1px rgba(255, 215, 0, 0.08),
    0 8px 40px rgba(0, 0, 0, 0.8),
    inset 0 1px 0 rgba(255, 215, 0, 0.12);
  max-height: 88vh;
  display: flex;
  flex-direction: column;
}

/* Header */
.panel-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px 48px 16px;
  border-bottom: 1px solid rgba(200, 169, 106, 0.25);
  flex-shrink: 0;
}
.panel-title {
  color: #d4a843;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 3px;
  text-shadow: 0 0 12px rgba(212, 168, 67, 0.5);
}
.header-ornament {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 36px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(212, 168, 67, 0.6));
}
.header-ornament.left  { right: calc(50% + 60px); background: linear-gradient(270deg, transparent, rgba(212, 168, 67, 0.6)); }
.header-ornament.right { left:  calc(50% + 60px); }
.close-btn {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: 1px solid rgba(200, 169, 106, 0.35);
  color: rgba(200, 169, 106, 0.7);
  width: 28px;
  height: 28px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.close-btn:hover {
  border-color: #d4a843;
  color: #d4a843;
  background: rgba(212, 168, 67, 0.1);
}

/* Body */
.panel-body {
  padding: 0 20px 20px;
  overflow-y: auto;
  overflow-x: hidden;
}
.panel-body::-webkit-scrollbar { width: 4px; }
.panel-body::-webkit-scrollbar-track { background: transparent; }
.panel-body::-webkit-scrollbar-thumb { background: rgba(212, 168, 67, 0.3); border-radius: 2px; }

/* Section */
.section {
  margin-top: 18px;
}
.section-label {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #c8a96a;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 2px;
  margin-bottom: 4px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(200, 169, 106, 0.2);
}
.section-icon { font-size: 14px; }

/* Row */
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 11px 2px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  color: #d9cbb0;
  transition: opacity 0.2s;
}
.setting-row.sub-row {
  padding: 8px 2px 10px 12px;
  border-bottom-style: dashed;
  border-bottom-color: rgba(255, 255, 255, 0.06);
}
.setting-row.disabled {
  opacity: 0.4;
  pointer-events: none;
}
.row-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.row-name {
  font-size: 14px;
  color: #e8dcc8;
}
.row-desc {
  font-size: 11px;
  color: rgba(200, 169, 106, 0.6);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.vol-label {
  font-size: 12px;
  color: rgba(200, 169, 106, 0.7);
  flex-shrink: 0;
  min-width: 28px;
}

/* Volume slider row */
.slider-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}
.vol-icon { font-size: 16px; flex-shrink: 0; }
.vol-value {
  font-size: 12px;
  color: #c8a96a;
  min-width: 36px;
  text-align: right;
  font-family: monospace;
}

/* Nickname / realm */
.nickname {
  color: #ffd700;
  font-size: 14px;
  font-weight: 600;
  text-shadow: 0 0 6px rgba(255, 215, 0, 0.4);
}
.realm-badge {
  background: linear-gradient(135deg, rgba(200, 169, 106, 0.25), rgba(80, 60, 30, 0.5));
  border: 1px solid rgba(255, 215, 0, 0.4);
  border-radius: 3px;
  padding: 2px 10px;
  color: #fff6d5;
  font-size: 12px;
  font-weight: bold;
  letter-spacing: 1px;
}

/* Actions */
.actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 22px;
  padding-top: 16px;
  border-top: 1px solid rgba(200, 169, 106, 0.15);
}
.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  border: 1px solid;
  transition: all 0.15s;
}
.action-btn.secondary {
  background: rgba(200, 169, 106, 0.1);
  border-color: rgba(200, 169, 106, 0.4);
  color: #c8a96a;
}
.action-btn.secondary:hover {
  background: rgba(200, 169, 106, 0.2);
  border-color: #c8a96a;
  color: #ffd700;
}
.action-btn.danger {
  background: rgba(180, 40, 40, 0.12);
  border-color: rgba(220, 80, 80, 0.4);
  color: #e08080;
}
.action-btn.danger:hover {
  background: rgba(200, 50, 50, 0.22);
  border-color: #e05555;
  color: #ff9090;
}

/* Transition */
.settings-fade-enter-active,
.settings-fade-leave-active { transition: opacity 0.22s, transform 0.22s; }
.settings-fade-enter-from,
.settings-fade-leave-to    { opacity: 0; transform: scale(0.96); }
</style>

<!-- Global: style the Element Plus switch and slider to match the theme -->
<style>
.cult-switch .el-switch__core {
  background: rgba(255,255,255,0.12) !important;
  border-color: rgba(200,169,106,0.3) !important;
}
.cult-switch.is-checked .el-switch__core {
  background: linear-gradient(90deg, #8a6a20, #c8a843) !important;
  border-color: #c8a843 !important;
}

.cult-slider .el-slider__runway {
  background: rgba(255,255,255,0.08) !important;
  height: 4px !important;
}
.cult-slider .el-slider__bar {
  background: linear-gradient(90deg, #8a6a20, #d4a843) !important;
  height: 4px !important;
}
.cult-slider .el-slider__button {
  border-color: #d4a843 !important;
  background: #1a1a30 !important;
  width: 14px !important;
  height: 14px !important;
}
.cult-slider .el-slider__button-wrapper { top: -12px !important; }
</style>
