import { describe, expect, it } from "vitest";
import { canReparentOrgUnit, isAllowedParentChild, wouldCreateCycle } from "../org-tree.pure";

describe("org-tree.pure", () => {
  it("wouldCreateCycle rejects self and descendant targets", () => {
    const units = [
      { id: "a", parentId: null },
      { id: "b", parentId: "a" },
      { id: "c", parentId: "b" },
    ];
    expect(wouldCreateCycle(units, "a", "c")).toBe(true);
    expect(wouldCreateCycle(units, "a", "a")).toBe(true);
    expect(wouldCreateCycle(units, "c", "a")).toBe(false);
  });

  it("isAllowedParentChild enforces ceo→manager→supervisor→department", () => {
    expect(isAllowedParentChild(null, "ceo")).toBe(true);
    expect(isAllowedParentChild("ceo", "manager")).toBe(true);
    expect(isAllowedParentChild("ceo", "department", true)).toBe(true);
    expect(isAllowedParentChild("ceo", "supervisor")).toBe(false);
    expect(isAllowedParentChild("manager", "supervisor")).toBe(true);
    expect(isAllowedParentChild("supervisor", "department")).toBe(true);
  });

  it("canReparentOrgUnit rejects supervisor under supervisor", () => {
    const units = [
      { id: "ceo", type: "ceo" as const, parentId: null },
      { id: "m1", type: "manager" as const, parentId: "ceo" },
      { id: "s1", type: "supervisor" as const, parentId: "m1" },
      { id: "s2", type: "supervisor" as const, parentId: "m1" },
    ];
    const verdict = canReparentOrgUnit(units, "s1", "s2");
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.reason).toMatch(/not allowed/i);
    }
  });

  it("canReparentOrgUnit allows department under ceo with implicit directToCeo", () => {
    const units = [
      { id: "ceo", type: "ceo" as const, parentId: null },
      { id: "d1", type: "department" as const, parentId: "m1", departmentId: "dept1", directToCeo: false },
      { id: "m1", type: "manager" as const, parentId: "ceo" },
    ];
    expect(canReparentOrgUnit(units, "d1", "ceo").ok).toBe(true);
  });
});
