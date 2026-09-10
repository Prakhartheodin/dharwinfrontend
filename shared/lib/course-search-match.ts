/**
 * Course search matching for the catalog typeahead.
 *
 * Mirrors uat.dharwin.backend/src/utils/courseSearch.util.js so the suggestion
 * dropdown and the result grid agree on what "matches". Two rules, both
 * case-insensitive:
 *   1. substring — "learn" matches "Machine Learning"
 *   2. initials  — "ML" matches "Machine Learning" (consecutive word initials)
 *
 * Change one side, change the other.
 */

/** Longest all-letter query still treated as a possible abbreviation. */
const MAX_INITIALS_LEN = 5

/** Escape a user string for safe use inside a RegExp. */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Regex matching titles whose consecutive word initials spell `letters`,
 * or null when the query is not abbreviation-shaped.
 */
function initialsRegex(letters: string): RegExp | null {
  if (!/^[a-z]{2,}$/i.test(letters) || letters.length > MAX_INITIALS_LEN) return null
  return new RegExp(`\\b${letters.split("").join("[\\w']*[\\W_]+")}`, "i")
}

/** Regexes to test a course title against for one search query. */
export function buildCourseSearchRegexes(search: string): RegExp[] {
  const q = (search ?? "").trim()
  if (!q) return []
  const regexes = [new RegExp(escapeRegex(q), "i")]
  const initials = initialsRegex(q)
  if (initials) regexes.push(initials)
  return regexes
}

/** True when `text` satisfies either search rule. */
export function matchesCourseQuery(text: string, search: string): boolean {
  if (!text) return false
  return buildCourseSearchRegexes(search).some((rx) => rx.test(text))
}

/**
 * Course titles to offer as typeahead suggestions, best-first: titles starting
 * with the query lead, then everything else that matches either rule.
 *
 * ponytail: plain array scan. `titles` is one student's assigned courses (tens),
 * already in memory from the list response — no index or worker needed. Revisit
 * only if that list ever reaches thousands.
 */
export function suggestCourseTitles(titles: string[], search: string, limit = 8): string[] {
  const q = (search ?? "").trim()
  if (!q) return []
  const lowered = q.toLowerCase()
  const matched = titles.filter((title) => matchesCourseQuery(title, q))
  // Nothing to offer once the box already holds the one title that matches.
  if (matched.length === 1 && matched[0].toLowerCase() === lowered) return []
  const prefixed = matched.filter((title) => title.toLowerCase().startsWith(lowered))
  const rest = matched.filter((title) => !title.toLowerCase().startsWith(lowered))
  return [...prefixed, ...rest].slice(0, limit)
}
