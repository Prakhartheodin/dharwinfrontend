import {
  getRequiredPermissionForPath,
  hasPermissionForPath,
} from "@/shared/lib/route-permissions";

/**
 * Maps activity log entity types to in-app destinations (aligned with App Router paths).
 * Returns null when no safe target exists.
 */
export function getActivityLogEntityHref(
  entityType: string | null | undefined,
  entityId: string | null | undefined
): string | null {
  const id = entityId?.trim();
  if (!id) return null;
  if (entityType === "Candidate" && id === "onboarding-invite") return null;

  switch (entityType) {
    case "Candidate":
      return `/ats/candidates/edit?id=${encodeURIComponent(id)}`;
    case "Job":
      return `/ats/jobs/edit/${encodeURIComponent(id)}`;
    case "User":
      return `/settings/users/edit?id=${encodeURIComponent(id)}`;
    case "Role":
      return `/settings/roles/edit?id=${encodeURIComponent(id)}`;
    case "Student":
      return `/training/students/edit?id=${encodeURIComponent(id)}`;
    case "Mentor":
      return `/training/mentors/edit?id=${encodeURIComponent(id)}`;
    case "Category":
      return `/training/curriculum`;
    default:
      return null;
  }
}

/**
 * Whether the viewer may open the entity link (mirrors PermissionGuard: admin/super bypass; else path prefix).
 */
export function canOpenActivityLogEntity(
  entityType: string | null | undefined,
  entityId: string | null | undefined,
  userPermissions: string[],
  isAdministrator: boolean,
  isPlatformSuperUser: boolean
): boolean {
  const href = getActivityLogEntityHref(entityType, entityId);
  if (!href) return false;
  if (isAdministrator || isPlatformSuperUser) return true;
  const pathOnly = href.split("?")[0] ?? href;
  const required = getRequiredPermissionForPath(pathOnly);
  if (required == null) return true;
  return hasPermissionForPath(userPermissions, required);
}
