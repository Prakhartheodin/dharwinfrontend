'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { YmdFilterDateInput } from '@/shared/components/filters/YmdFilterDateInput'
import { EXPERIENCE_LEVEL_OPTIONS, JOB_TYPE_OPTIONS } from '../jobFormConstants'
import { FieldInlineError, fieldErrorProps } from '../jobFormValidation'
import { JOB_FORM_GRID, type JobFormBasicsSlice, type JobFormSelectLayer } from './shared'

const Select = dynamic(() => import('react-select'), { ssr: false })

export function JobBasicsSection({
  formData,
  fieldErrors,
  onFieldChange,
  selectLayer,
  datePortalId,
}: {
  formData: JobFormBasicsSlice
  fieldErrors: Record<string, string>
  onFieldChange: (field: string, value: unknown) => void
  selectLayer: JobFormSelectLayer
  datePortalId: string
}): React.JSX.Element {
  const { menuPortalTarget, styles: selectMenuLayerStyles } = selectLayer
  return (
    <div className={JOB_FORM_GRID}>
      <div className="xl:col-span-6 md:col-span-6 col-span-12">
        <label htmlFor="job-title" className="form-label">
          Job Title <span className="text-danger">*</span>
        </label>
        <input
          type="text"
          className="form-control !rounded-md"
          id="job-title"
          placeholder="e.g., Senior Software Engineer"
          value={formData.jobTitle}
          onChange={(e) => onFieldChange('jobTitle', e.target.value)}
          {...fieldErrorProps('job-title', fieldErrors)}
        />
        <FieldInlineError fieldId="job-title" fieldErrors={fieldErrors} />
      </div>
      <div className="xl:col-span-6 md:col-span-6 col-span-12">
        <label htmlFor="organisation-name" className="form-label">
          Organisation / Company Name <span className="text-danger">*</span>
        </label>
        <input
          type="text"
          className="form-control !rounded-md"
          id="organisation-name"
          placeholder="e.g., Acme Corp"
          value={formData.organisationName}
          onChange={(e) => onFieldChange('organisationName', e.target.value)}
          {...fieldErrorProps('organisation-name', fieldErrors)}
        />
        <FieldInlineError fieldId="organisation-name" fieldErrors={fieldErrors} />
      </div>
      <div className="xl:col-span-6 md:col-span-6 col-span-12">
        <label htmlFor="job-location" className="form-label">
          Location <span className="text-danger">*</span>
        </label>
        <input
          type="text"
          className="form-control !rounded-md"
          id="job-location"
          placeholder="e.g., San Francisco, CA or Remote"
          value={formData.location}
          onChange={(e) => onFieldChange('location', e.target.value)}
          {...fieldErrorProps('job-location', fieldErrors)}
        />
        <FieldInlineError fieldId="job-location" fieldErrors={fieldErrors} />
      </div>
      <div className="xl:col-span-3 md:col-span-6 col-span-12">
        <label htmlFor="job-type-select" className="form-label">
          Job Type <span className="text-danger">*</span>
        </label>
        <div id="job-type" tabIndex={-1} {...fieldErrorProps('job-type', fieldErrors)}>
          <Select
            inputId="job-type-select"
            name="jobType"
            options={JOB_TYPE_OPTIONS}
            className="ti-form-select !p-0"
            classNamePrefix="Select2"
            placeholder="Select job type"
            value={formData.jobType}
            onChange={(selected) => onFieldChange('jobType', selected)}
            menuPlacement="auto"
            menuPortalTarget={menuPortalTarget}
            styles={selectMenuLayerStyles}
          />
        </div>
        <FieldInlineError fieldId="job-type" fieldErrors={fieldErrors} />
      </div>
      <div className="xl:col-span-3 md:col-span-6 col-span-12">
        <label htmlFor="experience-level-select" className="form-label">
          Experience Level
        </label>
        <Select
          inputId="experience-level-select"
          options={EXPERIENCE_LEVEL_OPTIONS}
          className="ti-form-select !p-0"
          classNamePrefix="Select2"
          placeholder="Select experience level"
          value={formData.experienceLevel}
          onChange={(selected) => onFieldChange('experienceLevel', selected)}
          menuPlacement="auto"
          isClearable
          menuPortalTarget={menuPortalTarget}
          styles={selectMenuLayerStyles}
        />
        <p className="text-muted text-xs mt-1">Expected experience tier for this role</p>
      </div>
      <div className="xl:col-span-3 md:col-span-6 col-span-12">
        <label htmlFor="vacancies" className="form-label">
          Vacancies / Number of Openings <span className="text-danger">*</span>
        </label>
        <input
          type="number"
          inputMode="numeric"
          className="form-control w-full !rounded-md"
          id="vacancies"
          placeholder="e.g., 5"
          min={1}
          max={10000}
          step={1}
          value={formData.vacancies}
          onChange={(e) => onFieldChange('vacancies', e.target.value.replace(/\D/g, ''))}
          {...fieldErrorProps('vacancies', fieldErrors)}
        />
        <FieldInlineError fieldId="vacancies" fieldErrors={fieldErrors} />
        <p className="text-muted text-xs mt-1">
          Whole number, minimum 1. This caps how many applicants can be hired for the job.
        </p>
      </div>
      <div className="xl:col-span-3 md:col-span-6 col-span-12">
        <YmdFilterDateInput
          label="Application deadline (optional)"
          variant="form"
          inputId="applicationDeadline"
          value={formData.applicationDeadline}
          onCommit={(sanitized) => onFieldChange('applicationDeadline', sanitized)}
          portalId={datePortalId}
          popperClassName="!z-[9999]"
          inputClassName="form-control w-full !rounded-md"
          labelClassName="form-label"
        />
      </div>
    </div>
  )
}
