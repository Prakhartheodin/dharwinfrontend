"use client";

import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { createDepartment, listAllDepartments, type Department } from "@/shared/lib/api/departments";
import { updateCandidate } from "@/shared/lib/api/employees";
import { OrgFormField, OrgModal, OrgModalCancelButton, OrgModalSubmitButton } from "./org-ui";
import { useFeaturePermissions } from "@/shared/hooks/use-feature-permissions";

const NEW_DEPT = "__new__";

type Employee = { id: string; fullName: string };

type Props = {
  open: boolean;
  employees: Employee[];
  onClose: () => void;
  onAssigned: () => void;
};

export default function AssignToDepartmentModal({ open, employees, onClose, onAssigned }: Props) {
  const { canCreate: canCreateDept } = useFeaturePermissions("organization.departments");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [deptValue, setDeptValue] = useState("");
  const [newDeptName, setNewDeptName] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDeptValue("");
    setNewDeptName("");
    setSearch("");
    setSelected(new Set());
    listAllDepartments()
      .then((d) => setDepartments(d.filter((row) => row.isActive !== false)))
      .catch(() => setDepartments([]));
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? employees.filter((e) => e.fullName.toLowerCase().includes(q)) : employees;
  }, [employees, search]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((e) => selected.has(e.id));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAllFiltered = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) filtered.forEach((e) => next.delete(e.id));
      else filtered.forEach((e) => next.add(e.id));
      return next;
    });

  const creatingNew = deptValue === NEW_DEPT;
  const canSubmit =
    selected.size > 0 && (creatingNew ? newDeptName.trim().length > 0 : deptValue.length > 0) && !saving;

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    try {
      let departmentId = deptValue;
      if (creatingNew) {
        const created = await createDepartment({ name: newDeptName.trim() });
        departmentId = created.id;
      }
      const ids = [...selected];
      await Promise.all(ids.map((id) => updateCandidate(id, { departmentId })));
      onAssigned();
      onClose();
      await Swal.fire({
        icon: "success",
        title: `Assigned ${ids.length} employee${ids.length === 1 ? "" : "s"}`,
        toast: true,
        position: "top-end",
        timer: 2200,
        showConfirmButton: false,
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ??
        (err as { message?: string })?.message ??
        "Assignment failed";
      await Swal.fire({ icon: "error", title: "Couldn't assign", text: msg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <OrgModal
      open={open}
      size="lg"
      title="Assign to a department"
      subtitle="Pick employees and a department. They’ll appear under that department node on the chart."
      onClose={onClose}
      footer={
        <>
          <OrgModalCancelButton type="button" onClick={onClose} disabled={saving}>
            Cancel
          </OrgModalCancelButton>
          <OrgModalSubmitButton
            form="assign-dept-form"
            saving={saving}
            disabled={!canSubmit}
            label={selected.size ? `Assign ${selected.size}` : "Assign"}
            savingLabel="Assigning…"
          />
        </>
      }
    >
      <form id="assign-dept-form" onSubmit={handleAssign}>
        <div className="space-y-5 px-5 py-5">
          <OrgFormField id="assign-dept" label="Department" required hint="Choose an existing department or create a new one.">
            <select
              id="assign-dept"
              className="form-control"
              value={deptValue}
              onChange={(ev) => setDeptValue(ev.target.value)}
            >
              <option value="">Select a department…</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
              {canCreateDept ? <option value={NEW_DEPT}>＋ Create new department</option> : null}
            </select>
            {creatingNew ? (
              <input
                className="form-control mt-2"
                placeholder="New department name (e.g. Sales)"
                value={newDeptName}
                onChange={(ev) => setNewDeptName(ev.target.value)}
                autoFocus
              />
            ) : null}
          </OrgFormField>

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[0.8125rem] font-medium text-defaulttextcolor">
                Employees
                <span className="ms-1 text-defaulttextcolor/55">({selected.size} selected)</span>
              </span>
              {filtered.length > 0 ? (
                <button
                  type="button"
                  onClick={toggleAllFiltered}
                  className="text-[0.75rem] font-medium text-primary hover:underline"
                >
                  {allFilteredSelected ? "Clear selection" : `Select all (${filtered.length})`}
                </button>
              ) : null}
            </div>
            <div className="relative mb-2">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-defaulttextcolor/45" aria-hidden />
              <input
                type="search"
                className="form-control !ps-9 !py-2 !text-[0.8125rem]"
                placeholder="Search employees…"
                value={search}
                onChange={(ev) => setSearch(ev.target.value)}
              />
            </div>
            {filtered.length === 0 ? (
              <p className="mb-0 rounded-lg border border-dashed border-defaultborder/70 px-3 py-3 text-[0.8125rem] text-defaulttextcolor/60">
                No employees match.
              </p>
            ) : (
              <ul className="mb-0 grid max-h-60 gap-1 overflow-y-auto rounded-lg border border-defaultborder/50 p-2 sm:grid-cols-2">
                {filtered.map((emp) => (
                  <li key={emp.id}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[0.8125rem] hover:bg-light/60 dark:hover:bg-white/[0.04]">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={selected.has(emp.id)}
                        onChange={() => toggle(emp.id)}
                      />
                      <span className="truncate text-defaulttextcolor">{emp.fullName}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </form>
    </OrgModal>
  );
}
