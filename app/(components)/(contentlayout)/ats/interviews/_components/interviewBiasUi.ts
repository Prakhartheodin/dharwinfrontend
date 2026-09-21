import type { InterviewBiasSummary } from "@/shared/lib/api/meetings";

const CHIP_BASE =
  "inline-flex items-center justify-center border px-2 py-0.5 rounded-full font-semibold text-[0.65rem] leading-none whitespace-nowrap";

const RISK_CLASS: Record<string, string> = {
  low: "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30 dark:hover:bg-emerald-500/20",
  medium:
    "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-200 dark:border-amber-500/30 dark:hover:bg-amber-500/20",
  high: "bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30 dark:hover:bg-rose-500/20",
};

const NEUTRAL_CLASS =
  "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 dark:bg-white/5 dark:text-white/70 dark:border-white/15 dark:hover:bg-white/10";

export type BiasBadgePresentation = {
  label: string;
  className: string;
  ariaLabel: string;
};

/**
 * Compact chip copy for a quote-free biasSummary. Click opens the full review drawer.
 * @param summary list/detail biasSummary from GET /meetings
 */
export function biasBadgePresentation(summary?: InterviewBiasSummary | null): BiasBadgePresentation {
  const status = summary?.status || null;
  const risk = summary?.riskLevel || null;
  if (status === "ready" && risk) {
    const label = risk === "medium" ? "Med bias" : `${risk[0].toUpperCase()}${risk.slice(1)} bias`;
    return {
      label,
      className: `${CHIP_BASE} ${RISK_CLASS[risk] || NEUTRAL_CLASS}`,
      ariaLabel: `Open bias review, ${risk} risk`,
    };
  }
  if (status === "pending") {
    return {
      label: "Bias…",
      className: `${CHIP_BASE} bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/30`,
      ariaLabel: "Open bias review, analysis in progress",
    };
  }
  if (status === "skipped") {
    return {
      label: "Bias skip",
      className: `${CHIP_BASE} ${NEUTRAL_CLASS}`,
      ariaLabel: "Open bias review, analysis skipped",
    };
  }
  if (status === "failed") {
    return {
      label: "Bias failed",
      className: `${CHIP_BASE} ${NEUTRAL_CLASS}`,
      ariaLabel: "Open bias review, analysis failed",
    };
  }
  return {
    label: "Bias review",
    className: `${CHIP_BASE} ${NEUTRAL_CLASS}`,
    ariaLabel: "Open bias review",
  };
}
