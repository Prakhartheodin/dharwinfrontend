"use client"

import Pageheader from '@/shared/layout-components/page-header/pageheader'
import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment, useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  getTrainingAnalytics,
  type TrainingAnalyticsResponse,
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

  const barChartStudentsModule = useMemo(() => {
    if (!data?.enrollmentsByModule?.length)
      return { series: [{ name: 'Enrolled', data: [] }], categories: [] }
    return {
      series: [{ name: 'Enrolled', data: data.enrollmentsByModule.map((m) => m.enrolledCount) }],
      categories: data.enrollmentsByModule.map((m) => m.moduleName),
    }
  }, [data?.enrollmentsByModule])

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

  const barChartOptions = useMemo(
    () => ({
      chart: {
        toolbar: { show: false },
        height: 320,
        fontFamily: 'Poppins, Arial, sans-serif',
      },
      plotOptions: { bar: { columnWidth: '50%', borderRadius: 4 } },
      dataLabels: { enabled: false },
      xaxis: { categories: barChartStudentsModule.categories },
      yaxis: { labels: { style: { colors: '#64748b' } } },
      grid: { borderColor: '#f1f5f9', strokeDashArray: 3 },
      colors: ['#6366f1'],
    }),
    [barChartStudentsModule.categories]
  )

  const configurableChartOptions = useMemo(
    () => ({
      chart: {
        toolbar: { show: false },
        height: 320,
        fontFamily: 'Poppins, Arial, sans-serif',
      },
      stroke: { curve: 'smooth' as const, width: 2 },
      plotOptions: configurableChartData.type === 'bar' ? { bar: { columnWidth: '50%', borderRadius: 4 } } : {},
      dataLabels: { enabled: false },
      xaxis: { categories: configurableChartData.categories },
      yaxis: { labels: { style: { colors: '#64748b' } } },
      grid: { borderColor: '#f1f5f9', strokeDashArray: 3 },
      colors: ['#0d9488'],
    }),
    [configurableChartData.categories, configurableChartData.type]
  )

  return (
    <Fragment>
      <Seo title="Training Analytics" />
      <Pageheader
        currentpage="Analytics"
        activepage="Training Management"
        mainpage="Analytics"
      />

      <div className="container w-full max-w-full mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-[0.8125rem] text-defaulttextcolor/70">Period:</label>
            <select
              className="form-control !w-auto !py-1.5 !px-3 !text-[0.8125rem]"
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

            {/* Enrollment status + Students enrolled in modules (same row) */}
            {data.statusBreakdown && (
              <div className="lg:col-span-6 col-span-12">
                <div className="box">
                  <div className="box-header">
                    <div className="box-title">Enrollment status</div>
                  </div>
                  <div className="box-body">
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-[1.25rem] font-semibold text-defaulttextcolor/70">{data.statusBreakdown.enrolled ?? 0}</p>
                        <p className="text-[0.75rem] text-defaulttextcolor/60">Enrolled</p>
                      </div>
                      <div>
                        <p className="text-[1.25rem] font-semibold text-primary">{data.statusBreakdown.inProgress ?? 0}</p>
                        <p className="text-[0.75rem] text-defaulttextcolor/60">In progress</p>
                      </div>
                      <div>
                        <p className="text-[1.25rem] font-semibold text-success">{data.statusBreakdown.completed ?? 0}</p>
                        <p className="text-[0.75rem] text-defaulttextcolor/60">Completed</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bar chart: Students enrolled in modules (full width when no status card) */}
            <div className={data.statusBreakdown ? 'lg:col-span-6 col-span-12' : 'col-span-12'}>
              <div className="box">
                <div className="box-header">
                  <div className="box-title">Students enrolled in modules</div>
                </div>
                <div className="box-body">
                  {barChartStudentsModule.categories.length > 0 ? (
                    <ReactApexChart
                      type="bar"
                      series={barChartStudentsModule.series}
                      options={barChartOptions}
                      height={320}
                      width="100%"
                    />
                  ) : (
                    <div className="flex items-center justify-center py-12 text-defaulttextcolor/60 text-sm">
                      No enrollment data yet
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Trends + Recent completions (same row) */}
            <div className="lg:col-span-6 col-span-12">
              <div className="box">
                <div className="box-header justify-between flex-wrap gap-2">
                  <div className="box-title">Trends</div>
                  <select
                    className="form-control !w-auto !py-1.5 !px-3 !text-[0.8125rem]"
                    value={configurableField}
                    onChange={(e) => setConfigurableField(e.target.value as ConfigurableChartField)}
                  >
                    {CONFIGURABLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="box-body">
                  {configurableChartData.categories.length > 0 ? (
                    <ReactApexChart
                      type={configurableChartData.type}
                      series={configurableChartData.series}
                      options={configurableChartOptions}
                      height={320}
                      width="100%"
                    />
                  ) : (
                    <div className="flex items-center justify-center py-12 text-defaulttextcolor/60 text-sm">
                      No data for this selection
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 col-span-12">
              <div className="box">
                <div className="box-header justify-between">
                  <div className="box-title">Recent completions</div>
                  <Link
                    href="/training/evaluation"
                    className="text-[0.75rem] text-primary hover:underline"
                  >
                    View all
                  </Link>
                </div>
                <div className="box-body">
                  {data.recentCompletions?.length > 0 ? (
                    <ul className="list-none mb-0">
                      {data.recentCompletions.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex items-start py-3 border-b border-defaultborder last:border-0 last:pb-0 first:pt-0"
                        >
                          <span className="avatar avatar-sm avatar-rounded font-semibold bg-primary/10 text-primary me-3 shrink-0">
                            {item.studentName?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                          <div className="min-w-0 flex-1">
                            <span className="font-medium block">{item.studentName}</span>
                            <span className="text-[0.75rem] text-defaulttextcolor/70">{item.courseName}</span>
                          </div>
                          <span className="text-[0.75rem] text-defaulttextcolor/70 shrink-0">
                            {item.completedAt
                              ? new Date(item.completedAt).toLocaleDateString()
                              : '—'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="py-8 text-center text-defaulttextcolor/60 text-sm">
                      No completions yet
                    </div>
                  )}
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
                    <ReactApexChart
                      type="bar"
                      series={[{ name: 'Completion %', data: data.completionByModule.map((m) => m.completionRate) }]}
                      options={{
                        chart: { toolbar: { show: false }, height: 280, fontFamily: 'Poppins, Arial, sans-serif' },
                        plotOptions: { bar: { columnWidth: '50%', borderRadius: 4 } },
                        dataLabels: { enabled: false },
                        xaxis: { categories: data.completionByModule.map((m) => m.moduleName) },
                        yaxis: { max: 100, labels: { style: { colors: '#64748b' } } },
                        grid: { borderColor: '#f1f5f9', strokeDashArray: 3 },
                        colors: ['#10b981'],
                      }}
                      height={280}
                      width="100%"
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
                    <ReactApexChart
                      type="bar"
                      series={[{ name: 'Avg score %', data: data.quizScoreByModule.map((m) => m.averageScore ?? 0) }]}
                      options={{
                        chart: { toolbar: { show: false }, height: 280, fontFamily: 'Poppins, Arial, sans-serif' },
                        plotOptions: { bar: { columnWidth: '50%', borderRadius: 4 } },
                        dataLabels: { enabled: false },
                        xaxis: { categories: data.quizScoreByModule.map((m) => m.moduleName) },
                        yaxis: { max: 100, labels: { style: { colors: '#64748b' } } },
                        grid: { borderColor: '#f1f5f9', strokeDashArray: 3 },
                        colors: ['#8b5cf6'],
                      }}
                      height={280}
                      width="100%"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Enrollments by category + Mentor workload (same row) */}
            {data.enrollmentsByCategory && data.enrollmentsByCategory.length > 0 && (
              <div className="lg:col-span-6 col-span-12">
                <div className="box">
                  <div className="box-header">
                    <div className="box-title">Enrollments by category</div>
                  </div>
                  <div className="box-body">
                    <ReactApexChart
                      type="donut"
                      series={data.enrollmentsByCategory.map((c) => c.count)}
                      options={{
                        chart: { height: 280 },
                        labels: data.enrollmentsByCategory.map((c) => c.categoryName),
                        legend: { position: 'bottom' },
                        colors: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
                      }}
                      height={280}
                      width="100%"
                    />
                  </div>
                </div>
              </div>
            )}

            {data.mentorWorkload && data.mentorWorkload.length > 0 && (
              <div className="lg:col-span-6 col-span-12">
                <div className="box">
                  <div className="box-header">
                    <div className="box-title">Mentor workload</div>
                  </div>
                  <div className="box-body">
                    <div className="table-responsive">
                      <table className="table table-bordered table-hover min-w-full text-[0.8125rem]">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-white/5">
                            <th className="!text-start">Mentor</th>
                            <th className="!text-end">Modules</th>
                            <th className="!text-end">Students</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.mentorWorkload.map((m) => (
                            <tr key={m.mentorId}>
                              <td>{m.mentorName}</td>
                              <td className="text-end">{m.moduleCount}</td>
                              <td className="text-end">{m.studentCount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Not started list – full width */}
            {data.notStartedList && data.notStartedList.length > 0 && (
              <div className="col-span-12">
                <div className="box">
                  <div className="box-header justify-between">
                    <div className="box-title">Not started (sample)</div>
                    <Link href="/training/evaluation" className="text-[0.75rem] text-primary hover:underline">
                      View all
                    </Link>
                  </div>
                  <div className="box-body">
                    <ul className="list-none mb-0">
                      {data.notStartedList.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex items-start py-2 border-b border-defaultborder last:border-0"
                        >
                          <span className="avatar avatar-sm avatar-rounded font-semibold bg-danger/10 text-danger me-2 shrink-0">
                            {item.studentName?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                          <div className="min-w-0 flex-1">
                            <span className="font-medium block text-[0.8125rem]">{item.studentName}</span>
                            <span className="text-[0.75rem] text-defaulttextcolor/70">{item.courseName}</span>
                          </div>
                          <span className="text-[0.75rem] text-defaulttextcolor/70 shrink-0">
                            {item.enrolledAt ? new Date(item.enrolledAt).toLocaleDateString() : '—'}
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
