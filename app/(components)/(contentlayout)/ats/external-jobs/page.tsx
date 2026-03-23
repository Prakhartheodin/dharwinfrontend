"use client";

import Seo from "@/shared/layout-components/seo/seo";
import React, { Fragment, useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useTable, useSortBy, usePagination } from "react-table";
import {
  searchExternalJobs,
  listSavedExternalJobs,
  saveExternalJob,
  unsaveExternalJob,
  type ExternalJob,
  type ExternalJobSource,
  type SavedExternalJob,
} from "@/shared/lib/api/external-jobs";
import ExternalJobPreviewPanel from "./_components/ExternalJobPreviewPanel";
import {
  ExternalJobsButtonSpinner,
  ExternalJobsTableLoader,
} from "./_components/ExternalJobsLoadingAnimation";

const SOURCE_OPTIONS: { value: ExternalJobSource; label: string }[] = [
  { value: "active-jobs-db", label: "Active Jobs DB" },
  { value: "linkedin-jobs-api", label: "LinkedIn Jobs API" },
];

const SEARCH_COOLDOWN_SEC = 5;
const PAGE_SIZES = [10, 25, 50];
/** Must match backend batch size for search `offset` steps (see /external-jobs/search). */
const SEARCH_BATCH_SIZE = 10;
const SAVED_LIST_LIMIT = 100;

function formatSalary(job: ExternalJob): string {
  if (job.salaryMin != null && job.salaryMax != null) {
    return `${job.salaryCurrency || ""} ${job.salaryMin.toLocaleString()} – ${job.salaryMax.toLocaleString()}`.trim();
  }
  if (job.salaryMin != null) return `${job.salaryCurrency || ""} ${job.salaryMin.toLocaleString()}`.trim();
  if (job.salaryMax != null) return `${job.salaryCurrency || ""} ${job.salaryMax.toLocaleString()}`.trim();
  return "—";
}

