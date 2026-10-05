import { describe, expect, it } from 'vitest'
import { buildJobListParams, type JobListQueryInput } from '../ats/job-list-filters'

const BASE: JobListQueryInput = {
  page: 1,
  limit: 100,
  sortBy: 'createdAt:desc',
  search: '',
  listJobOrigin: '',
  filters: {
    jobTitle: [],
    company: [],
    location: [],
    experience: [0, 20],
    salary: [0, 200000],
    salaryNotSpecified: false,
    status: 'Active',
    postingDate: '',
  },
  salaryBounds: { min: 0, max: 200000 },
  experienceBounds: { min: 0, max: 20 },
  scope: null,
}

describe('buildJobListParams quick search', () => {
  it('sends toolbar search when there is no committed scope', () => {
    const params = buildJobListParams({ ...BASE, search: 'test' })
    expect(params.search).toBe('test')
    expect(params.searchFields).toBe('toolbar')
    expect(params.titles).toBeUndefined()
  })

  it('drops search and scopes title when a suggestion is committed', () => {
    const params = buildJobListParams({
      ...BASE,
      search: 'test',
      scope: { facet: 'title', value: 'AI TEST JOB' },
    })
    expect(params.search).toBeUndefined()
    expect(params.titles).toEqual(['AI TEST JOB'])
  })
})
