"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  getAllStudentGroups,
  createStudentGroup,
  updateStudentGroup,
  deleteStudentGroup,
  getStudentGroupById,
  getGroupStudents,
  type StudentGroup,
} from "@/shared/lib/api/student-groups";
import { listStudents, type Student } from "@/shared/lib/api/students";
import Seo from "@/shared/layout-components/seo/seo";
import Swal from "sweetalert2";
import dynamic from "next/dynamic";
import { useAuth } from "@/shared/contexts/auth-context";
import { usePmReactSelectStyles } from "@/shared/hooks/usePmReactSelectStyles";

const AsyncSelect = dynamic(() => import("react-select/async"), { ssr: false });

type StudentOption = { value: string; label: string; student: Student };
type EmployeeLike = { id?: string; _id?: string; user?: { name?: string; email?: string } };

const emptyForm = { name: "", description: "" };

function hasStudentsManagePermission(permissions: string[]): boolean {
  return permissions.some((p) => p === "students.manage" || p.startsWith("students.manage"));
}

function groupIdOf(group: StudentGroup): string {
  return group._id ?? group.id ?? "";
}

function errorMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string } | undefined;
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

function toEmployeeOption(s: EmployeeLike): StudentOption | null {
  const value = String(s.id ?? s._id ?? "");
  if (!value) return null;
  return {
    value,
    label: `${s.user?.name ?? "Unknown"} (${s.user?.email ?? ""})`,
    student: s as Student,
  };
}

