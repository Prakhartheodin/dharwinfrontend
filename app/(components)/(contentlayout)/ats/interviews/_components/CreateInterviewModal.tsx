"use client"
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { format } from 'date-fns'
import { useAuth } from '@/shared/contexts/auth-context'
import { appendJoinIdentityToUrl } from '@/shared/lib/join-room-url'
import type { Meeting } from '@/shared/lib/api/meetings'
import type { Job } from '@/shared/lib/api/jobs'
import type { CandidateListItem } from '@/shared/lib/api/candidates'
import { listJobApplications, type JobApplication } from '@/shared/lib/api/jobApplications'
import type { User } from '@/shared/lib/types'

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

const DatePicker = dynamic(() => import('react-datepicker').then((m) => m.default), { ssr: false })

type WhenTriggerProps = { value?: string; onClick?: () => void; disabled?: boolean }

/** Custom trigger for react-datepicker (must forward ref). */
const ScheduleInterviewWhenTrigger = React.forwardRef<HTMLButtonElement, WhenTriggerProps>(
  function ScheduleInterviewWhenTrigger({ value, onClick, disabled }, ref) {
    return (
      <button
        type="button"
        ref={ref}
        onClick={onClick}
        disabled={disabled}
        id="schedule-when-trigger"
        className="group flex w-full items-center gap-3 rounded-xl border border-defaultborder bg-white py-2.5 pl-3.5 pr-12 text-left text-sm shadow-sm transition-[border-color,box-shadow,transform] duration-200 ease-out hover:border-primary/35 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none dark:border-defaultborder/10 dark:bg-bodybg dark:focus-visible:ring-offset-bodybg active:scale-[0.99] motion-reduce:active:scale-100"
        aria-haspopup="dialog"
        aria-expanded={undefined}
        aria-label={value ? `Interview date and time: ${value}` : 'Choose interview date and time'}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/[0.08] text-primary transition-transform duration-200 motion-reduce:transition-none group-hover:scale-105 motion-reduce:group-hover:scale-100 dark:bg-primary/15">
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
)
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
  recruiters: User[]
  hosts: { nameOrRole: string; email: string }[]
  setHosts: React.Dispatch<React.SetStateAction<{ nameOrRole: string; email: string }[]>>
  emailInvites: string[]
  setEmailInvites: React.Dispatch<React.SetStateAction<string[]>>
  /** Local combined date+time for the schedule form (owned by parent so reset/close clears reliably). */
  scheduledInterviewAt: Date | null
  onScheduledInterviewAtChange: (value: Date | null) => void
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
  recruiters,
  hosts,
  setHosts,
  emailInvites,
  setEmailInvites,
  scheduledInterviewAt,
  onScheduledInterviewAtChange,
}: CreateInterviewModalProps) {
  const { user } = useAuth()
  const [selectedCandidateId, setSelectedCandidateId] = useState('')
  const [selectedJobId, setSelectedJobId] = useState('')
  const [jobsForCandidate, setJobsForCandidate] = useState<Job[]>([])
  const [applicationJobsLoading, setApplicationJobsLoading] = useState(false)
  const [applicationJobsError, setApplicationJobsError] = useState<string | null>(null)

  const loadApplicationJobs = useCallback(async (candidateId: string) => {
    if (!candidateId) {
      setJobsForCandidate([])
      return
    }
    setApplicationJobsLoading(true)
    setApplicationJobsError(null)
    try {
      const res = await listJobApplications({ candidateId, limit: 200 })
      setJobsForCandidate(jobOptionsFromApplications(res.results))
    } catch {
      setApplicationJobsError('Could not load job applications.')
      setJobsForCandidate([])
    } finally {
      setApplicationJobsLoading(false)
    }
  }, [])

  useEffect(() => {
    setSelectedCandidateId('')
    setSelectedJobId('')
    setJobsForCandidate([])
    setApplicationJobsError(null)
  }, [formResetKey])

  const onScheduleCandidateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value
    setSelectedCandidateId(id)
    setSelectedJobId('')
    void loadApplicationJobs(id)
  }
  /** Room-only URL safe to share with anyone (no logged-in user name/email). */
  const shareMeetingUrl = useMemo(() => (createdMeeting?.publicMeetingUrl || '').trim(), [createdMeeting?.publicMeetingUrl])

  /** Same room URL with current user pre-filled for faster join (do not share externally). */
  const personalMeetingUrl = useMemo(() => {
    const base = shareMeetingUrl
    if (!base) return ''
    const joinName = (user?.name?.trim() || user?.email?.split('@')[0] || '').trim()
    const joinEmail = user?.email?.trim() || ''
    return appendJoinIdentityToUrl(base, joinName, joinEmail)
  }, [shareMeetingUrl, user?.name, user?.email])

  const startOfToday = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const filterTime = useCallback((time: Date) => time.getTime() > Date.now() - 60_000, [])

  const scheduleDateStr = scheduledInterviewAt ? format(scheduledInterviewAt, 'yyyy-MM-dd') : ''
  const scheduleTimeStr = scheduledInterviewAt ? format(scheduledInterviewAt, 'HH:mm') : ''

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
    const recruiterSelect = document.querySelector<HTMLSelectElement>('#schedule-recruiter')
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
    if (allowGuest) allowGuest.checked = true
    if (requireApproval) requireApproval.checked = false
    if (videoType) videoType.checked = true
    if (notesInput && !notesInput.value.trim()) notesInput.value = 'Instant interview'

    if (recruiterSelect && !recruiterSelect.value && recruiterSelect.options.length > 1) {
      const selfByEmail = recruiters.find((r) => r.email?.toLowerCase() === user?.email?.toLowerCase())
      recruiterSelect.value = selfByEmail?.id || recruiterSelect.options[1].value
    }

    if (hosts.length === 0 || !hosts[0]?.email?.trim()) {
      const fallbackName = user?.name?.trim() || user?.email?.split('@')[0] || 'Host'
      const fallbackEmail = user?.email?.trim() || ''
      setHosts([{ nameOrRole: fallbackName, email: fallbackEmail }, ...hosts.slice(1)])
    }
    if (emailInvites.length === 1 && !emailInvites[0]?.trim()) {
      setEmailInvites([''])
    }

    onScheduledInterviewAtChange(rounded)
  }, [emailInvites, hosts, onScheduledInterviewAtChange, recruiters, setEmailInvites, setHosts, user?.email, user?.name])

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
            <div className="ti-modal-body flex min-h-0 max-h-[min(88vh,40rem)] flex-col overflow-hidden px-6 py-0">
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain py-5 scroll-smooth motion-reduce:scroll-auto">
              <div className="text-center mb-6">
                <div className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success shadow-inner ring-2 ring-success/30 motion-safe:transition-transform motion-safe:duration-300 motion-reduce:transition-none">
                  <i className="ri-check-double-line text-2xl"></i>
                </div>
                <h4 className="text-lg font-semibold text-defaulttextcolor dark:text-white mb-1">Meeting Created Successfully!</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">{createdMeeting.title}</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="form-label block text-xs font-medium text-defaulttextcolor dark:text-white mb-1">
                    Share link
                  </label>
                  <p className="text-[0.6875rem] text-gray-500 dark:text-gray-400 mb-1.5">
                    Send this link to guests — it does not include your name or email.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={shareMeetingUrl}
                      className="form-control !py-2 !text-sm flex-1 border-defaultborder dark:border-defaultborder/10 rounded-lg bg-gray-50 dark:bg-black/20"
                      aria-label="Shareable meeting link without host identity"
                    />
                    <button
                      type="button"
                      className="ti-btn ti-btn-primary !py-2 !px-3 !text-sm"
                      onClick={() => {
                        if (shareMeetingUrl) {
                          void navigator.clipboard.writeText(shareMeetingUrl)
                        }
                      }}
                    >
                      <i className="ri-share-line me-1"></i>Copy
                    </button>
                  </div>
                </div>
                {personalMeetingUrl && personalMeetingUrl !== shareMeetingUrl && (
                  <div>
                    <label className="form-label block text-xs font-medium text-defaulttextcolor dark:text-white mb-1">
                      Your join link
                    </label>
                    <p className="text-[0.6875rem] text-gray-500 dark:text-gray-400 mb-1.5">
                      Includes your display name and email for a quicker join — keep this for yourself.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={personalMeetingUrl}
                        className="form-control !py-2 !text-sm flex-1 border-defaultborder dark:border-defaultborder/10 rounded-lg bg-gray-50 dark:bg-black/20"
                        aria-label="Personal meeting link with your name and email"
                      />
                      <button
                        type="button"
                        className="ti-btn ti-btn-outline-primary !py-2 !px-3 !text-sm"
                        onClick={() => {
                          void navigator.clipboard.writeText(personalMeetingUrl)
                        }}
                      >
                        <i className="ri-file-copy-line me-1"></i>Copy
                      </button>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Meeting ID</span>
                    <p className="font-medium text-defaulttextcolor dark:text-white">{createdMeeting.meetingId}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Status</span>
                    <p className="font-medium text-defaulttextcolor dark:text-white capitalize">{createdMeeting.status}</p>
                  </div>
                </div>
              </div>
              </div>
              <div className="shrink-0 border-t border-defaultborder dark:border-defaultborder/10 bg-gray-50/95 px-6 py-4 backdrop-blur-sm dark:bg-black/30">
                <div className="flex flex-wrap gap-2 justify-end">
                <button
                  type="button"
                  className="ti-btn ti-btn-light !py-2 !px-4 !text-sm font-medium transition-transform duration-150 motion-reduce:transition-none active:scale-[0.98] motion-reduce:active:scale-100"
                  onClick={closeCreateInterviewModal}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="ti-btn ti-btn-outline-primary !py-2 !px-4 !text-sm font-medium transition-transform duration-150 motion-reduce:transition-none active:scale-[0.98] motion-reduce:active:scale-100"
                  onClick={resetCreateMeetingForm}
                >
                  <i className="ri-add-line me-1.5"></i>Create Another Meeting
                </button>
                <a
                  href={personalMeetingUrl || shareMeetingUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ti-btn ti-btn-primary !py-2 !px-4 !text-sm font-medium transition-transform duration-150 motion-reduce:transition-none active:scale-[0.98] motion-reduce:active:scale-100"
                >
                  <i className="ri-vidicon-line me-1.5"></i>Join Meeting
                </a>
                </div>
              </div>
            </div>
          ) : (
            <form className="ti-modal-body !p-0 flex min-h-0 max-h-[min(88vh,46rem)] flex-col overflow-hidden" onSubmit={onSubmit} noValidate>
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
                <p className="flex items-center gap-2 border-b border-defaultborder/50 pb-2.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-primary dark:text-primary/90 dark:border-white/10">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary motion-safe:transition-opacity motion-safe:duration-300" aria-hidden />
                  Details
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
                        {c.fullName} - {c.email}
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
                <p className="flex items-center gap-2 border-b border-defaultborder/50 pb-2.5 pt-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-primary dark:text-primary/90 dark:border-white/10">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  When
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
                      <DatePicker
                        selected={scheduledInterviewAt}
                        onChange={(d: Date | null) => onScheduledInterviewAtChange(d)}
                        showTimeSelect
                        timeIntervals={15}
                        timeCaption="Start"
                        dateFormat="EEE, MMM d, yyyy h:mm aa"
                        minDate={startOfToday}
                        filterTime={filterTime}
                        withPortal
                        shouldCloseOnSelect={false}
                        showMonthDropdown
                        showYearDropdown
                        dropdownMode="select"
                        calendarStartDay={1}
                        todayButton="Today"
                        isClearable
                        disabled={dropdownsLoading || formLoading}
                        popperClassName="!z-[130]"
                        popperProps={{ strategy: 'fixed' }}
                        calendarClassName="schedule-interview-dp-cal"
                        wrapperClassName="schedule-interview-dp-wrap block w-full"
                        customInput={<ScheduleInterviewWhenTrigger disabled={dropdownsLoading || formLoading} />}
                      />
                    </div>
                  </div>
                  <p className="mt-3 text-[0.8125rem] leading-relaxed text-textmuted dark:text-white/55">
                    Past times today are hidden. Use <span className="font-medium text-defaulttextcolor/85 dark:text-white/75">Clear</span> on the
                    calendar to reset.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                </div>
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" id="schedule-allow-guest" defaultChecked className="form-check-input !w-4 !h-4 text-primary" />
                    <span className="text-sm text-defaulttextcolor dark:text-white">Allow guest join</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" id="schedule-require-approval" className="form-check-input !w-4 !h-4 text-primary" />
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
                <div>
                  <label className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-2">
                    Email invites
                  </label>
                  <div className="space-y-2">
                    {emailInvites.map((email, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          type="email"
                          placeholder="email@example.com"
                          value={email}
                          onChange={(e) => {
                            const next = [...emailInvites]
                            next[i] = e.target.value
                            setEmailInvites(next)
                          }}
                          className="form-control !py-2 !text-sm flex-1 border-defaultborder dark:border-defaultborder/10 rounded-lg"
                        />
                        <button
                          type="button"
                          className="ti-btn ti-btn-light !py-2 !px-2"
                          onClick={() => setEmailInvites((prev) => prev.filter((_, j) => j !== i))}
                          aria-label="Remove"
                        >
                          <i className="ri-close-line"></i>
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="ti-btn ti-btn-outline-light inline-flex w-full items-center justify-center gap-1.5 !py-2 !px-3 !text-sm sm:w-auto sm:justify-start transition-[transform,box-shadow] duration-200 motion-reduce:transition-none hover:border-primary/40 hover:bg-primary/[0.04] active:scale-[0.99] motion-reduce:active:scale-100"
                      onClick={() => setEmailInvites((prev) => [...prev, ''])}
                    >
                      <i className="ri-add-line me-0.5"></i>Add email
                    </button>
                  </div>
                </div>
                <div>
                  <label className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-2">
                    Interview Type <span className="text-danger">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    {(['Video', 'In-Person', 'Phone'] as const).map((type) => (
                      <label
                        key={type}
                        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-xl border-2 border-defaultborder px-3 py-2 shadow-sm transition-[transform,box-shadow,border-color,background-color] duration-200 ease-out motion-reduce:transition-none dark:border-defaultborder/10 hover:border-primary/45 hover:shadow-md dark:hover:border-primary/50 sm:flex-initial sm:px-4 sm:py-2.5 has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:shadow-md has-[:checked]:ring-2 has-[:checked]:ring-primary/20 dark:has-[:checked]:bg-primary/10 active:scale-[0.98] motion-reduce:active:scale-100"
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
                <div>
                  <label htmlFor="schedule-recruiter" className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">
                    Recruiter
                  </label>
                  <select
                    id="schedule-recruiter"
                    className="form-select !py-2 !text-sm w-full border-defaultborder dark:border-defaultborder/10 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    disabled={dropdownsLoading}
                  >
                    <option value="">{dropdownsLoading ? 'Loading...' : 'Select recruiter'}</option>
                    {recruiters.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name ?? r.email} - {r.email}
                      </option>
                    ))}
                  </select>
                </div>
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
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
