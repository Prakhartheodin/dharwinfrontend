"use client";

import React, { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Seo from "@/shared/layout-components/seo/seo";
import CallNowButton from "@/shared/components/CallNowButton";
import { useAuth } from "@/shared/contexts/auth-context";
import { ROUTES } from "@/shared/lib/constants";
import * as usersApi from "@/shared/lib/api/users";
import { createSupportCameraInvite } from "@/shared/lib/api/support-camera-invite";
import { fetchHrmWebRtcSignalingToken } from "@/shared/lib/api/hrm-webrtc";
import { HrmWebRtcClient } from "@/shared/lib/hrm-webrtc-client";
import * as rolesApi from "@/shared/lib/api/roles";
import type { User, Role } from "@/shared/lib/types";
import { AxiosError } from "axios";
import Swal from "sweetalert2";
import {
  hasAnySettingsModulePermission,
  hasSettingsFeatureAction,
} from "@/shared/lib/permissions";
import { canImpersonateUser } from "@/shared/lib/candidate-permissions";

function formatDate(isoString: string | undefined): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "—";
  }
}

function resolveHrmBackendUrl(apiUrl: string | null | undefined): string {
  const fromApi = (apiUrl ?? "").trim().replace(/\/+$/, "");
  if (fromApi) return fromApi;
  const raw = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_HRM_WEBRTC_BACKEND_URL : "";
  const fromEnv = String(raw ?? "")
    .trim()
    .replace(/\/+$/, "");
  return fromEnv;
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
    permissions,
    roleNames,
  } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewUser, setViewUser] = useState<User | null>(null);
  const [impersonatingUserId, setImpersonatingUserId] = useState<string | null>(null);

  /** Platform super or designated superadmin — matches HRM signaling token API. */
  const canHrmWebRtcFeed = Boolean(isPlatformSuperUser || isDesignatedSuperadmin);

  const canImpersonate = useMemo(
    () => canImpersonateUser(permissions ?? [], authIsAdministrator, isPlatformSuperUser),
    [permissions, authIsAdministrator, isPlatformSuperUser, roleNames]
  );

  const [feedModalUser, setFeedModalUser] = useState<User | null>(null);
  const [feedDeviceId, setFeedDeviceId] = useState("");
  const [feedStatus, setFeedStatus] = useState("");
  const [feedError, setFeedError] = useState("");
  const [feedConnecting, setFeedConnecting] = useState(false);
  const [feedClosing, setFeedClosing] = useState(false);
  const [feedLoadingDevices, setFeedLoadingDevices] = useState(false);
  const [onlineDevices, setOnlineDevices] = useState<string[]>([]);
  const hrmClientRef = useRef<HrmWebRtcClient | null>(null);
  const hrmVideoRef = useRef<HTMLVideoElement | null>(null);

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

  const { canCreateUsers, canEditUsers, canDeleteUsers } = useMemo(() => {
    const raw = permissions ?? [];
    const matrixMode = !isPlatformSuperUser && hasAnySettingsModulePermission(raw);
    if (isPlatformSuperUser) {
      return { canCreateUsers: true, canEditUsers: true, canDeleteUsers: true };
    }
    if (matrixMode) {
      return {
        canCreateUsers: hasSettingsFeatureAction(raw, "users", "create"),
        canEditUsers: hasSettingsFeatureAction(raw, "users", "edit"),
        canDeleteUsers: hasSettingsFeatureAction(raw, "users", "delete"),
      };
    }
    return {
      canCreateUsers: isAdministrator || isAgent,
      canEditUsers: isAdministrator || isAgent,
      canDeleteUsers: isAdministrator || isAgent,
    };
  }, [permissions, isPlatformSuperUser, isAdministrator, isAgent]);

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
      await startImpersonation(targetUser.id, nameOrEmail, { returnPathAfterStop: ROUTES.settingsUsers });
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

  useEffect(() => {
    if (!feedModalUser) return;
    const mapped = (feedModalUser.hrmDeviceId ?? "").trim();
    setFeedDeviceId(mapped);
    setFeedStatus("");
    setFeedError("");
    setOnlineDevices([]);
  }, [feedModalUser]);

  const closeHrmFeedModal = async () => {
    setFeedClosing(true);
    try {
      await hrmClientRef.current?.disconnect();
    } catch {
      /* ignore */
    }
    hrmClientRef.current = null;
    if (hrmVideoRef.current) {
      hrmVideoRef.current.srcObject = null;
    }
    setFeedModalUser(null);
    setFeedClosing(false);
  };

  const handleHrmListDevices = async () => {
    setFeedLoadingDevices(true);
    setFeedError("");
    try {
      await hrmClientRef.current?.disconnect();
      hrmClientRef.current = null;
      const { token, backendUrl } = await fetchHrmWebRtcSignalingToken();
      const base = resolveHrmBackendUrl(backendUrl);
      if (!base) {
        throw new Error(
          "HRM backend URL is not set. Configure HRM_WEBRTC_SIGNALING_BASE_URL on the API or NEXT_PUBLIC_HRM_WEBRTC_BACKEND_URL on the frontend."
        );
      }
      const client = new HrmWebRtcClient({
        backendUrl: base,
        bearerToken: token,
        onStream: (stream) => {
          if (hrmVideoRef.current) {
            hrmVideoRef.current.srcObject = stream;
            void hrmVideoRef.current.play().catch(() => {});
          }
        },
        onStatusChange: (s) => setFeedStatus(s),
      });
      hrmClientRef.current = client;
      await client.connect();
      const list = await client.getOnlineDevices();
      setOnlineDevices(Array.isArray(list) ? list : []);
    } catch (err) {
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : err instanceof Error
            ? err.message
            : "Could not list devices.";
      setFeedError(msg);
      await hrmClientRef.current?.disconnect();
      hrmClientRef.current = null;
    } finally {
      setFeedLoadingDevices(false);
    }
  };

  const handleHrmConnectFeed = async () => {
    const id = feedDeviceId.trim();
    if (!id) {
      setFeedError("Enter the HRM agent device ID (usually the Windows computer name).");
      return;
    }
    setFeedError("");
    setFeedConnecting(true);
    try {
      await hrmClientRef.current?.disconnect();
      hrmClientRef.current = null;
      if (hrmVideoRef.current) {
        hrmVideoRef.current.srcObject = null;
      }
      const { token, backendUrl } = await fetchHrmWebRtcSignalingToken();
      const base = resolveHrmBackendUrl(backendUrl);
      if (!base) {
        throw new Error(
          "HRM backend URL is not set. Configure HRM_WEBRTC_SIGNALING_BASE_URL on the API or NEXT_PUBLIC_HRM_WEBRTC_BACKEND_URL on the frontend."
        );
      }
      const client = new HrmWebRtcClient({
        backendUrl: base,
        bearerToken: token,
        onStream: (stream) => {
          if (hrmVideoRef.current) {
            hrmVideoRef.current.srcObject = stream;
            void hrmVideoRef.current.play().catch(() => {});
          }
        },
        onStatusChange: (s) => setFeedStatus(s),
      });
      hrmClientRef.current = client;
      await client.connect();
      await client.watchDevice(id);
    } catch (err) {
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : err instanceof Error
            ? err.message
            : "Failed to connect.";
      setFeedError(msg);
      await hrmClientRef.current?.disconnect();
      hrmClientRef.current = null;
    } finally {
      setFeedConnecting(false);
    }
  };

  const handleHrmStopStream = async () => {
    try {
      await hrmClientRef.current?.stopStream();
      if (hrmVideoRef.current) {
        hrmVideoRef.current.srcObject = null;
      }
    } catch {
      /* ignore */
    }
  };

  const start = totalResults === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, totalResults);

  return (
    <Fragment>
      <Seo title="Users" />
      <div className="relative mt-4 space-y-6 min-h-[50vh] w-full">
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_100%_60%_at_50%_-15%,rgba(99,102,241,0.07),transparent_50%)] dark:bg-[radial-gradient(ellipse_100%_60%_at_50%_-15%,rgba(99,102,241,0.12),transparent_50%)]" aria-hidden />

        <section className="rounded-2xl border border-defaultborder/70 bg-white dark:bg-bodybg shadow-sm shadow-black/[0.03] dark:shadow-none overflow-hidden transition-shadow duration-300 hover:shadow-md hover:shadow-black/[0.04] dark:hover:shadow-none">
          <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5 border-b border-defaultborder/50 bg-gradient-to-r from-slate-50/90 to-white dark:from-white/[0.03] dark:to-transparent">
            <div className="flex items-center gap-4 min-w-0">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/10 dark:ring-primary/20" aria-hidden>
                <i className="ri-team-line text-2xl" />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-defaulttextcolor dark:text-white tracking-tight flex items-center gap-2">
                  Users
                  <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 rounded-full text-[0.6875rem] font-semibold bg-primary/10 text-primary tabular-nums">
                    {totalResults}
                  </span>
                </h2>
                <p className="text-xs text-defaulttextcolor/60 dark:text-white/50 mt-0.5">Manage user accounts, roles, and access</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="users-page-size" className="sr-only">Rows per page</label>
              <select
                id="users-page-size"
                className="rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-3 py-2 text-xs font-medium text-defaulttextcolor focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
              >
                {[10, 25, 50, 100].map((size) => (
                  <option key={size} value={size}>Show {size}</option>
                ))}
              </select>
              {canCreateUsers && (
                <Link
                  href={ROUTES.settingsUsersAdd}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-primary/90 hover:shadow-md hover:shadow-primary/20 active:scale-[0.98] shrink-0"
                >
                  <i className="ri-add-line text-base" />
                  Add User
                </Link>
              )}
            </div>
          </div>

          <div className="px-6 py-6 space-y-5 bg-gradient-to-b from-slate-50/50 to-transparent dark:from-white/[0.02] dark:to-transparent">
            {error && (
              <div className="rounded-xl border border-danger/30 bg-danger/10 dark:bg-danger/15 px-4 py-3 text-sm text-danger flex items-start gap-2">
                <i className="ri-error-warning-line text-lg shrink-0" aria-hidden />
                <span>{error}</span>
              </div>
            )}

            <div className="rounded-xl border border-defaultborder/60 bg-white dark:bg-white/[0.03] p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden>
                  <i className="ri-filter-3-line text-base" />
                </span>
                <p className="text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70">Filters</p>
                {hasActiveFilters && (
                  <button type="button" onClick={handleClearFilters} className="ms-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[0.6875rem] font-medium text-primary hover:bg-primary/10 transition-colors">
                    <i className="ri-close-circle-line" /> Clear
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="users-search" className="mb-1.5 block text-xs font-semibold text-defaulttextcolor">Search</label>
                  <input
                    id="users-search"
                    type="text"
                    className="w-full rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-defaulttextcolor placeholder:text-defaulttextcolor/45 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="Name or email…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="users-filter-role" className="mb-1.5 block text-xs font-semibold text-defaulttextcolor">Role</label>
                  <select
                    id="users-filter-role"
                    className="w-full rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-defaulttextcolor focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all min-h-[2.75rem]"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                  >
                    <option value="">All roles</option>
                    <option value="__unassigned__">Unassigned</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="users-filter-status" className="mb-1.5 block text-xs font-semibold text-defaulttextcolor">Status</label>
                  <select
                    id="users-filter-status"
                    className="w-full rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-defaulttextcolor focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all min-h-[2.75rem]"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value || "all"} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-defaultborder/70 bg-white dark:bg-white/5">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-defaultborder/70 bg-slate-50/80 dark:bg-white/5">
                    <th className="text-start text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70 px-4 py-3">User</th>
                    <th className="text-start text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70 px-4 py-3">Email</th>
                    <th className="text-start text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70 px-4 py-3">Role</th>
                    <th className="text-start text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70 px-4 py-3">Permissions</th>
                    <th className="text-start text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70 px-4 py-3">Status</th>
                    <th className="text-start text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70 px-4 py-3 whitespace-nowrap">Created</th>
                    <th className="text-end text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70 px-4 py-3 min-w-[11rem] whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3 ring-1 ring-primary/10">
                      <i className="ri-loader-4-line animate-spin text-2xl" />
                    </div>
                    <p className="text-sm text-defaulttextcolor/70">Loading users…</p>
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3 ring-1 ring-primary/10">
                      <i className="ri-user-search-line text-3xl" />
                    </div>
                    <p className="text-sm text-defaulttextcolor/70">{hasActiveFilters ? "No users match your filters." : "No users found."}</p>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => {
                  const isPrimaryAdmin = user.email === "admin@gmail.com";
                  const roleIds = user.roleIds ?? [];
                  const initial = (user.name ?? user.email ?? "?").charAt(0).toUpperCase();
                  return (
                    <tr key={user.id} className="border-b border-defaultborder/50 last:border-0 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 align-middle max-w-[240px]">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold ring-1 ${
                            isPrimaryAdmin
                              ? "bg-amber-500/10 text-amber-600 ring-amber-500/20"
                              : "bg-primary/10 text-primary ring-primary/15"
                          }`} aria-hidden>
                            {initial}
                          </span>
                          <div className="min-w-0">
                            <span className="block truncate font-semibold text-defaulttextcolor dark:text-white" title={user.name ?? user.email ?? ""}>{user.name ?? user.email ?? "—"}</span>
                            {isPrimaryAdmin && (
                              <span className="inline-flex items-center gap-1 text-[0.6rem] uppercase tracking-wider font-semibold text-amber-600 dark:text-amber-400 mt-0.5">
                                <i className="ri-shield-star-line" /> Primary admin
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle max-w-[220px]">
                        <span className="block truncate text-defaulttextcolor/85 text-xs" title={user.email ?? ""}>{user.email ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        {roleIds.length === 0 ? (
                          <span className="text-xs text-defaulttextcolor/50 italic">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {roleIds.map((id) => (
                              <span
                                key={id}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-[0.6875rem] font-medium bg-primary/10 text-primary ring-1 ring-primary/15"
                              >
                                {rolesById.get(id)?.name ?? id}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 align-middle text-xs text-defaulttextcolor/80 max-w-[200px]">
                        <span className="block truncate" title={getPermissionSummaryFromRoles(user)}>{getPermissionSummaryFromRoles(user)}</span>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.6875rem] font-semibold ${
                            user.status === "active"
                              ? "bg-success/10 text-success ring-1 ring-success/20"
                              : user.status === "disabled"
                                ? "bg-warning/10 text-warning ring-1 ring-warning/20"
                                : "bg-defaultborder/40 text-defaulttextcolor/70"
                          }`}
                        >
                          {user.status === "active" && <span className="h-1.5 w-1.5 rounded-full bg-success" />}
                          {user.status ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-middle text-xs text-defaulttextcolor/80 whitespace-nowrap tabular-nums">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-4 py-3 align-middle text-end">
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setViewUser(user)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-success hover:bg-success/10 transition-colors"
                            title="View"
                            aria-label={`View ${user.name ?? user.email}`}
                          >
                            <i className="ri-eye-line text-[1rem]" />
                          </button>
                          {(user as { phoneNumber?: string }).phoneNumber ? (
                            <CallNowButton
                              phone={(user as { phoneNumber?: string }).phoneNumber}
                              name={user.name ?? user.email}
                              title="Call"
                            />
                          ) : null}
                          {canImpersonate &&
                            currentUser?.id !== user.id &&
                            user.status === "active" && (
                              <button
                                type="button"
                                onClick={() => handleImpersonate(user)}
                                disabled={authLoading || impersonatingUserId === user.id}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-emerald-600 hover:bg-emerald-500/10 disabled:opacity-40 transition-colors"
                                title="Login as"
                                aria-label={`Login as ${user.name ?? user.email}`}
                              >
                                <i className="ri-login-box-line text-[1rem]" />
                              </button>
                            )}
                          {isDesignatedSuperadmin &&
                            currentUser?.id !== user.id &&
                            user.status === "active" && (
                              <button
                                type="button"
                                onClick={() => handleSupportCameraInvite(user)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-warning hover:bg-warning/10 transition-colors"
                                title="Request camera session"
                                aria-label={`Request live camera session with ${user.name ?? user.email}`}
                              >
                                <i className="ri-vidicon-line text-[1rem]" />
                              </button>
                            )}
                          {canHrmWebRtcFeed &&
                            currentUser?.id !== user.id &&
                            user.status === "active" && (
                              <button
                                type="button"
                                onClick={() => setFeedModalUser(user)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-secondary hover:bg-secondary/10 transition-colors"
                                title="Feed in (HRM agent)"
                                aria-label={`HRM feed in for ${user.name ?? user.email}`}
                              >
                                <i className="ri-live-line text-[1rem]" />
                              </button>
                            )}
                          {!isPrimaryAdmin ? (
                            <>
                              {canEditUsers && (!isAgent || !userHasRestrictedRole(user)) && (
                                <Link
                                  href={ROUTES.settingsUsersEdit(user.id)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-primary hover:bg-primary/10 transition-colors"
                                  title="Edit"
                                  aria-label={`Edit ${user.name ?? user.email}`}
                                >
                                  <i className="ri-pencil-line text-[1rem]" />
                                </Link>
                              )}
                              {canDeleteUsers && (
                                <button
                                  type="button"
                                  onClick={() => handleDelete(user)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-danger hover:bg-danger/10 transition-colors"
                                  title="Delete"
                                  aria-label={`Delete ${user.name ?? user.email}`}
                                >
                                  <i className="ri-delete-bin-line text-[1rem]" />
                                </button>
                              )}
                            </>
                          ) : (
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-defaulttextcolor/30" title="Primary admin — system protected" aria-hidden>
                              <i className="ri-lock-line text-[1rem]" />
                            </span>
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
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-defaultborder/50">
            <p className="text-xs text-defaulttextcolor/70 mb-0 tabular-nums">
              Showing <span className="font-semibold text-defaulttextcolor">{start}</span>–<span className="font-semibold text-defaulttextcolor">{end}</span> of <span className="font-semibold text-defaulttextcolor">{totalResults}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 rounded-xl border border-defaultborder/80 px-3 py-2 text-xs font-medium text-defaulttextcolor hover:bg-defaultborder/20 dark:hover:bg-white/5 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <i className="ri-arrow-left-s-line" /> Prev
              </button>
              <span className="px-3 py-2 text-xs font-medium tabular-nums text-defaulttextcolor/80">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1 rounded-xl border border-defaultborder/80 px-3 py-2 text-xs font-medium text-defaulttextcolor hover:bg-defaultborder/20 dark:hover:bg-white/5 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                Next <i className="ri-arrow-right-s-line" />
              </button>
            </div>
          </div>
        )}
          </div>
        </section>
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
                {canEditUsers && (!isAgent || !userHasRestrictedRole(viewUser)) && (
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

      {feedModalUser && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="hrm-feed-title"
          onClick={() => void closeHrmFeedModal()}
        >
          <div
            className="ti-modal-box w-full max-w-2xl bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-defaultborder max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ti-modal-content flex flex-col max-h-[90vh]">
              <div className="ti-modal-header flex items-center justify-between px-4 py-3 border-b border-defaultborder shrink-0">
                <h6 id="hrm-feed-title" className="modal-title text-[1rem] font-semibold mb-0">
                  HRM feed in — {feedModalUser.name ?? feedModalUser.email ?? "User"}
                </h6>
                <button
                  type="button"
                  onClick={() => void closeHrmFeedModal()}
                  disabled={feedClosing}
                  className="!text-[1.25rem] !font-semibold text-defaulttextcolor hover:text-default"
                  aria-label="Close"
                >
                  <i className="ri-close-line"></i>
                </button>
              </div>
              <div className="ti-modal-body px-4 py-4 overflow-y-auto space-y-4">
                <p className="text-[0.8125rem] text-defaulttextcolor/80 mb-0">
                  When the agent is online, you get desktop video with a webcam picture-in-picture (if enabled), plus microphone and system audio. The device ID must match the agent&apos;s{" "}
                  <strong>RegisterDevice</strong> id (default: PC machine name). If this user has an{" "}
                  <strong>HRM device ID</strong> saved on their profile (Edit user), it is pre-filled here.
                </p>
                <div>
                  <label htmlFor="hrm-device-id" className="form-label !text-[0.75rem] mb-1">
                    Device ID
                  </label>
                  <input
                    id="hrm-device-id"
                    type="text"
                    className="form-control !py-1.5 !text-[0.8125rem]"
                    placeholder="e.g. DESKTOP-ABC123"
                    value={feedDeviceId}
                    onChange={(e) => setFeedDeviceId(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                {onlineDevices.length > 0 && (
                  <div>
                    <p className="text-[0.75rem] font-medium text-defaulttextcolor/70 mb-1">Online now</p>
                    <div className="flex flex-wrap gap-1">
                      {onlineDevices.map((d) => (
                        <button
                          key={d}
                          type="button"
                          className="badge bg-primary/10 text-primary border border-primary/30 px-2 py-1 rounded-full text-xs font-medium hover:bg-primary/20"
                          onClick={() => setFeedDeviceId(d)}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {feedError && (
                  <div className="p-3 rounded-md bg-danger/10 border border-danger/30 text-danger text-[0.8125rem]">{feedError}</div>
                )}
                {feedStatus && (
                  <p className="text-[0.75rem] text-defaulttextcolor/70 mb-0">
                    Status: <span className="font-mono">{feedStatus}</span>
                  </p>
                )}
                <div className="rounded-lg overflow-hidden bg-black aspect-video max-h-[320px] flex items-center justify-center">
                  <video ref={hrmVideoRef} className="w-full h-full object-contain" playsInline muted autoPlay />
                </div>
              </div>
              <div className="ti-modal-footer flex flex-wrap items-center justify-end gap-2 px-4 py-3 border-t border-defaultborder shrink-0">
                <button
                  type="button"
                  onClick={() => void handleHrmListDevices()}
                  disabled={feedLoadingDevices || feedConnecting || feedClosing}
                  className="ti-btn ti-btn-light !text-[0.8125rem]"
                >
                  {feedLoadingDevices ? "Loading…" : "List online devices"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleHrmStopStream()}
                  disabled={feedClosing}
                  className="ti-btn ti-btn-warning !text-[0.8125rem]"
                >
                  Stop stream
                </button>
                <button
                  type="button"
                  onClick={() => void handleHrmConnectFeed()}
                  disabled={feedConnecting || feedClosing}
                  className="ti-btn ti-btn-primary !text-[0.8125rem]"
                >
                  {feedConnecting ? "Connecting…" : "Connect"}
                </button>
                <button
                  type="button"
                  onClick={() => void closeHrmFeedModal()}
                  disabled={feedClosing}
                  className="ti-btn ti-btn-light !text-[0.8125rem]"
                >
                  {feedClosing ? "Closing…" : "Close"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  );
}
