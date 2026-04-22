"use client";

import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import React, { Fragment, useState, useEffect } from "react";
import { getPublicJobById, browseApplyToJob, isExternalJob, type PublicJob } from "@/shared/lib/api/jobs";
import { getMyApplications, withdrawMyApplication, type JobApplication } from "@/shared/lib/api/jobApplications";
import { useAuth } from "@/shared/contexts/auth-context";
import { PublicJobApplyModal } from "@/shared/components/ats/PublicJobApplyModal";
import { formatSalaryRange, mapExperienceLevel } from "@/shared/lib/ats/jobMappers";
import {
  formatJobDescriptionForDisplay,
  BROWSE_JOB_DETAIL_PROSE_CLASS,
} from "@/shared/lib/ats/jobDescriptionHtml";

const WITHDRAWABLE_STATUSES = ["Applied", "Screening"];

function GlanceRow({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span
        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-600 ring-1 ring-stone-200/80 dark:bg-white/[0.06] dark:text-stone-300 dark:ring-white/10"
        aria-hidden
      >
        <i className={`${icon} text-lg`} />
      </span>
      <div className="min-w-0 pt-0.5">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-stone-500 dark:text-stone-400">
          {label}
        </p>
        <div className="mt-0.5 text-sm font-medium leading-snug text-stone-800 dark:text-stone-100">{children}</div>
      </div>
    </div>
  );
}

