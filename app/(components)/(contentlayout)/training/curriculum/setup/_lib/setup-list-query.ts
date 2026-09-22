/**
 * Curriculum Setup list URL contract (matches GET /positions/roster):
 *   page, limit, search, folderIds (comma-separated), sortBy=field:dir,_id:asc
 * Neutral sort omits sortBy. `tab` is preserved for the one-shot folders drawer.
 */

export const SETUP_PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const
export const DEFAULT_SETUP_PAGE_SIZE = 50

export const SETUP_SORT_FIELDS = ["name", "employees"] as const
export type SetupSortField = (typeof SETUP_SORT_FIELDS)[number]
export type SetupSortDir = "asc" | "desc"

/** UI sort key without secondary `_id` (URL/API add `_id:asc`). */
export type SetupSortBy = `${SetupSortField}:${SetupSortDir}` | null

export type SetupListState = {
  page: number
  limit: number
  search: string
  folderIds: string[]
  sortBy: SetupSortBy
}

const OBJECT_ID_RE = /^[a-f\d]{24}$/i

export function parseSetupPage(raw: string | null | undefined): number {
  const n = Number.parseInt(String(raw ?? ""), 10)
  return Number.isInteger(n) && n >= 1 ? n : 1
}

export function parseSetupPageSize(raw: string | null | undefined): number {
  const n = Number.parseInt(String(raw ?? ""), 10)
  return (SETUP_PAGE_SIZE_OPTIONS as readonly number[]).includes(n) ? n : DEFAULT_SETUP_PAGE_SIZE
}

export function parseSetupFolderIds(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const part of raw.split(",")) {
    const id = part.trim()
    if (!OBJECT_ID_RE.test(id) || seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out
}

/**
 * Accepts `name:asc`, `name:asc,_id:asc`, or `employees:desc,_id:asc`.
 * Unknown fields → null (neutral / omit from URL).
 */
export function parseSetupSortBy(raw: string | null | undefined): SetupSortBy {
  const value = String(raw ?? "").trim()
  if (!value) return null
  for (const part of value.split(",")) {
    const [fieldRaw, dirRaw] = part.split(":")
    const field = String(fieldRaw ?? "").trim()
    if (!(SETUP_SORT_FIELDS as readonly string[]).includes(field)) continue
    if (field === "_id") continue
    const dir = String(dirRaw ?? "asc").trim().toLowerCase() === "desc" ? "desc" : "asc"
    return `${field as SetupSortField}:${dir}`
  }
  return null
}

export function parseSetupListState(
  searchParams: Pick<URLSearchParams, "get">
): SetupListState {
  return {
    page: parseSetupPage(searchParams.get("page")),
    limit: parseSetupPageSize(searchParams.get("limit")),
    search: searchParams.get("search") ?? "",
    folderIds: parseSetupFolderIds(searchParams.get("folderIds")),
    sortBy: parseSetupSortBy(searchParams.get("sortBy")),
  }
}

/** API/URL sortBy including stable secondary `_id:asc`. */
export function toSetupApiSortBy(sortBy: SetupSortBy): string | undefined {
  if (!sortBy) return undefined
  return `${sortBy},_id:asc`
}

export function buildSetupListQueryString(state: SetupListState): string {
  const params = new URLSearchParams()
  if (state.page > 1) params.set("page", String(state.page))
  if (state.limit !== DEFAULT_SETUP_PAGE_SIZE) params.set("limit", String(state.limit))
  if (state.search.trim()) params.set("search", state.search.trim())
  if (state.folderIds.length) params.set("folderIds", state.folderIds.join(","))
  const apiSort = toSetupApiSortBy(state.sortBy)
  if (apiSort) params.set("sortBy", apiSort)
  const qs = params.toString()
  return qs ? `?${qs}` : ""
}

/**
 * Preserve non-list deep-link params (today: `tab=categories` for the folders drawer).
 */
export function buildSetupListHref(
  pathname: string,
  state: SetupListState,
  current?: Pick<URLSearchParams, "get" | "forEach">
): string {
  const listQs = buildSetupListQueryString(state)
  const params = new URLSearchParams(listQs.startsWith("?") ? listQs.slice(1) : listQs)
  const tab = current?.get?.("tab")
  if (tab === "categories") params.set("tab", "categories")
  const qs = params.toString()
  return qs ? `${pathname}?${qs}` : pathname
}

export function normalizeSetupListQueryString(raw: string): string {
  if (!raw) return ""
  const params = new URLSearchParams(raw.startsWith("?") ? raw.slice(1) : raw)
  const keys = [...new Set([...params.keys()])].sort()
  return keys.map((key) => `${key}=${params.get(key) ?? ""}`).join("&")
}

export function areSetupListQueryStringsEquivalent(a: string, b: string): boolean {
  return normalizeSetupListQueryString(a) === normalizeSetupListQueryString(b)
}

/** Filter/search/sort change → page resets to 1. */
export function setupStateAfterFilterChange(
  prev: SetupListState,
  patch: Partial<Omit<SetupListState, "page">>
): SetupListState {
  return { ...prev, ...patch, page: 1 }
}

/** Cycle null → asc → desc → null for a column. */
export function cycleSetupSort(prev: SetupSortBy, field: SetupSortField): SetupSortBy {
  if (prev === `${field}:asc`) return `${field}:desc`
  if (prev === `${field}:desc`) return null
  return `${field}:asc`
}
