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
    id: "ats",
    label: "ATS",
    features: [
      { id: "jobs", label: "Jobs" },
      { id: "candidates", label: "Candidates" },
      { id: "recruiters", label: "Recruiters" },
      { id: "interviews", label: "Interviews" },
      { id: "offers", label: "Offers" },
      { id: "pre-boarding", label: "Pre-boarding" },
      { id: "onboarding", label: "Onboarding" },
      { id: "analytics", label: "Analytics" },
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
      { id: "files-storage", label: "Files Storage" },
    ],
  },
  {
    id: "training",
    label: "Training Management",
    features: [
      { id: "courses", label: "Courses" },
      { id: "modules", label: "Modules" },
      { id: "assessments", label: "Assessments" },
      { id: "attendance", label: "Attendance Tracking" },
      { id: "mentors", label: "Mentors" },
      { id: "students", label: "Students" },
      { id: "evaluation", label: "Evaluation" },
      { id: "analytics", label: "Analytics" },
    ],
  },
  {
    id: "project",
    label: "Project Management",
    features: [
      { id: "projects", label: "Projects" },
      { id: "tasks", label: "Tasks" },
      { id: "milestones", label: "Milestones" },
      { id: "teams", label: "Teams" },
      { id: "analytics", label: "Analytics" },
    ],
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

/** Convert API permission strings to UI state. */
export function permissionsFromApi(permissions: string[]): RolePermissionsState {
  const state = getInitialRolePermissions();
  permissions.forEach((p) => {
    const [moduleFeature, actionsStr] = p.split(":");
    if (!actionsStr) return;
    const [module, feature] = moduleFeature.split(".");
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

/** Convert UI state to API permission strings (module.feature:view,create,edit,delete). */
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
