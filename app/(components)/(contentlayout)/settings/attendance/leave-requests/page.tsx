"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  getAllLeaveRequests,
  approveLeaveRequest,
  rejectLeaveRequest,
  cancelLeaveRequest,
  type LeaveRequest,
} from "@/shared/lib/api/leave-requests";
import { listStudents, type Student } from "@/shared/lib/api/students";
import Seo from "@/shared/layout-components/seo/seo";
import Swal from "sweetalert2";
import { useAuth } from "@/shared/contexts/auth-context";
import * as rolesApi from "@/shared/lib/api/roles";
import type { Role } from "@/shared/lib/types";

function getStudentName(request: LeaveRequest, studentsList: Student[] = []): string {
  const s = request.student;
  if (typeof s === "object" && s?.user?.name) return s.user.name;
  if (typeof s === "object" && (s as { fullName?: string }).fullName) return (s as { fullName: string }).fullName;
  if (request.requestedBy?.name) return request.requestedBy.name;
  if (request.studentEmail?.trim()) {
    const local = request.studentEmail.split("@")[0];
    if (local) return local.replace(/[._]/g, " ").trim() || request.studentEmail;
  }
  const studentId = typeof s === "object" && s != null
    ? (s as { _id?: string; id?: string })._id ?? (s as { _id?: string; id?: string }).id
    : typeof s === "string"
      ? s
      : "";
  if (studentId && studentsList.length > 0) {
    const student = studentsList.find(
      (st) => String((st as { id?: string }).id ?? (st as { _id?: string })._id) === String(studentId)
    );
    if (student?.user?.name) return student.user.name;
  }
  return "Unknown";
}

function getStudentEmail(request: LeaveRequest): string {
  const s = request.student;
  if (!s) return request.studentEmail ?? "";
  if (typeof s === "object" && s.user?.email) return s.user.email;
  return request.studentEmail ?? "";
}

