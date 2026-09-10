import type { TrainingModule as ApiTrainingModule } from '@/shared/lib/api/training-modules'
import { matchesCourseQuery } from '@/shared/lib/course-search-match'

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
 * Uses the shared catalog matcher so "ML" finds "Machine Learning" here too, the same
 * way it does on My Courses and Curriculum.
 *
 * @param modules - Last unfiltered catalog page(s)
 * @param query - Live search string (not debounced)
 */
export function filterModulesByLocalSearch(
  modules: ApiTrainingModule[],
  query: string
): ApiTrainingModule[] {
  const q = query.trim()
  if (!q) return modules
  return modules.filter((m) => matchesCourseQuery(moduleSearchHaystack(m), q))
}
