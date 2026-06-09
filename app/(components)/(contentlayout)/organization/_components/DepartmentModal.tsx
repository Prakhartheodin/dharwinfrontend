"use client";

import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { createDepartment, updateDepartment, type Department } from "@/shared/lib/api/departments";
import {
  OrgFormField,
  OrgModal,
  OrgModalCancelButton,
  OrgModalSubmitButton,
} from "./org-ui";

type Props = {
  open: boolean;
  department: Department | null;
  onClose: () => void;
  onSaved: () => void;
};

export default function DepartmentModal({ open, department, onClose, onSaved }: Props) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(department?.name ?? "");
    setCode(department?.code ?? "");
  }, [department, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      await Swal.fire({ icon: "warning", title: "Validation", text: "Name is required." });
      return;
    }
    setSaving(true);
    try {
      if (department?.id) {
        await updateDepartment(department.id, { name: trimmed, code: code.trim() || undefined });
      } else {
        await createDepartment({ name: trimmed, code: code.trim() || undefined });
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Save failed";
      await Swal.fire({ icon: "error", title: "Error", text: msg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <OrgModal
      open={open}
      title={department ? "Edit department" : "Add department"}
      subtitle={
        department
          ? "Update the canonical department record used across HRMS and org structure."
          : "Create a reusable department record for structure nodes and employee assignments."
      }
      onClose={onClose}
      footer={
        <>
          <OrgModalCancelButton type="button" onClick={onClose} disabled={saving}>
            Cancel
          </OrgModalCancelButton>
          <OrgModalSubmitButton form="department-form" saving={saving} />
        </>
      }
    >
      <form id="department-form" onSubmit={handleSubmit}>
        <div className="space-y-5 px-5 py-5">
          <OrgFormField id="dept-name" label="Name" required hint="Shown in dropdowns, org chart, and HRMS.">
            <input
              id="dept-name"
              className="form-control"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Engineering"
              autoComplete="organization"
              required
            />
          </OrgFormField>
          <OrgFormField id="dept-code" label="Code" hint="Optional short code for reports or integrations.">
            <input
              id="dept-code"
              className="form-control"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. ENG"
            />
          </OrgFormField>
        </div>
      </form>
    </OrgModal>
  );
}
