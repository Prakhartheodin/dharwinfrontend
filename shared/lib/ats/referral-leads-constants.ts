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
  | "pending";

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
};

export function getStatusMeta(
  key: string | null | undefined
): (typeof STATUS_META)[ReferralPipelineStatusKey] {
  if (key && key in STATUS_META) {
    return STATUS_META[key as ReferralPipelineStatusKey];
  }
  return STATUS_META.pending;
}
