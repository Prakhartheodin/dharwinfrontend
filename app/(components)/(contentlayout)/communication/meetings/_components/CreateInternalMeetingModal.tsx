"use client"

import React, { useCallback, useMemo } from "react"
import dynamic from "next/dynamic"
import { format } from "date-fns"
import { useAuth } from "@/shared/contexts/auth-context"
import { appendJoinIdentityToUrl } from "@/shared/lib/join-room-url"
import type { InternalMeeting } from "@/shared/lib/api/internal-meetings"

const DatePicker = dynamic(() => import("react-datepicker").then((m) => m.default), { ssr: false })

type WhenTriggerProps = { value?: string; onClick?: () => void; disabled?: boolean }

const InternalMeetingWhenTrigger = React.forwardRef<HTMLButtonElement, WhenTriggerProps>(
  function InternalMeetingWhenTrigger({ value, onClick, disabled }, ref) {
    return (
      <button
        type="button"
        ref={ref}
        onClick={onClick}
        disabled={disabled}
        id="internal-schedule-when-trigger"
        className="group flex w-full items-center gap-3 rounded-xl border border-defaultborder bg-white py-2.5 pl-3.5 pr-12 text-left text-sm shadow-sm transition-[border-color,box-shadow,transform] duration-200 ease-out hover:border-primary/35 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none dark:border-defaultborder/10 dark:bg-bodybg dark:focus-visible:ring-offset-bodybg active:scale-[0.99] motion-reduce:active:scale-100"
        aria-haspopup="dialog"
        aria-expanded={undefined}
        aria-label={value ? `Meeting date and time: ${value}` : "Choose meeting date and time"}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/[0.08] text-primary transition-transform duration-200 motion-reduce:transition-none group-hover:scale-105 motion-reduce:group-hover:scale-100 dark:bg-primary/15">
          <i className="ri-calendar-schedule-line text-lg" aria-hidden />
        </span>
        <span className="min-w-0 flex-1 pr-1">
          <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-textmuted dark:text-white/50">Date and time</span>
          <span className="block truncate font-medium text-defaulttextcolor dark:text-white">{value || "Select date & time"}</span>
        </span>
      </button>
    )
  }
)

export interface CreateInternalMeetingModalProps {
  createdMeeting: InternalMeeting | null
  resetCreateMeetingForm: () => void
  formError: string | null
  formLoading: boolean
  onSubmit: (e: React.FormEvent) => void
  hosts: { nameOrRole: string; email: string }[]
  setHosts: React.Dispatch<React.SetStateAction<{ nameOrRole: string; email: string }[]>>
  emailInvites: string[]
  setEmailInvites: React.Dispatch<React.SetStateAction<string[]>>
  scheduledInternalMeetingAt: Date | null
  onScheduledInternalMeetingAtChange: (value: Date | null) => void
}

