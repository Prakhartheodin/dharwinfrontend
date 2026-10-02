'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { STATUS_OPTIONS } from '../jobFormConstants'
import type { JobFormSelectLayer, JobFormSelectOption } from './shared'
import { JOB_FORM_GRID } from './shared'

const Select = dynamic(() => import('react-select'), { ssr: false })

export function JobPublishingSection({
  status,
  onStatusChange,
  selectLayer,
  labelledBy,
}: {
  status: JobFormSelectOption
  onStatusChange: (value: JobFormSelectOption) => void
  selectLayer: JobFormSelectLayer
  labelledBy?: string
}): React.JSX.Element {
  const { menuPortalTarget, styles: selectMenuLayerStyles } = selectLayer
  return (
    <div className={JOB_FORM_GRID}>
      <div className="xl:col-span-6 md:col-span-6 col-span-12">
        <Select
          inputId="job-status"
          aria-labelledby={labelledBy}
          options={STATUS_OPTIONS}
          className="ti-form-select !p-0"
          classNamePrefix="Select2"
          value={status}
          onChange={(selected) => onStatusChange((selected as JobFormSelectOption) || { value: 'Active', label: 'Active' })}
          menuPlacement="auto"
          menuPortalTarget={menuPortalTarget}
          styles={selectMenuLayerStyles}
        />
        <p className="text-muted text-xs mt-1">
          Draft: not visible to candidates. Active: published and accepting applications. Closed: no longer hiring.
        </p>
      </div>
    </div>
  )
}
