"use client"

import React, { useCallback, useEffect, useState } from "react"
import Swal from "sweetalert2"
import {
  approveInterviewHold,
  holdDisplay,
  listInterviewHolds,
  rejectInterviewHold,
  type InterviewHold,
} from "@/shared/lib/api/interviewScheduling"

/** Rows shown before "Show more"; keeps the panel from pushing the interviews list off-screen. */
const COLLAPSED_ROWS = 3
const URGENT_MS = 4 * 3600000

/** The API returns the hold's round (not yet on the shared type), so read it defensively. */
type HoldRound = { round?: { label?: string | null; index?: number | null } | null }

function fmtIn(iso: string, opts: Intl.DateTimeFormatOptions, tz?: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  try {
    return d.toLocaleString(undefined, { ...opts, ...(tz ? { timeZone: tz } : {}) })
  } catch {
    return d.toLocaleString(undefined, opts)
  }
}

const VIEWER_OPTS: Intl.DateTimeFormatOptions = {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
}

function expiry(iso: string | undefined, now: number): { label: string; urgent: boolean } | null {
  if (!iso) return null
  const ms = new Date(iso).getTime() - now
  if (!Number.isFinite(ms)) return null
  if (ms <= 0) return { label: "Expired", urgent: true }
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const span = h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : h > 0 ? `${h}h ${m}m` : `${Math.max(m, 1)}m`
  // "Urgent" carries the signal in text, not just the red colour.
  return ms < URGENT_MS ? { label: `Urgent · expires in ${span}`, urgent: true } : { label: `Expires in ${span}`, urgent: false }
}

function initialsOf(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || "")
      .join("") || "?"
  )
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string)
}

type ApiErr = { response?: { status?: number; data?: { message?: string } }; message?: string }

function errMsg(e: unknown): string {
  const r = (e as ApiErr)?.response
  return r?.data?.message || (e as ApiErr)?.message || "Request failed"
}

function toast(icon: "success" | "error" | "info", title: string) {
  void Swal.fire({
    toast: true,
    position: "top-end",
    icon,
    title,
    showConfirmButton: false,
    timer: icon === "error" ? 4000 : 3200,
  })
}

/**
 * Interview slots the AI agent / booking link reserved, waiting on a recruiter.
 * Renders nothing when there are none or the viewer can't list them (403).
 */
