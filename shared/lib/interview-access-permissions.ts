import { getFeaturePermissions } from "@/shared/lib/feature-permissions";
import { getMeetingActionVisibility, userCanRecordMeeting } from "@/shared/lib/permissions";

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

/**
 * Mirrors GET /recordings/:recordingId/transcript — `meetings.read` OR `meetings.record`
 * (not `interviews.transcript.read`). Recruiters with Communication → Meetings view can read
 * segment transcripts on the recordings page but may lack the dedicated interview transcript grant.
 */
export function canReadRecordingTranscript(permissions: string[], isPlatformSuperUser?: boolean): boolean {
  if (isPlatformSuperUser) return true;
  if (hasRaw(permissions, "meetings.read")) return true;
  if (getMeetingActionVisibility(permissions).canViewRecordings) return true;
  return userCanRecordMeeting({ permissions, isPlatformSuperUser });
}

/** Mirrors backend interviews.summary.read aliases. */
export function canReadInterviewSummary(permissions: string[], isPlatformSuperUser?: boolean): boolean {
  if (isPlatformSuperUser) return true;
  if (hasRaw(permissions, "interviews.summary.read")) return true;
  const flags = getFeaturePermissions(permissions, SUMMARY_PREFIX);
  return flags.view || flags.create || flags.edit || flags.delete;
}
