"use client"
import Pageheader from '@/shared/layout-components/page-header/pageheader'
import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment, useMemo, useState, useEffect } from 'react'
import { useTable, useSortBy, useGlobalFilter, usePagination } from 'react-table'
import Link from 'next/link'
import { Range, getTrackBackground } from "react-range"
import { useFeaturePermissions } from '@/shared/hooks/use-feature-permissions'
import { listJobs, deleteJob, exportJobsToExcel, importJobsFromExcel, downloadJobsTemplate, applyToJob, shareJobByEmail } from '@/shared/lib/api/jobs'
import { listCandidates } from '@/shared/lib/api/candidates'
import { initiateBolnaCall } from '@/shared/lib/api/bolna'
import { mapJobToDisplay, type DisplayJob } from '@/shared/lib/ats/jobMappers'

// Default ranges for filters when no data
const DEFAULT_SALARY_RANGE = { min: 0, max: 200000 }
const DEFAULT_EXPERIENCE_RANGE = { min: 0, max: 20 }

// Jobs data loaded from API in component – see jobsData state below



interface FilterState {
  jobTitle: string[]
  company: string[]
  experience: [number, number] // [min, max] in years
  location: string[]
  salary: [number, number] // [min, max]
  active: string // 'all' | 'true' | 'false'
  postingDate: string
}

const salaryRangesConst = DEFAULT_SALARY_RANGE
const experienceRangesConst = DEFAULT_EXPERIENCE_RANGE

// Note type for bookmark notes
interface BookmarkNote {
  id: string
  jobId: string
  note: string
  visibility: 'public' | 'private'
  postedBy: string
  postedDate: string
}

