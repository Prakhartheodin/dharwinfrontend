"use client"

import React from "react"
import type { AttendanceTrackItem } from "@/shared/lib/api/attendance"

export interface AdminTrackViewProps {
  trackList: AttendanceTrackItem[]
  trackListLoading: boolean
  canPunchOutOthers: boolean
  punchOutLoadingId: string | null
  onPunchOut: (studentId: string) => void
  onExportCsv: () => void
  formatTimeInTimezone: (dateStr: string | null, timezone: string) => string
  formatDuration: (ms: number) => string
  formatDurationFromMs: (ms: number | null) => string
}

export default function AdminTrackView({
  trackList,
  trackListLoading,
  canPunchOutOthers,
  punchOutLoadingId,
  onPunchOut,
  onExportCsv,
  formatTimeInTimezone,
  formatDuration,
  formatDurationFromMs,
}: AdminTrackViewProps) {
  return (
    <div className="box">
      <div className="box-header flex flex-wrap items-center justify-between gap-2">
        <div className="box-title">Track Attendance</div>
        <button
          type="button"
          className="ti-btn ti-btn-outline-primary !py-1.5 !px-3 !text-[0.8125rem]"
          onClick={onExportCsv}
          disabled={trackList.length === 0}
        >
          Export CSV
        </button>
      </div>
      <div className="box-body">
        {trackListLoading ? (
          <div className="py-8 text-center text-defaulttextcolor/70">Loading…</div>
        ) : trackList.length === 0 ? (
          <div className="py-8 text-center text-defaulttextcolor/70">No students found.</div>
        ) : (
          <div className="table-responsive">
            <table className="table table-bordered table-hover min-w-full text-[0.8125rem]">
              <thead>
                <tr className="bg-gray-50 dark:bg-white/5">
                  <th className="!text-start">Name</th>
                  <th className="!text-start">Email</th>
                  <th className="!text-start">Status</th>
                  <th className="!text-start">Punch In (timezone)</th>
                  <th className="!text-start">Punch Out (timezone)</th>
                  <th className="!text-start">Duration</th>
                  <th className="!text-start">Timezone</th>
                  <th className="!text-start">Action</th>
                </tr>
              </thead>
              <tbody>
                {trackList.map((row) => (
                  <tr key={row.studentId}>
                    <td>{row.studentName}</td>
                    <td>{row.email}</td>
                    <td>
                      <span
                        className={`badge ${row.isPunchedIn ? "bg-success/10 text-success" : "bg-defaultborder text-defaulttextcolor"}`}
                      >
                        {row.isPunchedIn ? "Punched In" : "Punched Out"}
                      </span>
                    </td>
                    <td>{formatTimeInTimezone(row.punchIn, row.timezone)}</td>
                    <td>{formatTimeInTimezone(row.punchOut, row.timezone)}</td>
                    <td>
                      {row.isPunchedIn && row.punchIn
                        ? formatDuration(Date.now() - new Date(row.punchIn).getTime())
                        : formatDurationFromMs(row.durationMs ?? null)}
                    </td>
                    <td>{row.timezone}</td>
                    <td>
                      <span className="flex flex-wrap items-center gap-2">
                        {canPunchOutOthers && row.isPunchedIn ? (
                          <button
                            type="button"
                            className="ti-btn ti-btn-outline-danger !py-1 !px-2"
                            onClick={() => onPunchOut(row.studentId)}
                            disabled={punchOutLoadingId === row.studentId}
                            title="Punch Out"
                          >
                            {punchOutLoadingId === row.studentId ? (
                              <i className="ri-loader-4-line animate-spin text-lg" />
                            ) : (
                              <>
                                <i className="ri-logout-box-r-line text-lg" />
                                <span className="ms-1">Punch Out</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="text-defaulttextcolor/50">—</span>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
