"use client"
import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createJob, createJobTemplate, getJobTemplate, listJobTemplates, type CreateJobPayload, type InterviewRoundPlanRow } from '@/shared/lib/api/jobs'
import JobRoundPlanSection from '@/shared/components/interview/JobRoundPlanSection'
import InterviewerPoolSelect from '@/shared/components/interview/InterviewerPoolSelect'
import { normalizeTipTapHtmlFromApi } from '@/shared/lib/tiptapHtml'
import { resolveTemplateVars, type TemplateVarContext } from '@/shared/lib/ats/templateVars'
import { validateVacanciesInput } from '@/shared/lib/ats/jobVacancy'
import { JobFormTabList } from '../_components/form/JobFormTabList'
import { JobFormFooter } from '../_components/form/JobFormFooter'
import { JobFormBox, JobFormShell } from '../_components/form/JobFormShell'
import { JobFormHeader } from '../_components/form/JobFormHeader'
import { JobFormPanel } from '../_components/form/JobFormPanel'
import { JobSection } from '../_components/form/JobSection'
import { JobInterviewSetup } from '../_components/form/JobInterviewSetup'
import { JobBasicsSection } from '../_components/form/jobFormSections/JobBasicsSection'
import { JobOrganisationSection } from '../_components/form/jobFormSections/JobOrganisationSection'
import { JobCompensationSection } from '../_components/form/jobFormSections/JobCompensationSection'
import { JobDescriptionSection } from '../_components/form/jobFormSections/JobDescriptionSection'
import { JobSkillsSection } from '../_components/form/jobFormSections/JobSkillsSection'
import {
  JobExperienceEducationSection,
  JobRequirementsQualificationsSection,
} from '../_components/form/jobFormSections/JobRequirementsSections'
import { JobPublishingSection } from '../_components/form/jobFormSections/JobPublishingSection'
import {
  EXPERIENCE_LEVEL_OPTIONS,
  JOB_FORM_SECTION_HEADING_IDS,
  JOB_TYPE_OPTIONS,
  type JobFormTabKey,
} from '../_components/form/jobFormConstants'
import {
  applyJobFormFieldErrors,
  validateJobFormRequired,
  FieldInlineError,
  JobFormValidationSummary,
} from '../_components/form/jobFormValidation'
import { buildJobDescriptionWithRequirements } from '../_components/form/jobFormDescriptionHtml'
import { createSkillOption, handleJobSkillsComboboxKeyDown } from '../_components/form/jobFormSections/shared'
import { JobFormPermissionDenied } from '../_components/form/JobFormPermissionGate'
import { getPhoneValidationError, formatPhoneForApi } from '@/shared/lib/phoneCountries'
import { usePmReactSelectStyles } from '@/shared/hooks/usePmReactSelectStyles'
import { useFeaturePermissions } from '@/shared/hooks/use-feature-permissions'
import { useConfirm } from '@/shared/components/ui/useConfirm'
import { JobFormRoleStrip } from '../_components/form/JobFormRoleStrip'
import { JobFormGeneralJumpNav } from '../_components/form/JobFormGeneralJumpNav'
import { computeJobFormTabCompletion } from '../_components/form/jobFormTabCompletion'
import { useTemplateNameDialog } from '../_components/form/useTemplateNameDialog'

