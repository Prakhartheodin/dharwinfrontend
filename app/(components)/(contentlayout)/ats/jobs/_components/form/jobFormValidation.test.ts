import { describe, expect, it } from 'vitest'
import { validateJobFormRequired } from './jobFormValidation'

describe('validateJobFormRequired', () => {
  const base = {
    jobTitle: 'Engineer',
    organisationName: 'Acme',
    location: 'Remote',
    jobType: { value: 'Full-time', label: 'Full Time' },
    jobDescriptionHtml: '<p>Role summary</p>',
    phoneError: null,
    foundedInvalid: false,
    roundPlanError: null,
    vacanciesError: null,
  }

  it('returns empty array when all required fields are valid', () => {
    expect(validateJobFormRequired(base)).toEqual([])
  })

  it('returns general tab error for missing job title', () => {
    const errors = validateJobFormRequired({ ...base, jobTitle: '  ' })
    expect(errors[0]?.tab).toBe('general')
    expect(errors[0]?.fieldId).toBe('job-title')
  })

  it('routes round plan errors to settings tab', () => {
    const errors = validateJobFormRequired({ ...base, roundPlanError: 'Round 2 needs a rubric' })
    expect(errors[0]?.tab).toBe('settings')
    expect(errors[0]?.fieldId).toBe('interview-round-plan')
  })

  it('requires at least one interview round when requireInterviewSetup is set', () => {
    const errors = validateJobFormRequired({
      ...base,
      requireInterviewSetup: true,
      interviewRoundsCount: 0,
    })
    expect(errors[0]?.tab).toBe('settings')
    expect(errors[0]?.fieldId).toBe('interview-round-plan')
  })

  it('collects multiple field errors', () => {
    const errors = validateJobFormRequired({
      ...base,
      jobTitle: '',
      location: '',
    })
    expect(errors.length).toBeGreaterThanOrEqual(2)
  })
})
