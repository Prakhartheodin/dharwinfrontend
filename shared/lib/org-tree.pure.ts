import type { OrgUnitType } from "@/shared/lib/api/org-structure";

export type OrgUnitPlacement = {
  id: string;
  type: OrgUnitType;
  parentId?: string | null;
  departmentId?: string | null;
  directToCeo?: boolean;
};

const idStr = (v: string | null | undefined) => (v == null || v === "" ? null : String(v));

/** True if setting nodeId.parent = newParentId would create a cycle (self or descendant). */
export const wouldCreateCycle = (
  units: { id: string; parentId?: string | null }[],
  nodeId: string,
  newParentId: string | null
): boolean => {
  const node = idStr(nodeId);
  const target = idStr(newParentId);
  if (target == null) return false;
  if (target === node) return true;
  const parentOf = new Map(units.map((u) => [idStr(u.id)!, idStr(u.parentId)]));
  let cur: string | null = target;
  const seen = new Set<string>();
  while (cur != null) {
    if (cur === node) return true;
    if (seen.has(cur)) break;
    seen.add(cur);
    cur = parentOf.get(cur) ?? null;
  }
  return false;
};

/**
 * Allowed parent→child org unit types.
 * ceo→manager→supervisor→department; ceo→department when directToCeo.
 */
export const isAllowedParentChild = (
  parentType: OrgUnitType | null,
  childType: OrgUnitType,
  directToCeo = false
): boolean => {
  if (childType === "ceo") return parentType == null;
  if (parentType == null) return childType === "ceo";
  if (parentType === "ceo") {
    if (childType === "manager") return true;
    if (childType === "department") return directToCeo === true;
    return false;
  }
  if (parentType === "manager" && childType === "supervisor") return true;
  if (parentType === "supervisor" && childType === "department") return true;
  return false;
};

export const effectiveDirectToCeo = (
  unit: Pick<OrgUnitPlacement, "type" | "directToCeo">,
  parentType: OrgUnitType | null
): boolean =>
  unit.type === "department" && parentType === "ceo" ? true : unit.directToCeo === true;

/**
 * Client-side mirror of backend reparent validation (cycle + hierarchy rules).
 */
export const canReparentOrgUnit = (
  units: OrgUnitPlacement[],
  unitId: string,
  newParentId: string | null
): { ok: true } | { ok: false; reason: string } => {
  const candidate = units.find((u) => u.id === unitId);
  if (!candidate) return { ok: false, reason: "Org unit not found" };
  if (wouldCreateCycle(units, unitId, newParentId)) {
    return { ok: false, reason: "That move would create a loop in the org chart" };
  }
  const parentKey = idStr(newParentId);
  const parent = parentKey ? units.find((u) => u.id === parentKey) : null;
  const parentType = parent?.type ?? null;
  const directToCeo = effectiveDirectToCeo(candidate, parentType);
  if (!isAllowedParentChild(parentType, candidate.type, directToCeo)) {
    return {
      ok: false,
      reason: "That parent-child combination is not allowed in the org hierarchy",
    };
  }
  if (candidate.type === "department" && !candidate.departmentId) {
    return { ok: false, reason: "Department nodes must reference a canonical department" };
  }
  return { ok: true };
};
