"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  getAllBackdatedAttendanceRequests,
  approveBackdatedAttendanceRequest,
  rejectBackdatedAttendanceRequest,
  updateBackdatedAttendanceRequest,
  cancelBackdatedAttendanceRequest,
  type BackdatedAttendanceRequest,
  type AttendanceEntry,
} from "@/shared/lib/api/backdated-attendance-requests";
import { listStudents, getStudent, type Student } from "@/shared/lib/api/students";
import { listCandidates } from "@/shared/lib/api/candidates";
import {
  buildMergedAssignPeopleOptions,
  filterAssignPersonSelectOption,
  resolveStudentIdsForHolidayAssign,
  type AssignPersonRow,
} from "@/shared/lib/attendance-assign-people-options";
import * as attendanceApi from "@/shared/lib/api/attendance";
import Seo from "@/shared/layout-components/seo/seo";
import Swal from "sweetalert2";
import dynamic from "next/dynamic";
import { useAttendanceAdminAccess } from "@/shared/hooks/use-attendance-admin-access";
import type { FilterOptionOption } from "react-select";
import StudentAttendanceOverlay from "./StudentAttendanceOverlay";

const Select = dynamic(() => import("react-select"), { ssr: false });

const FILTER_LIST_ALL = "__all__";

/** List filter: "All" row + same search as other attendance (name, email, employee ID). */
function filterBackdatedListPersonOption(
  option: FilterOptionOption<unknown>,
  inputValue: string
): boolean {
  const v = (option as { value?: string }).value;
  if (v === FILTER_LIST_ALL) {
    const input = (inputValue ?? "").trim();
    if (!input) return true;
    return String(option.label ?? "")
      .toLowerCase()
      .includes(input.toLowerCase());
  }
  return filterAssignPersonSelectOption(option, inputValue);
}

function getStudentName(request: BackdatedAttendanceRequest): string {
  const s = request.student;
  if (typeof s === "object" && s?.user?.name) return s.user.name;
  if (typeof s === "object" && (s as { fullName?: string }).fullName) return (s as { fullName: string }).fullName;
  // When student.user is not populated (e.g. missing ref), use requestedBy — student applies for self
  if (request.requestedBy?.name) return request.requestedBy.name;
  if (request.studentEmail) return request.studentEmail;
  return "Unknown";
}

/** Resolve student's assigned shift and timezone from the loaded students list (so we show the shift's timezone, not stored UTC). */
function getStudentShiftForRequest(
  request: BackdatedAttendanceRequest,
  students: Student[]
): { shiftName: string; timezone: string } {
  const raw = request.student as { _id?: string; id?: string } | undefined;
  const sid = raw ? String(raw._id ?? raw.id ?? "").trim() : "";
  if (!sid) return { shiftName: "", timezone: "" };
  const student = students.find(
    (s) => String((s as { id?: string }).id ?? "") === sid || String((s as { _id?: string })._id ?? "") === sid
  );
  const shift = student?.shift;
  const shiftName = (shift as { name?: string })?.name ?? "";
  const timezone = (shift as { timezone?: string })?.timezone ?? "";
  return { shiftName, timezone };
}

