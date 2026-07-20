"use client"

import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment, useMemo, useState, useEffect, useCallback } from 'react'
import { AxiosError } from 'axios'
import Swal from 'sweetalert2'
import { useTable, useSortBy, usePagination } from 'react-table'
import * as studentsApi from '@/shared/lib/api/students'
import type { Student } from '@/shared/lib/api/students'
import {
  getEvaluation,
  downloadEvaluationExport,
  type EvaluationRow,
  type EvaluationSummary,
  type EvaluationDisplayStatus,
} from '@/shared/lib/api/evaluation'
import { listTrainingModules } from '@/shared/lib/api/training-modules'
import AtRiskOverlayPanel, { type AtRiskContext } from './_components/AtRiskOverlayPanel'
import StudentPreviewPanel from './_components/StudentPreviewPanel'
import StudentViewModal from '../students/_components/StudentViewModal'
import {
  EVAL_BTN_DANGER,
  EVAL_BTN_OUTLINE_PRIMARY,
  EVAL_BTN_OUTLINE_SECONDARY,
  EVAL_BTN_PRIMARY,
  EVAL_BTN_TAB_ACTIVE,
  EVAL_BTN_TAB_INACTIVE,
  EVAL_PAGE_LINK,
  EVAL_TH_SORTABLE,
} from './_components/evaluation-buttons'
import {
  AtRiskCountButton,
  CompletionBar,
  CountCompleted,
  EVAL_TABLE_SURFACE_CLASS,
  EVAL_TD_CLASS,
  EVAL_TH_CLASS,
  SortHeaderLabel,
  StudentNameCell,
  evalRowClass,
} from './_components/evaluation-table-parts'
import {
  deriveOverallStatus,
  getCourseDisplayStatus,
  statusBadgeClass,
  atRiskLabel,
} from './_components/evaluation-utils'
import { closeHsOverlay, openHsOverlay } from './_components/evaluation-overlay'
import pipelineStyles from '../../ats/ats-pipeline-list.module.css'

const STATUS_OPTIONS: { value: '' | EvaluationDisplayStatus; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'Completed', label: 'Completed' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Not Started', label: 'Not Started' },
]

interface StudentSummaryRow {
  studentId: string
  studentName: string
  positionName: string | null
  coursesAssigned: number
  avgCompletion: number
  overallStatus: EvaluationDisplayStatus
  completedCount: number
  avgQuizScore: number | null
  atRiskCount: number
}

interface CourseSummaryRow {
  courseId: string
  courseName: string
  categoryNames: string[]
  studentsAssigned: number
  avgCompletion: number
  completedCount: number
  atRiskCount: number
}

const EMPTY_SUMMARY: EvaluationSummary = {
  totalCourses: 0,
  totalStudentsEnrolled: 0,
  atRiskCount: 0,
  completedPairs: 0,
  inProgressPairs: 0,
  notStartedPairs: 0,
}

function TableSkeleton({ cols = 6, rows = 8 }: { cols?: number; rows?: number }) {
  return (
    <div className="px-4 pb-4 space-y-2" aria-busy="true" aria-label="Loading evaluations">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3 animate-pulse motion-reduce:animate-none">
          {Array.from({ length: cols }).map((__, j) => (
            <div key={j} className="h-8 flex-1 rounded bg-gray-200 dark:bg-white/10" />
          ))}
        </div>
      ))}
    </div>
  )
}

