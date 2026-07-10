"use client"

import Seo from "@/shared/layout-components/seo/seo"
import React, { Fragment, useMemo, useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "@/shared/contexts/auth-context"
import { appendJoinIdentityToUrl } from "@/shared/lib/join-room-url"
import { wallClockToUtc, utcInstantToWallClock, getViewerTimezone } from "@/shared/lib/timezone"
import { useTable, useSortBy, usePagination } from "react-table"
import {
  createInternalMeeting,
  listInternalMeetings,
  getInternalMeeting,
  getInternalMeetingRecordings,
  updateInternalMeeting,
  deleteInternalMeeting,
  type InternalMeeting,
  type CreateInternalMeetingPayload,
  type UpdateInternalMeetingPayload,
  type SeriesEditMode,
} from "@/shared/lib/api/internal-meetings"
import CreateInternalMeetingModal from "./CreateInternalMeetingModal"
import RecordingsModal, { type RecordingListItem } from "../../../ats/interviews/_components/RecordingsModal"
import { listUsers } from "@/shared/lib/api/users"
import ParticipantInvitesField, { type ParticipantUser } from "@/shared/components/meeting/ParticipantInvitesField"
import MeetingReadOnlyView from "@/shared/components/meeting/MeetingReadOnlyView"
import { useConfirm } from "@/shared/components/ui/useConfirm"
import { useRecurringScopeDialog } from "@/shared/components/meeting/RecurringScopeDialog"

interface InternalMeetingRow {
  id: string
  title: string
  date: string
  time: string
  type: string
  durationMinutes: number
  participantsSummary: string
  status: string
  actualDurationMinutes: number | null
  publicMeetingUrl: string
  meetingId: string
  seriesId: string | null
  recurrenceSummary: string
}

function formatMeetingTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
  } catch {
    return "—"
  }
}

function formatMeetingDate(iso: string, tz?: string): string {
  try {
    const w = utcInstantToWallClock(iso, tz || getViewerTimezone())
    const [year, month, day] = w.date.split("-").map(Number)
    const local = new Date(year, month - 1, day)
    return local.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  } catch {
    return "—"
  }
}

function participantsSummary(m: InternalMeeting): string {
  const hosts = (m.hosts || []).filter((h) => h.email?.trim())
  const invites = (m.emailInvites || []).filter((e) => String(e).trim())
  const hostPart = hosts.map((h) => (h.nameOrRole?.trim() ? h.nameOrRole : h.email)).join(", ")
  const extra = invites.length ? ` +${invites.length} invited` : ""
  return (hostPart || "—") + extra
}

function isCompletedStatus(status?: string): boolean {
  const raw = (status || "").toLowerCase()
  return raw === "ended" || raw === "completed"
}

function computeActualDurationMinutes(m: InternalMeeting): number | null {
  if (!isCompletedStatus(m.status)) return null
  const startedAtMs = new Date(m.scheduledAt).getTime()
  const endedAtMs = m.endedAt ? new Date(m.endedAt).getTime() : NaN
  if (!Number.isFinite(startedAtMs) || !Number.isFinite(endedAtMs) || endedAtMs <= startedAtMs) return null
  return Math.max(1, Math.round((endedAtMs - startedAtMs) / 60000))
}

function formatDurationMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours && minutes) return `${hours}h ${minutes}m`
  if (hours) return `${hours}h`
  return `${minutes}m`
}

function meetingToRow(m: InternalMeeting, index: number): InternalMeetingRow {
  const baseId = String(m.id ?? m._id ?? m.meetingId ?? "")
  return {
    id: baseId || `meeting-${index}`,
    title: m.title || "Meeting",
    date: formatMeetingDate(m.scheduledAt, m.timezone),
    time: formatMeetingTime(m.scheduledAt),
    type: m.meetingType || "Video",
    durationMinutes: Number.isFinite(Number(m.durationMinutes)) ? Math.max(1, Number(m.durationMinutes)) : 60,
    participantsSummary: participantsSummary(m),
    status: m.status || "scheduled",
    actualDurationMinutes: computeActualDurationMinutes(m),
    publicMeetingUrl:
      m.publicMeetingUrl ||
      (typeof window !== "undefined"
        ? `${window.location.origin}/join/room?room=${encodeURIComponent(m.meetingId || "")}`
        : ""),
    meetingId: m.meetingId || "",
    seriesId: m.seriesId ? String(m.seriesId) : null,
    recurrenceSummary: m.recurrenceSummary || "",
  }
}

