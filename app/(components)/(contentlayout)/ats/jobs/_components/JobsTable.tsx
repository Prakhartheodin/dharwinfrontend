'use client'

import React from 'react'
import { jobsTableColumnClasses } from './jobsTableResponsive'

type ColumnAriaSort = 'ascending' | 'descending' | 'none'

function jobsTableColumnAriaSort(columnId: string, selectedSort: string): ColumnAriaSort | undefined {
  if (columnId === 'jobTitle') {
    if (selectedSort === 'title-asc') return 'ascending'
    if (selectedSort === 'title-desc') return 'descending'
    return 'none'
  }
  if (columnId === 'company') {
    if (selectedSort === 'company-asc') return 'ascending'
    if (selectedSort === 'company-desc') return 'descending'
    return 'none'
  }
  return undefined
}

function jobsTableSortButtonLabel(
  columnId: 'jobTitle' | 'company',
  selectedSort: string
): string {
  const sort = jobsTableColumnAriaSort(columnId, selectedSort)
  const base = columnId === 'jobTitle' ? 'Job title' : 'Company'
  if (sort === 'ascending') return `${base}, sorted ascending`
  if (sort === 'descending') return `${base}, sorted descending`
  return `${base}, sort`
}

export interface JobsTableProps {
  getTableProps: () => Record<string, unknown>
  getTableBodyProps: () => Record<string, unknown>
  headerGroups: any[]
  rows: any[]
  prepareRow: (row: any) => void
  hasCheckboxColumn: boolean
  selectedSort: string
  onSortChange: (option: string) => void
  nextJobTitleSortToggle: (current: string) => 'title-asc' | 'title-desc' | 'clear-sort'
  nextCompanySortToggle: (current: string) => 'company-asc' | 'company-desc' | 'clear-sort'
  isAllSelected: boolean
  isIndeterminate: boolean
  onSelectAll: (e: React.ChangeEvent<HTMLInputElement>) => void
  emptyMessage?: string
  onClearFilters?: () => void
  canCreate?: boolean
}

const thBase =
  'jobs-table-th px-3 py-2.5 text-left text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-gray-600 dark:text-gray-400'
const tdBase = 'px-3 py-2.5 align-middle'
const headerRowInnerClass =
  'inline-flex min-h-9 items-center gap-1.5 min-w-0 max-w-full'
const sortBtnClass =
  `${headerRowInnerClass} rounded-md px-1 -mx-1 text-left font-semibold uppercase tracking-[0.06em] text-inherit hover:bg-gray-100/80 dark:hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40`

