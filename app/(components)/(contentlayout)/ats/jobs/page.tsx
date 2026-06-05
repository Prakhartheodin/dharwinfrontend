"use client"
import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment, useMemo, useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTable, useSortBy, useGlobalFilter, usePagination } from 'react-table'
import Link from 'next/link'
import JobsFilterPanel from './_components/JobsFilterPanel'
import JobPreviewPanel from './_components/JobPreviewPanel'
import JobShareModal from './_components/JobShareModal'
import { useFeaturePermissions } from '@/shared/hooks/use-feature-permissions'
import { useAuth } from '@/shared/contexts/auth-context'
import { hasSalesAgentRole } from '@/shared/lib/roles'
import {
  listJobs,
  deleteJob,
  exportJobsToExcel,
  importJobsFromExcel,
  downloadJobsTemplate,
  applyToJob,
  shareJobByEmail,
  listJobBookmarks,
  addJobBookmark,
  deleteJobBookmark,
  getJobStats,
  type JobBookmarkNote,
  type JobStatsResponse,
} from '@/shared/lib/api/jobs'
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
  status: string // 'all' | actual backend status string (Active, Inactive, Draft, Archived, ...)
  postingDate: string
}

const salaryRangesConst = DEFAULT_SALARY_RANGE
const experienceRangesConst = DEFAULT_EXPERIENCE_RANGE

type BookmarkNote = JobBookmarkNote

/** neutral → A–Z → Z–A → neutral (handlers call `clear-sort` via return value). */
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

function nextLocationSortToggle(current: string): 'location-asc' | 'location-desc' | 'clear-sort' {
  if (current === 'location-asc') return 'location-desc'
  if (current === 'location-desc') return 'clear-sort'
  return 'location-asc'
}

