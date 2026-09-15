import { getFeaturePermissions } from "@/shared/lib/feature-permissions";

const TRANSCRIPT_PREFIX = "ats.interviews.transcript";
const SUMMARY_PREFIX = "ats.interviews.summary";

function hasRaw(permissions: string[], key: string): boolean {
  return permissions.includes(key);
}

/** Mirrors backend interviews.transcript.read aliases (matrix + raw). */
export function canReadInterviewTranscript(permissions: string[], isPlatformSuperUser?: boolean): boolean {
  if (isPlatformSuperUser) return true;
  if (hasRaw(permissions, "interviews.transcript.read")) return true;
  const flags = getFeaturePermissions(permissions, TRANSCRIPT_PREFIX);
  return flags.view || flags.create || flags.edit || flags.delete;
}

/** Mirrors backend interviews.summary.read aliases. */
export function canReadInterviewSummary(permissions: string[], isPlatformSuperUser?: boolean): boolean {
  if (isPlatformSuperUser) return true;
  if (hasRaw(permissions, "interviews.summary.read")) return true;
  const flags = getFeaturePermissions(permissions, SUMMARY_PREFIX);
  return flags.view || flags.create || flags.edit || flags.delete;
}
