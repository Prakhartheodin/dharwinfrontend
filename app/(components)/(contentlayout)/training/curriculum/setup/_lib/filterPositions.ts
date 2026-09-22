import { normalizedSearchIncludes } from "@/shared/lib/training/normalize-search-term"
import type { PositionRosterItem } from "@/shared/lib/api/positions"

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
