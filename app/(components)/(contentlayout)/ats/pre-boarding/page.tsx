"use client"

import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment, useState, useEffect, useRef, useCallback } from 'react'
import pipelineStyles from '../ats-pipeline-list.module.css'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { listPlacements, updatePlacement, getPlacementById } from '@/shared/lib/api/placements'
import type { Placement, BGVStatus } from '@/shared/lib/api/placements'
import { getPlacementStatusActorSummary } from '@/shared/lib/ats/placementActorText'
import { useFeaturePermissions } from '@/shared/hooks/use-feature-permissions'
import Link from 'next/link'
import { useModalBehavior } from '@/shared/hooks/useModalBehavior'
import ConfirmDiscardDialog from '@/shared/components/ConfirmDiscardDialog'
import PreBoardingDocumentsModal from './modals/PreBoardingDocumentsModal'
import ListPagination, { DEFAULT_LIST_PAGE_SIZE } from '@/shared/components/ListPagination'

function parseListPage(raw: string | null | undefined): number {
  const n = Number.parseInt(String(raw ?? ''), 10)
  return Number.isInteger(n) && n >= 1 ? n : 1
}

const BGV_OPTIONS: BGVStatus[] = ['Pending', 'In Progress', 'Completed', 'Verified']
const DIALOG_Z = 12050
const TOOLBAR_BTN =
  '!mb-0 !min-h-11 !inline-flex !items-center !justify-center !rounded-md !px-3 !py-2 !text-[0.8125rem]'
const ROW_BTN =
  'ti-btn ti-btn-sm shrink-0 whitespace-nowrap !w-auto !min-w-fit !min-h-11 !h-11 !py-2 !px-3 !inline-flex !items-center !justify-center'

const TH_CLASS =
  'sticky top-0 z-10 border-b border-slate-200/90 bg-slate-50 px-2 py-2.5 text-start align-bottom text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500 dark:border-white/10 dark:bg-slate-900 dark:text-slate-400'

const TD_CLASS = 'min-w-0 align-middle px-2 py-2.5 text-[13px] text-slate-800 dark:text-slate-100'

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

const resolvePlacementCandidateId = (p: Placement): string | undefined => {
  const c = p.candidate as unknown
  if (typeof c === 'string' && c) return c
  // toJSON plugin maps _id → id on populated subdocs, so check both.
  if (c && typeof c === 'object') {
    const obj = c as { _id?: unknown; id?: unknown }
    if (obj._id) return String(obj._id)
    if (obj.id) return String(obj.id)
  }
  const fallback = (p as unknown as { candidateId?: unknown }).candidateId
  return fallback ? String(fallback) : undefined
}

function resolvePlacementId(p: Placement): string {
  return (p as { _id?: string; id?: string })._id ?? p.id ?? ''
}

function placementChipClass(status: string): string {
  if (status === 'Cancelled') return 'bg-rose-50 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200'
  if (status === 'Deferred') return 'bg-violet-50 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200'
  return 'bg-amber-50 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200'
}

function workflowChipClass(status: string): string {
  if (status === 'Completed' || status === 'Verified') return 'bg-success/10 text-success'
  if (status === 'In Progress') return 'bg-warning/10 text-warning'
  return 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400'
}

type RowModel = {
  rowId: string
  placementId: string
  cid: string | undefined
  name: string
  email: string
  actorLine: string
  jobTitle: string
  placementStatus: string
  pb: string
  bgv: string
  assetCount: number
  itCount: number
  placement: Placement
}

function toRowModel(p: Placement, index: number): RowModel {
  const placementId = resolvePlacementId(p)
  const bgv = p.backgroundVerification?.status || 'Pending'
  return {
    rowId: placementId || `preboarding-row-${index}`,
    placementId,
    cid: resolvePlacementCandidateId(p),
    name: p.candidate?.fullName || '-',
    email: p.candidate?.email || '',
    actorLine: getPlacementStatusActorSummary({
      status: p.status,
      deferredBy: p.deferredBy,
      deferredAt: p.deferredAt,
      cancelledBy: p.cancelledBy,
      cancelledAt: p.cancelledAt,
    }).secondary,
    jobTitle: p.job?.title?.trim() || '-',
    placementStatus: p.status || 'Pending',
    pb: p.preBoardingStatus || 'Pending',
    bgv,
    assetCount: (p.assetAllocation || []).length,
    itCount: (p.itAccess || []).length,
    placement: p,
  }
}

