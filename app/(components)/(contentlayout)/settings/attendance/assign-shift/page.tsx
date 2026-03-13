"use client";

import React, { useEffect, useState, useCallback } from "react";
import { listStudents, assignShiftToStudents, type Student } from "@/shared/lib/api/students";
import { getAllShifts, type Shift } from "@/shared/lib/api/shifts";
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

export default function SettingsAttendanceAssignShiftPage() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<StudentOption[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState("");
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

  const fetchShifts = useCallback(async () => {
    try {
      const res = await getAllShifts({ isActive: true, limit: 500 });
      const data = (res as { data?: { results?: Shift[] } }).data;
      setShifts(data?.results ?? []);
    } catch {
      setShifts([]);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      setLoading(true);
      Promise.all([fetchStudents(), fetchShifts()]).finally(() => setLoading(false));
    }
  }, [isAdmin, fetchStudents, fetchShifts]);

  const studentOptions = students.length
    ? [{ value: SELECT_ALL, label: "Select All Students" }, ...students]
    : students;

  const handleAssign = async () => {
    if (selectedStudents.length === 0) {
      await Swal.fire({ icon: "warning", title: "No students selected", text: "Select at least one student", confirmButtonText: "OK" });
      return;
    }
    if (!selectedShiftId) {
      await Swal.fire({ icon: "warning", title: "No shift selected", text: "Select a shift", confirmButtonText: "OK" });
      return;
    }
    setAssigning(true);
    setError(null);
    try {
      const ids = selectedStudents.map((s) => s.value);
      await assignShiftToStudents(ids, selectedShiftId);
      await Swal.fire({ icon: "success", title: "Success", text: "Shift assigned to selected students", confirmButtonText: "OK" });
      fetchStudents();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ?? (err as { message?: string })?.message ?? "Failed to assign shift";
      setError(msg);
      await Swal.fire({ icon: "error", title: "Error", text: msg, confirmButtonText: "OK" });
    } finally {
      setAssigning(false);
    }
  };

  if (isAdmin === null) {
    return (
      <>
        <Seo title="Assign Shift" />
        <Pageheader currentpage="Assign Shift" activepage="Settings" mainpage="Attendance" />
        <div className="box"><div className="box-body py-8 text-center text-defaulttextcolor/70">Loading…</div></div>
      </>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <Seo title="Assign Shift" />
        <Pageheader currentpage="Assign Shift" activepage="Settings" mainpage="Attendance" />
        <div className="box">
          <div className="box-body py-12 text-center">
            <i className="ri-error-warning-line text-5xl text-danger mb-4" />
            <h3 className="text-xl font-semibold text-defaulttextcolor mb-2">Access Denied</h3>
            <p className="text-defaulttextcolor/70">Only administrators can assign shifts.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Seo title="Assign Shift" />
      <Pageheader currentpage="Assign Shift" activepage="Settings" mainpage="Attendance" />
      <div className="box">
        <div className="box-header">
          <div className="box-title">Assign Shift to Students</div>
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
                <label className="mb-2 block text-sm font-medium text-defaulttextcolor">Select Shift <span className="text-danger">*</span></label>
                <select
                  value={selectedShiftId}
                  onChange={(e) => setSelectedShiftId(e.target.value)}
                  className="form-control !w-auto min-w-[200px]"
                >
                  <option value="">-- Choose shift --</option>
                  {shifts.map((s) => (
                    <option key={s._id ?? s.id} value={s._id ?? s.id}>
                      {s.name} ({s.startTime}–{s.endTime} {s.timezone})
                    </option>
                  ))}
                </select>
                {shifts.length === 0 && <p className="mt-2 text-sm text-warning">No active shifts. Create shifts in Manage Shifts first.</p>}
              </div>

              <button
                type="button"
                onClick={handleAssign}
                disabled={assigning || selectedStudents.length === 0 || !selectedShiftId}
                className="ti-btn ti-btn-primary"
              >
                {assigning ? <><i className="ri-loader-4-line animate-spin me-2" /> Assigning…</> : <><i className="ri-calendar-check-line me-2" /> Assign Shift</>}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
