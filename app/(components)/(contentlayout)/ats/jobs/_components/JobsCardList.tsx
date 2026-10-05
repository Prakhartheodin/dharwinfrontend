'use client'

import React from 'react'
import type { DisplayJob } from '@/shared/lib/ats/jobMappers'
import { HireForecastChip } from './HireForecastCell'
import { JobOriginBadge, JobStatusBadge } from './JobPills'
import { JobRowActions } from './JobRowActions'

export interface JobsCardListProps {
  rows: any[]
  prepareRow: (row: any) => void
  emptyMessage: string
  canDelete: boolean
  isSalesAgent: boolean
  selectedRows: Set<string>
  onRowSelect: (id: string) => void
  onOpenPreview: (job: DisplayJob) => void
  formatPostingDateMeta: (raw?: string | null) => { formatted: string; relative: string }
  canEdit: boolean
  bookmarkedJobs: Set<string>
  bookmarkTogglingId: string | null
  callingJobId: string | null
  getOrganisationPhone: (job: DisplayJob) => string
  onBookmark: (id: string) => void
  onInitiateCall: (job: DisplayJob) => void
  onShare: (job: DisplayJob) => void
  onClearFilters?: () => void
  canCreate?: boolean
}

export function JobsCardList({
  rows,
  prepareRow,
  emptyMessage,
  canDelete,
  isSalesAgent,
  selectedRows,
  onRowSelect,
  onOpenPreview,
  formatPostingDateMeta,
  canEdit,
  bookmarkedJobs,
  bookmarkTogglingId,
  callingJobId,
  getOrganisationPhone,
  onBookmark,
  onInitiateCall,
  onShare,
  onClearFilters,
  canCreate,
}: JobsCardListProps): React.JSX.Element {
  if (rows.length === 0) {
    return (
      <div className="jobs-list-cards flex-1 overflow-y-auto py-6" style={{ minHeight: 0 }}>
        <div className="rounded-xl border border-dashed border-defaultborder/60 dark:border-white/10 py-10 px-4 text-center">
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

  return (
    <div className="jobs-list-cards flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
      {rows.map((row: any, i: number) => {
        prepareRow(row)
        const job = row.original as DisplayJob
        const { formatted: postedOn, relative } = formatPostingDateMeta(job.postingDate)
        const locationText = job.location != null ? String(job.location).trim() : ''
        const dateLine = postedOn ? (relative ? `${postedOn} \u00b7 ${relative}` : postedOn) : ''
        const phone = getOrganisationPhone(job)

        return (
          <div
            key={row.id || `card-${i}`}
            className="jobs-list-card rounded-xl border border-defaultborder/70 dark:border-white/10 bg-white dark:bg-bodybg shadow-sm hover:shadow transition-shadow p-3.5 space-y-2.5 min-w-0"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => onOpenPreview(job)}
                  className="text-left text-sm font-semibold text-gray-900 dark:text-white hover:text-primary leading-snug break-words"
                >
                  {job.jobTitle}
                </button>
                <div className="mt-0.5 text-xs text-defaulttextcolor/75 truncate" title={job.company}>
                  {job.company}
                </div>
                {(dateLine || locationText) && (
                  <div className="mt-1.5 space-y-0.5 text-[0.7rem] leading-snug text-defaulttextcolor/70">
                    {dateLine ? (
                      <div className="flex items-center gap-1 min-w-0">
                        <i className="ri-calendar-line shrink-0 text-[0.75rem]" aria-hidden />
                        <span className="truncate">{dateLine}</span>
                      </div>
                    ) : null}
                    {locationText ? (
                      <div className="flex items-start gap-1 min-w-0 whitespace-normal break-words [overflow-wrap:anywhere]">
                        <i className="ri-map-pin-line shrink-0 mt-0.5 text-[0.75rem]" aria-hidden />
                        <span>{locationText}</span>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <JobStatusBadge status={job.status} />
                {canDelete && !isSalesAgent ? (
                  <input
                    id={`jobs-row-select-${job.id}`}
                    name="selectedJobIds"
                    className="form-check-input mt-0 shrink-0"
                    type="checkbox"
                    checked={selectedRows.has(job.id)}
                    onChange={() => onRowSelect(job.id)}
                    aria-label={`Select ${job.jobTitle}`}
                  />
                ) : null}
              </div>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5 text-[0.7rem]">
              {job.salary ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-white/[0.05] px-2 py-0.5 text-defaulttextcolor/85">
                  <i className="ri-money-dollar-circle-line text-[0.75rem]" aria-hidden />
                  {job.salary}
                </span>
              ) : null}
              {job.vacancies != null && job.vacancies > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-white/[0.05] px-2 py-0.5 text-defaulttextcolor/85">
                  <i className="ri-team-line text-[0.75rem]" aria-hidden />
                  {job.vacancies}
                </span>
              ) : null}
              <HireForecastChip forecast={job.hireForecast} />
              <JobOriginBadge jobOrigin={job.jobOrigin} />
            </div>
            <div className="mt-3">
              <JobRowActions
                job={job}
                layout="card"
                canEdit={canEdit}
                isSalesAgent={isSalesAgent}
                bookmarked={bookmarkedJobs.has(job.id)}
                bookmarkToggling={bookmarkTogglingId === job.id}
                calling={callingJobId === job.id}
                canCall={Boolean(phone)}
                callDisabledReason="Organisation phone required"
                onBookmark={() => onBookmark(job.id)}
                onCall={() => onInitiateCall(job)}
                onShare={() => onShare(job)}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
