"use client";

import React, { useEffect, useState, useCallback } from "react";
import { listStudents, type Student } from "@/shared/lib/api/students";
import { getAllHolidays, type Holiday } from "@/shared/lib/api/holidays";
import {
  assignHolidaysToStudents,
  removeHolidaysFromStudents,
} from "@/shared/lib/api/attendance";
import {
  getAllStudentGroups,
  assignHolidaysToGroup,
  removeHolidaysFromGroup,
  type StudentGroup,
} from "@/shared/lib/api/student-groups";
import Seo from "@/shared/layout-components/seo/seo";
import Swal from "sweetalert2";
import dynamic from "next/dynamic";
import { useAuth } from "@/shared/contexts/auth-context";
import * as rolesApi from "@/shared/lib/api/roles";
import type { Role } from "@/shared/lib/types";

const Select = dynamic(() => import("react-select"), { ssr: false });

type StudentOption = { value: string; label: string; student: Student };

const SELECT_ALL_STUDENTS_VALUE = "__all_students__";

type AssignmentMode = "individual" | "group";

export default function SettingsAttendanceAssignHolidaysPage() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [assignmentMode, setAssignmentMode] = useState<AssignmentMode>("individual");
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<StudentOption[]>([]);
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [selectedHolidays, setSelectedHolidays] = useState<{ value: string; label: string; holiday: Holiday }[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingHolidays, setLoadingHolidays] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assignmentResult, setAssignmentResult] = useState<{
    candidatesUpdated: number;
    holidaysAdded?: number;
    attendanceRecordsCreated?: number;
    skipped?: { studentName: string; holidayTitle: string; date: string; reason: string }[];
  } | null>(null);
  const [removalResult, setRemovalResult] = useState<{
    candidatesUpdated: number;
    holidaysRemoved?: number;
    attendanceRecordsDeleted?: number;
    skipped?: { studentName: string; holidayTitle: string; date: string; reason: string }[];
  } | null>(null);
  const [groupAssignmentResult, setGroupAssignmentResult] = useState<{
    candidatesUpdated?: number;
    holidaysAdded?: number;
    attendanceRecordsCreated?: number;
  } | null>(null);
  const [groupRemovalResult, setGroupRemovalResult] = useState<{
    candidatesUpdated?: number;
    holidaysRemoved?: number;
    attendanceRecordsDeleted?: number;
  } | null>(null);

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
        const hasAdmin = (user.roleIds as string[]).some((id) => {
          const name = roleMap.get(id)?.name;
          return name === "Administrator" || name === "Agent";
        });
        setIsAdmin(hasAdmin);
      } catch {
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, [user]);

  const fetchStudents = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingStudents(true);
    try {
      const res = await listStudents({ limit: 1000, sortBy: "user.name:asc" });
      const list = res.results ?? [];
      const options: StudentOption[] = list
        .map((s) => ({
          value: s.id,
          label: `${s.user?.name ?? "Unknown"} (${s.user?.email ?? "No email"})`,
          student: s,
        }))
        .filter((o) => o.value);
      setStudents(options);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Failed to fetch students");
    } finally {
      setLoadingStudents(false);
    }
  }, [isAdmin]);

  const fetchHolidays = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingHolidays(true);
    try {
      const response = await getAllHolidays({
        isActive: true,
        sortBy: "date:asc",
        limit: 1000,
      });
      const data = (response as { data?: { results?: Holiday[] } | Holiday[] }).data;
      const list = Array.isArray(data) ? data : data?.results ?? [];
      setHolidays(list);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Failed to fetch holidays");
    } finally {
      setLoadingHolidays(false);
    }
  }, [isAdmin]);

  const fetchGroups = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingGroups(true);
    try {
      const res = await getAllStudentGroups({ isActive: true, limit: 500, sortBy: "name:asc" });
      const list = res.data?.results ?? [];
      setGroups(list);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Failed to fetch groups");
    } finally {
      setLoadingGroups(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      setLoading(true);
      Promise.all([fetchStudents(), fetchHolidays()]).finally(() => setLoading(false));
    }
  }, [isAdmin, fetchStudents, fetchHolidays]);

  useEffect(() => {
    if (isAdmin && assignmentMode === "group") fetchGroups();
  }, [isAdmin, assignmentMode, fetchGroups]);

  // Auto-select holidays already assigned to selected students
  useEffect(() => {
    if (selectedStudents.length === 0 || holidays.length === 0) {
      setSelectedHolidays([]);
      return;
    }
    const studentHolidayIds = new Set<string>();
    selectedStudents.forEach((opt) => {
      (opt.student?.holidays ?? []).forEach((id) => {
        if (id) studentHolidayIds.add(String(id));
      });
    });
    if (studentHolidayIds.size === 0) {
      setSelectedHolidays([]);
      return;
    }
    const autoSelected = holidays
      .filter((h) => {
        const hid = String(h._id ?? h.id ?? "");
        return hid && studentHolidayIds.has(hid);
      })
      .map((h) => ({
        value: String(h._id ?? h.id ?? ""),
        label: `${h.title} (${formatDate(h.date)})`,
        holiday: h,
      }))
      .filter((o) => o.value);
    const existingIds = new Set(selectedHolidays.map((x) => x.value));
    const merged = [
      ...selectedHolidays,
      ...autoSelected.filter((o) => !existingIds.has(o.value)),
    ];
    setSelectedHolidays(merged);
  }, [selectedStudents, holidays]);

  const handleAssign = async () => {
    if (selectedStudents.length === 0) {
      await Swal.fire({
        icon: "warning",
        title: "No Students Selected",
        text: "Please select at least one student",
        confirmButtonText: "OK",
      });
      return;
    }
    if (selectedHolidays.length === 0) {
      await Swal.fire({
        icon: "warning",
        title: "No Holidays Selected",
        text: "Please select at least one holiday",
        confirmButtonText: "OK",
      });
      return;
    }
    setAssigning(true);
    setError(null);
    setAssignmentResult(null);
    setRemovalResult(null);
    try {
      const studentIds = selectedStudents.map((s) => s.value);
      const holidayIds = selectedHolidays.map((h) => h.value);
      const response = await assignHolidaysToStudents(studentIds, holidayIds);
      setAssignmentResult(response.data ?? null);
      await Swal.fire({
        icon: "success",
        title: "Success",
        html: `
          <p class="mb-3">${response?.message ?? "Holidays assigned successfully"}</p>
          <div class="text-left text-sm space-y-1">
            <p><strong>Students Updated:</strong> ${response?.data?.candidatesUpdated ?? 0}</p>
            <p><strong>Holidays Added:</strong> ${response?.data?.holidaysAdded ?? 0}</p>
            <p><strong>Attendance Records Created:</strong> ${response?.data?.attendanceRecordsCreated ?? 0}</p>
          </div>
        `,
        confirmButtonText: "OK",
      });
      await fetchStudents();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data
          ?.message ?? (err as { message?: string })?.message ?? "Failed to assign holidays";
      setError(msg);
      await Swal.fire({ icon: "error", title: "Error", text: msg, confirmButtonText: "OK" });
    } finally {
      setAssigning(false);
    }
  };

  const handleRemove = async () => {
    if (selectedStudents.length === 0) {
      await Swal.fire({
        icon: "warning",
        title: "No Students Selected",
        text: "Please select at least one student",
        confirmButtonText: "OK",
      });
      return;
    }
    if (selectedHolidays.length === 0) {
      await Swal.fire({
        icon: "warning",
        title: "No Holidays Selected",
        text: "Please select at least one holiday to remove",
        confirmButtonText: "OK",
      });
      return;
    }
    const result = await Swal.fire({
      icon: "warning",
      title: "Remove Holidays?",
      html: `
        <p class="mb-3">Are you sure you want to remove the selected holidays from ${selectedStudents.length} student(s)?</p>
        <p class="text-sm text-gray-600">This will remove holiday IDs from each student and delete attendance records with status "Holiday" for those dates.</p>
      `,
      showCancelButton: true,
      confirmButtonText: "Yes, Remove Holidays",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#d33",
    });
    if (!result.isConfirmed) return;
    setRemoving(true);
    setError(null);
    setAssignmentResult(null);
    setRemovalResult(null);
    try {
      const studentIds = selectedStudents.map((s) => s.value);
      const holidayIds = selectedHolidays.map((h) => h.value);
      const response = await removeHolidaysFromStudents(studentIds, holidayIds);
      setRemovalResult(response.data ?? null);
      await Swal.fire({
        icon: "success",
        title: "Success",
        html: `
          <p class="mb-3">${response?.message ?? "Holidays removed successfully"}</p>
          <div class="text-left text-sm space-y-1">
            <p><strong>Students Updated:</strong> ${response?.data?.candidatesUpdated ?? 0}</p>
            <p><strong>Holidays Removed:</strong> ${response?.data?.holidaysRemoved ?? 0}</p>
            <p><strong>Attendance Records Deleted:</strong> ${response?.data?.attendanceRecordsDeleted ?? 0}</p>
          </div>
        `,
        confirmButtonText: "OK",
      });
      await fetchStudents();
      setSelectedHolidays([]);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data
          ?.message ?? (err as { message?: string })?.message ?? "Failed to remove holidays";
      setError(msg);
      await Swal.fire({ icon: "error", title: "Error", text: msg, confirmButtonText: "OK" });
    } finally {
      setRemoving(false);
    }
  };

  const clearSelections = () => {
    setSelectedStudents([]);
    setSelectedGroupId(null);
    setSelectedHolidays([]);
    setAssignmentResult(null);
    setRemovalResult(null);
    setGroupAssignmentResult(null);
    setGroupRemovalResult(null);
    setError(null);
  };

  const handleAssignGroup = async () => {
    if (!selectedGroupId || selectedHolidays.length === 0) return;
    setAssigning(true);
    setError(null);
    setGroupAssignmentResult(null);
    setGroupRemovalResult(null);
    try {
      const holidayIds = selectedHolidays.map((h) => h.value);
      const response = (await assignHolidaysToGroup(selectedGroupId, holidayIds)) as {
        message?: string;
        data?: { candidatesUpdated?: number; holidaysAdded?: number; attendanceRecordsCreated?: number };
      };
      setGroupAssignmentResult(response?.data ?? { candidatesUpdated: 0, holidaysAdded: holidayIds.length, attendanceRecordsCreated: 0 });
      await Swal.fire({
        icon: "success",
        title: "Success",
        html: `
          <p class="mb-3">${response?.message ?? "Holidays assigned to group successfully"}</p>
          <div class="text-left text-sm space-y-1">
            <p><strong>Students Updated:</strong> ${response?.data?.candidatesUpdated ?? 0}</p>
            <p><strong>Holidays Added:</strong> ${response?.data?.holidaysAdded ?? holidayIds.length}</p>
            <p><strong>Attendance Records Created:</strong> ${response?.data?.attendanceRecordsCreated ?? 0}</p>
          </div>
        `,
        confirmButtonText: "OK",
      });
      await fetchGroups();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ??
        (err as { message?: string })?.message ??
        "Failed to assign holidays to group";
      setError(msg);
      await Swal.fire({ icon: "error", title: "Error", text: msg, confirmButtonText: "OK" });
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveGroup = async () => {
    if (!selectedGroupId || selectedHolidays.length === 0) return;
    const result = await Swal.fire({
      icon: "warning",
      title: "Remove Holidays from Group?",
      html: `<p class="mb-3">Are you sure you want to remove the selected holidays from this group?</p>`,
      showCancelButton: true,
      confirmButtonText: "Yes, Remove",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#d33",
    });
    if (!result.isConfirmed) return;
    setRemoving(true);
    setError(null);
    setGroupAssignmentResult(null);
    setGroupRemovalResult(null);
    try {
      const holidayIds = selectedHolidays.map((h) => h.value);
      const response = (await removeHolidaysFromGroup(selectedGroupId, holidayIds)) as {
        message?: string;
        data?: { candidatesUpdated?: number; holidaysRemoved?: number; attendanceRecordsDeleted?: number };
      };
      setGroupRemovalResult(response?.data ?? { candidatesUpdated: 0, holidaysRemoved: holidayIds.length, attendanceRecordsDeleted: 0 });
      await Swal.fire({
        icon: "success",
        title: "Success",
        html: `
          <p class="mb-3">${response?.message ?? "Holidays removed from group successfully"}</p>
          <div class="text-left text-sm space-y-1">
            <p><strong>Students Updated:</strong> ${response?.data?.candidatesUpdated ?? 0}</p>
            <p><strong>Holidays Removed:</strong> ${response?.data?.holidaysRemoved ?? holidayIds.length}</p>
            <p><strong>Attendance Records Deleted:</strong> ${response?.data?.attendanceRecordsDeleted ?? 0}</p>
          </div>
        `,
        confirmButtonText: "OK",
      });
      await fetchGroups();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ??
        (err as { message?: string })?.message ??
        "Failed to remove holidays from group";
      setError(msg);
      await Swal.fire({ icon: "error", title: "Error", text: msg, confirmButtonText: "OK" });
    } finally {
      setRemoving(false);
    }
  };

  function formatDate(dateString: string) {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  }

  const studentOptionsWithSelectAll =
    students.length > 0
      ? [
          { value: SELECT_ALL_STUDENTS_VALUE, label: "Select All Students" },
          ...students,
        ]
      : students;

  if (isAdmin === null) {
    return (
      <>
        <Seo title="Assign Holidays" />
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
        <Seo title="Assign Holidays" />
        <div className="relative mt-4 w-full">
          <div className="rounded-2xl border border-defaultborder/70 bg-white dark:bg-bodybg shadow-sm overflow-hidden">
            <div className="py-20 px-6 text-center">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-danger/10 text-danger mb-5 ring-1 ring-danger/20">
                <i className="ri-error-warning-line text-5xl" />
              </div>
              <h3 className="text-xl font-semibold text-defaulttextcolor dark:text-white mb-2">Access Denied</h3>
              <p className="text-sm text-defaulttextcolor/80 max-w-md mx-auto">Only administrators can assign holidays to students.</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Seo title="Assign Holidays to Students" />
      <div className="relative mt-4 space-y-6 min-h-[40vh] w-full">
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_100%_60%_at_50%_-15%,rgba(99,102,241,0.07),transparent_50%)] dark:bg-[radial-gradient(ellipse_100%_60%_at_50%_-15%,rgba(99,102,241,0.12),transparent_50%)]" aria-hidden />
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(to_bottom,rgba(248,250,252,0.6),transparent_30%)] dark:bg-[linear-gradient(to_bottom,rgba(15,23,42,0.4),transparent_30%)]" aria-hidden />

        <section className="rounded-2xl border border-defaultborder/70 bg-white dark:bg-bodybg shadow-sm shadow-black/[0.03] dark:shadow-none overflow-hidden transition-shadow duration-300 hover:shadow-md hover:shadow-black/[0.04] dark:hover:shadow-none">
          <div className="flex items-center gap-4 px-6 py-5 border-b border-defaultborder/50 bg-gradient-to-r from-slate-50/90 to-white dark:from-white/[0.03] dark:to-transparent">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/10 dark:ring-primary/20" aria-hidden>
              <i className="ri-calendar-event-line text-2xl" />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-defaulttextcolor dark:text-white tracking-tight">Assign Holidays</h2>
              <p className="text-xs text-defaulttextcolor/60 dark:text-white/50 mt-0.5">Assign or remove holidays for students or groups</p>
            </div>
          </div>
          <div className="px-6 py-6 border-t border-defaultborder/50 space-y-5 bg-gradient-to-b from-slate-50/50 to-transparent dark:from-white/[0.02] dark:to-transparent">
            {error && (
              <div className="rounded-xl border border-danger/30 bg-danger/10 dark:bg-danger/15 px-4 py-3 text-sm text-danger">
                {error}
              </div>
            )}

            <div className="inline-flex rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 p-1">
              <button
                type="button"
                onClick={() => {
                  setAssignmentMode("individual");
                  setGroupAssignmentResult(null);
                  setGroupRemovalResult(null);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shrink-0 ${
                  assignmentMode === "individual" ? "bg-primary text-white shadow-sm" : "text-defaulttextcolor hover:text-primary"
                }`}
              >
                <i className="ri-user-line" />
                Individual Assignment
              </button>
              <button
                type="button"
                onClick={() => {
                  setAssignmentMode("group");
                  setAssignmentResult(null);
                  setRemovalResult(null);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shrink-0 ${
                  assignmentMode === "group" ? "bg-primary text-white shadow-sm" : "text-defaulttextcolor hover:text-primary"
                }`}
              >
                <i className="ri-group-line" />
                Group Assignment
              </button>
            </div>

          {assignmentMode === "individual" && (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-defaulttextcolor">Select Students <span className="text-danger">*</span></label>
                {loadingStudents ? (
                  <div className="flex items-center gap-2 text-defaulttextcolor/70">
                    <i className="ri-loader-4-line animate-spin" />
                    <span>Loading students…</span>
                  </div>
                ) : (
                  <div className="rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all duration-150">
                    <Select
                      isMulti
                      options={studentOptionsWithSelectAll}
                      value={selectedStudents}
                      onChange={(selected: (StudentOption | { value: string; label: string })[] | null) => {
                        if (!selected || selected.length === 0) {
                          setSelectedStudents([]);
                          return;
                        }
                        const hasSelectAll = selected.some((o) => o.value === SELECT_ALL_STUDENTS_VALUE);
                        if (hasSelectAll) {
                          const withoutAll = selected.filter((o) => o.value !== SELECT_ALL_STUDENTS_VALUE);
                          if (withoutAll.length >= students.length) {
                            setSelectedStudents([]);
                          } else {
                            setSelectedStudents(students);
                          }
                        } else {
                          setSelectedStudents(selected as StudentOption[]);
                        }
                      }}
                      placeholder="Select one or more students…"
                      closeMenuOnSelect={false}
                      hideSelectedOptions={false}
                      className="react-select-container assign-holidays-select"
                      classNamePrefix="react-select"
                      isClearable
                      isSearchable
                      menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
                      menuPosition="fixed"
                      styles={{ menuPortal: (base) => ({ ...base, zIndex: 10000 }) }}
                    />
                  </div>
                )}
                {selectedStudents.length > 0 && (
                  <p className="mt-1.5 text-xs text-defaulttextcolor/60">{selectedStudents.length} student(s) selected</p>
                )}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-4">
                  <label className="block text-sm font-semibold text-defaulttextcolor">Select Holidays <span className="text-danger">*</span></label>
                  {holidays.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedHolidays.length === holidays.length) {
                          setSelectedHolidays([]);
                        } else {
                          setSelectedHolidays(
                            holidays.map((h) => ({
                              value: String(h._id ?? h.id ?? ""),
                              label: `${h.title} (${formatDate(h.date)})`,
                              holiday: h,
                            }))
                          );
                        }
                      }}
                      className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      {selectedHolidays.length === holidays.length ? "Deselect All" : "Select All"}
                    </button>
                  )}
                </div>
                {loadingHolidays ? (
                  <div className="flex items-center gap-2 text-defaulttextcolor/70">
                    <i className="ri-loader-4-line animate-spin" />
                    <span>Loading holidays…</span>
                  </div>
                ) : holidays.length === 0 ? (
                  <p className="rounded-xl border border-warning/30 bg-warning/10 dark:bg-warning/15 px-4 py-3 text-sm text-warning">
                    No active holidays available. Create holidays first in Holidays List.
                  </p>
                ) : (
                  <div className="max-h-96 overflow-y-auto rounded-xl border border-defaultborder/70 bg-slate-50/40 dark:bg-white/[0.03] p-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {holidays.map((holiday) => {
                        const hid = String(holiday._id ?? holiday.id ?? "");
                        const isSelected = selectedHolidays.some((h) => h.value === hid);
                        return (
                          <label
                            key={hid}
                            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all hover:border-primary/70 ${
                              isSelected ? "border-primary bg-primary/10 dark:bg-primary/15" : "border-defaultborder/80 hover:bg-black/5 dark:hover:bg-white/5"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  const dateLabel = holiday.endDate
                                    ? `${formatDate(holiday.date)} – ${formatDate(holiday.endDate)}`
                                    : formatDate(holiday.date);
                                  setSelectedHolidays((prev) => [
                                    ...prev,
                                    { value: hid, label: `${holiday.title} (${dateLabel})`, holiday },
                                  ]);
                                } else {
                                  setSelectedHolidays((prev) => prev.filter((h) => h.value !== hid));
                                }
                              }}
                              className="mt-0.5 rounded border-defaultborder text-primary focus:ring-primary"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-defaulttextcolor truncate">{holiday.title}</div>
                              <div className="text-sm text-defaulttextcolor/70">
                                {holiday.endDate
                                  ? `${formatDate(holiday.date)} – ${formatDate(holiday.endDate)}`
                                  : formatDate(holiday.date)}
                              </div>
                            </div>
                            {isSelected && (
                              <i className="ri-checkbox-circle-fill text-lg text-primary flex-shrink-0" />
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
                {selectedHolidays.length > 0 && (
                  <p className="mt-1.5 text-xs text-defaulttextcolor/60">{selectedHolidays.length} of {holidays.length} holiday(s) selected</p>
                )}
              </div>

              <div className="rounded-xl border border-primary/20 bg-primary/5 dark:bg-primary/10 dark:border-primary/30 p-4">
                <div className="flex items-start gap-3">
                  <i className="ri-information-line mt-0.5 text-xl text-primary shrink-0" aria-hidden />
                  <div className="min-w-0">
                    <h4 className="mb-1 font-semibold text-defaulttextcolor">How it works</h4>
                    <ul className="list-inside list-disc space-y-1 text-sm text-defaulttextcolor/80">
                      <li><strong>Assign:</strong> Select students and holidays, then click &quot;Assign Holidays&quot; to add them.</li>
                      <li><strong>Remove:</strong> Select students and holidays, then click &quot;Remove Holidays&quot; to remove them.</li>
                      <li>Holiday IDs are added/removed from each student; attendance records with status &quot;Holiday&quot; are created/deleted for each date.</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleAssign}
                  disabled={assigning || removing || selectedHolidays.length === 0 || selectedStudents.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary/90 hover:shadow-md transition-all disabled:opacity-60 disabled:pointer-events-none"
                >
                  {assigning ? <><i className="ri-loader-4-line animate-spin text-lg" /> Assigning…</> : <><i className="ri-calendar-check-line text-lg" /> Assign Holidays</>}
                </button>
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={assigning || removing || selectedHolidays.length === 0 || selectedStudents.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl border border-danger/60 bg-danger/10 px-5 py-2.5 text-sm font-medium text-danger hover:bg-danger/20 dark:bg-danger/15 transition-all disabled:opacity-60 disabled:pointer-events-none"
                >
                  {removing ? <><i className="ri-loader-4-line animate-spin text-lg" /> Removing…</> : <><i className="ri-calendar-close-line text-lg" /> Remove Holidays</>}
                </button>
                <button type="button" onClick={clearSelections} className="inline-flex items-center gap-2 rounded-xl border border-defaultborder/80 px-5 py-2.5 text-sm font-medium text-defaulttextcolor hover:bg-defaultborder/20 dark:hover:bg-white/5 transition-colors">
                  Clear
                </button>
              </div>

              {assignmentResult && (
                <div className="rounded-xl border border-success/30 bg-success/10 dark:bg-success/15 p-4">
                  <h3 className="mb-3 flex items-center gap-2 font-semibold text-success">
                    <i className="ri-checkbox-circle-line" />
                    Assignment Results
                  </h3>
                  <div className="space-y-2 text-sm text-defaulttextcolor/80">
                    <p><strong>Students Updated:</strong> {assignmentResult.candidatesUpdated}</p>
                    <p><strong>Holidays Added:</strong> {assignmentResult.holidaysAdded ?? 0}</p>
                    <p><strong>Attendance Records Created:</strong> {assignmentResult.attendanceRecordsCreated ?? 0}</p>
                  </div>
                </div>
              )}

              {removalResult && (
                <div className="rounded-xl border border-danger/30 bg-danger/10 dark:bg-danger/15 p-4">
                  <h3 className="mb-3 flex items-center gap-2 font-semibold text-danger">
                    <i className="ri-delete-bin-line" />
                    Removal Results
                  </h3>
                  <div className="space-y-2 text-sm text-defaulttextcolor/80">
                    <p><strong>Students Updated:</strong> {removalResult.candidatesUpdated}</p>
                    <p><strong>Holidays Removed:</strong> {removalResult.holidaysRemoved ?? 0}</p>
                    <p><strong>Attendance Records Deleted:</strong> {removalResult.attendanceRecordsDeleted ?? 0}</p>
                  </div>
                </div>
              )}
            </>
          )}

          {assignmentMode === "group" && (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-defaulttextcolor">Select Candidate Group <span className="text-danger">*</span></label>
                {loadingGroups ? (
                  <div className="flex items-center gap-2 text-defaulttextcolor/70">
                    <i className="ri-loader-4-line animate-spin" />
                    <span>Loading groups…</span>
                  </div>
                ) : (
                  <select
                    value={selectedGroupId ?? ""}
                    onChange={(e) => {
                      setSelectedGroupId(e.target.value || null);
                      setGroupAssignmentResult(null);
                      setGroupRemovalResult(null);
                    }}
                    className="w-full max-w-md rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-defaulttextcolor focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    required
                  >
                    <option value="">Select a candidate group…</option>
                    {groups.map((g) => (
                      <option key={g._id ?? g.id} value={String(g._id ?? g.id)}>
                        {g.name}
                        {g.description ? ` – ${g.description}` : ""}
                      </option>
                    ))}
                  </select>
                )}
                {groups.length === 0 && !loadingGroups && (
                  <p className="mt-1.5 text-xs text-defaulttextcolor/60">No groups yet. Create groups in Candidate Groups first.</p>
                )}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-4">
                  <label className="block text-sm font-semibold text-defaulttextcolor">Select Holidays <span className="text-danger">*</span></label>
                  {holidays.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedHolidays.length === holidays.length) {
                          setSelectedHolidays([]);
                        } else {
                          setSelectedHolidays(
                            holidays.map((h) => ({
                              value: String(h._id ?? h.id ?? ""),
                              label: `${h.title} (${formatDate(h.date)})`,
                              holiday: h,
                            }))
                          );
                        }
                      }}
                      className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      {selectedHolidays.length === holidays.length ? "Deselect All" : "Select All"}
                    </button>
                  )}
                </div>
                {loadingHolidays ? (
                  <div className="flex items-center gap-2 text-defaulttextcolor/70">
                    <i className="ri-loader-4-line animate-spin" />
                    <span>Loading holidays…</span>
                  </div>
                ) : holidays.length === 0 ? (
                  <p className="rounded-xl border border-warning/30 bg-warning/10 dark:bg-warning/15 px-4 py-3 text-sm text-warning">
                    No active holidays available. Create holidays first in Holidays List.
                  </p>
                ) : (
                  <div className="max-h-96 overflow-y-auto rounded-xl border border-defaultborder/70 bg-slate-50/40 dark:bg-white/[0.03] p-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {holidays.map((holiday) => {
                        const hid = String(holiday._id ?? holiday.id ?? "");
                        const isSelected = selectedHolidays.some((h) => h.value === hid);
                        return (
                          <label
                            key={hid}
                            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all hover:border-primary/70 ${
                              isSelected ? "border-primary bg-primary/10 dark:bg-primary/15" : "border-defaultborder/80 hover:bg-black/5 dark:hover:bg-white/5"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  const dateLabel = holiday.endDate
                                    ? `${formatDate(holiday.date)} – ${formatDate(holiday.endDate)}`
                                    : formatDate(holiday.date);
                                  setSelectedHolidays((prev) => [
                                    ...prev,
                                    { value: hid, label: `${holiday.title} (${dateLabel})`, holiday },
                                  ]);
                                } else {
                                  setSelectedHolidays((prev) => prev.filter((h) => h.value !== hid));
                                }
                              }}
                              className="mt-0.5 rounded border-defaultborder text-primary focus:ring-primary"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-defaulttextcolor truncate">{holiday.title}</div>
                              <div className="text-sm text-defaulttextcolor/70">
                                {holiday.endDate
                                  ? `${formatDate(holiday.date)} – ${formatDate(holiday.endDate)}`
                                  : formatDate(holiday.date)}
                              </div>
                            </div>
                            {isSelected && (
                              <i className="ri-checkbox-circle-fill text-lg text-primary flex-shrink-0" />
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
                {selectedHolidays.length > 0 && (
                  <p className="mt-1.5 text-xs text-defaulttextcolor/60">{selectedHolidays.length} of {holidays.length} holiday(s) selected</p>
                )}
              </div>

              <div className="rounded-xl border border-primary/20 bg-primary/5 dark:bg-primary/10 dark:border-primary/30 p-4">
                <div className="flex items-start gap-3">
                  <i className="ri-information-line mt-0.5 text-xl text-primary shrink-0" aria-hidden />
                  <div className="min-w-0">
                    <h4 className="mb-1 font-semibold text-defaulttextcolor">Group assignment</h4>
                    <p className="text-sm text-defaulttextcolor/80">
                      Select a candidate group and holidays, then click Assign or Remove. All students in the group will get the selected holidays.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleAssignGroup}
                  disabled={assigning || removing || selectedHolidays.length === 0 || !selectedGroupId}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary/90 hover:shadow-md transition-all disabled:opacity-60 disabled:pointer-events-none"
                >
                  {assigning ? <><i className="ri-loader-4-line animate-spin text-lg" /> Assigning…</> : <><i className="ri-calendar-check-line text-lg" /> Assign Holidays</>}
                </button>
                <button
                  type="button"
                  onClick={handleRemoveGroup}
                  disabled={assigning || removing || selectedHolidays.length === 0 || !selectedGroupId}
                  className="inline-flex items-center gap-2 rounded-xl border border-danger/60 bg-danger/10 px-5 py-2.5 text-sm font-medium text-danger hover:bg-danger/20 dark:bg-danger/15 transition-all disabled:opacity-60 disabled:pointer-events-none"
                >
                  {removing ? <><i className="ri-loader-4-line animate-spin text-lg" /> Removing…</> : <><i className="ri-calendar-close-line text-lg" /> Remove Holidays</>}
                </button>
                <button type="button" onClick={clearSelections} className="inline-flex items-center gap-2 rounded-xl border border-defaultborder/80 px-5 py-2.5 text-sm font-medium text-defaulttextcolor hover:bg-defaultborder/20 dark:hover:bg-white/5 transition-colors">
                  Clear
                </button>
              </div>

              {groupAssignmentResult && (
                <div className="rounded-xl border border-success/30 bg-success/10 dark:bg-success/15 p-4">
                  <h3 className="mb-3 flex items-center gap-2 font-semibold text-success">
                    <i className="ri-checkbox-circle-line" />
                    Assignment Results
                  </h3>
                  <div className="space-y-2 text-sm text-defaulttextcolor/80">
                    <p><strong>Students Updated:</strong> {groupAssignmentResult.candidatesUpdated ?? 0}</p>
                    <p><strong>Holidays Added:</strong> {groupAssignmentResult.holidaysAdded ?? 0}</p>
                    <p><strong>Attendance Records Created:</strong> {groupAssignmentResult.attendanceRecordsCreated ?? 0}</p>
                  </div>
                </div>
              )}

              {groupRemovalResult && (
                <div className="rounded-xl border border-danger/30 bg-danger/10 dark:bg-danger/15 p-4">
                  <h3 className="mb-3 flex items-center gap-2 font-semibold text-danger">
                    <i className="ri-delete-bin-line" />
                    Removal Results
                  </h3>
                  <div className="space-y-2 text-sm text-defaulttextcolor/80">
                    <p><strong>Students Updated:</strong> {groupRemovalResult.candidatesUpdated ?? 0}</p>
                    <p><strong>Holidays Removed:</strong> {groupRemovalResult.holidaysRemoved ?? 0}</p>
                    <p><strong>Attendance Records Deleted:</strong> {groupRemovalResult.attendanceRecordsDeleted ?? 0}</p>
                  </div>
                </div>
              )}
            </>
          )}
          </div>
        </section>
      </div>
      <style jsx>{`
        .assign-holidays-select :global(.react-select__control) {
          border: none;
          min-height: 2.75rem;
          background: transparent;
          box-shadow: none;
        }
        .assign-holidays-select :global(.react-select__control--is-focused) {
          box-shadow: none;
        }
        .assign-holidays-select :global(.react-select__placeholder),
        .assign-holidays-select :global(.react-select__input-container) {
          color: inherit;
        }
      `}</style>
    </>
  );
}
