import type { JobFormTabKey } from './jobFormConstants'

export type JobFormTabCompletion = 'complete' | 'incomplete' | 'optional'

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

export function computeJobFormTabCompletion(input: {
  jobTitle: string
  organisationName: string
  location: string
  jobType: unknown
  jobDescriptionHtml: string
  education: string
  minExperience: string
  maxExperience: string
  requirementsHtml: string
  interviewRoundsCount: number
  interviewerPoolCount: number
  /** When true (create job), Settings is incomplete until interview rounds exist. */
  requireInterviewSetup?: boolean
}): Record<JobFormTabKey, JobFormTabCompletion> {
  const generalCore =
    Boolean(input.jobTitle.trim()) &&
    Boolean(input.organisationName.trim()) &&
    Boolean(input.location.trim()) &&
    Boolean(input.jobType) &&
    Boolean(stripHtml(input.jobDescriptionHtml))

  const requirementsTouched =
    Boolean(input.education.trim()) ||
    Boolean(input.minExperience.trim()) ||
    Boolean(input.maxExperience.trim()) ||
    Boolean(stripHtml(input.requirementsHtml))

  const settingsComplete = input.requireInterviewSetup
    ? input.interviewRoundsCount > 0
    : input.interviewRoundsCount > 0 || input.interviewerPoolCount > 0

  const settingsState: JobFormTabCompletion = input.requireInterviewSetup
    ? settingsComplete
      ? 'complete'
      : 'incomplete'
    : settingsComplete
      ? 'complete'
      : 'optional'

  return {
    general: generalCore ? 'complete' : 'incomplete',
    requirements: requirementsTouched ? 'complete' : 'optional',
    settings: settingsState,
  }
}
