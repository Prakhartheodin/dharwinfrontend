"use client"

import Link from 'next/link'
import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment, useState, useEffect, useCallback, useRef } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import pipelineStyles from '../ats-pipeline-list.module.css'
import { listPlacements } from '@/shared/lib/api/placements'
import type { Placement } from '@/shared/lib/api/placements'
import { getPlacementStatusActorSummary } from '@/shared/lib/ats/placementActorText'
import { JoiningDateTableCell } from '@/shared/components/ats/JoiningDateTableCell'
import ListPagination from '@/shared/components/ListPagination'
import { useFeaturePermissions } from '@/shared/hooks/use-feature-permissions'

/** Same default as Jobs / Students / Recruiters. */
const LIST_PAGE_SIZE = 10

function parseListPage(raw: string | null | undefined): number {
  const n = Number.parseInt(String(raw ?? ''), 10)
  return Number.isInteger(n) && n >= 1 ? n : 1
}

function isValidMongoId(id: unknown): id is string {
  return typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id)
}

// toJSON plugin maps _id → id on populated subdocs, so check both.
function resolveCandidateId(c: unknown): string | undefined {
  if (typeof c === 'string' && c) return c
  if (c && typeof c === 'object') {
    const obj = c as { _id?: unknown; id?: unknown }
    if (obj._id) return String(obj._id)
    if (obj.id) return String(obj.id)
  }
  return undefined
}

function resolvePlacementId(p: Placement): string {
  const pid = (p as { _id?: string; id?: string })._id ?? p.id
  return typeof pid === 'string' ? pid : ''
}

function getCandidateDepartment(p: Placement): string {
  if (p.status === 'Cancelled' || p.status === 'Deferred') return 'None'
  const dept = (p.candidate as { department?: string } | undefined)?.department?.trim()
  return dept || '-'
}

function getCandidateDesignation(p: Placement): string {
  return (p.candidate as { designation?: string } | undefined)?.designation ?? '-'
}

function placementChipClass(status: string): string {
  if (status === 'Cancelled') return 'bg-rose-50 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200'
  if (status === 'Deferred') return 'bg-violet-50 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200'
  if (status === 'Joined') return 'bg-success/10 text-success'
  return 'bg-amber-50 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200'
}

function workflowChipClass(status: string): string {
  if (status === 'Completed' || status === 'Verified') return 'bg-success/10 text-success'
  if (status === 'In Progress') return 'bg-warning/10 text-warning'
  return 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400'
}

const TH_CLASS =
  'border-b border-slate-200/90 bg-slate-50 px-2 py-2.5 text-start align-bottom text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-400'

const TD_CLASS =
  'min-w-0 align-middle px-2 py-2.5 text-[13px] text-slate-800 dark:text-slate-100'

type RowModel = {
  rowId: string
  placementId: string
  cid: string | undefined
  name: string
  email: string
  actorLine: string
  jobTitle: string
  designation: string
  sameJobDesig: boolean
  employeeId: string
  joiningDate: Placement['joiningDate']
  department: string
  placementStatus: string
  pb: string
  bgv: string
  bgvDone: boolean
}

function toRowModel(p: Placement, index: number): RowModel {
  const placementId = resolvePlacementId(p)
  const jobTitle = p.job?.title?.trim() || '-'
  const designation = getCandidateDesignation(p).trim()
  const bgv = (p.backgroundVerification as { status?: string } | undefined)?.status || 'Pending'
  return {
    rowId: placementId || `onboarding-row-${index}`,
    placementId,
    cid: resolveCandidateId(p.candidate),
    name: p.candidate?.fullName || '-',
    email: p.candidate?.email || '',
    actorLine: getPlacementStatusActorSummary({
      status: p.status,
      deferredBy: p.deferredBy,
      deferredAt: p.deferredAt,
      cancelledBy: p.cancelledBy,
      cancelledAt: p.cancelledAt,
    }).secondary,
    jobTitle,
    designation,
    sameJobDesig:
      jobTitle !== '-' && designation !== '-' && jobTitle.toLowerCase() === designation.toLowerCase(),
    employeeId: p.candidate?.employeeId || p.employeeId || '-',
    joiningDate: p.joiningDate,
    department: getCandidateDepartment(p),
    placementStatus: p.status || 'Onboarding',
    pb: p.preBoardingStatus || 'Pending',
    bgv,
    bgvDone: bgv === 'Completed' || bgv === 'Verified',
  }
}

