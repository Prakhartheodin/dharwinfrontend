"use client";

import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import React, { Fragment, useState, useEffect } from "react";
import { getMyApplications, withdrawMyApplication, type JobApplication, type JobApplicationStatus } from "@/shared/lib/api/jobApplications";
import { useIsCandidate } from "@/shared/hooks/use-is-candidate";
import { ROUTES } from "@/shared/lib/constants";

const WITHDRAWABLE_STATUSES: JobApplicationStatus[] = ["Applied", "Screening"];

const STATUS_STYLE: Record<JobApplicationStatus, { bg: string; text: string; border: string }> = {
  Applied: { bg: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-400", border: "border-amber-500/20" },
  Screening: { bg: "bg-sky-500/10", text: "text-sky-700 dark:text-sky-400", border: "border-sky-500/20" },
  Interview: { bg: "bg-violet-500/10", text: "text-violet-700 dark:text-violet-400", border: "border-violet-500/20" },
  Offered: { bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-500/20" },
  Hired: { bg: "bg-emerald-600/15", text: "text-emerald-800 dark:text-emerald-300 font-semibold", border: "border-emerald-500/30" },
  Rejected: { bg: "bg-rose-500/10", text: "text-rose-700 dark:text-rose-400", border: "border-rose-500/20" },
};

export default function MyApplicationsPage() {
  const { isCandidate, isLoading: candidateLoading } = useIsCandidate();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<JobApplicationStatus | "">("");
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const load = () => {
    setLoading(true);
    getMyApplications({
      limit: 100,
      page: 1,
      status: statusFilter || undefined,
    })
      .then((res) => setApplications(res.results ?? []))
      .catch(() => setApplications([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isCandidate) {
      setLoading(false);
      return;
    }
    load();
  }, [isCandidate, statusFilter]);

  const handleWithdraw = async (app: JobApplication) => {
    const id = app._id ?? app.id;
    if (!id || !WITHDRAWABLE_STATUSES.includes(app.status)) return;
    setWithdrawingId(id);
    try {
      await withdrawMyApplication(id);
      setApplications((prev) => prev.filter((a) => (a._id ?? a.id) !== id));
    } catch {
      // silent
    } finally {
      setWithdrawingId(null);
    }
  };

  const totalItems = applications.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const pagedData = applications.slice(page * pageSize, (page + 1) * pageSize);

  if (!candidateLoading && !isCandidate) {
    return (
      <>
        <Seo title="My Applications" />
        <div className="container-fluid">
          <div className="box custom-box">
            <div className="box-body text-center py-8">
              <p className="text-defaulttextcolor dark:text-white/70">
                You need a candidate profile to view your applications.
              </p>
              <Link href={ROUTES.defaultAfterLogin} className="ti-btn ti-btn-primary mt-3">
                Go to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <Fragment>
      <Seo title="My Applications" />
      <div className="container-fluid pt-6">
        {/* Header bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-baseline gap-3">
            <h1 className="text-xl font-semibold text-defaulttextcolor dark:text-white tracking-tight">
              My Applications
            </h1>
            <span className="inline-flex items-center justify-center min-w-[1.75rem] h-7 px-2 rounded-full text-sm font-medium bg-defaulttextcolor/10 dark:bg-white/10 text-defaulttextcolor dark:text-white/80">
              {totalItems}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <select
              className="form-select !w-auto !min-w-[9rem] !rounded-lg !border-defaultborder/60 dark:!border-white/10 !bg-white dark:!bg-white/5 !py-2 !text-sm"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as JobApplicationStatus | "");
                setPage(0);
              }}
            >
              <option value="">All statuses</option>
              <option value="Applied">Applied</option>
              <option value="Screening">Screening</option>
              <option value="Interview">Interview</option>
              <option value="Offered">Offered</option>
              <option value="Hired">Hired</option>
              <option value="Rejected">Rejected</option>
            </select>
            <Link
              href="/ats/browse-jobs"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors shadow-sm hover:shadow"
            >
              <i className="ri-search-line text-base" />
              Browse Jobs
            </Link>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <span className="text-sm text-defaulttextcolor/60 dark:text-white/50">Loading applications...</span>
            </div>
          </div>
        ) : applications.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-defaultborder/50 dark:border-white/10 bg-defaultborder/5 dark:bg-white/5 py-16 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-defaultborder/20 dark:bg-white/10 flex items-center justify-center">
              <i className="ri-inbox-line text-3xl text-defaulttextcolor/40 dark:text-white/30" />
            </div>
            <p className="text-defaulttextcolor dark:text-white/80 mb-1 font-medium">
              {statusFilter ? "No applications with this status" : "No applications yet"}
            </p>
            <p className="text-sm text-defaulttextcolor/60 dark:text-white/50 mb-5">
              {statusFilter ? "Try a different filter" : "Start by browsing open positions"}
            </p>
            <Link
              href="/ats/browse-jobs"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors"
            >
              <i className="ri-search-line" />
              Browse Jobs
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {pagedData.map((app) => {
                const id = app._id ?? app.id;
                const job = app.job as { _id?: string; id?: string; title?: string; organisation?: { name?: string } } | undefined;
                const jobId = job?._id ?? job?.id;
                const jobTitle = job?.title ?? "—";
                const company = job?.organisation?.name ?? "—";
                const canWithdraw = WITHDRAWABLE_STATUSES.includes(app.status);
                const isWithdrawing = withdrawingId === id;
                const statusStyle = STATUS_STYLE[app.status] ?? { bg: "bg-defaultborder/20", text: "text-defaulttextcolor dark:text-white/70", border: "border-defaultborder/30" };

                return (
                  <article
                    key={id}
                    className="group relative rounded-xl border border-defaultborder/50 dark:border-white/10 bg-white dark:bg-bodybg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
                  >
                    <div className="flex flex-wrap sm:flex-nowrap items-stretch sm:items-center gap-4 p-5">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-3 mb-1">
                          <h2 className="text-base font-semibold text-defaulttextcolor dark:text-white">
                            {jobId ? (
                              <Link
                                href={`/ats/browse-jobs/${jobId}`}
                                className="hover:text-primary transition-colors"
                              >
                                {jobTitle}
                              </Link>
                            ) : (
                              jobTitle
                            )}
                          </h2>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                            {app.status}
                          </span>
                        </div>
                        <p className="text-sm text-defaulttextcolor/70 dark:text-white/60">{company}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {jobId && (
                          <Link
                            href={`/ats/browse-jobs/${jobId}`}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-defaultborder/50 dark:border-white/10 bg-white dark:bg-white/5 text-defaulttextcolor dark:text-white hover:bg-defaultborder/10 dark:hover:bg-white/10 transition-colors"
                          >
                            <i className="ri-eye-line text-[1rem]" />
                            View
                          </Link>
                        )}
                        {canWithdraw && (
                          <button
                            type="button"
                            disabled={isWithdrawing}
                            onClick={() => handleWithdraw(app)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {isWithdrawing ? (
                              <i className="ri-loader-4-line animate-spin text-[1rem]" />
                            ) : (
                              <i className="ri-delete-bin-line text-[1rem]" />
                            )}
                            {isWithdrawing ? "Withdrawing..." : "Withdraw"}
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-6 border-t border-defaultborder/50 dark:border-white/10">
                <p className="text-sm text-defaulttextcolor/60 dark:text-white/50">
                  Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalItems)} of {totalItems}
                </p>
                <nav aria-label="Pagination" className="flex items-center gap-1">
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-lg text-sm font-medium text-defaulttextcolor dark:text-white/80 hover:bg-defaultborder/20 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`min-w-[2rem] px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        page === i
                          ? "bg-primary text-white"
                          : "text-defaulttextcolor dark:text-white/80 hover:bg-defaultborder/20 dark:hover:bg-white/10"
                      }`}
                      onClick={() => setPage(i)}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-lg text-sm font-medium text-defaulttextcolor dark:text-white/80 hover:bg-defaultborder/20 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  >
                    Next
                  </button>
                </nav>
              </div>
            )}
          </>
        )}
      </div>
    </Fragment>
  );
}
