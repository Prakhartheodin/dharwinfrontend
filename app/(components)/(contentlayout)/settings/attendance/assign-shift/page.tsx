"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { assignShiftToCandidates, getCandidate, listCandidates } from "@/shared/lib/api/candidates";
import { assignShiftToStudents, getStudent, listStudents } from "@/shared/lib/api/students";
import {
  ASSIGN_SHIFT_SHIFTS_READ_MESSAGE,
  resolveAssignShiftPageGates,
} from "@/shared/lib/attendance-access";
import {
  buildMergedAssignPeopleOptions,
  partitionAssignPersonRows,
  type AssignPersonRow,
} from "@/shared/lib/attendance-assign-people-options";
import { getAllShifts, type Shift } from "@/shared/lib/api/shifts";
import { ROUTES } from "@/shared/lib/constants";
import Seo from "@/shared/layout-components/seo/seo";
import Swal from "sweetalert2";
import dynamic from "next/dynamic";
import { useAuth } from "@/shared/contexts/auth-context";
import { SopAssignChecklistNotice, useSopPreselectStudents } from "@/shared/hooks/use-sop-assign-deeplink";
import { dispatchSopStripRefresh } from "@/shared/lib/sop-strip-preferences";
import { usePmReactSelectStyles } from "@/shared/hooks/usePmReactSelectStyles";
import ShiftAssigneeRoster from "./ShiftAssigneeRoster";

const AsyncSelect = dynamic(() => import("react-select/async"), { ssr: false });

const PEOPLE_SEARCH_LIMIT = 20;
const PEOPLE_SEARCH_DEBOUNCE_MS = 300;

type ViewMode = "assign" | "assigned";

function parseView(raw: string | null): ViewMode {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "assigned" || v === "roster" || v === "whos-assigned" || v === "review") return "assigned";
  return "assign";
}

function errMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string } | undefined;
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

function currentShiftId(row: AssignPersonRow): string {
  if (row.kind !== "student") return "";
  const s = row.student.shift;
  if (!s) return "";
  if (typeof s === "string") return s;
  return String(s._id ?? s.id ?? "").trim();
}

function currentShiftName(row: AssignPersonRow): string {
  if (row.kind !== "student") return "";
  const s = row.student.shift;
  if (!s || typeof s === "string") return "";
  return (s.name ?? "").trim();
}

function withShiftLabel(row: AssignPersonRow): AssignPersonRow {
  const name = currentShiftName(row);
  if (!name) return row;
  return { ...row, label: `${row.label} · ${name}` };
}

function mergePeople(selected: AssignPersonRow[], hits: AssignPersonRow[]): AssignPersonRow[] {
  const byValue = new Map<string, AssignPersonRow>();
  for (const row of [...selected, ...hits]) byValue.set(row.value, row);
  return [...byValue.values()];
}

function warnAssign(title: string, text: string) {
  return Swal.fire({ icon: "warning", title, text, confirmButtonText: "OK" });
}

function conflictLabel(row: AssignPersonRow): string {
  const who = row.kind === "student" ? row.student.user?.name ?? row.label : row.fullName || row.label;
  return `${who} (${currentShiftName(row) || "another shift"})`;
}

async function confirmOverwriteShift(conflicts: AssignPersonRow[]): Promise<boolean> {
  const preview = conflicts.slice(0, 5).map(conflictLabel).join(", ");
  const extra = conflicts.length > 5 ? ` and ${conflicts.length - 5} more` : "";
  const who = conflicts.length === 1 ? "person has" : "people have";
  const confirmed = await Swal.fire({
    icon: "warning",
    title: "Overwrite current shift?",
    text: `${conflicts.length} selected ${who} a different shift: ${preview}${extra}. Assign anyway?`,
    showCancelButton: true,
    confirmButtonText: "Overwrite",
    cancelButtonText: "Cancel",
    focusCancel: true,
  });
  return confirmed.isConfirmed;
}

function peopleSearchEmptyMessage(searching: boolean, inputValue: string): string {
  if (searching) return "Searching…";
  const needle = inputValue.trim();
  if (needle) return `No people match “${needle}”`;
  return "No people found";
}

