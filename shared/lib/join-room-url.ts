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
