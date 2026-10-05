import { describe, expect, it } from 'vitest'
import {
  JOBS_LIST_COL_HIRE_FORECAST_MIN,
  JOBS_LIST_COL_ORIGIN_MIN,
  JOBS_LIST_COL_SALARY_MIN,
  JOBS_LIST_COL_VACANCIES_MIN,
  JOBS_LIST_MOBILE_VIEWPORT_MAX_WIDTH,
  JOBS_LIST_TABLE_MIN_WIDTH,
  getJobsListLayout,
  isJobsTableColumnVisible,
  resolveJobsListLayout,
} from './jobsTableResponsive'

describe('jobsTableResponsive', () => {
  it('switches to cards below table min width', () => {
    expect(getJobsListLayout(JOBS_LIST_TABLE_MIN_WIDTH - 1)).toBe('cards')
    expect(getJobsListLayout(JOBS_LIST_TABLE_MIN_WIDTH)).toBe('table')
  })

  it('forces cards on narrow viewports regardless of container width', () => {
    expect(resolveJobsListLayout(1200, JOBS_LIST_MOBILE_VIEWPORT_MAX_WIDTH)).toBe('cards')
    expect(resolveJobsListLayout(1200, JOBS_LIST_MOBILE_VIEWPORT_MAX_WIDTH + 1)).toBe('table')
    expect(resolveJobsListLayout(500, JOBS_LIST_MOBILE_VIEWPORT_MAX_WIDTH + 1)).toBe('cards')
  })

  it('keeps primary columns visible in the narrowest table layout', () => {
    const w = JOBS_LIST_TABLE_MIN_WIDTH + 10
    expect(isJobsTableColumnVisible('jobTitle', w)).toBe(true)
    expect(isJobsTableColumnVisible('company', w)).toBe(true)
    expect(isJobsTableColumnVisible('status', w)).toBe(true)
    expect(isJobsTableColumnVisible('id', w)).toBe(true)
    expect(isJobsTableColumnVisible('vacancies', w)).toBe(false)
    expect(isJobsTableColumnVisible('salary', w)).toBe(false)
    expect(isJobsTableColumnVisible('hireForecast', w)).toBe(false)
    expect(isJobsTableColumnVisible('jobOrigin', w)).toBe(false)
  })

  it('reveals columns at container breakpoints in priority order', () => {
    expect(isJobsTableColumnVisible('vacancies', JOBS_LIST_COL_VACANCIES_MIN)).toBe(true)
    expect(isJobsTableColumnVisible('salary', JOBS_LIST_COL_SALARY_MIN)).toBe(true)
    expect(isJobsTableColumnVisible('hireForecast', JOBS_LIST_COL_HIRE_FORECAST_MIN)).toBe(true)
    expect(isJobsTableColumnVisible('jobOrigin', JOBS_LIST_COL_ORIGIN_MIN)).toBe(true)
  })

  it('staggers salary before time to hire to avoid overlap band', () => {
    const between = JOBS_LIST_COL_SALARY_MIN + 20
    expect(between).toBeLessThan(JOBS_LIST_COL_HIRE_FORECAST_MIN)
    expect(isJobsTableColumnVisible('salary', between)).toBe(true)
    expect(isJobsTableColumnVisible('hireForecast', between)).toBe(false)
  })

  it('never shows posting date column in the table', () => {
    expect(isJobsTableColumnVisible('postingDate', JOBS_LIST_COL_ORIGIN_MIN + 200)).toBe(false)
  })
})
