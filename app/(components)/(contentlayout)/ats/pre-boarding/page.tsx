"use client"

import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment, useState, useEffect, useRef, useCallback, useMemo } from 'react'
import pipelineStyles from '../ats-pipeline-list.module.css'
import { useSearchParams, useRouter } from 'next/navigation'
import { listPlacements, updatePlacement, getPlacementById } from '@/shared/lib/api/placements'
import type { Placement, PreBoardingStatus, BGVStatus } from '@/shared/lib/api/placements'
import { getPlacementStatusActorSummary } from '@/shared/lib/ats/placementActorText'
import { useFeaturePermissions } from '@/shared/hooks/use-feature-permissions'
import Link from 'next/link'

const PRE_BOARDING_OPTIONS: PreBoardingStatus[] = ['Pending', 'In Progress', 'Completed']
const BGV_OPTIONS: BGVStatus[] = ['Pending', 'In Progress', 'Completed', 'Verified']
/** Not yet Onboarding: placement statuses shown in this queue (API comma-list). */
const PRE_BOARDING_QUEUE_STATUSES = 'Pending,Deferred,Cancelled' as const
type PlacementQueueFilter = '' | 'Pending' | 'Deferred' | 'Cancelled'

type PreBoardingFeedbackDialog =
  | {
      variant: 'validation'
      title: string
      intro?: string
      bullets?: string[]
    }
  | {
      variant: 'error'
      title: string
      body: string
      supportRef?: string
    }

