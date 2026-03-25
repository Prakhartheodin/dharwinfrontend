"use client"

import React from "react"
import dynamic from "next/dynamic"
import type { AttendanceTrackHistoryItem } from "@/shared/lib/api/attendance"
import { MAX_ATTENDANCE_MS_PER_CALENDAR_DAY } from "@/shared/lib/attendance-display"

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false })

export interface AttendanceDashboardProps {
  historyList: AttendanceTrackHistoryItem[]
  historyLoading: boolean
  historySearch?: string
  setHistorySearch?: (v: string) => void
}

export default function AttendanceDashboard({
  historyList,
  historyLoading,
  historySearch = "",
  setHistorySearch,
}: AttendanceDashboardProps) {
  if (historyLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="box !mb-0">
              <div className="box-body !p-4 animate-pulse">
                <div className="h-3 w-16 rounded bg-black/5 dark:bg-white/10 mb-2" />
                <div className="h-6 w-10 rounded bg-black/5 dark:bg-white/10" />
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-12 gap-6">
          {[1, 2].map((n) => (
            <div key={n} className="col-span-12 xl:col-span-6">
              <div className="box !mb-0"><div className="box-body animate-pulse"><div className="h-[300px] rounded bg-black/5 dark:bg-white/10" /></div></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const list = historyList

  /* Aggregate data */
  const hoursByDate: Record<string, number> = {}
  const sessionsByStudent: Record<string, { name: string; count: number; totalMs: number }> = {}
  const punchInByHour: number[] = Array.from({ length: 24 }, () => 0)
  let totalSessions = 0
  const maxHrsPerDay = MAX_ATTENDANCE_MS_PER_CALENDAR_DAY / (1000 * 60 * 60)

  list.forEach((row) => {
    const dateKey = new Date(row.date).toISOString().slice(0, 10)
    const hrs = (row.durationMs ?? 0) / (1000 * 60 * 60)
    hoursByDate[dateKey] = (hoursByDate[dateKey] || 0) + hrs
    totalSessions += 1

    const sid = row.studentId
    if (!sessionsByStudent[sid]) sessionsByStudent[sid] = { name: row.studentName, count: 0, totalMs: 0 }
    sessionsByStudent[sid].count += 1
    sessionsByStudent[sid].totalMs += (row.durationMs ?? 0)

    if (row.punchIn) {
      try {
        const hour = parseInt(
          new Date(row.punchIn).toLocaleString("en-US", {
            timeZone: row.timezone || "UTC",
            hour: "numeric",
            hour12: false,
          }),
          10
        )
        if (hour >= 0 && hour < 24) punchInByHour[hour] += 1
      } catch {
        const h = new Date(row.punchIn).getHours()
        punchInByHour[h] += 1
      }
    }
  })

  let totalHoursAll = 0
  for (const k of Object.keys(hoursByDate)) {
    hoursByDate[k] = Math.min(hoursByDate[k] ?? 0, maxHrsPerDay)
    totalHoursAll += hoursByDate[k]
  }

  const uniqueStudents = Object.keys(sessionsByStudent).length
  const uniqueDays = Object.keys(hoursByDate).length
  const avgHoursPerDay = uniqueDays > 0 ? (totalHoursAll / uniqueDays).toFixed(1) : "0"

  const dateLabels = Object.keys(hoursByDate).sort().slice(-14)
  const hoursData = dateLabels.map((d) => Math.round((hoursByDate[d] || 0) * 100) / 100)
  const shortDateLabels = dateLabels.map((d) => {
    const dt = new Date(d + "T00:00:00")
    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  })

  const sortedStudents = Object.values(sessionsByStudent).sort((a, b) => b.count - a.count).slice(0, 15)
  const studentLabels = sortedStudents.map((s) => s.name.length > 14 ? s.name.slice(0, 14) + "..." : s.name)
  const sessionsData = sortedStudents.map((s) => s.count)

  const peakHour = punchInByHour.indexOf(Math.max(...punchInByHour))

  /* Chart configs */
  const hoursChartOptions = {
    chart: { type: "area" as const, toolbar: { show: false }, sparkline: { enabled: false } },
    stroke: { curve: "smooth" as const, width: 2.5 },
    fill: { type: "gradient", gradient: { opacityFrom: 0.4, opacityTo: 0.05, shadeIntensity: 1 } },
    xaxis: { categories: shortDateLabels, labels: { style: { colors: "#8c9097", fontSize: "0.6875rem" } }, axisBorder: { show: false }, axisTicks: { show: false } },
    colors: ["#845adf"],
    dataLabels: { enabled: false },
    grid: { borderColor: "rgba(0,0,0,0.04)", strokeDashArray: 3, padding: { left: 8, right: 8 } },
    yaxis: { labels: { style: { colors: "#8c9097", fontSize: "0.6875rem" }, formatter: (v: number) => v.toFixed(1) + "h" } },
    tooltip: { y: { formatter: (v: number) => v.toFixed(2) + " hours" } },
  }

  const sessionsChartOptions = {
    chart: { type: "bar" as const, toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, barHeight: "65%", borderRadius: 4 } },
    xaxis: { categories: studentLabels, labels: { style: { colors: "#8c9097", fontSize: "0.6875rem" } } },
    colors: ["#23b7e5"],
    dataLabels: { enabled: false },
    grid: { borderColor: "rgba(0,0,0,0.04)", strokeDashArray: 3, padding: { left: 8, right: 8 } },
    yaxis: { labels: { style: { colors: "#8c9097", fontSize: "0.6875rem" } } },
    tooltip: { y: { formatter: (v: number) => v + " sessions" } },
  }

  const punchInChartOptions = {
    chart: { type: "bar" as const, toolbar: { show: false } },
    plotOptions: { bar: { columnWidth: "70%", borderRadius: 3 } },
    xaxis: {
      categories: Array.from({ length: 24 }, (_, i) => {
        const suffix = i < 12 ? "AM" : "PM"
        const h = i === 0 ? 12 : i > 12 ? i - 12 : i
        return h + suffix
      }),
      labels: { style: { colors: "#8c9097", fontSize: "0.6rem" }, rotate: -45 },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    colors: ["#26bf94"],
    dataLabels: { enabled: false },
    grid: { borderColor: "rgba(0,0,0,0.04)", strokeDashArray: 3 },
    yaxis: { labels: { style: { colors: "#8c9097", fontSize: "0.6875rem" } } },
    tooltip: { y: { formatter: (v: number) => v + " punch-ins" } },
  }

  return (
    <div className="space-y-4">
      {setHistorySearch && (
        <div className="box !mb-0">
          <div className="box-body !py-3 !px-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-shrink-0">
                <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8c9097] dark:text-white/50 text-[0.9rem] pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="form-control !pl-9 !py-1.5 !text-[0.8125rem] !rounded-md !border-defaultborder dark:!border-defaultborder/10 !w-[200px] sm:!w-[240px]"
                />
              </div>
              <span className="text-[0.6875rem] text-[#8c9097] dark:text-white/50">
                {historyList.length} record{historyList.length !== 1 ? "s" : ""} in view
              </span>
            </div>
          </div>
        </div>
      )}
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="box !mb-0">
          <div className="box-body !p-4 flex items-center gap-3">
            <span className="avatar avatar-sm rounded-md bg-primary/10 text-primary">
              <i className="ti ti-users text-[1rem]" />
            </span>
            <div>
              <p className="text-[0.6875rem] text-[#8c9097] dark:text-white/50 mb-0">Students</p>
              <p className="text-[1.125rem] font-semibold text-defaulttextcolor dark:text-white mb-0">{uniqueStudents}</p>
            </div>
          </div>
        </div>
        <div className="box !mb-0">
          <div className="box-body !p-4 flex items-center gap-3">
            <span className="avatar avatar-sm rounded-md bg-secondary/10 text-secondary">
              <i className="ri-time-line text-[1rem]" />
            </span>
            <div>
              <p className="text-[0.6875rem] text-[#8c9097] dark:text-white/50 mb-0">Total Hours</p>
              <p className="text-[1.125rem] font-semibold text-defaulttextcolor dark:text-white mb-0">{totalHoursAll.toFixed(1)}</p>
            </div>
          </div>
        </div>
        <div className="box !mb-0">
          <div className="box-body !p-4 flex items-center gap-3">
            <span className="avatar avatar-sm rounded-md bg-success/10 text-success">
              <i className="ri-bar-chart-2-line text-[1rem]" />
            </span>
            <div>
              <p className="text-[0.6875rem] text-[#8c9097] dark:text-white/50 mb-0">Avg / Day</p>
              <p className="text-[1.125rem] font-semibold text-defaulttextcolor dark:text-white mb-0">{avgHoursPerDay}h</p>
            </div>
          </div>
        </div>
        <div className="box !mb-0">
          <div className="box-body !p-4 flex items-center gap-3">
            <span className="avatar avatar-sm rounded-md bg-warning/10 text-warning">
              <i className="ri-sun-line text-[1rem]" />
            </span>
            <div>
              <p className="text-[0.6875rem] text-[#8c9097] dark:text-white/50 mb-0">Peak Hour</p>
              <p className="text-[1.125rem] font-semibold text-defaulttextcolor dark:text-white mb-0">
                {totalSessions > 0 ? (peakHour === 0 ? "12AM" : peakHour > 12 ? (peakHour - 12) + "PM" : peakHour === 12 ? "12PM" : peakHour + "AM") : "—"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 xl:col-span-7">
          <div className="box !mb-0">
            <div className="box-header">
              <div className="box-title text-[0.8125rem]">Hours Per Day</div>
              <span className="text-[0.6875rem] text-[#8c9097] dark:text-white/50 ms-auto">Last 14 days</span>
            </div>
            <div className="box-body !pt-0">
              {dateLabels.length ? (
                <ReactApexChart
                  type="area"
                  height={320}
                  options={hoursChartOptions}
                  series={[{ name: "Hours", data: hoursData }]}
                />
              ) : (
                <div className="flex items-center justify-center h-[320px]">
                  <div className="text-center">
                    <i className="ri-bar-chart-line text-[2rem] text-[#8c9097]/30" />
                    <p className="mt-2 text-[0.8125rem] text-[#8c9097]">No data for this range</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="col-span-12 xl:col-span-5">
          <div className="box !mb-0">
            <div className="box-header">
              <div className="box-title text-[0.8125rem]">Sessions Per Student</div>
              <span className="text-[0.6875rem] text-[#8c9097] dark:text-white/50 ms-auto">Top 15</span>
            </div>
            <div className="box-body !pt-0">
              {studentLabels.length ? (
                <ReactApexChart
                  type="bar"
                  height={320}
                  options={sessionsChartOptions}
                  series={[{ name: "Sessions", data: sessionsData }]}
                />
              ) : (
                <div className="flex items-center justify-center h-[320px]">
                  <div className="text-center">
                    <i className="ri-bar-chart-horizontal-line text-[2rem] text-[#8c9097]/30" />
                    <p className="mt-2 text-[0.8125rem] text-[#8c9097]">No data for this range</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="col-span-12">
          <div className="box !mb-0">
            <div className="box-header">
              <div className="box-title text-[0.8125rem]">Punch-In Distribution</div>
              <span className="text-[0.6875rem] text-[#8c9097] dark:text-white/50 ms-auto">By hour of day</span>
            </div>
            <div className="box-body !pt-0">
              {list.length ? (
                <ReactApexChart
                  type="bar"
                  height={280}
                  options={punchInChartOptions}
                  series={[{ name: "Punch-ins", data: punchInByHour }]}
                />
              ) : (
                <div className="flex items-center justify-center h-[280px]">
                  <div className="text-center">
                    <i className="ri-time-line text-[2rem] text-[#8c9097]/30" />
                    <p className="mt-2 text-[0.8125rem] text-[#8c9097]">No data for this range</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
