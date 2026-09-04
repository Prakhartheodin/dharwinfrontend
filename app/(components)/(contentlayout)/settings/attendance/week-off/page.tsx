"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getCandidate, getCandidateWeekOff, listCandidates, updateWeekOff } from "@/shared/lib/api/candidates";
import {
  getStudent,
  listStudents,
  listWeekOffDayCounts,
  updateWeekOffCalendar,
  getStudentWeekOff,
  importWeekOffBulk,
  exportWeekOffExcel,
  WEEK_OFF_DAYS,
  type ImportWeekOffEntry,
} from "@/shared/lib/api/students";
import {
  getAlreadyAssignedMessage,
  getNoOpUpdateMessage,
  isDayAlreadyOnAllSelected,
  isWeekOffNoOp,
  buildWeekOffExportFilename,
} from "@/shared/lib/week-off-utils";
import {
  buildMergedAssignPeopleOptions,
  partitionAssignPersonRows,
  type AssignPersonRow,
} from "@/shared/lib/attendance-assign-people-options";
import Seo from "@/shared/layout-components/seo/seo";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import dynamic from "next/dynamic";
import { useAuth } from "@/shared/contexts/auth-context";
import { SopAssignChecklistNotice, useSopPreselectStudents } from "@/shared/hooks/use-sop-assign-deeplink";
import { dispatchSopStripRefresh } from "@/shared/lib/sop-strip-preferences";
import { usePmReactSelectStyles } from "@/shared/hooks/usePmReactSelectStyles";
import WeekOffDayPicker from "@/shared/components/WeekOffDayPicker";
import WeekOffDayRoster from "./WeekOffDayRoster";

const Select = dynamic(() => import("react-select"), { ssr: false });

const VALID_DAYS_SET = new Set<string>(WEEK_OFF_DAYS);
const STATUS_CAP = 10;
const PEOPLE_SEARCH_LIMIT = 20;
const PEOPLE_SEARCH_DEBOUNCE_MS = 300;

type ViewMode = "assign" | "review";

function parseView(raw: string | null): ViewMode {
  if (raw === "review" || raw === "whos-off" || raw === "by-day") return "review";
  return "assign";
}

function parseDay(raw: string | null): string {
  if (!raw) return "Monday";
  const found = WEEK_OFF_DAYS.find((d) => d.toLowerCase() === raw.toLowerCase());
  return found ?? "Monday";
}

function emptyDayCounts(): Record<string, number> {
  return Object.fromEntries(WEEK_OFF_DAYS.map((day) => [day, 0]));
}

type WeekOffData = {
  studentId: string;
  studentName: string;
  studentEmail: string;
  weekOff: string[];
};

function hasWeekOffAccess(permissions: string[], isAdministrator: boolean): boolean {
  if (isAdministrator) return true;
  const hasStudentsManage = permissions.some(
    (p) => (p.includes("settings.students") || p === "students.manage") && (p.includes("create") || p.includes("edit") || p.includes("delete") || p.includes("manage"))
  );
  const hasAttendanceManage = permissions.some(
    (p) =>
      (p.includes("training.attendance") ||
        p.includes("settings.attendance") ||
        p === "attendance.manage") &&
      (p.includes("create") || p.includes("edit") || p.includes("view,create,edit"))
  );
  return hasStudentsManage || hasAttendanceManage;
}

export default function SettingsAttendanceWeekOffPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sopQueryString = searchParams.toString();
  const viewMode = parseView(searchParams.get("view"));
  const reviewDay = parseDay(searchParams.get("day"));
  const { permissions, permissionsLoaded, isAdministrator } = useAuth();
  const canAccess = hasWeekOffAccess(permissions, isAdministrator);
  const { menuPortalTarget: selectMenuPortalTarget, styles: selectMenuLayerStyles } = usePmReactSelectStyles(10060);
  const [people, setPeople] = useState<AssignPersonRow[]>([]);
  const [selectedPeople, setSelectedPeople] = useState<AssignPersonRow[]>([]);
  const [peopleQuery, setPeopleQuery] = useState("");
  const [peopleSearching, setPeopleSearching] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [updating, setUpdating] = useState(false);
  const [loadingWeekOff, setLoadingWeekOff] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [studentWeekOffs, setStudentWeekOffs] = useState<Record<string, WeekOffData>>({});
  const [hasUserSelectedDays, setHasUserSelectedDays] = useState(false);
  const [exportFilterDays, setExportFilterDays] = useState<string[]>([]);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [importingExcel, setImportingExcel] = useState(false);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const exportModalRef = useRef<HTMLDivElement>(null);
  const selectedPeopleRef = useRef<AssignPersonRow[]>([]);
  const [rosterRefreshToken, setRosterRefreshToken] = useState(0);
  const [dayCounts, setDayCounts] = useState<Record<string, number>>(emptyDayCounts);

  selectedPeopleRef.current = selectedPeople;

  const writeViewDay = useCallback(
    (view: ViewMode, day: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("view", view);
      params.set("day", day);
      if (searchParams.get("view") === view && searchParams.get("day") === day) return;
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    const view = parseView(searchParams.get("view"));
    const day = parseDay(searchParams.get("day"));
    if (searchParams.get("view") === view && searchParams.get("day") === day) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", view);
    params.set("day", day);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, pathname, router]);

  const mergePeople = (selected: AssignPersonRow[], hits: AssignPersonRow[]) => {
    const byValue = new Map<string, AssignPersonRow>();
    for (const row of [...selected, ...hits]) byValue.set(row.value, row);
    return [...byValue.values()];
  };

  useEffect(() => {
    const needle = peopleQuery.trim();
    if (!needle) {
      setPeople(selectedPeopleRef.current);
      setPeopleSearching(false);
      return;
    }
    let cancelled = false;
    setPeopleSearching(true);
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const looksLikeEmail = needle.includes("@");
          const [stuRes, candRes] = await Promise.all([
            listStudents({ limit: PEOPLE_SEARCH_LIMIT, search: needle, sortBy: "user.name:asc" }),
            listCandidates({
              limit: PEOPLE_SEARCH_LIMIT,
              search: needle,
              ...(looksLikeEmail ? { email: needle } : {}),
              employmentStatus: "all",
              sortBy: "fullName:asc",
            }),
          ]);
          if (cancelled) return;
          const hits = buildMergedAssignPeopleOptions(stuRes.results ?? [], candRes.results ?? []);
          setPeople(mergePeople(selectedPeopleRef.current, hits));
        } catch (err: unknown) {
          if (cancelled) return;
          const msg = (err as { message?: string })?.message ?? "Failed to search people";
          setError(msg);
        } finally {
          if (!cancelled) setPeopleSearching(false);
        }
      })();
    }, PEOPLE_SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [peopleQuery]);

  useEffect(() => {
    if (peopleQuery.trim()) return;
    setPeople(selectedPeople);
  }, [selectedPeople, peopleQuery]);

  const mergeSopPerson = useCallback((row: AssignPersonRow) => {
    setPeople((prev) => (prev.some((s) => s.value === row.value) ? prev : [row, ...prev]));
  }, []);

  useEffect(() => {
    if (!canAccess) return;
    const sp = new URLSearchParams(sopQueryString);
    const sid = sp.get("studentId")?.trim();
    const cid = sp.get("candidateId")?.trim();
    if (!sid && !cid) return;
    let cancelled = false;
    void (async () => {
      try {
        if (sid) {
          const student = await getStudent(sid);
          if (cancelled) return;
          const row = buildMergedAssignPeopleOptions([student], [])[0];
          if (row) mergeSopPerson(row);
          return;
        }
        if (cid) {
          const candidate = await getCandidate(cid);
          if (cancelled) return;
          const row = buildMergedAssignPeopleOptions([], [candidate])[0];
          if (row) mergeSopPerson(row);
        }
      } catch {
        // SOP hook may still resolve candidateId once a row is present
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canAccess, sopQueryString, mergeSopPerson]);

  useSopPreselectStudents(people, setSelectedPeople, sopQueryString, mergeSopPerson);

  const fetchDayCounts = useCallback(async () => {
    if (!canAccess) return;
    try {
      const result = await listWeekOffDayCounts();
      setDayCounts({ ...emptyDayCounts(), ...(result.counts ?? {}) });
    } catch {
      setDayCounts(emptyDayCounts());
    }
  }, [canAccess]);

  useEffect(() => {
    if (canAccess) void fetchDayCounts();
  }, [canAccess, rosterRefreshToken, fetchDayCounts]);

  const fetchStudentWeekOffs = useCallback(async () => {
    if (selectedPeople.length === 0) {
      setStudentWeekOffs({});
      return;
    }
    setLoadingWeekOff(true);
    const weekOffMap: Record<string, WeekOffData> = {};
    try {
      await Promise.all(
        selectedPeople.map(async (selected) => {
          const rowKey = selected.value;
          if (selected.kind === "candidate_only") {
            try {
              const response = await getCandidateWeekOff(selected.candidateId);
              const r = response as {
                weekOff?: string[];
                candidateName?: string;
                candidateEmail?: string;
              };
              weekOffMap[rowKey] = {
                studentId: rowKey,
                studentName: r.candidateName ?? selected.fullName,
                studentEmail: r.candidateEmail ?? selected.email,
                weekOff: r.weekOff ?? [],
              };
            } catch {
              weekOffMap[rowKey] = {
                studentId: rowKey,
                studentName: selected.fullName,
                studentEmail: selected.email,
                weekOff: [],
              };
            }
            return;
          }
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
  }, [selectedPeople]);

  useEffect(() => {
    fetchStudentWeekOffs();
  }, [fetchStudentWeekOffs]);

  const handleStudentChange = (selected: AssignPersonRow[] | null) => {
    setSelectedPeople(selected ?? []);
    setSelectedDays([]);
    setHasUserSelectedDays(false);
  };

  const clearAllStudents = () => {
    setSelectedPeople([]);
    setSelectedDays([]);
    setHasUserSelectedDays(false);
  };

  const toggleDay = async (day: string) => {
    const isRemoving = selectedDays.includes(day);
    if (!isRemoving && selectedPeople.length > 0 && Object.keys(studentWeekOffs).length > 0) {
      if (isDayAlreadyOnAllSelected(day, studentWeekOffs, selectedPeople)) {
        await Swal.fire({
          icon: "info",
          title: "Already assigned",
          text: getAlreadyAssignedMessage(day),
          confirmButtonText: "OK",
        });
        return;
      }
    }
    setHasUserSelectedDays(true);
    setSelectedDays((prev) =>
      isRemoving ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const toggleExportFilterDay = (day: string) => {
    setExportFilterDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const selectAllExportFilterDays = () => setExportFilterDays([...WEEK_OFF_DAYS]);
  const clearAllExportFilterDays = () => setExportFilterDays([]);

  const openExportModal = () => setExportModalOpen(true);
  const closeExportModal = () => {
    if (!exportingExcel) setExportModalOpen(false);
  };

  useEffect(() => {
    if (!exportModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !exportingExcel) setExportModalOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    const previouslyFocused = document.activeElement as HTMLElement | null;
    exportModalRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [exportModalOpen, exportingExcel]);

  const selectAllDays = () => {
    setHasUserSelectedDays(true);
    setSelectedDays([...WEEK_OFF_DAYS]);
  };

  const clearAllDays = () => {
    setHasUserSelectedDays(true);
    setSelectedDays([]);
  };

  const handleUpdateWeekOff = async () => {
    if (selectedPeople.length === 0) {
      await Swal.fire({
        icon: "warning",
        title: "No one selected",
        text: "Select at least one training profile or employee",
        confirmButtonText: "OK",
      });
      return;
    }
    setUpdating(true);
    setError(null);
    try {
      const { studentRows, candidateRows } = partitionAssignPersonRows(selectedPeople);
      if (studentRows.length === 0 && candidateRows.length === 0) {
        await Swal.fire({
          icon: "warning",
          title: "Nothing to update",
          text: "Select at least one training profile or employee",
          confirmButtonText: "OK",
        });
        setUpdating(false);
        return;
      }
      if (isWeekOffNoOp(selectedDays, studentWeekOffs, selectedPeople)) {
        await Swal.fire({
          icon: "info",
          title: "No changes",
          text: getNoOpUpdateMessage(),
          confirmButtonText: "OK",
        });
        setUpdating(false);
        return;
      }
      const tasks: Promise<unknown>[] = [];
      if (studentRows.length) {
        tasks.push(updateWeekOffCalendar(studentRows.map((r) => r.value), selectedDays));
      }
      if (candidateRows.length) {
        tasks.push(updateWeekOff(candidateRows.map((r) => r.candidateId), selectedDays));
      }
      await Promise.all(tasks);
      await Swal.fire({
        icon: "success",
        title: "Success",
        text: `Week-off updated for ${studentRows.length} training profile(s)${
          candidateRows.length ? ` and ${candidateRows.length} employee(s)` : ""
        }`,
        confirmButtonText: "OK",
      });
      dispatchSopStripRefresh();
      setRosterRefreshToken((n) => n + 1);
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

  const handleExportWeekOff = async () => {
    if (exportFilterDays.length === 0) return;
    setExportingExcel(true);
    setError(null);
    try {
      const { blob, rowCount } = await exportWeekOffExcel(exportFilterDays);
      if (rowCount === 0) {
        await Swal.fire({
          icon: "info",
          title: "No matching records",
          text: "No people have the selected week-off days. Try different days or check assignments.",
          confirmButtonText: "OK",
        });
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = buildWeekOffExportFilename(exportFilterDays);
      a.click();
      URL.revokeObjectURL(url);
      setExportModalOpen(false);
      await Swal.fire({
        icon: "success",
        title: "Export complete",
        text: `Downloaded ${rowCount} record${rowCount === 1 ? "" : "s"}.`,
        confirmButtonText: "OK",
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data
          ?.message ?? (err as { message?: string })?.message ?? "Failed to export week-off data";
      setError(msg);
      await Swal.fire({ icon: "error", title: "Export failed", text: msg, confirmButtonText: "OK" });
    } finally {
      setExportingExcel(false);
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
      setRosterRefreshToken((n) => n + 1);
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
    if (selectedPeople.length === 0) return [];
    const allWeekOffs = selectedPeople
      .map((s) => studentWeekOffs[s.value]?.weekOff ?? [])
      .filter((wo) => wo.length > 0);
    if (allWeekOffs.length === 0) return [];
    return allWeekOffs.reduce((common, weekOff) => common.filter((d) => weekOff.includes(d)), allWeekOffs[0] ?? []);
  }, [selectedPeople, studentWeekOffs]);

  useEffect(() => {
    if (
      selectedPeople.length > 0 &&
      Object.keys(studentWeekOffs).length > 0 &&
      !hasUserSelectedDays
    ) {
      const common = getCommonWeekOffDays();
      if (common.length > 0) setSelectedDays(common);
    }
  }, [studentWeekOffs, selectedPeople, getCommonWeekOffDays, hasUserSelectedDays]);

  if (!permissionsLoaded) {
    return (
      <>
        <Seo title="Manage Week-Off Calendar" />
        <div className="w-full mt-4">
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
        <div className="w-full mt-4">
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

  const statusRows = selectedPeople.slice(0, STATUS_CAP);

  return (
    <>
      <Seo title="Manage Week-Off Calendar" />
      <div className="relative mt-4 min-h-[40vh] w-full min-w-0 space-y-6">
        <section className="overflow-hidden rounded-2xl border border-defaultborder/70 bg-white dark:bg-bodybg">
          <div className="flex min-w-0 flex-col gap-4 border-b border-defaultborder/50 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6">
            <div className="flex min-w-0 w-full items-start gap-3 sm:w-auto sm:items-center sm:gap-4">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/10 dark:ring-primary/20 sm:h-12 sm:w-12"
                aria-hidden
              >
                <i className="ri-calendar-schedule-line text-2xl" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold tracking-tight text-defaulttextcolor dark:text-white sm:text-lg">
                  Manage Week-Off Calendar
                </h2>
                <p className="mt-0.5 text-xs leading-relaxed text-defaulttextcolor/60 dark:text-white/50">
                  Assign week-off days, or review who has a given day.
                </p>
              </div>
            </div>
            <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={openExportModal}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-defaultborder/80 bg-transparent px-4 py-2.5 text-sm font-medium text-defaulttextcolor transition-colors hover:bg-slate-100 dark:hover:bg-white/10 sm:w-auto"
              >
                <i className="ri-file-excel-2-line text-base" />
                Export Excel
              </button>
              <button
                type="button"
                onClick={downloadTemplate}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-defaultborder/80 bg-transparent px-4 py-2.5 text-sm font-medium text-defaulttextcolor transition-colors hover:bg-slate-100 dark:hover:bg-white/10 sm:w-auto"
              >
                <i className="ri-download-line text-base" />
                Download Template
              </button>
              <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-defaultborder/80 bg-transparent px-4 py-2.5 text-sm font-medium text-defaulttextcolor transition-colors hover:bg-slate-100 disabled:opacity-60 dark:hover:bg-white/10 sm:w-auto">
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

          <div className="space-y-6 px-4 py-6 sm:px-6">
            {error && (
              <div className="rounded-xl border border-danger/30 bg-danger/10 dark:bg-danger/15 px-4 py-3 text-sm text-danger">
                {error}
              </div>
            )}

            <SopAssignChecklistNotice />

            <div className="inline-flex rounded-xl border border-defaultborder/80 bg-white p-1 dark:bg-white/5" role="tablist" aria-label="Week-off view">
              <button
                type="button"
                role="tab"
                id="week-off-tab-assign"
                aria-selected={viewMode === "assign"}
                aria-controls="week-off-panel-assign"
                onClick={() => writeViewDay("assign", reviewDay)}
                className={`flex min-h-11 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  viewMode === "assign" ? "bg-primary text-white shadow-sm" : "text-defaulttextcolor hover:text-primary"
                }`}
              >
                <i className="ri-user-line" />
                Assign
              </button>
              <button
                type="button"
                role="tab"
                id="week-off-tab-review"
                aria-selected={viewMode === "review"}
                aria-controls="week-off-panel-by-day"
                onClick={() => writeViewDay("review", reviewDay)}
                className={`flex min-h-11 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  viewMode === "review" ? "bg-primary text-white shadow-sm" : "text-defaulttextcolor hover:text-primary"
                }`}
              >
                <i className="ri-group-line" />
                Who&apos;s off
              </button>
            </div>

            {viewMode === "review" ? (
              <div id="week-off-panel-by-day" role="tabpanel" aria-labelledby="week-off-tab-review">
                <WeekOffDayRoster
                  key={reviewDay}
                  selectedDay={reviewDay}
                  onSelectedDayChange={(day) => writeViewDay("review", day)}
                  dayCounts={dayCounts}
                  refreshToken={rosterRefreshToken}
                  onPersonWeekOffChanged={() => {
                    void fetchStudentWeekOffs();
                    void fetchDayCounts();
                  }}
                />
              </div>
            ) : (
            <div id="week-off-panel-assign" role="tabpanel" aria-labelledby="week-off-tab-assign" className="space-y-6">
            <div>
              <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <label className="block text-sm font-semibold text-defaulttextcolor">
                  Select people <span className="text-danger">*</span>
                </label>
                {selectedPeople.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAllStudents}
                    className="min-h-11 text-left text-sm font-medium text-defaulttextcolor/80 hover:text-defaulttextcolor"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="overflow-hidden rounded-xl border border-defaultborder/80 bg-white transition-all duration-150 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 dark:bg-white/5">
                <Select
                  isMulti
                  options={people}
                  value={selectedPeople}
                  getOptionValue={(o) => (o as AssignPersonRow).value}
                  getOptionLabel={(o) => (o as AssignPersonRow).label}
                  onChange={(v) => handleStudentChange(v as AssignPersonRow[] | null)}
                  onInputChange={(value, meta) => {
                    if (meta.action === "input-change") setPeopleQuery(value);
                    return value;
                  }}
                  placeholder="Search name, email, or ID…"
                  noOptionsMessage={({ inputValue }) =>
                    peopleSearching
                      ? "Searching…"
                      : inputValue.trim()
                        ? `No people match “${inputValue.trim()}”`
                        : "Type to search the directory"
                  }
                  classNamePrefix="react-select"
                  isClearable
                  isSearchable
                  filterOption={null}
                  isLoading={peopleSearching}
                  menuPortalTarget={selectMenuPortalTarget}
                  menuPosition="fixed"
                  styles={selectMenuLayerStyles}
                />
              </div>
              <p className="mt-1.5 text-xs text-defaulttextcolor/60">
                Search by name or email. No Select All — use Who&apos;s off to review everyone on a day.
                {selectedPeople.length > 0 ? ` ${selectedPeople.length} selected.` : ""}
              </p>
            </div>

            <div>
              <h3 className="mb-1 text-sm font-semibold text-defaulttextcolor dark:text-white">
                Assign week-off days
              </h3>
              <p className="mb-4 text-xs text-defaulttextcolor/60 dark:text-white/50">
                Choose days to apply to the selected people above
              </p>
              <WeekOffDayPicker
                selectedDays={selectedDays}
                onToggleDay={toggleDay}
                onSelectAll={selectAllDays}
                onClearAll={clearAllDays}
                showBulkActions
                showSummary={false}
                legend="Select week-off days to assign"
              />
            </div>

            <div>
              <button
                type="button"
                onClick={handleUpdateWeekOff}
                disabled={updating || selectedPeople.length === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-primary/90 hover:shadow-md disabled:pointer-events-none disabled:opacity-60"
              >
                {updating ? (
                  <>
                    <i className="ri-loader-4-line animate-spin text-lg" />
                    Updating…
                  </>
                ) : (
                  <>
                    <i className="ri-calendar-check-line text-lg" />
                    Update week-off for {selectedPeople.length} selected
                  </>
                )}
              </button>
              {selectedPeople.length === 0 && (
                <p className="mt-2 text-xs text-defaulttextcolor/60">Search and add at least one person.</p>
              )}
            </div>

            {selectedPeople.length > 0 && (
              <div className="border-t border-defaultborder/50 pt-6">
                <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-defaulttextcolor dark:text-white">
                  Current week-off
                  {loadingWeekOff && <i className="ri-loader-4-line animate-spin text-primary" />}
                </h3>
                {loadingWeekOff ? (
                  <div className="overflow-hidden rounded-xl border border-defaultborder/70">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="flex gap-4 border-b border-defaultborder/50 px-5 py-4 last:border-b-0">
                        <div className="h-4 w-36 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
                        <div className="h-4 flex-1 animate-pulse rounded bg-slate-100 dark:bg-white/5" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <p className="mb-4 text-sm text-defaulttextcolor/70">
                      Showing {statusRows.length} of {selectedPeople.length}
                      {selectedPeople.length > STATUS_CAP
                        ? " — use Who’s off to review the full list."
                        : ""}
                    </p>
                    <div className="overflow-x-auto rounded-xl border border-defaultborder/70">
                      <table className="min-w-full table-auto">
                        <thead>
                          <tr className="border-b border-defaultborder/60 bg-slate-50/80 dark:bg-white/[0.04]">
                            <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70">
                              Name
                            </th>
                            <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70">
                              Email
                            </th>
                            <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70">
                              Week-off
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-defaultborder/50">
                          {statusRows.map((selected) => {
                            const data = studentWeekOffs[selected.value];
                            const weekOff = data?.weekOff ?? [];
                            const email = data?.studentEmail ?? (selected.kind === "candidate_only" ? selected.email : selected.student?.user?.email ?? "");
                            return (
                              <tr key={selected.value} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02]">
                                <td className="px-5 py-4 font-medium text-defaulttextcolor">
                                  {data?.studentName ?? selected.label}
                                </td>
                                <td className="px-5 py-4 text-sm text-defaulttextcolor/85" title={email}>
                                  {email}
                                </td>
                                <td className="px-5 py-4 text-sm text-defaulttextcolor/70">
                                  {weekOff.length ? weekOff.join(", ") : "None"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}
            </div>
            )}

          </div>
        </section>

        {exportModalOpen && (
          <div className="fixed inset-0 z-[1060] flex items-center justify-center p-4" role="presentation">
            <button
              type="button"
              className="absolute inset-0 bg-black/50 dark:bg-black/70"
              aria-label="Close export dialog"
              onClick={closeExportModal}
              disabled={exportingExcel}
            />
            <div
              ref={exportModalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="week-off-export-modal-title"
              tabIndex={-1}
              className="relative z-10 w-full max-w-lg rounded-2xl border border-defaultborder/70 bg-white shadow-xl dark:bg-bodybg dark:shadow-none"
            >
              <div className="border-b border-defaultborder/50 px-6 py-4">
                <h2
                  id="week-off-export-modal-title"
                  className="text-lg font-semibold text-defaulttextcolor dark:text-white"
                >
                  Export week-off list
                </h2>
                <p className="mt-1 text-sm text-defaulttextcolor/60 dark:text-white/50">
                  Select one or more days to include in the report
                </p>
              </div>
              <div className="px-6 py-4">
                <WeekOffDayPicker
                  selectedDays={exportFilterDays}
                  onToggleDay={toggleExportFilterDay}
                  onSelectAll={selectAllExportFilterDays}
                  onClearAll={clearAllExportFilterDays}
                  showBulkActions
                  showSummary
                  legend="Filter export by week-off day"
                  summaryId="week-off-export-filter-summary"
                />
              </div>
              <div className="flex flex-col-reverse gap-2 border-t border-defaultborder/50 px-6 py-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeExportModal}
                  disabled={exportingExcel}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-defaultborder/80 bg-transparent px-4 py-2.5 text-sm font-medium text-defaulttextcolor transition-colors hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-60 dark:hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExportWeekOff}
                  disabled={exportingExcel || exportFilterDays.length === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-primary/90 hover:shadow-md disabled:pointer-events-none disabled:opacity-60"
                >
                  {exportingExcel ? (
                    <>
                      <i className="ri-loader-4-line animate-spin text-base" />
                      Exporting…
                    </>
                  ) : (
                    <>
                      <i className="ri-file-excel-2-line text-base" />
                      Export Excel
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
