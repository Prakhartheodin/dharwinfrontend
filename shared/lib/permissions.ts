/**
 * Semantic action → role permission prefix + required action(s) mapping.
 * Mirrors backend src/config/actionPermissions.js. Use action keys in components
 * instead of raw permission strings so the mapping rule lives in one place.
 *
 * Each entry lists the role-matrix prefixes (e.g. 'project.tasks') and the actions
 * required (any of). 'view' alone implies read; create/edit/delete imply write.
 */
type RbacAction = "view" | "create" | "edit" | "delete";

interface ActionRule {
  /** One or more role-matrix prefixes (without trailing colon). */
  prefixes: string[];
  /** Actions that satisfy the rule (any of). */
  anyOf: RbacAction[];
}

export const ACTION_PERMISSIONS: Record<string, ActionRule> = Object.freeze({
  // Projects
  view_projects: { prefixes: ["project.projects"], anyOf: ["view", "create", "edit", "delete"] },
  create_project: { prefixes: ["project.projects"], anyOf: ["create"] },
  update_project: { prefixes: ["project.projects"], anyOf: ["edit"] },
  delete_project: { prefixes: ["project.projects"], anyOf: ["delete"] },
  assign_project: { prefixes: ["project.projects"], anyOf: ["create", "edit"] },

  // Tasks
  view_tasks: { prefixes: ["project.tasks", "project.kanban"], anyOf: ["view", "create", "edit", "delete"] },
  create_task: { prefixes: ["project.tasks", "project.kanban"], anyOf: ["create"] },
  update_task: { prefixes: ["project.tasks", "project.kanban"], anyOf: ["edit"] },
  delete_task: { prefixes: ["project.tasks", "project.kanban"], anyOf: ["delete"] },
  assign_task: { prefixes: ["project.tasks", "project.kanban"], anyOf: ["create", "edit"] },
  comment_on_task: { prefixes: ["project.tasks", "project.kanban"], anyOf: ["view", "create", "edit", "delete"] },

  // Teams
  view_teams: { prefixes: ["project.teams"], anyOf: ["view", "create", "edit", "delete"] },
  create_team: { prefixes: ["project.teams"], anyOf: ["create"] },
  update_team: { prefixes: ["project.teams"], anyOf: ["edit"] },
  delete_team: { prefixes: ["project.teams"], anyOf: ["delete"] },

  // ATS Jobs
  view_jobs: { prefixes: ["ats.jobs"], anyOf: ["view", "create", "edit", "delete"] },
  view_internal_jobs: { prefixes: ["ats.jobs"], anyOf: ["view", "create", "edit", "delete"] },
  create_job: { prefixes: ["ats.jobs"], anyOf: ["create"] },
  update_job: { prefixes: ["ats.jobs"], anyOf: ["edit"] },
  delete_job: { prefixes: ["ats.jobs"], anyOf: ["delete"] },

  // ATS Candidates (legacy pipeline / referral)
  view_candidates: { prefixes: ["ats.candidates"], anyOf: ["view", "create", "edit", "delete"] },
  manage_candidates: { prefixes: ["ats.candidates"], anyOf: ["create", "edit", "delete"] },

  // ATS Employees (PR3 — primary gate for /ats/employees; ats.candidates legacy backstop matches backend)
  view_employees: {
    prefixes: ["ats.employees", "ats.candidates"],
    anyOf: ["view", "create", "edit", "delete"],
  },
  create_employee: {
    prefixes: ["ats.employees", "ats.candidates"],
    anyOf: ["create"],
  },
  update_employee: {
    prefixes: ["ats.employees", "ats.candidates"],
    anyOf: ["edit"],
  },
  delete_employee: {
    prefixes: ["ats.employees", "ats.candidates"],
    anyOf: ["delete"],
  },
  /** Any write action — prefer create/update/delete for UI gates. */
  manage_employees: {
    prefixes: ["ats.employees", "ats.candidates"],
    anyOf: ["create", "edit", "delete"],
  },

  // Company work email / number (Settings → Company work email & number sub-views)
  view_company_email: {
    prefixes: ["settings.company-email"],
    anyOf: ["view", "create", "edit", "delete"],
  },
  view_company_number: {
    prefixes: ["settings.company-number", "communication.company-work-numbers"],
    anyOf: ["view", "create", "edit", "delete"],
  },
  manage_company_number: {
    prefixes: ["settings.company-number", "communication.company-work-numbers"],
    anyOf: ["create", "edit", "delete"],
  },

  // Communication / telephony (Calling dialer, Bolna call records)
  view_calls: {
    prefixes: ["communication.calling", "calls", "calling"],
    anyOf: ["view", "create", "edit", "delete"],
  },
  create_call: {
    prefixes: ["communication.calling", "calls", "calling"],
    anyOf: ["create"],
  },
  update_call: {
    prefixes: ["communication.calling", "calls", "calling"],
    anyOf: ["edit"],
  },
  delete_call: {
    prefixes: ["communication.calling", "calls", "calling"],
    anyOf: ["delete"],
  },
  manage_calls: {
    prefixes: ["communication.calling", "calls", "calling"],
    anyOf: ["create", "edit", "delete"],
  },

  // Granular call sub-features (separate role toggles under Communication)
  toggle_call_recording: {
    prefixes: ["communication.call-recording", "call-recording"],
    anyOf: ["create", "edit"],
  },
  view_call_transcripts: {
    prefixes: ["communication.call-transcripts", "call-transcripts"],
    anyOf: ["view", "create", "edit", "delete"],
  },
  view_call_ai: {
    prefixes: ["communication.call-ai", "call-ai"],
    anyOf: ["view", "create", "edit", "delete"],
  },
  manage_call_ai: {
    prefixes: ["communication.call-ai", "call-ai"],
    anyOf: ["create", "edit", "delete"],
  },

  // Training categories (course assignment tab)
  // Cross-deps (backend): view loads GET /categories + GET /modules + GET /mentors + GET /modules/:id/employees.
  // Assign/remove employees on a module row needs training.modules:edit (modules.manage), not categories:edit alone.
  view_training_categories: {
    prefixes: ["training.categories", "training.modules"],
    anyOf: ["view", "create", "edit", "delete"],
  },
  create_training_category: { prefixes: ["training.categories"], anyOf: ["create"] },
  update_training_category: { prefixes: ["training.categories"], anyOf: ["edit"] },
  delete_training_category: { prefixes: ["training.categories"], anyOf: ["delete"] },

  // Training modules — employee/mentor assignment on Categories tab; module↔position linking on Positions tab.
  edit_training_module: { prefixes: ["training.modules"], anyOf: ["edit", "create", "delete"] },

  // Training positions (roster tab)
  // Cross-deps (backend): GET /positions/roster (positions.read); module column from roster payload.
  // Linking modules to a position: training.positions:edit OR training.modules:edit (positions.manage / modules.manage).
  view_training_positions: {
    prefixes: ["training.positions", "training.modules"],
    anyOf: ["view", "create", "edit", "delete"],
  },
  edit_training_position: { prefixes: ["training.positions"], anyOf: ["edit", "create", "delete"] },

  // Training modules (standalone Training Modules page / nav child)
  view_training_modules: {
    prefixes: ["training.modules"],
    anyOf: ["view", "create", "edit", "delete"],
  },
});

