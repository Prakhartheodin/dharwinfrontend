"use client"

import Pageheader from '@/shared/layout-components/page-header/pageheader'
import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment, useMemo, useState, useEffect } from 'react'
import { useTable, useSortBy, usePagination } from 'react-table'
import { getEvaluation, type EvaluationRow } from '@/shared/lib/api/evaluation'

function getStatus(row: EvaluationRow): 'Completed' | 'In Progress' | 'Not Started' {
  const rate = row.completionRate ?? 0
  const completedAt = row.completedAt
  if (rate >= 100 && completedAt) return 'Completed'
  if (rate > 0) return 'In Progress'
  return 'Not Started'
}

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'Completed', label: 'Completed' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Not Started', label: 'Not Started' },
] as const

const Evaluation = () => {
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState({ totalCourses: 0, totalStudentsEnrolled: 0 })
  const [evaluations, setEvaluations] = useState<EvaluationRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCourse, setFilterCourse] = useState('')
  const [filterStudent, setFilterStudent] = useState('')

  useEffect(() => {
    let cancelled = false
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await getEvaluation()
        if (cancelled) return
        setSummary(res.summary)
        setEvaluations(res.evaluations)
      } catch (e: unknown) {
        if (cancelled) return
        const message = e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : null
        setError(message ? String(message) : 'Failed to load evaluation data.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [])

  const uniqueCourses = useMemo(() => {
    const set = new Set(evaluations.map((e) => e.courseName).filter(Boolean))
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [evaluations])

  const filteredEvaluations = useMemo(() => {
    let list = evaluations
    if (filterStatus) {
      list = list.filter((row) => getStatus(row) === filterStatus)
    }
    if (filterCourse) {
      list = list.filter((row) => row.courseName === filterCourse)
    }
    if (filterStudent.trim()) {
      const q = filterStudent.trim().toLowerCase()
      list = list.filter((row) => row.studentName?.toLowerCase().includes(q))
    }
    return list
  }, [evaluations, filterStatus, filterCourse, filterStudent])

  const hasActiveFilters = filterStatus || filterCourse || filterStudent.trim()

  const clearFilters = () => {
    setFilterStatus('')
    setFilterCourse('')
    setFilterStudent('')
  }

  const columns = useMemo(
    () => [
      { Header: 'Student', accessor: 'studentName' as const },
      { Header: 'Course', accessor: 'courseName' as const },
      {
        Header: 'Completion %',
        accessor: 'completionRate' as const,
        Cell: ({ value }: { value: number }) => {
          const pct = value != null ? Math.min(100, Math.max(0, Math.round(value))) : 0
          return (
            <div className="flex items-center gap-2 min-w-[120px]">
              <div className="flex-1 h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    pct >= 100 ? 'bg-success' : pct > 0 ? 'bg-primary' : 'bg-gray-300 dark:bg-white/20'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[0.75rem] font-medium shrink-0 w-9">{pct}%</span>
            </div>
          )
        },
      },
      {
        Header: 'Status',
        id: 'status',
        accessor: (row: EvaluationRow) => getStatus(row),
        Cell: ({ value }: { value: string }) => {
          const label = value || '—'
          const badgeClass =
            label === 'Completed'
              ? 'bg-success/10 text-success'
              : label === 'In Progress'
                ? 'bg-warning/10 text-warning'
                : 'bg-gray-200 dark:bg-white/10 text-defaulttextcolor dark:text-defaulttextcolor/80'
          return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[0.75rem] font-medium ${badgeClass}`}>
              {label}
            </span>
          )
        },
      },
      {
        Header: 'Completion date',
        accessor: 'completedAt' as const,
        Cell: ({ value }: { value: string | null }) => (
          <span>{value ? new Date(value).toLocaleDateString() : '—'}</span>
        ),
      },
      {
        Header: 'Quiz score',
        accessor: 'quizScore' as const,
        Cell: ({ value }: { value: number | null }) => (
          <span>{value != null ? `${value}%` : '—'}</span>
        ),
      },
      {
        Header: 'Quiz tries',
        accessor: 'quizTries' as const,
        Cell: ({ value }: { value: number }) => <span>{value ?? 0}</span>,
      },
    ],
    []
  )

  const tableInstance = useTable(
    {
      columns,
      data: filteredEvaluations,
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
    setPageSize,
  } = tableInstance

  const { pageIndex, pageSize } = state
  const total = filteredEvaluations.length

  useEffect(() => {
    gotoPage(0)
    // Reset to first page when filters change; gotoPage is stable from useTable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, filterCourse, filterStudent])

  return (
    <Fragment>
      <Seo title="Evaluation" />
      <Pageheader
        currentpage="Evaluation"
        activepage="Training Management"
        mainpage="Evaluation"
      />

      <div className="container w-full max-w-full mx-auto">
        {/* Summary */}
        <div className="grid grid-cols-12 gap-4 mb-6">
          <div className="xl:col-span-4 col-span-12">
            <div className="box p-4">
              <div className="flex items-center gap-3">
                <span className="avatar avatar-lg avatar-rounded bg-primary/10 text-primary">
                  <i className="ri-book-open-line text-xl" />
                </span>
                <div>
                  <p className="text-defaulttextcolor/70 dark:text-white/70 text-sm mb-0">Courses</p>
                  <p className="text-xl font-semibold mb-0">
                    {loading ? '—' : summary.totalCourses}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="xl:col-span-4 col-span-12">
            <div className="box p-4">
              <div className="flex items-center gap-3">
                <span className="avatar avatar-lg avatar-rounded bg-success/10 text-success">
                  <i className="ri-user-line text-xl" />
                </span>
                <div>
                  <p className="text-defaulttextcolor/70 dark:text-white/70 text-sm mb-0">Students enrolled</p>
                  <p className="text-xl font-semibold mb-0">
                    {loading ? '—' : summary.totalStudentsEnrolled}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="xl:col-span-12 col-span-12">
          <div className="box flex flex-col" style={{ minHeight: 0 }}>
            <div className="flex items-center justify-between flex-wrap gap-4 mb-4 px-4 pt-4">
              <div className="box-title">
                Evaluations
                <span className="badge bg-light text-default rounded-full ms-1 text-[0.75rem] align-middle">
                  {total}
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
              </div>
            </div>

            {/* Filters */}
            <div className="px-4 pb-4 flex flex-wrap items-center gap-3">
              <select
                className="form-control !w-auto !py-1.5 !px-3 !text-[0.8125rem] min-w-[140px]"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                aria-label="Filter by status"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value || 'all'} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <select
                className="form-control !w-auto !py-1.5 !px-3 !text-[0.8125rem] min-w-[160px]"
                value={filterCourse}
                onChange={(e) => setFilterCourse(e.target.value)}
                aria-label="Filter by course"
              >
                <option value="">All courses</option>
                {uniqueCourses.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                className="form-control !w-auto !py-1.5 !px-3 !text-[0.8125rem] min-w-[180px]"
                placeholder="Search student..."
                value={filterStudent}
                onChange={(e) => setFilterStudent(e.target.value)}
                aria-label="Search by student name"
              />
              {hasActiveFilters && (
                <button
                  type="button"
                  className="ti-btn ti-btn-outline-secondary !py-1.5 !px-3 !text-[0.8125rem]"
                  onClick={clearFilters}
                >
                  <i className="ri-filter-off-line align-middle me-1" />
                  Clear filters
                </button>
              )}
            </div>

            {error && (
              <div className="mx-4 mb-4 p-3 rounded-lg bg-danger/10 text-danger text-sm">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex-1 flex items-center justify-center py-12 px-4">
                <div className="text-defaulttextcolor/70">Loading evaluations…</div>
              </div>
            ) : (
              <>
                <div className="table-responsive flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
                  <table
                    {...getTableProps()}
                    className="table whitespace-nowrap min-w-full table-striped table-hover table-bordered border-gray-300 dark:border-gray-600"
                  >
                    <thead>
                      {headerGroups.map((headerGroup) => (
                        <tr
                          {...headerGroup.getHeaderGroupProps()}
                          className="bg-primary/10 dark:bg-primary/20 border-b border-gray-300 dark:border-gray-600"
                          key={headerGroup.getHeaderGroupProps().key}
                        >
                          {headerGroup.headers.map((column: any) => (
                            <th
                              {...column.getHeaderProps(column.getSortByToggleProps?.() || column.getHeaderProps())}
                              scope="col"
                              className="text-start sticky top-0 z-10 bg-gray-50 dark:bg-black/20"
                              key={column.id}
                              style={{ position: 'sticky', top: 0, zIndex: 10 }}
                            >
                              <div className="flex items-center gap-2">
                                <span className="tabletitle">{column.render('Header')}</span>
                                {column.isSorted && (
                                  <span>
                                    {column.isSortedDesc ? (
                                      <i className="ri-arrow-down-s-line text-[0.875rem]" />
                                    ) : (
                                      <i className="ri-arrow-up-s-line text-[0.875rem]" />
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
                      {page.map((row) => {
                        prepareRow(row)
                        return (
                          <tr
                            {...row.getRowProps()}
                            className="border-b border-gray-300 dark:border-gray-600"
                            key={row.id}
                          >
                            {row.cells.map((cell) => (
                              <td {...cell.getCellProps()} key={cell.column.id}>
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
                      Showing {total === 0 ? 0 : pageIndex * pageSize + 1} to{' '}
                      {Math.min((pageIndex + 1) * pageSize, total)} of {total} entries
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
                          {pageOptions.map((p) => (
                            <li key={p} className={`page-item ${pageIndex === p ? 'active' : ''}`}>
                              <button
                                className="page-link px-3 py-[0.375rem]"
                                onClick={() => gotoPage(p)}
                              >
                                {p + 1}
                              </button>
                            </li>
                          ))}
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
              </>
            )}
          </div>
        </div>
      </div>
    </Fragment>
  )
}

export default Evaluation
