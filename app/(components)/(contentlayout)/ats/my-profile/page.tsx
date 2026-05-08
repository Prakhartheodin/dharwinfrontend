"use client";

import Seo from "@/shared/layout-components/seo/seo";
import Pageheader from "@/shared/layout-components/page-header/pageheader";
import Link from "next/link";
import React, { Fragment, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/shared/contexts/auth-context";
import { useHasEmployeeRole } from "@/shared/hooks/use-has-employee-role";
import { getMeWithCandidate, sendMyVerificationEmail } from "@/shared/lib/api/auth";
import type { CandidateWithProfile } from "@/shared/lib/api/auth";
import { ROUTES } from "@/shared/lib/constants";
import { listActivityLogs } from "@/shared/lib/api/activity-logs";
import type { User, ActivityLog } from "@/shared/lib/types";
import { getDocumentDownloadUrl } from "@/shared/lib/api/candidates";
import { getMyMatchingJobs } from "@/shared/lib/api/employees";
import type { JobMatch } from "@/shared/lib/api/employees";
import Swal from "sweetalert2";

function normalizeSocialUrlForHref(raw: string): string {
  const u = raw.trim();
  if (!u) return "#";
  if (/^https?:\/\//i.test(u)) return u;
  return `https://${u}`;
}

function normalizeRoleIdList(raw: unknown): string[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw
    .map((x) => {
      if (typeof x === "string" || typeof x === "number") return String(x);
      if (x && typeof x === "object") {
        const o = x as { id?: string; _id?: string };
        return String(o.id ?? o._id ?? "");
      }
      return "";
    })
    .filter(Boolean);
}

function getInitial(name: string | undefined | null): string {
  if (!name) return "?";
  return name.charAt(0).toUpperCase();
}

function formatActivityDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "";
  }
}

function actionIcon(action: string): { bg: string; icon: string } {
  const a = action.toLowerCase();
  if (a.includes("create") || a.includes("add"))
    return { bg: "bg-primary/10 !text-primary", icon: "ri-add-circle-line" };
  if (a.includes("update") || a.includes("edit"))
    return { bg: "bg-warning/10 !text-warning", icon: "ri-edit-line" };
  if (a.includes("delete") || a.includes("remove"))
    return { bg: "bg-danger/10 !text-danger", icon: "ri-delete-bin-line" };
  if (a.includes("login") || a.includes("auth"))
    return { bg: "bg-success/10 !text-success", icon: "ri-login-circle-line" };
  if (a.includes("logout"))
    return { bg: "bg-secondary/10 !text-secondary", icon: "ri-logout-circle-line" };
  return { bg: "bg-info/10 !text-info", icon: "ri-information-line" };
}

function humanizeAction(action: string): string {
  return action
    .replace(/[._-]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ─── Reusable design primitives (match meeting-overlay vibe) ─────────────── */

function Eyebrow({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-defaultborder/50 pb-2.5 mb-3 dark:border-white/10">
      <p className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-primary dark:text-primary/90 m-0">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
        {children}
      </p>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border border-defaultborder/70 bg-gradient-to-br from-slate-50/90 via-white to-white p-4 shadow-sm ring-1 ring-black/[0.03] dark:from-white/[0.04] dark:via-bodybg dark:to-bodybg dark:border-defaultborder/20 dark:ring-white/[0.04] ${className}`}
    >
      {children}
    </div>
  );
}

function MetaCell({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-defaultborder/60 bg-white/80 px-3 py-2.5 backdrop-blur-sm dark:bg-bodybg/60 dark:border-defaultborder/15">
      <span className="block text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-textmuted dark:text-white/45">
        {label}
      </span>
      <span
        className={`mt-0.5 block truncate text-[0.85rem] font-medium text-defaulttextcolor dark:text-white ${
          mono ? "font-mono tracking-tight" : ""
        }`}
        title={typeof value === "string" ? value : undefined}
      >
        {value || "—"}
      </span>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: string;
  label: string;
  value: number | string;
  tone: "primary" | "success" | "warning" | "info";
}) {
  const toneMap: Record<string, string> = {
    primary: "text-primary bg-primary/[0.08] ring-primary/15",
    success: "text-success bg-success/[0.08] ring-success/15",
    warning: "text-warning bg-warning/[0.08] ring-warning/15",
    info: "text-info bg-info/[0.08] ring-info/15",
  };
  return (
    <div className="group relative overflow-hidden rounded-xl border border-defaultborder/70 bg-gradient-to-br from-white via-white to-slate-50/60 p-3.5 shadow-sm ring-1 ring-black/[0.03] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:from-bodybg dark:via-bodybg dark:to-white/[0.02] dark:border-defaultborder/20 dark:ring-white/[0.04]">
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 ${toneMap[tone]}`}
          aria-hidden
        >
          <i className={`${icon} text-[1.1rem]`} />
        </span>
        <div className="min-w-0">
          <span className="block text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-textmuted dark:text-white/45">
            {label}
          </span>
          <span className="mt-0.5 block text-lg font-semibold tracking-tight text-defaulttextcolor dark:text-white">
            {value}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Circular progress ring (SVG) for profile completion. */
function CompletionRing({ percent, size = 84 }: { percent: number; size?: number }) {
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, percent)) / 100) * c;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-white/15 dark:text-white/10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          className="text-white transition-[stroke-dasharray] duration-700 ease-out motion-reduce:transition-none"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-base font-bold leading-none text-white">{Math.round(percent)}%</span>
        <span className="text-[0.55rem] uppercase tracking-[0.12em] text-white/70">Complete</span>
      </div>
    </div>
  );
}

