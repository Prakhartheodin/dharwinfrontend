"use client";

import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { Fragment, useCallback, useEffect, useState } from "react";
import { useAuth } from "@/shared/contexts/auth-context";
import {
  listJobApplications,
  updateJobApplicationStatus,
  type JobApplication,
  type JobApplicationStatus,
} from "@/shared/lib/api/jobApplications";
import { listJobs, type Job } from "@/shared/lib/api/jobs";
import { listRecruiters } from "@/shared/lib/api/users";
import type { User } from "@/shared/lib/types";
import {
  isPublicEmail,
  isInternalRelayEmail,
  pickPublicEmail,
  resolveApplicantEmail,
  dedupeApplicants,
} from "@/shared/lib/ats/applicant-email";

const PIPELINE_STATUSES: JobApplicationStatus[] = [
  "Applied",
  "Screening",
  "Interview",
  "Shortlisted",
  "Offered",
  "Hired",
  "Rejected",
];

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
  };
};

function getResumeUrl(app: ApplicationWithDocs): string | null {
  const docs = app.candidate?.documents ?? [];
  const resume = docs.find((d) => d?.type === "Resume" || d?.type === "CV/Resume");
  return resume?.url || null;
}

export default function ApplicationsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [rows, setRows] = useState<ApplicationWithDocs[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [confirmReject, setConfirmReject] = useState<ApplicationWithDocs | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<JobApplicationStatus | "">("");
  const [jobFilter, setJobFilter] = useState("");
  const [recruiterFilter, setRecruiterFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("createdAt:desc");

  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [jobOptions, setJobOptions] = useState<Job[]>([]);
  const [recruiterOptions, setRecruiterOptions] = useState<User[]>([]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    listJobs({ limit: 500 })
      .then((res) => setJobOptions(res.results ?? []))
      .catch(() => setJobOptions([]));
    listRecruiters({ limit: 500 })
      .then((res) => setRecruiterOptions(res.results ?? []))
      .catch(() => setRecruiterOptions([]));
  }, []);

  const fetchApplications = useCallback(() => {
    setLoading(true);
    const params: Parameters<typeof listJobApplications>[0] = {
      limit: pageSize,
      page,
      sortBy,
      // Drop synthetic offer-letter placeholder applications from the recruiter dashboard.
      // They have no real applicant and surface as "Email hidden" rows otherwise.
      excludeInternal: true,
    };
    if (debouncedSearch) params.q = debouncedSearch;
    if (statusFilter) params.status = statusFilter;
    if (jobFilter) params.jobId = jobFilter;
    if (recruiterFilter) params.recruiterId = recruiterFilter;
    if (departmentFilter.trim()) params.department = departmentFilter.trim();
    if (dateFrom) params.dateFrom = new Date(dateFrom).toISOString();
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      params.dateTo = to.toISOString();
    }

    listJobApplications(params)
      .then((res) => {
        setRows(dedupeApplicants((res.results ?? []) as ApplicationWithDocs[]));
        setTotalResults(res.totalResults ?? 0);
        setTotalPages(res.totalPages ?? 1);
      })
      .catch((err) => {
        // Surface failure so empty-state ≠ silent backend rejection.
        // Prior bug: excludeInternal missing from Joi validator → 400 → blank page.
        console.error("[applications:list] request failed", {
          params,
          status: err?.response?.status,
          message: err?.response?.data?.message ?? err?.message,
        });
        setRows([]);
        setTotalResults(0);
        setTotalPages(1);
      })
      .finally(() => setLoading(false));
  }, [page, sortBy, debouncedSearch, statusFilter, jobFilter, recruiterFilter, departmentFilter, dateFrom, dateTo]);

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

  const clearAllFilters = () => {
    setSearch("");
    setStatusFilter("");
    setJobFilter("");
    setRecruiterFilter("");
    setDepartmentFilter("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const activeFilterCount =
    (search ? 1 : 0) +
    (statusFilter ? 1 : 0) +
    (jobFilter ? 1 : 0) +
    (recruiterFilter ? 1 : 0) +
    (departmentFilter ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0);

  const showingStart = totalResults === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingEnd = Math.min(page * pageSize, totalResults);

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
      <div className="container-fluid pt-6 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-defaulttextcolor dark:text-white tracking-tight flex items-center gap-3">
              Applications
              <span className="inline-flex items-center justify-center min-w-[2rem] h-6 px-2 rounded-full text-xs font-medium bg-defaulttextcolor/10 dark:bg-white/10 text-defaulttextcolor dark:text-white/80">
                {loading ? "…" : totalResults}
              </span>
            </h1>
            <p className="text-[0.75rem] text-[#8c9097] dark:text-white/50 mt-1">
              All candidate applications across every job in your ATS pipeline.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/ats/jobs"
              className="ti-btn ti-btn-light !py-1.5 !px-3 !text-xs !m-0 !font-medium"
              aria-label="Back to jobs"
            >
              <i className="ri-briefcase-line align-middle me-1" /> Jobs
            </Link>
            <Link
              href="/ats/analytics"
              className="ti-btn ti-btn-primary !py-1.5 !px-3 !text-xs !m-0 !font-medium"
              aria-label="View analytics"
            >
              <i className="ri-line-chart-line align-middle me-1" /> Analytics
            </Link>
          </div>
        </div>

        {/* Status pipeline strip */}
        <div className="box">
          <div className="box-body !py-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("");
                  setPage(1);
                }}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
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
                  className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
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

        {/* Filters bar */}
        <div className="box">
          <div className="box-body">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="lg:col-span-2">
                <label className="text-[0.6875rem] uppercase tracking-wide text-[#8c9097] dark:text-white/50 mb-1 block">
                  Search
                </label>
                <div className="flex items-center w-full rounded-sm border border-defaultborder dark:border-defaultborder/10 bg-white dark:bg-bodybg focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-colors h-[2.125rem]">
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
                    className="flex-1 min-w-0 h-full bg-transparent border-0 outline-none focus:outline-none focus:ring-0 text-[0.8125rem] text-defaulttextcolor dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/40 pe-3"
                  />
                </div>
              </div>

              <div>
                <label className="text-[0.6875rem] uppercase tracking-wide text-[#8c9097] dark:text-white/50 mb-1 block">
                  Job
                </label>
                <select
                  value={jobFilter}
                  onChange={(e) => {
                    setJobFilter(e.target.value);
                    setPage(1);
                  }}
                  className="ti-form-select form-select-sm w-full"
                  aria-label="Filter by job"
                >
                  <option value="">All jobs</option>
                  {jobOptions.map((j) => {
                    const id = String(j._id ?? j.id ?? "");
                    return (
                      <option key={id} value={id}>
                        {j.title ?? "Untitled"}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="text-[0.6875rem] uppercase tracking-wide text-[#8c9097] dark:text-white/50 mb-1 block">
                  Recruiter
                </label>
                <select
                  value={recruiterFilter}
                  onChange={(e) => {
                    setRecruiterFilter(e.target.value);
                    setPage(1);
                  }}
                  className="ti-form-select form-select-sm w-full"
                  aria-label="Filter by recruiter"
                >
                  <option value="">All recruiters</option>
                  {recruiterOptions.map((r) => {
                    const id = String(r.id ?? "");
                    return (
                      <option key={id} value={id}>
                        {r.name ?? r.email ?? "Unnamed"}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="text-[0.6875rem] uppercase tracking-wide text-[#8c9097] dark:text-white/50 mb-1 block">
                  Department
                </label>
                <input
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
                  className="ti-form-control form-control-sm w-full"
                />
              </div>

              <div>
                <label className="text-[0.6875rem] uppercase tracking-wide text-[#8c9097] dark:text-white/50 mb-1 block">
                  Applied from
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                  aria-label="Date from"
                  className="ti-form-control form-control-sm w-full"
                />
              </div>

              <div>
                <label className="text-[0.6875rem] uppercase tracking-wide text-[#8c9097] dark:text-white/50 mb-1 block">
                  Applied to
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                  aria-label="Date to"
                  className="ti-form-control form-control-sm w-full"
                />
              </div>

              <div>
                <label className="text-[0.6875rem] uppercase tracking-wide text-[#8c9097] dark:text-white/50 mb-1 block">
                  Sort
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="ti-form-select form-select-sm w-full"
                  aria-label="Sort"
                >
                  <option value="createdAt:desc">Newest first</option>
                  <option value="createdAt:asc">Oldest first</option>
                  <option value="updatedAt:desc">Recently updated</option>
                  <option value="status:asc">Status (A–Z)</option>
                </select>
              </div>
            </div>

            {activeFilterCount > 0 && (
              <div className="mt-3 flex items-center gap-2 text-xs">
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

        {/* Table */}
        <div className="box">
          <div className="box-body !p-0">
            <div className="table-responsive">
              <table className="table table-hover whitespace-nowrap table-bordered min-w-full text-sm">
                <thead>
                  <tr>
                    <th scope="col" className="!text-start">Applicant</th>
                    <th scope="col" className="!text-start">Applied Job</th>
                    <th scope="col" className="!text-start">Department</th>
                    <th scope="col" className="!text-start">Status</th>
                    <th scope="col" className="!text-start">Applied Date</th>
                    <th scope="col" className="!text-start">Recruiter</th>
                    <th scope="col" className="!text-start">Resume</th>
                    <th scope="col" className="!text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    [...Array(6)].map((_, i) => (
                      <tr key={`s-${i}`} className="border border-inherit border-solid dark:border-defaultborder/10">
                        <td colSpan={8} className="!py-3">
                          <div className="h-5 w-full bg-gray-100 dark:bg-white/5 rounded animate-pulse" />
                        </td>
                      </tr>
                    ))
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="!text-center !py-12">
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
                      </td>
                    </tr>
                  ) : (
                    rows.map((app) => {
                      const id = String(app._id ?? app.id ?? "");
                      const c = app.candidate ?? ({} as ApplicationWithDocs["candidate"]);
                      const candidateId = String(c._id ?? c.id ?? "");
                      // Note: c.owner is intentionally NOT used here. For recruiter-created
                      // candidates, Employee.owner is the recruiter's User account; using
                      // owner.name/email would leak recruiter identity into applicant rows.
                      const applicantUser = (app as any)?.applicantUser;
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
                        candidate: c as any,
                        application: app as any,
                        applicantUser,
                      });
                      const emailForMailto = candidateIsSynthetic
                        ? null
                        : pickPublicEmail([applicantUser?.email, c.email]);
                      const j = app.job ?? ({} as JobApplication["job"]);
                      const jobTitle = j.title ?? "—";
                      const dept = c.department ?? "—";
                      const recruiterName = app.appliedBy?.name ?? app.appliedBy?.email ?? "—";
                      const resumeUrl = getResumeUrl(app);
                      const isUpdating = updatingId === id;
                      const profileHref = candidateId ? `/ats/employees/edit?id=${candidateId}` : "#";

                      return (
                        <tr
                          key={id}
                          className="border border-inherit border-solid hover:bg-gray-50 dark:hover:bg-white/5 dark:border-defaultborder/10"
                        >
                          <td>
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="avatar avatar-sm bg-primary/10 text-primary rounded-md flex items-center justify-center text-xs font-semibold shrink-0">
                                {getInitials(name)}
                              </span>
                              <div className="min-w-0">
                                <Link
                                  href={profileHref}
                                  className="font-semibold text-defaulttextcolor dark:text-white hover:text-primary truncate block max-w-[14rem]"
                                >
                                  {name}
                                </Link>
                                <span className="text-[0.6875rem] text-[#8c9097] dark:text-white/50 truncate block max-w-[14rem]">
                                  {emailDisplay}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="block truncate max-w-[12rem]" title={jobTitle}>
                              {jobTitle}
                            </span>
                            {j.organisation?.name && (
                              <span className="block text-[0.6875rem] text-[#8c9097] dark:text-white/50 truncate max-w-[12rem]">
                                {j.organisation.name}
                              </span>
                            )}
                          </td>
                          <td>
                            <span className="text-[#8c9097] dark:text-white/70">{dept}</span>
                          </td>
                          <td>
                            <div className="inline-flex items-center gap-1">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[0.6875rem] font-semibold ${STATUS_STYLE[app.status]}`}>
                                {app.status}
                              </span>
                              <select
                                aria-label={`Change stage for ${name}`}
                                value={app.status}
                                disabled={isUpdating}
                                onChange={(e) => handleStatusChange(app, e.target.value as JobApplicationStatus)}
                                className="ti-form-select form-select-sm !text-[0.6875rem] !py-0.5 !px-1 !min-h-0 ml-1"
                              >
                                {PIPELINE_STATUSES.map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                              {isUpdating && <i className="ri-loader-2-line animate-spin text-[#8c9097]" />}
                            </div>
                          </td>
                          <td>
                            <span title={app.createdAt ?? ""}>{formatDate(app.createdAt)}</span>
                          </td>
                          <td>
                            <span className="text-[#8c9097] dark:text-white/70">{recruiterName}</span>
                          </td>
                          <td>
                            {resumeUrl ? (
                              <a
                                href={resumeUrl}
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
                          <td className="!text-end">
                            <div className="inline-flex items-center gap-1 justify-end">
                              <Link
                                href={profileHref}
                                title="View candidate"
                                aria-label="View candidate"
                                className="inline-flex items-center justify-center w-7 h-7 rounded-md text-[#8c9097] hover:bg-primary/10 hover:text-primary"
                              >
                                <i className="ri-user-3-line text-[0.875rem]" />
                              </Link>
                              <a
                                href={emailForMailto ? `mailto:${emailForMailto}` : "#"}
                                title={emailForMailto ? "Send message" : "No public email on file"}
                                aria-label="Send message"
                                onClick={(e) => {
                                  if (!emailForMailto) e.preventDefault();
                                }}
                                className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-[#8c9097] hover:bg-primary/10 hover:text-primary ${emailForMailto ? "" : "opacity-40 pointer-events-none"}`}
                              >
                                <i className="ri-mail-line text-[0.875rem]" />
                              </a>
                              <button
                                type="button"
                                title="Schedule interview"
                                aria-label="Schedule interview"
                                onClick={() => {
                                  if (!id) {
                                    router.push("/ats/interviews");
                                    return;
                                  }
                                  const params = new URLSearchParams();
                                  params.set("openSchedule", "1");
                                  params.set("applicationId", id);
                                  if (candidateId) params.set("candidateId", candidateId);
                                  const jId = String(j._id ?? j.id ?? "");
                                  if (jId) params.set("jobId", jId);
                                  const url = `/ats/interviews?${params.toString()}`;
                                  console.log("[Schedule click] navigating to", url, { id, candidateId, jId });
                                  router.push(url);
                                }}
                                className="inline-flex items-center justify-center w-7 h-7 rounded-md text-[#8c9097] hover:bg-primary/10 hover:text-primary"
                              >
                                <i className="ri-calendar-event-line text-[0.875rem]" />
                              </button>
                              <button
                                type="button"
                                title="Reject"
                                aria-label="Reject"
                                disabled={isUpdating || app.status === "Rejected"}
                                onClick={() => setConfirmReject(app)}
                                className="inline-flex items-center justify-center w-7 h-7 rounded-md text-[#8c9097] hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#8c9097]"
                              >
                                <i className="ri-close-circle-line text-[0.875rem]" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {totalResults > 0 && (
            <div className="box-footer">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-[0.75rem] text-[#8c9097] dark:text-white/60">
                  Showing {showingStart}–{showingEnd} of {totalResults}
                </div>
                <nav aria-label="Pagination" className="pagination-style-4">
                  <ul className="ti-pagination mb-0 flex items-center gap-1">
                    <li className={`page-item ${page <= 1 ? "disabled" : ""}`}>
                      <button
                        type="button"
                        className="page-link"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                      >
                        Prev
                      </button>
                    </li>
                    <li className="page-item">
                      <span className="page-link !text-defaulttextcolor dark:!text-white !bg-transparent">
                        Page {page} of {totalPages}
                      </span>
                    </li>
                    <li className={`page-item ${page >= totalPages ? "disabled" : ""}`}>
                      <button
                        type="button"
                        className="page-link !text-primary"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                      >
                        Next
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
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
