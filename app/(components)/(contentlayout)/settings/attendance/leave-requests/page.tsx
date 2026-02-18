"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  getAllLeaveRequests,
  approveLeaveRequest,
  rejectLeaveRequest,
  cancelLeaveRequest,
  type LeaveRequest,
} from "@/shared/lib/api/leave-requests";
import { listStudents, type Student } from "@/shared/lib/api/students";
import Pageheader from "@/shared/layout-components/page-header/pageheader";
import Seo from "@/shared/layout-components/seo/seo";
import Swal from "sweetalert2";
import { useAuth } from "@/shared/contexts/auth-context";
import * as rolesApi from "@/shared/lib/api/roles";
import type { Role } from "@/shared/lib/types";

function getStudentName(request: LeaveRequest): string {
  const s = request.student;
  if (!s) return "Unknown";
  if (typeof s === "object" && s.user?.name) return s.user.name;
  if (typeof s === "object" && (s as { fullName?: string }).fullName) return (s as { fullName: string }).fullName;
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
        setIsAdmin((user.roleIds as string[]).some((id) => map.get(id)?.name === "Administrator"));
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

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return dateString;
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
          <p><strong>Student:</strong> ${getStudentName(request)}</p>
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
      await Swal.fire({ icon: "error", title: "Error", text: msg, confirmButtonText: "OK" });
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
          <p><strong>Student:</strong> ${getStudentName(request)}</p>
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
      await Swal.fire({ icon: "error", title: "Error", text: msg, confirmButtonText: "OK" });
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

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; icon: string; label: string }> = {
      pending: { color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: "ri-time-line", label: "Pending" },
      approved: { color: "bg-green-100 text-green-800 border-green-200", icon: "ri-checkbox-circle-line", label: "Approved" },
      rejected: { color: "bg-red-100 text-red-800 border-red-200", icon: "ri-close-circle-line", label: "Rejected" },
      cancelled: { color: "bg-gray-100 text-gray-800 border-gray-200", icon: "ri-close-line", label: "Cancelled" },
    };
    return config[status] ?? config.pending;
  };

  const getLeaveTypeBadge = (type: string) => {
    const config: Record<string, { color: string; label: string }> = {
      casual: { color: "bg-blue-100 text-blue-800", label: "Casual Leave" },
      sick: { color: "bg-orange-100 text-orange-800", label: "Sick Leave" },
      unpaid: { color: "bg-purple-100 text-purple-800", label: "Unpaid Leave" },
    };
    return config[type] ?? { color: "bg-gray-100 text-gray-800", label: type };
  };

  if (isAdmin === null || (isAdmin === true && loading && leaveRequests.length === 0)) {
    return (
      <>
        <Seo title="Leave Requests" />
        <Pageheader currentpage="Leave Requests" activepage="Settings" mainpage="Attendance" />
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
        <Pageheader currentpage="Leave Requests" activepage="Settings" mainpage="Attendance" />
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
      <Pageheader currentpage="Leave Requests" activepage="Settings" mainpage="Attendance" />
      <div className="space-y-6 mt-3">
        <div className="box">
          <div className="box-header">
            <div className="box-title">Filters</div>
          </div>
          <div className="box-body">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <label className="block text-sm font-medium text-defaulttextcolor mb-2">Leave Type</label>
                <select
                  value={filterLeaveType}
                  onChange={(e) => {
                    setFilterLeaveType(e.target.value as typeof filterLeaveType);
                    setPagination((p) => ({ ...p, page: 1 }));
                  }}
                  className="ti-form-input w-full"
                >
                  <option value="all">All Types</option>
                  <option value="casual">Casual Leave</option>
                  <option value="sick">Sick Leave</option>
                  <option value="unpaid">Unpaid Leave</option>
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
              Leave Requests
              {pagination.totalResults > 0 && (
                <span className="ml-2 text-sm font-normal text-defaulttextcolor/70">({pagination.totalResults} total)</span>
              )}
            </div>
          </div>
          <div className="box-body">
            {loadingRequests ? (
              <div className="text-center py-12">
                <i className="ri-loader-4-line animate-spin text-4xl text-primary mb-4" />
                <p className="text-defaulttextcolor">Loading leave requests...</p>
              </div>
            ) : leaveRequests.length === 0 ? (
              <div className="text-center py-12">
                <i className="ri-inbox-line text-5xl text-defaulttextcolor/50 mb-4" />
                <p className="text-defaulttextcolor">No leave requests found</p>
                {(filterStatus !== "all" || filterLeaveType !== "all" || filterStudent !== "all") && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterStatus("all");
                      setFilterLeaveType("all");
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
                  {leaveRequests.map((request) => {
                    const statusBadge = getStatusBadge(request.status);
                    const typeBadge = getLeaveTypeBadge(request.leaveType);
                    const reqId = request._id ?? (request as { id?: string }).id;
                    return (
                      <div
                        key={reqId}
                        className={`p-4 border rounded-lg ${
                          request.status === "pending" ? "border-warning/40 bg-warning/5" : "border-defaultborder"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                              <span className={`px-2 py-1 rounded text-xs font-medium border ${statusBadge.color}`}>
                                <i className={`${statusBadge.icon} me-1`} />
                                {statusBadge.label}
                              </span>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${typeBadge.color}`}>
                                {typeBadge.label}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
                              <div>
                                <p className="text-sm text-defaulttextcolor/80"><strong>Student:</strong> {getStudentName(request)}</p>
                                <p className="text-sm text-defaulttextcolor/80"><strong>Email:</strong> {getStudentEmail(request)}</p>
                              </div>
                              <div>
                                <p className="text-sm text-defaulttextcolor/80"><strong>Dates:</strong> {formatDates(request.dates)}</p>
                                <p className="text-sm text-defaulttextcolor/80"><strong>Total Days:</strong> {request.dates.length}</p>
                              </div>
                            </div>
                            {request.notes && (
                              <p className="text-sm text-defaulttextcolor/80 mb-1"><strong>Notes:</strong> {request.notes}</p>
                            )}
                            {request.adminComment && (
                              <p className="text-sm text-defaulttextcolor/80 mb-1"><strong>Admin Comment:</strong> {request.adminComment}</p>
                            )}
                            <div className="flex flex-wrap gap-4 text-xs text-defaulttextcolor/60 mt-2">
                              <span><i className="ri-calendar-line me-1" />Requested: {formatDate(request.createdAt)}</span>
                              {request.reviewedAt && (
                                <span><i className="ri-time-line me-1" />Reviewed: {formatDate(request.reviewedAt)}</span>
                              )}
                              {request.reviewedBy?.name && (
                                <span><i className="ri-user-line me-1" />By: {request.reviewedBy.name}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            {request.status === "pending" && (
                              <>
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
            <div className="box-title"><i className="ri-information-line me-2 text-primary" />About Leave Requests</div>
          </div>
          <div className="box-body">
            <ul className="space-y-2 text-sm text-defaulttextcolor/80">
              <li><i className="ri-checkbox-circle-line text-primary me-2" />Students submit leave requests which appear here for review.</li>
              <li><i className="ri-checkbox-circle-line text-primary me-2" /><strong>Approve:</strong> Leave is assigned to the student&apos;s attendance calendar.</li>
              <li><i className="ri-checkbox-circle-line text-primary me-2" /><strong>Reject:</strong> No leave is assigned. You can add a comment.</li>
              <li><i className="ri-checkbox-circle-line text-primary me-2" />Use filters to find requests by status, leave type, or student.</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
