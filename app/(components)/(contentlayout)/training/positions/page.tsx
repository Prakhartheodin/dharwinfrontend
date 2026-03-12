"use client"

import Pageheader from '@/shared/layout-components/page-header/pageheader'
import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment, useMemo, useState, useEffect, useCallback } from 'react'
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
      <Pageheader currentpage="Positions" activepage="Training Curriculum" mainpage="Positions" />
      <div className="grid grid-cols-12 gap-6">
        <div className="xl:col-span-12 col-span-12">
          <div className="box custom-box">
            <div className="box-header flex items-center justify-between flex-wrap gap-4">
              <div className="box-title">
                Positions
                <span className="badge bg-light text-default rounded-full ms-1 text-[0.75rem] align-middle">
                  {positions.length}
                </span>
              </div>
              <button
                type="button"
                className="ti-btn ti-btn-primary-full !py-2 !px-3 !text-sm"
                onClick={openCreateModal}
              >
                <i className="ri-add-line font-semibold align-middle me-1"></i>Add Position
              </button>
            </div>
            <div className="box-body">
              <p className="text-sm text-defaulttextcolor/70 mb-4">
                Create positions (e.g. Java Developer, Data Analyst) to assign to candidates during onboarding. Use them to filter students when assigning training modules.
              </p>
              {loading ? (
                <div className="py-12 text-center text-defaulttextcolor/70">Loading...</div>
              ) : positions.length === 0 ? (
                <div className="py-12 text-center text-defaulttextcolor/70">
                  No positions yet. Click &quot;Add Position&quot; to create one.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table table-striped table-hover table-bordered min-w-full">
                    <thead className="bg-primary/10 dark:bg-primary/20">
                      <tr>
                        <th className="text-start">Position Name</th>
                        <th className="text-start">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {positions.map((pos) => (
                        <tr key={pos.id || (pos as any)._id}>
                          <td>{pos.name}</td>
                          <td>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                className="ti-btn ti-btn-icon ti-btn-sm ti-btn-info"
                                onClick={() => openEditModal(pos)}
                              >
                                <i className="ri-pencil-line"></i>
                              </button>
                              <button
                                type="button"
                                className="ti-btn ti-btn-icon ti-btn-sm ti-btn-danger"
                                onClick={() => handleDelete(pos.id || (pos as any)._id)}
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

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 dark:bg-black/70" onClick={() => setShowModal(false)} aria-hidden="true" />
          <div className="relative ti-modal-content bg-white dark:bg-bodybg rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="ti-modal-header flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h6 className="ti-modal-title text-lg font-semibold">
                {editingPosition ? 'Edit Position' : 'Add Position'}
              </h6>
              <button type="button" className="ti-modal-close-btn p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => setShowModal(false)}>
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            <div className="ti-modal-body px-4 py-4">
              <label htmlFor="position-name" className="form-label">Position Name</label>
              <input
                id="position-name"
                type="text"
                className="form-control"
                placeholder="e.g. Java Developer, Data Analyst"
                value={positionName}
                onChange={(e) => setPositionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleSave()
                  }
                }}
              />
            </div>
            <div className="ti-modal-footer px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
              <button type="button" className="ti-btn ti-btn-light" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button type="button" className="ti-btn ti-btn-primary-full" onClick={handleSave}>
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
