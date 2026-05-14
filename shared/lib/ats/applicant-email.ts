/**
 * Applicant email display helpers.
 *
 * Backend creates synthetic emails like `ol.<oid>.noreply@dharwin.offers.local`
 * for standalone offer letters (see offer.service.js `createStandaloneApplicationForOfferLetter`).
 * Those identifiers are load-bearing on the server (deleteOfferById matches the
 * pattern to clean orphan records) but must never reach end-user UI.
 */

export const EMAIL_HIDDEN_PLACEHOLDER = "Email hidden";

const INTERNAL_DOMAIN_SUFFIXES = [
  ".local",
  ".internal",
  ".invalid",
];

const INTERNAL_LOCALPART_PATTERNS = [
  /^ol\.[a-f0-9]{24}\.noreply$/i,
  /(^|[._-])noreply([._-]|$)/i,
  /(^|[._-])no-reply([._-]|$)/i,
  /(^|[._-])donotreply([._-]|$)/i,
];

export function isInternalRelayEmail(email: unknown): boolean {
  if (typeof email !== "string") return false;
  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !trimmed.includes("@")) return false;
  const [local, domain] = trimmed.split("@");
  if (!local || !domain) return false;
  if (INTERNAL_DOMAIN_SUFFIXES.some((suf) => domain.endsWith(suf))) return true;
  if (/(^|\.)dharwin\.offers\./i.test(domain)) return true;
  if (INTERNAL_LOCALPART_PATTERNS.some((re) => re.test(local))) return true;
  return false;
}

export function isPublicEmail(email: unknown): email is string {
  if (typeof email !== "string") return false;
  const trimmed = email.trim();
  if (!trimmed || !trimmed.includes("@")) return false;
  return !isInternalRelayEmail(trimmed);
}

export function maskEmail(email: string): string {
  const [local, domain] = email.trim().split("@");
  if (!local || !domain) return EMAIL_HIDDEN_PLACEHOLDER;
  const visible = local.slice(0, Math.min(4, Math.max(1, local.length - 1)));
  return `${visible}***@${domain}`;
}

export interface ApplicantEmailDisplayOptions {
  mask?: boolean;
  /** Shown when every candidate value is empty/undefined. Default: "—". */
  missingPlaceholder?: string;
  /** Shown when a value exists but is a suppressed relay email. Default: "Email hidden". */
  relayPlaceholder?: string;
}

/**
 * Pick a safe applicant email for UI rendering.
 * Accepts any number of candidate sources (e.g. application.candidateEmail then candidate.email).
 *
 * Behavior:
 * - Returns the first public (non-relay) email when present.
 * - Returns `relayPlaceholder` ("Email hidden") only when a relay/synthetic email was suppressed.
 * - Returns `missingPlaceholder` ("—") when no email value exists at all — avoids confusing
 *   the user with "Email hidden" for candidates whose profile simply hasn't surfaced an email.
 */
export function displayApplicantEmail(
  candidates: Array<unknown>,
  opts: ApplicantEmailDisplayOptions = {}
): string {
  const missing = opts.missingPlaceholder ?? "—";
  const relay = opts.relayPlaceholder ?? EMAIL_HIDDEN_PLACEHOLDER;
  let sawRelay = false;
  for (const c of candidates) {
    if (typeof c !== "string") continue;
    const trimmed = c.trim();
    if (!trimmed) continue;
    if (isInternalRelayEmail(trimmed)) {
      sawRelay = true;
      continue;
    }
    if (trimmed.includes("@")) {
      return opts.mask ? maskEmail(trimmed) : trimmed;
    }
  }
  return sawRelay ? relay : missing;
}

/**
 * Returns the first public email or null. Use for mailto links / API payloads
 * where the placeholder string is not appropriate.
 */
export function pickPublicEmail(candidates: Array<unknown>): string | null {
  for (const c of candidates) {
    if (isPublicEmail(c)) return c;
  }
  return null;
}

/**
 * Shape covering the union of fields ATS surfaces use to display an applicant's email.
 * All fields are optional — caller passes whatever it has.
 */
export interface ApplicantEmailSource {
  /** Authoritative applicant identity (JobApplication.applicantUser populated). */
  applicantUser?: { _id?: string; id?: string; email?: string | null } | null;
  /** Populated owner User (Employee.owner) — fallback for legacy rows only. */
  owner?: { email?: string | null } | null;
  user?: { email?: string | null } | null;
  profile?: { email?: string | null } | null;
  employee?: { email?: string | null } | null;
  candidate?: {
    email?: string | null;
    owner?: { _id?: string; id?: string; email?: string | null } | null;
  } | null;
  application?: {
    applicantUser?: { _id?: string; id?: string; email?: string | null } | null;
    email?: string | null;
    candidateEmail?: string | null;
  } | null;
  /** Direct field shortcuts. */
  email?: string | null;
  candidateEmail?: string | null;
}

