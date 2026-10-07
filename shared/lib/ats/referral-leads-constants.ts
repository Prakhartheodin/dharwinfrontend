/** Display labels for referral link type (align with API referralContext). */
export const LINK_TYPE: Record<string, string> = {
  SHARE_CANDIDATE_ONBOARD: "Onboard invite",
  JOB_APPLY: "Job link",
};

export type ReferralPipelineStatusKey =
  | "profile_complete"
  | "pending"
  | "applied"
  | "in_review"
  | "interview"
  | "offer"
  | "preboarding"
  | "deferred"
  | "hired"
  | "joined"
  | "employee"
  | "resigned"
  | "rejected"
  | "withdrawn"
  | "job_removed";

export const STATUS_META: Record<
  ReferralPipelineStatusKey,
  { label: string; color: string; bg: string; badgeClass: string }
> = {
  profile_complete: {
    label: "Profile complete",
    color: "#10b981",
    bg: "#d1fae5",
    badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/35 dark:text-emerald-200",
  },
  pending: {
    label: "Pending",
    color: "#6b7280",
    bg: "#f3f4f6",
    badgeClass: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200",
  },
  applied: {
    label: "Applied",
    color: "#3b82f6",
    bg: "#dbeafe",
    badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/35 dark:text-blue-200",
  },
  in_review: {
    label: "Interview",
    color: "#f59e0b",
    bg: "#fef3c7",
    badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/35 dark:text-amber-200",
  },
  interview: {
    label: "Interview",
    color: "#f59e0b",
    bg: "#fef3c7",
    badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/35 dark:text-amber-200",
  },
  offer: {
    label: "Offer",
    color: "#0f766e",
    bg: "#ccfbf1",
    badgeClass: "bg-teal-100 text-teal-800 dark:bg-teal-900/35 dark:text-teal-200",
  },
  preboarding: {
    label: "Preboarding",
    color: "#6d28d9",
    bg: "#ede9fe",
    badgeClass: "bg-violet-100 text-violet-800 dark:bg-violet-900/35 dark:text-violet-200",
  },
  deferred: {
    label: "Deferred",
    color: "#b45309",
    bg: "#ffedd5",
    badgeClass: "bg-orange-100 text-orange-800 dark:bg-orange-900/35 dark:text-orange-200",
  },
  hired: {
    label: "Hired",
    color: "#8b5cf6",
    bg: "#ede9fe",
    badgeClass: "bg-violet-100 text-violet-800 dark:bg-violet-900/35 dark:text-violet-200",
  },
  joined: {
    label: "Joined",
    color: "#0e7490",
    bg: "#cffafe",
    badgeClass: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/35 dark:text-cyan-200",
  },
  employee: {
    label: "Employee",
    color: "#047857",
    bg: "#d1fae5",
    badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/35 dark:text-emerald-200",
  },
  resigned: {
    label: "Resigned",
    color: "#be123c",
    bg: "#ffe4e6",
    badgeClass: "bg-rose-100 text-rose-800 dark:bg-rose-900/35 dark:text-rose-200",
  },
  rejected: {
    label: "Rejected",
    color: "#ef4444",
    bg: "#fee2e2",
    badgeClass: "bg-red-100 text-red-800 dark:bg-red-900/35 dark:text-red-200",
  },
  withdrawn: {
    label: "Withdrawn",
    color: "#78716c",
    bg: "#e7e5e4",
    badgeClass: "bg-stone-100 text-stone-700 dark:bg-stone-800/50 dark:text-stone-200",
  },
  job_removed: {
    label: "Job removed",
    color: "#92400e",
    bg: "#fef3c7",
    badgeClass: "bg-amber-100 text-amber-900 dark:bg-amber-900/35 dark:text-amber-200",
  },
};

const STATUS_ALIASES: Record<string, ReferralPipelineStatusKey> = {
  in_review: "interview",
};

export function getStatusMeta(
  key: string | null | undefined
): (typeof STATUS_META)[ReferralPipelineStatusKey] {
  const normalized = key && STATUS_ALIASES[key] ? STATUS_ALIASES[key] : key;
  if (normalized && normalized in STATUS_META) {
    return STATUS_META[normalized as ReferralPipelineStatusKey];
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

export const EMPLOYEE_STATUS_META: Record<
  "active" | "resigned",
  { label: string; color: string; bg: string; badgeClass: string }
> = {
  active: {
    label: "Active",
    color: "#047857",
    bg: "#d1fae5",
    badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/35 dark:text-emerald-200",
  },
  resigned: {
    label: "Resigned",
    color: "#be123c",
    bg: "#ffe4e6",
    badgeClass: "bg-rose-100 text-rose-800 dark:bg-rose-900/35 dark:text-rose-200",
  },
};

export function getLifecycleStageMeta(key: string | undefined | null) {
  return LIFECYCLE_STAGE_META[(key as LifecycleStageKey) || "pending"] ?? LIFECYCLE_STAGE_META.pending;
}
