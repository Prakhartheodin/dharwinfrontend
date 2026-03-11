"use client";

import Seo from "@/shared/layout-components/seo/seo";
import React, { Fragment, useMemo, useState, useEffect, useCallback } from "react";
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

const SOURCE_OPTIONS: { value: ExternalJobSource; label: string }[] = [
  { value: "active-jobs-db", label: "Active Jobs DB" },
  { value: "linkedin-jobs-api", label: "LinkedIn Jobs API" },
];

const SEARCH_COOLDOWN_SEC = 5;
const PAGE_SIZES = [10, 25, 50];

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
    listSavedExternalJobs({ page, limit: 20 })
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
    const nextOffset = searchOffset + 10;
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
    setTimeout(() => {
      (window as any).HSOverlay?.open(document.querySelector("#external-job-preview-panel"));
    }, 50);
  };

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
            <span
              className="font-semibold text-gray-800 dark:text-white cursor-pointer hover:text-primary transition-colors"
              onClick={() => openPreview(row.original)}
            >
              {row.original.title || "—"}
            </span>
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
              <span className="max-w-[180px] truncate" title={loc}>{loc}</span>
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
                <i className={`${saved ? "ri-bookmark-fill" : "ri-bookmark-line"} ${saving ? "animate-pulse" : ""}`} />
              </button>
              {job.platformUrl && (
                <a
                  href={job.platformUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open on LinkedIn"
                  className="ti-btn !py-1 !px-2 !text-[0.75rem] ti-btn-light"
                  onClick={(e) => e.stopPropagation()}
                >
                  <i className="ri-external-link-line" />
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
    state: { pageIndex, pageSize },
    setPageSize,
  } = tableInstance as any;

  const totalPages = pageOptions.length;

  return (
    <Fragment>
      <Seo title="External Jobs" />

      {/* Summary Cards */}
      <div className="grid grid-cols-12 gap-4 mb-4">
        <div className="xl:col-span-3 lg:col-span-6 col-span-12">
          <div className="box custom-box overflow-hidden">
            <div className="box-body !p-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                  <i className="ri-search-line text-primary text-xl" />
                </div>
                <div>
                  <p className="text-[0.7rem] text-gray-500 dark:text-gray-400 mb-0">Search Results</p>
                  <h5 className="font-semibold text-gray-800 dark:text-white mb-0">{searchResults.length}</h5>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="xl:col-span-3 lg:col-span-6 col-span-12">
          <div className="box custom-box overflow-hidden">
            <div className="box-body !p-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-warning/10">
                  <i className="ri-bookmark-line text-warning text-xl" />
                </div>
                <div>
                  <p className="text-[0.7rem] text-gray-500 dark:text-gray-400 mb-0">Saved Jobs</p>
                  <h5 className="font-semibold text-gray-800 dark:text-white mb-0">{savedTotal || savedJobs.length}</h5>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="xl:col-span-3 lg:col-span-6 col-span-12">
          <div className="box custom-box overflow-hidden">
            <div className="box-body !p-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-success/10">
                  <i className="ri-home-wifi-line text-success text-xl" />
                </div>
                <div>
                  <p className="text-[0.7rem] text-gray-500 dark:text-gray-400 mb-0">Remote Jobs</p>
                  <h5 className="font-semibold text-gray-800 dark:text-white mb-0">{remoteCount}</h5>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="xl:col-span-3 lg:col-span-6 col-span-12">
          <div className="box custom-box overflow-hidden">
            <div className="box-body !p-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-info/10">
                  <i className="ri-database-2-line text-info text-xl" />
                </div>
                <div>
                  <p className="text-[0.7rem] text-gray-500 dark:text-gray-400 mb-0">API Source</p>
                  <h5 className="font-semibold text-gray-800 dark:text-white mb-0 text-[0.875rem]">
                    {filters.source === "active-jobs-db" ? "Active Jobs DB" : "LinkedIn Jobs"}
                  </h5>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-12 gap-6">
        <div className="xl:col-span-12 col-span-12 flex flex-col">
          <div className="box custom-box flex flex-col" style={{ minHeight: "calc(100vh - 22rem)" }}>

            {/* Box Header */}
            <div className="box-header flex items-center justify-between flex-wrap gap-4">
              <div className="box-title flex items-center gap-3">
                <span className="text-[0.9375rem]">External Jobs</span>
                <span className="badge bg-light text-default rounded-full text-[0.75rem]">
                  {displayData.length}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="form-control !w-auto !py-1 !px-4 !text-[0.75rem]"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                >
                  {PAGE_SIZES.map((size) => (
                    <option key={size} value={size}>Show {size}</option>
                  ))}
                </select>

                {/* Tab Buttons */}
                <div className="inline-flex rounded-md shadow-sm">
                  <button
                    type="button"
                    onClick={() => setActiveTab("search")}
                    className={`ti-btn !py-1 !px-3 !text-[0.75rem] !rounded-e-none border ${
                      activeTab === "search"
                        ? "ti-btn-primary-full"
                        : "ti-btn-light"
                    }`}
                  >
                    <i className="ri-search-line me-1 align-middle" />
                    Search
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("saved")}
                    className={`ti-btn !py-1 !px-3 !text-[0.75rem] !rounded-s-none border-s-0 border ${
                      activeTab === "saved"
                        ? "ti-btn-primary-full"
                        : "ti-btn-light"
                    }`}
                  >
                    <i className="ri-bookmark-line me-1 align-middle" />
                    Saved
                    {(savedTotal || savedJobs.length) > 0 && (
                      <span className="badge bg-white/20 text-white rounded-full ms-1 text-[0.65rem]">
                        {savedTotal || savedJobs.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Filters (only in search tab) */}
            {activeTab === "search" && (
              <div className="box-body !py-3 !px-4 border-b border-gray-200 dark:border-defaultborder/10 bg-gray-50/50 dark:bg-black/10">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <i className="ri-briefcase-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                    <input
                      type="text"
                      className="form-control !py-1.5 !ps-8 !pe-3 !text-[0.8125rem] min-w-[180px]"
                      placeholder="Job title..."
                      value={filters.job_title}
                      onChange={(e) => setFilters((f) => ({ ...f, job_title: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && !searchLoading && searchCooldown <= 0 && handleSearch()}
                    />
                  </div>
                  <div className="relative">
                    <i className="ri-map-pin-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                    <input
                      type="text"
                      className="form-control !py-1.5 !ps-8 !pe-3 !text-[0.8125rem] min-w-[160px]"
                      placeholder="Location..."
                      value={filters.job_location}
                      onChange={(e) => setFilters((f) => ({ ...f, job_location: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && !searchLoading && searchCooldown <= 0 && handleSearch()}
                    />
                  </div>
                  <select
                    className="form-control !w-auto !py-1.5 !px-3 !text-[0.8125rem] min-w-[160px]"
                    value={filters.source}
                    onChange={(e) => setFilters((f) => ({ ...f, source: e.target.value as ExternalJobSource }))}
                  >
                    {SOURCE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <select
                    className="form-control !w-auto !py-1.5 !px-3 !text-[0.8125rem]"
                    value={filters.date_posted}
                    onChange={(e) => setFilters((f) => ({ ...f, date_posted: e.target.value }))}
                  >
                    <option value="24h">Last 24 hours</option>
                    <option value="7d">Last 7 days</option>
                  </select>
                  <label className="flex items-center gap-2 text-[0.8125rem] text-gray-600 dark:text-gray-300 cursor-pointer select-none">
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
                    className="ti-btn ti-btn-primary-full !py-1.5 !px-4 !text-[0.8125rem]"
                  >
                    {searchLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                        Searching...
                      </>
                    ) : searchCooldown > 0 ? (
                      <>
                        <i className="ri-time-line me-1 align-middle" />
                        Wait {searchCooldown}s
                      </>
                    ) : (
                      <>
                        <i className="ri-search-line me-1 align-middle" />
                        Search
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Rate limit warning */}
            {rateLimitError && (
              <div className="mx-4 mt-3 p-3 rounded-lg bg-warning/10 border border-warning/20 text-warning text-sm flex items-center gap-2">
                <i className="ri-error-warning-line text-lg" />
                {rateLimitError}
              </div>
            )}

            {/* Table */}
            <div className="box-body !p-0 flex-1 flex flex-col overflow-hidden">
              {(activeTab === "saved" && savedLoading && savedJobs.length === 0) ? (
                <div className="flex-1 flex flex-col items-center justify-center py-16 text-gray-400">
                  <span className="spinner-border spinner-border-sm mb-3" role="status" />
                  <span className="text-[0.8125rem]">Loading saved jobs...</span>
                </div>
              ) : (
                <>
                  <div className="table-responsive flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
                    <table
                      {...getTableProps()}
                      className="table whitespace-nowrap min-w-full table-striped table-hover table-bordered border-gray-300 dark:border-gray-600"
                    >
                      <thead>
                        {headerGroups.map((headerGroup: any) => (
                          <tr
                            {...headerGroup.getHeaderGroupProps()}
                            className="bg-primary/10 dark:bg-primary/20 border-b border-gray-300 dark:border-gray-600"
                            key={headerGroup.getHeaderGroupProps().key}
                          >
                            {headerGroup.headers.map((column: any) => (
                              <th
                                {...column.getHeaderProps(column.getSortByToggleProps?.() || column.getHeaderProps())}
                                scope="col"
                                className="text-start sticky top-0 z-10 bg-gray-50 dark:bg-black/20"
                                key={column.id}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="tabletitle">{column.render("Header")}</span>
                                  {column.isSorted && (
                                    <span>
                                      {column.isSortedDesc ? (
                                        <i className="ri-arrow-down-s-line text-[0.875rem]" />
                                      ) : (
                                        <i className="ri-arrow-up-s-line text-[0.875rem]" />
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
                            <td colSpan={columns.length} className="!py-0 !px-0">
                              <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4">
                                  <i className={`${activeTab === "search" ? "ri-search-line" : "ri-bookmark-line"} text-2xl text-gray-300 dark:text-gray-600`} />
                                </div>
                                <h6 className="font-semibold text-gray-500 dark:text-gray-400 mb-1">
                                  {activeTab === "search" ? "No search results" : "No saved jobs"}
                                </h6>
                                <p className="text-[0.8125rem] text-gray-400 dark:text-gray-500 max-w-[300px]">
                                  {activeTab === "search"
                                    ? "Enter a job title or location and click Search to find jobs from RapidAPI."
                                    : "Save jobs from search results to access them here later."}
                                </p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          page.map((row: any) => {
                            prepareRow(row);
                            return (
                              <tr
                                {...row.getRowProps()}
                                className="border-b border-gray-300 dark:border-gray-600 hover:bg-gray-50/50 dark:hover:bg-white/5 cursor-pointer transition-colors"
                                key={row.id}
                                onClick={() => openPreview(row.original)}
                              >
                                {row.cells.map((cell: any) => (
                                  <td {...cell.getCellProps()} key={cell.column.id}>
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

                  {/* Load More for API pagination */}
                  {activeTab === "search" && searchResults.length > 0 && hasMore && (
                    <div className="px-4 py-3 border-t border-gray-200 dark:border-defaultborder/10 text-center">
                      <button
                        type="button"
                        disabled={searchLoading}
                        onClick={handleLoadMore}
                        className="ti-btn ti-btn-primary !py-1.5 !px-4 !text-[0.8125rem] whitespace-nowrap"
                      >
                        {searchLoading ? (
                          <span className="flex items-center gap-2">
                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                            Loading...
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5">
                            <i className="ri-arrow-down-line" />
                            Load More
                          </span>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Pagination Footer */}
                  {displayData.length > 0 && (
                    <div className="box-footer !py-3 !px-4 flex items-center justify-between flex-wrap gap-3">
                      <div className="text-[0.8125rem] text-gray-500 dark:text-gray-400">
                        Showing <span className="font-semibold text-gray-700 dark:text-gray-300">{Math.min(pageIndex * pageSize + 1, displayData.length)}</span> to{" "}
                        <span className="font-semibold text-gray-700 dark:text-gray-300">{Math.min((pageIndex + 1) * pageSize, displayData.length)}</span> of{" "}
                        <span className="font-semibold text-gray-700 dark:text-gray-300">{displayData.length}</span> entries
                      </div>
                      {totalPages > 1 && (
                        <nav aria-label="Page navigation">
                          <ul className="ti-pagination mb-0">
                            <li className={`page-item ${!canPreviousPage ? "disabled" : ""}`}>
                              <button
                                type="button"
                                className="page-link !py-[0.375rem] !px-[0.75rem]"
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
                                    className="page-link !py-[0.375rem] !px-[0.75rem]"
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
                                className="page-link !py-[0.375rem] !px-[0.75rem]"
                                onClick={() => nextPage()}
                                disabled={!canNextPage}
                              >
                                Next
                              </button>
                            </li>
                          </ul>
                        </nav>
                      )}
                    </div>
                  )}
                </>
              )}
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
