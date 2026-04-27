'use client'

import { useEffect, useLayoutEffect } from 'react'

/** Injected after measured header/footer heights; kept out of globals. */
export const OFFER_LETTER_PRINT_MARGINS_STYLE_ID = 'offer-letter-print-margins'

/** CSS reference px: 1in = 96px = 25.4mm */
const PX_TO_MM = 25.4 / 96

/** Clearance on top of measured band so body text never tucks under fixed position:fixed bands */
const BUFFER_MM = 10

const MIN_TOP_MM = 60
const MIN_BOTTOM_MM = 50
const SIDE_MM = 10

/**
 * The print shell adds padding/border/fonts to #offer-letter-print-header/footer
 * that do not apply to the in-flow screen copy — measured height would otherwise
 * be too small. Keep in sync with offer-letter-print-shell.scss roughly.
 */
/** Residual: print @media can shrink font/img vs screen; keep small. */
const HEADER_PRINT_SURCHARGE_PX = 8
const FOOTER_PRINT_SURCHARGE_PX = 6

function pxToMm(px: number): number {
  return Math.ceil(px * PX_TO_MM * 10) / 10
}

const INFLOW_SIDE_MM = 10

/** Multi-sheet letter: header/footer repeat in-flow in each sheet — no fixed bands. */
function injectInFlowSheetPrintMargins(): void {
  const css = `@media print {
  @page {
    size: auto;
    margin: ${INFLOW_SIDE_MM}mm;
  }
}
`
  let tag = document.getElementById(OFFER_LETTER_PRINT_MARGINS_STYLE_ID) as HTMLStyleElement | null
  if (!tag) {
    tag = document.createElement('style')
    tag.id = OFFER_LETTER_PRINT_MARGINS_STYLE_ID
    document.head.appendChild(tag)
  }
  tag.textContent = css
  if (tag.parentNode) {
    document.head.appendChild(tag)
  }
}

function injectOfferLetterPrintMargins(topMm: number, bottomMm: number): void {
  const css = `@media print {
  @page {
    size: auto;
    margin: ${topMm}mm ${SIDE_MM}mm ${bottomMm}mm ${SIDE_MM}mm;
  }
}
`
  let tag = document.getElementById(OFFER_LETTER_PRINT_MARGINS_STYLE_ID) as HTMLStyleElement | null
  if (!tag) {
    tag = document.createElement('style')
    tag.id = OFFER_LETTER_PRINT_MARGINS_STYLE_ID
    document.head.appendChild(tag)
  }
  tag.textContent = css
  /* Last stylesheet wins for duplicate @page; keep this after chunk CSS */
  if (tag.parentNode) {
    document.head.appendChild(tag)
  }
}

/**
 * Measure visible in-flow letterhead/footer (screen-only clones), not
 * `#offer-letter-print-header` — that node is `display:none` on screen so its
 * height would be 0 until print. Screen and print bands use the same inner layout.
 */
function measureBlockPx(el: HTMLElement | null): number {
  if (!el) return 0
  const h = el.getBoundingClientRect().height
  if (h > 0) return h
  return el.offsetHeight
}

export function syncOfferLetterPrintMarginsFromDocument(): void {
  if (typeof document === 'undefined') return

  const root = document.getElementById('offer-letter-preview-root')
  if (root?.hasAttribute('data-inflow-sheets')) {
    injectInFlowSheetPrintMargins()
    return
  }

  const screenHead = root?.querySelector<HTMLElement>('[class*="screenOnlyLetterHead"]') ?? null
  const screenFoot = root?.querySelector<HTMLElement>('[class*="screenOnlyLetterFooter"]') ?? null
  const printH = document.getElementById('offer-letter-print-header')
  const printF = document.getElementById('offer-letter-print-footer')

  // Screen copies — include surcharge so it matches print band padding/accents (see module CSS on screenOnly*)
  let headerPx = measureBlockPx(screenHead) + HEADER_PRINT_SURCHARGE_PX
  let footerPx = measureBlockPx(screenFoot) + FOOTER_PRINT_SURCHARGE_PX

  // If the print nodes ever lay out to a height (e.g. beforeprint), never go below that
  const ph = measureBlockPx(printH)
  const pf = measureBlockPx(printF)
  if (ph > 0) headerPx = Math.max(headerPx, ph)
  if (pf > 0) footerPx = Math.max(footerPx, pf)

  const topMm = Math.max(
    headerPx > 0 ? pxToMm(headerPx) + BUFFER_MM : MIN_TOP_MM,
    MIN_TOP_MM
  )
  const bottomMm = Math.max(
    footerPx > 0 ? pxToMm(footerPx) + BUFFER_MM : MIN_BOTTOM_MM,
    MIN_BOTTOM_MM
  )

  injectOfferLetterPrintMargins(topMm, bottomMm)
}

export function removeOfferLetterPrintMarginsStyle(): void {
  document.getElementById(OFFER_LETTER_PRINT_MARGINS_STYLE_ID)?.remove()
}

/**
 * Keeps @page margins in sync with rendered header/footer bands. Re-run when
 * letter HTML changes, on resize, and before print.
 */
function syncMarginsOnBeforePrint(): void {
  syncOfferLetterPrintMarginsFromDocument()
  /* Second pass: print layout can update after a frame. */
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      syncOfferLetterPrintMarginsFromDocument()
    })
  })
}

export function useOfferLetterPrintMargins(letterHtml: string): void {
  useLayoutEffect(() => {
    const sync = () => syncOfferLetterPrintMarginsFromDocument()

    sync()
    window.addEventListener('beforeprint', syncMarginsOnBeforePrint)

    const root = document.getElementById('offer-letter-preview-root')
    const header = root?.querySelector<HTMLElement>('[class*="screenOnlyLetterHead"]')
    const footer = root?.querySelector<HTMLElement>('[class*="screenOnlyLetterFooter"]')
    const ro = new ResizeObserver(sync)
    if (header) ro.observe(header)
    if (footer) ro.observe(footer)

    return () => {
      window.removeEventListener('beforeprint', syncMarginsOnBeforePrint)
      ro.disconnect()
    }
  }, [letterHtml])

  useEffect(() => {
    return () => removeOfferLetterPrintMarginsStyle()
  }, [])
}
