"use client";

import React, { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Seo from "@/shared/layout-components/seo/seo";
import { useAuth } from "@/shared/contexts/auth-context";
import { ROUTES } from "@/shared/lib/constants";
import * as authApi from "@/shared/lib/api/auth";
import * as rolesApi from "@/shared/lib/api/roles";
import * as usersApi from "@/shared/lib/api/users";
import { uploadDocument, uploadDocuments, getDocumentDownloadUrl } from "@/shared/lib/api/candidates";
import type { NotificationPreferences } from "@/shared/lib/api/users";
import type { Role } from "@/shared/lib/types";
import { useHasCandidateRole } from "@/shared/hooks/use-has-candidate-role";
import { PhoneCountrySelect } from "@/shared/components/PhoneCountrySelect";
import type { CandidateWithProfile, UpdateMeWithCandidatePayload } from "@/shared/lib/api/auth";
import { AxiosError } from "axios";
import Swal from "sweetalert2";

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

function parseUserAgent(ua: string | null | undefined): string {
  if (!ua) return "Unknown device";
  if (ua.includes("Chrome") && !ua.includes("Edg")) return "Chrome";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
  if (ua.includes("Edg")) return "Edge";
  return ua.slice(0, 40) + (ua.length > 40 ? "…" : "");
}

const PASSWORD_MIN_LENGTH = 8;

function validateNewPassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) return "Password must contain at least one letter and one number.";
  return null;
}

