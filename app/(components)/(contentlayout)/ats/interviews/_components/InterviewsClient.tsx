"use client"
import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment, useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/shared/contexts/auth-context'
import { useFeaturePermissions } from '@/shared/hooks/use-feature-permissions'
import { appendJoinIdentityToUrl } from '@/shared/lib/join-room-url'
import { useTable, useSortBy, useGlobalFilter, usePagination } from 'react-table'
import { createMeeting, listMeetings, getMeeting, getMeetingRecordings, updateMeeting, type Meeting, type CreateMeetingPayload, type MeetingRecording, type UpdateMeetingPayload } from '@/shared/lib/api/meetings'
import { listJobs, type Job } from '@/shared/lib/api/jobs'
import { type CandidateListItem } from '@/shared/lib/api/candidates'
import { listReferralLeads, type ReferralLeadRow } from '@/shared/lib/api/referralLeads'
import { listRecruiters } from '@/shared/lib/api/users'
import { getCandidateFilterAgents, type AgentOption } from '@/shared/lib/api/employees'
import { getJobApplicationById, type JobApplication } from '@/shared/lib/api/jobApplications'
import type { User } from '@/shared/lib/types'
import { isPublicEmail, pickPublicEmail } from '@/shared/lib/ats/applicant-email'
import { wallClockToUtc, formatDualZone, getViewerTimezone, utcInstantToWallClock, listTimezones, normalizeTimezone } from '@/shared/lib/timezone'
import CreateInterviewModal, { type SchedulePrefill } from './CreateInterviewModal'
import RecordingsModal from './RecordingsModal'
import InterviewsFilterPanel from './InterviewsFilterPanel'
import { detectOverlap } from './interviewOverlap'

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


/** Per-column visibility for lg+ table view (below lg uses card list). table-fixed + max-w-0 truncates cell content. */
const COLUMN_VISIBILITY: Record<string, string> = {
  checkbox: '!px-1 overflow-hidden',
  interviewInfo: 'max-w-0 overflow-hidden',
  candidate: 'max-w-0 overflow-hidden',
  recruiter: 'max-w-0 overflow-hidden',
  status: 'hidden lg:table-cell max-w-0 overflow-hidden text-center',
  interviewResult: 'hidden lg:table-cell max-w-0 overflow-hidden text-center',
  id: 'max-w-0 overflow-hidden text-center',
}

/** Full layout (2xl+): includes Employee + Agent columns */
const COLUMN_WIDTH_FULL: Record<string, string> = {
  checkbox: '3%',
  interviewInfo: '27%',
  candidate: '18%',
  recruiter: '16%',
  status: '10%',
  interviewResult: '10%',
  id: '16%',
}

/** Compact layout (lg–2xl): omit person columns so table-fixed does not reserve empty tracks */
const COLUMN_WIDTH_COMPACT: Record<string, string> = {
  checkbox: '3%',
  interviewInfo: '49%',
  status: '13%',
  interviewResult: '13%',
  id: '22%',
}

const CENTERED_TABLE_COLUMNS = new Set(['checkbox', 'status', 'interviewResult', 'id'])

