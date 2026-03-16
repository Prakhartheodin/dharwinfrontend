"use client"
import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment, useCallback, useMemo, useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

const DatePicker = dynamic(() => import('react-datepicker').then((mod) => mod.default), { ssr: false })
import { createPortal } from 'react-dom'
import { useTable, useSortBy, useGlobalFilter, usePagination } from 'react-table'
import Link from 'next/link'
import { Range, getTrackBackground } from "react-range"
import CandidatesFilterPanel from './_components/CandidatesFilterPanel'
import {
  listCandidates,
  createCandidate as createCandidateApi,
  mapCandidateToDisplay,
  getCandidate,
  getCandidateDocuments,
  getDocumentDownloadUrl,
  addSalarySlipToCandidate,
  updateSalarySlip,
  deleteSalarySlip,
  shareCandidateProfile,
  exportCandidateProfile,
  exportAllCandidates,
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
  type CandidateDocument,
} from '@/shared/lib/api/candidates'
import { listUsers } from '@/shared/lib/api/users'
import { getAllShifts } from '@/shared/lib/api/shifts'
import { downloadCandidateExcelTemplate } from '@/shared/lib/candidate-excel-template'
import Swal from 'sweetalert2'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/shared/contexts/auth-context'
import CandidateActionModals from './_components/CandidateActionModals'
import CandidateShareModal from './_components/CandidateShareModal'

