// Builds the provider query string for mailbox search.
// Plain typed text is scoped to sender + subject (no body-text noise).
// Anything already using an operator (is:unread, from:x, has:attachment, …)
// is passed through verbatim. Works for both Gmail search and Outlook $search KQL,
// which share from:/subject:/quoted-phrase syntax.
// ponytail: single-word/phrase scope; advanced boolean queries the user types
// with ":" pass through raw. Upgrade to a real query parser only if users need
// mixed free-text + operators in one box.
export function buildMailQuery(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  if (t.includes(":")) return t; // advanced operator query — leave untouched
  const safe = t.replace(/"/g, "");
  return `from:"${safe}" OR subject:"${safe}"`;
}