export default function InternalMeetingsClient() {
  const { user: authUser } = useAuth()

  const defaultScheduleHosts = useMemo(() => {
    const email = authUser?.email?.trim()
    if (!email) return [{ nameOrRole: "", email: "" }]
    const nameOrRole = (authUser?.name ?? "").trim() || email.split("@")[0] || ""
    return [{ nameOrRole, email }]
  }, [authUser?.email, authUser?.name])

  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [selectedSort, setSelectedSort] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<"all" | "scheduled" | "completed" | "cancelled">("all")

  const [createdMeeting, setCreatedMeeting] = useState<InternalMeeting | null>(null)
  const [hosts, setHosts] = useState<{ nameOrRole: string; email: string }[]>([{ nameOrRole: "", email: "" }])
  const [emailInvites, setEmailInvites] = useState<string[]>([""])
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [scheduledInternalMeetingAt, setScheduledInternalMeetingAt] = useState<Date | null>(null)

  const [meetings, setMeetings] = useState<InternalMeeting[]>([])
  const [meetingsLoading, setMeetingsLoading] = useState(true)
  const [meetingsError, setMeetingsError] = useState<string | null>(null)

  const [recordingsModalMeetingId, setRecordingsModalMeetingId] = useState<string | null>(null)
  const [recordingsList, setRecordingsList] = useState<RecordingListItem[]>([])
  const [recordingsLoading, setRecordingsLoading] = useState(false)
  const [recordingsError, setRecordingsError] = useState<string | null>(null)

  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null)

  const [editMeetingId, setEditMeetingId] = useState<string | null>(null)
  /** Bumped on every open so reopening the SAME meeting still refetches even
   *  when the previous close came from a backdrop/Esc (which skips closeEditModal). */
  const [editOpenNonce, setEditOpenNonce] = useState(0)
  const [editMeeting, setEditMeeting] = useState<InternalMeeting | null>(null)
  /** Editable participant/guest invite emails for the Edit Meeting overlay. */
  const [editEmailInvites, setEditEmailInvites] = useState<string[]>([])
  /** Scope for editing a recurring-series occurrence (single | future | series). */
  const [editSeriesMode, setEditSeriesMode] = useState<SeriesEditMode>("single")
  const [editUsers, setEditUsers] = useState<ParticipantUser[]>([])
  const [editUsersLoading, setEditUsersLoading] = useState(false)
  const [editUsersError, setEditUsersError] = useState<string | null>(null)
  const editUsersLoadedRef = useRef(false)
  const { confirm, confirmDialog } = useConfirm()
  const { pickScope, recurringScopeDialog } = useRecurringScopeDialog()
  /** Terminal meetings (ended/completed/cancelled) are view-only after the cycle ends. */
  const editStatusRaw = (editMeeting?.status || "").toLowerCase()
  const editReadOnly = editStatusRaw === "ended" || editStatusRaw === "completed" || editStatusRaw === "cancelled"
  const editStatusLabel = editStatusRaw === "cancelled" ? "cancelled" : "completed"
  const [editLoading, setEditLoading] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const [viewMode, setViewMode] = useState<"table" | "week">("table")
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
      // Fetch every page so the table holds the full history (the Show 10/25/50/100
      // dropdown paginates client-side over the complete set).
      const all: InternalMeeting[] = []
      let page = 1
      for (;;) {
        const res = await listInternalMeetings({ limit: 500, page })
        all.push(...(res.results || []))
        if (page >= (res.totalPages || 1) || !(res.results || []).length) break
        page += 1
      }
      setMeetings(all)
    } catch (err: any) {
      setMeetingsError(err?.response?.data?.message || err?.message || "Failed to load meetings")
      setMeetings([])
    } finally {
      setMeetingsLoading(false)
    }
  }, [])

  const copyMeetingLink = useCallback(
    async (row: InternalMeetingRow) => {
      const baseUrl =
        row.publicMeetingUrl ||
        (typeof window !== "undefined"
          ? `${window.location.origin}/join/room?room=${encodeURIComponent(row.meetingId)}`
          : "")
      if (!baseUrl) return
      const joinName = (authUser?.name?.trim() || authUser?.email?.split("@")[0] || "").trim()
      const joinEmail = authUser?.email?.trim() || ""
      const url = appendJoinIdentityToUrl(baseUrl, joinName, joinEmail)
      try {
        await navigator.clipboard.writeText(url)
        setCopiedLinkId(row.id)
        setTimeout(() => setCopiedLinkId(null), 2000)
      } catch {
        setCopiedLinkId(row.id)
        setTimeout(() => setCopiedLinkId(null), 2000)
      }
    },
    [authUser]
  )

  const refreshPrelineDom = useCallback(() => {
    try {
      ;(window as unknown as { HSStaticMethods?: { autoInit?: () => void } }).HSStaticMethods?.autoInit?.()
    } catch {
      /* ignore */
    }
  }, [])

  const ensurePrelineLoaded = useCallback(async () => {
    if (typeof window === "undefined") return
    if ((window as unknown as { HSOverlay?: unknown }).HSOverlay) return
    try {
      await import("preline/preline")
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
          ;(window as unknown as { HSOverlay?: { open: (n: Element) => void } }).HSOverlay?.open(el as Element)
        })
      }
      if (typeof window !== "undefined" && (window as unknown as { HSOverlay?: unknown }).HSOverlay) {
        run()
        return
      }
      void ensurePrelineLoaded().then(run)
    },
    [ensurePrelineLoaded, refreshPrelineDom]
  )

  useEffect(() => {
    void ensurePrelineLoaded().then(() => {
      requestAnimationFrame(() => refreshPrelineDom())
    })
  }, [ensurePrelineLoaded, refreshPrelineDom])

  useEffect(() => {
    if (meetingsLoading) return
    requestAnimationFrame(() => refreshPrelineDom())
  }, [meetingsLoading, refreshPrelineDom])

  useEffect(() => {
    fetchMeetings()
  }, [fetchMeetings])

  useEffect(() => {
    if (!recordingsModalMeetingId) return
    let cancelled = false
    setRecordingsLoading(true)
    setRecordingsError(null)
    getInternalMeetingRecordings(recordingsModalMeetingId)
      .then((list) => {
        if (!cancelled) setRecordingsList(list)
      })
      .catch((err: any) => {
        if (!cancelled) {
          setRecordingsList([])
          setRecordingsError(err?.response?.data?.message || err?.message || "Failed to load recordings")
        }
      })
      .finally(() => {
        if (!cancelled) setRecordingsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [recordingsModalMeetingId])

  useEffect(() => {
    setHosts((prev) => {
      if (prev.some((h) => h.email.trim())) return prev
      return defaultScheduleHosts.map((h) => ({ ...h }))
    })
  }, [defaultScheduleHosts])

  const resetCreateMeetingForm = useCallback(() => {
    setCreatedMeeting(null)
    setFormError(null)
    setScheduledInternalMeetingAt(null)
    setHosts(defaultScheduleHosts.map((h) => ({ ...h })))
    setEmailInvites([""])
  }, [defaultScheduleHosts])

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  const handleScheduleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setFormError(null)
      const validHosts = hosts.filter((h) => h.email.trim())
      if (validHosts.length === 0) {
        setFormError("At least one host with email is required")
        return
      }
      const invalidHost = validHosts.find((h) => !isValidEmail(h.email))
      if (invalidHost) {
        setFormError(`Invalid host email: "${invalidHost.email}"`)
        return
      }
      const form = e.target as HTMLFormElement
      const getVal = (id: string) =>
        (form.querySelector(`#${id}`) as HTMLInputElement | HTMLTextAreaElement)?.value?.trim() ?? ""
      const title = getVal("internal-schedule-title") || "Meeting"
      const description = getVal("internal-schedule-description")
      const date = getVal("internal-schedule-date")
      const time = getVal("internal-schedule-time")
      if (!date || !time) {
        setFormError("Please select date and time.")
        return
      }
      const durationMinutes = parseInt(getVal("internal-schedule-duration") || "60", 10) || 60
      const maxParticipants = parseInt(
        (form.querySelector("#internal-schedule-max-p") as HTMLInputElement)?.value || "10",
        10
      ) || 10
      const allowGuestJoin = (form.querySelector("#internal-schedule-allow-guest") as HTMLInputElement)?.checked ?? false
      const requireApproval =
        (form.querySelector("#internal-schedule-require-approval") as HTMLInputElement)?.checked ?? true
      const typeRaw =
        (form.querySelector('input[name="internal-schedule-type"]:checked') as HTMLInputElement)?.value || "video"
      const meetingType =
        typeRaw === "video" ? "Video" : typeRaw === "in-person" ? "In-Person" : "Phone"
      const notes = getVal("internal-schedule-notes")
      // The date/time inputs are the viewer's local wall-clock; convert to a UTC
      // instant using that SAME zone (was: appending "Z", which mis-stored local
      // wall-clock as UTC and shifted the email time by the viewer's offset).
      const tz = getViewerTimezone()
      const scheduledAt = wallClockToUtc(date, time, tz).toISOString()
      const payload: CreateInternalMeetingPayload = {
        title,
        description: description || undefined,
        scheduledAt,
        timezone: tz,
        durationMinutes,
        maxParticipants,
        allowGuestJoin,
        requireApproval,
        meetingType,
        hosts: validHosts.map((h) => ({
          nameOrRole: (h.nameOrRole ?? "").trim(),
          email: h.email.trim(),
        })),
        emailInvites: emailInvites.filter((em) => em.trim()).map((em) => em.trim()),
        notes: notes || undefined,
      }
      // Recurrence (optional) — RecurrenceFields serializes {recurrence,end} as JSON.
      const recurrenceRaw = getVal("internal-schedule-recurrence")
      if (recurrenceRaw) {
        try {
          const parsed = JSON.parse(recurrenceRaw)
          if (parsed?.recurrence?.frequency) {
            payload.recurrence = parsed.recurrence
            payload.end = parsed.end
          }
        } catch {
          /* ignore malformed recurrence; falls back to one-off */
        }
      }
      setFormLoading(true)
      try {
        const meeting = await createInternalMeeting(payload)
        setCreatedMeeting(meeting)
        fetchMeetings()
      } catch (err: any) {
        setFormError(err?.response?.data?.message || err?.message || "Failed to create meeting")
      } finally {
        setFormLoading(false)
      }
    },
    [hosts, emailInvites, fetchMeetings]
  )

  const loadEditUsers = useCallback(async () => {
    setEditUsersLoading(true)
    setEditUsersError(null)
    try {
      const res = await listUsers({ limit: 500, status: "active" })
      setEditUsers(
        (res.results || [])
          .map((u) => ({ id: u.id, name: u.name, email: u.email }))
          .filter((u) => u.email)
      )
      editUsersLoadedRef.current = true
    } catch {
      setEditUsersError("Could not load users.")
    } finally {
      setEditUsersLoading(false)
    }
  }, [])

  const openEditModal = useCallback((id: string, seriesMode: SeriesEditMode = "single") => {
    setEditMeetingId(id)
    setEditOpenNonce((n) => n + 1)
    setEditMeeting(null)
    setEditError(null)
    setEditSeriesMode(seriesMode)
    setEditLoading(true)
    if (!editUsersLoadedRef.current) void loadEditUsers()
    ;(window as any).HSOverlay?.open(document.querySelector("#edit-internal-meeting-modal"))
  }, [loadEditUsers])

  const closeEditModal = useCallback(() => {
    setEditMeetingId(null)
    setEditMeeting(null)
    setEditError(null)
    ;(window as any).HSOverlay?.close(document.querySelector("#edit-internal-meeting-modal"))
  }, [])

  useEffect(() => {
    if (!editMeetingId) return
    let cancelled = false
    getInternalMeeting(editMeetingId)
      .then((m) => {
        if (!cancelled) {
          setEditMeeting(m)
          setEditEmailInvites(Array.isArray(m?.emailInvites) ? m.emailInvites : [])
        }
      })
      .catch((err: any) => {
        if (!cancelled) setEditError(err?.response?.data?.message || err?.message || "Failed to load meeting")
      })
      .finally(() => {
        if (!cancelled) setEditLoading(false)
      })
    return () => {
      cancelled = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMeetingId, editOpenNonce])

  const handleEditSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!editMeetingId || !editMeeting) return
      setEditError(null)
      const form = e.target as HTMLFormElement
      const getVal = (id: string) =>
        (form.querySelector(`#${id}`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement)?.value?.trim() ?? ""
      const title = getVal("edit-internal-title")
      const description = getVal("edit-internal-description")
      const date = getVal("edit-internal-date")
      const time = getVal("edit-internal-time")
      const durationMinutes = parseInt(getVal("edit-internal-duration") || "60", 10) || 60
      const typeRaw =
        (form.querySelector('input[name="edit-internal-type"]:checked') as HTMLInputElement)?.value ||
        (editMeeting.meetingType || "Video").toLowerCase()
      const meetingType =
        typeRaw === "video" ? "Video" : typeRaw === "in-person" ? "In-Person" : "Phone"
      const notes = getVal("edit-internal-notes")
      const status = getVal("edit-internal-status") as "scheduled" | "ended" | "cancelled"
      // Convert the wall-clock edit inputs back to a UTC instant using the meeting's
      // stored zone, matching how the create path and the edit display interpret them.
      const editTz = editMeeting.timezone || getViewerTimezone()
      const scheduledAt = date && time ? wallClockToUtc(date, time, editTz).toISOString() : editMeeting.scheduledAt
      const payload: UpdateInternalMeetingPayload = {
        title: title || editMeeting.title,
        description: description || undefined,
        scheduledAt,
        durationMinutes,
        meetingType,
        emailInvites: editEmailInvites.map((em) => em.trim()).filter(Boolean),
        notes: notes || undefined,
        status,
      }
      setEditSaving(true)
      try {
        // Series occurrences pass the chosen scope; one-off meetings omit mode.
        await updateInternalMeeting(editMeetingId, payload, editMeeting.seriesId ? editSeriesMode : undefined)
        await fetchMeetings()
        closeEditModal()
      } catch (err: any) {
        setEditError(err?.response?.data?.message || err?.message || "Failed to update meeting")
      } finally {
        setEditSaving(false)
      }
    },
    [editMeetingId, editMeeting, editEmailInvites, editSeriesMode, fetchMeetings, closeEditModal]
  )

  const handleDeleteEntireSeries = useCallback(
    async (row: InternalMeetingRow) => {
      if (!row.id || !row.seriesId) return
      const ok = await confirm({
        title: "Remove entire series?",
        message: (
          <>
            This permanently removes <strong>all</strong> occurrences of &quot;{row.title}&quot;
            {row.recurrenceSummary ? <> ({row.recurrenceSummary})</> : null} from your meeting list.
            This cannot be undone.
          </>
        ),
        confirmLabel: "Remove permanently",
        cancelLabel: "Keep series",
        tone: "danger",
      })
      if (!ok) return
      try {
        await deleteInternalMeeting(row.id, "series", { purge: true })
        await fetchMeetings()
      } catch (err: any) {
        alert(err?.response?.data?.message || err?.message || "Failed to delete series")
      }
    },
    [confirm, fetchMeetings]
  )

  const handleCancelMeeting = useCallback(
    async (row: InternalMeetingRow) => {
      if (!row.id) return
      if (row.seriesId) {
        const scope = await pickScope({
          title: "Cancel recurring meeting?",
          message: (
            <>
              &quot;{row.title}&quot; repeats{row.recurrenceSummary ? <> ({row.recurrenceSummary})</> : null}. Choose
              which occurrences to cancel.
            </>
          ),
          tone: "danger",
        })
        if (!scope) return
        try {
          await deleteInternalMeeting(row.id, scope)
          await fetchMeetings()
        } catch (err: any) {
          alert(err?.response?.data?.message || err?.message || "Failed to cancel")
        }
        return
      }
      const ok = await confirm({
        title: "Cancel meeting?",
        message: `Cancel "${row.title}"? The join link will be disabled.`,
        confirmLabel: "Cancel meeting",
        cancelLabel: "Keep meeting",
        tone: "danger",
      })
      if (!ok) return
      try {
        await updateInternalMeeting(row.id, { status: "cancelled" })
        await fetchMeetings()
      } catch (err: any) {
        alert(err?.response?.data?.message || err?.message || "Failed to cancel")
      }
    },
    [pickScope, fetchMeetings]
  )

  const handleRowSelect = (id: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filteredMeetings = useMemo(() => {
    if (statusFilter === "all") return meetings
    return meetings.filter((meeting) => {
      const raw = (meeting.status || "").toLowerCase()
      if (statusFilter === "completed") return raw === "ended" || raw === "completed"
      return raw === statusFilter
    })
  }, [meetings, statusFilter])

  const tableData = useMemo(() => filteredMeetings.map((m, i) => meetingToRow(m, i)), [filteredMeetings])

  const columns = useMemo(
    () => [
      {
        Header: "All",
        accessor: "checkbox",
        disableSortBy: true,
        Cell: ({ row }: any) => (
          <input
            className="form-check-input"
            type="checkbox"
            checked={selectedRows.has(row.original.id)}
            onChange={() => handleRowSelect(row.original.id)}
            aria-label={`Select ${row.original.title}`}
          />
        ),
      },
      {
        Header: "Meeting",
        accessor: "meetingInfo",
        Cell: ({ row }: any) => {
          const r = row.original as InternalMeetingRow
          return (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-800 dark:text-white">{r.title}</span>
                {r.seriesId ? (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[0.65rem] font-semibold text-primary"
                    title={`Recurring${r.recurrenceSummary ? ` · ${r.recurrenceSummary}` : ""}`}
                  >
                    <i className="ri-repeat-2-line text-[0.7rem]" aria-hidden />
                    {r.recurrenceSummary || "Recurring"}
                  </span>
                ) : null}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <i className="ri-calendar-line text-primary"></i>
                  {r.date}
                </span>
                <span className="flex items-center gap-1">
                  <i className="ri-time-line text-info"></i>
                  {r.time}
                </span>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <i className="ri-vidicon-line text-success"></i>
                  {r.type}
                </span>
                <span className="flex items-center gap-1">
                  <i className="ri-timer-line text-info"></i>
                  Duration: {formatDurationMinutes(r.durationMinutes)}
                </span>
              </div>
              {r.actualDurationMinutes !== null ? (
                <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  <i className="ri-timer-flash-line text-emerald-500"></i>
                  Actual: {formatDurationMinutes(r.actualDurationMinutes)}
                </div>
              ) : isCompletedStatus(r.status) ? (
                <div className="text-xs text-gray-500 dark:text-gray-500 flex items-center gap-1">
                  <i className="ri-information-line"></i>
                  Actual: not available for this meeting
                </div>
              ) : null}
            </div>
          )
        },
      },
      {
        Header: "Participants",
        accessor: "participantsSummary",
        Cell: ({ row }: any) => (
          <div className="text-sm text-defaulttextcolor dark:text-white max-w-[14rem] truncate" title={row.original.participantsSummary}>
            {row.original.participantsSummary}
          </div>
        ),
      },
      {
        Header: "Status",
        accessor: "status",
        Cell: ({ row }: any) => {
          const raw = (row.original.status || "").toLowerCase()
          const statusConfig: Record<string, { label: string; className: string }> = {
            scheduled: { label: "Scheduled", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30" },
            ended: { label: "Completed", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
            cancelled: { label: "Cancelled", className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30" },
          }
          const config = statusConfig[raw] || {
            label: row.original.status || "Scheduled",
            className: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/30",
          }
          return (
            <span className={`inline-flex items-center border px-2 py-1 rounded-md text-xs font-medium ${config.className}`}>
              {config.label}
            </span>
          )
        },
      },
      {
        Header: "Actions",
        accessor: "id",
        disableSortBy: true,
        Cell: ({ row }: any) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="ti-btn ti-btn-icon ti-btn-sm ti-btn-success"
              title="Recordings"
              onClick={() => {
                setRecordingsModalMeetingId(row.original.id)
                ;(window as any).HSOverlay?.open(document.querySelector("#view-recordings-modal"))
              }}
            >
              <i className="ri-video-line"></i>
            </button>
            {row.original.status?.toLowerCase() !== "cancelled" && (
              <button
                type="button"
                className="ti-btn ti-btn-icon ti-btn-sm ti-btn-light"
                title="Copy link"
                onClick={() => copyMeetingLink(row.original)}
              >
                {copiedLinkId === row.original.id ? <i className="ri-check-line text-success"></i> : <i className="ri-links-line"></i>}
              </button>
            )}
            <button
              type="button"
              className="ti-btn ti-btn-icon ti-btn-sm ti-btn-info"
              title={row.original.seriesId ? "Edit this occurrence" : "Edit meeting"}
              onClick={() => openEditModal(row.original.id, "single")}
            >
              <i className="ri-pencil-line"></i>
            </button>
            {row.original.seriesId && row.original.status?.toLowerCase() !== "cancelled" ? (
              <button
                type="button"
                className="ti-btn ti-btn-icon ti-btn-sm ti-btn-primary"
                title="Edit entire series"
                onClick={() => openEditModal(row.original.id, "series")}
              >
                <i className="ri-repeat-2-line"></i>
              </button>
            ) : null}
            {row.original.status?.toLowerCase() !== "cancelled" && (
              <button
                type="button"
                className="ti-btn ti-btn-icon ti-btn-sm ti-btn-danger"
                title={row.original.seriesId ? "Cancel occurrence or series…" : "Cancel meeting"}
                onClick={() => handleCancelMeeting(row.original)}
              >
                <i className="ri-close-circle-line"></i>
              </button>
            )}
            {row.original.seriesId ? (
              <button
                type="button"
                className="ti-btn ti-btn-icon ti-btn-sm ti-btn-danger"
                title={
                  row.original.status?.toLowerCase() === "cancelled"
                    ? "Remove cancelled series permanently"
                    : "Remove entire series permanently"
                }
                onClick={() => handleDeleteEntireSeries(row.original)}
              >
                <i className="ri-delete-bin-2-line"></i>
              </button>
            ) : null}
          </div>
        ),
      },
    ],
    [selectedRows, copiedLinkId, copyMeetingLink, openEditModal, handleCancelMeeting, handleDeleteEntireSeries]
  )

  const data = tableData

  const weekDays = useMemo(() => {
    const days: { date: Date; key: string; label: string }[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart)
      d.setDate(weekStart.getDate() + i)
      days.push({
        date: d,
        key: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
      })
    }
    return days
  }, [weekStart])

  const byDay = useMemo(() => {
    const map: Record<string, InternalMeetingRow[]> = {}
    weekDays.forEach((day) => {
      map[day.key] = []
    })
    data.forEach((row) => {
      if (map[row.date]) map[row.date].push(row)
    })
    return map
  }, [data, weekDays])

  const tableInstance: any = useTable(
    {
      columns,
      data,
      initialState: { pageIndex: 0, pageSize: 100 },
      // ponytail: keep the user on their current page after a refetch (cancel/edit).
      // react-table resets pageIndex to 0 on every data change unless disabled.
      autoResetPage: false,
      autoResetSortBy: false,
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

  // ponytail: autoResetPage=false can strand the user on a now-empty last page
  // (cancel the only row on the final page). Clamp back to the last real page.
  useEffect(() => {
    if (pageCount > 0 && pageIndex > pageCount - 1) gotoPage(pageCount - 1)
  }, [pageCount, pageIndex, gotoPage])

  const handleSortChange = useCallback(
    (sortOption: string) => {
      setSelectedSort(sortOption)
      switch (sortOption) {
        case "date-asc":
          setSortBy([{ id: "meetingInfo", desc: false }])
          break
        case "date-desc":
          setSortBy([{ id: "meetingInfo", desc: true }])
          break
        case "participants-asc":
          setSortBy([{ id: "participantsSummary", desc: false }])
          break
        case "participants-desc":
          setSortBy([{ id: "participantsSummary", desc: true }])
          break
        case "status-asc":
          setSortBy([{ id: "status", desc: false }])
          break
        case "status-desc":
          setSortBy([{ id: "status", desc: true }])
          break
        case "clear-sort":
          setSortBy([])
          setSelectedSort("")
          break
        default:
          setSortBy([])
      }
    },
    [setSortBy]
  )

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedRows(new Set(data.map((r) => r.id)))
    else setSelectedRows(new Set())
  }

  const isAllSelected = selectedRows.size === data.length && data.length > 0

  return (
    <Fragment>
      <Seo title="Meetings" />
      <div className="meetings-page-shell mt-5 grid w-full min-w-0 max-w-full grid-cols-12 gap-3 overflow-hidden sm:mt-6 sm:gap-4 lg:gap-6">
        <div className="col-span-12 flex h-full min-h-0 min-w-0 flex-col xl:col-span-12">
          <div className="box custom-box flex h-full min-h-0 min-w-0 max-w-full flex-col overflow-hidden border border-defaultborder/70 shadow-sm dark:border-defaultborder/20">
            <div className="box-header relative z-20 flex shrink-0 flex-col gap-2.5 overflow-visible border-b border-defaultborder/70 bg-gradient-to-b from-gray-50/90 via-white to-white px-3 py-3 dark:border-defaultborder/20 dark:from-black/25 dark:via-black/15 dark:to-black/10 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3.5">
              <div className="box-title text-sm sm:text-base">
                Meetings
                <span className="badge bg-light text-default ms-1 rounded-full align-middle text-[0.7rem] sm:ms-2 sm:text-[0.75rem]">{data.length}</span>
              </div>
              <div className="flex w-full min-w-0 max-w-full flex-col gap-2 xl:w-auto xl:flex-row xl:flex-wrap xl:items-center xl:gap-2 [&_.form-control]:shrink-0 [&_.ti-btn]:shrink-0">
                <div className="flex flex-wrap items-center gap-1.5 sm:contents sm:gap-2">
                <select
                  id="meetings-page-size"
                  aria-label="Rows per page"
                  className="form-control select-show-page-size !w-auto !min-w-[6.5rem] !max-w-[8rem] !py-1.5 !ps-3 !pe-8 !text-[0.75rem]"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                >
                  {[10, 25, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      Show {size}
                    </option>
                  ))}
                </select>
                <select
                  id="meetings-status-filter"
                  aria-label="Filter meetings by status"
                  className="form-control !w-auto !min-w-[9.5rem] !max-w-[11rem] !py-1.5 !ps-3 !pe-8 !text-[0.75rem]"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as "all" | "scheduled" | "completed" | "cancelled")}
                >
                  <option value="all">All status</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <div className="hs-dropdown ti-dropdown">
                  <button
                    type="button"
                    className="ti-btn ti-btn-light !py-1.5 !px-2.5 !text-[0.75rem] ti-dropdown-toggle"
                    aria-expanded="false"
                  >
                    <i className="ri-arrow-up-down-line me-1 align-middle font-semibold"></i>
                    <span className="hidden sm:inline">Sort</span>
                    <i className="ri-arrow-down-s-line ms-1 inline-block align-middle"></i>
                  </button>
                  <ul className="hs-dropdown-menu ti-dropdown-menu hidden">
                    <li>
                      <button type="button" className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] w-full text-left" onClick={() => handleSortChange("date-asc")}>
                        Date (oldest)
                      </button>
                    </li>
                    <li>
                      <button type="button" className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] w-full text-left" onClick={() => handleSortChange("date-desc")}>
                        Date (newest)
                      </button>
                    </li>
                    <li>
                      <button type="button" className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] w-full text-left" onClick={() => handleSortChange("participants-asc")}>
                        Participants (A–Z)
                      </button>
                    </li>
                    <li>
                      <button type="button" className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] w-full text-left" onClick={() => handleSortChange("status-asc")}>
                        Status (A–Z)
                      </button>
                    </li>
                    <li className="ti-dropdown-divider"></li>
                    <li>
                      <button type="button" className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] w-full text-left" onClick={() => handleSortChange("clear-sort")}>
                        Clear sort
                      </button>
                    </li>
                  </ul>
                </div>
                <div className="flex items-center rounded-lg border border-defaultborder bg-white p-0.5 dark:border-defaultborder/20 dark:bg-black/10">
                  <button
                    type="button"
                    onClick={() => setViewMode("table")}
                    className={`ti-btn !rounded-md !py-1.5 !px-2.5 !text-[0.75rem] ${viewMode === "table" ? "ti-btn-primary" : "ti-btn-light"}`}
                    aria-label="Table view"
                  >
                    <i className="ri-list-check-2 align-middle sm:me-1"></i>
                    <span className="hidden sm:inline">Table</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("week")}
                    className={`ti-btn !rounded-md !py-1.5 !px-2.5 !text-[0.75rem] ${viewMode === "week" ? "ti-btn-primary" : "ti-btn-light"}`}
                    aria-label="Week view"
                  >
                    <i className="ri-calendar-schedule-line align-middle sm:me-1"></i>
                    <span className="hidden sm:inline">Week</span>
                  </button>
                </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 sm:contents sm:gap-2">
                <button
                  type="button"
                  className="ti-btn ti-btn-primary-full ms-auto !py-1.5 !px-2.5 !text-[0.75rem] sm:ms-0"
                  onClick={() => openHsOverlay("#create-internal-meeting-modal")}
                >
                  <i className="ri-add-line align-middle font-semibold sm:me-1"></i>
                  <span className="hidden sm:inline">Schedule meeting</span>
                  <span className="sm:hidden">Schedule</span>
                </button>
                </div>
              </div>
            </div>
            <div className="box-body relative z-0 !p-0 flex-1 min-w-0 flex flex-col overflow-hidden">
              {meetingsLoading ? (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent mb-4"></div>
                  <p className="text-sm text-gray-500">Loading meetings...</p>
                </div>
              ) : meetingsError ? (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <p className="text-sm text-danger mb-3">{meetingsError}</p>
                  <button type="button" className="ti-btn ti-btn-primary !py-2 !px-4 !text-sm" onClick={() => fetchMeetings()}>
                    Try again
                  </button>
                </div>
              ) : viewMode === "week" ? (
                <div className="flex-1 overflow-y-auto p-4" style={{ minHeight: 0 }}>
                  <div className="flex items-center justify-between mb-4">
                    <button
                      type="button"
                      onClick={() =>
                        setWeekStart((d) => {
                          const n = new Date(d)
                          n.setDate(n.getDate() - 7)
                          return n
                        })
                      }
                      className="ti-btn ti-btn-light !py-1.5 !px-3 !text-sm"
                    >
                      <i className="ri-arrow-left-s-line"></i> Previous
                    </button>
                    <span className="text-sm font-medium">
                      {weekDays[0]?.date.toLocaleDateString("en-US", { month: "short" })} {weekDays[0]?.date.getDate()} –{" "}
                      {weekDays[6]?.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setWeekStart((d) => {
                          const n = new Date(d)
                          n.setDate(n.getDate() + 7)
                          return n
                        })
                      }
                      className="ti-btn ti-btn-light !py-1.5 !px-3 !text-sm"
                    >
                      Next <i className="ri-arrow-right-s-line"></i>
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-3 min-w-[800px]">
                    {weekDays.map((day) => (
                      <div key={day.key} className="rounded-lg border border-defaultborder dark:border-defaultborder/20 p-2 min-h-[120px] bg-white/50 dark:bg-black/20">
                        <div className="text-xs font-semibold text-defaulttextcolor dark:text-white mb-2">{day.label}</div>
                        <div className="space-y-2">
                          {(byDay[day.key] || []).map((row) => (
                            <div
                              key={row.id}
                              className="rounded-md border border-defaultborder/60 dark:border-white/10 p-2 text-[0.7rem] bg-primary/5"
                            >
                              <div className="font-medium truncate">{row.title}</div>
                              <div className="text-defaulttextcolor/70">{row.time}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex min-h-0 flex-1 min-w-0 overflow-hidden px-4 pb-4" style={{ minHeight: 0 }}>
                  <div className="table-responsive meetings-table-scroll w-full min-w-0 max-w-full overflow-x-auto overflow-y-auto rounded-xl border border-defaultborder/70 bg-white/95 shadow-sm dark:border-defaultborder/20 dark:bg-black/20">
                    <table {...getTableProps()} className="table mb-0 min-w-full table-hover whitespace-nowrap">
                      <thead>
                        {headerGroups.map((headerGroup: any) => {
                          const { key: hgKey, ...hgRest } = headerGroup.getHeaderGroupProps()
                          return (
                            <tr key={hgKey ?? headerGroup.id} {...hgRest} className="border-b border-defaultborder/70 dark:border-defaultborder/20">
                              {headerGroup.headers.map((column: any) => {
                                const { key: colKey, ...colRest } = column.getHeaderProps(column.getSortByToggleProps?.())
                                return (
                                  <th
                                    key={colKey ?? column.id}
                                    {...colRest}
                                    scope="col"
                                    className="!text-[0.75rem] bg-gray-50 align-middle dark:bg-black/20"
                                    style={{ position: "sticky", top: 0, zIndex: 10 }}
                                  >
                                    {column.id === "checkbox" ? (
                                      <input
                                        type="checkbox"
                                        className="form-check-input"
                                        checked={isAllSelected}
                                        onChange={handleSelectAll}
                                        aria-label="Select all"
                                      />
                                    ) : (
                                      column.render("Header")
                                    )}
                                  </th>
                                )
                              })}
                            </tr>
                          )
                        })}
                      </thead>
                      <tbody {...getTableBodyProps()}>
                        {page.map((row: any) => {
                          prepareRow(row)
                          const { key: rowKey, ...rowRest } = row.getRowProps()
                          return (
                            <tr key={rowKey ?? row.id} {...rowRest}>
                              {row.cells.map((cell: any) => {
                                const { key: cellKey, ...cellRest } = cell.getCellProps()
                                return (
                                  <td key={cellKey ?? cell.column.id} {...cellRest} className="!text-[0.8125rem] align-middle">
                                    {cell.render("Cell")}
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
            {!meetingsLoading && !meetingsError && viewMode === "table" && (
              <div className="box-footer shrink-0 border-t border-defaultborder/70 bg-gray-50/90 px-3 py-3 dark:border-defaultborder/20 dark:bg-black/25 sm:px-4">
                <div className="flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-between">
                  <span className="w-full text-center text-xs text-defaulttextcolor/70 sm:w-auto sm:text-left sm:text-sm">
                    Page {pageIndex + 1} of {pageCount || 1}
                  </span>
                  <nav aria-label="Page navigation" className="flex w-full justify-center sm:w-auto sm:shrink-0">
                    <div className="m-0 inline-flex flex-nowrap items-center gap-1 rounded-lg border border-defaultborder/70 bg-white p-1 shadow-sm dark:border-defaultborder/20 dark:bg-black/20">
                      <span className={!canPreviousPage ? "opacity-50" : ""}>
                        <button
                          type="button"
                          className="inline-flex min-w-[2.25rem] items-center justify-center rounded-md px-2.5 py-1.5 text-xs font-medium text-defaulttextcolor transition-colors hover:bg-gray-100 disabled:cursor-not-allowed dark:text-white/80 dark:hover:bg-white/10"
                          onClick={() => previousPage()}
                          disabled={!canPreviousPage}
                        >
                          Prev
                        </button>
                      </span>
                      {pageOptions.map((p: number) => (
                        <span key={p}>
                          <button
                            type="button"
                            className={`inline-flex min-w-[2rem] items-center justify-center rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                              pageIndex === p
                                ? "bg-primary text-white shadow-sm"
                                : "text-defaulttextcolor hover:bg-gray-100 dark:text-white/80 dark:hover:bg-white/10"
                            }`}
                            onClick={() => gotoPage(p)}
                          >
                            {p + 1}
                          </button>
                        </span>
                      ))}
                      <span className={!canNextPage ? "opacity-50" : ""}>
                        <button
                          type="button"
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
            )}
          </div>
        </div>
      </div>

      <CreateInternalMeetingModal
        createdMeeting={createdMeeting}
        resetCreateMeetingForm={resetCreateMeetingForm}
        formError={formError}
        formLoading={formLoading}
        onSubmit={handleScheduleSubmit}
        hosts={hosts}
        setHosts={setHosts}
        emailInvites={emailInvites}
        setEmailInvites={setEmailInvites}
        scheduledInternalMeetingAt={scheduledInternalMeetingAt}
        onScheduledInternalMeetingAtChange={setScheduledInternalMeetingAt}
      />

      <RecordingsModal
        recordingsLoading={recordingsLoading}
        recordingsError={recordingsError}
        recordingsList={recordingsList}
        onClose={() => setRecordingsModalMeetingId(null)}
      />

      {confirmDialog}

      {recurringScopeDialog}

      <div
        id="edit-internal-meeting-modal"
        className="hs-overlay hidden ti-modal size-lg !z-[105]"
        tabIndex={-1}
        aria-labelledby="edit-internal-meeting-modal-label"
        aria-hidden="true"
      >
        <div className="hs-overlay-open:mt-7 ti-modal-box mt-0 ease-out transition-all sm:max-w-2xl">
          <div className="ti-modal-content border border-defaultborder dark:border-defaultborder/10 rounded-xl shadow-xl overflow-hidden">
            <div className="ti-modal-header bg-gray-50 dark:bg-black/20 border-b border-defaultborder dark:border-defaultborder/10 px-6 py-4">
              <h3 id="edit-internal-meeting-modal-label" className="ti-modal-title text-lg font-semibold flex items-center gap-2">
                <i className="ri-pencil-line text-info"></i> Edit meeting
              </h3>
              <button
                type="button"
                className="ti-modal-close-btn flex-shrink-0 p-0 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-black/40"
                onClick={closeEditModal}
                aria-label="Close"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            <div className="ti-modal-body px-6 py-5">
              {editLoading && (
                <div className="flex items-center justify-center py-12">
                  <span className="animate-spin inline-block me-2 w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></span>
                  Loading...
                </div>
              )}
              {!editLoading && editError && !editMeeting && (
                <div className="py-4 px-4 rounded-lg bg-danger/10 text-danger text-sm">{editError}</div>
              )}
              {!editLoading && editMeeting && editReadOnly && (
                <div className="space-y-5">
                  <MeetingReadOnlyView
                    banner={`This meeting is ${editStatusLabel} — view only. ${editStatusLabel === "cancelled" ? "Cancelled" : "Completed"} meetings can't be edited.`}
                    rows={[
                      { label: "Status", value: editStatusLabel === "cancelled" ? "Cancelled" : "Completed" },
                      { label: "Title", value: editMeeting.title },
                      {
                        label: "When",
                        value: editMeeting.scheduledAt
                          ? (() => {
                              const w = utcInstantToWallClock(editMeeting.scheduledAt, editMeeting.timezone || getViewerTimezone())
                              return `${w.date} ${w.time} (${editMeeting.timezone || getViewerTimezone()})`
                            })()
                          : "",
                      },
                      { label: "Duration", value: `${editMeeting.durationMinutes} min` },
                      { label: "Meeting type", value: editMeeting.meetingType },
                      { label: "Description", value: editMeeting.description },
                    ]}
                    invites={editEmailInvites}
                    notes={editMeeting.notes}
                  />
                  <div className="flex justify-end pt-4 border-t border-defaultborder dark:border-defaultborder/10">
                    <button type="button" className="ti-btn ti-btn-light !py-2 !px-4 !text-sm font-medium" onClick={closeEditModal}>Close</button>
                  </div>
                </div>
              )}
              {!editLoading && editMeeting && !editReadOnly && (
                <form onSubmit={handleEditSubmit} className="space-y-5 max-h-[calc(100vh-12rem)] overflow-y-auto">
                  {editError && <div className="p-3 rounded-lg bg-danger/10 text-danger text-sm">{editError}</div>}
                  {editMeeting.seriesId ? (
                    <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-3.5 dark:border-primary/25 dark:bg-primary/[0.05]">
                      <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-defaulttextcolor dark:text-white">
                        <i className="ri-repeat-2-line text-primary" aria-hidden />
                        Recurring meeting — apply changes to
                      </p>
                      <div className="flex flex-col gap-1.5">
                        {([
                          ["series", "The entire series"],
                          ["future", "This and future occurrences"],
                          ["single", "This occurrence only"],
                        ] as const).map(([value, label]) => (
                          <label key={value} className="flex items-center gap-2 text-sm">
                            <input
                              type="radio"
                              name="edit-internal-series-mode"
                              checked={editSeriesMode === value}
                              onChange={() => setEditSeriesMode(value)}
                              className="form-check-input !w-3.5 !h-3.5 text-primary"
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <div>
                    <label htmlFor="edit-internal-title" className="form-label block text-sm font-medium mb-1.5">
                      Title <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      id="edit-internal-title"
                      key={editMeeting._id + editMeeting.title}
                      defaultValue={editMeeting.title}
                      required
                      className="form-control !py-2 !text-sm w-full rounded-lg"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-internal-description" className="form-label block text-sm font-medium mb-1.5">
                      Description
                    </label>
                    <textarea
                      id="edit-internal-description"
                      key={editMeeting._id + "-d"}
                      rows={2}
                      defaultValue={editMeeting.description ?? ""}
                      className="form-control !py-2 !text-sm w-full rounded-lg resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="edit-internal-date" className="form-label block text-sm font-medium mb-1.5">
                        Date <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        id="edit-internal-date"
                        key={editMeeting._id + "-dt"}
                        defaultValue={editMeeting.scheduledAt ? utcInstantToWallClock(editMeeting.scheduledAt, editMeeting.timezone || getViewerTimezone()).date : ""}
                        className="form-control !py-2 !text-sm w-full rounded-lg"
                      />
                    </div>
                    <div>
                      <label htmlFor="edit-internal-time" className="form-label block text-sm font-medium mb-1.5">
                        Time <span className="text-danger">*</span>
                      </label>
                      <input
                        type="time"
                        id="edit-internal-time"
                        key={editMeeting._id + "-tm"}
                        defaultValue={editMeeting.scheduledAt ? utcInstantToWallClock(editMeeting.scheduledAt, editMeeting.timezone || getViewerTimezone()).time : ""}
                        className="form-control !py-2 !text-sm w-full rounded-lg"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="edit-internal-duration" className="form-label block text-sm font-medium mb-1.5">
                      Duration (minutes) <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      id="edit-internal-duration"
                      key={editMeeting._id + "-dur"}
                      min={1}
                      max={480}
                      defaultValue={editMeeting.durationMinutes ?? 60}
                      required
                      className="form-control !py-2 !text-sm w-full rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="form-label block text-sm font-medium mb-2">Meeting type</label>
                    <div className="flex flex-wrap gap-4">
                      {(["Video", "In-Person", "Phone"] as const).map((t) => (
                        <label key={t} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="edit-internal-type"
                            value={t === "In-Person" ? "in-person" : t.toLowerCase()}
                            defaultChecked={(editMeeting.meetingType || "Video") === t}
                            className="form-check-input !w-4 !h-4 text-primary"
                          />
                          <span className="text-sm">{t}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="form-label block text-sm font-medium mb-1.5">Participants &amp; invites</span>
                    <ParticipantInvitesField
                      idPrefix="edit-internal"
                      invites={editEmailInvites}
                      onChange={setEditEmailInvites}
                      users={editUsers}
                      usersLoading={editUsersLoading}
                      usersError={editUsersError}
                      onReloadUsers={loadEditUsers}
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-internal-notes" className="form-label block text-sm font-medium mb-1.5">
                      Notes
                    </label>
                    <textarea
                      id="edit-internal-notes"
                      key={editMeeting._id + "-n"}
                      rows={2}
                      defaultValue={editMeeting.notes ?? ""}
                      className="form-control !py-2 !text-sm w-full rounded-lg resize-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-internal-status" className="form-label block text-sm font-medium mb-1.5">
                      Status
                    </label>
                    <select
                      id="edit-internal-status"
                      key={editMeeting._id + "-st"}
                      className="form-select !py-2 !text-sm w-full rounded-lg"
                      defaultValue={editMeeting.status ?? "scheduled"}
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="ended">Ended</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-end pt-4 border-t border-defaultborder dark:border-defaultborder/10">
                    <button type="button" className="ti-btn ti-btn-light !py-2 !px-4 !text-sm" onClick={closeEditModal}>
                      Cancel
                    </button>
                    <button type="submit" disabled={editSaving} className="ti-btn ti-btn-primary !py-2 !px-4 !text-sm">
                      {editSaving ? "Saving..." : "Save changes"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  )
}
