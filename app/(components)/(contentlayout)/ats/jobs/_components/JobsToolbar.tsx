'use client'

import React, { type Ref } from 'react'
import Link from 'next/link'
import JobQuickSearch from './JobQuickSearch'
import type { JobListQueryScope } from '@/shared/lib/ats/job-list-filters'

function jobsListSortChipLabel(sort: string): string | null {
  if (!sort || sort === 'newest-first' || sort === 'date-newest') return null
  const labels: Record<string, string> = {
    'oldest-first': 'Oldest first',
    'date-oldest': 'Oldest first',
    'title-asc': 'Title A\u2013Z',
    'title-desc': 'Title Z\u2013A',
    'company-asc': 'Company A\u2013Z',
    'company-desc': 'Company Z\u2013A',
  }
  return labels[sort] ?? null
}

export interface JobsToolbarProps {
  totalResults: number
  jobNameSearch: string
  setJobNameSearch: (v: string) => void
  filtersStatus: string
  listJobOrigin: '' | 'internal' | 'external'
  jobsListFetching: boolean
  setCommittedScope: React.Dispatch<React.SetStateAction<JobListQueryScope | null>>
  committedScope: JobListQueryScope | null
  jobsFilterPanelOpen: boolean
  onToggleFilters: () => void
  filterButtonRef?: Ref<HTMLButtonElement>
  hasActiveFilters: boolean
  activeFilterCount: number
  pageSize: number
  pageSizeOptions: number[]
  onPageSizeChange: (size: number) => void
  selectedSort: string
  onSortChange: (option: string) => void
  canCreate: boolean
  isSalesAgent: boolean
  canDelete: boolean
  selectedCount: number
  onDeleteSelected: () => void
  excelImporting: boolean
  onImportExcel: () => void
  onExportExcel: () => void
  onDownloadTemplate: () => void
  showExcelMenu: boolean
}

