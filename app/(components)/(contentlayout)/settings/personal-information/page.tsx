"use client";

import React, { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Seo from "@/shared/layout-components/seo/seo";
import { useAuth } from "@/shared/contexts/auth-context";
import { ROUTES } from "@/shared/lib/constants";
import * as authApi from "@/shared/lib/api/auth";
import * as usersApi from "@/shared/lib/api/users";
import {
  uploadDocuments,
  getDocumentDownloadUrl,
  getSalarySlipDownloadUrl,
  getMyCandidate,
} from "@/shared/lib/api/candidates";
import type { NotificationPreferences } from "@/shared/lib/api/users";
import { useHasEmployeeRole } from "@/shared/hooks/use-has-employee-role";
import { EmployeeProfileWizard, ProfilePhotoUploader } from "@/shared/workforce-profile";
import { resolveSelfServiceWizardTarget } from "@/shared/lib/personal-info-wizard";
import { PhoneCountrySelect } from "@/shared/components/PhoneCountrySelect";
import { NotificationPreferencesEditor } from "@/shared/components/NotificationPreferencesEditor";
import { ChangePasswordButton } from "@/shared/components/ChangePasswordButton";
import { DEFAULT_PHONE_COUNTRY, parseStoredPhone } from "@/shared/lib/phoneCountries";
import type { CandidateWithProfile, UpdateMeWithCandidatePayload } from "@/shared/lib/api/auth";
import { AxiosError } from "axios";
import Swal from "sweetalert2";
import { formatUserAgentSummary } from "@/shared/lib/parse-user-agent";
import { formatUserRoleDisplayName } from "@/shared/lib/user-role-display";
import {
  getSocialLinkUrlError,
  normalizeSocialUrl,
  SOCIAL_PLATFORMS,
  validateSocialLinkRows,
} from "@/shared/lib/socialLinks";

function validatePhoneForCandidate(phone: string): string | null {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.length < 6 || digits.length > 15) return "Phone number must be 6–15 digits";
  return null;
}

function formatDate(isoString: string | undefined): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "—";
  }
}

/** roleIds from API may be strings or populated subdocs; Role rows may use id or _id. */
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

type QualRow = {
  degree: string;
  institute: string;
  location?: string;
  startYear?: number;
  endYear?: number;
  description?: string;
};

type ExpRow = {
  company: string;
  role: string;
  startDate?: string;
  endDate?: string;
  currentlyWorking?: boolean;
  description?: string;
};

/** Split comma-joined Joi messages and rewrite them for profile forms. */
function humanizeProfileValidationMessage(raw: string): string {
  const t = raw.trim();
  if (!t) return "Couldn't save your profile. Check required fields.";
  const parts = t.split(/\s*,\s*/).map((s) => s.trim()).filter(Boolean);
  const mapped = [...new Set(parts.map(humanizeSingleValidationSegment))];
  return mapped.join(" ");
}

function humanizeSingleValidationSegment(seg: string): string {
  const low = seg.toLowerCase();

  const expIdx = seg.match(/experiences?\[(\d+)\]/i);
  const qualIdx = seg.match(/qualifications?\[(\d+)\]/i);
  const expN = expIdx ? Number(expIdx[1]) + 1 : null;
  const qualN = qualIdx ? Number(qualIdx[1]) + 1 : null;

  const ex = (detail: string) =>
    expN != null ? `Work experience (${expN}): ${detail}` : `Work experience: ${detail}`;
  const qu = (detail: string) =>
    qualN != null ? `Qualification (${qualN}): ${detail}` : `Qualifications: ${detail}`;

  if (seg.includes('"role"') && (low.includes("empty") || low.includes("required")))
    return ex("Job title (role) can't be empty — fill the Role field or remove this entry.");
  if (seg.includes('"company"') && (low.includes("empty") || low.includes("required")))
    return ex("Company name can't be empty.");
  if (seg.includes('"degree"') && (low.includes("empty") || low.includes("required")))
    return qu("Degree can't be empty.");
  if (seg.includes('"institute"') && (low.includes("empty") || low.includes("required")))
    return qu("School / institute can't be empty.");

  if (seg.includes('"platform"') && (low.includes("empty") || low.includes("required")))
    return "Social links: choose a platform for each URL, or clear incomplete rows.";
  if (
    seg.includes('"url"') &&
    (low.includes("uri") || low.includes("invalid") || low.includes("empty") || low.includes("required"))
  )
    return "Social links: enter a valid URL (include https://) for each platform.";

  return seg;
}

function validateQualificationsPayload(rows: QualRow[]): { error?: string; list?: QualRow[] } {
  const list: QualRow[] = [];
  for (let i = 0; i < rows.length; i++) {
    const q = rows[i];
    const degree = (q.degree ?? "").trim();
    const institute = (q.institute ?? "").trim();
    const loc = (q.location ?? "").trim();
    const desc = (q.description ?? "").trim();
    const hasOther = !!(loc || desc || q.startYear != null || q.endYear != null);
    if (!degree && !institute && !hasOther) continue;
    if (!degree || !institute) {
      return { error: `Qualification ${i + 1}: enter both degree and school/institute, or remove this entry.` };
    }
    list.push({
      degree,
      institute,
      location: loc || undefined,
      startYear: q.startYear,
      endYear: q.endYear,
      description: desc || undefined,
    });
  }
  return { list };
}

function validateExperiencesPayload(rows: ExpRow[]): { error?: string; list?: ExpRow[] } {
  const list: ExpRow[] = [];
  for (let i = 0; i < rows.length; i++) {
    const x = rows[i];
    const company = (x.company ?? "").trim();
    const role = (x.role ?? "").trim();
    const hasOther =
      !!(x.startDate || x.endDate || (x.description ?? "").trim() || x.currentlyWorking);
    if (!company && !role && !hasOther) continue;
    if (!company) {
      return { error: `Work experience ${i + 1}: enter the company name, or remove this entry.` };
    }
    if (!role) {
      return { error: `Work experience ${i + 1}: job title (Role) can't be empty — fill it or remove this entry.` };
    }
    list.push({ ...x, company, role });
  }
  return { list };
}

function extractApiErrorMessage(err: unknown): string {
  if (!(err instanceof AxiosError)) return "Failed to update profile.";
  const data = err.response?.data as { message?: string | string[] } | undefined;
  const m = data?.message;
  if (Array.isArray(m) && m.length) return m.map(String).join(", ").trim();
  if (typeof m === "string" && m.trim()) return m.trim();
  return "Failed to update profile.";
}

const SKILL_LEVELS = ["Beginner", "Intermediate", "Advanced", "Expert"] as const;

type SkillRow = { id: number; name: string; level: string; category?: string };

function mergeExtractedSkillsIntoRows(
  existing: SkillRow[],
  incoming: Array<{ name: string; level?: string; category?: string }>
): SkillRow[] {
  const map = new Map<string, SkillRow>();
  let nid = Date.now();
  for (const row of existing) {
    const k = row.name.trim().toLowerCase();
    if (k) map.set(k, row);
  }
  for (const s of incoming) {
    const name = (s.name || "").trim();
    if (!name) continue;
    const k = name.toLowerCase();
    if (!map.has(k)) {
      const lvl =
        typeof s.level === "string" && SKILL_LEVELS.includes(s.level as (typeof SKILL_LEVELS)[number])
          ? s.level
          : "Intermediate";
      map.set(k, {
        id: nid++,
        name,
        level: lvl,
        category: typeof s.category === "string" ? s.category : undefined,
      });
    }
  }
  return [...map.values()];
}

function buildSkillsPayload(rows: SkillRow[]): NonNullable<UpdateMeWithCandidatePayload["skills"]> {
  return rows
    .filter((r) => r.name.trim())
    .map((r) => ({
      name: r.name.trim(),
      level: SKILL_LEVELS.includes(r.level as (typeof SKILL_LEVELS)[number])
        ? (r.level as (typeof SKILL_LEVELS)[number])
        : "Intermediate",
      category: r.category?.trim() || undefined,
    }));
}

/** Maps API `candidate.skills` to editable rows. */
function candidateSkillsToSkillRows(skills: unknown): SkillRow[] {
  if (!Array.isArray(skills) || skills.length === 0) return [];
  const base = Date.now();
  return skills
    .map((s: unknown, i: number) => {
      const o =
        typeof s === "object" && s !== null
          ? (s as { name?: string; level?: string; category?: string })
          : {};
      const lvl =
        typeof o.level === "string" && SKILL_LEVELS.includes(o.level as (typeof SKILL_LEVELS)[number])
          ? o.level
          : "Intermediate";
      return {
        id: base + i,
        name: typeof o.name === "string" ? o.name : "",
        level: lvl,
        category: typeof o.category === "string" ? o.category : undefined,
      };
    })
    .filter((x) => x.name.trim());
}

/** PDF/DOCX only — matches backend resume extractor. */
function isResumeExtractableFile(file: File): boolean {
  const lower = file.name.toLowerCase();
  return (
    file.type === "application/pdf" ||
    lower.endsWith(".pdf") ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lower.endsWith(".docx")
  );
}

/** Escape user-controlled text (e.g. file names) before placing it in SweetAlert `html`. */
function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function showProfileSaveToast(kind: "error" | "success", title: string, text?: string): Promise<void> {
  await Swal.fire({
    icon: kind,
    title,
    ...(text ? { text } : {}),
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: kind === "error" ? 7000 : 3200,
    timerProgressBar: true,
  });
}

