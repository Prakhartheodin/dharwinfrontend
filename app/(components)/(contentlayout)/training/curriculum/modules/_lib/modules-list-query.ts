import type { TrainingModulesListStatus } from '@/shared/lib/training/group-modules-into-folders'
import { parseModulesListStatus } from './parseModulesListStatus'

/**
 * Modules list URL contract (matches GET /training/modules):
 *   page, limit, search, status, sortBy=field:dir,_id:asc
 * Collapsed folder state is never in the URL.
 */

export const MODULES_PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const
export const DEFAULT_MODULES_PAGE_SIZE = 50

export const MODULES_SORT_OPTIONS = [
  { value: 'moduleName:asc', label: 'Name (A - Z)' },
  { value: 'moduleName:desc', label: 'Name (Z - A)' },
  { value: 'createdAt:desc', label: 'Newest' },
  { value: 'createdAt:asc', label: 'Oldest' },
] as const

export type ModulesSortValue = (typeof MODULES_SORT_OPTIONS)[number]['value']

export const DEFAULT_MODULES_SORT: ModulesSortValue = 'moduleName:asc'

export type ModulesListState = {
  page: number
  limit: number
  search: string
  status: TrainingModulesListStatus
  sortBy: ModulesSortValue
}

const ALLOWED_SORT = new Set<string>(MODULES_SORT_OPTIONS.map((o) => o.value))

export function parseModulesPage(raw: string | null | undefined): number {
  const n = Number.parseInt(String(raw ?? ''), 10)
  return Number.isInteger(n) && n >= 1 ? n : 1
}

export function parseModulesPageSize(raw: string | null | undefined): number {
  const n = Number.parseInt(String(raw ?? ''), 10)
  return (MODULES_PAGE_SIZE_OPTIONS as readonly number[]).includes(n)
    ? n
    : DEFAULT_MODULES_PAGE_SIZE
}

/**
 * Primary sort only; strips trailing `_id:*` from the URL/API form.
 */
export function parseModulesSortBy(raw: string | null | undefined): ModulesSortValue {
  const value = String(raw ?? '').trim()
  if (!value) return DEFAULT_MODULES_SORT
  const primary = value.split(',')[0]?.trim() ?? ''
  return ALLOWED_SORT.has(primary) ? (primary as ModulesSortValue) : DEFAULT_MODULES_SORT
}

export function toModulesApiSortBy(sortBy: ModulesSortValue): string {
  return `${sortBy},_id:asc`
}

export function parseModulesListState(
  searchParams: Pick<URLSearchParams, 'get'>
): ModulesListState {
  return {
    page: parseModulesPage(searchParams.get('page')),
    limit: parseModulesPageSize(searchParams.get('limit')),
    search: searchParams.get('search') ?? '',
    status: parseModulesListStatus(searchParams.get('status')),
    sortBy: parseModulesSortBy(searchParams.get('sortBy')),
  }
}

export function buildModulesListQueryString(state: ModulesListState): string {
  const params = new URLSearchParams()
  if (state.page > 1) params.set('page', String(state.page))
  if (state.limit !== DEFAULT_MODULES_PAGE_SIZE) params.set('limit', String(state.limit))
  if (state.search.trim()) params.set('search', state.search.trim())
  if (state.status !== 'all') params.set('status', state.status)
  if (state.sortBy !== DEFAULT_MODULES_SORT) params.set('sortBy', toModulesApiSortBy(state.sortBy))
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export function buildModulesListHref(pathname: string, state: ModulesListState): string {
  const qs = buildModulesListQueryString(state)
  return qs ? `${pathname}${qs}` : pathname
}

export function normalizeModulesListQueryString(raw: string): string {
  if (!raw) return ''
  const params = new URLSearchParams(raw.startsWith('?') ? raw.slice(1) : raw)
  const keys = [...new Set([...params.keys()])].sort()
  return keys.map((key) => `${key}=${params.get(key) ?? ''}`).join('&')
}

export function areModulesListQueryStringsEquivalent(a: string, b: string): boolean {
  return normalizeModulesListQueryString(a) === normalizeModulesListQueryString(b)
}

/** Filter / search / sort / status / limit change → page 1. */
export function modulesStateAfterFilterChange(
  prev: ModulesListState,
  patch: Partial<Omit<ModulesListState, 'page'>>
): ModulesListState {
  return { ...prev, ...patch, page: 1 }
}
