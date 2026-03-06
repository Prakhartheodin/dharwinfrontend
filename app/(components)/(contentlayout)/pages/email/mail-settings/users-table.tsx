"use client"

import React, { Fragment, useMemo, useState, useRef, ChangeEvent } from 'react'
import dynamic from 'next/dynamic'
import { useTable, useSortBy, usePagination } from 'react-table'
import { Countryoptions, Languageoptions } from '@/shared/data/pages/mail/mailsettingdata'

const Select = dynamic(() => import('react-select'), { ssr: false })

interface User {
  id: string
  userName: string
  role: string
  permissions: string[]
}

const TIMEZONE_OPTIONS = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'America/New York (EST)' },
  { value: 'America/Los_Angeles', label: 'America/Los Angeles (PST)' },
  { value: 'Europe/London', label: 'Europe/London (GMT)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
]

const ROLE_OPTIONS = [
  { value: 'Administrator', label: 'Administrator', permissions: ['Full Access', 'User Management', 'Role Management', 'Settings'] },
  { value: 'Manager', label: 'Manager', permissions: ['View Reports', 'User Management', 'Edit Content'] },
  { value: 'Editor', label: 'Editor', permissions: ['Edit Content', 'View Reports'] },
  { value: 'Viewer', label: 'Viewer', permissions: ['View Content', 'View Reports'] },
  { value: 'Guest', label: 'Guest', permissions: ['View Content'] },
]

const USERS_DATA: User[] = [
  { id: '1', userName: 'John Doe', role: 'Administrator', permissions: ['Full Access', 'User Management', 'Role Management', 'Settings'] },
  { id: '2', userName: 'Jane Smith', role: 'Manager', permissions: ['View Reports', 'User Management', 'Edit Content'] },
  { id: '3', userName: 'Bob Wilson', role: 'Editor', permissions: ['Edit Content', 'View Reports'] },
  { id: '4', userName: 'Alice Brown', role: 'Viewer', permissions: ['View Content', 'View Reports'] },
  { id: '5', userName: 'Charlie Davis', role: 'Guest', permissions: ['View Content'] },
]

