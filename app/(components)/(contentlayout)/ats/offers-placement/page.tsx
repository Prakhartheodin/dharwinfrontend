"use client"
import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment, useMemo, useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import offersStyles from './offers-placement.module.css'
import pipelineStyles from '../ats-pipeline-list.module.css'
import ListPagination, { DEFAULT_LIST_PAGE_SIZE } from '@/shared/components/ListPagination'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { useTable } from 'react-table'
import Link from 'next/link'
import { useFeaturePermissions } from '@/shared/hooks/use-feature-permissions'
import {
  listOffers,
  updateOffer,
  deleteOffer,
} from '@/shared/lib/api/offers'
import type { Offer } from '@/shared/lib/api/offers'
import { useModalBehavior } from '@/shared/hooks/useModalBehavior'
import ConfirmDiscardDialog from '@/shared/components/ConfirmDiscardDialog'
import { deleteOffersInBulk } from './delete-offers-in-bulk'
import { useConfirm } from '@/shared/components/ui/useConfirm'
import { getPlacementStatusActorSummary } from '@/shared/lib/ats/placementActorText'
import { JoiningDateTableCell } from '@/shared/components/ats/JoiningDateTableCell'
import { formatJoiningDateDisplay, joiningDatePresent } from '@/shared/lib/ats/joining-date-display'
import PersonAvatar from '@/shared/components/PersonAvatar'
import {
  apiSortByToSortOption,
  apiSortByToUrlSort,
  parseOfferSortFromUrl,
  sortOptionToApiSortBy,
} from '@/shared/lib/ats/offer-list-sort'

const DIALOG_Z = 12050
const TOOLBAR_BTN =
  '!mb-0 !min-h-11 !inline-flex !items-center !justify-center !rounded-md !px-3 !py-2 !text-[0.8125rem]'
const ROW_BTN =
  'ti-btn ti-btn-sm shrink-0 whitespace-nowrap !w-auto !min-w-fit !min-h-11 !h-11 !py-2 !px-3 !inline-flex !items-center !justify-center'
const FILTER_CHECK_LABEL =
  'flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-primary/5 dark:hover:bg-primary/10'
const TH_CLASS =
  'sticky top-0 z-10 border-b border-slate-200/90 bg-slate-50 px-2 py-2.5 text-start align-bottom text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500 dark:border-white/10 dark:bg-slate-900 dark:text-slate-400'
const TD_CLASS = 'min-w-0 align-middle px-2 py-2.5 text-[13px] text-slate-800 dark:text-slate-100'
const CHECKBOX_COL_CLASS = 'w-[1%] max-w-[2.25rem] whitespace-nowrap !px-1 !pl-2.5'

function parseListPage(raw: string | null | undefined): number {
  const n = Number.parseInt(String(raw ?? ''), 10)
  return Number.isInteger(n) && n >= 1 ? n : 1
}

const OFFER_FILTER_STEPS = ['Pre-boarding', 'Onboarding'] as const

function stepLabelsToStageParam(steps: string[]): string | undefined {
  const mapped = steps
    .map((step) => (step === 'Pre-boarding' ? 'preBoarding' : step === 'Onboarding' ? 'onboarding' : null))
    .filter((step): step is 'preBoarding' | 'onboarding' => step != null)
  return mapped.length ? mapped.join(',') : undefined
}

function getOfferRecordId(o: { _id?: string; id?: string } | null | undefined): string {
  const v = o?._id ?? o?.id
  if (v == null) return ''
  const s = String(v).trim()
  if (!s || s === 'undefined' || s === 'null') return ''
  return s
}

/** Aligns with backend `Offer` enum; fallback keeps the status editor defaulting to Draft when API omits status. */
const OFFER_STATUS_EDIT_VALUES: Offer['status'][] = [
  'Draft',
  'Active',
  'Sent',
  'Under Negotiation',
  'Accepted',
  'Rejected',
]

/** Status values accepted by GET /offers ?status= (backend OFFER_STATUSES). */
const OFFER_FILTER_STATUSES: Offer['status'][] = [
  'Draft',
  'Sent',
  'Under Negotiation',
  'Accepted',
  'Rejected',
]

function offerStatusForEditModal(raw: Offer | null | undefined): Offer['status'] {
  const s = raw?.status
  if (s && OFFER_STATUS_EDIT_VALUES.includes(s)) return s
  return 'Draft'
}

const OFFER_STATUS_COLORS: Record<string, string> = {
  Accepted: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200',
  Pending: 'bg-amber-50 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200',
  'Under Negotiation': 'bg-sky-50 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200',
  Rejected: 'bg-rose-50 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200',
  Withdrawn: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
  Draft: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
  Active: 'bg-indigo-50 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-200',
  Sent: 'bg-sky-50 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200',
}

const BGV_STATUS_COLORS: Record<string, string> = {
  Pending: 'bg-amber-50 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200',
  'In Progress': 'bg-sky-50 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200',
  Completed: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200',
  Verified: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200',
  Failed: 'bg-rose-50 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200',
}

function offerStatusPillClass(status: string | undefined): string {
  const base =
    'inline-flex max-w-max items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide'
  switch (status) {
    case 'Accepted':
      return `${base} bg-emerald-500/15 text-emerald-900 ring-1 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-100 dark:ring-emerald-500/25`
    case 'Rejected':
      return `${base} bg-rose-500/12 text-rose-900 ring-1 ring-rose-600/20 dark:bg-rose-400/10 dark:text-rose-100 dark:ring-rose-500/25`
    case 'Active':
      return `${base} bg-indigo-500/12 text-indigo-900 ring-1 ring-indigo-600/20 dark:bg-indigo-500/10 dark:text-indigo-100 dark:ring-indigo-500/25`
    case 'Sent':
      return `${base} bg-sky-500/12 text-sky-900 ring-1 ring-sky-600/20 dark:bg-sky-400/10 dark:text-sky-100 dark:ring-sky-500/25`
    case 'Under Negotiation':
      return `${base} bg-amber-500/14 text-amber-950 ring-1 ring-amber-600/25 dark:bg-amber-400/10 dark:text-amber-50 dark:ring-amber-400/20`
    default:
      return `${base} bg-slate-500/[0.12] text-slate-800 ring-1 ring-slate-600/15 dark:bg-slate-500/15 dark:text-slate-100 dark:ring-white/10`
  }
}

// Map API offer to table row format (handle both _id and id from API)
// Includes pre-boarding/onboarding data: placement
const mapOfferToRow = (o: Offer) => {
  const placement = (o as Offer & { placement?: { preBoardingStatus?: string; backgroundVerification?: { status?: string }; assetAllocation?: unknown[]; itAccess?: unknown[] } }).placement
  return {
    id: (o as { _id?: string; id?: string })._id ?? (o as { id?: string }).id ?? '',
    offerId: o.offerCode,
    position: o.job?.title || '-',
    offerDate: o.createdAt || '',
    joiningDate: o.joiningDate || null,
    templateType: 'Standard',
    version: 1,
    offerStatus: offerStatusForEditModal(o),
    signedStatus: o.status === 'Accepted' ? 'Signed' : o.status === 'Rejected' ? 'Not Sent' : o.status === 'Sent' || o.status === 'Under Negotiation' ? 'Pending' : 'Draft',
    onboardingStatus: o.status === 'Accepted' ? 'Ready' : o.status === 'Rejected' ? 'Not Applicable' : 'Pending',
    placementStatus: (o as { placementStatus?: string }).placementStatus ?? null,
    placementId: (o as { placementId?: string }).placementId ?? '',
    preBoardingStatus: placement?.preBoardingStatus || null,
    bgvStatus: placement?.backgroundVerification?.status || null,
    /** Pass-through for UI (e.g. who deferred / cancelled) */
    placement: o.placement,
    assetCount: Array.isArray(placement?.assetAllocation) ? placement.assetAllocation.length : 0,
    itAccessCount: Array.isArray(placement?.itAccess) ? placement.itAccess.length : 0,
    candidate: {
      id: (o.candidate as any)?._id ?? (o.candidate as any)?.id ?? '',
      name: o.candidate?.fullName || '-',
      displayPicture: (o.candidate as any)?.profilePicture?.url ?? undefined,
      email: o.candidate?.email || '',
      phone: o.candidate?.phoneNumber || '',
    },
    recruiter: {
      id: (o.createdBy as any)?._id ?? (o.createdBy as any)?.id ?? '',
      name: o.createdBy?.name || '-',
      displayPicture: (o.createdBy as any)?.profilePicture?.url ?? undefined,
      email: o.createdBy?.email || '',
    },
    _raw: o as Offer,
  }
}

