import { syncOfferLetterPrintMarginsFromDocument } from "./useOfferLetterPrintMargins"

/**
 * Renders the live letter node in a hidden same-origin iframe and calls print on that
 * document (not the app shell). Browsers use the iframe document for header/footer
 * text (title/URL), so the page no longer shows "localhost" / the app title. Users
 * should still turn off "Headers and footers" in the print dialog to remove the date,
 * URL, and page numbers — no web standard can turn those off via script.
 */
export const OFFER_LETTER_PREVIEW_ID = "offer-letter-preview-root"

function waitForSheetsThenPrint(doc: Document, win: Window, onTeardown: () => void): void {
  const links = doc.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')
  let pending = links.length
  let donePrint = false

  const runPrint = () => {
    if (donePrint) return
    donePrint = true
    const done = () => onTeardown()
    win.addEventListener("afterprint", done, { once: true })
    try {
      win.focus()
      win.print()
    } catch {
      onTeardown()
    }
  }

  if (pending === 0) {
    setTimeout(runPrint, 100)
    return
  }

  const tick = () => {
    pending -= 1
    if (pending <= 0) {
      setTimeout(runPrint, 100)
    }
  }
  links.forEach((link) => {
    link.addEventListener("load", tick)
    link.addEventListener("error", tick)
  })
  // Cached sheets may not refire "load"
  setTimeout(() => {
    if (!donePrint) {
      runPrint()
    }
  }, 1200)
}

function runPrintInIframe(letterElement: HTMLElement): void {
  const iframe = document.createElement("iframe")
  iframe.setAttribute("title", "Print offer letter")
  iframe.setAttribute("aria-hidden", "true")
  Object.assign(iframe.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "0",
    height: "0",
    border: "0",
    margin: "0",
    padding: "0",
    overflow: "hidden",
  })

  document.body.appendChild(iframe)
  const w = iframe.contentWindow
  const idoc = w?.document
  if (!w || !idoc) {
    iframe.remove()
    return
  }

  const teardown = () => {
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe)
    }
  }

  idoc.open()
  idoc.write(
    "<!DOCTYPE html><html><head><meta charset=\"utf-8\"/>" +
      "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"/>" +
      "<title> </title>" +
      "<style>html,body{margin:0;background:#fff}</style>" +
      "</head><body></body></html>"
  )
  idoc.close()

  const phead = document.head
  phead.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]').forEach((l) => {
    const linkEl = idoc.createElement("link")
    linkEl.rel = "stylesheet"
    linkEl.href = l.href
    if (l.media) linkEl.media = l.media
    idoc.head.appendChild(linkEl)
  })
  phead.querySelectorAll<HTMLStyleElement>("style").forEach((s) => {
    const styleEl = idoc.createElement("style")
    styleEl.setAttribute("data-cloned", "1")
    styleEl.textContent = s.textContent
    idoc.head.appendChild(styleEl)
  })

  idoc.body.appendChild(idoc.importNode(letterElement, true))

  waitForSheetsThenPrint(idoc, w, teardown)
}

/**
 * Iframe document clones styles from parent <head> — @page must be injected first.
 * We sync, then sync again after one frame, then build the iframe (margins must match
 * the measured #offer-letter-print-* / screenOnly bands).
 */
export function printOfferLetterInIframe(letterElement: HTMLElement | null): void {
  if (!letterElement) return
  if (typeof document === "undefined") return

  syncOfferLetterPrintMarginsFromDocument()
  requestAnimationFrame(() => {
    syncOfferLetterPrintMarginsFromDocument()
    runPrintInIframe(letterElement)
  })
}
