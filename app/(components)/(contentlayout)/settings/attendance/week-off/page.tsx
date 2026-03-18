"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  listStudents,
  updateWeekOffCalendar,
  getStudentWeekOff,
  importWeekOffBulk,
  WEEK_OFF_DAYS,
  type Student,
  type ImportWeekOffEntry,
} from "@/shared/lib/api/students";
import Seo from "@/shared/layout-components/seo/seo";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import dynamic from "next/dynamic";
import { useAuth } from "@/shared/contexts/auth-context";

const Select = dynamic(() => import("react-select"), { ssr: false });

const VALID_DAYS_SET = new Set<string>(WEEK_OFF_DAYS);

const pageStyles = (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
    .week-off-page { font-family: 'Figtree', ui-sans-serif, system-ui, sans-serif; }
  `}</style>
);

type WeekOffData = {
  studentId: string;
  studentName: string;
  studentEmail: string;
  weekOff: string[];
};

type StudentOption = { value: string; label: string; student: Student };

function hasWeekOffAccess(permissions: string[], isAdministrator: boolean): boolean {
  if (isAdministrator) return true;
  const hasStudentsManage = permissions.some(
    (p) => (p.includes("settings.students") || p === "students.manage") && (p.includes("create") || p.includes("edit") || p.includes("delete") || p.includes("manage"))
  );
  const hasAttendanceManage = permissions.some(
    (p) => (p.includes("training.attendance") || p === "attendance.manage") && (p.includes("create") || p.includes("edit") || p.includes("view,create,edit"))
  );
  return hasStudentsManage || hasAttendanceManage;
}

export default function SettingsAttendanceWeekOffPage() {
  const { permissions, permissionsLoaded, isAdministrator } = useAuth();
  const canAccess = hasWeekOffAccess(permissions, isAdministrator);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<StudentOption[]>([]);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [loadingWeekOff, setLoadingWeekOff] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [studentWeekOffs, setStudentWeekOffs] = useState<Record<string, WeekOffData>>({});
  const [hasUserSelectedDays, setHasUserSelectedDays] = useState(false);
  const [importingExcel, setImportingExcel] = useState(false);
  const excelInputRef = useRef<HTMLInputElement>(null);

  const fetchStudents = useCallback(async () => {
    if (!canAccess) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await listStudents({ limit: 1000, sortBy: "user.name:asc" });
      const list = res.results ?? [];
      const options = list
        .map((s) => ({
          value: s.id,
          label: `${s.user?.name ?? "Unknown"} (${s.user?.email ?? "No email"})`,
          student: s,
        }))
        .filter((o) => o.value);
      setStudents(options);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? "Failed to fetch students";
      setError(msg);
      await Swal.fire({ icon: "error", title: "Error", text: msg, confirmButtonText: "OK" });
    } finally {
      setLoading(false);
    }
  }, [canAccess]);

  useEffect(() => {
    if (canAccess) fetchStudents();
  }, [canAccess, fetchStudents]);

  const fetchStudentWeekOffs = useCallback(async () => {
    if (selectedStudents.length === 0) {
      setStudentWeekOffs({});
      return;
    }
    setLoadingWeekOff(true);
    const weekOffMap: Record<string, WeekOffData> = {};
    try {
      await Promise.all(
        selectedStudents.map(async (selected) => {
          const studentId = selected.value;
          try {
            const response = await getStudentWeekOff(studentId);
            weekOffMap[studentId] = {
              studentId: response.studentId,
              studentName: response.studentName,
              studentEmail: response.studentEmail,
              weekOff: response.weekOff ?? [],
            };
          } catch {
            const s = selected.student;
            weekOffMap[studentId] = {
              studentId,
              studentName: s?.user?.name ?? "Unknown",
              studentEmail: s?.user?.email ?? "",
              weekOff: [],
            };
          }
        })
      );
      setStudentWeekOffs(weekOffMap);
    } finally {
      setLoadingWeekOff(false);
    }
  }, [selectedStudents]);

  useEffect(() => {
    fetchStudentWeekOffs();
  }, [fetchStudentWeekOffs]);

  const handleStudentChange = (selected: StudentOption[] | null) => {
    setSelectedStudents(selected ?? []);
    setSelectedDays([]);
    setHasUserSelectedDays(false);
  };

  const selectAllStudents = () => {
    setSelectedStudents([...students]);
    setSelectedDays([]);
    setHasUserSelectedDays(false);
  };

  const clearAllStudents = () => {
    setSelectedStudents([]);
    setSelectedDays([]);
    setHasUserSelectedDays(false);
  };

  const toggleDay = (day: string) => {
    setHasUserSelectedDays(true);
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const selectAllDays = () => {
    setHasUserSelectedDays(true);
    setSelectedDays([...WEEK_OFF_DAYS]);
  };

  const clearAllDays = () => {
    setHasUserSelectedDays(true);
    setSelectedDays([]);
  };

  const handleUpdateWeekOff = async () => {
    if (selectedStudents.length === 0) {
      await Swal.fire({
        icon: "warning",
        title: "No Students Selected",
        text: "Please select at least one student",
        confirmButtonText: "OK",
      });
      return;
    }
    setUpdating(true);
    setError(null);
    try {
      const studentIds = selectedStudents.map((s) => s.value);
      const response = await updateWeekOffCalendar(studentIds, selectedDays);
      await Swal.fire({
        icon: "success",
        title: "Success",
        text: response?.message ?? `Week-off updated for ${studentIds.length} student(s)`,
        confirmButtonText: "OK",
      });
      await fetchStudentWeekOffs();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data
          ?.message ?? (err as { message?: string })?.message ?? "Failed to update week-off";
      setError(msg);
      await Swal.fire({ icon: "error", title: "Error", text: msg, confirmButtonText: "OK" });
    } finally {
      setUpdating(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        "Candidate Email": "student@example.com",
        "Week-Off Days (comma-separated)": "Saturday, Sunday",
        Notes: "Optional notes",
      },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Week-Off");
    XLSX.writeFile(wb, "week_off_import_template.xlsx");
  };

  const handleExcelFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportingExcel(true);
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
      const emailKeys = ["Candidate Email", "candidate email", "Email", "email", "CandidateEmail"];
      const daysKeys = ["Week-Off Days (comma-separated)", "Week-Off Days", "weekOff", "WeekOff", "Week-Off"];
      const notesKeys = ["Notes", "notes"];
      const getVal = (row: Record<string, unknown>, ...keys: string[]) => {
        for (const k of keys) {
          const v = row[k];
          if (v != null && String(v).trim() !== "") return String(v).trim();
        }
        return "";
      };
      const entries: ImportWeekOffEntry[] = [];
      const errors: string[] = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const email = getVal(row, ...emailKeys);
        if (!email) {
          errors.push(`Row ${i + 2}: Candidate Email is required`);
          continue;
        }
        const daysStr = getVal(row, ...daysKeys);
        const weekOff = daysStr
          ? daysStr
              .split(/[,;]/)
              .map((d) => d.trim())
              .filter((d) => VALID_DAYS_SET.has(d))
          : [];
        entries.push({ email, weekOff, notes: getVal(row, ...notesKeys) || undefined });
      }
      if (entries.length === 0) {
        await Swal.fire({
          icon: "warning",
          title: "No valid rows",
          text: errors.length ? errors.slice(0, 5).join("\n") : "Add at least one row with Candidate Email.",
          confirmButtonText: "OK",
        });
        if (excelInputRef.current) excelInputRef.current.value = "";
        return;
      }
      const result = await importWeekOffBulk(entries);
      let msg = result.message ?? `Week-off updated for ${result.data?.updatedCount ?? 0} candidate(s).`;
      if (result.data?.skipped?.length) {
        msg += ` ${result.data.skipped.length} skipped: ${result.data.skipped.slice(0, 3).map((s) => `${s.email} (${s.reason})`).join("; ")}`;
        if (result.data.skipped.length > 3) msg += "...";
      }
      await Swal.fire({ icon: "success", title: "Import complete", text: msg, confirmButtonText: "OK" });
      fetchStudents();
    } catch (err: unknown) {
      await Swal.fire({
        icon: "error",
        title: "Import failed",
        text: (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ?? (err as { message?: string })?.message ?? "Failed to import",
        confirmButtonText: "OK",
      });
    } finally {
      setImportingExcel(false);
      if (excelInputRef.current) excelInputRef.current.value = "";
    }
  };

  const getCommonWeekOffDays = useCallback((): string[] => {
    if (selectedStudents.length === 0) return [];
    const allWeekOffs = selectedStudents
      .map((s) => studentWeekOffs[s.value]?.weekOff ?? [])
      .filter((wo) => wo.length > 0);
    if (allWeekOffs.length === 0) return [];
    return allWeekOffs.reduce((common, weekOff) => common.filter((d) => weekOff.includes(d)), allWeekOffs[0] ?? []);
  }, [selectedStudents, studentWeekOffs]);

  useEffect(() => {
    if (
      selectedStudents.length > 0 &&
      Object.keys(studentWeekOffs).length > 0 &&
      !hasUserSelectedDays
    ) {
      const common = getCommonWeekOffDays();
      if (common.length > 0) setSelectedDays(common);
    }
  }, [studentWeekOffs, selectedStudents, getCommonWeekOffDays, hasUserSelectedDays]);

  if (!permissionsLoaded) {
    return (
      <>
        <Seo title="Manage Week-Off Calendar" />
        {pageStyles}
        <div className="week-off-page w-full mt-4">
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

  if (!canAccess) {
    return (
      <>
        <Seo title="Manage Week-Off Calendar" />
        {pageStyles}
        <div className="week-off-page w-full mt-4">
          <div className="rounded-2xl border border-defaultborder/70 bg-white dark:bg-bodybg shadow-sm overflow-hidden">
            <div className="py-20 px-6 text-center">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-danger/10 text-danger mb-5 ring-1 ring-danger/20">
                <i className="ri-error-warning-line text-5xl" />
              </div>
              <h3 className="text-xl font-semibold text-defaulttextcolor dark:text-white mb-2">Access Denied</h3>
              <p className="text-sm text-defaulttextcolor/80 max-w-md mx-auto">
                You need students.manage or attendance.manage permission to manage week-off.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Seo title="Manage Week-Off Calendar" />
      {pageStyles}
      <div className="week-off-page relative mt-4 space-y-6 min-h-[40vh] w-full">
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
                <i className="ri-calendar-week-line text-2xl" />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-defaulttextcolor dark:text-white tracking-tight">
                  Manage Week-Off Calendar
                </h2>
                <p className="text-xs text-defaulttextcolor/60 dark:text-white/50 mt-0.5">
                  Set week-off days for candidates · Individual or bulk import via Excel
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <button
                type="button"
                onClick={downloadTemplate}
                className="inline-flex items-center gap-2 rounded-xl border border-defaultborder/80 bg-transparent px-4 py-2.5 text-sm font-medium text-defaulttextcolor hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              >
                <i className="ri-download-line text-base" />
                Download Template
              </button>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary/90 hover:shadow-md transition-all disabled:opacity-60">
                <input
                  ref={excelInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleExcelFile}
                  disabled={importingExcel}
                />
                {importingExcel ? (
                  <>
                    <i className="ri-loader-4-line animate-spin text-base" />
                    Importing…
                  </>
                ) : (
                  <>
                    <i className="ri-upload-2-line text-base" />
                    Import Excel
                  </>
                )}
              </label>
            </div>
          </div>

          <div className="px-6 py-6 border-t border-defaultborder/50 space-y-6 bg-gradient-to-b from-slate-50/50 to-transparent dark:from-white/[0.02] dark:to-transparent">
            {error && (
              <div className="rounded-xl border border-danger/30 bg-danger/10 dark:bg-danger/15 px-4 py-3 text-sm text-danger">
                {error}
              </div>
            )}

            <div className="rounded-xl border border-primary/20 bg-primary/5 dark:bg-primary/10 dark:border-primary/30 p-5">
              <h4 className="mb-2 text-sm font-semibold text-defaulttextcolor dark:text-white">Import Week-Offs from Excel</h4>
              <p className="mb-3 text-sm text-defaulttextcolor/80">
                You can import week-off data for multiple candidates at once using an Excel file. Download the template, fill in candidate emails and their week-off days, and upload it.
              </p>
              <p className="text-xs text-defaulttextcolor/70">
                <strong>Excel columns:</strong> Candidate Email (required) · Week-Off Days (comma-separated, required) e.g. &quot;Saturday, Sunday&quot; · Notes (optional). Valid days: Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday.
              </p>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-4">
                <label className="block text-sm font-semibold text-defaulttextcolor">
                  Select Candidates <span className="text-danger">*</span>
                </label>
                {!loading && students.length > 0 && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={selectAllStudents}
                      className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      Select All
                    </button>
                    <span className="text-defaulttextcolor/40">·</span>
                    <button
                      type="button"
                      onClick={clearAllStudents}
                      className="text-sm font-medium text-defaulttextcolor/80 hover:text-defaulttextcolor transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
              {loading ? (
                <div className="flex items-center gap-2 text-defaulttextcolor/70">
                  <i className="ri-loader-4-line animate-spin" />
                  <span>Loading students…</span>
                </div>
              ) : (
                <div className="rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all duration-150">
                  <Select
                    isMulti
                    options={students}
                    value={selectedStudents}
                    onChange={(v) => handleStudentChange(v as StudentOption[] | null)}
                    placeholder="Select one or more candidates…"
                    classNamePrefix="react-select"
                    isClearable
                    isSearchable
                    isLoading={loading}
                    menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
                    menuPosition="fixed"
                    styles={{ menuPortal: (base) => ({ ...base, zIndex: 10000 }) }}
                  />
                </div>
              )}
              {selectedStudents.length > 0 && (
                <p className="mt-1.5 text-xs text-defaulttextcolor/60">{selectedStudents.length} candidate(s) selected</p>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-4">
                <label className="block text-sm font-semibold text-defaulttextcolor">Select Week-Off Days</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAllDays}
                    className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    Select All
                  </button>
                  <span className="text-defaulttextcolor/40">·</span>
                  <button
                    type="button"
                    onClick={clearAllDays}
                    className="text-sm font-medium text-defaulttextcolor/80 hover:text-defaulttextcolor transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {WEEK_OFF_DAYS.map((day) => (
                  <label
                    key={day}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 transition-all duration-200 ${
                      selectedDays.includes(day)
                        ? "border-primary bg-primary/10 dark:bg-primary/15 ring-1 ring-primary/20"
                        : "border-defaultborder/80 bg-white dark:bg-white/5 hover:border-primary/50 hover:bg-black/5 dark:hover:bg-white/10"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedDays.includes(day)}
                      onChange={() => toggleDay(day)}
                      className="w-4 h-4 rounded border-defaultborder text-primary focus:ring-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <span className={`text-sm font-medium ${selectedDays.includes(day) ? "text-primary" : "text-defaulttextcolor"}`}>
                      {day}
                    </span>
                  </label>
                ))}
              </div>
              {selectedDays.length > 0 && (
                <p className="mt-3 text-sm text-defaulttextcolor/70">
                  <strong>Selected:</strong> {selectedDays.join(", ")}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleUpdateWeekOff}
                disabled={updating || selectedStudents.length === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary/90 hover:shadow-md transition-all disabled:opacity-60 disabled:pointer-events-none"
              >
                {updating ? (
                  <>
                    <i className="ri-loader-4-line animate-spin text-lg" />
                    Updating…
                  </>
                ) : (
                  <>
                    <i className="ri-calendar-check-line text-lg" />
                    Update Week-Off for {selectedStudents.length} Candidate(s)
                  </>
                )}
              </button>
            </div>

            {selectedStudents.length > 0 && (
              <div className="border-t border-defaultborder/50 pt-6">
                <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-defaulttextcolor dark:text-white">
                  Current Week-Off Status
                  {loadingWeekOff && <i className="ri-loader-4-line animate-spin text-primary" />}
                </h3>
                {loadingWeekOff ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4 ring-1 ring-primary/10">
                      <i className="ri-loader-4-line animate-spin text-2xl" />
                    </div>
                    <p className="text-sm text-defaulttextcolor/70">Loading week-off data…</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedStudents.map((selected) => {
                      const studentId = selected.value;
                      const data = studentWeekOffs[studentId];
                      const weekOff = data?.weekOff ?? [];
                      return (
                        <div
                          key={studentId}
                          className="rounded-xl border border-defaultborder/70 bg-slate-50/60 dark:bg-white/[0.04] dark:border-defaultborder/50 p-4"
                        >
                          <h4 className="font-medium text-defaulttextcolor dark:text-white mb-0.5">
                            {data?.studentName ?? selected.label}
                          </h4>
                          <p className="mb-3 text-sm text-defaulttextcolor/70">{data?.studentEmail ?? ""}</p>
                          {weekOff.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {weekOff.map((d) => (
                                <span
                                  key={d}
                                  className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary ring-1 ring-primary/20"
                                >
                                  {d}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm text-defaulttextcolor/60 italic">No week-off days set</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="rounded-xl border border-primary/20 bg-primary/5 dark:bg-primary/10 dark:border-primary/30 p-4">
              <div className="flex items-start gap-3">
                <i className="ri-information-line mt-0.5 text-xl text-primary shrink-0" aria-hidden />
                <div className="min-w-0">
                  <h4 className="mb-2 font-semibold text-defaulttextcolor dark:text-white">How it works</h4>
                  <ul className="space-y-1.5 text-sm text-defaulttextcolor/80 list-disc list-inside">
                    <li>Select one or more candidates from the dropdown</li>
                    <li>Choose the days that should be week-off (e.g. Saturday and Sunday)</li>
                    <li>Click &quot;Update Week-Off&quot; to apply the changes</li>
                    <li>You can set multiple days or clear all week-off days by leaving none selected</li>
                    <li>Week-off days are used to determine attendance expectations</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