export function JobsTable({
  getTableProps,
  getTableBodyProps,
  headerGroups,
  rows,
  prepareRow,
  selectedSort,
  onSortChange,
  nextJobTitleSortToggle,
  nextCompanySortToggle,
  isAllSelected,
  isIndeterminate,
  onSelectAll,
  emptyMessage = 'No jobs found.',
  onClearFilters,
  canCreate,
}: JobsTableProps): React.JSX.Element {
  const tableClassName = 'jobs-data-table w-full max-w-full min-w-0 border-collapse text-sm'

  if (rows.length === 0) {
    return (
      <div
        className="jobs-list-table jobs-table-scroll jobs-surface-x flex-1 items-center justify-center bg-white dark:bg-bodybg py-10"
        style={{ minHeight: 0 }}
      >
        <div className="rounded-xl border border-dashed border-defaultborder/60 dark:border-white/10 py-10 px-6 text-center max-w-md w-full">
          <p className="text-sm text-defaulttextcolor/80 mb-3">{emptyMessage}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {onClearFilters ? (
              <button type="button" className="ti-btn ti-btn-light !text-xs" onClick={onClearFilters}>
                Clear filters
              </button>
            ) : null}
            {canCreate ? (
              <a href="/ats/jobs/create" className="ti-btn ti-btn-primary-full !text-xs">
                Create job
              </a>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  const headerRow = headerGroups[0]

  return (
    <div
      className="jobs-list-table jobs-table-scroll jobs-surface-x flex-1 overflow-y-auto overflow-x-auto bg-white dark:bg-bodybg w-full max-w-full min-w-0"
      style={{ minHeight: 0 }}
      role="region"
      aria-label="Jobs listing table"
      tabIndex={0}
    >
      <table {...getTableProps()} className={tableClassName}>
        <caption className="sr-only">Jobs listing, sortable by job title and company</caption>
        {headerRow?.headers?.length ? (
          <colgroup>
            {headerRow.headers.map((column: any) => (
              <col key={column.id} className={jobsTableColumnClasses(column.id)} />
            ))}
          </colgroup>
        ) : null}
        <thead className="jobs-table-thead">
          {headerGroups.map((headerGroup: any, i: number) => (
            <tr
              {...headerGroup.getHeaderGroupProps()}
              className="border-b border-defaultborder/60 dark:border-white/10"
              key={`header-group-${i}`}
            >
              {headerGroup.headers.map((column: any) => {
                const headerProps = column.getHeaderProps()
                const { key: _headerKey, ...headerPropsRest } = headerProps
                const isCheckboxCol = column.id === 'checkbox'
                const headerSortTitle = column.id === 'jobTitle'
                const headerSortCompany = column.id === 'company'
                const clickableHeader = headerSortTitle || headerSortCompany
                const ariaSort = jobsTableColumnAriaSort(column.id, selectedSort)
                const nowrapHeader =
                  column.id === 'checkbox' ||
                  column.id === 'vacancies' ||
                  column.id === 'status' ||
                  column.id === 'id'

                let sortIcon: React.ReactNode = null
                if (headerSortTitle && (selectedSort === 'title-asc' || selectedSort === 'title-desc')) {
                  sortIcon =
                    selectedSort === 'title-desc' ? (
                      <i className="ri-arrow-down-s-line text-[0.875rem]" aria-hidden />
                    ) : (
                      <i className="ri-arrow-up-s-line text-[0.875rem]" aria-hidden />
                    )
                } else if (
                  headerSortCompany &&
                  (selectedSort === 'company-asc' || selectedSort === 'company-desc')
                ) {
                  sortIcon =
                    selectedSort === 'company-desc' ? (
                      <i className="ri-arrow-down-s-line text-[0.875rem]" aria-hidden />
                    ) : (
                      <i className="ri-arrow-up-s-line text-[0.875rem]" aria-hidden />
                    )
                }

                return (
                  <th
                    {...headerPropsRest}
                    key={column.id}
                    aria-sort={ariaSort}
                    className={`${thBase} ${nowrapHeader ? 'whitespace-nowrap' : ''} ${jobsTableColumnClasses(column.id)}`.trim()}
                  >
                    {isCheckboxCol ? (
                      <input
                        id="jobs-select-all-page"
                        name="selectAll"
                        className="form-check-input"
                        type="checkbox"
                        checked={isAllSelected}
                        ref={(input) => {
                          if (input) input.indeterminate = isIndeterminate
                        }}
                        onChange={onSelectAll}
                        aria-label="Select all on page"
                      />
                    ) : column.id === 'hireForecast' ? (
                      <div className={headerRowInnerClass}>{column.render('Header')}</div>
                    ) : clickableHeader ? (
                      <button
                        type="button"
                        className={sortBtnClass}
                        aria-label={jobsTableSortButtonLabel(
                          column.id as 'jobTitle' | 'company',
                          selectedSort
                        )}
                        onClick={() => {
                          if (headerSortTitle) onSortChange(nextJobTitleSortToggle(selectedSort))
                          else if (headerSortCompany) onSortChange(nextCompanySortToggle(selectedSort))
                        }}
                      >
                        <span className="min-w-0 truncate">{column.render('Header')}</span>
                        {sortIcon}
                      </button>
                    ) : (
                      <div className={headerRowInnerClass}>
                        <span className="min-w-0 truncate">{column.render('Header')}</span>
                        {sortIcon}
                      </div>
                    )}
                  </th>
                )
              })}
            </tr>
          ))}
        </thead>
        <tbody {...getTableBodyProps()}>
          {rows.map((row: any, i: number) => {
            prepareRow(row)
            return (
              <tr
                {...row.getRowProps()}
                className="group border-b border-defaultborder/40 dark:border-white/10 hover:bg-gray-50/70 dark:hover:bg-white/[0.02]"
                key={row.id || `row-${i}`}
              >
                {row.cells.map((cell: any) => (
                  <td
                    {...cell.getCellProps()}
                    className={`${tdBase} ${jobsTableColumnClasses(cell.column.id)}`.trim()}
                    key={cell.column.id}
                  >
                    {cell.render('Cell')}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
