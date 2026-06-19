"use client"
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { format } from 'date-fns'
import { useAuth } from '@/shared/contexts/auth-context'
import { appendJoinIdentityToUrl, resolvePersonalJoinIdentity } from '@/shared/lib/join-room-url'
import type { Meeting } from '@/shared/lib/api/meetings'
import type { Job } from '@/shared/lib/api/jobs'
import type { CandidateListItem } from '@/shared/lib/api/candidates'
import { listJobApplications, type JobApplication } from '@/shared/lib/api/jobApplications'
import { getCandidate, type AgentOption } from '@/shared/lib/api/employees'
import MeetingCreatedSuccess from '@/shared/components/meeting/MeetingCreatedSuccess'
import { isPublicEmail } from '@/shared/lib/ats/applicant-email'
import { utcInstantToWallClock } from '@/shared/lib/timezone'
import InterviewDateTimeOverlay from './InterviewDateTimeOverlay'
import { to12Hour } from './interviewSlots'
import AgentMultiSelect from './AgentMultiSelect'
import { saveDraft, loadDraft, clearDraft, type InterviewDraftData } from './interviewDraft'
import { listUsers } from '@/shared/lib/api/users'
import ParticipantInvitesField, { type ParticipantUser } from '@/shared/components/meeting/ParticipantInvitesField'

function jobIdFromAppJob(job: JobApplication['job'] | undefined | null): string | null {
  if (!job || typeof job === 'string') return null
  const raw = job._id ?? (job as { id?: string }).id
  return raw != null && String(raw) !== '' ? String(raw) : null
}

function jobOptionsFromApplications(apps: JobApplication[]): Job[] {
  const m = new Map<string, Job>()
  for (const app of apps) {
    const j = app.job
    const id = jobIdFromAppJob(j)
    if (!id) continue
    if (m.has(id)) continue
    m.set(id, {
      _id: id,
      id,
      title: j.title || 'Position',
      organisation:
        j.organisation && typeof j.organisation === 'object' && 'name' in j.organisation
          ? (j.organisation as Job['organisation'])
          : { name: '' },
      jobDescription: '',
      jobType: '',
      location: '',
      status: (j.status as string) || 'Active',
    })
  }
  return [...m.values()]
}

type WhenTriggerProps = { value?: string; onClick: () => void; disabled?: boolean }

/** Trigger card that opens the date/time overlay. */
function ScheduleInterviewWhenTrigger({ value, onClick, disabled }: WhenTriggerProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      id="schedule-when-trigger"
      className="group flex w-full items-center gap-3 rounded-xl border border-defaultborder bg-white py-2.5 pl-3.5 pr-12 text-left text-sm shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-primary/35 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-60 dark:border-defaultborder/10 dark:bg-bodybg"
      aria-haspopup="dialog"
      aria-label={value ? `Interview date and time: ${value}` : 'Choose interview date and time'}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/[0.08] text-primary dark:bg-primary/15">
        <i className="ri-calendar-schedule-line text-lg" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 pr-1">
        <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-textmuted dark:text-white/50">Date and time</span>
        <span className="block truncate font-medium text-defaulttextcolor dark:text-white">
          {value || 'Select date & time'}
        </span>
      </span>
    </button>
  )
}
/** Context-aware prefill from ATS Applications page row action. */
export interface SchedulePrefill {
  applicationId?: string
  candidateId: string
  candidateName: string
  candidateEmail: string
  candidatePhone?: string
  jobId?: string
  jobTitle?: string
  department?: string
  recruiterId?: string
  applicationStatus?: string
  suggestedTitle?: string
  suggestedNotes?: string
}

export interface CreateInterviewModalProps {
  createdMeeting: Meeting | null
  resetCreateMeetingForm: () => void
  formError: string | null
  formLoading: boolean
  onSubmit: (e: React.FormEvent) => void
  dropdownsLoading: boolean
  /** Incremented when the parent clears the form so candidate/job picks reset. */
  formResetKey?: number
  candidates: CandidateListItem[]
  agents: AgentOption[]
  agentsLoading: boolean
  agentsError: string | null
  onReloadAgents: () => void
  selectedAgentIds: string[]
  setSelectedAgentIds: React.Dispatch<React.SetStateAction<string[]>>
  hosts: { nameOrRole: string; email: string }[]
  setHosts: React.Dispatch<React.SetStateAction<{ nameOrRole: string; email: string }[]>>
  emailInvites: string[]
  setEmailInvites: React.Dispatch<React.SetStateAction<string[]>>
  /** Local combined date+time for the schedule form (owned by parent so reset/close clears reliably). */
  scheduledInterviewAt: Date | null
  onScheduledInterviewAtChange: (value: Date | null) => void
  /** Prefill data passed from the Applications page row action; consumed once then cleared by parent. */
  prefill?: SchedulePrefill | null
  /** Called after the modal applies prefill so the parent can clear it. */
  onPrefillConsumed?: () => void
  /** Called with the candidate's assigned agent (or null) so the parent can derive the recruiter. */
  onAssignedAgentResolved?: (agent: { id: string; name: string; email: string } | null) => void
}

