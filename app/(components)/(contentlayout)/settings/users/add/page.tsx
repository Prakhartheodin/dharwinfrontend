"use client";

import React, { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import { ROUTES } from "@/shared/lib/constants";
import * as usersApi from "@/shared/lib/api/users";
import type { RegisterUserPayload } from "@/shared/lib/api/users";
import * as rolesApi from "@/shared/lib/api/roles";
import type { Role } from "@/shared/lib/types";
import { RolesDropdown } from "@/shared/components/roles-dropdown";
import { PhoneCountrySelect } from "@/shared/components/PhoneCountrySelect";
import { useAuth } from "@/shared/contexts/auth-context";
import {
  hasAnySettingsModulePermission,
  hasSettingsFeatureAction,
} from "@/shared/lib/permissions";
import { AxiosError } from "axios";
import Swal from "sweetalert2";

const PASSWORD_MIN_LENGTH = 8;

/** Roles that Agents are allowed to assign (no Administrator, Agent, or Manager). */
/** Agent may assign these roles. Include legacy "Candidate" until DB role is renamed to Employee. */
const AGENT_ASSIGNABLE_ROLE_NAMES = ["Employee", "Candidate", "Student", "Mentor"];

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
  const {
    user: currentUser,
    isAdministrator: authIsAdministrator,
    isPlatformSuperUser,
    permissions,
    permissionsLoaded,
  } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [countryCode, setCountryCode] = useState("IN");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [shortBio, setShortBio] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [degree, setDegree] = useState("");
  const [salaryRange, setSalaryRange] = useState("");
  const [accountStatus, setAccountStatus] = useState<"active" | "pending">("active");
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isAgent = useMemo(() => {
    if (!currentUser?.roleIds?.length || !roles.length) return false;
    const roleMap = new Map(roles.map((r) => [r.id, r]));
    return (currentUser.roleIds as string[]).some((id) => roleMap.get(id)?.name === "Agent");
  }, [currentUser?.roleIds, roles]);

  const isAdministratorFromRoles = useMemo(() => {
    if (!currentUser?.roleIds?.length || !roles.length) return false;
    const roleMap = new Map(roles.map((r) => [r.id, r]));
    return (currentUser.roleIds as string[]).some((id) => roleMap.get(id)?.name === "Administrator");
  }, [currentUser?.roleIds, roles]);
  const isAdministrator = isPlatformSuperUser || authIsAdministrator || isAdministratorFromRoles;

  const assignableRoles = useMemo(() => {
    if (isAdministrator) return roles;
    if (isAgent) return roles.filter((r) => AGENT_ASSIGNABLE_ROLE_NAMES.includes(r.name ?? ""));
    return roles;
  }, [roles, isAdministrator, isAgent]);

  const roleIdToName = useMemo(() => {
    const m = new Map<string, string>();
    roles.forEach((r) => m.set(r.id, (r.name ?? "").toLowerCase()));
    return m;
  }, [roles]);

  const selectionIncludesCandidate = useMemo(
    () => roleIds.some((id) => roleIdToName.get(id) === "candidate"),
    [roleIds, roleIdToName]
  );

  const selectionIncludesStudent = useMemo(
    () => roleIds.some((id) => roleIdToName.get(id) === "student"),
    [roleIds, roleIdToName]
  );

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

  useEffect(() => {
    if (!permissionsLoaded) return;
    if (isPlatformSuperUser) return;
    const raw = permissions ?? [];
    if (!hasAnySettingsModulePermission(raw)) return;
    if (!hasSettingsFeatureAction(raw, "users", "create")) {
      router.replace(ROUTES.settingsUsers);
    }
  }, [permissionsLoaded, permissions, isPlatformSuperUser, router]);

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
      const digits = phoneNumber.replace(/\D/g, "");
      const payload: RegisterUserPayload = {
        name: trimmedName,
        email: trimmedEmail,
        password,
        isEmailVerified: true,
        ...(roleIdsToSend.length > 0 && { roleIds: roleIdsToSend }),
        ...(isAdministrator && accountStatus === "pending" && { status: "pending" }),
        ...(digits && { phoneNumber: digits, countryCode: countryCode || undefined }),
        ...(selectionIncludesCandidate && {
          ...(employeeId.trim() && { employeeId: employeeId.trim() }),
          ...(shortBio.trim() && { shortBio: shortBio.trim() }),
          ...(joiningDate.trim() && { joiningDate: joiningDate.trim() }),
          ...(department.trim() && { department: department.trim() }),
          ...(designation.trim() && { designation: designation.trim() }),
          ...(degree.trim() && { degree: degree.trim() }),
          ...(salaryRange.trim() && { salaryRange: salaryRange.trim() }),
        }),
      };
      await usersApi.registerUser(payload);
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

  const inputCls = "w-full rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-defaulttextcolor placeholder:text-defaulttextcolor/45 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all";
  const labelCls = "mb-1.5 block text-xs font-semibold text-defaulttextcolor";
  const helpCls = "text-[0.6875rem] text-defaulttextcolor/60 mt-1.5";
  const sectionCls = "rounded-xl border border-defaultborder/60 bg-white dark:bg-white/[0.03] p-5";

  return (
    <Fragment>
      <Seo title="Add User" />
      <div className="relative mt-4 space-y-6 min-h-[50vh] w-full">
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_100%_60%_at_50%_-15%,rgba(99,102,241,0.07),transparent_50%)] dark:bg-[radial-gradient(ellipse_100%_60%_at_50%_-15%,rgba(99,102,241,0.12),transparent_50%)]" aria-hidden />

        <section className="rounded-2xl border border-defaultborder/70 bg-white dark:bg-bodybg shadow-sm shadow-black/[0.03] dark:shadow-none overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5 border-b border-defaultborder/50 bg-gradient-to-r from-slate-50/90 to-white dark:from-white/[0.03] dark:to-transparent">
            <div className="flex items-center gap-4 min-w-0">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/10 dark:ring-primary/20" aria-hidden>
                <i className="ri-user-add-line text-2xl" />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-defaulttextcolor dark:text-white tracking-tight">Add User</h2>
                <p className="text-xs text-defaulttextcolor/60 dark:text-white/50 mt-0.5">Create a new user account, assign roles, and set credentials</p>
              </div>
            </div>
            <Link href={ROUTES.settingsUsers} className="inline-flex items-center gap-2 rounded-xl border border-defaultborder/80 px-3 py-2 text-xs font-medium text-defaulttextcolor hover:bg-defaultborder/20 dark:hover:bg-white/5 transition-colors">
              <i className="ri-arrow-left-line" /> Back
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6 bg-gradient-to-b from-slate-50/50 to-transparent dark:from-white/[0.02] dark:to-transparent">
            {error && (
              <div className="rounded-xl border border-danger/30 bg-danger/10 dark:bg-danger/15 px-4 py-3 text-sm text-danger flex items-start gap-2">
                <i className="ri-error-warning-line text-lg shrink-0" aria-hidden />
                <span>{error}</span>
              </div>
            )}

            <div className={sectionCls}>
              <p className="text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70 mb-4 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary"><i className="ri-id-card-line text-base" /></span>
                Identity
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="user-name" className={labelCls}>Full name</label>
                  <input id="user-name" type="text" className={inputCls} placeholder="e.g. Jane Doe" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
                </div>
                <div>
                  <label htmlFor="user-email" className={labelCls}>Email <span className="text-danger">*</span></label>
                  <input id="user-email" type="email" className={inputCls} placeholder="jane.doe@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                </div>
              </div>
            </div>

            <div className={sectionCls}>
              <p className="text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70 mb-4 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary"><i className="ri-shield-user-line text-base" /></span>
                Access &amp; roles
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className={isAdministrator ? "" : "sm:col-span-2"}>
                  <label className={labelCls}>Roles</label>
                  {rolesLoading ? (
                    <div className="rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-defaulttextcolor/60 italic">Loading roles…</div>
                  ) : (
                    <RolesDropdown roles={assignableRoles} selectedIds={roleIds} onToggle={handleRoleToggle} placeholder="Select roles…" />
                  )}
                  <p className={helpCls}>
                    {isAgent ? "Agents can only assign Candidate, Student, or Mentor roles." : "Optional. Search and select one or more roles."}
                  </p>
                </div>
                {isAdministrator && (
                  <div>
                    <label htmlFor="user-account-status" className={labelCls}>Account status</label>
                    <select id="user-account-status" className={inputCls + " min-h-[2.75rem]"} value={accountStatus} onChange={(e) => setAccountStatus(e.target.value as "active" | "pending")}>
                      <option value="active">Active — sign in immediately</option>
                      <option value="pending">Pending — admin must activate</option>
                    </select>
                    <p className={helpCls}>Pending blocks sign-in until an admin activates the user.</p>
                  </div>
                )}
              </div>
            </div>

            <div className={sectionCls}>
              <p className="text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70 mb-1 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary"><i className="ri-phone-line text-base" /></span>
                Contact &amp; profile
              </p>
              <p className="text-[0.6875rem] text-defaulttextcolor/60 mb-4 ms-9">
                Optional. Used on the user account and any linked Candidate / Student record.
                {selectionIncludesStudent && (
                  <span className="block mt-1">With the <strong>Student</strong> role a training profile is auto-created; joining date is taken from the candidate record if linked.</span>
                )}
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                <div className="sm:col-span-4">
                  <label className={labelCls}>Country</label>
                  <PhoneCountrySelect value={countryCode} onChange={setCountryCode} className="w-full" />
                </div>
                <div className="sm:col-span-8">
                  <label htmlFor="user-phone" className={labelCls}>Phone</label>
                  <input id="user-phone" type="tel" className={inputCls} placeholder="Digits only" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} autoComplete="tel" />
                </div>
              </div>
            </div>

            {selectionIncludesCandidate && (
              <div className="rounded-xl border border-primary/30 bg-primary/[0.04] dark:bg-primary/[0.06] p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary"><i className="ri-briefcase-line text-base" /></span>
                  Candidate (ATS) profile
                </p>
                <p className="text-[0.6875rem] text-defaulttextcolor/60 mb-4 ms-9">Saved to the candidate profile created with this user. Leave Employee ID blank to auto-assign.</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                  <div className="sm:col-span-6">
                    <label htmlFor="user-employee-id" className={labelCls}>Employee ID</label>
                    <input id="user-employee-id" type="text" className={inputCls} placeholder="Optional — auto-assigned if empty" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} />
                  </div>
                  <div className="sm:col-span-6">
                    <label htmlFor="user-joining-date" className={labelCls}>Joining date</label>
                    <input id="user-joining-date" type="date" className={inputCls} value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} />
                  </div>
                  <div className="sm:col-span-12">
                    <label htmlFor="user-short-bio" className={labelCls}>Short bio</label>
                    <textarea id="user-short-bio" className={inputCls + " resize-none"} rows={3} placeholder="Brief professional summary (optional)" value={shortBio} onChange={(e) => setShortBio(e.target.value)} />
                  </div>
                  <div className="sm:col-span-6">
                    <label htmlFor="user-department" className={labelCls}>Department</label>
                    <input id="user-department" type="text" className={inputCls} placeholder="e.g. Engineering" value={department} onChange={(e) => setDepartment(e.target.value)} />
                  </div>
                  <div className="sm:col-span-6">
                    <label htmlFor="user-designation" className={labelCls}>Designation / title</label>
                    <input id="user-designation" type="text" className={inputCls} placeholder="e.g. Software Engineer" value={designation} onChange={(e) => setDesignation(e.target.value)} />
                  </div>
                  <div className="sm:col-span-6">
                    <label htmlFor="user-degree" className={labelCls}>Highest degree</label>
                    <input id="user-degree" type="text" className={inputCls} placeholder="e.g. B.Tech Computer Science" value={degree} onChange={(e) => setDegree(e.target.value)} />
                  </div>
                  <div className="sm:col-span-6">
                    <label htmlFor="user-salary-range" className={labelCls}>Salary range</label>
                    <input id="user-salary-range" type="text" className={inputCls} placeholder="e.g. 8–12 LPA" value={salaryRange} onChange={(e) => setSalaryRange(e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            <div className={sectionCls}>
              <p className="text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70 mb-4 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary"><i className="ri-lock-2-line text-base" /></span>
                Password
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="user-password" className={labelCls}>Password <span className="text-danger">*</span></label>
                  <div className="relative">
                    <input id="user-password" type={showPassword ? "text" : "password"} className={inputCls + " pe-10"} placeholder="Min 8 chars, 1 letter + 1 number" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} />
                    <button type="button" onClick={() => setShowPassword((p) => !p)} className="absolute top-1/2 -translate-y-1/2 end-3 p-1 text-defaulttextcolor/70 hover:text-defaulttextcolor transition-colors" aria-label={showPassword ? "Hide password" : "Show password"}>
                      <i className={showPassword ? "ri-eye-off-line text-[1.125rem]" : "ri-eye-line text-[1.125rem]"} />
                    </button>
                  </div>
                  <p className={helpCls}>Minimum 8 chars; at least 1 letter + 1 number.</p>
                </div>
                <div>
                  <label htmlFor="user-confirm-password" className={labelCls}>Confirm password <span className="text-danger">*</span></label>
                  <div className="relative">
                    <input id="user-confirm-password" type={showConfirmPassword ? "text" : "password"} className={inputCls + " pe-10"} placeholder="Re-enter password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
                    <button type="button" onClick={() => setShowConfirmPassword((p) => !p)} className="absolute top-1/2 -translate-y-1/2 end-3 p-1 text-defaulttextcolor/70 hover:text-defaulttextcolor transition-colors" aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}>
                      <i className={showConfirmPassword ? "ri-eye-off-line text-[1.125rem]" : "ri-eye-line text-[1.125rem]"} />
                    </button>
                  </div>
                  <p className={helpCls}>Must match password above.</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-4 border-t border-defaultborder/50">
              <Link href={ROUTES.settingsUsers} className="inline-flex items-center gap-2 rounded-xl border border-defaultborder/80 px-5 py-2.5 text-sm font-medium text-defaulttextcolor hover:bg-defaultborder/20 dark:hover:bg-white/5 transition-colors">
                Cancel
              </Link>
              <button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-primary/90 hover:shadow-md hover:shadow-primary/20 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none">
                {loading ? (
                  <><i className="ri-loader-4-line animate-spin text-base" /> Creating…</>
                ) : (
                  <><i className="ri-user-add-line text-base" /> Create User</>
                )}
              </button>
            </div>
          </form>
        </section>
      </div>
    </Fragment>
  );
}
