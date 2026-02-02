"use client"
import React, { Fragment, useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { useTable, useSortBy, usePagination } from 'react-table'

// Mock data for user roles
interface UserRole {
  id: string
  roleType: string
  permissions: string[]
}

// Permission descriptions for popover explanations
const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  'Full Access': 'Grants complete access to all features and settings in the system. Users with this permission can view, create, edit, and delete any content.',
  'User Management': 'Allows managing user accounts—creating new users, editing profiles, deactivating accounts, and assigning roles.',
  'Role Management': 'Enables creating, editing, and deleting roles. Users can define permission sets and assign them to roles.',
  'Settings': 'Access to system configuration and preferences. Can modify application settings, integrations, and global options.',
  'View Reports': 'Permission to view analytics, dashboards, and generated reports. Read-only access to reporting features.',
  'Edit Content': 'Allows creating and modifying content across the system. Users can add, update, and edit records.',
  'View Content': 'Read-only access to view content. Users can browse and read but cannot create, edit, or delete.',
}

const getPermissionDescription = (permission: string): string => {
  if (PERMISSION_DESCRIPTIONS[permission]) {
    return PERMISSION_DESCRIPTIONS[permission]
  }
  const match = permission.match(/^(.+?)\s*-\s*(.+)$/)
  if (match) {
    const [, feature, action] = match
    const actionDesc = action === 'View' ? 'view and read records' : action === 'Create' ? 'create new records' : action === 'Edit' ? 'modify existing records' : action === 'Delete' ? 'remove records' : action.toLowerCase()
    return `Allows users to ${actionDesc} in ${feature}.`
  }
  return `Permission to access ${permission}.`
}

const USER_ROLES_DATA: UserRole[] = [
  {
    id: '1',
    roleType: 'Administrator',
    permissions: ['Full Access', 'User Management', 'Role Management', 'Settings']
  },
  {
    id: '2',
    roleType: 'Manager',
    permissions: ['View Reports', 'User Management', 'Edit Content']
  },
  {
    id: '3',
    roleType: 'Editor',
    permissions: ['Edit Content', 'View Reports']
  },
  {
    id: '4',
    roleType: 'Viewer',
    permissions: ['View Content', 'View Reports']
  },
  {
    id: '5',
    roleType: 'Guest',
    permissions: ['View Content']
  }
]

