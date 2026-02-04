/**
 * Map path prefixes to permission prefixes (module.feature:).
 * Used by sidebar (nav visibility) and PermissionGuard (route access).
 * Paths not listed are allowed for any authenticated user (e.g. /dashboard, /settings).
 */

export const PATH_PERMISSION_PREFIX: Record<string, string> = {
  // ATS
  "/ats/jobs": "ats.jobs:",
  "/ats/candidates": "ats.candidates:",
  "/ats/recruiters": "ats.recruiters:",
  "/ats/interviews": "ats.interviews:",
  "/ats/offers-placement": "ats.offers:",
  "/ats/pre-boarding": "ats.pre-boarding:",
  "/ats/onboarding": "ats.onboarding:",
  "/ats/analytics": "ats.analytics:",
  // Communication
  "/pages/email/mail-app": "communication.emails:",
  "/pages/chat": "communication.chats:",
  "/communication/calling": "communication.calling:",
  "/pages/filemanager": "communication.files-storage:",
  // Training Management
  "/training/curriculum": "training.courses:",
  "/training/attendance": "training.attendance:",
  "/training/mentors": "training.mentors:",
  "/training/students": "training.students:",
  "/training/evaluation": "training.evaluation:",
  "/training/analytics": "training.analytics:",
  // Project Management (sidebar uses /apps/... and /task/...; app routes also use /project-management/...)
  "/apps/projects/project-list": "project.projects:",
  "/task/kanban-board": "project.tasks:",
  "/pages/team": "project.teams:",
  "/project-management/projects": "project.projects:",
  "/project-management/task": "project.tasks:",
  "/project-management/teams": "project.teams:",
  "/project-management/analytics": "project.analytics:",
  // Communication (app routes under /communication/...)
  "/communication/email": "communication.emails:",
  "/communication/chats": "communication.chats:",
  "/communication/filemanager": "communication.files-storage:",
};

/** Path prefixes that require permission, sorted by length descending for longest-match. */
const PATH_PREFIXES = Object.keys(PATH_PERMISSION_PREFIX).sort(
  (a, b) => b.length - a.length
);

/**
 * Returns the permission prefix required for the given pathname, or null if the path is not permission-protected.
 * Matches by prefix so /ats/jobs/create requires ats.jobs:.
 */
export function getRequiredPermissionForPath(pathname: string): string | null {
  const normalized = pathname.replace(/\/$/, "") || "/";
  for (const path of PATH_PREFIXES) {
    if (normalized === path || normalized.startsWith(path + "/")) {
      return PATH_PERMISSION_PREFIX[path];
    }
  }
  return null;
}

/**
 * Returns true if the user has at least one permission that starts with the required prefix.
 */
export function hasPermissionForPath(
  userPermissions: string[],
  requiredPrefix: string
): boolean {
  return userPermissions.some((p) => p.startsWith(requiredPrefix));
}
