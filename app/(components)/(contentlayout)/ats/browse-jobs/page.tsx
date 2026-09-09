"use client";

import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { Fragment, useCallback, useEffect, useRef, useState } from "react";
import {
  getPublicJobs,
  getJobAlertPreference,
  updateJobAlertPreference,
  isExternalJob,
  type PublicJob,
} from "@/shared/lib/api/jobs";
import {
  formatSalaryRange,
  formatPostingDateMeta,
  formatApplicationDeadlineMeta,
  mapExperienceLevel,
} from "@/shared/lib/ats/jobMappers";
import {
  areBrowseJobsListQueryStringsEquivalent,
  buildBrowseJobsListQueryString,
  parseBrowseJobsListState,
  rememberBrowseJobsListQueryString,
} from "@/shared/lib/ats/browseJobsListQuery";
import { useAuth } from "@/shared/contexts/auth-context";
import ListPagination from "@/shared/components/ListPagination";

const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Temporary", "Internship", "Freelance"];
const EXPERIENCE_LEVELS = ["Entry Level", "Mid Level", "Senior Level", "Executive"];
const PAGE_SIZE = 12;

function normalizeJobOrigin(value: string): "" | "internal" | "external" {
  return value === "internal" || value === "external" ? value : "";
}

function formatJobTypesLabel(jobTypes: string[]): string {
  if (jobTypes.length === 0) return "All types";
  if (jobTypes.length === 1) return jobTypes[0];
  return `${jobTypes.length} selected`;
}

function deadlineUrgencyClass(urgency?: string): string {
  if (urgency === "past") return "text-danger";
  if (urgency === "near") return "text-warning";
  return "";
}

