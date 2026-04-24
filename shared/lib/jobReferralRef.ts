const STORAGE_KEY_PREFIX = "dharwinJobReferralRef:";

/**
 * Survives client navigations and modal open where the page URL may no longer include `?ref=`.
 * Scoped per public job id so two tabs for different jobs do not clash.
 */
export function jobReferralRefStorageKey(jobId: string): string {
  return `${STORAGE_KEY_PREFIX}${jobId}`;
}

export function rememberJobReferralRef(jobId: string, ref: string | null | undefined): void {
  if (typeof window === "undefined") return;
  const t = (ref || "").trim();
  const key = jobReferralRefStorageKey(jobId);
  if (t) {
    try {
      sessionStorage.setItem(key, t);
    } catch {
      // ignore quota / private mode
    }
  }
}

export function readStoredJobReferralRef(jobId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const t = sessionStorage.getItem(jobReferralRefStorageKey(jobId))?.trim();
    return t || null;
  } catch {
    return null;
  }
}

/**
 * Reject open redirects: only in-app relative paths.
 */
export function getSafePostLoginPath(next: string | null | undefined): string | null {
  if (!next || typeof next !== "string") return null;
  const t = next.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return null;
  if (t.includes("://")) return null;
  return t;
}
