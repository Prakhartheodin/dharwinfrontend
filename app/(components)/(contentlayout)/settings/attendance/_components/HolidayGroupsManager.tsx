"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  getAllHolidayGroups,
  getHolidayGroupById,
  createHolidayGroup,
  updateHolidayGroup,
  deleteHolidayGroup,
  type HolidayGroup,
} from "@/shared/lib/api/holiday-groups";
import { getAllHolidays, type Holiday } from "@/shared/lib/api/holidays";
import { assignHolidaysToStudents, removeHolidaysFromStudents } from "@/shared/lib/api/attendance";
import { listStudents } from "@/shared/lib/api/students";
import { listCandidates } from "@/shared/lib/api/candidates";
import {
  buildMergedAssignPeopleOptions,
  filterAssignPersonSelectOption,
  resolveStudentIdsForHolidayAssign,
  type AssignPersonRow,
} from "@/shared/lib/attendance-assign-people-options";
import Seo from "@/shared/layout-components/seo/seo";
import Swal from "sweetalert2";
import { useAttendanceAdminAccess } from "@/shared/hooks/use-attendance-admin-access";
import { usePmReactSelectStyles } from "@/shared/hooks/usePmReactSelectStyles";

const Select = dynamic(() => import("react-select"), { ssr: false });

