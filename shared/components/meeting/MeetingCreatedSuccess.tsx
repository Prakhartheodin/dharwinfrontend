"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { format, isValid } from "date-fns"

export interface MeetingCreatedSuccessProps {
  title: string
  scheduledAt?: string | Date | null
  durationMinutes?: number | null
  meetingId?: string | null
  status?: string | null
  hosts?: { nameOrRole?: string; email: string }[]
  shareUrl: string
  personalUrl?: string | null
  onClose: () => void
  onAnother: () => void
  joinHref?: string
  variant?: "interview" | "meeting"
}

function safeFormat(dt: string | Date | null | undefined, fmt: string): string | null {
  if (!dt) return null
  const d = dt instanceof Date ? dt : new Date(dt)
  if (!isValid(d)) return null
  return format(d, fmt)
}

function toDate(dt: string | Date | null | undefined): Date | null {
  if (!dt) return null
  const d = dt instanceof Date ? dt : new Date(dt)
  return isValid(d) ? d : null
}

/** UTC stamp YYYYMMDDTHHmmssZ for ICS. */
function icsStamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  )
}

function escapeIcs(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n")
}

function buildIcs({
  uid,
  title,
  start,
  durationMinutes,
  url,
  description,
}: {
  uid: string
  title: string
  start: Date
  durationMinutes: number
  url?: string
  description?: string
}): string {
  const end = new Date(start.getTime() + durationMinutes * 60_000)
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Dharwin//Meeting//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeIcs(uid)}@dharwin`,
    `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART:${icsStamp(start)}`,
    `DTEND:${icsStamp(end)}`,
    `SUMMARY:${escapeIcs(title)}`,
    url ? `URL:${escapeIcs(url)}` : "",
    description ? `DESCRIPTION:${escapeIcs(description)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean)
  return lines.join("\r\n")
}

function downloadIcs(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" })
  const href = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = href
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(href), 1000)
}

function CopyField({
  label,
  hint,
  value,
}: {
  label: string
  hint?: string
  value: string
}) {
  const [copied, setCopied] = useState(false)
  const onCopy = useCallback(() => {
    if (!value) return
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    })
  }, [value])

  return (
    <div className="rounded-xl border border-defaultborder/70 bg-gradient-to-br from-slate-50/90 via-white to-white p-3.5 shadow-sm ring-1 ring-black/[0.03] dark:from-white/[0.04] dark:via-bodybg dark:to-bodybg dark:border-defaultborder/20 dark:ring-white/[0.04]">
      <div className="flex items-center justify-between gap-2">
        <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-textmuted dark:text-white/55">
          {label}
        </span>
        {hint ? (
          <span className="hidden sm:block text-[0.65rem] text-textmuted/80 dark:text-white/40 truncate">{hint}</span>
        ) : null}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          type="text"
          readOnly
          value={value}
          onFocus={(e) => e.currentTarget.select()}
          className="form-control !py-2 !text-sm flex-1 border-defaultborder dark:border-defaultborder/10 rounded-lg bg-white dark:bg-black/20 font-mono text-[0.78rem] tracking-tight"
          aria-label={label}
        />
        <button
          type="button"
          onClick={onCopy}
          className={`ti-btn !py-2 !px-3 !text-sm font-medium min-w-[5.25rem] transition-colors duration-200 ${
            copied
              ? "ti-btn-success !text-white"
              : "ti-btn-outline-primary"
          }`}
          aria-live="polite"
          aria-label={copied ? `${label} copied` : `Copy ${label.toLowerCase()}`}
        >
          {copied ? (
            <>
              <i className="ri-check-line me-1" />
              Copied
            </>
          ) : (
            <>
              <i className="ri-file-copy-line me-1" />
              Copy
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2 border-b border-defaultborder/50 pb-2.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-primary dark:text-primary/90 dark:border-white/10">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
      {children}
    </p>
  )
}

function MetaCell({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-defaultborder/60 bg-white/70 px-3 py-2.5 backdrop-blur-sm dark:bg-bodybg/60 dark:border-defaultborder/15">
      <span className="block text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-textmuted dark:text-white/45">
        {label}
      </span>
      <span
        className={`mt-0.5 block truncate text-[0.85rem] font-medium text-defaulttextcolor dark:text-white ${
          mono ? "font-mono tracking-tight" : ""
        }`}
      >
        {value}
      </span>
    </div>
  )
}

export default function MeetingCreatedSuccess({
  title,
  scheduledAt,
  durationMinutes,
  meetingId,
  status,
  hosts,
  shareUrl,
  personalUrl,
  onClose,
  onAnother,
  joinHref,
  variant = "meeting",
}: MeetingCreatedSuccessProps) {
  const dateText = safeFormat(scheduledAt, "EEE · MMM d")
  const timeText = safeFormat(scheduledAt, "h:mm a")
  const showPersonal = !!personalUrl && personalUrl !== shareUrl
  const hostLabels = useMemo(
    () =>
      (hosts || [])
        .map((h) => {
          const name = (h.nameOrRole || "").trim()
          const email = (h.email || "").trim()
          if (name && email) return `${name} (${email})`
          return name || email
        })
        .filter(Boolean),
    [hosts]
  )
  const ctaLabel = variant === "interview" ? "Join interview" : "Join meeting"
  const anotherLabel = variant === "interview" ? "Schedule another interview" : "Schedule another"

  const startDate = useMemo(() => toDate(scheduledAt), [scheduledAt])
  // Imminent: meeting is in past, now, or starting within 15 min. Drives which
  // button gets the loud filled-primary treatment so we don't lure users into
  // joining an empty room scheduled for next week.
  const isImminent = useMemo(() => {
    if (!startDate) return true
    const diffMs = startDate.getTime() - Date.now()
    return diffMs <= 15 * 60_000
  }, [startDate])

  const primaryRef = useRef<HTMLButtonElement | null>(null)
  const joinRef = useRef<HTMLAnchorElement | null>(null)
  useEffect(() => {
    // Auto-focus the recommended action so Enter does the right thing.
    const t = window.setTimeout(() => {
      if (isImminent) joinRef.current?.focus()
      else primaryRef.current?.focus()
    }, 80)
    return () => window.clearTimeout(t)
  }, [isImminent])

  const canAddToCalendar = !!startDate && typeof durationMinutes === "number" && durationMinutes > 0
  const handleAddToCalendar = useCallback(() => {
    if (!startDate || !durationMinutes) return
    const ics = buildIcs({
      uid: meetingId || `${Date.now()}`,
      title,
      start: startDate,
      durationMinutes,
      url: personalUrl || shareUrl,
      description: showPersonal ? `Join: ${personalUrl}\nShare: ${shareUrl}` : `Join: ${shareUrl}`,
    })
    const safeName = title.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "meeting"
    downloadIcs(`${safeName}.ics`, ics)
  }, [durationMinutes, meetingId, personalUrl, shareUrl, showPersonal, startDate, title])

  const joinHrefFinal = joinHref || personalUrl || shareUrl || "#"

  return (
    <div className="ti-modal-body flex min-h-0 max-h-[min(96vh,52rem)] flex-col overflow-hidden p-0">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain scroll-smooth motion-reduce:scroll-auto">
        <div className="relative overflow-hidden border-b border-defaultborder/60 dark:border-defaultborder/15">
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden
            style={{
              background:
                "radial-gradient(60% 110% at 50% -10%, rgba(34,197,94,0.18) 0%, rgba(34,197,94,0) 55%), radial-gradient(70% 120% at 100% 100%, rgba(99,102,241,0.10) 0%, rgba(99,102,241,0) 60%)",
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-multiply dark:opacity-[0.06] dark:mix-blend-screen"
            aria-hidden
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
            }}
          />
          <div className="relative px-4 pt-4 pb-4 text-center sm:px-6 sm:pt-6 sm:pb-5">
            <div className="relative mx-auto mb-3 flex h-14 w-14 items-center justify-center motion-safe:animate-[fadeIn_0.45s_ease-out] sm:h-16 sm:w-16">
              <span className="absolute h-14 w-14 rounded-full bg-success/20 motion-safe:animate-ping motion-reduce:hidden sm:h-16 sm:w-16" aria-hidden />
              <span className="absolute h-10 w-10 rounded-full bg-success/15 ring-2 ring-success/30 motion-safe:animate-pulse sm:h-12 sm:w-12" aria-hidden />
              <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-success text-white shadow-md sm:h-12 sm:w-12">
                <i className="ri-check-line text-[1.35rem] sm:text-[1.55rem]" aria-hidden />
              </span>
            </div>
            <h4 className="text-base font-semibold tracking-tight text-defaulttextcolor dark:text-white sm:text-[1.1rem]">
              {variant === "interview" ? "Interview scheduled" : "Meeting scheduled"}
            </h4>
            <p className="mx-auto mt-1 max-w-[34rem] truncate text-xs text-textmuted dark:text-white/55 sm:text-sm" title={title}>
              {title}
            </p>
            {(dateText || timeText || (typeof durationMinutes === "number" && durationMinutes > 0)) && (
              <div className="mt-3 inline-flex flex-wrap items-center justify-center gap-1.5">
                {dateText && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/[0.06] px-2.5 py-1 text-[0.7rem] font-medium text-primary shadow-sm dark:border-primary/30 dark:bg-primary/10">
                    <i className="ri-calendar-2-line text-[0.85rem]" />
                    {dateText}
                  </span>
                )}
                {timeText && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/[0.06] px-2.5 py-1 text-[0.7rem] font-medium text-primary shadow-sm dark:border-primary/30 dark:bg-primary/10">
                    <i className="ri-time-line text-[0.85rem]" />
                    {timeText}
                  </span>
                )}
                {typeof durationMinutes === "number" && durationMinutes > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-defaultborder bg-white/80 px-2.5 py-1 text-[0.7rem] font-medium text-defaulttextcolor shadow-sm backdrop-blur-sm dark:border-defaultborder/20 dark:bg-white/5 dark:text-white/80">
                    <i className="ri-hourglass-line text-[0.85rem]" />
                    {durationMinutes} min
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="px-4 py-4 space-y-4 sm:px-6 sm:py-5 sm:space-y-5">
          <section className="space-y-2.5 sm:space-y-3">
            <Eyebrow>Share</Eyebrow>
            <CopyField
              label="Public link"
              hint={shareUrl ? "Room link only — no guest name or email" : undefined}
              value={shareUrl}
            />
            {showPersonal && (
              <CopyField
                label="Your join link"
                hint="Includes your name & email"
                value={personalUrl as string}
              />
            )}
          </section>

          {(meetingId || status || hostLabels.length > 0) && (
            <section className="space-y-2.5 sm:space-y-3">
              <Eyebrow>Meeting</Eyebrow>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {hostLabels.length > 0 && (
                  <MetaCell
                    label="Hosts"
                    value={
                      <span className="line-clamp-2 whitespace-normal" title={hostLabels.join(", ")}>
                        {hostLabels.join(", ")}
                      </span>
                    }
                  />
                )}
                {meetingId && <MetaCell label="Meeting ID" value={meetingId} mono />}
                {status && (
                  <MetaCell
                    label="Status"
                    value={
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
                        <span className="capitalize">{status}</span>
                      </span>
                    }
                  />
                )}
                {typeof durationMinutes === "number" && durationMinutes > 0 && (
                  <MetaCell label="Duration" value={`${durationMinutes} minutes`} />
                )}
              </div>
            </section>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-defaultborder/70 bg-gradient-to-b from-gray-50/95 to-gray-50/80 px-4 py-3 backdrop-blur-sm dark:from-black/35 dark:to-black/25 dark:border-defaultborder/15 sm:px-6 sm:py-3.5">
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            {canAddToCalendar && (
              <button
                type="button"
                onClick={handleAddToCalendar}
                className="ti-btn ti-btn-light !h-9 !py-0 !px-3.5 !text-sm font-medium inline-flex w-full items-center justify-center transition-transform duration-150 motion-reduce:transition-none active:scale-[0.98] motion-reduce:active:scale-100 sm:w-auto"
                title="Download .ics calendar invite"
              >
                <i className="ri-calendar-event-line me-1.5" />
                Add to calendar
              </button>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <button
              ref={isImminent ? undefined : primaryRef}
              type="button"
              className={`ti-btn !h-9 !py-0 !px-4 !text-sm font-medium inline-flex w-full sm:w-auto items-center justify-center transition-transform duration-150 motion-reduce:transition-none active:scale-[0.98] motion-reduce:active:scale-100 ${
                isImminent ? "ti-btn-light" : "ti-btn-primary"
              }`}
              onClick={onClose}
              aria-label={isImminent ? "Close" : "Done — close dialog"}
            >
              {isImminent ? "Close" : "Done"}
            </button>
            <button
              type="button"
              className="ti-btn ti-btn-outline-primary !h-9 !py-0 !px-4 !text-sm font-medium inline-flex w-full sm:w-auto items-center justify-center transition-transform duration-150 motion-reduce:transition-none active:scale-[0.98] motion-reduce:active:scale-100"
              onClick={onAnother}
            >
              <i className="ri-add-line me-1.5" />
              {anotherLabel}
            </button>
            <a
              ref={isImminent ? joinRef : undefined}
              href={joinHrefFinal}
              target="_blank"
              rel="noopener noreferrer"
              className={`ti-btn !h-9 !py-0 !px-4 !text-sm font-medium inline-flex w-full sm:w-auto items-center justify-center transition-transform duration-150 motion-reduce:transition-none active:scale-[0.98] motion-reduce:active:scale-100 ${
                isImminent ? "ti-btn-primary" : "ti-btn-outline-primary"
              }`}
              aria-label={`${ctaLabel} (opens in new tab)`}
            >
              {isImminent && (
                <span className="relative flex h-2 w-2 me-1.5" aria-hidden>
                  <span className="absolute inline-flex h-full w-full rounded-full bg-white/70 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                </span>
              )}
              <i className="ri-vidicon-line me-1.5" />
              {isImminent ? `${ctaLabel} now` : ctaLabel}
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
