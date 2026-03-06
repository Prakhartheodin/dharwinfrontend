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
import Pageheader from "@/shared/layout-components/page-header/pageheader";
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
        setIsAdmin((user.roleIds as string[]).some((id) => map.get(id)?.name === "Administrator"));
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
        <Pageheader currentpage="Manage Shifts" activepage="Settings" mainpage="Attendance" />
        <div className="box"><div className="box-body py-8 text-center text-defaulttextcolor/70">Loading…</div></div>
      </>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <Seo title="Manage Shifts" />
        <Pageheader currentpage="Manage Shifts" activepage="Settings" mainpage="Attendance" />
        <div className="box">
          <div className="box-body py-12 text-center">
            <i className="ri-error-warning-line text-5xl text-danger mb-4" />
            <h3 className="text-xl font-semibold text-defaulttextcolor mb-2">Access Denied</h3>
            <p className="text-defaulttextcolor/70">Only administrators can manage shifts.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Seo title="Manage Shifts" />
      <Pageheader currentpage="Manage Shifts" activepage="Settings" mainpage="Attendance" />
      <div className="box">
        <div className="box-header flex flex-wrap justify-between gap-4">
          <div className="box-title">Manage Shifts</div>
          <button type="button" onClick={openCreate} className="ti-btn ti-btn-primary">
            <i className="ri-add-line me-1" /> Add Shift
          </button>
        </div>
        <div className="box-body">
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-defaulttextcolor">Search by Name</label>
              <input type="text" value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} placeholder="Search..." className="form-control" />
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
              <label className="mb-2 block text-sm font-medium text-defaulttextcolor">Sort</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="form-control">
                <option value="name:asc">Name (A-Z)</option>
                <option value="name:desc">Name (Z-A)</option>
              </select>
            </div>
          </div>

          {error && <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 p-4 text-danger text-sm">{error}</div>}

          {showForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowForm(false)} role="presentation">
              <div className="box max-h-[90vh] w-full max-w-4xl overflow-y-auto" onClick={(e) => e.stopPropagation()} role="presentation">
                <div className="box-header flex flex-wrap justify-between items-center gap-2">
                  <div className="box-title">{editingShift ? "Edit Shift" : "Create New Shift"}</div>
                  <div className="flex items-center gap-2">
                    {!editingShift && (
                      <>
                        <span className="text-sm text-defaulttextcolor/70 me-2">Mode:</span>
                        <button
                          type="button"
                          className={`ti-btn !py-1.5 !px-3 !text-sm ${mode === "single" ? "ti-btn-primary" : "ti-btn-light"}`}
                          onClick={() => setMode("single")}
                        >
                          Single
                        </button>
                        <button
                          type="button"
                          className={`ti-btn !py-1.5 !px-3 !text-sm ${mode === "bulk" ? "ti-btn-primary" : "ti-btn-light"}`}
                          onClick={() => setMode("bulk")}
                        >
                          Bulk ({bulkShifts.length})
                        </button>
                      </>
                    )}
                    <button type="button" onClick={() => setShowForm(false)} className="text-defaulttextcolor/70 hover:text-defaulttextcolor"><i className="ri-close-line text-xl" /></button>
                  </div>
                </div>
                <div className="box-body">
                  {editingShift ? (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-defaulttextcolor">Name <span className="text-danger">*</span></label>
                        <input type="text" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} className="form-control" required />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-defaulttextcolor">Description</label>
                        <input type="text" value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} className="form-control" />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-defaulttextcolor">Timezone</label>
                        <select value={formData.timezone} onChange={(e) => setFormData((p) => ({ ...p, timezone: e.target.value }))} className="form-control">
                          {TIMEZONES.map((tz) => (
                            <option key={tz.value} value={tz.value}>{tz.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-defaulttextcolor">Start (HH:mm)</label>
                          <input type="time" value={formData.startTime} onChange={(e) => setFormData((p) => ({ ...p, startTime: e.target.value }))} className="form-control" required />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-defaulttextcolor">End (HH:mm)</label>
                          <input type="time" value={formData.endTime} onChange={(e) => setFormData((p) => ({ ...p, endTime: e.target.value }))} className="form-control" required />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="shift-active" checked={formData.isActive} onChange={(e) => setFormData((p) => ({ ...p, isActive: e.target.checked }))} className="rounded text-primary" />
                        <label htmlFor="shift-active" className="text-sm text-defaulttextcolor">Active</label>
                      </div>
                      <div className="flex gap-3 pt-4">
                        <button type="submit" disabled={submitting} className="ti-btn ti-btn-primary">{submitting ? "Saving…" : "Save"}</button>
                        <button type="button" onClick={() => setShowForm(false)} className="ti-btn ti-btn-light">Cancel</button>
                      </div>
                    </form>
                  ) : mode === "single" ? (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-defaulttextcolor">Name <span className="text-danger">*</span></label>
                        <input type="text" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} className="form-control" required />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-defaulttextcolor">Description</label>
                        <input type="text" value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} className="form-control" />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-defaulttextcolor">Timezone</label>
                        <select value={formData.timezone} onChange={(e) => setFormData((p) => ({ ...p, timezone: e.target.value }))} className="form-control">
                          {TIMEZONES.map((tz) => (
                            <option key={tz.value} value={tz.value}>{tz.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-defaulttextcolor">Start (HH:mm)</label>
                          <input type="time" value={formData.startTime} onChange={(e) => setFormData((p) => ({ ...p, startTime: e.target.value }))} className="form-control" required />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-defaulttextcolor">End (HH:mm)</label>
                          <input type="time" value={formData.endTime} onChange={(e) => setFormData((p) => ({ ...p, endTime: e.target.value }))} className="form-control" required />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="shift-active" checked={formData.isActive} onChange={(e) => setFormData((p) => ({ ...p, isActive: e.target.checked }))} className="rounded text-primary" />
                        <label htmlFor="shift-active" className="text-sm text-defaulttextcolor">Active</label>
                      </div>
                      <div className="flex gap-3 pt-4">
                        <button type="submit" disabled={submitting} className="ti-btn ti-btn-primary">{submitting ? "Saving…" : "Save"}</button>
                        <button type="button" onClick={() => setShowForm(false)} className="ti-btn ti-btn-light">Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="mb-6 rounded-lg border border-defaultborder bg-white/5 p-4">
                        <h4 className="mb-2 font-medium text-defaulttextcolor">Import Shifts from Excel</h4>
                        <p className="mb-4 text-sm text-defaulttextcolor/70">You can import multiple shifts at once using an Excel file. Download the template, fill in your shift data, and upload it.</p>
                        <div className="mb-4 flex flex-wrap gap-3">
                          <button type="button" onClick={downloadTemplate} className="ti-btn ti-btn-outline-primary !py-2">
                            <i className="ri-download-line me-1" /> Download Template
                          </button>
                          <label className="ti-btn ti-btn-outline-primary !py-2 cursor-pointer">
                            <input ref={excelInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcelFile} disabled={importingExcel} />
                            {importingExcel ? <><i className="ri-loader-4-line animate-spin me-1" /> Importing…</> : <><i className="ri-file-excel-2-line me-1" /> Import Excel File</>}
                          </label>
                        </div>
                        <p className="text-xs text-defaulttextcolor/60">
                          <strong>Excel template columns:</strong> {EXCEL_COLUMNS.join(", ")}. Timezone: IANA (e.g. America/New_York, Asia/Kolkata). Times: 24h HH:mm. Is Active: true/false (default true).
                        </p>
                      </div>
                      <h4 className="mb-3 font-medium text-defaulttextcolor">Or add shifts manually (bulk)</h4>
                      <form onSubmit={handleBulkSubmit} className="space-y-4">
                        <div className="table-responsive overflow-x-auto max-h-[40vh] overflow-y-auto">
                          <table className="table table-bordered table-sm text-sm">
                            <thead className="bg-gray-50 dark:bg-white/5 sticky top-0">
                              <tr>
                                <th className="!text-start">Name *</th>
                                <th className="!text-start">Description</th>
                                <th className="!text-start">Timezone</th>
                                <th className="!text-start">Start (HH:mm) *</th>
                                <th className="!text-start">End (HH:mm) *</th>
                                <th className="!text-start">Active</th>
                                <th className="!text-start w-12"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {bulkShifts.map((row, index) => (
                                <tr key={index}>
                                  <td><input type="text" value={row.name} onChange={(e) => updateBulkShift(index, "name", e.target.value)} className="form-control form-control-sm" placeholder="Shift name" /></td>
                                  <td><input type="text" value={row.description ?? ""} onChange={(e) => updateBulkShift(index, "description", e.target.value)} className="form-control form-control-sm" placeholder="Optional" /></td>
                                  <td>
                                    <select value={row.timezone} onChange={(e) => updateBulkShift(index, "timezone", e.target.value)} className="form-control form-control-sm !min-w-[140px]">
                                      {TIMEZONES.map((tz) => (
                                        <option key={tz.value} value={tz.value}>{tz.label}</option>
                                      ))}
                                    </select>
                                  </td>
                                  <td><input type="time" value={row.startTime} onChange={(e) => updateBulkShift(index, "startTime", e.target.value)} className="form-control form-control-sm" /></td>
                                  <td><input type="time" value={row.endTime} onChange={(e) => updateBulkShift(index, "endTime", e.target.value)} className="form-control form-control-sm" /></td>
                                  <td><input type="checkbox" checked={row.isActive !== false} onChange={(e) => updateBulkShift(index, "isActive", e.target.checked)} className="rounded text-primary" /></td>
                                  <td><button type="button" onClick={() => removeBulkRow(index)} className="text-danger hover:underline" title="Remove row"><i className="ri-delete-bin-line" /></button></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <button type="button" onClick={addBulkRow} className="ti-btn ti-btn-light !py-2"><i className="ri-add-line me-1" /> Add row</button>
                          <button type="submit" disabled={submitting} className="ti-btn ti-btn-primary">{submitting ? "Creating…" : "Create shifts"}</button>
                          <button type="button" onClick={() => setShowForm(false)} className="ti-btn ti-btn-light">Cancel</button>
                        </div>
                      </form>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-defaulttextcolor/70">Loading…</div>
          ) : shifts.length === 0 ? (
            <div className="py-12 text-center text-defaulttextcolor/70">No shifts. Add one to assign to students.</div>
          ) : (
            <div className="table-responsive overflow-x-auto">
              <table className="table min-w-full table-bordered">
                <thead>
                  <tr className="bg-gray-50 dark:bg-white/5">
                    <th className="text-start text-xs font-medium uppercase text-defaulttextcolor/70">Name</th>
                    <th className="text-start text-xs font-medium uppercase text-defaulttextcolor/70">Timezone</th>
                    <th className="text-start text-xs font-medium uppercase text-defaulttextcolor/70">Start</th>
                    <th className="text-start text-xs font-medium uppercase text-defaulttextcolor/70">End</th>
                    <th className="text-start text-xs font-medium uppercase text-defaulttextcolor/70">Status</th>
                    <th className="text-end text-xs font-medium uppercase text-defaulttextcolor/70">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shifts.map((s) => (
                    <tr key={s._id ?? s.id}>
                      <td className="font-medium text-defaulttextcolor">{s.name}</td>
                      <td>{s.timezone}</td>
                      <td>{s.startTime}</td>
                      <td>{s.endTime}</td>
                      <td><span className={`badge ${s.isActive ? "bg-success/10 text-success" : "bg-defaultborder text-defaulttextcolor/70"}`}>{s.isActive ? "Active" : "Inactive"}</span></td>
                      <td className="text-end">
                        <button type="button" onClick={() => openEdit(s)} className="text-primary hover:underline me-2"><i className="ri-edit-line" /></button>
                        <button type="button" onClick={() => handleDelete(s)} className="text-danger hover:underline"><i className="ri-delete-bin-line" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {totalPages > 1 && (
            <div className="mt-6 flex justify-between">
              <p className="text-sm text-defaulttextcolor/70">Page {currentPage} of {totalPages}</p>
              <div className="flex gap-2">
                <button type="button" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)} className="ti-btn ti-btn-light">Previous</button>
                <button type="button" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)} className="ti-btn ti-btn-light">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
