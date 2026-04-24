"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  getAllHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  type Holiday,
} from "@/shared/lib/api/holidays";
import Seo from "@/shared/layout-components/seo/seo";
import Swal from "sweetalert2";
import { useAttendanceAdminAccess } from "@/shared/hooks/use-attendance-admin-access";

const pageStyles = (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
    .holidays-page { font-family: 'Figtree', ui-sans-serif, system-ui, sans-serif; }
    @keyframes holiday-card-enter {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .holiday-row-enter {
      animation: holiday-card-enter 0.35s cubic-bezier(0.22, 1, 0.36, 1) forwards;
    }
  `}</style>
);

export default function SettingsAttendanceHolidaysPage() {
  const isAdmin = useAttendanceAdminAccess();
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
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [sortBy, setSortBy] = useState("date:asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const limit = 10;

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
    if (isAdmin === true) fetchHolidays();
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

  const hasActiveFilters =
    titleFilter.trim() !== "" ||
    startDateFilter !== "" ||
    endDateFilter !== "" ||
    activeFilter !== "all";

  if (isAdmin === null) {
    return (
      <>
        <Seo title="Holidays Management" />
        {pageStyles}
        <div className="holidays-page w-full mt-4">
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
        <Seo title="Holidays Management" />
        {pageStyles}
        <div className="holidays-page w-full mt-4">
          <div className="rounded-2xl border border-defaultborder/70 bg-white dark:bg-bodybg shadow-sm overflow-hidden">
            <div className="py-20 px-6 text-center">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-danger/10 text-danger mb-5 ring-1 ring-danger/20">
                <i className="ri-error-warning-line text-5xl" />
              </div>
              <h3 className="text-xl font-semibold text-defaulttextcolor dark:text-white mb-2">Access Denied</h3>
              <p className="text-sm text-defaulttextcolor/80 max-w-md mx-auto">
                Only administrators can manage holidays.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Seo title="Holidays Management" />
      {pageStyles}
      <div className="holidays-page relative mt-4 space-y-6 min-h-[50vh] w-full">
        <div
          className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_100%_60%_at_50%_-15%,rgba(99,102,241,0.07),transparent_50%)] dark:bg-[radial-gradient(ellipse_100%_60%_at_50%_-15%,rgba(99,102,241,0.12),transparent_50%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(to_bottom,rgba(248,250,252,0.6),transparent_30%)] dark:bg-[linear-gradient(to_bottom,rgba(15,23,42,0.4),transparent_30%)]"
          aria-hidden
        />

        <section className="rounded-2xl border border-defaultborder/70 bg-white dark:bg-bodybg shadow-sm shadow-black/[0.03] dark:shadow-none overflow-hidden transition-shadow duration-300 hover:shadow-md hover:shadow-black/[0.04] dark:hover:shadow-none">
          <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-defaultborder/50 bg-gradient-to-r from-slate-50/90 to-white dark:from-white/[0.03] dark:to-transparent">
            <div className="flex items-center gap-4 min-w-0">
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/10 dark:ring-primary/20"
                aria-hidden
              >
                <i className="ri-calendar-event-line text-2xl" />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-defaulttextcolor dark:text-white tracking-tight">
                  Holidays Management
                </h2>
                <p className="text-xs text-defaulttextcolor/60 dark:text-white/50 mt-0.5">
                  Manage holidays for attendance · Create and edit holiday dates
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-primary/90 hover:shadow-md hover:shadow-primary/20 active:scale-[0.98]"
            >
              <i className="ri-add-line text-base" />
              Add Holiday
            </button>
          </div>

          {error && (
            <div className="mx-6 mt-4 rounded-xl border border-danger/30 bg-danger/10 dark:bg-danger/15 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}

          <div className="px-6 py-4 border-b border-defaultborder/50 bg-gradient-to-r from-slate-50/80 to-white dark:from-white/[0.02] dark:to-transparent">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-white/10 text-defaulttextcolor/70"
                  aria-hidden
                >
                  <i className="ri-filter-3-line text-lg" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/60 dark:text-white/50">
                  Filters
                </span>
              </div>
              {(["all", "active", "inactive"] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => {
                    setActiveFilter(status);
                    setCurrentPage(1);
                  }}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 ${
                    activeFilter === status
                      ? "bg-primary text-white shadow-sm shadow-primary/20"
                      : "bg-slate-100 dark:bg-white/10 text-defaulttextcolor/80 hover:bg-slate-200 dark:hover:bg-white/15 hover:text-defaulttextcolor"
                  }`}
                >
                  {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-base text-defaulttextcolor/40 pointer-events-none" aria-hidden />
                  <input
                    type="text"
                    value={titleFilter}
                    onChange={(e) => {
                      setTitleFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search by title…"
                    className="w-full rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 pl-10 pr-4 py-2.5 text-sm text-defaulttextcolor placeholder:text-defaulttextcolor/45 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-150"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => {
                    setStartDateFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-3 py-2.5 text-sm text-defaulttextcolor focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  title="Start date"
                />
                <span className="text-defaulttextcolor/40 text-sm">–</span>
                <input
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => {
                    setEndDateFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-3 py-2.5 text-sm text-defaulttextcolor focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  title="End date"
                />
              </div>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setCurrentPage(1);
                }}
                className="rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-defaulttextcolor focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              >
                <option value="date:asc">Date (Oldest First)</option>
                <option value="date:desc">Date (Newest First)</option>
                <option value="title:asc">Title (A–Z)</option>
                <option value="title:desc">Title (Z–A)</option>
              </select>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-xl border border-defaultborder/80 bg-transparent px-4 py-2.5 text-sm font-medium text-defaulttextcolor hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          <div className="px-6 py-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-5 ring-1 ring-primary/10">
                  <i className="ri-loader-4-line animate-spin text-4xl" />
                </div>
                <p className="text-sm font-semibold text-defaulttextcolor">Loading holidays…</p>
                <p className="mt-1.5 text-xs text-defaulttextcolor/50">This may take a moment</p>
              </div>
            ) : holidays.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="inline-flex h-24 w-24 items-center justify-center rounded-3xl bg-slate-100 dark:bg-white/10 text-defaulttextcolor/40 mb-5 ring-1 ring-defaultborder/50">
                  <i className="ri-calendar-event-line text-5xl" />
                </div>
                <p className="text-lg font-semibold text-defaulttextcolor dark:text-white">No holidays found</p>
                <p className="mt-2 max-w-sm text-sm text-defaulttextcolor/60 dark:text-white/60">
                  {hasActiveFilters
                    ? "Try adjusting your filters to see more results."
                    : "Get started by creating your first holiday."}
                </p>
                {!hasActiveFilters && (
                  <button
                    type="button"
                    onClick={openCreateForm}
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary/90 hover:shadow-md transition-all"
                  >
                    <i className="ri-add-line" />
                    Add Holiday
                  </button>
                )}
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-6 rounded-xl border border-defaultborder/80 bg-transparent px-5 py-2.5 text-sm font-medium text-defaulttextcolor hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <>
                <p className="mb-4 text-sm text-defaulttextcolor/70">
                  Showing {holidays.length} of {totalResults} holiday{totalResults !== 1 ? "s" : ""}
                </p>
                <div className="overflow-hidden rounded-xl border border-defaultborder/70">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-defaultborder/60 bg-slate-50/80 dark:bg-white/[0.04]">
                        <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70">
                          Title
                        </th>
                        <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70">
                          Date / Range
                        </th>
                        <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70">
                          Status
                        </th>
                        <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-defaultborder/50">
                      {holidays.map((holiday, index) => {
                        const id = holiday._id ?? holiday.id;
                        return (
                          <tr
                            key={id}
                            style={{ animationDelay: `${index * 40}ms` }}
                            className="holiday-row-enter opacity-0 hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors"
                          >
                            <td className="px-5 py-4 font-medium text-defaulttextcolor">{holiday.title}</td>
                            <td className="px-5 py-4 text-sm text-defaulttextcolor/85">
                              {holiday.endDate
                                ? `${formatDate(holiday.date)} – ${formatDate(holiday.endDate)}`
                                : formatDate(holiday.date)}
                            </td>
                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                  holiday.isActive
                                    ? "bg-success/10 text-success ring-1 ring-success/20"
                                    : "bg-slate-100 dark:bg-white/10 text-defaulttextcolor/70"
                                }`}
                              >
                                {holiday.isActive ? (
                                  <>
                                    <span className="h-1.5 w-1.5 rounded-full bg-success" />
                                    Active
                                  </>
                                ) : (
                                  "Inactive"
                                )}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => openEditForm(holiday)}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-primary hover:bg-primary/10 transition-colors"
                                  title="Edit"
                                >
                                  <i className="ri-pencil-line text-lg" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(holiday)}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-danger hover:bg-danger/10 transition-colors"
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
                        className="rounded-xl border border-defaultborder/80 bg-transparent px-4 py-2.5 text-sm font-medium text-defaulttextcolor hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-50 disabled:pointer-events-none transition-all"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="rounded-xl border border-defaultborder/80 bg-transparent px-4 py-2.5 text-sm font-medium text-defaulttextcolor hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-50 disabled:pointer-events-none transition-all"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {showForm && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={resetForm}
            role="presentation"
          >
            <div
              className="rounded-2xl border border-defaultborder/70 bg-white dark:bg-bodybg shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
              role="presentation"
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-defaultborder/50 bg-gradient-to-r from-slate-50/90 to-white dark:from-white/[0.03] dark:to-transparent">
                <h3 className="text-lg font-semibold text-defaulttextcolor dark:text-white tracking-tight">
                  {editingHoliday ? "Edit Holiday" : "Create New Holiday"}
                </h3>
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-defaulttextcolor/70 hover:text-defaulttextcolor hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                >
                  <i className="ri-close-line text-xl" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-defaulttextcolor">
                    Holiday Title <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. New Year's Day"
                    className="w-full rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-defaulttextcolor placeholder:text-defaulttextcolor/45 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    required
                    maxLength={200}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-defaulttextcolor">
                    Start Date <span className="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData((p) => ({ ...p, date: e.target.value }))}
                    className="w-full rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-defaulttextcolor focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-defaulttextcolor">
                    End Date{" "}
                    <span className="text-defaulttextcolor/60 font-normal">(optional, for multi-day)</span>
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData((p) => ({ ...p, endDate: e.target.value }))}
                    min={formData.date || undefined}
                    className="w-full rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-defaulttextcolor focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                  <p className="mt-1.5 text-xs text-defaulttextcolor/60">
                    Leave empty for single-day. Set for multi-day holidays.
                  </p>
                </div>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-defaultborder/60 bg-slate-50/50 dark:bg-white/[0.04] px-4 py-3">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData((p) => ({ ...p, isActive: e.target.checked }))}
                    className="rounded border-defaultborder text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-medium text-defaulttextcolor">Active</span>
                </label>
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary/90 transition-all disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <i className="ri-loader-4-line animate-spin text-lg" />
                        {editingHoliday ? "Updating…" : "Creating…"}
                      </>
                    ) : (
                      <>
                        <i className="ri-save-line text-lg" />
                        {editingHoliday ? "Update Holiday" : "Create Holiday"}
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-xl border border-defaultborder/80 bg-transparent px-5 py-2.5 text-sm font-medium text-defaulttextcolor hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
