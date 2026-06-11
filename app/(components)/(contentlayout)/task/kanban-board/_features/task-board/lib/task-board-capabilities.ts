import { hasPermission } from "@/shared/lib/permissions";

type AuthLike =
  | {
      permissions?: string[] | null;
      isAdministrator?: boolean;
      isPlatformSuperUser?: boolean;
    }
  | null
  | undefined;

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
