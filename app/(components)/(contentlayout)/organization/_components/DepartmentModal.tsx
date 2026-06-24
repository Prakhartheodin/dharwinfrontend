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

// Preset palette offered in the picker. Distinct hues so two departments rarely collide.
const COLOR_SWATCHES = [
  "#22c55e", "#0ea5e9", "#6366f1", "#8b5cf6", "#ec4899",
  "#ef4444", "#f59e0b", "#14b8a6", "#84cc16", "#64748b",
];
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export default function DepartmentModal({ open, department, onClose, onSaved }: Props) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [color, setColor] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(department?.name ?? "");
    setCode(department?.code ?? "");
    setColor(department?.color ?? "");
  }, [department, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      await Swal.fire({ icon: "warning", title: "Validation", text: "Name is required." });
      return;
    }
    if (color && !HEX_RE.test(color)) {
      await Swal.fire({ icon: "warning", title: "Validation", text: "Colour must be a hex value like #0ea5e9." });
      return;
    }
    setSaving(true);
    try {
      // Always send color (empty string clears it → chart falls back to auto colour).
      if (department?.id) {
        await updateDepartment(department.id, { name: trimmed, code: code.trim() || undefined, color });
      } else {
        await createDepartment({ name: trimmed, code: code.trim() || undefined, color });
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
          <OrgFormField
            id="dept-color"
            label="Chart colour"
            hint="Used for this department's node in the org chart. Leave unset to auto-assign a distinct colour."
          >
            <div className="flex flex-wrap items-center gap-2">
              {COLOR_SWATCHES.map((c) => {
                const active = color.toLowerCase() === c.toLowerCase();
                return (
                  <button
                    key={c}
                    type="button"
                    title={c}
                    aria-label={`Use colour ${c}`}
                    aria-pressed={active}
                    onClick={() => setColor(c)}
                    className={`h-7 w-7 rounded-md border-2 border-white outline-none transition-transform hover:scale-110 ${
                      active ? "ring-2 ring-offset-1 ring-defaulttextcolor" : "ring-1 ring-defaultborder/60"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                );
              })}
              {/* custom hex via native colour input */}
              <label
                title="Custom colour"
                className="relative inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-defaultborder/60 bg-light/50 text-defaulttextcolor/60 hover:bg-light"
              >
                <i className="ri-palette-line text-sm" aria-hidden />
                <input
                  type="color"
                  value={HEX_RE.test(color) ? color : "#0ea5e9"}
                  onChange={(e) => setColor(e.target.value)}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  aria-label="Pick a custom colour"
                />
              </label>
              {color ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-defaultborder/60 px-2 py-1 text-[0.75rem]">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} aria-hidden />
                  <span className="font-mono">{color}</span>
                  <button
                    type="button"
                    onClick={() => setColor("")}
                    aria-label="Clear colour"
                    className="text-defaulttextcolor/45 hover:text-danger"
                  >
                    <i className="ri-close-line" aria-hidden />
                  </button>
                </span>
              ) : (
                <span className="text-[0.75rem] text-defaulttextcolor/55">Auto (distinct)</span>
              )}
            </div>
          </OrgFormField>
        </div>
      </form>
    </OrgModal>
  );
}