const PreBoarding = () => {
  const { canView, canEdit } = useFeaturePermissions('ats.pre-boarding')
  const searchParams = useSearchParams()
  const router = useRouter()
  const deepLinkDone = useRef(false)
  const [placements, setPlacements] = useState<Placement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  /** Filter by placement status (row-level). Empty = all of Pending, Deferred, Cancelled. */
  const [placementStatusFilter, setPlacementStatusFilter] = useState<PlacementQueueFilter>('')
  const [listSearch, setListSearch] = useState('')
  const [editModal, setEditModal] = useState<Placement | null>(null)
  const [editForm, setEditForm] = useState<{
    placementStatus: 'Pending' | 'Joined' | 'Deferred' | 'Cancelled'
    preBoardingStatus: PreBoardingStatus
    bgvStatus: BGVStatus
    bgvNotes: string
    assets: { name: string; type: string; serialNumber: string; notes: string }[]
    itAccess: { system: string; accessLevel: string; notes: string }[]
  } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [preboardingGateBypassAck, setPreboardingGateBypassAck] = useState(false)
  const [feedbackDialog, setFeedbackDialog] = useState<PreBoardingFeedbackDialog | null>(null)

  useEffect(() => {
    if (!feedbackDialog) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFeedbackDialog(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [feedbackDialog])

  const fetchPlacements = useCallback(() => {
    setLoading(true)
    setError(null)
    const statusParam = placementStatusFilter === '' ? PRE_BOARDING_QUEUE_STATUSES : placementStatusFilter
    listPlacements({
      status: statusParam,
      limit: 100,
      page: 1,
    })
      .then((res) => setPlacements(res.results ?? []))
      .catch((err) => setError(err?.response?.data?.message || err?.message || 'Failed to load placements'))
      .finally(() => setLoading(false))
  }, [placementStatusFilter])

  useEffect(() => {
    if (canView) fetchPlacements()
  }, [canView, fetchPlacements])

  const openEdit = useCallback((p: Placement) => {
    setPreboardingGateBypassAck(false)
    setEditModal(p)
    const bv = p.backgroundVerification
    setEditForm({
      placementStatus: (p.status as 'Pending' | 'Joined' | 'Deferred' | 'Cancelled') || 'Pending',
      preBoardingStatus: (p.preBoardingStatus as PreBoardingStatus) || 'Pending',
      bgvStatus: (bv?.status as BGVStatus) || 'Pending',
      bgvNotes: bv?.notes || '',
      assets: (p.assetAllocation || []).map((a) => ({
        name: a.name,
        type: a.type || '',
        serialNumber: a.serialNumber || '',
        notes: a.notes || '',
      })),
      itAccess: (p.itAccess || []).map((i) => ({
        system: i.system,
        accessLevel: i.accessLevel || '',
        notes: i.notes || '',
      })),
    })
  }, [])

  const filteredPlacements = useMemo(() => {
    const q = listSearch.trim().toLowerCase()
    if (!q) return placements
    return placements.filter((p) => {
      const name = (p.candidate?.fullName || '').toLowerCase()
      const email = (p.candidate?.email || '').toLowerCase()
      const job = (p.job?.title || '').toLowerCase()
      return name.includes(q) || email.includes(q) || job.includes(q)
    })
  }, [placements, listSearch])

  useEffect(() => {
    if (!canView || deepLinkDone.current) return
    const pid = searchParams.get('placementId')
    if (!pid) return
    if (!/^[0-9a-fA-F]{24}$/.test(pid)) {
      setError('Invalid placement link')
      deepLinkDone.current = true
      router.replace('/ats/pre-boarding', { scroll: false })
      return
    }
    deepLinkDone.current = true
    getPlacementById(pid)
      .then((p) => {
        if (p.status !== 'Pending' && p.status !== 'Deferred' && p.status !== 'Cancelled') {
          setError('This placement is not in this queue (use Pending, Deferred, or Cancelled).')
          router.replace('/ats/pre-boarding', { scroll: false })
          return
        }
        openEdit(p)
        router.replace('/ats/pre-boarding', { scroll: false })
      })
      .catch(() => {
        setError('Placement not found or you do not have access.')
        router.replace('/ats/pre-boarding', { scroll: false })
      })
  }, [canView, searchParams, router, openEdit])

  const handleSavePreBoarding = async () => {
    if (!editModal || !editForm) return
    const placementId = (editModal as { _id?: string; id?: string })._id ?? editModal.id ?? ''
    if (!placementId || !/^[0-9a-fA-F]{24}$/.test(placementId)) {
      setFeedbackDialog({
        variant: 'error',
        title: 'Cannot save',
        body: 'This placement record is missing a valid ID. Close the dialog and open Edit again.',
      })
      return
    }
    const needsGateBypass =
      editForm.placementStatus === 'Joined' && editForm.preBoardingStatus !== 'Completed'
    if (needsGateBypass && !preboardingGateBypassAck) {
      setFeedbackDialog({
        variant: 'validation',
        title: 'Finish pre-boarding before marking Joined',
        intro:
          'Placement is set to Joined while pre-boarding is not Complete. Choose one of the following:',
        bullets: [
          'Set Pre-boarding status to Completed (recommended), or',
          'Turn on Override pre-boarding gate below if your role allows an exception.',
        ],
      })
      return
    }
    setSubmitting(true)
    try {
      await updatePlacement(placementId, {
        status: editForm.placementStatus,
        preBoardingStatus: editForm.preBoardingStatus,
        ...(needsGateBypass && preboardingGateBypassAck ? { preboardingGateBypass: true } : {}),
        backgroundVerification: {
          status: editForm.bgvStatus,
          notes: editForm.bgvNotes || undefined,
        },
        assetAllocation: editForm.assets.filter((a) => a.name.trim()).map((a) => ({
          name: a.name,
          type: a.type || undefined,
          serialNumber: a.serialNumber || undefined,
          notes: a.notes || undefined,
        })),
        itAccess: editForm.itAccess.filter((i) => i.system.trim()).map((i) => ({
          system: i.system,
          accessLevel: i.accessLevel || undefined,
          notes: i.notes || undefined,
        })),
      })
      setEditModal(null)
      setEditForm(null)
      fetchPlacements()
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string; errorCode?: string } }; message?: string }
      const data = ax?.response?.data
      const msg =
        typeof data?.message === 'string' && data.message.trim()
          ? data.message.trim()
          : ax?.message || 'Failed to update pre-boarding'
      const code = data?.errorCode
      const ref = code && !msg.includes(code) ? code : undefined
      setFeedbackDialog({
        variant: 'error',
        title: 'Could not save changes',
        body: msg,
        supportRef: ref,
      })
    } finally {
      setSubmitting(false)
    }
  }

  const addAsset = () => {
    if (!editForm) return
    setEditForm({ ...editForm, assets: [...editForm.assets, { name: '', type: '', serialNumber: '', notes: '' }] })
  }

  const removeAsset = (idx: number) => {
    if (!editForm) return
    setEditForm({ ...editForm, assets: editForm.assets.filter((_, i) => i !== idx) })
  }

  const updateAsset = (idx: number, field: string, value: string) => {
    if (!editForm) return
    const next = [...editForm.assets]
    ;(next[idx] as Record<string, string>)[field] = value
    setEditForm({ ...editForm, assets: next })
  }

  const addItAccess = () => {
    if (!editForm) return
    setEditForm({ ...editForm, itAccess: [...editForm.itAccess, { system: '', accessLevel: '', notes: '' }] })
  }

  const removeItAccess = (idx: number) => {
    if (!editForm) return
    setEditForm({ ...editForm, itAccess: editForm.itAccess.filter((_, i) => i !== idx) })
  }

  const updateItAccess = (idx: number, field: string, value: string) => {
    if (!editForm) return
    const next = [...editForm.itAccess]
    ;(next[idx] as Record<string, string>)[field] = value
    setEditForm({ ...editForm, itAccess: next })
  }

  if (!canView) {
    return (
      <Fragment>
        <Seo title="Pre-boarding" />
        <div className="mt-5 grid grid-cols-12 gap-6 sm:mt-6">
          <div className="col-span-12 p-6 rounded-lg border border-danger/20 bg-danger/5 text-danger">
            You do not have permission to view Pre-boarding.
          </div>
        </div>
      </Fragment>
    )
  }

  return (
    <Fragment>
      <Seo title="Pre-boarding" />
      <div className={`mt-5 grid grid-cols-12 gap-6 min-w-0 sm:mt-6 ${pipelineStyles.listShell}`}>
        <div className="col-span-12 min-w-0 flex flex-col">
          <div className="box min-w-0 flex flex-col">
            <div className="box-header flex flex-wrap items-center justify-between gap-2 overflow-visible">
              <div className="box-title min-w-0 flex-1">
                Pre-boarding
                <span className="ms-1 align-middle text-[0.7rem] font-normal text-slate-500 dark:text-slate-400 sm:text-[0.75rem]">
                  (Not yet joined: Pending, Deferred, or Cancelled)
                </span>
                <span
                  className="badge bg-light text-default rounded-full ms-1 text-[0.75rem] align-middle tabular-nums"
                  title="Count after search and filters"
                >
                  {filteredPlacements.length}
                </span>
              </div>
              <div
                className="flex max-w-full flex-col gap-2 sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center sm:gap-3"
                role="toolbar"
                aria-label="Pre-boarding list tools"
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
                  <span className="inline-flex items-center rounded-md bg-white dark:bg-slate-800/80 py-1.5 px-2.5 text-[0.75rem] shadow-sm font-semibold text-primary cursor-default select-none" aria-current="page">
                    <i className="ri-suitcase-line me-1 align-middle" aria-hidden />
                    Pre-boarding
                  </span>
                  <i className="ri-arrow-right-s-line text-slate-400 dark:text-slate-600 text-[0.85rem]" aria-hidden />
                  <Link
                    href="/ats/onboarding"
                    className="ti-btn ti-btn-light !mb-0 !w-auto !min-w-fit !rounded-md !border-0 !bg-transparent !py-1.5 !px-2.5 !text-[0.75rem] shadow-none hover:!bg-white dark:hover:!bg-slate-800/80"
                  >
                    <i className="ri-user-received-2-line me-1 align-middle opacity-80" aria-hidden />
                    Onboarding
                  </Link>
                </div>
                <div className="flex min-w-0 flex-wrap items-center gap-2 sm:ms-0 sm:border-l sm:border-slate-200/80 sm:pl-3 dark:sm:border-white/10">
                  <label className="sr-only" htmlFor="preboard-placement-status-filter">
                    Placement status
                  </label>
                  <select
                    id="preboard-placement-status-filter"
                    className="form-control !h-8 !w-auto min-w-[7.5rem] !rounded-md !border-slate-200/90 !bg-white !py-0 !pl-2 !pr-7 !text-[0.75rem] !leading-none text-slate-700 dark:!border-white/15 dark:!bg-slate-900/50 dark:text-slate-200"
                    value={placementStatusFilter}
                    onChange={(e) => setPlacementStatusFilter((e.target.value as PlacementQueueFilter) || '')}
                    title="Placement status (before Joined). All = Pending, Deferred, or Cancelled."
                  >
                    <option value="">All</option>
                    <option value="Pending">Pending</option>
                    <option value="Deferred">Deferred</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                  <div className="relative min-w-0 flex-1 sm:w-40 sm:flex-initial">
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
                    className="ti-btn ti-btn-light !mb-0 !h-8 !w-auto !min-w-fit !rounded-md !px-2.5 !py-0 !text-[0.75rem]"
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
                  <i className="ri-inbox-line mb-3 block text-4xl opacity-50" aria-hidden />
                  <p className="mb-1 text-base font-medium text-gray-700 dark:text-gray-200">
                    {placements.length > 0 ? 'No matches' : 'No placements in pre-boarding'}
                  </p>
                  <p className="mb-0 max-w-md text-sm">
                    {placements.length > 0
                      ? 'Try a different search, or clear the search box.'
                      : 'Use the first filter for placement status (Pending, Deferred, Cancelled). The second filter is the pre-boarding workflow (In Progress, etc.). Joined hires appear under Onboarding. If you are not an admin, you only see jobs you created or placements you own.'}
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
                          Candidate
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
                          Placement
                        </th>
                        <th
                          scope="col"
                          className="sticky top-0 z-10 border-b border-slate-200/90 bg-slate-100/90 px-2 py-2 text-start align-bottom text-[0.625rem] font-semibold uppercase leading-tight tracking-tight text-slate-500 shadow-sm first:pl-2.5 last:pr-2.5 dark:border-white/10 dark:bg-slate-900/90 dark:text-slate-400 sm:px-2.5 sm:text-[0.65rem] sm:leading-snug"
                          title="Checklist / workflow (see filter: workflow)"
                        >
                          Workflow
                        </th>
                        <th
                          scope="col"
                          className="sticky top-0 z-10 border-b border-slate-200/90 bg-slate-100/90 px-2 py-2 text-start align-bottom text-[0.625rem] font-semibold uppercase leading-tight tracking-tight text-slate-500 shadow-sm first:pl-2.5 last:pr-2.5 dark:border-white/10 dark:bg-slate-900/90 dark:text-slate-400 sm:px-2.5 sm:text-[0.65rem] sm:leading-snug"
                        >
                          BGV
                        </th>
                        <th
                          scope="col"
                          className="sticky top-0 z-10 border-b border-slate-200/90 bg-slate-100/90 px-2 py-2 text-start align-bottom text-[0.625rem] font-semibold uppercase leading-tight tracking-tight text-slate-500 shadow-sm first:pl-2.5 last:pr-2.5 dark:border-white/10 dark:bg-slate-900/90 dark:text-slate-400 sm:px-2.5 sm:text-[0.65rem] sm:leading-snug"
                        >
                          Assets
                        </th>
                        <th
                          scope="col"
                          className="sticky top-0 z-10 border-b border-slate-200/90 bg-slate-100/90 px-2 py-2 text-start align-bottom text-[0.625rem] font-semibold uppercase leading-tight tracking-tight text-slate-500 shadow-sm first:pl-2.5 last:pr-2.5 dark:border-white/10 dark:bg-slate-900/90 dark:text-slate-400 sm:px-2.5 sm:text-[0.65rem] sm:leading-snug"
                        >
                          IT Access
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
                        const placementId = (p as { _id?: string; id?: string })._id ?? p.id ?? ''
                        return (
                          <tr
                            key={placementId ? `${placementId}-${index}` : `preboarding-placement-${index}`}
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
                              </div>
                            </td>
                            <td className="whitespace-nowrap align-middle px-2.5 py-2 text-[12px] text-slate-800 sm:px-3 sm:py-2.5 sm:text-[13px] dark:text-slate-100">
                              {p.job?.title || '-'}
                            </td>
                            <td className="whitespace-nowrap align-middle px-2.5 py-2 text-[12px] text-slate-800 sm:px-3 sm:py-2.5 sm:text-[13px] dark:text-slate-100">
                              <span
                                className={`badge ${
                                  p.status === 'Cancelled'
                                    ? 'bg-rose-50 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200'
                                    : p.status === 'Deferred'
                                      ? 'bg-violet-50 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200'
                                      : 'bg-amber-50 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200'
                                } border rounded px-2 py-1`}
                              >
                                {p.status || 'Pending'}
                              </span>
                            </td>
                            <td className="whitespace-nowrap align-middle px-2.5 py-2 text-[12px] text-slate-800 sm:px-3 sm:py-2.5 sm:text-[13px] dark:text-slate-100">
                              <span
                                className={`badge ${
                                  (p.preBoardingStatus || 'Pending') === 'Completed'
                                    ? 'bg-success/10 text-success'
                                    : (p.preBoardingStatus || 'Pending') === 'In Progress'
                                      ? 'bg-warning/10 text-warning'
                                      : 'bg-gray/10 text-gray'
                                } border rounded px-2 py-1`}
                              >
                                {p.preBoardingStatus || 'Pending'}
                              </span>
                            </td>
                            <td className="whitespace-nowrap align-middle px-2.5 py-2 text-[12px] text-slate-800 sm:px-3 sm:py-2.5 sm:text-[13px] dark:text-slate-100">
                              <span
                                className={`badge ${
                                  (p.backgroundVerification?.status || 'Pending') === 'Verified' ||
                                  (p.backgroundVerification?.status || 'Pending') === 'Completed'
                                    ? 'bg-success/10 text-success'
                                    : (p.backgroundVerification?.status || 'Pending') === 'In Progress'
                                      ? 'bg-warning/10 text-warning'
                                      : 'bg-gray/10 text-gray'
                                } border rounded px-2 py-1`}
                              >
                                {p.backgroundVerification?.status || 'Pending'}
                              </span>
                            </td>
                            <td className="whitespace-nowrap align-middle px-2.5 py-2 text-[12px] text-slate-800 sm:px-3 sm:py-2.5 sm:text-[13px] dark:text-slate-100">
                              {(p.assetAllocation || []).length} item(s)
                            </td>
                            <td className="whitespace-nowrap align-middle px-2.5 py-2 text-[12px] text-slate-800 sm:px-3 sm:py-2.5 sm:text-[13px] dark:text-slate-100">
                              {(p.itAccess || []).length} system(s)
                            </td>
                            <td className="whitespace-nowrap px-2.5 py-2 text-end align-middle text-[12px] sm:px-3 sm:py-2.5 sm:text-[13px]">
                              <div className="flex flex-wrap items-center justify-end gap-2">
                                {canEdit && (
                                  <button
                                    type="button"
                                    className="ti-btn ti-btn-sm ti-btn-primary shrink-0 whitespace-nowrap !w-auto !min-w-fit !h-8 !py-1.5 !px-3"
                                    onClick={() => openEdit(p)}
                                  >
                                    Edit
                                  </button>
                                )}
                                <Link
                                  href={`/ats/employees?candidateId=${p.candidate?._id}`}
                                  className="ti-btn ti-btn-sm ti-btn-light shrink-0 whitespace-nowrap !w-auto !min-w-fit !h-8 !py-1.5 !px-3"
                                >
                                  Documents
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
                    {filteredPlacements.length} placement{filteredPlacements.length !== 1 ? 's' : ''} shown
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

      {/* Edit Pre-boarding Modal - use !opacity-100 !pointer-events-auto so it shows when opened via React state */}
      {editModal && editForm && (
        <div
          id="edit-preboarding-modal"
          className="hs-overlay ti-modal active overflow-y-auto !opacity-100 !pointer-events-auto [--auto-close:false]"
          tabIndex={-1}
          style={{ zIndex: 80 }}
        >
          <div className="hs-overlay-open:mt-7 ti-modal-box ti-modal-lg !max-w-3xl">
            <div className="ti-modal-content overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-lg dark:border-white/10 dark:bg-slate-950">
              <div className="ti-modal-header flex items-start gap-3 border-b border-slate-200/80 !py-4 dark:border-white/10 sm:!px-5">
                <span className="mt-0.5 inline-block h-9 w-0.5 shrink-0 rounded-full bg-primary" aria-hidden />
                <div className="min-w-0 flex-1">
                  <h4 className="ti-modal-title mb-0.5 text-base font-semibold text-slate-800 dark:text-slate-100">
                    Edit Pre-boarding
                  </h4>
                  <p className="mb-0 text-sm text-slate-500 dark:text-slate-400">
                    {editModal.candidate?.fullName}
                    {editModal.job?.title ? (
                      <span className="text-slate-400 dark:text-slate-500"> · {editModal.job.title}</span>
                    ) : null}
                  </p>
                </div>
                <button
                  type="button"
                  className="ti-btn ti-btn-light !shrink-0 ti-btn-sm"
                  onClick={() => {
                    setEditModal(null)
                    setEditForm(null)
                  }}
                  aria-label="Close"
                >
                  <i className="ri-close-line" />
                </button>
              </div>
              <div className="ti-modal-body !p-0">
                <div className="max-h-[min(70vh,36rem)] space-y-4 overflow-y-auto px-4 py-4 sm:space-y-5 sm:px-6 sm:py-5">
                  <div className={`overflow-hidden ${pipelineStyles.tableCard}`}>
                    <div className="border-b border-slate-200/90 bg-slate-50/90 px-4 py-2.5 dark:border-white/10 dark:bg-slate-900/50 sm:px-5">
                      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Placement &amp; pre-boarding</h3>
                      <p className="mb-0 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        Set Joined to move this hire to the Onboarding list when ready.
                      </p>
                    </div>
                    <div className="p-4 sm:p-5">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                        <div className="min-w-0">
                          <label className="form-label" htmlFor="preb-placement-status">
                            Placement status
                          </label>
                          <select
                            id="preb-placement-status"
                            className="form-control"
                            value={editForm.placementStatus}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                placementStatus: e.target.value as 'Pending' | 'Joined' | 'Deferred' | 'Cancelled',
                              })
                            }
                          >
                            <option value="Pending">Pending</option>
                            <option value="Joined">Joined</option>
                            <option value="Deferred">Deferred</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </div>
                        <div className="min-w-0">
                          <label className="form-label" htmlFor="preb-pb-status">
                            Pre-boarding status
                          </label>
                          <select
                            id="preb-pb-status"
                            className="form-control"
                            value={editForm.preBoardingStatus}
                            onChange={(e) => setEditForm({ ...editForm, preBoardingStatus: e.target.value as PreBoardingStatus })}
                          >
                            {PRE_BOARDING_OPTIONS.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {editModal
                        ? (() => {
                            const { primary, secondary } = getPlacementStatusActorSummary({
                              status: editModal.status,
                              deferredBy: editModal.deferredBy,
                              deferredAt: editModal.deferredAt,
                              cancelledBy: editModal.cancelledBy,
                              cancelledAt: editModal.cancelledAt,
                            })
                            if (!primary && !secondary) return null
                            return (
                              <div className="mt-3 rounded-lg border border-slate-200/80 bg-slate-50/50 px-3 py-2 text-sm text-slate-600 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-300">
                                {primary ? <p className="mb-0">{primary}</p> : null}
                                {secondary ? <p className="mb-0 text-xs text-slate-500 dark:text-slate-400">{secondary}</p> : null}
                              </div>
                            )
                          })()
                        : null}
                      {editForm.placementStatus === 'Joined' && editForm.preBoardingStatus !== 'Completed' && (
                        <div className="mt-4 rounded-lg border border-amber-200/90 bg-amber-50/90 p-3 text-sm text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
                          <label className="flex cursor-pointer items-start gap-2">
                            <input
                              type="checkbox"
                              className="mt-1"
                              checked={preboardingGateBypassAck}
                              onChange={(e) => setPreboardingGateBypassAck(e.target.checked)}
                            />
                            <span>
                              Override pre-boarding gate (requires permission). Use only when pre-boarding is intentionally
                              incomplete but the hire should still be marked Joined.
                            </span>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={`overflow-hidden ${pipelineStyles.tableCard}`}>
                    <div className="border-b border-slate-200/90 bg-slate-50/90 px-4 py-2.5 dark:border-white/10 dark:bg-slate-900/50 sm:px-5">
                      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Background verification (BGV)</h3>
                      <p className="mb-0 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        Track BGV status and notes before join date.
                      </p>
                    </div>
                    <div className="p-4 sm:p-5">
                      <div className="min-w-0 max-w-sm">
                        <label className="form-label" htmlFor="preb-bgv-status">
                          Status
                        </label>
                        <select
                          id="preb-bgv-status"
                          className="form-control"
                          value={editForm.bgvStatus}
                          onChange={(e) => setEditForm({ ...editForm, bgvStatus: e.target.value as BGVStatus })}
                        >
                          {BGV_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="mt-4 min-w-0">
                        <label className="form-label" htmlFor="preb-bgv-notes">
                          Notes
                        </label>
                        <textarea
                          id="preb-bgv-notes"
                          className="form-control"
                          rows={2}
                          value={editForm.bgvNotes}
                          onChange={(e) => setEditForm({ ...editForm, bgvNotes: e.target.value })}
                          placeholder="BGV notes"
                        />
                      </div>
                    </div>
                  </div>

                  <div className={`overflow-hidden ${pipelineStyles.tableCard}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/90 bg-slate-50/90 px-4 py-2.5 dark:border-white/10 dark:bg-slate-900/50 sm:px-5">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Asset allocation</h3>
                        <p className="mb-0 text-xs text-slate-500 dark:text-slate-400">Laptops, badges, and hardware.</p>
                      </div>
                      <button
                        type="button"
                        className="ti-btn ti-btn-success !mb-0 !w-auto !min-w-fit !py-1 !px-2 !text-[0.75rem]"
                        onClick={addAsset}
                      >
                        <i className="ri-add-line" aria-hidden /> Add
                      </button>
                    </div>
                    <div className="space-y-2.5 p-4 sm:p-5">
                      {editForm.assets.map((a, idx) => (
                        <div
                          key={idx}
                          className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200/80 bg-slate-50/40 p-3 dark:border-white/10 dark:bg-white/[0.02]"
                        >
                          <input
                            type="text"
                            className="form-control min-w-[120px] flex-1"
                            placeholder="Asset name"
                            value={a.name}
                            onChange={(e) => updateAsset(idx, 'name', e.target.value)}
                          />
                          <input
                            type="text"
                            className="form-control min-w-[80px]"
                            placeholder="Type"
                            value={a.type}
                            onChange={(e) => updateAsset(idx, 'type', e.target.value)}
                          />
                          <input
                            type="text"
                            className="form-control min-w-[100px]"
                            placeholder="Serial #"
                            value={a.serialNumber}
                            onChange={(e) => updateAsset(idx, 'serialNumber', e.target.value)}
                          />
                          <input
                            type="text"
                            className="form-control min-w-[100px]"
                            placeholder="Notes"
                            value={a.notes}
                            onChange={(e) => updateAsset(idx, 'notes', e.target.value)}
                          />
                          <button
                            type="button"
                            className="ti-btn ti-btn-danger !mb-0 ti-btn-sm shrink-0"
                            onClick={() => removeAsset(idx)}
                            aria-label="Remove row"
                          >
                            <i className="ri-delete-bin-line" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={`overflow-hidden ${pipelineStyles.tableCard}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/90 bg-slate-50/90 px-4 py-2.5 dark:border-white/10 dark:bg-slate-900/50 sm:px-5">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">IT access</h3>
                        <p className="mb-0 text-xs text-slate-500 dark:text-slate-400">Email, VPN, and internal systems.</p>
                      </div>
                      <button
                        type="button"
                        className="ti-btn ti-btn-success !mb-0 !w-auto !min-w-fit !py-1 !px-2 !text-[0.75rem]"
                        onClick={addItAccess}
                      >
                        <i className="ri-add-line" aria-hidden /> Add
                      </button>
                    </div>
                    <div className="space-y-2.5 p-4 sm:p-5">
                      {editForm.itAccess.map((i, idx) => (
                        <div
                          key={idx}
                          className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200/80 bg-slate-50/40 p-3 dark:border-white/10 dark:bg-white/[0.02]"
                        >
                          <input
                            type="text"
                            className="form-control min-w-[120px] flex-1"
                            placeholder="System (e.g. Email, Slack)"
                            value={i.system}
                            onChange={(e) => updateItAccess(idx, 'system', e.target.value)}
                          />
                          <input
                            type="text"
                            className="form-control min-w-[100px]"
                            placeholder="Access level"
                            value={i.accessLevel}
                            onChange={(e) => updateItAccess(idx, 'accessLevel', e.target.value)}
                          />
                          <input
                            type="text"
                            className="form-control min-w-[100px]"
                            placeholder="Notes"
                            value={i.notes}
                            onChange={(e) => updateItAccess(idx, 'notes', e.target.value)}
                          />
                          <button
                            type="button"
                            className="ti-btn ti-btn-danger !mb-0 ti-btn-sm shrink-0"
                            onClick={() => removeItAccess(idx)}
                            aria-label="Remove row"
                          >
                            <i className="ri-delete-bin-line" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="ti-modal-footer flex flex-wrap items-center justify-end gap-2 border-t border-slate-200/80 !px-4 !py-3 dark:border-white/10 sm:!px-6">
                <button
                  type="button"
                  className="ti-btn ti-btn-light"
                  onClick={() => {
                    setEditModal(null)
                    setEditForm(null)
                  }}
                >
                  Cancel
                </button>
                <button type="button" className="ti-btn ti-btn-primary" onClick={handleSavePreBoarding} disabled={submitting}>
                  {submitting ? <i className="ri-loader-4-line animate-spin" aria-hidden /> : 'Save'}
                </button>
              </div>
            </div>
          </div>
          <div
            className="hs-overlay-backdrop ti-modal-backdrop"
            onClick={() => {
              setEditModal(null)
              setEditForm(null)
            }}
          />
        </div>
      )}

      {feedbackDialog && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[3px] transition-opacity dark:bg-black/55"
            aria-label="Dismiss"
            onClick={() => setFeedbackDialog(null)}
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="preboarding-feedback-title"
            aria-describedby="preboarding-feedback-desc"
            className={`relative w-full max-w-[26rem] overflow-hidden rounded-2xl border shadow-[0_22px_55px_-18px_rgba(15,23,42,0.35)] dark:shadow-black/40 ${
              feedbackDialog.variant === 'validation'
                ? 'border-amber-300/90 bg-gradient-to-b from-amber-50/98 to-white dark:border-amber-600/35 dark:from-amber-950/50 dark:to-slate-950'
                : 'border-rose-200/95 bg-gradient-to-b from-rose-50/95 to-white dark:border-rose-900/45 dark:from-rose-950/35 dark:to-slate-950'
            }`}
          >
            <div
              className={`flex items-start gap-3 px-5 pb-3 pt-5 sm:px-6 sm:pt-6 ${
                feedbackDialog.variant === 'validation'
                  ? 'border-b border-amber-200/80 dark:border-amber-800/40'
                  : 'border-b border-rose-200/70 dark:border-rose-900/35'
              }`}
            >
              <span
                className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${
                  feedbackDialog.variant === 'validation'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-100'
                    : 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-100'
                }`}
                aria-hidden
              >
                <i className={feedbackDialog.variant === 'validation' ? 'ri-alert-line' : 'ri-error-warning-line'} />
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  {feedbackDialog.variant === 'validation' ? 'Before you continue' : 'Something went wrong'}
                </p>
                <h3 id="preboarding-feedback-title" className="mt-1 text-[1.05rem] font-semibold leading-snug text-slate-900 dark:text-white">
                  {feedbackDialog.title}
                </h3>
              </div>
            </div>
            <div id="preboarding-feedback-desc" className="px-5 pb-5 pt-4 text-[13px] leading-relaxed text-slate-700 dark:text-slate-300 sm:px-6">
              {feedbackDialog.variant === 'validation' ? (
                <div className="space-y-3">
                  {feedbackDialog.intro ? <p className="mb-0">{feedbackDialog.intro}</p> : null}
                  {feedbackDialog.bullets && feedbackDialog.bullets.length > 0 ? (
                    <ul className="mb-0 space-y-2 border-l-2 border-amber-400/70 py-0.5 ps-4 dark:border-amber-500/40">
                      {feedbackDialog.bullets.map((line, idx) => (
                        <li key={idx} className="leading-snug">
                          {line}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="whitespace-pre-wrap rounded-xl border border-slate-200/90 bg-white/90 px-3.5 py-3 text-[13px] text-slate-800 shadow-inner dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-100">
                    {feedbackDialog.body}
                  </div>
                  {feedbackDialog.supportRef ? (
                    <p className="mb-0 text-[11px] text-slate-500 dark:text-slate-400">
                      Support reference:{' '}
                      <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700 dark:bg-white/10 dark:text-slate-200">
                        {feedbackDialog.supportRef}
                      </code>
                    </p>
                  ) : null}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200/80 bg-slate-50/90 px-5 py-3.5 dark:border-white/10 dark:bg-white/[0.03] sm:px-6">
              <button
                type="button"
                className="ti-btn ti-btn-primary min-w-[6.5rem] rounded-xl px-5 py-2 text-sm font-semibold shadow-sm"
                onClick={() => setFeedbackDialog(null)}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  )
}

export default PreBoarding
