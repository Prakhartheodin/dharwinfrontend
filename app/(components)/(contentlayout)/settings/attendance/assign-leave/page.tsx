"use client";

import React, { useEffect, useState, useCallback } from "react";
import { listStudents, type Student } from "@/shared/lib/api/students";
import { assignLeavesToStudents } from "@/shared/lib/api/attendance";
import Pageheader from "@/shared/layout-components/page-header/pageheader";
import Seo from "@/shared/layout-components/seo/seo";
import Swal from "sweetalert2";
import dynamic from "next/dynamic";
import { useAuth } from "@/shared/contexts/auth-context";
import * as rolesApi from "@/shared/lib/api/roles";
import type { Role } from "@/shared/lib/types";

const Select = dynamic(() => import("react-select"), { ssr: false });

type StudentOption = { value: string; label: string; student: Student };
const SELECT_ALL = "__all_students__";

export default function SettingsAttendanceAssignLeavePage() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<StudentOption[]>([]);
  const [leaveType, setLeaveType] = useState<"casual" | "sick" | "unpaid">("casual");
  const [dateInput, setDateInput] = useState("");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    try {
      const res = await listStudents({ limit: 1000, sortBy: "user.name:asc" });
      const list = res.results ?? [];
      setStudents(
        list.map((s) => ({
          value: s.id,
          label: `${s.user?.name ?? "Unknown"} (${s.user?.email ?? ""})`,
          student: s,
        })).filter((o) => o.value)
      );
    } catch {
      setStudents([]);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      setLoading(true);
      fetchStudents().finally(() => setLoading(false));
    }
  }, [isAdmin, fetchStudents]);

  const studentOptions = students.length
    ? [{ value: SELECT_ALL, label: "Select All Students" }, ...students]
    : students;

  const addDate = () => {
    if (!dateInput) {
      Swal.fire({ icon: "warning", title: "Select a date first", confirmButtonText: "OK" });
      return;
    }
    const iso = new Date(dateInput).toISOString().slice(0, 10);
    if (!selectedDates.includes(iso)) {
      setSelectedDates((prev) => [...prev, iso].sort());
    }
  };

  const removeDate = (d: string) => {
    setSelectedDates((prev) => prev.filter((x) => x !== d));
  };

  const handleAssign = async () => {
    if (selectedStudents.length === 0) {
      await Swal.fire({ icon: "warning", title: "No students selected", text: "Select at least one student", confirmButtonText: "OK" });
      return;
    }
    if (selectedDates.length === 0) {
      await Swal.fire({ icon: "warning", title: "No dates", text: "Add at least one date", confirmButtonText: "OK" });
      return;
    }
    setAssigning(true);
    setError(null);
    try {
      const ids = selectedStudents.some((s) => s.value === SELECT_ALL)
        ? students.map((s) => s.value).filter(Boolean)
        : selectedStudents.map((s) => s.value).filter((id) => id !== SELECT_ALL);
      if (ids.length === 0) {
        await Swal.fire({ icon: "warning", title: "No students", text: "Select at least one student", confirmButtonText: "OK" });
        setAssigning(false);
        return;
      }
      const datesIso = selectedDates.map((d) => new Date(d + "T00:00:00.000Z").toISOString());
      const result = await assignLeavesToStudents(ids, datesIso, leaveType, notes || undefined);
      await Swal.fire({
        icon: "success",
        title: "Success",
        text: result?.data?.attendanceRecordsCreated != null
          ? `Created ${result.data.attendanceRecordsCreated} leave record(s).`
          : "Leave assigned.",
        confirmButtonText: "OK",
      });
      setSelectedDates([]);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ?? (err as { message?: string })?.message ?? "Failed to assign leave";
      setError(msg);
      await Swal.fire({ icon: "error", title: "Error", text: msg, confirmButtonText: "OK" });
    } finally {
      setAssigning(false);
    }
  };

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return d;
    }
  };

  if (isAdmin === null) {
    return (
      <>
        <Seo title="Assign Leave" />
        <Pageheader currentpage="Assign Leave" activepage="Settings" mainpage="Attendance" />
        <div className="box"><div className="box-body py-8 text-center text-defaulttextcolor/70">Loading…</div></div>
      </>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <Seo title="Assign Leave" />
        <Pageheader currentpage="Assign Leave" activepage="Settings" mainpage="Attendance" />
        <div className="box">
          <div className="box-body py-12 text-center">
            <i className="ri-error-warning-line text-5xl text-danger mb-4" />
            <h3 className="text-xl font-semibold text-defaulttextcolor mb-2">Access Denied</h3>
            <p className="text-defaulttextcolor/70">Only administrators can assign leave.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Seo title="Assign Leave" />
      <Pageheader currentpage="Assign Leave" activepage="Settings" mainpage="Attendance" />
      <div className="box">
        <div className="box-header">
          <div className="box-title">Assign Leave to Students</div>
        </div>
        <div className="box-body">
          {error && <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 p-4 text-danger text-sm">{error}</div>}

          {loading ? (
            <div className="py-8 text-center text-defaulttextcolor/70">Loading…</div>
          ) : (
            <>
              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-defaulttextcolor">Select Students <span className="text-danger">*</span></label>
                <Select
                  isMulti
                  options={studentOptions}
                  value={selectedStudents}
                  onChange={(sel: StudentOption[] | null) => {
                    if (!sel?.length) {
                      setSelectedStudents([]);
                      return;
                    }
                    const hasAll = sel.some((o) => o.value === SELECT_ALL);
                    if (hasAll) {
                      if (selectedStudents.length === students.length) setSelectedStudents([]);
                      else setSelectedStudents(students);
                    } else {
                      setSelectedStudents(sel as StudentOption[]);
                    }
                  }}
                  placeholder="Select students..."
                  closeMenuOnSelect={false}
                  className="react-select-container"
                  classNamePrefix="react-select"
                  isClearable
                  isSearchable
                />
                {selectedStudents.length > 0 && <p className="mt-2 text-sm text-defaulttextcolor/70">{selectedStudents.length} student(s) selected</p>}
              </div>

              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-defaulttextcolor">Leave Type <span className="text-danger">*</span></label>
                <select value={leaveType} onChange={(e) => setLeaveType(e.target.value as "casual" | "sick" | "unpaid")} className="form-control !w-auto min-w-[10rem] pr-8">
                  <option value="casual">Casual</option>
                  <option value="sick">Sick</option>
                  <option value="unpaid">Unpaid</option>
                </select>
              </div>

              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-defaulttextcolor">Dates <span className="text-danger">*</span></label>
                <div className="flex flex-wrap items-end gap-2">
                  <input type="date" value={dateInput} onChange={(e) => setDateInput(e.target.value)} className="form-control !w-auto" />
                  <button type="button" onClick={addDate} className="ti-btn ti-btn-light">Add Date</button>
                </div>
                {selectedDates.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedDates.map((d) => (
                      <span key={d} className="badge bg-primary/10 text-primary flex items-center gap-1">
                        {formatDate(d)}
                        <button type="button" onClick={() => removeDate(d)} className="hover:text-danger" aria-label="Remove">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-defaulttextcolor">Notes (optional)</label>
                <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" className="form-control" />
              </div>

              <button
                type="button"
                onClick={handleAssign}
                disabled={assigning || selectedStudents.length === 0 || selectedDates.length === 0}
                className="ti-btn ti-btn-primary"
              >
                {assigning ? <><i className="ri-loader-4-line animate-spin me-2" /> Assigning…</> : <><i className="ri-calendar-line me-2" /> Assign Leave</>}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
