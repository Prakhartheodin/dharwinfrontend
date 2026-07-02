"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  getPublicEmployeeProfile,
  PublicEmployeeProfile,
} from "@/shared/lib/api/employees";

function initialsOf(name?: string): string {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
}

function formatSharedAt(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/** countryCode may be a dial code ("91") or an ISO alpha code ("IN"). Only prefix "+" for numeric dial codes. */
function formatPhone(num?: string, code?: string): string | null {
  if (!num) return null;
  const c = String(code || "").replace(/^\+/, "").trim();
  return /^\d+$/.test(c) ? `+${c} ${num}` : num;
}

/** Refined shimmer skeleton mirroring the real layout so the swap-in feels calm, not jumpy. */
function ProfileSkeleton() {
return (
<div className="animate-pulse overflow-hidden rounded-none border-y border-defaultborder/80 bg-white sm:rounded-2xl sm:border dark:border-white/10 dark:bg-bodybg">
<div className="h-28 bg-gradient-to-br from-primary/20 to-primary/5 sm:h-36 md:h-40 dark:from-primary/25 dark:to-primary/10" />
<div className="px-4 pb-8 sm:px-8">
<div className="-mt-10 mx-auto mb-4 h-20 w-20 rounded-2xl bg-slate-200 ring-4 ring-white sm:-mt-14 sm:mx-0 sm:h-28 sm:w-28 dark:bg-white/10 dark:ring-bodybg" />
<div className="mx-auto mb-2 h-6 w-48 max-w-full rounded bg-slate-200 sm:mx-0 sm:w-52 dark:bg-white/10" />
<div className="mx-auto mb-6 h-4 w-64 max-w-full rounded bg-slate-200 sm:mx-0 sm:w-72 dark:bg-white/10" />
<div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-slate-100 dark:bg-white/[0.06]" />
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-7 w-20 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
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
<p className="text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-[#94a3b8] dark:text-white/40">{label}</p>
<p className={`text-sm font-semibold text-defaulttextcolor dark:text-white ${wrapValue ? "break-words [overflow-wrap:anywhere] leading-snug" : "truncate"}`}>{value}</p>
</div>
</>
);
const base =
"group flex min-h-[3.25rem] items-start gap-3 rounded-xl border border-defaultborder/70 bg-slate-50/70 px-3.5 py-3 sm:items-center sm:px-4 dark:border-white/10 dark:bg-white/[0.04]";
  if (href) {
    return (
      <a href={href} className={`${base} transition hover:border-primary/40 hover:bg-primary/[0.04] hover:shadow-sm`}>
        {inner}
      </a>
    );
  }
  return <div className={base}>{inner}</div>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.1em] text-[#64748b] dark:text-white/50">{title}</h3>
      {children}
    </div>
  );
}

