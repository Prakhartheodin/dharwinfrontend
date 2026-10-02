"use client"
import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment, useMemo, useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTable, useSortBy } from 'react-table'
import Link from 'next/link'
import JobsFilterPanel from './_components/JobsFilterPanel'
import { JobsToolbar } from './_components/JobsToolbar'
import { AppliedFiltersBar } from './_components/AppliedFiltersBar'
import { JobsTable } from './_components/JobsTable'
import { JobsCardList } from './_components/JobsCardList'
import { JobsListSkeleton } from './_components/JobsListSkeleton'
import { JobStatusBadge } from './_components/JobStatusBadge'
import { JobOriginBadge } from './_components/JobOriginBadge'
import { JobRowActions } from './_components/JobRowActions'
import JobPreviewPanel from './_components/JobPreviewPanel'
import JobShareModal from './_components/JobShareModal'
import { HireForecastCell, HireForecastChip } from './_components/HireForecastCell'
import { HireForecastColumnHeader, HireForecastInfoDrawer } from './_components/HireForecastInfoDrawer'
import { JobsPaginationFooter } from './_components/JobsPaginationFooter'
import { JobsListSaveFlash } from './_components/JobsListSaveFlash'
import { useJobsListContainerLayout } from './_components/useJobsListContainerLayout'
import { JOBS_TABLE_EMPTY } from './_components/jobsTableConstants'
import { CompanyWebsiteLink } from '@/shared/components/ats/CompanyWebsiteLink'
import { useFeaturePermissions } from '@/shared/hooks/use-feature-permissions'
import { useAuth } from '@/shared/contexts/auth-context'
import { hasSalesAgentRole } from '@/shared/lib/roles'
import {
  listJobs,
  getJobById,
  getJobFilterOptions,
  deleteJob,
  exportJobsToExcel,
  importJobsFromExcel,
  downloadJobsTemplate,
  applyToJob,
  shareJobByEmail,
  listJobBookmarks,
  addJobBookmark,
  deleteJobBookmark,
  listBookmarkedJobIds,
  unsaveMyJobBookmarks,
  searchJobFacet,
  type JobBookmarkNote,
  type JobFacet,
  type JobFilterOptions,
} from '@/shared/lib/api/jobs'
import {
  buildJobExportParams,
  buildJobListParams,
  readJobFiltersFromQuery,
  writeJobFiltersToQuery,
  type JobListQueryScope,
  type JobSidebarFilters,
} from '@/shared/lib/ats/job-list-filters'
import {
  DEFAULT_JOB_SORT_API,
  sortOptionToApiSortBy,
} from '@/shared/lib/ats/job-list-sort'
import { listCandidates } from '@/shared/lib/api/candidates'
import { listJobApplications, updateJobApplicationStatus, type JobApplication } from '@/shared/lib/api/jobApplications'
import { initiateBolnaCall } from '@/shared/lib/api/bolna'
import { createJobShareReferralLink } from '@/shared/lib/api/referralLeads'
import { getApiErrorMessage } from '@/shared/lib/api/client'
import { mapJobToDisplay, type DisplayJob } from '@/shared/lib/ats/jobMappers'
import {
  formatJobDescriptionForDisplay,
  JOB_DESCRIPTION_PROSE_CLASS,
} from '@/shared/lib/ats/jobDescriptionHtml'
import { useConfirm } from '@/shared/components/ui/useConfirm'

const AsyncSelect = dynamic(() => import('react-select/async'), { ssr: false })

type ApplyCandidateOption = { value: string; label: string }

// Default ranges for filters when no data
const DEFAULT_SALARY_RANGE = { min: 0, max: 200000 }
const DEFAULT_EXPERIENCE_RANGE = { min: 0, max: 20 }

// Jobs data loaded from API in component Ã¢â‚¬â€œ see jobsData state below



interface FilterState extends JobSidebarFilters {}

/**
 * Debounced server-side facet lookup. These lists used to be filtered in the browser out of
 * `getJobFilterOptions`, which only ever returns the first page of jobs -- so past that cap a
 * matching title simply never appeared. Empty query still yields no options, as before.
 */
function useJobFacetSearch(
  facet: JobFacet,
  query: string,
  status: string,
  jobOrigin: '' | 'internal' | 'external'
): { options: string[]; searching: boolean } {
  const q = query.trim()
  // Options are stamped with the request they answered, so a stale or aborted response can
  // never overwrite a newer one, and "searching" is derived rather than set from the effect.
  const key = `${facet}|${status}|${jobOrigin}|${q}`
  const [result, setResult] = useState<{ key: string; options: string[] }>({ key: '', options: [] })

  useEffect(() => {
    if (!q) return undefined

    let cancelled = false
    const ac = new AbortController()
    const timer = window.setTimeout(() => {
      searchJobFacet(facet, q, { status, jobOrigin }, { signal: ac.signal })
        .then((values) => {
          if (!cancelled) setResult({ key, options: values })
        })
        .catch(() => {
          if (!cancelled) setResult({ key, options: [] })
        })
    }, 300)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      ac.abort()
    }
  }, [facet, q, status, jobOrigin, key])

  const ready = result.key === key
  return { options: q && ready ? result.options : [], searching: Boolean(q) && !ready }
}

const salaryRangesConst = DEFAULT_SALARY_RANGE
const experienceRangesConst = DEFAULT_EXPERIENCE_RANGE

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

/** The untouched list. Anything differing from this is what gets written to the URL. */
const DEFAULT_JOB_FILTERS: JobSidebarFilters = {
  jobTitle: [],
  company: [],
  experience: [experienceRangesConst.min, experienceRangesConst.max],
  location: [],
  salary: [salaryRangesConst.min, salaryRangesConst.max],
  salaryNotSpecified: false,
  status: 'Active',
  postingDate: '',
}

type BookmarkNote = JobBookmarkNote

/** neutral Ã¢â€ â€™ AÃ¢â‚¬â€œZ Ã¢â€ â€™ ZÃ¢â‚¬â€œA Ã¢â€ â€™ neutral (handlers call `clear-sort` via return value). */
function nextJobTitleSortToggle(current: string): 'title-asc' | 'title-desc' | 'clear-sort' {
  if (current === 'title-asc') return 'title-desc'
  if (current === 'title-desc') return 'clear-sort'
  return 'title-asc'
}

function nextCompanySortToggle(current: string): 'company-asc' | 'company-desc' | 'clear-sort' {
  if (current === 'company-asc') return 'company-desc'
  if (current === 'company-desc') return 'clear-sort'
  return 'company-asc'
}

