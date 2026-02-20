"use client"

import Pageheader from '@/shared/layout-components/page-header/pageheader'
import Link from 'next/link'
import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment, useState, useEffect } from 'react'
import { listPlacements } from '@/shared/lib/api/placements'
import type { Placement } from '@/shared/lib/api/placements'
import { useFeaturePermissions } from '@/shared/hooks/use-feature-permissions'

const isValidMongoId = (id: unknown): id is string =>
  typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id)

const Onboarding = () => {
  const { canView, canEdit } = useFeaturePermissions('ats.onboarding')
  const [placements, setPlacements] = useState<Placement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPlacements = () => {
    setLoading(true)
    setError(null)
    listPlacements({ status: 'Joined', limit: 100, page: 1 })
      .then((res) => setPlacements(res.results ?? []))
      .catch((err) => setError(err?.response?.data?.message || err?.message || 'Failed to load placements'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (canView) fetchPlacements()
  }, [canView])

  const getCandidateDepartment = (p: Placement) => {
    const c = p.candidate as { department?: string } | undefined
    return c?.department ?? '-'
  }

  const getCandidateDesignation = (p: Placement) => {
    const c = p.candidate as { designation?: string } | undefined
    return c?.designation ?? '-'
  }

  if (!canView) {
    return (
      <Fragment>
        <Seo title="Onboarding" />
        <Pageheader currentpage="Onboarding" activepage="ATS" mainpage="Onboarding" />
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 p-6 rounded-lg border border-danger/20 bg-danger/5 text-danger">
            You do not have permission to view Onboarding.
          </div>
        </div>
      </Fragment>
    )
  }

  return (
    <Fragment>
      <Seo title="Onboarding" />
      <Pageheader currentpage="Onboarding" activepage="ATS" mainpage="Onboarding" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <div className="box">
            <div className="box-header flex flex-wrap items-center justify-between gap-2 overflow-visible">
              <h5 className="box-title min-w-0 flex-1 truncate">Onboarding (Joined employees – HRMS)</h5>
              <div className="flex items-center gap-2 shrink-0">
                <Link href="/ats/pre-boarding" className="ti-btn ti-btn-sm ti-btn-light shrink-0 whitespace-nowrap !w-auto !min-w-fit !h-8 !py-1.5 !px-3">
                  <i className="ri-arrow-left-line me-1"></i>Pre-boarding
                </Link>
                <button type="button" className="ti-btn ti-btn-sm ti-btn-secondary shrink-0 whitespace-nowrap !w-auto !min-w-fit !h-8 !py-1.5 !px-3" onClick={fetchPlacements}>
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
              ) : placements.length === 0 ? (
                <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                  <i className="ri-user-follow-line text-4xl mb-3 block opacity-50"></i>
                  No joined employees yet. Employees appear here when their placement status is set to Joined.
                </div>
              ) : (
                <table className="table whitespace-nowrap min-w-full">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Job</th>
                      <th>Employee ID</th>
                      <th>Joining Date</th>
                      <th>Department</th>
                      <th>Designation</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {placements.map((p) => (
                      <tr key={p._id}>
                        <td>
                          <div>
                            <Link href={`/ats/candidates?candidateId=${p.candidate?._id}`} className="font-medium text-primary hover:underline">
                              {p.candidate?.fullName || '-'}
                            </Link>
                            <span className="text-xs text-gray-500 block">{p.candidate?.email || ''}</span>
                          </div>
                        </td>
                        <td>{p.job?.title || '-'}</td>
                        <td>{p.candidate?.employeeId || p.employeeId || '-'}</td>
                        <td>{p.joiningDate ? new Date(p.joiningDate).toLocaleDateString() : '-'}</td>
                        <td>{getCandidateDepartment(p)}</td>
                        <td>{getCandidateDesignation(p)}</td>
                        <td className="text-end">
                          <div className="flex items-center justify-end gap-2 flex-wrap">
                            {canEdit && (() => {
                              const pid = (p as { _id?: string; id?: string })._id ?? (p as { id?: string }).id
                              const placementId = typeof pid === 'string' ? pid : ''
                              return isValidMongoId(placementId) ? (
                                <Link href={`/ats/onboarding/edit/${placementId}`} className="ti-btn ti-btn-sm ti-btn-primary shrink-0 whitespace-nowrap !w-auto !min-w-fit !h-8 !py-1.5 !px-3">
                                  Edit HRMS
                                </Link>
                              ) : null
                            })()}
                            <Link href={`/ats/candidates?candidateId=${(p.candidate as { _id?: string })?._id ?? (typeof p.candidate === 'string' ? p.candidate : '')}`} className="ti-btn ti-btn-sm ti-btn-light shrink-0 whitespace-nowrap !w-auto !min-w-fit !h-8 !py-1.5 !px-3">
                              Profile
                            </Link>
                          </div>
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
    </Fragment>
  )
}

export default Onboarding
