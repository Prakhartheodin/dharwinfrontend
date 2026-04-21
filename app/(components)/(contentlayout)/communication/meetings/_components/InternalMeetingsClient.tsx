"use client"

import Seo from "@/shared/layout-components/seo/seo"
import React, { Fragment, useMemo, useState, useEffect, useCallback } from "react"
import { useAuth } from "@/shared/contexts/auth-context"
import { appendJoinIdentityToUrl } from "@/shared/lib/join-room-url"
import { useTable, useSortBy, usePagination } from "react-table"
import {
  createInternalMeeting,
  listInternalMeetings,
  getInternalMeeting,
  getInternalMeetingRecordings,
  updateInternalMeeting,
  type InternalMeeting,
  type CreateInternalMeetingPayload,
  type UpdateInternalMeetingPayload,
} from "@/shared/lib/api/internal-meetings"
import CreateInternalMeetingModal from "./CreateInternalMeetingModal"
import RecordingsModal, { type RecordingListItem } from "../../../ats/interviews/_components/RecordingsModal"

interface InternalMeetingRow {
  id: string
  title: string
  date: string
  time: string
  type: string
  participantsSummary: string
  status: string
  publicMeetingUrl: string
  meetingId: string
}

function formatMeetingTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
  } catch {
    return "—"
  }
}

function formatMeetingDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toISOString().slice(0, 10)
  } catch {
    return "—"
  }
}

function buildScheduledAtFromForm(dateStr: string, timeStr: string): string {
  const t = timeStr.trim()
  const parts = t.split(":").filter((p) => p !== "")
  const h = String(parts[0] ?? "0").padStart(2, "0").slice(-2)
  const m = String(parts[1] ?? "00").padStart(2, "0").slice(0, 2)
  const secRaw = String(parts[2] ?? "00").replace(/\D/g, "")
  const s = secRaw.padStart(2, "0").slice(0, 2)
  return `${dateStr}T${h}:${m}:${s}.000Z`
}

function participantsSummary(m: InternalMeeting): string {
  const hosts = (m.hosts || []).filter((h) => h.email?.trim())
  const invites = (m.emailInvites || []).filter((e) => String(e).trim())
  const hostPart = hosts.map((h) => (h.nameOrRole?.trim() ? h.nameOrRole : h.email)).join(", ")
  const extra = invites.length ? ` +${invites.length} invited` : ""
  return (hostPart || "—") + extra
}

