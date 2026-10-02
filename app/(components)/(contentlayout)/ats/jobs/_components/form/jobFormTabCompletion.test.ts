import { describe, expect, it } from 'vitest'
import { computeJobFormTabCompletion } from './jobFormTabCompletion'

describe('computeJobFormTabCompletion', () => {
  const base = {
    jobTitle: 'Engineer',
    organisationName: 'Acme',
    location: 'Remote',
    jobType: { value: 'Full-time', label: 'Full Time' },
    jobDescriptionHtml: '<p>Summary</p>',
    education: '',
    minExperience: '',
    maxExperience: '',
    requirementsHtml: '',
    interviewRoundsCount: 0,
    interviewerPoolCount: 0,
  }

  it('marks general complete when required core fields are set', () => {
    expect(computeJobFormTabCompletion(base).general).toBe('complete')
  })

  it('marks requirements optional until touched', () => {
    expect(computeJobFormTabCompletion(base).requirements).toBe('optional')
  })

  it('marks settings incomplete on create until interview rounds exist', () => {
    expect(
      computeJobFormTabCompletion({
        ...base,
        interviewRoundsCount: 0,
        requireInterviewSetup: true,
      }).settings
    ).toBe('incomplete')
    expect(
      computeJobFormTabCompletion({
        ...base,
        interviewRoundsCount: 1,
        requireInterviewSetup: true,
      }).settings
    ).toBe('complete')
  })
})
