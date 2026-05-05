"use client";

import React, { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Seo from "@/shared/layout-components/seo/seo";
import { ROUTES } from "@/shared/lib/constants";
import * as rolesApi from "@/shared/lib/api/roles";
import type { Role } from "@/shared/lib/types";
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

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(100);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewRole, setViewRole] = useState<Role | null>(null);

  const sortedRoles = useMemo(() => {
    const list = [...roles];
    return list.sort((a, b) => {
      if (a.name === "Administrator") return -1;
      if (b.name === "Administrator") return 1;
      return (a.name ?? "").localeCompare(b.name ?? "");
    });
  }, [roles]);

  const fetchRoles = async () => {
    setLoading(true);
    setError("");
    try {
      const rolesRes = await rolesApi.listRoles({ page, limit });
      setRoles(rolesRes.results);
      setTotalPages(rolesRes.totalPages);
      setTotalResults(rolesRes.totalResults);
    } catch (err) {
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : "Failed to load roles.";
      setError(msg);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, [page, limit]);

  const handleDelete = async (role: Role) => {
    const result = await Swal.fire({
      title: "Delete role?",
      text: `This will permanently delete the role "${role.name}". Users assigned this role will no longer inherit its permissions. This action cannot be undone.`,
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
      await rolesApi.deleteRole(role.id);
      await fetchRoles();
      await Swal.fire("Role deleted", "The role has been permanently deleted.", "success");
    } catch (err) {
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : "Failed to delete role.";
      await Swal.fire("Delete failed", msg, "error");
    }
  };

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, totalResults);

  const PERMISSIONS_VISIBLE = 3;

  return (
    <Fragment>
      <Seo title="User Roles" />
      <div className="relative mt-4 space-y-6 min-h-[50vh] w-full">
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_100%_60%_at_50%_-15%,rgba(99,102,241,0.07),transparent_50%)] dark:bg-[radial-gradient(ellipse_100%_60%_at_50%_-15%,rgba(99,102,241,0.12),transparent_50%)]" aria-hidden />

        <section className="rounded-2xl border border-defaultborder/70 bg-white dark:bg-bodybg shadow-sm shadow-black/[0.03] dark:shadow-none overflow-hidden transition-shadow duration-300 hover:shadow-md hover:shadow-black/[0.04] dark:hover:shadow-none">
          <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5 border-b border-defaultborder/50 bg-gradient-to-r from-slate-50/90 to-white dark:from-white/[0.03] dark:to-transparent">
            <div className="flex items-center gap-4 min-w-0">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/10 dark:ring-primary/20" aria-hidden>
                <i className="ri-shield-keyhole-line text-2xl" />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-defaulttextcolor dark:text-white tracking-tight flex items-center gap-2">
                  User Roles
                  <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 rounded-full text-[0.6875rem] font-semibold bg-primary/10 text-primary tabular-nums">
                    {totalResults}
                  </span>
                </h2>
                <p className="text-xs text-defaulttextcolor/60 dark:text-white/50 mt-0.5">Define roles, attach permissions, and see who's assigned</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="roles-page-size" className="sr-only">Rows per page</label>
              <select
                id="roles-page-size"
                className="rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-3 py-2 text-xs font-medium text-defaulttextcolor focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
              >
                {[10, 25, 50, 100].map((size) => (
                  <option key={size} value={size}>Show {size}</option>
                ))}
              </select>
              <Link
                href={ROUTES.settingsRolesAdd}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-primary/90 hover:shadow-md hover:shadow-primary/20 active:scale-[0.98]"
              >
                <i className="ri-add-line text-base" />
                Create Role
              </Link>
            </div>
          </div>

          <div className="px-6 py-6 space-y-5 bg-gradient-to-b from-slate-50/50 to-transparent dark:from-white/[0.02] dark:to-transparent">
            {error && (
              <div className="rounded-xl border border-danger/30 bg-danger/10 dark:bg-danger/15 px-4 py-3 text-sm text-danger flex items-start gap-2">
                <i className="ri-error-warning-line text-lg shrink-0" aria-hidden />
                <span>{error}</span>
              </div>
            )}

            <div className="overflow-x-auto rounded-xl border border-defaultborder/70 bg-white dark:bg-white/5">
              <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-defaultborder/70 bg-slate-50/80 dark:bg-white/5">
                        <th className="text-start text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70 px-4 py-3 w-12">
                          <input type="checkbox" className="form-check-input" readOnly aria-label="Select all" />
                        </th>
                        <th className="text-start text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70 px-4 py-3 w-14">#</th>
                        <th className="text-start text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70 px-4 py-3">Role</th>
                        <th className="text-start text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70 px-4 py-3">Permissions</th>
                        <th className="text-start text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70 px-4 py-3 whitespace-nowrap">Created</th>
                        <th className="text-center text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70 px-4 py-3">
                          <span className="block">Users</span>
                          <span className="block text-[0.6rem] font-normal text-defaulttextcolor/50 normal-case mt-0.5">total / active·pending</span>
                        </th>
                        <th className="text-end text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70 px-4 py-3 w-32">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-12 text-center">
                            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3 ring-1 ring-primary/10">
                              <i className="ri-loader-4-line animate-spin text-2xl" />
                            </div>
                            <p className="text-sm text-defaulttextcolor/70">Loading roles…</p>
                          </td>
                        </tr>
                      ) : sortedRoles.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-12 text-center">
                            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3 ring-1 ring-primary/10">
                              <i className="ri-shield-cross-line text-3xl" />
                            </div>
                            <p className="text-sm text-defaulttextcolor/70">No roles found. Create one to get started.</p>
                          </td>
                        </tr>
                      ) : (
                        sortedRoles.map((role, index) => {
                          const isAdministratorRole = role.name === "Administrator";
                          const initial = (role.name ?? "?").charAt(0).toUpperCase();
                          return (
                          <tr key={role.id} className="border-b border-defaultborder/50 last:border-0 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                            <td className="px-4 py-3 align-middle">
                              <input type="checkbox" className="form-check-input" aria-label={`Select ${role.name}`} />
                            </td>
                            <td className="px-4 py-3 align-middle text-defaulttextcolor/60 text-xs tabular-nums">{start + index}</td>
                            <td className="px-4 py-3 align-middle max-w-[220px]">
                              <div className="flex items-center gap-3 min-w-0">
                                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold ring-1 ${
                                  isAdministratorRole
                                    ? "bg-amber-500/10 text-amber-600 ring-amber-500/20"
                                    : "bg-primary/10 text-primary ring-primary/15"
                                }`} aria-hidden>
                                  {initial}
                                </span>
                                <div className="min-w-0">
                                  <span className="block truncate font-semibold text-defaulttextcolor dark:text-white" title={role.name}>{role.name}</span>
                                  {isAdministratorRole && (
                                    <span className="inline-flex items-center gap-1 text-[0.6rem] uppercase tracking-wider font-semibold text-amber-600 dark:text-amber-400 mt-0.5">
                                      <i className="ri-shield-star-line" /> System
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 align-middle">
                              <div className="flex flex-wrap gap-1 items-center">
                                {!role.permissions?.length ? (
                                  <span className="text-xs text-defaulttextcolor/50 italic">No permissions assigned</span>
                                ) : (
                                  <>
                                    {role.permissions.slice(0, PERMISSIONS_VISIBLE).map((p) => (
                                      <span
                                        key={p}
                                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[0.6875rem] font-medium bg-primary/10 text-primary ring-1 ring-primary/15"
                                      >
                                        {p}
                                      </span>
                                    ))}
                                    {role.permissions.length > PERMISSIONS_VISIBLE && (
                                      <button
                                        type="button"
                                        onClick={() => setViewRole(role)}
                                        className="text-[0.6875rem] text-primary hover:underline font-semibold tabular-nums"
                                      >
                                        +{role.permissions.length - PERMISSIONS_VISIBLE} more
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 align-middle text-xs text-defaulttextcolor/80 whitespace-nowrap tabular-nums">
                              {formatDate(role.createdAt)}
                            </td>
                            <td className="px-4 py-3 align-middle text-center">
                              <div className="inline-flex flex-col items-center">
                                <span className="text-sm font-semibold tabular-nums text-defaulttextcolor dark:text-white">
                                  {role.assigneeCountTotal ?? "—"}
                                </span>
                                <span className="text-[0.6875rem] text-defaulttextcolor/60 tabular-nums">
                                  {role.assigneeCountActivePending ?? "—"} active
                                </span>
                              </div>
                              {(role.name === "Employee" || role.name === "Candidate") &&
                                (role.assigneeCountTotal ?? 0) > (role.assigneeCountActivePending ?? 0) && (
                                  <span
                                    className="text-[0.625rem] text-defaulttextcolor/50 block max-w-[10rem] mx-auto leading-tight mt-1"
                                    title="ATS lists candidates whose account is active or pending. Disabled accounts stay in total until you remove the role."
                                  >
                                    ATS uses active/pending only
                                  </span>
                                )}
                            </td>
                            <td className="px-4 py-3 align-middle text-end">
                              <div className="inline-flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => setViewRole(role)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-success hover:bg-success/10 transition-colors"
                                  title="View"
                                  aria-label={`View ${role.name}`}
                                >
                                  <i className="ri-eye-line text-[1rem]" />
                                </button>
                                <Link
                                  href={ROUTES.settingsRolesEdit(role.id)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-primary hover:bg-primary/10 transition-colors"
                                  title="Edit"
                                  aria-label={`Edit ${role.name}`}
                                >
                                  <i className="ri-pencil-line text-[1rem]" />
                                </Link>
                                {!isAdministratorRole ? (
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(role)}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-danger hover:bg-danger/10 transition-colors"
                                    title="Delete"
                                    aria-label={`Delete ${role.name}`}
                                  >
                                    <i className="ri-delete-bin-line text-[1rem]" />
                                  </button>
                                ) : (
                                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-defaulttextcolor/30" title="System role — cannot be deleted" aria-hidden>
                                    <i className="ri-lock-line text-[1rem]" />
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        )})
                      )}
                    </tbody>
                  </table>
                </div>
                {!loading && sortedRoles.length > 0 && (
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

        {viewRole && (
          <div
            className="fixed inset-0 z-[10100] flex items-start sm:items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="role-detail-title"
            onClick={() => setViewRole(null)}
          >
            <div
              className="my-auto rounded-2xl border border-defaultborder/70 bg-white dark:bg-bodybg shadow-2xl shadow-black/30 w-full max-w-lg max-h-[calc(100vh-3rem)] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-defaultborder/50 bg-gradient-to-r from-slate-50/90 to-white dark:from-white/[0.03] dark:to-transparent shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-bold ring-1 ${
                    viewRole.name === "Administrator"
                      ? "bg-amber-500/10 text-amber-600 ring-amber-500/20"
                      : "bg-primary/10 text-primary ring-primary/15"
                  }`} aria-hidden>
                    {(viewRole.name ?? "?").charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <h3 id="role-detail-title" className="text-lg font-semibold text-defaulttextcolor dark:text-white truncate">{viewRole.name ?? "—"}</h3>
                    <p className="text-[0.6875rem] uppercase tracking-wider font-semibold text-defaulttextcolor/50 mt-0.5">Role details</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewRole(null)}
                  className="p-2 rounded-xl text-defaulttextcolor/70 hover:text-defaulttextcolor hover:bg-defaultborder/20 transition-colors shrink-0"
                  aria-label="Close"
                >
                  <i className="ri-close-line text-xl" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 bg-gradient-to-b from-slate-50/30 to-transparent dark:from-white/[0.02] dark:to-transparent">
                <div>
                  <dt className="text-[0.625rem] font-semibold text-defaulttextcolor/60 uppercase tracking-wider mb-2">Permissions</dt>
                  <dd>
                    {!viewRole.permissions?.length ? (
                      <span className="text-sm text-defaulttextcolor/50 italic">No permissions assigned.</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {viewRole.permissions.map((p) => (
                          <span
                            key={p}
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-[0.6875rem] font-medium bg-primary/10 text-primary ring-1 ring-primary/15"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    )}
                  </dd>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-[0.625rem] font-semibold text-defaulttextcolor/60 uppercase tracking-wider mb-1">Created</dt>
                    <dd className="text-sm font-medium text-defaulttextcolor dark:text-white tabular-nums">{formatDate(viewRole.createdAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-[0.625rem] font-semibold text-defaulttextcolor/60 uppercase tracking-wider mb-1">Status</dt>
                    <dd>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.6875rem] font-semibold ${
                          viewRole.status === "active"
                            ? "bg-success/10 text-success ring-1 ring-success/20"
                            : viewRole.status === "inactive"
                              ? "bg-warning/10 text-warning ring-1 ring-warning/20"
                              : "bg-defaultborder/40 text-defaulttextcolor/70"
                        }`}
                      >
                        {viewRole.status === "active" && <span className="h-1.5 w-1.5 rounded-full bg-success" />}
                        {viewRole.status ?? "—"}
                      </span>
                    </dd>
                  </div>
                </div>
                <div>
                  <dt className="text-[0.625rem] font-semibold text-defaulttextcolor/60 uppercase tracking-wider mb-2">Users</dt>
                  <dd className="rounded-xl border border-defaultborder/60 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[0.625rem] font-semibold uppercase tracking-wider text-defaulttextcolor/50 mb-1">Total</p>
                        <p className="text-2xl font-bold tabular-nums text-defaulttextcolor dark:text-white">{viewRole.assigneeCountTotal ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-[0.625rem] font-semibold uppercase tracking-wider text-defaulttextcolor/50 mb-1">Active · Pending</p>
                        <p className="text-2xl font-bold tabular-nums text-success">{viewRole.assigneeCountActivePending ?? "—"}</p>
                      </div>
                    </div>
                    {(viewRole.name === "Employee" || viewRole.name === "Candidate") &&
                      (viewRole.assigneeCountTotal ?? 0) > (viewRole.assigneeCountActivePending ?? 0) && (
                        <p className="text-[0.6875rem] text-defaulttextcolor/60 mt-3 leading-relaxed">
                          ATS candidates list only includes active/pending accounts (plus profile filters).
                        </p>
                      )}
                  </dd>
                </div>
                <div>
                  <dt className="text-[0.625rem] font-semibold text-defaulttextcolor/60 uppercase tracking-wider mb-1">Role ID</dt>
                  <dd className="text-[0.75rem] font-mono text-defaulttextcolor/70 break-all bg-defaultborder/15 dark:bg-white/[0.03] rounded-lg px-3 py-2">{viewRole.id}</dd>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-defaultborder/50 bg-slate-50/50 dark:bg-white/[0.02] shrink-0">
                <button
                  type="button"
                  onClick={() => setViewRole(null)}
                  className="inline-flex items-center gap-2 rounded-xl border border-defaultborder/80 px-4 py-2 text-sm font-medium text-defaulttextcolor hover:bg-defaultborder/20 dark:hover:bg-white/5 transition-colors"
                >
                  Close
                </button>
                <Link
                  href={ROUTES.settingsRolesEdit(viewRole.id)}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-primary/90 hover:shadow-md hover:shadow-primary/20 active:scale-[0.98]"
                  onClick={() => setViewRole(null)}
                >
                  <i className="ri-edit-line text-base" /> Edit Role
                </Link>
              </div>
            </div>
          </div>
        )}
    </Fragment>
  );
}
