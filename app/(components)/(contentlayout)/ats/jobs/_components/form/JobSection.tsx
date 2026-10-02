'use client'

import React, { type ReactNode } from 'react'
import { JOB_FORM_SECTION_LABEL } from './jobFormConstants'

export function JobSection({
  title,
  children,
  className = '',
  headingId,
  required = false,
}: {
  title: string
  children: ReactNode
  className?: string
  /** Set on the section h2; pass the same id to inner fields as aria-labelledby. */
  headingId?: string
  required?: boolean
}): React.JSX.Element {
  return (
    <section className={`space-y-3 ${className}`.trim()} aria-labelledby={headingId}>
      <h2 id={headingId} className={`${JOB_FORM_SECTION_LABEL} jobs-form-section-heading scroll-mt-24`}>
        {title}
        {required ? (
          <>
            {' '}
            <span className="text-danger">*</span>
          </>
        ) : null}
      </h2>
      {children}
    </section>
  )
}
