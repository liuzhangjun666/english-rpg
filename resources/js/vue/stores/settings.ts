import { defineStore } from 'pinia'

function readBool(key: string, def: boolean): boolean {
  try {
    const v = localStorage.getItem(key)
    return v === null ? def : v === '1'
  } catch { return def }
}

function readInt(key: string, def: number): number {
  try {
    const v = localStorage.getItem(key)
    if (!v) return def
    const n = parseInt(v, 10)
    return isNaN(n) ? def : Math.max(0, Math.min(100, n))
  } catch { return def }
}

function save(key: string, val: string) {
  try { localStorage.setItem(key, val) } catch { /* ignore */ }
}

// Migrate legacy 'settings_sound' key
function migrateLegacy() {
  try {
    const old = localStorage.getItem('settings_sound')
    if (old === '0') {
      if (!localStorage.getItem('settings_bgm_enabled'))  save('settings_bgm_enabled', '0')
      if (!localStorage.getItem('settings_sfx_enabled'))  save('settings_sfx_enabled', '0')
    }
  } catch { /* ignore */ }
}
migrateLegacy()

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    bgmEnabled:       readBool('settings_bgm_enabled',  true),
    bgmVolume:        readInt ('settings_bgm_volume',   15),   // 0-100; maps to Howl 0-1
    sfxEnabled:       readBool('settings_sfx_enabled',  true),
    sfxVolume:        readInt ('settings_sfx_volume',   100),  // 0-100 multiplier on base volumes
    hapticEnabled:    readBool('settings_haptic',       false),
    particlesEnabled: readBool('settings_particles',    true),
  }),
  actions: {
    setBgmEnabled(v: boolean)       { this.bgmEnabled = v;       save('settings_bgm_enabled',  v ? '1' : '0') },
    setBgmVolume(v: number)         { this.bgmVolume = v;        save('settings_bgm_volume',   String(v))     },
    setSfxEnabled(v: boolean)       { this.sfxEnabled = v;       save('settings_sfx_enabled',  v ? '1' : '0') },
    setSfxVolume(v: number)         { this.sfxVolume = v;        save('settings_sfx_volume',   String(v))     },
    setHapticEnabled(v: boolean)    { this.hapticEnabled = v;    save('settings_haptic',       v ? '1' : '0') },
    setParticlesEnabled(v: boolean) { this.particlesEnabled = v; save('settings_particles',    v ? '1' : '0') },
  },
})
