"use client";

import React from "react";
import type { RoundProgress } from "@/shared/lib/api/meetings";

export type RoundProgressChipProps = {
  progress: RoundProgress | null | undefined;
  size?: "sm" | "md";
  /** Also render one bar per planned round. Off by default — a list row has no space. */
  showSteps?: boolean;
};

/**
 * Where a candidate is in their round plan.
 *
 * Renders NOTHING when no plan is in force. That is the pre-plan state of every existing
 * application, and "0 of 0 rounds" would read as a problem rather than as an absence
 * (audit R3).
 *
 * The sentence comes from the server (progress.label) so this chip, the round history
 * header and the Excel column cannot drift apart. The remaining count likewise comes from
 * progress.remainingCount rather than being counted here — a second derivation is what
 * this whole feature exists to avoid.
 *
 * Colour is never the only signal: the words say "passed", "Rejected at …" or how many
 * rounds are left on their own.
 */
export default function RoundProgressChip({
  progress,
  size = "sm",
  showSteps = false,
}: RoundProgressChipProps) {
  if (!progress?.hasPlan) return null;

  const tone = progress.rejectedAt
    ? "border-danger/40 bg-danger/10 text-danger"
    : progress.isComplete
      ? "border-success/40 bg-success/10 text-success"
      : "border-defaultborder bg-primary/10 text-primary dark:border-white/15";

  const pad = size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[0.7rem]";
  const note = size === "md" ? "text-xs" : "text-[0.7rem]";

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className={`inline-flex items-center rounded-md border font-medium ${pad} ${tone}`}>
        {progress.label}
      </span>

      {/* Stated, not left to arithmetic. Suppressed when rejected or complete, where the
          chip above already says the process is over and "0 remaining" adds nothing. */}
      {progress.remainingCount > 0 && !progress.rejectedAt && (
        <span className={`${note} text-textmuted dark:text-white/55`}>
          {progress.remainingCount} {progress.remainingCount === 1 ? "round" : "rounds"} remaining
        </span>
      )}

      {showSteps && (
        <span className="inline-flex items-center gap-1" aria-hidden="true">
          {progress.rows.map((row) => (
            <span
              key={row.key}
              title={`Round ${row.index} — ${row.label}: ${row.state}`}
              className={`h-1.5 w-4 rounded-full ${
                row.state === "passed"
                  ? "bg-success"
                  : row.state === "rejected"
                    ? "bg-danger"
                    : row.state === "pending"
                      ? "bg-primary/40"
                      : "bg-gray-300 dark:bg-white/15"
              }`}
            />
          ))}
        </span>
      )}

      {progress.offPlanCount > 0 && (
        <span className={`${note} text-textmuted dark:text-white/55`}>
          {progress.offPlanCount} extra {progress.offPlanCount === 1 ? "round" : "rounds"} outside the plan
        </span>
      )}
    </span>
  );
}
