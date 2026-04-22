/**
 * Raw domain permissions from GET /auth/my-permissions (e.g. settings.users:view,create,edit,delete).
 * Aligns with backend requirePermissions('users.manage'), which is granted by settings.users create/edit/delete.
 */
export function hasSettingsUsersManage(rawPermissions: string[]): boolean {
  return rawPermissions.some((p) => {
    const [key, actionsPart] = p.split(":");
    if (key?.trim() !== "settings.users" || !actionsPart) return false;
    const actions = actionsPart.split(",").map((x) => x.trim().toLowerCase());
    return actions.some((x) => x === "create" || x === "edit" || x === "delete");
  });
}

/**
 * True when the user may call GET /roles (backend: roles.read).
 * Derived from raw `settings.roles:view` or any create/edit/delete on settings.roles.
 */
export function userCanListRoles(rawPermissions: string[]): boolean {
  return rawPermissions.some((p) => {
    const [key, actionsPart] = p.split(":");
    if (key?.trim() !== "settings.roles" || !actionsPart) return false;
    const actions = actionsPart.split(",").map((x) => x.trim().toLowerCase());
    return (
      actions.includes("view") ||
      actions.some((x) => x === "create" || x === "edit" || x === "delete")
    );
  });
}

/** True when the user may open/read Communication -> Email and personal email preferences. */
export function hasEmailReadAccess(rawPermissions: string[]): boolean {
  return rawPermissions.some((p) => {
    if (p === "emails.read" || p === "emails.manage") return true;
    const [key, actionsPart] = p.split(":");
    if (key?.trim() !== "communication.emails" || !actionsPart) return false;
    const actions = actionsPart.split(",").map((x) => x.trim().toLowerCase());
    return (
      actions.includes("view") ||
      actions.some((x) => x === "create" || x === "edit" || x === "delete")
    );
  });
}

/** True when the user may modify email data (send mail, save templates/signature, etc). */
export function hasEmailManageAccess(rawPermissions: string[]): boolean {
  return rawPermissions.some((p) => {
    if (p === "emails.manage") return true;
    const [key, actionsPart] = p.split(":");
    if (key?.trim() !== "communication.emails" || !actionsPart) return false;
    const actions = actionsPart.split(",").map((x) => x.trim().toLowerCase());
    return actions.some((x) => x === "create" || x === "edit" || x === "delete");
  });
}

/**
 * Raw `settings.<featureId>:view,...` — any view or write action grants access to that Settings tab.
 * Feature id matches `roles-permissions` (e.g. `personal-information`, `email-templates-admin`).
 */
export function hasSettingsFeatureAccess(rawPermissions: string[], featureId: string): boolean {
  const prefix = `settings.${featureId}:`;
  return rawPermissions.some((p) => {
    if (typeof p !== "string" || !p.startsWith(prefix)) return false;
    const colon = p.indexOf(":");
    const actionsPart = colon >= 0 ? p.slice(colon + 1) : "";
    const actions = actionsPart
      .split(",")
      .map((a) => a.trim().toLowerCase())
      .filter(Boolean);
    return (
      actions.includes("view") ||
      actions.some((a) => a === "create" || a === "edit" || a === "delete")
    );
  });
}

/** True when the role matrix grants a specific action on `settings.<featureId>`. */
export function hasSettingsFeatureAction(
  rawPermissions: string[],
  featureId: string,
  action: "view" | "create" | "edit" | "delete"
): boolean {
  const prefix = `settings.${featureId}:`;
  return rawPermissions.some((p) => {
    if (typeof p !== "string" || !p.startsWith(prefix)) return false;
    const colon = p.indexOf(":");
    const actionsPart = colon >= 0 ? p.slice(colon + 1) : "";
    return actionsPart
      .split(",")
      .map((a) => a.trim().toLowerCase())
      .filter(Boolean)
      .includes(action);
  });
}

/**
 * True if any role permission uses the Settings matrix prefix (`settings.<feature>:`).
 * When true, Settings sub-tab visibility should follow those strings only (plus super-user
 * bypass), not legacy heuristics like role name "Administrator" or `students.manage`.
 */
export function hasAnySettingsModulePermission(rawPermissions: string[]): boolean {
  return rawPermissions.some((p) => typeof p === "string" && p.startsWith("settings."));
}
