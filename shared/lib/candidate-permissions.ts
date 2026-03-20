const ATS_FULL = "ats.candidates:view,create,edit,delete";

function matchesAtsCandidateSubPermission(
  raw: string,
  subKey: "ats.candidates.joiningDate" | "ats.candidates.resignDate"
): boolean {
  if (!raw) return false;
  if (raw === ATS_FULL) return true;
  const colon = raw.indexOf(":");
  if (colon < 0) return false;
  const key = raw.slice(0, colon).trim();
  const actionsPart = raw.slice(colon + 1);
  if (key !== subKey) return false;
  const actions = actionsPart.split(",").map((a) => a.trim().toLowerCase());
  return actions.some((a) => ["view", "edit", "create", "delete"].includes(a));
}

/**
 * Raw domain permissions (GET /auth/my-permissions) that allow updating a candidate's joining date.
 * Mirrors backend: candidates.manage OR candidates.joiningDate.manage (from ats.candidates.joiningDate:…).
 */
export function canEditCandidateJoiningDate(
  rawPermissions: string[],
  isAdministrator: boolean
): boolean {
  if (isAdministrator) return true;
  return rawPermissions.some((raw) => matchesAtsCandidateSubPermission(raw, "ats.candidates.joiningDate"));
}

/**
 * Same pattern for resign date (candidates.resignDate.manage from ats.candidates.resignDate:…).
 */
export function canEditCandidateResignDate(
  rawPermissions: string[],
  isAdministrator: boolean
): boolean {
  if (isAdministrator) return true;
  return rawPermissions.some((raw) => matchesAtsCandidateSubPermission(raw, "ats.candidates.resignDate"));
}
