import DOMPurify from "isomorphic-dompurify";

/**
 * CSS properties allowed inside inline `style` attributes. Anything not listed
 * (position, z-index, transform, opacity, background-image, behavior, url(...), etc.)
 * is stripped to prevent CSS-based XSS / clickjacking / data-exfil.
 */
const ALLOWED_CSS_PROPS = new Set([
  "color",
  "background-color",
  "font-size",
  "font-family",
  "font-weight",
  "font-style",
  "text-align",
  "text-decoration",
  "line-height",
  "width",
  "height",
]);

/** Filter a CSS declaration string down to the allowlisted, url()-free properties. */
function filterStyleAttr(value: string): string {
  return value
    .split(";")
    .map((decl) => decl.trim())
    .filter(Boolean)
    .filter((decl) => {
      const idx = decl.indexOf(":");
      if (idx === -1) return false;
      const prop = decl.slice(0, idx).trim().toLowerCase();
      const val = decl.slice(idx + 1).trim().toLowerCase();
      if (!ALLOWED_CSS_PROPS.has(prop)) return false;
      // Reject any value carrying url()/expression()/external refs.
      if (/url\(|expression\(|javascript:|@import|\\/.test(val)) return false;
      return true;
    })
    .join("; ");
}

DOMPurify.addHook("uponSanitizeAttribute", (_node, data) => {
  if (data.attrName === "style") {
    data.attrValue = filterStyleAttr(data.attrValue);
  }
});

const RICH_HTML_CONFIG: Parameters<typeof DOMPurify.sanitize>[1] = {
  ALLOWED_TAGS: [
    "p",
    "br",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "ul",
    "ol",
    "li",
    "a",
    "h1",
    "h2",
    "h3",
    "h4",
    "blockquote",
    "code",
    "pre",
    "span",
    "div",
    "img",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "mark",
    "video",
    "source",
  ],
  ALLOWED_ATTR: ["href", "target", "rel", "class", "style", "src", "alt", "width", "height", "colspan", "rowspan", "type"],
};

/** Sanitize untrusted HTML before dangerouslySetInnerHTML (blog, job descriptions, mail bodies). */
export function sanitizeRichHtml(html: string): string {
  if (!html || typeof html !== "string") return "";
  return DOMPurify.sanitize(html, RICH_HTML_CONFIG);
}

export function escapeHtmlForTextNode(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
