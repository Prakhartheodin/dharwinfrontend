import type { Mode, Role } from "@/shared/workforce-profile/types/wizard.types";

/**
 * Employee and Candidate are distinct user roles, so they get distinct
 * self-service wizard flows (different steps, different payload shape):
 *
 *   Employee  -> "self-service-employee"  (adds Salary Slips + Account Setting)
 *   Candidate -> "self-service-candidate"
 *
 * A user holding both roles resolves to Employee, matching the legacy behaviour
 * of the Personal Information page.
 */
export function isCandidateOnlyRoleNames(
  roleNames: readonly string[] | null | undefined,
): boolean {
  const names = (roleNames ?? [])
    .map((n) => (typeof n === "string" ? n.trim().toLowerCase() : ""))
    .filter(Boolean);

  return names.includes("candidate") && !names.includes("employee");
}

export function resolveSelfServiceWizardTarget(
  roleNames: readonly string[] | null | undefined,
): { mode: Mode; role: Role } {
  return isCandidateOnlyRoleNames(roleNames)
    ? { mode: "self-service-candidate", role: "candidate" }
    : { mode: "self-service-employee", role: "employee" };
}
