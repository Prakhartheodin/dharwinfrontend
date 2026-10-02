/** Container-width breakpoints for the jobs list (inline-size of `.jobs-list-container`). */
export const JOBS_LIST_TABLE_MIN_WIDTH = 700

/** Progressive column reveal (container inline-size, px). Hide before squeeze, widest last. */
export const JOBS_LIST_COL_VACANCIES_MIN = 760
export const JOBS_LIST_COL_SALARY_MIN = 840
export const JOBS_LIST_COL_HIRE_FORECAST_MIN = 1000
export const JOBS_LIST_COL_ORIGIN_MIN = 1160

export type JobsListLayout = 'cards' | 'table'

export type JobsTableColumnId =
  | 'checkbox'
  | 'jobTitle'
  | 'company'
  | 'vacancies'
  | 'hireForecast'
  | 'postingDate'
  | 'salary'
  | 'status'
  | 'jobOrigin'
  | 'id'

/** Maps react-table column id ? CSS class toggled by container queries in globals.scss. */
export const JOBS_TABLE_COLUMN_CLASS: Record<JobsTableColumnId, string> = {
  checkbox: 'jobs-col-checkbox',
  jobTitle: 'jobs-col-jobTitle',
  company: 'jobs-col-company',
  vacancies: 'jobs-col-vacancies',
  hireForecast: 'jobs-col-hireForecast',
  postingDate: 'jobs-col-postingDate',
  salary: 'jobs-col-salary',
  status: 'jobs-col-status',
  jobOrigin: 'jobs-col-jobOrigin',
  id: 'jobs-col-actions',
}

/** Layout utilities applied identically on `col`, `th`, and `td`. */
export const JOBS_TABLE_CELL_LAYOUT: Partial<Record<JobsTableColumnId, string>> = {
  checkbox: 'jobs-cell-checkbox',
  jobTitle: 'min-w-0 overflow-hidden whitespace-normal',
  company: 'min-w-0 max-w-full truncate',
  postingDate: 'jobs-col-postingDate',
  hireForecast: 'min-w-0',
  salary: 'min-w-0',
  vacancies: 'whitespace-nowrap',
  status: 'whitespace-nowrap',
  jobOrigin: 'whitespace-nowrap',
  id: 'jobs-cell-actions whitespace-nowrap',
}

/** Single class string for col / th / td (tier + layout). */
export function jobsTableColumnClasses(
  columnId: string,
  extra?: string
): string {
  const tier = JOBS_TABLE_COLUMN_CLASS[columnId as JobsTableColumnId] ?? ''
  const layout = JOBS_TABLE_CELL_LAYOUT[columnId as JobsTableColumnId] ?? ''
  return [tier, layout, extra ?? ''].filter(Boolean).join(' ')
}

export function getJobsListLayout(containerWidth: number): JobsListLayout {
  return containerWidth >= JOBS_LIST_TABLE_MIN_WIDTH ? 'table' : 'cards'
}

/** Mirrors container-query column rules for unit tests. */
export function isJobsTableColumnVisible(columnId: JobsTableColumnId, containerWidth: number): boolean {
  if (getJobsListLayout(containerWidth) === 'cards') return false
  if (columnId === 'postingDate') return false
  if (columnId === 'vacancies') return containerWidth >= JOBS_LIST_COL_VACANCIES_MIN
  if (columnId === 'salary') return containerWidth >= JOBS_LIST_COL_SALARY_MIN
  if (columnId === 'hireForecast') return containerWidth >= JOBS_LIST_COL_HIRE_FORECAST_MIN
  if (columnId === 'jobOrigin') return containerWidth >= JOBS_LIST_COL_ORIGIN_MIN
  return true
}
