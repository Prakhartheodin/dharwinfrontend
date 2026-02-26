"use client"

import React from "react"
import dynamic from "next/dynamic"
import type { AttendanceTrackHistoryItem } from "@/shared/lib/api/attendance"

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false })

export interface AttendanceDashboardProps {
  historyList: AttendanceTrackHistoryItem[]
  historyLoading: boolean
}

export default function AttendanceDashboard({
  historyList,
  historyLoading,
}: AttendanceDashboardProps) {
  if (historyLoading) {
    return (
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 py-8 text-center text-defaulttextcolor/70">
          Loading dashboard…
        </div>
      </div>
    )
  }

  const list = historyList
  const hoursByDate: Record<string, number> = {}
  const sessionsByStudent: Record<string, { name: string; count: number }> = {}
  const punchInByHour: number[] = Array.from({ length: 24 }, () => 0)
  list.forEach((row) => {
    const dateKey = new Date(row.date).toISOString().slice(0, 10)
    hoursByDate[dateKey] = (hoursByDate[dateKey] || 0) + (row.durationMs ?? 0) / (1000 * 60 * 60)
    const sid = row.studentId
    if (!sessionsByStudent[sid]) sessionsByStudent[sid] = { name: row.studentName, count: 0 }
    sessionsByStudent[sid].count += 1
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
  const dateLabels = Object.keys(hoursByDate).sort().slice(-14)
  const hoursData = dateLabels.map((d) => Math.round((hoursByDate[d] || 0) * 100) / 100)
  const studentLabels = Object.values(sessionsByStudent).map((s) =>
    s.name.length > 12 ? s.name.slice(0, 12) + "…" : s.name
  )
  const sessionsData = Object.values(sessionsByStudent).map((s) => s.count)
  const hoursChartOptions = {
    chart: { type: "bar" as const, toolbar: { show: false } },
    plotOptions: { bar: { columnWidth: "60%", borderRadius: 4 } },
    xaxis: { categories: dateLabels, labels: { style: { colors: "#8c9097" } } },
    colors: ["#845adf"],
    dataLabels: { enabled: false },
    grid: { borderColor: "rgba(0,0,0,0.06)" },
    yaxis: { labels: { style: { colors: "#8c9097" } } },
  }
  const sessionsChartOptions = {
    chart: { type: "bar" as const, toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, barHeight: "70%", borderRadius: 4 } },
    xaxis: { categories: studentLabels, labels: { style: { colors: "#8c9097" } } },
    colors: ["#23b7e5"],
    dataLabels: { enabled: false },
    grid: { borderColor: "rgba(0,0,0,0.06)" },
    yaxis: { labels: { style: { colors: "#8c9097" } } },
  }
  const punchInChartOptions = {
    chart: { type: "bar" as const, toolbar: { show: false } },
    plotOptions: { bar: { columnWidth: "80%", borderRadius: 4 } },
    xaxis: {
      categories: Array.from({ length: 24 }, (_, i) => `${i}:00`),
      labels: { style: { colors: "#8c9097" } },
    },
    colors: ["#26bf94"],
    dataLabels: { enabled: false },
    grid: { borderColor: "rgba(0,0,0,0.06)" },
    yaxis: { labels: { style: { colors: "#8c9097" } } },
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 xl:col-span-6">
        <div className="box">
          <div className="box-header">
            <div className="box-title">Hours per day (last 14 days)</div>
          </div>
          <div className="box-body">
            {dateLabels.length ? (
              <ReactApexChart
                type="bar"
                height={350}
                options={hoursChartOptions}
                series={[{ name: "Hours", data: hoursData }]}
              />
            ) : (
              <div className="flex items-center justify-center h-[350px] text-defaulttextcolor/70">
                No data for this range.
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="col-span-12 xl:col-span-6">
        <div className="box">
          <div className="box-header">
            <div className="box-title">Sessions per student</div>
          </div>
          <div className="box-body">
            {studentLabels.length ? (
              <ReactApexChart
                type="bar"
                height={350}
                options={sessionsChartOptions}
                series={[{ name: "Sessions", data: sessionsData }]}
              />
            ) : (
              <div className="flex items-center justify-center h-[350px] text-defaulttextcolor/70">
                No data for this range.
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="col-span-12">
        <div className="box">
          <div className="box-header">
            <div className="box-title">Punch-in distribution (by hour)</div>
          </div>
          <div className="box-body">
            {list.length ? (
              <ReactApexChart
                type="bar"
                height={350}
                options={punchInChartOptions}
                series={[{ name: "Punch-ins", data: punchInByHour }]}
              />
            ) : (
              <div className="flex items-center justify-center h-[350px] text-defaulttextcolor/70">
                No data for this range.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
