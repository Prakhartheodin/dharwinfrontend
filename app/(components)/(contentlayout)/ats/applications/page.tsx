"use client";

import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { Fragment, useCallback, useEffect, useRef, useState } from "react";
import ListPagination from "@/shared/components/ListPagination";
import { useAuth } from "@/shared/contexts/auth-context";
import {
  listJobApplications,
  updateJobApplicationStatus,
  type JobApplication,
  type JobApplicationStatus,
} from "@/shared/lib/api/jobApplications";
import { getJobFilterOptions, type JobFilterOptionItem } from "@/shared/lib/api/jobs";
import {
  isPublicEmail,
  isInternalRelayEmail,
  pickPublicEmail,
  resolveApplicantEmail,
} from "@/shared/lib/ats/applicant-email";
import {
  INTERVIEW_SCHEDULE_REJECTED_MESSAGE,
  isInterviewSchedulingBlocked,
  REJECTED_REOPEN_STATUSES,
} from "@/shared/lib/ats/applicationPipeline";
import { YmdFilterDateInput } from "@/shared/components/filters/YmdFilterDateInput";
import { getReferralLeadsDateRangeError } from "@/shared/lib/ymd-filter-date-input.util";

const APPLIED_TO_INPUT_ID = "applications-applied-to";

/** Same default as Onboarding / Jobs / Students / Recruiters. */
const LIST_PAGE_SIZE = 10;

function parseListPage(raw: string | null | undefined): number {
  const n = Number.parseInt(String(raw ?? ""), 10);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

const FILTER_LABEL =
  "form-label text-[0.6875rem] uppercase tracking-wide text-[#8c9097] dark:text-white/50 mb-1 block";
const FILTER_CONTROL_HEIGHT = "!h-[2.75rem] sm:!h-9";
// ti-form-select ships py-3; inside a fixed 2.75rem/9 height that clips text vertically and
// can make short labels look like ellipsis. Match ReferralLeads: form-select + zero vertical
// padding with line-height equal to control height.
const FILTER_CONTROL_TYPO =
  "!py-0 !px-3 !leading-[2.75rem] sm:!leading-9 !text-[0.875rem] sm:!text-[0.8125rem]";
const FILTER_SELECT = `form-select form-select-sm w-full min-w-0 ${FILTER_CONTROL_HEIGHT} ${FILTER_CONTROL_TYPO} !pe-9`;
const FILTER_INPUT = `ti-form-control form-control-sm w-full min-w-0 ${FILTER_CONTROL_HEIGHT} ${FILTER_CONTROL_TYPO}`;
const FILTER_DATE_INPUT = `ti-form-control form-control-sm w-full min-w-0 ${FILTER_CONTROL_HEIGHT} ${FILTER_CONTROL_TYPO} !rounded-xl`;
const FILTER_DATE_WRAPPER =
  "min-w-0 w-full [&_.react-datepicker-wrapper]:w-full [&_.react-datepicker__input-container]:w-full [&_.react-datepicker__input-container_input]:!h-[2.75rem] sm:[&_.react-datepicker__input-container_input]:!h-9 [&_.react-datepicker__input-container_input]:!py-0 [&_.react-datepicker__input-container_input]:!leading-[2.75rem] sm:[&_.react-datepicker__input-container_input]:!leading-9";

const PIPELINE_STATUSES: JobApplicationStatus[] = [
  "Applied",
  "Screening",
  "Interview",
  "Shortlisted",
  "Offered",
  "Hired",
  "Rejected",
];

// Manual transition graph — mirrors backend atsPipeline ALLOWED_TRANSITIONS.application, EXCEPT
// "Interview" is omitted as a target everywhere: it is set ONLY by scheduling an interview
// (Schedule Interview action). Terminal states (Hired/Rejected) and Interview-as-current still
// render as the locked current value. Backend re-validates; this only shapes the dropdown.
const MANUAL_NEXT_STATUSES: Record<JobApplicationStatus, JobApplicationStatus[]> = {
  Applied: ["Screening", "Rejected"],
  Screening: ["Shortlisted", "Rejected"],
  Interview: ["Shortlisted", "Offered", "Rejected"],
  Shortlisted: ["Offered", "Rejected"],
  Offered: ["Hired", "Rejected"],
  Hired: [],
  Rejected: REJECTED_REOPEN_STATUSES,
};

const STATUS_STYLE: Record<JobApplicationStatus, string> = {
  Applied: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20",
  Screening: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20",
  Interview: "bg-violet-500/10 text-violet-700 dark:text-violet-400 border border-violet-500/20",
  Shortlisted: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20",
  Offered: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20",
  Hired: "bg-emerald-600/15 text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-500/30",
  Rejected: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20",
};

function formatDate(s?: string | null): string {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function getInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join("") || "?"
  );
}

