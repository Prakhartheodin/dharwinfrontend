"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { listCandidates } from "@/shared/lib/api/candidates";
import { listStudents } from "@/shared/lib/api/students";
import {
  buildMergedAssignPeopleOptions,
  filterAssignPersonSelectOption,
  resolveStudentIdsForHolidayAssign,
  type AssignPersonRow,
} from "@/shared/lib/attendance-assign-people-options";
import { assignLeavesToStudents } from "@/shared/lib/api/attendance";
import { YmdFilterDateInput } from "@/shared/components/filters/YmdFilterDateInput";
import { getReferralLeadsDateRangeError } from "@/shared/lib/ymd-filter-date-input.util";
import Seo from "@/shared/layout-components/seo/seo";
import Swal from "sweetalert2";
import dynamic from "next/dynamic";
import { useAttendanceAdminAccess } from "@/shared/hooks/use-attendance-admin-access";
import { SopAssignChecklistNotice, useSopPreselectStudents } from "@/shared/hooks/use-sop-assign-deeplink";
import { dispatchSopStripRefresh } from "@/shared/lib/sop-strip-preferences";
import { usePmReactSelectStyles } from "@/shared/hooks/usePmReactSelectStyles";
import { formatUtcCalendarDate, getUtcCalendarDateKey } from "@/shared/lib/attendance-display";
import { getAllHolidays, type Holiday } from "@/shared/lib/api/holidays";
import {
  addCalendarDaysYmd,
  buildHolidayDateKeySet,
  expandLeaveDatesInRange,
  inclusiveCalendarSpanDays,
  parseYmdLocal,
  unionWeekOffDayNames,
} from "@/shared/lib/leave-date-range";

const SELECT_ALL = "__all_students__";
// ponytail: 90 calendar-day ceiling; server {from,to} + insertMany if year-long bulk is needed
const MAX_ASSIGN_LEAVE_SPAN_DAYS = 90;
const VIEW_DATES_PREVIEW = 50;

const LEAVE_TYPE_OPTIONS = [
  { value: "casual" as const, label: "Casual" },
  { value: "sick" as const, label: "Sick" },
  { value: "unpaid" as const, label: "Unpaid" },
];

const DATE_INPUT_CLASS =
  "w-full rounded-lg border border-defaultborder/80 bg-white px-4 py-2.5 text-sm text-defaulttextcolor dark:text-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all dark:bg-white/5";
const DATE_LABEL_CLASS =
  "mb-1.5 block text-sm font-medium text-defaulttextcolor/80 dark:text-white/70";

const Select = dynamic(() => import("react-select"), { ssr: false });

function warn(title: string, text?: string) {
  return Swal.fire({
    icon: "warning",
    title,
    ...(text != null ? { text } : {}),
    confirmButtonText: "OK",
  });
}

function errorMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e.response?.data?.message ?? e.message ?? fallback;
}

type JoinDateViolation = { name: string; joinYmd: string };
type ResignDateViolation = { name: string; resignYmd: string };

function joiningDateYmd(person: AssignPersonRow): string | null {
  const raw =
    person.kind === "student" ? person.student.joiningDate : person.joiningDate ?? null;
  if (raw == null || String(raw).trim() === "") return null;
  const key = getUtcCalendarDateKey(String(raw));
  return key || null;
}

function resignDateYmd(person: AssignPersonRow): string | null {
  const raw = person.resignDate ?? null;
  if (raw == null || String(raw).trim() === "") return null;
  const key = getUtcCalendarDateKey(String(raw));
  return key || null;
}

function laterYmd(a: string | undefined, b: string | undefined): string | undefined {
  if (!a) return b;
  if (!b) return a;
  return a >= b ? a : b;
}

function earlierYmd(a: string | undefined, b: string | undefined): string | undefined {
  if (!a) return b;
  if (!b) return a;
  return a <= b ? a : b;
}

