import { describe, expect, it } from 'vitest'
import { buildInterviewExportParams } from '../ats/interview-list-query'

describe('buildInterviewExportParams', () => {
  const baseFilters = {
    candidate: ['John Anderson'],
    recruiter: ['Sarah Johnson'],
    status: ['ended', 'scheduled'],
    type: ['Video', 'Phone'],
  }

  it('maps multi-select filters to comma-separated query params', () => {
    const params = buildInterviewExportParams(baseFilters)
    expect(params).toEqual({
      candidate: 'John Anderson',
      recruiter: 'Sarah Johnson',
      status: 'ended,scheduled',
      interviewType: 'Video,Phone',
    })
  })

  it('omits empty filter arrays', () => {
    const params = buildInterviewExportParams({
      candidate: [],
      recruiter: [],
      status: [],
      type: [],
    })
    expect(params).toEqual({})
  })
})
