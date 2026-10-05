'use client'

import React from 'react'
import Link from 'next/link'
import CallNowButton from '@/shared/components/CallNowButton'
import { displayApplicantEmail } from '@/shared/lib/ats/applicant-email'
import type { mapCandidateToDisplay } from '@/shared/lib/api/candidates'

type CandidateDisplay = ReturnType<typeof mapCandidateToDisplay>

export interface EmployeesCardListProps {
  rows: any[]
  prepareRow: (row: any) => void
  emptyMessage: string
  canBulkSelect: boolean
  selectedRows: Set<string>
  onRowSelect: (id: string) => void
  onOpenPreview: (candidate: CandidateDisplay) => void
  onShare: (candidate: CandidateDisplay) => void
  onAttendance: (candidate: CandidateDisplay) => void
  buildEditHref: (id: string) => string
  canUpdate: boolean
  canCreate?: boolean
  onClearFilters?: () => void
  isResigned: (candidate: CandidateDisplay) => boolean
  resignLabel: (candidate: CandidateDisplay) => string | null
  renderAvatar: (candidate: CandidateDisplay, className: string) => React.ReactNode
}

export function EmployeesCardList({
  rows,
  prepareRow,
  emptyMessage,
  canBulkSelect,
  selectedRows,
  onRowSelect,
  onOpenPreview,
  onShare,
  onAttendance,
  buildEditHref,
  canUpdate,
  canCreate,
  onClearFilters,
  isResigned,
  resignLabel,
  renderAvatar,
}: EmployeesCardListProps): React.JSX.Element {
  if (rows.length === 0) {
    return (
      <div className="employees-list-cards flex-1 overflow-y-auto py-6" style={{ minHeight: 0 }}>
        <div className="rounded-xl border border-dashed border-defaultborder/60 dark:border-white/10 py-10 px-4 text-center">
          <p className="text-sm text-defaulttextcolor/80 mb-3">{emptyMessage}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {onClearFilters ? (
              <button type="button" className="ti-btn ti-btn-light !text-xs" onClick={onClearFilters}>
                Clear filters
              </button>
            ) : null}
            {canCreate ? (
              <Link href="/ats/employees/add" className="ti-btn ti-btn-primary-full !text-xs">
                Add employee
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="employees-list-cards flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
      {rows.map((row: any, i: number) => {
        prepareRow(row)
        const candidate = row.original as CandidateDisplay
        const resigned = isResigned(candidate)
        const isUnpaid = candidate._raw?.compensationType === 'unpaid'
        const compensationLabel = isUnpaid ? 'Unpaid' : 'Paid'
        const employmentType = candidate._raw?.employmentType as string | undefined
        const jd = candidate._raw?.joiningDate as string | undefined
        const joinDisplay =
          jd && !Number.isNaN(new Date(jd).getTime())
            ? new Date(jd).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
            : '—'
        const rd = resignLabel(candidate)

        return (
          <div
            key={row.id || `employee-card-${i}`}
            className={`employees-list-card rounded-xl border shadow-sm hover:shadow transition-shadow p-3.5 space-y-2.5 min-w-0 ${
              resigned
                ? 'border-red-500/30 bg-red-50/90 dark:border-red-500/25 dark:bg-red-950/30'
                : 'border-defaultborder/70 dark:border-white/10 bg-white dark:bg-bodybg'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <div className={`shrink-0 rounded-full ${resigned ? 'ring-2 ring-red-500/60' : ''}`}>
                  {renderAvatar(candidate, 'w-10 h-10 rounded-full')}
                </div>
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => onOpenPreview(candidate)}
                    className={`text-left text-sm font-semibold leading-snug break-words hover:text-primary ${
                      resigned ? 'text-red-950 dark:text-red-100' : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    {candidate.name}
                  </button>
                  {candidate._raw?.employeeId ? (
                    <div className="mt-0.5 text-xs text-defaulttextcolor/70 truncate">
                      <i className="ri-id-card-line me-1" aria-hidden />
                      {candidate._raw.employeeId}
                    </div>
                  ) : null}
                  <div className="mt-1 flex flex-wrap gap-1">
                    <span
                      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                        isUnpaid
                          ? 'border border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-800/50 dark:bg-amber-900/30 dark:text-amber-300'
                          : 'border border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-900/30 dark:text-emerald-300'
                      }`}
                    >
                      {compensationLabel}
                    </span>
                    {employmentType ? (
                      <span className="inline-flex items-center rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
                        {employmentType}
                      </span>
                    ) : null}
                    {resigned ? (
                      <span className="inline-flex items-center gap-0.5 rounded-md bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                        Resigned
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              {canBulkSelect ? (
                <input
                  className="form-check-input mt-0.5 shrink-0"
                  type="checkbox"
                  checked={selectedRows.has(candidate.id)}
                  onChange={() => onRowSelect(candidate.id)}
                  aria-label={`Select ${candidate.name}`}
                />
              ) : null}
            </div>
            <div className="space-y-0.5 text-xs text-defaulttextcolor/75 dark:text-white/70">
              {candidate.phone ? (
                <div className="flex items-center gap-1.5">
                  <i className="ri-phone-line shrink-0" aria-hidden />
                  <span className="truncate">{candidate.phone}</span>
                </div>
              ) : null}
              <div className="flex items-start gap-1.5 min-w-0">
                <i className="ri-mail-line shrink-0 mt-px" aria-hidden />
                <span className="min-w-0 break-all">{displayApplicantEmail([candidate.email])}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[0.7rem]">
                <i className="ri-calendar-check-line shrink-0" aria-hidden />
                <span>Joined {joinDisplay}</span>
              </div>
              {rd ? (
                <div className="text-[0.7rem] text-red-800/90 dark:text-red-200/90">Exit {rd}</div>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-defaultborder/40 dark:border-white/10">
              <button
                type="button"
                onClick={() => onOpenPreview(candidate)}
                className="ti-btn ti-btn-icon ti-btn-sm !h-11 !w-11 bg-success/10 text-success hover:bg-success hover:text-white"
                title="View details"
                aria-label={`View details for ${candidate.name}`}
              >
                <i className="ri-eye-line" aria-hidden />
              </button>
              {candidate.phone ? (
                <CallNowButton
                  phone={candidate.phone}
                  name={candidate.name}
                  avatar={candidate.displayPicture}
                  className="ti-btn ti-btn-icon ti-btn-sm !h-11 !w-11 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-600 hover:text-white"
                  title="Call employee"
                />
              ) : null}
              {canUpdate ? (
                <Link
                  href={buildEditHref(candidate.id)}
                  className="ti-btn ti-btn-icon ti-btn-sm !h-11 !w-11 bg-info/10 text-info hover:bg-info hover:text-white"
                  title="Edit employee"
                  aria-label={`Edit ${candidate.name}`}
                >
                  <i className="ri-pencil-line" aria-hidden />
                </Link>
              ) : null}
              <button
                type="button"
                onClick={() => onShare(candidate)}
                className="ti-btn ti-btn-icon ti-btn-sm !h-11 !w-11 bg-primary/10 text-primary hover:bg-primary hover:text-white"
                title="Share profile"
                aria-label={`Share profile for ${candidate.name}`}
              >
                <i className="ri-share-line" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => onAttendance(candidate)}
                className="ti-btn ti-btn-icon ti-btn-sm !h-11 !w-11 bg-purple-500/10 text-purple-500 hover:bg-purple-500 hover:text-white"
                title="Attendance calendar"
                aria-label={`View attendance for ${candidate.name}`}
              >
                <i className="ri-calendar-check-line" aria-hidden />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
