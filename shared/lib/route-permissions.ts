/**
 * Map path prefixes to permission prefixes (module.feature:).
 * Used by sidebar (nav visibility) and PermissionGuard (route access).
 * Paths not listed are allowed for any authenticated user (e.g. /dashboard, /settings).
 */

import { ORGANIZATION_ROUTE_PREFIX_ALIASES } from "./organization-permission-aliases";

type CrudAction = "view" | "create" | "edit" | "delete";

interface PathAccessRule {
  permissionPrefixes: string[];
  anyOf: CrudAction[];
}

const EMPLOYEES_PATH_PREFIXES = ["ats.employees:", "ats.candidates:"];

/**
 * Action-aware rules for Employees routes. Longest path wins (add/import before list).
 * View grants nav + list; create gates add/import only.
 */
const PATH_ACCESS_ACTIONS: Record<string, PathAccessRule> = {
  "/ats/employees/add": { permissionPrefixes: EMPLOYEES_PATH_PREFIXES, anyOf: ["create"] },
  "/ats/employees/import": { permissionPrefixes: EMPLOYEES_PATH_PREFIXES, anyOf: ["create"] },
  "/ats/candidates/add": { permissionPrefixes: EMPLOYEES_PATH_PREFIXES, anyOf: ["create"] },
  "/ats/candidates/import": { permissionPrefixes: EMPLOYEES_PATH_PREFIXES, anyOf: ["create"] },
  /** Jobs: view grants nav + list + detail; create/edit gate the create and edit pages only. */
  "/ats/jobs/create": { permissionPrefixes: ["ats.jobs:"], anyOf: ["create"] },
  "/ats/jobs/edit": { permissionPrefixes: ["ats.jobs:"], anyOf: ["edit"] },
  /**
   * Offers/Placement, Pre-boarding, Onboarding: nav + page visibility require the
   * view action specifically. Without these rules the fallback prefix-match grants
   * visibility for ANY CRUD action (create/edit/delete), so a role with only
   * ats.offers:create would see the page. These pages must be view-gated.
   */
  "/ats/offers-placement": { permissionPrefixes: ["ats.offers:"], anyOf: ["view"] },
  "/ats/pre-boarding": { permissionPrefixes: ["ats.pre-boarding:"], anyOf: ["view"] },
  "/ats/onboarding": { permissionPrefixes: ["ats.onboarding:"], anyOf: ["view"] },
  "/ats/employees": {
    permissionPrefixes: EMPLOYEES_PATH_PREFIXES,
    anyOf: ["view", "create", "edit", "delete"],
  },
  "/ats/candidates": {
    permissionPrefixes: EMPLOYEES_PATH_PREFIXES,
    anyOf: ["view", "create", "edit", "delete"],
  },
};

const PATH_ACCESS_KEYS = Object.keys(PATH_ACCESS_ACTIONS).sort(
  (a, b) => b.length - a.length
);

function permissionStringGrantsRule(perm: string, rule: PathAccessRule): boolean {
  const colon = perm.indexOf(":");
  if (colon < 0) return false;
  const keyWithColon = `${perm.slice(0, colon).trim()}:`;
  if (!rule.permissionPrefixes.includes(keyWithColon)) return false;
  const actions = perm
    .slice(colon + 1)
    .split(",")
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean);
  return rule.anyOf.some((needed) => actions.includes(needed));
}

function getPathAccessRule(pathname: string): PathAccessRule | null {
  const normalized = pathname.replace(/\/$/, "") || "/";
  for (const path of PATH_ACCESS_KEYS) {
    if (normalized === path || normalized.startsWith(`${path}/`)) {
      return PATH_ACCESS_ACTIONS[path];
    }
  }
  return null;
}

export const PATH_PERMISSION_PREFIX: Record<string, string> = {
  // General
  "/dashboard": "general.dashboard:",
  "/logs/logs-activity": "logs.activity:",
  // ATS
  "/ats/jobs": "ats.jobs:",
  "/ats/employees": "ats.employees:",
  "/ats/referral-leads": "ats.referralLeads:",
  /** Legacy path (Next redirects to /ats/employees); keep for any client-side guard before redirect. */
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
  // Organization (separate module)
  "/organization/chart": "organization.chart:",
  "/organization/structure": "organization.structure:",
  "/organization/departments": "organization.departments:",
  "/organization/directory": "organization.directory:",
  "/organization/scenarios": "organization.scenarios:",
  // Communication
  "/communication/calling": "communication.calling:",
  // Training Management
  "/training/curriculum": "training.modules:",
  "/training/attendance": "training.attendance:",
  "/training/mentors": "training.mentors:",
  "/training/students": "training.students:",
  "/training/positions": "training.positions:",
  "/training/evaluation": "training.evaluation:",
  "/training/analytics": "training.analytics:",
  // Project Management
  "/apps/projects/my-projects": "project.my-projects:",
  "/apps/projects/project-list": "project.projects:",
  "/apps/projects/assignment": "project.projects:",
  "/task/my-tasks": "project.tasks:",
  "/task/kanban-board": "project.kanban:",
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
 * E.g. training.categories: and training.positions: grant access to paths requiring training.modules:
 * (roles UI has separate Modules/Categories/Positions checkboxes but nav shows one Training Curriculum section).
 */
const PERMISSION_PREFIX_ALIASES: Record<string, string[]> = {
  "training.modules:": ["training.categories:", "training.positions:"],
  /** Referral leads matrix row uses ats.referralLeads:*; legacy roles only have ats.candidates:view. */
  "ats.referralLeads:": ["ats.candidates:"],
  /** Employees page (PR3): legacy roles may still hold ats.candidates:* until migration completes everywhere. */
  "ats.employees:": ["ats.candidates:"],
  /** Kanban board: backend grants tasks.read → kanban.read, so any role with project.tasks:* can render the page. */
  "project.kanban:": ["project.tasks:"],
  ...ORGANIZATION_ROUTE_PREFIX_ALIASES,
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
 * Returns true if the user has at least one permission that starts with the required prefix
 * or any of its aliases (e.g. training.categories: grants access for training.modules: paths).
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
 * Route access with optional CRUD action rules (Employees: view → list/nav, create → add/import).
 * Falls back to prefix-only check for paths without action rules.
 */
export function canAccessPath(userPermissions: string[], pathname: string): boolean {
  const rule = getPathAccessRule(pathname);
  if (rule) {
    return userPermissions.some((p) => permissionStringGrantsRule(p, rule));
  }
  const required = getRequiredPermissionForPath(pathname);
  if (required == null) return true;
  return hasPermissionForPath(userPermissions, required);
}

/** Path for candidate's own profile (role 'user' from share-candidate-form). Also used as the fallback redirect when a user lacks permission for the requested route (incl. /dashboard). */
export const CANDIDATE_PROFILE_PATH = "/ats/my-profile";

/** Permission prefix for the main dashboard. Admin-only by default; grantable per role via the matrix. */
export const DASHBOARD_PERMISSION_PREFIX = "general.dashboard:";

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

