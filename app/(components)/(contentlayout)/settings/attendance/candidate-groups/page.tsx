"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  getAllStudentGroups,
  createStudentGroup,
  updateStudentGroup,
  deleteStudentGroup,
  getStudentGroupById,
  type StudentGroup,
} from "@/shared/lib/api/student-groups";
import { listStudents, type Student } from "@/shared/lib/api/students";
import Seo from "@/shared/layout-components/seo/seo";
import Swal from "sweetalert2";
import dynamic from "next/dynamic";
import { useAttendanceAdminAccess } from "@/shared/hooks/use-attendance-admin-access";

const Select = dynamic(() => import("react-select"), { ssr: false });

type StudentOption = { value: string; label: string; student: Student };
const SELECT_ALL = "__all_students__";

export default function SettingsAttendanceStudentGroupsPage() {
  const isAdmin = useAttendanceAdminAccess();
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<StudentGroup | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "", studentIds: [] as string[] });
  const [selectedStudents, setSelectedStudents] = useState<StudentOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [allStudents, setAllStudents] = useState<StudentOption[]>([]);
  const [nameFilter, setNameFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name:asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const limit = 10;

  const fetchStudents = useCallback(async () => {
    try {
      const res = await listStudents({ limit: 1000, sortBy: "user.name:asc" });
      const list = res.results ?? [];
      setAllStudents(
        list.map((s) => ({
          value: s.id,
          label: `${s.user?.name ?? "Unknown"} (${s.user?.email ?? ""})`,
          student: s,
        })).filter((o) => o.value)
      );
    } catch {
      setAllStudents([]);
    }
  }, []);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = { page: currentPage, limit, sortBy };
      if (nameFilter.trim()) params.name = nameFilter.trim();
      if (activeFilter !== "all") params.isActive = activeFilter === "active";
      const res = await getAllStudentGroups(params as Parameters<typeof getAllStudentGroups>[0]);
      const data = (res as { data?: { results?: StudentGroup[]; totalPages?: number; totalResults?: number } }).data;
      setGroups(data?.results ?? []);
      setTotalPages(data?.totalPages ?? 1);
      setTotalResults(data?.totalResults ?? 0);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Failed to fetch groups");
    } finally {
      setLoading(false);
    }
  }, [currentPage, sortBy, nameFilter, activeFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [nameFilter, activeFilter, sortBy]);

  useEffect(() => {
    if (isAdmin) {
      fetchStudents();
    }
  }, [isAdmin, fetchStudents]);

  useEffect(() => {
    if (isAdmin) fetchGroups();
  }, [isAdmin, fetchGroups]);

  const openCreate = () => {
    setEditingGroup(null);
    setFormData({ name: "", description: "", studentIds: [] });
    setSelectedStudents([]);
    setShowForm(true);
  };

  const handleEdit = async (group: StudentGroup) => {
    try {
      const res = await getStudentGroupById(group._id ?? group.id ?? "");
      const full = (res as { data?: StudentGroup }).data ?? res;
      setEditingGroup(full);
      const studentIds = (full.students ?? []) as (string | { _id?: string; id?: string; user?: { name?: string; email?: string } })[];
      const ids = studentIds.map((s) => (typeof s === "string" ? s : s._id ?? s.id ?? "")).filter(Boolean);
      const opts: StudentOption[] = ids.map((id) => {
        const match = allStudents.find((a) => a.value === id);
        return match ?? { value: id, label: `Unknown student`, student: { id } as Student };
      });
      setSelectedStudents(opts);
      setFormData({
        name: full.name ?? "",
        description: full.description ?? "",
        studentIds: opts.map((o) => o.value),
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
        await updateStudentGroup(editingGroup._id ?? editingGroup.id ?? "", {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          studentIds: ids,
        });
        await Swal.fire({ icon: "success", title: "Success", text: "Group updated", confirmButtonText: "OK" });
      } else {
        await createStudentGroup({ name: formData.name.trim(), description: formData.description.trim() || undefined, studentIds: ids });
        await Swal.fire({ icon: "success", title: "Success", text: "Group created", confirmButtonText: "OK" });
      }
      setShowForm(false);
      setEditingGroup(null);
      fetchGroups();
    } catch (err: unknown) {
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ?? (err as { message?: string })?.message ?? "Failed to save",
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
      await deleteStudentGroup(group._id ?? group.id ?? "");
      await Swal.fire({ icon: "success", title: "Deleted", confirmButtonText: "OK" });
      fetchGroups();
    } catch (err: unknown) {
      await Swal.fire({ icon: "error", title: "Error", text: (err as { message?: string })?.message ?? "Failed to delete", confirmButtonText: "OK" });
    }
  };

  const studentOptions = allStudents.length
    ? [{ value: SELECT_ALL, label: "Select All Students" }, ...allStudents]
    : allStudents;

  if (isAdmin === null) {
    return (
      <>
        <Seo title="Student Groups" />
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

  if (!isAdmin) {
    return (
      <>
        <Seo title="Student Groups" />
        <div className="relative mt-4 w-full">
          <div className="rounded-2xl border border-defaultborder/70 bg-white dark:bg-bodybg shadow-sm overflow-hidden">
            <div className="py-20 px-6 text-center">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-danger/10 text-danger mb-5 ring-1 ring-danger/20">
                <i className="ri-error-warning-line text-5xl" />
              </div>
              <h3 className="text-xl font-semibold text-defaulttextcolor dark:text-white mb-2">Access Denied</h3>
              <p className="text-sm text-defaulttextcolor/80 max-w-md mx-auto">Only administrators can manage student groups.</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Seo title="Student Groups" />
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
                <h2 className="text-lg font-semibold text-defaulttextcolor dark:text-white tracking-tight">Student Groups</h2>
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-defaulttextcolor">Search by name</label>
                <input
                  type="text"
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                  placeholder="Search groups…"
                  className="w-full rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-defaulttextcolor placeholder:text-defaulttextcolor/45 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-defaulttextcolor">Status</label>
                <select
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value)}
                  className="w-full rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-defaulttextcolor focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all min-h-[2.75rem]"
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-defaulttextcolor">Sort by</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
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
              <div className="rounded-xl border border-danger/30 bg-danger/10 dark:bg-danger/15 px-4 py-3 text-sm text-danger">
                {error}
              </div>
            )}

            {showForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowForm(false)} role="presentation">
              <div className="rounded-2xl border border-defaultborder/70 bg-white dark:bg-bodybg shadow-xl max-h-[90vh] w-full max-w-xl overflow-y-auto" onClick={(e) => e.stopPropagation()} role="presentation">
                <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-defaultborder/50 bg-gradient-to-r from-slate-50/90 to-white dark:from-white/[0.03] dark:to-transparent">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/10" aria-hidden>
                      <i className="ri-group-line text-xl" />
                    </span>
                    <h3 className="text-lg font-semibold text-defaulttextcolor dark:text-white truncate">{editingGroup ? "Edit Group" : "Create Group"}</h3>
                  </div>
                  <button type="button" onClick={() => setShowForm(false)} className="p-2 rounded-xl text-defaulttextcolor/70 hover:text-defaulttextcolor hover:bg-defaultborder/20 transition-colors shrink-0" aria-label="Close"><i className="ri-close-line text-xl" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-gradient-to-b from-slate-50/30 to-transparent dark:from-white/[0.02] dark:to-transparent rounded-b-2xl">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-defaulttextcolor">Name <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                      placeholder="e.g. US Team"
                      required
                      className="w-full rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-defaulttextcolor placeholder:text-defaulttextcolor/45 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-defaulttextcolor">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                      rows={2}
                      placeholder="Optional — e.g. Employees from US office"
                      className="w-full rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-defaulttextcolor placeholder:text-defaulttextcolor/45 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-defaulttextcolor">Students</label>
                    <p className="mb-2 text-xs text-defaulttextcolor/60">Select one or more students to add to this group.</p>
                    <div className="rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all duration-150">
                      <Select
                        isMulti
                        options={studentOptions}
                        value={selectedStudents}
                        getOptionLabel={(o) => (o && "label" in o ? o.label : String(o))}
                        getOptionValue={(o) => (o && "value" in o ? o.value : String(o))}
                        onChange={(sel: unknown) => {
                          const value = (sel as StudentOption[] | null) ?? [];
                          if (!value.length) {
                            setSelectedStudents([]);
                            return;
                          }
                          const hasAll = value.some((o) => o.value === SELECT_ALL);
                          if (hasAll) {
                            if (selectedStudents.length === allStudents.length) setSelectedStudents([]);
                            else setSelectedStudents(allStudents);
                          } else {
                            setSelectedStudents(value);
                          }
                        }}
                        placeholder="Select students…"
                        closeMenuOnSelect={false}
                        className="react-select-container candidate-groups-select"
                        classNamePrefix="react-select"
                        isClearable
                        isSearchable
                        menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
                        menuPosition="fixed"
                        styles={{ menuPortal: (base) => ({ ...base, zIndex: 10000 }) }}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 pt-4 border-t border-defaultborder/50">
                    <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary/90 hover:shadow-md transition-all disabled:opacity-60 disabled:pointer-events-none">
                      {submitting ? <><i className="ri-loader-4-line animate-spin text-lg" /> Saving…</> : <><i className="ri-check-line text-lg" /> Save</>}
                    </button>
                    <button type="button" onClick={() => setShowForm(false)} className="inline-flex items-center gap-2 rounded-xl border border-defaultborder/80 px-5 py-2.5 text-sm font-medium text-defaulttextcolor hover:bg-defaultborder/20 dark:hover:bg-white/5 transition-colors">Cancel</button>
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
                <p className="text-sm text-defaulttextcolor/70">No groups yet. Create one to assign students for bulk holidays or shifts.</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-defaulttextcolor/70">Showing {groups.length} of {totalResults} group(s)</p>
                <div className="overflow-x-auto rounded-xl border border-defaultborder/70 bg-white dark:bg-white/5">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-defaultborder/70 bg-slate-50/80 dark:bg-white/5">
                        <th className="text-start text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70 px-4 py-3">Name</th>
                        <th className="text-start text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70 px-4 py-3">Description</th>
                        <th className="text-start text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70 px-4 py-3">Students</th>
                        <th className="text-end text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70 px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groups.map((g) => (
                        <tr key={g._id ?? g.id} className="border-b border-defaultborder/50 last:border-0 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                          <td className="font-medium text-defaulttextcolor px-4 py-3">{g.name}</td>
                          <td className="px-4 py-3 text-defaulttextcolor/90">{g.description ?? "—"}</td>
                          <td className="px-4 py-3">{g.studentCount ?? (g.students ?? []).length}</td>
                          <td className="text-end px-4 py-3">
                            <button type="button" onClick={() => handleEdit(g)} className="inline-flex items-center justify-center p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors" title="Edit"><i className="ri-edit-line text-lg" /></button>
                            <button type="button" onClick={() => handleDelete(g)} className="inline-flex items-center justify-center p-2 rounded-lg text-danger hover:bg-danger/10 transition-colors ml-1" title="Delete"><i className="ri-delete-bin-line text-lg" /></button>
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