const Jobs = () => {
  const { canView, canCreate, canEdit, canDelete, isLoading: permissionsLoading } = useFeaturePermissions("ats.jobs")
  const [jobsData, setJobsData] = useState<DisplayJob[]>([])
  const [jobsLoading, setJobsLoading] = useState(true)
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())

  useEffect(() => {
    listJobs({ limit: 500 })
      .then((res) => setJobsData((res.results ?? []).map(mapJobToDisplay)))
      .catch(() => setJobsData([]))
      .finally(() => setJobsLoading(false))
  }, [])
  const [bookmarkedJobs, setBookmarkedJobs] = useState<Set<string>>(new Set())
  const [previewJob, setPreviewJob] = useState<any>(null)
  const [companyModal, setCompanyModal] = useState<any>(null)
  const [bookmarkNotesJobId, setBookmarkNotesJobId] = useState<string | null>(null)
  const [bookmarkNotes, setBookmarkNotes] = useState<BookmarkNote[]>([])
  const [newNote, setNewNote] = useState({ text: '', visibility: 'public' as 'public' | 'private' })
  const [shareJob, setShareJob] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  const [shareEmail, setShareEmail] = useState('')
  const [showEmailInput, setShowEmailInput] = useState(false)
  const [selectedSort, setSelectedSort] = useState<string>('')
  
  const [filters, setFilters] = useState<FilterState>({
    jobTitle: [],
    company: [],
    experience: [experienceRangesConst.min, experienceRangesConst.max],
    location: [],
    salary: [salaryRangesConst.min, salaryRangesConst.max],
    active: 'all',
    postingDate: ''
  })

  // Search states for filter dropdowns
  const [searchJobTitle, setSearchJobTitle] = useState('')
  const [searchCompany, setSearchCompany] = useState('')
  const [searchLocation, setSearchLocation] = useState('')

  // Excel import
  const [excelImporting, setExcelImporting] = useState(false)
  const excelInputRef = React.useRef<HTMLInputElement>(null)

  // Apply candidate to job
  const [applyModalOpen, setApplyModalOpen] = useState(false)
  const [applyJob, setApplyJob] = useState<any>(null)
  const [candidatesList, setCandidatesList] = useState<{ id: string; fullName: string }[]>([])
  const [selectedCandidateId, setSelectedCandidateId] = useState('')
  const [applySubmitting, setApplySubmitting] = useState(false)
  const [callingJobId, setCallingJobId] = useState<string | null>(null)

  const getOrganisationPhone = (job: any): string => {
    const maybePhone = job?.companyInfo?.phone
    return typeof maybePhone === 'string' ? maybePhone.trim() : ''
  }

  const handleInitiateCall = async (job: any) => {
    const phone = getOrganisationPhone(job)
    if (!phone) {
      alert('Organisation phone is required to initiate a call.')
      return
    }

    setCallingJobId(job.id)
    try {
      const res = await initiateBolnaCall({
        jobId: job.id,
        phone,
        candidateName: job.company || job.jobTitle || 'Organisation',
      })
      alert(`Call initiated successfully. Execution ID: ${res.executionId}`)
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to initiate call')
    } finally {
      setCallingJobId(null)
    }
  }

  const handleApplyClick = (job: any) => {
    setApplyJob(job)
    setSelectedCandidateId('')
    listCandidates({ limit: 500 })
      .then((res) => setCandidatesList((res.results ?? []).map((c: any) => ({ id: c._id ?? c.id, fullName: c.fullName ?? c.name ?? '' }))))
      .catch(() => setCandidatesList([]))
    setApplyModalOpen(true)
  }
  const handleApplySubmit = async () => {
    if (!applyJob?.id || !selectedCandidateId) {
      alert('Please select a candidate')
      return
    }
    setApplySubmitting(true)
    try {
      await applyToJob(applyJob.id, selectedCandidateId)
      alert('Candidate applied successfully')
      setApplyModalOpen(false)
      setApplyJob(null)
      setSelectedCandidateId('')
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to apply candidate')
    } finally {
      setApplySubmitting(false)
    }
  }

  const refreshJobs = () => {
    listJobs({ limit: 500 })
      .then((res) => setJobsData((res.results ?? []).map(mapJobToDisplay)))
      .catch(() => {})
  }

  const handleExportExcel = async () => {
    try {
      const blob = await exportJobsToExcel()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `jobs_export_${Date.now()}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Failed to export jobs')
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const blob = await downloadJobsTemplate()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'jobs_template.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Failed to download template')
    }
  }

  const handleImportExcel = () => {
    excelInputRef.current?.click()
  }

  const onExcelFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setExcelImporting(true)
    try {
      const result = await importJobsFromExcel(file)
      refreshJobs()
      const msg = result.summary
        ? `Imported ${result.summary.successful} of ${result.summary.total}. Failed: ${result.summary.failed}`
        : result.message
      alert(msg)
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to import jobs')
    } finally {
      setExcelImporting(false)
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedRows.size === 0) return
    if (!confirm(`Delete ${selectedRows.size} selected job(s)?`)) return
    try {
      await Promise.all(Array.from(selectedRows).map((id) => deleteJob(id)))
      setSelectedRows(new Set())
      refreshJobs()
    } catch (err) {
      alert('Failed to delete one or more jobs')
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

  // Handle bookmark toggle and open notes sidebar
  const handleBookmark = (id: string, job?: any) => {
    // Add to bookmarked if not already bookmarked
    if (!bookmarkedJobs.has(id)) {
      const newBookmarked = new Set(bookmarkedJobs)
      newBookmarked.add(id)
      setBookmarkedJobs(newBookmarked)
    }
    
    // Open the bookmark notes sidebar
    setBookmarkNotesJobId(id)
    
    // Trigger the panel via Preline's trigger button
    setTimeout(() => {
      const trigger = document.getElementById('bookmark-notes-panel-trigger')
      if (trigger) {
        trigger.click()
      }
    }, 100)
  }

  // Get notes for a specific job
  const getJobNotes = (jobId: string) => {
    return bookmarkNotes.filter(note => note.jobId === jobId).sort((a, b) => 
      new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime()
    )
  }

  // Add a new note
  const handleAddNote = () => {
    if (!bookmarkNotesJobId || !newNote.text.trim()) return
    
    const note: BookmarkNote = {
      id: `note-${Date.now()}`,
      jobId: bookmarkNotesJobId,
      note: newNote.text,
      visibility: newNote.visibility,
      postedBy: 'John Doe', // This would come from user context in real app
      postedDate: new Date().toISOString()
    }
    
    setBookmarkNotes([...bookmarkNotes, note])
    setNewNote({ text: '', visibility: 'public' })
  }

  // Delete a note
  const handleDeleteNote = (noteId: string) => {
    setBookmarkNotes(bookmarkNotes.filter(note => note.id !== noteId))
  }

  // Get job details for the bookmark notes sidebar
  const getBookmarkJobDetails = () => {
    if (!bookmarkNotesJobId) return null
    return jobsData.find(job => job.id === bookmarkNotesJobId)
  }

  // Generate public URL for job
  const getJobPublicUrl = (jobId: string) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/ats/jobs/${jobId}`
    }
    return `https://example.com/ats/jobs/${jobId}`
  }

  // Copy URL to clipboard
  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Share on WhatsApp
  const handleShareWhatsApp = (job: any) => {
    const url = getJobPublicUrl(job.id)
    const text = `Check out this job: ${job.jobTitle} at ${job.company} - ${url}`
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(whatsappUrl, '_blank')
  }

  // Handle email share - show input field
  const handleEmailShareClick = () => {
    setShowEmailInput(true)
  }

  // Handle send email
  const [shareEmailSending, setShareEmailSending] = useState(false)
  const handleSendEmail = async () => {
    if (!shareEmail.trim() || !shareJob?.id) return
    setShareEmailSending(true)
    try {
      await shareJobByEmail(shareJob.id, shareEmail.trim())
      alert('Job shared successfully')
      setShareEmail('')
      setShowEmailInput(false)
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to share job')
    } finally {
      setShareEmailSending(false)
    }
  }

  // Handle share button click
  const handleShareClick = (job: any) => {
    setShareJob(job)
    setShowEmailInput(false)
    setShareEmail('')
    setTimeout(() => {
      const trigger = document.getElementById('share-job-modal-trigger')
      if (trigger) {
        trigger.click()
      }
    }, 100)
  }

  // Get salary tier icon and color
  const getSalaryTierIcon = (tier: string) => {
    const icons: { [key: string]: { icon: string; color: string } } = {
      'high': { icon: 'ri-money-dollar-circle-fill', color: 'text-success' },
      'medium': { icon: 'ri-money-dollar-circle-line', color: 'text-info' },
      'low': { icon: 'ri-money-cny-circle-line', color: 'text-secondary' }
    }
    return icons[tier] || icons['medium']
  }

  // Get job type icon and label
  const getJobTypeInfo = (job: any) => {
    const types: { [key: string]: { icon: string; label: string; color: string } } = {
      'full-time': { icon: 'ri-calendar-line', label: 'Full-time', color: 'text-primary' },
      'part-time': { icon: 'ri-time-line', label: 'Part-time', color: 'text-info' },
      'contract': { icon: 'ri-file-list-line', label: 'Contract', color: 'text-warning' },
      'remote': { icon: 'ri-home-line', label: 'Remote', color: 'text-success' }
    }
    return types[job.jobType] || types['full-time']
  }

  // Get urgency badge
  const getUrgencyBadge = (urgency: string) => {
    const badges: { [key: string]: { label: string; color: string } } = {
      'high': { label: 'Urgent', color: 'bg-danger' },
      'medium': { label: 'Normal', color: 'bg-warning' },
      'low': { label: 'Low', color: 'bg-info' }
    }
    return badges[urgency] || badges['medium']
  }

  // Get salary tier badge
  const getSalaryTierBadge = (tier: string) => {
    const badges: { [key: string]: { label: string; color: string } } = {
      'high': { label: 'High Pay', color: 'bg-success' },
      'medium': { label: 'Medium Pay', color: 'bg-info' },
      'low': { label: 'Entry Level', color: 'bg-secondary' }
    }
    return badges[tier] || badges['medium']
  }

  // Define columns (checkbox column only when user can delete)
  const columns = useMemo(
    () => {
      const checkboxColumn = {
        Header: 'All',
        accessor: 'checkbox',
        id: 'checkbox',
        disableSortBy: true,
        Cell: ({ row }: any) => (
          <input
            className="form-check-input"
            type="checkbox"
            checked={selectedRows.has(row.original.id)}
            onChange={() => handleRowSelect(row.original.id)}
            aria-label={`Select ${row.original.jobTitle}`}
          />
        ),
      }
      const restColumns = [
      {
        Header: 'Job Title',
        accessor: 'jobTitle',
        Cell: ({ row }: any) => {
          const job = row.original
          return (
            <span 
              className="font-semibold text-gray-800 dark:text-white cursor-pointer hover:text-primary"
              onClick={() => {
                setPreviewJob(job)
                // Trigger the panel via Preline's trigger button
                setTimeout(() => {
                  const trigger = document.getElementById('job-preview-panel-trigger')
                  if (trigger) {
                    trigger.click()
                  }
                }, 100)
              }}
            >
              {job.jobTitle}
            </span>
          )
        },
      },
      {
        Header: 'Company',
        accessor: 'company',
        Cell: ({ row }: any) => {
          const job = row.original
          const handleCompanyClick = () => {
            setCompanyModal(job)
            // Trigger the panel via Preline's trigger button
            setTimeout(() => {
              const trigger = document.getElementById('company-panel-trigger')
              if (trigger) {
                trigger.click()
              }
            }, 50)
          }
          return (
            <span 
              className="font-medium text-gray-800 dark:text-white cursor-pointer hover:text-primary"
              onClick={handleCompanyClick}
            >
              {job.company}
            </span>
          )
        },
      },
      {
        Header: 'Location',
        accessor: 'location',
      },
      {
        Header: 'Experience',
        accessor: 'experience',
      },
      {
        Header: 'Salary',
        accessor: 'salary',
        Cell: ({ row }: any) => {
          const job = row.original
          const salaryTierIcon = getSalaryTierIcon(job.salaryTier || 'medium')
          return (
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-800 dark:text-white">{job.salary}</span>
              <i className={`${salaryTierIcon.icon} ${salaryTierIcon.color} text-lg`}></i>
            </div>
          )
        },
      },
      {
        Header: 'Posted By',
        accessor: 'postedBy',
      },
      {
        Header: 'Actions',
        accessor: 'id',
        disableSortBy: true,
        Cell: ({ row }: any) => (
          <div className="flex items-center justify-center gap-2">
            {canEdit && (
              <div className="hs-tooltip ti-main-tooltip">
                <Link
                  href={`/ats/jobs/edit/${row.original.id}`}
                  className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-info"
                >
                  <i className="ri-pencil-line"></i>
                  <span
                    className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700"
                    role="tooltip">
                    Edit Job
                  </span>
                </Link>
              </div>
            )}
            <div className="hs-tooltip ti-main-tooltip">
              <button
                type="button"
                onClick={() => handleBookmark(row.original.id, row.original)}
                className={`hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ${bookmarkedJobs.has(row.original.id) ? 'ti-btn-warning' : 'ti-btn-light'}`}
              >
                <i className={bookmarkedJobs.has(row.original.id) ? 'ri-bookmark-fill' : 'ri-bookmark-line'}></i>
                <span
                  className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700"
                  role="tooltip">
                  {bookmarkedJobs.has(row.original.id) ? 'View Notes' : 'Bookmark Job'}
                </span>
              </button>
            </div>
            <div className="hs-tooltip ti-main-tooltip">
              <button
                type="button"
                onClick={() => handleInitiateCall(row.original)}
                disabled={!getOrganisationPhone(row.original) || callingJobId === row.original.id}
                className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i className="ri-phone-line"></i>
                <span
                  className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700"
                  role="tooltip">
                  {!getOrganisationPhone(row.original)
                    ? 'Organisation phone required'
                    : callingJobId === row.original.id
                      ? 'Calling...'
                      : 'Initiate Call'}
                </span>
              </button>
            </div>
            <div className="hs-tooltip ti-main-tooltip">
              <button
                type="button"
                onClick={() => handleShareClick(row.original)}
                className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-success"
              >
                <i className="ri-share-line"></i>
                <span
                  className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700"
                  role="tooltip">
                  Share Job
                </span>
              </button>
            </div>
          </div>
        ),
      },
    ]
      return canDelete ? [checkboxColumn, ...restColumns] : restColumns
    },
    [selectedRows, bookmarkedJobs, canDelete, canEdit, callingJobId]
  )

  // Filter data based on filter state
  const filteredData = useMemo(() => {
    return jobsData.filter((job) => {
      // Job Title filter (array)
      if (filters.jobTitle.length > 0 && !filters.jobTitle.some(title => 
        job.jobTitle.toLowerCase().includes(title.toLowerCase())
      )) {
        return false
      }
      
      // Company filter (array)
      if (filters.company.length > 0 && !filters.company.includes(job.company)) {
        return false
      }
      
      // Experience filter (range)
      if (filters.experience[0] !== experienceRangesConst.min || filters.experience[1] !== experienceRangesConst.max) {
        const match = job.experience.match(/(\d+)-(\d+)/)
        if (match) {
          const jobMin = parseInt(match[1])
          const jobMax = parseInt(match[2])
          // Check if job experience range overlaps with filter range
          if (jobMax < filters.experience[0] || jobMin > filters.experience[1]) {
            return false
          }
        }
      }
      
      // Location filter (array)
      if (filters.location.length > 0 && !filters.location.includes(job.location)) {
        return false
      }
      
      // Salary filter (range)
      if (filters.salary[0] !== salaryRangesConst.min || filters.salary[1] !== salaryRangesConst.max) {
        const match = job.salary.match(/\$([\d,]+)/g)
        if (match && match.length >= 2) {
          const jobMin = parseInt(match[0].replace(/[$,]/g, ''))
          const jobMax = parseInt(match[1].replace(/[$,]/g, ''))
          // Check if job salary range overlaps with filter range
          if (jobMax < filters.salary[0] || jobMin > filters.salary[1]) {
            return false
          }
        }
      }
      
      // Active filter
      if (filters.active !== 'all') {
        const isActive = filters.active === 'true'
        if (job.active !== isActive) {
          return false
        }
      }
      
      // Posting Date filter
      if (filters.postingDate && job.postingDate !== filters.postingDate) {
        return false
      }
      
      return true
    })
  }, [jobsData, filters])

  const data = useMemo(() => filteredData, [filteredData])

  // Get active jobs for a company (function defined after filteredData)
  const getCompanyJobs = useMemo(() => {
    return (companyName: string) => {
      return filteredData.filter(job => job.company === companyName && job.active === true)
    }
  }, [filteredData])

  // Get unique values for dropdown filters
  const uniqueCompanies = useMemo(() => [...new Set(jobsData.map(job => job.company))].filter(Boolean).sort(), [jobsData])
  const uniqueLocations = useMemo(() => [...new Set(jobsData.map(job => job.location))].filter(Boolean).sort(), [jobsData])
  const uniqueJobTitles = useMemo(() => [...new Set(jobsData.map(job => job.jobTitle))].filter(Boolean).sort(), [jobsData])

  // Filter options based on search terms
  const filteredJobTitles = useMemo(() => {
    if (!searchJobTitle) return uniqueJobTitles
    return uniqueJobTitles.filter(title => 
      title.toLowerCase().includes(searchJobTitle.toLowerCase())
    )
  }, [uniqueJobTitles, searchJobTitle])

  const filteredCompanies = useMemo(() => {
    if (!searchCompany) return uniqueCompanies
    return uniqueCompanies.filter(company => 
      company.toLowerCase().includes(searchCompany.toLowerCase())
    )
  }, [uniqueCompanies, searchCompany])

  const filteredLocations = useMemo(() => {
    if (!searchLocation) return uniqueLocations
    return uniqueLocations.filter(location => 
      location.toLowerCase().includes(searchLocation.toLowerCase())
    )
  }, [uniqueLocations, searchLocation])

  const handleMultiSelectChange = (key: 'jobTitle' | 'company' | 'location', value: string) => {
    setFilters(prev => {
      const currentArray = prev[key]
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value]
      return { ...prev, [key]: newArray }
    })
  }

  const handleRemoveFilter = (key: 'jobTitle' | 'company' | 'location', value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].filter(item => item !== value)
    }))
  }

  const handleSalaryRangeChange = (values: number[]) => {
    setFilters(prev => ({ ...prev, salary: [values[0], values[1]] as [number, number] }))
  }

  const handleExperienceRangeChange = (values: number[]) => {
    setFilters(prev => ({ ...prev, experience: [values[0], values[1]] as [number, number] }))
  }

  const handleResetFilters = () => {
    setFilters({
      jobTitle: [],
      company: [],
      experience: [experienceRangesConst.min, experienceRangesConst.max],
      location: [],
      salary: [salaryRangesConst.min, salaryRangesConst.max],
      active: 'all',
      postingDate: ''
    })
  }

  const hasActiveFilters = 
    filters.jobTitle.length > 0 ||
    filters.company.length > 0 ||
    filters.experience[0] !== experienceRangesConst.min ||
    filters.experience[1] !== experienceRangesConst.max ||
    filters.location.length > 0 ||
    filters.salary[0] !== salaryRangesConst.min ||
    filters.salary[1] !== salaryRangesConst.max ||
    filters.active !== 'all' ||
    filters.postingDate !== ''

  const activeFilterCount = 
    filters.jobTitle.length +
    filters.company.length +
    (filters.experience[0] !== experienceRangesConst.min || filters.experience[1] !== experienceRangesConst.max ? 1 : 0) +
    filters.location.length +
    (filters.salary[0] !== salaryRangesConst.min || filters.salary[1] !== salaryRangesConst.max ? 1 : 0) +
    (filters.active !== 'all' ? 1 : 0) +
    (filters.postingDate !== '' ? 1 : 0)

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
      case 'title-asc':
        setSortBy([{ id: 'jobTitle', desc: false }])
        break
      case 'title-desc':
        setSortBy([{ id: 'jobTitle', desc: true }])
        break
      case 'company-asc':
        setSortBy([{ id: 'company', desc: false }])
        break
      case 'company-desc':
        setSortBy([{ id: 'company', desc: true }])
        break
      case 'location-asc':
        setSortBy([{ id: 'location', desc: false }])
        break
      case 'location-desc':
        setSortBy([{ id: 'location', desc: true }])
        break
      case 'date-newest':
        setSortBy([{ id: 'postingDate', desc: true }])
        break
      case 'date-oldest':
        setSortBy([{ id: 'postingDate', desc: false }])
        break
      case 'experience-asc':
        setSortBy([{ id: 'experience', desc: false }])
        break
      case 'experience-desc':
        setSortBy([{ id: 'experience', desc: true }])
        break
      case 'newest-first':
        setSortBy([{ id: 'postingDate', desc: true }])
        break
      case 'oldest-first':
        setSortBy([{ id: 'postingDate', desc: false }])
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
      const allIds = new Set(filteredData.map((job) => job.id))
      setSelectedRows(allIds)
    } else {
      setSelectedRows(new Set())
    }
  }

  // Check if all rows in filtered dataset are selected
  const isAllSelected = selectedRows.size === filteredData.length && filteredData.length > 0
  const isIndeterminate = selectedRows.size > 0 && selectedRows.size < filteredData.length

  if (!permissionsLoading && !canView) {
    return (
      <Fragment>
        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-8rem)]">
          <div className="xl:col-span-12 col-span-12">
            <div className="box custom-box">
              <div className="box-body">
                <p className="text-default mb-0">You don&apos;t have permission to view this page.</p>
              </div>
            </div>
          </div>
        </div>
      </Fragment>
    )
  }

  return (
    <Fragment>
  
      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-8rem)]">
        <div className="xl:col-span-12 col-span-12 h-full flex flex-col">
          <div className="box custom-box h-full flex flex-col">
            <div className="box-header flex items-center justify-between flex-wrap gap-4">
              <div className="box-title">
                Jobs
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
                        className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${selectedSort === 'title-asc' ? 'active' : ''}`}
                        onClick={() => handleSortChange('title-asc')}
                      >
                        <i className="ri-sort-asc me-2 align-middle inline-block"></i>Job Title (A-Z)
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${selectedSort === 'title-desc' ? 'active' : ''}`}
                        onClick={() => handleSortChange('title-desc')}
                      >
                        <i className="ri-sort-desc me-2 align-middle inline-block"></i>Job Title (Z-A)
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${selectedSort === 'company-asc' ? 'active' : ''}`}
                        onClick={() => handleSortChange('company-asc')}
                      >
                        <i className="ri-sort-asc me-2 align-middle inline-block"></i>Company (A-Z)
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${selectedSort === 'company-desc' ? 'active' : ''}`}
                        onClick={() => handleSortChange('company-desc')}
                      >
                        <i className="ri-sort-desc me-2 align-middle inline-block"></i>Company (Z-A)
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${selectedSort === 'location-asc' ? 'active' : ''}`}
                        onClick={() => handleSortChange('location-asc')}
                      >
                        <i className="ri-sort-asc me-2 align-middle inline-block"></i>Location (A-Z)
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${selectedSort === 'location-desc' ? 'active' : ''}`}
                        onClick={() => handleSortChange('location-desc')}
                      >
                        <i className="ri-sort-desc me-2 align-middle inline-block"></i>Location (Z-A)
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${selectedSort === 'date-newest' ? 'active' : ''}`}
                        onClick={() => handleSortChange('date-newest')}
                      >
                        <i className="ri-calendar-line me-2 align-middle inline-block"></i>Date (Newest)
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${selectedSort === 'date-oldest' ? 'active' : ''}`}
                        onClick={() => handleSortChange('date-oldest')}
                      >
                        <i className="ri-calendar-line me-2 align-middle inline-block"></i>Date (Oldest)
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${selectedSort === 'experience-asc' ? 'active' : ''}`}
                        onClick={() => handleSortChange('experience-asc')}
                      >
                        <i className="ri-time-line me-2 align-middle inline-block"></i>Experience (Low-High)
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${selectedSort === 'experience-desc' ? 'active' : ''}`}
                        onClick={() => handleSortChange('experience-desc')}
                      >
                        <i className="ri-time-line me-2 align-middle inline-block"></i>Experience (High-Low)
                      </button>
                    </li>
                    <li className="ti-dropdown-divider"></li>
                    <li>
                      <button
                        type="button"
                        className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${selectedSort === 'newest-first' ? 'active' : ''}`}
                        onClick={() => handleSortChange('newest-first')}
                      >
                        <i className="ri-arrow-down-line me-2 align-middle inline-block"></i>Newest First
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${selectedSort === 'oldest-first' ? 'active' : ''}`}
                        onClick={() => handleSortChange('oldest-first')}
                      >
                        <i className="ri-arrow-up-line me-2 align-middle inline-block"></i>Oldest First
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
                    href="/ats/jobs/create"
                    className="ti-btn ti-btn-primary-full !py-1 !px-2 !text-[0.75rem] me-2"
                  >
                    <i className="ri-add-line font-semibold align-middle"></i>Create Job
                  </Link>
                )}
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
                        onClick={handleImportExcel}
                        disabled={excelImporting}
                      >
                        <i className="ri-upload-2-line me-2 align-middle inline-block"></i>{excelImporting ? 'Importing...' : 'Import'}
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left"
                        onClick={handleExportExcel}
                      >
                        <i className="ri-file-excel-2-line me-2 align-middle inline-block"></i>Export
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left"
                        onClick={handleDownloadTemplate}
                      >
                        <i className="ri-download-line me-2 align-middle inline-block"></i>Template
                      </button>
                    </li>
                  </ul>
                </div>
                <button
                  type="button"
                  className="ti-btn ti-btn-light !py-1 !px-2 !text-[0.75rem] me-2"
                  data-hs-overlay="#jobs-filter-panel"
                >
                  <i className="ri-search-line font-semibold align-middle me-1"></i>Search
                  {hasActiveFilters && (
                    <span className="badge bg-primary text-white rounded-full ms-1 text-[0.65rem]">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              
                {canDelete && (
                  <button
                    type="button"
                    className="ti-btn ti-btn-danger !py-1 !px-2 !text-[0.75rem] disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleDeleteSelected}
                    disabled={selectedRows.size === 0}
                  >
                    <i className="ri-delete-bin-line font-semibold align-middle me-1"></i>Delete
                  </button>
                )}
                <input
                  ref={excelInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={onExcelFileChange}
                />
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
                            {column.id === 'checkbox' ? (
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

      {/* Filter Panel Offcanvas */}
      <div id="jobs-filter-panel" className="hs-overlay hidden ti-offcanvas ti-offcanvas-right !z-[105]" tabIndex={-1}>
        <div className="ti-offcanvas-header bg-gray-50 dark:bg-black/20 !py-2.5">
          <h6 className="ti-offcanvas-title text-base font-semibold flex items-center gap-2">
            <i className="ri-search-line text-primary text-base"></i>
            Search Jobs
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
            {/* Job Title Filter */}
            <div className="pb-4 border-b border-gray-200 dark:border-defaultborder/10">
              <label className="form-label mb-2.5 block font-semibold text-sm text-gray-800 dark:text-white flex items-center gap-2">
                <i className="ri-briefcase-line text-primary text-base"></i>
                Job Title
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400">({uniqueJobTitles.length})</span>
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  className="form-control !py-1.5 !text-sm mb-1.5"
                  placeholder="Search job titles..."
                  value={searchJobTitle}
                  onChange={(e) => setSearchJobTitle(e.target.value)}
                />
                <div className="max-h-40 overflow-y-auto rounded-lg bg-white dark:bg-black/20 p-2 shadow-sm">
                  <div className="space-y-1">
                    {filteredJobTitles.length > 0 ? (
                      filteredJobTitles.map((title) => (
                        <label
                          key={title}
                          className="flex items-center gap-2 cursor-pointer hover:bg-primary/5 dark:hover:bg-primary/10 p-1.5 rounded-md transition-colors"
                        >
                          <input
                            type="checkbox"
                            className="form-check-input !w-3.5 !h-3.5"
                            checked={filters.jobTitle.includes(title)}
                            onChange={() => handleMultiSelectChange('jobTitle', title)}
                          />
                          <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">{title}</span>
                        </label>
                      ))
                    ) : (
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-3">
                        No job titles found
                      </div>
                    )}
                  </div>
                </div>
                {filters.jobTitle.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {filters.jobTitle.map((title) => (
                      <span
                        key={title}
                        className="badge bg-primary/10 text-primary border border-primary/30 px-2 py-1 rounded-full flex items-center gap-1.5 text-xs font-medium shadow-sm"
                      >
                        {title}
                        <button
                          type="button"
                          onClick={() => handleRemoveFilter('jobTitle', title)}
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

            {/* Company Filter */}
            <div className="pb-4 border-b border-gray-200 dark:border-defaultborder/10">
              <label className="form-label mb-2.5 block font-semibold text-sm text-gray-800 dark:text-white flex items-center gap-2">
                <i className="ri-building-line text-success text-base"></i>
                Company
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400">({uniqueCompanies.length})</span>
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  className="form-control !py-1.5 !text-sm mb-1.5"
                  placeholder="Search companies..."
                  value={searchCompany}
                  onChange={(e) => setSearchCompany(e.target.value)}
                />
                <div className="max-h-40 overflow-y-auto rounded-lg bg-white dark:bg-black/20 p-2 shadow-sm">
                  <div className="space-y-1">
                    {filteredCompanies.length > 0 ? (
                      filteredCompanies.map((company) => (
                        <label
                          key={company}
                          className="flex items-center gap-2 cursor-pointer hover:bg-success/5 dark:hover:bg-success/10 p-1.5 rounded-md transition-colors"
                        >
                          <input
                            type="checkbox"
                            className="form-check-input !w-3.5 !h-3.5"
                            checked={filters.company.includes(company)}
                            onChange={() => handleMultiSelectChange('company', company)}
                          />
                          <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">{company}</span>
                        </label>
                      ))
                    ) : (
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-3">
                        No companies found
                      </div>
                    )}
                  </div>
                </div>
                {filters.company.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {filters.company.map((company) => (
                      <span
                        key={company}
                        className="badge bg-success/10 text-success border border-success/30 px-2 py-1 rounded-full flex items-center gap-1.5 text-xs font-medium shadow-sm"
                      >
                        {company}
                        <button
                          type="button"
                          onClick={() => handleRemoveFilter('company', company)}
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

            {/* Experience Filter - Range Slider */}
            <div className="pb-4 border-b border-gray-200 dark:border-defaultborder/10">
              <label className="form-label mb-2.5 block font-semibold text-sm text-gray-800 dark:text-white flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <i className="ri-time-line text-info text-base"></i>
                  Experience (Years)
                </span>
                <span className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                  {filters.experience[0]} - {filters.experience[1]} years
                </span>
              </label>
              <div className="px-2 py-4 bg-gray-50 dark:bg-black/20 rounded-lg">
                <Range
                  values={filters.experience}
                  step={1}
                  min={experienceRangesConst.min}
                  max={experienceRangesConst.max}
                  onChange={handleExperienceRangeChange}
                  renderTrack={({ props, children }) => (
                    <div
                      onMouseDown={props.onMouseDown}
                      onTouchStart={props.onTouchStart}
                      style={{
                        ...props.style,
                        height: '36px',
                        display: 'flex',
                        width: '100%',
                      }}
                    >
                      <div
                        ref={props.ref}
                        style={{
                          height: '8px',
                          width: '100%',
                          borderRadius: '6px',
                          background: getTrackBackground({
                            values: filters.experience,
                            colors: ['#e2e8f0', '#845adf', '#e2e8f0'],
                            min: experienceRangesConst.min,
                            max: experienceRangesConst.max,
                          }),
                          alignSelf: 'center',
                        }}
                      >
                        {children}
                      </div>
                    </div>
                  )}
                  renderThumb={({ index, props, isDragged }) => {
                    const { key, ...restProps } = props
                    return (
                    <div
                      key={key}
                      {...restProps}
                      style={{
                        ...restProps.style,
                        height: '20px',
                        width: '20px',
                        borderRadius: '50%',
                        backgroundColor: '#fff',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        boxShadow: isDragged ? '0px 2px 8px rgba(132, 90, 223, 0.4)' : '0px 2px 6px #AAA',
                        border: '2px solid rgb(132, 90, 223)',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          top: '-28px',
                          color: '#fff',
                          fontWeight: '600',
                          fontSize: '12px',
                          fontFamily: 'inherit',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          backgroundColor: 'rgb(132, 90, 223)',
                        }}
                      >
                        {filters.experience[index]} {filters.experience[index] === 1 ? 'year' : 'years'}
                      </div>
                    </div>
                    )
                  }}
                />
              </div>
            </div>

            {/* Location Filter */}
            <div className="pb-4 border-b border-gray-200 dark:border-defaultborder/10">
              <label className="form-label mb-2.5 block font-semibold text-sm text-gray-800 dark:text-white flex items-center gap-2">
                <i className="ri-map-pin-line text-warning text-base"></i>
                Location
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400">({uniqueLocations.length})</span>
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  className="form-control !py-1.5 !text-sm mb-1.5"
                  placeholder="Search locations..."
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                />
                <div className="max-h-40 overflow-y-auto rounded-lg bg-white dark:bg-black/20 p-2 shadow-sm">
                  <div className="space-y-1">
                    {filteredLocations.length > 0 ? (
                      filteredLocations.map((location) => (
                        <label
                          key={location}
                          className="flex items-center gap-2 cursor-pointer hover:bg-warning/5 dark:hover:bg-warning/10 p-1.5 rounded-md transition-colors"
                        >
                          <input
                            type="checkbox"
                            className="form-check-input !w-3.5 !h-3.5"
                            checked={filters.location.includes(location)}
                            onChange={() => handleMultiSelectChange('location', location)}
                          />
                          <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">{location}</span>
                        </label>
                      ))
                    ) : (
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-3">
                        No locations found
                      </div>
                    )}
                  </div>
                </div>
                {filters.location.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {filters.location.map((location) => (
                      <span
                        key={location}
                        className="badge bg-warning/10 text-warning border border-warning/30 px-2 py-1 rounded-full flex items-center gap-1.5 text-xs font-medium shadow-sm"
                      >
                        {location}
                        <button
                          type="button"
                          onClick={() => handleRemoveFilter('location', location)}
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

            {/* Salary Filter - Range Slider */}
            <div className="pb-4 border-b border-gray-200 dark:border-defaultborder/10">
              <label className="form-label mb-2.5 block font-semibold text-sm text-gray-800 dark:text-white flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <i className="ri-money-dollar-circle-line text-danger text-base"></i>
                  Salary Range
                </span>
                <span className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                  ${filters.salary[0].toLocaleString()} - ${filters.salary[1].toLocaleString()}
                </span>
              </label>
              <div className="px-2 py-4 bg-gray-50 dark:bg-black/20 rounded-lg">
                <Range
                  values={filters.salary}
                  step={1000}
                  min={salaryRangesConst.min}
                  max={salaryRangesConst.max}
                  onChange={handleSalaryRangeChange}
                  renderTrack={({ props, children }) => (
                    <div
                      onMouseDown={props.onMouseDown}
                      onTouchStart={props.onTouchStart}
                      style={{
                        ...props.style,
                        height: '36px',
                        display: 'flex',
                        width: '100%',
                      }}
                    >
                      <div
                        ref={props.ref}
                        style={{
                          height: '8px',
                          width: '100%',
                          borderRadius: '6px',
                          background: getTrackBackground({
                            values: filters.salary,
                            colors: ['#e2e8f0', '#845adf', '#e2e8f0'],
                            min: salaryRangesConst.min,
                            max: salaryRangesConst.max,
                          }),
                          alignSelf: 'center',
                        }}
                      >
                        {children}
                      </div>
                    </div>
                  )}
                  renderThumb={({ index, props, isDragged }) => {
                    const { key, ...restProps } = props
                    return (
                    <div
                      key={key}
                      {...restProps}
                      style={{
                        ...restProps.style,
                        height: '24px',
                        width: '24px',
                        borderRadius: '50%',
                        backgroundColor: '#fff',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        boxShadow: isDragged ? '0px 4px 12px rgba(132, 90, 223, 0.5)' : '0px 2px 8px rgba(0, 0, 0, 0.15)',
                        border: '3px solid rgb(132, 90, 223)',
                        cursor: 'grab',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          top: '-36px',
                          color: '#fff',
                          fontWeight: '600',
                          fontSize: '12px',
                          fontFamily: 'inherit',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          backgroundColor: 'rgb(132, 90, 223)',
                          boxShadow: '0px 2px 8px rgba(132, 90, 223, 0.3)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        ${filters.salary[index].toLocaleString()}
                      </div>
                    </div>
                    )
                  }}
                />
              </div>
            </div>

            {/* Active Status Filter */}
            <div className="pb-4 border-b border-gray-200 dark:border-defaultborder/10">
              <label className="form-label mb-2.5 block font-semibold text-sm text-gray-800 dark:text-white flex items-center gap-2">
                <i className="ri-toggle-line text-secondary text-base"></i>
                Status
              </label>
              <select
                className="form-select border-gray-200 dark:border-defaultborder/10 focus:ring-2 focus:ring-primary/20 !py-1.5 !text-sm"
                value={filters.active}
                onChange={(e) => setFilters(prev => ({ ...prev, active: e.target.value }))}
              >
                <option value="all">All Status</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>

            {/* Posting Date Filter */}
            <div className="pb-4">
              <label className="form-label mb-2.5 block font-semibold text-sm text-gray-800 dark:text-white flex items-center gap-2">
                <i className="ri-calendar-line text-info text-base"></i>
                Posting Date
              </label>
              <input
                type="date"
                className="form-control border-gray-200 dark:border-defaultborder/10 focus:ring-2 focus:ring-primary/20 !py-1.5 !text-sm"
                value={filters.postingDate}
                onChange={(e) => setFilters(prev => ({ ...prev, postingDate: e.target.value }))}
              />
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
                data-hs-overlay="#jobs-filter-panel"
              >
                <i className="ri-close-line me-1.5"></i>Close
              </button>
            </div>
          </div>
          </div>
        </div>

      {/* Hidden trigger button for company panel (needed for Preline) */}
      <button 
        id="company-panel-trigger"
        type="button"
        style={{ display: 'none' }}
        data-hs-overlay="#company-info-panel"
      ></button>

      {/* Company Info Panel (Offcanvas) */}
      <div
        id="company-info-panel"
        className="hs-overlay hidden ti-offcanvas ti-offcanvas-right !z-[105] !max-w-[50rem] lg:!max-w-[60rem]"
        tabIndex={-1}
      >
        <div className="ti-offcanvas-header bg-gray-50 dark:bg-black/20 !py-2.5">
          <h6 className="ti-offcanvas-title text-base font-semibold flex items-center gap-2">
            <i className="ri-building-line text-primary text-base"></i>
            {companyModal?.company || 'Company Information'}
          </h6>
          <button 
            type="button" 
            className="hs-dropdown-toggle ti-btn flex-shrink-0 p-0 transition-none text-gray-500 hover:text-gray-700 focus:ring-gray-400 focus:ring-offset-white dark:text-[#8c9097] dark:text-white/50 dark:hover:text-white/80 dark:focus:ring-white/10 dark:focus:ring-offset-white/10 hover:bg-gray-100 dark:hover:bg-black/40 rounded-md p-1" 
            data-hs-overlay="#company-info-panel"
            onClick={() => setCompanyModal(null)}
          >
            <span className="sr-only">Close</span>
            <svg className="w-3.5 h-3.5" width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0.258206 1.00652C0.351976 0.912791 0.479126 0.860131 0.611706 0.860131C0.744296 0.860131 0.871447 0.912791 0.965207 1.00652L3.61171 3.65302L6.25822 1.00652C6.30432 0.958771 6.35952 0.920671 6.42052 0.894471C6.48152 0.868271 6.54712 0.854471 6.61352 0.853901C6.67992 0.853321 6.74572 0.865971 6.80722 0.891111C6.86862 0.916251 6.92442 0.953381 6.97142 1.00032C7.01832 1.04727 7.05552 1.1031 7.08062 1.16454C7.10572 1.22599 7.11842 1.29183 7.11782 1.35822C7.11722 1.42461 7.10342 1.49022 7.07722 1.55122C7.05102 1.61222 7.01292 1.6674 6.96522 1.71352L4.31871 4.36002L6.96522 7.00648C7.05632 7.10078 7.10672 7.22708 7.10552 7.35818C7.10442 7.48928 7.05182 7.61468 6.95912 7.70738C6.86642 7.80018 6.74102 7.85268 6.60992 7.85388C6.47882 7.85498 6.35252 7.80458 6.25822 7.71348L3.61171 5.06702L0.965207 7.71348C0.870907 7.80458 0.744606 7.85498 0.613506 7.85388C0.482406 7.85268 0.357007 7.80018 0.264297 7.70738C0.171597 7.61468 0.119017 7.48928 0.117877 7.35818C0.116737 7.22708 0.167126 7.10078 0.258206 7.00648L2.90471 4.36002L0.258206 1.71352C0.164476 1.61976 0.111816 1.4926 0.111816 1.36002C0.111816 1.22744 0.164476 1.10028 0.258206 1.00652Z" fill="currentColor"/>
            </svg>
          </button>
        </div>
        <div className="ti-offcanvas-body !p-4">
              {companyModal?.companyInfo ? (
                <div className="space-y-6">
                  {/* Company Header */}
                  <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 dark:border-primary/30 rounded-lg">
                    <h6 className="font-bold text-gray-800 dark:text-white text-xl mb-2 flex items-center gap-2">
                      <i className="ri-building-line text-primary text-2xl"></i>
                      {companyModal.company}
                    </h6>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Industry</div>
                        <div className="font-semibold text-gray-800 dark:text-white">{companyModal.companyInfo.industry}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Company Size</div>
                        <div className="font-semibold text-gray-800 dark:text-white">{companyModal.companyInfo.size} employees</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Founded</div>
                        <div className="font-semibold text-gray-800 dark:text-white">{companyModal.companyInfo.founded}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Website</div>
                        <a href={`https://${companyModal.companyInfo.website}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline flex items-center gap-1">
                          {companyModal.companyInfo.website}
                          <i className="ri-external-link-line text-sm"></i>
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Company Description */}
                  {companyModal.companyInfo.description && (
                    <div className="p-4 border border-gray-200 dark:border-defaultborder/10 rounded-lg bg-gray-50 dark:bg-black/20">
                      <h6 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                        <i className="ri-file-text-line text-primary"></i>
                        About Company
                      </h6>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        {companyModal.companyInfo.description}
                      </p>
                    </div>
                  )}

                  {/* Active Job Postings */}
                  {(() => {
                    const companyJobs = getCompanyJobs(companyModal.company)
                    return companyJobs.length > 0 ? (
                      <div className="p-4 border border-gray-200 dark:border-defaultborder/10 rounded-lg">
                        <h6 className="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                          <i className="ri-briefcase-line text-primary"></i>
                          Active Job Postings ({companyJobs.length})
                        </h6>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {companyJobs.map((job: any) => {
                            const urgencyBadge = getUrgencyBadge(job.urgency || 'medium')
                            return (
                              <div 
                                key={job.id}
                                className="p-3 border border-gray-200 dark:border-defaultborder/10 rounded-lg hover:bg-gray-50 dark:hover:bg-black/20 transition-colors cursor-pointer"
                                onClick={() => {
                                  setCompanyModal(null)
                                  // Close company panel first
                                  const companyPanel = document.getElementById('company-info-panel')
                                  if (companyPanel && (window as any).HSOverlay) {
                                    const overlay = (window as any).HSOverlay.getInstance(companyPanel)
                                    if (overlay) overlay.close()
                                  }
                                  setPreviewJob(job)
                                  // Trigger the panel via Preline's trigger button
                                  setTimeout(() => {
                                    const trigger = document.getElementById('job-preview-panel-trigger')
                                    if (trigger) {
                                      trigger.click()
                                    }
                                  }, 50)
                                }}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="font-semibold text-gray-800 dark:text-white hover:text-primary">
                                        {job.jobTitle}
                                      </span>
                                      <span className={`badge ${urgencyBadge.color} text-white text-xs`}>
                                        {urgencyBadge.label}
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                                      <span className="flex items-center gap-1">
                                        <i className="ri-map-pin-line"></i>
                                        {job.location}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <i className="ri-money-dollar-circle-line"></i>
                                        {job.salary}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <i className="ri-time-line"></i>
                                        {job.experience}
                                      </span>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    className="ti-btn ti-btn-sm ti-btn-primary"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setCompanyModal(null)
                                      // Close company panel first
                                      const companyPanel = document.getElementById('company-info-panel')
                                      if (companyPanel && (window as any).HSOverlay) {
                                        const overlay = (window as any).HSOverlay.getInstance(companyPanel)
                                        if (overlay) overlay.close()
                                      }
                                      setPreviewJob(job)
                                      // Trigger the panel via Preline's trigger button
                                      setTimeout(() => {
                                        const trigger = document.getElementById('job-preview-panel-trigger')
                                        if (trigger) {
                                          trigger.click()
                                        }
                                      }, 50)
                                    }}
                                  >
                                    View Details
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 border border-gray-200 dark:border-defaultborder/10 rounded-lg text-center">
                        <i className="ri-briefcase-line text-3xl text-gray-400 dark:text-gray-500 mb-2"></i>
                        <p className="text-sm text-gray-500 dark:text-gray-400">No active job postings at the moment</p>
                      </div>
                    )
                  })()}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">No company information available</div>
              )}
        </div>
      </div>

      {/* Hidden trigger button for job preview panel (needed for Preline) */}
      <button 
        id="job-preview-panel-trigger"
        type="button"
        style={{ display: 'none' }}
        data-hs-overlay="#job-preview-panel"
      ></button>

      {/* Job Preview Panel (Offcanvas) */}
      <div 
        id="job-preview-panel" 
        className="hs-overlay hidden ti-offcanvas ti-offcanvas-right !z-[105] !max-w-[50rem] lg:!max-w-[60rem]"
        tabIndex={-1}
      >
        <div className="ti-offcanvas-header bg-gray-50 dark:bg-black/20 !py-2.5">
          <h6 className="ti-offcanvas-title text-base font-semibold flex items-center gap-2">
            <i className="ri-briefcase-line text-primary text-base"></i>
            {previewJob?.jobTitle || 'Job Preview'}
          </h6>
          <button 
            type="button" 
            className="hs-dropdown-toggle ti-btn flex-shrink-0 p-0 transition-none text-gray-500 hover:text-gray-700 focus:ring-gray-400 focus:ring-offset-white dark:text-[#8c9097] dark:text-white/50 dark:hover:text-white/80 dark:focus:ring-white/10 dark:focus:ring-offset-white/10 hover:bg-gray-100 dark:hover:bg-black/40 rounded-md p-1" 
            data-hs-overlay="#job-preview-panel"
            onClick={() => setPreviewJob(null)}
          >
            <span className="sr-only">Close</span>
            <svg className="w-3.5 h-3.5" width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0.258206 1.00652C0.351976 0.912791 0.479126 0.860131 0.611706 0.860131C0.744296 0.860131 0.871447 0.912791 0.965207 1.00652L3.61171 3.65302L6.25822 1.00652C6.30432 0.958771 6.35952 0.920671 6.42052 0.894471C6.48152 0.868271 6.54712 0.854471 6.61352 0.853901C6.67992 0.853321 6.74572 0.865971 6.80722 0.891111C6.86862 0.916251 6.92442 0.953381 6.97142 1.00032C7.01832 1.04727 7.05552 1.1031 7.08062 1.16454C7.10572 1.22599 7.11842 1.29183 7.11782 1.35822C7.11722 1.42461 7.10342 1.49022 7.07722 1.55122C7.05102 1.61222 7.01292 1.6674 6.96522 1.71352L4.31871 4.36002L6.96522 7.00648C7.05632 7.10078 7.10672 7.22708 7.10552 7.35818C7.10442 7.48928 7.05182 7.61468 6.95912 7.70738C6.86642 7.80018 6.74102 7.85268 6.60992 7.85388C6.47882 7.85498 6.35252 7.80458 6.25822 7.71348L3.61171 5.06702L0.965207 7.71348C0.870907 7.80458 0.744606 7.85498 0.613506 7.85388C0.482406 7.85268 0.357007 7.80018 0.264297 7.70738C0.171597 7.61468 0.119017 7.48928 0.117877 7.35818C0.116737 7.22708 0.167126 7.10078 0.258206 7.00648L2.90471 4.36002L0.258206 1.71352C0.164476 1.61976 0.111816 1.4926 0.111816 1.36002C0.111816 1.22744 0.164476 1.10028 0.258206 1.00652Z" fill="currentColor"/>
            </svg>
          </button>
        </div>
        <div className="ti-offcanvas-body !p-4">
                {previewJob ? (
                <div className="space-y-4">
                  {/* Job Header Info */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                    <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
                      <span className={`badge ${getUrgencyBadge(previewJob.urgency || 'medium').color} text-white`}>
                        {getUrgencyBadge(previewJob.urgency || 'medium').label}
                      </span>
                      {(() => {
                        const jobTypeInfo = getJobTypeInfo(previewJob)
                        return (
                          <span className={`badge bg-primary/10 text-primary ${jobTypeInfo.color}`}>
                            <i className={`${jobTypeInfo.icon} me-1`}></i>
                            {jobTypeInfo.label}
                          </span>
                        )
                      })()}
                      {previewJob.isRemote && (
                        <span className="badge bg-success/10 text-success border border-success/30">
                          <i className="ri-home-line me-1"></i>Remote
                        </span>
                      )}
                      <span className={`badge ${getSalaryTierBadge(previewJob.salaryTier || 'medium').color} text-white`}>
                        {getSalaryTierBadge(previewJob.salaryTier || 'medium').label}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleBookmark(previewJob.id, previewJob)}
                      className={`ti-btn ti-btn-sm flex-shrink-0 self-start sm:self-center min-w-[9rem] whitespace-nowrap px-3 py-1.5 inline-flex items-center justify-center ${bookmarkedJobs.has(previewJob.id) ? 'ti-btn-warning' : 'ti-btn-light'}`}
                    >
                      <i className={`${bookmarkedJobs.has(previewJob.id) ? 'ri-bookmark-fill' : 'ri-bookmark-line'} flex-shrink-0 me-1.5`}></i>
                      <span>{bookmarkedJobs.has(previewJob.id) ? 'View Notes' : 'Bookmark'}</span>
                    </button>
                  </div>

                  {/* Key Details Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-black/20 rounded-lg">
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Company</div>
                      <span 
                        className="font-semibold text-gray-800 dark:text-white cursor-pointer hover:text-primary"
                        onClick={() => {
                          setCompanyModal(previewJob)
                          // Close job preview panel first
                          const jobPanel = document.getElementById('job-preview-panel')
                          if (jobPanel && (window as any).HSOverlay) {
                            const overlay = (window as any).HSOverlay.getInstance(jobPanel)
                            if (overlay) overlay.close()
                          }
                          setPreviewJob(null)
                          // Trigger the panel via Preline's trigger button
                          setTimeout(() => {
                            const trigger = document.getElementById('company-panel-trigger')
                            if (trigger) {
                              trigger.click()
                            }
                          }, 50)
                        }}
                      >
                        {previewJob.company}
                      </span>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Location</div>
                      <div className="font-semibold text-gray-800 dark:text-white">{previewJob.location}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Experience</div>
                      <div className="font-semibold text-gray-800 dark:text-white">{previewJob.experience}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Salary</div>
                      <div className="font-semibold text-gray-800 dark:text-white">{previewJob.salary}</div>
                    </div>
                  </div>

                  {/* Company Information */}
                  {previewJob.companyInfo && (
                    <div className="p-4 border border-gray-200 dark:border-defaultborder/10 rounded-lg">
                      <h6 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                        <i className="ri-building-line text-primary"></i>
                        Company Information
                      </h6>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Industry</div>
                          <div className="font-medium text-gray-800 dark:text-white">{previewJob.companyInfo.industry}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Company Size</div>
                          <div className="font-medium text-gray-800 dark:text-white">{previewJob.companyInfo.size} employees</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Founded</div>
                          <div className="font-medium text-gray-800 dark:text-white">{previewJob.companyInfo.founded}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Website</div>
                          <a href={`https://${previewJob.companyInfo.website}`} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                            {previewJob.companyInfo.website}
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Job Description */}
                  {previewJob.description && (
                    <div>
                      <h6 className="font-semibold text-gray-800 dark:text-white mb-3">Job Description</h6>
                      <div 
                        className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300"
                        dangerouslySetInnerHTML={{ __html: previewJob.description }}
                      />
                    </div>
                  )}

                  {/* Additional Info */}
                  <div className="pt-4 border-t border-gray-200 dark:border-defaultborder/10">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Posted By: </span>
                        <span className="font-medium text-gray-800 dark:text-white">{previewJob.postedBy}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Posted Date: </span>
                        <span className="font-medium text-gray-800 dark:text-white">{previewJob.postingDate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {previewJob && (
                    <div className="pt-4 border-t border-gray-200 dark:border-defaultborder/10 flex gap-3">
                      <button 
                        type="button" 
                        className="hs-dropdown-toggle ti-btn ti-btn-light flex-1 min-w-0 overflow-hidden whitespace-nowrap px-4"
                        data-hs-overlay="#job-preview-panel"
                        onClick={() => setPreviewJob(null)}
                      >
                        Close
                      </button>
                      <button
                        type="button"
                        className="ti-btn ti-btn-primary flex-1 min-w-0 overflow-hidden whitespace-nowrap px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => previewJob && handleInitiateCall(previewJob)}
                        disabled={!getOrganisationPhone(previewJob) || callingJobId === previewJob.id}
                      >
                        {callingJobId === previewJob.id ? 'Calling...' : 'Initiate Call'}
                      </button>
                      <button
                        type="button"
                        className="ti-btn ti-btn-primary flex-1 min-w-0 overflow-hidden whitespace-nowrap px-4"
                        onClick={() => previewJob && handleApplyClick(previewJob)}
                      >
                        Apply Now
                      </button>
                    </div>
                  )}
                </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">No job selected</div>
                )}
        </div>
      </div>

      {/* Hidden trigger button for bookmark notes panel (needed for Preline) */}
      <button 
        id="bookmark-notes-panel-trigger"
        type="button"
        style={{ display: 'none' }}
        data-hs-overlay="#bookmark-notes-panel"
      ></button>

      {/* Bookmark Notes Panel (Offcanvas) */}
      <div 
        id="bookmark-notes-panel" 
        className="hs-overlay hidden ti-offcanvas ti-offcanvas-right !z-[105]"
        tabIndex={-1}
      >
        <div className="ti-offcanvas-header bg-gray-50 dark:bg-black/20 !py-2.5">
          <h6 className="ti-offcanvas-title text-base font-semibold flex items-center gap-2">
            <i className="ri-bookmark-line text-primary text-base"></i>
            {getBookmarkJobDetails()?.jobTitle || 'Bookmark Notes'}
          </h6>
          <button 
            type="button" 
            className="hs-dropdown-toggle ti-btn flex-shrink-0 p-0 transition-none text-gray-500 hover:text-gray-700 focus:ring-gray-400 focus:ring-offset-white dark:text-[#8c9097] dark:text-white/50 dark:hover:text-white/80 dark:focus:ring-white/10 dark:focus:ring-offset-white/10 hover:bg-gray-100 dark:hover:bg-black/40 rounded-md p-1" 
            data-hs-overlay="#bookmark-notes-panel"
            onClick={() => setBookmarkNotesJobId(null)}
          >
            <span className="sr-only">Close</span>
            <svg className="w-3.5 h-3.5" width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0.258206 1.00652C0.351976 0.912791 0.479126 0.860131 0.611706 0.860131C0.744296 0.860131 0.871447 0.912791 0.965207 1.00652L3.61171 3.65302L6.25822 1.00652C6.30432 0.958771 6.35952 0.920671 6.42052 0.894471C6.48152 0.868271 6.54712 0.854471 6.61352 0.853901C6.67992 0.853321 6.74572 0.865971 6.80722 0.891111C6.86862 0.916251 6.92442 0.953381 6.97142 1.00032C7.01832 1.04727 7.05552 1.1031 7.08062 1.16454C7.10572 1.22599 7.11842 1.29183 7.11782 1.35822C7.11722 1.42461 7.10342 1.49022 7.07722 1.55122C7.05102 1.61222 7.01292 1.6674 6.96522 1.71352L4.31871 4.36002L6.96522 7.00648C7.05632 7.10078 7.10672 7.22708 7.10552 7.35818C7.10442 7.48928 7.05182 7.61468 6.95912 7.70738C6.86642 7.80018 6.74102 7.85268 6.60992 7.85388C6.47882 7.85498 6.35252 7.80458 6.25822 7.71348L3.61171 5.06702L0.965207 7.71348C0.870907 7.80458 0.744606 7.85498 0.613506 7.85388C0.482406 7.85268 0.357007 7.80018 0.264297 7.70738C0.171597 7.61468 0.119017 7.48928 0.117877 7.35818C0.116737 7.22708 0.167126 7.10078 0.258206 7.00648L2.90471 4.36002L0.258206 1.71352C0.164476 1.61976 0.111816 1.4926 0.111816 1.36002C0.111816 1.22744 0.164476 1.10028 0.258206 1.00652Z" fill="currentColor"/>
            </svg>
          </button>
        </div>
        <div className="ti-offcanvas-body !p-4">
          {bookmarkNotesJobId ? (
            <div className="space-y-6">
              {/* Job Info Header */}
              {(() => {
                const jobDetails = getBookmarkJobDetails()
                return jobDetails ? (
                  <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 dark:border-primary/30 rounded-lg">
                    <h6 className="font-bold text-gray-800 dark:text-white text-lg mb-2">{jobDetails.jobTitle}</h6>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <i className="ri-building-line"></i>
                        {jobDetails.company}
                      </span>
                      <span className="flex items-center gap-1">
                        <i className="ri-map-pin-line"></i>
                        {jobDetails.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <i className="ri-money-dollar-circle-line"></i>
                        {jobDetails.salary}
                      </span>
                    </div>
                  </div>
                ) : null
              })()}

              {/* Add New Note Form */}
              <div className="p-4 border border-gray-200 dark:border-defaultborder/10 rounded-lg bg-gray-50 dark:bg-black/20">
                <h6 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                  <i className="ri-file-add-line text-primary"></i>
                  Add Note
                </h6>
                <div className="space-y-3">
                  <textarea
                    className="form-control"
                    rows={4}
                    placeholder="Write your note here..."
                    value={newNote.text}
                    onChange={(e) => setNewNote({ ...newNote, text: e.target.value })}
                  />
                  <div className="flex items-center gap-4">
                    <label className="form-label mb-0 font-medium text-sm text-gray-700 dark:text-gray-300">Visibility:</label>
                    <div className="flex items-center gap-4">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="noteVisibility"
                          id="note-public"
                          checked={newNote.visibility === 'public'}
                          onChange={() => setNewNote({ ...newNote, visibility: 'public' })}
                        />
                        <label className="form-check-label" htmlFor="note-public">
                          Public
                        </label>
                      </div>
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="noteVisibility"
                          id="note-private"
                          checked={newNote.visibility === 'private'}
                          onChange={() => setNewNote({ ...newNote, visibility: 'private' })}
                        />
                        <label className="form-check-label" htmlFor="note-private">
                          Private
                        </label>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="ti-btn ti-btn-primary"
                    onClick={handleAddNote}
                    disabled={!newNote.text.trim()}
                  >
                    <i className="ri-add-line me-1"></i>
                    Add Note
                  </button>
                </div>
              </div>

              {/* Existing Notes */}
              <div>
                <h6 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                  <i className="ri-file-list-line text-primary"></i>
                  Notes ({getJobNotes(bookmarkNotesJobId).length})
                </h6>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {getJobNotes(bookmarkNotesJobId).length > 0 ? (
                    getJobNotes(bookmarkNotesJobId).map((note) => (
                      <div 
                        key={note.id}
                        className="p-4 border border-gray-200 dark:border-defaultborder/10 rounded-lg bg-white dark:bg-black/40"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`badge ${note.visibility === 'public' ? 'bg-success' : 'bg-secondary'} text-white text-xs`}>
                              <i className={`ri-${note.visibility === 'public' ? 'global' : 'lock'}-line me-1`}></i>
                              {note.visibility === 'public' ? 'Public' : 'Private'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
                              <div>{new Date(note.postedDate).toLocaleDateString()}</div>
                              <div>{new Date(note.postedDate).toLocaleTimeString()}</div>
                            </div>
                            <button
                              type="button"
                              className="ti-btn ti-btn-icon ti-btn-sm ti-btn-danger"
                              onClick={() => handleDeleteNote(note.id)}
                              title="Delete note"
                            >
                              <i className="ri-delete-bin-line"></i>
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 whitespace-pre-wrap">
                          {note.note}
                        </p>
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <i className="ri-user-line"></i>
                          Posted by: <span className="font-medium">{note.postedBy}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 border border-gray-200 dark:border-defaultborder/10 rounded-lg text-center bg-gray-50 dark:bg-black/20">
                      <i className="ri-file-list-line text-3xl text-gray-400 dark:text-gray-500 mb-2"></i>
                      <p className="text-sm text-gray-500 dark:text-gray-400">No notes yet. Add your first note above.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">No job selected</div>
          )}
        </div>
      </div>

      {/* Hidden trigger button for share modal (needed for Preline) */}
      <button 
        id="share-job-modal-trigger"
        type="button"
        style={{ display: 'none' }}
        data-hs-overlay="#share-job-modal"
      ></button>

      {/* Share Job Modal */}
      <div 
        id="share-job-modal" 
        className="hs-overlay hidden ti-modal"
      >
        <div className="hs-overlay-open:mt-7 ti-modal-box mt-0 ease-out lg:!max-w-lg lg:w-full m-3 lg:!mx-auto">
          <div className="ti-modal-content">
            <div className="ti-modal-header">
              <h6 className="ti-modal-title flex items-center gap-2">
                <i className="ri-share-line text-primary"></i>
                Share Job
              </h6>
              <button 
                type="button" 
                className="hs-dropdown-toggle ti-modal-close-btn" 
                data-hs-overlay="#share-job-modal"
                onClick={() => {
                  setShareJob(null)
                  setShowEmailInput(false)
                  setShareEmail('')
                }}
              >
                <span className="sr-only">Close</span>
                <svg className="w-3.5 h-3.5" width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0.258206 1.00652C0.351976 0.912791 0.479126 0.860131 0.611706 0.860131C0.744296 0.860131 0.871447 0.912791 0.965207 1.00652L3.61171 3.65302L6.25822 1.00652C6.30432 0.958771 6.35952 0.920671 6.42052 0.894471C6.48152 0.868271 6.54712 0.854471 6.61352 0.853901C6.67992 0.853321 6.74572 0.865971 6.80722 0.891111C6.86862 0.916251 6.92442 0.953381 6.97142 1.00032C7.01832 1.04727 7.05552 1.1031 7.08062 1.16454C7.10572 1.22599 7.11842 1.29183 7.11782 1.35822C7.11722 1.42461 7.10342 1.49022 7.07722 1.55122C7.05102 1.61222 7.01292 1.6674 6.96522 1.71352L4.31871 4.36002L6.96522 7.00648C7.05632 7.10078 7.10672 7.22708 7.10552 7.35818C7.10442 7.48928 7.05182 7.61468 6.95912 7.70738C6.86642 7.80018 6.74102 7.85268 6.60992 7.85388C6.47882 7.85498 6.35252 7.80458 6.25822 7.71348L3.61171 5.06702L0.965207 7.71348C0.870907 7.80458 0.744606 7.85498 0.613506 7.85388C0.482406 7.85268 0.357007 7.80018 0.264297 7.70738C0.171597 7.61468 0.119017 7.48928 0.117877 7.35818C0.116737 7.22708 0.167126 7.10078 0.258206 7.00648L2.90471 4.36002L0.258206 1.71352C0.164476 1.61976 0.111816 1.4926 0.111816 1.36002C0.111816 1.22744 0.164476 1.10028 0.258206 1.00652Z" fill="currentColor"/>
                </svg>
              </button>
            </div>
            <div className="ti-modal-body">
              {shareJob ? (
                <div className="space-y-4">
                  {/* Job Info */}
                  <div className="p-3 bg-gray-50 dark:bg-black/20 rounded-lg border border-gray-200 dark:border-defaultborder/10">
                    <h6 className="font-semibold text-gray-800 dark:text-white mb-1">{shareJob.jobTitle}</h6>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {shareJob.company} • {shareJob.location}
                    </p>
                  </div>

                  {/* Copy URL Section */}
                  <div>
                    <label className="form-label mb-2 font-semibold text-sm text-gray-800 dark:text-white">
                      Public URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="form-control"
                        value={getJobPublicUrl(shareJob.id)}
                        readOnly
                      />
                      <button
                        type="button"
                        className={`ti-btn ${copied ? 'ti-btn-success' : 'ti-btn-primary'}`}
                        onClick={() => handleCopyUrl(getJobPublicUrl(shareJob.id))}
                      >
                        <i className={`ri-${copied ? 'check' : 'file-copy'}-line me-1`}></i>
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  {/* Share Options */}
                  <div>
                    <label className="form-label mb-3 font-semibold text-sm text-gray-800 dark:text-white">
                      Share via
                    </label>
                    <div className="space-y-3">
                      <button
                        type="button"
                        className="ti-btn ti-btn-success w-full flex items-center justify-center gap-2"
                        onClick={() => handleShareWhatsApp(shareJob)}
                      >
                        <i className="ri-whatsapp-line text-xl"></i>
                        WhatsApp
                      </button>
                      
                      {!showEmailInput ? (
                        <button
                          type="button"
                          className="ti-btn ti-btn-primary w-full flex items-center justify-center gap-2"
                          onClick={handleEmailShareClick}
                        >
                          <i className="ri-mail-line text-xl"></i>
                          Email
                        </button>
                      ) : (
                        <div className="space-y-2">
                          <input
                            type="email"
                            className="form-control"
                            placeholder="Enter email address"
                            value={shareEmail}
                            onChange={(e) => setShareEmail(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleSendEmail()
                              }
                            }}
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className="ti-btn ti-btn-primary flex-1"
                              onClick={handleSendEmail}
                              disabled={!shareEmail.trim() || shareEmailSending}
                            >
                              <i className="ri-send-plane-line me-1"></i>
                              {shareEmailSending ? 'Sending...' : 'Send'}
                            </button>
                            <button
                              type="button"
                              className="ti-btn ti-btn-light"
                              onClick={() => {
                                setShowEmailInput(false)
                                setShareEmail('')
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">No job selected</div>
              )}
            </div>
            <div className="ti-modal-footer">
              <button 
                type="button" 
                className="ti-btn ti-btn-light" 
                data-hs-overlay="#share-job-modal"
                onClick={() => {
                  setShareJob(null)
                  setShowEmailInput(false)
                  setShareEmail('')
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Apply Candidate Modal */}
      {applyModalOpen && applyJob && (
        <div id="apply-job-modal" className="ti-modal overflow-y-auto" role="dialog" aria-modal="true" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}>
          <div className="ti-modal-content !max-w-md">
            <div className="ti-modal-header">
              <h5 className="ti-modal-title">Apply Candidate to Job</h5>
              <button type="button" className="ti-btn ti-btn-light !p-1" onClick={() => { setApplyModalOpen(false); setApplyJob(null); }}>
                <i className="ri-close-line"></i>
              </button>
            </div>
            <div className="ti-modal-body">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Select a candidate to apply for <strong>{applyJob.jobTitle}</strong>
              </p>
              <select
                className="form-control"
                value={selectedCandidateId}
                onChange={(e) => setSelectedCandidateId(e.target.value)}
              >
                <option value="">-- Select Candidate --</option>
                {candidatesList.map((c) => (
                  <option key={c.id} value={c.id}>{c.fullName}</option>
                ))}
              </select>
            </div>
            <div className="ti-modal-footer">
              <button type="button" className="ti-btn ti-btn-light" onClick={() => { setApplyModalOpen(false); setApplyJob(null); }}>
                Cancel
              </button>
              <button
                type="button"
                className="ti-btn ti-btn-primary"
                onClick={handleApplySubmit}
                disabled={!selectedCandidateId || applySubmitting}
              >
                {applySubmitting ? 'Applying...' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  )
}

export default Jobs