type ApplicationWithDocs = JobApplication & {
  candidate: JobApplication["candidate"] & {
    department?: string | null;
    documents?: Array<{ type?: string; url?: string }>;
    profilePicture?: { url?: string };
    employeeId?: string | null;
    referralPipelineStatus?: string | null;
  };
};

function getResumeUrl(app: ApplicationWithDocs): string | null {
  const docs = app.candidate?.documents ?? [];
  const resume = docs.find((d) => d?.type === "Resume" || d?.type === "CV/Resume");
  return resume?.url || null;
}

type ApplicationRowMeta = {
  id: string;
  candidateId: string;
  name: string;
  emailDisplay: string;
  emailForMailto: string | null;
  jobTitle: string;
  orgName?: string;
  dept: string;
  resumeUrl: string | null;
  profileHref: string;
  jobId: string;
  appliedAt?: string | null;
  isEmployee: boolean;
};

function getApplicationRowMeta(app: ApplicationWithDocs): ApplicationRowMeta {
  const id = String(app._id ?? app.id ?? "");
  const c = app.candidate ?? ({} as ApplicationWithDocs["candidate"]);
  const candidateId = String(c._id ?? c.id ?? "");
  const applicantUser = (app as { applicantUser?: { name?: string; email?: string } }).applicantUser;
  const candidateIsSynthetic = isInternalRelayEmail(c.email);
  const safeEmailForName = candidateIsSynthetic
    ? ""
    : pickPublicEmail([applicantUser?.email, c.email]) ?? "";
  const name = (
    c.fullName ||
    applicantUser?.name ||
    safeEmailForName ||
    "Unknown Applicant"
  ).trim() || "Unknown Applicant";
  const emailDisplay = resolveApplicantEmail({
    candidate: c as Parameters<typeof resolveApplicantEmail>[0]["candidate"],
    application: app as Parameters<typeof resolveApplicantEmail>[0]["application"],
    applicantUser,
  });
  const emailForMailto = candidateIsSynthetic
    ? null
    : pickPublicEmail([applicantUser?.email, c.email]);
  const j = app.job ?? ({} as JobApplication["job"]);
  return {
    id,
    candidateId,
    name,
    emailDisplay,
    emailForMailto,
    jobTitle: j.title ?? "—",
    orgName: j.organisation?.name,
    dept: c.department ?? "—",
    resumeUrl: getResumeUrl(app),
    profileHref: candidateId ? `/ats/employees/edit?id=${candidateId}` : "#",
    jobId: String(j._id ?? j.id ?? ""),
    appliedAt: app.appliedAt ?? app.createdAt,
    // Employee = already on staff (permanent DBS employeeId) or fully converted in the
    // referral pipeline. Distinguishes internal-mobility applicants from outside candidates.
    isEmployee:
      Boolean(c.employeeId && String(c.employeeId).trim()) ||
      ["employee", "joined", "resigned"].includes(String(c.referralPipelineStatus ?? "")),
  };
}

// Employee = applicant is already staff (permanent DBS employeeId / converted in pipeline)
// applying internally; Candidate = not yet an employee.
function ApplicantTypeBadge({ isEmployee }: { isEmployee: boolean }) {
  return (
    <span
      className={`mt-0.5 inline-block text-[0.625rem] font-semibold px-1.5 py-0.5 rounded-full ${
        isEmployee
          ? "bg-primary/10 text-primary"
          : "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-white/60"
      }`}
    >
      {isEmployee ? "Employee" : "Candidate"}
    </span>
  );
}

