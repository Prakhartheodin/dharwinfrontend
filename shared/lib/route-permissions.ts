/**
 * Map path prefixes to permission prefixes (module.feature:).
 * Used by sidebar (nav visibility) and PermissionGuard (route access).
 * Paths not listed are allowed for any authenticated user (e.g. /dashboard, /settings).
 */

export const PATH_PERMISSION_PREFIX: Record<string, string> = {
  "/logs/logs-activity": "logs.activity:",
  // ATS
  "/ats/jobs": "ats.jobs:",
  "/ats/candidates": "ats.candidates:",
  "/ats/share-candidate-form": "ats.share-candidate-form:",
  // Browse Jobs and My Applications are public - no permission required
  "/ats/my-profile": "ats.my-profile:",
  "/courses": "candidate.courses:",
  "/ats/recruiters": "ats.recruiters:",
  "/ats/interviews": "ats.interviews:",
  "/ats/offers-placement": "ats.offers:",
  "/ats/pre-boarding": "ats.pre-boarding:",
  "/ats/onboarding": "ats.onboarding:",
  "/ats/analytics": "ats.analytics:",
  "/ats/external-jobs": "ats.external-jobs:",
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
  "/training/positions": "training.positions:",
  "/training/evaluation": "training.evaluation:",
  "/training/analytics": "training.analytics:",
  // Project Management (sidebar uses /apps/... and /task/...; app routes also use /project-management/...)
  "/apps/projects/my-projects": "project.my-projects:",
  "/apps/projects/project-list": "project.projects:",
  "/apps/projects/assignment": "project.projects:",
  "/task/my-tasks": "project.tasks:",
  "/task/kanban-board": "project.kanban:",
  "/pages/team": "project.teams:",
  "/project-management/projects": "project.projects:",
  "/project-management/task": "project.kanban:",
  "/project-management/teams": "project.teams:",
  "/project-management/analytics": "project.analytics:",
  // Communication (app routes under /communication/...)
  "/communication/email": "communication.emails:",
  "/communication/chats": "communication.chats:",
  "/communication/meetings": "communication.meetings:",
  "/communication/filemanager": "communication.files-storage:",
  "/communication/recordings": "communication.meetings:",
  "/support-tickets": "support.tickets:",
};

/**
 * Permission prefixes that also grant access to another prefix.
 * E.g. training.modules: and training.categories: grant access to paths requiring training.courses:
 * (roles UI has separate Modules/Categories checkboxes but nav shows one Training Curriculum section).
 */
const PERMISSION_PREFIX_ALIASES: Record<string, string[]> = {
  "training.courses:": ["training.modules:", "training.categories:"],
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
  // Designated-only audit console; PermissionGuard handles access (not role permissions).
  if (
    normalized === "/logs/logs-activity/platform" ||
    normalized.startsWith("/logs/logs-activity/platform/")
  ) {
    return null;
  }
  for (const path of PATH_PREFIXES) {
    if (normalized === path || normalized.startsWith(path + "/")) {
      return PATH_PERMISSION_PREFIX[path];
    }
  }
  return null;
}

/**
 * Same as getRequiredPermissionForPath, but treats project-list with ?mine=1 as My Projects permission.
 */
export function getRequiredPermissionForPathWithSearch(
  pathname: string,
  searchParams: URLSearchParams | ReadonlyURLSearchParams | null | undefined
): string | null {
  const normalized = pathname.replace(/\/$/, "") || "/";
  const mine = (searchParams?.get("mine") || "").toLowerCase();
  const mineOn = mine === "1" || mine === "true" || mine === "yes";
  if (
    mineOn &&
    (normalized === "/apps/projects/project-list" || normalized.startsWith("/apps/projects/project-list/"))
  ) {
    return "project.my-projects:";
  }
  return getRequiredPermissionForPath(pathname);
}

/**
 * Returns true if the user has at least one permission that starts with the required prefix
 * or any of its aliases (e.g. training.modules: grants access for training.courses: paths).
 */
export function hasPermissionForPath(
  userPermissions: string[],
  requiredPrefix: string
): boolean {
  const prefixes = [
    requiredPrefix,
    ...(PERMISSION_PREFIX_ALIASES[requiredPrefix] ?? []),
  ];
  return userPermissions.some((p) =>
    prefixes.some((prefix) => p.startsWith(prefix))
  );
}

/**
 * My Projects workspace (list with ?mine=1, etc.): explicit `project.my-projects:*` **or**
 * legacy `project.projects:*` only (so old roles keep access until admins add my-projects).
 * Do **not** use this for sidebar nav visibility — use {@link hasExplicitMyProjectsNavPermission}.
 */
export function hasMyProjectsWorkspaceAccess(userPermissions: string[]): boolean {
  return (
    userPermissions.some(
      (p) => typeof p === "string" && p.startsWith(PROJECT_MY_PROJECTS_PREFIX)
    ) ||
    userPermissions.some(
      (p) => typeof p === "string" && p.startsWith(PROJECT_PROJECTS_PREFIX)
    )
  );
}

/** Sidebar / nav: show My Projects only when the role includes `project.my-projects:*`. */
export function hasExplicitMyProjectsNavPermission(userPermissions: string[]): boolean {
  return userPermissions.some(
    (p) => typeof p === "string" && p.startsWith(PROJECT_MY_PROJECTS_PREFIX)
  );
}

/** Path for candidate's own profile (role 'user' from share-candidate-form). */
export const CANDIDATE_PROFILE_PATH = "/ats/my-profile";

/** Permission prefix for the candidate-only courses section. */
export const COURSES_PERMISSION_PREFIX = "candidate.courses:";

/** Permission prefix for attendance tracking. */
export const ATTENDANCE_PERMISSION_PREFIX = "training.attendance:";

/** Permission prefix for project management (main project list). */
export const PROJECT_PROJECTS_PREFIX = "project.projects:";

/** Permission prefix for My Projects (assigned / mine list). */
export const PROJECT_MY_PROJECTS_PREFIX = "project.my-projects:";

/** Permission prefix for task management. */
export const PROJECT_TASKS_PREFIX = "project.tasks:";

