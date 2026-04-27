"use client"
import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment, useMemo, useState, useEffect, useCallback, useRef } from 'react'
import offersStyles from './offers-placement.module.css'
import { useSearchParams, useRouter } from 'next/navigation'
import { useTable, useSortBy, usePagination } from 'react-table'
import Link from 'next/link'
import { useFeaturePermissions } from '@/shared/hooks/use-feature-permissions'
import {
  listOffers,
  updateOffer,
  deleteOffer,
  getOfferById,
  getOfferLetterDefaults,
  generateOfferLetterPdf,
  formatOfferLetterPdfError,
  downloadOfferLetterFile,
} from '@/shared/lib/api/offers'
import type { Offer, OfferLetterJobType, UpdateOfferPayload } from '@/shared/lib/api/offers'
import {
  OfferLetterGeneratorWorkspace,
  createEmptyOfferLetterForm,
  type OfferLetterFormFields,
} from './OfferLetterGeneratorWorkspace'
import { detectEligibilityPreset } from './offer-letter-generator-data'
import { buildOfferLetterUpdatePayload } from './build-offer-letter-update-payload'
import { getPlacementStatusActorSummary } from '@/shared/lib/ats/placementActorText'

function formatCandidateAddress(c: { address?: Offer['candidate']['address'] } | null | undefined) {
  const a = c?.address
  if (!a || typeof a !== 'object') return ''
  return [a.streetAddress, a.streetAddress2, a.city, a.state, a.zipCode, a.country].filter(Boolean).join(', ')
}