const CreateJob = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { canCreate, isLoading: permissionsLoading } = useFeaturePermissions('ats.jobs')
  const { confirm, confirmDialog } = useConfirm()
  const { promptTemplateName, templateNameDialog } = useTemplateNameDialog()
  const [validationFocusToken, setValidationFocusToken] = useState(0)
  const templateQueryHandled = useRef<string | null>(null)
  const { menuPortalTarget: selectMenuPortalTarget, styles: selectMenuLayerStyles } =
    usePmReactSelectStyles(9999)
  const [activeTab, setActiveTab] = useState<JobFormTabKey>('general')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [jobDescription, setJobDescription] = useState('')
  const [requirements, setRequirements] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [interviewRounds, setInterviewRounds] = useState<InterviewRoundPlanRow[]>([])
  const [interviewerPool, setInterviewerPool] = useState<string[]>([])
  const [assignedRecruiter, setAssignedRecruiter] = useState<string | null>(null)
  const [roundPlanErrorMsg, setRoundPlanErrorMsg] = useState<string | null>(null)
  
  // Form state
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
    status: { value: 'Active', label: 'Active' },
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

  /** Prefill from Settings → My jobs template → “Create job” link (?templateId=) */
  useEffect(() => {
    const tid = searchParams.get('templateId')
    if (!tid || templateQueryHandled.current === tid) return
    templateQueryHandled.current = tid
    setTemplatesLoading(true)
    getJobTemplate(tid)
      .then((t) => {
        // Full prefill via shared helper — same code path as in-page picker.
        applyTemplateToForm(t)
      })
      .catch(() => {
        templateQueryHandled.current = null
      })
      .finally(() => setTemplatesLoading(false))
  }, [searchParams])

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

  const handleLoadTemplate = (templateId: string) => {
    if (!templateId) return
    const proceed = async () => {
      setTemplatesLoading(true)
      try {
        const t = await getJobTemplate(templateId)
        applyTemplateToForm(t)
      } finally {
        setTemplatesLoading(false)
      }
    }
    // Only ask before overwrite if there is meaningful existing content.
    if (jobDescription && jobDescription.replace(/<[^>]+>/g, '').trim().length > 0) {
      void confirm({
        title: 'Replace current description?',
        message: 'Loading a template replaces the current job description.',
        confirmLabel: 'Use template',
        cancelLabel: 'Cancel',
        tone: 'primary',
      }).then((ok) => {
        if (ok) proceed()
      })
    } else {
      proceed()
    }
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
      // Capture full structured snapshot — not just description.
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

  const handleSkillsKeyDown = (event: React.KeyboardEvent) => {
    handleJobSkillsComboboxKeyDown(
      event,
      skillsInputValue,
      (label) =>
        setFormData((prev) => ({
          ...prev,
          skills: [...prev.skills, createSkillOption(label)],
        })),
      () => setSkillsInputValue('')
    )
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
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
      requireInterviewSetup: true,
      interviewRoundsCount: interviewRounds.length,
    })
    if (clientErrors.length > 0) {
      applyJobFormFieldErrors(clientErrors, setActiveTab, setFieldErrors)
      setValidationFocusToken((n) => n + 1)
      return
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

      const payload: CreateJobPayload = {
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
        ...(Number.isFinite(minExpNum) ? { minExperience: minExpNum } : {}),
        ...(Number.isFinite(maxExpNum) ? { maxExperience: maxExpNum } : {}),
        vacancies: vacanciesNum,
        ...(formData.applicationDeadline
          ? { applicationDeadline: new Date(formData.applicationDeadline).toISOString() }
          : {}),
        status: formData.status?.value || 'Active',
        interviewRounds,
        ...(interviewerPool.length ? { interviewerPool } : {}),
        ...(assignedRecruiter ? { assignedRecruiter } : {}),
      }
      await createJob(payload)
      router.push('/ats/jobs?saved=created')
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to create job.'
      void confirm({
        title: 'Could not create job',
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
        requireInterviewSetup: true,
      }),
    [formData, jobDescription, requirements, interviewRounds.length, interviewerPool.length]
  )

  const formDirty =
    Boolean(formData.jobTitle.trim()) ||
    Boolean(formData.organisationName.trim()) ||
    Boolean(jobDescription.replace(/<[^>]+>/g, '').trim())

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!formDirty || submitting) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [formDirty, submitting])

  const handleCancel = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!formDirty) return
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

  if (permissionsLoading) {
    return (
      <JobFormShell seoTitle="New job posting" loading>
        {null}
      </JobFormShell>
    )
  }

  if (!canCreate) {
    return <JobFormPermissionDenied mode="create" />
  }

  return (
    <JobFormShell seoTitle="New job posting">
      {confirmDialog}
      {templateNameDialog}
      <JobFormBox>
      <JobFormHeader mode="create" status={formData.status?.value} />
      <JobFormRoleStrip
        mode="create"
        jobTitle={formData.jobTitle}
        location={formData.location}
        jobTypeLabel={formData.jobType?.label}
      />
      <JobFormTabList activeTab={activeTab} onTabChange={setActiveTab} tabCompletion={tabCompletion} />
      <div className="jobs-surface-x pt-3">
        <JobFormValidationSummary fieldErrors={fieldErrors} focusToken={validationFocusToken} />
      </div>
      <form id="job-form" onSubmit={handleSubmit}>
        <JobFormPanel tabKey="general" activeTab={activeTab} labelledBy="general-tab">
          <JobFormGeneralJumpNav />
          <JobSection title="Basics" headingId={JOB_FORM_SECTION_HEADING_IDS.basics}>
            <JobBasicsSection
              formData={formData}
              fieldErrors={fieldErrors}
              onFieldChange={handleInputChange}
              selectLayer={selectLayer}
              datePortalId="ats-jobs-datepicker-portal-application-deadline-create"
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
              onDescriptionChange={setJobDescription}
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
              onRequirementsChange={setRequirements}
              helperText="Detailed requirements will be appended to the job description. Include bullet points for clarity."
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
          <p className="text-xs text-defaulttextcolor/70 dark:text-white/55 mb-3 m-0">
            Interview setup is required for new jobs. Add at least one round in the sequence below.
          </p>
          <JobInterviewSetup
            defaultOpen
            required
            headingId={JOB_FORM_SECTION_HEADING_IDS.interviewSetup}
          >
            <div id="interview-round-plan">
              <JobRoundPlanSection
                value={interviewRounds}
                onChange={setInterviewRounds}
                onValidityChange={setRoundPlanErrorMsg}
              />
            </div>
            <FieldInlineError fieldId="interview-round-plan" fieldErrors={fieldErrors} />
            <InterviewerPoolSelect
              value={interviewerPool}
              onChange={setInterviewerPool}
              recruiter={assignedRecruiter}
              onRecruiterChange={setAssignedRecruiter}
            />
          </JobInterviewSetup>
        </JobFormPanel>
      </form>
      </JobFormBox>
      <JobFormFooter
        mode="create"
        submitting={submitting}
        submitDisabled={Boolean(roundPlanErrorMsg)}
        onCancel={handleCancel}
      />
    </JobFormShell>
  )
}

export default CreateJob
