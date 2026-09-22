import { describe, expect, it } from 'vitest'
import {
  DEFAULT_MODULES_PAGE_SIZE,
  DEFAULT_MODULES_SORT,
  areModulesListQueryStringsEquivalent,
  buildModulesListQueryString,
  modulesStateAfterFilterChange,
  parseModulesListState,
  parseModulesPage,
  parseModulesPageSize,
  parseModulesSortBy,
  toModulesApiSortBy,
} from './modules-list-query'

describe('parseModulesPage', () => {
  it('defaults invalid values to 1', () => {
    expect(parseModulesPage(null)).toBe(1)
    expect(parseModulesPage('0')).toBe(1)
  })
})

describe('parseModulesPageSize', () => {
  it('defaults unsupported sizes', () => {
    expect(parseModulesPageSize('15')).toBe(DEFAULT_MODULES_PAGE_SIZE)
    expect(parseModulesPageSize('25')).toBe(25)
  })
})

describe('parseModulesSortBy', () => {
  it('defaults and strips secondary _id', () => {
    expect(parseModulesSortBy(null)).toBe(DEFAULT_MODULES_SORT)
    expect(parseModulesSortBy('moduleName:desc,_id:asc')).toBe('moduleName:desc')
    expect(parseModulesSortBy('bogus:asc')).toBe(DEFAULT_MODULES_SORT)
  })
})

describe('parseModulesListState', () => {
  it('reads list params', () => {
    const params = new URLSearchParams(
      'page=2&limit=25&search=ml&status=draft&sortBy=createdAt:desc,_id:asc'
    )
    expect(parseModulesListState(params)).toEqual({
      page: 2,
      limit: 25,
      search: 'ml',
      status: 'draft',
      sortBy: 'createdAt:desc',
    })
  })
})

describe('buildModulesListQueryString', () => {
  it('omits defaults', () => {
    expect(
      buildModulesListQueryString({
        page: 1,
        limit: DEFAULT_MODULES_PAGE_SIZE,
        search: '',
        status: 'all',
        sortBy: DEFAULT_MODULES_SORT,
      })
    ).toBe('')
  })

  it('serializes active state with sortBy including _id', () => {
    const qs = buildModulesListQueryString({
      page: 3,
      limit: 25,
      search: ' react ',
      status: 'archived',
      sortBy: 'createdAt:asc',
    })
    expect(Object.fromEntries(new URLSearchParams(qs.slice(1)).entries())).toEqual({
      page: '3',
      limit: '25',
      search: 'react',
      status: 'archived',
      sortBy: 'createdAt:asc,_id:asc',
    })
  })
})

describe('modulesStateAfterFilterChange', () => {
  it('resets page to 1', () => {
    expect(
      modulesStateAfterFilterChange(
        {
          page: 4,
          limit: 50,
          search: '',
          status: 'all',
          sortBy: DEFAULT_MODULES_SORT,
        },
        { status: 'draft' }
      ).page
    ).toBe(1)
  })
})

describe('toModulesApiSortBy / equivalence', () => {
  it('appends stable secondary sort', () => {
    expect(toModulesApiSortBy('moduleName:asc')).toBe('moduleName:asc,_id:asc')
  })

  it('treats param order as equivalent', () => {
    expect(
      areModulesListQueryStringsEquivalent('page=2&search=qa', 'search=qa&page=2')
    ).toBe(true)
  })
})
