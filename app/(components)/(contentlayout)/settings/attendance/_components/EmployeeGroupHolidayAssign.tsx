"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Swal from "sweetalert2";
import { usePmReactSelectStyles } from "@/shared/hooks/usePmReactSelectStyles";
import { getAllHolidays, type Holiday } from "@/shared/lib/api/holidays";
import {
  assignHolidaysToGroup,
  getAllStudentGroups,
  getGroupStudents,
  getStudentGroupById,
  removeHolidaysFromGroup,
  updateStudentGroup,
  type StudentGroup,
} from "@/shared/lib/api/student-groups";
import { listStudents, type Student } from "@/shared/lib/api/students";
import { effectiveIsActive } from "@/shared/lib/holidays/effectiveHoliday";

const AsyncSelect = dynamic(() => import("react-select/async"), { ssr: false });
const Select = dynamic(() => import("react-select"), { ssr: false });

type GroupOption = { value: string; label: string; group: StudentGroup };

type HolidayOption = { value: string; label: string; holiday: Holiday };

type AssignResult = {
  candidatesUpdated: number;
  holidaysAdded?: number;
  attendanceRecordsCreated?: number;
  skipped?: { studentName: string; holidayTitle: string; date: string; reason: string }[];
};

type RemoveResult = {
  candidatesUpdated: number;
  holidaysRemoved?: number;
  attendanceRecordsDeleted?: number;
  skipped?: { studentName: string; holidayTitle: string; date: string; reason: string }[];
};

type HolidayRef = string | { _id?: string; id?: string; title?: string; date?: string; endDate?: string | null };
type StudentOption = { value: string; label: string; student: Student };

const GROUP_SEARCH_LIMIT = 25;
const SELECT_ALL = "__all_students__";
const MAX_MEMBER_PAGES = 50;

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

function memberCount(group: StudentGroup | null): number {
  if (!group) return 0;
  if (typeof group.studentCount === "number") return group.studentCount;
  return (group.students ?? []).length;
}

function extractHolidayIds(refs: HolidayRef[] | undefined): string[] {
  return (refs ?? [])
    .map((h) => (typeof h === "string" ? h : String(h._id ?? h.id ?? "")))
    .filter(Boolean);
}

function intersectIds(arrays: string[][]): string[] {
  if (arrays.length === 0) return [];
  const [first, ...rest] = arrays;
  return first.filter((id) => rest.every((arr) => arr.includes(id)));
}

function holidayToOption(h: Holiday): HolidayOption {
  const value = String(h._id ?? h.id ?? "");
  const dateLabel = h.endDate ? `${formatDate(h.date)} – ${formatDate(h.endDate)}` : formatDate(h.date);
  return { value, label: `${h.title} (${dateLabel})`, holiday: h };
}

async function resolveAssignedHolidayIds(groupId: string, group: StudentGroup): Promise<string[]> {
  const fromGroupDoc = extractHolidayIds(group.holidays as HolidayRef[] | undefined);
  const count = memberCount(group);
  if (count === 0) return fromGroupDoc;

  try {
    const memberHolidayArrays: string[][] = [];
    let page = 1;
    let totalPages = 1;
    while (page <= totalPages && page <= MAX_MEMBER_PAGES) {
      const res = await getGroupStudents(groupId, { page, limit: 100 });
      const data = res.data;
      const nextTotalPages = Number(data?.totalPages);
      totalPages = Number.isFinite(nextTotalPages) && nextTotalPages > 0 ? nextTotalPages : 1;
      for (const s of data?.results ?? []) {
        memberHolidayArrays.push(extractHolidayIds((s as { holidays?: HolidayRef[] }).holidays));
      }
      if ((data?.results ?? []).length === 0) break;
      page += 1;
    }

    if (memberHolidayArrays.length === 0) return fromGroupDoc;
    const sharedByMembers = intersectIds(memberHolidayArrays);
    return Array.from(new Set([...fromGroupDoc, ...sharedByMembers]));
  } catch {
    return fromGroupDoc;
  }
}

