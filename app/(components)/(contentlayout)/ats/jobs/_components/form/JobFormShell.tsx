'use client'

import React, { type ReactNode } from 'react'
import Seo from '@/shared/layout-components/seo/seo'

export const JOB_FORM_BOX_CLASS = 'box custom-box jobs-form-box mb-0 overflow-hidden'

export interface JobFormShellProps {
  seoTitle: string
  loading?: boolean
  children: ReactNode
}

export function JobFormBox({ children }: { children: ReactNode }): React.JSX.Element {
  return <div className={JOB_FORM_BOX_CLASS}>{children}</div>
}

export function JobFormBodyLoadingSkeleton(): React.JSX.Element {
  return (
    <div className="box-body space-y-5 animate-pulse" aria-busy="true" aria-label="Loading job form">
      <div className="h-20 rounded-lg bg-gray-100 dark:bg-white/[0.06] mx-5 sm:mx-6 mt-4" />
      <div className="space-y-4 px-5 sm:px-6">
        <div className="h-4 w-32 rounded bg-gray-200 dark:bg-white/10" />
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-6 h-10 rounded bg-gray-100 dark:bg-white/[0.06]" />
          <div className="col-span-6 h-10 rounded bg-gray-100 dark:bg-white/[0.06]" />
        </div>
        <div className="min-h-[12rem] rounded-lg bg-gray-100 dark:bg-white/[0.06]" />
      </div>
    </div>
  )
}

export function JobFormShell({
  seoTitle,
  loading,
  children,
}: JobFormShellProps): React.JSX.Element {
  return (
    <>
      <Seo title={seoTitle} />
      <div className="jobs-page-container jobs-form-page-shell mt-2 w-full min-w-0 max-w-full sm:mt-3 pb-3">
        {loading ? (
          <JobFormBox>
            <JobFormBodyLoadingSkeleton />
          </JobFormBox>
        ) : (
          children
        )}
      </div>
    </>
  )
}
