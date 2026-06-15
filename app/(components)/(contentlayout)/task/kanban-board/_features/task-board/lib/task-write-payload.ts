import type { DrawerMode } from "../types";

/**
 * Decide the `assignedTo` portion of a task create/update payload.
 *
 * Edit must ALWAYS send `assignedTo` — including an empty array — so a user who
 * removes every assignee actually unassigns the task. The update API uses PATCH
 * semantics (`Object.assign` on the server), so an omitted field leaves the
 * previous assignees untouched. Omitting `[]` is exactly why "unassigned" was
 * impossible from the task board drawer.
 *
 * Create may omit it when empty — there are no prior assignees to clear.
 */
export function assignedToWritePayload(
  mode: DrawerMode,
  assignedIds: string[],
): { assignedTo?: string[] } {
  if (mode === "edit") return { assignedTo: assignedIds };
  return assignedIds.length ? { assignedTo: assignedIds } : {};
}
