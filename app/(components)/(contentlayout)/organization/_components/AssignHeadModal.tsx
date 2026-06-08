"use client";

import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { getPositionRoster } from "@/shared/lib/api/positions";
import { assignHead } from "@/shared/lib/api/org-structure";
import { OrgFormField, OrgModal, OrgModalCancelButton, OrgModalSubmitButton } from "./org-ui";

type Props = {
  open: boolean;
  unitId: string | null;
  unitName: string;
  currentHeadId?: string | null;
  onClose: () => void;
  onSaved: () => void;
};

export default function AssignHeadModal({ open, unitId, unitName, currentHeadId, onClose, onSaved }: Props) {
  const [headEmployeeId, setHeadEmployeeId] = useState("");
  const [roster, setRoster] = useState<{ id: string; name: string }[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setHeadEmployeeId(currentHeadId ?? "");
    setLoadingRoster(true);
    getPositionRoster()
      .then((rows) => {
        const byId = new Map<string, string>();
        for (const row of rows) {
          for (const e of row.assignedEmployees ?? []) {
            if (e.id) byId.set(String(e.id), e.name);
          }
        }
        setRoster([...byId.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch(() => setRoster([]))
      .finally(() => setLoadingRoster(false));
  }, [open, currentHeadId]);

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
        <div className="ti-modal-body">
          <OrgFormField
            id="head-employee"
            label="Employee"
            hint="Only employees currently assigned to a position appear here."
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
          </OrgFormField>
        </div>
      </form>
    </OrgModal>
  );
}
