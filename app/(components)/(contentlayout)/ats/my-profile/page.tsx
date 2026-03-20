"use client";

import Seo from "@/shared/layout-components/seo/seo";
import Pageheader from "@/shared/layout-components/page-header/pageheader";
import Link from "next/link";
import React, { Fragment, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/shared/contexts/auth-context";
import { useHasCandidateRole } from "@/shared/hooks/use-has-candidate-role";
import { getMeWithCandidate, sendMyVerificationEmail } from "@/shared/lib/api/auth";
import type { CandidateWithProfile } from "@/shared/lib/api/auth";
import { ROUTES } from "@/shared/lib/constants";
import { listActivityLogs } from "@/shared/lib/api/activity-logs";
import * as rolesApi from "@/shared/lib/api/roles";
import type { User, ActivityLog, Role } from "@/shared/lib/types";

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

function DynamicProfileView({ candidate }: { candidate?: CandidateWithProfile | null }) {
  const { user, refreshUser } = useAuth();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [roles, setRoles] = useState<Role[]>([]);
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

  const rolesById = useMemo(() => {
    const map = new Map<string, Role>();
    roles.forEach((r) => map.set(r.id, r));
    return map;
  }, [roles]);

  const roleDisplayName = useMemo(() => {
    if (!u) return "—";
    const ids = u.roleIds ?? [];
    if (ids.length === 0) {
      const r = (u.role ?? "User").toString();
      return r.charAt(0).toUpperCase() + r.slice(1);
    }
    const names = ids.map((id) => rolesById.get(id)?.name).filter(Boolean);
    return names.length > 0 ? names.join(", ") : (u.role ?? "User").toString();
  }, [u, rolesById]);

  useEffect(() => {
    rolesApi.listRoles({ limit: 100 }).then((r) => setRoles(r.results)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!u) return;
    listActivityLogs({ actor: u.id, limit: 20, sortBy: "createdAt:desc" })
      .then((res) => setActivities(res.results))
      .catch(() => {})
      .finally(() => setActivitiesLoading(false));
  }, [u]);

  if (!u) {
    return (
      <div className="text-center py-12 text-defaulttextcolor/70">
        Please sign in to view your profile.
      </div>
    );
  }

  const displayEmployeeId = candidate?.employeeId ?? "—";
  const personalInfo = [
    { label: "Name :", value: displayName },
    { label: "Email :", value: u?.email ?? "—" },
    ...(displayPhone ? [{ label: "Phone :", value: `${displayCountryCode ? displayCountryCode + " " : ""}${displayPhone}` }] : []),
    { label: "Employee ID :", value: displayEmployeeId },
    { label: "Role :", value: roleDisplayName },
    ...(displayAddress ? [{ label: "Address :", value: displayAddress }] : []),
    ...(u.education ? [{ label: "Education :", value: u.education }] : []),
    ...(u.domain && u.domain.length > 0 ? [{ label: "Domain :", value: u.domain.join(", ") }] : []),
  ];

  const isEmailVerified = (u as { isEmailVerified?: boolean }).isEmailVerified !== false;
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

  return (
    <div className="grid grid-cols-12 gap-x-6">
      {!isEmailVerified && (
        <div className="col-span-12 mb-4">
          <div className="box border border-warning/30 bg-warning/5">
            <div className="box-body flex flex-wrap items-center justify-between gap-3">
              <p className="text-defaulttextcolor dark:text-white/90 mb-0">
                <i className="ri-mail-unread-line me-2 align-middle text-warning" />
                Your email is not verified. Check your inbox for the verification link, or request a new one.
              </p>
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resendVerificationSending}
                className="ti-btn ti-btn-warning !font-medium"
              >
                {resendVerificationSending ? (
                  <>
                    <span className="animate-spin inline-block me-2 w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                    Sending…
                  </>
                ) : (
                  <>
                    <i className="ri-mail-send-line me-1 align-middle" />
                    Resend verification email
                  </>
                )}
              </button>
            </div>
            {resendVerificationMessage === "success" && (
              <div className="box-body pt-0 text-success text-sm">
                Verification email sent. Check your inbox (and spam folder).
              </div>
            )}
            {resendVerificationMessage === "error" && (
              <div className="box-body pt-0 text-danger text-sm">
                Failed to send. Try again later.
              </div>
            )}
          </div>
        </div>
      )}
      {/* Left sidebar */}
      <div className="xxl:col-span-4 xl:col-span-12 col-span-12">
        <div className="box overflow-hidden">
          <div className="box-body !p-0">
            {/* Profile cover */}
            <div className="sm:flex items-start p-6 main-profile-cover">
              <div>
                {u.profilePicture?.url ? (
                  <span className="avatar avatar-xxl avatar-rounded online me-4">
                    <img src={u.profilePicture.url} alt="" />
                  </span>
                ) : (
                  <span className="avatar avatar-xxl avatar-rounded me-4 flex items-center justify-center bg-primary/10 text-primary font-semibold text-[1.5rem]">
                    {getInitial(u.name ?? u.email)}
                  </span>
                )}
              </div>
              <div className="flex-grow main-profile-info">
                <div className="flex items-center !justify-between">
                  <h6 className="font-semibold mb-1 text-white text-[1rem]">
                    {displayName}
                  </h6>
                  <Link
                    href="/settings/personal-information/"
                    className="ti-btn ti-btn-light !font-medium !gap-0 !py-1 !px-3 !w-auto !h-auto whitespace-nowrap"
                  >
                    <i className="ri-edit-line me-1 align-middle inline-block" />
                    Edit Profile
                  </Link>
                </div>
                <p className="mb-1 !text-white opacity-[0.7]">{roleDisplayName}</p>
                <p className="text-[0.75rem] text-white mb-6 opacity-[0.5]">
                  {displayAddress ? (
                    <span className="inline-flex">
                      <i className="ri-map-pin-line me-1 align-middle" />
                      {displayAddress}
                    </span>
                  ) : (
                    <span className="opacity-0">—</span>
                  )}
                </p>
              </div>
            </div>

            {/* Bio */}
            {displayBio && (
              <div className="p-6 border-b border-dashed dark:border-defaultborder/10">
                <p className="text-[.9375rem] mb-2 font-semibold">Professional Bio :</p>
                <p className="text-[0.75rem] text-[#8c9097] dark:text-white/50 opacity-[0.7] mb-0">
                  {displayBio}
                </p>
              </div>
            )}

            {/* Contact */}
            <div className="p-6 border-b border-dashed dark:border-defaultborder/10">
              <p className="text-[.9375rem] mb-2 me-6 font-semibold">Contact Information :</p>
              <div className="text-[#8c9097] dark:text-white/50">
                <p className="mb-2">
                  <span className="avatar avatar-sm avatar-rounded me-2 bg-light text-[#8c9097] dark:text-white/50">
                    <i className="ri-mail-line align-middle text-[.875rem] text-[#8c9097] dark:text-white/50" />
                  </span>
                  {u.email ?? "—"}
                </p>
                {displayPhone && (
                  <p className="mb-2">
                    <span className="avatar avatar-sm avatar-rounded me-2 bg-light text-[#8c9097] dark:text-white/50">
                      <i className="ri-phone-line align-middle text-[.875rem] text-[#8c9097] dark:text-white/50" />
                    </span>
                    {displayCountryCode ? `${displayCountryCode} ` : ""}{displayPhone}
                  </p>
                )}
                {displayAddress && (
                  <p className="mb-0">
                    <span className="avatar avatar-sm avatar-rounded me-2 bg-light text-[#8c9097] dark:text-white/50">
                      <i className="ri-map-pin-line align-middle text-[.875rem] text-[#8c9097] dark:text-white/50" />
                    </span>
                    {displayAddress}
                  </p>
                )}
              </div>
            </div>

            {/* Skills / Domain */}
            {u.domain && u.domain.length > 0 && (
              <div className="p-6 border-b dark:border-defaultborder/10 border-dashed">
                <p className="text-[.9375rem] mb-2 me-6 font-semibold">Domain :</p>
                <div>
                  {u.domain.map((d) => (
                    <span key={d} className="badge bg-light text-[#8c9097] dark:text-white/50 m-1">
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Quick actions */}
            <div className="p-6">
              <p className="text-[.9375rem] mb-3 font-semibold">Quick actions</p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/settings/personal-information/"
                  className="ti-btn ti-btn-sm ti-btn-primary !w-auto !h-auto whitespace-nowrap"
                >
                  <i className="ri-user-settings-line me-1" />
                  Personal Information
                </Link>
                <Link
                  href="/settings/"
                  className="ti-btn ti-btn-sm ti-btn-light !w-auto !h-auto whitespace-nowrap"
                >
                  <i className="ri-settings-3-line me-1" />
                  Settings
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right content */}
      <div className="xxl:col-span-8 xl:col-span-12 col-span-12">
        <div className="grid grid-cols-12 gap-x-6">
          {/* Activity log */}
          <div className="xl:col-span-12 col-span-12">
            <div className="box">
              <div className="box-body !p-0">
                <div className="!p-4 border-b dark:border-defaultborder/10 border-dashed flex items-center justify-between">
                  <nav className="-mb-0.5 flex" role="tablist">
                    <span className="flex font-semibold text-white bg-primary rounded-md py-2 px-4 text-sm">
                      <i className="ri-history-line align-middle inline-block me-1" />
                      Activity Log
                    </span>
                  </nav>
                </div>
                <div className="!p-4">
                  {activitiesLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3" />
                      <p className="text-[#8c9097] dark:text-white/50 text-sm">Loading activity...</p>
                    </div>
                  ) : activities.length === 0 ? (
                    <div className="text-center py-8">
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
                              <p className="mb-2">
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
              </div>
            </div>
          </div>

          {/* Personal Info box */}
          <div className="xl:col-span-12 col-span-12">
            <div className="box">
              <div className="box-header">
                <div className="box-title">Personal Info</div>
              </div>
              <div className="box-body">
                <ul className="list-group">
                  {personalInfo.map((item) => (
                    <li className="list-group-item" key={item.label}>
                      <div className="flex flex-wrap items-center">
                        <div className="me-2 font-semibold">{item.label}</div>
                        <span className="text-[0.75rem] text-[#8c9097] dark:text-white/50">
                          {item.value}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Qualifications (candidate) */}
          {candidate?.qualifications && candidate.qualifications.length > 0 && (
            <div className="xl:col-span-12 col-span-12">
              <div className="box">
                <div className="box-header">
                  <div className="box-title">Qualifications</div>
                </div>
                <div className="box-body">
                  <ul className="list-group">
                    {candidate.qualifications.map((q, i) => (
                      <li className="list-group-item" key={i}>
                        <div className="font-semibold">{q.degree} – {q.institute}</div>
                        {q.location && <div className="text-[0.75rem] text-[#8c9097] dark:text-white/50">{q.location}</div>}
                        {(q.startYear || q.endYear) && (
                          <div className="text-[0.75rem] text-[#8c9097] dark:text-white/50">
                            {q.startYear ?? "?"} – {q.endYear ?? "Present"}
                          </div>
                        )}
                        {q.description && <p className="text-[0.75rem] mt-1 mb-0">{q.description}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Work Experience (candidate) */}
          {candidate?.experiences && candidate.experiences.length > 0 && (
            <div className="xl:col-span-12 col-span-12">
              <div className="box">
                <div className="box-header">
                  <div className="box-title">Work Experience</div>
                </div>
                <div className="box-body">
                  <ul className="list-group">
                    {candidate.experiences.map((exp, i) => (
                      <li className="list-group-item" key={i}>
                        <div className="font-semibold">{exp.role} at {exp.company}</div>
                        {(exp.startDate || exp.endDate) && (
                          <div className="text-[0.75rem] text-[#8c9097] dark:text-white/50">
                            {exp.startDate ? new Date(exp.startDate).toLocaleDateString() : "?"} –{" "}
                            {exp.currentlyWorking ? "Present" : exp.endDate ? new Date(exp.endDate).toLocaleDateString() : "?"}
                          </div>
                        )}
                        {exp.description && <p className="text-[0.75rem] mt-1 mb-0">{exp.description}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Documents summary (candidate) */}
          {candidate?.documents && candidate.documents.length > 0 && (
            <div className="xl:col-span-12 col-span-12">
              <div className="box">
                <div className="box-header">
                  <div className="box-title">Documents</div>
                </div>
                <div className="box-body">
                  <p className="text-[0.75rem] text-[#8c9097] dark:text-white/50 mb-0">
                    {candidate.documents.length} document(s) on file.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MyProfilePage() {
  const { user } = useAuth();
  const { hasCandidateProfile, isLoading: rolesLoading } = useHasCandidateRole();
  const [candidate, setCandidate] = useState<CandidateWithProfile | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setDataLoading(false);
      return;
    }
    let cancelled = false;
    if (hasCandidateProfile) {
      getMeWithCandidate()
        .then((res) => {
          if (!cancelled) setCandidate(res?.candidate ?? null);
        })
        .catch(() => {
          if (!cancelled) setCandidate(null);
        })
        .finally(() => {
          if (!cancelled) setDataLoading(false);
        });
    } else {
      setCandidate(null);
      setDataLoading(false);
    }
    return () => { cancelled = true; };
  }, [user, hasCandidateProfile]);

  if (user && !rolesLoading && !dataLoading) {
    return (
      <Fragment>
        <Seo title="My Profile" />
        <Pageheader currentpage="My Profile" activepage="ATS" mainpage="My Profile" />
        <DynamicProfileView candidate={candidate} />
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