/** Backend toJSON plugin exposes `id` (string); some paths still have `_id`. */
function getOfferRecordId(o: { _id?: string; id?: string } | null | undefined): string {
  const v = o?._id ?? o?.id
  if (v == null) return ''
  const s = String(v).trim()
  if (!s || s === 'undefined' || s === 'null') return ''
  return s
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
    offerStatus: o.status,
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
      displayPicture: (o.candidate as any)?.profilePicture?.url || '/assets/images/faces/1.jpg',
      email: o.candidate?.email || '',
      phone: o.candidate?.phoneNumber || '',
    },
    recruiter: {
      id: (o.createdBy as any)?._id ?? (o.createdBy as any)?.id ?? '',
      name: o.createdBy?.name || '-',
      displayPicture: '/assets/images/faces/1.jpg',
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

// Legacy mock data fallback (filtered to offer rows only - used when API empty)
const OFFERS_PLACEMENT_DATA_LEGACY = [
  {
    id: '1',
    offerId: 'OFF-2024-001',
    position: 'Senior Software Engineer',
    offerDate: '2024-01-15',
    joiningDate: '2024-02-01',
    templateType: 'Standard',
    version: 2,
    signedStatus: 'Signed',
    offerStatus: 'Accepted',
    onboardingStatus: 'Ready',
    candidate: {
      id: '1',
      name: 'John Anderson',
      displayPicture: '/assets/images/faces/1.jpg',
      email: 'john.anderson@example.com',
      phone: '+1 (555) 123-4567',
    },
    recruiter: {
      id: '1',
      name: 'John Anderson',
      displayPicture: '/assets/images/faces/1.jpg',
      email: 'john.anderson@example.com',
    },
  },
  {
    id: '2',
    offerId: 'OFF-2024-002',
    position: 'Product Manager',
    offerDate: '2024-01-16',
    joiningDate: '2024-02-15',
    templateType: 'Executive',
    version: 1,
    signedStatus: 'Pending',
    offerStatus: 'Under Negotiation',
    onboardingStatus: 'Pending',
    candidate: {
      id: '2',
      name: 'Sarah Johnson',
      displayPicture: '/assets/images/faces/2.jpg',
      email: 'sarah.johnson@example.com',
      phone: '+1 (555) 234-5678',
    },
    recruiter: {
      id: '2',
      name: 'Sarah Johnson',
      displayPicture: '/assets/images/faces/2.jpg',
      email: 'sarah.johnson@example.com',
    },
  },
  {
    id: '3',
    offerId: 'OFF-2024-003',
    position: 'Frontend Developer',
    offerDate: '2024-01-17',
    joiningDate: '2024-02-10',
    templateType: 'Standard',
    version: 1,
    signedStatus: 'Signed',
    offerStatus: 'Accepted',
    onboardingStatus: 'In Progress',
    candidate: {
      id: '3',
      name: 'Michael Chen',
      displayPicture: '/assets/images/faces/3.jpg',
      email: 'michael.chen@example.com',
      phone: '+1 (555) 345-6789',
    },
    recruiter: {
      id: '4',
      name: 'Emily Davis',
      displayPicture: '/assets/images/faces/4.jpg',
      email: 'emily.davis@example.com',
    },
  },
  {
    id: '4',
    offerId: 'OFF-2024-004',
    position: 'Data Scientist',
    offerDate: '2024-01-18',
    joiningDate: '2024-02-20',
    templateType: 'Standard',
    version: 3,
    signedStatus: 'Signed',
    offerStatus: 'Accepted',
    onboardingStatus: 'Pending',
    candidate: {
      id: '4',
      name: 'Emily Davis',
      displayPicture: '/assets/images/faces/4.jpg',
      email: 'emily.davis@example.com',
      phone: '+1 (555) 456-7890',
    },
    recruiter: {
      id: '4',
      name: 'Emily Davis',
      displayPicture: '/assets/images/faces/4.jpg',
      email: 'emily.davis@example.com',
    },
  },
  {
    id: '5',
    offerId: 'OFF-2024-005',
    position: 'DevOps Engineer',
    offerDate: '2024-01-19',
    joiningDate: null,
    templateType: 'Standard',
    version: 1,
    signedStatus: 'Not Sent',
    offerStatus: 'Rejected',
    onboardingStatus: 'Not Applicable',
    candidate: {
      id: '5',
      name: 'David Brown',
      displayPicture: '/assets/images/faces/5.jpg',
      email: 'david.brown@example.com',
      phone: '+1 (555) 567-8901',
    },
    recruiter: {
      id: '5',
      name: 'David Brown',
      displayPicture: '/assets/images/faces/5.jpg',
      email: 'david.brown@example.com',
    },
  },
  {
    id: '6',
    position: 'UX Designer',
    offerId: 'OFF-2024-006',
    offerDate: '2024-01-20',
    joiningDate: null,
    templateType: 'Standard',
    version: 1,
    signedStatus: 'Draft',
    offerStatus: 'Draft',
    onboardingStatus: 'Pending',
    candidate: { id: '6', name: 'Lisa Anderson', displayPicture: '/assets/images/faces/6.jpg', email: 'lisa@example.com', phone: '+1 555' },
    recruiter: { id: '6', name: 'Lisa Anderson', displayPicture: '/assets/images/faces/6.jpg', email: 'lisa@example.com' },
  },
  {
    id: '7',
    date: '2024-01-21',
    time: '1:00 PM',
    type: 'Video',
    candidate: {
      id: '6',
      name: 'Lisa Anderson',
      displayPicture: '/assets/images/faces/6.jpg',
      email: 'lisa.anderson@example.com',
      phone: '+1 (555) 678-9012',
    },
    recruiter: {
      id: '6',
      name: 'Lisa Anderson',
      displayPicture: '/assets/images/faces/6.jpg',
      email: 'lisa.anderson@example.com',
    },
    status: 'Scheduled',
  },
  {
    id: '7',
    position: 'Backend Developer',
    date: '2024-01-21',
    time: '10:30 AM',
    type: 'Phone',
    candidate: {
      id: '7',
      name: 'Robert Wilson',
      displayPicture: '/assets/images/faces/7.jpg',
      email: 'robert.wilson@example.com',
      phone: '+1 (555) 789-0123',
    },
    recruiter: {
      id: '7',
      name: 'Robert Wilson',
      displayPicture: '/assets/images/faces/7.jpg',
      email: 'robert.wilson@example.com',
    },
    status: 'Completed',
  },
  {
    id: '8',
    position: 'Digital Marketing Manager',
    date: '2024-01-22',
    time: '4:00 PM',
    type: 'Video',
    candidate: {
      id: '8',
      name: 'Jessica Martinez',
      displayPicture: '/assets/images/faces/8.jpg',
      email: 'jessica.martinez@example.com',
      phone: '+1 (555) 890-1234',
    },
    recruiter: {
      id: '8',
      name: 'Jessica Martinez',
      displayPicture: '/assets/images/faces/8.jpg',
      email: 'jessica.martinez@example.com',
    },
    status: 'Scheduled',
  },
  {
    id: '9',
    position: 'Sales Executive',
    date: '2024-01-23',
    time: '2:30 PM',
    type: 'In-Person',
    candidate: {
      id: '9',
      name: 'Thomas Lee',
      displayPicture: '/assets/images/faces/9.jpg',
      email: 'thomas.lee@example.com',
      phone: '+1 (555) 901-2345',
    },
    recruiter: {
      id: '9',
      name: 'Thomas Lee',
      displayPicture: '/assets/images/faces/9.jpg',
      email: 'thomas.lee@example.com',
    },
    status: 'Rescheduled',
  },
  {
    id: '10',
    position: 'QA Engineer',
    date: '2024-01-24',
    time: '11:00 AM',
    type: 'Video',
    candidate: {
      id: '10',
      name: 'Jennifer White',
      displayPicture: '/assets/images/faces/10.jpg',
      email: 'jennifer.white@example.com',
      phone: '+1 (555) 012-3456',
    },
    recruiter: {
      id: '10',
      name: 'Jennifer White',
      displayPicture: '/assets/images/faces/10.jpg',
      email: 'jennifer.white@example.com',
    },
    status: 'Scheduled',
  },
  {
    id: '11',
    position: 'Full-Stack Developer',
    date: '2024-01-25',
    time: '3:30 PM',
    type: 'Phone',
    candidate: {
      id: '11',
      name: 'Christopher Taylor',
      displayPicture: '/assets/images/faces/11.jpg',
      email: 'christopher.taylor@example.com',
      phone: '+1 (555) 123-4568',
    },
    recruiter: {
      id: '11',
      name: 'Christopher Taylor',
      displayPicture: '/assets/images/faces/11.jpg',
      email: 'christopher.taylor@example.com',
    },
    status: 'Completed',
  },
  {
    id: '12',
    position: 'Business Analyst',
    date: '2024-01-26',
    time: '10:00 AM',
    type: 'Video',
    candidate: {
      id: '12',
      name: 'Amanda Garcia',
      displayPicture: '/assets/images/faces/12.jpg',
      email: 'amanda.garcia@example.com',
      phone: '+1 (555) 234-5679',
    },
    recruiter: {
      id: '12',
      name: 'Amanda Garcia',
      displayPicture: '/assets/images/faces/12.jpg',
      email: 'amanda.garcia@example.com',
    },
    status: 'Scheduled',
  },
  {
    id: '13',
    position: 'Cloud Architect',
    date: '2024-01-27',
    time: '1:30 PM',
    type: 'In-Person',
    candidate: {
      id: '13',
      name: 'Daniel Rodriguez',
      displayPicture: '/assets/images/faces/13.jpg',
      email: 'daniel.rodriguez@example.com',
      phone: '+1 (555) 345-6790',
    },
    recruiter: {
      id: '13',
      name: 'Daniel Rodriguez',
      displayPicture: '/assets/images/faces/13.jpg',
      email: 'daniel.rodriguez@example.com',
    },
    status: 'Cancelled',
  },
  {
    id: '14',
    position: 'Mobile App Developer',
    date: '2024-01-28',
    time: '9:30 AM',
    type: 'Video',
    candidate: {
      id: '14',
      name: 'Rachel Kim',
      displayPicture: '/assets/images/faces/14.jpg',
      email: 'rachel.kim@example.com',
      phone: '+1 (555) 456-7901',
    },
    recruiter: {
      id: '14',
      name: 'Rachel Kim',
      displayPicture: '/assets/images/faces/14.jpg',
      email: 'rachel.kim@example.com',
    },
    status: 'Scheduled',
  },
  {
    id: '15',
    position: 'Network Administrator',
    date: '2024-01-29',
    time: '2:00 PM',
    type: 'Phone',
    candidate: {
      id: '15',
      name: 'Kevin Harris',
      displayPicture: '/assets/images/faces/15.jpg',
      email: 'kevin.harris@example.com',
      phone: '+1 (555) 567-9012',
    },
    recruiter: {
      id: '15',
      name: 'Kevin Harris',
      displayPicture: '/assets/images/faces/15.jpg',
      email: 'kevin.harris@example.com',
    },
    status: 'Completed',
  },
]

interface FilterState {
  candidate: string[]
  recruiter: string[]
  offerStatus: string[]
  step: string[]
}

const OffersPlacement = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { canView, canCreate, canEdit, canDelete } = useFeaturePermissions("ats.offers")
  const [offersData, setOffersData] = useState<Offer[]>([])
  const [offersLoading, setOffersLoading] = useState(true)
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [selectedSort, setSelectedSort] = useState<string>('')

  const fetchOffers = () => {
    setOffersLoading(true)
    listOffers({ limit: 500 })
      .then((res) => setOffersData(res.results ?? []))
      .catch(() => setOffersData([]))
      .finally(() => setOffersLoading(false))
  }

  useEffect(() => {
    fetchOffers()
  }, [])

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

  const refreshOffers = () => fetchOffers()

  const tableDataFromApi = useMemo(
    () => offersData.filter(offerHasUsableJobAndCandidate).map(mapOfferToRow),
    [offersData]
  )
  const OFFERS_PLACEMENT_DATA = tableDataFromApi

  const [filters, setFilters] = useState<FilterState>({
    candidate: [],
    recruiter: [],
    offerStatus: [],
    step: []
  })

  // Search states for filter dropdowns
  const [searchCandidate, setSearchCandidate] = useState('')
  const [searchRecruiter, setSearchRecruiter] = useState('')
  const [searchOfferStatus, setSearchOfferStatus] = useState('')
  const [searchStep, setSearchStep] = useState('')

  /** Quick filter across columns (reference: inline toolbar search) */
  const [listSearch, setListSearch] = useState('')

  const [editOfferModal, setEditOfferModal] = useState<Offer | null>(null)
  const [editStatus, setEditStatus] = useState('')
  const [viewOfferModal, setViewOfferModal] = useState<Offer | null>(null)
  const [viewHistoryModal, setViewHistoryModal] = useState<Offer | null>(null)
  const [editSubmitting, setEditSubmitting] = useState(false)

  const [letterModalOffer, setLetterModalOffer] = useState<Offer | null>(null)
  const [letterForm, setLetterForm] = useState<OfferLetterFormFields>(() => createEmptyOfferLetterForm())
  const [letterBusy, setLetterBusy] = useState(false)

  /** After Create Offer (modal or /create redirect): run Generate PDF once the workspace is open and form is seeded. */
  const autoGeneratePdfAfterCreateRef = useRef(false)

  const openOfferLetterModal = useCallback(async (raw: Offer) => {
    const id = getOfferRecordId(raw)
    if (!id) {
      alert(
        'Could not open the offer letter workspace: this offer has no id yet. Use the document icon on the offer row, or try creating the offer again.'
      )
      return
    }
    setLetterBusy(true)
    try {
      const full = await getOfferById(id)
      if (typeof window !== 'undefined' && sessionStorage.getItem('dharwin:offerLetterAutoPdfAfterOpen') === '1') {
        sessionStorage.removeItem('dharwin:offerLetterAutoPdfAfterOpen')
        autoGeneratePdfAfterCreateRef.current = true
      }
      setLetterModalOffer(full)
    } catch (e: unknown) {
      alert((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to load offer')
    } finally {
      setLetterBusy(false)
    }
  }, [])

  const openLetterParamHandledRef = useRef<string | null>(null)

  /** After Create Offer: ?refresh= refetches list, then ?openLetter= opens generator. Deep links: ?openLetter= only. */
  useEffect(() => {
    const refresh = searchParams?.get('refresh')
    const letterId = searchParams?.get('openLetter')

    if (refresh) {
      setOffersLoading(true)
      listOffers({ limit: 500 })
        .then((res) => setOffersData(res.results ?? []))
        .catch(() => {})
        .finally(() => {
          setOffersLoading(false)
          const next =
            letterId && /^[0-9a-fA-F]{24}$/.test(letterId)
              ? `/ats/offers-placement?openLetter=${encodeURIComponent(letterId)}`
              : '/ats/offers-placement'
          router.replace(next, { scroll: false })
        })
      return
    }

    if (letterId && /^[0-9a-fA-F]{24}$/.test(letterId)) {
      if (openLetterParamHandledRef.current === letterId) return
      openLetterParamHandledRef.current = letterId
      void (async () => {
        try {
          await openOfferLetterModal({ _id: letterId } as Offer)
        } finally {
          router.replace('/ats/offers-placement', { scroll: false })
        }
      })()
    } else {
      openLetterParamHandledRef.current = null
    }
  }, [searchParams, router, openOfferLetterModal])

  useEffect(() => {
    if (!letterModalOffer) return
    const o = letterModalOffer
    const c = o.candidate
    const addr = formatCandidateAddress(c)
    const jt = (o.jobType as OfferLetterJobType) || 'FT_40'
    const isIntern = jt === 'INTERN_UNPAID'
    const eligLines = o.employmentEligibilityLines || []
    let eligibilityPreset = detectEligibilityPreset(eligLines, isIntern)
    if (isIntern && eligibilityPreset === 'none' && eligLines.length === 0) {
      eligibilityPreset = 'opt_regular'
    }
    if (!isIntern && eligibilityPreset === 'none' && eligLines.length === 0) {
      eligibilityPreset = 'opt_regular'
    }
    const eligibilityText = eligibilityPreset === 'custom' ? eligLines.join('\n') : ''
    const base: OfferLetterFormFields = {
      letterFullName: o.letterFullName || c?.fullName || '',
      letterAddress: o.letterAddress || addr || '',
      positionTitle: o.positionTitle || o.job?.title || '',
      joiningDate: o.joiningDate ? String(o.joiningDate).slice(0, 10) : '',
      letterDate: o.letterDate ? String(o.letterDate).slice(0, 10) : '',
      jobType: jt,
      weeklyHours: (o.weeklyHours === 25 ? 25 : 40) as 25 | 40,
      workLocation: o.workLocation || 'Remote (USA)',
      rolesText: (o.roleResponsibilities && o.roleResponsibilities.length) ? o.roleResponsibilities.join('\n') : '',
      trainingText: (o.trainingOutcomes && o.trainingOutcomes.length) ? o.trainingOutcomes.join('\n') : '',
      annualGrossCtc:
        o.ctcBreakdown?.gross != null && Number(o.ctcBreakdown.gross) > 0
          ? String(o.ctcBreakdown.gross)
          : '',
      ctcCurrency: (o.ctcBreakdown?.currency || 'USD').toUpperCase() === 'INR' ? 'INR' : 'USD',
      academicNote: o.academicAlignmentNote || '',
      eligibilityPreset,
      eligibilityText,
      supFirst: o.supervisor?.firstName || 'Jason',
      supLast: o.supervisor?.lastName || 'Mendonca',
      supPhone: o.supervisor?.phone || '+1-307-206-9144',
      supEmail: o.supervisor?.email || 'jason@dharwinbusinesssolutions.com',
    }
    setLetterForm(base)
    const needRoleDefaults = !base.rolesText.trim()
    const needTrainingDefaults = isIntern && !base.trainingText.trim()
    if (needRoleDefaults || needTrainingDefaults) {
      getOfferLetterDefaults(o.job?.title || '')
        .then((d) => {
          setLetterForm((f) => ({
            ...f,
            rolesText: f.rolesText.trim() ? f.rolesText : d.roleResponsibilities.join('\n'),
            trainingText:
              f.trainingText.trim() ? f.trainingText : isIntern ? d.trainingOutcomes.join('\n') : f.trainingText,
          }))
        })
        .catch(() => {})
    }
  }, [letterModalOffer])

  const handleGenerateOfferLetter = async () => {
    if (!letterModalOffer) return
    const id = getOfferRecordId(letterModalOffer)
    if (!id) {
      alert('Missing offer id. Close and reopen the offer letter from the list.')
      return
    }
    setLetterBusy(true)
    try {
      const updated = await generateOfferLetterPdf(
        id,
        buildOfferLetterUpdatePayload(letterForm, letterModalOffer) as UpdateOfferPayload
      )
      setLetterModalOffer(updated)
      refreshOffers()
    } catch (e: unknown) {
      alert(formatOfferLetterPdfError(e, 'Could not generate PDF'))
    } finally {
      setLetterBusy(false)
    }
  }

  const handleGenerateOfferLetterRef = useRef(handleGenerateOfferLetter)
  handleGenerateOfferLetterRef.current = handleGenerateOfferLetter

  /** Defer PDF generation so letter form state (and async role defaults) can settle after open. */
  useEffect(() => {
    if (!letterModalOffer || !autoGeneratePdfAfterCreateRef.current) return
    autoGeneratePdfAfterCreateRef.current = false
    const t = window.setTimeout(() => {
      void handleGenerateOfferLetterRef.current()
    }, 1200)
    return () => window.clearTimeout(t)
  }, [letterModalOffer])

  const handleDownloadOfferLetter = async () => {
    if (!letterModalOffer) return
    const id = getOfferRecordId(letterModalOffer)
    if (!id) {
      alert('Missing offer id. Close and reopen the offer letter from the list.')
      return
    }
    setLetterBusy(true)
    try {
      const blob = await downloadOfferLetterFile(id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Offer-Letter-${letterModalOffer.offerCode || id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: unknown) {
      alert((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Download failed')
    } finally {
      setLetterBusy(false)
    }
  }

  const handleUpdateStatus = async () => {
    if (!editOfferModal || !editStatus) return
    setEditSubmitting(true)
    try {
      await updateOffer((editOfferModal as any)._id ?? (editOfferModal as any).id ?? '', { status: editStatus as any })
      setEditOfferModal(null)
      refreshOffers()
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to update status')
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedRows.size === 0) return
    if (!confirm(`Delete ${selectedRows.size} selected offer(s)?`)) return
    for (const id of selectedRows) {
      try {
        await deleteOffer(id)
      } catch { /* skip */ }
    }
    setSelectedRows(new Set())
    refreshOffers()
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
            <div className="flex min-w-0 max-w-[200px] flex-col gap-0.5">
              <div className="text-[13px] font-medium leading-tight text-gray-900 dark:text-white">{offer.position}</div>
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
            <div className="flex min-w-0 max-w-[220px] items-center gap-2.5">
              <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full ring-1 ring-slate-200/80 dark:ring-white/10">
                <img
                  src={candidate.displayPicture || '/assets/images/faces/1.jpg'}
                  alt={candidate.name}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/assets/images/faces/1.jpg'
                  }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-gray-900 dark:text-white">{candidate.name}</div>
                <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">{candidate.email}</div>
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
            <div className="flex min-w-0 max-w-[200px] items-center gap-2.5">
              <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full ring-1 ring-slate-200/80 dark:ring-white/10">
                <img
                  src={recruiter.displayPicture || '/assets/images/faces/1.jpg'}
                  alt={recruiter.name}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/assets/images/faces/1.jpg'
                  }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-gray-900 dark:text-white">{recruiter.name}</div>
                {recruiter.email ? (
                  <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">{recruiter.email}</div>
                ) : null}
              </div>
            </div>
          )
        },
      },
      {
        Header: 'Pre-board',
        accessor: 'preBoardingStatus',
        Cell: ({ row }: any) => {
          const offer = row.original
          if (offer.offerStatus !== 'Accepted' || offer.placementStatus !== 'Pending') return <span className="text-slate-400">—</span>
          const status = offer.preBoardingStatus || 'Not Started'
          const colors: Record<string, string> = {
            'Not Started': 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300',
            'In Progress': 'bg-sky-50 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200',
            'Completed': 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200',
          }
          return (
            <span
              className={`inline-flex items-center rounded-full border-0 px-2.5 py-0.5 text-[11px] font-medium ${colors[status] || 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'}`}
            >
              {status}
            </span>
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
          const colors: Record<string, string> = {
            'Pending': 'bg-amber-50 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200',
            'In Progress': 'bg-sky-50 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200',
            'Completed': 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200',
            'Verified': 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200',
            'Failed': 'bg-rose-50 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200',
          }
          return (
            <span
              className={`inline-flex items-center rounded-full border-0 px-2.5 py-0.5 text-[11px] font-medium ${colors[status] || 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'}`}
            >
              {status}
            </span>
          )
        },
      },
      {
        Header: 'Assets / IT',
        accessor: 'assetsIt',
        Cell: ({ row }: any) => {
          const offer = row.original
          if (offer.offerStatus !== 'Accepted') return <span className="text-slate-400">—</span>
          const assets = offer.assetCount ?? 0
          const it = offer.itAccessCount ?? 0
          return (
            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">
              {assets} / {it}
            </span>
          )
        },
      },
      {
        Header: 'Offer Status',
        accessor: 'offerStatus',
        Cell: ({ row }: any) => {
          const offer = row.original
          const statusColors: Record<string, string> = {
            'Accepted': 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200',
            'Pending': 'bg-amber-50 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200',
            'Under Negotiation': 'bg-sky-50 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200',
            'Rejected': 'bg-rose-50 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200',
            'Withdrawn': 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
          }
          return (
            <div className="min-w-0">
              <span
                className={`inline-flex items-center rounded-full border-0 px-2.5 py-0.5 text-[11px] font-medium ${statusColors[offer.offerStatus] || 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'}`}
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
        Header: 'Step',
        accessor: 'step',
        Cell: ({ row }: any) => {
          const offer = row.original
          if (offer.offerStatus !== 'Accepted') {
            return (
              <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-medium text-violet-800 dark:bg-violet-500/20 dark:text-violet-200">
                Offer
              </span>
            )
          }
          const status = offer.placementStatus
          if (status === 'Pending') {
            return (
              <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
                Pre-boarding
              </span>
            )
          }
          if (status === 'Joined') {
            return (
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200">
                Onboarding
              </span>
            )
          }
          if (status === 'Deferred' || status === 'Cancelled') {
            const { primary, secondary } = getPlacementStatusActorSummary({
              status,
              ...(offer.placement || {}),
            })
            return (
              <div className="flex flex-col gap-0.5">
                <span className="inline-flex w-fit items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-white/10 dark:text-slate-300">
                  {status}
                </span>
                {primary ? (
                  <span className="max-w-[14rem] text-[10px] leading-tight text-slate-500 dark:text-slate-400" title={primary}>
                    {primary}
                  </span>
                ) : null}
                {secondary ? (
                  <span className="max-w-[14rem] text-[10px] leading-tight text-slate-500 dark:text-slate-400" title={secondary}>
                    {secondary}
                  </span>
                ) : null}
              </div>
            )
          }
          return (
            <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
              Pre-boarding
            </span>
          )
        },
      },
      {
        Header: 'Joining Date',
        accessor: 'joiningDate',
        Cell: ({ row }: any) => {
          const offer = row.original
          return (
            <div className="text-[12px] text-slate-600 dark:text-slate-300">
              {offer.joiningDate ? (
                <div className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" title="Date set" />
                  {new Date(offer.joiningDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-slate-400">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300 dark:bg-slate-600" />
                  Not set
                </span>
              )}
            </div>
          )
        },
      },
      {
        Header: 'Actions',
        accessor: 'id',
        disableSortBy: true,
        Cell: ({ row }: any) => {
          const offer = row.original
          const isAccepted = offer.offerStatus === 'Accepted'
          // Pre-boarding shows Pending placements only; Joined placements go to Onboarding
          const inPreBoarding =
            isAccepted &&
            (offer.placementStatus === 'Pending' ||
              offer.placementStatus === 'Deferred' ||
              offer.placementStatus === 'Cancelled')
          const inOnboarding = isAccepted && offer.placementStatus === 'Joined'
          const rowAct =
            'hs-tooltip-toggle inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-[0.95rem] text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-500 dark:border-white/15 dark:bg-transparent dark:hover:bg-white/5'
          /** Preline: parent has overflow-y-auto — scope to window + bottom placement avoids clipped / misplaced tooltips */
          const ttWrap = 'hs-tooltip ti-main-tooltip shrink-0 [--placement:bottom] [--scope:window]'
          return (
          <div className="flex min-w-0 max-w-[200px] flex-wrap items-center gap-1 sm:max-w-none">
            {inPreBoarding && (
              <Link
                href={
                  offer.placementId && /^[0-9a-fA-F]{24}$/.test(offer.placementId)
                    ? `/ats/pre-boarding?placementId=${encodeURIComponent(offer.placementId)}`
                    : '/ats/pre-boarding'
                }
                className="mb-0.5 inline-flex h-7 shrink-0 items-center gap-0.5 rounded-md border border-emerald-200/90 bg-emerald-50 px-2 text-[11px] font-medium text-emerald-900 hover:bg-emerald-100/90 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100"
                title="Go to Pre-boarding"
              >
                <i className="ri-user-follow-line" aria-hidden />
                Pre
              </Link>
            )}
            {inOnboarding && (
              <Link
                href="/ats/onboarding"
                className="mb-0.5 inline-flex h-7 shrink-0 items-center gap-0.5 rounded-md border border-indigo-200/90 bg-indigo-50 px-2 text-[11px] font-medium text-indigo-900 hover:bg-indigo-100/90 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-100"
                title="Go to Onboarding"
              >
                <i className="ri-login-circle-line" aria-hidden />
                Join
              </Link>
            )}
            <div className={ttWrap}>
              <button
                type="button"
                className={rowAct}
                aria-label="View offer"
                onClick={() => {
                  const raw = (row.original as any)._raw
                  if (raw) setViewOfferModal(raw)
                }}
              >
                <i className="ri-file-text-line" aria-hidden />
                <span
                  className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700"
                  role="tooltip">
                  View Offer
                </span>
              </button>
            </div>
            <div className={ttWrap}>
              <button
                type="button"
                className={rowAct}
                aria-label="View history"
                onClick={() => {
                  const raw = (row.original as any)._raw
                  if (raw) setViewHistoryModal(raw)
                }}
              >
                <i className="ri-history-line" aria-hidden />
                <span
                  className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700"
                  role="tooltip">
                  View History
                </span>
              </button>
            </div>
            <div className={ttWrap}>
              <button
                type="button"
                className={rowAct}
                aria-label="Edit offer"
                onClick={() => {
                  const raw = (row.original as any)._raw
                  if (raw) {
                    setEditOfferModal(raw)
                    setEditStatus(raw.status)
                  }
                }}
              >
                <i className="ri-pencil-line" aria-hidden />
                <span
                  className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700"
                  role="tooltip">
                  Edit Offer
                </span>
              </button>
            </div>
            {canEdit && (
              <div className={ttWrap}>
                <button
                  type="button"
                  className={rowAct}
                  aria-label="Open offer letter generator"
                  onClick={() => {
                    const raw = (row.original as any)._raw as Offer | undefined
                    if (raw) void openOfferLetterModal(raw)
                  }}
                >
                  <i className="ri-article-line" aria-hidden />
                  <span
                    className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700"
                    role="tooltip">
                    Offer letter
                  </span>
                </button>
              </div>
            )}
          </div>
        )
        },
      },
    ],
    [selectedRows, canEdit, openOfferLetterModal]
  )

  // Filter data based on filter state
  const filteredData = useMemo(() => {
    return OFFERS_PLACEMENT_DATA.filter((offer) => {
      if (listSearch.trim()) {
        const q = listSearch.trim().toLowerCase()
        const blob = [
          offer.position,
          offer.offerId,
          offer.candidate?.name,
          offer.candidate?.email,
          offer.recruiter?.name,
          offer.offerStatus,
          String(offer.placementStatus ?? ''),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!blob.includes(q)) return false
      }
      // Candidate filter (array)
      if (filters.candidate.length > 0 && !filters.candidate.some(candidateName => 
        offer.candidate.name.toLowerCase().includes(candidateName.toLowerCase())
      )) {
        return false
      }
      
      // Recruiter filter (array)
      if (filters.recruiter.length > 0 && !filters.recruiter.some(recruiterName => 
        offer.recruiter.name.toLowerCase().includes(recruiterName.toLowerCase())
      )) {
        return false
      }
      
      // Offer Status filter (array)
      if (filters.offerStatus.length > 0 && offer.offerStatus && !filters.offerStatus.includes(offer.offerStatus)) {
        return false
      }
      
      // Step filter (Pre-boarding, Onboarding)
      if (filters.step.length > 0) {
        const step = offer.offerStatus === 'Accepted'
          ? (offer.placementStatus === 'Pending' ||
              offer.placementStatus === 'Deferred' ||
              offer.placementStatus === 'Cancelled'
              ? 'Pre-boarding'
              : offer.placementStatus === 'Joined'
                ? 'Onboarding'
                : null)
          : null
        if (!step || !filters.step.includes(step)) return false
      }
      
      return true
    })
  }, [filters, listSearch, OFFERS_PLACEMENT_DATA])

  const data = useMemo(() => filteredData, [filteredData])

  // Get unique values for dropdown filters
  const allCandidates = useMemo(() => {
    return [...new Set(OFFERS_PLACEMENT_DATA.map(offer => offer.candidate.name))].sort()
  }, [OFFERS_PLACEMENT_DATA])

  const allRecruiters = useMemo(() => {
    return [...new Set(OFFERS_PLACEMENT_DATA.map(offer => offer.recruiter.name))].sort()
  }, [OFFERS_PLACEMENT_DATA])

  const allOfferStatuses = useMemo((): string[] => {
    return [...new Set(OFFERS_PLACEMENT_DATA.map(offer => offer.offerStatus).filter((s): s is string => s !== undefined))].sort()
  }, [OFFERS_PLACEMENT_DATA])

  const allSteps = useMemo((): string[] => {
    const steps = new Set<string>()
    OFFERS_PLACEMENT_DATA.forEach((offer) => {
      if (offer.offerStatus === 'Accepted') {
        if (
          offer.placementStatus === 'Pending' ||
          offer.placementStatus === 'Deferred' ||
          offer.placementStatus === 'Cancelled'
        )
          steps.add('Pre-boarding')
        else if (offer.placementStatus === 'Joined') steps.add('Onboarding')
      }
    })
    return [...steps].sort()
  }, [OFFERS_PLACEMENT_DATA])

  // Filter options based on search terms
  const filteredCandidates = useMemo(() => {
    if (!searchCandidate) return allCandidates
    return allCandidates.filter(candidate => 
      candidate.toLowerCase().includes(searchCandidate.toLowerCase())
    )
  }, [allCandidates, searchCandidate])

  const filteredRecruiters = useMemo(() => {
    if (!searchRecruiter) return allRecruiters
    return allRecruiters.filter(recruiter => 
      recruiter.toLowerCase().includes(searchRecruiter.toLowerCase())
    )
  }, [allRecruiters, searchRecruiter])

  const filteredOfferStatuses = useMemo((): string[] => {
    if (!searchOfferStatus) return allOfferStatuses
    return allOfferStatuses.filter(status => 
      status.toLowerCase().includes(searchOfferStatus.toLowerCase())
    )
  }, [allOfferStatuses, searchOfferStatus])

  const filteredSteps = useMemo((): string[] => {
    if (!searchStep) return allSteps
    return allSteps.filter((s) => s.toLowerCase().includes(searchStep.toLowerCase()))
  }, [allSteps, searchStep])

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
    setSortBy,
  } = tableInstance

  const { pageIndex, pageSize } = state

  // Handle sort selection
  const handleSortChange = (sortOption: string) => {
    setSelectedSort(sortOption)
    
    switch(sortOption) {
      case 'date-asc':
        setSortBy([{ id: 'offerInfo', desc: false }])
        break
      case 'date-desc':
        setSortBy([{ id: 'offerInfo', desc: true }])
        break
      case 'joining-asc':
        setSortBy([{ id: 'joiningDate', desc: false }])
        break
      case 'joining-desc':
        setSortBy([{ id: 'joiningDate', desc: true }])
        break
      case 'candidate-asc':
        setSortBy([{ id: 'candidate', desc: false }])
        break
      case 'candidate-desc':
        setSortBy([{ id: 'candidate', desc: true }])
        break
      case 'recruiter-asc':
        setSortBy([{ id: 'recruiter', desc: false }])
        break
      case 'recruiter-desc':
        setSortBy([{ id: 'recruiter', desc: true }])
        break
      case 'status-asc':
        setSortBy([{ id: 'offerStatus', desc: false }])
        break
      case 'status-desc':
        setSortBy([{ id: 'offerStatus', desc: true }])
        break
      case 'clear-sort':
        setSortBy([])
        setSelectedSort('')
        break
      default:
        setSortBy([])
    }
  }

  // Handle select all checkbox - select ALL rows in filtered dataset
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = new Set(filteredData.map((offer) => offer.id))
      setSelectedRows(allIds)
    } else {
      setSelectedRows(new Set())
    }
  }

  // Check if all rows in filtered dataset are selected
  const isAllSelected = selectedRows.size === filteredData.length && filteredData.length > 0
  const isIndeterminate = selectedRows.size > 0 && selectedRows.size < filteredData.length

  /** Prevent sticky header label collision on narrow viewports */
  const offerColMinW: Record<string, string> = {
    checkbox: '2.25rem',
    offerInfo: '9.5rem',
    candidate: '11rem',
    recruiter: '8rem',
    preBoardingStatus: '6.5rem',
    bgvStatus: '4rem',
    assetsIt: '5rem',
    offerStatus: '6.25rem',
    step: '4.75rem',
    joiningDate: '6.75rem',
    id: '8.5rem',
  }

  /** Toolbar: match `ats/jobs` — `!py-1 !px-2 !text-[0.75rem]`, never bare `ti-btn-sm` (fixed 28×28 in theme). */
  return (
    <Fragment>
      <Seo title="Offers & Placement" />
      <div className={`mt-5 grid grid-cols-12 gap-6 min-w-0 sm:mt-6 ${offersStyles.listShell}`}>
        <div className="col-span-12 min-w-0 flex flex-col">
          <div className="box min-w-0 flex flex-col">
            <div className="box-header flex flex-wrap items-center justify-between gap-2 overflow-visible">
              <div className="box-title min-w-0 flex-1">
                Offers &amp; Placement
                <span
                  className="badge bg-light text-default rounded-full ms-1 text-[0.75rem] align-middle tabular-nums"
                  title="Count after search and filters"
                >
                  {filteredData.length}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0" role="toolbar" aria-label="Offer list tools">
                <label className="sr-only" htmlFor="offers-page-size">
                  Rows per page
                </label>
                <select
                  id="offers-page-size"
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
                {canCreate && (
                  <Link
                    href="/ats/offers-placement/offer-letter/new"
                    className="ti-btn ti-btn-primary-full !mb-0 !w-auto !min-w-fit !py-1 !px-2 !text-[0.75rem] me-2"
                  >
                    <i className="ri-add-line font-semibold align-middle" aria-hidden />
                    Create
                  </Link>
                )}
                <div className="hs-dropdown ti-dropdown me-2">
                  <button
                    type="button"
                    className="ti-btn ti-btn-light !mb-0 !w-auto !min-w-fit !py-1 !px-2 !text-[0.75rem] hs-dropdown-toggle ti-dropdown-toggle"
                    id="sort-dropdown-button"
                    aria-expanded="false"
                    aria-haspopup="true"
                  >
                    <i className="ri-arrow-up-down-line me-1 align-middle font-semibold" aria-hidden />
                    Sort
                    <i className="ri-arrow-down-s-line align-middle ms-1 inline-block" aria-hidden />
                  </button>
                  <ul className="hs-dropdown-menu ti-dropdown-menu hidden" aria-labelledby="sort-dropdown-button">
                    <li>
                      <button
                        type="button"
                        className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${selectedSort === 'date-asc' ? 'active' : ''}`}
                        onClick={() => handleSortChange('date-asc')}
                      >
                        <i className="ri-calendar-line me-2 align-middle inline-block"></i>Offer Date (Oldest First)
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${selectedSort === 'date-desc' ? 'active' : ''}`}
                        onClick={() => handleSortChange('date-desc')}
                      >
                        <i className="ri-calendar-line me-2 align-middle inline-block"></i>Offer Date (Newest First)
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
                    <li>
                      <button
                        type="button"
                        className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${selectedSort === 'candidate-asc' ? 'active' : ''}`}
                        onClick={() => handleSortChange('candidate-asc')}
                      >
                        <i className="ri-user-line me-2 align-middle inline-block"></i>Candidate (A-Z)
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${selectedSort === 'candidate-desc' ? 'active' : ''}`}
                        onClick={() => handleSortChange('candidate-desc')}
                      >
                        <i className="ri-user-line me-2 align-middle inline-block"></i>Candidate (Z-A)
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${selectedSort === 'recruiter-asc' ? 'active' : ''}`}
                        onClick={() => handleSortChange('recruiter-asc')}
                      >
                        <i className="ri-team-line me-2 align-middle inline-block"></i>Recruiter (A-Z)
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${selectedSort === 'recruiter-desc' ? 'active' : ''}`}
                        onClick={() => handleSortChange('recruiter-desc')}
                      >
                        <i className="ri-team-line me-2 align-middle inline-block"></i>Recruiter (Z-A)
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${selectedSort === 'status-asc' ? 'active' : ''}`}
                        onClick={() => handleSortChange('status-asc')}
                      >
                        <i className="ri-file-check-line me-2 align-middle inline-block"></i>Offer Status (A-Z)
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${selectedSort === 'status-desc' ? 'active' : ''}`}
                        onClick={() => handleSortChange('status-desc')}
                      >
                        <i className="ri-file-check-line me-2 align-middle inline-block"></i>Offer Status (Z-A)
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
                  </ul>
                </div>
                <div className="relative me-2 w-[9.5rem] min-w-0 sm:w-40">
                  <i
                    className="ri-search-line pointer-events-none absolute left-2 top-1/2 z-[1] -translate-y-1/2 text-[0.75rem] text-slate-400"
                    aria-hidden
                  />
                  <input
                    type="search"
                    className="form-control !w-full !py-1 !ps-7 !pe-2 !text-[0.75rem]"
                    placeholder="Search…"
                    value={listSearch}
                    onChange={(e) => setListSearch(e.target.value)}
                    aria-label="Search this list"
                    autoComplete="off"
                  />
                </div>
                <button
                  type="button"
                  className="ti-btn ti-btn-light !mb-0 !w-auto !min-w-fit !py-1 !px-2 !text-[0.75rem] me-2"
                  data-hs-overlay="#offers-filter-panel"
                  aria-expanded="false"
                  aria-controls="offers-filter-panel"
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
                    className="ti-btn ti-btn-sm ti-btn-danger !mb-0 !w-auto !min-w-fit !h-8 !whitespace-nowrap !py-1.5 !px-3"
                    onClick={handleDeleteSelected}
                  >
                    <i className="ri-delete-bin-line me-1" aria-hidden />
                    Delete ({selectedRows.size})
                  </button>
                )}
              </div>
            </div>
            <div className="box-body !p-0 flex min-h-0 flex-1 flex-col overflow-hidden">
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
              ) : filteredData.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-6 py-16 text-center text-gray-500 dark:text-gray-400">
                  <i className="ri-file-paper-2-line mb-3 block text-4xl opacity-50" aria-hidden />
                  <p className="mb-1 text-base font-medium text-gray-700 dark:text-gray-200">No offers to show</p>
                  <p className="mb-0 max-w-md text-sm">
                    {offersData.length > 0
                      ? 'Try relaxing filters, or add offers from a job application.'
                      : 'Create an offer from an application in pipeline, or use Create Offer to start a letter.'}
                  </p>
                </div>
              ) : (
              <div
                className={`table-responsive flex-1 overflow-y-auto ${offersStyles.tableCard} ${offersStyles.tableWrap}`}
                style={{ minHeight: 0 }}
              >
                <table
                  {...getTableProps()}
                  className="table w-full min-w-full whitespace-nowrap text-[0.8125rem] text-defaulttextcolor dark:text-white/80"
                >
                  <thead>
                    {headerGroups.map((headerGroup: any, i: number) => (
                        <tr
                          {...headerGroup.getHeaderGroupProps()}
                          className="border-b border-slate-200/90 dark:border-white/10"
                          key={`header-group-${i}`}
                        >
                        {headerGroup.headers.map((column: any, i: number) => (
                          <th
                            {...column.getHeaderProps(column.getSortByToggleProps())}
                            scope="col"
                            className="sticky top-0 z-10 border-b border-slate-200/90 bg-slate-100/90 px-2 py-2 text-start align-bottom text-[0.625rem] font-semibold uppercase leading-tight tracking-tight text-slate-500 shadow-sm first:pl-2.5 last:pr-2.5 dark:border-white/10 dark:bg-slate-900/90 dark:text-slate-400 sm:px-2.5 sm:text-[0.65rem] sm:leading-snug"
                            key={column.id || `col-${i}`}
                            style={{ 
                              position: 'sticky', 
                              top: 0, 
                              zIndex: 10,
                              minWidth: offerColMinW[String(column.id)] ?? undefined,
                            }}
                          >
                            {column.id === 'select' ? (
                              <input
                                className="form-check-input accent-indigo-600"
                                type="checkbox"
                                checked={isAllSelected}
                                ref={(input) => {
                                  if (input) input.indeterminate = isIndeterminate
                                }}
                                onChange={handleSelectAll}
                                aria-label="Select all"
                              />
                            ) : (
                              <div className="tabletitle flex min-w-0 items-start gap-1">
                                <span className="min-w-0 break-words hyphens-auto">{column.render('Header')}</span>
                                <span className="shrink-0 pt-0.5">
                                {column.isSorted ? (
                                  column.isSortedDesc ? (
                                    <i className="ri-arrow-down-s-line text-sm opacity-80" aria-hidden />
                                  ) : (
                                    <i className="ri-arrow-up-s-line text-sm opacity-80" aria-hidden />
                                  )
                                ) : null}
                                </span>
                              </div>
                            )}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody {...getTableBodyProps()}>
                    {page.map((row: any, i: number) => {
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
                              className:
                                'whitespace-nowrap align-middle px-2.5 py-2 text-[12px] text-slate-800 sm:px-3 sm:py-2.5 sm:text-[13px] dark:text-slate-100',
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
              )}
            </div>
            <div className="box-footer border-t border-defaultborder/60 dark:border-white/5 !px-3 !py-2 sm:!px-4">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="text-xs text-gray-600 sm:text-sm dark:text-gray-400">
                  {filteredData.length === 0 ? (
                    <span>0 offers</span>
                  ) : (
                    <>
                      Showing {pageIndex * pageSize + 1} to {Math.min((pageIndex + 1) * pageSize, data.length)} of {data.length} entries{' '}
                      <i className="bi bi-arrow-right ms-2 font-semibold" aria-hidden />
                    </>
                  )}
                </div>
                {filteredData.length > 0 && (
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
                        // Show all pages if 7 or fewer
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
                        // Show smart pagination for more pages
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
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Panel Offcanvas */}
      <div id="offers-filter-panel" className="hs-overlay hidden ti-offcanvas ti-offcanvas-right !z-[105]" tabIndex={-1}>
        <div className="ti-offcanvas-header bg-gray-50 dark:bg-black/20 !py-2.5">
          <h6 className="ti-offcanvas-title flex items-center gap-2 text-base font-semibold">
            <i className="ri-filter-3-line text-primary text-base" aria-hidden />
            Filters
          </h6>
          <button 
            type="button" 
            className="ti-btn flex-shrink-0 p-0 transition-none text-gray-500 hover:text-gray-700 focus:ring-gray-400 focus:ring-offset-white dark:text-[#8c9097] dark:text-white/50 dark:hover:text-white/80 dark:focus:ring-white/10 dark:focus:ring-offset-white/10 hover:bg-gray-100 dark:hover:bg-black/40 rounded-md p-1" 
            onClick={handleResetFilters}
          >
            
                <i className="ri-refresh-line me-1.5"></i>Reset
           
          </button>
        </div>
        <div className="ti-offcanvas-body !p-4">
          <div className="space-y-5">
            {/* Candidate Filter */}
            <div className="pb-4 border-b border-gray-200 dark:border-defaultborder/10">
              <label className="form-label mb-2.5 block font-semibold text-sm text-gray-800 dark:text-white flex items-center gap-2">
                <i className="ri-user-line text-primary text-base"></i>
                Candidate
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400">({allCandidates.length})</span>
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  className="form-control !py-1.5 !text-sm mb-1.5"
                  placeholder="Search candidates..."
                  value={searchCandidate}
                  onChange={(e) => setSearchCandidate(e.target.value)}
                />
                <div className="max-h-40 overflow-y-auto rounded-lg bg-white dark:bg-black/20 p-2 shadow-sm">
                  <div className="space-y-1">
                    {filteredCandidates.length > 0 ? (
                      filteredCandidates.map((candidate) => (
                        <label
                          key={candidate}
                          className="flex items-center gap-2 cursor-pointer hover:bg-primary/5 dark:hover:bg-primary/10 p-1.5 rounded-md transition-colors"
                        >
                          <input
                            type="checkbox"
                            className="form-check-input !w-3.5 !h-3.5"
                            checked={filters.candidate.includes(candidate)}
                            onChange={() => handleMultiSelectChange('candidate', candidate)}
                          />
                          <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">{candidate}</span>
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
                    {filters.candidate.map((candidate) => (
                      <span
                        key={candidate}
                        className="badge bg-primary/10 text-primary border border-primary/30 px-2 py-1 rounded-full flex items-center gap-1.5 text-xs font-medium shadow-sm"
                      >
                        {candidate}
                        <button
                          type="button"
                          onClick={() => handleRemoveFilter('candidate', candidate)}
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
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400">({allRecruiters.length})</span>
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  className="form-control !py-1.5 !text-sm mb-1.5"
                  placeholder="Search recruiters..."
                  value={searchRecruiter}
                  onChange={(e) => setSearchRecruiter(e.target.value)}
                />
                <div className="max-h-40 overflow-y-auto rounded-lg bg-white dark:bg-black/20 p-2 shadow-sm">
                  <div className="space-y-1">
                    {filteredRecruiters.length > 0 ? (
                      filteredRecruiters.map((recruiter) => (
                        <label
                          key={recruiter}
                          className="flex items-center gap-2 cursor-pointer hover:bg-success/5 dark:hover:bg-success/10 p-1.5 rounded-md transition-colors"
                        >
                          <input
                            type="checkbox"
                            className="form-check-input !w-3.5 !h-3.5"
                            checked={filters.recruiter.includes(recruiter)}
                            onChange={() => handleMultiSelectChange('recruiter', recruiter)}
                          />
                          <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">{recruiter}</span>
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
                    {filters.recruiter.map((recruiter) => (
                      <span
                        key={recruiter}
                        className="badge bg-success/10 text-success border border-success/30 px-2 py-1 rounded-full flex items-center gap-1.5 text-xs font-medium shadow-sm"
                      >
                        {recruiter}
                        <button
                          type="button"
                          onClick={() => handleRemoveFilter('recruiter', recruiter)}
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
                  className="form-control !py-1.5 !text-sm mb-1.5"
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
                          className="flex items-center gap-2 cursor-pointer hover:bg-info/5 dark:hover:bg-info/10 p-1.5 rounded-md transition-colors"
                        >
                          <input
                            type="checkbox"
                            className="form-check-input !w-3.5 !h-3.5"
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
                  className="form-control !py-1.5 !text-sm mb-1.5"
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
                          className="flex items-center gap-2 cursor-pointer hover:bg-warning/5 dark:hover:bg-warning/10 p-1.5 rounded-md transition-colors"
                        >
                          <input
                            type="checkbox"
                            className="form-check-input !w-3.5 !h-3.5"
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
                data-hs-overlay="#offers-filter-panel"
              >
                <i className="ri-close-line me-1.5"></i>Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Offer Status Modal - !opacity-100 !pointer-events-auto so it shows when opened via React state */}
      {editOfferModal && (
        <div id="edit-offer-modal" className="hs-overlay ti-modal active overflow-y-auto !opacity-100 !pointer-events-auto [--auto-close:false]" tabIndex={-1} style={{ zIndex: 80 }}>
          <div className="hs-overlay-backdrop ti-modal-backdrop" onClick={() => setEditOfferModal(null)} />
          <div className="hs-overlay-open:mt-7 ti-modal-box ti-modal-sm">
            <div className="ti-modal-content">
              <div className="ti-modal-header">
                <h4 className="ti-modal-title">Update Offer Status – {editOfferModal.offerCode}</h4>
                <button type="button" className="ti-btn ti-btn-light ti-btn-sm !py-1 !px-2" onClick={() => setEditOfferModal(null)}>
                  <i className="ri-close-line"></i>
                </button>
              </div>
              <div className="ti-modal-body">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {editOfferModal.job?.title} – {editOfferModal.candidate?.fullName}
                </p>
                <div>
                  <label className="form-label">Status</label>
                  <select
                    className="form-control"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                  >
                    <option value="Draft">Draft</option>
                    <option value="Sent">Sent</option>
                    <option value="Under Negotiation">Under Negotiation</option>
                    <option value="Accepted">Accepted</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>
              <div className="ti-modal-footer">
                <button type="button" className="ti-btn ti-btn-light" onClick={() => setEditOfferModal(null)}>Cancel</button>
                <button type="button" className="ti-btn ti-btn-primary" onClick={handleUpdateStatus} disabled={editSubmitting}>
                  {editSubmitting ? <i className="ri-loader-4-line animate-spin"></i> : 'Update'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Offer letter generator (embedded UI — same layout as standalone tool; saves to this offer) */}
      {letterModalOffer && (
        <div
          className="offer-letter-fullscreen fixed inset-0 z-[1060] flex flex-col overflow-hidden bg-slate-100 dark:bg-slate-950 pointer-events-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Offer letter generator"
        >
          <OfferLetterGeneratorWorkspace
            offerCode={letterModalOffer.offerCode || '—'}
            jobTitle={letterModalOffer.job?.title || ''}
            candidateName={letterModalOffer.candidate?.fullName || ''}
            letterForm={letterForm}
            setLetterForm={setLetterForm}
            letterBusy={letterBusy}
            lastGeneratedLabel={
              letterModalOffer.offerLetterGeneratedAt
                ? new Date(letterModalOffer.offerLetterGeneratedAt).toLocaleString()
                : null
            }
            hasPdf={Boolean(letterModalOffer.offerLetterKey)}
            onClose={() => setLetterModalOffer(null)}
            onGeneratePdf={() => void handleGenerateOfferLetter()}
            onDownload={() => void handleDownloadOfferLetter()}
          />
        </div>
      )}

      {/* View Offer Modal */}
      {viewOfferModal && (
        <div className="hs-overlay ti-modal active overflow-y-auto !opacity-100 !pointer-events-auto [--auto-close:false]" tabIndex={-1} style={{ zIndex: 80 }}>
          <div className="hs-overlay-backdrop ti-modal-backdrop" onClick={() => setViewOfferModal(null)} />
          <div className="hs-overlay-open:mt-7 ti-modal-box ti-modal-sm ti-modal-lg">
            <div className="ti-modal-content">
              <div className="ti-modal-header">
                <h4 className="ti-modal-title">{viewOfferModal.offerCode}</h4>
                <button type="button" className="ti-btn ti-btn-light ti-btn-sm !py-1 !px-2" onClick={() => setViewOfferModal(null)}>
                  <i className="ri-close-line"></i>
                </button>
              </div>
              <div className="ti-modal-body space-y-4 text-sm">
                <div>
                  <h5 className="font-semibold text-gray-800 dark:text-white mb-2">Offer &amp; Job</h5>
                  <p><strong>Position:</strong> {viewOfferModal.job?.title}</p>
                  <p><strong>Candidate:</strong> {viewOfferModal.candidate?.fullName}</p>
                  <p><strong>Status:</strong> {viewOfferModal.status}</p>
                  {viewOfferModal.ctcBreakdown?.gross && (
                    <p><strong>CTC:</strong> ₹{viewOfferModal.ctcBreakdown.gross.toLocaleString()}</p>
                  )}
                  {viewOfferModal.joiningDate && (
                    <p><strong>Joining:</strong> {new Date(viewOfferModal.joiningDate).toLocaleDateString()}</p>
                  )}
                </div>
                {viewOfferModal.status === 'Accepted' && (
                  <>
                    <div>
                      <h5 className="font-semibold text-gray-800 dark:text-white mb-2">HRMS (Onboarding)</h5>
                      <p><strong>Reporting Manager:</strong> {typeof (viewOfferModal.candidate as any)?.reportingManager === 'object' ? (viewOfferModal.candidate as any)?.reportingManager?.name : (viewOfferModal.candidate as any)?.reportingManager || '-'}</p>
                    </div>
                    {(viewOfferModal as any).placement && (
                      <div>
                        <h5 className="font-semibold text-gray-800 dark:text-white mb-2">Pre-boarding &amp; Placement</h5>
                        <p>
                          <strong>Placement status:</strong> {(viewOfferModal as any).placementStatus || (viewOfferModal as any).placement?.status || '-'}
                        </p>
                        <p><strong>Pre-boarding Status:</strong> {(viewOfferModal as any).placement?.preBoardingStatus || '-'}</p>
                        {(() => {
                          const { primary, secondary } = getPlacementStatusActorSummary({
                            status: (viewOfferModal as any).placementStatus || (viewOfferModal as any).placement?.status,
                            ...(viewOfferModal as any).placement,
                          })
                          return (
                            <>
                              {primary ? (
                                <p className="mb-0 text-slate-600 dark:text-slate-300">
                                  <strong>Record:</strong> {primary}
                                </p>
                              ) : null}
                              {secondary ? (
                                <p className="mb-0 text-slate-500 dark:text-slate-400 text-xs">
                                  {secondary}
                                </p>
                              ) : null}
                            </>
                          )
                        })()}
                        {(viewOfferModal as any).placement?.backgroundVerification && (
                          <p><strong>BGV:</strong> {(viewOfferModal as any).placement.backgroundVerification?.status || '-'}</p>
                        )}
                        {Array.isArray((viewOfferModal as any).placement?.assetAllocation) && (viewOfferModal as any).placement.assetAllocation.length > 0 && (
                          <p><strong>Assets:</strong> {(viewOfferModal as any).placement.assetAllocation.map((a: any) => a.name || a.type).join(', ') || '-'}</p>
                        )}
                        {Array.isArray((viewOfferModal as any).placement?.itAccess) && (viewOfferModal as any).placement.itAccess.length > 0 && (
                          <p><strong>IT Access:</strong> {(viewOfferModal as any).placement.itAccess.map((i: any) => i.system).join(', ') || '-'}</p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View History Modal */}
      {viewHistoryModal && (
        <div className="hs-overlay ti-modal active overflow-y-auto !opacity-100 !pointer-events-auto [--auto-close:false]" tabIndex={-1} style={{ zIndex: 80 }}>
          <div className="hs-overlay-backdrop ti-modal-backdrop" onClick={() => setViewHistoryModal(null)} />
          <div className="hs-overlay-open:mt-7 ti-modal-box ti-modal-sm">
            <div className="ti-modal-content">
              <div className="ti-modal-header">
                <h4 className="ti-modal-title">Offer History – {viewHistoryModal.offerCode}</h4>
                <button type="button" className="ti-btn ti-btn-light ti-btn-sm !py-1 !px-2" onClick={() => setViewHistoryModal(null)}>
                  <i className="ri-close-line"></i>
                </button>
              </div>
              <div className="ti-modal-body text-sm">
                <p className="text-gray-600 dark:text-gray-400">Current status: <strong>{viewHistoryModal.status}</strong></p>
                <p className="text-xs text-gray-500 mt-2">Detailed status history is not available.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  )
}

export default OffersPlacement
