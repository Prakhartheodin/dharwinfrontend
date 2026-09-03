import type { TrainingModule as ApiTrainingModule } from '@/shared/lib/api/training-modules'

const haystackByModule = new WeakMap<ApiTrainingModule, string>()

/**
 * Lowercased name + blurb + mentor names, cached per object identity for keystroke filters.
 */
function moduleSearchHaystack(module: ApiTrainingModule): string {
  const cached = haystackByModule.get(module)
  if (cached !== undefined) return cached
  const mentorNames = (module.mentorsAssigned ?? [])
    .map((mentor) => mentor.user?.name ?? '')
    .join(' ')
  const haystack = `${module.moduleName ?? ''} ${module.shortDescription ?? ''} ${mentorNames}`.toLowerCase()
  haystackByModule.set(module, haystack)
  return haystack
}

/**
 * Instant list search over a catalog we already fetched (name, blurb, mentor names).
 * Skips another round-trip when the unfiltered load was complete.
 *
 * @param modules - Last unfiltered catalog page(s)
 * @param query - Live search string (not debounced)
 */
export function filterModulesByLocalSearch(
  modules: ApiTrainingModule[],
  query: string
): ApiTrainingModule[] {
  const q = query.trim().toLowerCase()
  if (!q) return modules
  return modules.filter((m) => moduleSearchHaystack(m).includes(q))
}
