/** Container-width breakpoints for the applications list (inline-size of `.applications-list-container`). */
export const APPLICATIONS_LIST_TABLE_MIN_WIDTH = 640

/** Progressive column reveal (container inline-size, px). Hide before squeeze, widest last. */
export const APPLICATIONS_COL_APPLIED_MIN = 1040
export const APPLICATIONS_COL_DEPARTMENT_MIN = 1120
export const APPLICATIONS_COL_CULTURE_MIN = 1160
export const APPLICATIONS_COL_DOCUMENTS_MIN = 1280

export type ApplicationsListLayout = 'cards' | 'table'

export type ApplicationsTableColumnId =
  | 'applicant'
  | 'job'
  | 'department'
  | 'status'
  | 'success'
  | 'culture'
  | 'applied'
  | 'documents'
  | 'actions'

export const APPLICATIONS_TABLE_COLUMN_CLASS: Record<ApplicationsTableColumnId, string> = {
  applicant: 'applications-col-applicant',
  job: 'applications-col-job',
  department: 'applications-col-department',
  status: 'applications-col-status',
  success: 'applications-col-success',
  culture: 'applications-col-culture',
  applied: 'applications-col-applied',
  documents: 'applications-col-documents',
  actions: 'applications-col-actions',
}

export function getApplicationsListLayout(containerWidth: number): ApplicationsListLayout {
  return containerWidth >= APPLICATIONS_LIST_TABLE_MIN_WIDTH ? 'table' : 'cards'
}

/** Mirrors container-query column rules for unit tests. */
export function isApplicationsTableColumnVisible(
  columnId: ApplicationsTableColumnId,
  containerWidth: number
): boolean {
  if (getApplicationsListLayout(containerWidth) === 'cards') return false
  if (columnId === 'department') return containerWidth >= APPLICATIONS_COL_DEPARTMENT_MIN
  if (columnId === 'culture') return containerWidth >= APPLICATIONS_COL_CULTURE_MIN
  if (columnId === 'applied') return containerWidth >= APPLICATIONS_COL_APPLIED_MIN
  if (columnId === 'documents') return containerWidth >= APPLICATIONS_COL_DOCUMENTS_MIN
  return true
}
