/**
 * Job templates / job descriptions are stored as TipTap HTML. When payloads pass through global
 * `xss` middleware on POST/PATCH without a route bypass, `<`/`>` become `&lt;`/`&gt;` in JSON and
 * TipTap renders those literals as plain text instead of parsing HTML — use this before `setContent`.
 */
export function normalizeTipTapHtmlFromApi(html: string | null | undefined): string {
  if (html == null) return ""
  let s = String(html)
  if (!s.includes("&lt;")) return s

  if (typeof document !== "undefined") {
    try {
      const t = document.createElement("textarea")
      t.innerHTML = s
      return t.value
    } catch {
      /* fallthrough */
    }
  }
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}
