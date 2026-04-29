"use client"
import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'

const DatePicker = dynamic(() => import('react-datepicker').then((mod) => mod.default), { ssr: false })
import { createPortal } from 'react-dom'
import { useTable, useSortBy, useGlobalFilter, usePagination } from 'react-table'
import Link from 'next/link'
import CandidatesFilterPanel from './_components/CandidatesFilterPanel'
import {
  listCandidates,
  getCandidateFilterAgents,
  createCandidate as createCandidateApi,
  mapCandidateToDisplay,
  getCandidate,
  getCandidateDocuments,
  getDocumentDownloadUrl,
  getSalarySlipDownloadUrl,
  addSalarySlipToCandidate,
  updateCandidate,
  updateSalarySlip,
  deleteSalarySlip,
  shareCandidateProfile,
  exportCandidateProfile,
  exportAllCandidates,
  type ExportAllCandidatesParams,
  resendVerificationEmail,
  addNoteToCandidate,
  addFeedbackToCandidate,
  deleteCandidate,
  uploadDocument,
  assignRecruiterToCandidate,
  updateJoiningDate,
  updateResignDate,
  updateWeekOff,
  getCandidateWeekOff,
  assignShiftToCandidates,
  verifyDocument,
  getDocumentStatus,
  normalizeCandidateSkillsStructured,
  type CandidateDocument,
  type AgentOption,
} from '@/shared/lib/api/candidates'
import { resolveDownloadUrlForBrowser } from '@/shared/lib/api/client'
import { listUsers } from '@/shared/lib/api/users'
import { getAllShifts } from '@/shared/lib/api/shifts'
import { downloadCandidateExcelTemplate } from '@/shared/lib/candidate-excel-template'
import Swal from 'sweetalert2'
import { AxiosError } from 'axios'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/shared/contexts/auth-context'
import CandidateActionModals from './_components/CandidateActionModals'
import CandidateShareModal from './_components/CandidateShareModal'
import CandidateAttendanceOverlay from './_components/CandidateAttendanceOverlay'
import { canEditCandidateJoiningDate, canEditCandidateResignDate } from '@/shared/lib/candidate-permissions'
import { ROUTES } from '@/shared/lib/constants'
import { recommendSkillsByRole } from '@/shared/lib/api/auth'

// Display shape used by the UI (id, name, displayPicture, phone, email, skills, education, experience, bio)
type CandidateDisplay = ReturnType<typeof mapCandidateToDisplay>

/** True if the row has an S3 key or a usable HTTPS S3 URL (not localhost-only placeholder). */
function candidateDocumentCanView(doc: { key?: string; url?: string } | null | undefined): boolean {
  if (!doc) return false
  if (doc.key && String(doc.key).trim()) return true
  const u = String(doc.url || '')
  return /amazonaws\.com|\.s3[.-]/i.test(u)
}

const SKILL_LEVELS_MERGE = ['Beginner', 'Intermediate', 'Advanced', 'Expert'] as const

/** Merge AI-recommended skills into existing candidate.skills without duplicate names (case-insensitive). */
function mergeRecommendedSkillsIntoExisting(
  existingRaw: unknown,
  incoming: Array<{ name: string; level?: string; category?: string }>
): Array<{ name: string; level: string; category?: string }> {
  const existing = normalizeCandidateSkillsStructured(existingRaw)
  const seen = new Set(existing.map((x) => x.name.toLowerCase()))
  const out: Array<{ name: string; level: string; category?: string }> = []
  for (const x of existing) {
    out.push({
      name: x.name,
      level: SKILL_LEVELS_MERGE.includes(x.level as (typeof SKILL_LEVELS_MERGE)[number])
        ? x.level
        : 'Intermediate',
      ...(x.category ? { category: x.category } : {}),
    })
  }
  for (const s of incoming) {
    const name = (s.name || '').trim()
    if (!name) continue
    const k = name.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    const lvl =
      typeof s.level === 'string' && SKILL_LEVELS_MERGE.includes(s.level as (typeof SKILL_LEVELS_MERGE)[number])
        ? s.level
        : 'Intermediate'
    const cat = typeof s.category === 'string' && s.category.trim() ? s.category.trim() : undefined
    out.push({
      name,
      level: lvl,
      ...(cat ? { category: cat } : {}),
    })
  }
  return out
}

/** Resigned = resign date set and on or before today (matches API “employmentStatus: resigned”). */
function isCandidateResigned(candidate: CandidateDisplay): boolean {
  const rd = candidate._raw?.resignDate
  if (rd == null || rd === "") return false
  const d = new Date(rd as string)
  if (Number.isNaN(d.getTime())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)
  return d.getTime() <= today.getTime()
}

