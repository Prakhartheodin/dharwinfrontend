"use client"
import Pageheader from '@/shared/layout-components/page-header/pageheader'
import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment, useMemo, useState, useEffect, useCallback } from 'react'
import { useTable, useSortBy, useGlobalFilter, usePagination } from 'react-table'
import { createMeeting, type Meeting, type CreateMeetingPayload } from '@/shared/lib/api/meetings'

// Mock data for interviews
const INTERVIEWS_DATA = [
  {
    id: '1',
    position: 'Senior Software Engineer',
    date: '2024-01-15',
    time: '10:00 AM',
    type: 'Video',
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
    status: 'Scheduled',
  },
  {
    id: '2',
    position: 'Product Manager',
    date: '2024-01-16',
    time: '2:00 PM',
    type: 'In-Person',
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
    status: 'Completed',
  },
  {
    id: '3',
    position: 'Frontend Developer',
    date: '2024-01-17',
    time: '11:30 AM',
    type: 'Phone',
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
    status: 'Scheduled',
  },
  {
    id: '4',
    position: 'Data Scientist',
    date: '2024-01-18',
    time: '3:00 PM',
    type: 'Video',
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
    status: 'Rescheduled',
  },
  {
    id: '5',
    position: 'DevOps Engineer',
    date: '2024-01-19',
    time: '9:00 AM',
    type: 'In-Person',
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
    status: 'Cancelled',
  },
  {
    id: '6',
    position: 'UX Designer',
    date: '2024-01-20',
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
  status: string[]
  type: string[]
}

const Interviews = () => {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [selectedSort, setSelectedSort] = useState<string>('')
  
  const [filters, setFilters] = useState<FilterState>({
    candidate: [],
    recruiter: [],
    status: [],
    type: []
  })

  // Search states for filter dropdowns
  const [searchCandidate, setSearchCandidate] = useState('')
  const [searchRecruiter, setSearchRecruiter] = useState('')
  const [searchStatus, setSearchStatus] = useState('')
  const [searchType, setSearchType] = useState('')

  // Schedule Interview modal: success view & form state
  const [createdMeeting, setCreatedMeeting] = useState<Meeting | null>(null)
  const [hosts, setHosts] = useState<{ nameOrRole: string; email: string }[]>([{ nameOrRole: '', email: '' }])
  const [emailInvites, setEmailInvites] = useState<string[]>([''])
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

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

  const resetCreateMeetingForm = useCallback(() => {
    setCreatedMeeting(null)
    setFormError(null)
    setHosts([{ nameOrRole: '', email: '' }])
    setEmailInvites([''])
  }, [])

  const handleScheduleInterviewSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    const form = e.target as HTMLFormElement
    const getVal = (id: string) => (form.querySelector(`#${id}`) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement)?.value?.trim() ?? ''
    const title = getVal('schedule-meeting-title') || getVal('schedule-job') || 'Interview'
    const description = getVal('schedule-description')
    const date = getVal('schedule-date')
    const time = getVal('schedule-time')
    const durationMinutes = parseInt(getVal('schedule-duration') || '60', 10) || 60
    const maxParticipants = parseInt(getVal('schedule-max-participants') || '10', 10) || 10
    const allowGuestJoin = (form.querySelector('#schedule-allow-guest') as HTMLInputElement)?.checked ?? true
    const requireApproval = (form.querySelector('#schedule-require-approval') as HTMLInputElement)?.checked ?? false
    const jobPosition = getVal('schedule-job')
    const interviewType = (form.querySelector('input[name="schedule-type"]:checked') as HTMLInputElement)?.value || 'Video'
    const notes = getVal('schedule-notes')
    const candidateSelect = form.querySelector('#schedule-candidate') as HTMLSelectElement
    const candidateOption = candidateSelect?.selectedOptions?.[0]
    const candidateText = candidateOption?.text?.trim() ?? ''
    const candidateMatch = candidateText.match(/^(.+?)\s*-\s*(.+)$/)
    const recruiterSelect = form.querySelector('#schedule-recruiter') as HTMLSelectElement
    const recruiterOption = recruiterSelect?.selectedOptions?.[0]
    const recruiterText = recruiterOption?.text?.trim() ?? ''
    const recruiterMatch = recruiterText.match(/^(.+?)\s*-\s*(.+)$/)
    const scheduledAt = date && time ? `${date}T${time}:00.000Z` : new Date().toISOString()
    const payload: CreateMeetingPayload = {
      title,
      description: description || undefined,
      scheduledAt,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Calcutta',
      durationMinutes,
      maxParticipants,
      allowGuestJoin,
      requireApproval,
      hosts: hosts.filter((h) => h.email.trim()),
      emailInvites: emailInvites.filter((em) => em.trim()),
      jobPosition: jobPosition || undefined,
      interviewType: interviewType === 'video' ? 'Video' : interviewType === 'in-person' ? 'In-Person' : 'Phone',
      candidate: candidateOption?.value ? { id: candidateOption.value, name: candidateMatch?.[1] ?? candidateText, email: candidateMatch?.[2] ?? '' } : undefined,
      recruiter: recruiterOption?.value ? { id: recruiterOption.value, name: recruiterMatch?.[1] ?? recruiterText, email: recruiterMatch?.[2] ?? '' } : undefined,
      notes: notes || undefined,
    }
    setFormLoading(true)
    try {
      const meeting = await createMeeting(payload)
      setCreatedMeeting(meeting)
    } catch (err: any) {
      setFormError(err?.response?.data?.message || err?.message || 'Failed to create meeting')
    } finally {
      setFormLoading(false)
    }
  }, [hosts, emailInvites])

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
            aria-label={`Select interview ${row.original.id}`}
          />
        ),
      },
      {
        Header: 'Interview Info',
        accessor: 'interviewInfo',
        Cell: ({ row }: any) => {
          const interview = row.original
          return (
            <div className="flex flex-col gap-1">
              <div className="font-semibold text-gray-800 dark:text-white">
                {interview.position}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <i className="ri-calendar-line text-primary"></i>
                  {new Date(interview.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <span className="flex items-center gap-1">
                  <i className="ri-time-line text-info"></i>
                  {interview.time}
                </span>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                <i className="ri-vidicon-line text-success"></i>
                {interview.type}
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
        Header: 'Status',
        accessor: 'status',
        Cell: ({ row }: any) => {
          const interview = row.original
          const statusColors: Record<string, string> = {
            'Scheduled': 'bg-primary/10 text-primary border-primary/30',
            'Completed': 'bg-success/10 text-success border-success/30',
            'Cancelled': 'bg-danger/10 text-danger border-danger/30',
            'Rescheduled': 'bg-warning/10 text-warning border-warning/30',
          }
          return (
            <div className="text-sm">
              <span className={`badge ${statusColors[interview.status] || 'bg-gray/10 text-gray border-gray/30'} border px-2 py-1 rounded-md text-xs font-medium`}>
                {interview.status}
              </span>
            </div>
          )
        },
      },
      {
        Header: 'Actions',
        accessor: 'id',
        disableSortBy: true,
        Cell: ({ row }: any) => (
          <div className="flex items-center gap-2">
            <div className="hs-tooltip ti-main-tooltip">
              <button
                type="button"
                className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-info"
                title="Edit Interview"
              >
                <i className="ri-pencil-line"></i>
                <span
                  className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700"
                  role="tooltip">
                  Edit Interview
                </span>
              </button>
            </div>
            <div className="hs-tooltip ti-main-tooltip">
              <button
                type="button"
                className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-warning"
                title="Reschedule"
              >
                <i className="ri-calendar-event-line"></i>
                <span
                  className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700"
                  role="tooltip">
                  Reschedule
                </span>
              </button>
            </div>
            <div className="hs-tooltip ti-main-tooltip">
              <button
                type="button"
                className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-danger"
                title="Cancel Interview"
              >
                <i className="ri-close-circle-line"></i>
                <span
                  className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700"
                  role="tooltip">
                  Cancel Interview
                </span>
              </button>
            </div>
          </div>
        ),
      },
    ],
    [selectedRows]
  )

  // Filter data based on filter state
  const filteredData = useMemo(() => {
    return INTERVIEWS_DATA.filter((interview) => {
      // Candidate filter (array)
      if (filters.candidate.length > 0 && !filters.candidate.some(candidateName => 
        interview.candidate.name.toLowerCase().includes(candidateName.toLowerCase())
      )) {
        return false
      }
      
      // Recruiter filter (array)
      if (filters.recruiter.length > 0 && !filters.recruiter.some(recruiterName => 
        interview.recruiter.name.toLowerCase().includes(recruiterName.toLowerCase())
      )) {
        return false
      }
      
      // Status filter (array)
      if (filters.status.length > 0 && !filters.status.includes(interview.status)) {
        return false
      }
      
      // Type filter (array)
      if (filters.type.length > 0 && !filters.type.includes(interview.type)) {
        return false
      }
      
      return true
    })
  }, [filters])

  const data = useMemo(() => filteredData, [filteredData])

  // Get unique values for dropdown filters
  const allCandidates = useMemo(() => {
    return [...new Set(INTERVIEWS_DATA.map(interview => interview.candidate.name))].sort()
  }, [])

  const allRecruiters = useMemo(() => {
    return [...new Set(INTERVIEWS_DATA.map(interview => interview.recruiter.name))].sort()
  }, [])

  const allStatuses = useMemo(() => {
    return [...new Set(INTERVIEWS_DATA.map(interview => interview.status))].sort()
  }, [])

  const allTypes = useMemo(() => {
    return [...new Set(INTERVIEWS_DATA.map(interview => interview.type))].sort()
  }, [])

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

  const filteredStatuses = useMemo(() => {
    if (!searchStatus) return allStatuses
    return allStatuses.filter(status => 
      status.toLowerCase().includes(searchStatus.toLowerCase())
    )
  }, [allStatuses, searchStatus])

  const filteredTypes = useMemo(() => {
    if (!searchType) return allTypes
    return allTypes.filter(type => 
      type.toLowerCase().includes(searchType.toLowerCase())
    )
  }, [allTypes, searchType])

  const handleMultiSelectChange = (key: 'candidate' | 'recruiter' | 'status' | 'type', value: string) => {
    setFilters(prev => {
      const currentArray = prev[key]
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value]
      return { ...prev, [key]: newArray }
    })
  }

  const handleRemoveFilter = (key: 'candidate' | 'recruiter' | 'status' | 'type', value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].filter(item => item !== value)
    }))
  }

  const handleResetFilters = () => {
    setFilters({
      candidate: [],
      recruiter: [],
      status: [],
      type: []
    })
    setSearchCandidate('')
    setSearchRecruiter('')
    setSearchStatus('')
    setSearchType('')
  }

  const hasActiveFilters = 
    filters.candidate.length > 0 ||
    filters.recruiter.length > 0 ||
    filters.status.length > 0 ||
    filters.type.length > 0

  const activeFilterCount = 
    filters.candidate.length +
    filters.recruiter.length +
    filters.status.length +
    filters.type.length

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
        setSortBy([{ id: 'interviewInfo', desc: false }])
        break
      case 'date-desc':
        setSortBy([{ id: 'interviewInfo', desc: true }])
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
        setSortBy([{ id: 'status', desc: false }])
        break
      case 'status-desc':
        setSortBy([{ id: 'status', desc: true }])
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
      const allIds = new Set(filteredData.map((interview) => interview.id))
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
                Interviews
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
                    className="ti-btn ti-btn-light !py-1 !px-2 !text-[0.75rem] ti-dropdown-toggle"
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
                        <i className="ri-calendar-line me-2 align-middle inline-block"></i>Date (Oldest First)
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${selectedSort === 'date-desc' ? 'active' : ''}`}
                        onClick={() => handleSortChange('date-desc')}
                      >
                        <i className="ri-calendar-line me-2 align-middle inline-block"></i>Date (Newest First)
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
                        <i className="ri-checkbox-circle-line me-2 align-middle inline-block"></i>Status (A-Z)
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${selectedSort === 'status-desc' ? 'active' : ''}`}
                        onClick={() => handleSortChange('status-desc')}
                      >
                        <i className="ri-checkbox-circle-line me-2 align-middle inline-block"></i>Status (Z-A)
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
                <button
                  type="button"
                  className="hs-dropdown-toggle ti-btn ti-btn-primary-full !py-1 !px-2 !text-[0.75rem] me-2"
                  data-hs-overlay="#create-interview-modal"
                >
                  <i className="ri-add-line font-semibold align-middle"></i>Schedule Interview
                </button>
                <div className="hs-dropdown ti-dropdown me-2">
                  <button
                    type="button"
                    className="ti-btn ti-btn-primary !py-1 !px-2 !text-[0.75rem] ti-dropdown-toggle"
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
                  data-hs-overlay="#interviews-filter-panel"
                >
                  <i className="ri-search-line font-semibold align-middle me-1"></i>Search
                  {hasActiveFilters && (
                    <span className="badge bg-primary text-white rounded-full ms-1 text-[0.65rem]">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              
                <button
                  type="button"
                  className="ti-btn ti-btn-danger !py-1 !px-2 !text-[0.75rem]"
                >
                  <i className="ri-delete-bin-line font-semibold align-middle me-1"></i>Delete
                </button>
              </div>
            </div>
            <div className="box-body !p-0 flex-1 flex flex-col overflow-hidden">
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

      {/* Schedule Interview Modal */}
      <div id="create-interview-modal" className="hs-overlay hidden ti-modal size-lg !z-[105]" tabIndex={-1} aria-labelledby="create-interview-modal-label" aria-hidden="true">
        <div className="hs-overlay-open:mt-7 ti-modal-box mt-0 ease-out transition-all sm:max-w-2xl">
          <div className="ti-modal-content border border-defaultborder dark:border-defaultborder/10 rounded-xl shadow-xl overflow-hidden">
            <div className="ti-modal-header bg-gray-50 dark:bg-black/20 border-b border-defaultborder dark:border-defaultborder/10 px-6 py-4">
              <h3 id="create-interview-modal-label" className="ti-modal-title text-lg font-semibold text-defaulttextcolor dark:text-white flex items-center gap-2">
                <i className="ri-calendar-schedule-line text-primary text-xl"></i>
                {createdMeeting ? 'Meeting Created' : 'Schedule Interview'}
              </h3>
              <button
                type="button"
                className="ti-modal-close-btn hs-dropdown-toggle flex-shrink-0 p-0 transition-none text-gray-500 hover:text-gray-700 dark:text-[#8c9097] dark:hover:text-white/80 rounded-md hover:bg-gray-100 dark:hover:bg-black/40 focus:ring-2 focus:ring-primary/20 focus:ring-offset-0"
                data-hs-overlay="#create-interview-modal"
                onClick={resetCreateMeetingForm}
                aria-label="Close"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            {createdMeeting ? (
              <div className="ti-modal-body px-6 py-5">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-success/10 text-success mb-4">
                    <i className="ri-check-double-line text-2xl"></i>
                  </div>
                  <h4 className="text-lg font-semibold text-defaulttextcolor dark:text-white mb-1">Meeting Created Successfully!</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{createdMeeting.title}</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="form-label block text-xs font-medium text-defaulttextcolor dark:text-white mb-1">Meeting URL</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={createdMeeting.publicMeetingUrl || ''}
                        className="form-control !py-2 !text-sm flex-1 border-defaultborder dark:border-defaultborder/10 rounded-lg bg-gray-50 dark:bg-black/20"
                      />
                      <button
                        type="button"
                        className="ti-btn ti-btn-primary !py-2 !px-3 !text-sm"
                        onClick={() => {
                          const url = createdMeeting.publicMeetingUrl
                          if (url) {
                            navigator.clipboard.writeText(url)
                            // Optional: toast
                          }
                        }}
                      >
                        <i className="ri-file-copy-line"></i> Copy
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Meeting ID</span>
                      <p className="font-medium text-defaulttextcolor dark:text-white">{createdMeeting.meetingId}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Status</span>
                      <p className="font-medium text-defaulttextcolor dark:text-white capitalize">{createdMeeting.status}</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 justify-end mt-6 pt-4 border-t border-defaultborder dark:border-defaultborder/10">
                  <button
                    type="button"
                    className="ti-btn ti-btn-light !py-2 !px-4 !text-sm font-medium"
                    onClick={() => { resetCreateMeetingForm(); (window as any).HSOverlay?.close(document.querySelector('#create-interview-modal')); }}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="ti-btn ti-btn-outline-primary !py-2 !px-4 !text-sm font-medium"
                    onClick={resetCreateMeetingForm}
                  >
                    <i className="ri-add-line me-1.5"></i>Create Another Meeting
                  </button>
                  <a
                    href={createdMeeting.publicMeetingUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ti-btn ti-btn-primary !py-2 !px-4 !text-sm font-medium"
                  >
                    <i className="ri-vidicon-line me-1.5"></i>Join Meeting
                  </a>
                </div>
              </div>
            ) : (
              <form className="ti-modal-body !p-0" onSubmit={handleScheduleInterviewSubmit}>
                <div className="px-6 py-5 space-y-5 max-h-[calc(100vh-12rem)] overflow-y-auto">
                  {formError && (
                    <div className="p-3 rounded-lg bg-danger/10 text-danger text-sm">{formError}</div>
                  )}
                  {/* Meeting Title */}
                  <div>
                    <label htmlFor="schedule-meeting-title" className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">
                      Meeting Title <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      id="schedule-meeting-title"
                      placeholder="e.g. Technical Interview - John Doe"
                      className="form-control !py-2 !text-sm w-full border-defaultborder dark:border-defaultborder/10 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  {/* Description */}
                  <div>
                    <label htmlFor="schedule-description" className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">
                      Description
                    </label>
                    <textarea
                      id="schedule-description"
                      rows={2}
                      placeholder="Optional meeting description..."
                      className="form-control !py-2 !text-sm w-full border-defaultborder dark:border-defaultborder/10 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                    />
                  </div>
                  {/* Job / Position */}
                  <div>
                    <label htmlFor="schedule-job" className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">
                      Job / Position
                    </label>
                    <select
                      id="schedule-job"
                      className="form-select !py-2 !text-sm w-full border-defaultborder dark:border-defaultborder/10 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="">Select job position</option>
                      <option value="senior-software-engineer">Senior Software Engineer</option>
                      <option value="product-manager">Product Manager</option>
                      <option value="frontend-developer">Frontend Developer</option>
                      <option value="backend-developer">Backend Developer</option>
                      <option value="data-scientist">Data Scientist</option>
                      <option value="ux-designer">UX Designer</option>
                      <option value="devops-engineer">DevOps Engineer</option>
                      <option value="qa-engineer">QA Engineer</option>
                    </select>
                  </div>
                  {/* Date & Time row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="schedule-date" className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">
                        Date <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        id="schedule-date"
                        className="form-control !py-2 !text-sm w-full border-defaultborder dark:border-defaultborder/10 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                    <div>
                      <label htmlFor="schedule-time" className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">
                        Time <span className="text-danger">*</span>
                      </label>
                      <input
                        type="time"
                        id="schedule-time"
                        className="form-control !py-2 !text-sm w-full border-defaultborder dark:border-defaultborder/10 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                  </div>
                  {/* Duration & Max Participants */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="schedule-duration" className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">
                        Duration (minutes)
                      </label>
                      <input
                        type="number"
                        id="schedule-duration"
                        min={1}
                        max={480}
                        defaultValue={60}
                        className="form-control !py-2 !text-sm w-full border-defaultborder dark:border-defaultborder/10 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                    <div>
                      <label htmlFor="schedule-max-participants" className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">
                        Max Participants
                      </label>
                      <input
                        type="number"
                        id="schedule-max-participants"
                        min={1}
                        max={100}
                        defaultValue={10}
                        className="form-control !py-2 !text-sm w-full border-defaultborder dark:border-defaultborder/10 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                  </div>
                  {/* Allow Guest Join & Require Approval */}
                  <div className="flex flex-wrap gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" id="schedule-allow-guest" defaultChecked className="form-check-input !w-4 !h-4 text-primary" />
                      <span className="text-sm text-defaulttextcolor dark:text-white">Allow guest join</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" id="schedule-require-approval" className="form-check-input !w-4 !h-4 text-primary" />
                      <span className="text-sm text-defaulttextcolor dark:text-white">Require approval</span>
                    </label>
                  </div>
                  {/* Hosts */}
                  <div>
                    <label className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-2">
                      Hosts (name/role + email)
                    </label>
                    <div className="space-y-2">
                      {hosts.map((h, i) => (
                        <div key={i} className="flex gap-2 flex-wrap">
                          <input
                            type="text"
                            placeholder="Name or role"
                            value={h.nameOrRole}
                            onChange={(e) => {
                              const next = [...hosts]
                              next[i] = { ...next[i], nameOrRole: e.target.value }
                              setHosts(next)
                            }}
                            className="form-control !py-2 !text-sm flex-1 min-w-[120px] border-defaultborder dark:border-defaultborder/10 rounded-lg"
                          />
                          <input
                            type="email"
                            placeholder="email@example.com"
                            value={h.email}
                            onChange={(e) => {
                              const next = [...hosts]
                              next[i] = { ...next[i], email: e.target.value }
                              setHosts(next)
                            }}
                            className="form-control !py-2 !text-sm flex-1 min-w-[160px] border-defaultborder dark:border-defaultborder/10 rounded-lg"
                          />
                          <button
                            type="button"
                            className="ti-btn ti-btn-light !py-2 !px-2"
                            onClick={() => setHosts((prev) => prev.filter((_, j) => j !== i))}
                            aria-label="Remove host"
                          >
                            <i className="ri-close-line"></i>
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="ti-btn ti-btn-outline-light !py-1.5 !px-3 !text-sm"
                        onClick={() => setHosts((prev) => [...prev, { nameOrRole: '', email: '' }])}
                      >
                        <i className="ri-add-line me-1"></i>Add host
                      </button>
                    </div>
                  </div>
                  {/* Email Invites */}
                  <div>
                    <label className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-2">
                      Email invites
                    </label>
                    <div className="space-y-2">
                      {emailInvites.map((email, i) => (
                        <div key={i} className="flex gap-2">
                          <input
                            type="email"
                            placeholder="email@example.com"
                            value={email}
                            onChange={(e) => {
                              const next = [...emailInvites]
                              next[i] = e.target.value
                              setEmailInvites(next)
                            }}
                            className="form-control !py-2 !text-sm flex-1 border-defaultborder dark:border-defaultborder/10 rounded-lg"
                          />
                          <button
                            type="button"
                            className="ti-btn ti-btn-light !py-2 !px-2"
                            onClick={() => setEmailInvites((prev) => prev.filter((_, j) => j !== i))}
                            aria-label="Remove"
                          >
                            <i className="ri-close-line"></i>
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="ti-btn ti-btn-outline-light !py-1.5 !px-3 !text-sm"
                        onClick={() => setEmailInvites((prev) => [...prev, ''])}
                      >
                        <i className="ri-add-line me-1"></i>Add email
                      </button>
                    </div>
                  </div>
                  {/* Interview Type */}
                  <div>
                    <label className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-2">
                      Interview Type <span className="text-danger">*</span>
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {(['Video', 'In-Person', 'Phone'] as const).map((type) => (
                        <label
                          key={type}
                          className="flex items-center gap-2 cursor-pointer px-4 py-2.5 rounded-lg border-2 border-defaultborder dark:border-defaultborder/10 hover:border-primary/50 dark:hover:border-primary/50 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5 dark:has-[:checked]:bg-primary/10"
                        >
                          <input
                            type="radio"
                            name="schedule-type"
                            value={type === 'In-Person' ? 'in-person' : type.toLowerCase()}
                            defaultChecked={type === 'Video'}
                            className="form-check-input !w-4 !h-4 text-primary"
                          />
                          <i className={`ri-${type === 'Video' ? 'vidicon-line' : type === 'In-Person' ? 'user-line' : 'phone-line'} text-base text-gray-600 dark:text-gray-400`}></i>
                          <span className="text-sm font-medium text-defaulttextcolor dark:text-white">{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {/* Candidate */}
                  <div>
                    <label htmlFor="schedule-candidate" className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">
                      Candidate
                    </label>
                    <select
                      id="schedule-candidate"
                      className="form-select !py-2 !text-sm w-full border-defaultborder dark:border-defaultborder/10 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="">Select candidate</option>
                      <option value="1">John Anderson - john.anderson@example.com</option>
                      <option value="2">Sarah Johnson - sarah.johnson@example.com</option>
                      <option value="3">Michael Chen - michael.chen@example.com</option>
                      <option value="4">Emily Davis - emily.davis@example.com</option>
                      <option value="5">David Brown - david.brown@example.com</option>
                      <option value="6">Lisa Anderson - lisa.anderson@example.com</option>
                    </select>
                  </div>
                  {/* Recruiter */}
                  <div>
                    <label htmlFor="schedule-recruiter" className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">
                      Recruiter
                    </label>
                    <select
                      id="schedule-recruiter"
                      className="form-select !py-2 !text-sm w-full border-defaultborder dark:border-defaultborder/10 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="">Select recruiter</option>
                      <option value="1">John Anderson - john.anderson@example.com</option>
                      <option value="2">Sarah Johnson - sarah.johnson@example.com</option>
                      <option value="3">Emily Davis - emily.davis@example.com</option>
                    </select>
                  </div>
                  {/* Notes */}
                  <div>
                    <label htmlFor="schedule-notes" className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">
                      Notes
                    </label>
                    <textarea
                      id="schedule-notes"
                      rows={3}
                      placeholder="Add any additional notes or instructions for the interview..."
                      className="form-control !py-2 !text-sm w-full border-defaultborder dark:border-defaultborder/10 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                    />
                  </div>
                </div>
                <div className="ti-modal-footer flex flex-wrap gap-2 justify-end px-6 py-4 bg-gray-50 dark:bg-black/20 border-t border-defaultborder dark:border-defaultborder/10">
                  <button
                    type="button"
                    className="ti-btn ti-btn-light !py-2 !px-4 !text-sm font-medium"
                    data-hs-overlay="#create-interview-modal"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="ti-btn ti-btn-primary !py-2 !px-4 !text-sm font-medium"
                  >
                    {formLoading ? (
                      <>
                        <span className="animate-spin inline-block me-1.5 w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                        Creating...
                      </>
                    ) : (
                      <>
                        <i className="ri-check-line me-1.5 align-middle"></i>
                        Schedule Interview
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Filter Panel Offcanvas */}
      <div id="interviews-filter-panel" className="hs-overlay hidden ti-offcanvas ti-offcanvas-right !z-[105]" tabIndex={-1}>
        <div className="ti-offcanvas-header bg-gray-50 dark:bg-black/20 !py-2.5">
          <h6 className="ti-offcanvas-title text-base font-semibold flex items-center gap-2">
            <i className="ri-search-line text-primary text-base"></i>
            Search Interviews
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

            {/* Status Filter */}
            <div className="pb-4 border-b border-gray-200 dark:border-defaultborder/10">
              <label className="form-label mb-2.5 block font-semibold text-sm text-gray-800 dark:text-white flex items-center gap-2">
                <i className="ri-checkbox-circle-line text-info text-base"></i>
                Status
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400">({allStatuses.length})</span>
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  className="form-control !py-1.5 !text-sm mb-1.5"
                  placeholder="Search status..."
                  value={searchStatus}
                  onChange={(e) => setSearchStatus(e.target.value)}
                />
                <div className="max-h-40 overflow-y-auto rounded-lg bg-white dark:bg-black/20 p-2 shadow-sm">
                  <div className="space-y-1">
                    {filteredStatuses.length > 0 ? (
                      filteredStatuses.map((status) => (
                        <label
                          key={status}
                          className="flex items-center gap-2 cursor-pointer hover:bg-info/5 dark:hover:bg-info/10 p-1.5 rounded-md transition-colors"
                        >
                          <input
                            type="checkbox"
                            className="form-check-input !w-3.5 !h-3.5"
                            checked={filters.status.includes(status)}
                            onChange={() => handleMultiSelectChange('status', status)}
                          />
                          <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">{status}</span>
                        </label>
                      ))
                    ) : (
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-3">
                        No statuses found
                      </div>
                    )}
                  </div>
                </div>
                {filters.status.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {filters.status.map((status) => (
                      <span
                        key={status}
                        className="badge bg-info/10 text-info border border-info/30 px-2 py-1 rounded-full flex items-center gap-1.5 text-xs font-medium shadow-sm"
                      >
                        {status}
                        <button
                          type="button"
                          onClick={() => handleRemoveFilter('status', status)}
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

            {/* Type Filter */}
            <div className="pb-4">
              <label className="form-label mb-2.5 block font-semibold text-sm text-gray-800 dark:text-white flex items-center gap-2">
                <i className="ri-vidicon-line text-warning text-base"></i>
                Type
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400">({allTypes.length})</span>
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  className="form-control !py-1.5 !text-sm mb-1.5"
                  placeholder="Search types..."
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value)}
                />
                <div className="max-h-40 overflow-y-auto rounded-lg bg-white dark:bg-black/20 p-2 shadow-sm">
                  <div className="space-y-1">
                    {filteredTypes.length > 0 ? (
                      filteredTypes.map((type) => (
                        <label
                          key={type}
                          className="flex items-center gap-2 cursor-pointer hover:bg-warning/5 dark:hover:bg-warning/10 p-1.5 rounded-md transition-colors"
                        >
                          <input
                            type="checkbox"
                            className="form-check-input !w-3.5 !h-3.5"
                            checked={filters.type.includes(type)}
                            onChange={() => handleMultiSelectChange('type', type)}
                          />
                          <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">{type}</span>
                        </label>
                      ))
                    ) : (
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-3">
                        No types found
                      </div>
                    )}
                  </div>
                </div>
                {filters.type.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {filters.type.map((type) => (
                      <span
                        key={type}
                        className="badge bg-warning/10 text-warning border border-warning/30 px-2 py-1 rounded-full flex items-center gap-1.5 text-xs font-medium shadow-sm"
                      >
                        {type}
                        <button
                          type="button"
                          onClick={() => handleRemoveFilter('type', type)}
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
                data-hs-overlay="#interviews-filter-panel"
              >
                <i className="ri-close-line me-1.5"></i>Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  )
}

export default Interviews