export default function SettingsAttendanceStudentGroupsPage() {
  const { isAdministrator, isPlatformSuperUser, permissions, permissionsLoaded } = useAuth();
  const canManage = !permissionsLoaded
    ? null
    : isAdministrator || isPlatformSuperUser || hasStudentsManagePermission(permissions);
  const { menuPortalTarget: selectMenuPortalTarget, styles: selectMenuLayerStyles } = usePmReactSelectStyles(10200);
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<StudentGroup | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [selectedStudents, setSelectedStudents] = useState<StudentOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [nameFilter, setNameFilter] = useState("");
  const [sortBy, setSortBy] = useState("name:asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const limit = 10;
  const fetchGen = useRef(0);
  const hasLoaded = useRef(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const loadEmployeeOptions = useCallback(async (inputValue: string) => {
    try {
      const res = await listStudents({
        limit: 20,
        search: inputValue.trim() || undefined,
        sortBy: "user.name:asc",
        employeeRoleOnly: true,
        excludeResignedEmployed: true,
      });
      return (res.results ?? []).map(toEmployeeOption).filter((o): o is StudentOption => o !== null);
    } catch {
      return [];
    }
  }, []);

  const fetchGroups = useCallback(async (page: number, name: string, sort: string) => {
    const id = ++fetchGen.current;
    if (!hasLoaded.current) setLoading(true);
    setError(null);
    try {
      const res = await getAllStudentGroups({
        page,
        limit,
        sortBy: sort,
        ...(name.trim() ? { name: name.trim() } : {}),
      });
      if (id !== fetchGen.current) return;
      const data = res.data;
      setGroups(data?.results ?? []);
      setTotalPages(data?.totalPages ?? 1);
      setTotalResults(data?.totalResults ?? 0);
    } catch (err: unknown) {
      if (id !== fetchGen.current) return;
      setError((err as { message?: string })?.message ?? "Failed to fetch groups");
    } finally {
      if (id === fetchGen.current) {
        hasLoaded.current = true;
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (canManage) fetchGroups(currentPage, nameFilter, sortBy);
  }, [canManage, currentPage, nameFilter, sortBy, fetchGroups]);

  const closeForm = () => setShowForm(false);

  useEffect(() => {
    if (!showForm) return;
    nameInputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeForm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showForm]);

  const reloadFromStart = async () => {
    setCurrentPage(1);
    await fetchGroups(1, nameFilter, sortBy);
  };

  const openCreate = () => {
    setEditingGroup(null);
    setFormData(emptyForm);
    setSelectedStudents([]);
    setShowForm(true);
  };

  const handleEdit = async (group: StudentGroup) => {
    try {
      const groupId = groupIdOf(group);
      const [res, membersRes] = await Promise.all([
        getStudentGroupById(groupId),
        getGroupStudents(groupId, { page: 1, limit: 100 }),
      ]);
      const full = res.data ?? (res as StudentGroup);
      setEditingGroup(full);
      const opts = (membersRes.data?.results ?? [])
        .map(toEmployeeOption)
        .filter((o): o is StudentOption => o !== null);
      setSelectedStudents(opts);
      setFormData({
        name: full.name ?? "",
        description: full.description ?? "",
      });
      setShowForm(true);
    } catch {
      await Swal.fire({ icon: "error", title: "Error", text: "Failed to load group", confirmButtonText: "OK" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      await Swal.fire({ icon: "warning", title: "Validation", text: "Group name is required", confirmButtonText: "OK" });
      return;
    }
    setSubmitting(true);
    try {
      const ids = selectedStudents.map((s) => s.value);
      if (editingGroup) {
        await updateStudentGroup(groupIdOf(editingGroup), {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          studentIds: ids,
        });
        await Swal.fire({ icon: "success", title: "Success", text: "Group updated", confirmButtonText: "OK" });
      } else {
        await createStudentGroup({ name: formData.name.trim(), description: formData.description.trim() || undefined, studentIds: ids });
        await Swal.fire({ icon: "success", title: "Success", text: "Group created", confirmButtonText: "OK" });
      }
      closeForm();
      setEditingGroup(null);
      await reloadFromStart();
    } catch (err: unknown) {
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: errorMessage(err, "Failed to save"),
        confirmButtonText: "OK",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (group: StudentGroup) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Delete group?",
      text: `Delete "${group.name}"? This cannot be undone.`,
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      confirmButtonColor: "#d33",
    });
    if (!result.isConfirmed) return;
    try {
      await deleteStudentGroup(groupIdOf(group));
      await Swal.fire({ icon: "success", title: "Deleted", confirmButtonText: "OK" });
      await reloadFromStart();
    } catch (err: unknown) {
      await Swal.fire({ icon: "error", title: "Error", text: (err as { message?: string })?.message ?? "Failed to delete", confirmButtonText: "OK" });
    }
  };

  if (canManage === null) {
    return (
      <>
        <Seo title="Employee Groups" />
        <div className="relative mt-4 w-full">
          <div className="rounded-2xl border border-defaultborder/70 bg-white dark:bg-bodybg shadow-sm overflow-hidden">
            <div className="py-20 px-6 text-center">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-5 ring-1 ring-primary/10">
                <i className="ri-loader-4-line animate-spin text-4xl" />
              </div>
              <p className="text-sm font-semibold text-defaulttextcolor">Loading…</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!canManage) {
    return (
      <>
        <Seo title="Employee Groups" />
        <div className="relative mt-4 w-full">
          <div className="rounded-2xl border border-defaultborder/70 bg-white dark:bg-bodybg shadow-sm overflow-hidden">
            <div className="py-20 px-6 text-center">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-danger/10 text-danger mb-5 ring-1 ring-danger/20">
                <i className="ri-error-warning-line text-5xl" />
              </div>
              <h3 className="text-xl font-semibold text-defaulttextcolor dark:text-white mb-2">Access Denied</h3>
              <p className="text-sm text-defaulttextcolor/80 max-w-md mx-auto">You need permission to manage employee groups.</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  const searching = Boolean(nameFilter.trim());

  return (
    <>
      <Seo title="Employee Groups" />
      <div className="relative mt-4 space-y-6 min-h-[50vh] w-full">
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_100%_60%_at_50%_-15%,rgba(99,102,241,0.07),transparent_50%)] dark:bg-[radial-gradient(ellipse_100%_60%_at_50%_-15%,rgba(99,102,241,0.12),transparent_50%)]" aria-hidden />
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(to_bottom,rgba(248,250,252,0.6),transparent_30%)] dark:bg-[linear-gradient(to_bottom,rgba(15,23,42,0.4),transparent_30%)]" aria-hidden />

        <section className="rounded-2xl border border-defaultborder/70 bg-white dark:bg-bodybg shadow-sm shadow-black/[0.03] dark:shadow-none overflow-hidden transition-shadow duration-300 hover:shadow-md hover:shadow-black/[0.04] dark:hover:shadow-none">
          <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-defaultborder/50 bg-gradient-to-r from-slate-50/90 to-white dark:from-white/[0.03] dark:to-transparent">
            <div className="flex items-center gap-4 min-w-0">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/10 dark:ring-primary/20" aria-hidden>
                <i className="ri-group-line text-2xl" />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-defaulttextcolor dark:text-white tracking-tight">Employee Groups</h2>
                <p className="text-xs text-defaulttextcolor/60 dark:text-white/50 mt-0.5">Create and manage groups for bulk holidays and shifts</p>
              </div>
            </div>
            <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-primary/90 hover:shadow-md hover:shadow-primary/20 active:scale-[0.98]">
              <i className="ri-add-line text-base" />
              Create Group
            </button>
          </div>
          <div className="px-6 py-6 border-t border-defaultborder/50 space-y-5 bg-gradient-to-b from-slate-50/50 to-transparent dark:from-white/[0.02] dark:to-transparent">
            <p className="text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/60">Filters</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="employee-group-search" className="mb-1.5 block text-xs font-semibold text-defaulttextcolor">Search by name</label>
                <input
                  id="employee-group-search"
                  type="search"
                  value={nameFilter}
                  onChange={(e) => {
                    setNameFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search groups…"
                  autoComplete="off"
                  className="w-full rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-defaulttextcolor placeholder:text-defaulttextcolor/45 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              <div>
                <label htmlFor="employee-group-sort" className="mb-1.5 block text-xs font-semibold text-defaulttextcolor">Sort by</label>
                <select
                  id="employee-group-sort"
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-defaulttextcolor focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all min-h-[2.75rem]"
                >
                  <option value="name:asc">Name (A–Z)</option>
                  <option value="name:desc">Name (Z–A)</option>
                  <option value="createdAt:desc">Newest first</option>
                  <option value="createdAt:asc">Oldest first</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-danger/30 bg-danger/10 dark:bg-danger/15 px-4 py-3 text-sm text-danger" role="alert">
                {error}
              </div>
            )}

            {showForm && (
            <div className="fixed inset-0 z-[10100] flex items-start sm:items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto" onClick={closeForm}>
              <div
                className="my-auto rounded-2xl border border-defaultborder/70 bg-white dark:bg-bodybg shadow-2xl shadow-black/30 w-full max-w-2xl max-h-[calc(100vh-3rem)] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="employee-group-form-title"
              >
                <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-defaultborder/50 bg-gradient-to-r from-slate-50/90 to-white dark:from-white/[0.03] dark:to-transparent">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/10" aria-hidden>
                      <i className="ri-group-line text-xl" />
                    </span>
                    <h3 id="employee-group-form-title" className="text-lg font-semibold text-defaulttextcolor dark:text-white truncate">{editingGroup ? "Edit Group" : "Create Group"}</h3>
                  </div>
                  <button type="button" onClick={closeForm} className="p-2 rounded-xl text-defaulttextcolor/70 hover:text-defaulttextcolor hover:bg-defaultborder/20 transition-colors shrink-0" aria-label="Close"><i className="ri-close-line text-xl" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-gradient-to-b from-slate-50/30 to-transparent dark:from-white/[0.02] dark:to-transparent rounded-b-2xl">
                  <div>
                    <label htmlFor="employee-group-name" className="mb-1.5 block text-sm font-semibold text-defaulttextcolor">Name <span className="text-danger">*</span></label>
                    <input
                      id="employee-group-name"
                      ref={nameInputRef}
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                      placeholder="e.g. US Team"
                      required
                      className="w-full rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-defaulttextcolor placeholder:text-defaulttextcolor/45 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  <div>
                    <label htmlFor="employee-group-description" className="mb-1.5 block text-sm font-semibold text-defaulttextcolor">Description</label>
                    <textarea
                      id="employee-group-description"
                      value={formData.description}
                      onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                      rows={2}
                      placeholder="Optional — e.g. Employees from US office"
                      className="w-full rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-defaulttextcolor placeholder:text-defaulttextcolor/45 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="employee-group-members" className="mb-1.5 block text-sm font-semibold text-defaulttextcolor">Employees</label>
                    <p className="mb-2 text-xs text-defaulttextcolor/60">Search by name, email, or employee ID.</p>
                    <div className="rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all duration-150">
                      <AsyncSelect
                        inputId="employee-group-members"
                        isMulti
                        cacheOptions
                        defaultOptions
                        loadOptions={loadEmployeeOptions}
                        value={selectedStudents}
                        getOptionLabel={(o) => (o && "label" in o ? String((o as StudentOption).label) : String(o))}
                        getOptionValue={(o) => (o && "value" in o ? String((o as StudentOption).value) : String(o))}
                        onChange={(sel: unknown) => setSelectedStudents((sel as StudentOption[] | null) ?? [])}
                        placeholder="Search employees…"
                        noOptionsMessage={({ inputValue }) => (inputValue.trim() ? `No employees matching "${inputValue}"` : "Type to search employees")}
                        closeMenuOnSelect={false}
                        className="react-select-container candidate-groups-select"
                        classNamePrefix="react-select"
                        isClearable
                        menuPortalTarget={selectMenuPortalTarget}
                        menuPosition="fixed"
                        styles={selectMenuLayerStyles}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 pt-4 border-t border-defaultborder/50">
                    <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary/90 hover:shadow-md transition-all disabled:opacity-60 disabled:pointer-events-none">
                      {submitting ? <><i className="ri-loader-4-line animate-spin text-lg" /> Saving…</> : <><i className="ri-check-line text-lg" /> Save</>}
                    </button>
                    <button type="button" onClick={closeForm} className="inline-flex items-center gap-2 rounded-xl border border-defaultborder/80 px-5 py-2.5 text-sm font-medium text-defaulttextcolor hover:bg-defaultborder/20 dark:hover:bg-white/5 transition-colors">Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          )}

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4 ring-1 ring-primary/10">
                  <i className="ri-loader-4-line animate-spin text-3xl" />
                </div>
                <p className="text-sm font-medium text-defaulttextcolor/80">Loading groups…</p>
              </div>
            ) : groups.length === 0 ? (
              <div className="py-12 text-center rounded-xl bg-slate-50/60 dark:bg-white/[0.04] border border-defaultborder/50">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4 ring-1 ring-primary/10">
                  <i className="ri-group-line text-4xl" />
                </div>
                <p className="text-sm text-defaulttextcolor/70">
                  {searching ? `No groups found matching “${nameFilter.trim()}”.` : "No groups yet. Create one to assign employees for bulk holidays or shifts."}
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-defaulttextcolor/70">Showing {groups.length} of {totalResults} group(s)</p>
                <div className="overflow-x-auto rounded-xl border border-defaultborder/70 bg-white dark:bg-white/5" aria-busy={loading}>
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-defaultborder/70 bg-slate-50/80 dark:bg-white/5">
                        <th className="text-start text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70 px-4 py-3">Name</th>
                        <th className="text-start text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70 px-4 py-3">Description</th>
                        <th className="text-start text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70 px-4 py-3">Employees</th>
                        <th className="text-end text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70 px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groups.map((g) => (
                        <tr key={g._id ?? g.id} className="border-b border-defaultborder/50 last:border-0 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                          <td className="font-medium text-defaulttextcolor px-4 py-3 max-w-[220px]">
                            <span className="block truncate" title={g.name}>{g.name}</span>
                          </td>
                          <td className="px-4 py-3 text-defaulttextcolor/90 max-w-[320px]">
                            <span className="block truncate" title={g.description ?? ""}>{g.description ?? "—"}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">{g.studentCount ?? (g.students ?? []).length}</td>
                          <td className="text-end px-4 py-3">
                            <button type="button" onClick={() => handleEdit(g)} className="inline-flex items-center justify-center p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors" aria-label={`Edit ${g.name}`}><i className="ri-edit-line text-lg" /></button>
                            <button type="button" onClick={() => handleDelete(g)} className="inline-flex items-center justify-center p-2 rounded-lg text-danger hover:bg-danger/10 transition-colors ml-1" aria-label={`Delete ${g.name}`}><i className="ri-delete-bin-line text-lg" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-defaultborder/50">
                    <p className="text-sm text-defaulttextcolor/70">Page {currentPage} of {totalPages}</p>
                    <div className="flex gap-2">
                      <button type="button" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)} className="inline-flex items-center gap-2 rounded-xl border border-defaultborder/80 px-4 py-2.5 text-sm font-medium text-defaulttextcolor hover:bg-defaultborder/20 dark:hover:bg-white/5 disabled:opacity-50 disabled:pointer-events-none transition-colors">Previous</button>
                      <button type="button" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)} className="inline-flex items-center gap-2 rounded-xl border border-defaultborder/80 px-4 py-2.5 text-sm font-medium text-defaulttextcolor hover:bg-defaultborder/20 dark:hover:bg-white/5 disabled:opacity-50 disabled:pointer-events-none transition-colors">Next</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>
      <style jsx>{`
        .candidate-groups-select :global(.react-select__control) {
          border: none;
          min-height: 2.75rem;
          background: transparent;
          box-shadow: none;
        }
        .candidate-groups-select :global(.react-select__control--is-focused) {
          box-shadow: none;
        }
        .candidate-groups-select :global(.react-select__placeholder),
        .candidate-groups-select :global(.react-select__input-container) {
          color: inherit;
        }
      `}</style>
    </>
  );
}
