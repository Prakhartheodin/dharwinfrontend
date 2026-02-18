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
import Pageheader from "@/shared/layout-components/page-header/pageheader";
import Seo from "@/shared/layout-components/seo/seo";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import dynamic from "next/dynamic";
import { useAuth } from "@/shared/contexts/auth-context";
import * as rolesApi from "@/shared/lib/api/roles";
import type { Role } from "@/shared/lib/types";

const Select = dynamic(() => import("react-select"), { ssr: false });

const VALID_DAYS_SET = new Set<string>(WEEK_OFF_DAYS);

type WeekOffData = {
  studentId: string;
  studentName: string;
  studentEmail: string;
  weekOff: string[];
};

type StudentOption = { value: string; label: string; student: Student };

export default function SettingsAttendanceWeekOffPage() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
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

  const fetchStudents = useCallback(async () => {
    if (!isAdmin) {
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
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) fetchStudents();
  }, [isAdmin, fetchStudents]);

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

  if (isAdmin === null) {
    return (
      <>
        <Seo title="Manage Week-Off Calendar" />
        <Pageheader currentpage="Manage Week-Off Calendar" activepage="Settings" mainpage="Attendance" />
        <div className="box">
          <div className="box-body py-8 text-center text-defaulttextcolor/70">Loading…</div>
        </div>
      </>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <Seo title="Manage Week-Off Calendar" />
        <Pageheader currentpage="Manage Week-Off Calendar" activepage="Settings" mainpage="Attendance" />
        <div className="box">
          <div className="box-body py-12 text-center">
            <i className="ri-error-warning-line text-5xl text-danger mb-4" />
            <h3 className="text-xl font-semibold text-defaulttextcolor mb-2">Access Denied</h3>
            <p className="text-defaulttextcolor/70">Only administrators can manage week-off.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Seo title="Manage Week-Off Calendar" />
      <Pageheader currentpage="Manage Week-Off Calendar" activepage="Settings" mainpage="Attendance" />
      <div className="box">
        <div className="box-header flex flex-wrap justify-between items-center gap-4">
          <div className="box-title">Manage Week-Off Calendar</div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={downloadTemplate} className="ti-btn ti-btn-primary">
              <i className="ri-download-line me-1" /> Download Template
            </button>
            <label className="ti-btn ti-btn-primary cursor-pointer">
              <input ref={excelInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcelFile} disabled={importingExcel} />
              {importingExcel ? <><i className="ri-loader-4-line animate-spin me-1" /> Importing…</> : <><i className="ri-upload-2-line me-1" /> Import Excel</>}
            </label>
          </div>
        </div>
        <div className="box-body">
          {error && (
            <div className="mb-4 p-4 rounded-lg border border-danger/30 bg-danger/10 text-danger text-sm">
              {error}
            </div>
          )}

          <div className="mb-6 rounded-lg border border-primary/30 bg-primary/5 p-4">
            <h4 className="font-medium text-defaulttextcolor mb-2">Import Week-Offs from Excel</h4>
            <p className="text-sm text-defaulttextcolor/70 mb-4">
              You can import week-off data for multiple candidates at once using an Excel file. Download the template, fill in candidate emails and their week-off days, and upload it.
            </p>
            <p className="text-xs text-defaulttextcolor/60">
              <strong>Excel template columns:</strong> Candidate Email (required) – email address of the candidate. Week-Off Days (comma-separated) (required) – e.g. &quot;Saturday, Sunday&quot; or &quot;Sunday&quot;. Valid days: Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday. Notes (optional).
            </p>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-defaulttextcolor">
                Select Candidates <span className="text-danger">*</span>
              </label>
              {!loading && students.length > 0 && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAllStudents}
                    className="ti-btn ti-btn-soft-primary !py-1 !px-2 !text-xs"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={clearAllStudents}
                    className="ti-btn ti-btn-soft-secondary !py-1 !px-2 !text-xs"
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
              />
            )}
            {selectedStudents.length > 0 && (
              <p className="mt-2 text-sm text-defaulttextcolor/60">
                {selectedStudents.length} candidate(s) selected
              </p>
            )}
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-defaulttextcolor">
                Select Week-Off Days
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAllDays}
                  className="ti-btn ti-btn-soft-primary !py-1 !px-2 !text-xs"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={clearAllDays}
                  className="ti-btn ti-btn-soft-secondary !py-1 !px-2 !text-xs"
                >
                  Clear All
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {WEEK_OFF_DAYS.map((day) => (
                <label
                  key={day}
                  className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedDays.includes(day)
                      ? "border-primary bg-primary/10"
                      : "border-defaultborder hover:border-primary/50 bg-white dark:bg-bodydark"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedDays.includes(day)}
                    onChange={() => toggleDay(day)}
                    className="w-4 h-4 text-primary rounded focus:ring-primary"
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

          <div className="mb-6">
            <button
              type="button"
              onClick={handleUpdateWeekOff}
              disabled={updating || selectedStudents.length === 0}
              className="ti-btn ti-btn-primary"
            >
              {updating ? (
                <>
                  <i className="ri-loader-4-line animate-spin inline-block me-2" />
                  Updating…
                </>
              ) : (
                <>
                  <i className="ri-calendar-line inline-block me-2" />
                  Update Week-Off for {selectedStudents.length} Candidate(s)
                </>
              )}
            </button>
          </div>

          {selectedStudents.length > 0 && (
            <div className="border-t border-defaultborder pt-6">
              <h3 className="text-lg font-semibold text-defaulttextcolor mb-4">
                Current Week-Off Status
                {loadingWeekOff && <i className="ri-loader-4-line animate-spin ms-2 text-primary" />}
              </h3>
              {loadingWeekOff ? (
                <div className="py-8 text-center text-defaulttextcolor/70">
                  <i className="ri-loader-4-line animate-spin text-2xl mb-2" />
                  <p>Loading week-off data…</p>
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
                        className="p-4 rounded-lg border border-defaultborder bg-gray-50 dark:bg-white/5"
                      >
                        <h4 className="font-medium text-defaulttextcolor mb-1">
                          {data?.studentName ?? selected.label}
                        </h4>
                        <p className="text-sm text-defaulttextcolor/70 mb-2">
                          {data?.studentEmail ?? ""}
                        </p>
                        {weekOff.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {weekOff.map((d) => (
                              <span
                                key={d}
                                className="px-2.5 py-1 bg-primary/10 text-primary rounded text-xs font-medium"
                              >
                                {d}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-defaulttextcolor/60 italic">
                            No week-off days set
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="mt-6 p-4 rounded-lg border border-primary/20 bg-primary/5">
            <div className="flex items-start gap-3">
              <i className="ri-information-line text-primary text-xl mt-0.5" />
              <div>
                <h4 className="font-medium text-defaulttextcolor mb-1">How it works</h4>
                <ul className="text-sm text-defaulttextcolor/80 space-y-1 list-disc list-inside">
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
      </div>
    </>
  );
}