function ApplicationStatusSelect({
  value,
  applicantName,
  disabled,
  onChange,
  fullWidth = false,
}: {
  value: JobApplicationStatus;
  applicantName: string;
  disabled?: boolean;
  onChange: (next: JobApplicationStatus) => void;
  fullWidth?: boolean;
}) {
  // Only the current status + its legal manual next stages. Terminal states have no next →
  // the select shows just the current value and is locked.
  const options: JobApplicationStatus[] = [value, ...MANUAL_NEXT_STATUSES[value]];
  const locked = MANUAL_NEXT_STATUSES[value].length === 0;
  return (
    <div className="flex items-center gap-2 min-w-0 w-full">
      <select
        aria-label={`Change stage for ${applicantName}`}
        value={value}
        disabled={disabled || locked}
        onChange={(e) => onChange(e.target.value as JobApplicationStatus)}
        className={`ti-form-select form-select-sm w-full min-w-[9rem] ${fullWidth ? "max-w-none" : "max-w-[12rem]"} text-sm sm:text-xs font-semibold rounded-full py-2.5 sm:py-1.5 min-h-[2.75rem] sm:min-h-0 ps-3 pe-8 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${STATUS_STYLE[value]}`}
      >
        {options.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      {disabled && <i className="ri-loader-2-line animate-spin text-[#8c9097] shrink-0" aria-hidden />}
    </div>
  );
}

function ApplicationRowActions({
  meta,
  appStatus,
  isUpdating,
  onReject,
  onSchedule,
}: {
  meta: ApplicationRowMeta;
  appStatus: JobApplicationStatus;
  isUpdating: boolean;
  onReject: () => void;
  onSchedule: () => void;
}) {
  const scheduleBlocked = isInterviewSchedulingBlocked(appStatus);
  return (
    <div className="inline-flex flex-wrap items-center gap-1 justify-start">
      <Link
        href={meta.profileHref}
        title="View candidate"
        aria-label="View candidate"
        className="inline-flex items-center justify-center w-9 h-9 sm:w-8 sm:h-8 rounded-md text-[#8c9097] hover:bg-primary/10 hover:text-primary"
      >
        <i className="ri-user-3-line text-[0.875rem]" />
      </Link>
      <a
        href={meta.emailForMailto ? `mailto:${meta.emailForMailto}` : "#"}
        title={meta.emailForMailto ? "Send message" : "No public email on file"}
        aria-label="Send message"
        onClick={(e) => {
          if (!meta.emailForMailto) e.preventDefault();
        }}
        className={`inline-flex items-center justify-center w-9 h-9 sm:w-8 sm:h-8 rounded-md text-[#8c9097] hover:bg-primary/10 hover:text-primary ${meta.emailForMailto ? "" : "opacity-40 pointer-events-none"}`}
      >
        <i className="ri-mail-line text-[0.875rem]" />
      </a>
      <button
        type="button"
        title={scheduleBlocked ? INTERVIEW_SCHEDULE_REJECTED_MESSAGE : "Schedule interview"}
        aria-label="Schedule interview"
        disabled={isUpdating || scheduleBlocked}
        onClick={onSchedule}
        className="inline-flex items-center justify-center w-9 h-9 sm:w-8 sm:h-8 rounded-md text-[#8c9097] hover:bg-primary/10 hover:text-primary disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#8c9097] disabled:cursor-not-allowed"
      >
        <i className="ri-calendar-event-line text-[0.875rem]" />
      </button>
      <button
        type="button"
        title="Reject"
        aria-label="Reject"
        disabled={isUpdating || appStatus === "Rejected"}
        onClick={onReject}
        className="inline-flex items-center justify-center w-9 h-9 sm:w-8 sm:h-8 rounded-md text-[#8c9097] hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#8c9097]"
      >
        <i className="ri-close-circle-line text-[0.875rem]" />
      </button>
    </div>
  );
}

export default function ApplicationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [rows, setRows] = useState<ApplicationWithDocs[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [confirmReject, setConfirmReject] = useState<ApplicationWithDocs | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<JobApplicationStatus | "">("");
  const [jobFilter, setJobFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("createdAt:desc");

  const [page, setPage] = useState(() => parseListPage(searchParams.get("page")));
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const fetchGenerationRef = useRef(0);
  const prevDebouncedSearchRef = useRef(debouncedSearch);

  const [jobOptions, setJobOptions] = useState<JobFilterOptionItem[]>([]);
  const [jobOptionsLoading, setJobOptionsLoading] = useState(false);
  const jobOptionsLoadedRef = useRef(false);

  useEffect(() => {
    const fromUrl = parseListPage(searchParams.get("page"));
    setPage((prev) => (prev === fromUrl ? prev : fromUrl));
  }, [searchParams]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const urlPage = parseListPage(params.get("page"));
    if (urlPage === page) return;
    if (page <= 1) params.delete("page");
    else params.set("page", String(page));
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [page, pathname, router, searchParams]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (prevDebouncedSearchRef.current === debouncedSearch) return;
    prevDebouncedSearchRef.current = debouncedSearch;
    setPage(1);
  }, [debouncedSearch]);

  const loadJobOptions = useCallback(async () => {
    if (jobOptionsLoadedRef.current) return;
    jobOptionsLoadedRef.current = true;
    setJobOptionsLoading(true);
    try {
      const options = await getJobFilterOptions();
      setJobOptions(options.jobs ?? []);
    } catch {
      jobOptionsLoadedRef.current = false;
      setJobOptions([]);
    } finally {
      setJobOptionsLoading(false);
    }
  }, []);

  const fetchApplications = useCallback(() => {
    const generation = ++fetchGenerationRef.current;
    setLoading(true);
    const params: Parameters<typeof listJobApplications>[0] = {
      limit: LIST_PAGE_SIZE,
      page,
      sortBy,
      // Drop synthetic offer-letter placeholder applications from the recruiter dashboard.
      // They have no real applicant and surface as "Email hidden" rows otherwise.
      excludeInternal: true,
    };
    if (debouncedSearch) params.q = debouncedSearch;
    if (statusFilter) params.status = statusFilter;
    if (jobFilter) params.jobId = jobFilter;
    if (departmentFilter.trim()) params.department = departmentFilter.trim();
    if (dateFrom) params.dateFrom = new Date(dateFrom).toISOString();
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      params.dateTo = to.toISOString();
    }

    listJobApplications(params)
      .then((res) => {
        if (generation !== fetchGenerationRef.current) return;
        // Backend dedupes per (job, applicant). Do not collapse the same person across jobs here.
        setRows((res.results ?? []) as ApplicationWithDocs[]);
        setTotalResults(res.totalResults ?? 0);
        setTotalPages(res.totalPages ?? 0);
      })
      .catch((err) => {
        if (generation !== fetchGenerationRef.current) return;
        // Surface failure so empty-state ≠ silent backend rejection.
        // Prior bug: excludeInternal missing from Joi validator → 400 → blank page.
        console.error("[applications:list] request failed", {
          params,
          status: err?.response?.status,
          message: err?.response?.data?.message ?? err?.message,
        });
        setRows([]);
        setTotalResults(0);
        setTotalPages(0);
      })
      .finally(() => {
        if (generation === fetchGenerationRef.current) setLoading(false);
      });
  }, [page, sortBy, debouncedSearch, statusFilter, jobFilter, departmentFilter, dateFrom, dateTo]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    fetchApplications();
  }, [user, fetchApplications]);

  const handleStatusChange = async (app: ApplicationWithDocs, next: JobApplicationStatus) => {
    const id = String(app._id ?? app.id ?? "");
    if (!id || app.status === next) return;
    setUpdatingId(id);
    try {
      const updated = await updateJobApplicationStatus(id, { status: next });
      setRows((prev) =>
        prev.map((r) =>
          String(r._id ?? r.id) === id ? ({ ...r, status: updated.status } as ApplicationWithDocs) : r,
        ),
      );
    } catch {
      // silent — keep prior status
    } finally {
      setUpdatingId(null);
    }
  };

  const handleScheduleInterview = useCallback(
    (meta: ApplicationRowMeta) => {
      if (!meta.id) {
        router.push("/ats/interviews");
        return;
      }
      const params = new URLSearchParams();
      params.set("openSchedule", "1");
      params.set("applicationId", meta.id);
      if (meta.candidateId) params.set("candidateId", meta.candidateId);
      if (meta.jobId) params.set("jobId", meta.jobId);
      router.push(`/ats/interviews?${params.toString()}`);
    },
    [router],
  );

  const clearAllFilters = () => {
    setSearch("");
    setStatusFilter("");
    setJobFilter("");
    setDepartmentFilter("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const dateRangeError = getReferralLeadsDateRangeError(dateFrom, dateTo);

  const activeFilterCount =
    (search ? 1 : 0) +
    (statusFilter ? 1 : 0) +
    (jobFilter ? 1 : 0) +
    (departmentFilter ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0);

  if (!user) {
    return (
      <>
        <Seo title="Applications" />
        <div className="container-fluid pt-6">
          <div className="box custom-box">
            <div className="box-body text-center py-8">
              <p className="text-defaulttextcolor dark:text-white/70">Sign in to manage applications.</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <Fragment>
      <Seo title="Applications" />
      <div className="container-fluid pt-4 sm:pt-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold text-defaulttextcolor dark:text-white tracking-tight flex flex-wrap items-center gap-2 sm:gap-3">
              Applications
              <span className="inline-flex items-center justify-center min-w-[2rem] h-6 px-2 rounded-full text-xs font-medium bg-defaulttextcolor/10 dark:bg-white/10 text-defaulttextcolor dark:text-white/80">
                {loading ? "…" : totalResults}
              </span>
            </h1>
            <p className="text-[0.8125rem] sm:text-[0.75rem] text-[#8c9097] dark:text-white/50 mt-1">
              All candidate applications across every job in your ATS pipeline.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto shrink-0">
            <Link
              href="/ats/jobs"
              className="ti-btn ti-btn-light !py-2.5 sm:!py-1.5 !px-3 !text-xs !m-0 !font-medium justify-center"
              aria-label="Back to jobs"
            >
              <i className="ri-briefcase-line align-middle me-1" /> Jobs
            </Link>
            <Link
              href="/ats/analytics"
              className="ti-btn ti-btn-primary !py-2.5 sm:!py-1.5 !px-3 !text-xs !m-0 !font-medium justify-center"
              aria-label="View analytics"
            >
              <i className="ri-line-chart-line align-middle me-1" /> Analytics
            </Link>
          </div>
        </div>

        {/* Status pipeline strip */}
        <div className="box">
          <div className="box-body !py-3 !px-3 sm:!px-4">
            <p className="text-[0.6875rem] uppercase tracking-wide text-[#8c9097] dark:text-white/50 mb-2 sm:sr-only">
              Pipeline stage
            </p>
            <div className="overflow-x-auto -mx-1 px-1 pb-0.5 sm:overflow-visible sm:mx-0 sm:px-0 [scrollbar-width:thin]">
              <div className="flex flex-nowrap sm:flex-wrap gap-2 min-w-max sm:min-w-0">
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("");
                  setPage(1);
                }}
                className={`shrink-0 text-xs px-3 py-2 sm:py-1.5 min-h-[2.5rem] sm:min-h-0 rounded-full border transition-colors ${
                  statusFilter === ""
                    ? "bg-primary/10 border-primary/30 text-primary font-semibold"
                    : "bg-transparent border-gray-200 dark:border-white/10 text-[#8c9097] dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/5"
                }`}
              >
                All stages
              </button>
              {PIPELINE_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setStatusFilter(s);
                    setPage(1);
                  }}
                  className={`shrink-0 text-xs px-3 py-2 sm:py-1.5 min-h-[2.5rem] sm:min-h-0 rounded-full transition-colors ${
                    statusFilter === s
                      ? `${STATUS_STYLE[s]} font-semibold`
                      : "border border-gray-200 dark:border-white/10 text-[#8c9097] dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/5"
                  }`}
                >
                  {s}
                </button>
              ))}
              </div>
            </div>
          </div>
        </div>

        {/* Filters bar */}
        <div className="box">
          <div className="box-body !p-3 sm:!p-4 space-y-3">
            <div>
              <label className="text-[0.6875rem] uppercase tracking-wide text-[#8c9097] dark:text-white/50 mb-1 block">
                Search
              </label>
              <div className="flex items-center w-full rounded-sm border border-defaultborder dark:border-defaultborder/10 bg-white dark:bg-bodybg focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-colors min-h-[2.75rem] sm:min-h-[2.125rem]">
                <i
                  aria-hidden
                  className="ri-search-line shrink-0 ms-3 me-2 text-[0.875rem] text-slate-400 dark:text-white/40"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by candidate name, email, or job title"
                  aria-label="Search applications"
                  className="flex-1 min-w-0 h-full bg-transparent border-0 outline-none focus:outline-none focus:ring-0 text-[0.875rem] sm:text-[0.8125rem] text-defaulttextcolor dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/40 pe-3"
                />
              </div>
            </div>

            <button
              type="button"
              className="xl:hidden flex items-center justify-between w-full rounded-md border border-defaultborder dark:border-defaultborder/10 px-3 py-2.5 min-h-[2.75rem] text-sm font-medium text-defaulttextcolor dark:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              onClick={() => setFiltersExpanded((open) => !open)}
              aria-expanded={filtersExpanded}
              aria-controls="applications-advanced-filters"
            >
              <span>
                More filters
                {activeFilterCount > 0 && (
                  <span className="ms-2 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-[0.6875rem] font-semibold bg-primary/10 text-primary">
                    {activeFilterCount}
                  </span>
                )}
              </span>
              <i className={`ri-arrow-${filtersExpanded ? "up" : "down"}-s-line text-lg`} aria-hidden />
            </button>

            <div
              id="applications-advanced-filters"
              className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2 items-end ${filtersExpanded ? "" : "hidden xl:grid"}`}
            >
              <div className="min-w-0">
                <label className={FILTER_LABEL} htmlFor="applications-job-filter">
                  Job
                </label>
                <select
                  id="applications-job-filter"
                  value={jobFilter}
                  onFocus={() => {
                    void loadJobOptions();
                  }}
                  onChange={(e) => {
                    setJobFilter(e.target.value);
                    setPage(1);
                  }}
                  className={FILTER_SELECT}
                  aria-label="Filter by job"
                  aria-busy={jobOptionsLoading}
                >
                  <option value="">
                    {jobOptionsLoading ? "Loading jobs…" : "All jobs"}
                  </option>
                  {jobOptions.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="min-w-0">
                <label className={FILTER_LABEL} htmlFor="applications-department-filter">
                  Department
                </label>
                <input
                  id="applications-department-filter"
                  type="text"
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  onBlur={() => setPage(1)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      setPage(1);
                      fetchApplications();
                    }
                  }}
                  placeholder="e.g. Engineering"
                  aria-label="Filter by department"
                  className={FILTER_INPUT}
                />
              </div>

              <YmdFilterDateInput
                label="Applied from"
                labelClassName={FILTER_LABEL}
                value={dateFrom}
                maxDate={dateTo || undefined}
                rangeError={dateRangeError}
                onCommit={(sanitized) => {
                  setDateFrom(sanitized);
                  setPage(1);
                }}
                portalId="applications-datepicker-portal-from"
                popperClassName="!z-[9999]"
                wrapperClassName={FILTER_DATE_WRAPPER}
                inputClassName={FILTER_DATE_INPUT}
              />

              <YmdFilterDateInput
                label="Applied to"
                labelClassName={FILTER_LABEL}
                inputId={APPLIED_TO_INPUT_ID}
                value={dateTo}
                minDate={dateFrom || undefined}
                rangeError={dateRangeError}
                onCommit={(sanitized) => {
                  setDateTo(sanitized);
                  setPage(1);
                }}
                portalId="applications-datepicker-portal-to"
                popperClassName="!z-[9999]"
                wrapperClassName={FILTER_DATE_WRAPPER}
                inputClassName={FILTER_DATE_INPUT}
              />

              <div className="min-w-0">
                <label className={FILTER_LABEL} htmlFor="applications-sort-filter">
                  Sort
                </label>
                <select
                  id="applications-sort-filter"
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setPage(1);
                  }}
                  className={FILTER_SELECT}
                  aria-label="Sort"
                >
                  <option value="createdAt:desc">Newest</option>
                  <option value="createdAt:asc">Oldest</option>
                  <option value="updatedAt:desc">Recently updated</option>
                  <option value="status:asc">Status (A–Z)</option>
                </select>
              </div>
            </div>

            {activeFilterCount > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-xs pt-1 border-t border-defaultborder/60 dark:border-white/10 xl:border-0 xl:pt-0">
                <span className="text-[#8c9097] dark:text-white/50">
                  {activeFilterCount} filter{activeFilterCount === 1 ? "" : "s"} active
                </span>
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-primary hover:underline font-medium"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Applications list */}
        <div className="box">
          <div className="box-body !p-0">
            {loading ? (
              <>
                <div className="xl:hidden divide-y divide-gray-200 dark:divide-white/10">
                  {[...Array(4)].map((_, i) => (
                    <div key={`m-sk-${i}`} className="p-4">
                      <div className="h-5 w-2/3 bg-gray-100 dark:bg-white/5 rounded animate-pulse mb-2" />
                      <div className="h-4 w-1/2 bg-gray-100 dark:bg-white/5 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
                <div className="hidden xl:block table-responsive overflow-x-auto">
                  <table className="table table-hover table-bordered min-w-[72rem] text-sm">
                    <tbody>
                      {[...Array(6)].map((_, i) => (
                        <tr key={`s-${i}`} className="border border-inherit border-solid dark:border-defaultborder/10">
                          <td colSpan={8} className="!py-3">
                            <div className="h-5 w-full bg-gray-100 dark:bg-white/5 rounded animate-pulse" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : rows.length === 0 ? (
              <div className="!text-center !py-12 px-4">
                <div className="flex flex-col items-center gap-2">
                  <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/5 text-primary">
                    <i className="ri-file-search-line text-[1.25rem]" />
                  </span>
                  <p className="font-semibold text-defaulttextcolor dark:text-white">No applications found</p>
                  <p className="text-[0.75rem] text-[#8c9097] dark:text-white/50">
                    {activeFilterCount > 0 ? "Try adjusting your filters." : "New candidate applications will appear here."}
                  </p>
                  {activeFilterCount > 0 && (
                    <button onClick={clearAllFilters} className="text-primary hover:underline text-xs mt-1">
                      Clear filters
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="xl:hidden divide-y divide-gray-200 dark:divide-white/10">
                  {rows.map((app) => {
                    const meta = getApplicationRowMeta(app);
                    const isUpdating = updatingId === meta.id;
                    return (
                      <article key={meta.id} className="p-3 sm:p-4 space-y-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="avatar avatar-sm bg-primary/10 text-primary rounded-md flex items-center justify-center text-xs font-semibold shrink-0">
                            {getInitials(meta.name)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <Link
                              href={meta.profileHref}
                              className="font-semibold text-defaulttextcolor dark:text-white hover:text-primary block truncate"
                            >
                              {meta.name}
                            </Link>
                            <span className="text-[0.6875rem] text-[#8c9097] dark:text-white/50 block truncate">
                              {meta.emailDisplay}
                            </span>
                            <ApplicantTypeBadge isEmployee={meta.isEmployee} />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div className="min-w-0">
                            <span className="text-[#8c9097] dark:text-white/50 block">Job</span>
                            <span className="font-medium text-defaulttextcolor dark:text-white truncate block" title={meta.jobTitle}>
                              {meta.jobTitle}
                            </span>
                            {meta.orgName && (
                              <span className="text-[#8c9097] dark:text-white/50 truncate block">{meta.orgName}</span>
                            )}
                          </div>
                          <div>
                            <span className="text-[#8c9097] dark:text-white/50 block">Department</span>
                            <span className="text-defaulttextcolor dark:text-white/80">{meta.dept}</span>
                          </div>
                          <div>
                            <span className="text-[#8c9097] dark:text-white/50 block">Applied</span>
                            <span className="text-defaulttextcolor dark:text-white/80">{formatDate(meta.appliedAt)}</span>
                          </div>
                        </div>
                        <div>
                          <span className="text-[0.6875rem] uppercase tracking-wide text-[#8c9097] dark:text-white/50 mb-1.5 block">
                            Status
                          </span>
                          <ApplicationStatusSelect
                            value={app.status}
                            applicantName={meta.name}
                            disabled={isUpdating}
                            onChange={(next) => handleStatusChange(app, next)}
                            fullWidth
                          />
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-defaultborder/40 dark:border-white/10">
                          {meta.resumeUrl ? (
                            <a
                              href={meta.resumeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-primary hover:underline text-xs"
                            >
                              <i className="ri-file-pdf-2-line" /> View resume
                            </a>
                          ) : (
                            <span className="text-[#8c9097]/60 text-xs">No resume</span>
                          )}
                          <ApplicationRowActions
                            meta={meta}
                            appStatus={app.status}
                            isUpdating={isUpdating}
                            onReject={() => setConfirmReject(app)}
                            onSchedule={() => handleScheduleInterview(meta)}
                          />
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div className="hidden xl:block table-responsive overflow-x-auto">
                  <table className="table table-hover table-bordered min-w-[72rem] w-full text-sm">
                    <thead>
                      <tr>
                        <th scope="col" className="!text-start min-w-[14rem]">Applicant</th>
                        <th scope="col" className="!text-start min-w-[14rem] max-w-[20rem]">Applied Job</th>
                        <th scope="col" className="!text-start min-w-[8rem]">Department</th>
                        <th scope="col" className="!text-start min-w-[11rem]">Status</th>
                        <th scope="col" className="!text-start whitespace-nowrap">Applied Date</th>
                        <th scope="col" className="!text-start whitespace-nowrap">Resume</th>
                        <th scope="col" className="!text-start min-w-[11rem]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((app) => {
                        const meta = getApplicationRowMeta(app);
                        const isUpdating = updatingId === meta.id;
                        return (
                          <tr
                            key={meta.id}
                            className="border border-inherit border-solid hover:bg-gray-50 dark:hover:bg-white/5 dark:border-defaultborder/10"
                          >
                            <td className="align-middle whitespace-nowrap">
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="avatar avatar-sm bg-primary/10 text-primary rounded-md flex items-center justify-center text-xs font-semibold shrink-0">
                                  {getInitials(meta.name)}
                                </span>
                                <div className="min-w-0">
                                  <Link
                                    href={meta.profileHref}
                                    className="font-semibold text-defaulttextcolor dark:text-white hover:text-primary truncate block max-w-[14rem]"
                                  >
                                    {meta.name}
                                  </Link>
                                  <span className="text-[0.6875rem] text-[#8c9097] dark:text-white/50 truncate block max-w-[14rem]">
                                    {meta.emailDisplay}
                                  </span>
                                  <ApplicantTypeBadge isEmployee={meta.isEmployee} />
                                </div>
                              </div>
                            </td>
                            <td className="align-middle min-w-0 max-w-[20rem]">
                              <span className="block truncate min-w-0" title={meta.jobTitle}>
                                {meta.jobTitle}
                              </span>
                              {meta.orgName && (
                                <span
                                  className="block text-[0.6875rem] text-[#8c9097] dark:text-white/50 truncate min-w-0"
                                  title={meta.orgName}
                                >
                                  {meta.orgName}
                                </span>
                              )}
                            </td>
                            <td className="align-middle whitespace-nowrap">
                              <span className="text-[#8c9097] dark:text-white/70">{meta.dept}</span>
                            </td>
                            <td className="align-middle !whitespace-normal min-w-[11rem]">
                              <ApplicationStatusSelect
                                value={app.status}
                                applicantName={meta.name}
                                disabled={isUpdating}
                                onChange={(next) => handleStatusChange(app, next)}
                              />
                            </td>
                            <td className="align-middle whitespace-nowrap">
                              <span title={meta.appliedAt ?? ""}>{formatDate(meta.appliedAt)}</span>
                            </td>
                            <td className="align-middle whitespace-nowrap">
                              {meta.resumeUrl ? (
                                <a
                                  href={meta.resumeUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-primary hover:underline text-xs"
                                  title="Open resume"
                                >
                                  <i className="ri-file-pdf-2-line" /> View
                                </a>
                              ) : (
                                <span className="text-[#8c9097]/60 text-xs">—</span>
                              )}
                            </td>
                            <td className="!text-start align-middle whitespace-nowrap">
                              <ApplicationRowActions
                                meta={meta}
                                appStatus={app.status}
                                isUpdating={isUpdating}
                                onReject={() => setConfirmReject(app)}
                                onSchedule={() => handleScheduleInterview(meta)}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
          {loading ? null : (
            <div className="box-footer !px-3 sm:!px-4">
              <ListPagination
                page={page}
                totalPages={totalPages}
                totalResults={totalResults}
                pageSize={LIST_PAGE_SIZE}
                onPageChange={setPage}
                ariaLabel="Applications page navigation"
                gotoInputId="applications-goto-page"
              />
            </div>
          )}
        </div>
      </div>

      {/* Reject confirmation modal */}
      {confirmReject && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm reject"
          onClick={() => setConfirmReject(null)}
        >
          <div
            className="bg-white dark:bg-bodybg rounded-lg shadow-xl max-w-sm w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200 dark:border-white/10">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Reject application?</h3>
            </div>
            <div className="p-4">
              <p className="text-sm text-[#8c9097] dark:text-white/70">
                {confirmReject.candidate?.fullName ?? (isPublicEmail(confirmReject.candidate?.email) ? confirmReject.candidate?.email : "This candidate")} will be moved to{" "}
                <strong>Rejected</strong>. They can be moved back to any stage later.
              </p>
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-white/10 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmReject(null)}
                className="ti-btn ti-btn-light !text-xs !py-1.5 !px-3 !m-0"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const target = confirmReject;
                  setConfirmReject(null);
                  await handleStatusChange(target, "Rejected");
                }}
                className="ti-btn !bg-rose-600 !text-white !text-xs !py-1.5 !px-3 !m-0"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  );
}
