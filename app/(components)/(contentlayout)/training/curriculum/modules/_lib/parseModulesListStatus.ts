import type { TrainingModulesListStatus } from '@/shared/lib/training/group-modules-into-folders'

const STATUS_VALUES: TrainingModulesListStatus[] = ['all', 'draft', 'published', 'archived']

/**
 * Reads `?status=` from the modules list URL. Unknown values fall back to all.
 */
export function parseModulesListStatus(raw: string | null): TrainingModulesListStatus {
  if (raw && (STATUS_VALUES as string[]).includes(raw)) {
    return raw as TrainingModulesListStatus
  }
  return 'all'
}

/**
 * Builds the query string for the list status tab, preserving other params.
 */
export function modulesListStatusSearchString(
  current: URLSearchParams,
  next: TrainingModulesListStatus
): string {
  const params = new URLSearchParams(current.toString())
  if (next === 'all') params.delete('status')
  else params.set('status', next)
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}
