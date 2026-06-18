/** Build share URL from API field or meetingId fallback (matches meetings list rows). */
export function resolveMeetingShareUrl(meeting: {
  publicMeetingUrl?: string | null
  meetingId?: string | null
}): string {
  const fromApi = (meeting.publicMeetingUrl || "").trim()
  if (fromApi) return fromApi
  const room = (meeting.meetingId || "").trim()
  if (!room) return ""
  const path = `/join/room?room=${encodeURIComponent(room)}`
  if (typeof window !== "undefined") {
    return `${window.location.origin}${path}`
  }
  return path
}

/** Name/email for a personalized join link — prefer the meeting hosts row for the signed-in user. */
export function resolvePersonalJoinIdentity(
  user: { name?: string | null; email?: string | null } | null | undefined,
  hosts?: { nameOrRole?: string; email: string }[] | null
): { name: string; email: string } {
  const userEmail = (user?.email || "").trim().toLowerCase()
  const hostEntry = (hosts || []).find(
    (h) => (h.email || "").trim().toLowerCase() === userEmail
  )
  const email = (hostEntry?.email || user?.email || "").trim()
  const name =
    (hostEntry?.nameOrRole || user?.name || "").trim() ||
    email.split("@")[0]?.trim() ||
    ""
  return { name, email }
}

/**
 * Append name/email query params to a /join/room URL so LiveKit pre-join can skip empty fields
 * and hosts are recognized by email.
 */
export function appendJoinIdentityToUrl(
  baseUrl: string,
  name?: string | null,
  email?: string | null
): string {
  const n = typeof name === "string" ? name.trim() : "";
  const e = typeof email === "string" ? email.trim() : "";
  if (!n && !e) return baseUrl;
  try {
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const u = baseUrl.startsWith("http") ? new URL(baseUrl) : new URL(baseUrl.startsWith("/") ? baseUrl : `/${baseUrl}`, origin);
    if (n) u.searchParams.set("name", n);
    if (e) u.searchParams.set("email", e);
    if (baseUrl.startsWith("http")) return u.toString();
    return `${u.pathname}${u.search}`;
  } catch {
    return baseUrl;
  }
}
