"use client";

import React, { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import Seo from "@/shared/layout-components/seo/seo";
import Pageheader from "@/shared/layout-components/page-header/pageheader";
import { ROUTES } from "@/shared/lib/constants";
import * as rolesApi from "@/shared/lib/api/roles";
import type { Role } from "@/shared/lib/types";
import { AxiosError } from "axios";

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchRoles = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await rolesApi.listRoles({ page, limit });
      setRoles(res.results);
      setTotalPages(res.totalPages);
      setTotalResults(res.totalResults);
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
    if (!confirm(`Are you sure you want to delete the role "${role.name}"?`)) return;
    try {
      await rolesApi.deleteRole(role.id);
      fetchRoles();
    } catch (err) {
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : "Failed to delete role.";
      alert(msg);
    }
  };

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, totalResults);

  return (
    <Fragment>
      <Seo title="User Roles" />
      <Pageheader
        currentpage="User Roles"
        activepage="Roles"
        mainpage="User Roles"
      />
      <div className="container w-full max-w-full mx-auto">
        <div className="grid grid-cols-12 gap-6">
          <div className="xl:col-span-12 col-span-12">
            <div className="box">
              <div className="box-header flex flex-wrap items-center justify-between gap-4">
                <h5 className="box-title mb-0">User Roles {totalResults}</h5>
                <Link
                  href={ROUTES.rolesAdd}
                  className="ti-btn ti-btn-primary !py-1.5 !px-3 !text-[0.8125rem]"
                >
                  <i className="ri-add-line me-1 align-middle"></i>Create Role
                </Link>
              </div>
              <div className="box-body">
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
                        <th className="px-4 py-2.5 text-start font-semibold">Role Type</th>
                        <th className="px-4 py-2.5 text-start font-semibold">Permissions</th>
                        <th className="px-4 py-2.5 text-center font-semibold w-24">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-defaulttextcolor/70">
                            Loading...
                          </td>
                        </tr>
                      ) : roles.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-defaulttextcolor/70">
                            No roles found.
                          </td>
                        </tr>
                      ) : (
                        roles.map((role, index) => (
                          <tr key={role.id} className="border-b border-defaultborder">
                            <td className="px-4 py-2.5 align-middle">
                              <input type="checkbox" className="form-check-input" aria-label={`Select ${role.name}`} />
                            </td>
                            <td className="px-4 py-2.5 align-middle">{start + index}</td>
                            <td className="px-4 py-2.5 align-middle font-medium">{role.name}</td>
                            <td className="px-4 py-2.5 align-middle">
                              <div className="flex flex-wrap gap-1">
                                {role.permissions?.length
                                  ? role.permissions.map((p) => (
                                      <span
                                        key={p}
                                        className="inline-flex items-center px-2 py-0.5 rounded-md text-[0.75rem] font-medium bg-primary/10 text-primary border border-primary/20"
                                      >
                                        {p}
                                      </span>
                                    ))
                                  : "—"}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 align-middle">
                              <div className="flex items-center justify-center gap-2">
                                <Link
                                  href={ROUTES.rolesEdit(role.id)}
                                  className="ti-btn ti-btn-sm ti-btn-soft-primary !p-1.5"
                                  aria-label={`Edit ${role.name}`}
                                >
                                  <i className="ri-pencil-line text-[1rem]"></i>
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(role)}
                                  className="ti-btn ti-btn-sm ti-btn-soft-danger !p-1.5"
                                  aria-label={`Delete ${role.name}`}
                                >
                                  <i className="ri-delete-bin-line text-[1rem]"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {!loading && roles.length > 0 && (
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
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
}