function nextExperienceSortToggle(current: string): 'experience-asc' | 'experience-desc' | 'clear-sort' {
  if (current === 'experience-asc') return 'experience-desc'
  if (current === 'experience-desc') return 'clear-sort'
  return 'experience-asc'
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

/** Per-column visibility classes for md→2xl table view (mobile uses card list instead). */
const COLUMN_VISIBILITY: Record<string, string> = {
  checkbox: '',
  jobTitle: '',
  company: '',
  vacancies: 'hidden xl:table-cell',
  postingDate: 'hidden w-0 max-w-0 !p-0 !border-0 overflow-hidden',
  salary: 'hidden md:table-cell',
  jobOrigin: 'hidden xl:table-cell',
  postedBy: 'hidden 2xl:table-cell',
  id: '',
}

const Jobs = () => {
  const { canView, canCreate, canEdit, canDelete, isLoading: permissionsLoading } = useFeaturePermissions("ats.jobs")
  const { roleNames } = useAuth()
  const isSalesAgent = hasSalesAgentRole(roleNames)
  const [jobsData, setJobsData] = useState<DisplayJob[]>([])
  /** In-flight GET /jobs (listing type, etc.). */
  const [jobsListFetching, setJobsListFetching] = useState(true)
  /** After first successful/failed fetch; avoids full-page unmount on refetch so Preline offcanvas backdrops are not orphaned. */
  const jobsEverLoadedRef = useRef(false)
  const [listJobOrigin, setListJobOrigin] = useState<'' | 'internal' | 'external'>('')
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())

  const listJobsParams = useMemo(
    () => ({
      limit: 500 as const,
      jobOrigin:
        listJobOrigin === 'internal' || listJobOrigin === 'external'
          ? listJobOrigin
          : undefined,
    }),
    [listJobOrigin]
  )

  useEffect(() => {
    const ac = new AbortController()
    setJobsListFetching(true)
    listJobs(listJobsParams, { signal: ac.signal })
      .then((res) => {
        if (ac.signal.aborted) return
        setJobsData((res.results ?? []).map(mapJobToDisplay))
      })
      .catch((err: unknown) => {
        const aborted =
          ac.signal.aborted ||
          (err as { code?: string; name?: string })?.code === "ERR_CANCELED" ||
          (err as { name?: string })?.name === "CanceledError"
        if (aborted) return
        setJobsData([])
      })
      .finally(() => {
        if (ac.signal.aborted) return
        jobsEverLoadedRef.current = true
        setJobsListFetching(false)
      })
    return () => ac.abort()
  }, [listJobsParams])

  const [bookmarkedJobs, setBookmarkedJobs] = useState<Set<string>>(new Set())
  const [previewJob, setPreviewJob] = useState<any>(null)
  const [companyModal, setCompanyModal] = useState<any>(null)
  const [bookmarkNotesJobId, setBookmarkNotesJobId] = useState<string | null>(null)
  const [bookmarkNotes, setBookmarkNotes] = useState<BookmarkNote[]>([])
  const [newNote, setNewNote] = useState({ text: '', visibility: 'public' as 'public' | 'private' })
  const [shareJob, setShareJob] = useState<any>(null)
  /** HMAC `ref` for the open share modal — unique to current user + job (30d). */
  const [jobShareRefToken, setJobShareRefToken] = useState<string | null>(null)
  const [jobShareRefLoading, setJobShareRefLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [shareEmail, setShareEmail] = useState('')
  const [shareEmailError, setShareEmailError] = useState<string | null>(null)
  const [showEmailInput, setShowEmailInput] = useState(false)
  /** Default: newest jobs first (matches postingDate / createdAt). */
  const [selectedSort, setSelectedSort] = useState<string>('newest-first')
  const [jobsFilterPanelOpen, setJobsFilterPanelOpen] = useState(false)
  const closeJobsFilterPanel = () => setJobsFilterPanelOpen(false)

  const searchParams = useSearchParams()
  // URL ?status=Draft|Archived|Active|... routes directly into the new status filter.
  // Default keeps prior behavior: show Active jobs only.
  const rawStatusParam = searchParams.get('status')?.trim()
  const initialStatusFilter = rawStatusParam && rawStatusParam.toLowerCase() !== 'all'
    ? (rawStatusParam.charAt(0).toUpperCase() + rawStatusParam.slice(1).toLowerCase())
    : (rawStatusParam?.toLowerCase() === 'all' ? 'all' : 'Active')

  const [filters, setFilters] = useState<FilterState>({
    jobTitle: [],
    company: [],
    experience: [experienceRangesConst.min, experienceRangesConst.max],
    location: [],
    salary: [salaryRangesConst.min, salaryRangesConst.max],
    status: initialStatusFilter,
    postingDate: ''
  })

  // Search states for filter dropdowns
  const [searchJobTitle, setSearchJobTitle] = useState('')
  const [searchCompany, setSearchCompany] = useState('')
  const [searchLocation, setSearchLocation] = useState('')
  /** Quick search — job name only (toolbar input). */
  const [jobNameSearch, setJobNameSearch] = useState('')

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
    listJobApplications({ jobId: previewJob.id, limit: 200 })
      .then((res) => setPreviewJobApplications(res.results ?? []))
      .catch(() => setPreviewJobApplications([]))
      .finally(() => setPreviewJobApplicationsLoading(false))
  }, [previewJob?.id])

  const getOrganisationPhone = (job: any): string => {
    const maybePhone = job?.companyInfo?.phone
    return typeof maybePhone === 'string' ? maybePhone.trim() : ''
  }

  /** Recruiter / job-post verification → POST /bolna/call → BOLNA_AGENT_ID (not applicant agent). */
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
    listCandidates({ limit: 500, ownerUserRole: 'jobSeeker' })
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
    listJobs(listJobsParams)
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
    listJobApplications({ jobId: previewJob.id, limit: 200 })
      .then((res) => setPreviewJobApplications(res.results ?? []))
      .catch(() => setPreviewJobApplications([]))
      .finally(() => setPreviewJobApplicationsLoading(false))
  }, [previewJob?.id])

  const getOrganisationPhone = (job: any): string => {
    const maybePhone = job?.companyInfo?.phone
    return typeof maybePhone === 'string' ? maybePhone.trim() : ''
  }

  /** Recruiter / job-post verification → POST /bolna/call → BOLNA_AGENT_ID (not applicant agent). */
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
    listCandidates({ limit: 500, ownerUserRole: 'jobSeeker' })
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
    listJobs(listJobsParams)
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

  const handleBookmark = (id: string) => {
    if (!bookmarkedJobs.has(id)) {
      const newBookmarked = new Set(bookmarkedJobs)
      newBookmarked.add(id)
      setBookmarkedJobs(newBookmarked)
    }
    setBookmarkNotesJobId(id)
    fetchBookmarkNotes(id)
    setTimeout(() => {
      ;(window as any).HSOverlay?.open(document.querySelector('#bookmark-notes-panel'))
    }, 100)
  }

  const getJobNotes = (jobId: string) => {
    return bookmarkNotes
      .filter((note) => note.jobId === jobId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  const handleAddNote = async () => {
    if (!bookmarkNotesJobId || !newNote.text.trim()) return
    setBookmarkSubmitting(true)
    try {
      const created = await addJobBookmark(bookmarkNotesJobId, {
        note: newNote.text.trim(),
        visibility: newNote.visibility,
      })
      setBookmarkNotes((prev) => [...prev, created])
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
      return '' // Return empty string while loading — prevents accidental clipboard copy of placeholder
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

  // Share on WhatsApp (must use the same `?ref=` as Copy — never the placeholder or bare URL)
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
        console.debug('[share-email] finally — reset sending state')
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
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update status')
    } finally {
      setStatusUpdatingId(null)
    }
  }

  // Handle share button click — fetch HMAC `ref` so the URL is unique to the logged-in user + job
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
              ? `${postedOn} · ${relative}`
              : postedOn
            : ''
          return (
            <div className="min-w-0 max-w-[18rem] sm:max-w-[22rem]">
              <span
                className="font-semibold text-gray-800 dark:text-white cursor-pointer hover:text-primary block leading-snug"
                onClick={openJobPreview}
              >
                {job.jobTitle}
              </span>
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
        Header: 'Posted Date',
        accessor: 'postingDate',
        id: 'postingDate',
        Cell: () => null,
      },
      {
        Header: 'Vacancies',
        accessor: 'vacancies',
        Cell: ({ value }: { value?: number | null }) => {
          if (value == null || value <= 0) {
            return <span className="text-gray-400 dark:text-gray-500">—</span>
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
        Header: 'Vacancies',
        accessor: 'vacancies',
        Cell: ({ value }: { value?: number | null }) => {
          if (value == null || value <= 0) {
            return <span className="text-gray-400 dark:text-gray-500">—</span>
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
        Header: 'Posted Date',
        accessor: 'postingDate',
        id: 'postingDate',
        Cell: ({ row }: any) => {
          const raw: string | undefined = row.original.postingDate
          if (!raw) return <span className="text-defaulttextcolor/50 text-xs italic">—</span>
          const d = new Date(raw)
          if (Number.isNaN(d.getTime())) {
            return <span className="text-sm text-defaulttextcolor">{raw}</span>
          }
          const formatted = d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
          const dayMs = 24 * 60 * 60 * 1000
          const diffDays = Math.floor((Date.now() - d.getTime()) / dayMs)
          let relative = ''
          if (diffDays === 0) relative = 'Today'
          else if (diffDays === 1) relative = 'Yesterday'
          else if (diffDays > 1 && diffDays < 30) relative = `${diffDays}d ago`
          else if (diffDays >= 30 && diffDays < 365) relative = `${Math.floor(diffDays / 30)}mo ago`
          else if (diffDays >= 365) relative = `${Math.floor(diffDays / 365)}y ago`
          return (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-defaulttextcolor whitespace-nowrap">{formatted}</span>
              {relative && (
                <span className="text-[11px] text-defaulttextcolor/60">{relative}</span>
              )}
            </div>
          )
        },
      },
      {
        Header: 'Salary',
        accessor: 'salary',
        disableSortBy: true,
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
        Header: 'Origin',
        accessor: 'jobOrigin',
        disableSortBy: true,
        Cell: ({ row }: any) => {
          const ext = row.original.jobOrigin === 'external'
          return (
            <span
              className={`badge ${ext ? 'bg-info/15 text-info border border-info/30' : 'bg-secondary/15 text-secondary border border-secondary/30'} !rounded-md !px-2 !py-1 text-xs font-medium`}
            >
              {ext ? 'External' : 'Internal'}
            </span>
          )
        },
      },
      {
        Header: 'Posted By',
        accessor: 'postedBy',
        Cell: ({ row }: any) => {
          const name: string | undefined = row.original.postedBy
          const email: string | undefined = row.original.postedByEmail
          if (!name && !email) {
            return <span className="text-defaulttextcolor/50 text-xs italic">—</span>
          }
          const initials = (name ?? email ?? '?')
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((s: string) => s[0]?.toUpperCase() ?? '')
            .join('') || '?'
          return (
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-semibold ring-1 ring-primary/15"
                aria-hidden
              >
                {initials}
              </span>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium text-defaulttextcolor truncate" title={name || email}>
                  {name || email || '—'}
                </span>
                {name && email && (
                  <span className="text-[11px] text-defaulttextcolor/60 truncate" title={email}>
                    {email}
                  </span>
                )}
              </div>
            </div>
          )
        },
      },
      {
        Header: 'Actions',
        accessor: 'id',
        disableSortBy: true,
        Cell: ({ row }: any) => (
          <div className="flex items-center justify-center gap-2">
            {canEdit && !isSalesAgent && row.original.jobOrigin !== 'external' && (
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
            {row.original.jobOrigin !== 'external' && (
              <div className="hs-tooltip ti-main-tooltip">
                <button
                  type="button"
                  onClick={() => handleInitiateCall(row.original)}
                  disabled={!getOrganisationPhone(row.original) || callingJobId === row.original.id}
                  className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Verify job posting: call organisation (recruiter Bolna agent)"
                >
                  <i className="ri-phone-line"></i>
                  <span
                    className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700"
                    role="tooltip">
                    {!getOrganisationPhone(row.original)
                      ? 'Organisation phone required'
                      : callingJobId === row.original.id
                        ? 'Calling...'
                        : 'Verify job post (recruiter call)'}
                  </span>
                </button>
              </div>
            )}
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
      return canDelete && !isSalesAgent ? [checkboxColumn, ...restColumns] : restColumns
    },
    [selectedRows, bookmarkedJobs, canDelete, canEdit, callingJobId, isSalesAgent]
  )

  // Filter data based on filter state
  const filteredData = useMemo(() => {
    return jobsData.filter((job) => {
      const nameQuery = jobNameSearch.trim().toLowerCase()
      if (nameQuery && !job.jobTitle.toLowerCase().includes(nameQuery)) {
        return false
      }

      // Job Title filter (array) — advanced panel only
      if (filters.jobTitle.length > 0 && !filters.jobTitle.some(title =>
        job.jobTitle.toLowerCase().includes(title.toLowerCase())
      )) {
        return false
      }
      
      // Company filter (array)
      if (filters.company.length > 0 && !filters.company.includes(job.company)) {
        return false
      }
      
      // Experience filter (range) — overlap test against numeric job range.
      // Falls back to parsing the formatted string if the numeric range is
      // missing (legacy rows). Jobs with no detectable experience are kept
      // (treated as "unspecified", no exclusion).
      const expMinActive = filters.experience[0] !== experienceRangesConst.min
      const expMaxActive = filters.experience[1] !== experienceRangesConst.max
      if (expMinActive || expMaxActive) {
        let jobMin: number | null = job.minExperienceNum ?? null
        let jobMax: number | null = job.maxExperienceNum ?? null
        if (jobMin == null && jobMax == null && job.experience) {
          const range = job.experience.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/)
          const plus = job.experience.match(/(\d+(?:\.\d+)?)\s*\+/)
          const upTo = job.experience.match(/Up to\s+(\d+(?:\.\d+)?)/i)
          if (range) {
            jobMin = parseFloat(range[1])
            jobMax = parseFloat(range[2])
          } else if (plus) {
            jobMin = parseFloat(plus[1])
            jobMax = experienceRangesConst.max
          } else if (upTo) {
            jobMin = 0
            jobMax = parseFloat(upTo[1])
          }
        }
        if (jobMin != null || jobMax != null) {
          const lo = jobMin ?? 0
          const hi = jobMax ?? experienceRangesConst.max
          if (hi < filters.experience[0] || lo > filters.experience[1]) {
            return false
          }
        }
      }

      // Location filter (array)
      if (filters.location.length > 0 && !filters.location.includes(job.location)) {
        return false
      }

      // Salary filter (range) — overlap test against numeric job range.
      const salMinActive = filters.salary[0] !== salaryRangesConst.min
      const salMaxActive = filters.salary[1] !== salaryRangesConst.max
      if (salMinActive || salMaxActive) {
        let jobMin: number | null = job.salaryMinNum ?? null
        let jobMax: number | null = job.salaryMaxNum ?? null
        if (jobMin == null && jobMax == null && job.salary) {
          const matches = job.salary.match(/[\d,]+(?:\.\d+)?/g)
          if (matches && matches.length >= 1) {
            const nums = matches.map((m) => Number(m.replace(/,/g, ''))).filter((n) => Number.isFinite(n))
            if (nums.length >= 2) {
              jobMin = nums[0]
              jobMax = nums[1]
            } else if (nums.length === 1) {
              jobMin = nums[0]
              jobMax = nums[0]
            }
          }
        }
        if (jobMin != null || jobMax != null) {
          const lo = jobMin ?? 0
          const hi = jobMax ?? Number.MAX_SAFE_INTEGER
          if (hi < filters.salary[0] || lo > filters.salary[1]) {
            return false
          }
        }
      }
      
      // Status filter — exact match against backend status string
      if (filters.status !== 'all') {
        if ((job.status ?? '') !== filters.status) {
          return false
        }
      }
      
      // Posting Date filter
      if (filters.postingDate && job.postingDate !== filters.postingDate) {
        return false
      }
      
      return true
    })
  }, [jobsData, filters, jobNameSearch])

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
  // Status options derived from data so filter always matches what backend actually emits
  // (Active, Inactive, Draft, Archived, Closed, Published, ...).
  const uniqueStatuses = useMemo(
    () => [...new Set(jobsData.map(job => job.status).filter((s): s is string => Boolean(s)))].sort(),
    [jobsData]
  )

  // Suggestion lists only while typing (same pattern as Employees → Name)
  const filteredJobTitles = useMemo(() => {
    const q = searchJobTitle.trim().toLowerCase()
    if (!q) return []
    return uniqueJobTitles.filter((title) => title.toLowerCase().includes(q))
  }, [uniqueJobTitles, searchJobTitle])

  const filteredCompanies = useMemo(() => {
    const q = searchCompany.trim().toLowerCase()
    if (!q) return []
    return uniqueCompanies.filter((company) => company.toLowerCase().includes(q))
  }, [uniqueCompanies, searchCompany])

  const filteredLocations = useMemo(() => {
    const q = searchLocation.trim().toLowerCase()
    if (!q) return []
    return uniqueLocations.filter((location) => location.toLowerCase().includes(q))
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
    setSearchJobTitle('')
    setSearchCompany('')
    setSearchLocation('')
    setListJobOrigin('')
    setFilters({
      jobTitle: [],
      company: [],
      experience: [experienceRangesConst.min, experienceRangesConst.max],
      location: [],
      salary: [salaryRangesConst.min, salaryRangesConst.max],
      status: 'Active',
      postingDate: ''
    })
  }

  /** Default status filter is Active only — counts as “custom” when user picks All / Draft / Archived / etc. */
  const hasActiveFilters =
    listJobOrigin !== '' ||
    filters.jobTitle.length > 0 ||
    filters.company.length > 0 ||
    filters.experience[0] !== experienceRangesConst.min ||
    filters.experience[1] !== experienceRangesConst.max ||
    filters.location.length > 0 ||
    filters.salary[0] !== salaryRangesConst.min ||
    filters.salary[1] !== salaryRangesConst.max ||
    filters.status !== 'Active' ||
    filters.postingDate !== ''

  const activeFilterCount =
    (listJobOrigin !== '' ? 1 : 0) +
    filters.jobTitle.length +
    filters.company.length +
    (filters.experience[0] !== experienceRangesConst.min || filters.experience[1] !== experienceRangesConst.max ? 1 : 0) +
    filters.location.length +
    (filters.salary[0] !== salaryRangesConst.min || filters.salary[1] !== salaryRangesConst.max ? 1 : 0) +
    (filters.status !== 'Active' ? 1 : 0) +
    (filters.postingDate !== '' ? 1 : 0)

  const tableInstance: any = useTable(
    {
      columns,
      data,
      initialState: {
        pageIndex: 0,
        pageSize: 50,
        sortBy: [{ id: 'postingDate', desc: true }],
      },
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
        <div className="container-fluid mt-5 pt-2 sm:mt-6">
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
  
      <div className="mt-5 grid grid-cols-12 gap-6 h-[calc(100vh-8rem)] sm:mt-6">
        <div className="xl:col-span-12 col-span-12 h-full flex flex-col">
          <div className="box custom-box h-full flex flex-col">
            <div className="box-header flex items-center justify-between flex-wrap gap-3 sm:gap-4 !p-3 sm:!p-4">
              <div className="box-title">
                Jobs
                <span className="badge bg-light text-default rounded-full ms-1 text-[0.75rem] align-middle">
                  {filteredData.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center w-full sm:w-auto">
                {/* Job name search + advanced filters drawer */}
                <div className="relative flex-1 min-w-[10rem] sm:min-w-[12rem] sm:max-w-xs me-2">
                  <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-defaulttextcolor/50 text-[0.875rem]" aria-hidden />
                  <input
                    type="search"
                    className="form-control !h-8 !py-1 !ps-8 !pe-3 !text-[0.75rem] !rounded-lg w-full"
                    placeholder="Search by job name…"
                    value={jobNameSearch}
                    onChange={(e) => setJobNameSearch(e.target.value)}
                    aria-label="Search by job name"
                  />
                </div>
                <button
                  type="button"
                  className={`ti-btn ti-btn-light !py-1 !px-2 !text-[0.75rem] me-2 whitespace-nowrap ${jobsFilterPanelOpen ? 'ring-2 ring-primary/30 bg-primary/[0.06]' : ''}`}
                  aria-expanded={jobsFilterPanelOpen}
                  aria-controls="jobs-filter-panel"
                  onClick={() => setJobsFilterPanelOpen((v) => !v)}
                >
                  <i className="ri-filter-3-line font-semibold align-middle me-1"></i>
                  Advanced Search / Apply Filter
                  {hasActiveFilters && (
                    <span className="badge bg-primary text-white rounded-full ms-1 text-[0.65rem]">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
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
                        className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${
                          selectedSort === 'newest-first' || selectedSort === 'date-newest' ? 'active' : ''
                        }`}
                        onClick={() => handleSortChange('newest-first')}
                      >
                        <i className="ri-arrow-down-line me-2 align-middle inline-block"></i>Newest First
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${
                          selectedSort === 'oldest-first' || selectedSort === 'date-oldest' ? 'active' : ''
                        }`}
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
                {canCreate && !isSalesAgent && (
                  <Link
                    href="/ats/jobs/create"
                    className="ti-btn ti-btn-primary-full !py-1 !px-2 !text-[0.75rem] me-2"
                  >
                    <i className="ri-add-line font-semibold align-middle"></i>Create Job
                  </Link>
                )}
                {!isSalesAgent && (
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
                )}
                {canDelete && !isSalesAgent && (
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

            <JobsFilterPanel
              layoutOpen={jobsFilterPanelOpen}
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

            <div className="box-body !p-0 flex-1 flex flex-col overflow-hidden relative">
              {jobsListFetching && jobsEverLoadedRef.current ? (
                <div
                  className="absolute inset-0 z-[100] flex items-center justify-center bg-white/70 dark:bg-black/50 pointer-events-none"
                  aria-busy
                  aria-label="Loading jobs"
                >
                  <div className="animate-spin rounded-full h-9 w-9 border-2 border-primary border-t-transparent" />
                </div>
              ) : null}
              {/* Mobile card list — shown <md; mirrors paginated react-table `page` rows. */}
              <div className="md:hidden flex-1 overflow-y-auto px-3 py-3 space-y-3" style={{ minHeight: 0 }}>
                {page.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-defaultborder/60 dark:border-white/10 py-10 text-center text-sm text-defaulttextcolor/70">
                    No jobs match your filters.
                  </div>
                ) : (
                  page.map((row: any, i: number) => {
                    prepareRow(row)
                    const job = row.original
                    const urgencyBadge = getUrgencyBadge(job.urgency || 'medium')
                    const openPreview = () => {
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
                        ? `${postedOn} · ${relative}`
                        : postedOn
                      : ''
                    return (
                      <div
                        key={row.id || `card-${i}`}
                        className="rounded-xl border border-defaultborder/70 dark:border-white/10 bg-white dark:bg-bodybg shadow-sm hover:shadow transition-shadow p-3.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={openPreview}
                              className="text-left font-semibold text-gray-900 dark:text-white hover:text-primary leading-snug break-words"
                            >
                              {job.jobTitle}
                            </button>
                            <div className="mt-0.5 text-xs text-defaulttextcolor/75 truncate" title={job.company}>
                              {job.company}
                            </div>
                            {(dateLine || locationText) && (
                              <div className="mt-1.5 space-y-0.5 text-[0.7rem] leading-snug text-defaulttextcolor/70">
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
                          {canDelete && !isSalesAgent && (
                            <input
                              className="form-check-input mt-1 shrink-0"
                              type="checkbox"
                              checked={selectedRows.has(job.id)}
                              onChange={() => handleRowSelect(job.id)}
                              aria-label={`Select ${job.jobTitle}`}
                            />
                          )}
                        </div>
                        <div className="mt-2.5 flex flex-wrap gap-1.5 text-[0.7rem]">
                          {job.salary && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-white/[0.05] px-2 py-0.5 text-defaulttextcolor/85">
                              <i className="ri-money-dollar-circle-line text-[0.75rem]" />
                              {job.salary}
                            </span>
                          )}
                          {job.vacancies != null && job.vacancies > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5">
                              <i className="ri-team-line text-[0.75rem]" />
                              {job.vacancies}
                            </span>
                          )}
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
                            job.jobOrigin === 'external'
                              ? 'bg-info/15 text-info border border-info/30'
                              : 'bg-secondary/15 text-secondary border border-secondary/30'
                          }`}>
                            {job.jobOrigin === 'external' ? 'External' : 'Internal'}
                          </span>
                        </div>
                        <div className="mt-3 flex items-center justify-end gap-2">
                          <div className="flex items-center gap-1.5">
                            {canEdit && !isSalesAgent && job.jobOrigin !== 'external' && (
                              <Link
                                href={`/ats/jobs/edit/${job.id}`}
                                className="ti-btn ti-btn-icon ti-btn-sm ti-btn-info"
                                aria-label="Edit job"
                              >
                                <i className="ri-pencil-line" />
                              </Link>
                            )}
                            <button
                              type="button"
                              onClick={() => handleBookmark(job.id, job)}
                              className={`ti-btn ti-btn-icon ti-btn-sm ${bookmarkedJobs.has(job.id) ? 'ti-btn-warning' : 'ti-btn-light'}`}
                              aria-label={bookmarkedJobs.has(job.id) ? 'View notes' : 'Bookmark job'}
                            >
                              <i className={bookmarkedJobs.has(job.id) ? 'ri-bookmark-fill' : 'ri-bookmark-line'} />
                            </button>
                            {job.jobOrigin !== 'external' && (
                              <button
                                type="button"
                                onClick={() => handleInitiateCall(job)}
                                disabled={!getOrganisationPhone(job) || callingJobId === job.id}
                                className="ti-btn ti-btn-icon ti-btn-sm ti-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                aria-label="Call organisation"
                              >
                                <i className="ri-phone-line" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleShareClick(job)}
                              className="ti-btn ti-btn-icon ti-btn-sm ti-btn-success"
                              aria-label="Share job"
                            >
                              <i className="ri-share-line" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              <div className="hidden md:block table-responsive flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
                <table
                  {...getTableProps()}
                  className="table w-full max-w-full whitespace-nowrap table-striped table-hover table-bordered border-gray-300 dark:border-gray-600"
                >
                  <thead>
                    {headerGroups.map((headerGroup: any, i: number) => (
                      <tr
                        {...headerGroup.getHeaderGroupProps()}
                        className="bg-primary/10 dark:bg-primary/20 border-b border-gray-300 dark:border-gray-600"
                        key={`header-group-${i}`}
                      >
                        {headerGroup.headers.map((column: any, i: number) => {
                          const headerProps = column.getHeaderProps()
                          const isCheckboxCol = column.id === 'checkbox'
                          const headerSortTitle = column.id === 'jobTitle'
                          const headerSortCompany = column.id === 'company'
                          const hidePostingCol = column.id === 'postingDate'
                          const clickableHeader = headerSortTitle || headerSortCompany

                          let sortIcon: React.ReactNode = null
                          if (headerSortTitle && (selectedSort === 'title-asc' || selectedSort === 'title-desc')) {
                            sortIcon =
                              selectedSort === 'title-desc' ? (
                                <i className="ri-arrow-down-s-line text-[0.875rem]" aria-hidden />
                              ) : (
                                <i className="ri-arrow-up-s-line text-[0.875rem]" aria-hidden />
                              )
                          } else if (
                            headerSortCompany &&
                            (selectedSort === 'company-asc' || selectedSort === 'company-desc')
                          ) {
                            sortIcon =
                              selectedSort === 'company-desc' ? (
                                <i className="ri-arrow-down-s-line text-[0.875rem]" aria-hidden />
                              ) : (
                                <i className="ri-arrow-up-s-line text-[0.875rem]" aria-hidden />
                              )
                          }

                          return (
                            <th
                              {...headerProps}
                              scope="col"
                              className={`text-start sticky top-0 z-10 bg-gray-50 dark:bg-black/20${hidePostingCol ? ' hidden w-0 max-w-0 !p-0 !border-0 overflow-hidden' : ''}${
                                clickableHeader ? ' cursor-pointer select-none' : ''
                              } ${COLUMN_VISIBILITY[column.id] ?? ''}`}
                              key={column.id || `col-${i}`}
                              {...(clickableHeader
                                ? {
                                    tabIndex: 0,
                                    'aria-sort':
                                      headerSortTitle && selectedSort === 'title-asc'
                                        ? ('ascending' as const)
                                        : headerSortTitle && selectedSort === 'title-desc'
                                          ? ('descending' as const)
                                          : headerSortCompany && selectedSort === 'company-asc'
                                            ? ('ascending' as const)
                                            : headerSortCompany && selectedSort === 'company-desc'
                                              ? ('descending' as const)
                                              : ('none' as const),
                                    onClick: () => {
                                      if (headerSortTitle) {
                                        handleSortChange(nextJobTitleSortToggle(selectedSort))
                                      } else if (headerSortCompany) {
                                        handleSortChange(nextCompanySortToggle(selectedSort))
                                      }
                                    },
                                    onKeyDown: (e: React.KeyboardEvent) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault()
                                        if (headerSortTitle) {
                                          handleSortChange(nextJobTitleSortToggle(selectedSort))
                                        } else if (headerSortCompany) {
                                          handleSortChange(nextCompanySortToggle(selectedSort))
                                        }
                                      }
                                    },
                                    title:
                                      headerSortTitle
                                        ? selectedSort === 'title-asc' || selectedSort === 'title-desc'
                                          ? selectedSort === 'title-desc'
                                            ? 'Click to remove sort'
                                            : 'Toggle to Z–A'
                                          : 'Sort by job title (A–Z first)'
                                        : headerSortCompany
                                          ? selectedSort === 'company-asc' || selectedSort === 'company-desc'
                                            ? selectedSort === 'company-desc'
                                              ? 'Click to remove sort'
                                              : 'Toggle to Z–A'
                                            : 'Sort by company (A–Z first)'
                                          : undefined,
                                  }
                                : {})}
                              style={{
                                ...headerProps.style,
                                position: 'sticky',
                                top: 0,
                                zIndex: 10,
                              }}
                            >
                              {isCheckboxCol ? (
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
                                  <span className={sortIcon ? 'text-defaulttextcolor/80' : ''}>{sortIcon ?? null}</span>
                                </div>
                              )}
                            </th>
                          )
                        })}
                      </tr>
                    ))}
                  </thead>
                  <tbody {...getTableBodyProps()}>
                    {page.map((row: any, i: number) => {
                      prepareRow(row)
                      return (
                        <tr {...row.getRowProps()} className="border-b border-gray-300 dark:border-gray-600" key={row.id || `row-${i}`}>
                          {row.cells.map((cell: any, i: number) => {
                            const hidePostingCell = cell.column.id === 'postingDate'
                            const cellProps = cell.getCellProps()
                            return (
                              <td
                                {...cellProps}
                                className={`${cellProps.className ?? ''} ${hidePostingCell ? ' hidden w-0 max-w-0 !p-0 !border-0 overflow-hidden' : ''} ${COLUMN_VISIBILITY[cell.column.id] ?? ''}`.trim()}
                                key={cell.column.id || `cell-${i}`}
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
            <div className="box-footer !border-t-0">
              <div className="flex items-center flex-wrap gap-4">
                <select
                  className="form-control select-show-page-size !w-auto !py-1 !px-4 !text-[0.75rem]"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  aria-label="Jobs per page"
                >
                  {[10, 25, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      Show {size}
                    </option>
                  ))}
                </select>
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
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Industry</div>
                            <div className="font-semibold text-gray-800 dark:text-white">{industry || '—'}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Company Size</div>
                            <div className="font-semibold text-gray-800 dark:text-white">{size ? `${size} employees` : '—'}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Founded</div>
                            <div className="font-semibold text-gray-800 dark:text-white">{founded || '—'}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Website</div>
                            {website ? (
                              <a
                                href={/^https?:\/\//i.test(website) ? website : `https://${website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-primary hover:underline flex items-center gap-1"
                              >
                                {website}
                                <i className="ri-external-link-line text-sm"></i>
                              </a>
                            ) : (
                              <div className="font-semibold text-gray-800 dark:text-white">—</div>
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
                    disabled={!newNote.text.trim() || bookmarkSubmitting}
                  >
                    <i className="ri-add-line me-1"></i>
                    {bookmarkSubmitting ? 'Saving…' : 'Add Note'}
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
                    <div className="p-6 text-center text-sm text-gray-500">Loading…</div>
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
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">No job selected</div>
          )}
        </div>
      </div>

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
