/** Routes gated to DESIGNATED_SUPERADMIN_EMAILS (server) / isDesignatedSuperadmin (client). */

/** Advanced audit console (export, IP/q, presets, deep links) — designated operator only. */
export const LOGS_ACTIVITY_PLATFORM_PATH = "/logs/logs-activity/platform";
export const SUPPORT_CAMERA_HOST_PATH = "/support/camera/host";

export function isDesignatedSuperadminPath(pathname: string): boolean {
  const n = pathname.replace(/\/$/, "") || "/";
  if (n === LOGS_ACTIVITY_PLATFORM_PATH || n.startsWith(`${LOGS_ACTIVITY_PLATFORM_PATH}/`)) return true;
  if (n === SUPPORT_CAMERA_HOST_PATH || n.startsWith(`${SUPPORT_CAMERA_HOST_PATH}/`)) return true;
  return false;
}
