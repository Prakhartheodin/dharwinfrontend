/** Shared filter → API query mapping for Interviews list + export. */

export type InterviewListFilterState = {
  candidate: string[]
  recruiter: string[]
  status: string[]
  type: string[]
}

export type InterviewExportParams = {
  candidate?: string
  recruiter?: string
  status?: string
  interviewType?: string
  sortBy?: string
}

/** POST /meetings/export uses the same filters as the list (omit page/limit). */
export function buildInterviewExportParams(
  filters: InterviewListFilterState,
  options: { sortBy?: string } = {}
): InterviewExportParams {
  const params: InterviewExportParams = {}

  if (options.sortBy) params.sortBy = options.sortBy
  if (filters.candidate.length) params.candidate = filters.candidate.join(',')
  if (filters.recruiter.length) params.recruiter = filters.recruiter.join(',')
  if (filters.status.length) params.status = filters.status.join(',')
  if (filters.type.length) params.interviewType = filters.type.join(',')

  return params
}
