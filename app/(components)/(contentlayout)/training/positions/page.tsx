"use client"

import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment, useState, useEffect, useCallback } from 'react'
import Swal from 'sweetalert2'
import { AxiosError } from 'axios'
import * as positionsApi from '@/shared/lib/api/positions'
import type { Position } from '@/shared/lib/api/positions'

const TrainingPositions = () => {
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPosition, setEditingPosition] = useState<Position | null>(null)
  const [positionName, setPositionName] = useState('')

  const fetchPositions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await positionsApi.getAllPositions()
      setPositions(res)
    } catch (err) {
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : 'Failed to load positions.'
      await Swal.fire({
        icon: 'error',
        title: 'Failed to load positions',
        text: msg,
        toast: true,
        position: 'top-end',
        timer: 4000,
        showConfirmButton: false,
        timerProgressBar: true,
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPositions()
  }, [fetchPositions])

  const openCreateModal = () => {
    setEditingPosition(null)
    setPositionName('')
    setShowModal(true)
  }

  const openEditModal = (pos: Position) => {
    setEditingPosition(pos)
    setPositionName(pos.name)
    setShowModal(true)
  }

  const handleSave = async () => {
    const name = positionName.trim()
    if (!name) {
      await Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Position name is required.',
        toast: true,
        position: 'top-end',
        timer: 3000,
        showConfirmButton: false,
        timerProgressBar: true,
      })
      return
    }

    try {
      if (editingPosition) {
        await positionsApi.updatePosition(editingPosition.id || (editingPosition as any)._id, { name })
        await Swal.fire({
          icon: 'success',
          title: 'Position updated',
          text: `"${name}" has been updated.`,
          toast: true,
          position: 'top-end',
          timer: 3000,
          showConfirmButton: false,
          timerProgressBar: true,
        })
      } else {
        await positionsApi.createPosition({ name })
        await Swal.fire({
          icon: 'success',
          title: 'Position created',
          text: `"${name}" has been created. Use it in onboarding and training module assignment.`,
          toast: true,
          position: 'top-end',
          timer: 3000,
          showConfirmButton: false,
          timerProgressBar: true,
        })
      }
      setShowModal(false)
      setPositionName('')
      setEditingPosition(null)
      await fetchPositions()
    } catch (err) {
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : editingPosition ? 'Failed to update position.' : 'Failed to create position.'
      await Swal.fire({
        icon: 'error',
        title: editingPosition ? 'Failed to update' : 'Failed to create',
        text: msg,
        toast: true,
        position: 'top-end',
        timer: 4000,
        showConfirmButton: false,
        timerProgressBar: true,
      })
    }
  }

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Delete Position?',
      text: 'Candidates/students with this position will keep it, but the position will no longer appear in lists.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
    })

    if (result.isConfirmed) {
      try {
        await positionsApi.deletePosition(id)
        await Swal.fire({
          icon: 'success',
          title: 'Position deleted',
          toast: true,
          position: 'top-end',
          timer: 3000,
          showConfirmButton: false,
          timerProgressBar: true,
        })
        await fetchPositions()
      } catch (err) {
        const msg =
          err instanceof AxiosError && err.response?.data?.message
            ? String(err.response.data.message)
            : 'Failed to delete position.'
        await Swal.fire({
          icon: 'error',
          title: 'Failed to delete',
          text: msg,
          toast: true,
          position: 'top-end',
          timer: 4000,
          showConfirmButton: false,
          timerProgressBar: true,
        })
      }
    }
  }

  return (
    <Fragment>
      <Seo title="Positions" />
      <div className="mt-5 grid grid-cols-12 gap-6 sm:mt-6">
        <div className="xl:col-span-12 col-span-12">
          <div className="box custom-box overflow-hidden rounded-2xl border border-defaultborder/70 shadow-[0_18px_45px_-24px_rgba(0,0,0,0.35)]">
            <div className="box-header flex items-center justify-between flex-wrap gap-4 bg-gradient-to-br from-primary/[0.08] via-transparent to-amber-500/[0.04] dark:from-primary/15 px-5 py-5">
              <div className="min-w-0">
                <div className="box-title !mb-0 flex items-center gap-2 text-[1.05rem] sm:text-[1.2rem]">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/20">
                    <i className="ri-briefcase-line text-lg" aria-hidden />
                  </span>
                  Positions
                  <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[0.72rem] font-semibold tabular-nums text-primary">
                    {positions.length}
                  </span>
                </div>
                <p className="mt-1 text-[0.74rem] uppercase tracking-[0.12em] text-defaulttextcolor/55">
                  Training + onboarding mapping
                </p>
              </div>
              <button
                type="button"
                className="ti-btn ti-btn-primary-full !rounded-xl !py-2 !px-3 !text-sm shadow-sm"
                onClick={openCreateModal}
              >
                <i className="ri-add-line font-semibold align-middle me-1"></i>Add Position
              </button>
            </div>
            <div className="box-body !p-0">
              <div className="px-5 py-4 border-b border-defaultborder/70 bg-defaultbackground/35 dark:bg-white/[0.02]">
                <p className="text-sm text-defaulttextcolor/70">
                Create positions (e.g. Java Developer, Data Analyst) to assign to candidates during onboarding. Use them to filter students when assigning training modules.
                </p>
              </div>
              <div className="px-5 py-5">
              {loading ? (
                <div className="space-y-3 py-4" role="status" aria-live="polite" aria-busy="true">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-11 animate-pulse rounded-lg bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-white/[0.04] dark:via-white/[0.07] dark:to-white/[0.04]"
                    />
                  ))}
                  <p className="pt-1 text-center text-xs font-medium text-defaulttextcolor/55">Loading positions…</p>
                </div>
              ) : positions.length === 0 ? (
                <div className="py-14 px-4 text-center rounded-2xl border border-dashed border-defaultborder/80 bg-gradient-to-b from-defaultbackground/50 to-transparent">
                  <span className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/20">
                    <i className="ri-briefcase-4-line text-2xl" aria-hidden />
                  </span>
                  <h3 className="text-base font-semibold text-defaulttextcolor dark:text-white">No positions created yet</h3>
                  <p className="mt-1 text-sm text-defaulttextcolor/65">
                    Add your first position to start assigning roles in onboarding and curriculum workflows.
                  </p>
                  <button
                    type="button"
                    className="ti-btn ti-btn-primary-full !rounded-xl !mt-4 !py-2 !px-3 !text-sm"
                    onClick={openCreateModal}
                  >
                    <i className="ri-add-line me-1.5" />
                    Create first position
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-defaultborder/80">
                  <table className="table table-hover min-w-full !mb-0">
                    <thead className="bg-primary/[0.07] dark:bg-primary/15">
                      <tr>
                        <th className="text-start !py-3">Position Name</th>
                        <th className="text-start !py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {positions.map((pos) => (
                        <tr key={pos.id || (pos as any)._id}>
                          <td className="!py-3">
                            <div className="inline-flex items-center gap-2">
                              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <i className="ri-price-tag-3-line text-sm" aria-hidden />
                              </span>
                              <span className="font-medium text-defaulttextcolor dark:text-white">{pos.name}</span>
                            </div>
                          </td>
                          <td className="!py-3">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                className="ti-btn ti-btn-icon ti-btn-sm !rounded-lg bg-info/10 text-info hover:bg-info hover:text-white"
                                onClick={() => openEditModal(pos)}
                                title="Edit position"
                              >
                                <i className="ri-pencil-line"></i>
                              </button>
                              <button
                                type="button"
                                className="ti-btn ti-btn-icon ti-btn-sm !rounded-lg bg-danger/10 text-danger hover:bg-danger hover:text-white"
                                onClick={() => handleDelete(pos.id || (pos as any)._id)}
                                title="Delete position"
                              >
                                <i className="ri-delete-bin-line"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px] dark:bg-black/70"
            onClick={() => setShowModal(false)}
            aria-hidden="true"
          />
          <div className="relative ti-modal-content w-full max-w-md overflow-hidden rounded-2xl border border-defaultborder/80 bg-white shadow-[0_28px_85px_-24px_rgba(0,0,0,0.4)] dark:bg-bodybg">
            <div className="ti-modal-header flex items-start justify-between gap-3 border-b border-gray-200 bg-gradient-to-r from-primary/[0.08] to-transparent px-5 py-4 dark:border-gray-700">
              <div className="min-w-0">
                <h6 className="ti-modal-title text-lg font-semibold tracking-tight">
                  {editingPosition ? 'Edit Position' : 'Add Position'}
                </h6>
                <p className="mt-0.5 text-xs text-defaulttextcolor/65">
                  Used for onboarding assignment and training module mapping.
                </p>
              </div>
              <button
                type="button"
                className="ti-modal-close-btn rounded-lg p-2 text-defaulttextcolor/65 transition-colors hover:bg-gray-100 hover:text-defaulttextcolor dark:hover:bg-gray-700"
                onClick={() => setShowModal(false)}
                aria-label="Close"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            <div className="ti-modal-body px-5 py-5">
              <label htmlFor="position-name" className="form-label mb-2.5 block text-sm font-semibold">
                Position Name
              </label>
              <input
                id="position-name"
                type="text"
                className="form-control !h-11 !rounded-xl !border-defaultborder/80 focus:!border-primary/50"
                placeholder="e.g. Java Developer, Data Analyst"
                value={positionName}
                maxLength={60}
                autoFocus
                onChange={(e) => setPositionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleSave()
                  }
                }}
              />
              <div className="mt-2 flex items-center justify-between text-[0.72rem] text-defaulttextcolor/60">
                <span>Use a clear, searchable role title.</span>
                <span className="tabular-nums">{positionName.trim().length}/60</span>
              </div>
            </div>
            <div className="ti-modal-footer flex justify-end gap-2 border-t border-gray-200 bg-defaultbackground/40 px-5 py-4 dark:border-gray-700 dark:bg-white/[0.02]">
              <button type="button" className="ti-btn ti-btn-light !rounded-xl !px-4" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="ti-btn ti-btn-primary-full !rounded-xl !px-4"
                disabled={!positionName.trim()}
                onClick={handleSave}
              >
                {editingPosition ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  )
}

export default TrainingPositions
