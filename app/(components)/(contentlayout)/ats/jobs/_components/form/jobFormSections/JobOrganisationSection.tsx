'use client'

import React from 'react'
import { COMPANY_SIZE_BUCKETS } from '@/shared/lib/api/jobs'
import { getPhoneCountry } from '@/shared/lib/phoneCountries'
import { PhoneCountrySelect } from '@/shared/components/PhoneCountrySelect'
import { FieldInlineError, fieldErrorProps } from '../jobFormValidation'
import { JOB_FORM_GRID } from './shared'

export type JobOrganisationSlice = {
  organisationWebsite: string
  organisationEmail: string
  organisationCountryCode: string
  organisationPhone: string
  organisationAddress: string
  organisationIndustry: string
  organisationFounded: string
  organisationCompanySize: string
}

export function JobOrganisationSection({
  formData,
  fieldErrors,
  onFieldChange,
}: {
  formData: JobOrganisationSlice
  fieldErrors: Record<string, string>
  onFieldChange: (field: string, value: unknown) => void
}): React.JSX.Element {
  return (
    <div className={JOB_FORM_GRID}>
      <div className="xl:col-span-4 md:col-span-6 col-span-12">
        <label htmlFor="org-website" className="form-label">
          Website
        </label>
        <input
          type="url"
          className="form-control !rounded-md"
          id="org-website"
          placeholder="https://example.com"
          value={formData.organisationWebsite}
          onChange={(e) => onFieldChange('organisationWebsite', e.target.value)}
        />
      </div>
      <div className="xl:col-span-4 md:col-span-6 col-span-12">
        <label htmlFor="org-email" className="form-label">
          Email
        </label>
        <input
          type="email"
          className="form-control !rounded-md"
          id="org-email"
          placeholder="hr@example.com"
          value={formData.organisationEmail}
          onChange={(e) => onFieldChange('organisationEmail', e.target.value)}
        />
      </div>
      <div className="xl:col-span-4 md:col-span-6 col-span-12">
        <label htmlFor="org-phone" className="form-label">
          Phone
        </label>
        <div className="flex gap-2 w-full">
          <PhoneCountrySelect
            name="organisationCountryCode"
            value={formData.organisationCountryCode}
            onChange={(code) => onFieldChange('organisationCountryCode', code)}
            className="!w-44 shrink-0"
          />
          <input
            type="tel"
            className="form-control flex-1 min-w-0 !rounded-md"
            id="org-phone"
            placeholder={getPhoneCountry(formData.organisationCountryCode).placeholder}
            value={formData.organisationPhone}
            onChange={(e) =>
              onFieldChange(
                'organisationPhone',
                e.target.value
                  .replace(/\D/g, '')
                  .slice(0, getPhoneCountry(formData.organisationCountryCode).maxLength),
              )
            }
            maxLength={getPhoneCountry(formData.organisationCountryCode).maxLength}
            inputMode="numeric"
            {...fieldErrorProps('org-phone', fieldErrors)}
          />
        </div>
        <FieldInlineError fieldId="org-phone" fieldErrors={fieldErrors} />
      </div>
      <div className="xl:col-span-12 col-span-12">
        <label htmlFor="org-address" className="form-label">
          Address
        </label>
        <input
          type="text"
          className="form-control !rounded-md"
          id="org-address"
          placeholder="123 Main St, City, State"
          value={formData.organisationAddress}
          onChange={(e) => onFieldChange('organisationAddress', e.target.value)}
        />
      </div>
      <div className="xl:col-span-4 md:col-span-6 col-span-12 flex flex-col">
        <label htmlFor="org-industry" className="form-label">
          Industry
        </label>
        <input
          type="text"
          className="form-control !rounded-md"
          id="org-industry"
          placeholder="e.g., Software, FinTech, Healthcare"
          value={formData.organisationIndustry}
          onChange={(e) => onFieldChange('organisationIndustry', e.target.value)}
          maxLength={120}
        />
      </div>
      <div className="xl:col-span-4 md:col-span-6 col-span-12 flex flex-col">
        <label htmlFor="org-founded" className="form-label">
          Founded
        </label>
        <input
          type="number"
          inputMode="numeric"
          className="form-control !rounded-md"
          id="org-founded"
          placeholder="e.g., 2014"
          min={1800}
          max={new Date().getFullYear()}
          step={1}
          value={formData.organisationFounded}
          onChange={(e) => onFieldChange('organisationFounded', e.target.value.replace(/\D/g, '').slice(0, 4))}
          {...fieldErrorProps('org-founded', fieldErrors)}
        />
        <FieldInlineError fieldId="org-founded" fieldErrors={fieldErrors} />
      </div>
      <div className="xl:col-span-4 md:col-span-6 col-span-12 flex flex-col">
        <label htmlFor="org-company-size" className="form-label">
          Company Size
        </label>
        <select
          id="org-company-size"
          className="form-select w-full !rounded-md"
          value={formData.organisationCompanySize}
          onChange={(e) => onFieldChange('organisationCompanySize', e.target.value)}
        >
          <option value="">Select size</option>
          {COMPANY_SIZE_BUCKETS.map((b) => (
            <option key={b} value={b}>
              {b} employees
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
