"use client";

import React, { useEffect, useState, useCallback } from "react";
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
import * as attendanceApi from "@/shared/lib/api/attendance";
import Pageheader from "@/shared/layout-components/page-header/pageheader";
import Seo from "@/shared/layout-components/seo/seo";
import Swal from "sweetalert2";
import { useAuth } from "@/shared/contexts/auth-context";
import * as rolesApi from "@/shared/lib/api/roles";
import type { Role } from "@/shared/lib/types";

function getDetectedTimezone(): string {
  if (typeof window === "undefined") return "UTC";
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
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

export default function SettingsAttendanceBackdatedPage() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected" | "cancelled">("pending");
  const [filterStudent, setFilterStudent] = useState<string>("all");
  const [students, setStudents] = useState<Student[]>([]);

  const [requests, setRequests] = useState<BackdatedAttendanceRequest[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1,
    totalResults: 0,
  });

  const [showAddSection, setShowAddSection] = useState(false);
  const [addStudentId, setAddStudentId] = useState<string>("");
  const [addEntries, setAddEntries] = useState<Array<{ date: string; punchInTime: string; punchOutTime: string; notes: string; timezone: string }>>([]);
  const [addingBackDate, setAddingBackDate] = useState(false);

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

  const fetchStudents = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await listStudents({ limit: 1000, sortBy: "user.name:asc" });
      setStudents(res.results ?? []);
    } catch {
      setStudents([]);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) fetchStudents();
  }, [isAdmin, fetchStudents]);

  const fetchRequests = useCallback(async () => {
    if (isAdmin === false) return;
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
      setLoading(false);
    }
  }, [isAdmin, filterStatus, filterStudent, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const defaultTimezone = getDetectedTimezone();

  useEffect(() => {
    if (!addStudentId) return;
    getStudent(addStudentId)
      .then((s) => {
        const tz = s?.shift?.timezone || defaultTimezone;
        setAddEntries((prev) => prev.map((e) => ({ ...e, timezone: tz })));
      })
      .catch(() => {});
  }, [addStudentId, defaultTimezone]);

  const openAddSection = () => {
    setAddStudentId("");
    setAddEntries([{ date: "", punchInTime: "", punchOutTime: "", notes: "", timezone: defaultTimezone }]);
    setShowAddSection(true);
  };
  const addAddEntry = () => {
    setAddEntries((prev) => [...prev, { date: "", punchInTime: "", punchOutTime: "", notes: "", timezone: defaultTimezone }]);
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
    if (!addStudentId) {
      await Swal.fire({ icon: "warning", title: "Select Student", text: "Please select the student who needs backdated attendance.", confirmButtonText: "OK" });
      return;
    }
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
    setAddingBackDate(true);
    try {
      const attendanceEntries = valid.map((entry) => {
        const punchInStr = entry.punchInTime.includes(":") ? entry.punchInTime : `${entry.punchInTime}:00`;
        const punchOutStr = entry.punchOutTime.includes(":") ? entry.punchOutTime : `${entry.punchOutTime}:00`;
        const punchInDateTime = new Date(`${entry.date}T${punchInStr}`);
        let punchOutDateTime = new Date(`${entry.date}T${punchOutStr}`);
        if (punchOutDateTime <= punchInDateTime) punchOutDateTime = new Date(punchOutDateTime.getTime() + 86400000);
        return {
          date: new Date(entry.date).toISOString().slice(0, 10),
          punchIn: punchInDateTime.toISOString(),
          punchOut: punchOutDateTime.toISOString(),
          timezone: entry.timezone || defaultTimezone,
          notes: entry.notes || undefined,
        };
      });
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
      const dateISO = new Date(form.date).toISOString();
      const punchInISO = new Date(`${form.date}T${form.punchIn}`).toISOString();
      const punchOutISO = form.punchOut ? new Date(`${form.date}T${form.punchOut}`).toISOString() : null;
      const attendanceEntries = entries.length > 1
        ? entries.map((entry, i) =>
            i === 0
              ? { date: dateISO, punchIn: punchInISO, punchOut: punchOutISO, timezone: form.timezone || "UTC" }
              : { date: entry.date, punchIn: entry.punchIn, punchOut: entry.punchOut ?? null, timezone: entry.timezone }
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

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; icon: string; label: string }> = {
      pending: { color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: "ri-time-line", label: "Pending" },
      approved: { color: "bg-green-100 text-green-800 border-green-200", icon: "ri-checkbox-circle-line", label: "Approved" },
      rejected: { color: "bg-red-100 text-red-800 border-red-200", icon: "ri-close-circle-line", label: "Rejected" },
      cancelled: { color: "bg-gray-100 text-gray-800 border-gray-200", icon: "ri-close-line", label: "Cancelled" },
    };
    return config[status] ?? config.pending;
  };

  if (isAdmin === null || (isAdmin === true && loading && requests.length === 0)) {
    return (
      <>
        <Seo title="Backdated Attendance" />
        <Pageheader currentpage="Backdated Attendance" activepage="Settings" mainpage="Attendance" />
        <div className="box">
          <div className="box-body text-center py-12">
            <i className="ri-loader-4-line animate-spin text-4xl text-primary" />
            <p className="mt-2 text-defaulttextcolor">Loading...</p>
          </div>
        </div>
      </>
    );
  }

  if (isAdmin === false) {
    return (
      <>
        <Seo title="Backdated Attendance" />
        <Pageheader currentpage="Backdated Attendance" activepage="Settings" mainpage="Attendance" />
        <div className="box">
          <div className="box-body text-center py-12">
            <i className="ri-error-warning-line text-5xl text-danger mb-4" />
            <h3 className="text-xl font-semibold mb-2">Access Denied</h3>
            <p className="text-defaulttextcolor/80">Only administrators can view and manage backdated attendance requests.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Seo title="Backdated Attendance" />
      <Pageheader currentpage="Backdated Attendance" activepage="Settings" mainpage="Attendance" />
      <div className="space-y-6 mt-3">
        <div className="box">
          <div className="box-header flex items-center justify-between">
            <div className="box-title">Add Backdated Attendance (Admin)</div>
            {!showAddSection ? (
              <button type="button" onClick={openAddSection} className="ti-btn ti-btn-primary !py-1.5 !px-3">
                <i className="ri-add-line me-1" />
                Add for Student
              </button>
            ) : (
              <button type="button" onClick={() => setShowAddSection(false)} className="ti-btn ti-btn-light !py-1.5 !px-3">
                Cancel
              </button>
            )}
          </div>
          {showAddSection && (
            <div className="box-body border-t border-defaultborder pt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-defaulttextcolor mb-2">Student *</label>
                <select
                  value={addStudentId}
                  onChange={(e) => setAddStudentId(e.target.value)}
                  className="ti-form-input w-full"
                  required
                >
                  <option value="">Select student who needs backdated attendance</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.user?.name ?? "Unknown"} ({s.user?.email ?? ""})
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg text-sm text-defaulttextcolor">
                <i className="ri-information-line me-2 text-primary" />
                Add entries for past dates. Each entry requires date, punch-in, and punch-out time.
              </div>
              {addEntries.map((entry, index) => (
                <div key={index} className="p-4 border border-defaultborder rounded-lg bg-black/5 dark:bg-white/5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-defaulttextcolor">Entry {index + 1}</span>
                    {addEntries.length > 1 && (
                      <button type="button" onClick={() => removeAddEntry(index)} className="text-danger hover:opacity-80" title="Remove">
                        <i className="ri-delete-bin-line text-lg" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-defaulttextcolor mb-1">Date *</label>
                      <input
                        type="date"
                        value={entry.date}
                        max={new Date().toISOString().slice(0, 10)}
                        onChange={(e) => updateAddEntry(index, "date", e.target.value)}
                        className="ti-form-input w-full !py-1.5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-defaulttextcolor mb-1">Timezone</label>
                      <div className="w-full px-3 py-2 border border-defaultborder rounded bg-black/5 dark:bg-white/5 text-defaulttextcolor text-sm">{entry.timezone}</div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-defaulttextcolor mb-1">Punch In *</label>
                      <input
                        type="time"
                        value={entry.punchInTime}
                        onChange={(e) => updateAddEntry(index, "punchInTime", e.target.value)}
                        className="ti-form-input w-full !py-1.5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-defaulttextcolor mb-1">Punch Out *</label>
                      <input
                        type="time"
                        value={entry.punchOutTime}
                        onChange={(e) => updateAddEntry(index, "punchOutTime", e.target.value)}
                        className="ti-form-input w-full !py-1.5"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-defaulttextcolor mb-1">Notes (optional)</label>
                      <input
                        type="text"
                        value={entry.notes}
                        onChange={(e) => updateAddEntry(index, "notes", e.target.value)}
                        placeholder="Notes for this entry"
                        className="ti-form-input w-full !py-1.5"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex gap-2">
                <button type="button" onClick={addAddEntry} className="ti-btn ti-btn-light !py-1.5 !px-3">
                  <i className="ri-add-line me-1" />
                  Add Another Entry
                </button>
                <button type="button" onClick={handleSubmitAddBackdated} className="ti-btn ti-btn-primary" disabled={addingBackDate}>
                  {addingBackDate ? "Adding…" : "Add Attendance"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="box">
          <div className="box-header">
            <div className="box-title">Filters</div>
          </div>
          <div className="box-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-defaulttextcolor mb-2">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value as typeof filterStatus);
                    setPagination((p) => ({ ...p, page: 1 }));
                  }}
                  className="ti-form-input w-full"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-defaulttextcolor mb-2">Student</label>
                <select
                  value={filterStudent}
                  onChange={(e) => {
                    setFilterStudent(e.target.value);
                    setPagination((p) => ({ ...p, page: 1 }));
                  }}
                  className="ti-form-input w-full"
                >
                  <option value="all">All Students</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.user?.name ?? "Unknown"} ({s.user?.email ?? ""})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="box">
          <div className="box-header flex items-center justify-between">
            <div className="box-title">
              Backdated Attendance Requests
              {pagination.totalResults > 0 && (
                <span className="ml-2 text-sm font-normal text-defaulttextcolor/70">({pagination.totalResults} total)</span>
              )}
            </div>
          </div>
          <div className="box-body">
            {loadingRequests ? (
              <div className="text-center py-12">
                <i className="ri-loader-4-line animate-spin text-4xl text-primary mb-4" />
                <p className="text-defaulttextcolor">Loading requests...</p>
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-12">
                <i className="ri-inbox-line text-5xl text-defaulttextcolor/50 mb-4" />
                <p className="text-defaulttextcolor">No requests found</p>
                {(filterStatus !== "all" || filterStudent !== "all") && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterStatus("all");
                      setFilterStudent("all");
                      setPagination((p) => ({ ...p, page: 1 }));
                    }}
                    className="mt-2 text-primary hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {requests.map((request) => {
                    const statusBadge = getStatusBadge(request.status);
                    const reqId = request._id ?? (request as { id?: string }).id;
                    const entries = getEntries(request);
                    return (
                      <div
                        key={reqId}
                        className={`p-4 border rounded-lg ${request.status === "pending" ? "border-warning/40 bg-warning/5" : "border-defaultborder"}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-3">
                              <span className={`px-2 py-1 rounded text-xs font-medium border ${statusBadge.color}`}>
                                <i className={`${statusBadge.icon} me-1`} />
                                {statusBadge.label}
                              </span>
                            </div>
                            <p className="text-sm text-defaulttextcolor/80 mb-2"><strong>Student:</strong> {getStudentName(request)}</p>
                            {entries.length > 1 && (
                              <p className="text-sm text-defaulttextcolor/80 mb-2"><strong>Total Dates:</strong> {entries.length}</p>
                            )}
                            <div className="space-y-3 mb-2">
                              {entries.map((entry, idx) => (
                                <div key={idx} className="p-3 bg-black/5 dark:bg-white/5 rounded border border-defaultborder">
                                  <p className="text-sm"><strong>Date {entries.length > 1 ? `${idx + 1}:` : ""}</strong> {formatDate(entry.date)}</p>
                                  <p className="text-sm"><strong>Punch In:</strong> {formatDateTime(entry.punchIn)}</p>
                                  {entry.punchOut ? (
                                    <p className="text-sm"><strong>Punch Out:</strong> {formatDateTime(entry.punchOut)}</p>
                                  ) : (
                                    <p className="text-sm"><strong>Punch Out:</strong> Not provided</p>
                                  )}
                                  {entry.timezone && <p className="text-sm"><strong>Timezone:</strong> {entry.timezone}</p>}
                                </div>
                              ))}
                            </div>
                            {request.notes && <p className="text-sm text-defaulttextcolor/80 mb-1"><strong>Notes:</strong> {request.notes}</p>}
                            {request.adminComment && <p className="text-sm text-defaulttextcolor/80 mb-1"><strong>Admin Comment:</strong> {request.adminComment}</p>}
                            <div className="flex flex-wrap gap-4 text-xs text-defaulttextcolor/60 mt-2">
                              <span><i className="ri-calendar-line me-1" />Requested: {formatDateTime(request.createdAt)}</span>
                              {request.reviewedAt && <span><i className="ri-time-line me-1" />Reviewed: {formatDateTime(request.reviewedAt)}</span>}
                              {request.reviewedBy?.name && <span><i className="ri-user-line me-1" />By: {request.reviewedBy.name}</span>}
                            </div>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            {request.status === "pending" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleUpdate(request)}
                                  disabled={processingId === reqId}
                                  className="btn btn-sm bg-info text-white hover:bg-info/90 disabled:opacity-50"
                                >
                                  {processingId === reqId ? <i className="ri-loader-4-line animate-spin" /> : <><i className="ri-edit-line me-1" />Update</>}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleApprove(request)}
                                  disabled={processingId === reqId}
                                  className="btn btn-sm bg-success text-white hover:bg-success/90 disabled:opacity-50"
                                >
                                  {processingId === reqId ? <i className="ri-loader-4-line animate-spin" /> : <><i className="ri-checkbox-circle-line me-1" />Approve</>}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleReject(request)}
                                  disabled={processingId === reqId}
                                  className="btn btn-sm bg-danger text-white hover:bg-danger/90 disabled:opacity-50"
                                >
                                  {processingId === reqId ? <i className="ri-loader-4-line animate-spin" /> : <><i className="ri-close-circle-line me-1" />Reject</>}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCancel(request)}
                                  disabled={processingId === reqId}
                                  className="btn btn-sm bg-default border border-defaultborder text-defaulttextcolor hover:bg-black/5 disabled:opacity-50"
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-defaultborder">
                    <span className="text-sm text-defaulttextcolor/80">Page {pagination.page} of {pagination.totalPages}</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
                        disabled={pagination.page === 1 || loadingRequests}
                        className="btn btn-sm border border-defaultborder disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={() => setPagination((p) => ({ ...p, page: Math.min(p.totalPages, p.page + 1) }))}
                        disabled={pagination.page === pagination.totalPages || loadingRequests}
                        className="btn btn-sm border border-defaultborder disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="box">
          <div className="box-header">
            <div className="box-title"><i className="ri-information-line me-2 text-primary" />About Backdated Attendance</div>
          </div>
          <div className="box-body">
            <ul className="space-y-2 text-sm text-defaulttextcolor/80">
              <li><i className="ri-checkbox-circle-line text-primary me-2" />Students submit backdated attendance requests for past dates.</li>
              <li><i className="ri-checkbox-circle-line text-primary me-2" /><strong>Update:</strong> Modify date, times, timezone, or notes before approval.</li>
              <li><i className="ri-checkbox-circle-line text-primary me-2" /><strong>Approve:</strong> Creates/updates attendance records in the student&apos;s calendar.</li>
              <li><i className="ri-checkbox-circle-line text-primary me-2" /><strong>Reject:</strong> No attendance is created. You can add a comment.</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
