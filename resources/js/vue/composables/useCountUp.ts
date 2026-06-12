import { ref, watch } from 'vue'

export function useCountUp(getValue: () => number, duration = 600) {
  const display = ref(getValue())

  watch(getValue, (newVal, oldVal) => {
    const diff = newVal - oldVal
    const start = Date.now()
    const tick = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      display.value = Math.round(oldVal + diff * eased)
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })

  return display
}
