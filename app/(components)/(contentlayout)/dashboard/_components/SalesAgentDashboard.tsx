"use client";

import Link from "next/link";
import React, { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { useAuth } from "@/shared/contexts/auth-context";
import {
  createJobShareReferralLink,
  getReferralLeadsStats,
  listReferralLeads,
  type ReferralLeadRow,
  type ReferralLeadsStatsResponse,
} from "@/shared/lib/api/referralLeads";
import { listJobs, type Job } from "@/shared/lib/api/jobs";
import { ROUTES } from "@/shared/lib/constants";
import {
  STATUS_META,
  getStatusMeta,
  LINK_TYPE,
  type ReferralPipelineStatusKey,
} from "@/shared/lib/ats/referral-leads-constants";

const SHARE_CANDIDATE_FORM_PATH = "/ats/share-candidate-form";
const REFERRAL_LEADS_PATH = "/ats/referral-leads";

const FUNNEL_STAGES: ReferralPipelineStatusKey[] = [
  "pending",
  "profile_complete",
  "applied",
  "in_review",
  "hired",
];

const FEED_STATUSES = new Set<string>(["applied", "in_review", "hired", "rejected"]);

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function relTime(iso: string | null | undefined): string {
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

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  return false;
}

function jobIdOf(j: Job): string | undefined {
  return j._id ?? j.id;
}

export default function SalesAgentDashboard(): JSX.Element {
  const { user } = useAuth();

  const [stats, setStats] = useState<ReferralLeadsStatsResponse | null>(null);
  const [leads, setLeads] = useState<ReferralLeadRow[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [toast, setToast] = useState<string | null>(null);
  const [busyShareLink, setBusyShareLink] = useState(false);
  const [busyJobLink, setBusyJobLink] = useState<string | null>(null);

  const [selected, setSelected] = useState<ReferralLeadRow | null>(null);
  const [hiresView, setHiresView] = useState<"paid" | "unpaid" | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((cur) => (cur === msg ? null : cur)), 2500);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, leadsRes, jobsRes] = await Promise.all([
        getReferralLeadsStats({}),
        listReferralLeads({ limit: 25 }),
        listJobs({ status: "Active", limit: 5, sortBy: "createdAt:desc" }),
      ]);
      setStats(statsRes);
      setLeads(leadsRes.results ?? []);
      setJobs(jobsRes.results ?? []);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: string }).message)
          : "Failed to load dashboard";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const funnelCounts = useMemo<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    for (const stage of FUNNEL_STAGES) m[stage] = 0;
    for (const r of leads) {
      const key = (r.referralPipelineStatus || "pending") as string;
      if (key in m) m[key] += 1;
    }
    return m;
  }, [leads]);

  const funnelMax = useMemo(() => {
    const vals = Object.values(funnelCounts);
    return vals.length ? Math.max(1, ...vals) : 1;
  }, [funnelCounts]);

  const recentReferrals = useMemo(() => leads.slice(0, 8), [leads]);

  const statusFeed = useMemo(() => {
    return [...leads]
      .filter((r) => FEED_STATUSES.has(r.referralPipelineStatus || ""))
      .sort((a, b) => {
        const ta = new Date(a.referredAt || a.createdAt || 0).getTime();
        const tb = new Date(b.referredAt || b.createdAt || 0).getTime();
        return tb - ta;
      })
      .slice(0, 8);
  }, [leads]);

  const onCopyShareCandidateLink = useCallback(async () => {
    setBusyShareLink(true);
    try {
      const userId = user?.id ?? user?._id ?? "default-admin";
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 15);
      const userHash = btoa(String(userId) + timestamp).replace(/[^a-zA-Z0-9]/g, "");
      const token = `${userHash}_${timestamp}_${randomStr}`;
      const encryptedAdminId = btoa(String(userId));
      const expires = Date.now() + 24 * 60 * 60 * 1000;
      const url = `${window.location.origin}/candidate-onboard?token=${token}&adminId=${encryptedAdminId}&expires=${expires}`;
      const ok = await copyToClipboard(url);
      showToast(ok ? "Onboarding link copied" : url);
    } catch {
      showToast("Could not generate link");
    } finally {
      setBusyShareLink(false);
    }
  }, [showToast, user]);

  const onCopyJobLink = useCallback(
    async (job: Job) => {
      const id = jobIdOf(job);
      if (!id) return;
      setBusyJobLink(id);
      try {
        const { ref } = await createJobShareReferralLink(id);
        const url = `${window.location.origin}/jobs/${id}?ref=${encodeURIComponent(ref)}`;
        const ok = await copyToClipboard(url);
        showToast(ok ? "Job referral link copied" : url);
      } catch {
        showToast("Could not generate job referral link");
      } finally {
        setBusyJobLink(null);
      }
    },
    [showToast],
  );

  const userName = (user?.name || "there").replace(/\b\w/g, (c) => c.toUpperCase());
  const firstName = userName.split(" ")[0] ?? userName;

  return (
    <Fragment>
      <Seo title="Dashboard" />

      <div className="relative mt-4 space-y-6 min-h-[50vh] w-full">
        {/* Subtle ambient backdrop — matches users/roles pages */}
        <div
          className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_100%_60%_at_50%_-15%,rgba(99,102,241,0.07),transparent_50%)] dark:bg-[radial-gradient(ellipse_100%_60%_at_50%_-15%,rgba(99,102,241,0.12),transparent_50%)]"
          aria-hidden
        />

        {/* ============================ HERO CARD ============================ */}
        <section className="rounded-2xl border border-defaultborder/70 bg-white dark:bg-bodybg shadow-sm shadow-black/[0.03] dark:shadow-none overflow-hidden transition-shadow duration-300 hover:shadow-md hover:shadow-black/[0.04] dark:hover:shadow-none">
          <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-5 border-b border-defaultborder/50 bg-gradient-to-r from-slate-50/90 to-white dark:from-white/[0.03] dark:to-transparent">
            <div className="flex items-start gap-4 min-w-0">
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/10 dark:ring-primary/20"
                aria-hidden
              >
                <i className="ri-user-star-line text-2xl" />
              </span>
              <div className="min-w-0">
                <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-primary/80">
                  Sales agent dashboard
                </p>
                <h1 className="text-lg font-semibold text-defaulttextcolor dark:text-white tracking-tight flex items-center gap-2 mt-0.5">
                  {getGreeting()}, {firstName}
                  <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 rounded-full text-[0.6875rem] font-semibold bg-primary/10 text-primary tabular-nums">
                    {stats?.totalReferrals ?? 0}
                  </span>
                </h1>
                <p className="text-xs text-defaulttextcolor/60 dark:text-white/50 mt-0.5">
                  Refer candidates and track their progress through the hiring pipeline.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void refresh()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-3.5 py-2 text-xs font-medium text-defaulttextcolor hover:bg-slate-50 dark:hover:bg-white/10 transition-all disabled:opacity-60"
                title="Refresh"
              >
                <i className={`ri-refresh-line text-base ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => void onCopyShareCandidateLink()}
                disabled={busyShareLink}
                className="inline-flex items-center gap-2 rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-3.5 py-2 text-xs font-medium text-defaulttextcolor hover:bg-slate-50 dark:hover:bg-white/10 transition-all disabled:opacity-60"
              >
                <i className="ri-link" />
                {busyShareLink ? "Generating…" : "Copy onboarding link"}
              </button>
              <Link
                href={SHARE_CANDIDATE_FORM_PATH}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-primary/90 hover:shadow-md hover:shadow-primary/20 active:scale-[0.98]"
              >
                <i className="ri-user-add-line text-base" />
                Refer a candidate
              </Link>
            </div>
          </div>

          {/* ── ERROR BANNER ── */}
          {error && (
            <div className="mx-6 mt-5 rounded-xl border border-danger/30 bg-danger/10 dark:bg-danger/15 px-4 py-3 text-sm text-danger flex items-start gap-2">
              <i className="ri-error-warning-line text-lg shrink-0" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="font-medium">Couldn&apos;t load referral data</p>
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

          {/* ── KPI GRID ── */}
          <div className="px-6 py-6 bg-gradient-to-b from-slate-50/50 to-transparent dark:from-white/[0.02] dark:to-transparent">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <KpiCard
                icon="ri-share-forward-line"
                label="Total referrals"
                value={stats?.totalReferrals ?? 0}
                sub="All time"
                tone="primary"
                loading={loading && !stats}
              />
              <KpiCard
                icon="ri-time-line"
                label="Pending"
                value={stats?.pending ?? 0}
                sub="Awaiting registration"
                tone="warning"
                loading={loading && !stats}
              />
              <KpiCard
                icon="ri-check-double-line"
                label="Converted"
                value={stats?.converted ?? 0}
                sub={stats ? `${stats.conversionRate}% conversion` : "—"}
                tone="success"
                loading={loading && !stats}
              />
              <KpiCard
                icon="ri-trophy-line"
                label="Hired"
                value={stats?.hired ?? 0}
                sub="Closed wins"
                tone="info"
                loading={loading && !stats}
              />
              <KpiCard
                icon="ri-money-dollar-circle-line"
                label="Paid (full-time)"
                value={stats?.paidHires ?? 0}
                sub="Hired into full-time · tap for list"
                tone="success"
                loading={loading && !stats}
                onClick={() => setHiresView("paid")}
              />
              <KpiCard
                icon="ri-graduation-cap-line"
                label="Unpaid (internship)"
                value={stats?.unpaidHires ?? 0}
                sub="Hired into internship · tap for list"
                tone="warning"
                loading={loading && !stats}
                onClick={() => setHiresView("unpaid")}
              />
            </div>
          </div>
        </section>

        {/* ===================== TWO-COLUMN BODY ===================== */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

          {/* LEFT (2/3): funnel + table */}
          <div className="space-y-6 xl:col-span-2">

            {/* ── CONVERSION FUNNEL ── */}
            <section className="rounded-2xl border border-defaultborder/70 bg-white dark:bg-bodybg shadow-sm shadow-black/[0.03] dark:shadow-none overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5 border-b border-defaultborder/50 bg-gradient-to-r from-slate-50/90 to-white dark:from-white/[0.03] dark:to-transparent">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/10 dark:ring-primary/20"
                    aria-hidden
                  >
                    <i className="ri-filter-3-line text-lg" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-defaulttextcolor dark:text-white tracking-tight">
                      Conversion funnel
                    </h2>
                    <p className="text-xs text-defaulttextcolor/60 dark:text-white/50 mt-0.5">
                      Based on last {leads.length} referrals
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-6 py-6">
                {loading && leads.length === 0 ? (
                  <div className="py-8 text-center">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3 ring-1 ring-primary/10">
                      <i className="ri-loader-4-line animate-spin text-2xl" />
                    </div>
                    <p className="text-sm text-defaulttextcolor/70">Loading funnel…</p>
                  </div>
                ) : leads.length === 0 ? (
                  <div className="py-8 text-center">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3 ring-1 ring-primary/10">
                      <i className="ri-filter-3-line text-3xl" />
                    </div>
                    <p className="text-sm text-defaulttextcolor/70">
                      No referrals yet. Use{" "}
                      <Link href={SHARE_CANDIDATE_FORM_PATH} className="text-primary hover:underline font-medium">
                        Refer a candidate
                      </Link>{" "}
                      to get started.
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-3 list-none p-0 m-0">
                    {FUNNEL_STAGES.map((stage) => {
                      const meta = STATUS_META[stage];
                      const count = funnelCounts[stage] || 0;
                      const pct = Math.round((count / funnelMax) * 100);
                      return (
                        <li key={stage} className="flex items-center gap-3">
                          <span className="w-32 shrink-0 text-xs font-semibold text-defaulttextcolor dark:text-white/85">
                            {meta.label}
                          </span>
                          <div className="flex-1 h-6 rounded-lg bg-slate-100 dark:bg-white/5 overflow-hidden border border-defaultborder/40">
                            <div
                              className="h-full rounded-lg transition-[width] duration-700 ease-out"
                              style={{
                                width: `${pct}%`,
                                background: `linear-gradient(90deg, ${meta.color} 0%, ${meta.color}dd 100%)`,
                              }}
                            />
                          </div>
                          <span className="w-12 shrink-0 text-right text-sm font-bold text-defaulttextcolor dark:text-white tabular-nums">
                            {count}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>

            {/* ── RECENT REFERRALS TABLE ── */}
            <section className="rounded-2xl border border-defaultborder/70 bg-white dark:bg-bodybg shadow-sm shadow-black/[0.03] dark:shadow-none overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5 border-b border-defaultborder/50 bg-gradient-to-r from-slate-50/90 to-white dark:from-white/[0.03] dark:to-transparent">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/10 dark:ring-primary/20"
                    aria-hidden
                  >
                    <i className="ri-user-received-line text-lg" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-defaulttextcolor dark:text-white tracking-tight flex items-center gap-2">
                      Recent referrals
                      <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 rounded-full text-[0.6875rem] font-semibold bg-primary/10 text-primary tabular-nums">
                        {recentReferrals.length}
                      </span>
                    </h2>
                    <p className="text-xs text-defaulttextcolor/60 dark:text-white/50 mt-0.5">
                      Tap a row for details
                    </p>
                  </div>
                </div>
                <Link
                  href={REFERRAL_LEADS_PATH}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  View all <i className="ri-arrow-right-line" />
                </Link>
              </div>

              <div className="px-6 py-6">
                {loading && recentReferrals.length === 0 ? (
                  <div className="py-8 text-center">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3 ring-1 ring-primary/10">
                      <i className="ri-loader-4-line animate-spin text-2xl" />
                    </div>
                    <p className="text-sm text-defaulttextcolor/70">Loading referrals…</p>
                  </div>
                ) : recentReferrals.length === 0 ? (
                  <div className="py-8 text-center">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3 ring-1 ring-primary/10">
                      <i className="ri-user-search-line text-3xl" />
                    </div>
                    <p className="text-sm text-defaulttextcolor/70">No referrals yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-defaultborder/70 bg-white dark:bg-white/5">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-defaultborder/70 bg-slate-50/80 dark:bg-white/5">
                          <th className="text-start text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70 px-4 py-3">
                            Candidate
                          </th>
                          <th className="text-start text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70 px-4 py-3">
                            Job
                          </th>
                          <th className="text-start text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70 px-4 py-3">
                            Status
                          </th>
                          <th className="text-start text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70 px-4 py-3 whitespace-nowrap">
                            Claimed
                          </th>
                          <th className="text-end text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70 px-4 py-3 w-10" />
                        </tr>
                      </thead>
                      <tbody>
                        {recentReferrals.map((r) => {
                          const m = getStatusMeta(r.referralPipelineStatus);
                          const initials = (r.fullName || "?")
                            .split(" ")
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((s) => s[0]?.toUpperCase())
                            .join("");
                          return (
                            <tr
                              key={r.id}
                              className="group cursor-pointer border-b border-defaultborder/50 last:border-b-0 hover:bg-primary/[0.03] dark:hover:bg-white/[0.03] transition-colors"
                              onClick={() => setSelected(r)}
                            >
                              <td className="px-4 py-3 align-middle">
                                <div className="flex items-center gap-3">
                                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold ring-1 ring-primary/10">
                                    {initials || "—"}
                                  </span>
                                  <div className="min-w-0">
                                    <div className="font-medium text-defaulttextcolor dark:text-white truncate">
                                      {r.fullName}
                                    </div>
                                    <div className="text-xs text-defaulttextcolor/60 dark:text-white/50 truncate">
                                      {r.email}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 align-middle text-defaulttextcolor/80 dark:text-white/70">
                                {r.job?.title || "—"}
                              </td>
                              <td className="px-4 py-3 align-middle">
                                <span
                                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold"
                                  style={{
                                    background: m.bg,
                                    color: m.color,
                                    border: `1px solid ${m.color}33`,
                                  }}
                                >
                                  <span
                                    className="h-1.5 w-1.5 rounded-full"
                                    style={{ background: m.color }}
                                  />
                                  {m.label}
                                </span>
                              </td>
                              <td className="px-4 py-3 align-middle whitespace-nowrap text-xs text-defaulttextcolor/60 dark:text-white/50 tabular-nums">
                                {fmtDate(r.referredAt || r.createdAt)}
                              </td>
                              <td className="px-4 py-3 text-end align-middle">
                                <i className="ri-arrow-right-s-line text-base text-defaulttextcolor/40 opacity-0 group-hover:opacity-100 group-hover:text-primary transition-all" />
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

          {/* RIGHT (1/3): jobs + status feed */}
          <div className="space-y-6 xl:col-span-1">

            {/* ── OPEN JOBS ── */}
            <section className="rounded-2xl border border-defaultborder/70 bg-white dark:bg-bodybg shadow-sm shadow-black/[0.03] dark:shadow-none overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5 border-b border-defaultborder/50 bg-gradient-to-r from-slate-50/90 to-white dark:from-white/[0.03] dark:to-transparent">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/10 dark:ring-primary/20"
                    aria-hidden
                  >
                    <i className="ri-briefcase-line text-lg" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-defaulttextcolor dark:text-white tracking-tight flex items-center gap-2">
                      Open jobs
                      <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 rounded-full text-[0.6875rem] font-semibold bg-primary/10 text-primary tabular-nums">
                        {jobs.length}
                      </span>
                    </h2>
                    <p className="text-xs text-defaulttextcolor/60 dark:text-white/50 mt-0.5">
                      Share a referral link
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-3 py-2">
                {loading && jobs.length === 0 ? (
                  <div className="py-8 text-center">
                    <i className="ri-loader-4-line animate-spin text-2xl text-primary" />
                    <p className="mt-2 text-sm text-defaulttextcolor/70">Loading jobs…</p>
                  </div>
                ) : jobs.length === 0 ? (
                  <div className="py-8 text-center">
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-2 ring-1 ring-primary/10">
                      <i className="ri-briefcase-line text-2xl" />
                    </div>
                    <p className="text-sm text-defaulttextcolor/70">No active jobs.</p>
                  </div>
                ) : (
                  <ul className="list-none p-0 m-0 divide-y divide-defaultborder/40">
                    {jobs.map((j) => {
                      const id = jobIdOf(j) ?? "";
                      const isBusy = busyJobLink === id;
                      return (
                        <li
                          key={id || j.title}
                          className="flex items-center gap-3 px-3 py-3 rounded-lg transition-colors hover:bg-primary/[0.03] dark:hover:bg-white/[0.03]"
                        >
                          <span
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/10"
                            aria-hidden
                          >
                            <i className="ri-suitcase-line" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-defaulttextcolor dark:text-white">
                              {j.title}
                            </p>
                            <p className="truncate text-xs text-defaulttextcolor/60 dark:text-white/50">
                              {(j.location || "—").toString()} · {(j.jobType || "—").toString()}
                            </p>
                          </div>
                          <button
                            type="button"
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-defaultborder/80 bg-white dark:bg-white/5 px-2.5 py-1.5 text-[0.6875rem] font-medium text-defaulttextcolor hover:bg-primary hover:text-white hover:border-primary transition-all disabled:opacity-50"
                            onClick={() => void onCopyJobLink(j)}
                            disabled={isBusy || !id}
                            title="Copy referral link"
                          >
                            <i className={`ri-${isBusy ? "loader-4-line animate-spin" : "link"}`} />
                            {isBusy ? "…" : "Copy"}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>

            {/* ── STATUS FEED ── */}
            <section className="rounded-2xl border border-defaultborder/70 bg-white dark:bg-bodybg shadow-sm shadow-black/[0.03] dark:shadow-none overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5 border-b border-defaultborder/50 bg-gradient-to-r from-slate-50/90 to-white dark:from-white/[0.03] dark:to-transparent">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/10 dark:ring-primary/20"
                    aria-hidden
                  >
                    <i className="ri-pulse-line text-lg" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-defaulttextcolor dark:text-white tracking-tight">
                      Recent activity
                    </h2>
                    <p className="text-xs text-defaulttextcolor/60 dark:text-white/50 mt-0.5">
                      Latest pipeline movements
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-3 py-2">
                {loading && statusFeed.length === 0 ? (
                  <div className="py-8 text-center">
                    <i className="ri-loader-4-line animate-spin text-2xl text-primary" />
                    <p className="mt-2 text-sm text-defaulttextcolor/70">Loading…</p>
                  </div>
                ) : statusFeed.length === 0 ? (
                  <div className="py-8 text-center">
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-2 ring-1 ring-primary/10">
                      <i className="ri-pulse-line text-2xl" />
                    </div>
                    <p className="text-sm text-defaulttextcolor/70">No pipeline activity yet.</p>
                  </div>
                ) : (
                  <ul className="list-none p-0 m-0 relative">
                    <span
                      className="absolute left-[1.45rem] top-3 bottom-3 w-px bg-defaultborder/60"
                      aria-hidden
                    />
                    {statusFeed.map((r) => {
                      const m = getStatusMeta(r.referralPipelineStatus);
                      return (
                        <li
                          key={r.id}
                          className="relative flex items-start gap-3 px-3 py-3 rounded-lg transition-colors hover:bg-primary/[0.03] dark:hover:bg-white/[0.03]"
                        >
                          <span
                            className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-2 ring-white dark:ring-bodybg"
                            style={{ background: m.bg }}
                            aria-hidden
                          >
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ background: m.color }}
                            />
                          </span>
                          <div className="min-w-0 flex-1 pt-0.5">
                            <p className="text-sm text-defaulttextcolor dark:text-white">
                              <span className="font-medium">{r.fullName}</span>
                              <span className="text-defaulttextcolor/60 dark:text-white/50"> moved to </span>
                              <span className="font-semibold" style={{ color: m.color }}>
                                {m.label}
                              </span>
                            </p>
                            <p className="text-xs text-defaulttextcolor/60 dark:text-white/50 mt-0.5">
                              {r.job?.title ? `${r.job.title} · ` : ""}
                              {relTime(r.referredAt || r.createdAt)}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>
          </div>
        </div>

        {/* ============================ TOAST ============================ */}
        {toast && (
          <div
            role="status"
            aria-live="polite"
            className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2"
          >
            <div className="inline-flex items-center gap-2 rounded-xl bg-defaulttextcolor px-4 py-2.5 text-sm font-medium text-white shadow-lg dark:bg-white dark:text-bodybg ring-1 ring-black/10 dark:ring-white/10">
              <i className="ri-check-line text-base" />
              {toast}
            </div>
          </div>
        )}

        {/* ============================ DETAIL DRAWER ============================ */}
        {selected && (
          <div
            className="fixed inset-0 z-50 flex"
            role="dialog"
            aria-modal="true"
            aria-label="Referral detail"
          >
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setSelected(null)}
            />
            <aside className="relative ml-auto flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl dark:bg-bodybg border-l border-defaultborder/70">
              <div className="flex items-start justify-between gap-3 px-6 py-5 border-b border-defaultborder/50 bg-gradient-to-r from-slate-50/90 to-white dark:from-white/[0.03] dark:to-transparent">
                <div className="flex items-start gap-3 min-w-0">
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/10 dark:ring-primary/20"
                    aria-hidden
                  >
                    <i className="ri-user-line text-2xl" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-primary/80">
                      Referral detail
                    </p>
                    <h2 className="text-lg font-semibold text-defaulttextcolor dark:text-white tracking-tight mt-0.5 truncate">
                      {selected.fullName}
                    </h2>
                    <p className="text-xs text-defaulttextcolor/60 dark:text-white/50 mt-0.5 truncate">
                      {selected.email}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 text-defaulttextcolor/70 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors"
                  onClick={() => setSelected(null)}
                  aria-label="Close"
                >
                  <i className="ri-close-line text-lg" />
                </button>
              </div>

              <div className="flex-1 px-6 py-6 space-y-5">
                <DetailRow label="Status">
                  {(() => {
                    const m = getStatusMeta(selected.referralPipelineStatus);
                    return (
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold"
                        style={{
                          background: m.bg,
                          color: m.color,
                          border: `1px solid ${m.color}33`,
                        }}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: m.color }}
                        />
                        {m.label}
                      </span>
                    );
                  })()}
                </DetailRow>

                {selected.referralContext && (
                  <DetailRow label="Link type">
                    <p className="text-sm font-medium text-defaulttextcolor dark:text-white">
                      {LINK_TYPE[selected.referralContext] || selected.referralContext}
                    </p>
                  </DetailRow>
                )}
                {selected.job?.title && (
                  <DetailRow label="Job">
                    <p className="text-sm font-medium text-defaulttextcolor dark:text-white">
                      {selected.job.title}
                    </p>
                  </DetailRow>
                )}
                {selected.referredAt && (
                  <DetailRow label="Claimed">
                    <p className="text-sm font-medium text-defaulttextcolor dark:text-white tabular-nums">
                      {fmtDate(selected.referredAt)}
                      <span className="text-defaulttextcolor/50"> · </span>
                      {fmtTime(selected.referredAt)}
                    </p>
                  </DetailRow>
                )}
              </div>

              <div className="border-t border-defaultborder/50 px-6 py-5 bg-gradient-to-b from-transparent to-slate-50/50 dark:to-white/[0.02]">
                <Link
                  href={ROUTES.atsCandidateRecordEdit(selected.id)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-primary/90 hover:shadow-md hover:shadow-primary/20 active:scale-[0.98]"
                >
                  <i className="ri-external-link-line" />
                  View candidate profile
                </Link>
              </div>
            </aside>
          </div>
        )}

        {/* ===================== PAID / UNPAID HIRES DRAWER ===================== */}
        {hiresView &&
          (() => {
            const isPaid = hiresView === "paid";
            const items = (isPaid ? stats?.paidHiresList : stats?.unpaidHiresList) ?? [];
            const count = (isPaid ? stats?.paidHires : stats?.unpaidHires) ?? 0;
            return (
              <div
                className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                role="dialog"
                aria-modal="true"
                aria-label="Hired candidates by job type"
              >
                <div
                  className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                  onClick={() => setHiresView(null)}
                />
                <div className="relative flex w-full max-w-lg max-h-[85vh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-bodybg border border-defaultborder/70">
                  <div className="flex items-start justify-between gap-3 px-6 py-5 border-b border-defaultborder/50 bg-gradient-to-r from-slate-50/90 to-white dark:from-white/[0.03] dark:to-transparent">
                    <div className="flex items-start gap-3 min-w-0">
                      <span
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ${
                          isPaid
                            ? "bg-success/10 text-success ring-success/10"
                            : "bg-warning/10 text-warning ring-warning/10"
                        }`}
                        aria-hidden
                      >
                        <i
                          className={`${
                            isPaid ? "ri-money-dollar-circle-line" : "ri-graduation-cap-line"
                          } text-2xl`}
                        />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-primary/80">
                          {isPaid ? "Paid hires" : "Unpaid hires"}
                        </p>
                        <h2 className="text-lg font-semibold text-defaulttextcolor dark:text-white tracking-tight mt-0.5">
                          {count} {isPaid ? "full-time" : "internship"} {count === 1 ? "hire" : "hires"}
                        </h2>
                        <p className="text-xs text-defaulttextcolor/60 dark:text-white/50 mt-0.5">
                          Referred candidates hired into {isPaid ? "full-time roles" : "internships"}.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 text-defaulttextcolor/70 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors"
                      onClick={() => setHiresView(null)}
                      aria-label="Close"
                    >
                      <i className="ri-close-line text-lg" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto px-6 py-6">
                    {items.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-defaultborder/70 px-4 py-10 text-center text-sm text-defaulttextcolor/60 dark:text-white/50">
                        No {isPaid ? "full-time" : "internship"} hires yet.
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {items.map((it) => (
                          <li key={it.id}>
                            <div className="rounded-xl border border-defaultborder/70 px-4 py-3">
                              <span className="block truncate text-sm font-medium text-defaulttextcolor dark:text-white">
                                {it.name}
                              </span>
                              <span className="block truncate text-xs text-defaulttextcolor/55 dark:text-white/45">
                                {it.jobTitle || it.email}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
      </div>
    </Fragment>
  );
}

/* ------------------------------------------------------------------ */
/*  KPI Card                                                            */
/* ------------------------------------------------------------------ */

type KpiTone = "primary" | "success" | "warning" | "info";

const TONE_CLASSES: Record<KpiTone, { bg: string; ring: string; text: string }> = {
  primary: { bg: "bg-primary/10", ring: "ring-primary/10", text: "text-primary" },
  success: { bg: "bg-success/10", ring: "ring-success/10", text: "text-success" },
  warning: { bg: "bg-warning/10", ring: "ring-warning/10", text: "text-warning" },
  info: { bg: "bg-info/10", ring: "ring-info/10", text: "text-info" },
};

function KpiCard(props: {
  icon: string;
  label: string;
  value: number;
  sub?: string;
  tone: KpiTone;
  loading?: boolean;
  onClick?: () => void;
}): JSX.Element {
  const tone = TONE_CLASSES[props.tone];
  const clickable = typeof props.onClick === "function";
  const className = `rounded-xl border border-defaultborder/70 bg-white dark:bg-white/[0.03] p-5 hover:shadow-md hover:shadow-black/[0.04] dark:hover:shadow-none transition-shadow duration-300 ${
    clickable ? "w-full text-left cursor-pointer hover:border-primary/40" : ""
  }`;
  const inner = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-defaulttextcolor/60 dark:text-white/50">
          {props.label}
        </p>
        {props.loading ? (
          <div className="mt-2 h-8 w-20 animate-pulse rounded-lg bg-slate-100 dark:bg-white/10" />
        ) : (
          <p className={`mt-1 text-3xl font-bold tabular-nums ${tone.text}`}>
            {props.value}
          </p>
        )}
        {props.sub && (
          <p className="mt-1 text-xs text-defaulttextcolor/60 dark:text-white/50 truncate">
            {props.sub}
          </p>
        )}
      </div>
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone.bg} ${tone.text} ring-1 ${tone.ring}`}
        aria-hidden
      >
        <i className={`${props.icon} text-xl`} />
      </span>
    </div>
  );
  return clickable ? (
    <button type="button" onClick={props.onClick} className={className}>
      {inner}
    </button>
  ) : (
    <div className={className}>{inner}</div>
  );
}

/* ------------------------------------------------------------------ */
/*  Detail row                                                          */
/* ------------------------------------------------------------------ */

function DetailRow(props: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div>
      <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-defaulttextcolor/60 dark:text-white/50 mb-1.5">
        {props.label}
      </p>
      {props.children}
    </div>
  );
}
