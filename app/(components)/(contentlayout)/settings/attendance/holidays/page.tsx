"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  getAllHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  type Holiday,
} from "@/shared/lib/api/holidays";
import Pageheader from "@/shared/layout-components/page-header/pageheader";
import Seo from "@/shared/layout-components/seo/seo";
import Swal from "sweetalert2";
import { useAuth } from "@/shared/contexts/auth-context";
import * as rolesApi from "@/shared/lib/api/roles";
import type { Role } from "@/shared/lib/types";

export default function SettingsAttendanceHolidaysPage() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [formData, setFormData] = useState({ title: "", date: "", endDate: "" as string, isActive: true });
  const [submitting, setSubmitting] = useState(false);
  const [titleFilter, setTitleFilter] = useState("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState("date:asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const limit = 10;

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        if (!user || !user.roleIds || (user.roleIds as string[]).length === 0) {
          setIsAdmin(false);
          return;
        }
        const res = await rolesApi.listRoles({ limit: 100 });
        const roles = (res.results ?? []) as Role[];
        const roleMap = new Map(roles.map((r) => [r.id, r]));
        const hasAdmin = (user.roleIds as string[]).some(
          (id) => roleMap.get(id)?.name === "Administrator"
        );
        setIsAdmin(hasAdmin);
      } catch {
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, [user]);

  const fetchHolidays = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = {
        page: currentPage,
        limit,
        sortBy,
      };
      if (titleFilter.trim()) params.title = titleFilter.trim();
      if (startDateFilter) params.startDate = startDateFilter;
      if (endDateFilter) params.endDate = endDateFilter;
      if (activeFilter !== "all") params.isActive = activeFilter === "active";

      const response = await getAllHolidays(params as Parameters<typeof getAllHolidays>[0]);
      const data = (response as { data?: { results?: Holiday[]; totalPages?: number; totalResults?: number } }).data;
      if (data?.results) {
        setHolidays(data.results);
        setTotalPages(data.totalPages ?? 1);
        setTotalResults(data.totalResults ?? 0);
      } else if (Array.isArray(data)) {
        setHolidays(data);
        setTotalPages(1);
        setTotalResults(data.length);
      } else {
        setHolidays([]);
        setTotalPages(1);
        setTotalResults(0);
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data
          ?.message ?? (err as { message?: string })?.message ?? "Failed to fetch holidays";
      setError(msg);
      await Swal.fire({ icon: "error", title: "Error", text: msg, confirmButtonText: "OK" });
    } finally {
      setLoading(false);
    }
  }, [currentPage, sortBy, titleFilter, startDateFilter, endDateFilter, activeFilter]);

  useEffect(() => {
    if (isAdmin !== false) fetchHolidays();
  }, [isAdmin, fetchHolidays]);

  const resetForm = () => {
    setFormData({ title: "", date: "", endDate: "", isActive: true });
    setEditingHoliday(null);
    setShowForm(false);
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    const d = (holiday.date || "").toString().slice(0, 10);
    const e = holiday.endDate ? (holiday.endDate || "").toString().slice(0, 10) : "";
    setFormData({
      title: holiday.title,
      date: d,
      endDate: e,
      isActive: holiday.isActive ?? true,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      await Swal.fire({
        icon: "warning",
        title: "Validation Error",
        text: "Holiday title is required",
        confirmButtonText: "OK",
      });
      return;
    }
    if (!formData.date) {
      await Swal.fire({
        icon: "warning",
        title: "Validation Error",
        text: "Holiday date is required",
        confirmButtonText: "OK",
      });
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload: { title: string; date: string; endDate?: string | null; isActive: boolean } = {
        title: formData.title.trim(),
        date: new Date(formData.date).toISOString(),
        isActive: formData.isActive,
      };
      if (formData.endDate && formData.endDate.trim()) {
        const end = new Date(formData.endDate);
        if (end.getTime() < new Date(formData.date).getTime()) {
          await Swal.fire({
            icon: "warning",
            title: "Validation Error",
            text: "End date must be on or after start date",
            confirmButtonText: "OK",
          });
          setSubmitting(false);
          return;
        }
        payload.endDate = new Date(formData.endDate).toISOString();
      } else {
        payload.endDate = null;
      }
      if (editingHoliday) {
        const id = editingHoliday._id ?? editingHoliday.id;
        await updateHoliday(id!, payload);
        await Swal.fire({
          icon: "success",
          title: "Success",
          text: "Holiday updated successfully",
          confirmButtonText: "OK",
        });
      } else {
        await createHoliday(payload);
        await Swal.fire({
          icon: "success",
          title: "Success",
          text: "Holiday created successfully",
          confirmButtonText: "OK",
        });
      }
      resetForm();
      await fetchHolidays();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data
          ?.message ?? (err as { message?: string })?.message ?? "Failed to save holiday";
      setError(msg);
      await Swal.fire({ icon: "error", title: "Error", text: msg, confirmButtonText: "OK" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (holiday: Holiday) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Delete Holiday",
      text: `Are you sure you want to delete "${holiday.title}"?`,
      showCancelButton: true,
      confirmButtonText: "Yes, delete it",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
    });
    if (!result.isConfirmed) return;
    try {
      const id = holiday._id ?? holiday.id;
      await deleteHoliday(id!);
      await Swal.fire({
        icon: "success",
        title: "Deleted",
        text: "Holiday deleted successfully",
        confirmButtonText: "OK",
      });
      await fetchHolidays();
    } catch (err: unknown) {
      await Swal.fire({
        icon: "error",
        title: "Error",
        text:
          (err as { response?: { data?: { message?: string } }; message?: string })?.response
            ?.data?.message ?? (err as { message?: string })?.message ?? "Failed to delete holiday",
        confirmButtonText: "OK",
      });
    }
  };

  const clearFilters = () => {
    setTitleFilter("");
    setStartDateFilter("");
    setEndDateFilter("");
    setActiveFilter("all");
    setSortBy("date:asc");
    setCurrentPage(1);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  if (isAdmin === null) {
    return (
      <>
        <Seo title="Holidays Management" />
        <Pageheader currentpage="Holidays Management" activepage="Settings" mainpage="Attendance" />
        <div className="box">
          <div className="box-body py-8 text-center text-defaulttextcolor/70">Loading…</div>
        </div>
      </>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <Seo title="Holidays Management" />
        <Pageheader currentpage="Holidays Management" activepage="Settings" mainpage="Attendance" />
        <div className="box">
          <div className="box-body py-12 text-center">
            <i className="ri-error-warning-line text-5xl text-danger mb-4" />
            <h3 className="text-xl font-semibold text-defaulttextcolor mb-2">Access Denied</h3>
            <p className="text-defaulttextcolor/70">Only administrators can manage holidays.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Seo title="Holidays Management" />
      <Pageheader currentpage="Holidays Management" activepage="Settings" mainpage="Attendance" />
      <div className="box">
        <div className="box-header flex flex-wrap items-center justify-between gap-4">
          <div className="box-title">Manage Holidays</div>
          <button type="button" onClick={openCreateForm} className="ti-btn ti-btn-primary">
            <i className="ri-add-line me-1" />
            Add Holiday
          </button>
        </div>
        <div className="box-body">
          {error && (
            <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 p-4 text-danger text-sm">
              {error}
            </div>
          )}

          <div className="mb-6 rounded-lg border border-defaultborder bg-black/5 dark:bg-white/5 p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-defaulttextcolor">
                  Search by Title
                </label>
                <input
                  type="text"
                  value={titleFilter}
                  onChange={(e) => {
                    setTitleFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Enter holiday title..."
                  className="form-control"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-defaulttextcolor">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => {
                    setStartDateFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="form-control"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-defaulttextcolor">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => {
                    setEndDateFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="form-control"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-defaulttextcolor">
                  Status
                </label>
                <select
                  value={activeFilter}
                  onChange={(e) => {
                    setActiveFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="form-control"
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[180px]">
                <label className="mb-2 block text-sm font-medium text-defaulttextcolor">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="form-control !w-auto"
                >
                  <option value="date:asc">Date (Oldest First)</option>
                  <option value="date:desc">Date (Newest First)</option>
                  <option value="title:asc">Title (A-Z)</option>
                  <option value="title:desc">Title (Z-A)</option>
                </select>
              </div>
              <div>
                <button type="button" onClick={clearFilters} className="ti-btn ti-btn-light">
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {showForm && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
              onClick={resetForm}
              role="presentation"
            >
              <div
                className="box max-h-[90vh] w-full max-w-md overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
                role="presentation"
              >
                <div className="box-header flex items-center justify-between">
                  <div className="box-title">
                    {editingHoliday ? "Edit Holiday" : "Create New Holiday"}
                  </div>
                  <button type="button" onClick={resetForm} className="text-defaulttextcolor/70 hover:text-defaulttextcolor">
                    <i className="ri-close-line text-xl" />
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="box-body space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-defaulttextcolor">
                      Holiday Title <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                      placeholder="e.g., New Year's Day"
                      className="form-control"
                      required
                      maxLength={200}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-defaulttextcolor">
                      Start Date <span className="text-danger">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData((p) => ({ ...p, date: e.target.value }))}
                      className="form-control"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-defaulttextcolor">
                      End Date <span className="text-defaulttextcolor/60">(optional, for multi-day)</span>
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData((p) => ({ ...p, endDate: e.target.value }))}
                      className="form-control"
                      min={formData.date || undefined}
                    />
                    <p className="mt-1 text-xs text-defaulttextcolor/60">
                      Leave empty for a single-day holiday. Set for festivals spanning multiple days.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="holiday-active"
                      checked={formData.isActive}
                      onChange={(e) => setFormData((p) => ({ ...p, isActive: e.target.checked }))}
                      className="rounded border-defaultborder text-primary focus:ring-primary"
                    />
                    <label htmlFor="holiday-active" className="text-sm font-medium text-defaulttextcolor">
                      Active
                    </label>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="ti-btn flex-1 ti-btn-primary"
                    >
                      {submitting ? (
                        <>
                          <i className="ri-loader-4-line animate-spin me-2" />
                          {editingHoliday ? "Updating…" : "Creating…"}
                        </>
                      ) : (
                        <>
                          <i className="ri-save-line me-2" />
                          {editingHoliday ? "Update Holiday" : "Create Holiday"}
                        </>
                      )}
                    </button>
                    <button type="button" onClick={resetForm} className="ti-btn ti-btn-light">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-defaulttextcolor/70">
              <i className="ri-loader-4-line animate-spin text-3xl text-primary mb-2 block" />
              Loading holidays…
            </div>
          ) : holidays.length === 0 ? (
            <div className="py-12 text-center">
              <i className="ri-calendar-line text-5xl text-defaulttextcolor/40 mb-4 block" />
              <h3 className="text-lg font-semibold text-defaulttextcolor mb-2">No Holidays Found</h3>
              <p className="text-defaulttextcolor/70 mb-4">
                {titleFilter || startDateFilter || endDateFilter || activeFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Get started by creating your first holiday"}
              </p>
              {!titleFilter && !startDateFilter && !endDateFilter && activeFilter === "all" && (
                <button type="button" onClick={openCreateForm} className="ti-btn ti-btn-primary">
                  Add Holiday
                </button>
              )}
            </div>
          ) : (
            <>
              <p className="mb-4 text-sm text-defaulttextcolor/70">
                Showing {holidays.length} of {totalResults} holiday(s)
              </p>
              <div className="table-responsive overflow-x-auto">
                <table className="table min-w-full table-bordered">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-white/5">
                      <th className="text-start text-xs font-medium uppercase text-defaulttextcolor/70">Title</th>
                      <th className="text-start text-xs font-medium uppercase text-defaulttextcolor/70">Date / Range</th>
                      <th className="text-start text-xs font-medium uppercase text-defaulttextcolor/70">Status</th>
                      <th className="text-end text-xs font-medium uppercase text-defaulttextcolor/70">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holidays.map((holiday) => {
                      const id = holiday._id ?? holiday.id;
                      return (
                        <tr key={id} className="hover:bg-black/5 dark:hover:bg-white/5">
                          <td className="font-medium text-defaulttextcolor">{holiday.title}</td>
                          <td className="text-defaulttextcolor/80">
                            {holiday.endDate
                              ? `${formatDate(holiday.date)} – ${formatDate(holiday.endDate)}`
                              : formatDate(holiday.date)}
                          </td>
                          <td>
                            <span
                              className={`badge ${holiday.isActive ? "bg-success/10 text-success" : "bg-defaultborder text-defaulttextcolor/70"}`}
                            >
                              {holiday.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="text-end">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openEditForm(holiday)}
                                className="text-primary hover:underline"
                                title="Edit"
                              >
                                <i className="ri-edit-line text-lg" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(holiday)}
                                className="text-danger hover:underline"
                                title="Delete"
                              >
                                <i className="ri-delete-bin-line text-lg" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                  <p className="text-sm text-defaulttextcolor/70">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="ti-btn ti-btn-light"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="ti-btn ti-btn-light"
                    >
                      Next
                    </button>
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
