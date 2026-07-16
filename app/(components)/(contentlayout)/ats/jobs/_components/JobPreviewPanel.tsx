"use client"
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { type JobApplication } from '@/shared/lib/api/jobApplications'
import { getJobStats, type JobStatsResponse } from '@/shared/lib/api/jobs'
import {
  formatJobDescriptionForDisplay,
  JOB_DESCRIPTION_PROSE_CLASS,
} from '@/shared/lib/ats/jobDescriptionHtml'
import {
  displayApplicantEmail,
  isPublicEmail,
  isInternalRelayEmail,
  pickPublicEmail,
  resolveApplicantEmail,
  dedupeApplicants,
} from '@/shared/lib/ats/applicant-email'

const FUNNEL_TONES: Record<string, string> = {
  Applied: 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300',
  Screening: 'bg-sky-500/10 text-sky-700 border-sky-500/20 dark:text-sky-300',
  Interview: 'bg-violet-500/10 text-violet-700 border-violet-500/20 dark:text-violet-300',
  Shortlisted: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20 dark:text-indigo-300',
  Offered: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300',
  Hired: 'bg-emerald-600/15 text-emerald-800 border-emerald-500/30 dark:text-emerald-200',
  Rejected: 'bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-300',
}

interface JobPreviewPanelProps {
  previewJob: any
  setPreviewJob: (job: any) => void
  bookmarkedJobs: Set<string>
  handleBookmark: (id: string, job?: any) => void
  getUrgencyBadge: (urgency: string) => { label: string; color: string }
  getJobTypeInfo: (job: any) => { icon: string; label: string; color: string }
  getSalaryTierBadge: (tier: string) => { label: string; color: string }
  setCompanyModal: (job: any) => void
  jobPreviewTab: 'details' | 'applicants'
  setJobPreviewTab: (tab: 'details' | 'applicants') => void
  previewJobApplications: JobApplication[]
  previewJobApplicationsLoading: boolean
  handleApplicationStatusChange: (applicationId: string, status: string) => Promise<void>
  statusUpdatingId: string | null
  handleInitiateCall: (job: any) => void
  callingJobId: string | null
  getOrganisationPhone: (job: any) => string
  handleApplyClick: (job: any) => void
}

const APPLICANT_SKELETON_ROW_COUNT = 4

