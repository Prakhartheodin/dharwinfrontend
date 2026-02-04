"use client";

import React, { Fragment, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import Pageheader from "@/shared/layout-components/page-header/pageheader";
import { ROUTES } from "@/shared/lib/constants";
import * as rolesApi from "@/shared/lib/api/roles";
import {
  PERMISSION_SECTIONS,
  getInitialRolePermissions,
  permissionsToApi,
  type RolePermissionsState,
  type FeaturePermissions,
  type SectionPermissions,
} from "@/shared/lib/roles-permissions";
import { AxiosError } from "axios";

export default function RolesAddPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [permissions, setPermissions] = useState<RolePermissionsState>(getInitialRolePermissions());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(PERMISSION_SECTIONS.map((s) => s.id))
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    setPermissions((prev) => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        [featureId]: {
          ...prev[sectionId][featureId],
          [permission]: checked,
        },
      },
    }));
  };

  const handleFullPermission = (sectionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const section = PERMISSION_SECTIONS.find((s) => s.id === sectionId);
    if (!section) return;
    setPermissions((prev) => {
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
    setError("");
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Role name is required.");
      return;
    }
    setLoading(true);
    try {
      const permissionStrings = permissionsToApi(permissions);
      await rolesApi.createRole({
        name: trimmedName,
        permissions: permissionStrings,
        status,
      });
      router.push(ROUTES.settingsRoles);
    } catch (err) {
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : "Failed to create role.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Fragment>
      <Seo title="Create Role" />
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
                      {loading ? "Creating..." : "Create Role"}
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
