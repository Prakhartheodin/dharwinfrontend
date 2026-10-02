'use client'

import React from 'react'
import Link from 'next/link'

export function JobFormFooter({
  mode,
  submitting,
  submitDisabled = false,
  onCancelHref = '/ats/jobs',
  onCancel,
}: {
  mode: 'create' | 'edit'
  submitting: boolean
  submitDisabled?: boolean
  onCancelHref?: string
  onCancel?: (event: React.MouseEvent<HTMLAnchorElement>) => void
}): React.JSX.Element {
  return (
    <footer className="jobs-form-footer">
      <div className="jobs-command-strip jobs-form-footer__command">
        <Link
          href={onCancelHref}
          className="ti-btn ti-btn-light jobs-form-footer__btn"
          onClick={onCancel}
        >
          Cancel
        </Link>
        <button
          type="submit"
          form="job-form"
          className="ti-btn ti-btn-primary-full jobs-form-footer__btn jobs-form-footer__btn--primary"
          disabled={submitting || submitDisabled}
        >
          {submitting ? 'Saving…' : mode === 'create' ? 'Create job' : 'Save changes'}
        </button>
      </div>
    </footer>
  )
}
