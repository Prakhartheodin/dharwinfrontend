"use client";

import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { listAllDepartments, type Department } from "@/shared/lib/api/departments";
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
} from "./org-ui";

const TYPES: OrgUnitType[] = ["ceo", "manager", "supervisor", "department"];

const TYPE_HINTS: Record<OrgUnitType, string> = {
  ceo: "Top of the org — usually a single root node.",
  manager: "Reports to the CEO and owns supervisors.",
  supervisor: "Reports to a manager and leads departments.",
  department: "Links a department record; its employees appear on the chart.",
};

const PARENT_HINTS: Record<OrgUnitType, string> = {
  ceo: "The CEO is the root — it has no parent.",
  manager: "Managers attach under the CEO.",
  supervisor: "Supervisors attach under a manager.",
  department: "Departments attach under a supervisor, or directly under the CEO.",
};

// Mirror of backend isAllowedParentChild — which parent types a child type may sit under.
const isAllowedParent = (parentType: OrgUnitType, childType: OrgUnitType) => {
  if (childType === "manager") return parentType === "ceo";
  if (childType === "supervisor") return parentType === "manager";
  if (childType === "department") return parentType === "supervisor" || parentType === "ceo";
  return false; // ceo has no parent (root only)
};

type Props = {
  open: boolean;
  unit: OrgUnitNode | null;
  initialType?: OrgUnitType;
  onClose: () => void;
  onSaved: () => void;
};

export default function OrgUnitModal({ open, unit, initialType, onClose, onSaved }: Props) {
  const [name, setName] = useState("");
  const [type, setType] = useState<OrgUnitType>("manager");
  const [parentId, setParentId] = useState<string>("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [order, setOrder] = useState(0);
  const [units, setUnits] = useState<OrgUnitNode[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(unit?.name ?? "");
    setType(unit?.type ?? initialType ?? "manager");
    setParentId(unit?.parentId ?? "");
    setDepartmentId(unit?.departmentId ?? "");
    setOrder(unit?.order ?? 0);
    Promise.all([listOrgUnits(), listAllDepartments()])
      .then(([u, d]) => {
        setUnits(u);
        setDepartments(d);
      })
      .catch(() => {
        setUnits([]);
        setDepartments([]);
      });
  }, [open, unit, initialType]);

  // For NEW units, append to the end of the chosen parent's siblings so creation
  // order is preserved and siblings never collide at 0. Reorder later via ↑/↓.
  useEffect(() => {
    if (!open || unit) return;
    const siblings = units.filter((u) => (u.parentId ?? "") === (parentId ?? ""));
    setOrder(siblings.length ? Math.max(...siblings.map((s) => s.order ?? 0)) + 1 : 0);
  }, [open, unit, parentId, units]);

  // When the type changes on a NEW unit, drop a parent that's no longer legal for it.
  useEffect(() => {
    if (!open || unit || !parentId) return;
    const parent = units.find((u) => u.id === parentId);
    if (parent && !isAllowedParent(parent.type, type)) setParentId("");
  }, [open, unit, type, parentId, units]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      await Swal.fire({ icon: "warning", title: "Validation", text: "Name is required." });
      return;
    }
    setSaving(true);
    try {
      // A department whose parent is the CEO must report directly to the CEO.
      // Derived from the parent choice — no separate toggle to get wrong.
      const parentIsCeo = units.find((u) => u.id === parentId)?.type === "ceo";
      const body = {
        name: trimmed,
        type,
        parentId: parentId || null,
        departmentId: type === "department" ? departmentId || null : null,
        directToCeo: type === "department" && parentIsCeo,
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

  const showDepartmentLink = type === "department";
  const parentIsCeoSelected = units.find((u) => u.id === parentId)?.type === "ceo";
  const rootAllowed = type === "ceo";
  const allowedParents = units.filter((u) => u.id !== unit?.id && isAllowedParent(u.type, type));
  // Active departments, plus the currently-linked one even if it went inactive,
  // so editing a unit never silently drops a stale department link.
  const departmentOptions = departments.filter((d) => d.isActive !== false || d.id === departmentId);

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
        <div className="space-y-5 px-5 py-5">
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

          <OrgFormField
            id="unit-type"
            label="Type"
            required
            hint={
              unit
                ? `${TYPE_HINTS[type]} Changing type re-checks child placement.`
                : TYPE_HINTS[type]
            }
          >
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
          </OrgFormField>

          <OrgFormField id="unit-parent" label="Parent unit" hint={PARENT_HINTS[type]}>
            <select
              id="unit-parent"
              className="form-control"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              disabled={rootAllowed}
            >
              <option value="">{rootAllowed ? "None (root)" : "Select a parent…"}</option>
              {allowedParents.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({ORG_UNIT_TYPE_META[u.type]?.label ?? u.type})
                </option>
              ))}
            </select>
            {!rootAllowed && allowedParents.length === 0 ? (
              <p className="mb-0 mt-1.5 text-[0.75rem] text-warning">
                No eligible parent exists yet. Create a {type === "manager" ? "CEO" : type === "supervisor" ? "manager" : "supervisor"} first.
              </p>
            ) : null}
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
                {departmentOptions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                    {d.isActive === false ? " (inactive)" : ""}
                  </option>
                ))}
              </select>
            </OrgFormField>
          ) : null}

          {type === "department" && parentIsCeoSelected ? (
            <div className="rounded-lg border border-dashed border-info/40 bg-info/[0.05] px-3.5 py-2.5 text-[0.75rem] text-defaulttextcolor/70">
              <i className="ri-information-line me-1 text-info" aria-hidden />
              This department&apos;s parent is the CEO, so it will report directly to the CEO (skipping the
              manager → supervisor chain).
            </div>
          ) : null}

        </div>
      </form>
    </OrgModal>
  );
}
