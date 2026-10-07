/**
 * Mirrors backend `deriveApiPermissions` in permission.service.js.
 * Auth context stores raw matrix strings; route guards and API use derived keys
 * (`resource.read` / `resource.manage` from the segment after the first dot).
 */

const NAMESPACED_RESOURCE_KEYS = new Set(["candidate.courses", "training.courses"]);

/** Keep in sync with backend STANDALONE_API_PERMISSIONS in permission.service.js */
const STANDALONE_API_PERMISSIONS = new Set([
  "communication.directory:all",
  "communication.directory:referred",
]);

export function deriveApiPermissions(rawPermissions: Iterable<string>): Set<string> {
  const apiPermissions = new Set<string>();

  for (const raw of rawPermissions) {
    if (typeof raw !== "string" || !raw.trim()) continue;

    if (raw === "devTickets.view") {
      apiPermissions.add("help-and-support.read");
      continue;
    }

    if (STANDALONE_API_PERMISSIONS.has(raw)) {
      apiPermissions.add(raw);
      continue;
    }

    const colon = raw.indexOf(":");
    if (colon < 0) continue;

    const key = raw.slice(0, colon).trim();
    const actionsPart = raw.slice(colon + 1);
    if (!key || !actionsPart) continue;

    const dotIndex = key.indexOf(".");
    const resource = dotIndex >= 0 ? key.slice(dotIndex + 1).trim() : key.trim();
    if (!resource) continue;

    const actions = actionsPart
      .split(",")
      .map((a) => a.trim().toLowerCase())
      .filter(Boolean);
    const hasView = actions.includes("view");
    const hasCreate = actions.includes("create");
    const hasEdit = actions.includes("edit");
    const hasDelete = actions.includes("delete");
    const hasManage = hasCreate || hasEdit || hasDelete;

    if (hasView) apiPermissions.add(`${resource}.read`);
    if (hasCreate) apiPermissions.add(`${resource}.create`);
    if (hasEdit) apiPermissions.add(`${resource}.edit`);
    if (hasDelete) apiPermissions.add(`${resource}.delete`);
    if (hasManage) apiPermissions.add(`${resource}.manage`);

    if (dotIndex >= 0 && NAMESPACED_RESOURCE_KEYS.has(key)) {
      const moduleId = key.slice(0, dotIndex).trim();
      const namespaced = `${moduleId}-${resource}`;
      if (hasView) apiPermissions.add(`${namespaced}.read`);
      if (hasCreate) apiPermissions.add(`${namespaced}.create`);
      if (hasEdit) apiPermissions.add(`${namespaced}.edit`);
      if (hasDelete) apiPermissions.add(`${namespaced}.delete`);
      if (hasManage) apiPermissions.add(`${namespaced}.manage`);
    }
  }

  return apiPermissions;
}

/** Raw matrix strings plus derived API keys (for parity with backend requirePermissions). */
export function expandPermissionsWithDerivedApi(rawPermissions: string[]): Set<string> {
  const expanded = new Set(rawPermissions);
  for (const api of deriveApiPermissions(rawPermissions)) {
    expanded.add(api);
  }
  return expanded;
}
