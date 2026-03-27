/**
 * Paths under the main app layout that are reachable without signing in
 * (same idea as /public-job, /join/room). Must stay in sync with ProtectedRoute and session-expiry handling.
 */
const PUBLIC_LAYOUT_PREFIXES = ["/ats/browse-jobs", "/ats/my-applications"] as const;

function normalizePathname(pathname: string): string {
  const p = pathname.trim() || "/";
  return p.replace(/\/$/, "") || "/";
}

/** True if pathname is a public ATS browse / my-applications route (including nested segments). */
export function isPublicLayoutPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const normalized = normalizePathname(pathname);
  return PUBLIC_LAYOUT_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`)
  );
}