export default function PersonalInformationPage() {
  const {
    user,
    logout,
    sessions,
    checkAuth,
    refreshUser,
    applyUser,
    isAdministrator,
    isPlatformSuperUser,
    roleNames,
    permissionsLoaded,
  } = useAuth();
  /** Same UI and PATCH /users privileges as Administrator (includes platform super). */
  const hasAdminPrivileges = isAdministrator || isPlatformSuperUser;
  const { hasEmployeeRole, hasEmployeeProfile, isLoading: candidateRoleLoading } = useHasEmployeeRole();
  /** Username is only persisted on the staff (no linked candidate profile) save path. */
  const canEditUsernameOnPage = hasAdminPrivileges && !hasEmployeeProfile;
  /** Immigration/compensation fields are HR-owned — editable only via ATS employee edit. */
  const hrOwnedReadOnly = hasEmployeeProfile;
  const hrOwnedHint = "Managed by your administrator.";
  const [candidate, setCandidate] = useState<CandidateWithProfile | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");

  /** User-model fields for staff (no linked Candidate profile): Settings → Personal Information. */
  const [staffPhone, setStaffPhone] = useState("");
  const [staffCountryCode, setStaffCountryCode] = useState<string>(DEFAULT_PHONE_COUNTRY);
  const [staffLocation, setStaffLocation] = useState("");
  const [staffProfileSummary, setStaffProfileSummary] = useState("");
  const [staffEducation, setStaffEducation] = useState("");
  const [staffDomain, setStaffDomain] = useState("");

  const [saveLoading, setSaveLoading] = useState(false);
  /** True while skills are being pulled from a CV/Resume uploaded via the Documents section (during Save). */
  const [extractingFromDoc, setExtractingFromDoc] = useState(false);
  const [avatarUploadLoading, setAvatarUploadLoading] = useState(false);
  const [avatarRemoveLoading, setAvatarRemoveLoading] = useState(false);
  const [pendingAvatarPreview, setPendingAvatarPreview] = useState<string | null>(null);
  const [avatarUploaderBusy, setAvatarUploaderBusy] = useState(false);

  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState<string>(DEFAULT_PHONE_COUNTRY);
  const [shortBio, setShortBio] = useState("");
  const [address, setAddress] = useState({ streetAddress: "", streetAddress2: "", city: "", state: "", zipCode: "", country: "" });
  const [sevisId, setSevisId] = useState("");
  const [ead, setEad] = useState("");
  const [visaType, setVisaType] = useState("");
  const [customVisaType, setCustomVisaType] = useState("");
  const [degree, setDegree] = useState("");
  const [supervisorName, setSupervisorName] = useState("");
  const [supervisorContact, setSupervisorContact] = useState("");
  const [salaryRange, setSalaryRange] = useState("");
  const [qualifications, setQualifications] = useState<Array<{ degree: string; institute: string; location?: string; startYear?: number; endYear?: number; description?: string }>>([]);
  const [experiences, setExperiences] = useState<Array<{ company: string; role: string; startDate?: string; endDate?: string; currentlyWorking?: boolean; description?: string }>>([]);
  const [documentsList, setDocumentsList] = useState<{ id: number; name: string; customName: string; file: File | null }[]>([]);
  const [existingDocs, setExistingDocs] = useState<Array<{ type?: string; label?: string; url?: string; key?: string; originalName?: string }>>([]);
  const [salarySlips, setSalarySlips] = useState<Array<{ id: number; month: string; year: string; file: File | null }>>([]);
  const [existingSalarySlips, setExistingSalarySlips] = useState<Array<{ month: string; year: string; documentUrl?: string; key?: string; originalName?: string }>>([]);
  const [socialLinkRows, setSocialLinkRows] = useState<Array<{ id: number; platform: string; url: string }>>([]);

  /** Structured skills — persisted via PATCH me/with-candidate; can be populated by AI resume extraction. */
  const [skillsRows, setSkillsRows] = useState<SkillRow[]>([]);
  const [extractSkillsLoading, setExtractSkillsLoading] = useState(false);
  const [skillRoleRecommendLoading, setSkillRoleRecommendLoading] = useState(false);
  const [skillsOpen, setSkillsOpen] = useState(false);
  const resumeExtractInputRef = useRef<HTMLInputElement | null>(null);
  /** Resume-extraction review modal: extracted skills awaiting user confirm before merge. */
  const [extractReview, setExtractReview] = useState<{
    skills: Array<{ name: string; level?: string; category?: string }>;
    selected: Set<number>;
    sourceFile: string;
  } | null>(null);

  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    leaveUpdates: true,
    leaveUpdatesInApp: true,
    taskAssignments: true,
    taskAssignmentsInApp: true,
    applicationUpdates: true,
    applicationUpdatesInApp: true,
    offerUpdates: true,
    offerUpdatesInApp: true,
    meetingInvitations: true,
    meetingInvitationsInApp: true,
    meetingReminders: true,
    meetingRemindersInApp: true,
    certificates: true,
    certificatesInApp: true,
    courseUpdates: true,
    courseUpdatesInApp: true,
    recruiterUpdates: true,
    recruiterUpdatesInApp: true,
    supportTicketUpdates: true,
    supportTicketUpdatesInApp: true,
    placementUpdates: true,
    placementUpdatesInApp: true,
    chatMessagesInApp: true,
    assignmentUpdatesInApp: true,
    projectUpdatesInApp: true,
    sopAssignmentsInApp: true,
  });

  const roleDisplayName = useMemo(
    () => formatUserRoleDisplayName({ user, roleNames, permissionsLoaded }),
    [user, roleNames, permissionsLoaded],
  );

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      try {
        if (hasAdminPrivileges) {
          if (!hasEmployeeProfile) {
            if (!cancelled) setCandidate(null);
            return;
          }
          const res = await authApi.getMeWithCandidate();
          if (cancelled) return;
          if (res?.candidate) setCandidate(res.candidate);
          else setCandidate(null);
          return;
        }

        const res = await authApi.getMeWithCandidate();
        if (cancelled) return;
        if (res?.candidate) {
          setCandidate(res.candidate);
          return;
        }
        try {
          const c = await getMyCandidate();
          if (cancelled) return;
          setCandidate(c ? (c as CandidateWithProfile) : null);
        } catch {
          if (!cancelled) setCandidate(null);
        }
      } catch {
        if (!cancelled) setCandidate(null);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user, hasAdminPrivileges, hasEmployeeProfile]);

  useEffect(() => {
    if (!candidate) return;

    const syncAttachmentsFromCandidate = () => {
      setExistingDocs(
        candidate.documents?.map((d) => ({
          type: d.type,
          label: d.label,
          url: d.url,
          key: d.key,
          originalName: d.originalName,
        })) ?? []
      );
      setExistingSalarySlips(
        candidate.salarySlips?.map((s) => ({
          month: s.month ?? "",
          year: String(s.year ?? ""),
          documentUrl: s.documentUrl,
          key: s.key,
          originalName: s.originalName,
        })) ?? []
      );
      const sl = candidate.socialLinks;
      if (Array.isArray(sl) && sl.length > 0) {
        setSocialLinkRows(
          sl.map((s, i) => ({
            id: Date.now() + i,
            platform: typeof s?.platform === "string" ? s.platform : "",
            url: typeof s?.url === "string" ? s.url : "",
          }))
        );
      } else {
        setSocialLinkRows([]);
      }
    };

    if (hasEmployeeProfile) {
      {
        // parseStoredPhone unwraps legacy E.164 ("+91...") into countryCode + local digits,
        // and uses the stored hint when present so India numbers no longer fall back to US.
        const hint =
          candidate.countryCode ||
          (typeof user?.countryCode === "string" && user.countryCode ? user.countryCode : null);
        const parsed = parseStoredPhone(candidate.phoneNumber, hint);
        setPhoneNumber(parsed.digits);
        setCountryCode(parsed.countryCode);
      }
      setShortBio(candidate.shortBio ?? "");
      setAddress({
        streetAddress: candidate.address?.streetAddress ?? "",
        streetAddress2: candidate.address?.streetAddress2 ?? "",
        city: candidate.address?.city ?? "",
        state: candidate.address?.state ?? "",
        zipCode: candidate.address?.zipCode ?? "",
        country: candidate.address?.country ?? "",
      });
      setSevisId(candidate.sevisId ?? "");
      setEad(candidate.ead ?? "");
      setVisaType(candidate.visaType ?? "");
      setCustomVisaType(candidate.customVisaType ?? "");
      setDegree(candidate.degree ?? "");
      setSupervisorName(candidate.supervisorName ?? "");
      setSupervisorContact(candidate.supervisorContact ?? "");
      setSalaryRange(candidate.salaryRange ?? "");
      setQualifications(candidate.qualifications && candidate.qualifications.length > 0 ? candidate.qualifications : []);
      setExperiences(candidate.experiences && candidate.experiences.length > 0 ? candidate.experiences : []);
      syncAttachmentsFromCandidate();
    } else {
      syncAttachmentsFromCandidate();
    }

    const rawSkills = candidate.skills;
    if (Array.isArray(rawSkills)) {
      setSkillsRows(candidateSkillsToSkillRows(rawSkills));
    }
    // If `skills` is omitted from API JSON, do not clear — avoids wiping after PATCH responses without skills.
  }, [candidate, hasEmployeeProfile, user]);

  const runResumeSkillExtract = async (file: File | undefined | null) => {
    if (!file || !candidate) return;
    const lower = file.name.toLowerCase();
    const isPdf = file.type === "application/pdf" || lower.endsWith(".pdf");
    const isDocx =
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      lower.endsWith(".docx");
    if (!isPdf && !isDocx) {
      await Swal.fire({ icon: "error", title: "Unsupported file", text: "Upload a PDF or DOCX resume." });
      return;
    }
    setExtractSkillsLoading(true);
    // Prominent, unmissable feedback — the server runs OpenAI on the resume and can take several seconds.
    Swal.fire({
      title: "Extracting skills from your resume…",
      html: `Reading <strong>${escapeHtml(file.name)}</strong> and detecting skills.<br/>This usually takes a few seconds.`,
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading(),
    });
    try {
      const res = await authApi.extractSkillsFromResume(file);
      Swal.close();
      const skills = res.skills || [];
      if (skills.length === 0) {
        await Swal.fire({
          icon: "info",
          title: "No skills found",
          text: "Resume parsed but no skills detected.",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 4000,
          timerProgressBar: true,
        });
        return;
      }
      // Open confirmation modal — caller reviews + selects which to merge instead of silent overwrite.
      setExtractReview({
        skills,
        selected: new Set(skills.map((_, i) => i)),
        sourceFile: file.name,
      });
    } catch (err) {
      Swal.close();
      const raw = extractApiErrorMessage(err);
      await showProfileSaveToast("error", "Couldn't extract skills", raw);
    } finally {
      setExtractSkillsLoading(false);
    }
  };

  /** True if the extracted skill name already exists on skillsRows (case-insensitive). */
  const isExtractedSkillExisting = (name: string): boolean => {
    const k = name.trim().toLowerCase();
    if (!k) return false;
    return skillsRows.some((r) => r.name.trim().toLowerCase() === k);
  };

  const toggleExtractedSkill = (idx: number) => {
    setExtractReview((prev) => {
      if (!prev) return prev;
      const next = new Set(prev.selected);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return { ...prev, selected: next };
    });
  };

  const setAllExtractedSelection = (filterFn: (idx: number) => boolean) => {
    setExtractReview((prev) => {
      if (!prev) return prev;
      const next = new Set<number>();
      prev.skills.forEach((_, i) => {
        if (filterFn(i)) next.add(i);
      });
      return { ...prev, selected: next };
    });
  };

  const confirmExtractedSkills = async () => {
    if (!extractReview) return;
    const picked = extractReview.skills.filter((_, i) => extractReview.selected.has(i));
    if (picked.length === 0) {
      setExtractReview(null);
      return;
    }
    setSkillsRows((prev) => mergeExtractedSkillsIntoRows(prev, picked));
    setExtractReview(null);
    await Swal.fire({
      icon: "success",
      title: "Skills added",
      text: `Merged ${picked.length} skill${picked.length === 1 ? "" : "s"} into your list. Click Save profile to persist.`,
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 3500,
      timerProgressBar: true,
    });
  };

  const runSkillRecommendationByRole = async () => {
    if (!candidate) return;
    const { value: role, isConfirmed } = await Swal.fire({
      title: "Skills to develop for a role",
      html:
        '<p class="text-sm text-muted mb-3 text-start">We use your <strong>current skill list</strong> on this page plus the <strong>target role</strong> you enter, and suggest <em>additional</em> skills to develop. Click <strong>Save profile</strong> to persist merges.</p>',
      input: "text",
      inputPlaceholder: "e.g. AI Engineer, Lead Backend Developer",
      showCancelButton: true,
      confirmButtonText: "Suggest gaps",
      cancelButtonText: "Cancel",
      focusConfirm: false,
      inputValidator: (value) => {
        if (!value || String(value).trim().length < 2) {
          return "Enter at least 2 characters";
        }
        return null;
      },
    });
    if (!isConfirmed || !role || String(role).trim().length < 2) return;
    setSkillRoleRecommendLoading(true);
    try {
      const currentSkills = skillsRows
        .filter((r) => r.name.trim())
        .map((r) => ({
          name: r.name.trim(),
          level: r.level,
          ...(r.category?.trim() ? { category: r.category.trim() } : {}),
        }));
      const res = await authApi.recommendSkillsByRole({
        role: String(role).trim(),
        currentSkills,
      });
      const n = res.skills?.length ?? 0;
      setSkillsRows((prev) => mergeExtractedSkillsIntoRows(prev, res.skills || []));
      await Swal.fire({
        icon: "success",
        title: "Skills suggested",
        text: n
          ? `Merged ${n} new skill${n === 1 ? "" : "s"} to develop. Click Save profile to persist.`
          : "No new gaps returned — your list may already cover that role.",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 4500,
        timerProgressBar: true,
      });
    } catch (err) {
      const raw = extractApiErrorMessage(err);
      await showProfileSaveToast("error", "Couldn't suggest skills", raw);
    } finally {
      setSkillRoleRecommendLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const fullName = `${trimmedFirst} ${trimmedLast}`.trim();
    const trimmedEmail = email.trim();

    if (!trimmedFirst) {
      await showProfileSaveToast("error", "Can't save profile", "First name is required.");
      return;
    }
    if (hasAdminPrivileges && !trimmedEmail) {
      await showProfileSaveToast("error", "Can't save profile", "Email address is required.");
      return;
    }
    if (hasEmployeeProfile && !candidate) {
      await showProfileSaveToast(
        "error",
        "Can't save profile",
        "Still loading your profile. Please wait a moment and try again."
      );
      return;
    }

    if (hasEmployeeProfile && candidate) {
      const phoneErr = validatePhoneForCandidate(phoneNumber);
      if (phoneErr) {
        await showProfileSaveToast("error", "Can't save profile", phoneErr);
        return;
      }
    }

    if (!hasEmployeeProfile) {
      const digits = staffPhone.replace(/\D/g, "");
      if (digits && (digits.length < 6 || digits.length > 15)) {
        await showProfileSaveToast("error", "Can't save profile", "Phone number must be 6–15 digits.");
        return;
      }
    }

    const pendingDocUploads = documentsList.some((d) => d.file && d.name);
    const pendingSlipUploads = salarySlips.some((s) => s.file && s.month && s.year);
    if (!hasAdminPrivileges && !candidate && (pendingDocUploads || pendingSlipUploads)) {
      await showProfileSaveToast(
        "error",
        "Can't save profile",
        "No candidate profile is linked to your account. Document and salary slip uploads require a candidate record."
      );
      return;
    }

    let staffUsernameForSave: string | undefined;
    if (hasAdminPrivileges && !hasEmployeeProfile) {
      const tu = userName.trim().toLowerCase();
      if (!tu) {
        await showProfileSaveToast("error", "Can't save profile", "Username is required.");
        return;
      }
      staffUsernameForSave = tu;
    }

    let qualForSave: QualRow[] | undefined;
    let expForSave: ExpRow[] | undefined;
    if (hasEmployeeProfile && candidate) {
      const qRes = validateQualificationsPayload(qualifications);
      if (qRes.error) {
        await showProfileSaveToast("error", "Can't save profile", qRes.error);
        return;
      }
      qualForSave = qRes.list;
      const eRes = validateExperiencesPayload(experiences);
      if (eRes.error) {
        await showProfileSaveToast("error", "Can't save profile", eRes.error);
        return;
      }
      expForSave = eRes.list;
      const socialErr = validateSocialLinkRows(socialLinkRows);
      if (socialErr) {
        await showProfileSaveToast("error", "Can't save profile", socialErr);
        return;
      }
    }

    setSaveLoading(true);
    try {
      const useCandidateApi = Boolean(candidate && (hasEmployeeProfile || !hasAdminPrivileges));

      if (useCandidateApi && candidate) {
        const DOCUMENT_TYPES = [
          "Aadhar",
          "PAN",
          "Bank",
          "Passport",
          "CV/Resume",
          "Marksheet",
          "Degree Certificate",
          "Experience Letter",
          "Offer Letter",
          "Visa",
          "EAD Card",
          "I-765 Receipt",
          "I-983 Form-only",
          "Other",
        ] as const;
        let finalDocs: Array<{ type: string; label?: string; url?: string; key?: string; originalName?: string; size?: number; mimeType?: string }> = existingDocs.map((d) => ({
          type: d.type || "Other",
          label: d.label,
          url: d.url,
          key: d.key,
          originalName: d.originalName,
        }));
        /** Merged with AI when CV/Resume is uploaded (after S3). */
        let skillsForPayload: SkillRow[] = skillsRows;
        const docsToUpload = documentsList.filter((d) => d.file && d.name);
        if (docsToUpload.length > 0) {
          const files = docsToUpload.map((d) => d.file!);
          const labels = docsToUpload.map((d) => (d.name === "Other" ? d.customName : d.name));
          const uploadRes = await uploadDocuments(files, labels);
          if (uploadRes.success && uploadRes.data) {
            uploadRes.data.forEach((fileData, i) => {
              const docType = docsToUpload[i]?.name;
              const type = DOCUMENT_TYPES.includes(docType as (typeof DOCUMENT_TYPES)[number]) ? docType : "Other";
              finalDocs.push({
                type,
                label: labels[i] || fileData.originalName,
                url: fileData.url,
                key: fileData.key,
                originalName: fileData.originalName,
                size: fileData.size,
                mimeType: fileData.mimeType,
              });
            });
            const resumeDocsToExtract = docsToUpload.filter(
              (d) => d.name === "CV/Resume" && d.file && isResumeExtractableFile(d.file)
            );
            if (resumeDocsToExtract.length > 0) {
              setExtractingFromDoc(true);
              // Non-blocking signal so the user knows we're pulling skills from the resume they just uploaded.
              Swal.fire({
                title: "Extracting skills from your resume…",
                html: "Reading your CV and detecting skills. This only takes a few seconds.",
                toast: true,
                position: "top-end",
                showConfirmButton: false,
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading(),
              });
            }
            const skillCountBeforeExtract = skillsForPayload.length;
            for (const docRow of docsToUpload) {
              if (docRow.name !== "CV/Resume" || !docRow.file || !isResumeExtractableFile(docRow.file)) continue;
              try {
                const extracted = await authApi.extractSkillsFromResume(docRow.file);
                skillsForPayload = mergeExtractedSkillsIntoRows(skillsForPayload, extracted.skills || []);
              } catch (extractErr) {
                const msg = extractApiErrorMessage(extractErr);
                await Swal.fire({
                  icon: "warning",
                  title: "Document saved — skills not extracted",
                  text: msg || "Resume text may be empty, or OpenAI is unavailable. You can extract skills manually from the Skills section.",
                  toast: true,
                  position: "top-end",
                  showConfirmButton: true,
                  timer: 9000,
                });
              }
            }
            if (resumeDocsToExtract.length > 0) {
              setExtractingFromDoc(false);
              Swal.close();
              const added = Math.max(0, skillsForPayload.length - skillCountBeforeExtract);
              await showProfileSaveToast(
                "success",
                added > 0 ? `Added ${added} skill${added === 1 ? "" : "s"} from your resume` : "Resume scanned",
                added > 0 ? "Review them in the Skills section below." : "No new skills detected from the uploaded CV.",
              );
            }
            setSkillsRows(skillsForPayload);
          }
        }

        let finalSalarySlips: Array<{ month: string; year: number; documentUrl?: string; key?: string; originalName?: string; size?: number; mimeType?: string }> = existingSalarySlips
          .filter((s) => s.month && s.year)
          .map((s) => ({ ...s, year: Number(s.year) }));
        const slipsToUpload = salarySlips.filter((s) => s.file && s.month && s.year);
        if (slipsToUpload.length > 0) {
          const files = slipsToUpload.map((s) => s.file!);
          const labels = slipsToUpload.map((s) => `${s.month} ${s.year} Salary Slip`);
          const uploadRes = await uploadDocuments(files, labels);
          if (uploadRes.success && uploadRes.data) {
            uploadRes.data.forEach((fileData, i) => {
              const slip = slipsToUpload[i];
              if (slip) {
                finalSalarySlips.push({
                  month: slip.month,
                  year: Number(slip.year),
                  documentUrl: fileData.url,
                  key: fileData.key,
                  originalName: fileData.originalName,
                  size: fileData.size,
                  mimeType: fileData.mimeType,
                });
              }
            });
          }
        }

        const socialPayload = socialLinkRows
          .filter((row) => row.platform.trim() && row.url.trim())
          .map((row) => ({
            platform: row.platform.trim(),
            url: normalizeSocialUrl(row.url),
          }));

        let payload: UpdateMeWithCandidatePayload;

        if (hasEmployeeProfile) {
          payload = {
            name: fullName || undefined,
            notificationPreferences: notificationPrefs,
            phoneNumber: (phoneNumber || "").replace(/\D/g, ""),
            countryCode: countryCode || undefined,
            shortBio: shortBio || undefined,
            degree: degree || undefined,
            address: {
              streetAddress: address.streetAddress || undefined,
              streetAddress2: address.streetAddress2 || undefined,
              city: address.city || undefined,
              state: address.state || undefined,
              zipCode: address.zipCode || undefined,
              country: address.country || undefined,
            },
            qualifications: qualForSave && qualForSave.length > 0 ? qualForSave : undefined,
            experiences: expForSave && expForSave.length > 0 ? expForSave : undefined,
            documents: finalDocs,
            salarySlips: finalSalarySlips,
            socialLinks: socialPayload,
            skills: buildSkillsPayload(skillsForPayload),
          };
        } else {
          const staffDigits = staffPhone.replace(/\D/g, "");
          const candDigits = (candidate.phoneNumber ?? "").replace(/\D/g, "");
          payload = {
            name: fullName || undefined,
            notificationPreferences: notificationPrefs,
            phoneNumber: staffDigits || candDigits || undefined,
            countryCode: staffCountryCode || candidate.countryCode || undefined,
            shortBio: candidate.shortBio ?? undefined,
            sevisId: candidate.sevisId ?? undefined,
            ead: candidate.ead ?? undefined,
            visaType: candidate.visaType ?? undefined,
            customVisaType: candidate.customVisaType ?? undefined,
            degree: candidate.degree ?? undefined,
            supervisorName: candidate.supervisorName ?? undefined,
            supervisorContact: (candidate.supervisorContact ?? "").replace(/\D/g, "") || undefined,
            supervisorCountryCode: candidate.supervisorCountryCode ?? undefined,
            salaryRange: candidate.salaryRange ?? undefined,
            address: candidate.address
              ? {
                  streetAddress: candidate.address.streetAddress || undefined,
                  streetAddress2: candidate.address.streetAddress2 || undefined,
                  city: candidate.address.city || undefined,
                  state: candidate.address.state || undefined,
                  zipCode: candidate.address.zipCode || undefined,
                  country: candidate.address.country || undefined,
                }
              : undefined,
            qualifications: candidate.qualifications?.length ? candidate.qualifications : undefined,
            experiences: candidate.experiences?.length ? candidate.experiences : undefined,
            documents: finalDocs,
            salarySlips: finalSalarySlips,
            socialLinks: socialPayload,
            skills: buildSkillsPayload(skillsForPayload),
          };
        }

        const res = await authApi.updateMeWithCandidate(payload);
        setCandidate(res.candidate);
        const apiSkills = res.candidate?.skills;
        const mappedFromApi =
          Array.isArray(apiSkills) && apiSkills.length > 0 ? candidateSkillsToSkillRows(apiSkills) : [];
        setSkillsRows(mappedFromApi.length > 0 ? mappedFromApi : skillsForPayload);
        setDocumentsList([]);
        setSalarySlips([]);
        await refreshUser();
      } else if (!hasEmployeeProfile) {
        const digits = staffPhone.replace(/\D/g, "");
        const domainArr = staffDomain.split(",").map((s) => s.trim()).filter(Boolean);
        const staffPayload = {
          name: fullName || undefined,
          notificationPreferences: notificationPrefs,
          phoneNumber: digits || undefined,
          countryCode: staffCountryCode || undefined,
          location: staffLocation.trim() || undefined,
          profileSummary: staffProfileSummary.trim() || undefined,
          education: staffEducation.trim() || undefined,
          domain: domainArr,
        };
        if (hasAdminPrivileges) {
          await usersApi.updateUser(user.id, {
            ...staffPayload,
            email: trimmedEmail || undefined,
            username: staffUsernameForSave,
          });
        } else {
          await authApi.updateMyProfile(staffPayload);
        }
        await refreshUser();
      }
      await checkAuth();
      await Swal.fire({
        icon: "success",
        title: "Profile updated",
        text: "Your profile has been saved successfully.",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3200,
        timerProgressBar: true,
      });
    } catch (err) {
      const raw = extractApiErrorMessage(err);
      await showProfileSaveToast(
        "error",
        "Couldn't save profile",
        humanizeProfileValidationMessage(raw)
      );
    } finally {
      setSaveLoading(false);
    }
  };

  const handleAvatarUploaded = async (result: {
    url: string;
    key: string;
    originalName: string;
    size: number;
    mimeType: string;
  }) => {
    if (!user) return;
    setAvatarUploadLoading(true);
    try {
      const profilePicture = {
        url: result.url,
        key: result.key,
        originalName: result.originalName,
        size: result.size,
        mimeType: result.mimeType,
      };
      if (candidate && (hasEmployeeProfile || !hasAdminPrivileges)) {
        const res = await authApi.updateMeWithCandidate({ profilePicture });
        setCandidate(res.candidate);
        applyUser(res.user);
      } else {
        const updatedUser = await authApi.updateMyProfile({ profilePicture });
        applyUser(updatedUser);
      }
      setPendingAvatarPreview(null);
      await Swal.fire({
        icon: "success",
        title: "Photo updated",
        text: "Your profile picture has been saved.",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 2800,
        timerProgressBar: true,
      });
    } catch (err) {
      setPendingAvatarPreview(null);
      const msg = extractApiErrorMessage(err);
      await showProfileSaveToast(
        "error",
        "Upload failed",
        humanizeProfileValidationMessage(msg) || "Couldn't upload photo. Try again."
      );
    } finally {
      setAvatarUploadLoading(false);
    }
  };

  const handleAvatarRemove = async () => {
    if (!user) return;
    setAvatarRemoveLoading(true);
    try {
      if (candidate && (hasEmployeeProfile || !hasAdminPrivileges)) {
        const res = await authApi.updateMeWithCandidate({ profilePicture: null });
        setCandidate(res.candidate);
        applyUser(res.user);
      } else {
        const updatedUser = await authApi.updateMyProfile({ profilePicture: null });
        applyUser(updatedUser);
      }
      setPendingAvatarPreview(null);
      await Swal.fire({
        icon: "success",
        title: "Photo removed",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 2600,
        timerProgressBar: true,
      });
    } catch (err) {
      const msg = extractApiErrorMessage(err);
      await showProfileSaveToast(
        "error",
        "Couldn't remove photo",
        humanizeProfileValidationMessage(msg) || "Something went wrong. Try again."
      );
    } finally {
      setAvatarRemoveLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    const fullName = user.name ?? "";
    if (fullName) {
      const [first, ...rest] = fullName.split(" ");
      setFirstName(first ?? "");
      setLastName(rest.join(" "));
    } else {
      setFirstName("");
      setLastName("");
    }
    const emailVal = user.email ?? "";
    setEmail(emailVal);
    setUserName(user.username ?? emailVal);
    const prefs = (user as { notificationPreferences?: NotificationPreferences }).notificationPreferences;
    if (prefs && typeof prefs === "object") {
      setNotificationPrefs({
        leaveUpdates: prefs.leaveUpdates ?? true,
        taskAssignments: prefs.taskAssignments ?? true,
        applicationUpdates: prefs.applicationUpdates ?? true,
        offerUpdates: prefs.offerUpdates ?? true,
        meetingInvitations: prefs.meetingInvitations ?? true,
        meetingReminders: prefs.meetingReminders ?? true,
        certificates: prefs.certificates ?? true,
        courseUpdates: prefs.courseUpdates ?? true,
        recruiterUpdates: prefs.recruiterUpdates ?? true,
        placementUpdates: prefs.placementUpdates ?? true,
        placementUpdatesInApp: prefs.placementUpdatesInApp ?? true,
        chatMessagesInApp: prefs.chatMessagesInApp ?? true,
        assignmentUpdatesInApp: prefs.assignmentUpdatesInApp ?? true,
        projectUpdatesInApp: prefs.projectUpdatesInApp ?? true,
        sopAssignmentsInApp: prefs.sopAssignmentsInApp ?? true,
      });
    }

    if (!hasEmployeeProfile) {
      const u = user as Record<string, unknown>;
      const rawPhone = typeof u.phoneNumber === "string" ? u.phoneNumber : "";
      const hint = typeof u.countryCode === "string" && u.countryCode ? u.countryCode : null;
      const parsed = parseStoredPhone(rawPhone, hint);
      setStaffPhone(parsed.digits);
      setStaffCountryCode(parsed.countryCode);
      setStaffLocation(typeof u.location === "string" ? u.location : "");
      setStaffProfileSummary(typeof u.profileSummary === "string" ? u.profileSummary : "");
      setStaffEducation(typeof u.education === "string" ? u.education : "");
      const dom = u.domain;
      setStaffDomain(Array.isArray(dom) ? dom.map((x) => String(x)).join(", ") : "");
    }
  }, [user, hasEmployeeProfile]);

  // ── Wizard branch ─────────────────────────────────────────────────
  // Users who resolve to a person profile (Employee or Candidate persona) get the
  // wizard as their Personal Information page; each role has its own flow. Staff
  // accounts without a person profile fall through to the implementation below.
  if (candidateRoleLoading || hasEmployeeProfile) {
    const { mode: wizardMode, role: wizardRole } =
      resolveSelfServiceWizardTarget(roleNames);

    return (
      <Fragment>
        <Seo title="Personal Information" />
        <div className="sm:p-4 p-4">
          <div className="box overflow-hidden">
            <div className="box-body !p-0">
              {candidateRoleLoading ? (
                <div className="p-6 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                </div>
              ) : (
                <EmployeeProfileWizard
                  mode={wizardMode}
                  role={wizardRole}
                  submitLabel="Save profile"
                  onSubmitSuccess={async (result) => {
                    // Wizard saves via PATCH /auth/me/with-candidate; refresh
                    // auth state so the header name and avatar follow.
                    const next = result.candidate as unknown as CandidateWithProfile | undefined;
                    if (next) setCandidate(next);
                    await refreshUser();
                    await checkAuth();
                    await Swal.fire({
                      icon: "success",
                      title: "Profile updated",
                      toast: true,
                      position: "top-end",
                      showConfirmButton: false,
                      timer: 2800,
                      timerProgressBar: true,
                    });
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </Fragment>
    );
  }

  return (
    <Fragment>
      <Seo title="Personal Information" />
      <div className="sm:p-4 p-4 space-y-4">

        {/* ── Compact profile header ── */}
        <div className="box overflow-hidden">
          <div className="box-body !p-0">
            <div className="flex flex-wrap items-center gap-4 px-4 py-4">
              <div className="shrink-0 relative">
                {pendingAvatarPreview || user?.profilePicture?.url ? (
                  <img
                    src={pendingAvatarPreview ?? user?.profilePicture?.url}
                    alt=""
                    className="w-14 h-14 rounded-full object-cover ring-2 ring-defaultborder dark:ring-white/10"
                  />
                ) : (
                  <span className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[1.3rem]">
                    {(user?.name ?? user?.email ?? "?").charAt(0).toUpperCase()}
                  </span>
                )}
                {avatarUploaderBusy || avatarUploadLoading || avatarRemoveLoading ? (
                  <div
                    className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white pointer-events-none"
                    aria-hidden="true"
                  >
                    <i className="ri-loader-4-line text-xl animate-spin" />
                  </div>
                ) : null}
              </div>
              <div className="flex-1 min-w-0">
                <h6 className="font-semibold text-[0.9375rem] mb-0 leading-tight">{user?.name ?? user?.email ?? "—"}</h6>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="badge bg-primary/10 text-primary text-[0.65rem] font-medium px-2 py-0.5 rounded-full">{roleDisplayName}</span>
                  {user?.email && <span className="text-[0.7rem] text-[#8c9097] dark:text-white/50 flex items-center gap-1"><i className="ri-mail-line" />{user.email}</span>}
                  {user?.username && user.username !== user.email && <span className="text-[0.7rem] text-[#8c9097] dark:text-white/50 flex items-center gap-1"><i className="ri-at-line" />{user.username}</span>}
                  {hasEmployeeProfile && candidate?.companyAssignedEmail && String(candidate.companyAssignedEmail).trim() && (
                    <span className="text-[0.7rem] text-[#8c9097] dark:text-white/50 flex items-center gap-1" title="Company work email — assigned by admin">
                      <i className="ri-building-line" />{String(candidate.companyAssignedEmail).trim()}
                    </span>
                  )}
                </div>
              </div>
              <ProfilePhotoUploader
                variant="compact"
                showPreview={false}
                previewUrl={user?.profilePicture?.url ?? ""}
                disabled={!user || avatarUploadLoading || avatarRemoveLoading}
                uploadOnApply
                uploadSavingLabel="Saving to profile…"
                onPreviewChange={setPendingAvatarPreview}
                onUploadingChange={setAvatarUploaderBusy}
                onUploaded={handleAvatarUploaded}
                onRemove={handleAvatarRemove}
              />
            </div>
          </div>
        </div>

        {/* ── Account fields (name, username, email) ── */}
        <div className="box overflow-hidden">
          <div className="box-header px-4 py-2 border-b border-dashed dark:border-defaultborder/10">
            <h6 className="font-medium mb-0 text-[0.875rem]">Account</h6>
          </div>
          <div className="box-body px-4 py-3">
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-12 sm:col-span-6">
                <label htmlFor="first-name" className="form-label !text-xs !mb-1">
                  <span className="text-danger me-0.5" aria-hidden>*</span>First Name
                </label>
                <input type="text" className="form-control w-full !rounded-md" id="first-name" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div className="col-span-12 sm:col-span-6">
                <label htmlFor="last-name" className="form-label !text-xs !mb-1">Last Name</label>
                <input type="text" className="form-control w-full !rounded-md" id="last-name" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
              <div className="col-span-12 sm:col-span-6">
                <label className="form-label !text-xs !mb-1">
                  {canEditUsernameOnPage ? <span className="text-danger me-0.5" aria-hidden>*</span> : null}Username
                </label>
                <input
                  type="text"
                  className={`form-control w-full !rounded-md ${canEditUsernameOnPage ? "" : "!bg-gray-100 dark:!bg-black/20"}`}
                  id={canEditUsernameOnPage ? "username" : "username-readonly"}
                  value={userName}
                  readOnly={!canEditUsernameOnPage}
                  onChange={canEditUsernameOnPage ? (e) => setUserName(e.target.value) : undefined}
                  title={canEditUsernameOnPage ? undefined : "Only an administrator can change your username (via Settings → Users → Edit)"}
                />
                <p className="text-[0.7rem] text-defaulttextcolor/60 mt-0.5 mb-0">
                  {canEditUsernameOnPage ? "Must be unique." : "Only an admin can change this."}
                </p>
              </div>
              <div className="col-span-12 sm:col-span-6">
                <label htmlFor="email-address" className="form-label !text-xs !mb-1">
                  {hasAdminPrivileges ? <span className="text-danger me-0.5" aria-hidden>*</span> : null}Email Address
                </label>
                <input
                  type="email"
                  className="form-control w-full !rounded-md"
                  id="email-address"
                  placeholder="xyz@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  readOnly={!hasAdminPrivileges}
                  title={!hasAdminPrivileges ? "Only an administrator can change your email address" : undefined}
                />
                {!hasAdminPrivileges && <p className="text-[0.7rem] text-defaulttextcolor/60 mt-0.5 mb-0">Only an admin can change this.</p>}
              </div>
            </div>
          </div>
        </div>

        {!hasEmployeeProfile && !candidateRoleLoading && (
          <div className="box overflow-hidden">
            <div className="box-header px-4 py-2 border-b border-dashed dark:border-defaultborder/10">
              <h6 className="font-medium mb-0 text-[0.875rem]">Contact &amp; professional details</h6>
            </div>
            <div className="box-body px-4 py-3 sm:grid grid-cols-12 gap-3">
              <p className="col-span-12 text-[0.75rem] text-defaulttextcolor/70 mb-0 -mt-1">
                These fields are stored on your user account (not the ATS candidate record). Use them to keep your contact info and a short bio up to date.
              </p>
              <div className="col-span-12 sm:col-span-4">
                <label className="form-label">Country</label>
                <PhoneCountrySelect value={staffCountryCode} onChange={setStaffCountryCode} className="w-full" />
              </div>
              <div className="col-span-12 sm:col-span-8">
                <label htmlFor="staff-phone" className="form-label">
                  Phone
                </label>
                <input
                  id="staff-phone"
                  type="tel"
                  className="form-control w-full !rounded-md"
                  placeholder="Digits only (optional)"
                  value={staffPhone}
                  onChange={(e) => setStaffPhone(e.target.value)}
                  autoComplete="tel"
                />
              </div>
              <div className="col-span-12">
                <label htmlFor="staff-location" className="form-label">
                  Location / city
                </label>
                <input
                  id="staff-location"
                  type="text"
                  className="form-control w-full !rounded-md"
                  placeholder="e.g. Bangalore, India"
                  value={staffLocation}
                  onChange={(e) => setStaffLocation(e.target.value)}
                />
              </div>
              <div className="col-span-12">
                <label htmlFor="staff-profile-summary" className="form-label">
                  About you
                </label>
                <textarea
                  id="staff-profile-summary"
                  className="form-control w-full !rounded-md"
                  rows={3}
                  placeholder="Short professional summary (optional)"
                  value={staffProfileSummary}
                  onChange={(e) => setStaffProfileSummary(e.target.value)}
                />
              </div>
              <div className="col-span-12 sm:col-span-6">
                <label htmlFor="staff-education" className="form-label">
                  Education
                </label>
                <input
                  id="staff-education"
                  type="text"
                  className="form-control w-full !rounded-md"
                  placeholder="e.g. M.Sc. Computer Science"
                  value={staffEducation}
                  onChange={(e) => setStaffEducation(e.target.value)}
                />
              </div>
              <div className="col-span-12 sm:col-span-6">
                <label htmlFor="staff-domain" className="form-label">
                  Domains / skills
                </label>
                <input
                  id="staff-domain"
                  type="text"
                  className="form-control w-full !rounded-md"
                  placeholder="Comma-separated, e.g. React, HR, Sales"
                  value={staffDomain}
                  onChange={(e) => setStaffDomain(e.target.value)}
                />
                <p className="text-[0.75rem] text-defaulttextcolor/70 mt-1 mb-0">Stored as tags on your profile.</p>
              </div>
            </div>
          </div>
        )}

        {/* Candidate profile */}
        {hasEmployeeProfile && !candidateRoleLoading && (
          <div className="space-y-3">

            {/* Contact & address */}
            <div className="box overflow-hidden">
              <div className="box-header px-4 py-2 border-b border-dashed dark:border-defaultborder/10">
                <h6 className="font-medium mb-0 text-[0.875rem]">Contact &amp; address</h6>
              </div>
              <div className="box-body px-4 py-3 sm:grid grid-cols-12 gap-3">
                <div className="col-span-12 sm:col-span-6">
                  <label className="form-label">Phone <span className="text-danger">*</span></label>
                  <div className="flex gap-2">
                    <PhoneCountrySelect value={countryCode} onChange={setCountryCode} />
                    <input
                      type="tel"
                      className="form-control flex-1 min-w-0 !rounded-md"
                      placeholder="Phone number"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-span-12 sm:col-span-6">
                  <label className="form-label">Short bio</label>
                  <textarea
                    className="form-control w-full !rounded-md"
                    rows={2}
                    placeholder="Brief bio"
                    value={shortBio}
                    onChange={(e) => setShortBio(e.target.value)}
                  />
                </div>
                <div className="col-span-12">
                  <label className="form-label">Street address</label>
                  <input
                    type="text"
                    className="form-control w-full !rounded-md"
                    placeholder="Street address"
                    value={address.streetAddress}
                    onChange={(e) => setAddress((a) => ({ ...a, streetAddress: e.target.value }))}
                  />
                </div>
                <div className="col-span-12 sm:col-span-4">
                  <label className="form-label">City</label>
                  <input
                    type="text"
                    className="form-control w-full !rounded-md"
                    placeholder="City"
                    value={address.city}
                    onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
                  />
                </div>
                <div className="col-span-12 sm:col-span-4">
                  <label className="form-label">State</label>
                  <input
                    type="text"
                    className="form-control w-full !rounded-md"
                    placeholder="State"
                    value={address.state}
                    onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value }))}
                  />
                </div>
                <div className="col-span-12 sm:col-span-4">
                  <label className="form-label">ZIP / Postal code</label>
                  <input
                    type="text"
                    className="form-control w-full !rounded-md"
                    placeholder="ZIP"
                    value={address.zipCode}
                    onChange={(e) => setAddress((a) => ({ ...a, zipCode: e.target.value }))}
                  />
                </div>
                <div className="col-span-12 sm:col-span-6">
                  <label className="form-label">Country</label>
                  <select
                    className="form-control w-full !rounded-md"
                    value={address.country}
                    onChange={(e) => setAddress((a) => ({ ...a, country: e.target.value }))}
                  >
                    <option value="">Select Country</option>
                    <option value="United States">United States</option>
                    <option value="Canada">Canada</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Australia">Australia</option>
                    <option value="Germany">Germany</option>
                    <option value="France">France</option>
                    <option value="India">India</option>
                    <option value="China">China</option>
                    <option value="Japan">Japan</option>
                    <option value="Brazil">Brazil</option>
                    <option value="Mexico">Mexico</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Immigration / visa */}
            <div className="box overflow-hidden">
              <div className="box-header px-4 py-2 border-b border-dashed dark:border-defaultborder/10">
                <h6 className="font-medium mb-0 text-[0.875rem]">Immigration / visa</h6>
              </div>
              <div className="box-body px-4 py-3 sm:grid grid-cols-12 gap-3">
                <div className="col-span-12 sm:col-span-6">
                  <label className="form-label">SEVIS ID</label>
                  <input
                    type="text"
                    className={`form-control w-full !rounded-md ${hrOwnedReadOnly ? "!bg-gray-100 dark:!bg-black/20" : ""}`}
                    value={sevisId}
                    readOnly={hrOwnedReadOnly}
                    onChange={hrOwnedReadOnly ? undefined : (e) => setSevisId(e.target.value)}
                    title={hrOwnedReadOnly ? hrOwnedHint : undefined}
                  />
                  {hrOwnedReadOnly ? (
                    <p className="text-[0.7rem] text-defaulttextcolor/60 mt-0.5 mb-0">{hrOwnedHint}</p>
                  ) : null}
                </div>
                <div className="col-span-12 sm:col-span-6">
                  <label className="form-label">EAD</label>
                  <input
                    type="text"
                    className={`form-control w-full !rounded-md ${hrOwnedReadOnly ? "!bg-gray-100 dark:!bg-black/20" : ""}`}
                    value={ead}
                    readOnly={hrOwnedReadOnly}
                    onChange={hrOwnedReadOnly ? undefined : (e) => setEad(e.target.value)}
                    title={hrOwnedReadOnly ? hrOwnedHint : undefined}
                  />
                  {hrOwnedReadOnly ? (
                    <p className="text-[0.7rem] text-defaulttextcolor/60 mt-0.5 mb-0">{hrOwnedHint}</p>
                  ) : null}
                </div>
                <div className="col-span-12 sm:col-span-6">
                  <label className="form-label">Visa type</label>
                  <select
                    className={`form-control w-full !rounded-md ${hrOwnedReadOnly ? "!bg-gray-100 dark:!bg-black/20" : ""}`}
                    value={visaType}
                    disabled={hrOwnedReadOnly}
                    onChange={hrOwnedReadOnly ? undefined : (e) => setVisaType(e.target.value)}
                    title={hrOwnedReadOnly ? hrOwnedHint : undefined}
                  >
                    <option value="">Select Visa Type</option>
                    <option value="F-1">F-1 (Student Visa)</option>
                    <option value="J-1">J-1 (Exchange Visitor)</option>
                    <option value="H-1B">H-1B (Specialty Occupation)</option>
                    <option value="H-2B">H-2B (Temporary Non-Agricultural Worker)</option>
                    <option value="L-1">L-1 (Intracompany Transferee)</option>
                    <option value="O-1">O-1 (Extraordinary Ability)</option>
                    <option value="P-1">P-1 (Athlete/Entertainer)</option>
                    <option value="R-1">R-1 (Religious Worker)</option>
                    <option value="TN">TN (NAFTA Professional)</option>
                    <option value="E-1">E-1 (Treaty Trader)</option>
                    <option value="E-2">E-2 (Treaty Investor)</option>
                    <option value="E-3">E-3 (Australian Professional)</option>
                    <option value="B-1">B-1 (Business Visitor)</option>
                    <option value="B-2">B-2 (Tourist)</option>
                    <option value="Other">Other</option>
                  </select>
                  {hrOwnedReadOnly ? (
                    <p className="text-[0.7rem] text-defaulttextcolor/60 mt-0.5 mb-0">{hrOwnedHint}</p>
                  ) : null}
                </div>
                {visaType === "Other" && (
                  <div className="col-span-12 sm:col-span-6">
                    <label className="form-label">Custom visa type</label>
                    <input
                      type="text"
                      className={`form-control w-full !rounded-md ${hrOwnedReadOnly ? "!bg-gray-100 dark:!bg-black/20" : ""}`}
                      placeholder="Enter visa type"
                      value={customVisaType}
                      readOnly={hrOwnedReadOnly}
                      onChange={hrOwnedReadOnly ? undefined : (e) => setCustomVisaType(e.target.value)}
                      title={hrOwnedReadOnly ? hrOwnedHint : undefined}
                    />
                  </div>
                )}
                <div className="col-span-12 sm:col-span-6">
                  <label className="form-label">Degree</label>
                  <input
                    type="text"
                    className="form-control w-full !rounded-md"
                    value={degree}
                    onChange={(e) => setDegree(e.target.value)}
                  />
                </div>
                <div className="col-span-12 sm:col-span-6">
                  <label className="form-label">Supervisor name</label>
                  <input
                    type="text"
                    className={`form-control w-full !rounded-md ${hrOwnedReadOnly ? "!bg-gray-100 dark:!bg-black/20" : ""}`}
                    value={supervisorName}
                    readOnly={hrOwnedReadOnly}
                    onChange={hrOwnedReadOnly ? undefined : (e) => setSupervisorName(e.target.value)}
                    title={hrOwnedReadOnly ? hrOwnedHint : undefined}
                  />
                  {hrOwnedReadOnly ? (
                    <p className="text-[0.7rem] text-defaulttextcolor/60 mt-0.5 mb-0">{hrOwnedHint}</p>
                  ) : null}
                </div>
                <div className="col-span-12 sm:col-span-6">
                  <label className="form-label">Supervisor contact</label>
                  <input
                    type="tel"
                    className={`form-control w-full !rounded-md ${hrOwnedReadOnly ? "!bg-gray-100 dark:!bg-black/20" : ""}`}
                    value={supervisorContact}
                    readOnly={hrOwnedReadOnly}
                    onChange={hrOwnedReadOnly ? undefined : (e) => setSupervisorContact(e.target.value)}
                    title={hrOwnedReadOnly ? hrOwnedHint : undefined}
                  />
                </div>
                <div className="col-span-12 sm:col-span-6">
                  <label className="form-label">Salary range</label>
                  <select
                    className={`form-control w-full !rounded-md ${hrOwnedReadOnly ? "!bg-gray-100 dark:!bg-black/20" : ""}`}
                    value={salaryRange}
                    disabled={hrOwnedReadOnly}
                    onChange={hrOwnedReadOnly ? undefined : (e) => setSalaryRange(e.target.value)}
                    title={hrOwnedReadOnly ? hrOwnedHint : undefined}
                  >
                    <option value="">Select Salary Range</option>
                    <option value="Under $5,000">Under $5,000</option>
                    <option value="$5,000 - $10,000">$5,000 - $10,000</option>
                    <option value="$10,000 - $15,000">$10,000 - $15,000</option>
                    <option value="$15,000 - $20,000">$15,000 - $20,000</option>
                    <option value="$20,000 - $30,000">$20,000 - $30,000</option>
                    <option value="$30,000 - $50,000">$30,000 - $50,000</option>
                    <option value="$50,000 - $70,000">$50,000 - $70,000</option>
                    <option value="$70,000 - $90,000">$70,000 - $90,000</option>
                    <option value="$90,000 - $110,000">$90,000 - $110,000</option>
                    <option value="$110,000 - $130,000">$110,000 - $130,000</option>
                    <option value="$130,000 - $150,000">$130,000 - $150,000</option>
                    <option value="$150,000 - $200,000">$150,000 - $200,000</option>
                    <option value="$200,000 - $250,000">$200,000 - $250,000</option>
                    <option value="$250,000 - $300,000">$250,000 - $300,000</option>
                    <option value="$300,000 - $400,000">$300,000 - $400,000</option>
                    <option value="$400,000+">$400,000+</option>
                    <option value="Prefer not to disclose">Prefer not to disclose</option>
                  </select>
                  {hrOwnedReadOnly ? (
                    <p className="text-[0.7rem] text-defaulttextcolor/60 mt-0.5 mb-0">{hrOwnedHint}</p>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Qualifications */}
            <div className="box overflow-hidden">
              <div className="box-header px-4 py-2 border-b border-dashed dark:border-defaultborder/10 flex items-center gap-2">
                <h6 className="font-medium mb-0 text-[0.875rem]">Qualifications</h6>
                <span className="text-[0.7rem] text-defaulttextcolor/60">Fields marked <span className="text-danger">*</span> required per row</span>
              </div>
              <div className="box-body px-4 py-3 space-y-3">
                {qualifications.map((q, i) => (
                  <div key={i} className="p-3 border border-defaultborder rounded-md bg-gray-50/50 dark:bg-gray-800/30 sm:grid grid-cols-12 gap-3">
                    <div className="col-span-12 sm:col-span-6">
                      <label className="form-label text-xs mb-1">
                        <span className="text-danger me-0.5" aria-hidden>
                          *
                        </span>
                        Degree
                      </label>
                      <input
                        type="text"
                        className="form-control !rounded-md"
                        placeholder="e.g. B.Sc Computer Science"
                        value={q.degree}
                        onChange={(e) => setQualifications((arr) => arr.map((x, j) => (j === i ? { ...x, degree: e.target.value } : x)))}
                      />
                    </div>
                    <div className="col-span-12 sm:col-span-6">
                      <label className="form-label text-xs mb-1">
                        <span className="text-danger me-0.5" aria-hidden>
                          *
                        </span>
                        Institute
                      </label>
                      <input
                        type="text"
                        className="form-control !rounded-md"
                        placeholder="School or university"
                        value={q.institute}
                        onChange={(e) => setQualifications((arr) => arr.map((x, j) => (j === i ? { ...x, institute: e.target.value } : x)))}
                      />
                    </div>
                    <div className="col-span-12 sm:col-span-4">
                      <input
                        type="text"
                        className="form-control !rounded-md"
                        placeholder="Location"
                        value={q.location ?? ""}
                        onChange={(e) => setQualifications((arr) => arr.map((x, j) => (j === i ? { ...x, location: e.target.value } : x)))}
                      />
                    </div>
                    <div className="col-span-6 sm:col-span-2">
                      <label className="form-label text-xs">Start year</label>
                      <select
                        className="form-control !rounded-md"
                        value={q.startYear ?? ""}
                        onChange={(e) => setQualifications((arr) => arr.map((x, j) => (j === i ? { ...x, startYear: e.target.value ? Number(e.target.value) : undefined } : x)))}
                      >
                        <option value="">Select</option>
                        {Array.from({ length: new Date().getFullYear() - 2000 + 1 }, (_, k) => new Date().getFullYear() - k).map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-6 sm:col-span-2">
                      <label className="form-label text-xs">End year</label>
                      <select
                        className="form-control !rounded-md"
                        value={q.endYear ?? ""}
                        onChange={(e) => setQualifications((arr) => arr.map((x, j) => (j === i ? { ...x, endYear: e.target.value ? Number(e.target.value) : undefined } : x)))}
                      >
                        <option value="">Select</option>
                        {Array.from({ length: new Date().getFullYear() - 2000 + 1 }, (_, k) => new Date().getFullYear() - k).map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-12">
                      <input
                        type="text"
                        className="form-control !rounded-md"
                        placeholder="Description"
                        value={q.description ?? ""}
                        onChange={(e) => setQualifications((arr) => arr.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))}
                      />
                    </div>
                    <div className="col-span-12 flex justify-end pt-1 mt-1 border-t border-defaultborder dark:border-white/10">
                      <button
                        type="button"
                        className="ti-btn ti-btn-soft-danger ti-btn-sm inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 !w-auto !h-auto !py-1.5 !px-3"
                        onClick={() => setQualifications((arr) => arr.filter((_, j) => j !== i))}
                        aria-label="Remove this qualification"
                      >
                        <i className="ri-delete-bin-line text-[1rem] leading-none" aria-hidden />
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
                <button type="button" className="ti-btn ti-btn-primary ti-btn-sm whitespace-nowrap !w-auto !h-auto !py-1.5 !px-3" onClick={() => setQualifications((arr) => [...arr, { degree: "", institute: "" }])}>
                  <i className="ri-add-line me-1 align-middle" />
                  Add qualification
                </button>
              </div>
            </div>

            {/* Work experience */}
            <div className="box overflow-hidden">
              <div className="box-header px-4 py-2 border-b border-dashed dark:border-defaultborder/10 flex items-center gap-2">
                <h6 className="font-medium mb-0 text-[0.875rem]">Work experience</h6>
                <span className="text-[0.7rem] text-defaulttextcolor/60">Fields marked <span className="text-danger">*</span> required per entry</span>
              </div>
              <div className="box-body px-4 py-3 space-y-3">
                {experiences.map((exp, i) => (
                  <div key={i} className="p-3 border border-defaultborder rounded-md bg-gray-50/50 dark:bg-gray-800/30 sm:grid grid-cols-12 gap-3">
                    <div className="col-span-12 sm:col-span-6">
                      <label className="form-label text-xs mb-1">
                        <span className="text-danger me-0.5" aria-hidden>
                          *
                        </span>
                        Company
                      </label>
                      <input
                        type="text"
                        className="form-control !rounded-md"
                        placeholder="Company name"
                        value={exp.company}
                        onChange={(e) => setExperiences((arr) => arr.map((x, j) => (j === i ? { ...x, company: e.target.value } : x)))}
                      />
                    </div>
                    <div className="col-span-12 sm:col-span-6">
                      <label className="form-label text-xs mb-1">
                        <span className="text-danger me-0.5" aria-hidden>
                          *
                        </span>
                        Role
                      </label>
                      <input
                        type="text"
                        className="form-control !rounded-md"
                        placeholder="Job title / role"
                        value={exp.role}
                        onChange={(e) => setExperiences((arr) => arr.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)))}
                      />
                    </div>
                    <div className="col-span-6 sm:col-span-3">
                      <input
                        type="date"
                        className="form-control !rounded-md"
                        placeholder="Start"
                        value={exp.startDate ? (exp.startDate as string).slice(0, 10) : ""}
                        onChange={(e) => setExperiences((arr) => arr.map((x, j) => (j === i ? { ...x, startDate: e.target.value || undefined } : x)))}
                      />
                    </div>
                    <div className="col-span-6 sm:col-span-3">
                      <input
                        type="date"
                        className="form-control !rounded-md"
                        placeholder="End"
                        value={exp.endDate ? (exp.endDate as string).slice(0, 10) : ""}
                        onChange={(e) => setExperiences((arr) => arr.map((x, j) => (j === i ? { ...x, endDate: e.target.value || undefined } : x)))}
                      />
                    </div>
                    <div className="col-span-12">
                      <input
                        type="text"
                        className="form-control !rounded-md"
                        placeholder="Description"
                        value={exp.description ?? ""}
                        onChange={(e) => setExperiences((arr) => arr.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))}
                      />
                    </div>
                    <div className="col-span-12 flex justify-end pt-1 mt-1 border-t border-defaultborder dark:border-white/10">
                      <button
                        type="button"
                        className="ti-btn ti-btn-soft-danger ti-btn-sm inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 !w-auto !h-auto !py-1.5 !px-3"
                        onClick={() => setExperiences((arr) => arr.filter((_, j) => j !== i))}
                        aria-label="Remove this work experience"
                      >
                        <i className="ri-delete-bin-line text-[1rem] leading-none" aria-hidden />
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
                <button type="button" className="ti-btn ti-btn-primary ti-btn-sm whitespace-nowrap !w-auto !h-auto !py-1.5 !px-3" onClick={() => setExperiences((arr) => [...arr, { company: "", role: "" }])}>
                  <i className="ri-add-line me-1 align-middle" />
                  Add experience
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Social links, documents & salary slips: all non-administrators (staff with linked candidate included); hidden for Administrator */}
        {!hasAdminPrivileges && !candidateRoleLoading && (
          <div className="space-y-3">
            {!candidate && (
              <p className="text-[0.875rem] text-defaulttextcolor/80 mb-0">
                When your account is linked to a candidate record, you can add social links and upload documents here. If uploads are disabled, no candidate profile is linked yet—contact your administrator.
              </p>
            )}

            {/* Social links */}
            <div className="box overflow-hidden">
              <div className="box-header px-4 py-2 border-b border-dashed dark:border-defaultborder/10 flex items-center justify-between">
                <h6 className="font-medium mb-0 text-[0.875rem]">Social links</h6>
                <button
                  type="button"
                  className="ti-btn ti-btn-primary ti-btn-sm whitespace-nowrap !w-auto !h-auto !py-1 !px-2"
                  onClick={() => setSocialLinkRows((arr) => [...arr, { id: Date.now(), platform: "", url: "" }])}
                  disabled={!candidate}
                >
                  <i className="ri-add-line me-1 align-middle" />
                  Add link
                </button>
              </div>
              <div className="box-body px-4 py-4 space-y-4">
                <p className="text-defaulttextcolor/70 text-sm mb-0">
                  Optional. Each added link must have both Platform and URL (fields marked <span className="text-danger">*</span> when you use a row).
                  Shown on My Profile when saved.
                </p>
                {socialLinkRows.map((row, i) => (
                  <div key={row.id} className="p-3 border border-defaultborder rounded-md sm:grid grid-cols-12 gap-3 relative">
                    <button
                      type="button"
                      className="absolute top-2 end-2 ti-btn ti-btn-soft-danger ti-btn-sm !p-1 !min-h-0"
                      aria-label="Remove link"
                      onClick={() => setSocialLinkRows((arr) => arr.filter((r) => r.id !== row.id))}
                      disabled={!candidate}
                    >
                      <i className="ri-close-line" />
                    </button>
                    <div className="col-span-12 sm:col-span-5">
                      <label className="form-label text-xs">
                        <span className="text-danger me-0.5" aria-hidden>
                          *
                        </span>
                        Platform
                      </label>
                      <select
                        className="form-control !rounded-md"
                        value={row.platform}
                        disabled={!candidate}
                        onChange={(e) =>
                          setSocialLinkRows((arr) => arr.map((r, j) => (j === i ? { ...r, platform: e.target.value } : r)))
                        }
                      >
                        <option value="">Select</option>
                        {SOCIAL_PLATFORMS.map((platform) => (
                          <option key={platform} value={platform}>
                            {platform}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-12 sm:col-span-7">
                      <label className="form-label text-xs">
                        <span className="text-danger me-0.5" aria-hidden>
                          *
                        </span>
                        URL
                      </label>
                      <input
                        type="text"
                        className={`form-control !rounded-md ${
                          row.url && getSocialLinkUrlError(row.platform, row.url) ? "border-danger" : ""
                        }`}
                        placeholder="github.com/username"
                        value={row.url}
                        disabled={!candidate}
                        inputMode="url"
                        onChange={(e) =>
                          setSocialLinkRows((arr) => arr.map((r, j) => (j === i ? { ...r, url: e.target.value } : r)))
                        }
                      />
                      {row.url && getSocialLinkUrlError(row.platform, row.url) ? (
                        <div className="text-danger text-xs mt-1" role="alert">
                          {getSocialLinkUrlError(row.platform, row.url)}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
                {socialLinkRows.length === 0 && (
                  <p className="text-defaulttextcolor/70 text-sm mb-0">No links yet. Use &quot;Add link&quot; to add LinkedIn, GitHub, portfolio, etc.</p>
                )}
              </div>
            </div>

            {/* Documents */}
            <div className="box overflow-hidden">
              <div className="box-header px-4 py-2 border-b border-dashed dark:border-defaultborder/10 flex items-center justify-between">
                <h6 className="font-medium mb-0 text-[0.875rem]">Documents</h6>
                <button
                  type="button"
                  className="ti-btn ti-btn-primary ti-btn-sm whitespace-nowrap !w-auto !h-auto !py-1 !px-2"
                  onClick={() => setDocumentsList((arr) => [...arr, { id: Date.now(), name: "", customName: "", file: null }])}
                  disabled={!candidate}
                >
                  <i className="ri-add-line me-1 align-middle" />
                  Add document
                </button>
              </div>
              <div className="box-body px-4 py-4 space-y-4">
                {existingDocs.length > 0 && (
                  <div>
                    <h6 className="text-sm font-semibold mb-3 text-defaulttextcolor">Existing documents</h6>
                    {existingDocs.map((doc, i) => (
                      <div key={i} className="relative p-3 border border-defaultborder rounded-md bg-gray-50/50 dark:bg-gray-800/30 mb-3 flex flex-col gap-3">
                        <span className="text-sm">{doc.label || doc.type || "Document"}</span>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            className="ti-btn ti-btn-primary ti-btn-sm !py-1.5 !px-3 !min-w-[5.5rem]"
                            onClick={async () => {
                              const cid = candidate?.id ?? candidate?._id;
                              if (!cid) return;
                              try {
                                const { url } = await getDocumentDownloadUrl(cid, i);
                                window.open(url, "_blank");
                              } catch {
                                Swal.fire("Error", "Could not open document.", "error");
                              }
                            }}
                          >
                            <i className="ri-external-link-line me-1 align-middle" />
                            View
                          </button>
                          <button
                            type="button"
                            className="ti-btn ti-btn-soft-danger ti-btn-sm !py-1.5 !px-3 !min-w-[5.5rem]"
                            onClick={() => setExistingDocs((arr) => arr.filter((_, j) => j !== i))}
                            disabled={!candidate}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {documentsList.map((doc, i) => (
                  <div key={doc.id} className="p-3 border border-defaultborder rounded-md grid grid-cols-12 gap-3 items-start">
                    <div
                      className={`col-span-12 ${
                        doc.name === "Other" ? "sm:col-span-4" : "sm:col-span-6"
                      } flex flex-col`}
                    >
                      <label className="form-label text-xs !mb-1">Type</label>
                      <select
                        className="form-control !rounded-md h-11"
                        value={doc.name}
                        disabled={!candidate}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDocumentsList((arr) =>
                            arr.map((d, j) =>
                              j === i
                                ? { ...d, name: val, customName: val !== "Other" ? "" : d.customName }
                                : d
                            )
                          );
                        }}
                      >
                        <option value="">Select</option>
                        <optgroup label="Identity / KYC">
                          <option value="Aadhar">Aadhar</option>
                          <option value="PAN">PAN</option>
                          <option value="Bank">Bank</option>
                          <option value="Passport">Passport</option>
                        </optgroup>
                        <optgroup label="Application">
                          <option value="CV/Resume">CV/Resume</option>
                          <option value="Marksheet">Marksheet</option>
                          <option value="Degree Certificate">Degree Certificate</option>
                          <option value="Experience Letter">Experience Letter</option>
                          <option value="Offer Letter">Offer Letter</option>
                          <option value="Visa">Visa</option>
                          <option value="EAD Card">EAD Card</option>
                          <option value="I-765 Receipt">I-765 Receipt</option>
                          <option value="I-983 Form-only">I-983 Form-only</option>
                        </optgroup>
                        <option value="Other">Other</option>
                      </select>
                      <div className="mt-1 min-h-4 text-xs opacity-0 select-none" aria-hidden="true">
                        helper
                      </div>
                    </div>
                    {doc.name === "Other" && (
                      <div className="col-span-12 sm:col-span-4 flex flex-col">
                        <label className="form-label text-xs !mb-1">Label</label>
                        <input
                          type="text"
                          className="form-control !rounded-md h-11"
                          placeholder="Document name"
                          value={doc.customName}
                          disabled={!candidate}
                          onChange={(e) => setDocumentsList((arr) => arr.map((d, j) => (j === i ? { ...d, customName: e.target.value } : d)))}
                        />
                        <div className="mt-1 min-h-4 text-xs opacity-0 select-none" aria-hidden="true">
                          helper
                        </div>
                      </div>
                    )}
                    <div
                      className={`col-span-12 ${
                        doc.name === "Other" ? "sm:col-span-4" : "sm:col-span-6"
                      } flex flex-col`}
                    >
                      <label className="form-label text-xs !mb-1">File</label>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        className="form-control !rounded-md"
                        disabled={!candidate}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setDocumentsList((arr) => arr.map((d, j) => (j === i ? { ...d, file } : d)));
                        }}
                      />
                      <small className="mt-1 min-h-4 text-xs text-defaulttextcolor/70">
                        Supported formats: JPG, JPEG, PNG, PDF
                      </small>
                    </div>
                    <div className="col-span-12 sm:col-span-12 flex justify-end">
                      <button type="button" className="ti-btn ti-btn-soft-danger ti-btn-sm" onClick={() => setDocumentsList((arr) => arr.filter((d) => d.id !== doc.id))}>
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
                {existingDocs.length === 0 && documentsList.length === 0 && (
                  <p className="text-defaulttextcolor/70 text-sm mb-0">No documents. Click "Add document" to add a row, then select type and file.</p>
                )}
                {(documentsList.length > 0 || existingDocs.length > 0) && (
                  <p className="text-defaulttextcolor/70 text-sm mb-2">
                    {documentsList.some((d) => d.file && d.name) ? 'Click "Upload documents" below to save.' : "Add document rows above, select type and file, then click Upload."}
                  </p>
                )}
                {documentsList.some((d) => d.file && d.name) && (
                  <div className="flex shrink-0">
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      disabled={saveLoading || !user || !candidate}
                      className="ti-btn ti-btn-primary ti-btn-sm !py-2 !px-4 whitespace-nowrap shrink-0 inline-flex items-center justify-center !min-w-max"
                    >
                      {saveLoading ? "Uploading…" : "Upload documents"}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Skills */}
            <div className="box overflow-hidden">
              <div
                className="box-header px-4 py-2 border-b border-dashed dark:border-defaultborder/10 flex flex-wrap items-center justify-between gap-2 cursor-pointer select-none"
                onClick={() => setSkillsOpen((v) => !v)}
              >
                <div className="flex items-center gap-2">
                  <h6 className="font-medium mb-0 text-[0.875rem]">Skills</h6>
                  {skillsRows.length > 0 && (
                    <span className="badge bg-primary/10 text-primary text-[0.65rem] px-1.5 py-0.5 rounded-full">{skillsRows.length}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  {skillsOpen && (
                    <>
                      <input
                        ref={resumeExtractInputRef}
                        type="file"
                        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        className="hidden"
                        // Programmatic .click() dispatches a click that would bubble to the header's
                        // collapse toggle and close the section (unmounting this input). Stop it here.
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          e.stopPropagation();
                          const f = e.target.files?.[0];
                          void runResumeSkillExtract(f);
                          e.target.value = "";
                        }}
                      />
                      <button
                        type="button"
                        className="ti-btn ti-btn-soft-secondary ti-btn-sm whitespace-nowrap !w-auto !h-auto !py-1 !px-2.5 inline-flex items-center"
                        disabled={!candidate || extractSkillsLoading}
                        onClick={(e) => { e.stopPropagation(); resumeExtractInputRef.current?.click(); }}
                      >
                        {extractSkillsLoading ? (
                          <>
                            <span className="animate-spin inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full me-1 align-middle" />
                            Extracting…
                          </>
                        ) : (
                          <>
                            <i className="ri-magic-line me-1 align-middle inline-block" />
                            Extract from resume
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        className="ti-btn ti-btn-soft-primary ti-btn-sm whitespace-nowrap !w-auto !h-auto !py-1 !px-2.5 inline-flex items-center"
                        disabled={!candidate || extractSkillsLoading || skillRoleRecommendLoading}
                        onClick={(e) => { e.stopPropagation(); void runSkillRecommendationByRole(); }}
                      >
                        {skillRoleRecommendLoading ? (
                          <>
                            <span className="animate-spin inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full me-1 align-middle" />
                            Suggesting…
                          </>
                        ) : (
                          <>
                            <i className="ri-lightbulb-flash-line me-1 align-middle inline-block" />
                            Skill recommendation
                          </>
                        )}
                      </button>
                      {documentsList.some((d) => d.file && d.name === "CV/Resume") ? (
                        <button
                          type="button"
                          className="ti-btn ti-btn-soft-primary ti-btn-sm whitespace-nowrap !w-auto !h-auto !py-1 !px-2.5 inline-flex items-center"
                          disabled={!candidate || extractSkillsLoading}
                          onClick={(e) => {
                            e.stopPropagation();
                            const f = documentsList.find((d) => d.file && d.name === "CV/Resume")?.file;
                            void runResumeSkillExtract(f ?? null);
                          }}
                        >
                          Use CV row file
                        </button>
                      ) : null}
                    </>
                  )}
                  <i className={`ri-arrow-${skillsOpen ? "up" : "down"}-s-line text-[#8c9097] dark:text-white/50 text-base transition-transform`} onClick={(e) => e.stopPropagation()} />
                </div>
              </div>
              {skillsOpen && (
                <div className="box-body px-4 py-3 space-y-3">
                  <p className="text-defaulttextcolor/70 text-[0.8125rem] mb-0">
                    Extract reads PDF/DOCX text on the server and merges skills into this list. Click <strong>Save profile</strong> below to persist.
                  </p>
                  {skillsRows.length === 0 ? (
                    <p className="text-defaulttextcolor/60 text-sm mb-0">No skills yet — extract from your CV or add rows.</p>
                  ) : (
                    <div className="space-y-2">
                      {skillsRows.map((row) => (
                        <div
                          key={row.id}
                          className="grid grid-cols-12 gap-2 items-end border border-defaultborder rounded-md p-2 bg-gray-50/40 dark:bg-gray-800/20"
                        >
                          <div className="col-span-12 sm:col-span-5">
                            <label className="form-label text-xs mb-1">Skill</label>
                            <input
                              type="text"
                              className="form-control !rounded-md"
                              placeholder="e.g. React"
                              value={row.name}
                              disabled={!candidate}
                              onChange={(e) => {
                                const v = e.target.value;
                                setSkillsRows((arr) => arr.map((x) => (x.id === row.id ? { ...x, name: v } : x)));
                              }}
                            />
                          </div>
                          <div className="col-span-12 sm:col-span-3">
                            <label className="form-label text-xs mb-1">Level</label>
                            <select
                              className="form-control !rounded-md"
                              value={row.level}
                              disabled={!candidate}
                              onChange={(e) => {
                                const v = e.target.value;
                                setSkillsRows((arr) => arr.map((x) => (x.id === row.id ? { ...x, level: v } : x)));
                              }}
                            >
                              {(["Beginner", "Intermediate", "Advanced", "Expert"] as const).map((lvl) => (
                                <option key={lvl} value={lvl}>
                                  {lvl}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-span-12 sm:col-span-3">
                            <label className="form-label text-xs mb-1">Category</label>
                            <input
                              type="text"
                              className="form-control !rounded-md"
                              placeholder="Optional"
                              value={row.category ?? ""}
                              disabled={!candidate}
                              onChange={(e) => {
                                const v = e.target.value;
                                setSkillsRows((arr) => arr.map((x) => (x.id === row.id ? { ...x, category: v || undefined } : x)));
                              }}
                            />
                          </div>
                          <div className="col-span-12 sm:col-span-1 flex justify-end pb-1">
                            <button
                              type="button"
                              className="ti-btn ti-btn-soft-danger ti-btn-sm !min-w-0 !px-2"
                              disabled={!candidate}
                              onClick={() => setSkillsRows((arr) => arr.filter((x) => x.id !== row.id))}
                              aria-label="Remove skill"
                            >
                              <i className="ri-close-line" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    className="ti-btn ti-btn-soft-primary ti-btn-sm !w-auto !h-auto whitespace-nowrap inline-flex items-center"
                    disabled={!candidate}
                    onClick={() => setSkillsRows((arr) => [...arr, { id: Date.now(), name: "", level: "Intermediate" }])}
                  >
                    <i className="ri-add-line me-1 align-middle inline-block" />
                    Add skill
                  </button>
                </div>
              )}
            </div>

            {/* Salary slips */}
            <div className="box overflow-hidden">
              <div className="box-header px-4 py-2 border-b border-dashed dark:border-defaultborder/10 flex items-center justify-between">
                <h6 className="font-medium mb-0 text-[0.875rem]">Salary slips</h6>
                <button
                  type="button"
                  className="ti-btn ti-btn-primary ti-btn-sm whitespace-nowrap !w-auto !h-auto !py-1 !px-2"
                  onClick={() => setSalarySlips((arr) => [...arr, { id: Date.now(), month: "", year: "", file: null }])}
                  disabled={!candidate}
                >
                  <i className="ri-add-line me-1 align-middle" />
                  Add salary slip
                </button>
              </div>
              <div className="box-body px-4 py-4 space-y-4">
                {existingSalarySlips.length > 0 && (
                  <div>
                    <h6 className="text-sm font-semibold mb-3 text-defaulttextcolor">Existing salary slips</h6>
                    {existingSalarySlips.map((slip, i) => (
                      <div key={i} className="relative p-3 border border-defaultborder rounded-md bg-gray-50/50 dark:bg-gray-800/30 mb-3 flex flex-col gap-3">
                        <span className="text-sm">{slip.month} {slip.year}</span>
                        <div className="flex flex-wrap items-center gap-2">
                          {(slip.key || slip.documentUrl || (slip as any).url) && (candidate?.id ?? (candidate as any)?._id) && (
                            <button
                              type="button"
                              className="ti-btn ti-btn-primary ti-btn-sm !py-1.5 !px-3 !min-w-[5.5rem]"
                              onClick={async () => {
                                const cid = candidate?.id ?? (candidate as any)?._id;
                                if (!cid) return;
                                try {
                                  const { url } = await getSalarySlipDownloadUrl(cid, i);
                                  window.open(url, "_blank");
                                } catch {
                                  Swal.fire("Error", "Could not open salary slip.", "error");
                                }
                              }}
                            >
                              <i className="ri-external-link-line me-1 align-middle" />
                              View
                            </button>
                          )}
                          <button
                            type="button"
                            className="ti-btn ti-btn-soft-danger ti-btn-sm !py-1.5 !px-3 !min-w-[5.5rem]"
                            onClick={() => setExistingSalarySlips((arr) => arr.filter((_, j) => j !== i))}
                            disabled={!candidate}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {salarySlips.map((slip, i) => (
                  <div key={slip.id} className="p-3 border border-defaultborder rounded-md sm:grid grid-cols-12 gap-3">
                    <div className="col-span-6 sm:col-span-2">
                      <label className="form-label text-xs">Month</label>
                      <select
                        className="form-control !rounded-md"
                        value={slip.month}
                        disabled={!candidate}
                        onChange={(e) => setSalarySlips((arr) => arr.map((s, j) => (j === i ? { ...s, month: e.target.value } : s)))}
                      >
                        <option value="">Select</option>
                        {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-6 sm:col-span-2">
                      <label className="form-label text-xs">Year</label>
                      <select
                        className="form-control !rounded-md"
                        value={slip.year}
                        disabled={!candidate}
                        onChange={(e) => setSalarySlips((arr) => arr.map((s, j) => (j === i ? { ...s, year: e.target.value } : s)))}
                      >
                        <option value="">Select</option>
                        {Array.from({ length: 10 }, (_, k) => new Date().getFullYear() - k).map((y) => (
                          <option key={y} value={String(y)}>{y}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-12 sm:col-span-6">
                      <label className="form-label text-xs">File</label>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        className="form-control !rounded-md"
                        disabled={!candidate}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setSalarySlips((arr) => arr.map((s, j) => (j === i ? { ...s, file } : s)));
                        }}
                      />
                    </div>
                    <div className="col-span-12 sm:col-span-2 flex items-end justify-end">
                      <button type="button" className="ti-btn ti-btn-soft-danger ti-btn-sm" onClick={() => setSalarySlips((arr) => arr.filter((s) => s.id !== slip.id))}>
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
                {existingSalarySlips.length === 0 && salarySlips.length === 0 && (
                  <p className="text-defaulttextcolor/70 text-sm mb-0">No salary slips. Click "Add salary slip" to add a row, then select month, year and file.</p>
                )}
                {(salarySlips.length > 0 || existingSalarySlips.length > 0) && (
                  <p className="text-defaulttextcolor/70 text-sm mb-2">
                    {salarySlips.some((s) => s.file && s.month && s.year) ? 'Click "Upload salary slips" below to save.' : "Add rows above, fill month, year and file, then click Upload."}
                  </p>
                )}
                {salarySlips.some((s) => s.file && s.month && s.year) && (
                  <div className="flex shrink-0">
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      disabled={saveLoading || !user || !candidate}
                      className="ti-btn ti-btn-primary ti-btn-sm !py-2 !px-4 whitespace-nowrap shrink-0 inline-flex items-center justify-center !min-w-max"
                    >
                      {saveLoading ? "Uploading…" : "Upload salary slips"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mb-6">
          <NotificationPreferencesEditor value={notificationPrefs} onChange={setNotificationPrefs} />
        </div>

        {/* ── Actions + security ── */}
        <div className="box overflow-hidden">
          <div className="box-body !p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-dashed dark:border-defaultborder/10">
              <div className="flex items-center gap-2">
                <ChangePasswordButton />
                <button type="button" onClick={() => logout()} className="ti-btn ti-btn-sm ti-btn-soft-danger !w-auto !h-auto whitespace-nowrap inline-flex items-center">
                  <i className="ri-logout-circle-line me-1 align-middle inline-block" />Logout
                </button>
              </div>
              <button
                type="button"
                onClick={handleSaveProfile}
                className="ti-btn ti-btn-primary !w-auto !h-auto whitespace-nowrap disabled:opacity-70 disabled:cursor-not-allowed"
                disabled={saveLoading || !user}
              >
                {saveLoading ? (
                  <><span className="inline-block size-4 animate-spin rounded-full border-2 border-white/40 border-t-white align-[-0.125em] me-2" />{extractingFromDoc ? "Extracting skills…" : "Saving…"}</>
                ) : (
                  <><i className="ri-save-3-line me-1.5 align-middle" />Save profile</>
                )}
              </button>
            </div>
            <div className="flex items-center gap-3 px-4 py-2.5">
              <i className="ri-shield-check-line text-[#8c9097] dark:text-white/40 text-[0.875rem]" />
              <span className="text-[0.75rem] text-[#8c9097] dark:text-white/50">
                Last login: <span className="font-medium">{formatDate(user?.lastLoginAt)}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {extractReview && (
        <div
          className="fixed inset-0 z-[1080] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="extract-review-title"
        >
          <div className="w-full max-w-2xl rounded-lg border border-gray-200 bg-white shadow-xl dark:border-defaultborder/10 dark:bg-bodybg">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-defaultborder/10">
              <div>
                <h5 id="extract-review-title" className="m-0 text-base font-semibold text-gray-800 dark:text-white">
                  Review extracted skills
                </h5>
                <p className="m-0 text-xs text-gray-500 dark:text-gray-400">
                  From <span className="font-medium">{extractReview.sourceFile}</span>. Pick the skills to merge — none will be added until you confirm.
                </p>
              </div>
              <button
                type="button"
                className="ti-btn ti-btn-icon ti-btn-sm ti-btn-light"
                onClick={() => setExtractReview(null)}
                aria-label="Close review modal"
              >
                <i className="ri-close-line"></i>
              </button>
            </div>

            <div className="border-b border-gray-200 px-5 py-2 text-xs text-gray-600 dark:border-defaultborder/10 dark:text-gray-300">
              {extractReview.selected.size} of {extractReview.skills.length} selected ·{' '}
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => setAllExtractedSelection(() => true)}
              >
                Select all
              </button>{' '}
              ·{' '}
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => setAllExtractedSelection(() => false)}
              >
                Select none
              </button>{' '}
              ·{' '}
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() =>
                  setAllExtractedSelection((i) => !isExtractedSkillExisting(extractReview.skills[i].name))
                }
              >
                Only new
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-5">
              <ul className="space-y-1.5">
                {extractReview.skills.map((s, i) => {
                  const exists = isExtractedSkillExisting(s.name);
                  const checked = extractReview.selected.has(i);
                  return (
                    <li
                      key={`${s.name}-${i}`}
                      className={`flex items-center justify-between gap-3 rounded border p-2 text-sm ${
                        exists
                          ? 'border-amber-300 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10'
                          : 'border-gray-200 bg-white dark:border-defaultborder/10 dark:bg-black/30'
                      }`}
                    >
                      <label className="flex flex-1 cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={checked}
                          onChange={() => toggleExtractedSkill(i)}
                        />
                        <span className="font-medium text-gray-800 dark:text-white">{s.name}</span>
                        {s.level && (
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[0.65rem] uppercase tracking-wide text-gray-700 dark:bg-black/40 dark:text-gray-200">
                            {s.level}
                          </span>
                        )}
                        {s.category && (
                          <span className="text-[0.65rem] uppercase tracking-wide text-gray-500">
                            {s.category}
                          </span>
                        )}
                      </label>
                      {exists ? (
                        <span className="text-[0.65rem] uppercase tracking-wide text-amber-700 dark:text-amber-300">
                          Already in list
                        </span>
                      ) : (
                        <span className="text-[0.65rem] uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                          New
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-3 dark:border-defaultborder/10">
              <button
                type="button"
                className="ti-btn ti-btn-light"
                onClick={() => setExtractReview(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ti-btn ti-btn-primary"
                onClick={confirmExtractedSkills}
                disabled={extractReview.selected.size === 0}
              >
                Add {extractReview.selected.size} skill{extractReview.selected.size === 1 ? '' : 's'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  );
}
