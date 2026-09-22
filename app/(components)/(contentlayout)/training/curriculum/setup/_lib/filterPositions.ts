import { normalizedSearchIncludes } from "@/shared/lib/training/normalize-search-term"
import type { PositionRosterItem } from "@/shared/lib/api/positions"

/**
 * Filters the position roster by text query and optional folder (category) ids.
 *
 * Folder semantics: empty `folderIds` = no folder filter (show all).
 * Multiple selected folders = OR — a position matches if any of its
 * assigned modules belongs to any selected folder.
 * Text query and folder chips compose as AND (both must pass).
 */
export function filterPositions(
  rows: PositionRosterItem[],
  query: string,
  folderIds: string[],
  foldersByModuleId: Map<string, string[]>
): PositionRosterItem[] {
  const q = query.trim()
  const folders = new Set(folderIds)

  return rows.filter((row) => {
    if (folders.size > 0) {
      const inFolder = (row.assignedModules ?? []).some((m) =>
        (foldersByModuleId.get(m.id) ?? []).some((f) => folders.has(f))
      )
      if (!inFolder) return false
    }
    if (!q) return true
    return (
      normalizedSearchIncludes(row.name, q) ||
      normalizedSearchIncludes(row.department ?? "", q) ||
      (row.assignedModules ?? []).some((m) => normalizedSearchIncludes(m.name, q)) ||
      (row.assignedEmployees ?? []).some((e) => normalizedSearchIncludes(e.name, q))
    )
  })
}