function SkillPill({ name, level }: { name: string; level?: string }) {
  return (
    <span
      title={level ? `Level: ${level}` : undefined}
      className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/[0.06] px-2.5 py-1 text-[0.7rem] font-medium text-primary shadow-sm dark:border-primary/30 dark:bg-primary/10"
    >
      {level ? <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden /> : null}
      {name}
    </span>
  );
}

function TimelineItem({
  icon,
  iconTone,
  title,
  subtitle,
  description,
  isLast = false,
}: {
  icon: string;
  iconTone: "primary" | "info" | "success" | "warning";
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  description?: React.ReactNode;
  isLast?: boolean;
}) {
  const toneMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary ring-primary/20",
    info: "bg-info/10 text-info ring-info/20",
    success: "bg-success/10 text-success ring-success/20",
    warning: "bg-warning/10 text-warning ring-warning/20",
  };
  return (
    <li className="relative flex gap-3 pb-4 last:pb-0">
      {!isLast && (
        <span
          className="absolute left-[1.05rem] top-9 bottom-0 w-px bg-gradient-to-b from-defaultborder via-defaultborder/60 to-transparent dark:from-white/10 dark:via-white/5"
          aria-hidden
        />
      )}
      <span
        className={`relative z-[1] inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1 ${toneMap[iconTone]}`}
      >
        <i className={`${icon} text-[0.95rem]`} aria-hidden />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="mb-0 text-[0.85rem] font-semibold tracking-tight text-defaulttextcolor dark:text-white truncate">
          {title}
        </p>
        {subtitle && (
          <p className="mb-0 mt-0.5 text-[0.72rem] text-textmuted dark:text-white/50 truncate">{subtitle}</p>
        )}
        {description && (
          <p className="mb-0 mt-1 text-[0.72rem] leading-relaxed text-textmuted/90 dark:text-white/45 line-clamp-2">
            {description}
          </p>
        )}
      </div>
    </li>
  );
}

/* ─── Main view ───────────────────────────────────────────────────────────── */

