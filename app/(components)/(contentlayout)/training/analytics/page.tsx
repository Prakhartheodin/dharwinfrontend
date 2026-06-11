"use client"

import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment, useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  getTrainingAnalytics,
  type TrainingAnalyticsResponse,
  type StatusBreakdown,
  type TimeBucket,
  type AnalyticsRange,
} from '@/shared/lib/api/analytics'

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false })

type ConfigurableChartField =
  | 'enrollmentsOverTime'
  | 'completionsOverTime'
  | 'quizScoreOverTime'
  | 'studentsPerModule'

const RANGE_OPTIONS: { value: AnalyticsRange | ''; label: string }[] = [
  { value: '', label: 'All time' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '3m', label: 'Last 3 months' },
  { value: '12m', label: 'Last 12 months' },
]

const CONFIGURABLE_OPTIONS: { value: ConfigurableChartField; label: string }[] = [
  { value: 'enrollmentsOverTime', label: 'Enrollments over time' },
  { value: 'completionsOverTime', label: 'Completions over time' },
  { value: 'quizScoreOverTime', label: 'Quiz score over time' },
  { value: 'studentsPerModule', label: 'Students per module' },
]

const HORIZONTAL_BAR_ROW_HEIGHT = 40
const HORIZONTAL_BAR_VIEWPORT_MAX = 320
const HORIZONTAL_BAR_AXIS_FOOTER_CLASS =
  'min-h-[2.25rem] shrink-0 border-t border-defaultborder/70 bg-slate-50/50 px-2 py-2 dark:border-white/10 dark:bg-white/[0.02]'
const HORIZONTAL_BAR_LABEL_COLUMN_CLASS = 'w-[min(48%,14.5rem)] shrink-0'
const MODULE_BAR_LABEL_COLUMN_CLASS = 'w-[min(58%,22rem)] shrink-0'
const HORIZONTAL_BAR_SURFACE_CLASS =
  'overflow-hidden rounded-lg border border-defaultborder/70 bg-white dark:border-white/10 dark:bg-bodybg'
const ANALYTICS_TWIN_PANEL_CLASS = 'box flex h-full w-full min-h-[24rem] flex-col'
const ANALYTICS_TWIN_BODY_CLASS = 'box-body flex min-h-0 flex-1 flex-col'
const ANALYTICS_TWIN_CONTENT_CLASS = 'flex h-[320px] min-h-[320px] flex-col'

const CATEGORY_BAR_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#0d9488',
  '#f59e0b',
  '#ef4444',
  '#3b82f6',
  '#ec4899',
  '#14b8a6',
  '#94a3b8',
]

