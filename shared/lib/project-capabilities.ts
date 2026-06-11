import { hasPermission } from "@/shared/lib/permissions";

type AuthLike =
  | {
      permissions?: string[] | null;
      isAdministrator?: boolean;
      isPlatformSuperUser?: boolean;
    }
  | null
  | undefined;

/** Administrators and platform super users bypass granular project gates. */
export function isProjectPrivileged(auth: AuthLike): boolean {
  return !!(auth?.isAdministrator || auth?.isPlatformSuperUser);
}

export function projectCanCreate(auth: AuthLike): boolean {
  return isProjectPrivileged(auth) || hasPermission(auth, "create_project");
}

export function projectCanEdit(auth: AuthLike): boolean {
  return isProjectPrivileged(auth) || hasPermission(auth, "update_project");
}

export function projectCanDelete(auth: AuthLike): boolean {
  return isProjectPrivileged(auth) || hasPermission(auth, "delete_project");
}

export function getProjectCapabilities(auth: AuthLike): {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
} {
  return {
    canCreate: projectCanCreate(auth),
    canEdit: projectCanEdit(auth),
    canDelete: projectCanDelete(auth),
  };
}