function StatusChips({ row }: { row: RowModel }) {
  return (
    <div className="flex flex-wrap gap-1">
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${placementChipClass(row.placementStatus)}`}>
        <i className="ri-user-received-2-line text-[0.65rem]" aria-hidden />
        {row.placementStatus}
      </span>
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${workflowChipClass(row.pb)}`}>
        <i className="ri-suitcase-line text-[0.65rem]" aria-hidden />
        {row.pb}
      </span>
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${workflowChipClass(row.bgv)}`}
        title={`BGV: ${row.bgv}`}
      >
        <i className="ri-shield-check-line text-[0.65rem]" aria-hidden />
        {row.bgvDone ? 'BGV done' : 'BGV'}
      </span>
    </div>
  )
}

function ActionButtons({
  row,
  canEdit,
  layout,
}: {
  row: RowModel
  canEdit: boolean
  layout: 'card' | 'table'
}) {
  const card = layout === 'card'
  const wrap = card
    ? 'mt-2.5 flex flex-col gap-2 md:flex-row'
    : 'flex flex-wrap items-center justify-end gap-1.5'
  const size = card
    ? 'inline-flex min-h-11 flex-1 items-center justify-center !h-11 !min-w-11 !px-3 !py-2 !text-[0.8125rem]'
    : '!h-8 !min-w-fit !px-2.5 !py-1.5 !text-[0.75rem]'
  return (
    <div className={wrap}>
      {canEdit && isValidMongoId(row.placementId) ? (
        <Link
          href={`/ats/onboarding/edit?id=${row.placementId}`}
          className={`ti-btn ti-btn-sm ti-btn-primary shrink-0 whitespace-nowrap !w-auto !mb-0 ${size}`}
        >
          Edit HRMS
        </Link>
      ) : null}
      {row.cid ? (
        <Link
          href={`/ats/employees/edit?id=${row.cid}`}
          className={`ti-btn ti-btn-sm ti-btn-light shrink-0 whitespace-nowrap !w-auto !mb-0 ${size}`}
        >
          Profile
        </Link>
      ) : (
        <button
          type="button"
          disabled
          className={`ti-btn ti-btn-sm ti-btn-light shrink-0 cursor-not-allowed whitespace-nowrap !w-auto !mb-0 opacity-50 ${size}`}
          title="Candidate record missing"
        >
          Profile
        </button>
      )}
    </div>
  )
}

function EmployeeBlock({
  row,
  showIdUnderName,
}: {
  row: RowModel
  showIdUnderName?: boolean
}) {
  return (
    <div className="min-w-0">
      {row.cid ? (
        <Link
          href={`/ats/employees/edit?id=${row.cid}`}
          className="block truncate font-medium text-primary hover:underline"
          title={row.name}
        >
          {row.name}
        </Link>
      ) : (
        <span className="block truncate font-medium text-slate-800 dark:text-slate-100" title={row.name}>
          {row.name}
        </span>
      )}
      {row.email ? (
        <span className="block truncate text-xs text-slate-500 dark:text-slate-400" title={row.email}>
          {row.email}
        </span>
      ) : null}
      {showIdUnderName && row.employeeId !== '-' ? (
        <span className="block truncate text-xs text-slate-500 dark:text-slate-400 xl:hidden" title={row.employeeId}>
          {row.employeeId}
        </span>
      ) : null}
      {row.actorLine ? (
        <span className="mt-0.5 block truncate text-[10px] leading-tight text-slate-500">{row.actorLine}</span>
      ) : null}
    </div>
  )
}

function JobBlock({ row }: { row: RowModel }) {
  return (
    <div className="min-w-0">
      <div className={pipelineStyles.jobClamp} title={row.jobTitle}>
        {row.jobTitle}
      </div>
      {!row.sameJobDesig && row.designation && row.designation !== '-' ? (
        <span className="block truncate text-xs text-slate-500 dark:text-slate-400" title={row.designation}>
          {row.designation}
        </span>
      ) : null}
    </div>
  )
}

const Onboarding = () => {
  const { canView, canEdit } = useFeaturePermissions('ats.onboarding')
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [placements, setPlacements] = useState<Placement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [listSearch, setListSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [apiPage, setApiPage] = useState(() => parseListPage(searchParams.get('page')))
  const [totalResults, setTotalResults] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const fetchGenerationRef = useRef(0)
  const prevDebouncedSearchRef = useRef(debouncedSearch)

  useEffect(() => {
    const fromUrl = parseListPage(searchParams.get('page'))
    setApiPage((prev) => (prev === fromUrl ? prev : fromUrl))
  }, [searchParams])

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    const urlPage = parseListPage(params.get('page'))
    if (urlPage === apiPage) return
    if (apiPage <= 1) params.delete('page')
    else params.set('page', String(apiPage))
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [apiPage, pathname, router, searchParams])

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(listSearch), 300)
    return () => window.clearTimeout(t)
  }, [listSearch])

  useEffect(() => {
    if (prevDebouncedSearchRef.current === debouncedSearch) return
    prevDebouncedSearchRef.current = debouncedSearch
    setApiPage(1)
  }, [debouncedSearch])

  /**
   * Onboarding queue: status=Onboarding (pre-boarding completed, awaiting joining) ∪
   * status=Joined (already started). Promotion Onboarding → Joined happens in Onboarding edit.
   */
  const fetchPlacements = useCallback(() => {
    if (!canView) return
    const generation = ++fetchGenerationRef.current
    setLoading(true)
    setError(null)
    listPlacements({
      stage: 'onboarding',
      limit: LIST_PAGE_SIZE,
      page: apiPage,
      ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
    })
      .then((res) => {
        if (generation !== fetchGenerationRef.current) return
        setPlacements(res.results ?? [])
        setTotalResults(res.totalResults ?? 0)
        setTotalPages(res.totalPages ?? 0)
      })
      .catch((err) => {
        if (generation !== fetchGenerationRef.current) return
        setError(err?.response?.data?.message || err?.message || 'Failed to load placements')
        setPlacements([])
        setTotalResults(0)
        setTotalPages(0)
      })
      .finally(() => {
        if (generation === fetchGenerationRef.current) setLoading(false)
      })
  }, [canView, apiPage, debouncedSearch])

  useEffect(() => {
    fetchPlacements()
  }, [fetchPlacements])

  const showDepartment = placements.some((p) => getCandidateDepartment(p) !== '-')
  const hasSearch = Boolean(debouncedSearch.trim())

  if (!canView) {
    return (
      <Fragment>
        <Seo title="Onboarding" />
        <div className="mt-5 grid grid-cols-12 gap-6 sm:mt-6">
          <div className="col-span-12 p-6 rounded-lg border border-danger/20 bg-danger/5 text-danger">
            You do not have permission to view Onboarding.
          </div>
        </div>
      </Fragment>
    )
  }

  return (
    <Fragment>
      <Seo title="Onboarding" />
      <div className={`mt-5 grid grid-cols-12 gap-6 min-w-0 sm:mt-6 ${pipelineStyles.listShell}`}>
        <div className="col-span-12 min-w-0 flex flex-col">
          <div className="box min-w-0 flex flex-col">
            <div className="box-header flex flex-wrap items-center justify-between gap-2 overflow-visible">
              <div className="box-title min-w-0 flex-1">
                Onboarding
                <span className="ms-1 align-middle text-[0.7rem] font-normal text-slate-500 dark:text-slate-400 sm:text-[0.75rem]">
                  (Joined employees – HRMS)
                </span>
                <span
                  className="badge bg-light text-default rounded-full ms-1 text-[0.75rem] align-middle tabular-nums"
                  title="Total matching this queue"
                >
                  {totalResults}
                </span>
              </div>
              <div
                className="flex max-w-full flex-col gap-2 sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center sm:gap-3"
                role="toolbar"
                aria-label="Onboarding list tools"
              >
                <div
                  className="inline-flex flex-wrap items-center gap-0.5 rounded-lg border border-slate-200/90 bg-slate-50/90 p-0.5 shadow-sm dark:border-white/10 dark:bg-slate-900/40"
                  aria-label="Pipeline pages"
                >
                  <Link
                    href="/ats/offers-placement"
                    className="ti-btn ti-btn-light !mb-0 !w-auto !min-w-fit !rounded-md !border-0 !bg-transparent !py-1.5 !px-2.5 !text-[0.75rem] shadow-none hover:!bg-white dark:hover:!bg-slate-800/80"
                  >
                    <i className="ri-file-paper-2-line me-1 align-middle opacity-80" aria-hidden />
                    Offers &amp; Placement
                  </Link>
                  <i className="ri-arrow-right-s-line text-slate-400 dark:text-slate-600 text-[0.85rem]" aria-hidden />
                  <Link
                    href="/ats/pre-boarding"
                    className="ti-btn ti-btn-light !mb-0 !w-auto !min-w-fit !rounded-md !border-0 !bg-transparent !py-1.5 !px-2.5 !text-[0.75rem] shadow-none hover:!bg-white dark:hover:!bg-slate-800/80"
                  >
                    <i className="ri-suitcase-line me-1 align-middle opacity-80" aria-hidden />
                    Pre-boarding
                  </Link>
                  <i className="ri-arrow-right-s-line text-slate-400 dark:text-slate-600 text-[0.85rem]" aria-hidden />
                  <span className="inline-flex items-center !rounded-md !bg-white dark:!bg-slate-800/80 !py-1.5 !px-2.5 !text-[0.75rem] shadow-sm font-semibold text-primary cursor-default select-none" aria-current="page">
                    <i className="ri-user-received-2-line me-1 align-middle" aria-hidden />
                    Onboarding
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:ms-0 sm:max-w-md sm:border-l sm:border-slate-200/80 sm:pl-3 dark:sm:border-white/10">
                  <div className="relative min-w-0 flex-1 sm:max-w-xs">
                    <i
                      className="ri-search-line pointer-events-none absolute left-2.5 top-1/2 z-[1] -translate-y-1/2 text-[0.75rem] text-slate-400"
                      aria-hidden
                    />
                    <input
                      type="search"
                      className="form-control !h-8 !w-full !rounded-md !border-slate-200/90 !bg-white !py-0 !ps-8 !pe-2.5 !text-[0.75rem] !leading-none placeholder:text-slate-400 dark:!border-white/15 dark:!bg-slate-900/50"
                      placeholder="Search…"
                      value={listSearch}
                      onChange={(e) => setListSearch(e.target.value)}
                      aria-label="Search this list"
                      autoComplete="off"
                    />
                  </div>
                  <button
                    type="button"
                    className="ti-btn ti-btn-light !mb-0 !h-8 !w-auto !min-w-fit !rounded-md !px-2.5 !py-0 !text-[0.75rem] shrink-0"
                    onClick={fetchPlacements}
                  >
                    <i className="ri-refresh-line me-1 align-middle text-[0.85rem] opacity-80" aria-hidden />
                    Refresh
                  </button>
                </div>
              </div>
            </div>
            <div className="box-body !p-0 flex min-h-0 min-w-0 flex-1 flex-col">
              {loading ? (
                <div
                  className="flex flex-col items-center justify-center gap-4 px-6 py-10"
                  role="status"
                  aria-live="polite"
                  aria-busy="true"
                >
                  <div className="flex w-full max-w-md flex-col gap-2">
                    <div className={`h-3 w-full ${pipelineStyles.skeleton}`} />
                    <div className={`h-3 w-[92%] ${pipelineStyles.skeleton}`} style={{ animationDelay: '0.08s' }} />
                    <div className={`h-3 w-[88%] ${pipelineStyles.skeleton}`} style={{ animationDelay: '0.16s' }} />
                    <div className={`h-3 w-[95%] ${pipelineStyles.skeleton}`} style={{ animationDelay: '0.24s' }} />
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                    <i className="ri-loader-4-line inline-block h-5 w-5 shrink-0 animate-spin text-primary" aria-hidden />
                    <span>Loading placements&hellip;</span>
                  </div>
                </div>
              ) : error ? (
                <div className="px-6 py-8 text-center text-danger">{error}</div>
              ) : placements.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-6 py-16 text-center text-gray-500 dark:text-gray-400">
                  <i className="ri-user-follow-line mb-3 block text-4xl opacity-50" aria-hidden />
                  <p className="mb-1 text-base font-medium text-gray-700 dark:text-gray-200">
                    {hasSearch ? 'No matches' : 'No joined employees yet'}
                  </p>
                  <p className="mb-0 max-w-md text-sm">
                    {hasSearch
                      ? 'Try a different search, or clear the search box.'
                      : 'Employees appear here when their placement status is set to Joined.'}
                  </p>
                </div>
              ) : (
                <div className={`min-w-0 max-w-full pb-14 ${pipelineStyles.tableCard}`}>
                  <div className="divide-y divide-slate-200/90 dark:divide-white/10 lg:hidden">
                    {placements.map((p, index) => {
                      const row = toRowModel(p, index)
                      return (
                        <article
                          key={row.rowId}
                          className={`px-3.5 py-3.5 ${pipelineStyles.rowIn}`}
                          style={{ animationDelay: `${Math.min(index, 16) * 45}ms` }}
                        >
                          <EmployeeBlock row={row} />
                          <div className={`mt-1 ${pipelineStyles.jobClamp}`} title={row.jobTitle}>
                            {row.jobTitle}
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                            {row.employeeId !== '-' ? <span>{row.employeeId}</span> : null}
                            <JoiningDateTableCell value={row.joiningDate} />
                          </div>
                          <div className="mt-2">
                            <StatusChips row={row} />
                          </div>
                          <ActionButtons row={row} canEdit={canEdit} layout="card" />
                        </article>
                      )
                    })}
                  </div>
                  <div className={`hidden min-w-0 max-w-full lg:block ${pipelineStyles.tableNoHScroll}`}>
                    <table
                      className={`table mb-0 whitespace-normal border-separate border-spacing-0 text-[0.8125rem] text-defaulttextcolor dark:text-white/80 ${pipelineStyles.tableFit}`}
                    >
                      <thead>
                        <tr>
                          <th scope="col" className={`${TH_CLASS} w-[28%] pl-3 xl:w-[22%]`}>
                            Employee
                          </th>
                          <th scope="col" className={`${TH_CLASS} w-[22%]`}>
                            Job
                          </th>
                          <th scope="col" className={`${TH_CLASS} hidden w-[10%] xl:table-cell`}>
                            Employee ID
                          </th>
                          <th scope="col" className={`${TH_CLASS} w-[14%]`}>
                            Joining Date
                          </th>
                          {showDepartment ? (
                            <th scope="col" className={`${TH_CLASS} hidden w-[10%] xl:table-cell`}>
                              Department
                            </th>
                          ) : null}
                          <th scope="col" className={`${TH_CLASS} w-[20%] xl:w-[18%]`}>
                            Status
                          </th>
                          <th scope="col" className={`${TH_CLASS} w-[16%] pe-14 text-end`}>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {placements.map((p, index) => {
                          const row = toRowModel(p, index)
                          return (
                            <tr
                              key={row.rowId}
                              className={`border-b border-slate-200/80 last:border-b-0 hover:bg-slate-50/90 dark:border-white/10 dark:hover:bg-white/[0.04] ${pipelineStyles.rowIn}`}
                              style={{ animationDelay: `${Math.min(index, 16) * 45}ms` }}
                            >
                              <td className={`${TD_CLASS} pl-3`}>
                                <EmployeeBlock row={row} showIdUnderName />
                              </td>
                              <td className={TD_CLASS}>
                                <JobBlock row={row} />
                              </td>
                              <td className={`${TD_CLASS} hidden xl:table-cell`}>{row.employeeId}</td>
                              <td className={TD_CLASS}>
                                <JoiningDateTableCell value={row.joiningDate} />
                              </td>
                              {showDepartment ? (
                                <td className={`${TD_CLASS} hidden xl:table-cell`}>{row.department}</td>
                              ) : null}
                              <td className={TD_CLASS}>
                                <StatusChips row={row} />
                              </td>
                              <td className={`${TD_CLASS} pe-14 text-end`}>
                                <ActionButtons row={row} canEdit={canEdit} layout="table" />
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            <div className="box-footer border-t border-defaultborder/60 dark:border-white/5 !px-3 !py-2 sm:!px-4">
              {loading || error ? null : (
                <ListPagination
                  page={apiPage}
                  totalPages={totalPages}
                  totalResults={totalResults}
                  pageSize={LIST_PAGE_SIZE}
                  onPageChange={setApiPage}
                  ariaLabel="Onboarding page navigation"
                  gotoInputId="onboarding-goto-page"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  )
}

export default Onboarding
