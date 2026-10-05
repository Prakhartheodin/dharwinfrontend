import type { Dispatch, SetStateAction } from 'react'
import type { JobListQueryScope, JobSidebarFilters } from '@/shared/lib/ats/job-list-filters'

export type AppliedFilterChip = {
  id: string
  label: string
}

export const APPLIED_FILTER_CHIP_CLASS =
  'inline-flex items-center gap-1 rounded-full border border-defaultborder/70 dark:border-white/10 bg-gray-50 dark:bg-white/[0.04] px-2 py-0.5 text-[0.7rem] font-medium text-defaulttextcolor max-w-full'

export function buildAppliedFilterChips(input: {
  filters: JobSidebarFilters
  listJobOrigin: '' | 'internal' | 'external'
  committedScope: JobListQueryScope | null
  salaryMin: number
  salaryMax: number
  experienceMin: number
  experienceMax: number
}): AppliedFilterChip[] {
  const { filters, listJobOrigin, committedScope, salaryMin, salaryMax, experienceMin, experienceMax } =
    input
  const chips: AppliedFilterChip[] = []

  if (committedScope) {
    const facetLabel =
      committedScope.facet === 'title'
        ? 'Title'
        : committedScope.facet === 'company'
          ? 'Company'
          : 'Location'
    chips.push({
      id: `scope:${committedScope.facet}:${committedScope.value}`,
      label: `${facetLabel}: ${committedScope.value}`,
    })
  }

  if (listJobOrigin) {
    chips.push({
      id: 'origin',
      label: listJobOrigin === 'external' ? 'Listing: External' : 'Listing: Internal',
    })
  }

  if (filters.status && filters.status !== 'Active') {
    chips.push({ id: 'status', label: `Status: ${filters.status}` })
  }

  if (filters.postingDate) {
    chips.push({ id: 'postingDate', label: `Posted: ${filters.postingDate}` })
  }

  filters.jobTitle.forEach((t) => chips.push({ id: `jobTitle:${t}`, label: `Title: ${t}` }))
  filters.company.forEach((c) => chips.push({ id: `company:${c}`, label: `Company: ${c}` }))
  filters.location.forEach((l) => chips.push({ id: `location:${l}`, label: `Location: ${l}` }))

  if (filters.experience[0] !== experienceMin || filters.experience[1] !== experienceMax) {
    chips.push({
      id: 'experience',
      label: `Experience: ${filters.experience[0]}–${filters.experience[1]} yrs`,
    })
  }

  if (filters.salaryNotSpecified) {
    chips.push({ id: 'salary-ns', label: 'Salary: Not specified' })
  } else if (filters.salary[0] !== salaryMin || filters.salary[1] !== salaryMax) {
    const minLabel =
      filters.salary[0] === salaryMin ? 'Any' : `$${filters.salary[0].toLocaleString('en-US')}`
    const maxLabel =
      filters.salary[1] === salaryMax ? 'Any' : `$${filters.salary[1].toLocaleString('en-US')}`
    chips.push({ id: 'salary', label: `Salary: ${minLabel} – ${maxLabel}` })
  }

  return chips
}

export function removeAppliedFilterChip(
  chipId: string,
  ctx: {
    filters: JobSidebarFilters
    setFilters: Dispatch<SetStateAction<JobSidebarFilters>>
    setListJobOrigin: Dispatch<SetStateAction<'' | 'internal' | 'external'>>
    setCommittedScope: Dispatch<SetStateAction<JobListQueryScope | null>>
    salaryMin: number
    salaryMax: number
    experienceMin: number
    experienceMax: number
    defaultStatus: string
  }
): void {
  const {
    setFilters,
    setListJobOrigin,
    setCommittedScope,
    salaryMin,
    salaryMax,
    experienceMin,
    experienceMax,
    defaultStatus,
  } = ctx

  if (chipId.startsWith('scope:')) {
    setCommittedScope(null)
    return
  }
  if (chipId === 'origin') {
    setListJobOrigin('')
    return
  }
  if (chipId === 'status') {
    setFilters((prev) => ({ ...prev, status: defaultStatus }))
    return
  }
  if (chipId === 'postingDate') {
    setFilters((prev) => ({ ...prev, postingDate: '' }))
    return
  }
  if (chipId.startsWith('jobTitle:')) {
    const v = chipId.slice('jobTitle:'.length)
    setFilters((prev) => ({ ...prev, jobTitle: prev.jobTitle.filter((x) => x !== v) }))
    return
  }
  if (chipId.startsWith('company:')) {
    const v = chipId.slice('company:'.length)
    setFilters((prev) => ({ ...prev, company: prev.company.filter((x) => x !== v) }))
    return
  }
  if (chipId.startsWith('location:')) {
    const v = chipId.slice('location:'.length)
    setFilters((prev) => ({ ...prev, location: prev.location.filter((x) => x !== v) }))
    return
  }
  if (chipId === 'experience') {
    setFilters((prev) => ({
      ...prev,
      experience: [experienceMin, experienceMax] as [number, number],
    }))
    return
  }
  if (chipId === 'salary-ns') {
    setFilters((prev) => ({
      ...prev,
      salaryNotSpecified: false,
      salary: [salaryMin, salaryMax] as [number, number],
    }))
    return
  }
  if (chipId === 'salary') {
    setFilters((prev) => ({
      ...prev,
      salaryNotSpecified: false,
      salary: [salaryMin, salaryMax] as [number, number],
    }))
  }
}
