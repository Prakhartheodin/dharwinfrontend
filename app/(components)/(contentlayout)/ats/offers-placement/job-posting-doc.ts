/**
 * Merge full JD + shorter blurb from a Job record for Enhance-with-AI context.
 */
export function combinedJobPostingDocText(job: {
  jobDescription?: string | null;
  description?: string | null;
} | null | undefined): string | undefined {
  if (!job) return undefined;
  const a = String(job.jobDescription ?? "").trim()
  const b = String(job.description ?? "").trim()
  const s = [a, b].filter(Boolean).join("\n\n").trim()
  return s.length > 0 ? s : undefined
}
