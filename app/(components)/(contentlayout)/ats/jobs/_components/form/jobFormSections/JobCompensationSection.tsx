'use client'

import React from 'react'
import { JOB_FORM_GRID } from './shared'

export type JobCompensationSlice = {
  salaryMin: string
  salaryMax: string
}

export function JobCompensationSection({
  formData,
  onFieldChange,
}: {
  formData: JobCompensationSlice
  onFieldChange: (field: string, value: unknown) => void
}): React.JSX.Element {
  return (
    <div className={JOB_FORM_GRID}>
      <div className="xl:col-span-6 md:col-span-6 col-span-12">
        <label htmlFor="salary-min" className="form-label">
          Minimum Salary
        </label>
        <div className="input-group">
          <span className="input-group-text text-muted">$</span>
          <input
            type="number"
            className="form-control !rounded-e-md"
            id="salary-min"
            placeholder="50000"
            value={formData.salaryMin}
            onChange={(e) => onFieldChange('salaryMin', e.target.value)}
          />
        </div>
      </div>
      <div className="xl:col-span-6 md:col-span-6 col-span-12">
        <label htmlFor="salary-max" className="form-label">
          Maximum Salary
        </label>
        <div className="input-group">
          <span className="input-group-text text-muted">$</span>
          <input
            type="number"
            className="form-control !rounded-e-md"
            id="salary-max"
            placeholder="100000"
            value={formData.salaryMax}
            onChange={(e) => onFieldChange('salaryMax', e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}
