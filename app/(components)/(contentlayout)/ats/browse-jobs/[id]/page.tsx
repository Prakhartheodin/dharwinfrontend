"use client";

import Pageheader from "@/shared/layout-components/page-header/pageheader";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useParams } from "next/navigation";
import React, { Fragment, useState, useEffect } from "react";
import { browseJobById, browseApplyToJob, type Job } from "@/shared/lib/api/jobs";
import { getMyApplications, withdrawMyApplication, type JobApplication } from "@/shared/lib/api/jobApplications";
import { formatSalaryRange, mapExperienceLevel } from "@/shared/lib/ats/jobMappers";

const WITHDRAWABLE_STATUSES = ["Applied", "Screening"];

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
        <Pageheader currentpage="Job Details" activepage="Browse Jobs" mainpage="Job Details" />
        <div className="container flex justify-center py-12">
          <div className="ti-btn ti-btn-primary ti-btn-loading">Loading...</div>
        </div>
      </>
    );
  }

  if (jobError || !job) {
    return (
      <>
        <Seo title="Job Not Found" />
        <Pageheader currentpage="Job Not Found" activepage="Browse Jobs" mainpage="Job Not Found" />
        <div className="container">
          <div className="box custom-box">
            <div className="box-body text-center py-8">
              <p className="text-defaulttextcolor dark:text-white/70">{jobError ?? "Job not found."}</p>
              <Link href="/ats/browse-jobs" className="ti-btn ti-btn-primary mt-3">
                Back to Browse Jobs
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  const id = job._id ?? job.id ?? "";

  return (
    <Fragment>
      <Seo title={job.title} />
      <Pageheader
        currentpage={job.title}
        activepage="Browse Jobs"
        mainpage="Job Details"
      />
      <div className="container">
        {message && (
          <div
            className={`mb-4 p-4 rounded ${message.type === "success" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}
          >
            {message.text}
          </div>
        )}

        <div className="box custom-box">
          <div className="box-body">
            <div className="sm:flex align-top justify-between gap-4">
              <div className="flex-1">
                <h4 className="font-bold mb-1">{job.title}</h4>
                <p className="text-[0.875rem] text-defaulttextcolor/80 mb-3">
                  {job.organisation?.name}
                </p>
                <div className="flex flex-wrap gap-2 text-[0.875rem]">
                  <span><i className="bi bi-geo-alt me-1" />{job.location}</span>
                  <span><i className="bi bi-briefcase me-1" />{job.jobType}</span>
                  {job.experienceLevel && (
                    <span><i className="bi bi-mortarboard me-1" />{mapExperienceLevel(job.experienceLevel)}</span>
                  )}
                  {job.salaryRange && (job.salaryRange.min != null || job.salaryRange.max != null) && (
                    <span><i className="bi bi-coin me-1" />{formatSalaryRange(job.salaryRange)}</span>
                  )}
                </div>
                {job.skillTags && job.skillTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {job.skillTags.map((tag) => (
                      <span
                        key={tag}
                        className="badge bg-primary/10 text-primary !rounded-full text-[0.75rem]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto sm:min-w-[11rem] items-stretch">
                {applicationsLoading ? (
                  <span className="text-defaulttextcolor/70">Checking application...</span>
                ) : existingApplication ? (
                  <>
                    <span className="badge bg-primary/20 text-primary px-3 py-2">
                      Already Applied – {existingApplication.status}
                    </span>
                    {canWithdraw && (
                      <button
                        type="button"
                        className="ti-btn ti-btn-outline-danger ti-btn-sm !w-full !h-auto !py-2 whitespace-nowrap"
                        disabled={withdrawSubmitting}
                        onClick={handleWithdraw}
                      >
                        {withdrawSubmitting ? "Withdrawing..." : "Withdraw Application"}
                      </button>
                    )}
                  </>
                ) : canApply ? (
                  <button
                    type="button"
                    className="ti-btn ti-btn-primary w-full sm:w-auto whitespace-nowrap"
                    disabled={applySubmitting}
                    onClick={handleApply}
                  >
                    {applySubmitting ? "Applying..." : "Apply Now"}
                  </button>
                ) : job.status !== "Active" ? (
                  <span className="badge bg-secondary/20 text-secondary">Job closed</span>
                ) : null}
                <Link
                  href="/ats/browse-jobs"
                  className="ti-btn ti-btn-light ti-btn-sm !w-full !min-w-0 !h-auto !py-2 flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <i className="bi bi-arrow-left text-[0.875rem] shrink-0" />
                  Back to Jobs
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="box custom-box mt-6">
          <div className="box-header">
            <div className="box-title">Job Description</div>
          </div>
          <div className="box-body">
            <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap text-defaulttextcolor">
              {job.jobDescription}
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
}
