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
import Swal from "sweetalert2";

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
      await Swal.fire({
        icon: "success",
        title: "Role created",
        text: `The role "${trimmedName}" has been created successfully.`,
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
          : "Failed to create role.";
      setError(msg);
      await Swal.fire({
        icon: "error",
        title: "Failed to create role",
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
      <Seo title="Create Role" />
      <div className="relative mt-4 space-y-6 min-h-[50vh] w-full">
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_100%_60%_at_50%_-15%,rgba(99,102,241,0.07),transparent_50%)] dark:bg-[radial-gradient(ellipse_100%_60%_at_50%_-15%,rgba(99,102,241,0.12),transparent_50%)]" aria-hidden />

        <section className="rounded-2xl border border-defaultborder/70 bg-white dark:bg-bodybg shadow-sm shadow-black/[0.03] dark:shadow-none overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5 border-b border-defaultborder/50 bg-gradient-to-r from-slate-50/90 to-white dark:from-white/[0.03] dark:to-transparent">
            <div className="flex items-center gap-4 min-w-0">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/10 dark:ring-primary/20" aria-hidden>
                <i className="ri-shield-keyhole-line text-2xl" />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-defaulttextcolor dark:text-white tracking-tight">Create Role</h2>
                <p className="text-xs text-defaulttextcolor/60 dark:text-white/50 mt-0.5">Define a role and choose its module-level permissions</p>
              </div>
            </div>
            <Link href={ROUTES.settingsRoles} className="inline-flex items-center gap-2 rounded-xl border border-defaultborder/80 px-3 py-2 text-xs font-medium text-defaulttextcolor hover:bg-defaultborder/20 dark:hover:bg-white/5 transition-colors">
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

            <div className="rounded-xl border border-defaultborder/60 bg-white dark:bg-white/[0.03] p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="role-name" className="mb-1.5 block text-xs font-semibold text-defaulttextcolor">
                  Role name <span className="text-danger">*</span>
                </label>
                <input
                  id="role-name"
                  type="text"
                  className="w-full rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-defaulttextcolor placeholder:text-defaulttextcolor/45 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="e.g. Recruiter"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-defaulttextcolor">Status</label>
                <select
                  className="w-full rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-defaulttextcolor focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all min-h-[2.75rem]"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "active" | "inactive")}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70 mb-3 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary"><i className="ri-key-2-line text-base" /></span>
                Permissions
              </p>
              {PERMISSION_SECTIONS.map((section) => {
                const isExpanded = expandedSections.has(section.id);
                const sec = permissions[section.id] ?? {};
                const grantedCount = section.features.filter((f) => {
                  const p = sec[f.id]; return p?.view || p?.create || p?.edit || p?.delete;
                }).length;
                return (
                  <div
                    key={section.id}
                    className="rounded-xl border border-defaultborder/70 bg-white dark:bg-white/[0.03] overflow-hidden transition-shadow duration-200 hover:shadow-sm"
                  >
                    <div
                      className="flex items-center justify-between gap-3 px-5 py-3.5 text-start cursor-pointer hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors"
                      onClick={() => toggleSection(section.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && toggleSection(section.id)}
                      aria-expanded={isExpanded}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 transition-colors ${
                          grantedCount > 0
                            ? "bg-primary/10 text-primary ring-primary/15"
                            : "bg-defaultborder/30 text-defaulttextcolor/50 ring-defaultborder/40"
                        }`} aria-hidden>
                          <i className="ri-folder-shield-2-line text-base" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-defaulttextcolor dark:text-white truncate">{section.label}</p>
                          <p className="text-[0.6875rem] text-defaulttextcolor/60 mt-0.5 tabular-nums">
                            {grantedCount}/{section.features.length} feature{section.features.length !== 1 ? "s" : ""} granted
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-[0.6875rem] font-semibold text-primary hover:bg-primary/15 transition-colors whitespace-nowrap"
                          onClick={(e) => handleFullPermission(section.id, e)}
                        >
                          <i className="ri-check-double-line" /> Full
                        </button>
                        <i className={`ri-arrow-down-s-line text-xl text-defaulttextcolor/60 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </div>
                    </div>
                    <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? "max-h-[2000px]" : "max-h-0"}`}>
                      <div className="border-t border-defaultborder/60 bg-slate-50/40 dark:bg-white/[0.02]">
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr className="border-b border-defaultborder/60 bg-white/60 dark:bg-white/[0.03]">
                                <th className="text-start text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70 px-5 py-3">Feature</th>
                                <th className="text-center text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70 px-3 py-3">View</th>
                                <th className="text-center text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70 px-3 py-3">Create</th>
                                <th className="text-center text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70 px-3 py-3">Edit</th>
                                <th className="text-center text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70 px-3 py-3">Delete</th>
                              </tr>
                            </thead>
                            <tbody>
                              {section.features.map((feature) => (
                                <tr key={feature.id} className="border-b border-defaultborder/40 last:border-0 hover:bg-white/60 dark:hover:bg-white/[0.02] transition-colors">
                                  <td className="px-5 py-3 align-middle font-medium text-sm text-defaulttextcolor">{feature.label}</td>
                                  {(["view", "create", "edit", "delete"] as const).map((action) => (
                                    <td key={action} className="px-3 py-3 text-center align-middle">
                                      <input
                                        type="checkbox"
                                        className="form-check-input cursor-pointer"
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

            <div className="flex flex-wrap justify-end gap-2 pt-4 border-t border-defaultborder/50">
              <Link href={ROUTES.settingsRoles} className="inline-flex items-center gap-2 rounded-xl border border-defaultborder/80 px-5 py-2.5 text-sm font-medium text-defaulttextcolor hover:bg-defaultborder/20 dark:hover:bg-white/5 transition-colors">
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-primary/90 hover:shadow-md hover:shadow-primary/20 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none"
              >
                {loading ? (
                  <><i className="ri-loader-4-line animate-spin text-base" /> Creating…</>
                ) : (
                  <><i className="ri-check-line text-base" /> Create Role</>
                )}
              </button>
            </div>
          </form>
        </section>
      </div>
    </Fragment>
  );
}
