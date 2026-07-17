"use client"

import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment, useState, useEffect, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import * as XLSX from 'xlsx'
import {
  getAtsAnalytics,
  getAtsDrillDown,
  type AtsAnalyticsResponse,
  type AtsAnalyticsRange,
  type DrillDownRecord,
} from '@/shared/lib/api/atsAnalytics'

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false })

const RANGE_OPTIONS: { value: AtsAnalyticsRange | ''; label: string }[] = [
  { value: '', label: 'All time' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '3m', label: 'Last 3 months' },
  { value: '12m', label: 'Last 12 months' },
]

const FUNNEL_ORDER = ['Applied', 'Screening', 'Interview', 'Offered', 'Hired', 'Rejected']

const CHART_COLORS = {
  primary: '#6366f1',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#06b6d4',
  teal: '#0d9488',
  purple: '#8b5cf6',
  pink: '#ec4899',
}

const DONUT_PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6']

/** Semantic colors for application pipeline stages (funnel chart). */
const FUNNEL_STAGE_COLORS: Record<string, string> = {
  Applied: CHART_COLORS.info,
  Screening: CHART_COLORS.primary,
  Interview: CHART_COLORS.purple,
  Offered: CHART_COLORS.warning,
  Hired: CHART_COLORS.success,
  Rejected: CHART_COLORS.danger,
}

/** Months shown at once in line charts; slider appears when timeline has more. */
const MONTH_WINDOW_SIZE = 3

/** Definite chart-area height (px). Definite avoids the ApexCharts 100%-of-flex circular sizing. */
const CHART_HEIGHT = 280
/** Line cards carry the ~56px slider footer; shrink their chart so the row isn't taller than its neighbour. */
const LINE_CHART_HEIGHT = 224

/** Recruiter leaderboard rows shown in the analytics card (fills paired chart height). */
const RECRUITER_LEADERBOARD_ROWS = 5

