import { describe, expect, it } from 'vitest'
import { buildAppliedFilterChips } from './jobsAppliedFilters'

describe('buildAppliedFilterChips', () => {
  const bounds = {
    salaryMin: 0,
    salaryMax: 200000,
    experienceMin: 0,
    experienceMax: 20,
  }

  it('includes committed quick-search scope', () => {
    const chips = buildAppliedFilterChips({
      filters: {
        jobTitle: [],
        company: [],
        experience: [0, 20],
        location: [],
        salary: [0, 200000],
        salaryNotSpecified: false,
        status: 'Active',
        postingDate: '',
      },
      listJobOrigin: '',
      committedScope: { facet: 'title', value: 'Engineer' },
      ...bounds,
    })
    expect(chips.some((c) => c.label.includes('Engineer'))).toBe(true)
  })

  it('counts non-default status', () => {
    const chips = buildAppliedFilterChips({
      filters: {
        jobTitle: [],
        company: [],
        experience: [0, 20],
        location: [],
        salary: [0, 200000],
        salaryNotSpecified: false,
        status: 'Draft',
        postingDate: '',
      },
      listJobOrigin: '',
      committedScope: null,
      ...bounds,
    })
    expect(chips.find((c) => c.id === 'status')?.label).toBe('Status: Draft')
  })
})
