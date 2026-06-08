import type { Job } from "@/shared/lib/api/jobs";

const EXPERIENCE_MAP: Record<string, string> = {
  "Entry Level": "0-2 years",
  "Mid Level": "2-5 years",
  "Senior Level": "5-10 years",
  Executive: "10-20 years",
};

const EXPERIENCE_LEVEL_BOUNDS: Record<string, { min: number; max: number }> = {
  "Entry Level": { min: 0, max: 2 },
  "Mid Level": { min: 2, max: 5 },
  "Senior Level": { min: 5, max: 10 },
  Executive: { min: 10, max: 20 },
};

export function mapExperienceLevel(level?: string | null): string {
  if (!level) return "";
  return EXPERIENCE_MAP[level] ?? level;
}

/**
 * Single source of truth for the "Experience" string rendered in BOTH the
 * jobs listing and the job-details panel. Prefers the numeric range from
 * `minExperience`/`maxExperience`; falls back to the experienceLevel bucket
 * via {@link mapExperienceLevel} when the range is absent.
 *
 * Format conventions (intentionally identical across list + details):
 *   - both min & max present  -> "2-5 years"
 *   - only min                -> "2+ years"
 *   - only max                -> "Up to 5 years"
 *   - neither                 -> mapped experienceLevel, or ""
 */
export function formatExperience(
  min?: number | null,
  max?: number | null,
  level?: string | null
): string {
  const hasMin = typeof min === "number" && Number.isFinite(min) && min >= 0;
  const hasMax = typeof max === "number" && Number.isFinite(max) && max >= 0;
  if (hasMin && hasMax) return `${min}-${max} years`;
  if (hasMin) return `${min}+ years`;
  if (hasMax) return `Up to ${max} years`;
  return mapExperienceLevel(level);
}

export function formatSalaryRange(range?: { min?: number | null; max?: number | null; currency?: string } | null): string {
  if (!range) return "";
  const min = range.min ?? 0;
  const max = range.max ?? 0;
  if (min === 0 && max === 0) return "";
  const currency = range.currency === "USD" ? "$" : range.currency ?? "";
  const fmt = (n: number) => n.toLocaleString();
  return `${currency}${fmt(min)} - ${currency}${fmt(max)}`;
}

/** True when the job has a meaningful numeric or formatted salary (not ATS "Not specified"). */
export function isJobSalarySpecified(job: {
  salary?: string | null;
  salaryMinNum?: number | null;
  salaryMaxNum?: number | null;
}): boolean {
  const min = job.salaryMinNum;
  const max = job.salaryMaxNum;
  if (min != null || max != null) {
    if (min === 0 && max === 0) return false;
    return true;
  }
  const text = job.salary?.trim();
  if (!text) return false;
  return text.toLowerCase() !== "not specified";
}

export interface DisplayJob {
  id: string;
  jobTitle: string;
  company: string;
  location: string;
  experience: string;
  salary: string;
  active: boolean;
  status: string;
  postingDate: string;
  jobType: string;
  description?: string;
  companyInfo?: Record<string, unknown>;
  isRemote?: boolean;
  urgency?: string;
  salaryTier?: string;
  jobOrigin?: "internal" | "external";
  postedBy?: string;
  postedByEmail?: string;
  postedById?: string;
  /** Number of openings/vacancies for this job posting (defaults to 1 on backend). */
  vacancies?: number | null;
  /** Raw numeric experience years — preferred over the string for range filtering. */
  minExperienceNum?: number | null;
  maxExperienceNum?: number | null;
  /** Raw numeric salary — preferred over the string for range filtering. */
  salaryMinNum?: number | null;
  salaryMaxNum?: number | null;
}

export function mapJobToDisplay(apiJob: Job): DisplayJob {
  // createdBy may arrive as a populated object ({ _id|id, name, email }) or a bare ObjectId string.
  const cb = apiJob.createdBy as
    | { _id?: string; id?: string; name?: string; email?: string }
    | string
    | undefined;
  let postedBy: string | undefined;
  let postedByEmail: string | undefined;
  let postedById: string | undefined;
  if (cb && typeof cb === "object") {
    postedBy = cb.name?.trim() || cb.email?.trim() || undefined;
    postedByEmail = cb.email?.trim() || undefined;
    postedById = cb._id || cb.id || undefined;
  } else if (typeof cb === "string") {
    postedById = cb;
  }

  return {
    id: apiJob._id ?? apiJob.id ?? "",
    jobTitle: apiJob.title ?? "",
    company: apiJob.organisation?.name ?? "",
    location: apiJob.location ?? "",
    experience: formatExperience(apiJob.minExperience, apiJob.maxExperience, apiJob.experienceLevel),
    salary: formatSalaryRange(apiJob.salaryRange),
    active: apiJob.status === "Active",
    status: apiJob.status ?? "",
    postingDate: apiJob.createdAt ? apiJob.createdAt.split("T")[0] ?? "" : "",
    jobType: (apiJob.jobType ?? "").toLowerCase(),
    description: apiJob.jobDescription,
    companyInfo: apiJob.organisation ? { ...apiJob.organisation } : undefined,
    jobOrigin: apiJob.jobOrigin === "external" ? "external" : "internal",
    postedBy,
    postedByEmail,
    postedById,
    vacancies: apiJob.vacancies ?? null,
    minExperienceNum:
      typeof apiJob.minExperience === "number" && Number.isFinite(apiJob.minExperience)
        ? apiJob.minExperience
        : EXPERIENCE_LEVEL_BOUNDS[apiJob.experienceLevel ?? ""]?.min ?? null,
    maxExperienceNum:
      typeof apiJob.maxExperience === "number" && Number.isFinite(apiJob.maxExperience)
        ? apiJob.maxExperience
        : EXPERIENCE_LEVEL_BOUNDS[apiJob.experienceLevel ?? ""]?.max ?? null,
    salaryMinNum: (() => {
      const min = apiJob.salaryRange?.min;
      const max = apiJob.salaryRange?.max;
      if (typeof min !== "number" || !Number.isFinite(min)) return null;
      if (typeof max === "number" && Number.isFinite(max) && min === 0 && max === 0) return null;
      return min;
    })(),
    salaryMaxNum: (() => {
      const min = apiJob.salaryRange?.min;
      const max = apiJob.salaryRange?.max;
      if (typeof max !== "number" || !Number.isFinite(max)) return null;
      if (typeof min === "number" && Number.isFinite(min) && min === 0 && max === 0) return null;
      return max;
    })(),
  };
}
