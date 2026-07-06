'use client'
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { format } from 'date-fns'
import FocusLock from 'react-focus-lock'
import TimezoneSelect from './TimezoneSelect'
import { buildDaySlots } from './interviewSlots'
import {
  utcInstantToWallClock,
  wallClockToUtc,
  getZoneOffsetLabel,
  normalizeTimezone,
} from '@/shared/lib/timezone'

const DatePicker = dynamic(() => import('react-datepicker').then((m) => m.default), { ssr: false })

export interface InterviewDateTimeOverlayProps {
  open: boolean
  /** Committed selection (UTC instant) or null. */
  value: Date | null
  /** Committed IANA timezone. */
  timezone: string
  /** Confirm: emits the chosen UTC instant + timezone. */
  onConfirm: (instant: Date, timezone: string) => void
  /** Cancel / dismiss without changing the committed selection. */
  onClose: () => void
}

const startOfToday = (): Date => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export default function InterviewDateTimeOverlay({
  open, value, timezone, onConfirm, onClose,
}: InterviewDateTimeOverlayProps) {
  const [draftTz, setDraftTz] = useState(() => normalizeTimezone(timezone))
  const [draftDate, setDraftDate] = useState('')
  const [draftTime, setDraftTime] = useState('')
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM')

  useLayoutEffect(() => {
    if (!open) return
    const tz = normalizeTimezone(timezone)
    setDraftTz(tz)
    if (value) {
      const wc = utcInstantToWallClock(value, tz)
      setDraftDate(wc.date)
      setDraftTime(wc.time)
      setPeriod(parseInt(wc.time.slice(0, 2), 10) < 12 ? 'AM' : 'PM')
    } else {
      setDraftDate('')
      setDraftTime('')
      setPeriod('AM')
    }
  }, [open, value, timezone])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  const slots = useMemo(
    () => buildDaySlots(draftDate, draftTz, period),
    [draftDate, draftTz, period]
  )

  const calendarDate = useMemo(
    () => (draftDate ? new Date(`${draftDate}T00:00:00`) : null),
    [draftDate]
  )

  const summary = useMemo(() => {
    if (!draftDate || !draftTime) return null
    const instant = wallClockToUtc(draftDate, draftTime, draftTz)
    // Format a "yyyy-MM-dd" + "HH:mm" wall-clock pair as "EEE, d MMM yyyy · hh:mm AM/PM".
    const fmtWall = (dateStr: string, timeStr: string) => {
      const h = parseInt(timeStr.slice(0, 2), 10)
      const h12 = h % 12 === 0 ? 12 : h % 12
      const meridian = h < 12 ? 'AM' : 'PM'
      return `${format(new Date(`${dateStr}T00:00:00`), 'EEE, d MMM yyyy')} · ${String(h12).padStart(2, '0')}:${timeStr.slice(3)} ${meridian}`
    }
    // Same instant rendered in UTC — shown alongside the selected-zone time.
    const utcWc = utcInstantToWallClock(instant, 'UTC')
    return {
      line: fmtWall(draftDate, draftTime),
      zone: `${draftTz} · ${getZoneOffsetLabel(draftTz, instant)}`,
      utcLine: fmtWall(utcWc.date, utcWc.time),
    }
  }, [draftDate, draftTime, draftTz])

  const canConfirm = Boolean(draftDate && draftTime)

  const handleConfirm = useCallback(() => {
    if (!canConfirm) return
    onConfirm(wallClockToUtc(draftDate, draftTime, draftTz), draftTz)
  }, [canConfirm, draftDate, draftTime, draftTz, onConfirm])

  /**
   * Select today's date + the soonest selectable 15-min slot, in the current
   * draft timezone. Rounds the current minute UP to the next quarter-hour so
   * the picked slot is never a disabled past slot; rolls to the next day when
   * rounding crosses midnight.
   */
  const handleSelectToday = useCallback(() => {
    const wc = utcInstantToWallClock(new Date(), draftTz)
    let [h, m] = wc.time.split(':').map(Number)
    let date = wc.date
    m = Math.ceil(m / 15) * 15
    if (m >= 60) { m = 0; h += 1 }
    if (h >= 24) {
      h = 0
      const d = new Date(`${date}T00:00:00`)
      d.setDate(d.getDate() + 1)
      date = format(d, 'yyyy-MM-dd')
    }
    setDraftDate(date)
    setDraftTime(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    setPeriod(h < 12 ? 'AM' : 'PM')
  }, [draftTz])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <FocusLock returnFocus>
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Select interview date and time"
          className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-defaultborder bg-white shadow-2xl dark:border-defaultborder/10 dark:bg-bodybg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between border-b border-defaultborder px-5 py-4 dark:border-defaultborder/10">
            <div>
              <h3 className="text-base font-semibold text-defaulttextcolor dark:text-white">
                Select interview date &amp; time
              </h3>
              <p className="mt-0.5 text-xs text-textmuted">Times are shown in the selected time zone.</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="text-textmuted hover:text-defaulttextcolor">
              <i className="ri-close-line text-xl" />
            </button>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto md:grid-cols-2">
            <div className="border-b border-defaultborder p-4 md:border-b-0 md:border-r dark:border-defaultborder/10">
              <label htmlFor="overlay-timezone" className="mb-1.5 block text-sm font-medium text-defaulttextcolor dark:text-white">
                Time zone
              </label>
              <TimezoneSelect id="overlay-timezone" value={draftTz} onChange={(tz) => setDraftTz(tz)} />
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={handleSelectToday}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/[0.06] px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/[0.12]"
                >
                  <i className="ri-calendar-event-line" aria-hidden />
                  Today
                </button>
              </div>
              <div className="mt-2">
                <DatePicker
                  inline
                  selected={calendarDate}
                  onChange={(d: Date | null) => { if (d) setDraftDate(format(d, 'yyyy-MM-dd')) }}
                  minDate={startOfToday()}
                  calendarStartDay={1}
                  calendarClassName="schedule-interview-dp-inline"
                />
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-textmuted">
                <i className="ri-time-line" />
                Showing times in <span className="font-medium text-primary">{draftTz}</span>
              </p>
            </div>

            <div className="flex min-h-0 flex-col p-4">
              <span className="mb-1.5 block text-sm font-medium text-defaulttextcolor dark:text-white">Select time</span>
              <div role="radiogroup" aria-label="AM or PM" className="mb-3 flex overflow-hidden border border-defaultborder dark:border-defaultborder/10">
                {(['AM', 'PM'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    role="radio"
                    aria-checked={period === p}
                    onClick={() => setPeriod(p)}
                    className={`flex-1 py-2 text-sm font-semibold ${period === p ? 'bg-primary text-white' : 'text-textmuted'}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <div className="flex max-h-64 flex-col gap-1.5 overflow-y-auto pr-1">
                {slots.map((slot) => (
                  <button
                    key={slot.value}
                    type="button"
                    disabled={slot.disabled}
                    aria-pressed={draftTime === slot.value}
                    onClick={() => setDraftTime(slot.value)}
                    className={`rounded-lg border py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      draftTime === slot.value
                        ? 'border-primary bg-primary font-semibold text-white'
                        : 'border-defaultborder hover:border-primary/50 dark:border-defaultborder/10'
                    }`}
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
              {summary && (
                <div aria-live="polite" className="mt-3 flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/[0.06] p-3">
                  <i className="ri-time-line text-xl text-primary" />
                  <div className="min-w-0">
                    <p className="text-[0.65rem] uppercase tracking-wide text-textmuted">Selected date &amp; time</p>
                    <p className="text-sm font-semibold text-defaulttextcolor dark:text-white">{summary.line}</p>
                    <p className="text-[0.65rem] text-textmuted">{summary.zone}</p>
                    <p className="mt-1.5 flex items-center gap-1.5 border-t border-primary/15 pt-1.5 text-[0.65rem] text-textmuted">
                      <span className="rounded-sm bg-textmuted/15 px-1 py-px font-bold uppercase tracking-wide">UTC</span>
                      {summary.utcLine}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-defaultborder px-5 py-3 dark:border-defaultborder/10">
            <p className="text-xs text-textmuted">All times are saved in UTC and displayed in the selected time zone.</p>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="ti-btn ti-btn-light !py-2 !px-4 !text-sm">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!canConfirm}
                aria-disabled={!canConfirm}
                className="ti-btn ti-btn-primary !py-2 !px-5 !text-sm disabled:opacity-60"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      </FocusLock>
    </div>
  )
}