function DynamicProfileView({
  candidate,
  serverEmailVerified,
}: {
  candidate?: CandidateWithProfile | null;
  /** From GET /auth/me/with-candidate `user.isEmailVerified` — avoids stale auth context after verify */
  serverEmailVerified?: boolean | null;
}) {
  const { user, refreshUser, roleNames, permissionsLoaded } = useAuth();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [matchingJobs, setMatchingJobs] = useState<JobMatch[]>([]);
  const [matchingJobsLoading, setMatchingJobsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "activity" | "jobs">("overview");
  const [resendVerificationSending, setResendVerificationSending] = useState(false);
  const [resendVerificationMessage, setResendVerificationMessage] = useState<"success" | "error" | null>(null);

  const u = user as
    | (User & {
        phoneNumber?: string;
        countryCode?: string;
        location?: string;
        profileSummary?: string;
        education?: string;
        domain?: string[];
      })
    | null;
  const displayName = (candidate?.fullName ?? u?.name ?? u?.email) ?? "—";
  const displayPhone = candidate?.phoneNumber ?? u?.phoneNumber;
  const displayCountryCode = candidate?.countryCode ?? (u as { countryCode?: string })?.countryCode;
  const displayBio = candidate?.shortBio ?? (u as { profileSummary?: string })?.profileSummary;
  const displayAddress = candidate?.address
    ? [
        candidate.address.streetAddress,
        candidate.address.city,
        candidate.address.state,
        candidate.address.zipCode,
        candidate.address.country,
      ]
        .filter(Boolean)
        .join(", ")
    : (u as { location?: string })?.location;

  const roleDisplayName = useMemo(() => {
    if (!u) return "—";
    const apiNames = (roleNames ?? []).map((n) => n.trim()).filter(Boolean);
    if (permissionsLoaded && apiNames.length > 0) {
      return apiNames.join(", ");
    }
    const ids = normalizeRoleIdList(u.roleIds);
    if (ids.length === 0) {
      const r = (u.role ?? "").toString().trim().toLowerCase();
      if (!r) return "—";
      if (r === "user" || r === "candidate" || r === "employee") return "Employee";
      return r.charAt(0).toUpperCase() + r.slice(1);
    }
    const fallback = (u.role ?? "").toString().trim();
    if (!fallback) return "—";
    return fallback.charAt(0).toUpperCase() + fallback.slice(1);
  }, [u, roleNames, permissionsLoaded]);

  useEffect(() => {
    if (!u) return;
    listActivityLogs({ actor: u.id, limit: 20, sortBy: "createdAt:desc" })
      .then((res) => setActivities(res.results))
      .catch(() => {})
      .finally(() => setActivitiesLoading(false));
  }, [u]);

  useEffect(() => {
    if (!candidate?.skills?.length) return;
    setMatchingJobsLoading(true);
    getMyMatchingJobs({ limit: 10, minScore: 1 })
      .then((res) => setMatchingJobs(res.matches))
      .catch(() => {})
      .finally(() => setMatchingJobsLoading(false));
  }, [candidate]);

  const completion = useMemo(() => {
    if (!u) return 0;
    const checks = [
      !!u.profilePicture?.url,
      !!u.email,
      !!displayName && displayName !== "—",
      !!displayPhone,
      !!displayAddress,
      !!displayBio,
      (candidate?.skills?.length ?? 0) > 0,
      (candidate?.qualifications?.length ?? 0) > 0,
      (candidate?.experiences?.length ?? 0) > 0,
      (candidate?.socialLinks?.length ?? 0) > 0,
      (candidate?.documents?.length ?? 0) > 0,
    ];
    const filled = checks.filter(Boolean).length;
    return (filled / checks.length) * 100;
  }, [u, displayName, displayPhone, displayAddress, displayBio, candidate]);

  if (!u) {
    return (
      <div className="text-center py-12 text-defaulttextcolor/70">
        Please sign in to view your profile.
      </div>
    );
  }

  const displayEmployeeId = candidate?.employeeId ?? "—";
  const socialLinksList = Array.isArray(candidate?.socialLinks)
    ? candidate.socialLinks.filter((s) => String(s?.url ?? "").trim() || String(s?.platform ?? "").trim())
    : [];
  const candidateIdForDocs = candidate?.id ?? candidate?._id;

  const personalInfo: { label: string; value: string; mono?: boolean }[] = [
    { label: "Email", value: u?.email ?? "—" },
    ...(displayPhone
      ? [{ label: "Phone", value: `${displayCountryCode ? displayCountryCode + " " : ""}${displayPhone}` }]
      : []),
    { label: "Employee ID", value: displayEmployeeId, mono: true },
    { label: roleDisplayName.includes(",") ? "Roles" : "Role", value: roleDisplayName },
    ...(displayAddress ? [{ label: "Address", value: displayAddress }] : []),
    ...(u.education ? [{ label: "Education", value: u.education }] : []),
    ...(u.domain && u.domain.length > 0 ? [{ label: "Domain", value: u.domain.join(", ") }] : []),
  ];

  const contextVerified = (u as { isEmailVerified?: boolean }).isEmailVerified === true;
  const isEmailVerified = contextVerified || serverEmailVerified === true;
  const handleResendVerification = async () => {
    setResendVerificationMessage(null);
    setResendVerificationSending(true);
    try {
      await sendMyVerificationEmail();
      setResendVerificationMessage("success");
      refreshUser?.();
    } catch {
      setResendVerificationMessage("error");
    } finally {
      setResendVerificationSending(false);
    }
  };

  const visibleSkills = candidate?.skills?.slice(0, 14) ?? [];
  const extraSkillCount = (candidate?.skills?.length ?? 0) - visibleSkills.length;

  const stats = [
    { icon: "ri-tools-line", label: "Skills", value: candidate?.skills?.length ?? 0, tone: "primary" as const },
    {
      icon: "ri-briefcase-line",
      label: "Job Matches",
      value: matchingJobsLoading ? "…" : matchingJobs.length,
      tone: "success" as const,
    },
    {
      icon: "ri-graduation-cap-line",
      label: "Education",
      value: candidate?.qualifications?.length ?? 0,
      tone: "warning" as const,
    },
    {
      icon: "ri-building-2-line",
      label: "Experience",
      value: candidate?.experiences?.length ?? 0,
      tone: "info" as const,
    },
  ];

  return (
    <div className="space-y-5 pb-6 motion-safe:animate-[fadeIn_0.4s_ease-out]">
      {!isEmailVerified && (
        <div className="rounded-xl border border-warning/30 bg-warning/[0.06] p-3.5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="m-0 flex items-center gap-2 text-[0.85rem] text-defaulttextcolor dark:text-white/90">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-warning/15 text-warning">
                <i className="ri-mail-unread-line" />
              </span>
              Email not verified. Check inbox or request a new link.
            </p>
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resendVerificationSending}
              className="ti-btn ti-btn-warning ti-btn-sm !h-9 !py-0 !px-4 !w-auto inline-flex items-center justify-center !text-sm font-medium whitespace-nowrap"
            >
              {resendVerificationSending ? (
                <>
                  <span className="animate-spin inline-block me-1.5 w-3 h-3 border-2 border-current border-t-transparent rounded-full" />
                  Sending…
                </>
              ) : (
                <>
                  <i className="ri-mail-send-line me-1.5 align-middle" />
                  Resend
                </>
              )}
            </button>
          </div>
          {resendVerificationMessage === "success" && (
            <p className="m-0 mt-2 text-success text-xs">Verification email sent.</p>
          )}
          {resendVerificationMessage === "error" && (
            <p className="m-0 mt-2 text-danger text-xs">Failed to send. Try again later.</p>
          )}
        </div>
      )}

      <div className="relative overflow-hidden rounded-2xl border border-defaultborder/70 shadow-sm ring-1 ring-black/[0.03] dark:border-defaultborder/15 dark:ring-white/[0.04]">
        <div
          className="absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(60% 110% at 0% 0%, rgba(99,102,241,0.55) 0%, rgba(99,102,241,0) 60%), radial-gradient(70% 120% at 100% 100%, rgba(236,72,153,0.40) 0%, rgba(236,72,153,0) 60%), linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
          aria-hidden
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
          }}
        />
        <div
          className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full opacity-50 blur-3xl"
          aria-hidden
          style={{ background: "radial-gradient(circle, rgba(34,197,94,0.4), transparent 70%)" }}
        />

        <div className="relative grid grid-cols-1 gap-5 p-5 md:grid-cols-[auto_1fr_auto] md:items-center md:gap-6 md:p-7">
          <div className="relative shrink-0">
            <div className="relative">
              {u.profilePicture?.url ? (
                <img
                  src={u.profilePicture.url}
                  alt=""
                  className="h-20 w-20 rounded-2xl object-cover ring-2 ring-white/30 shadow-2xl md:h-24 md:w-24"
                />
              ) : (
                <span className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-white/30 to-white/10 text-2xl font-bold uppercase text-white ring-2 ring-white/30 shadow-2xl backdrop-blur-sm md:h-24 md:w-24 md:text-3xl">
                  {getInitial(u.name ?? u.email)}
                </span>
              )}
              <span
                className="absolute -bottom-1 -right-1 inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-success shadow-md"
                title="Online"
              >
                <span className="h-2 w-2 rounded-full bg-white" />
              </span>
            </div>
          </div>

          <div className="min-w-0">
            <div className="mb-1 inline-flex flex-wrap items-center gap-2">
              {isEmailVerified && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/40 bg-emerald-400/15 px-2 py-0.5 text-[0.65rem] font-semibold text-emerald-200 backdrop-blur-sm">
                  <i className="ri-verified-badge-fill" />
                  Verified
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-white/85 backdrop-blur-sm">
                <i className="ri-shield-user-line" />
                {roleDisplayName}
              </span>
            </div>
            <h1 className="m-0 truncate text-2xl font-bold tracking-tight text-white md:text-[1.6rem]" title={displayName}>
              {displayName}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.78rem] text-white/75">
              <a
                href={`mailto:${u.email}`}
                className="inline-flex items-center gap-1.5 hover:text-white transition-colors"
                title={u.email ?? ""}
              >
                <i className="ri-mail-line" />
                <span className="max-w-[16rem] truncate">{u.email}</span>
              </a>
              {displayPhone && (
                <span className="inline-flex items-center gap-1.5">
                  <i className="ri-phone-line" />
                  {displayCountryCode ? `${displayCountryCode} ` : ""}
                  {displayPhone}
                </span>
              )}
              {displayAddress && (
                <span className="inline-flex items-center gap-1.5 truncate" title={displayAddress}>
                  <i className="ri-map-pin-line" />
                  <span className="max-w-[18rem] truncate">{displayAddress}</span>
                </span>
              )}
              {displayEmployeeId && displayEmployeeId !== "—" && (
                <span className="inline-flex items-center gap-1.5 font-mono text-[0.72rem] tracking-tight">
                  <i className="ri-id-card-line" />
                  {displayEmployeeId}
                </span>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Link
                href="/settings/personal-information/"
                className="inline-flex h-9 items-center justify-center rounded-lg bg-white px-4 text-[0.8125rem] font-semibold text-slate-900 shadow-md transition-transform duration-150 hover:bg-white/95 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
              >
                <i className="ri-edit-2-line me-1.5" />
                Edit Profile
              </Link>
              <Link
                href="/settings/"
                className="inline-flex h-9 items-center justify-center rounded-lg border border-white/30 bg-white/10 px-4 text-[0.8125rem] font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                <i className="ri-settings-3-line me-1.5" />
                Settings
              </Link>
            </div>
          </div>

          <div className="hidden md:flex flex-col items-center gap-1">
            <CompletionRing percent={completion} size={92} />
            {completion < 100 && (
              <Link
                href="/settings/personal-information/"
                className="text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-white/70 hover:text-white transition-colors"
              >
                Complete profile →
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.label} icon={s.icon} label={s.label} value={s.value} tone={s.tone} />
        ))}
      </div>

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12 space-y-5 lg:col-span-4 xl:col-span-4 xxl:col-span-3">
          {displayBio && (
            <SectionCard>
              <Eyebrow>About</Eyebrow>
              <p className="m-0 text-[0.8125rem] leading-relaxed text-defaulttextcolor/85 dark:text-white/70 whitespace-pre-line">
                {displayBio}
              </p>
            </SectionCard>
          )}

          {visibleSkills.length > 0 && (
            <SectionCard>
              <Eyebrow
                action={
                  <Link href="/settings/personal-information/" className="text-[0.7rem] font-medium text-primary hover:underline">
                    Edit
                  </Link>
                }
              >
                Skills
              </Eyebrow>
              <div className="flex flex-wrap gap-1.5">
                {visibleSkills.map((s, i) => (
                  <SkillPill key={`${s.name}-${i}`} name={s.name} level={s.level} />
                ))}
                {extraSkillCount > 0 && (
                  <span className="inline-flex items-center rounded-full border border-defaultborder bg-white/80 px-2.5 py-1 text-[0.7rem] font-medium text-textmuted backdrop-blur-sm dark:border-defaultborder/20 dark:bg-white/5 dark:text-white/60">
                    +{extraSkillCount} more
                  </span>
                )}
              </div>
            </SectionCard>
          )}

          {u.domain && u.domain.length > 0 && (
            <SectionCard>
              <Eyebrow>Domain</Eyebrow>
              <div className="flex flex-wrap gap-1.5">
                {u.domain.map((d) => (
                  <span
                    key={d}
                    className="inline-flex items-center gap-1.5 rounded-full border border-defaultborder bg-white/80 px-2.5 py-1 text-[0.7rem] font-medium text-defaulttextcolor backdrop-blur-sm dark:border-defaultborder/20 dark:bg-white/5 dark:text-white/80"
                  >
                    <i className="ri-focus-3-line text-[0.75rem] text-textmuted" />
                    {d}
                  </span>
                ))}
              </div>
            </SectionCard>
          )}

          {socialLinksList.length > 0 && (
            <SectionCard>
              <Eyebrow
                action={
                  <Link href="/settings/personal-information/" className="text-[0.7rem] font-medium text-primary hover:underline">
                    Edit
                  </Link>
                }
              >
                Social
              </Eyebrow>
              <div className="space-y-1.5">
                {socialLinksList.map((s, i) => {
                  const href = normalizeSocialUrlForHref(String(s.url ?? ""));
                  const label = String(s.platform ?? "").trim() || "Link";
                  return (
                    <a
                      key={`${label}-${i}`}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center justify-between gap-2 rounded-lg border border-defaultborder/60 bg-white/70 px-3 py-2 text-[0.78rem] text-defaulttextcolor transition-colors hover:border-primary/30 hover:bg-primary/[0.04] dark:bg-bodybg/60 dark:border-defaultborder/15 dark:text-white/85"
                    >
                      <span className="inline-flex items-center gap-2 truncate">
                        <i className="ri-link-m text-primary" />
                        <span className="truncate">{label}</span>
                      </span>
                      <i className="ri-external-link-line text-textmuted group-hover:text-primary transition-colors" />
                    </a>
                  );
                })}
              </div>
            </SectionCard>
          )}

          {candidate?.documents && candidate.documents.length > 0 && (
            <SectionCard>
              <Eyebrow
                action={
                  <Link href="/settings/personal-information/" className="text-[0.7rem] font-medium text-primary hover:underline">
                    Manage
                  </Link>
                }
              >
                Documents
              </Eyebrow>
              <div className="space-y-1.5">
                {candidate.documents.map((doc, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-2 rounded-lg border border-defaultborder/60 bg-white/70 px-3 py-2 dark:bg-bodybg/60 dark:border-defaultborder/15"
                  >
                    <span className="inline-flex items-center gap-2 min-w-0 text-[0.78rem]">
                      <i className="ri-file-line text-info shrink-0" />
                      <span className="truncate">{doc.label || doc.type || `Document ${index + 1}`}</span>
                    </span>
                    {candidateIdForDocs && (doc.key || doc.url) ? (
                      <button
                        type="button"
                        className="ti-btn ti-btn-sm ti-btn-outline-primary !w-auto !h-7 !py-0 !px-2 inline-flex items-center justify-center text-[0.7rem]"
                        onClick={async () => {
                          try {
                            const { url } = await getDocumentDownloadUrl(candidateIdForDocs, index);
                            window.open(url, "_blank", "noopener,noreferrer");
                          } catch {
                            Swal.fire("Error", "Could not open document.", "error");
                          }
                        }}
                        aria-label={`Open ${doc.label || doc.type || "document"}`}
                      >
                        <i className="ri-external-link-line" />
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>

        <div className="col-span-12 lg:col-span-8 xl:col-span-8 xxl:col-span-9">
          <div className="rounded-2xl border border-defaultborder/70 bg-white shadow-sm ring-1 ring-black/[0.03] dark:bg-bodybg2 dark:border-defaultborder/20 dark:ring-white/[0.04]">
            <div className="flex items-center gap-1 overflow-x-auto border-b border-defaultborder/60 px-3 pt-3 dark:border-defaultborder/15">
              {(
                [
                  { id: "overview", label: "Overview", icon: "ri-user-3-line", count: undefined as number | undefined },
                  { id: "activity", label: "Activity", icon: "ri-history-line", count: activities.length || undefined },
                  { id: "jobs", label: "Jobs", icon: "ri-briefcase-line", count: matchingJobs.length || undefined },
                ] as const
              ).map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative -mb-px inline-flex items-center gap-1.5 whitespace-nowrap rounded-t-lg border-b-2 px-3.5 py-2.5 text-[0.8125rem] font-semibold transition-colors ${
                      isActive
                        ? "border-primary text-primary"
                        : "border-transparent text-textmuted hover:text-defaulttextcolor dark:text-white/55 dark:hover:text-white/85"
                    }`}
                  >
                    <i className={`${tab.icon} text-[0.95rem]`} />
                    {tab.label}
                    {typeof tab.count === "number" && tab.count > 0 && (
                      <span
                        className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.6rem] font-bold ${
                          isActive ? "bg-primary text-white" : "bg-defaultborder/60 text-defaulttextcolor dark:bg-white/10 dark:text-white/70"
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {activeTab === "overview" && (
              <div className="space-y-5 p-4 md:p-5 motion-safe:animate-[fadeIn_0.3s_ease-out]">
                <section>
                  <Eyebrow>Personal Information</Eyebrow>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {personalInfo.map((item) => (
                      <MetaCell key={item.label} label={item.label} value={item.value} mono={item.mono} />
                    ))}
                  </div>
                </section>

                {((candidate?.qualifications?.length ?? 0) > 0 || (candidate?.experiences?.length ?? 0) > 0) && (
                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    {candidate?.qualifications && candidate.qualifications.length > 0 && (
                      <section>
                        <Eyebrow>Education</Eyebrow>
                        <ul className="m-0 list-none p-0">
                          {candidate.qualifications.map((q, i) => (
                            <TimelineItem
                              key={i}
                              icon="ri-graduation-cap-line"
                              iconTone="warning"
                              isLast={i === candidate.qualifications!.length - 1}
                              title={q.degree}
                              subtitle={
                                <span>
                                  {q.institute}
                                  {q.location && <span> · {q.location}</span>}
                                  {(q.startYear || q.endYear) && (
                                    <span>
                                      {" "}
                                      · {q.startYear ?? "?"} – {q.endYear ?? "Present"}
                                    </span>
                                  )}
                                </span>
                              }
                              description={q.description}
                            />
                          ))}
                        </ul>
                      </section>
                    )}

                    {candidate?.experiences && candidate.experiences.length > 0 && (
                      <section>
                        <Eyebrow>Experience</Eyebrow>
                        <ul className="m-0 list-none p-0">
                          {candidate.experiences.map((exp, i) => (
                            <TimelineItem
                              key={i}
                              icon="ri-building-2-line"
                              iconTone="info"
                              isLast={i === candidate.experiences!.length - 1}
                              title={exp.role}
                              subtitle={
                                <span>
                                  {exp.company}
                                  {(exp.startDate || exp.endDate) && (
                                    <span>
                                      {" · "}
                                      {exp.startDate
                                        ? new Date(exp.startDate).toLocaleDateString(undefined, {
                                            month: "short",
                                            year: "numeric",
                                          })
                                        : "?"}
                                      {" – "}
                                      {exp.currentlyWorking
                                        ? "Present"
                                        : exp.endDate
                                        ? new Date(exp.endDate).toLocaleDateString(undefined, {
                                            month: "short",
                                            year: "numeric",
                                          })
                                        : "?"}
                                    </span>
                                  )}
                                </span>
                              }
                              description={exp.description}
                            />
                          ))}
                        </ul>
                      </section>
                    )}
                  </div>
                )}

                {!candidate?.qualifications?.length &&
                  !candidate?.experiences?.length &&
                  personalInfo.length <= 4 && (
                    <div className="rounded-xl border border-dashed border-defaultborder/70 p-8 text-center dark:border-defaultborder/20">
                      <span className="mx-auto mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <i className="ri-user-add-line text-xl" />
                      </span>
                      <p className="m-0 text-[0.875rem] font-semibold">Your profile is light on details</p>
                      <p className="m-0 mt-1 text-[0.78rem] text-textmuted dark:text-white/50">
                        Add education, work experience, and skills so recruiters can find you.
                      </p>
                      <Link
                        href="/settings/personal-information/"
                        className="ti-btn ti-btn-primary !h-9 !py-0 !px-4 mt-3 inline-flex w-auto items-center justify-center !text-sm font-medium"
                      >
                        <i className="ri-edit-2-line me-1.5" />
                        Edit Profile
                      </Link>
                    </div>
                  )}
              </div>
            )}

            {activeTab === "activity" && (
              <div className="p-4 md:p-5 motion-safe:animate-[fadeIn_0.3s_ease-out]">
                {activitiesLoading ? (
                  <div className="space-y-3">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 rounded-lg border border-defaultborder/60 p-3 dark:border-defaultborder/15"
                      >
                        <span className="h-9 w-9 shrink-0 rounded-full bg-defaultborder/40 motion-safe:animate-pulse dark:bg-white/5" />
                        <div className="flex-1 space-y-2">
                          <span className="block h-3 w-3/4 rounded bg-defaultborder/40 motion-safe:animate-pulse dark:bg-white/5" />
                          <span className="block h-2 w-1/2 rounded bg-defaultborder/30 motion-safe:animate-pulse dark:bg-white/[0.03]" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : activities.length === 0 ? (
                  <div className="py-12 text-center">
                    <span className="mx-auto mb-2 inline-flex h-14 w-14 items-center justify-center rounded-full bg-textmuted/10 text-textmuted">
                      <i className="ri-history-line text-2xl" />
                    </span>
                    <p className="m-0 text-[0.9rem] font-semibold text-defaulttextcolor dark:text-white">No activity yet</p>
                    <p className="m-0 mt-1 text-[0.78rem] text-textmuted dark:text-white/50">
                      Your recent actions will show up here.
                    </p>
                  </div>
                ) : (
                  <ul className="m-0 list-none p-0">
                    {activities.map((log, i) => {
                      const ai = actionIcon(log.action);
                      const isLast = i === activities.length - 1;
                      return (
                        <li key={log.id} className="relative flex gap-3 pb-4 last:pb-0">
                          {!isLast && (
                            <span
                              className="absolute left-[1.05rem] top-9 bottom-0 w-px bg-gradient-to-b from-defaultborder via-defaultborder/60 to-transparent dark:from-white/10 dark:via-white/5"
                              aria-hidden
                            />
                          )}
                          <span
                            className={`relative z-[1] inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1 ring-current/20 ${ai.bg}`}
                          >
                            <i className={`${ai.icon} text-[0.95rem]`} aria-hidden />
                          </span>
                          <div className="min-w-0 flex-1 pt-0.5">
                            <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                              <p className="m-0 text-[0.85rem] font-semibold text-defaulttextcolor dark:text-white">
                                {humanizeAction(log.action)}
                                {log.entityType && (
                                  <span className="ms-1 font-normal text-textmuted dark:text-white/55">
                                    on{" "}
                                    <span className="font-semibold text-defaulttextcolor/85 dark:text-white/75">
                                      {log.entityType}
                                    </span>
                                    {log.entityId && (
                                      <span className="ms-1 font-mono text-[0.7rem] text-textmuted/80 dark:text-white/40">
                                        ({log.entityId.slice(-6)})
                                      </span>
                                    )}
                                  </span>
                                )}
                              </p>
                              <span className="text-[0.7rem] text-textmuted dark:text-white/45">
                                {formatActivityDate(log.createdAt)}
                              </span>
                            </div>
                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                              <p className="m-0 mt-1 text-[0.72rem] text-textmuted dark:text-white/45 line-clamp-2">
                                {Object.entries(log.metadata)
                                  .filter(([, v]) => v != null && v !== "")
                                  .slice(0, 3)
                                  .map(
                                    ([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`
                                  )
                                  .join(" · ")}
                              </p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}

            {activeTab === "jobs" && (
              <div className="p-4 md:p-5 motion-safe:animate-[fadeIn_0.3s_ease-out]">
                {!candidate?.skills?.length ? (
                  <div className="py-12 text-center">
                    <span className="mx-auto mb-2 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <i className="ri-tools-line text-2xl" />
                    </span>
                    <p className="m-0 text-[0.9rem] font-semibold text-defaulttextcolor dark:text-white">
                      Add skills to unlock job matches
                    </p>
                    <p className="m-0 mt-1 text-[0.78rem] text-textmuted dark:text-white/50">
                      We&apos;ll surface roles that align with your capabilities.
                    </p>
                    <Link
                      href="/settings/personal-information/"
                      className="ti-btn ti-btn-primary !h-9 !py-0 !px-4 mt-3 inline-flex w-auto items-center justify-center !text-sm font-medium"
                    >
                      <i className="ri-add-line me-1.5" />
                      Add skills
                    </Link>
                  </div>
                ) : matchingJobsLoading ? (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-defaultborder/60 p-4 dark:border-defaultborder/15"
                      >
                        <div className="space-y-2">
                          <span className="block h-3 w-3/4 rounded bg-defaultborder/40 motion-safe:animate-pulse dark:bg-white/5" />
                          <span className="block h-2 w-1/2 rounded bg-defaultborder/30 motion-safe:animate-pulse dark:bg-white/[0.03]" />
                          <span className="block h-7 w-full rounded bg-defaultborder/30 motion-safe:animate-pulse dark:bg-white/[0.03]" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : matchingJobs.length === 0 ? (
                  <div className="py-12 text-center">
                    <span className="mx-auto mb-2 inline-flex h-14 w-14 items-center justify-center rounded-full bg-textmuted/10 text-textmuted">
                      <i className="ri-search-line text-2xl" />
                    </span>
                    <p className="m-0 text-[0.9rem] font-semibold text-defaulttextcolor dark:text-white">
                      No matching jobs right now
                    </p>
                    <p className="m-0 mt-1 text-[0.78rem] text-textmuted dark:text-white/50">
                      Add more skills or check back soon.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {matchingJobs.map((job) => {
                      const scoreTone =
                        job.fitScore >= 80
                          ? {
                              bar: "bg-emerald-500",
                              text: "text-emerald-600 dark:text-emerald-400",
                              bg: "bg-emerald-500/10",
                              ring: "ring-emerald-500/20",
                            }
                          : job.fitScore >= 60
                          ? {
                              bar: "bg-sky-500",
                              text: "text-sky-600 dark:text-sky-400",
                              bg: "bg-sky-500/10",
                              ring: "ring-sky-500/20",
                            }
                          : job.fitScore >= 40
                          ? {
                              bar: "bg-amber-500",
                              text: "text-amber-600 dark:text-amber-400",
                              bg: "bg-amber-500/10",
                              ring: "ring-amber-500/20",
                            }
                          : {
                              bar: "bg-slate-400",
                              text: "text-textmuted",
                              bg: "bg-slate-500/10",
                              ring: "ring-slate-500/20",
                            };
                      return (
                        <div
                          key={job.jobId}
                          className="group flex flex-col gap-3 rounded-xl border border-defaultborder/70 bg-gradient-to-br from-white via-white to-slate-50/60 p-4 shadow-sm ring-1 ring-black/[0.03] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md dark:from-bodybg dark:via-bodybg dark:to-white/[0.02] dark:border-defaultborder/20 dark:ring-white/[0.04]"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="m-0 truncate text-[0.9rem] font-semibold tracking-tight text-defaulttextcolor dark:text-white">
                                {job.title}
                              </p>
                              <p className="m-0 mt-0.5 truncate text-[0.72rem] text-textmuted dark:text-white/55">
                                {job.company && <span>{job.company}</span>}
                                {job.location && (
                                  <span>
                                    {job.company ? " · " : ""}
                                    {job.location}
                                  </span>
                                )}
                              </p>
                            </div>
                            <div
                              className={`flex shrink-0 flex-col items-center rounded-lg px-2.5 py-1 ring-1 ${scoreTone.bg} ${scoreTone.ring}`}
                            >
                              <span className={`text-[1rem] font-bold leading-none ${scoreTone.text}`}>
                                {job.fitScore}%
                              </span>
                              <span
                                className={`text-[0.55rem] font-semibold uppercase tracking-[0.08em] ${scoreTone.text}`}
                              >
                                {job.fitLabel}
                              </span>
                            </div>
                          </div>
                          <div className="h-1 w-full overflow-hidden rounded-full bg-defaultborder/40 dark:bg-white/5">
                            <div
                              className={`h-full ${scoreTone.bar} transition-[width] duration-700 ease-out`}
                              style={{ width: `${Math.max(2, Math.min(100, job.fitScore))}%` }}
                              aria-hidden
                            />
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {job.jobType && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-defaultborder bg-white/80 px-2 py-0.5 text-[0.65rem] font-medium text-textmuted dark:border-defaultborder/20 dark:bg-white/5 dark:text-white/55">
                                {job.jobType}
                              </span>
                            )}
                            {job.matchedSkills.slice(0, 3).map((s) => (
                              <span
                                key={s.name}
                                className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[0.65rem] font-medium text-emerald-700 dark:text-emerald-300"
                              >
                                <i className="ri-check-line text-[0.7rem]" />
                                {s.name}
                              </span>
                            ))}
                            {job.missingSkills.slice(0, 2).map((s) => (
                              <span
                                key={s.name}
                                className="inline-flex items-center rounded-full border border-defaultborder bg-white/80 px-2 py-0.5 text-[0.65rem] font-medium text-textmuted dark:border-defaultborder/20 dark:bg-white/5 dark:text-white/55"
                              >
                                {s.name}
                              </span>
                            ))}
                          </div>
                          <Link
                            href={`/ats/browse-jobs/${job.jobId}`}
                            className="ti-btn ti-btn-primary !h-9 !py-0 !px-4 mt-auto inline-flex w-full items-center justify-center !text-[0.78rem] font-medium"
                          >
                            <i className="ri-send-plane-line me-1.5" />
                            Apply Now
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MyProfilePage() {
  const { user } = useAuth();
  const { hasEmployeeProfile, isLoading: rolesLoading } = useHasEmployeeRole();
  const [candidate, setCandidate] = useState<CandidateWithProfile | null>(null);
  const [serverEmailVerified, setServerEmailVerified] = useState<boolean | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setDataLoading(false);
      setServerEmailVerified(null);
      return;
    }
    let cancelled = false;
    if (hasEmployeeProfile) {
      getMeWithCandidate()
        .then((res) => {
          if (!cancelled) {
            setCandidate(res?.candidate ?? null);
            const v =
              res?.user && typeof (res.user as { isEmailVerified?: boolean }).isEmailVerified === "boolean"
                ? (res.user as { isEmailVerified: boolean }).isEmailVerified
                : null;
            setServerEmailVerified(v);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setCandidate(null);
            setServerEmailVerified(null);
          }
        })
        .finally(() => {
          if (!cancelled) setDataLoading(false);
        });
    } else {
      setCandidate(null);
      setServerEmailVerified(null);
      setDataLoading(false);
    }
    return () => {
      cancelled = true;
    };
  }, [user, hasEmployeeProfile]);

  if (user && !rolesLoading && !dataLoading) {
    return (
      <Fragment>
        <Seo title="My Profile" />
        <Pageheader currentpage="My Profile" activepage="ATS" mainpage="My Profile" />
        <DynamicProfileView candidate={candidate} serverEmailVerified={serverEmailVerified} />
      </Fragment>
    );
  }

  return (
    <Fragment>
      <Seo title="My Profile" />
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-defaulttextcolor dark:text-white/70">Loading your profile...</p>
          <p className="text-sm text-defaulttextcolor/60 mt-2">
            <Link href={ROUTES.defaultAfterLogin} className="text-primary hover:underline">
              Go to dashboard
            </Link>
          </p>
        </div>
      </div>
    </Fragment>
  );
}
