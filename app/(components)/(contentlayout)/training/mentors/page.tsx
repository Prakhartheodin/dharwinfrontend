"use client"
import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment, useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { useTable, useSortBy } from 'react-table'
import Link from 'next/link'
import Swal from 'sweetalert2'
import { AxiosError } from 'axios'
import * as mentorsApi from '@/shared/lib/api/mentors'
import type { Mentor } from '@/shared/lib/api/mentors'
import MentorViewModal from './_components/MentorViewModal'
import MentorProfileImageModal from './_components/MentorProfileImageModal'

// Interface for display purposes
interface MentorRow {
  id: string
  name: string
  displayPicture: string
  phone: string
  email: string
  skills: string[]
  expertise: string
  experience: number
  bio: string
}

const Mentors = () => {
  const [mentors, setMentors] = useState<MentorRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [viewMentor, setViewMentor] = useState<Mentor | null>(null)
  const [viewMentorLoading, setViewMentorLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalResults, setTotalResults] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [sortBy, setSortBy] = useState<string>('createdAt:desc')

  // Profile image modal state
  const [profileImageMentor, setProfileImageMentor] = useState<MentorRow | null>(null)
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null)
  const [profileImageLoading, setProfileImageLoading] = useState(false)
  const [profileImageUploading, setProfileImageUploading] = useState(false)
  const [profileImageError, setProfileImageError] = useState<string | null>(null)

  // Helper function to map Mentor API response to MentorRow format
  const mapMentorToRow = useCallback((mentor: Mentor): MentorRow => {
    // Format expertise from array to string
    const expertiseStr = mentor.expertise && mentor.expertise.length > 0
      ? mentor.expertise.map(exp => {
          const parts = []
          if (exp.area) parts.push(exp.area)
          if (exp.level) parts.push(`(${exp.level})`)
          if (exp.yearsOfExperience) parts.push(`${exp.yearsOfExperience} years`)
          return parts.join(' - ')
        }).filter(Boolean).join(', ')
      : ''

    // Calculate experience from experience array
    const experienceYears = mentor.experience && mentor.experience.length > 0
      ? mentor.experience.reduce((total, exp) => {
          if (exp.startDate && exp.endDate) {
            try {
              const start = new Date(exp.startDate)
              const end = new Date(exp.endDate)
              if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                const years = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365)
                return total + Math.max(0, years)
              }
            } catch (e) {
              // Invalid date, skip
            }
          }
          return total
        }, 0)
      : 0

    return {
      id: mentor.id,
      name: mentor.user?.name || 'Unknown',
      displayPicture: mentor.profileImageUrl || '/assets/images/faces/1.jpg',
      phone: mentor.phone || '',
      email: mentor.user?.email || '',
      skills: mentor.skills || [],
      expertise: expertiseStr,
      experience: Math.round(experienceYears),
      bio: mentor.bio || '',
    }
  }, [])

  // Use ref to store fetchMentors to avoid circular dependencies
  const fetchMentorsRef = useRef<() => Promise<void>>()

  // Fetch mentors from Mentors API
  const fetchMentors = useCallback(async () => {
    setLoading(true)
    try {
      const params: mentorsApi.ListMentorsParams = {
        page: currentPage,
        limit: pageSize,
        sortBy,
        ...(searchQuery.trim() && { search: searchQuery.trim() }),
      }
      
      const response = await mentorsApi.listMentors(params)
      
      const mappedMentors = response.results.map(mapMentorToRow)
      setMentors(mappedMentors)
      setTotalResults(response.totalResults)
      setTotalPages(response.totalPages)
    } catch (err) {
      console.error('Error fetching mentors:', err)
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : err instanceof Error
          ? err.message
          : 'Failed to load mentors.'
      await Swal.fire({
        icon: 'error',
        title: 'Failed to load mentors',
        text: msg,
        toast: true,
        position: 'top-end',
        timer: 4000,
        showConfirmButton: false,
        timerProgressBar: true,
      })
      setMentors([])
      setTotalResults(0)
      setTotalPages(0)
    } finally {
      setLoading(false)
    }
  }, [currentPage, pageSize, sortBy, searchQuery])

  // Update ref when fetchMentors changes
  useEffect(() => {
    fetchMentorsRef.current = fetchMentors
  }, [fetchMentors])

  // Fetch mentors when dependencies change
  useEffect(() => {
    fetchMentors()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize, sortBy, searchQuery])

  // Handle view mentor - fetch full details and open modal
  const handleViewMentor = async (mentorId: string) => {
    setViewMentorLoading(true)
    try {
      const mentor = await mentorsApi.getMentor(mentorId)
      setViewMentor(mentor)
      setTimeout(() => {
        ;(window as any).HSOverlay?.open(document.querySelector('#view-mentor-modal'))
      }, 100)
    } catch (err) {
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : 'Failed to load mentor details.'
      await Swal.fire({
        icon: 'error',
        title: 'Failed to load mentor',
        text: msg,
        toast: true,
        position: 'top-end',
        timer: 4000,
        showConfirmButton: false,
        timerProgressBar: true,
      })
    } finally {
      setViewMentorLoading(false)
    }
  }

  const openProfileImageModal = useCallback(
    async (mentor: MentorRow) => {
      setProfileImageMentor(mentor)
      setProfileImageUrl(null)
      setProfileImageError(null)
      setProfileImageLoading(true)

      try {
        const info = await mentorsApi.getMentorProfileImage(mentor.id)
        setProfileImageUrl(info?.url ?? null)
      } catch (err) {
        // 404 or other errors – just log and keep placeholder
        console.error('Failed to fetch profile image URL', err)
      } finally {
        setProfileImageLoading(false)
      }

      setTimeout(() => {
        ;(window as any).HSOverlay?.open(document.querySelector('#mentor-profile-image-modal'))
      }, 50)
    },
    []
  )

  const handleProfileImageFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0]
    if (!file || !profileImageMentor) return

    setProfileImageUploading(true)
    setProfileImageError(null)

    try {
      await mentorsApi.uploadMentorProfileImage(profileImageMentor.id, file)

      // Refresh image URL
      const info = await mentorsApi.getMentorProfileImage(profileImageMentor.id)
      setProfileImageUrl(info?.url ?? null)

      // Optionally refresh mentors list to reflect any backend changes
      if (fetchMentorsRef.current) {
        await fetchMentorsRef.current()
      }

      await Swal.fire({
        icon: 'success',
        title: 'Profile image updated',
        text: `The profile image for "${profileImageMentor.name}" has been updated.`,
        toast: true,
        position: 'top-end',
        timer: 3000,
        showConfirmButton: false,
        timerProgressBar: true,
      })
    } catch (err) {
      console.error('Failed to upload profile image', err)
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : 'Failed to upload profile image. Please try again.'
      setProfileImageError(msg)
      await Swal.fire({
        icon: 'error',
        title: 'Profile image upload failed',
        text: msg,
        toast: true,
        position: 'top-end',
        timer: 4000,
        showConfirmButton: false,
        timerProgressBar: true,
      })
    } finally {
      setProfileImageUploading(false)
      e.target.value = ''
    }
  }

  // Delete a single mentor
  const handleDelete = useCallback(async (id: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
    })

    if (!result.isConfirmed) return

    try {
      await mentorsApi.deleteMentor(id)
      await Swal.fire({
        icon: 'success',
        title: 'Deleted!',
        text: 'Mentor has been deleted.',
        toast: true,
        position: 'top-end',
        timer: 3000,
        showConfirmButton: false,
        timerProgressBar: true,
      })
      setSelectedRows((prev) => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
      // Trigger refetch using ref to avoid circular dependency
      if (fetchMentorsRef.current) {
        await fetchMentorsRef.current()
      }
    } catch (err) {
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : 'Failed to delete mentor.'
      await Swal.fire({
        icon: 'error',
        title: 'Failed to delete mentor',
        text: msg,
        toast: true,
        position: 'top-end',
        timer: 4000,
        showConfirmButton: false,
        timerProgressBar: true,
      })
    }
  }, [])

  // Delete selected mentors
  const handleDeleteSelected = useCallback(async () => {
    if (selectedRows.size === 0) {
      await Swal.fire({
        icon: 'warning',
        title: 'No selection',
        text: 'Please select at least one mentor to delete.',
        toast: true,
        position: 'top-end',
        timer: 3000,
        showConfirmButton: false,
        timerProgressBar: true,
      })
      return
    }

    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `You are about to delete ${selectedRows.size} mentor(s). This action cannot be undone!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: `Yes, delete ${selectedRows.size} mentor(s)!`,
    })

    if (!result.isConfirmed) return

    try {
      await Promise.all(Array.from(selectedRows).map(id => mentorsApi.deleteMentor(id)))
      await Swal.fire({
        icon: 'success',
        title: 'Deleted!',
        text: `${selectedRows.size} mentor(s) have been deleted.`,
        toast: true,
        position: 'top-end',
        timer: 3000,
        showConfirmButton: false,
        timerProgressBar: true,
      })
      setSelectedRows(new Set())
      // Trigger refetch using ref to avoid circular dependency
      if (fetchMentorsRef.current) {
        await fetchMentorsRef.current()
      }
    } catch (err) {
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : 'Failed to delete mentors.'
      await Swal.fire({
        icon: 'error',
        title: 'Failed to delete mentors',
        text: msg,
        toast: true,
        position: 'top-end',
        timer: 4000,
        showConfirmButton: false,
        timerProgressBar: true,
      })
    }
  }, [selectedRows])

  // Handle individual row checkbox
  const handleRowSelect = useCallback((id: string) => {
    setSelectedRows((prev) => {
      const newSelected = new Set(prev)
      if (newSelected.has(id)) {
        newSelected.delete(id)
      } else {
        newSelected.add(id)
      }
      return newSelected
    })
  }, [])

  // Handle select all checkbox - use mentors directly to avoid dependency issues
  const handleSelectAll = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedRows((prev) => {
        const allIds = new Set(mentors.map((mentor) => mentor.id))
        return allIds
      })
    } else {
      setSelectedRows(new Set())
    }
  }, [mentors])

  const filteredData = mentors
  const isAllSelected = selectedRows.size === filteredData.length && filteredData.length > 0
  const isIndeterminate = selectedRows.size > 0 && selectedRows.size < filteredData.length

  // Table columns
  const columns = useMemo(
    () => [
      {
        Header: (
          <input
            className="form-check-input"
            type="checkbox"
            checked={isAllSelected}
            ref={(input) => {
              if (input) input.indeterminate = isIndeterminate
            }}
            onChange={handleSelectAll}
            aria-label="Select all"
          />
        ),
        accessor: 'checkbox',
        disableSortBy: true,
        Cell: ({ row }: any) => (
          <input
            className="form-check-input"
            type="checkbox"
            checked={selectedRows.has(row.original.id)}
            onChange={() => handleRowSelect(row.original.id)}
            aria-label={`Select ${row.original.name}`}
          />
        ),
      },
      {
        Header: 'Mentor Info',
        accessor: 'name',
        Cell: ({ row }: any) => {
          const mentor = row.original
          return (
            <div className="flex items-center gap-3">
              <img
                src={mentor.displayPicture}
                alt={mentor.name}
                className="w-10 h-10 rounded-full object-cover cursor-pointer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/assets/images/faces/1.jpg'
                }}
                onClick={() => openProfileImageModal(mentor)}
              />
              <div className="flex-1 min-w-0">
                <div
                  className="font-semibold text-gray-800 dark:text-white truncate cursor-pointer hover:text-primary"
                  onClick={() => handleViewMentor(mentor.id)}
                >
                  {mentor.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  <div className="flex items-center gap-1">
                    <i className="ri-phone-line"></i>
                    {mentor.phone || 'N/A'}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <i className="ri-mail-line"></i>
                    {mentor.email}
                  </div>
                </div>
              </div>
            </div>
          )
        },
      },
      {
        Header: 'Skills',
        accessor: 'skills',
        Cell: ({ row }: any) => {
          const mentor = row.original
          return (
            <div className="flex flex-wrap gap-1.5">
              {mentor.skills?.slice(0, 3).map((skill: string, index: number) => (
                <span
                  key={index}
                  className="badge bg-primary/10 text-primary border border-primary/30 px-2 py-1 rounded-md text-xs font-medium"
                >
                  {skill}
                </span>
              ))}
              {mentor.skills?.length > 3 && (
                <span className="badge bg-gray-100 dark:bg-black/20 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-md text-xs font-medium">
                  +{mentor.skills.length - 3}
                </span>
              )}
            </div>
          )
        },
      },
      {
        Header: 'Expertise',
        accessor: 'expertise',
        Cell: ({ row }: any) => {
          const mentor = row.original
          return (
            <div 
              className="text-sm text-gray-800 dark:text-white" 
              style={{ 
                maxWidth: '280px',
                minHeight: '60px',
                lineHeight: '1.5',
                wordBreak: 'break-word'
              }}
              title={mentor.expertise}
            >
              {mentor.expertise ? (
                <div className="font-medium flex items-center gap-2">
                  <i className="ri-star-line text-primary"></i>
                  <span>{mentor.expertise}</span>
                </div>
              ) : (
                <span className="text-gray-400">No expertise listed</span>
              )}
            </div>
          )
        },
      },
      {
        Header: 'Bio',
        accessor: 'bio',
        Cell: ({ row }: any) => {
          const mentor = row.original
          return (
            <div 
              className="text-sm text-gray-700 dark:text-gray-300" 
              style={{ 
                maxWidth: '280px',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: '1.5',
                wordBreak: 'break-word'
              }}
              title={mentor.bio}
            >
              {mentor.bio || 'No bio available'}
            </div>
          )
        },
      },
      {
        Header: 'Actions',
        accessor: 'id',
        disableSortBy: true,
        Cell: ({ row }: any) => (
          <div className="flex items-center gap-2">
            <div className="hs-tooltip ti-main-tooltip">
              <button
                type="button"
                onClick={() => handleViewMentor(row.original.id)}
                className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-success"
                title="View Mentor"
                disabled={viewMentorLoading}
              >
                <i className="ri-eye-line"></i>
                <span
                  className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700"
                  role="tooltip">
                  View Mentor
                </span>
              </button>
            </div>
            <div className="hs-tooltip ti-main-tooltip">
              <Link
                href={`/training/mentors/edit/?id=${encodeURIComponent(row.original.id)}`}
                className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-info"
                title="Edit Mentor"
              >
                <i className="ri-pencil-line"></i>
                <span
                  className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700"
                  role="tooltip">
                  Edit Mentor
                </span>
              </Link>
            </div>
            <div className="hs-tooltip ti-main-tooltip">
              <button
                type="button"
                onClick={() => handleDelete(row.original.id)}
                className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-danger"
                title="Delete Mentor"
              >
                <i className="ri-delete-bin-line"></i>
                <span
                  className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700"
                  role="tooltip">
                  Delete Mentor
                </span>
              </button>
            </div>
          </div>
        ),
      },
    ],
    [selectedRows, isAllSelected, isIndeterminate, handleDelete, handleRowSelect, handleSelectAll, viewMentorLoading]
  )

  const tableInstance: any = useTable(
    {
      columns,
      data: filteredData,
      manualPagination: true,
      manualSortBy: true,
    },
    useSortBy
  )

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
  } = tableInstance

  return (
    <Fragment>
      <Seo title="Mentors" />
  
      <div className="mt-5 grid grid-cols-12 gap-6 h-[calc(100vh-8rem)] sm:mt-6">
        <div className="xl:col-span-12 col-span-12 h-full flex flex-col">
          <div className="box custom-box h-full flex flex-col">
            <div className="box-header flex items-center justify-between flex-wrap gap-4">
              <div className="box-title">
                Mentors
                <span className="badge bg-light text-default rounded-full ms-1 text-[0.75rem] align-middle">
                  {filteredData.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  className="form-control !w-auto !py-1 !px-4 !text-[0.75rem] me-2"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                >
                  {[10, 25, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      Show {size}
                    </option>
                  ))}
                </select>
                <Link
                  href="/training/mentors/add"
                  className="ti-btn ti-btn-primary-full !py-1 !px-2 !text-[0.75rem] me-2"
                >
                  <i className="ri-add-line font-semibold align-middle"></i>Add Mentor
                </Link>
                <div className="relative me-2">
                  <input
                    type="text"
                    className="form-control !py-1 !px-2 !text-[0.75rem] !pe-8"
                    placeholder="Search mentors..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setCurrentPage(1)
                    }}
                  />
                  <i className="ri-search-line absolute top-1/2 -translate-y-1/2 end-2 text-gray-400"></i>
                </div>
                <button
                  type="button"
                  className="ti-btn ti-btn-danger !py-1 !px-2 !text-[0.75rem]"
                  onClick={handleDeleteSelected}
                  disabled={selectedRows.size === 0}
                >
                  <i className="ri-delete-bin-line font-semibold align-middle me-1"></i>Delete
                </button>
              </div>
            </div>
            <div className="box-body !p-0 flex-1 flex flex-col overflow-hidden">
              <div className="table-responsive flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
                <table {...getTableProps()} className="table whitespace-nowrap min-w-full table-striped table-hover table-bordered border-gray-300 dark:border-gray-600">
                  <thead>
                    {headerGroups.map((headerGroup: any, i) => (
                      <tr {...headerGroup.getHeaderGroupProps()} className="bg-primary/10 dark:bg-primary/20 border-b border-gray-300 dark:border-gray-600" key={`header-group-${i}`}>
                        {headerGroup.headers.map((column: any, j) => (
                          <th
                            {...column.getHeaderProps()}
                            scope="col"
                            className="text-start sticky top-0 z-10 bg-gray-50 dark:bg-black/20"
                            key={column.id || `col-${j}`}
                            style={{ 
                              position: 'sticky', 
                              top: 0, 
                              zIndex: 10
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <span className="tabletitle">{column.render('Header')}</span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody {...getTableBodyProps()}>
                    {loading ? (
                      <tr>
                        <td colSpan={columns.length} className="text-center py-8">
                          <div className="flex flex-col items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                            <span className="text-gray-600 dark:text-gray-400">Loading mentors...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredData.length === 0 ? (
                      <tr>
                        <td colSpan={columns.length} className="text-center py-8">
                          <div className="flex flex-col items-center justify-center">
                            <i className="ri-inbox-line text-4xl text-gray-400 mb-2"></i>
                            <span className="text-gray-600 dark:text-gray-400">No mentors found</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredData.map((mentor) => {
                        const row = {
                          original: mentor,
                          getRowProps: () => ({}),
                          cells: columns.map((col: any) => ({
                            render: (type: string) => {
                              if (type === 'Cell') {
                                if (col.Cell) {
                                  return col.Cell({ row: { original: mentor } })
                                }
                                return mentor[col.accessor as keyof MentorRow]
                              }
                              return null
                            },
                            getCellProps: () => ({})
                          }))
                        }
                        return (
                          <tr className="border-b border-gray-300 dark:border-gray-600" key={mentor.id}>
                            {row.cells.map((cell: any, idx: number) => (
                              <td key={idx}>
                                {cell.render('Cell')}
                              </td>
                            ))}
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="box-footer !border-t-0">
              <div className="flex items-center flex-wrap gap-4">
                <div>
                  Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalResults)} of {totalResults} entries{' '}
                  <i className="bi bi-arrow-right ms-2 font-semibold"></i>
                </div>
                <div className="ms-auto">
                  <nav aria-label="Page navigation" className="pagination-style-4">
                    <ul className="ti-pagination mb-0">
                      <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                        <button
                          className="page-link px-3 py-[0.375rem]"
                          onClick={() => setCurrentPage(currentPage - 1)}
                          disabled={currentPage === 1}
                        >
                          Prev
                        </button>
                      </li>
                      {totalPages <= 7 ? (
                        Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <li
                            key={page}
                            className={`page-item ${currentPage === page ? 'active' : ''}`}
                          >
                            <button
                              className="page-link px-3 py-[0.375rem]"
                              onClick={() => setCurrentPage(page)}
                            >
                              {page}
                            </button>
                          </li>
                        ))
                      ) : (
                        <>
                          {currentPage > 2 && (
                            <>
                              <li className="page-item">
                                <button
                                  className="page-link px-3 py-[0.375rem]"
                                  onClick={() => setCurrentPage(1)}
                                >
                                  1
                                </button>
                              </li>
                              {currentPage > 3 && (
                                <li className="page-item disabled">
                                  <span className="page-link px-3 py-[0.375rem]">...</span>
                                </li>
                              )}
                            </>
                          )}
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum
                            if (currentPage < 3) {
                              pageNum = i + 1
                            } else if (currentPage > totalPages - 3) {
                              pageNum = totalPages - 4 + i
                            } else {
                              pageNum = currentPage - 2 + i
                            }
                            return (
                              <li
                                key={pageNum}
                                className={`page-item ${currentPage === pageNum ? 'active' : ''}`}
                              >
                                <button
                                  className="page-link px-3 py-[0.375rem]"
                                  onClick={() => setCurrentPage(pageNum)}
                                >
                                  {pageNum}
                                </button>
                              </li>
                            )
                          })}
                          {currentPage < totalPages - 2 && (
                            <>
                              {currentPage < totalPages - 3 && (
                                <li className="page-item disabled">
                                  <span className="page-link px-3 py-[0.375rem]">...</span>
                                </li>
                              )}
                              <li className="page-item">
                                <button
                                  className="page-link px-3 py-[0.375rem]"
                                  onClick={() => setCurrentPage(totalPages)}
                                >
                                  {totalPages}
                                </button>
                              </li>
                            </>
                          )}
                        </>
                      )}
                      <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                        <button
                          className="page-link px-3 py-[0.375rem]"
                          onClick={() => setCurrentPage(currentPage + 1)}
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </button>
                      </li>
                    </ul>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <MentorViewModal
        mentor={viewMentor}
        isLoading={viewMentorLoading}
        onClose={() => setViewMentor(null)}
      />

      <MentorProfileImageModal
        mentor={profileImageMentor}
        profileImageUrl={profileImageUrl}
        profileImageLoading={profileImageLoading}
        profileImageUploading={profileImageUploading}
        profileImageError={profileImageError}
        onClose={() => {
          setProfileImageMentor(null)
          setProfileImageUrl(null)
          setProfileImageError(null)
        }}
        onFileChange={handleProfileImageFileChange}
      />
    </Fragment>
  )
}

export default Mentors
