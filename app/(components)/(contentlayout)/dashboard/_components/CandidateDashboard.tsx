"use client";

import Link from "next/link";
import React, { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { useAuth } from "@/shared/contexts/auth-context";
import {
  getMyApplications,
  type JobApplication,
  type JobApplicationStatus,
} from "@/shared/lib/api/jobApplications";
import { ROUTES } from "@/shared/lib/constants";

const BROWSE_JOBS_PATH = "/ats/browse-jobs";
const MY_APPLICATIONS_PATH = "/ats/my-applications";

const PIPELINE_STATUSES: JobApplicationStatus[] = [
  "Applied",
  "Screening",
  "Interview",
  "Shortlisted",
  "Offered",
  "Hired",
];

const APP_STATUS_META: Record<
  JobApplicationStatus,
  { label: string; color: string; bg: string; icon: string; hint: string }
> = {
  Applied: {
    label: "Applied",
    color: "#6366f1",
    bg: "#eef2ff",
    icon: "ri-send-plane-line",
    hint: "Submitted and awaiting review",
  },
  Screening: {
    label: "Screening",
    color: "#0ea5e9",
    bg: "#e0f2fe",
    icon: "ri-file-search-line",
    hint: "Recruiter is reviewing your profile",
  },
  Interview: {
    label: "Interview",
    color: "#8b5cf6",
    bg: "#ede9fe",
    icon: "ri-video-chat-line",
    hint: "Interview stage in progress",
  },
  Shortlisted: {
    label: "Shortlisted",
    color: "#14b8a6",
    bg: "#ccfbf1",
    icon: "ri-star-line",
    hint: "You're on the shortlist",
  },
  Offered: {
    label: "Offered",
    color: "#f59e0b",
    bg: "#fef3c7",
    icon: "ri-gift-line",
    hint: "Offer extended — review details",
  },
  Hired: {
    label: "Hired",
    color: "#22c55e",
    bg: "#dcfce7",
    icon: "ri-trophy-line",
    hint: "Congratulations — you're hired",
  },
  Rejected: {
    label: "Rejected",
    color: "#ef4444",
    bg: "#fee2e2",
    icon: "ri-close-circle-line",
    hint: "Not selected for this role",
  },
};

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function fmtDate(iso: string | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function relTime(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso).getTime();
  if (isNaN(d)) return "";
  const diff = Date.now() - d;
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.round(hr / 24);
  if (days < 30) return `${days}d ago`;
  return fmtDate(iso);
}

function statusMeta(status: string | undefined) {
  const key = (status || "Applied") as JobApplicationStatus;
  return APP_STATUS_META[key] ?? APP_STATUS_META.Applied;
}

function profileCompletionScore(user: ReturnType<typeof useAuth>["user"]): number {
  if (!user) return 0;
  const checks = [
    Boolean(user.name?.trim()),
    Boolean(user.email?.trim()),
    Boolean((user as { phoneNumber?: string }).phoneNumber?.trim()),
    Boolean((user as { location?: string }).location?.trim()),
    Boolean((user as { education?: string }).education?.trim()),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function personalizedHeadline(
  total: number,
  statusCounts: Record<JobApplicationStatus, number>
): string {
  if (total === 0) {
    return "Your job search starts here — browse roles and apply when you're ready.";
  }
  if (statusCounts.Hired > 0) {
    return `You've been hired for ${statusCounts.Hired} role${statusCounts.Hired === 1 ? "" : "s"}. Keep your profile sharp for future opportunities.`;
  }
  if (statusCounts.Offered > 0) {
    return `You have ${statusCounts.Offered} offer${statusCounts.Offered === 1 ? "" : "s"} on the table. Review them in your applications.`;
  }
  const active =
    statusCounts.Interview +
    statusCounts.Shortlisted +
    statusCounts.Screening;
  if (active > 0) {
    return `${active} application${active === 1 ? " is" : "s are"} actively moving through the hiring process.`;
  }
  if (statusCounts.Applied > 0) {
    return `${statusCounts.Applied} application${statusCounts.Applied === 1 ? "" : "s"} submitted — recruiters will update you as they review.`;
  }
  return "Track every stage of your applications in one place.";
}

/**
 * Candidate-only dashboard — applications and profile, no attendance.
 */
export default function CandidateDashboard(): JSX.Element {
  const { user } = useAuth();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [totalApplications, setTotalApplications] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyApplications({ limit: 50, sortBy: "createdAt:desc" });
      setApplications(res.results ?? []);
      setTotalApplications(res.totalResults ?? res.results?.length ?? 0);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: string }).message)
          : "Failed to load dashboard";
      setError(msg);
      setApplications([]);
      setTotalApplications(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const statusCounts = useMemo(() => {
    const counts = Object.fromEntries(
      (Object.keys(APP_STATUS_META) as JobApplicationStatus[]).map((s) => [s, 0])
    ) as Record<JobApplicationStatus, number>;
    for (const app of applications) {
      if (app.status in counts) counts[app.status] += 1;
    }
    return counts;
  }, [applications]);

  const recentApplications = useMemo(() => applications.slice(0, 8), [applications]);

  const latestApplication = applications[0] ?? null;

  const profilePct = useMemo(() => profileCompletionScore(user), [user]);

  const userName = (user?.name || "there").replace(/\b\w/g, (c) => c.toUpperCase());
  const firstName = userName.split(" ")[0] ?? userName;
  const headline = personalizedHeadline(totalApplications, statusCounts);

  return (
    <Fragment>
      <Seo title="My Dashboard" />

      <div className="relative mt-4 space-y-6 min-h-[50vh] w-full">
        <div
          className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_90%_55%_at_10%_-10%,rgba(20,184,166,0.08),transparent_55%),radial-gradient(ellipse_70%_50%_at_95%_0%,rgba(99,102,241,0.06),transparent_50%)] dark:bg-[radial-gradient(ellipse_90%_55%_at_10%_-10%,rgba(20,184,166,0.12),transparent_55%),radial-gradient(ellipse_70%_50%_at_95%_0%,rgba(99,102,241,0.1),transparent_50%)]"
          aria-hidden
        />

        {/* Hero */}
        <section className="rounded-2xl border border-defaultborder/70 bg-white dark:bg-bodybg shadow-sm shadow-black/[0.03] dark:shadow-none overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-5 border-b border-defaultborder/50 bg-gradient-to-br from-teal-50/40 via-white to-indigo-50/30 dark:from-teal-950/20 dark:via-bodybg dark:to-indigo-950/10">
            <div className="flex items-start gap-4 min-w-0 max-w-2xl">
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 ring-1 ring-teal-500/15"
                aria-hidden
              >
                <i className="ri-briefcase-4-line text-2xl" />
              </span>
              <div className="min-w-0">
                <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-teal-600/90 dark:text-teal-400/90">
                  Your job search
                </p>
                <h1 className="text-xl font-semibold text-defaulttextcolor dark:text-white tracking-tight mt-0.5">
                  {getGreeting()}, {firstName}
                </h1>
                <p className="text-sm text-defaulttextcolor/70 dark:text-white/55 mt-1.5 leading-relaxed">
                  {headline}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void refresh()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-defaultborder/80 bg-white/80 dark:bg-white/5 px-3.5 py-2 text-xs font-medium text-defaulttextcolor hover:bg-white dark:hover:bg-white/10 transition-all disabled:opacity-60"
              >
                <i className={`ri-refresh-line text-base ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <Link
                href={BROWSE_JOBS_PATH}
                className="inline-flex items-center gap-2 rounded-xl border border-defaultborder/80 bg-white/80 dark:bg-white/5 px-3.5 py-2 text-xs font-medium text-defaulttextcolor hover:bg-white dark:hover:bg-white/10 transition-all"
              >
                <i className="ri-search-line text-base" />
                Browse jobs
              </Link>
              <Link
                href={MY_APPLICATIONS_PATH}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-teal-700 hover:shadow-md hover:shadow-teal-600/20 active:scale-[0.98]"
              >
                <i className="ri-file-list-3-line text-base" />
                My applications
              </Link>
            </div>
          </div>

          {error && (
            <div className="mx-6 mt-5 rounded-xl border border-danger/30 bg-danger/10 dark:bg-danger/15 px-4 py-3 text-sm text-danger flex items-start gap-2">
              <i className="ri-error-warning-line text-lg shrink-0" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="font-medium">Couldn&apos;t load your dashboard</p>
                <p className="mt-0.5 text-xs opacity-80">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => void refresh()}
                className="shrink-0 rounded-lg bg-danger/10 px-3 py-1 text-xs font-medium hover:bg-danger/20 transition-colors"
              >
                Try again
              </button>
            </div>
          )}

          {latestApplication && !loading && (
            <div className="mx-6 mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-defaultborder/60 bg-slate-50/80 dark:bg-white/[0.03] px-4 py-3">
              <span className="text-xs font-medium text-defaulttextcolor/60 dark:text-white/50 shrink-0">
                Latest update
              </span>
              <span className="text-sm font-medium text-defaulttextcolor dark:text-white truncate">
                {latestApplication.job?.title || "Application"}
              </span>
              <StatusBadge status={latestApplication.status} />
              <span className="text-xs text-defaulttextcolor/50 dark:text-white/40 tabular-nums ml-auto">
                {relTime(latestApplication.updatedAt ?? latestApplication.createdAt)}
              </span>
            </div>
          )}

          {/* Status pipeline — replaces Applications / In progress / Hired KPIs */}
          <div className="px-6 py-6">
            <div className="flex flex-wrap items-end justify-between gap-2 mb-4">
              <div>
                <h2 className="text-sm font-semibold text-defaulttextcolor dark:text-white tracking-tight">
                  Application status
                </h2>
                <p className="text-xs text-defaulttextcolor/60 dark:text-white/50 mt-0.5">
                  {totalApplications} total submission{totalApplications === 1 ? "" : "s"} across all roles
                </p>
              </div>
              <Link
                href={MY_APPLICATIONS_PATH}
                className="text-xs font-medium text-teal-600 dark:text-teal-400 hover:underline"
              >
                View all statuses
              </Link>
            </div>

            {loading && applications.length === 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {PIPELINE_STATUSES.map((s) => (
                  <div
                    key={s}
                    className="h-24 animate-pulse rounded-xl bg-slate-100 dark:bg-white/5 border border-defaultborder/40"
                  />
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {PIPELINE_STATUSES.map((status) => (
                    <StatusCountCard
                      key={status}
                      status={status}
                      count={statusCounts[status]}
                      href={MY_APPLICATIONS_PATH}
                    />
                  ))}
                </div>
                {(statusCounts.Rejected > 0 || totalApplications === 0) && (
                  <div className="mt-3 flex flex-wrap gap-3">
                    {statusCounts.Rejected > 0 && (
                      <StatusCountCard
                        status="Rejected"
                        count={statusCounts.Rejected}
                        href={MY_APPLICATIONS_PATH}
                        compact
                      />
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* Applications table */}
          <div className="xl:col-span-2">
            <section className="rounded-2xl border border-defaultborder/70 bg-white dark:bg-bodybg shadow-sm shadow-black/[0.03] dark:shadow-none overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5 border-b border-defaultborder/50 bg-gradient-to-r from-slate-50/90 to-white dark:from-white/[0.03] dark:to-transparent">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 ring-1 ring-teal-500/15"
                    aria-hidden
                  >
                    <i className="ri-file-list-3-line text-lg" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-defaulttextcolor dark:text-white tracking-tight">
                      Recent applications
                    </h2>
                    <p className="text-xs text-defaulttextcolor/60 dark:text-white/50 mt-0.5">
                      Roles you&apos;ve applied for, newest first
                    </p>
                  </div>
                </div>
                <Link
                  href={MY_APPLICATIONS_PATH}
                  className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 dark:text-teal-400 hover:underline"
                >
                  View all <i className="ri-arrow-right-line" />
                </Link>
              </div>

              <div className="px-6 py-6">
                {loading && recentApplications.length === 0 ? (
                  <div className="py-10 text-center">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600 mb-3 ring-1 ring-teal-500/15">
                      <i className="ri-loader-4-line animate-spin text-2xl" />
                    </div>
                    <p className="text-sm text-defaulttextcolor/70">Loading your applications…</p>
                  </div>
                ) : recentApplications.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600 mb-4 ring-1 ring-teal-500/15">
                      <i className="ri-compass-3-line text-3xl" />
                    </div>
                    <p className="text-base font-semibold text-defaulttextcolor dark:text-white">
                      No applications yet
                    </p>
                    <p className="text-sm text-defaulttextcolor/60 dark:text-white/50 mt-2 max-w-md mx-auto leading-relaxed">
                      When you apply to a role, it will show up here with live status updates — Applied,
                      Interview, Offered, and more.
                    </p>
                    <Link
                      href={BROWSE_JOBS_PATH}
                      className="inline-flex items-center gap-2 mt-5 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-teal-700 transition-colors"
                    >
                      <i className="ri-search-line" />
                      Find roles to apply
                    </Link>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-defaultborder/70 bg-white dark:bg-white/5">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-defaultborder/70 bg-slate-50/80 dark:bg-white/5">
                          <th className="text-start text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70 px-4 py-3">
                            Role
                          </th>
                          <th className="text-start text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70 px-4 py-3">
                            Status
                          </th>
                          <th className="text-start text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70 px-4 py-3 whitespace-nowrap">
                            Applied
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentApplications.map((app) => {
                          const jobTitle = app.job?.title || "Position";
                          const org = app.job?.organisation?.name;
                          return (
                            <tr
                              key={app.id ?? app._id}
                              className="border-b border-defaultborder/50 last:border-b-0 hover:bg-teal-500/[0.04] dark:hover:bg-white/[0.03] transition-colors"
                            >
                              <td className="px-4 py-3 align-middle">
                                <div className="min-w-0">
                                  <p className="font-medium text-defaulttextcolor dark:text-white truncate">
                                    {jobTitle}
                                  </p>
                                  {org && (
                                    <p className="text-xs text-defaulttextcolor/60 dark:text-white/50 truncate mt-0.5">
                                      {org}
                                    </p>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 align-middle">
                                <StatusBadge status={app.status} />
                              </td>
                              <td className="px-4 py-3 align-middle whitespace-nowrap text-xs text-defaulttextcolor/60 dark:text-white/50 tabular-nums">
                                {fmtDate(app.createdAt)}
                                {app.createdAt && (
                                  <span className="block text-[0.65rem] opacity-70">
                                    {relTime(app.createdAt)}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Sidebar — profile + candidate quick actions only */}
          <div className="space-y-6">
            <section className="rounded-2xl border border-defaultborder/70 bg-white dark:bg-bodybg shadow-sm shadow-black/[0.03] dark:shadow-none overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5 border-b border-defaultborder/50 bg-gradient-to-r from-slate-50/90 to-white dark:from-white/[0.03] dark:to-transparent">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 ring-1 ring-teal-500/15"
                    aria-hidden
                  >
                    <i className="ri-user-star-line text-lg" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-defaulttextcolor dark:text-white tracking-tight">
                      Your profile
                    </h2>
                    <p className="text-xs text-defaulttextcolor/60 dark:text-white/50 mt-0.5">
                      Strong profiles get noticed faster
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-6 py-6 space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs font-medium text-defaulttextcolor/70 dark:text-white/50 mb-2">
                    <span>Profile strength</span>
                    <span className="tabular-nums text-teal-600 dark:text-teal-400">{profilePct}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden border border-defaultborder/40">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-600 transition-[width] duration-700 ease-out"
                      style={{ width: `${profilePct}%` }}
                    />
                  </div>
                  {profilePct < 100 && (
                    <p className="text-[0.6875rem] text-defaulttextcolor/55 dark:text-white/45 mt-2">
                      Complete your profile so recruiters can reach you easily.
                    </p>
                  )}
                </div>
                <ul className="space-y-2 list-none p-0 m-0 text-xs text-defaulttextcolor/70 dark:text-white/50">
                  <ProfileCheck done={Boolean(user?.name?.trim())} label="Full name" />
                  <ProfileCheck done={Boolean(user?.email?.trim())} label="Email" />
                  <ProfileCheck
                    done={Boolean((user as { phoneNumber?: string })?.phoneNumber?.trim())}
                    label="Phone number"
                  />
                  <ProfileCheck
                    done={Boolean((user as { location?: string })?.location?.trim())}
                    label="Location"
                  />
                </ul>
                <Link
                  href={ROUTES.candidateProfile}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-teal-700 hover:shadow-md hover:shadow-teal-600/20 active:scale-[0.98]"
                >
                  <i className="ri-edit-line" />
                  Complete my profile
                </Link>
              </div>
            </section>

            <section className="rounded-2xl border border-defaultborder/70 bg-white dark:bg-bodybg shadow-sm shadow-black/[0.03] dark:shadow-none overflow-hidden">
              <div className="px-6 py-5 border-b border-defaultborder/50 bg-gradient-to-r from-slate-50/90 to-white dark:from-white/[0.03] dark:to-transparent">
                <h2 className="text-base font-semibold text-defaulttextcolor dark:text-white tracking-tight">
                  Quick actions
                </h2>
                <p className="text-xs text-defaulttextcolor/60 dark:text-white/50 mt-0.5">
                  Shortcuts for your job search
                </p>
              </div>
              <ul className="list-none p-3 m-0 divide-y divide-defaultborder/40">
                <QuickLink
                  href={BROWSE_JOBS_PATH}
                  icon="ri-search-line"
                  label="Browse open jobs"
                  desc="Discover new opportunities"
                />
                <QuickLink
                  href={MY_APPLICATIONS_PATH}
                  icon="ri-file-list-3-line"
                  label="All my applications"
                  desc="Filter by status"
                />
                <QuickLink
                  href={ROUTES.candidateProfile}
                  icon="ri-user-line"
                  label="Edit my profile"
                  desc="Update contact & details"
                />
              </ul>
            </section>
          </div>
        </div>
      </div>
    </Fragment>
  );
}

function StatusBadge(props: { status: JobApplicationStatus | string }): JSX.Element {
  const m = statusMeta(props.status);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold whitespace-nowrap"
      style={{
        background: m.bg,
        color: m.color,
        border: `1px solid ${m.color}33`,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: m.color }} />
      {m.label}
    </span>
  );
}

function StatusCountCard(props: {
  status: JobApplicationStatus;
  count: number;
  href: string;
  compact?: boolean;
}): JSX.Element {
  const m = APP_STATUS_META[props.status];
  return (
    <Link
      href={props.href}
      className={`group block rounded-xl border border-defaultborder/70 bg-white dark:bg-white/[0.03] transition-all duration-200 hover:border-teal-500/30 hover:shadow-md hover:shadow-teal-500/5 dark:hover:shadow-none ${
        props.compact ? "px-4 py-3 max-w-xs" : "p-4"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1"
          style={{
            background: m.bg,
            color: m.color,
            borderColor: `${m.color}22`,
          }}
        >
          <i className={`${m.icon} text-base`} />
        </span>
        <span
          className="text-2xl font-bold tabular-nums leading-none"
          style={{ color: props.count > 0 ? m.color : undefined }}
        >
          {props.count}
        </span>
      </div>
      <p className="mt-3 text-xs font-semibold text-defaulttextcolor dark:text-white">{m.label}</p>
      {!props.compact && (
        <p className="mt-0.5 text-[0.65rem] text-defaulttextcolor/50 dark:text-white/40 line-clamp-2 leading-snug">
          {m.hint}
        </p>
      )}
    </Link>
  );
}

function ProfileCheck(props: { done: boolean; label: string }): JSX.Element {
  return (
    <li className="flex items-center gap-2">
      <i
        className={`text-base ${props.done ? "ri-checkbox-circle-fill text-teal-600 dark:text-teal-400" : "ri-checkbox-blank-circle-line text-defaulttextcolor/30"}`}
        aria-hidden
      />
      <span className={props.done ? "text-defaulttextcolor dark:text-white/80" : ""}>
        {props.label}
      </span>
    </li>
  );
}

function QuickLink(props: {
  href: string;
  icon: string;
  label: string;
  desc?: string;
}): JSX.Element {
  return (
    <li>
      <Link
        href={props.href}
        className="flex items-center gap-3 px-3 py-3.5 rounded-lg transition-colors hover:bg-teal-500/[0.04] dark:hover:bg-white/[0.03]"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 ring-1 ring-teal-500/15">
          <i className={`${props.icon} text-base`} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-defaulttextcolor dark:text-white">
            {props.label}
          </span>
          {props.desc && (
            <span className="block text-[0.6875rem] text-defaulttextcolor/55 dark:text-white/45 mt-0.5">
              {props.desc}
            </span>
          )}
        </span>
        <i className="ri-arrow-right-s-line text-defaulttextcolor/40 shrink-0" />
      </Link>
    </li>
  );
}
