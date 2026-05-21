import type { TaskUser } from "@/shared/lib/api/tasks";
import type { UserRow } from "../providers/TaskDataProvider";

/**
 * Derive 1-2 character initials from a display name (preferred) or email.
 *
 * Centralized so TaskCard and any other consumer in this feature compute
 * initials identically instead of inlining the logic. Returns "?" only as a
 * genuine last resort — when both name and email are empty.
 */
export function getInitials(
  name?: string | null,
  email?: string | null
): string {
  const base = (name ?? "").trim() || (email ?? "").trim();
  if (!base) return "?";
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`;
  }
  return base.slice(0, 2);
}

/**
 * Resolve a task's `assignedTo` list into display initials.
 *
 * `assignedTo` entries may arrive either as populated user objects or as bare
 * ID strings (unpopulated refs). Bare strings are looked up against the board's
 * users list so a real name/initials render instead of a literal "?".
 *
 * @param assignedTo  Raw `assignedTo` from a Task (objects and/or ID strings).
 * @param users       Board users (from TaskDataProvider) for ID resolution.
 */
export function resolveAssigneeInitials(
  assignedTo: ReadonlyArray<TaskUser | string> | undefined,
  users: ReadonlyArray<UserRow> | undefined
): string[] {
  if (!assignedTo || assignedTo.length === 0) return [];

  const usersById = new Map<string, UserRow>();
  for (const u of users ?? []) {
    if (u.id) usersById.set(u.id, u);
  }

  return assignedTo
    .map((entry) => {
      if (!entry) return "";

      // Bare ID string → resolve against the board users list.
      if (typeof entry === "string") {
        const resolved = usersById.get(entry);
        if (resolved) return getInitials(resolved.name, resolved.email);
        // User truly not found and no name/email available → last resort.
        return "?";
      }

      // Populated user object — may still carry an unpopulated id with no
      // name/email, in which case fall back to the users list.
      const id = entry.id ?? entry._id ?? "";
      const hasIdentity = !!(entry.name ?? "").trim() || !!(entry.email ?? "").trim();
      if (!hasIdentity && id) {
        const resolved = usersById.get(id);
        if (resolved) return getInitials(resolved.name, resolved.email);
      }
      return getInitials(entry.name, entry.email);
    })
    .filter(Boolean);
}
