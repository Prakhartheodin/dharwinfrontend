/** Container-width breakpoints for the employees list (inline-size of `.employees-list-container`). */
export const EMPLOYEES_LIST_TABLE_MIN_WIDTH = 640

/** Progressive column reveal (container inline-size, px). */
export const EMPLOYEES_COL_JOINING_MIN = 880

export type EmployeesListLayout = 'cards' | 'table'

export type EmployeesTableColumnId = 'checkbox' | 'candidateInfo' | 'joiningDate' | 'actions'

/** Maps react-table column id → CSS class toggled by container queries in globals.scss. */
export const EMPLOYEES_TABLE_COLUMN_CLASS: Record<EmployeesTableColumnId, string> = {
  checkbox: 'employees-col-checkbox',
  candidateInfo: 'employees-col-candidateInfo',
  joiningDate: 'employees-col-joining',
  actions: 'employees-col-actions',
}

export function employeesTableColumnClass(columnId: string): string {
  const key: EmployeesTableColumnId =
    columnId === 'id' ? 'actions' : (columnId as EmployeesTableColumnId)
  return EMPLOYEES_TABLE_COLUMN_CLASS[key] ?? ''
}

export function getEmployeesListLayout(containerWidth: number): EmployeesListLayout {
  return containerWidth >= EMPLOYEES_LIST_TABLE_MIN_WIDTH ? 'table' : 'cards'
}

/** Mirrors container-query column rules for unit tests. */
export function isEmployeesTableColumnVisible(
  columnId: EmployeesTableColumnId,
  containerWidth: number
): boolean {
  if (getEmployeesListLayout(containerWidth) === 'cards') return false
  if (columnId === 'joiningDate') return containerWidth >= EMPLOYEES_COL_JOINING_MIN
  return true
}