function formatPostingDateMeta(raw?: string | null): { formatted: string; relative: string } {
  if (!raw) return { formatted: '', relative: '' }
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return { formatted: raw, relative: '' }
  const formatted = d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
  const dayMs = 24 * 60 * 60 * 1000
  const diffDays = Math.floor((Date.now() - d.getTime()) / dayMs)
  let relative = ''
  if (diffDays === 0) relative = 'Today'
  else if (diffDays === 1) relative = 'Yesterday'
  else if (diffDays > 1 && diffDays < 30) relative = `${diffDays}d ago`
  else if (diffDays >= 30 && diffDays < 365) relative = `${Math.floor(diffDays / 30)}mo ago`
  else if (diffDays >= 365) relative = `${Math.floor(diffDays / 365)}y ago`
  return { formatted, relative }
}

const Jobs = () => {
  const { containerRef: jobsListContainerRef, showTable: showJobsTable, showCards: showJobsCards } =
    useJobsListContainerLayout()
  const { canView, canCreate, canEdit, canDelete, isLoading: permissionsLoading } = useFeaturePermissions("ats.jobs")
  const { confirm: askConfirm, confirmDialog } = useConfirm()
  const { roleNames } = useAuth()
  const isSalesAgent = hasSalesAgentRole(roleNames)
  const [jobsData, setJobsData] = useState<DisplayJob[]>([])
  const [jobsListFetching, setJobsListFetching] = useState(true)
  const jobsEverLoadedRef = useRef(false)
  const fetchGenerationRef = useRef(0)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  // Every list control is seeded once from the URL, so a refresh or a shared link rebuilds
  // the same view. The effect further down writes them back as they change.
  const [listJobOrigin, setListJobOrigin] = useState<'' | 'internal' | 'external'>(() => {
    const raw = searchParams.get('origin')
    return raw === 'internal' || raw === 'external' ? raw : ''
  })
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(() => {
    const raw = Number(searchParams.get('page'))
    return Number.isInteger(raw) && raw >= 1 ? raw : 1
  })
  const [pageSize, setPageSize] = useState(() => {
    const raw = Number(searchParams.get('limit'))
    return PAGE_SIZE_OPTIONS.includes(raw) ? raw : 100
  })
  const [totalResults, setTotalResults] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const initialSortOption = searchParams.get('sort')?.trim() || 'newest-first'
  const [sortBy, setSortBy] = useState<string>(() => sortOptionToApiSortBy(initialSortOption))
  // Seeded alongside `jobNameSearch`; if it started empty the debounce would fire on mount
  // and the "scope changed" effect would throw away the page seeded from ?page=.
  const [debouncedJobNameSearch, setDebouncedJobNameSearch] = useState(
    () => searchParams.get('q')?.trim() || ''
  )
  /** Quick search Ã¢â‚¬â€ job name only (toolbar input). */
  const [jobNameSearch, setJobNameSearch] = useState(() => searchParams.get('q')?.trim() || '')
  /**
   * Toolbar quick-search preview (live, while an option is highlighted) and commit (sticky, once
   * Tab/Enter/click selects one). Preview always wins while active; falls back to the commit, then
   * to the plain typed search. Neither is written to `filters`, filter chips, or the URL.
   */
  const [previewScope, setPreviewScope] = useState<JobListQueryScope | null>(null)
  const [committedScope, setCommittedScope] = useState<JobListQueryScope | null>(null)
  const rawQuickSearchScope = previewScope ?? committedScope
  const [debouncedQuickSearchScope, setDebouncedQuickSearchScope] = useState<JobListQueryScope | null>(null)
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuickSearchScope(rawQuickSearchScope)
    }, 200)
    return () => window.clearTimeout(timer)
  }, [rawQuickSearchScope])
  const [filterOptions, setFilterOptions] = useState<JobFilterOptions>({
    titles: [],
    companies: [],
    locations: [],
    statuses: [],
    experience: { min: DEFAULT_EXPERIENCE_RANGE.min, max: DEFAULT_EXPERIENCE_RANGE.max },
  })

  const [bookmarkedJobs, setBookmarkedJobs] = useState<Set<string>>(new Set())
  const [bookmarkTogglingId, setBookmarkTogglingId] = useState<string | null>(null)
  const bookmarkHydrationRef = useRef(0)
  const bookmarkUserTouchedRef = useRef(false)

  useEffect(() => {
    const generation = ++bookmarkHydrationRef.current
    listBookmarkedJobIds()
      .then((ids) => {
        if (generation !== bookmarkHydrationRef.current || bookmarkUserTouchedRef.current) return
        setBookmarkedJobs(new Set(ids))
      })
      .catch(() => {
        if (generation !== bookmarkHydrationRef.current || bookmarkUserTouchedRef.current) return
        setBookmarkedJobs(new Set())
      })
  }, [])
  const [previewJob, setPreviewJob] = useState<any>(null)
  const [companyModal, setCompanyModal] = useState<any>(null)
  const [bookmarkNotesJobId, setBookmarkNotesJobId] = useState<string | null>(null)
  const [bookmarkNotes, setBookmarkNotes] = useState<BookmarkNote[]>([])
  const [newNote, setNewNote] = useState({ text: '', visibility: 'public' as 'public' | 'private' })
  const [shareJob, setShareJob] = useState<any>(null)
  /** HMAC `ref` for the open share modal Ã¢â‚¬â€ unique to current user + job (30d). */
  const [jobShareRefToken, setJobShareRefToken] = useState<string | null>(null)
  const [jobShareRefLoading, setJobShareRefLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [shareEmail, setShareEmail] = useState('')
  const [shareEmailError, setShareEmailError] = useState<string | null>(null)
  const [showEmailInput, setShowEmailInput] = useState(false)
  /** Default: newest jobs first (matches postingDate / createdAt). */
  const [selectedSort, setSelectedSort] = useState<string>(initialSortOption)
  const [jobsFilterPanelOpen, setJobsFilterPanelOpen] = useState(false)
  const filterButtonRef = useRef<HTMLButtonElement>(null)
  const closeJobsFilterPanel = () => setJobsFilterPanelOpen(false)

  // Seeded from the URL: ?status=Draft|Archived|all routes straight into the status filter,
  // and every other facet restores the same way. Default stays Active-only.
  const [filters, setFilters] = useState<FilterState>(() =>
    readJobFiltersFromQuery(searchParams, DEFAULT_JOB_FILTERS)
  )

  const listQueryInput = useMemo(
    () => ({
      page: currentPage,
      limit: pageSize,
      sortBy,
      search: debouncedJobNameSearch,
      listJobOrigin,
      filters,
      salaryBounds: salaryRangesConst,
      experienceBounds: experienceRangesConst,
      scope: debouncedQuickSearchScope,
    }),
    [currentPage, pageSize, sortBy, debouncedJobNameSearch, listJobOrigin, filters, debouncedQuickSearchScope]
  )

  const fetchJobs = useCallback(async (signal?: AbortSignal) => {
    const generation = ++fetchGenerationRef.current
    setJobsListFetching(true)
    try {
      const params = buildJobListParams(listQueryInput)
      const res = await listJobs({ ...params, view: 'list' }, signal ? { signal } : undefined)
      if (generation !== fetchGenerationRef.current) return
      setJobsData((res.results ?? []).map(mapJobToDisplay))
      setTotalResults(res.totalResults ?? 0)
      const pages = res.totalPages ?? 0
      setTotalPages(pages)
      // A bookmarked ?page= can outlive the rows it pointed at; land on the last real page.
      if (pages > 0 && listQueryInput.page > pages) setCurrentPage(pages)
    } catch (err: unknown) {
      if (generation !== fetchGenerationRef.current) return
      const aborted =
        (err as { code?: string; name?: string })?.code === 'ERR_CANCELED' ||
        (err as { name?: string })?.name === 'CanceledError'
      if (aborted) return
      setJobsData([])
      setTotalResults(0)
      setTotalPages(0)
    } finally {
      if (generation === fetchGenerationRef.current) {
        jobsEverLoadedRef.current = true
        setJobsListFetching(false)
      }
    }
  }, [listQueryInput])

  const fetchFilterOptions = useCallback(async () => {
    try {
      const options = await getJobFilterOptions({
        status: filters.status === 'all' ? 'all' : filters.status,
        ...(debouncedJobNameSearch.trim() && { search: debouncedJobNameSearch.trim() }),
        ...(listJobOrigin === 'internal' || listJobOrigin === 'external'
          ? { jobOrigin: listJobOrigin }
          : {}),
      })
      setFilterOptions(options)
    } catch {
      setFilterOptions({
        titles: [],
        companies: [],
        locations: [],
        statuses: [],
        experience: { min: experienceRangesConst.min, max: experienceRangesConst.max },
      })
    }
  }, [filters.status, debouncedJobNameSearch, listJobOrigin])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedJobNameSearch(jobNameSearch)
    }, 250)
    return () => window.clearTimeout(timer)
  }, [jobNameSearch])

  // Changing what is being listed sends you back to page 1 -- but only on a real change.
  // Compare the scope itself rather than counting effect runs: StrictMode mounts effects
  // twice in dev, so a "skip the first run" flag fires on the second pass and would throw
  // away the page seeded from ?page=.
  const listScopeKey = useMemo(
    () => JSON.stringify([filters, listJobOrigin, debouncedJobNameSearch, sortBy, pageSize, debouncedQuickSearchScope]),
    [filters, listJobOrigin, debouncedJobNameSearch, sortBy, pageSize, debouncedQuickSearchScope]
  )
  const lastListScopeRef = useRef(listScopeKey)
  useEffect(() => {
    if (lastListScopeRef.current === listScopeKey) return
    lastListScopeRef.current = listScopeKey
    setCurrentPage(1)
    setSelectedRows(new Set())
  }, [listScopeKey])

  // Mirror the whole list view into the URL so a refresh or a shared link restores it.
  // Defaults are omitted, so an untouched list keeps a clean /ats/jobs.
  useEffect(() => {
    const next = new URLSearchParams(searchParams.toString())
    writeJobFiltersToQuery(next, filters, DEFAULT_JOB_FILTERS)

    const setParam = (key: string, value: string | null) => {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setParam('page', currentPage > 1 ? String(currentPage) : null)
    setParam('limit', pageSize !== 100 ? String(pageSize) : null)
    setParam('q', jobNameSearch.trim() || null)
    setParam('origin', listJobOrigin || null)
    setParam('sort', selectedSort && selectedSort !== 'newest-first' ? selectedSort : null)

    const qs = next.toString()
    if (qs === searchParams.toString()) return
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [
    currentPage,
    pageSize,
    jobNameSearch,
    listJobOrigin,
    selectedSort,
    filters,
    pathname,
    router,
    searchParams,
  ])

  useEffect(() => {
    setSelectedRows(new Set())
  }, [currentPage])

  useEffect(() => {
    const ac = new AbortController()
    void fetchJobs(ac.signal)
    return () => ac.abort()
  }, [fetchJobs])

  useEffect(() => {
    void fetchFilterOptions()
  }, [fetchFilterOptions])

  // Deep-link: ?view=<jobId> opens preview; fetch by id when job is not on the current page.
  const autoOpenedViewIdRef = useRef<string | null>(null)
  const viewJobIdParam = searchParams.get('view')?.trim() || null
  useEffect(() => {
    if (!viewJobIdParam) {
      autoOpenedViewIdRef.current = null
      return
    }
    if (autoOpenedViewIdRef.current === viewJobIdParam) return

    const match = jobsData.find((job) => job.id === viewJobIdParam)
    if (match) {
      autoOpenedViewIdRef.current = viewJobIdParam
      setPreviewJob(match)
      return
    }

    if (jobsListFetching) return

    let cancelled = false
    void getJobById(viewJobIdParam)
      .then((job) => {
        if (cancelled) return
        autoOpenedViewIdRef.current = viewJobIdParam
        setPreviewJob(mapJobToDisplay(job))
      })
      .catch(() => {
        if (cancelled) return
      })

    return () => {
      cancelled = true
    }
  }, [viewJobIdParam, jobsData, jobsListFetching])

  // The list is fetched with view=list (no descriptions), so the preview loads its job's
  // description on open. `undefined` = not loaded yet; '' = loaded and empty.
  const previewJobId: string | undefined = previewJob?.id
  const previewNeedsDescription = Boolean(previewJobId) && previewJob?.description === undefined
  useEffect(() => {
    if (!previewJobId || !previewNeedsDescription) return undefined
    let cancelled = false
    const settle = (description: string) => {
      if (cancelled) return
      setPreviewJob((cur: any) => (cur && cur.id === previewJobId ? { ...cur, description } : cur))
    }
    getJobById(previewJobId)
      .then((full) => settle(full?.jobDescription ?? ''))
      .catch(() => settle(''))
    return () => {
      cancelled = true
    }
  }, [previewJobId, previewNeedsDescription])

  const [searchJobTitle, setSearchJobTitle] = useState('')
  const [searchCompany, setSearchCompany] = useState('')
  const [searchLocation, setSearchLocation] = useState('')

  // Excel import
  const [excelImporting, setExcelImporting] = useState(false)
  const excelInputRef = React.useRef<HTMLInputElement>(null)

  // Apply candidate to job
  const [applyModalOpen, setApplyModalOpen] = useState(false)
  const [applyJob, setApplyJob] = useState<any>(null)
  const [selectedCandidateId, setSelectedCandidateId] = useState('')
  const [applyCandidateOption, setApplyCandidateOption] = useState<ApplyCandidateOption | null>(null)
  const [applySubmitting, setApplySubmitting] = useState(false)
  const [callingJobId, setCallingJobId] = useState<string | null>(null)
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null)
  const [previewJobApplications, setPreviewJobApplications] = useState<JobApplication[]>([])
  const [previewJobApplicationsLoading, setPreviewJobApplicationsLoading] = useState(false)
  const [jobPreviewTab, setJobPreviewTab] = useState<'details' | 'applicants'>('details')

  // Load applications for the job preview panel when a job is selected
  useEffect(() => {
    if (!previewJob?.id) {
      setPreviewJobApplications([])
      setJobPreviewTab('details')
      return
    }
    setJobPreviewTab('details')
    setPreviewJobApplicationsLoading(true)
    listJobApplications({ jobId: previewJob.id, limit: 100 })
      .then((res) => setPreviewJobApplications(res.results ?? []))
      .catch(() => setPreviewJobApplications([]))
      .finally(() => setPreviewJobApplicationsLoading(false))
  }, [previewJob?.id])

  const getOrganisationPhone = (job: any): string => {
    const maybePhone = job?.companyInfo?.phone
    return typeof maybePhone === 'string' ? maybePhone.trim() : ''
  }

  /** Recruiter / job-post verification Ã¢â€ â€™ POST /bolna/call Ã¢â€ â€™ BOLNA_AGENT_ID (not applicant agent). */
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
      alert(`Job posting verification call started. Execution ID: ${res.executionId}`)
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to initiate call')
    } finally {
      setCallingJobId(null)
    }
  }

  const handleApplyClick = (job: any) => {
    setApplyJob(job)
    setSelectedCandidateId('')
    setApplyCandidateOption(null)
    setApplyModalOpen(true)
  }

  const loadApplyCandidateOptions = useCallback(
    (inputValue: string, callback: (options: ApplyCandidateOption[]) => void) => {
      listCandidates({ search: inputValue || undefined, limit: 20, ownerUserRole: 'jobSeeker' })
        .then((res) => {
          callback(
            (res.results ?? []).map((c: any) => ({
              value: c._id ?? c.id,
              label: c.fullName ?? c.name ?? '',
            }))
          )
        })
        .catch(() => callback([]))
    },
    []
  )
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
    void fetchJobs()
  }

  const handleExportExcel = async () => {
    try {
      const { blob, capped, totalResults: exportTotal, exportMax } = await exportJobsToExcel(
        buildJobExportParams(listQueryInput)
      )
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `jobs_export_${Date.now()}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      if (capped && exportTotal != null && exportMax != null) {
        alert(`Export capped at ${exportMax.toLocaleString()} of ${exportTotal.toLocaleString()} matching jobs.`)
      }
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

  const [bookmarkNotesLoading, setBookmarkNotesLoading] = useState(false)
  const [bookmarkSubmitting, setBookmarkSubmitting] = useState(false)

  const fetchBookmarkNotes = async (jobId: string) => {
    setBookmarkNotesLoading(true)
    try {
      const notes = await listJobBookmarks(jobId)
      setBookmarkNotes((prev) => [
        ...prev.filter((n) => n.jobId !== jobId),
        ...notes,
      ])
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to load notes')
    } finally {
      setBookmarkNotesLoading(false)
    }
  }

  const openBookmarkNotesPanel = (id: string) => {
    setBookmarkNotesJobId(id)
    void fetchBookmarkNotes(id)
    setTimeout(() => {
      ;(window as any).HSOverlay?.open(document.querySelector('#bookmark-notes-panel'))
    }, 100)
  }

  const handleUnsaveBookmark = async (id: string) => {
    bookmarkUserTouchedRef.current = true
    setBookmarkTogglingId(id)
    try {
      await unsaveMyJobBookmarks(id)
      setBookmarkedJobs((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      setBookmarkNotes((prev) => prev.filter((n) => n.jobId !== id))
      if (bookmarkNotesJobId === id) setBookmarkNotesJobId(null)
      ;(window as any).HSOverlay?.close(document.querySelector('#bookmark-notes-panel'))
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to remove bookmark')
    } finally {
      setBookmarkTogglingId(null)
    }
  }

  const handleBookmark = (id: string) => {
    bookmarkUserTouchedRef.current = true
    if (!bookmarkedJobs.has(id)) {
      setBookmarkedJobs((prev) => new Set(prev).add(id))
    }
    openBookmarkNotesPanel(id)
  }

  const getJobNotes = (jobId: string) => {
    return bookmarkNotes
      .filter((note) => note.jobId === jobId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  const handleRemoveBookmarkRequest = async (id: string) => {
    const noteCount = getJobNotes(id).length
    const noteLabel = noteCount === 1 ? '1 note' : `${noteCount} notes`
    const confirmed = await askConfirm({
      title: 'Remove bookmark?',
      message: (
        <>
          This will remove the job from your saved list
          {noteCount > 0
            ? ` and permanently delete ${noteLabel}.`
            : '.'}
          {' '}This action cannot be undone.
        </>
      ),
      confirmLabel: 'Remove bookmark',
      cancelLabel: 'Keep bookmark',
      tone: 'danger',
    })
    if (!confirmed) return
    await handleUnsaveBookmark(id)
  }

  const handleAddNote = async () => {
    if (!bookmarkNotesJobId || !newNote.text.trim()) return
    bookmarkUserTouchedRef.current = true
    setBookmarkSubmitting(true)
    try {
      const created = await addJobBookmark(bookmarkNotesJobId, {
        note: newNote.text.trim(),
        visibility: newNote.visibility,
      })
      setBookmarkNotes((prev) => [...prev, created])
      setBookmarkedJobs((prev) => new Set(prev).add(bookmarkNotesJobId))
      setNewNote({ text: '', visibility: 'public' })
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to add note')
    } finally {
      setBookmarkSubmitting(false)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!bookmarkNotesJobId) return
    if (!confirm('Delete this note?')) return
    try {
      await deleteJobBookmark(bookmarkNotesJobId, noteId)
      setBookmarkNotes((prev) => prev.filter((n) => n.id !== noteId))
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete note')
    }
  }

  // Get job details for the bookmark notes sidebar
  const getBookmarkJobDetails = () => {
    if (!bookmarkNotesJobId) return null
    return jobsData.find(job => job.id === bookmarkNotesJobId)
  }

  // Generate public URL for job (with per-sharer `ref` when loaded)
  const getJobPublicUrl = (jobId: string) => {
    if (jobShareRefLoading && shareJob?.id === jobId) {
      return '' // Return empty string while loading Ã¢â‚¬â€ prevents accidental clipboard copy of placeholder
    }
    const base =
      typeof window !== 'undefined'
        ? `${window.location.origin}/public-job/${jobId}`
        : `${process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3001'}/public-job/${jobId}`
    if (jobShareRefToken && shareJob?.id === jobId) {
      return `${base}?ref=${encodeURIComponent(jobShareRefToken)}`
    }
    return base
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

  // Share on WhatsApp (must use the same `?ref=` as Copy Ã¢â‚¬â€ never the placeholder or bare URL)
  const handleShareWhatsApp = (job: any) => {
    if (!jobShareRefToken || shareJob?.id !== job.id) {
      alert('Your personal tracking link is not ready yet. Wait a moment, or close and open Share again.')
      return
    }
    const base =
      typeof window !== 'undefined'
        ? `${window.location.origin}/public-job/${job.id}`
        : `${process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3001'}/public-job/${job.id}`
    const url = `${base}?ref=${encodeURIComponent(jobShareRefToken)}`
    const text = `Check out this job: ${job.jobTitle} at ${job.company} - ${url}`
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(whatsappUrl, '_blank')
  }

  // Handle send email
  const [shareEmailSending, setShareEmailSending] = useState(false)
  const handleSendEmail = async () => {
    const jobId = String(shareJob?.id ?? shareJob?._id ?? '').trim()
    const to = shareEmail.trim()
    if (!to || !jobId) {
      setShareEmailError(!jobId ? 'Job id is missing. Close and reopen Share.' : 'Enter an email address.')
      return
    }
    setShareEmailError(null)
    setShareEmailSending(true)
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[share-email] request start', { jobId, to })
    }
    try {
      const res = await shareJobByEmail(jobId, to)
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[share-email] response', res)
      }
      setShareEmail('')
      setShowEmailInput(false)
      setShareEmailError(null)
      alert(res?.message || 'Job shared successfully')
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err, 'Failed to share job')
      if (process.env.NODE_ENV !== 'production') {
        console.error('[share-email] request failed', err)
      }
      setShareEmailError(msg)
    } finally {
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[share-email] finally Ã¢â‚¬â€ reset sending state')
      }
      setShareEmailSending(false)
    }
  }

  const handleApplicationStatusChange = async (applicationId: string, status: string) => {
    setStatusUpdatingId(applicationId)
    try {
      await updateJobApplicationStatus(applicationId, { status: status as JobApplication['status'] })
      const newStatus = status as JobApplication['status']
      setPreviewJobApplications((prev) =>
        prev.map((a) => ((a._id ?? a.id) === applicationId ? { ...a, status: newStatus } : a))
      )
    } catch (err: unknown) {
      alert(getApiErrorMessage(err, 'Failed to update application status'))
    } finally {
      setStatusUpdatingId(null)
    }
  }

  // Handle share button click Ã¢â‚¬â€ fetch HMAC `ref` so the URL is unique to the logged-in user + job
  const handleShareClick = (job: any) => {
    setShareJob(job)
    setShowEmailInput(false)
    setShareEmail('')
    setShareEmailError(null)
    setJobShareRefToken(null)
    setJobShareRefLoading(true)
    void createJobShareReferralLink(String(job.id))
      .then(({ ref }) => setJobShareRefToken(ref))
      .catch(() => setJobShareRefToken(null))
      .finally(() => setJobShareRefLoading(false))
    setTimeout(() => {
      ;(window as any).HSOverlay?.open(document.querySelector('#share-job-modal'))
    }, 100)
  }

  // Get salary tier icon and color
  const getSalaryTierIcon = (tier: string) => {
    const icons: { [key: string]: { icon: string; color: string; label: string } } = {
      high: { icon: 'ri-money-dollar-circle-fill', color: 'text-success', label: 'High pay tier' },
      medium: { icon: 'ri-money-dollar-circle-line', color: 'text-info', label: 'Medium pay tier' },
      low: { icon: 'ri-money-cny-circle-line', color: 'text-secondary', label: 'Entry level pay tier' },
    }
    return icons[tier] || icons.medium
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
        Header: () => <span className="sr-only">Select rows</span>,
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
          const openJobPreview = () => {
            setPreviewJob(job)
            setTimeout(() => {
              const HSOverlay = (window as any).HSOverlay
              const HSStaticMethods = (window as any).HSStaticMethods
              if (HSStaticMethods?.autoInit) HSStaticMethods.autoInit()
              if (HSOverlay?.open) HSOverlay.open('#job-preview-panel')
            }, 50)
          }
          const { formatted: postedOn, relative } = formatPostingDateMeta(job.postingDate)
          const locationText = job.location != null ? String(job.location).trim() : ''
          const dateLine = postedOn
            ? relative
              ? `${postedOn} \u00b7 ${relative}`
              : postedOn
            : ''
          return (
            <div className="min-w-0 overflow-hidden">
              <button
                type="button"
                className="font-semibold text-gray-800 dark:text-white text-left w-full hover:text-primary block leading-snug line-clamp-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                title={job.jobTitle}
                onClick={openJobPreview}
              >
                {job.jobTitle}
              </button>
              {(dateLine || locationText) && (
                <div className="mt-1 space-y-0.5 text-[0.7rem] leading-snug text-defaulttextcolor/70">
                  {dateLine && (
                    <div className="flex items-center gap-1 min-w-0">
                      <i className="ri-calendar-line shrink-0 text-[0.75rem]" aria-hidden />
                      <span className="truncate">{dateLine}</span>
                    </div>
                  )}
                  {locationText && (
                    <div className="flex items-start gap-1 min-w-0 whitespace-normal break-words [overflow-wrap:anywhere]">
                      <i className="ri-map-pin-line shrink-0 mt-0.5 text-[0.75rem]" aria-hidden />
                      <span>{locationText}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
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
            setTimeout(() => {
              const HSOverlay = (window as any).HSOverlay
              const HSStaticMethods = (window as any).HSStaticMethods
              if (HSStaticMethods?.autoInit) HSStaticMethods.autoInit()
              if (HSOverlay?.open) HSOverlay.open('#company-info-panel')
            }, 50)
          }
          return (
            <button
              type="button"
              className="font-medium text-gray-800 dark:text-white text-left max-w-full truncate hover:text-primary rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              onClick={handleCompanyClick}
            >
              {job.company}
            </button>
          )
        },
      },
      /* Layout-only column: date shown under job title; hidden via CSS (see jobsTableResponsive). */
      {
        Header: () => <span className="sr-only">Posted date</span>,
        accessor: 'postingDate',
        id: 'postingDate',
        Cell: () => null,
      },
      {
        Header: 'Vacancies',
        accessor: 'vacancies',
        Cell: ({ value }: { value?: number | null }) => {
          if (value == null || value <= 0) {
            return <span className="text-gray-400 dark:text-gray-500">{JOBS_TABLE_EMPTY}</span>
          }
          return (
            <span className="inline-flex items-center gap-1 text-gray-800 dark:text-white">
              <i className="ri-team-line text-primary"></i>
              <span className="font-medium">{value}</span>
            </span>
          )
        },
      },
      {
        Header: HireForecastColumnHeader,
        accessor: 'hireForecast',
        disableSortBy: true,
        Cell: ({ row }: any) => <HireForecastCell forecast={row.original.hireForecast} />,
      },
      {
        Header: 'Salary',
        accessor: 'salary',
        disableSortBy: true,
        Cell: ({ row }: any) => {
          const job = row.original
          const hasSalary = Boolean(job.salary?.trim())
          const salaryLabel = hasSalary ? job.salary : 'Not specified'
          const salaryTierIcon = getSalaryTierIcon(job.salaryTier || 'medium')
          return (
            <div className="flex items-center gap-2">
              <span
                className={
                  hasSalary
                    ? 'font-medium text-gray-800 dark:text-white'
                    : 'text-sm text-gray-400 dark:text-gray-500'
                }
              >
                {salaryLabel}
              </span>
              {hasSalary ? (
                <i
                  className={`${salaryTierIcon.icon} ${salaryTierIcon.color} text-lg`}
                  aria-label={salaryTierIcon.label}
                  role="img"
                />
              ) : null}
            </div>
          )
        },
      },
      {
        Header: 'Status',
        accessor: 'status',
        disableSortBy: true,
        Cell: ({ row }: any) => {
          const status = row.original.status || JOBS_TABLE_EMPTY
          return <JobStatusBadge status={status} />
        },
      },
      {
        Header: 'Origin',
        accessor: 'jobOrigin',
        disableSortBy: true,
        Cell: ({ row }: any) => {
          return <JobOriginBadge jobOrigin={row.original.jobOrigin} />
        },
      },
      {
        Header: 'Actions',
        accessor: 'id',
        disableSortBy: true,
        Cell: ({ row }: any) => {
          const job = row.original
          const phone = getOrganisationPhone(job)
          return (
            <JobRowActions
              job={job}
              canEdit={canEdit}
              isSalesAgent={isSalesAgent}
              bookmarked={bookmarkedJobs.has(job.id)}
              bookmarkToggling={bookmarkTogglingId === job.id}
              calling={callingJobId === job.id}
              canCall={Boolean(phone)}
              callDisabledReason="Organisation phone required"
              onBookmark={() => handleBookmark(job.id)}
              onCall={() => handleInitiateCall(job)}
              onShare={() => handleShareClick(job)}
            />
          )
        },
      },
    ]
      return canDelete && !isSalesAgent ? [checkboxColumn, ...restColumns] : restColumns
    },
    [selectedRows, bookmarkedJobs, bookmarkTogglingId, canDelete, canEdit, callingJobId, isSalesAgent]
  )

  const data = useMemo(() => jobsData, [jobsData])

  const getCompanyJobs = useMemo(() => {
    return (companyName: string) => {
      return jobsData.filter(job => job.company === companyName && job.active === true)
    }
  }, [jobsData])

  const uniqueCompanies = filterOptions.companies
  const uniqueLocations = filterOptions.locations
  const uniqueJobTitles = filterOptions.titles
  const uniqueStatuses = filterOptions.statuses

  const { options: filteredJobTitles, searching: jobTitleSearching } = useJobFacetSearch(
    'title',
    searchJobTitle,
    filters.status,
    listJobOrigin
  )
  const { options: filteredCompanies, searching: companySearching } = useJobFacetSearch(
    'company',
    searchCompany,
    filters.status,
    listJobOrigin
  )
  const { options: filteredLocations, searching: locationSearching } = useJobFacetSearch(
    'location',
    searchLocation,
    filters.status,
    listJobOrigin
  )

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
    setSearchJobTitle('')
    setSearchCompany('')
    setSearchLocation('')
    setListJobOrigin('')
    // Same object the URL codec treats as "default", so a reset always produces a clean URL.
    setFilters({
      ...DEFAULT_JOB_FILTERS,
      jobTitle: [],
      company: [],
      location: [],
      experience: [...DEFAULT_JOB_FILTERS.experience],
      salary: [...DEFAULT_JOB_FILTERS.salary],
    })
  }

  /** Default status filter is Active only Ã¢â‚¬â€ counts as Ã¢â‚¬Å“customÃ¢â‚¬Â when user picks All / Draft / Archived / etc. */
  const hasActiveFilters =
    listJobOrigin !== '' ||
    filters.jobTitle.length > 0 ||
    filters.company.length > 0 ||
    filters.experience[0] !== experienceRangesConst.min ||
    filters.experience[1] !== experienceRangesConst.max ||
    filters.location.length > 0 ||
    filters.salaryNotSpecified ||
    (!filters.salaryNotSpecified &&
      (filters.salary[0] !== salaryRangesConst.min ||
        filters.salary[1] !== salaryRangesConst.max)) ||
    filters.status !== 'Active' ||
    filters.postingDate !== ''

  const activeFilterCount =
    (listJobOrigin !== '' ? 1 : 0) +
    filters.jobTitle.length +
    filters.company.length +
    (filters.experience[0] !== experienceRangesConst.min || filters.experience[1] !== experienceRangesConst.max ? 1 : 0) +
    filters.location.length +
    (filters.salaryNotSpecified ? 1 : 0) +
    (!filters.salaryNotSpecified &&
    (filters.salary[0] !== salaryRangesConst.min || filters.salary[1] !== salaryRangesConst.max)
      ? 1
      : 0) +
    (filters.status !== 'Active' ? 1 : 0) +
    (filters.postingDate !== '' ? 1 : 0)

  const tableInstance: any = useTable(
    {
      columns,
      data,
      manualSortBy: true,
      disableSortBy: true,
    },
    useSortBy
  )

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    rows,
  } = tableInstance

  const handleSortChange = (sortOption: string) => {
    setSelectedSort(sortOption)
    if (sortOption === 'clear-sort') {
      setSortBy(DEFAULT_JOB_SORT_API)
      return
    }
    setSortBy(sortOptionToApiSortBy(sortOption))
  }

  // Select-all applies to the current page only (matches Students).
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const pageIds = new Set(jobsData.map((job) => job.id))
      setSelectedRows(pageIds)
    } else {
      setSelectedRows(new Set())
    }
  }

  const isAllSelected = jobsData.length > 0 && jobsData.every((job) => selectedRows.has(job.id))
  const isIndeterminate =
    jobsData.some((job) => selectedRows.has(job.id)) && !isAllSelected

  /** Preline only binds toggles that exist during autoInit; toolbar mounts after jobs load, so re-init then. */
  useEffect(() => {
    if (permissionsLoading || !canView) return
    if (jobsListFetching || !jobsEverLoadedRef.current) return
    const run = () => {
      try {
        ;(window as unknown as { HSStaticMethods?: { autoInit?: () => void } }).HSStaticMethods?.autoInit?.()
      } catch {
        /* ignore */
      }
    }
    const stableRun = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(run)
      })
    }
    if (typeof window !== 'undefined' && (window as unknown as { HSStaticMethods?: { autoInit?: () => void } }).HSStaticMethods?.autoInit) {
      stableRun()
      return
    }
    void import('preline/preline').then(stableRun)
  }, [permissionsLoading, jobsListFetching, canView])

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

  /** Full-page spinner only before the first load; refetches keep layout mounted (fixes stuck Preline overlay when changing listing type in the filter panel). */
  if (jobsListFetching && !jobsEverLoadedRef.current) {
    return (
      <Fragment>
        <Seo title="Jobs" />
        <div className="container-fluid mt-2 pt-2 sm:mt-3">
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mx-auto mb-3" />
              <p className="text-defaulttextcolor dark:text-white/70">Loading jobs...</p>
            </div>
          </div>
        </div>
      </Fragment>
    )
  }

  return (
    <Fragment>
  
      <div className="jobs-page-shell jobs-page-container mt-2 grid w-full grid-cols-12 gap-0 sm:mt-3 min-w-0 max-w-full overflow-x-hidden">
        <div className="xl:col-span-12 col-span-12 h-full min-h-0 min-w-0 max-w-full flex flex-col">
          <div className="box custom-box h-full min-h-0 min-w-0 max-w-full flex flex-col overflow-hidden">
            <JobsListSaveFlash />
            <JobsToolbar
              totalResults={totalResults}
              jobNameSearch={jobNameSearch}
              setJobNameSearch={setJobNameSearch}
              filtersStatus={filters.status}
              listJobOrigin={listJobOrigin}
              jobsListFetching={jobsListFetching}
              setPreviewScope={setPreviewScope}
              setCommittedScope={setCommittedScope}
              committedScope={committedScope}
              jobsFilterPanelOpen={jobsFilterPanelOpen}
              onToggleFilters={() => setJobsFilterPanelOpen((v) => !v)}
              filterButtonRef={filterButtonRef}
              hasActiveFilters={hasActiveFilters}
              activeFilterCount={activeFilterCount}
              pageSize={pageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageSizeChange={setPageSize}
              selectedSort={selectedSort}
              onSortChange={handleSortChange}
              canCreate={canCreate}
              isSalesAgent={isSalesAgent}
              canDelete={canDelete}
              selectedCount={selectedRows.size}
              onDeleteSelected={handleDeleteSelected}
              excelImporting={excelImporting}
              onImportExcel={handleImportExcel}
              onExportExcel={handleExportExcel}
              onDownloadTemplate={handleDownloadTemplate}
              showExcelMenu={!isSalesAgent}
            />
            <AppliedFiltersBar
              filters={filters}
              setFilters={setFilters}
              listJobOrigin={listJobOrigin}
              setListJobOrigin={setListJobOrigin}
              committedScope={committedScope}
              setCommittedScope={setCommittedScope}
              setPreviewScope={setPreviewScope}
              salaryRangesConst={salaryRangesConst}
              experienceRangesConst={experienceRangesConst}
              onClearAll={handleResetFilters}
              hasActiveFilters={hasActiveFilters}
            />
            <input
              ref={excelInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={onExcelFileChange}
            />
            <JobsFilterPanel
              layoutOpen={jobsFilterPanelOpen}
              restoreFocusRef={filterButtonRef}
              onCloseLayout={closeJobsFilterPanel}
              listJobOrigin={listJobOrigin}
              setListJobOrigin={setListJobOrigin}
              filters={filters}
              setFilters={setFilters}
              searchJobTitle={searchJobTitle}
              setSearchJobTitle={setSearchJobTitle}
              searchCompany={searchCompany}
              setSearchCompany={setSearchCompany}
              searchLocation={searchLocation}
              setSearchLocation={setSearchLocation}
              filteredJobTitles={filteredJobTitles}
              filteredCompanies={filteredCompanies}
              filteredLocations={filteredLocations}
              jobTitleSearching={jobTitleSearching}
              companySearching={companySearching}
              locationSearching={locationSearching}
              uniqueJobTitles={uniqueJobTitles}
              uniqueCompanies={uniqueCompanies}
              uniqueLocations={uniqueLocations}
              uniqueStatuses={uniqueStatuses}
              handleMultiSelectChange={handleMultiSelectChange}
              handleRemoveFilter={handleRemoveFilter}
              handleSalaryRangeChange={handleSalaryRangeChange}
              handleExperienceRangeChange={handleExperienceRangeChange}
              handleResetFilters={handleResetFilters}
              salaryRangesConst={salaryRangesConst}
              experienceRangesConst={experienceRangesConst}
            />

            <div className="box-body !p-0 flex-1 flex flex-col overflow-hidden relative min-w-0 max-w-full w-full">
              {jobsListFetching && jobsEverLoadedRef.current ? (
                <div className="absolute inset-0 z-[20] bg-white/60 dark:bg-black/40 pointer-events-none">
                  <JobsListSkeleton />
                </div>
              ) : null}
              {/* Card list when jobs-list container is narrow; see globals.scss @container jobs-list. */}
              <div
                ref={jobsListContainerRef}
                className="jobs-list-container flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col overflow-hidden"
              >
              {showJobsCards ? (
                <JobsCardList
                  rows={rows}
                  prepareRow={prepareRow}
                  emptyMessage="No jobs found."
                  canDelete={canDelete}
                  isSalesAgent={isSalesAgent}
                  selectedRows={selectedRows}
                  onRowSelect={handleRowSelect}
                  onOpenPreview={(job) => {
                    setPreviewJob(job)
                    setTimeout(() => {
                      const HSOverlay = (window as any).HSOverlay
                      const HSStaticMethods = (window as any).HSStaticMethods
                      if (HSStaticMethods?.autoInit) HSStaticMethods.autoInit()
                      if (HSOverlay?.open) HSOverlay.open('#job-preview-panel')
                    }, 50)
                  }}
                  formatPostingDateMeta={formatPostingDateMeta}
                  canEdit={canEdit}
                  bookmarkedJobs={bookmarkedJobs}
                  bookmarkTogglingId={bookmarkTogglingId}
                  callingJobId={callingJobId}
                  getOrganisationPhone={getOrganisationPhone}
                  onBookmark={handleBookmark}
                  onInitiateCall={handleInitiateCall}
                  onShare={handleShareClick}
                  onClearFilters={hasActiveFilters ? handleResetFilters : undefined}
                  canCreate={canCreate && !isSalesAgent}
                />
              ) : null}

              {showJobsTable ? (
                <JobsTable
                  getTableProps={getTableProps}
                  getTableBodyProps={getTableBodyProps}
                  headerGroups={headerGroups}
                  rows={rows}
                  prepareRow={prepareRow}
                  hasCheckboxColumn={canDelete && !isSalesAgent}
                  selectedSort={selectedSort}
                  onSortChange={handleSortChange}
                  nextJobTitleSortToggle={nextJobTitleSortToggle}
                  nextCompanySortToggle={nextCompanySortToggle}
                  isAllSelected={isAllSelected}
                  isIndeterminate={isIndeterminate}
                  onSelectAll={handleSelectAll}
                  emptyMessage="No jobs found."
                  onClearFilters={hasActiveFilters ? handleResetFilters : undefined}
                  canCreate={canCreate && !isSalesAgent}
                />
              ) : null}
              </div>
            </div>
            <div className="jobs-surface-x jobs-list-footer shrink-0 min-w-0 max-w-full overflow-visible">
              <JobsPaginationFooter
                page={currentPage}
                totalPages={totalPages}
                totalResults={totalResults}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                gotoInputId="jobs-goto-page"
                hideWhenSinglePage
              />
            </div>
          </div>
        </div>
      </div>

      {/* Company Info Panel (Offcanvas) */}
      <div
        id="company-info-panel"
        className="hs-overlay hidden ti-offcanvas ti-offcanvas-right !z-[105] !w-full sm:!w-auto sm:!max-w-[40rem] md:!max-w-[50rem] lg:!max-w-[60rem]"
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
                    {(() => {
                      const ci: Record<string, unknown> = companyModal.companyInfo as Record<string, unknown>
                      const industry = (ci.industry as string) || ''
                      const size = (ci.companySize as string) || (ci.size as string) || ''
                      const founded = ci.founded != null ? String(ci.founded) : ''
                      const website = (ci.website as string) || ''
                      return (
                        <div className="mt-4 grid min-w-0 grid-cols-2 gap-4 md:grid-cols-4">
                          <div className="min-w-0">
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Industry</div>
                            <div className="font-semibold text-gray-800 dark:text-white break-words">{industry || 'Ã¢â‚¬â€'}</div>
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Company Size</div>
                            <div className="font-semibold text-gray-800 dark:text-white break-words">{size ? `${size} employees` : 'Ã¢â‚¬â€'}</div>
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Founded</div>
                            <div className="font-semibold text-gray-800 dark:text-white">{founded || 'Ã¢â‚¬â€'}</div>
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Website</div>
                            {website ? (
                              <CompanyWebsiteLink
                                website={website}
                                className="font-semibold"
                                showExternalIcon
                              />
                            ) : (
                              <div className="font-semibold text-gray-800 dark:text-white">Ã¢â‚¬â€</div>
                            )}
                          </div>
                        </div>
                      )
                    })()}
                  </div>

                  {/* Company Description */}
                  {companyModal.companyInfo.description && (
                    <div className="p-4 border border-gray-200 dark:border-defaultborder/10 rounded-lg bg-gray-50 dark:bg-black/20">
                      <h6 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                        <i className="ri-file-text-line text-primary"></i>
                        About Company
                      </h6>
                      <div
                        className={`${JOB_DESCRIPTION_PROSE_CLASS} text-sm`}
                        dangerouslySetInnerHTML={{
                          __html: formatJobDescriptionForDisplay(
                            String(companyModal.companyInfo.description)
                          ),
                        }}
                      />
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
                                  const HSOverlay = (window as any).HSOverlay
                                  if (HSOverlay?.close) HSOverlay.close('#company-info-panel')
                                  setPreviewJob(job)
                                  setTimeout(() => {
                                    if (HSOverlay?.open) HSOverlay.open('#job-preview-panel')
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
                                      const HSOverlay = (window as any).HSOverlay
                                      if (HSOverlay?.close) HSOverlay.close('#company-info-panel')
                                      setPreviewJob(job)
                                      setTimeout(() => {
                                        if (HSOverlay?.open) HSOverlay.open('#job-preview-panel')
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

      <JobPreviewPanel
        previewJob={previewJob}
        setPreviewJob={setPreviewJob}
        bookmarkedJobs={bookmarkedJobs}
        handleBookmark={handleBookmark}
        getUrgencyBadge={getUrgencyBadge}
        getJobTypeInfo={getJobTypeInfo}
        getSalaryTierBadge={getSalaryTierBadge}
        setCompanyModal={setCompanyModal}
        jobPreviewTab={jobPreviewTab}
        setJobPreviewTab={setJobPreviewTab}
        previewJobApplications={previewJobApplications}
        previewJobApplicationsLoading={previewJobApplicationsLoading}
        handleApplicationStatusChange={handleApplicationStatusChange}
        statusUpdatingId={statusUpdatingId}
        handleInitiateCall={handleInitiateCall}
        callingJobId={callingJobId}
        getOrganisationPhone={getOrganisationPhone}
        handleApplyClick={handleApplyClick}
      />

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
                    <h6 className="mb-2 min-w-0 break-words font-bold text-gray-800 dark:text-white text-lg">
                      {jobDetails.jobTitle}
                    </h6>
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
                    disabled={!newNote.text.trim() || bookmarkSubmitting}
                  >
                    <i className="ri-add-line me-1"></i>
                    {bookmarkSubmitting ? 'SavingÃ¢â‚¬Â¦' : 'Add Note'}
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
                  {bookmarkNotesLoading ? (
                    <div className="p-6 text-center text-sm text-gray-500">LoadingÃ¢â‚¬Â¦</div>
                  ) : getJobNotes(bookmarkNotesJobId).length > 0 ? (
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
                              <div>{new Date(note.createdAt).toLocaleDateString()}</div>
                              <div>{new Date(note.createdAt).toLocaleTimeString()}</div>
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

              {bookmarkedJobs.has(bookmarkNotesJobId) && (
                <div className="border-t border-gray-200 pt-4 dark:border-defaultborder/10">
                  <button
                    type="button"
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40 disabled:opacity-60"
                    onClick={() => void handleRemoveBookmarkRequest(bookmarkNotesJobId)}
                    disabled={bookmarkTogglingId === bookmarkNotesJobId}
                    aria-label="Remove bookmark and delete all notes"
                  >
                    <i className="ri-bookmark-off-line text-base" aria-hidden />
                    {bookmarkTogglingId === bookmarkNotesJobId ? 'Removing bookmarkÃ¢â‚¬Â¦' : 'Remove bookmark'}
                  </button>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Removes this job from your saved list and deletes all notes.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">No job selected</div>
          )}
        </div>
      </div>

      {confirmDialog}

      <JobShareModal
        shareJob={shareJob}
        setShareJob={setShareJob}
        copied={copied}
        shareEmail={shareEmail}
        setShareEmail={setShareEmail}
        showEmailInput={showEmailInput}
        setShowEmailInput={setShowEmailInput}
        getJobPublicUrl={getJobPublicUrl}
        handleCopyUrl={handleCopyUrl}
        handleShareWhatsApp={handleShareWhatsApp}
        handleSendEmail={handleSendEmail}
        shareEmailSending={shareEmailSending}
        shareEmailError={shareEmailError}
        personalLinkLoading={jobShareRefLoading}
        shareReferralReady={Boolean(jobShareRefToken)}
        onCloseShareModal={() => {
          setJobShareRefToken(null)
          setJobShareRefLoading(false)
        }}
      />

      <HireForecastInfoDrawer />

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
              <AsyncSelect
                isClearable
                cacheOptions
                defaultOptions
                loadOptions={loadApplyCandidateOptions}
                placeholder="-- Select Candidate --"
                value={applyCandidateOption}
                onChange={(opt) => {
                  const option = opt as ApplyCandidateOption | null
                  setApplyCandidateOption(option)
                  setSelectedCandidateId(option?.value ?? '')
                }}
              />
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
