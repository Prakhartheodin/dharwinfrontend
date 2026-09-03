import type { ExternalJob } from "@/shared/lib/api/external-jobs";

export const EXTERNAL_JOB_TYPE_EMPTY = "Not provided";
export const EXTERNAL_JOB_SALARY_EMPTY = "Salary not listed";

export function formatExternalJobType(jobType?: string | null): string {
  return jobType?.trim() || EXTERNAL_JOB_TYPE_EMPTY;
}

export function hasExternalJobSalary(
  job: Pick<ExternalJob, "salaryMin" | "salaryMax">
): boolean {
  return job.salaryMin != null || job.salaryMax != null;
}

export function formatExternalJobSalary(
  job: Pick<ExternalJob, "salaryMin" | "salaryMax" | "salaryCurrency">
): string {
  const currency = job.salaryCurrency?.trim() || "";
  const fmt = (n: number) => n.toLocaleString();

  if (job.salaryMin != null && job.salaryMax != null) {
    return `${currency} ${fmt(job.salaryMin)} – ${fmt(job.salaryMax)}`.trim();
  }
  if (job.salaryMin != null) return `${currency} ${fmt(job.salaryMin)}`.trim();
  if (job.salaryMax != null) return `${currency} ${fmt(job.salaryMax)}`.trim();
  return EXTERNAL_JOB_SALARY_EMPTY;
}