/** Applicants tab: skeleton + staged motion (reduced-motion → static placeholders). */
function ApplicantsLoadingState() {
  return (
    <div
      className="rounded-xl border border-gray-200/90 bg-gradient-to-b from-slate-50/95 via-white to-primary/[0.04] p-4 shadow-inner dark:border-defaultborder/20 dark:from-black/35 dark:via-black/18 dark:to-primary/[0.06]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Loading applicants for this job</span>
      <div className="mb-4 flex flex-col items-center gap-1.5 text-center" aria-hidden>
        <div className="flex items-end justify-center gap-1.5 py-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="block h-2 w-2 rounded-full bg-primary/85 motion-safe:animate-[bounce_0.55s_ease-in-out_infinite] motion-reduce:animate-none motion-reduce:opacity-70"
              style={{ animationDelay: `${i * 140}ms` } as React.CSSProperties}
            />
          ))}
        </div>
        <p className="text-sm font-semibold text-primary">Syncing applications…</p>
        <p className="max-w-xs text-xs leading-relaxed text-gray-500 dark:text-gray-400">
          Pulling the latest applicant list for this role
        </p>
      </div>
      <div className="overflow-hidden rounded-lg border border-gray-100 dark:border-white/10" aria-hidden>
        <div className="grid grid-cols-[2.25rem_minmax(0,1.2fr)_minmax(0,1fr)_5.5rem_7rem] items-center gap-2 bg-gray-50/95 px-2.5 py-2 dark:bg-black/30">
          <div className="h-3 w-3 rounded-sm bg-gray-200 dark:bg-white/15" />
          <div className="h-2.5 rounded bg-gray-300/90 dark:bg-white/20 motion-safe:animate-pulse motion-reduce:animate-none" />
          <div className="h-2.5 rounded bg-gray-300/90 dark:bg-white/20 motion-safe:animate-pulse motion-reduce:animate-none motion-safe:[animation-delay:120ms]" />
          <div className="h-2.5 rounded bg-gray-200/80 dark:bg-white/12 motion-safe:animate-pulse motion-reduce:animate-none motion-safe:[animation-delay:200ms]" />
          <div className="h-2.5 rounded bg-gray-200/80 dark:bg-white/12 motion-safe:animate-pulse motion-reduce:animate-none motion-safe:[animation-delay:280ms]" />
        </div>
        {Array.from({ length: APPLICANT_SKELETON_ROW_COUNT }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-[2.25rem_minmax(0,1.2fr)_minmax(0,1fr)_5.5rem_7rem] items-center gap-2 border-t border-gray-100/90 bg-white/75 px-2.5 py-2.5 dark:border-white/5 dark:bg-white/[0.04]"
          >
            <div className="h-3.5 w-3.5 rounded border border-gray-200/90 bg-gray-100 dark:border-white/10 dark:bg-white/[0.08]" />
            <div
              className="h-3 self-center rounded-md bg-gray-200/90 dark:bg-white/15 motion-safe:animate-pulse motion-reduce:animate-none"
              style={{ animationDelay: `${i * 100}ms` } as React.CSSProperties}
            />
            <div
              className="h-3 self-center rounded-md bg-gray-200/75 dark:bg-white/12 motion-safe:animate-pulse motion-reduce:animate-none"
              style={{ animationDelay: `${i * 100 + 60}ms` } as React.CSSProperties}
            />
            <div className="h-6 self-center rounded-md bg-gray-100 dark:bg-white/10" />
            <div className="flex flex-wrap items-center justify-center gap-1">
              <div className="h-6 w-[4.75rem] rounded-md bg-primary/15 dark:bg-primary/25" />
              <div className="h-6 w-[3.35rem] rounded-md bg-gray-200/85 dark:bg-white/12" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const JobPreviewPanel: React.FC<JobPreviewPanelProps> = ({
  previewJob,
  setPreviewJob,
  bookmarkedJobs,
  handleBookmark,
  getUrgencyBadge,
  getJobTypeInfo,
  getSalaryTierBadge,
  setCompanyModal,
  jobPreviewTab,
  setJobPreviewTab,
  previewJobApplications,
  previewJobApplicationsLoading,
  handleApplicationStatusChange,
  statusUpdatingId,
  handleInitiateCall,
  callingJobId,
  getOrganisationPhone,
  handleApplyClick,
}) => {
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set())
  const [callingCandidates, setCallingCandidates] = useState<Set<string>>(new Set())
  const [jobStats, setJobStats] = useState<JobStatsResponse | null>(null)
  const [jobStatsLoading, setJobStatsLoading] = useState(false)

  // Defense-in-depth dedupe: backend dedupes server-side, but legacy responses or stale caches
  // can still surface multiple applications by the same applicant. Identity priority is
  // owner.id → user.id → candidate.id → public email.
  const uniqueApplications = React.useMemo(
    () => dedupeApplicants(previewJobApplications as any[]),
    [previewJobApplications]
  )

  // Reset selections when switching tabs or closing panel
  React.useEffect(() => {
    if (jobPreviewTab !== 'applicants' || !previewJob) {
      setSelectedCandidates(new Set())
    }
  }, [jobPreviewTab, previewJob])

  // Load per-job analytics drill when previewing
  useEffect(() => {
    const id = previewJob?.id
    if (!id) {
      setJobStats(null)
      return
    }
    let cancelled = false
    setJobStatsLoading(true)
    getJobStats(id)
      .then((res) => {
        if (!cancelled) setJobStats(res)
      })
      .catch(() => {
        if (!cancelled) setJobStats(null)
      })
      .finally(() => {
        if (!cancelled) setJobStatsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [previewJob?.id])

  const handleSelectCandidate = (candidateId: string) => {
    setSelectedCandidates(prev => {
      const newSet = new Set(prev)
      if (newSet.has(candidateId)) {
        newSet.delete(candidateId)
      } else {
        newSet.add(candidateId)
      }
      return newSet
    })
  }

  const getCandidateId = (cand: any): string => cand?._id || cand?.id || ''

  const handleSelectAllCandidates = () => {
    if (selectedCandidates.size === uniqueApplications.length) {
      setSelectedCandidates(new Set())
    } else {
      const allIds = uniqueApplications.map(app => getCandidateId(app.candidate)).filter(Boolean)
      setSelectedCandidates(new Set(allIds))
    }
  }

  /** Applicant verification → POST /bolna/candidate-call → BOLNA_CANDIDATE_AGENT_ID (not job-post agent). */
  const handleInitiateCandidateCall = async () => {
    if (selectedCandidates.size === 0) {
      alert('Please select at least one applicant to call')
      return
    }

    const isPlaceholder = (p: string) => {
      if (!p) return true
      const d = p.replace(/\D/g, '')
      if (!d.length || /^0+$/.test(d)) return true
      if (d.length >= 10 && /^(\d)\1+$/.test(d)) return true
      return false
    }

    const candidatesToCall = uniqueApplications.filter(app => {
      const cand = app.candidate as any
      const cId = getCandidateId(cand)
      return cId && selectedCandidates.has(cId) && cand?.phoneNumber && !isPlaceholder(cand.phoneNumber)
    })

    if (candidatesToCall.length === 0) {
      alert('Selected applicants do not have valid phone numbers. Update their profiles with real numbers first.')
      return
    }

    setCallingCandidates(new Set(selectedCandidates))

    try {
      const { initiateCandidateVerificationCall } = await import('@/shared/lib/api/bolna')
      
      for (const app of candidatesToCall) {
        const cand = app.candidate as any
        const cId = getCandidateId(cand)
        
        try {
          await initiateCandidateVerificationCall({
            candidateId: cId,
            candidateName: cand.fullName || 'Applicant',
            email: pickPublicEmail([cand.email]) ?? '',
            phoneNumber: cand.phoneNumber || '',
            countryCode: cand.countryCode || '',
            jobId: previewJob.id,
            jobTitle: previewJob.jobTitle,
            companyName: previewJob.company,
          })
          console.log(`Call initiated for ${cand.fullName}`)
        } catch (err) {
          console.error(`Failed to call ${cand.fullName}:`, err)
        }
      }

      alert(`Applicant verification call(s) started for ${candidatesToCall.length} applicant(s).`)
      setSelectedCandidates(new Set())
    } catch (error) {
      console.error('Error initiating calls:', error)
      alert('Failed to initiate calls. Please try again.')
    } finally {
      setCallingCandidates(new Set())
    }
  }

  return (
      <div
        id="job-preview-panel"
        className="hs-overlay hidden ti-offcanvas ti-offcanvas-right !z-[105] !w-full sm:!w-auto sm:!max-w-[40rem] md:!max-w-[50rem] lg:!max-w-[60rem]"
        tabIndex={-1}
      >
        <div className="ti-offcanvas-header bg-gray-50 dark:bg-black/20 !py-2.5">
          <h6 className="ti-offcanvas-title text-base font-semibold flex items-center gap-2">
            <i className="ri-briefcase-line text-primary text-base"></i>
            {previewJob?.jobTitle || 'Job Preview'}
          </h6>
          <button 
            type="button" 
            className="hs-dropdown-toggle ti-btn flex-shrink-0 p-0 transition-none text-gray-500 hover:text-gray-700 focus:ring-gray-400 focus:ring-offset-white dark:text-[#8c9097] dark:text-white/50 dark:hover:text-white/80 dark:focus:ring-white/10 dark:focus:ring-offset-white/10 hover:bg-gray-100 dark:hover:bg-black/40 rounded-md p-1" 
            data-hs-overlay="#job-preview-panel"
            onClick={() => setPreviewJob(null)}
          >
            <span className="sr-only">Close</span>
            <svg className="w-3.5 h-3.5" width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0.258206 1.00652C0.351976 0.912791 0.479126 0.860131 0.611706 0.860131C0.744296 0.860131 0.871447 0.912791 0.965207 1.00652L3.61171 3.65302L6.25822 1.00652C6.30432 0.958771 6.35952 0.920671 6.42052 0.894471C6.48152 0.868271 6.54712 0.854471 6.61352 0.853901C6.67992 0.853321 6.74572 0.865971 6.80722 0.891111C6.86862 0.916251 6.92442 0.953381 6.97142 1.00032C7.01832 1.04727 7.05552 1.1031 7.08062 1.16454C7.10572 1.22599 7.11842 1.29183 7.11782 1.35822C7.11722 1.42461 7.10342 1.49022 7.07722 1.55122C7.05102 1.61222 7.01292 1.6674 6.96522 1.71352L4.31871 4.36002L6.96522 7.00648C7.05632 7.10078 7.10672 7.22708 7.10552 7.35818C7.10442 7.48928 7.05182 7.61468 6.95912 7.70738C6.86642 7.80018 6.74102 7.85268 6.60992 7.85388C6.47882 7.85498 6.35252 7.80458 6.25822 7.71348L3.61171 5.06702L0.965207 7.71348C0.870907 7.80458 0.744606 7.85498 0.613506 7.85388C0.482406 7.85268 0.357007 7.80018 0.264297 7.70738C0.171597 7.61468 0.119017 7.48928 0.117877 7.35818C0.116737 7.22708 0.167126 7.10078 0.258206 7.00648L2.90471 4.36002L0.258206 1.71352C0.164476 1.61976 0.111816 1.4926 0.111816 1.36002C0.111816 1.22744 0.164476 1.10028 0.258206 1.00652Z" fill="currentColor"/>
            </svg>
          </button>
        </div>
        <div className="ti-offcanvas-body !p-4">
                {previewJob ? (
                <div className="space-y-4">
                  {/* Job Header Info */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                    <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
                      <span className={`badge ${getUrgencyBadge(previewJob.urgency || 'medium').color} text-white`}>
                        {getUrgencyBadge(previewJob.urgency || 'medium').label}
                      </span>
                      {(() => {
                        const jobTypeInfo = getJobTypeInfo(previewJob)
                        return (
                          <span className={`badge bg-primary/10 text-primary ${jobTypeInfo.color}`}>
                            <i className={`${jobTypeInfo.icon} me-1`}></i>
                            {jobTypeInfo.label}
                          </span>
                        )
                      })()}
                      {previewJob.jobOrigin === 'external' && (
                        <span className="badge bg-info/10 text-info border border-info/30">
                          <i className="ri-external-link-line me-1"></i>External listing
                        </span>
                      )}
                      {previewJob.isRemote && (
                        <span className="badge bg-success/10 text-success border border-success/30">
                          <i className="ri-home-line me-1"></i>Remote
                        </span>
                      )}
                      <span className={`badge ${getSalaryTierBadge(previewJob.salaryTier || 'medium').color} text-white`}>
                        {getSalaryTierBadge(previewJob.salaryTier || 'medium').label}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleBookmark(previewJob.id, previewJob)}
                      className={`ti-btn ti-btn-sm flex-shrink-0 self-start sm:self-center min-w-[9rem] whitespace-nowrap px-3 py-1.5 inline-flex items-center justify-center ${bookmarkedJobs.has(previewJob.id) ? 'ti-btn-warning' : 'ti-btn-light'}`}
                    >
                      <i className={`${bookmarkedJobs.has(previewJob.id) ? 'ri-bookmark-fill' : 'ri-bookmark-line'} flex-shrink-0 me-1.5`}></i>
                      <span>{bookmarkedJobs.has(previewJob.id) ? 'View Notes' : 'Bookmark'}</span>
                    </button>
                  </div>

                  {/* Tabs */}
                  <div className="border-b border-gray-200 dark:border-defaultborder/10 mb-4">
                    <nav className="-mb-px flex space-x-2 sm:space-x-4 overflow-x-auto">
                      {[
                        { id: 'details' as const, label: 'Job Details', icon: 'ri-briefcase-line' },
                        { id: 'applicants' as const, label: 'Applicants', icon: 'ri-user-add-line' },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setJobPreviewTab(tab.id)}
                          className={`py-2 px-1 sm:px-2 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex-shrink-0 flex items-center gap-1 ${
                            jobPreviewTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                          }`}
                        >
                          <i className={tab.icon}></i>
                          {tab.label}
                          {tab.id === 'applicants' && (
                            <span className="badge bg-primary/10 text-primary !rounded-full text-[0.65rem] px-1.5">{uniqueApplications.length}</span>
                          )}
                        </button>
                      ))}
                    </nav>
                  </div>

                  {/* Tab content: Job Details */}
                  {jobPreviewTab === 'details' && (
                  <div className="space-y-4">
                  {/* Per-job analytics card */}
                  <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-defaultborder/10 dark:bg-black/30">
                    <div className="mb-3 flex items-center justify-between">
                      <h6 className="text-sm font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                        <i className="ri-bar-chart-2-line text-primary"></i>
                        Job analytics
                      </h6>
                      {jobStats && (
                        <span className="text-[0.65rem] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Conversion: <span className="font-semibold text-emerald-600 dark:text-emerald-300">{jobStats.conversionRate}%</span>
                        </span>
                      )}
                    </div>
                    {jobStatsLoading ? (
                      <div className="py-4 text-center text-xs text-gray-500">Loading analytics…</div>
                    ) : !jobStats ? (
                      <div className="py-3 text-center text-xs text-gray-400">No analytics available</div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 mb-3">
                          <div className="rounded border border-gray-200 dark:border-defaultborder/10 p-2">
                            <div className="text-[0.65rem] uppercase tracking-wide text-gray-500">Applications</div>
                            <div className="text-lg font-bold text-gray-800 dark:text-white">{jobStats.totalApplications}</div>
                          </div>
                          <div className="rounded border border-gray-200 dark:border-defaultborder/10 p-2">
                            <div className="text-[0.65rem] uppercase tracking-wide text-gray-500">Hired</div>
                            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-300">
                              {jobStats.funnel.find((f) => f.status === 'Hired')?.count ?? 0}
                            </div>
                          </div>
                          <div className="rounded border border-gray-200 dark:border-defaultborder/10 p-2">
                            <div className="text-[0.65rem] uppercase tracking-wide text-gray-500">Status</div>
                            <div className="text-sm font-semibold text-gray-800 dark:text-white">{jobStats.jobStatus}</div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {jobStats.funnel.map((row) => (
                            <span
                              key={row.status}
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.7rem] font-medium ${FUNNEL_TONES[row.status] || ''}`}
                              title={`${row.status}: ${row.count}`}
                            >
                              {row.status}
                              <span className="rounded bg-white/40 px-1 text-[0.65rem] font-bold dark:bg-black/30">{row.count}</span>
                            </span>
                          ))}
                        </div>
                        {jobStats.recentApplications.length > 0 && (
                          <div className="mt-3 border-t border-gray-100 pt-3 dark:border-defaultborder/10">
                            <div className="mb-1.5 text-[0.65rem] uppercase tracking-wide text-gray-500">Recent applications</div>
                            <ul className="space-y-1 text-xs">
                              {jobStats.recentApplications.slice(0, 5).map((app) => (
                                <li key={app.id} className="flex items-center justify-between gap-2">
                                  <span className="truncate text-gray-700 dark:text-gray-300">
                                    {app.candidateName || (isPublicEmail(app.candidateEmail) ? app.candidateEmail : '—')}
                                  </span>
                                  <span className="flex items-center gap-2 flex-shrink-0">
                                    <span className={`rounded px-1.5 py-0.5 text-[0.65rem] ${FUNNEL_TONES[app.status] || 'bg-gray-200 text-gray-700'}`}>
                                      {app.status}
                                    </span>
                                    <span className="text-gray-400">
                                      {new Date(app.appliedAt).toLocaleDateString()}
                                    </span>
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Key Details Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-black/20 rounded-lg">
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Company</div>
                      <span 
                        className="font-semibold text-gray-800 dark:text-white cursor-pointer hover:text-primary"
                        onClick={() => {
                          setCompanyModal(previewJob)
                          ;(window as any).HSOverlay?.close(document.querySelector('#job-preview-panel'))
                          setPreviewJob(null)
                          setTimeout(() => {
                            ;(window as any).HSOverlay?.open(document.querySelector('#company-info-panel'))
                          }, 50)
                        }}
                      >
                        {previewJob.company}
                      </span>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Location</div>
                      <div className="font-semibold text-gray-800 dark:text-white">{previewJob.location}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Experience</div>
                      <div className="font-semibold text-gray-800 dark:text-white">{previewJob.experience}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Salary</div>
                      <div className="font-semibold text-gray-800 dark:text-white">{previewJob.salary}</div>
                    </div>
                    {previewJob.vacancies != null && previewJob.vacancies > 0 && (
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Vacancies</div>
                        <div className="font-semibold text-gray-800 dark:text-white">
                          <i className="ri-team-line me-1 text-primary"></i>
                          {previewJob.vacancies}
                        </div>
                      </div>
                    )}
                    {(previewJob.postedBy || previewJob.postedByEmail) && (
                      <div className="col-span-2 md:col-span-1">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Posted By</div>
                        <div className="font-semibold text-gray-800 dark:text-white truncate" title={previewJob.postedBy || previewJob.postedByEmail}>
                          {previewJob.postedBy || previewJob.postedByEmail}
                        </div>
                        {previewJob.postedBy && previewJob.postedByEmail && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate" title={previewJob.postedByEmail}>
                            {previewJob.postedByEmail}
                          </div>
                        )}
                      </div>
                    )}
                    {previewJob.postingDate && (() => {
                      const d = new Date(previewJob.postingDate);
                      if (Number.isNaN(d.getTime())) return null;
                      const formatted = d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
                      const diffDays = Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000));
                      let relative = '';
                      if (diffDays === 0) relative = 'Today';
                      else if (diffDays === 1) relative = 'Yesterday';
                      else if (diffDays > 1 && diffDays < 30) relative = `${diffDays}d ago`;
                      else if (diffDays >= 30 && diffDays < 365) relative = `${Math.floor(diffDays / 30)}mo ago`;
                      else if (diffDays >= 365) relative = `${Math.floor(diffDays / 365)}y ago`;
                      return (
                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Posted Date</div>
                          <div className="font-semibold text-gray-800 dark:text-white">{formatted}</div>
                          {relative && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">{relative}</div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Company Information — sourced from job.organisation
                      via the create/edit forms. `companySize` is the canonical
                      backend field; we still read `size` as a legacy fallback
                      for any pre-migration documents. */}
                  {previewJob.companyInfo && (() => {
                    const ci: Record<string, unknown> = previewJob.companyInfo as Record<string, unknown>
                    const industry = (ci.industry as string) || ''
                    const founded = ci.founded != null ? String(ci.founded) : ''
                    const size = (ci.companySize as string) || (ci.size as string) || ''
                    const website = (ci.website as string) || ''
                    if (!industry && !founded && !size && !website) return null
                    return (
                      <div className="p-4 border border-gray-200 dark:border-defaultborder/10 rounded-lg">
                        <h6 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                          <i className="ri-building-line text-primary"></i>
                          Company Information
                        </h6>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {industry && (
                            <div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Industry</div>
                              <div className="font-medium text-gray-800 dark:text-white">{industry}</div>
                            </div>
                          )}
                          {size && (
                            <div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Company Size</div>
                              <div className="font-medium text-gray-800 dark:text-white">{size} employees</div>
                            </div>
                          )}
                          {founded && (
                            <div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Founded</div>
                              <div className="font-medium text-gray-800 dark:text-white">{founded}</div>
                            </div>
                          )}
                          {website && (
                            <div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Website</div>
                              <a
                                href={/^https?:\/\//i.test(website) ? website : `https://${website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-primary hover:underline"
                              >
                                {website}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })()}

                  {/* Job Description */}
                  {previewJob.description && (
                    <div>
                      <h6 className="font-semibold text-gray-800 dark:text-white mb-3">Job Description</h6>
                      <div
                        className={JOB_DESCRIPTION_PROSE_CLASS}
                        dangerouslySetInnerHTML={{
                          __html: formatJobDescriptionForDisplay(previewJob.description),
                        }}
                      />
                    </div>
                  )}

                  {/* Additional Info */}
                  <div className="pt-4 border-t border-gray-200 dark:border-defaultborder/10">
                    <div className="text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Posted Date: </span>
                      <span className="font-medium text-gray-800 dark:text-white">
                        {previewJob.postingDate
                          ? (() => {
                              try {
                                const d = new Date(previewJob.postingDate)
                                return isNaN(d.getTime()) ? previewJob.postingDate : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                              } catch {
                                return previewJob.postingDate
                              }
                            })()
                          : '—'}
                      </span>
                    </div>
                  </div>
                  </div>
                  )}

                  {/* Tab content: Applicants */}
                  {jobPreviewTab === 'applicants' && (
                  <div className="pt-2">
                    <h6 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                      <i className="ri-user-add-line text-primary"></i>
                      Applied ({uniqueApplications.length})
                      {selectedCandidates.size > 0 && (
                        <span className="text-sm font-normal text-gray-500">
                          ({selectedCandidates.size} selected)
                        </span>
                      )}
                    </h6>
                    {previewJobApplicationsLoading ? (
                      <div className="py-1">
                        <ApplicantsLoadingState />
                      </div>
                    ) : uniqueApplications.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400 py-2">No applicants yet.</p>
                    ) : (
                      <div className="table-responsive max-h-[14rem] overflow-y-auto rounded-lg border border-gray-200 dark:border-defaultborder/10">
                        <table className="table table-hover table-sm mb-0 text-[0.8125rem] min-w-full whitespace-nowrap">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-black/20">
                              <th className="!py-2 !px-3 w-12">
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  checked={selectedCandidates.size === uniqueApplications.length && uniqueApplications.length > 0}
                                  onChange={handleSelectAllCandidates}
                                />
                              </th>
                              <th className="!py-2 !px-3">Applicant</th>
                              <th className="!py-2 !px-3">Email</th>
                              <th className="!py-2 !px-3 w-28">Status</th>
                              <th className="!py-2 !px-3 text-center min-w-[12rem]">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {uniqueApplications.map((app) => {
                              const cand = app.candidate as any
                              const appId = app._id ?? app.id
                              const candidateId = getCandidateId(cand)
                              const isSynthetic = isInternalRelayEmail(cand?.email)
                              return (
                                <tr key={appId} className={selectedCandidates.has(candidateId) ? 'bg-primary/5' : ''}>
                                  <td className="!py-2 !px-3">
                                    <input
                                      type="checkbox"
                                      className="form-check-input"
                                      checked={selectedCandidates.has(candidateId)}
                                      onChange={() => handleSelectCandidate(candidateId)}
                                      disabled={!cand?.phoneNumber || isSynthetic}
                                      title={isSynthetic ? 'Internal offer-letter placeholder — not a real applicant' : (!cand?.phoneNumber ? 'No phone number available' : '')}
                                    />
                                  </td>
                                  <td className="font-medium !py-2 !px-3">
                                    {isSynthetic
                                      ? (cand?.fullName ? `${cand.fullName} (Internal Applicant)` : 'Internal Applicant')
                                      : (cand?.fullName || (app as any)?.applicantUser?.name || 'Unknown Applicant')}
                                    {!cand?.phoneNumber && !isSynthetic && (
                                      <i className="ri-phone-line text-gray-400 ml-1" title="No phone number"></i>
                                    )}
                                  </td>
                                  <td className="!py-2 !px-3">
                                    {isSynthetic
                                      ? <span className="text-gray-400 italic">Internal placeholder</span>
                                      : resolveApplicantEmail({ candidate: cand, application: app as any, applicantUser: (app as any)?.applicantUser })}
                                  </td>
                                  <td className="!py-2 !px-3">
                                    <select
                                      className="form-select form-select-sm !py-1 !text-[0.75rem] w-full min-w-0 max-w-[7rem]"
                                      value={app.status}
                                      disabled={statusUpdatingId === appId}
                                      onChange={(e) => handleApplicationStatusChange(appId, e.target.value)}
                                    >
                                      <option value="Applied">Applied</option>
                                      <option value="Screening">Screening</option>
                                      <option value="Interview">Interview</option>
                                      <option value="Offered">Offered</option>
                                      <option value="Hired">Hired</option>
                                      <option value="Rejected">Rejected</option>
                                    </select>
                                  </td>
                                  <td className="!py-2 !px-3 text-center overflow-visible">
                                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                                      <Link
                                        href={(() => {
                                          const params = new URLSearchParams()
                                          params.set('openSchedule', '1')
                                          if (appId) params.set('applicationId', String(appId))
                                          if (candidateId) params.set('candidateId', String(candidateId))
                                          if (previewJob.id) params.set('jobId', String(previewJob.id))
                                          return `/ats/interviews?${params.toString()}`
                                        })()}
                                        className="ti-btn ti-btn-sm ti-btn-primary inline-flex items-center justify-center !py-1 !px-2.5 !text-[0.75rem] whitespace-nowrap min-w-[8.5rem] overflow-visible"
                                      >
                                        Schedule Interview
                                      </Link>
                                      {candidateId && (
                                        <Link
                                          href={`/ats/employees/edit/?id=${candidateId}`}
                                          className="ti-btn ti-btn-sm ti-btn-light inline-flex items-center justify-center !py-1 !px-2.5 !text-[0.75rem] whitespace-nowrap min-w-[5.5rem] overflow-visible"
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          View Profile
                                        </Link>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                  )}

                  {/* Action Buttons */}
                  {previewJob && (
                    <div className="pt-4 border-t border-gray-200 dark:border-defaultborder/10 flex flex-wrap gap-2 sm:gap-3">
                      <button 
                        type="button" 
                        className="hs-dropdown-toggle ti-btn ti-btn-light flex-1 min-w-0 overflow-hidden whitespace-nowrap px-4"
                        data-hs-overlay="#job-preview-panel"
                        onClick={() => setPreviewJob(null)}
                      >
                        Close
                      </button>
                      {jobPreviewTab === 'applicants' ? (
                        <button
                          type="button"
                          className="ti-btn ti-btn-success flex-1 min-w-0 overflow-hidden whitespace-nowrap px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={handleInitiateCandidateCall}
                          disabled={
                            previewJobApplicationsLoading ||
                            selectedCandidates.size === 0 ||
                            callingCandidates.size > 0
                          }
                          title="Applicant verification: uses the employee Bolna agent (not job-post verification)"
                          aria-label="Call selected applicants for application verification"
                        >
                          {callingCandidates.size > 0 ? (
                            <span className="inline-flex items-center justify-center gap-2">
                              <span
                                className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none motion-reduce:rounded-sm motion-reduce:border-0 motion-reduce:bg-current/30"
                                aria-hidden
                              />
                              Calling…
                            </span>
                          ) : (
                            `Call Selected (${selectedCandidates.size})`
                          )}
                        </button>
                      ) : previewJob.jobOrigin !== 'external' ? (
                        <button
                          type="button"
                          className="ti-btn ti-btn-primary flex-1 min-w-0 overflow-hidden whitespace-nowrap px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => previewJob && handleInitiateCall(previewJob)}
                          disabled={!getOrganisationPhone(previewJob) || callingJobId === previewJob.id}
                          title="Job posting verification: call organisation (recruiter Bolna agent)"
                          aria-label="Initiate job posting verification call to organisation"
                        >
                          {callingJobId === previewJob.id ? 'Calling...' : 'Initiate Call'}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="ti-btn ti-btn-primary flex-1 min-w-0 overflow-hidden whitespace-nowrap px-4"
                        onClick={() => previewJob && handleApplyClick(previewJob)}
                      >
                        Apply Now
                      </button>
                    </div>
                  )}
                </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">No job selected</div>
                )}
        </div>
      </div>
  )
}

export default JobPreviewPanel
