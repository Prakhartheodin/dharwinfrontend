/**
 * When an admin starts impersonation from a specific page, we remember where to send them
 * after "Exit impersonation" (same tab). Stored in sessionStorage for the impersonation session.
 */
export const IMPERSONATION_RETURN_PATH_KEY = "dharwin_impersonation_return_path";

const MAX_LEN = 512;

/** Reject open redirects: require same-origin relative path only. */
export function isSafeImpersonationReturnPath(path: string): boolean {
  if (!path || typeof path !== "string") return false;
  const p = path.trim();
  if (p.length === 0 || p.length > MAX_LEN) return false;
  if (!p.startsWith("/")) return false;
  if (p.startsWith("//")) return false;
  if (p.includes("://")) return false;
  if (p.includes("\0") || p.includes("<")) return false;
  return true;
}

export function setImpersonationReturnPathForSession(path: string): void {
  if (typeof window === "undefined") return;
  if (!isSafeImpersonationReturnPath(path)) return;
  try {
    sessionStorage.setItem(IMPERSONATION_RETURN_PATH_KEY, path);
  } catch {
    /* quota / private mode */
  }
}

export function clearImpersonationReturnPath(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(IMPERSONATION_RETURN_PATH_KEY);
  } catch {
    /* ignore */
  }
}

/** Returns stored path and removes it (call when exiting impersonation). */
export function consumeImpersonationReturnPath(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(IMPERSONATION_RETURN_PATH_KEY);
    sessionStorage.removeItem(IMPERSONATION_RETURN_PATH_KEY);
    if (raw && isSafeImpersonationReturnPath(raw)) return raw;
    return null;
  } catch {
    return null;
  }
}
