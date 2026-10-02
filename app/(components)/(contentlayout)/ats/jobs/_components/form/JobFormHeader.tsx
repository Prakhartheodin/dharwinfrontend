'use client'

import React from 'react'
import Link from 'next/link'
import { JobStatusBadge } from '../JobPills'

export function JobFormHeader({
  mode,
  status,
}: {
  mode: 'create' | 'edit'
  /** Shown in header on edit (and create when set). */
  status?: string | null
}): React.JSX.Element {
  const pageTitle = mode === 'create' ? 'New job posting' : 'Edit posting'
  const subtitle =
    mode === 'create'
      ? 'Add role details, requirements, and how candidates move through interviews.'
      : 'Update what candidates see and how this role is published.'

  return (
    <header className="jobs-form-header shrink-0 border-b border-defaultborder/60 dark:border-white/10">
      <div className="jobs-surface-x jobs-form-header__inner pb-3 pt-3">
        <div className="jobs-command-strip jobs-form-header__command">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Link
                href="/ats/jobs"
                className="jobs-form-back inline-flex items-center gap-1 text-xs font-medium text-defaulttextcolor/70 hover:text-primary mb-2"
              >
                <i className="ri-arrow-left-line" aria-hidden />
                All jobs
              </Link>
              <h1 className="jobs-list-toolbar__title m-0">{pageTitle}</h1>
              <p className="text-xs text-defaulttextcolor/65 dark:text-white/55 mt-1 mb-0 max-w-2xl">
                {subtitle}
              </p>
            </div>
            {status ? (
              <div className="shrink-0 pt-6 sm:pt-0">
                <JobStatusBadge status={status} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  )
}
