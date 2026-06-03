import { syncOfferLetterPrintMarginsFromDocument } from "./useOfferLetterPrintMargins"

/**
 * Prints ONLY the offer letter (no app shell) by cloning it into a hidden same-origin
 * iframe and printing that document. Browsers take the print header/footer text
 * (title/URL) from the iframe document, so the printout no longer shows "localhost" or
 * the app title. (Users should still turn off "Headers and footers" in the dialog to drop
 * the date / URL / page numbers — no web API can disable those.)
 *
 * IMPORTANT: every stylesheet is INLINED into the iframe (the linked CSS is fetched and
 * embedded as <style>) before printing. Cloning <link> tags loads them asynchronously, and
 * a cached <link> often never refires its `load` event — so `print()` could run before the
 * styles applied, dropping the letterhead band, the green footer, and the page sizing. A
 * <base> tag is added so any relative url() in the CSS still resolves to the app origin.
 */
export const OFFER_LETTER_PREVIEW_ID = "offer-letter-preview-root"

/** Collect every active stylesheet as raw CSS text: inline <style> + fetched <link> hrefs. */
async function collectAllCssText(): Promise<string> {
  const parts: string[] = []
  document.querySelectorAll<HTMLStyleElement>("style").forEach((s) => {
    if (s.textContent) parts.push(s.textContent)
  })
  const links = [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')]
  const fetched = await Promise.all(
    links.map(async (l) => {
      try {
        const res = await fetch(l.href)
        return await res.text()
      } catch {
        return ""
      }
    })
  )
  parts.push(...fetched)
  return parts.join("\n")
}

function escapeForAttr(s: string): string {
  return s.replace(/"/g, "&quot;")
}

function runPrintInIframe(letterElement: HTMLElement, cssText: string): void {
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
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe)
  }

  const base = escapeForAttr(`${window.location.origin}/`)
  idoc.open()
  idoc.write(
    '<!DOCTYPE html><html><head><meta charset="utf-8"/>' +
      '<meta name="viewport" content="width=device-width, initial-scale=1"/>' +
      `<base href="${base}"/>` +
      "<title> </title>" +
      "<style>html,body{margin:0;background:#fff}</style>" +
      "</head><body></body></html>"
  )
  idoc.close()

  // All CSS inlined (applies synchronously once parsed) — no async <link> race.
  const styleEl = idoc.createElement("style")
  styleEl.textContent = cssText
  idoc.head.appendChild(styleEl)

  idoc.body.appendChild(idoc.importNode(letterElement, true))

  const print = () => {
    try {
      w.addEventListener("afterprint", teardown, { once: true })
      w.focus()
      w.print()
    } catch {
      teardown()
    }
  }
  // Two frames + a tick so layout (and inlined webfont, if any) settles before printing.
  w.requestAnimationFrame(() => w.requestAnimationFrame(() => setTimeout(print, 60)))
}

/**
 * Iframe document gets @page margins from `syncOfferLetterPrintMarginsFromDocument` (embedded
 * via the inlined CSS). Sync once, sync again after a frame, then build + print.
 */
export function printOfferLetterInIframe(letterElement: HTMLElement | null): void {
  if (!letterElement) return
  if (typeof document === "undefined") return

  syncOfferLetterPrintMarginsFromDocument()
  requestAnimationFrame(() => {
    syncOfferLetterPrintMarginsFromDocument()
    void collectAllCssText().then((css) => runPrintInIframe(letterElement, css))
  })
}
