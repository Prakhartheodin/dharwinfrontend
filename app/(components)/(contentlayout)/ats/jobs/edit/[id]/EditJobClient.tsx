"use client"

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import {
  getJobById,
  updateJob,
  getJobTemplate,
  listJobTemplates,
  createJobTemplate,
  type UpdateJobPayload,
  type InterviewRoundPlanRow,
} from '@/shared/lib/api/jobs'
import JobRoundPlanSection from '@/shared/components/interview/JobRoundPlanSection'
import InterviewerPoolSelect from '@/shared/components/interview/InterviewerPoolSelect'
import { normalizeTipTapHtmlFromApi } from '@/shared/lib/tiptapHtml'

import { resolveTemplateVars, type TemplateVarContext } from '@/shared/lib/ats/templateVars'
import { validateVacanciesInput } from '@/shared/lib/ats/jobVacancy'
import { PHONE_COUNTRIES, getPhoneValidationError, formatPhoneForApi } from '@/shared/lib/phoneCountries'
import { usePmReactSelectStyles } from '@/shared/hooks/usePmReactSelectStyles'
import { JobFormTabList } from '../../_components/form/JobFormTabList'
import { JobFormFooter } from '../../_components/form/JobFormFooter'
import { JobFormBox, JobFormBodyLoadingSkeleton, JobFormShell } from '../../_components/form/JobFormShell'
import { JobFormHeader } from '../../_components/form/JobFormHeader'
import { JobFormPanel } from '../../_components/form/JobFormPanel'
import { JobSection } from '../../_components/form/JobSection'
import { JobInterviewSetup } from '../../_components/form/JobInterviewSetup'
import { JobBasicsSection } from '../../_components/form/jobFormSections/JobBasicsSection'
import { JobOrganisationSection } from '../../_components/form/jobFormSections/JobOrganisationSection'
import { JobCompensationSection } from '../../_components/form/jobFormSections/JobCompensationSection'
import { JobDescriptionSection } from '../../_components/form/jobFormSections/JobDescriptionSection'
import { JobSkillsSection } from '../../_components/form/jobFormSections/JobSkillsSection'
import {
  JobExperienceEducationSection,
  JobRequirementsQualificationsSection,
} from '../../_components/form/jobFormSections/JobRequirementsSections'
import { JobPublishingSection } from '../../_components/form/jobFormSections/JobPublishingSection'
import {
  EXPERIENCE_LEVEL_OPTIONS,
  JOB_FORM_SECTION_HEADING_IDS,
  JOB_TYPE_OPTIONS,
  STATUS_OPTIONS,
  type JobFormTabKey,
} from '../../_components/form/jobFormConstants'
import {
  applyJobFormFieldErrors,
  validateJobFormRequired,
  FieldInlineError,
  JobFormValidationSummary,
} from '../../_components/form/jobFormValidation'
import {
  buildJobDescriptionWithRequirements,
  splitRequirementsFromDescription,
} from '../../_components/form/jobFormDescriptionHtml'
import { createSkillOption, handleJobSkillsComboboxKeyDown } from '../../_components/form/jobFormSections/shared'
import { JobFormPermissionDenied } from '../../_components/form/JobFormPermissionGate'
import { useFeaturePermissions } from '@/shared/hooks/use-feature-permissions'
import { useConfirm } from '@/shared/components/ui/useConfirm'
import { JobFormRoleStrip } from '../../_components/form/JobFormRoleStrip'
import { JobFormGeneralJumpNav } from '../../_components/form/JobFormGeneralJumpNav'
import { computeJobFormTabCompletion } from '../../_components/form/jobFormTabCompletion'
import { useTemplateNameDialog } from '../../_components/form/useTemplateNameDialog'

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
  const { canEdit, isLoading: permissionsLoading } = useFeaturePermissions('ats.jobs')
  const { confirm, confirmDialog } = useConfirm()
  const { promptTemplateName, templateNameDialog } = useTemplateNameDialog()
  const [validationFocusToken, setValidationFocusToken] = useState(0)
  const [formTouched, setFormTouched] = useState(false)
  const searchParams = useSearchParams()
  const templateQueryHandled = useRef<string | null>(null)
  const jobId = params?.id as string
  const { menuPortalTarget: selectMenuPortalTarget, styles: selectMenuLayerStyles } =
    usePmReactSelectStyles(9999)
  const [activeTab, setActiveTab] = useState<JobFormTabKey>('general')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [jobDescription, setJobDescription] = useState('')
  const [requirements, setRequirements] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [interviewRounds, setInterviewRounds] = useState<InterviewRoundPlanRow[]>([])
  const [interviewerPool, setInterviewerPool] = useState<string[]>([])
  const [loadedInterviewerPool, setLoadedInterviewerPool] = useState<string[]>([])
  const [assignedRecruiter, setAssignedRecruiter] = useState<string | null>(null)
  const [loadedAssignedRecruiter, setLoadedAssignedRecruiter] = useState<string | null>(null)
  const [loadedInterviewRounds, setLoadedInterviewRounds] = useState<InterviewRoundPlanRow[]>([])
  const [roundPlanErrorMsg, setRoundPlanErrorMsg] = useState<string | null>(null)
  const [hasLegacyRubrics, setHasLegacyRubrics] = useState(false)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    jobTitle: '',
    organisationName: '',
    organisationWebsite: '',
    organisationEmail: '',
    organisationCountryCode: 'IN',
    organisationPhone: '',
    organisationAddress: '',
    organisationIndustry: '',
    organisationFounded: '',
    organisationCompanySize: '',
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
    vacancies: '1',
    applicationDeadline: '',
    education: '',
  })
  const [skillsInputValue, setSkillsInputValue] = useState('')
  const [templates, setTemplates] = useState<{ _id: string; title: string }[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
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
        const opt = JOB_TYPE_OPTIONS.find((o) => o.value === t.jobType)
        if (opt) next.jobType = opt
      }
      if (!prev.experienceLevel && t.experienceLevel) {
        const opt = EXPERIENCE_LEVEL_OPTIONS.find((o) => o.value === t.experienceLevel)
        if (opt) next.experienceLevel = opt
      }
      if (!prev.salaryMin && t.salaryRange?.min != null) next.salaryMin = String(t.salaryRange.min)
      if (!prev.salaryMax && t.salaryRange?.max != null) next.salaryMax = String(t.salaryRange.max)
      if (!prev.salaryCurrency && t.salaryRange?.currency) next.salaryCurrency = t.salaryRange.currency
      if ((!prev.skills || prev.skills.length === 0) && Array.isArray(t.skillTags) && t.skillTags.length > 0) {
        next.skills = t.skillTags.map((s) => createSkillOption(s))
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
    void confirm({
      title: 'Replace current description?',
      message: 'Loading a template replaces the current job description.',
      confirmLabel: 'Use template',
      cancelLabel: 'Cancel',
      tone: 'primary',
    }).then((ok) => {
      if (!ok) return
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
      void confirm({
        title: 'Nothing to save',
        message: 'Write a job description first.',
        confirmLabel: 'OK',
        hideCancel: true,
        tone: 'primary',
      })
      return
    }
    const title = await promptTemplateName(formData.jobTitle?.trim() || '')
    if (!title) return
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
      void confirm({
        title: 'Template saved',
        message: `“${title.trim()}” is available under your job templates.`,
        confirmLabel: 'OK',
        hideCancel: true,
        tone: 'success',
      })
    } catch {
      void confirm({
        title: 'Save failed',
        message: 'Could not save template. Try again.',
        confirmLabel: 'OK',
        hideCancel: true,
        tone: 'danger',
      })
    } finally {
      setSavingTemplate(false)
    }
  }

  useEffect(() => {
    if (!jobId || jobId === '_') return
    getJobById(jobId)
      .then((job) => {
        if (job.jobOrigin === 'external') {
          void confirm({
            title: 'External job',
            message: 'External jobs are managed from External jobs and cannot be edited here.',
            confirmLabel: 'Go to jobs',
            hideCancel: true,
            tone: 'primary',
          }).then(() => router.replace('/ats/jobs'))
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
          organisationIndustry: job.organisation?.industry || '',
          organisationFounded:
            job.organisation?.founded != null ? String(job.organisation.founded) : '',
          organisationCompanySize: job.organisation?.companySize || '',
          salaryMin: job.salaryRange?.min ? String(job.salaryRange.min) : '',
          salaryMax: job.salaryRange?.max ? String(job.salaryRange.max) : '',
          salaryCurrency: job.salaryRange?.currency || 'USD',
          location: job.location || '',
          jobType: job.jobType ? JOB_TYPE_OPTIONS.find((o) => o.value === job.jobType) || { value: job.jobType, label: job.jobType } : null,
          experienceLevel: job.experienceLevel ? EXPERIENCE_LEVEL_OPTIONS.find((o) => o.value === job.experienceLevel) || { value: job.experienceLevel, label: job.experienceLevel } : null,
          status: STATUS_OPTIONS.find((o) => o.value === job.status) || { value: 'Active', label: 'Active' },
          skills: (job.skillTags || []).map((s: string) => ({ value: s, label: s })),
          // Prefer canonical numeric fields when present; legacy regex below
          // (Experience embedded in description) only fills these if still empty.
          minExperience: job.minExperience != null ? String(job.minExperience) : '',
          maxExperience: job.maxExperience != null ? String(job.maxExperience) : '',
          vacancies: job.vacancies != null ? String(job.vacancies) : '1',
          applicationDeadline: job.applicationDeadline
            ? String(job.applicationDeadline).slice(0, 10)
            : '',
          education: '',
        })
        setInterviewRounds(job.interviewRounds ?? [])
        {
          const pool = (job.interviewerPool ?? [])
            .map((p) => (typeof p === 'string' ? p : String(p?._id ?? p?.id ?? '')))
            .filter(Boolean)
          setInterviewerPool(pool)
          setLoadedInterviewerPool(pool)
        }
        {
          const rec = job.assignedRecruiter
          const recId =
            (rec ? (typeof rec === 'string' ? rec : String(rec?._id ?? rec?.id ?? '')) : '') || null
          setAssignedRecruiter(recId)
          setLoadedAssignedRecruiter(recId)
        }
        setLoadedInterviewRounds(job.interviewRounds ?? [])
        setHasLegacyRubrics((job.rubricAssignments?.length ?? 0) > 0)
        // Decode entity-encoded payloads (xss-clean middleware may return `&lt;p&gt;…`)
        // and split the appended Requirements & Qualifications block back out, so
        // the editor displays clean description + requirements separately. Without
        // this split, every save re-appends the block, duplicating it on each edit.
        const normalized = normalizeTipTapHtmlFromApi(job.jobDescription || '')
        const { description, requirements: reqHtml } = splitRequirementsFromDescription(normalized)
        // The submit handler regenerates Education / Experience <p> blocks from the
        // form fields and prepends them above `requirements`. Strip them out of the
        // re-loaded `requirements` HTML so they too don't accumulate on resave.
        let parsedEducation = ''
        let parsedMinYears = ''
        let parsedMaxYears = ''
        let remainingReq = reqHtml
        const eduMatch = remainingReq.match(/<p>\s*<strong>\s*Education:\s*<\/strong>\s*([^<]*?)\s*<\/p>\s*/i)
        if (eduMatch) {
          parsedEducation = (eduMatch[1] || '').trim()
          remainingReq = remainingReq.replace(eduMatch[0], '')
        }
        const expMatch = remainingReq.match(/<p>\s*<strong>\s*Experience:\s*<\/strong>\s*([^<]*?)\s*<\/p>\s*/i)
        if (expMatch) {
          const exp = (expMatch[1] || '').trim()
          const range = exp.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*years?/i)
          const minOnly = exp.match(/^(\d+(?:\.\d+)?)\+\s*years?/i)
          const maxOnly = exp.match(/^Up to\s+(\d+(?:\.\d+)?)\s*years?/i)
          if (range) {
            parsedMinYears = range[1]
            parsedMaxYears = range[2]
          } else if (minOnly) {
            parsedMinYears = minOnly[1]
          } else if (maxOnly) {
            parsedMaxYears = maxOnly[1]
          }
          remainingReq = remainingReq.replace(expMatch[0], '')
        }
        setFormData((prev) => ({
          ...prev,
          education: parsedEducation || prev.education,
          // Prefer canonical numeric fields from API; only adopt legacy
          // values parsed from the description body if the API didn't
          // already provide them.
          minExperience: prev.minExperience || parsedMinYears,
          maxExperience: prev.maxExperience || parsedMaxYears,
        }))
        setJobDescription(description)
        setRequirements(remainingReq.trim())
      })
      .catch(() => {
        void confirm({
          title: 'Job not found',
          message: 'This posting may have been removed or you may not have access.',
          confirmLabel: 'All jobs',
          hideCancel: true,
          tone: 'danger',
        }).then(() => router.push('/ats/jobs'))
      })
      .finally(() => setLoading(false))
  }, [jobId, router])

  const handleInputChange = (field: string, value: any) => {
    setFormTouched(true)
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSkillsKeyDown = (event: React.KeyboardEvent) => {
    handleJobSkillsComboboxKeyDown(
      event,
      skillsInputValue,
      (label) => {
        setFormTouched(true)
        setFormData((prev) => ({
          ...prev,
          skills: [...prev.skills, createSkillOption(label)],
        }))
      },
      () => setSkillsInputValue('')
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})
    const orgPhoneDigits = (formData.organisationPhone || '').replace(/\D/g, '')
    const phoneError = orgPhoneDigits
      ? getPhoneValidationError(orgPhoneDigits, formData.organisationCountryCode)
      : null
    const foundedRaw = (formData.organisationFounded || '').trim()
    const foundedNum = foundedRaw ? Number(foundedRaw) : undefined
    const foundedInvalid = Boolean(
      foundedRaw && (!Number.isInteger(foundedNum) || foundedNum! < 1800 || foundedNum! > new Date().getFullYear())
    )
    const vacanciesCheck = validateVacanciesInput(formData.vacancies)
    const clientErrors = validateJobFormRequired({
      jobTitle: formData.jobTitle,
      organisationName: formData.organisationName,
      location: formData.location,
      jobType: formData.jobType,
      jobDescriptionHtml: jobDescription,
      phoneError,
      foundedInvalid,
      roundPlanError: roundPlanErrorMsg,
      vacanciesError: vacanciesCheck.ok ? null : vacanciesCheck.message,
    })
    if (clientErrors.length > 0) {
      applyJobFormFieldErrors(clientErrors, setActiveTab, setFieldErrors)
      setValidationFocusToken((n) => n + 1)
      return
    }
    if (!jobId || jobId === '_') return
    if (loadedInterviewRounds.length > 0 && interviewRounds.length === 0) {
      const ok = await confirm({
        title: 'Remove all interview rounds?',
        message:
          'This job will no longer have a set round sequence. Candidates already part-way through keep the sequence they started on.',
        confirmLabel: 'Remove rounds',
        cancelLabel: 'Keep rounds',
        tone: 'danger',
      })
      if (!ok) return
    }
    setSubmitting(true)
    try {
      const finalDescription = buildJobDescriptionWithRequirements(
        jobDescription,
        requirements,
        formData.education
      )

      const minExpNum = formData.minExperience ? Number(formData.minExperience) : undefined
      const maxExpNum = formData.maxExperience ? Number(formData.maxExperience) : undefined
      if (!vacanciesCheck.ok) return
      const vacanciesNum = vacanciesCheck.value

      const roundsChanged =
        JSON.stringify(interviewRounds) !== JSON.stringify(loadedInterviewRounds)

      const payload: UpdateJobPayload = {
        title: formData.jobTitle.trim(),
        organisation: {
          name: formData.organisationName.trim(),
          website: formData.organisationWebsite?.trim() || undefined,
          email: formData.organisationEmail?.trim() || undefined,
          phone: orgPhoneDigits ? formatPhoneForApi(orgPhoneDigits, formData.organisationCountryCode) : undefined,
          address: formData.organisationAddress?.trim() || undefined,
          industry: formData.organisationIndustry?.trim() || undefined,
          founded: foundedNum ?? undefined,
          companySize: formData.organisationCompanySize || undefined,
        },
        jobDescription: finalDescription,
        jobType: formData.jobType!.value,
        location: formData.location.trim(),
        skillTags: formData.skills?.map((s) => s.value || s.label) || [],
        salaryRange: {
          min: formData.salaryMin ? Number(formData.salaryMin) : undefined,
          max: formData.salaryMax ? Number(formData.salaryMax) : undefined,
          currency: formData.salaryCurrency || 'USD',
        },
        experienceLevel: formData.experienceLevel?.value || undefined,
        minExperience: Number.isFinite(minExpNum) ? minExpNum : null,
        maxExperience: Number.isFinite(maxExpNum) ? maxExpNum : null,
        vacancies: vacanciesNum,
        applicationDeadline: formData.applicationDeadline
          ? new Date(formData.applicationDeadline).toISOString()
          : null,
        status: formData.status?.value || 'Active',
        ...(roundsChanged ? { interviewRounds } : {}),
        ...(JSON.stringify(interviewerPool) !== JSON.stringify(loadedInterviewerPool) ? { interviewerPool } : {}),
        ...(assignedRecruiter !== loadedAssignedRecruiter ? { assignedRecruiter } : {}),
      }
      await updateJob(jobId, payload)
      router.push('/ats/jobs?saved=updated')
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to update job.'
      void confirm({
        title: 'Could not save changes',
        message,
        confirmLabel: 'OK',
        hideCancel: true,
        tone: 'danger',
      })
    } finally {
      setSubmitting(false)
    }
  }


  const selectLayer = {
    menuPortalTarget: selectMenuPortalTarget,
    styles: selectMenuLayerStyles,
  }

  const tabCompletion = useMemo(
    () =>
      computeJobFormTabCompletion({
        jobTitle: formData.jobTitle,
        organisationName: formData.organisationName,
        location: formData.location,
        jobType: formData.jobType,
        jobDescriptionHtml: jobDescription,
        education: formData.education,
        minExperience: formData.minExperience,
        maxExperience: formData.maxExperience,
        requirementsHtml: requirements,
        interviewRoundsCount: interviewRounds.length,
        interviewerPoolCount: interviewerPool.length,
      }),
    [formData, jobDescription, requirements, interviewRounds.length, interviewerPool.length]
  )

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!formTouched || loading || submitting) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [formTouched, loading, submitting])

  const handleCancel = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!formTouched) return
    event.preventDefault()
    void confirm({
      title: 'Leave without saving?',
      message: 'You have unsaved changes to this job posting.',
      confirmLabel: 'Leave',
      cancelLabel: 'Keep editing',
      tone: 'danger',
    }).then((ok) => {
      if (ok) router.push('/ats/jobs')
    })
  }

  if (jobId === '_') {
    return (
      <JobFormShell seoTitle="Edit posting" loading>
        {null}
      </JobFormShell>
    )
  }

  if (permissionsLoading) {
    return (
      <JobFormShell seoTitle="Edit posting" loading>
        {null}
      </JobFormShell>
    )
  }

  if (!canEdit) {
    return <JobFormPermissionDenied mode="edit" />
  }

  return (
    <JobFormShell seoTitle="Edit posting">
      {confirmDialog}
      {templateNameDialog}
      <JobFormBox>
      <JobFormHeader mode="edit" status={formData.status?.value} />
      {!loading ? (
        <JobFormRoleStrip
          mode="edit"
          jobTitle={formData.jobTitle}
          location={formData.location}
          jobTypeLabel={formData.jobType?.label}
        />
      ) : null}
      <JobFormTabList activeTab={activeTab} onTabChange={setActiveTab} tabCompletion={tabCompletion} />
      <div className="jobs-surface-x pt-3">
        <JobFormValidationSummary fieldErrors={fieldErrors} focusToken={validationFocusToken} />
      </div>
      {loading ? (
        <JobFormBodyLoadingSkeleton />
      ) : (
        <>
      <form id="job-form" onSubmit={handleSubmit}>
        <JobFormPanel tabKey="general" activeTab={activeTab} labelledBy="general-tab">
          <JobFormGeneralJumpNav />
          <JobSection title="Basics" headingId={JOB_FORM_SECTION_HEADING_IDS.basics}>
            <JobBasicsSection
              formData={formData}
              fieldErrors={fieldErrors}
              onFieldChange={handleInputChange}
              selectLayer={selectLayer}
              datePortalId="ats-jobs-datepicker-portal-application-deadline-edit"
            />
          </JobSection>
          <JobSection title="Organisation" headingId={JOB_FORM_SECTION_HEADING_IDS.organisation}>
            <JobOrganisationSection
              formData={formData}
              fieldErrors={fieldErrors}
              onFieldChange={handleInputChange}
            />
          </JobSection>
          <JobSection title="Compensation" headingId={JOB_FORM_SECTION_HEADING_IDS.compensation}>
            <JobCompensationSection formData={formData} onFieldChange={handleInputChange} />
          </JobSection>
          <JobSection
            title="Job description"
            headingId={JOB_FORM_SECTION_HEADING_IDS.jobDescription}
            required
          >
            <JobDescriptionSection
              jobDescription={jobDescription}
              onDescriptionChange={(html) => {
                setFormTouched(true)
                setJobDescription(html)
              }}
              fieldErrors={fieldErrors}
              templates={templates}
              templatesLoading={templatesLoading}
              savingTemplate={savingTemplate}
              onLoadTemplate={handleLoadTemplate}
              onSaveAsTemplate={handleSaveAsTemplate}
              labelledBy={JOB_FORM_SECTION_HEADING_IDS.jobDescription}
            />
          </JobSection>
          <JobSection title="Skills" headingId={JOB_FORM_SECTION_HEADING_IDS.skills}>
            <JobSkillsSection
              skills={formData.skills}
              skillsInputValue={skillsInputValue}
              onSkillsChange={(value) => handleInputChange('skills', value)}
              onSkillsInputChange={setSkillsInputValue}
              onSkillsKeyDown={handleSkillsKeyDown}
              selectLayer={selectLayer}
              labelledBy={JOB_FORM_SECTION_HEADING_IDS.skills}
            />
          </JobSection>
        </JobFormPanel>

        <JobFormPanel tabKey="requirements" activeTab={activeTab} labelledBy="requirements-tab">
          <JobSection title="Experience & Education" headingId={JOB_FORM_SECTION_HEADING_IDS.experienceEducation}>
            <JobExperienceEducationSection
              minExperience={formData.minExperience}
              maxExperience={formData.maxExperience}
              education={formData.education}
              onFieldChange={handleInputChange}
            />
          </JobSection>
          <JobSection
            title="Requirements & Qualifications"
            headingId={JOB_FORM_SECTION_HEADING_IDS.requirements}
          >
            <JobRequirementsQualificationsSection
              requirements={requirements}
              onRequirementsChange={(html) => {
                setFormTouched(true)
                setRequirements(html)
              }}
              helperText="Detailed requirements appended to the job description on save. Leave blank if description already includes requirements."
              labelledBy={JOB_FORM_SECTION_HEADING_IDS.requirements}
            />
          </JobSection>
        </JobFormPanel>

        <JobFormPanel tabKey="settings" activeTab={activeTab} labelledBy="settings-tab">
          <JobSection title="Publishing" headingId={JOB_FORM_SECTION_HEADING_IDS.publishing}>
            <JobPublishingSection
              status={formData.status}
              onStatusChange={(value) => handleInputChange('status', value)}
              selectLayer={selectLayer}
              labelledBy={JOB_FORM_SECTION_HEADING_IDS.publishing}
            />
          </JobSection>
          <JobInterviewSetup
            defaultOpen={interviewRounds.length > 0 || interviewerPool.length > 0}
            headingId={JOB_FORM_SECTION_HEADING_IDS.interviewSetup}
          >
            {interviewRounds.length === 0 && hasLegacyRubrics ? (
              <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
                This job still uses the older per-round-type scoring setup, which keeps working. Adding rounds here
                replaces it for every round scheduled from now on.
              </p>
            ) : null}
            <div id="interview-round-plan">
              <JobRoundPlanSection
                value={interviewRounds}
                onChange={(rounds) => {
                  setFormTouched(true)
                  setInterviewRounds(rounds)
                }}
                jobId={jobId}
                onValidityChange={setRoundPlanErrorMsg}
              />
            </div>
            <FieldInlineError fieldId="interview-round-plan" fieldErrors={fieldErrors} />
            <InterviewerPoolSelect
              value={interviewerPool}
              onChange={(pool) => {
                setFormTouched(true)
                setInterviewerPool(pool)
              }}
              recruiter={assignedRecruiter}
              onRecruiterChange={setAssignedRecruiter}
            />
          </JobInterviewSetup>
        </JobFormPanel>
      </form>
        </>
      )}
      </JobFormBox>
      {!loading ? (
        <JobFormFooter
          mode="edit"
          submitting={submitting}
          submitDisabled={Boolean(roundPlanErrorMsg)}
          onCancel={handleCancel}
        />
      ) : null}
    </JobFormShell>
  )
}