function formatAnalyticsDate(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function mentorDisplayName(name: string | null | undefined) {
  const trimmed = name?.trim()
  if (!trimmed || trimmed === '—' || trimmed === 'Unassigned') return 'Unassigned mentor'
  return trimmed
}

function niceAxisMax(value: number) {
  if (value <= 0) return 10
  const step = 10 ** Math.floor(Math.log10(value))
  const normalized = value / step
  const nice =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return nice * step
}

type HorizontalBarItem = { name: string; value: number }

function HorizontalBarChart({
  items,
  nameColumnLabel,
  valueColumnLabel,
  ariaLabel,
  barColor = '#6366f1',
  getBarColor,
  axisMax: axisMaxProp,
  formatValue = (value: number) => String(value),
  labelColumnClassName = HORIZONTAL_BAR_LABEL_COLUMN_CLASS,
  labelAlign = 'end' as 'start' | 'end',
  wrapLabels = false,
  scrollable: scrollableProp,
  fillHeight = false,
}: {
  items: HorizontalBarItem[]
  nameColumnLabel: string
  valueColumnLabel: string
  ariaLabel: string
  barColor?: string
  getBarColor?: (index: number) => string
  axisMax?: number
  formatValue?: (value: number) => string
  labelColumnClassName?: string
  labelAlign?: 'start' | 'end'
  wrapLabels?: boolean
  scrollable?: boolean
  fillHeight?: boolean
}) {
  const labelScrollRef = useRef<HTMLDivElement>(null)
  const barScrollRef = useRef<HTMLDivElement>(null)

  const syncScroll = useCallback((source: 'labels' | 'bars') => {
    return (event: React.UIEvent<HTMLDivElement>) => {
      const peer = source === 'labels' ? barScrollRef.current : labelScrollRef.current
      if (peer) peer.scrollTop = event.currentTarget.scrollTop
    }
  }, [])

  const maxValue = Math.max(...items.map((item) => item.value), 0)
  const axisMax = axisMaxProp ?? niceAxisMax(maxValue)
  const tickCount = 5
  const ticks = Array.from({ length: tickCount + 1 }, (_, index) =>
    Math.round((axisMax / tickCount) * index)
  )
  const scrollable =
    scrollableProp ??
    items.length * HORIZONTAL_BAR_ROW_HEIGHT > HORIZONTAL_BAR_VIEWPORT_MAX - 72
  const labelTextAlign = labelAlign === 'start' ? 'text-start' : 'text-end'

  return (
    <div
      className={`flex min-h-0 flex-col ${fillHeight ? 'h-full max-h-full' : 'max-h-[320px]'} ${HORIZONTAL_BAR_SURFACE_CLASS}`}
      role="img"
      aria-label={ariaLabel}
    >
      <div className="flex shrink-0 border-b border-defaultborder/70 bg-slate-50/80 dark:border-white/10 dark:bg-white/[0.03]">
        <div className={`${labelColumnClassName} px-3 py-2`}>
          <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.04em] text-defaulttextcolor/50">
            {nameColumnLabel}
          </span>
        </div>
        <div className="min-w-0 flex-1 border-l border-defaultborder/70 px-3 py-2 dark:border-white/10">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.04em] text-defaulttextcolor/50">
            {valueColumnLabel}
          </span>
        </div>
      </div>

      <div
        className={`relative flex min-h-0 flex-1 ${scrollable && !fillHeight ? 'max-h-[248px]' : ''}`}
      >
        <div
          ref={labelScrollRef}
          onScroll={syncScroll('labels')}
          className={`${labelColumnClassName} overflow-y-auto overflow-x-hidden overscroll-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${
            scrollable ? 'pb-1' : ''
          }`}
        >
          {items.map((item, index) => (
            <div
              key={`${item.name}-${index}`}
              className={`group flex min-h-10 items-center border-b border-defaultborder/50 px-3 py-1.5 last:border-0 dark:border-white/10 ${
                index % 2 === 1 ? 'bg-slate-50/40 dark:bg-white/[0.015]' : ''
              }`}
              title={item.name}
            >
              <span
                className={`w-full ${labelTextAlign} text-[0.75rem] leading-snug text-defaulttextcolor/75 group-hover:text-defaulttextcolor ${
                  wrapLabels ? 'line-clamp-2 break-words' : 'truncate'
                }`}
              >
                {item.name}
              </span>
            </div>
          ))}
        </div>

        <div
          ref={barScrollRef}
          onScroll={syncScroll('bars')}
          className={`min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain border-l border-defaultborder/70 dark:border-white/10 [scrollbar-width:thin] [scrollbar-color:rgb(203_213_225)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300/80 dark:[scrollbar-color:rgb(100_116_139)_transparent] dark:[&::-webkit-scrollbar-thumb]:bg-slate-600/80 ${
            scrollable ? 'pb-1' : ''
          }`}
        >
          {items.map((item, index) => {
            const widthPct = axisMax > 0 ? (item.value / axisMax) * 100 : 0
            const color = getBarColor ? getBarColor(index) : barColor
            const showInsideLabel = widthPct >= 18
            const formatted = formatValue(item.value)

            return (
              <div
                key={`${item.name}-${index}`}
                className={`group relative flex min-h-10 items-center border-b border-defaultborder/50 py-1.5 last:border-0 dark:border-white/10 ${
                  index % 2 === 1 ? 'bg-slate-50/40 dark:bg-white/[0.015]' : ''
                }`}
              >
                <div className="pointer-events-none absolute inset-0 flex">
                  {ticks.map((tick) => (
                    <div
                      key={tick}
                      className="flex-1 border-r border-dashed border-defaultborder/40 last:border-r-0 dark:border-white/10"
                    />
                  ))}
                </div>
                <div className="relative flex h-6 flex-1 items-center px-3">
                  <div
                    className="h-full min-w-[6px] rounded-md motion-reduce:transition-none transition-[width] duration-200 ease-out group-hover:brightness-105"
                    style={{
                      width: `${item.value > 0 ? Math.max(widthPct, 4) : 0}%`,
                      backgroundColor: color,
                    }}
                  >
                    {showInsideLabel ? (
                      <span className="flex h-full items-center justify-end pr-2 text-[0.6875rem] font-semibold tabular-nums text-white">
                        {formatted}
                      </span>
                    ) : null}
                  </div>
                  {!showInsideLabel ? (
                    <span className="ml-2 shrink-0 text-[0.75rem] font-medium tabular-nums text-defaulttextcolor/80">
                      {formatted}
                    </span>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex shrink-0">
        <div
          className={`${labelColumnClassName} ${HORIZONTAL_BAR_AXIS_FOOTER_CLASS}`}
          aria-hidden
        />
        <div
          className={`flex flex-1 justify-between border-l border-defaultborder/70 dark:border-white/10 ${HORIZONTAL_BAR_AXIS_FOOTER_CLASS}`}
          aria-hidden
        >
          {ticks.map((tick) => (
            <span
              key={tick}
              className="min-w-[1.25rem] text-center text-[0.6875rem] tabular-nums text-defaulttextcolor/55 first:text-start last:text-end"
            >
              {formatValue(tick)}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function CategoryEnrollmentsChart({
  items,
  scrollable = false,
}: {
  items: HorizontalBarItem[]
  scrollable?: boolean
}) {
  const summary = items
    .slice(0, 3)
    .map((item) => `${item.name}: ${item.value}`)
    .join(', ')

  return (
    <HorizontalBarChart
      items={items}
      nameColumnLabel="Category"
      valueColumnLabel="Enrollments"
      ariaLabel={`Enrollments by category. ${items.length} categories. Top: ${summary}`}
      getBarColor={(index) => CATEGORY_BAR_COLORS[index % CATEGORY_BAR_COLORS.length]}
      scrollable={scrollable}
    />
  )
}

const ENROLLMENT_STATUS_COLORS = {
  notStarted: '#94a3b8',
  inProgress: '#6366f1',
  completed: '#22c55e',
} as const

function EnrollmentStatusBreakdown({ breakdown }: { breakdown: StatusBreakdown }) {
  const items = useMemo(
    () => [
      {
        id: 'notStarted',
        label: 'Not started',
        value: breakdown.notStarted ?? 0,
        color: ENROLLMENT_STATUS_COLORS.notStarted,
      },
      {
        id: 'inProgress',
        label: 'In progress',
        value: breakdown.inProgress ?? 0,
        color: ENROLLMENT_STATUS_COLORS.inProgress,
      },
      {
        id: 'completed',
        label: 'Completed',
        value: breakdown.completed ?? 0,
        color: ENROLLMENT_STATUS_COLORS.completed,
      },
    ],
    [breakdown]
  )

  const total = items.reduce((sum, item) => sum + item.value, 0)
  const maxValue = Math.max(...items.map((item) => item.value), 0)
  const axisMax = niceAxisMax(maxValue)

  const summary = items
    .filter((item) => item.value > 0)
    .map((item) => `${item.label} ${item.value}`)
    .join(', ')

  return (
    <div
      className={`flex h-full min-h-0 flex-col ${HORIZONTAL_BAR_SURFACE_CLASS}`}
      role="img"
      aria-label={
        total > 0
          ? `Enrollment status breakdown. ${total} total. ${summary}.`
          : 'Enrollment status breakdown. No enrollments yet.'
      }
    >
      <div className="shrink-0 border-b border-defaultborder/70 px-3 py-3 dark:border-white/10">
        <div
          className="flex h-2.5 overflow-hidden rounded-full bg-gray-200/90 dark:bg-white/10"
          aria-hidden
        >
          {total > 0 ? (
            items.map((item) =>
              item.value > 0 ? (
                <div
                  key={item.id}
                  className="h-full min-w-[2px] motion-reduce:transition-none transition-[width] duration-200 ease-out"
                  style={{
                    width: `${(item.value / total) * 100}%`,
                    backgroundColor: item.color,
                  }}
                />
              ) : null
            )
          ) : (
            <div className="h-full w-full bg-gray-300/60 dark:bg-white/15" />
          )}
        </div>
        <p className="mb-0 mt-2 text-[0.6875rem] text-defaulttextcolor/55 tabular-nums">
          {total} enrollment{total === 1 ? '' : 's'} across all modules
        </p>
      </div>

      <div className="flex shrink-0 border-b border-defaultborder/70 bg-slate-50/80 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="min-w-0 flex-[1.1] px-3 py-2">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.04em] text-defaulttextcolor/50">
            Status
          </span>
        </div>
        <div className="w-[4.5rem] shrink-0 border-l border-defaultborder/70 px-2 py-2 text-end dark:border-white/10">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.04em] text-defaulttextcolor/50">
            Count
          </span>
        </div>
        <div className="min-w-0 flex-1 border-l border-defaultborder/70 px-3 py-2 dark:border-white/10">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.04em] text-defaulttextcolor/50">
            Share
          </span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {items.map((item, index) => {
          const sharePct = total > 0 ? Math.round((item.value / total) * 100) : 0
          const barPct = axisMax > 0 && item.value > 0 ? Math.max((item.value / axisMax) * 100, 4) : 0

          return (
            <div
              key={item.id}
              className={`flex min-h-[4.5rem] flex-1 items-center border-b border-defaultborder/50 last:border-0 dark:border-white/10 ${
                index % 2 === 1 ? 'bg-slate-50/40 dark:bg-white/[0.015]' : ''
              }`}
            >
              <div className="flex min-w-0 flex-[1.1] items-center gap-2 px-3">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                  aria-hidden
                />
                <span className="text-[0.8125rem] font-medium text-defaulttextcolor/85">
                  {item.label}
                </span>
              </div>
              <div className="w-[4.5rem] shrink-0 px-2 text-end">
                <span className="text-[0.9375rem] font-semibold tabular-nums text-defaulttextcolor">
                  {item.value}
                </span>
              </div>
              <div className="flex min-w-0 flex-1 items-center gap-2 border-l border-defaultborder/70 px-3 dark:border-white/10">
                <div
                  className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-200/90 dark:bg-white/10"
                  role="progressbar"
                  aria-valuenow={sharePct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${item.label}: ${sharePct}% of enrollments`}
                >
                  <div
                    className="h-full rounded-full motion-reduce:transition-none transition-[width] duration-200 ease-out"
                    style={{ width: `${barPct}%`, backgroundColor: item.color }}
                  />
                </div>
                <span className="w-9 shrink-0 text-end text-[0.75rem] font-medium tabular-nums text-defaulttextcolor/65">
                  {sharePct}%
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MentorWorkloadList({
  items,
}: {
  items: { mentorId: string; mentorName: string; moduleCount: number; studentCount: number }[]
}) {
  const scrollable = items.length * HORIZONTAL_BAR_ROW_HEIGHT > HORIZONTAL_BAR_VIEWPORT_MAX - 48

  return (
    <div className={`flex max-h-[320px] min-h-0 flex-col ${HORIZONTAL_BAR_SURFACE_CLASS}`}>
      <div className="flex shrink-0 border-b border-defaultborder/70 bg-slate-50/80 px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
        <span className="flex-1 text-[0.6875rem] font-semibold uppercase tracking-[0.04em] text-defaulttextcolor/50">
          Mentor
        </span>
        <span className="w-16 text-end text-[0.6875rem] font-semibold uppercase tracking-[0.04em] text-defaulttextcolor/50">
          Modules
        </span>
        <span className="w-16 text-end text-[0.6875rem] font-semibold uppercase tracking-[0.04em] text-defaulttextcolor/50">
          Students
        </span>
      </div>

      <ul
        className={`mb-0 list-none overflow-y-auto overscroll-contain [scrollbar-width:thin] [scrollbar-color:rgb(203_213_225)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300/80 dark:[scrollbar-color:rgb(100_116_139)_transparent] dark:[&::-webkit-scrollbar-thumb]:bg-slate-600/80 ${
          scrollable ? 'max-h-[272px] pb-1' : ''
        }`}
      >
        {items.map((mentor, index) => {
          const label = mentorDisplayName(mentor.mentorName)
          const isUnassigned = label === 'Unassigned mentor'
          const initial = label.charAt(0).toUpperCase()

          return (
            <li
              key={mentor.mentorId}
              className={`group flex items-center gap-3 border-b border-defaultborder/50 px-3 py-2.5 last:border-0 dark:border-white/10 ${
                index % 2 === 1 ? 'bg-slate-50/40 dark:bg-white/[0.015]' : ''
              } hover:bg-primary/5`}
            >
              <span
                className={`avatar avatar-sm avatar-rounded shrink-0 font-semibold ${
                  isUnassigned
                    ? 'bg-warning/15 text-warning'
                    : 'bg-primary/10 text-primary'
                }`}
              >
                {initial}
              </span>
              <div className="min-w-0 flex-1">
                <span
                  className={`block truncate text-[0.8125rem] font-medium ${
                    isUnassigned ? 'text-defaulttextcolor/65 italic' : 'text-defaulttextcolor'
                  }`}
                  title={label}
                >
                  {label}
                </span>
              </div>
              <span className="w-16 shrink-0 text-end text-[0.8125rem] font-medium tabular-nums text-defaulttextcolor/80">
                {mentor.moduleCount}
              </span>
              <span className="w-16 shrink-0 text-end text-[0.8125rem] font-semibold tabular-nums text-defaulttextcolor">
                {mentor.studentCount}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function exportToCsv(data: TrainingAnalyticsResponse) {
  const rows: string[][] = [
    ['Training Analytics Export', ''],
    ['Students', String(data.totalStudents)],
    ['Mentors', String(data.totalMentors)],
    ['Courses', String(data.totalCourses)],
    ['Enrollments', String(data.totalEnrollments)],
    ['Completions', String(data.completionCount)],
    [''],
    ['Enrollments by module', 'Count'],
    ...(data.enrollmentsByModule || []).map((m) => [m.moduleName, String(m.enrolledCount)]),
    [''],
    ['Completion by module', 'Enrolled', 'Completed', 'Rate %'],
    ...(data.completionByModule || []).map((m) => [m.moduleName, String(m.enrolled), String(m.completed), String(m.completionRate)]),
  ]
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `training-analytics-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const TrainingAnalytics = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<TrainingAnalyticsResponse | null>(null)
  const [configurableField, setConfigurableField] = useState<ConfigurableChartField>('enrollmentsOverTime')
  const [range, setRange] = useState<AnalyticsRange | ''>('')

  useEffect(() => {
    let cancelled = false
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await getTrainingAnalytics(range ? { range: range as AnalyticsRange } : undefined)
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
    return () => {
      cancelled = true
    }
  }, [range])

  const completionRate =
    data && data.totalEnrollments > 0
      ? Math.round((data.completionCount / data.totalEnrollments) * 100)
      : 0

  const configurableChartData = useMemo(() => {
    if (!data) return { series: [], categories: [], type: 'line' as const }
    if (configurableField === 'studentsPerModule') {
      const byModule = data.enrollmentsByModule || []
      return {
        type: 'bar' as const,
        categories: byModule.map((m) => m.moduleName),
        series: [{ name: 'Students', data: byModule.map((m) => m.enrolledCount) }],
      }
    }
    let buckets: TimeBucket[] = []
    let seriesName = ''
    if (configurableField === 'enrollmentsOverTime') {
      buckets = data.enrollmentsOverTime || []
      seriesName = 'Enrollments'
    } else if (configurableField === 'completionsOverTime') {
      buckets = data.completionsOverTime || []
      seriesName = 'Completions'
    } else {
      buckets = data.quizScoreOverTime || []
      seriesName = 'Avg score %'
    }
    const categories = buckets.map((b) => b.period)
    const values = buckets.map((b) => ('averageScore' in b && b.averageScore != null ? b.averageScore : b.count ?? 0))
    return {
      type: 'line' as const,
      categories,
      series: [{ name: seriesName, data: values }],
    }
  }, [data, configurableField])

  const moduleEnrollmentItems = useMemo<HorizontalBarItem[]>(() => {
    if (!data?.enrollmentsByModule?.length) return []
    return data.enrollmentsByModule.map((module) => ({
      name: module.moduleName,
      value: module.enrolledCount,
    }))
  }, [data?.enrollmentsByModule])

  const configurableChartOptions = useMemo(
    () => ({
      chart: {
        toolbar: { show: false },
        height: 320,
        fontFamily: 'Poppins, Arial, sans-serif',
      },
      stroke: { curve: 'smooth' as const, width: 2 },
      dataLabels: { enabled: false },
      xaxis: { categories: configurableChartData.categories },
      yaxis: { labels: { style: { colors: '#64748b' } } },
      grid: { borderColor: '#f1f5f9', strokeDashArray: 3 },
      colors: ['#0d9488'],
    }),
    [configurableChartData.categories]
  )

  const categoryBarChart = useMemo(() => {
    const sorted = [...(data?.enrollmentsByCategory || [])].sort((a, b) => b.count - a.count)
    const total = sorted.reduce((sum, item) => sum + item.count, 0)
    const items: HorizontalBarItem[] = sorted.map((item) => ({
      name: item.categoryName,
      value: item.count,
    }))
    const scrollable = items.length * HORIZONTAL_BAR_ROW_HEIGHT > HORIZONTAL_BAR_VIEWPORT_MAX - 72

    return { items, total, scrollable }
  }, [data?.enrollmentsByCategory])

  return (
    <Fragment>
      <Seo title="Training Analytics" />
      <div className="container mx-auto mt-5 w-full max-w-full sm:mt-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-[0.8125rem] text-defaulttextcolor/70">Period:</label>
            <select
              className="form-control select-show-page-size !w-auto !py-1.5 !px-3 !text-[0.8125rem]"
              value={range}
              onChange={(e) => setRange((e.target.value || '') as AnalyticsRange | '')}
            >
              {RANGE_OPTIONS.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          {data && (
            <button
              type="button"
              className="ti-btn ti-btn-outline-primary !py-1.5 !px-3 !text-[0.8125rem]"
              onClick={() => exportToCsv(data)}
            >
              <i className="ri-download-line align-middle me-1" />
              Export CSV
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 p-4 bg-danger/10 border border-danger/30 text-danger rounded-lg text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-defaulttextcolor/70">Loading analytics…</div>
        ) : data ? (
          <div className="grid grid-cols-12 gap-x-6 gap-y-6">
            {/* Stat cards – one grid, 4 per row on lg */}
            <div className="col-span-12 grid grid-cols-12 gap-x-6 gap-y-4">
              <div className="sm:col-span-6 lg:col-span-3 col-span-12">
                  <div className="box">
                    <div className="box-body flex justify-between items-center">
                      <div>
                        <p className="mb-1 text-[0.8125rem] text-defaulttextcolor/70">Students</p>
                        <h4 className="font-semibold mb-0 text-[1.5rem]">{data.totalStudents}</h4>
                      </div>
                      <span className="avatar avatar-md bg-primary text-white p-2">
                        <i className="ri-user-line text-[1.25rem] opacity-80" />
                      </span>
                    </div>
                  </div>
                </div>
              <div className="sm:col-span-6 lg:col-span-3 col-span-12">
                  <div className="box">
                    <div className="box-body flex justify-between items-center">
                      <div>
                        <p className="mb-1 text-[0.8125rem] text-defaulttextcolor/70">Mentors</p>
                        <h4 className="font-semibold mb-0 text-[1.5rem]">{data.totalMentors}</h4>
                      </div>
                      <span className="avatar avatar-md bg-secondary text-white p-2">
                        <i className="ri-team-line text-[1.25rem] opacity-80" />
                      </span>
                    </div>
                  </div>
                </div>
              <div className="sm:col-span-6 lg:col-span-3 col-span-12">
                  <div className="box">
                    <div className="box-body flex justify-between items-center">
                      <div>
                        <p className="mb-1 text-[0.8125rem] text-defaulttextcolor/70">Courses</p>
                        <h4 className="font-semibold mb-0 text-[1.5rem]">{data.totalCourses}</h4>
                      </div>
                      <span className="avatar avatar-md bg-info text-white p-2">
                        <i className="ri-book-open-line text-[1.25rem] opacity-80" />
                      </span>
                    </div>
                  </div>
                </div>
              <div className="sm:col-span-6 lg:col-span-3 col-span-12">
                  <div className="box">
                    <div className="box-body flex justify-between items-center">
                      <div>
                        <p className="mb-1 text-[0.8125rem] text-defaulttextcolor/70">Enrollments</p>
                        <h4 className="font-semibold mb-0 text-[1.5rem]">{data.totalEnrollments}</h4>
                        {data.previousPeriod != null && (
                          <span className="text-[0.6875rem] text-defaulttextcolor/60">
                            vs prev: {data.previousPeriod.enrollments} ({data.previousPeriod.enrollments > 0 && data.totalEnrollments > 0 ? (data.totalEnrollments >= data.previousPeriod.enrollments ? '+' : '') + Math.round(((data.totalEnrollments - data.previousPeriod.enrollments) / data.previousPeriod.enrollments) * 100) : 0}%)
                          </span>
                        )}
                      </div>
                      <span className="avatar avatar-md bg-success text-white p-2">
                        <i className="ri-group-line text-[1.25rem] opacity-80" />
                      </span>
                    </div>
                  </div>
                </div>
              <div className="sm:col-span-6 lg:col-span-3 col-span-12">
                  <div className="box">
                    <div className="box-body flex justify-between items-center">
                      <div>
                        <p className="mb-1 text-[0.8125rem] text-defaulttextcolor/70">Completion rate</p>
                        <h4 className="font-semibold mb-0 text-[1.5rem]">{completionRate}%</h4>
                        {data.previousPeriod != null && data.previousPeriod.completions != null && (
                          <span className="text-[0.6875rem] text-defaulttextcolor/60">
                            vs prev: {data.previousPeriod.completions} completions
                          </span>
                        )}
                      </div>
                      <span className="avatar avatar-md bg-warning text-white p-2">
                        <i className="ri-checkbox-circle-line text-[1.25rem] opacity-80" />
                      </span>
                    </div>
                  </div>
                </div>
              <div className="sm:col-span-6 lg:col-span-3 col-span-12">
                  <div className="box">
                    <div className="box-body flex justify-between items-center">
                      <div>
                        <p className="mb-1 text-[0.8125rem] text-defaulttextcolor/70">Avg quiz score</p>
                        <h4 className="font-semibold mb-0 text-[1.5rem]">
                          {data.averageQuizScore != null ? `${data.averageQuizScore}%` : '—'}
                        </h4>
                      </div>
                      <span className="avatar avatar-md bg-teal-500 text-white p-2">
                        <i className="ri-question-answer-line text-[1.25rem] opacity-80" />
                      </span>
                    </div>
                  </div>
                </div>
              {data.notStartedCount != null && (
                <div className="sm:col-span-6 lg:col-span-3 col-span-12">
                  <div className="box">
                    <div className="box-body flex justify-between items-center">
                      <div>
                        <p className="mb-1 text-[0.8125rem] text-defaulttextcolor/70">Not started</p>
                        <h4 className="font-semibold mb-0 text-[1.5rem]">{data.notStartedCount}</h4>
                      </div>
                      <span className="avatar avatar-md bg-danger/10 text-danger p-2">
                        <i className="ri-time-line text-[1.25rem] opacity-80" />
                      </span>
                    </div>
                  </div>
                </div>
              )}
              {data.averageDaysToComplete != null && (
                <div className="sm:col-span-6 lg:col-span-3 col-span-12">
                  <div className="box">
                    <div className="box-body flex justify-between items-center">
                      <div>
                        <p className="mb-1 text-[0.8125rem] text-defaulttextcolor/70">Avg time to complete</p>
                        <h4 className="font-semibold mb-0 text-[1.5rem]">{data.averageDaysToComplete} days</h4>
                      </div>
                      <span className="avatar avatar-md bg-pink-500/10 text-pink-500 p-2">
                        <i className="ri-calendar-check-line text-[1.25rem] opacity-80" />
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Enrollment status + Students enrolled in modules (matched height pair) */}
            {data.statusBreakdown && (
              <div className="lg:col-span-6 col-span-12 flex">
                <div className={ANALYTICS_TWIN_PANEL_CLASS}>
                  <div className="box-header shrink-0">
                    <div className="box-title mb-0">Enrollment status</div>
                  </div>
                  <div className={ANALYTICS_TWIN_BODY_CLASS}>
                    <div className={ANALYTICS_TWIN_CONTENT_CLASS}>
                      <EnrollmentStatusBreakdown breakdown={data.statusBreakdown} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div
              className={`col-span-12 flex ${data.statusBreakdown ? 'lg:col-span-6' : ''}`}
            >
              <div
                className={
                  data.statusBreakdown
                    ? ANALYTICS_TWIN_PANEL_CLASS
                    : 'box flex w-full flex-col'
                }
              >
                <div className="box-header shrink-0">
                  <div className="box-title mb-0">Students enrolled in modules</div>
                </div>
                <div className={data.statusBreakdown ? ANALYTICS_TWIN_BODY_CLASS : 'box-body'}>
                  <div
                    className={
                      data.statusBreakdown
                        ? ANALYTICS_TWIN_CONTENT_CLASS
                        : 'min-h-0'
                    }
                  >
                    {moduleEnrollmentItems.length > 0 ? (
                      <HorizontalBarChart
                        items={moduleEnrollmentItems}
                        nameColumnLabel="Module"
                        valueColumnLabel="Students"
                        ariaLabel={`Students enrolled by module. ${moduleEnrollmentItems.length} modules.`}
                        barColor="#6366f1"
                        labelColumnClassName={MODULE_BAR_LABEL_COLUMN_CLASS}
                        labelAlign="start"
                        wrapLabels
                        fillHeight={Boolean(data.statusBreakdown)}
                      />
                    ) : (
                      <div className="flex h-full min-h-[12rem] items-center justify-center text-defaulttextcolor/60 text-sm">
                        No enrollment data yet
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Trends + Recent completions (matched twin panels) */}
            <div className="lg:col-span-6 col-span-12 flex">
              <div className={ANALYTICS_TWIN_PANEL_CLASS}>
                <div className="box-header shrink-0 justify-between flex-wrap gap-2">
                  <div>
                    <div className="box-title mb-0">Trends</div>
                    <p className="mb-0 mt-1 text-[0.75rem] text-defaulttextcolor/60">
                      {CONFIGURABLE_OPTIONS.find((opt) => opt.value === configurableField)?.label}
                    </p>
                  </div>
                  <select
                    className="form-control select-show-page-size !w-auto !py-1.5 !px-3 !text-[0.8125rem]"
                    value={configurableField}
                    onChange={(e) => setConfigurableField(e.target.value as ConfigurableChartField)}
                    aria-label="Trend metric"
                  >
                    {CONFIGURABLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={ANALYTICS_TWIN_BODY_CLASS}>
                  <div className={ANALYTICS_TWIN_CONTENT_CLASS}>
                    {configurableChartData.type === 'bar' && moduleEnrollmentItems.length > 0 ? (
                      <HorizontalBarChart
                        items={moduleEnrollmentItems}
                        nameColumnLabel="Module"
                        valueColumnLabel="Students"
                        ariaLabel={`Students per module trend. ${moduleEnrollmentItems.length} modules.`}
                        barColor="#0d9488"
                        labelColumnClassName={MODULE_BAR_LABEL_COLUMN_CLASS}
                        labelAlign="start"
                        wrapLabels
                      />
                    ) : configurableChartData.categories.length > 0 ? (
                      <div className="h-full min-h-0 w-full">
                        <ReactApexChart
                          type={configurableChartData.type}
                          series={configurableChartData.series}
                          options={configurableChartOptions}
                          height={320}
                          width="100%"
                        />
                      </div>
                    ) : (
                      <div className="flex h-full items-center justify-center text-defaulttextcolor/60 text-sm">
                        No data for this selection
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 col-span-12 flex">
              <div className={ANALYTICS_TWIN_PANEL_CLASS}>
                <div className="box-header shrink-0 justify-between gap-2">
                  <div>
                    <div className="box-title mb-0">Recent completions</div>
                    <p className="mb-0 mt-1 text-[0.75rem] text-defaulttextcolor/60">
                      {data.recentCompletions?.length ?? 0} latest
                    </p>
                  </div>
                  <Link
                    href="/training/evaluation"
                    className="shrink-0 text-[0.75rem] text-primary hover:underline"
                  >
                    View all
                  </Link>
                </div>
                <div className={ANALYTICS_TWIN_BODY_CLASS}>
                  <div className={ANALYTICS_TWIN_CONTENT_CLASS}>
                    {data.recentCompletions?.length > 0 ? (
                      <ul className="mb-0 list-none h-full overflow-y-auto overscroll-contain [scrollbar-width:thin] [scrollbar-color:rgb(203_213_225)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300/80 dark:[scrollbar-color:rgb(100_116_139)_transparent] dark:[&::-webkit-scrollbar-thumb]:bg-slate-600/80">
                        {data.recentCompletions.map((item, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-3 border-b border-defaultborder/70 py-2.5 last:border-0 dark:border-white/10"
                          >
                            <span className="avatar avatar-sm avatar-rounded shrink-0 bg-primary/10 font-semibold text-primary">
                              {item.studentName?.charAt(0)?.toUpperCase() || '?'}
                            </span>
                            <div className="min-w-0 flex-1">
                              <span className="block truncate text-[0.8125rem] font-medium text-defaulttextcolor">
                                {item.studentName}
                              </span>
                              <span className="block truncate text-[0.75rem] text-defaulttextcolor/70">
                                {item.courseName}
                              </span>
                            </div>
                            <span className="shrink-0 text-[0.75rem] tabular-nums text-defaulttextcolor/70">
                              {item.completedAt
                                ? formatAnalyticsDate(item.completedAt)
                                : '—'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="flex h-full items-center justify-center text-defaulttextcolor/60 text-sm">
                        No completions yet
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Completion by module + Quiz by module (same row) */}
            {data.completionByModule && data.completionByModule.length > 0 && (
              <div className="lg:col-span-6 col-span-12">
                <div className="box">
                  <div className="box-header">
                    <div className="box-title">Completion rate by module</div>
                  </div>
                  <div className="box-body">
                    <HorizontalBarChart
                      items={data.completionByModule.map((module) => ({
                        name: module.moduleName,
                        value: module.completionRate,
                      }))}
                      nameColumnLabel="Module"
                      valueColumnLabel="Completion %"
                      ariaLabel={`Completion rate by module. ${data.completionByModule.length} modules.`}
                      barColor="#10b981"
                      axisMax={100}
                      formatValue={(value) => `${value}%`}
                      labelColumnClassName={MODULE_BAR_LABEL_COLUMN_CLASS}
                      labelAlign="start"
                      wrapLabels
                    />
                  </div>
                </div>
              </div>
            )}

            {data.quizScoreByModule && data.quizScoreByModule.length > 0 && (
              <div className="lg:col-span-6 col-span-12">
                <div className="box">
                  <div className="box-header">
                    <div className="box-title">Quiz score by module</div>
                  </div>
                  <div className="box-body">
                    <HorizontalBarChart
                      items={data.quizScoreByModule.map((module) => ({
                        name: module.moduleName,
                        value: module.averageScore ?? 0,
                      }))}
                      nameColumnLabel="Module"
                      valueColumnLabel="Avg score"
                      ariaLabel={`Quiz score by module. ${data.quizScoreByModule.length} modules.`}
                      barColor="#8b5cf6"
                      axisMax={100}
                      formatValue={(value) => `${value}%`}
                      labelColumnClassName={MODULE_BAR_LABEL_COLUMN_CLASS}
                      labelAlign="start"
                      wrapLabels
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Enrollments by category + Mentor workload (same row) */}
            {categoryBarChart.items.length > 0 && (
              <div className="lg:col-span-6 col-span-12 flex">
                <div className="box flex h-full w-full min-h-[22rem] flex-col">
                  <div className="box-header flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="box-title mb-0">Enrollments by category</div>
                      <p className="mb-0 mt-1 text-[0.75rem] text-defaulttextcolor/60">
                        {categoryBarChart.items.length} categories · {categoryBarChart.total.toLocaleString()} enrollments
                      </p>
                    </div>
                    {categoryBarChart.scrollable ? (
                      <span className="rounded-full border border-defaultborder/70 bg-slate-50 px-2.5 py-1 text-[0.6875rem] text-defaulttextcolor/60 dark:border-white/10 dark:bg-white/[0.03]">
                        Scroll for more
                      </span>
                    ) : null}
                  </div>
                  <div className="box-body min-h-0 flex-1 pt-1">
                    <CategoryEnrollmentsChart
                      items={categoryBarChart.items}
                      scrollable={categoryBarChart.scrollable}
                    />
                  </div>
                </div>
              </div>
            )}

            {data.mentorWorkload && data.mentorWorkload.length > 0 && (
              <div className="lg:col-span-6 col-span-12 flex">
                <div className="box flex h-full w-full min-h-[22rem] flex-col">
                  <div className="box-header flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="box-title mb-0">Mentor workload</div>
                      <p className="mb-0 mt-1 text-[0.75rem] text-defaulttextcolor/60">
                        {data.mentorWorkload.length} mentor{data.mentorWorkload.length === 1 ? '' : 's'} ·{' '}
                        {data.mentorWorkload.reduce((sum, mentor) => sum + mentor.studentCount, 0).toLocaleString()}{' '}
                        students
                      </p>
                    </div>
                  </div>
                  <div className="box-body min-h-0 flex-1 pt-1">
                    <MentorWorkloadList items={data.mentorWorkload} />
                  </div>
                </div>
              </div>
            )}

            {/* Not started list – full width */}
            {data.notStartedList && data.notStartedList.length > 0 && (
              <div className="col-span-12">
                <div className="box">
                  <div className="box-header justify-between flex-wrap gap-2">
                    <div>
                      <div className="box-title mb-0">Not started (sample)</div>
                      <p className="text-[0.75rem] text-defaulttextcolor/60 mb-0 mt-1">
                        Recent enrollments with no course activity yet
                      </p>
                    </div>
                    <Link href="/training/evaluation" className="text-[0.75rem] text-primary hover:underline shrink-0">
                      View in evaluation
                    </Link>
                  </div>
                  <div className="box-body">
                    <ul className="list-none mb-0 grid gap-0 sm:grid-cols-2">
                      {data.notStartedList.map((item, idx) => (
                        <li
                          key={`${item.studentName}-${item.courseName}-${idx}`}
                          className="flex items-start gap-3 py-3 border-b border-defaultborder sm:[&:nth-last-child(-n+2)]:border-0 last:border-0"
                        >
                          <span className="avatar avatar-sm avatar-rounded font-semibold bg-warning/10 text-warning shrink-0">
                            {item.studentName?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                          <div className="min-w-0 flex-1">
                            <span className="font-medium block text-[0.8125rem] truncate">{item.studentName}</span>
                            <span className="text-[0.75rem] text-defaulttextcolor/70 block truncate">{item.courseName}</span>
                          </div>
                          <span className="text-[0.75rem] text-defaulttextcolor/70 shrink-0 tabular-nums">
                            {formatAnalyticsDate(item.enrolledAt)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </Fragment>
  )
}

export default TrainingAnalytics