/** Exclude offers whose job or candidate refs were not populated (orphan / deleted records). */
function offerHasUsableJobAndCandidate(o: Offer): boolean {
  const job = o.job as unknown
  if (job == null || typeof job === 'string' || typeof job !== 'object') return false
  const title = String((job as { title?: string }).title ?? '').trim()
  if (!title || title === '-') return false

  const cand = o.candidate as unknown
  if (cand == null || typeof cand === 'string' || typeof cand !== 'object') return false
  const c = cand as { fullName?: string; email?: string; _id?: string; id?: string }
  const candId = String(c._id ?? c.id ?? '').trim()
  if (!candId) return false
  const name = String(c.fullName ?? '').trim()
  const email = String(c.email ?? '').trim()
  if (name && name !== '-') return true
  if (email) return true
  return false
}


interface FilterState {
  candidate: string[]
  recruiter: string[]
  offerStatus: string[]
  step: string[]
}

const OffersPlacement = () => {
  const { confirm, confirmDialog } = useConfirm()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { canView, canCreate, canEdit, canDelete } = useFeaturePermissions("ats.offers")
  const [offersData, setOffersData] = useState<Offer[]>([])
  const [offersLoading, setOffersLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [apiSortBy, setApiSortBy] = useState<string | undefined>(() =>
    parseOfferSortFromUrl(searchParams.get('sortBy'))
  )
  const [selectedSort, setSelectedSort] = useState<string>(() =>
    apiSortByToSortOption(parseOfferSortFromUrl(searchParams.get('sortBy')))
  )
  const [listSearch, setListSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [apiPage, setApiPage] = useState(() => parseListPage(searchParams.get('page')))
  const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE)
  const [totalResults, setTotalResults] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const fetchGenerationRef = useRef(0)
  const prevDebouncedSearchRef = useRef(debouncedSearch)
  const prevFiltersRef = useRef<string>('')

  const [filters, setFilters] = useState<FilterState>({
    candidate: [],
    recruiter: [],
    offerStatus: [],
    step: [],
  })

  // Search states for filter dropdowns
  const [searchCandidate, setSearchCandidate] = useState('')
  const [searchRecruiter, setSearchRecruiter] = useState('')
  const [searchOfferStatus, setSearchOfferStatus] = useState('')
  const [searchStep, setSearchStep] = useState('')
  const [candidateLabels, setCandidateLabels] = useState<Record<string, string>>({})
  const [recruiterLabels, setRecruiterLabels] = useState<Record<string, string>>({})
  /** React-controlled — Preline hs-dropdown often misses init after SPA navigation / on mobile tap. */
  const [offersSortMenuOpen, setOffersSortMenuOpen] = useState(false)
  const offersSortDropdownRef = useRef<HTMLDivElement>(null)
  const offersSortMenuRef = useRef<HTMLUListElement>(null)
  const [offersSortMenuPos, setOffersSortMenuPos] = useState<{ top: number; left: number } | null>(null)
  /** React-controlled — Preline HSOverlay offcanvas often fails to open from data-hs-overlay on mobile. */
  const [offersFilterPanelOpen, setOffersFilterPanelOpen] = useState(false)
  const [offersFilterPortalMounted, setOffersFilterPortalMounted] = useState(false)

  useEffect(() => {
    setOffersFilterPortalMounted(true)
  }, [])

  useEffect(() => {
    if (!offersSortMenuOpen) return
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node
      if (
        !offersSortDropdownRef.current?.contains(target) &&
        !offersSortMenuRef.current?.contains(target)
      ) {
        setOffersSortMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('touchstart', handleOutside)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('touchstart', handleOutside)
    }
  }, [offersSortMenuOpen])

  const updateOffersSortMenuPos = useCallback(() => {
    const btn = document.getElementById('sort-dropdown-button')
    const menu = offersSortMenuRef.current
    if (!btn) return
    const rect = btn.getBoundingClientRect()
    const menuWidth = Math.max(192, menu?.offsetWidth ?? 192)
    const menuHeight = menu?.offsetHeight ?? 320
    const pad = 8

    let left = rect.left
    if (left + menuWidth > window.innerWidth - pad) {
      left = window.innerWidth - menuWidth - pad
    }
    left = Math.max(pad, left)

    let top = rect.bottom + 4
    if (top + menuHeight > window.innerHeight - pad) {
      top = Math.max(pad, rect.top - menuHeight - 4)
    }

    setOffersSortMenuPos({ top, left })
  }, [])

  useLayoutEffect(() => {
    if (!offersSortMenuOpen) {
      setOffersSortMenuPos(null)
      return
    }
    updateOffersSortMenuPos()
    const id = requestAnimationFrame(() => updateOffersSortMenuPos())
    return () => cancelAnimationFrame(id)
  }, [offersSortMenuOpen, updateOffersSortMenuPos])

  useEffect(() => {
    if (!offersSortMenuOpen) return
    window.addEventListener('resize', updateOffersSortMenuPos)
    window.addEventListener('scroll', updateOffersSortMenuPos, true)
    return () => {
      window.removeEventListener('resize', updateOffersSortMenuPos)
      window.removeEventListener('scroll', updateOffersSortMenuPos, true)
    }
  }, [offersSortMenuOpen, updateOffersSortMenuPos])

  useEffect(() => {
    if (!offersFilterPanelOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOffersFilterPanelOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [offersFilterPanelOpen])

  const fetchOffers = useCallback(() => {
    if (!canView) return
    const generation = ++fetchGenerationRef.current
    setOffersLoading(true)
    setListError(null)
    listOffers({
      page: apiPage,
      limit: pageSize,
      ...(apiSortBy ? { sortBy: apiSortBy } : {}),
      ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
      ...(filters.offerStatus.length ? { status: filters.offerStatus.join(',') } : {}),
      ...(filters.candidate.length ? { candidateId: filters.candidate.join(',') } : {}),
      ...(filters.recruiter.length ? { createdBy: filters.recruiter.join(',') } : {}),
      ...(stepLabelsToStageParam(filters.step) ? { stage: stepLabelsToStageParam(filters.step) } : {}),
    })
      .then((res) => {
        if (generation !== fetchGenerationRef.current) return
        setOffersData(res.results ?? [])
        setTotalResults(res.totalResults ?? 0)
        setTotalPages(res.totalPages ?? 0)
      })
      .catch((err) => {
        if (generation !== fetchGenerationRef.current) return
        setListError(err?.response?.data?.message || err?.message || 'Failed to load offers')
        setOffersData([])
        setTotalResults(0)
        setTotalPages(0)
      })
      .finally(() => {
        if (generation === fetchGenerationRef.current) setOffersLoading(false)
      })
  }, [canView, apiPage, pageSize, apiSortBy, debouncedSearch, filters])

  useEffect(() => {
    const fromUrl = parseListPage(searchParams.get('page'))
    setApiPage((prev) => (prev === fromUrl ? prev : fromUrl))

    const fromSort = parseOfferSortFromUrl(searchParams.get('sortBy'))
    setApiSortBy((prev) => (prev === fromSort ? prev : fromSort))
    setSelectedSort(apiSortByToSortOption(fromSort))
  }, [searchParams])

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    let changed = false

    const urlPage = parseListPage(params.get('page'))
    if (urlPage !== apiPage) {
      if (apiPage <= 1) params.delete('page')
      else params.set('page', String(apiPage))
      changed = true
    }

    const desiredUrlSort = apiSortBy ? apiSortByToUrlSort(apiSortBy) : undefined
    const currentUrlSort = params.get('sortBy')?.trim() || undefined
    if (desiredUrlSort !== currentUrlSort) {
      if (desiredUrlSort) params.set('sortBy', desiredUrlSort)
      else params.delete('sortBy')
      changed = true
    }

    if (!changed) return
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [apiPage, apiSortBy, pathname, router, searchParams])

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(listSearch), 300)
    return () => window.clearTimeout(t)
  }, [listSearch])

  useEffect(() => {
    if (prevDebouncedSearchRef.current === debouncedSearch) return
    prevDebouncedSearchRef.current = debouncedSearch
    setApiPage(1)
  }, [debouncedSearch])

  useEffect(() => {
    const signature = JSON.stringify(filters)
    if (prevFiltersRef.current === signature) return
    prevFiltersRef.current = signature
    setApiPage(1)
  }, [filters])

  useEffect(() => {
    if (totalPages > 0 && apiPage > totalPages) {
      setApiPage(totalPages)
    }
  }, [apiPage, totalPages])

  const handlePageSizeChange = useCallback((nextSize: number) => {
    setPageSize(nextSize)
    setApiPage(1)
  }, [])

  useEffect(() => {
    fetchOffers()
  }, [fetchOffers])

  const refreshOffers = useCallback(() => {
    fetchOffers()
  }, [fetchOffers])

  // Re-init Preline so Sort dropdown and search overlay work (content mounts after layout autoInit)
  useEffect(() => {
    const initPreline = () => {
      const win = window as any
      if (win.HSStaticMethods?.autoInit) {
        setTimeout(() => win.HSStaticMethods.autoInit(), 100)
      }
    }
    if (typeof window !== 'undefined') {
      import('preline/preline').then(initPreline).catch(() => {})
    }
  }, [])

  const tableDataFromApi = useMemo(
    () => offersData.filter(offerHasUsableJobAndCandidate).map(mapOfferToRow),
    [offersData]
  )
  const OFFERS_PLACEMENT_DATA = tableDataFromApi

  useEffect(() => {
    setCandidateLabels((prev) => {
      const next = { ...prev }
      let changed = false
      tableDataFromApi.forEach((row) => {
        if (row.candidate.id && next[row.candidate.id] !== row.candidate.name) {
          next[row.candidate.id] = row.candidate.name
          changed = true
        }
      })
      return changed ? next : prev
    })
    setRecruiterLabels((prev) => {
      const next = { ...prev }
      let changed = false
      tableDataFromApi.forEach((row) => {
        if (row.recruiter.id && next[row.recruiter.id] !== row.recruiter.name) {
          next[row.recruiter.id] = row.recruiter.name
          changed = true
        }
      })
      return changed ? next : prev
    })
  }, [tableDataFromApi])

  const [editOfferModal, setEditOfferModal] = useState<Offer | null>(null)
  const [editStatus, setEditStatus] = useState<Offer['status']>('Draft')
  const [editError, setEditError] = useState<string | null>(null)
  const [viewHistoryModal, setViewHistoryModal] = useState<Offer | null>(null)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [listNotice, setListNotice] = useState<string | null>(null)

  /** Open the SSR Offer Letter Generator (versioning + server prefetch live there). */
  const openOfferLetterPage = useCallback(
    (raw: Offer) => {
      const id = getOfferRecordId(raw)
      if (!id) {
        setListNotice(
          'Could not open the offer letter workspace: this offer has no id yet. Use the document icon on the offer row, or try creating the offer again.'
        )
        return
      }
      setListNotice(null)
      // trailingSlash: true — keep URL canonical for Next redirects
      router.push(`/ats/offers-placement/offer-letter/new/?offerId=${encodeURIComponent(id)}`)
    },
    [router]
  )

  const openLetterParamHandledRef = useRef<string | null>(null)

  /** Deep links / legacy ?openLetter= → SSR letter page. ?refresh= still refreshes the list. */
  useEffect(() => {
    const refresh = searchParams?.get('refresh')
    const letterId = searchParams?.get('openLetter')

    if (refresh) {
      refreshOffers()
      if (letterId && /^[0-9a-fA-F]{24}$/.test(letterId)) {
        router.replace(
          `/ats/offers-placement/offer-letter/new/?offerId=${encodeURIComponent(letterId)}`,
          { scroll: false }
        )
      } else {
        const params = new URLSearchParams(searchParams.toString())
        params.delete('refresh')
        if (letterId) params.delete('openLetter')
        const qs = params.toString()
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
      }
      return
    }

    if (letterId && /^[0-9a-fA-F]{24}$/.test(letterId)) {
      if (openLetterParamHandledRef.current === letterId) return
      openLetterParamHandledRef.current = letterId
      router.replace(
        `/ats/offers-placement/offer-letter/new/?offerId=${encodeURIComponent(letterId)}`,
        { scroll: false }
      )
    } else {
      openLetterParamHandledRef.current = null
    }
  }, [searchParams, router, pathname, refreshOffers])


  const editModalDirty =
    !!editOfferModal &&
    !!editStatus &&
    editStatus !== offerStatusForEditModal(editOfferModal);
  const {
    containerRef: editModalContainerRef,
    backdropProps: editModalBackdropProps,
    requestClose: requestCloseEditModal,
    confirmDiscardOpen: editConfirmDiscardOpen,
    confirmDiscard: confirmEditDiscard,
    cancelDiscard: cancelEditDiscard,
  } = useModalBehavior({
    isOpen: !!editOfferModal,
    onClose: () => {
      setEditOfferModal(null)
      setEditError(null)
    },
    isDirty: editModalDirty,
  });

  const historyModalBehavior = useModalBehavior({
    isOpen: !!viewHistoryModal,
    onClose: () => setViewHistoryModal(null),
  })

  const handleUpdateStatus = async () => {
    if (!editOfferModal || !editStatus) return
    setEditError(null)
    const current = offerStatusForEditModal(editOfferModal)
    if (editStatus === current) {
      setEditOfferModal(null)
      return
    }
    setEditSubmitting(true)
    try {
      await updateOffer((editOfferModal as any)._id ?? (editOfferModal as any).id ?? '', { status: editStatus as any })
      setEditOfferModal(null)
      setEditError(null)
      refreshOffers()
    } catch (err: any) {
      setEditError(err?.response?.data?.message || err?.message || 'Failed to update status')
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedRows.size === 0) return
    const attempted = selectedRows.size
    const ok = await confirm({
      title: 'Delete selected offers?',
      message: `Delete ${attempted} selected offer(s)?`,
      confirmLabel: 'Delete',
      tone: 'danger',
    })
    if (!ok) return

    const failed = await deleteOffersInBulk(selectedRows, deleteOffer)
    setSelectedRows(new Set(failed))
    refreshOffers()
    if (failed.length) {
      setListNotice(
        `${failed.length} of ${attempted} offer(s) could not be deleted. They are still selected, so you can try again.`
      )
    } else {
      setListNotice(null)
    }
  }

  // Handle individual row checkbox
  const handleRowSelect = (id: string) => {
    const newSelected = new Set(selectedRows)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedRows(newSelected)
  }

  const renderRowActions = useCallback(
    (offer: (typeof OFFERS_PLACEMENT_DATA)[number]) => {
      const isAccepted = offer.offerStatus === 'Accepted'
      const inPreBoarding =
        isAccepted &&
        (offer.placementStatus === 'Pending' ||
          offer.placementStatus === 'Deferred' ||
          offer.placementStatus === 'Cancelled')
      const inOnboarding = isAccepted && offer.placementStatus === 'Joined'
      const raw = (offer as { _raw?: Offer })._raw

      return (
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {canEdit && raw ? (
            <button
              type="button"
              className={`${ROW_BTN} ti-btn-light`}
              aria-label="Open offer letter generator"
              onClick={() => openOfferLetterPage(raw)}
            >
              <i className="ri-article-line" aria-hidden />
            </button>
          ) : null}
          {inPreBoarding ? (
            <Link
              href={
                offer.placementId && /^[0-9a-fA-F]{24}$/.test(offer.placementId)
                  ? `/ats/pre-boarding?placementId=${encodeURIComponent(offer.placementId)}`
                  : '/ats/pre-boarding'
              }
              className={`${ROW_BTN} ti-btn-light !text-[11px]`}
              title="Go to Pre-boarding"
            >
              <i className="ri-user-follow-line me-0.5" aria-hidden />
              Pre
            </Link>
          ) : null}
          {inOnboarding ? (
            <Link
              href="/ats/onboarding"
              className={`${ROW_BTN} ti-btn-light !text-[11px]`}
              title="Go to Onboarding"
            >
              <i className="ri-login-circle-line me-0.5" aria-hidden />
              Join
            </Link>
          ) : null}
          {raw ? (
            <button
              type="button"
              className={`${ROW_BTN} ti-btn-light`}
              aria-label="View history"
              onClick={() => setViewHistoryModal(raw)}
            >
              <i className="ri-history-line" aria-hidden />
            </button>
          ) : null}
          {canEdit && raw && Boolean(raw.offerLetterGeneratedAt) ? (
            <button
              type="button"
              className={`${ROW_BTN} ti-btn-primary`}
              aria-label="Update status"
              onClick={() => {
                setEditOfferModal(raw)
                setEditStatus(offerStatusForEditModal(raw))
                setEditError(null)
              }}
            >
              <i className="ri-pencil-line" aria-hidden />
            </button>
          ) : null}
        </div>
      )
    },
    [canEdit, openOfferLetterPage]
  )

  // Define columns
  const columns = useMemo(
    () => [
      {
        Header: 'All',
        accessor: 'checkbox',
        disableSortBy: true,
        Cell: ({ row }: any) => (
          <input
            className="form-check-input accent-indigo-600"
            type="checkbox"
            checked={selectedRows.has(row.original.id)}
            onChange={() => handleRowSelect(row.original.id)}
            aria-label={`Select offer ${row.original.id}`}
          />
        ),
      },
      {
        Header: 'Offer Info',
        accessor: 'offerInfo',
        Cell: ({ row }: any) => {
          const offer = row.original
          return (
            <div className="flex min-w-0 flex-col gap-0.5">
              <div
                className={`text-[13px] font-medium leading-tight text-gray-900 dark:text-white ${pipelineStyles.jobClamp}`}
                title={offer.position}
              >
                {offer.position}
              </div>
              <div className="inline-flex min-w-0 items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                <i className="ri-file-text-line mt-0.5 shrink-0" aria-hidden />
                <span className="truncate">{offer.offerId}</span>
              </div>
            </div>
          )
        },
      },
      {
        Header: 'Employee',
        accessor: 'candidate',
        Cell: ({ row }: any) => {
          const candidate = row.original.candidate
          return (
            <div className="flex min-w-0 items-center gap-2.5">
              <PersonAvatar
                name={candidate.name}
                email={candidate.email}
                imageUrl={candidate.displayPicture}
                className="h-8 w-8 shrink-0 rounded-full ring-1 ring-slate-200/80 dark:ring-white/10"
              />
              <div className="min-w-0 flex-1">
                <div
                  className="truncate text-[13px] font-medium text-gray-900 dark:text-white"
                  title={candidate.name}
                >
                  {candidate.name}
                </div>
                <div
                  className="truncate text-[11px] text-slate-500 dark:text-slate-400"
                  title={candidate.email}
                >
                  {candidate.email}
                </div>
              </div>
            </div>
          )
        },
      },
      {
        Header: 'Recruiter',
        accessor: 'recruiter',
        Cell: ({ row }: any) => {
          const recruiter = row.original.recruiter
          return (
            <div className="flex min-w-0 items-center gap-2.5">
              <PersonAvatar
                name={recruiter.name}
                email={recruiter.email}
                imageUrl={recruiter.displayPicture}
                className="h-8 w-8 shrink-0 rounded-full ring-1 ring-slate-200/80 dark:ring-white/10"
              />
              <div className="min-w-0 flex-1">
                <div
                  className="truncate text-[13px] font-medium text-gray-900 dark:text-white"
                  title={recruiter.name}
                >
                  {recruiter.name}
                </div>
                {recruiter.email ? (
                  <div
                    className="truncate text-[11px] text-slate-500 dark:text-slate-400"
                    title={recruiter.email}
                  >
                    {recruiter.email}
                  </div>
                ) : null}
              </div>
            </div>
          )
        },
      },
      {
        Header: 'BGV',
        accessor: 'bgvStatus',
        Cell: ({ row }: any) => {
          const offer = row.original
          if (offer.offerStatus !== 'Accepted') return <span className="text-slate-400">—</span>
          const status = offer.bgvStatus || 'Pending'
          return (
            <span
              className={`inline-flex items-center rounded-full border-0 px-2.5 py-0.5 text-[11px] font-medium ${BGV_STATUS_COLORS[status] || 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'}`}
            >
              {status}
            </span>
          )
        },
      },
      {
        Header: 'Offer Status',
        accessor: 'offerStatus',
        Cell: ({ row }: any) => {
          const offer = row.original
          return (
            <div className="min-w-0">
              <span
                className={`inline-flex items-center rounded-full border-0 px-2.5 py-0.5 text-[11px] font-medium ${OFFER_STATUS_COLORS[offer.offerStatus] || 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'}`}
              >
                {offer.offerStatus}
              </span>
              <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                <i className={`ri-${offer.signedStatus === 'Signed' ? 'check' : offer.signedStatus === 'Pending' ? 'time' : 'close'}-line`} aria-hidden />
                {offer.signedStatus}
              </div>
            </div>
          )
        },
      },
      {
        Header: 'Joining Date',
        accessor: 'joiningDate',
        Cell: ({ row }: any) => {
          const offer = row.original
          return <JoiningDateTableCell value={offer.joiningDate} />
        },
      },
      {
        Header: 'Actions',
        accessor: 'id',
        disableSortBy: true,
        Cell: ({ row }: any) => renderRowActions(row.original),
      },
    ],
    [selectedRows, renderRowActions]
  )

  const pageRows = OFFERS_PLACEMENT_DATA
  const data = useMemo(() => pageRows, [pageRows])

  const allCandidateIds = useMemo(() => {
    const ids = new Set<string>([...Object.keys(candidateLabels), ...filters.candidate])
    return [...ids].sort((a, b) =>
      (candidateLabels[a] || a).localeCompare(candidateLabels[b] || b, undefined, { sensitivity: 'base' })
    )
  }, [candidateLabels, filters.candidate])

  const allRecruiterIds = useMemo(() => {
    const ids = new Set<string>([...Object.keys(recruiterLabels), ...filters.recruiter])
    return [...ids].sort((a, b) =>
      (recruiterLabels[a] || a).localeCompare(recruiterLabels[b] || b, undefined, { sensitivity: 'base' })
    )
  }, [recruiterLabels, filters.recruiter])

  const allOfferStatuses = OFFER_FILTER_STATUSES
  const allSteps = OFFER_FILTER_STEPS

  // Filter options based on search terms
  const filteredCandidates = useMemo(() => {
    if (!searchCandidate) return allCandidateIds
    const q = searchCandidate.toLowerCase()
    return allCandidateIds.filter((id) => (candidateLabels[id] || id).toLowerCase().includes(q))
  }, [allCandidateIds, searchCandidate, candidateLabels])

  const filteredRecruiters = useMemo(() => {
    if (!searchRecruiter) return allRecruiterIds
    const q = searchRecruiter.toLowerCase()
    return allRecruiterIds.filter((id) => (recruiterLabels[id] || id).toLowerCase().includes(q))
  }, [allRecruiterIds, searchRecruiter, recruiterLabels])

  const filteredOfferStatuses = useMemo((): string[] => {
    if (!searchOfferStatus) return [...allOfferStatuses]
    return allOfferStatuses.filter((status) =>
      status.toLowerCase().includes(searchOfferStatus.toLowerCase())
    )
  }, [searchOfferStatus])

  const filteredSteps = useMemo((): string[] => {
    if (!searchStep) return [...allSteps]
    return allSteps.filter((s) => s.toLowerCase().includes(searchStep.toLowerCase()))
  }, [searchStep])

  const handleMultiSelectChange = (key: 'candidate' | 'recruiter' | 'offerStatus' | 'step', value: string) => {
    setFilters(prev => {
      const currentArray = prev[key]
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value]
      return { ...prev, [key]: newArray }
    })
  }

  const handleRemoveFilter = (key: 'candidate' | 'recruiter' | 'offerStatus' | 'step', value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].filter(item => item !== value)
    }))
  }

  const handleResetFilters = () => {
    setFilters({
      candidate: [],
      recruiter: [],
      offerStatus: [],
      step: []
    })
    setSearchCandidate('')
    setSearchRecruiter('')
    setSearchOfferStatus('')
    setSearchStep('')
    setListSearch('')
  }

  const panelFilterCount =
    filters.candidate.length +
    filters.recruiter.length +
    filters.offerStatus.length +
    filters.step.length
  const hasPanelFilters = panelFilterCount > 0

  const filterModal = useModalBehavior({
    isOpen: offersFilterPanelOpen,
    onClose: () => setOffersFilterPanelOpen(false),
    isDirty: hasPanelFilters,
  })

  const tableInstance: any = useTable({
    columns,
    data,
  })

  const { getTableProps, getTableBodyProps, headerGroups, prepareRow, rows } = tableInstance

  // Handle sort selection
  const handleSortChange = (sortOption: string) => {
    setOffersSortMenuOpen(false)
    setSelectedSort(sortOption)

    if (sortOption === 'clear-sort') {
      setApiSortBy(undefined)
      setSelectedSort('')
      setApiPage(1)
      return
    }

    const nextSort = sortOptionToApiSortBy(sortOption)
    if (nextSort) {
      setApiSortBy(nextSort)
      setApiPage(1)
    }
  }

  // Select all rows on the current page only (matches pre-boarding bulk-select scope).
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const pageIds = new Set(pageRows.map((offer) => offer.id))
      setSelectedRows(pageIds)
    } else {
      setSelectedRows(new Set())
    }
  }

  const isAllSelected = pageRows.length > 0 && pageRows.every((offer) => selectedRows.has(offer.id))
  const isIndeterminate =
    pageRows.some((offer) => selectedRows.has(offer.id)) && !isAllSelected

  const hasActiveFilters =
    panelFilterCount > 0 || Boolean(debouncedSearch.trim()) || Boolean(apiSortBy)
  const showEmptyState = !offersLoading && !listError && totalResults === 0

  /** Prevent sticky header label collision on narrow viewports */
  const offerColMinW: Record<string, string> = {
    checkbox: '2.25rem',
    offerInfo: '9.5rem',
    candidate: '12rem',
    recruiter: '10rem',
    bgvStatus: '4rem',
    offerStatus: '6.25rem',
    joiningDate: '6.75rem',
    id: '8.5rem',
  }

  /** Toolbar: match `ats/jobs` — `!py-1 !px-2 !text-[0.75rem]`, never bare `ti-btn-sm` (fixed 28×28 in theme). */
  return (
    <Fragment>
      {confirmDialog}
      <Seo title="Offers & Placement" />
      {listNotice ? (
        <div
          className="mb-4 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100"
          role="status"
        >
          {listNotice}
        </div>
      ) : null}
      <div className={`offers-page-shell mt-2 grid grid-cols-12 gap-6 min-w-0 sm:mt-6 ${offersStyles.listShell}`}>
        <div className="col-span-12 h-full min-h-0 min-w-0 flex flex-col">
          <div className="box mb-0 h-full min-h-0 min-w-0 flex flex-col">
            <div className="box-header shrink-0 flex flex-wrap items-center gap-2 overflow-visible">
              <span className="box-title min-w-0 shrink-0">
                Offers &amp; Placement
                <span
                  className="badge bg-light text-default rounded-full ms-1 text-[0.75rem] align-middle tabular-nums"
                  title="Total matching search and filters"
                >
                  {totalResults}
                </span>
              </span>
              {!offersLoading && !listError && totalResults > 0 ? (
                <ListPagination
                  page={apiPage}
                  totalPages={totalPages}
                  totalResults={totalResults}
                  pageSize={pageSize}
                  onPageChange={setApiPage}
                  onPageSizeChange={handlePageSizeChange}
                  showSummary={false}
                  showPager={false}
                  ariaLabel="Offers list rows per page"
                  pageSizeSelectId="offers-page-size"
                  touchFriendly
                  className="!gap-2 shrink-0"
                />
              ) : null}
              <div
                className="inline-flex max-w-full flex-wrap items-center gap-0.5 rounded-lg border border-slate-200/90 bg-slate-50/90 p-0.5 shadow-sm dark:border-white/10 dark:bg-slate-900/40"
                aria-label="Pipeline pages"
              >
                  <span className="inline-flex items-center rounded-md bg-white dark:bg-slate-800/80 py-1.5 px-2.5 text-[0.75rem] shadow-sm font-semibold text-primary cursor-default select-none" aria-current="page">
                    <i className="ri-file-paper-2-line me-1 align-middle" aria-hidden />
                    Offers &amp; Placement
                  </span>
                  <i className="ri-arrow-right-s-line text-slate-400 dark:text-slate-600 text-[0.85rem]" aria-hidden />
                  <Link
                    href="/ats/pre-boarding"
                    className="ti-btn ti-btn-light !mb-0 !w-auto !min-w-fit !rounded-md !border-0 !bg-transparent !py-1.5 !px-2.5 !text-[0.75rem] shadow-none hover:!bg-white dark:hover:!bg-slate-800/80"
                  >
                    <i className="ri-suitcase-line me-1 align-middle opacity-80" aria-hidden />
                    Pre-boarding
                  </Link>
                  <i className="ri-arrow-right-s-line text-slate-400 dark:text-slate-600 text-[0.85rem]" aria-hidden />
                  <Link
                    href="/ats/onboarding"
                    className="ti-btn ti-btn-light !mb-0 !w-auto !min-w-fit !rounded-md !border-0 !bg-transparent !py-1.5 !px-2.5 !text-[0.75rem] shadow-none hover:!bg-white dark:hover:!bg-slate-800/80"
                  >
                    <i className="ri-user-received-2-line me-1 align-middle opacity-80" aria-hidden />
                    Onboarding
                  </Link>
              </div>
              <div
                className="relative z-20 ms-auto flex min-w-0 flex-wrap items-center gap-2 sm:border-l sm:border-slate-200/80 sm:pl-3 dark:sm:border-white/10"
                role="toolbar"
                aria-label="Offer list tools"
              >
                {canCreate && (
                  <Link
                    href="/ats/offers-placement/offer-letter/new"
                    className={`ti-btn ti-btn-primary-full ${TOOLBAR_BTN}`}
                  >
                    <i className="ri-add-line font-semibold align-middle" aria-hidden />
                    Create
                  </Link>
                )}
                <div ref={offersSortDropdownRef} className="relative z-30">
                  <button
                    type="button"
                    className={`ti-btn ti-btn-light touch-manipulation ${TOOLBAR_BTN}`}
                    id="sort-dropdown-button"
                    aria-expanded={offersSortMenuOpen}
                    aria-haspopup="menu"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setOffersSortMenuOpen((open) => !open)
                    }}
                  >
                    <i className="ri-arrow-up-down-line me-1 align-middle font-semibold" aria-hidden />
                    Sort
                    <i className="ri-arrow-down-s-line align-middle ms-1 inline-block" aria-hidden />
                  </button>
                  {offersSortMenuOpen && offersFilterPortalMounted
                    ? createPortal(
                        <ul
                          ref={offersSortMenuRef}
                          className="fixed z-[12050] max-h-[min(70vh,24rem)] min-w-[12rem] max-w-[calc(100vw-1rem)] overflow-y-auto rounded-lg border border-defaultborder bg-white py-1 shadow-lg dark:border-defaultborder/20 dark:bg-bodybg"
                          style={
                            offersSortMenuPos
                              ? { top: offersSortMenuPos.top, left: offersSortMenuPos.left }
                              : { top: -9999, left: -9999, visibility: 'hidden' }
                          }
                          role="menu"
                          aria-labelledby="sort-dropdown-button"
                        >
                    <li>
                      <button
                        type="button"
                        className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${selectedSort === 'employee-asc' ? 'active' : ''}`}
                        onClick={() => handleSortChange('employee-asc')}
                      >
                        <i className="ri-user-line me-2 align-middle inline-block"></i>Employee (A-Z)
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${selectedSort === 'employee-desc' ? 'active' : ''}`}
                        onClick={() => handleSortChange('employee-desc')}
                      >
                        <i className="ri-user-line me-2 align-middle inline-block"></i>Employee (Z-A)
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${selectedSort === 'joining-asc' ? 'active' : ''}`}
                        onClick={() => handleSortChange('joining-asc')}
                      >
                        <i className="ri-calendar-check-line me-2 align-middle inline-block"></i>Joining Date (Oldest First)
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${selectedSort === 'joining-desc' ? 'active' : ''}`}
                        onClick={() => handleSortChange('joining-desc')}
                      >
                        <i className="ri-calendar-check-line me-2 align-middle inline-block"></i>Joining Date (Newest First)
                      </button>
                    </li>
                    <li className="ti-dropdown-divider"></li>
                    <li>
                      <button
                        type="button"
                        className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left text-gray-500 dark:text-gray-400"
                        onClick={() => handleSortChange('clear-sort')}
                      >
                        <i className="ri-close-line me-2 align-middle inline-block"></i>Clear Sort
                      </button>
                    </li>
                        </ul>,
                        document.body
                      )
                    : null}
                </div>
                <div className="relative min-w-0 flex-1 basis-full sm:basis-auto sm:w-40 sm:flex-initial">
                  <i
                    className="ri-search-line pointer-events-none absolute left-2 top-1/2 z-[1] -translate-y-1/2 text-[0.75rem] text-slate-400"
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
                  className={`ti-btn ti-btn-light touch-manipulation ${TOOLBAR_BTN} ${offersFilterPanelOpen ? 'ring-2 ring-primary/30 bg-primary/[0.06]' : ''}`}
                  aria-expanded={offersFilterPanelOpen}
                  aria-controls="offers-filter-panel"
                  onClick={() => setOffersFilterPanelOpen((open) => !open)}
                >
                  <i className="ri-filter-3-line me-1 align-middle" aria-hidden />
                  Filters
                  {hasPanelFilters && (
                    <span className="badge bg-primary text-white ms-1 align-middle" style={{ fontSize: '0.65rem' }}>
                      {panelFilterCount}
                    </span>
                  )}
                </button>
                {canDelete && selectedRows.size > 0 && (
                  <button
                    type="button"
                    className={`ti-btn ti-btn-danger ${TOOLBAR_BTN}`}
                    onClick={() => void handleDeleteSelected()}
                  >
                    <i className="ri-delete-bin-line me-1" aria-hidden />
                    Delete ({selectedRows.size})
                  </button>
                )}
              </div>
            </div>
            <div className="box-body !p-0 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              {offersLoading ? (
                <div
                  className="flex flex-col items-center justify-center gap-4 px-6 py-10"
                  role="status"
                  aria-live="polite"
                  aria-busy="true"
                >
                  <div className="flex w-full max-w-md flex-col gap-2">
                    <div className={`h-3 w-full ${offersStyles.skeleton}`} />
                    <div className={`h-3 w-[92%] ${offersStyles.skeleton}`} style={{ animationDelay: '0.08s' }} />
                    <div className={`h-3 w-[88%] ${offersStyles.skeleton}`} style={{ animationDelay: '0.16s' }} />
                    <div className={`h-3 w-[95%] ${offersStyles.skeleton}`} style={{ animationDelay: '0.24s' }} />
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                    <i className="ri-loader-4-line inline-block h-5 w-5 shrink-0 animate-spin text-primary" aria-hidden />
                    <span>Loading offers&hellip;</span>
                  </div>
                </div>
              ) : showEmptyState ? (
                <div className="flex flex-col items-center justify-center px-6 py-16 text-center text-gray-500 dark:text-gray-400">
                  <i className="ri-file-paper-2-line mb-3 block text-4xl opacity-50" aria-hidden />
                  <p className="mb-1 text-base font-medium text-gray-700 dark:text-gray-200">No offers to show</p>
                  <p className="mb-0 max-w-md text-sm">
                    {hasActiveFilters
                      ? 'Try relaxing filters or search, or add offers from a job application.'
                      : 'Create an offer from an application in pipeline, or use Create Offer to start a letter.'}
                  </p>
                </div>
              ) : listError ? (
                <div className="flex flex-col items-center justify-center px-6 py-16 text-center text-danger">
                  <p className="mb-0 text-sm">{listError}</p>
                </div>
              ) : (
                <div className={`min-h-0 w-full min-w-0 max-w-full flex-1 overflow-x-hidden overflow-y-auto ${pipelineStyles.tableCard}`}>
                  <div className="divide-y divide-slate-200/90 dark:divide-white/10 xl:hidden">
                    {rows.map((row: any, index: number) => {
                      const offer = row.original
                      const bgvStatus =
                        offer.offerStatus === 'Accepted' ? offer.bgvStatus || 'Pending' : null
                      return (
                        <article
                          key={offer.id}
                          className={`${offersStyles.mobileCard} ${offersStyles.rowIn}`}
                          style={{ animationDelay: `${Math.min(index, 16) * 45}ms` }}
                        >
                          <div className={offersStyles.mobileCardHeader}>
                            <input
                              className="form-check-input mt-1 !h-5 !w-5 shrink-0 accent-indigo-600"
                              type="checkbox"
                              checked={selectedRows.has(offer.id)}
                              onChange={() => handleRowSelect(offer.id)}
                              aria-label={`Select offer ${offer.offerId}`}
                            />
                            <div className="min-w-0 flex-1">
                              <div
                                className={`text-sm font-semibold leading-snug text-gray-900 dark:text-white ${pipelineStyles.jobClamp}`}
                                title={offer.position}
                              >
                                {offer.position}
                              </div>
                              <div className="mt-0.5 inline-flex min-w-0 items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                                <i className="ri-file-text-line shrink-0" aria-hidden />
                                <span className="truncate">{offer.offerId}</span>
                              </div>
                            </div>
                          </div>

                          <div className={offersStyles.mobileCardPerson}>
                            <PersonAvatar
                              name={offer.candidate.name}
                              email={offer.candidate.email}
                              imageUrl={offer.candidate.displayPicture}
                              className="h-9 w-9 shrink-0 rounded-full ring-1 ring-slate-200/80 dark:ring-white/10"
                            />
                            <div className="min-w-0 flex-1">
                              <span className={offersStyles.mobileCardMetaLabel}>Employee</span>
                              <div
                                className="truncate text-sm font-medium text-gray-900 dark:text-white"
                                title={offer.candidate.name}
                              >
                                {offer.candidate.name}
                              </div>
                              {offer.candidate.email ? (
                                <div
                                  className="truncate text-xs text-slate-500 dark:text-slate-400"
                                  title={offer.candidate.email}
                                >
                                  {offer.candidate.email}
                                </div>
                              ) : null}
                            </div>
                          </div>

                          <div className={offersStyles.mobileCardPerson}>
                            <PersonAvatar
                              name={offer.recruiter.name}
                              email={offer.recruiter.email}
                              imageUrl={offer.recruiter.displayPicture}
                              className="h-8 w-8 shrink-0 rounded-full ring-1 ring-slate-200/80 dark:ring-white/10"
                            />
                            <div className="min-w-0 flex-1">
                              <span className={offersStyles.mobileCardMetaLabel}>Recruiter</span>
                              <div
                                className="truncate text-sm text-gray-800 dark:text-slate-100"
                                title={offer.recruiter.name}
                              >
                                {offer.recruiter.name}
                              </div>
                              {offer.recruiter.email ? (
                                <div
                                  className="truncate text-xs text-slate-500 dark:text-slate-400"
                                  title={offer.recruiter.email}
                                >
                                  {offer.recruiter.email}
                                </div>
                              ) : null}
                            </div>
                          </div>

                          <div className={offersStyles.mobileCardMeta}>
                            <div>
                              <span className={offersStyles.mobileCardMetaLabel}>BGV</span>
                              {bgvStatus ? (
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${BGV_STATUS_COLORS[bgvStatus] || 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'}`}
                                >
                                  {bgvStatus}
                                </span>
                              ) : (
                                <span className="text-sm text-slate-400">—</span>
                              )}
                            </div>
                            <div>
                              <span className={offersStyles.mobileCardMetaLabel}>Offer Status</span>
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${OFFER_STATUS_COLORS[offer.offerStatus] || 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'}`}
                              >
                                {offer.offerStatus}
                              </span>
                              <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                                <i
                                  className={`ri-${offer.signedStatus === 'Signed' ? 'check' : offer.signedStatus === 'Pending' ? 'time' : 'close'}-line`}
                                  aria-hidden
                                />
                                {offer.signedStatus}
                              </div>
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                              <span className={offersStyles.mobileCardMetaLabel}>Joining Date</span>
                              <div className="text-sm text-slate-700 dark:text-slate-200">
                                <JoiningDateTableCell value={offer.joiningDate} />
                              </div>
                            </div>
                          </div>

                          <div className={offersStyles.mobileCardActions}>{renderRowActions(offer)}</div>
                        </article>
                      )
                    })}
                  </div>

                  <div className={`hidden min-w-0 max-w-full xl:block ${pipelineStyles.tableNoHScroll}`}>
                    <table
                      {...getTableProps()}
                      className={`table mb-0 whitespace-normal border-separate border-spacing-0 text-[0.8125rem] text-defaulttextcolor dark:text-white/80 ${pipelineStyles.tableFit}`}
                      aria-label="Offers and placement"
                    >
                      <caption className="sr-only">
                        Offers and placement list. {totalResults} total after filters.
                      </caption>
                      <thead>
                        {headerGroups.map((headerGroup: any, i: number) => (
                          <tr
                            {...headerGroup.getHeaderGroupProps()}
                            className="border-b border-slate-200/90 dark:border-white/10"
                            key={`header-group-${i}`}
                          >
                            {headerGroup.headers.map((column: any, colI: number) => (
                              <th
                                {...column.getHeaderProps()}
                                scope="col"
                                className={`${TH_CLASS} ${column.id === 'checkbox' ? CHECKBOX_COL_CLASS : ''}`}
                                key={column.id || `col-${colI}`}
                                style={{
                                  minWidth: offerColMinW[String(column.id)] ?? undefined,
                                }}
                              >
                                {column.id === 'checkbox' ? (
                                  <input
                                    className="form-check-input accent-indigo-600"
                                    type="checkbox"
                                    checked={isAllSelected}
                                    ref={(input) => {
                                      if (input) input.indeterminate = isIndeterminate
                                    }}
                                    onChange={handleSelectAll}
                                    aria-label="Select all offers on this page"
                                  />
                                ) : (
                                  <div className="tabletitle flex min-w-0 items-start gap-1">
                                    <span className="min-w-0 break-words hyphens-auto">{column.render('Header')}</span>
                                  </div>
                                )}
                              </th>
                            ))}
                          </tr>
                        ))}
                      </thead>
                      <tbody {...getTableBodyProps()}>
                        {rows.map((row: any, i: number) => {
                          prepareRow(row)
                          const rowProps = row.getRowProps({
                            className: `border-b border-slate-200/80 transition-colors duration-150 ease-out last:border-b-0 hover:bg-slate-50/90 dark:border-white/10 dark:hover:bg-white/[0.04] ${offersStyles.rowIn}`,
                            style: { animationDelay: `${Math.min(i, 16) * 45}ms` },
                          })
                          const { key: rowKey, ...trProps } = rowProps
                          return (
                            <tr key={rowKey} {...trProps}>
                              {row.cells.map((cell: any, cellI: number) => {
                                const cellProps = cell.getCellProps({
                                  className: `${TD_CLASS} ${cell.column.id === 'checkbox' ? CHECKBOX_COL_CLASS : ''}`,
                                })
                                const { key: cellKey, ...tdProps } = cellProps
                                return (
                                  <td
                                    key={String(cellKey ?? cell.column.id ?? `cell-${cellI}`)}
                                    {...tdProps}
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
              )}
            </div>
            <div className="box-footer relative z-[1] shrink-0 border-t border-defaultborder/60 bg-white !px-3 !py-2 dark:border-white/5 dark:bg-bodybg sm:!px-4">
              {!offersLoading && !listError && totalResults > 0 ? (
                <ListPagination
                  page={apiPage}
                  totalPages={totalPages}
                  totalResults={totalResults}
                  pageSize={pageSize}
                  onPageChange={setApiPage}
                  showPageSize={false}
                  ariaLabel="Offers page navigation"
                  gotoInputId="offers-goto-page"
                  touchFriendly
                />
              ) : (
                <span className="text-sm text-slate-500">0 offers</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Panel Offcanvas — React-controlled (Preline HSOverlay unreliable on SPA/mobile). */}
      {offersFilterPortalMounted && offersFilterPanelOpen
        ? createPortal(
            <>
              <div
                className="fixed inset-0 z-[140] bg-black/40"
                aria-hidden
                onMouseDown={filterModal.requestClose}
              />
              <div
                id="offers-filter-panel"
                ref={filterModal.containerRef}
                className="ti-offcanvas ti-offcanvas-right open !z-[150] flex h-full w-full max-w-sm flex-col overflow-hidden bg-white shadow-xl dark:bg-bodybg"
                role="dialog"
                aria-modal="true"
                aria-labelledby="offers-filter-title"
                tabIndex={-1}
              >
        <div className="ti-offcanvas-header bg-gray-50 dark:bg-black/20 !py-2.5">
          <h6 id="offers-filter-title" className="ti-offcanvas-title flex items-center gap-2 text-base font-semibold">
            <i className="ri-filter-3-line text-primary text-base" aria-hidden />
            Filters
          </h6>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="ti-btn flex-shrink-0 p-0 transition-none text-gray-500 hover:text-gray-700 focus:ring-gray-400 focus:ring-offset-white dark:text-[#8c9097] dark:text-white/50 dark:hover:text-white/80 dark:focus:ring-white/10 dark:focus:ring-offset-white/10 hover:bg-gray-100 dark:hover:bg-black/40 rounded-md px-2 py-1 text-[0.75rem]"
              onClick={handleResetFilters}
            >
              <i className="ri-refresh-line me-1" aria-hidden />
              Reset
            </button>
            <button
              type="button"
              className="ti-btn flex-shrink-0 p-0 transition-none text-gray-500 hover:text-gray-700 focus:ring-gray-400 focus:ring-offset-white dark:text-[#8c9097] dark:text-white/50 dark:hover:text-white/80 dark:focus:ring-white/10 dark:focus:ring-offset-white/10 hover:bg-gray-100 dark:hover:bg-black/40 rounded-md p-1"
              onClick={filterModal.requestClose}
              aria-label="Close filters"
            >
              <i className="ri-close-line text-lg" aria-hidden />
            </button>
          </div>
        </div>
        <div className="ti-offcanvas-body !p-4 flex-1 overflow-y-auto">
          <div className="space-y-5">
            {/* Candidate Filter */}
            <div className="pb-4 border-b border-gray-200 dark:border-defaultborder/10">
              <label className="form-label mb-2.5 block font-semibold text-sm text-gray-800 dark:text-white flex items-center gap-2">
                <i className="ri-user-line text-primary text-base"></i>
                Candidate
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400">({allCandidateIds.length})</span>
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  className="form-control !min-h-11 mb-1.5"
                  placeholder="Search candidates..."
                  value={searchCandidate}
                  onChange={(e) => setSearchCandidate(e.target.value)}
                />
                <div className="max-h-40 overflow-y-auto rounded-lg bg-white dark:bg-black/20 p-2 shadow-sm">
                  <div className="space-y-1">
                    {filteredCandidates.length > 0 ? (
                      filteredCandidates.map((candidateId) => (
                        <label
                          key={candidateId}
                           className={FILTER_CHECK_LABEL}
                         >
                           <input
                             type="checkbox"
                             className="form-check-input !h-5 !w-5 shrink-0"
                            checked={filters.candidate.includes(candidateId)}
                            onChange={() => handleMultiSelectChange('candidate', candidateId)}
                          />
                          <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">{candidateLabels[candidateId] || candidateId}</span>
                        </label>
                      ))
                    ) : (
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-3">
                        No candidates found
                      </div>
                    )}
                  </div>
                </div>
                {filters.candidate.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {filters.candidate.map((candidateId) => (
                      <span
                        key={candidateId}
                        className="badge bg-primary/10 text-primary border border-primary/30 px-2 py-1 rounded-full flex items-center gap-1.5 text-xs font-medium shadow-sm"
                      >
                        {candidateLabels[candidateId] || candidateId}
                        <button
                          type="button"
                          onClick={() => handleRemoveFilter('candidate', candidateId)}
                          className="hover:text-primary-hover hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                        >
                          <i className="ri-close-line text-xs"></i>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recruiter Filter */}
            <div className="pb-4 border-b border-gray-200 dark:border-defaultborder/10">
              <label className="form-label mb-2.5 block font-semibold text-sm text-gray-800 dark:text-white flex items-center gap-2">
                <i className="ri-team-line text-success text-base"></i>
                Recruiter
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400">({allRecruiterIds.length})</span>
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  className="form-control !min-h-11 mb-1.5"
                  placeholder="Search recruiters..."
                  value={searchRecruiter}
                  onChange={(e) => setSearchRecruiter(e.target.value)}
                />
                <div className="max-h-40 overflow-y-auto rounded-lg bg-white dark:bg-black/20 p-2 shadow-sm">
                  <div className="space-y-1">
                    {filteredRecruiters.length > 0 ? (
                      filteredRecruiters.map((recruiterId) => (
                        <label
                          key={recruiterId}
                           className={FILTER_CHECK_LABEL}
                         >
                           <input
                             type="checkbox"
                             className="form-check-input !h-5 !w-5 shrink-0"
                            checked={filters.recruiter.includes(recruiterId)}
                            onChange={() => handleMultiSelectChange('recruiter', recruiterId)}
                          />
                          <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">{recruiterLabels[recruiterId] || recruiterId}</span>
                        </label>
                      ))
                    ) : (
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-3">
                        No recruiters found
                      </div>
                    )}
                  </div>
                </div>
                {filters.recruiter.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {filters.recruiter.map((recruiterId) => (
                      <span
                        key={recruiterId}
                        className="badge bg-success/10 text-success border border-success/30 px-2 py-1 rounded-full flex items-center gap-1.5 text-xs font-medium shadow-sm"
                      >
                        {recruiterLabels[recruiterId] || recruiterId}
                        <button
                          type="button"
                          onClick={() => handleRemoveFilter('recruiter', recruiterId)}
                          className="hover:text-success-hover hover:bg-success/20 rounded-full p-0.5 transition-colors"
                        >
                          <i className="ri-close-line text-xs"></i>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Offer Status Filter */}
            <div className="pb-4 border-b border-gray-200 dark:border-defaultborder/10">
              <label className="form-label mb-2.5 block font-semibold text-sm text-gray-800 dark:text-white flex items-center gap-2">
                <i className="ri-file-check-line text-info text-base"></i>
                Offer Status
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400">({allOfferStatuses.length})</span>
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  className="form-control !min-h-11 mb-1.5"
                  placeholder="Search offer status..."
                  value={searchOfferStatus}
                  onChange={(e) => setSearchOfferStatus(e.target.value)}
                />
                <div className="max-h-40 overflow-y-auto rounded-lg bg-white dark:bg-black/20 p-2 shadow-sm">
                  <div className="space-y-1">
                    {filteredOfferStatuses.length > 0 ? (
                      filteredOfferStatuses.map((status) => (
                        <label
                          key={status}
                           className={FILTER_CHECK_LABEL}
                         >
                           <input
                             type="checkbox"
                             className="form-check-input !h-5 !w-5 shrink-0"
                            checked={filters.offerStatus.includes(status)}
                            onChange={() => handleMultiSelectChange('offerStatus', status)}
                          />
                          <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">{status}</span>
                        </label>
                      ))
                    ) : (
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-3">
                        No offer statuses found
                      </div>
                    )}
                  </div>
                </div>
                {filters.offerStatus.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {filters.offerStatus.map((status) => (
                      <span
                        key={status}
                        className="badge bg-info/10 text-info border border-info/30 px-2 py-1 rounded-full flex items-center gap-1.5 text-xs font-medium shadow-sm"
                      >
                        {status}
                        <button
                          type="button"
                          onClick={() => handleRemoveFilter('offerStatus', status)}
                          className="hover:text-info-hover hover:bg-info/20 rounded-full p-0.5 transition-colors"
                        >
                          <i className="ri-close-line text-xs"></i>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Step Filter (Pre-boarding, Onboarding) */}
            <div className="pb-4">
              <label className="form-label mb-2.5 block font-semibold text-sm text-gray-800 dark:text-white flex items-center gap-2">
                <i className="ri-user-settings-line text-warning text-base"></i>
                Step
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400">({allSteps.length})</span>
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  className="form-control !min-h-11 mb-1.5"
                  placeholder="Search step..."
                  value={searchStep}
                  onChange={(e) => setSearchStep(e.target.value)}
                />
                <div className="max-h-40 overflow-y-auto rounded-lg bg-white dark:bg-black/20 p-2 shadow-sm">
                  <div className="space-y-1">
                    {filteredSteps.length > 0 ? (
                      filteredSteps.map((step) => (
                        <label
                          key={step}
                           className={FILTER_CHECK_LABEL}
                         >
                           <input
                             type="checkbox"
                             className="form-check-input !h-5 !w-5 shrink-0"
                            checked={filters.step.includes(step)}
                            onChange={() => handleMultiSelectChange('step', step)}
                          />
                          <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">{step}</span>
                        </label>
                      ))
                    ) : (
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-3">
                        No steps found
                      </div>
                    )}
                  </div>
                </div>
                {filters.step.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {filters.step.map((step) => (
                      <span
                        key={step}
                        className="badge bg-warning/10 text-warning border border-warning/30 px-2 py-1 rounded-full flex items-center gap-1.5 text-xs font-medium shadow-sm"
                      >
                        {step}
                        <button
                          type="button"
                          onClick={() => handleRemoveFilter('step', step)}
                          className="hover:text-warning-hover hover:bg-warning/20 rounded-full p-0.5 transition-colors"
                        >
                          <i className="ri-close-line text-xs"></i>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-defaultborder/10">
              <button
                type="button"
                className="ti-btn ti-btn-primary flex-1 font-medium shadow-sm hover:shadow-md transition-shadow !py-1.5 !text-sm"
                onClick={handleResetFilters}
              >
                <i className="ri-refresh-line me-1.5"></i>Reset
              </button>
              <button
                type="button"
                className="ti-btn ti-btn-light font-medium shadow-sm hover:shadow-md transition-shadow !py-1.5 !text-sm"
                onClick={filterModal.requestClose}
              >
                <i className="ri-close-line me-1.5"></i>Close
              </button>
            </div>
          </div>
        </div>
              </div>
              <ConfirmDiscardDialog
                open={filterModal.confirmDiscardOpen}
                onConfirm={filterModal.confirmDiscard}
                onCancel={filterModal.cancelDiscard}
              />
            </>,
            document.body
          )
        : null}

      {/* Edit Offer Status Modal - !opacity-100 !pointer-events-auto so it shows when opened via React state */}
      {editOfferModal && (
        <div
          id="edit-offer-modal"
          className="hs-overlay ti-modal active overflow-y-auto !opacity-100 !pointer-events-auto [--auto-close:false]"
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-offer-modal-title"
          style={{ zIndex: 80 }}
          {...editModalBackdropProps}
        >
          <div ref={editModalContainerRef} className="hs-overlay-open:mt-7 ti-modal-box !max-w-[26rem]">
            <div className="ti-modal-content overflow-hidden !rounded-lg shadow-lg ring-1 ring-slate-900/[0.06] dark:ring-white/[0.06]">
              <div className="ti-modal-header !items-start gap-3 border-slate-200/90 !pb-3 !pt-4 dark:border-white/10">
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">
                    Update status
                  </p>
                  <h4 id="edit-offer-modal-title" className="ti-modal-title !mb-0 break-words text-lg leading-snug">
                    {editOfferModal.offerCode}
                  </h4>
                </div>
                <button
                  type="button"
                  className="ti-modal-close-btn !mt-0.5 shrink-0"
                  aria-label="Close"
                  onClick={requestCloseEditModal}
                >
                  <i className="ri-close-line text-lg" aria-hidden />
                </button>
              </div>
              <div className="ti-modal-body !pb-5 !pt-2">
                <div className={`mb-5 ${offersStyles.offerStatusEditCard}`}>
                  <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Role · Candidate
                  </span>
                  <p className="mb-0 text-sm font-medium leading-snug text-slate-800 dark:text-slate-100">
                    {editOfferModal.job?.title || '—'}
                    <span className="mx-1.5 text-slate-300 dark:text-slate-600" aria-hidden>
                      ·
                    </span>
                    {editOfferModal.candidate?.fullName || '—'}
                  </p>
                </div>
                <div className="mb-4 rounded-lg border border-slate-200/80 bg-slate-50/90 px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.04]">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Current status (saved)
                  </span>
                  <p className="mb-0 mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {offerStatusForEditModal(editOfferModal)}
                  </p>
                </div>
                {editError ? (
                  <div
                    className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100"
                    role="alert"
                  >
                    {editError}
                  </div>
                ) : null}
                <div>
                  <label className="form-label mb-2 text-slate-700 dark:text-slate-200" htmlFor="edit-offer-status-select">
                    New offer status
                  </label>
                  <select
                    id="edit-offer-status-select"
                    className="form-control rounded-md border-slate-200/90 shadow-sm transition-shadow focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-white/15"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as Offer['status'])}
                  >
                    {OFFER_STATUS_EDIT_VALUES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="ti-modal-footer !gap-3 !border-slate-200/90 !py-3.5 dark:!border-white/10">
                <button type="button" className="ti-btn ti-btn-light min-w-[5.5rem] font-medium" onClick={requestCloseEditModal}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="ti-btn ti-btn-primary-full min-w-[6.75rem] font-semibold shadow-sm transition hover:brightness-105"
                  onClick={handleUpdateStatus}
                  disabled={editSubmitting}
                >
                  {editSubmitting ? <i className="ri-loader-4-line animate-spin" aria-hidden /> : 'Save status'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDiscardDialog open={editConfirmDiscardOpen} onConfirm={confirmEditDiscard} onCancel={cancelEditDiscard} />


      {/* View Offer Modal */}
      {/* View Offer Modal */}
      {/* View History Modal */}
      {viewHistoryModal && (
        <div
          className="fixed inset-0 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-4 sm:items-center"
          style={{ zIndex: DIALOG_Z }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="view-history-modal-title"
          {...historyModalBehavior.backdropProps}
        >
          <div
            ref={historyModalBehavior.containerRef}
            className="my-6 w-full max-w-md rounded-xl border bg-white p-5 shadow-xl dark:border-white/10 dark:bg-slate-950"
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">
                  Activity
                </p>
                <h4 id="view-history-modal-title" className="mb-0 break-words text-lg font-semibold">
                  Offer history · {viewHistoryModal.offerCode}
                </h4>
              </div>
              <button
                type="button"
                className={`${ROW_BTN} ti-btn-light`}
                aria-label="Close"
                onClick={historyModalBehavior.requestClose}
              >
                <i className="ri-close-line" aria-hidden />
              </button>
            </div>
            <div className={`${offersStyles.offerModalSection} mb-3 py-3.5`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={offersStyles.offerMetaLabel}>Current status</span>
                <span className={offerStatusPillClass(viewHistoryModal.status)}>
                  {viewHistoryModal.status || '—'}
                </span>
              </div>
            </div>
            <p className="mb-0 flex gap-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              <i className="ri-information-line mt-0.5 shrink-0 text-slate-400" aria-hidden />
              Detailed status history is not available yet. Future versions may show timeline events here.
            </p>
            <div className="mt-4 text-end">
              <button
                type="button"
                className={`${ROW_BTN} ti-btn-light`}
                onClick={historyModalBehavior.requestClose}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  )
}

export default OffersPlacement
