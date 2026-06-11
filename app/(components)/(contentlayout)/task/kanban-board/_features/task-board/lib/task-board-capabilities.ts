import { hasPermission } from "@/shared/lib/permissions";

type AuthLike =
  | {
      permissions?: string[] | null;
      isAdministrator?: boolean;
      isPlatformSuperUser?: boolean;
    }
  | null
  | undefined;

function rawMatrixActions(permissions: string[], prefix: string): string[] {
  const entry = permissions.find((p) => p.split(":")[0]?.trim() === prefix);
  if (!entry) return [];
  const actionsPart = entry.split(":")[1];
  if (!actionsPart) return [];
  return actionsPart
    .split(",")
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean);
}

/** project.kanban:view only — no create/edit/delete on kanban or broader tasks/projects modules. */
export function taskBoardScopeToAssignedOnly(auth: AuthLike): boolean {
  if (isTaskBoardPrivileged(auth)) return false;
  const perms = auth?.permissions ?? [];
  const kanbanActions = rawMatrixActions(perms, "project.kanban");
  if (!kanbanActions.includes("view")) return false;
  if (kanbanActions.some((a) => a === "create" || a === "edit" || a === "delete")) {
    return false;
  }
  if (hasPermission(auth, "view_projects")) return false;
  if (rawMatrixActions(perms, "project.tasks").length > 0) return false;
  return true;
}

/** Administrators and platform super users bypass granular kanban gates. */
export function isTaskBoardPrivileged(auth: AuthLike): boolean {
  return !!(auth?.isAdministrator || auth?.isPlatformSuperUser);
}

export function taskBoardCanCreate(auth: AuthLike): boolean {
  return isTaskBoardPrivileged(auth) || hasPermission(auth, "create_task");
}

export function taskBoardCanEdit(auth: AuthLike): boolean {
  return isTaskBoardPrivileged(auth) || hasPermission(auth, "update_task");
}

export function taskBoardCanDelete(auth: AuthLike): boolean {
  return isTaskBoardPrivileged(auth) || hasPermission(auth, "delete_task");
}

export function getTaskBoardCapabilities(auth: AuthLike): {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
} {
  return {
    canCreate: taskBoardCanCreate(auth),
    canEdit: taskBoardCanEdit(auth),
    canDelete: taskBoardCanDelete(auth),
  };
}
