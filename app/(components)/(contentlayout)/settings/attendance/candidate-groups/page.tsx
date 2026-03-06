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
import Pageheader from "@/shared/layout-components/page-header/pageheader";
import Seo from "@/shared/layout-components/seo/seo";
import Swal from "sweetalert2";
import dynamic from "next/dynamic";
import { useAuth } from "@/shared/contexts/auth-context";
import * as rolesApi from "@/shared/lib/api/roles";
import type { Role } from "@/shared/lib/types";

const Select = dynamic(() => import("react-select"), { ssr: false });

type StudentOption = { value: string; label: string; student: Student };
const SELECT_ALL = "__all_students__";

export default function SettingsAttendanceStudentGroupsPage() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
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

  useEffect(() => {
    const check = async () => {
      try {
        if (!user?.roleIds?.length) {
          setIsAdmin(false);
          return;
        }
        const res = await rolesApi.listRoles({ limit: 100 });
        const roles = (res.results ?? []) as Role[];
        const map = new Map(roles.map((r) => [r.id, r]));
        setIsAdmin((user.roleIds as string[]).some((id) => map.get(id)?.name === "Administrator"));
      } catch {
        setIsAdmin(false);
      }
    };
    check();
  }, [user]);

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
        <Pageheader currentpage="Student Groups" activepage="Settings" mainpage="Attendance" />
        <div className="box"><div className="box-body py-8 text-center text-defaulttextcolor/70">Loading…</div></div>
      </>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <Seo title="Student Groups" />
        <Pageheader currentpage="Student Groups" activepage="Settings" mainpage="Attendance" />
        <div className="box">
          <div className="box-body py-12 text-center">
            <i className="ri-error-warning-line text-5xl text-danger mb-4" />
            <h3 className="text-xl font-semibold text-defaulttextcolor mb-2">Access Denied</h3>
            <p className="text-defaulttextcolor/70">Only administrators can manage student groups.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Seo title="Student Groups" />
      <Pageheader currentpage="Student Groups" activepage="Settings" mainpage="Attendance" />
      <div className="box">
        <div className="box-header flex flex-wrap justify-between gap-4">
          <div className="box-title">Student Groups</div>
          <button type="button" onClick={openCreate} className="ti-btn ti-btn-primary">
            <i className="ri-add-line me-1" /> Create Group
          </button>
        </div>
        <div className="box-body">
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-defaulttextcolor">Search by Name</label>
              <input
                type="text"
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                placeholder="Search groups..."
                className="form-control"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-defaulttextcolor">Status</label>
              <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)} className="form-control">
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-defaulttextcolor">Sort By</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="form-control">
                <option value="name:asc">Name (A-Z)</option>
                <option value="name:desc">Name (Z-A)</option>
                <option value="createdAt:desc">Newest First</option>
                <option value="createdAt:asc">Oldest First</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 p-4 text-danger text-sm">{error}</div>
          )}

          {showForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowForm(false)} role="presentation">
              <div className="box max-h-[90vh] w-full max-w-lg overflow-y-auto" onClick={(e) => e.stopPropagation()} role="presentation">
                <div className="box-header flex justify-between">
                  <div className="box-title">{editingGroup ? "Edit Group" : "Create Group"}</div>
                  <button type="button" onClick={() => setShowForm(false)} className="text-defaulttextcolor/70 hover:text-defaulttextcolor"><i className="ri-close-line text-xl" /></button>
                </div>
                <form onSubmit={handleSubmit} className="box-body space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-defaulttextcolor">Name <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                      className="form-control"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-defaulttextcolor">Description</label>
                    <textarea value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} className="form-control" rows={2} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-defaulttextcolor">Students</label>
                    <Select
                      isMulti
                      options={studentOptions}
                      value={selectedStudents}
                      getOptionLabel={(o) => (o && "label" in o ? o.label : String(o))}
                      getOptionValue={(o) => (o && "value" in o ? o.value : String(o))}
                      onChange={(sel: StudentOption[] | null) => {
                        if (!sel?.length) {
                          setSelectedStudents([]);
                          return;
                        }
                        const hasAll = sel.some((o) => o.value === SELECT_ALL);
                        if (hasAll) {
                          if (selectedStudents.length === allStudents.length) setSelectedStudents([]);
                          else setSelectedStudents(allStudents);
                        } else {
                          setSelectedStudents(sel as StudentOption[]);
                        }
                      }}
                      placeholder="Select students (by name)..."
                      closeMenuOnSelect={false}
                      className="react-select-container"
                      classNamePrefix="react-select"
                      isClearable
                      isSearchable
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button type="submit" disabled={submitting} className="ti-btn ti-btn-primary">{submitting ? "Saving…" : "Save"}</button>
                    <button type="button" onClick={() => setShowForm(false)} className="ti-btn ti-btn-light">Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-defaulttextcolor/70">Loading…</div>
          ) : groups.length === 0 ? (
            <div className="py-12 text-center">
              <i className="ri-group-line text-5xl text-defaulttextcolor/40 mb-4 block" />
              <p className="text-defaulttextcolor/70">No groups yet. Create one to assign students for bulk holidays/shifts.</p>
            </div>
          ) : (
            <>
              <p className="mb-4 text-sm text-defaulttextcolor/70">Showing {groups.length} of {totalResults} group(s)</p>
              <div className="table-responsive overflow-x-auto">
                <table className="table min-w-full table-bordered">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-white/5">
                      <th className="text-start text-xs font-medium uppercase text-defaulttextcolor/70">Name</th>
                      <th className="text-start text-xs font-medium uppercase text-defaulttextcolor/70">Description</th>
                      <th className="text-start text-xs font-medium uppercase text-defaulttextcolor/70">Students</th>
                      <th className="text-end text-xs font-medium uppercase text-defaulttextcolor/70">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((g) => (
                      <tr key={g._id ?? g.id}>
                        <td className="font-medium text-defaulttextcolor">{g.name}</td>
                        <td className="text-defaulttextcolor/80">{g.description ?? "—"}</td>
                        <td>{g.studentCount ?? (g.students ?? []).length}</td>
                        <td className="text-end">
                          <button type="button" onClick={() => handleEdit(g)} className="text-primary hover:underline me-2"><i className="ri-edit-line" /></button>
                          <button type="button" onClick={() => handleDelete(g)} className="text-danger hover:underline"><i className="ri-delete-bin-line" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="mt-6 flex justify-between">
                  <p className="text-sm text-defaulttextcolor/70">Page {currentPage} of {totalPages}</p>
                  <div className="flex gap-2">
                    <button type="button" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)} className="ti-btn ti-btn-light">Previous</button>
                    <button type="button" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)} className="ti-btn ti-btn-light">Next</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
