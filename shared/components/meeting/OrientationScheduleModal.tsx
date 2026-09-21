'use client'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { format } from 'date-fns'
import FocusLock from 'react-focus-lock'
import DateTimeOverlay from '@/shared/components/datetime/DateTimeOverlay'
import ScheduleWhenTrigger from '@/shared/components/datetime/ScheduleWhenTrigger'
import { to12Hour } from '@/shared/components/datetime/daySlots'
import MeetingCreatedSuccess from '@/shared/components/meeting/MeetingCreatedSuccess'
import ParticipantInvitesField, { type ParticipantUser } from '@/shared/components/meeting/ParticipantInvitesField'
import { listAllUsers, pickOfficialEmail, hasMeetingEmailMuted } from '@/shared/lib/api/users'
import { getViewerTimezone, getZoneAbbreviation, utcInstantToWallClock, normalizeTimezone } from '@/shared/lib/timezone'
import type { InternalMeeting } from '@/shared/lib/api/internal-meetings'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const normEmail = (s: string) => s.trim().toLowerCase()

export interface OrientationScheduleSubmit {
  instant: Date
  timezone: string
  durationMinutes: number
  extraInvites: string[]
}

export interface OrientationScheduleModalProps {
  open: boolean
  mode: 'schedule' | 'reschedule'
  candidateName: string
  candidateEmail: string
  hostName: string
  hostEmail: string
  joiningYmd: string
  composeTitle: (instant: Date, timezone: string) => string
  initialInstant: Date | null
  initialTimezone: string
  initialExtraInvites?: string[]
  loading: boolean
  formError: string | null
  createdMeeting: InternalMeeting | null
  onClose: () => void
  onSubmit: (payload: OrientationScheduleSubmit) => void
}

