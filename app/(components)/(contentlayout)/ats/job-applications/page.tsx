"use client"

import Pageheader from '@/shared/layout-components/page-header/pageheader'
import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment, useState, useEffect } from 'react'
import Link from 'next/link'
import { listJobApplications, updateJobApplicationStatus } from '@/shared/lib/api/jobApplications'
import type { JobApplication, JobApplicationStatus } from '@/shared/lib/api/jobApplications'
import { listJobs } from '@/shared/lib/api/jobs'
import { useFeaturePermissions } from '@/shared/hooks/use-feature-permissions'

const STATUS_OPTIONS: JobApplicationStatus[] = ['Applied', 'Screening', 'Interview', 'Offered', 'Hired', 'Rejected']

const isValidMongoId = (id: unknown): id is string =>
  typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id)

const getApplicationId = (app: JobApplication): string | null => {
  const raw = (app as { _id?: string; id?: string })._id ?? (app as { id?: string }).id
  const id = typeof raw === 'string' ? raw : raw != null ? String(raw) : null
  return id && isValidMongoId(id) ? id : null
}

const JobApplications = () => {
  const { canView, canEdit } = useFeaturePermissions('ats.candidates')
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [jobs, setJobs] = useState<{ _id: string; title?: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<JobApplicationStatus | ''>('')
  const [jobFilter, setJobFilter] = useState('')
  const [editModal, setEditModal] = useState<JobApplication | null>(null)
  const [editStatus, setEditStatus] = useState<JobApplicationStatus>('Applied')
  const [editNotes, setEditNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchData = () => {
    setLoading(true)
    setError(null)
    Promise.all([
      listJobApplications({
        status: statusFilter || undefined,
        jobId: jobFilter || undefined,
        limit: 200,
        page: 1,
      }),
      listJobs({ limit: 500 }),
    ])
      .then(([appRes, jobsRes]) => {
        setApplications(appRes.results ?? [])
        setJobs(jobsRes.results ?? [])
      })
      .catch((err) => setError(err?.response?.data?.message || err?.message || 'Failed to load'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (canView) fetchData()
  }, [canView, statusFilter, jobFilter])

  const openEdit = (app: JobApplication) => {
    setEditModal(app)
    setEditStatus(app.status)
    setEditNotes(app.notes ?? '')
  }

  const handleSaveStatus = async () => {
    if (!editModal) return
    const applicationId = getApplicationId(editModal)
    if (!applicationId) {
      alert('Invalid application ID')
      return
    }
    setSubmitting(true)
    try {
      const updated = await updateJobApplicationStatus(applicationId, {
        status: editStatus,
        notes: editNotes || undefined,
      })
      const updatedId = (updated as { _id?: string; id?: string })._id ?? (updated as { id?: string }).id
      setApplications((prev) => prev.map((a) => (getApplicationId(a) === updatedId ? updated : a)))
      setEditModal(null)
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to update')
    } finally {
      setSubmitting(false)
    }
  }

  if (!canView) {
    return (
      <Fragment>
        <Seo title="Job Applications" />
        <Pageheader currentpage="Job Applications" activepage="ATS" mainpage="Job Applications" />
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 p-6 rounded-lg border border-danger/20 bg-danger/5 text-danger">
            You do not have permission to view Job Applications.
          </div>
        </div>
      </Fragment>
    )
  }

  return (
    <Fragment>
      <Seo title="Job Applications" />
      <Pageheader currentpage="Job Applications" activepage="ATS" mainpage="Job Applications" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <div className="box">
            <div className="box-header flex flex-wrap items-center justify-between gap-2 overflow-visible">
              <h5 className="box-title min-w-0 flex-1 truncate">Applications (Screening pipeline)</h5>
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <select
                  className="form-control form-control-sm !w-[7rem] shrink-0"
                  value={jobFilter}
                  onChange={(e) => setJobFilter(e.target.value)}
                >
                  <option value="">All jobs</option>
                  {jobs.map((j) => (
                    <option key={j._id} value={j._id}>{j.title || j._id}</option>
                  ))}
                </select>
                <select
                  className="form-control form-control-sm !w-[7rem] shrink-0"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter((e.target.value as JobApplicationStatus) || '')}
                >
                  <option value="">All statuses</option>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <Link
                  href="/ats/offers-placement/create"
                  className="ti-btn ti-btn-sm ti-btn-primary shrink-0 whitespace-nowrap !w-auto !min-w-fit !h-8 !py-1.5 !px-3"
                >
                  <i className="ri-add-line me-1"></i>Create Offer
                </Link>
                <button
                  type="button"
                  className="ti-btn ti-btn-sm ti-btn-secondary shrink-0 whitespace-nowrap !w-auto !min-w-fit !h-8 !py-1.5 !px-3"
                  onClick={fetchData}
                >
                  <i className="ri-refresh-line me-1"></i>Refresh
                </button>
              </div>
            </div>
            <div className="box-body overflow-x-auto">
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
                  <span className="ml-3 text-sm text-gray-500">Loading...</span>
                </div>
              ) : error ? (
                <div className="py-8 text-center text-danger">{error}</div>
              ) : applications.length === 0 ? (
                <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                  <i className="ri-inbox-line text-4xl mb-3 block opacity-50"></i>
                  No applications found. Applications appear when candidates apply to jobs.
                </div>
              ) : (
                <table className="table whitespace-nowrap min-w-full">
                  <thead>
                    <tr>
                      <th>Candidate</th>
                      <th>Job</th>
                      <th>Status</th>
                      <th>Applied</th>
                      <th>Notes</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((app) => (
                      <tr key={app._id}>
                        <td>
                          <Link
                            href={`/ats/candidates?candidateId=${app.candidate?._id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {app.candidate?.fullName || '-'}
                          </Link>
                          <span className="text-xs text-gray-500 block">{app.candidate?.email || ''}</span>
                        </td>
                        <td>
                          <Link href={`/ats/jobs/edit/${app.job?._id}`} className="text-primary hover:underline">
                            {app.job?.title || '-'}
                          </Link>
                        </td>
                        <td>
                          <span className={`badge ${app.status === 'Hired' ? 'bg-success/10 text-success' : app.status === 'Rejected' ? 'bg-danger/10 text-danger' : app.status === 'Interview' ? 'bg-info/10 text-info' : 'bg-gray/10 text-gray'} border px-2 py-1 rounded`}>
                            {app.status}
                          </span>
                        </td>
                        <td>{app.createdAt ? new Date(app.createdAt).toLocaleDateString() : '-'}</td>
                        <td className="max-w-[200px] truncate">{app.notes || '-'}</td>
                        <td className="text-end">
                          {canEdit && getApplicationId(app) && (
                            <div className="flex items-center justify-end">
                              <button
                                type="button"
                                className="ti-btn ti-btn-sm ti-btn-primary shrink-0 whitespace-nowrap !w-auto !min-w-fit !h-8 !py-1.5 !px-3"
                                onClick={() => openEdit(app)}
                              >
                                Update status
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Status Modal - !opacity-100 !pointer-events-auto so it shows when opened via React state */}
      {editModal && (
        <div id="edit-status-modal" className="hs-overlay ti-modal active overflow-y-auto !opacity-100 !pointer-events-auto [--auto-close:false]" tabIndex={-1} style={{ zIndex: 80 }}>
          <div className="hs-overlay-open:mt-7 ti-modal-box">
            <div className="ti-modal-content">
              <div className="ti-modal-header">
                <h4 className="ti-modal-title">Update status – {editModal.candidate?.fullName}</h4>
                <button type="button" className="ti-btn ti-btn-light ti-btn-sm" onClick={() => setEditModal(null)}>
                  <i className="ri-close-line"></i>
                </button>
              </div>
              <div className="ti-modal-body space-y-4">
                <div>
                  <label className="form-label">Status</label>
                  <select
                    className="form-control"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as JobApplicationStatus)}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Notes</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Screening notes..."
                  />
                </div>
                {editStatus === 'Interview' && (
                  <p className="text-sm text-info">
                    Once moved to Interview, this application can be used to <Link href="/ats/offers-placement/create" className="underline">Create Offer</Link>.
                  </p>
                )}
              </div>
              <div className="ti-modal-footer">
                <button type="button" className="ti-btn ti-btn-light" onClick={() => setEditModal(null)}>Cancel</button>
                <button type="button" className="ti-btn ti-btn-primary" onClick={handleSaveStatus} disabled={submitting}>
                  {submitting ? <i className="ri-loader-4-line animate-spin"></i> : 'Save'}
                </button>
              </div>
            </div>
          </div>
          <div className="hs-overlay-backdrop ti-modal-backdrop" onClick={() => setEditModal(null)}></div>
        </div>
      )}
    </Fragment>
  )
}

export default JobApplications
