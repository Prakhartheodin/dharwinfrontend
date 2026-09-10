import type { TrainingModule as ApiTrainingModule } from '@/shared/lib/api/training-modules'
import type { ModuleLifecycleStatus } from '../_components/ModuleStatusBadge'

/**
 * Archived rows stay in Archive even after categories are saved, so a move from
 * Archive must publish before they appear in category folders on the All tab.
 *
 * @param currentStatus Module lifecycle before the folder assignment
 * @returns `published` when leaving archive, otherwise undefined (leave status)
 */
export function statusWhenLeavingArchive(
  currentStatus: string | undefined,
): ModuleLifecycleStatus | undefined {
  if (currentStatus === 'archived') return 'published'
  return undefined
}

/**
 * Maps API/list category refs onto `{ id, name }` for folder grouping.
 *
 * @param module Module returned by PATCH or already in the catalog
 * @param fallback Categories chosen in the modal (used when the API omits them)
 */
export function resolvedModuleCategories(
  module: Pick<ApiTrainingModule, 'categories'> | undefined,
  fallback: Array<{ id: string; name: string }>,
): Array<{ id: string; name: string }> {
  const fromApi = (module?.categories ?? [])
    .map((c) => {
      const id = String((c as { id?: string; _id?: string }).id ?? (c as { _id?: string })._id ?? '')
      const name = typeof c.name === 'string' && c.name.trim() ? c.name : id
      return id ? { id, name } : null
    })
    .filter((c): c is { id: string; name: string } => c != null)
  return fromApi.length > 0 ? fromApi : fallback
}
