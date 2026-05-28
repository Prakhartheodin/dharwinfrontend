const ATS_FULL = "ats.candidates:view,create,edit,delete";
const ATS_EMPLOYEES_FULL = "ats.employees:view,create,edit,delete";
const ATS_ONBOARDING_FULL = "ats.onboarding:view,create,edit,delete";

const MANAGE_ACTIONS = ["create", "edit", "delete"] as const;

function matchesPrefixWithManage(raw: string, key: string): boolean {
  if (!raw) return false;
  const colon = raw.indexOf(":");
  if (colon < 0) return false;
  if (raw.slice(0, colon).trim() !== key) return false;
  const actions = raw.slice(colon + 1).split(",").map((a) => a.trim().toLowerCase());
  return actions.some((a) => MANAGE_ACTIONS.includes(a as typeof MANAGE_ACTIONS[number]));
}

/**
 * Raw-form check (matches backend's manage rule). Grants if role holds any of:
 *  - ATS_FULL bundle (ats.candidates:view,create,edit,delete)
 *  - ATS_EMPLOYEES_FULL bundle
 *  - ATS_ONBOARDING_FULL bundle
 *  - ats.candidates: with create/edit/delete
 *  - ats.employees:  with create/edit/delete
 *  - ats.onboarding: with create/edit/delete
 *
 * Administrator does NOT auto-bypass.
 */
export function canEditCandidateJoiningDate(
  rawPermissions: string[],
  _isAdministrator: boolean
): boolean {
  return rawPermissions.some((raw) => {
    if (raw === ATS_FULL || raw === ATS_EMPLOYEES_FULL || raw === ATS_ONBOARDING_FULL) return true;
    return (
      matchesPrefixWithManage(raw, "ats.candidates") ||
      matchesPrefixWithManage(raw, "ats.employees") ||
      matchesPrefixWithManage(raw, "ats.onboarding")
    );
  });
}

/**
 * Raw-form check (matches backend's manage rule). Grants if role holds:
 *  - ATS_FULL or ATS_EMPLOYEES_FULL bundle
 *  - ats.candidates: with create/edit/delete
 *  - ats.employees:  with create/edit/delete
 *
 * Resign date NOT under onboarding (spec §3.1). Administrator does NOT auto-bypass.
 */
export function canEditCandidateResignDate(
  rawPermissions: string[],
  _isAdministrator: boolean
): boolean {
  return rawPermissions.some((raw) => {
    if (raw === ATS_FULL || raw === ATS_EMPLOYEES_FULL) return true;
    return (
      matchesPrefixWithManage(raw, "ats.candidates") ||
      matchesPrefixWithManage(raw, "ats.employees")
    );
  });
}

/**
 * POST /v1/auth/impersonate ("Login as" user) is gated by
 * `requireAdministratorOrPermission('users.impersonate')` on the backend.
 * Administrator role and platformSuperUser keep default access; all other roles
 * (including Agent) must be granted `settings.users.impersonate:view` (or any
 * action) via the role-matrix UI.
 */
export function canImpersonateUser(
  rawPermissions: string[],
  isAdministrator: boolean,
  isPlatformSuperUser: boolean
): boolean {
  if (isPlatformSuperUser || isAdministrator) return true;
  return rawPermissions.some((raw) => {
    if (!raw) return false;
    const colon = raw.indexOf(":");
    if (colon < 0) return false;
    const key = raw.slice(0, colon).trim();
    if (key !== "settings.users.impersonate") return false;
    const actions = raw.slice(colon + 1).split(",").map((a) => a.trim().toLowerCase());
    return actions.some((a) => ["view", "create", "edit", "delete"].includes(a));
  });
}

/** POST /candidates/:id/assign-agent — employees.manage OR legacy candidates.manage. */
export function canAssignCandidateAgent(rawPermissions: string[], isPlatformSuperUser: boolean): boolean {
  if (isPlatformSuperUser) return true;
  return rawPermissions.some((p) => {
    const lower = p.toLowerCase();
    return (
      lower === "candidates.manage" ||
      lower === "employees.manage" ||
      lower.includes("ats.candidates:view,create,edit,delete") ||
      lower.includes("ats.employees:view,create,edit,delete")
    );
  });
}

/** PATCH /training/modules/:id (add student to module) requires modules.manage on the backend. */
export function canAssignTrainingCourseFromSop(rawPermissions: string[], isPlatformSuperUser: boolean): boolean {
  if (isPlatformSuperUser) return true;
  return rawPermissions.some((p) => {
    const lower = p.toLowerCase();
    return (
      lower === "modules.manage" ||
      lower === "training.modules.manage" ||
      lower.includes("training.modules:view,create,edit,delete") ||
      lower.includes("training.modules:create,edit,delete")
    );
  });
}
