import DOMPurify from "isomorphic-dompurify";

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
  ALLOWED_ATTR: ["href", "target", "rel", "class", "src", "alt", "width", "height", "colspan", "rowspan", "type"],
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