export function JobsToolbar({
  totalResults,
  jobNameSearch,
  setJobNameSearch,
  filtersStatus,
  listJobOrigin,
  jobsListFetching,
  setCommittedScope,
  committedScope,
  jobsFilterPanelOpen,
  onToggleFilters,
  filterButtonRef,
  hasActiveFilters,
  activeFilterCount,
  pageSize,
  pageSizeOptions,
  onPageSizeChange,
  selectedSort,
  onSortChange,
  canCreate,
  isSalesAgent,
  canDelete,
  selectedCount,
  onDeleteSelected,
  excelImporting,
  onImportExcel,
  onExportExcel,
  onDownloadTemplate,
  showExcelMenu,
}: JobsToolbarProps): React.JSX.Element {
  return (
    <header className="jobs-list-toolbar shrink-0 w-full max-w-full min-w-0 overflow-visible">
      <div className="jobs-surface-x jobs-list-toolbar__inner pb-0 pt-3 w-full min-w-0 max-w-full">
        <div className="jobs-list-toolbar__command flex flex-col gap-2.5">
          <div className="jobs-list-toolbar__heading flex flex-wrap items-baseline gap-2.5 sm:gap-3">
            <h1 className="jobs-list-toolbar__title m-0 pe-1 sm:pe-2">Jobs</h1>
            <span className="jobs-list-toolbar__count" aria-label={`${totalResults} jobs`}>
              {totalResults}
            </span>
          </div>

          <div className="jobs-list-toolbar__command-row flex flex-col gap-2.5 lg:flex-row lg:items-center lg:gap-3">
          <div className="jobs-list-toolbar__search min-w-0 flex-1 w-full">
          <JobQuickSearch
            value={jobNameSearch}
            onChange={setJobNameSearch}
            status={filtersStatus}
            jobOrigin={listJobOrigin}
            loading={jobsListFetching}
            onCommit={setCommittedScope}
            committedScope={committedScope}
          />
          </div>

        <div className="jobs-list-toolbar__actions flex flex-wrap items-center justify-start lg:justify-end gap-1.5 sm:gap-2 w-full lg:w-auto shrink-0 min-w-0">
          <button
            ref={filterButtonRef}
            type="button"
            className={`jobs-toolbar-btn ti-btn ti-btn-light !h-8 !py-0 !px-2.5 !text-[0.8125rem] whitespace-nowrap ${
              jobsFilterPanelOpen ? 'ring-2 ring-primary/30 bg-primary/[0.06]' : ''
            }`}
            aria-expanded={jobsFilterPanelOpen}
            aria-controls="jobs-filter-panel"
            aria-label="Filters, job search and filter options"
            onClick={onToggleFilters}
          >
            <i className="ri-filter-3-line font-semibold align-middle me-1" aria-hidden />
            Filters
            {hasActiveFilters ? (
              <span className="badge bg-primary text-white rounded-full ms-1 text-[0.65rem]">
                {activeFilterCount}
              </span>
            ) : null}
          </button>

          <label htmlFor="jobs-toolbar-page-size" className="sr-only">
            Jobs per page
          </label>
          <select
            id="jobs-toolbar-page-size"
            name="limit"
            className="jobs-toolbar-select form-control select-show-page-size !w-auto !h-8 !py-1 !text-[0.8125rem] !rounded-lg"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            aria-label="Jobs per page"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                Show {size}
              </option>
            ))}
          </select>

          <div className="hs-dropdown ti-dropdown">
            <button
              type="button"
              className="jobs-toolbar-btn ti-btn ti-btn-light !h-8 !py-0 !px-2.5 !text-[0.8125rem] ti-dropdown-toggle"
              id="sort-dropdown-button"
              aria-expanded="false"
            >
              <i className="ri-arrow-up-down-line font-semibold align-middle me-1" aria-hidden />
              Sort
              <i className="ri-arrow-down-s-line align-middle ms-1 inline-block" aria-hidden />
            </button>
            <ul className="hs-dropdown-menu ti-dropdown-menu hidden" aria-labelledby="sort-dropdown-button">
              <li>
                <button
                  type="button"
                  className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${
                    selectedSort === 'newest-first' || selectedSort === 'date-newest' ? 'active' : ''
                  }`}
                  onClick={() => onSortChange('newest-first')}
                >
                  <i className="ri-arrow-down-line me-2 align-middle inline-block" aria-hidden />
                  Newest First
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${
                    selectedSort === 'oldest-first' || selectedSort === 'date-oldest' ? 'active' : ''
                  }`}
                  onClick={() => onSortChange('oldest-first')}
                >
                  <i className="ri-arrow-up-line me-2 align-middle inline-block" aria-hidden />
                  Oldest First
                </button>
              </li>
              <li className="ti-dropdown-divider" />
              <li>
                <button
                  type="button"
                  className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left text-gray-500 dark:text-gray-400"
                  onClick={() => onSortChange('clear-sort')}
                >
                  <i className="ri-close-line me-2 align-middle inline-block" aria-hidden />
                  Clear Sort
                </button>
              </li>
            </ul>
          </div>

          {jobsListSortChipLabel(selectedSort) ? (
            <button
              type="button"
              className="jobs-toolbar-sort-chip inline-flex items-center gap-1 rounded-md border border-primary/25 bg-primary/10 px-2 py-1 text-[0.75rem] font-medium text-primary"
              onClick={() => onSortChange('clear-sort')}
              aria-label={`Clear sort: ${jobsListSortChipLabel(selectedSort)}`}
            >
              <span className="max-w-[10rem] truncate">{jobsListSortChipLabel(selectedSort)}</span>
              <i className="ri-close-line text-[0.875rem]" aria-hidden />
            </button>
          ) : null}

          {showExcelMenu ? (
            <div className="hs-dropdown ti-dropdown">
              <button
                type="button"
                className="jobs-toolbar-btn ti-btn ti-btn-light !h-8 !py-0 !px-2.5 !text-[0.8125rem] ti-dropdown-toggle"
                id="excel-dropdown-button"
                aria-expanded="false"
                aria-label="Excel actions"
              >
                <i className="ri-file-excel-2-line font-semibold align-middle me-1" aria-hidden />
                Excel
                <i className="ri-arrow-down-s-line align-middle ms-1 inline-block" aria-hidden />
              </button>
              <ul className="hs-dropdown-menu ti-dropdown-menu hidden" aria-labelledby="excel-dropdown-button">
                <li>
                  <button
                    type="button"
                    className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left"
                    onClick={onImportExcel}
                    disabled={excelImporting}
                  >
                    <i className="ri-upload-2-line me-2 align-middle inline-block" aria-hidden />
                    {excelImporting ? 'Importing…' : 'Import Excel'}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left"
                    onClick={onExportExcel}
                  >
                    <i className="ri-file-excel-2-line me-2 align-middle inline-block" aria-hidden />
                    Export Excel
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left"
                    onClick={onDownloadTemplate}
                  >
                    <i className="ri-download-line me-2 align-middle inline-block" aria-hidden />
                    Download template
                  </button>
                </li>
              </ul>
            </div>
          ) : null}

          <span className="jobs-list-toolbar__actions-divider hidden lg:block" aria-hidden />

          {canCreate && !isSalesAgent ? (
            <Link
              href="/ats/jobs/create"
              className="jobs-toolbar-btn ti-btn ti-btn-primary-full !h-8 !py-0 !px-3 !text-[0.8125rem] shrink-0 whitespace-nowrap"
            >
              <i className="ri-add-line font-semibold align-middle me-1" aria-hidden />
              Create Job
            </Link>
          ) : null}

          {canDelete && !isSalesAgent ? (
            <button
              type="button"
              className="jobs-toolbar-btn jobs-toolbar-btn--danger ti-btn ti-btn-light !h-8 !py-0 !px-2.5 !text-[0.8125rem] disabled:opacity-45 disabled:cursor-not-allowed"
              onClick={onDeleteSelected}
              disabled={selectedCount === 0}
            >
              <i className="ri-delete-bin-line font-semibold align-middle me-1" aria-hidden />
              Delete
            </button>
          ) : null}
        </div>
          </div>
        </div>
      </div>
    </header>
  )
}
