"use client"

import React, { useMemo, useState } from "react"

/**
 * Recurrence section for the Schedule Meeting form. Self-contained: it owns its
 * UI state and emits the chosen rule as JSON into a hidden input (id =
 * `hiddenInputId`) so the existing DOM-query submit handler can read it alongside
 * the other hidden inputs (date/time). Empty string when "Recurring" is off.
 */

type Frequency = "daily" | "weekly" | "monthly" | "custom"
type EndMode = "never" | "onDate" | "afterCount"

const DOW: ReadonlyArray<readonly [string, number]> = [
  ["Mon", 1],
  ["Tue", 2],
  ["Wed", 3],
  ["Thu", 4],
  ["Fri", 5],
  ["Sat", 6],
  ["Sun", 0],
]

const FREQS: ReadonlyArray<readonly [string, Frequency]> = [
  ["Daily", "daily"],
  ["Weekly", "weekly"],
  ["Monthly", "monthly"],
  ["Custom", "custom"],
]

export interface RecurrenceFieldsProps {
  /** Hidden input id the parent submit handler reads. */
  hiddenInputId?: string
  /** When the rule references day-of-month, default it from this start date. */
  anchorDate?: Date | null
  disabled?: boolean
}

export default function RecurrenceFields({
  hiddenInputId = "internal-schedule-recurrence",
  anchorDate,
  disabled,
}: RecurrenceFieldsProps) {
  const [enabled, setEnabled] = useState(false)
  const [frequency, setFrequency] = useState<Frequency>("weekly")
  const [interval, setIntervalValue] = useState(1)
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([])
  const [dayOfMonth, setDayOfMonth] = useState<number>(anchorDate ? anchorDate.getDate() : 1)
  const [endMode, setEndMode] = useState<EndMode>("never")
  const [endCount, setEndCount] = useState(12)
  const [endDate, setEndDate] = useState("")

  const showDays = frequency === "weekly" || frequency === "custom"
  const showMonthDay = frequency === "monthly"
  const unitLabel = frequency === "daily" ? "day" : frequency === "weekly" ? "week" : frequency === "monthly" ? "month" : "interval"

  const serialized = useMemo(() => {
    if (!enabled) return ""
    const recurrence: Record<string, unknown> = { frequency, interval: Math.max(1, interval) }
    if (showDays) recurrence.daysOfWeek = [...daysOfWeek].sort((a, b) => a - b)
    if (showMonthDay) recurrence.dayOfMonth = dayOfMonth
    const end =
      endMode === "afterCount"
        ? { mode: "afterCount", count: Math.max(1, endCount) }
        : endMode === "onDate"
          ? { mode: "onDate", untilDate: endDate || null }
          : { mode: "never" }
    return JSON.stringify({ recurrence, end })
  }, [enabled, frequency, interval, showDays, daysOfWeek, showMonthDay, dayOfMonth, endMode, endCount, endDate])

  const toggleDay = (d: number) =>
    setDaysOfWeek((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))

  const fieldCls =
    "form-control !py-2 !text-sm rounded-lg border-defaultborder dark:border-defaultborder/10"

  return (
    <div>
      {/* Hidden bridge to the DOM-query submit handler. */}
      <input type="hidden" id={hiddenInputId} value={serialized} readOnly tabIndex={-1} aria-hidden />

      <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-defaultborder/70 bg-gradient-to-br from-slate-50/80 to-white px-3.5 py-2.5 shadow-sm transition-colors hover:border-primary/30 dark:from-white/[0.03] dark:to-bodybg dark:border-defaultborder/20">
        <input
          type="checkbox"
          checked={enabled}
          disabled={disabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="form-check-input !w-4 !h-4 text-primary"
        />
        <span className="flex items-center gap-1.5 text-sm font-medium text-defaulttextcolor dark:text-white">
          <i className="ri-repeat-2-line text-primary" aria-hidden />
          Recurring meeting
        </span>
        {enabled ? (
          <span className="ms-auto inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-primary">
            On
          </span>
        ) : null}
      </label>

      {enabled ? (
        <div className="mt-3 space-y-4 rounded-xl border border-primary/15 bg-primary/[0.02] p-4 dark:border-primary/20 dark:bg-primary/[0.04]">
          {/* Frequency */}
          <div>
            <span className="form-label mb-1.5 block text-sm font-medium">Repeats</span>
            <div className="flex flex-wrap gap-2">
              {FREQS.map(([label, value]) => (
                <label
                  key={value}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border-2 border-defaultborder px-3 py-1.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5 dark:border-defaultborder/10"
                >
                  <input
                    type="radio"
                    name={`${hiddenInputId}-freq`}
                    value={value}
                    checked={frequency === value}
                    onChange={() => setFrequency(value)}
                    className="form-check-input !w-3.5 !h-3.5 text-primary"
                  />
                  <span className="font-medium">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Interval */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-defaulttextcolor dark:text-white/80">Every</span>
            <input
              type="number"
              min={1}
              max={365}
              value={interval}
              onChange={(e) => setIntervalValue(Math.max(1, parseInt(e.target.value || "1", 10) || 1))}
              className={`${fieldCls} w-20 text-center`}
              aria-label="Repeat interval"
            />
            <span className="text-sm text-defaulttextcolor dark:text-white/80">
              {unitLabel}
              {interval > 1 ? "s" : ""}
            </span>
          </div>

          {/* Weekly day picker */}
          {showDays ? (
            <div>
              <span className="form-label mb-1.5 block text-sm font-medium">On days</span>
              <div className="flex flex-wrap gap-1.5">
                {DOW.map(([label, d]) => {
                  const active = daysOfWeek.includes(d)
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDay(d)}
                      aria-pressed={active}
                      className={`h-9 w-11 rounded-lg border text-xs font-semibold transition-colors ${
                        active
                          ? "border-primary bg-primary text-white shadow-sm"
                          : "border-defaultborder bg-white text-textmuted hover:border-primary/40 dark:border-defaultborder/20 dark:bg-bodybg dark:text-white/60"
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
              <div className="mt-2 flex gap-3 text-[0.7rem]">
                <button type="button" className="font-medium text-primary hover:underline" onClick={() => setDaysOfWeek([1, 2, 3, 4, 5])}>
                  Weekdays
                </button>
                <button type="button" className="font-medium text-primary hover:underline" onClick={() => setDaysOfWeek([0, 1, 2, 3, 4, 5, 6])}>
                  All days
                </button>
                <button type="button" className="font-medium text-textmuted hover:underline" onClick={() => setDaysOfWeek([])}>
                  Clear
                </button>
              </div>
            </div>
          ) : null}

          {/* Monthly day-of-month */}
          {showMonthDay ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-defaulttextcolor dark:text-white/80">On day</span>
              <input
                type="number"
                min={1}
                max={31}
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(Math.min(31, Math.max(1, parseInt(e.target.value || "1", 10) || 1)))}
                className={`${fieldCls} w-20 text-center`}
                aria-label="Day of month"
              />
              <span className="text-sm text-defaulttextcolor dark:text-white/80">of the month</span>
            </div>
          ) : null}

          {/* End */}
          <div>
            <span className="form-label mb-1.5 block text-sm font-medium">Ends</span>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name={`${hiddenInputId}-end`} checked={endMode === "never"} onChange={() => setEndMode("never")} className="form-check-input !w-3.5 !h-3.5 text-primary" />
                Never
              </label>
              <label className="flex flex-wrap items-center gap-2 text-sm">
                <input type="radio" name={`${hiddenInputId}-end`} checked={endMode === "onDate"} onChange={() => setEndMode("onDate")} className="form-check-input !w-3.5 !h-3.5 text-primary" />
                On
                <input
                  type="date"
                  value={endDate}
                  disabled={endMode !== "onDate"}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={`${fieldCls} w-44 disabled:opacity-50`}
                  aria-label="End date"
                />
              </label>
              <label className="flex flex-wrap items-center gap-2 text-sm">
                <input type="radio" name={`${hiddenInputId}-end`} checked={endMode === "afterCount"} onChange={() => setEndMode("afterCount")} className="form-check-input !w-3.5 !h-3.5 text-primary" />
                After
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={endCount}
                  disabled={endMode !== "afterCount"}
                  onChange={(e) => setEndCount(Math.max(1, parseInt(e.target.value || "1", 10) || 1))}
                  className={`${fieldCls} w-20 text-center disabled:opacity-50`}
                  aria-label="Occurrence count"
                />
                occurrences
              </label>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
