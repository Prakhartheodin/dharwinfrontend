/**
 * Parse "Name <a@b.com>, c@d.com" style headers for Reply / Reply all.
 * Mirrors server logic in gmailProvider (keep in sync when changing rules).
 */

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
