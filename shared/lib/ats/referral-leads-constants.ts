/** Display labels for referral link type (align with API referralContext). */
export const LINK_TYPE: Record<string, string> = {
  SHARE_CANDIDATE_ONBOARD: "Onboard invite",
  JOB_APPLY: "Job link",
};

export type ReferralPipelineStatusKey =
  | "profile_complete"
  | "applied"
  | "in_review"
  | "hired"
  | "rejected"
  | "pending"
  | "withdrawn"
  | "job_removed";

export const STATUS_META: Record<
  ReferralPipelineStatusKey,
  { label: string; color: string; bg: string }
> = {
  profile_complete: { label: "Profile complete", color: "#10b981", bg: "#d1fae5" },
  applied: { label: "Applied", color: "#3b82f6", bg: "#dbeafe" },
  in_review: { label: "In review", color: "#f59e0b", bg: "#fef3c7" },
  hired: { label: "Hired", color: "#8b5cf6", bg: "#ede9fe" },
  rejected: { label: "Rejected", color: "#ef4444", bg: "#fee2e2" },
  pending: { label: "Pending", color: "#6b7280", bg: "#f3f4f6" },
  withdrawn: { label: "Withdrawn", color: "#78716c", bg: "#e7e5e4" },
  job_removed: { label: "Job removed", color: "#92400e", bg: "#fef3c7" },
};

export function getStatusMeta(
  key: string | null | undefined
): (typeof STATUS_META)[ReferralPipelineStatusKey] {
  if (key && key in STATUS_META) {
    return STATUS_META[key as ReferralPipelineStatusKey];
  }
  return STATUS_META.pending;
}

export type LifecycleStageKey =
  | "applied"
  | "interview"
  | "offered"
  | "preboarding"
  | "joined_pending_start"
  | "employee"
  | "resigned"
  | "pending";

export const LIFECYCLE_STAGE_META: Record<LifecycleStageKey, { label: string; color: string; bg: string }> = {
  applied: { label: "Applied", color: "#1d4ed8", bg: "#dbeafe" },
  interview: { label: "Interview", color: "#b45309", bg: "#fef3c7" },
  offered: { label: "Offered", color: "#0f766e", bg: "#ccfbf1" },
  preboarding: { label: "Preboarding", color: "#6d28d9", bg: "#ede9fe" },
  joined_pending_start: { label: "Joined", color: "#0e7490", bg: "#cffafe" },
  employee: { label: "Employee", color: "#047857", bg: "#d1fae5" },
  resigned: { label: "Resigned", color: "#be123c", bg: "#ffe4e6" },
  pending: { label: "Pending", color: "#4b5563", bg: "#f3f4f6" },
};

export const EMPLOYEE_STATUS_META: Record<"active" | "resigned", { label: string; color: string; bg: string }> = {
  active: { label: "Active", color: "#047857", bg: "#d1fae5" },
  resigned: { label: "Resigned", color: "#be123c", bg: "#ffe4e6" },
};

export function getLifecycleStageMeta(key: string | undefined | null) {
  return LIFECYCLE_STAGE_META[(key as LifecycleStageKey) || "pending"] ?? LIFECYCLE_STAGE_META.pending;
}