function joinMinDateFromPeople(people: AssignPersonRow[]): string | undefined {
  let max: string | null = null;
  for (const person of people) {
    const joinYmd = joiningDateYmd(person);
    if (!joinYmd) continue;
    if (!max || joinYmd > max) max = joinYmd;
  }
  return max ?? undefined;
}

function resignMaxDateFromPeople(people: AssignPersonRow[]): string | undefined {
  let min: string | null = null;
  for (const person of people) {
    const resignYmd = resignDateYmd(person);
    if (!resignYmd) continue;
    if (!min || resignYmd < min) min = resignYmd;
  }
  return min ?? undefined;
}

function personDisplayName(person: AssignPersonRow): string {
  return person.kind === "student"
    ? person.student.user?.name ?? "Unknown"
    : person.fullName || "Unknown";
}

function findJoinDateViolations(fromYmd: string, people: AssignPersonRow[]): JoinDateViolation[] {
  if (!fromYmd) return [];
  const violations: JoinDateViolation[] = [];
  for (const person of people) {
    const joinYmd = joiningDateYmd(person);
    if (!joinYmd || fromYmd >= joinYmd) continue;
    violations.push({ name: personDisplayName(person), joinYmd });
  }
  return violations;
}

function joinDateViolationMessage(violations: JoinDateViolation[]): { title: string; text: string } {
  if (violations.length === 1) {
    const v = violations[0];
    const formatted = formatUtcCalendarDate(v.joinYmd);
    return {
      title: "Before joining date",
      text: `${v.name} joined on ${formatted}. Choose a From date on or after their joining date.`,
    };
  }
  const lines = violations.map((v) => `${v.name} joined on ${formatUtcCalendarDate(v.joinYmd)}`);
  return {
    title: "Before joining date",
    text: `${lines.join(". ")}. Choose a From date on or after each person's joining date.`,
  };
}

function findResignDateViolations(toYmd: string, people: AssignPersonRow[]): ResignDateViolation[] {
  if (!toYmd) return [];
  const violations: ResignDateViolation[] = [];
  for (const person of people) {
    const resignYmd = resignDateYmd(person);
    if (!resignYmd || toYmd <= resignYmd) continue;
    violations.push({ name: personDisplayName(person), resignYmd });
  }
  return violations;
}

function resignDateViolationMessage(violations: ResignDateViolation[]): { title: string; text: string } {
  if (violations.length === 1) {
    const v = violations[0];
    const formatted = formatUtcCalendarDate(v.resignYmd);
    return {
      title: "After resign date",
      text: `${v.name} resigned on ${formatted}. Choose a To date on or before their resign date.`,
    };
  }
  const lines = violations.map((v) => `${v.name} resigned on ${formatUtcCalendarDate(v.resignYmd)}`);
  return {
    title: "After resign date",
    text: `${lines.join(". ")}. Choose a To date on or before each person's resign date.`,
  };
}

function excludedCountPhrase(weekOff: number, holiday: number): string | null {
  if (weekOff <= 0 && holiday <= 0) return null;
  const parts: string[] = [];
  if (weekOff > 0) parts.push(`${weekOff} week-off${weekOff === 1 ? "" : "s"}`);
  if (holiday > 0) parts.push(`${holiday} holiday${holiday === 1 ? "" : "s"}`);
  return `(${parts.join(", ")} excluded)`;
}

type AssignLeaveDateRangeFieldsetProps = {
  fromDate: string;
  toDate: string;
  onFromDateChange: (next: string) => void;
  onToDateChange: (next: string) => void;
  spanExceeded: boolean;
  joinDateError: string | null;
  resignDateError: string | null;
  joinMinDate?: string;
  resignMaxDate?: string;
  selectedDates: string[];
  excludedWeekOff: number;
  excludedHoliday: number;
  removedDates: Set<string>;
  onRestoreDate: (date: string) => void;
  onRemoveDate: (date: string) => void;
  viewDatesOpen: boolean;
  onToggleViewDates: () => void;
  onAssign: () => void;
  assigning: boolean;
  hasPeople: boolean;
};

