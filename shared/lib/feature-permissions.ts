/**
 * Feature-level permissions (view, create, edit, delete).
 * API format: module.feature:action1,action2 (e.g. ats.jobs:view,create,edit,delete).
 */

export interface FeaturePermissionFlags {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

/**
 * Parse user permission strings for a given prefix and return which actions are allowed.
 * Example: prefix "ats.jobs:" with userPermissions ["ats.jobs:view", "ats.jobs:create"]
 * returns { view: true, create: true, edit: false, delete: false }.
 */
export function getFeaturePermissions(
  userPermissions: string[],
  prefix: string
): FeaturePermissionFlags {
  const actions = new Set<string>();
  const normalizedPrefix = prefix.endsWith(":") ? prefix : `${prefix}:`;

  for (const p of userPermissions) {
    if (!p.startsWith(normalizedPrefix)) continue;
    const afterColon = p.slice(normalizedPrefix.length).trim();
    afterColon.split(",").forEach((a) => actions.add(a.trim().toLowerCase()));
  }

  return {
    view: actions.has("view"),
    create: actions.has("create"),
    edit: actions.has("edit"),
    delete: actions.has("delete"),
  };
}
