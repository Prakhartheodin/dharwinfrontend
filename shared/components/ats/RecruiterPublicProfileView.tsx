"use client";

import React, { useMemo } from "react";
import PersonAvatar from "@/shared/components/PersonAvatar";
import type { PublicRecruiterProfile } from "@/shared/lib/api/publicRecruiter";

function formatPhone(num?: string, code?: string): string | null {
  if (!num) return null;
  const c = String(code || "").replace(/^\+/, "").trim();
  return /^\d+$/.test(c) ? `+${c} ${num}` : num;
}

function ProfileSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-none border-y border-defaultborder/80 bg-white sm:rounded-2xl sm:border dark:border-white/10 dark:bg-bodybg">
      <div className="h-28 bg-gradient-to-br from-primary/20 to-primary/5 sm:h-36 md:h-40 dark:from-primary/25 dark:to-primary/10" />
      <div className="px-4 pb-8 sm:px-8">
        <div className="-mt-10 mx-auto mb-4 h-20 w-20 rounded-2xl bg-slate-200 ring-4 ring-white sm:-mt-14 sm:mx-0 sm:h-28 sm:w-28 dark:bg-white/10 dark:ring-bodybg" />
        <div className="mx-auto mb-2 h-6 w-48 max-w-full rounded bg-slate-200 sm:mx-0 sm:w-52 dark:bg-white/10" />
        <div className="mx-auto mb-6 h-4 w-64 max-w-full rounded bg-slate-200 sm:mx-0 sm:w-72 dark:bg-white/10" />
        <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-slate-100 dark:bg-white/[0.06]" />
          ))}
        </div>
      </div>
    </div>
  );
}

