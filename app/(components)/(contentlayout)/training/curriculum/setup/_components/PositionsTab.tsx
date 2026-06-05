"use client"

import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment, useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import Swal from 'sweetalert2'
import { AxiosError } from 'axios'
import * as positionsApi from '@/shared/lib/api/positions'
import type { PositionRosterItem } from '@/shared/lib/api/positions'
import * as trainingModulesApi from '@/shared/lib/api/training-modules'
import type { TrainingModule } from '@/shared/lib/api/training-modules'
import { useAuth } from '@/shared/contexts/auth-context'
import { hasPermission } from '@/shared/lib/permissions'

export default function PositionsTab() {
  const auth = useAuth()
  const canViewModules = hasPermission(auth, 'view_training_positions')
  const canManageModules =
    hasPermission(auth, 'edit_training_module') || hasPermission(auth, 'edit_training_position')

  const [positions, setPositions] = useState<PositionRosterItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [sortBy, setSortBy] = useState<string>('name:asc')

  // Module assignment (view-only roster, but modules can be linked per position)
  const [allModules, setAllModules] = useState<TrainingModule[]>([])
  const [modulesLoading, setModulesLoading] = useState(false)
  const [manageTarget, setManageTarget] = useState<PositionRosterItem | null>(null)
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([])
  const [savingModules, setSavingModules] = useState(false)

  const fetchPositions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await positionsApi.getPositionRoster()
      setPositions(Array.isArray(res) ? res : [])
    } catch (err) {
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : 'Failed to load positions.'
      await Swal.fire({
        icon: 'error',
        title: 'Failed to load positions',
        text: msg,
        toast: true,
        position: 'top-end',
        timer: 4000,
        showConfirmButton: false,
        timerProgressBar: true,
      })
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchModules = useCallback(async () => {
    if (!canManageModules) return
    setModulesLoading(true)
    try {
      const res = await trainingModulesApi.listTrainingModules({ limit: 500, page: 1 })
      setAllModules(res.results ?? [])
    } catch {
      setAllModules([])
    } finally {
      setModulesLoading(false)
    }
  }, [canManageModules])

  useEffect(() => {
    fetchPositions()
  }, [fetchPositions])

  useEffect(() => {
    fetchModules()
  }, [fetchModules])

  const positionId = (pos: PositionRosterItem) => pos.id || (pos as { _id?: string })._id || ''

  const isUnlinkedPosition = (pos: PositionRosterItem) =>
    Boolean(pos.unlinked) || positionId(pos).startsWith('unlinked:')

  const employeeProfileHref = (employeeId: string) =>
    `/ats/employees/edit/?id=${encodeURIComponent(employeeId)}`

  const renderAssignedModules = (pos: PositionRosterItem) => {
    const assigned = pos.assignedModules ?? []
    if (assigned.length === 0) {
      return <span className="text-defaulttextcolor/50">—</span>
    }
    return (
      <div className="flex flex-wrap gap-1.5">
        {assigned.map((mod) => (
          <span
            key={mod.id}
            className="inline-flex items-center rounded-full border border-violet-500/30 bg-violet-500/[0.08] px-2 py-0.5 text-[0.7rem] font-medium text-violet-700 dark:text-violet-300"
          >
            {mod.name}
          </span>
        ))}
      </div>
    )
  }

  const renderAssignedEmployees = (pos: PositionRosterItem) => {
    const assigned = pos.assignedEmployees ?? []
    if (assigned.length === 0) {
      return <span className="text-defaulttextcolor/50">—</span>
    }
    return (
      <div className="flex flex-wrap gap-1.5">
        {assigned.map((employee) => (
          <Link
            key={employee.id}
            href={employeeProfileHref(employee.id)}
            className="inline-flex items-center rounded-full border border-primary/30 bg-primary/[0.07] px-2 py-0.5 text-[0.7rem] font-medium text-primary transition-colors hover:border-primary/50 hover:bg-primary/15"
          >
            {employee.name}
          </Link>
        ))}
      </div>
    )
  }

  const openManageModules = (pos: PositionRosterItem) => {
    setManageTarget(pos)
    setSelectedModuleIds((pos.assignedModules ?? []).map((m) => m.id))
  }

  const closeManageModules = () => {
    setManageTarget(null)
    setSelectedModuleIds([])
  }

  const toggleModuleId = (moduleId: string) => {
    setSelectedModuleIds((prev) =>
      prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId]
    )
  }

  const handleSaveModules = async () => {
    if (!manageTarget) return
    const id = positionId(manageTarget)
    setSavingModules(true)
    try {
      await positionsApi.setPositionModules(id, selectedModuleIds)
      await Swal.fire({
        icon: 'success',
        title: 'Modules updated',
        text: `Training modules for "${manageTarget.name}" saved.`,
        toast: true,
        position: 'top-end',
        timer: 3000,
        showConfirmButton: false,
        timerProgressBar: true,
      })
      closeManageModules()
      await fetchPositions()
    } catch (err) {
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : 'Failed to update modules.'
      await Swal.fire({
        icon: 'error',
        title: 'Failed to update modules',
        text: msg,
        toast: true,
        position: 'top-end',
        timer: 4000,
        showConfirmButton: false,
        timerProgressBar: true,
      })
    } finally {
      setSavingModules(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
  }

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    setCurrentPage(1)
  }

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
  }

  const toggleSort = (field: 'name' | 'employees') => {
    setSortBy((prev) => (prev === `${field}:asc` ? `${field}:desc` : `${field}:asc`))
    setCurrentPage(1)
  }

  const sortIcon = (field: string) =>
    sortBy === `${field}:asc`
      ? 'ri-arrow-up-s-line'
      : sortBy === `${field}:desc`
        ? 'ri-arrow-down-s-line'
        : 'ri-arrow-up-down-line'

  const isActiveSort = (field: string) => sortBy.startsWith(`${field}:`)

  const sortBtnClass = (field: string) =>
    `inline-flex items-center gap-0.5 rounded-md px-1.5 py-1 text-[0.68rem] font-semibold leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
      isActiveSort(field)
        ? 'bg-primary/10 text-primary'
        : 'text-defaulttextcolor/55 hover:bg-primary/5 hover:text-primary'
    }`

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return positions
    return positions.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.assignedEmployees ?? []).some((e) => e.name.toLowerCase().includes(q)) ||
        (p.assignedModules ?? []).some((m) => m.name.toLowerCase().includes(q))
    )
  }, [positions, searchQuery])

  const sorted = useMemo(() => {
    const arr = [...filtered]
    const [field, dir] = sortBy.split(':')
    arr.sort((a, b) => {
      const cmp =
        field === 'employees'
          ? (a.employeeCount ?? 0) - (b.employeeCount ?? 0)
          : a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      return dir === 'desc' ? -cmp : cmp
    })
    return arr
  }, [filtered, sortBy])

  const totalResults = sorted.length
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize))

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1)
  }, [currentPage, totalPages])

  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return sorted.slice(start, start + pageSize)
  }, [sorted, currentPage, pageSize])

  const startIndex = totalResults === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endIndex = Math.min(currentPage * pageSize, totalResults)

  return (
    <Fragment>
      <Seo title="Positions" />

      <div className="mt-5 grid grid-cols-12 gap-6 h-[calc(100vh-8rem)] sm:mt-6">
        <div className="xl:col-span-12 col-span-12 h-full flex flex-col">
          <div className="box custom-box h-full flex flex-col">
            <div className="box-header flex items-center justify-between flex-wrap gap-4">
              <div className="box-title">
                Positions
                <span className="badge bg-light text-default rounded-full ms-1 text-[0.75rem] align-middle">
                  {totalResults}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <form onSubmit={handleSearch} className="flex items-center gap-2 me-2">
                  <div className="relative">
                    <input
                      type="text"
                      className="form-control !w-auto !py-1 !ps-3 !pe-7 !text-[0.75rem]"
                      placeholder="Search positions..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value)
                        setCurrentPage(1)
                      }}
                      aria-label="Search positions"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('')
                          setCurrentPage(1)
                        }}
                        aria-label="Clear search"
                        className="absolute end-1.5 top-1/2 -translate-y-1/2 inline-flex h-5 w-5 items-center justify-center rounded-full text-defaulttextcolor/45 transition-colors hover:bg-defaulttextcolor/10 hover:text-defaulttextcolor focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        <i className="ri-close-line text-[0.85rem]"></i>
                      </button>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="ti-btn ti-btn-primary-full !py-1 !px-2.5 !text-[0.75rem]"
                    aria-label="Search"
                  >
                    <i className="ri-search-line"></i>
                  </button>
                </form>
              </div>
            </div>

            <div className="box-body !p-0 flex-1 flex flex-col overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-defaulttextcolor/70">Loading positions...</div>
                </div>
              ) : totalResults === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-defaulttextcolor/70">
                    {searchQuery.trim() ? 'No positions match your search.' : 'No positions found.'}
                  </div>
                </div>
              ) : (
                <div className="table-responsive flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
                  <table className="table min-w-full table-striped table-hover table-bordered border-gray-300 dark:border-gray-600">
                    <thead>
                      <tr className="bg-primary/10 dark:bg-primary/20 border-b border-gray-300 dark:border-gray-600">
                        <th scope="col" className="text-center sticky top-0 z-10 bg-gray-50 dark:bg-black/20 !w-[3rem] !min-w-[3rem] !max-w-[3rem]">
                          S.no.
                        </th>
                        <th scope="col" className="text-start sticky top-0 z-10 bg-gray-50 dark:bg-black/20 !max-w-[13rem] !w-[13rem]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>Position</span>
                            <button
                              type="button"
                              className={sortBtnClass('name')}
                              onClick={() => toggleSort('name')}
                              aria-label={`Sort by name${isActiveSort('name') ? (sortBy.endsWith(':asc') ? ', ascending' : ', descending') : ''}`}
                              title="Sort by name"
                            >
                              Name<i className={`${sortIcon('name')} text-[0.9rem]`} aria-hidden="true"></i>
                            </button>
                          </div>
                        </th>
                        {canViewModules && (
                          <th scope="col" className="text-start sticky top-0 z-10 bg-gray-50 dark:bg-black/20 !min-w-[12rem]">
                            Modules
                          </th>
                        )}
                        <th scope="col" className="text-start sticky top-0 z-10 bg-gray-50 dark:bg-black/20 !min-w-[16rem]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>Assigned Employees</span>
                            <button
                              type="button"
                              className={sortBtnClass('employees')}
                              onClick={() => toggleSort('employees')}
                              aria-label={`Sort by employee count${isActiveSort('employees') ? (sortBy.endsWith(':asc') ? ', ascending' : ', descending') : ''}`}
                              title="Sort by employee count"
                            >
                              Count<i className={`${sortIcon('employees')} text-[0.9rem]`} aria-hidden="true"></i>
                            </button>
                          </div>
                        </th>
                        {canManageModules && (
                          <th scope="col" className="text-center sticky top-0 z-10 bg-gray-50 dark:bg-black/20 !w-[8.5rem] !min-w-[8.5rem]">
                            Manage
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {pageItems.map((pos, index) => {
                        const id = positionId(pos)
                        const unlinked = isUnlinkedPosition(pos)
                        const serial = (currentPage - 1) * pageSize + index + 1
                        return (
                          <tr className="border-b border-gray-300 dark:border-gray-600 align-top" key={id}>
                            <td className="text-center !w-[3rem] !min-w-[3rem] !max-w-[3rem] tabular-nums">
                              {serial}
                            </td>
                            <td className="!max-w-[13rem] !w-[13rem]">
                              <div className="flex flex-col gap-1 min-w-0">
                                <div className="flex items-start gap-1.5 min-w-0">
                                  <span className="font-medium text-defaulttextcolor break-words whitespace-normal leading-snug">
                                    {pos.name}
                                  </span>
                                  <span className="badge bg-primary/10 text-primary border border-primary/30 px-1.5 py-0 rounded-full text-[0.65rem] font-medium shrink-0">
                                    {pos.employeeCount ?? (pos.assignedEmployees?.length ?? 0)}
                                  </span>
                                </div>
                                {unlinked && (
                                  <span className="text-[0.65rem] uppercase tracking-wide text-defaulttextcolor/50">
                                    Not in catalog
                                  </span>
                                )}
                              </div>
                            </td>
                            {canViewModules && (
                              <td className="align-top">{renderAssignedModules(pos)}</td>
                            )}
                            <td className="align-top">{renderAssignedEmployees(pos)}</td>
                            {canManageModules && (
                              <td className="text-center align-top !w-[8.5rem] !min-w-[8.5rem]">
                                {unlinked ? (
                                  <span className="inline-flex items-center gap-1 text-[0.65rem] text-defaulttextcolor/45" title="No catalog position to attach modules to">
                                    <i className="ri-lock-line text-[0.75rem]" aria-hidden="true"></i>
                                    Not in catalog
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    className="group inline-flex items-center gap-1.5 rounded-lg border border-primary/35 bg-primary/[0.07] px-2.5 py-1.5 text-[0.72rem] font-semibold text-primary transition-colors hover:bg-primary hover:border-primary hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-bodybg"
                                    onClick={() => openManageModules(pos)}
                                    aria-label={`Manage training modules for ${pos.name}${(pos.assignedModules?.length ?? 0) > 0 ? ` (${pos.assignedModules?.length} linked)` : ''}`}
                                    title="Assign training modules"
                                  >
                                    <i className="ri-links-line text-[0.9rem]" aria-hidden="true"></i>
                                    Manage
                                    {(pos.assignedModules?.length ?? 0) > 0 && (
                                      <span className="inline-flex min-w-[1.15rem] justify-center rounded-full bg-primary/15 px-1 text-[0.62rem] font-bold tabular-nums text-primary group-hover:bg-white/25 group-hover:text-white">
                                        {pos.assignedModules?.length}
                                      </span>
                                    )}
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="box-footer !border-t-0">
              <div className="flex items-center flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <select
                    className="form-control select-show-page-size !w-auto !py-1 !px-4 !text-[0.75rem]"
                    value={pageSize}
                    onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                    aria-label="Entries per page"
                  >
                    {[10, 25, 50, 100].map((size) => (
                      <option key={size} value={size}>
                        Show {size}
                      </option>
                    ))}
                  </select>
                  <span className="text-[0.8125rem] text-defaulttextcolor/70">
                    Showing {startIndex} to {endIndex} of {totalResults} entries
                  </span>
                </div>
                <div className="ms-auto">
                  <nav aria-label="Page navigation" className="pagination-style-4">
                    <ul className="ti-pagination mb-0">
                      <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                        <button
                          className="page-link px-3 py-[0.375rem]"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                        >
                          Prev
                        </button>
                      </li>
                      {totalPages <= 7
                        ? Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                            <li key={p} className={`page-item ${currentPage === p ? 'active' : ''}`}>
                              <button className="page-link px-3 py-[0.375rem]" onClick={() => handlePageChange(p)}>
                                {p}
                              </button>
                            </li>
                          ))
                        : (
                          <>
                            {currentPage > 2 && (
                              <>
                                <li className="page-item">
                                  <button className="page-link px-3 py-[0.375rem]" onClick={() => handlePageChange(1)}>1</button>
                                </li>
                                {currentPage > 3 && (
                                  <li className="page-item disabled">
                                    <span className="page-link px-3 py-[0.375rem]">...</span>
                                  </li>
                                )}
                              </>
                            )}
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              const pageNum = currentPage < 3 ? i + 1 : currentPage > totalPages - 3 ? totalPages - 4 + i : currentPage - 2 + i
                              if (pageNum < 1 || pageNum > totalPages) return null
                              return (
                                <li key={pageNum} className={`page-item ${currentPage === pageNum ? 'active' : ''}`}>
                                  <button className="page-link px-3 py-[0.375rem]" onClick={() => handlePageChange(pageNum)}>
                                    {pageNum}
                                  </button>
                                </li>
                              )
                            })}
                            {currentPage < totalPages - 2 && (
                              <>
                                {currentPage < totalPages - 3 && (
                                  <li className="page-item disabled">
                                    <span className="page-link px-3 py-[0.375rem]">...</span>
                                  </li>
                                )}
                                <li className="page-item">
                                  <button className="page-link px-3 py-[0.375rem]" onClick={() => handlePageChange(totalPages)}>
                                    {totalPages}
                                  </button>
                                </li>
                              </>
                            )}
                          </>
                        )}
                      <li className={`page-item ${currentPage >= totalPages ? 'disabled' : ''}`}>
                        <button
                          className="page-link px-3 py-[0.375rem] text-primary"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage >= totalPages}
                        >
                          Next
                        </button>
                      </li>
                    </ul>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {manageTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 dark:bg-black/70" onClick={closeManageModules} aria-hidden="true" />
          <div className="relative ti-modal-content bg-white dark:bg-bodybg rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] flex flex-col">
            <div className="ti-modal-header flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h6 className="ti-modal-title text-lg font-semibold">Modules for {manageTarget.name}</h6>
              <button type="button" className="ti-modal-close-btn p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" onClick={closeManageModules}>
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            <div className="ti-modal-body px-4 py-4 overflow-y-auto flex-1">
              <p className="text-[0.75rem] text-defaulttextcolor/60 mb-2">
                Select training modules for this position. Employees in this position become eligible for the checked modules in Course Assignment.
              </p>
              {modulesLoading ? (
                <p className="text-[0.8125rem] text-defaulttextcolor/50">Loading modules…</p>
              ) : allModules.length === 0 ? (
                <p className="text-[0.8125rem] text-defaulttextcolor/50">No training modules available.</p>
              ) : (
                <div className="border border-gray-200 dark:border-gray-700 rounded-md max-h-64 overflow-y-auto p-2 space-y-1">
                  {allModules.map((mod) => {
                    const checked = selectedModuleIds.includes(mod.id)
                    return (
                      <label
                        key={mod.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-black/20 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={checked}
                          onChange={() => toggleModuleId(mod.id)}
                        />
                        <span className="text-[0.8125rem]">{mod.moduleName}</span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="ti-modal-footer px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
              <button type="button" className="ti-btn ti-btn-light" onClick={closeManageModules} disabled={savingModules}>
                Cancel
              </button>
              <button type="button" className="ti-btn ti-btn-primary-full" onClick={handleSaveModules} disabled={savingModules}>
                {savingModules ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  )
}
