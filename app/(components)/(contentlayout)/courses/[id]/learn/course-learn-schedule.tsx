"use client"

import React, { useState } from "react"
import { loadLearnSchedule, saveLearnSchedule, type LearnSchedule } from "./course-learn-helpers"

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

/**
 * Modal to pick weekly learning reminders for this course (stored locally).
 */
export function ScheduleLearningModal({
  moduleId,
  onClose,
  onSaved,
}: {
  moduleId: string
  onClose: () => void
  onSaved: (schedule: LearnSchedule) => void
}) {
  const existing = loadLearnSchedule(moduleId)
  const [days, setDays] = useState<string[]>(existing?.days?.length ? existing.days : ["Mon", "Wed", "Fri"])
  const [time, setTime] = useState(existing?.time ?? "09:00")
  const [dayError, setDayError] = useState<string | null>(null)

  /**
   * Toggle a weekday in the local reminder set.
   */
  const toggleDay = (day: string) => {
    setDays((prev) => {
      const next = prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
      if (next.length > 0) setDayError(null)
      return next
    })
  }

  const handleSave = () => {
    if (days.length === 0) {
      setDayError("Pick at least one day.")
      return
    }
    const schedule = { days, time }
    saveLearnSchedule(moduleId, schedule)
    onSaved(schedule)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[180] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="schedule-learn-title">
      <button type="button" className="absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity" aria-label="Close schedule dialog" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-[#1c1d1f] p-6 shadow-2xl ring-1 ring-black/5 dark:ring-white/10">
        <button
          type="button"
          className="absolute top-3 right-3 w-11 h-11 inline-flex items-center justify-center rounded-lg text-[#6a6f73] hover:bg-[#f7f9fa] dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label="Close"
          onClick={onClose}
        >
          <i className="ti ti-x text-[1.125rem]" aria-hidden />
        </button>
        <div className="flex items-start gap-3 mb-4 pr-10">
          <span className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0" aria-hidden>
            <i className="ti ti-calendar-event text-[1.25rem]" />
          </span>
          <div>
            <h2 id="schedule-learn-title" className="text-[1.125rem] font-bold text-[#1c1d1f] dark:text-white leading-snug">Schedule learning time</h2>
            <p className="text-[0.875rem] text-[#6a6f73] dark:text-white/70 mt-1 leading-relaxed">
              Pick days and a time. We&apos;ll keep this reminder on this device.
            </p>
          </div>
        </div>
        <fieldset className="mb-5">
          <legend className="text-[0.8125rem] font-semibold text-[#1c1d1f] dark:text-white mb-2.5">Days</legend>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((day) => {
              const on = days.includes(day)
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  aria-pressed={on}
                  className={`min-h-11 min-w-11 px-3 rounded-full text-[0.8125rem] font-semibold border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                    on
                      ? "bg-primary text-white border-primary shadow-sm"
                      : "border-[#d1d7dc] dark:border-white/20 text-[#1c1d1f] dark:text-white hover:border-primary/40 hover:bg-primary/5"
                  }`}
                >
                  {day}
                </button>
              )
            })}
          </div>
          {dayError && <p className="mt-2 text-[0.8125rem] text-red-600 dark:text-red-400" role="alert">{dayError}</p>}
        </fieldset>
        <label className="block text-[0.8125rem] font-semibold text-[#1c1d1f] dark:text-white mb-2" htmlFor="learn-time">Time</label>
        <input
          id="learn-time"
          type="time"
          className="form-control w-full rounded-xl border border-[#d1d7dc] dark:border-white/20 p-3 mb-6 bg-white dark:bg-white/5 min-h-11 text-[0.9375rem] focus:border-primary focus:ring-2 focus:ring-primary/20"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
        <div className="flex justify-end gap-3">
          <button type="button" className="ti-btn ti-btn-outline-secondary min-h-11" onClick={onClose}>Cancel</button>
          <button type="button" className="ti-btn ti-btn-primary min-h-11" onClick={handleSave} disabled={days.length === 0}>
            Save schedule
          </button>
        </div>
      </div>
    </div>
  )
}
