'use client'

import React from 'react'
import Link from 'next/link'
import { JobFormShell } from './JobFormShell'
import { JobFormHeader } from './JobFormHeader'

export function JobFormPermissionDenied({
  mode,
}: {
  mode: 'create' | 'edit'
}): React.JSX.Element {
  const seoTitle = mode === 'create' ? 'New job posting' : 'Edit posting'
  return (
    <JobFormShell mode={mode} title={seoTitle} seoTitle={seoTitle}>
      <JobFormHeader mode={mode} />
      <div className="box-body jobs-surface-x">
        <p className="text-default mb-3">
          You don&apos;t have permission to {mode === 'create' ? 'create' : 'edit'} job postings.
        </p>
        <Link href="/ats/jobs" className="ti-btn ti-btn-light">All jobs</Link>
      </div>
    </JobFormShell>
  )
}
