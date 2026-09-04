"use client";

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  getAllHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  type Holiday,
} from "@/shared/lib/api/holidays";
import { getAllHolidayGroups } from "@/shared/lib/api/holiday-groups";
import Seo from "@/shared/layout-components/seo/seo";
import Swal from "sweetalert2";
import { useAttendanceAdminAccess } from "@/shared/hooks/use-attendance-admin-access";
import { useDebouncedValue } from "@/app/(components)/(contentlayout)/communication/dialer/_lib/contactSearch";
import { YmdFilterDateInput } from "@/shared/components/filters/YmdFilterDateInput";
import { getReferralLeadsDateRangeError } from "@/shared/lib/ymd-filter-date-input.util";
import ListPagination from "@/shared/components/ListPagination";
import { effectiveIsActive, sortHolidaysByRelevance } from "@/shared/lib/holidays/effectiveHoliday";

/** Fixed so From can find To after its own remount; useId would change across that. */
const HOLIDAYS_FILTER_TO_INPUT_ID = "holidays-filter-to";
const FETCH_LIMIT = 500;
const PAGE_SIZE = 10;

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
  const [allHolidays, setAllHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [formData, setFormData] = useState({ title: "", date: "", endDate: "" as string, isActive: true, group: "" });
  const [submitting, setSubmitting] = useState(false);
  const [titleFilter, setTitleFilter] = useState("");
  const debouncedTitleFilter = useDebouncedValue(titleFilter, 300);
  const fetchGenerationRef = useRef(0);
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [sortBy, setSortBy] = useState("relevance:asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [apiGroupNames, setApiGroupNames] = useState<string[]>([]);
  const refDate = useMemo(() => new Date(), []);

  const fetchHolidays = useCallback(async () => {
    const generation = ++fetchGenerationRef.current;
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = {
        page: 1,
        limit: FETCH_LIMIT,
      };
      if (debouncedTitleFilter.trim()) params.title = debouncedTitleFilter.trim();
      if (startDateFilter) params.startDate = startDateFilter;
      if (endDateFilter) params.endDate = endDateFilter;

      const response = await getAllHolidays(params as Parameters<typeof getAllHolidays>[0]);
      if (generation !== fetchGenerationRef.current) return;
      const data = (response as { data?: { results?: Holiday[] } }).data;
      setAllHolidays(data?.results ?? (Array.isArray(data) ? data : []));
    } catch (err: unknown) {
      if (generation !== fetchGenerationRef.current) return;
      const msg =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data
          ?.message ?? (err as { message?: string })?.message ?? "Failed to fetch holidays";
      setError(msg);
      await Swal.fire({ icon: "error", title: "Error", text: msg, confirmButtonText: "OK" });
    } finally {
      if (generation === fetchGenerationRef.current) {
        setLoading(false);
      }
    }
  }, [debouncedTitleFilter, startDateFilter, endDateFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedTitleFilter, startDateFilter, endDateFilter, activeFilter, sortBy]);

  const processed = useMemo(() => {
    let rows = [...allHolidays];
    if (sortBy === "relevance:asc") {
      rows = sortHolidaysByRelevance(rows, refDate);
    } else if (sortBy === "date:desc") {
      rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else if (sortBy === "title:asc") {
      rows.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === "title:desc") {
      rows.sort((a, b) => b.title.localeCompare(a.title));
    } else {
      rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
    return rows.filter((h) => {
      const active = effectiveIsActive(h, refDate);
      if (activeFilter === "active" && !active) return false;
      if (activeFilter === "inactive" && active) return false;
      return true;
    });
  }, [allHolidays, refDate, activeFilter, sortBy]);

  const totalResults = processed.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const holidays = processed.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (isAdmin === true) fetchHolidays();
    return () => {
      fetchGenerationRef.current += 1;
    };
  }, [isAdmin, fetchHolidays]);

  // Group name suggestions: include groups created in Holiday Groups, even with zero dates yet.
  useEffect(() => {
    if (isAdmin !== true) return;
    getAllHolidayGroups({ sortBy: "name:asc", limit: 500 })
      .then((res) => setApiGroupNames((res.data?.results ?? []).map((g) => g.name).filter(Boolean)))
      .catch(() => setApiGroupNames([]));
  }, [isAdmin]);

  const resetForm = () => {
    setFormData({ title: "", date: "", endDate: "", isActive: true, group: "" });
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
      group: holiday.group ?? "",
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
      const payload: { title: string; date: string; endDate?: string | null; isActive: boolean; group: string } = {
        title: formData.title.trim(),
        date: new Date(formData.date).toISOString(),
        isActive: formData.isActive,
        group: formData.group.trim(),
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
    setSortBy("relevance:asc");
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

  const groupNames = Array.from(
    new Set([
      ...apiGroupNames,
      ...holidays.map((h) => (h.group ?? "").trim()).filter(Boolean),
    ])
  ).sort();

  const hasActiveFilters =
    titleFilter.trim() !== "" ||
    startDateFilter !== "" ||
    endDateFilter !== "" ||
    activeFilter !== "all";

  const dateRangeError = getReferralLeadsDateRangeError(startDateFilter, endDateFilter);

  const commitStartDateFilter = (sanitized: string) => {
    setStartDateFilter(sanitized);
    setCurrentPage(1);
    if (sanitized) {
      requestAnimationFrame(() => document.getElementById(HOLIDAYS_FILTER_TO_INPUT_ID)?.focus());
    }
  };

  const commitEndDateFilter = (sanitized: string) => {
    setEndDateFilter(sanitized);
    setCurrentPage(1);
  };

  const isSearchDebouncing = titleFilter.trim() !== debouncedTitleFilter.trim();
  const isSearchBusy = isSearchDebouncing || loading;
  const searchedTitle = debouncedTitleFilter.trim();

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

          <div className="px-6 py-4 border-b border-defaultborder/50 bg-gradient-to-r from-slate-50/80 to-white dark:from-white/[0.02] dark:to-transparent space-y-3">
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
                <label htmlFor="holidays-title-search" className="sr-only">
                  Search by title
                </label>
                <div className="relative">
                  <span
                    className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center"
                    aria-hidden
                  >
                    {isSearchBusy ? (
                      <i className="ri-loader-4-line animate-spin text-base leading-none text-primary" />
                    ) : (
                      <i className="ri-search-line text-base leading-none text-defaulttextcolor/40" />
                    )}
                  </span>
                  <input
                    id="holidays-title-search"
                    type="search"
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
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <YmdFilterDateInput
                key={`holidays-from-${startDateFilter}`}
                label="From"
                value={startDateFilter}
                maxDate={endDateFilter || undefined}
                rangeError={dateRangeError}
                portalId="holidays-datepicker-portal-from"
                onCommit={commitStartDateFilter}
              />
              <YmdFilterDateInput
                key={`holidays-to-${endDateFilter}`}
                label="To"
                inputId={HOLIDAYS_FILTER_TO_INPUT_ID}
                value={endDateFilter}
                minDate={startDateFilter || undefined}
                rangeError={dateRangeError}
                portalId="holidays-datepicker-portal-to"
                onCommit={commitEndDateFilter}
              />
              <div>
                <label className="form-label text-xs" htmlFor="holidays-sort">
                  Sort
                </label>
                <select
                  id="holidays-sort"
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="form-select form-select-sm min-w-[180px] rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 text-sm text-defaulttextcolor focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                >
                  <option value="relevance:asc">Relevance (Upcoming first)</option>
                  <option value="date:asc">Date (Oldest First)</option>
                  <option value="date:desc">Date (Newest First)</option>
                  <option value="title:asc">Title (A–Z)</option>
                  <option value="title:desc">Title (Z–A)</option>
                </select>
              </div>
              {hasActiveFilters && (
                <div className="shrink-0">
                  <label className="form-label text-xs select-none pointer-events-none opacity-0" aria-hidden>
                    Reset
                  </label>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="rounded-xl border border-defaultborder/80 bg-transparent px-4 py-2 text-sm font-medium text-defaulttextcolor hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
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
            ) : totalResults === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="inline-flex h-24 w-24 items-center justify-center rounded-3xl bg-slate-100 dark:bg-white/10 text-defaulttextcolor/40 mb-5 ring-1 ring-defaultborder/50">
                  <i className="ri-calendar-event-line text-5xl" />
                </div>
                <p className="text-lg font-semibold text-defaulttextcolor dark:text-white">
                  {searchedTitle ? `No holidays matching "${searchedTitle}"` : "No holidays found"}
                </p>
                <p className="mt-2 max-w-sm text-sm text-defaulttextcolor/60 dark:text-white/60">
                  {hasActiveFilters
                    ? searchedTitle
                      ? "Try a different search term or adjust your other filters."
                      : "Try adjusting your filters to see more results."
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
              <div className="overflow-x-auto rounded-xl border border-defaultborder/70">
                <table className="min-w-full table-auto">
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
                      const active = effectiveIsActive(holiday, refDate);
                      const storedDiffers = holiday.isActive !== active;
                      return (
                        <tr
                          key={id}
                          style={{ animationDelay: `${index * 40}ms` }}
                          className="holiday-row-enter opacity-0 hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="px-5 py-4 font-medium text-defaulttextcolor max-w-[280px]">
                            <span className="block truncate" title={holiday.title}>{holiday.title}</span>
                            {holiday.group ? (
                              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary ring-1 ring-primary/15">
                                <i className="ri-folder-2-line" />
                                {holiday.group}
                              </span>
                            ) : null}
                          </td>
                          <td className="px-5 py-4 text-sm text-defaulttextcolor/85 whitespace-nowrap">
                            {holiday.endDate
                              ? `${formatDate(holiday.date)} – ${formatDate(holiday.endDate)}`
                              : formatDate(holiday.date)}
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                active
                                  ? "bg-success/10 text-success ring-1 ring-success/20"
                                  : "bg-slate-100 dark:bg-white/10 text-defaulttextcolor/70"
                              }`}
                              title={
                                storedDiffers
                                  ? `Stored in DB: ${holiday.isActive ? "Active" : "Inactive"} · Effective: ${active ? "Active" : "Inactive"}`
                                  : undefined
                              }
                            >
                              {active ? (
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
            )}
          </div>

          {!loading && (
            <div className="border-t border-defaultborder/50 px-6 py-4 bg-white dark:bg-bodybg">
              <ListPagination
                page={safePage}
                totalPages={totalPages}
                totalResults={totalResults}
                pageSize={PAGE_SIZE}
                onPageChange={setCurrentPage}
                ariaLabel="Holiday list pagination"
                gotoInputId="holidays-goto-page"
              />
            </div>
          )}
        </section>

        {showForm && (
          <div
            className="fixed inset-0 z-[10100] flex items-start sm:items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto"
            onClick={resetForm}
            role="presentation"
          >
            <div
              className="my-auto rounded-2xl border border-defaultborder/70 bg-white dark:bg-bodybg shadow-2xl shadow-black/30 w-full max-w-md max-h-[calc(100vh-3rem)] overflow-y-auto"
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
                    Holiday Group{" "}
                    <span className="text-defaulttextcolor/60 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    list="holiday-group-options"
                    value={formData.group}
                    onChange={(e) => setFormData((p) => ({ ...p, group: e.target.value }))}
                    placeholder="e.g. US Holidays 2026"
                    className="w-full rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-defaulttextcolor placeholder:text-defaulttextcolor/45 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    maxLength={120}
                  />
                  <datalist id="holiday-group-options">
                    {groupNames.map((g) => (
                      <option key={g} value={g} />
                    ))}
                  </datalist>
                  <p className="mt-1.5 text-xs text-defaulttextcolor/60">
                    Type a new name to create a group, or pick an existing one. Holidays in the same group can be assigned together.
                  </p>
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
                  <span className="text-sm font-medium text-defaulttextcolor">
                    Enabled
                    <span className="block text-xs font-normal text-defaulttextcolor/60">
                      Auto-inactive after the holiday end date
                    </span>
                  </span>
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
