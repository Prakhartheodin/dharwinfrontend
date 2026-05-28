import { describe, expect, it } from "vitest";
import { hasPermission } from "../permissions";
import { canAccessPath, hasPermissionForPath } from "../route-permissions";

describe("employees permission gates (PR3)", () => {
  const employeesOnlyView = ["ats.employees:view"];
  const employeesViewCreate = ["ats.employees:view,create"];
  const employeesManage = ["ats.employees:view,create,edit,delete"];
  const legacyCandidates = ["ats.candidates:view,create,edit,delete"];
  const referralOnly = ["ats.referralLeads:view"];

  it("view_employees grants ats.employees:view", () => {
    expect(hasPermission({ permissions: employeesOnlyView }, "view_employees")).toBe(true);
    expect(hasPermission({ permissions: employeesOnlyView }, "manage_employees")).toBe(false);
  });

  it("create-only role can create but not edit or delete", () => {
    expect(hasPermission({ permissions: employeesViewCreate }, "create_employee")).toBe(true);
    expect(hasPermission({ permissions: employeesViewCreate }, "update_employee")).toBe(false);
    expect(hasPermission({ permissions: employeesViewCreate }, "delete_employee")).toBe(false);
    expect(hasPermission({ permissions: employeesViewCreate }, "manage_employees")).toBe(true);
  });

  it("manage_employees grants full write on ats.employees", () => {
    expect(hasPermission({ permissions: employeesManage }, "manage_employees")).toBe(true);
    expect(hasPermission({ permissions: employeesManage }, "update_employee")).toBe(true);
    expect(hasPermission({ permissions: employeesManage }, "delete_employee")).toBe(true);
  });

  it("legacy ats.candidates backstop for manage_employees", () => {
    expect(hasPermission({ permissions: legacyCandidates }, "manage_employees")).toBe(true);
    expect(hasPermission({ permissions: legacyCandidates }, "view_employees")).toBe(true);
  });

  it("referral-only role does not pass employees manage", () => {
    expect(hasPermission({ permissions: referralOnly }, "manage_employees")).toBe(false);
  });

  it("route alias: ats.candidates grants /ats/employees path", () => {
    expect(hasPermissionForPath(legacyCandidates, "ats.employees:")).toBe(true);
    expect(hasPermissionForPath(employeesOnlyView, "ats.employees:")).toBe(true);
    expect(hasPermissionForPath(referralOnly, "ats.employees:")).toBe(false);
  });

  it("view-only can access employee list; create gates add/import", () => {
    expect(canAccessPath(employeesOnlyView, "/ats/employees")).toBe(true);
    expect(canAccessPath(employeesOnlyView, "/ats/employees/add")).toBe(false);
    expect(canAccessPath(employeesOnlyView, "/ats/employees/import")).toBe(false);
    expect(canAccessPath(employeesViewCreate, "/ats/employees")).toBe(true);
    expect(canAccessPath(employeesViewCreate, "/ats/employees/add")).toBe(true);
    expect(canAccessPath(["ats.employees:create"], "/ats/employees")).toBe(true);
    expect(canAccessPath(["ats.employees:create"], "/ats/employees/add")).toBe(true);
    expect(canAccessPath(["ats.employees:edit"], "/ats/employees/add")).toBe(false);
  });
});
