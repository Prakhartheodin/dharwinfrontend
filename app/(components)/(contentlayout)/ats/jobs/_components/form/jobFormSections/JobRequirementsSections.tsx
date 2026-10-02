'use client'

import React from 'react'
import TiptapEditor from '@/shared/data/forms/form-editors/tiptapeditor'
import { JobRichTextShell } from './JobRichTextShell'
import { JOB_FORM_GRID } from './shared'

export function JobExperienceEducationSection({
  minExperience,
  maxExperience,
  education,
  onFieldChange,
}: {
  minExperience: string
  maxExperience: string
  education: string
  onFieldChange: (field: string, value: unknown) => void
}): React.JSX.Element {
  return (
    <div className={JOB_FORM_GRID}>
      <div className="xl:col-span-3 md:col-span-6 col-span-12">
        <label htmlFor="min-experience" className="form-label">
          Min. Years Experience
        </label>
        <input
          type="number"
          min="0"
          step="0.5"
          className="form-control !rounded-md"
          id="min-experience"
          placeholder="0"
          value={minExperience}
          onChange={(e) => onFieldChange('minExperience', e.target.value)}
        />
      </div>
      <div className="xl:col-span-3 md:col-span-6 col-span-12">
        <label htmlFor="max-experience" className="form-label">
          Max. Years Experience
        </label>
        <input
          type="number"
          min="0"
          step="0.5"
          className="form-control !rounded-md"
          id="max-experience"
          placeholder="5"
          value={maxExperience}
          onChange={(e) => onFieldChange('maxExperience', e.target.value)}
        />
      </div>
      <div className="xl:col-span-6 md:col-span-6 col-span-12">
        <label htmlFor="education" className="form-label">
          Education Requirements
        </label>
        <input
          type="text"
          className="form-control !rounded-md"
          id="education"
          placeholder="e.g., Bachelor's degree in Computer Science or equivalent"
          value={education}
          onChange={(e) => onFieldChange('education', e.target.value)}
        />
      </div>
    </div>
  )
}

export function JobRequirementsQualificationsSection({
  requirements,
  onRequirementsChange,
  helperText,
  labelledBy,
}: {
  requirements: string
  onRequirementsChange: (html: string) => void
  helperText: string
  labelledBy?: string
}): React.JSX.Element {
  return (
    <>
      <JobRichTextShell id="requirements-editor" labelledBy={labelledBy}>
        <TiptapEditor
          content={requirements}
          placeholder="List key requirements, must-have skills, certifications, and qualifications..."
          onChange={onRequirementsChange}
        />
      </JobRichTextShell>
      <p className="text-muted text-xs mt-2 mb-0">{helperText}</p>
    </>
  )
}