export default function CreateInternalMeetingModal({
  createdMeeting,
  resetCreateMeetingForm,
  formError,
  formLoading,
  onSubmit,
  hosts,
  setHosts,
  emailInvites,
  setEmailInvites,
  scheduledInternalMeetingAt,
  onScheduledInternalMeetingAtChange,
}: CreateInternalMeetingModalProps) {
  const { user } = useAuth()
  const shareMeetingUrl = useMemo(() => (createdMeeting?.publicMeetingUrl || "").trim(), [createdMeeting?.publicMeetingUrl])

  const personalMeetingUrl = useMemo(() => {
    const base = shareMeetingUrl
    if (!base) return ""
    const joinName = (user?.name?.trim() || user?.email?.split("@")[0] || "").trim()
    const joinEmail = user?.email?.trim() || ""
    return appendJoinIdentityToUrl(base, joinName, joinEmail)
  }, [shareMeetingUrl, user?.name, user?.email])

  const closeModal = useCallback(() => {
    resetCreateMeetingForm()
    ;(window as any).HSOverlay?.close(document.querySelector("#create-internal-meeting-modal"))
  }, [resetCreateMeetingForm])

  const startOfToday = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const filterTime = useCallback((time: Date) => time.getTime() > Date.now() - 60_000, [])

  const scheduleDateStr = scheduledInternalMeetingAt ? format(scheduledInternalMeetingAt, "yyyy-MM-dd") : ""
  const scheduleTimeStr = scheduledInternalMeetingAt ? format(scheduledInternalMeetingAt, "HH:mm") : ""

  const handleInstantMeetingFill = useCallback(() => {
    const rounded = new Date()
    rounded.setSeconds(0, 0)
    const nextQuarter = Math.ceil((rounded.getMinutes() + 2) / 15) * 15
    rounded.setMinutes(nextQuarter)

    const titleInput = document.querySelector<HTMLInputElement>("#internal-schedule-title")
    const descInput = document.querySelector<HTMLTextAreaElement>("#internal-schedule-description")
    const durationInput = document.querySelector<HTMLInputElement>("#internal-schedule-duration")
    const maxInput = document.querySelector<HTMLInputElement>("#internal-schedule-max-p")
    const notesInput = document.querySelector<HTMLTextAreaElement>("#internal-schedule-notes")
    const allowGuest = document.querySelector<HTMLInputElement>("#internal-schedule-allow-guest")
    const requireApproval = document.querySelector<HTMLInputElement>("#internal-schedule-require-approval")
    const videoType = document.querySelector<HTMLInputElement>('input[name="internal-schedule-type"][value="video"]')

    if (titleInput && !titleInput.value.trim()) {
      titleInput.value = `Instant Meeting - ${format(rounded, "MMM d, h:mm a")}`
    }
    if (descInput && !descInput.value.trim()) {
      descInput.value = "Auto-filled instant meeting details."
    }
    if (durationInput) durationInput.value = "60"
    if (maxInput) maxInput.value = "10"
    if (allowGuest) allowGuest.checked = true
    if (requireApproval) requireApproval.checked = false
    if (videoType) videoType.checked = true
    if (notesInput && !notesInput.value.trim()) notesInput.value = "Instant meeting"

    if (hosts.length === 0 || !hosts[0]?.email?.trim()) {
      const fallbackName = user?.name?.trim() || user?.email?.split("@")[0] || "Host"
      const fallbackEmail = user?.email?.trim() || ""
      setHosts([{ nameOrRole: fallbackName, email: fallbackEmail }, ...hosts.slice(1)])
    }
    if (emailInvites.length === 1 && !emailInvites[0]?.trim()) {
      setEmailInvites([""])
    }

    onScheduledInternalMeetingAtChange(rounded)
  }, [emailInvites, hosts, onScheduledInternalMeetingAtChange, setEmailInvites, setHosts, user?.email, user?.name])

  return (
    <div
      id="create-internal-meeting-modal"
      className="hs-overlay hidden ti-modal size-lg !z-[105]"
      tabIndex={-1}
      aria-labelledby="create-internal-meeting-modal-label"
      aria-hidden="true"
    >
      <div className="hs-overlay-open:mt-7 ti-modal-box mt-0 ease-out transition-all sm:max-w-2xl">
        <div className="ti-modal-content flex min-h-0 flex-col overflow-hidden border border-defaultborder dark:border-defaultborder/10 rounded-xl shadow-xl">
          <div className="ti-modal-header shrink-0 bg-gradient-to-b from-gray-50 to-gray-50/80 dark:from-black/25 dark:to-black/15 border-b border-defaultborder dark:border-defaultborder/10 px-6 py-4">
            <h3
              id="create-internal-meeting-modal-label"
              className="ti-modal-title text-lg font-semibold text-defaulttextcolor dark:text-white flex items-center gap-2"
            >
              <i className="ri-calendar-schedule-line text-primary text-xl"></i>
              {createdMeeting ? "Meeting created" : "Schedule meeting"}
            </h3>
            <button
              type="button"
              className="ti-modal-close-btn flex-shrink-0 rounded-md p-0 text-gray-500 transition-colors duration-200 hover:text-gray-700 dark:text-[#8c9097] dark:hover:text-white/80 hover:bg-gray-100 dark:hover:bg-black/40 focus:ring-2 focus:ring-primary/20 focus:ring-offset-0"
              onClick={closeModal}
              aria-label="Close"
            >
              <i className="ri-close-line text-xl"></i>
            </button>
          </div>
          {createdMeeting ? (
            <div className="ti-modal-body flex min-h-0 max-h-[min(88vh,40rem)] flex-col overflow-hidden px-6 py-0">
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain py-5 scroll-smooth">
                <div className="text-center mb-6">
                  <div className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success shadow-inner ring-2 ring-success/30">
                    <i className="ri-check-double-line text-2xl"></i>
                  </div>
                  <h4 className="text-lg font-semibold text-defaulttextcolor dark:text-white mb-1">Meeting created</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{createdMeeting.title}</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="form-label block text-xs font-medium text-defaulttextcolor dark:text-white mb-1">Share link</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={shareMeetingUrl}
                        className="form-control !py-2 !text-sm flex-1 border-defaultborder dark:border-defaultborder/10 rounded-lg bg-gray-50 dark:bg-black/20"
                      />
                      <button
                        type="button"
                        className="ti-btn ti-btn-primary !py-2 !px-3 !text-sm"
                        onClick={() => shareMeetingUrl && void navigator.clipboard.writeText(shareMeetingUrl)}
                      >
                        <i className="ri-share-line me-1"></i>Copy
                      </button>
                    </div>
                  </div>
                  {personalMeetingUrl && personalMeetingUrl !== shareMeetingUrl && (
                    <div>
                      <label className="form-label block text-xs font-medium text-defaulttextcolor dark:text-white mb-1">Your join link</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          readOnly
                          value={personalMeetingUrl}
                          className="form-control !py-2 !text-sm flex-1 border-defaultborder dark:border-defaultborder/10 rounded-lg bg-gray-50 dark:bg-black/20"
                        />
                        <button
                          type="button"
                          className="ti-btn ti-btn-outline-primary !py-2 !px-3 !text-sm"
                          onClick={() => void navigator.clipboard.writeText(personalMeetingUrl)}
                        >
                          <i className="ri-file-copy-line me-1"></i>Copy
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="shrink-0 border-t border-defaultborder dark:border-defaultborder/10 bg-gray-50/95 px-6 py-4 backdrop-blur-sm dark:bg-black/30">
                <div className="flex flex-wrap gap-2 justify-end">
                  <button type="button" className="ti-btn ti-btn-light !py-2 !px-4 !text-sm font-medium" onClick={closeModal}>
                    Close
                  </button>
                  <button type="button" className="ti-btn ti-btn-outline-primary !py-2 !px-4 !text-sm font-medium" onClick={resetCreateMeetingForm}>
                    <i className="ri-add-line me-1.5"></i>Schedule another
                  </button>
                  <a
                    href={personalMeetingUrl || shareMeetingUrl || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ti-btn ti-btn-primary !py-2 !px-4 !text-sm font-medium"
                  >
                    <i className="ri-vidicon-line me-1.5"></i>Join
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <form
              className="ti-modal-body !p-0 flex min-h-0 max-h-[min(88vh,46rem)] flex-col overflow-hidden"
              onSubmit={onSubmit}
              noValidate
            >
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-6 py-5 space-y-5 pb-6">
                {formError && (
                  <div
                    id="internal-meeting-form-error"
                    role="alert"
                    className="rounded-lg border border-danger/25 border-l-4 border-l-danger bg-danger/10 p-3 text-danger text-sm"
                  >
                    {formError}
                  </div>
                )}
                <div>
                  <label htmlFor="internal-schedule-title" className="form-label block text-sm font-medium mb-1.5">
                    Title <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    id="internal-schedule-title"
                    placeholder="e.g. Weekly standup"
                    className="form-control !py-2 !text-sm w-full border-defaultborder dark:border-defaultborder/10 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="internal-schedule-description" className="form-label block text-sm font-medium mb-1.5">
                    Description
                  </label>
                  <textarea
                    id="internal-schedule-description"
                    rows={2}
                    placeholder="Optional"
                    className="form-control !py-2 !text-sm w-full border-defaultborder dark:border-defaultborder/10 rounded-lg resize-none"
                  />
                </div>
                <p className="flex items-center gap-2 border-b border-defaultborder/50 pb-2.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-primary dark:text-primary/90 dark:border-white/10">
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
                        onClick={handleInstantMeetingFill}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/[0.06] px-2.5 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-primary transition-colors hover:bg-primary/[0.12] dark:border-primary/40 dark:bg-primary/10"
                      >
                        <i className="ri-flashlight-line text-sm" />
                        Instant meeting
                      </button>
                    </div>
                    {scheduledInternalMeetingAt ? (
                      <div className="inline-flex w-full max-w-full" aria-live="polite">
                        <span className="inline-flex items-center rounded-lg border border-primary/20 bg-primary/[0.06] px-2.5 py-1.5 text-[0.6875rem] font-medium text-primary shadow-sm dark:border-primary/30 dark:bg-primary/10">
                          {format(scheduledInternalMeetingAt, "MMM d")} · {format(scheduledInternalMeetingAt, "h:mm a")}
                        </span>
                      </div>
                    ) : null}
                    <div className="isolate min-h-0 w-full">
                      <input type="hidden" id="internal-schedule-date" value={scheduleDateStr} readOnly tabIndex={-1} aria-hidden />
                      <input type="hidden" id="internal-schedule-time" value={scheduleTimeStr} readOnly tabIndex={-1} aria-hidden />
                      <DatePicker
                        selected={scheduledInternalMeetingAt}
                        onChange={(d: Date | null) => onScheduledInternalMeetingAtChange(d)}
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
                        disabled={formLoading}
                        popperClassName="!z-[130]"
                        popperProps={{ strategy: "fixed" }}
                        calendarClassName="schedule-interview-dp-cal"
                        wrapperClassName="schedule-interview-dp-wrap block w-full"
                        customInput={<InternalMeetingWhenTrigger disabled={formLoading} />}
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
                    <label htmlFor="internal-schedule-duration" className="form-label block text-sm font-medium mb-1.5">
                      Duration (minutes) <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      id="internal-schedule-duration"
                      min={1}
                      max={480}
                      defaultValue={60}
                      required
                      className="form-control !py-2 !text-sm w-full rounded-lg"
                    />
                  </div>
                  <div>
                    <label htmlFor="internal-schedule-max-p" className="form-label block text-sm font-medium mb-1.5">
                      Max participants
                    </label>
                    <input
                      type="number"
                      id="internal-schedule-max-p"
                      min={1}
                      max={100}
                      defaultValue={10}
                      className="form-control !py-2 !text-sm w-full rounded-lg"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" id="internal-schedule-allow-guest" defaultChecked className="form-check-input !w-4 !h-4 text-primary" />
                    <span className="text-sm">Allow guest join</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" id="internal-schedule-require-approval" className="form-check-input !w-4 !h-4 text-primary" />
                    <span className="text-sm">Require approval</span>
                  </label>
                </div>
                <div>
                  <label className="form-label block text-sm font-medium mb-2">
                    Hosts <span className="text-danger">*</span>
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
                          className="form-control !py-2 !text-sm flex-1 min-w-[120px] rounded-lg"
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
                          className="form-control !py-2 !text-sm flex-1 min-w-[180px] rounded-lg"
                        />
                        {hosts.length > 1 && (
                          <button
                            type="button"
                            className="ti-btn ti-btn-light !py-2 !px-2"
                            onClick={() => setHosts((prev) => prev.filter((_, j) => j !== i))}
                            aria-label="Remove host"
                          >
                            <i className="ri-close-line"></i>
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      className="ti-btn ti-btn-outline-light !py-2 !px-3 !text-sm"
                      onClick={() => setHosts((prev) => [...prev, { nameOrRole: "", email: "" }])}
                    >
                      <i className="ri-add-line me-0.5"></i>Add host
                    </button>
                  </div>
                </div>
                <div>
                  <label className="form-label block text-sm font-medium mb-2">Email invites</label>
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
                          className="form-control !py-2 !text-sm flex-1 rounded-lg"
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
                      className="ti-btn ti-btn-outline-light !py-2 !px-3 !text-sm"
                      onClick={() => setEmailInvites((prev) => [...prev, ""])}
                    >
                      <i className="ri-add-line me-0.5"></i>Add email
                    </button>
                  </div>
                </div>
                <div>
                  <label className="form-label block text-sm font-medium mb-2">Meeting type</label>
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    {(["Video", "In-Person", "Phone"] as const).map((type) => (
                      <label
                        key={type}
                        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-xl border-2 border-defaultborder px-3 py-2 sm:flex-initial has-[:checked]:border-primary has-[:checked]:bg-primary/5 dark:border-defaultborder/10"
                      >
                        <input
                          type="radio"
                          name="internal-schedule-type"
                          value={type === "In-Person" ? "in-person" : type.toLowerCase()}
                          defaultChecked={type === "Video"}
                          className="form-check-input !w-4 !h-4 text-primary"
                        />
                        <span className="text-sm font-medium">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label htmlFor="internal-schedule-notes" className="form-label block text-sm font-medium mb-1.5">
                    Notes
                  </label>
                  <textarea
                    id="internal-schedule-notes"
                    rows={2}
                    className="form-control !py-2 !text-sm w-full rounded-lg resize-none"
                    placeholder="Optional notes"
                  />
                </div>
              </div>
              <div className="ti-modal-footer flex shrink-0 flex-col gap-3 border-t bg-gray-50/95 px-6 py-4 dark:bg-black/35 dark:border-defaultborder/10">
                <div className="flex w-full flex-wrap items-center justify-end gap-2">
                  <button type="button" className="ti-btn ti-btn-light !py-2 !px-4 !text-sm" onClick={closeModal}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="ti-btn ti-btn-primary !py-2.5 !px-5 !text-sm min-w-[11rem] disabled:opacity-80"
                  >
                    {formLoading ? (
                      <>
                        <span className="me-1.5 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <i className="ri-check-line me-1.5"></i>Schedule meeting
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