export default function BrowseJobsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const initial = parseBrowseJobsListState(searchParams);

  const [jobs, setJobs] = useState<PublicJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(initial.page);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [searchQuery, setSearchQuery] = useState(initial.search);
  const [debouncedSearch, setDebouncedSearch] = useState(initial.search);
  const [jobTypes, setJobTypes] = useState<string[]>(initial.jobTypes);
  const [location, setLocation] = useState(initial.location);
  const [experienceLevel, setExperienceLevel] = useState(initial.experienceLevel);
  const [sortBy, setSortBy] = useState(initial.sortBy);
  const [jobOrigin, setJobOrigin] = useState(initial.jobOrigin);
  const [jobAlertsOn, setJobAlertsOn] = useState(false);
  const [jobAlertsSaving, setJobAlertsSaving] = useState(false);
  const [jobTypesOpen, setJobTypesOpen] = useState(false);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevDebouncedSearchRef = useRef(initial.search);
  const jobTypesDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      setJobAlertsOn(false);
      return;
    }
    getJobAlertPreference()
      .then((pref) => setJobAlertsOn(!!pref.enabled))
      .catch(() => setJobAlertsOn(false));
  }, [user]);

  useEffect(() => {
    if (!jobTypesOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!jobTypesDropdownRef.current?.contains(event.target as Node)) {
        setJobTypesOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [jobTypesOpen]);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      const trimmedPrev = prevDebouncedSearchRef.current.trim();
      const trimmedNext = searchQuery.trim();
      if (trimmedPrev !== trimmedNext) {
        setPage(1);
      }
      prevDebouncedSearchRef.current = searchQuery;
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery]);

  const syncUrl = useCallback(() => {
    const qs = buildBrowseJobsListQueryString({
      page,
      search: debouncedSearch,
      jobTypes,
      location,
      experienceLevel,
      sortBy,
      jobOrigin,
    });
    const nextSearch = qs ? qs.slice(1) : "";
    const currentSearch = searchParams.toString();
    if (areBrowseJobsListQueryStringsEquivalent(nextSearch, currentSearch)) return;
    router.replace(qs ? `${pathname}${qs}` : pathname, { scroll: false });
    rememberBrowseJobsListQueryString(nextSearch);
  }, [
    page,
    debouncedSearch,
    jobTypes,
    location,
    experienceLevel,
    sortBy,
    jobOrigin,
    pathname,
    router,
    searchParams,
  ]);

  useEffect(() => {
    syncUrl();
  }, [syncUrl]);

  useEffect(() => {
    const fromUrl = parseBrowseJobsListState(searchParams);
    setPage((prev) => (prev === fromUrl.page ? prev : fromUrl.page));
    setSearchQuery((prev) => (prev === fromUrl.search ? prev : fromUrl.search));
    setDebouncedSearch((prev) => {
      if (prev === fromUrl.search) return prev;
      prevDebouncedSearchRef.current = fromUrl.search;
      return fromUrl.search;
    });
    setJobTypes((prev) =>
      prev.join(",") === fromUrl.jobTypes.join(",") ? prev : fromUrl.jobTypes
    );
    setLocation((prev) => (prev === fromUrl.location ? prev : fromUrl.location));
    setExperienceLevel((prev) => (prev === fromUrl.experienceLevel ? prev : fromUrl.experienceLevel));
    setSortBy((prev) => (prev === fromUrl.sortBy ? prev : fromUrl.sortBy));
    setJobOrigin((prev) => (prev === fromUrl.jobOrigin ? prev : fromUrl.jobOrigin));
  }, [searchParams]);

  useEffect(() => {
    setLoading(true);
    getPublicJobs({
      limit: PAGE_SIZE,
      page,
      search: debouncedSearch.trim() || undefined,
      jobTypes: jobTypes.length ? jobTypes : undefined,
      location: location.trim() || undefined,
      experienceLevel: experienceLevel || undefined,
      sortBy,
      jobOrigin: normalizeJobOrigin(jobOrigin) || undefined,
    })
      .then((res) => {
        const results = res.totalResults ?? 0;
        const limit = res.limit ?? PAGE_SIZE;
        setJobs(res.results ?? []);
        setTotalResults(results);
        setTotalPages(res.totalPages ?? Math.max(1, Math.ceil(results / limit)));
      })
      .catch(() => {
        setJobs([]);
        setTotalPages(1);
        setTotalResults(0);
      })
      .finally(() => setLoading(false));
  }, [page, debouncedSearch, jobTypes, location, experienceLevel, sortBy, jobOrigin]);

  const toggleJobType = (type: string) => {
    setJobTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
    setPage(1);
  };

  const clearJobTypes = () => {
    setJobTypes([]);
    setPage(1);
  };

  const handleJobAlertsToggle = async () => {
    if (!user || jobAlertsSaving) return;
    const next = !jobAlertsOn;
    setJobAlertsSaving(true);
    try {
      await updateJobAlertPreference({
        enabled: next,
        criteria: {
          jobTypes,
          location: location.trim(),
          experienceLevel,
          jobOrigin: normalizeJobOrigin(jobOrigin),
          search: debouncedSearch.trim(),
        },
      });
      setJobAlertsOn(next);
    } catch {
      // leave toggle unchanged on failure
    } finally {
      setJobAlertsSaving(false);
    }
  };

  return (
    <Fragment>
      <Seo title="Browse Jobs" />
      <div className="container-fluid pt-6">
        <div className="box custom-box mb-4">
          <div className="box-body">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end pb-3 mb-3 border-b border-defaultborder/60 dark:border-defaultborder/10">
              {user ? (
                <button
                  type="button"
                  onClick={handleJobAlertsToggle}
                  disabled={jobAlertsSaving}
                  className={`ti-btn !mb-0 !h-auto !w-auto !min-h-11 !px-4 shrink-0 whitespace-nowrap inline-flex items-center justify-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-70 ${
                    jobAlertsOn
                      ? "ti-btn-success"
                      : "ti-btn-light border border-gray-200 dark:border-defaultborder/20"
                  }`}
                  aria-pressed={jobAlertsOn}
                  aria-label={jobAlertsOn ? "Turn job alerts off" : "Turn job alerts on"}
                  aria-busy={jobAlertsSaving}
                >
                  {jobAlertsSaving ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm shrink-0"
                        role="status"
                        aria-hidden="true"
                      />
                      <span>Saving…</span>
                    </>
                  ) : (
                    <>
                      <i
                        className={`bi ${jobAlertsOn ? "bi-bell-fill" : "bi-bell-slash"} text-[0.875rem] shrink-0`}
                        aria-hidden
                      />
                      <span>{jobAlertsOn ? "Job alerts ON" : "Job alerts OFF"}</span>
                    </>
                  )}
                </button>
              ) : (
                <span className="text-xs text-defaulttextcolor/60 dark:text-white/50 shrink-0">
                  Sign in to enable job alerts
                </span>
              )}
            </div>
            <div className="grid grid-cols-12 gap-4 items-start">
              <div className="lg:col-span-3 col-span-12">
                <label className="form-label">Search</label>
                <input
                  type="text"
                  className="form-control min-h-[2.75rem]"
                  placeholder="Title, company, location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="lg:col-span-2 col-span-12 relative" ref={jobTypesDropdownRef}>
                <div className="flex items-center justify-between gap-2">
                  <label className="form-label mb-0" id="job-type-filter-label">
                    Job Type
                    {jobTypes.length > 0 ? ` (${jobTypes.length})` : ""}
                  </label>
                  {jobTypes.length > 0 && (
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline shrink-0 px-1 py-0.5"
                      onClick={clearJobTypes}
                    >
                      Clear
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  className="form-select relative min-h-[2.75rem] w-full text-start !bg-none cursor-pointer"
                  aria-expanded={jobTypesOpen}
                  aria-controls="job-type-filter-panel"
                  aria-labelledby="job-type-filter-label"
                  onClick={() => setJobTypesOpen((o) => !o)}
                >
                  <span className="block truncate text-defaulttextcolor dark:text-white/90">
                    {formatJobTypesLabel(jobTypes)}
                  </span>
                  <i
                    className={`bi bi-chevron-${jobTypesOpen ? "up" : "down"} pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-[0.75rem] opacity-60`}
                    aria-hidden
                  />
                </button>
                {jobTypesOpen && (
                  <div
                    id="job-type-filter-panel"
                    role="group"
                    aria-labelledby="job-type-filter-label"
                    className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border border-defaultborder dark:border-defaultborder/20 bg-white dark:bg-bodybg p-2 shadow-lg max-h-56 overflow-y-auto"
                  >
                    {JOB_TYPES.map((t) => {
                      const checked = jobTypes.includes(t);
                      return (
                        <label
                          key={t}
                          className="flex items-center gap-3 min-h-[2.75rem] px-2 rounded hover:bg-defaultborder/10 dark:hover:bg-white/5 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            className="form-check-input !mt-0 shrink-0 border-defaultborder dark:border-white/30"
                            checked={checked}
                            onChange={() => toggleJobType(t)}
                          />
                          <span className="text-sm text-defaulttextcolor dark:text-white/80">{t}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="lg:col-span-2 col-span-12">
                <label className="form-label">Location</label>
                <input
                  type="text"
                  className="form-control min-h-[2.75rem]"
                  placeholder="City or region"
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <div className="lg:col-span-2 col-span-12">
                <label className="form-label">Experience</label>
                <select
                  className="form-select min-h-[2.75rem]"
                  value={experienceLevel}
                  onChange={(e) => {
                    setExperienceLevel(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All</option>
                  {EXPERIENCE_LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div className="lg:col-span-2 col-span-12">
                <label className="form-label">Sort</label>
                <select
                  className="form-select min-h-[2.75rem]"
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="createdAt:desc">Newest</option>
                  <option value="createdAt:asc">Oldest</option>
                  <option value="title:asc">Title A–Z</option>
                  <option value="title:desc">Title Z–A</option>
                </select>
              </div>
              <div className="lg:col-span-1 col-span-12">
                <label className="form-label">Listing</label>
                <select
                  className="form-select min-h-[2.75rem]"
                  value={jobOrigin}
                  onChange={(e) => {
                    setJobOrigin(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All</option>
                  <option value="internal">Internal</option>
                  <option value="external">External</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="ti-btn ti-btn-primary ti-btn-loading">Loading...</div>
          </div>
        ) : jobs.length === 0 ? (
          <div className="box custom-box">
            <div className="box-body text-center py-12">
              <p className="text-defaulttextcolor dark:text-white/70">No active jobs match your filters.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-0 overflow-hidden rounded-lg border border-defaultborder dark:border-defaultborder/10 bg-white dark:bg-bodybg shadow-sm">
            {jobs.map((job, index) => {
              const id = job.id ?? "";
              const companyInitial = (job.organisation?.name || "J").charAt(0).toUpperCase();
              const { relative: postedRelative } = formatPostingDateMeta(job.createdAt);
              const deadlineMeta = formatApplicationDeadlineMeta(job.applicationDeadline);
              const metaParts = [
                postedRelative && (
                  <span key="posted" className="inline-flex items-center gap-1">
                    <i className="bi bi-clock text-[0.75rem] opacity-70" aria-hidden />
                    Posted {postedRelative}
                  </span>
                ),
                job.location && (
                  <span key="loc" className="inline-flex items-center gap-1">
                    <i className="bi bi-geo-alt text-[0.75rem] opacity-70" />
                    {job.location}
                  </span>
                ),
                job.jobType && (
                  <span key="type" className="inline-flex items-center gap-1">
                    <i className="bi bi-briefcase text-[0.75rem] opacity-70" />
                    {job.jobType}
                  </span>
                ),
                job.experienceLevel && (
                  <span key="exp" className="inline-flex items-center gap-1">
                    <i className="bi bi-mortarboard text-[0.75rem] opacity-70" />
                    {mapExperienceLevel(job.experienceLevel)}
                  </span>
                ),
                job.salaryRange && (job.salaryRange.min != null || job.salaryRange.max != null) && (
                  <span key="sal" className="inline-flex items-center gap-1">
                    <i className="bi bi-coin text-[0.75rem] opacity-70" />
                    {formatSalaryRange(job.salaryRange)}
                  </span>
                ),
                deadlineMeta.label && (
                  <span
                    key="deadline"
                    className={`inline-flex items-center gap-1 ${deadlineUrgencyClass(deadlineMeta.urgency)}`}
                  >
                    <i className="bi bi-calendar-event text-[0.75rem] opacity-70" aria-hidden />
                    {deadlineMeta.label}
                  </span>
                ),
              ].filter(Boolean);
              return (
                <Link
                  key={id}
                  href={`/ats/browse-jobs/${id}`}
                  prefetch={true}
                  onMouseEnter={() => router.prefetch(`/ats/browse-jobs/${id}`)}
                  className={"block group transition-colors duration-150 " + (index > 0 ? "border-t border-defaultborder dark:border-defaultborder/10" : "")}
                >
                  <div className="flex flex-wrap sm:flex-nowrap items-stretch sm:items-center gap-4 px-4 sm:px-5 py-4 hover:bg-defaultborder/5 dark:hover:bg-white/5">
                    <div className="shrink-0 w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-semibold text-base">
                      {companyInitial}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h5 className="font-semibold text-[1rem] text-defaulttextcolor dark:text-white group-hover:text-primary transition-colors mb-0">
                          {job.title}
                        </h5>
                        <span className="badge bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 !rounded-md !px-2 !py-0.5 text-[0.65rem] font-semibold shrink-0">
                          Open
                        </span>
                        {isExternalJob(job) ? (
                          <span className="badge bg-info/15 text-info border border-info/30 !rounded-md !px-2 !py-0.5 text-[0.65rem] font-semibold shrink-0">
                            External
                          </span>
                        ) : (
                          <span className="badge bg-secondary/15 text-secondary border border-secondary/30 !rounded-md !px-2 !py-0.5 text-[0.65rem] font-semibold shrink-0">
                            Internal
                          </span>
                        )}
                      </div>
                      <p className="text-[0.8125rem] text-defaulttextcolor/70 dark:text-white/60">
                        {job.organisation?.name}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem] text-defaulttextcolor/70 dark:text-white/55">
                        {metaParts.map((part, i) => (
                          <Fragment key={i}>
                            {i > 0 && <span className="text-defaulttextcolor/30 dark:text-white/30">·</span>}
                            {part}
                          </Fragment>
                        ))}
                      </div>
                      {job.skillTags && job.skillTags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {[...new Set(job.skillTags)].slice(0, 4).map((tag) => (
                            <span
                              key={tag}
                              className="badge bg-primary/10 text-primary !rounded-md !px-2 !py-0.5 text-[0.7rem] font-medium"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 w-full sm:w-auto sm:self-center">
                      <span className="ti-btn ti-btn-primary ti-btn-sm inline-flex flex-shrink-0 items-center justify-center gap-1.5 whitespace-nowrap !py-2 !px-5 !min-w-[8.5rem] group-hover:opacity-90 transition-opacity">
                        View & Apply
                        <i className="bi bi-arrow-right text-[0.875rem] shrink-0" aria-hidden />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {!loading && totalResults > 0 && (
          <div className="mt-6 w-full border-t border-defaultborder dark:border-defaultborder/10 pt-4 pb-5 sm:pb-6">
            <ListPagination
              page={page}
              totalPages={totalPages}
              totalResults={totalResults}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              ariaLabel="Browse jobs page navigation"
              gotoInputId="browse-jobs-goto-page"
              hideWhenSinglePage
            />
          </div>
        )}
      </div>
    </Fragment>
  );
}
