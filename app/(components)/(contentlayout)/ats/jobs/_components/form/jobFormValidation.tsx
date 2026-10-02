'use client'

import React, { useEffect, useRef } from 'react'
import type { JobFormTabKey } from './jobFormConstants'

export const JOB_FORM_ERROR_SUMMARY_ID = 'job-form-error-summary'

export type JobFormFieldError = {
  tab: JobFormTabKey
  fieldId: string
  message: string
}

export function validateJobFormRequired(input: {
  jobTitle: string
  organisationName: string
  location: string
  jobType: unknown
  jobDescriptionHtml: string
  phoneError: string | null
  foundedInvalid: boolean
  roundPlanError: string | null
  vacanciesError: string | null
  /** Create job: at least one interview round is required. */
  requireInterviewSetup?: boolean
  interviewRoundsCount?: number
}): JobFormFieldError[] {
  const errors: JobFormFieldError[] = []

  if (input.requireInterviewSetup && (input.interviewRoundsCount ?? 0) === 0) {
    errors.push({
      tab: 'settings',
      fieldId: 'interview-round-plan',
      message: 'Add at least one interview round before creating this job.',
    })
  }
  if (input.roundPlanError) {
    errors.push({ tab: 'settings', fieldId: 'interview-round-plan', message: input.roundPlanError })
  }
  if (!input.jobTitle.trim()) {
    errors.push({ tab: 'general', fieldId: 'job-title', message: 'Job title is required.' })
  }
  if (!input.organisationName.trim()) {
    errors.push({
      tab: 'general',
      fieldId: 'organisation-name',
      message: 'Organisation name is required.',
    })
  }
  if (!input.location.trim()) {
    errors.push({ tab: 'general', fieldId: 'job-location', message: 'Location is required.' })
  }
  if (!input.jobType) {
    errors.push({ tab: 'general', fieldId: 'job-type', message: 'Job type is required.' })
  }
  const desc = input.jobDescriptionHtml.replace(/<[^>]*>/g, '').trim()
  if (!desc) {
    errors.push({
      tab: 'general',
      fieldId: 'job-description-editor',
      message: 'Job description is required.',
    })
  }
  if (input.phoneError) {
    errors.push({ tab: 'general', fieldId: 'org-phone', message: input.phoneError })
  }
  if (input.foundedInvalid) {
    errors.push({ tab: 'general', fieldId: 'org-founded', message: 'Founded year is invalid.' })
  }
  if (input.vacanciesError) {
    errors.push({ tab: 'general', fieldId: 'vacancies', message: input.vacanciesError })
  }

  return errors
}

export function focusJobFormField(fieldId: string): void {
  const el = document.getElementById(fieldId)
  if (fieldId === 'job-description-editor') {
    const editable = el?.querySelector('[contenteditable="true"]') as HTMLElement | null
    if (editable) {
      editable.focus()
      editable.scrollIntoView({ block: 'center', behavior: 'smooth' })
      return
    }
  }
  if (fieldId === 'job-type') {
    const selectInput = document.getElementById('job-type-select') as HTMLElement | null
    selectInput?.focus()
    selectInput?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    return
  }
  if (el && typeof (el as HTMLElement).focus === 'function') {
    ;(el as HTMLElement).focus()
  }
  el?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
}

export function focusJobFormErrorSummary(): void {
  const summary = document.getElementById(JOB_FORM_ERROR_SUMMARY_ID)
  summary?.focus()
  summary?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
}

export function applyJobFormFieldErrors(
  errors: JobFormFieldError[],
  setActiveTab: (tab: JobFormTabKey) => void,
  setFieldErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>
): void {
  if (!errors.length) return
  const map: Record<string, string> = {}
  for (const err of errors) {
    map[err.fieldId] = err.message
  }
  setActiveTab(errors[0].tab)
  setFieldErrors(map)
  requestAnimationFrame(() => {
    if (errors.length > 1) {
      focusJobFormErrorSummary()
      return
    }
    focusJobFormField(errors[0].fieldId)
  })
}

/** @deprecated Use applyJobFormFieldErrors */
export function applyJobFormFieldError(
  error: JobFormFieldError,
  setActiveTab: (tab: JobFormTabKey) => void,
  setFieldErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>
): void {
  applyJobFormFieldErrors([error], setActiveTab, setFieldErrors)
}

export function fieldErrorProps(
  fieldId: string,
  fieldErrors: Record<string, string>
): { 'aria-invalid'?: true; 'aria-describedby'?: string } {
  if (!fieldErrors[fieldId]) return {}
  return { 'aria-invalid': true, 'aria-describedby': `${fieldId}-error` }
}

export function FieldInlineError({
  fieldId,
  fieldErrors,
}: {
  fieldId: string
  fieldErrors: Record<string, string>
}): React.JSX.Element | null {
  const msg = fieldErrors[fieldId]
  if (!msg) return null
  return (
    <p id={`${fieldId}-error`} className="text-danger text-xs mt-1" role="alert">
      {msg}
    </p>
  )
}

export function JobFormValidationSummary({
  fieldErrors,
  focusToken,
}: {
  fieldErrors: Record<string, string>
  /** Increment after failed submit to move focus to the summary when shown. */
  focusToken?: number
}): React.JSX.Element | null {
  const entries = Object.entries(fieldErrors)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (entries.length < 2 || focusToken === undefined) return
    ref.current?.focus()
  }, [focusToken, entries.length])

  if (entries.length < 2) return null

  return (
    <div
      ref={ref}
      id={JOB_FORM_ERROR_SUMMARY_ID}
      tabIndex={-1}
      className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger outline-none focus-visible:ring-2 focus-visible:ring-danger/40"
      role="alert"
      aria-labelledby="job-form-error-summary-title"
    >
      <h2 id="job-form-error-summary-title" className="font-medium mb-2 text-sm">
        Complete these fields to save:
      </h2>
      <ul className="list-none p-0 m-0 space-y-1 text-xs">
        {entries.map(([fieldId, message]) => (
          <li key={fieldId}>
            <button
              type="button"
              className="jobs-form-error-summary-link text-left text-danger underline-offset-2 hover:underline min-h-[44px] py-2"
              onClick={() => focusJobFormField(fieldId)}
            >
              {message}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