const UserRolesTable = () => {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [editingRole, setEditingRole] = useState<UserRole | null>(null)
  const [roles, setRoles] = useState<UserRole[]>(USER_ROLES_DATA)
  const [permissionPopover, setPermissionPopover] = useState<{ permission: string; description: string; top: number; left: number } | null>(null)

  // Close permission popover on click outside or escape
  useEffect(() => {
    if (!permissionPopover) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-permission-popover]') && !target.closest('[data-permission-trigger]')) {
        setPermissionPopover(null)
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPermissionPopover(null)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [permissionPopover])

  // Check for newly created role from create-role page
  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = sessionStorage.getItem('newly-created-role')
    if (stored) {
      try {
        const newRole = JSON.parse(stored) as UserRole
        setRoles((prev) => [...prev, newRole])
        sessionStorage.removeItem('newly-created-role')
      } catch {
        sessionStorage.removeItem('newly-created-role')
      }
    }
  }, [])

  // Handle row selection
  const handleRowSelect = (id: string) => {
    const newSelected = new Set(selectedRows)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedRows(newSelected)
  }

  // Handle delete role
  const handleDeleteRole = (id: string) => {
    if (confirm('Are you sure you want to delete this role?')) {
      setRoles(roles.filter(role => role.id !== id))
      setSelectedRows(prev => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
    }
  }

  // Handle edit role
  const handleEditRole = (role: UserRole) => {
    setEditingRole(role)
    // TODO: Open edit modal/form
    console.log('Edit role:', role)
  }

  // Define columns
  const columns = useMemo(
    () => [
      {
        Header: 'All',
        accessor: 'checkbox',
        disableSortBy: true,
        Cell: ({ row }: any) => (
          <input
            className="form-check-input"
            type="checkbox"
            checked={selectedRows.has(row.original.id)}
            onChange={() => handleRowSelect(row.original.id)}
            aria-label={`Select ${row.original.roleType}`}
          />
        ),
      },
      {
        Header: 'S.no.',
        accessor: 'sno',
        disableSortBy: true,
        Cell: ({ row, state }: any) => {
          const { pageIndex, pageSize } = state
          return pageIndex * pageSize + row.index + 1
        },
      },
      {
        Header: 'Role Type',
        accessor: 'roleType',
      },
      {
        Header: 'Permissions',
        accessor: 'permissions',
        disableSortBy: true,
        Cell: ({ row }: any) => {
          const permissions = row.original.permissions
          if (!permissions?.length) return null
          return (
            <div className="flex flex-wrap gap-1">
              {permissions.map((permission: string, idx: number) => (
                <span
                  key={`${row.original.id}-${idx}`}
                  data-permission-trigger
                  className="badge bg-primary/10 text-primary border border-primary/30 px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:bg-primary/20 transition-colors"
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation()
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                    setPermissionPopover({
                      permission,
                      description: getPermissionDescription(permission),
                      top: rect.bottom + 8,
                      left: rect.left,
                    })
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                      setPermissionPopover({
                        permission,
                        description: getPermissionDescription(permission),
                        top: rect.bottom + 8,
                        left: rect.left,
                      })
                    }
                  }}
                >
                  {permission}
                </span>
              ))}
            </div>
          )
        },
      },
      {
        Header: 'Action',
        accessor: 'id',
        disableSortBy: true,
        Cell: ({ row }: any) => (
          <div className="flex items-center gap-2">
            {row.original.roleType !== 'Administrator' && (
              <>
            <div className="hs-tooltip ti-main-tooltip">
              <button
                type="button"
                onClick={() => handleEditRole(row.original)}
                className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-info"
              >
                <i className="ri-pencil-line"></i>
                <span
                  className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700"
                  role="tooltip">
                  Edit Role
                </span>
              </button>
            </div>
              <div className="hs-tooltip ti-main-tooltip">
                <button
                  type="button"
                  onClick={() => handleDeleteRole(row.original.id)}
                  className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-danger"
                >
                  <i className="ri-delete-bin-line"></i>
                  <span
                    className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700"
                    role="tooltip">
                    Delete Role
                  </span>
                </button>
              </div>
              </>
            )}
          </div>
        ),
      },
    ],
    [selectedRows]
  )

  const data = useMemo(() => roles, [roles])

  const tableInstance: any = useTable(
    {
      columns,
      data,
      initialState: { pageIndex: 0, pageSize: 10 },
    },
    useSortBy,
    usePagination
  )

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    state,
    page,
    nextPage,
    previousPage,
    canNextPage,
    canPreviousPage,
    pageOptions,
    gotoPage,
    pageCount,
    setPageSize,
  } = tableInstance

  const { pageIndex, pageSize } = state

  // Handle select all checkbox
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = new Set(roles.map((role) => role.id))
      setSelectedRows(allIds)
    } else {
      setSelectedRows(new Set())
    }
  }

  // Check if all rows are selected
  const isAllSelected = selectedRows.size === roles.length && roles.length > 0
  const isIndeterminate = selectedRows.size > 0 && selectedRows.size < roles.length

  return (
    <Fragment>
        <div className="flex items-center justify-between flex-wrap gap-4 mb-4 px-4 pt-4">
          <div className="box-title">
            User Roles
            <span className="badge bg-light text-default rounded-full ms-1 text-[0.75rem] align-middle">
              {roles.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              className="form-control !w-auto !py-1 !px-4 !text-[0.75rem] me-2"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  Show {size}
                </option>
              ))}
            </select>
            <Link
              href="/pages/email/mail-settings/create-role"
              className="ti-btn ti-btn-primary-full !py-1 !px-2 !text-[0.75rem]"
            >
              <i className="ri-add-line font-semibold align-middle"></i>Create Role
            </Link>
            {selectedRows.size > 0 && (
              <button
                type="button"
                className="ti-btn ti-btn-danger !py-1 !px-2 !text-[0.75rem]"
                onClick={() => {
                  if (confirm(`Are you sure you want to delete ${selectedRows.size} role(s)?`)) {
                    setRoles(roles.filter(role => !selectedRows.has(role.id)))
                    setSelectedRows(new Set())
                  }
                }}
              >
                <i className="ri-delete-bin-line font-semibold align-middle me-1"></i>Delete Selected ({selectedRows.size})
              </button>
            )}
          </div>
        </div>
        <div className="table-responsive flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
          <table {...getTableProps()} className="table whitespace-nowrap min-w-full table-striped table-hover table-bordered border-gray-300 dark:border-gray-600">
            <thead>
              {headerGroups.map((headerGroup: any) => (
                <tr {...headerGroup.getHeaderGroupProps()} className="bg-primary/10 dark:bg-primary/20 border-b border-gray-300 dark:border-gray-600" key={Math.random()}>
                  {headerGroup.headers.map((column: any) => (
                    <th
                      {...column.getHeaderProps(column.getSortByToggleProps())}
                      scope="col"
                      className="text-start sticky top-0 z-10 bg-gray-50 dark:bg-black/20"
                      key={Math.random()}
                      style={{ 
                        position: 'sticky', 
                        top: 0, 
                        zIndex: 10
                      }}
                    >
                      {column.id === 'checkbox' ? (
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={isAllSelected}
                          ref={(input) => {
                            if (input) input.indeterminate = isIndeterminate
                          }}
                          onChange={handleSelectAll}
                          aria-label="Select all"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="tabletitle">{column.render('Header')}</span>
                          <span>
                            {column.isSorted ? (
                              column.isSortedDesc ? (
                                <i className="ri-arrow-down-s-line text-[0.875rem]"></i>
                              ) : (
                                <i className="ri-arrow-up-s-line text-[0.875rem]"></i>
                              )
                            ) : (
                              ''
                            )}
                          </span>
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody {...getTableBodyProps()}>
              {page.map((row: any) => {
                prepareRow(row)
                return (
                  <tr {...row.getRowProps()} className="border-b border-gray-300 dark:border-gray-600" key={Math.random()}>
                    {row.cells.map((cell: any) => {
                      return (
                        <td {...cell.getCellProps()} key={Math.random()}>
                          {cell.render('Cell')}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="box-footer !border-t-0">
          <div className="flex items-center flex-wrap gap-4">
            <div>
              Showing {pageIndex * pageSize + 1} to {Math.min((pageIndex + 1) * pageSize, data.length)} of {data.length} entries{' '}
              <i className="bi bi-arrow-right ms-2 font-semibold"></i>
            </div>
            <div className="ms-auto">
              <nav aria-label="Page navigation" className="pagination-style-4">
                <ul className="ti-pagination mb-0">
                  <li className={`page-item ${!canPreviousPage ? 'disabled' : ''}`}>
                    <button
                      className="page-link px-3 py-[0.375rem]"
                      onClick={() => previousPage()}
                      disabled={!canPreviousPage}
                    >
                      Prev
                    </button>
                  </li>
                  {pageOptions.length <= 7 ? (
                    pageOptions.map((page: number) => (
                      <li
                        key={page}
                        className={`page-item ${pageIndex === page ? 'active' : ''}`}
                      >
                        <button
                          className="page-link px-3 py-[0.375rem]"
                          onClick={() => gotoPage(page)}
                        >
                          {page + 1}
                        </button>
                      </li>
                    ))
                  ) : (
                    <>
                      {pageIndex > 2 && (
                        <>
                          <li className="page-item">
                            <button
                              className="page-link px-3 py-[0.375rem]"
                              onClick={() => gotoPage(0)}
                            >
                              1
                            </button>
                          </li>
                          {pageIndex > 3 && (
                            <li className="page-item disabled">
                              <span className="page-link px-3 py-[0.375rem]">...</span>
                            </li>
                          )}
                        </>
                      )}
                      {Array.from({ length: Math.min(5, pageCount) }, (_, i) => {
                        let pageNum
                        if (pageIndex < 3) {
                          pageNum = i
                        } else if (pageIndex > pageCount - 4) {
                          pageNum = pageCount - 5 + i
                        } else {
                          pageNum = pageIndex - 2 + i
                        }
                        return (
                          <li
                            key={pageNum}
                            className={`page-item ${pageIndex === pageNum ? 'active' : ''}`}
                          >
                            <button
                              className="page-link px-3 py-[0.375rem]"
                              onClick={() => gotoPage(pageNum)}
                            >
                              {pageNum + 1}
                            </button>
                          </li>
                        )
                      })}
                      {pageIndex < pageCount - 3 && (
                        <>
                          {pageIndex < pageCount - 4 && (
                            <li className="page-item disabled">
                              <span className="page-link px-3 py-[0.375rem]">...</span>
                            </li>
                          )}
                          <li className="page-item">
                            <button
                              className="page-link px-3 py-[0.375rem]"
                              onClick={() => gotoPage(pageCount - 1)}
                            >
                              {pageCount}
                            </button>
                          </li>
                        </>
                      )}
                    </>
                  )}
                  <li className={`page-item ${!canNextPage ? 'disabled' : ''}`}>
                    <button
                      className="page-link px-3 py-[0.375rem] text-primary"
                      onClick={() => nextPage()}
                      disabled={!canNextPage}
                    >
                      Next
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>

        {/* Permission explanation popover */}
        {permissionPopover && (
          <div
            data-permission-popover
            className="fixed z-[110] max-w-[280px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-bodybg shadow-xl"
            style={{ top: permissionPopover.top, left: permissionPopover.left }}
          >
            <div className="border-b border-gray-200 dark:border-gray-700 py-2 px-4 font-semibold text-defaulttextcolor">
              {permissionPopover.permission}
            </div>
            <p className="text-defaulttextcolor text-[0.8rem] py-4 px-4">
              {permissionPopover.description}
            </p>
          </div>
        )}
    </Fragment>
  )
}

export default UserRolesTable
