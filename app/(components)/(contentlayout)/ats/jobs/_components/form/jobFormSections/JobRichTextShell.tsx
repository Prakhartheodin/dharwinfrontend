'use client'

import React, { type ReactNode } from 'react'
import { JOB_RTE_WRAPPER_CLASS } from '../jobFormConstants'
import { FieldInlineError, fieldErrorProps } from '../jobFormValidation'

export function JobRichTextShell({
  id,
  fieldErrors,
  labelledBy,
  children,
}: {
  id: string
  fieldErrors?: Record<string, string>
  labelledBy?: string
  children: ReactNode
}): React.JSX.Element {
  return (
    <div>
      <div
        id={id}
        className={JOB_RTE_WRAPPER_CLASS}
        aria-labelledby={labelledBy}
        {...(fieldErrors ? fieldErrorProps(id, fieldErrors) : {})}
      >
        {children}
      </div>
      {fieldErrors ? <FieldInlineError fieldId={id} fieldErrors={fieldErrors} /> : null}
    </div>
  )
}
