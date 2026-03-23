/**
 * Raw permission strings from GET /auth/my-permissions (domain format).
 * Mirrors backend deriveApiPermissions for the roles resource.
 */
export function userCanListRoles(rawPermissions: string[]): boolean {
  for (const raw of rawPermissions) {
    const [key, actionsPart] = raw.split(":");
    if (!key || !actionsPart) continue;
    const dot = key.indexOf(".");
    const resource = dot >= 0 ? key.slice(dot + 1).trim() : key.trim();
    if (resource !== "roles") continue;
    const actions = actionsPart.split(",").map((a) => a.trim().toLowerCase());
    if (actions.includes("view")) return true;
  }
  return false;
}
