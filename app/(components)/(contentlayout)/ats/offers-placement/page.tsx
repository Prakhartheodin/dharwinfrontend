"use client"
import Pageheader from '@/shared/layout-components/page-header/pageheader'
import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment, useMemo, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useTable, useSortBy, useGlobalFilter, usePagination } from 'react-table'
import Link from 'next/link'
import { useFeaturePermissions } from '@/shared/hooks/use-feature-permissions'
import { listOffers, createOffer, updateOffer, deleteOffer } from '@/shared/lib/api/offers'
import type { Offer } from '@/shared/lib/api/offers'

// Map API offer to table row format (handle both _id and id from API)
// Includes pre-boarding/onboarding data: placement, candidate HRMS (department, designation)
const mapOfferToRow = (o: Offer) => {
  const placement = (o as Offer & { placement?: { preBoardingStatus?: string; backgroundVerification?: { status?: string }; assetAllocation?: unknown[]; itAccess?: unknown[] } }).placement
  const cand = o.candidate as { department?: string; designation?: string } | undefined
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
    department: cand?.department || null,
    designation: cand?.designation || null,
    preBoardingStatus: placement?.preBoardingStatus || null,
    bgvStatus: placement?.backgroundVerification?.status || null,
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

  // Refetch when returning from Create Offer (has ?refresh= param)
  useEffect(() => {
    const refresh = searchParams?.get('refresh')
    if (refresh) {
      setOffersLoading(true)
      listOffers({ limit: 500 })
        .then((res) => setOffersData(res.results ?? []))
        .catch(() => {})
        .finally(() => {
          setOffersLoading(false)
          router.replace('/ats/offers-placement')
        })
    }
  }, [searchParams])

  // Re-init Preline so Sort, Excel dropdowns and Search overlay work (content mounts after layout autoInit)
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

  const tableDataFromApi = useMemo(() => offersData.map(mapOfferToRow), [offersData])
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

  const [editOfferModal, setEditOfferModal] = useState<Offer | null>(null)
  const [editStatus, setEditStatus] = useState('')
  const [viewOfferModal, setViewOfferModal] = useState<Offer | null>(null)
  const [viewHistoryModal, setViewHistoryModal] = useState<Offer | null>(null)
  const [editSubmitting, setEditSubmitting] = useState(false)

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
            className="form-check-input"
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
            <div className="flex flex-col gap-1">
              <div className="font-semibold text-gray-800 dark:text-white">
                {offer.position}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                <i className="ri-file-text-line text-primary"></i>
                {offer.offerId}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <i className="ri-calendar-line text-primary"></i>
                  {new Date(offer.offerDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  <i className="ri-file-paper-2-line text-success"></i>
                  {offer.templateType}
                </span>
                {offer.version > 1 && (
                  <span className="badge bg-warning/10 text-warning border border-warning/30 px-1.5 py-0.5 rounded text-[0.65rem] font-medium">
                    v{offer.version}
                  </span>
                )}
              </div>
            </div>
          )
        },
      },
      {
        Header: 'Candidate',
        accessor: 'candidate',
        Cell: ({ row }: any) => {
          const candidate = row.original.candidate
          return (
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <img
                  src={candidate.displayPicture || '/assets/images/faces/1.jpg'}
                  alt={candidate.name}
                  className="w-10 h-10 rounded-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/assets/images/faces/1.jpg'
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-800 dark:text-white truncate">
                  {candidate.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  <div className="flex items-center gap-1">
                    <i className="ri-mail-line"></i>
                    {candidate.email}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <i className="ri-phone-line"></i>
                    {candidate.phone}
                  </div>
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
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <img
                  src={recruiter.displayPicture || '/assets/images/faces/1.jpg'}
                  alt={recruiter.name}
                  className="w-10 h-10 rounded-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/assets/images/faces/1.jpg'
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-800 dark:text-white truncate">
                  {recruiter.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  <div className="flex items-center gap-1">
                    <i className="ri-mail-line"></i>
                    {recruiter.email}
                  </div>
                </div>
              </div>
            </div>
          )
        },
      },
      {
        Header: 'Department',
        accessor: 'department',
        Cell: ({ row }: any) => {
          const dept = row.original.department
          return (
            <span className="text-sm text-gray-700 dark:text-gray-300">{dept || '-'}</span>
          )
        },
      },
      {
        Header: 'Designation',
        accessor: 'designation',
        Cell: ({ row }: any) => {
          const des = row.original.designation
          return (
            <span className="text-sm text-gray-700 dark:text-gray-300">{des || '-'}</span>
          )
        },
      },
      {
        Header: 'Pre-boarding',
        accessor: 'preBoardingStatus',
        Cell: ({ row }: any) => {
          const offer = row.original
          if (offer.offerStatus !== 'Accepted' || offer.placementStatus !== 'Pending') return <span className="text-gray-400">-</span>
          const status = offer.preBoardingStatus || 'Not Started'
          const colors: Record<string, string> = {
            'Not Started': 'bg-gray/10 text-gray border-gray/30',
            'In Progress': 'bg-info/10 text-info border-info/30',
            'Completed': 'bg-success/10 text-success border-success/30',
          }
          return (
            <span className={`badge ${colors[status] || 'bg-gray/10 text-gray'} border px-2 py-1 rounded-md text-xs font-medium`}>
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
          if (offer.offerStatus !== 'Accepted') return <span className="text-gray-400">-</span>
          const status = offer.bgvStatus || 'Pending'
          const colors: Record<string, string> = {
            'Pending': 'bg-warning/10 text-warning border-warning/30',
            'In Progress': 'bg-info/10 text-info border-info/30',
            'Completed': 'bg-success/10 text-success border-success/30',
            'Verified': 'bg-success/10 text-success border-success/30',
            'Failed': 'bg-danger/10 text-danger border-danger/30',
          }
          return (
            <span className={`badge ${colors[status] || 'bg-gray/10 text-gray'} border px-2 py-1 rounded-md text-xs font-medium`}>
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
          if (offer.offerStatus !== 'Accepted') return <span className="text-gray-400">-</span>
          const assets = offer.assetCount ?? 0
          const it = offer.itAccessCount ?? 0
          return (
            <span className="text-sm text-gray-700 dark:text-gray-300">{assets} / {it}</span>
          )
        },
      },
      {
        Header: 'Offer Status',
        accessor: 'offerStatus',
        Cell: ({ row }: any) => {
          const offer = row.original
          const statusColors: Record<string, string> = {
            'Accepted': 'bg-success/10 text-success border-success/30',
            'Pending': 'bg-warning/10 text-warning border-warning/30',
            'Under Negotiation': 'bg-info/10 text-info border-info/30',
            'Rejected': 'bg-danger/10 text-danger border-danger/30',
            'Withdrawn': 'bg-secondary/10 text-secondary border-secondary/30',
          }
          return (
            <div className="text-sm">
              <span className={`badge ${statusColors[offer.offerStatus] || 'bg-gray/10 text-gray border-gray/30'} border px-2 py-1 rounded-md text-xs font-medium`}>
                {offer.offerStatus}
              </span>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                <i className={`ri-${offer.signedStatus === 'Signed' ? 'check' : offer.signedStatus === 'Pending' ? 'time' : 'close'}-line`}></i>
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
          if (offer.offerStatus !== 'Accepted') return null
          if (offer.placementStatus === 'Pending') {
            return (
              <span className="badge bg-warning/10 text-warning border border-warning/30 px-2 py-1 rounded-md text-xs font-medium">
                Pre-boarding
              </span>
            )
          }
          if (offer.placementStatus === 'Joined') {
            return (
              <span className="badge bg-success/10 text-success border border-success/30 px-2 py-1 rounded-md text-xs font-medium">
                Onboarding
              </span>
            )
          }
          return null
        },
      },
      {
        Header: 'Joining Date',
        accessor: 'joiningDate',
        Cell: ({ row }: any) => {
          const offer = row.original
          return (
            <div className="text-sm">
              {offer.joiningDate ? (
                <div className="flex items-center gap-1 text-gray-800 dark:text-white">
                  <i className="ri-calendar-check-line text-success"></i>
                  {new Date(offer.joiningDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              ) : (
                <span className="text-xs text-gray-400 dark:text-gray-500">Not set</span>
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
          const inPreBoarding = isAccepted && offer.placementStatus === 'Pending'
          const inOnboarding = isAccepted && offer.placementStatus === 'Joined'
          return (
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            {inPreBoarding && (
              <Link
                href="/ats/pre-boarding"
                className="ti-btn ti-btn-sm ti-btn-success shrink-0 whitespace-nowrap !w-auto !min-w-fit !h-8 !py-1.5 !px-3"
                title="Go to Pre-boarding"
              >
                <i className="ri-user-follow-line me-1"></i>Pre-boarding
              </Link>
            )}
            {inOnboarding && (
              <Link
                href="/ats/onboarding"
                className="ti-btn ti-btn-sm ti-btn-primary shrink-0 whitespace-nowrap !w-auto !min-w-fit !h-8 !py-1.5 !px-3"
                title="Go to Onboarding"
              >
                <i className="ri-login-circle-line me-1"></i>Onboarding
              </Link>
            )}
            <div className="hs-tooltip ti-main-tooltip shrink-0">
              <button
                type="button"
                className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-primary"
                title="View Offer"
                onClick={() => {
                  const raw = (row.original as any)._raw
                  if (raw) setViewOfferModal(raw)
                }}
              >
                <i className="ri-file-text-line"></i>
                <span
                  className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700"
                  role="tooltip">
                  View Offer
                </span>
              </button>
            </div>
            <div className="hs-tooltip ti-main-tooltip shrink-0">
              <button
                type="button"
                className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-info"
                title="View History"
                onClick={() => {
                  const raw = (row.original as any)._raw
                  if (raw) setViewHistoryModal(raw)
                }}
              >
                <i className="ri-history-line"></i>
                <span
                  className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700"
                  role="tooltip">
                  View History
                </span>
              </button>
            </div>
            <div className="hs-tooltip ti-main-tooltip shrink-0">
              <button
                type="button"
                className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-success"
                title="Edit Offer"
                onClick={() => {
                  const raw = (row.original as any)._raw
                  if (raw) {
                    setEditOfferModal(raw)
                    setEditStatus(raw.status)
                  }
                }}
              >
                <i className="ri-pencil-line"></i>
                <span
                  className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700"
                  role="tooltip">
                  Edit Offer
                </span>
              </button>
            </div>
          </div>
        )
        },
      },
    ],
    [selectedRows]
  )

  // Filter data based on filter state
  const filteredData = useMemo(() => {
    return OFFERS_PLACEMENT_DATA.filter((offer) => {
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
          ? (offer.placementStatus === 'Pending' ? 'Pre-boarding' : offer.placementStatus === 'Joined' ? 'Onboarding' : null)
          : null
        if (!step || !filters.step.includes(step)) return false
      }
      
      return true
    })
  }, [filters, OFFERS_PLACEMENT_DATA])

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
        if (offer.placementStatus === 'Pending') steps.add('Pre-boarding')
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
  }

  const hasActiveFilters = 
    filters.candidate.length > 0 ||
    filters.recruiter.length > 0 ||
    filters.offerStatus.length > 0 ||
    filters.step.length > 0

  const activeFilterCount = 
    filters.candidate.length +
    filters.recruiter.length +
    filters.offerStatus.length +
    filters.step.length

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

  return (
    <Fragment>
  
      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-8rem)]">
        <div className="xl:col-span-12 col-span-12 h-full flex flex-col">
          <div className="box custom-box h-full flex flex-col">
            <div className="box-header flex items-center justify-between flex-wrap gap-4">
              <div className="box-title">
                Offers & Placement
                <span className="badge bg-light text-default rounded-full ms-1 text-[0.75rem] align-middle">
                  {filteredData.length}
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
                <div className="hs-dropdown ti-dropdown me-2">
                  <button
                    type="button"
                    className="ti-btn ti-btn-light !py-1 !px-2 !text-[0.75rem] hs-dropdown-toggle ti-dropdown-toggle"
                    id="sort-dropdown-button"
                    aria-expanded="false"
                  >
                    <i className="ri-arrow-up-down-line font-semibold align-middle me-1"></i>Sort
                    <i className="ri-arrow-down-s-line align-middle ms-1 inline-block"></i>
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
                {canCreate && (
                  <Link
                    href="/ats/offers-placement/create"
                    className="ti-btn ti-btn-primary-full !py-1 !px-2 !text-[0.75rem] me-2"
                  >
                    <i className="ri-add-line font-semibold align-middle"></i>Create Offer
                  </Link>
                )}
                <div className="hs-dropdown ti-dropdown me-2">
                  <button
                    type="button"
                    className="ti-btn ti-btn-primary !py-1 !px-2 !text-[0.75rem] hs-dropdown-toggle ti-dropdown-toggle"
                    id="excel-dropdown-button"
                    aria-expanded="false"
                  >
                    <i className="ri-file-excel-2-line font-semibold align-middle me-1"></i>Excel
                    <i className="ri-arrow-down-s-line align-middle ms-1 inline-block"></i>
                  </button>
                  <ul className="hs-dropdown-menu ti-dropdown-menu hidden" aria-labelledby="excel-dropdown-button">
                    <li>
                      <button
                        type="button"
                        className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left"
                      >
                        <i className="ri-upload-2-line me-2 align-middle inline-block"></i>Import
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left"
                      >
                        <i className="ri-file-excel-2-line me-2 align-middle inline-block"></i>Export
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left"
                      >
                        <i className="ri-download-line me-2 align-middle inline-block"></i>Template
                      </button>
                    </li>
                  </ul>
                </div>
                <button
                  type="button"
                  className="ti-btn ti-btn-light !py-1 !px-2 !text-[0.75rem] me-2"
                  data-hs-overlay="#offers-filter-panel"
                >
                  <i className="ri-search-line font-semibold align-middle me-1"></i>Search
                  {hasActiveFilters && (
                    <span className="badge bg-primary text-white rounded-full ms-1 text-[0.65rem]">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              
                {canDelete && selectedRows.size > 0 && (
                  <button
                    type="button"
                    className="ti-btn ti-btn-danger !py-1 !px-2 !text-[0.75rem]"
                    onClick={handleDeleteSelected}
                  >
                    <i className="ri-delete-bin-line font-semibold align-middle me-1"></i>Delete ({selectedRows.size})
                  </button>
                )}
              </div>
            </div>
            <div className="box-body !p-0 flex-1 flex flex-col overflow-hidden">
              {offersLoading ? (
                <div className="flex items-center justify-center p-12">
                  <i className="ri-loader-4-line animate-spin text-3xl text-primary"></i>
                </div>
              ) : (
              <div className="table-responsive flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
                <table {...getTableProps()} className="table whitespace-nowrap min-w-full table-striped table-hover table-bordered border-gray-300 dark:border-gray-600">
                  <thead>
                    {headerGroups.map((headerGroup: any) => (
                      <tr {...headerGroup.getHeaderGroupProps()} className="bg-primary/10 dark:bg-primary/20 border-b border-gray-300 dark:border-gray-600" key={Math.random()}>
                        {headerGroup.headers.map((column: any) => (
                          <th
                            {...column.getHeaderProps(column.getSortByToggleProps())}
                            scope="col"
                            className="text-start sticky top-0 z-10 bg-gray-50 dark:bg-black/20"
                            key={Math.random()}
                            style={{ 
                              position: 'sticky', 
                              top: 0, 
                              zIndex: 10
                            }}
                          >
                            {column.id === 'select' ? (
                              <input
                                className="form-check-input"
                                type="checkbox"
                                checked={isAllSelected}
                                ref={(input) => {
                                  if (input) input.indeterminate = isIndeterminate
                                }}
                                onChange={handleSelectAll}
                                aria-label="Select all"
                              />
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="tabletitle">{column.render('Header')}</span>
                              <span>
                                {column.isSorted ? (
                                  column.isSortedDesc ? (
                                    <i className="ri-arrow-down-s-line text-[0.875rem]"></i>
                                  ) : (
                                    <i className="ri-arrow-up-s-line text-[0.875rem]"></i>
                                  )
                                ) : (
                                  ''
                                )}
                              </span>
                              </div>
                            )}
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
                          {row.cells.map((cell: any) => {
                            return (
                              <td {...cell.getCellProps()} key={Math.random()}>
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
            <div className="box-footer !border-t-0">
              <div className="flex items-center flex-wrap gap-4">
                <div>
                  Showing {pageIndex * pageSize + 1} to {Math.min((pageIndex + 1) * pageSize, data.length)} of {data.length} entries{' '}
                  <i className="bi bi-arrow-right ms-2 font-semibold"></i>
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
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Panel Offcanvas */}
      <div id="offers-filter-panel" className="hs-overlay hidden ti-offcanvas ti-offcanvas-right !z-[105]" tabIndex={-1}>
        <div className="ti-offcanvas-header bg-gray-50 dark:bg-black/20 !py-2.5">
          <h6 className="ti-offcanvas-title text-base font-semibold flex items-center gap-2">
            <i className="ri-search-line text-primary text-base"></i>
            Search Offers & Placement
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
                      <p><strong>Department:</strong> {(viewOfferModal.candidate as any)?.department || '-'}</p>
                      <p><strong>Designation:</strong> {(viewOfferModal.candidate as any)?.designation || '-'}</p>
                      <p><strong>Reporting Manager:</strong> {typeof (viewOfferModal.candidate as any)?.reportingManager === 'object' ? (viewOfferModal.candidate as any)?.reportingManager?.name : (viewOfferModal.candidate as any)?.reportingManager || '-'}</p>
                    </div>
                    {(viewOfferModal as any).placement && (
                      <div>
                        <h5 className="font-semibold text-gray-800 dark:text-white mb-2">Pre-boarding &amp; Placement</h5>
                        <p><strong>Pre-boarding Status:</strong> {(viewOfferModal as any).placement?.preBoardingStatus || '-'}</p>
                        {(viewOfferModal as any).placement?.backgroundVerification && (
                          <p><strong>BGV:</strong> {(viewOfferModal as any).placement.backgroundVerification?.status || '-'} {(viewOfferModal as any).placement.backgroundVerification?.agency ? `(${(viewOfferModal as any).placement.backgroundVerification.agency})` : ''}</p>
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