export default function BrowseJobDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const jobId = typeof params?.id === "string" ? params.id : "";
  const referralRefFromUrl = searchParams.get("ref")?.trim() || null;
  const { user } = useAuth();

  const [job, setJob] = useState<PublicJob | null>(null);
  const [jobLoading, setJobLoading] = useState(true);
  const [jobError, setJobError] = useState<string | null>(null);
  const [existingApplication, setExistingApplication] = useState<JobApplication | null>(null);
  const [applicationsLoading, setApplicationsLoading] = useState(true);
  const [applySubmitting, setApplySubmitting] = useState(false);
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [applyModalOpen, setApplyModalOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(typeof window !== "undefined" && window.scrollY > 380);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!jobId) {
      setJobLoading(false);
      setJobError("Invalid job");
      return;
    }
    setJobLoading(true);
    setJobError(null);
    getPublicJobById(jobId)
      .then(setJob)
      .catch(() => setJobError("Job not found"))
      .finally(() => setJobLoading(false));
  }, [jobId]);

  useEffect(() => {
    if (!jobId || !user) {
      setExistingApplication(null);
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
  }, [jobId, user]);

  const handleApplyLoggedIn = async () => {
    if (!jobId || !user) return;
    setApplySubmitting(true);
    setMessage(null);
    try {
      await browseApplyToJob(
        jobId,
        referralRefFromUrl ? { ref: referralRefFromUrl } : undefined
      );
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
  const isLoggedIn = Boolean(user);
  const canWithdraw =
    existingApplication && WITHDRAWABLE_STATUSES.includes(existingApplication.status);

  if (jobLoading || !jobId) {
    return (
      <>
        <Seo title="Job Details" />
        <div className="min-h-screen bg-[#f4f2ee] dark:bg-[#0f0e0d] -mx-6">
          <div className="flex w-full flex-col items-center justify-center px-4 py-24 gap-4">
            <div className="h-10 w-10 rounded-full border-2 border-teal-600/25 border-t-teal-600 dark:border-teal-400/20 dark:border-t-teal-400 animate-spin" />
            <span className="font-Montserrat text-sm font-medium text-stone-500 dark:text-stone-400">
              Loading role details…
            </span>
          </div>
        </div>
      </>
    );
  }

  if (jobError || !job) {
    return (
      <>
        <Seo title="Job Not Found" />
        <div className="min-h-screen bg-[#f4f2ee] dark:bg-[#0f0e0d] -mx-6">
          <div className="w-full px-4 py-12 sm:py-16 lg:mx-auto lg:max-w-[560px]">
            <div className="rounded-3xl border border-stone-200/90 bg-white/90 px-8 py-14 text-center shadow-sm dark:border-white/10 dark:bg-bodybg/80">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100 dark:bg-white/10">
                <i className="ri-compass-discover-line text-3xl text-stone-400 dark:text-stone-500" aria-hidden />
              </div>
              <p className="font-Montserrat text-lg font-semibold text-stone-900 dark:text-white">
                {jobError ?? "We couldn’t find that role."}
              </p>
              <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
                It may have been filled, closed, or the link is out of date.
              </p>
              <Link
                href="/ats/browse-jobs"
                className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-stone-900 px-6 py-3 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-stone-800 dark:bg-teal-600 dark:hover:bg-teal-500"
              >
                <i className="ri-arrow-left-line text-lg" aria-hidden />
                Browse open roles
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  const actionsBlock = (
    <div className="flex flex-col gap-3">
      {isLoggedIn && applicationsLoading ? (
        <div className="flex items-center gap-2 rounded-xl border border-stone-200/80 bg-stone-50/80 px-4 py-3 text-sm text-stone-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-stone-400">
          <i className="ri-loader-4-line animate-spin text-lg" aria-hidden />
          Checking your application…
        </div>
      ) : existingApplication ? (
        <>
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm font-medium text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
            <span className="flex items-center gap-2">
              <i className="ri-check-double-line text-lg shrink-0" aria-hidden />
              Applied · {existingApplication.status}
            </span>
          </div>
          {canWithdraw && (
            <button
              type="button"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-300/80 bg-white px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50 dark:border-rose-500/30 dark:bg-transparent dark:text-rose-300 dark:hover:bg-rose-500/10"
              disabled={withdrawSubmitting}
              onClick={handleWithdraw}
            >
              {withdrawSubmitting ? (
                <i className="ri-loader-4-line animate-spin text-lg" aria-hidden />
              ) : (
                <i className="ri-arrow-go-back-line text-lg" aria-hidden />
              )}
              {withdrawSubmitting ? "Withdrawing…" : "Withdraw application"}
            </button>
          )}
        </>
      ) : canApply ? (
        <button
          type="button"
          disabled={applySubmitting}
          onClick={() => {
            if (isLoggedIn) {
              void handleApplyLoggedIn();
            } else {
              setApplyModalOpen(true);
            }
          }}
          className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-stone-900 px-4 py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-stone-900/20 transition hover:bg-stone-800 disabled:opacity-50 dark:bg-teal-600 dark:shadow-teal-900/30 dark:hover:bg-teal-500"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 transition group-hover:opacity-100 dark:from-white/0 dark:via-white/5 dark:to-white/0" />
          {applySubmitting ? (
            <i className="ri-loader-4-line animate-spin text-xl" aria-hidden />
          ) : (
            <i className="ri-send-plane-fill text-xl" aria-hidden />
          )}
          {applySubmitting
            ? "Submitting…"
            : isLoggedIn
              ? "Apply for this role"
              : "Apply — create your account"}
        </button>
      ) : job.status !== "Active" ? (
        <div className="rounded-xl border border-stone-200 bg-stone-100/80 px-4 py-3 text-sm text-stone-600 dark:border-white/10 dark:bg-white/[0.05] dark:text-stone-400">
          <span className="flex items-center gap-2">
            <i className="ri-door-closed-line text-lg" aria-hidden />
            This role is no longer accepting applications.
          </span>
        </div>
      ) : null}
      <Link
        href="/ats/browse-jobs"
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-stone-300/90 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 dark:border-white/15 dark:bg-transparent dark:text-stone-200 dark:hover:bg-white/[0.06]"
      >
        <i className="ri-arrow-left-line text-lg" aria-hidden />
        All open roles
      </Link>
    </div>
  );

  return (
    <Fragment>
      <Seo title={job.title} />
      <div className="min-h-screen bg-[#f4f2ee] dark:bg-[#0f0e0d] -mx-6">
        <div
          className="pointer-events-none fixed inset-0 opacity-[0.35] dark:opacity-[0.12]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")`,
          }}
          aria-hidden
        />

        <div className="relative w-full max-w-none px-4 pb-16 pt-6 sm:px-5 sm:pt-8 lg:px-6">
          <nav className="mb-6" aria-label="Breadcrumb">
            <Link
              href="/ats/browse-jobs"
              className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 transition hover:text-stone-900 dark:text-stone-400 dark:hover:text-white"
            >
              <i className="ri-arrow-left-s-line text-lg opacity-70" aria-hidden />
              Browse jobs
            </Link>
          </nav>

          {message && (
            <div
              role="status"
              className={`mb-6 rounded-2xl border px-4 py-3 text-sm font-medium ${
                message.type === "success"
                  ? "border-emerald-200/80 bg-emerald-50/90 text-emerald-900 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-200"
                  : "border-rose-200/80 bg-rose-50/90 text-rose-900 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200"
              }`}
            >
              {message.text}
            </div>
          )}

          {isExternalJob(job) && (
            <div className="mb-8 rounded-2xl border border-sky-200/70 bg-sky-50/80 p-5 text-sm text-sky-950 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-100">
              <p className="mb-3 flex flex-wrap items-center gap-2 font-Montserrat font-semibold">
                <span className="rounded-md bg-sky-200/80 px-2 py-0.5 text-xs uppercase tracking-wider text-sky-900 dark:bg-sky-400/20 dark:text-sky-200">
                  External listing
                </span>
                <span className="text-sky-900/90 dark:text-sky-100/90">
                  Apply here to track this application in Dharwin, or open the original post.
                </span>
              </p>
              {job.externalPlatformUrl ? (
                <a
                  href={job.externalPlatformUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-semibold text-teal-800 underline-offset-4 hover:underline dark:text-teal-300"
                >
                  <i className="ri-external-link-line" aria-hidden />
                  Original job post
                </a>
              ) : null}
            </div>
          )}

          <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_min(100%,320px)] xl:items-start xl:gap-8">
            <div className="min-w-0 space-y-8">
              <header className="relative overflow-hidden rounded-3xl border border-stone-200/90 bg-white/90 shadow-[0_2px_0_rgba(0,0,0,0.03),0_32px_64px_-32px_rgba(28,25,23,0.18)] backdrop-blur-sm dark:border-white/[0.08] dark:bg-bodybg/85 dark:shadow-[0_32px_64px_-32px_rgba(0,0,0,0.55)]">
                <div
                  className="absolute inset-y-0 left-0 w-[5px] bg-gradient-to-b from-teal-600 via-stone-700 to-amber-600/90 dark:from-teal-400 dark:via-stone-400 dark:to-amber-500/80"
                  aria-hidden
                />
                <div className="relative px-6 py-8 pl-8 sm:px-10 sm:py-10 sm:pl-11">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    {isExternalJob(job) ? (
                      <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-sky-800 dark:bg-sky-500/15 dark:text-sky-200">
                        External
                      </span>
                    ) : (
                      <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-stone-600 dark:bg-white/10 dark:text-stone-300">
                        Internal
                      </span>
                    )}
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                        job.status === "Active"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
                          : "bg-stone-200 text-stone-600 dark:bg-white/10 dark:text-stone-400"
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>
                  <h1 className="font-Montserrat text-3xl font-bold leading-tight tracking-tight text-stone-900 dark:text-white sm:text-4xl sm:leading-[1.15]">
                    {job.title}
                  </h1>
                  <p className="mt-3 text-lg text-stone-600 dark:text-stone-400">{job.organisation?.name}</p>

                  <dl className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className="flex items-start gap-2 rounded-xl bg-stone-50/90 px-3 py-2.5 dark:bg-white/[0.04]">
                      <dt className="sr-only">Location</dt>
                      <dd className="flex items-center gap-2 text-sm font-medium text-stone-800 dark:text-stone-200">
                        <i className="ri-map-pin-2-fill text-teal-600 dark:text-teal-400" aria-hidden />
                        {job.location}
                      </dd>
                    </div>
                    <div className="flex items-start gap-2 rounded-xl bg-stone-50/90 px-3 py-2.5 dark:bg-white/[0.04]">
                      <dt className="sr-only">Employment type</dt>
                      <dd className="flex items-center gap-2 text-sm font-medium text-stone-800 dark:text-stone-200">
                        <i className="ri-briefcase-4-fill text-teal-600 dark:text-teal-400" aria-hidden />
                        {job.jobType}
                      </dd>
                    </div>
                    {job.experienceLevel ? (
                      <div className="flex items-start gap-2 rounded-xl bg-stone-50/90 px-3 py-2.5 dark:bg-white/[0.04]">
                        <dt className="sr-only">Experience</dt>
                        <dd className="flex items-center gap-2 text-sm font-medium text-stone-800 dark:text-stone-200">
                          <i className="ri-timer-flash-line text-teal-600 dark:text-teal-400" aria-hidden />
                          {mapExperienceLevel(job.experienceLevel)}
                        </dd>
                      </div>
                    ) : null}
                    {job.salaryRange && (job.salaryRange.min != null || job.salaryRange.max != null) ? (
                      <div className="flex items-start gap-2 rounded-xl bg-stone-50/90 px-3 py-2.5 dark:bg-white/[0.04]">
                        <dt className="sr-only">Compensation</dt>
                        <dd className="flex items-center gap-2 text-sm font-medium text-stone-800 dark:text-stone-200">
                          <i className="ri-hand-coin-fill text-teal-600 dark:text-teal-400" aria-hidden />
                          {formatSalaryRange(job.salaryRange)}
                        </dd>
                      </div>
                    ) : null}
                  </dl>

                  {job.skillTags && job.skillTags.length > 0 ? (
                    <div className="mt-6 border-t border-stone-200/80 pt-6 dark:border-white/10">
                      <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-stone-500 dark:text-stone-400">
                        Skills & stack
                      </p>
                      <ul className="flex flex-wrap gap-2" aria-label="Required skills">
                        {job.skillTags.map((tag) => (
                          <li key={tag}>
                            <span className="inline-block rounded-lg border border-stone-200/90 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 dark:border-white/12 dark:bg-white/[0.06] dark:text-stone-200">
                              {tag}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <div className="mt-8 xl:hidden">{actionsBlock}</div>
                </div>
              </header>

              <article className="overflow-hidden rounded-3xl border border-stone-200/90 bg-white/95 shadow-sm dark:border-white/[0.08] dark:bg-bodybg/90">
                <div className="flex flex-col gap-1 border-b border-stone-200/80 px-6 py-5 sm:px-10 dark:border-white/10">
                  <p className="font-Montserrat text-[0.7rem] font-bold uppercase tracking-[0.22em] text-stone-500 dark:text-stone-400">
                    Role narrative
                  </p>
                  <h2 className="font-Montserrat text-xl font-bold text-stone-900 dark:text-white">Job description</h2>
                  <p className="text-sm text-stone-500 dark:text-stone-400">
                    Responsibilities, requirements, and what success looks like—optimized for reading.
                  </p>
                </div>
                <div className="px-6 py-8 sm:px-10 sm:py-10">
                  <div
                    className={BROWSE_JOB_DETAIL_PROSE_CLASS}
                    dangerouslySetInnerHTML={{
                      __html: formatJobDescriptionForDisplay(job.jobDescription ?? ""),
                    }}
                  />
                </div>
              </article>
            </div>

            <aside className="mt-10 min-w-0 xl:mt-0 xl:sticky xl:top-24 xl:self-start space-y-4">
              <div className="hidden xl:block rounded-3xl border border-stone-200/90 bg-white/95 p-6 shadow-sm dark:border-white/[0.08] dark:bg-bodybg/90">
                <p className="font-Montserrat text-[0.7rem] font-bold uppercase tracking-[0.2em] text-stone-500 dark:text-stone-400">
                  At a glance
                </p>
                <div className="mt-5 space-y-5">
                  <GlanceRow icon="ri-map-pin-line" label="Location">
                    {job.location}
                  </GlanceRow>
                  <GlanceRow icon="ri-briefcase-line" label="Type">
                    {job.jobType}
                  </GlanceRow>
                  {job.experienceLevel ? (
                    <GlanceRow icon="ri-line-chart-line" label="Experience">
                      {mapExperienceLevel(job.experienceLevel)}
                    </GlanceRow>
                  ) : null}
                  {job.salaryRange && (job.salaryRange.min != null || job.salaryRange.max != null) ? (
                    <GlanceRow icon="ri-wallet-3-line" label="Compensation">
                      {formatSalaryRange(job.salaryRange)}
                    </GlanceRow>
                  ) : (
                    <GlanceRow icon="ri-wallet-3-line" label="Compensation">
                      Not listed
                    </GlanceRow>
                  )}
                </div>
                <div className="mt-8 border-t border-stone-200/80 pt-6 dark:border-white/10">{actionsBlock}</div>
              </div>
            </aside>
          </div>
        </div>

        <button
          type="button"
          aria-label="Back to top"
          className={`fixed bottom-6 end-6 z-40 flex h-12 w-12 items-center justify-center rounded-2xl border border-stone-300/90 bg-white/95 text-stone-800 shadow-lg backdrop-blur transition hover:bg-stone-50 dark:border-white/15 dark:bg-stone-900/95 dark:text-white dark:hover:bg-stone-800 ${
            showScrollTop ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-4"
          }`}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <i className="ri-arrow-up-line text-xl" aria-hidden />
        </button>

        {job && jobId ? (
          <PublicJobApplyModal
            open={applyModalOpen}
            onClose={() => setApplyModalOpen(false)}
            jobId={jobId}
            jobTitle={job.title}
            referralRef={referralRefFromUrl}
          />
        ) : null}
      </div>
    </Fragment>
  );
}