/**
 * Resolve an applicant's display email by walking a priority chain of identity sources.
 * Priority: applicant.user → profile → employee → owner-of-candidate → candidate → application.
 * Internal relay / *.local / noreply addresses are skipped at every step.
 *
 * IMPORTANT: synthetic candidate records (created by the standalone-offer-letter flow)
 * store the admin/recruiter user in `Employee.owner`. Trusting owner.email there leaks
 * the logged-in admin's email into applicant rows. Detection signal: candidate.email
 * is an internal relay address (e.g. `ol.<oid>.noreply@dharwin.offers.local`). When
 * detected, every owner/user source is discarded and we return the relay placeholder.
 */
export function resolveApplicantEmail(
  src: ApplicantEmailSource,
  opts: ApplicantEmailDisplayOptions = {}
): string {
  const candEmail = src.candidate?.email;
  const syntheticCandidate = typeof candEmail === "string" && isInternalRelayEmail(candEmail);
  // Synthetic offer-letter placeholders have no real applicant.
  if (syntheticCandidate) {
    return opts.relayPlaceholder ?? EMAIL_HIDDEN_PLACEHOLDER;
  }

  // STRICT applicant-only chain. Sources here MUST belong to the applicant entity itself.
  // `Employee.owner` is intentionally EXCLUDED: it is "user who created/owns the Employee
  // record", which on recruiter-created candidates is the recruiter — leaking admin emails
  // into applicant rows. Same reason `appliedBy`, `recruiter`, `referredBy`, `createdBy`,
  // and any auth/session context are excluded.
  return displayApplicantEmail(
    [
      // 1. Authoritative applicant user (set at create time, never the recruiter).
      src.applicantUser?.email,
      src.application?.applicantUser?.email,
      // 2. Explicit user/profile/employee passed by caller (assumed already applicant-scoped).
      src.user?.email,
      src.profile?.email,
      src.employee?.email,
      // 3. Direct fields on the candidate Employee record (already filtered for relay).
      src.candidate?.email,
      // 4. Application-level snapshot (rarely populated, never the recruiter email).
      src.application?.email,
      src.application?.candidateEmail,
      src.email,
      src.candidateEmail,
    ],
    opts
  );
}

/**
 * Dedupe an applicant list by universal user identity. Latest record (by `latestAt` getter,
 * default `createdAt`) wins.
 *
 * Identity key priority (first present wins): owner._id → user._id → employee._id → candidate._id
 *   → falls back to a normalized public email when no id is available.
 *
 * Frontend defense-in-depth: backend already dedupes per-job listings, but this catches
 * cross-job aggregations and legacy data shapes.
 */
export interface ApplicantIdentitySource {
  applicantUser?: { _id?: string; id?: string } | null;
  owner?: { _id?: string; id?: string } | null;
  user?: { _id?: string; id?: string } | null;
  employee?: { _id?: string; id?: string } | null;
  candidate?: {
    _id?: string;
    id?: string;
    email?: string | null;
    owner?: { _id?: string; id?: string } | null;
  } | null;
  email?: string | null;
  candidateEmail?: string | null;
}

function pickId(...vals: Array<{ _id?: string; id?: string } | null | undefined>): string | null {
  for (const v of vals) {
    if (!v) continue;
    const raw = v._id ?? v.id;
    if (raw && String(raw).trim()) return String(raw);
  }
  return null;
}

export function getApplicantIdentityKey(src: ApplicantIdentitySource): string {
  // Identity chain — applicant-only sources. `Employee.owner` (and src.owner / src.user /
  // candidate.owner) are EXCLUDED because for recruiter-created candidates they resolve
  // to the recruiter's User and would collapse multiple distinct applicants into one row.
  // Use applicantUser when present, otherwise key on the candidate Employee record itself.
  const id = pickId(src.applicantUser, src.employee, src.candidate ?? null);
  if (id) return `id:${id}`;
  const email = pickPublicEmail([src.candidate?.email, src.email, src.candidateEmail]);
  if (email) return `email:${email.trim().toLowerCase()}`;
  return `anon:${Math.random().toString(36).slice(2)}`;
}

export function dedupeApplicants<T extends ApplicantIdentitySource>(
  rows: readonly T[],
  latestAt: (row: T) => string | number | Date | null | undefined = (r) =>
    (r as unknown as { createdAt?: string }).createdAt ?? 0
): T[] {
  const byKey = new Map<string, T>();
  for (const row of rows) {
    const key = getApplicantIdentityKey(row);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, row);
      continue;
    }
    const a = new Date(latestAt(existing) ?? 0).getTime();
    const b = new Date(latestAt(row) ?? 0).getTime();
    if (b >= a) byKey.set(key, row);
  }
  return Array.from(byKey.values());
}
