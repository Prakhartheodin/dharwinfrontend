"use client"
import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment, useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { useTable, useSortBy } from 'react-table'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AxiosError } from 'axios'
import { listRecruiters, deleteUser, exportRecruitersToExcel, downloadRecruitersTemplate, importRecruitersFromExcel, getRecruiterFilterOptions, type RecruiterFilterOptions } from '@/shared/lib/api/users'
import { mapRecruiterToDisplay, type DisplayRecruiter } from '@/shared/lib/ats/recruiterMappers'
import {
  buildRecruiterExportParams,
  buildRecruiterListParams,
  filterRecruiterFacetOptions,
} from '@/shared/lib/ats/recruiter-list-filters'
import {
  DEFAULT_RECRUITER_SORT_API,
  isRecruiterSortOption,
  sortOptionToApiSortBy,
  type RecruiterSortOption,
} from '@/shared/lib/ats/recruiter-list-sort'
import { useAuth } from '@/shared/contexts/auth-context'
import { hasPermission } from '@/shared/lib/permissions'
import { listRecruiterNotes, createRecruiterNote, deleteRecruiterNote, shareRecruiterByEmail } from '@/shared/lib/api/recruiterNotes'
import ListPagination from '@/shared/components/ListPagination'
import PersonAvatar from '@/shared/components/PersonAvatar'
import Swal from 'sweetalert2'
import { closeHsOverlay, openHsOverlay } from '../../training/evaluation/_components/evaluation-overlay'

// Recruiters data loaded from API in component – see recruitersData state below



interface FilterState {
  name: string[]
  domain: string[]
  education: string[]
  location: string[]
  email: string
}

// Note type for recruiter notes
interface RecruiterNote {
  id: string
  recruiterId: string
  note: string
  visibility: 'public' | 'private'
  postedBy: string
  postedDate: string
}

const FACET_LIST_BOX =
  'h-36 max-h-36 overflow-y-auto overscroll-contain rounded-lg bg-white dark:bg-black/20 p-2 shadow-sm [scrollbar-width:thin]'

function scrollRecruiterFilterBodyIfListEdge(event: React.WheelEvent<HTMLDivElement>) {
  const list = event.currentTarget
  const atTop = list.scrollTop <= 0 && event.deltaY < 0
  const atBottom =
    list.scrollTop + list.clientHeight >= list.scrollHeight - 1 && event.deltaY > 0
  if (!atTop && !atBottom) return
  const body = list.closest('[data-recruiter-filter-body]')
  if (!(body instanceof HTMLElement)) return
  body.scrollTop += event.deltaY
}

