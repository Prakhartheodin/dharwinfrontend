"use client";

import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useParams } from "next/navigation";
import React, { Fragment, useState, useEffect } from "react";
import { browseJobById, browseApplyToJob, type Job } from "@/shared/lib/api/jobs";
import { getMyApplications, withdrawMyApplication, type JobApplication } from "@/shared/lib/api/jobApplications";
import { formatSalaryRange, mapExperienceLevel } from "@/shared/lib/ats/jobMappers";

const WITHDRAWABLE_STATUSES = ["Applied", "Screening"];

/** Decode HTML entities (e.g. &lt; → <). Backend xss-clean stores jobDescription entity-encoded. */
function decodeHtmlEntities(html: string): string {
  if (!html || typeof html !== "string") return "";
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
}

export default function BrowseJobDetailsPage() {
  const params = useParams();
  const jobId = typeof params?.id === "string" ? params.id : "";

  const [job, setJob] = useState<Job | null>(null);
  const [jobLoading, setJobLoading] = useState(true);
  const [jobError, setJobError] = useState<string | null>(null);
  const [existingApplication, setExistingApplication] = useState<JobApplication | null>(null);
  const [applicationsLoading, setApplicationsLoading] = useState(true);
  const [applySubmitting, setApplySubmitting] = useState(false);
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!jobId) {
      setJobLoading(false);
      setJobError("Invalid job");
      return;
    }
    setJobLoading(true);
    setJobError(null);
    browseJobById(jobId)
      .then(setJob)
      .catch(() => setJobError("Job not found"))
      .finally(() => setJobLoading(false));
  }, [jobId]);

  useEffect(() => {
    if (!jobId) {
      setApplicationsLoading(false);
      return;
    }
    setApplicationsLoading(true);
    getMyApplications({ limit: 500 })
      .then((res) => {
        const list = res.results ?? [];
        const forThisJob = list.find(
          (a) => (a.job?._id ?? (a.job as { id?: string })?.id) === jobId
        );
        setExistingApplication(forThisJob ?? null);
      })
      .catch(() => setExistingApplication(null))
      .finally(() => setApplicationsLoading(false));
  }, [jobId]);

  const handleApply = async () => {
    if (!jobId) return;
    setApplySubmitting(true);
    setMessage(null);
    try {
      await browseApplyToJob(jobId);
      setMessage({ type: "success", text: "Application submitted successfully." });
      const res = await getMyApplications({ limit: 500 });
      const forThisJob = (res.results ?? []).find(
        (a) => (a.job?._id ?? (a.job as { id?: string })?.id) === jobId
      );
      setExistingApplication(forThisJob ?? null);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string }; status?: number } })?.response?.data
          ?.message ||
        (err as Error)?.message ||
        "Failed to apply";
      setMessage({ type: "error", text: msg });
    } finally {
      setApplySubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!existingApplication?.id && !existingApplication?._id) return;
    const appId = existingApplication._id ?? existingApplication.id;
    if (!appId) return;
    setWithdrawSubmitting(true);
    setMessage(null);
    try {
      await withdrawMyApplication(appId);
      setMessage({ type: "success", text: "Application withdrawn." });
      setExistingApplication(null);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error)?.message ||
        "Failed to withdraw";
      setMessage({ type: "error", text: msg });
    } finally {
      setWithdrawSubmitting(false);
    }
  };

  const canApply = job?.status === "Active" && !existingApplication;
  const canWithdraw =
    existingApplication && WITHDRAWABLE_STATUSES.includes(existingApplication.status);

  if (jobLoading || !jobId) {
    return (
      <>
        <Seo title="Job Details" />
        <div className="container-fluid p-6">
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-sm text-defaulttextcolor/60 dark:text-white/50">Loading job details...</span>
          </div>
        </div>
      </>
    );
  }

  if (jobError || !job) {
    return (
      <>
        <Seo title="Job Not Found" />
        <div className="container-fluid p-6">
          <div className="rounded-2xl border border-dashed border-defaultborder/50 dark:border-white/10 bg-defaultborder/5 dark:bg-white/5 py-16 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-defaultborder/20 dark:bg-white/10 flex items-center justify-center">
              <i className="ri-file-search-line text-3xl text-defaulttextcolor/40 dark:text-white/30" />
            </div>
            <p className="text-defaulttextcolor dark:text-white/80 font-medium mb-2">{jobError ?? "Job not found."}</p>
            <p className="text-sm text-defaulttextcolor/60 dark:text-white/50 mb-5">This position may have been removed or the link is invalid.</p>
            <Link
              href="/ats/browse-jobs"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors"
            >
              <i className="ri-arrow-left-line" />
              Back to Browse Jobs
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <Fragment>
      <Seo title={job.title} />
      <div className="container-fluid p-6">
        {message && (
          <div
            className={`mb-6 p-4 rounded-xl border ${
              message.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                : "bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-400"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Job header card */}
        <div className="rounded-2xl border border-defaultborder/50 dark:border-white/10 bg-white dark:bg-bodybg shadow-sm overflow-hidden mb-6">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-semibold text-defaulttextcolor dark:text-white tracking-tight mb-2">
                  {job.title}
                </h1>
                <p className="text-base text-defaulttextcolor/80 dark:text-white/70 mb-4">
                  {job.organisation?.name}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-defaulttextcolor/70 dark:text-white/60">
                  <span className="inline-flex items-center gap-1.5">
                    <i className="ri-map-pin-line text-[1rem] opacity-70" />
                    {job.location}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <i className="ri-briefcase-line text-[1rem] opacity-70" />
                    {job.jobType}
                  </span>
                  {job.experienceLevel && (
                    <span className="inline-flex items-center gap-1.5">
                      <i className="ri-time-line text-[1rem] opacity-70" />
                      {mapExperienceLevel(job.experienceLevel)}
                    </span>
                  )}
                  {job.salaryRange && (job.salaryRange.min != null || job.salaryRange.max != null) && (
                    <span className="inline-flex items-center gap-1.5">
                      <i className="ri-money-dollar-circle-line text-[1rem] opacity-70" />
                      {formatSalaryRange(job.salaryRange)}
                    </span>
                  )}
                </div>
                {job.skillTags && job.skillTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {job.skillTags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-defaulttextcolor/10 dark:bg-white/10 text-defaulttextcolor dark:text-white/80"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions sidebar */}
              <div className="flex flex-col gap-3 shrink-0 w-full sm:w-52">
                {applicationsLoading ? (
                  <span className="text-sm text-defaulttextcolor/50 dark:text-white/40">Checking application...</span>
                ) : existingApplication ? (
                  <>
                    <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-sm font-medium">
                      <i className="ri-check-double-line text-base" />
                      Already Applied – {existingApplication.status}
                    </div>
                    {canWithdraw && (
                      <button
                        type="button"
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 disabled:opacity-50 transition-colors"
                        disabled={withdrawSubmitting}
                        onClick={handleWithdraw}
                      >
                        {withdrawSubmitting ? (
                          <i className="ri-loader-4-line animate-spin text-base" />
                        ) : (
                          <i className="ri-delete-bin-line text-base" />
                        )}
                        {withdrawSubmitting ? "Withdrawing..." : "Withdraw Application"}
                      </button>
                    )}
                  </>
                ) : canApply ? (
                  <button
                    type="button"
                    disabled={applySubmitting}
                    onClick={handleApply}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary/90 disabled:opacity-50 shadow-sm hover:shadow transition-all"
                  >
                    {applySubmitting ? (
                      <i className="ri-loader-4-line animate-spin text-lg" />
                    ) : (
                      <i className="ri-send-plane-line text-lg" />
                    )}
                    {applySubmitting ? "Applying..." : "Apply Now"}
                  </button>
                ) : job.status !== "Active" ? (
                  <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-defaulttextcolor/10 dark:bg-white/10 text-defaulttextcolor/70 dark:text-white/50 text-sm">
                    <i className="ri-close-circle-line" />
                    Job closed
                  </div>
                ) : null}
                <Link
                  href="/ats/browse-jobs"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-defaultborder/50 dark:border-white/10 hover:bg-defaultborder/10 dark:hover:bg-white/5 transition-colors"
                >
                  <i className="ri-arrow-left-line text-base" />
                  Back to Jobs
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Job description */}
        <article className="rounded-2xl border border-defaultborder/50 dark:border-white/10 bg-white dark:bg-bodybg shadow-sm overflow-hidden">
          <div className="px-6 sm:px-8 py-5 border-b border-defaultborder/50 dark:border-white/10">
            <h2 className="text-lg font-semibold text-defaulttextcolor dark:text-white flex items-center gap-2">
              <span className="w-1 h-5 rounded-full bg-primary" />
              Job Description
            </h2>
          </div>
          <div className="p-6 sm:p-8">
            <div
              className="prose prose-sm sm:prose-base dark:prose-invert max-w-none text-defaulttextcolor dark:text-white/80 job-description-content prose-headings:font-semibold prose-p:leading-relaxed prose-ul:my-4 prose-li:my-1"
              dangerouslySetInnerHTML={{ __html: decodeHtmlEntities(job.jobDescription ?? "") }}
            />
          </div>
        </article>
      </div>
    </Fragment>
  );
}