function extendTimelineForRange(
  buckets: { period: string; count: number }[],
  range: AtsAnalyticsRange | ''
): { period: string; count: number }[] {
  const filled = fillMonthlyTimeBuckets(buckets)
  if (!filled.length) return filled

  const countByPeriod = new Map(filled.map((b) => [b.period, b.count]))
  const now = new Date()
  const endMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  let monthsBack: number | null = null
  if (range === '3m') monthsBack = 2
  else if (range === '12m') monthsBack = 11

  if (monthsBack == null) {
    if (!range) {
      const earliest = parseMonthPeriod(filled[0].period)
      if (!earliest) return filled
      const extended: typeof filled = []
      const cursor = new Date(earliest.getFullYear(), earliest.getMonth(), 1)
      while (cursor <= endMonth) {
        const period = formatMonthPeriod(cursor)
        extended.push({ period, count: countByPeriod.get(period) ?? 0 })
        cursor.setMonth(cursor.getMonth() + 1)
      }
      return extended
    }
    return filled
  }

  const startMonth = new Date(endMonth)
  startMonth.setMonth(startMonth.getMonth() - monthsBack)
  const extended: typeof filled = []
  const cursor = new Date(startMonth)
  while (cursor <= endMonth) {
    const period = formatMonthPeriod(cursor)
    extended.push({ period, count: countByPeriod.get(period) ?? 0 })
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return extended
}

function getMonthlyWindowSlice<T extends { period: string; count: number }>(
  buckets: T[],
  startIdx: number,
  windowSize: number
) {
  const maxStart = Math.max(0, buckets.length - windowSize)
  const clamped = Math.min(Math.max(0, startIdx), maxStart)
  return {
    visible: buckets.slice(clamped, clamped + windowSize),
    startIdx: clamped,
    maxStart,
  }
}

function timelineKey(buckets: { period: string }[]) {
  return buckets.map((b) => b.period).join('|')
}

/** Parse backend period labels (`Mar 2026`) for gap-filling on time-series charts. */
function parseMonthPeriod(period: string): Date | null {
  const match = period.trim().match(/^([A-Za-z]{3})\s+(\d{4})$/)
  if (!match) return null
  const d = new Date(`${match[1]} 1, ${match[2]}`)
  return Number.isNaN(d.getTime()) ? null : d
}

function formatMonthPeriod(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

/** Insert zero-count months between sparse buckets so the x-axis reads continuously. */
function fillMonthlyTimeBuckets<T extends { period: string; count: number }>(buckets: T[]): T[] {
  if (buckets.length < 2) return buckets
  const sorted = [...buckets].sort((a, b) => {
    const da = parseMonthPeriod(a.period)?.getTime() ?? 0
    const db = parseMonthPeriod(b.period)?.getTime() ?? 0
    return da - db
  })
  const filled: T[] = []
  for (let i = 0; i < sorted.length; i++) {
    filled.push(sorted[i])
    const cur = parseMonthPeriod(sorted[i].period)
    const next = parseMonthPeriod(sorted[i + 1]?.period ?? '')
    if (!cur || !next) continue
    const cursor = new Date(cur)
    cursor.setMonth(cursor.getMonth() + 1)
    while (cursor < next) {
      filled.push({ period: formatMonthPeriod(cursor), count: 0 } as T)
      cursor.setMonth(cursor.getMonth() + 1)
    }
  }
  return filled
}

// ---------------------------------------------------------------------------
// Excel Export
// ---------------------------------------------------------------------------
/** A leading =, +, -, or @ is quoted so Excel treats the cell as text, not a formula. */
function defangCell(v: unknown): string | number {
  if (v === null || v === undefined) return ''
  if (typeof v === 'number') return v
  const s = String(v)
  return /^[=+\-@]/.test(s) ? `'${s}` : s
}

/**
 * One sheet per section, header on row 1, so every sheet sorts and filters.
 * Columns are sized to their longest value (clamped 10..60) so nothing truncates.
 */
function addSheet(wb: XLSX.WorkBook, name: string, headers: string[], rows: unknown[][]) {
  const aoa = [headers, ...rows.map((r) => r.map(defangCell))]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws['!cols'] = headers.map((h, col) => {
    const longest = aoa.reduce((max, row) => {
      const len = String(row[col] ?? '').length
      return len > max ? len : max
    }, h.length)
    return { wch: Math.min(Math.max(longest + 2, 10), 60) }
  })
  const lastCol = XLSX.utils.encode_col(headers.length - 1)
  ws['!autofilter'] = { ref: `A1:${lastCol}${aoa.length}` }
  XLSX.utils.book_append_sheet(wb, ws, name)
}

function exportToExcel(data: AtsAnalyticsResponse, periodLabel: string) {
  const wb = XLSX.utils.book_new()

  addSheet(wb, 'Summary', ['Metric', 'Value'], [
    ['Period', periodLabel],
    ['Total Candidates', data.totals.totalCandidates],
    ['Total Jobs', data.totals.totalJobs],
    ['Active Jobs', data.totals.activeJobs],
    ['Total Applications', data.totals.totalApplications],
    ['Hired', data.totals.hiredCount],
    ['Total Recruiters', data.totals.totalRecruiters],
    ['Conversion Rate %', data.totals.conversionRate],
    ['Avg Profile Completion %', data.totals.avgProfileCompletion],
  ])
  addSheet(wb, 'Application Funnel', ['Status', 'Count'],
    (data.applicationFunnel || []).map((f) => [f.status, f.count]))
  addSheet(wb, 'Job Status', ['Status', 'Count'],
    (data.jobStatusBreakdown || []).map((j) => [j.status, j.count]))
  addSheet(wb, 'Job Type', ['Job Type', 'Count'],
    (data.jobTypeDistribution || []).map((j) => [j.jobType, j.count]))
  addSheet(wb, 'Top Jobs', ['Job Title', 'Organisation', 'Applications'],
    (data.topJobsByApplications || []).map((j) => [j.title, j.org || '', j.count]))
  addSheet(wb, 'Applications Over Time', ['Period', 'Count'],
    (data.applicationsOverTime || []).map((t) => [t.period, t.count]))
  addSheet(wb, 'Jobs Over Time', ['Period', 'Count'],
    (data.jobsOverTime || []).map((t) => [t.period, t.count]))

  const slug = periodLabel.replace(/\s+/g, '-').toLowerCase()
  XLSX.writeFile(wb, `ats-analytics-${slug}-${new Date().toISOString().slice(0, 10)}.xlsx`)
}

// ---------------------------------------------------------------------------
// Delta badge helper
// ---------------------------------------------------------------------------
function DeltaBadge({ current, previous, label }: { current: number; previous: number; label: string }) {
  if (previous === 0 && current === 0) return <span className="text-[0.6875rem] text-defaulttextcolor/60">vs prev: 0</span>
  const diff = current - previous
  const pct = previous > 0 ? Math.round((diff / previous) * 100) : current > 0 ? 100 : 0
  const isPositive = diff >= 0
  return (
    <span className={`text-[0.6875rem] ${isPositive ? 'text-success' : 'text-danger'}`}>
      {isPositive ? '+' : ''}{pct}% vs {label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Month range slider (time-series charts)
// ---------------------------------------------------------------------------
function MonthWindowSlider({
  periods,
  startIdx,
  maxStart,
  windowSize,
  onChange,
}: {
  periods: string[]
  startIdx: number
  maxStart: number
  windowSize: number
  onChange: (idx: number) => void
}) {
  if (periods.length < 2 || maxStart <= 0) return null

  const total = periods.length
  const endIdx = Math.min(startIdx + windowSize - 1, total - 1)
  const rangeLabel = `${periods[startIdx]} – ${periods[endIdx]}`

  // Viewport-scrollbar geometry: segment width = visible window / whole timeline.
  const widthPct = Math.min(100, Math.max(14, (windowSize / total) * 100))
  const leftPct = maxStart > 0 ? (startIdx / maxStart) * (100 - widthPct) : 0
  const atStart = startIdx <= 0
  const atEnd = startIdx >= maxStart

  return (
    <div
      className="box-footer shrink-0 !py-2.5 !rounded-b-md flex items-center gap-2 bg-slate-50/70 sm:gap-3 dark:bg-white/[0.02]"
      role="group"
      aria-label="Month range navigator"
    >
      <button
        type="button"
        className="ti-btn ti-btn-icon !h-8 !w-8 shrink-0 rounded-full text-defaulttextcolor/70 transition-colors hover:bg-primary/10 hover:text-primary disabled:opacity-25 disabled:hover:bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
        disabled={atStart}
        onClick={() => onChange(Math.max(0, startIdx - 1))}
        aria-label={`Earlier months, before ${periods[startIdx]}`}
      >
        <i className="ri-arrow-left-s-line text-[1.0625rem]" aria-hidden />
      </button>

      <div className="flex flex-1 min-w-0 flex-col gap-1.5">
        <div className="group relative h-2.5 w-full rounded-full bg-defaultborder/35 dark:bg-white/10">
          {/* Visible window — drag to pan the timeline */}
          <div
            className="pointer-events-none absolute top-0 h-2.5 rounded-full bg-primary shadow-sm transition-[left,width] duration-200 ease-out group-hover:bg-primary/90"
            style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
          />
          <input
            type="range"
            min={0}
            max={maxStart}
            step={1}
            value={startIdx}
            onChange={(e) => onChange(Number(e.target.value))}
            className="absolute inset-0 m-0 h-full w-full cursor-grab appearance-none bg-transparent opacity-0 active:cursor-grabbing"
            aria-label={`Months ${rangeLabel}`}
            aria-valuemin={0}
            aria-valuemax={maxStart}
            aria-valuenow={startIdx}
            aria-valuetext={rangeLabel}
          />
        </div>
        <p className="m-0 truncate text-center text-[0.6875rem] tabular-nums text-defaulttextcolor/55">
          {rangeLabel}
          <span className="hidden text-defaulttextcolor/35 sm:inline">
            {' · '}{startIdx + 1}–{endIdx + 1} of {total}
          </span>
        </p>
      </div>

      <button
        type="button"
        className="ti-btn ti-btn-icon !h-8 !w-8 shrink-0 rounded-full text-defaulttextcolor/70 transition-colors hover:bg-primary/10 hover:text-primary disabled:opacity-25 disabled:hover:bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
        disabled={atEnd}
        onClick={() => onChange(Math.min(maxStart, startIdx + 1))}
        aria-label={`Later months, after ${periods[endIdx]}`}
      >
        <i className="ri-arrow-right-s-line text-[1.0625rem]" aria-hidden />
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------
function StatCard({
  title, value, icon, iconBg, delta,
}: {
  title: string; value: string | number; icon: string; iconBg: string;
  delta?: React.ReactNode;
}) {
  return (
    <div className="sm:col-span-6 xl:col-span-3 col-span-12">
      <div className="box">
        <div className="box-body flex justify-between items-center">
          <div>
            <p className="mb-1 text-[0.8125rem] text-defaulttextcolor/70">{title}</p>
            <h4 className="font-semibold mb-0 text-[1.5rem]">{value}</h4>
            {delta}
          </div>
          <span className={`avatar avatar-md ${iconBg} text-white p-2`}>
            <i className={`${icon} text-[1.25rem] opacity-80`} />
          </span>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Drill-Down Modal
// ---------------------------------------------------------------------------

const DRILL_MODAL_TITLE: Record<string, string> = {
  applicationFunnel: 'Funnel',
  applicationStatus: 'Application status',
  jobStatus: 'Job status',
  jobType: 'Job type',
}

function drillModalHeading(drillType: string, drillValue: string) {
  const label = DRILL_MODAL_TITLE[drillType] ?? drillType.replace(/([A-Z])/g, ' $1').trim()
  return `${label}: ${drillValue}`
}

function DrillDownModal({
  open, onClose, drillType, drillValue,
}: {
  open: boolean; onClose: () => void; drillType: string; drillValue: string;
}) {
  const [loading, setLoading] = useState(false)
  const [records, setRecords] = useState<DrillDownRecord[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalResults, setTotalResults] = useState(0)

  useEffect(() => {
    if (!open || !drillType || !drillValue) return
    let cancelled = false
    const fetch = async () => {
      setLoading(true)
      try {
        const res = await getAtsDrillDown({
          type: drillType as 'applicationStatus' | 'jobStatus' | 'jobType' | 'applicationFunnel',
          value: drillValue,
          page,
          limit: 20,
        })
        if (!cancelled) {
          setRecords(res.results)
          setTotalPages(res.totalPages)
          setTotalResults(res.totalResults)
        }
      } catch {
        if (!cancelled) setRecords([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetch()
    return () => { cancelled = true }
  }, [open, drillType, drillValue, page])

  useEffect(() => {
    if (open) setPage(1)
  }, [open, drillType, drillValue])

  if (!open) return null

  const isJobDrill = drillType === 'jobStatus' || drillType === 'jobType'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-bodybg rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[80vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-defaultborder shrink-0">
          <h5 className="text-[1rem] font-semibold text-defaulttextcolor m-0 pe-2">
            {drillModalHeading(drillType, drillValue)}
            <span className="text-defaulttextcolor/60 text-[0.8125rem] font-normal ms-2">({totalResults} records)</span>
          </h5>
          <button className="ti-btn ti-btn-icon ti-btn-sm ti-btn-ghost-dark" onClick={onClose}>
            <i className="ri-close-line" />
          </button>
        </div>
        <div className="flex-1 overflow-auto px-6 py-4">
          {loading ? (
            <div className="py-12 text-center text-defaulttextcolor/70">Loading…</div>
          ) : records.length === 0 ? (
            <div className="py-12 text-center text-defaulttextcolor/70">No records found</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered table-hover min-w-full text-[0.8125rem]">
                <thead>
                  <tr className="bg-gray-50 dark:bg-white/5">
                    {isJobDrill ? (
                      <>
                        <th className="!text-start">Job Title</th>
                        <th className="!text-start">Organisation</th>
                        <th className="!text-start">Status</th>
                        <th className="!text-start">Type</th>
                        <th className="!text-start">Created</th>
                      </>
                    ) : (
                      <>
                        <th className="!text-start">Candidate</th>
                        <th className="!text-start">Job Title</th>
                        <th className="!text-start">Organisation</th>
                        <th className="!text-start">Status</th>
                        <th className="!text-start">Applied</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id}>
                      {isJobDrill ? (
                        <>
                          <td>{r.title || '—'}</td>
                          <td>{r.organisation || '—'}</td>
                          <td>{r.status || '—'}</td>
                          <td>{r.jobType || '—'}</td>
                          <td>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}</td>
                        </>
                      ) : (
                        <>
                          <td>{r.candidateName || '—'}</td>
                          <td>{r.jobTitle || '—'}</td>
                          <td>{r.organisation || '—'}</td>
                          <td>{r.status || '—'}</td>
                          <td>{r.appliedAt ? new Date(r.appliedAt).toLocaleDateString() : '—'}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {totalPages > 1 && (
          <div
            className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-6 py-4 border-t border-defaultborder/90 bg-slate-50/90 dark:bg-white/[0.03] shrink-0"
            role="navigation"
            aria-label="Drill-down results pagination"
          >
            <p className="text-sm text-defaulttextcolor/75 tabular-nums m-0 text-center sm:text-start">
              Page{' '}
              <span className="font-semibold text-defaulttextcolor">{page}</span>
              {' of '}
              <span className="font-semibold text-defaulttextcolor">{totalPages}</span>
            </p>
            <div className="flex items-center justify-center sm:justify-end gap-3">
              <button
                type="button"
                className="inline-flex items-center justify-center gap-1.5 min-h-[44px] min-w-[7.5rem] shrink-0 rounded-xl border border-defaultborder bg-white px-4 py-2.5 text-sm font-medium text-defaulttextcolor shadow-sm transition-colors hover:bg-slate-50 hover:border-defaultborder focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-45 dark:bg-bodybg dark:border-white/15 dark:hover:bg-white/5"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label={`Previous page, page ${page - 1} of ${totalPages}`}
              >
                <i className="ri-arrow-left-s-line text-[1.125rem] leading-none" aria-hidden />
                Previous
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-1.5 min-h-[44px] min-w-[7.5rem] shrink-0 rounded-xl border border-defaultborder bg-white px-4 py-2.5 text-sm font-medium text-defaulttextcolor shadow-sm transition-colors hover:bg-slate-50 hover:border-defaultborder focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-45 dark:bg-bodybg dark:border-white/15 dark:hover:bg-white/5"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                aria-label={`Next page, page ${page + 1} of ${totalPages}`}
              >
                Next
                <i className="ri-arrow-right-s-line text-[1.125rem] leading-none" aria-hidden />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
const ATSAnalytics = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<AtsAnalyticsResponse | null>(null)
  const [range, setRange] = useState<AtsAnalyticsRange | ''>('')
  const [appsMonthStart, setAppsMonthStart] = useState(0)
  const [jobsMonthStart, setJobsMonthStart] = useState(0)
  const [drillModal, setDrillModal] = useState<{ open: boolean; type: string; value: string }>({ open: false, type: '', value: '' })

  useEffect(() => {
    let cancelled = false
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await getAtsAnalytics(range ? { range: range as AtsAnalyticsRange } : undefined)
        if (!cancelled) setData(res)
      } catch (e: unknown) {
        if (!cancelled) {
          const msg =
            e && typeof e === 'object' && 'response' in e
              ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
              : null
          setError(msg ? String(msg) : 'Failed to load analytics.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [range])

  const openDrill = useCallback((type: string, value: string) => {
    setDrillModal({ open: true, type, value })
  }, [])

  // ---- Chart data memos ----

  const funnelData = useMemo(() => {
    if (!data?.applicationFunnel?.length) {
      return {
        categories: [] as string[],
        values: [] as number[],
        series: [] as { name: string; data: number[] }[],
        total: 0,
        topStage: null as { name: string; count: number } | null,
      }
    }
    const map = new Map(data.applicationFunnel.map((f) => [f.status, f.count]))
    const categories = FUNNEL_ORDER.filter((s) => map.has(s))
    const values = categories.map((s) => map.get(s) || 0)
    const total = values.reduce((sum, v) => sum + v, 0)
    const maxCount = values.length ? Math.max(...values) : 0
    const topIdx = values.findIndex((v) => v === maxCount && maxCount > 0)
    const topStage = topIdx >= 0 ? { name: categories[topIdx], count: values[topIdx] } : null
    return {
      categories,
      values,
      series: [{ name: 'Applications', data: values }],
      total,
      topStage,
    }
  }, [data?.applicationFunnel])

  const applicationsOverTimeFull = useMemo(() => {
    if (!data?.applicationsOverTime?.length) {
      return { buckets: [] as { period: string; count: number }[], timelineKey: '' }
    }
    const buckets = extendTimelineForRange(data.applicationsOverTime, range)
    return { buckets, timelineKey: timelineKey(buckets) }
  }, [data?.applicationsOverTime, range])

  const jobsOverTimeFull = useMemo(() => {
    if (!data?.jobsOverTime?.length) {
      return { buckets: [] as { period: string; count: number }[], timelineKey: '' }
    }
    const buckets = extendTimelineForRange(data.jobsOverTime, range)
    return { buckets, timelineKey: timelineKey(buckets) }
  }, [data?.jobsOverTime, range])

  useEffect(() => {
    const maxStart = Math.max(0, applicationsOverTimeFull.buckets.length - MONTH_WINDOW_SIZE)
    setAppsMonthStart(maxStart)
  }, [applicationsOverTimeFull.timelineKey])

  useEffect(() => {
    const maxStart = Math.max(0, jobsOverTimeFull.buckets.length - MONTH_WINDOW_SIZE)
    setJobsMonthStart(maxStart)
  }, [jobsOverTimeFull.timelineKey])

  const applicationsOverTimeData = useMemo(() => {
    const { buckets } = applicationsOverTimeFull
    if (!buckets.length) {
      return {
        categories: [] as string[],
        series: [] as { name: string; data: number[] }[],
        total: 0,
        peak: null as { period: string; count: number } | null,
        allPeriods: [] as string[],
        startIdx: 0,
        maxStart: 0,
        hasSlider: false,
        chartKey: 'apps-over-time-empty',
      }
    }
    const { visible, startIdx, maxStart } = getMonthlyWindowSlice(buckets, appsMonthStart, MONTH_WINDOW_SIZE)
    const peak = visible.reduce((best, t) => (t.count > best.count ? t : best), visible[0])
    const categories = visible.map((t) => t.period)
    return {
      categories,
      series: [{ name: 'Applications', data: visible.map((t) => t.count) }],
      total: visible.reduce((sum, t) => sum + t.count, 0),
      peak,
      allPeriods: buckets.map((t) => t.period),
      startIdx,
      maxStart,
      hasSlider: buckets.length > MONTH_WINDOW_SIZE,
      chartKey: `apps-over-time-${startIdx}-${categories.join('|')}`,
    }
  }, [applicationsOverTimeFull, appsMonthStart])

  const jobsOverTimeData = useMemo(() => {
    const { buckets } = jobsOverTimeFull
    if (!buckets.length) {
      return {
        categories: [] as string[],
        series: [] as { name: string; data: number[] }[],
        total: 0,
        peak: null as { period: string; count: number } | null,
        allPeriods: [] as string[],
        startIdx: 0,
        maxStart: 0,
        hasSlider: false,
        chartKey: 'jobs-over-time-empty',
      }
    }
    const { visible, startIdx, maxStart } = getMonthlyWindowSlice(buckets, jobsMonthStart, MONTH_WINDOW_SIZE)
    const peak = visible.reduce((best, t) => (t.count > best.count ? t : best), visible[0])
    const categories = visible.map((t) => t.period)
    return {
      categories,
      series: [{ name: 'Jobs Created', data: visible.map((t) => t.count) }],
      total: visible.reduce((sum, t) => sum + t.count, 0),
      peak,
      allPeriods: buckets.map((t) => t.period),
      startIdx,
      maxStart,
      hasSlider: buckets.length > MONTH_WINDOW_SIZE,
      chartKey: `jobs-over-time-${startIdx}-${categories.join('|')}`,
    }
  }, [jobsOverTimeFull, jobsMonthStart])

  const jobStatusData = useMemo(() => {
    if (!data?.jobStatusBreakdown?.length) return { labels: [], series: [] }
    return {
      labels: data.jobStatusBreakdown.map((j) => j.status),
      series: data.jobStatusBreakdown.map((j) => j.count),
    }
  }, [data?.jobStatusBreakdown])

  const appStatusData = useMemo(() => {
    if (!data?.applicationStatusBreakdown?.length) return { labels: [], series: [] }
    return {
      labels: data.applicationStatusBreakdown.map((a) => a.status),
      series: data.applicationStatusBreakdown.map((a) => a.count),
    }
  }, [data?.applicationStatusBreakdown])

  const jobTypeData = useMemo(() => {
    if (!data?.jobTypeDistribution?.length) return { categories: [], series: [] }
    return {
      categories: data.jobTypeDistribution.map((j) => j.jobType),
      series: [{ name: 'Jobs', data: data.jobTypeDistribution.map((j) => j.count) }],
    }
  }, [data?.jobTypeDistribution])

  const recruiterActivityBarData = useMemo(() => {
    if (!data?.recruiterActivityStats) return { categories: [], series: [] }
    const s = data.recruiterActivityStats
    const items = [
      { label: 'Jobs Posted', value: s.jobPostingsCreated },
      { label: 'Screened', value: s.candidatesScreened },
      { label: 'Interviews', value: s.interviewsScheduled },
      { label: 'Notes', value: s.notesAdded },
      { label: 'Feedback', value: s.feedbackAdded },
    ]
    return {
      categories: items.map((i) => i.label),
      series: [{ name: 'Activities', data: items.map((i) => i.value) }],
    }
  }, [data?.recruiterActivityStats])

  // ---- Shared chart options builders ----

  const lineChartOpts = useCallback(
    (categories: string[], seriesLabel = 'Count', chartId = 'ats-line-chart') => ({
      chart: {
        id: chartId,
        toolbar: { show: false },
        height: LINE_CHART_HEIGHT,
        parentHeightOffset: 0,
        fontFamily: 'Poppins, Arial, sans-serif',
        zoom: { enabled: false },
        animations: { enabled: true, speed: 400 },
      },
      stroke: { curve: 'smooth' as const, width: 2.5 },
      dataLabels: { enabled: false },
      markers: {
        size: 4,
        strokeWidth: 2,
        strokeColors: '#fff',
        hover: { size: 6, sizeOffset: 1 },
      },
      xaxis: {
        type: 'category' as const,
        categories,
        tickPlacement: 'on' as const,
        axisBorder: { show: false },
        axisTicks: { show: false },
        crosshairs: {
          show: true,
          stroke: { color: '#cbd5e1', width: 1, dashArray: 4 },
        },
        labels: {
          rotate: categories.length > 6 ? -35 : 0,
          hideOverlappingLabels: true,
          trim: false,
          style: { colors: '#64748b', fontSize: '11px' },
        },
        tooltip: { enabled: false },
      },
      yaxis: {
        min: 0,
        forceNiceScale: true,
        labels: {
          offsetX: -4,
          style: { colors: '#64748b', fontSize: '11px' },
          formatter: (val: number) => (Number.isInteger(val) ? String(val) : val.toFixed(0)),
        },
      },
      grid: {
        borderColor: '#e2e8f0',
        strokeDashArray: 4,
        padding: { left: 0, right: 0 },
        xaxis: { lines: { show: true } },
        yaxis: { lines: { show: true } },
      },
      tooltip: {
        enabled: true,
        shared: false,
        intersect: true,
        followCursor: false,
        theme: 'light',
        x: { show: true },
        y: {
          formatter: (val: number) => `${val} ${seriesLabel.toLowerCase()}${val === 1 ? '' : 's'}`,
          title: { formatter: () => seriesLabel },
        },
        marker: { show: true },
      },
      colors: [CHART_COLORS.primary],
      legend: { show: false },
    }),
    []
  )

  const barChartOpts = useCallback(
    (categories: string[], color = CHART_COLORS.primary) => ({
      chart: { toolbar: { show: false }, height: CHART_HEIGHT, parentHeightOffset: 0, fontFamily: 'Poppins, Arial, sans-serif' },
      plotOptions: { bar: { columnWidth: '50%', borderRadius: 4 } },
      dataLabels: { enabled: false },
      xaxis: { categories },
      yaxis: { labels: { style: { colors: '#64748b' } } },
      grid: { borderColor: '#f1f5f9', strokeDashArray: 3 },
      colors: [color],
    }),
    []
  )

  const funnelBarOpts = useCallback((categories: string[], values: number[], chartHeight: number | string) => {
    const rowCount = categories.length
    const maxVal = Math.max(...values, 1)
    const xMax = Math.ceil(maxVal * 1.1)
    const colors = categories.map((c) => FUNNEL_STAGE_COLORS[c] ?? CHART_COLORS.teal)
    const barHeightPct = rowCount <= 3 ? '88%' : rowCount <= 5 ? '85%' : '72%'

    return {
      chart: {
        toolbar: { show: false },
        height: chartHeight,
        fontFamily: 'Poppins, Arial, sans-serif',
        animations: { enabled: true, speed: 350, animateGradually: { enabled: false } },
        parentHeightOffset: 0,
      },
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: barHeightPct,
          borderRadius: 6,
          borderRadiusApplication: 'around' as const,
          distributed: true,
          dataLabels: { position: 'center' as const, hideOverflowingLabels: false },
        },
      },
      dataLabels: {
        enabled: true,
        offsetX: 0,
        textAnchor: 'middle' as const,
        formatter: (val: number) => (val > 0 ? String(val) : ''),
        style: { fontSize: '12px', fontWeight: 600, colors: ['#ffffff'] },
        dropShadow: { enabled: false },
      },
      xaxis: {
        categories,
        min: 0,
        max: xMax,
        tickAmount: Math.min(5, xMax),
        floating: false,
        labels: {
          style: { colors: '#64748b', fontSize: '11px' },
          offsetY: -2,
          formatter: (val: string) => {
            const n = Number(val)
            if (!Number.isFinite(n) || n < 0) return ''
            return Number.isInteger(n) ? String(n) : String(Math.round(n))
          },
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          align: 'left' as const,
          minWidth: 52,
          maxWidth: 88,
          offsetX: 0,
          style: { colors: '#475569', fontSize: '12px', fontWeight: 500 },
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      grid: {
        borderColor: '#e2e8f0',
        strokeDashArray: 4,
        padding: { top: 0, bottom: 4, left: 8, right: 12 },
        xaxis: { lines: { show: true } },
        yaxis: { lines: { show: false } },
      },
      tooltip: {
        enabled: true,
        theme: 'light',
        x: { show: false },
        y: {
          title: { formatter: () => '' },
          formatter: (val: number, opts: { dataPointIndex: number }) =>
            `${val} at ${categories[opts.dataPointIndex]}`,
        },
      },
      colors,
      legend: { show: false },
      states: {
        hover: { filter: { type: 'darken' as const, value: 0.06 } },
        active: { filter: { type: 'darken' as const, value: 0.1 } },
      },
    }
  }, [])

  const donutOpts = useCallback(
    (labels: string[]) => ({
      chart: { height: CHART_HEIGHT, parentHeightOffset: 0 },
      labels,
      legend: { position: 'bottom' as const },
      colors: DONUT_PALETTE.slice(0, labels.length),
    }),
    []
  )

  const funnelChartOptions = useMemo(() => {
    if (!funnelData.categories.length) return null
    const base = funnelBarOpts(funnelData.categories, funnelData.values, CHART_HEIGHT)
    return {
      ...base,
      chart: {
        ...base.chart,
        events: {
          dataPointSelection: (_e: unknown, _chart: unknown, opts: { dataPointIndex: number }) => {
            openDrill('applicationFunnel', funnelData.categories[opts.dataPointIndex])
          },
        },
      },
    }
  }, [funnelData.categories, funnelData.values, funnelBarOpts, openDrill])

  const prevLabel = data?.previousPeriod?.periodLabel || ''
  const periodLabel = RANGE_OPTIONS.find((opt) => opt.value === range)?.label || 'All time'
  const applicationsPeriodTotal = data?.totals.totalApplications ?? 0
  const jobsPeriodTotal = data?.totals.totalJobs ?? 0

  return (
    <Fragment>
      <Seo title="ATS Analytics" />
      <div className="container mx-auto mt-5 w-full max-w-full sm:mt-6">
        {/* Header: Range selector + Export */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-[0.8125rem] text-defaulttextcolor/70">Period:</label>
            <select
              className="form-control select-show-page-size !w-auto !py-1.5 !px-3 !text-[0.8125rem]"
              value={range}
              onChange={(e) => setRange((e.target.value || '') as AtsAnalyticsRange | '')}
            >
              {RANGE_OPTIONS.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          {data && (
            <button
              type="button"
              className="ti-btn ti-btn-outline-primary !py-1.5 !px-3 !text-[0.8125rem]"
              onClick={() => exportToExcel(data, periodLabel)}
            >
              <i className="ri-file-excel-2-line align-middle me-1" />
              Export Excel
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 p-4 bg-danger/10 border border-danger/30 text-danger rounded-lg text-sm">{error}</div>
        )}

        {loading ? (
          <div className="py-12 text-center text-defaulttextcolor/70">Loading analytics…</div>
        ) : data ? (
          <div className="grid grid-cols-12 gap-x-6 gap-y-6">

            {/* ---- Summary Cards ---- */}
            <div className="col-span-12 grid grid-cols-12 gap-x-6 gap-y-4">
              <StatCard
                title="Total Candidates" value={data.totals.totalCandidates}
                icon="ri-contacts-book-line" iconBg="bg-primary"
              />
              <StatCard
                title="Total Jobs" value={data.totals.totalJobs}
                icon="ri-briefcase-line" iconBg="bg-secondary"
              />
              <StatCard
                title="Active Jobs" value={data.totals.activeJobs}
                icon="ri-briefcase-4-line" iconBg="bg-info"
              />
              <StatCard
                title="Total Applications" value={data.totals.totalApplications}
                icon="ri-file-list-3-line" iconBg="bg-success"
                delta={data.previousPeriod && (
                  <DeltaBadge current={data.totals.totalApplications} previous={data.previousPeriod.applications} label={prevLabel} />
                )}
              />
              <StatCard
                title="Hired" value={data.totals.hiredCount}
                icon="ri-user-star-line" iconBg="bg-warning"
                delta={data.previousPeriod && (
                  <DeltaBadge current={data.totals.hiredCount} previous={data.previousPeriod.hired} label={prevLabel} />
                )}
              />
              <StatCard
                title="Recruiters" value={data.totals.totalRecruiters}
                icon="ri-team-line" iconBg="bg-teal-500"
              />
              <StatCard
                title="Conversion Rate" value={`${data.totals.conversionRate}%`}
                icon="ri-exchange-funds-line" iconBg="bg-purple-500"
              />
              <StatCard
                title="Avg Profile Completion" value={`${data.totals.avgProfileCompletion}%`}
                icon="ri-user-settings-line" iconBg="bg-pink-500"
              />
            </div>

            {/* ---- Charts: 2-column equal-height grid ---- */}
            <div className="col-span-12 grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-6 items-stretch">
            <div className="h-full">
              <div className="box h-full">
                <div className="box-header flex flex-wrap items-start justify-between gap-2 shrink-0">
                  <div>
                    <div className="box-title">Applications Over Time</div>
                    {applicationsOverTimeData.categories.length > 0 && (
                      <p className="text-[0.75rem] text-defaulttextcolor/60 mt-1 mb-0">
                        {applicationsOverTimeData.hasSlider ? 'In view' : 'Monthly volume'}
                        {applicationsOverTimeData.peak && applicationsOverTimeData.peak.count > 0 && (
                          <>
                            {' · '}
                            Peak{' '}
                            <span className="font-medium text-defaulttextcolor/80">
                              {applicationsOverTimeData.peak.period}
                            </span>{' '}
                            ({applicationsOverTimeData.peak.count})
                          </>
                        )}
                      </p>
                    )}
                  </div>
                  {applicationsOverTimeData.categories.length > 0 && (
                    <span className="inline-flex items-center rounded-md bg-primary/10 px-2.5 py-1 text-[0.75rem] font-medium tabular-nums text-primary">
                      {applicationsPeriodTotal} total
                      {applicationsOverTimeData.hasSlider && applicationsOverTimeData.total !== applicationsPeriodTotal
                        ? ` · ${applicationsOverTimeData.total} in view`
                        : ''}
                    </span>
                  )}
                </div>
                <div className="box-body pt-2 !pb-2 flex-1 flex flex-col min-h-0">
                  {applicationsOverTimeData.categories.length > 0 ? (
                      <div
                        className="h-[224px] w-full"
                        role="img"
                        aria-label={
                          applicationsOverTimeData.peak
                            ? `Applications over time. ${applicationsPeriodTotal} total${applicationsOverTimeData.hasSlider && applicationsOverTimeData.total !== applicationsPeriodTotal ? `, ${applicationsOverTimeData.total} in view` : ''}. Peak ${applicationsOverTimeData.peak.period} with ${applicationsOverTimeData.peak.count} applications.`
                            : `Applications over time. ${applicationsPeriodTotal} total.`
                        }
                      >
                        <ReactApexChart
                          key={applicationsOverTimeData.chartKey}
                          type="line"
                          series={applicationsOverTimeData.series}
                          options={lineChartOpts(
                            applicationsOverTimeData.categories,
                            'Applications',
                            'ats-applications-over-time'
                          )}
                          height={LINE_CHART_HEIGHT}
                          width="100%"
                        />
                      </div>
                  ) : (
                    <div className="flex flex-1 flex-col items-center justify-center gap-2 min-h-[260px] text-center">
                      <i className="ri-line-chart-line text-[2rem] text-defaulttextcolor/30" aria-hidden />
                      <p className="text-sm text-defaulttextcolor/70 m-0">No applications in this period</p>
                      <p className="text-[0.75rem] text-defaulttextcolor/50 m-0">Try a wider date range above</p>
                    </div>
                  )}
                </div>
                {applicationsOverTimeData.categories.length > 0 && (
                  <MonthWindowSlider
                    periods={applicationsOverTimeData.allPeriods}
                    startIdx={applicationsOverTimeData.startIdx}
                    maxStart={applicationsOverTimeData.maxStart}
                    windowSize={MONTH_WINDOW_SIZE}
                    onChange={setAppsMonthStart}
                  />
                )}
              </div>
            </div>

            <div className="h-full">
              <div className="box h-full">
                <div className="box-header shrink-0 flex flex-wrap items-start justify-between gap-x-4 gap-y-2 pb-0">
                  <div>
                    <div className="box-title">Application Funnel</div>
                    {funnelData.categories.length > 0 && (
                      <p className="text-[0.75rem] text-defaulttextcolor/60 mt-1 mb-0">
                        Current count at each stage
                        {funnelData.topStage && (
                          <>
                            {' · '}
                            Largest stage{' '}
                            <span className="font-medium text-defaulttextcolor/80">
                              {funnelData.topStage.name}
                            </span>{' '}
                            ({funnelData.topStage.count})
                          </>
                        )}
                      </p>
                    )}
                  </div>
                  {funnelData.total > 0 && (
                    <span className="inline-flex items-center rounded-md bg-teal-500/10 px-2.5 py-1 text-[0.75rem] font-medium tabular-nums text-teal-700 dark:text-teal-300">
                      {funnelData.total} total
                    </span>
                  )}
                </div>
                <div className="box-body flex-1 flex flex-col min-h-0 pt-2">
                  {funnelData.categories.length > 0 ? (
                    <div
                      className="h-[280px] w-full overflow-hidden"
                      role="img"
                      aria-label={`Application funnel. ${funnelData.total} applications across ${funnelData.categories.length} stages.`}
                    >
                      <ReactApexChart
                        type="bar"
                        series={funnelData.series}
                        options={funnelChartOptions!}
                        height={CHART_HEIGHT}
                        width="100%"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-1 flex-col items-center justify-center gap-2 min-h-[260px] text-center">
                      <i className="ri-filter-3-line text-[2rem] text-defaulttextcolor/30" aria-hidden />
                      <p className="text-sm text-defaulttextcolor/70 m-0">No applications in this period</p>
                      <p className="text-[0.75rem] text-defaulttextcolor/50 m-0">Try a wider date range above</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="h-full">
              <div className="box h-full">
                <div className="box-header shrink-0"><div className="box-title">Job Status Breakdown</div></div>
                <div className="box-body flex-1 flex flex-col min-h-0">
                  {jobStatusData.series.length > 0 ? (
                    <div className="h-[280px]">
                    <ReactApexChart
                      type="donut"
                      series={jobStatusData.series}
                      options={{
                        ...donutOpts(jobStatusData.labels),
                        chart: {
                          height: CHART_HEIGHT,
                          parentHeightOffset: 0,
                          events: {
                            dataPointSelection: (_e: unknown, _chart: unknown, opts: { dataPointIndex: number }) => {
                              openDrill('jobStatus', jobStatusData.labels[opts.dataPointIndex])
                            },
                          },
                        },
                      }}
                      height={CHART_HEIGHT} width="100%"
                    />
                    </div>
                  ) : (
                    <div className="flex flex-1 items-center justify-center min-h-[260px] text-defaulttextcolor/60 text-sm">No data yet</div>
                  )}
                </div>
              </div>
            </div>

            <div className="h-full">
              <div className="box h-full">
                <div className="box-header shrink-0"><div className="box-title">Application Status Breakdown</div></div>
                <div className="box-body flex-1 flex flex-col min-h-0">
                  {appStatusData.series.length > 0 ? (
                    <div className="h-[280px]">
                    <ReactApexChart
                      type="donut"
                      series={appStatusData.series}
                      options={{
                        ...donutOpts(appStatusData.labels),
                        chart: {
                          height: CHART_HEIGHT,
                          parentHeightOffset: 0,
                          events: {
                            dataPointSelection: (_e: unknown, _chart: unknown, opts: { dataPointIndex: number }) => {
                              openDrill('applicationStatus', appStatusData.labels[opts.dataPointIndex])
                            },
                          },
                        },
                      }}
                      height={CHART_HEIGHT} width="100%"
                    />
                    </div>
                  ) : (
                    <div className="flex flex-1 items-center justify-center min-h-[260px] text-defaulttextcolor/60 text-sm">No data yet</div>
                  )}
                </div>
              </div>
            </div>

            <div className="h-full">
              <div className="box h-full">
                <div className="box-header shrink-0"><div className="box-title">Job Type Distribution</div></div>
                <div className="box-body flex-1 flex flex-col min-h-0">
                  {jobTypeData.categories.length > 0 ? (
                    <div className="h-[280px]">
                    <ReactApexChart
                      type="bar"
                      series={jobTypeData.series}
                      options={{
                        ...barChartOpts(jobTypeData.categories, CHART_COLORS.warning),
                        chart: {
                          ...barChartOpts(jobTypeData.categories, CHART_COLORS.warning).chart,
                          events: {
                            dataPointSelection: (_e: unknown, _chart: unknown, opts: { dataPointIndex: number }) => {
                              openDrill('jobType', jobTypeData.categories[opts.dataPointIndex])
                            },
                          },
                        },
                      }}
                      height={CHART_HEIGHT} width="100%"
                    />
                    </div>
                  ) : (
                    <div className="flex flex-1 items-center justify-center min-h-[260px] text-defaulttextcolor/60 text-sm">No data yet</div>
                  )}
                </div>
              </div>
            </div>

            <div className="h-full">
              <div className="box h-full">
                <div className="box-header flex flex-wrap items-start justify-between gap-2 shrink-0">
                  <div>
                    <div className="box-title">Jobs Created Over Time</div>
                    {jobsOverTimeData.categories.length > 0 && (
                      <p className="text-[0.75rem] text-defaulttextcolor/60 mt-1 mb-0">
                        {jobsOverTimeData.hasSlider ? 'In view' : 'Monthly volume'}
                        {jobsOverTimeData.peak && jobsOverTimeData.peak.count > 0 && (
                          <>
                            {' · '}
                            Peak{' '}
                            <span className="font-medium text-defaulttextcolor/80">
                              {jobsOverTimeData.peak.period}
                            </span>{' '}
                            ({jobsOverTimeData.peak.count})
                          </>
                        )}
                      </p>
                    )}
                  </div>
                  {jobsOverTimeData.categories.length > 0 && (
                    <span className="inline-flex items-center rounded-md bg-primary/10 px-2.5 py-1 text-[0.75rem] font-medium tabular-nums text-primary">
                      {jobsPeriodTotal} total
                      {jobsOverTimeData.hasSlider && jobsOverTimeData.total !== jobsPeriodTotal
                        ? ` · ${jobsOverTimeData.total} in view`
                        : ''}
                    </span>
                  )}
                </div>
                <div className="box-body pt-2 !pb-2 flex-1 flex flex-col min-h-0">
                  {jobsOverTimeData.categories.length > 0 ? (
                      <div
                        className="h-[224px] w-full"
                        role="img"
                        aria-label={
                          jobsOverTimeData.peak
                            ? `Jobs created over time. ${jobsPeriodTotal} total${jobsOverTimeData.hasSlider && jobsOverTimeData.total !== jobsPeriodTotal ? `, ${jobsOverTimeData.total} in view` : ''}. Peak ${jobsOverTimeData.peak.period} with ${jobsOverTimeData.peak.count} jobs.`
                            : `Jobs created over time. ${jobsPeriodTotal} total.`
                        }
                      >
                        <ReactApexChart
                          key={jobsOverTimeData.chartKey}
                          type="line"
                          series={jobsOverTimeData.series}
                          options={lineChartOpts(
                            jobsOverTimeData.categories,
                            'Jobs',
                            'ats-jobs-over-time'
                          )}
                          height={LINE_CHART_HEIGHT}
                          width="100%"
                        />
                      </div>
                  ) : (
                    <div className="flex flex-1 flex-col items-center justify-center gap-2 min-h-[260px] text-center">
                      <i className="ri-line-chart-line text-[2rem] text-defaulttextcolor/30" aria-hidden />
                      <p className="text-sm text-defaulttextcolor/70 m-0">No jobs created in this period</p>
                      <p className="text-[0.75rem] text-defaulttextcolor/50 m-0">Try a wider date range above</p>
                    </div>
                  )}
                </div>
                {jobsOverTimeData.categories.length > 0 && (
                  <MonthWindowSlider
                    periods={jobsOverTimeData.allPeriods}
                    startIdx={jobsOverTimeData.startIdx}
                    maxStart={jobsOverTimeData.maxStart}
                    windowSize={MONTH_WINDOW_SIZE}
                    onChange={setJobsMonthStart}
                  />
                )}
              </div>
            </div>

            <div className="h-full">
              <div className="box h-full">
                <div className="box-header shrink-0"><div className="box-title">Recruiter Activity by Type</div></div>
                <div className="box-body flex-1 flex flex-col min-h-0">
                  {recruiterActivityBarData.categories.length > 0 ? (
                    <div className="h-[280px]">
                    <ReactApexChart
                      type="bar"
                      series={recruiterActivityBarData.series}
                      options={barChartOpts(recruiterActivityBarData.categories, CHART_COLORS.purple)}
                      height={CHART_HEIGHT} width="100%"
                    />
                    </div>
                  ) : (
                    <div className="flex flex-1 items-center justify-center min-h-[260px] text-defaulttextcolor/60 text-sm">No activity data</div>
                  )}
                </div>
              </div>
            </div>

            <div className="h-full">
              <div className="box h-full">
                <div className="box-header shrink-0"><div className="box-title">Recruiter Leaderboard</div></div>
                <div className="box-body flex-1 flex flex-col min-h-0">
                  {data.recruiterActivitySummary?.length > 0 ? (
                    <div className="table-responsive flex-1 min-h-[260px]">
                      <table className="table table-bordered table-hover min-w-full h-full text-[0.8125rem] mb-0">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-white/5">
                            <th className="!text-start">Recruiter</th>
                            <th className="!text-end tabular-nums">Total Activities</th>
                            <th className="!text-end tabular-nums">Jobs Posted</th>
                            <th className="!text-end tabular-nums">Screened</th>
                            <th className="!text-end tabular-nums">Interviews</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.from({ length: RECRUITER_LEADERBOARD_ROWS }, (_, idx) => {
                            const r = data.recruiterActivitySummary[idx]
                            const rowClass = 'h-[56px] [&>td]:align-middle [&>td]:py-0'
                            if (!r) {
                              return (
                                <tr key={`leaderboard-empty-${idx}`} className={`${rowClass} text-defaulttextcolor/40`}>
                                  <td className="!text-start">—</td>
                                  <td className="text-end tabular-nums">0</td>
                                  <td className="text-end tabular-nums">0</td>
                                  <td className="text-end tabular-nums">0</td>
                                  <td className="text-end tabular-nums">0</td>
                                </tr>
                              )
                            }
                            const actMap = new Map((r.activities ?? []).map((a) => [a.activityType, a.count]))
                            const isInactive = r.totalActivities === 0
                            return (
                              <tr
                                key={r.recruiter?.id || idx}
                                className={`${rowClass}${isInactive ? ' text-defaulttextcolor/70' : ''}`}
                              >
                                <td className="!text-start">{r.recruiter?.name || '—'}</td>
                                <td className="text-end tabular-nums">{r.totalActivities}</td>
                                <td className="text-end tabular-nums">{actMap.get('job_posting_created') || 0}</td>
                                <td className="text-end tabular-nums">{actMap.get('candidate_screened') || 0}</td>
                                <td className="text-end tabular-nums">{actMap.get('interview_scheduled') || 0}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex flex-1 items-center justify-center min-h-[260px] text-defaulttextcolor/60 text-sm">No recruiter data</div>
                  )}
                </div>
              </div>
            </div>

            </div>

            {/* ---- Top Jobs by Applications (full width) ---- */}
            {data.topJobsByApplications?.length > 0 && (
              <div className="col-span-12">
                <div className="box">
                  <div className="box-header"><div className="box-title">Top Jobs by Applications</div></div>
                  <div className="box-body">
                    <div className="table-responsive">
                      <table className="table table-bordered table-hover min-w-full text-[0.8125rem]">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-white/5">
                            <th className="!text-start">#</th>
                            <th className="!text-start">Job Title</th>
                            <th className="!text-start">Organisation</th>
                            <th className="!text-end">Applications</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.topJobsByApplications.map((j, idx) => (
                            <tr key={j.jobId}>
                              <td>{idx + 1}</td>
                              <td>{j.title || '—'}</td>
                              <td>{j.org || '—'}</td>
                              <td className="text-end">{j.count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      <DrillDownModal
        open={drillModal.open}
        onClose={() => setDrillModal({ open: false, type: '', value: '' })}
        drillType={drillModal.type}
        drillValue={drillModal.value}
      />
    </Fragment>
  )
}

export default ATSAnalytics
