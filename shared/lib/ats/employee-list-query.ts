/** Shared filter → API query mapping for Active Employees list + export. */

export type EmployeeListFilterState = {
  agentIds: string[]
  employmentStatus: 'current' | 'resigned' | 'all'
  compensationType: '' | 'paid' | 'unpaid'
}

export type BuildEmployeesListQueryOptions = {
  search?: string
  sortBy?: string
  page?: number
  limit?: number
  includeOpenSopCount?: boolean | '1' | '0' | 'true' | 'false'
}

export type EmployeesListQueryParams = Record<string, string | number | boolean>

export function buildEmployeesListQueryParams(
  filters: EmployeeListFilterState,
  options: BuildEmployeesListQueryOptions = {}
): EmployeesListQueryParams {
  const params: EmployeesListQueryParams = {}

  if (options.sortBy) params.sortBy = options.sortBy
  if (options.page != null) params.page = options.page
  if (options.limit != null) params.limit = options.limit
  if (options.includeOpenSopCount != null) {
    params.includeOpenSopCount =
      options.includeOpenSopCount === true ||
      options.includeOpenSopCount === '1' ||
      options.includeOpenSopCount === 'true'
        ? '1'
        : '0'
  }

  const search = options.search?.trim()
  if (search) params.search = search

  if (filters.agentIds?.length) params.agentIds = filters.agentIds.join(',')
  params.employmentStatus = filters.employmentStatus
  if (filters.compensationType) params.compensationType = filters.compensationType

  return params
}