function resolveHolidayObjects(
  ids: string[],
  holidayList: Holiday[],
  populatedRefs?: HolidayRef[]
): Holiday[] {
  const byId = new Map(holidayList.map((h) => [String(h._id ?? h.id ?? ""), h]));
  const result: Holiday[] = [];
  const seen = new Set<string>();

  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    const fromList = byId.get(id);
    if (fromList) {
      result.push(fromList);
      continue;
    }
    const populated = (populatedRefs ?? []).find(
      (r) => typeof r !== "string" && String(r._id ?? r.id ?? "") === id
    );
    if (populated && typeof populated !== "string") {
      result.push({
        _id: id,
        title: populated.title ?? "Unknown holiday",
        date: populated.date ?? "",
        endDate: populated.endDate ?? null,
        isActive: true,
      } as Holiday);
    }
  }

  return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export default function EmployeeGroupHolidayAssign({ embedded = false }: { embedded?: boolean }) {
  const { menuPortalTarget: selectMenuPortalTarget, styles: selectMenuLayerStyles } =
    usePmReactSelectStyles(10060);
  const refDate = useMemo(() => new Date(), []);

  const [selectedGroup, setSelectedGroup] = useState<GroupOption | null>(null);
  const selectedGroupId = selectedGroup?.value ?? null;
  const [groupDetails, setGroupDetails] = useState<StudentGroup | null>(null);
  const [assignedHolidayIds, setAssignedHolidayIds] = useState<string[]>([]);
  const [loadingGroupDetails, setLoadingGroupDetails] = useState(false);
  const [groupRefreshKey, setGroupRefreshKey] = useState(0);
  const groupDetailsRequestIdRef = useRef(0);

  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [selectedHolidays, setSelectedHolidays] = useState<HolidayOption[]>([]);
  const [loadingHolidays, setLoadingHolidays] = useState(false);

  const [assigning, setAssigning] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assignmentResult, setAssignmentResult] = useState<AssignResult | null>(null);
  const [removalResult, setRemovalResult] = useState<RemoveResult | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({ name: "", description: "" });
  const [selectedStudents, setSelectedStudents] = useState<StudentOption[]>([]);
  const [allStudents, setAllStudents] = useState<StudentOption[]>([]);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const loadGroupOptions = useCallback((inputValue: string, callback: (options: GroupOption[]) => void) => {
    getAllStudentGroups({
      name: inputValue.trim() || undefined,
      isActive: true,
      sortBy: "name:asc",
      page: 1,
      limit: GROUP_SEARCH_LIMIT,
    })
      .then((res) => {
        const groups = res.data?.results ?? [];
        callback(
          groups
            .map((g) => ({
              value: String(g._id ?? g.id ?? ""),
              label: g.name,
              group: g,
            }))
            .filter((o) => o.value)
        );
      })
      .catch(() => callback([]));
  }, []);

  const fetchHolidays = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await listStudents({
        limit: 1000,
        sortBy: "user.name:asc",
        employeeRoleOnly: true,
        excludeResignedEmployed: true,
      });
      const list = res.results ?? [];
      setAllStudents(
        list
          .map((s) => ({
            value: s.id,
            label: `${s.user?.name ?? "Unknown"} (${s.user?.email ?? ""})`,
            student: s,
          }))
          .filter((o) => o.value)
      );
    } catch {
      setAllStudents([]);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const refreshGroupDetails = useCallback(async () => {
    if (!selectedGroupId) {
      setGroupDetails(null);
      setAssignedHolidayIds([]);
      setSelectedHolidays([]);
      return;
    }

    const requestId = ++groupDetailsRequestIdRef.current;
    setLoadingGroupDetails(true);
    setError(null);
    try {
      const res = await getStudentGroupById(selectedGroupId);
      if (requestId !== groupDetailsRequestIdRef.current) return;

      const full = (res as { data?: StudentGroup }).data ?? (res as StudentGroup);
      setGroupDetails(full);

      const assignedIds = await resolveAssignedHolidayIds(selectedGroupId, full);
      if (requestId !== groupDetailsRequestIdRef.current) return;

      setAssignedHolidayIds(assignedIds);

      setSelectedGroup((prev) => {
        if (!prev || prev.value !== selectedGroupId) return prev;
        const nextLabel = full.name ?? prev.label;
        if (prev.label === nextLabel) return prev;
        return { ...prev, label: nextLabel };
      });
    } catch (err: unknown) {
      if (requestId !== groupDetailsRequestIdRef.current) return;
      setGroupDetails(null);
      setAssignedHolidayIds([]);
      setError((err as { message?: string })?.message ?? "Failed to load group details");
    } finally {
      if (requestId === groupDetailsRequestIdRef.current) {
        setLoadingGroupDetails(false);
      }
    }
  }, [selectedGroupId]);

  useEffect(() => {
    if (!selectedGroupId) {
      setGroupDetails(null);
      setAssignedHolidayIds([]);
      setSelectedHolidays([]);
      return;
    }
    refreshGroupDetails();
  }, [selectedGroupId, groupRefreshKey, refreshGroupDetails]);

  const pickerHolidays = useMemo(
    () => holidays.filter((h) => effectiveIsActive(h, refDate)),
    [holidays, refDate]
  );

  useEffect(() => {
    if (!selectedGroupId || assignedHolidayIds.length === 0 || pickerHolidays.length === 0) {
      if (!selectedGroupId) return;
      if (assignedHolidayIds.length === 0) setSelectedHolidays([]);
      return;
    }
    const assignedSet = new Set(assignedHolidayIds);
    const autoSelected = pickerHolidays
      .filter((h) => {
        const hid = String(h._id ?? h.id ?? "");
        return hid && assignedSet.has(hid);
      })
      .map(holidayToOption)
      .filter((o) => o.value);
    setSelectedHolidays(autoSelected);
  }, [selectedGroupId, assignedHolidayIds, pickerHolidays]);

  const assignedHolidays = useMemo(
    () => resolveHolidayObjects(assignedHolidayIds, holidays, groupDetails?.holidays as HolidayRef[] | undefined),
    [assignedHolidayIds, holidays, groupDetails?.holidays]
  );

  const assignedHolidayIdSet = useMemo(() => new Set(assignedHolidayIds), [assignedHolidayIds]);

  const openEditModal = useCallback(async () => {
    if (!groupDetails || !selectedGroup?.value) return;
    const studentIds = (groupDetails.students ?? []) as (
      | string
      | { _id?: string; id?: string; user?: { name?: string; email?: string } }
    )[];
    const ids = studentIds.map((s) => (typeof s === "string" ? s : s._id ?? s.id ?? "")).filter(Boolean);
    const opts: StudentOption[] = ids.map((id) => {
      const match = allStudents.find((a) => a.value === id);
      return match ?? { value: id, label: "Unknown employee", student: { id } as Student };
    });
    setSelectedStudents(opts);
    setEditFormData({
      name: groupDetails.name ?? "",
      description: groupDetails.description ?? "",
    });
    setShowEditModal(true);
  }, [groupDetails, selectedGroup?.value, allStudents]);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup?.value) return;
    if (!editFormData.name.trim()) {
      await Swal.fire({
        icon: "warning",
        title: "Validation",
        text: "Group name is required",
        confirmButtonText: "OK",
      });
      return;
    }
    setEditSubmitting(true);
    try {
      await updateStudentGroup(selectedGroup.value, {
        name: editFormData.name.trim(),
        description: editFormData.description.trim() || undefined,
        studentIds: selectedStudents.map((s) => s.value),
      });
      await Swal.fire({ icon: "success", title: "Success", text: "Group updated", confirmButtonText: "OK" });
      setShowEditModal(false);
      setSelectedGroup((prev) =>
        prev ? { ...prev, label: editFormData.name.trim() } : prev
      );
      setGroupRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      await Swal.fire({
        icon: "error",
        title: "Error",
        text:
          (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data
            ?.message ?? (err as { message?: string })?.message ?? "Failed to update group",
        confirmButtonText: "OK",
      });
    } finally {
      setEditSubmitting(false);
    }
  };

  const studentOptions = allStudents.length
    ? [{ value: SELECT_ALL, label: "Select All Employees", student: {} as Student }, ...allStudents]
    : allStudents;

  const holidayGroupNames = useMemo(
    () =>
      Array.from(new Set(pickerHolidays.map((h) => (h.group ?? "").trim()).filter(Boolean))).sort(),
    [pickerHolidays]
  );

  const allPickerSelected =
    pickerHolidays.length > 0 &&
    pickerHolidays.every((h) =>
      selectedHolidays.some((s) => s.value === String(h._id ?? h.id ?? ""))
    );

  const selectHolidayGroup = (groupName: string) => {
    if (!groupName) return;
    const inGroup = pickerHolidays.filter((h) => (h.group ?? "").trim() === groupName);
    setSelectedHolidays((prev) => {
      const existing = new Set(prev.map((x) => x.value));
      const additions = inGroup
        .map((h) => {
          const value = String(h._id ?? h.id ?? "");
          const dateLabel = h.endDate
            ? `${formatDate(h.date)} – ${formatDate(h.endDate)}`
            : formatDate(h.date);
          return { value, label: `${h.title} (${dateLabel})`, holiday: h };
        })
        .filter((o) => o.value && !existing.has(o.value));
      return [...prev, ...additions];
    });
  };

  const handleAssign = async () => {
    if (!selectedGroup?.value) {
      await Swal.fire({
        icon: "warning",
        title: "No group selected",
        text: "Select an employee group first",
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
      const response = (await assignHolidaysToGroup(
        selectedGroup.value,
        selectedHolidays.map((h) => h.value)
      )) as { message?: string; data?: AssignResult };
      setAssignmentResult(response.data ?? null);
      await Swal.fire({
        icon: "success",
        title: "Success",
        html: `
          <p class="mb-3">${response?.message ?? "Holidays assigned to group successfully"}</p>
          <div class="text-left text-sm space-y-1">
            <p><strong>Students Updated:</strong> ${response?.data?.candidatesUpdated ?? 0}</p>
            <p><strong>Holidays Added:</strong> ${response?.data?.holidaysAdded ?? 0}</p>
            <p><strong>Attendance Records Created:</strong> ${response?.data?.attendanceRecordsCreated ?? 0}</p>
          </div>
        `,
        confirmButtonText: "OK",
      });
      setGroupRefreshKey((k) => k + 1);
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
    if (!selectedGroup?.value) {
      await Swal.fire({
        icon: "warning",
        title: "No group selected",
        text: "Select an employee group first",
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
    const count = memberCount(groupDetails);
    const result = await Swal.fire({
      icon: "warning",
      title: "Remove Holidays?",
      html: `
        <p class="mb-3">Remove the selected holidays from <strong>${selectedGroup.label}</strong>${count ? ` (${count} member${count === 1 ? "" : "s"})` : ""}?</p>
        <p class="text-sm text-gray-600">This removes holiday IDs from each member and deletes attendance records with status "Holiday" for those dates.</p>
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
      const response = (await removeHolidaysFromGroup(
        selectedGroup.value,
        selectedHolidays.map((h) => h.value)
      )) as { message?: string; data?: RemoveResult };
      setRemovalResult(response.data ?? null);
      await Swal.fire({
        icon: "success",
        title: "Success",
        html: `
          <p class="mb-3">${response?.message ?? "Holidays removed from group successfully"}</p>
          <div class="text-left text-sm space-y-1">
            <p><strong>Students Updated:</strong> ${response?.data?.candidatesUpdated ?? 0}</p>
            <p><strong>Holidays Removed:</strong> ${response?.data?.holidaysRemoved ?? 0}</p>
            <p><strong>Attendance Records Deleted:</strong> ${response?.data?.attendanceRecordsDeleted ?? 0}</p>
          </div>
        `,
        confirmButtonText: "OK",
      });
      setGroupRefreshKey((k) => k + 1);
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
    setSelectedGroup(null);
    setGroupDetails(null);
    setAssignedHolidayIds([]);
    setSelectedHolidays([]);
    setAssignmentResult(null);
    setRemovalResult(null);
    setError(null);
  };

  const content = (
    <div className={embedded ? "space-y-5" : "px-6 py-6 border-t border-defaultborder/50 space-y-5 bg-gradient-to-b from-slate-50/50 to-transparent dark:from-white/[0.02] dark:to-transparent"}>
      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 dark:bg-danger/15 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-defaulttextcolor">
          Select Employee Group <span className="text-danger">*</span>
        </label>
        <div className="rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all duration-150">
          <AsyncSelect
            cacheOptions
            defaultOptions
            loadOptions={loadGroupOptions}
            value={selectedGroup}
            onChange={(sel) => {
              setSelectedGroup(sel as GroupOption | null);
              setAssignmentResult(null);
              setRemovalResult(null);
            }}
            getOptionLabel={(o) => (o as GroupOption).label}
            getOptionValue={(o) => (o as GroupOption).value}
            placeholder="Search employee groups by name…"
            isClearable
            className="react-select-container assign-holidays-group-select"
            classNamePrefix="react-select"
            menuPortalTarget={selectMenuPortalTarget}
            menuPosition="fixed"
            styles={selectMenuLayerStyles}
            noOptionsMessage={({ inputValue }) =>
              inputValue.trim() ? `No groups matching "${inputValue}"` : "Type to search groups"
            }
          />
        </div>
      </div>

      {selectedGroup && (
        <div className="rounded-xl border border-defaultborder/70 bg-white dark:bg-white/[0.03] p-4">
          {loadingGroupDetails ? (
            <div className="flex items-center gap-2 text-sm text-defaulttextcolor/70">
              <i className="ri-loader-4-line animate-spin" />
              Loading group details…
            </div>
          ) : groupDetails ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <h3 className="font-semibold text-defaulttextcolor">{groupDetails.name}</h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    <i className="ri-user-line" />
                    {memberCount(groupDetails)} member{memberCount(groupDetails) === 1 ? "" : "s"}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success">
                    <i className="ri-calendar-check-line" />
                    {assignedHolidays.length} holiday{assignedHolidays.length === 1 ? "" : "s"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={openEditModal}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-defaultborder/80 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors shrink-0"
                  title="Edit group"
                >
                  <i className="ri-edit-line" />
                  Edit group
                </button>
              </div>
              {groupDetails.description ? (
                <p className="text-sm text-defaulttextcolor/70">{groupDetails.description}</p>
              ) : (
                <p className="text-sm text-defaulttextcolor/50 italic">No description</p>
              )}
              {memberCount(groupDetails) === 0 && (
                <p className="text-sm text-warning">
                  This group has no members yet. Use Edit group to add employees before assigning holidays.
                </p>
              )}
              <div className="pt-3 border-t border-defaultborder/50">
                <p className="text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/60 mb-2">
                  Assigned holidays
                </p>
                {assignedHolidays.length === 0 ? (
                  <p className="text-sm text-defaulttextcolor/50 italic">No holidays assigned yet</p>
                ) : (
                  <ul className="flex flex-wrap gap-2">
                    {assignedHolidays.map((h) => {
                      const hid = String(h._id ?? h.id ?? "");
                      return (
                        <li
                          key={hid}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-success/30 bg-success/5 px-2.5 py-1 text-xs text-defaulttextcolor"
                        >
                          <i className="ri-calendar-event-line text-success" />
                          <span className="font-medium">{h.title}</span>
                          <span className="text-defaulttextcolor/60">
                            {h.endDate
                              ? `${formatDate(h.date)} – ${formatDate(h.endDate)}`
                              : formatDate(h.date)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-defaulttextcolor/60">Could not load group details.</p>
          )}
        </div>
      )}

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <label className="block text-sm font-semibold text-defaulttextcolor">
            Select Holidays <span className="text-danger">*</span>
          </label>
          <div className="flex items-center gap-3">
            {holidayGroupNames.length > 0 && (
              <select
                value=""
                onChange={(e) => {
                  selectHolidayGroup(e.target.value);
                  e.target.value = "";
                }}
                className="rounded-lg border border-defaultborder/80 bg-white dark:bg-white/5 px-3 py-1.5 text-xs text-defaulttextcolor focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                title="Add all holidays in a holiday group label"
              >
                <option value="">+ Add holiday group…</option>
                {holidayGroupNames.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            )}
            {pickerHolidays.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (allPickerSelected) {
                    setSelectedHolidays([]);
                  } else {
                    setSelectedHolidays(pickerHolidays.map(holidayToOption).filter((o) => o.value));
                  }
                }}
                className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                {allPickerSelected ? "Deselect All" : "Select All"}
              </button>
            )}
          </div>
        </div>
        {loadingHolidays ? (
          <div className="flex items-center gap-2 text-defaulttextcolor/70">
            <i className="ri-loader-4-line animate-spin" />
            <span>Loading holidays…</span>
          </div>
        ) : pickerHolidays.length === 0 ? (
          <p className="rounded-xl border border-warning/30 bg-warning/10 dark:bg-warning/15 px-4 py-3 text-sm text-warning">
            No upcoming holidays available. Create holidays first in Holidays List.
          </p>
        ) : (
          <div className="max-h-96 overflow-y-auto rounded-xl border border-defaultborder/70 bg-slate-50/40 dark:bg-white/[0.03] p-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pickerHolidays.map((holiday) => {
                const hid = String(holiday._id ?? holiday.id ?? "");
                const isSelected = selectedHolidays.some((h) => h.value === hid);
                const isAssignedToGroup = assignedHolidayIdSet.has(hid);
                return (
                  <label
                    key={hid}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all hover:border-primary/70 ${
                      isSelected
                        ? "border-primary bg-primary/10 dark:bg-primary/15"
                        : isAssignedToGroup
                          ? "border-success/50 bg-success/5 dark:bg-success/10"
                          : "border-defaultborder/80 hover:bg-black/5 dark:hover:bg-white/5"
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
                      {holiday.group ? (
                        <div className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          <i className="ri-folder-2-line" />
                          {holiday.group}
                        </div>
                      ) : null}
                      <div className="text-sm text-defaulttextcolor/70">
                        {holiday.endDate
                          ? `${formatDate(holiday.date)} – ${formatDate(holiday.endDate)}`
                          : formatDate(holiday.date)}
                      </div>
                      {isAssignedToGroup && (
                        <span className="mt-1 ml-1 inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                          <i className="ri-check-line" />
                          Assigned to group
                        </span>
                      )}
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
          <p className="mt-1.5 text-xs text-defaulttextcolor/60">
            {selectedHolidays.length} of {pickerHolidays.length} holiday(s) selected
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-3 pt-1">
        <button
          type="button"
          onClick={handleAssign}
          disabled={
            assigning ||
            removing ||
            !selectedGroup ||
            selectedHolidays.length === 0 ||
            memberCount(groupDetails) === 0
          }
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary/90 hover:shadow-md transition-all disabled:opacity-60 disabled:pointer-events-none"
        >
          {assigning ? (
            <>
              <i className="ri-loader-4-line animate-spin text-lg" /> Assigning…
            </>
          ) : (
            <>
              <i className="ri-calendar-check-line text-lg" /> Assign to Group
            </>
          )}
        </button>
        <button
          type="button"
          onClick={handleRemove}
          disabled={
            assigning ||
            removing ||
            !selectedGroup ||
            selectedHolidays.length === 0 ||
            memberCount(groupDetails) === 0
          }
          className="inline-flex items-center gap-2 rounded-xl border border-danger/60 bg-danger/10 px-5 py-2.5 text-sm font-medium text-danger hover:bg-danger/20 dark:bg-danger/15 transition-all disabled:opacity-60 disabled:pointer-events-none"
        >
          {removing ? (
            <>
              <i className="ri-loader-4-line animate-spin text-lg" /> Removing…
            </>
          ) : (
            <>
              <i className="ri-calendar-close-line text-lg" /> Remove from Group
            </>
          )}
        </button>
        <button
          type="button"
          onClick={clearSelections}
          className="inline-flex items-center gap-2 rounded-xl border border-defaultborder/80 px-5 py-2.5 text-sm font-medium text-defaulttextcolor hover:bg-defaultborder/20 dark:hover:bg-white/5 transition-colors"
        >
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
            <p>
              <strong>Students Updated:</strong> {assignmentResult.candidatesUpdated}
            </p>
            <p>
              <strong>Holidays Added:</strong> {assignmentResult.holidaysAdded ?? 0}
            </p>
            <p>
              <strong>Attendance Records Created:</strong>{" "}
              {assignmentResult.attendanceRecordsCreated ?? 0}
            </p>
            {(assignmentResult.skipped?.length ?? 0) > 0 && (
              <p className="text-warning">
                <strong>Skipped:</strong> {assignmentResult.skipped!.length} item(s)
              </p>
            )}
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
            <p>
              <strong>Students Updated:</strong> {removalResult.candidatesUpdated}
            </p>
            <p>
              <strong>Holidays Removed:</strong> {removalResult.holidaysRemoved ?? 0}
            </p>
            <p>
              <strong>Attendance Records Deleted:</strong>{" "}
              {removalResult.attendanceRecordsDeleted ?? 0}
            </p>
            {(removalResult.skipped?.length ?? 0) > 0 && (
              <p className="text-warning">
                <strong>Skipped:</strong> {removalResult.skipped!.length} item(s)
              </p>
            )}
          </div>
        </div>
      )}

      {showEditModal && (
        <div
          className="fixed inset-0 z-[10100] flex items-start sm:items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto"
          onClick={() => setShowEditModal(false)}
          role="presentation"
        >
          <div
            className="my-auto rounded-2xl border border-defaultborder/70 bg-white dark:bg-bodybg shadow-2xl shadow-black/30 w-full max-w-2xl max-h-[calc(100vh-3rem)] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            role="presentation"
          >
            <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-defaultborder/50 bg-gradient-to-r from-slate-50/90 to-white dark:from-white/[0.03] dark:to-transparent">
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/10"
                  aria-hidden
                >
                  <i className="ri-group-line text-xl" />
                </span>
                <h3 className="text-lg font-semibold text-defaulttextcolor dark:text-white truncate">
                  Edit Group
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-2 rounded-xl text-defaulttextcolor/70 hover:text-defaulttextcolor hover:bg-defaultborder/20 transition-colors shrink-0"
                aria-label="Close"
              >
                <i className="ri-close-line text-xl" />
              </button>
            </div>
            <form
              onSubmit={handleEditSubmit}
              className="p-6 space-y-5 bg-gradient-to-b from-slate-50/30 to-transparent dark:from-white/[0.02] dark:to-transparent rounded-b-2xl"
            >
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-defaulttextcolor">
                  Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Dharwin Core"
                  required
                  className="w-full rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-defaulttextcolor placeholder:text-defaulttextcolor/45 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-defaulttextcolor">Description</label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData((p) => ({ ...p, description: e.target.value }))}
                  rows={2}
                  placeholder="Optional description"
                  className="w-full rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-defaulttextcolor placeholder:text-defaulttextcolor/45 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-defaulttextcolor">Employees</label>
                <p className="mb-2 text-xs text-defaulttextcolor/60">
                  Select employees to include in this group.
                </p>
                <div className="rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all duration-150">
                  <Select
                    isMulti
                    options={studentOptions}
                    value={selectedStudents}
                    getOptionLabel={(o) => (o && "label" in o ? o.label : String(o))}
                    getOptionValue={(o) => (o && "value" in o ? o.value : String(o))}
                    onChange={(sel: unknown) => {
                      const value = (sel as StudentOption[] | null) ?? [];
                      if (!value.length) {
                        setSelectedStudents([]);
                        return;
                      }
                      const hasAll = value.some((o) => o.value === SELECT_ALL);
                      if (hasAll) {
                        if (selectedStudents.length === allStudents.length) setSelectedStudents([]);
                        else setSelectedStudents(allStudents);
                      } else {
                        setSelectedStudents(value);
                      }
                    }}
                    placeholder="Select employees…"
                    closeMenuOnSelect={false}
                    className="react-select-container assign-holidays-group-edit-select"
                    classNamePrefix="react-select"
                    isClearable
                    isSearchable
                    menuPortalTarget={selectMenuPortalTarget}
                    menuPosition="fixed"
                    styles={selectMenuLayerStyles}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-3 pt-4 border-t border-defaultborder/50">
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary/90 hover:shadow-md transition-all disabled:opacity-60 disabled:pointer-events-none"
                >
                  {editSubmitting ? (
                    <>
                      <i className="ri-loader-4-line animate-spin text-lg" /> Saving…
                    </>
                  ) : (
                    <>
                      <i className="ri-check-line text-lg" /> Save
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="inline-flex items-center gap-2 rounded-xl border border-defaultborder/80 px-5 py-2.5 text-sm font-medium text-defaulttextcolor hover:bg-defaultborder/20 dark:hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  if (embedded) {
    return (
      <>
        {content}
        <style jsx>{`
          .assign-holidays-group-select :global(.react-select__control) {
            border: none;
            min-height: 2.75rem;
            background: transparent;
            box-shadow: none;
          }
          .assign-holidays-group-select :global(.react-select__control--is-focused) {
            box-shadow: none;
          }
          .assign-holidays-group-select :global(.react-select__placeholder),
          .assign-holidays-group-select :global(.react-select__input-container) {
            color: inherit;
          }
          .assign-holidays-group-edit-select :global(.react-select__control) {
            border: none;
            min-height: 2.75rem;
            background: transparent;
            box-shadow: none;
          }
          .assign-holidays-group-edit-select :global(.react-select__control--is-focused) {
            box-shadow: none;
          }
          .assign-holidays-group-edit-select :global(.react-select__placeholder),
          .assign-holidays-group-edit-select :global(.react-select__input-container) {
            color: inherit;
          }
        `}</style>
      </>
    );
  }

  return (
    <>
      <section className="rounded-2xl border border-defaultborder/70 bg-white dark:bg-bodybg shadow-sm shadow-black/[0.03] dark:shadow-none overflow-hidden transition-shadow duration-300 hover:shadow-md hover:shadow-black/[0.04] dark:hover:shadow-none">
        <div className="flex items-center gap-4 px-6 py-5 border-b border-defaultborder/50 bg-gradient-to-r from-slate-50/90 to-white dark:from-white/[0.03] dark:to-transparent">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/10 dark:ring-primary/20"
            aria-hidden
          >
            <i className="ri-group-line text-2xl" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-defaulttextcolor dark:text-white tracking-tight">
              Group Assignment
            </h2>
            <p className="text-xs text-defaulttextcolor/60 dark:text-white/50 mt-0.5">
              Assign or remove holidays for all members of an Employee Group
            </p>
          </div>
        </div>
        {content}
      </section>
      <style jsx>{`
        .assign-holidays-group-select :global(.react-select__control) {
          border: none;
          min-height: 2.75rem;
          background: transparent;
          box-shadow: none;
        }
        .assign-holidays-group-select :global(.react-select__control--is-focused) {
          box-shadow: none;
        }
        .assign-holidays-group-select :global(.react-select__placeholder),
        .assign-holidays-group-select :global(.react-select__input-container) {
          color: inherit;
        }
        .assign-holidays-group-edit-select :global(.react-select__control) {
          border: none;
          min-height: 2.75rem;
          background: transparent;
          box-shadow: none;
        }
        .assign-holidays-group-edit-select :global(.react-select__control--is-focused) {
          box-shadow: none;
        }
        .assign-holidays-group-edit-select :global(.react-select__placeholder),
        .assign-holidays-group-edit-select :global(.react-select__input-container) {
          color: inherit;
        }
      `}</style>
    </>
  );
}
