type HsOverlayApi = {
  open: (target: Element | string | null) => void
  close: (target: Element | string | null) => void
  autoInit?: () => void
  getInstance?: (
    target: Element | string,
    asObject?: boolean
  ) => { element: { open: () => void; close: () => Promise<unknown> } } | null
}

function getHsOverlay(): HsOverlayApi | undefined {
  return (window as Window & { HSOverlay?: HsOverlayApi }).HSOverlay
}

/** Preline only opens overlays registered via data-hs-overlay triggers — autoInit + getInstance fallback. */
export function openHsOverlay(selector: string): void {
  const el = document.querySelector(selector)
  if (!el) return

  const HSOverlay = getHsOverlay()
  if (!HSOverlay) return

  HSOverlay.autoInit?.()

  const inst = HSOverlay.getInstance?.(el, true)
  if (inst?.element) {
    inst.element.open()
    return
  }

  HSOverlay.open(el)

  // Last resort if overlay was never registered (e.g. autoInit ran before mount)
  requestAnimationFrame(() => {
    if (!el.classList.contains('hidden')) return
    el.classList.remove('hidden')
    el.classList.add('open', 'opened')
    el.setAttribute('aria-overlay', 'true')
    el.setAttribute('tabindex', '-1')
    document.body.classList.add('hs-overlay-body-open')
    document.body.style.overflow = 'hidden'
  })
}

export function closeHsOverlay(selector: string): void {
  const el = document.querySelector(selector)
  if (!el) return

  const HSOverlay = getHsOverlay()
  if (HSOverlay) {
    const inst = HSOverlay.getInstance?.(el, true)
    if (inst?.element) {
      void inst.element.close()
      return
    }
    HSOverlay.close(el)
    if (!el.classList.contains('hidden')) return
  }

  el.classList.remove('open', 'opened')
  el.classList.add('hidden')
  el.removeAttribute('aria-overlay')
  el.removeAttribute('tabindex')
  document.body.classList.remove('hs-overlay-body-open')
  document.body.style.overflow = ''
  document.querySelector(`#${el.id}-backdrop`)?.remove()
}