export default function SettingsAttendanceBackdatedPage() {
  const isAdmin = useAttendanceAdminAccess();
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected" | "cancelled">("pending");
  const [filterStudent, setFilterStudent] = useState<string>("all");
  const [students, setStudents] = useState<Student[]>([]);
  const [people, setPeople] = useState<AssignPersonRow[]>([]);

  const [requests, setRequests] = useState<BackdatedAttendanceRequest[]>([]);
  const [attendanceViewStudent, setAttendanceViewStudent] = useState<{
    studentId?: string;
    userId?: string;
    /** Same ATS candidate as the calendar — enables /candidates/:id/attendance when student route is forbidden. */
    candidateId?: string;
    name: string;
    initialDate?: string;
  } | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1,
    totalResults: 0,
  });

  const [showAddSection, setShowAddSection] = useState(false);
  const [addPersonValue, setAddPersonValue] = useState<string>("");
  const [addStudentId, setAddStudentId] = useState<string>("");
  const [addResolvingProfile, setAddResolvingProfile] = useState(false);
  const [addMode, setAddMode] = useState<"range" | "entries">("range");
  const [addRangeForm, setAddRangeForm] = useState({ fromDate: "", toDate: "", punchInTime: "", punchOutTime: "", notes: "", timezone: "" });
  const [addEntries, setAddEntries] = useState<Array<{ date: string; punchInTime: string; punchOutTime: string; notes: string; timezone: string }>>([]);
  const [addStudentWeekOff, setAddStudentWeekOff] = useState<string[]>([]);
  const [addingBackDate, setAddingBackDate] = useState(false);

  const addPersonRow = useMemo(
    () => (addPersonValue ? people.find((p) => p.value === addPersonValue) ?? null : null),
    [people, addPersonValue]
  );

  const listFilterOptions = useMemo((): (AssignPersonRow | { value: string; label: string })[] => {
    return [
      { value: FILTER_LIST_ALL, label: "All employees" },
      ...people.filter((p): p is Extract<AssignPersonRow, { kind: "student" }> => p.kind === "student"),
    ];
  }, [people]);

  const listFilterValue = useMemo(() => {
    if (filterStudent === "all") {
      return { value: FILTER_LIST_ALL, label: "All employees" } as { value: string; label: string };
    }
    const row = people.find((p) => p.kind === "student" && p.value === filterStudent);
    return row ?? { value: FILTER_LIST_ALL, label: "All employees" };
  }, [filterStudent, people]);

  const fetchStudents = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const [stuRes, candRes] = await Promise.all([
        listStudents({ limit: 1000, sortBy: "user.name:asc" }),
        listCandidates({ limit: 1000, employmentStatus: "current", sortBy: "fullName:asc" }),
      ]);
      const list = stuRes.results ?? [];
      setStudents(list);
      setPeople(buildMergedAssignPeopleOptions(list, candRes.results ?? []));
    } catch {
      setStudents([]);
      setPeople([]);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) fetchStudents();
  }, [isAdmin, fetchStudents]);

  const fetchRequests = useCallback(async () => {
    if (isAdmin !== true) return;
    setLoadingRequests(true);
    try {
      const params: Record<string, string | number> = {
        limit: pagination.limit,
        page: pagination.page,
        sortBy: "createdAt:desc",
      };
      if (filterStatus !== "all") params.status = filterStatus;
      if (filterStudent !== "all") params.student = filterStudent;

      const result = await getAllBackdatedAttendanceRequests(params);
      const results = result?.results ?? [];
      setRequests(results.map((r) => ({ ...r, _id: r._id ?? (r as { id?: string }).id ?? "" })).filter((r) => r._id));
      setPagination({
        page: result?.page ?? pagination.page,
        limit: result?.limit ?? pagination.limit,
        totalPages: result?.totalPages ?? 1,
        totalResults: result?.totalResults ?? 0,
      });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ?? (err as { message?: string })?.message ?? "Failed to load requests";
      await Swal.fire({ icon: "error", title: "Error", text: msg, confirmButtonText: "OK" });
    } finally {
      setLoadingRequests(false);
    }
  }, [isAdmin, filterStatus, filterStudent, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    if (!addPersonRow) {
      setAddStudentId("");
      return;
    }
    if (addPersonRow.kind === "student") {
      setAddStudentId(addPersonRow.value);
      setAddResolvingProfile(false);
      return;
    }
    let cancelled = false;
    setAddResolvingProfile(true);
    setAddStudentId("");
    (async () => {
      try {
        const ids = await resolveStudentIdsForHolidayAssign([addPersonRow]);
        if (!cancelled && ids[0]) setAddStudentId(ids[0]);
      } catch {
        if (!cancelled) setAddStudentId("");
      } finally {
        if (!cancelled) setAddResolvingProfile(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [addPersonRow]);

  useEffect(() => {
    if (!addStudentId) return;
    getStudent(addStudentId)
      .then((s) => {
        const tz = s?.shift?.timezone || "UTC";
        setAddEntries((prev) => prev.map((e) => ({ ...e, timezone: tz })));
        setAddRangeForm((prev) => ({ ...prev, timezone: tz }));
        const wo = (s as { weekOff?: string[] })?.weekOff;
        setAddStudentWeekOff(Array.isArray(wo) ? wo : []);
      })
      .catch(() => {});
  }, [addStudentId]);

  const openAddSection = () => {
    setAddPersonValue("");
    setAddStudentId("");
    setAddResolvingProfile(false);
    setAddMode("range");
    setAddRangeForm({ fromDate: "", toDate: "", punchInTime: "", punchOutTime: "", notes: "", timezone: "" });
    setAddEntries([{ date: "", punchInTime: "", punchOutTime: "", notes: "", timezone: "" }]);
    setAddStudentWeekOff([]);
    setShowAddSection(true);
  };

  const isWeekOffDay = (date: Date): boolean => {
    const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
    if (addStudentWeekOff.length === 0) return dayName === "Saturday" || dayName === "Sunday";
    return addStudentWeekOff.includes(dayName);
  };
  const addAddEntry = () => {
    setAddEntries((prev) => [...prev, { date: "", punchInTime: "", punchOutTime: "", notes: "", timezone: addRangeForm.timezone || "UTC" }]);
  };
  const removeAddEntry = (index: number) => {
    if (addEntries.length > 1) setAddEntries((prev) => prev.filter((_, i) => i !== index));
  };
  const updateAddEntry = (index: number, field: keyof typeof addEntries[0], value: string) => {
    setAddEntries((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };
  const handleSubmitAddBackdated = async () => {
    if (!addPersonRow) {
      await Swal.fire({
        icon: "warning",
        title: "Select person",
        text: "Select a training profile or employee for backdated attendance.",
        confirmButtonText: "OK",
      });
      return;
    }
    if (addResolvingProfile || !addStudentId) {
      await Swal.fire({
        icon: "warning",
        title: "Profile not ready",
        text: "Wait until the training profile is resolved, or select someone who already has a training profile linked.",
        confirmButtonText: "OK",
      });
      return;
    }

    let attendanceEntries: Array<{ date: string; punchIn: string; punchOut: string; timezone: string; notes?: string }>;

    if (addMode === "range") {
      const { fromDate, toDate, punchInTime, punchOutTime, notes, timezone } = addRangeForm;
      if (!fromDate || !toDate || !punchInTime || !punchOutTime) {
        await Swal.fire({ icon: "warning", title: "Validation", text: "Please fill in From date, To date, Punch In, and Punch Out.", confirmButtonText: "OK" });
        return;
      }
      const from = new Date(fromDate);
      const to = new Date(toDate);
      if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        await Swal.fire({ icon: "warning", title: "Validation", text: "Invalid date range.", confirmButtonText: "OK" });
        return;
      }
      if (to < from) {
        await Swal.fire({ icon: "warning", title: "Validation", text: "To date must be on or after From date.", confirmButtonText: "OK" });
        return;
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (from >= today) {
        await Swal.fire({ icon: "warning", title: "Validation", text: "From date must be in the past.", confirmButtonText: "OK" });
        return;
      }
      const tz = timezone || "UTC";
      const pIn = punchInTime.includes(":") ? punchInTime : `${punchInTime}:00`;
      const pOut = punchOutTime.includes(":") ? punchOutTime : `${punchOutTime}:00`;
      const pad = (n: number) => String(n).padStart(2, "0");
      attendanceEntries = [];
      const current = new Date(from);
      current.setHours(0, 0, 0, 0);
      const end = new Date(to);
      end.setHours(0, 0, 0, 0);
      while (current <= end) {
        if (!isWeekOffDay(current)) {
          const dateKey = `${current.getFullYear()}-${pad(current.getMonth() + 1)}-${pad(current.getDate())}`;
          const punchInDt = new Date(dateKey + "T" + pIn);
          let punchOutDt = new Date(dateKey + "T" + pOut);
          if (punchOutDt <= punchInDt) punchOutDt = new Date(punchOutDt.getTime() + 86400000);
          attendanceEntries.push({
            date: dateKey,
            punchIn: punchInDt.toISOString(),
            punchOut: punchOutDt.toISOString(),
            timezone: tz,
            notes: notes?.trim() || undefined,
          });
        }
        current.setDate(current.getDate() + 1);
      }
      if (attendanceEntries.length === 0) {
        await Swal.fire({ icon: "warning", title: "No working days", text: "The selected date range has no working days (weekends excluded).", confirmButtonText: "OK" });
        return;
      }
    } else {
      const valid = addEntries.filter((e) => e.date && e.punchInTime && e.punchOutTime);
      if (valid.length === 0) {
        await Swal.fire({ icon: "warning", title: "Validation", text: "Add at least one entry with date, punch-in and punch-out time.", confirmButtonText: "OK" });
        return;
      }
      const invalid = addEntries.filter((e) => e.date && (!e.punchInTime || !e.punchOutTime));
      if (invalid.length > 0) {
        await Swal.fire({ icon: "warning", title: "Validation", text: "Entries with a date must have both punch-in and punch-out times.", confirmButtonText: "OK" });
        return;
      }
      attendanceEntries = valid.map((entry) => {
        const punchInStr = entry.punchInTime.includes(":") ? entry.punchInTime : `${entry.punchInTime}:00`;
        const punchOutStr = entry.punchOutTime.includes(":") ? entry.punchOutTime : `${entry.punchOutTime}:00`;
        const punchInDateTime = new Date(`${entry.date}T${punchInStr}`);
        let punchOutDateTime = new Date(`${entry.date}T${punchOutStr}`);
        if (punchOutDateTime <= punchInDateTime) punchOutDateTime = new Date(punchOutDateTime.getTime() + 86400000);
        return {
          date: new Date(entry.date).toISOString().slice(0, 10),
          punchIn: punchInDateTime.toISOString(),
          punchOut: punchOutDateTime.toISOString(),
          timezone: entry.timezone || "UTC",
          notes: entry.notes || undefined,
        };
      });
    }

    setAddingBackDate(true);
    try {
      const result = await attendanceApi.regularizeAttendance(addStudentId, attendanceEntries);
      await Swal.fire({
        icon: "success",
        title: "Done",
        text: result.message ?? `Added ${result.createdOrUpdated ?? 0} attendance record(s).`,
        confirmButtonText: "OK",
      });
      setShowAddSection(false);
      fetchRequests();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ?? (err as { message?: string })?.message ?? "Failed to add attendance.";
      await Swal.fire({ icon: "error", title: "Error", text: msg, confirmButtonText: "OK" });
    } finally {
      setAddingBackDate(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString: string | undefined | null) => {
    if (dateString == null || dateString === "") return "—";
    try {
      const d = new Date(dateString);
      if (Number.isNaN(d.getTime())) return "—";
      return d.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "—";
    }
  };

  const getEntries = (request: BackdatedAttendanceRequest): AttendanceEntry[] => {
    if (request.attendanceEntries?.length) return request.attendanceEntries;
    const legacy = request as unknown as { date?: string; punchIn?: string; punchOut?: string | null; timezone?: string };
    if (legacy?.date && legacy?.punchIn) {
      return [{ date: legacy.date, punchIn: legacy.punchIn, punchOut: legacy.punchOut ?? null, timezone: legacy.timezone }];
    }
    return [];
  };

  const handleApprove = async (request: BackdatedAttendanceRequest) => {
    const requestId = request._id ?? (request as { id?: string }).id;
    if (!requestId) return;
    const entries = getEntries(request);
    const entriesHtml = entries.map((entry, i) => `
      <div class="mb-3 p-2 bg-gray-50 rounded text-left">
        <p><strong>Date ${entries.length > 1 ? `${i + 1}:` : ""}</strong> ${formatDate(entry.date)}</p>
        <p><strong>Punch In:</strong> ${formatDateTime(entry.punchIn)}</p>
        ${entry.punchOut ? `<p><strong>Punch Out:</strong> ${formatDateTime(entry.punchOut)}</p>` : "<p><strong>Punch Out:</strong> Not provided</p>"}
      </div>
    `).join("");
    const { value: adminComment } = await Swal.fire({
      title: "Approve Backdated Attendance Request",
      html: `
        <div class="text-left mb-4">
          <p><strong>Student:</strong> ${getStudentName(request)}</p>
          ${entriesHtml}
        </div>
        <textarea id="adminComment" class="swal2-textarea" placeholder="Add a comment (optional)" maxlength="1000"></textarea>
      `,
      showCancelButton: true,
      confirmButtonText: "Approve",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#28a745",
      preConfirm: () => (document.getElementById("adminComment") as HTMLTextAreaElement)?.value ?? "",
    });
    if (adminComment === undefined) return;
    setProcessingId(requestId);
    try {
      await approveBackdatedAttendanceRequest(requestId, adminComment || undefined);
      await Swal.fire({
        icon: "success",
        title: "Approved",
        html: "<p>Backdated attendance request approved. Attendance record(s) have been created/updated.</p>",
        confirmButtonText: "OK",
      });
      await fetchRequests();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ?? (err as { message?: string })?.message ?? "Failed to approve.";
      await Swal.fire({ icon: "error", title: "Error", text: msg, confirmButtonText: "OK" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (request: BackdatedAttendanceRequest) => {
    const requestId = request._id ?? (request as { id?: string }).id;
    if (!requestId) return;
    const entries = getEntries(request);
    const datesHtml = entries.map((e, i) => `<p><strong>Date ${entries.length > 1 ? `${i + 1}:` : ""}</strong> ${formatDate(e.date)}</p>`).join("");
    const { value: adminComment } = await Swal.fire({
      title: "Reject Backdated Attendance Request",
      html: `
        <div class="text-left mb-4">
          <p><strong>Student:</strong> ${getStudentName(request)}</p>
          ${datesHtml}
        </div>
        <textarea id="adminComment" class="swal2-textarea" placeholder="Reason for rejection (optional)" maxlength="1000"></textarea>
      `,
      showCancelButton: true,
      confirmButtonText: "Reject",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc3545",
      preConfirm: () => (document.getElementById("adminComment") as HTMLTextAreaElement)?.value ?? "",
    });
    if (adminComment === undefined) return;
    setProcessingId(requestId);
    try {
      await rejectBackdatedAttendanceRequest(requestId, adminComment || undefined);
      await Swal.fire({ icon: "success", title: "Rejected", text: "Request rejected.", confirmButtonText: "OK" });
      await fetchRequests();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ?? (err as { message?: string })?.message ?? "Failed to reject.";
      await Swal.fire({ icon: "error", title: "Error", text: msg, confirmButtonText: "OK" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleUpdate = async (request: BackdatedAttendanceRequest) => {
    const requestId = request._id ?? (request as { id?: string }).id;
    if (!requestId) return;
    const entries = getEntries(request);
    if (entries.length === 0) {
      await Swal.fire({ icon: "error", title: "Error", text: "No attendance entries in this request.", confirmButtonText: "OK" });
      return;
    }
    const first = entries[0];
    const dateStr = new Date(first.date).toISOString().split("T")[0];
    const punchInObj = new Date(first.punchIn);
    const punchOutObj = first.punchOut ? new Date(first.punchOut) : null;
    const punchInTime = punchInObj.toTimeString().slice(0, 5);
    const punchOutTime = punchOutObj ? punchOutObj.toTimeString().slice(0, 5) : "";
    const { value: form } = await Swal.fire({
      title: "Update Backdated Attendance Request",
      html: `
        <div class="text-left mb-4"><p><strong>Student:</strong> ${getStudentName(request)}</p></div>
        <input id="date" type="date" value="${dateStr}" class="swal2-input" max="${new Date().toISOString().split("T")[0]}">
        <input id="punchIn" type="time" value="${punchInTime}" class="swal2-input">
        <input id="punchOut" type="time" value="${punchOutTime}" class="swal2-input">
        <input id="timezone" type="text" value="${first.timezone || "UTC"}" class="swal2-input" placeholder="Timezone">
        <textarea id="notes" class="swal2-textarea" placeholder="Notes">${request.notes ?? ""}</textarea>
      `,
      showCancelButton: true,
      confirmButtonText: "Update",
      cancelButtonText: "Cancel",
      preConfirm: () => {
        const date = (document.getElementById("date") as HTMLInputElement)?.value;
        const punchIn = (document.getElementById("punchIn") as HTMLInputElement)?.value;
        const punchOut = (document.getElementById("punchOut") as HTMLInputElement)?.value;
        const timezone = (document.getElementById("timezone") as HTMLInputElement)?.value;
        const notes = (document.getElementById("notes") as HTMLTextAreaElement)?.value;
        if (!date || !punchIn || !punchOut) {
          Swal.showValidationMessage("Date, punch in, and punch out are required");
          return false;
        }
        return { date, punchIn, punchOut, timezone, notes };
      },
    });
    if (!form) return;
    setProcessingId(requestId);
    try {
      // Normalize time to HH:mm so "9:30" parses reliably as "09:30"
      const n = (t: string) => (t.length === 5 && t.includes(":") ? t : t.includes(":") ? `${t.split(":")[0].padStart(2, "0")}:${t.split(":")[1] ?? "00"}` : `${t.padStart(2, "0")}:00`);
      const punchInNorm = n(form.punchIn);
      const punchOutNorm = n(form.punchOut);
      const dateISO = new Date(form.date).toISOString();
      const punchInISO = new Date(`${form.date}T${punchInNorm}`).toISOString();
      const punchOutISO = new Date(`${form.date}T${punchOutNorm}`).toISOString();
      // Ensure every entry sends full ISO strings so backend validation accepts them
      const toISO = (v: string | Date | undefined | null) => (v == null ? null : typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v) ? v : new Date(v as string).toISOString());
      const attendanceEntries =
        entries.length > 1
          ? entries.map((entry, i) =>
              i === 0
                ? { date: dateISO, punchIn: punchInISO, punchOut: punchOutISO, timezone: form.timezone || "UTC" }
                : {
                    date: toISO(entry.date) ?? entry.date,
                    punchIn: toISO(entry.punchIn) ?? entry.punchIn,
                    punchOut: entry.punchOut != null ? (toISO(entry.punchOut) ?? entry.punchOut) : null,
                    timezone: entry.timezone || "UTC",
                  }
            )
          : [{ date: dateISO, punchIn: punchInISO, punchOut: punchOutISO, timezone: form.timezone || "UTC" }];
      await updateBackdatedAttendanceRequest(requestId, { attendanceEntries, notes: form.notes || undefined });
      await Swal.fire({ icon: "success", title: "Updated", text: "Request updated.", confirmButtonText: "OK" });
      await fetchRequests();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ?? (err as { message?: string })?.message ?? "Failed to update.";
      await Swal.fire({ icon: "error", title: "Error", text: msg, confirmButtonText: "OK" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancel = async (request: BackdatedAttendanceRequest) => {
    const requestId = request._id ?? (request as { id?: string }).id;
    if (!requestId) return;
    const { isConfirmed } = await Swal.fire({
      title: "Cancel Request?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Cancel Request",
      confirmButtonColor: "#6c757d",
    });
    if (!isConfirmed) return;
    setProcessingId(requestId);
    try {
      await cancelBackdatedAttendanceRequest(requestId);
      await Swal.fire({ icon: "success", title: "Cancelled", text: "Request cancelled.", confirmButtonText: "OK" });
      await fetchRequests();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ?? (err as { message?: string })?.message ?? "Failed to cancel.";
      await Swal.fire({ icon: "error", title: "Error", text: msg, confirmButtonText: "OK" });
    } finally {
      setProcessingId(null);
    }
  };

  const openAttendanceView = async (request: BackdatedAttendanceRequest) => {
    const rawStudent = request.student as unknown;
    // Accept populated object, plain id string, or fallback by studentEmail from loaded students.
    let studentId = "";
    if (rawStudent && typeof rawStudent === "object") {
      const obj = rawStudent as { _id?: string; id?: string };
      studentId = String(obj._id ?? obj.id ?? "").trim();
    } else if (typeof rawStudent === "string") {
      studentId = rawStudent.trim();
    }
    if (!studentId && request.studentEmail) {
      const match = students.find(
        (s) => (s.user?.email ?? "").trim().toLowerCase() === request.studentEmail!.trim().toLowerCase()
      );
      studentId = String(match?.id ?? "").trim();
    }
    if (!studentId && request.requestedBy?._id) {
      const matchByRequester = students.find(
        (s) => String(s.user?.id ?? "").trim() === String(request.requestedBy?._id ?? "").trim()
      );
      studentId = String(matchByRequester?.id ?? "").trim();
    }
    const rawReq = request as unknown as { user?: { _id?: string; id?: string } | string; requestedBy?: { _id?: string; id?: string } };
    let userId = "";
    if (rawReq.user && typeof rawReq.user === "object") {
      userId = String(rawReq.user._id ?? rawReq.user.id ?? "").trim();
    } else if (typeof rawReq.user === "string") {
      userId = rawReq.user.trim();
    }
    if (!userId && rawReq.requestedBy) {
      userId = String(rawReq.requestedBy._id ?? rawReq.requestedBy.id ?? "").trim();
    }

    const entryDates = [...(request.attendanceEntries ?? [])]
      .map((e) => e.date)
      .filter((d): d is string => Boolean(d))
      .sort();
    /** Open on the latest requested day, not the earliest (sort()[0] was jumping to February for Feb–Mar ranges). */
    const initialDate = entryDates.length > 0 ? entryDates[entryDates.length - 1] : undefined;

    let candidateId: string | undefined;
    const emailForCandidate =
      request.studentEmail?.trim() ||
      request.requestedBy?.email?.trim() ||
      (typeof rawStudent === "object" && rawStudent && "user" in rawStudent
        ? (rawStudent as { user?: { email?: string } }).user?.email?.trim()
        : undefined);
    if (emailForCandidate) {
      try {
        const candRes = await listCandidates({ email: emailForCandidate, limit: 1, page: 1 });
        const cand = candRes.results?.[0];
        candidateId = String(cand?.id ?? cand?._id ?? "").trim() || undefined;
      } catch {
        // Overlay still uses student / user attendance APIs
      }
    }

    if (!studentId && !userId && !candidateId) {
      Swal.fire({
        icon: "warning",
        title: "Student not found",
        text: "This request is not linked to a student, user, or ATS candidate (by email).",
        confirmButtonText: "OK",
      });
      return;
    }

    setAttendanceViewStudent({
      studentId: studentId || undefined,
      userId: userId || undefined,
      candidateId,
      name: getStudentName(request),
      initialDate,
    });
  };

  const getStatusConfig = (status: string) => {
    const config: Record<string, { accent: string; badge: string; icon: string; label: string }> = {
      pending: {
        accent: "border-l-amber-500 dark:border-l-amber-400",
        badge: "bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-200/60 dark:border-amber-500/30",
        icon: "ri-time-line",
        label: "Pending",
      },
      approved: {
        accent: "border-l-emerald-500 dark:border-l-emerald-400",
        badge: "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border border-emerald-200/60 dark:border-emerald-500/30",
        icon: "ri-checkbox-circle-line",
        label: "Approved",
      },
      rejected: {
        accent: "border-l-rose-500 dark:border-l-rose-400",
        badge: "bg-rose-50 dark:bg-rose-500/15 text-rose-800 dark:text-rose-200 border border-rose-200/60 dark:border-rose-500/30",
        icon: "ri-close-circle-line",
        label: "Rejected",
      },
      cancelled: {
        accent: "border-l-defaultborder",
        badge: "bg-defaultborder/30 text-defaulttextcolor/80 border border-defaultborder",
        icon: "ri-close-line",
        label: "Cancelled",
      },
    };
    return config[status] ?? config.pending;
  };

  const pageStyles = (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
      .backdated-page { font-family: 'Figtree', ui-sans-serif, system-ui, sans-serif; }
      @keyframes backdated-card-enter {
        from { opacity: 0; transform: translateY(12px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .backdated-card-enter {
        animation: backdated-card-enter 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards;
      }
    `}</style>
  );

  if (isAdmin === null) {
    return (
      <>
        <Seo title="Backdated Attendance" />
        {pageStyles}
        <div className="backdated-page w-full mt-4">
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

  if (isAdmin === false) {
    return (
      <>
        <Seo title="Backdated Attendance" />
        {pageStyles}
        <div className="backdated-page w-full mt-4">
          <div className="rounded-2xl border border-defaultborder/70 bg-white dark:bg-bodybg shadow-sm overflow-hidden">
            <div className="py-20 px-6 text-center">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-danger/10 text-danger mb-5 ring-1 ring-danger/20">
                <i className="ri-error-warning-line text-5xl" />
              </div>
              <h3 className="text-xl font-semibold text-defaulttextcolor dark:text-white mb-2">Access Denied</h3>
              <p className="text-sm text-defaulttextcolor/80 max-w-md mx-auto">Only administrators can view and manage backdated attendance requests.</p>
            </div>
          </div>
        </div>
      </>
    );
  }

return (
    <>
      <Seo title="Backdated Attendance" />
      {pageStyles}
      <div className="backdated-page relative mt-4 space-y-6 min-h-[50vh] w-full">
        {/* Ambient background */}
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_100%_60%_at_50%_-15%,rgba(99,102,241,0.07),transparent_50%)] dark:bg-[radial-gradient(ellipse_100%_60%_at_50%_-15%,rgba(99,102,241,0.12),transparent_50%)]" aria-hidden />
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(to_bottom,rgba(248,250,252,0.6),transparent_30%)] dark:bg-[linear-gradient(to_bottom,rgba(15,23,42,0.4),transparent_30%)]" aria-hidden />

        <section className="rounded-2xl border border-defaultborder/70 bg-white dark:bg-bodybg shadow-sm shadow-black/[0.03] dark:shadow-none overflow-hidden transition-shadow duration-300 hover:shadow-md hover:shadow-black/[0.04] dark:hover:shadow-none">
          <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-defaultborder/50 bg-gradient-to-r from-slate-50/90 to-white dark:from-white/[0.03] dark:to-transparent">
            <div className="flex items-center gap-4 min-w-0">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/10 dark:ring-primary/20" aria-hidden>
                <i className="ri-calendar-check-line text-2xl" />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-defaulttextcolor dark:text-white tracking-tight">Add Backdated Attendance</h2>
                <p className="text-xs text-defaulttextcolor/60 dark:text-white/50 mt-0.5">Admin only · Apply attendance for past dates</p>
              </div>
            </div>
            {!showAddSection ? (
              <button
                type="button"
                onClick={openAddSection}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-primary/90 hover:shadow-md hover:shadow-primary/20 active:scale-[0.98]"
              >
                <i className="ri-add-line text-base" />
                Add for Employee
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddSection(false)}
                className="inline-flex items-center gap-2 rounded-xl border border-defaultborder bg-transparent px-4 py-2.5 text-sm font-medium text-defaulttextcolor transition-colors hover:bg-defaultborder/20 dark:hover:bg-white/5"
              >
                Cancel
              </button>
            )}
          </div>
          {showAddSection && (
            <div className="px-6 py-6 border-t border-defaultborder/50 space-y-5 bg-gradient-to-b from-slate-50/50 to-transparent dark:from-white/[0.02] dark:to-transparent">
              <div>
                <label className="block text-sm font-semibold text-defaulttextcolor mb-2">Select people <span className="text-danger">*</span></label>
                <p className="text-xs text-defaulttextcolor/60 mb-2">Search by name, email, or employee ID (same as other Attendance assign screens).</p>
                <div className="rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all duration-150">
                  <Select
                    options={people}
                    value={addPersonValue ? people.find((p) => p.value === addPersonValue) ?? null : null}
                    onChange={(o) => {
                      setAddPersonValue((o as AssignPersonRow | null)?.value ?? "");
                    }}
                    getOptionValue={(o) => (o as AssignPersonRow).value}
                    getOptionLabel={(o) => (o as AssignPersonRow).label}
                    filterOption={filterAssignPersonSelectOption}
                    placeholder="Training profiles and employees…"
                    isClearable
                    isSearchable
                    className="react-select-container backdated-add-person-select"
                    classNamePrefix="react-select"
                    menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
                    menuPosition="fixed"
                  />
                </div>
                {addResolvingProfile && (
                  <p className="mt-1.5 text-xs text-defaulttextcolor/60">
                    <i className="ri-loader-4-line animate-spin me-1 inline" aria-hidden />
                    Linking training profile…
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-medium text-defaulttextcolor">Add by</span>
                <div className="inline-flex rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 p-1">
                  <button
                    type="button"
                    onClick={() => setAddMode("range")}
                    title="By date range (From – To)"
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shrink-0 ${addMode === "range" ? "bg-primary text-white shadow-sm" : "text-defaulttextcolor hover:text-primary"}`}
                  >
                    <i className="ri-calendar-2-line text-lg" aria-hidden />
                    Date range
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddMode("entries")}
                    title="By individual entries"
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shrink-0 ${addMode === "entries" ? "bg-primary text-white shadow-sm" : "text-defaulttextcolor hover:text-primary"}`}
                  >
                    <i className="ri-list-unordered text-lg" />
                    Per entry
                  </button>
                </div>
                <span className="text-xs text-defaulttextcolor/50">
                  {addMode === "range" ? "Same punch in/out for all working days in range" : "One date and time set per row"}
                </span>
              </div>
              {addMode === "range" && (
                <div className="p-5 border border-defaultborder/70 rounded-xl bg-slate-50/60 dark:bg-white/[0.04] dark:border-defaultborder/50">
                  <p className="text-sm text-defaulttextcolor/90 mb-4">
                    Enter a date range. Punch in and punch out will be applied to all working days (weekends excluded, or the person&apos;s week-off if set).
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-defaulttextcolor mb-1.5">From date *</label>
                      <input
                        type="date"
                        value={addRangeForm.fromDate}
                        max={new Date().toISOString().slice(0, 10)}
                        onChange={(e) => setAddRangeForm((prev) => ({ ...prev, fromDate: e.target.value }))}
                        className="ti-form-input w-full rounded-lg border-defaultborder/80 !py-2.5 focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-defaulttextcolor mb-1.5">To date *</label>
                      <input
                        type="date"
                        value={addRangeForm.toDate}
                        max={new Date().toISOString().slice(0, 10)}
                        onChange={(e) => setAddRangeForm((prev) => ({ ...prev, toDate: e.target.value }))}
                        className="ti-form-input w-full rounded-lg border-defaultborder/80 !py-2.5 focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-defaulttextcolor mb-1.5">Timezone (from shift)</label>
                      <div className="w-full px-3 py-2.5 border border-defaultborder/80 rounded-lg bg-white dark:bg-white/5 text-defaulttextcolor text-sm">
                        {addStudentId
                          ? (addRangeForm.timezone || "UTC")
                          : <span className="text-defaulttextcolor/50">Select an employee or training profile to see their timezone</span>}
                      </div>
                    </div>
                    <div />
                    <div>
                      <label className="block text-xs font-semibold text-defaulttextcolor mb-1.5">Punch In *</label>
                      <input
                        type="time"
                        value={addRangeForm.punchInTime}
                        onChange={(e) => setAddRangeForm((prev) => ({ ...prev, punchInTime: e.target.value }))}
                        className="ti-form-input w-full rounded-lg border-defaultborder/80 !py-2.5 focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-defaulttextcolor mb-1.5">Punch Out *</label>
                      <input
                        type="time"
                        value={addRangeForm.punchOutTime}
                        onChange={(e) => setAddRangeForm((prev) => ({ ...prev, punchOutTime: e.target.value }))}
                        className="ti-form-input w-full rounded-lg border-defaultborder/80 !py-2.5 focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-defaulttextcolor mb-1.5">Notes (optional)</label>
                      <input
                        type="text"
                        value={addRangeForm.notes}
                        onChange={(e) => setAddRangeForm((prev) => ({ ...prev, notes: e.target.value }))}
                        placeholder="Notes for this entry"
                        className="ti-form-input w-full rounded-lg border-defaultborder/80 !py-2.5 focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                </div>
              )}
              {addMode === "entries" && (
                <div className="p-4 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/20 dark:border-primary/30 text-sm text-defaulttextcolor">
                  <i className="ri-information-line me-2 text-primary align-middle" />
                  Add one row per past date; each needs date, punch-in, and punch-out.
                </div>
              )}
              {addMode === "entries" && addEntries.map((entry, index) => (
                <div key={index} className="p-4 border border-defaultborder/70 rounded-xl bg-slate-50/60 dark:bg-white/[0.04] dark:border-defaultborder/50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-defaulttextcolor">Entry {index + 1}</span>
                    {addEntries.length > 1 && (
                      <button type="button" onClick={() => removeAddEntry(index)} className="p-1.5 rounded-lg text-danger hover:bg-danger/10 transition-colors" title="Remove">
                        <i className="ri-delete-bin-line text-lg" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-defaulttextcolor mb-1">Date *</label>
                      <input
                        type="date"
                        value={entry.date}
                        max={new Date().toISOString().slice(0, 10)}
                        onChange={(e) => updateAddEntry(index, "date", e.target.value)}
                        className="ti-form-input w-full rounded-lg !py-2 focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-defaulttextcolor mb-1">Timezone</label>
                      <div className="w-full px-3 py-2 border border-defaultborder/80 rounded-lg bg-white dark:bg-white/5 text-defaulttextcolor text-sm">{entry.timezone}</div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-defaulttextcolor mb-1">Punch In *</label>
                      <input
                        type="time"
                        value={entry.punchInTime}
                        onChange={(e) => updateAddEntry(index, "punchInTime", e.target.value)}
                        className="ti-form-input w-full rounded-lg !py-2 focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-defaulttextcolor mb-1">Punch Out *</label>
                      <input
                        type="time"
                        value={entry.punchOutTime}
                        onChange={(e) => updateAddEntry(index, "punchOutTime", e.target.value)}
                        className="ti-form-input w-full rounded-lg !py-2 focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-defaulttextcolor mb-1">Notes (optional)</label>
                      <input
                        type="text"
                        value={entry.notes}
                        onChange={(e) => updateAddEntry(index, "notes", e.target.value)}
                        placeholder="Notes for this entry"
                        className="ti-form-input w-full rounded-lg !py-2 focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                </div>
              ))}
              {addMode === "entries" && (
                <div className="flex gap-2">
                  <button type="button" onClick={addAddEntry} className="inline-flex items-center gap-2 rounded-xl border border-defaultborder/80 px-4 py-2.5 text-sm font-medium text-defaulttextcolor hover:bg-defaultborder/20 dark:hover:bg-white/5 transition-colors">
                    <i className="ri-add-line" />
                    Add Another Entry
                  </button>
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleSubmitAddBackdated}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary/90 hover:shadow-md transition-all disabled:opacity-60"
                  disabled={addingBackDate || addResolvingProfile || !addPersonValue || !addStudentId}
                >
                  {addingBackDate ? <><i className="ri-loader-4-line animate-spin text-lg" /> Adding…</> : <><i className="ri-check-line text-lg" /> Add Attendance</>}
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-defaultborder/70 bg-white dark:bg-bodybg shadow-sm shadow-black/[0.03] dark:shadow-none overflow-hidden">
          <div className="px-6 py-4 border-b border-defaultborder/50 bg-gradient-to-r from-slate-50/80 to-white dark:from-white/[0.02] dark:to-transparent">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-white/10 text-defaulttextcolor/70" aria-hidden>
                  <i className="ri-filter-3-line text-lg" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/60 dark:text-white/50">Filters</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["all", "pending", "approved", "rejected", "cancelled"] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => {
                      setFilterStatus(status);
                      setPagination((p) => ({ ...p, page: 1 }));
                    }}
                    className={`
                      rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200
                      ${filterStatus === status
                        ? "bg-primary text-white shadow-sm shadow-primary/20"
                        : "bg-slate-100 dark:bg-white/10 text-defaulttextcolor/80 hover:bg-slate-200 dark:hover:bg-white/15 hover:text-defaulttextcolor"
                      }
                    `}
                  >
                    {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
              <div className="min-w-[220px] w-full sm:w-[min(360px,100%)] sm:ml-auto">
                <label className="sr-only">Filter by person</label>
                <div className="rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all duration-150">
                  <Select
                    options={listFilterOptions as { value: string; label: string }[]}
                    value={listFilterValue as { value: string; label: string }}
                    onChange={(o) => {
                      const v = (o as { value?: string } | null)?.value;
                      if (v == null || v === FILTER_LIST_ALL) setFilterStudent("all");
                      else setFilterStudent(v);
                      setPagination((p) => ({ ...p, page: 1 }));
                    }}
                    getOptionValue={(o) => (o as { value: string }).value}
                    getOptionLabel={(o) => (o as { label: string }).label}
                    filterOption={filterBackdatedListPersonOption}
                    placeholder="All employees"
                    isSearchable
                    isClearable={false}
                    className="react-select-container backdated-filter-person-select"
                    classNamePrefix="react-select"
                    menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
                    menuPosition="fixed"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-defaultborder/70 bg-white dark:bg-bodybg shadow-sm shadow-black/[0.03] dark:shadow-none overflow-hidden transition-shadow duration-300 hover:shadow-md hover:shadow-black/[0.04] dark:hover:shadow-none">
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5 border-b border-defaultborder/50 bg-gradient-to-r from-slate-50/90 to-white dark:from-white/[0.03] dark:to-transparent">
            <div className="flex items-center gap-4 min-w-0">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/10 dark:ring-primary/20" aria-hidden>
                <i className="ri-file-list-3-line text-2xl" />
              </span>
              <div className="flex items-center gap-3 min-w-0">
                <h2 className="text-lg font-semibold text-defaulttextcolor dark:text-white tracking-tight">Requests</h2>
                {pagination.totalResults > 0 && (
                  <span className="inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-full bg-primary/15 px-2.5 text-xs font-semibold text-primary ring-1 ring-primary/20">
                    {pagination.totalResults}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="px-6 py-6">
            {loadingRequests ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-5 ring-1 ring-primary/10">
                  <i className="ri-loader-4-line animate-spin text-4xl" />
                </div>
                <p className="text-sm font-semibold text-defaulttextcolor">Loading requests…</p>
                <p className="mt-1.5 text-xs text-defaulttextcolor/50">This may take a moment</p>
              </div>
            ) : requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="inline-flex h-24 w-24 items-center justify-center rounded-3xl bg-slate-100 dark:bg-white/10 text-defaulttextcolor/40 mb-5 ring-1 ring-defaultborder/50">
                  <i className="ri-file-list-3-line text-5xl" />
                </div>
                <p className="text-lg font-semibold text-defaulttextcolor dark:text-white">No requests found</p>
                <p className="mt-2 max-w-sm text-sm text-defaulttextcolor/60 dark:text-white/60">
                  {(filterStatus !== "all" || filterStudent !== "all")
                    ? "Try changing filters to see more results."
                    : "Backdated attendance requests will appear here when submitted."}
                </p>
                {(filterStatus !== "all" || filterStudent !== "all") && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterStatus("all");
                      setFilterStudent("all");
                      setPagination((p) => ({ ...p, page: 1 }));
                    }}
                    className="mt-6 rounded-xl border border-defaultborder/80 bg-transparent px-5 py-2.5 text-sm font-medium text-defaulttextcolor hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-5">
                  {requests.map((request, index) => {
                    const statusConfig = getStatusConfig(request.status);
                    const reqId = request._id ?? (request as { id?: string }).id;
                    const entries = getEntries(request);
                    const { shiftName: requestShiftName, timezone: requestStudentTz } = getStudentShiftForRequest(request, students);
                    const displayTz = requestStudentTz || entries[0]?.timezone || "UTC";
                    const displayTzLabel = requestShiftName
                      ? `${requestShiftName} (${displayTz})`
                      : displayTz;
                    const isProcessing = processingId === reqId;
                    return (
                      <article
                        key={reqId}
                        style={{ animationDelay: `${index * 60}ms` }}
                        className={`
                          backdated-card-enter relative overflow-hidden rounded-2xl border border-defaultborder/70
                          bg-white dark:bg-bodybg border-l-4 shadow-sm shadow-black/[0.02] dark:shadow-none opacity-0
                          transition-all duration-300 ease-out
                          hover:shadow-lg hover:shadow-black/[0.04] hover:border-defaultborder dark:hover:shadow-none
                          ${statusConfig.accent}
                        `}
                      >
                        <div className="p-6 sm:p-6">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            {/* Content */}
                            <div className="flex-1 min-w-0 space-y-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.badge}`}>
                                  <i className={`${statusConfig.icon} text-[0.9em]`} />
                                  {statusConfig.label}
                                </span>
                                {entries.length > 1 && (
                                  <span className="text-xs text-defaulttextcolor/60 font-medium">
                                    {entries.length} dates
                                  </span>
                                )}
                              </div>

                              <div>
                                <p className="text-sm font-semibold text-defaulttextcolor tracking-tight">
                                  {getStudentName(request)}
                                </p>
                                <p className="text-xs text-defaulttextcolor/60 mt-0.5">Student</p>
                              </div>

                              {/* Date entries: compact definition list */}
                              <div className="rounded-xl bg-slate-50/80 dark:bg-white/[0.06] border border-defaultborder/50 overflow-hidden">
                                <dl className="divide-y divide-defaultborder/40">
                                  {entries.map((entry, idx) => (
                                    <div key={idx} className="px-4 py-3 sm:grid sm:grid-cols-[auto_1fr] sm:gap-x-4 sm:gap-y-1">
                                      <dt className="text-xs font-medium text-defaulttextcolor/70 mt-1 sm:mt-0">
                                        {entries.length > 1 ? `Date ${idx + 1}` : "Details"}
                                      </dt>
                                      <dd className="text-sm text-defaulttextcolor mt-0.5 sm:mt-0 space-y-0.5">
                                        <span className="font-medium text-defaulttextcolor">{formatDate(entry.date)}</span>
                                        <span className="text-defaulttextcolor/80 mx-2">·</span>
                                        <span>{formatDateTime(entry.punchIn)}</span>
                                        {entry.punchOut && (
                                          <>
                                            <span className="text-defaulttextcolor/60 mx-1">→</span>
                                            <span>{formatDateTime(entry.punchOut)}</span>
                                          </>
                                        )}
                                        {(requestStudentTz || entry.timezone) && (
                                          <span className="text-defaulttextcolor/60 ml-2" title="Assigned shift timezone">
                                            ({displayTzLabel})
                                          </span>
                                        )}
                                      </dd>
                                    </div>
                                  ))}
                                </dl>
                              </div>

                              {(request.notes || request.adminComment) && (
                                <div className="space-y-1 text-sm text-defaulttextcolor/80">
                                  {request.notes && (
                                    <p><span className="font-medium text-defaulttextcolor/90">Notes:</span> {request.notes}</p>
                                  )}
                                  {request.adminComment && (
                                    <p><span className="font-medium text-defaulttextcolor/90">Admin:</span> {request.adminComment}</p>
                                  )}
                                </div>
                              )}

                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-defaulttextcolor/50">
                                <span className="inline-flex items-center gap-1">
                                  <i className="ri-calendar-line" />
                                  Requested {formatDateTime(request.createdAt)}
                                </span>
                                {request.reviewedAt && (
                                  <span className="inline-flex items-center gap-1">
                                    <i className="ri-time-line" />
                                    Reviewed {formatDateTime(request.reviewedAt)}
                                  </span>
                                )}
                                {request.reviewedBy?.name && (
                                  <span className="inline-flex items-center gap-1">
                                    <i className="ri-user-line" />
                                    {request.reviewedBy.name}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            {request.status === "pending" && (
                              <div className="flex flex-wrap gap-2 shrink-0 sm:flex-col sm:items-end">
                                <div className="flex gap-2" role="group" aria-label="Primary actions">
                                  <button
                                    type="button"
                                    onClick={() => handleApprove(request)}
                                    disabled={isProcessing}
                                    className={`
                                      inline-flex items-center justify-center gap-2 min-h-[2.25rem] px-4 rounded-lg
                                      bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-medium
                                      shadow-sm hover:shadow transition-all duration-150
                                      disabled:opacity-50 disabled:pointer-events-none
                                    `}
                                  >
                                    {isProcessing ? (
                                      <i className="ri-loader-4-line animate-spin text-base" />
                                    ) : (
                                      <><i className="ri-checkbox-circle-line text-base" /> Approve</>
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleReject(request)}
                                    disabled={isProcessing}
                                    className={`
                                      inline-flex items-center justify-center gap-2 min-h-[2.25rem] px-4 rounded-lg
                                      bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-sm font-medium
                                      shadow-sm hover:shadow transition-all duration-150
                                      disabled:opacity-50 disabled:pointer-events-none
                                    `}
                                  >
                                    {isProcessing ? (
                                      <i className="ri-loader-4-line animate-spin text-base" />
                                    ) : (
                                      <><i className="ri-close-circle-line text-base" /> Reject</>
                                    )}
                                  </button>
                                </div>
                                <div className="flex gap-2" role="group" aria-label="Secondary actions">
                                  <button
                                    type="button"
                                    onClick={() => void openAttendanceView(request)}
                                    disabled={isProcessing}
                                    className={`
                                      inline-flex items-center justify-center gap-2 min-h-[2.25rem] px-3.5 rounded-lg
                                      border border-sky-400/60 text-sky-700 bg-sky-50/70
                                      hover:bg-sky-100/80 hover:border-sky-500 text-sm font-medium
                                      transition-colors duration-150
                                      disabled:opacity-50 disabled:pointer-events-none
                                    `}
                                  >
                                    <i className="ri-calendar-check-line text-sm" /> View
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdate(request)}
                                    disabled={isProcessing}
                                    className={`
                                      inline-flex items-center justify-center gap-2 min-h-[2.25rem] px-3.5 rounded-lg
                                      border-2 border-primary/50 text-primary bg-transparent
                                      hover:bg-primary/10 hover:border-primary text-sm font-medium
                                      transition-colors duration-150
                                      disabled:opacity-50 disabled:pointer-events-none
                                    `}
                                  >
                                    <i className="ri-edit-line text-sm" /> Update
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleCancel(request)}
                                    disabled={isProcessing}
                                    className={`
                                      inline-flex items-center justify-center gap-2 min-h-[2.25rem] px-3.5 rounded-lg
                                      text-defaulttextcolor/80 hover:text-defaulttextcolor hover:bg-defaultborder/30
                                      text-sm font-medium transition-colors duration-150
                                      disabled:opacity-50 disabled:pointer-events-none
                                    `}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
                {pagination.totalPages > 1 && (
                  <nav
                    className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-defaultborder/50 pt-6"
                    aria-label="Pagination"
                  >
                    <p className="text-sm text-defaulttextcolor/70 dark:text-white/60">
                      Page <span className="font-semibold text-defaulttextcolor dark:text-white">{pagination.page}</span> of{" "}
                      <span className="font-semibold text-defaulttextcolor dark:text-white">{pagination.totalPages}</span>
                    </p>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
                        disabled={pagination.page === 1 || loadingRequests}
                        className="inline-flex items-center gap-2 rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-4 py-2.5 text-sm font-medium text-defaulttextcolor hover:bg-slate-50 dark:hover:bg-white/10 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                      >
                        <i className="ri-arrow-left-s-line text-lg" />
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={() => setPagination((p) => ({ ...p, page: Math.min(p.totalPages, p.page + 1) }))}
                        disabled={pagination.page === pagination.totalPages || loadingRequests}
                        className="inline-flex items-center gap-2 rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-4 py-2.5 text-sm font-medium text-defaulttextcolor hover:bg-slate-50 dark:hover:bg-white/10 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                      >
                        Next
                        <i className="ri-arrow-right-s-line text-lg" />
                      </button>
                    </div>
                  </nav>
                )}
              </>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-defaultborder/70 overflow-hidden border-l-4 border-l-primary/60 bg-gradient-to-br from-primary/[0.06] to-transparent dark:from-primary/10 dark:to-transparent shadow-sm shadow-black/[0.02] dark:shadow-none">
          <div className="px-6 py-6">
            <div className="flex items-start gap-5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/10 dark:ring-primary/20" aria-hidden>
                <i className="ri-information-line text-2xl" />
              </span>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-defaulttextcolor dark:text-white tracking-tight">About Backdated Attendance</h3>
                <ul className="mt-4 space-y-3 text-sm text-defaulttextcolor/85 dark:text-white/80">
                  <li className="flex items-start gap-3">
                    <i className="ri-checkbox-circle-fill mt-0.5 text-emerald-500/90 shrink-0 text-base" />
                    <span>Students submit backdated attendance requests for past dates.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <i className="ri-edit-fill mt-0.5 text-primary shrink-0 text-base" />
                    <span><strong className="text-defaulttextcolor">Update:</strong> Modify date, times, timezone, or notes before approval.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <i className="ri-check-double-line mt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0 text-base" />
                    <span><strong className="text-defaulttextcolor">Approve:</strong> Creates or updates attendance records in the student&apos;s calendar.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <i className="ri-close-circle-fill mt-0.5 text-rose-500/90 shrink-0 text-base" />
                    <span><strong className="text-defaulttextcolor">Reject:</strong> No attendance is created; you can add a comment.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </div>

      <style jsx>{`
        .backdated-add-person-select :global(.react-select__control),
        .backdated-filter-person-select :global(.react-select__control) {
          border: none;
          min-height: 2.75rem;
          background: transparent;
          box-shadow: none;
        }
        .backdated-add-person-select :global(.react-select__control--is-focused),
        .backdated-filter-person-select :global(.react-select__control--is-focused) {
          box-shadow: none;
        }
        .backdated-add-person-select :global(.react-select__placeholder),
        .backdated-add-person-select :global(.react-select__input-container),
        .backdated-filter-person-select :global(.react-select__placeholder),
        .backdated-filter-person-select :global(.react-select__input-container) {
          color: inherit;
        }
      `}</style>

      <StudentAttendanceOverlay
        open={!!attendanceViewStudent}
        onClose={() => setAttendanceViewStudent(null)}
        studentId={attendanceViewStudent?.studentId}
        userId={attendanceViewStudent?.userId}
        candidateId={attendanceViewStudent?.candidateId}
        studentName={attendanceViewStudent?.name ?? ""}
        initialDate={attendanceViewStudent?.initialDate}
      />
    </>
  );
}