export default function OrientationScheduleModal({
  open,
  mode,
  candidateName,
  candidateEmail,
  hostName,
  hostEmail,
  joiningYmd,
  composeTitle,
  initialInstant,
  initialTimezone,
  initialExtraInvites = [],
  loading,
  formError,
  createdMeeting,
  onClose,
  onSubmit,
}: OrientationScheduleModalProps) {
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null)
  const [timezone, setTimezone] = useState(() => getViewerTimezone())
  const [dateTimeOverlayOpen, setDateTimeOverlayOpen] = useState(false)
  const [durationMinutes, setDurationMinutes] = useState(60)
  const [extraInvites, setExtraInvites] = useState<string[]>([])
  const [participantUsers, setParticipantUsers] = useState<ParticipantUser[]>([])
  const [participantUsersLoading, setParticipantUsersLoading] = useState(false)
  const [participantUsersError, setParticipantUsersError] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  const loadParticipantUsers = useCallback(async () => {
    setParticipantUsersLoading(true)
    setParticipantUsersError(null)
    try {
      const users = await listAllUsers({ status: 'active' })
      setParticipantUsers(
        users
          .map((u) => ({
            id: u.id,
            name: u.name,
            email: pickOfficialEmail(u),
            muted: hasMeetingEmailMuted(u),
          }))
          .filter((u) => u.email)
      )
    } catch {
      setParticipantUsersError('Could not load users.')
    } finally {
      setParticipantUsersLoading(false)
    }
  }, [])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    setScheduledAt(initialInstant)
    setTimezone(normalizeTimezone(initialTimezone || getViewerTimezone()))
    setDurationMinutes(60)
    setExtraInvites(initialExtraInvites)
    setDateTimeOverlayOpen(false)
    setLocalError(null)
    void loadParticipantUsers()
  }, [open, initialInstant, initialTimezone, initialExtraInvites, loadParticipantUsers])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (dateTimeOverlayOpen) return
      onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, dateTimeOverlayOpen, onClose])

  const scheduleWallClock = scheduledAt
    ? utcInstantToWallClock(scheduledAt, timezone)
    : { date: '', time: '' }
  const scheduleDateStr = scheduleWallClock.date
  const scheduleTimeStr = scheduleWallClock.time
  const whenTriggerLabel =
    scheduledAt && scheduleDateStr && scheduleTimeStr
      ? `${format(new Date(`${scheduleDateStr}T00:00:00`), 'EEE, d MMM yyyy')} · ${to12Hour(scheduleTimeStr)} (${getZoneAbbreviation(timezone, scheduledAt)})`
      : ''

  const handleDateTimeConfirm = useCallback((instant: Date, tz: string) => {
    setScheduledAt(instant)
    setTimezone(tz)
    setDateTimeOverlayOpen(false)
    setLocalError(null)
  }, [])

  /** Same fill as CreateInterviewModal / CreateInternalMeetingModal: next 15-minute slot. */
  const handleInstantMeetingFill = useCallback(() => {
    const rounded = new Date()
    rounded.setSeconds(0, 0)
    const nextQuarter = Math.ceil((rounded.getMinutes() + 2) / 15) * 15
    rounded.setMinutes(nextQuarter)
    setScheduledAt(rounded)
    setTimezone(getViewerTimezone())
    setDurationMinutes(60)
    setLocalError(null)
  }, [])

  const titlePreview = useMemo(() => {
    const instant = scheduledAt || initialInstant
    if (!instant) return '—'
    return composeTitle(instant, timezone)
  }, [scheduledAt, initialInstant, timezone, composeTitle])
  const pickerUsers = useMemo(() => {
    const reserved = new Set([normEmail(candidateEmail), normEmail(hostEmail)].filter(Boolean))
    return participantUsers.filter((u) => !reserved.has(normEmail(u.email)))
  }, [participantUsers, candidateEmail, hostEmail])
  const headingId = 'orientation-schedule-modal-label'
  const displayError = localError || formError
  const isReschedule = mode === 'reschedule'
  const heading = createdMeeting
    ? 'Meeting scheduled'
    : isReschedule
      ? 'Reschedule orientation meeting'
      : 'Schedule orientation meeting'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!scheduledAt) {
      setLocalError('Choose a date and start time.')
      return
    }
    const dur = Number(durationMinutes)
    if (!Number.isInteger(dur) || dur < 1 || dur > 480) {
      setLocalError('Duration must be between 1 and 480 minutes.')
      return
    }
    const reserved = new Set([normEmail(candidateEmail), normEmail(hostEmail)].filter(Boolean))
    const extras: string[] = []
    for (const raw of extraInvites) {
      const e = String(raw || '').trim()
      if (!e) continue
      if (!EMAIL_RE.test(e)) {
        setLocalError('Enter a valid email for each extra participant.')
        return
      }
      const n = normEmail(e)
      if (reserved.has(n) || extras.includes(n)) continue
      extras.push(n)
    }
    setLocalError(null)
    onSubmit({ instant: scheduledAt, timezone: normalizeTimezone(timezone), durationMinutes: dur, extraInvites: extras })
  }

  const shareUrl = (createdMeeting?.publicMeetingUrl || '').trim()

  if (!open || !mounted) return null

  const node = (
    <div
      className="fixed inset-0 z-[105] flex items-start justify-center overflow-y-auto bg-black/50 p-2 sm:items-center sm:p-4"
      onClick={() => {
        if (dateTimeOverlayOpen) return
        onClose()
      }}
    >
      <FocusLock returnFocus>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={headingId}
          className="ti-modal-box mx-auto mt-0 w-full max-w-2xl px-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] pt-[max(0.5rem,env(safe-area-inset-top,0px))] sm:m-3 sm:px-0 sm:pb-0 sm:pt-0"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="ti-modal-content flex min-h-0 max-h-[calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-1rem)] w-full flex-col overflow-hidden rounded-xl border border-defaultborder bg-white shadow-xl dark:border-defaultborder/10 dark:bg-bodybg sm:max-h-[min(calc(100dvh-2rem),46rem)]">
            <div className="ti-modal-header flex shrink-0 items-center justify-between gap-3 border-b border-defaultborder bg-gray-50 px-6 py-4 dark:border-defaultborder/10 dark:bg-bodybg">
              <h3
                id={headingId}
                className="ti-modal-title flex min-w-0 items-center gap-2 text-lg font-semibold text-defaulttextcolor dark:text-white"
              >
                <i className="ri-calendar-schedule-line text-xl text-primary transition-transform duration-200 motion-safe:hover:scale-105 motion-reduce:transition-none" aria-hidden />
                {heading}
              </h3>
              <button
                type="button"
                className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md text-textmuted transition-colors duration-200 hover:bg-gray-100 hover:text-defaulttextcolor focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-0 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
                onClick={onClose}
                aria-label="Close"
              >
                <i className="ri-close-line text-xl" aria-hidden />
              </button>
            </div>

            {createdMeeting ? (
              <MeetingCreatedSuccess
                variant="meeting"
                title={createdMeeting.title}
                scheduledAt={createdMeeting.scheduledAt}
                timezone={createdMeeting.timezone}
                updatedAt={createdMeeting.updatedAt}
                durationMinutes={createdMeeting.durationMinutes}
                meetingId={createdMeeting.meetingId}
                status={createdMeeting.status}
                hosts={createdMeeting.hosts}
                shareUrl={shareUrl}
                personalUrl={shareUrl}
                onClose={onClose}
                onAnother={onClose}
                joinHref={shareUrl || '#'}
              />
            ) : (
              <form
                className="ti-modal-body !p-0 flex min-h-0 flex-1 flex-col overflow-hidden bg-white dark:bg-bodybg"
                onSubmit={handleSubmit}
                noValidate
                aria-describedby={displayError ? 'orientation-schedule-form-error' : undefined}
              >
                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-y-contain px-6 py-5 pb-28 scroll-smooth text-defaulttextcolor motion-reduce:scroll-auto dark:text-white">
                  {displayError ? (
                    <div
                      id="orientation-schedule-form-error"
                      role="alert"
                      className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger"
                    >
                      {displayError}
                    </div>
                  ) : null}

                  <p className="flex items-center gap-2 border-b border-defaultborder/50 pb-2.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-primary dark:border-white/10 dark:text-primary/90">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                    Candidate &amp; host
                  </p>
                  <div>
                    <p className="form-label mb-1.5 block text-sm font-medium text-defaulttextcolor dark:text-white">
                      Candidate
                    </p>
                    <p className="mb-0 text-sm text-defaulttextcolor dark:text-white">
                      {candidateName || '—'}
                      {candidateEmail ? (
                        <span className="text-textmuted dark:text-white/70"> — {candidateEmail}</span>
                      ) : null}
                    </p>
                  </div>
                  <div>
                    <p className="form-label mb-1.5 block text-sm font-medium text-defaulttextcolor dark:text-white">
                      Host
                    </p>
                    <p className="mb-0 text-sm text-defaulttextcolor dark:text-white">
                      {hostName || '—'}
                      {hostEmail ? (
                        <span className="text-textmuted dark:text-white/70"> — {hostEmail}</span>
                      ) : null}
                    </p>
                  </div>
                  {joiningYmd ? (
                    <p className="mb-0 text-xs text-textmuted dark:text-white/70">
                      Joining date {format(new Date(`${joiningYmd}T12:00:00`), 'd MMM yyyy')} is the onboarding target. The meeting title uses the date and time you pick below.
                    </p>
                  ) : null}

                  <p className="flex items-center gap-2 border-b border-defaultborder/50 pb-2.5 pt-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-primary dark:border-white/10 dark:text-primary/90">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                    Participants
                  </p>
                  <div>
                    <p className="form-label mb-1.5 block text-sm font-medium text-defaulttextcolor dark:text-white">
                      Employee
                    </p>
                    <p className="mb-2 inline-flex max-w-full items-center rounded-full border border-primary/20 bg-primary/[0.06] px-2.5 py-1.5 text-xs font-medium text-primary dark:border-primary/30 dark:bg-primary/10">
                      <span className="truncate">
                        {candidateName || '—'}
                        {candidateEmail ? ` — ${candidateEmail}` : ''}
                      </span>
                      <span className="ms-1.5 shrink-0 text-[0.65rem] uppercase tracking-wide text-primary/80">
                        always invited
                      </span>
                    </p>
                    <p className="mb-3 text-xs text-textmuted dark:text-white/70">
                      The employee cannot be removed. Add extra people from users or as guest emails.
                    </p>
                    <ParticipantInvitesField
                      idPrefix="orientation-schedule"
                      invites={extraInvites}
                      onChange={setExtraInvites}
                      users={pickerUsers}
                      usersLoading={participantUsersLoading}
                      usersError={participantUsersError}
                      onReloadUsers={loadParticipantUsers}
                    />
                  </div>

                  <p className="flex items-center gap-2 border-b border-defaultborder/50 pb-2.5 pt-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-primary dark:border-white/10 dark:text-primary/90">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                    Schedule
                  </p>
                  <div className="relative overflow-visible rounded-xl border border-defaultborder/70 bg-gray-50 p-4 dark:border-defaultborder/20 dark:bg-white/[0.04]">
                    <div className="space-y-3">
                      <div>
                        <span className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white">
                          Date and start time <span className="text-danger">*</span>
                        </span>
                        <span className="mt-0.5 block text-xs text-textmuted dark:text-white/70">
                          Opens a full-screen picker with 15-minute slots.
                        </span>
                      </div>
                      <div className="flex justify-start">
                        <button
                          type="button"
                          onClick={handleInstantMeetingFill}
                          disabled={loading}
                          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/[0.06] px-2.5 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-primary transition-colors hover:bg-primary/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60 dark:border-primary/40 dark:bg-primary/10"
                        >
                          <i className="ri-flashlight-line text-sm" aria-hidden />
                          Instant meeting
                        </button>
                      </div>
                      {scheduledAt && scheduleDateStr && scheduleTimeStr ? (
                        <div className="inline-flex w-full max-w-full" aria-live="polite">
                          <span className="inline-flex items-center rounded-lg border border-primary/20 bg-primary/[0.06] px-2.5 py-1.5 text-[0.6875rem] font-medium text-primary shadow-sm dark:border-primary/30 dark:bg-primary/10 dark:text-primary">
                            {format(new Date(`${scheduleDateStr}T00:00:00`), 'MMM d')} · {to12Hour(scheduleTimeStr)}
                          </span>
                        </div>
                      ) : null}
                      <div className="isolate min-h-0 w-full">
                        <ScheduleWhenTrigger
                          id="orientation-schedule-when-trigger"
                          value={whenTriggerLabel}
                          onClick={() => setDateTimeOverlayOpen(true)}
                          disabled={loading}
                          ariaLabel={
                            whenTriggerLabel
                              ? `Orientation date and time: ${whenTriggerLabel}`
                              : 'Choose orientation date and time'
                          }
                        />
                      </div>
                    </div>
                    <p className="mt-3 text-[0.8125rem] leading-relaxed text-textmuted dark:text-white/70">
                      Pick a date and time in the overlay. Past slots for today are disabled.
                    </p>
                  </div>
                  <div>
                    <label
                      htmlFor="orientation-schedule-duration"
                      className="form-label mb-1.5 block text-sm font-medium text-defaulttextcolor dark:text-white"
                    >
                      Duration (minutes) <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      id="orientation-schedule-duration"
                      min={1}
                      max={480}
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Number(e.target.value) || 60)}
                      required
                      aria-invalid={durationMinutes < 1 || durationMinutes > 480}
                      className="form-control !py-2 !text-sm min-h-11 w-full rounded-lg border-defaultborder focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-defaultborder/10"
                    />
                  </div>
                  <div>
                    <p className="form-label mb-1.5 block text-sm font-medium text-defaulttextcolor dark:text-white">
                      Meeting title
                    </p>
                    <p className="mb-0 text-sm text-defaulttextcolor dark:text-white">{titlePreview || '—'}</p>
                  </div>
                </div>
                <div className="ti-modal-footer flex shrink-0 flex-col gap-3 border-t border-defaultborder bg-gray-50 px-6 py-4 dark:border-defaultborder/10 dark:bg-bodybg">
                  {displayError ? (
                    <div
                      role="alert"
                      className="w-full rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger"
                    >
                      {displayError}
                    </div>
                  ) : null}
                  <div className="flex w-full flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      className="ti-btn ti-btn-light order-2 min-h-11 !py-2 !px-4 !text-sm font-medium transition-transform duration-150 motion-reduce:transition-none sm:order-1 active:scale-[0.98] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      onClick={onClose}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      aria-busy={loading}
                      className="ti-btn ti-btn-primary order-1 min-h-11 min-w-[11rem] !py-2.5 !px-5 !text-sm font-medium shadow-md shadow-primary/15 transition-[transform,box-shadow] duration-200 motion-reduce:transition-none sm:order-2 enabled:hover:shadow-lg enabled:hover:shadow-primary/25 disabled:opacity-80 active:scale-[0.98] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      {loading ? (
                        <>
                          <span
                            className="me-1.5 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent motion-reduce:animate-none"
                            role="status"
                            aria-label={isReschedule ? 'Saving' : 'Scheduling'}
                          />
                          {isReschedule ? 'Saving…' : 'Creating...'}
                        </>
                      ) : (
                        <>
                          <i className="ri-check-line me-1.5 align-middle" aria-hidden />
                          {isReschedule ? 'Reschedule' : 'Schedule orientation meeting'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <DateTimeOverlay
                  title="Select orientation date & time"
                  ariaLabel="Select orientation date and time"
                  open={dateTimeOverlayOpen}
                  value={scheduledAt}
                  timezone={timezone}
                  onConfirm={handleDateTimeConfirm}
                  onClose={() => setDateTimeOverlayOpen(false)}
                />
              </form>
            )}
          </div>
        </div>
      </FocusLock>
    </div>
  )

  return createPortal(node, document.body)
}
