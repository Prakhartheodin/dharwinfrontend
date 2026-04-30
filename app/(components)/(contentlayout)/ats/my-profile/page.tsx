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

  const u = user as (User & { phoneNumber?: string; countryCode?: string; location?: string; profileSummary?: string; education?: string; domain?: string[] }) | null;
  const displayName = (candidate?.fullName ?? u?.name ?? u?.email) ?? "—";
  const displayPhone = candidate?.phoneNumber ?? u?.phoneNumber;
  const displayCountryCode = candidate?.countryCode ?? (u as { countryCode?: string })?.countryCode;
  const displayBio = candidate?.shortBio ?? (u as { profileSummary?: string })?.profileSummary;
  const displayAddress = candidate?.address
    ? [candidate.address.streetAddress, candidate.address.city, candidate.address.state, candidate.address.zipCode, candidate.address.country]
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

  const personalInfo = [
    { label: "Name :", value: displayName },
    { label: "Email :", value: u?.email ?? "—" },
    ...(displayPhone ? [{ label: "Phone :", value: `${displayCountryCode ? displayCountryCode + " " : ""}${displayPhone}` }] : []),
    { label: "Employee ID :", value: displayEmployeeId },
    { label: roleDisplayName.includes(",") ? "Roles :" : "Role :", value: roleDisplayName },
    ...(displayAddress ? [{ label: "Address :", value: displayAddress }] : []),
    ...(u.education ? [{ label: "Education :", value: u.education }] : []),
    ...(u.domain && u.domain.length > 0 ? [{ label: "Domain :", value: u.domain.join(", ") }] : []),
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

  const visibleSkills = candidate?.skills?.slice(0, 12) ?? [];
  const extraSkillCount = (candidate?.skills?.length ?? 0) - visibleSkills.length;

  return (
    <div className="grid grid-cols-12 gap-x-6">
      {!isEmailVerified && (
        <div className="col-span-12 mb-4">
          <div className="box border border-warning/30 bg-warning/5">
            <div className="box-body !py-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-defaulttextcolor dark:text-white/90 mb-0 text-sm">
                <i className="ri-mail-unread-line me-2 align-middle text-warning" />
                Email not verified. Check inbox or request a new link.
              </p>
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resendVerificationSending}
                className="ti-btn ti-btn-sm ti-btn-warning !font-medium !w-auto !h-auto whitespace-nowrap"
              >
                {resendVerificationSending ? (
                  <>
                    <span className="animate-spin inline-block me-1.5 w-3 h-3 border-2 border-current border-t-transparent rounded-full" />
                    Sending…
                  </>
                ) : (
                  <>
                    <i className="ri-mail-send-line me-1 align-middle" />
                    Resend
                  </>
                )}
              </button>
            </div>
            {resendVerificationMessage === "success" && (
              <div className="box-body pt-0 text-success text-xs">Verification email sent.</div>
            )}
            {resendVerificationMessage === "error" && (
              <div className="box-body pt-0 text-danger text-xs">Failed to send. Try again later.</div>
            )}
          </div>
        </div>
      )}

      {/* ── Compact Left Sidebar ── */}
      <div className="xxl:col-span-3 xl:col-span-4 col-span-12">
        <div className="box overflow-hidden">
          <div className="box-body !p-0">
            {/* Profile cover — centred, smaller avatar */}
            <div className="main-profile-cover flex flex-col items-center text-center px-4 pt-5 pb-4">
              {u.profilePicture?.url ? (
                <span className="avatar avatar-xl avatar-rounded online mb-2">
                  <img src={u.profilePicture.url} alt="" />
                </span>
              ) : (
                <span className="avatar avatar-xl avatar-rounded mb-2 flex items-center justify-center bg-primary/20 text-primary font-bold text-[1.25rem]">
                  {getInitial(u.name ?? u.email)}
                </span>
              )}
              <h6 className="font-semibold text-white text-[0.9375rem] mb-0 leading-tight">{displayName}</h6>
              <p className="text-white/70 text-[0.75rem] mb-0">{roleDisplayName}</p>
              {displayAddress && (
                <p className="text-white/50 text-[0.7rem] mb-0 mt-0.5 flex items-center gap-1 justify-center">
                  <i className="ri-map-pin-line" />{displayAddress}
                </p>
              )}
            </div>

            {/* Stat strip */}
            <div className="grid grid-cols-3 divide-x divide-dashed dark:divide-defaultborder/10 border-b border-dashed dark:border-defaultborder/10">
              {[
                { label: "Skills", value: candidate?.skills?.length ?? 0, icon: "ri-tools-line" },
                { label: "Jobs", value: matchingJobs.length, icon: "ri-briefcase-line" },
                { label: "Edu", value: candidate?.qualifications?.length ?? 0, icon: "ri-graduation-cap-line" },
              ].map((stat) => (
                <div key={stat.label} className="flex flex-col items-center py-2.5">
                  <span className="text-[1rem] font-bold text-defaulttextcolor dark:text-white/90">{stat.value}</span>
                  <span className="text-[0.65rem] text-[#8c9097] dark:text-white/45 uppercase tracking-wide">{stat.label}</span>
                </div>
              ))}
            </div>

            {/* Icon contact row */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-dashed dark:border-defaultborder/10 flex-wrap">
              <a
                href={`mailto:${u.email}`}
                title={u.email ?? ""}
                className="flex items-center gap-1.5 text-[0.75rem] text-[#8c9097] dark:text-white/50 hover:text-primary transition-colors truncate max-w-full"
              >
                <i className="ri-mail-line text-[0.875rem] shrink-0" />
                <span className="truncate">{u.email}</span>
              </a>
              {displayPhone && (
                <span className="flex items-center gap-1 text-[0.75rem] text-[#8c9097] dark:text-white/50">
                  <i className="ri-phone-line text-[0.875rem] shrink-0" />
                  {displayCountryCode ? `${displayCountryCode} ` : ""}{displayPhone}
                </span>
              )}
            </div>

            {/* Bio */}
            {displayBio && (
              <div className="px-4 py-3 border-b border-dashed dark:border-defaultborder/10">
                <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-[#8c9097] dark:text-white/40 mb-1">Bio</p>
                <p className="text-[0.75rem] text-[#8c9097] dark:text-white/50 mb-0 line-clamp-4">{displayBio}</p>
              </div>
            )}

            {/* Domain pills */}
            {u.domain && u.domain.length > 0 && (
              <div className="px-4 py-3 border-b border-dashed dark:border-defaultborder/10">
                <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-[#8c9097] dark:text-white/40 mb-1.5">Domain</p>
                <div className="flex flex-wrap gap-1">
                  {u.domain.map((d) => (
                    <span key={d} className="badge bg-light text-[#8c9097] dark:text-white/50 text-[0.65rem] px-1.5 py-0.5">{d}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Skill pills — max 12 */}
            {visibleSkills.length > 0 && (
              <div className="px-4 py-3 border-b border-dashed dark:border-defaultborder/10">
                <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-[#8c9097] dark:text-white/40 mb-1.5">Skills</p>
                <div className="flex flex-wrap gap-1">
                  {visibleSkills.map((s, i) => (
                    <span
                      key={i}
                      title={s.level}
                      className="badge bg-primary/10 text-primary text-[0.65rem] px-1.5 py-0.5 rounded-full font-medium"
                    >
                      {s.name}
                    </span>
                  ))}
                  {extraSkillCount > 0 && (
                    <span className="badge bg-light text-[#8c9097] dark:text-white/40 text-[0.65rem] px-1.5 py-0.5 rounded-full">
                      +{extraSkillCount}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Quick actions */}
            <div className="px-4 py-3">
              <div className="flex flex-col gap-1.5">
                <Link
                  href="/settings/personal-information/"
                  className="ti-btn ti-btn-sm ti-btn-primary !flex !w-full !h-auto whitespace-nowrap items-center justify-center"
                >
                  <i className="ri-user-settings-line me-1 align-middle inline-block" />
                  Edit Profile
                </Link>
                <Link
                  href="/settings/"
                  className="ti-btn ti-btn-sm ti-btn-light !flex !w-full !h-auto whitespace-nowrap items-center justify-center"
                >
                  <i className="ri-settings-3-line me-1 align-middle inline-block" />
                  Settings
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Panel with Tabs ── */}
      <div className="xxl:col-span-9 xl:col-span-8 col-span-12">
        <div className="box">
          <div className="box-body !p-0">
            {/* Tab nav */}
            <div className="border-b border-dashed dark:border-defaultborder/10 px-4 pt-3 flex items-center gap-1">
              {(
                [
                  { id: "overview", label: "Overview", icon: "ri-user-3-line" },
                  { id: "activity", label: "Activity", icon: "ri-history-line" },
                  { id: "jobs", label: `Jobs${matchingJobs.length > 0 ? ` (${matchingJobs.length})` : ""}`, icon: "ri-briefcase-line" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`-mb-px flex items-center gap-1.5 text-[0.8125rem] font-medium px-3 py-2 border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-primary text-primary"
                      : "border-transparent text-[#8c9097] dark:text-white/50 hover:text-defaulttextcolor dark:hover:text-white/80"
                  }`}
                >
                  <i className={`${tab.icon} text-[0.875rem] align-middle`} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── Overview Tab ── */}
            {activeTab === "overview" && (
              <div className="p-4 space-y-4">
                {/* Personal info 2-col grid */}
                <div>
                  <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-[#8c9097] dark:text-white/40 mb-2">Personal Information</p>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-2">
                    {personalInfo.map((item) => (
                      <div key={item.label} className="flex flex-col">
                        <dt className="text-[0.7rem] text-[#8c9097] dark:text-white/40 font-medium">{item.label.replace(" :", "")}</dt>
                        <dd className="text-[0.8125rem] text-defaulttextcolor dark:text-white/80 font-medium truncate">{item.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                {/* Qualifications */}
                {candidate?.qualifications && candidate.qualifications.length > 0 && (
                  <div>
                    <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-[#8c9097] dark:text-white/40 mb-2">Education</p>
                    <div className="space-y-2">
                      {candidate.qualifications.map((q, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-light dark:bg-black/10">
                          <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                            <i className="ri-graduation-cap-line text-[0.75rem]" />
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-[0.8125rem] mb-0 truncate">{q.degree}</p>
                            <p className="text-[0.75rem] text-[#8c9097] dark:text-white/50 mb-0">
                              {q.institute}
                              {q.location && <span> · {q.location}</span>}
                              {(q.startYear || q.endYear) && (
                                <span> · {q.startYear ?? "?"} – {q.endYear ?? "Present"}</span>
                              )}
                            </p>
                            {q.description && <p className="text-[0.7rem] text-[#8c9097] dark:text-white/40 mt-0.5 mb-0">{q.description}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Work Experience */}
                {candidate?.experiences && candidate.experiences.length > 0 && (
                  <div>
                    <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-[#8c9097] dark:text-white/40 mb-2">Work Experience</p>
                    <div className="space-y-2">
                      {candidate.experiences.map((exp, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-light dark:bg-black/10">
                          <span className="w-7 h-7 rounded-full bg-info/10 text-info flex items-center justify-center shrink-0 mt-0.5">
                            <i className="ri-building-2-line text-[0.75rem]" />
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-[0.8125rem] mb-0">{exp.role}</p>
                            <p className="text-[0.75rem] text-[#8c9097] dark:text-white/50 mb-0">
                              {exp.company}
                              {(exp.startDate || exp.endDate) && (
                                <span>
                                  {" · "}
                                  {exp.startDate ? new Date(exp.startDate).toLocaleDateString(undefined, { month: "short", year: "numeric" }) : "?"}
                                  {" – "}
                                  {exp.currentlyWorking ? "Present" : exp.endDate ? new Date(exp.endDate).toLocaleDateString(undefined, { month: "short", year: "numeric" }) : "?"}
                                </span>
                              )}
                            </p>
                            {exp.description && <p className="text-[0.7rem] text-[#8c9097] dark:text-white/40 mt-0.5 mb-0">{exp.description}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Social + Documents side by side */}
                <div className="grid grid-cols-2 gap-4">
                  {socialLinksList.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-[#8c9097] dark:text-white/40 mb-0">Social Links</p>
                        <Link href="/settings/personal-information/" className="text-[0.7rem] text-primary hover:underline">Edit</Link>
                      </div>
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
                              className="flex items-center gap-2 text-[0.75rem] text-primary hover:underline truncate"
                            >
                              <i className="ri-external-link-line shrink-0" />
                              <span className="truncate">{label}</span>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {candidate?.documents && candidate.documents.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-[#8c9097] dark:text-white/40 mb-0">Documents</p>
                        <Link href="/settings/personal-information/" className="text-[0.7rem] text-primary hover:underline">Manage</Link>
                      </div>
                      <div className="space-y-1.5">
                        {candidate.documents.map((doc, index) => (
                          <div key={index} className="flex items-center justify-between gap-2">
                            <span className="text-[0.75rem] truncate">{doc.label || doc.type || `Document ${index + 1}`}</span>
                            {candidateIdForDocs && (doc.key || doc.url) ? (
                              <button
                                type="button"
                                className="ti-btn ti-btn-sm ti-btn-primary !w-auto !h-auto !py-0.5 !px-2 whitespace-nowrap text-[0.65rem] shrink-0"
                                onClick={async () => {
                                  try {
                                    const { url } = await getDocumentDownloadUrl(candidateIdForDocs, index);
                                    window.open(url, "_blank", "noopener,noreferrer");
                                  } catch {
                                    Swal.fire("Error", "Could not open document.", "error");
                                  }
                                }}
                              >
                                <i className="ri-external-link-line" />
                              </button>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Activity Tab ── */}
            {activeTab === "activity" && (
              <div className="p-4">
                {activitiesLoading ? (
                  <div className="text-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3" />
                    <p className="text-[#8c9097] dark:text-white/50 text-sm">Loading activity...</p>
                  </div>
                ) : activities.length === 0 ? (
                  <div className="text-center py-10">
                    <i className="ri-history-line text-4xl text-[#8c9097]/40 mb-2 block" />
                    <p className="text-[#8c9097] dark:text-white/50 text-sm">No activity recorded yet.</p>
                  </div>
                ) : (
                  <ul className="list-none profile-timeline">
                    {activities.map((log) => {
                      const ai = actionIcon(log.action);
                      return (
                        <li key={log.id}>
                          <div>
                            <span className={`avatar avatar-sm avatar-rounded profile-timeline-avatar ${ai.bg}`}>
                              <i className={ai.icon} />
                            </span>
                            <p className="mb-1.5">
                              <b>{humanizeAction(log.action)}</b>
                              {log.entityType && (
                                <span className="text-[#8c9097] dark:text-white/50">
                                  {" "}on <b>{log.entityType}</b>
                                  {log.entityId && <span className="text-xs"> ({log.entityId.slice(-6)})</span>}
                                </span>
                              )}
                              <span className="ltr:float-right rtl:float-left text-[.6875rem] text-[#8c9097] dark:text-white/50">
                                {formatActivityDate(log.createdAt)}
                              </span>
                            </p>
                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                              <p className="text-[#8c9097] dark:text-white/50 text-xs mb-0">
                                {Object.entries(log.metadata)
                                  .filter(([, v]) => v != null && v !== "")
                                  .slice(0, 3)
                                  .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
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

            {/* ── Jobs Tab ── */}
            {activeTab === "jobs" && (
              <div className="p-4">
                {!candidate?.skills?.length ? (
                  <div className="text-center py-10">
                    <i className="ri-tools-line text-4xl text-[#8c9097]/40 mb-2 block" />
                    <p className="text-[#8c9097] dark:text-white/50 text-sm">Add skills to your profile to see matching jobs.</p>
                    <Link href="/settings/personal-information/" className="ti-btn ti-btn-sm ti-btn-primary !w-auto !h-auto mt-2 inline-flex items-center">
                      <i className="ri-user-settings-line me-1 align-middle" />
                      Edit Profile
                    </Link>
                  </div>
                ) : matchingJobsLoading ? (
                  <div className="text-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3" />
                    <p className="text-[#8c9097] dark:text-white/50 text-sm">Finding matching jobs...</p>
                  </div>
                ) : matchingJobs.length === 0 ? (
                  <div className="text-center py-10">
                    <i className="ri-search-line text-4xl text-[#8c9097]/40 mb-2 block" />
                    <p className="text-[#8c9097] dark:text-white/50 text-sm">No matching jobs found. Add more skills to improve matches.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {matchingJobs.map((job) => {
                      const scoreColor =
                        job.fitScore >= 80
                          ? "text-emerald-600 dark:text-emerald-400"
                          : job.fitScore >= 60
                          ? "text-sky-600 dark:text-sky-400"
                          : job.fitScore >= 40
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-[#8c9097] dark:text-white/50";
                      const scoreBg =
                        job.fitScore >= 80
                          ? "bg-emerald-500/10"
                          : job.fitScore >= 60
                          ? "bg-sky-500/10"
                          : job.fitScore >= 40
                          ? "bg-amber-500/10"
                          : "bg-slate-500/10";
                      return (
                        <div key={job.jobId} className="p-3 rounded-lg border border-dashed dark:border-defaultborder/10 bg-light/50 dark:bg-black/10 flex flex-col gap-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-[0.8125rem] mb-0 truncate">{job.title}</p>
                              <p className="text-[0.7rem] text-[#8c9097] dark:text-white/50 mb-0 truncate">
                                {job.company && <span>{job.company}</span>}
                                {job.location && <span>{job.company ? " · " : ""}{job.location}</span>}
                              </p>
                            </div>
                            <div className={`flex flex-col items-center rounded-md px-2 py-1 shrink-0 ${scoreBg}`}>
                              <span className={`text-[0.9rem] font-bold leading-none ${scoreColor}`}>{job.fitScore}%</span>
                              <span className={`text-[0.55rem] font-medium ${scoreColor}`}>{job.fitLabel}</span>
                            </div>
                          </div>
                          {job.jobType && (
                            <span className="badge bg-light text-[#8c9097] dark:text-white/50 text-[0.6rem] self-start">{job.jobType}</span>
                          )}
                          <div className="flex flex-wrap gap-1">
                            {job.matchedSkills.slice(0, 3).map((s) => (
                              <span key={s.name} className="badge bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[0.6rem] px-1.5 py-0.5 rounded">
                                <i className="ri-check-line me-0.5" />{s.name}
                              </span>
                            ))}
                            {job.missingSkills.slice(0, 2).map((s) => (
                              <span key={s.name} className="badge bg-slate-500/10 text-[#8c9097] dark:text-white/40 text-[0.6rem] px-1.5 py-0.5 rounded">
                                {s.name}
                              </span>
                            ))}
                          </div>
                          <Link
                            href={`/ats/browse-jobs/${job.jobId}`}
                            className="ti-btn ti-btn-sm ti-btn-primary !flex !w-full !h-auto !py-1 whitespace-nowrap text-[0.7rem] items-center justify-center mt-auto"
                          >
                            <i className="ri-send-plane-line me-1 align-middle inline-block" />
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
            const v = res?.user && typeof (res.user as { isEmailVerified?: boolean }).isEmailVerified === "boolean"
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
    return () => { cancelled = true; };
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
