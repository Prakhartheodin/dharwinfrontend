/**
 * Caps catalog walks so a huge tenant cannot pin the tab with 100k rows.
 * 10k modules × ~1KB list docs is still a large payload but bounded.
 */
export const MAX_CATALOG_RESULTS = 10_000

/** Parallel remaining-page fetches; high enough to collapse waterfalls, low enough to avoid stampedes. */
export const PAGE_FETCH_CONCURRENCY = 4

/** Admin modules list page size. Joi `max(2000)` on this query — do not raise without checking validation. */
export const ADMIN_MODULES_PAGE_LIMIT = 1000

export interface PagedListSlice<T> {
  results?: T[]
  page?: number
  totalPages?: number
  totalResults?: number
}

/**
 * After page 1, fetch remaining pages in bounded `Promise.all` batches.
 * Callers must still check a request-id / abort flag between batches.
 *
 * @param firstPage - Response of page 1 (already awaited)
 * @param fetchPage - Loader for page N (1-based)
 * @param isStale - Return true to drop in-flight work (stale search/sort)
 * @param concurrency - Max in-flight pages per batch
 * @param maxTotal - Hard cap on collected rows
 */
export async function collectRemainingPages<T>(
  firstPage: PagedListSlice<T>,
  fetchPage: (page: number) => Promise<PagedListSlice<T>>,
  isStale: () => boolean,
  concurrency: number = PAGE_FETCH_CONCURRENCY,
  maxTotal: number = MAX_CATALOG_RESULTS
): Promise<T[]> {
  const collected: T[] = [...(firstPage.results ?? [])]
  const limitHint = Math.max(collected.length, 1)
  const totalResults = firstPage.totalResults ?? collected.length
  const rawTotalPages = firstPage.totalPages ?? 1
  const startPage = (firstPage.page ?? 1) + 1
  const maxPagesByCap = Math.ceil(maxTotal / limitHint)
  const lastPage = Math.min(rawTotalPages, maxPagesByCap)

  if (startPage > lastPage || collected.length >= maxTotal) {
    return collected.slice(0, maxTotal)
  }

  const remaining: number[] = []
  for (let p = startPage; p <= lastPage; p += 1) remaining.push(p)

  for (let i = 0; i < remaining.length; i += concurrency) {
    if (isStale()) return collected.slice(0, maxTotal)
    const batch = remaining.slice(i, i + concurrency)
    const slices = await Promise.all(batch.map((page) => fetchPage(page)))
    if (isStale()) return collected.slice(0, maxTotal)
    for (const slice of slices) {
      collected.push(...(slice.results ?? []))
      if (collected.length >= maxTotal) return collected.slice(0, maxTotal)
    }
  }

  if (totalResults > maxTotal) {
    console.warn(
      `Catalog truncated at ${maxTotal} of ${totalResults} rows to protect memory.`
    )
  }

  return collected
}
