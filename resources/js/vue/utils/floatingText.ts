import { gsap } from 'gsap'

export function spawnFloatingText(
  text: string,
  color: 'gold' | 'red' | 'green' | 'blue' = 'gold',
  originEl?: HTMLElement | null,
) {
  const el = document.createElement('div')
  el.textContent = text
  el.className = `floating-text floating-text--${color}`

  if (originEl) {
    const rect = originEl.getBoundingClientRect()
    el.style.left = rect.left + rect.width / 2 + 'px'
    el.style.top  = rect.top + 'px'
  }

  document.body.appendChild(el)

  gsap.fromTo(
    el,
    { y: 0, opacity: 1, scale: 1 },
    {
      y: -80,
      opacity: 0,
      scale: 1.3,
      duration: 1.2,
      ease: 'power2.out',
      onComplete: () => el.remove(),
    },
  )
}
