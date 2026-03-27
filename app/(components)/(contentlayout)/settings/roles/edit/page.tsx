"use client";

import React, { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import Pageheader from "@/shared/layout-components/page-header/pageheader";
import { ROUTES } from "@/shared/lib/constants";
import * as rolesApi from "@/shared/lib/api/roles";
import {
  PERMISSION_SECTIONS,
  getUnmappedPermissionStrings,
  mergePermissionsForRoleSave,
  permissionsFromApi,
  permissionsToApi,
  type RolePermissionsState,
  type FeaturePermissions,
  type SectionPermissions,
} from "@/shared/lib/roles-permissions";
import { AxiosError } from "axios";
import Swal from "sweetalert2";

export default function RolesEditPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleId = searchParams.get("id") ?? "";

  const [name, setName] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [permissions, setPermissions] = useState<RolePermissionsState | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(PERMISSION_SECTIONS.map((s) => s.id))
  );
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  /** Raw strings from API; unmapped ones are merged back on save so nothing is dropped implicitly. */
  const [originalPermissionStrings, setOriginalPermissionStrings] = useState<string[]>([]);

  useEffect(() => {
    if (!roleId) {
      router.replace(ROUTES.settingsRoles);
      return;
    }
    let cancelled = false;
    (async () => {
      setFetching(true);
      setError("");
      try {
        const role = await rolesApi.getRole(roleId);
        if (cancelled) return;
        setName(role.name);
        setStatus((role.status as "active" | "inactive") ?? "active");
        const raw = Array.isArray(role.permissions) ? role.permissions.filter((x): x is string => typeof x === "string") : [];
        setOriginalPermissionStrings(raw);
        setPermissions(permissionsFromApi(raw));
      } catch (err) {
        if (cancelled) return;
        const msg =
          err instanceof AxiosError && err.response?.data?.message
            ? String(err.response.data.message)
            : "Failed to load role.";
        setError(msg);
        setPermissions(permissionsFromApi([]));
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roleId, router]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const handlePermissionChange = (
    sectionId: string,
    featureId: string,
    permission: keyof FeaturePermissions,
    checked: boolean
  ) => {
    setPermissions(
      (prev) =>
        prev && {
          ...prev,
          [sectionId]: {
            ...prev[sectionId],
            [featureId]: {
              ...prev[sectionId][featureId],
              [permission]: checked,
            },
          },
        }
    );
  };

  const handleFullPermission = (sectionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const section = PERMISSION_SECTIONS.find((s) => s.id === sectionId);
    if (!section || !permissions) return;
    setPermissions((prev) => {
      if (!prev) return prev;
      const currentSection = prev[sectionId] ?? {};
      const allFull = section.features.every((f) => {
        const perms = currentSection[f.id];
        return perms?.view && perms?.create && perms?.edit && perms?.delete;
      });

      const nextSection: SectionPermissions = {};
      section.features.forEach((f) => {
        nextSection[f.id] = allFull
          ? { view: false, create: false, edit: false, delete: false }
          : { view: true, create: true, edit: true, delete: true };
      });

      return { ...prev, [sectionId]: nextSection };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleId || !permissions) return;
    setError("");
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Role name is required.");
      return;
    }
    setLoading(true);
    try {
      const permissionStrings = mergePermissionsForRoleSave(permissionsToApi(permissions), originalPermissionStrings);
      await rolesApi.updateRole(roleId, {
        name: trimmedName,
        permissions: permissionStrings,
        status,
      });
      await Swal.fire({
        icon: "success",
        title: "Role updated",
        text: `The role "${trimmedName}" has been updated successfully.`,
        toast: true,
        position: "top-end",
        timer: 3000,
        showConfirmButton: false,
        timerProgressBar: true,
      });
      router.push(ROUTES.settingsRoles);
    } catch (err) {
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : "Failed to update role.";
      setError(msg);
      await Swal.fire({
        icon: "error",
        title: "Failed to update role",
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

  if (!roleId) return null;
  if (fetching && !permissions) {
    return (
      <Fragment>
        <Seo title="Edit Role" />
        <Pageheader currentpage="Edit Role" activepage="Roles" mainpage="User Roles" />
        <div className="container w-full max-w-full mx-auto">
          <div className="box">
            <div className="box-body py-12 text-center text-defaulttextcolor/70">Loading role...</div>
          </div>
        </div>
      </Fragment>
    );
  }

  if (permissions === null && error) {
    return (
      <Fragment>
        <Seo title="Edit Role" />
        <Pageheader currentpage="Edit Role" activepage="Roles" mainpage="User Roles" />
        <div className="container w-full max-w-full mx-auto">
          <div className="box">
            <div className="box-body">
              <div className="p-4 mb-4 bg-danger/10 border border-danger/30 text-danger rounded-md">{error}</div>
              <Link href={ROUTES.settingsRoles} className="ti-btn ti-btn-primary">
                Back to User Roles
              </Link>
            </div>
          </div>
        </div>
      </Fragment>
    );
  }

  if (!permissions) return null;

  return (
    <Fragment>
      <Seo title="Edit Role" />
      <div className="container w-full max-w-full mx-auto">
        <div className="grid grid-cols-12 gap-6">
          <div className="xl:col-span-12 col-span-12">
            <div className="box">
              <div className="box-header flex items-center justify-between flex-wrap gap-4">
                <div className="box-title">User Roles</div>
                <Link href={ROUTES.settingsRoles} className="ti-btn ti-btn-light !py-1 !px-2 !text-[0.75rem]">
                  <i className="ri-arrow-left-line me-1"></i>Back to User Roles
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
                    <label htmlFor="role-name" className="form-label">
                      Role Name
                    </label>
                    <input
                      id="role-name"
                      type="text"
                      className="form-control"
                      placeholder="Enter role name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-6">
                    <label className="form-label">Status</label>
                    <select
                      className="form-control form-select"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as "active" | "inactive")}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  {getUnmappedPermissionStrings(originalPermissionStrings).length > 0 && (
                    <div className="mb-6 p-4 rounded-md border border-defaultborder bg-gray-50 dark:bg-gray-800/40">
                      <p className="text-sm font-medium text-defaulttextcolor mb-2">
                        Additional permissions (not in matrix)
                      </p>
                      <p className="text-xs text-defaulttextcolor/70 mb-2">
                        These strings stay on the role when you save. Add matching rows to the permission matrix to manage them with checkboxes.
                      </p>
                      <ul className="text-xs font-mono space-y-1 list-disc list-inside text-defaulttextcolor/90">
                        {getUnmappedPermissionStrings(originalPermissionStrings).map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="hs-accordion-group space-y-2">
                    {PERMISSION_SECTIONS.map((section) => {
                      const isExpanded = expandedSections.has(section.id);
                      return (
                        <div
                          key={section.id}
                          className={`hs-accordion border border-defaultborder rounded-lg overflow-hidden ${isExpanded ? "active" : ""}`}
                        >
                          <div
                            className="hs-accordion-toggle w-full flex items-center justify-between px-4 py-3 font-semibold text-start bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 text-defaulttextcolor cursor-pointer"
                            onClick={() => toggleSection(section.id)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === "Enter" && toggleSection(section.id)}
                            aria-expanded={isExpanded}
                          >
                            <span>{section.label}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                className="ti-btn ti-btn-primary !py-0.5 !px-2 !text-[0.7rem] whitespace-nowrap"
                                onClick={(e) => handleFullPermission(section.id, e)}
                              >
                                Full Permission
                              </button>
                              <i
                                className={`ri-arrow-down-s-line text-xl transition-transform ${isExpanded ? "rotate-180" : ""}`}
                              ></i>
                            </div>
                          </div>
                          <div
                            className={`overflow-hidden transition-all duration-300 ${isExpanded ? "max-h-[500px]" : "max-h-0"}`}
                          >
                            <div className="p-4 border-t border-defaultborder bg-white dark:bg-bodybg">
                              <div className="table-responsive overflow-x-auto">
                                <table className="table min-w-full table-bordered border-defaultborder">
                                  <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-800/50">
                                      <th className="px-4 py-2 text-start font-medium">Feature</th>
                                      <th className="px-4 py-2 text-center font-medium">View</th>
                                      <th className="px-4 py-2 text-center font-medium">Create</th>
                                      <th className="px-4 py-2 text-center font-medium">Edit</th>
                                      <th className="px-4 py-2 text-center font-medium">Delete</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {section.features.map((feature) => (
                                      <tr key={feature.id} className="border-b border-defaultborder">
                                        <td className="px-4 py-2 font-medium">{feature.label}</td>
                                        {(["view", "create", "edit", "delete"] as const).map((action) => (
                                          <td key={action} className="px-4 py-2 text-center align-middle">
                                            <div className="flex justify-center">
                                              <input
                                                type="checkbox"
                                                className="form-check-input"
                                                checked={permissions[section.id]?.[feature.id]?.[action] ?? false}
                                                onChange={(e) =>
                                                  handlePermissionChange(
                                                    section.id,
                                                    feature.id,
                                                    action,
                                                    e.target.checked
                                                  )
                                                }
                                              />
                                            </div>
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-defaultborder">
                    <Link href={ROUTES.settingsRoles} className="ti-btn ti-btn-light">
                      Cancel
                    </Link>
                    <button type="submit" disabled={loading} className="ti-btn ti-btn-primary">
                      {loading ? "Saving..." : "Update Role"}
                    </button>
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
