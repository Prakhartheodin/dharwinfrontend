"use client";

import React from "react";
import type { PublicResumeParseSkill } from "@/shared/lib/api/jobs";
import type { PublicResumeParseUiStatus } from "@/shared/hooks/usePublicResumeParse";

export type PublicResumeParseFeedbackProps = {
  parseStatus: PublicResumeParseUiStatus;
  parseMessage: string | null;
  suggestedSkills: PublicResumeParseSkill[];
  onRetry?: () => void;
  showSkills?: boolean;
};

export function PublicResumeParseFeedback({
  parseStatus,
  parseMessage,
  suggestedSkills,
  onRetry,
  showSkills = true,
}: PublicResumeParseFeedbackProps) {
  if (parseStatus === "idle") return null;

  const statusText =
    parseStatus === "parsing"
      ? "Reading your resume and suggesting form values…"
      : parseStatus === "prefill_ready"
        ? parseMessage || "Resume details added. Please review before submitting."
        : parseMessage || "Could not parse your resume. You can still apply manually.";

  const tone =
    parseStatus === "parse_failed"
      ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
      : parseStatus === "parsing"
        ? "border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-100"
        : "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100";

  return (
    <div className="space-y-3">
      <div
        role="status"
        aria-live="polite"
        aria-busy={parseStatus === "parsing"}
        className={`rounded-lg border px-3 py-2 text-sm ${tone}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p>{statusText}</p>
          {parseStatus === "parse_failed" && onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="shrink-0 font-semibold underline underline-offset-2 hover:no-underline"
            >
              Retry parse
            </button>
          ) : null}
        </div>
      </div>

      {showSkills && suggestedSkills.length > 0 ? (
        <div>
          <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Detected skills</p>
          <div className="flex flex-wrap gap-2" aria-label="Detected skills from resume">
            {suggestedSkills.map((skill) => (
              <span
                key={skill.name}
                className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200"
              >
                {skill.name}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
