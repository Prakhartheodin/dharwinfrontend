/**
 * Collapse whitespace, case, punctuation so "cyber security" === "cybersecurity".
 * @param value Raw label or query
 */
export function normalizeSearchKey(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
}

/**
 * True when `haystack` contains `query` after normalization (substring match).
 */
export function normalizedSearchIncludes(haystack: string, query: string): boolean {
  const q = normalizeSearchKey(query)
  if (!q) return true
  return normalizeSearchKey(haystack).includes(q)
}

export interface NamedSearchItem {
  name: string
}

/**
 * When several items collapse to the same normalized name, keep one:
 * exact name match to the query, else shorter name, else first.
 * @param items Candidate rows already filtered to the query
 * @param query User search string
 * @param getName Extract display name
 */
export function dedupeSearchResultsByNormalizedName<T>(
  items: T[],
  query: string,
  getName: (item: T) => string
): T[] {
  const qNorm = normalizeSearchKey(query)
  const qTrim = query.trim().toLowerCase()
  const byKey = new Map<string, T>()

  for (const item of items) {
    const name = getName(item) ?? ""
    const key = normalizeSearchKey(name)
    if (!key) {
      byKey.set(`__empty_${byKey.size}`, item)
      continue
    }
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, item)
      continue
    }
    byKey.set(key, preferSearchDuplicate(existing, item, getName, qNorm, qTrim))
  }

  return [...byKey.values()]
}

/**
 * Choose which of two same-key rows to keep.
 */
function preferSearchDuplicate<T>(
  a: T,
  b: T,
  getName: (item: T) => string,
  qNorm: string,
  qTrim: string
): T {
  const nameA = getName(a) ?? ""
  const nameB = getName(b) ?? ""
  const exactA = nameA.trim().toLowerCase() === qTrim
  const exactB = nameB.trim().toLowerCase() === qTrim
  if (exactA && !exactB) return a
  if (exactB && !exactA) return b
  const keyA = normalizeSearchKey(nameA)
  const keyB = normalizeSearchKey(nameB)
  if (qNorm && keyA === qNorm && keyB !== qNorm) return a
  if (qNorm && keyB === qNorm && keyA !== qNorm) return b
  if (nameA.length !== nameB.length) return nameA.length < nameB.length ? a : b
  return a
}
