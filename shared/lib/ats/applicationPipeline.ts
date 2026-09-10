import type { JobApplicationStatus } from "@/shared/lib/api/jobApplications";

/** All application pipeline statuses (visible in filters, badges, funnel). */
export const PIPELINE_STATUSES: JobApplicationStatus[] = [
  "Applied",
  "Screening",
  "Interview",
  "Shortlisted",
  "Offered",
  "Hired",
  "Rejected",
];

/** Statuses set only by system workflows — never manual dropdown targets. */
export const SYSTEM_ONLY_STATUSES: JobApplicationStatus[] = ["Interview", "Offered", "Hired"];

/** Manual targets when reopening a rejected application. */
export const REJECTED_REOPEN_STATUSES: JobApplicationStatus[] = [
  "Applied",
  "Screening",
  "Shortlisted",
];

/**
 * Manual transition graph (Option B). Mirrors backend MANUAL_APPLICATION_TRANSITIONS.
 * Interview / Offered / Hired are never selectable targets; terminal Hired has no manual exits.
 */
export const MANUAL_NEXT_STATUSES: Record<JobApplicationStatus, JobApplicationStatus[]> = {
  Applied: ["Screening", "Rejected"],
  Screening: ["Shortlisted", "Rejected"],
  Interview: ["Shortlisted", "Rejected"],
  Shortlisted: ["Rejected"],
  Offered: ["Rejected"],
  Hired: [],
  Rejected: REJECTED_REOPEN_STATUSES,
};

export const STATUS_STYLE: Record<JobApplicationStatus, string> = {
  Applied: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20",
  Screening: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20",
  Interview: "bg-violet-500/10 text-violet-700 dark:text-violet-400 border border-violet-500/20",
  Shortlisted: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20",
  Offered: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20",
  Hired: "bg-emerald-600/15 text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-500/30",
  Rejected: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20",
};

/** Application statuses eligible for scheduling a new interview (Option A). */
export const INTERVIEW_SCHEDULE_ELIGIBLE_STATUSES: JobApplicationStatus[] = [
  "Applied",
  "Screening",
  "Shortlisted",
  "Interview",
];

/** User-facing reason when interview scheduling is blocked, or null when allowed. */
export function getInterviewSchedulingBlockReason(status: string | null | undefined): string | null {
  if (!status) return null;
  if (status === "Rejected") {
    return "Cannot schedule an interview for a rejected application. Change the application status first.";
  }
  if (status === "Offered") {
    return "Cannot schedule an interview for an application that has already received an offer.";
  }
  if (status === "Hired") {
    return "Cannot schedule an interview for a hired application.";
  }
  if (!INTERVIEW_SCHEDULE_ELIGIBLE_STATUSES.includes(status as JobApplicationStatus)) {
    return `Cannot schedule an interview for an application in "${status}" status.`;
  }
  return null;
}

/** Application statuses that block scheduling a new interview. */
export function isInterviewSchedulingBlocked(status: string | null | undefined): boolean {
  return Boolean(getInterviewSchedulingBlockReason(status));
}

export const INTERVIEW_SCHEDULE_REJECTED_MESSAGE =
  "Cannot schedule an interview for a rejected application. Change the application status first.";

export function getManualNextStatuses(status: JobApplicationStatus): JobApplicationStatus[] {
  return MANUAL_NEXT_STATUSES[status] ?? [];
}

export function isManualStatusTarget(status: JobApplicationStatus): boolean {
  return !SYSTEM_ONLY_STATUSES.includes(status);
}

/** Current status plus legal manual next stages for dropdown options. */
export function getSelectableStatuses(current: JobApplicationStatus): JobApplicationStatus[] {
  return [current, ...getManualNextStatuses(current)];
}

export function isStatusSelectLocked(current: JobApplicationStatus): boolean {
  return getManualNextStatuses(current).length === 0;
}

export function isManualTransition(from: JobApplicationStatus, to: JobApplicationStatus): boolean {
  if (from === to) return true;
  if (!isManualStatusTarget(to)) return false;
  return getManualNextStatuses(from).includes(to);
}
