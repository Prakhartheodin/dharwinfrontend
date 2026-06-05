import { roleResponsibilitiesLinesToHtml } from "@/shared/lib/ats/jobDescriptionHtml";
import { normalizeTipTapHtmlFromApi } from "@/shared/lib/tiptapHtml";

/**
 * Merge full JD + shorter blurb from a Job record for Enhance-with-AI context.
 */
export function combinedJobPostingDocText(job: {
  jobDescription?: string | null;
  description?: string | null;
} | null | undefined): string | undefined {
  if (!job) return undefined;
  const a = String(job.jobDescription ?? "").trim();
  const b = String(job.description ?? "").trim();
  const s = [a, b].filter(Boolean).join("\n\n").trim();
  return s.length > 0 ? s : undefined;
}

/** Primary HTML for the offer-letter job description editor (saved letter → linked job → legacy bullets). */
export function resolveOfferLetterRolesHtml(offer: {
  positionOverviewHtml?: string | null;
  roleResponsibilities?: string[] | null;
  job?: { jobDescription?: string | null; description?: string | null } | null;
}): string {
  const saved = String(offer.positionOverviewHtml ?? "").trim();
  if (saved) return normalizeTipTapHtmlFromApi(saved);
  const jobDesc = String(offer.job?.jobDescription ?? "").trim();
  if (jobDesc) return normalizeTipTapHtmlFromApi(jobDesc);
  const bullets = offer.roleResponsibilities;
  if (Array.isArray(bullets) && bullets.length) {
    return roleResponsibilitiesLinesToHtml(bullets.map((x) => String(x)));
  }
  return "";
}

/** Primary HTML for the intern training outcomes editor (saved letter → legacy bullets). */
export function resolveOfferLetterTrainingHtml(offer: {
  trainingOutcomesHtml?: string | null;
  trainingOutcomes?: string[] | null;
}): string {
  const saved = String(offer.trainingOutcomesHtml ?? "").trim();
  if (saved) return normalizeTipTapHtmlFromApi(saved);
  const bullets = offer.trainingOutcomes;
  if (Array.isArray(bullets) && bullets.length) {
    return roleResponsibilitiesLinesToHtml(bullets.map((x) => String(x)));
  }
  return "";
}
