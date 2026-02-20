"use client"
import Pageheader from '@/shared/layout-components/page-header/pageheader'
import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment, useCallback, useMemo, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTable, useSortBy, useGlobalFilter, usePagination } from 'react-table'
import Link from 'next/link'
import { Range, getTrackBackground } from "react-range"
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

// Display shape used by the UI (id, name, displayPicture, phone, email, skills, education, experience, bio)
type CandidateDisplay = ReturnType<typeof mapCandidateToDisplay>

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
  
  const [filters, setFilters] = useState<FilterState>({
    name: [],
    skills: [],
    education: [],
    email: '',
    experience: [DEFAULT_EXPERIENCE_RANGE[0], DEFAULT_EXPERIENCE_RANGE[1]]
  })

  // Search states for filter dropdowns
  const [searchName, setSearchName] = useState('')
  const [searchSkills, setSearchSkills] = useState('')
  const [searchEducation, setSearchEducation] = useState('')

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
  const experienceRanges = useMemo(() => {
    const ex = candidates.map((c) => c.experience ?? 0)
    if (!ex.length) return { min: DEFAULT_EXPERIENCE_RANGE[0], max: DEFAULT_EXPERIENCE_RANGE[1] }
    return { min: Math.min(...ex), max: Math.max(...ex) }
  }, [candidates])

  const refreshCandidates = useCallback(() => {
    setCandidatesLoading(true)
    setCandidatesError(null)
    listCandidates({ limit: 500 })
      .then((res) => setCandidates(res.results.map(mapCandidateToDisplay)))
      .catch((err) => {
        setCandidatesError(err?.message ?? 'Failed to load candidates')
        setCandidates([])
      })
      .finally(() => setCandidatesLoading(false))
  }, [])

  useEffect(() => {
    refreshCandidates()
  }, [refreshCandidates])

  // Sync experience filter to data bounds when candidates load (fixes badge showing 1 with no user selection)
  useEffect(() => {
    setFilters(prev => {
      const isStillDefault =
        prev.experience[0] === DEFAULT_EXPERIENCE_RANGE[0] &&
        prev.experience[1] === DEFAULT_EXPERIENCE_RANGE[1]
      const needsSync =
        prev.experience[0] !== experienceRanges.min || prev.experience[1] !== experienceRanges.max
      if (isStillDefault && needsSync) {
        return { ...prev, experience: [experienceRanges.min, experienceRanges.max] }
      }
      return prev
    })
  }, [experienceRanges.min, experienceRanges.max])

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
      refreshCandidates()
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
    
    // Trigger the panel via Preline's trigger button
    setTimeout(() => {
      const trigger = document.getElementById('candidate-notes-panel-trigger')
      if (trigger) {
        trigger.click()
      }
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
      const trigger = document.getElementById('export-candidate-modal-trigger')
      if (trigger) (trigger as HTMLElement).click()
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
          const trigger = document.getElementById('documents-modal-trigger')
          if (trigger) (trigger as HTMLElement).click()
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
      refreshCandidates()
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
      const trigger = document.getElementById('salary-slip-modal-trigger')
      if (trigger) (trigger as HTMLElement).click()
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
      refreshCandidates()
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
      const trigger = document.getElementById('feedback-modal-trigger')
      if (trigger) (trigger as HTMLElement).click()
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
      refreshCandidates()
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
      refreshCandidates()
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
    const trigger = document.getElementById('export-all-modal-trigger')
    if (trigger) (trigger as HTMLElement).click()
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
      refreshCandidates()
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
      const trigger = document.getElementById('assign-recruiter-modal-trigger')
      if (trigger) (trigger as HTMLElement).click()
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
      refreshCandidates()
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
      const trigger = document.getElementById('joining-date-modal-trigger')
      if (trigger) (trigger as HTMLElement).click()
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
      refreshCandidates()
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
      const trigger = document.getElementById('resign-date-modal-trigger')
      if (trigger) (trigger as HTMLElement).click()
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
      refreshCandidates()
      setTimeout(() => setActionSuccess(null), 3000)
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? err?.message ?? 'Failed to update resign date')
    } finally {
      setResignDateSubmitting(false)
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
      const trigger = document.getElementById('week-off-modal-trigger')
      if (trigger) (trigger as HTMLElement).click()
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
      refreshCandidates()
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
      const trigger = document.getElementById('assign-shift-modal-trigger')
      if (trigger) (trigger as HTMLElement).click()
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
      refreshCandidates()
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
                <div className="flex items-center gap-2 flex-wrap">
                  <div 
                    className="font-semibold text-gray-800 dark:text-white truncate cursor-pointer hover:text-primary"
                    onClick={() => {
                      setPreviewCandidate(candidate)
                      setViewDetailTab('personal')
                    }}
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
                  <div className="flex items-center gap-1">
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
        Header: 'Skills',
        accessor: 'skills',
        Cell: ({ row }: any) => {
          const candidate = row.original
          return (
            <div className="flex flex-wrap gap-1.5">
              {candidate.skills?.slice(0, 3).map((skill: string, index: number) => (
                <span
                  key={index}
                  className="badge bg-primary/10 text-primary border border-primary/30 px-2 py-1 rounded-md text-xs font-medium"
                >
                  {skill}
                </span>
              ))}
              {candidate.skills?.length > 3 && (
                <span className="badge bg-gray-100 dark:bg-black/20 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-md text-xs font-medium">
                  +{candidate.skills.length - 3}
                </span>
              )}
            </div>
          )
        },
      },
      {
        Header: 'Education',
        accessor: 'education',
        minWidth: 180,
        maxWidth: 220,
        Cell: ({ row }: any) => {
          const candidate = row.original
          // Parse education: split by " - " to separate degree and university
          const educationParts = candidate.education ? candidate.education.split(' - ') : ['', '']
          const degree = educationParts[0] || ''
          const university = educationParts.slice(1).join(' - ') || ''
          
          return (
            <div 
              className="text-sm text-gray-800 dark:text-white min-w-0"
              style={{ 
                maxWidth: '100%',
                minHeight: '60px',
                lineHeight: '1.5',
                wordBreak: 'break-word',
                overflow: 'hidden',
                overflowWrap: 'break-word',
              }}
              title={candidate.education}
            >
              <div className="font-medium flex items-center gap-2 min-w-0">
                <i className="ri-graduation-cap-line text-primary flex-shrink-0"></i>
                <span className="break-words">{degree}</span>
              </div>
              {university && (
                <div className="text-gray-600 dark:text-gray-400 mt-0.5 flex items-center gap-2 min-w-0">
                  <i className="ri-building-line text-info flex-shrink-0"></i>
                  <span className="break-words">{university}</span>
                </div>
              )}
            </div>
          )
        },
      },
      {
        Header: 'Bio',
        accessor: 'bio',
        minWidth: 180,
        maxWidth: 220,
        Cell: ({ row }: any) => {
          const candidate = row.original
          return (
            <div 
              className="text-sm text-gray-700 dark:text-gray-300 min-w-0 break-words"
              style={{ 
                maxWidth: '100%',
                lineHeight: '1.5',
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
              }}
            >
              {candidate.bio}
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
                  onClick={() => { setPreviewCandidate(c); setViewDetailTab('personal') }}
                  className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm !h-[1.75rem] !w-[1.75rem] bg-success/10 text-success hover:bg-success hover:text-white"
                  title="View Details"
                >
                  <i className="ri-eye-line"></i>
                  <span className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white" role="tooltip">View Details</span>
                </button>
              </div>
              <div className="hs-tooltip ti-main-tooltip">
                <Link href={`/ats/candidates/edit?id=${c.id}`} className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm !h-[1.75rem] !w-[1.75rem] bg-info/10 text-info hover:bg-info hover:text-white" title="Edit Candidate">
                  <i className="ri-pencil-line"></i>
                  <span className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white" role="tooltip">Edit Candidate</span>
                </Link>
              </div>
              <div className="hs-tooltip ti-main-tooltip">
                <button type="button" onClick={() => openDocumentsModal(c)} className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm !h-[1.75rem] !w-[1.75rem] bg-secondary/10 text-secondary hover:bg-secondary hover:text-white" title="View Documents">
                  <i className="ri-file-list-line"></i>
                  <span className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white" role="tooltip">View Documents</span>
                </button>
              </div>
              <div className="hs-tooltip ti-main-tooltip">
                <button type="button" onClick={() => openSalarySlipModal(c)} className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm !h-[1.75rem] !w-[1.75rem] bg-warning/10 text-warning hover:bg-warning hover:text-white" title="Upload Salary Slip">
                  <i className="ri-file-add-line"></i>
                  <span className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white" role="tooltip">Upload Salary Slip</span>
                </button>
              </div>
              <div className="hs-tooltip ti-main-tooltip">
                <button type="button" onClick={() => handleShareClick(c)} className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm !h-[1.75rem] !w-[1.75rem] bg-primary/10 text-primary hover:bg-primary hover:text-white" title="Share Candidate">
                  <i className="ri-share-line"></i>
                  <span className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white" role="tooltip">Share Candidate</span>
                </button>
              </div>
              <div className="hs-tooltip ti-main-tooltip">
                <button type="button" onClick={() => { setActionSuccess('Attendance is not configured for candidates in this environment'); setTimeout(() => setActionSuccess(null), 3000) }} className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm !h-[1.75rem] !w-[1.75rem] bg-purple-500/10 text-purple-500 hover:bg-purple-500 hover:text-white" title="View Attendance">
                  <i className="ri-calendar-line"></i>
                  <span className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white" role="tooltip">View Attendance</span>
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
              <div className="hs-tooltip ti-main-tooltip">
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
              </div>
              <div className="inline-flex" data-more-menu-container>
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
              </div>
            </div>
          )
        },
      },
    ],
    [selectedRows, moreMenuState, deletingCandidateId]
  )

  // Filter data based on filter state
  const filteredData = useMemo(() => {
    return candidates.filter((candidate) => {
      // Name filter (array)
      if (filters.name.length > 0 && !filters.name.some(name => 
        candidate.name.toLowerCase().includes(name.toLowerCase())
      )) {
        return false
      }
      
      // Skills filter (array)
      if (filters.skills.length > 0 && !filters.skills.some(skill => 
        candidate.skills?.some(candidateSkill => 
          candidateSkill.toLowerCase().includes(skill.toLowerCase())
        )
      )) {
        return false
      }
      
      // Education filter (array)
      if (filters.education.length > 0 && !filters.education.some(edu => 
        candidate.education.toLowerCase().includes(edu.toLowerCase())
      )) {
        return false
      }
      
      // Email filter (string)
      if (filters.email && !candidate.email.toLowerCase().includes(filters.email.toLowerCase())) {
        return false
      }
      
      // Experience filter (range)
      if (filters.experience[0] !== experienceRanges.min || filters.experience[1] !== experienceRanges.max) {
        const candidateExperience = candidate.experience || 0
        if (candidateExperience < filters.experience[0] || candidateExperience > filters.experience[1]) {
          return false
        }
      }
      
      return true
    })
  }, [candidates, filters, experienceRanges.min, experienceRanges.max])

  const data = useMemo(() => filteredData, [filteredData])

  // Get unique values for dropdown filters
  const allSkills = useMemo(() => {
    const skillSet = new Set<string>()
    candidates.forEach(candidate => {
      candidate.skills?.forEach(skill => skillSet.add(skill))
    })
    return Array.from(skillSet).sort()
  }, [candidates])

  const allEducation = useMemo(() => {
    return [...new Set(candidates.map(candidate => candidate.education).filter(Boolean))].sort()
  }, [candidates])

  const allNames = useMemo(() => {
    return [...new Set(candidates.map(candidate => candidate.name))].sort()
  }, [candidates])

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
      experience: [experienceRanges.min, experienceRanges.max]
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
    filters.experience[0] !== experienceRanges.min ||
    filters.experience[1] !== experienceRanges.max

  const activeFilterCount = 
    filters.name.length +
    filters.skills.length +
    filters.education.length +
    (filters.email !== '' ? 1 : 0) +
    (filters.experience[0] !== experienceRanges.min || filters.experience[1] !== experienceRanges.max ? 1 : 0)

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
                <table {...getTableProps()} className="table min-w-full table-striped table-hover table-bordered border-gray-300 dark:border-gray-600" style={{ tableLayout: 'fixed' }}>
                  <thead>
                    {headerGroups.map((headerGroup: any) => (
                      <tr {...headerGroup.getHeaderGroupProps()} className="bg-primary/10 dark:bg-primary/20 border-b border-gray-300 dark:border-gray-600" key={Math.random()}>
                        {headerGroup.headers.map((column: any) => {
                          const headerProps = column.getHeaderProps(column.getSortByToggleProps());
                          const isCheckboxCol = column.id === 'checkbox';
                          return (
                          <th
                            {...headerProps}
                            scope="col"
                            className="text-start sticky top-0 z-10 bg-gray-50 dark:bg-black/20"
                            key={Math.random()}
                            style={{ 
                              ...headerProps.style,
                              position: 'sticky', 
                              top: 0, 
                              zIndex: 10,
                              ...(isCheckboxCol ? { width: 52, minWidth: 52, maxWidth: 52 } : {}),
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
                          );
                        })}
                      </tr>
                    ))}
                  </thead>
                  <tbody {...getTableBodyProps()}>
                    {page.map((row: any) => {
                      prepareRow(row)
                      return (
                        <tr {...row.getRowProps()} className="border-b border-gray-300 dark:border-gray-600" key={Math.random()}>
                          {row.cells.map((cell: any) => {
                            const isEducationOrBio = cell.column.id === 'education' || cell.column.id === 'bio';
                            const isCheckboxCol = cell.column.id === 'checkbox';
                            const cellProps = cell.getCellProps();
                            return (
                              <td
                                {...cellProps}
                                key={Math.random()}
                                className={isEducationOrBio ? `${cellProps.className || ''} align-top !whitespace-normal`.trim() : cellProps.className}
                                style={{
                                  ...cellProps.style,
                                  ...(isEducationOrBio ? { minWidth: 0, overflow: 'hidden' } : {}),
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
      <div id="candidates-filter-panel" className="hs-overlay hidden ti-offcanvas ti-offcanvas-right !z-[105]" tabIndex={-1}>
        <div className="ti-offcanvas-header bg-gray-50 dark:bg-black/20 !py-2.5">
          <h6 className="ti-offcanvas-title text-base font-semibold flex items-center gap-2">
            <i className="ri-search-line text-primary text-base"></i>
            Search Candidates
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
                <div className="max-h-40 overflow-y-auto rounded-lg bg-white dark:bg-black/20 p-2 shadow-sm">
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

            {/* Skills Filter */}
            <div className="pb-4 border-b border-gray-200 dark:border-defaultborder/10">
              <label className="form-label mb-2.5 block font-semibold text-sm text-gray-800 dark:text-white flex items-center gap-2">
                <i className="ri-code-s-slash-line text-success text-base"></i>
                Skills
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400">({allSkills.length})</span>
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  className="form-control !py-1.5 !text-sm mb-1.5"
                  placeholder="Search skills..."
                  value={searchSkills}
                  onChange={(e) => setSearchSkills(e.target.value)}
                />
                <div className="max-h-40 overflow-y-auto rounded-lg bg-white dark:bg-black/20 p-2 shadow-sm">
                  <div className="space-y-1">
                    {filteredSkills.length > 0 ? (
                      filteredSkills.map((skill) => (
                        <label
                          key={skill}
                          className="flex items-center gap-2 cursor-pointer hover:bg-success/5 dark:hover:bg-success/10 p-1.5 rounded-md transition-colors"
                        >
                          <input
                            type="checkbox"
                            className="form-check-input !w-3.5 !h-3.5"
                            checked={filters.skills.includes(skill)}
                            onChange={() => handleMultiSelectChange('skills', skill)}
                          />
                          <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">{skill}</span>
                        </label>
                      ))
                    ) : (
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-3">
                        No skills found
                      </div>
                    )}
                  </div>
                </div>
                {filters.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {filters.skills.map((skill) => (
                      <span
                        key={skill}
                        className="badge bg-success/10 text-success border border-success/30 px-2 py-1 rounded-full flex items-center gap-1.5 text-xs font-medium shadow-sm"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => handleRemoveFilter('skills', skill)}
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
                <div className="max-h-40 overflow-y-auto rounded-lg bg-white dark:bg-black/20 p-2 shadow-sm">
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

            {/* Email Filter */}
            <div className="pb-4">
              <label className="form-label mb-2.5 block font-semibold text-sm text-gray-800 dark:text-white flex items-center gap-2">
                <i className="ri-mail-line text-warning text-base"></i>
                Email
              </label>
              <input
                type="text"
                className="form-control border-gray-200 dark:border-defaultborder/10 focus:ring-2 focus:ring-primary/20 !py-1.5 !text-sm"
                placeholder="Search by email..."
                value={filters.email}
                onChange={(e) => setFilters(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>

            {/* Experience Filter - Range Slider */}
            <div className="pb-4">
              <label className="form-label mb-2.5 block font-semibold text-sm text-gray-800 dark:text-white flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <i className="ri-time-line text-info text-base"></i>
                  Work Experience (Years)
                </span>
                <span className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                  {filters.experience[0]} - {filters.experience[1]} years
                </span>
              </label>
              <div className="px-2 py-4 bg-gray-50 dark:bg-black/20 rounded-lg">
                <Range
                  values={filters.experience}
                  step={1}
                  min={experienceRanges.min}
                  max={experienceRanges.max}
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
                            min: experienceRanges.min,
                            max: experienceRanges.max,
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
                data-hs-overlay="#candidates-filter-panel"
              >
                <i className="ri-close-line me-1.5"></i>Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Candidate View Details Modal (centered modal with tabs – matches Dharwrin style) */}
      {previewCandidate && (
        <div className="fixed inset-0 z-[110] overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-2 sm:px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => { setPreviewCandidate(null); setViewDetailTab('personal') }} />
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full max-w-sm mx-auto sm:max-w-2xl md:max-w-4xl lg:max-w-6xl sm:my-8 sm:align-middle">
              {/* Modal header */}
              <div className="bg-white dark:bg-gray-800 px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center min-w-0 flex-1">
                    <div className="avatar avatar-lg avatar-rounded me-3 flex-shrink-0">
                      <img
                        src={previewCandidate.displayPicture || (previewCandidate._raw?.profilePicture?.url) || '/assets/images/faces/1.jpg'}
                        alt={previewCandidate.name}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/assets/images/faces/1.jpg' }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">{previewCandidate.name}</h3>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{previewCandidate.email}</p>
                      {(previewCandidate._raw?.employeeId) && (
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">Employee ID: {previewCandidate._raw.employeeId}</p>
                      )}
                      {(previewCandidate.bio || previewCandidate._raw?.shortBio) && (
                        <p className="text-xs text-gray-600 dark:text-gray-300 truncate mt-1">{previewCandidate.bio || previewCandidate._raw?.shortBio}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-2 flex-wrap">
                    {((previewCandidate.isProfileCompleted ?? previewCandidate._raw?.isProfileCompleted ?? 0) < 100) && (
                      <span className="flex items-center gap-1 px-2 py-1 text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-md" title="Profile completion">
                        <i className="ri-pie-chart-line"></i>
                        {previewCandidate.isProfileCompleted ?? previewCandidate._raw?.isProfileCompleted ?? 0}% complete
                      </span>
                    )}
                    <span className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-md" title="Joining Date">
                      <i className="ri-calendar-check-line"></i>
                      {previewCandidate._raw?.joiningDate
                        ? new Date(previewCandidate._raw.joiningDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : 'Not set'}
                    </span>
                    <span className="flex items-center gap-1 px-2 py-1 text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-md" title="Resign Date">
                      <i className="ri-calendar-close-line"></i>
                      {previewCandidate._raw?.resignDate
                        ? new Date(previewCandidate._raw.resignDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : 'Not set'}
                    </span>
                    <button type="button" onClick={() => { setPreviewCandidate(null); setViewDetailTab('personal') }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0">
                      <i className="ri-close-line text-xl"></i>
                    </button>
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
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Joining Date</label>
                          <p className="mt-1 text-sm text-gray-900 dark:text-white">
                            {previewCandidate._raw?.joiningDate
                              ? new Date(previewCandidate._raw.joiningDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                              : '-'}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Resign Date</label>
                          <p className="mt-1 text-sm text-gray-900 dark:text-white">
                            {previewCandidate._raw?.resignDate
                              ? new Date(previewCandidate._raw.resignDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                              : '-'}
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
                      <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Skills</h4>
                      {(previewCandidate.skills?.length || previewCandidate._raw?.skills?.length) ? (
                        <div className="flex flex-wrap gap-2">
                          {(previewCandidate.skills || previewCandidate._raw?.skills?.map((s: any) => typeof s === 'string' ? s : s.name))?.map((skill: string, index: number) => (
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
                      {Array.isArray(previewCandidate._raw?.documents) && previewCandidate._raw.documents.length > 0 ? (
                        <div className="space-y-3">
                          {previewCandidate._raw.documents.map((doc: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                              <p className="font-medium text-gray-900 dark:text-white truncate">{doc?.label || doc?.originalName || `Document ${index + 1}`}</p>
                              <button type="button" className="ti-btn ti-btn-sm ti-btn-primary flex-shrink-0" onClick={() => previewCandidate?.id && handleDocumentDownload(previewCandidate.id, index)}>
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
                            <div key={index} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                              <span className="text-sm text-gray-900 dark:text-white">{slip?.month ?? ''} {slip?.year ?? ''}</span>
                              {slip?.documentUrl || slip?.url ? (
                                <a href={slip.documentUrl || slip.url} target="_blank" rel="noopener noreferrer" className="ti-btn ti-btn-sm ti-btn-primary">
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

              <div className="bg-white dark:bg-gray-800 px-4 sm:px-6 py-3 border-t border-gray-200 dark:border-gray-700">
                <button type="button" className="ti-btn ti-btn-light" onClick={() => { setPreviewCandidate(null); setViewDetailTab('personal') }}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden trigger button for candidate notes panel (needed for Preline) */}
      <button 
        id="candidate-notes-panel-trigger"
        type="button"
        style={{ display: 'none' }}
        data-hs-overlay="#candidate-notes-panel"
      ></button>

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

      {/* Documents modal */}
      <button id="documents-modal-trigger" type="button" style={{ display: 'none' }} data-hs-overlay="#documents-modal"></button>
      <div id="documents-modal" className="hs-overlay hidden ti-modal">
        <div className="hs-overlay-open:mt-7 ti-modal-box mt-0 ease-out lg:!max-w-lg lg:w-full m-3 lg:!mx-auto">
          <div className="ti-modal-content">
            <div className="ti-modal-header">
              <h6 className="ti-modal-title">Documents – {documentsCandidate?.name}</h6>
              <button type="button" className="hs-dropdown-toggle ti-modal-close-btn" data-hs-overlay="#documents-modal" onClick={() => setDocumentsCandidate(null)}><span className="sr-only">Close</span>×</button>
            </div>
            <div className="ti-modal-body min-h-[200px]">
              {documentsLoading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
                  <span className="ml-3 text-sm text-gray-500 dark:text-gray-400">Loading documents...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {documentsList.length > 0 && (
                    <div>
                      <h6 className="form-label mb-2">Documents</h6>
                      <ul className="space-y-2">
                        {documentsList.map((doc, idx) => {
                          const st = documentStatusMap[idx]
                          const statusLabel = st?.status === 1 ? 'Approved' : st?.status === 2 ? 'Rejected' : 'Pending'
                          return (
                            <li key={idx} className="flex flex-wrap items-center justify-between gap-2 p-2 border border-gray-200 dark:border-defaultborder/10 rounded">
                              <div className="min-w-0 flex-1">
                                <span className="text-sm truncate block">{doc.type ? `[${doc.type}] ` : ''}{doc.label || doc.originalName || `Document ${idx + 1}`}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">{statusLabel}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button type="button" className="ti-btn ti-btn-sm ti-btn-primary" onClick={() => documentsCandidate && handleDocumentDownload(documentsCandidate.id, idx)}>Download</button>
                                {documentsCandidate && (
                                  <>
                                    <button type="button" className="ti-btn ti-btn-sm ti-btn-success" onClick={() => handleDocumentVerify(documentsCandidate.id, idx, 1)}>Approve</button>
                                    <button type="button" className="ti-btn ti-btn-sm ti-btn-danger" onClick={() => handleDocumentVerify(documentsCandidate.id, idx, 2)}>Reject</button>
                                  </>
                                )}
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )}
                  {salarySlipsFromCandidate.length > 0 && (
                    <div>
                      <h6 className="form-label mb-2">Salary slips</h6>
                      <ul className="space-y-2">
                        {salarySlipsFromCandidate.map((slip, idx) => (
                          <li key={idx} className="flex items-center justify-between p-2 border border-gray-200 dark:border-defaultborder/10 rounded">
                            <span className="text-sm">{slip.month ?? ''} {slip.year ?? ''}</span>
                            {documentsCandidate && (
                              <button type="button" className="ti-btn ti-btn-sm ti-btn-danger" onClick={() => handleSalarySlipDelete(documentsCandidate.id, idx)}>Delete</button>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {documentsList.length === 0 && salarySlipsFromCandidate.length === 0 && !documentsLoading && (
                    <div className="text-center py-10 px-4">
                      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-100 dark:bg-black/30 text-gray-400 dark:text-gray-500 mb-4">
                        <i className="ri-file-list-3-line text-3xl"></i>
                      </div>
                      <h4 className="text-base font-semibold text-gray-800 dark:text-white mb-1">No documents yet</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-sm mx-auto">
                        No documents or salary slips have been added for {documentsCandidate?.name ?? 'this candidate'}.
                      </p>
                      {documentsCandidate && (
                        <button
                          type="button"
                          className="ti-btn ti-btn-primary"
                          onClick={() => {
                            setSalarySlipCandidate(documentsCandidate)
                            setSalarySlipForm({ month: '', year: '', file: null })
                            setActionError(null)
                            document.querySelector('[data-hs-overlay="#documents-modal"]')?.dispatchEvent(new Event('click'))
                            setTimeout(() => {
                              const trigger = document.getElementById('salary-slip-modal-trigger')
                              if (trigger) (trigger as HTMLElement).click()
                            }, 150)
                          }}
                        >
                          <i className="ri-file-add-line me-1"></i>Upload Salary Slip
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Salary slip modal */}
      <button id="salary-slip-modal-trigger" type="button" style={{ display: 'none' }} data-hs-overlay="#salary-slip-modal"></button>
      <div id="salary-slip-modal" className="hs-overlay hidden ti-modal">
        <div className="hs-overlay-open:mt-7 ti-modal-box mt-0 ease-out lg:!max-w-lg lg:w-full m-3 lg:!mx-auto">
          <div className="ti-modal-content">
            <div className="ti-modal-header">
              <h6 className="ti-modal-title">Upload Salary Slip – {salarySlipCandidate?.name}</h6>
              <button type="button" className="hs-dropdown-toggle ti-modal-close-btn" data-hs-overlay="#salary-slip-modal" onClick={() => setSalarySlipCandidate(null)}><span className="sr-only">Close</span>×</button>
            </div>
            <div className="ti-modal-body space-y-4">
              <div>
                <label className="form-label">Month</label>
                <input type="text" className="form-control" placeholder="e.g. January" value={salarySlipForm.month} onChange={(e) => setSalarySlipForm(f => ({ ...f, month: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">Year</label>
                <input type="number" className="form-control" placeholder="2024" value={salarySlipForm.year} onChange={(e) => setSalarySlipForm(f => ({ ...f, year: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">File</label>
                <input type="file" className="form-control" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setSalarySlipForm(f => ({ ...f, file: e.target.files?.[0] ?? null }))} />
              </div>
            </div>
            <div className="ti-modal-footer">
              <button type="button" className="ti-btn ti-btn-light" data-hs-overlay="#salary-slip-modal">Cancel</button>
              <button type="button" className="ti-btn ti-btn-primary" disabled={salarySlipSubmitting || !salarySlipForm.month || !salarySlipForm.year || !salarySlipForm.file} onClick={handleSalarySlipSubmit}>
                {salarySlipSubmitting ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback modal */}
      <button id="feedback-modal-trigger" type="button" style={{ display: 'none' }} data-hs-overlay="#feedback-modal"></button>
      <div id="feedback-modal" className="hs-overlay hidden ti-modal">
        <div className="hs-overlay-open:mt-7 ti-modal-box mt-0 ease-out lg:!max-w-lg lg:w-full m-3 lg:!mx-auto">
          <div className="ti-modal-content">
            <div className="ti-modal-header">
              <h6 className="ti-modal-title">Add Feedback – {feedbackCandidate?.name}</h6>
              <button type="button" className="hs-dropdown-toggle ti-modal-close-btn" data-hs-overlay="#feedback-modal" onClick={() => setFeedbackCandidate(null)}><span className="sr-only">Close</span>×</button>
            </div>
            <div className="ti-modal-body space-y-4">
              <div>
                <label className="form-label">Feedback</label>
                <textarea className="form-control" rows={4} value={feedbackForm.feedback} onChange={(e) => setFeedbackForm(f => ({ ...f, feedback: e.target.value }))} placeholder="Enter feedback..." />
              </div>
              <div>
                <label className="form-label">Rating (1-5)</label>
                <select className="form-control" value={feedbackForm.rating} onChange={(e) => setFeedbackForm(f => ({ ...f, rating: parseInt(e.target.value, 10) }))}>
                  {[1, 2, 3, 4, 5].map(n => (<option key={n} value={n}>{n}</option>))}
                </select>
              </div>
            </div>
            <div className="ti-modal-footer">
              <button type="button" className="ti-btn ti-btn-light" data-hs-overlay="#feedback-modal">Cancel</button>
              <button type="button" className="ti-btn ti-btn-primary" disabled={feedbackSubmitting || !feedbackForm.feedback.trim()} onClick={handleFeedbackSubmit}>
                {feedbackSubmitting ? 'Saving...' : 'Save Feedback'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Export (email) modal */}
      <button id="export-candidate-modal-trigger" type="button" style={{ display: 'none' }} data-hs-overlay="#export-candidate-modal"></button>
      <div id="export-candidate-modal" className="hs-overlay hidden ti-modal">
        <div className="hs-overlay-open:mt-7 ti-modal-box mt-0 ease-out lg:!max-w-lg lg:w-full m-3 lg:!mx-auto">
          <div className="ti-modal-content">
            <div className="ti-modal-header">
              <h6 className="ti-modal-title">Export profile by email – {exportCandidate?.name}</h6>
              <button type="button" className="hs-dropdown-toggle ti-modal-close-btn" data-hs-overlay="#export-candidate-modal" onClick={() => setExportCandidate(null)}><span className="sr-only">Close</span>×</button>
            </div>
            <div className="ti-modal-body">
              <label className="form-label">Recipient email</label>
              <input type="email" className="form-control" placeholder="email@example.com" value={exportEmail} onChange={(e) => setExportEmail(e.target.value)} />
            </div>
            <div className="ti-modal-footer">
              <button type="button" className="ti-btn ti-btn-light" data-hs-overlay="#export-candidate-modal">Cancel</button>
              <button type="button" className="ti-btn ti-btn-primary" disabled={exportSubmitting || !exportEmail.trim()} onClick={handleExportSubmit}>
                {exportSubmitting ? 'Sending...' : 'Send export email'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Export all candidates modal */}
      <button id="export-all-modal-trigger" type="button" style={{ display: 'none' }} data-hs-overlay="#export-all-modal"></button>
      <div id="export-all-modal" className="hs-overlay hidden ti-modal">
        <div className="hs-overlay-open:mt-7 ti-modal-box mt-0 ease-out lg:!max-w-lg lg:w-full m-3 lg:!mx-auto">
          <div className="ti-modal-content">
            <div className="ti-modal-header">
              <h6 className="ti-modal-title">Export all candidates</h6>
              <button type="button" className="hs-dropdown-toggle ti-modal-close-btn" data-hs-overlay="#export-all-modal"><span className="sr-only">Close</span>×</button>
            </div>
            <div className="ti-modal-body">
              <label className="form-label">Send CSV by email (optional)</label>
              <input type="email" className="form-control" placeholder="email@example.com" value={exportAllEmail} onChange={(e) => setExportAllEmail(e.target.value)} />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Leave empty to download only.</p>
            </div>
            <div className="ti-modal-footer">
              <button type="button" className="ti-btn ti-btn-light" data-hs-overlay="#export-all-modal">Cancel</button>
              <button type="button" className="ti-btn ti-btn-primary" disabled={exportAllSubmitting} onClick={handleExportAllSubmit}>
                {exportAllSubmitting ? 'Exporting...' : 'Export'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Assign recruiter modal */}
      <button id="assign-recruiter-modal-trigger" type="button" style={{ display: 'none' }} data-hs-overlay="#assign-recruiter-modal"></button>
      <div id="assign-recruiter-modal" className="hs-overlay hidden ti-modal">
        <div className="hs-overlay-open:mt-7 ti-modal-box mt-0 ease-out lg:!max-w-lg lg:w-full m-3 lg:!mx-auto">
          <div className="ti-modal-content">
            <div className="ti-modal-header">
              <h6 className="ti-modal-title">Assign recruiter – {assignRecruiterCandidate?.name}</h6>
              <button type="button" className="hs-dropdown-toggle ti-modal-close-btn" data-hs-overlay="#assign-recruiter-modal" onClick={() => { setAssignRecruiterCandidate(null); setAssignRecruiterId('') }}><span className="sr-only">Close</span>×</button>
            </div>
            <div className="ti-modal-body">
              <label className="form-label">Recruiter</label>
              <select className="form-control" value={assignRecruiterId} onChange={(e) => setAssignRecruiterId(e.target.value)}>
                <option value="">Select recruiter</option>
                {recruitersList.map((u) => (<option key={u.id} value={u.id}>{u.name}{u.email ? ` (${u.email})` : ''}</option>))}
              </select>
            </div>
            <div className="ti-modal-footer">
              <button type="button" className="ti-btn ti-btn-light" data-hs-overlay="#assign-recruiter-modal">Cancel</button>
              <button type="button" className="ti-btn ti-btn-primary" disabled={assignRecruiterSubmitting || !assignRecruiterId} onClick={handleAssignRecruiterSubmit}>
                {assignRecruiterSubmitting ? 'Saving...' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Joining date modal */}
      <button id="joining-date-modal-trigger" type="button" style={{ display: 'none' }} data-hs-overlay="#joining-date-modal"></button>
      <div id="joining-date-modal" className="hs-overlay hidden ti-modal">
        <div className="hs-overlay-open:mt-7 ti-modal-box mt-0 ease-out lg:!max-w-lg lg:w-full m-3 lg:!mx-auto">
          <div className="ti-modal-content">
            <div className="ti-modal-header">
              <h6 className="ti-modal-title">Joining date – {joiningDateCandidate?.name}</h6>
              <button type="button" className="hs-dropdown-toggle ti-modal-close-btn" data-hs-overlay="#joining-date-modal" onClick={() => { setJoiningDateCandidate(null); setJoiningDateValue('') }}><span className="sr-only">Close</span>×</button>
            </div>
            <div className="ti-modal-body">
              <label className="form-label">Joining date</label>
              <input type="date" className="form-control" value={joiningDateValue} onChange={(e) => setJoiningDateValue(e.target.value)} />
            </div>
            <div className="ti-modal-footer">
              <button type="button" className="ti-btn ti-btn-light" data-hs-overlay="#joining-date-modal">Cancel</button>
              <button type="button" className="ti-btn ti-btn-primary" disabled={joiningDateSubmitting || !joiningDateValue} onClick={handleJoiningDateSubmit}>
                {joiningDateSubmitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Resign date modal */}
      <button id="resign-date-modal-trigger" type="button" style={{ display: 'none' }} data-hs-overlay="#resign-date-modal"></button>
      <div id="resign-date-modal" className="hs-overlay hidden ti-modal">
        <div className="hs-overlay-open:mt-7 ti-modal-box mt-0 ease-out lg:!max-w-lg lg:w-full m-3 lg:!mx-auto">
          <div className="ti-modal-content">
            <div className="ti-modal-header">
              <h6 className="ti-modal-title">Resign date – {resignDateCandidate?.name}</h6>
              <button type="button" className="hs-dropdown-toggle ti-modal-close-btn" data-hs-overlay="#resign-date-modal" onClick={() => { setResignDateCandidate(null); setResignDateValue('') }}><span className="sr-only">Close</span>×</button>
            </div>
            <div className="ti-modal-body">
              <label className="form-label">Resign date</label>
              <input type="date" className="form-control" value={resignDateValue} onChange={(e) => setResignDateValue(e.target.value)} />
              <button type="button" className="ti-btn ti-btn-light mt-2" onClick={() => setResignDateValue('')}>Clear date</button>
            </div>
            <div className="ti-modal-footer">
              <button type="button" className="ti-btn ti-btn-light" data-hs-overlay="#resign-date-modal">Cancel</button>
              <button type="button" className="ti-btn ti-btn-primary" disabled={resignDateSubmitting} onClick={handleResignDateSubmit}>
                {resignDateSubmitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Week-off modal */}
      <button id="week-off-modal-trigger" type="button" style={{ display: 'none' }} data-hs-overlay="#week-off-modal"></button>
      <div id="week-off-modal" className="hs-overlay hidden ti-modal">
        <div className="hs-overlay-open:mt-7 ti-modal-box mt-0 ease-out lg:!max-w-lg lg:w-full m-3 lg:!mx-auto">
          <div className="ti-modal-content">
            <div className="ti-modal-header">
              <h6 className="ti-modal-title">Week-off {weekOffCandidateIds.length > 1 ? `(${weekOffCandidateIds.length} candidates)` : ''}</h6>
              <button type="button" className="hs-dropdown-toggle ti-modal-close-btn" data-hs-overlay="#week-off-modal" onClick={() => { setWeekOffCandidateIds([]); setWeekOffDays([]) }}><span className="sr-only">Close</span>×</button>
            </div>
            <div className="ti-modal-body">
              <label className="form-label">Select week-off days</label>
              <div className="flex flex-wrap gap-2">
                {WEEK_DAYS.map((day) => (
                  <label key={day} className="flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" className="form-check-input" checked={weekOffDays.includes(day)} onChange={() => toggleWeekOffDay(day)} />
                    <span className="text-sm">{day}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="ti-modal-footer">
              <button type="button" className="ti-btn ti-btn-light" data-hs-overlay="#week-off-modal">Cancel</button>
              <button type="button" className="ti-btn ti-btn-primary" disabled={weekOffSubmitting || weekOffDays.length === 0} onClick={handleWeekOffSubmit}>
                {weekOffSubmitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Assign shift modal */}
      <button id="assign-shift-modal-trigger" type="button" style={{ display: 'none' }} data-hs-overlay="#assign-shift-modal"></button>
      <div id="assign-shift-modal" className="hs-overlay hidden ti-modal">
        <div className="hs-overlay-open:mt-7 ti-modal-box mt-0 ease-out lg:!max-w-lg lg:w-full m-3 lg:!mx-auto">
          <div className="ti-modal-content">
            <div className="ti-modal-header">
              <h6 className="ti-modal-title">Assign shift {assignShiftCandidateIds.length > 1 ? `(${assignShiftCandidateIds.length} candidates)` : ''}</h6>
              <button type="button" className="hs-dropdown-toggle ti-modal-close-btn" data-hs-overlay="#assign-shift-modal" onClick={() => { setAssignShiftCandidateIds([]); setAssignShiftId('') }}><span className="sr-only">Close</span>×</button>
            </div>
            <div className="ti-modal-body">
              <label className="form-label">Shift</label>
              <select className="form-control" value={assignShiftId} onChange={(e) => setAssignShiftId(e.target.value)}>
                <option value="">Select shift</option>
                {shiftsList.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
              </select>
            </div>
            <div className="ti-modal-footer">
              <button type="button" className="ti-btn ti-btn-light" data-hs-overlay="#assign-shift-modal">Cancel</button>
              <button type="button" className="ti-btn ti-btn-primary" disabled={assignShiftSubmitting || !assignShiftId} onClick={handleAssignShiftSubmit}>
                {assignShiftSubmitting ? 'Saving...' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Share Candidate Modal – state-driven (opens when shareCandidate is set) */}
      {shareCandidate && (
        <div className="fixed inset-0 z-[110] overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-2 sm:px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => { setShareCandidate(null); setShowEmailInput(false); setShareEmail('') }} />
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full max-w-lg my-8 sm:align-middle">
              <div className="ti-modal-content">
                <div className="ti-modal-header px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h6 className="ti-modal-title flex items-center gap-2">
                    <i className="ri-share-line text-primary"></i>
                    Share Candidate
                  </h6>
                  <button
                    type="button"
                    className="ti-modal-close-btn text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    onClick={() => { setShareCandidate(null); setShowEmailInput(false); setShareEmail('') }}
                  >
                    <span className="sr-only">Close</span>
                    <i className="ri-close-line text-xl"></i>
                  </button>
                </div>
                <div className="ti-modal-body px-4 sm:px-6 py-4">
              {shareCandidate ? (
                <div className="space-y-4">
                  {/* Candidate Info */}
                  <div className="p-3 bg-gray-50 dark:bg-black/20 rounded-lg border border-gray-200 dark:border-defaultborder/10">
                    <h6 className="font-semibold text-gray-800 dark:text-white mb-1">{shareCandidate.name}</h6>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {shareCandidate.email} • {shareCandidate.phone}
                    </p>
                  </div>

                  {/* Include documents in shared link */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="form-check-input" checked={shareWithDoc} onChange={(e) => setShareWithDoc(e.target.checked)} />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Include documents in shared link</span>
                  </label>

                  {/* Copy URL Section – use real shareable link (with token) after sending email */}
                  <div>
                    <label className="form-label mb-2 font-semibold text-sm text-gray-800 dark:text-white">
                      Shareable link
                    </label>
                    {(sharedPublicUrl && sharedPublicUrlForId === shareCandidate.id) ? (
                      <>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            className="form-control text-sm"
                            value={sharedPublicUrl}
                            readOnly
                          />
                          <button
                            type="button"
                            className={`ti-btn ${copied ? 'ti-btn-success' : 'ti-btn-primary'}`}
                            onClick={() => handleCopyUrl(sharedPublicUrl)}
                          >
                            <i className={`ri-${copied ? 'check' : 'file-copy'}-line me-1`}></i>
                            {copied ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">This link was sent in the email. Recipients can open it to view the profile.</p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Send the email above to generate a shareable link. The link (with token) will appear here and was also included in the email.</p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            className="form-control text-sm bg-gray-100 dark:bg-gray-800"
                            value="Send email first to get link"
                            readOnly
                          />
                        </div>
                      </>
                    )}
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
                        onClick={() => handleShareWhatsApp(shareCandidate)}
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
                              if (e.key === 'Enter' && !shareSubmitting) handleSendEmail()
                            }}
                            disabled={shareSubmitting}
                          />
                          <div className="flex gap-2 items-center">
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
                              disabled={shareSubmitting}
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
                <div className="text-center py-4 text-gray-500">No candidate selected</div>
              )}
            </div>
            <div className="ti-modal-footer px-4 sm:px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                className="ti-btn ti-btn-light"
                onClick={() => { setShareCandidate(null); setShowEmailInput(false); setShareEmail('') }}
              >
                Close
              </button>
            </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
