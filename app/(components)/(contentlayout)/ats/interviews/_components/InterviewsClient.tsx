"use client"
import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment, useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/shared/contexts/auth-context'
import { appendJoinIdentityToUrl } from '@/shared/lib/join-room-url'
import { useTable, useSortBy, useGlobalFilter, usePagination } from 'react-table'
import { createMeeting, listMeetings, getMeeting, getMeetingRecordings, updateMeeting, type Meeting, type CreateMeetingPayload, type MeetingRecording, type UpdateMeetingPayload } from '@/shared/lib/api/meetings'
import { listJobs, type Job } from '@/shared/lib/api/jobs'
import { type CandidateListItem } from '@/shared/lib/api/candidates'
import { listReferralLeads, type ReferralLeadRow } from '@/shared/lib/api/referralLeads'
import { listRecruiters } from '@/shared/lib/api/users'
import type { User } from '@/shared/lib/types'
import CreateInterviewModal from './CreateInterviewModal'
import RecordingsModal from './RecordingsModal'
import InterviewsFilterPanel from './InterviewsFilterPanel'

/** When scheduling, store job id on `Meeting.jobPosition` if known — backend matches Job / JobApplication by ObjectId; title-only strings often fail exact regex match. */
function isMongoObjectIdString(value: string | undefined): boolean {
  return typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value.trim())
}

/** Table row shape derived from Meeting API */
interface InterviewTableRow {
  id: string
  position: string
  date: string
  time: string
  type: string
  candidate: {
    id?: string
    name: string
    displayPicture?: string
    email: string
    phone?: string
  }
  recruiter: {
    id?: string
    name: string
    displayPicture?: string
    email: string
  }
  status: string
  /** Interview result: pending, selected, rejected */
  interviewResult: 'pending' | 'selected' | 'rejected'
  /** Public join URL for the interview (copy link) */
  publicMeetingUrl: string
  meetingId: string
}

function formatMeetingTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  } catch {
    return '—'
  }
}

function formatMeetingDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toISOString().slice(0, 10)
  } catch {
    return '—'
  }
}

/** Referral lead rows use the same candidate id as employees — map for schedule/edit dropdowns. */
function mapReferralLeadsToScheduleCandidates(rows: ReferralLeadRow[]): CandidateListItem[] {
  return rows.map((lead) => ({
    id: lead.id,
    fullName: lead.fullName,
    email: lead.email,
    phoneNumber: '',
    profilePicture: lead.profilePicture,
  }))
}

async function fetchReferralLeadsForSchedule(): Promise<CandidateListItem[]> {
  const aggregated: ReferralLeadRow[] = []
  let cursor: string | undefined
  // Backend caps limit at 100 (Joi + service); 200 was rejected and returned no rows.
  for (let page = 0; page < 15; page++) {
    const res = await listReferralLeads({ limit: 100, cursor })
    aggregated.push(...(res.results ?? []))
    if (!res.hasMore || !res.nextCursor) break
    cursor = res.nextCursor
  }
  return mapReferralLeadsToScheduleCandidates(aggregated)
}

/** Build ISO string for API from date + time inputs (handles HH:mm and HH:mm:ss). */
function buildScheduledAtFromForm(dateStr: string, timeStr: string): string {
  const [year, month, day] = dateStr.split('-').map((v) => parseInt(v, 10))
  const t = timeStr.trim()
  const parts = t.split(':').filter((p) => p !== '')
  const h = parseInt(String(parts[0] ?? '0').replace(/\D/g, ''), 10) || 0
  const m = parseInt(String(parts[1] ?? '00').replace(/\D/g, ''), 10) || 0
  const secRaw = String(parts[2] ?? '00').replace(/\D/g, '')
  const s = parseInt(secRaw, 10) || 0
  // Convert local date/time input into UTC ISO so backend schedule checks align with user-selected local time.
  const localDate = new Date(year, (month || 1) - 1, day || 1, h, m, s, 0)
  return localDate.toISOString()
}

function meetingToTableRow(m: Meeting): InterviewTableRow {
  const date = formatMeetingDate(m.scheduledAt)
  const time = formatMeetingTime(m.scheduledAt)
  const position = m.title || m.jobPosition || 'Interview'
  return {
    id: (m._id != null ? String(m._id) : m.meetingId) || '',
    position,
    date,
    time,
    type: m.interviewType || 'Video',
    candidate: {
      id: m.candidate?.id,
      name: m.candidate?.name ?? '—',
      displayPicture: undefined,
      email: m.candidate?.email ?? '',
      phone: m.candidate?.phone,
    },
    recruiter: {
      id: m.recruiter?.id,
      name: m.recruiter?.name ?? '—',
      displayPicture: undefined,
      email: m.recruiter?.email ?? '',
    },
    status: m.status || 'Scheduled',
    interviewResult: (m.interviewResult || 'pending') as 'pending' | 'selected' | 'rejected',
    publicMeetingUrl: m.publicMeetingUrl || (typeof window !== 'undefined' ? `${window.location.origin}/join/room?room=${encodeURIComponent(m.meetingId || '')}` : ''),
    meetingId: m.meetingId || '',
  }
}

interface FilterState {
  candidate: string[]
  recruiter: string[]
  status: string[]
  type: string[]
}

