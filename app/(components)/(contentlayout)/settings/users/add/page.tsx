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

                  {isAdministrator && (
                    <div className="mb-6">
                      <label htmlFor="user-account-status" className="form-label">
                        Account status
                      </label>
                      <select
                        id="user-account-status"
                        className="form-control"
                        value={accountStatus}
                        onChange={(e) => setAccountStatus(e.target.value as "active" | "pending")}
                      >
                        <option value="active">Active — can sign in immediately</option>
                        <option value="pending">Pending — must be activated before sign-in</option>
                      </select>
                      <p className="text-[0.75rem] text-defaulttextcolor/70 mt-1 mb-0">
                        Use Pending for users who should not access the app until an administrator activates them.
                      </p>
                    </div>
                  )}

                  <div className="mb-6">
                    <h6 className="text-[0.9375rem] font-semibold mb-3 text-defaulttextcolor dark:text-white/90">
                      Contact &amp; profile
                    </h6>
                    <p className="text-[0.75rem] text-defaulttextcolor/70 mb-4">
                      Optional. Phone and country are stored on the user account and used when creating linked Candidate or Student records.
                      {selectionIncludesStudent && (
                        <span className="block mt-1">
                          With the <strong>Student</strong> role, a training profile is created automatically; joining date can be set from the candidate record if this user is also a candidate.
                        </span>
                      )}
                    </p>
                    <div className="sm:grid grid-cols-12 gap-4">
                      <div className="col-span-12 sm:col-span-4">
                        <label className="form-label">Country</label>
                        <PhoneCountrySelect value={countryCode} onChange={setCountryCode} className="w-full" />
                      </div>
                      <div className="col-span-12 sm:col-span-8">
                        <label htmlFor="user-phone" className="form-label">
                          Phone
                        </label>
                        <input
                          id="user-phone"
                          type="tel"
                          className="form-control"
                          placeholder="Digits only"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          autoComplete="tel"
                        />
                      </div>
                    </div>
                  </div>

                  {selectionIncludesCandidate && (
                    <div className="mb-6 p-4 rounded-lg border border-defaultborder dark:border-white/10 bg-defaultbackground/40 dark:bg-white/[0.02]">
                      <h6 className="text-[0.9375rem] font-semibold mb-1 text-defaulttextcolor dark:text-white/90">
                        Candidate (ATS) profile
                      </h6>
                      <p className="text-[0.75rem] text-defaulttextcolor/70 mb-4">
                        These fields are saved to the candidate profile created for this user. Leave Employee ID blank to auto-assign (e.g. DBS…).
                      </p>
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="user-employee-id" className="form-label">
                            Employee ID
                          </label>
                          <input
                            id="user-employee-id"
                            type="text"
                            className="form-control"
                            placeholder="Optional — auto-assigned if empty"
                            value={employeeId}
                            onChange={(e) => setEmployeeId(e.target.value)}
                          />
                        </div>
                        <div>
                          <label htmlFor="user-joining-date" className="form-label">
                            Joining date
                          </label>
                          <input
                            id="user-joining-date"
                            type="date"
                            className="form-control"
                            value={joiningDate}
                            onChange={(e) => setJoiningDate(e.target.value)}
                          />
                        </div>
                        <div>
                          <label htmlFor="user-short-bio" className="form-label">
                            Short bio
                          </label>
                          <textarea
                            id="user-short-bio"
                            className="form-control"
                            rows={3}
                            placeholder="Brief professional summary (optional)"
                            value={shortBio}
                            onChange={(e) => setShortBio(e.target.value)}
                          />
                        </div>
                        <div className="sm:grid grid-cols-12 gap-4">
                          <div className="col-span-12 sm:col-span-6">
                            <label htmlFor="user-department" className="form-label">
                              Department
                            </label>
                            <input
                              id="user-department"
                              type="text"
                              className="form-control"
                              placeholder="e.g. Engineering"
                              value={department}
                              onChange={(e) => setDepartment(e.target.value)}
                            />
                          </div>
                          <div className="col-span-12 sm:col-span-6">
                            <label htmlFor="user-designation" className="form-label">
                              Designation / title
                            </label>
                            <input
                              id="user-designation"
                              type="text"
                              className="form-control"
                              placeholder="e.g. Software Engineer"
                              value={designation}
                              onChange={(e) => setDesignation(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="sm:grid grid-cols-12 gap-4">
                          <div className="col-span-12 sm:col-span-6">
                            <label htmlFor="user-degree" className="form-label">
                              Highest degree
                            </label>
                            <input
                              id="user-degree"
                              type="text"
                              className="form-control"
                              placeholder="e.g. B.Tech Computer Science"
                              value={degree}
                              onChange={(e) => setDegree(e.target.value)}
                            />
                          </div>
                          <div className="col-span-12 sm:col-span-6">
                            <label htmlFor="user-salary-range" className="form-label">
                              Salary range
                            </label>
                            <input
                              id="user-salary-range"
                              type="text"
                              className="form-control"
                              placeholder="e.g. 8–12 LPA (free text)"
                              value={salaryRange}
                              onChange={(e) => setSalaryRange(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

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
