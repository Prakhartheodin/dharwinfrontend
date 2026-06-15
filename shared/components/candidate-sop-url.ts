/**
 * Pure URL helpers for the candidate onboarding ("Complete profile") SOP strip.
 * Kept dependency-free (no React / next/font) so it can be unit-tested in isolation
 * and reused without pulling in the component module.
 */

/**
 * Routes that carry `candidateId` purely as a transient prefill hint (e.g. to pre-select
 * a candidate in a "create" modal) rather than as "this page is about that candidate's
 * onboarding". The SOP strip must NOT render on these, or it leaks above unrelated lists.
 */
export const PREFILL_ONLY_PATHS = ["/ats/interviews"];

/** Resolve candidate id from common SOP deep-link query shapes. */
export function candidateIdFromUrl(pathname: string | null, searchString: string): string | null {
  if (pathname && PREFILL_ONLY_PATHS.some((p) => pathname.includes(p))) return null;
  const sp = new URLSearchParams(searchString);
  const cid = sp.get("candidateId")?.trim();
  if (cid) return cid;
  if (pathname?.includes("/ats/employees/edit")) {
    const id = sp.get("id")?.trim();
    if (id) return id;
  }
  return null;
}
