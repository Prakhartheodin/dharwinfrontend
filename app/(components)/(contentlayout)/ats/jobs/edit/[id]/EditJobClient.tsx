"use client"

import React, { Fragment, useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import Swal from 'sweetalert2'
import Seo from '@/shared/layout-components/seo/seo'
import TiptapEditor from '@/shared/data/forms/form-editors/tiptapeditor'
import {
  getJobById,
  updateJob,
  getJobTemplate,
  listJobTemplates,
  createJobTemplate,
  type UpdateJobPayload,
} from '@/shared/lib/api/jobs'
import { ROUTES } from '@/shared/lib/constants'
import { normalizeTipTapHtmlFromApi } from '@/shared/lib/tiptapHtml'
import { resolveTemplateVars, type TemplateVarContext } from '@/shared/lib/ats/templateVars'
import { PHONE_COUNTRIES, getPhoneCountry, getPhoneValidationError, formatPhoneForApi } from '@/shared/lib/phoneCountries'
import { PhoneCountrySelect } from '@/shared/components/PhoneCountrySelect'
// Both react-select entry points must follow the same SSR boundary —
// mixing a static import (CreatableSelect) with a dynamic ssr:false
// import (Select) created an inconsistent chunk graph that confused
// Turbopack's analyser and contributed to the production
// `[root-of-the-server]__<hash>.js` MODULE_NOT_FOUND issue.
const Select          = dynamic(() => import('react-select'),          { ssr: false })
const CreatableSelect = dynamic(() => import('react-select/creatable'), { ssr: false })

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
  const searchParams = useSearchParams()
  const templateQueryHandled = useRef<string | null>(null)
  const jobId = params?.id as string
  const [activeTab, setActiveTab] = useState('general')
  const [jobDescription, setJobDescription] = useState('')
  const [requirements, setRequirements] = useState('')
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
    minExperience: '',
    maxExperience: '',
    education: '',
  })
  const [skillsInputValue, setSkillsInputValue] = useState('')
  const [templates, setTemplates] = useState<{ _id: string; title: string }[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const components = { DropdownIndicator: null }
  const createOption = (label: string) => ({ label, value: label })

  useEffect(() => {
    listJobTemplates({ limit: 100 })
      .then((res) => setTemplates(res.results ?? []))
      .catch(() => setTemplates([]))
  }, [])

  const buildTemplateVarContext = (): TemplateVarContext => ({
    jobTitle: formData.jobTitle,
    company: formData.organisationName,
    location: formData.location,
    salaryMin: formData.salaryMin,
    salaryMax: formData.salaryMax,
    salaryCurrency: formData.salaryCurrency,
    jobType: formData.jobType?.label,
    experienceLevel: formData.experienceLevel?.label,
    education: formData.education,
  })

  const applyTemplateToForm = (t: Awaited<ReturnType<typeof getJobTemplate>>) => {
    const raw = normalizeTipTapHtmlFromApi(t.jobDescription)
    setJobDescription(resolveTemplateVars(raw, buildTemplateVarContext()))
    setFormData((prev) => {
      const next = { ...prev }
      if (!prev.jobTitle?.trim() && t.title) next.jobTitle = t.title
      if (!prev.location?.trim() && t.location) next.location = t.location
      if (!prev.jobType && t.jobType) {
        const opt = jobTypeOptions.find((o) => o.value === t.jobType)
        if (opt) next.jobType = opt
      }
      if (!prev.experienceLevel && t.experienceLevel) {
        const opt = experienceLevelOptions.find((o) => o.value === t.experienceLevel)
        if (opt) next.experienceLevel = opt
      }
      if (!prev.salaryMin && t.salaryRange?.min != null) next.salaryMin = String(t.salaryRange.min)
      if (!prev.salaryMax && t.salaryRange?.max != null) next.salaryMax = String(t.salaryRange.max)
      if (!prev.salaryCurrency && t.salaryRange?.currency) next.salaryCurrency = t.salaryRange.currency
      if ((!prev.skills || prev.skills.length === 0) && Array.isArray(t.skillTags) && t.skillTags.length > 0) {
        next.skills = t.skillTags.map((s) => createOption(s))
      }
      if (!prev.education?.trim() && t.education) next.education = t.education
      return next
    })
  }

  useEffect(() => {
    const tid = searchParams?.get('templateId')
    if (!tid || templateQueryHandled.current === tid) return
    templateQueryHandled.current = tid
    setTemplatesLoading(true)
    getJobTemplate(tid)
      .then((t) => applyTemplateToForm(t))
      .catch(() => {
        templateQueryHandled.current = null
      })
      .finally(() => setTemplatesLoading(false))
  }, [searchParams])

  const handleLoadTemplate = (templateId: string) => {
    if (!templateId) return
    Swal.fire({
      icon: 'warning',
      title: 'Overwrite description?',
      text: 'Loading a template replaces the current job description. Continue?',
      showCancelButton: true,
      confirmButtonText: 'Load template',
    }).then((res) => {
      if (!res.isConfirmed) return
      setTemplatesLoading(true)
      getJobTemplate(templateId)
        .then((t) => applyTemplateToForm(t))
        .catch(() => {})
        .finally(() => setTemplatesLoading(false))
    })
  }

  const [savingTemplate, setSavingTemplate] = useState(false)
  const handleSaveAsTemplate = async () => {
    const html = jobDescription.trim()
    if (!html) {
      Swal.fire({ icon: 'info', title: 'Nothing to save', text: 'Write a job description first.' })
      return
    }
    const { value: title, isConfirmed } = await Swal.fire({
      title: 'Save as template',
      input: 'text',
      inputLabel: 'Template name',
      inputValue: formData.jobTitle?.trim() || '',
      inputPlaceholder: 'e.g. Senior Backend Engineer',
      showCancelButton: true,
      confirmButtonText: 'Save',
      inputValidator: (v) => (!v?.trim() ? 'Name is required' : null),
    })
    if (!isConfirmed || !title) return
    try {
      setSavingTemplate(true)
      const minNum = formData.salaryMin ? Number(formData.salaryMin) : undefined
      const maxNum = formData.salaryMax ? Number(formData.salaryMax) : undefined
      const salaryRange =
        minNum != null || maxNum != null
          ? {
              ...(Number.isFinite(minNum) ? { min: minNum } : {}),
              ...(Number.isFinite(maxNum) ? { max: maxNum } : {}),
              currency: formData.salaryCurrency || 'USD',
            }
          : undefined
      const skillTags = (formData.skills ?? []).map((s) => s.value).filter(Boolean)

      await createJobTemplate({
        title: title.trim(),
        jobDescription: html,
        ...(formData.jobType?.value ? { jobType: formData.jobType.value as any } : {}),
        ...(formData.location?.trim() ? { location: formData.location.trim() } : {}),
        ...(skillTags.length ? { skillTags } : {}),
        ...(salaryRange ? { salaryRange } : {}),
        ...(formData.experienceLevel?.value ? { experienceLevel: formData.experienceLevel.value as any } : {}),
        ...(formData.education?.trim() ? { education: formData.education.trim() } : {}),
      })
      const refreshed = await listJobTemplates({ limit: 100 })
      setTemplates(refreshed.results ?? [])
      Swal.fire({ icon: 'success', title: 'Saved', text: `“${title.trim()}” saved to your templates.`, timer: 1800, showConfirmButton: false })
    } catch {
      Swal.fire({ icon: 'error', title: 'Save failed', text: 'Could not save template. Try again.' })
    } finally {
      setSavingTemplate(false)
    }
  }

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
          minExperience: '',
          maxExperience: '',
          education: '',
        })
        setJobDescription(job.jobDescription || '')
        setRequirements('')
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

      const payload: UpdateJobPayload = {
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
      await updateJob(jobId, payload)
      await Swal.fire({ icon: 'success', title: 'Job Updated', text: 'The job has been updated successfully.' })
      router.push('/ats/jobs')
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: err?.response?.data?.message || err?.message || 'Failed to update job.' })
    } finally {
      setSubmitting(false)
    }
  }

  if (jobId === '_' || loading) {
    return (
      <Fragment>
        <Seo title="Edit Job" />
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Fragment>
    )
  }

  const sectionLabel = "text-sm font-semibold text-defaulttextcolor dark:text-defaulttextcolor/90 mb-3 pb-2 border-b border-defaultborder dark:border-defaultborder/10"
  const tabBtn = (key: string, icon: string, text: string) => (
    <button
      type="button"
      onClick={() => setActiveTab(key)}
      className={`-mb-px py-2 px-4 inline-flex items-center gap-2 text-sm font-medium border-b-2 transition-colors ${
        activeTab === key
          ? 'bg-primary/10 text-primary border-primary'
          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 border-transparent'
      }`}
      role="tab"
      aria-selected={activeTab === key}
    >
      <i className={icon}></i>{text}
    </button>
  )

  return (
    <Fragment>
      <Seo title="Edit Job" />
      <div className="grid grid-cols-12 gap-6">
        <div className="xl:col-span-12 col-span-12">
          <div className="box custom-box">
            <div className="box-header flex justify-between items-center">
              <div className="box-title">Edit Job</div>
              <Link href="/ats/jobs" className="ti-btn ti-btn-secondary !py-1 !px-2 !text-[0.75rem]">
                <i className="ri-arrow-left-line font-semibold align-middle me-1"></i>Back to Jobs
              </Link>
            </div>
            <div className="box-body">
              <div className="border-b border-gray-200 dark:border-defaultborder/10 mb-6">
                <nav className="flex space-x-2 rtl:space-x-reverse" role="tablist">
                  {tabBtn('general', 'ri-file-text-line', 'General')}
                  {tabBtn('requirements', 'ri-checkbox-line', 'Requirements')}
                </nav>
              </div>
              <form onSubmit={handleSubmit}>
                  {activeTab === 'general' && (
                    <div className="space-y-5">
                      {/* Basics */}
                      <section>
                        <div className={sectionLabel}>Basics</div>
                        <div className="grid grid-cols-12 gap-3">
                          <div className="xl:col-span-6 col-span-12">
                            <label className="form-label">Job Title <span className="text-danger">*</span></label>
                            <input
                              type="text"
                              className="form-control !rounded-md"
                              placeholder="e.g., Senior Software Engineer"
                              value={formData.jobTitle}
                              onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                              required
                            />
                          </div>
                          <div className="xl:col-span-6 col-span-12">
                            <label className="form-label">Organisation Name <span className="text-danger">*</span></label>
                            <input
                              type="text"
                              className="form-control !rounded-md"
                              placeholder="e.g., Acme Corp"
                              value={formData.organisationName}
                              onChange={(e) => handleInputChange('organisationName', e.target.value)}
                              required
                            />
                          </div>
                          <div className="xl:col-span-4 col-span-12">
                            <label className="form-label">Location <span className="text-danger">*</span></label>
                            <input
                              type="text"
                              className="form-control !rounded-md"
                              placeholder="City, State or Remote"
                              value={formData.location}
                              onChange={(e) => handleInputChange('location', e.target.value)}
                              required
                            />
                          </div>
                          <div className="xl:col-span-3 col-span-12">
                            <label className="form-label">Job Type <span className="text-danger">*</span></label>
                            <Select
                              options={jobTypeOptions}
                              value={formData.jobType}
                              onChange={(s: any) => handleInputChange('jobType', s)}
                              placeholder="Select"
                              classNamePrefix="Select2"
                              className="ti-form-select !p-0"
                              menuPlacement="auto"
                            />
                          </div>
                          <div className="xl:col-span-3 col-span-12">
                            <label className="form-label">Experience Level</label>
                            <Select
                              options={experienceLevelOptions}
                              value={formData.experienceLevel}
                              onChange={(s: any) => handleInputChange('experienceLevel', s)}
                              isClearable
                              placeholder="Select"
                              classNamePrefix="Select2"
                              className="ti-form-select !p-0"
                              menuPlacement="auto"
                            />
                          </div>
                          <div className="xl:col-span-2 col-span-12">
                            <label className="form-label">Status</label>
                            <Select
                              options={statusOptions}
                              value={formData.status}
                              onChange={(s: any) => handleInputChange('status', s || { value: 'Active', label: 'Active' })}
                              classNamePrefix="Select2"
                              className="ti-form-select !p-0"
                              menuPlacement="auto"
                            />
                          </div>
                        </div>
                      </section>

                      {/* Organisation */}
                      <section>
                        <div className={sectionLabel}>Organisation</div>
                        <div className="grid grid-cols-12 gap-3">
                          <div className="xl:col-span-4 col-span-12">
                            <label className="form-label">Website</label>
                            <input
                              type="url"
                              className="form-control !rounded-md"
                              placeholder="https://example.com"
                              value={formData.organisationWebsite}
                              onChange={(e) => handleInputChange('organisationWebsite', e.target.value)}
                            />
                          </div>
                          <div className="xl:col-span-4 col-span-12">
                            <label className="form-label">Email</label>
                            <input
                              type="email"
                              className="form-control !rounded-md"
                              placeholder="hr@example.com"
                              value={formData.organisationEmail}
                              onChange={(e) => handleInputChange('organisationEmail', e.target.value)}
                            />
                          </div>
                          <div className="xl:col-span-4 col-span-12">
                            <label className="form-label">Phone</label>
                            <div className="flex gap-2">
                              <PhoneCountrySelect
                                name="organisationCountryCode"
                                value={formData.organisationCountryCode}
                                onChange={(code) => handleInputChange('organisationCountryCode', code)}
                              />
                              <input
                                type="tel"
                                className="form-control flex-1 !rounded-md"
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
                          <div className="col-span-12">
                            <label className="form-label">Address</label>
                            <input
                              type="text"
                              className="form-control !rounded-md"
                              placeholder="123 Main St, City, State"
                              value={formData.organisationAddress}
                              onChange={(e) => handleInputChange('organisationAddress', e.target.value)}
                            />
                          </div>
                        </div>
                      </section>

                      {/* Compensation */}
                      <section>
                        <div className={sectionLabel}>Compensation</div>
                        <div className="grid grid-cols-12 gap-3">
                          <div className="xl:col-span-6 col-span-12">
                            <label className="form-label">Min Salary</label>
                            <div className="input-group">
                              <span className="input-group-text">$</span>
                              <input
                                type="number"
                                className="form-control !rounded-e-md"
                                placeholder="50000"
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
                                className="form-control !rounded-e-md"
                                placeholder="100000"
                                value={formData.salaryMax}
                                onChange={(e) => handleInputChange('salaryMax', e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      </section>

                      {/* Description */}
                      <section>
                        <div className={`${sectionLabel}`}>
                          <span>Description</span>
                        </div>
                        <div className="grid grid-cols-12 gap-3">
                          <div className="col-span-12">
                            {/* Stacked layout: label, then template controls row (left-aligned), then editor. */}
                            <label className="form-label mb-1 block">
                              Job Description <span className="text-danger">*</span>
                            </label>
                            <div className="flex items-center flex-wrap gap-2 mt-2 mb-2">
                              {templates.length > 0 ? (
                                <>
                                  <select
                                    className="form-control !w-auto !py-1 !px-2 !text-xs !rounded-md"
                                    defaultValue=""
                                    onChange={(e) => {
                                      handleLoadTemplate(e.target.value)
                                      e.target.value = ''
                                    }}
                                    disabled={templatesLoading}
                                    aria-label="Load job template"
                                  >
                                    <option value="">Load template…</option>
                                    {templates.map((t) => {
                                      const oid = (t as { _id?: string; id?: string })._id ?? (t as { id?: string }).id ?? ''
                                      return (
                                        <option key={oid} value={oid}>{t.title}</option>
                                      )
                                    })}
                                  </select>
                                  <button
                                    type="button"
                                    className="ti-btn ti-btn-light !py-1 !px-2 !text-xs !rounded-md"
                                    onClick={handleSaveAsTemplate}
                                    disabled={savingTemplate}
                                  >
                                    {savingTemplate ? 'Saving…' : 'Save as template'}
                                  </button>
                                  <Link
                                    href={ROUTES.settingsJobTemplates}
                                    className="ti-btn ti-btn-light !py-1 !px-2 !text-xs !rounded-md"
                                  >
                                    Manage
                                  </Link>
                                  {templatesLoading && <span className="text-xs text-muted">Loading…</span>}
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    className="ti-btn ti-btn-light !py-1 !px-2 !text-xs !rounded-md"
                                    onClick={handleSaveAsTemplate}
                                    disabled={savingTemplate}
                                  >
                                    {savingTemplate ? 'Saving…' : 'Save as template'}
                                  </button>
                                  <Link
                                    href={ROUTES.settingsJobTemplates}
                                    className="ti-btn ti-btn-light !py-1 !px-2 !text-xs !rounded-md"
                                  >
                                    + Add templates
                                  </Link>
                                </>
                              )}
                            </div>
                            <div className="border border-gray-200 dark:border-defaultborder/10 rounded-md min-h-[260px]">
                              <TiptapEditor content={jobDescription} placeholder="Enter detailed job description..." onChange={(html) => setJobDescription(html)} />
                            </div>
                            <p className="text-muted text-xs mt-2 mb-0">
                              Provide a comprehensive description of the role, responsibilities, and what makes this opportunity unique.
                            </p>
                          </div>
                          <div className="col-span-12">
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
                              placeholder="Type a skill and press Enter to add..."
                              value={formData.skills}
                              className="ti-form-select"
                            />
                            <p className="text-muted text-xs mt-2 mb-0">
                              Add relevant skills required for this position. Press Enter after typing each skill.
                            </p>
                          </div>
                        </div>
                      </section>
                    </div>
                  )}
                  {activeTab === 'requirements' && (
                    <div id="requirements-panel" role="tabpanel" aria-labelledby="requirements-tab" className="space-y-5">
                      <section>
                        <div className={sectionLabel}>Experience & Education</div>
                        <div className="grid grid-cols-12 gap-3">
                          <div className="xl:col-span-3 col-span-6">
                            <label htmlFor="min-experience" className="form-label">Min Years</label>
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              className="form-control !rounded-md"
                              id="min-experience"
                              placeholder="0"
                              value={formData.minExperience}
                              onChange={(e) => handleInputChange('minExperience', e.target.value)}
                            />
                          </div>
                          <div className="xl:col-span-3 col-span-6">
                            <label htmlFor="max-experience" className="form-label">Max Years</label>
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              className="form-control !rounded-md"
                              id="max-experience"
                              placeholder="5"
                              value={formData.maxExperience}
                              onChange={(e) => handleInputChange('maxExperience', e.target.value)}
                            />
                          </div>
                          <div className="xl:col-span-6 col-span-12">
                            <label htmlFor="education" className="form-label">Education</label>
                            <input
                              type="text"
                              className="form-control !rounded-md"
                              id="education"
                              placeholder="e.g., Bachelor's degree in Computer Science"
                              value={formData.education}
                              onChange={(e) => handleInputChange('education', e.target.value)}
                            />
                          </div>
                        </div>
                      </section>
                      <section>
                        <div className={sectionLabel}>Requirements & Qualifications</div>
                        <div className="border border-gray-200 dark:border-defaultborder/10 rounded-md min-h-[260px]">
                          <TiptapEditor
                            content={requirements}
                            placeholder="List key requirements, must-have skills, certifications, and qualifications..."
                            onChange={(html) => setRequirements(html)}
                          />
                        </div>
                        <p className="text-muted text-xs mt-2 mb-0">
                          Detailed requirements appended to the job description on save. Leave blank if description already includes requirements.
                        </p>
                      </section>
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
