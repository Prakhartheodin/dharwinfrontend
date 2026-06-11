import { describe, expect, it } from "vitest";
import { getFeaturePermissions } from "../feature-permissions";
import { canAccessPath, hasPermissionForPath } from "../route-permissions";

describe("organization permission aliases", () => {
  const structureView = ["organization.structure:view"];
  const structureManage = ["organization.structure:view,create,edit,delete"];

  it("structure:view grants nav to chart, departments, directory", () => {
    for (const path of [
      "/organization/chart",
      "/organization/departments",
      "/organization/directory",
    ]) {
      expect(canAccessPath(structureView, path)).toBe(true);
    }
  });

  it("structure does NOT grant scenarios — scenarios needs its own permission", () => {
    expect(canAccessPath(structureView, "/organization/scenarios")).toBe(false);
    expect(canAccessPath(structureManage, "/organization/scenarios")).toBe(false);
    expect(getFeaturePermissions(structureManage, "organization.scenarios").view).toBe(false);
    expect(getFeaturePermissions(structureManage, "organization.scenarios").edit).toBe(false);
    expect(canAccessPath(["organization.scenarios:view"], "/organization/scenarios")).toBe(true);
    expect(getFeaturePermissions(["organization.scenarios:view,create,edit,delete"], "organization.scenarios").edit).toBe(true);
  });

  it("structure:view grants read-only feature access on sibling org surfaces", () => {
    expect(getFeaturePermissions(structureView, "organization.departments").view).toBe(true);
    expect(getFeaturePermissions(structureView, "organization.departments").create).toBe(false);
  });

  it("structure manage grants department write actions for org admins", () => {
    expect(getFeaturePermissions(structureManage, "organization.departments").edit).toBe(true);
    expect(getFeaturePermissions(structureManage, "organization.departments").create).toBe(true);
  });

  it("organization.chart:view satisfies chart path without structure row", () => {
    expect(hasPermissionForPath(["organization.chart:view"], "organization.chart:")).toBe(true);
  });
});
