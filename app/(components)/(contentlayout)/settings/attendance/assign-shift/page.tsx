"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { assignShiftToCandidates, listCandidates } from "@/shared/lib/api/candidates";
import { assignShiftToStudents, listStudents } from "@/shared/lib/api/students";
import {
  buildMergedAssignPeopleOptions,
  filterAssignPersonSelectOption,
  partitionAssignPersonRows,
  type AssignPersonRow,
} from "@/shared/lib/attendance-assign-people-options";
import { getAllShifts, type Shift } from "@/shared/lib/api/shifts";
import Seo from "@/shared/layout-components/seo/seo";
import Swal from "sweetalert2";
import dynamic from "next/dynamic";
import { useAttendanceAdminAccess } from "@/shared/hooks/use-attendance-admin-access";
import { SopAssignChecklistNotice, useSopPreselectStudents } from "@/shared/hooks/use-sop-assign-deeplink";
import { dispatchSopStripRefresh } from "@/shared/lib/sop-strip-preferences";

const Select = dynamic(() => import("react-select"), { ssr: false });

const SELECT_ALL = "__all_students__";

export default function SettingsAttendanceAssignShiftPage() {
  const searchParams = useSearchParams();
  const sopQueryString = searchParams.toString();
  const isAdmin = useAttendanceAdminAccess();
  const [people, setPeople] = useState<AssignPersonRow[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedPeople, setSelectedPeople] = useState<AssignPersonRow[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState("");
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPeople = useCallback(async () => {
    try {
      const [stuRes, candRes] = await Promise.all([
        listStudents({ limit: 1000, sortBy: "user.name:asc" }),
        listCandidates({ limit: 1000, employmentStatus: "current", sortBy: "fullName:asc" }),
      ]);
      setPeople(
        buildMergedAssignPeopleOptions(stuRes.results ?? [], candRes.results ?? [])
      );
    } catch {
      setPeople([]);
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
      Promise.all([fetchPeople(), fetchShifts()]).finally(() => setLoading(false));
    }
  }, [isAdmin, fetchPeople, fetchShifts]);

  const mergeSopPerson = useCallback((row: AssignPersonRow) => {
    setPeople((prev) => (prev.some((s) => s.value === row.value) ? prev : [row, ...prev]));
  }, []);

  useSopPreselectStudents(people, setSelectedPeople, sopQueryString, mergeSopPerson);

  const personOptions = people.length
    ? [{ value: SELECT_ALL, label: "Select all (training + employees)" } as AssignPersonRow, ...people]
    : people;

  const handleAssign = async () => {
    if (selectedPeople.length === 0) {
      await Swal.fire({
        icon: "warning",
        title: "No one selected",
        text: "Select at least one training profile or employee",
        confirmButtonText: "OK",
      });
      return;
    }
    if (!selectedShiftId) {
      await Swal.fire({ icon: "warning", title: "No shift selected", text: "Select a shift", confirmButtonText: "OK" });
      return;
    }
    setAssigning(true);
    setError(null);
    try {
      const chosen = selectedPeople.some((s) => s.value === SELECT_ALL)
        ? people
        : selectedPeople.filter((s) => s.value !== SELECT_ALL);
      const { studentRows, candidateRows } = partitionAssignPersonRows(chosen);
      if (studentRows.length === 0 && candidateRows.length === 0) {
        await Swal.fire({
          icon: "warning",
          title: "Nothing to assign",
          text: "Select at least one training profile or employee",
          confirmButtonText: "OK",
        });
        setAssigning(false);
        return;
      }
      const parts: string[] = [];
      if (studentRows.length) {
        await assignShiftToStudents(
          studentRows.map((r) => r.value),
          selectedShiftId
        );
        parts.push(`${studentRows.length} training profile(s)`);
      }
      if (candidateRows.length) {
        await assignShiftToCandidates(
          candidateRows.map((r) => r.candidateId),
          selectedShiftId
        );
        parts.push(`${candidateRows.length} employee(s)`);
      }
      await Swal.fire({
        icon: "success",
        title: "Success",
        text: `Shift assigned: ${parts.join(" · ")}`,
        confirmButtonText: "OK",
      });
      dispatchSopStripRefresh();
      fetchPeople();
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
        <Seo title="Assign Shift" />
        <div className="relative mt-4 w-full">
          <div className="rounded-2xl border border-defaultborder/70 bg-white dark:bg-bodybg shadow-sm overflow-hidden">
            <div className="py-20 px-6 text-center">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-danger/10 text-danger mb-5 ring-1 ring-danger/20">
                <i className="ri-error-warning-line text-5xl" />
              </div>
              <h3 className="text-xl font-semibold text-defaulttextcolor dark:text-white mb-2">Access Denied</h3>
              <p className="text-sm text-defaulttextcolor/80 max-w-md mx-auto">Only administrators can assign shifts to students.</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Seo title="Assign Shift" />
      <div className="relative mt-4 space-y-6 min-h-[40vh] w-full">
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_100%_60%_at_50%_-15%,rgba(99,102,241,0.07),transparent_50%)] dark:bg-[radial-gradient(ellipse_100%_60%_at_50%_-15%,rgba(99,102,241,0.12),transparent_50%)]" aria-hidden />
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(to_bottom,rgba(248,250,252,0.6),transparent_30%)] dark:bg-[linear-gradient(to_bottom,rgba(15,23,42,0.4),transparent_30%)]" aria-hidden />

        <section className="rounded-2xl border border-defaultborder/70 bg-white dark:bg-bodybg shadow-sm shadow-black/[0.03] dark:shadow-none overflow-hidden transition-shadow duration-300 hover:shadow-md hover:shadow-black/[0.04] dark:hover:shadow-none">
          <div className="flex items-center gap-4 px-6 py-5 border-b border-defaultborder/50 bg-gradient-to-r from-slate-50/90 to-white dark:from-white/[0.03] dark:to-transparent">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/10 dark:ring-primary/20" aria-hidden>
              <i className="ri-time-line text-2xl" />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-defaulttextcolor dark:text-white tracking-tight">Assign Shift</h2>
              <p className="text-xs text-defaulttextcolor/60 dark:text-white/50 mt-0.5">
                Training profiles use the training roster; employees without a training profile are listed from the employee record (both stay in sync with attendance where linked).
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
                <p className="text-sm font-medium text-defaulttextcolor/80">Loading people and shifts…</p>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-semibold text-defaulttextcolor mb-2">
                    Select people <span className="text-danger">*</span>
                  </label>
                  <div className="rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all duration-150">
                    <Select
                      isMulti
                      options={personOptions}
                      value={selectedPeople}
                      getOptionValue={(o) => (o as AssignPersonRow).value}
                      getOptionLabel={(o) => (o as AssignPersonRow).label}
                      onChange={(sel: unknown) => {
                        const value = (sel as AssignPersonRow[] | null) ?? [];
                        if (!value.length) {
                          setSelectedPeople([]);
                          return;
                        }
                        const hasAll = value.some((o) => o.value === SELECT_ALL);
                        if (hasAll) {
                          if (selectedPeople.length === people.length) setSelectedPeople([]);
                          else setSelectedPeople(people);
                        } else {
                          setSelectedPeople(value);
                        }
                      }}
                      placeholder="Training profiles and employees…"
                      closeMenuOnSelect={false}
                      className="react-select-container assign-shift-select"
                      classNamePrefix="react-select"
                      isClearable
                      isSearchable
                      filterOption={filterAssignPersonSelectOption}
                      menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
                      menuPosition="fixed"
                    />
                  </div>
                  {selectedPeople.length > 0 && (
                    <p className="mt-1.5 text-xs text-defaulttextcolor/60">{selectedPeople.length} selected</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-defaulttextcolor mb-2">Select Shift <span className="text-danger">*</span></label>
                  <select
                    value={selectedShiftId}
                    onChange={(e) => setSelectedShiftId(e.target.value)}
                    className="w-full rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-defaulttextcolor focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all min-h-[2.75rem]"
                  >
                    <option value="">-- Choose shift --</option>
                    {shifts.map((s) => (
                      <option key={s._id ?? s.id} value={s._id ?? s.id}>
                        {s.name} ({s.startTime}–{s.endTime} {s.timezone})
                      </option>
                    ))}
                  </select>
                  {shifts.length === 0 && (
                    <p className="mt-1.5 text-xs text-warning">No active shifts. Create shifts in Manage Shifts first.</p>
                  )}
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleAssign}
                    disabled={assigning || selectedPeople.length === 0 || !selectedShiftId}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary/90 hover:shadow-md transition-all disabled:opacity-60 disabled:pointer-events-none"
                  >
                    {assigning ? (
                      <><i className="ri-loader-4-line animate-spin text-lg" /> Assigning…</>
                    ) : (
                      <><i className="ri-calendar-check-line text-lg" /> Assign Shift</>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
      <style jsx>{`
        .assign-shift-select :global(.react-select__control) {
          border: none;
          min-height: 2.75rem;
          background: transparent;
          box-shadow: none;
        }
        .assign-shift-select :global(.react-select__control--is-focused) {
          box-shadow: none;
        }
        .assign-shift-select :global(.react-select__placeholder),
        .assign-shift-select :global(.react-select__input-container) {
          color: inherit;
        }
      `}</style>
    </>
  );
}
