import { normalizedSearchIncludes } from "@/shared/lib/training/normalize-search-term"
import type { Category } from "@/shared/lib/api/categories"

/** How many unselected chips to show before "Show all" when the strip is collapsed. */
export const FOLDER_FILTER_COLLAPSED_UNSELECTED = 10

/**
 * Drop selected folder ids that no longer exist in the categories list.
 * Returns the same array reference when nothing changed.
 */
export function pruneSelectedFolderIds(
  selectedIds: string[],
  categories: Pick<Category, "id">[]
): string[] {
  if (selectedIds.length === 0) return selectedIds
  const valid = new Set(categories.map((c) => c.id))
  const next = selectedIds.filter((id) => valid.has(id))
  if (next.length === selectedIds.length) return selectedIds
  return next
}

/** Case/whitespace-tolerant folder name match for the chip-strip search. */
export function categoryMatchesFolderQuery(
  category: Pick<Category, "name">,
  query: string
): boolean {
  return normalizedSearchIncludes(category.name, query)
}

/**
 * Selected folders first (stable among themselves by selection order), then
 * remaining by name. Same labels with different ids stay as separate entries.
 */
export function orderCategoriesForFilter(
  categories: Category[],
  selectedIds: string[]
): Category[] {
  const selectedSet = new Set(selectedIds)
  const selectedOrder = new Map(selectedIds.map((id, i) => [id, i]))
  const selected: Category[] = []
  const rest: Category[] = []

  for (const cat of categories) {
    if (selectedSet.has(cat.id)) selected.push(cat)
    else rest.push(cat)
  }

  selected.sort(
    (a, b) => (selectedOrder.get(a.id) ?? 0) - (selectedOrder.get(b.id) ?? 0)
  )
  rest.sort((a, b) => {
    const byName = a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    if (byName !== 0) return byName
    return a.id.localeCompare(b.id)
  })

  return [...selected, ...rest]
}

export interface VisibleFolderChips {
  visible: Category[]
  hiddenCount: number
}

/**
 * Selected chips stay visible; unselected fill up to the collapsed cap unless expanded.
 * Does not change filter membership — only which chips render.
 */
export function pickVisibleFolderChips(
  ordered: Category[],
  selectedIds: string[],
  expanded: boolean,
  collapsedUnselectedLimit = FOLDER_FILTER_COLLAPSED_UNSELECTED
): VisibleFolderChips {
  if (expanded || ordered.length === 0) {
    return { visible: ordered, hiddenCount: 0 }
  }

  const selectedSet = new Set(selectedIds)
  const selected = ordered.filter((c) => selectedSet.has(c.id))
  const unselected = ordered.filter((c) => !selectedSet.has(c.id))
  const shownUnselected = unselected.slice(0, collapsedUnselectedLimit)
  const hiddenCount = Math.max(0, unselected.length - shownUnselected.length)

  return {
    visible: [...selected, ...shownUnselected],
    hiddenCount,
  }
}
