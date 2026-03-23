"use client"

import React, { Fragment, useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import Swal from 'sweetalert2'
import Seo from '@/shared/layout-components/seo/seo'
import TiptapEditor from '@/shared/data/forms/form-editors/tiptapeditor'
import { getJobById, updateJob, type UpdateJobPayload } from '@/shared/lib/api/jobs'
import { PHONE_COUNTRIES, getPhoneCountry, getPhoneValidationError, formatPhoneForApi } from '@/shared/lib/phoneCountries'
import { PhoneCountrySelect } from '@/shared/components/PhoneCountrySelect'
const Select = dynamic(() => import('react-select'), { ssr: false })
import CreatableSelect from 'react-select/creatable'

const jobTypeOptions = [
  { value: 'Full-time', label: 'Full Time' },
  { value: 'Part-time', label: 'Part Time' },
  { value: 'Contract', label: 'Contract' },
  { value: 'Temporary', label: 'Temporary' },
  { value: 'Internship', label: 'Internship' },
  { value: 'Freelance', label: 'Freelance' },
]

const experienceLevelOptions = [
  { value: 'Entry Level', label: 'Entry Level' },
  { value: 'Mid Level', label: 'Mid Level' },
  { value: 'Senior Level', label: 'Senior Level' },
  { value: 'Executive', label: 'Executive' },
]

const statusOptions = [
  { value: 'Draft', label: 'Draft' },
  { value: 'Active', label: 'Active' },
  { value: 'Closed', label: 'Closed' },
  { value: 'Archived', label: 'Archived' },
]

const dialCodeOptions = PHONE_COUNTRIES.map((country) => ({
  code: country.code,
  dialDigits: country.dialCode.replace('+', ''),
})).sort((a, b) => b.dialDigits.length - a.dialDigits.length)

function parseOrganisationPhone(phone: string) {
  const raw = (phone || '').trim()
  if (!raw) return { countryCode: 'IN', digits: '' }
  const onlyDigits = raw.replace(/\D/g, '')
  if (!onlyDigits) return { countryCode: 'IN', digits: '' }
  for (const option of dialCodeOptions) {
    if (onlyDigits.startsWith(option.dialDigits) && onlyDigits.length > option.dialDigits.length) {
      return {
        countryCode: option.code,
        digits: onlyDigits.slice(option.dialDigits.length),
      }
    }
  }
  return { countryCode: 'IN', digits: onlyDigits }
}

export default function EditJobClient() {
  const router = useRouter()
  const params = useParams()
  const jobId = params?.id as string
  const [activeTab, setActiveTab] = useState('general')
  const [jobDescription, setJobDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    jobTitle: '',
    organisationName: '',
    organisationWebsite: '',
    organisationEmail: '',
    organisationCountryCode: 'IN',
    organisationPhone: '',
    organisationAddress: '',
    salaryMin: '',
    salaryMax: '',
    salaryCurrency: 'USD',
    location: '',
    jobType: null as { value: string; label: string } | null,
    experienceLevel: null as { value: string; label: string } | null,
    status: { value: 'Active', label: 'Active' } as { value: string; label: string },
    skills: [] as { value: string; label: string }[],
  })
  const [skillsInputValue, setSkillsInputValue] = useState('')
  const components = { DropdownIndicator: null }
  const createOption = (label: string) => ({ label, value: label })

  useEffect(() => {
    if (!jobId || jobId === '_') return
    getJobById(jobId)
      .then((job) => {
        if (job.jobOrigin === 'external') {
          Swal.fire({
            icon: 'info',
            title: 'External job',
            text: 'External jobs are managed from External jobs. They cannot be edited here.',
          })
          router.replace('/ats/jobs')
          return
        }
        const parsedPhone = parseOrganisationPhone(job.organisation?.phone || '')
        setFormData({
          jobTitle: job.title || '',
          organisationName: job.organisation?.name || '',
          organisationWebsite: job.organisation?.website || '',
          organisationEmail: job.organisation?.email || '',
          organisationCountryCode: parsedPhone.countryCode,
          organisationPhone: parsedPhone.digits,
          organisationAddress: job.organisation?.address || '',
          salaryMin: job.salaryRange?.min ? String(job.salaryRange.min) : '',
          salaryMax: job.salaryRange?.max ? String(job.salaryRange.max) : '',
          salaryCurrency: job.salaryRange?.currency || 'USD',
          location: job.location || '',
          jobType: job.jobType ? jobTypeOptions.find((o) => o.value === job.jobType) || { value: job.jobType, label: job.jobType } : null,
          experienceLevel: job.experienceLevel ? experienceLevelOptions.find((o) => o.value === job.experienceLevel) || { value: job.experienceLevel, label: job.experienceLevel } : null,
          status: statusOptions.find((o) => o.value === job.status) || { value: 'Active', label: 'Active' },
          skills: (job.skillTags || []).map((s: string) => ({ value: s, label: s })),
        })
        setJobDescription(job.jobDescription || '')
      })
      .catch(() => {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Job not found.' })
        router.push('/ats/jobs')
      })
      .finally(() => setLoading(false))
  }, [jobId, router])

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSkillsKeyDown = (event: any) => {
    if (!skillsInputValue) return
    if (event.key === 'Enter' || event.key === 'Tab') {
      setFormData((prev) => ({
        ...prev,
        skills: [...prev.skills, createOption(skillsInputValue)],
      }))
      setSkillsInputValue('')
      event.preventDefault()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!jobId || jobId === '_' || !formData.jobTitle?.trim() || !formData.organisationName?.trim() || !formData.location?.trim() || !formData.jobType?.value || !jobDescription?.trim()) {
      Swal.fire({ icon: 'error', title: 'Validation', text: 'Please fill in required fields.' })
      return
    }
    const orgPhoneDigits = (formData.organisationPhone || '').replace(/\D/g, '')
    if (orgPhoneDigits) {
      const phoneError = getPhoneValidationError(orgPhoneDigits, formData.organisationCountryCode)
      if (phoneError) {
        Swal.fire({ icon: 'error', title: 'Validation', text: phoneError })
        return
      }
    }
    setSubmitting(true)
    try {
      const payload: UpdateJobPayload = {
        title: formData.jobTitle.trim(),
        organisation: {
          name: formData.organisationName.trim(),
          website: formData.organisationWebsite?.trim() || undefined,
          email: formData.organisationEmail?.trim() || undefined,
          phone: orgPhoneDigits ? formatPhoneForApi(orgPhoneDigits, formData.organisationCountryCode) : undefined,
          address: formData.organisationAddress?.trim() || undefined,
        },
        jobDescription: jobDescription.trim(),
        jobType: formData.jobType.value,
        location: formData.location.trim(),
        skillTags: formData.skills?.map((s) => s.value || s.label) || [],
        salaryRange: {
          min: formData.salaryMin ? Number(formData.salaryMin) : undefined,
          max: formData.salaryMax ? Number(formData.salaryMax) : undefined,
          currency: formData.salaryCurrency || 'USD',
        },
        experienceLevel: formData.experienceLevel?.value || undefined,
        status: formData.status?.value || 'Active',
      }
      await updateJob(jobId, payload)
      await Swal.fire({ icon: 'success', title: 'Job Updated', text: 'The job has been updated successfully.' })
      router.push('/ats/jobs')
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: err?.response?.data?.message || err?.message || 'Failed to update job.' })
    } finally {
      setSubmitting(false)
    }
  }

  if (jobId === '_') {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <Fragment>
      <Seo title="Edit Job" />
      <div className="grid grid-cols-12 gap-6">
        <div className="xl:col-span-12 col-span-12">
          <div className="box custom-box">
            <div className="box-header">
              <div className="box-title">Edit Job</div>
              <Link href="/ats/jobs" className="ti-btn ti-btn-secondary !py-1 !px-2 !text-[0.75rem]">
                <i className="ri-arrow-left-line font-semibold align-middle me-1"></i>Back to Jobs
              </Link>
            </div>
            <div className="box-body">
              <div className="border-b border-gray-200 dark:border-defaultborder/10 mb-6">
                <nav className="flex space-x-2 rtl:space-x-reverse" role="tablist">
                  <button
                    type="button"
                    onClick={() => setActiveTab('general')}
                    className={`-mb-px py-2 px-4 text-sm font-medium border-b-2 ${
                      activeTab === 'general' ? 'bg-primary/10 text-primary border-primary' : 'text-gray-500 border-transparent'
                    }`}
                  >
                    <i className="ri-file-text-line me-1"></i>General
                  </button>
                </nav>
              </div>
              <form onSubmit={handleSubmit}>
                {activeTab === 'general' && (
                  <div className="grid grid-cols-12 gap-4">
                    <div className="xl:col-span-6 col-span-12">
                      <label className="form-label">
                        Job Title <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.jobTitle}
                        onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                        required
                      />
                    </div>
                    <div className="xl:col-span-6 col-span-12">
                      <label className="form-label">
                        Organisation Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.organisationName}
                        onChange={(e) => handleInputChange('organisationName', e.target.value)}
                        required
                      />
                    </div>
                    <div className="xl:col-span-4 col-span-12">
                      <label className="form-label">Organisation Website</label>
                      <input
                        type="url"
                        className="form-control"
                        value={formData.organisationWebsite}
                        onChange={(e) => handleInputChange('organisationWebsite', e.target.value)}
                      />
                    </div>
                    <div className="xl:col-span-4 col-span-12">
                      <label className="form-label">Organisation Email</label>
                      <input
                        type="email"
                        className="form-control"
                        value={formData.organisationEmail}
                        onChange={(e) => handleInputChange('organisationEmail', e.target.value)}
                      />
                    </div>
                    <div className="xl:col-span-4 col-span-12">
                      <label className="form-label">Organisation Phone</label>
                      <div className="flex gap-2">
                        <PhoneCountrySelect
                          name="organisationCountryCode"
                          value={formData.organisationCountryCode}
                          onChange={(code) => handleInputChange('organisationCountryCode', code)}
                        />
                        <input
                          type="tel"
                          className="form-control flex-1"
                          value={formData.organisationPhone}
                          placeholder={getPhoneCountry(formData.organisationCountryCode).placeholder}
                          onChange={(e) =>
                            handleInputChange(
                              'organisationPhone',
                              e.target.value.replace(/\D/g, '').slice(0, getPhoneCountry(formData.organisationCountryCode).maxLength),
                            )
                          }
                          maxLength={getPhoneCountry(formData.organisationCountryCode).maxLength}
                          inputMode="numeric"
                        />
                      </div>
                    </div>
                    <div className="xl:col-span-12 col-span-12">
                      <label className="form-label">Organisation Address</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.organisationAddress}
                        onChange={(e) => handleInputChange('organisationAddress', e.target.value)}
                      />
                    </div>
                    <div className="xl:col-span-12 col-span-12">
                      <label className="form-label">
                        Job Description <span className="text-danger">*</span>
                      </label>
                      <div className="border border-gray-200 dark:border-defaultborder/10 rounded-md">
                        <TiptapEditor content={jobDescription} placeholder="Job description..." onChange={(html) => setJobDescription(html)} />
                      </div>
                    </div>
                    <div className="xl:col-span-6 col-span-12">
                      <label className="form-label">Min Salary</label>
                      <div className="input-group">
                        <span className="input-group-text">$</span>
                        <input
                          type="number"
                          className="form-control"
                          value={formData.salaryMin}
                          onChange={(e) => handleInputChange('salaryMin', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="xl:col-span-6 col-span-12">
                      <label className="form-label">Max Salary</label>
                      <div className="input-group">
                        <span className="input-group-text">$</span>
                        <input
                          type="number"
                          className="form-control"
                          value={formData.salaryMax}
                          onChange={(e) => handleInputChange('salaryMax', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="xl:col-span-6 col-span-12">
                      <label className="form-label">
                        Location <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.location}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                        required
                      />
                    </div>
                    <div className="xl:col-span-4 col-span-12">
                      <label className="form-label">
                        Job Type <span className="text-danger">*</span>
                      </label>
                      <Select
                        options={jobTypeOptions}
                        value={formData.jobType}
                        onChange={(s: any) => handleInputChange('jobType', s)}
                        placeholder="Select"
                        classNamePrefix="Select2"
                        className="ti-form-select !p-0"
                      />
                    </div>
                    <div className="xl:col-span-4 col-span-12">
                      <label className="form-label">Experience Level</label>
                      <Select
                        options={experienceLevelOptions}
                        value={formData.experienceLevel}
                        onChange={(s: any) => handleInputChange('experienceLevel', s)}
                        isClearable
                        placeholder="Select"
                        classNamePrefix="Select2"
                        className="ti-form-select !p-0"
                      />
                    </div>
                    <div className="xl:col-span-4 col-span-12">
                      <label className="form-label">Status</label>
                      <Select
                        options={statusOptions}
                        value={formData.status}
                        onChange={(s: any) => handleInputChange('status', s || { value: 'Active', label: 'Active' })}
                        classNamePrefix="Select2"
                        className="ti-form-select !p-0"
                      />
                    </div>
                    <div className="xl:col-span-12 col-span-12">
                      <label className="form-label">Skills</label>
                      <CreatableSelect
                        components={components}
                        classNamePrefix="react-select"
                        inputValue={skillsInputValue}
                        isClearable
                        isMulti
                        menuIsOpen={false}
                        onChange={(v: any) => handleInputChange('skills', Array.isArray(v) ? v : [])}
                        onInputChange={setSkillsInputValue}
                        onKeyDown={handleSkillsKeyDown}
                        placeholder="Type skill and press Enter"
                        value={formData.skills}
                        className="ti-form-select"
                      />
                    </div>
                  </div>
                )}
                <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-defaultborder/10">
                  <Link href="/ats/jobs" className="ti-btn ti-btn-secondary">
                    Cancel
                  </Link>
                  <button type="submit" className="ti-btn ti-btn-primary" disabled={submitting}>
                    <i className="ri-save-line font-semibold align-middle me-1"></i>
                    {submitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  )
}
