import { Howl } from 'howler'

// Relative mixing levels — preserved regardless of master volume
const SFX_BASE: Record<string, number> = {
  correct: 0.6,
  wrong:   0.5,
  combo:   0.8,
  levelup: 0.9,
  click:   0.3,
}
const BGM_BASE = 0.15  // what 100% bgmVolume maps to

const SFX: Record<string, Howl> = {
  correct: new Howl({ src: ['/sounds/correct.mp3'], volume: SFX_BASE.correct }),
  wrong:   new Howl({ src: ['/sounds/wrong.mp3'],   volume: SFX_BASE.wrong   }),
  combo:   new Howl({ src: ['/sounds/combo.mp3'],   volume: SFX_BASE.combo   }),
  levelup: new Howl({ src: ['/sounds/levelup.mp3'], volume: SFX_BASE.levelup }),
  click:   new Howl({ src: ['/sounds/click.mp3'],   volume: SFX_BASE.click   }),
  bgm:     new Howl({ src: ['/sounds/bgm_hall.mp3'], loop: true, volume: BGM_BASE }),
}

// Module-level state (synced with settings store on init and on each set call)
let bgmEnabled = true
let bgmVolume  = 15    // 0-100
let sfxEnabled = true
let sfxVolume  = 100   // 0-100

function applySfxVolume() {
  const mult = sfxVolume / 100
  for (const [key, base] of Object.entries(SFX_BASE)) {
    SFX[key].volume(base * mult)
  }
}

function applyBgmVolume() {
  SFX.bgm.volume((bgmVolume / 100) * BGM_BASE)
}

export function initGameSoundSettings() {
  try {
    bgmEnabled = localStorage.getItem('settings_bgm_enabled') !== '0'
    sfxEnabled = localStorage.getItem('settings_sfx_enabled') !== '0'
    const bv = parseInt(localStorage.getItem('settings_bgm_volume') ?? '15', 10)
    const sv = parseInt(localStorage.getItem('settings_sfx_volume') ?? '100', 10)
    bgmVolume = isNaN(bv) ? 15  : Math.max(0, Math.min(100, bv))
    sfxVolume = isNaN(sv) ? 100 : Math.max(0, Math.min(100, sv))
  } catch { /* ignore — use defaults */ }

  applySfxVolume()
  applyBgmVolume()
  if (!bgmEnabled) SFX.bgm.pause()
}

export function useGameSound() {
  return {
    // ── Playback ─────────────────────────────────────────────────
    correct: () => sfxEnabled && SFX.correct.play(),
    wrong:   () => sfxEnabled && SFX.wrong.play(),
    combo:   (n: number) => sfxEnabled && n >= 3 && SFX.combo.play(),
    levelup: () => sfxEnabled && SFX.levelup.play(),
    click:   () => sfxEnabled && SFX.click.play(),
    startBgm: () => {
      if (bgmEnabled && !SFX.bgm.playing()) SFX.bgm.play()
    },
    stopBgm: () => SFX.bgm.stop(),

    // ── BGM ──────────────────────────────────────────────────────
    getBgmEnabled: () => bgmEnabled,
    setBgmEnabled: (v: boolean) => {
      bgmEnabled = v
      try { localStorage.setItem('settings_bgm_enabled', v ? '1' : '0') } catch {}
      if (bgmEnabled && !SFX.bgm.playing()) SFX.bgm.play()
      else if (!bgmEnabled) SFX.bgm.pause()
    },
    getBgmVolume: () => bgmVolume,
    setBgmVolume: (v: number) => {
      bgmVolume = Math.max(0, Math.min(100, v))
      try { localStorage.setItem('settings_bgm_volume', String(bgmVolume)) } catch {}
      applyBgmVolume()
    },

    // ── SFX ──────────────────────────────────────────────────────
    getSfxEnabled: () => sfxEnabled,
    setSfxEnabled: (v: boolean) => {
      sfxEnabled = v
      try { localStorage.setItem('settings_sfx_enabled', v ? '1' : '0') } catch {}
    },
    getSfxVolume: () => sfxVolume,
    setSfxVolume: (v: number) => {
      sfxVolume = Math.max(0, Math.min(100, v))
      try { localStorage.setItem('settings_sfx_volume', String(sfxVolume)) } catch {}
      applySfxVolume()
    },

    // ── Legacy shims (used by existing callers) ───────────────────
    isMuted: () => !sfxEnabled && !bgmEnabled,
    setMuted: (value: boolean) => {
      bgmEnabled = !value
      sfxEnabled = !value
      try {
        localStorage.setItem('settings_bgm_enabled', value ? '0' : '1')
        localStorage.setItem('settings_sfx_enabled', value ? '0' : '1')
      } catch {}
      if (bgmEnabled && !SFX.bgm.playing()) SFX.bgm.play()
      else if (!bgmEnabled) SFX.bgm.pause()
    },
    toggleMute: () => {
      const nowMuted = bgmEnabled || sfxEnabled  // toggle to muted
      bgmEnabled = !nowMuted
      sfxEnabled = !nowMuted
      try {
        localStorage.setItem('settings_bgm_enabled', nowMuted ? '0' : '1')
        localStorage.setItem('settings_sfx_enabled', nowMuted ? '0' : '1')
      } catch {}
      if (bgmEnabled && !SFX.bgm.playing()) SFX.bgm.play()
      else if (!bgmEnabled) SFX.bgm.pause()
      return nowMuted
    },
  }
}
