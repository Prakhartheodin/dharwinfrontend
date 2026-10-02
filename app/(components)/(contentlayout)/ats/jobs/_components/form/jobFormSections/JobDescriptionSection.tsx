'use client'

import React from 'react'
import Link from 'next/link'
import TiptapEditor from '@/shared/data/forms/form-editors/tiptapeditor'
import { ROUTES } from '@/shared/lib/constants'
import { JobRichTextShell } from './JobRichTextShell'

export function JobDescriptionSection({
  jobDescription,
  onDescriptionChange,
  fieldErrors,
  templates,
  templatesLoading,
  savingTemplate,
  onLoadTemplate,
  onSaveAsTemplate,
  labelledBy,
}: {
  jobDescription: string
  onDescriptionChange: (html: string) => void
  fieldErrors: Record<string, string>
  templates: { _id: string; title: string }[]
  templatesLoading: boolean
  savingTemplate: boolean
  onLoadTemplate: (templateId: string) => void
  onSaveAsTemplate: () => void
  labelledBy?: string
}): React.JSX.Element {
  return (
    <div className="grid grid-cols-12 gap-3">
      <div className="xl:col-span-12 col-span-12">
        <div className="jobs-form-template-bar">
          <div className="jobs-form-template-bar__copy">
            <p className="jobs-form-template-bar__title m-0">Start from a template</p>
            <p className="jobs-form-template-bar__hint m-0">
              Reuse a saved description, then edit it for this role.
            </p>
          </div>
          <div className="jobs-form-template-bar__actions">
            {templates.length > 0 ? (
              <select
                className="jobs-form-template-select form-control"
                defaultValue=""
                onChange={(e) => {
                  onLoadTemplate(e.target.value)
                  e.target.value = ''
                }}
                disabled={templatesLoading}
                aria-label="Use job template"
              >
                <option value="">Choose template…</option>
                {templates.map((t) => {
                  const oid = (t as { _id?: string; id?: string })._id ?? (t as { id?: string }).id ?? ''
                  return (
                    <option key={oid} value={oid}>
                      {t.title}
                    </option>
                  )
                })}
              </select>
            ) : (
              <span className="text-xs text-defaulttextcolor/60 dark:text-white/50">No templates yet</span>
            )}
            <button
              type="button"
              className="ti-btn ti-btn-light !text-xs"
              onClick={onSaveAsTemplate}
              disabled={savingTemplate}
            >
              {savingTemplate ? 'Saving…' : 'Save as template'}
            </button>
            <Link href={ROUTES.settingsJobTemplates} className="ti-btn ti-btn-light !text-xs">
              {templates.length > 0 ? 'Manage templates' : 'Add templates'}
            </Link>
            {templatesLoading ? <span className="text-xs text-muted">Loading…</span> : null}
          </div>
        </div>
        <JobRichTextShell id="job-description-editor" fieldErrors={fieldErrors} labelledBy={labelledBy}>
          <TiptapEditor
            content={jobDescription}
            placeholder="Describe the role, team, and what success looks like…"
            onChange={onDescriptionChange}
          />
        </JobRichTextShell>
        <p className="text-muted text-xs mt-2 mb-0">
          This is what candidates read first—keep it specific to the role and your company.
        </p>
      </div>
    </div>
  )
}
