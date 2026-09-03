"use client";

import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import React, { Fragment, useState, useEffect, useCallback, useMemo } from "react";
import { getMyApplications, withdrawMyApplication, type JobApplication, type JobApplicationStatus } from "@/shared/lib/api/jobApplications";
import { useAuth } from "@/shared/contexts/auth-context";
import { useNotificationContext } from "@/shared/contexts/NotificationContext";
import { ROUTES } from "@/shared/lib/constants";
import {
  formatDisplayDate,
  getSelectedApplications,
  resolveCandidateLifecycle,
  type CandidateJobApplication,
} from "@/shared/lib/ats/candidateSelection";
import DocumentsActionCard from "./_components/DocumentsActionCard";
import CongratulationsBanner from "./_components/CongratulationsBanner";
import ApplicationStatusBadge, { splitBadgeLabel } from "./_components/ApplicationStatusBadge";
import { useConfirm } from "@/shared/components/ui/useConfirm";
import { usePmRefetchOnFocus } from "@/shared/hooks/usePmRefetchOnFocus";

const WITHDRAWABLE_STATUSES: JobApplicationStatus[] = ["Applied", "Screening"];

/**
 * One page of applications is fetched and then filtered/paged in the browser.
 *
 * Ceiling: a candidate with more than this sees only their newest FETCH_LIMIT; the page says so
 * rather than silently truncating. Upgrade path is server-side lifecycle paging, which needs the
 * backend to resolve Offer/Placement *before* it paginates (today it resolves after).
 */
const FETCH_LIMIT = 100;

/**
 * The dropdown speaks the badge's vocabulary, not the database's.
 *
 * `JobApplication.status` is a stored field; the badge is derived after the query from
 * Offer/Placement/interview state (backend `resolveCandidateLifecycle`). A status query therefore
 * cannot express "Pre-boarding", and worse, disagrees: an offer-stage rejection keeps
 * status "Offered" while the badge reads "Rejected · Offer". Matching the rendered badge is the
 * only way the filter and the list cannot contradict each other.
 *
 * `heads` are matched against the badge's leading label — "Rejected · Offer" matches "Rejected".
 */
const STATUS_FILTERS: { value: string; label: string; heads: string[] }[] = [
  { value: "applied", label: "Applied", heads: ["Applied"] },
  { value: "screening", label: "Screening", heads: ["Screening"] },
  { value: "shortlisted", label: "Shortlisted", heads: ["Shortlisted"] },
  { value: "interview", label: "Interview", heads: ["Interview"] },
  { value: "offer", label: "Offer", heads: ["Offer", "Offered"] },
  { value: "preboarding", label: "Pre-boarding", heads: ["Pre-boarding"] },
  { value: "onboarding", label: "Onboarding", heads: ["Onboarding"] },
  { value: "hired", label: "Hired", heads: ["Hired"] },
  { value: "deferred", label: "Deferred", heads: ["Deferred"] },
  { value: "rejected", label: "Rejected", heads: ["Rejected"] },
];

const FILTER_HEADS = new Map(STATUS_FILTERS.map((f) => [f.value, new Set(f.heads)]));