function AssignLeaveDateRangeFieldset({
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  spanExceeded,
  joinDateError,
  resignDateError,
  joinMinDate,
  resignMaxDate,
  selectedDates,
  excludedWeekOff,
  excludedHoliday,
  removedDates,
  onRestoreDate,
  onRemoveDate,
  viewDatesOpen,
  onToggleViewDates,
  onAssign,
  assigning,
  hasPeople,
}: AssignLeaveDateRangeFieldsetProps) {
  const maxStartDate = toDate
    ? addCalendarDaysYmd(toDate, 1 - MAX_ASSIGN_LEAVE_SPAN_DAYS) ?? undefined
    : undefined;
  const maxEndDate = fromDate
    ? addCalendarDaysYmd(fromDate, MAX_ASSIGN_LEAVE_SPAN_DAYS - 1) ?? undefined
    : undefined;
  const fromMinDate = laterYmd(maxStartDate, joinMinDate);
  const toMaxDate = earlierYmd(maxEndDate, resignMaxDate);
  const excludedPhrase = excludedCountPhrase(excludedWeekOff, excludedHoliday);
  const previewDates = selectedDates.slice(0, VIEW_DATES_PREVIEW);
  const hiddenCount = selectedDates.length - previewDates.length;
  const dateRangeError = getReferralLeadsDateRangeError(fromDate, toDate);
  const fromDateError = joinDateError ?? dateRangeError;
  const toDateError = resignDateError ?? dateRangeError;

  return (
    <fieldset className="p-5 border border-defaultborder/70 rounded-xl bg-slate-50/60 dark:bg-white/[0.04] dark:border-defaultborder/50">
      <legend className="text-sm font-semibold text-defaulttextcolor dark:text-white px-1">
        Date range <span className="text-danger">*</span>
      </legend>
      <p className="text-sm text-defaulttextcolor/60 dark:text-white/50 mb-3 leading-relaxed">
        Select a start and end date. Only <strong>working days</strong> in the range are included; week-offs and holidays are skipped automatically.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <YmdFilterDateInput
          label="From"
          inputId="assign-leave-from-date"
          portalId="assign-leave-datepicker-portal-from"
          value={fromDate}
          minDate={fromMinDate}
          maxDate={toDate || undefined}
          rangeError={fromDateError}
          onCommit={onFromDateChange}
          wrapperClassName="w-full"
          inputClassName={DATE_INPUT_CLASS}
          labelClassName={DATE_LABEL_CLASS}
        />
        <YmdFilterDateInput
          label="To"
          inputId="assign-leave-to-date"
          portalId="assign-leave-datepicker-portal-to"
          value={toDate}
          minDate={fromDate || undefined}
          maxDate={toMaxDate}
          rangeError={toDateError}
          onCommit={onToDateChange}
          wrapperClassName="w-full"
          inputClassName={DATE_INPUT_CLASS}
          labelClassName={DATE_LABEL_CLASS}
        />
      </div>
      {spanExceeded && (
        <p className="mt-3 text-sm text-danger" role="alert">
          Choose a range of at most {MAX_ASSIGN_LEAVE_SPAN_DAYS} calendar days.
        </p>
      )}
      {fromDate && toDate && (
        <p className="mt-3 text-sm font-semibold text-defaulttextcolor dark:text-white">
          {formatUtcCalendarDate(fromDate)} – {formatUtcCalendarDate(toDate)}
        </p>
      )}
      {fromDate && toDate && !spanExceeded && (
        <>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-defaulttextcolor/65 dark:text-white/60" aria-live="polite">
              {selectedDates.length > 0 ? (
                <>
                  <span className="font-semibold text-defaulttextcolor dark:text-white">{selectedDates.length}</span> working day
                  {selectedDates.length === 1 ? "" : "s"} selected
                  {excludedPhrase && <> {excludedPhrase}</>}
                  {removedDates.size > 0 && (
                    <>
                      {" "}
                      · {removedDates.size} day{removedDates.size === 1 ? "" : "s"} removed
                    </>
                  )}
                </>
              ) : (
                "No working days in this range after excluding week-offs and holidays."
              )}
            </p>
            <button
              type="button"
              onClick={onAssign}
              disabled={assigning || !hasPeople || selectedDates.length === 0 || joinDateError != null || resignDateError != null}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary/90 hover:shadow-md transition-all disabled:opacity-60 disabled:pointer-events-none shrink-0"
            >
              {assigning ? (
                <><i className="ri-loader-4-line animate-spin text-lg" /> Assigning…</>
              ) : (
                <><i className="ri-calendar-check-line text-lg" /> Assign Leave</>
              )}
            </button>
          </div>
          {removedDates.size > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {[...removedDates].sort().map((d) => (
                <li key={d}>
                  <button
                    type="button"
                    onClick={() => onRestoreDate(d)}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-defaultborder/80 bg-white px-3 text-sm text-defaulttextcolor dark:bg-white/5 dark:text-white"
                  >
                    Restore {formatUtcCalendarDate(d)}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {selectedDates.length > 0 && (
            <div className="mt-3">
              <button
                type="button"
                aria-expanded={viewDatesOpen}
                onClick={onToggleViewDates}
                className="inline-flex min-h-11 items-center text-sm font-medium text-primary"
              >
                {viewDatesOpen ? "Hide Dates" : "View Dates"}
              </button>
              {viewDatesOpen && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {previewDates.map((d) => (
                    <span
                      key={d}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 pl-3 text-sm font-medium dark:bg-primary/20 dark:border-primary/30"
                    >
                      {formatUtcCalendarDate(d)}
                      <button
                        type="button"
                        onClick={() => onRemoveDate(d)}
                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors"
                        aria-label={`Remove ${formatUtcCalendarDate(d)}`}
                      >
                        <i className="ri-close-line text-sm" />
                      </button>
                    </span>
                  ))}
                  {hiddenCount > 0 && (
                    <span className="inline-flex min-h-11 items-center text-sm text-defaulttextcolor/70 dark:text-white/60">
                      and {hiddenCount} more
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </fieldset>
  );
}

export default function SettingsAttendanceAssignLeavePage() {
  const searchParams = useSearchParams();
  const sopQueryString = searchParams.toString();
  const isAdmin = useAttendanceAdminAccess();
  const { menuPortalTarget: selectMenuPortalTarget, styles: selectMenuLayerStyles } = usePmReactSelectStyles(10060);
  const [people, setPeople] = useState<AssignPersonRow[]>([]);
  const [selectedPeople, setSelectedPeople] = useState<AssignPersonRow[]>([]);
  const [leaveType, setLeaveType] = useState<"casual" | "sick" | "unpaid">("casual");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [removedDates, setRemovedDates] = useState<Set<string>>(() => new Set());
  const [viewDatesOpen, setViewDatesOpen] = useState(false);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPeople = useCallback(async () => {
    try {
      // stopgap: "select all" below depends on the full list being loaded client-side;
      // a real fix needs a matching-filter-IDs endpoint so select-all doesn't require
      // fetching every record. 1500 covers current headcount with headroom.
      const [stuRes, candRes] = await Promise.all([
        listStudents({ limit: 1500, sortBy: "user.name:asc" }),
        listCandidates({ limit: 1500, employmentStatus: "all", sortBy: "fullName:asc" }),
      ]);
      setPeople(
        buildMergedAssignPeopleOptions(stuRes.results ?? [], candRes.results ?? [])
      );
    } catch {
      setPeople([]);
    }
  }, []);

  const fetchHolidays = useCallback(async () => {
    try {
      const response = await getAllHolidays({ isActive: true, sortBy: "date:asc", limit: 1000 });
      const data = (response as { data?: { results?: Holiday[] } | Holiday[] }).data;
      const list = Array.isArray(data) ? data : data?.results ?? [];
      setHolidays(list);
    } catch {
      setHolidays([]);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      setLoading(true);
      Promise.all([fetchPeople(), fetchHolidays()]).finally(() => setLoading(false));
    }
  }, [isAdmin, fetchPeople, fetchHolidays]);

  const mergeSopPerson = useCallback((row: AssignPersonRow) => {
    setPeople((prev) => (prev.some((s) => s.value === row.value) ? prev : [row, ...prev]));
  }, []);

  useSopPreselectStudents(people, setSelectedPeople, sopQueryString, mergeSopPerson);

  const chosenPeople = useMemo(
    () =>
      selectedPeople.some((s) => s.value === SELECT_ALL)
        ? people
        : selectedPeople.filter((s) => s.value !== SELECT_ALL),
    [selectedPeople, people]
  );

  const holidayDateKeys = useMemo(() => buildHolidayDateKeySet(holidays), [holidays]);

  const weekOffDayNames = useMemo(
    () =>
      unionWeekOffDayNames(
        chosenPeople.map((person) => (person.kind === "student" ? person.student.weekOff : undefined))
      ),
    [chosenPeople]
  );

  const spanDays = fromDate && toDate ? inclusiveCalendarSpanDays(fromDate, toDate) : null;
  const spanExceeded = spanDays != null && spanDays > MAX_ASSIGN_LEAVE_SPAN_DAYS;

  const rangeExpansion = useMemo(() => {
    if (!fromDate || !toDate || spanExceeded) {
      return { dates: [] as string[], excludedWeekOff: 0, excludedHoliday: 0 };
    }
    return expandLeaveDatesInRange(fromDate, toDate, {
      holidayDateKeys,
      weekOffDayNames,
    });
  }, [fromDate, toDate, spanExceeded, holidayDateKeys, weekOffDayNames]);

  useEffect(() => {
    setRemovedDates((prev) => (prev.size === 0 ? prev : new Set()));
  }, [fromDate, toDate]);

  const selectedDates = useMemo(
    () => rangeExpansion.dates.filter((d) => !removedDates.has(d)),
    [rangeExpansion.dates, removedDates]
  );

  const joinDateViolations = useMemo(
    () => findJoinDateViolations(fromDate, chosenPeople),
    [fromDate, chosenPeople]
  );

  const joinDateError = useMemo(
    () => (joinDateViolations.length > 0 ? joinDateViolationMessage(joinDateViolations).text : null),
    [joinDateViolations]
  );

  const joinMinDate = useMemo(() => joinMinDateFromPeople(chosenPeople), [chosenPeople]);
  const resignMaxDate = useMemo(() => resignMaxDateFromPeople(chosenPeople), [chosenPeople]);

  const resignDateViolations = useMemo(
    () => findResignDateViolations(toDate, chosenPeople),
    [toDate, chosenPeople]
  );

  const resignDateError = useMemo(
    () => (resignDateViolations.length > 0 ? resignDateViolationMessage(resignDateViolations).text : null),
    [resignDateViolations]
  );

  const personOptions = people.length
    ? [{ value: SELECT_ALL, label: "Select all (training + employees)" } as AssignPersonRow, ...people]
    : people;

  const removeDate = (d: string) => {
    setRemovedDates((prev) => new Set(prev).add(d));
  };

  const restoreDate = (d: string) => {
    setRemovedDates((prev) => {
      if (!prev.has(d)) return prev;
      const next = new Set(prev);
      next.delete(d);
      return next;
    });
  };

  const onToDateChange = (next: string) => {
    setToDate(next);
    if (next) {
      const violations = findResignDateViolations(next, chosenPeople);
      if (violations.length > 0) {
        const { title, text } = resignDateViolationMessage(violations);
        void warn(title, text);
      }
    }
    if (!next || !fromDate) return;
    if (next < fromDate) {
      setFromDate(next);
      return;
    }
    const maxEnd = addCalendarDaysYmd(fromDate, MAX_ASSIGN_LEAVE_SPAN_DAYS - 1) ?? undefined;
    const cappedTo = earlierYmd(maxEnd, resignMaxDate);
    if (cappedTo && next > cappedTo) setToDate(cappedTo);
  };

  const onFromDateChange = (next: string) => {
    setFromDate(next);
    if (next) {
      const violations = findJoinDateViolations(next, chosenPeople);
      if (violations.length > 0) {
        const { title, text } = joinDateViolationMessage(violations);
        void warn(title, text);
      }
    }
    if (!next || !toDate) return;
    if (toDate < next) {
      setToDate(next);
      return;
    }
    const maxEnd = addCalendarDaysYmd(next, MAX_ASSIGN_LEAVE_SPAN_DAYS - 1) ?? undefined;
    const cappedTo = earlierYmd(maxEnd, resignMaxDate);
    if (cappedTo && toDate > cappedTo) setToDate(cappedTo);
  };

  const handleAssign = async () => {
    if (selectedPeople.length === 0) {
      await warn("No one selected", "Select at least one training profile or employee");
      return;
    }
    if (!fromDate || !toDate) {
      await warn("Date range required", "Select a start date and end date.");
      return;
    }
    const joinViolations = findJoinDateViolations(fromDate, chosenPeople);
    if (joinViolations.length > 0) {
      const { title, text } = joinDateViolationMessage(joinViolations);
      await warn(title, text);
      return;
    }
    const resignViolations = findResignDateViolations(toDate, chosenPeople);
    if (resignViolations.length > 0) {
      const { title, text } = resignDateViolationMessage(resignViolations);
      await warn(title, text);
      return;
    }
    const from = parseYmdLocal(fromDate);
    const to = parseYmdLocal(toDate);
    if (!from || !to) {
      await warn("Invalid dates");
      return;
    }
    if (to < from) {
      await warn("Invalid range", "End date must be on or after start date.");
      return;
    }
    const span = inclusiveCalendarSpanDays(fromDate, toDate);
    if (span != null && span > MAX_ASSIGN_LEAVE_SPAN_DAYS) {
      await warn("Range too long", `Choose a range of at most ${MAX_ASSIGN_LEAVE_SPAN_DAYS} calendar days.`);
      return;
    }
    if (selectedDates.length === 0) {
      await warn(
        "No working days",
        "The selected range has no working days after excluding week-offs and holidays."
      );
      return;
    }
    setAssigning(true);
    setError(null);
    try {
      if (chosenPeople.length === 0) {
        await warn("No one selected", "Select at least one training profile or employee");
        return;
      }
      let ids: string[];
      try {
        ids = await resolveStudentIdsForHolidayAssign(chosenPeople);
      } catch (resolveErr: unknown) {
        const msg = errorMessage(
          resolveErr,
          "Could not resolve training profiles. Candidates need the Student role and permission to create a training profile."
        );
        setError(msg);
        await Swal.fire({ icon: "error", title: "Cannot assign leave", text: msg, confirmButtonText: "OK" });
        return;
      }
      if (ids.length === 0) {
        await warn("Nothing to assign", "Select at least one training profile or employee");
        return;
      }
      const result = await assignLeavesToStudents(ids, [], leaveType, notes || undefined, {
        from: fromDate,
        to: toDate,
        excludedDates: removedDates.size > 0 ? [...removedDates] : undefined,
      });
      const created = result?.data?.attendanceRecordsCreated;
      if (created === 0) {
        await warn("No records created", result?.message ?? "No leave records were created.");
        return;
      }
      await Swal.fire({
        icon: "success",
        title: "Success",
        text: created != null ? `Created ${created} leave record(s).` : "Leave assigned.",
        confirmButtonText: "OK",
      });
      dispatchSopStripRefresh();
      setFromDate("");
      setToDate("");
      setRemovedDates(new Set());
      setViewDatesOpen(false);
    } catch (err: unknown) {
      const msg = errorMessage(err, "Failed to assign leave");
      setError(msg);
      await Swal.fire({ icon: "error", title: "Error", text: msg, confirmButtonText: "OK" });
    } finally {
      setAssigning(false);
    }
  };

  if (isAdmin === null) {
    return (
      <>
        <Seo title="Assign Leave" />
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
        <Seo title="Assign Leave" />
        <div className="relative mt-4 w-full">
          <div className="rounded-2xl border border-defaultborder/70 bg-white dark:bg-bodybg shadow-sm overflow-hidden">
            <div className="py-20 px-6 text-center">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-danger/10 text-danger mb-5 ring-1 ring-danger/20">
                <i className="ri-error-warning-line text-5xl" />
              </div>
              <h3 className="text-xl font-semibold text-defaulttextcolor dark:text-white mb-2">Access Denied</h3>
              <p className="text-sm text-defaulttextcolor/80 max-w-md mx-auto">Only administrators can assign leave to training profiles and employees.</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Seo title="Assign Leave" />
      <div className="relative mt-4 space-y-6 min-h-[40vh] w-full">
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_100%_60%_at_50%_-15%,rgba(99,102,241,0.07),transparent_50%)] dark:bg-[radial-gradient(ellipse_100%_60%_at_50%_-15%,rgba(99,102,241,0.12),transparent_50%)]" aria-hidden />
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(to_bottom,rgba(248,250,252,0.6),transparent_30%)] dark:bg-[linear-gradient(to_bottom,rgba(15,23,42,0.4),transparent_30%)]" aria-hidden />

        <section className="rounded-2xl border border-defaultborder/70 bg-white dark:bg-bodybg shadow-sm shadow-black/[0.03] dark:shadow-none overflow-hidden transition-shadow duration-300 hover:shadow-md hover:shadow-black/[0.04] dark:hover:shadow-none">
          <div className="flex items-center gap-4 px-6 py-5 border-b border-defaultborder/50 bg-gradient-to-r from-slate-50/90 to-white dark:from-white/[0.03] dark:to-transparent">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/10 dark:ring-primary/20" aria-hidden>
              <i className="ri-calendar-todo-line text-2xl" />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-defaulttextcolor dark:text-white tracking-tight">Assign Leave</h2>
              <p className="text-xs text-defaulttextcolor/60 dark:text-white/50 mt-0.5">
                Training profiles use the training roster; employees without a profile are listed from the employee record. Search by name, email, or employee ID.
              </p>
            </div>
          </div>
          <div className="px-6 py-6 border-t border-defaultborder/50 space-y-5 bg-gradient-to-b from-slate-50/50 to-transparent dark:from-white/[0.02] dark:to-transparent">
            {error && (
              <div className="rounded-xl border border-danger/30 bg-danger/10 dark:bg-danger/15 px-4 py-3 text-sm text-danger">
                {error}
              </div>
            )}

            <SopAssignChecklistNotice />

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4 ring-1 ring-primary/10">
                  <i className="ri-loader-4-line animate-spin text-3xl" />
                </div>
                <p className="text-sm font-medium text-defaulttextcolor/80">Loading people…</p>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-semibold text-defaulttextcolor mb-2">Select people <span className="text-danger">*</span></label>
                  <div className="rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all duration-150">
                    <Select
                      isMulti
                      options={personOptions}
                      value={selectedPeople}
                      getOptionValue={(o) => (o as AssignPersonRow).value}
                      getOptionLabel={(o) => (o as AssignPersonRow).label}
                      onChange={(sel: unknown) => {
                        const value = (sel as AssignPersonRow[] | null) ?? [];
                        let nextSelected: AssignPersonRow[];
                        if (!value.length) {
                          setSelectedPeople([]);
                          return;
                        }
                        const hasAll = value.some((o) => o.value === SELECT_ALL);
                        if (hasAll) {
                          nextSelected =
                            selectedPeople.length === people.length ? [] : [...people];
                        } else {
                          nextSelected = value;
                        }
                        setSelectedPeople(nextSelected);
                        const nextChosen = nextSelected.some((s) => s.value === SELECT_ALL)
                          ? people
                          : nextSelected.filter((s) => s.value !== SELECT_ALL);
                        if (fromDate && nextChosen.length > 0) {
                          const violations = findJoinDateViolations(fromDate, nextChosen);
                          if (violations.length > 0) {
                            const { title, text } = joinDateViolationMessage(violations);
                            void warn(title, text);
                          }
                        }
                        if (toDate && nextChosen.length > 0) {
                          const resignViolations = findResignDateViolations(toDate, nextChosen);
                          if (resignViolations.length > 0) {
                            const { title, text } = resignDateViolationMessage(resignViolations);
                            void warn(title, text);
                          }
                        }
                      }}
                      placeholder="Training profiles and employees…"
                      closeMenuOnSelect={false}
                      className="react-select-container assign-leave-select"
                      classNamePrefix="react-select"
                      isClearable
                      isSearchable
                      filterOption={filterAssignPersonSelectOption}
                      menuPortalTarget={selectMenuPortalTarget}
                      menuPosition="fixed"
                      styles={selectMenuLayerStyles}
                    />
                  </div>
                  {selectedPeople.length > 0 && (
                    <p className="mt-1.5 text-xs text-defaulttextcolor/60">{selectedPeople.length} selected</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-defaulttextcolor mb-2">Leave Type <span className="text-danger">*</span></label>
                  <div className="inline-flex rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 p-1">
                    {LEAVE_TYPE_OPTIONS.map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setLeaveType(value)}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shrink-0 ${
                          leaveType === value ? "bg-primary text-white shadow-sm" : "text-defaulttextcolor hover:text-primary"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <AssignLeaveDateRangeFieldset
                  fromDate={fromDate}
                  toDate={toDate}
                  onFromDateChange={onFromDateChange}
                  onToDateChange={onToDateChange}
                  spanExceeded={spanExceeded}
                  joinDateError={joinDateError}
                  resignDateError={resignDateError}
                  joinMinDate={joinMinDate}
                  resignMaxDate={resignMaxDate}
                  selectedDates={selectedDates}
                  excludedWeekOff={rangeExpansion.excludedWeekOff}
                  excludedHoliday={rangeExpansion.excludedHoliday}
                  removedDates={removedDates}
                  onRestoreDate={restoreDate}
                  onRemoveDate={removeDate}
                  viewDatesOpen={viewDatesOpen}
                  onToggleViewDates={() => setViewDatesOpen((open) => !open)}
                  onAssign={handleAssign}
                  assigning={assigning}
                  hasPeople={selectedPeople.length > 0}
                />

                <div>
                  <label className="block text-sm font-semibold text-defaulttextcolor mb-2">Notes (optional)</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional notes…"
                    className="w-full rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-defaulttextcolor placeholder:text-defaulttextcolor/45 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </>
            )}
          </div>
        </section>
      </div>
      <style jsx>{`
        .assign-leave-select :global(.react-select__control) {
          border: none;
          min-height: 2.75rem;
          background: transparent;
          box-shadow: none;
        }
        .assign-leave-select :global(.react-select__control--is-focused) {
          box-shadow: none;
        }
        .assign-leave-select :global(.react-select__placeholder),
        .assign-leave-select :global(.react-select__input-container) {
          color: inherit;
        }
      `}</style>
    </>
  );
}
