export const JOB_FORM_TABS = [
  { key: 'general' as const, label: 'General', icon: 'ri-file-list-3-line', step: 1 },
  { key: 'requirements' as const, label: 'Requirements', icon: 'ri-checkbox-line', step: 2 },
  { key: 'settings' as const, label: 'Settings', icon: 'ri-settings-3-line', step: 3 },
]

export type JobFormTabKey = (typeof JOB_FORM_TABS)[number]['key']

/** Rich text editor shell — min 12rem, max 24rem internal scroll. */
export const JOB_RTE_WRAPPER_CLASS =
  'min-h-[12rem] max-h-[24rem] overflow-y-auto rounded-lg border border-defaultborder/70 dark:border-white/10'

export const JOB_FORM_SECTION_LABEL =
  'text-sm font-semibold text-gray-800 dark:text-white mb-2'

/** Stable ids for section headings — associate controls via aria-labelledby. */
export const JOB_FORM_SECTION_HEADING_IDS = {
  basics: 'job-basics-section-heading',
  organisation: 'job-organisation-section-heading',
  compensation: 'job-compensation-section-heading',
  jobDescription: 'job-description-section-heading',
  skills: 'job-skills-section-heading',
  experienceEducation: 'job-experience-education-section-heading',
  requirements: 'requirements-section-heading',
  publishing: 'publishing-section-heading',
  interviewSetup: 'job-interview-setup-heading',
} as const

export const JOB_INTERVIEW_SETUP_PANEL_ID = 'job-interview-setup-panel'

export const JOB_TYPE_OPTIONS = [
  { value: 'Full-time', label: 'Full Time' },
  { value: 'Part-time', label: 'Part Time' },
  { value: 'Contract', label: 'Contract' },
  { value: 'Temporary', label: 'Temporary' },
  { value: 'Internship', label: 'Internship' },
  { value: 'Freelance', label: 'Freelance' },
]

export const EXPERIENCE_LEVEL_OPTIONS = [
  { value: 'Entry Level', label: 'Entry Level' },
  { value: 'Mid Level', label: 'Mid Level' },
  { value: 'Senior Level', label: 'Senior Level' },
  { value: 'Executive', label: 'Executive' },
]

export const STATUS_OPTIONS = [
  { value: 'Draft', label: 'Draft' },
  { value: 'Active', label: 'Active' },
  { value: 'Closed', label: 'Closed' },
  { value: 'Archived', label: 'Archived' },
]