export default function PublicEmployeeProfilePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = (params?.id as string) || "";
  const token = searchParams.get("token") || "";
  const withDoc = searchParams.get("withDoc");
  const data = searchParams.get("data") || "";

  const [profile, setProfile] = useState<PublicEmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!id || !token || (withDoc == null && !data)) {
        setError("This shared link is incomplete or has expired.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const result = await getPublicEmployeeProfile(id, token, { withDoc, data: data || null });
        if (!cancelled) setProfile(result);
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.response?.data?.message || "This profile is no longer available.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id, token, withDoc, data]);

  useEffect(() => {
    if (profile?.fullName) document.title = `${profile.fullName} — Shared Profile`;
  }, [profile?.fullName]);

  const phone = useMemo(
    () => formatPhone(profile?.phoneNumber, profile?.countryCode),
    [profile?.phoneNumber, profile?.countryCode]
  );

  const addressText = useMemo(() => {
    const a = profile?.address;
    if (!a) return null;
    return [a.line1, a.line2, a.city, a.state, a.country, a.zip].filter(Boolean).join(", ") || null;
  }, [profile?.address]);

  const supervisorPhone = useMemo(
    () => formatPhone(profile?.supervisorContact, profile?.supervisorCountryCode),
    [profile?.supervisorContact, profile?.supervisorCountryCode]
  );

  const memberSince = formatSharedAt(profile?.createdAt);
  const sharedAt = formatSharedAt(profile?.sharedAt);

return (
<div className="min-h-dvh bg-slate-100 px-0 py-4 dark:bg-black/40 sm:px-4 sm:py-8 md:py-12 pb-[max(1rem,env(safe-area-inset-bottom))]">
<div className="mx-auto w-full max-w-3xl xl:max-w-4xl">
{loading ? (
<ProfileSkeleton />
) : error ? (
<div className="mx-3 rounded-2xl border border-defaultborder/80 bg-white p-6 text-center shadow-sm sm:mx-0 sm:p-10 dark:border-white/10 dark:bg-bodybg">
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
              <i className="ri-link-unlink-m text-2xl" aria-hidden />
            </span>
            <h1 className="mb-1 text-lg font-semibold text-defaulttextcolor dark:text-white">Link unavailable</h1>
            <p className="text-sm text-[#64748b] dark:text-white/50">{error}</p>
          </div>
        ) : profile ? (
          <div className="overflow-hidden rounded-none border-y border-defaultborder/80 bg-white shadow-none sm:rounded-2xl sm:border sm:shadow-[0_24px_80px_-24px_rgba(0,0,0,0.25)] dark:border-white/10 dark:bg-bodybg">
            {/* Hero */}
            <div className="relative h-28 overflow-hidden bg-gradient-to-br from-primary/25 via-primary/10 to-amber-400/10 sm:h-36 md:h-40 dark:from-primary/30 dark:to-amber-900/20">
              <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-primary/15 blur-2xl sm:h-52 sm:w-52" aria-hidden />
              <div className="pointer-events-none absolute -bottom-16 left-1/4 h-32 w-32 rounded-full bg-amber-300/20 blur-2xl sm:-bottom-20 sm:left-1/3 sm:h-40 sm:w-40" aria-hidden />
              {sharedAt && (
                <span className="absolute right-3 top-3 z-10 hidden max-w-[min(100%,18rem)] items-center gap-1.5 rounded-full bg-white/85 px-3 py-1 text-[0.65rem] font-medium leading-snug text-[#475569] shadow-sm backdrop-blur sm:right-4 sm:top-4 sm:inline-flex sm:max-w-none sm:text-[0.7rem] dark:bg-black/30 dark:text-white/70">
                  <i className="ri-share-forward-line shrink-0" aria-hidden />
                  <span className="truncate">Shared{profile.sharedBy ? ` by ${profile.sharedBy}` : ""} · {sharedAt}</span>
                </span>
              )}
            </div>

            {sharedAt && (
              <p className="flex items-center justify-center gap-1.5 border-b border-defaultborder/50 px-4 py-2 text-center text-[0.65rem] font-medium text-[#64748b] sm:hidden dark:border-white/10 dark:text-white/50">
                <i className="ri-share-forward-line shrink-0 text-primary/70" aria-hidden />
                <span className="break-words">Shared{profile.sharedBy ? ` by ${profile.sharedBy}` : ""} · {sharedAt}</span>
              </p>
            )}

            <div className="px-4 pb-8 sm:px-8">
              {/* Avatar + identity */}
              <div className="-mt-10 flex flex-col items-center gap-4 text-center sm:-mt-16 sm:flex-row sm:items-end sm:text-left">
                {profile.profilePicture?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.profilePicture.url}
                    alt={profile.fullName || "Profile"}
                    className="h-24 w-24 shrink-0 rounded-2xl object-cover shadow-lg ring-4 ring-white sm:h-28 sm:w-28 md:h-32 md:w-32 dark:ring-bodybg"
                  />
                ) : (
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/25 to-primary/10 text-2xl font-semibold text-primary shadow-lg ring-4 ring-white sm:h-28 sm:w-28 sm:text-3xl md:h-32 md:w-32 dark:ring-bodybg">
                    {initialsOf(profile.fullName)}
                  </div>
                )}
                <div className="min-w-0 w-full pb-1 sm:flex-1">
                  <h1 className="text-xl font-bold tracking-tight text-defaulttextcolor sm:text-2xl md:text-[1.75rem] dark:text-white">
                    {profile.fullName || "Employee"}
                  </h1>
                  {profile.email && (
                    <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-[#64748b] sm:justify-start dark:text-white/50">
                      <i className="ri-mail-line shrink-0 text-primary/70" aria-hidden />
                      <a href={`mailto:${profile.email}`} className="break-all text-left hover:text-primary sm:break-normal sm:truncate">{profile.email}</a>
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                    {profile.degree && (
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">{profile.degree}</span>
                    )}
                    {(profile.visaType || profile.customVisaType) && (
                      <span className="rounded-full bg-slate-200/70 px-2.5 py-0.5 text-xs font-medium text-[#475569] dark:bg-white/10 dark:text-white/70">
                        {profile.customVisaType || profile.visaType}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <i className="ri-eye-line" aria-hidden />
                      View-only
                    </span>
                  </div>
                </div>
              </div>

              {/* About */}
              {profile.shortBio && (
                <p className="mt-6 rounded-xl border border-defaultborder/60 bg-slate-50/60 p-3.5 text-sm leading-relaxed text-[#475569] sm:p-4 sm:leading-6 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/70">
                  {profile.shortBio}
                </p>
              )}

              {/* Contact / meta tiles */}
              <div className="mt-6 grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-3">
                <InfoTile icon="ri-phone-line" label="Phone" value={phone} href={profile.phoneNumber ? `tel:${profile.phoneNumber}` : undefined} />
                <InfoTile icon="ri-map-pin-line" label="Location" value={addressText} wrapValue />
                {profile.salaryRange && (profile.salaryRange.min || profile.salaryRange.max) && (
                  <InfoTile
                    icon="ri-money-dollar-circle-line"
                    label="Salary range"
                    value={`${profile.salaryRange.currency || ""} ${profile.salaryRange.min?.toLocaleString() ?? "—"} - ${profile.salaryRange.max?.toLocaleString() ?? "—"}`}
                  />
                )}
                <InfoTile icon="ri-id-card-line" label="SEVIS ID" value={profile.sevisId} />
                <InfoTile icon="ri-shield-check-line" label="EAD" value={profile.ead} />
                <InfoTile icon="ri-calendar-check-line" label="Member since" value={memberSince} />
              </div>

              {/* Supervisor */}
              {(profile.supervisorName || supervisorPhone) && (
<Section title="Supervisor">
<div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2">
                    <InfoTile icon="ri-user-star-line" label="Name" value={profile.supervisorName} />
                    <InfoTile icon="ri-phone-line" label="Contact" value={supervisorPhone} />
                  </div>
                </Section>
              )}

              {/* Skills */}
              {profile.skills && profile.skills.length > 0 && (
                <Section title="Skills">
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((s, i) => (
                      <span key={i} className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary sm:px-3 sm:text-sm">
                        {s.name}
                        {s.level ? <span className="ms-1 text-primary/60">· {s.level}</span> : null}
                      </span>
                    ))}
                  </div>
                </Section>
              )}

              {/* Experience */}
              {profile.experiences && profile.experiences.length > 0 && (
                <Section title="Experience">
                  <div className="space-y-3">
                    {profile.experiences.map((x, i) => (
                      <div key={i} className="rounded-xl border border-defaultborder/70 p-3.5 sm:p-4 dark:border-white/10">
                        <p className="text-sm font-semibold text-defaulttextcolor dark:text-white">
                          {x.title || "Role"}{x.company ? ` · ${x.company}` : ""}
                        </p>
                        {(x.startDate || x.endDate) && (
                          <p className="mt-0.5 text-xs text-[#94a3b8] dark:text-white/40">
                            {x.startDate || ""}{x.endDate ? ` – ${x.endDate}` : ""}
                          </p>
                        )}
                        {x.description && <p className="mt-2 break-words text-sm leading-relaxed text-[#475569] dark:text-white/60">{x.description}</p>}
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Education */}
              {profile.qualifications && profile.qualifications.length > 0 && (
                <Section title="Education">
                  <div className="space-y-2">
                    {profile.qualifications.map((q, i) => (
                      <div key={i} className="flex flex-col gap-1 rounded-xl border border-defaultborder/70 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 dark:border-white/10">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-medium text-defaulttextcolor dark:text-white">{q.degree || "Qualification"}</p>
                          {q.institute && <p className="break-words text-xs text-[#94a3b8] dark:text-white/40">{q.institute}</p>}
                        </div>
                        {(q.startYear || q.endYear) && (
                          <span className="ms-3 shrink-0 text-xs text-[#64748b] dark:text-white/50">
                            {q.startYear || ""}{q.endYear ? `–${q.endYear}` : ""}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Documents */}
              {profile.withDoc && profile.documents && profile.documents.length > 0 && (
                <Section title="Documents">
<div className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-2 xl:grid-cols-3">
{profile.documents.map((d, i) => (
                      <a
                        key={i}
                        href={d.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 rounded-xl border border-defaultborder/70 px-4 py-3 transition hover:border-primary/40 hover:bg-primary/[0.03] dark:border-white/10"
                      >
                        <i className="ri-file-text-line text-xl text-primary" aria-hidden />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-defaulttextcolor dark:text-white">
                          {d.label || d.originalName || "Document"}
                        </span>
                        <i className="ri-external-link-line text-[#94a3b8]" aria-hidden />
                      </a>
                    ))}
                  </div>
                </Section>
              )}

              {/* Salary slips */}
              {profile.withDoc && profile.salarySlips && profile.salarySlips.length > 0 && (
                <Section title="Salary slips">
<div className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-2 xl:grid-cols-3">
{profile.salarySlips.map((s, i) => (
                      <a
                        key={i}
                        href={s.documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 rounded-xl border border-defaultborder/70 px-4 py-3 transition hover:border-primary/40 hover:bg-primary/[0.03] dark:border-white/10"
                      >
                        <i className="ri-bill-line text-xl text-primary" aria-hidden />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-defaulttextcolor dark:text-white">
                          {[s.month, s.year].filter(Boolean).join(" ") || "Salary slip"}
                        </span>
                        <i className="ri-external-link-line text-[#94a3b8]" aria-hidden />
                      </a>
                    ))}
                  </div>
                </Section>
              )}

              {/* Social links */}
              {profile.socialLinks && profile.socialLinks.length > 0 && (
                <Section title="Links">
                  <div className="flex flex-wrap gap-2">
                    {profile.socialLinks.filter((l) => l.url).map((l, i) => (
                      <a
                        key={i}
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full border border-defaultborder/70 px-3 py-1 text-sm text-primary transition hover:bg-primary/5 dark:border-white/10"
                      >
                        <i className="ri-links-line" aria-hidden />
                        {l.platform || "Link"}
                      </a>
                    ))}
                  </div>
                </Section>
              )}
            </div>
          </div>
        ) : null}

<p className="mt-6 px-4 text-center text-xs text-[#94a3b8] sm:px-0 dark:text-white/30">
This profile was shared securely and is view-only.
</p>
      </div>
    </div>
  );
}