function InfoTile({
  icon,
  label,
  value,
  href,
  wrapValue = false,
}: {
  icon: string;
  label: string;
  value?: string | null;
  href?: string;
  wrapValue?: boolean;
}) {
  if (!value) return null;
  const inner = (
    <>
      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15 sm:h-11 sm:w-11">
        <i className={`${icon} text-lg`} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-[#94a3b8] dark:text-white/40">
          {label}
        </p>
        <p
          className={`text-sm font-semibold text-defaulttextcolor dark:text-white ${
            wrapValue ? "break-words [overflow-wrap:anywhere] leading-snug" : "truncate"
          }`}
        >
          {value}
        </p>
      </div>
    </>
  );
  const base =
    "group flex min-h-[3.25rem] items-start gap-3 rounded-xl border border-defaultborder/70 bg-slate-50/70 px-3.5 py-3 sm:items-center sm:px-4 dark:border-white/10 dark:bg-white/[0.04]";
  if (href) {
    return (
      <a
        href={href}
        className={`${base} transition hover:border-primary/40 hover:bg-primary/[0.04] hover:shadow-sm`}
      >
        {inner}
      </a>
    );
  }
  return <div className={base}>{inner}</div>;
}

type RecruiterPublicProfileViewProps = {
  profile: PublicRecruiterProfile | null;
  loading?: boolean;
  error?: string | null;
  previewBanner?: React.ReactNode;
};

export default function RecruiterPublicProfileView({
  profile,
  loading = false,
  error = null,
  previewBanner,
}: RecruiterPublicProfileViewProps) {
  const phone = useMemo(
    () => formatPhone(profile?.phoneNumber, profile?.countryCode),
    [profile?.phoneNumber, profile?.countryCode]
  );

  const domainTags = profile?.domain?.filter(Boolean) ?? [];

  return (
    <div className="min-h-dvh bg-slate-100 px-0 py-4 dark:bg-black/40 sm:px-4 sm:py-8 md:py-12 pb-[max(1rem,env(safe-area-inset-bottom))]">
      {previewBanner}
      <div className="mx-auto w-full max-w-3xl xl:max-w-4xl">
        {loading ? (
          <ProfileSkeleton />
        ) : error ? (
          <div className="mx-3 rounded-2xl border border-defaultborder/80 bg-white p-6 text-center shadow-sm sm:mx-0 sm:p-10 dark:border-white/10 dark:bg-bodybg">
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
              <i className="ri-link-unlink-m text-2xl" aria-hidden />
            </span>
            <h1 className="mb-1 text-lg font-semibold text-defaulttextcolor dark:text-white">Profile unavailable</h1>
            <p className="text-sm text-[#64748b] dark:text-white/50">{error}</p>
          </div>
        ) : profile ? (
          <div className="overflow-hidden rounded-none border-y border-defaultborder/80 bg-white shadow-none sm:rounded-2xl sm:border sm:shadow-[0_24px_80px_-24px_rgba(0,0,0,0.25)] dark:border-white/10 dark:bg-bodybg">
            <div className="relative h-28 overflow-hidden bg-gradient-to-br from-primary/25 via-primary/10 to-emerald-400/10 sm:h-36 md:h-40 dark:from-primary/30 dark:to-emerald-900/20">
              <div
                className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-primary/15 blur-2xl sm:h-52 sm:w-52"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -bottom-16 left-1/4 h-32 w-32 rounded-full bg-emerald-300/20 blur-2xl sm:-bottom-20 sm:left-1/3 sm:h-40 sm:w-40"
                aria-hidden
              />
              <span className="absolute right-3 top-3 z-10 inline-flex max-w-[min(100%,18rem)] items-center gap-1.5 rounded-full bg-white/85 px-3 py-1 text-[0.65rem] font-medium leading-snug text-[#475569] shadow-sm backdrop-blur sm:right-4 sm:top-4 sm:max-w-none sm:text-[0.7rem] dark:bg-black/30 dark:text-white/70">
                <i className="ri-briefcase-line shrink-0" aria-hidden />
                Recruiter profile
              </span>
            </div>

            <div className="px-4 pb-8 sm:px-8">
              <div className="-mt-10 flex flex-col items-center gap-4 text-center sm:-mt-16 sm:flex-row sm:items-end sm:text-left">
                <PersonAvatar
                  name={profile.name}
                  email={profile.email}
                  imageUrl={profile.profilePicture?.url}
                  className="h-24 w-24 shrink-0 rounded-2xl text-2xl shadow-lg ring-4 ring-white sm:h-28 sm:w-28 md:h-32 md:w-32 dark:ring-bodybg"
                />
                <div className="min-w-0 w-full pb-1 sm:flex-1">
                  <h1 className="text-xl font-bold tracking-tight text-defaulttextcolor sm:text-2xl md:text-[1.75rem] dark:text-white">
                    {profile.name || "Recruiter"}
                  </h1>
                  {profile.email ? (
                    <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-[#64748b] sm:justify-start dark:text-white/50">
                      <i className="ri-mail-line shrink-0 text-primary/70" aria-hidden />
                      <a
                        href={`mailto:${profile.email}`}
                        className="break-all text-left hover:text-primary sm:break-normal sm:truncate"
                      >
                        {profile.email}
                      </a>
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                    {profile.education ? (
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        {profile.education}
                      </span>
                    ) : null}
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <i className="ri-eye-line" aria-hidden />
                      View-only
                    </span>
                  </div>
                </div>
              </div>

              {profile.profileSummary ? (
                <p className="mt-6 rounded-xl border border-defaultborder/60 bg-slate-50/60 p-3.5 text-sm leading-relaxed text-[#475569] sm:p-4 sm:leading-6 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/70">
                  {profile.profileSummary}
                </p>
              ) : null}

              <div className="mt-6 grid grid-cols-1 gap-3 min-[480px]:grid-cols-2">
                <InfoTile
                  icon="ri-phone-line"
                  label="Phone"
                  value={phone}
                  href={profile.phoneNumber ? `tel:${profile.phoneNumber}` : undefined}
                />
                <InfoTile icon="ri-map-pin-line" label="Location" value={profile.location} wrapValue />
                <InfoTile icon="ri-graduation-cap-line" label="Education" value={profile.education} wrapValue />
              </div>

              {domainTags.length > 0 ? (
                <div className="mt-6">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.1em] text-[#64748b] dark:text-white/50">
                    Domains
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {domainTags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary sm:px-3 sm:text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <p className="mt-6 px-4 text-center text-xs text-[#94a3b8] sm:px-0 dark:text-white/30">
          This recruiter profile is shared for reference and is view-only.
        </p>
      </div>
    </div>
  );
}