const UsersTable = () => {
  const [users, setUsers] = useState<User[]>(USERS_DATA)
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const dpInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const [country, setCountry] = useState(Countryoptions[0])
  const [language, setLanguage] = useState(Languageoptions[0])
  const [timezone, setTimezone] = useState(TIMEZONE_OPTIONS[0])
  const [dpPreview, setDpPreview] = useState<string | null>(null)
  const [bio, setBio] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newUserRole, setNewUserRole] = useState(ROLE_OPTIONS[0].value)

  const resetForm = () => {
    setFirstName('')
    setLastName('')
    setEmail('')
    setUsername('')
    setContactNumber('')
    setCountry(Countryoptions[0])
    setLanguage(Languageoptions[0])
    setTimezone(TIMEZONE_OPTIONS[0])
    setDpPreview(null)
    setBio('')
    setNewPassword('')
    setNewUserRole(ROLE_OPTIONS[0].value)
    setFormErrors({})
  }

  const handleDpChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => setDpPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleAddUser = () => {
    const errors: Record<string, string> = {}
    if (!firstName.trim()) errors.firstName = 'First name is required'
    if (!lastName.trim()) errors.lastName = 'Last name is required'
    if (!contactNumber.trim()) errors.contactNumber = 'Contact number is required'
    if (!newPassword.trim()) errors.password = 'Password is required'

    setFormErrors(errors)
    if (Object.keys(errors).length > 0) return

    const roleConfig = ROLE_OPTIONS.find((r) => r.value === newUserRole)
    const fullName = `${firstName.trim()} ${lastName.trim()}`
    const newUser: User = {
      id: String(Date.now()),
      userName: fullName,
      role: newUserRole,
      permissions: roleConfig?.permissions ?? [],
    }
    setUsers((prev) => [...prev, newUser])
    setShowAddUserModal(false)
    resetForm()
  }

  const columns = useMemo(
    () => [
      {
        Header: 'User Name',
        accessor: 'userName',
      },
      {
        Header: 'Role',
        accessor: 'role',
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
              {permissions.slice(0, 3).map((p: string, idx: number) => (
                <span
                  key={idx}
                  className="badge bg-primary/10 text-primary border border-primary/30 px-2 py-0.5 rounded-full text-xs font-medium"
                >
                  {p}
                </span>
              ))}
              {permissions.length > 3 && (
                <span className="badge bg-light text-default px-2 py-0.5 rounded-full text-xs">
                  +{permissions.length - 3}
                </span>
              )}
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
            <div className="hs-tooltip ti-main-tooltip">
              <button
                type="button"
                onClick={() => console.log('Login as:', row.original)}
                className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-success"
              >
                <i className="ri-login-box-line"></i>
                <span className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700" role="tooltip">
                  Login as
                </span>
              </button>
            </div>
            <div className="hs-tooltip ti-main-tooltip">
              <button
                type="button"
                onClick={() => console.log('Edit user:', row.original)}
                className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-info"
              >
                <i className="ri-pencil-line"></i>
                <span className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700" role="tooltip">
                  Edit User
                </span>
              </button>
            </div>
            <div className="hs-tooltip ti-main-tooltip">
              <button
                type="button"
                onClick={() => {
                  if (confirm('Are you sure you want to delete this user?')) {
                    setUsers((prev) => prev.filter((u) => u.id !== row.original.id))
                  }
                }}
                className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-danger"
              >
                <i className="ri-delete-bin-line"></i>
                <span className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700" role="tooltip">
                  Delete User
                </span>
              </button>
            </div>
          </div>
        ),
      },
    ],
    []
  )

  const tableInstance: any = useTable(
    {
      columns,
      data: users,
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

  return (
    <Fragment>
      <div className="flex items-center justify-between flex-wrap gap-4 mb-4 px-4 pt-4">
        <div className="box-title">
          Users
          <span className="badge bg-light text-default rounded-full ms-1 text-[0.75rem] align-middle">
            {users.length}
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
          <button
            type="button"
            className="ti-btn ti-btn-primary-full !py-1 !px-2 !text-[0.75rem]"
            onClick={() => setShowAddUserModal(true)}
          >
            <i className="ri-add-line font-semibold align-middle"></i>Add User
          </button>
        </div>
      </div>
      <div className="table-responsive flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
        <table {...getTableProps()} className="table whitespace-nowrap min-w-full table-striped table-hover table-bordered border-gray-300 dark:border-gray-600">
          <thead>
            {headerGroups.map((headerGroup: any) => (
              <tr {...headerGroup.getHeaderGroupProps()} className="bg-primary/10 dark:bg-primary/20 border-b border-gray-300 dark:border-gray-600" key={Math.random()}>
                {headerGroup.headers.map((column: any) => (
                  <th
                    {...column.getHeaderProps(column.getSortByToggleProps?.() || column.getHeaderProps())}
                    scope="col"
                    className="text-start sticky top-0 z-10 bg-gray-50 dark:bg-black/20"
                    key={Math.random()}
                    style={{ position: 'sticky', top: 0, zIndex: 10 }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="tabletitle">{column.render('Header')}</span>
                      {column.isSorted && (
                        <span>
                          {column.isSortedDesc ? (
                            <i className="ri-arrow-down-s-line text-[0.875rem]"></i>
                          ) : (
                            <i className="ri-arrow-up-s-line text-[0.875rem]"></i>
                          )}
                        </span>
                      )}
                    </div>
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
                  {row.cells.map((cell: any) => (
                    <td {...cell.getCellProps()} key={Math.random()}>
                      {cell.render('Cell')}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="box-footer !border-t-0">
        <div className="flex flex-wrap gap-4">
          <div>
            Showing {pageIndex * pageSize + 1} to {Math.min((pageIndex + 1) * pageSize, users.length)} of {users.length} entries
          </div>
          <div className="ms-auto">
            <nav aria-label="Page navigation" className="pagination-style-4">
              <ul className="ti-pagination mb-0">
                <li className={`page-item ${!canPreviousPage ? 'disabled' : ''}`}>
                  <button className="page-link px-3 py-[0.375rem]" onClick={() => previousPage()} disabled={!canPreviousPage}>
                    Prev
                  </button>
                </li>
                {pageOptions.map((p: number) => (
                  <li key={p} className={`page-item ${pageIndex === p ? 'active' : ''}`}>
                    <button className="page-link px-3 py-[0.375rem]" onClick={() => gotoPage(p)}>
                      {p + 1}
                    </button>
                  </li>
                ))}
                <li className={`page-item ${!canNextPage ? 'disabled' : ''}`}>
                  <button className="page-link px-3 py-[0.375rem] text-primary" onClick={() => nextPage()} disabled={!canNextPage}>
                    Next
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 dark:bg-black/70"
            onClick={() => { setShowAddUserModal(false); resetForm(); }}
            aria-hidden="true"
          />
          <div className="relative ti-modal-content bg-white dark:bg-bodybg rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col">
            <div className="ti-modal-header flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <h6 className="ti-modal-title text-lg font-semibold">Add User</h6>
              <button
                type="button"
                className="ti-modal-close-btn p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => { setShowAddUserModal(false); resetForm(); }}
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            <div className="ti-modal-body px-4 py-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-12 gap-4">
                <div className="xl:col-span-6 col-span-12">
                  <label htmlFor="add-first-name" className="form-label">First Name <span className="text-danger">*</span></label>
                  <input
                    id="add-first-name"
                    type="text"
                    className={`form-control ${formErrors.firstName ? 'border-danger' : ''}`}
                    placeholder="Enter first name"
                    value={firstName}
                    onChange={(e) => { setFirstName(e.target.value); setFormErrors((p) => ({ ...p, firstName: '' })) }}
                  />
                  {formErrors.firstName && <p className="text-danger text-xs mt-1">{formErrors.firstName}</p>}
                </div>
                <div className="xl:col-span-6 col-span-12">
                  <label htmlFor="add-last-name" className="form-label">Last Name <span className="text-danger">*</span></label>
                  <input
                    id="add-last-name"
                    type="text"
                    className={`form-control ${formErrors.lastName ? 'border-danger' : ''}`}
                    placeholder="Enter last name"
                    value={lastName}
                    onChange={(e) => { setLastName(e.target.value); setFormErrors((p) => ({ ...p, lastName: '' })) }}
                  />
                  {formErrors.lastName && <p className="text-danger text-xs mt-1">{formErrors.lastName}</p>}
                </div>
                <div className="xl:col-span-6 col-span-12">
                  <label htmlFor="add-email" className="form-label">Email</label>
                  <input
                    id="add-email"
                    type="email"
                    className="form-control"
                    placeholder="Enter email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="xl:col-span-6 col-span-12">
                  <label htmlFor="add-username" className="form-label">Username</label>
                  <input
                    id="add-username"
                    type="text"
                    className="form-control"
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div className="xl:col-span-6 col-span-12">
                  <label htmlFor="add-contact" className="form-label">Contact Number <span className="text-danger">*</span></label>
                  <input
                    id="add-contact"
                    type="tel"
                    className={`form-control ${formErrors.contactNumber ? 'border-danger' : ''}`}
                    placeholder="Enter contact number"
                    value={contactNumber}
                    onChange={(e) => { setContactNumber(e.target.value); setFormErrors((p) => ({ ...p, contactNumber: '' })) }}
                  />
                  {formErrors.contactNumber && <p className="text-danger text-xs mt-1">{formErrors.contactNumber}</p>}
                </div>
                <div className="xl:col-span-6 col-span-12">
                  <label htmlFor="add-password" className="form-label">Password <span className="text-danger">*</span></label>
                  <input
                    id="add-password"
                    type="password"
                    className={`form-control ${formErrors.password ? 'border-danger' : ''}`}
                    placeholder="Enter password"
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setFormErrors((p) => ({ ...p, password: '' })) }}
                  />
                  {formErrors.password && <p className="text-danger text-xs mt-1">{formErrors.password}</p>}
                </div>
                <div className="xl:col-span-6 col-span-12">
                  <label className="form-label">Country</label>
                  <Select
                    options={Countryoptions}
                    value={country}
                    onChange={(opt: any) => setCountry(opt || Countryoptions[0])}
                    className="w-full"
                    classNamePrefix="Select2"
                    menuPlacement="auto"
                  />
                </div>
                <div className="xl:col-span-6 col-span-12">
                  <label className="form-label">Language</label>
                  <Select
                    options={Languageoptions}
                    value={language}
                    onChange={(opt: any) => setLanguage(opt || Languageoptions[0])}
                    className="w-full"
                    classNamePrefix="Select2"
                    menuPlacement="auto"
                  />
                </div>
                <div className="xl:col-span-6 col-span-12">
                  <label className="form-label">Timezone</label>
                  <Select
                    options={TIMEZONE_OPTIONS}
                    value={timezone}
                    onChange={(opt: any) => setTimezone(opt || TIMEZONE_OPTIONS[0])}
                    className="w-full"
                    classNamePrefix="Select2"
                    menuPlacement="auto"
                  />
                </div>
                <div className="xl:col-span-6 col-span-12">
                  <label className="form-label">Role</label>
                  <select
                    className="form-control"
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value)}
                  >
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                </div>
                <div className="xl:col-span-12 col-span-12">
                  <label className="form-label">Display Picture (DP)</label>
                  <div className="flex items-center gap-4">
                    <div
                      className="w-16 h-16 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center cursor-pointer overflow-hidden bg-gray-50 dark:bg-gray-800"
                      onClick={() => dpInputRef.current?.click()}
                    >
                      {dpPreview ? (
                        <img src={dpPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <i className="ri-user-add-line text-2xl text-gray-400"></i>
                      )}
                    </div>
                    <input
                      ref={dpInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleDpChange}
                    />
                    <span className="text-xs text-muted">Click to upload photo</span>
                  </div>
                </div>
                <div className="xl:col-span-12 col-span-12">
                  <label htmlFor="add-bio" className="form-label">Bio</label>
                  <textarea
                    id="add-bio"
                    className="form-control"
                    rows={3}
                    placeholder="Enter bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="ti-modal-footer px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                className="ti-btn ti-btn-light"
                onClick={() => { setShowAddUserModal(false); resetForm(); }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ti-btn ti-btn-primary-full"
                onClick={handleAddUser}
              >
                Create User
              </button>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  )
}

export default UsersTable