export default function InterviewsClient() {
  const { user: authUser, permissionsLoaded } = useAuth()
  const scheduleDropdownsLoadId = useRef(0)

  const defaultScheduleHosts = useMemo(() => {
    const email = authUser?.email?.trim()
    if (!email) return [{ nameOrRole: '', email: '' }]
    const nameOrRole = (authUser?.name ?? '').trim() || email.split('@')[0] || ''
    return [{ nameOrRole, email }]
  }, [authUser?.email, authUser?.name])

  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [selectedSort, setSelectedSort] = useState<string>('')
  const [isExcelMenuOpen, setIsExcelMenuOpen] = useState(false)
  const excelDropdownRef = useRef<HTMLDivElement | null>(null)
  
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
  /** Combined local date+time for Schedule Interview (react-datepicker). */
  const [scheduledInterviewAt, setScheduledInterviewAt] = useState<Date | null>(null)

  // Dynamic dropdown data for Schedule Interview modal
  const [jobs, setJobs] = useState<Job[]>([])
  const [candidates, setCandidates] = useState<CandidateListItem[]>([])
  const [recruiters, setRecruiters] = useState<User[]>([])
  const [dropdownsLoading, setDropdownsLoading] = useState(true)

  // Real interviews/meetings from API
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [meetingsLoading, setMeetingsLoading] = useState(true)
  const [meetingsError, setMeetingsError] = useState<string | null>(null)

  // View recordings modal
  const [recordingsModalMeetingId, setRecordingsModalMeetingId] = useState<string | null>(null)
  const [recordingsList, setRecordingsList] = useState<MeetingRecording[]>([])
  const [recordingsLoading, setRecordingsLoading] = useState(false)
  const [recordingsError, setRecordingsError] = useState<string | null>(null)

  // Interview result modal: row being edited + selected value
  const [resultModalInterview, setResultModalInterview] = useState<InterviewTableRow | null>(null)
  const [resultModalSelected, setResultModalSelected] = useState<'pending' | 'selected' | 'rejected'>('pending')
  const [resultUpdating, setResultUpdating] = useState(false)

  // Copy interview link feedback
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null)

  // Edit interview modal
  const [editMeetingId, setEditMeetingId] = useState<string | null>(null)
  const [editMeeting, setEditMeeting] = useState<Meeting | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  // Edit modal: candidate-specific job list (mirrors CreateInterviewModal)
  const [editJobsForCandidate, setEditJobsForCandidate] = useState<Job[]>([])
  const [editJobsLoading, setEditJobsLoading] = useState(false)
  // Controlled selected job id in edit modal
  const [editSelectedJobId, setEditSelectedJobId] = useState<string>('')

  // View mode: table or week calendar
  const [viewMode, setViewMode] = useState<'table' | 'week'>('table')
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date()
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(d)
    monday.setDate(diff)
    monday.setHours(0, 0, 0, 0)
    return monday
  })

  const fetchMeetings = useCallback(async () => {
    setMeetingsLoading(true)
    setMeetingsError(null)
    try {
      const res = await listMeetings({ limit: 100 })
      setMeetings(res.results || [])
    } catch (err: any) {
      setMeetingsError(err?.response?.data?.message || err?.message || 'Failed to load interviews')
      setMeetings([])
    } finally {
      setMeetingsLoading(false)
    }
  }, [])

  const copyInterviewLink = useCallback(async (row: InterviewTableRow) => {
    const baseUrl =
      row.publicMeetingUrl ||
      (typeof window !== 'undefined' ? `${window.location.origin}/join/room?room=${encodeURIComponent(row.meetingId)}` : '')
    if (!baseUrl) return
    const joinName = (authUser?.name?.trim() || authUser?.email?.split('@')[0] || '').trim()
    const joinEmail = authUser?.email?.trim() || ''
    const url = appendJoinIdentityToUrl(baseUrl, joinName, joinEmail)
    try {
      await navigator.clipboard.writeText(url)
      setCopiedLinkId(row.id)
      setTimeout(() => setCopiedLinkId(null), 2000)
    } catch (_) {
      // fallback: select in temp input
      const input = document.createElement('input')
      input.value = url
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopiedLinkId(row.id)
      setTimeout(() => setCopiedLinkId(null), 2000)
    }
  }, [authUser])

  const openEditModal = useCallback((id: string) => {
    setEditMeetingId(id)
    setEditMeeting(null)
    setEditError(null)
    setEditLoading(true)
    ;(window as any).HSOverlay?.open(document.querySelector('#edit-interview-modal'))
  }, [])

  /** Preline binds overlays/dropdowns during autoInit; client pages that mount toolbars after layout need a refresh. */
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
      const el = document.querySelector(selector)
      if (!el) return
      const run = () => {
        refreshPrelineDom()
        requestAnimationFrame(() => {
          ;(window as unknown as { HSOverlay?: { open: (n: Element | string) => void } }).HSOverlay?.open(el)
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

  /** Shared by initial mount and "Schedule Interview" so the candidate list is fresh and auth/permissions are ready. */
  const loadScheduleDropdowns = useCallback(() => {
    const id = ++scheduleDropdownsLoadId.current
    setDropdownsLoading(true)
    return Promise.allSettled([
      listJobs({ limit: 100, status: 'Active' }).then((r) => r.results),
      fetchReferralLeadsForSchedule(),
      listRecruiters({ limit: 100 }).then((r) => r.results),
    ])
      .then((results) => {
        if (scheduleDropdownsLoadId.current !== id) return
        const jobList = results[0].status === 'fulfilled' ? results[0].value || [] : []
        const candidateList = results[1].status === 'fulfilled' ? results[1].value || [] : []
        const recruiterList = results[2].status === 'fulfilled' ? results[2].value || [] : []
        setJobs(jobList)
        setCandidates(candidateList)
        setRecruiters(recruiterList)
        const failed = results
          .map((r, i) => (r.status === 'rejected' ? ['Jobs', 'Referral leads', 'Recruiters'][i] : null))
          .filter(Boolean) as string[]
        if (failed.length > 0) {
          console.warn('[Interviews] Schedule form dropdowns failed to load:', failed, results)
        }
      })
      .finally(() => {
        if (scheduleDropdownsLoadId.current === id) setDropdownsLoading(false)
      })
  }, [])

  const openScheduleInterviewModal = useCallback(() => {
    void loadScheduleDropdowns()
    openHsOverlay('#create-interview-modal')
  }, [loadScheduleDropdowns, openHsOverlay])

  // Re-init Preline so toolbar overlays/dropdowns work (same issue as ATS Offers placement / Jobs listings).
  useEffect(() => {
    void ensurePrelineLoaded().then(() => {
      requestAnimationFrame(() => {
        refreshPrelineDom()
      })
    })
  }, [ensurePrelineLoaded, refreshPrelineDom])

  useEffect(() => {
    if (meetingsLoading) return
    requestAnimationFrame(() => {
      refreshPrelineDom()
    })
  }, [meetingsLoading, refreshPrelineDom])

  const closeEditModal = useCallback(() => {
    setEditMeetingId(null)
    setEditMeeting(null)
    setEditError(null)
    setEditJobsForCandidate([])
    setEditSelectedJobId('')
    ;(window as any).HSOverlay?.close(document.querySelector('#edit-interview-modal'))
  }, [])

  useEffect(() => {
    if (!editMeetingId) return
    let cancelled = false
    getMeeting(editMeetingId)
      .then((m) => {
        if (!cancelled) {
          setEditMeeting(m)
          // Load candidate-specific jobs when the meeting is fetched
          const candId = m?.candidate?.id
          if (candId) {
            setEditJobsLoading(true)
            import('@/shared/lib/api/jobApplications')
              .then(({ listJobApplications }) => listJobApplications({ candidateId: candId, limit: 200 }))
              .then((res) => {
                if (cancelled) return
                // Build job list from applications (same as CreateInterviewModal.jobOptionsFromApplications)
                const seen = new Map<string, Job>()
                for (const app of res.results ?? []) {
                  const j = app.job
                  if (!j || typeof j === 'string') continue
                  const id = String((j as any)._id ?? (j as any).id ?? '')
                  if (!id || seen.has(id)) continue
                  seen.set(id, {
                    _id: id, id,
                    title: (j as any).title || 'Position',
                    organisation: (j as any).organisation ?? { name: '' },
                    jobDescription: '', jobType: '', location: '',
                    status: (j as any).status || 'Active',
                  })
                }
                setEditJobsForCandidate([...seen.values()])
                // Pre-select existing jobPosition (stored as ObjectId or title)
                const pos = (m?.jobPosition || '').trim()
                if (pos) {
                  const byId = [...seen.entries()].find(([id]) => id === pos)
                  if (byId) {
                    setEditSelectedJobId(byId[0])
                  } else {
                    // fallback: match by title
                    const byTitle = [...seen.entries()].find(([, job]) =>
                      job.title.toLowerCase() === pos.toLowerCase()
                    )
                    setEditSelectedJobId(byTitle?.[0] ?? '')
                  }
                } else {
                  setEditSelectedJobId('')
                }
              })
              .catch(() => { if (!cancelled) setEditJobsForCandidate([]) })
              .finally(() => { if (!cancelled) setEditJobsLoading(false) })
          } else {
            setEditJobsForCandidate([])
            // jobPosition is an ObjectId — try to match against all-jobs list
            const pos = (m?.jobPosition || '').trim()
            const matched = jobs.find((j) => (j.id ?? j._id) === pos)
            setEditSelectedJobId(matched ? (matched.id ?? matched._id ?? '') : '')
          }
        }
      })
      .catch((err: any) => {
        if (!cancelled) setEditError(err?.response?.data?.message || err?.message || 'Failed to load meeting')
      })
      .finally(() => {
        if (!cancelled) setEditLoading(false)
      })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMeetingId])

  const handleEditInterviewSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editMeetingId || !editMeeting) return
    setEditError(null)
    const form = e.target as HTMLFormElement
    const getVal = (id: string) => (form.querySelector(`#${id}`) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement)?.value?.trim() ?? ''
    const title = getVal('edit-meeting-title')
    const description = getVal('edit-description')
    const date = getVal('edit-date')
    const time = getVal('edit-time')
    const durationMinutes = parseInt(getVal('edit-duration') || '60', 10) || 60
    const jobId = getVal('edit-job')
    // Look up in candidate-specific list first (has ObjectId ids), then fall back to all-jobs
    const selectedJob =
      editJobsForCandidate.find((j) => (j.id ?? j._id) === jobId) ||
      jobs.find((j) => (j.id ?? j._id) === jobId)
    const jobPosition = jobId
      ? isMongoObjectIdString(jobId)
        ? jobId.trim()                        // store ObjectId — backend resolves to job
        : selectedJob?.title || jobId
      : editMeeting.jobPosition              // unchanged if recruiter didn't touch the field
    const interviewType = (form.querySelector('input[name="edit-type"]:checked') as HTMLInputElement)?.value || editMeeting.interviewType || 'Video'
    const notes = getVal('edit-notes')
    const status = getVal('edit-status') as 'scheduled' | 'ended' | 'cancelled' || editMeeting.status
    const candidateId = (form.querySelector('#edit-candidate') as HTMLSelectElement)?.value
    const recruiterId = (form.querySelector('#edit-recruiter') as HTMLSelectElement)?.value
    const candidate = candidateId ? candidates.find((c) => (c.id ?? c._id) === candidateId) : null
    const recruiter = recruiterId ? recruiters.find((r) => r.id === recruiterId) : null
    const scheduledAt = date && time ? buildScheduledAtFromForm(date, time) : editMeeting.scheduledAt
    const payload: UpdateMeetingPayload = {
      title: title || editMeeting.title,
      description: description || undefined,
      scheduledAt,
      durationMinutes,
      jobPosition: jobPosition || undefined,
      interviewType: interviewType === 'video' ? 'Video' : interviewType === 'in-person' ? 'In-Person' : 'Phone',
      candidate: candidate ? { id: candidate.id ?? candidate._id, name: candidate.fullName ?? '', email: candidate.email ?? '' } : editMeeting.candidate,
      recruiter: recruiter ? { id: recruiter.id, name: recruiter.name ?? '', email: recruiter.email ?? '' } : editMeeting.recruiter,
      notes: notes || undefined,
      status,
    }
    setEditSaving(true)
    try {
      await updateMeeting(editMeetingId, payload)
      await fetchMeetings()
      closeEditModal()
    } catch (err: any) {
      setEditError(err?.response?.data?.message || err?.message || 'Failed to update meeting')
    } finally {
      setEditSaving(false)
    }
  }, [editMeetingId, editMeeting, editJobsForCandidate, jobs, candidates, recruiters, fetchMeetings, closeEditModal])

  const openResultModal = useCallback((row: InterviewTableRow) => {
    setResultModalInterview(row)
    setResultModalSelected(row.interviewResult || 'pending')
    ;(window as any).HSOverlay?.open(document.querySelector('#interview-result-modal'))
  }, [])

  const closeResultModal = useCallback(() => {
    setResultModalInterview(null)
    setResultModalSelected('pending')
    ;(window as any).HSOverlay?.close(document.querySelector('#interview-result-modal'))
  }, [])

  const handleSaveInterviewResult = useCallback(async () => {
    if (!resultModalInterview || !resultModalInterview.id) return
    setResultUpdating(true)
    try {
      const updated = await updateMeeting(resultModalInterview.id, { interviewResult: resultModalSelected })
      await fetchMeetings()
      closeResultModal()
      if (resultModalSelected === 'selected' && updated.moveToPreboardingError) {
        alert(
          `Interview marked as Selected, but moving to Offers & placement did not complete:\n\n${updated.moveToPreboardingError}\n\nYou can retry with the row action "Re-trigger offer & placement" after fixing the issue above.`
        )
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to update result')
    } finally {
      setResultUpdating(false)
    }
  }, [resultModalInterview, resultModalSelected, fetchMeetings, closeResultModal])

  const handleCancelMeeting = useCallback(async (row: InterviewTableRow) => {
    if (!row.id) return
    if (!confirm(`Cancel this interview for ${row.candidate?.name || 'candidate'}? The join link will be disabled.`)) return
    try {
      await updateMeeting(row.id, { status: 'cancelled' })
      await fetchMeetings()
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to cancel meeting')
    }
  }, [fetchMeetings])

  useEffect(() => {
    fetchMeetings()
  }, [fetchMeetings])

  // Fetch recordings when View recordings modal is opened
  useEffect(() => {
    if (!recordingsModalMeetingId) return
    let cancelled = false
    setRecordingsLoading(true)
    setRecordingsError(null)
    getMeetingRecordings(recordingsModalMeetingId)
      .then((list) => {
        if (!cancelled) {
          setRecordingsList(list)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setRecordingsList([])
          setRecordingsError(err?.response?.data?.message || err?.message || 'Failed to load recordings')
        }
      })
      .finally(() => {
        if (!cancelled) setRecordingsLoading(false)
      })
    return () => { cancelled = true }
  }, [recordingsModalMeetingId])

  useEffect(() => {
    if (!permissionsLoaded) return
    void loadScheduleDropdowns()
  }, [permissionsLoaded, loadScheduleDropdowns])

  // Default interview host = signed-in (or impersonated) user so "Schedule" isn't blocked by empty host row.
  useEffect(() => {
    setHosts((prev) => {
      if (prev.some((h) => h.email.trim())) return prev
      return defaultScheduleHosts.map((h) => ({ ...h }))
    })
  }, [defaultScheduleHosts])

  useEffect(() => {
    if (!formError) return
    requestAnimationFrame(() => {
      const footer = document.getElementById('schedule-interview-footer-error')
      const top = document.getElementById('schedule-interview-form-error')
      ;(footer ?? top)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }, [formError])

  useEffect(() => {
    if (!isExcelMenuOpen) return
    const handleOutsideClick = (event: MouseEvent) => {
      if (!excelDropdownRef.current?.contains(event.target as Node)) {
        setIsExcelMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [isExcelMenuOpen])

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

  const [interviewFormResetKey, setInterviewFormResetKey] = useState(0)
  const resetCreateMeetingForm = useCallback(() => {
    setCreatedMeeting(null)
    setFormError(null)
    setScheduledInterviewAt(null)
    setHosts(defaultScheduleHosts.map((h) => ({ ...h })))
    setEmailInvites([''])
    setInterviewFormResetKey((k) => k + 1)
  }, [defaultScheduleHosts])

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  const handleScheduleInterviewSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    const validHosts = hosts.filter((h) => h.email.trim())
    if (validHosts.length === 0) {
      setFormError('At least one host with email is required')
      return
    }
    const invalidHost = validHosts.find((h) => !isValidEmail(h.email))
    if (invalidHost) {
      setFormError(`Please enter a valid email for each host (e.g. name@gmail.com). "${invalidHost.email}" is incomplete or invalid.`)
      return
    }
    const form = e.target as HTMLFormElement
    const getVal = (id: string) => (form.querySelector(`#${id}`) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement)?.value?.trim() ?? ''
    const jobId = getVal('schedule-job')
    const jobSelect = form.querySelector('#schedule-job') as HTMLSelectElement | null
    const jobOptionText = jobSelect?.selectedOptions?.[0]?.text?.trim() ?? ''
    const selectedJob =
      jobs.find((j) => (j.id ?? j._id) === jobId) ||
      (jobId && jobOptionText ? ({ title: jobOptionText } as Job) : undefined)
    const title = getVal('schedule-meeting-title') || selectedJob?.title || 'Interview'
    const description = getVal('schedule-description')
    const date = getVal('schedule-date')
    const time = getVal('schedule-time')
    if (!date || !time) {
      setFormError('Please select both date and time for the interview.')
      return
    }
    const durationMinutes = parseInt(getVal('schedule-duration') || '60', 10) || 60
    const maxParticipants = parseInt(getVal('schedule-max-participants') || '10', 10) || 10
    const allowGuestJoin = (form.querySelector('#schedule-allow-guest') as HTMLInputElement)?.checked ?? true
    const requireApproval = (form.querySelector('#schedule-require-approval') as HTMLInputElement)?.checked ?? false
    const candidateSelect = form.querySelector('#schedule-candidate') as HTMLSelectElement
    if (candidateSelect?.value && !jobId) {
      setFormError('Select a job this candidate has applied for.')
      return
    }
    const jobPosition =
      isMongoObjectIdString(jobId)
        ? jobId.trim()
        : (selectedJob?.title || jobOptionText || jobId || undefined)
    const interviewType = (form.querySelector('input[name="schedule-type"]:checked') as HTMLInputElement)?.value || 'Video'
    const notes = getVal('schedule-notes')
    const candidateOption = candidateSelect?.selectedOptions?.[0]
    const candidateText = candidateOption?.text?.trim() ?? ''
    const candidateMatch = candidateText.match(/^(.+?)\s*-\s*(.+)$/)
    const recruiterSelect = form.querySelector('#schedule-recruiter') as HTMLSelectElement
    const recruiterOption = recruiterSelect?.selectedOptions?.[0]
    const recruiterText = recruiterOption?.text?.trim() ?? ''
    const recruiterMatch = recruiterText.match(/^(.+?)\s*-\s*(.+)$/)
    const scheduledAt = buildScheduledAtFromForm(date, time)
    const payload: CreateMeetingPayload = {
      title,
      description: description || undefined,
      scheduledAt,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Calcutta',
      durationMinutes,
      maxParticipants,
      allowGuestJoin,
      requireApproval,
      hosts: validHosts.map((h) => ({ nameOrRole: (h.nameOrRole ?? '').trim(), email: h.email.trim() })),
      emailInvites: emailInvites.filter((em) => em.trim()).map((em) => em.trim()),
      jobPosition: jobPosition || undefined,
      interviewType: interviewType === 'video' ? 'Video' : interviewType === 'in-person' ? 'In-Person' : 'Phone',
      candidate: candidateOption?.value ? { id: candidateOption.value, name: (candidateMatch?.[1] ?? candidateText).trim(), email: (candidateMatch?.[2] ?? '').trim() } : undefined,
      recruiter: recruiterOption?.value ? { id: recruiterOption.value, name: (recruiterMatch?.[1] ?? recruiterText).trim(), email: (recruiterMatch?.[2] ?? '').trim() } : undefined,
      notes: notes || undefined,
    }
    setFormLoading(true)
    try {
      const meeting = await createMeeting(payload)
      setCreatedMeeting(meeting)
      fetchMeetings()
    } catch (err: any) {
      setFormError(err?.response?.data?.message || err?.message || 'Failed to create meeting')
    } finally {
      setFormLoading(false)
    }
  }, [hosts, emailInvites, jobs, fetchMeetings])

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
        Header: 'Employee',
        accessor: 'candidate',
        Cell: ({ row }: any) => {
          const candidate = row.original.candidate
          const initials = (candidate?.name || '—').trim().split(/\s+/).map((s: string) => s[0]).join('').toUpperCase().slice(0, 2) || '?'
          return (
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 relative w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary font-semibold text-sm overflow-hidden">
                <span className="z-0">{initials}</span>
                {candidate?.displayPicture && (
                  <img
                    src={candidate.displayPicture}
                    alt={candidate.name}
                    className="absolute inset-0 w-full h-full object-cover z-10"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-800 dark:text-white truncate">
                  {candidate?.name ?? '—'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  <div className="flex items-center gap-1">
                    <i className="ri-mail-line"></i>
                    {candidate?.email ?? '—'}
                  </div>
                  {candidate?.phone && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <i className="ri-phone-line"></i>
                      {candidate.phone}
                    </div>
                  )}
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
          const initials = (recruiter?.name || '—').trim().split(/\s+/).map((s: string) => s[0]).join('').toUpperCase().slice(0, 2) || '?'
          return (
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 relative w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary font-semibold text-sm overflow-hidden">
                <span className="z-0">{initials}</span>
                {recruiter?.displayPicture && (
                  <img
                    src={recruiter.displayPicture}
                    alt={recruiter.name}
                    className="absolute inset-0 w-full h-full object-cover z-10"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-800 dark:text-white truncate">
                  {recruiter?.name ?? '—'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  <div className="flex items-center gap-1">
                    <i className="ri-mail-line"></i>
                    {recruiter?.email ?? '—'}
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
          const raw = (interview.status || '').toLowerCase()
          const statusConfig: Record<string, { label: string; className: string }> = {
            scheduled: { label: 'Scheduled', className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' },
            'in progress': { label: 'In Progress', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' },
            inprogress: { label: 'In Progress', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' },
            ended: { label: 'Completed', className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
            completed: { label: 'Completed', className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
            cancelled: { label: 'Cancelled', className: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30' },
            rescheduled: { label: 'Rescheduled', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' },
          }
          const config = statusConfig[raw] || { label: interview.status || 'Scheduled', className: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/30' }
          return (
            <div className="text-sm">
              <span className={`inline-flex items-center border px-2 py-1 rounded-md text-xs font-medium ${config.className}`}>
                {config.label}
              </span>
            </div>
          )
        },
      },
      {
        Header: 'Result',
        accessor: 'interviewResult',
        Cell: ({ row }: any) => {
          const interview = row.original
          const resultColors: Record<string, string> = {
            pending: 'bg-gray/10 text-gray border-gray/30',
            selected: 'bg-success/10 text-success border-success/30',
            rejected: 'bg-danger/10 text-danger border-danger/30',
          }
          const label =
            interview.interviewResult === 'selected'
              ? 'Selected'
              : interview.interviewResult === 'rejected'
                ? 'Rejected'
                : 'Pending'
          return (
            <div className="text-sm">
              <span
                className={`badge ${resultColors[interview.interviewResult] || resultColors.pending} border px-2 py-1 rounded-md text-xs font-medium`}
              >
                {label}
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
                className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-success"
                title="View recordings"
                onClick={() => {
                  setRecordingsModalMeetingId(row.original.id)
                  ;(window as any).HSOverlay?.open(document.querySelector('#view-recordings-modal'))
                }}
              >
                <i className="ri-video-line"></i>
                <span
                  className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700"
                  role="tooltip">
                  View recordings
                </span>
              </button>
            </div>
            {row.original.status?.toLowerCase() !== 'cancelled' && (
              <div className="hs-tooltip ti-main-tooltip">
                <button
                  type="button"
                  className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-light"
                  title="Copy interview link"
                  onClick={() => copyInterviewLink(row.original)}
                >
                  {copiedLinkId === row.original.id ? (
                    <i className="ri-check-line text-success"></i>
                  ) : (
                    <i className="ri-links-line"></i>
                  )}
                  <span
                    className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700"
                    role="tooltip">
                    {copiedLinkId === row.original.id ? 'Copied!' : 'Copy link'}
                  </span>
                </button>
              </div>
            )}
            {/* Show "Set result" for ended interviews OR to re-trigger a stuck selected interview */}
            {(row.original.status?.toLowerCase() === 'ended' || row.original.interviewResult === 'selected') && (
              <div className="hs-tooltip ti-main-tooltip">
                <button
                  type="button"
                  className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-primary"
                  title={row.original.interviewResult === 'selected' ? 'Re-trigger offer & placement' : 'Set interview result'}
                  onClick={() => openResultModal(row.original)}
                >
                  <i className="ri-checkbox-circle-line"></i>
                  <span
                    className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700"
                    role="tooltip">
                    {row.original.interviewResult === 'selected' ? 'Re-trigger offer & placement' : 'Set result'}
                  </span>
                </button>
              </div>
            )}
            <div className="hs-tooltip ti-main-tooltip">
              <button
                type="button"
                className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-info"
                title="Edit Interview"
                onClick={() => openEditModal(row.original.id)}
              >
                <i className="ri-pencil-line"></i>
                <span
                  className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700"
                  role="tooltip">
                  Edit Interview
                </span>
              </button>
            </div>
            {row.original.status?.toLowerCase() !== 'cancelled' && (
              <div className="hs-tooltip ti-main-tooltip">
                <button
                  type="button"
                  className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-danger"
                  title="Cancel Interview"
                  onClick={() => handleCancelMeeting(row.original)}
                >
                  <i className="ri-close-circle-line"></i>
                  <span
                    className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700"
                    role="tooltip">
                    Cancel Interview
                  </span>
                </button>
              </div>
            )}
          </div>
        ),
      },
    ],
    [
      selectedRows,
      openResultModal,
      copyInterviewLink,
      copiedLinkId,
      openEditModal,
      handleCancelMeeting,
    ]
  )

  // Map API meetings to table rows
  const tableData = useMemo<InterviewTableRow[]>(() => {
    return meetings.map(meetingToTableRow)
  }, [meetings])

  // Filter data based on filter state
  const filteredData = useMemo(() => {
    return tableData.filter((interview) => {
      if (filters.candidate.length > 0 && !filters.candidate.some(candidateName =>
        interview.candidate.name.toLowerCase().includes(candidateName.toLowerCase())
      )) return false
      if (filters.recruiter.length > 0 && !filters.recruiter.some(recruiterName =>
        interview.recruiter.name.toLowerCase().includes(recruiterName.toLowerCase())
      )) return false
      if (filters.status.length > 0 && !filters.status.includes(interview.status)) return false
      if (filters.type.length > 0 && !filters.type.includes(interview.type)) return false
      return true
    })
  }, [tableData, filters])

  const data = useMemo(() => filteredData, [filteredData])

  // Week view: 7 days from weekStart, interviews grouped by date
  const weekDays = useMemo(() => {
    const days: { date: Date; key: string; label: string }[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart)
      d.setDate(weekStart.getDate() + i)
      days.push({
        date: d,
        key: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      })
    }
    return days
  }, [weekStart])

  const interviewsByDay = useMemo(() => {
    const map: Record<string, InterviewTableRow[]> = {}
    weekDays.forEach((day) => { map[day.key] = [] })
    data.forEach((row) => {
      const key = row.date
      if (map[key]) map[key].push(row)
    })
    return map
  }, [data, weekDays])

  // Get unique values for dropdown filters (from real data)
  const allCandidates = useMemo(() => {
    return [...new Set(tableData.map((i) => i.candidate.name).filter(Boolean))].filter((n) => n !== '—').sort()
  }, [tableData])

  const allRecruiters = useMemo(() => {
    return [...new Set(tableData.map((i) => i.recruiter.name).filter(Boolean))].filter((n) => n !== '—').sort()
  }, [tableData])

  const allStatuses = useMemo(() => {
    return [...new Set(tableData.map((i) => i.status).filter(Boolean))].sort()
  }, [tableData])

  const allTypes = useMemo(() => {
    return [...new Set(tableData.map((i) => i.type).filter(Boolean))].sort()
  }, [tableData])

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
      <Seo title="Interviews" />

      <div className="mt-5 grid grid-cols-12 gap-6 min-h-[calc(100vh-8rem)] sm:mt-6">
        <div className="xl:col-span-12 col-span-12 h-full flex flex-col">
          <div className="box custom-box h-full flex flex-col overflow-hidden border border-defaultborder/70 dark:border-defaultborder/20 shadow-sm">
            <div className="box-header relative z-20 flex items-center justify-between flex-wrap gap-3 border-b border-defaultborder/70 dark:border-defaultborder/20 bg-gradient-to-b from-gray-50/90 via-white to-white px-4 py-3.5 dark:from-black/25 dark:via-black/15 dark:to-black/10">
              <div className="box-title">
                Interviews
                <span className="badge bg-light text-default rounded-full ms-1 text-[0.75rem] align-middle">
                  {filteredData.length}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="form-control !w-auto !py-1.5 !px-3 !text-[0.75rem]"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                >
                  {[10, 25, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      Show {size}
                    </option>
                  ))}
                </select>
                <div className="hs-dropdown ti-dropdown">
                  <button
                    type="button"
                    className="ti-btn ti-btn-light !py-1.5 !px-2.5 !text-[0.75rem] ti-dropdown-toggle"
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
                <div className="flex items-center rounded-lg border border-defaultborder dark:border-defaultborder/20 p-0.5 bg-white dark:bg-black/10">
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={`ti-btn !py-1.5 !px-2.5 !text-[0.75rem] rounded-md ${viewMode === 'table' ? 'ti-btn-primary' : 'ti-btn-light'}`}
                  >
                    <i className="ri-list-check-2 align-middle me-1"></i>Table
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('week')}
                    className={`ti-btn !py-1.5 !px-2.5 !text-[0.75rem] rounded-md ${viewMode === 'week' ? 'ti-btn-primary' : 'ti-btn-light'}`}
                  >
                    <i className="ri-calendar-schedule-line align-middle me-1"></i>Week
                  </button>
                </div>
                <button
                  type="button"
                  className="ti-btn ti-btn-primary-full !py-1.5 !px-2.5 !text-[0.75rem]"
                  onClick={() => openScheduleInterviewModal()}
                >
                  <i className="ri-add-line font-semibold align-middle"></i>
                  Schedule Interview
                </button>
                {/* Excel menu is fully React-controlled — avoid Preline hs-dropdown / ti-dropdown-toggle hooks (they race our state). */}
                <div ref={excelDropdownRef} className="relative">
                  <button
                    type="button"
                    className="ti-btn ti-btn-primary !py-1.5 !px-2.5 !text-[0.75rem]"
                    id="excel-dropdown-button"
                    aria-haspopup="menu"
                    aria-expanded={isExcelMenuOpen}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setIsExcelMenuOpen((prev) => !prev)
                    }}
                  >
                    <i className="ri-file-excel-2-line font-semibold align-middle me-1"></i>Excel
                    <i className="ri-arrow-down-s-line align-middle ms-1 inline-block"></i>
                  </button>
                  {isExcelMenuOpen && (
                    <ul
                      className="absolute end-0 top-full z-50 mt-1 min-w-[10rem] rounded-lg border border-defaultborder dark:border-defaultborder/20 bg-white py-1 shadow-lg dark:bg-bodybg"
                      role="menu"
                      aria-labelledby="excel-dropdown-button"
                    >
                      <li role="none">
                        <button
                          type="button"
                          className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left"
                          role="menuitem"
                          onClick={() => setIsExcelMenuOpen(false)}
                        >
                          <i className="ri-upload-2-line me-2 align-middle inline-block"></i>Import
                        </button>
                      </li>
                      <li role="none">
                        <button
                          type="button"
                          className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left"
                          role="menuitem"
                          onClick={() => setIsExcelMenuOpen(false)}
                        >
                          <i className="ri-file-excel-2-line me-2 align-middle inline-block"></i>Export
                        </button>
                      </li>
                      <li role="none">
                        <button
                          type="button"
                          className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left"
                          role="menuitem"
                          onClick={() => setIsExcelMenuOpen(false)}
                        >
                          <i className="ri-download-line me-2 align-middle inline-block"></i>Template
                        </button>
                      </li>
                    </ul>
                  )}
                </div>
                <button
                  type="button"
                  className="ti-btn ti-btn-light !py-1.5 !px-2.5 !text-[0.75rem]"
                  onClick={() => openHsOverlay('#interviews-filter-panel')}
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
                  className="ti-btn ti-btn-danger !py-1.5 !px-2.5 !text-[0.75rem]"
                >
                  <i className="ri-delete-bin-line font-semibold align-middle me-1"></i>Delete
                </button>
              </div>
            </div>
            <div className="box-body relative z-0 !p-0 flex-1 flex flex-col overflow-hidden bg-gradient-to-b from-white to-gray-50/40 dark:from-bodybg dark:to-black/20">
              {meetingsLoading ? (
                <div className="flex-1 px-4 py-4">
                  <div className="rounded-xl border border-defaultborder/70 dark:border-defaultborder/20 bg-white/90 dark:bg-black/20 p-4 sm:p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="h-4 w-40 rounded bg-gray-200/80 dark:bg-white/10 animate-pulse" />
                      <div className="h-4 w-24 rounded bg-gray-200/70 dark:bg-white/10 animate-pulse" />
                    </div>
                    <div className="space-y-2">
                      {Array.from({ length: 6 }).map((_, idx) => (
                        <div
                          key={`meeting-skeleton-${idx}`}
                          className="grid grid-cols-12 gap-3 rounded-lg border border-defaultborder/50 dark:border-defaultborder/10 px-3 py-3 bg-gray-50/70 dark:bg-white/[0.03] animate-pulse"
                        >
                          <div className="col-span-3 h-3.5 rounded bg-gray-200/80 dark:bg-white/10" />
                          <div className="col-span-3 h-3.5 rounded bg-gray-200/70 dark:bg-white/10" />
                          <div className="col-span-2 h-3.5 rounded bg-gray-200/70 dark:bg-white/10" />
                          <div className="col-span-2 h-3.5 rounded bg-gray-200/70 dark:bg-white/10" />
                          <div className="col-span-2 h-3.5 rounded bg-gray-200/70 dark:bg-white/10" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : meetingsError ? (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <p className="text-sm text-danger mb-3">{meetingsError}</p>
                  <button
                    type="button"
                    className="ti-btn ti-btn-primary !py-2 !px-4 !text-sm"
                    onClick={() => fetchMeetings()}
                  >
                    Try again
                  </button>
                </div>
              ) : viewMode === 'week' ? (
              <div className="flex-1 overflow-y-auto p-4" style={{ minHeight: 0 }}>
                <div className="flex items-center justify-between mb-4">
                  <button
                    type="button"
                    onClick={() => setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })}
                    className="ti-btn ti-btn-light !py-1.5 !px-3 !text-sm"
                  >
                    <i className="ri-arrow-left-s-line"></i> Previous week
                  </button>
                  <span className="text-sm font-medium text-defaulttextcolor dark:text-white">
                    {weekDays[0]?.date.toLocaleDateString('en-US', { month: 'short' })} {weekDays[0]?.date.getDate()} – {weekDays[6]?.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <button
                    type="button"
                    onClick={() => setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })}
                    className="ti-btn ti-btn-light !py-1.5 !px-3 !text-sm"
                  >
                    Next week <i className="ri-arrow-right-s-line"></i>
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-3 min-w-[800px]">
                  {weekDays.map((day) => (
                    <div key={day.key} className="flex flex-col rounded-xl border border-defaultborder dark:border-defaultborder/20 bg-gray-50/50 dark:bg-black/20 overflow-hidden">
                      <div className="px-3 py-2 border-b border-defaultborder dark:border-defaultborder/20 bg-primary/5 dark:bg-primary/10">
                        <p className="text-xs font-semibold text-defaulttextcolor dark:text-white">{day.label}</p>
                      </div>
                      <div className="flex-1 p-2 space-y-2 min-h-[120px]">
                        {(interviewsByDay[day.key] || []).map((interview) => (
                          <div
                            key={interview.id}
                            className="p-2 rounded-lg border border-defaultborder/50 dark:border-defaultborder/10 bg-white dark:bg-white/5 text-defaulttextcolor dark:text-white"
                          >
                            <p className="font-medium text-sm truncate">{interview.position}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{interview.candidate.name}</p>
                            <p className="text-xs text-primary mt-1">{interview.time}</p>
                            <span className={`inline-flex items-center border px-1.5 py-0.5 rounded text-[0.65rem] font-medium mt-1 ${
                              (interview.status || '').toLowerCase() === 'scheduled' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' :
                              (interview.status || '').toLowerCase() === 'ended' || (interview.status || '').toLowerCase() === 'completed' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' :
                              (interview.status || '').toLowerCase() === 'cancelled' ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30' :
                              'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/30'
                            }`}>
                              {interview.status || 'Scheduled'}
                            </span>
                            <div className="flex gap-1 mt-2">
                              <button
                                type="button"
                                className="ti-btn ti-btn-sm ti-btn-primary !py-0.5 !px-1.5 !text-[0.65rem]"
                                onClick={() => { setRecordingsModalMeetingId(interview.id); (window as any).HSOverlay?.open(document.querySelector('#view-recordings-modal')) }}
                              >
                                <i className="ri-video-line"></i>
                              </button>
                              <button
                                type="button"
                                className="ti-btn ti-btn-sm ti-btn-light !py-0.5 !px-1.5 !text-[0.65rem]"
                                onClick={() => copyInterviewLink(interview)}
                              >
                                <i className="ri-links-line"></i>
                              </button>
                              <button
                                type="button"
                                className="ti-btn ti-btn-sm ti-btn-info !py-0.5 !px-1.5 !text-[0.65rem]"
                                onClick={() => openEditModal(interview.id)}
                              >
                                <i className="ri-pencil-line"></i>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              ) : filteredData.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-xl rounded-2xl border border-defaultborder/70 dark:border-defaultborder/20 bg-white/95 dark:bg-black/20 p-8 text-center shadow-sm">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <i className="ri-calendar-event-line text-2xl" />
                  </div>
                  <h3 className="text-lg font-semibold text-defaulttextcolor dark:text-white">No interviews found</h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Try changing your filters, or create an instant interview to get started.
                  </p>
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      className="ti-btn ti-btn-light !py-2 !px-4 !text-sm"
                      onClick={handleResetFilters}
                    >
                      <i className="ri-refresh-line me-1.5"></i>Reset filters
                    </button>
                    <button
                      type="button"
                      className="ti-btn ti-btn-primary !py-2 !px-4 !text-sm"
                      onClick={() => openScheduleInterviewModal()}
                    >
                      <i className="ri-add-line me-1.5"></i>Schedule interview
                    </button>
                  </div>
                </div>
              </div>
              ) : (
              <div className="table-responsive flex-1 overflow-y-auto px-4 pb-4" style={{ minHeight: 0 }}>
                <div className="overflow-hidden rounded-xl border border-defaultborder/70 dark:border-defaultborder/20 bg-white/95 dark:bg-black/20 shadow-sm">
                <table {...getTableProps()} className="table whitespace-nowrap min-w-full table-striped table-hover table-bordered border-gray-300 dark:border-gray-600">
                  <thead>
                    {headerGroups.map((headerGroup: any, i: number) => (
                      <tr {...headerGroup.getHeaderGroupProps()} className="bg-primary/10 dark:bg-primary/20 border-b border-gray-300 dark:border-gray-600" key={`header-group-${i}`}>
                        {headerGroup.headers.map((column: any, i: number) => (
                          <th
                            {...column.getHeaderProps(column.getSortByToggleProps())}
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
                    {page.map((row: any, i: number) => {
                      prepareRow(row)
                      return (
                        <tr {...row.getRowProps()} className="border-b border-gray-300 dark:border-gray-600" key={row.id || `row-${i}`}>
                          {row.cells.map((cell: any, i: number) => {
                            return (
                              <td {...cell.getCellProps()} key={cell.column.id || `cell-${i}`}>
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
              )}
            </div>
            {!meetingsLoading && !meetingsError && viewMode === 'table' && (
            <div className="box-footer border-t border-defaultborder/70 dark:border-defaultborder/20 bg-gray-50/90 dark:bg-black/25 px-4 py-3">
              <div className="flex items-center flex-wrap gap-3">
                <div className="text-sm text-defaulttextcolor/80 dark:text-white/70">
                  Showing {data.length === 0 ? 0 : pageIndex * pageSize + 1} to {Math.min((pageIndex + 1) * pageSize, data.length)} of {data.length} entries{' '}
                  <i className="bi bi-arrow-right ms-2 font-semibold"></i>
                </div>
                <div className="ms-auto">
                  <nav aria-label="Page navigation" className="w-full">
                    <div className="m-0 inline-flex flex-nowrap items-center gap-1 rounded-lg border border-defaultborder/70 bg-white p-1 shadow-sm dark:border-defaultborder/20 dark:bg-black/20">
                      <span className={`${!canPreviousPage ? 'opacity-50' : ''}`}>
                        <button
                          className="inline-flex min-w-[2.25rem] items-center justify-center rounded-md px-2.5 py-1.5 text-xs font-medium text-defaulttextcolor transition-colors hover:bg-gray-100 disabled:cursor-not-allowed dark:text-white/80 dark:hover:bg-white/10"
                          onClick={() => previousPage()}
                          disabled={!canPreviousPage}
                        >
                          Prev
                        </button>
                      </span>
                      {pageOptions.length <= 7 ? (
                        // Show all pages if 7 or fewer
                        pageOptions.map((page: number) => (
                          <span key={page}>
                            <button
                              className={`inline-flex min-w-[2rem] items-center justify-center rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                                pageIndex === page
                                  ? 'bg-primary text-white shadow-sm'
                                  : 'text-defaulttextcolor hover:bg-gray-100 dark:text-white/80 dark:hover:bg-white/10'
                              }`}
                              onClick={() => gotoPage(page)}
                            >
                              {page + 1}
                            </button>
                          </span>
                        ))
                      ) : (
                        // Show smart pagination for more pages
                        <>
                          {pageIndex > 2 && (
                            <>
                              <span>
                                <button
                                  className="inline-flex min-w-[2rem] items-center justify-center rounded-md px-2.5 py-1.5 text-xs font-semibold text-defaulttextcolor transition-colors hover:bg-gray-100 dark:text-white/80 dark:hover:bg-white/10"
                                  onClick={() => gotoPage(0)}
                                >
                                  1
                                </button>
                              </span>
                              {pageIndex > 3 && (
                                <span className="opacity-60">
                                  <span className="inline-flex min-w-[2rem] items-center justify-center rounded-md px-2 py-1.5 text-xs">...</span>
                                </span>
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
                              <span key={pageNum}>
                                <button
                                  className={`inline-flex min-w-[2rem] items-center justify-center rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                                    pageIndex === pageNum
                                      ? 'bg-primary text-white shadow-sm'
                                      : 'text-defaulttextcolor hover:bg-gray-100 dark:text-white/80 dark:hover:bg-white/10'
                                  }`}
                                  onClick={() => gotoPage(pageNum)}
                                >
                                  {pageNum + 1}
                                </button>
                              </span>
                            )
                          })}
                          {pageIndex < pageCount - 3 && (
                            <>
                              {pageIndex < pageCount - 4 && (
                                <span className="opacity-60">
                                  <span className="inline-flex min-w-[2rem] items-center justify-center rounded-md px-2 py-1.5 text-xs">...</span>
                                </span>
                              )}
                              <span>
                                <button
                                  className="inline-flex min-w-[2rem] items-center justify-center rounded-md px-2.5 py-1.5 text-xs font-semibold text-defaulttextcolor transition-colors hover:bg-gray-100 dark:text-white/80 dark:hover:bg-white/10"
                                  onClick={() => gotoPage(pageCount - 1)}
                                >
                                  {pageCount}
                                </button>
                              </span>
                            </>
                          )}
                        </>
                      )}
                      <span className={`${!canNextPage ? 'opacity-50' : ''}`}>
                        <button
                          className="inline-flex min-w-[2.25rem] items-center justify-center rounded-md px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed"
                          onClick={() => nextPage()}
                          disabled={!canNextPage}
                        >
                          Next
                        </button>
                      </span>
                    </div>
                  </nav>
                </div>
              </div>
            </div>
            )}
          </div>
        </div>
      </div>

      {/* Schedule Interview Modal */}
      <CreateInterviewModal
        createdMeeting={createdMeeting}
        resetCreateMeetingForm={resetCreateMeetingForm}
        formError={formError}
        formLoading={formLoading}
        onSubmit={handleScheduleInterviewSubmit}
        dropdownsLoading={dropdownsLoading}
        formResetKey={interviewFormResetKey}
        candidates={candidates}
        recruiters={recruiters}
        hosts={hosts}
        setHosts={setHosts}
        emailInvites={emailInvites}
        setEmailInvites={setEmailInvites}
        scheduledInterviewAt={scheduledInterviewAt}
        onScheduledInterviewAtChange={setScheduledInterviewAt}
      />

      {/* View recordings modal */}
      <RecordingsModal
        recordingsLoading={recordingsLoading}
        recordingsError={recordingsError}
        recordingsList={recordingsList}
        onClose={() => setRecordingsModalMeetingId(null)}
      />

      {/* Interview result modal */}
      <div
        id="interview-result-modal"
        className="hs-overlay hidden ti-modal !z-[105]"
        tabIndex={-1}
        aria-labelledby="interview-result-modal-label"
        aria-hidden="true"
      >
        <div className="hs-overlay-open:mt-7 ti-modal-box mt-0 ease-out transition-all sm:max-w-md">
          <div className="ti-modal-content border border-defaultborder dark:border-defaultborder/10 rounded-xl shadow-xl overflow-hidden">
            <div className="ti-modal-header bg-gray-50 dark:bg-black/20 border-b border-defaultborder dark:border-defaultborder/10 px-6 py-4">
              <h3 id="interview-result-modal-label" className="ti-modal-title text-lg font-semibold text-defaulttextcolor dark:text-white flex items-center gap-2">
                <i className="ri-checkbox-circle-line text-primary"></i>
                Interview result
              </h3>
              <button
                type="button"
                className="ti-modal-close-btn hs-dropdown-toggle flex-shrink-0 p-0 transition-none text-gray-500 hover:text-gray-700 dark:hover:text-white/80 rounded-md hover:bg-gray-100 dark:hover:bg-black/40 focus:ring-2 focus:ring-primary/20 focus:ring-offset-0"
                data-hs-overlay="#interview-result-modal"
                onClick={closeResultModal}
                aria-label="Close"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            <div className="ti-modal-body px-6 py-5">
              {resultModalInterview && (
                <>
                  <div className="mb-4">
                    <p className="text-sm text-defaulttextcolor/70 dark:text-white/70 mb-0.5">Interview</p>
                    <p className="font-medium text-defaulttextcolor dark:text-white">{resultModalInterview.position}</p>
                    <p className="text-xs text-defaulttextcolor/60 dark:text-white/60 mt-1">
                      Candidate: {resultModalInterview.candidate.name}
                    </p>
                  </div>
                  <div>
                    <p className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-2">
                      Current status
                    </p>
                    <div className="flex flex-col gap-2">
                      {(['pending', 'selected', 'rejected'] as const).map((value) => (
                        <label
                          key={value}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            resultModalSelected === value
                              ? 'border-primary bg-primary/5 dark:bg-primary/10'
                              : 'border-defaultborder dark:border-defaultborder/10 hover:bg-gray-50 dark:hover:bg-black/20'
                          }`}
                        >
                          <input
                            type="radio"
                            name="interviewResult"
                            value={value}
                            checked={resultModalSelected === value}
                            onChange={() => setResultModalSelected(value)}
                            className="ti-form-radio"
                          />
                          <span className="capitalize font-medium text-defaulttextcolor dark:text-white">
                            {value === 'pending' ? 'Pending' : value === 'selected' ? 'Selected' : 'Rejected'}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="ti-modal-footer flex flex-wrap gap-2 justify-end px-6 py-4 bg-gray-50 dark:bg-black/20 border-t border-defaultborder dark:border-defaultborder/10">
              <button
                type="button"
                className="ti-btn ti-btn-light !py-2 !px-4 !text-sm font-medium"
                onClick={closeResultModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ti-btn ti-btn-primary !py-2 !px-4 !text-sm font-medium"
                disabled={resultUpdating}
                onClick={handleSaveInterviewResult}
              >
                {resultUpdating ? (
                  <>
                    <span className="animate-spin inline-block me-1.5 w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                    Updating...
                  </>
                ) : (
                  <>
                    <i className="ri-check-line me-1.5 align-middle"></i>
                    Update result
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Interview modal */}
      <div
        id="edit-interview-modal"
        className="hs-overlay hidden ti-modal size-lg !z-[105]"
        tabIndex={-1}
        aria-labelledby="edit-interview-modal-label"
        aria-hidden="true"
      >
        <div className="hs-overlay-open:mt-7 ti-modal-box mt-0 ease-out transition-all sm:max-w-2xl">
          <div className="ti-modal-content border border-defaultborder dark:border-defaultborder/10 rounded-xl shadow-xl overflow-hidden">
            <div className="ti-modal-header bg-gray-50 dark:bg-black/20 border-b border-defaultborder dark:border-defaultborder/10 px-6 py-4">
              <h3 id="edit-interview-modal-label" className="ti-modal-title text-lg font-semibold text-defaulttextcolor dark:text-white flex items-center gap-2">
                <i className="ri-pencil-line text-info"></i>
                Edit Interview
              </h3>
              <button
                type="button"
                className="ti-modal-close-btn hs-dropdown-toggle flex-shrink-0 p-0 transition-none text-gray-500 hover:text-gray-700 dark:hover:text-white/80 rounded-md hover:bg-gray-100 dark:hover:bg-black/40 focus:ring-2 focus:ring-primary/20 focus:ring-offset-0"
                data-hs-overlay="#edit-interview-modal"
                onClick={closeEditModal}
                aria-label="Close"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            <div className="ti-modal-body px-6 py-5">
              {editLoading && (
                <div className="flex items-center justify-center py-12 text-defaulttextcolor dark:text-white/70">
                  <span className="animate-spin inline-block me-2 w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></span>
                  Loading...
                </div>
              )}
              {!editLoading && editError && (
                <div className="py-4 px-4 rounded-lg bg-danger/10 text-danger text-sm">{editError}</div>
              )}
              {!editLoading && editMeeting && (
                <form onSubmit={handleEditInterviewSubmit} className="space-y-5 max-h-[calc(100vh-12rem)] overflow-y-auto">
                  {editError && <div className="p-3 rounded-lg bg-danger/10 text-danger text-sm">{editError}</div>}
                  <div>
                    <label htmlFor="edit-meeting-title" className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">Title <span className="text-danger">*</span></label>
                    <input type="text" id="edit-meeting-title" defaultValue={editMeeting.title} required className="form-control !py-2 !text-sm w-full border-defaultborder dark:border-defaultborder/10 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="e.g. Technical Interview" />
                  </div>
                  <div>
                    <label htmlFor="edit-description" className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">Description</label>
                    <textarea id="edit-description" rows={2} defaultValue={editMeeting.description ?? ''} className="form-control !py-2 !text-sm w-full border-defaultborder dark:border-defaultborder/10 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none" placeholder="Optional description" />
                  </div>
                  <div>
                    <label htmlFor="edit-job" className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">Job / Position</label>
                    <p className="text-xs text-textmuted dark:text-white/50 mb-1.5">
                      {editJobsForCandidate.length > 0
                        ? 'Shows jobs this candidate has applied to.'
                        : 'Select a candidate to filter by their applications.'}
                    </p>
                    <select
                      id="edit-job"
                      className="form-select !py-2 !text-sm w-full border-defaultborder dark:border-defaultborder/10 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      disabled={dropdownsLoading || editJobsLoading}
                      value={editSelectedJobId}
                      onChange={(e) => setEditSelectedJobId(e.target.value)}
                    >
                      <option value="">
                        {editJobsLoading
                          ? 'Loading applications...'
                          : editJobsForCandidate.length === 0
                            ? 'No applications found — select candidate first'
                            : 'Select a position'}
                      </option>
                      {editJobsForCandidate.map((j) => (
                        <option key={j.id ?? j._id} value={String(j.id ?? j._id)}>{j.title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="edit-date" className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">Date <span className="text-danger">*</span></label>
                      <input type="date" id="edit-date" defaultValue={editMeeting.scheduledAt?.slice(0, 10) ?? ''} className="form-control !py-2 !text-sm w-full border-defaultborder dark:border-defaultborder/10 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                    </div>
                    <div>
                      <label htmlFor="edit-time" className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">Time <span className="text-danger">*</span></label>
                      <input type="time" id="edit-time" defaultValue={editMeeting.scheduledAt?.slice(11, 16) ?? ''} className="form-control !py-2 !text-sm w-full border-defaultborder dark:border-defaultborder/10 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="edit-duration" className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">Duration (minutes) <span className="text-danger">*</span></label>
                    <input type="number" id="edit-duration" name="edit-duration" min={1} max={480} defaultValue={editMeeting.durationMinutes ?? 60} required className="form-control !py-2 !text-sm w-full border-defaultborder dark:border-defaultborder/10 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                  </div>
                  <div>
                    <label className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-2">Interview type</label>
                    <div className="flex flex-wrap gap-4">
                      {(['Video', 'In-Person', 'Phone'] as const).map((t) => (
                        <label key={t} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="edit-type" value={t.toLowerCase()} defaultChecked={(editMeeting.interviewType || 'Video') === t} className="form-check-input !w-4 !h-4 text-primary" />
                          <span className="text-sm text-defaulttextcolor dark:text-white">{t}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label htmlFor="edit-candidate" className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">Candidate <span className="text-xs font-normal text-textmuted dark:text-white/55">(referral leads)</span></label>
                    <select id="edit-candidate" className="form-select !py-2 !text-sm w-full border-defaultborder dark:border-defaultborder/10 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary" disabled={dropdownsLoading} defaultValue={editMeeting.candidate?.id ?? ''}>
                      <option value="">{dropdownsLoading ? 'Loading...' : 'Select referral lead'}</option>
                      {candidates.map((c) => (
                        <option key={c.id ?? c._id} value={c.id ?? c._id}>{c.fullName} - {c.email}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="edit-recruiter" className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">Recruiter</label>
                    <select id="edit-recruiter" className="form-select !py-2 !text-sm w-full border-defaultborder dark:border-defaultborder/10 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary" disabled={dropdownsLoading} defaultValue={editMeeting.recruiter?.id ?? ''}>
                      <option value="">{dropdownsLoading ? 'Loading...' : 'Select recruiter'}</option>
                      {recruiters.map((r) => (
                        <option key={r.id} value={r.id}>{r.name ?? r.email} - {r.email}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="edit-notes" className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">Notes</label>
                    <textarea id="edit-notes" rows={2} defaultValue={editMeeting.notes ?? ''} className="form-control !py-2 !text-sm w-full border-defaultborder dark:border-defaultborder/10 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none" placeholder="Optional notes" />
                  </div>
                  <div>
                    <label htmlFor="edit-status" className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">Status</label>
                    <select id="edit-status" className="form-select !py-2 !text-sm w-full border-defaultborder dark:border-defaultborder/10 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary" defaultValue={editMeeting.status ?? 'scheduled'}>
                      <option value="scheduled">Scheduled</option>
                      <option value="ended">Ended</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-end pt-4 border-t border-defaultborder dark:border-defaultborder/10">
                    <button type="button" className="ti-btn ti-btn-light !py-2 !px-4 !text-sm font-medium" onClick={closeEditModal}>Cancel</button>
                    <button type="submit" disabled={editSaving} className="ti-btn ti-btn-primary !py-2 !px-4 !text-sm font-medium">
                      {editSaving ? (<><span className="animate-spin inline-block me-1.5 w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span> Saving...</>) : (<><i className="ri-check-line me-1.5 align-middle"></i> Save changes</>)}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Panel Offcanvas */}
      <InterviewsFilterPanel
        filters={filters}
        searchCandidate={searchCandidate}
        setSearchCandidate={setSearchCandidate}
        searchRecruiter={searchRecruiter}
        setSearchRecruiter={setSearchRecruiter}
        searchStatus={searchStatus}
        setSearchStatus={setSearchStatus}
        searchType={searchType}
        setSearchType={setSearchType}
        allCandidates={allCandidates}
        allRecruiters={allRecruiters}
        allStatuses={allStatuses}
        allTypes={allTypes}
        filteredCandidates={filteredCandidates}
        filteredRecruiters={filteredRecruiters}
        filteredStatuses={filteredStatuses}
        filteredTypes={filteredTypes}
        handleMultiSelectChange={handleMultiSelectChange}
        handleRemoveFilter={handleRemoveFilter}
        handleResetFilters={handleResetFilters}
      />
    </Fragment>
  )
}
