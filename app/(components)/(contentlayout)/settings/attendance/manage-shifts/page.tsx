"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  getAllShifts,
  createShift,
  createShiftsBulk,
  updateShift,
  deleteShift,
  type Shift,
  type ShiftCreatePayload,
} from "@/shared/lib/api/shifts";
import { getAllTimeZones } from "@/shared/lib/timezones";
import Seo from "@/shared/layout-components/seo/seo";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import { useAuth } from "@/shared/contexts/auth-context";
import * as rolesApi from "@/shared/lib/api/roles";
import type { Role } from "@/shared/lib/types";

const TIMEZONES = getAllTimeZones();
const EXCEL_COLUMNS = [
  "Shift Name",
  "Description",
  "Timezone",
  "Start Time (HH:mm)",
  "End Time (HH:mm)",
  "Is Active",
] as const;
const TIME_REG = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

type BulkShiftRow = ShiftCreatePayload & { _key?: string };

export default function SettingsAttendanceManageShiftsPage() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    timezone: "UTC",
    startTime: "",
    endTime: "",
    isActive: true,
  });
  const [bulkShifts, setBulkShifts] = useState<BulkShiftRow[]>([
    { name: "", description: "", timezone: "UTC", startTime: "", endTime: "", isActive: true },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [importingExcel, setImportingExcel] = useState(false);
  const [nameFilter, setNameFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name:asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;
  const excelInputRef = React.useRef<HTMLInputElement>(null);

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
        setIsAdmin(
          (user.roleIds as string[]).some((id) => {
            const name = map.get(id)?.name;
            return name === "Administrator" || name === "Agent";
          })
        );
      } catch {
        setIsAdmin(false);
      }
    };
    check();
  }, [user]);

  const fetchShifts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = { page: currentPage, limit, sortBy };
      if (nameFilter.trim()) params.name = nameFilter.trim();
      if (activeFilter !== "all") params.isActive = activeFilter === "active";
      const res = await getAllShifts(params as Parameters<typeof getAllShifts>[0]);
      const data = (res as { data?: { results?: Shift[]; totalPages?: number } }).data;
      setShifts(data?.results ?? []);
      setTotalPages(data?.totalPages ?? 1);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Failed to fetch shifts");
    } finally {
      setLoading(false);
    }
  }, [currentPage, sortBy, nameFilter, activeFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [nameFilter, activeFilter, sortBy]);

  useEffect(() => {
    if (isAdmin) fetchShifts();
  }, [isAdmin, fetchShifts]);

  const openCreate = () => {
    setEditingShift(null);
    setMode("single");
    setFormData({ name: "", description: "", timezone: "UTC", startTime: "", endTime: "", isActive: true });
    setBulkShifts([{ name: "", description: "", timezone: "UTC", startTime: "", endTime: "", isActive: true }]);
    setShowForm(true);
  };

  const downloadTemplate = () => {
    const template = [
      {
        "Shift Name": "Day Shift",
        Description: "9 AM to 5 PM",
        Timezone: "Asia/Kolkata",
        "Start Time (HH:mm)": "09:00",
        "End Time (HH:mm)": "17:00",
        "Is Active": "true",
      },
      {
        "Shift Name": "Night Shift",
        Description: "10 PM to 6 AM",
        Timezone: "Asia/Kolkata",
        "Start Time (HH:mm)": "22:00",
        "End Time (HH:mm)": "06:00",
        "Is Active": "true",
      },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Shifts");
    XLSX.writeFile(wb, "shifts_import_template.xlsx");
  };

  const handleExcelFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportingExcel(true);
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: "array" });
      const firstSheet = wb.SheetNames[0];
      const ws = wb.Sheets[firstSheet];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
      const parsed: ShiftCreatePayload[] = [];
      const errors: string[] = [];
      const nameKeys = ["Shift Name", "shift name", "ShiftName", "shiftName", "Name", "name"];
      const descKeys = ["Description", "description"];
      const tzKeys = ["Timezone", "timezone", "Time Zone", "timeZone"];
      const startKeys = ["Start Time (HH:mm)", "Start Time", "startTime", "StartTime", "Start"];
      const endKeys = ["End Time (HH:mm)", "End Time", "endTime", "EndTime", "End"];
      const activeKeys = ["Is Active", "isActive", "IsActive", "Active", "active"];

      const getVal = (row: Record<string, unknown>, ...keys: string[]) => {
        for (const k of keys) {
          const v = row[k];
          if (v != null && String(v).trim() !== "") return String(v).trim();
        }
        return "";
      };

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const name = getVal(row, ...nameKeys);
        if (!name) {
          errors.push(`Row ${i + 2}: Shift Name is required`);
          continue;
        }
        const timezone = getVal(row, ...tzKeys) || "UTC";
        const startTime = getVal(row, ...startKeys);
        const endTime = getVal(row, ...endKeys);
        if (!startTime || !TIME_REG.test(startTime)) {
          errors.push(`Row ${i + 2}: Start Time (HH:mm) is required and must be 24h format`);
          continue;
        }
        if (!endTime || !TIME_REG.test(endTime)) {
          errors.push(`Row ${i + 2}: End Time (HH:mm) is required and must be 24h format`);
          continue;
        }
        if (startTime === endTime) {
          errors.push(`Row ${i + 2}: Start and End time cannot be the same`);
          continue;
        }
        const activeStr = getVal(row, ...activeKeys).toLowerCase();
        const isActive = activeStr !== "false" && activeStr !== "0" && activeStr !== "no";
        parsed.push({
          name,
          description: getVal(row, ...descKeys) || undefined,
          timezone,
          startTime,
          endTime,
          isActive,
        });
      }

      if (parsed.length === 0) {
        await Swal.fire({
          icon: "warning",
          title: "No valid shifts",
          text: errors.length ? errors.slice(0, 5).join("\n") : "No valid rows found. Check template columns.",
          confirmButtonText: "OK",
        });
        if (excelInputRef.current) excelInputRef.current.value = "";
        return;
      }
      if (parsed.length > 100) {
        await Swal.fire({ icon: "warning", title: "Too many rows", text: "Maximum 100 shifts per import.", confirmButtonText: "OK" });
        if (excelInputRef.current) excelInputRef.current.value = "";
        return;
      }
      const result = await createShiftsBulk(parsed);
      const msg = result.message ?? `Created ${result.data?.length ?? 0} shift(s) successfully.`;
      if (result.errors?.length) {
        await Swal.fire({
          icon: "warning",
          title: "Partial success",
          html: `${msg}<br/><br/>Some rows failed: ${result.errors.map((e) => `Row ${e.index + 1}: ${e.error}`).join("; ")}`,
          confirmButtonText: "OK",
        });
      } else {
        await Swal.fire({ icon: "success", title: "Success", text: msg, confirmButtonText: "OK" });
      }
      setShowForm(false);
      fetchShifts();
    } catch (err: unknown) {
      await Swal.fire({
        icon: "error",
        title: "Import failed",
        text: (err as { message?: string })?.message ?? "Failed to parse or create shifts",
        confirmButtonText: "OK",
      });
    } finally {
      setImportingExcel(false);
      if (excelInputRef.current) excelInputRef.current.value = "";
    }
  };

  const addBulkRow = () => {
    if (bulkShifts.length >= 100) {
      Swal.fire({ icon: "warning", title: "Limit", text: "Maximum 100 shifts at once.", confirmButtonText: "OK" });
      return;
    }
    setBulkShifts((prev) => [...prev, { name: "", description: "", timezone: "UTC", startTime: "", endTime: "", isActive: true }]);
  };

  const removeBulkRow = (index: number) => {
    setBulkShifts((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const updateBulkShift = (index: number, field: keyof BulkShiftRow, value: string | boolean) => {
    setBulkShifts((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const valid = bulkShifts
      .map((row, i) => {
        if (!row.name?.trim()) return null;
        if (!row.startTime || !TIME_REG.test(row.startTime)) return null;
        if (!row.endTime || !TIME_REG.test(row.endTime)) return null;
        if (row.startTime === row.endTime) return null;
        return { ...row, name: row.name.trim(), description: row.description?.trim() || undefined, timezone: row.timezone || "UTC" };
      })
      .filter(Boolean) as ShiftCreatePayload[];
    if (valid.length === 0) {
      await Swal.fire({ icon: "warning", title: "Validation", text: "Fill at least one row with Name, Start Time (HH:mm), and End Time (HH:mm).", confirmButtonText: "OK" });
      return;
    }
    setSubmitting(true);
    try {
      const result = await createShiftsBulk(valid);
      const msg = result.message ?? `Created ${result.data?.length ?? 0} shift(s) successfully.`;
      if (result.errors?.length) {
        await Swal.fire({
          icon: "warning",
          title: "Partial success",
          html: `${msg}<br/><br/>Some rows failed: ${result.errors.map((e) => `Row ${e.index + 1}: ${e.error}`).join("; ")}`,
          confirmButtonText: "OK",
        });
      } else {
        await Swal.fire({ icon: "success", title: "Success", text: msg, confirmButtonText: "OK" });
      }
      setShowForm(false);
      fetchShifts();
    } catch (err: unknown) {
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ?? (err as { message?: string })?.message ?? "Failed to create shifts",
        confirmButtonText: "OK",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (s: Shift) => {
    setEditingShift(s);
    setFormData({
      name: s.name ?? "",
      description: s.description ?? "",
      timezone: s.timezone ?? "UTC",
      startTime: s.startTime ?? "",
      endTime: s.endTime ?? "",
      isActive: s.isActive ?? true,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.startTime || !formData.endTime) {
      await Swal.fire({ icon: "warning", title: "Validation", text: "Name, start time and end time are required", confirmButtonText: "OK" });
      return;
    }
    setSubmitting(true);
    try {
      if (editingShift) {
        await updateShift(editingShift._id ?? editingShift.id ?? "", formData);
        await Swal.fire({ icon: "success", title: "Success", text: "Shift updated", confirmButtonText: "OK" });
      } else {
        await createShift(formData);
        await Swal.fire({ icon: "success", title: "Success", text: "Shift created", confirmButtonText: "OK" });
      }
      setShowForm(false);
      fetchShifts();
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

  const handleDelete = async (s: Shift) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Delete shift?",
      text: `Delete "${s.name}"?`,
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      confirmButtonColor: "#d33",
    });
    if (!result.isConfirmed) return;
    try {
      await deleteShift(s._id ?? s.id ?? "");
      await Swal.fire({ icon: "success", title: "Deleted", confirmButtonText: "OK" });
      fetchShifts();
    } catch (err: unknown) {
      await Swal.fire({ icon: "error", title: "Error", text: (err as { message?: string })?.message ?? "Failed to delete", confirmButtonText: "OK" });
    }
  };

  if (isAdmin === null) {
    return (
      <>
        <Seo title="Manage Shifts" />
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
        <Seo title="Manage Shifts" />
        <div className="relative mt-4 w-full">
          <div className="rounded-2xl border border-defaultborder/70 bg-white dark:bg-bodybg shadow-sm overflow-hidden">
            <div className="py-20 px-6 text-center">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-danger/10 text-danger mb-5 ring-1 ring-danger/20">
                <i className="ri-error-warning-line text-5xl" />
              </div>
              <h3 className="text-xl font-semibold text-defaulttextcolor dark:text-white mb-2">Access Denied</h3>
              <p className="text-sm text-defaulttextcolor/80 max-w-md mx-auto">Only administrators can manage shifts.</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Seo title="Manage Shifts" />
      <div className="relative mt-4 space-y-6 min-h-[50vh] w-full">
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_100%_60%_at_50%_-15%,rgba(99,102,241,0.07),transparent_50%)] dark:bg-[radial-gradient(ellipse_100%_60%_at_50%_-15%,rgba(99,102,241,0.12),transparent_50%)]" aria-hidden />
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(to_bottom,rgba(248,250,252,0.6),transparent_30%)] dark:bg-[linear-gradient(to_bottom,rgba(15,23,42,0.4),transparent_30%)]" aria-hidden />

        <section className="rounded-2xl border border-defaultborder/70 bg-white dark:bg-bodybg shadow-sm shadow-black/[0.03] dark:shadow-none overflow-hidden transition-shadow duration-300 hover:shadow-md hover:shadow-black/[0.04] dark:hover:shadow-none">
          <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-defaultborder/50 bg-gradient-to-r from-slate-50/90 to-white dark:from-white/[0.03] dark:to-transparent">
            <div className="flex items-center gap-4 min-w-0">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/10 dark:ring-primary/20" aria-hidden>
                <i className="ri-time-line text-2xl" />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-defaulttextcolor dark:text-white tracking-tight">Manage Shifts</h2>
                <p className="text-xs text-defaulttextcolor/60 dark:text-white/50 mt-0.5">Create and edit shifts for attendance</p>
              </div>
            </div>
            <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-primary/90 hover:shadow-md hover:shadow-primary/20 active:scale-[0.98]">
              <i className="ri-add-line text-base" />
              Add Shift
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
                  placeholder="Search…"
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
                <label className="mb-1.5 block text-xs font-semibold text-defaulttextcolor">Sort</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-defaulttextcolor focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all min-h-[2.75rem]"
                >
                  <option value="name:asc">Name (A–Z)</option>
                  <option value="name:desc">Name (Z–A)</option>
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
              <div className="rounded-2xl border border-defaultborder/70 bg-white dark:bg-bodybg shadow-xl max-h-[90vh] w-full max-w-4xl overflow-y-auto" onClick={(e) => e.stopPropagation()} role="presentation">
                <div className="flex flex-wrap justify-between items-center gap-4 px-6 py-5 border-b border-defaultborder/50 bg-gradient-to-r from-slate-50/90 to-white dark:from-white/[0.03] dark:to-transparent">
                  <h3 className="text-lg font-semibold text-defaulttextcolor dark:text-white">{editingShift ? "Edit Shift" : "Create New Shift"}</h3>
                  <div className="flex items-center gap-2">
                    {!editingShift && (
                      <>
                        <span className="text-xs text-defaulttextcolor/60 me-1">Mode:</span>
                        <div className="inline-flex rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 p-1">
                          <button type="button" className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${mode === "single" ? "bg-primary text-white shadow-sm" : "text-defaulttextcolor hover:text-primary"}`} onClick={() => setMode("single")}>Single</button>
                          <button type="button" className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${mode === "bulk" ? "bg-primary text-white shadow-sm" : "text-defaulttextcolor hover:text-primary"}`} onClick={() => setMode("bulk")}>Bulk ({bulkShifts.length})</button>
                        </div>
                      </>
                    )}
                    <button type="button" onClick={() => setShowForm(false)} className="p-2 rounded-xl text-defaulttextcolor/70 hover:text-defaulttextcolor hover:bg-defaultborder/20 transition-colors"><i className="ri-close-line text-xl" /></button>
                  </div>
                </div>
                <div className="p-6 space-y-5 bg-gradient-to-b from-slate-50/30 to-transparent dark:from-white/[0.02] dark:to-transparent rounded-b-2xl">
                  {editingShift ? (
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-defaulttextcolor">Name <span className="text-danger">*</span></label>
                        <input type="text" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Central Morning" required className="w-full rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-defaulttextcolor placeholder:text-defaulttextcolor/45 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-defaulttextcolor">Description</label>
                        <input type="text" value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} placeholder="Optional" className="w-full rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-defaulttextcolor placeholder:text-defaulttextcolor/45 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-defaulttextcolor">Timezone</label>
                        <select value={formData.timezone} onChange={(e) => setFormData((p) => ({ ...p, timezone: e.target.value }))} className="w-full rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-defaulttextcolor focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all min-h-[2.75rem]">
                          {TIMEZONES.map((tz) => (
                            <option key={tz.value} value={tz.value}>{tz.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="mb-1.5 block text-sm font-semibold text-defaulttextcolor">Start (HH:mm) <span className="text-danger">*</span></label>
                          <input type="time" value={formData.startTime} onChange={(e) => setFormData((p) => ({ ...p, startTime: e.target.value }))} required className="w-full rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-defaulttextcolor focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all min-h-[2.75rem]" />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-semibold text-defaulttextcolor">End (HH:mm) <span className="text-danger">*</span></label>
                          <input type="time" value={formData.endTime} onChange={(e) => setFormData((p) => ({ ...p, endTime: e.target.value }))} required className="w-full rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-defaulttextcolor focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all min-h-[2.75rem]" />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 pt-1">
                        <input type="checkbox" id="shift-active-edit" checked={formData.isActive} onChange={(e) => setFormData((p) => ({ ...p, isActive: e.target.checked }))} className="h-4 w-4 rounded border-defaultborder/80 text-primary focus:ring-2 focus:ring-primary/20 transition-all" />
                        <label htmlFor="shift-active-edit" className="text-sm font-medium text-defaulttextcolor cursor-pointer">Active (shift can be assigned to students)</label>
                      </div>
                      <div className="flex flex-wrap gap-3 pt-4 border-t border-defaultborder/50">
                        <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary/90 hover:shadow-md transition-all disabled:opacity-60 disabled:pointer-events-none">
                          {submitting ? <><i className="ri-loader-4-line animate-spin text-lg" /> Saving…</> : <><i className="ri-check-line text-lg" /> Save</>}
                        </button>
                        <button type="button" onClick={() => setShowForm(false)} className="inline-flex items-center gap-2 rounded-xl border border-defaultborder/80 px-5 py-2.5 text-sm font-medium text-defaulttextcolor hover:bg-defaultborder/20 dark:hover:bg-white/5 transition-colors">Cancel</button>
                      </div>
                    </form>
                  ) : mode === "single" ? (
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-defaulttextcolor">Name <span className="text-danger">*</span></label>
                        <input type="text" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Central Morning" required className="w-full rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-defaulttextcolor placeholder:text-defaulttextcolor/45 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-defaulttextcolor">Description</label>
                        <input type="text" value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} placeholder="Optional" className="w-full rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-defaulttextcolor placeholder:text-defaulttextcolor/45 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-defaulttextcolor">Timezone</label>
                        <select value={formData.timezone} onChange={(e) => setFormData((p) => ({ ...p, timezone: e.target.value }))} className="w-full rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-defaulttextcolor focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all min-h-[2.75rem]">
                          {TIMEZONES.map((tz) => (
                            <option key={tz.value} value={tz.value}>{tz.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="mb-1.5 block text-sm font-semibold text-defaulttextcolor">Start (HH:mm) <span className="text-danger">*</span></label>
                          <input type="time" value={formData.startTime} onChange={(e) => setFormData((p) => ({ ...p, startTime: e.target.value }))} required className="w-full rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-defaulttextcolor focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all min-h-[2.75rem]" />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-semibold text-defaulttextcolor">End (HH:mm) <span className="text-danger">*</span></label>
                          <input type="time" value={formData.endTime} onChange={(e) => setFormData((p) => ({ ...p, endTime: e.target.value }))} required className="w-full rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-defaulttextcolor focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all min-h-[2.75rem]" />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 pt-1">
                        <input type="checkbox" id="shift-active-single" checked={formData.isActive} onChange={(e) => setFormData((p) => ({ ...p, isActive: e.target.checked }))} className="h-4 w-4 rounded border-defaultborder/80 text-primary focus:ring-2 focus:ring-primary/20 transition-all" />
                        <label htmlFor="shift-active-single" className="text-sm font-medium text-defaulttextcolor cursor-pointer">Active (shift can be assigned to students)</label>
                      </div>
                      <div className="flex flex-wrap gap-3 pt-4 border-t border-defaultborder/50">
                        <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary/90 hover:shadow-md transition-all disabled:opacity-60 disabled:pointer-events-none">
                          {submitting ? <><i className="ri-loader-4-line animate-spin text-lg" /> Saving…</> : <><i className="ri-check-line text-lg" /> Save</>}
                        </button>
                        <button type="button" onClick={() => setShowForm(false)} className="inline-flex items-center gap-2 rounded-xl border border-defaultborder/80 px-5 py-2.5 text-sm font-medium text-defaulttextcolor hover:bg-defaultborder/20 dark:hover:bg-white/5 transition-colors">Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="mb-6 rounded-xl border border-defaultborder/70 bg-slate-50/60 dark:bg-white/[0.04] p-5">
                        <h4 className="mb-2 text-sm font-semibold text-defaulttextcolor">Import Shifts from Excel</h4>
                        <p className="mb-4 text-sm text-defaulttextcolor/70">Import multiple shifts at once. Download the template, fill in your data, then upload.</p>
                        <div className="mb-4 flex flex-wrap gap-3">
                          <button type="button" onClick={downloadTemplate} className="inline-flex items-center gap-2 rounded-xl border border-primary/50 bg-primary/5 px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/10 transition-colors">
                            <i className="ri-download-line text-lg" /> Download Template
                          </button>
                          <label className="inline-flex items-center gap-2 rounded-xl border border-defaultborder/80 px-4 py-2.5 text-sm font-medium text-defaulttextcolor hover:bg-defaultborder/20 dark:hover:bg-white/5 cursor-pointer transition-colors">
                            <input ref={excelInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcelFile} disabled={importingExcel} />
                            {importingExcel ? <><i className="ri-loader-4-line animate-spin text-lg" /> Importing…</> : <><i className="ri-file-excel-2-line text-lg" /> Import Excel File</>}
                          </label>
                        </div>
                        <p className="text-xs text-defaulttextcolor/60">
                          <strong>Columns:</strong> {EXCEL_COLUMNS.join(", ")}. Timezone: IANA. Times: 24h HH:mm. Is Active: true/false.
                        </p>
                      </div>
                      <h4 className="mb-3 text-sm font-semibold text-defaulttextcolor">Or add shifts manually (bulk)</h4>
                      <form onSubmit={handleBulkSubmit} className="space-y-4">
                        <div className="overflow-x-auto max-h-[40vh] overflow-y-auto rounded-xl border border-defaultborder/70">
                          <table className="min-w-full text-sm">
                            <thead className="bg-slate-50/80 dark:bg-white/5 sticky top-0">
                              <tr>
                                <th className="text-start text-xs font-semibold text-defaulttextcolor/70 px-3 py-2">Name *</th>
                                <th className="text-start text-xs font-semibold text-defaulttextcolor/70 px-3 py-2">Description</th>
                                <th className="text-start text-xs font-semibold text-defaulttextcolor/70 px-3 py-2">Timezone</th>
                                <th className="text-start text-xs font-semibold text-defaulttextcolor/70 px-3 py-2">Start *</th>
                                <th className="text-start text-xs font-semibold text-defaulttextcolor/70 px-3 py-2">End *</th>
                                <th className="text-start text-xs font-semibold text-defaulttextcolor/70 px-3 py-2">Active</th>
                                <th className="text-start w-12 px-3 py-2"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {bulkShifts.map((row, index) => (
                                <tr key={index} className="border-t border-defaultborder/50">
                                  <td className="p-2"><input type="text" value={row.name} onChange={(e) => updateBulkShift(index, "name", e.target.value)} placeholder="Shift name" className="w-full rounded-lg border border-defaultborder/80 bg-white dark:bg-white/5 px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" /></td>
                                  <td className="p-2"><input type="text" value={row.description ?? ""} onChange={(e) => updateBulkShift(index, "description", e.target.value)} placeholder="Optional" className="w-full rounded-lg border border-defaultborder/80 bg-white dark:bg-white/5 px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" /></td>
                                  <td className="p-2">
                                    <select value={row.timezone} onChange={(e) => updateBulkShift(index, "timezone", e.target.value)} className="min-w-[140px] w-full rounded-lg border border-defaultborder/80 bg-white dark:bg-white/5 px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
                                      {TIMEZONES.map((tz) => (
                                        <option key={tz.value} value={tz.value}>{tz.label}</option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="p-2"><input type="time" value={row.startTime} onChange={(e) => updateBulkShift(index, "startTime", e.target.value)} className="w-full rounded-lg border border-defaultborder/80 bg-white dark:bg-white/5 px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" /></td>
                                  <td className="p-2"><input type="time" value={row.endTime} onChange={(e) => updateBulkShift(index, "endTime", e.target.value)} className="w-full rounded-lg border border-defaultborder/80 bg-white dark:bg-white/5 px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" /></td>
                                  <td className="p-2"><input type="checkbox" checked={row.isActive !== false} onChange={(e) => updateBulkShift(index, "isActive", e.target.checked)} className="h-4 w-4 rounded text-primary focus:ring-2 focus:ring-primary/20" /></td>
                                  <td className="p-2"><button type="button" onClick={() => removeBulkRow(index)} className="p-2 rounded-lg text-danger hover:bg-danger/10 transition-colors" title="Remove row"><i className="ri-delete-bin-line text-lg" /></button></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="flex flex-wrap gap-3 pt-4 border-t border-defaultborder/50">
                          <button type="button" onClick={addBulkRow} className="inline-flex items-center gap-2 rounded-xl border border-defaultborder/80 px-4 py-2.5 text-sm font-medium text-defaulttextcolor hover:bg-defaultborder/20 dark:hover:bg-white/5 transition-colors"><i className="ri-add-line text-lg" /> Add row</button>
                          <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary/90 hover:shadow-md transition-all disabled:opacity-60 disabled:pointer-events-none">{submitting ? <><i className="ri-loader-4-line animate-spin text-lg" /> Creating…</> : <><i className="ri-check-line text-lg" /> Create shifts</>}</button>
                          <button type="button" onClick={() => setShowForm(false)} className="inline-flex items-center gap-2 rounded-xl border border-defaultborder/80 px-5 py-2.5 text-sm font-medium text-defaulttextcolor hover:bg-defaultborder/20 dark:hover:bg-white/5 transition-colors">Cancel</button>
                        </div>
                      </form>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4 ring-1 ring-primary/10">
                  <i className="ri-loader-4-line animate-spin text-3xl" />
                </div>
                <p className="text-sm font-medium text-defaulttextcolor/80">Loading shifts…</p>
              </div>
            ) : shifts.length === 0 ? (
              <div className="py-12 text-center rounded-xl bg-slate-50/60 dark:bg-white/[0.04] border border-defaultborder/50">
                <p className="text-sm text-defaulttextcolor/70">No shifts yet. Add one to assign to students.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-defaultborder/70 bg-white dark:bg-white/5">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-defaultborder/70 bg-slate-50/80 dark:bg-white/5">
                      <th className="text-start text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70 px-4 py-3">Name</th>
                      <th className="text-start text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70 px-4 py-3">Timezone</th>
                      <th className="text-start text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70 px-4 py-3">Start</th>
                      <th className="text-start text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70 px-4 py-3">End</th>
                      <th className="text-start text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70 px-4 py-3">Status</th>
                      <th className="text-end text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70 px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shifts.map((s) => (
                      <tr key={s._id ?? s.id} className="border-b border-defaultborder/50 last:border-0 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="font-medium text-defaulttextcolor px-4 py-3">{s.name}</td>
                        <td className="px-4 py-3 text-defaulttextcolor/90">{s.timezone}</td>
                        <td className="px-4 py-3">{s.startTime}</td>
                        <td className="px-4 py-3">{s.endTime}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${s.isActive ? "bg-success/10 text-success" : "bg-defaultborder/80 text-defaulttextcolor/70"}`}>
                            {s.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="text-end px-4 py-3">
                          <button type="button" onClick={() => openEdit(s)} className="inline-flex items-center justify-center p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors" title="Edit"><i className="ri-edit-line text-lg" /></button>
                          <button type="button" onClick={() => handleDelete(s)} className="inline-flex items-center justify-center p-2 rounded-lg text-danger hover:bg-danger/10 transition-colors ml-1" title="Delete"><i className="ri-delete-bin-line text-lg" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-defaultborder/50">
                <p className="text-sm text-defaulttextcolor/70">Page {currentPage} of {totalPages}</p>
                <div className="flex gap-2">
                  <button type="button" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)} className="inline-flex items-center gap-2 rounded-xl border border-defaultborder/80 px-4 py-2.5 text-sm font-medium text-defaulttextcolor hover:bg-defaultborder/20 dark:hover:bg-white/5 disabled:opacity-50 disabled:pointer-events-none transition-colors">Previous</button>
                  <button type="button" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)} className="inline-flex items-center gap-2 rounded-xl border border-defaultborder/80 px-4 py-2.5 text-sm font-medium text-defaulttextcolor hover:bg-defaultborder/20 dark:hover:bg-white/5 disabled:opacity-50 disabled:pointer-events-none transition-colors">Next</button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
