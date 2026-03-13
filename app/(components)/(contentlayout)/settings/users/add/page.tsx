"use client";

import React, { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import { ROUTES } from "@/shared/lib/constants";
import * as usersApi from "@/shared/lib/api/users";
import * as rolesApi from "@/shared/lib/api/roles";
import type { Role } from "@/shared/lib/types";
import { RolesDropdown } from "@/shared/components/roles-dropdown";
import { useAuth } from "@/shared/contexts/auth-context";
import { AxiosError } from "axios";
import Swal from "sweetalert2";

const PASSWORD_MIN_LENGTH = 8;

/** Roles that Agents are allowed to assign (no Administrator, Agent, or Manager). */
const AGENT_ASSIGNABLE_ROLE_NAMES = ["Candidate", "Student", "Mentor"];

function getErrorMessage(err: any): string {
  if (err instanceof AxiosError) {
    const msg = err.response?.data?.message;
    if (typeof msg === "string") return msg;
    const code = err.response?.data?.code;
    if (code === 400 && msg) return String(msg);
  }
  return "Failed to create user.";
}

export default function SettingsUsersAddPage() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isAgent = useMemo(() => {
    if (!currentUser?.roleIds?.length || !roles.length) return false;
    const roleMap = new Map(roles.map((r) => [r.id, r]));
    return (currentUser.roleIds as string[]).some((id) => roleMap.get(id)?.name === "Agent");
  }, [currentUser?.roleIds, roles]);

  const isAdministrator = useMemo(() => {
    if (!currentUser?.roleIds?.length || !roles.length) return false;
    const roleMap = new Map(roles.map((r) => [r.id, r]));
    return (currentUser.roleIds as string[]).some((id) => roleMap.get(id)?.name === "Administrator");
  }, [currentUser?.roleIds, roles]);

  const assignableRoles = useMemo(() => {
    if (isAdministrator) return roles;
    if (isAgent) return roles.filter((r) => AGENT_ASSIGNABLE_ROLE_NAMES.includes(r.name ?? ""));
    return roles;
  }, [roles, isAdministrator, isAgent]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await rolesApi.listRoles({ limit: 100 });
        if (!cancelled) setRoles(res.results ?? []);
      } catch {
        if (!cancelled) setRoles([]);
      } finally {
        if (!cancelled) setRolesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRoleToggle = (roleId: string) => {
    setRoleIds((prev: string[]) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedName) {
      setError("Name is required.");
      return;
    }
    if (!trimmedEmail) {
      setError("Email is required.");
      return;
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      setError("Password must contain at least 1 letter and 1 number.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const assignableIds = new Set(assignableRoles.map((r) => r.id));
      const roleIdsToSend = isAgent ? roleIds.filter((id) => assignableIds.has(id)) : roleIds;
      await usersApi.registerUser({
        name: trimmedName,
        email: trimmedEmail,
        password,
        isEmailVerified: true,
        ...(roleIdsToSend.length > 0 && { roleIds: roleIdsToSend }),
      });
      await Swal.fire({
        icon: "success",
        title: "User created",
        text: `The user "${trimmedName}" has been created successfully.`,
        toast: true,
        position: "top-end",
        timer: 3000,
        showConfirmButton: false,
        timerProgressBar: true,
      });
      router.push(ROUTES.settingsUsers);
    } catch (err) {
      setError(getErrorMessage(err));
      const msg = getErrorMessage(err);
      await Swal.fire({
        icon: "error",
        title: "Failed to create user",
        text: msg,
        toast: true,
        position: "top-end",
        timer: 4000,
        showConfirmButton: false,
        timerProgressBar: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Fragment>
      <Seo title="Add User" />
      <div className="container w-full max-w-full mx-auto">
        <div className="grid grid-cols-12 gap-6">
          <div className="xl:col-span-12 col-span-12">
            <div className="box">
              <div className="box-header flex items-center justify-between flex-wrap gap-4">
                <div className="box-title">Add User</div>
                <Link href={ROUTES.settingsUsers} className="ti-btn ti-btn-light !py-1 !px-2 !text-[0.75rem]">
                  <i className="ri-arrow-left-line me-1"></i>Back to Users
                </Link>
              </div>
              <div className="box-body">
                <form onSubmit={handleSubmit}>
                  {error && (
                    <div className="mb-6 p-4 bg-danger/10 border border-danger/30 text-danger rounded-md text-sm">
                      {error}
                    </div>
                  )}
                  <div className="mb-6">
                    <label htmlFor="user-name" className="form-label">
                      Full Name
                    </label>
                    <input
                      id="user-name"
                      type="text"
                      className="form-control"
                      placeholder="e.g. Jane Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                    />
                  </div>
                  <div className="mb-6">
                    <label htmlFor="user-email" className="form-label">
                      Email
                    </label>
                    <input
                      id="user-email"
                      type="email"
                      className="form-control"
                      placeholder="e.g. jane.doe@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>
                  <div className="mb-6">
                    <label className="form-label">Roles</label>
                    {rolesLoading ? (
                      <p className="text-[0.875rem] text-defaulttextcolor/70">Loading roles...</p>
                    ) : (
                      <RolesDropdown
                        roles={assignableRoles}
                        selectedIds={roleIds}
                        onToggle={handleRoleToggle}
                        placeholder="Select roles..."
                      />
                    )}
                    <p className="text-[0.75rem] text-defaulttextcolor/70 mt-1 mb-0">
                      {isAgent
                        ? "Agents can only assign Candidate, Student, or Mentor roles."
                        : "Optional. Search and select one or more roles."}
                    </p>
                  </div>
                  <div className="mb-6">
                    <label htmlFor="user-password" className="form-label">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="user-password"
                        type={showPassword ? "text" : "password"}
                        className="form-control pe-10"
                        placeholder="Min 8 characters, at least 1 letter and 1 number"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="new-password"
                        minLength={PASSWORD_MIN_LENGTH}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute top-1/2 -translate-y-1/2 end-3 p-1 text-defaulttextcolor/70 hover:text-defaulttextcolor"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        <i className={showPassword ? "ri-eye-off-line text-[1.25rem]" : "ri-eye-line text-[1.25rem]"} />
                      </button>
                    </div>
                    <p className="text-[0.75rem] text-defaulttextcolor/70 mt-1 mb-0">
                      Minimum 8 characters; must contain at least 1 letter and 1 number.
                    </p>
                  </div>
                  <div className="mb-6">
                    <label htmlFor="user-confirm-password" className="form-label">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        id="user-confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        className="form-control pe-10"
                        placeholder="Re-enter password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="absolute top-1/2 -translate-y-1/2 end-3 p-1 text-defaulttextcolor/70 hover:text-defaulttextcolor"
                        aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                      >
                        <i className={showConfirmPassword ? "ri-eye-off-line text-[1.25rem]" : "ri-eye-line text-[1.25rem]"} />
                      </button>
                    </div>
                    <p className="text-[0.75rem] text-defaulttextcolor/70 mt-1 mb-0">
                      Must match the password above. Not sent to the server.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      className="ti-btn ti-btn-primary"
                      disabled={loading}
                    >
                      {loading ? "Creating..." : "Create User"}
                    </button>
                    <Link href={ROUTES.settingsUsers} className="ti-btn ti-btn-light">
                      Cancel
                    </Link>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
}
