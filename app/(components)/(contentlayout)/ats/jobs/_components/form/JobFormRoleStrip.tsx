'use client'

import React from 'react'
export function JobFormRoleStrip({
  jobTitle,
  location,
  jobTypeLabel,
  mode,
}: {
  jobTitle: string
  location: string
  jobTypeLabel?: string | null
  mode: 'create' | 'edit'
}): React.JSX.Element {
  const title = jobTitle.trim() || 'Untitled role'
  const place = location.trim() || 'Add location'
  const type = jobTypeLabel?.trim() || 'Add job type'

  return (
    <div className="jobs-form-role-strip" aria-live="polite" aria-atomic="true">
      <p className="jobs-form-role-strip__eyebrow">{mode === 'create' ? 'Posting preview' : 'Editing posting'}</p>
      <h2 className="jobs-form-role-strip__title">{title}</h2>
      <p className="jobs-form-role-strip__meta">
        <span>{place}</span>
        <span className="jobs-form-role-strip__dot" aria-hidden>·</span>
        <span>{type}</span>
      </p>
    </div>
  )
}
