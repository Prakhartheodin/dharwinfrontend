export type ColumnAriaSort = 'ascending' | 'descending' | 'none'

export function jobsTableColumnAriaSort(
  columnId: string,
  selectedSort: string
): ColumnAriaSort | undefined {
  if (columnId === 'jobTitle') {
    if (selectedSort === 'title-asc') return 'ascending'
    if (selectedSort === 'title-desc') return 'descending'
    return 'none'
  }
  if (columnId === 'company') {
    if (selectedSort === 'company-asc') return 'ascending'
    if (selectedSort === 'company-desc') return 'descending'
    return 'none'
  }
  return undefined
}

export function jobsTableSortButtonLabel(columnId: 'jobTitle' | 'company', selectedSort: string): string {
  const sort = jobsTableColumnAriaSort(columnId, selectedSort)
  const base = columnId === 'jobTitle' ? 'Job title' : 'Company'
  if (sort === 'ascending') return `${base}, sorted ascending`
  if (sort === 'descending') return `${base}, sorted descending`
  return `${base}, sort`
}
