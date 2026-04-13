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