function meetingToRow(m: InternalMeeting, index: number): InternalMeetingRow {
  const baseId = (m._id != null ? String(m._id) : m.meetingId) || ""
  return {
    id: baseId || `meeting-${index}`,
    title: m.title || "Meeting",
    date: formatMeetingDate(m.scheduledAt),
    time: formatMeetingTime(m.scheduledAt),
    type: m.meetingType || "Video",
    participantsSummary: participantsSummary(m),
    status: m.status || "scheduled",
    publicMeetingUrl:
      m.publicMeetingUrl ||
      (typeof window !== "undefined"
        ? `${window.location.origin}/join/room?room=${encodeURIComponent(m.meetingId || "")}`
        : ""),
    meetingId: m.meetingId || "",
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

  const [createdMeeting, setCreatedMeeting] = useState<InternalMeeting | null>(null)
  const [hosts, setHosts] = useState<{ nameOrRole: string; email: string }[]>([{ nameOrRole: "", email: "" }])
  const [emailInvites, setEmailInvites] = useState<string[]>([""])
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [meetings, setMeetings] = useState<InternalMeeting[]>([])
  const [meetingsLoading, setMeetingsLoading] = useState(true)
  const [meetingsError, setMeetingsError] = useState<string | null>(null)

  const [recordingsModalMeetingId, setRecordingsModalMeetingId] = useState<string | null>(null)
  const [recordingsList, setRecordingsList] = useState<RecordingListItem[]>([])
  const [recordingsLoading, setRecordingsLoading] = useState(false)
  const [recordingsError, setRecordingsError] = useState<string | null>(null)

  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null)

  const [editMeetingId, setEditMeetingId] = useState<string | null>(null)
  const [editMeeting, setEditMeeting] = useState<InternalMeeting | null>(null)
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
      const res = await listInternalMeetings({ limit: 100 })
      setMeetings(res.results || [])
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
      const allowGuestJoin = (form.querySelector("#internal-schedule-allow-guest") as HTMLInputElement)?.checked ?? true
      const requireApproval =
        (form.querySelector("#internal-schedule-require-approval") as HTMLInputElement)?.checked ?? false
      const typeRaw =
        (form.querySelector('input[name="internal-schedule-type"]:checked') as HTMLInputElement)?.value || "video"
      const meetingType =
        typeRaw === "video" ? "Video" : typeRaw === "in-person" ? "In-Person" : "Phone"
      const notes = getVal("internal-schedule-notes")
      const scheduledAt = buildScheduledAtFromForm(date, time)
      const payload: CreateInternalMeetingPayload = {
        title,
        description: description || undefined,
        scheduledAt,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Calcutta",
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

  const openEditModal = useCallback((id: string) => {
    setEditMeetingId(id)
    setEditMeeting(null)
    setEditError(null)
    setEditLoading(true)
    ;(window as any).HSOverlay?.open(document.querySelector("#edit-internal-meeting-modal"))
  }, [])

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
        if (!cancelled) setEditMeeting(m)
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
  }, [editMeetingId])

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
      const scheduledAt = date && time ? `${date}T${time}:00.000Z` : editMeeting.scheduledAt
      const payload: UpdateInternalMeetingPayload = {
        title: title || editMeeting.title,
        description: description || undefined,
        scheduledAt,
        durationMinutes,
        meetingType,
        notes: notes || undefined,
        status,
      }
      setEditSaving(true)
      try {
        await updateInternalMeeting(editMeetingId, payload)
        await fetchMeetings()
        closeEditModal()
      } catch (err: any) {
        setEditError(err?.response?.data?.message || err?.message || "Failed to update meeting")
      } finally {
        setEditSaving(false)
      }
    },
    [editMeetingId, editMeeting, fetchMeetings, closeEditModal]
  )

  const handleCancelMeeting = useCallback(
    async (row: InternalMeetingRow) => {
      if (!row.id) return
      if (!confirm(`Cancel "${row.title}"? The join link will be disabled.`)) return
      try {
        await updateInternalMeeting(row.id, { status: "cancelled" })
        await fetchMeetings()
      } catch (err: any) {
        alert(err?.response?.data?.message || err?.message || "Failed to cancel")
      }
    },
    [fetchMeetings]
  )

  const handleRowSelect = (id: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const tableData = useMemo(() => meetings.map((m, i) => meetingToRow(m, i)), [meetings])

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
              <div className="font-semibold text-gray-800 dark:text-white">{r.title}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <i className="ri-calendar-line text-primary"></i>
                  {new Date(r.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
                <span className="flex items-center gap-1">
                  <i className="ri-time-line text-info"></i>
                  {r.time}
                </span>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                <i className="ri-vidicon-line text-success"></i>
                {r.type}
              </div>
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
              title="Edit"
              onClick={() => openEditModal(row.original.id)}
            >
              <i className="ri-pencil-line"></i>
            </button>
            {row.original.status?.toLowerCase() !== "cancelled" && (
              <button
                type="button"
                className="ti-btn ti-btn-icon ti-btn-sm ti-btn-danger"
                title="Cancel"
                onClick={() => handleCancelMeeting(row.original)}
              >
                <i className="ri-close-circle-line"></i>
              </button>
            )}
          </div>
        ),
      },
    ],
    [selectedRows, copiedLinkId, copyMeetingLink, openEditModal, handleCancelMeeting]
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
      initialState: { pageIndex: 0, pageSize: 10 },
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
      <div className="mt-5 grid grid-cols-12 gap-6 h-[calc(100vh-8rem)] sm:mt-6">
        <div className="xl:col-span-12 col-span-12 h-full flex flex-col">
          <div className="box custom-box h-full flex flex-col">
            <div className="box-header relative z-20 flex items-center justify-between flex-wrap gap-4">
              <div className="box-title">
                Meetings
                <span className="badge bg-light text-default rounded-full ms-1 text-[0.75rem] align-middle">{data.length}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  className="form-control !w-auto !py-1 !px-4 !text-[0.75rem] me-2"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                >
                  {[10, 25, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      Show {size}
                    </option>
                  ))}
                </select>
                <div className="hs-dropdown ti-dropdown me-2">
                  <button
                    type="button"
                    className="ti-btn ti-btn-light !py-1 !px-2 !text-[0.75rem] ti-dropdown-toggle"
                    aria-expanded="false"
                  >
                    <i className="ri-arrow-up-down-line font-semibold align-middle me-1"></i>Sort
                    <i className="ri-arrow-down-s-line align-middle ms-1 inline-block"></i>
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
                <div className="flex items-center rounded-lg border border-defaultborder dark:border-defaultborder/20 p-0.5 me-2">
                  <button
                    type="button"
                    onClick={() => setViewMode("table")}
                    className={`ti-btn !py-1 !px-2.5 !text-[0.75rem] rounded-md ${viewMode === "table" ? "ti-btn-primary" : "ti-btn-light"}`}
                  >
                    Table
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("week")}
                    className={`ti-btn !py-1 !px-2.5 !text-[0.75rem] rounded-md ${viewMode === "week" ? "ti-btn-primary" : "ti-btn-light"}`}
                  >
                    Week
                  </button>
                </div>
                <button
                  type="button"
                  className="ti-btn ti-btn-primary-full !py-1 !px-2 !text-[0.75rem] me-2"
                  onClick={() => openHsOverlay("#create-internal-meeting-modal")}
                >
                  <i className="ri-add-line font-semibold align-middle"></i> Schedule meeting
                </button>
              </div>
            </div>
            <div className="box-body relative z-0 !p-0 flex-1 flex flex-col overflow-hidden">
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
                <div className="flex-1 overflow-auto" style={{ minHeight: 0 }}>
                  <div className="table-responsive">
                    <table {...getTableProps()} className="table table-hover whitespace-nowrap min-w-full">
                      <thead>
                        {headerGroups.map((headerGroup: any) => (
                          <tr {...headerGroup.getHeaderGroupProps()} key={headerGroup.id}>
                            {headerGroup.headers.map((column: any) => (
                              <th {...column.getHeaderProps(column.getSortByToggleProps?.())} key={column.id} className="!text-[0.75rem]">
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
                            ))}
                          </tr>
                        ))}
                      </thead>
                      <tbody {...getTableBodyProps()}>
                        {page.map((row: any) => {
                          prepareRow(row)
                          return (
                            <tr {...row.getRowProps()} key={row.id}>
                              {row.cells.map((cell: any) => (
                                <td {...cell.getCellProps()} key={cell.column.id} className="!text-[0.8125rem] align-middle">
                                  {cell.render("Cell")}
                                </td>
                              ))}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-defaultborder dark:border-defaultborder/10">
                    <span className="text-xs text-defaulttextcolor/70">
                      Page {pageIndex + 1} of {pageCount || 1}
                    </span>
                    <nav>
                      <ul className="pagination mb-0">
                        <li className={`page-item ${!canPreviousPage ? "disabled" : ""}`}>
                          <button className="page-link px-3 py-[0.375rem]" onClick={() => previousPage()} disabled={!canPreviousPage}>
                            Prev
                          </button>
                        </li>
                        {pageOptions.map((p: number) => (
                          <li key={p} className={`page-item ${pageIndex === p ? "active" : ""}`}>
                            <button className="page-link px-3 py-[0.375rem]" onClick={() => gotoPage(p)}>
                              {p + 1}
                            </button>
                          </li>
                        ))}
                        <li className={`page-item ${!canNextPage ? "disabled" : ""}`}>
                          <button className="page-link px-3 py-[0.375rem]" onClick={() => nextPage()} disabled={!canNextPage}>
                            Next
                          </button>
                        </li>
                      </ul>
                    </nav>
                  </div>
                </div>
              )}
            </div>
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
      />

      <RecordingsModal
        recordingsLoading={recordingsLoading}
        recordingsError={recordingsError}
        recordingsList={recordingsList}
        onClose={() => setRecordingsModalMeetingId(null)}
      />

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
              {!editLoading && editMeeting && (
                <form onSubmit={handleEditSubmit} className="space-y-5 max-h-[calc(100vh-12rem)] overflow-y-auto">
                  {editError && <div className="p-3 rounded-lg bg-danger/10 text-danger text-sm">{editError}</div>}
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
                        defaultValue={editMeeting.scheduledAt?.slice(0, 10) ?? ""}
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
                        defaultValue={editMeeting.scheduledAt?.slice(11, 16) ?? ""}
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