const pageStyles = (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
    .holiday-groups-page { font-family: 'Figtree', ui-sans-serif, system-ui, sans-serif; }
  `}</style>
);

/**
 * Full holiday-group manager: create groups, attach dates + member employees, and
 * assign/remove the group's dates to/from all members in one click.
 *
 * @param embedded when true, drops the page chrome (Seo, outer card) so it can sit inside
 *                 the Assign Holidays "Group Assignment" tab.
 */
export default function HolidayGroupsManager({ embedded = false }: { embedded?: boolean }) {
  const isAdmin = useAttendanceAdminAccess();
  const { menuPortalTarget } = usePmReactSelectStyles(10160);

  // Theme-aware react-select styles: primary-tint chips + clear typeahead, both light/dark.
  const [isDarkSelect, setIsDarkSelect] = useState(false);
  useEffect(() => {
    const el = document.documentElement;
    const update = () => setIsDarkSelect(el.classList.contains("dark"));
    update();
    const obs = new MutationObserver(update);
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  const memberSelectStyles = useMemo(() => {
    const PRIMARY = "#6366f1";
    const dark = isDarkSelect;
    return {
      menuPortal: (b: Record<string, unknown>) => ({ ...b, zIndex: 10160 }),
      menu: (b: Record<string, unknown>) => ({
        ...b,
        zIndex: 10160,
        ...(dark ? { background: "#1e293b", border: "1px solid rgba(148,163,184,0.22)" } : {}),
      }),
      control: (b: Record<string, unknown>, s: { isFocused: boolean }) => ({
        ...b,
        minHeight: "2.75rem",
        borderRadius: "0.75rem",
        background: dark ? "rgba(15,23,42,0.55)" : "#fff",
        borderColor: s.isFocused ? PRIMARY : dark ? "rgba(148,163,184,0.25)" : "rgba(148,163,184,0.45)",
        boxShadow: s.isFocused ? "0 0 0 2px rgba(99,102,241,0.20)" : "none",
        ":hover": { borderColor: s.isFocused ? PRIMARY : dark ? "rgba(148,163,184,0.4)" : "rgba(148,163,184,0.65)" },
      }),
      valueContainer: (b: Record<string, unknown>) => ({ ...b, gap: "4px", padding: "4px 8px" }),
      input: (b: Record<string, unknown>) => ({ ...b, color: dark ? "#e2e8f0" : "#0f172a" }),
      placeholder: (b: Record<string, unknown>) => ({ ...b, color: "#94a3b8" }),
      multiValue: (b: Record<string, unknown>) => ({
        ...b,
        borderRadius: "9999px",
        background: dark ? "rgba(99,102,241,0.25)" : "rgba(99,102,241,0.12)",
        border: dark ? "1px solid rgba(99,102,241,0.4)" : "1px solid rgba(99,102,241,0.25)",
        overflow: "hidden",
      }),
      multiValueLabel: (b: Record<string, unknown>) => ({
        ...b,
        color: dark ? "#c7d2fe" : "#4338ca",
        fontWeight: 500,
        fontSize: "0.8125rem",
        padding: "2px 4px 2px 10px",
      }),
      multiValueRemove: (b: Record<string, unknown>) => ({
        ...b,
        color: dark ? "#c7d2fe" : "#6366f1",
        paddingInline: "6px",
        ":hover": { background: "rgba(99,102,241,0.35)", color: dark ? "#fff" : "#312e81" },
      }),
      option: (b: Record<string, unknown>, s: { isSelected: boolean; isFocused: boolean }) => ({
        ...b,
        cursor: "pointer",
        background: s.isSelected
          ? "rgba(99,102,241,0.30)"
          : s.isFocused
            ? dark
              ? "rgba(148,163,184,0.15)"
              : "rgba(99,102,241,0.08)"
            : "transparent",
        color: dark ? "#e2e8f0" : "#0f172a",
      }),
    };
  }, [isDarkSelect]);

  const [groups, setGroups] = useState<HolidayGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<HolidayGroup | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "", isActive: true });
  const [selectedMembers, setSelectedMembers] = useState<AssignPersonRow[]>([]);
  const [people, setPeople] = useState<AssignPersonRow[]>([]);
  const [loadingPeople, setLoadingPeople] = useState(false);
  const [dateOptions, setDateOptions] = useState<{ value: string; label: string }[]>([]);
  const [selectedDates, setSelectedDates] = useState<{ value: string; label: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Assign overlay: pick which dates + which employees to apply, then assign/remove.
  const [assignGroup, setAssignGroup] = useState<HolidayGroup | null>(null);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignBusy, setAssignBusy] = useState<"assign" | "remove" | null>(null);
  const [assignDateIds, setAssignDateIds] = useState<string[]>([]);
  const [assignDates, setAssignDates] = useState<{ id: string; label: string }[]>([]);
  const [assignMembers, setAssignMembers] = useState<AssignPersonRow[]>([]);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAllHolidayGroups({ sortBy: "name:asc", limit: 500 });
      setGroups(res.data?.results ?? []);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ??
        (err as { message?: string })?.message ??
        "Failed to fetch holiday groups";
      setError(msg);
      await Swal.fire({ icon: "error", title: "Error", text: msg, confirmButtonText: "OK" });
    } finally {
      setLoading(false);
    }
  }, []);

  const dateLabel = (h: Holiday) => {
    const fmt = (d: string) => {
      try {
        return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
      } catch {
        return d;
      }
    };
    return `${h.title} · ${h.endDate ? `${fmt(h.date)} – ${fmt(h.endDate)}` : fmt(h.date)}`;
  };

  const fetchDates = useCallback(async () => {
    try {
      const res = await getAllHolidays({ isActive: true, sortBy: "date:asc", limit: 1000 });
      const data = (res as { data?: { results?: Holiday[] } | Holiday[] }).data;
      const list = Array.isArray(data) ? data : data?.results ?? [];
      setDateOptions(list.map((h) => ({ value: String(h._id ?? h.id ?? ""), label: dateLabel(h) })).filter((o) => o.value));
    } catch {
      setDateOptions([]);
    }
  }, []);

  const fetchPeople = useCallback(async () => {
    setLoadingPeople(true);
    try {
      const [stuRes, candRes] = await Promise.all([
        listStudents({ limit: 1000, sortBy: "user.name:asc" }),
        listCandidates({ limit: 1000, employmentStatus: "all", sortBy: "fullName:asc" }),
      ]);
      setPeople(buildMergedAssignPeopleOptions(stuRes.results ?? [], candRes.results ?? []));
    } catch {
      setPeople([]);
    } finally {
      setLoadingPeople(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin === true) {
      fetchGroups();
      fetchPeople();
      fetchDates();
    }
  }, [isAdmin, fetchGroups, fetchPeople, fetchDates]);

  const resetForm = () => {
    setFormData({ name: "", description: "", isActive: true });
    setSelectedMembers([]);
    setSelectedDates([]);
    setEditing(null);
    setShowForm(false);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = async (group: HolidayGroup) => {
    setEditing(group);
    setFormData({ name: group.name, description: group.description ?? "", isActive: group.isActive ?? true });
    setSelectedMembers([]);
    setSelectedDates([]);
    setShowForm(true);
    try {
      const full = (await getHolidayGroupById((group._id ?? group.id)!)).data;
      const rows: AssignPersonRow[] = (full.members ?? []).map((m) => ({
        kind: "student" as const,
        value: String(m._id ?? m.id ?? ""),
        label: `${m.user?.name ?? "Unknown"} (${m.user?.email ?? "—"}) · Training`,
        student: { user: m.user } as never,
      }));
      setSelectedMembers(rows.filter((r) => r.value));
      const dates = (full.holidays ?? []).map((h) => ({
        value: String(h._id ?? h.id ?? ""),
        label: dateLabel(h as Holiday),
      }));
      setSelectedDates(dates.filter((d) => d.value));
    } catch {
      /* stay empty; admin can re-pick */
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      await Swal.fire({ icon: "warning", title: "Validation Error", text: "Group name is required", confirmButtonText: "OK" });
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      let memberIds: string[] = [];
      if (selectedMembers.length > 0) {
        memberIds = await resolveStudentIdsForHolidayAssign(selectedMembers);
      }
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        isActive: formData.isActive,
        memberIds,
        holidayIds: selectedDates.map((d) => d.value),
      };
      if (editing) {
        await updateHolidayGroup((editing._id ?? editing.id)!, payload);
        await Swal.fire({ icon: "success", title: "Success", text: "Holiday group updated", confirmButtonText: "OK" });
      } else {
        await createHolidayGroup(payload);
        await Swal.fire({ icon: "success", title: "Success", text: "Holiday group created", confirmButtonText: "OK" });
      }
      resetForm();
      await fetchGroups();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ??
        (err as { message?: string })?.message ??
        "Failed to save holiday group";
      setError(msg);
      await Swal.fire({ icon: "error", title: "Error", text: msg, confirmButtonText: "OK" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (group: HolidayGroup) => {
    const count = group.holidayCount ?? 0;
    const result = await Swal.fire({
      icon: "warning",
      title: "Delete Holiday Group",
      html: `Delete <strong>${group.name}</strong>?${
        count > 0
          ? `<br/><span class="text-sm text-gray-600">${count} holiday date(s) will be ungrouped (not deleted). Assigned members will have these dates removed from their dashboard and attendance.</span>`
          : ""
      }`,
      showCancelButton: true,
      confirmButtonText: "Yes, delete it",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
    });
    if (!result.isConfirmed) return;
    try {
      await deleteHolidayGroup((group._id ?? group.id)!);
      await Swal.fire({ icon: "success", title: "Deleted", text: "Holiday group deleted", confirmButtonText: "OK" });
      await fetchGroups();
    } catch (err: unknown) {
      await Swal.fire({
        icon: "error",
        title: "Error",
        text:
          (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ??
          (err as { message?: string })?.message ??
          "Failed to delete holiday group",
        confirmButtonText: "OK",
      });
    }
  };

  const openAssign = async (group: HolidayGroup) => {
    setAssignGroup(group);
    setAssignLoading(true);
    setAssignDates([]);
    setAssignDateIds([]);
    setAssignMembers([]);
    try {
      const full = (await getHolidayGroupById((group._id ?? group.id)!)).data;
      const dates = (full.holidays ?? [])
        .map((h) => ({ id: String(h._id ?? h.id ?? ""), label: dateLabel(h as Holiday) }))
        .filter((d) => d.id);
      setAssignDates(dates);
      setAssignDateIds(dates.map((d) => d.id)); // default: all dates selected
      const memberIds = new Set((full.members ?? []).map((m) => String(m._id ?? m.id ?? "")));
      const fromPeople = people.filter((p) => p.kind === "student" && memberIds.has(p.value));
      const rows: AssignPersonRow[] =
        fromPeople.length > 0
          ? fromPeople
          : (full.members ?? []).map((m) => ({
              kind: "student" as const,
              value: String(m._id ?? m.id ?? ""),
              label: `${m.user?.name ?? "Unknown"} (${m.user?.email ?? "—"}) · Training`,
              student: { user: m.user } as never,
            }));
      setAssignMembers(rows.filter((r) => r.value));
    } catch {
      setAssignDates([]);
      setAssignMembers([]);
    } finally {
      setAssignLoading(false);
    }
  };

  const confirmAssign = async (mode: "assign" | "remove") => {
    if (!assignGroup) return;
    if (assignDateIds.length === 0) {
      await Swal.fire({ icon: "warning", title: "No dates selected", text: "Pick at least one holiday date.", confirmButtonText: "OK" });
      return;
    }
    if (assignMembers.length === 0) {
      await Swal.fire({ icon: "warning", title: "No employees selected", text: "Pick at least one employee.", confirmButtonText: "OK" });
      return;
    }
    if (mode === "remove") {
      const ok = await Swal.fire({
        icon: "warning",
        title: "Remove holidays?",
        html: `Remove ${assignDateIds.length} date(s) from ${assignMembers.length} employee(s)?`,
        showCancelButton: true,
        confirmButtonText: "Yes, remove",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#d33",
      });
      if (!ok.isConfirmed) return;
    }
    setAssignBusy(mode);
    try {
      const studentIds = await resolveStudentIdsForHolidayAssign(assignMembers);
      const res =
        mode === "assign"
          ? await assignHolidaysToStudents(studentIds, assignDateIds)
          : await removeHolidaysFromStudents(studentIds, assignDateIds);
      const d = (res?.data ?? {}) as {
        candidatesUpdated?: number;
        holidaysAdded?: number;
        holidaysRemoved?: number;
        attendanceRecordsCreated?: number;
        attendanceRecordsDeleted?: number;
      };
      await Swal.fire({
        icon: "success",
        title: "Success",
        html: `
          <p class="mb-3">${res?.message ?? (mode === "assign" ? "Holidays assigned" : "Holidays removed")}</p>
          <div class="text-left text-sm space-y-1">
            <p><strong>Employees Updated:</strong> ${d.candidatesUpdated ?? 0}</p>
            <p><strong>Holidays ${mode === "assign" ? "Added" : "Removed"}:</strong> ${(mode === "assign" ? d.holidaysAdded : d.holidaysRemoved) ?? 0}</p>
            <p><strong>Attendance Records ${mode === "assign" ? "Created" : "Deleted"}:</strong> ${(mode === "assign" ? d.attendanceRecordsCreated : d.attendanceRecordsDeleted) ?? 0}</p>
          </div>
        `,
        confirmButtonText: "OK",
      });
      setAssignGroup(null);
      await fetchGroups();
    } catch (err: unknown) {
      await Swal.fire({
        icon: "error",
        title: "Error",
        text:
          (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ??
          (err as { message?: string })?.message ??
          "Action failed",
        confirmButtonText: "OK",
      });
    } finally {
      setAssignBusy(null);
    }
  };

  const gate = (icon: string, tone: string, title: string, bodyText: string) => {
    const card = (
      <div className="holiday-groups-page w-full">
        <div className="rounded-2xl border border-defaultborder/70 bg-white dark:bg-bodybg shadow-sm overflow-hidden">
          <div className="py-20 px-6 text-center">
            <div className={`inline-flex h-16 w-16 items-center justify-center rounded-2xl ${tone} mb-5`}>
              <i className={`${icon} text-4xl`} />
            </div>
            <h3 className="text-base font-semibold text-defaulttextcolor dark:text-white mb-1">{title}</h3>
            {bodyText ? <p className="text-sm text-defaulttextcolor/70 max-w-md mx-auto">{bodyText}</p> : null}
          </div>
        </div>
      </div>
    );
    return embedded ? card : <><Seo title="Holiday Groups" />{pageStyles}<div className="mt-4">{card}</div></>;
  };

  if (isAdmin === null) return gate("ri-loader-4-line animate-spin", "bg-primary/10 text-primary ring-1 ring-primary/10", "Loading…", "");
  if (!isAdmin) return gate("ri-error-warning-line", "bg-danger/10 text-danger ring-1 ring-danger/20", "Access Denied", "Only administrators can manage holiday groups.");

  const sectionClass = embedded
    ? "overflow-hidden"
    : "rounded-2xl border border-defaultborder/70 bg-white dark:bg-bodybg shadow-sm shadow-black/[0.03] dark:shadow-none overflow-hidden";

  const body = (
    <>
      <section className={sectionClass}>
        <div className={`flex items-center justify-between gap-4 ${embedded ? "pb-4" : "px-6 py-5 border-b border-defaultborder/50 bg-gradient-to-r from-slate-50/90 to-white dark:from-white/[0.03] dark:to-transparent"}`}>
          <div className="flex items-center gap-4 min-w-0">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/10 dark:ring-primary/20" aria-hidden>
              <i className="ri-folder-2-line text-2xl" />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-defaulttextcolor dark:text-white tracking-tight">Holiday Groups</h2>
              <p className="text-xs text-defaulttextcolor/60 dark:text-white/50 mt-0.5">
                Bundle holiday dates + member employees · Assign all dates to all members in one click
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-primary/90 hover:shadow-md active:scale-[0.98]"
          >
            <i className="ri-add-line text-base" />
            New Group
          </button>
        </div>

        {error && (
          <div className={`${embedded ? "" : "mx-6"} mt-4 rounded-xl border border-danger/30 bg-danger/10 dark:bg-danger/15 px-4 py-3 text-sm text-danger`}>{error}</div>
        )}

        <div className={embedded ? "pt-4" : "px-6 py-6"}>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-5 ring-1 ring-primary/10">
                <i className="ri-loader-4-line animate-spin text-4xl" />
              </div>
              <p className="text-sm font-semibold text-defaulttextcolor">Loading groups…</p>
            </div>
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="inline-flex h-24 w-24 items-center justify-center rounded-3xl bg-slate-100 dark:bg-white/10 text-defaulttextcolor/40 mb-5 ring-1 ring-defaultborder/50">
                <i className="ri-folder-2-line text-5xl" />
              </div>
              <p className="text-lg font-semibold text-defaulttextcolor dark:text-white">No holiday groups yet</p>
              <p className="mt-2 max-w-sm text-sm text-defaulttextcolor/60 dark:text-white/60">
                Create a group, pick its holiday dates and member employees, then Assign.
              </p>
              <button
                type="button"
                onClick={openCreate}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary/90 transition-all"
              >
                <i className="ri-add-line" />
                New Group
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-defaultborder/70">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="border-b border-defaultborder/60 bg-slate-50/80 dark:bg-white/[0.04]">
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70">Group</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70">Dates</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70">Members</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70">Status</th>
                    <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-defaultborder/50">
                  {groups.map((group) => {
                    const id = (group._id ?? group.id) as string;
                    return (
                      <tr key={id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-4 max-w-[300px]">
                          <span className="block font-medium text-defaulttextcolor truncate" title={group.name}>{group.name}</span>
                          {group.description ? (
                            <span className="block text-xs text-defaulttextcolor/60 truncate" title={group.description}>{group.description}</span>
                          ) : null}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-white/10 px-2.5 py-1 text-xs font-semibold text-defaulttextcolor/80">
                            <i className="ri-calendar-event-line" />
                            {group.holidayCount ?? 0}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-white/10 px-2.5 py-1 text-xs font-semibold text-defaulttextcolor/80">
                            <i className="ri-group-line" />
                            {group.memberCount ?? 0}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              group.isActive
                                ? "bg-success/10 text-success ring-1 ring-success/20"
                                : "bg-slate-100 dark:bg-white/10 text-defaulttextcolor/70"
                            }`}
                          >
                            {group.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openAssign(group)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
                              title="Assign or remove dates for selected employees"
                            >
                              <i className="ri-calendar-check-line" />
                              Assign…
                            </button>
                            <button
                              type="button"
                              onClick={() => openEdit(group)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-primary hover:bg-primary/10 transition-colors"
                              title="Edit dates & members"
                            >
                              <i className="ri-pencil-line text-lg" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(group)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-danger hover:bg-danger/10 transition-colors"
                              title="Delete"
                            >
                              <i className="ri-delete-bin-line text-lg" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {showForm && (
        <div
          className="fixed inset-0 z-[10100] flex items-start sm:items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto"
          onClick={resetForm}
          role="presentation"
        >
          <div
            className="my-auto rounded-2xl border border-defaultborder/70 bg-white dark:bg-bodybg shadow-2xl shadow-black/30 w-full max-w-lg max-h-[calc(100vh-3rem)] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            role="presentation"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-defaultborder/50 bg-gradient-to-r from-slate-50/90 to-white dark:from-white/[0.03] dark:to-transparent">
              <h3 className="text-lg font-semibold text-defaulttextcolor dark:text-white tracking-tight">
                {editing ? "Edit Holiday Group" : "New Holiday Group"}
              </h3>
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-defaulttextcolor/70 hover:text-defaulttextcolor hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              >
                <i className="ri-close-line text-xl" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-defaulttextcolor">
                  Group Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. US Holidays 2026"
                  className="w-full rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-defaulttextcolor placeholder:text-defaulttextcolor/45 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  required
                  maxLength={120}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-defaulttextcolor">
                  Description <span className="text-defaulttextcolor/60 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Short note"
                  className="w-full rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-defaulttextcolor placeholder:text-defaulttextcolor/45 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  maxLength={500}
                />
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <label className="block text-sm font-semibold text-defaulttextcolor">
                    Holiday Dates <span className="text-defaulttextcolor/60 font-normal">(optional)</span>
                  </label>
                  {selectedDates.length > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                      <i className="ri-calendar-event-line" /> {selectedDates.length} selected
                    </span>
                  )}
                </div>
                <Select
                  isMulti
                  options={dateOptions}
                  value={selectedDates}
                  onChange={(sel: unknown) => setSelectedDates((sel as { value: string; label: string }[] | null) ?? [])}
                  placeholder="Search holidays by name…"
                  closeMenuOnSelect={false}
                  hideSelectedOptions={false}
                  classNamePrefix="react-select"
                  isClearable
                  isSearchable
                  noOptionsMessage={() => "No holidays. Create them in Holidays List."}
                  menuPortalTarget={menuPortalTarget}
                  menuPosition="fixed"
                  maxMenuHeight={280}
                  styles={memberSelectStyles}
                />
                <p className="mt-1.5 text-xs text-defaulttextcolor/60">
                  Pick which holiday dates belong to this group. Create new dates in Holidays List.
                </p>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <label className="block text-sm font-semibold text-defaulttextcolor">
                    Member Employees <span className="text-defaulttextcolor/60 font-normal">(optional)</span>
                  </label>
                  {selectedMembers.length > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                      <i className="ri-group-line" /> {selectedMembers.length} selected
                    </span>
                  )}
                </div>
                {loadingPeople ? (
                  <div className="flex items-center gap-2 text-defaulttextcolor/70 text-sm">
                    <i className="ri-loader-4-line animate-spin" /> Loading people…
                  </div>
                ) : (
                  <Select
                    isMulti
                    options={people}
                    value={selectedMembers}
                    getOptionValue={(o) => (o as AssignPersonRow).value}
                    getOptionLabel={(o) => (o as AssignPersonRow).label}
                    onChange={(sel: unknown) => setSelectedMembers((sel as AssignPersonRow[] | null) ?? [])}
                    placeholder="Search by name, email or employee ID…"
                    closeMenuOnSelect={false}
                    hideSelectedOptions={false}
                    classNamePrefix="react-select"
                    isClearable
                    isSearchable
                    noOptionsMessage={() => "No matching people"}
                    filterOption={filterAssignPersonSelectOption}
                    menuPortalTarget={menuPortalTarget}
                    menuPosition="fixed"
                    maxMenuHeight={280}
                    styles={memberSelectStyles}
                  />
                )}
                <p className="mt-1.5 text-xs text-defaulttextcolor/60">
                  Members get the group&apos;s holiday dates when you click Assign.
                </p>
              </div>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-defaultborder/60 bg-slate-50/50 dark:bg-white/[0.04] px-4 py-3">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData((p) => ({ ...p, isActive: e.target.checked }))}
                  className="rounded border-defaultborder text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium text-defaulttextcolor">Active</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary/90 transition-all disabled:opacity-60"
                >
                  {submitting ? (
                    <><i className="ri-loader-4-line animate-spin text-lg" /> {editing ? "Updating…" : "Creating…"}</>
                  ) : (
                    <><i className="ri-save-line text-lg" /> {editing ? "Update Group" : "Create Group"}</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-defaultborder/80 bg-transparent px-5 py-2.5 text-sm font-medium text-defaulttextcolor hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {assignGroup && (
        <div
          className="fixed inset-0 z-[10100] flex items-start sm:items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto"
          onClick={() => !assignBusy && setAssignGroup(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`Assign holidays for ${assignGroup.name}`}
        >
          <div
            className="my-auto rounded-2xl border border-defaultborder/70 bg-white dark:bg-bodybg shadow-2xl shadow-black/30 w-full max-w-lg max-h-[calc(100vh-3rem)] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            role="presentation"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-defaultborder/50 bg-gradient-to-r from-slate-50/90 to-white dark:from-white/[0.03] dark:to-transparent">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-defaulttextcolor dark:text-white tracking-tight truncate">Assign Holidays</h3>
                <p className="text-xs text-defaulttextcolor/60 dark:text-white/50 mt-0.5 truncate">{assignGroup.name}</p>
              </div>
              <button
                type="button"
                disabled={!!assignBusy}
                onClick={() => setAssignGroup(null)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-defaulttextcolor/70 hover:text-defaulttextcolor hover:bg-slate-100 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
                aria-label="Close"
              >
                <i className="ri-close-line text-xl" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {assignLoading ? (
                <div className="flex items-center gap-2 text-defaulttextcolor/70 text-sm py-6 justify-center">
                  <i className="ri-loader-4-line animate-spin" /> Loading group…
                </div>
              ) : (
                <>
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label className="block text-sm font-semibold text-defaulttextcolor">
                        Dates <span className="text-danger">*</span>
                      </label>
                      {assignDates.length > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            setAssignDateIds((prev) =>
                              prev.length === assignDates.length ? [] : assignDates.map((d) => d.id)
                            )
                          }
                          className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                        >
                          {assignDateIds.length === assignDates.length ? "Deselect all" : "Select all"}
                        </button>
                      )}
                    </div>
                    {assignDates.length === 0 ? (
                      <p className="rounded-xl border border-warning/30 bg-warning/10 dark:bg-warning/15 px-4 py-3 text-sm text-warning">
                        No dates in this group. Add holiday dates via Edit first.
                      </p>
                    ) : (
                      <div className="max-h-52 overflow-y-auto rounded-xl border border-defaultborder/70 bg-slate-50/40 dark:bg-white/[0.03] p-2 space-y-1">
                        {assignDates.map((d) => {
                          const checked = assignDateIds.includes(d.id);
                          return (
                            <label
                              key={d.id}
                              className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors ${
                                checked
                                  ? "border-primary bg-primary/10 dark:bg-primary/15 text-defaulttextcolor"
                                  : "border-transparent hover:bg-black/5 dark:hover:bg-white/5 text-defaulttextcolor/85"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) =>
                                  setAssignDateIds((prev) =>
                                    e.target.checked ? [...prev, d.id] : prev.filter((x) => x !== d.id)
                                  )
                                }
                                className="rounded border-defaultborder text-primary focus:ring-primary"
                              />
                              <i className="ri-calendar-event-line text-defaulttextcolor/50" />
                              <span className="truncate">{d.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                    {assignDates.length > 0 && (
                      <p className="mt-1.5 text-xs text-defaulttextcolor/60">{assignDateIds.length} of {assignDates.length} date(s) selected</p>
                    )}
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <label className="block text-sm font-semibold text-defaulttextcolor">
                        Employees <span className="text-danger">*</span>
                      </label>
                      {assignMembers.length > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                          <i className="ri-group-line" /> {assignMembers.length} selected
                        </span>
                      )}
                    </div>
                    <Select
                      isMulti
                      options={people}
                      value={assignMembers}
                      getOptionValue={(o) => (o as AssignPersonRow).value}
                      getOptionLabel={(o) => (o as AssignPersonRow).label}
                      onChange={(sel: unknown) => setAssignMembers((sel as AssignPersonRow[] | null) ?? [])}
                      placeholder="Search by name, email or employee ID…"
                      closeMenuOnSelect={false}
                      hideSelectedOptions={false}
                      classNamePrefix="react-select"
                      isClearable
                      isSearchable
                      noOptionsMessage={() => "No matching people"}
                      filterOption={filterAssignPersonSelectOption}
                      menuPortalTarget={menuPortalTarget}
                      menuPosition="fixed"
                      maxMenuHeight={240}
                      styles={memberSelectStyles}
                    />
                    <p className="mt-1.5 text-xs text-defaulttextcolor/60">
                      Defaults to the group&apos;s members — add or remove anyone for this run.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => confirmAssign("assign")}
                      disabled={!!assignBusy || assignDateIds.length === 0 || assignMembers.length === 0}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary/90 transition-all disabled:opacity-60 disabled:pointer-events-none"
                    >
                      {assignBusy === "assign" ? <><i className="ri-loader-4-line animate-spin text-lg" /> Assigning…</> : <><i className="ri-calendar-check-line text-lg" /> Assign</>}
                    </button>
                    <button
                      type="button"
                      onClick={() => confirmAssign("remove")}
                      disabled={!!assignBusy || assignDateIds.length === 0 || assignMembers.length === 0}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-danger/60 bg-danger/10 px-5 py-2.5 text-sm font-medium text-danger hover:bg-danger/20 dark:bg-danger/15 transition-all disabled:opacity-60 disabled:pointer-events-none"
                    >
                      {assignBusy === "remove" ? <><i className="ri-loader-4-line animate-spin text-lg" /> Removing…</> : <><i className="ri-calendar-close-line text-lg" /> Remove</>}
                    </button>
                    <button
                      type="button"
                      disabled={!!assignBusy}
                      onClick={() => setAssignGroup(null)}
                      className="rounded-xl border border-defaultborder/80 bg-transparent px-5 py-2.5 text-sm font-medium text-defaulttextcolor hover:bg-slate-100 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (embedded) return <div className="holiday-groups-page space-y-6">{pageStyles}{body}</div>;

  return (
    <>
      <Seo title="Holiday Groups" />
      {pageStyles}
      <div className="holiday-groups-page relative mt-4 space-y-6 min-h-[50vh] w-full">{body}</div>
    </>
  );
}
