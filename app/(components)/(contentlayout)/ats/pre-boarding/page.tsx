"use client"

import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment, useState, useEffect } from 'react'
import { listPlacements, updatePlacement } from '@/shared/lib/api/placements'
import type { Placement, PreBoardingStatus, BGVStatus } from '@/shared/lib/api/placements'
import { useFeaturePermissions } from '@/shared/hooks/use-feature-permissions'
import Link from 'next/link'

const PRE_BOARDING_OPTIONS: PreBoardingStatus[] = ['Pending', 'In Progress', 'Completed']
const BGV_OPTIONS: BGVStatus[] = ['Pending', 'In Progress', 'Completed', 'Verified']

const PreBoarding = () => {
  const { canView, canEdit } = useFeaturePermissions('ats.pre-boarding')
  const [placements, setPlacements] = useState<Placement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [preBoardingFilter, setPreBoardingFilter] = useState<PreBoardingStatus | ''>('')
  const [editModal, setEditModal] = useState<Placement | null>(null)
  const [editForm, setEditForm] = useState<{
    placementStatus: 'Pending' | 'Joined' | 'Deferred' | 'Cancelled'
    preBoardingStatus: PreBoardingStatus
    bgvStatus: BGVStatus
    bgvAgency: string
    bgvNotes: string
    assets: { name: string; type: string; serialNumber: string; notes: string }[]
    itAccess: { system: string; accessLevel: string; notes: string }[]
  } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const fetchPlacements = () => {
    setLoading(true)
    setError(null)
    listPlacements({
      status: 'Pending',
      preBoardingStatus: preBoardingFilter || undefined,
      limit: 100,
      page: 1,
    })
      .then((res) => setPlacements(res.results ?? []))
      .catch((err) => setError(err?.response?.data?.message || err?.message || 'Failed to load placements'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (canView) fetchPlacements()
  }, [canView, preBoardingFilter])

  const openEdit = (p: Placement) => {
    setEditModal(p)
    const bv = p.backgroundVerification
    setEditForm({
      placementStatus: (p.status as 'Pending' | 'Joined' | 'Deferred' | 'Cancelled') || 'Pending',
      preBoardingStatus: (p.preBoardingStatus as PreBoardingStatus) || 'Pending',
      bgvStatus: (bv?.status as BGVStatus) || 'Pending',
      bgvAgency: bv?.agency || '',
      bgvNotes: bv?.notes || '',
      assets: (p.assetAllocation || []).map((a) => ({
        name: a.name,
        type: a.type || '',
        serialNumber: a.serialNumber || '',
        notes: a.notes || '',
      })),
      itAccess: (p.itAccess || []).map((i) => ({
        system: i.system,
        accessLevel: i.accessLevel || '',
        notes: i.notes || '',
      })),
    })
  }

  const handleSavePreBoarding = async () => {
    if (!editModal || !editForm) return
    const placementId = (editModal as { _id?: string; id?: string })._id ?? editModal.id ?? ''
    if (!placementId || !/^[0-9a-fA-F]{24}$/.test(placementId)) {
      alert('Invalid placement')
      return
    }
    setSubmitting(true)
    try {
      const updated = await updatePlacement(placementId, {
        status: editForm.placementStatus,
        preBoardingStatus: editForm.preBoardingStatus,
        backgroundVerification: {
          status: editForm.bgvStatus,
          agency: editForm.bgvAgency || undefined,
          notes: editForm.bgvNotes || undefined,
        },
        assetAllocation: editForm.assets.filter((a) => a.name.trim()).map((a) => ({
          name: a.name,
          type: a.type || undefined,
          serialNumber: a.serialNumber || undefined,
          notes: a.notes || undefined,
        })),
        itAccess: editForm.itAccess.filter((i) => i.system.trim()).map((i) => ({
          system: i.system,
          accessLevel: i.accessLevel || undefined,
          notes: i.notes || undefined,
        })),
      })
      const updatedId = (updated as { _id?: string; id?: string })._id ?? (updated as { id?: string }).id
      setPlacements((prev) =>
        updated.status === 'Joined'
          ? prev.filter((p) => ((p as { _id?: string; id?: string })._id ?? p.id) !== updatedId)
          : prev.map((p) => (((p as { _id?: string; id?: string })._id ?? p.id) === updatedId ? updated : p))
      )
      setEditModal(null)
      setEditForm(null)
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to update pre-boarding')
    } finally {
      setSubmitting(false)
    }
  }

  const addAsset = () => {
    if (!editForm) return
    setEditForm({ ...editForm, assets: [...editForm.assets, { name: '', type: '', serialNumber: '', notes: '' }] })
  }

  const removeAsset = (idx: number) => {
    if (!editForm) return
    setEditForm({ ...editForm, assets: editForm.assets.filter((_, i) => i !== idx) })
  }

  const updateAsset = (idx: number, field: string, value: string) => {
    if (!editForm) return
    const next = [...editForm.assets]
    ;(next[idx] as Record<string, string>)[field] = value
    setEditForm({ ...editForm, assets: next })
  }

  const addItAccess = () => {
    if (!editForm) return
    setEditForm({ ...editForm, itAccess: [...editForm.itAccess, { system: '', accessLevel: '', notes: '' }] })
  }

  const removeItAccess = (idx: number) => {
    if (!editForm) return
    setEditForm({ ...editForm, itAccess: editForm.itAccess.filter((_, i) => i !== idx) })
  }

  const updateItAccess = (idx: number, field: string, value: string) => {
    if (!editForm) return
    const next = [...editForm.itAccess]
    ;(next[idx] as Record<string, string>)[field] = value
    setEditForm({ ...editForm, itAccess: next })
  }

  if (!canView) {
    return (
      <Fragment>
        <Seo title="Pre-boarding" />
        <div className="mt-5 grid grid-cols-12 gap-6 sm:mt-6">
          <div className="col-span-12 p-6 rounded-lg border border-danger/20 bg-danger/5 text-danger">
            You do not have permission to view Pre-boarding.
          </div>
        </div>
      </Fragment>
    )
  }

  return (
    <Fragment>
      <Seo title="Pre-boarding" />
      <div className="mt-5 grid grid-cols-12 gap-6 min-w-0 sm:mt-6">
        <div className="col-span-12 min-w-0">
          <div className="box min-w-0">
            <div className="box-header flex flex-wrap items-center justify-between gap-2 overflow-visible">
              <h5 className="box-title min-w-0 flex-1 truncate">Pre-boarding (Placements awaiting joining)</h5>
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <Link href="/ats/onboarding" className="ti-btn ti-btn-sm ti-btn-success shrink-0 whitespace-nowrap !w-auto !min-w-fit !h-8 !py-1.5 !px-3">
                  <i className="ri-login-circle-line me-1"></i>Onboarding
                </Link>
                <select
                  className="form-control form-control-sm !w-[7rem] shrink-0"
                  value={preBoardingFilter}
                  onChange={(e) => setPreBoardingFilter((e.target.value as PreBoardingStatus) || '')}
                >
                  <option value="">All statuses</option>
                  {PRE_BOARDING_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
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
                  <i className="ri-inbox-line text-4xl mb-3 block opacity-50"></i>
                  No placements in pre-boarding. Placements appear here when an offer is accepted (status: Pending).
                </div>
              ) : (
                <table className="table whitespace-nowrap min-w-full">
                  <thead>
                    <tr>
                      <th>Candidate</th>
                      <th>Job</th>
                      <th>Pre-boarding</th>
                      <th>BGV</th>
                      <th>Assets</th>
                      <th>IT Access</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {placements.map((p) => (
                      <tr key={p._id}>
                        <td>
                          <div>
                            <Link href={`/ats/employees?candidateId=${p.candidate?._id}`} className="font-medium text-primary hover:underline">
                              {p.candidate?.fullName || '-'}
                            </Link>
                            <span className="text-xs text-gray-500 block">{p.candidate?.email || ''}</span>
                          </div>
                        </td>
                        <td>{p.job?.title || '-'}</td>
                        <td>
                          <span className={`badge ${(p.preBoardingStatus || 'Pending') === 'Completed' ? 'bg-success/10 text-success' : (p.preBoardingStatus || 'Pending') === 'In Progress' ? 'bg-warning/10 text-warning' : 'bg-gray/10 text-gray'} border px-2 py-1 rounded`}>
                            {p.preBoardingStatus || 'Pending'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${(p.backgroundVerification?.status || 'Pending') === 'Verified' ? 'bg-success/10 text-success' : (p.backgroundVerification?.status || 'Pending') === 'Completed' ? 'bg-success/10 text-success' : (p.backgroundVerification?.status || 'Pending') === 'In Progress' ? 'bg-warning/10 text-warning' : 'bg-gray/10 text-gray'} border px-2 py-1 rounded`}>
                            {p.backgroundVerification?.status || 'Pending'}
                          </span>
                        </td>
                        <td>{(p.assetAllocation || []).length} item(s)</td>
                        <td>{(p.itAccess || []).length} system(s)</td>
                        <td className="text-end">
                          <div className="flex items-center justify-end gap-2 flex-wrap">
                            {canEdit && (
                              <button type="button" className="ti-btn ti-btn-sm ti-btn-primary shrink-0 whitespace-nowrap !w-auto !min-w-fit !h-8 !py-1.5 !px-3" onClick={() => openEdit(p)}>
                                Edit
                              </button>
                            )}
                            <Link href={`/ats/employees?candidateId=${p.candidate?._id}`} className="ti-btn ti-btn-sm ti-btn-light shrink-0 whitespace-nowrap !w-auto !min-w-fit !h-8 !py-1.5 !px-3">
                              Documents
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

      {/* Edit Pre-boarding Modal - use !opacity-100 !pointer-events-auto so it shows when opened via React state */}
      {editModal && editForm && (
        <div id="edit-preboarding-modal" className="hs-overlay ti-modal active overflow-y-auto !opacity-100 !pointer-events-auto [--auto-close:false]" tabIndex={-1} style={{ zIndex: 80 }}>
          <div className="hs-overlay-open:mt-7 ti-modal-box ti-modal-lg">
            <div className="ti-modal-content">
              <div className="ti-modal-header">
                <h4 className="ti-modal-title">Edit Pre-boarding – {editModal.candidate?.fullName}</h4>
                <button type="button" className="ti-btn ti-btn-light ti-btn-sm" onClick={() => { setEditModal(null); setEditForm(null); }}>
                  <i className="ri-close-line"></i>
                </button>
              </div>
              <div className="ti-modal-body space-y-5">
                <div>
                  <label className="form-label">Placement Status (Mark as Joined to move to Onboarding)</label>
                  <select
                    className="form-control"
                    value={editForm.placementStatus}
                    onChange={(e) => setEditForm({ ...editForm, placementStatus: e.target.value as 'Pending' | 'Joined' | 'Deferred' | 'Cancelled' })}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Joined">Joined</option>
                    <option value="Deferred">Deferred</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Pre-boarding Status</label>
                  <select
                    className="form-control"
                    value={editForm.preBoardingStatus}
                    onChange={(e) => setEditForm({ ...editForm, preBoardingStatus: e.target.value as PreBoardingStatus })}
                  >
                    {PRE_BOARDING_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="border-b border-defaultborder pb-4">
                  <h6 className="form-label mb-3">Background Verification</h6>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Status</label>
                      <select
                        className="form-control"
                        value={editForm.bgvStatus}
                        onChange={(e) => setEditForm({ ...editForm, bgvStatus: e.target.value as BGVStatus })}
                      >
                        {BGV_OPTIONS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Agency</label>
                      <input type="text" className="form-control" value={editForm.bgvAgency} onChange={(e) => setEditForm({ ...editForm, bgvAgency: e.target.value })} placeholder="e.g. Background Check Inc" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="form-label">Notes</label>
                    <textarea className="form-control" rows={2} value={editForm.bgvNotes} onChange={(e) => setEditForm({ ...editForm, bgvNotes: e.target.value })} placeholder="BGV notes" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h6 className="form-label mb-0">Asset Allocation</h6>
                    <button type="button" className="ti-btn ti-btn-sm ti-btn-success" onClick={addAsset}><i className="ri-add-line"></i> Add</button>
                  </div>
                  <div className="space-y-2">
                    {editForm.assets.map((a, idx) => (
                      <div key={idx} className="flex flex-wrap gap-2 items-end p-2 border border-defaultborder rounded">
                        <input type="text" className="form-control flex-1 min-w-[120px]" placeholder="Asset name" value={a.name} onChange={(e) => updateAsset(idx, 'name', e.target.value)} />
                        <input type="text" className="form-control min-w-[80px]" placeholder="Type" value={a.type} onChange={(e) => updateAsset(idx, 'type', e.target.value)} />
                        <input type="text" className="form-control min-w-[100px]" placeholder="Serial #" value={a.serialNumber} onChange={(e) => updateAsset(idx, 'serialNumber', e.target.value)} />
                        <input type="text" className="form-control min-w-[100px]" placeholder="Notes" value={a.notes} onChange={(e) => updateAsset(idx, 'notes', e.target.value)} />
                        <button type="button" className="ti-btn ti-btn-sm ti-btn-danger" onClick={() => removeAsset(idx)}><i className="ri-delete-bin-line"></i></button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h6 className="form-label mb-0">IT Access</h6>
                    <button type="button" className="ti-btn ti-btn-sm ti-btn-success" onClick={addItAccess}><i className="ri-add-line"></i> Add</button>
                  </div>
                  <div className="space-y-2">
                    {editForm.itAccess.map((i, idx) => (
                      <div key={idx} className="flex flex-wrap gap-2 items-end p-2 border border-defaultborder rounded">
                        <input type="text" className="form-control flex-1 min-w-[120px]" placeholder="System (e.g. Email, Slack)" value={i.system} onChange={(e) => updateItAccess(idx, 'system', e.target.value)} />
                        <input type="text" className="form-control min-w-[100px]" placeholder="Access level" value={i.accessLevel} onChange={(e) => updateItAccess(idx, 'accessLevel', e.target.value)} />
                        <input type="text" className="form-control min-w-[100px]" placeholder="Notes" value={i.notes} onChange={(e) => updateItAccess(idx, 'notes', e.target.value)} />
                        <button type="button" className="ti-btn ti-btn-sm ti-btn-danger" onClick={() => removeItAccess(idx)}><i className="ri-delete-bin-line"></i></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="ti-modal-footer">
                <button type="button" className="ti-btn ti-btn-light" onClick={() => { setEditModal(null); setEditForm(null); }}>Cancel</button>
                <button type="button" className="ti-btn ti-btn-primary" onClick={handleSavePreBoarding} disabled={submitting}>
                  {submitting ? <i className="ri-loader-4-line animate-spin"></i> : 'Save'}
                </button>
              </div>
            </div>
          </div>
          <div className="hs-overlay-backdrop ti-modal-backdrop" onClick={() => { setEditModal(null); setEditForm(null); }}></div>
        </div>
      )}
    </Fragment>
  )
}

export default PreBoarding
