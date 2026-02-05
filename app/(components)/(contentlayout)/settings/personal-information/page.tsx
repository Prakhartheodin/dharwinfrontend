"use client";

import React, { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Seo from "@/shared/layout-components/seo/seo";
import { useAuth } from "@/shared/contexts/auth-context";
import { ROUTES } from "@/shared/lib/constants";
import * as authApi from "@/shared/lib/api/auth";
import * as rolesApi from "@/shared/lib/api/roles";
import * as usersApi from "@/shared/lib/api/users";
import type { Role } from "@/shared/lib/types";
import { AxiosError } from "axios";
import Swal from "sweetalert2";

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
  const { user, logout, sessions, checkAuth } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");

  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

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

  const rolesById = useMemo(() => {
    const map = new Map<string, Role>();
    roles.forEach((r) => map.set(r.id, r));
    return map;
  }, [roles]);

  const roleDisplayName = useMemo(() => {
    if (!user) return "—";
    const ids = user.roleIds ?? [];
    if (ids.length === 0) {
      const r = (user.role ?? "User").toString();
      return r.charAt(0).toUpperCase() + r.slice(1);
    }
    const names = ids.map((id) => rolesById.get(id)?.name).filter(Boolean);
    return names.length > 0 ? names.join(", ") : (user.role ?? "User").toString();
  }, [user, rolesById]);

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

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaveError("");
    setSaveSuccess("");

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const fullName = `${trimmedFirst} ${trimmedLast}`.trim();
    const trimmedEmail = email.trim();

    if (!trimmedFirst || !trimmedEmail) {
      setSaveError("First name and email are required.");
      return;
    }

    setSaveLoading(true);
    try {
      await usersApi.updateUser(user.id, {
        name: fullName || undefined,
        email: trimmedEmail || undefined,
      });
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
    setUserName(emailVal);
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
                <dd className="text-[0.9375rem]">{user?.email ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-[0.75rem] font-medium text-defaulttextcolor/70 uppercase tracking-wide mb-1">Role</dt>
                <dd className="text-[0.9375rem]">{roleDisplayName} (System)</dd>
              </div>
            </dl>
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
            <label className="form-label">User Name</label>
            <div className="input-group !flex-nowrap mb-3">
              <span className="input-group-text" id="basic-addon3">
                {user?.email ?? "—"}
              </span>
              <input
                type="text"
                className="form-control w-full rounded-md"
                id="basic-url"
                aria-describedby="basic-addon3"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
              />
            </div>
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
            />
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
