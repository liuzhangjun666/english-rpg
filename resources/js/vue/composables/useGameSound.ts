import { Howl } from 'howler'

const SFX: Record<string, Howl> = {
  correct: new Howl({ src: ['/sounds/correct.mp3'], volume: 0.6 }),
  wrong:   new Howl({ src: ['/sounds/wrong.mp3'],   volume: 0.5 }),
  combo:   new Howl({ src: ['/sounds/combo.mp3'],   volume: 0.8 }),
  levelup: new Howl({ src: ['/sounds/levelup.mp3'], volume: 0.9 }),
  click:   new Howl({ src: ['/sounds/click.mp3'],   volume: 0.3 }),
  bgm:     new Howl({ src: ['/sounds/bgm_hall.mp3'], loop: true, volume: 0.15 }),
}

function readMutedFromStorage(): boolean {
  try {
    return localStorage.getItem('settings_sound') === '0'
  } catch {
    return false
  }
}

let muted = readMutedFromStorage()

export function initGameSoundSettings() {
  muted = readMutedFromStorage()
  if (muted) {
    SFX.bgm.pause()
  }
}

export function useGameSound() {
  return {
    correct: () => !muted && SFX.correct.play(),
    wrong:   () => !muted && SFX.wrong.play(),
    combo:   (n: number) => !muted && n >= 3 && SFX.combo.play(),
    levelup: () => !muted && SFX.levelup.play(),
    click:   () => !muted && SFX.click.play(),
    startBgm: () => {
      if (!muted && !SFX.bgm.playing()) SFX.bgm.play()
    },
    stopBgm: () => SFX.bgm.stop(),
    setMuted: (value: boolean) => {
      muted = value
      try {
        localStorage.setItem('settings_sound', value ? '0' : '1')
      } catch { /* ignore */ }
      if (muted) SFX.bgm.pause()
      else if (!SFX.bgm.playing()) SFX.bgm.play()
    },
    toggleMute: () => {
      muted = !muted
      try {
        localStorage.setItem('settings_sound', muted ? '0' : '1')
      } catch { /* ignore */ }
      if (muted) SFX.bgm.pause()
      else if (!SFX.bgm.playing()) SFX.bgm.play()
      return muted
    },
    isMuted: () => muted,
  }
}
