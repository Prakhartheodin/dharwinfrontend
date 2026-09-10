import { describe, expect, it } from "vitest";
import {
  isCandidateOnlyRoleNames,
  resolveSelfServiceWizardTarget,
} from "../personal-info-wizard";

describe("resolveSelfServiceWizardTarget", () => {
  it("keeps Employee and Candidate on separate flows", () => {
    expect(resolveSelfServiceWizardTarget(["Employee"])).toEqual({
      mode: "self-service-employee",
      role: "employee",
    });
    expect(resolveSelfServiceWizardTarget(["Candidate"])).toEqual({
      mode: "self-service-candidate",
      role: "candidate",
    });
  });

  it("treats a user holding both roles as an Employee", () => {
    expect(resolveSelfServiceWizardTarget(["Candidate", "Employee"])).toEqual({
      mode: "self-service-employee",
      role: "employee",
    });
  });

  it("defaults to the Employee flow when roles are unknown", () => {
    expect(resolveSelfServiceWizardTarget(null).mode).toBe("self-service-employee");
    expect(resolveSelfServiceWizardTarget([]).mode).toBe("self-service-employee");
  });
});

describe("isCandidateOnlyRoleNames", () => {
  it("is true for Candidate without Employee", () => {
    expect(isCandidateOnlyRoleNames(["Candidate"])).toBe(true);
  });

  it("is false when Employee is present", () => {
    expect(isCandidateOnlyRoleNames(["Employee"])).toBe(false);
    expect(isCandidateOnlyRoleNames(["Candidate", "Employee"])).toBe(false);
  });
});
