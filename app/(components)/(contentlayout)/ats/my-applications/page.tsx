"use client";

import Pageheader from "@/shared/layout-components/page-header/pageheader";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import React, { Fragment, useState, useEffect } from "react";
import { getMyApplications, withdrawMyApplication, type JobApplication, type JobApplicationStatus } from "@/shared/lib/api/jobApplications";
import { useIsCandidate } from "@/shared/hooks/use-is-candidate";
import { ROUTES } from "@/shared/lib/constants";

const WITHDRAWABLE_STATUSES: JobApplicationStatus[] = ["Applied", "Screening"];

const STATUS_COLOR: Record<JobApplicationStatus, string> = {
  Applied: "bg-primary/10 text-primary",
  Screening: "bg-info/10 text-info",
  Interview: "bg-warning/10 text-warning",
  Offered: "bg-success/10 text-success",
  Hired: "bg-success/20 text-success",
  Rejected: "bg-danger/10 text-danger",
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
        <Pageheader currentpage="My Applications" activepage="ATS" mainpage="My Applications" />
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
      <Pageheader currentpage="My Applications" activepage="ATS" mainpage="My Applications" />
      <div className="container-fluid">
        <div className="box custom-box">
          {/* box-header: title + filter controls — matches reference repo pattern */}
          <div className="box-header flex flex-wrap items-center justify-between gap-4">
            <div className="box-title flex items-center gap-2">
              My Applications
              <span className="badge bg-primary/10 text-primary !rounded-full">{totalItems}</span>
            </div>
            <div className="flex items-center gap-3">
              <select
                className="form-select !w-auto"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as JobApplicationStatus | "");
                  setPage(0);
                }}
              >
                <option value="">All Statuses</option>
                <option value="Applied">Applied</option>
                <option value="Screening">Screening</option>
                <option value="Interview">Interview</option>
                <option value="Offered">Offered</option>
                <option value="Hired">Hired</option>
                <option value="Rejected">Rejected</option>
              </select>
              <Link href="/ats/browse-jobs" className="ti-btn ti-btn-primary ti-btn-sm !h-auto !w-auto !py-2 whitespace-nowrap">
                <i className="ri-search-line me-1"></i> Browse Jobs
              </Link>
            </div>
          </div>

          {/* box-body: table — matches reference repo table-responsive pattern */}
          <div className="box-body">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="ti-spinner" role="status">
                  <span className="sr-only">Loading...</span>
                </div>
              </div>
            ) : applications.length === 0 ? (
              <div className="text-center py-12">
                <i className="ri-inbox-line text-4xl text-defaulttextcolor/30 mb-3 block"></i>
                <p className="text-defaulttextcolor dark:text-white/70 mb-3">
                  {statusFilter ? "No applications with this status." : "You haven't applied to any jobs yet."}
                </p>
                <Link href="/ats/browse-jobs" className="ti-btn ti-btn-primary">
                  Browse Jobs
                </Link>
              </div>
            ) : (
              <>
                <div className="table-responsive">
                  <table className="table table-hover whitespace-nowrap mb-0 min-w-full">
                    <thead>
                      <tr>
                        <th>Job</th>
                        <th>Company</th>
                        <th className="text-center">Status</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedData.map((app) => {
                        const id = app._id ?? app.id;
                        const job = app.job as { _id?: string; id?: string; title?: string; organisation?: { name?: string } } | undefined;
                        const jobId = job?._id ?? job?.id;
                        const jobTitle = job?.title ?? "—";
                        const company = job?.organisation?.name ?? "—";
                        const canWithdraw = WITHDRAWABLE_STATUSES.includes(app.status);
                        const isWithdrawing = withdrawingId === id;

                        return (
                          <tr key={id}>
                            <td>
                              {jobId ? (
                                <Link
                                  href={`/ats/browse-jobs/${jobId}`}
                                  className="text-primary font-medium hover:underline"
                                >
                                  {jobTitle}
                                </Link>
                              ) : (
                                jobTitle
                              )}
                            </td>
                            <td>{company}</td>
                            <td className="text-center">
                              <span
                                className={`badge ${STATUS_COLOR[app.status] ?? "bg-light text-defaulttextcolor"} !rounded-full`}
                              >
                                {app.status}
                              </span>
                            </td>
                            <td className="text-end">
                              <div className="inline-flex items-center gap-3">
                                <div className="w-[5.25rem] flex justify-end shrink-0 me-1">
                                  {jobId ? (
                                    <div className="hs-tooltip ti-main-tooltip">
                                      <Link
                                        href={`/ats/browse-jobs/${jobId}`}
                                        className="hs-tooltip-toggle ti-btn ti-btn-sm ti-btn-primary !h-auto !w-auto !py-1 !px-3 whitespace-nowrap"
                                      >
                                        <i className="ri-eye-line me-1"></i>View
                                        <span className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700" role="tooltip">
                                          View Job
                                        </span>
                                      </Link>
                                    </div>
                                  ) : null}
                                </div>
                                <div className="w-[6.25rem] flex justify-end shrink-0 ms-1">
                                  {canWithdraw ? (
                                    <div className="hs-tooltip ti-main-tooltip">
                                      <button
                                        type="button"
                                        className="hs-tooltip-toggle ti-btn ti-btn-sm ti-btn-danger !h-auto !w-auto !py-1 !px-3 whitespace-nowrap"
                                        disabled={isWithdrawing}
                                        onClick={() => handleWithdraw(app)}
                                      >
                                        <i className={isWithdrawing ? "ri-loader-4-line animate-spin me-1" : "ri-delete-bin-line me-1"}></i>
                                        {isWithdrawing ? "Withdrawing..." : "Withdraw"}
                                        <span className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700" role="tooltip">
                                          Withdraw Application
                                        </span>
                                      </button>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination — matches reference repo pattern */}
                <div className="box-footer">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="text-defaulttextcolor dark:text-white/70 text-[0.813rem]">
                      Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, totalItems)} of {totalItems} entries
                    </div>
                    <nav aria-label="Pagination" className="flex items-center gap-1">
                      <button
                        type="button"
                        className="ti-btn ti-btn-sm ti-btn-light !py-1 !px-2"
                        disabled={page === 0}
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                      >
                        Prev
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => (
                        <button
                          key={i}
                          type="button"
                          className={`ti-btn ti-btn-sm !py-1 !px-2 ${page === i ? "ti-btn-primary" : "ti-btn-light"}`}
                          onClick={() => setPage(i)}
                        >
                          {i + 1}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="ti-btn ti-btn-sm ti-btn-light !py-1 !px-2"
                        disabled={page >= totalPages - 1}
                        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      >
                        Next
                      </button>
                    </nav>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Fragment>
  );
}
