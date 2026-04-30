"use client"

import Link from 'next/link'
import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment, useState, useEffect, useMemo } from 'react'
import pipelineStyles from '../ats-pipeline-list.module.css'
import { listPlacements } from '@/shared/lib/api/placements'
import type { Placement } from '@/shared/lib/api/placements'
import { getPlacementStatusActorSummary } from '@/shared/lib/ats/placementActorText'
import { JoiningDateTableCell } from '@/shared/components/ats/JoiningDateTableCell'
import { useFeaturePermissions } from '@/shared/hooks/use-feature-permissions'

const isValidMongoId = (id: unknown): id is string =>
  typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id)

const Onboarding = () => {
  const { canView, canEdit } = useFeaturePermissions('ats.onboarding')
  const [placements, setPlacements] = useState<Placement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [listSearch, setListSearch] = useState('')

  const fetchPlacements = () => {
    setLoading(true)
    setError(null)
    listPlacements({ status: 'Joined', limit: 100, page: 1 })
      .then((res) => setPlacements(res.results ?? []))
      .catch((err) => setError(err?.response?.data?.message || err?.message || 'Failed to load placements'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (canView) fetchPlacements()
  }, [canView])

  const filteredPlacements = useMemo(() => {
    const q = listSearch.trim().toLowerCase()
    if (!q) return placements
    return placements.filter((p) => {
      const name = (p.candidate?.fullName || '').toLowerCase()
      const email = (p.candidate?.email || '').toLowerCase()
      const job = (p.job?.title || '').toLowerCase()
      const empId = String(p.candidate?.employeeId || p.employeeId || '').toLowerCase()
      return name.includes(q) || email.includes(q) || job.includes(q) || empId.includes(q)
    })
  }, [placements, listSearch])

  const getCandidateDepartment = (p: Placement) => {
    const c = p.candidate as { department?: string } | undefined
    return c?.department ?? '-'
  }

  const getCandidateDesignation = (p: Placement) => {
    const c = p.candidate as { designation?: string } | undefined
    return c?.designation ?? '-'
  }

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
                  title="Count after search"
                >
                  {filteredPlacements.length}
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
            <div className="box-body !p-0 flex min-h-0 flex-1 flex-col overflow-hidden">
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
              ) : filteredPlacements.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-6 py-16 text-center text-gray-500 dark:text-gray-400">
                  <i className="ri-user-follow-line mb-3 block text-4xl opacity-50" aria-hidden />
                  <p className="mb-1 text-base font-medium text-gray-700 dark:text-gray-200">
                    {placements.length > 0 ? 'No matches' : 'No joined employees yet'}
                  </p>
                  <p className="mb-0 max-w-md text-sm">
                    {placements.length > 0
                      ? 'Try a different search, or clear the search box.'
                      : 'Employees appear here when their placement status is set to Joined.'}
                  </p>
                </div>
              ) : (
                <div
                  className={`table-responsive flex-1 overflow-y-auto ${pipelineStyles.tableCard} ${pipelineStyles.tableWrap}`}
                  style={{ minHeight: 0 }}
                >
                  <table className="table w-full min-w-full whitespace-nowrap text-[0.8125rem] text-defaulttextcolor dark:text-white/80">
                    <thead>
                      <tr className="border-b border-slate-200/90 dark:border-white/10">
                        <th
                          scope="col"
                          className="sticky top-0 z-10 border-b border-slate-200/90 bg-slate-100/90 px-2 py-2 text-start align-bottom text-[0.625rem] font-semibold uppercase leading-tight tracking-tight text-slate-500 shadow-sm first:pl-2.5 last:pr-2.5 dark:border-white/10 dark:bg-slate-900/90 dark:text-slate-400 sm:px-2.5 sm:text-[0.65rem] sm:leading-snug"
                        >
                          Employee
                        </th>
                        <th
                          scope="col"
                          className="sticky top-0 z-10 border-b border-slate-200/90 bg-slate-100/90 px-2 py-2 text-start align-bottom text-[0.625rem] font-semibold uppercase leading-tight tracking-tight text-slate-500 shadow-sm first:pl-2.5 last:pr-2.5 dark:border-white/10 dark:bg-slate-900/90 dark:text-slate-400 sm:px-2.5 sm:text-[0.65rem] sm:leading-snug"
                        >
                          Job
                        </th>
                        <th
                          scope="col"
                          className="sticky top-0 z-10 border-b border-slate-200/90 bg-slate-100/90 px-2 py-2 text-start align-bottom text-[0.625rem] font-semibold uppercase leading-tight tracking-tight text-slate-500 shadow-sm first:pl-2.5 last:pr-2.5 dark:border-white/10 dark:bg-slate-900/90 dark:text-slate-400 sm:px-2.5 sm:text-[0.65rem] sm:leading-snug"
                        >
                          Employee ID
                        </th>
                        <th
                          scope="col"
                          className="sticky top-0 z-10 border-b border-slate-200/90 bg-slate-100/90 px-2 py-2 text-start align-bottom text-[0.625rem] font-semibold uppercase leading-tight tracking-tight text-slate-500 shadow-sm first:pl-2.5 last:pr-2.5 dark:border-white/10 dark:bg-slate-900/90 dark:text-slate-400 sm:px-2.5 sm:text-[0.65rem] sm:leading-snug"
                        >
                          Joining Date
                        </th>
                        <th
                          scope="col"
                          className="sticky top-0 z-10 border-b border-slate-200/90 bg-slate-100/90 px-2 py-2 text-start align-bottom text-[0.625rem] font-semibold uppercase leading-tight tracking-tight text-slate-500 shadow-sm first:pl-2.5 last:pr-2.5 dark:border-white/10 dark:bg-slate-900/90 dark:text-slate-400 sm:px-2.5 sm:text-[0.65rem] sm:leading-snug"
                        >
                          Department
                        </th>
                        <th
                          scope="col"
                          className="sticky top-0 z-10 border-b border-slate-200/90 bg-slate-100/90 px-2 py-2 text-start align-bottom text-[0.625rem] font-semibold uppercase leading-tight tracking-tight text-slate-500 shadow-sm first:pl-2.5 last:pr-2.5 dark:border-white/10 dark:bg-slate-900/90 dark:text-slate-400 sm:px-2.5 sm:text-[0.65rem] sm:leading-snug"
                        >
                          Designation
                        </th>
                        <th
                          scope="col"
                          className="sticky top-0 z-10 border-b border-slate-200/90 bg-slate-100/90 px-2 py-2 text-start align-bottom text-[0.625rem] font-semibold uppercase leading-tight tracking-tight text-slate-500 shadow-sm first:pl-2.5 last:pr-2.5 dark:border-white/10 dark:bg-slate-900/90 dark:text-slate-400 sm:px-2.5 sm:text-[0.65rem] sm:leading-snug"
                        >
                          Status
                        </th>
                        <th
                          scope="col"
                          className="sticky top-0 z-10 border-b border-slate-200/90 bg-slate-100/90 px-2 py-2 text-end align-bottom text-[0.625rem] font-semibold uppercase leading-tight tracking-tight text-slate-500 shadow-sm first:pl-2.5 last:pr-2.5 dark:border-white/10 dark:bg-slate-900/90 dark:text-slate-400 sm:px-2.5 sm:text-[0.65rem] sm:leading-snug"
                        >
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPlacements.map((p, index) => {
                        const rowId = (p as { _id?: string; id?: string })._id ?? p.id ?? `onboarding-row-${index}`
                        const actorLine = getPlacementStatusActorSummary({
                          status: p.status,
                          deferredBy: p.deferredBy,
                          deferredAt: p.deferredAt,
                          cancelledBy: p.cancelledBy,
                          cancelledAt: p.cancelledAt,
                        }).secondary
                        return (
                          <tr
                            key={String(rowId)}
                            className={`border-b border-slate-200/80 transition-colors duration-150 ease-out last:border-b-0 hover:bg-slate-50/90 dark:border-white/10 dark:hover:bg-white/[0.04] ${pipelineStyles.rowIn}`}
                            style={{ animationDelay: `${Math.min(index, 16) * 45}ms` }}
                          >
                            <td className="whitespace-nowrap align-middle px-2.5 py-2 text-[12px] text-slate-800 sm:px-3 sm:py-2.5 sm:text-[13px] dark:text-slate-100">
                              <div>
                                <Link
                                  href={`/ats/employees?candidateId=${p.candidate?._id}`}
                                  className="font-medium text-primary hover:underline"
                                >
                                  {p.candidate?.fullName || '-'}
                                </Link>
                                <span className="block text-xs text-slate-500 dark:text-slate-400">
                                  {p.candidate?.email || ''}
                                </span>
                                {actorLine ? (
                                  <span className="mt-0.5 block max-w-[16rem] text-[10px] leading-tight text-slate-500 dark:text-slate-500">
                                    {actorLine}
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td className="whitespace-nowrap align-middle px-2.5 py-2 text-[12px] text-slate-800 sm:px-3 sm:py-2.5 sm:text-[13px] dark:text-slate-100">
                              {p.job?.title || '-'}
                            </td>
                            <td className="whitespace-nowrap align-middle px-2.5 py-2 text-[12px] text-slate-800 sm:px-3 sm:py-2.5 sm:text-[13px] dark:text-slate-100">
                              {p.candidate?.employeeId || p.employeeId || '-'}
                            </td>
                            <td className="whitespace-nowrap align-middle px-2.5 py-2 text-[12px] text-slate-800 sm:px-3 sm:py-2.5 sm:text-[13px] dark:text-slate-100">
                              <JoiningDateTableCell value={p.joiningDate} />
                            </td>
                            <td className="whitespace-nowrap align-middle px-2.5 py-2 text-[12px] text-slate-800 sm:px-3 sm:py-2.5 sm:text-[13px] dark:text-slate-100">
                              {getCandidateDepartment(p)}
                            </td>
                            <td className="whitespace-nowrap align-middle px-2.5 py-2 text-[12px] text-slate-800 sm:px-3 sm:py-2.5 sm:text-[13px] dark:text-slate-100">
                              {getCandidateDesignation(p)}
                            </td>
                            <td className="whitespace-nowrap align-middle px-2.5 py-2 text-[12px] sm:px-3 sm:py-2.5 sm:text-[13px]">
                              <div className="flex flex-col gap-1">
                                {(() => {
                                  const pb = (p.preBoardingStatus || 'Pending') as string;
                                  const pbColor = pb === 'Completed' ? 'bg-success/10 text-success' : pb === 'In Progress' ? 'bg-warning/10 text-warning' : 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400';
                                  const bgv = ((p.backgroundVerification as { status?: string } | undefined)?.status || 'Pending') as string;
                                  const bgvColor = bgv === 'Completed' || bgv === 'Verified' ? 'bg-success/10 text-success' : bgv === 'In Progress' ? 'bg-warning/10 text-warning' : 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400';
                                  return (
                                    <>
                                      <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[0.625rem] font-medium ${pbColor}`}>
                                        <i className="ri-suitcase-line text-[0.6rem]" aria-hidden />
                                        {pb}
                                      </span>
                                      <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[0.625rem] font-medium ${bgvColor}`}>
                                        <i className="ri-shield-check-line text-[0.6rem]" aria-hidden />
                                        BGV: {bgv}
                                      </span>
                                    </>
                                  );
                                })()}
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-2.5 py-2 text-end align-middle text-[12px] sm:px-3 sm:py-2.5 sm:text-[13px]">
                              <div className="flex flex-wrap items-center justify-end gap-2">
                                {canEdit && (() => {
                                  const pid = (p as { _id?: string; id?: string })._id ?? (p as { id?: string }).id
                                  const placementId = typeof pid === 'string' ? pid : ''
                                  return isValidMongoId(placementId) ? (
                                    <Link
                                      href={`/ats/onboarding/edit?id=${placementId}`}
                                      className="ti-btn ti-btn-sm ti-btn-primary shrink-0 whitespace-nowrap !w-auto !min-w-fit !h-8 !py-1.5 !px-3"
                                    >
                                      Edit HRMS
                                    </Link>
                                  ) : null
                                })()}
                                <Link
                                  href={`/ats/employees?candidateId=${(p.candidate as { _id?: string })?._id ?? (typeof p.candidate === 'string' ? p.candidate : '')}`}
                                  className="ti-btn ti-btn-sm ti-btn-light shrink-0 whitespace-nowrap !w-auto !min-w-fit !h-8 !py-1.5 !px-3"
                                >
                                  Profile
                                </Link>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="box-footer border-t border-defaultborder/60 dark:border-white/5 !px-3 !py-2 sm:!px-4">
              <div className="text-xs text-gray-600 sm:text-sm dark:text-gray-400">
                {loading || error ? null : (
                  <span>
                    {filteredPlacements.length} record{filteredPlacements.length !== 1 ? 's' : ''} shown
                    {listSearch.trim() && placements.length !== filteredPlacements.length
                      ? ` (filtered from ${placements.length})`
                      : ''}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  )
}

export default Onboarding
