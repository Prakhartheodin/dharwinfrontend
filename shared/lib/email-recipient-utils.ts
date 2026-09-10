/**
 * Parse "Name <a@b.com>, c@d.com" style headers for Reply / Reply all.
 * Mirrors server logic in gmailProvider (keep in sync when changing rules).
 */

/** Keep in sync with EMAIL_RE in uat.dharwin.backend/src/validations/email.validation.js */
export const EMAIL_ADDRESS_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function extractEmailAddress(raw: string): string {
  const s = String(raw || "").trim();
  const m = s.match(/<([^>]+)>/);
  return (m ? m[1] : s).trim().toLowerCase();
}

export function splitAddressHeader(header: string | undefined | null): string[] {
  if (!header?.trim()) return [];
  const parts: string[] = [];
  let cur = "";
  let depth = 0;
  for (const ch of header) {
    if (ch === "<") depth += 1;
    else if (ch === ">") depth -= 1;
    if (ch === "," && depth === 0) {
      if (cur.trim()) parts.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

export function buildReplyAllRecipients(
  msg: { from: string; to: string; cc?: string },
  selfEmail: string
): { to: string; cc: string } {
  const self = extractEmailAddress(selfEmail);
  const fromParts = splitAddressHeader(msg.from);
  const toParts = splitAddressHeader(msg.to);
  const ccParts = splitAddressHeader(msg.cc || "");

  const toSet = new Set<string>();
  const toOut: string[] = [];
  const addTo = (raw: string) => {
    const e = extractEmailAddress(raw);
    if (!e || e === self) return;
    if (toSet.has(e)) return;
    toSet.add(e);
    toOut.push(raw.trim());
  };

  for (const p of fromParts) addTo(p);
  for (const p of toParts) addTo(p);

  const ccOut: string[] = [];
  const ccSeen = new Set<string>();
  for (const p of ccParts) {
    const e = extractEmailAddress(p);
    if (!e || e === self) continue;
    if (toSet.has(e)) continue;
    if (ccSeen.has(e)) continue;
    ccSeen.add(e);
    ccOut.push(p.trim());
  }

  return { to: toOut.join(", "), cc: ccOut.join(", ") };
}

/** Bare address for validation; accepts `Name <email>` form. */
export function extractBareEmail(raw: string): string {
  const s = String(raw || "").trim();
  const m = s.match(/<([^>]+)>/);
  return (m ? m[1] : s).trim();
}

export function isValidEmailAddress(raw: string): boolean {
  const email = extractBareEmail(raw);
  return EMAIL_ADDRESS_RE.test(email);
}

export function recipientsFromHeaderString(value: string | undefined | null): string[] {
  return splitAddressHeader(value);
}

export function dedupeRecipients(addresses: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of addresses) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = extractEmailAddress(trimmed);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

/** Split pasted or typed multi-address text into individual tokens. */
export function parseRecipientInput(text: string): string[] {
  const normalized = text.replace(/[;\n\t]+/g, ",");
  const parts = splitAddressHeader(normalized);
  const out: string[] = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (/\s/.test(trimmed) && !trimmed.includes("<")) {
      for (const token of trimmed.split(/\s+/)) {
        const t = token.trim().replace(/^,+|,+$/g, "");
        if (t) out.push(t);
      }
    } else {
      out.push(trimmed);
    }
  }
  return dedupeRecipients(out);
}

export function joinRecipients(addresses: string[]): string {
  return addresses.join(", ");
}

export function validateRecipientList(addresses: string[]): { valid: boolean; invalid: string[] } {
  const invalid = addresses.filter((a) => !isValidEmailAddress(a));
  return { valid: invalid.length === 0, invalid };
}
