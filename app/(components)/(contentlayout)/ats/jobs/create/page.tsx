"use client"
import Pageheader from '@/shared/layout-components/page-header/pageheader'
import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment, useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import Swal from 'sweetalert2'
import TiptapEditor from '@/shared/data/forms/form-editors/tiptapeditor'
import { createJob, getJobTemplate, listJobTemplates, type CreateJobPayload } from '@/shared/lib/api/jobs'
import { ROUTES } from '@/shared/lib/constants'
import { normalizeTipTapHtmlFromApi } from '@/shared/lib/tiptapHtml'
import { getPhoneCountry, getPhoneValidationError, formatPhoneForApi } from '@/shared/lib/phoneCountries'
import { PhoneCountrySelect } from '@/shared/components/PhoneCountrySelect'
const Select = dynamic(() => import("react-select"), { ssr: false })
import CreatableSelect from 'react-select/creatable'

const CreateJob = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const templateQueryHandled = useRef<string | null>(null)
  const [activeTab, setActiveTab] = useState('general')
  const [jobDescription, setJobDescription] = useState('')
  const [requirements, setRequirements] = useState('')
  const [submitting, setSubmitting] = useState(false)
  
  // Form state
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
    status: { value: 'Active', label: 'Active' },
    skills: [] as { value: string; label: string }[],
    minExperience: '',
    maxExperience: '',
    education: '',
  })

  // Job type options - must match backend enum
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

  // Skills input handling
  const components = {
    DropdownIndicator: null,
  }

  const createOption = (label: string) => ({
    label,
    value: label,
  })

  const [skillsInputValue, setSkillsInputValue] = useState('')
  const [templates, setTemplates] = useState<{ _id: string; title: string }[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)

  useEffect(() => {
    listJobTemplates({ limit: 100 })
      .then((res) => setTemplates(res.results ?? []))
      .catch(() => setTemplates([]))
  }, [])

  /** Prefill from Settings → My jobs template → “Create job” link (?templateId=) */
  useEffect(() => {
    const tid = searchParams.get('templateId')
    if (!tid || templateQueryHandled.current === tid) return
    templateQueryHandled.current = tid
    setTemplatesLoading(true)
    getJobTemplate(tid)
      .then((t) => {
        setJobDescription(normalizeTipTapHtmlFromApi(t.jobDescription))
        setFormData((prev) => ({
          ...prev,
          jobTitle: prev.jobTitle.trim() ? prev.jobTitle : (t.title || ''),
        }))
      })
      .catch(() => {
        templateQueryHandled.current = null
      })
      .finally(() => setTemplatesLoading(false))
  }, [searchParams])

  const handleLoadTemplate = (templateId: string) => {
    if (!templateId) return
    setTemplatesLoading(true)
    getJobTemplate(templateId)
      .then((t) => {
        setJobDescription(normalizeTipTapHtmlFromApi(t.jobDescription))
        setFormData((prev) => ({ ...prev, jobTitle: prev.jobTitle || t.title || '' }))
      })
      .catch(() => {})
      .finally(() => setTemplatesLoading(false))
  }

  const handleSkillsKeyDown = (event: any) => {
    if (!skillsInputValue) return
    switch (event.key) {
      case 'Enter':
      case 'Tab':
        setFormData((prev) => ({
          ...prev,
          skills: [...prev.skills, createOption(skillsInputValue)],
        }))
        setSkillsInputValue('')
        event.preventDefault()
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.jobTitle?.trim() || !formData.organisationName?.trim() || !formData.location?.trim() || !formData.jobType?.value || !jobDescription?.trim()) {
      Swal.fire({ icon: 'error', title: 'Validation', text: 'Please fill in required fields: Job Title, Organisation Name, Location, Job Type, and Job Description.' })
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
      let finalDescription = jobDescription.trim()
      const reqParts: string[] = []
      if (formData.education?.trim()) reqParts.push(`<p><strong>Education:</strong> ${formData.education.trim()}</p>`)
      if (formData.minExperience || formData.maxExperience) {
        const min = formData.minExperience ? `${formData.minExperience}` : ''
        const max = formData.maxExperience ? `${formData.maxExperience}` : ''
        const range = min && max ? `${min}-${max} years` : min ? `${min}+ years` : `Up to ${max} years`
        reqParts.push(`<p><strong>Experience:</strong> ${range}</p>`)
      }
      if (requirements?.trim()) reqParts.push(requirements.trim())
      if (reqParts.length > 0) {
        finalDescription += '\n\n<h3>Requirements & Qualifications</h3>\n' + reqParts.join('\n')
      }

      const payload: CreateJobPayload = {
        title: formData.jobTitle.trim(),
        organisation: {
          name: formData.organisationName.trim(),
          website: formData.organisationWebsite?.trim() || undefined,
          email: formData.organisationEmail?.trim() || undefined,
          phone: orgPhoneDigits ? formatPhoneForApi(orgPhoneDigits, formData.organisationCountryCode) : undefined,
          address: formData.organisationAddress?.trim() || undefined,
        },
        jobDescription: finalDescription,
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
      await createJob(payload)
      await Swal.fire({ icon: 'success', title: 'Job Created', text: 'The job has been created successfully.' })
      router.push('/ats/jobs')
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: err?.response?.data?.message || err?.message || 'Failed to create job.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Fragment>
      <Seo title={"Create Job"} />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="xl:col-span-12 col-span-12">
          <div className="box custom-box">
            <div className="box-header">
              <div className="box-title">
                Create New Job
              </div>
              <div>
                <Link
                  href="/ats/jobs"
                  className="ti-btn ti-btn-secondary !py-1 !px-2 !text-[0.75rem]"
                >
                  <i className="ri-arrow-left-line font-semibold align-middle me-1"></i>Back to Jobs
                </Link>
              </div>
            </div>
            <div className="box-body">
              {/* Tabs Navigation */}
              <div className="border-b border-gray-200 dark:border-defaultborder/10 mb-6">
                <nav className="flex space-x-2 rtl:space-x-reverse" aria-label="Tabs" role="tablist">
                  <button
                    type="button"
                    onClick={() => setActiveTab('general')}
                    className={`hs-tab-active:bg-primary/10 hs-tab-active:text-primary hs-tab-active:border-primary -mb-px py-2 px-4 inline-flex items-center gap-2 text-sm font-medium text-center border-b-2 transition-colors ${
                      activeTab === 'general'
                        ? 'bg-primary/10 text-primary border-primary'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 border-transparent'
                    }`}
                    id="general-tab"
                    aria-controls="general-panel"
                  >
                    <i className="ri-file-text-line"></i>
                    General
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('requirements')}
                    className={`hs-tab-active:bg-primary/10 hs-tab-active:text-primary hs-tab-active:border-primary -mb-px py-2 px-4 inline-flex items-center gap-2 text-sm font-medium text-center border-b-2 transition-colors ${
                      activeTab === 'requirements'
                        ? 'bg-primary/10 text-primary border-primary'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 border-transparent'
                    }`}
                    id="requirements-tab"
                    aria-controls="requirements-panel"
                  >
                    <i className="ri-checkbox-line"></i>
                    Requirements
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('settings')}
                    className={`hs-tab-active:bg-primary/10 hs-tab-active:text-primary hs-tab-active:border-primary -mb-px py-2 px-4 inline-flex items-center gap-2 text-sm font-medium text-center border-b-2 transition-colors ${
                      activeTab === 'settings'
                        ? 'bg-primary/10 text-primary border-primary'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 border-transparent'
                    }`}
                    id="settings-tab"
                    aria-controls="settings-panel"
                  >
                    <i className="ri-settings-3-line"></i>
                    Settings
                  </button>
                </nav>
              </div>

              {/* Tab Panels */}
              <form onSubmit={handleSubmit}>
                {/* General Tab */}
                {activeTab === 'general' && (
                  <div id="general-panel" role="tabpanel" aria-labelledby="general-tab">
                    <div className="grid grid-cols-12 gap-4">
                      {/* Job Title */}
                      <div className="xl:col-span-6 col-span-12">
                        <label htmlFor="job-title" className="form-label">
                          Job Title <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          id="job-title"
                          placeholder="e.g., Senior Software Engineer"
                          value={formData.jobTitle}
                          onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                          required
                        />
                      </div>

                      {/* Organisation Name */}
                      <div className="xl:col-span-6 col-span-12">
                        <label htmlFor="organisation-name" className="form-label">
                          Organisation / Company Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          id="organisation-name"
                          placeholder="e.g., Acme Corp"
                          value={formData.organisationName}
                          onChange={(e) => handleInputChange('organisationName', e.target.value)}
                          required
                        />
                      </div>

                      {/* Organisation optional fields */}
                      <div className="xl:col-span-4 col-span-12">
                        <label htmlFor="org-website" className="form-label">Organisation Website</label>
                        <input
                          type="url"
                          className="form-control"
                          id="org-website"
                          placeholder="https://example.com"
                          value={formData.organisationWebsite}
                          onChange={(e) => handleInputChange('organisationWebsite', e.target.value)}
                        />
                      </div>
                      <div className="xl:col-span-4 col-span-12">
                        <label htmlFor="org-email" className="form-label">Organisation Email</label>
                        <input
                          type="email"
                          className="form-control"
                          id="org-email"
                          placeholder="hr@example.com"
                          value={formData.organisationEmail}
                          onChange={(e) => handleInputChange('organisationEmail', e.target.value)}
                        />
                      </div>
                      <div className="xl:col-span-4 col-span-12">
                        <label htmlFor="org-phone" className="form-label">Organisation Phone</label>
                        <div className="flex gap-2">
                          <PhoneCountrySelect
                            name="organisationCountryCode"
                            value={formData.organisationCountryCode}
                            onChange={(code) => handleInputChange('organisationCountryCode', code)}
                          />
                          <input
                            type="tel"
                            className="form-control flex-1"
                            id="org-phone"
                            placeholder={getPhoneCountry(formData.organisationCountryCode).placeholder}
                            value={formData.organisationPhone}
                            onChange={(e) =>
                              handleInputChange(
                                'organisationPhone',
                                e.target.value.replace(/\D/g, '').slice(0, getPhoneCountry(formData.organisationCountryCode).maxLength)
                              )
                            }
                            maxLength={getPhoneCountry(formData.organisationCountryCode).maxLength}
                            inputMode="numeric"
                          />
                        </div>
                      </div>
                      <div className="xl:col-span-12 col-span-12">
                        <label htmlFor="org-address" className="form-label">Organisation Address</label>
                        <input
                          type="text"
                          className="form-control"
                          id="org-address"
                          placeholder="123 Main St, City, State"
                          value={formData.organisationAddress}
                          onChange={(e) => handleInputChange('organisationAddress', e.target.value)}
                        />
                      </div>

                      {/* Load from template */}
                      <div className="xl:col-span-12 col-span-12">
                        <label className="form-label">Load from template</label>
                        {templates.length > 0 ? (
                          <select
                            className="form-control !w-auto"
                            defaultValue=""
                            onChange={(e) => handleLoadTemplate(e.target.value)}
                            disabled={templatesLoading}
                          >
                            <option value="">-- Select template --</option>
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
                          <p className="text-sm text-muted mb-0">
                            No saved templates yet.{` `}
                            <Link href={ROUTES.settingsJobTemplates} className="text-primary underline">
                              Add templates in Settings
                            </Link>
                          </p>
                        )}
                        {templatesLoading && <span className="text-xs text-muted ms-2">Loading...</span>}
                        {templates.length > 0 ? (
                          <p className="text-xs text-muted mt-1 mb-0">
                            <Link href={ROUTES.settingsJobTemplates} className="text-primary underline">
                              Manage templates in Settings
                            </Link>
                          </p>
                        ) : null}
                      </div>

                      {/* Job Description */}
                      <div className="xl:col-span-12 col-span-12">
                        <label className="form-label">
                          Job Description <span className="text-danger">*</span>
                        </label>
                        <div className="border border-gray-200 dark:border-defaultborder/10 rounded-md">
                          <TiptapEditor
                            content={jobDescription}
                            placeholder="Enter detailed job description..."
                            onChange={(html) => setJobDescription(html)}
                          />
                        </div>
                        <p className="text-muted text-xs mt-2">
                          Provide a comprehensive description of the role, responsibilities, and what makes this opportunity unique.
                        </p>
                      </div>

                      {/* Salary Range */}
                      <div className="xl:col-span-6 col-span-12">
                        <label htmlFor="salary-min" className="form-label">
                          Minimum Salary
                        </label>
                        <div className="input-group">
                          <span className="input-group-text text-muted">$</span>
                          <input
                            type="number"
                            className="form-control"
                            id="salary-min"
                            placeholder="50000"
                            value={formData.salaryMin}
                            onChange={(e) => handleInputChange('salaryMin', e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="xl:col-span-6 col-span-12">
                        <label htmlFor="salary-max" className="form-label">
                          Maximum Salary
                        </label>
                        <div className="input-group">
                          <span className="input-group-text text-muted">$</span>
                          <input
                            type="number"
                            className="form-control"
                            id="salary-max"
                            placeholder="100000"
                            value={formData.salaryMax}
                            onChange={(e) => handleInputChange('salaryMax', e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Location */}
                      <div className="xl:col-span-6 col-span-12">
                        <label htmlFor="location" className="form-label">
                          Location <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          id="location"
                          placeholder="e.g., San Francisco, CA or Remote"
                          value={formData.location}
                          onChange={(e) => handleInputChange('location', e.target.value)}
                          required
                        />
                      </div>

                      {/* Job Type */}
                      <div className="xl:col-span-4 col-span-12">
                        <label className="form-label">
                          Job Type <span className="text-danger">*</span>
                        </label>
                        <Select
                          name="jobType"
                          options={jobTypeOptions}
                          className="ti-form-select !p-0 !rounded-s-none"
                          classNamePrefix="Select2"
                          placeholder="Select job type"
                          value={formData.jobType}
                          onChange={(selected: any) => handleInputChange('jobType', selected)}
                          menuPlacement="auto"
                        />
                      </div>

                      {/* Skills */}
                      <div className="xl:col-span-12 col-span-12">
                        <label className="form-label">
                          Skills
                        </label>
                        <CreatableSelect
                          components={components}
                          classNamePrefix="react-select"
                          inputValue={skillsInputValue}
                          isClearable
                          isMulti
                          menuIsOpen={false}
                          onChange={(newValue: any) => {
                            if (Array.isArray(newValue)) {
                              handleInputChange('skills', newValue)
                            } else {
                              handleInputChange('skills', [])
                            }
                          }}
                          onInputChange={(newValue: string) => setSkillsInputValue(newValue)}
                          onKeyDown={handleSkillsKeyDown}
                          placeholder="Type a skill and press Enter to add..."
                          value={formData.skills}
                          className="ti-form-select"
                        />
                        <p className="text-muted text-xs mt-2">
                          Add relevant skills required for this position. Press Enter after typing each skill.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Requirements Tab */}
                {activeTab === 'requirements' && (
                  <div id="requirements-panel" role="tabpanel" aria-labelledby="requirements-tab">
                    <div className="grid grid-cols-12 gap-4">
                      {/* Experience Level */}
                      <div className="xl:col-span-6 col-span-12">
                        <label className="form-label">Experience Level</label>
                        <Select
                          options={experienceLevelOptions}
                          className="ti-form-select !p-0 !rounded-s-none"
                          classNamePrefix="Select2"
                          placeholder="Select experience level"
                          value={formData.experienceLevel}
                          onChange={(selected: any) => handleInputChange('experienceLevel', selected)}
                          menuPlacement="auto"
                          isClearable
                        />
                        <p className="text-muted text-xs mt-1">Expected experience tier for this role</p>
                      </div>

                      {/* Years of Experience */}
                      <div className="xl:col-span-3 col-span-12">
                        <label htmlFor="min-experience" className="form-label">Min. Years Experience</label>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          className="form-control"
                          id="min-experience"
                          placeholder="0"
                          value={formData.minExperience}
                          onChange={(e) => handleInputChange('minExperience', e.target.value)}
                        />
                      </div>
                      <div className="xl:col-span-3 col-span-12">
                        <label htmlFor="max-experience" className="form-label">Max. Years Experience</label>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          className="form-control"
                          id="max-experience"
                          placeholder="5"
                          value={formData.maxExperience}
                          onChange={(e) => handleInputChange('maxExperience', e.target.value)}
                        />
                      </div>

                      {/* Education */}
                      <div className="xl:col-span-12 col-span-12">
                        <label htmlFor="education" className="form-label">Education Requirements</label>
                        <input
                          type="text"
                          className="form-control"
                          id="education"
                          placeholder="e.g., Bachelor's degree in Computer Science or equivalent"
                          value={formData.education}
                          onChange={(e) => handleInputChange('education', e.target.value)}
                        />
                      </div>

                      {/* Requirements & Qualifications (Rich Text) */}
                      <div className="xl:col-span-12 col-span-12">
                        <label className="form-label">Requirements & Qualifications</label>
                        <div className="border border-gray-200 dark:border-defaultborder/10 rounded-md">
                          <TiptapEditor
                            content={requirements}
                            placeholder="List key requirements, must-have skills, certifications, and qualifications..."
                            onChange={(html) => setRequirements(html)}
                          />
                        </div>
                        <p className="text-muted text-xs mt-2">
                          Detailed requirements will be appended to the job description. Include bullet points for clarity.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Settings Tab */}
                {activeTab === 'settings' && (
                  <div id="settings-panel" role="tabpanel" aria-labelledby="settings-tab">
                    <div className="grid grid-cols-12 gap-4">
                      <div className="xl:col-span-6 col-span-12">
                        <label className="form-label">Job Status</label>
                        <Select
                          options={statusOptions}
                          className="ti-form-select !p-0 !rounded-s-none"
                          classNamePrefix="Select2"
                          value={formData.status}
                          onChange={(selected: any) => handleInputChange('status', selected || { value: 'Active', label: 'Active' })}
                          menuPlacement="auto"
                        />
                        <p className="text-muted text-xs mt-1">
                          Draft: not visible to candidates. Active: published and accepting applications. Closed: no longer hiring.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Form Actions */}
                <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-defaultborder/10">
                  <Link
                    href="/ats/jobs"
                    className="ti-btn ti-btn-secondary"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    className="ti-btn ti-btn-primary"
                    disabled={submitting}
                  >
                    <i className="ri-save-line font-semibold align-middle me-1"></i>
                    {submitting ? 'Creating...' : 'Create Job'}
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

export default CreateJob