export default function PendingApprovalsPanel({ onDecided }: { onDecided?: () => void }) {
  const [holds, setHolds] = useState<InterviewHold[]>([])
  const [busy, setBusy] = useState<Record<string, "approve" | "reject">>({})
  const [expanded, setExpanded] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  const load = useCallback(async () => {
    try {
      setHolds(await listInterviewHolds({ status: "held" }))
    } catch {
      setHolds([])
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Countdowns and the urgency flip update without a refetch.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60000)
    return () => window.clearInterval(id)
  }, [])

  const setRowBusy = (id: string, action: "approve" | "reject" | null) =>
    setBusy((prev) => {
      const next = { ...prev }
      if (action) next[id] = action
      else delete next[id]
      return next
    })

  const removeRow = (id: string) => setHolds((prev) => prev.filter((h) => h._id !== id))

  /** 409 = already decided elsewhere or lapsed: drop the row and resync instead of a hard error. */
  const handleFailure = (h: InterviewHold, e: unknown, verb: string) => {
    if ((e as ApiErr)?.response?.status === 409) {
      removeRow(h._id)
      toast("info", errMsg(e))
      void load()
      onDecided?.()
      return
    }
    toast("error", `Could not ${verb}: ${errMsg(e)}`)
  }

  const approve = async (h: InterviewHold) => {
    if (busy[h._id]) return
    setRowBusy(h._id, "approve")
    try {
      await approveInterviewHold(h._id)
      removeRow(h._id)
      toast("success", `Interview scheduled with ${holdDisplay(h).candidateName}`)
      onDecided?.()
    } catch (e) {
      handleFailure(h, e, "approve")
    } finally {
      setRowBusy(h._id, null)
    }
  }

  const reject = async (h: InterviewHold) => {
    if (busy[h._id]) return
    const d = holdDisplay(h)
    const { value: reason, isConfirmed } = await Swal.fire({
      title: "Reject this time?",
      html: `<p style="margin:0">${escapeHtml(d.candidateName)} · ${escapeHtml(fmtIn(h.start, VIEWER_OPTS))}</p>`,
      input: "textarea",
      inputLabel: "Reason (required, sent to the candidate with a new booking link)",
      inputPlaceholder: "e.g. The interviewer is no longer available at this time.",
      inputAttributes: { "aria-label": "Reason for rejecting", maxlength: "500" },
      inputValidator: (v) => (!String(v || "").trim() ? "Please enter a reason" : undefined),
      showCancelButton: true,
      confirmButtonText: "Reject time",
      confirmButtonColor: "#dc2626",
      cancelButtonText: "Keep it",
    })
    if (!isConfirmed) return
    setRowBusy(h._id, "reject")
    try {
      await rejectInterviewHold(h._id, String(reason).trim())
      removeRow(h._id)
      toast("success", `Rejected. ${d.candidateName} will get a new booking link`)
    } catch (e) {
      handleFailure(h, e, "reject")
    } finally {
      setRowBusy(h._id, null)
    }
  }

  if (!holds.length) return null

  // Soonest to lapse first: those need a decision before the rest.
  const sorted = [...holds].sort(
    (a, b) => new Date(a.expiresAt || a.start).getTime() - new Date(b.expiresAt || b.start).getTime()
  )
  const visible = expanded ? sorted : sorted.slice(0, COLLAPSED_ROWS)
  const hidden = sorted.length - visible.length
  const urgentCount = sorted.filter((h) => expiry(h.expiresAt, now)?.urgent).length

  return (
    <section
      aria-labelledby="pending-approvals-title"
      className="box custom-box mt-2 sm:mt-4 overflow-hidden border border-warning/30 shadow-sm"
    >
      <div className="box-header flex items-center gap-2.5 border-b border-defaultborder/70 bg-warning/5 px-3 py-3 sm:px-4 dark:border-defaultborder/20">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning">
          <i className="ri-time-line text-base" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 id="pending-approvals-title" className="box-title text-sm sm:text-base">
            Pending approvals
            <span className="badge ms-1.5 inline-flex min-h-[1.25rem] min-w-[1.25rem] items-center justify-center rounded-full bg-warning/15 px-1.5 text-xs font-semibold text-warning align-middle">
              {holds.length}
            </span>
          </h2>
          <p className="text-xs text-defaulttextcolor/70">
            Times candidates picked, reserved until you approve or reject.
            {urgentCount > 0 && <span className="ms-1 font-medium text-danger">{urgentCount} expiring soon.</span>}
          </p>
        </div>
      </div>

      <ul id="pending-approvals-list" className="divide-y divide-defaultborder/70 dark:divide-defaultborder/20">
        {visible.map((h) => {
          const d = holdDisplay(h)
          const round = (h as InterviewHold & HoldRound).round
          const roundLabel = round?.label || (round?.index != null ? `Round ${round.index + 1}` : "")
          const exp = expiry(h.expiresAt, now)
          const rowBusy = busy[h._id]
          const candidateLocal = h.candidateTimezone
            ? fmtIn(h.start, { hour: "numeric", minute: "2-digit", timeZoneName: "short" }, h.candidateTimezone)
            : ""
          const isAi = h.source === "ai_call"
          return (
            <li key={h._id} className="px-3 py-3 sm:px-4">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] lg:items-center lg:gap-x-5 lg:gap-y-3">
                {/* Who */}
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                    {initialsOf(d.candidateName)}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-gray-800 dark:text-white" title={d.candidateEmail || undefined}>
                      {d.candidateName}
                    </div>
                    <div className="truncate text-xs text-defaulttextcolor/70 sm:text-sm">
                      {[d.jobTitle || "No job", roundLabel].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                </div>

                {/* When */}
                <div className="min-w-0 space-y-1.5 text-xs text-defaulttextcolor/80 sm:text-sm">
                  <div className="flex items-start gap-2">
                    <i className="ri-calendar-line mt-0.5 shrink-0 text-primary text-base" aria-hidden />
                    <span className="font-medium text-defaulttextcolor">
                      {fmtIn(h.start, VIEWER_OPTS)}
                      <span className="font-normal text-defaulttextcolor/70"> · {h.durationMinutes} min</span>
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1">
                    <span className="inline-flex items-center gap-1.5">
                      <i className="ri-user-voice-line shrink-0 text-info" aria-hidden />
                      with {d.interviewerName}
                    </span>
                    {candidateLocal && (
                      <span className="inline-flex items-center gap-1.5" title={h.candidateTimezone}>
                        <i className="ri-global-line shrink-0 text-success" aria-hidden />
                        {candidateLocal} for candidate
                      </span>
                    )}
                  </div>
                </div>

                {/* Status + actions */}
                <div className="flex w-full min-w-0 flex-col gap-3 border-t border-defaultborder/50 pt-3 dark:border-defaultborder/20 md:max-w-md md:ms-auto md:border-t-0 md:pt-0 lg:max-w-none lg:w-auto lg:min-w-[14rem]">
                  <div className="flex flex-wrap items-center gap-2">
                    {h.source && (
                      <span
                        className={`inline-flex min-h-[1.75rem] items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium sm:text-sm ${
                          isAi
                            ? "border-violet-500/35 bg-violet-500/10 text-violet-700 dark:text-violet-300"
                            : "border-blue-500/35 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        }`}
                      >
                        <i className={`${isAi ? "ri-robot-2-line" : "ri-links-line"} text-sm`} aria-hidden />
                        {isAi ? "AI call" : "Booking link"}
                      </span>
                    )}
                    {exp && (
                      <span
                        className={`inline-flex min-h-[1.75rem] items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium sm:text-sm ${
                          exp.urgent
                            ? "border-red-500/35 bg-red-500/10 text-red-600 dark:text-red-400"
                            : "border-orange-500/35 bg-orange-500/10 text-orange-700 dark:text-orange-300"
                        }`}
                        title={h.expiresAt ? `Reservation lapses ${fmtIn(h.expiresAt, VIEWER_OPTS)}` : undefined}
                      >
                        <i
                          className={`${exp.urgent ? "ri-alarm-warning-line" : "ri-hourglass-line"} text-sm`}
                          aria-hidden
                        />
                        {exp.label}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-nowrap sm:justify-stretch md:justify-end lg:justify-stretch">
                    <button
                      type="button"
                      className="ti-btn ti-btn-purple-full !m-0 inline-flex min-h-[2.375rem] min-w-0 items-center justify-center gap-1.5 whitespace-nowrap px-3 sm:min-w-[6.5rem]"
                      disabled={!!rowBusy}
                      aria-label={`Approve interview with ${d.candidateName}`}
                      onClick={() => void approve(h)}
                    >
                      <i
                        className={`${rowBusy === "approve" ? "ri-loader-4-line animate-spin" : "ri-check-line"} text-base`}
                        aria-hidden
                      />
                      {rowBusy === "approve" ? "Approving…" : "Approve"}
                    </button>
                    <button
                      type="button"
                      className="ti-btn ti-btn-outline-danger !m-0 inline-flex min-h-[2.375rem] min-w-0 items-center justify-center gap-1.5 whitespace-nowrap bg-white px-3 dark:bg-bodybg sm:min-w-[6.5rem]"
                      disabled={!!rowBusy}
                      aria-label={`Reject time for ${d.candidateName}`}
                      onClick={() => void reject(h)}
                    >
                      <i
                        className={`${rowBusy === "reject" ? "ri-loader-4-line animate-spin" : "ri-close-line"} text-base`}
                        aria-hidden
                      />
                      {rowBusy === "reject" ? "Rejecting…" : "Reject"}
                    </button>
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      {sorted.length > COLLAPSED_ROWS && (
        <div className="border-t border-defaultborder/70 px-3 py-2 text-center sm:px-4 dark:border-defaultborder/20">
          <button
            type="button"
            className="ti-btn ti-btn-light ti-btn-sm !m-0"
            aria-expanded={expanded}
            aria-controls="pending-approvals-list"
            onClick={() => setExpanded((v) => !v)}
          >
            <i className={`${expanded ? "ri-arrow-up-s-line" : "ri-arrow-down-s-line"} me-1`} aria-hidden />
            {expanded ? "Show fewer" : `Show ${hidden} more`}
          </button>
        </div>
      )}
    </section>
  )
}