export default function ExternalJobsPage() {
  const [activeTab, setActiveTab] = useState<"search" | "saved">("search");
  const [searchResults, setSearchResults] = useState<ExternalJob[]>([]);
  const [savedJobs, setSavedJobs] = useState<SavedExternalJob[]>([]);
  const [savedPage, setSavedPage] = useState(1);
  const [savedTotal, setSavedTotal] = useState(0);
  const [searchLoading, setSearchLoading] = useState(false);
  const [savedLoading, setSavedLoading] = useState(false);
  const [searchCooldown, setSearchCooldown] = useState(0);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
  const [previewJob, setPreviewJob] = useState<ExternalJob | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [browseListedHint, setBrowseListedHint] = useState(false);

  const [filters, setFilters] = useState({
    job_title: "",
    job_location: "",
    source: "active-jobs-db" as ExternalJobSource,
    date_posted: "24h",
    remote: undefined as boolean | undefined,
  });
  const [searchOffset, setSearchOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const savedIds = useMemo(() => new Set(savedJobs.map((j) => j.externalId)), [savedJobs]);

  const loadSavedJobs = useCallback((page: number = 1) => {
    setSavedLoading(true);
    listSavedExternalJobs({ page, limit: SAVED_LIST_LIMIT })
      .then((res) => {
        setSavedJobs(res.results || []);
        setSavedTotal(res.totalResults || 0);
        setSavedPage(res.page || 1);
      })
      .catch(() => setSavedJobs([]))
      .finally(() => setSavedLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab === "saved") loadSavedJobs(1);
  }, [activeTab, loadSavedJobs]);

  useEffect(() => {
    if (searchCooldown <= 0) return;
    const t = setInterval(() => setSearchCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [searchCooldown]);

  const handleSearch = () => {
    setRateLimitError(null);
    setSearchLoading(true);
    setSearchOffset(0);
    searchExternalJobs({ ...filters, offset: 0 })
      .then((res) => {
        setSearchResults(res.jobs || []);
        setHasMore(res.hasMore || false);
        setSearchCooldown(SEARCH_COOLDOWN_SEC);
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.message || err?.message;
        if (err?.response?.status === 429) {
          setRateLimitError("Too many requests. Please wait a minute before searching again.");
        } else {
          setRateLimitError(msg || "Search failed.");
        }
        setSearchResults([]);
      })
      .finally(() => setSearchLoading(false));
  };

  const handleLoadMore = () => {
    const nextOffset = searchOffset + SEARCH_BATCH_SIZE;
    setSearchLoading(true);
    searchExternalJobs({ ...filters, offset: nextOffset })
      .then((res) => {
        setSearchResults((prev) => [...prev, ...(res.jobs || [])]);
        setHasMore(res.hasMore || false);
        setSearchOffset(nextOffset);
      })
      .catch(() => {})
      .finally(() => setSearchLoading(false));
  };

  const handleSave = async (job: ExternalJob) => {
    setSavingId(job.externalId);
    try {
      await saveExternalJob(job);
      setSavedJobs((prev) => [...prev, { ...job, savedAt: new Date().toISOString() }]);
      setBrowseListedHint(true);
    } catch {
      // ignore
    } finally {
      setSavingId(null);
    }
  };

  const handleUnsave = async (externalId: string, source: ExternalJobSource) => {
    setSavingId(externalId);
    try {
      await unsaveExternalJob(externalId, source);
      setSavedJobs((prev) => prev.filter((j) => j.externalId !== externalId));
      if (previewJob?.externalId === externalId) setPreviewJob(null);
    } catch {
      // ignore
    } finally {
      setSavingId(null);
    }
  };

  const openPreview = (job: ExternalJob) => {
    setPreviewJob(job);
  };

  useEffect(() => {
    if (!previewJob) return;
    const el = document.querySelector("#external-job-preview-panel");
    if (el) (window as any).HSOverlay?.open(el);
  }, [previewJob]);

  const closePreview = () => {
    const el = document.querySelector("#external-job-preview-panel");
    if (el) (window as any).HSOverlay?.close(el);
    setPreviewJob(null);
  };

  const displayData = activeTab === "search" ? searchResults : savedJobs;
  const isSaved = (job: ExternalJob) => savedIds.has(job.externalId);

  const remoteCount = useMemo(() => searchResults.filter((j) => j.isRemote).length, [searchResults]);

  const columns = useMemo(
    () => [
      {
        Header: "Job Title",
        accessor: "title",
        Cell: ({ row }: any) => (
          <div className="flex flex-col">
            <button
              type="button"
              className="inline-block max-w-full truncate text-start font-semibold text-gray-800 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 dark:text-white dark:ring-offset-bodybg dark:hover:text-primary"
              onClick={(e) => {
                e.stopPropagation();
                openPreview(row.original);
              }}
            >
              {row.original.title || "—"}
            </button>
            {row.original.company && (
              <span className="text-[0.7rem] text-gray-500 dark:text-gray-400">
                {row.original.company}
              </span>
            )}
          </div>
        ),
      },
      {
        Header: "Location",
        accessor: "location",
        Cell: ({ row }: any) => {
          const loc = row.original.location;
          if (!loc) return <span className="text-gray-400">—</span>;
          return (
            <div className="flex items-center gap-1.5">
              <i className="ri-map-pin-line text-gray-400 text-xs" />
              <span className="max-w-full truncate" title={loc}>
                {loc}
              </span>
            </div>
          );
        },
      },
      {
        Header: "Type",
        accessor: "jobType",
        Cell: ({ row }: any) => {
          const jt = row.original.jobType;
          if (!jt) return <span className="text-gray-400">—</span>;
          return (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="badge bg-gray-100 dark:bg-white/10 text-defaulttextcolor text-[0.7rem]">{jt}</span>
              {row.original.isRemote && (
                <span className="badge bg-success/10 text-success text-[0.7rem]">Remote</span>
              )}
            </div>
          );
        },
      },
      {
        Header: "Salary",
        id: "salary",
        Cell: ({ row }: any) => {
          const s = formatSalary(row.original);
          return (
            <span className={s === "—" ? "text-gray-400" : "font-medium text-gray-800 dark:text-white"}>
              {s}
            </span>
          );
        },
      },
      {
        Header: "Posted",
        accessor: "timePosted",
        Cell: ({ row }: any) => {
          const tp = row.original.timePosted;
          const pa = row.original.postedAt;
          const text = tp || (pa ? new Date(pa).toLocaleDateString() : "—");
          return <span className="text-gray-600 dark:text-gray-300 text-[0.8125rem]">{text}</span>;
        },
      },
      {
        Header: "Source",
        accessor: "source",
        Cell: ({ value }: any) => (
          <span
            className={`badge text-[0.7rem] ${
              value === "active-jobs-db"
                ? "bg-info/10 text-info"
                : "bg-primary/10 text-primary"
            }`}
          >
            {value === "active-jobs-db" ? "Active Jobs DB" : "LinkedIn Jobs"}
          </span>
        ),
      },
      {
        Header: "Actions",
        id: "actions",
        disableSortBy: true,
        Cell: ({ row }: any) => {
          const job = row.original;
          const saved = isSaved(job);
          const saving = savingId === job.externalId;
          return (
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={saving}
                title={saved ? "Remove from saved" : "Save job"}
                aria-label={saved ? "Remove from saved" : "Save job"}
                onClick={(e) => {
                  e.stopPropagation();
                  saved ? handleUnsave(job.externalId, job.source) : handleSave(job);
                }}
                className={`ti-btn !py-1 !px-2 !text-[0.75rem] ${
                  saved
                    ? "ti-btn-warning-full"
                    : "ti-btn-light"
                }`}
              >
                <i className={`${saved ? "ri-bookmark-fill" : "ri-bookmark-line"} ${saving ? "animate-pulse" : ""}`} aria-hidden />
              </button>
              {job.platformUrl && (
                <a
                  href={job.platformUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open listing in new tab"
                  className="ti-btn !py-1 !px-2 !text-[0.75rem] ti-btn-light"
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Open listing in new tab"
                >
                  <i className="ri-external-link-line" aria-hidden />
                </a>
              )}
            </div>
          );
        },
      },
    ],
    [savingId, savedIds]
  );

  const tableInstance = useTable(
    { columns, data: displayData, initialState: { pageIndex: 0, pageSize: 10 } as any } as any,
    useSortBy,
    usePagination
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    page,
    canNextPage,
    canPreviousPage,
    nextPage,
    previousPage,
    pageOptions,
    gotoPage,
    state: { pageIndex, pageSize },
    setPageSize,
  } = tableInstance as any;

  const totalPages = pageOptions.length;
  const prevTabRef = useRef(activeTab);

  useEffect(() => {
    if (prevTabRef.current !== activeTab) {
      prevTabRef.current = activeTab;
      gotoPage?.(0);
    }
  }, [activeTab, gotoPage]);

  /** New search (offset reset) should show page 1 — avoid staying on an empty high page index. */
  useEffect(() => {
    if (activeTab !== "search" || searchOffset !== 0) return;
    gotoPage?.(0);
  }, [searchResults, activeTab, searchOffset, gotoPage]);

  return (
    <Fragment>
      <Seo title="External Jobs" />

      <div className="container-fluid pt-6 pb-8">
        {browseListedHint && (
          <div
            className="mb-4 flex flex-wrap items-start justify-between gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-defaulttextcolor dark:text-white/90"
            role="status"
          >
            <span className="min-w-0 pt-0.5">
              <strong className="font-semibold">Listed for candidates.</strong> Saved jobs appear on{" "}
              <span className="font-medium">Browse jobs</span> automatically.
            </span>
            <button
              type="button"
              className="ti-btn ti-btn-sm ti-btn-light shrink-0"
              aria-label="Dismiss"
              onClick={() => setBrowseListedHint(false)}
            >
              Dismiss
            </button>
          </div>
        )}
        {/* Summary — matches ATS elevated card style */}
        <div className="grid grid-cols-12 gap-4 mb-6">
          <div className="xl:col-span-3 lg:col-span-6 col-span-12">
            <div className="rounded-2xl border border-defaultborder/70 bg-white/90 p-4 shadow-sm ring-1 ring-black/[0.04] backdrop-blur-[2px] dark:bg-bodybg/90 dark:ring-white/10">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/20 dark:bg-primary/20">
                  <i className="ri-search-line text-lg" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="mb-0 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-textmuted dark:text-white/45">Search results</p>
                  <p className="mb-0 text-xl font-semibold tabular-nums text-defaulttextcolor dark:text-white">{searchResults.length}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="xl:col-span-3 lg:col-span-6 col-span-12">
            <div className="rounded-2xl border border-defaultborder/70 bg-white/90 p-4 shadow-sm ring-1 ring-black/[0.04] backdrop-blur-[2px] dark:bg-bodybg/90 dark:ring-white/10">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/12 text-amber-700 ring-1 ring-amber-500/20 dark:bg-amber-500/15 dark:text-amber-300">
                  <i className="ri-bookmark-line text-lg" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="mb-0 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-textmuted dark:text-white/45">Saved jobs</p>
                  <p className="mb-0 text-xl font-semibold tabular-nums text-defaulttextcolor dark:text-white">{savedTotal || savedJobs.length}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="xl:col-span-3 lg:col-span-6 col-span-12">
            <div className="rounded-2xl border border-defaultborder/70 bg-white/90 p-4 shadow-sm ring-1 ring-black/[0.04] backdrop-blur-[2px] dark:bg-bodybg/90 dark:ring-white/10">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-700 ring-1 ring-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-300">
                  <i className="ri-home-wifi-line text-lg" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="mb-0 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-textmuted dark:text-white/45">Remote in results</p>
                  <p className="mb-0 text-xl font-semibold tabular-nums text-defaulttextcolor dark:text-white">{remoteCount}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="xl:col-span-3 lg:col-span-6 col-span-12">
            <div className="rounded-2xl border border-defaultborder/70 bg-white/90 p-4 shadow-sm ring-1 ring-black/[0.04] backdrop-blur-[2px] dark:bg-bodybg/90 dark:ring-white/10">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/12 text-sky-700 ring-1 ring-sky-500/20 dark:bg-sky-500/15 dark:text-sky-300">
                  <i className="ri-database-2-line text-lg" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="mb-0 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-textmuted dark:text-white/45">Data source</p>
                  <p className="mb-0 text-sm font-semibold leading-snug text-defaulttextcolor dark:text-white">
                    {filters.source === "active-jobs-db" ? "Active Jobs DB" : "LinkedIn Jobs API"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 flex flex-col">
            <div className="box custom-box flex h-[calc(100vh-8rem)] min-h-[28rem] flex-col overflow-hidden rounded-2xl border border-defaultborder/70 bg-white/90 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.35)] ring-1 ring-black/[0.04] backdrop-blur-[2px] dark:bg-bodybg/95 dark:ring-white/10">
              <div className="box-header flex flex-col gap-4 overflow-visible border-b border-defaultborder/80 bg-gradient-to-br from-primary/[0.07] via-transparent to-amber-500/[0.03] px-5 py-5 dark:from-primary/12 dark:to-transparent sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary shadow-inner ring-1 ring-primary/20 dark:bg-primary/20">
                    <i className="ri-global-line text-xl" aria-hidden />
                  </span>
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="box-title !mb-0 text-xl font-semibold tracking-tight text-defaulttextcolor dark:text-white sm:text-2xl">
                        External jobs
                      </h1>
                      <span
                        className="inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[0.7rem] font-semibold tabular-nums text-primary"
                        title="Rows in the current table view"
                      >
                        {displayData.length} shown
                      </span>
                    </div>
                    <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-textmuted dark:text-white/45">
                      {activeTab === "search"
                        ? "Search external listings · rate-limited API"
                        : "Jobs you saved from search"}
                    </p>
                  </div>
                </div>
                <div className="relative z-20 flex flex-wrap items-center gap-2 sm:justify-end">
                  <div className="me-2 inline-flex items-center gap-2">
                    <label
                      htmlFor="external-jobs-page-size"
                      className="mb-0 hidden whitespace-nowrap text-[0.7rem] font-semibold uppercase tracking-wide text-textmuted dark:text-white/45 sm:inline"
                    >
                      Rows
                    </label>
                    <select
                      id="external-jobs-page-size"
                      className="form-select !m-0 !h-auto !w-auto !min-w-[6.75rem] !rounded-lg !border-defaultborder/80 !py-1.5 !ps-3 !pe-10 !text-[0.75rem] !leading-normal shadow-sm dark:!border-white/15"
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      aria-label="Rows per page"
                    >
                      {PAGE_SIZES.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div
                    className="inline-flex overflow-hidden rounded-xl border border-defaultborder/80 bg-defaultbackground/40 p-0.5 dark:border-white/10 dark:bg-white/[0.04]"
                    role="tablist"
                    aria-label="External jobs view"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeTab === "search"}
                      onClick={() => setActiveTab("search")}
                      className={`ti-btn !rounded-lg !py-1.5 !px-3 !text-[0.75rem] !border-0 ${
                        activeTab === "search" ? "ti-btn-primary-full shadow-sm" : "ti-btn-ghost !bg-transparent"
                      }`}
                    >
                      <i className="ri-search-line me-1 align-middle" aria-hidden />
                      Search
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeTab === "saved"}
                      onClick={() => setActiveTab("saved")}
                      className={`ti-btn !rounded-lg !py-1.5 !px-3 !text-[0.75rem] !border-0 ${
                        activeTab === "saved" ? "ti-btn-primary-full shadow-sm" : "ti-btn-ghost !bg-transparent"
                      }`}
                    >
                      <i className="ri-bookmark-line me-1 align-middle" aria-hidden />
                      Saved
                      {(savedTotal || savedJobs.length) > 0 && (
                        <span
                          className={`ms-1.5 inline-flex min-w-[1.25rem] justify-center rounded-full px-1.5 text-[0.65rem] font-semibold tabular-nums ${
                            activeTab === "saved" ? "bg-white/25 text-white" : "bg-primary/15 text-primary dark:bg-white/10 dark:text-white/90"
                          }`}
                        >
                          {savedTotal || savedJobs.length}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </div>

            {activeTab === "search" && (
              <div className="box-body !py-4 !px-5 border-b border-defaultborder/60 bg-gradient-to-r from-slate-50/95 via-white/60 to-transparent dark:from-white/[0.04] dark:via-transparent dark:to-white/[0.02]">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="min-w-[11rem] flex-1 sm:max-w-[14rem]">
                    <label className="form-label mb-1 text-[0.7rem] font-semibold uppercase tracking-wide text-textmuted dark:text-white/50">Title</label>
                    <div className="relative">
                      <i className="ri-briefcase-line pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-sm text-textmuted dark:text-white/40" aria-hidden />
                      <input
                        type="text"
                        className="form-control !py-2 !ps-9 !pe-3 !text-[0.8125rem]"
                        placeholder="Role or keywords"
                        value={filters.job_title}
                        onChange={(e) => setFilters((f) => ({ ...f, job_title: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && !searchLoading && searchCooldown <= 0 && handleSearch()}
                      />
                    </div>
                  </div>
                  <div className="min-w-[10rem] flex-1 sm:max-w-[13rem]">
                    <label className="form-label mb-1 text-[0.7rem] font-semibold uppercase tracking-wide text-textmuted dark:text-white/50">Location</label>
                    <div className="relative">
                      <i className="ri-map-pin-line pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-sm text-textmuted dark:text-white/40" aria-hidden />
                      <input
                        type="text"
                        className="form-control !py-2 !ps-9 !pe-3 !text-[0.8125rem]"
                        placeholder="City or region"
                        value={filters.job_location}
                        onChange={(e) => setFilters((f) => ({ ...f, job_location: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && !searchLoading && searchCooldown <= 0 && handleSearch()}
                      />
                    </div>
                  </div>
                  <div className="min-w-[10rem]">
                    <label className="form-label mb-1 text-[0.7rem] font-semibold uppercase tracking-wide text-textmuted dark:text-white/50">Source</label>
                    <select
                      className="form-select !py-2 !text-[0.8125rem]"
                      value={filters.source}
                      onChange={(e) => setFilters((f) => ({ ...f, source: e.target.value as ExternalJobSource }))}
                    >
                      {SOURCE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="min-w-[9rem]">
                    <label className="form-label mb-1 text-[0.7rem] font-semibold uppercase tracking-wide text-textmuted dark:text-white/50">Posted</label>
                    <select
                      className="form-select !py-2 !text-[0.8125rem]"
                      value={filters.date_posted}
                      onChange={(e) => setFilters((f) => ({ ...f, date_posted: e.target.value }))}
                    >
                      <option value="24h">Last 24 hours</option>
                      <option value="7d">Last 7 days</option>
                    </select>
                  </div>
                  <label className="mb-2 flex cursor-pointer select-none items-center gap-2 text-[0.8125rem] text-defaulttextcolor dark:text-white/80">
                    <input
                      type="checkbox"
                      className="form-check-input !mt-0"
                      checked={filters.remote === true}
                      onChange={(e) => setFilters((f) => ({ ...f, remote: e.target.checked ? true : undefined }))}
                    />
                    Remote only
                  </label>
                  <button
                    type="button"
                    disabled={searchLoading || searchCooldown > 0}
                    onClick={handleSearch}
                    className="ti-btn ti-btn-primary-full mb-0.5 !rounded-xl !py-2 !px-5 !text-[0.8125rem] font-medium shadow-sm"
                  >
                    {searchLoading ? (
                      <>
                        <ExternalJobsButtonSpinner className="me-2 text-white" />
                        Searching…
                      </>
                    ) : searchCooldown > 0 ? (
                      <>
                        <i className="ri-time-line me-1 align-middle" aria-hidden />
                        Wait {searchCooldown}s
                      </>
                    ) : (
                      <>
                        <i className="ri-search-line me-1 align-middle" aria-hidden />
                        Run search
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {rateLimitError && (
              <div
                className="mx-5 mt-4 flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/[0.08] p-4 text-sm text-warning shadow-sm dark:border-warning/25 dark:bg-warning/10"
                role="alert"
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warning/15">
                  <i className="ri-error-warning-line text-lg" aria-hidden />
                </span>
                <span className="min-w-0 flex-1 leading-relaxed">{rateLimitError}</span>
                <button
                  type="button"
                  className="ti-btn ti-btn-sm ti-btn-ghost shrink-0 !px-2"
                  aria-label="Dismiss"
                  onClick={() => setRateLimitError(null)}
                >
                  ×
                </button>
              </div>
            )}

            <div className="box-body !p-0 flex-1 flex flex-col overflow-hidden">
              {activeTab === "saved" && savedLoading && savedJobs.length === 0 ? (
                <ExternalJobsTableLoader
                  title="Restoring your shortlist"
                  hint="Syncing saved roles from Dharwin — almost there."
                />
              ) : activeTab === "search" && searchLoading && searchResults.length === 0 ? (
                <ExternalJobsTableLoader
                  title="Scanning external feeds"
                  hint="Pulling live listings from the selected source. Large result sets may take a moment."
                />
              ) : (
                <>
                  {displayData.length > 0 && (
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-defaultborder/60 bg-gradient-to-r from-slate-50/95 via-white/60 to-transparent px-4 py-3 text-[0.72rem] font-medium text-textmuted dark:from-white/[0.04] dark:via-transparent dark:to-white/[0.02] dark:text-white/55 sm:px-5">
                      <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] px-2.5 py-1 text-primary dark:border-primary/25 dark:bg-primary/10">
                        <i className="ri-cursor-line text-[0.65rem]" aria-hidden />
                        Click a row or the job title to preview
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full border border-defaultborder/60 bg-white/60 px-2.5 py-1 dark:border-white/10 dark:bg-white/[0.04]">
                        <i className="ri-bookmark-line text-[0.65rem] opacity-70" aria-hidden />
                        Use bookmark to save without opening the drawer
                      </span>
                    </div>
                  )}
                  <div
                    className="table-responsive flex-1 overflow-y-auto rounded-b-xl bg-slate-50/40 dark:bg-black/25"
                    style={{ minHeight: 0 }}
                  >
                    <table
                      {...getTableProps()}
                      className="table min-w-full border-separate border-spacing-0 border-0 text-sm"
                    >
                      <colgroup>
                        <col className="min-w-[12rem] sm:min-w-[16rem]" />
                        <col className="w-[10rem] sm:w-[12rem]" />
                        <col className="w-[7rem] sm:w-[8rem]" />
                        <col className="w-[8rem] sm:w-[9rem]" />
                        <col className="w-[6rem] sm:w-[7rem]" />
                        <col className="w-[7rem] sm:w-[8rem]" />
                        <col className="w-[5.5rem]" />
                      </colgroup>
                      <thead>
                        {headerGroups.map((headerGroup: any, hgIdx: number) => (
                          <tr
                            {...headerGroup.getHeaderGroupProps()}
                            className="border-b border-defaultborder/70 bg-primary/[0.05] dark:border-white/10 dark:bg-primary/10"
                            key={headerGroup.getHeaderGroupProps().key ?? `hg-${hgIdx}`}
                          >
                            {headerGroup.headers.map((column: any, colIdx: number) => (
                              <th
                                {...column.getHeaderProps(column.getSortByToggleProps?.() || column.getHeaderProps())}
                                scope="col"
                                className="sticky top-0 z-10 border-b border-defaultborder/80 bg-gray-50/95 text-start shadow-[0_1px_0_0_rgba(15,23,42,0.06)] backdrop-blur-sm first:rounded-tl-none dark:border-white/10 dark:bg-bodybg/95 dark:shadow-[0_1px_0_0_rgba(255,255,255,0.06)]"
                                key={column.id ?? `col-${colIdx}`}
                                style={{ position: "sticky", top: 0, zIndex: 10 }}
                              >
                                <div className="flex items-center gap-2 px-3 py-3">
                                  <span className="tabletitle">{column.render("Header")}</span>
                                  {column.isSorted && (
                                    <span>
                                      {column.isSortedDesc ? (
                                        <i className="ri-arrow-down-s-line text-[0.875rem]" aria-hidden />
                                      ) : (
                                        <i className="ri-arrow-up-s-line text-[0.875rem]" aria-hidden />
                                      )}
                                    </span>
                                  )}
                                </div>
                              </th>
                            ))}
                          </tr>
                        ))}
                      </thead>
                      <tbody {...getTableBodyProps()}>
                        {page.length === 0 ? (
                          <tr>
                            <td colSpan={columns.length} className="!border-0 !p-0 align-top">
                              <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
                                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/20">
                                  <i
                                    className={`text-2xl ${activeTab === "search" ? "ri-inbox-archive-line" : "ri-bookmark-line"}`}
                                    aria-hidden
                                  />
                                </span>
                                <div className="max-w-md space-y-1">
                                  <p className="text-base font-semibold text-defaulttextcolor dark:text-white">
                                    {activeTab === "search" ? "No results yet" : "No saved jobs"}
                                  </p>
                                  <p className="text-sm leading-relaxed text-textmuted dark:text-white/50">
                                    {activeTab === "search"
                                      ? "Set title or location, then run search. External APIs may rate-limit repeated requests."
                                      : "Save roles from the search tab to build a shortlist here."}
                                  </p>
                                </div>
                                {activeTab === "search" && (
                                  <button
                                    type="button"
                                    className="ti-btn ti-btn-primary !rounded-xl !px-4 !py-2 !text-sm font-medium shadow-sm"
                                    disabled={searchLoading || searchCooldown > 0}
                                    onClick={handleSearch}
                                  >
                                    <i className="ri-search-line me-1.5 align-middle" aria-hidden />
                                    Run search
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ) : (
                          page.map((row: any, rowIdx: number) => {
                            prepareRow(row);
                            return (
                              <tr
                                {...row.getRowProps()}
                                className="cursor-pointer border-b border-gray-300 transition-colors odd:!bg-gray-50/80 hover:!bg-primary/[0.04] dark:border-gray-600 dark:odd:!bg-white/[0.03] dark:hover:!bg-primary/10"
                                key={row.id ?? `row-${rowIdx}`}
                                onClick={() => openPreview(row.original)}
                              >
                                {row.cells.map((cell: any, cellIdx: number) => (
                                  <td {...cell.getCellProps()} key={cell.column.id ?? `cell-${cellIdx}`} className="align-middle">
                                    {cell.render("Cell")}
                                  </td>
                                ))}
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {activeTab === "search" && searchResults.length > 0 && hasMore && (
                    <div className="border-t border-defaultborder/60 bg-defaultbackground/30 px-4 py-3 text-center dark:bg-white/[0.02]">
                      <button
                        type="button"
                        disabled={searchLoading}
                        onClick={handleLoadMore}
                        className="ti-btn ti-btn-primary-full !rounded-xl !py-2 !px-5 !text-[0.8125rem] font-medium shadow-sm"
                      >
                        {searchLoading ? (
                          <span className="inline-flex items-center gap-2">
                            <ExternalJobsButtonSpinner className="text-white" />
                            Loading…
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5">
                            <i className="ri-arrow-down-line" aria-hidden />
                            Load more from API
                          </span>
                        )}
                      </button>
                    </div>
                  )}

                  {displayData.length > 0 && (
                    <div className="box-footer flex flex-wrap items-center justify-between gap-4 border-t border-defaultborder/60 !bg-defaultbackground/60 px-4 py-3.5 dark:!bg-white/[0.03]">
                      <div className="text-sm text-textmuted dark:text-white/55">
                        <span className="block sm:inline">
                          Showing{" "}
                          <span className="font-semibold tabular-nums text-defaulttextcolor dark:text-white/90">
                            {Math.min(pageIndex * pageSize + 1, displayData.length)}
                          </span>
                          {" – "}
                          <span className="font-semibold tabular-nums text-defaulttextcolor dark:text-white/90">
                            {Math.min((pageIndex + 1) * pageSize, displayData.length)}
                          </span>{" "}
                          of{" "}
                          <span className="font-semibold tabular-nums text-defaulttextcolor dark:text-white/90">{displayData.length}</span>{" "}
                          in this table
                        </span>
                        {activeTab === "saved" && savedTotal > savedJobs.length ? (
                          <span className="mt-1 block text-xs text-amber-800/90 dark:text-amber-200/90 sm:mt-0 sm:ms-2 sm:inline">
                            · Showing first {savedJobs.length} of {savedTotal} saved
                          </span>
                        ) : null}
                      </div>
                      {totalPages > 1 && (
                        <div className="ms-auto">
                          <nav aria-label="Page navigation" className="pagination-style-4">
                            <ul className="ti-pagination mb-0">
                              <li className={`page-item ${!canPreviousPage ? "disabled" : ""}`}>
                                <button
                                  type="button"
                                  className="page-link px-3 py-[0.375rem]"
                                  onClick={() => previousPage()}
                                  disabled={!canPreviousPage}
                                >
                                  Prev
                                </button>
                              </li>
                              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                let pageNum: number;
                                if (totalPages <= 5) pageNum = i;
                                else if (pageIndex < 3) pageNum = i;
                                else if (pageIndex > totalPages - 4) pageNum = totalPages - 5 + i;
                                else pageNum = pageIndex - 2 + i;
                                return (
                                  <li key={pageNum} className={`page-item ${pageIndex === pageNum ? "active" : ""}`}>
                                    <button
                                      type="button"
                                      className="page-link px-3 py-[0.375rem]"
                                      onClick={() => (tableInstance as any).gotoPage(pageNum)}
                                    >
                                      {pageNum + 1}
                                    </button>
                                  </li>
                                );
                              })}
                              <li className={`page-item ${!canNextPage ? "disabled" : ""}`}>
                                <button
                                  type="button"
                                  className="page-link px-3 py-[0.375rem]"
                                  onClick={() => nextPage()}
                                  disabled={!canNextPage}
                                >
                                  Next
                                </button>
                              </li>
                            </ul>
                          </nav>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>

      <ExternalJobPreviewPanel
        job={previewJob}
        onClose={closePreview}
        isSaved={previewJob ? isSaved(previewJob) : false}
        onSave={handleSave}
        onUnsave={handleUnsave}
        savingId={savingId}
      />
    </Fragment>
  );
}
