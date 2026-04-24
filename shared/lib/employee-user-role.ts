/**
 * User Role.name / API `roleNames` values for the ATS **employee** persona
 * (job seeker; formerly labeled "Candidate" in the UI). Keep in sync with backend
 * `Employee` / legacy `Candidate` role documents.
 */
export function isEmployeeUserRoleNameLower(n: string): boolean {
  const x = n.trim().toLowerCase();
  return x === "employee" || x === "candidate" || x === "user";
}
