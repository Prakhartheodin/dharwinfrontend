import type { MeetingParticipantConsent } from "@/shared/lib/api/meetings";

export type CandidateConsentBadgeKind = "pending" | "recording_off" | "on_file";

export interface CandidateConsentBadge {
  kind: CandidateConsentBadgeKind;
  label: string;
  title: string;
  className: string;
}

/** Latest active consent row for a roster candidate (mirrors backend latestConsentForIdentity per role). */
export function latestCandidateConsent(
  consents: MeetingParticipantConsent[] | null | undefined
): MeetingParticipantConsent | null {
  const rows = (consents ?? []).filter((c) => !c.withdrawnAt && c.role === "candidate");
  if (!rows.length) return null;
  return rows.sort((a, b) => new Date(b.acceptedAt).getTime() - new Date(a.acceptedAt).getTime())[0];
}

export function candidateConsentBadge(
  consents: MeetingParticipantConsent[] | null | undefined
): CandidateConsentBadge {
  const row = latestCandidateConsent(consents);
  if (!row) {
    return {
      kind: "pending",
      label: "Consent pending",
      title: "The candidate has not completed the pre-join consent step yet",
      className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
    };
  }
  if (!row.recording) {
    return {
      kind: "recording_off",
      label: "No recording consent",
      title: "The candidate joined but did not consent to recording",
      className: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30",
    };
  }
  const extras: string[] = [];
  if (row.transcription) extras.push("transcription");
  if (row.aiEvaluation) extras.push("AI evaluation");
  return {
    kind: "on_file",
    label: "Consent on file",
    title:
      extras.length > 0
        ? `Candidate consented to recording, ${extras.join(", ")}`
        : "Candidate consented to recording",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  };
}