function viewTabClass(active: boolean): string {
  const base = "flex min-h-11 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200";
  if (active) return `${base} bg-primary text-white shadow-sm`;
  return `${base} text-defaulttextcolor hover:text-primary`;
}

export default function SettingsAttendanceAssignShiftPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sopQueryString = searchParams.toString();
  const viewMode = parseView(searchParams.get("view"));
  const selectedShiftId = searchParams.get("shift")?.trim() ?? "";
  const { permissions, permissionsLoaded, isAdministrator, isPlatformSuperUser } = useAuth();
  const {
    canAccess,
    canLoadShifts,
    canReadStudents,
    canReadEmployees,
    canMutateStudents,
    canMutateCandidates,
    canSearchStudents,
    canSearchCandidates,
  } = resolveAssignShiftPageGates(permissions, isAdministrator, isPlatformSuperUser);
  const canMutate = canMutateStudents || canMutateCandidates;
  const canSearchPeople = canSearchStudents || canSearchCandidates;
  const { menuPortalTarget: selectMenuPortalTarget, styles: selectMenuLayerStyles } = usePmReactSelectStyles(10060);

  const [people, setPeople] = useState<AssignPersonRow[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedPeople, setSelectedPeople] = useState<AssignPersonRow[]>([]);
  const [peopleSearching, setPeopleSearching] = useState(false);
  const [peopleRetry, setPeopleRetry] = useState(0);
  const [loadingShifts, setLoadingShifts] = useState(true);
  const [shiftsError, setShiftsError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rosterRefreshToken, setRosterRefreshToken] = useState(0);
  const selectedPeopleRef = useRef<AssignPersonRow[]>([]);
  const sopInjectedRef = useRef<AssignPersonRow[]>([]);
  const loadTimerRef = useRef<number | undefined>(undefined);
  const loadSeqRef = useRef(0);
  selectedPeopleRef.current = selectedPeople;

  const writeShiftView = useCallback(
    (shift: string, view: ViewMode) => {
      const params = new URLSearchParams(searchParams.toString());
      if (shift) params.set("shift", shift);
      else params.delete("shift");
      params.set("view", view);
      const next = params.toString();
      if (searchParams.toString() === next) return;
      router.replace(`${pathname}?${next}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    const view = parseView(searchParams.get("view"));
    if (searchParams.get("view") === view) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", view);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, pathname, router]);

  const fetchShifts = useCallback(async () => {
    setLoadingShifts(true);
    setShiftsError(null);
    try {
      const res = await getAllShifts({ isActive: true, limit: 500, sortBy: "name:asc" });
      const data = (res as { data?: { results?: Shift[] } }).data;
      setShifts(data?.results ?? []);
    } catch (err: unknown) {
      setShiftsError(errMessage(err, "Failed to load shifts"));
    } finally {
      setLoadingShifts(false);
    }
  }, []);

  useEffect(() => {
    if (!canAccess) return;
    if (!canLoadShifts) {
      setLoadingShifts(false);
      setShifts([]);
      setShiftsError(null);
      return;
    }
    void fetchShifts();
  }, [canAccess, canLoadShifts, fetchShifts]);

  const loadPeopleOptions = useCallback(
    (inputValue: string): Promise<AssignPersonRow[]> => {
      const needle = (inputValue ?? "").trim();
      const delay = needle ? PEOPLE_SEARCH_DEBOUNCE_MS : 0;
      const seq = ++loadSeqRef.current;
      if (loadTimerRef.current !== undefined) window.clearTimeout(loadTimerRef.current);
      setPeopleSearching(true);
      return new Promise((resolve) => {
        loadTimerRef.current = window.setTimeout(() => {
          void (async () => {
            const fallback = mergePeople(selectedPeopleRef.current, sopInjectedRef.current);
            if (!canSearchStudents && !canSearchCandidates) {
              if (seq === loadSeqRef.current) {
                setPeopleSearching(false);
                setError(null);
              }
              resolve(fallback);
              return;
            }
            try {
              const looksLikeEmail = needle.includes("@");
              const failures: string[] = [];
              let studentResults: Awaited<ReturnType<typeof listStudents>>["results"] = [];
              let candidateResults: Awaited<ReturnType<typeof listCandidates>>["results"] = [];

              if (canSearchStudents) {
                try {
                  const stuRes = await listStudents({
                    limit: PEOPLE_SEARCH_LIMIT,
                    ...(needle ? { search: needle } : {}),
                    sortBy: "user.name:asc",
                  });
                  studentResults = stuRes.results ?? [];
                } catch (err: unknown) {
                  failures.push(errMessage(err, "Failed to search training profiles"));
                }
              }

              if (canSearchCandidates) {
                try {
                  const candRes = await listCandidates({
                    limit: PEOPLE_SEARCH_LIMIT,
                    ...(needle ? { search: needle } : {}),
                    ...(looksLikeEmail ? { email: needle } : {}),
                    employmentStatus: "all",
                    sortBy: "fullName:asc",
                  });
                  candidateResults = candRes.results ?? [];
                } catch (err: unknown) {
                  failures.push(errMessage(err, "Failed to search employees"));
                }
              }

              if (seq !== loadSeqRef.current) return;
              const hits = buildMergedAssignPeopleOptions(studentResults, candidateResults).map(withShiftLabel);
              const merged = mergePeople([...selectedPeopleRef.current, ...sopInjectedRef.current], hits);
              setPeople(merged);
              if (failures.length === 0) setError(null);
              else if (failures.length === 1) setError(failures[0]);
              else setError(failures.join(" · "));
              resolve(merged);
            } catch (err: unknown) {
              if (seq !== loadSeqRef.current) return;
              setError(errMessage(err, "Failed to search people"));
              resolve(fallback);
            } finally {
              if (seq === loadSeqRef.current) setPeopleSearching(false);
            }
          })();
        }, delay);
      });
    },
    [canSearchStudents, canSearchCandidates]
  );

  useEffect(() => {
    return () => {
      if (loadTimerRef.current !== undefined) window.clearTimeout(loadTimerRef.current);
      loadSeqRef.current += 1;
    };
  }, []);

  const mergeSopPerson = useCallback((row: AssignPersonRow) => {
    const labeled = withShiftLabel(row);
    sopInjectedRef.current = mergePeople(sopInjectedRef.current, [labeled]);
    setPeople((prev) => (prev.some((s) => s.value === labeled.value) ? prev : [labeled, ...prev]));
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
          if (!canSearchStudents) return;
          const student = await getStudent(sid);
          if (cancelled) return;
          const row = buildMergedAssignPeopleOptions([student], [])[0];
          if (row) mergeSopPerson(row);
          return;
        }
        if (cid) {
          if (!canSearchCandidates) return;
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
  }, [canAccess, canSearchStudents, canSearchCandidates, sopQueryString, mergeSopPerson]);

  useSopPreselectStudents(people, setSelectedPeople, sopQueryString, mergeSopPerson);

  const selectedShiftName =
    shifts.find((s) => (s._id ?? s.id) === selectedShiftId)?.name ?? "";

  const selectedAssignableCount = selectedPeople.filter((row) =>
    row.kind === "student" ? canMutateStudents : canMutateCandidates
  ).length;

  const rowIsAssignable = (row: AssignPersonRow) =>
    row.kind === "student"
      ? canSearchStudents
      : canSearchCandidates;

  const handleAssign = async () => {
    if (!canMutate) return;
    if (selectedPeople.length === 0) {
      await warnAssign("No one selected", "Select at least one training profile or employee");
      return;
    }
    if (!selectedShiftId) {
      await warnAssign("No shift selected", "Select a shift");
      return;
    }
    const { studentRows, candidateRows } = partitionAssignPersonRows(selectedPeople);
    const studentsToAssign = canSearchStudents ? studentRows : [];
    const candidatesToAssign = canSearchCandidates ? candidateRows : [];
    const skippedStudentCount = canSearchStudents ? 0 : studentRows.length;
    const skippedCandidateCount = canSearchCandidates ? 0 : candidateRows.length;

    if (studentsToAssign.length === 0 && candidatesToAssign.length === 0) {
      if (skippedStudentCount > 0 && skippedCandidateCount > 0) {
        await warnAssign(
          "Cannot assign",
          "Selected people need view + assign permissions for training profiles (students.read) and employees (employees.read or candidates.read, plus assign permission)."
        );
        return;
      }
      if (skippedCandidateCount > 0) {
        await warnAssign(
          "Cannot assign employees",
          canMutateCandidates && !canReadEmployees
            ? "You can assign employees but need employees.read or candidates.read to select them. Ask an admin for view access."
            : "You don't have permission to assign shifts to employees. Select training profiles only, or ask an admin for employees.edit or candidates.manage."
        );
        return;
      }
      if (skippedStudentCount > 0) {
        await warnAssign(
          "Cannot assign training profiles",
          canMutateStudents && !canReadStudents
            ? "You can assign training profiles but need students.read to select them. Ask an admin for training student view access."
            : "You don't have permission to assign shifts to training profiles."
        );
        return;
      }
      await warnAssign("Nothing to assign", "Select at least one training profile or employee");
      return;
    }

    const assignableSelected = selectedPeople.filter(rowIsAssignable);
    const conflicts = assignableSelected.filter((row) => {
      const cur = currentShiftId(row);
      return Boolean(cur) && cur !== selectedShiftId;
    });
    if (conflicts.length && !(await confirmOverwriteShift(conflicts))) return;

    setAssigning(true);
    setError(null);
    let trainingSaved = false;
    try {
      const parts: string[] = [];
      if (studentsToAssign.length) {
        await assignShiftToStudents(
          studentsToAssign.map((r) => r.value),
          selectedShiftId
        );
        trainingSaved = true;
        parts.push(`${studentsToAssign.length} training profile(s)`);
      }
      if (candidatesToAssign.length) {
        await assignShiftToCandidates(
          candidatesToAssign.map((r) => r.candidateId),
          selectedShiftId
        );
        parts.push(`${candidatesToAssign.length} employee(s)`);
      }
      let successText = parts.length ? `Shift assigned: ${parts.join(" · ")}` : "Shift assigned";
      if (skippedStudentCount > 0) {
        successText += `. ${skippedStudentCount} training profile row(s) were skipped — missing view or assign permission.`;
      }
      if (skippedCandidateCount > 0) {
        successText += `. ${skippedCandidateCount} employee row(s) were skipped — missing view or assign permission.`;
      }
      await Swal.fire({
        icon: skippedStudentCount > 0 || skippedCandidateCount > 0 ? "warning" : "success",
        title: skippedStudentCount > 0 || skippedCandidateCount > 0 ? "Partial assignment" : "Success",
        text: successText,
        confirmButtonText: "OK",
      });
      dispatchSopStripRefresh();
      setRosterRefreshToken((n) => n + 1);
    } catch (err: unknown) {
      const msg = errMessage(err, "Failed to assign shift");
      const employeesFailedAfterTraining = trainingSaved && candidatesToAssign.length > 0;
      const partial = employeesFailedAfterTraining
        ? `Training profiles were saved, but employees were not: ${msg}`
        : msg;
      setError(partial);
      await Swal.fire({
        icon: "error",
        title: employeesFailedAfterTraining ? "Partial update" : "Error",
        text: partial,
        confirmButtonText: "OK",
      });
      if (trainingSaved) setRosterRefreshToken((n) => n + 1);
    } finally {
      setAssigning(false);
    }
  };

  if (!permissionsLoaded) {
    return (
      <>
        <Seo title="Assign Shift" />
        <div className="mt-4 w-full">
          <div className="overflow-hidden rounded-2xl border border-defaultborder/70 bg-white shadow-sm dark:bg-bodybg">
            <div className="px-6 py-20 text-center">
              <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/10">
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
        <Seo title="Assign Shift" />
        <div className="mt-4 w-full">
          <div className="overflow-hidden rounded-2xl border border-defaultborder/70 bg-white shadow-sm dark:bg-bodybg">
            <div className="px-6 py-20 text-center">
              <div className="mb-5 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-danger/10 text-danger ring-1 ring-danger/20">
                <i className="ri-error-warning-line text-5xl" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-defaulttextcolor dark:text-white">Access Denied</h3>
              <p className="mx-auto max-w-md text-sm text-defaulttextcolor/80">
                You need attendance.assign permission (students.manage or attendance.manage) to assign shifts or
                view who is assigned.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Seo title="Assign Shift" />
      <div className="relative mt-4 w-full min-w-0 space-y-6">
        <section className="overflow-hidden rounded-2xl border border-defaultborder/70 bg-white dark:bg-bodybg">
          <div className="flex items-center gap-4 border-b border-defaultborder/50 bg-gradient-to-r from-slate-50/90 to-white px-6 py-5 dark:from-white/[0.03] dark:to-transparent">
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/10 dark:ring-primary/20"
              aria-hidden
            >
              <i className="ri-user-add-line text-2xl" />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold tracking-tight text-defaulttextcolor dark:text-white">
                Assign Shift
              </h2>
              <p className="mt-0.5 text-xs text-defaulttextcolor/60 dark:text-white/50">
                Pick a shift to see who’s on it, then assign more if needed.
              </p>
            </div>
          </div>

          <div className="space-y-6 px-6 py-6">
            {error && (
              <div
                className="flex flex-col gap-3 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger dark:bg-danger/15 sm:flex-row sm:items-center sm:justify-between"
                role="alert"
              >
                <span>{error}</span>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setPeopleRetry((n) => n + 1);
                  }}
                  className="min-h-11 shrink-0 rounded-lg px-3 text-sm font-medium text-danger underline"
                >
                  Retry
                </button>
              </div>
            )}

            <SopAssignChecklistNotice />

            <div>
              <label
                htmlFor="assign-shift-shift"
                className="mb-2 block text-sm font-semibold text-defaulttextcolor dark:text-white"
              >
                Select shift <span className="text-danger">*</span>
              </label>
              {!canLoadShifts ? (
                <div
                  className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-defaulttextcolor dark:text-white"
                  role="status"
                >
                  {ASSIGN_SHIFT_SHIFTS_READ_MESSAGE}
                  {selectedShiftId ? (
                    <p className="mt-2 text-xs text-defaulttextcolor/70">
                      A shift is selected from the URL — use the Assigned tab to review assignees for that shift.
                    </p>
                  ) : null}
                </div>
              ) : shiftsError ? (
                <div
                  className="flex flex-col gap-3 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger sm:flex-row sm:items-center sm:justify-between"
                  role="alert"
                >
                  <span>{shiftsError}</span>
                  <button
                    type="button"
                    onClick={() => void fetchShifts()}
                    className="min-h-11 shrink-0 rounded-lg px-3 text-sm font-medium text-danger underline"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <select
                  id="assign-shift-shift"
                  value={selectedShiftId}
                  onChange={(e) => writeShiftView(e.target.value, viewMode)}
                  disabled={loadingShifts}
                  className="min-h-11 w-full rounded-xl border border-defaultborder/80 bg-white px-4 py-2.5 text-sm text-defaulttextcolor transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-white/5 dark:text-white"
                >
                  <option value="">-- Choose shift --</option>
                  {shifts.map((s) => (
                    <option key={s._id ?? s.id} value={s._id ?? s.id}>
                      {s.name} ({s.startTime}–{s.endTime} {s.timezone})
                    </option>
                  ))}
                </select>
              )}
              {canLoadShifts && !loadingShifts && !shiftsError && shifts.length === 0 && (
                <p className="mt-1.5 text-xs text-warning">
                  No active shifts. Create shifts in{" "}
                  <Link href={ROUTES.settingsAttendanceManageShifts} className="font-medium underline">
                    Manage Shifts
                  </Link>{" "}
                  first.
                </p>
              )}
            </div>

            <div
              className="inline-flex rounded-xl border border-defaultborder/80 bg-white p-1 dark:bg-white/5"
              role="tablist"
              aria-label="Assign shift view"
            >
              <button
                type="button"
                role="tab"
                id="assign-shift-tab-assign"
                aria-selected={viewMode === "assign"}
                aria-controls="assign-shift-panel-assign"
                onClick={() => writeShiftView(selectedShiftId, "assign")}
                className={viewTabClass(viewMode === "assign")}
              >
                <i className="ri-user-add-line" />
                Assign
              </button>
              <button
                type="button"
                role="tab"
                id="assign-shift-tab-assigned"
                aria-selected={viewMode === "assigned"}
                aria-controls="assign-shift-panel-assigned"
                onClick={() => writeShiftView(selectedShiftId, "assigned")}
                className={viewTabClass(viewMode === "assigned")}
              >
                <i className="ri-group-line" />
                Assigned
              </button>
            </div>

            {viewMode === "assigned" ? (
              <div id="assign-shift-panel-assigned" role="tabpanel" aria-labelledby="assign-shift-tab-assigned">
                <ShiftAssigneeRoster
                  shiftId={selectedShiftId}
                  shiftName={selectedShiftName}
                  refreshToken={rosterRefreshToken}
                />
              </div>
            ) : (
              <div
                id="assign-shift-panel-assign"
                role="tabpanel"
                aria-labelledby="assign-shift-tab-assign"
                className="space-y-5"
              >
                <div>
                  <label
                    htmlFor="assign-shift-people"
                    className="mb-2 block text-sm font-semibold text-defaulttextcolor dark:text-white"
                  >
                    Select people <span className="text-danger">*</span>
                  </label>
                  <div className="overflow-hidden rounded-xl border border-defaultborder/80 bg-white transition-all duration-150 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 dark:border-white/10 dark:bg-white/5">
                    <AsyncSelect
                      key={peopleRetry}
                      inputId="assign-shift-people"
                      isMulti
                      defaultOptions
                      loadOptions={loadPeopleOptions}
                      value={selectedPeople}
                      getOptionValue={(o) => (o as AssignPersonRow).value}
                      getOptionLabel={(o) => (o as AssignPersonRow).label}
                      onChange={(sel: unknown) => setSelectedPeople((sel as AssignPersonRow[] | null) ?? [])}
                      placeholder="Search name, email, or ID…"
                      noOptionsMessage={({ inputValue }) => peopleSearchEmptyMessage(peopleSearching, inputValue)}
                      closeMenuOnSelect={false}
                      className="react-select-container assign-shift-select"
                      classNamePrefix="react-select"
                      isClearable
                      isSearchable
                      isDisabled={!canSearchPeople}
                      filterOption={null}
                      isLoading={peopleSearching}
                      menuPortalTarget={selectMenuPortalTarget}
                      menuPosition="fixed"
                      styles={selectMenuLayerStyles}
                    />
                  </div>
                  {selectedPeople.length > 0 && (
                    <p className="mt-1.5 text-xs text-defaulttextcolor/60">
                      {selectedPeople.length} selected
                      {!canSearchCandidates && selectedPeople.some((r) => r.kind === "candidate_only")
                        ? " · employee rows cannot be assigned with your current permissions"
                        : ""}
                      {!canSearchStudents && selectedPeople.some((r) => r.kind === "student")
                        ? " · training profile rows cannot be assigned with your current permissions"
                        : ""}
                    </p>
                  )}
                  {canMutateStudents && !canReadStudents && (
                    <p className="mt-1.5 text-xs text-warning">
                      You can assign shifts to training profiles, but searching them requires students.read (training
                      student view). Ask an admin for view access.
                    </p>
                  )}
                  {canMutateCandidates && !canReadEmployees && (
                    <p className="mt-1.5 text-xs text-warning">
                      You can assign shifts to employees, but searching them requires employees.read or candidates.read.
                      Ask an admin for view access.
                    </p>
                  )}
                  {canMutateStudents && canReadStudents && !canMutateCandidates && (
                    <p className="mt-1.5 text-xs text-warning">
                      You can assign training profiles. Assigning employees requires employees.edit or candidates.manage.
                    </p>
                  )}
                  {!canSearchPeople && (canMutateStudents || canMutateCandidates) && (
                    <p className="mt-1.5 text-xs text-defaulttextcolor/70">
                      People search is disabled until you have the read permissions needed for the profiles you can assign.
                    </p>
                  )}
                </div>

                {canMutate ? (
                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => void handleAssign()}
                      disabled={assigning || selectedAssignableCount === 0 || !selectedShiftId}
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-primary/90 hover:shadow-md disabled:pointer-events-none disabled:opacity-60"
                    >
                      {assigning ? (
                        <>
                          <i className="ri-loader-4-line animate-spin text-lg" /> Assigning…
                        </>
                      ) : (
                        <>
                          <i className="ri-user-add-line text-lg" /> Assign Shift
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-defaulttextcolor/60">
                    You can view who is assigned. You don&apos;t have permission to assign shifts.
                  </p>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
