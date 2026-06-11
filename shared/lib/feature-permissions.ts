/**
 * Feature-level permissions (view, create, edit, delete).
 * API format: module.feature:action1,action2 (e.g. ats.jobs:view,create,edit,delete).
 */

import {
  ORGANIZATION_FEATURE_PREFIX_ALIASES,
  ORGANIZATION_FEATURE_WRITE_INHERIT,
} from "./organization-permission-aliases";

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
function collectActionsForPrefix(userPermissions: string[], prefix: string): Set<string> {
  const actions = new Set<string>();
  const normalizedPrefix = prefix.endsWith(":") ? prefix : `${prefix}:`;

  for (const p of userPermissions) {
    if (!p.startsWith(normalizedPrefix)) continue;
    const afterColon = p.slice(normalizedPrefix.length).trim();
    afterColon.split(",").forEach((a) => actions.add(a.trim().toLowerCase()));
  }

  return actions;
}

function flagsFromActions(actions: Set<string>): FeaturePermissionFlags {
  return {
    view: actions.has("view"),
    create: actions.has("create"),
    edit: actions.has("edit"),
    delete: actions.has("delete"),
  };
}

export function getFeaturePermissions(
  userPermissions: string[],
  prefix: string
): FeaturePermissionFlags {
  const basePrefix = prefix.endsWith(":") ? prefix.slice(0, -1) : prefix;
  const primary = flagsFromActions(collectActionsForPrefix(userPermissions, basePrefix));

  const aliasPrefixes = ORGANIZATION_FEATURE_PREFIX_ALIASES[basePrefix] ?? [];
  let view = primary.view || primary.create || primary.edit || primary.delete;
  for (const alias of aliasPrefixes) {
    const aliasFlags = flagsFromActions(collectActionsForPrefix(userPermissions, alias));
    if (aliasFlags.view || aliasFlags.create || aliasFlags.edit || aliasFlags.delete) {
      view = true;
    }
  }

  let create = primary.create;
  let edit = primary.edit;
  let canDelete = primary.delete;
  for (const alias of ORGANIZATION_FEATURE_WRITE_INHERIT[basePrefix] ?? []) {
    const aliasFlags = flagsFromActions(collectActionsForPrefix(userPermissions, alias));
    create = create || aliasFlags.create;
    edit = edit || aliasFlags.edit;
    canDelete = canDelete || aliasFlags.delete;
  }

  return {
    view,
    create,
    edit,
    delete: canDelete,
  };
}
