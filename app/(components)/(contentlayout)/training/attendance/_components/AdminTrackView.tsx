"use client"

import React, { useState, useMemo } from "react"
import type { AttendanceTrackItem } from "@/shared/lib/api/attendance"

export interface AdminTrackViewProps {
  trackList: AttendanceTrackItem[]
  trackListLoading: boolean
  canPunchOutOthers: boolean
  punchOutLoadingId: string | null
  search: string
  onSearchChange: (value: string) => void
  onPunchOut: (studentId: string) => void
  onExportCsv: (list?: AttendanceTrackItem[]) => void
  formatTimeInTimezone: (dateStr: string | null, timezone: string) => string
  formatDuration: (ms: number) => string
  formatDurationFromMs: (ms: number | null) => string
}

export default function AdminTrackView({
  trackList,
  trackListLoading,
  canPunchOutOthers,
  punchOutLoadingId,
  search,
  onSearchChange,
  onPunchOut,
  onExportCsv,
  formatTimeInTimezone,
  formatDuration,
  formatDurationFromMs,
}: AdminTrackViewProps) {
  const [statusFilter, setStatusFilter] = useState<"all" | "in" | "out">("all")

  const filteredList = useMemo(() => {
    return trackList.filter((r) => {
      if (statusFilter === "in" && !r.isPunchedIn) return false
      if (statusFilter === "out" && r.isPunchedIn) return false
      return true
    })
  }, [trackList, statusFilter])

  const punchedInCount = filteredList.filter((r) => r.isPunchedIn).length
  const punchedOutCount = filteredList.length - punchedInCount

  return (
    <div className="space-y-4">
      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="box !mb-0">
          <div className="box-body !p-4 flex items-center gap-3">
            <span className="avatar avatar-sm rounded-md bg-primary/10 text-primary">
              <i className="ti ti-users text-[1rem]" />
            </span>
            <div>
              <p className="text-[0.6875rem] text-[#8c9097] dark:text-white/50 mb-0">Total Students</p>
              <p className="text-[1.125rem] font-semibold text-defaulttextcolor dark:text-white mb-0">{filteredList.length}</p>
            </div>
          </div>
        </div>
        <div className="box !mb-0">
          <div className="box-body !p-4 flex items-center gap-3">
            <span className="avatar avatar-sm rounded-md bg-success/10 text-success">
              <i className="ri-user-follow-line text-[1rem]" />
            </span>
            <div>
              <p className="text-[0.6875rem] text-[#8c9097] dark:text-white/50 mb-0">Clocked In</p>
              <p className="text-[1.125rem] font-semibold text-success mb-0">{punchedInCount}</p>
            </div>
          </div>
        </div>
        <div className="box !mb-0">
          <div className="box-body !p-4 flex items-center gap-3">
            <span className="avatar avatar-sm rounded-md bg-gray-100 dark:bg-white/10 text-[#8c9097]">
              <i className="ri-user-unfollow-line text-[1rem]" />
            </span>
            <div>
              <p className="text-[0.6875rem] text-[#8c9097] dark:text-white/50 mb-0">Clocked Out</p>
              <p className="text-[1.125rem] font-semibold text-defaulttextcolor dark:text-white mb-0">{punchedOutCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="box !mb-0">
        <div className="box-header flex flex-wrap items-center justify-between gap-3">
          <div className="box-title flex items-center gap-2 flex-shrink-0">
            Live Attendance
            {punchedInCount > 0 && (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success" />
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8c9097] dark:text-white/50 text-[0.9rem] pointer-events-none" />
              <input
                type="text"
                placeholder="Search by name, email, or employee ID..."
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="form-control !pl-9 !py-1.5 !text-[0.8125rem] !rounded-md !border-defaultborder dark:!border-defaultborder/10 !w-[200px] sm:!w-[220px]"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | "in" | "out")}
              className="form-control !w-auto !py-1.5 !px-3 !text-[0.75rem] !rounded-md"
            >
              <option value="all">All status</option>
              <option value="in">Clocked In</option>
              <option value="out">Clocked Out</option>
            </select>
            <button
              type="button"
              className="ti-btn ti-btn-icon ti-btn-sm ti-btn-outline-primary flex-shrink-0"
              onClick={() => onExportCsv(filteredList)}
              disabled={trackList.length === 0}
              title="Export CSV"
            >
              <i className="ri-download-2-line" />
            </button>
          </div>
        </div>
        <div className="box-body !p-0">
          {trackListLoading ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="flex items-center gap-4 animate-pulse">
                  <div className="h-8 w-8 rounded-full bg-black/5 dark:bg-white/10" />
                  <div className="h-4 flex-1 rounded bg-black/5 dark:bg-white/10" />
                  <div className="h-5 w-20 rounded-full bg-black/5 dark:bg-white/10" />
                  <div className="h-4 w-24 rounded bg-black/5 dark:bg-white/10" />
                </div>
              ))}
            </div>
          ) : filteredList.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/5">
                <i className="ri-group-line text-[1.5rem] text-primary/40" />
              </div>
              <p className="text-[0.8125rem] text-[#8c9097]">
                {trackList.length === 0 ? "No students found" : "No matches for your search or filters"}
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover whitespace-nowrap min-w-full">
                <thead>
                  <tr className="border-b border-defaultborder dark:border-defaultborder/10">
                    <th className="!text-start !text-[0.75rem] !font-semibold text-[#8c9097] dark:text-white/50 !py-3">Student</th>
                    <th className="!text-start !text-[0.75rem] !font-semibold text-[#8c9097] dark:text-white/50 !py-3">Employee ID</th>
                    <th className="!text-start !text-[0.75rem] !font-semibold text-[#8c9097] dark:text-white/50 !py-3">Status</th>
                    <th className="!text-start !text-[0.75rem] !font-semibold text-[#8c9097] dark:text-white/50 !py-3">Punch In</th>
                    <th className="!text-start !text-[0.75rem] !font-semibold text-[#8c9097] dark:text-white/50 !py-3">Punch Out</th>
                    <th className="!text-start !text-[0.75rem] !font-semibold text-[#8c9097] dark:text-white/50 !py-3">Duration</th>
                    <th className="!text-start !text-[0.75rem] !font-semibold text-[#8c9097] dark:text-white/50 !py-3">Timezone</th>
                    <th className="!text-center !text-[0.75rem] !font-semibold text-[#8c9097] dark:text-white/50 !py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((row) => {
                    const initials = (row.studentName || "?").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
                    const liveDuration = row.isPunchedIn && row.punchIn
                      ? formatDuration(Date.now() - new Date(row.punchIn).getTime())
                      : formatDurationFromMs(row.durationMs ?? null)

                    return (
                      <tr
                        key={row.studentId}
                        className="border-b border-defaultborder dark:border-defaultborder/10 hover:bg-gray-50/50 dark:hover:bg-light/5 transition-colors"
                      >
                        <td className="!py-3">
                          <div className="flex items-center gap-3">
                            <span className={"avatar avatar-sm avatar-rounded text-[0.65rem] font-bold " + (row.isPunchedIn ? "bg-success/10 text-success" : "bg-gray-100 dark:bg-white/10 text-[#8c9097]")}>
                              {initials}
                            </span>
                            <div>
                              <p className="text-[0.8125rem] font-medium text-defaulttextcolor dark:text-white mb-0">
                                {row.studentName}
                              </p>
                              <p className="text-[0.6875rem] text-[#8c9097] dark:text-white/50 mb-0">{row.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="!py-3 text-[0.8125rem] text-defaulttextcolor dark:text-white">{row.employeeId || "—"}</td>
                        <td className="!py-3">
                          {row.isPunchedIn ? (
                            <span className="inline-flex items-center gap-1.5 badge bg-success/10 text-success !rounded-full">
                              <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success" />
                              </span>
                              Active
                            </span>
                          ) : (
                            <span className="badge bg-gray-100 dark:bg-white/10 text-[#8c9097] !rounded-full">
                              Offline
                            </span>
                          )}
                        </td>
                        <td className="!py-3 text-[0.8125rem] text-defaulttextcolor dark:text-white">
                          {row.punchIn ? formatTimeInTimezone(row.punchIn, row.timezone) : "—"}
                        </td>
                        <td className="!py-3 text-[0.8125rem] text-defaulttextcolor dark:text-white">
                          {row.punchOut ? formatTimeInTimezone(row.punchOut, row.timezone) : (row.isPunchedIn ? <span className="text-[#8c9097] italic">In progress</span> : "—")}
                        </td>
                        <td className="!py-3">
                          <span className={"text-[0.8125rem] font-medium " + (row.isPunchedIn ? "text-success" : "text-defaulttextcolor dark:text-white")}>
                            {liveDuration}
                          </span>
                        </td>
                        <td className="!py-3 text-[0.75rem] text-[#8c9097] dark:text-white/50">{row.timezone}</td>
                        <td className="!py-3 !text-center">
                          {canPunchOutOthers && row.isPunchedIn ? (
                            <button
                              type="button"
                              className="ti-btn ti-btn-sm ti-btn-soft-danger ti-btn-wave inline-flex items-center justify-center gap-2 min-w-[6.5rem] !py-2 !px-3.5 !text-[0.8125rem] overflow-hidden"
                              onClick={() => onPunchOut(row.studentId)}
                              disabled={punchOutLoadingId === row.studentId}
                              title="Force Punch Out"
                            >
                              {punchOutLoadingId === row.studentId ? (
                                <i className="ri-loader-4-line animate-spin flex-shrink-0" />
                              ) : (
                                <>
                                  <i className="ri-logout-box-r-line flex-shrink-0 text-[1rem]" />
                                  <span className="truncate">Clock Out</span>
                                </>
                              )}
                            </button>
                          ) : (
                            <span className="text-[#8c9097]/40">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