const Evaluation = () => {
  const [viewMode, setViewMode] = useState<'student' | 'course'>('student')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [summary, setSummary] = useState<EvaluationSummary>(EMPTY_SUMMARY)
  const [evaluations, setEvaluations] = useState<EvaluationRow[]>([])
  const [error, setError] = useState<string | null>(null)

  const [filterStatus, setFilterStatus] = useState<'' | EvaluationDisplayStatus>('')
  const [filterStudent, setFilterStudent] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [filterCourseId, setFilterCourseId] = useState('')
  const [filterAtRiskOnly, setFilterAtRiskOnly] = useState(false)

  const [courseOptions, setCourseOptions] = useState<{ id: string; name: string }[]>([])

  const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string } | null>(null)
  const [atRiskContext, setAtRiskContext] = useState<AtRiskContext | null>(null)
  const [viewStudent, setViewStudent] = useState<Student | null>(null)
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(filterStudent.trim()), 300)
    return () => clearTimeout(t)
  }, [filterStudent])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const mods = await listTrainingModules({ limit: 500, sortBy: 'moduleName:asc' })
        if (cancelled) return
        setCourseOptions((mods.results || []).map((m) => ({ id: m.id, name: m.moduleName })))
      } catch {
        /* filter dropdowns are optional */
      }
    })()
    return () => { cancelled = true }
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getEvaluation({
        status: filterStatus || undefined,
        q: debouncedQ || undefined,
        courseId: filterCourseId || undefined,
        atRisk: filterAtRiskOnly || undefined,
      })
      setSummary(res.summary)
      setEvaluations(res.evaluations)
    } catch (e: unknown) {
      const message = e && typeof e === 'object' && 'response' in e
        ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
        : null
      setError(message ? String(message) : 'Failed to load evaluation data.')
    } finally {
      setLoading(false)
    }
  }, [filterStatus, debouncedQ, filterCourseId, filterAtRiskOnly])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const studentRows = useMemo(() => {
    const map = new Map<string, EvaluationRow[]>()
    for (const e of evaluations) {
      if (!e.studentId) continue
      const existing = map.get(e.studentId) || []
      existing.push(e)
      map.set(e.studentId, existing)
    }
    const rows: StudentSummaryRow[] = []
    for (const [studentId, courses] of map.entries()) {
      const avgCompletion = courses.reduce((s, c) => s + (c.completionRate ?? 0), 0) / courses.length
      const scores = courses.map((c) => c.quizScore).filter((v): v is number => v != null)
      const avgQuiz = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
      rows.push({
        studentId,
        studentName: courses[0].studentName,
        positionName: courses[0].positionName ?? null,
        coursesAssigned: courses.length,
        avgCompletion: Math.round(avgCompletion),
        overallStatus: deriveOverallStatus(courses),
        completedCount: courses.filter((c) => getCourseDisplayStatus(c) === 'Completed').length,
        avgQuizScore: avgQuiz,
        atRiskCount: courses.filter((c) => c.atRisk).length,
      })
    }
    return rows.sort((a, b) => a.studentName.localeCompare(b.studentName))
  }, [evaluations])

  const courseRows = useMemo(() => {
    const map = new Map<string, EvaluationRow[]>()
    for (const e of evaluations) {
      if (!e.courseId) continue
      const existing = map.get(e.courseId) || []
      existing.push(e)
      map.set(e.courseId, existing)
    }
    const rows: CourseSummaryRow[] = []
    for (const [courseId, rowsForCourse] of map.entries()) {
      const avgCompletion =
        rowsForCourse.reduce((s, c) => s + (c.completionRate ?? 0), 0) / rowsForCourse.length
      const categories = new Set<string>()
      for (const r of rowsForCourse) for (const n of r.categoryNames || []) categories.add(n)
      rows.push({
        courseId,
        courseName: rowsForCourse[0].courseName,
        categoryNames: [...categories],
        studentsAssigned: rowsForCourse.length,
        avgCompletion: Math.round(avgCompletion),
        completedCount: rowsForCourse.filter((c) => getCourseDisplayStatus(c) === 'Completed').length,
        atRiskCount: rowsForCourse.filter((c) => c.atRisk).length,
      })
    }
    return rows.sort((a, b) => a.courseName.localeCompare(b.courseName))
  }, [evaluations])

  const tableData = viewMode === 'student' ? studentRows : courseRows

  const hasActiveFilters =
    filterStatus || filterStudent.trim() || filterCourseId || filterAtRiskOnly

  const clearFilters = () => {
    setFilterStatus('')
    setFilterStudent('')
    setFilterCourseId('')
    setFilterAtRiskOnly(false)
  }

  const closeAtRiskOverlay = useCallback(() => {
    closeHsOverlay('#at-risk-overlay-panel')
    setAtRiskContext(null)
  }, [])

  const openAtRiskOverlay = useCallback((ctx: AtRiskContext) => {
    setAtRiskContext(ctx)
  }, [])

  useEffect(() => {
    if (!atRiskContext) return
    const timer = window.setTimeout(() => openHsOverlay('#at-risk-overlay-panel'), 0)
    return () => window.clearTimeout(timer)
  }, [atRiskContext])

  const atRiskOverlayRows = useMemo(() => {
    if (!atRiskContext) return []
    if (atRiskContext.type === 'course') {
      return evaluations.filter((e) => e.courseId === atRiskContext.courseId && e.atRisk)
    }
    return evaluations.filter((e) => e.studentId === atRiskContext.studentId && e.atRisk)
  }, [atRiskContext, evaluations])

  const openStudentPanel = useCallback((id: string, name: string) => {
    closeAtRiskOverlay()
    setSelectedStudent({ id, name })
    setTimeout(() => {
      ;(window as Window & { HSOverlay?: { open: (el: Element | null) => void } }).HSOverlay?.open(
        document.querySelector('#student-preview-panel')
      )
    }, 50)
  }, [closeAtRiskOverlay])

  const handleViewStudentProfile = useCallback(async (studentId: string) => {
    if (!studentId || viewingProfileId) return
    setViewingProfileId(studentId)

    const previewEl = document.querySelector('#student-preview-panel')
    if (previewEl) {
      ;(window as Window & { HSOverlay?: { close: (el: Element) => void } }).HSOverlay?.close(previewEl)
      setSelectedStudent(null)
    }
    closeAtRiskOverlay()

    try {
      const student = await studentsApi.getStudent(studentId)
      setViewStudent(student)
      setTimeout(() => {
        ;(window as Window & { HSOverlay?: { open: (el: Element | null) => void } }).HSOverlay?.open(
          document.querySelector('#view-student-modal')
        )
      }, 100)
    } catch (err) {
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : 'Failed to load student profile.'
      await Swal.fire({
        icon: 'error',
        title: 'Could not open profile',
        text: msg,
        toast: true,
        position: 'top-end',
        timer: 4000,
        showConfirmButton: false,
        timerProgressBar: true,
      })
    } finally {
      setViewingProfileId(null)
    }
  }, [viewingProfileId, closeAtRiskOverlay])

  const handleExport = async () => {
    setExporting(true)
    try {
      await downloadEvaluationExport({
        status: filterStatus || undefined,
        q: debouncedQ || undefined,
        courseId: filterCourseId || undefined,
        atRisk: filterAtRiskOnly || undefined,
      })
    } catch {
      alert('Export failed. Check permissions and try again.')
    } finally {
      setExporting(false)
    }
  }

  const studentColumns = useMemo(
    () => [
      {
        id: 'student',
        Header: 'Student',
        accessor: 'studentName' as const,
        Cell: ({ row }: { row: { original: StudentSummaryRow } }) => (
          <StudentNameCell
            studentId={row.original.studentId}
            studentName={row.original.studentName}
            onPreview={openStudentPanel}
            onViewProfile={handleViewStudentProfile}
            viewProfileLoading={viewingProfileId === row.original.studentId}
          />
        ),
      },
      {
        id: 'position',
        Header: 'Position',
        accessor: 'positionName' as const,
        Cell: ({ value }: { value: string | null }) => (
          <span className="text-defaulttextcolor/80 leading-snug line-clamp-2 max-w-[16rem]" title={value ?? undefined}>
            {value || '—'}
          </span>
        ),
      },
      {
        id: 'courses',
        Header: 'Courses',
        accessor: 'coursesAssigned' as const,
        Cell: ({ row }: { row: { original: StudentSummaryRow } }) => (
          <CountCompleted
            completed={row.original.completedCount}
            total={row.original.coursesAssigned}
          />
        ),
      },
      {
        id: 'avgCompletion',
        Header: 'Avg Completion',
        accessor: 'avgCompletion' as const,
        Cell: ({ value }: { value: number }) => <CompletionBar value={value} />,
      },
      {
        id: 'status',
        Header: 'Status',
        accessor: 'overallStatus' as const,
        Cell: ({ value, row }: { value: EvaluationDisplayStatus; row: { original: StudentSummaryRow } }) => (
          <div className="flex items-center gap-1.5 flex-nowrap">
            <span
              className={`inline-flex items-center gap-1 rounded-full border border-transparent px-2 py-0.5 text-[0.6875rem] font-medium whitespace-nowrap ${statusBadgeClass(value)}`}
            >
              <i
                className={`text-[0.75rem] ${
                  value === 'Completed'
                    ? 'ri-checkbox-circle-line'
                    : value === 'In Progress'
                      ? 'ri-time-line'
                      : 'ri-pause-circle-line'
                }`}
                aria-hidden
              />
              {value}
            </span>
            {row.original.atRiskCount > 0 && (
              <AtRiskCountButton
                compact
                count={row.original.atRiskCount}
                labelSuffix="at risk"
                onClick={() =>
                  openAtRiskOverlay({
                    type: 'student',
                    studentId: row.original.studentId,
                    title: row.original.studentName,
                  })
                }
              />
            )}
          </div>
        ),
      },
      {
        id: 'avgQuiz',
        Header: 'Avg Quiz',
        accessor: 'avgQuizScore' as const,
        Cell: ({ value }: { value: number | null }) => (
          <span className="tabular-nums font-medium text-defaulttextcolor">
            {value != null ? `${value}%` : '—'}
          </span>
        ),
      },
    ],
    [openStudentPanel, handleViewStudentProfile, viewingProfileId, openAtRiskOverlay]
  )

  const courseColumns = useMemo(
    () => [
      {
        id: 'course',
        Header: 'Course',
        accessor: 'courseName' as const,
        Cell: ({ value }: { value: string }) => (
          <span className="font-semibold text-defaulttextcolor">{value}</span>
        ),
      },
      {
        id: 'categories',
        Header: 'Categories',
        accessor: 'categoryNames' as const,
        Cell: ({ value }: { value: string[] }) => (
          <span className="text-[0.8125rem] text-defaulttextcolor/85 leading-snug">
            {value.length ? value.join(', ') : '—'}
          </span>
        ),
      },
      {
        id: 'students',
        Header: 'Students',
        accessor: 'studentsAssigned' as const,
        Cell: ({ row }: { row: { original: CourseSummaryRow } }) => (
          <CountCompleted
            completed={row.original.completedCount}
            total={row.original.studentsAssigned}
          />
        ),
      },
      {
        id: 'avgCompletion',
        Header: 'Avg Completion',
        accessor: 'avgCompletion' as const,
        Cell: ({ value }: { value: number }) => <CompletionBar value={value} />,
      },
      {
        id: 'atRisk',
        Header: 'At risk',
        accessor: 'atRiskCount' as const,
        Cell: ({ value, row }: { value: number; row: { original: CourseSummaryRow } }) => (
          <AtRiskCountButton
            compact
            count={value}
            onClick={() =>
              openAtRiskOverlay({
                type: 'course',
                courseId: row.original.courseId,
                title: row.original.courseName,
              })
            }
          />
        ),
      },
    ],
    [openAtRiskOverlay]
  )

  const columns = useMemo(
    () => (viewMode === 'student' ? studentColumns : courseColumns),
    [viewMode, studentColumns, courseColumns]
  )

  const tableInstance = useTable(
    {
      columns: columns as never,
      data: tableData as never,
      initialState: { pageIndex: 0, pageSize: 50 },
      autoResetPage: true,
      autoResetSortBy: false,
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

  const { key: _evaluationTableKey, ...evaluationTableProps } = getTableProps()
  const tableBodyProps = getTableBodyProps()

  const { pageIndex, pageSize } = state
  const total = tableData.length
  const pageCount = pageOptions.length

  const paginationItems = useMemo(() => {
    if (pageCount <= 7) {
      return pageOptions.map((p: number) => ({ type: 'page' as const, page: p }))
    }
    const items: { type: 'page' | 'ellipsis'; page?: number }[] = []
    const windowRadius = 2
    const start = Math.max(0, pageIndex - windowRadius)
    const end = Math.min(pageCount - 1, pageIndex + windowRadius)
    if (start > 0) {
      items.push({ type: 'page', page: 0 })
      if (start > 1) items.push({ type: 'ellipsis' })
    }
    for (let p = start; p <= end; p += 1) items.push({ type: 'page', page: p })
    if (end < pageCount - 1) {
      if (end < pageCount - 2) items.push({ type: 'ellipsis' })
      items.push({ type: 'page', page: pageCount - 1 })
    }
    return items
  }, [pageCount, pageIndex, pageOptions])

  useEffect(() => {
    gotoPage(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, filterStatus, debouncedQ, filterCourseId, filterAtRiskOnly])

  useEffect(() => {
    if (total === 0) return
    const maxIndex = Math.max(0, Math.ceil(total / pageSize) - 1)
    if (pageIndex > maxIndex) gotoPage(maxIndex)
  }, [total, pageSize, pageIndex, gotoPage])

  return (
    <Fragment>
      <Seo title="Evaluation" />
      <div className="container mx-auto mt-5 w-full min-w-0 max-w-full sm:mt-6">
        <div className="mb-6 grid min-w-0 grid-cols-12 gap-4">
          {[
            { label: 'Courses', value: summary.totalCourses, icon: 'ri-book-open-line', color: 'primary' },
            { label: 'Active students', value: summary.totalStudentsEnrolled, icon: 'ri-user-line', color: 'success' },
            { label: 'At-risk enrollments', value: summary.atRiskCount, icon: 'ri-alert-line', color: 'danger' },
            { label: 'Completed pairs', value: summary.completedPairs, icon: 'ri-checkbox-circle-line', color: 'info' },
          ].map((card) => (
            <div key={card.label} className="xl:col-span-3 lg:col-span-6 col-span-12">
              <div className="box p-4">
                <div className="flex items-center gap-3">
                  <span className={`avatar avatar-lg avatar-rounded bg-${card.color}/10 text-${card.color}`}>
                    <i className={`${card.icon} text-xl`} aria-hidden />
                  </span>
                  <div>
                    <p className="text-defaulttextcolor/70 dark:text-white/70 text-sm mb-0">{card.label}</p>
                    <p className="text-xl font-semibold mb-0 tabular-nums">
                      {loading ? '—' : card.value}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="col-span-12 min-w-0 xl:col-span-12">
          <div className="box flex min-w-0 flex-col" style={{ minHeight: 0 }}>
            <div className="mb-4 flex min-w-0 flex-col gap-3 px-4 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
              <div className="flex min-w-0 w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
                <div className="box-title mb-0 min-w-0">
                  {viewMode === 'student' ? 'Students' : 'Courses'}
                  <span className="badge bg-light text-default rounded-full ms-1 text-[0.75rem] align-middle">
                    {total}
                  </span>
                </div>
                <div
                  className="flex w-full min-w-0 max-w-full rounded-xl border border-defaultborder/80 bg-defaultbackground/60 p-1 sm:inline-flex sm:w-auto"
                  role="tablist"
                  aria-label="Evaluation view"
                >
                  {(['student', 'course'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      role="tab"
                      aria-selected={viewMode === mode}
                      className={`${viewMode === mode ? EVAL_BTN_TAB_ACTIVE : EVAL_BTN_TAB_INACTIVE} min-w-0 flex-1 sm:flex-none`}
                      onClick={() => setViewMode(mode)}
                    >
                      {mode === 'student' ? 'By student' : 'By course'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex w-full min-w-0 flex-wrap gap-2 sm:w-auto sm:justify-end">
                <button
                  type="button"
                  className={EVAL_BTN_OUTLINE_PRIMARY}
                  onClick={handleExport}
                  disabled={loading || exporting || evaluations.length === 0}
                  aria-label="Export evaluation data as Excel"
                  aria-busy={exporting}
                >
                  {exporting ? (
                    <i className="ri-loader-4-line animate-spin motion-reduce:animate-none" aria-hidden />
                  ) : (
                    <i className="ri-download-2-line" aria-hidden />
                  )}
                  {exporting ? 'Exporting…' : 'Export Excel'}
                </button>
                <select
                  className="form-control select-show-page-size min-h-[44px] w-full min-w-0 max-w-full !py-1 !px-4 !text-[0.75rem] sm:w-auto"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  aria-label="Rows per page"
                >
                  {[10, 25, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      Show {size}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mx-4 mb-4 grid min-w-0 max-w-[calc(100%-2rem)] grid-cols-1 gap-3 rounded-xl border border-defaultborder/70 bg-light/40 p-4 dark:bg-black/20 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end">
              <div className="flex min-w-0 w-full flex-col gap-1.5 lg:w-auto">
                <label htmlFor="eval-filter-status" className="text-[0.75rem] font-medium text-defaulttextcolor/80">Status</label>
                <select
                  id="eval-filter-status"
                  className="form-control select-show-page-size min-h-[44px] w-full min-w-0 max-w-full !py-1.5 !px-3 !text-[0.8125rem] sm:min-w-[140px] sm:w-auto"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as '' | EvaluationDisplayStatus)}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value || 'all'} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex min-w-0 w-full flex-col gap-1.5 sm:col-span-2 lg:col-span-1 lg:w-auto">
                <label htmlFor="eval-filter-search" className="text-[0.75rem] font-medium text-defaulttextcolor/80">Search</label>
                <input
                  id="eval-filter-search"
                  type="search"
                  className="form-control select-show-page-size min-h-[44px] w-full min-w-0 max-w-full !py-1.5 !px-3 !text-[0.8125rem] sm:min-w-[180px] sm:w-auto"
                  placeholder="Student or course…"
                  value={filterStudent}
                  onChange={(e) => setFilterStudent(e.target.value)}
                />
              </div>
              <div className="flex min-w-0 w-full flex-col gap-1.5 sm:col-span-2 lg:col-span-1 lg:w-auto">
                <label htmlFor="eval-filter-course" className="text-[0.75rem] font-medium text-defaulttextcolor/80">Course</label>
                <select
                  id="eval-filter-course"
                  className="form-control select-show-page-size min-h-[44px] w-full min-w-0 max-w-full truncate !py-1.5 !px-3 !text-[0.8125rem] sm:min-w-[160px] sm:w-auto"
                  value={filterCourseId}
                  onChange={(e) => setFilterCourseId(e.target.value)}
                >
                  <option value="">All courses</option>
                  {courseOptions.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <label className="inline-flex min-h-[44px] min-w-0 cursor-pointer items-center gap-2 sm:col-span-2 lg:col-span-1">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={filterAtRiskOnly}
                  onChange={(e) => setFilterAtRiskOnly(e.target.checked)}
                />
                <span className="text-[0.8125rem] font-medium text-defaulttextcolor/85">At-risk only</span>
              </label>
              {hasActiveFilters && (
                <button
                  type="button"
                  className={EVAL_BTN_OUTLINE_SECONDARY}
                  onClick={clearFilters}
                  aria-label="Clear all filters"
                >
                  <i className="ri-filter-off-line" aria-hidden />
                  Clear filters
                </button>
              )}
            </div>

            {error && (
              <div className="mx-4 mb-4 p-3 rounded-lg bg-danger/10 text-danger text-sm flex flex-wrap items-center justify-between gap-2" role="alert">
                <span>{error}</span>
                <button type="button" className={EVAL_BTN_DANGER} onClick={fetchData} aria-label="Retry loading evaluation data">
                  <i className="ri-refresh-line" aria-hidden />
                  Retry
                </button>
              </div>
            )}

            {loading ? (
              <TableSkeleton cols={viewMode === 'student' ? 6 : 5} />
            ) : total === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <i className="ri-file-search-line text-4xl text-defaulttextcolor/40 mb-3" aria-hidden />
                <p className="font-medium mb-1">No evaluation data</p>
                <p className="text-sm text-defaulttextcolor/60 max-w-md">
                  {hasActiveFilters
                    ? 'No rows match your filters. Try clearing filters or broadening your search.'
                    : 'Assign students to courses to see progress and quiz results here.'}
                </p>
                {hasActiveFilters && (
                  <button type="button" className={`${EVAL_BTN_PRIMARY} mt-4`} onClick={clearFilters}>
                    <i className="ri-filter-off-line" aria-hidden />
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="box-body !p-0 flex min-w-0 flex-col overflow-hidden px-4 pb-4">
                  <div
                    className={`${EVAL_TABLE_SURFACE_CLASS} flex min-w-0 flex-col overflow-hidden`}
                    style={{ minHeight: 0 }}
                  >
                  <div
                    className={`${pipelineStyles.tableWrap} table-responsive max-h-[min(70vh,42rem)] [scrollbar-width:thin]`}
                    style={{ minHeight: 0 }}
                  >
                    <table
                      {...evaluationTableProps}
                      className={`ti-custom-table mb-0 ${pipelineStyles.tableWide}`}
                    >
                      <thead className="ti-custom-table-head">
                        {headerGroups.map((headerGroup, headerIndex) => {
                          const { key: _hgKey, ...headerGroupProps } = headerGroup.getHeaderGroupProps()
                          return (
                            <tr {...headerGroupProps} key={`eval-header-${viewMode}-${headerIndex}`}>
                              {headerGroup.headers.map((column, columnIndex) => {
                                const { key: _colKey, ...headerProps } = column.getHeaderProps(
                                  column.getSortByToggleProps()
                                )
                                return (
                                  <th
                                    {...headerProps}
                                    scope="col"
                                    className={`${EVAL_TH_CLASS} ${EVAL_TH_SORTABLE} group/th`}
                                    key={`eval-col-${viewMode}-${column.id ?? columnIndex}`}
                                    aria-sort={
                                      column.isSorted
                                        ? column.isSortedDesc
                                          ? 'descending'
                                          : 'ascending'
                                        : 'none'
                                    }
                                  >
                                    <SortHeaderLabel
                                      label={column.render('Header')}
                                      isSorted={column.isSorted}
                                      isSortedDesc={column.isSortedDesc}
                                    />
                                  </th>
                                )
                              })}
                            </tr>
                          )
                        })}
                      </thead>
                      <tbody {...tableBodyProps}>
                        {page.map((row, rowIndex) => {
                          prepareRow(row)
                          const { key: _rowKey, ...rowProps } = row.getRowProps()
                          const rowKey =
                            viewMode === 'student'
                              ? (row.original as StudentSummaryRow).studentId
                              : (row.original as CourseSummaryRow).courseId
                          return (
                            <tr
                              {...rowProps}
                              className={`border-b border-defaultborder/50 last:border-b-0 transition-colors duration-150 hover:bg-primary/5 dark:hover:bg-white/[0.03] ${evalRowClass(rowIndex)}`}
                              key={`eval-row-${viewMode}-${rowKey}`}
                            >
                              {row.cells.map((cell, cellIndex) => {
                                const { key: _cellKey, ...cellProps } = cell.getCellProps()
                                return (
                                  <td
                                    {...cellProps}
                                    className={EVAL_TD_CLASS}
                                    key={`eval-cell-${viewMode}-${cell.column.id ?? cellIndex}`}
                                  >
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
                  </div>
                </div>
                <div className="box-footer !border-t-0 px-4 pb-4 pt-2">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="text-[0.8125rem] text-defaulttextcolor/65 tabular-nums">
                      Showing {total === 0 ? 0 : pageIndex * pageSize + 1} to{' '}
                      {Math.min((pageIndex + 1) * pageSize, total)} of {total} entries
                    </div>
                    <div className="ms-auto">
                      <nav aria-label="Page navigation" className="pagination-style-4">
                        <ul className="ti-pagination mb-0">
                          <li className={`page-item ${!canPreviousPage ? 'disabled' : ''}`}>
                            <button
                              type="button"
                              className={EVAL_PAGE_LINK}
                              onClick={() => previousPage()}
                              disabled={!canPreviousPage}
                              aria-label="Previous page"
                            >
                              Prev
                            </button>
                          </li>
                          {paginationItems.map((item, idx) =>
                            item.type === 'ellipsis' ? (
                              <li key={`ellipsis-${idx}`} className="page-item disabled">
                                <span className="page-link px-2 py-[0.375rem] min-h-[44px]">…</span>
                              </li>
                            ) : (
                              <li
                                key={`page-${item.page}-${idx}`}
                                className={`page-item ${pageIndex === item.page ? 'active' : ''}`}
                              >
                                <button
                                  type="button"
                                  className={EVAL_PAGE_LINK}
                                  onClick={() => gotoPage(item.page!)}
                                  aria-current={pageIndex === item.page ? 'page' : undefined}
                                  aria-label={`Page ${(item.page ?? 0) + 1}`}
                                >
                                  {(item.page ?? 0) + 1}
                                </button>
                              </li>
                            )
                          )}
                          <li className={`page-item ${!canNextPage ? 'disabled' : ''}`}>
                            <button
                              type="button"
                              className={`${EVAL_PAGE_LINK} text-primary`}
                              onClick={() => nextPage()}
                              disabled={!canNextPage}
                              aria-label="Next page"
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

      <AtRiskOverlayPanel
        context={atRiskContext}
        rows={atRiskOverlayRows}
        onClose={closeAtRiskOverlay}
        onPreviewStudent={openStudentPanel}
        onViewProfile={handleViewStudentProfile}
        viewingProfileId={viewingProfileId}
      />

      <StudentPreviewPanel
        studentId={selectedStudent?.id ?? null}
        studentName={selectedStudent?.name ?? ''}
        evaluations={evaluations}
        onOpenProfile={handleViewStudentProfile}
        profileOpening={viewingProfileId !== null && viewingProfileId === selectedStudent?.id}
        onClose={() => {
          const el = document.querySelector('#student-preview-panel')
          if (el) (window as Window & { HSOverlay?: { close: (el: Element) => void } }).HSOverlay?.close(el)
          setSelectedStudent(null)
        }}
      />

      <StudentViewModal
        student={viewStudent}
        isLoading={viewingProfileId !== null}
        onClose={() => {
          const el = document.querySelector('#view-student-modal')
          if (el) (window as Window & { HSOverlay?: { close: (el: Element) => void } }).HSOverlay?.close(el)
          setViewStudent(null)
        }}
      />
    </Fragment>
  )
}

export default Evaluation
