/**
 * Permission sections and features for the roles UI.
 * Format for API: module.feature:action1,action2 (e.g. ats.jobs:view,create,edit,delete)
 */
export const PERMISSION_SECTIONS: {
  id: string;
  label: string;
  features: { id: string; label: string }[];
}[] = [
  {
    id: "settings",
    label: "Settings",
    features: [
      { id: "roles", label: "User Roles" },
      { id: "users", label: "Users" },
      { id: "personal-information", label: "Personal Information" },
      { id: "attendance", label: "Attendance" },
      { id: "agents", label: "Agents" },
      { id: "company-email", label: "Company work email" },
      { id: "candidate-sop", label: "Employee SOP" },
      { id: "email-templates", label: "My email templates" },
      { id: "email-templates-admin", label: "All agents' email templates (admin)" },
      { id: "bolna-voice-agent", label: "Bolna voice agent" },
    ],
  },
  {
    id: "candidate",
    label: "Candidate",
    features: [
      { id: "courses", label: "Courses" },
    ],
  },
  {
    id: "ats",
    label: "ATS",
    features: [
      { id: "my-profile", label: "My Profile" },
      { id: "jobs", label: "Jobs" },
      { id: "candidates", label: "Candidates" },
      { id: "share-candidate-form", label: "Share candidate form" },
      { id: "recruiters", label: "Recruiters" },
      { id: "interviews", label: "Interviews" },
      { id: "offers", label: "Offers" },
      { id: "pre-boarding", label: "Pre-boarding" },
      { id: "onboarding", label: "Onboarding" },
      { id: "analytics", label: "Analytics" },
      { id: "external-jobs", label: "External jobs" },
      { id: "candidates.joiningDate", label: "Candidate joining date (field)" },
      { id: "candidates.resignDate", label: "Candidate resign date (field)" },
    ],
  },
  {
    id: "communication",
    label: "Communication",
    features: [
      { id: "emails", label: "Emails" },
      { id: "templates", label: "Templates" },
      { id: "campaigns", label: "Campaigns" },
      { id: "chats", label: "Chats" },
      { id: "calling", label: "Calling" },
      { id: "meetings", label: "Meetings & Recordings" },
      { id: "files-storage", label: "Files Storage" },
    ],
  },
  {
    id: "training",
    label: "Training Management",
    features: [
      { id: "courses", label: "Courses" },
      { id: "categories", label: "Categories" },
      { id: "modules", label: "Modules" },
      { id: "assessments", label: "Assessments" },
      { id: "attendance", label: "Attendance Tracking" },
      { id: "mentors", label: "Mentors" },
      { id: "students", label: "Students" },
      { id: "positions", label: "Positions" },
      { id: "evaluation", label: "Evaluation" },
      { id: "analytics", label: "Analytics" },
    ],
  },
  {
    id: "project",
    label: "Project Management",
    features: [
      { id: "projects", label: "Projects" },
      { id: "my-projects", label: "My Projects" },
      { id: "tasks", label: "My Tasks" },
      { id: "kanban", label: "Task Board (Kanban)" },
      { id: "milestones", label: "Milestones" },
      { id: "teams", label: "Teams" },
      { id: "analytics", label: "Analytics" },
    ],
  },
  {
    id: "logs",
    label: "Logs",
    features: [{ id: "activity", label: "Logs Activity" }],
  },
  {
    id: "support",
    label: "Support",
    features: [{ id: "tickets", label: "Support Tickets" }],
  },
];

export type FeaturePermissions = { view: boolean; create: boolean; edit: boolean; delete: boolean };
export type SectionPermissions = Record<string, FeaturePermissions>;
export type RolePermissionsState = Record<string, SectionPermissions>;

export function getInitialRolePermissions(): RolePermissionsState {
  const state: RolePermissionsState = {};
  PERMISSION_SECTIONS.forEach((section) => {
    state[section.id] = {};
    section.features.forEach((feature) => {
      state[section.id][feature.id] = { view: false, create: false, edit: false, delete: false };
    });
  });
  return state;
}

/** Split "ats.candidates.joiningDate:view,edit" → module ats, feature candidates.joiningDate */
function parsePermissionModuleFeature(permission: string): { module: string; feature: string } | null {
  const trimmed = permission.trim();
  const colonIdx = trimmed.indexOf(":");
  if (colonIdx < 0) return null;
  const moduleFeature = trimmed.slice(0, colonIdx).trim();
  const dotIdx = moduleFeature.indexOf(".");
  if (dotIdx < 0) return null;
  const module = moduleFeature.slice(0, dotIdx);
  const feature = moduleFeature.slice(dotIdx + 1);
  if (!module || !feature) return null;
  return { module, feature };
}

/** True if this permission string maps to a checkbox row in PERMISSION_SECTIONS. */
export function isMappedPermissionString(p: string): boolean {
  const parsed = parsePermissionModuleFeature(p);
  if (!parsed) return false;
  const section = PERMISSION_SECTIONS.find((s) => s.id === parsed.module);
  return !!section?.features.some((f) => f.id === parsed.feature);
}

/** Permissions not represented in the matrix (kept on save unless advanced editor removes them). */
export function getUnmappedPermissionStrings(permissions: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of permissions) {
    if (typeof p !== "string") continue;
    const t = p.trim();
    if (!t || seen.has(t)) continue;
    if (isMappedPermissionString(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

/** Checkbox output ∪ unmapped originals (deduped). */
export function mergePermissionsForRoleSave(mappedFromCheckboxes: string[], originalPermissions: string[]): string[] {
  const unmapped = getUnmappedPermissionStrings(originalPermissions);
  return Array.from(new Set([...mappedFromCheckboxes, ...unmapped]));
}

/** Convert API permission strings to UI state. */
export function permissionsFromApi(permissions: string[]): RolePermissionsState {
  const state = getInitialRolePermissions();
  permissions.forEach((p) => {
    const trimmed = typeof p === "string" ? p.trim() : "";
    if (!trimmed) return;
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx < 0) return;
    const actionsStr = trimmed.slice(colonIdx + 1);
    if (!actionsStr) return;
    const moduleFeature = trimmed.slice(0, colonIdx);
    const dotIdx = moduleFeature.indexOf(".");
    if (dotIdx < 0) return;
    const module = moduleFeature.slice(0, dotIdx);
    const feature = moduleFeature.slice(dotIdx + 1);
    if (!module || !feature || !state[module]?.[feature]) return;
    const actions = actionsStr.split(",").map((a) => a.trim().toLowerCase());
    state[module][feature] = {
      view: actions.includes("view"),
      create: actions.includes("create"),
      edit: actions.includes("edit"),
      delete: actions.includes("delete"),
    };
  });
  return state;
}

/** Convert UI state to API permission strings (module.feature:view,create,edit,delete). Feature id may contain dots (e.g. candidates.joiningDate). */
export function permissionsToApi(state: RolePermissionsState): string[] {
  const out: string[] = [];
  PERMISSION_SECTIONS.forEach((section) => {
    section.features.forEach((feature) => {
      const perms = state[section.id]?.[feature.id];
      if (!perms) return;
      const actions: string[] = [];
      if (perms.view) actions.push("view");
      if (perms.create) actions.push("create");
      if (perms.edit) actions.push("edit");
      if (perms.delete) actions.push("delete");
      if (actions.length) out.push(`${section.id}.${feature.id}:${actions.join(",")}`);
    });
  });
  return out;
}