export default function CreateInterviewModal({
  createdMeeting,
  resetCreateMeetingForm,
  formError,
  formLoading,
  onSubmit,
  dropdownsLoading,
  formResetKey = 0,
  candidates,
  agents,
  agentsLoading,
  agentsError,
  onReloadAgents,
  selectedAgentIds,
  setSelectedAgentIds,
  hosts,
  setHosts,
  emailInvites,
  setEmailInvites,
  scheduledInterviewAt,
  onScheduledInterviewAtChange,
  prefill,
  onPrefillConsumed,
  onAssignedAgentResolved,
}: CreateInterviewModalProps) {
  const { user } = useAuth()
  const draftUserId = user?.id ?? ''
  const draftSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** Draft offered for restore (shown as a banner); null when no offer is pending. */
  const [draftPrompt, setDraftPrompt] = useState<InterviewDraftData | null>(null)
  const [selectedCandidateId, setSelectedCandidateId] = useState('')
  /** Agent id auto-filled from the selected candidate (shows the "auto" badge). */
  const [autoFilledAgentId, setAutoFilledAgentId] = useState<string | null>(null)
  // Mirror autoFilledAgentId so applyCandidateAgent reads the latest value WITHOUT
  // nesting setSelectedAgentIds (a parent setter) inside setAutoFilledAgentId's updater.
  // Updaters run during render, so a parent setState there triggers React's
  // "Cannot update a component while rendering a different component" error.
  const autoFilledAgentIdRef = useRef<string | null>(null)
  useEffect(() => {
    autoFilledAgentIdRef.current = autoFilledAgentId
  }, [autoFilledAgentId])
  const [scheduleTimezone, setScheduleTimezone] = useState('UTC')
  const [dateTimeOverlayOpen, setDateTimeOverlayOpen] = useState(false)
  const [selectedJobId, setSelectedJobId] = useState('')
  const [jobsForCandidate, setJobsForCandidate] = useState<Job[]>([])
  const [applicationJobsLoading, setApplicationJobsLoading] = useState(false)
  const [applicationJobsError, setApplicationJobsError] = useState<string | null>(null)
  const [participantUsers, setParticipantUsers] = useState<ParticipantUser[]>([])
  const [participantUsersLoading, setParticipantUsersLoading] = useState(false)
  const [participantUsersError, setParticipantUsersError] = useState<string | null>(null)
  const loadParticipantUsers = useCallback(async () => {
    setParticipantUsersLoading(true)
    setParticipantUsersError(null)
    try {
      const res = await listUsers({ limit: 500, status: 'active' })
      setParticipantUsers(
        (res.results || []).map((u) => ({ id: u.id, name: u.name, email: u.email })).filter((u) => u.email)
      )
    } catch {
      setParticipantUsersError('Could not load users.')
    } finally {
      setParticipantUsersLoading(false)
    }
  }, [])
  useEffect(() => {
    void loadParticipantUsers()
  }, [loadParticipantUsers])

  const loadApplicationJobs = useCallback(async (candidateId: string, preselectJobId?: string) => {
    if (!candidateId) {
      setJobsForCandidate([])
      return
    }
    setApplicationJobsLoading(true)
    setApplicationJobsError(null)
    try {
      const res = await listJobApplications({ candidateId, limit: 200 })
      const list = jobOptionsFromApplications(res.results)
      setJobsForCandidate(list)
      if (preselectJobId && list.some((j) => String(j.id ?? j._id) === preselectJobId)) {
        setSelectedJobId(preselectJobId)
      }
    } catch {
      setApplicationJobsError('Could not load job applications.')
      setJobsForCandidate([])
    } finally {
      setApplicationJobsLoading(false)
    }
  }, [])

  /**
   * Seed the candidate's assigned agent into the agent multi-select.
   * Adds only — never removes a manually-chosen agent. Drops the previous
   * auto-filled agent (if untouched) so a candidate switch cannot leave a stale one.
   */
  const applyCandidateAgent = useCallback(
    async (candidateId: string) => {
      const reqId = ++candidateAgentReqId.current
      if (!candidateId) {
        const prevAuto = autoFilledAgentIdRef.current
        if (prevAuto) setSelectedAgentIds((ids) => ids.filter((id) => id !== prevAuto))
        setAutoFilledAgentId(null)
        autoFilledAgentIdRef.current = null
        onAssignedAgentResolved?.(null)
        return
      }
      let agentId: string | null = null
      let agentRef: { id: string; name: string; email: string } | null = null
      try {
        const detail = await getCandidate(candidateId)
        agentId = detail.assignedAgent?.id ?? null
        agentRef = detail.assignedAgent
          ? { id: detail.assignedAgent.id, name: detail.assignedAgent.name ?? '', email: detail.assignedAgent.email ?? '' }
          : null
      } catch {
        agentId = null
        agentRef = null
      }
      if (reqId !== candidateAgentReqId.current) return
      onAssignedAgentResolved?.(agentRef)
      const prevAuto = autoFilledAgentIdRef.current
      setSelectedAgentIds((ids) => {
        let next = prevAuto ? ids.filter((id) => id !== prevAuto) : ids
        if (agentId && !next.includes(agentId)) next = [agentId, ...next]
        return next
      })
      setAutoFilledAgentId(agentId)
      autoFilledAgentIdRef.current = agentId
    },
    [setSelectedAgentIds, onAssignedAgentResolved]
  )

  /** Marks the prefill payload we've already applied so re-renders (caused by parent clearing prefill, or by
   *  onPrefillConsumed identity churn) don't re-fire DOM writes or double-load the job list. */
  const appliedPrefillRef = useRef<string | null>(null)
  /** Monotonic id so a slow getCandidate response cannot overwrite a newer candidate pick. */
  const candidateAgentReqId = useRef(0)

  useEffect(() => {
    setSelectedCandidateId('')
    setSelectedJobId('')
    setJobsForCandidate([])
    setApplicationJobsError(null)
    appliedPrefillRef.current = null
    setScheduleTimezone('UTC')
    setDateTimeOverlayOpen(false)
    setAutoFilledAgentId(null)
    setDraftPrompt(null)
  }, [formResetKey])

  // Apply context-aware prefill from Applications page action (candidate, job, title, notes, recruiter).
  // Gated on !dropdownsLoading so the recruiter <option> elements exist before we set the value.
  // DOM writes are synchronous because the modal JSX is always mounted (just hidden by Preline) — no RAF needed.
  useEffect(() => {
    if (!prefill || !prefill.candidateId) return
    const key = `${prefill.applicationId ?? ''}|${prefill.candidateId}|${prefill.jobId ?? ''}`
    if (appliedPrefillRef.current === key) return
    if (dropdownsLoading) return
    appliedPrefillRef.current = key

    setSelectedCandidateId(prefill.candidateId)
    void applyCandidateAgent(prefill.candidateId)
    void loadApplicationJobs(prefill.candidateId, prefill.jobId)

    const titleInput = document.querySelector<HTMLInputElement>('#schedule-meeting-title')
    if (titleInput && !titleInput.value.trim() && prefill.suggestedTitle) {
      titleInput.value = prefill.suggestedTitle
    }
    const notesInput = document.querySelector<HTMLTextAreaElement>('#schedule-notes')
    if (notesInput && !notesInput.value.trim() && prefill.suggestedNotes) {
      notesInput.value = prefill.suggestedNotes
    }
    onPrefillConsumed?.()
  }, [prefill, dropdownsLoading, loadApplicationJobs, onPrefillConsumed, applyCandidateAgent])

  useEffect(() => {
    return () => {
      if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current)
    }
  }, [])

  // A non-null createdMeeting means the create succeeded — the draft is spent.
  useEffect(() => {
    if (createdMeeting) clearDraft(draftUserId)
  }, [createdMeeting, draftUserId])

  // The modal is always mounted (Preline toggles the `hidden` class). Watch for
  // it becoming visible, and offer any saved draft for restore at that point.
  useEffect(() => {
    const modalEl = document.getElementById('create-interview-modal')
    if (!modalEl) return
    const check = () => {
      const isOpen = !modalEl.classList.contains('hidden')
      if (isOpen && !createdMeeting) {
        const saved = loadDraft(draftUserId)
        if (saved) setDraftPrompt(saved)
      } else if (!isOpen) {
        setDraftPrompt(null)
      }
    }
    const observer = new MutationObserver(check)
    observer.observe(modalEl, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [draftUserId, createdMeeting])

  const onScheduleCandidateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value
    setSelectedCandidateId(id)
    setSelectedJobId('')
    void loadApplicationJobs(id)
    void applyCandidateAgent(id)
  }
  /** Room-only URL safe to share with anyone (no logged-in user name/email). */
  const shareMeetingUrl = useMemo(() => (createdMeeting?.publicMeetingUrl || '').trim(), [createdMeeting?.publicMeetingUrl])

  /** Same room URL with current user pre-filled for faster join (do not share externally). */
  const personalMeetingUrl = useMemo(() => {
    const base = shareMeetingUrl
    if (!base) return ''
    const { name: joinName, email: joinEmail } = resolvePersonalJoinIdentity(user, createdMeeting?.hosts)
    return appendJoinIdentityToUrl(base, joinName, joinEmail)
  }, [shareMeetingUrl, user, createdMeeting?.hosts])

  const scheduleWallClock = scheduledInterviewAt
    ? utcInstantToWallClock(scheduledInterviewAt, scheduleTimezone)
    : { date: '', time: '' }
  const scheduleDateStr = scheduleWallClock.date
  const scheduleTimeStr = scheduleWallClock.time

  const handleDateTimeConfirm = useCallback(
    (instant: Date, tz: string) => {
      onScheduledInterviewAtChange(instant)
      setScheduleTimezone(tz)
      setDateTimeOverlayOpen(false)
    },
    [onScheduledInterviewAtChange]
  )

  const whenTriggerLabel = scheduledInterviewAt && scheduleDateStr && scheduleTimeStr
    ? `${format(new Date(`${scheduleDateStr}T00:00:00`), 'EEE, d MMM yyyy')} · ${to12Hour(scheduleTimeStr)} (${scheduleTimezone})`
    : ''

  /** Snapshot the whole create form — controlled state + uncontrolled DOM inputs. */
  const buildDraft = useCallback((): InterviewDraftData => {
    const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null
    return {
      title: el<HTMLInputElement>('schedule-meeting-title')?.value ?? '',
      description: el<HTMLTextAreaElement>('schedule-description')?.value ?? '',
      candidateId: selectedCandidateId,
      jobId: selectedJobId,
      timezone: scheduleTimezone,
      scheduledAtIso: scheduledInterviewAt ? scheduledInterviewAt.toISOString() : null,
      durationMinutes: el<HTMLInputElement>('schedule-duration')?.value ?? '60',
      maxParticipants: el<HTMLInputElement>('schedule-max-participants')?.value ?? '10',
      allowGuestJoin: el<HTMLInputElement>('schedule-allow-guest')?.checked ?? false,
      requireApproval: el<HTMLInputElement>('schedule-require-approval')?.checked ?? true,
      interviewType:
        (document.querySelector('input[name="schedule-type"]:checked') as HTMLInputElement | null)?.value ?? 'video',
      hosts,
      emailInvites,
      agentIds: selectedAgentIds,
      notes: el<HTMLTextAreaElement>('schedule-notes')?.value ?? '',
    }
  }, [selectedCandidateId, selectedJobId, scheduleTimezone, scheduledInterviewAt, hosts, emailInvites, selectedAgentIds])

  /** Apply a saved draft into the form — controlled state + uncontrolled DOM inputs. */
  const restoreDraft = useCallback(
    (d: InterviewDraftData) => {
      setSelectedCandidateId(d.candidateId)
      setSelectedJobId(d.jobId)
      setScheduleTimezone(d.timezone)
      onScheduledInterviewAtChange(d.scheduledAtIso ? new Date(d.scheduledAtIso) : null)
      setHosts(d.hosts.length ? d.hosts : [{ nameOrRole: '', email: '' }])
      setEmailInvites(d.emailInvites.length ? d.emailInvites : [''])
      setSelectedAgentIds(d.agentIds)
      if (d.candidateId) {
        void loadApplicationJobs(d.candidateId, d.jobId)
        void applyCandidateAgent(d.candidateId)
      }
      const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null
      const titleEl = el<HTMLInputElement>('schedule-meeting-title')
      if (titleEl) titleEl.value = d.title
      const descEl = el<HTMLTextAreaElement>('schedule-description')
      if (descEl) descEl.value = d.description
      const durEl = el<HTMLInputElement>('schedule-duration')
      if (durEl) durEl.value = d.durationMinutes
      const maxEl = el<HTMLInputElement>('schedule-max-participants')
      if (maxEl) maxEl.value = d.maxParticipants
      const guestEl = el<HTMLInputElement>('schedule-allow-guest')
      if (guestEl) guestEl.checked = d.allowGuestJoin
      const apprEl = el<HTMLInputElement>('schedule-require-approval')
      if (apprEl) apprEl.checked = d.requireApproval
      const notesEl = el<HTMLTextAreaElement>('schedule-notes')
      if (notesEl) notesEl.value = d.notes
      const typeEl = document.querySelector(
        `input[name="schedule-type"][value="${d.interviewType}"]`
      ) as HTMLInputElement | null
      if (typeEl) typeEl.checked = true
      setDraftPrompt(null)
    },
    [
      onScheduledInterviewAtChange,
      setHosts,
      setEmailInvites,
      setSelectedAgentIds,
      loadApplicationJobs,
      applyCandidateAgent,
    ]
  )

  /** True once the user has entered something worth keeping. */
  const draftIsMeaningful = (d: InterviewDraftData): boolean =>
    Boolean(d.title.trim() || d.candidateId || d.scheduledAtIso || d.notes.trim() || d.description.trim())

  /** Debounced autosave — fired by the form's onChange. */
  const handleFormChange = useCallback(() => {
    if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current)
    draftSaveTimer.current = setTimeout(() => {
      const draft = buildDraft()
      if (draftIsMeaningful(draft)) saveDraft(draftUserId, draft)
    }, 500)
  }, [buildDraft, draftUserId])

  /** Discard the offered draft. */
  const discardDraft = useCallback(() => {
    clearDraft(draftUserId)
    setDraftPrompt(null)
  }, [draftUserId])

  const closeCreateInterviewModal = useCallback(() => {
    resetCreateMeetingForm()
    ;(window as any).HSOverlay?.close(document.querySelector('#create-interview-modal'))
  }, [resetCreateMeetingForm])

  /**
   * Quick-fill for instant interview: next time slot, title/description/notes if blank, duration, host defaults.
   * Does not change candidate or job — those stay as the user selected.
   */
  const handleInstantInterviewFill = useCallback(() => {
    const now = new Date()
    const rounded = new Date(now)
    rounded.setSeconds(0, 0)
    // Start at next 15-minute slot with a small future buffer.
    const nextQuarter = Math.ceil((rounded.getMinutes() + 2) / 15) * 15
    rounded.setMinutes(nextQuarter)

    const titleInput = document.querySelector<HTMLInputElement>('#schedule-meeting-title')
    const descInput = document.querySelector<HTMLTextAreaElement>('#schedule-description')
    const durationInput = document.querySelector<HTMLInputElement>('#schedule-duration')
    const maxInput = document.querySelector<HTMLInputElement>('#schedule-max-participants')
    const notesInput = document.querySelector<HTMLTextAreaElement>('#schedule-notes')
    const allowGuest = document.querySelector<HTMLInputElement>('#schedule-allow-guest')
    const requireApproval = document.querySelector<HTMLInputElement>('#schedule-require-approval')
    const videoType = document.querySelector<HTMLInputElement>('input[name="schedule-type"][value="video"]')

    if (titleInput && !titleInput.value.trim()) {
      titleInput.value = `Instant Interview - ${format(rounded, 'MMM d, h:mm a')}`
    }
    if (descInput && !descInput.value.trim()) {
      descInput.value = 'Auto-filled instant interview details.'
    }
    if (durationInput) durationInput.value = '60'
    if (maxInput) maxInput.value = '10'
    if (allowGuest) allowGuest.checked = false
    if (requireApproval) requireApproval.checked = true
    if (videoType) videoType.checked = true
    if (notesInput && !notesInput.value.trim()) notesInput.value = 'Instant interview'

    if (hosts.length === 0 || !hosts[0]?.email?.trim()) {
      const fallbackName = user?.name?.trim() || user?.email?.split('@')[0] || 'Host'
      const fallbackEmail = user?.email?.trim() || ''
      setHosts([{ nameOrRole: fallbackName, email: fallbackEmail }, ...hosts.slice(1)])
    }
    if (emailInvites.length === 1 && !emailInvites[0]?.trim()) {
      setEmailInvites([''])
    }

    onScheduledInterviewAtChange(rounded)
  }, [emailInvites, hosts, onScheduledInterviewAtChange, setEmailInvites, setHosts, user?.email, user?.name])

  return (
    <div id="create-interview-modal" className="hs-overlay hidden ti-modal size-lg !z-[105]" tabIndex={-1} aria-labelledby="create-interview-modal-label" aria-hidden="true">
      <div className="hs-overlay-open:mt-7 ti-modal-box mt-0 ease-out transition-all sm:max-w-2xl">
        <div className="ti-modal-content flex min-h-0 flex-col overflow-hidden border border-defaultborder dark:border-defaultborder/10 rounded-xl shadow-xl">
          <div className="ti-modal-header shrink-0 bg-gradient-to-b from-gray-50 to-gray-50/80 dark:from-black/25 dark:to-black/15 border-b border-defaultborder dark:border-defaultborder/10 px-6 py-4">
            <h3 id="create-interview-modal-label" className="ti-modal-title text-lg font-semibold text-defaulttextcolor dark:text-white flex items-center gap-2">
              <i className="ri-calendar-schedule-line text-primary text-xl transition-transform duration-200 motion-safe:hover:scale-105 motion-reduce:transition-none"></i>
              {createdMeeting ? 'Meeting Created' : 'Schedule Interview'}
            </h3>
            <button
              type="button"
              className="ti-modal-close-btn flex-shrink-0 rounded-md p-0 text-gray-500 transition-colors duration-200 hover:text-gray-700 dark:text-[#8c9097] dark:hover:text-white/80 hover:bg-gray-100 dark:hover:bg-black/40 focus:ring-2 focus:ring-primary/20 focus:ring-offset-0 motion-reduce:transition-none"
              onClick={closeCreateInterviewModal}
              aria-label="Close"
            >
              <i className="ri-close-line text-xl"></i>
            </button>
          </div>
          {createdMeeting ? (
            <MeetingCreatedSuccess
              variant="interview"
              title={createdMeeting.title}
              scheduledAt={createdMeeting.scheduledAt}
              durationMinutes={createdMeeting.durationMinutes}
              meetingId={createdMeeting.meetingId}
              status={createdMeeting.status}
              shareUrl={shareMeetingUrl}
              personalUrl={personalMeetingUrl}
              onClose={closeCreateInterviewModal}
              onAnother={resetCreateMeetingForm}
              joinHref={personalMeetingUrl || shareMeetingUrl || '#'}
            />
          ) : (
            <form className="ti-modal-body !p-0 flex min-h-0 max-h-[min(88vh,46rem)] flex-col overflow-hidden" onSubmit={onSubmit} onChange={handleFormChange} noValidate>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-6 py-5 space-y-5 scroll-smooth pb-6 motion-reduce:scroll-auto">
                {formError && (
                  <div
                    id="schedule-interview-form-error"
                    role="alert"
                    className="rounded-lg border border-danger/25 border-l-4 border-l-danger bg-danger/10 p-3 text-danger text-sm shadow-sm ring-1 ring-danger/10"
                  >
                    {formError}
                  </div>
                )}
                {draftPrompt && (
                  <div
                    role="status"
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/25 bg-primary/[0.06] p-3 text-sm dark:border-primary/40 dark:bg-primary/10"
                  >
                    <span className="flex items-center gap-2 text-defaulttextcolor dark:text-white">
                      <i className="ri-history-line text-primary" aria-hidden />
                      You have an unsaved interview draft.
                    </span>
                    <span className="flex items-center gap-2">
                      <button
                        type="button"
                        className="ti-btn ti-btn-primary !py-1.5 !px-3 !text-xs"
                        onClick={() => restoreDraft(draftPrompt)}
                      >
                        Restore
                      </button>
                      <button
                        type="button"
                        className="ti-btn ti-btn-light !py-1.5 !px-3 !text-xs"
                        onClick={discardDraft}
                      >
                        Discard
                      </button>
                    </span>
                  </div>
                )}

                <p className="flex items-center gap-2 border-b border-defaultborder/50 pb-2.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-primary dark:text-primary/90 dark:border-white/10">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  Candidate &amp; Role
                </p>
                <div>
                  <label htmlFor="schedule-candidate" className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">
                    Candidate <span className="text-xs font-normal text-textmuted dark:text-white/55">(referral leads)</span>
                  </label>
                  <select
                    id="schedule-candidate"
                    className="form-select !py-2 !text-sm w-full border-defaultborder dark:border-defaultborder/10 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    disabled={dropdownsLoading}
                    value={selectedCandidateId}
                    onChange={onScheduleCandidateChange}
                  >
                    <option value="">{dropdownsLoading ? 'Loading...' : 'Select referral lead'}</option>
                    {candidates.map((c) => (
                      <option key={c.id ?? c._id} value={c.id ?? c._id}>
                        {c.fullName}{isPublicEmail(c.email) ? ` - ${c.email}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="schedule-job" className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">
                    Job / Position
                  </label>
                  <p className="text-xs text-textmuted dark:text-white/50 mb-1.5">Shows jobs this candidate has applied to.</p>
                  {applicationJobsError ? (
                    <p className="text-xs text-danger mb-1.5" role="alert">
                      {applicationJobsError}
                    </p>
                  ) : null}
                  <select
                    id="schedule-job"
                    className="form-select !py-2 !text-sm w-full border-defaultborder dark:border-defaultborder/10 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    disabled={dropdownsLoading || !selectedCandidateId || applicationJobsLoading}
                    value={selectedJobId}
                    onChange={(e) => setSelectedJobId(e.target.value)}
                  >
                    <option value="">
                      {!selectedCandidateId
                        ? 'Select a candidate first'
                        : applicationJobsLoading
                          ? 'Loading applications...'
                          : jobsForCandidate.length === 0
                            ? 'No job applications for this candidate'
                            : 'Select a position'}
                    </option>
                    {jobsForCandidate.map((job) => (
                      <option key={job.id ?? job._id} value={String(job.id ?? job._id)}>
                        {job.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="schedule-agents" className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">
                    Agent
                  </label>
                  <AgentMultiSelect
                    id="schedule-agents"
                    options={agents}
                    loading={agentsLoading}
                    error={agentsError}
                    value={selectedAgentIds}
                    onChange={setSelectedAgentIds}
                    autoFilledId={autoFilledAgentId}
                    onRetry={onReloadAgents}
                  />
                </div>

                <p className="flex items-center gap-2 border-b border-defaultborder/50 pb-2.5 pt-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-primary dark:text-primary/90 dark:border-white/10">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  Schedule
                </p>
                <div className="relative overflow-visible rounded-xl border border-defaultborder/70 bg-gradient-to-br from-slate-50/90 via-white to-white p-4 shadow-sm ring-1 ring-black/[0.03] dark:from-white/[0.04] dark:via-bodybg dark:to-bodybg dark:border-defaultborder/20 dark:ring-white/[0.04]">
                  <div className="space-y-3">
                    <div>
                      <span className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white">
                        Date and start time <span className="text-danger">*</span>
                      </span>
                      <span className="mt-0.5 block text-xs text-textmuted dark:text-white/50">
                        One picker — 15-minute slots, Monday-first week, not clipped by the modal
                      </span>
                    </div>
                    <div className="flex justify-start">
                      <button
                        type="button"
                        onClick={handleInstantInterviewFill}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/[0.06] px-2.5 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-primary transition-colors hover:bg-primary/[0.12] dark:border-primary/40 dark:bg-primary/10"
                      >
                        <i className="ri-flashlight-line text-sm" />
                        Instant interview
                      </button>
                    </div>
                    {scheduledInterviewAt ? (
                      <div className="inline-flex w-full max-w-full" aria-live="polite">
                        <span className="inline-flex items-center rounded-lg border border-primary/20 bg-primary/[0.06] px-2.5 py-1.5 text-[0.6875rem] font-medium text-primary shadow-sm dark:border-primary/30 dark:bg-primary/10 dark:text-primary">
                          {format(scheduledInterviewAt, 'MMM d')} · {format(scheduledInterviewAt, 'h:mm a')}
                        </span>
                      </div>
                    ) : null}
                    <div className="isolate min-h-0 w-full">
                      <input type="hidden" id="schedule-date" name="schedule-date" value={scheduleDateStr} readOnly tabIndex={-1} aria-hidden />
                      <input type="hidden" id="schedule-time" name="schedule-time" value={scheduleTimeStr} readOnly tabIndex={-1} aria-hidden />
                      <input type="hidden" id="schedule-timezone" name="schedule-timezone" value={scheduleTimezone} readOnly tabIndex={-1} aria-hidden />
                      <ScheduleInterviewWhenTrigger
                        value={whenTriggerLabel}
                        onClick={() => setDateTimeOverlayOpen(true)}
                        disabled={dropdownsLoading || formLoading}
                      />
                    </div>
                  </div>
                  <p className="mt-3 text-[0.8125rem] leading-relaxed text-textmuted dark:text-white/55">
                    Pick a date and time in the overlay. Past slots for today are disabled.
                  </p>
                </div>
                <div>
                  <label htmlFor="schedule-duration" className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">
                    Duration (minutes) <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    id="schedule-duration"
                    name="schedule-duration"
                    min={1}
                    max={480}
                    defaultValue={60}
                    required
                    className="form-control !py-2 !text-sm w-full border-defaultborder dark:border-defaultborder/10 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-2">
                    Interview Type <span className="text-danger">*</span>
                  </label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
                    {(['Video', 'In-Person', 'Phone'] as const).map((type) => (
                      <label
                        key={type}
                        className="flex min-w-0 cursor-pointer items-center gap-2 rounded-xl border-2 border-defaultborder px-3 py-2 shadow-sm transition-[transform,box-shadow,border-color,background-color] duration-200 ease-out motion-reduce:transition-none dark:border-defaultborder/10 hover:border-primary/45 hover:shadow-md dark:hover:border-primary/50 sm:px-4 sm:py-2.5 has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:shadow-md has-[:checked]:ring-2 has-[:checked]:ring-primary/20 dark:has-[:checked]:bg-primary/10 active:scale-[0.98] motion-reduce:active:scale-100"
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

                <p className="flex items-center gap-2 border-b border-defaultborder/50 pb-2.5 pt-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-primary dark:text-primary/90 dark:border-white/10">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  Meeting Setup
                </p>
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
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" id="schedule-allow-guest" className="form-check-input !w-4 !h-4 text-primary" />
                    <span className="text-sm text-defaulttextcolor dark:text-white">Allow guest join</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" id="schedule-require-approval" defaultChecked className="form-check-input !w-4 !h-4 text-primary" />
                    <span className="text-sm text-defaulttextcolor dark:text-white">Require approval</span>
                  </label>
                </div>
                <div>
                  <label className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-2">
                    Hosts (name/role + email) <span className="text-danger">*</span>
                    <span className="text-xs font-normal text-defaulttextcolor/70 dark:text-white/70 ml-1">— at least one host with email required</span>
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
                      className="ti-btn ti-btn-outline-light inline-flex w-full items-center justify-center gap-1.5 !py-2 !px-3 !text-sm sm:w-auto sm:justify-start transition-[transform,box-shadow] duration-200 motion-reduce:transition-none hover:border-primary/40 hover:bg-primary/[0.04] active:scale-[0.99] motion-reduce:active:scale-100"
                      onClick={() => setHosts((prev) => [...prev, { nameOrRole: '', email: '' }])}
                    >
                      <i className="ri-add-line me-0.5"></i>Add host
                    </button>
                  </div>
                </div>
                <ParticipantInvitesField
                  idPrefix="schedule-interview"
                  invites={emailInvites}
                  onChange={setEmailInvites}
                  users={participantUsers}
                  usersLoading={participantUsersLoading}
                  usersError={participantUsersError}
                  onReloadUsers={loadParticipantUsers}
                />

                <p className="flex items-center gap-2 border-b border-defaultborder/50 pb-2.5 pt-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-primary dark:text-primary/90 dark:border-white/10">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  Notes &amp; Instructions
                </p>
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
              <div className="ti-modal-footer flex shrink-0 flex-col gap-3 border-t border-defaultborder bg-gray-50/95 px-6 py-4 backdrop-blur-sm dark:border-defaultborder/10 dark:bg-black/35">
                {formError && (
                  <div
                    id="schedule-interview-footer-error"
                    role="alert"
                    className="w-full rounded-lg border border-danger/25 border-l-4 border-l-danger bg-danger/10 p-3 text-danger text-sm shadow-sm ring-1 ring-danger/10"
                  >
                    {formError}
                  </div>
                )}
                <div className="flex w-full flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  className="ti-btn ti-btn-light order-2 !py-2 !px-4 !text-sm font-medium transition-transform duration-150 motion-reduce:transition-none sm:order-1 active:scale-[0.98] motion-reduce:active:scale-100"
                  onClick={closeCreateInterviewModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  aria-busy={formLoading}
                  className="ti-btn ti-btn-primary order-1 min-w-[11rem] !py-2.5 !px-5 !text-sm font-medium shadow-md shadow-primary/15 transition-[transform,box-shadow] duration-200 motion-reduce:transition-none sm:order-2 enabled:hover:shadow-lg enabled:hover:shadow-primary/25 disabled:opacity-80 active:scale-[0.98] motion-reduce:active:scale-100"
                >
                  {formLoading ? (
                    <>
                      <span
                        className="me-1.5 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent motion-reduce:animate-none"
                        role="status"
                        aria-label="Creating interview"
                      />
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
              </div>
              <InterviewDateTimeOverlay
                open={dateTimeOverlayOpen}
                value={scheduledInterviewAt}
                timezone={scheduleTimezone}
                onConfirm={handleDateTimeConfirm}
                onClose={() => setDateTimeOverlayOpen(false)}
              />
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