// Display shape used by the UI (id, name, displayPicture, phone, email, skills, education, experience, bio)
type CandidateDisplay = ReturnType<typeof mapCandidateToDisplay>

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
            <div className="px-6 py-4 flex items-center justify-end gap-2 border-t border-defaultborder dark:border-white/10 bg-defaultbackground/50 dark:bg-white/[0.02]">
              {allowClear && (local || value) && (
                <button
                  type="button"
                  className="ti-btn ti-btn-outline-secondary ti-btn-sm !rounded-lg"
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
                className="ti-btn ti-btn-primary !rounded-lg !font-medium shadow-sm"
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
  skills: string[]
  education: string[]
  email: string
  experience: [number, number] // [min, max] in years
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

const DEFAULT_EXPERIENCE_RANGE: [number, number] = [0, 20]

const Candidates = () => {
  const router = useRouter()
  const { isAdministrator } = useAuth()
  const [candidates, setCandidates] = useState<CandidateDisplay[]>([])
  const [candidatesLoading, setCandidatesLoading] = useState(true)
  const [candidatesError, setCandidatesError] = useState<string | null>(null)
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [candidateNotes, setCandidateNotes] = useState<CandidateNote[]>([])
  const [previewCandidate, setPreviewCandidate] = useState<any>(null)
  const [viewDetailTab, setViewDetailTab] = useState<string>('personal')
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
  const [pageSize, setPageSize] = useState(10)
  
  const [filters, setFilters] = useState<FilterState>({
    name: [],
    skills: [],
    education: [],
    email: '',
    experience: [DEFAULT_EXPERIENCE_RANGE[0], DEFAULT_EXPERIENCE_RANGE[1]]
  })

  // Search states for filter dropdowns (also sent to API to search all candidates)
  const [searchName, setSearchName] = useState('')
  const [searchSkills, setSearchSkills] = useState('')
  const [searchEducation, setSearchEducation] = useState('')

  // Filter dropdown options: all names, skills, education from all candidates (not limited by pagination)
  const [filterOptions, setFilterOptions] = useState<{ names: string[]; skills: string[]; education: string[] }>({
    names: [],
    skills: [],
    education: [],
  })
  const [filterOptionsLoading, setFilterOptionsLoading] = useState(false)

  // Debounce search inputs so API is called after user stops typing
  const [debouncedSearchName, setDebouncedSearchName] = useState('')
  const [debouncedSearchSkills, setDebouncedSearchSkills] = useState('')
  const [debouncedSearchEducation, setDebouncedSearchEducation] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchName(searchName), 400)
    return () => clearTimeout(t)
  }, [searchName])
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchSkills(searchSkills), 400)
    return () => clearTimeout(t)
  }, [searchSkills])
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchEducation(searchEducation), 400)
    return () => clearTimeout(t)
  }, [searchEducation])

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

  // Experience range from data (for slider min/max)
  const fetchParams = useMemo(() => {
    const params: Record<string, unknown> = {
      limit: pageSize,
      sortBy: 'createdAt:desc',
    }
    // Typed search hits API and searches ALL candidates (not limited to current page)
    if (debouncedSearchName.trim()) params.fullName = debouncedSearchName.trim()
    else if (filters.name?.length) params.fullName = filters.name[0]
    const skillParams = [...(filters.skills ?? [])]
    if (debouncedSearchSkills.trim()) {
      const typed = debouncedSearchSkills.trim()
      if (!skillParams.some((x) => x.toLowerCase() === typed.toLowerCase())) skillParams.push(typed)
    }
    if (skillParams.length > 0) params.skills = skillParams
    if (debouncedSearchEducation.trim()) params.degree = debouncedSearchEducation.trim()
    else if (filters.education?.length) params.degree = filters.education[0]
    if (filters.email?.trim()) params.email = filters.email.trim()
    if (filters.experience[0] !== DEFAULT_EXPERIENCE_RANGE[0] || filters.experience[1] !== DEFAULT_EXPERIENCE_RANGE[1]) {
      params.minYearsOfExperience = filters.experience[0]
      params.maxYearsOfExperience = filters.experience[1]
    }
    return params
  }, [filters, pageSize, debouncedSearchName, debouncedSearchSkills, debouncedSearchEducation])

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
        setCandidatesError(err?.message ?? 'Failed to load candidates')
        setCandidates([])
        setTotalResults(0)
        setTotalPages(0)
      })
      .finally(() => setCandidatesLoading(false))
  }, [apiPage, fetchParams])

  useEffect(() => {
    refreshCandidates(false)
  }, [apiPage, fetchParams])

  // Fetch all unique names, skills, education for filter dropdowns (not limited by page)
  useEffect(() => {
    setFilterOptionsLoading(true)
    listCandidates({ limit: 5000, sortBy: 'fullName:asc' })
      .then((res) => {
        const results = (res.results ?? []).map(mapCandidateToDisplay)
        const names = [...new Set(results.map((c) => c.name).filter(Boolean))].sort()
        const skillMap = new Map<string, string>()
        const splitSkillString = (str: string) =>
          str
            .split(/[,;]|\.\s+|\r?\n+/)
            .map((x) => x.trim())
            .filter(Boolean)
        results.forEach((c) => {
          c.skills?.forEach((s) => {
            const raw = typeof s === 'string' ? s : String(s)
            splitSkillString(raw).forEach((p) => {
              const key = p.toLowerCase()
              if (!skillMap.has(key)) skillMap.set(key, p)
            })
          })
        })
        const skills = Array.from(skillMap.values()).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
        const education = [...new Set(results.map((c) => c.education).filter(Boolean))].sort()
        setFilterOptions({ names, skills, education })
      })
      .catch(() => setFilterOptions({ names: [], skills: [], education: [] }))
      .finally(() => setFilterOptionsLoading(false))
  }, [])

  const prevFiltersRef = React.useRef(filters)
  useEffect(() => {
    if (prevFiltersRef.current !== filters) {
      prevFiltersRef.current = filters
      setApiPage(1)
    }
  }, [filters])

  useEffect(() => {
    setApiPage(1)
  }, [debouncedSearchName, debouncedSearchSkills, debouncedSearchEducation])

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
      setCreateError(err?.response?.data?.message ?? err?.message ?? 'Failed to create candidate')
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

  // Handle add note - open notes sidebar
  const handleAddNote = (id: string, candidate?: any) => {
    // Open the notes sidebar
    setNotesCandidateId(id)
    setTimeout(() => {
      ;(window as any).HSOverlay?.open(document.querySelector('#candidate-notes-panel'))
    }, 100)
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
  const openCandidatePreview = useCallback((c: CandidateDisplay) => {
    setPreviewCandidate(c)
    setViewDetailTab('personal')
    setActionError(null)
    setTimeout(() => {
      ;(window as any).HSOverlay?.open(document.querySelector('#candidate-preview-panel'))
    }, 100)
    getCandidate(c.id)
      .then((full) => {
        setPreviewCandidate((prev: any) =>
          prev && prev.id === c.id ? { ...prev, _raw: full } : prev
        )
      })
      .catch(() => {})
  }, [])

  // Generate public URL for candidate
  const getCandidatePublicUrl = (candidateId: string) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/ats/candidates/${candidateId}`
    }
    return `https://example.com/ats/candidates/${candidateId}`
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
    setTimeout(() => {
      ;(window as any).HSOverlay?.open(document.querySelector('#export-candidate-modal'))
    }, 100)
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
      // Open modal only after state is updated so content is visible (avoids Preline showing stale/empty body)
      requestAnimationFrame(() => {
        setTimeout(() => {
          ;(window as any).HSOverlay?.open(document.querySelector('#documents-modal'))
        }, 0)
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

  const openSalarySlipModal = (candidate: CandidateDisplay) => {
    setSalarySlipCandidate(candidate)
    setSalarySlipForm({ month: '', year: '', file: null })
    setActionError(null)
    setTimeout(() => {
      ;(window as any).HSOverlay?.open(document.querySelector('#salary-slip-modal'))
    }, 100)
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
    setTimeout(() => {
      ;(window as any).HSOverlay?.open(document.querySelector('#feedback-modal'))
    }, 100)
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
      await resendVerificationEmail(candidate.id)
      setActionSuccess('Verification email sent')
      refreshCandidates(true)
      setTimeout(() => setActionSuccess(null), 3000)
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? err?.message ?? 'Failed to send verification email')
    }
  }

  const handleDeleteCandidate = async (candidate: CandidateDisplay) => {
    const result = await Swal.fire({
      title: 'Delete candidate?',
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
        text: err?.response?.data?.message ?? err?.message ?? 'Could not delete candidate. Please try again.',
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
    const text = `Check out this candidate: ${candidate.name} - ${url}`
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
    ;(window as any).HSOverlay?.open(document.querySelector('#export-all-modal'))
  }
  const handleExportAllSubmit = async () => {
    setExportAllSubmitting(true)
    setActionError(null)
    try {
      const body = exportAllEmail.trim() ? { email: exportAllEmail.trim() } : undefined
      const result = await exportAllCandidates(undefined, body)
      if (result && typeof (result as Blob).slice === 'function') {
        const url = URL.createObjectURL(result as Blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `candidates-export-${new Date().toISOString().split('T')[0]}.csv`
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
    if (!confirm(`Delete ${selectedRows.size} selected candidate(s)? This cannot be undone.`)) return
    setBulkDeleteSubmitting(true)
    setActionError(null)
    try {
      for (const id of selectedRows) {
        await deleteCandidate(id)
      }
      setSelectedRows(new Set())
      setActionSuccess('Selected candidates deleted')
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
    setTimeout(() => {
      ;(window as any).HSOverlay?.open(document.querySelector('#assign-recruiter-modal'))
    }, 100)
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

  const openJoiningDateModal = (candidate: CandidateDisplay) => {
    setJoiningDateCandidate(candidate)
    setJoiningDateValue('')
    setActionError(null)
    setTimeout(() => {
      ;(window as any).HSOverlay?.open(document.querySelector('#joining-date-modal'))
    }, 100)
  }
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
    setResignDateValue('')
    setActionError(null)
    setTimeout(() => {
      ;(window as any).HSOverlay?.open(document.querySelector('#resign-date-modal'))
    }, 100)
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

  const handlePersonalInfoJoiningDateSave = async (value: string) => {
    if (!previewCandidate?.id || !value) return
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
      setActionSuccess(value ? 'Resign date updated' : 'Resign date cleared. Candidate is now active.')
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
    setTimeout(() => {
      ;(window as any).HSOverlay?.open(document.querySelector('#week-off-modal'))
    }, 100)
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
    setTimeout(() => {
      ;(window as any).HSOverlay?.open(document.querySelector('#assign-shift-modal'))
    }, 100)
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
        Header: 'Candidate Info',
        accessor: 'candidateInfo',
        Cell: ({ row }: any) => {
          const candidate = row.original
          return (
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <CandidateAvatar candidate={candidate} className="w-10 h-10 rounded-full" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div 
                    className="font-semibold text-gray-800 dark:text-white truncate cursor-pointer hover:text-primary"
                    onClick={() => openCandidatePreview(candidate)}
                  >
                    {candidate.name}
                  </div>
                  {((candidate.isProfileCompleted ?? candidate._raw?.isProfileCompleted ?? 0) < 100) && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded" title="Profile completion">
                      <i className="ri-pie-chart-line text-[10px]"></i>
                      {candidate.isProfileCompleted ?? candidate._raw?.isProfileCompleted ?? 0}%
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {(candidate._raw?.employeeId) && (
                    <div className="flex items-center gap-1">
                      <i className="ri-id-card-line"></i>
                      {candidate._raw.employeeId}
                    </div>
                  )}
                  <div className="flex items-center gap-1 mt-0.5">
                    <i className="ri-phone-line"></i>
                    {candidate.phone}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <i className="ri-mail-line"></i>
                    {candidate.email}
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
            <div className="text-sm text-gray-800 dark:text-white whitespace-nowrap">
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
              <div className="hs-tooltip ti-main-tooltip">
                <Link href={`/ats/candidates/edit/?id=${c.id}`} className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm !h-[1.75rem] !w-[1.75rem] bg-info/10 text-info hover:bg-info hover:text-white" title="Edit Candidate">
                  <i className="ri-pencil-line"></i>
                  <span className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white" role="tooltip">Edit Candidate</span>
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
                <button type="button" onClick={() => handleShareClick(c)} className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm !h-[1.75rem] !w-[1.75rem] bg-primary/10 text-primary hover:bg-primary hover:text-white" title="Share Candidate">
                  <i className="ri-share-line"></i>
                  <span className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white" role="tooltip">Share Candidate</span>
                </button>
              </div>
              {/* <div className="hs-tooltip ti-main-tooltip">
                <button type="button" onClick={() => { setActionSuccess('Attendance is not configured for candidates in this environment'); setTimeout(() => setActionSuccess(null), 3000) }} className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm !h-[1.75rem] !w-[1.75rem] bg-purple-500/10 text-purple-500 hover:bg-purple-500 hover:text-white" title="View Attendance">
                  <i className="ri-calendar-line"></i>
                  <span className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white" role="tooltip">View Attendance</span>
                </button>
              </div> */}
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
    [selectedRows, moreMenuState, deletingCandidateId]
  )

  // Server-side filtering: API returns filtered results, no client-side filter
  const filteredData = useMemo(() => candidates, [candidates])

  const data = useMemo(() => filteredData, [filteredData])

  // Use filter options from all candidates (fetched separately), not limited by current page
  const allNames = filterOptions.names
  const allSkills = filterOptions.skills
  const allEducation = filterOptions.education

  // Filter options based on search terms
  const filteredNames = useMemo(() => {
    if (!searchName) return allNames
    return allNames.filter(name => 
      name.toLowerCase().includes(searchName.toLowerCase())
    )
  }, [allNames, searchName])

  const filteredSkills = useMemo(() => {
    if (!searchSkills) return allSkills
    return allSkills.filter(skill => 
      skill.toLowerCase().includes(searchSkills.toLowerCase())
    )
  }, [allSkills, searchSkills])

  const filteredEducation = useMemo(() => {
    if (!searchEducation) return allEducation
    return allEducation.filter(edu => 
      edu.toLowerCase().includes(searchEducation.toLowerCase())
    )
  }, [allEducation, searchEducation])

  const handleMultiSelectChange = (key: 'name' | 'skills' | 'education', value: string) => {
    setFilters(prev => {
      const currentArray = prev[key]
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value]
      return { ...prev, [key]: newArray }
    })
  }

  const handleRemoveFilter = (key: 'name' | 'skills' | 'education', value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].filter(item => item !== value)
    }))
  }

  const handleExperienceRangeChange = (values: number[]) => {
    setFilters(prev => ({ ...prev, experience: [values[0], values[1]] as [number, number] }))
  }

  const handleResetFilters = () => {
    setFilters({
      name: [],
      skills: [],
      education: [],
      email: '',
      experience: [DEFAULT_EXPERIENCE_RANGE[0], DEFAULT_EXPERIENCE_RANGE[1]]
    })
    setSearchName('')
    setSearchSkills('')
    setSearchEducation('')
  }

  const hasActiveFilters = 
    filters.name.length > 0 ||
    filters.skills.length > 0 ||
    filters.education.length > 0 ||
    filters.email !== '' ||
    debouncedSearchName.trim() !== '' ||
    debouncedSearchSkills.trim() !== '' ||
    debouncedSearchEducation.trim() !== '' ||
    filters.experience[0] !== DEFAULT_EXPERIENCE_RANGE[0] ||
    filters.experience[1] !== DEFAULT_EXPERIENCE_RANGE[1]

  const activeFilterCount = 
    filters.name.length +
    filters.skills.length +
    filters.education.length +
    (filters.email !== '' ? 1 : 0) +
    (debouncedSearchName.trim() ? 1 : 0) +
    (debouncedSearchSkills.trim() ? 1 : 0) +
    (debouncedSearchEducation.trim() ? 1 : 0) +
    (filters.experience[0] !== DEFAULT_EXPERIENCE_RANGE[0] || filters.experience[1] !== DEFAULT_EXPERIENCE_RANGE[1] ? 1 : 0)

  const tableInstance: any = useTable(
    {
      columns,
      data,
      initialState: { pageIndex: 0, pageSize: 25 },
      manualPagination: true,
      pageCount: totalPages || 1,
      state: {
        pageIndex: apiPage - 1,
        pageSize,
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
    setSortBy,
  } = tableInstance

  const { pageIndex } = state

  // Handle sort selection
  const handleSortChange = (sortOption: string) => {
    setSelectedSort(sortOption)
    
    switch(sortOption) {
      case 'name-asc':
        setSortBy([{ id: 'candidateInfo', desc: false }])
        break
      case 'name-desc':
        setSortBy([{ id: 'candidateInfo', desc: true }])
        break
      case 'skills-asc':
        setSortBy([{ id: 'skills', desc: false }])
        break
      case 'skills-desc':
        setSortBy([{ id: 'skills', desc: true }])
        break
      case 'education-asc':
        setSortBy([{ id: 'education', desc: false }])
        break
      case 'education-desc':
        setSortBy([{ id: 'education', desc: true }])
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
      <Seo title="Candidates" />
      <div className="container-fluid pt-6">
      {candidatesLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      )}
      {!candidatesLoading && candidatesError && (
        <div className="p-4 rounded-lg bg-danger/10 text-danger mb-4">
          {candidatesError}
        </div>
      )}
      {actionError && (
        <div className="p-4 rounded-lg bg-danger/10 text-danger mb-4 flex justify-between items-center">
          <span>{actionError}</span>
          <button type="button" onClick={() => setActionError(null)} className="ti-btn ti-btn-sm ti-btn-ghost">×</button>
        </div>
      )}
      {actionSuccess && (
        <div className="p-4 rounded-lg bg-success/10 text-success mb-4">
          {actionSuccess}
        </div>
      )}
      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-8rem)]">
        <div className="xl:col-span-12 col-span-12 h-full flex flex-col">
          <div className="box custom-box h-full flex flex-col">
            <div className="box-header flex items-center justify-between flex-wrap gap-4">
              <div className="box-title">
                Candidates
                <span className="badge bg-primary/10 text-primary rounded-full ms-1 text-[0.75rem] align-middle">
                  {filteredData.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  className="form-control !w-auto !py-1 !px-4 !text-[0.75rem] me-2"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setApiPage(1)
                  }}
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
                        className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${selectedSort === 'name-asc' ? 'active' : ''}`}
                        onClick={() => handleSortChange('name-asc')}
                      >
                        <i className="ri-sort-asc me-2 align-middle inline-block"></i>Name (A-Z)
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${selectedSort === 'name-desc' ? 'active' : ''}`}
                        onClick={() => handleSortChange('name-desc')}
                      >
                        <i className="ri-sort-desc me-2 align-middle inline-block"></i>Name (Z-A)
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${selectedSort === 'skills-asc' ? 'active' : ''}`}
                        onClick={() => handleSortChange('skills-asc')}
                      >
                        <i className="ri-code-s-slash-line me-2 align-middle inline-block"></i>Skills (A-Z)
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${selectedSort === 'skills-desc' ? 'active' : ''}`}
                        onClick={() => handleSortChange('skills-desc')}
                      >
                        <i className="ri-code-s-slash-line me-2 align-middle inline-block"></i>Skills (Z-A)
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${selectedSort === 'education-asc' ? 'active' : ''}`}
                        onClick={() => handleSortChange('education-asc')}
                      >
                        <i className="ri-graduation-cap-line me-2 align-middle inline-block"></i>Education (A-Z)
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${selectedSort === 'education-desc' ? 'active' : ''}`}
                        onClick={() => handleSortChange('education-desc')}
                      >
                        <i className="ri-graduation-cap-line me-2 align-middle inline-block"></i>Education (Z-A)
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
                <Link
                  href="/ats/candidates/add"
                  className="ti-btn ti-btn-primary-full !py-1 !px-2 !text-[0.75rem] me-2"
                >
                  <i className="ri-add-line font-semibold align-middle"></i>Add Candidate
                </Link>
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
                        onClick={() => router.push('/ats/candidates/import')}
                      >
                        <i className="ri-upload-2-line me-2 align-middle inline-block"></i>Import
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left"
                        onClick={handleExportAllOpen}
                      >
                        <i className="ri-file-excel-2-line me-2 align-middle inline-block"></i>Export
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left"
                        onClick={() => downloadCandidateExcelTemplate()}
                      >
                        <i className="ri-download-line me-2 align-middle inline-block"></i>Template
                      </button>
                    </li>
                  </ul>
                </div>
                <button
                  type="button"
                  className="ti-btn ti-btn-light !py-1 !px-2 !text-[0.75rem] me-2"
                  data-hs-overlay="#candidates-filter-panel"
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
                      <i className="ri-calendar-week-line font-semibold align-middle me-1"></i>Week-off
                    </button>
                    <button type="button" className="ti-btn ti-btn-light !py-1 !px-2 !text-[0.75rem]" onClick={() => openAssignShiftModal(Array.from(selectedRows))}>
                      <i className="ri-time-line font-semibold align-middle me-1"></i>Assign shift
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="ti-btn ti-btn-danger !py-1 !px-2 !text-[0.75rem]"
                  disabled={selectedRows.size === 0 || bulkDeleteSubmitting}
                  onClick={handleBulkDelete}
                >
                  <i className="ri-delete-bin-line font-semibold align-middle me-1"></i>{bulkDeleteSubmitting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
            <div className="box-body !p-0 flex-1 flex flex-col overflow-hidden">
              <div className="table-responsive flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
                <table {...getTableProps()} className="table whitespace-nowrap min-w-full table-striped table-hover table-bordered border-gray-300 dark:border-gray-600" style={{ tableLayout: 'fixed' }}>
                  <thead>
                    {headerGroups.map((headerGroup: any, i: number) => (
                      <tr {...headerGroup.getHeaderGroupProps()} className="bg-primary/10 dark:bg-primary/20 border-b border-gray-300 dark:border-gray-600" key={`header-group-${i}`}>
                        {headerGroup.headers.map((column: any, i: number) => {
                          const headerProps = column.getHeaderProps(column.getSortByToggleProps());
                          const isCheckboxCol = column.id === 'checkbox';
                          return (
                          <th
                            {...headerProps}
                            scope="col"
                            className="text-start sticky top-0 z-10 bg-gray-50 dark:bg-black/20"
                            key={column.id || `col-${i}`}
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
                          );
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
                            const isCheckboxCol = cell.column.id === 'checkbox';
                            const cellProps = cell.getCellProps();
                            return (
                              <td
                                {...cellProps}
                                key={cell.column.id || `cell-${i}`}
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
                  </tbody>
                </table>
              </div>
            </div>
            <div className="box-footer !border-t-0">
              <div className="flex items-center flex-wrap gap-4">
                <div>
                  Showing {totalResults === 0 ? 0 : (apiPage - 1) * pageSize + 1} to {Math.min(apiPage * pageSize, totalResults)} of {totalResults} entries{' '}
                  <i className="bi bi-arrow-right ms-2 font-semibold"></i>
                </div>
                <div className="ms-auto">
                  <nav aria-label="Page navigation" className="pagination-style-4">
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
                        // Show all pages if 7 or fewer
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
                        // Show smart pagination for more pages
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

      {/* Filter Panel Offcanvas */}
      <CandidatesFilterPanel
        filters={filters}
        setFilters={setFilters}
        allNames={allNames}
        allSkills={allSkills}
        allEducation={allEducation}
        filterOptionsLoading={filterOptionsLoading}
        filteredNames={filteredNames}
        filteredSkills={filteredSkills}
        filteredEducation={filteredEducation}
        searchName={searchName}
        setSearchName={setSearchName}
        searchSkills={searchSkills}
        setSearchSkills={setSearchSkills}
        searchEducation={searchEducation}
        setSearchEducation={setSearchEducation}
        experienceRanges={{ min: DEFAULT_EXPERIENCE_RANGE[0], max: DEFAULT_EXPERIENCE_RANGE[1] }}
        handleMultiSelectChange={handleMultiSelectChange}
        handleRemoveFilter={handleRemoveFilter}
        handleExperienceRangeChange={handleExperienceRangeChange}
        handleResetFilters={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
        activeFilterCount={activeFilterCount}
      />

      {/* Candidate Preview Panel (Offcanvas – same slider view as Jobs) */}
      <div
        id="candidate-preview-panel"
        className="hs-overlay hidden ti-offcanvas ti-offcanvas-right !z-[105] !max-w-[50rem] lg:!max-w-[60rem]"
        tabIndex={-1}
      >
        <div className="ti-offcanvas-header bg-gray-50 dark:bg-black/20 !py-2.5">
          <h6 className="ti-offcanvas-title text-base font-semibold flex items-center gap-2">
            <i className="ri-user-line text-primary text-base"></i>
            {previewCandidate?.name || 'Candidate Preview'}
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
                    {isAdministrator ? (
                      <>
                        <PersonalInfoDateField
                          label="Joining Date"
                          value={previewCandidate._raw?.joiningDate}
                          onSave={handlePersonalInfoJoiningDateSave}
                          saving={personalInfoDateSaving === 'joining'}
                          badgeClassName="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                          icon="ri-calendar-check-line"
                        />
                        <PersonalInfoDateField
                          label="Resign Date"
                          value={previewCandidate._raw?.resignDate}
                          onSave={handlePersonalInfoResignDateSave}
                          saving={personalInfoDateSaving === 'resign'}
                          allowClear
                          badgeClassName="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
                          icon="ri-calendar-close-line"
                        />
                      </>
                    ) : (
                      <>
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded" title="Joining Date">
                          <i className="ri-calendar-check-line"></i>
                          {previewCandidate._raw?.joiningDate ? new Date(previewCandidate._raw.joiningDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not set'}
                        </span>
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded" title="Resign Date">
                          <i className="ri-calendar-close-line"></i>
                          {previewCandidate._raw?.resignDate ? new Date(previewCandidate._raw.resignDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not set'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="bg-white dark:bg-gray-800 px-4 sm:px-6 lg:px-8 py-4">
                <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
                  <nav className="-mb-px flex space-x-2 sm:space-x-4 overflow-x-auto">
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
                        onClick={() => setViewDetailTab(tab.id)}
                        className={`py-2 px-1 sm:px-2 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex-shrink-0 flex items-center gap-1 ${
                          viewDetailTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                        }`}
                      >
                        <i className={tab.icon}></i>
                        {tab.label}
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
                      <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Skills</h4>
                      {(previewCandidate.skills?.length || previewCandidate._raw?.skills?.length) ? (
                        <div className="flex flex-wrap gap-2">
                          {(previewCandidate.skills || previewCandidate._raw?.skills?.map((s: any) => typeof s === 'string' ? s : s.name))
                            ?.flatMap((skill: string) =>
                              skill.split(/[,;]|\.\s+|\r?\n+/).map((x) => x.trim()).filter(Boolean)
                            )
                            ?.map((skill: string, index: number) => (
                              <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/30">
                                {skill}
                              </span>
                            ))}
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
                      {Array.isArray(previewCandidate._raw?.documents) && previewCandidate._raw.documents.length > 0 ? (
                        <div className="space-y-3">
                          {previewCandidate._raw.documents.map((doc: any, index: number) => (
                            <div key={index} className="flex items-center justify-between gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                              <p className="font-medium text-gray-900 dark:text-white truncate min-w-0 flex-1">{doc?.label || doc?.originalName || `Document ${index + 1}`}</p>
                              <button
                                type="button"
                                className="ti-btn ti-btn-sm ti-btn-primary !w-auto !h-auto !min-h-[1.75rem] py-1.5 px-3 shrink-0 whitespace-nowrap"
                                onClick={() => {
                                  const cid = previewCandidate?.id ?? previewCandidate?._raw?._id
                                  if (cid) handleDocumentDownload(cid, index)
                                }}
                              >
                                <i className="ri-external-link-line me-1"></i>View
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <i className="ri-file-line text-4xl text-gray-400 dark:text-gray-500 mb-4"></i>
                          <p className="text-gray-500 dark:text-gray-400">No documents uploaded.</p>
                        </div>
                      )}
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
                              {slip?.documentUrl || slip?.url ? (
                                <a href={slip.documentUrl || slip.url} target="_blank" rel="noopener noreferrer" className="ti-btn ti-btn-sm ti-btn-primary !w-auto !h-auto !min-h-[1.75rem] py-1.5 px-3 shrink-0 whitespace-nowrap inline-flex items-center">
                                  <i className="ri-external-link-line me-1"></i>View
                                </a>
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
                      <p className="text-sm text-gray-500 dark:text-gray-400">Use the Add Note and Add Feedback actions from the candidate row to add notes and feedback.</p>
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
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">No candidate selected</div>
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
            {getCandidateDetails()?.name || 'Candidate Notes'}
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
                Add Candidate
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
                      Add Candidate
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

      {/* Share Candidate Modal */}
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
            <li>
              <button type="button" className="block w-full text-left px-4 py-2 text-sm font-medium text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-none first:rounded-t-lg last:rounded-b-lg border-0 bg-transparent cursor-pointer" onClick={() => { setMoreMenuState(null); openJoiningDateModal(moreMenuState.candidate) }}><i className="ri-calendar-check-line me-2"></i>Joining date</button>
            </li>
            <li>
              <button type="button" className="block w-full text-left px-4 py-2 text-sm font-medium text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-none first:rounded-t-lg last:rounded-b-lg border-0 bg-transparent cursor-pointer" onClick={() => { setMoreMenuState(null); openResignDateModal(moreMenuState.candidate) }}><i className="ri-calendar-close-line me-2"></i>Resign date</button>
            </li>
            <li>
              <button type="button" className="block w-full text-left px-4 py-2 text-sm font-medium text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-none first:rounded-t-lg last:rounded-b-lg border-0 bg-transparent cursor-pointer" onClick={() => { setMoreMenuState(null); openWeekOffModal([moreMenuState.candidate.id]) }}><i className="ri-calendar-week-line me-2"></i>Week-off</button>
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
