"use client";

import React, { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Seo from "@/shared/layout-components/seo/seo";
import { useAuth } from "@/shared/contexts/auth-context";
import { ROUTES } from "@/shared/lib/constants";
import * as usersApi from "@/shared/lib/api/users";
import { createSupportCameraInvite } from "@/shared/lib/api/support-camera-invite";
import * as rolesApi from "@/shared/lib/api/roles";
import type { User, Role } from "@/shared/lib/types";
import { AxiosError } from "axios";
import Swal from "sweetalert2";

function formatDate(isoString: string | undefined): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "—";
  }
}

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "disabled", label: "Disabled" },
  { value: "deleted", label: "Deleted" },
] as const;

export default function SettingsUsersPage() {
  const {
    user: currentUser,
    startImpersonation,
    isLoading: authLoading,
    isAdministrator: authIsAdministrator,
    isPlatformSuperUser,
    isDesignatedSuperadmin,
  } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewUser, setViewUser] = useState<User | null>(null);
  const [impersonatingUserId, setImpersonatingUserId] = useState<string | null>(null);

  // Client-side filters (no API calls when these change)
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const rolesById = useMemo(() => {
    const map = new Map<string, Role>();
    roles.forEach((r) => map.set(r.id, r));
    return map;
  }, [roles]);

  /** Administrator from API / platform super; also matches role name once roles are loaded. */
  const isAdministratorFromRoles = useMemo(() => {
    if (!currentUser) return false;
    const ids = currentUser.roleIds ?? [];
    return ids.some((id) => rolesById.get(id)?.name === "Administrator");
  }, [currentUser, rolesById]);
  const isAdministrator = isPlatformSuperUser || authIsAdministrator || isAdministratorFromRoles;

  /** Current user has Agent role (by role name in roleIds). */
  const isAgent = useMemo(() => {
    if (!currentUser) return false;
    const ids = currentUser.roleIds ?? [];
    return ids.some((id) => rolesById.get(id)?.name === "Agent");
  }, [currentUser, rolesById]);

  /** True if user has Administrator, Agent, or Manager role. Agents cannot edit these users. */
  const userHasRestrictedRole = (user: User): boolean => {
    const ids = user.roleIds ?? [];
    return ids.some((id) => {
      const name = rolesById.get(id)?.name;
      return name === "Administrator" || name === "Agent" || name === "Manager";
    });
  };

  const getPermissionsForUser = (user: User): string[] => {
    const ids = user.roleIds ?? [];
    const perms = new Set<string>();
    ids.forEach((id) => {
      const role = rolesById.get(id);
      role?.permissions?.forEach((p) => perms.add(p));
    });
    return Array.from(perms);
  };

  /** Permission summary for table: "Inherited from Role: X" or "From N roles: A + B". */
  const getPermissionSummaryFromRoles = (user: User): string => {
    const ids = user.roleIds ?? [];
    if (ids.length === 0) return "No roles assigned";
    const names = ids.map((id) => rolesById.get(id)?.name ?? id).filter(Boolean);
    if (names.length === 1) return `Inherited from Role: ${names[0]}`;
    return `From ${names.length} roles: ${names.join(" + ")}`;
  };

  // Filter users in memory by search (name, email), roleIds, and status
  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = users.filter((user) => {
      if (q) {
        const name = (user.name ?? "").toLowerCase();
        const email = (user.email ?? "").toLowerCase();
        if (!name.includes(q) && !email.includes(q)) return false;
      }
      if (roleFilter === "__unassigned__") {
        // Show only users with no roles assigned
        if ((user.roleIds ?? []).length > 0) return false;
      } else if (roleFilter && !(user.roleIds ?? []).includes(roleFilter)) {
        return false;
      }
      if (statusFilter && (user.status ?? "") !== statusFilter) return false;
      return true;
    });
    
    // Sort: Users with assigned roles first, then unassigned users
    return filtered.sort((a, b) => {
      const aHasRoles = (a.roleIds ?? []).length > 0;
      const bHasRoles = (b.roleIds ?? []).length > 0;
      
      // If one has roles and the other doesn't, prioritize the one with roles
      if (aHasRoles && !bHasRoles) return -1;
      if (!aHasRoles && bHasRoles) return 1;
      
      // If both have same role status, maintain original order (by createdAt or name)
      const aDate = new Date(a.createdAt ?? 0).getTime();
      const bDate = new Date(b.createdAt ?? 0).getTime();
      return bDate - aDate; // Newer first
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  const totalResults = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / limit));
  const paginatedUsers = useMemo(
    () => filteredUsers.slice((page - 1) * limit, page * limit),
    [filteredUsers, page, limit]
  );

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const [usersRes, rolesRes] = await Promise.all([
        usersApi.listUsers({ limit: 500 }),
        rolesApi.listRoles({ limit: 100 }),
      ]);
      setUsers(usersRes.results ?? []);
      setRoles(rolesRes.results ?? []);
    } catch (err) {
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : "Failed to load users.";
      setError(msg);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, roleFilter, statusFilter]);

  const handleClearFilters = () => {
    setSearchQuery("");
    setRoleFilter("");
    setStatusFilter("");
    setPage(1);
  };

  const hasActiveFilters = searchQuery.trim() !== "" || roleFilter !== "" || statusFilter !== "";

  const handleDelete = async (user: User) => {
    const result = await Swal.fire({
      title: "Delete user?",
      text: `This will permanently remove "${user.name ?? user.email}" and revoke their access. This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Confirm",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6c757d",
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;

    try {
      await usersApi.deleteUser(user.id);
      await fetchUsers();
      await Swal.fire("User deleted", "The user has been permanently deleted.", "success");
    } catch (err) {
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : "Failed to delete user.";
      await Swal.fire("Delete failed", msg, "error");
    }
  };

  const handleSupportCameraInvite = async (targetUser: User) => {
    const nameOrEmail = targetUser.name ?? targetUser.email ?? "this user";
    const pre = await Swal.fire({
      title: "Request live camera session?",
      html: `<p class="text-start text-sm mb-0">This creates a <strong>consent-based</strong> link for <strong>${nameOrEmail}</strong>. They must open the link while signed in and allow camera access in their browser. You cannot turn on their camera remotely.</p>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Create invite",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#7c3aed",
      cancelButtonColor: "#6c757d",
      reverseButtons: true,
    });
    if (!pre.isConfirmed) return;

    try {
      const out = await createSupportCameraInvite(targetUser.id);
      const hostUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/support/camera/host?t=${encodeURIComponent(out.inviteToken)}`
          : "";
      await Swal.fire({
        title: "Invite ready",
        html: `<div class="text-start text-sm space-y-3">
          <p><strong>Send this link</strong> to the user (expires in ~30 min):</p>
          <textarea readonly class="form-control text-xs font-mono" rows="3">${out.joinUrl}</textarea>
          <p class="mb-0">Then open the <strong>viewer</strong> in another tab to see their video after they join.</p>
        </div>`,
        icon: "success",
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: "Copy user link",
        denyButtonText: "Open viewer",
        cancelButtonText: "Close",
        confirmButtonColor: "#0d9488",
        denyButtonColor: "#7c3aed",
      }).then((res) => {
        if (res.isConfirmed) {
          void navigator.clipboard.writeText(out.joinUrl).catch(() => {});
        }
        if (res.isDenied && hostUrl) {
          window.open(hostUrl, "_blank", "noopener,noreferrer");
        }
      });
    } catch (err) {
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : "Failed to create invite.";
      await Swal.fire("Could not create invite", msg, "error");
    }
  };

  const handleImpersonate = async (targetUser: User) => {
    const nameOrEmail = targetUser.name ?? targetUser.email ?? "this user";
    const result = await Swal.fire({
      title: "Login as user?",
      text: `You will temporarily enter the system as "${nameOrEmail}". You will only have this user\u2019s permissions and can exit impersonation at any time.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Confirm",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#0d9488",
      cancelButtonColor: "#6c757d",
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;

    setImpersonatingUserId(targetUser.id);
    try {
      await startImpersonation(targetUser.id, nameOrEmail);
    } catch (err) {
      setImpersonatingUserId(null);
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : "Failed to start impersonation.";
      await Swal.fire("Impersonation failed", msg, "error");
    } finally {
      setImpersonatingUserId(null);
    }
  };

  const start = totalResults === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, totalResults);

  return (
    <Fragment>
      <Seo title="Users" />
      <div className="flex items-center justify-between flex-wrap gap-4 mb-4 px-4 pt-4">
        <h5 className="box-title mb-0">
          Users
          <span className="badge bg-light text-default rounded-full ms-1 text-[0.75rem] align-middle">
            {totalResults}
          </span>
        </h5>
        <div className="flex flex-wrap gap-2">
          <select
            className="form-control !w-auto !py-1 !px-4 !text-[0.75rem] me-2"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          >
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>
                Show {size}
              </option>
            ))}
          </select>
          <Link
            href={ROUTES.settingsUsersAdd}
            className="ti-btn ti-btn-primary !py-1.5 !px-3 !text-[0.8125rem]"
          >
            <i className="ri-add-line me-1 align-middle"></i>Add User
          </Link>
        </div>
      </div>
      <div className="box-body px-4 pb-4">
        {error && (
          <div className="p-4 mb-4 bg-danger/10 border border-danger/30 text-danger rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Client-side filters (no API calls) */}
        <div className="mb-4 p-4 rounded-lg border border-defaultborder bg-gray-50/50 dark:bg-gray-800/30 flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-2 text-defaulttextcolor/80">
            <i className="ri-filter-3-line text-[1.25rem]"></i>
            <span className="text-[0.8125rem] font-medium">Filter</span>
          </div>
          <div className="min-w-[12rem]">
            <label htmlFor="users-search" className="form-label !text-[0.75rem] mb-1">Search by name or email</label>
            <input
              id="users-search"
              type="text"
              className="form-control !py-1.5 !text-[0.8125rem]"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="min-w-[10rem]">
            <label htmlFor="users-filter-role" className="form-label !text-[0.75rem] mb-1">Role</label>
            <select
              id="users-filter-role"
              className="form-control form-select !py-1.5 !text-[0.8125rem]"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">All roles</option>
              <option value="__unassigned__">Unassigned</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[10rem]">
            <label htmlFor="users-filter-status" className="form-label !text-[0.75rem] mb-1">Status</label>
            <select
              id="users-filter-status"
              className="form-control form-select !py-1.5 !text-[0.8125rem]"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value || "all"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          {hasActiveFilters && (
            <button type="button" onClick={handleClearFilters} className="ti-btn ti-btn-light !py-1.5 !px-3 !text-[0.8125rem]">
              Clear filters
            </button>
          )}
        </div>

        <div className="table-responsive overflow-x-auto">
          <table className="table min-w-full table-bordered border-defaultborder">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50">
                <th className="px-4 py-2.5 text-start font-semibold">User Name</th>
                <th className="px-4 py-2.5 text-start font-semibold">Email</th>
                <th className="px-4 py-2.5 text-start font-semibold">Role</th>
                <th className="px-4 py-2.5 text-start font-semibold">Permissions</th>
                <th className="px-4 py-2.5 text-start font-semibold">Status</th>
                <th className="px-4 py-2.5 text-start font-semibold">Date Created</th>
                <th className="px-4 py-2.5 text-center font-semibold min-w-[11rem] whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-defaulttextcolor/70">
                    Loading...
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-defaulttextcolor/70">
                    {hasActiveFilters ? "No users match your filters." : "No users found."}
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => {
                  const isPrimaryAdmin = user.email === "admin@gmail.com";
                  const roleIds = user.roleIds ?? [];
                  return (
                    <tr key={user.id} className="border-b border-defaultborder">
                      <td className="px-4 py-2.5 align-middle font-medium">
                        {user.name ?? user.email ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 align-middle">{user.email ?? "—"}</td>
                      <td className="px-4 py-2.5 align-middle">
                        {roleIds.length === 0 ? (
                          "—"
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {roleIds.map((id) => (
                              <span
                                key={id}
                                className="badge bg-primary/10 text-primary border border-primary/30 px-2 py-0.5 rounded-full text-xs font-medium"
                              >
                                {rolesById.get(id)?.name ?? id}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 align-middle text-[0.8125rem] text-defaulttextcolor">
                        {getPermissionSummaryFromRoles(user)}
                      </td>
                      <td className="px-4 py-2.5 align-middle">
                        <span
                          className={`badge rounded-full text-[0.75rem] ${
                            user.status === "active"
                              ? "bg-success/10 text-success border border-success/30"
                              : user.status === "disabled"
                                ? "bg-warning/10 text-warning border border-warning/30"
                                : "bg-default/10 text-default"
                          }`}
                        >
                          {user.status ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 align-middle text-[0.8125rem] text-defaulttextcolor">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-4 py-2.5 align-middle">
                        <div className="flex items-center justify-center gap-2">
                          <div className="hs-tooltip ti-main-tooltip">
                            <button
                              type="button"
                              onClick={() => setViewUser(user)}
                              className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-success"
                              aria-label={`View ${user.name ?? user.email}`}
                            >
                              <i className="ri-eye-line"></i>
                              <span className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700" role="tooltip">
                                View
                              </span>
                            </button>
                          </div>
                          {isAdministrator &&
                            currentUser?.id !== user.id &&
                            user.status === "active" && (
                              <div className="hs-tooltip ti-main-tooltip">
                                <button
                                  type="button"
                                  onClick={() => handleImpersonate(user)}
                                  disabled={authLoading || impersonatingUserId === user.id}
                                  className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-success"
                                  aria-label={`Login as ${user.name ?? user.email}`}
                                >
                                  <i className="ri-login-box-line"></i>
                                  <span className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700" role="tooltip">
                                    Login as
                                  </span>
                                </button>
                              </div>
                            )}
                          {isDesignatedSuperadmin &&
                            currentUser?.id !== user.id &&
                            user.status === "active" && (
                              <div className="hs-tooltip ti-main-tooltip">
                                <button
                                  type="button"
                                  onClick={() => handleSupportCameraInvite(user)}
                                  className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-warning"
                                  aria-label={`Request live camera session with ${user.name ?? user.email}`}
                                >
                                  <i className="ri-vidicon-line"></i>
                                  <span className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700" role="tooltip">
                                    Request camera session
                                  </span>
                                </button>
                              </div>
                            )}
                          {!isPrimaryAdmin && (
                            <>
                              {(!isAgent || !userHasRestrictedRole(user)) && (
                                <div className="hs-tooltip ti-main-tooltip">
                                  <Link
                                    href={ROUTES.settingsUsersEdit(user.id)}
                                    className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-info inline-flex items-center justify-center"
                                    aria-label={`Edit ${user.name ?? user.email}`}
                                  >
                                    <i className="ri-pencil-line"></i>
                                    <span className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700" role="tooltip">
                                      Edit User
                                    </span>
                                  </Link>
                                </div>
                              )}
                              <div className="hs-tooltip ti-main-tooltip">
                                <button
                                  type="button"
                                  onClick={() => handleDelete(user)}
                                  className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-danger"
                                  aria-label={`Delete ${user.name ?? user.email}`}
                                >
                                  <i className="ri-delete-bin-line"></i>
                                  <span className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700" role="tooltip">
                                    Delete User
                                  </span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!loading && (users.length > 0 || hasActiveFilters) && (
          <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t border-defaultborder">
            <p className="text-[0.8125rem] text-defaulttextcolor/70 mb-0">
              Showing {start} to {end} of {totalResults} entries
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="ti-btn ti-btn-sm ti-btn-soft-primary"
              >
                Prev
              </button>
              <span className="px-2 py-1 text-[0.8125rem]">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="ti-btn ti-btn-sm ti-btn-soft-primary"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User details modal */}
      {viewUser && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-detail-title"
          onClick={() => setViewUser(null)}
        >
          <div
            className="ti-modal-box w-full max-w-lg bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-defaultborder max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ti-modal-content flex flex-col max-h-[90vh]">
              <div className="ti-modal-header flex items-center justify-between px-4 py-3 border-b border-defaultborder shrink-0">
                <h6 id="user-detail-title" className="modal-title text-[1rem] font-semibold mb-0">
                  User Details
                </h6>
                <button
                  type="button"
                  onClick={() => setViewUser(null)}
                  className="!text-[1.25rem] !font-semibold text-defaulttextcolor hover:text-default"
                  aria-label="Close"
                >
                  <i className="ri-close-line"></i>
                </button>
              </div>
              <div className="ti-modal-body px-4 py-4 overflow-y-auto">
                <dl className="space-y-4">
                  <div>
                    <dt className="text-[0.75rem] font-medium text-defaulttextcolor/70 uppercase tracking-wide mb-1">User Name</dt>
                    <dd className="text-[0.9375rem]">{viewUser.name ?? viewUser.email ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-[0.75rem] font-medium text-defaulttextcolor/70 uppercase tracking-wide mb-1">Email</dt>
                    <dd className="text-[0.9375rem]">{viewUser.email ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-[0.75rem] font-medium text-defaulttextcolor/70 uppercase tracking-wide mb-1">Roles</dt>
                    <dd className="text-[0.9375rem]">
                      {(viewUser.roleIds ?? []).length === 0 ? (
                        "—"
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {(viewUser.roleIds ?? []).map((id) => (
                            <span
                              key={id}
                              className="badge bg-primary/10 text-primary border border-primary/30 px-2 py-0.5 rounded-full text-xs font-medium"
                            >
                              {rolesById.get(id)?.name ?? id}
                            </span>
                          ))}
                        </div>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[0.75rem] font-medium text-defaulttextcolor/70 uppercase tracking-wide mb-1">Permissions</dt>
                    <dd className="text-[0.9375rem]">
                      {getPermissionsForUser(viewUser).length === 0 ? (
                        "—"
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {getPermissionsForUser(viewUser).map((p) => (
                            <span
                              key={p}
                              className="badge bg-primary/10 text-primary border border-primary/30 px-2 py-0.5 rounded-full text-xs font-medium"
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[0.75rem] font-medium text-defaulttextcolor/70 uppercase tracking-wide mb-1">Status</dt>
                    <dd>
                      <span
                        className={`badge rounded-full text-[0.75rem] ${
                          viewUser.status === "active"
                            ? "bg-success/10 text-success border border-success/30"
                            : viewUser.status === "disabled"
                              ? "bg-warning/10 text-warning border border-warning/30"
                              : "bg-default/10 text-default"
                        }`}
                      >
                        {viewUser.status ?? "—"}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[0.75rem] font-medium text-defaulttextcolor/70 uppercase tracking-wide mb-1">User ID</dt>
                    <dd className="text-[0.8125rem] font-mono text-defaulttextcolor/80 break-all">{viewUser.id}</dd>
                  </div>
                </dl>
              </div>
              <div className="ti-modal-footer flex items-center justify-end gap-2 px-4 py-3 border-t border-defaultborder shrink-0">
                <button
                  type="button"
                  onClick={() => setViewUser(null)}
                  className="ti-btn ti-btn-light"
                >
                  Close
                </button>
                {(!isAgent || !userHasRestrictedRole(viewUser)) && (
                  <Link
                    href={ROUTES.settingsUsersEdit(viewUser.id)}
                    className="ti-btn ti-btn-primary"
                    onClick={() => setViewUser(null)}
                  >
                    Edit User
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  );
}
