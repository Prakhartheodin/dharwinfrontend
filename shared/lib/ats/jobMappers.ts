import type { Job } from "@/shared/lib/api/jobs";

const EXPERIENCE_MAP: Record<string, string> = {
  "Entry Level": "0-2 years",
  "Mid Level": "2-5 years",
  "Senior Level": "5-10 years",
  Executive: "10-20 years",
};

export function mapExperienceLevel(level?: string | null): string {
  if (!level) return "";
  return EXPERIENCE_MAP[level] ?? level;
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

export interface DisplayJob {
  id: string;
  jobTitle: string;
  company: string;
  location: string;
  experience: string;
  salary: string;
  active: boolean;
  postingDate: string;
  jobType: string;
  description?: string;
  companyInfo?: Record<string, unknown>;
  isRemote?: boolean;
  urgency?: string;
  salaryTier?: string;
  jobOrigin?: "internal" | "external";
}

export function mapJobToDisplay(apiJob: Job): DisplayJob {
  return {
    id: apiJob._id ?? apiJob.id ?? "",
    jobTitle: apiJob.title ?? "",
    company: apiJob.organisation?.name ?? "",
    location: apiJob.location ?? "",
    experience: mapExperienceLevel(apiJob.experienceLevel),
    salary: formatSalaryRange(apiJob.salaryRange),
    active: apiJob.status === "Active",
    postingDate: apiJob.createdAt ? apiJob.createdAt.split("T")[0] ?? "" : "",
    jobType: (apiJob.jobType ?? "").toLowerCase(),
    description: apiJob.jobDescription,
    companyInfo: apiJob.organisation ? { ...apiJob.organisation } : undefined,
    jobOrigin: apiJob.jobOrigin === "external" ? "external" : "internal",
  };
}
