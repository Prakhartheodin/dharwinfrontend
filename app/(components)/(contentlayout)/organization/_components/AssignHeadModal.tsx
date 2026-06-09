"use client";

import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { assignHead, listAssignableHeads } from "@/shared/lib/api/org-structure";
import { OrgFormField, OrgModal, OrgModalCancelButton, OrgModalSubmitButton } from "./org-ui";

type Props = {
  open: boolean;
  unitId: string | null;
  unitName: string;
  unitType?: string;
  departmentId?: string | null;
  currentHeadId?: string | null;
  onClose: () => void;
  onSaved: () => void;
};

export default function AssignHeadModal({
  open,
  unitId,
  unitName,
  unitType,
  departmentId,
  currentHeadId,
  onClose,
  onSaved,
}: Props) {
  const isDepartment = unitType === "department";
  const [headEmployeeId, setHeadEmployeeId] = useState("");
  const [roster, setRoster] = useState<{ id: string; name: string }[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setHeadEmployeeId(currentHeadId ?? "");
    setLoadingRoster(true);
    listAssignableHeads(isDepartment ? departmentId : undefined)
      .then(setRoster)
      .catch(() => setRoster([]))
      .finally(() => setLoadingRoster(false));
  }, [open, currentHeadId, isDepartment, departmentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitId) return;
    setSaving(true);
    try {
      await assignHead(unitId, headEmployeeId || null);
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Assign failed";
      await Swal.fire({ icon: "error", title: "Error", text: msg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <OrgModal
      open={open && !!unitId}
      title="Assign head"
      subtitle={`Choose the employee who leads "${unitName}".`}
      onClose={onClose}
      footer={
        <>
          <OrgModalCancelButton type="button" onClick={onClose} disabled={saving}>
            Cancel
          </OrgModalCancelButton>
          <OrgModalSubmitButton form="assign-head-form" saving={saving} label="Assign head" />
        </>
      }
    >
      <form id="assign-head-form" onSubmit={handleSubmit}>
        <div className="px-5 py-5">
          <OrgFormField
            id="head-employee"
            label="Employee"
            hint={
              isDepartment
                ? "Only members of this department can lead it. Set an employee's department on their record to add them here."
                : "Any active employee can lead this unit."
            }
          >
            <select
              id="head-employee"
              className="form-control"
              value={headEmployeeId}
              onChange={(e) => setHeadEmployeeId(e.target.value)}
              disabled={loadingRoster || saving}
            >
              <option value="">{loadingRoster ? "Loading employees…" : "No head assigned"}</option>
              {roster.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            {isDepartment && !loadingRoster && roster.length === 0 ? (
              <p className="mb-0 mt-1.5 text-[0.75rem] text-warning">
                No employees are assigned to this department yet. Assign one on their employee record first.
              </p>
            ) : null}
          </OrgFormField>
        </div>
      </form>
    </OrgModal>
  );
}
