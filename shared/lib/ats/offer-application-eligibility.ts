/** Statuses that can never receive a new offer on this application row. */
const BLOCKED = new Set(["Hired", "Rejected"]);

/** Statuses eligible when the application has no offer yet (includes Offered-without-offer). */
const ELIGIBLE = new Set(["Applied", "Screening", "Interview", "Shortlisted", "Offered"]);

const OBJECT_ID_HEX_RE = /^[0-9a-fA-F]{24}$/;

export function isJobApplicationEligibleForOffer(
  status: string | undefined,
  applicationId: string,
  applicationIdsWithOffer: ReadonlySet<string>
): boolean {
  if (!status || BLOCKED.has(status)) return false;
  if (applicationIdsWithOffer.has(applicationId)) return false;
  return ELIGIBLE.has(status);
}

export function jobApplicationRecordId(ja: { _id?: string; id?: string }): string {
  const v = ja._id ?? ja.id;
  return v != null ? String(v) : "";
}

export function meetingMatchesApplication(
  meeting: { jobPosition?: string; status?: string; interviewResult?: string },
  candidateId: string,
  jobId: string,
  jobTitle: string
): boolean {
  if (meeting.status === "cancelled") return false;
  const meetingCandidateId = String((meeting as { candidate?: { id?: string } }).candidate?.id || "");
  if (!meetingCandidateId || meetingCandidateId !== candidateId) return false;
  const jobPos = (meeting.jobPosition || "").trim();
  if (!jobPos) return false;
  if (OBJECT_ID_HEX_RE.test(jobPos)) return jobPos === jobId;
  if (jobTitle) return jobPos.toLowerCase() === jobTitle.trim().toLowerCase();
  return false;
}

export function applicationHasSelectedInterviewFromMeetings(
  meetings: Array<{ jobPosition?: string; status?: string; interviewResult?: string; candidate?: { id?: string } }>,
  candidateId: string,
  jobId: string,
  jobTitle: string
): boolean {
  return meetings.some(
    (m) =>
      m.interviewResult === "selected" &&
      meetingMatchesApplication(m, candidateId, jobId, jobTitle)
  );
}

export const OFFER_INTERVIEW_BYPASS_CONFIRM = {
  title: "Bypass interview?",
  message:
    "This candidate didn't have an interview marked selected. Creating an offer now skips a step in the hiring flow. Do you still want to create this offer letter?",
  confirmLabel: "Yes, create offer",
  cancelLabel: "Cancel",
  tone: "primary" as const,
  overlayClassName: "z-[10100]",
};
