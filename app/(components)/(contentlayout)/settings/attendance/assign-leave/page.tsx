"use client";

import React, { useEffect, useState, useCallback } from "react";
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
import Seo from "@/shared/layout-components/seo/seo";
import Swal from "sweetalert2";
import dynamic from "next/dynamic";
import { useAttendanceAdminAccess } from "@/shared/hooks/use-attendance-admin-access";
import { SopAssignChecklistNotice, useSopPreselectStudents } from "@/shared/hooks/use-sop-assign-deeplink";
import { dispatchSopStripRefresh } from "@/shared/lib/sop-strip-preferences";

const Select = dynamic(() => import("react-select"), { ssr: false });

const SELECT_ALL = "__all_students__";

export default function SettingsAttendanceAssignLeavePage() {
  const searchParams = useSearchParams();
  const sopQueryString = searchParams.toString();
  const isAdmin = useAttendanceAdminAccess();
  const [people, setPeople] = useState<AssignPersonRow[]>([]);
  const [selectedPeople, setSelectedPeople] = useState<AssignPersonRow[]>([]);
  const [leaveType, setLeaveType] = useState<"casual" | "sick" | "unpaid">("casual");
  const [dateInput, setDateInput] = useState("");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
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

  useEffect(() => {
    if (isAdmin) {
      setLoading(true);
      fetchPeople().finally(() => setLoading(false));
    }
  }, [isAdmin, fetchPeople]);

  const mergeSopPerson = useCallback((row: AssignPersonRow) => {
    setPeople((prev) => (prev.some((s) => s.value === row.value) ? prev : [row, ...prev]));
  }, []);

  useSopPreselectStudents(people, setSelectedPeople, sopQueryString, mergeSopPerson);

  const personOptions = people.length
    ? [{ value: SELECT_ALL, label: "Select all (training + employees)" } as AssignPersonRow, ...people]
    : people;

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
    if (selectedPeople.length === 0) {
      await Swal.fire({
        icon: "warning",
        title: "No one selected",
        text: "Select at least one training profile or employee",
        confirmButtonText: "OK",
      });
      return;
    }
    if (selectedDates.length === 0) {
      await Swal.fire({ icon: "warning", title: "No dates", text: "Add at least one date", confirmButtonText: "OK" });
      return;
    }
    setAssigning(true);
    setError(null);
    try {
      const chosen = selectedPeople.some((s) => s.value === SELECT_ALL)
        ? people
        : selectedPeople.filter((s) => s.value !== SELECT_ALL);
      if (chosen.length === 0) {
        await Swal.fire({
          icon: "warning",
          title: "No one selected",
          text: "Select at least one training profile or employee",
          confirmButtonText: "OK",
        });
        setAssigning(false);
        return;
      }
      let ids: string[];
      try {
        ids = await resolveStudentIdsForHolidayAssign(chosen);
      } catch (resolveErr: unknown) {
        const msg =
          (resolveErr as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ??
          (resolveErr as { message?: string })?.message ??
          "Could not resolve training profiles. Candidates need the Student role and permission to create a training profile.";
        setError(msg);
        await Swal.fire({ icon: "error", title: "Cannot assign leave", text: msg, confirmButtonText: "OK" });
        setAssigning(false);
        return;
      }
      if (ids.length === 0) {
        await Swal.fire({
          icon: "warning",
          title: "Nothing to assign",
          text: "Select at least one training profile or employee",
          confirmButtonText: "OK",
        });
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
      dispatchSopStripRefresh();
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
                      className="react-select-container assign-leave-select"
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
                  <label className="block text-sm font-semibold text-defaulttextcolor mb-2">Leave Type <span className="text-danger">*</span></label>
                  <div className="inline-flex rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 p-1">
                    {(["casual", "sick", "unpaid"] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setLeaveType(type)}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shrink-0 ${
                          leaveType === type ? "bg-primary text-white shadow-sm" : "text-defaulttextcolor hover:text-primary"
                        }`}
                      >
                        {type === "casual" ? "Casual" : type === "sick" ? "Sick" : "Unpaid"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-5 border border-defaultborder/70 rounded-xl bg-slate-50/60 dark:bg-white/[0.04] dark:border-defaultborder/50">
                  <label className="block text-sm font-semibold text-defaulttextcolor mb-2">Dates <span className="text-danger">*</span></label>
                  <p className="text-xs text-defaulttextcolor/60 mb-3">Add one or more leave dates. Pick a date and click Add Date for each day.</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="date"
                      value={dateInput}
                      onChange={(e) => setDateInput(e.target.value)}
                      className="rounded-lg border border-defaultborder/80 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-defaulttextcolor focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={addDate}
                      className="inline-flex items-center gap-2 rounded-xl border border-defaultborder/80 px-4 py-2.5 text-sm font-medium text-defaulttextcolor hover:bg-defaultborder/20 dark:hover:bg-white/5 transition-colors"
                    >
                      <i className="ri-add-line text-lg" />
                      Add Date
                    </button>
                  </div>
                  {selectedDates.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {selectedDates.map((d) => (
                        <span
                          key={d}
                          className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 px-3 py-1.5 text-xs font-medium dark:bg-primary/20 dark:border-primary/30"
                        >
                          {formatDate(d)}
                          <button
                            type="button"
                            onClick={() => removeDate(d)}
                            className="p-0.5 rounded-full hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors"
                            aria-label="Remove date"
                          >
                            <i className="ri-close-line text-sm" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

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

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleAssign}
                    disabled={assigning || selectedPeople.length === 0 || selectedDates.length === 0}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary/90 hover:shadow-md transition-all disabled:opacity-60 disabled:pointer-events-none"
                  >
                    {assigning ? (
                      <><i className="ri-loader-4-line animate-spin text-lg" /> Assigning…</>
                    ) : (
                      <><i className="ri-calendar-check-line text-lg" /> Assign Leave</>
                    )}
                  </button>
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