export default function PersonalInformationPage() {
  const { user, logout, sessions, checkAuth, refreshUser, isAdministrator } = useAuth();
  const { hasCandidateRole, isLoading: candidateRoleLoading } = useHasCandidateRole();
  const [roles, setRoles] = useState<Role[]>([]);
  const [candidate, setCandidate] = useState<CandidateWithProfile | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");

  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const [avatarUploadLoading, setAvatarUploadLoading] = useState(false);
  const [avatarRemoveLoading, setAvatarRemoveLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState("");
  const [changePasswordSuccess, setChangePasswordSuccess] = useState("");
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);

  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("IN");
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

  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    leaveUpdates: true,
    taskAssignments: true,
    applicationUpdates: true,
    offerUpdates: true,
    meetingInvitations: true,
    meetingReminders: true,
    certificates: true,
    courseUpdates: true,
    recruiterUpdates: true,
  });

  const rolesById = useMemo(() => {
    const map = new Map<string, Role>();
    roles.forEach((r) => map.set(r.id, r));
    return map;
  }, [roles]);

  const roleDisplayName = useMemo(() => {
    if (!user) return "—";
    const ids = user.roleIds ?? [];
    if (ids.length === 0) {
      const r = (user.role ?? "User").toString().toLowerCase();
      return r === "user" || r === "candidate" ? "Candidate" : r.charAt(0).toUpperCase() + r.slice(1);
    }
    const names = ids.map((id) => rolesById.get(id)?.name).filter(Boolean);
    const display = names.length > 0 ? names.join(", ") : (user.role ?? "User").toString();
    return display.toLowerCase() === "user" && hasCandidateRole ? "Candidate" : display;
  }, [user, rolesById, hasCandidateRole]);

  useEffect(() => {
    let cancelled = false;
    rolesApi
      .listRoles({ limit: 100 })
      .then((res) => {
        if (!cancelled) setRoles(res.results ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasCandidateRole) {
      setCandidate(null);
      return;
    }
    let cancelled = false;
    authApi.getMeWithCandidate().then((res) => {
      if (!cancelled && res?.candidate) setCandidate(res.candidate);
    });
    return () => { cancelled = true; };
  }, [hasCandidateRole]);

  useEffect(() => {
    if (!candidate) return;
    setPhoneNumber(candidate.phoneNumber ?? "");
    setCountryCode(candidate.countryCode ?? "IN");
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
  }, [candidate]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaveError("");
    setSaveSuccess("");

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const fullName = `${trimmedFirst} ${trimmedLast}`.trim();
    const trimmedEmail = email.trim();

    if (!trimmedFirst) {
      setSaveError("First name is required.");
      return;
    }
    if (isAdministrator && !trimmedEmail) {
      setSaveError("Email is required.");
      return;
    }
    if (hasCandidateRole) {
      const phoneErr = validatePhoneForCandidate(phoneNumber);
      if (phoneErr) {
        setSaveError(phoneErr);
        return;
      }
    }

    setSaveLoading(true);
    try {
      if (hasCandidateRole && candidate) {
        const DOCUMENT_TYPES = ["Aadhar", "PAN", "Bank", "Passport", "CV/Resume", "Marksheet", "Degree Certificate", "Experience Letter", "Other"] as const;
        let finalDocs: Array<{ type: string; label?: string; url?: string; key?: string; originalName?: string; size?: number; mimeType?: string }> = existingDocs.map((d) => ({
          type: d.type || "Other",
          label: d.label,
          url: d.url,
          key: d.key,
          originalName: d.originalName,
        }));
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

        const payload: UpdateMeWithCandidatePayload = {
          name: fullName || undefined,
          notificationPreferences: notificationPrefs,
          phoneNumber: (phoneNumber || "").replace(/\D/g, ""),
          countryCode: countryCode || undefined,
          shortBio: shortBio || undefined,
          sevisId: sevisId || undefined,
          ead: ead || undefined,
          visaType: visaType || undefined,
          customVisaType: customVisaType || undefined,
          degree: degree || undefined,
          supervisorName: supervisorName || undefined,
          supervisorContact: (supervisorContact || "").replace(/\D/g, "") || undefined,
          salaryRange: salaryRange || undefined,
          address: {
            streetAddress: address.streetAddress || undefined,
            streetAddress2: address.streetAddress2 || undefined,
            city: address.city || undefined,
            state: address.state || undefined,
            zipCode: address.zipCode || undefined,
            country: address.country || undefined,
          },
          qualifications: qualifications.length > 0 ? qualifications : undefined,
          experiences: experiences.length > 0 ? experiences : undefined,
          documents: finalDocs,
          salarySlips: finalSalarySlips,
        };
        const res = await authApi.updateMeWithCandidate(payload);
        setCandidate(res.candidate);
        setDocumentsList([]);
        setSalarySlips([]);
        await refreshUser();
      } else if (isAdministrator) {
        await usersApi.updateUser(user.id, {
          name: fullName || undefined,
          email: trimmedEmail || undefined,
          notificationPreferences: notificationPrefs,
        });
      } else {
        await authApi.updateMyProfile({
          name: fullName || undefined,
          notificationPreferences: notificationPrefs,
        });
      }
      await checkAuth();
      setSaveSuccess("Profile updated successfully.");
      await Swal.fire("Profile updated", "Your profile has been saved successfully.", "success");
    } catch (err) {
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : "Failed to update profile.";
      setSaveError(msg);
    } finally {
      setSaveLoading(false);
      setTimeout(() => {
        setSaveSuccess("");
      }, 2000);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    e.target.value = "";
    const allowed = ["image/jpeg", "image/jpg", "image/png"];
    if (!allowed.includes(file.type)) {
      setSaveError("Please upload a JPEG or PNG image (max 5MB).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSaveError("Image must be smaller than 5MB.");
      return;
    }
    setSaveError("");
    setAvatarUploadLoading(true);
    try {
      const result = await uploadDocument(file);
      const profilePicture = { url: result.url, key: result.key, originalName: result.originalName, size: result.size, mimeType: result.mimeType };
      if (hasCandidateRole && candidate) {
        const res = await authApi.updateMeWithCandidate({ profilePicture });
        setCandidate(res.candidate);
      } else {
        await authApi.updateMyProfile({ profilePicture });
      }
      await refreshUser();
      setSaveSuccess("Profile picture updated.");
      setTimeout(() => setSaveSuccess(""), 2000);
    } catch (err) {
      const msg = err instanceof AxiosError && err.response?.data?.message ? String(err.response.data.message) : "Failed to upload photo.";
      setSaveError(msg);
    } finally {
      setAvatarUploadLoading(false);
    }
  };

  const handleAvatarRemove = async () => {
    if (!user) return;
    setSaveError("");
    setAvatarRemoveLoading(true);
    try {
      if (hasCandidateRole && candidate) {
        const res = await authApi.updateMeWithCandidate({ profilePicture: null });
        setCandidate(res.candidate);
      } else {
        await authApi.updateMyProfile({ profilePicture: null });
      }
      await refreshUser();
      setSaveSuccess("Profile picture removed.");
      setTimeout(() => setSaveSuccess(""), 2000);
    } catch (err) {
      const msg = err instanceof AxiosError && err.response?.data?.message ? String(err.response.data.message) : "Failed to remove photo.";
      setSaveError(msg);
    } finally {
      setAvatarRemoveLoading(false);
    }
  };

  const openChangePasswordModal = () => {
    setChangePasswordOpen(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setChangePasswordError("");
    setChangePasswordSuccess("");
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordError("");
    setChangePasswordSuccess("");
    if (!currentPassword.trim()) {
      setChangePasswordError("Current password is required.");
      return;
    }
    const validation = validateNewPassword(newPassword);
    if (validation) {
      setChangePasswordError(validation);
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangePasswordError("New passwords do not match.");
      return;
    }
    setChangePasswordLoading(true);
    try {
      await authApi.changePassword(currentPassword.trim(), newPassword);
      setChangePasswordSuccess("Your password has been updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        setChangePasswordOpen(false);
        setChangePasswordSuccess("");
      }, 1500);
    } catch (err) {
      const status = err instanceof AxiosError ? err.response?.status : 0;
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : status === 401
            ? "Current password is incorrect."
            : "Something went wrong. Please try again.";
      setChangePasswordError(msg);
    } finally {
      setChangePasswordLoading(false);
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
      });
    }
  }, [user]);

  return (
    <Fragment>
      <Seo title="Personal Information" />
      <div className="sm:p-4 p-4">
        {saveError && (
          <div className="mb-4 p-3 bg-danger/10 border border-danger/30 text-danger rounded-md text-sm">
            {saveError}
          </div>
        )}
        {saveSuccess && (
          <div className="mb-4 p-3 bg-success/10 border border-success/30 text-success rounded-md text-sm">
            {saveSuccess}
          </div>
        )}

        {/* Profile summary card */}
        <div className="box mb-6 border border-defaultborder rounded-lg overflow-hidden">
          <div className="box-header px-4 py-3 border-b border-defaultborder bg-gray-50/50 dark:bg-gray-800/30">
            <h6 className="font-semibold mb-0 text-[1rem]">Profile summary</h6>
          </div>
          <div className="box-body px-4 py-4">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-0">
              <div>
                <dt className="text-[0.75rem] font-medium text-defaulttextcolor/70 uppercase tracking-wide mb-1">Name</dt>
                <dd className="text-[0.9375rem] font-medium">{user?.name ?? user?.email ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-[0.75rem] font-medium text-defaulttextcolor/70 uppercase tracking-wide mb-1">Email</dt>
                <dd className="text-[0.9375rem]">{user?.email ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-[0.75rem] font-medium text-defaulttextcolor/70 uppercase tracking-wide mb-1">Username</dt>
                <dd className="text-[0.9375rem]">{user?.username ?? user?.email ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-[0.75rem] font-medium text-defaulttextcolor/70 uppercase tracking-wide mb-1">Role</dt>
                <dd className="text-[0.9375rem]">{roleDisplayName} (System)</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Avatar / Profile picture */}
        <h6 className="font-semibold mb-4 text-[1rem]">Profile picture</h6>
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-shrink-0">
            {user?.profilePicture?.url ? (
              <img
                src={user.profilePicture.url}
                alt=""
                className="w-20 h-20 rounded-full object-cover border border-defaultborder"
              />
            ) : (
              <span className="avatar avatar-xl avatar-rounded bg-primary/10 text-primary flex items-center justify-center font-semibold text-[1.25rem]">
                {(user?.name ?? user?.email ?? "?").charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              className="hidden"
              onChange={handleAvatarUpload}
              aria-label="Upload profile picture"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploadLoading || avatarRemoveLoading || !user}
              className="ti-btn ti-btn-primary ti-btn-sm whitespace-nowrap shrink-0 !w-auto !h-auto !py-1.5 !px-3"
            >
              {avatarUploadLoading ? "Uploading…" : "Upload"}
            </button>
            {(user?.profilePicture?.url) && (
              <button
                type="button"
                onClick={handleAvatarRemove}
                disabled={avatarUploadLoading || avatarRemoveLoading}
                className="ti-btn ti-btn-soft-danger ti-btn-sm whitespace-nowrap shrink-0 !w-auto !h-auto !py-1.5 !px-3"
              >
                {avatarRemoveLoading ? "Removing…" : "Remove"}
              </button>
            )}
          </div>
        </div>

        <h6 className="font-semibold mb-4 text-[1rem]">Profile :</h6>
        <div className="sm:grid grid-cols-12 gap-6 mb-6">
          <div className="xl:col-span-6 col-span-12">
            <label htmlFor="first-name" className="form-label">
              First Name
            </label>
            <input
              type="text"
              className="form-control w-full !rounded-md"
              id="first-name"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="xl:col-span-6 col-span-12">
            <label htmlFor="last-name" className="form-label">
              Last Name
            </label>
            <input
              type="text"
              className="form-control w-full !rounded-md"
              id="last-name"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          <div className="xl:col-span-12 col-span-12">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-control w-full !rounded-md !bg-gray-100 dark:!bg-black/20"
              id="username-readonly"
              value={userName}
              readOnly
              title="Only an administrator can change your username (via Settings → Users → Edit)"
            />
            <p className="text-[0.75rem] text-defaulttextcolor/70 mt-1 mb-0">
              Username is used for sign-in. Only an administrator can change it.
            </p>
          </div>
        </div>

        <h6 className="font-semibold mb-4 text-[1rem]">Personal information :</h6>
        <div className="sm:grid grid-cols-12 gap-6 mb-6">
          <div className="xl:col-span-6 col-span-12">
            <label htmlFor="email-address" className="form-label">
              Email Address :
            </label>
            <input
              type="email"
              className="form-control w-full !rounded-md"
              id="email-address"
              placeholder="xyz@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              readOnly={!isAdministrator}
              title={!isAdministrator ? "Only an administrator can change your email address" : undefined}
            />
          </div>
        </div>

        {/* Candidate-only sections */}
        {hasCandidateRole && !candidateRoleLoading && (
          <div className="space-y-6 mb-6">
            <h6 className="font-semibold text-[1rem]">Candidate information</h6>

            {/* Contact & address */}
            <div className="box border border-defaultborder rounded-lg overflow-hidden">
              <div className="box-header px-4 py-3 border-b border-defaultborder bg-gray-50/50 dark:bg-gray-800/30">
                <h6 className="font-semibold mb-0 text-[0.9375rem]">Contact & address</h6>
              </div>
              <div className="box-body px-4 py-4 sm:grid grid-cols-12 gap-4">
                <div className="col-span-12 sm:col-span-6">
                  <label className="form-label">Phone <span className="text-danger">*</span></label>
                  <div className="flex gap-2">
                    <PhoneCountrySelect value={countryCode} onChange={setCountryCode} className="flex-shrink-0" />
                    <input
                      type="tel"
                      className="form-control w-full !rounded-md"
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
            <div className="box border border-defaultborder rounded-lg overflow-hidden">
              <div className="box-header px-4 py-3 border-b border-defaultborder bg-gray-50/50 dark:bg-gray-800/30">
                <h6 className="font-semibold mb-0 text-[0.9375rem]">Immigration / visa</h6>
              </div>
              <div className="box-body px-4 py-4 sm:grid grid-cols-12 gap-4">
                <div className="col-span-12 sm:col-span-6">
                  <label className="form-label">SEVIS ID</label>
                  <input
                    type="text"
                    className="form-control w-full !rounded-md"
                    value={sevisId}
                    onChange={(e) => setSevisId(e.target.value)}
                  />
                </div>
                <div className="col-span-12 sm:col-span-6">
                  <label className="form-label">EAD</label>
                  <input
                    type="text"
                    className="form-control w-full !rounded-md"
                    value={ead}
                    onChange={(e) => setEad(e.target.value)}
                  />
                </div>
                <div className="col-span-12 sm:col-span-6">
                  <label className="form-label">Visa type</label>
                  <select
                    className="form-control w-full !rounded-md"
                    value={visaType}
                    onChange={(e) => setVisaType(e.target.value)}
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
                </div>
                {visaType === "Other" && (
                  <div className="col-span-12 sm:col-span-6">
                    <label className="form-label">Custom visa type</label>
                    <input
                      type="text"
                      className="form-control w-full !rounded-md"
                      placeholder="Enter visa type"
                      value={customVisaType}
                      onChange={(e) => setCustomVisaType(e.target.value)}
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
                    className="form-control w-full !rounded-md"
                    value={supervisorName}
                    onChange={(e) => setSupervisorName(e.target.value)}
                  />
                </div>
                <div className="col-span-12 sm:col-span-6">
                  <label className="form-label">Supervisor contact</label>
                  <input
                    type="tel"
                    className="form-control w-full !rounded-md"
                    value={supervisorContact}
                    onChange={(e) => setSupervisorContact(e.target.value)}
                  />
                </div>
                <div className="col-span-12 sm:col-span-6">
                  <label className="form-label">Salary range</label>
                  <select
                    className="form-control w-full !rounded-md"
                    value={salaryRange}
                    onChange={(e) => setSalaryRange(e.target.value)}
                  >
                    <option value="">Select Salary Range</option>
                    <option value="$30,000 - $50,000">$30,000 - $50,000</option>
                    <option value="$50,000 - $70,000">$50,000 - $70,000</option>
                    <option value="$70,000 - $90,000">$70,000 - $90,000</option>
                    <option value="$90,000 - $110,000">$90,000 - $110,000</option>
                    <option value="$110,000 - $130,000">$110,000 - $130,000</option>
                    <option value="$130,000 - $150,000">$130,000 - $150,000</option>
                    <option value="$150,000 - $200,000">$150,000 - $200,000</option>
                    <option value="$200,000+">$200,000+</option>
                    <option value="Prefer not to disclose">Prefer not to disclose</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Qualifications */}
            <div className="box border border-defaultborder rounded-lg overflow-hidden">
              <div className="box-header px-4 py-3 border-b border-defaultborder bg-gray-50/50 dark:bg-gray-800/30">
                <h6 className="font-semibold mb-0 text-[0.9375rem]">Qualifications</h6>
              </div>
              <div className="box-body px-4 py-4 space-y-4">
                {qualifications.map((q, i) => (
                  <div key={i} className="p-3 border border-defaultborder rounded-md bg-gray-50/50 dark:bg-gray-800/30 sm:grid grid-cols-12 gap-3">
                    <div className="col-span-12 sm:col-span-6">
                      <input
                        type="text"
                        className="form-control !rounded-md"
                        placeholder="Degree"
                        value={q.degree}
                        onChange={(e) => setQualifications((arr) => arr.map((x, j) => (j === i ? { ...x, degree: e.target.value } : x)))}
                      />
                    </div>
                    <div className="col-span-12 sm:col-span-6">
                      <input
                        type="text"
                        className="form-control !rounded-md"
                        placeholder="Institute"
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
                    <div className="col-span-10">
                      <input
                        type="text"
                        className="form-control !rounded-md"
                        placeholder="Description"
                        value={q.description ?? ""}
                        onChange={(e) => setQualifications((arr) => arr.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))}
                      />
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <button type="button" className="ti-btn ti-btn-soft-danger ti-btn-sm" onClick={() => setQualifications((arr) => arr.filter((_, j) => j !== i))}>Remove</button>
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
            <div className="box border border-defaultborder rounded-lg overflow-hidden">
              <div className="box-header px-4 py-3 border-b border-defaultborder bg-gray-50/50 dark:bg-gray-800/30">
                <h6 className="font-semibold mb-0 text-[0.9375rem]">Work experience</h6>
              </div>
              <div className="box-body px-4 py-4 space-y-4">
                {experiences.map((exp, i) => (
                  <div key={i} className="p-3 border border-defaultborder rounded-md bg-gray-50/50 dark:bg-gray-800/30 sm:grid grid-cols-12 gap-3">
                    <div className="col-span-12 sm:col-span-6">
                      <input
                        type="text"
                        className="form-control !rounded-md"
                        placeholder="Company"
                        value={exp.company}
                        onChange={(e) => setExperiences((arr) => arr.map((x, j) => (j === i ? { ...x, company: e.target.value } : x)))}
                      />
                    </div>
                    <div className="col-span-12 sm:col-span-6">
                      <input
                        type="text"
                        className="form-control !rounded-md"
                        placeholder="Role"
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
                    <div className="col-span-10">
                      <input
                        type="text"
                        className="form-control !rounded-md"
                        placeholder="Description"
                        value={exp.description ?? ""}
                        onChange={(e) => setExperiences((arr) => arr.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))}
                      />
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <button type="button" className="ti-btn ti-btn-soft-danger ti-btn-sm" onClick={() => setExperiences((arr) => arr.filter((_, j) => j !== i))}>Remove</button>
                    </div>
                  </div>
                ))}
                <button type="button" className="ti-btn ti-btn-primary ti-btn-sm whitespace-nowrap !w-auto !h-auto !py-1.5 !px-3" onClick={() => setExperiences((arr) => [...arr, { company: "", role: "" }])}>
                  <i className="ri-add-line me-1 align-middle" />
                  Add experience
                </button>
              </div>
            </div>

            {/* Documents */}
            <div className="box border border-defaultborder rounded-lg overflow-hidden">
              <div className="box-header px-4 py-3 border-b border-defaultborder bg-gray-50/50 dark:bg-gray-800/30 flex items-center justify-between">
                <h6 className="font-semibold mb-0 text-[0.9375rem]">Documents</h6>
                <button
                  type="button"
                  className="ti-btn ti-btn-primary ti-btn-sm whitespace-nowrap !w-auto !h-auto !py-1 !px-2"
                  onClick={() => setDocumentsList((arr) => [...arr, { id: Date.now(), name: "", customName: "", file: null }])}
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
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {documentsList.map((doc, i) => (
                  <div key={doc.id} className="p-3 border border-defaultborder rounded-md sm:grid grid-cols-12 gap-3">
                    <div className="col-span-12 sm:col-span-4">
                      <label className="form-label text-xs">Type</label>
                      <select
                        className="form-control !rounded-md"
                        value={doc.name}
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
                        </optgroup>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    {doc.name === "Other" && (
                      <div className="col-span-12 sm:col-span-4">
                        <label className="form-label text-xs">Label</label>
                        <input
                          type="text"
                          className="form-control !rounded-md"
                          placeholder="Document name"
                          value={doc.customName}
                          onChange={(e) => setDocumentsList((arr) => arr.map((d, j) => (j === i ? { ...d, customName: e.target.value } : d)))}
                        />
                      </div>
                    )}
                    <div className="col-span-12 sm:col-span-4">
                      <label className="form-label text-xs">File</label>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        className="form-control !rounded-md"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setDocumentsList((arr) => arr.map((d, j) => (j === i ? { ...d, file } : d)));
                        }}
                      />
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
                      disabled={saveLoading || !user}
                      className="ti-btn ti-btn-primary ti-btn-sm !py-2 !px-4 whitespace-nowrap shrink-0 inline-flex items-center justify-center !min-w-max"
                    >
                      {saveLoading ? "Uploading…" : "Upload documents"}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Salary slips */}
            <div className="box border border-defaultborder rounded-lg overflow-hidden">
              <div className="box-header px-4 py-3 border-b border-defaultborder bg-gray-50/50 dark:bg-gray-800/30 flex items-center justify-between">
                <h6 className="font-semibold mb-0 text-[0.9375rem]">Salary slips</h6>
                <button
                  type="button"
                  className="ti-btn ti-btn-primary ti-btn-sm whitespace-nowrap !w-auto !h-auto !py-1 !px-2"
                  onClick={() => setSalarySlips((arr) => [...arr, { id: Date.now(), month: "", year: "", file: null }])}
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
                          {(slip.documentUrl || (slip as any).url) && (
                            <button
                              type="button"
                              className="ti-btn ti-btn-primary ti-btn-sm !py-1.5 !px-3 !min-w-[5.5rem]"
                              onClick={() => window.open((slip.documentUrl || (slip as any).url) as string, "_blank")}
                            >
                              <i className="ri-external-link-line me-1 align-middle" />
                              View
                            </button>
                          )}
                          <button
                            type="button"
                            className="ti-btn ti-btn-soft-danger ti-btn-sm !py-1.5 !px-3 !min-w-[5.5rem]"
                            onClick={() => setExistingSalarySlips((arr) => arr.filter((_, j) => j !== i))}
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
                      disabled={saveLoading || !user}
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

        <h6 className="font-semibold mb-4 text-[1rem]">Notification preferences</h6>
        <p className="text-[0.875rem] text-defaulttextcolor/80 mb-4">Choose which email notifications you want to receive. In-app notifications are always enabled.</p>
        <div className="box border border-defaultborder rounded-lg overflow-hidden mb-6">
          <div className="box-body px-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { key: "leaveUpdates" as const, label: "Leave & attendance updates" },
                { key: "taskAssignments" as const, label: "Task assignments" },
                { key: "applicationUpdates" as const, label: "Job application updates" },
                { key: "offerUpdates" as const, label: "Offer updates" },
                { key: "meetingInvitations" as const, label: "Meeting invitations" },
                { key: "meetingReminders" as const, label: "Meeting reminders" },
                { key: "certificates" as const, label: "Certificates" },
                { key: "courseUpdates" as const, label: "Course / training updates" },
                { key: "recruiterUpdates" as const, label: "Recruiter assignments" },
              ].map(({ key, label }) => (
                <label key={key} className="form-check flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={notificationPrefs[key] !== false}
                    onChange={(e) => setNotificationPrefs((p) => ({ ...p, [key]: e.target.checked }))}
                  />
                  <span className="text-[0.9375rem] text-defaulttextcolor">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <button
            type="button"
            onClick={handleSaveProfile}
            className="ti-btn ti-btn-primary disabled:opacity-70 disabled:cursor-not-allowed"
            disabled={saveLoading || !user}
          >
            {saveLoading ? "Saving…" : "Save"}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <button type="button" onClick={openChangePasswordModal} className="ti-btn ti-btn-light">
            Change password
          </button>
          <button type="button" onClick={() => logout()} className="ti-btn ti-btn-soft-danger">
            Logout
          </button>
        </div>

        {/* Security cues */}
        <h6 className="font-semibold mb-4 mt-6 text-[1rem]">Security</h6>
        <div className="box border border-defaultborder rounded-lg overflow-hidden mb-4">
          <div className="box-body px-4 py-4">
            <dl className="space-y-4 mb-0">
              <div>
                <dt className="text-[0.75rem] font-medium text-defaulttextcolor/70 uppercase tracking-wide mb-1">Last login</dt>
                <dd className="text-[0.9375rem] text-defaulttextcolor/80">
                  {formatDate(user?.lastLoginAt)}
                </dd>
              </div>
              {/* <div>
                <dt className="text-[0.75rem] font-medium text-defaulttextcolor/70 uppercase tracking-wide mb-1">Active sessions / devices</dt>
                <dd className="text-[0.9375rem] text-defaulttextcolor/80">
                  {!sessions?.length ? (
                    "—"
                  ) : (
                    <ul className="list-none pl-0 mb-0 space-y-2 mt-2">
                      {sessions.slice(0, 10).map((session) => (
                        <li
                          key={session.id}
                          className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2 border-b border-defaultborder/50 last:border-0 last:pb-0 first:pt-0"
                        >
                          <span className="font-medium text-defaulttextcolor">{parseUserAgent(session.userAgent)}</span>
                          <span className="text-[0.8125rem] text-defaulttextcolor/70">
                            {session.ip ?? "—"} · {formatDate(session.createdAt)}
                          </span>
                        </li>
                      ))}
                      {sessions.length > 10 && (
                        <li className="text-[0.8125rem] text-defaulttextcolor/70 pt-1">
                          +{sessions.length - 10} more session{sessions.length - 10 !== 1 ? "s" : ""}
                        </li>
                      )}
                    </ul>
                  )}
                </dd>
              </div> */}
            </dl>
          </div>
        </div>
      </div>

      {/* Change password modal */}
      {changePasswordOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="change-password-title"
          onClick={() => !changePasswordLoading && setChangePasswordOpen(false)}
        >
          <div
            className="ti-modal-box w-full max-w-md bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-defaultborder"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ti-modal-header flex items-center justify-between px-4 py-3 border-b border-defaultborder">
              <h6 id="change-password-title" className="modal-title text-[1rem] font-semibold mb-0">
                Change password
              </h6>
              <button
                type="button"
                onClick={() => !changePasswordLoading && setChangePasswordOpen(false)}
                className="!text-[1.25rem] !font-semibold text-defaulttextcolor hover:text-default"
                aria-label="Close"
                disabled={changePasswordLoading}
              >
                <i className="ri-close-line" />
              </button>
            </div>
            <form onSubmit={handleChangePasswordSubmit} className="ti-modal-body px-4 py-4">
              {changePasswordError && (
                <div className="mb-4 p-3 bg-danger/10 border border-danger/30 text-danger rounded-md text-sm">
                  {changePasswordError}
                </div>
              )}
              {changePasswordSuccess && (
                <div className="mb-4 p-3 bg-success/10 border border-success/30 text-success rounded-md text-sm">
                  {changePasswordSuccess}
                </div>
              )}
              <div className="mb-4">
                <label htmlFor="change-current-password" className="form-label !text-[0.8125rem]">Current password</label>
                <div className="input-group">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    id="change-current-password"
                    className="form-control !rounded-e-none"
                    placeholder="Current password"
                    value={currentPassword}
                    onChange={(e) => { setCurrentPassword(e.target.value); setChangePasswordError(""); }}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="ti-btn ti-btn-light !rounded-s-none"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    aria-label={showCurrentPassword ? "Hide" : "Show"}
                  >
                    <i className={showCurrentPassword ? "ri-eye-off-line" : "ri-eye-line"} />
                  </button>
                </div>
              </div>
              <div className="mb-4">
                <label htmlFor="change-new-password" className="form-label !text-[0.8125rem]">New password</label>
                <div className="input-group">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    id="change-new-password"
                    className="form-control !rounded-e-none"
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setChangePasswordError(""); }}
                    autoComplete="new-password"
                    required
                    minLength={PASSWORD_MIN_LENGTH}
                  />
                  <button
                    type="button"
                    className="ti-btn ti-btn-light !rounded-s-none"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    aria-label={showNewPassword ? "Hide" : "Show"}
                  >
                    <i className={showNewPassword ? "ri-eye-off-line" : "ri-eye-line"} />
                  </button>
                </div>
                <p className="text-[0.75rem] text-defaulttextcolor/70 mt-1 mb-0">Min 8 characters, at least one letter and one number.</p>
              </div>
              <div className="mb-4">
                <label htmlFor="change-confirm-password" className="form-label !text-[0.8125rem]">Confirm new password</label>
                <div className="input-group">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="change-confirm-password"
                    className="form-control !rounded-e-none"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setChangePasswordError(""); }}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="ti-btn ti-btn-light !rounded-s-none"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? "Hide" : "Show"}
                  >
                    <i className={showConfirmPassword ? "ri-eye-off-line" : "ri-eye-line"} />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => !changePasswordLoading && setChangePasswordOpen(false)}
                  className="ti-btn ti-btn-light"
                  disabled={changePasswordLoading}
                >
                  Cancel
                </button>
                <button type="submit" className="ti-btn ti-btn-primary" disabled={changePasswordLoading}>
                  {changePasswordLoading ? "Updating…" : "Update password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Fragment>
  );
}
