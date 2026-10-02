import { describe, expect, it } from 'vitest'
import { jobsTableColumnAriaSort, jobsTableSortButtonLabel } from './jobsTableSortA11y'

describe('jobsTableSortA11y', () => {
  it('maps title sort to aria-sort', () => {
    expect(jobsTableColumnAriaSort('jobTitle', 'title-asc')).toBe('ascending')
    expect(jobsTableColumnAriaSort('jobTitle', 'title-desc')).toBe('descending')
    expect(jobsTableColumnAriaSort('jobTitle', 'newest-first')).toBe('none')
  })

  it('builds sort button labels', () => {
    expect(jobsTableSortButtonLabel('company', 'company-desc')).toBe('Company, sorted descending')
  })
})