export default function SettingsAttendanceLeaveRequestsPage() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected" | "cancelled">("pending");
  const [filterLeaveType, setFilterLeaveType] = useState<"all" | "casual" | "sick" | "unpaid">("all");
  const [filterStudent, setFilterStudent] = useState<string>("all");
  const [students, setStudents] = useState<Student[]>([]);
  const [filterStudentSearch, setFilterStudentSearch] = useState("");
  const [filterStudentOpen, setFilterStudentOpen] = useState(false);
  const filterStudentDropdownRef = useRef<HTMLDivElement>(null);

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1,
    totalResults: 0,
  });

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

  const fetchLeaveRequests = useCallback(async () => {
    if (isAdmin === false) return;
    setLoadingRequests(true);
    try {
      const params: Record<string, string | number> = {
        limit: pagination.limit,
        page: pagination.page,
        sortBy: "createdAt:desc",
      };
      if (filterStatus !== "all") params.status = filterStatus;
      if (filterLeaveType !== "all") params.leaveType = filterLeaveType;
      if (filterStudent !== "all") params.student = filterStudent;

      const result = await getAllLeaveRequests(params);
      const results = result?.results ?? [];
      setLeaveRequests(results.map((r: LeaveRequest) => ({ ...r, _id: (r._id || (r as { id?: string }).id) ?? "" })).filter((r) => r._id));
      setPagination({
        page: result?.page ?? pagination.page,
        limit: result?.limit ?? pagination.limit,
        totalPages: result?.totalPages ?? 1,
        totalResults: result?.totalResults ?? 0,
      });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ?? (err as { message?: string })?.message ?? "Failed to load leave requests";
      await Swal.fire({ icon: "error", title: "Error", text: msg, confirmButtonText: "OK" });
    } finally {
      setLoadingRequests(false);
      setLoading(false);
    }
  }, [isAdmin, filterStatus, filterLeaveType, filterStudent, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchLeaveRequests();
  }, [fetchLeaveRequests]);

  const sortedStudents = useMemo(
    () => [...students].sort((a, b) => (a.user?.name ?? "").localeCompare(b.user?.name ?? "", undefined, { sensitivity: "base" })),
    [students]
  );
  const filteredStudentsForFilter = useMemo(() => {
    const q = filterStudentSearch.trim().toLowerCase();
    if (!q) return sortedStudents;
    return sortedStudents.filter(
      (s) =>
        (s.user?.name ?? "").toLowerCase().includes(q) ||
        (s.user?.email ?? "").toLowerCase().includes(q)
    );
  }, [sortedStudents, filterStudentSearch]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterStudentDropdownRef.current && !filterStudentDropdownRef.current.contains(e.target as Node)) {
        setFilterStudentOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatDate = (dateString: string | undefined | null) => {
    if (dateString == null || dateString === "") return "—";
    try {
      const d = new Date(dateString);
      if (Number.isNaN(d.getTime())) return "—";
      return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return "—";
    }
  };

  const formatDates = (dates: string[]) => dates.map(formatDate).join(", ");

  const handleApprove = async (request: LeaveRequest) => {
    const requestId = request._id ?? (request as { id?: string }).id;
    if (!requestId) {
      await Swal.fire({ icon: "error", title: "Error", text: "Invalid leave request ID.", confirmButtonText: "OK" });
      return;
    }
    const { value: adminComment } = await Swal.fire({
      title: "Approve Leave Request",
      html: `
        <div class="text-left mb-4">
          <p><strong>Student:</strong> ${getStudentName(request, students)}</p>
          <p><strong>Leave Type:</strong> ${request.leaveType === "casual" ? "Casual Leave" : request.leaveType === "sick" ? "Sick Leave" : "Unpaid Leave"}</p>
          <p><strong>Dates:</strong> ${formatDates(request.dates)}</p>
          <p><strong>Total Days:</strong> ${request.dates.length}</p>
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
      await approveLeaveRequest(requestId, adminComment || undefined);
      await Swal.fire({
        icon: "success",
        title: "Approved",
        html: "<p>Leave request approved. Leave has been assigned to the student's attendance calendar.</p>",
        confirmButtonText: "OK",
      });
      await fetchLeaveRequests();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ?? (err as { message?: string })?.message ?? "Failed to approve.";
      const alreadyProcessed = typeof msg === "string" && (msg.includes("Current status is") || msg.includes("already been"));
      if (alreadyProcessed) {
        await Swal.fire({ icon: "info", title: "Already processed", text: "This leave request was already approved or rejected. The list will refresh.", confirmButtonText: "OK" });
        await fetchLeaveRequests();
      } else {
        await Swal.fire({ icon: "error", title: "Error", text: msg, confirmButtonText: "OK" });
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (request: LeaveRequest) => {
    const requestId = request._id ?? (request as { id?: string }).id;
    if (!requestId) {
      await Swal.fire({ icon: "error", title: "Error", text: "Invalid leave request ID.", confirmButtonText: "OK" });
      return;
    }
    const { value: adminComment } = await Swal.fire({
      title: "Reject Leave Request",
      html: `
        <div class="text-left mb-4">
          <p><strong>Student:</strong> ${getStudentName(request, students)}</p>
          <p><strong>Leave Type:</strong> ${request.leaveType === "casual" ? "Casual Leave" : request.leaveType === "sick" ? "Sick Leave" : "Unpaid Leave"}</p>
          <p><strong>Dates:</strong> ${formatDates(request.dates)}</p>
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
      await rejectLeaveRequest(requestId, adminComment || undefined);
      await Swal.fire({ icon: "success", title: "Rejected", text: "Leave request rejected.", confirmButtonText: "OK" });
      await fetchLeaveRequests();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ?? (err as { message?: string })?.message ?? "Failed to reject.";
      const alreadyProcessed = typeof msg === "string" && (msg.includes("Current status is") || msg.includes("already been"));
      if (alreadyProcessed) {
        await Swal.fire({ icon: "info", title: "Already processed", text: "This leave request was already rejected or approved. The list will refresh.", confirmButtonText: "OK" });
        await fetchLeaveRequests();
      } else {
        await Swal.fire({ icon: "error", title: "Error", text: msg, confirmButtonText: "OK" });
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancel = async (request: LeaveRequest) => {
    const requestId = request._id ?? (request as { id?: string }).id;
    if (!requestId) return;
    const { isConfirmed } = await Swal.fire({
      title: "Cancel Leave Request?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Cancel Request",
      confirmButtonColor: "#6c757d",
    });
    if (!isConfirmed) return;
    setProcessingId(requestId);
    try {
      await cancelLeaveRequest(requestId);
      await Swal.fire({ icon: "success", title: "Cancelled", text: "Leave request cancelled.", confirmButtonText: "OK" });
      await fetchLeaveRequests();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ?? (err as { message?: string })?.message ?? "Failed to cancel.";
      await Swal.fire({ icon: "error", title: "Error", text: msg, confirmButtonText: "OK" });
    } finally {
      setProcessingId(null);
    }
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

  const getLeaveTypeConfig = (type: string) => {
    const config: Record<string, { badge: string; label: string }> = {
      casual: { badge: "bg-sky-50 dark:bg-sky-500/15 text-sky-800 dark:text-sky-200 border border-sky-200/60 dark:border-sky-500/30", label: "Casual" },
      sick: { badge: "bg-orange-50 dark:bg-orange-500/15 text-orange-800 dark:text-orange-200 border border-orange-200/60 dark:border-orange-500/30", label: "Sick" },
      unpaid: { badge: "bg-violet-50 dark:bg-violet-500/15 text-violet-800 dark:text-violet-200 border border-violet-200/60 dark:border-violet-500/30", label: "Unpaid" },
    };
    return config[type] ?? { badge: "bg-defaultborder/30 text-defaulttextcolor/80 border border-defaultborder", label: type };
  };

  if (isAdmin === null || (isAdmin === true && loading && leaveRequests.length === 0)) {
    return (
      <>
        <Seo title="Leave Requests" />
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
        <Seo title="Leave Requests" />
        <div className="box">
          <div className="box-body text-center py-12">
            <i className="ri-error-warning-line text-5xl text-danger mb-4" />
            <h3 className="text-xl font-semibold mb-2">Access Denied</h3>
            <p className="text-defaulttextcolor/80">Only administrators can view and manage leave requests.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Seo title="Leave Requests" />
      <style>{`
        @keyframes leave-card-enter {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .leave-card-enter {
          animation: leave-card-enter 0.4s ease-out forwards;
        }
      `}</style>
      <div className="relative mt-4 space-y-6 min-h-[50vh] w-full">
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_100%_60%_at_50%_-15%,rgba(99,102,241,0.07),transparent_50%)] dark:bg-[radial-gradient(ellipse_100%_60%_at_50%_-15%,rgba(99,102,241,0.12),transparent_50%)]" aria-hidden />
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(to_bottom,rgba(248,250,252,0.6),transparent_30%)] dark:bg-[linear-gradient(to_bottom,rgba(15,23,42,0.4),transparent_30%)]" aria-hidden />

        <section className="rounded-2xl border border-defaultborder/70 bg-white dark:bg-bodybg shadow-sm shadow-black/[0.03] dark:shadow-none overflow-hidden transition-shadow duration-300 hover:shadow-md hover:shadow-black/[0.04] dark:hover:shadow-none">
          <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-defaultborder/50 bg-gradient-to-r from-slate-50/90 to-white dark:from-white/[0.03] dark:to-transparent">
            <div className="flex items-center gap-4 min-w-0">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/10 dark:ring-primary/20" aria-hidden>
                <i className="ri-file-list-3-line text-2xl" />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-defaulttextcolor dark:text-white tracking-tight">Leave Requests</h2>
                <p className="text-xs text-defaulttextcolor/60 dark:text-white/50 mt-0.5">Review and approve student leave requests</p>
              </div>
              {pagination.totalResults > 0 && (
                <span className="inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-full bg-primary/15 px-2.5 text-xs font-semibold text-primary ring-1 ring-primary/20">
                  {pagination.totalResults}
                </span>
              )}
            </div>
          </div>
          <div className="px-6 py-6 border-t border-defaultborder/50 space-y-5 bg-gradient-to-b from-slate-50/50 to-transparent dark:from-white/[0.02] dark:to-transparent">
            <p className="text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/60">Filters</p>
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 p-1">
                {(["all", "pending", "approved", "rejected", "cancelled"] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => {
                      setFilterStatus(status);
                      setPagination((p) => ({ ...p, page: 1 }));
                    }}
                    className={`inline-flex items-center px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 shrink-0 ${filterStatus === status ? "bg-primary text-white shadow-sm" : "text-defaulttextcolor hover:text-primary"}`}
                  >
                    {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
              <div className="inline-flex rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 p-1">
                {(["all", "casual", "sick", "unpaid"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setFilterLeaveType(type);
                      setPagination((p) => ({ ...p, page: 1 }));
                    }}
                    className={`inline-flex items-center px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 shrink-0 ${filterLeaveType === type ? "bg-primary text-white shadow-sm" : "text-defaulttextcolor hover:text-primary"}`}
                  >
                    {type === "all" ? "All types" : type === "casual" ? "Casual" : type === "sick" ? "Sick" : "Unpaid"}
                  </button>
                ))}
              </div>
              <div ref={filterStudentDropdownRef} className="relative inline-block min-w-[220px]">
                <button
                  type="button"
                  onClick={() => { setFilterStudentOpen((o) => !o); if (!filterStudentOpen) setFilterStudentSearch(""); }}
                  className="flex w-full items-center justify-between gap-2 rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-defaulttextcolor transition-all duration-150 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 hover:border-defaulttextcolor/50"
                  aria-expanded={filterStudentOpen}
                  aria-haspopup="listbox"
                >
                  <span className="truncate">
                    {filterStudent === "all"
                      ? "All Students"
                      : (() => {
                          const s = students.find((x) => x.id === filterStudent);
                          return s?.user?.name ?? "Unknown";
                        })()}
                  </span>
                  <i className={`ri-arrow-down-s-line text-xl text-defaulttextcolor/50 shrink-0 transition-transform duration-200 ${filterStudentOpen ? "rotate-180" : ""}`} />
                </button>
                {filterStudentOpen && (
                  <div className="absolute left-0 top-full z-20 mt-2 w-full min-w-[360px] max-w-[min(420px,90vw)] rounded-xl border border-defaultborder bg-white dark:bg-bodybg shadow-xl shadow-black/10 dark:shadow-black/30 overflow-hidden ring-1 ring-black/5 dark:ring-white/5">
                    <div className="p-2.5 border-b border-defaultborder/50 bg-slate-50/80 dark:bg-white/5">
                      <div className="relative">
                        <i className="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-base text-defaulttextcolor/40 pointer-events-none" aria-hidden />
                        <input
                          type="text"
                          value={filterStudentSearch}
                          onChange={(e) => setFilterStudentSearch(e.target.value)}
                          placeholder="Search student…"
                          className="w-full rounded-lg border border-defaultborder/80 bg-white dark:bg-white/5 pl-10 pr-9 py-2.5 text-sm text-defaulttextcolor placeholder:text-defaulttextcolor/45 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-150"
                          autoFocus
                        />
                        {filterStudentSearch && (
                          <button
                            type="button"
                            onClick={() => setFilterStudentSearch("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-defaulttextcolor/50 hover:text-defaulttextcolor hover:bg-defaultborder/30 transition-colors"
                            aria-label="Clear search"
                          >
                            <i className="ri-close-line text-lg" />
                          </button>
                        )}
                      </div>
                    </div>
                    <ul className="max-h-60 overflow-y-auto py-1.5" role="listbox">
                      <li
                        role="option"
                        aria-selected={filterStudent === "all"}
                        onClick={() => {
                          setFilterStudent("all");
                          setPagination((p) => ({ ...p, page: 1 }));
                          setFilterStudentOpen(false);
                          setFilterStudentSearch("");
                        }}
                        className={`cursor-pointer px-4 py-2.5 text-sm transition-colors duration-150 hover:bg-primary/10 ${filterStudent === "all" ? "bg-primary/10 text-primary font-medium" : "text-defaulttextcolor"}`}
                      >
                        All Students
                      </li>
                      {filteredStudentsForFilter.length === 0 ? (
                        <li className="px-4 py-4 text-sm text-defaulttextcolor/60 text-center">No students match</li>
                      ) : (
                        filteredStudentsForFilter.map((s) => (
                          <li
                            key={s.id}
                            role="option"
                            aria-selected={filterStudent === s.id}
                            onClick={() => {
                              setFilterStudent(s.id);
                              setPagination((p) => ({ ...p, page: 1 }));
                              setFilterStudentOpen(false);
                              setFilterStudentSearch("");
                            }}
                            className={`cursor-pointer px-4 py-2.5 text-sm transition-colors duration-150 hover:bg-primary/10 break-words min-w-0 ${filterStudent === s.id ? "bg-primary/10 text-primary font-medium" : "text-defaulttextcolor"}`}
                          >
                            <span className="font-medium">{s.user?.name ?? "Unknown"}</span>
                            {s.user?.email && <span className="text-defaulttextcolor/60 ml-1 break-all">({s.user.email})</span>}
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div>
            {loadingRequests ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4 ring-1 ring-primary/10">
                  <i className="ri-loader-4-line animate-spin text-3xl" />
                </div>
                <p className="text-sm font-medium text-defaulttextcolor/80">Loading leave requests…</p>
                <p className="mt-1 text-xs text-defaulttextcolor/50">This may take a moment</p>
              </div>
            ) : leaveRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/10 dark:ring-primary/20">
                  <i className="ri-calendar-todo-line text-4xl" />
                </div>
                <p className="mt-4 text-base font-semibold text-defaulttextcolor">No leave requests found</p>
                <p className="mt-1 max-w-sm text-sm text-defaulttextcolor/60">
                  {(filterStatus !== "all" || filterLeaveType !== "all" || filterStudent !== "all")
                    ? "Try changing filters to see more results."
                    : "Leave requests will appear here when students submit them."}
                </p>
                {(filterStatus !== "all" || filterLeaveType !== "all" || filterStudent !== "all") && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterStatus("all");
                      setFilterLeaveType("all");
                      setFilterStudent("all");
                      setPagination((p) => ({ ...p, page: 1 }));
                    }}
                    className="mt-4 rounded-xl border border-defaultborder/80 px-4 py-2.5 text-sm font-medium text-defaulttextcolor hover:bg-defaultborder/20 dark:hover:bg-white/5 transition-colors"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-5">
                  {leaveRequests.map((request, index) => {
                    const statusConfig = getStatusConfig(request.status);
                    const typeConfig = getLeaveTypeConfig(request.leaveType);
                    const reqId = request._id ?? (request as { id?: string }).id;
                    const isProcessing = processingId === reqId;
                    return (
                      <article
                        key={reqId}
                        style={{ animationDelay: `${index * 60}ms` }}
                        className={`
                          leave-card-enter relative overflow-hidden rounded-xl border border-defaultborder bg-white dark:bg-bodybg
                          border-l-4 shadow-sm opacity-0
                          transition-all duration-300 ease-out
                          hover:shadow-lg hover:-translate-y-0.5
                          ${statusConfig.accent}
                        `}
                      >
                        <div className="p-5 sm:p-6">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex-1 min-w-0 space-y-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.badge}`}>
                                  <i className={`${statusConfig.icon} text-[0.9em]`} />
                                  {statusConfig.label}
                                </span>
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${typeConfig.badge}`}>
                                  {typeConfig.label}
                                </span>
                                {request.dates.length > 1 && (
                                  <span className="text-xs text-defaulttextcolor/60 font-medium">
                                    {request.dates.length} days
                                  </span>
                                )}
                              </div>

                              <div>
                                <p className="text-sm font-semibold text-defaulttextcolor tracking-tight">
                                  {getStudentName(request, students)}
                                </p>
                                <p className="text-xs text-defaulttextcolor/60 mt-0.5">{getStudentEmail(request) || "Student"}</p>
                              </div>

                              <div className="rounded-lg bg-defaultborder/10 dark:bg-white/5 border border-defaultborder/50 overflow-hidden">
                                <dl className="divide-y divide-defaultborder/50">
                                  <div className="px-4 py-3 sm:grid sm:grid-cols-[auto_1fr] sm:gap-x-4 sm:gap-y-1">
                                    <dt className="text-xs font-medium text-defaulttextcolor/70 mt-1 sm:mt-0">Dates</dt>
                                    <dd className="text-sm text-defaulttextcolor mt-0.5 sm:mt-0">
                                      {formatDates(request.dates)}
                                    </dd>
                                  </div>
                                  <div className="px-4 py-3 sm:grid sm:grid-cols-[auto_1fr] sm:gap-x-4 sm:gap-y-1">
                                    <dt className="text-xs font-medium text-defaulttextcolor/70 mt-1 sm:mt-0">Total</dt>
                                    <dd className="text-sm text-defaulttextcolor mt-0.5 sm:mt-0">{request.dates.length} day{request.dates.length !== 1 ? "s" : ""}</dd>
                                  </div>
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
                                  Requested {formatDate(request.createdAt)}
                                </span>
                                {request.reviewedAt && (
                                  <span className="inline-flex items-center gap-1">
                                    <i className="ri-time-line" />
                                    Reviewed {formatDate(request.reviewedAt)}
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

                            {request.status === "pending" && (
                              <div className="flex flex-wrap gap-2 shrink-0 sm:flex-col sm:items-end">
                                <div className="flex gap-2" role="group" aria-label="Primary actions">
                                  <button
                                    type="button"
                                    onClick={() => handleApprove(request)}
                                    disabled={isProcessing}
                                    className="
                                      inline-flex items-center justify-center gap-2 min-h-[2.25rem] px-4 rounded-lg
                                      bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-medium
                                      shadow-sm hover:shadow transition-all duration-150
                                      disabled:opacity-50 disabled:pointer-events-none
                                    "
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
                                    className="
                                      inline-flex items-center justify-center gap-2 min-h-[2.25rem] px-4 rounded-lg
                                      bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-sm font-medium
                                      shadow-sm hover:shadow transition-all duration-150
                                      disabled:opacity-50 disabled:pointer-events-none
                                    "
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
                                    onClick={() => handleCancel(request)}
                                    disabled={isProcessing}
                                    className="
                                      inline-flex items-center justify-center gap-2 min-h-[2.25rem] px-3.5 rounded-lg
                                      text-defaulttextcolor/80 hover:text-defaulttextcolor hover:bg-defaultborder/30
                                      text-sm font-medium transition-colors duration-150
                                      disabled:opacity-50 disabled:pointer-events-none
                                    "
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
                    className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-defaultborder/50 pt-5"
                    aria-label="Pagination"
                  >
                    <p className="text-sm text-defaulttextcolor/70">
                      Page <span className="font-medium text-defaulttextcolor">{pagination.page}</span> of{" "}
                      <span className="font-medium text-defaulttextcolor">{pagination.totalPages}</span>
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
                        disabled={pagination.page === 1 || loadingRequests}
                        className="inline-flex items-center gap-2 rounded-xl border border-defaultborder/80 px-4 py-2.5 text-sm font-medium text-defaulttextcolor hover:bg-defaultborder/20 dark:hover:bg-white/5 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                      >
                        <i className="ri-arrow-left-s-line text-lg" />
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={() => setPagination((p) => ({ ...p, page: Math.min(p.totalPages, p.page + 1) }))}
                        disabled={pagination.page === pagination.totalPages || loadingRequests}
                        className="inline-flex items-center gap-2 rounded-xl border border-defaultborder/80 px-4 py-2.5 text-sm font-medium text-defaulttextcolor hover:bg-defaultborder/20 dark:hover:bg-white/5 disabled:opacity-50 disabled:pointer-events-none transition-colors"
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
          </div>
        </section>

        <section className="rounded-2xl border border-defaultborder/70 bg-white dark:bg-bodybg shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-defaultborder/50 bg-gradient-to-r from-slate-50/90 to-white dark:from-white/[0.03] dark:to-transparent">
            <div className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/10">
                <i className="ri-information-line text-xl" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-defaulttextcolor tracking-tight">About Leave Requests</h3>
                <ul className="mt-3 space-y-2.5 text-sm text-defaulttextcolor/85">
                  <li className="flex items-start gap-2.5">
                    <i className="ri-checkbox-circle-fill mt-0.5 text-emerald-500/90 shrink-0 text-base" />
                    <span>Students submit leave requests which appear here for review.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <i className="ri-check-double-line mt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0 text-base" />
                    <span><strong className="text-defaulttextcolor">Approve:</strong> Leave is assigned to the student&apos;s attendance calendar.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <i className="ri-close-circle-fill mt-0.5 text-rose-500/90 shrink-0 text-base" />
                    <span><strong className="text-defaulttextcolor">Reject:</strong> No leave is assigned. You can add a comment.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <i className="ri-filter-3-line mt-0.5 text-primary shrink-0 text-base" />
                    <span>Use filters to find requests by status, leave type, or student.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
