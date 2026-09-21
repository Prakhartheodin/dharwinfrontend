"use client";

import type { InterviewBiasSummary } from "@/shared/lib/api/meetings";
import { biasBadgePresentation } from "./interviewBiasUi";

export type InterviewBiasBadgeProps = {
  summary?: InterviewBiasSummary | null;
  onOpen: () => void;
};

/**
 * Clickable risk chip. Opens the bias review drawer; does not change pass/fail.
 */
export default function InterviewBiasBadge({ summary, onOpen }: InterviewBiasBadgeProps) {
  const chip = biasBadgePresentation(summary);
  return (
    <button
      type="button"
      className={chip.className}
      onClick={(event) => {
        event.stopPropagation();
        onOpen();
      }}
      aria-label={chip.ariaLabel}
    >
      {chip.label}
    </button>
  );
}