function resignDateLabel(candidate: CandidateDisplay): string | null {
  const rd = candidate._raw?.resignDate
  if (rd == null || rd === "") return null
  const d = new Date(rd as string)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

/** Stable ref for react-table initialState (avoid new object each render). */
const EMPLOYEES_TABLE_INITIAL_STATE = { pageIndex: 0, pageSize: 50 }

/** Maps toolbar / column-header sort → `/employees` `sortBy` (`field:asc|desc`). */
function getEmployeesApiSortBy(selectedSort: string): string {
  switch (selectedSort) {
    case 'name-asc':
      return 'fullName:asc'
    case 'name-desc':
      return 'fullName:desc'
    case 'joining-asc':
      return 'joiningDate:asc'
    case 'joining-desc':
      return 'joiningDate:desc'
    default:
      return 'createdAt:desc'
  }
}

function nextNameSortToggle(current: string): 'name-asc' | 'name-desc' {
  if (current === 'name-asc') return 'name-desc'
  if (current === 'name-desc') return 'name-asc'
  return 'name-asc'
}

function nextJoinSortToggle(current: string): 'joining-asc' | 'joining-desc' {
  if (current === 'joining-asc') return 'joining-desc'
  if (current === 'joining-desc') return 'joining-asc'
  return 'joining-asc'
}

/** Initials from name (up to 2 chars), same logic as my profile. */
function getInitials(name: string | undefined | null): string {
  if (!name || !String(name).trim()) return '?'
  return (name as string).trim().split(/\s+/).map((s) => s[0]).join('').toUpperCase().slice(0, 2) || '?'
}

/** Editable date field (admin only). Renders as clickable badge; click opens modal. */
function PersonalInfoDateField({
  label,
  value,
  onSave,
  saving,
  allowClear = false,
  badgeClassName,
  icon,
}: {
  label: string
  value: string | Date | null | undefined
  onSave: (value: string | null) => void
  saving: boolean
  allowClear?: boolean
  badgeClassName: string
  icon: string
}) {
  const iso = value ? new Date(value).toISOString().slice(0, 10) : ''
  const [open, setOpen] = useState(false)
  const [local, setLocal] = useState(iso)
  useEffect(() => {
    setLocal(value ? new Date(value).toISOString().slice(0, 10) : '')
  }, [value])
  const displayText = value
    ? new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : 'Not set'
  const currentIso = value ? new Date(value).toISOString().slice(0, 10) : ''
  const hasChange = local !== currentIso
  const canSave = hasChange && (local.trim() || (allowClear && value))
  const handleSave = () => {
    if (allowClear && !local.trim()) {
      onSave(null)
    } else if (local.trim()) {
      onSave(local)
    }
    setOpen(false)
  }
  return (
    <>
      <button
        type="button"
        title={label}
        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs rounded cursor-pointer border-0 bg-transparent ${badgeClassName} hover:opacity-90 transition-opacity`}
        onClick={() => setOpen(true)}
      >
        <i className={icon}></i>
        {displayText}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/30 backdrop-blur-md transition-opacity duration-200"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={label}
        >
          <div
            className="bg-white dark:bg-bodybg rounded-2xl shadow-[0_24px_80px_-12px_rgba(0,0,0,0.25)] dark:shadow-[0_24px_80px_-12px_rgba(0,0,0,0.6)] border border-defaultborder dark:border-white/10 max-w-[340px] w-full overflow-hidden transition-transform duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-6 pb-5">
              <div className="flex items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/[0.08] text-primary dark:bg-primary/20 dark:text-primary">
                    <i className={icon}></i>
                  </span>
                  <div>
                    <h3 className="text-[1.0625rem] font-semibold tracking-tight text-defaulttextcolor dark:text-white">{label}</h3>
                    <p className="text-xs text-textmuted dark:text-white/50 mt-0.5">Pick a date</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-textmuted hover:bg-defaultbackground dark:hover:bg-white/10 hover:text-defaulttextcolor dark:hover:text-white transition-colors"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
              <div className="date-picker-modal-cal [&_.react-datepicker]:!border-0 [&_.react-datepicker]:!rounded-xl [&_.react-datepicker]:!shadow-none [&_.react-datepicker]:!p-0 [&_.react-datepicker]:!bg-transparent [&_.react-datepicker__header]:!bg-transparent [&_.react-datepicker__header]:!border-b [&_.react-datepicker__header]:!border-defaultborder [&_.react-datepicker__header]:!pb-3 [&_.react-datepicker__header]:!mb-3 [&_.react-datepicker__current-month]:!text-defaulttextcolor [&_.react-datepicker__current-month]:!dark:text-white [&_.react-datepicker__current-month]:!text-sm [&_.react-datepicker__current-month]:!font-semibold [&_.react-datepicker__day-names]:!text-textmuted [&_.react-datepicker__day-names]:!dark:text-white/50 [&_.react-datepicker__day-names]:!text-[0.6875rem] [&_.react-datepicker__day-names]:!font-medium [&_.react-datepicker__day]:!w-9 [&_.react-datepicker__day]:!h-9 [&_.react-datepicker__day]:!leading-9 [&_.react-datepicker__day]:!text-defaulttextcolor [&_.react-datepicker__day]:!dark:text-white [&_.react-datepicker__day]:!text-[0.8125rem] [&_.react-datepicker__day]:!rounded-lg [&_.react-datepicker__day--selected]:!bg-primary [&_.react-datepicker__day--selected]:!text-white [&_.react-datepicker__day--selected]:!font-medium [&_.react-datepicker__day--keyboard-selected]:!bg-primary/15 [&_.react-datepicker__day--keyboard-selected]:!text-primary [&_.react-datepicker__day:hover]:!bg-primary/10 [&_.react-datepicker__day:hover]:!text-primary [&_.react-datepicker__day--outside-month]:!text-gray-300 [&_.react-datepicker__day--outside-month]:!dark:text-white/20 [&_.react-datepicker__navigation]:!top-1 [&_.react-datepicker__navigation-icon]:before:!border-defaulttextcolor [&_.react-datepicker__navigation-icon]:before:!dark:border-white/70 [&_.react-datepicker__month-dropdown]:!bg-white [&_.react-datepicker__month-dropdown]:!dark:bg-bodybg [&_.react-datepicker__year-dropdown]:!bg-white [&_.react-datepicker__year-dropdown]:!dark:bg-bodybg [&_.react-datepicker__today-button]:!bg-defaultbackground [&_.react-datepicker__today-button]:!dark:bg-white/5 [&_.react-datepicker__today-button]:!text-defaulttextcolor [&_.react-datepicker__today-button]:!dark:text-white [&_.react-datepicker__today-button]:!border-t [&_.react-datepicker__today-button]:!border-defaultborder [&_.react-datepicker__today-button]:!rounded-b-xl [&_.react-datepicker__today-button]:!py-2.5 [&_.react-datepicker__today-button]:!text-sm [&_.react-datepicker__today-button]:!font-medium [&_.react-datepicker__today-button]:!hover:bg-defaultbackground/80 [&_.react-datepicker__today-button]:!dark:hover:bg-white/10">
                <DatePicker
                  inline
                  selected={local ? new Date(local) : null}
                  onChange={(d: Date | null) => setLocal(d ? d.toISOString().slice(0, 10) : '')}
                  dateFormat="yyyy-MM-dd"
                  showMonthDropdown
                  showYearDropdown
                  dropdownMode="select"
                  todayButton="Today"
                  calendarStartDay={1}
                  className="!border-0 !p-0 !w-full"
                  calendarClassName="date-picker-modal-cal"
                />
              </div>
            </div>
            <div className="px-6 py-4 flex flex-wrap items-center justify-end gap-3 border-t border-defaultborder dark:border-white/10 bg-defaultbackground/50 dark:bg-white/[0.02]">
              {allowClear && (local || value) && (
                <button
                  type="button"
                  className="inline-flex items-center justify-center min-h-[2.5rem] px-4 py-2 text-sm font-medium rounded-lg border border-defaultborder dark:border-white/20 bg-white dark:bg-bodybg text-defaulttextcolor dark:text-white/90 hover:bg-defaultbackground dark:hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-bodybg disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
                  disabled={saving}
                  onClick={() => {
                    setLocal('')
                    onSave(null)
                    setOpen(false)
                  }}
                  title="Clear resign date (reactivate)"
                >
                  Clear date
                </button>
              )}
              <button
                type="button"
                className="inline-flex items-center justify-center min-h-[2.5rem] min-w-[5.75rem] px-5 py-2 text-sm font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-bodybg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
                disabled={saving || !canSave}
                onClick={handleSave}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/** Avatar: S3 image if available, else initials. Matches my profile / personal-information behavior. */
function positionLabelFromRaw(raw: CandidateDisplay['_raw']): string {
  const pos = raw?.position;
  if (pos == null) return 'Not assigned';
  if (typeof pos === 'object' && pos !== null && 'name' in pos && String((pos as { name?: string }).name || '').trim()) {
    return String((pos as { name: string }).name);
  }
  if (typeof pos === 'string' && pos.trim()) {
    if (/^[a-f0-9]{24}$/i.test(pos.trim())) return 'Not assigned';
    return pos;
  }
  return 'Not assigned';
}

function trainingProgramsLabel(items: { name?: string }[] | undefined): string {
  if (!items?.length) return 'Not assigned';
  return items.map((x) => x.name).filter(Boolean).join(', ') || 'Not assigned'
}

function projectsAssignedLabel(items: { name?: string; status?: string }[] | undefined): string {
  if (!items?.length) return 'Not assigned'
  return (
    items
      .map((p) => {
        const n = p.name?.trim()
        if (!n) return ''
        return p.status ? `${n} (${p.status})` : n
      })
      .filter(Boolean)
      .join(', ') || 'Not assigned'
  )
}

function CandidateAvatar({ candidate, className = 'w-10 h-10 rounded-full' }: { candidate: CandidateDisplay; className?: string }) {
  const imgUrl = candidate.displayPicture ?? (candidate as any)._raw?.profilePicture?.url
  const [imgFailed, setImgFailed] = useState(false)
  const showImg = imgUrl && !imgFailed
  const initials = getInitials(candidate.name)
  if (showImg) {
    return (
      <img
        src={imgUrl}
        alt={candidate.name}
        className={`object-cover flex-shrink-0 ${className}`}
        onError={() => setImgFailed(true)}
      />
    )
  }
  return (
    <span className={`flex items-center justify-center bg-primary/10 text-primary font-semibold text-sm flex-shrink-0 ${className}`}>
      {initials}
    </span>
  )
}

interface FilterState {
  name: string[]
  email: string
  employeeId: string
  /** Assigned agent user ids (from checklist) */
  agentIds: string[]
  /** 'current' | 'resigned' | 'all' - default current */
  employmentStatus: 'current' | 'resigned' | 'all'
}

// Note type for candidate notes
interface CandidateNote {
  id: string
  candidateId: string
  note: string
  visibility: 'public' | 'private'
  postedBy: string
  postedDate: string
}

interface SkillRecommendationItem {
  name: string
  level: string
  category?: string
  selected: boolean
}

const Candidates = () => {
  const router = useRouter()
  const { isAdministrator, permissions, user: authUser, startImpersonation, isLoading: authLoading } = useAuth()
  const canEditJoiningDate = useMemo(
    () => canEditCandidateJoiningDate(permissions ?? [], isAdministrator),
    [permissions, isAdministrator]
  )
  const canEditResignDate = useMemo(
    () => canEditCandidateResignDate(permissions ?? [], isAdministrator),
    [permissions, isAdministrator]
  )
  const [candidates, setCandidates] = useState<CandidateDisplay[]>([])
  const [impersonatingOwnerUserId, setImpersonatingOwnerUserId] = useState<string | null>(null)
  const [candidatesLoading, setCandidatesLoading] = useState(true)
  const [candidatesError, setCandidatesError] = useState<string | null>(null)
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [candidateNotes, setCandidateNotes] = useState<CandidateNote[]>([])
  const [previewCandidate, setPreviewCandidate] = useState<any>(null)
  const [previewPanelDocuments, setPreviewPanelDocuments] = useState<CandidateDocument[] | null>(null)
  const [previewPanelDocumentsLoading, setPreviewPanelDocumentsLoading] = useState(false)
  const [viewDetailTab, setViewDetailTab] = useState<string>('personal')
  const [skillRecommendModalOpen, setSkillRecommendModalOpen] = useState(false)
  const [skillRecommendRole, setSkillRecommendRole] = useState('')
  const [skillRecommendLoading, setSkillRecommendLoading] = useState(false)
  const [skillRecommendApplyLoading, setSkillRecommendApplyLoading] = useState(false)
  const [skillRecommendSuggestions, setSkillRecommendSuggestions] = useState<SkillRecommendationItem[]>([])
  const [notesCandidateId, setNotesCandidateId] = useState<string | null>(null)
  const [newNote, setNewNote] = useState({ text: '', visibility: 'public' as 'public' | 'private' })
  const [shareCandidate, setShareCandidate] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  const [shareEmail, setShareEmail] = useState('')
  const [showEmailInput, setShowEmailInput] = useState(false)
  const [shareSubmitting, setShareSubmitting] = useState(false)
  const [selectedSort, setSelectedSort] = useState<string>('')
  
  const [apiPage, setApiPage] = useState(1)
  const [totalResults, setTotalResults] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [pageSize, setPageSize] = useState(50)
  
  const [filters, setFilters] = useState<FilterState>({
    name: [],
    email: '',
    employeeId: '',
    agentIds: [],
    employmentStatus: 'current',
  })
  /** React-controlled filters panel — Preline HSOverlay often misses registration after SPA navigation */
  const [employeesFilterPanelOpen, setEmployeesFilterPanelOpen] = useState(false)

  /** Sort / Excel — React-controlled (Preline hs-dropdown + SPA can swallow clicks / skip init). */
  const [employeesToolbarMenu, setEmployeesToolbarMenu] = useState<'sort' | 'excel' | null>(null)
  const employeesSortDropdownRef = useRef<HTMLDivElement>(null)
  const employeesExcelDropdownRef = useRef<HTMLDivElement>(null)

  // Search state for name filter dropdown
  const [searchName, setSearchName] = useState('')
  const [searchAgent, setSearchAgent] = useState('')

  // Filter dropdown options: all names from all candidates (not limited by pagination)
  const [filterOptions, setFilterOptions] = useState<{ names: string[] }>({
    names: [],
  })
  const [filterOptionsLoading, setFilterOptionsLoading] = useState(false)

  const [agentOptions, setAgentOptions] = useState<AgentOption[]>([])
  const [agentsLoading, setAgentsLoading] = useState(false)

  // Debounce search input so API is called after user stops typing
  const [debouncedSearchName, setDebouncedSearchName] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchName(searchName), 400)
    return () => clearTimeout(t)
  }, [searchName])

  useEffect(() => {
    if (!employeesToolbarMenu) return
    const handleOutside = (e: MouseEvent) => {
      const t = e.target as Node
      if (
        !employeesSortDropdownRef.current?.contains(t) &&
        !employeesExcelDropdownRef.current?.contains(t)
      ) {
        setEmployeesToolbarMenu(null)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [employeesToolbarMenu])

  // Create candidate modal state
  const [createForm, setCreateForm] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    shortBio: '',
    skillsText: '',
  })
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [documentsCandidate, setDocumentsCandidate] = useState<CandidateDisplay | null>(null)
  const [documentsList, setDocumentsList] = useState<CandidateDocument[]>([])
  const [documentsLoading, setDocumentsLoading] = useState(false)
  const [salarySlipCandidate, setSalarySlipCandidate] = useState<CandidateDisplay | null>(null)
  const [salarySlipForm, setSalarySlipForm] = useState({ month: '', year: '', file: null as File | null })
  const [salarySlipSubmitting, setSalarySlipSubmitting] = useState(false)
  const [feedbackCandidate, setFeedbackCandidate] = useState<CandidateDisplay | null>(null)
  const [feedbackForm, setFeedbackForm] = useState({ feedback: '', rating: 3 })
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [moreMenuState, setMoreMenuState] = useState<{ candidate: CandidateDisplay; top: number; left: number } | null>(null)
  const [attendanceOverlayCandidate, setAttendanceOverlayCandidate] = useState<CandidateDisplay | null>(null)

  const openAttendanceOverlay = useCallback((c: CandidateDisplay) => {
    setAttendanceOverlayCandidate(c)
  }, [])

  // Experience range from data (for slider min/max)
  const fetchParams = useMemo(() => {
    const params: Record<string, unknown> = {
      limit: pageSize,
      sortBy: getEmployeesApiSortBy(selectedSort),
      includeOpenSopCount: '1',
    }
    if (debouncedSearchName.trim()) params.fullName = debouncedSearchName.trim()
    else if (filters.name?.length) params.fullName = filters.name[0]
    if (filters.email?.trim()) params.email = filters.email.trim()
    if (filters.employeeId?.trim()) params.employeeId = filters.employeeId.trim()
    if (filters.agentIds?.length) params.agentIds = filters.agentIds.join(',')
    params.employmentStatus = filters.employmentStatus
    return params
  }, [filters, pageSize, debouncedSearchName, selectedSort])

  /** POST /candidates/export uses the same filters as the list (omit page/limit/SOP count). */
  const exportQueryParams = useMemo(() => {
    const params: Record<string, unknown> = {
      sortBy: getEmployeesApiSortBy(selectedSort),
    }
    if (debouncedSearchName.trim()) params.fullName = debouncedSearchName.trim()
    else if (filters.name?.length) params.fullName = filters.name[0]
    if (filters.email?.trim()) params.email = filters.email.trim()
    if (filters.employeeId?.trim()) params.employeeId = filters.employeeId.trim()
    if (filters.agentIds?.length) params.agentIds = filters.agentIds.join(',')
    params.employmentStatus = filters.employmentStatus
    return params
  }, [filters, debouncedSearchName, selectedSort])

  const refreshCandidates = useCallback((resetPage = false) => {
    const page = resetPage ? 1 : apiPage
    if (resetPage) setApiPage(1)
    setCandidatesLoading(true)
    setCandidatesError(null)
    listCandidates({ ...fetchParams, page })
      .then((res) => {
        setCandidates(res.results.map(mapCandidateToDisplay))
        setTotalResults(res.totalResults ?? res.results.length)
        setTotalPages(res.totalPages ?? 1)
      })
      .catch((err) => {
        setCandidatesError(err?.message ?? 'Failed to load employees')
        setCandidates([])
        setTotalResults(0)
        setTotalPages(0)
      })
      .finally(() => setCandidatesLoading(false))
  }, [apiPage, fetchParams])

  // Refetch when filters / search / page size / sort-by API param or page number change (explicit deps avoid stale closures on sort dropdown).
  useEffect(() => {
    refreshCandidates(false)
  }, [fetchParams, apiPage])

  // Fetch all unique names for filter dropdown (not limited by page); respect employmentStatus
  useEffect(() => {
    setFilterOptionsLoading(true)
    const params: Record<string, unknown> = { limit: 5000, sortBy: 'fullName:asc', employmentStatus: filters.employmentStatus }
    listCandidates(params)
      .then((res) => {
        const results = (res.results ?? []).map(mapCandidateToDisplay)
        const names = [...new Set(results.map((c) => c.name).filter(Boolean))].sort()
        setFilterOptions({ names })
      })
      .catch(() => setFilterOptions({ names: [] }))
      .finally(() => setFilterOptionsLoading(false))
  }, [filters.employmentStatus])

  useEffect(() => {
    setAgentsLoading(true)
    getCandidateFilterAgents()
      .then((d) => setAgentOptions(d.agents ?? []))
      .catch(() => setAgentOptions([]))
      .finally(() => setAgentsLoading(false))
  }, [])

  const prevFiltersRef = useRef(filters)
  useEffect(() => {
    if (prevFiltersRef.current !== filters) {
      prevFiltersRef.current = filters
      setApiPage(1)
    }
  }, [filters])

  useEffect(() => {
    setApiPage(1)
  }, [debouncedSearchName])

  // Note: Experience filter sync disabled with server-side pagination (data is paged)

  // Close "More" menu when clicking outside
  useEffect(() => {
    if (moreMenuState === null) return
    const close = (e: MouseEvent) => {
      const target = (e.target as Element)
      if (target.closest('[data-more-menu-container]') || target.closest('[data-more-menu-portal]')) return
      setMoreMenuState(null)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [moreMenuState])

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError(null)
    const phone = createForm.phoneNumber.replace(/\D/g, '')
    if (phone.length !== 10) {
      setCreateError('Phone must be 10 digits')
      return
    }
    setCreateSubmitting(true)
    try {
      const skills = createForm.skillsText
        ? createForm.skillsText.split(',').map((s) => ({ name: s.trim(), level: 'Beginner' as const })).filter((s) => s.name)
        : undefined
      await createCandidateApi({
        fullName: createForm.fullName.trim(),
        email: createForm.email.trim(),
        phoneNumber: phone,
        shortBio: createForm.shortBio.trim() || undefined,
        skills,
      })
      setCreateForm({ fullName: '', email: '', phoneNumber: '', shortBio: '', skillsText: '' })
      refreshCandidates(true)
      const closeBtn = document.querySelector('[data-hs-overlay="#create-candidate-modal"]')
      if (closeBtn instanceof HTMLElement) closeBtn.click()
    } catch (err: any) {
      setCreateError(err?.response?.data?.message ?? err?.message ?? 'Failed to create employee')
    } finally {
      setCreateSubmitting(false)
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

  /** Preline binds overlays during autoInit; ATS pages often mount before HSOverlay exists (SPA navigation). */
  const refreshPrelineDom = useCallback(() => {
    try {
      ;(window as unknown as { HSStaticMethods?: { autoInit?: () => void } }).HSStaticMethods?.autoInit?.()
    } catch {
      /* ignore */
    }
  }, [])

  const ensurePrelineLoaded = useCallback(async () => {
    if (typeof window === 'undefined') return
    if ((window as unknown as { HSOverlay?: unknown }).HSOverlay) return
    try {
      await import('preline/preline')
    } catch {
      /* ignore */
    }
  }, [])

  const openHsOverlay = useCallback(
    (selector: string) => {
      if (!document.querySelector(selector)) return
      const run = () => {
        refreshPrelineDom()
        requestAnimationFrame(() => {
          const HSOverlay = (window as unknown as { HSOverlay?: { open: (n: Element | string) => void } }).HSOverlay
          HSOverlay?.open(selector)
        })
      }
      if (typeof window !== 'undefined' && (window as unknown as { HSOverlay?: unknown }).HSOverlay) {
        run()
        return
      }
      void ensurePrelineLoaded().then(run)
    },
    [ensurePrelineLoaded, refreshPrelineDom]
  )

  useEffect(() => {
    void ensurePrelineLoaded().then(() => {
      requestAnimationFrame(() => {
        refreshPrelineDom()
      })
    })
  }, [ensurePrelineLoaded, refreshPrelineDom])

  useEffect(() => {
    if (!skillRecommendModalOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !skillRecommendLoading && !skillRecommendApplyLoading) {
        e.preventDefault()
        setSkillRecommendModalOpen(false)
        setSkillRecommendRole('')
        setSkillRecommendSuggestions([])
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [skillRecommendModalOpen, skillRecommendLoading, skillRecommendApplyLoading])

  useEffect(() => {
    if (typeof document === 'undefined') return
    const previewPanel = document.querySelector('#candidate-preview-panel') as HTMLElement | null
    const previewBackdrop = document.querySelector('#candidate-preview-panel-backdrop') as HTMLElement | null
    if (!previewPanel && !previewBackdrop) return

    const prevPanelVisibility = previewPanel?.style.visibility ?? ''
    const prevBackdropVisibility = previewBackdrop?.style.visibility ?? ''
    if (skillRecommendModalOpen) {
      if (previewPanel) previewPanel.style.visibility = 'hidden'
      if (previewBackdrop) previewBackdrop.style.visibility = 'hidden'
    } else {
      if (previewPanel) previewPanel.style.visibility = prevPanelVisibility
      if (previewBackdrop) previewBackdrop.style.visibility = prevBackdropVisibility
    }

    return () => {
      if (previewPanel) previewPanel.style.visibility = prevPanelVisibility
      if (previewBackdrop) previewBackdrop.style.visibility = prevBackdropVisibility
    }
  }, [skillRecommendModalOpen])

  // Handle add note - open notes sidebar
  const handleAddNote = (id: string, candidate?: any) => {
    // Open the notes sidebar
    setNotesCandidateId(id)
    queueMicrotask(() => openHsOverlay('#candidate-notes-panel'))
  }

  // Get notes for a specific candidate
  const getCandidateNotes = (candidateId: string) => {
    return candidateNotes.filter(note => note.candidateId === candidateId).sort((a, b) => 
      new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime()
    )
  }

  // Add a new note (backend)
  const handleAddNoteSubmit = async () => {
    if (!notesCandidateId || !newNote.text.trim()) return
    setActionError(null)
    try {
      await addNoteToCandidate(notesCandidateId, newNote.text.trim())
      const note: CandidateNote = {
        id: `note-${Date.now()}`,
        candidateId: notesCandidateId,
        note: newNote.text,
        visibility: newNote.visibility,
        postedBy: 'Current user',
        postedDate: new Date().toISOString()
      }
      setCandidateNotes([...candidateNotes, note])
      setNewNote({ text: '', visibility: 'public' })
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? err?.message ?? 'Failed to add note')
    }
  }

  // Delete a note
  const handleDeleteNote = (noteId: string) => {
    setCandidateNotes(candidateNotes.filter(note => note.id !== noteId))
  }

  // Get candidate details for the notes sidebar
  const getCandidateDetails = () => {
    if (!notesCandidateId) return null
    return candidates.find(candidate => candidate.id === notesCandidateId)
  }

  /** Open preview panel and fetch full candidate (including documents & salarySlips) for display. */
  const openCandidatePreview = useCallback(
    (c: CandidateDisplay) => {
      if (!c?.id) {
        void Swal.fire({
          icon: 'error',
          title: 'Cannot open preview',
          text: 'This row is missing a candidate id. Refresh the page or contact support.',
        })
        return
      }
      setPreviewCandidate(c)
      setPreviewPanelDocuments(null)
      setPreviewPanelDocumentsLoading(false)
      setViewDetailTab('personal')
      setActionError(null)
      queueMicrotask(() => openHsOverlay('#candidate-preview-panel'))
      getCandidate(c.id)
        .then((full) => {
          setPreviewCandidate((prev: any) =>
            prev && prev.id === c.id ? { ...prev, _raw: full } : prev
          )
        })
        .catch(() => {})
    },
    [openHsOverlay]
  )

  // Generate public URL for candidate
  const getCandidatePublicUrl = (candidateId: string) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/ats/employees/${candidateId}`
    }
    return `https://example.com/ats/employees/${candidateId}`
  }

  const [exportCandidate, setExportCandidate] = useState<CandidateDisplay | null>(null)
  const [exportEmail, setExportEmail] = useState('')
  const [exportSubmitting, setExportSubmitting] = useState(false)
  const [exportAllEmail, setExportAllEmail] = useState('')
  const [exportAllSubmitting, setExportAllSubmitting] = useState(false)
  const [shareWithDoc, setShareWithDoc] = useState(false)
  const [sharedPublicUrl, setSharedPublicUrl] = useState<string | null>(null)
  const [sharedPublicUrlForId, setSharedPublicUrlForId] = useState<string | null>(null)
  const [assignRecruiterCandidate, setAssignRecruiterCandidate] = useState<CandidateDisplay | null>(null)
  const [recruitersList, setRecruitersList] = useState<{ id: string; name: string; email?: string }[]>([])
  const [assignRecruiterId, setAssignRecruiterId] = useState('')
  const [assignRecruiterSubmitting, setAssignRecruiterSubmitting] = useState(false)
  const [joiningDateCandidate, setJoiningDateCandidate] = useState<CandidateDisplay | null>(null)
  const [joiningDateValue, setJoiningDateValue] = useState('')
  const [joiningDateSubmitting, setJoiningDateSubmitting] = useState(false)
  const [resignDateCandidate, setResignDateCandidate] = useState<CandidateDisplay | null>(null)
  const [resignDateValue, setResignDateValue] = useState('')
  const [resignDateSubmitting, setResignDateSubmitting] = useState(false)
  const [personalInfoDateSaving, setPersonalInfoDateSaving] = useState<'joining' | 'resign' | null>(null)
  const [weekOffCandidateIds, setWeekOffCandidateIds] = useState<string[]>([])
  const [weekOffDays, setWeekOffDays] = useState<string[]>([])
  const [weekOffSubmitting, setWeekOffSubmitting] = useState(false)
  const [assignShiftCandidateIds, setAssignShiftCandidateIds] = useState<string[]>([])
  const [assignShiftId, setAssignShiftId] = useState('')
  const [shiftsList, setShiftsList] = useState<{ id: string; name: string }[]>([])
  const [assignShiftSubmitting, setAssignShiftSubmitting] = useState(false)
  const [documentStatusMap, setDocumentStatusMap] = useState<Record<number, { status: number; adminNotes?: string }>>({})
  const [salarySlipsFromCandidate, setSalarySlipsFromCandidate] = useState<Array<{ month?: string; year?: number; key?: string }>>([])
  const [bulkDeleteSubmitting, setBulkDeleteSubmitting] = useState(false)
  const [deletingCandidateId, setDeletingCandidateId] = useState<string | null>(null)
  const handleExportDocs = (candidate: any, _type: 'all' | 'resume' | 'cover-letter' = 'all') => {
    setExportCandidate(candidate)
    setExportEmail('')
    setActionError(null)
    queueMicrotask(() => openHsOverlay('#export-candidate-modal'))
  }
  const handleExportSubmit = async () => {
    if (!exportCandidate?.id || !exportEmail.trim()) return
    setExportSubmitting(true)
    setActionError(null)
    try {
      await exportCandidateProfile(exportCandidate.id, exportEmail.trim())
      setActionSuccess('Export email sent')
      setExportCandidate(null)
      setExportEmail('')
      setTimeout(() => document.querySelector('[data-hs-overlay="#export-candidate-modal"]')?.dispatchEvent(new Event('click')), 0)
      setTimeout(() => setActionSuccess(null), 3000)
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? err?.message ?? 'Export failed')
    } finally {
      setExportSubmitting(false)
    }
  }

  const openDocumentsModal = async (candidate: CandidateDisplay) => {
    setDocumentsCandidate(candidate)
    setDocumentsList([])
    setDocumentStatusMap({})
    setSalarySlipsFromCandidate([])
    setDocumentsLoading(true)
    setActionError(null)
    try {
      const [list, statusRes, candidateDetail] = await Promise.all([
        getCandidateDocuments(candidate.id),
        getDocumentStatus(candidate.id).catch(() => ({ documents: [] })),
        getCandidate(candidate.id).catch(() => null),
      ])
      const docsList = Array.isArray(list) ? list : (list as any)?.documents ?? []
      setDocumentsList(docsList)
      const statusByIndex: Record<number, { status: number; adminNotes?: string }> = {}
      ;(statusRes?.documents ?? []).forEach((d: any) => { statusByIndex[d.index] = { status: d.status, adminNotes: d.adminNotes } })
      setDocumentStatusMap(statusByIndex)
      setSalarySlipsFromCandidate((candidateDetail as any)?.salarySlips ?? [])
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? err?.message ?? 'Failed to load documents')
      setDocumentsList([])
      setSalarySlipsFromCandidate([])
    } finally {
      setDocumentsLoading(false)
      // Open modal after state updates; Preline needs autoInit + HSOverlay (SPA navigation).
      requestAnimationFrame(() => {
        queueMicrotask(() => openHsOverlay('#documents-modal'))
      })
    }
  }
  const handleDocumentVerify = async (candidateId: string, documentIndex: number, status: number, adminNotes?: string) => {
    setActionError(null)
    try {
      await verifyDocument(candidateId, documentIndex, status, adminNotes)
      setDocumentStatusMap((prev) => ({ ...prev, [documentIndex]: { status, adminNotes } }))
      setActionSuccess('Document status updated')
      setTimeout(() => setActionSuccess(null), 2000)
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? err?.message ?? 'Verify failed')
    }
  }
  const handleSalarySlipDelete = async (candidateId: string, index: number) => {
    if (!documentsCandidate || documentsCandidate.id !== candidateId) return
    if (!confirm('Remove this salary slip?')) return
    setActionError(null)
    try {
      await deleteSalarySlip(candidateId, index)
      setSalarySlipsFromCandidate((prev) => prev.filter((_, i) => i !== index))
      setActionSuccess('Salary slip removed')
      refreshCandidates(true)
      setTimeout(() => setActionSuccess(null), 2000)
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? err?.message ?? 'Delete failed')
    }
  }
  const handleDocumentDownload = async (candidateId: string, index: number) => {
    try {
      const { url } = await getDocumentDownloadUrl(candidateId, index)
      window.open(url, '_blank')
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? err?.message ?? 'Download failed')
    }
  }

  useEffect(() => {
    if (!previewCandidate) {
      setPreviewPanelDocuments(null)
      setPreviewPanelDocumentsLoading(false)
    }
  }, [previewCandidate])

  useEffect(() => {
    const id = previewCandidate?.id
    if (!id || viewDetailTab !== 'documents') return
    let cancelled = false
    setPreviewPanelDocumentsLoading(true)
    getCandidateDocuments(id)
      .then((docs) => {
        if (!cancelled) setPreviewPanelDocuments(docs)
      })
      .catch(() => {
        if (!cancelled) setPreviewPanelDocuments(null)
      })
      .finally(() => {
        if (!cancelled) setPreviewPanelDocumentsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [previewCandidate?.id, viewDetailTab])

  const handlePreviewPanelDocumentView = useCallback(
    async (index: number) => {
      const cid = previewCandidate?.id ?? previewCandidate?._raw?._id
      if (!cid) return
      setActionError(null)
      const row = previewPanelDocuments?.[index]
      if (row?.url && /amazonaws\.com|\.s3[.-]/i.test(row.url)) {
        window.open(resolveDownloadUrlForBrowser(row.url), '_blank', 'noopener,noreferrer')
        return
      }
      if (candidateDocumentCanView(row)) {
        try {
          const { url } = await getDocumentDownloadUrl(cid, index)
          window.open(url, '_blank', 'noopener,noreferrer')
        } catch (err: any) {
          setActionError(err?.response?.data?.message ?? err?.message ?? 'Could not open document')
        }
        return
      }
      setActionError(
        'This document is not linked to file storage (missing S3 key). The employee should re-upload it under Personal Information → Documents.'
      )
    },
    [previewCandidate, previewPanelDocuments]
  )

  const handleSalarySlipView = async (candidateId: string, salarySlipIndex: number) => {
    try {
      const { url } = await getSalarySlipDownloadUrl(candidateId, salarySlipIndex)
      window.open(url, '_blank')
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? err?.message ?? 'Could not open salary slip')
    }
  }

  const openSalarySlipModal = (candidate: CandidateDisplay) => {
    setSalarySlipCandidate(candidate)
    setSalarySlipForm({ month: '', year: '', file: null })
    setActionError(null)
    queueMicrotask(() => openHsOverlay('#salary-slip-modal'))
  }
  const handleSalarySlipSubmit = async () => {
    if (!salarySlipCandidate?.id || !salarySlipForm.month || !salarySlipForm.year || !salarySlipForm.file) return
    setSalarySlipSubmitting(true)
    setActionError(null)
    try {
      const uploaded = await uploadDocument(salarySlipForm.file, `Salary Slip ${salarySlipForm.month} ${salarySlipForm.year}`)
      await addSalarySlipToCandidate(salarySlipCandidate.id, {
        month: salarySlipForm.month,
        year: parseInt(salarySlipForm.year, 10),
        documentUrl: uploaded.url,
        key: uploaded.key,
        originalName: uploaded.originalName,
        size: uploaded.size,
        mimeType: uploaded.mimeType,
      })
      setActionSuccess('Salary slip added')
      setSalarySlipCandidate(null)
      setSalarySlipForm({ month: '', year: '', file: null })
      setTimeout(() => document.querySelector('[data-hs-overlay="#salary-slip-modal"]')?.dispatchEvent(new Event('click')), 0)
      refreshCandidates(true)
      setTimeout(() => setActionSuccess(null), 3000)
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? err?.message ?? 'Failed to add salary slip')
    } finally {
      setSalarySlipSubmitting(false)
    }
  }

  const openFeedbackModal = (candidate: CandidateDisplay) => {
    setFeedbackCandidate(candidate)
    setFeedbackForm({ feedback: '', rating: 3 })
    setActionError(null)
    queueMicrotask(() => openHsOverlay('#feedback-modal'))
  }
  const handleFeedbackSubmit = async () => {
    if (!feedbackCandidate?.id || !feedbackForm.feedback.trim()) return
    setFeedbackSubmitting(true)
    setActionError(null)
    try {
      await addFeedbackToCandidate(feedbackCandidate.id, feedbackForm.feedback.trim(), feedbackForm.rating)
      setActionSuccess('Feedback added')
      setFeedbackCandidate(null)
      setFeedbackForm({ feedback: '', rating: 3 })
      setTimeout(() => document.querySelector('[data-hs-overlay="#feedback-modal"]')?.dispatchEvent(new Event('click')), 0)
      refreshCandidates(true)
      setTimeout(() => setActionSuccess(null), 3000)
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? err?.message ?? 'Failed to add feedback')
    } finally {
      setFeedbackSubmitting(false)
    }
  }

  const handleResendVerification = async (candidate: CandidateDisplay) => {
    setActionError(null)
    try {
      const res = await resendVerificationEmail(candidate.id)
      const to = res.sentToEmail?.trim()
      setActionSuccess(
        to ? `Verification email sent to ${to}` : `Verification email sent${res.message ? `: ${res.message}` : ''}`
      )
      refreshCandidates(true)
      setTimeout(() => setActionSuccess(null), 3000)
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? err?.message ?? 'Failed to send verification email')
    }
  }

  const handleDeleteCandidate = async (candidate: CandidateDisplay) => {
    const result = await Swal.fire({
      title: 'Delete employee?',
      html: `<p class="text-gray-600 dark:text-gray-400">This will permanently remove <strong>${candidate.name}</strong>. This action cannot be undone.</p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
    })
    if (!result.isConfirmed) return
    setActionError(null)
    setDeletingCandidateId(candidate.id)
    try {
      await deleteCandidate(candidate.id)
      // Optimistic removal – smooth instant feedback
      setCandidates((prev) => prev.filter((c) => c.id !== candidate.id))
      setSelectedRows((prev) => {
        const next = new Set(prev)
        next.delete(candidate.id)
        return next
      })
      if (previewCandidate?.id === candidate.id) setPreviewCandidate(null)
      if (notesCandidateId === candidate.id) setNotesCandidateId(null)
      if (moreMenuState?.candidate.id === candidate.id) setMoreMenuState(null)
      await Swal.fire({
        icon: 'success',
        title: 'Deleted',
        text: `${candidate.name} has been removed.`,
        timer: 2000,
        showConfirmButton: false,
        timerProgressBar: true,
      })
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? err?.message ?? 'Delete failed')
      await Swal.fire({
        icon: 'error',
        title: 'Delete failed',
        text: err?.response?.data?.message ?? err?.message ?? 'Could not delete this employee. Please try again.',
      })
    } finally {
      setDeletingCandidateId(null)
    }
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

  // Share on WhatsApp – use shareable link with token when available
  const handleShareWhatsApp = (candidate: any) => {
    const url = (sharedPublicUrl && sharedPublicUrlForId === candidate.id) ? sharedPublicUrl : getCandidatePublicUrl(candidate.id)
    const text = `Check out this employee: ${candidate.name} - ${url}`
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(whatsappUrl, '_blank')
  }

  // Handle email share - show input field
  const handleEmailShareClick = () => {
    setShowEmailInput(true)
  }

  // Handle send share email (backend) – backend returns the real shareable link with token
  const handleSendEmail = async () => {
    if (!shareEmail.trim() || !shareCandidate?.id || shareSubmitting) return
    setActionError(null)
    setShareSubmitting(true)
    try {
      const result = await shareCandidateProfile(shareCandidate.id, { email: shareEmail.trim(), withDoc: shareWithDoc })
      setActionSuccess('Profile shared successfully')
      if (result?.publicUrl) {
        setSharedPublicUrl(result.publicUrl)
        setSharedPublicUrlForId(shareCandidate.id)
      }
      setShareEmail('')
      setShowEmailInput(false)
      setTimeout(() => setActionSuccess(null), 3000)
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? err?.message ?? 'Failed to share')
    } finally {
      setShareSubmitting(false)
    }
  }

  // Handle share button click – open modal by setting state (no Preline trigger)
  const handleShareClick = (candidate: any) => {
    setShareCandidate(candidate)
    setShowEmailInput(false)
    setShareEmail('')
    setShareWithDoc(false)
    if (sharedPublicUrlForId !== candidate.id) {
      setSharedPublicUrl(null)
      setSharedPublicUrlForId(null)
    }
  }

  const handleExportAllOpen = () => {
    setExportAllEmail('')
    setActionError(null)
    queueMicrotask(() => openHsOverlay('#export-all-modal'))
  }
  const handleExportAllSubmit = async () => {
    setExportAllSubmitting(true)
    setActionError(null)
    try {
      const body = exportAllEmail.trim() ? { email: exportAllEmail.trim() } : undefined
      const result = await exportAllCandidates(exportQueryParams as ExportAllCandidatesParams, body)
      if (result && typeof (result as Blob).slice === 'function') {
        const url = URL.createObjectURL(result as Blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `employees-export-${new Date().toISOString().split('T')[0]}.xlsx`
        a.click()
        URL.revokeObjectURL(url)
      }
      setActionSuccess('Export completed')
      setExportAllEmail('')
      setTimeout(() => document.querySelector('[data-hs-overlay="#export-all-modal"]')?.dispatchEvent(new Event('click')), 0)
      setTimeout(() => setActionSuccess(null), 3000)
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? err?.message ?? 'Export failed')
    } finally {
      setExportAllSubmitting(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedRows.size === 0) return
    if (!confirm(`Delete ${selectedRows.size} selected employee(s)? This cannot be undone.`)) return
    setBulkDeleteSubmitting(true)
    setActionError(null)
    try {
      for (const id of selectedRows) {
        await deleteCandidate(id)
      }
      setSelectedRows(new Set())
      setActionSuccess('Selected employees deleted')
      refreshCandidates(true)
      setTimeout(() => setActionSuccess(null), 3000)
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? err?.message ?? 'Delete failed')
    } finally {
      setBulkDeleteSubmitting(false)
    }
  }

  const openAssignRecruiterModal = (candidate: CandidateDisplay) => {
    setAssignRecruiterCandidate(candidate)
    setAssignRecruiterId('')
    setActionError(null)
    listUsers({ limit: 200 })
      .then((res) => setRecruitersList((res.results ?? []).map((u: any) => ({ id: u.id ?? u._id, name: u.name, email: u.email }))))
      .catch(() => setRecruitersList([]))
    queueMicrotask(() => openHsOverlay('#assign-recruiter-modal'))
  }
  const handleAssignRecruiterSubmit = async () => {
    if (!assignRecruiterCandidate?.id || !assignRecruiterId) return
    setAssignRecruiterSubmitting(true)
    setActionError(null)
    try {
      await assignRecruiterToCandidate(assignRecruiterCandidate.id, assignRecruiterId)
      setActionSuccess('Recruiter assigned')
      setAssignRecruiterCandidate(null)
      setAssignRecruiterId('')
      setTimeout(() => document.querySelector('[data-hs-overlay="#assign-recruiter-modal"]')?.dispatchEvent(new Event('click')), 0)
      refreshCandidates(true)
      setTimeout(() => setActionSuccess(null), 3000)
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? err?.message ?? 'Failed to assign recruiter')
    } finally {
      setAssignRecruiterSubmitting(false)
    }
  }

  const openJoiningDateModal = useCallback((candidate: CandidateDisplay) => {
    setJoiningDateCandidate(candidate)
    const j = candidate._raw?.joiningDate
    setJoiningDateValue(j ? new Date(j as string).toISOString().slice(0, 10) : '')
    setActionError(null)
    queueMicrotask(() => openHsOverlay('#joining-date-modal'))
  }, [openHsOverlay])
  const handleJoiningDateSubmit = async () => {
    if (!joiningDateCandidate?.id || !joiningDateValue) return
    setJoiningDateSubmitting(true)
    setActionError(null)
    try {
      await updateJoiningDate(joiningDateCandidate.id, joiningDateValue)
      setActionSuccess('Joining date updated')
      setJoiningDateCandidate(null)
      setJoiningDateValue('')
      setTimeout(() => document.querySelector('[data-hs-overlay="#joining-date-modal"]')?.dispatchEvent(new Event('click')), 0)
      refreshCandidates(true)
      setTimeout(() => setActionSuccess(null), 3000)
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? err?.message ?? 'Failed to update joining date')
    } finally {
      setJoiningDateSubmitting(false)
    }
  }

  const openResignDateModal = (candidate: CandidateDisplay) => {
    setResignDateCandidate(candidate)
    const r = candidate._raw?.resignDate
    setResignDateValue(r ? new Date(r as string).toISOString().slice(0, 10) : '')
    setActionError(null)
    queueMicrotask(() => openHsOverlay('#resign-date-modal'))
  }
  const handleResignDateSubmit = async () => {
    if (!resignDateCandidate?.id) return
    setResignDateSubmitting(true)
    setActionError(null)
    try {
      await updateResignDate(resignDateCandidate.id, resignDateValue || null)
      setActionSuccess('Resign date updated')
      setResignDateCandidate(null)
      setResignDateValue('')
      setTimeout(() => document.querySelector('[data-hs-overlay="#resign-date-modal"]')?.dispatchEvent(new Event('click')), 0)
      refreshCandidates(true)
      setTimeout(() => setActionSuccess(null), 3000)
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? err?.message ?? 'Failed to update resign date')
    } finally {
      setResignDateSubmitting(false)
    }
  }

  const submitSkillRecommendationForPreview = async () => {
    const role = skillRecommendRole.trim()
    if (role.length < 2) {
      await Swal.fire({ icon: 'warning', title: 'Enter a role', text: 'Use at least 2 characters for the job title or role.' })
      return
    }
    const cid =
      previewCandidate?.id ?? previewCandidate?._raw?._id ?? previewCandidate?._raw?.id
    if (!cid) return
    setSkillRecommendLoading(true)
    try {
      const currentSkills = normalizeCandidateSkillsStructured(previewCandidate._raw?.skills).map((s) => ({
        name: s.name,
        level: s.level,
        category: s.category,
      }))
      const res = await recommendSkillsByRole({ role, currentSkills })
      const options = (res.skills ?? [])
        .filter((s) => String(s?.name ?? '').trim())
        .map((s) => ({
          name: String(s.name).trim(),
          level: String(s.level || 'Intermediate').trim(),
          ...(s.category ? { category: String(s.category).trim() } : {}),
          selected: true,
        }))

      if (!options.length) {
        await Swal.fire({
          icon: 'info',
          title: 'No new gaps found',
          text: 'No additional skills were returned for this role based on current skills.',
        })
        return
      }

      setSkillRecommendSuggestions(options)
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as AxiosError<{ message?: string }>).response?.data?.message
          : undefined
      await Swal.fire({
        icon: 'error',
        title: 'Could not suggest skills',
        text: typeof msg === 'string' ? msg : 'Try again later.',
      })
    } finally {
      setSkillRecommendLoading(false)
    }
  }

  const applySelectedSkillRecommendations = async () => {
    const cid = previewCandidate?.id ?? previewCandidate?._raw?._id ?? previewCandidate?._raw?.id
    if (!cid) return
    const selected = skillRecommendSuggestions
      .filter((s) => s.selected)
      .map((s) => ({ name: s.name, level: s.level, category: s.category }))

    if (!selected.length) {
      await Swal.fire({
        icon: 'warning',
        title: 'Select at least one',
        text: 'Choose at least one skill to merge into this employee profile.',
      })
      return
    }

    setSkillRecommendApplyLoading(true)
    try {
      const merged = mergeRecommendedSkillsIntoExisting(previewCandidate._raw?.skills, selected)
      await updateCandidate(String(cid), { skills: merged })
      const fresh = await getCandidate(String(cid))
      const mapped = mapCandidateToDisplay(fresh)
      setPreviewCandidate(mapped)
      setCandidates((prev) => prev.map((row) => (String(row.id) === String(cid) ? mapped : row)))
      setSkillRecommendModalOpen(false)
      setSkillRecommendRole('')
      setSkillRecommendSuggestions([])
      await Swal.fire({
        icon: 'success',
        title: 'Skills updated',
        text: `Merged ${selected.length} selected skill${selected.length === 1 ? '' : 's'} to develop.`,
        timer: 3400,
        showConfirmButton: true,
      })
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as AxiosError<{ message?: string }>).response?.data?.message
          : undefined
      await Swal.fire({
        icon: 'error',
        title: 'Could not update skills',
        text: typeof msg === 'string' ? msg : 'Try again later.',
      })
    } finally {
      setSkillRecommendApplyLoading(false)
    }
  }

  const handlePersonalInfoJoiningDateSave = async (value: string | null) => {
    if (!previewCandidate?.id || value == null || !String(value).trim()) return
    setPersonalInfoDateSaving('joining')
    setActionError(null)
    try {
      await updateJoiningDate(previewCandidate.id, value)
      setActionSuccess('Joining date updated')
      setPreviewCandidate((prev: any) =>
        prev ? { ...prev, _raw: { ...prev._raw, joiningDate: value } } : null
      )
      refreshCandidates(true)
      setTimeout(() => setActionSuccess(null), 3000)
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? err?.message ?? 'Failed to update joining date')
    } finally {
      setPersonalInfoDateSaving(null)
    }
  }

  const handlePersonalInfoResignDateSave = async (value: string | null) => {
    if (!previewCandidate?.id) return
    setPersonalInfoDateSaving('resign')
    setActionError(null)
    try {
      await updateResignDate(previewCandidate.id, value)
      setActionSuccess(value ? 'Resign date updated' : 'Resign date cleared. This employee is now active.')
      setPreviewCandidate((prev: any) =>
        prev ? { ...prev, _raw: { ...prev._raw, resignDate: value } } : null
      )
      refreshCandidates(true)
      setTimeout(() => setActionSuccess(null), 3000)
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? err?.message ?? 'Failed to update resign date')
    } finally {
      setPersonalInfoDateSaving(null)
    }
  }

  const WEEK_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const openWeekOffModal = (candidateIds: string[]) => {
    setWeekOffCandidateIds(candidateIds)
    setWeekOffDays([])
    setWeekOffSubmitting(false)
    setActionError(null)
    if (candidateIds.length === 1) {
      getCandidateWeekOff(candidateIds[0]).then((r) => setWeekOffDays(r.weekOff ?? [])).catch(() => {})
    }
    queueMicrotask(() => openHsOverlay('#week-off-modal'))
  }
  const handleWeekOffSubmit = async () => {
    if (weekOffCandidateIds.length === 0 || weekOffDays.length === 0) return
    setWeekOffSubmitting(true)
    setActionError(null)
    try {
      await updateWeekOff(weekOffCandidateIds, weekOffDays)
      setActionSuccess('Week-off updated')
      setWeekOffCandidateIds([])
      setWeekOffDays([])
      setTimeout(() => document.querySelector('[data-hs-overlay="#week-off-modal"]')?.dispatchEvent(new Event('click')), 0)
      refreshCandidates(true)
      setTimeout(() => setActionSuccess(null), 3000)
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? err?.message ?? 'Failed to update week-off')
    } finally {
      setWeekOffSubmitting(false)
    }
  }
  const toggleWeekOffDay = (day: string) => {
    setWeekOffDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
  }

  const openAssignShiftModal = (candidateIds: string[]) => {
    setAssignShiftCandidateIds(candidateIds)
    setAssignShiftId('')
    setActionError(null)
    getAllShifts({ isActive: true })
      .then((res) => setShiftsList((res.data?.results ?? []).map((s: any) => ({ id: s.id ?? s._id, name: s.name }))))
      .catch(() => setShiftsList([]))
    queueMicrotask(() => openHsOverlay('#assign-shift-modal'))
  }
  const handleAssignShiftSubmit = async () => {
    if (assignShiftCandidateIds.length === 0 || !assignShiftId) return
    setAssignShiftSubmitting(true)
    setActionError(null)
    try {
      await assignShiftToCandidates(assignShiftCandidateIds, assignShiftId)
      setActionSuccess('Shift assigned')
      setAssignShiftCandidateIds([])
      setAssignShiftId('')
      setTimeout(() => document.querySelector('[data-hs-overlay="#assign-shift-modal"]')?.dispatchEvent(new Event('click')), 0)
      refreshCandidates(true)
      setTimeout(() => setActionSuccess(null), 3000)
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? err?.message ?? 'Failed to assign shift')
    } finally {
      setAssignShiftSubmitting(false)
    }
  }

  const handleImpersonateFromCandidate = useCallback(
    async (candidate: CandidateDisplay) => {
      const targetUserId = candidate.ownerUserId
      if (!targetUserId || !authUser?.id) return
      if (String(authUser.id) === String(targetUserId)) {
        void Swal.fire('Cannot impersonate', 'You are already logged in as this employee’s account.', 'info')
        return
      }
      const nameOrEmail = candidate.name?.trim() || candidate.email?.trim() || 'this user'
      const result = await Swal.fire({
        title: 'Login as user?',
        text: `You will temporarily enter the system as \"${nameOrEmail}\". You will only have this user’s permissions and can exit impersonation at any time.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Confirm',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#0d9488',
        cancelButtonColor: '#6c757d',
        reverseButtons: true,
      })
      if (!result.isConfirmed) return

      setImpersonatingOwnerUserId(targetUserId)
      try {
        await startImpersonation(targetUserId, nameOrEmail, { returnPathAfterStop: ROUTES.atsEmployees })
      } catch (err) {
        setImpersonatingOwnerUserId(null)
        const msg =
          err instanceof AxiosError && err.response?.data?.message
            ? String(err.response.data.message)
            : 'Failed to start impersonation.'
        await Swal.fire('Impersonation failed', msg, 'error')
      } finally {
        setImpersonatingOwnerUserId(null)
      }
    },
    [authUser?.id, startImpersonation]
  )

  // Define columns
  const columns = useMemo(
    () => [
      {
        Header: 'All',
        accessor: 'checkbox',
        disableSortBy: true,
        width: 52,
        minWidth: 52,
        maxWidth: 52,
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
        Header: 'Employee info',
        id: 'candidateInfo',
        accessor: (row: CandidateDisplay) => row.name ?? '',
        Cell: ({ row }: any) => {
          const candidate = row.original as CandidateDisplay
          const resigned = isCandidateResigned(candidate)
          const jd = candidate._raw?.joiningDate as string | undefined
          const joinDisplay =
            jd && !Number.isNaN(new Date(jd).getTime())
              ? new Date(jd).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
              : '—'
          return (
            <div className="flex items-center gap-3">
              <div
                className={`flex-shrink-0 rounded-full ${resigned ? "ring-2 ring-red-500/60 shadow-sm" : ""}`}
              >
                <CandidateAvatar candidate={candidate} className="w-10 h-10 rounded-full" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div 
                    className={`font-semibold truncate cursor-pointer hover:text-primary ${
                      resigned
                        ? "text-red-950 dark:text-red-100"
                        : "text-gray-800 dark:text-white"
                    }`}
                    onClick={() => openCandidatePreview(candidate)}
                  >
                    {candidate.name}
                  </div>
                  {typeof candidate.openSopCount === "number" && candidate.openSopCount > 0 ? (
                    <span
                      className="inline-flex min-h-[1.25rem] min-w-[1.25rem] items-center justify-center rounded-full bg-primary/15 px-1.5 text-[10px] font-bold text-primary"
                      title={`${candidate.openSopCount} open setup task(s)`}
                    >
                      {candidate.openSopCount}
                    </span>
                  ) : null}
                  {resigned && (
                    <span
                      className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-red-600 text-white shadow-sm"
                      title={
                        resignDateLabel(candidate)
                          ? `Resigned · ${resignDateLabel(candidate)}`
                          : "Resigned"
                      }
                    >
                      <i className="ri-logout-box-r-line text-[10px]" aria-hidden />
                      Resigned
                    </span>
                  )}
                  {((candidate.isProfileCompleted ?? candidate._raw?.isProfileCompleted ?? 0) < 100) && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded" title="Profile completion">
                      <i className="ri-pie-chart-line text-[10px]"></i>
                      {candidate.isProfileCompleted ?? candidate._raw?.isProfileCompleted ?? 0}%
                    </span>
                  )}
                </div>
                <div className="max-md:whitespace-normal max-md:break-words text-xs text-gray-500 dark:text-gray-400 md:truncate">
                  {(candidate._raw?.employeeId) && (
                    <div className="flex items-start gap-1">
                      <i className="ri-id-card-line mt-px shrink-0"></i>
                      {candidate._raw.employeeId}
                    </div>
                  )}
                  <div className="mt-0.5 flex items-start gap-1">
                    <i className="ri-phone-line mt-px shrink-0"></i>
                    {candidate.phone}
                  </div>
                  <div className="mt-0.5 flex items-start gap-1">
                    <i className="ri-mail-line mt-px shrink-0"></i>
                    <span className="min-w-0 break-all">{candidate.email}</span>
                  </div>
                  <div
                    className={`mt-1.5 flex items-center gap-1.5 rounded-md px-1 py-0.5 text-[0.7rem] text-gray-800 dark:text-gray-200 md:hidden ${
                      canEditJoiningDate ? 'cursor-pointer hover:bg-primary/[0.07]' : ''
                    }`}
                    onClick={canEditJoiningDate ? () => openJoiningDateModal(candidate) : undefined}
                    onKeyDown={
                      canEditJoiningDate
                        ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              openJoiningDateModal(candidate)
                            }
                          }
                        : undefined
                    }
                    role={canEditJoiningDate ? 'button' : undefined}
                    tabIndex={canEditJoiningDate ? 0 : undefined}
                    title={canEditJoiningDate ? 'Click to edit joining date' : undefined}
                    aria-label={`Joining date ${joinDisplay}`}
                  >
                    <i className="ri-calendar-check-line shrink-0 text-gray-500 dark:text-gray-400"></i>
                    <span className="whitespace-nowrap">{joinDisplay}</span>
                  </div>
                </div>
              </div>
            </div>
          )
        },
      },
      {
        Header: 'Joining Date',
        accessor: 'joiningDate',
        minWidth: 120,
        Cell: ({ row }: any) => {
          const candidate = row.original as CandidateDisplay
          const raw = (candidate as any)._raw
          const joiningDate = raw?.joiningDate
          const displayText = joiningDate
            ? new Date(joiningDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
            : '—'
          return (
            <div
              className={`text-sm text-gray-800 dark:text-white whitespace-nowrap ${canEditJoiningDate ? 'cursor-pointer hover:text-primary' : ''}`}
              onClick={canEditJoiningDate ? () => openJoiningDateModal(candidate) : undefined}
              onKeyDown={
                canEditJoiningDate
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        openJoiningDateModal(candidate)
                      }
                    }
                  : undefined
              }
              role={canEditJoiningDate ? 'button' : undefined}
              tabIndex={canEditJoiningDate ? 0 : undefined}
              title={canEditJoiningDate ? 'Click to edit joining date' : undefined}
            >
              <span className="inline-flex items-center gap-1.5">
                <i className="ri-calendar-check-line text-gray-500 dark:text-gray-400" />
                {displayText}
              </span>
            </div>
          )
        },
      },
      {
        Header: 'Actions',
        accessor: 'id',
        disableSortBy: true,
        Cell: ({ row }: any) => {
          const c = row.original as CandidateDisplay
          return (
            <div className="flex flex-wrap items-center gap-1">
              <div className="hs-tooltip ti-main-tooltip">
                <button
                  type="button"
                  onClick={() => openCandidatePreview(c)}
                  className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm !h-[1.75rem] !w-[1.75rem] bg-success/10 text-success hover:bg-success hover:text-white"
                  title="View Details"
                >
                  <i className="ri-eye-line"></i>
                  <span className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white" role="tooltip">View Details</span>
                </button>
              </div>
              {isAdministrator && c.ownerUserId && authUser?.id && String(authUser.id) !== String(c.ownerUserId) && (
                <div className="hs-tooltip ti-main-tooltip">
                  <button
                    type="button"
                    onClick={() => handleImpersonateFromCandidate(c)}
                    disabled={authLoading || impersonatingOwnerUserId === c.ownerUserId}
                    className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm !h-[1.75rem] !w-[1.75rem] bg-teal-500/10 text-teal-600 hover:bg-teal-600 hover:text-white disabled:opacity-70 disabled:cursor-not-allowed dark:text-teal-400 dark:hover:bg-teal-600"
                    title="Log in as this employee (impersonate)"
                    aria-label={`Login as ${c.name}`}
                  >
                    <i className="ri-login-box-line"></i>
                    <span
                      className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white"
                      role="tooltip"
                    >
                      Login as
                    </span>
                  </button>
                </div>
              )}
              <div className="hs-tooltip ti-main-tooltip">
                <Link href={`/ats/employees/edit/?id=${c.id}`} className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm !h-[1.75rem] !w-[1.75rem] bg-info/10 text-info hover:bg-info hover:text-white" title="Edit employee">
                  <i className="ri-pencil-line"></i>
                  <span className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white" role="tooltip">Edit employee</span>
                </Link>
              </div>
              {/* <div className="hs-tooltip ti-main-tooltip">
                <button type="button" onClick={() => openDocumentsModal(c)} className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm !h-[1.75rem] !w-[1.75rem] bg-secondary/10 text-secondary hover:bg-secondary hover:text-white" title="View Documents">
                  <i className="ri-file-list-line"></i>
                  <span className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white" role="tooltip">View Documents</span>
                </button>
              </div>  */}
              {/* <div className="hs-tooltip ti-main-tooltip">
                <button type="button" onClick={() => openSalarySlipModal(c)} className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm !h-[1.75rem] !w-[1.75rem] bg-warning/10 text-warning hover:bg-warning hover:text-white" title="Upload Salary Slip">
                  <i className="ri-file-add-line"></i>
                  <span className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white" role="tooltip">Upload Salary Slip</span>
                </button>
              </div> */}
              <div className="hs-tooltip ti-main-tooltip">
                <button type="button" onClick={() => handleShareClick(c)} className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm !h-[1.75rem] !w-[1.75rem] bg-primary/10 text-primary hover:bg-primary hover:text-white" title="Share profile">
                  <i className="ri-share-line"></i>
                  <span className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white" role="tooltip">Share profile</span>
                </button>
              </div>
              <div className="hs-tooltip ti-main-tooltip">
                <button
                  type="button"
                  onClick={() => openAttendanceOverlay(c)}
                  className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm !h-[1.75rem] !w-[1.75rem] bg-purple-500/10 text-purple-500 hover:bg-purple-500 hover:text-white"
                  title="Attendance calendar"
                  aria-label="View attendance calendar"
                >
                  <i className="ri-calendar-check-line"></i>
                  <span className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white" role="tooltip">
                    Attendance
                  </span>
                </button>
              </div>
              {c.isEmailVerified === false && (
                <div className="hs-tooltip ti-main-tooltip">
                  <button type="button" onClick={() => handleResendVerification(c)} className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm !h-[1.75rem] !w-[1.75rem] bg-teal-500/10 text-teal-500 hover:bg-teal-500 hover:text-white" title="Resend Email Verification">
                    <i className="ri-mail-send-line"></i>
                    <span className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white" role="tooltip">Resend Email Verification</span>
                  </button>
                </div>
              )}
              <div className="hs-tooltip ti-main-tooltip">
                <button type="button" onClick={() => handleAddNote(c.id, c)} className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm !h-[1.75rem] !w-[1.75rem] bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white" title="Add Note">
                  <i className="ri-file-text-line"></i>
                  <span className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white" role="tooltip">Add Note</span>
                </button>
              </div>
              <div className="hs-tooltip ti-main-tooltip">
                <button type="button" onClick={() => openFeedbackModal(c)} className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm !h-[1.75rem] !w-[1.75rem] bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white" title="Add Feedback">
                  <i className="ri-feedback-line"></i>
                  <span className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white" role="tooltip">Add Feedback</span>
                </button>
              </div>
              {/* <div className="hs-tooltip ti-main-tooltip">
                <button
                  type="button"
                  onClick={() => handleDeleteCandidate(c)}
                  disabled={deletingCandidateId === c.id}
                  className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm !h-[1.75rem] !w-[1.75rem] bg-danger/10 text-danger hover:bg-danger hover:text-white disabled:opacity-70 disabled:cursor-not-allowed"
                  title="Delete"
                >
                  {deletingCandidateId === c.id ? (
                    <i className="ri-loader-4-line animate-spin" />
                  ) : (
                    <i className="ri-delete-bin-line"></i>
                  )}
                  <span className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white" role="tooltip">Delete</span>
                </button>
              </div> */}
              {/* <div className="inline-flex" data-more-menu-container>
                <button
                  type="button"
                  className="ti-btn ti-btn-icon ti-btn-sm !h-[1.75rem] !w-[1.75rem] bg-gray-500/10 text-gray-600 dark:text-gray-400 hover:bg-gray-500 hover:text-white"
                  title="More"
                  aria-label="More actions"
                  aria-expanded={moreMenuState?.candidate.id === c.id}
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    const target = e.currentTarget as HTMLElement
                    const rect = target.getBoundingClientRect()
                    if (moreMenuState?.candidate.id === c.id) {
                      setMoreMenuState(null)
                    } else {
                      setMoreMenuState({ candidate: c, top: rect.bottom + 4, left: Math.min(rect.right - 8, window.innerWidth - 200) })
                    }
                  }}
                >
                  <i className="ri-more-2-fill"></i>
                </button>
              </div> */}
            </div>
          )
        },
      },
    ],
    [
      selectedRows,
      moreMenuState,
      deletingCandidateId,
      openAttendanceOverlay,
      canEditJoiningDate,
      openJoiningDateModal,
      isAdministrator,
      authUser?.id,
      authLoading,
      impersonatingOwnerUserId,
      handleImpersonateFromCandidate,
    ]
  )

  // Server-side filtering: API returns filtered results (name sorts use API fullName + server collation)
  const filteredData = useMemo(() => candidates, [candidates])
  const data = filteredData

  const allNames = filterOptions.names

  const filteredNames = useMemo(() => {
    const q = searchName.trim().toLowerCase()
    if (!q) return []
    return allNames.filter((name) => name.toLowerCase().includes(q))
  }, [allNames, searchName])

  const filteredAgents = useMemo(() => {
    const q = searchAgent.trim().toLowerCase()
    if (!q) return []
    return agentOptions.filter(
      (a) => a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q)
    )
  }, [agentOptions, searchAgent])

  const handleMultiSelectChange = (key: 'name' | 'agentIds', value: string) => {
    setFilters(prev => {
      const currentArray = prev[key]
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value]
      return { ...prev, [key]: newArray }
    })
  }

  const handleRemoveFilter = (key: 'name' | 'agentIds', value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].filter(item => item !== value)
    }))
  }

  const handleResetFilters = () => {
    setFilters({
      name: [],
      email: '',
      employeeId: '',
      agentIds: [],
      employmentStatus: 'current',
    })
    setSearchName('')
    setSearchAgent('')
  }

  useEffect(() => {
    if (!employeesFilterPanelOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setEmployeesFilterPanelOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [employeesFilterPanelOpen])

  const hasActiveFilters =
    filters.name.length > 0 ||
    filters.email !== '' ||
    filters.employeeId !== '' ||
    filters.agentIds.length > 0 ||
    filters.employmentStatus !== 'current' ||
    debouncedSearchName.trim() !== ''

  const activeFilterCount =
    filters.name.length +
    (filters.email !== '' ? 1 : 0) +
    (filters.employeeId !== '' ? 1 : 0) +
    filters.agentIds.length +
    (filters.employmentStatus !== 'current' ? 1 : 0) +
    (debouncedSearchName.trim() ? 1 : 0)

  const employmentScopeLabel = useMemo(() => {
    switch (filters.employmentStatus) {
      case 'resigned':
        return 'Former employees'
      case 'all':
        return 'All employment statuses'
      default:
        return 'Active employees'
    }
  }, [filters.employmentStatus])

  /** Must be referentially stable when apiPage/pageSize unchanged — inline objects cause usePagination update loops. */
  const employeesPaginationState = useMemo(
    () => ({
      pageIndex: Math.max(0, apiPage - 1),
      pageSize,
    }),
    [apiPage, pageSize]
  )

  const employeesTableOptions = useMemo(
    () => ({
      columns,
      data,
      initialState: EMPLOYEES_TABLE_INITIAL_STATE,
      manualPagination: true,
      manualSortBy: true,
      pageCount: Math.max(1, totalPages || 1),
      state: employeesPaginationState,
    }),
    [columns, data, employeesPaginationState, totalPages]
  )

  const tableInstance: any = useTable(employeesTableOptions, useSortBy, usePagination)

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
    setSortBy,
  } = tableInstance

  const { pageIndex } = state

  // Handle sort selection — ordering is enforced by API `sortBy` (+ client page-sort for skills only); manualSortBy prevents react-table from re-sorting with invalid accessors.
  const handleSortChange = (sortOption: string) => {
    if (sortOption === 'clear-sort') {
      setSelectedSort('')
    } else {
      setSelectedSort(sortOption)
    }
    setApiPage(1)
    switch (sortOption) {
      case 'name-asc':
        setSortBy([{ id: 'candidateInfo', desc: false }])
        break
      case 'name-desc':
        setSortBy([{ id: 'candidateInfo', desc: true }])
        break
      case 'joining-asc':
        setSortBy([{ id: 'joiningDate', desc: false }])
        break
      case 'joining-desc':
        setSortBy([{ id: 'joiningDate', desc: true }])
        break
      case 'clear-sort':
        setSortBy([])
        break
      default:
        setSortBy([])
    }
  }

  // Handle select all checkbox - select ALL rows in filtered dataset
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = new Set(filteredData.map((candidate) => candidate.id))
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
      <Seo title="Employees" />
      <div className="container-fluid max-w-[100vw] px-3 pt-4 pb-6 sm:px-4 sm:pt-6 md:pb-8">
      {!candidatesLoading && candidatesError && (
        <div
          className="mb-6 flex items-start gap-3 rounded-2xl border border-danger/25 bg-danger/[0.07] p-4 text-danger shadow-sm"
          role="alert"
        >
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-danger/15">
            <i className="ri-error-warning-line text-lg" aria-hidden />
          </span>
          <div className="min-w-0 flex-1 text-sm leading-relaxed">{candidatesError}</div>
        </div>
      )}
      {actionError && (
        <div
          className="mb-6 flex items-start gap-3 rounded-2xl border border-danger/25 bg-danger/[0.07] p-4 text-danger shadow-sm"
          role="alert"
        >
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-danger/15">
            <i className="ri-alert-line text-lg" aria-hidden />
          </span>
          <div className="min-w-0 flex-1 text-sm leading-relaxed">{actionError}</div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="ti-btn ti-btn-sm ti-btn-ghost shrink-0 !px-2"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}
      {actionSuccess && (
        <div
          className="mb-6 flex items-start gap-3 rounded-2xl border border-success/25 bg-success/[0.08] p-4 text-success shadow-sm"
          role="status"
          aria-live="polite"
        >
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-success/15">
            <i className="ri-checkbox-circle-line text-lg" aria-hidden />
          </span>
          <div className="min-w-0 flex-1 text-sm font-medium leading-relaxed">{actionSuccess}</div>
        </div>
      )}
      <div className="grid min-h-0 grid-cols-12 gap-4 md:h-[calc(100vh-8rem)] md:gap-6">
        <div className="xl:col-span-12 col-span-12 h-full flex flex-col">
          <div className="box custom-box flex h-full flex-col overflow-hidden rounded-2xl border border-defaultborder/70 bg-white/90 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.35)] ring-1 ring-black/[0.04] backdrop-blur-[2px] dark:bg-bodybg/95 dark:ring-white/10">
            <div className="box-header flex flex-col gap-3 overflow-visible border-b border-defaultborder/80 bg-gradient-to-br from-primary/[0.07] via-transparent to-amber-500/[0.03] px-4 py-4 dark:from-primary/12 dark:to-transparent sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-5 sm:py-6">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary shadow-inner ring-1 ring-primary/20 dark:bg-primary/20">
                  <i className="ri-team-line text-xl" aria-hidden />
                </span>
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="box-title !mb-0 text-xl font-semibold tracking-tight text-defaulttextcolor dark:text-white sm:text-2xl">
                      Employees
                    </h1>
                    <span
                      className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[0.7rem] font-semibold tabular-nums text-primary"
                      title={candidatesLoading ? 'Loading list…' : 'Total matching your filters'}
                    >
                      {candidatesLoading ? (
                        <>
                          <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/35 opacity-60" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary/80" />
                          </span>
                          <span className="text-primary/90">Syncing…</span>
                        </>
                      ) : (
                        <>{totalResults} total</>
                      )}
                    </span>
                  </div>
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-textmuted dark:text-white/45">
                    {employmentScopeLabel}
                    {hasActiveFilters ? ' · filters on' : ''}
                  </p>
                </div>
              </div>
              <div className="relative z-20 flex w-full min-w-0 flex-wrap items-center gap-x-2 gap-y-2 overflow-visible md:justify-end">
                <div className="inline-flex items-center gap-2">
                  <label
                    htmlFor="candidates-page-size"
                    className="mb-0 hidden whitespace-nowrap text-[0.7rem] font-semibold uppercase tracking-wide text-textmuted dark:text-white/45 sm:inline"
                  >
                    Rows
                  </label>
                  <select
                    id="candidates-page-size"
                    className="form-select !m-0 !h-auto !w-auto !min-w-[4.5rem] !rounded-lg !border-defaultborder/80 !py-1.5 !ps-3 !pe-10 !text-[0.75rem] !leading-normal shadow-sm dark:!border-white/15"
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value))
                      setApiPage(1)
                    }}
                    aria-label="Rows per page"
                  >
                    {[10, 25, 50, 100].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>
                <div ref={employeesSortDropdownRef} className="relative z-30">
                  <button
                    type="button"
                    className="ti-btn ti-btn-light !py-1 !px-2 !text-[0.75rem]"
                    id="employees-sort-dropdown-button"
                    aria-haspopup="menu"
                    aria-expanded={employeesToolbarMenu === 'sort'}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setEmployeesToolbarMenu((m) => (m === 'sort' ? null : 'sort'))
                    }}
                  >
                    <i className="ri-arrow-up-down-line font-semibold align-middle me-1"></i>Sort
                    <i className="ri-arrow-down-s-line align-middle ms-1 inline-block"></i>
                  </button>
                  {employeesToolbarMenu === 'sort' ? (
                    <ul
                      className="absolute end-0 top-full z-50 mt-1 max-h-[min(70vh,24rem)] min-w-[12rem] overflow-y-auto rounded-lg border border-defaultborder bg-white py-1 shadow-lg dark:border-defaultborder/20 dark:bg-bodybg"
                      role="menu"
                      aria-labelledby="employees-sort-dropdown-button"
                    >
                    <li role="none">
                      <button
                        type="button"
                        role="menuitem"
                        className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${selectedSort === 'name-asc' ? 'active' : ''}`}
                        onClick={() => {
                          setEmployeesToolbarMenu(null)
                          handleSortChange('name-asc')
                        }}
                      >
                        <i className="ri-sort-asc me-2 align-middle inline-block"></i>Name (A-Z)
                      </button>
                    </li>
                    <li role="none">
                      <button
                        type="button"
                        role="menuitem"
                        className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${selectedSort === 'name-desc' ? 'active' : ''}`}
                        onClick={() => {
                          setEmployeesToolbarMenu(null)
                          handleSortChange('name-desc')
                        }}
                      >
                        <i className="ri-sort-desc me-2 align-middle inline-block"></i>Name (Z-A)
                      </button>
                    </li>
                    <li className="ti-dropdown-divider"></li>
                    <li role="none">
                      <button
                        type="button"
                        role="menuitem"
                        className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left text-gray-500 dark:text-gray-400"
                        onClick={() => {
                          setEmployeesToolbarMenu(null)
                          handleSortChange('clear-sort')
                        }}
                      >
                        <i className="ri-close-line me-2 align-middle inline-block"></i>Clear Sort
                      </button>
                    </li>
                    </ul>
                  ) : null}
                </div>
                <Link
                  href="/ats/employees/add"
                  className="ti-btn ti-btn-primary-full !py-1 !px-2 !text-[0.75rem]"
                >
                  <i className="ri-add-line font-semibold align-middle"></i>Add employee
                </Link>
                <div ref={employeesExcelDropdownRef} className="relative z-30">
                  <button
                    type="button"
                    className="ti-btn ti-btn-primary !py-1 !px-2 !text-[0.75rem]"
                    id="employees-excel-dropdown-button"
                    aria-haspopup="menu"
                    aria-expanded={employeesToolbarMenu === 'excel'}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setEmployeesToolbarMenu((m) => (m === 'excel' ? null : 'excel'))
                    }}
                  >
                    <i className="ri-file-excel-2-line font-semibold align-middle me-1"></i>Excel
                    <i className="ri-arrow-down-s-line align-middle ms-1 inline-block"></i>
                  </button>
                  {employeesToolbarMenu === 'excel' ? (
                    <ul
                      className="absolute end-0 top-full z-50 mt-1 min-w-[10rem] rounded-lg border border-defaultborder bg-white py-1 shadow-lg dark:border-defaultborder/20 dark:bg-bodybg"
                      role="menu"
                      aria-labelledby="employees-excel-dropdown-button"
                    >
                    <li role="none">
                      <button
                        type="button"
                        role="menuitem"
                        className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left"
                        onClick={() => {
                          setEmployeesToolbarMenu(null)
                          router.push('/ats/employees/import')
                        }}
                      >
                        <i className="ri-upload-2-line me-2 align-middle inline-block"></i>Import
                      </button>
                    </li>
                    <li role="none">
                      <button
                        type="button"
                        role="menuitem"
                        className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left"
                        onClick={() => {
                          setEmployeesToolbarMenu(null)
                          handleExportAllOpen()
                        }}
                      >
                        <i className="ri-file-excel-2-line me-2 align-middle inline-block"></i>Export
                      </button>
                    </li>
                    <li role="none">
                      <button
                        type="button"
                        role="menuitem"
                        className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left"
                        onClick={() => {
                          setEmployeesToolbarMenu(null)
                          downloadCandidateExcelTemplate()
                        }}
                      >
                        <i className="ri-download-line me-2 align-middle inline-block"></i>Template
                      </button>
                    </li>
                    </ul>
                  ) : null}
                </div>
                <button
                  type="button"
                  className={`ti-btn ti-btn-light !py-1 !px-2 !text-[0.75rem] ${employeesFilterPanelOpen ? 'ring-2 ring-primary/30 bg-primary/[0.06]' : ''}`}
                  aria-expanded={employeesFilterPanelOpen}
                  onClick={() => setEmployeesFilterPanelOpen((v) => !v)}
                >
                  <i className="ri-search-line font-semibold align-middle me-1"></i>Search
                  {hasActiveFilters && (
                    <span className="badge bg-primary text-white rounded-full ms-1 text-[0.65rem]">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              
                {selectedRows.size > 0 && (
                  <>
                    <button type="button" className="ti-btn ti-btn-light !py-1 !px-2 !text-[0.75rem]" onClick={() => openWeekOffModal(Array.from(selectedRows))}>
                      <i className="ri-calendar-schedule-line font-semibold align-middle me-1"></i>Week-off
                    </button>
                    <button type="button" className="ti-btn ti-btn-light !py-1 !px-2 !text-[0.75rem]" onClick={() => openAssignShiftModal(Array.from(selectedRows))}>
                      <i className="ri-time-line font-semibold align-middle me-1"></i>Assign shift
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="ti-btn ti-btn-danger !py-1 !px-2 !text-[0.75rem] disabled:opacity-50"
                  disabled={selectedRows.size === 0 || bulkDeleteSubmitting}
                  title={
                    selectedRows.size === 0 && !bulkDeleteSubmitting
                      ? 'Select one or more rows in the table, then click Delete'
                      : 'Delete selected employees'
                  }
                  onClick={handleBulkDelete}
                >
                  <i className="ri-delete-bin-line font-semibold align-middle me-1"></i>{bulkDeleteSubmitting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>

            <CandidatesFilterPanel
              layoutOpen={employeesFilterPanelOpen}
              onCloseLayout={() => setEmployeesFilterPanelOpen(false)}
              filters={filters}
              setFilters={setFilters}
              allNames={allNames}
              filterOptionsLoading={filterOptionsLoading}
              filteredNames={filteredNames}
              searchName={searchName}
              setSearchName={setSearchName}
              agentOptions={agentOptions}
              agentsLoading={agentsLoading}
              filteredAgents={filteredAgents}
              searchAgent={searchAgent}
              setSearchAgent={setSearchAgent}
              handleMultiSelectChange={handleMultiSelectChange}
              handleRemoveFilter={handleRemoveFilter}
              handleResetFilters={handleResetFilters}
              hasActiveFilters={hasActiveFilters}
              activeFilterCount={activeFilterCount}
            />

            <div className="box-body !p-0 flex-1 flex flex-col overflow-hidden min-h-0">
              {candidatesLoading && (
                <div
                  className="relative h-1 w-full shrink-0 overflow-hidden bg-primary/[0.08] dark:bg-primary/[0.12]"
                  role="progressbar"
                  aria-valuetext="Loading employees"
                  aria-busy="true"
                >
                  <div className="absolute inset-y-0 left-0 w-[28%] rounded-e-full bg-gradient-to-r from-primary/30 via-primary to-primary/30 ring-1 ring-primary/25 motion-safe:animate-candidates-load-bar" />
                </div>
              )}
              <div className="flex w-full min-w-0 flex-row flex-wrap items-center gap-2 gap-y-2 border-b border-defaultborder/60 bg-gradient-to-r from-slate-50/95 via-white/60 to-transparent px-4 py-3 text-[0.72rem] font-medium text-textmuted dark:from-white/[0.04] dark:via-transparent dark:to-white/[0.02] dark:text-white/55 sm:gap-x-5 sm:px-5">
                <span className="inline-flex max-w-full shrink-0 items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] px-2.5 py-1 text-emerald-900 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-100/90">
                  <i className="ri-checkbox-blank-circle-fill shrink-0 text-[0.5rem] text-emerald-500" aria-hidden />
                  Active row
                </span>
                <span
                  className="inline-flex max-w-full shrink-0 items-center gap-2 rounded-full border border-red-500/25 bg-red-500/[0.06] px-2.5 py-1 text-red-950 dark:border-red-500/30 dark:bg-red-950/30 dark:text-red-100/95"
                  title="Employee has a resign date on or before today"
                >
                  <i className="ri-checkbox-blank-circle-fill shrink-0 text-[0.5rem] text-red-500" aria-hidden />
                  <span className="min-w-0">
                    Resigned<span className="hidden sm:inline"> (exit in the past)</span>
                  </span>
                </span>
              </div>
              <div
                className="table-responsive flex-1 overflow-y-auto overflow-x-hidden rounded-b-xl bg-slate-50/40 [-webkit-overflow-scrolling:touch] dark:bg-black/25 md:overflow-x-auto"
                style={{ minHeight: 0 }}
              >
                <table
                  {...getTableProps()}
                  className="table w-full min-w-0 border-separate border-spacing-0 border-0 text-sm whitespace-normal md:min-w-full md:table-fixed md:whitespace-nowrap"
                  aria-busy={candidatesLoading}
                >
                  <thead>
                    {headerGroups.map((headerGroup: any, i: number) => (
                      <tr
                        {...headerGroup.getHeaderGroupProps()}
                        className="border-b border-defaultborder/70 bg-primary/[0.05] dark:border-white/10 dark:bg-primary/10"
                        key={`header-group-${i}`}
                      >
                        {headerGroup.headers.map((column: any, i: number) => {
                          const headerProps = column.getHeaderProps()
                          const isCheckboxCol = column.id === 'checkbox'
                          const isJoiningCol = column.id === 'joiningDate'
                          const headerSortEmployee = column.id === 'candidateInfo'
                          const headerSortJoining = column.id === 'joiningDate'
                          const clickableHeader = headerSortEmployee || headerSortJoining

                          let sortIcon: React.ReactNode = null
                          if (headerSortEmployee && (selectedSort === 'name-asc' || selectedSort === 'name-desc')) {
                            sortIcon =
                              selectedSort === 'name-desc' ? (
                                <i className="ri-arrow-down-s-line text-[0.875rem]" aria-hidden />
                              ) : (
                                <i className="ri-arrow-up-s-line text-[0.875rem]" aria-hidden />
                              )
                          } else if (headerSortJoining && (selectedSort === 'joining-asc' || selectedSort === 'joining-desc')) {
                            sortIcon =
                              selectedSort === 'joining-desc' ? (
                                <i className="ri-arrow-down-s-line text-[0.875rem]" aria-hidden />
                              ) : (
                                <i className="ri-arrow-up-s-line text-[0.875rem]" aria-hidden />
                              )
                          }

                          return (
                          <th
                            {...headerProps}
                            scope="col"
                            className={
                              'sticky top-0 z-10 border-b border-defaultborder/80 bg-gray-50/95 text-start shadow-[0_1px_0_0_rgba(15,23,42,0.06)] backdrop-blur-sm first:rounded-tl-none dark:border-white/10 dark:bg-bodybg/95 dark:shadow-[0_1px_0_0_rgba(255,255,255,0.06)]' +
                              (isJoiningCol ? ' hidden md:table-cell' : '') +
                              (clickableHeader ? ' cursor-pointer select-none' : '')
                            }
                            key={column.id || `col-${i}`}
                            {...(clickableHeader
                              ? {
                                  tabIndex: 0,
                                  'aria-sort':
                                    headerSortEmployee && selectedSort === 'name-asc'
                                      ? ('ascending' as const)
                                      : headerSortEmployee && selectedSort === 'name-desc'
                                        ? ('descending' as const)
                                        : headerSortJoining && selectedSort === 'joining-asc'
                                          ? ('ascending' as const)
                                          : headerSortJoining && selectedSort === 'joining-desc'
                                            ? ('descending' as const)
                                            : ('none' as const),
                                  onClick: () => {
                                    if (headerSortEmployee) {
                                      handleSortChange(nextNameSortToggle(selectedSort))
                                    } else {
                                      handleSortChange(nextJoinSortToggle(selectedSort))
                                    }
                                  },
                                  onKeyDown: (e: React.KeyboardEvent) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault()
                                      if (headerSortEmployee) {
                                        handleSortChange(nextNameSortToggle(selectedSort))
                                      } else {
                                        handleSortChange(nextJoinSortToggle(selectedSort))
                                      }
                                    }
                                  },
                                  title:
                                    headerSortEmployee
                                      ? selectedSort === 'name-asc' || selectedSort === 'name-desc'
                                        ? 'Toggle name sort direction'
                                        : 'Sort by name (A-Z first)'
                                      : headerSortJoining && (selectedSort === 'joining-asc' || selectedSort === 'joining-desc')
                                        ? 'Toggle joining date sort direction'
                                        : 'Sort by joining date (oldest first)',
                                }
                              : {})}
                            style={{
                              ...headerProps.style,
                              position: 'sticky',
                              top: 0,
                              zIndex: 10,
                              ...(isCheckboxCol ? { width: 52, minWidth: 52, maxWidth: 52 } : {}),
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
                                <span className={sortIcon ? 'text-defaulttextcolor/80' : ''}>{sortIcon ?? null}</span>
                              </div>
                            )}
                          </th>
                          );
                        })}
                      </tr>
                    ))}
                  </thead>
                  <tbody {...getTableBodyProps()}>
                    {candidatesLoading &&
                      Array.from({ length: 8 }).map((_, skelRow) => {
                        const colCount = headerGroups[0]?.headers?.length ?? 5
                        return (
                          <tr
                            key={`candidates-skel-${skelRow}`}
                            className="border-b border-defaultborder/50 dark:border-white/[0.06]"
                            style={{ opacity: 1 - skelRow * 0.055 }}
                          >
                            {Array.from({ length: colCount }).map((__, colIdx) => {
                              const isCheckbox = headerGroups[0]?.headers?.[colIdx]?.id === 'checkbox'
                              const hideJoinSkel =
                                headerGroups[0]?.headers?.[colIdx]?.id === 'joiningDate'
                              const wPct = isCheckbox ? 16 : [78, 52, 48, 40, 36, 32][colIdx % 6]
                              return (
                                <td
                                  key={`candidates-skel-${skelRow}-${colIdx}`}
                                  className={
                                    'px-3 py-3.5 align-middle' +
                                    (hideJoinSkel ? ' hidden md:table-cell' : '')
                                  }
                                  style={
                                    isCheckbox
                                      ? { width: 52, minWidth: 52, maxWidth: 52 }
                                      : undefined
                                  }
                                >
                                  {isCheckbox ? (
                                    <div className="mx-auto h-4 w-4 rounded border border-defaultborder/50 bg-white/50 dark:border-white/10 dark:bg-white/[0.04]" />
                                  ) : (
                                    <div
                                      className="h-3.5 max-w-full rounded-md bg-gradient-to-r from-slate-200/90 via-slate-100/95 to-slate-200/90 dark:from-white/[0.07] dark:via-white/[0.11] dark:to-white/[0.07] motion-safe:animate-pulse"
                                      style={{
                                        width: `${wPct}%`,
                                        animationDelay: `${skelRow * 45 + colIdx * 30}ms`,
                                      }}
                                    />
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                    {!candidatesLoading &&
                      page.map((row: any, i: number) => {
                      prepareRow(row)
                      const rowCandidate = row.original as CandidateDisplay
                      const resigned = isCandidateResigned(rowCandidate)
                      const rdLabel = resignDateLabel(rowCandidate)
                      return (
                        <tr
                          {...row.getRowProps()}
                          className={
                            "border-b border-gray-300 dark:border-gray-600 transition-colors " +
                            (resigned
                              ? "!bg-red-50 dark:!bg-red-950/35 !bg-gradient-to-r from-red-100/95 via-red-50/90 to-red-50/70 dark:from-red-950/50 dark:via-red-950/35 dark:to-red-950/25 border-l-[5px] !border-l-red-600 hover:!bg-red-100/95 dark:hover:!bg-red-950/45"
                              : "border-l-[4px] border-l-emerald-500/35 dark:border-l-emerald-500/30 odd:!bg-gray-50/80 dark:odd:!bg-white/[0.03] hover:!bg-emerald-50/40 dark:hover:!bg-emerald-950/15")
                          }
                          title={
                            resigned
                              ? `Resigned${rdLabel ? ` · ${rdLabel}` : ""}`
                              : "Active employee"
                          }
                          key={row.id || `row-${i}`}
                        >
                          {row.cells.map((cell: any, i: number) => {
                            const isCheckboxCol = cell.column.id === 'checkbox';
                            const isJoiningCol = cell.column.id === 'joiningDate';
                            const cellProps = cell.getCellProps();
                            return (
                              <td
                                {...cellProps}
                                key={cell.column.id || `cell-${i}`}
                                className={
                                  (cellProps.className || '') + (isJoiningCol ? ' hidden md:table-cell' : '')
                                }
                                style={{
                                  ...cellProps.style,
                                  ...(isCheckboxCol ? { width: 52, minWidth: 52, maxWidth: 52 } : {}),
                                }}
                              >
                                {cell.render('Cell')}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                    {!candidatesLoading && page.length === 0 && (
                      <tr>
                        <td colSpan={headerGroups[0]?.headers?.length ?? 4} className="!border-0 !p-0 align-top">
                          <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
                            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/20">
                              <i className="ri-inbox-archive-line text-2xl" aria-hidden />
                            </span>
                            <div className="max-w-md space-y-1">
                              <p className="text-base font-semibold text-defaulttextcolor dark:text-white">No employees on this page</p>
                              <p className="text-sm leading-relaxed text-textmuted dark:text-white/50">
                                Try changing employment status, clearing name filters, or widening your search in the panel.
                              </p>
                            </div>
                            <button
                              type="button"
                              className="ti-btn ti-btn-primary !rounded-xl !px-4 !py-2 !text-sm font-medium shadow-sm"
                              onClick={() => setEmployeesFilterPanelOpen(true)}
                            >
                              <i className="ri-filter-3-line me-1.5 align-middle" />
                              Open filters
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="box-footer border-t border-defaultborder/60 !bg-defaultbackground/60 px-4 py-3.5 dark:!bg-white/[0.03]">
              <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
                <div className="text-center text-sm text-textmuted dark:text-white/55 sm:text-start">
                  Showing{' '}
                  <span className="font-semibold tabular-nums text-defaulttextcolor dark:text-white/90">
                    {totalResults === 0 ? 0 : (apiPage - 1) * pageSize + 1}
                  </span>
                  {'–'}
                  <span className="font-semibold tabular-nums text-defaulttextcolor dark:text-white/90">
                    {Math.min(apiPage * pageSize, totalResults)}
                  </span>
                  {' '}
                  of <span className="font-semibold tabular-nums text-defaulttextcolor dark:text-white/90">{totalResults}</span> entries
                </div>
                <div className="flex w-full justify-center overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:ms-auto sm:w-auto sm:justify-end [&::-webkit-scrollbar]:hidden">
                  <nav aria-label="Page navigation" className="pagination-style-4 shrink-0">
                    <ul className="ti-pagination mb-0">
                      <li className={`page-item ${apiPage <= 1 ? 'disabled' : ''}`}>
                        <button
                          className="page-link px-3 py-[0.375rem]"
                          onClick={() => setApiPage((p) => Math.max(1, p - 1))}
                          disabled={apiPage <= 1}
                        >
                          Prev
                        </button>
                      </li>
                      {pageOptions.length <= 7 ? (
                        pageOptions.map((page: number) => (
                          <li
                            key={page}
                            className={`page-item ${apiPage === page + 1 ? 'active' : ''}`}
                          >
                            <button
                              className="page-link px-3 py-[0.375rem]"
                              onClick={() => setApiPage(page + 1)}
                            >
                              {page + 1}
                            </button>
                          </li>
                        ))
                      ) : (
                        <>
                          {apiPage > 3 && (
                            <>
                              <li className="page-item">
                                <button
                                  className="page-link px-3 py-[0.375rem]"
                                  onClick={() => setApiPage(1)}
                                >
                                  1
                                </button>
                              </li>
                              {apiPage > 4 && (
                                <li className="page-item disabled">
                                  <span className="page-link px-3 py-[0.375rem]">...</span>
                                </li>
                              )}
                            </>
                          )}
                          {Array.from({ length: Math.min(5, pageCount) }, (_, i) => {
                            let pageNum
                            if (apiPage < 4) {
                              pageNum = i + 1
                            } else if (apiPage > pageCount - 2) {
                              pageNum = pageCount - Math.min(5, pageCount) + 1 + i
                            } else {
                              pageNum = apiPage - 2 + i
                            }
                            return (
                              <li
                                key={pageNum}
                                className={`page-item ${apiPage === pageNum ? 'active' : ''}`}
                              >
                                <button
                                  className="page-link px-3 py-[0.375rem]"
                                  onClick={() => setApiPage(pageNum)}
                                >
                                  {pageNum}
                                </button>
                              </li>
                            )
                          })}
                          {apiPage < pageCount - 2 && (
                            <>
                              {apiPage < pageCount - 3 && (
                                <li className="page-item disabled">
                                  <span className="page-link px-3 py-[0.375rem]">...</span>
                                </li>
                              )}
                              <li className="page-item">
                                <button
                                  className="page-link px-3 py-[0.375rem]"
                                  onClick={() => setApiPage(pageCount)}
                                >
                                  {pageCount}
                                </button>
                              </li>
                            </>
                          )}
                        </>
                      )}
                      <li className={`page-item ${apiPage >= totalPages ? 'disabled' : ''}`}>
                        <button
                          className="page-link px-3 py-[0.375rem] text-primary"
                          onClick={() => setApiPage((p) => Math.min(totalPages, p + 1))}
                          disabled={apiPage >= totalPages}
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
      </div>

      {/* Candidate Preview Panel (Offcanvas – same slider view as Jobs) */}
      <div
        id="candidate-preview-panel"
        className="hs-overlay hidden ti-offcanvas ti-offcanvas-right !z-[105] !max-w-[50rem] lg:!max-w-[60rem]"
        tabIndex={-1}
      >
        <div className="ti-offcanvas-header bg-gray-50 dark:bg-black/20 !py-2.5">
          <h6 className="ti-offcanvas-title text-base font-semibold flex items-center gap-2">
            <i className="ri-user-line text-primary text-base"></i>
            {previewCandidate?.name || 'Employee preview'}
          </h6>
              <button
                type="button"
            className="hs-dropdown-toggle ti-btn flex-shrink-0 p-0 transition-none text-gray-500 hover:text-gray-700 focus:ring-gray-400 focus:ring-offset-white dark:text-[#8c9097] dark:text-white/50 dark:hover:text-white/80 rounded-md p-1"
            data-hs-overlay="#candidate-preview-panel"
            onClick={() => {
              const el = document.querySelector('#candidate-preview-panel');
              if (el) (window as any).HSOverlay?.close(el);
              setPreviewCandidate(null);
              setViewDetailTab('personal');
            }}
          >
            <span className="sr-only">Close</span>
            <svg className="w-3.5 h-3.5" width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0.258206 1.00652C0.351976 0.912791 0.479126 0.860131 0.611706 0.860131C0.744296 0.860131 0.871447 0.912791 0.965207 1.00652L3.61171 3.65302L6.25822 1.00652C6.30432 0.958771 6.35952 0.920671 6.42052 0.894471C6.48152 0.868271 6.54712 0.854471 6.61352 0.853901C6.67992 0.853321 6.74572 0.865971 6.80722 0.891111C6.86862 0.916251 6.92442 0.953381 6.97142 1.00032C7.01832 1.04727 7.05552 1.1031 7.08062 1.16454C7.10572 1.22599 7.11842 1.29183 7.11782 1.35822C7.11722 1.42461 7.10342 1.49022 7.07722 1.55122C7.05102 1.61222 7.01292 1.6674 6.96522 1.71352L4.31871 4.36002L6.96522 7.00648C7.05632 7.10078 7.10672 7.22708 7.10552 7.35818C7.10442 7.48928 7.05182 7.61468 6.95912 7.70738C6.86642 7.80018 6.74102 7.85268 6.60992 7.85388C6.47882 7.85498 6.35252 7.80458 6.25822 7.71348L3.61171 5.06702L0.965207 7.71348C0.870907 7.80458 0.744606 7.85498 0.613506 7.85388C0.482406 7.85268 0.357007 7.80018 0.264297 7.70738C0.171597 7.61468 0.119017 7.48928 0.117877 7.35818C0.116737 7.22708 0.167126 7.10078 0.258206 7.00648L2.90471 4.36002L0.258206 1.71352C0.164476 1.61976 0.111816 1.4926 0.111816 1.36002C0.111816 1.22744 0.164476 1.10028 0.258206 1.00652Z" fill="currentColor"/>
            </svg>
              </button>
            </div>
        <div className="ti-offcanvas-body !p-4 overflow-y-auto">
          {previewCandidate ? (
            <>
              {/* Candidate header summary */}
              <div className="flex items-start gap-3 mb-4 pb-4 border-b border-gray-200 dark:border-defaultborder/10">
                <div className="avatar avatar-lg avatar-rounded flex-shrink-0 overflow-hidden">
                  <CandidateAvatar candidate={previewCandidate} className="w-full h-full rounded-full" />
                </div>
                    <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">{previewCandidate.name}</h3>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{previewCandidate.email}</p>
                      {(previewCandidate._raw?.employeeId) && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Employee ID: {previewCandidate._raw.employeeId}</p>
                      )}
                      {(previewCandidate.bio || previewCandidate._raw?.shortBio) && (
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">{previewCandidate.bio || previewCandidate._raw?.shortBio}</p>
                      )}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {((previewCandidate.isProfileCompleted ?? previewCandidate._raw?.isProfileCompleted ?? 0) < 100) && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded">
                        <i className="ri-pie-chart-line"></i>
                        {previewCandidate.isProfileCompleted ?? previewCandidate._raw?.isProfileCompleted ?? 0}% complete
                      </span>
                    )}
                    {canEditJoiningDate ? (
                      <PersonalInfoDateField
                        label="Joining Date"
                        value={previewCandidate._raw?.joiningDate}
                        onSave={handlePersonalInfoJoiningDateSave}
                        saving={personalInfoDateSaving === 'joining'}
                        badgeClassName="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                        icon="ri-calendar-check-line"
                      />
                    ) : (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded" title="Joining Date">
                        <i className="ri-calendar-check-line"></i>
                        {previewCandidate._raw?.joiningDate ? new Date(previewCandidate._raw.joiningDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not set'}
                      </span>
                    )}
                    {canEditResignDate ? (
                      <PersonalInfoDateField
                        label="Resign Date"
                        value={previewCandidate._raw?.resignDate}
                        onSave={handlePersonalInfoResignDateSave}
                        saving={personalInfoDateSaving === 'resign'}
                        allowClear
                        badgeClassName="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
                        icon="ri-calendar-close-line"
                      />
                    ) : (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded" title="Resign Date">
                        <i className="ri-calendar-close-line"></i>
                        {previewCandidate._raw?.resignDate ? new Date(previewCandidate._raw.resignDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not set'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Tabs: small screens = wrap to extra rows (no horizontal scroll); lg+ = one row */}
              <div className="min-w-0 bg-white dark:bg-gray-800 px-4 sm:px-6 lg:px-8 py-4">
                <div className="mb-4 min-w-0 border-b border-gray-200 dark:border-gray-700">
                  <nav
                    role="tablist"
                    aria-label="Profile sections"
                    className="-mb-px flex w-full flex-wrap items-end gap-x-2 gap-y-2 pb-px sm:gap-x-3 lg:flex-nowrap lg:justify-between lg:gap-x-1 lg:gap-y-0 lg:px-1"
                  >
                    {[
                      { id: 'personal', label: 'Personal Info', icon: 'ri-user-line' },
                      { id: 'qualification', label: 'Qualification', icon: 'ri-book-line' },
                      { id: 'experience', label: 'Experience', icon: 'ri-briefcase-line' },
                      { id: 'skills', label: 'Skills', icon: 'ri-tools-line' },
                      { id: 'documents', label: 'Documents', icon: 'ri-file-line' },
                      { id: 'salary', label: 'Salary Slips', icon: 'ri-money-dollar-box-line' },
                      { id: 'notes', label: 'Notes & Feedback', icon: 'ri-file-text-line' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={viewDetailTab === tab.id}
                        onClick={() => setViewDetailTab(tab.id)}
                        className={`inline-flex shrink-0 flex-nowrap items-center gap-1.5 border-b-2 px-2 py-2.5 text-left text-sm font-medium sm:gap-2 sm:px-2.5 lg:flex-1 lg:min-h-[2.75rem] lg:justify-center lg:px-1.5 lg:text-center xl:px-2 ${
                          viewDetailTab === tab.id
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:text-gray-300'
                        }`}
                      >
                        <i className={`${tab.icon} shrink-0 text-base sm:text-[1.05rem]`} aria-hidden />
                        <span className="whitespace-nowrap text-xs font-medium leading-tight md:text-[0.8125rem] lg:text-xs xl:text-sm">
                          {tab.label}
                        </span>
                      </button>
                    ))}
                  </nav>
                </div>

                {/* Tab content */}
                <div className="min-h-[300px] sm:min-h-[400px]">
                  {viewDetailTab === 'personal' && (
                    <div className="space-y-4">
                      <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Personal Information</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                          <p className="mt-1 text-sm text-gray-900 dark:text-white">{previewCandidate.name || '-'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                          <p className="mt-1 text-sm text-gray-900 dark:text-white">{previewCandidate.email || '-'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Company work email
                          </label>
                          <p className="mt-1 text-sm text-gray-900 dark:text-white">
                            {(previewCandidate._raw?.companyAssignedEmail as string | undefined)?.trim() || "—"}
                          </p>
                          {(previewCandidate._raw?.companyEmailProvider as string | undefined) ? (
                            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                              Provider: {String(previewCandidate._raw.companyEmailProvider)}
                            </p>
                          ) : null}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number</label>
                          <p className="mt-1 text-sm text-gray-900 dark:text-white">{previewCandidate.phone || '-'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Education</label>
                          <p className="mt-1 text-sm text-gray-900 dark:text-white">{previewCandidate.education || '-'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Experience (years)</label>
                          <p className="mt-1 text-sm text-gray-900 dark:text-white">{previewCandidate.experience ?? '-'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Position</label>
                          <p className="mt-1 text-sm text-gray-900 dark:text-white">{positionLabelFromRaw(previewCandidate._raw)}</p>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Training programs</label>
                          <p className="mt-1 text-sm text-gray-900 dark:text-white">
                            {trainingProgramsLabel(previewCandidate._raw?.assignedTrainingPrograms)}
                          </p>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Projects</label>
                          <p className="mt-1 text-sm text-gray-900 dark:text-white">
                            {projectsAssignedLabel(previewCandidate._raw?.assignedProjects)}
                          </p>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Short Bio</label>
                          <p className="mt-1 text-sm text-gray-900 dark:text-white">{previewCandidate.bio || previewCandidate._raw?.shortBio || '-'}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {viewDetailTab === 'qualification' && (
                    <div className="space-y-4">
                      <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Education & Qualifications</h4>
                      {Array.isArray(previewCandidate._raw?.qualifications) && previewCandidate._raw.qualifications.length > 0 ? (
                        previewCandidate._raw.qualifications.map((qual: any, index: number) => (
                          <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                            <h5 className="font-semibold text-gray-900 dark:text-white mb-2">Education #{index + 1}</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Degree</label>
                                <p className="mt-1 text-sm text-gray-900 dark:text-white">{qual?.degree || '-'}</p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Institute</label>
                                <p className="mt-1 text-sm text-gray-900 dark:text-white">{qual?.institute || '-'}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <i className="ri-book-line text-4xl text-gray-400 dark:text-gray-500 mb-4"></i>
                          <p className="text-gray-500 dark:text-gray-400">No qualifications listed.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {viewDetailTab === 'experience' && (
                    <div className="space-y-4">
                      <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Work Experience</h4>
                      {Array.isArray(previewCandidate._raw?.experiences) && previewCandidate._raw.experiences.length > 0 ? (
                        previewCandidate._raw.experiences.map((exp: any, index: number) => (
                          <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                            <h5 className="font-semibold text-gray-900 dark:text-white mb-2">Experience #{index + 1}</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Company</label>
                                <p className="mt-1 text-sm text-gray-900 dark:text-white">{exp?.company || '-'}</p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
                                <p className="mt-1 text-sm text-gray-900 dark:text-white">{exp?.role || '-'}</p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
                                <p className="mt-1 text-sm text-gray-900 dark:text-white">{exp?.startDate ? new Date(exp.startDate).toLocaleDateString() : '-'}</p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label>
                                <p className="mt-1 text-sm text-gray-900 dark:text-white">{exp?.endDate ? new Date(exp.endDate).toLocaleDateString() : (exp?.currentlyWorking ? 'Present' : '-')}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <i className="ri-briefcase-line text-4xl text-gray-400 dark:text-gray-500 mb-4"></i>
                          <p className="text-gray-500 dark:text-gray-400">No work experience listed.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {viewDetailTab === 'skills' && (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-3 dark:border-white/10">
                        <div className="min-w-0">
                          <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-0">Skills</h4>
                        </div>
                        <button
                          type="button"
                          disabled={!previewCandidate?.id || skillRecommendLoading || skillRecommendApplyLoading}
                          onClick={() => {
                            setSkillRecommendRole('')
                            setSkillRecommendSuggestions([])
                            setSkillRecommendModalOpen(true)
                          }}
                          aria-label={
                            skillRecommendLoading || skillRecommendApplyLoading
                              ? 'Generating skill suggestions'
                              : 'Suggest skills from a job role using AI'
                          }
                          className="group shrink-0 inline-flex max-w-full items-center gap-2.5 rounded-xl border border-primary/25 bg-gradient-to-br from-primary/[0.09] via-white to-transparent py-2 pl-2 pr-3 text-left shadow-[0_2px_8px_-2px_rgba(15,23,42,0.08)] transition duration-200 hover:border-primary/45 hover:shadow-[0_6px_16px_-4px_rgba(79,70,229,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-45 dark:border-primary/35 dark:from-primary/[0.14] dark:via-gray-900/90 dark:to-gray-950 dark:shadow-[0_2px_12px_-2px_rgba(0,0,0,0.35)] dark:hover:border-primary/55 dark:focus-visible:ring-offset-gray-950"
                        >
                          {skillRecommendLoading || skillRecommendApplyLoading ? (
                            <>
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/15 dark:bg-primary/25">
                                <span
                                  className="inline-block h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin"
                                  aria-hidden
                                />
                              </span>
                              <span className="flex flex-col gap-0.5 pr-1">
                                <span className="text-sm font-semibold leading-tight text-gray-900 dark:text-white">
                                  Working…
                                </span>
                                <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                                  Calling AI
                                </span>
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-white shadow-inner shadow-black/10 ring-2 ring-white/25 transition group-hover:scale-[1.03] group-hover:shadow-md dark:ring-gray-950/60">
                                <i className="ri-lightbulb-flash-line text-lg leading-none" aria-hidden />
                              </span>
                              <span className="flex min-w-0 flex-col gap-0.5 pr-0.5">
                                <span className="text-sm font-semibold leading-tight text-gray-900 dark:text-white">
                                  Suggest skills
                                </span>
                                <span className="text-[11px] font-medium uppercase tracking-wide text-primary/80 dark:text-primary/75">
                                  By job role · AI
                                </span>
                              </span>
                            </>
                          )}
                        </button>
                      </div>
                      {previewCandidate.skillsStructured?.length ? (
                        <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                          <table className="min-w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-800/80">
                              <tr>
                                <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300">Skill</th>
                                <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300">Level</th>
                                <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300">Category</th>
                              </tr>
                            </thead>
                            <tbody>
                              {previewCandidate.skillsStructured.map((row: { name: string; level: string; category?: string }, index: number) => (
                                <tr
                                  key={`${row.name}-${index}`}
                                  className="border-t border-gray-200 dark:border-gray-700"
                                >
                                  <td className="p-3 text-gray-900 dark:text-white">{row.name}</td>
                                  <td className="p-3 text-gray-900 dark:text-white">{row.level}</td>
                                  <td className="p-3 text-gray-900 dark:text-white">{row.category ?? '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <i className="ri-tools-line text-4xl text-gray-400 dark:text-gray-500 mb-4"></i>
                          <p className="text-gray-500 dark:text-gray-400">No skills listed.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {viewDetailTab === 'documents' && (
                    <div className="space-y-4">
                      <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Documents</h4>
                      {actionError && (
                        <div className="p-3 rounded-lg bg-danger/10 text-danger text-sm flex justify-between items-center">
                          <span>{actionError}</span>
                          <button type="button" onClick={() => setActionError(null)} className="shrink-0 ml-2 text-danger/80 hover:text-danger">×</button>
                        </div>
                      )}
                      {previewPanelDocumentsLoading ? (
                        <div className="flex items-center gap-2 py-6 text-sm text-gray-500 dark:text-gray-400">
                          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          Loading documents…
                        </div>
                      ) : (() => {
                        const docsList =
                          previewPanelDocuments ??
                          (Array.isArray(previewCandidate._raw?.documents) ? previewCandidate._raw.documents : [])
                        return Array.isArray(docsList) && docsList.length > 0 ? (
                        <div className="space-y-3">
                          {docsList.map((doc: CandidateDocument & { label?: string; originalName?: string }, index: number) => {
                            const label = doc?.label || doc?.originalName || `Document ${index + 1}`
                            const viewable = candidateDocumentCanView(doc)
                            return (
                            <div key={index} className="flex items-center justify-between gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                              <p className="font-medium text-gray-900 dark:text-white truncate min-w-0 flex-1">{label}</p>
                              <button
                                type="button"
                                disabled={!viewable}
                                title={!viewable ? 'File is not linked to storage — re-upload required' : 'Open document'}
                                className={`ti-btn ti-btn-sm !w-auto !h-auto !min-h-[1.75rem] py-1.5 px-3 shrink-0 whitespace-nowrap ${
                                  viewable ? 'ti-btn-primary' : 'ti-btn-outline text-gray-400 border-gray-300 dark:border-gray-600 cursor-not-allowed'
                                }`}
                                onClick={() => {
                                  if (viewable) handlePreviewPanelDocumentView(index)
                                }}
                              >
                                <i className="ri-external-link-line me-1"></i>View
                              </button>
                            </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <i className="ri-file-line text-4xl text-gray-400 dark:text-gray-500 mb-4"></i>
                          <p className="text-gray-500 dark:text-gray-400">No documents uploaded.</p>
                        </div>
                      )
                      })()}
                    </div>
                  )}

                  {viewDetailTab === 'salary' && (
                    <div className="space-y-4">
                      <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Salary Slips</h4>
                      {Array.isArray(previewCandidate._raw?.salarySlips) && previewCandidate._raw.salarySlips.length > 0 ? (
                        <div className="space-y-3">
                          {previewCandidate._raw.salarySlips.map((slip: any, index: number) => (
                            <div key={index} className="flex items-center justify-between gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                              <span className="text-sm text-gray-900 dark:text-white truncate min-w-0 flex-1">{slip?.month ?? ''} {slip?.year ?? ''}</span>
                              {(slip?.key || slip?.documentUrl || slip?.url) ? (
                                <button
                                  type="button"
                                  className="ti-btn ti-btn-sm ti-btn-primary !w-auto !h-auto !min-h-[1.75rem] py-1.5 px-3 shrink-0 whitespace-nowrap inline-flex items-center"
                                  onClick={() => {
                                    const cid = previewCandidate?.id ?? previewCandidate?._raw?._id
                                    if (cid) handleSalarySlipView(cid, index)
                                  }}
                                >
                                  <i className="ri-external-link-line me-1"></i>View
                                </button>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <i className="ri-money-dollar-box-line text-4xl text-gray-400 dark:text-gray-500 mb-4"></i>
                          <p className="text-gray-500 dark:text-gray-400">No salary slips uploaded.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {viewDetailTab === 'notes' && (
                    <div className="space-y-4">
                      <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Notes & Feedback</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Use the Add Note and Add Feedback actions from the employee row to add notes and feedback.</p>
                      <button
                        type="button"
                        className="ti-btn ti-btn-primary"
                        onClick={() => {
                          handleAddNote(previewCandidate.id, previewCandidate)
                          setPreviewCandidate(null)
                          setViewDetailTab('personal')
                        }}
                      >
                        <i className="ri-file-text-line me-1"></i>Open Notes
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-defaultborder/10">
                <button
                  type="button"
                  className="ti-btn ti-btn-light w-full"
                  data-hs-overlay="#candidate-preview-panel"
                  onClick={() => {
                    const el = document.querySelector('#candidate-preview-panel');
                    if (el) (window as any).HSOverlay?.close(el);
                    setPreviewCandidate(null);
                    setViewDetailTab('personal');
                  }}
                >
                  Close
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">No employee selected</div>
          )}
            </div>
          </div>

      {/* Candidate Notes Panel (Offcanvas) */}
      <div 
        id="candidate-notes-panel" 
        className="hs-overlay hidden ti-offcanvas ti-offcanvas-right !z-[105]"
        tabIndex={-1}
      >
        <div className="ti-offcanvas-header bg-gray-50 dark:bg-black/20 !py-2.5">
          <h6 className="ti-offcanvas-title text-base font-semibold flex items-center gap-2">
            <i className="ri-file-add-line text-primary text-base"></i>
            {getCandidateDetails()?.name || 'Employee notes'}
          </h6>
          <button 
            type="button" 
            className="hs-dropdown-toggle ti-btn flex-shrink-0 p-0 transition-none text-gray-500 hover:text-gray-700 focus:ring-gray-400 focus:ring-offset-white dark:text-[#8c9097] dark:text-white/50 dark:hover:text-white/80 dark:focus:ring-white/10 dark:focus:ring-offset-white/10 hover:bg-gray-100 dark:hover:bg-black/40 rounded-md p-1" 
            data-hs-overlay="#candidate-notes-panel"
            onClick={() => setNotesCandidateId(null)}
          >
            <span className="sr-only">Close</span>
            <svg className="w-3.5 h-3.5" width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0.258206 1.00652C0.351976 0.912791 0.479126 0.860131 0.611706 0.860131C0.744296 0.860131 0.871447 0.912791 0.965207 1.00652L3.61171 3.65302L6.25822 1.00652C6.30432 0.958771 6.35952 0.920671 6.42052 0.894471C6.48152 0.868271 6.54712 0.854471 6.61352 0.853901C6.67992 0.853321 6.74572 0.865971 6.80722 0.891111C6.86862 0.916251 6.92442 0.953381 6.97142 1.00032C7.01832 1.04727 7.05552 1.1031 7.08062 1.16454C7.10572 1.22599 7.11842 1.29183 7.11782 1.35822C7.11722 1.42461 7.10342 1.49022 7.07722 1.55122C7.05102 1.61222 7.01292 1.6674 6.96522 1.71352L4.31871 4.36002L6.96522 7.00648C7.05632 7.10078 7.10672 7.22708 7.10552 7.35818C7.10442 7.48928 7.05182 7.61468 6.95912 7.70738C6.86642 7.80018 6.74102 7.85268 6.60992 7.85388C6.47882 7.85498 6.35252 7.80458 6.25822 7.71348L3.61171 5.06702L0.965207 7.71348C0.870907 7.80458 0.744606 7.85498 0.613506 7.85388C0.482406 7.85268 0.357007 7.80018 0.264297 7.70738C0.171597 7.61468 0.119017 7.48928 0.117877 7.35818C0.116737 7.22708 0.167126 7.10078 0.258206 7.00648L2.90471 4.36002L0.258206 1.71352C0.164476 1.61976 0.111816 1.4926 0.111816 1.36002C0.111816 1.22744 0.164476 1.10028 0.258206 1.00652Z" fill="currentColor"/>
            </svg>
          </button>
        </div>
        <div className="ti-offcanvas-body !p-4">
          {notesCandidateId ? (
            <div className="space-y-6">
              {/* Candidate Info Header */}
              {(() => {
                const candidateDetails = getCandidateDetails()
                return candidateDetails ? (
                  <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 dark:border-primary/30 rounded-lg">
                    <h6 className="font-bold text-gray-800 dark:text-white text-lg mb-2">{candidateDetails.name}</h6>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <i className="ri-mail-line"></i>
                        {candidateDetails.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <i className="ri-phone-line"></i>
                        {candidateDetails.phone}
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
                  Notes ({getCandidateNotes(notesCandidateId).length})
                </h6>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {getCandidateNotes(notesCandidateId).length > 0 ? (
                    getCandidateNotes(notesCandidateId).map((note) => (
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

      {/* Create Candidate Modal */}
      <div 
        id="create-candidate-modal" 
        className="hs-overlay hidden ti-modal"
      >
        <div className="hs-overlay-open:mt-7 ti-modal-box mt-0 ease-out lg:!max-w-lg lg:w-full m-3 lg:!mx-auto">
          <div className="ti-modal-content">
            <div className="ti-modal-header">
              <h6 className="ti-modal-title flex items-center gap-2">
                <i className="ri-user-add-line text-primary"></i>
                Add employee
              </h6>
              <button 
                type="button" 
                className="hs-dropdown-toggle ti-modal-close-btn" 
                data-hs-overlay="#create-candidate-modal"
                onClick={() => {
                  setCreateError(null)
                  setCreateForm({ fullName: '', email: '', phoneNumber: '', shortBio: '', skillsText: '' })
                }}
              >
                <span className="sr-only">Close</span>
                <svg className="w-3.5 h-3.5" width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0.258206 1.00652C0.351976 0.912791 0.479126 0.860131 0.611706 0.860131C0.744296 0.860131 0.871447 0.912791 0.965207 1.00652L3.61171 3.65302L6.25822 1.00652C6.30432 0.958771 6.35952 0.920671 6.42052 0.894471C6.48152 0.868271 6.54712 0.854471 6.61352 0.853901C6.67992 0.853321 6.74572 0.865971 6.80722 0.891111C6.86862 0.916251 6.92442 0.953381 6.97142 1.00032C7.01832 1.04727 7.05552 1.1031 7.08062 1.16454C7.10572 1.22599 7.11842 1.29183 7.11782 1.35822C7.11722 1.42461 7.10342 1.49022 7.07722 1.55122C7.05102 1.61222 7.01292 1.6674 6.96522 1.71352L4.31871 4.36002L6.96522 7.00648C7.05632 7.10078 7.10672 7.22708 7.10552 7.35818C7.10442 7.48928 7.05182 7.61468 6.95912 7.70738C6.86642 7.80018 6.74102 7.85268 6.60992 7.85388C6.47882 7.85498 6.35252 7.80458 6.25822 7.71348L3.61171 5.06702L0.965207 7.71348C0.870907 7.80458 0.744606 7.85498 0.613506 7.85388C0.482406 7.85268 0.357007 7.80018 0.264297 7.70738C0.171597 7.61468 0.119017 7.48928 0.117877 7.35818C0.116737 7.22708 0.167126 7.10078 0.258206 7.00648L2.90471 4.36002L0.258206 1.71352C0.164476 1.61976 0.111816 1.4926 0.111816 1.36002C0.111816 1.22744 0.164476 1.10028 0.258206 1.00652Z" fill="currentColor"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreateSubmit}>
              <div className="ti-modal-body space-y-4">
                {createError && (
                  <div className="p-3 rounded-lg bg-danger/10 text-danger text-sm">
                    {createError}
                  </div>
                )}
                <div>
                  <label className="form-label">Full name <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. John Doe"
                    value={createForm.fullName}
                    onChange={(e) => setCreateForm((f) => ({ ...f, fullName: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Email <span className="text-danger">*</span></label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="john@example.com"
                    value={createForm.email}
                    onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Phone (10 digits) <span className="text-danger">*</span></label>
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="9876543210"
                    value={createForm.phoneNumber}
                    onChange={(e) => setCreateForm((f) => ({ ...f, phoneNumber: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                    maxLength={10}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Bio</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Short bio (optional)"
                    value={createForm.shortBio}
                    onChange={(e) => setCreateForm((f) => ({ ...f, shortBio: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="form-label">Skills (comma-separated)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. React, Node.js, TypeScript"
                    value={createForm.skillsText}
                    onChange={(e) => setCreateForm((f) => ({ ...f, skillsText: e.target.value }))}
                  />
                </div>
              </div>
              <div className="ti-modal-footer">
                <button 
                  type="button" 
                  className="ti-btn ti-btn-light" 
                  data-hs-overlay="#create-candidate-modal"
                  onClick={() => {
                    setCreateError(null)
                    setCreateForm({ fullName: '', email: '', phoneNumber: '', shortBio: '', skillsText: '' })
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ti-btn ti-btn-primary"
                  disabled={createSubmitting}
                >
                  {createSubmitting ? (
                    <>
                      <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full me-1 align-middle"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="ri-add-line me-1"></i>
                      Add employee
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <CandidateActionModals
        documentsCandidate={documentsCandidate}
        setDocumentsCandidate={setDocumentsCandidate}
        documentsList={documentsList}
        documentsLoading={documentsLoading}
        documentStatusMap={documentStatusMap}
        handleDocumentDownload={handleDocumentDownload}
        handleDocumentVerify={handleDocumentVerify}
        salarySlipsFromCandidate={salarySlipsFromCandidate}
        handleSalarySlipView={handleSalarySlipView}
        handleSalarySlipDelete={handleSalarySlipDelete}
        salarySlipCandidate={salarySlipCandidate}
        setSalarySlipCandidate={setSalarySlipCandidate}
        salarySlipForm={salarySlipForm}
        setSalarySlipForm={setSalarySlipForm}
        salarySlipSubmitting={salarySlipSubmitting}
        handleSalarySlipSubmit={handleSalarySlipSubmit}
        feedbackCandidate={feedbackCandidate}
        setFeedbackCandidate={setFeedbackCandidate}
        feedbackForm={feedbackForm}
        setFeedbackForm={setFeedbackForm}
        feedbackSubmitting={feedbackSubmitting}
        handleFeedbackSubmit={handleFeedbackSubmit}
        exportCandidate={exportCandidate}
        setExportCandidate={setExportCandidate}
        exportEmail={exportEmail}
        setExportEmail={setExportEmail}
        exportSubmitting={exportSubmitting}
        handleExportSubmit={handleExportSubmit}
        exportAllEmail={exportAllEmail}
        setExportAllEmail={setExportAllEmail}
        exportAllSubmitting={exportAllSubmitting}
        handleExportAllSubmit={handleExportAllSubmit}
        assignRecruiterCandidate={assignRecruiterCandidate}
        setAssignRecruiterCandidate={setAssignRecruiterCandidate}
        recruitersList={recruitersList}
        assignRecruiterId={assignRecruiterId}
        setAssignRecruiterId={setAssignRecruiterId}
        assignRecruiterSubmitting={assignRecruiterSubmitting}
        handleAssignRecruiterSubmit={handleAssignRecruiterSubmit}
        joiningDateCandidate={joiningDateCandidate}
        setJoiningDateCandidate={setJoiningDateCandidate}
        joiningDateValue={joiningDateValue}
        setJoiningDateValue={setJoiningDateValue}
        joiningDateSubmitting={joiningDateSubmitting}
        handleJoiningDateSubmit={handleJoiningDateSubmit}
        resignDateCandidate={resignDateCandidate}
        setResignDateCandidate={setResignDateCandidate}
        resignDateValue={resignDateValue}
        setResignDateValue={setResignDateValue}
        resignDateSubmitting={resignDateSubmitting}
        handleResignDateSubmit={handleResignDateSubmit}
        weekOffCandidateIds={weekOffCandidateIds}
        setWeekOffCandidateIds={setWeekOffCandidateIds}
        weekOffDays={weekOffDays}
        setWeekOffDays={setWeekOffDays}
        weekOffSubmitting={weekOffSubmitting}
        handleWeekOffSubmit={handleWeekOffSubmit}
        toggleWeekOffDay={toggleWeekOffDay}
        assignShiftCandidateIds={assignShiftCandidateIds}
        setAssignShiftCandidateIds={setAssignShiftCandidateIds}
        assignShiftId={assignShiftId}
        setAssignShiftId={setAssignShiftId}
        shiftsList={shiftsList}
        assignShiftSubmitting={assignShiftSubmitting}
        handleAssignShiftSubmit={handleAssignShiftSubmit}
        actionError={actionError}
        setActionError={setActionError}
      />

      {/* Share employee modal */}
      {/* Suggest skills by job role (OpenAI; same shape as resume extraction).
          Portal to document.body so stacking sits above Preline HSOverlay/offcanvas (otherwise the preview panel can flash above the dim layer during loading). */}
      {skillRecommendModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[2147483000] flex items-center justify-center p-4 bg-black/55 backdrop-blur-[2px]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="skill-recommend-modal-title"
            onClick={(e) => {
              if (e.target === e.currentTarget && !skillRecommendLoading && !skillRecommendApplyLoading) {
                setSkillRecommendModalOpen(false)
                setSkillRecommendRole('')
                setSkillRecommendSuggestions([])
              }
            }}
          >
          <div
            className="relative z-[1] w-full max-w-md rounded-2xl border border-gray-200/90 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-5 p-6 sm:p-7">
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-md ring-4 ring-primary/15 dark:ring-primary/25"
                    aria-hidden
                  >
                    <i className="ri-lightbulb-flash-line text-xl leading-none" />
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <h3
                      id="skill-recommend-modal-title"
                      className="text-lg font-semibold leading-snug text-gray-900 dark:text-white"
                    >
                      Suggest skills by role
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                      We send this employee&apos;s <strong className="font-semibold text-gray-800 dark:text-gray-200">current skills</strong> plus the{" "}
                      <strong className="font-semibold text-gray-800 dark:text-gray-200">target role</strong> below and ask what else they should develop — only
                      new skills are merged into the profile.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="skill-recommend-role-input"
                  className="block text-sm font-medium text-gray-800 dark:text-gray-200"
                >
                  Job role
                </label>
                <input
                  id="skill-recommend-role-input"
                  type="text"
                  autoComplete="off"
                  className="form-control block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-inner transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 dark:border-gray-600 dark:bg-gray-800/80 dark:text-white"
                  placeholder="e.g. Senior Full Stack Developer"
                  value={skillRecommendRole}
                  onChange={(e) => setSkillRecommendRole(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !skillRecommendLoading && !skillRecommendSuggestions.length && skillRecommendRole.trim().length >= 2) {
                      void submitSkillRecommendationForPreview()
                    }
                  }}
                  disabled={skillRecommendLoading || skillRecommendApplyLoading}
                />
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Tip: include seniority or stack for tighter suggestions (e.g. “Lead QA Automation Engineer”).
                </p>
              </div>

              {skillRecommendSuggestions.length > 0 && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/40">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-200">
                      Review suggested skills and choose what to merge.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={skillRecommendApplyLoading}
                        onClick={() =>
                          setSkillRecommendSuggestions((prev) => prev.map((item) => ({ ...item, selected: true })))
                        }
                        className="text-xs font-medium text-primary hover:underline disabled:opacity-60"
                      >
                        Select all
                      </button>
                      <button
                        type="button"
                        disabled={skillRecommendApplyLoading}
                        onClick={() =>
                          setSkillRecommendSuggestions((prev) => prev.map((item) => ({ ...item, selected: false })))
                        }
                        className="text-xs font-medium text-gray-500 hover:underline disabled:opacity-60 dark:text-gray-400"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
                    <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                      {skillRecommendSuggestions.map((item, idx) => (
                        <li key={`${item.name}-${idx}`} className="bg-white px-3 py-2.5 dark:bg-gray-900">
                          <label className="flex cursor-pointer items-start gap-3">
                            <input
                              type="checkbox"
                              checked={item.selected}
                              disabled={skillRecommendApplyLoading}
                              onChange={(e) =>
                                setSkillRecommendSuggestions((prev) =>
                                  prev.map((row, rowIndex) =>
                                    rowIndex === idx ? { ...row, selected: e.target.checked } : row
                                  )
                                )
                              }
                              className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/40"
                            />
                            <span className="min-w-0">
                              <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">{item.name}</span>
                              <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
                                {item.level}{item.category ? ` • ${item.category}` : ''}
                              </span>
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {skillRecommendLoading && (
                <p className="rounded-lg border border-primary/20 bg-primary/[0.07] px-3 py-2.5 text-xs leading-relaxed text-gray-700 dark:border-primary/30 dark:bg-primary/15 dark:text-gray-200">
                  <i className="ri-cloud-line me-1.5 align-middle text-primary" aria-hidden />
                  Skills are generated on the server using OpenAI.{" "}
                  <strong className="font-semibold text-gray-900 dark:text-white">Often ~10–45s</strong>
                  {" "}depending on API load and region — the page is waiting on that response, not frozen.
                </p>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-gray-100 px-6 pb-6 pt-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:px-7 sm:pb-7">
              <button
                type="button"
                disabled={skillRecommendLoading || skillRecommendApplyLoading}
                onClick={() => {
                  if (skillRecommendSuggestions.length > 0) {
                    setSkillRecommendSuggestions([])
                    return
                  }
                  setSkillRecommendModalOpen(false)
                  setSkillRecommendRole('')
                  setSkillRecommendSuggestions([])
                }}
                className="inline-flex w-full shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 shadow-sm transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800 sm:w-auto"
              >
                {skillRecommendSuggestions.length > 0 ? 'Back' : 'Cancel'}
              </button>
              {skillRecommendSuggestions.length > 0 ? (
                <button
                  type="button"
                  disabled={skillRecommendApplyLoading || !skillRecommendSuggestions.some((item) => item.selected)}
                  onClick={() => void applySelectedSkillRecommendations()}
                  className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50 sm:w-auto sm:min-w-[11rem]"
                >
                  {skillRecommendApplyLoading ? (
                    <>
                      <span
                        className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"
                        aria-hidden
                      />
                      <span>Applying…</span>
                    </>
                  ) : (
                    <>
                      <i className="ri-check-line text-base leading-none" aria-hidden />
                      <span>Apply selected</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={skillRecommendLoading || skillRecommendRole.trim().length < 2}
                  onClick={() => void submitSkillRecommendationForPreview()}
                  className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50 sm:w-auto sm:min-w-[11rem]"
                >
                  {skillRecommendLoading ? (
                    <>
                      <span
                        className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"
                        aria-hidden
                      />
                      <span>Suggesting…</span>
                    </>
                  ) : (
                    <>
                      <i className="ri-sparkling-2-line text-base leading-none" aria-hidden />
                      <span>Preview suggestions</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>,
          document.body
        )}

      <CandidateAttendanceOverlay
        open={!!attendanceOverlayCandidate}
        onClose={() => setAttendanceOverlayCandidate(null)}
        candidateId={attendanceOverlayCandidate?.id ?? ''}
        candidateName={attendanceOverlayCandidate?.name ?? ''}
      />

      <CandidateShareModal
        shareCandidate={shareCandidate}
        setShareCandidate={setShareCandidate}
        shareWithDoc={shareWithDoc}
        setShareWithDoc={setShareWithDoc}
        sharedPublicUrl={sharedPublicUrl}
        sharedPublicUrlForId={sharedPublicUrlForId}
        copied={copied}
        handleCopyUrl={handleCopyUrl}
        showEmailInput={showEmailInput}
        setShowEmailInput={setShowEmailInput}
        shareEmail={shareEmail}
        setShareEmail={setShareEmail}
        shareSubmitting={shareSubmitting}
        handleShareWhatsApp={handleShareWhatsApp}
        handleEmailShareClick={handleEmailShareClick}
        handleSendEmail={handleSendEmail}
      />

      {/* More-actions menu portal (so it is not clipped by table overflow) */}
      {moreMenuState && typeof document !== 'undefined' && createPortal(
        <div
          data-more-menu-portal
          className="fixed z-[9999] min-w-[11rem] py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg list-none"
          style={{ top: moreMenuState.top, left: moreMenuState.left }}
          role="menu"
        >
          <ul className="list-none p-0 m-0">
            <li>
              <button type="button" className="block w-full text-left px-4 py-2 text-sm font-medium text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-none first:rounded-t-lg last:rounded-b-lg border-0 bg-transparent cursor-pointer" onClick={() => { setMoreMenuState(null); openAssignRecruiterModal(moreMenuState.candidate) }}><i className="ri-user-add-line me-2"></i>Assign recruiter</button>
            </li>
            {canEditJoiningDate && (
            <li>
              <button type="button" className="block w-full text-left px-4 py-2 text-sm font-medium text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-none first:rounded-t-lg last:rounded-b-lg border-0 bg-transparent cursor-pointer" onClick={() => { setMoreMenuState(null); openJoiningDateModal(moreMenuState.candidate) }}><i className="ri-calendar-check-line me-2"></i>Joining date</button>
            </li>
            )}
            {canEditResignDate && (
            <li>
              <button type="button" className="block w-full text-left px-4 py-2 text-sm font-medium text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-none first:rounded-t-lg last:rounded-b-lg border-0 bg-transparent cursor-pointer" onClick={() => { setMoreMenuState(null); openResignDateModal(moreMenuState.candidate) }}><i className="ri-calendar-close-line me-2"></i>Resign date</button>
            </li>
            )}
            <li>
              <button type="button" className="block w-full text-left px-4 py-2 text-sm font-medium text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-none first:rounded-t-lg last:rounded-b-lg border-0 bg-transparent cursor-pointer" onClick={() => { setMoreMenuState(null); openWeekOffModal([moreMenuState.candidate.id]) }}><i className="ri-calendar-schedule-line me-2"></i>Week-off</button>
            </li>
            <li>
              <button type="button" className="block w-full text-left px-4 py-2 text-sm font-medium text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-none first:rounded-t-lg last:rounded-b-lg border-0 bg-transparent cursor-pointer" onClick={() => { setMoreMenuState(null); openAssignShiftModal([moreMenuState.candidate.id]) }}><i className="ri-time-line me-2"></i>Assign shift</button>
            </li>
          </ul>
        </div>,
        document.body
      )}
    </Fragment>
  )
}

export default Candidates