const Recruiters = () => {
  const router = useRouter()
  const auth = useAuth()
  const canManageRecruiters = hasPermission(auth, 'manage_recruiters')
  const [recruitersData, setRecruitersData] = useState<DisplayRecruiter[]>([])
  const [recruitersLoading, setRecruitersLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalResults, setTotalResults] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [sortBy, setSortBy] = useState<string>(DEFAULT_RECRUITER_SORT_API)
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const fetchGenerationRef = useRef(0)
  const fetchRecruitersRef = useRef<() => Promise<void>>()
  const excelDropdownRef = useRef<HTMLDivElement | null>(null)
  const sortDropdownRef = useRef<HTMLDivElement | null>(null)
  const [excelMenuOpen, setExcelMenuOpen] = useState(false)
  const [sortMenuOpen, setSortMenuOpen] = useState(false)
  const [recruiterNotes, setRecruiterNotes] = useState<RecruiterNote[]>([])
  const [previewRecruiter, setPreviewRecruiter] = useState<any>(null)
  const [notesRecruiterId, setNotesRecruiterId] = useState<string | null>(null)
  const [newNote, setNewNote] = useState({ text: '', visibility: 'public' as 'public' | 'private' })
  const [shareRecruiter, setShareRecruiter] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  const [shareEmail, setShareEmail] = useState('')
  const [showEmailInput, setShowEmailInput] = useState(false)
  const [shareSubmitting, setShareSubmitting] = useState(false)
  const [selectedSort, setSelectedSort] = useState<RecruiterSortOption>('')
  const [filterPanelOpen, setFilterPanelOpen] = useState(false)
  
  const [filters, setFilters] = useState<FilterState>({
    name: [],
    domain: [],
    education: [],
    location: [],
    email: ''
  })
  const [filterOptions, setFilterOptions] = useState<RecruiterFilterOptions>({
    names: [],
    domains: [],
    education: [],
    locations: [],
    emails: [],
  })
  const [filtersLoading, setFiltersLoading] = useState(false)

  const listQueryInput = useMemo(
    () => ({
      page: currentPage,
      limit: pageSize,
      sortBy,
      search: debouncedSearchQuery,
      filters,
    }),
    [currentPage, pageSize, sortBy, debouncedSearchQuery, filters]
  )

  // Search states for filter dropdowns
  const [searchName, setSearchName] = useState('')
  const [searchDomain, setSearchDomain] = useState('')
  const [searchEducation, setSearchEducation] = useState('')
  const [searchLocation, setSearchLocation] = useState('')
  const [searchEmail, setSearchEmail] = useState('')

  // Excel import
  const [excelImporting, setExcelImporting] = useState(false)
  const excelInputRef = React.useRef<HTMLInputElement>(null)

  // Handle individual row checkbox
  const handleRowSelect = useCallback((id: string) => {
    setSelectedRows((prev) => {
      const newSelected = new Set(prev)
      if (newSelected.has(id)) {
        newSelected.delete(id)
      } else {
        newSelected.add(id)
      }
      return newSelected
    })
  }, [])

  const refreshRecruiters = useCallback(async () => {
    if (fetchRecruitersRef.current) {
      await fetchRecruitersRef.current()
    }
  }, [])

  const fetchRecruiters = useCallback(async () => {
    const generation = ++fetchGenerationRef.current
    setRecruitersLoading(true)
    setLoadError(null)
    try {
      const res = await listRecruiters(buildRecruiterListParams(listQueryInput))
      if (generation !== fetchGenerationRef.current) return
      setRecruitersData((res.results ?? []).map(mapRecruiterToDisplay))
      setTotalResults(res.totalResults ?? 0)
      setTotalPages(res.totalPages ?? 0)
    } catch (err) {
      if (generation !== fetchGenerationRef.current) return
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : err instanceof Error
          ? err.message
          : 'Failed to load recruiters.'
      setLoadError(msg)
      setRecruitersData([])
      setTotalResults(0)
      setTotalPages(0)
      await Swal.fire({
        icon: 'error',
        title: 'Failed to load recruiters',
        text: msg,
        toast: true,
        position: 'top-end',
        timer: 4000,
        showConfirmButton: false,
        timerProgressBar: true,
      })
    } finally {
      if (generation === fetchGenerationRef.current) {
        setRecruitersLoading(false)
      }
    }
  }, [listQueryInput])

  const fetchFilterOptions = useCallback(async () => {
    setFiltersLoading(true)
    try {
      const options = await getRecruiterFilterOptions({
        ...(debouncedSearchQuery.trim() ? { search: debouncedSearchQuery.trim() } : {}),
      })
      setFilterOptions(options)
    } catch {
      setFilterOptions({
        names: [],
        domains: [],
        education: [],
        locations: [],
        emails: [],
      })
    } finally {
      setFiltersLoading(false)
    }
  }, [debouncedSearchQuery])

  useEffect(() => {
    fetchRecruitersRef.current = fetchRecruiters
  }, [fetchRecruiters])

  useEffect(() => {
    fetchRecruiters()
  }, [fetchRecruiters])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchQuery(searchName.trim())
    }, 300)
    return () => window.clearTimeout(timer)
  }, [searchName])

  useEffect(() => {
    setCurrentPage(1)
  }, [pageSize, sortBy, debouncedSearchQuery, filters])

  useEffect(() => {
    setSelectedRows(new Set())
  }, [currentPage, pageSize, sortBy, debouncedSearchQuery, filters])

  useEffect(() => {
    fetchFilterOptions()
  }, [fetchFilterOptions])

  useEffect(() => {
    if (!excelMenuOpen && !sortMenuOpen) return
    const onDoc = (e: MouseEvent) => {
      if (excelMenuOpen && !excelDropdownRef.current?.contains(e.target as Node)) {
        setExcelMenuOpen(false)
      }
      if (sortMenuOpen && !sortDropdownRef.current?.contains(e.target as Node)) {
        setSortMenuOpen(false)
      }
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setExcelMenuOpen(false)
        setSortMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [excelMenuOpen, sortMenuOpen])

  const handleExportExcel = async () => {
    if (!canManageRecruiters) return
    setExcelMenuOpen(false)
    try {
      const { blob, capped, totalResults: exportTotal, exportMax } = await exportRecruitersToExcel(
        buildRecruiterExportParams(listQueryInput)
      )
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `recruiters_export_${Date.now()}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      if (capped && exportTotal != null && exportMax != null) {
        await Swal.fire({
          icon: 'warning',
          title: 'Export capped',
          text: `Export capped at ${exportMax.toLocaleString()} of ${exportTotal.toLocaleString()} matching recruiters.`,
          toast: true,
          position: 'top-end',
          timer: 4500,
          showConfirmButton: false,
        })
      }
    } catch (err) {
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : 'Failed to export recruiters'
      await Swal.fire({ icon: 'error', title: 'Export failed', text: msg })
    }
  }

  const handleDownloadTemplate = async () => {
    if (!canManageRecruiters) return
    setExcelMenuOpen(false)
    try {
      const blob = await downloadRecruitersTemplate()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'recruiters_template.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : 'Failed to download template'
      await Swal.fire({ icon: 'error', title: 'Download failed', text: msg })
    }
  }

  const handleImportExcel = () => {
    if (!canManageRecruiters) return
    excelInputRef.current?.click()
  }

  const onExcelFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setExcelImporting(true)
    setExcelMenuOpen(false)
    try {
      const result = await importRecruitersFromExcel(file)
      await refreshRecruiters()
      const msg = result.summary
        ? `Imported ${result.summary.successful} of ${result.summary.total}. Failed: ${result.summary.failed}`
        : result.message
      await Swal.fire({
        icon: result.summary?.failed ? 'warning' : 'success',
        title: 'Import complete',
        text: msg,
        timer: 3500,
        showConfirmButton: false,
      })
    } catch (err: unknown) {
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : 'Failed to import recruiters'
      await Swal.fire({ icon: 'error', title: 'Import failed', text: msg })
    } finally {
      setExcelImporting(false)
    }
  }

  const handleDeleteSelected = async () => {
    if (!canManageRecruiters) return
    if (selectedRows.size === 0) {
      await Swal.fire({
        icon: 'warning',
        title: 'No selection',
        text: 'Please select at least one recruiter to delete.',
        toast: true,
        position: 'top-end',
        timer: 3000,
        showConfirmButton: false,
      })
      return
    }

    const result = await Swal.fire({
      title: 'Delete selected recruiters?',
      text: `You are about to delete ${selectedRows.size} recruiter(s). This cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: `Yes, delete ${selectedRows.size} recruiter(s)`,
    })

    if (!result.isConfirmed) return

    setBulkDeleting(true)
    try {
      const ids = Array.from(selectedRows)
      const results = await Promise.allSettled(ids.map((id) => deleteUser(id)))
      const succeeded = results.filter((r) => r.status === 'fulfilled').length
      const failed = results.length - succeeded
      setSelectedRows(new Set())
      await refreshRecruiters()
      await Swal.fire({
        icon: failed === results.length ? 'error' : failed > 0 ? 'warning' : 'success',
        title: failed === results.length ? 'Delete failed' : failed > 0 ? 'Partially deleted' : 'Deleted',
        text:
          failed > 0
            ? `${succeeded} deleted, ${failed} failed.`
            : `${succeeded} recruiter(s) deleted.`,
        toast: true,
        position: 'top-end',
        timer: 4000,
        showConfirmButton: false,
        timerProgressBar: true,
      })
    } catch (err) {
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : 'Failed to delete one or more recruiters'
      await Swal.fire({ icon: 'error', title: 'Delete failed', text: msg })
    } finally {
      setBulkDeleting(false)
    }
  }

  // Handle add note - open notes sidebar
  const handleAddNote = (id: string, recruiter?: any) => {
    // Open the notes sidebar
    setNotesRecruiterId(id)
    setTimeout(() => {
      ;(window as any).HSOverlay?.open(document.querySelector('#recruiter-notes-panel'))
    }, 100)
  }

  // Notes loaded from API when sidebar opens for a recruiter
  useEffect(() => {
    if (!notesRecruiterId) return
    let cancelled = false
    listRecruiterNotes(notesRecruiterId)
      .then((apiNotes) => {
        if (cancelled) return
        const mapped: RecruiterNote[] = apiNotes.map((n) => ({
          id: String(n.id ?? (n as { _id?: string })._id ?? ''),
          recruiterId: String(n.recruiter),
          note: n.note,
          visibility: n.visibility,
          postedBy: n.postedByName || 'Unknown',
          postedDate: n.createdAt,
        }))
        setRecruiterNotes((prev) => [
          ...prev.filter((p) => p.recruiterId !== notesRecruiterId),
          ...mapped,
        ])
      })
      .catch(() => {
        if (!cancelled) {
          setRecruiterNotes((prev) => prev.filter((p) => p.recruiterId !== notesRecruiterId))
        }
      })
    return () => { cancelled = true }
  }, [notesRecruiterId])

  // Get notes for a specific recruiter
  const getRecruiterNotes = (recruiterId: string) => {
    return recruiterNotes.filter(note => note.recruiterId === recruiterId).sort((a, b) =>
      new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime()
    )
  }

  // Add a new note
  const handleAddNoteSubmit = async () => {
    if (!notesRecruiterId || !newNote.text.trim()) return
    try {
      const created = await createRecruiterNote(notesRecruiterId, {
        note: newNote.text,
        visibility: newNote.visibility,
      })
      const mapped: RecruiterNote = {
        id: String(created.id ?? (created as { _id?: string })._id ?? ''),
        recruiterId: String(created.recruiter),
        note: created.note,
        visibility: created.visibility,
        postedBy: created.postedByName || auth.user?.name || auth.user?.email || 'Unknown',
        postedDate: created.createdAt,
      }
      setRecruiterNotes((prev) => [...prev, mapped])
      setNewNote({ text: '', visibility: 'public' })
    } catch (err: unknown) {
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : 'Failed to add note'
      await Swal.fire({ icon: 'error', title: 'Failed to add note', text: msg, toast: true, position: 'top-end', timer: 3000, showConfirmButton: false })
    }
  }

  // Delete a note
  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteRecruiterNote(noteId)
      setRecruiterNotes((prev) => prev.filter((note) => note.id !== noteId))
    } catch (err: unknown) {
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : 'Failed to delete note'
      await Swal.fire({ icon: 'error', title: 'Failed to delete note', text: msg, toast: true, position: 'top-end', timer: 3000, showConfirmButton: false })
    }
  }

  // Get recruiter details for the notes sidebar
  const getRecruiterDetails = () => {
    if (!notesRecruiterId) return null
    return recruitersData.find(recruiter => recruiter.id === notesRecruiterId)
  }

  // Generate public URL for recruiter
  const getRecruiterPublicUrl = (recruiterId: string) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/public-recruiter/${recruiterId}`
    }
    const base = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '')
    return `${base}/public-recruiter/${recruiterId}`
  }

  // Download recruiter profile as text file
  const handleDownloadProfile = (recruiter: DisplayRecruiter) => {
    const lines = [
      'RECRUITER PROFILE',
      '=================',
      '',
      `Name: ${recruiter.name}`,
      `Email: ${recruiter.email}`,
      `Phone: ${recruiter.phone || '—'}`,
      `Education: ${recruiter.education || '—'}`,
      `Domain: ${recruiter.domain || '—'}`,
      `Location: ${recruiter.location || '—'}`,
      '',
      'Profile Summary:',
      recruiter.profileSummary || '—',
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `recruiter_${(recruiter.name || 'profile').replace(/\s+/g, '_')}_${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
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
  const handleShareWhatsApp = (recruiter: any) => {
    const url = getRecruiterPublicUrl(recruiter.id)
    const text = `Check out this recruiter: ${recruiter.name} - ${url}`
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(whatsappUrl, '_blank')
  }

  // Handle email share - show input field
  const handleEmailShareClick = () => {
    setShowEmailInput(true)
  }

  // Handle send share email – calls backend share endpoint and surfaces SweetAlert toast
  const handleSendEmail = async () => {
    const recruiterId = shareRecruiter?.id
    const email = shareEmail.trim()
    if (!email || !recruiterId || shareSubmitting) return
    setShareSubmitting(true)
    try {
      await shareRecruiterByEmail(recruiterId, { email })
      setShareEmail('')
      setShowEmailInput(false)
      setShareRecruiter(null)
      Swal.fire({
        icon: 'success',
        title: 'Profile shared',
        text: `Recruiter profile sent to ${email}.`,
        timer: 2500,
        showConfirmButton: false,
      })
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Failed to share',
        text: err?.response?.data?.message || err?.message || 'Failed to send share email.',
      })
    } finally {
      setShareSubmitting(false)
    }
  }

  // Handle share button click
  const handleShareClick = (recruiter: any) => {
    setShareRecruiter(recruiter)
    setShowEmailInput(false)
    setShareEmail('')
    setTimeout(() => {
      ;(window as any).HSOverlay?.open(document.querySelector('#share-recruiter-modal'))
    }, 100)
  }

  // Define columns
  const columns = useMemo(
    () => [
      {
        Header: 'All',
        accessor: 'select',
        id: 'select',
        disableSortBy: true,
        Cell: ({ row }: any) => (
          <input
            className="form-check-input"
            type="checkbox"
            checked={selectedRows.has(row.original.id)}
            onChange={() => handleRowSelect(row.original.id)}
            aria-label={`Select ${row.original.name}`}
          />
        ),
      },
      {
        Header: 'Recruiter Info',
        accessor: 'recruiterInfo',
        Cell: ({ row }: any) => {
          const recruiter = row.original
          return (
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <PersonAvatar
                  name={recruiter.name}
                  email={recruiter.email}
                  imageUrl={recruiter.displayPicture}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div 
                  className="font-semibold text-gray-800 dark:text-white truncate cursor-pointer hover:text-primary"
                  role="button"
                  tabIndex={0}
                  aria-label={`Preview ${recruiter.name}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setPreviewRecruiter(recruiter)
                      setTimeout(() => {
                        ;(window as any).HSOverlay?.open(document.querySelector('#recruiter-preview-panel'))
                      }, 100)
                    }
                  }}
                  onClick={() => {
                    setPreviewRecruiter(recruiter)
                    setTimeout(() => {
                      ;(window as any).HSOverlay?.open(document.querySelector('#recruiter-preview-panel'))
                    }, 100)
                  }}
                >
                  {recruiter.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  <div className="flex items-center gap-1">
                    <i className="ri-phone-line"></i>
                    {recruiter.phone}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
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
        Header: 'Education',
        accessor: 'education',
        Cell: ({ row }: any) => {
          const recruiter = row.original
          // Parse education: split by " - " to separate degree and university
          const educationParts = recruiter.education ? recruiter.education.split(' - ') : ['', '']
          const degree = educationParts[0] || ''
          const university = educationParts.slice(1).join(' - ') || ''
          
          return (
            <div 
              className="text-sm text-gray-800 dark:text-white" 
              style={{ 
                maxWidth: '280px',
                minHeight: '60px',
                lineHeight: '1.5',
                wordBreak: 'break-word'
              }}
              title={recruiter.education}
            >
              <div className="font-medium flex items-center gap-2">
                <i className="ri-graduation-cap-line text-primary"></i>
                <span>{degree}</span>
              </div>
              {university && (
                <div className="text-gray-600 dark:text-gray-400 mt-0.5 flex items-center gap-2">
                  <i className="ri-building-line text-info"></i>
                  <span>{university}</span>
                </div>
              )}
            </div>
          )
        },
      },
      {
        Header: 'Domain',
        accessor: 'domain',
        Cell: ({ row }: any) => {
          const recruiter = row.original
          return (
            <div className="text-sm text-gray-800 dark:text-white flex flex-wrap gap-1">
              {recruiter.domainTags?.length > 0 ? (
                recruiter.domainTags.map((tag: string) => (
                  <span
                    key={tag}
                    className="badge bg-success/10 text-success border border-success/30 px-2 py-1 rounded-md text-xs font-medium"
                  >
                    {tag}
                  </span>
                ))
              ) : (
                <span className="text-gray-500">—</span>
              )}
            </div>
          )
        },
      },
      {
        Header: 'Location',
        accessor: 'location',
        Cell: ({ row }: any) => {
          const recruiter = row.original
          return (
            <div className="text-sm text-gray-800 dark:text-white flex items-center gap-2">
              <i className="ri-map-pin-line text-warning"></i>
              <span>{recruiter.location}</span>
            </div>
          )
        },
      },
      {
        Header: 'Profile Summary',
        accessor: 'profileSummary',
        Cell: ({ row }: any) => {
          const recruiter = row.original
          return (
            <div 
              className="text-sm text-gray-700 dark:text-gray-300" 
              style={{ 
                maxWidth: '320px',
                minHeight: '60px',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: '1.5',
                wordBreak: 'break-word'
              }}
              title={recruiter.profileSummary}
            >
              {recruiter.profileSummary}
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
            {canManageRecruiters && (
            <div className="hs-tooltip ti-main-tooltip">
              <button
                type="button"
                onClick={() => router.push(`/ats/recruiters/edit/${row.original.id}`)}
                className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-info"
                title="Edit Recruiter"
                aria-label={`Edit ${row.original.name}`}
              >
                <i className="ri-pencil-line"></i>
                <span
                  className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700"
                  role="tooltip">
                  Edit Recruiter
                </span>
              </button>
            </div>
            )}
            <div className="hs-tooltip ti-main-tooltip">
              <button
                type="button"
                onClick={() => handleAddNote(row.original.id, row.original)}
                className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-warning"
                title="Add Note"
                aria-label={`Add note for ${row.original.name}`}
              >
                <i className="ri-file-add-line"></i>
                <span
                  className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700"
                  role="tooltip">
                  Add Note
                </span>
              </button>
            </div>
            <div className="hs-tooltip ti-main-tooltip">
              <button
                type="button"
                onClick={() => handleShareClick(row.original)}
                className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-success"
                title="Share Public URL"
                aria-label={`Share ${row.original.name}`}
              >
                <i className="ri-share-line"></i>
                <span
                  className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700"
                  role="tooltip">
                  Share Public URL
                </span>
              </button>
            </div>
            <div className="hs-tooltip ti-main-tooltip">
              <button
                type="button"
                onClick={() => handleDownloadProfile(row.original)}
                className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-primary"
                title="Download Profile"
                aria-label={`Download profile for ${row.original.name}`}
              >
                <i className="ri-download-line"></i>
                <span
                  className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700"
                  role="tooltip">
                  Download Profile
                </span>
              </button>
            </div>
          </div>
        ),
      },
    ],
    [selectedRows, canManageRecruiters, router, handleRowSelect]
  )

  const allNames = filterOptions.names
  const allDomains = filterOptions.domains
  const allEducation = filterOptions.education
  const allLocations = filterOptions.locations
  const allEmails = filterOptions.emails ?? []

  const filteredNames = useMemo(
    () => filterRecruiterFacetOptions(allNames, searchName),
    [allNames, searchName]
  )

  const filteredDomains = useMemo(
    () => filterRecruiterFacetOptions(allDomains, searchDomain),
    [allDomains, searchDomain]
  )

  const filteredEducation = useMemo(
    () => filterRecruiterFacetOptions(allEducation, searchEducation),
    [allEducation, searchEducation]
  )

  const filteredLocations = useMemo(
    () => filterRecruiterFacetOptions(allLocations, searchLocation),
    [allLocations, searchLocation]
  )

  const filteredEmails = useMemo(
    () => filterRecruiterFacetOptions(allEmails, searchEmail),
    [allEmails, searchEmail]
  )

  const displayData = recruitersData

  useEffect(() => {
    if (filters.email === '') setSearchEmail('')
  }, [filters.email])

  const handleMultiSelectChange = (key: 'name' | 'domain' | 'education' | 'location', value: string) => {
    setFilters(prev => {
      const currentArray = prev[key]
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value]
      return { ...prev, [key]: newArray }
    })
  }

  const handleRemoveFilter = (key: 'name' | 'domain' | 'education' | 'location', value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].filter(item => item !== value)
    }))
  }

  const handleResetFilters = () => {
    setFilters({
      name: [],
      domain: [],
      education: [],
      location: [],
      email: ''
    })
    setSearchName('')
    setSearchDomain('')
    setSearchEducation('')
    setSearchLocation('')
    setSearchEmail('')
  }

  const openFilterPanel = useCallback(() => {
    setFilterPanelOpen(true)
    queueMicrotask(() => openHsOverlay('#recruiters-filter-panel'))
  }, [])

  const closeFilterPanel = useCallback(() => {
    setFilterPanelOpen(false)
    closeHsOverlay('#recruiters-filter-panel')
  }, [])

  useEffect(() => {
    if (!filterPanelOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeFilterPanel()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [filterPanelOpen, closeFilterPanel])

  const hasActiveFilters = 
    filters.name.length > 0 ||
    filters.domain.length > 0 ||
    filters.education.length > 0 ||
    filters.location.length > 0 ||
    filters.email !== '' ||
    debouncedSearchQuery.trim() !== ''

  const activeFilterCount = 
    filters.name.length +
    filters.domain.length +
    filters.education.length +
    filters.location.length +
    (filters.email !== '' ? 1 : 0) +
    (debouncedSearchQuery.trim() !== '' ? 1 : 0)

  const tableInstance: any = useTable(
    {
      columns,
      data: displayData,
      manualPagination: true,
      manualSortBy: true,
    },
    useSortBy
  )

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
  } = tableInstance

  // Handle sort selection — server-side via sortBy API param
  const handleSortChange = (sortOption: string) => {
    if (sortOption === '') {
      setSelectedSort('')
      setSortBy(DEFAULT_RECRUITER_SORT_API)
      setCurrentPage(1)
      setSortMenuOpen(false)
      return
    }
    if (isRecruiterSortOption(sortOption)) {
      setSelectedSort(sortOption)
      setSortBy(sortOptionToApiSortBy(sortOption))
      setCurrentPage(1)
      setSortMenuOpen(false)
    }
  }

  // Handle select all checkbox — current page only
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = new Set(displayData.map((recruiter) => recruiter.id))
      setSelectedRows(allIds)
    } else {
      setSelectedRows(new Set())
    }
  }

  // Check if all rows on the current page are selected
  const isAllSelected = selectedRows.size === displayData.length && displayData.length > 0
  const isIndeterminate = selectedRows.size > 0 && selectedRows.size < displayData.length

  return (
    <Fragment>
      <Seo title="Recruiters" />
      <div className="mt-5 grid grid-cols-12 gap-6 h-[calc(100vh-8rem)] sm:mt-6">
        <div className="xl:col-span-12 col-span-12 h-full flex flex-col">
          <div className="box custom-box h-full flex flex-col">
            <div className="box-header flex items-center justify-between flex-wrap gap-4">
              <div className="box-title">
                Recruiters
                <span className="badge bg-light text-default rounded-full ms-1 text-[0.75rem] align-middle">
                  {totalResults}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  className="form-control select-show-page-size !w-auto !py-1 !px-4 !text-[0.75rem] me-2"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                  aria-label="Results per page"
                >
                  {[10, 25, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      Show {size}
                    </option>
                  ))}
                </select>
                <div ref={sortDropdownRef} className="relative me-2">
                  <button
                    type="button"
                    className="ti-btn ti-btn-light !py-1 !px-2 !text-[0.75rem]"
                    id="sort-dropdown-button"
                    aria-haspopup="menu"
                    aria-expanded={sortMenuOpen}
                    aria-label="Sort recruiters"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setSortMenuOpen((prev) => !prev)
                    }}
                  >
                    <i className="ri-arrow-up-down-line font-semibold align-middle me-1"></i>Sort
                    <i className="ri-arrow-down-s-line align-middle ms-1 inline-block"></i>
                  </button>
                  {sortMenuOpen && (
                  <ul className="absolute end-0 top-full z-50 mt-1 min-w-[10rem] rounded-lg border border-defaultborder dark:border-defaultborder/20 bg-white py-1 shadow-lg dark:bg-bodybg" role="menu" aria-labelledby="sort-dropdown-button">
                    <li role="none">
                      <button
                        type="button"
                        className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${selectedSort === 'name-asc' ? 'active' : ''}`}
                        role="menuitem"
                        onClick={() => handleSortChange('name-asc')}
                      >
                        <i className="ri-sort-asc me-2 align-middle inline-block"></i>Name (A-Z)
                      </button>
                    </li>
                    <li role="none">
                      <button
                        type="button"
                        className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${selectedSort === 'name-desc' ? 'active' : ''}`}
                        role="menuitem"
                        onClick={() => handleSortChange('name-desc')}
                      >
                        <i className="ri-sort-desc me-2 align-middle inline-block"></i>Name (Z-A)
                      </button>
                    </li>
                    <li role="none">
                      <button
                        type="button"
                        className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${selectedSort === 'education-asc' ? 'active' : ''}`}
                        role="menuitem"
                        onClick={() => handleSortChange('education-asc')}
                      >
                        <i className="ri-graduation-cap-line me-2 align-middle inline-block"></i>Education (A-Z)
                      </button>
                    </li>
                    <li role="none">
                      <button
                        type="button"
                        className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${selectedSort === 'education-desc' ? 'active' : ''}`}
                        role="menuitem"
                        onClick={() => handleSortChange('education-desc')}
                      >
                        <i className="ri-graduation-cap-line me-2 align-middle inline-block"></i>Education (Z-A)
                      </button>
                    </li>
                    <li role="none">
                      <button
                        type="button"
                        className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${selectedSort === 'location-asc' ? 'active' : ''}`}
                        role="menuitem"
                        onClick={() => handleSortChange('location-asc')}
                      >
                        <i className="ri-map-pin-line me-2 align-middle inline-block"></i>Location (A-Z)
                      </button>
                    </li>
                    <li role="none">
                      <button
                        type="button"
                        className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${selectedSort === 'location-desc' ? 'active' : ''}`}
                        role="menuitem"
                        onClick={() => handleSortChange('location-desc')}
                      >
                        <i className="ri-map-pin-line me-2 align-middle inline-block"></i>Location (Z-A)
                      </button>
                    </li>
                    <li className="ti-dropdown-divider"></li>
                    <li role="none">
                      <button
                        type="button"
                        className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left text-gray-500 dark:text-gray-400"
                        role="menuitem"
                        onClick={() => handleSortChange('')}
                      >
                        <i className="ri-close-line me-2 align-middle inline-block"></i>Clear Sort
                      </button>
                    </li>
                  </ul>
                  )}
                </div>
                {canManageRecruiters && (
                <Link
                  href="/ats/recruiters/add"
                  className="ti-btn ti-btn-primary-full !py-1 !px-2 !text-[0.75rem] me-2"
                >
                  <i className="ri-add-line font-semibold align-middle"></i>Add Recruiter
                </Link>
                )}
                {canManageRecruiters && (
                <div ref={excelDropdownRef} className="relative me-2">
                  <button
                    type="button"
                    className="ti-btn ti-btn-primary !py-1 !px-2 !text-[0.75rem]"
                    id="excel-dropdown-button"
                    aria-haspopup="menu"
                    aria-expanded={excelMenuOpen}
                    aria-label="Excel actions"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setExcelMenuOpen((prev) => !prev)
                    }}
                  >
                    <i className="ri-file-excel-2-line font-semibold align-middle me-1"></i>Excel
                    <i className="ri-arrow-down-s-line align-middle ms-1 inline-block"></i>
                  </button>
                  {excelMenuOpen && (
                  <ul className="absolute end-0 top-full z-50 mt-1 min-w-[10rem] rounded-lg border border-defaultborder dark:border-defaultborder/20 bg-white py-1 shadow-lg dark:bg-bodybg" aria-labelledby="excel-dropdown-button" role="menu">
                    <li>
                      <button
                        type="button"
                        className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left"
                        onClick={handleImportExcel}
                        disabled={excelImporting}
                      >
                        <i className="ri-upload-2-line me-2 align-middle inline-block"></i>
                        {excelImporting ? 'Importing...' : 'Import'}
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
                  )}
                  <input
                    ref={excelInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={onExcelFileChange}
                  />
                </div>
                )}
                <button
                  type="button"
                  className={`ti-btn ti-btn-light !py-1 !px-2 !text-[0.75rem] me-2 ${filterPanelOpen ? 'ring-2 ring-primary/30 bg-primary/[0.06]' : ''}`}
                  aria-expanded={filterPanelOpen}
                  aria-controls="recruiters-filter-panel"
                  onClick={() => (filterPanelOpen ? closeFilterPanel() : openFilterPanel())}
                >
                  <i className={`ri-${filtersLoading ? 'loader-4-line animate-spin' : 'search-line'} font-semibold align-middle me-1`} aria-hidden="true"></i>Search
                  {hasActiveFilters && (
                    <span className="badge bg-primary text-white rounded-full ms-1 text-[0.65rem]">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              
                {canManageRecruiters && (
                <button
                  type="button"
                  className="ti-btn ti-btn-danger !py-1 !px-2 !text-[0.75rem]"
                  onClick={() => { void handleDeleteSelected() }}
                  disabled={selectedRows.size === 0 || bulkDeleting}
                  aria-busy={bulkDeleting}
                  aria-label="Delete selected recruiters"
                >
                  <i className={`ri-${bulkDeleting ? 'loader-4-line animate-spin' : 'delete-bin-line'} font-semibold align-middle me-1`} aria-hidden="true"></i>Delete
                </button>
                )}
              </div>
            </div>
            <div className="box-body !p-0 flex-1 flex flex-col overflow-hidden">
              <div className="table-responsive flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
                <table {...getTableProps()} className="table whitespace-nowrap min-w-full table-striped table-hover table-bordered border-gray-300 dark:border-gray-600">
                  <thead>
                    {headerGroups.map((headerGroup: any, i: number) => (
                      <tr {...headerGroup.getHeaderGroupProps()} className="bg-primary/10 dark:bg-primary/20 border-b border-gray-300 dark:border-gray-600" key={`header-group-${i}`}>
                        {headerGroup.headers.map((column: any, i: number) => (
                          <th
                            {...column.getHeaderProps()}
                            scope="col"
                            className="text-start sticky top-0 z-10 bg-gray-50 dark:bg-black/20"
                            key={column.id || `col-${i}`}
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
                                aria-label="Select all on page"
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
                    {recruitersLoading ? (
                      <tr>
                        <td colSpan={columns.length} className="text-center py-8">
                          <div className="flex flex-col items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                            <span className="text-gray-600 dark:text-gray-400">Loading recruiters...</span>
                          </div>
                        </td>
                      </tr>
                    ) : loadError ? (
                      <tr>
                        <td colSpan={columns.length} className="text-center py-8">
                          <div className="flex flex-col items-center justify-center">
                            <i className="ri-error-warning-line text-4xl text-danger mb-2" aria-hidden="true"></i>
                            <span className="text-gray-600 dark:text-gray-400">{loadError}</span>
                          </div>
                        </td>
                      </tr>
                    ) : displayData.length === 0 ? (
                      <tr>
                        <td colSpan={columns.length} className="text-center py-8">
                          <div className="flex flex-col items-center justify-center">
                            <i className="ri-inbox-line text-4xl text-gray-400 mb-2" aria-hidden="true"></i>
                            <span className="text-gray-600 dark:text-gray-400">No recruiters found</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      displayData.map((recruiter) => (
                        <tr className="border-b border-gray-300 dark:border-gray-600" key={recruiter.id}>
                          {columns.map((col: any) => (
                            <td key={col.id || col.accessor}>
                              {col.id === 'select' ? (
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  checked={selectedRows.has(recruiter.id)}
                                  onChange={() => handleRowSelect(recruiter.id)}
                                  aria-label={`Select ${recruiter.name}`}
                                />
                              ) : col.Cell ? (
                                col.Cell({ row: { original: recruiter } })
                              ) : (
                                recruiter[col.accessor as keyof DisplayRecruiter]
                              )}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="box-footer !border-t-0">
              <ListPagination
                page={currentPage}
                totalPages={totalPages}
                totalResults={totalResults}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                gotoInputId="recruiters-goto-page"
                ariaLabel="Recruiters page navigation"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Panel Offcanvas */}
      <div id="recruiters-filter-panel" className="hs-overlay hidden ti-offcanvas ti-offcanvas-right !z-[105]" tabIndex={-1}>
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="ti-offcanvas-header bg-gray-50 dark:bg-black/20 !py-2.5 shrink-0">
          <h6 className="ti-offcanvas-title text-base font-semibold flex items-center gap-2">
            <i className="ri-search-line text-primary text-base"></i>
            Search Recruiters
          </h6>
          <button 
            type="button" 
            className="ti-btn flex-shrink-0 p-0 transition-none text-gray-500 hover:text-gray-700 focus:ring-gray-400 focus:ring-offset-white dark:text-[#8c9097] dark:text-white/50 dark:hover:text-white/80 dark:focus:ring-white/10 dark:focus:ring-offset-white/10 hover:bg-gray-100 dark:hover:bg-black/40 rounded-md p-1" 
            onClick={handleResetFilters}
          >
            
                <i className="ri-refresh-line me-1.5"></i>Reset
           
          </button>
        </div>
        <div
          data-recruiter-filter-body
          className="ti-offcanvas-body !h-auto !max-h-none min-h-0 flex-1 overflow-y-auto !px-4 !pt-4 !pb-4"
        >
          <div className="space-y-5 pb-2">
            {/* Name Filter */}
            <div className="pb-4 border-b border-gray-200 dark:border-defaultborder/10">
              <label className="form-label mb-2.5 block font-semibold text-sm text-gray-800 dark:text-white flex items-center gap-2">
                <i className="ri-user-line text-primary text-base"></i>
                Name
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400">({allNames.length})</span>
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  className="form-control !py-1.5 !text-sm mb-1.5"
                  placeholder="Search names..."
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                />
                <div className={FACET_LIST_BOX} onWheel={scrollRecruiterFilterBodyIfListEdge}>
                  <div className="space-y-1">
                    {filteredNames.length > 0 ? (
                      filteredNames.map((name) => (
                        <label
                          key={name}
                          className="flex items-center gap-2 cursor-pointer hover:bg-primary/5 dark:hover:bg-primary/10 p-1.5 rounded-md transition-colors"
                        >
                          <input
                            type="checkbox"
                            className="form-check-input !w-3.5 !h-3.5"
                            checked={filters.name.includes(name)}
                            onChange={() => handleMultiSelectChange('name', name)}
                          />
                          <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">{name}</span>
                        </label>
                      ))
                    ) : (
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-3">
                        No names found
                      </div>
                    )}
                  </div>
                </div>
                {filters.name.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {filters.name.map((name) => (
                      <span
                        key={name}
                        className="badge bg-primary/10 text-primary border border-primary/30 px-2 py-1 rounded-full flex items-center gap-1.5 text-xs font-medium shadow-sm"
                      >
                        {name}
                        <button
                          type="button"
                          onClick={() => handleRemoveFilter('name', name)}
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

            {/* Domain Filter */}
            <div className="pb-4 border-b border-gray-200 dark:border-defaultborder/10">
              <label className="form-label mb-2.5 block font-semibold text-sm text-gray-800 dark:text-white flex items-center gap-2">
                <i className="ri-building-2-line text-success text-base"></i>
                Domain
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400">({allDomains.length})</span>
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  className="form-control !py-1.5 !text-sm mb-1.5"
                  placeholder="Search domains..."
                  value={searchDomain}
                  onChange={(e) => setSearchDomain(e.target.value)}
                />
                <div className={FACET_LIST_BOX} onWheel={scrollRecruiterFilterBodyIfListEdge}>
                  <div className="space-y-1">
                    {filteredDomains.length > 0 ? (
                      filteredDomains.map((domain) => (
                        <label
                          key={domain}
                          className="flex items-center gap-2 cursor-pointer hover:bg-success/5 dark:hover:bg-success/10 p-1.5 rounded-md transition-colors"
                        >
                          <input
                            type="checkbox"
                            className="form-check-input !w-3.5 !h-3.5"
                            checked={filters.domain.includes(domain)}
                            onChange={() => handleMultiSelectChange('domain', domain)}
                          />
                          <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">{domain}</span>
                        </label>
                      ))
                    ) : (
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-3">
                        No domains found
                      </div>
                    )}
                  </div>
                </div>
                {filters.domain.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {filters.domain.map((domain) => (
                      <span
                        key={domain}
                        className="badge bg-success/10 text-success border border-success/30 px-2 py-1 rounded-full flex items-center gap-1.5 text-xs font-medium shadow-sm"
                      >
                        {domain}
                        <button
                          type="button"
                          onClick={() => handleRemoveFilter('domain', domain)}
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

            {/* Education Filter */}
            <div className="pb-4 border-b border-gray-200 dark:border-defaultborder/10">
              <label className="form-label mb-2.5 block font-semibold text-sm text-gray-800 dark:text-white flex items-center gap-2">
                <i className="ri-graduation-cap-line text-info text-base"></i>
                Education
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400">({allEducation.length})</span>
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  className="form-control !py-1.5 !text-sm mb-1.5"
                  placeholder="Search education..."
                  value={searchEducation}
                  onChange={(e) => setSearchEducation(e.target.value)}
                />
                <div className={FACET_LIST_BOX} onWheel={scrollRecruiterFilterBodyIfListEdge}>
                  <div className="space-y-1">
                    {filteredEducation.length > 0 ? (
                      filteredEducation.map((edu) => (
                        <label
                          key={edu}
                          className="flex items-center gap-2 cursor-pointer hover:bg-info/5 dark:hover:bg-info/10 p-1.5 rounded-md transition-colors"
                        >
                          <input
                            type="checkbox"
                            className="form-check-input !w-3.5 !h-3.5"
                            checked={filters.education.includes(edu)}
                            onChange={() => handleMultiSelectChange('education', edu)}
                          />
                          <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">{edu}</span>
                        </label>
                      ))
                    ) : (
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-3">
                        No education found
                      </div>
                    )}
                  </div>
                </div>
                {filters.education.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {filters.education.map((edu) => (
                      <span
                        key={edu}
                        className="badge bg-info/10 text-info border border-info/30 px-2 py-1 rounded-full flex items-center gap-1.5 text-xs font-medium shadow-sm"
                      >
                        {edu}
                        <button
                          type="button"
                          onClick={() => handleRemoveFilter('education', edu)}
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

            {/* Location Filter */}
            <div className="pb-4 border-b border-gray-200 dark:border-defaultborder/10">
              <label className="form-label mb-2.5 block font-semibold text-sm text-gray-800 dark:text-white flex items-center gap-2">
                <i className="ri-map-pin-line text-warning text-base"></i>
                Location
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400">({allLocations.length})</span>
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  className="form-control !py-1.5 !text-sm mb-1.5"
                  placeholder="Search locations..."
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                />
                <div className={FACET_LIST_BOX} onWheel={scrollRecruiterFilterBodyIfListEdge}>
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

            {/* Email Filter */}
            <div className="pb-4">
              <label htmlFor="recruiter-filter-email-search" className="form-label mb-2.5 block font-semibold text-sm text-gray-800 dark:text-white flex items-center gap-2">
                <i className="ri-mail-line text-warning text-base"></i>
                Email
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400">({allEmails.length})</span>
              </label>
              <div className="space-y-2">
                <input
                  id="recruiter-filter-email-search"
                  type="search"
                  className="form-control !py-1.5 !text-sm mb-1.5 min-h-11"
                  placeholder="Search emails..."
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchEmail.trim()) {
                      setFilters((prev) => ({ ...prev, email: searchEmail.trim() }))
                    }
                  }}
                  autoComplete="off"
                  aria-label="Search emails"
                />
                <div className={FACET_LIST_BOX} onWheel={scrollRecruiterFilterBodyIfListEdge}>
                  <div className="space-y-1">
                    {filteredEmails.length > 0 ? (
                      filteredEmails.map((email) => (
                        <label
                          key={email}
                          className="flex items-center gap-2 cursor-pointer hover:bg-warning/5 dark:hover:bg-warning/10 min-h-11 p-1.5 rounded-md transition-colors"
                        >
                          <input
                            type="checkbox"
                            className="form-check-input !w-3.5 !h-3.5"
                            checked={filters.email === email}
                            onChange={() =>
                              setFilters((prev) => ({
                                ...prev,
                                email: prev.email === email ? '' : email,
                              }))
                            }
                          />
                          <span className="text-xs text-gray-700 dark:text-gray-300 font-medium break-all">{email}</span>
                        </label>
                      ))
                    ) : (
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-3">
                        No emails found
                      </div>
                    )}
                  </div>
                </div>
                {filters.email !== '' && (
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    <span className="badge bg-warning/10 text-warning border border-warning/30 px-2 py-1 rounded-full flex items-center gap-1.5 text-xs font-medium shadow-sm">
                      {filters.email}
                      <button
                        type="button"
                        onClick={() => setFilters((prev) => ({ ...prev, email: '' }))}
                        className="hover:bg-warning/20 rounded-full p-0.5 transition-colors"
                        aria-label={`Remove email filter ${filters.email}`}
                      >
                        <i className="ri-close-line text-xs"></i>
                      </button>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="ti-offcanvas-footer !relative !bottom-auto shrink-0 px-4 py-3 flex gap-2">
            <button
              type="button"
              className="ti-btn ti-btn-primary flex-1 font-medium shadow-sm hover:shadow-md transition-shadow !py-1.5 !text-sm min-h-11"
              onClick={handleResetFilters}
            >
              <i className="ri-refresh-line me-1.5"></i>Reset
            </button>
            <button
              type="button"
              className="ti-btn ti-btn-light font-medium shadow-sm hover:shadow-md transition-shadow !py-1.5 !text-sm min-h-11"
              onClick={closeFilterPanel}
            >
              <i className="ri-close-line me-1.5"></i>Close
            </button>
        </div>
        </div>
      </div>

      {/* Recruiter Preview Panel (Offcanvas) */}
      <div 
        id="recruiter-preview-panel" 
        className="hs-overlay hidden ti-offcanvas ti-offcanvas-right !z-[105] !max-w-[50rem] lg:!max-w-[60rem]"
        tabIndex={-1}
      >
        <div className="ti-offcanvas-header bg-gray-50 dark:bg-black/20 !py-2.5">
          <h6 className="ti-offcanvas-title text-base font-semibold flex items-center gap-2">
            <i className="ri-user-line text-primary text-base"></i>
            {previewRecruiter?.name || 'Recruiter Profile'}
          </h6>
          <button 
            type="button" 
            className="hs-dropdown-toggle ti-btn flex-shrink-0 p-0 transition-none text-gray-500 hover:text-gray-700 focus:ring-gray-400 focus:ring-offset-white dark:text-[#8c9097] dark:text-white/50 dark:hover:text-white/80 dark:focus:ring-white/10 dark:focus:ring-offset-white/10 hover:bg-gray-100 dark:hover:bg-black/40 rounded-md p-1" 
            data-hs-overlay="#recruiter-preview-panel"
            onClick={() => setPreviewRecruiter(null)}
          >
            <span className="sr-only">Close</span>
            <svg className="w-3.5 h-3.5" width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0.258206 1.00652C0.351976 0.912791 0.479126 0.860131 0.611706 0.860131C0.744296 0.860131 0.871447 0.912791 0.965207 1.00652L3.61171 3.65302L6.25822 1.00652C6.30432 0.958771 6.35952 0.920671 6.42052 0.894471C6.48152 0.868271 6.54712 0.854471 6.61352 0.853901C6.67992 0.853321 6.74572 0.865971 6.80722 0.891111C6.86862 0.916251 6.92442 0.953381 6.97142 1.00032C7.01832 1.04727 7.05552 1.1031 7.08062 1.16454C7.10572 1.22599 7.11842 1.29183 7.11782 1.35822C7.11722 1.42461 7.10342 1.49022 7.07722 1.55122C7.05102 1.61222 7.01292 1.6674 6.96522 1.71352L4.31871 4.36002L6.96522 7.00648C7.05632 7.10078 7.10672 7.22708 7.10552 7.35818C7.10442 7.48928 7.05182 7.61468 6.95912 7.70738C6.86642 7.80018 6.74102 7.85268 6.60992 7.85388C6.47882 7.85498 6.35252 7.80458 6.25822 7.71348L3.61171 5.06702L0.965207 7.71348C0.870907 7.80458 0.744606 7.85498 0.613506 7.85388C0.482406 7.85268 0.357007 7.80018 0.264297 7.70738C0.171597 7.61468 0.119017 7.48928 0.117877 7.35818C0.116737 7.22708 0.167126 7.10078 0.258206 7.00648L2.90471 4.36002L0.258206 1.71352C0.164476 1.61976 0.111816 1.4926 0.111816 1.36002C0.111816 1.22744 0.164476 1.10028 0.258206 1.00652Z" fill="currentColor"/>
            </svg>
          </button>
        </div>
        <div className="ti-offcanvas-body !p-4">
          {previewRecruiter ? (
            <div className="space-y-4">
              {/* Recruiter Header Info */}
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 dark:border-primary/30 rounded-lg">
                <PersonAvatar
                  name={previewRecruiter.name}
                  email={previewRecruiter.email}
                  imageUrl={previewRecruiter.displayPicture}
                  className="w-16 h-16 rounded-full text-base"
                />
                <div className="flex-1">
                  <h6 className="font-bold text-gray-800 dark:text-white text-xl mb-1">{previewRecruiter.name}</h6>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <i className="ri-mail-line"></i>
                      {previewRecruiter.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <i className="ri-phone-line"></i>
                      {previewRecruiter.phone}
                    </span>
                  </div>
                </div>
              </div>

              {/* Key Details Grid */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-black/20 rounded-lg">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Education</div>
                  <div className="font-semibold text-gray-800 dark:text-white">{previewRecruiter.education}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Domain</div>
                  <div className="flex flex-wrap gap-2">
                    {previewRecruiter.domainTags?.length > 0 ? (
                      previewRecruiter.domainTags.map((tag: string) => (
                        <span key={tag} className="badge bg-success/10 text-success border border-success/30 px-2 py-1 rounded-md text-xs font-medium">
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Location</div>
                  <div className="font-semibold text-gray-800 dark:text-white flex items-center gap-1">
                    <i className="ri-map-pin-line text-warning"></i>
                    {previewRecruiter.location}
                  </div>
                </div>
              </div>

              {/* Profile Summary Section */}
              {previewRecruiter.profileSummary && (
                <div className="p-4 border border-gray-200 dark:border-defaultborder/10 rounded-lg">
                  <h6 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                    <i className="ri-file-text-line text-primary"></i>
                    Profile Summary
                  </h6>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {previewRecruiter.profileSummary}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-gray-200 dark:border-defaultborder/10 flex gap-3">
                <button 
                  type="button" 
                  className="hs-dropdown-toggle ti-btn ti-btn-light flex-1" 
                  data-hs-overlay="#recruiter-preview-panel"
                  onClick={() => setPreviewRecruiter(null)}
                >
                  Close
                </button>
                <Link
                  href={`/public-recruiter/${previewRecruiter.id}/preview`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ti-btn ti-btn-primary flex-1 text-center"
                  onClick={() => setPreviewRecruiter(null)}
                >
                  View Full Profile
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">No recruiter selected</div>
          )}
        </div>
      </div>

      {/* Recruiter Notes Panel (Offcanvas) */}
      <div 
        id="recruiter-notes-panel" 
        className="hs-overlay hidden ti-offcanvas ti-offcanvas-right !z-[105]"
        tabIndex={-1}
      >
        <div className="ti-offcanvas-header bg-gray-50 dark:bg-black/20 !py-2.5">
          <h6 className="ti-offcanvas-title text-base font-semibold flex items-center gap-2">
            <i className="ri-file-add-line text-primary text-base"></i>
            {getRecruiterDetails()?.name || 'Recruiter Notes'}
          </h6>
          <button 
            type="button" 
            className="hs-dropdown-toggle ti-btn flex-shrink-0 p-0 transition-none text-gray-500 hover:text-gray-700 focus:ring-gray-400 focus:ring-offset-white dark:text-[#8c9097] dark:text-white/50 dark:hover:text-white/80 dark:focus:ring-white/10 dark:focus:ring-offset-white/10 hover:bg-gray-100 dark:hover:bg-black/40 rounded-md p-1" 
            data-hs-overlay="#recruiter-notes-panel"
            onClick={() => setNotesRecruiterId(null)}
          >
            <span className="sr-only">Close</span>
            <svg className="w-3.5 h-3.5" width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0.258206 1.00652C0.351976 0.912791 0.479126 0.860131 0.611706 0.860131C0.744296 0.860131 0.871447 0.912791 0.965207 1.00652L3.61171 3.65302L6.25822 1.00652C6.30432 0.958771 6.35952 0.920671 6.42052 0.894471C6.48152 0.868271 6.54712 0.854471 6.61352 0.853901C6.67992 0.853321 6.74572 0.865971 6.80722 0.891111C6.86862 0.916251 6.92442 0.953381 6.97142 1.00032C7.01832 1.04727 7.05552 1.1031 7.08062 1.16454C7.10572 1.22599 7.11842 1.29183 7.11782 1.35822C7.11722 1.42461 7.10342 1.49022 7.07722 1.55122C7.05102 1.61222 7.01292 1.6674 6.96522 1.71352L4.31871 4.36002L6.96522 7.00648C7.05632 7.10078 7.10672 7.22708 7.10552 7.35818C7.10442 7.48928 7.05182 7.61468 6.95912 7.70738C6.86642 7.80018 6.74102 7.85268 6.60992 7.85388C6.47882 7.85498 6.35252 7.80458 6.25822 7.71348L3.61171 5.06702L0.965207 7.71348C0.870907 7.80458 0.744606 7.85498 0.613506 7.85388C0.482406 7.85268 0.357007 7.80018 0.264297 7.70738C0.171597 7.61468 0.119017 7.48928 0.117877 7.35818C0.116737 7.22708 0.167126 7.10078 0.258206 7.00648L2.90471 4.36002L0.258206 1.71352C0.164476 1.61976 0.111816 1.4926 0.111816 1.36002C0.111816 1.22744 0.164476 1.10028 0.258206 1.00652Z" fill="currentColor"/>
            </svg>
          </button>
        </div>
        <div className="ti-offcanvas-body !p-4">
          {notesRecruiterId ? (
            <div className="space-y-6">
              {/* Recruiter Info Header */}
              {(() => {
                const recruiterDetails = getRecruiterDetails()
                return recruiterDetails ? (
                  <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 dark:border-primary/30 rounded-lg">
                    <h6 className="font-bold text-gray-800 dark:text-white text-lg mb-2">{recruiterDetails.name}</h6>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <i className="ri-mail-line"></i>
                        {recruiterDetails.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <i className="ri-phone-line"></i>
                        {recruiterDetails.phone}
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
                    onClick={handleAddNoteSubmit}
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
                  Notes ({notesRecruiterId ? getRecruiterNotes(notesRecruiterId).length : 0})
                </h6>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {notesRecruiterId && getRecruiterNotes(notesRecruiterId).length > 0 ? (
                    getRecruiterNotes(notesRecruiterId).map((note, index) => (
                      <div 
                        key={note.id || `note-${index}`}
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
            <div className="text-center py-8 text-gray-500">No recruiter selected</div>
          )}
        </div>
      </div>

      {/* Share Recruiter Modal */}
      <div 
        id="share-recruiter-modal" 
        className="hs-overlay hidden ti-modal"
      >
        <div className="hs-overlay-open:mt-7 ti-modal-box mt-0 ease-out lg:!max-w-lg lg:w-full m-3 lg:!mx-auto">
          <div className="ti-modal-content">
            <div className="ti-modal-header">
              <h6 className="ti-modal-title flex items-center gap-2">
                <i className="ri-share-line text-primary"></i>
                Share Recruiter
              </h6>
              <button 
                type="button" 
                className="hs-dropdown-toggle ti-modal-close-btn" 
                data-hs-overlay="#share-recruiter-modal"
                onClick={() => {
                  setShareRecruiter(null)
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
              {shareRecruiter ? (
                <div className="space-y-4">
                  {/* Recruiter Info */}
                  <div className="p-3 bg-gray-50 dark:bg-black/20 rounded-lg border border-gray-200 dark:border-defaultborder/10">
                    <h6 className="font-semibold text-gray-800 dark:text-white mb-1">{shareRecruiter.name}</h6>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {shareRecruiter.email} • {shareRecruiter.phone}
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
                        value={getRecruiterPublicUrl(shareRecruiter.id)}
                        readOnly
                      />
                      <button
                        type="button"
                        className={`ti-btn ${copied ? 'ti-btn-success' : 'ti-btn-primary'}`}
                        onClick={() => handleCopyUrl(getRecruiterPublicUrl(shareRecruiter.id))}
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
                        onClick={() => handleShareWhatsApp(shareRecruiter)}
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
                              if (e.key === 'Enter' && !shareSubmitting) {
                                handleSendEmail()
                              }
                            }}
                            disabled={shareSubmitting}
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className="ti-btn ti-btn-primary flex-1"
                              onClick={handleSendEmail}
                              disabled={!shareEmail.trim() || shareSubmitting}
                            >
                              {shareSubmitting ? (
                                <>
                                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin me-1.5" />
                                  Sending...
                                </>
                              ) : (
                                <>
                                  <i className="ri-send-plane-line me-1"></i>
                                  Send
                                </>
                              )}
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
                <div className="text-center py-4 text-gray-500">No recruiter selected</div>
              )}
            </div>
            <div className="ti-modal-footer">
              <button 
                type="button" 
                className="ti-btn ti-btn-light" 
                data-hs-overlay="#share-recruiter-modal"
                onClick={() => {
                  setShareRecruiter(null)
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
    </Fragment>
  )
}

export default Recruiters
