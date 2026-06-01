import { isEmployeeUserRoleNameLower } from "./employee-user-role";

export interface PersonaInput {
  userRole?: string | null;
  roleNames?: string[] | null;
  permissions?: string[] | null;
  isAdministrator?: boolean;
  isPlatformSuperUser?: boolean;
  /** Backend-provided persona flag. When set, takes precedence over role-name fallback. */
  isCandidateFlag?: boolean | null;
}

const STAFF_WRITE_PREFIXES = [
  "ats.employees:",
  "ats.candidates:",
  "ats.recruiters:",
  "ats.jobs:",
  "ats.interviews:",
  "ats.offers:",
  "ats.onboarding:",
  "ats.pre-boarding:",
  "settings.users:",
  "settings.roles:",
];

function hasAnyStaffWritePermission(perms: readonly string[]): boolean {
  for (const p of perms) {
    if (typeof p !== "string") continue;
    const colon = p.indexOf(":");
    if (colon < 0) continue;
    const prefix = p.slice(0, colon + 1);
    if (!STAFF_WRITE_PREFIXES.includes(prefix)) continue;
    const actions = p
      .slice(colon + 1)
      .split(",")
      .map((a) => a.trim().toLowerCase());
    if (actions.some((a) => a === "create" || a === "edit" || a === "delete")) {
      return true;
    }
  }
  return false;
}

/**
 * True when the user holds any staff-tier capability: super-user, administrator flag,
 * or any write permission on ATS / settings.users / settings.roles.
 */
export function hasStaffAccess(input: PersonaInput): boolean {
  if (input.isPlatformSuperUser) return true;
  if (input.isAdministrator) return true;
  return hasAnyStaffWritePermission(input.permissions ?? []);
}

/**
 * True when the user is acting as a job-seeker / employee persona.
 *
 * Order:
 *   1. `isCandidateFlag` from backend wins when present.
 *   2. Staff access (admin / super-user / write permission) -> not candidate.
 *   3. Resolved `roleNames` map through `isEmployeeUserRoleNameLower`.
 *   4. Fall back to legacy single `userRole` string (share-candidate flow).
 */
export function isCandidatePersona(input: PersonaInput): boolean {
  if (input.isCandidateFlag === true) return true;
  if (input.isCandidateFlag === false) return false;
  if (hasStaffAccess(input)) return false;

  const names = (input.roleNames ?? [])
    .map((n) => (typeof n === "string" ? n.trim().toLowerCase() : ""))
    .filter(Boolean);

  if (names.length > 0) {
    return names.some(isEmployeeUserRoleNameLower);
  }

  const single = (input.userRole ?? "").toString().trim().toLowerCase();
  return Boolean(single) && isEmployeeUserRoleNameLower(single);
}

/**
 * True when the user has only employee-persona roles and no staff capability.
 * Used by hooks that gate self-service profile views.
 */
export function isEmployeeOnly(input: PersonaInput): boolean {
  if (hasStaffAccess(input)) return false;
  return isCandidatePersona(input);
}
