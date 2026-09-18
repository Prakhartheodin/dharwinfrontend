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
  /** Live narration of what the parse is doing right now, from the stream events. */
  activity?: string | null;
  /** Skill names streamed so far, shown as chips while the model is still writing. */
  streamingSkills?: string[];
};

export function PublicResumeParseFeedback({
  parseStatus,
  parseMessage,
  suggestedSkills,
  onRetry,
  showSkills = true,
  activity,
  streamingSkills = [],
}: PublicResumeParseFeedbackProps) {
  if (parseStatus === "idle") return null;

  const statusText =
    parseStatus === "parsing"
      ? // Narrate the actual step when the backend is streaming; the static sentence is the
        // fallback for a backend without the streaming route.
        activity || "Reading your resume…"
      : parseStatus === "prefill_ready"
        ? parseMessage || "Resume details added. Please review before submitting."
        : parseMessage || "Could not parse your resume. You can still apply manually.";

  // A finished parse is not a success the user can move past — it is a prompt to check our work.
  // Green reads as "done and correct"; the informational tone keeps attention on the review step.
  const tone =
    parseStatus === "parse_failed"
      ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
      : "border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-100";

  const icon =
    parseStatus === "parse_failed"
      ? "ri-error-warning-line"
      : parseStatus === "parsing"
        ? "ri-loader-4-line animate-spin motion-reduce:animate-none"
        : "ri-information-line";

  return (
    <div className="space-y-3">
      <div
        role="status"
        aria-live="polite"
        aria-busy={parseStatus === "parsing"}
        className={`rounded-lg border px-3 py-2 text-sm ${tone}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="flex min-w-0 flex-1 items-start gap-2">
            <i className={`${icon} mt-0.5 shrink-0`} aria-hidden />
            <span>{statusText}</span>
          </p>
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

        {/*
          Chips land one at a time as the model names each skill. Preview only — the authoritative
          list arrives with the final result, so these are cleared the moment the parse completes.
        */}
        {parseStatus === "parsing" && streamingSkills.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Skills found so far">
            {streamingSkills.map((name) => (
              <li
                key={name}
                className="rounded-full border border-blue-200 bg-white/70 px-2.5 py-1 text-xs font-medium text-blue-800 motion-safe:animate-[fadeIn_0.25s_ease-out] dark:border-blue-800 dark:bg-blue-900/40 dark:text-blue-100"
              >
                {name}
              </li>
            ))}
          </ul>
        ) : null}
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