/**
 * Flat semantic-action gate. Resolves the action to the role-matrix rule then
 * checks the user's raw permissions.
 *
 * super_admin (platformSuperUser) bypasses the gate. The named "Administrator"
 * role does NOT auto-bypass — admin must hold the explicit role-matrix
 * permission, identical to every other role. This keeps RBAC predictable:
 * unchecking a checkbox on the Administrator role takes effect immediately on
 * sidebar visibility, route guards, and feature gates that call this helper.
 *
 * Usage:
 *   const auth = useAuth();
 *   if (hasPermission(auth, 'assign_task')) {
 *     // render Assign button
 *   }
 *
 * @param user Auth context shape: { permissions, isPlatformSuperUser }
 * @param action Semantic action key (e.g. 'create_project', 'view_internal_jobs')
 */
export function hasPermission(
  user:
    | {
        permissions?: string[] | null;
        isAdministrator?: boolean;
        isPlatformSuperUser?: boolean;
      }
    | null
    | undefined,
  action: string
): boolean {
  if (!user) return false;
  if (user.isPlatformSuperUser) return true;
  const rule = ACTION_PERMISSIONS[action];
  if (!rule) {
    if (typeof console !== "undefined") {
      console.warn(`hasPermission: unknown action "${action}"`);
    }
    return false;
  }
  const perms = user.permissions ?? [];
  return perms.some((p) => {
    const [keyRaw, actionsPart] = p.split(":");
    const key = keyRaw?.trim();
    if (!key || !actionsPart || !rule.prefixes.includes(key)) return false;
    const actions = actionsPart
      .split(",")
      .map((a) => a.trim().toLowerCase())
      .filter(Boolean);
    return rule.anyOf.some((needed) => actions.includes(needed));
  });
}

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

/** True when the user may list/view jobs (and job templates API). Mirrors `jobs.read` / `ats.jobs:view,...`. */
export function hasJobsReadAccess(rawPermissions: string[]): boolean {
  if (rawPermissions.includes("jobs.read") || rawPermissions.includes("jobs.manage")) return true;
  return rawPermissions.some((p) => {
    const [key, actionsPart] = p.split(":");
    if (key?.trim() !== "ats.jobs" || !actionsPart) return false;
    const actions = actionsPart.split(",").map((x) => x.trim().toLowerCase());
    return (
      actions.includes("view") ||
      actions.some((x) => x === "create" || x === "edit" || x === "delete")
    );
  });
}

/** True when the user may create/update/delete jobs and job templates. Mirrors `jobs.manage` / write on `ats.jobs`. */
export function hasJobsManageAccess(rawPermissions: string[]): boolean {
  if (rawPermissions.includes("jobs.manage")) return true;
  return rawPermissions.some((p) => {
    const [key, actionsPart] = p.split(":");
    if (key?.trim() !== "ats.jobs" || !actionsPart) return false;
    const actions = actionsPart.split(",").map((x) => x.trim().toLowerCase());
    return actions.some((x) => x === "create" || x === "edit" || x === "delete");
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
