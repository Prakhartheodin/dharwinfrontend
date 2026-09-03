import type { TrainingModule as ApiTrainingModule } from "@/shared/lib/api/training-modules"
import type { Category as ApiCategory } from "@/shared/lib/api/categories"

export const DRAFTS_FOLDER_ID = "__drafts__"
export const ARCHIVED_FOLDER_ID = "__archived__"
export const UNCATEGORIZED_FOLDER_ID = "__uncategorized__"

export type TrainingFolderKind = "drafts" | "archived" | "uncategorized" | "category"

export interface TrainingFolderRow {
  id: string
  name: string
  modules: ApiTrainingModule[]
  kind: TrainingFolderKind
  isUncategorized?: boolean
}

type SortValue = { value?: string } | null | undefined

export type TrainingModulesListStatus = "all" | "draft" | "published" | "archived"

export interface GroupTrainingModulesIntoFoldersOptions {
  /** Lifecycle tab. Default `all`. */
  statusFilter?: TrainingModulesListStatus
  /**
   * Include an empty Drafts folder when not searching.
   * Default true when `options` is omitted (legacy). Page list passes false.
   */
  includeEmptyDrafts?: boolean
  /**
   * Show Archived on the All tab when it has items. Default true for legacy callers.
   * The modules list passes false so All is live curriculum only.
   */
  includeArchivedOnAll?: boolean
  /**
   * Show empty category folders when not searching. Default true for legacy callers.
   */
  includeEmptyCategories?: boolean
}

export interface TrainingModuleLifecycleCounts {
  all: number
  draft: number
  published: number
  archived: number
}

/**
 * Counts for the list status tabs from the currently loaded modules array.
 */
export function countModulesByLifecycle(
  modules: ApiTrainingModule[]
): TrainingModuleLifecycleCounts {
  const counts: TrainingModuleLifecycleCounts = {
    all: modules.length,
    draft: 0,
    published: 0,
    archived: 0,
  }
  for (const m of modules) {
    const status = lifecycleStatus(m.status)
    counts[status] += 1
  }
  // All tab lists drafts + published only (archived is its own tab).
  counts.all = counts.draft + counts.published
  return counts
}

/**
 * @param status Raw module.status
 */
function lifecycleStatus(status: string | undefined): "draft" | "published" | "archived" {
  if (status === "draft" || status === "archived") return status
  return "published"
}

/**
 * Sort modules using the admin list sort control.
 */
function sortModules(
  a: ApiTrainingModule,
  b: ApiTrainingModule,
  sortValue: SortValue
): number {
  switch (sortValue?.value) {
    case "moduleName:desc":
      return b.moduleName.localeCompare(a.moduleName)
    case "moduleName:asc":
      return a.moduleName.localeCompare(b.moduleName)
    case "createdAt:desc":
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    case "createdAt:asc":
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    default:
      return 0
  }
}

/**
 * Drafts/Archived are first-class folders (not mixed into category rows).
 * Published modules stay grouped by category / Uncategorized.
 *
 * @param search Live search string or boolean; empty folders are hidden while searching
 * @param options Optional list-tab filters; omitted keeps legacy empty-Drafts + archived-on-All
 */
export function groupTrainingModulesIntoFolders(
  modules: ApiTrainingModule[],
  categories: ApiCategory[],
  sortValue: SortValue,
  search: string | boolean,
  options?: GroupTrainingModulesIntoFoldersOptions
): TrainingFolderRow[] {
  const isSearching = typeof search === "boolean" ? search : search.trim().length > 0
  const statusFilter = options?.statusFilter ?? "all"
  const includeEmptyDrafts = options?.includeEmptyDrafts ?? options == null
  const includeArchivedOnAll = options?.includeArchivedOnAll ?? options == null
  const includeEmptyCategories = options?.includeEmptyCategories ?? options == null
  const sorter = (a: ApiTrainingModule, b: ApiTrainingModule) => sortModules(a, b, sortValue)

  const drafts: ApiTrainingModule[] = []
  const archived: ApiTrainingModule[] = []
  const published: ApiTrainingModule[] = []
  for (const m of modules) {
    const status = lifecycleStatus(m.status)
    if (status === "draft") drafts.push(m)
    else if (status === "archived") archived.push(m)
    else published.push(m)
  }
  drafts.sort(sorter)
  archived.sort(sorter)

  const byCategoryId = new Map<string, ApiTrainingModule[]>()
  const uncategorized: ApiTrainingModule[] = []
  for (const m of published) {
    const cats = m.categories ?? []
    if (cats.length === 0) {
      uncategorized.push(m)
      continue
    }
    for (const c of cats) {
      let bucket = byCategoryId.get(c.id)
      if (!bucket) {
        bucket = []
        byCategoryId.set(c.id, bucket)
      }
      bucket.push(m)
    }
  }

  const showDraftsFolder =
    statusFilter === "draft" || statusFilter === "all"
  const showArchivedFolder =
    statusFilter === "archived" ||
    (statusFilter === "all" && includeArchivedOnAll)
  const showPublishedFolders =
    statusFilter === "published" || statusFilter === "all"

  const rows: TrainingFolderRow[] = []
  if (showDraftsFolder) {
    const includeDrafts =
      drafts.length > 0 || (includeEmptyDrafts && !isSearching && statusFilter === "all")
    if (includeDrafts) {
      rows.push({ id: DRAFTS_FOLDER_ID, name: "Drafts", modules: drafts, kind: "drafts" })
    }
  }
  if (showArchivedFolder && archived.length > 0) {
    rows.push({
      id: ARCHIVED_FOLDER_ID,
      name: "Archived",
      modules: archived,
      kind: "archived",
    })
  }

  if (showPublishedFolders) {
    const sortedCats = [...categories].sort((a, b) => a.name.localeCompare(b.name))
    for (const cat of sortedCats) {
      const folderModules = (byCategoryId.get(cat.id) ?? []).sort(sorter)
      const hideEmpty =
        isSearching || !includeEmptyCategories || statusFilter === "published"
      if (hideEmpty && folderModules.length === 0) continue
      rows.push({ id: cat.id, name: cat.name, kind: "category", modules: folderModules })
    }

    uncategorized.sort(sorter)
    if (uncategorized.length > 0) {
      rows.push({
        id: UNCATEGORIZED_FOLDER_ID,
        name: "Uncategorized",
        modules: uncategorized,
        kind: "uncategorized",
        isUncategorized: true,
      })
    }
  }

  return rows
}

/** Alias used by the modules list virtualizer. */
export const groupModulesIntoFolders = groupTrainingModulesIntoFolders
