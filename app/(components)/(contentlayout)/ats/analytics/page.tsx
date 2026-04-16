"use client"

import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment, useState, useEffect, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
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

// ---------------------------------------------------------------------------
// CSV Export
// ---------------------------------------------------------------------------
function exportToCsv(data: AtsAnalyticsResponse) {
  const rows: string[][] = [
    ['ATS Analytics Export', ''],
    ['Total Candidates', String(data.totals.totalCandidates)],
    ['Total Jobs', String(data.totals.totalJobs)],
    ['Active Jobs', String(data.totals.activeJobs)],
    ['Total Applications', String(data.totals.totalApplications)],
    ['Hired', String(data.totals.hiredCount)],
    ['Total Recruiters', String(data.totals.totalRecruiters)],
    ['Conversion Rate %', String(data.totals.conversionRate)],
    ['Avg Profile Completion %', String(data.totals.avgProfileCompletion)],
    [''],
    ['Application Funnel', 'Count'],
    ...(data.applicationFunnel || []).map((f) => [f.status, String(f.count)]),
    [''],
    ['Job Status', 'Count'],
    ...(data.jobStatusBreakdown || []).map((j) => [j.status, String(j.count)]),
    [''],
    ['Job Type', 'Count'],
    ...(data.jobTypeDistribution || []).map((j) => [j.jobType, String(j.count)]),
    [''],
    ['Top Jobs by Applications', 'Count'],
    ...(data.topJobsByApplications || []).map((j) => [`${j.title} (${j.org || '—'})`, String(j.count)]),
    [''],
    ['Applications Over Time', 'Count'],
    ...(data.applicationsOverTime || []).map((t) => [t.period, String(t.count)]),
    [''],
    ['Jobs Created Over Time', 'Count'],
    ...(data.jobsOverTime || []).map((t) => [t.period, String(t.count)]),
  ]
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ats-analytics-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
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
    if (!data?.applicationFunnel?.length) return { categories: [], series: [] }
    const map = new Map(data.applicationFunnel.map((f) => [f.status, f.count]))
    const categories = FUNNEL_ORDER.filter((s) => map.has(s))
    const values = categories.map((s) => map.get(s) || 0)
    return { categories, series: [{ name: 'Applications', data: values }] }
  }, [data?.applicationFunnel])

  const applicationsOverTimeData = useMemo(() => {
    if (!data?.applicationsOverTime?.length) return { categories: [], series: [] }
    return {
      categories: data.applicationsOverTime.map((t) => t.period),
      series: [{ name: 'Applications', data: data.applicationsOverTime.map((t) => t.count) }],
    }
  }, [data?.applicationsOverTime])

  const jobsOverTimeData = useMemo(() => {
    if (!data?.jobsOverTime?.length) return { categories: [], series: [] }
    return {
      categories: data.jobsOverTime.map((t) => t.period),
      series: [{ name: 'Jobs Created', data: data.jobsOverTime.map((t) => t.count) }],
    }
  }, [data?.jobsOverTime])

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
    (categories: string[]) => ({
      chart: { toolbar: { show: false }, height: 320, fontFamily: 'Poppins, Arial, sans-serif' },
      stroke: { curve: 'smooth' as const, width: 2 },
      dataLabels: { enabled: false },
      xaxis: { categories },
      yaxis: { labels: { style: { colors: '#64748b' } } },
      grid: { borderColor: '#f1f5f9', strokeDashArray: 3 },
      colors: [CHART_COLORS.primary],
    }),
    []
  )

  const barChartOpts = useCallback(
    (categories: string[], color = CHART_COLORS.primary) => ({
      chart: { toolbar: { show: false }, height: 320, fontFamily: 'Poppins, Arial, sans-serif' },
      plotOptions: { bar: { columnWidth: '50%', borderRadius: 4 } },
      dataLabels: { enabled: false },
      xaxis: { categories },
      yaxis: { labels: { style: { colors: '#64748b' } } },
      grid: { borderColor: '#f1f5f9', strokeDashArray: 3 },
      colors: [color],
    }),
    []
  )

  const horizontalBarOpts = useCallback(
    (categories: string[]) => ({
      chart: { toolbar: { show: false }, height: 320, fontFamily: 'Poppins, Arial, sans-serif' },
      plotOptions: { bar: { horizontal: true, barHeight: '50%', borderRadius: 4 } },
      dataLabels: { enabled: true, style: { fontSize: '12px' } },
      xaxis: { categories },
      yaxis: { labels: { style: { colors: '#64748b' } } },
      grid: { borderColor: '#f1f5f9', strokeDashArray: 3 },
      colors: [CHART_COLORS.teal],
    }),
    []
  )

  const donutOpts = useCallback(
    (labels: string[]) => ({
      chart: { height: 300 },
      labels,
      legend: { position: 'bottom' as const },
      colors: DONUT_PALETTE.slice(0, labels.length),
    }),
    []
  )

  const prevLabel = data?.previousPeriod?.periodLabel || ''

  return (
    <Fragment>
      <Seo title="ATS Analytics" />
      <div className="container mx-auto mt-5 w-full max-w-full sm:mt-6">
        {/* Header: Range selector + Export */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-[0.8125rem] text-defaulttextcolor/70">Period:</label>
            <select
              className="form-control !w-auto !py-1.5 !px-3 !text-[0.8125rem]"
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
              onClick={() => exportToCsv(data)}
            >
              <i className="ri-download-line align-middle me-1" />
              Export CSV
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

            {/* ---- Row 1: Applications Over Time + Funnel ---- */}
            <div className="lg:col-span-6 col-span-12">
              <div className="box">
                <div className="box-header"><div className="box-title">Applications Over Time</div></div>
                <div className="box-body">
                  {applicationsOverTimeData.categories.length > 0 ? (
                    <ReactApexChart
                      type="line"
                      series={applicationsOverTimeData.series}
                      options={lineChartOpts(applicationsOverTimeData.categories)}
                      height={320} width="100%"
                    />
                  ) : (
                    <div className="flex items-center justify-center py-12 text-defaulttextcolor/60 text-sm">No data yet</div>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 col-span-12">
              <div className="box">
                <div className="box-header"><div className="box-title">Application Funnel</div></div>
                <div className="box-body">
                  {funnelData.categories.length > 0 ? (
                    <ReactApexChart
                      type="bar"
                      series={funnelData.series}
                      options={{
                        ...horizontalBarOpts(funnelData.categories),
                        chart: {
                          ...horizontalBarOpts(funnelData.categories).chart,
                          events: {
                            dataPointSelection: (_e: unknown, _chart: unknown, opts: { dataPointIndex: number }) => {
                              openDrill('applicationFunnel', funnelData.categories[opts.dataPointIndex])
                            },
                          },
                        },
                      }}
                      height={320} width="100%"
                    />
                  ) : (
                    <div className="flex items-center justify-center py-12 text-defaulttextcolor/60 text-sm">No data yet</div>
                  )}
                </div>
              </div>
            </div>

            {/* ---- Row 2: Job Status Donut + Application Status Donut ---- */}
            <div className="lg:col-span-6 col-span-12">
              <div className="box">
                <div className="box-header"><div className="box-title">Job Status Breakdown</div></div>
                <div className="box-body">
                  {jobStatusData.series.length > 0 ? (
                    <ReactApexChart
                      type="donut"
                      series={jobStatusData.series}
                      options={{
                        ...donutOpts(jobStatusData.labels),
                        chart: {
                          height: 300,
                          events: {
                            dataPointSelection: (_e: unknown, _chart: unknown, opts: { dataPointIndex: number }) => {
                              openDrill('jobStatus', jobStatusData.labels[opts.dataPointIndex])
                            },
                          },
                        },
                      }}
                      height={300} width="100%"
                    />
                  ) : (
                    <div className="flex items-center justify-center py-12 text-defaulttextcolor/60 text-sm">No data yet</div>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 col-span-12">
              <div className="box">
                <div className="box-header"><div className="box-title">Application Status Breakdown</div></div>
                <div className="box-body">
                  {appStatusData.series.length > 0 ? (
                    <ReactApexChart
                      type="donut"
                      series={appStatusData.series}
                      options={{
                        ...donutOpts(appStatusData.labels),
                        chart: {
                          height: 300,
                          events: {
                            dataPointSelection: (_e: unknown, _chart: unknown, opts: { dataPointIndex: number }) => {
                              openDrill('applicationStatus', appStatusData.labels[opts.dataPointIndex])
                            },
                          },
                        },
                      }}
                      height={300} width="100%"
                    />
                  ) : (
                    <div className="flex items-center justify-center py-12 text-defaulttextcolor/60 text-sm">No data yet</div>
                  )}
                </div>
              </div>
            </div>

            {/* ---- Row 3: Job Type Distribution + Jobs Created Over Time ---- */}
            <div className="lg:col-span-6 col-span-12">
              <div className="box">
                <div className="box-header"><div className="box-title">Job Type Distribution</div></div>
                <div className="box-body">
                  {jobTypeData.categories.length > 0 ? (
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
                      height={320} width="100%"
                    />
                  ) : (
                    <div className="flex items-center justify-center py-12 text-defaulttextcolor/60 text-sm">No data yet</div>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 col-span-12">
              <div className="box">
                <div className="box-header"><div className="box-title">Jobs Created Over Time</div></div>
                <div className="box-body">
                  {jobsOverTimeData.categories.length > 0 ? (
                    <ReactApexChart
                      type="line"
                      series={jobsOverTimeData.series}
                      options={lineChartOpts(jobsOverTimeData.categories)}
                      height={320} width="100%"
                    />
                  ) : (
                    <div className="flex items-center justify-center py-12 text-defaulttextcolor/60 text-sm">No data yet</div>
                  )}
                </div>
              </div>
            </div>

            {/* ---- Row 4: Recruiter Activity Bar + Leaderboard Table ---- */}
            <div className="lg:col-span-6 col-span-12">
              <div className="box">
                <div className="box-header"><div className="box-title">Recruiter Activity by Type</div></div>
                <div className="box-body">
                  {recruiterActivityBarData.categories.length > 0 ? (
                    <ReactApexChart
                      type="bar"
                      series={recruiterActivityBarData.series}
                      options={barChartOpts(recruiterActivityBarData.categories, CHART_COLORS.purple)}
                      height={320} width="100%"
                    />
                  ) : (
                    <div className="flex items-center justify-center py-12 text-defaulttextcolor/60 text-sm">No activity data</div>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 col-span-12">
              <div className="box">
                <div className="box-header"><div className="box-title">Recruiter Leaderboard</div></div>
                <div className="box-body">
                  {data.recruiterActivitySummary?.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table table-bordered table-hover min-w-full text-[0.8125rem]">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-white/5">
                            <th className="!text-start">Recruiter</th>
                            <th className="!text-end">Total Activities</th>
                            <th className="!text-end">Jobs Posted</th>
                            <th className="!text-end">Screened</th>
                            <th className="!text-end">Interviews</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.recruiterActivitySummary.slice(0, 10).map((r, idx) => {
                            const actMap = new Map(r.activities.map((a) => [a.activityType, a.count]))
                            return (
                              <tr key={r.recruiter?.id || idx}>
                                <td>{r.recruiter?.name || '—'}</td>
                                <td className="text-end">{r.totalActivities}</td>
                                <td className="text-end">{actMap.get('job_posting_created') || 0}</td>
                                <td className="text-end">{actMap.get('candidate_screened') || 0}</td>
                                <td className="text-end">{actMap.get('interview_scheduled') || 0}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-12 text-defaulttextcolor/60 text-sm">No recruiter data</div>
                  )}
                </div>
              </div>
            </div>

            {/* ---- Row 5: Top Jobs by Applications ---- */}
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