export default function MyApplicationsPage() {
  const { user } = useAuth();
  const { latestNotification } = useNotificationContext();
  const { confirm, confirmDialog } = useConfirm();
  const [applications, setApplications] = useState<CandidateJobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [totalOnServer, setTotalOnServer] = useState(0);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const load = useCallback((opts?: { background?: boolean }) => {
    if (!opts?.background) setLoading(true);
    setError(null);
    return getMyApplications({ limit: FETCH_LIMIT, page: 1 })
      .then((res) => {
        const results = (res.results ?? []) as CandidateJobApplication[];
        setApplications(results);
        setTotalOnServer(res.totalResults ?? results.length);
      })
      .catch(() => {
        setApplications([]);
        setTotalOnServer(0);
        setError("We couldn't load your applications. Check your connection and try again.");
      })
      .finally(() => {
        if (!opts?.background) setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    void load();
  }, [user, load]);

  const refetchApplications = useCallback(() => {
    if (!user) return;
    void load({ background: true });
  }, [user, load]);

  // SSE: selected/rejected transitions emit job_application notifications.
  useEffect(() => {
    if (!user || latestNotification?.type !== "job_application") return;
    void load({ background: true });
  }, [user, latestNotification?._id, latestNotification?.type, load]);

  // selected→pending does not emit a notification — refetch when the tab regains focus.
  usePmRefetchOnFocus(refetchApplications);

  const selectedApplications = useMemo(
    () => getSelectedApplications(applications),
    [applications],
  );

  const visibleApplications = useMemo(() => {
    const heads = FILTER_HEADS.get(statusFilter);
    if (!heads) return applications;
    return applications.filter((app) =>
      heads.has(splitBadgeLabel(resolveCandidateLifecycle(app).badge)[0]),
    );
  }, [applications, statusFilter]);

  const handleWithdraw = async (app: JobApplication) => {
    const id = app._id ?? app.id;
    if (!id || !WITHDRAWABLE_STATUSES.includes(app.status)) return;
    const ok = await confirm({
      title: "Are you sure?",
      message: "Your application will be withdrawn from this role.",
      confirmLabel: "Yes",
      cancelLabel: "No",
      tone: "danger",
    });
    if (!ok) return;
    setWithdrawingId(id);
    setError(null);
    try {
      await withdrawMyApplication(id);
      setApplications((prev) => prev.filter((a) => (a._id ?? a.id) !== id));
    } catch {
      setError("We couldn't withdraw that application. Please try again.");
    } finally {
      setWithdrawingId(null);
    }
  };

  const totalItems = visibleApplications.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const safePage = Math.min(page, Math.max(0, totalPages - 1));
  const pagedData = visibleApplications.slice(safePage * pageSize, (safePage + 1) * pageSize);
  const truncated = totalOnServer > applications.length;

  if (!user) {
    return (
      <>
        <Seo title="My Applications" />
        <div className="container-fluid">
          <div className="box custom-box">
            <div className="box-body text-center py-8">
              <p className="text-defaulttextcolor dark:text-white/70">
                Sign in to view and manage your job applications.
              </p>
              <Link href={ROUTES.signIn} className="ti-btn ti-btn-primary mt-3">
                Sign in
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
              aria-label="Filter applications by status"
              className="form-select !w-auto !min-w-[9rem] !rounded-lg !border-defaultborder/60 dark:!border-white/10 !bg-white dark:!bg-white/5 !py-2 !text-sm"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
            >
              <option value="">All statuses</option>
              {STATUS_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
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

        {error && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300"
          >
            <i className="ri-error-warning-line mt-px text-base" aria-hidden />
            <span>{error}</span>
          </div>
        )}

        {!loading && truncated && (
          <p
            data-testid="truncated-notice"
            className="mb-4 text-sm text-defaulttextcolor/60 dark:text-white/50"
          >
            Showing your {applications.length} most recent applications of {totalOnServer}.
          </p>
        )}

        {!loading && selectedApplications.length > 0 && (
          <CongratulationsBanner items={selectedApplications} />
        )}

        {/* Document requests are account-wide, not per application — render once. */}
        <DocumentsActionCard />

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <span className="text-sm text-defaulttextcolor/60 dark:text-white/50">Loading applications...</span>
            </div>
          </div>
        ) : visibleApplications.length === 0 ? (
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
                const lifecycle = resolveCandidateLifecycle(app);
                const visibleStatus = lifecycle.badge;
                const appliedLabel = formatDisplayDate(app.appliedAt ?? app.createdAt);

                return (
                  <article
                    key={id}
                    className="group relative rounded-xl border border-defaultborder/50 dark:border-white/10 bg-white dark:bg-bodybg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
                  >
                    <div className="flex flex-wrap sm:flex-nowrap items-start gap-4 p-5">
                      <div className="flex-1 min-w-0">
                        <h2 className="text-base font-semibold text-defaulttextcolor dark:text-white mb-1">
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
                        <p className="text-sm text-defaulttextcolor/70 dark:text-white/60">{company}</p>
                      </div>
                      {/* Status/date metadata group: sizes to its content and wraps below the
                          job info on narrow screens instead of squeezing the card. */}
                      <div className="flex flex-col items-start sm:items-end gap-2 min-w-0 sm:shrink-0">
                        <div className="flex flex-wrap items-center sm:justify-end gap-x-3 gap-y-1 min-w-0">
                          <ApplicationStatusBadge
                            label={visibleStatus}
                            testId="application-status-badge"
                          />
                          {appliedLabel && (
                            <span className="text-xs text-defaulttextcolor/50 dark:text-white/45 whitespace-nowrap">
                              {appliedLabel}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
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
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-6 border-t border-defaultborder/50 dark:border-white/10">
                <p className="text-sm text-defaulttextcolor/60 dark:text-white/50">
                  Showing {safePage * pageSize + 1}–{Math.min((safePage + 1) * pageSize, totalItems)} of {totalItems}
                </p>
                <nav aria-label="Pagination" className="flex items-center gap-1">
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-lg text-sm font-medium text-defaulttextcolor dark:text-white/80 hover:bg-defaultborder/20 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    disabled={safePage === 0}
                    onClick={() => setPage(Math.max(0, safePage - 1))}
                  >
                    Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Page ${i + 1}`}
                      aria-current={safePage === i ? "page" : undefined}
                      className={`min-w-[2rem] px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        safePage === i
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
                    disabled={safePage >= totalPages - 1}
                    onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))}
                  >
                    Next
                  </button>
                </nav>
              </div>
            )}
          </>
        )}
      </div>
      {confirmDialog}
    </Fragment>
  );
}