function StatusChips({ row }: { row: RowModel }) {
  const bgvDone = row.bgv === 'Completed' || row.bgv === 'Verified'
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
        {bgvDone ? 'BGV done' : row.bgv}
      </span>
    </div>
  )
}

function openDocumentsForPlacement(
  p: Placement,
  setError: (msg: string) => void,
  setDocumentsCandidate: (v: { id: string; name: string }) => void
) {
  const cid = resolvePlacementCandidateId(p)
  if (!cid) {
    setError('Candidate record missing on this placement — cannot open documents.')
    return
  }
  const cObj = typeof p.candidate === 'object' && p.candidate ? p.candidate : null
  setDocumentsCandidate({
    id: cid,
    name: cObj?.fullName || cObj?.email || 'Candidate',
  })
}

const PreBoarding = () => {
  const { canView, canEdit, canCreate, canDelete } = useFeaturePermissions('ats.pre-boarding')
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const deepLinkDone = useRef(false)
  const [placements, setPlacements] = useState<Placement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  /** Filter by placement status (row-level). Empty = all of Pending, Deferred, Cancelled. */
  const [placementStatusFilter, setPlacementStatusFilter] = useState<PlacementQueueFilter>('')
  const [listSearch, setListSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [apiPage, setApiPage] = useState(() => parseListPage(searchParams.get('page')))
  const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE)
  const [totalResults, setTotalResults] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const fetchGenerationRef = useRef(0)
  const prevDebouncedSearchRef = useRef(debouncedSearch)
  const prevStatusFilterRef = useRef(placementStatusFilter)
  const [editModal, setEditModal] = useState<Placement | null>(null)
  const [editForm, setEditForm] = useState<{
    placementStatus: 'Pending' | 'Onboarding' | 'Deferred' | 'Cancelled'
    bgvStatus: BGVStatus
    bgvNotes: string
    assets: { name: string; type: string; serialNumber: string; notes: string }[]
    itAccess: { system: string; accessLevel: string; notes: string }[]
  } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [feedbackDialog, setFeedbackDialog] = useState<PreBoardingFeedbackDialog | null>(null)
  const [documentsCandidate, setDocumentsCandidate] = useState<{ id: string; name: string } | null>(null)
  const editFormSnapshotRef = useRef<string>('')

  useEffect(() => {
    if (!feedbackDialog) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFeedbackDialog(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [feedbackDialog])

  const fetchPlacements = useCallback(() => {
    if (!canView) return
    const generation = ++fetchGenerationRef.current
    setLoading(true)
    setError(null)
    // Stage owns the queue (offerStatus=Accepted, not-yet-onboarding); dropdown narrows within it.
    listPlacements({
      stage: 'preBoarding',
      ...(placementStatusFilter ? { status: placementStatusFilter } : {}),
      limit: pageSize,
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
  }, [canView, placementStatusFilter, apiPage, debouncedSearch, pageSize])

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

  const handlePageSizeChange = useCallback((nextSize: number) => {
    setPageSize(nextSize)
    setApiPage(1)
  }, [])

  useEffect(() => {
    if (prevStatusFilterRef.current === placementStatusFilter) return
    prevStatusFilterRef.current = placementStatusFilter
    setApiPage(1)
  }, [placementStatusFilter])

  useEffect(() => {
    fetchPlacements()
  }, [fetchPlacements])

  const openEdit = useCallback(
    (p: Placement) => {
      setEditModal(p)
      const bv = p.backgroundVerification
      /** Joined is set in Onboarding edit only. Other statuses pass through. */
      const initialStatus =
        p.status === 'Pending' || p.status === 'Onboarding' || p.status === 'Deferred' || p.status === 'Cancelled'
          ? p.status
          : 'Pending'
      const form = {
        placementStatus: initialStatus as 'Pending' | 'Onboarding' | 'Deferred' | 'Cancelled',
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
      }
      setEditForm(form)
      editFormSnapshotRef.current = JSON.stringify(form)
      const params = new URLSearchParams(searchParams.toString())
      params.set('placementId', resolvePlacementId(p))
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  const hasSearch = Boolean(debouncedSearch.trim())

  useEffect(() => {
    if (!canView || deepLinkDone.current) return
    const pid = searchParams.get('placementId')
    if (!pid) return
    if (!/^[0-9a-fA-F]{24}$/.test(pid)) {
      setError('Invalid placement link')
      deepLinkDone.current = true
      const params = new URLSearchParams(searchParams.toString())
      params.delete('placementId')
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
      return
    }
    deepLinkDone.current = true
    getPlacementById(pid)
      .then((p) => {
        if (p.status !== 'Pending' && p.status !== 'Deferred' && p.status !== 'Cancelled') {
          setError('This placement is not in this queue (use Pending, Deferred, or Cancelled).')
          const params = new URLSearchParams(searchParams.toString())
          params.delete('placementId')
          const qs = params.toString()
          router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
          return
        }
        openEdit(p)
      })
      .catch(() => {
        setError('Placement not found or you do not have access.')
        const params = new URLSearchParams(searchParams.toString())
        params.delete('placementId')
        const qs = params.toString()
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
      })
  }, [canView, searchParams, router, pathname, openEdit])

  const closeEdit = useCallback(() => {
    setEditModal(null)
    setEditForm(null)
    editFormSnapshotRef.current = ''
    const params = new URLSearchParams(searchParams.toString())
    params.delete('placementId')
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [pathname, router, searchParams])

  const editModalDirty = !!editForm && editFormSnapshotRef.current !== '' && JSON.stringify(editForm) !== editFormSnapshotRef.current
  const {
    containerRef: preBoardingModalRef,
    backdropProps: preBoardingBackdropProps,
    requestClose: requestClosePreBoardingEdit,
    confirmDiscardOpen: preBoardingConfirmDiscardOpen,
    confirmDiscard: confirmPreBoardingDiscard,
    cancelDiscard: cancelPreBoardingDiscard,
  } = useModalBehavior({ isOpen: !!editModal, onClose: closeEdit, isDirty: editModalDirty })

  useEffect(() => {
    if (!editModal || !editForm) return
    if (!editFormSnapshotRef.current) {
      editFormSnapshotRef.current = JSON.stringify(editForm)
    }
  }, [editModal, editForm])

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
    setSubmitting(true)
    try {
      await updatePlacement(placementId, {
        status: editForm.placementStatus,
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
      closeEdit()
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
      <div className={`preboarding-page-shell mt-5 grid grid-cols-12 gap-6 min-w-0 sm:mt-6 ${pipelineStyles.listShell}`}>
        <div className="col-span-12 h-full min-h-0 min-w-0 flex flex-col">
          <div className="box mb-0 h-full min-h-0 min-w-0 flex flex-col">
            <div className="box-header shrink-0 flex flex-wrap items-center gap-2 overflow-visible">
              <div className="box-title min-w-0 shrink-0">
                Pre-boarding
                <span className="ms-1 align-middle text-[0.7rem] font-normal text-slate-500 dark:text-slate-400 sm:text-[0.75rem]">
                  (Not yet joined: Pending, Deferred, or Cancelled)
                </span>
                <span
                  className="badge bg-light text-default rounded-full ms-1 text-[0.75rem] align-middle tabular-nums"
                  title="Total matching this queue"
                >
                  {totalResults}
                </span>
              </div>
              {!loading && !error ? (
                <ListPagination
                  page={apiPage}
                  totalPages={totalPages}
                  totalResults={totalResults}
                  pageSize={pageSize}
                  onPageChange={setApiPage}
                  onPageSizeChange={handlePageSizeChange}
                  showSummary={false}
                  showPager={false}
                  ariaLabel="Pre-boarding list rows per page"
                  pageSizeSelectId="preboarding-page-size"
                  touchFriendly
                  className="!gap-2 shrink-0"
                />
              ) : null}
              <div
                className="inline-flex flex-wrap items-center gap-0.5 rounded-lg border border-slate-200/90 bg-slate-50/90 p-0.5 shadow-sm dark:border-white/10 dark:bg-slate-900/40"
                aria-label="Pipeline pages"
              >
                  <Link
                    href="/ats/offers-placement"
                    className={`ti-btn ti-btn-light !border-0 !bg-transparent shadow-none hover:!bg-white dark:hover:!bg-slate-800/80 ${TOOLBAR_BTN}`}
                  >
                    <i className="ri-file-paper-2-line me-1 align-middle opacity-80" aria-hidden />
                    Offers &amp; Placement
                  </Link>
                  <i className="ri-arrow-right-s-line text-slate-400 dark:text-slate-600 text-[0.85rem]" aria-hidden />
                  <span className={`inline-flex items-center font-semibold text-primary ${TOOLBAR_BTN}`} aria-current="page">
                    <i className="ri-suitcase-line me-1 align-middle" aria-hidden />
                    Pre-boarding
                  </span>
                  <i className="ri-arrow-right-s-line text-slate-400 dark:text-slate-600 text-[0.85rem]" aria-hidden />
                  <Link
                    href="/ats/onboarding"
                    className={`ti-btn ti-btn-light !border-0 !bg-transparent shadow-none hover:!bg-white dark:hover:!bg-slate-800/80 ${TOOLBAR_BTN}`}
                  >
                    <i className="ri-user-received-2-line me-1 align-middle opacity-80" aria-hidden />
                    Onboarding
                  </Link>
              </div>
              <div
                className="ms-auto flex min-w-0 flex-wrap items-center gap-2 sm:border-l sm:border-slate-200/80 sm:pl-3 dark:sm:border-white/10"
                role="toolbar"
                aria-label="Pre-boarding list tools"
              >
                <label className="sr-only" htmlFor="preboard-placement-status-filter">
                    Placement status
                  </label>
                  <select
                    id="preboard-placement-status-filter"
                    className="form-control !min-h-11 !w-auto min-w-[7.5rem] !rounded-md !text-[0.8125rem]"
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
                      className="form-control !min-h-11 !w-full !rounded-md !ps-8 !text-[0.8125rem]"
                      placeholder="Search…"
                      value={listSearch}
                      onChange={(e) => setListSearch(e.target.value)}
                      aria-label="Search this list"
                      autoComplete="off"
                    />
                  </div>
                  <button
                    type="button"
                    className={`ti-btn ti-btn-light ${TOOLBAR_BTN}`}
                    onClick={fetchPlacements}
                  >
                    <i className="ri-refresh-line me-1 align-middle text-[0.85rem] opacity-80" aria-hidden />
                    Refresh
                  </button>
              </div>
            </div>
            <div className="box-body !p-0 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
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
                  <i className="ri-inbox-line mb-3 block text-4xl opacity-50" aria-hidden />
                  <p className="mb-1 text-base font-medium text-gray-700 dark:text-gray-200">
                    {hasSearch || placementStatusFilter ? 'No matches' : 'No placements in pre-boarding'}
                  </p>
                  <p className="mb-0 max-w-md text-sm">
                    {hasSearch || placementStatusFilter
                      ? 'Try a different search or clear the placement status filter.'
                      : 'Accepted offers appear here while placement status is Pending, Deferred, or Cancelled. Use the status dropdown to narrow the list.'}
                  </p>
                </div>
              ) : (
                <div className={`min-h-0 w-full min-w-0 max-w-full flex-1 overflow-x-hidden overflow-y-auto ${pipelineStyles.tableCard}`}>
                  <div className="divide-y divide-slate-200/90 dark:divide-white/10 lg:hidden">
                    {placements.map((p, index) => {
                      const row = toRowModel(p, index)
                      return (
                        <article
                          key={row.rowId}
                          className={`px-3.5 py-3.5 ${pipelineStyles.rowIn}`}
                          style={{ animationDelay: `${Math.min(index, 16) * 45}ms` }}
                        >
                          <div className="min-w-0">
                            {row.cid ? (
                              <Link
                                href={`/ats/employees?candidateId=${row.cid}`}
                                className="block truncate font-medium text-primary hover:underline"
                              >
                                {row.name}
                              </Link>
                            ) : (
                              <span className="block truncate font-medium text-slate-800 dark:text-slate-100">{row.name}</span>
                            )}
                            {row.email ? <span className="block truncate text-xs text-slate-500">{row.email}</span> : null}
                            {row.actorLine ? <span className="mt-0.5 block truncate text-[10px] text-slate-500">{row.actorLine}</span> : null}
                          </div>
                          <div className={`mt-1 ${pipelineStyles.jobClamp}`} title={row.jobTitle}>
                            {row.jobTitle}
                          </div>
                          <div className="mt-1.5 text-xs text-slate-500">
                            {row.assetCount} asset(s) · {row.itCount} IT system(s)
                          </div>
                          <div className="mt-2">
                            <StatusChips row={row} />
                          </div>
                          <div className="mt-2.5 flex flex-col gap-2">
                            {canEdit ? (
                              <button
                                type="button"
                                className={`${ROW_BTN} ti-btn-primary flex-1`}
                                onClick={() => openEdit(row.placement)}
                              >
                                Edit
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className={`${ROW_BTN} ti-btn-light flex-1`}
                              onClick={() => openDocumentsForPlacement(row.placement, setError, setDocumentsCandidate)}
                              title="Manage candidate documents"
                            >
                              Documents
                            </button>
                          </div>
                        </article>
                      )
                    })}
                  </div>

                  <div className={`hidden min-w-0 max-w-full lg:block ${pipelineStyles.tableNoHScroll}`}>
                    <table
                      className={`table mb-0 whitespace-normal border-separate border-spacing-0 text-[0.8125rem] text-defaulttextcolor dark:text-white/80 ${pipelineStyles.tableFit}`}
                      aria-label="Pre-boarding placements"
                    >
                      <caption className="sr-only">
                        Pre-boarding queue: candidates with accepted offers not yet joined. {totalResults} total.
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col" className={`${TH_CLASS} w-[22%] pl-3`}>
                            Candidate
                          </th>
                          <th scope="col" className={`${TH_CLASS} w-[18%]`}>
                            Job
                          </th>
                          <th scope="col" className={`${TH_CLASS} w-[12%]`}>
                            Placement
                          </th>
                          <th scope="col" className={`${TH_CLASS} w-[14%]`}>
                            Pre-boarding
                          </th>
                          <th scope="col" className={`${TH_CLASS} hidden w-[10%] md:table-cell`}>
                            BGV
                          </th>
                          <th scope="col" className={`${TH_CLASS} hidden w-[10%] xl:table-cell`}>
                            Assets
                          </th>
                          <th scope="col" className={`${TH_CLASS} hidden w-[10%] xl:table-cell`}>
                            IT Access
                          </th>
                          <th scope="col" className={`${TH_CLASS} w-[14%] pe-3 text-end`}>
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
                                <div className="min-w-0">
                                  {row.cid ? (
                                    <Link
                                      href={`/ats/employees?candidateId=${row.cid}`}
                                      className="block truncate font-medium text-primary hover:underline"
                                    >
                                      {row.name}
                                    </Link>
                                  ) : (
                                    <span className="block truncate font-medium">{row.name}</span>
                                  )}
                                  <span className="block truncate text-xs text-slate-500">{row.email}</span>
                                  {row.actorLine ? (
                                    <span className="block truncate text-[10px] text-slate-500">{row.actorLine}</span>
                                  ) : null}
                                </div>
                              </td>
                              <td className={TD_CLASS}>
                                <div className={pipelineStyles.jobClamp} title={row.jobTitle}>
                                  {row.jobTitle}
                                </div>
                              </td>
                              <td className={TD_CLASS}>
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${placementChipClass(row.placementStatus)}`}
                                >
                                  <i className="ri-user-received-2-line text-[0.65rem]" aria-hidden />
                                  {row.placementStatus}
                                </span>
                              </td>
                              <td className={TD_CLASS}>
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${workflowChipClass(row.pb)}`}
                                >
                                  <i className="ri-suitcase-line text-[0.65rem]" aria-hidden />
                                  {row.pb}
                                </span>
                              </td>
                              <td className={`${TD_CLASS} hidden md:table-cell`}>
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${workflowChipClass(row.bgv)}`}
                                >
                                  <i className="ri-shield-check-line text-[0.65rem]" aria-hidden />
                                  {row.bgv}
                                </span>
                              </td>
                              <td className={`${TD_CLASS} hidden xl:table-cell`}>{row.assetCount} item(s)</td>
                              <td className={`${TD_CLASS} hidden xl:table-cell`}>{row.itCount} system(s)</td>
                              <td className={`${TD_CLASS} pe-3 text-end`}>
                                <div className="flex flex-wrap items-center justify-end gap-1.5">
                                  {canEdit ? (
                                    <button
                                      type="button"
                                      className={`${ROW_BTN} ti-btn-primary`}
                                      onClick={() => openEdit(row.placement)}
                                    >
                                      Edit
                                    </button>
                                  ) : null}
                                  <button
                                    type="button"
                                    className={`${ROW_BTN} ti-btn-light`}
                                    onClick={() => openDocumentsForPlacement(row.placement, setError, setDocumentsCandidate)}
                                    title="Manage candidate documents"
                                  >
                                    Documents
                                  </button>
                                </div>
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
            <div className="box-footer shrink-0 border-t border-defaultborder/60 dark:border-white/5 !px-3 !py-2 sm:!px-4">
              {loading || error ? null : (
                <ListPagination
                  page={apiPage}
                  totalPages={totalPages}
                  totalResults={totalResults}
                  pageSize={pageSize}
                  onPageChange={setApiPage}
                  showPageSize={false}
                  ariaLabel="Pre-boarding page navigation"
                  gotoInputId="preboarding-goto-page"
                  touchFriendly
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {editModal && editForm && (
        <div
          className="fixed inset-0 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-[2px] sm:items-center sm:p-6"
          style={{ zIndex: DIALOG_Z }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="preb-edit-title"
          {...preBoardingBackdropProps}
        >
          <div ref={preBoardingModalRef} className="relative my-6 w-full max-w-3xl overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-xl dark:border-white/10 dark:bg-slate-950">
            <div className="flex items-start gap-3 border-b border-slate-200/80 px-5 py-4 dark:border-white/10">
              <span className="mt-0.5 inline-block h-9 w-0.5 shrink-0 rounded-full bg-primary" aria-hidden />
              <div className="min-w-0 flex-1">
                <h4 id="preb-edit-title" className="mb-0.5 text-base font-semibold text-slate-800 dark:text-slate-100">
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
                className={`ti-btn ti-btn-light ti-btn-sm ${ROW_BTN}`}
                onClick={requestClosePreBoardingEdit}
                aria-label="Close"
              >
                <i className="ri-close-line" />
              </button>
            </div>
            <div className="max-h-[min(70vh,36rem)] space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
                  <div className={`overflow-hidden ${pipelineStyles.tableCard}`}>
                    <div className="border-b border-slate-200/90 bg-slate-50/90 px-4 py-2.5 dark:border-white/10 dark:bg-slate-900/50 sm:px-5">
                      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Placement &amp; pre-boarding</h3>
                      <p className="mb-0 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        Complete pre-boarding here. The Joined transition happens in Onboarding edit.
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
                                placementStatus: e.target.value as 'Pending' | 'Onboarding' | 'Deferred' | 'Cancelled',
                              })
                            }
                          >
                            <option value="Pending">Pending</option>
                            <option value="Onboarding">Move to Onboarding</option>
                            <option value="Deferred">Deferred</option>
                            <option value="Cancelled">Cancelled</option>
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
                        className={`ti-btn ti-btn-success ${TOOLBAR_BTN}`}
                        onClick={addAsset}
                      >
                        <i className="ri-add-line" aria-hidden /> Add
                      </button>
                    </div>
                    <div className="space-y-2.5 p-4 sm:p-5">
                      {editForm.assets.map((a, idx) => (
                        <div
                          key={idx}
                          className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200/80 p-3 sm:grid-cols-2 dark:border-white/10"
                        >
                          <div>
                            <label className="form-label" htmlFor={`preb-asset-name-${idx}`}>
                              Asset name
                            </label>
                            <input
                              id={`preb-asset-name-${idx}`}
                              type="text"
                              className="form-control"
                              value={a.name}
                              onChange={(e) => updateAsset(idx, 'name', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="form-label" htmlFor={`preb-asset-type-${idx}`}>
                              Type
                            </label>
                            <input
                              id={`preb-asset-type-${idx}`}
                              type="text"
                              className="form-control"
                              value={a.type}
                              onChange={(e) => updateAsset(idx, 'type', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="form-label" htmlFor={`preb-asset-serial-${idx}`}>
                              Serial number
                            </label>
                            <input
                              id={`preb-asset-serial-${idx}`}
                              type="text"
                              className="form-control"
                              value={a.serialNumber}
                              onChange={(e) => updateAsset(idx, 'serialNumber', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="form-label" htmlFor={`preb-asset-notes-${idx}`}>
                              Notes
                            </label>
                            <input
                              id={`preb-asset-notes-${idx}`}
                              type="text"
                              className="form-control"
                              value={a.notes}
                              onChange={(e) => updateAsset(idx, 'notes', e.target.value)}
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <button
                              type="button"
                              className={`ti-btn ti-btn-danger ti-btn-sm ${ROW_BTN}`}
                              onClick={() => removeAsset(idx)}
                              aria-label={`Remove asset row ${idx + 1}`}
                            >
                              <i className="ri-delete-bin-line" aria-hidden /> Remove
                            </button>
                          </div>
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
                        className={`ti-btn ti-btn-success ${TOOLBAR_BTN}`}
                        onClick={addItAccess}
                      >
                        <i className="ri-add-line" aria-hidden /> Add
                      </button>
                    </div>
                    <div className="space-y-2.5 p-4 sm:p-5">
                      {editForm.itAccess.map((i, idx) => (
                        <div
                          key={idx}
                          className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200/80 p-3 sm:grid-cols-2 dark:border-white/10"
                        >
                          <div>
                            <label className="form-label" htmlFor={`preb-it-system-${idx}`}>
                              System
                            </label>
                            <input
                              id={`preb-it-system-${idx}`}
                              type="text"
                              className="form-control"
                              placeholder="e.g. Email, Slack"
                              value={i.system}
                              onChange={(e) => updateItAccess(idx, 'system', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="form-label" htmlFor={`preb-it-level-${idx}`}>
                              Access level
                            </label>
                            <input
                              id={`preb-it-level-${idx}`}
                              type="text"
                              className="form-control"
                              value={i.accessLevel}
                              onChange={(e) => updateItAccess(idx, 'accessLevel', e.target.value)}
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="form-label" htmlFor={`preb-it-notes-${idx}`}>
                              Notes
                            </label>
                            <input
                              id={`preb-it-notes-${idx}`}
                              type="text"
                              className="form-control"
                              value={i.notes}
                              onChange={(e) => updateItAccess(idx, 'notes', e.target.value)}
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <button
                              type="button"
                              className={`ti-btn ti-btn-danger ti-btn-sm ${ROW_BTN}`}
                              onClick={() => removeItAccess(idx)}
                              aria-label={`Remove IT access row ${idx + 1}`}
                            >
                              <i className="ri-delete-bin-line" aria-hidden /> Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200/80 px-4 py-3 dark:border-white/10 sm:px-6">
              <button type="button" className={`ti-btn ti-btn-light ${ROW_BTN}`} onClick={requestClosePreBoardingEdit}>
                Cancel
              </button>
              <button
                type="button"
                className={`ti-btn ti-btn-primary ${ROW_BTN}`}
                onClick={handleSavePreBoarding}
                disabled={submitting}
              >
                {submitting ? <i className="ri-loader-4-line animate-spin" aria-hidden /> : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDiscardDialog
        open={preBoardingConfirmDiscardOpen}
        onConfirm={confirmPreBoardingDiscard}
        onCancel={cancelPreBoardingDiscard}
      />

      {documentsCandidate && (
        <PreBoardingDocumentsModal
          candidateId={documentsCandidate.id}
          candidateName={documentsCandidate.name}
          canEdit={canEdit}
          canCreate={canCreate}
          canDelete={canDelete}
          onClose={() => setDocumentsCandidate(null)}
        />
      )}

      {feedbackDialog && (
        <div className="fixed inset-0 flex items-center justify-center p-4 sm:p-6" style={{ zIndex: DIALOG_Z }} role="presentation">
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
                className={`ti-btn ti-btn-primary ${ROW_BTN} min-w-[6.5rem] rounded-xl px-5 font-semibold shadow-sm`}
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