function useMinWidth(minWidth: number): boolean {
  const [matches, setMatches] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${minWidth}px)`)
    const sync = () => setMatches(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [minWidth])
  return matches
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

/** Wall-clock defaults for the edit modal, derived from the meeting's stored timezone. */
function editScheduleDefaults(meeting: Meeting | null): { date: string; time: string; timezone: string } {
  if (!meeting?.scheduledAt) return { date: '', time: '', timezone: 'UTC' }
  const timezone = normalizeTimezone(meeting.timezone || 'UTC')
  const { date, time } = utcInstantToWallClock(meeting.scheduledAt, timezone)
  return { date, time, timezone }
}

function meetingToTableRow(m: Meeting, viewerTz?: string): InterviewTableRow {
  const date = formatMeetingDate(m.scheduledAt)
  const time = formatDualZone(m.scheduledAt, m.timezone || 'UTC', viewerTz)
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
  const { canView, canCreate, canEdit, canDelete } = useFeaturePermissions('ats.interviews')
  const router = useRouter()
  const scheduleDropdownsLoadId = useRef(0)
  /** Tracks the in-flight loadScheduleDropdowns promise so concurrent callers (mount effect + prefill effect,
   *  and StrictMode dev double-mounts) share one network round-trip instead of double-fetching jobs/leads/recruiters. */
  const scheduleDropdownsInflightRef = useRef<Promise<unknown> | null>(null)
  /** Tracks the in-flight getJobApplicationById call keyed by id so StrictMode double-mount in dev doesn't
   *  fire two identical application fetches. The map clears when each fetch settles. */
  const applicationFetchInflightRef = useRef<Map<string, Promise<unknown>>>(new Map())

  const defaultScheduleHosts = useMemo(() => {
    const email = authUser?.email?.trim()
    if (!email) return [{ nameOrRole: '', email: '' }]
    const nameOrRole = (authUser?.name ?? '').trim() || email.split('@')[0] || ''
    return [{ nameOrRole, email }]
  }, [authUser?.email, authUser?.name])

  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [selectedSort, setSelectedSort] = useState<string>('date-asc')
  /** Recruiter derived from the selected candidate's assigned agent (create form). */
  const [assignedAgentRecruiter, setAssignedAgentRecruiter] = useState<{ id: string; name: string; email: string } | null>(null)
  /** Pending overlap warning — holds the proceed callback so the user can override. */
  const [overlapWarning, setOverlapWarning] = useState<{ message: string; proceed: () => void } | null>(null)
  const [isExcelMenuOpen, setIsExcelMenuOpen] = useState(false)
  const excelDropdownRef = useRef<HTMLDivElement | null>(null)
  
  const [filters, setFilters] = useState<FilterState>({
    candidate: [],
    recruiter: [],
    status: [],
    type: []
  })
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

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
  /** Context-aware prefill from the ATS Applications row action; consumed once by the modal. */
  const [schedulePrefill, setSchedulePrefill] = useState<SchedulePrefill | null>(null)
  /** ATS candidates injected via prefill (ATS employees absent from referral-leads dropdown); kept
   * separate from `candidates` so that `loadScheduleDropdowns` resets don't wipe them out. */
  const [extraScheduleCandidates, setExtraScheduleCandidates] = useState<CandidateListItem[]>([])
  /** Visible debug status for the prefill flow — shown as a banner so users without DevTools can see what's happening. */
  const [prefillDebug, setPrefillDebug] = useState<string[]>([])
  const addPrefillDebug = useCallback((line: string) => {
    setPrefillDebug((prev) => [...prev, `${new Date().toLocaleTimeString()} ${line}`])
    // eslint-disable-next-line no-console
    console.log('[Schedule prefill]', line)
  }, [])

  // Dynamic dropdown data for Schedule Interview modal
  const [jobs, setJobs] = useState<Job[]>([])
  const [candidates, setCandidates] = useState<CandidateListItem[]>([])
  const [recruiters, setRecruiters] = useState<User[]>([])
  const [agents, setAgents] = useState<AgentOption[]>([])
  const [agentsError, setAgentsError] = useState<string | null>(null)
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([])
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
  const editScheduleWall = useMemo(() => editScheduleDefaults(editMeeting), [editMeeting])
  const editTimezoneOptions = useMemo(() => listTimezones(), [])

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

  /** Shared by initial mount and "Schedule Interview" so the candidate list is fresh and auth/permissions are ready.
   *  Concurrent callers (mount effect + prefill effect) share the in-flight promise to avoid duplicate API hits. */
  const loadScheduleDropdowns = useCallback(() => {
    if (scheduleDropdownsInflightRef.current) return scheduleDropdownsInflightRef.current
    const id = ++scheduleDropdownsLoadId.current
    setDropdownsLoading(true)
    const p = Promise.allSettled([
      listJobs({ limit: 100, status: 'Active' }).then((r) => r.results),
      fetchReferralLeadsForSchedule(),
      listRecruiters({ limit: 100 }).then((r) => r.results),
      getCandidateFilterAgents().then((r) => r.agents),
    ])
      .then((results) => {
        if (scheduleDropdownsLoadId.current !== id) return
        const jobList = results[0].status === 'fulfilled' ? results[0].value || [] : []
        const candidateList = results[1].status === 'fulfilled' ? results[1].value || [] : []
        const recruiterList = results[2].status === 'fulfilled' ? results[2].value || [] : []
        const agentList = results[3].status === 'fulfilled' ? results[3].value || [] : []
        setJobs(jobList)
        setCandidates(candidateList)
        setRecruiters(recruiterList)
        setAgents(agentList)
        setAgentsError(results[3].status === 'rejected' ? 'Failed to load agents' : null)
        const failed = results
          .map((r, i) => (r.status === 'rejected' ? ['Jobs', 'Referral leads', 'Recruiters', 'Agents'][i] : null))
          .filter(Boolean) as string[]
        if (failed.length > 0) {
          console.warn('[Interviews] Schedule form dropdowns failed to load:', failed, results)
        }
      })
      .finally(() => {
        if (scheduleDropdownsLoadId.current === id) setDropdownsLoading(false)
        scheduleDropdownsInflightRef.current = null
      })
    scheduleDropdownsInflightRef.current = p
    return p
  }, [])

  /** Retry loading just the agent list (used by the modal's agent-field error state). */
  const reloadAgents = useCallback(async () => {
    setAgentsError(null)
    try {
      const { agents: list } = await getCandidateFilterAgents()
      setAgents(list)
    } catch {
      setAgentsError('Failed to load agents')
    }
  }, [])

  const openScheduleInterviewModal = useCallback(() => {
    void loadScheduleDropdowns()
    openHsOverlay('#create-interview-modal')
  }, [loadScheduleDropdowns, openHsOverlay])

  /** Stable callback so the modal's prefill useEffect doesn't re-run on every parent render. */
  const handlePrefillConsumed = useCallback(() => setSchedulePrefill(null), [])

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
    const timezone = getVal('edit-timezone') || editMeeting.timezone || 'UTC'
    const durationMinutes = parseInt(getVal('edit-duration') || '60', 10) || 60
    const jobId = getVal('edit-job')
    const selectedJob =
      editJobsForCandidate.find((j) => (j.id ?? j._id) === jobId) ||
      jobs.find((j) => (j.id ?? j._id) === jobId)
    const jobPosition = jobId
      ? isMongoObjectIdString(jobId)
        ? jobId.trim()
        : selectedJob?.title || jobId
      : editMeeting.jobPosition
    const interviewType = (form.querySelector('input[name="edit-type"]:checked') as HTMLInputElement)?.value || editMeeting.interviewType || 'Video'
    const notes = getVal('edit-notes')
    const status = getVal('edit-status') as 'scheduled' | 'ended' | 'cancelled' || editMeeting.status
    const candidateId = (form.querySelector('#edit-candidate') as HTMLSelectElement)?.value
    const candidate = candidateId ? candidates.find((c) => (c.id ?? c._id) === candidateId) : null
    const scheduledAt = date && time ? wallClockToUtc(date, time, timezone).toISOString() : editMeeting.scheduledAt
    const payload: UpdateMeetingPayload = {
      title: title || editMeeting.title,
      description: description || undefined,
      scheduledAt,
      timezone,
      durationMinutes,
      jobPosition: jobPosition || undefined,
      interviewType: interviewType === 'video' ? 'Video' : interviewType === 'in-person' ? 'In-Person' : 'Phone',
      candidate: candidate ? { id: candidate.id ?? candidate._id, name: candidate.fullName ?? '', email: pickPublicEmail([candidate.email]) ?? '' } : editMeeting.candidate,
      recruiter: editMeeting.recruiter,
      notes: notes || undefined,
      status,
    }

    const runUpdate = async () => {
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
    }

    const overlapMessage = buildOverlapMessage({
      scheduledAtIso: scheduledAt,
      durationMinutes,
      candidateId: payload.candidate?.id,
      agentIds: [payload.recruiter?.id || ''].filter(Boolean),
      excludeMeetingId: editMeetingId,
    })
    if (overlapMessage) {
      setOverlapWarning({
        message: overlapMessage,
        proceed: () => {
          setOverlapWarning(null)
          void runUpdate()
        },
      })
      return
    }

    await runUpdate()
  }, [editMeetingId, editMeeting, editJobsForCandidate, jobs, candidates, fetchMeetings, closeEditModal, buildOverlapMessage])

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

  // Consume context params from /ats/applications row action. Reads window.location.search directly
  // (more reliable than useSearchParams across SSR/hydration boundaries), opens the modal immediately,
  // then loads application data + injects candidate option + sets prefill asynchronously.
  // NOTE: no ref-based early-return — React StrictMode in dev mounts→unmounts→remounts effects,
  // and a ref guard would let mount 1 start work, cleanup cancel it, then mount 2 bail out, leaving
  // the modal in "dropdowns loaded; cancelled=true" purgatory. Instead we rely on the per-mount
  // `cancelled` flag for stale-write protection and the final URL strip to gate re-fires.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const qs = new URLSearchParams(window.location.search)
    const openFlag = qs.get('openSchedule')
    addPrefillDebug(`mount: openFlag=${openFlag} search=${window.location.search}`)
    if (openFlag !== '1') return
    const applicationId = qs.get('applicationId') ?? ''
    const urlCandidateId = qs.get('candidateId') ?? ''
    const urlJobId = qs.get('jobId') ?? ''
    addPrefillDebug(`consuming params: applicationId=${applicationId} candidateId=${urlCandidateId} jobId=${urlJobId}`)
    let cancelled = false

    const stripParams = () => {
      try { router.replace('/ats/interviews', { scroll: false }) } catch { /* ignore */ }
    }

    // Robust open: poll for window.HSOverlay (Preline) up to ~6s, then attempt open via the static
    // open() API and a click on a temporary trigger button as a belt-and-suspenders fallback.
    const openTimers: ReturnType<typeof setTimeout>[] = []
    const robustOpenModal = (label: string) => {
      let attempts = 0
      const tick = () => {
        if (cancelled) return
        const modal = document.querySelector('#create-interview-modal') as HTMLElement | null
        if (!modal) {
          if (attempts++ < 60) {
            const t = setTimeout(tick, 100); openTimers.push(t); return
          }
          console.warn('[Schedule prefill] modal element never appeared', label)
          return
        }
        // Already open? (Preline removes `hidden` on open.)
        if (!modal.classList.contains('hidden')) return
        const HSO = (window as any).HSOverlay
        if (HSO && typeof HSO.open === 'function') {
          try { (window as any).HSStaticMethods?.autoInit?.() } catch { /* ignore */ }
          try { HSO.open(modal); return } catch (e) { console.warn('[Schedule prefill] HSOverlay.open threw', e) }
        }
        // Fallback: synthesise a click on a button bound via data-hs-overlay (Preline standard trigger).
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.setAttribute('data-hs-overlay', '#create-interview-modal')
        btn.style.display = 'none'
        document.body.appendChild(btn)
        try { (window as any).HSStaticMethods?.autoInit?.() } catch { /* ignore */ }
        const tClick = setTimeout(() => {
          if (cancelled) { document.body.removeChild(btn); return }
          btn.click()
          setTimeout(() => { try { document.body.removeChild(btn) } catch { /* ignore */ } }, 200)
          if (modal.classList.contains('hidden') && attempts++ < 60) {
            const r = setTimeout(tick, 100); openTimers.push(r)
          }
        }, 50)
        openTimers.push(tClick)
      }
      void ensurePrelineLoaded().then(tick)
    }

    // Kick off the first open attempt immediately; data hydrates next.
    robustOpenModal('initial')

    void (async () => {
      try {
        addPrefillDebug('awaiting loadScheduleDropdowns')
        // Ensure dropdown data (jobs / referral leads / recruiters) is loaded so prefilled selects render correctly.
        await loadScheduleDropdowns()
        addPrefillDebug(`dropdowns loaded; cancelled=${cancelled} applicationId=${applicationId}`)
        if (cancelled) return
        if (!applicationId) {
          addPrefillDebug('applicationId missing — opening blank modal')
          robustOpenModal('no-applicationId')
          return
        }
        addPrefillDebug(`fetching application ${applicationId}`)
        // Share fetch across StrictMode double-mount so both effect runs await the same network call.
        let appPromise = applicationFetchInflightRef.current.get(applicationId) as Promise<JobApplication> | undefined
        if (!appPromise) {
          appPromise = getJobApplicationById(applicationId).finally(() => {
            applicationFetchInflightRef.current.delete(applicationId)
          })
          applicationFetchInflightRef.current.set(applicationId, appPromise)
        }
        const app = await appPromise
        addPrefillDebug(`application loaded: candidate=${app?.candidate?.fullName ?? '—'} job=${app?.job?.title ?? '—'} status=${app?.status ?? '—'}`)
        if (cancelled) return
        const cand = (app.candidate ?? {}) as {
          _id?: string; id?: string; fullName?: string; email?: string;
          phoneNumber?: string; department?: string | null;
        }
        const candId = String(cand._id ?? cand.id ?? '') || urlCandidateId
        const j = (app.job ?? {}) as { _id?: string; id?: string; title?: string }
        const jId = String(j._id ?? j.id ?? '') || urlJobId
        if (!candId) {
          setFormError('Could not load candidate context — please fill the form manually.')
          return
        }
        // Inject candidate as a synthetic option so the controlled select can target it,
        // even when the candidate is an ATS employee (not a referral lead). Stored separately so
        // concurrent referral-lead fetches don't overwrite it.
        const publicCandEmail = pickPublicEmail([cand.email]) ?? ''
        const synthetic: CandidateListItem = {
          id: candId,
          fullName: cand.fullName ?? publicCandEmail ?? 'Candidate',
          email: publicCandEmail,
          phoneNumber: cand.phoneNumber ?? '',
        }
        setExtraScheduleCandidates((prev) =>
          prev.some((c) => String(c.id ?? c._id ?? '') === candId) ? prev : [synthetic, ...prev]
        )
        const candidateName = (cand.fullName ?? '').trim() || publicCandEmail.trim() || 'Candidate'
        const jobTitle = (j.title ?? '').trim()
        const prefill: SchedulePrefill = {
          applicationId,
          candidateId: candId,
          candidateName,
          candidateEmail: publicCandEmail,
          candidatePhone: cand.phoneNumber ?? '',
          jobId: jId || undefined,
          jobTitle: jobTitle || undefined,
          department: cand.department ?? undefined,
          recruiterId: app.appliedBy?._id ?? authUser?.id,
          applicationStatus: app.status,
          suggestedTitle: jobTitle ? `${jobTitle} Interview — ${candidateName}` : `Interview — ${candidateName}`,
          suggestedNotes: [
            applicationId ? `Application ID: ${applicationId}` : '',
            app.status ? `Current stage: ${app.status}` : '',
            jobTitle ? `Job: ${jobTitle}` : '',
            cand.department ? `Department: ${cand.department}` : '',
          ].filter(Boolean).join('\n'),
        }
        setSchedulePrefill(prefill)
        setFormError(null)
        // Re-open in case the user closed it during the async fetch; no-op if already open.
        robustOpenModal('post-data')
      } catch (err: any) {
        addPrefillDebug(`ERROR: ${err?.response?.status ?? ''} ${err?.message ?? err}`)
        if (cancelled) return
        const msg = err?.response?.status === 404
          ? 'This application no longer exists — please pick the candidate manually.'
          : 'Could not load application context — please fill the form manually.'
        setFormError(msg)
        robustOpenModal('error-fallback')
      } finally {
        if (!cancelled) stripParams()
      }
    })()

    return () => {
      cancelled = true
      openTimers.forEach(clearTimeout)
    }
  // Run once on mount. searchParams hook unreliable here, so we read window.location directly above.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    setSchedulePrefill(null)
    setExtraScheduleCandidates([])
    setSelectedAgentIds([])
    setAssignedAgentRecruiter(null)
    setOverlapWarning(null)
    setInterviewFormResetKey((k) => k + 1)
  }, [defaultScheduleHosts])

  /** Merge ATS-injected candidates with the referral-leads list for the schedule modal. */
  const scheduleCandidatesMerged = useMemo<CandidateListItem[]>(() => {
    if (extraScheduleCandidates.length === 0) return candidates
    const seen = new Set<string>()
    const merged: CandidateListItem[] = []
    for (const c of extraScheduleCandidates) {
      const key = String(c.id ?? c._id ?? '')
      if (key && !seen.has(key)) {
        seen.add(key)
        merged.push(c)
      }
    }
    for (const c of candidates) {
      const key = String(c.id ?? c._id ?? '')
      if (key && !seen.has(key)) {
        seen.add(key)
        merged.push(c)
      }
    }
    return merged
  }, [extraScheduleCandidates, candidates])

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  /**
   * Build a human overlap-warning message, or null when there is no conflict.
   * Best-effort within the loaded `meetings` list.
   */
  function buildOverlapMessage(args: {
    scheduledAtIso: string
    durationMinutes: number
    candidateId?: string
    agentIds: string[]
    excludeMeetingId?: string
  }): string | null {
    const { candidateConflict, agentConflicts } = detectOverlap({
      startUtc: args.scheduledAtIso,
      durationMinutes: args.durationMinutes,
      candidateId: args.candidateId,
      agentIds: args.agentIds,
      existingMeetings: meetings,
      excludeMeetingId: args.excludeMeetingId,
    })
    const parts: string[] = []
    if (candidateConflict) {
      parts.push(
        `${candidateConflict.candidate?.name || 'This candidate'} has interview "${candidateConflict.title}" that appears to overlap this slot.`
      )
    }
    if (agentConflicts.length > 0) {
      parts.push(
        `An assigned agent already has ${agentConflicts.length} overlapping interview${agentConflicts.length > 1 ? 's' : ''}.`
      )
    }
    return parts.length ? `${parts.join(' ')} Schedule anyway?` : null
  }

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
    const allowGuestJoin = (form.querySelector('#schedule-allow-guest') as HTMLInputElement)?.checked ?? false
    const requireApproval = (form.querySelector('#schedule-require-approval') as HTMLInputElement)?.checked ?? true
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
    const agentRefs = selectedAgentIds
      .map((id) => agents.find((a) => a.id === id))
      .filter((a): a is AgentOption => Boolean(a))
      .map((a) => ({ id: a.id, name: a.name, email: a.email }))
    const scheduledAt = wallClockToUtc(date, time, (form.querySelector('#schedule-timezone') as HTMLInputElement)?.value || 'UTC').toISOString()
    const timezone = (form.querySelector('#schedule-timezone') as HTMLInputElement)?.value || 'UTC'
    const payload: CreateMeetingPayload = {
      title,
      description: description || undefined,
      scheduledAt,
      timezone,
      durationMinutes,
      maxParticipants,
      allowGuestJoin,
      requireApproval,
      hosts: validHosts.map((h) => ({ nameOrRole: (h.nameOrRole ?? '').trim(), email: h.email.trim() })),
      emailInvites: emailInvites.filter((em) => em.trim()).map((em) => em.trim()),
      jobPosition: jobPosition || undefined,
      interviewType: interviewType === 'video' ? 'Video' : interviewType === 'in-person' ? 'In-Person' : 'Phone',
      candidate: candidateOption?.value ? { id: candidateOption.value, name: (candidateMatch?.[1] ?? candidateText).trim(), email: (candidateMatch?.[2] ?? '').trim() } : undefined,
      agents: agentRefs.length > 0 ? agentRefs : undefined,
      recruiter: assignedAgentRecruiter
        ? assignedAgentRecruiter
        : authUser?.id
          ? { id: authUser.id, name: authUser.name ?? '', email: authUser.email ?? '' }
          : undefined,
      notes: notes || undefined,
    }
    const runCreate = async () => {
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
    }

    const overlapMessage = buildOverlapMessage({
      scheduledAtIso: scheduledAt,
      durationMinutes,
      candidateId: candidateOption?.value || undefined,
      agentIds: [...agentRefs.map((a) => a.id), ...(payload.recruiter?.id ? [payload.recruiter.id] : [])],
    })
    if (overlapMessage) {
      setOverlapWarning({
        message: overlapMessage,
        proceed: () => {
          setOverlapWarning(null)
          void runCreate()
        },
      })
      return
    }

    await runCreate()
  }, [hosts, emailInvites, jobs, fetchMeetings, selectedAgentIds, agents, authUser, assignedAgentRecruiter, buildOverlapMessage])

  // Define columns
  const columns = useMemo(
    () => [
      {
        Header: 'All',
        accessor: 'checkbox',
        disableSortBy: true,
        Cell: ({ row }: any) => (
          <div className="flex justify-center items-center">
            <input
              className="form-check-input !m-0 shrink-0"
              type="checkbox"
              checked={selectedRows.has(row.original.id)}
              onChange={() => handleRowSelect(row.original.id)}
              aria-label={`Select interview ${row.original.id}`}
            />
          </div>
        ),
      },
      {
        Header: 'Interview Info',
        accessor: 'interviewInfo',
        Cell: ({ row }: any) => {
          const interview = row.original
          return (
            <div className="flex flex-col gap-0.5 leading-tight min-w-0 max-w-full overflow-hidden">
              <div className="font-semibold text-gray-800 dark:text-white text-[0.8125rem] truncate" title={interview.position}>
                {interview.position}
              </div>
              <div className="text-[0.6875rem] text-gray-600 dark:text-gray-400 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  <i className="ri-calendar-line text-primary"></i>
                  {new Date(interview.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  <i className="ri-time-line text-info"></i>
                  {interview.time}
                </span>
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  <i className="ri-vidicon-line text-success"></i>
                  {interview.type}
                </span>
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
            <div className="flex items-center gap-2 min-w-0 max-w-full overflow-hidden">
              <div className="flex-shrink-0 relative w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary font-semibold text-xs overflow-hidden">
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
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="font-semibold text-gray-800 dark:text-white text-[0.8125rem] truncate" title={candidate?.name ?? undefined}>
                  {candidate?.name ?? '—'}
                </div>
                <div className="text-[0.6875rem] text-gray-500 dark:text-gray-400 truncate" title={isPublicEmail(candidate?.email) ? candidate?.email : undefined}>
                  <span className="inline-flex items-center gap-1 min-w-0 max-w-full">
                    <i className="ri-mail-line shrink-0"></i>
                    <span className="truncate">{isPublicEmail(candidate?.email) ? candidate?.email : '—'}</span>
                  </span>
                </div>
              </div>
            </div>
          )
        },
      },
      {
        Header: 'Agent',
        accessor: 'recruiter',
        Cell: ({ row }: any) => {
          const recruiter = row.original.recruiter
          const initials = (recruiter?.name || '—').trim().split(/\s+/).map((s: string) => s[0]).join('').toUpperCase().slice(0, 2) || '?'
          return (
            <div className="flex items-center gap-2 min-w-0 max-w-full overflow-hidden">
              <div className="flex-shrink-0 relative w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary font-semibold text-xs overflow-hidden">
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
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="font-semibold text-gray-800 dark:text-white text-[0.8125rem] truncate" title={recruiter?.name ?? undefined}>
                  {recruiter?.name ?? '—'}
                </div>
                <div className="text-[0.6875rem] text-gray-500 dark:text-gray-400 truncate" title={recruiter?.email ?? undefined}>
                  <span className="inline-flex items-center gap-1 min-w-0 max-w-full">
                    <i className="ri-mail-line shrink-0"></i>
                    <span className="truncate">{recruiter?.email ?? '—'}</span>
                  </span>
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
            <div className="flex justify-center items-center min-w-0 max-w-full px-0.5">
              <span className={`inline-flex items-center justify-center border px-2 py-0.5 rounded-md text-xs font-medium max-w-full truncate ${config.className}`}>
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
            <div className="flex justify-center items-center min-w-0 max-w-full px-0.5">
              <span
                className={`badge inline-flex items-center justify-center ${resultColors[interview.interviewResult] || resultColors.pending} border px-2 py-0.5 rounded-md text-xs font-medium max-w-full truncate`}
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
          <div className="flex flex-wrap items-center justify-center gap-0.5 min-w-0 max-w-full mx-auto px-0.5 [&_.ti-btn]:shrink-0">
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
            {canEdit && (row.original.status?.toLowerCase() === 'ended' || row.original.interviewResult === 'selected') && (
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
            {canEdit && (
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
            )}
            {canEdit && row.original.status?.toLowerCase() !== 'cancelled' && (
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

  const showPersonColumns = useMinWidth(1536)
  const tableColumns = useMemo(() => {
    if (showPersonColumns) return columns
    return columns.filter((col: { accessor?: string }) => col.accessor !== 'candidate' && col.accessor !== 'recruiter')
  }, [columns, showPersonColumns])

  // Map API meetings to table rows
  const tableData = useMemo<InterviewTableRow[]>(() => {
    const viewerTz = mounted ? getViewerTimezone() : undefined
    return meetings.map((m) => meetingToTableRow(m, viewerTz))
  }, [meetings, mounted])

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
      columns: tableColumns,
      data,
      initialState: { pageIndex: 0, pageSize: 50, sortBy: [{ id: 'interviewInfo', desc: false }] },
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

  // Reset to the first page when the filtered dataset shrinks below the
  // current page window, so applying filters/search never strands the user
  // on a now-empty page.
  useEffect(() => {
    if (pageIndex > 0 && pageIndex * pageSize >= filteredData.length) {
      gotoPage(0)
    }
  }, [filteredData.length, pageIndex, pageSize, gotoPage])

  // Handle sort selection
  // Sort is date-only: soonest-first (asc) or latest-first (desc).
  const handleSortChange = (sortOption: string) => {
    setSelectedSort(sortOption)
    setSortBy([{ id: 'interviewInfo', desc: sortOption === 'date-desc' }])
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

  if (!canView) {
    return (
      <Fragment>
        <Seo title="Interviews" />
        <div className="mt-5 grid grid-cols-12 gap-6 sm:mt-6">
          <div className="col-span-12 p-6 rounded-lg border border-danger/20 bg-danger/5 text-danger">
            You do not have permission to view Interviews.
          </div>
        </div>
      </Fragment>
    )
  }

  return (
    <Fragment>
      <Seo title="Interviews" />

<div className="mt-2 sm:mt-4 grid grid-cols-12 gap-3 sm:gap-4 w-full min-w-0 max-w-full min-h-[calc(100vh-6rem)] sm:min-h-[calc(100vh-8rem)] lg:gap-6">
        <div className="xl:col-span-12 col-span-12 h-full min-w-0 flex flex-col">
          <div className="box custom-box h-full min-w-0 flex flex-col overflow-hidden border border-defaultborder/70 dark:border-defaultborder/20 shadow-sm">
            <div className="box-header relative z-20 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between border-b border-defaultborder/70 dark:border-defaultborder/20 bg-gradient-to-b from-gray-50/90 via-white to-white px-3 sm:px-4 py-3 sm:py-3.5 dark:from-black/25 dark:via-black/15 dark:to-black/10">
              <div className="box-title text-sm sm:text-base">
                Interviews
                <span className="badge bg-light text-default rounded-full ms-1 text-[0.7rem] sm:text-[0.75rem] align-middle">
                  {filteredData.length}
                </span>
              </div>
              <div className="flex flex-col gap-2 w-full min-w-0 xl:flex-row xl:flex-wrap xl:items-center xl:gap-2 xl:w-auto xl:max-w-full [&_.ti-btn]:shrink-0 [&_.form-select]:shrink-0 [&_.form-control]:shrink-0">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 sm:contents">
                <select
                  id="interviews-page-size"
                  aria-label="Rows per page"
                  className="form-select select-show-page-size !w-auto !min-w-[6.5rem] !max-w-[8rem] !py-1.5 !ps-3 !pe-8 !text-[0.75rem]"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                >
                  {[10, 25, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      Show {size}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  id="sort-toggle-button"
                  onClick={() => handleSortChange(selectedSort === 'date-asc' ? 'date-desc' : 'date-asc')}
                  className="ti-btn ti-btn-light !py-1.5 !px-2.5 !text-[0.75rem] inline-flex items-center"
                  aria-label={selectedSort === 'date-desc' ? 'Sorted latest first — click to sort soonest first' : 'Sorted soonest first — click to sort latest first'}
                >
                  <i className={`${selectedSort === 'date-desc' ? 'ri-sort-desc' : 'ri-sort-asc'} font-semibold align-middle sm:me-1`}></i>
                  <span className="hidden sm:inline">{selectedSort === 'date-desc' ? 'Latest first' : 'Soonest first'}</span>
                </button>
                <div className="flex items-center rounded-lg border border-defaultborder dark:border-defaultborder/20 p-0.5 bg-white dark:bg-black/10">
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={`ti-btn !py-1.5 !px-2.5 !text-[0.75rem] rounded-md ${viewMode === 'table' ? 'ti-btn-primary' : 'ti-btn-light'}`}
                    aria-label="Table view"
                  >
                    <i className="ri-list-check-2 align-middle sm:me-1"></i><span className="hidden sm:inline">Table</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('week')}
                    className={`ti-btn !py-1.5 !px-2.5 !text-[0.75rem] rounded-md ${viewMode === 'week' ? 'ti-btn-primary' : 'ti-btn-light'}`}
                    aria-label="Week view"
                  >
                    <i className="ri-calendar-schedule-line align-middle sm:me-1"></i><span className="hidden sm:inline">Week</span>
                  </button>
                </div>
                {canCreate && (
                  <button
                    type="button"
                    className="ti-btn ti-btn-primary-full !py-1.5 !px-2.5 !text-[0.75rem] ms-auto sm:ms-0"
                    onClick={() => openScheduleInterviewModal()}
                  >
                    <i className="ri-add-line font-semibold align-middle sm:me-1"></i>
                    <span className="hidden sm:inline">Schedule Interview</span><span className="sm:hidden">Schedule</span>
                  </button>
                )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 sm:contents">
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
                    <i className="ri-file-excel-2-line font-semibold align-middle sm:me-1"></i><span className="hidden sm:inline">Excel</span>
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
                  <i className="ri-search-line font-semibold align-middle sm:me-1"></i><span className="hidden sm:inline">Search</span>
                  {hasActiveFilters && (
                    <span className="badge bg-primary text-white rounded-full ms-1 text-[0.65rem]">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                {canDelete && (
                  <button
                    type="button"
                    className="ti-btn ti-btn-danger !py-1.5 !px-2.5 !text-[0.75rem]"
                    aria-label="Delete selected"
                  >
                    <i className="ri-delete-bin-line font-semibold align-middle sm:me-1"></i><span className="hidden sm:inline">Delete</span>
                  </button>
                )}
                </div>
              </div>
            </div>
            <div className="box-body relative z-0 !p-0 flex-1 min-w-0 flex flex-col overflow-hidden bg-gradient-to-b from-white to-gray-50/40 dark:from-bodybg dark:to-black/20">
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
              <div className="flex-1 overflow-y-auto p-3 sm:p-4" style={{ minHeight: 0 }}>
                <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })}
                    className="ti-btn ti-btn-light !py-1.5 !px-2.5 sm:!px-3 !text-xs sm:!text-sm"
                    aria-label="Previous week"
                  >
                    <i className="ri-arrow-left-s-line"></i> <span className="hidden sm:inline">Previous week</span>
                  </button>
                  <span className="text-xs sm:text-sm font-medium text-defaulttextcolor dark:text-white order-last w-full text-center sm:order-none sm:w-auto">
                    {weekDays[0]?.date.toLocaleDateString('en-US', { month: 'short' })} {weekDays[0]?.date.getDate()} – {weekDays[6]?.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <button
                    type="button"
                    onClick={() => setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })}
                    className="ti-btn ti-btn-light !py-1.5 !px-2.5 sm:!px-3 !text-xs sm:!text-sm"
                    aria-label="Next week"
                  >
                    <span className="hidden sm:inline">Next week</span> <i className="ri-arrow-right-s-line"></i>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2 sm:gap-3">
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
                            <div className="flex flex-wrap gap-1 mt-2">
                              <button
                                type="button"
                                className="ti-btn ti-btn-icon ti-btn-sm ti-btn-success !py-0.5 !px-1.5 !text-[0.65rem]"
                                title="View recordings"
                                aria-label="View recordings"
                                onClick={() => {
                                  setRecordingsModalMeetingId(interview.id)
                                  ;(window as any).HSOverlay?.open(document.querySelector('#view-recordings-modal'))
                                }}
                              >
                                <i className="ri-video-line"></i>
                              </button>
                              {interview.status?.toLowerCase() !== 'cancelled' && (
                                <button
                                  type="button"
                                  className="ti-btn ti-btn-icon ti-btn-sm ti-btn-light !py-0.5 !px-1.5 !text-[0.65rem]"
                                  title="Copy interview link"
                                  aria-label="Copy interview link"
                                  onClick={() => copyInterviewLink(interview)}
                                >
                                  {copiedLinkId === interview.id ? (
                                    <i className="ri-check-line text-success"></i>
                                  ) : (
                                    <i className="ri-links-line"></i>
                                  )}
                                </button>
                              )}
                              {canEdit && (interview.status?.toLowerCase() === 'ended' || interview.interviewResult === 'selected') && (
                                <button
                                  type="button"
                                  className="ti-btn ti-btn-icon ti-btn-sm ti-btn-primary !py-0.5 !px-1.5 !text-[0.65rem]"
                                  title={interview.interviewResult === 'selected' ? 'Re-trigger offer & placement' : 'Set interview result'}
                                  aria-label="Set interview result"
                                  onClick={() => openResultModal(interview)}
                                >
                                  <i className="ri-checkbox-circle-line"></i>
                                </button>
                              )}
                              {canEdit && (
                                <button
                                  type="button"
                                  className="ti-btn ti-btn-icon ti-btn-sm ti-btn-info !py-0.5 !px-1.5 !text-[0.65rem]"
                                  title="Edit interview"
                                  aria-label="Edit interview"
                                  onClick={() => openEditModal(interview.id)}
                                >
                                  <i className="ri-pencil-line"></i>
                                </button>
                              )}
                              {canEdit && interview.status?.toLowerCase() !== 'cancelled' && (
                                <button
                                  type="button"
                                  className="ti-btn ti-btn-icon ti-btn-sm ti-btn-danger !py-0.5 !px-1.5 !text-[0.65rem]"
                                  title="Cancel interview"
                                  aria-label="Cancel interview"
                                  onClick={() => handleCancelMeeting(interview)}
                                >
                                  <i className="ri-close-circle-line"></i>
                                </button>
                              )}
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
                <div className="w-full max-w-xl rounded-xl border border-defaultborder/70 dark:border-defaultborder/20 bg-white/95 dark:bg-black/20 p-8 text-center shadow-sm">
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
                    {canCreate && (
                      <button
                        type="button"
                        className="ti-btn ti-btn-primary !py-2 !px-4 !text-sm"
                        onClick={() => openScheduleInterviewModal()}
                      >
                        <i className="ri-add-line me-1.5"></i>Schedule interview
                      </button>
                    )}
                  </div>
                </div>
              </div>
              ) : (
              <>
              {/* Mobile card list — shown below lg; mirrors paginated react-table rows */}
              <div className="lg:hidden flex-1 overflow-y-auto px-3 py-3 space-y-3" style={{ minHeight: 0 }}>
                {page.map((row: any, i: number) => {
                  prepareRow(row)
                  const interview = row.original
                  const statusRaw = (interview.status || '').toLowerCase()
                  const statusConfig: Record<string, { label: string; className: string }> = {
                    scheduled: { label: 'Scheduled', className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' },
                    'in progress': { label: 'In Progress', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' },
                    inprogress: { label: 'In Progress', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' },
                    ended: { label: 'Completed', className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
                    completed: { label: 'Completed', className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
                    cancelled: { label: 'Cancelled', className: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30' },
                    rescheduled: { label: 'Rescheduled', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' },
                  }
                  const status = statusConfig[statusRaw] || { label: interview.status || 'Scheduled', className: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/30' }
                  const resultColors: Record<string, string> = {
                    pending: 'bg-gray/10 text-gray border-gray/30',
                    selected: 'bg-success/10 text-success border-success/30',
                    rejected: 'bg-danger/10 text-danger border-danger/30',
                  }
                  const resultLabel =
                    interview.interviewResult === 'selected'
                      ? 'Selected'
                      : interview.interviewResult === 'rejected'
                        ? 'Rejected'
                        : 'Pending'
                  const candidateInitials = (interview.candidate?.name || '?').trim().split(/\s+/).map((x: string) => x[0]).join('').toUpperCase().slice(0, 2) || '?'
                  return (
                    <div
                      key={row.id || `card-${i}`}
                      className="rounded-xl border border-defaultborder/70 dark:border-white/10 bg-white dark:bg-bodybg shadow-sm p-3.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-gray-900 dark:text-white leading-snug break-words">
                            {interview.position}
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-1.5 text-[0.7rem] text-defaulttextcolor/80">
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-white/[0.05] px-2 py-0.5">
                              <i className="ri-calendar-line text-primary text-[0.75rem]" />
                              {new Date(interview.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-white/[0.05] px-2 py-0.5">
                              <i className="ri-time-line text-info text-[0.75rem]" />
                              {interview.time}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-white/[0.05] px-2 py-0.5">
                              <i className="ri-vidicon-line text-success text-[0.75rem]" />
                              {interview.type}
                            </span>
                          </div>
                        </div>
                        <input
                          className="form-check-input mt-1 shrink-0"
                          type="checkbox"
                          checked={selectedRows.has(interview.id)}
                          onChange={() => handleRowSelect(interview.id)}
                          aria-label={`Select interview ${interview.position}`}
                        />
                      </div>
                      <div className="mt-3 flex items-center gap-2.5 min-w-0">
                        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-primary font-semibold text-xs">
                          {candidateInitials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-800 dark:text-white truncate">{interview.candidate?.name ?? '—'}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {isPublicEmail(interview.candidate?.email) ? interview.candidate.email : '—'}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-defaulttextcolor/70 truncate">
                        <span className="font-medium">Agent:</span> {interview.recruiter?.name ?? '—'}
                      </div>
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        <span className={`inline-flex items-center border px-2 py-0.5 rounded-md text-[0.65rem] font-medium ${status.className}`}>
                          {status.label}
                        </span>
                        <span className={`badge ${resultColors[interview.interviewResult] || resultColors.pending} border px-2 py-0.5 rounded-md text-[0.65rem] font-medium`}>
                          {resultLabel}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          className="ti-btn ti-btn-icon ti-btn-sm ti-btn-success"
                          title="View recordings"
                          aria-label="View recordings"
                          onClick={() => {
                            setRecordingsModalMeetingId(interview.id)
                            ;(window as any).HSOverlay?.open(document.querySelector('#view-recordings-modal'))
                          }}
                        >
                          <i className="ri-video-line" />
                        </button>
                        {interview.status?.toLowerCase() !== 'cancelled' && (
                          <button
                            type="button"
                            className="ti-btn ti-btn-icon ti-btn-sm ti-btn-light"
                            title="Copy interview link"
                            aria-label="Copy interview link"
                            onClick={() => copyInterviewLink(interview)}
                          >
                            {copiedLinkId === interview.id ? (
                              <i className="ri-check-line text-success" />
                            ) : (
                              <i className="ri-links-line" />
                            )}
                          </button>
                        )}
                        {canEdit && (interview.status?.toLowerCase() === 'ended' || interview.interviewResult === 'selected') && (
                          <button
                            type="button"
                            className="ti-btn ti-btn-icon ti-btn-sm ti-btn-primary"
                            title={interview.interviewResult === 'selected' ? 'Re-trigger offer & placement' : 'Set interview result'}
                            aria-label="Set interview result"
                            onClick={() => openResultModal(interview)}
                          >
                            <i className="ri-checkbox-circle-line" />
                          </button>
                        )}
                        {canEdit && (
                          <button
                            type="button"
                            className="ti-btn ti-btn-icon ti-btn-sm ti-btn-info"
                            title="Edit interview"
                            aria-label="Edit interview"
                            onClick={() => openEditModal(interview.id)}
                          >
                            <i className="ri-pencil-line" />
                          </button>
                        )}
                        {canEdit && interview.status?.toLowerCase() !== 'cancelled' && (
                          <button
                            type="button"
                            className="ti-btn ti-btn-icon ti-btn-sm ti-btn-danger"
                            title="Cancel interview"
                            aria-label="Cancel interview"
                            onClick={() => handleCancelMeeting(interview)}
                          >
                            <i className="ri-close-circle-line" />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="hidden lg:flex flex-1 min-w-0 max-w-full overflow-hidden px-4 pb-4" style={{ minHeight: 0 }}>
                <div className="table-responsive w-full max-w-full min-w-0 overflow-x-auto overflow-y-auto rounded-xl border border-defaultborder/70 dark:border-defaultborder/20 bg-white/95 dark:bg-black/20 shadow-sm">
                <table {...getTableProps()} className="table mb-0 w-full max-w-full table-fixed table-striped table-hover table-bordered border-gray-300 dark:border-gray-600">
                  <thead>
                    {headerGroups.map((headerGroup: any, i: number) => (
                      <tr {...headerGroup.getHeaderGroupProps()} className="bg-primary/10 dark:bg-primary/20 border-b border-gray-300 dark:border-gray-600" key={`header-group-${i}`}>
                        {headerGroup.headers.map((column: any, i: number) => (
                            <th
                            {...column.getHeaderProps(column.id === 'checkbox' ? undefined : column.getSortByToggleProps())}
                            scope="col"
                            className={`${CENTERED_TABLE_COLUMNS.has(column.id) ? 'text-center' : 'text-start'} sticky top-0 z-10 bg-gray-50 dark:bg-black/20 align-middle overflow-hidden ${COLUMN_VISIBILITY[column.id] ?? ''}`.trim()}
                            key={column.id || `col-${i}`}
                            style={{
                              position: 'sticky',
                              top: 0,
                              zIndex: 10,
                              width: (showPersonColumns ? COLUMN_WIDTH_FULL : COLUMN_WIDTH_COMPACT)[column.id],
                            }}
                          >
                            {column.id === 'checkbox' ? (
                              <div className="flex justify-center items-center w-full">
                                <input
                                  className="form-check-input !m-0 shrink-0"
                                  type="checkbox"
                                  checked={isAllSelected}
                                  ref={(input) => {
                                    if (input) input.indeterminate = isIndeterminate
                                  }}
                                  onChange={handleSelectAll}
                                  aria-label="Select all"
                                />
                              </div>
                            ) : (
                              <div className={`flex items-center gap-2 ${CENTERED_TABLE_COLUMNS.has(column.id) ? 'justify-center' : ''}`.trim()}>
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
                              <td
                                {...cell.getCellProps()}
                                className={`align-middle py-2 overflow-hidden ${COLUMN_VISIBILITY[cell.column.id] ?? ''}`.trim()}
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
              </>
              )}
            </div>
            {!meetingsLoading && !meetingsError && viewMode === 'table' && (
            <div className="box-footer border-t border-defaultborder/70 dark:border-defaultborder/20 bg-gray-50/90 dark:bg-black/25 px-4 py-3">
              <div className="flex flex-col sm:flex-row items-center flex-wrap gap-3">
                <div className="text-sm text-center sm:text-left text-defaulttextcolor/80 dark:text-white/70 w-full sm:w-auto">
                  Showing {data.length === 0 ? 0 : pageIndex * pageSize + 1} to {Math.min((pageIndex + 1) * pageSize, data.length)} of {data.length} entries{' '}
                  <i className="bi bi-arrow-right ms-2 font-semibold"></i>
                </div>
                <div className="w-full sm:w-auto sm:ms-auto flex justify-center">
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
        candidates={scheduleCandidatesMerged}
        agents={agents}
        agentsLoading={dropdownsLoading}
        agentsError={agentsError}
        onReloadAgents={reloadAgents}
        selectedAgentIds={selectedAgentIds}
        setSelectedAgentIds={setSelectedAgentIds}
        hosts={hosts}
        setHosts={setHosts}
        emailInvites={emailInvites}
        setEmailInvites={setEmailInvites}
        scheduledInterviewAt={scheduledInterviewAt}
        onScheduledInterviewAtChange={setScheduledInterviewAt}
        prefill={schedulePrefill}
        onPrefillConsumed={handlePrefillConsumed}
        onAssignedAgentResolved={setAssignedAgentRecruiter}
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
                  <div>
                    <label htmlFor="edit-timezone" className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">
                      Time zone <span className="text-danger">*</span>
                    </label>
                    <select
                      id="edit-timezone"
                      name="edit-timezone"
                      defaultValue={editScheduleWall.timezone}
                      className="form-select !py-2 !text-sm w-full border-defaultborder dark:border-defaultborder/10 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      {editTimezoneOptions.map((tz) => (
                        <option key={tz} value={tz}>
                          {tz}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="edit-date" className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">Date <span className="text-danger">*</span></label>
                      <input type="date" id="edit-date" key={`edit-date-${editMeetingId}-${editScheduleWall.date}`} defaultValue={editScheduleWall.date} className="form-control !py-2 !text-sm w-full border-defaultborder dark:border-defaultborder/10 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                    </div>
                    <div>
                      <label htmlFor="edit-time" className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">Time <span className="text-danger">*</span></label>
                      <input type="time" id="edit-time" key={`edit-time-${editMeetingId}-${editScheduleWall.time}`} defaultValue={editScheduleWall.time} className="form-control !py-2 !text-sm w-full border-defaultborder dark:border-defaultborder/10 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary" />
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
                        <option key={c.id ?? c._id} value={c.id ?? c._id}>{c.fullName}{isPublicEmail(c.email) ? ` - ${c.email}` : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">Agent</span>
                    <p className="form-control !py-2 !text-sm w-full border-defaultborder dark:border-defaultborder/10 rounded-lg bg-gray-50 text-textmuted dark:bg-black/20 dark:text-white/70">
                      {editMeeting.recruiter?.name || editMeeting.recruiter?.email || '—'}
                    </p>
                    <p className="mt-1 text-xs text-textmuted dark:text-white/50">
                      Derived from the candidate when the interview was created.
                    </p>
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
      {overlapWarning && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4"
          role="alertdialog"
          aria-modal="true"
          aria-label="Scheduling conflict"
        >
          <div className="w-full max-w-md rounded-xl border border-defaultborder bg-white p-5 shadow-xl dark:border-defaultborder/10 dark:bg-bodybg">
            <div className="flex items-start gap-3">
              <i className="ri-error-warning-line mt-0.5 text-xl text-warning" aria-hidden />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-defaulttextcolor dark:text-white">Scheduling conflict</h4>
                <p className="mt-1 text-sm text-textmuted dark:text-white/70">{overlapWarning.message}</p>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="ti-btn ti-btn-light !py-2 !px-4 !text-sm"
                onClick={() => setOverlapWarning(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ti-btn ti-btn-primary !py-2 !px-4 !text-sm"
                onClick={overlapWarning.proceed}
              >
                Schedule anyway
              </button>
            </div>
          </div>
        </div>
      )}

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
