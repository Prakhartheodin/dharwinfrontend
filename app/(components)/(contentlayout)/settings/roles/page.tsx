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
      <div className="flex items-center justify-between flex-wrap gap-4 mb-4 px-4 pt-4">
        <h5 className="box-title mb-0">
          User Roles
          <span className="badge bg-light text-default rounded-full ms-1 text-[0.75rem] align-middle">
            {totalResults}
          </span>
        </h5>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="roles-page-size" className="sr-only">
            Rows per page
          </label>
          <select
            id="roles-page-size"
            className="form-control select-show-page-size !w-auto !py-1.5 !text-[0.75rem] leading-tight me-0"
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
            href={ROUTES.settingsRolesAdd}
            className="ti-btn ti-btn-primary !py-1.5 !px-3 !text-[0.8125rem]"
          >
            <i className="ri-add-line me-1 align-middle"></i>Create Role
          </Link>
        </div>
      </div>
      <div className="box-body px-4 pb-4">
        {error && (
          <div className="p-4 mb-4 bg-danger/10 border border-danger/30 text-danger rounded-md text-sm">
            {error}
          </div>
        )}
        <div className="table-responsive overflow-x-auto">
                  <table className="table min-w-full table-bordered border-defaultborder">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800/50">
                        <th className="px-4 py-2.5 text-start font-semibold w-12">
                          <input type="checkbox" className="form-check-input" readOnly aria-label="Select all" />
                        </th>
                        <th className="px-4 py-2.5 text-start font-semibold">S.no.</th>
                        <th className="px-4 py-2.5 text-start font-semibold">Role</th>
                        <th className="px-4 py-2.5 text-start font-semibold">Permissions</th>
                        <th className="px-4 py-2.5 text-start font-semibold">Date Created</th>
                        <th className="px-4 py-2.5 text-center font-semibold">
                          <span className="block">Users</span>
                          <span className="block text-[0.65rem] font-normal text-defaulttextcolor/60 normal-case">
                            total / active·pending
                          </span>
                        </th>
                        <th className="px-4 py-2.5 text-center font-semibold w-24">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-defaulttextcolor/70">
                            Loading...
                          </td>
                        </tr>
                      ) : sortedRoles.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-defaulttextcolor/70">
                            No roles found.
                          </td>
                        </tr>
                      ) : (
                        sortedRoles.map((role, index) => {
                          const isAdministratorRole = role.name === "Administrator";
                          return (
                          <tr key={role.id} className="border-b border-defaultborder">
                            <td className="px-4 py-2.5 align-middle">
                              <input type="checkbox" className="form-check-input" aria-label={`Select ${role.name}`} />
                            </td>
                            <td className="px-4 py-2.5 align-middle">{start + index}</td>
                            <td className="px-4 py-2.5 align-middle font-medium">{role.name}</td>
                            <td className="px-4 py-2.5 align-middle">
                              <div className="flex flex-wrap gap-1 items-center">
                                {!role.permissions?.length ? (
                                  <span className="text-[0.8125rem] text-defaulttextcolor/60 italic">No permissions assigned</span>
                                ) : (
                                  <>
                                    {role.permissions.slice(0, PERMISSIONS_VISIBLE).map((p) => (
                                      <span
                                        key={p}
                                        className="inline-flex items-center px-2 py-0.5 rounded-md text-[0.75rem] font-medium bg-primary/10 text-primary border border-primary/20"
                                      >
                                        {p}
                                      </span>
                                    ))}
                                    {role.permissions.length > PERMISSIONS_VISIBLE && (
                                      <span className="text-[0.75rem] text-defaulttextcolor/70 font-medium">
                                        +{role.permissions.length - PERMISSIONS_VISIBLE} more
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 align-middle text-[0.8125rem] text-defaulttextcolor">
                              {formatDate(role.createdAt)}
                            </td>
                            <td className="px-4 py-2.5 align-middle text-center">
                              <span className="text-[0.8125rem] font-medium tabular-nums">
                                {role.assigneeCountTotal ?? "—"}
                              </span>
                              <span className="text-[0.8125rem] text-defaulttextcolor/70 tabular-nums block">
                                {role.assigneeCountActivePending ?? "—"}
                              </span>
                              {role.name === "Candidate" &&
                                (role.assigneeCountTotal ?? 0) > (role.assigneeCountActivePending ?? 0) && (
                                  <span
                                    className="text-[0.65rem] text-defaulttextcolor/50 block max-w-[10rem] mx-auto leading-tight mt-0.5"
                                    title="ATS lists candidates whose account is active or pending. Disabled accounts stay in total until you remove the role."
                                  >
                                    ATS uses active/pending row
                                  </span>
                                )}
                            </td>
                            <td className="px-4 py-2.5 align-middle">
                              <div className="flex items-center justify-center gap-2">
                                <div className="hs-tooltip ti-main-tooltip">
                                  <button
                                    type="button"
                                    onClick={() => setViewRole(role)}
                                    className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-success"
                                    aria-label={`View ${role.name}`}
                                  >
                                    <i className="ri-eye-line"></i>
                                    <span className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700" role="tooltip">
                                      View
                                    </span>
                                  </button>
                                </div>
                                <div className="hs-tooltip ti-main-tooltip">
                                  <Link
                                    href={ROUTES.settingsRolesEdit(role.id)}
                                    className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-info inline-flex items-center justify-center"
                                    aria-label={`Edit ${role.name}`}
                                  >
                                    <i className="ri-pencil-line"></i>
                                    <span className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700" role="tooltip">
                                      Edit User
                                    </span>
                                  </Link>
                                </div>
                                {!isAdministratorRole && (
                                  <div className="hs-tooltip ti-main-tooltip">
                                    <button
                                      type="button"
                                      onClick={() => handleDelete(role)}
                                      className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-danger"
                                      aria-label={`Delete ${role.name}`}
                                    >
                                      <i className="ri-delete-bin-line"></i>
                                      <span className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700" role="tooltip">
                                        Delete User
                                      </span>
                                    </button>
                                  </div>
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

        {/* Role details modal */}
        {viewRole && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="role-detail-title"
            onClick={() => setViewRole(null)}
          >
            <div
              className="ti-modal-box w-full max-w-lg bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-defaultborder max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="ti-modal-content flex flex-col max-h-[90vh]">
                <div className="ti-modal-header flex items-center justify-between px-4 py-3 border-b border-defaultborder shrink-0">
                  <h6 id="role-detail-title" className="modal-title text-[1rem] font-semibold mb-0">
                    Role Details
                  </h6>
                  <button
                    type="button"
                    onClick={() => setViewRole(null)}
                    className="!text-[1.25rem] !font-semibold text-defaulttextcolor hover:text-default"
                    aria-label="Close"
                  >
                    <i className="ri-close-line"></i>
                  </button>
                </div>
                <div className="ti-modal-body px-4 py-4 overflow-y-auto">
                  <dl className="space-y-4">
                    <div>
                      <dt className="text-[0.75rem] font-medium text-defaulttextcolor/70 uppercase tracking-wide mb-1">Role Name</dt>
                      <dd className="text-[0.9375rem] font-medium">{viewRole.name ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-[0.75rem] font-medium text-defaulttextcolor/70 uppercase tracking-wide mb-1">Permissions</dt>
                      <dd className="text-[0.9375rem]">
                        {!viewRole.permissions?.length ? (
                          <span className="text-defaulttextcolor/60 italic">No permissions assigned.</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {viewRole.permissions.map((p) => (
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
                      <dt className="text-[0.75rem] font-medium text-defaulttextcolor/70 uppercase tracking-wide mb-1">Date Created</dt>
                      <dd className="text-[0.9375rem]">{formatDate(viewRole.createdAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-[0.75rem] font-medium text-defaulttextcolor/70 uppercase tracking-wide mb-1">
                        Users (total / active·pending)
                      </dt>
                      <dd className="text-[0.9375rem] tabular-nums">
                        {viewRole.assigneeCountTotal ?? "—"} / {viewRole.assigneeCountActivePending ?? "—"}
                      </dd>
                      {viewRole.name === "Candidate" &&
                        (viewRole.assigneeCountTotal ?? 0) > (viewRole.assigneeCountActivePending ?? 0) && (
                          <p className="text-[0.75rem] text-defaulttextcolor/60 mt-1 mb-0">
                            The ATS candidates list only includes active and pending accounts (plus profile filters).
                          </p>
                        )}
                    </div>
                    <div>
                      <dt className="text-[0.75rem] font-medium text-defaulttextcolor/70 uppercase tracking-wide mb-1">Status</dt>
                      <dd>
                        <span
                          className={`badge rounded-full text-[0.75rem] ${
                            viewRole.status === "active"
                              ? "bg-success/10 text-success border border-success/30"
                              : viewRole.status === "inactive"
                                ? "bg-warning/10 text-warning border border-warning/30"
                                : "bg-default/10 text-default"
                          }`}
                        >
                          {viewRole.status ?? "—"}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[0.75rem] font-medium text-defaulttextcolor/70 uppercase tracking-wide mb-1">Role ID</dt>
                      <dd className="text-[0.8125rem] font-mono text-defaulttextcolor/80 break-all">{viewRole.id}</dd>
                    </div>
                  </dl>
                </div>
                <div className="ti-modal-footer flex items-center justify-end gap-2 px-4 py-3 border-t border-defaultborder shrink-0">
                  <button
                    type="button"
                    onClick={() => setViewRole(null)}
                    className="ti-btn ti-btn-light"
                  >
                    Close
                  </button>
                  <Link
                    href={ROUTES.settingsRolesEdit(viewRole.id)}
                    className="ti-btn ti-btn-primary"
                    onClick={() => setViewRole(null)}
                  >
                    Edit Role
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
    </Fragment>
  );
}
