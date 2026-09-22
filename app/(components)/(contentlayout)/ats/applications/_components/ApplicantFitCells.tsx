"use client";

import type { ApplicantFit } from "@/shared/lib/api/jobApplications";
import { openApplicantFitInfo } from "./ApplicantFitInfoDrawer";

const SUCCESS_CLASS: Record<string, string> = {
  Strong: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  Good: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
  Partial: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
  Poor: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
};

const CULTURE_CLASS: Record<ApplicantFit["culturalFit"], string> = {
  fit: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  not_fit: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
  unclear: "bg-stone-500/15 text-stone-700 dark:text-stone-300 border-stone-500/30",
};

/**
 * Whether this row still needs the background LLM overlay.
 * @param fit Server-attached applicantFit payload
 */
export function applicantFitNeedsWarm(fit?: ApplicantFit | null): boolean {
  return fit?.source === "heuristic";
}

/**
 * Hover/accessible summary for a fit badge.
 * @param fit Server-attached applicantFit payload
 */
function fitTitle(fit: ApplicantFit): string {
  return [fit.rationale, fit.source === "llm" ? "AI scored" : "Skill match"].filter(Boolean).join(" · ");
}

/**
 * Success-probability badge for the applications table.
 * @param props.fit Server overlay; missing renders an em dash
 */
export function SuccessProbabilityCell({ fit }: { fit?: ApplicantFit | null }) {
  if (!fit) {
    return <span className="text-gray-400 dark:text-gray-500">—</span>;
  }
  const cls = SUCCESS_CLASS[fit.successLabel] || SUCCESS_CLASS.Poor;
  const title = fitTitle(fit);
  return (
    <span
      className={`badge border !rounded-md !px-2 !py-1 text-xs font-medium ${cls}`}
      title={title}
      aria-label={`Success probability ${fit.successProbability} percent, ${fit.successLabel}. ${title}`}
    >
      {fit.successProbability}%
    </span>
  );
}

/**
 * Cultural-fit badge. Heuristic "unclear" stays an em dash until the LLM overlay lands.
 * @param props.fit Server overlay
 */
export function CulturalFitCell({ fit }: { fit?: ApplicantFit | null }) {
  if (!fit || (fit.culturalFit === "unclear" && fit.source === "heuristic")) {
    return <span className="text-gray-400 dark:text-gray-500">—</span>;
  }
  const cls = CULTURE_CLASS[fit.culturalFit] || CULTURE_CLASS.unclear;
  const title = fitTitle(fit);
  return (
    <span
      className={`badge border !rounded-md !px-2 !py-1 text-xs font-medium ${cls}`}
      title={title}
      aria-label={`Cultural fit: ${fit.culturalLabel}. ${title}`}
    >
      {fit.culturalLabel}
    </span>
  );
}

/**
 * Compact mobile-card chips for success + culture.
 * @param props.fit Server overlay
 */
export function ApplicantFitChips({ fit }: { fit?: ApplicantFit | null }) {
  if (!fit) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center rounded border border-primary/30 bg-primary/10 px-1 py-px text-[9px] font-semibold uppercase tracking-wide text-primary">
        AI
      </span>
      <span className="text-[0.6875rem] uppercase tracking-wide text-[#8c9097] dark:text-white/50">Success</span>
      <SuccessProbabilityCell fit={fit} />
      <span className="text-[0.6875rem] uppercase tracking-wide text-[#8c9097] dark:text-white/50">Culture</span>
      <CulturalFitCell fit={fit} />
      <button
        type="button"
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        aria-label="How Success and Culture are calculated with AI"
        title="How AI calculates Success and Culture"
        onClick={openApplicantFitInfo}
      >
        <i className="ri-information-line text-sm" aria-hidden />
      </button>
    </div>
  );
}
