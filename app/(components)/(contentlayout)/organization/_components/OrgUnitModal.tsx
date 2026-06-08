"use client";

import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { listDepartments, type Department } from "@/shared/lib/api/departments";
import {
  createOrgUnit,
  listOrgUnits,
  updateOrgUnit,
  type OrgUnitNode,
  type OrgUnitType,
} from "@/shared/lib/api/org-structure";
import {
  ORG_UNIT_TYPE_META,
  OrgFormField,
  OrgModal,
  OrgModalCancelButton,
  OrgModalSubmitButton,
  OrgTypeBadge,
} from "./org-ui";

const TYPES: OrgUnitType[] = ["ceo", "manager", "supervisor", "department"];

type Props = {
  open: boolean;
  unit: OrgUnitNode | null;
  onClose: () => void;
  onSaved: () => void;
};

export default function OrgUnitModal({ open, unit, onClose, onSaved }: Props) {
  const [name, setName] = useState("");
  const [type, setType] = useState<OrgUnitType>("manager");
  const [parentId, setParentId] = useState<string>("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [directToCeo, setDirectToCeo] = useState(false);
  const [order, setOrder] = useState(0);
  const [units, setUnits] = useState<OrgUnitNode[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(unit?.name ?? "");
    setType(unit?.type ?? "manager");
    setParentId(unit?.parentId ?? "");
    setDepartmentId(unit?.departmentId ?? "");
    setDirectToCeo(!!unit?.directToCeo);
    setOrder(unit?.order ?? 0);
    Promise.all([listOrgUnits(), listDepartments()])
      .then(([u, d]) => {
        setUnits(u);
        setDepartments(d.filter((row) => row.isActive !== false));
      })
      .catch(() => {
        setUnits([]);
        setDepartments([]);
      });
  }, [open, unit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      await Swal.fire({ icon: "warning", title: "Validation", text: "Name is required." });
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: trimmed,
        type,
        parentId: parentId || null,
        departmentId: type === "department" ? departmentId || null : null,
        directToCeo,
        order,
      };
      if (unit?.id) await updateOrgUnit(unit.id, body);
      else await createOrgUnit(body);
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Save failed";
      await Swal.fire({ icon: "error", title: "Error", text: msg });
    } finally {
      setSaving(false);
    }
  };

  const showDepartmentLink = type === "department" || unit?.type === "department";

  return (
    <OrgModal
      open={open}
      size="lg"
      title={unit ? "Edit org unit" : "Add org unit"}
      subtitle="Units form the hierarchy shown on the org chart. Department nodes must link to a department record."
      onClose={onClose}
      footer={
        <>
          <OrgModalCancelButton type="button" onClick={onClose} disabled={saving}>
            Cancel
          </OrgModalCancelButton>
          <OrgModalSubmitButton form="org-unit-form" saving={saving} label={unit ? "Save changes" : "Create unit"} />
        </>
      }
    >
      <form id="org-unit-form" onSubmit={handleSubmit}>
        <div className="ti-modal-body space-y-4">
          <OrgFormField id="unit-name" label="Name" required>
            <input
              id="unit-name"
              className="form-control"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sales — West"
              required
            />
          </OrgFormField>

          {!unit ? (
            <OrgFormField id="unit-type" label="Type" required hint="CEO is typically a single root node.">
              <select
                id="unit-type"
                className="form-control"
                value={type}
                onChange={(e) => setType(e.target.value as OrgUnitType)}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {ORG_UNIT_TYPE_META[t].label}
                  </option>
                ))}
              </select>
              <div className="mt-2">
                <OrgTypeBadge type={type} />
              </div>
            </OrgFormField>
          ) : (
            <div>
              <span className="form-label mb-2 block">Type</span>
              <OrgTypeBadge type={unit.type} />
            </div>
          )}

          <OrgFormField id="unit-parent" label="Parent unit" hint="Leave empty for a top-level root (e.g. CEO).">
            <select id="unit-parent" className="form-control" value={parentId} onChange={(e) => setParentId(e.target.value)}>
              <option value="">None (root)</option>
              {units
                .filter((u) => u.id !== unit?.id)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({ORG_UNIT_TYPE_META[u.type]?.label ?? u.type})
                  </option>
                ))}
            </select>
          </OrgFormField>

          {showDepartmentLink ? (
            <OrgFormField id="unit-dept" label="Linked department" required hint="Employees assigned here appear under this node on the chart.">
              <select
                id="unit-dept"
                className="form-control"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                required
              >
                <option value="">Select department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </OrgFormField>
          ) : null}

          <div className="rounded-lg border border-dashed border-defaultborder/70 px-3 py-3">
            <label htmlFor="directToCeo" className="flex cursor-pointer items-start gap-2.5">
              <input
                id="directToCeo"
                type="checkbox"
                className="form-check-input mt-0.5"
                checked={directToCeo}
                onChange={(e) => setDirectToCeo(e.target.checked)}
              />
              <span>
                <span className="block text-[0.8125rem] font-medium text-defaulttextcolor">Direct to CEO</span>
                <span className="block text-[0.75rem] text-defaulttextcolor/60">
                  Skip intermediate levels in chart layout for this unit.
                </span>
              </span>
            </label>
          </div>

          <OrgFormField id="unit-order" label="Sort order" hint="Lower numbers appear first among siblings.">
            <input
              id="unit-order"
              type="number"
              className="form-control"
              value={order}
              onChange={(e) => setOrder(Number(e.target.value) || 0)}
              min={0}
            />
          </OrgFormField>
        </div>
      </form>
    </OrgModal>
  );
}
