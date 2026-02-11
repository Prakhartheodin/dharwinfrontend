"use client"
import Pageheader from '@/shared/layout-components/page-header/pageheader'
import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment, useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { useTable, useSortBy } from 'react-table'
import Link from 'next/link'
import Swal from 'sweetalert2'
import { AxiosError } from 'axios'
import * as mentorsApi from '@/shared/lib/api/mentors'
import type { Mentor } from '@/shared/lib/api/mentors'

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
      // Trigger modal via Preline's trigger button
      setTimeout(() => {
        const trigger = document.getElementById('view-mentor-modal-trigger')
        if (trigger) {
          trigger.click()
        }
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

      // Open modal via hidden trigger (Preline)
      setTimeout(() => {
        const trigger = document.getElementById('mentor-profile-image-modal-trigger')
        if (trigger) {
          trigger.click()
        }
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
  
      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-8rem)]">
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
                    {headerGroups.map((headerGroup: any) => (
                      <tr {...headerGroup.getHeaderGroupProps()} className="bg-primary/10 dark:bg-primary/20 border-b border-gray-300 dark:border-gray-600" key={Math.random()}>
                        {headerGroup.headers.map((column: any) => (
                          <th
                            {...column.getHeaderProps()}
                            scope="col"
                            className="text-start sticky top-0 z-10 bg-gray-50 dark:bg-black/20"
                            key={Math.random()}
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

      {/* Hidden trigger button for view mentor modal (needed for Preline) */}
      <button 
        id="view-mentor-modal-trigger"
        type="button"
        style={{ display: 'none' }}
        data-hs-overlay="#view-mentor-modal"
      ></button>

      {/* View Mentor Detailed Modal */}
      <div 
        id="view-mentor-modal" 
        className="hs-overlay hidden ti-modal"
      >
        <div className="hs-overlay-open:mt-7 ti-modal-box mt-0 ease-out lg:!max-w-4xl lg:w-full m-3 lg:!mx-auto">
          <div className="ti-modal-content">
            <div className="ti-modal-header">
              <h6 className="ti-modal-title flex items-center gap-2">
                <i className="ri-eye-line text-primary"></i>
                Mentor Details
              </h6>
              <button 
                type="button" 
                className="hs-dropdown-toggle ti-modal-close-btn" 
                data-hs-overlay="#view-mentor-modal"
                onClick={() => setViewMentor(null)}
              >
                <span className="sr-only">Close</span>
                <svg className="w-3.5 h-3.5" width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0.258206 1.00652C0.351976 0.912791 0.479126 0.860131 0.611706 0.860131C0.744296 0.860131 0.871447 0.912791 0.965207 1.00652L3.61171 3.65302L6.25822 1.00652C6.30432 0.958771 6.35952 0.920671 6.42052 0.894471C6.48152 0.868271 6.54712 0.854471 6.61352 0.853901C6.67992 0.853321 6.74572 0.865971 6.80722 0.891111C6.86862 0.916251 6.92442 0.953381 6.97142 1.00032C7.01832 1.04727 7.05552 1.1031 7.08062 1.16454C7.10572 1.22599 7.11842 1.29183 7.11782 1.35822C7.11722 1.42461 7.10342 1.49022 7.07722 1.55122C7.05102 1.61222 7.01292 1.6674 6.96522 1.71352L4.31871 4.36002L6.96522 7.00648C7.05632 7.10078 7.10672 7.22708 7.10552 7.35818C7.10442 7.48928 7.05182 7.61468 6.95912 7.70738C6.86642 7.80018 6.74102 7.85268 6.60992 7.85388C6.47882 7.85498 6.35252 7.80458 6.25822 7.71348L3.61171 5.06702L0.965207 7.71348C0.870907 7.80458 0.744606 7.85498 0.613506 7.85388C0.482406 7.85268 0.357007 7.80018 0.264297 7.70738C0.171597 7.61468 0.119017 7.48928 0.117877 7.35818C0.116737 7.22708 0.167126 7.10078 0.258206 7.00648L2.90471 4.36002L0.258206 1.71352C0.164476 1.61976 0.111816 1.4926 0.111816 1.36002C0.111816 1.22744 0.164476 1.10028 0.258206 1.00652Z" fill="currentColor"/>
                </svg>
              </button>
            </div>
            <div className="ti-modal-body">
              {viewMentorLoading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="mt-4 text-gray-500 dark:text-gray-400">Loading mentor details...</p>
                </div>
              ) : viewMentor ? (
                <div className="space-y-6">
                  {/* Mentor Header */}
                  <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 dark:border-primary/30 rounded-lg">
                    <img
                      src={viewMentor.profileImageUrl || '/assets/images/faces/1.jpg'}
                      alt={viewMentor.user?.name || 'Mentor'}
                      className="w-20 h-20 rounded-full object-cover border-2 border-primary/30"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/assets/images/faces/1.jpg'
                      }}
                    />
                    <div className="flex-1">
                      <h6 className="font-bold text-gray-800 dark:text-white text-xl mb-1">{viewMentor.user?.name || 'Unknown'}</h6>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <i className="ri-mail-line"></i>
                          {viewMentor.user?.email || 'N/A'}
                        </span>
                        {viewMentor.phone && (
                          <span className="flex items-center gap-1">
                            <i className="ri-phone-line"></i>
                            {viewMentor.phone}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <i className="ri-user-settings-line"></i>
                          Status: <span className="font-semibold capitalize">{viewMentor.status}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Personal Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {viewMentor.dateOfBirth && (
                      <div className="p-3 bg-gray-50 dark:bg-black/20 rounded-lg border border-gray-200 dark:border-defaultborder/10">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Date of Birth</div>
                        <div className="font-semibold text-gray-800 dark:text-white">
                          {new Date(viewMentor.dateOfBirth).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                    {viewMentor.gender && (
                      <div className="p-3 bg-gray-50 dark:bg-black/20 rounded-lg border border-gray-200 dark:border-defaultborder/10">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Gender</div>
                        <div className="font-semibold text-gray-800 dark:text-white capitalize">{viewMentor.gender}</div>
                      </div>
                    )}
                  </div>

                  {/* Address */}
                  {viewMentor.address && (viewMentor.address.street || viewMentor.address.city || viewMentor.address.state || viewMentor.address.country) && (
                    <div className="p-4 border border-gray-200 dark:border-defaultborder/10 rounded-lg">
                      <h6 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                        <i className="ri-map-pin-line text-primary"></i>
                        Address
                      </h6>
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        {[
                          viewMentor.address.street,
                          viewMentor.address.city,
                          viewMentor.address.state,
                          viewMentor.address.zipCode,
                          viewMentor.address.country
                        ].filter(Boolean).join(', ')}
                      </div>
                    </div>
                  )}

                  {/* Expertise */}
                  {viewMentor.expertise && viewMentor.expertise.length > 0 && (
                    <div className="p-4 border border-gray-200 dark:border-defaultborder/10 rounded-lg">
                      <h6 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                        <i className="ri-star-line text-primary"></i>
                        Expertise
                      </h6>
                      <div className="space-y-3">
                        {viewMentor.expertise.map((exp, index) => (
                          <div key={index} className="p-3 bg-gray-50 dark:bg-black/20 rounded-lg">
                            <div className="font-semibold text-gray-800 dark:text-white">
                              {exp.area || 'N/A'} {exp.level && `(${exp.level})`}
                            </div>
                            {exp.yearsOfExperience && (
                              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {exp.yearsOfExperience} years of experience
                              </div>
                            )}
                            {exp.description && (
                              <div className="text-sm text-gray-700 dark:text-gray-300 mt-2">{exp.description}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Work Experience */}
                  {viewMentor.experience && viewMentor.experience.length > 0 && (
                    <div className="p-4 border border-gray-200 dark:border-defaultborder/10 rounded-lg">
                      <h6 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                        <i className="ri-briefcase-line text-primary"></i>
                        Work Experience
                      </h6>
                      <div className="space-y-3">
                        {viewMentor.experience.map((exp, index) => (
                          <div key={index} className="p-3 bg-gray-50 dark:bg-black/20 rounded-lg">
                            <div className="font-semibold text-gray-800 dark:text-white">
                              {exp.title || 'N/A'} {exp.company && `at ${exp.company}`}
                            </div>
                            {exp.location && (
                              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                <i className="ri-map-pin-line"></i> {exp.location}
                              </div>
                            )}
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {exp.startDate && new Date(exp.startDate).toLocaleDateString()} - {' '}
                              {exp.isCurrent ? 'Present' : (exp.endDate ? new Date(exp.endDate).toLocaleDateString() : 'N/A')}
                            </div>
                            {exp.description && (
                              <div className="text-sm text-gray-700 dark:text-gray-300 mt-2">{exp.description}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Certifications */}
                  {viewMentor.certifications && viewMentor.certifications.length > 0 && (
                    <div className="p-4 border border-gray-200 dark:border-defaultborder/10 rounded-lg">
                      <h6 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                        <i className="ri-award-line text-primary"></i>
                        Certifications
                      </h6>
                      <div className="space-y-3">
                        {viewMentor.certifications.map((cert, index) => (
                          <div key={index} className="p-3 bg-gray-50 dark:bg-black/20 rounded-lg">
                            <div className="font-semibold text-gray-800 dark:text-white">
                              {cert.name}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              Issued by: {cert.issuer}
                            </div>
                            {cert.credentialId && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Credential ID: {cert.credentialId}
                              </div>
                            )}
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {cert.issueDate && `Issued: ${new Date(cert.issueDate).toLocaleDateString()}`}
                              {cert.expiryDate && ` • Expires: ${new Date(cert.expiryDate).toLocaleDateString()}`}
                            </div>
                            {cert.credentialUrl && (
                              <a
                                href={cert.credentialUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline mt-1 inline-block"
                              >
                                <i className="ri-external-link-line"></i> Verify credential
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Skills */}
                  {viewMentor.skills && viewMentor.skills.length > 0 && (
                    <div className="p-4 border border-gray-200 dark:border-defaultborder/10 rounded-lg">
                      <h6 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                        <i className="ri-tools-line text-primary"></i>
                        Skills
                      </h6>
                      <div className="flex flex-wrap gap-2">
                        {viewMentor.skills.map((skill, index) => (
                          <span
                            key={index}
                            className="badge bg-primary/10 text-primary border border-primary/30 px-3 py-1 rounded-md text-sm font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bio */}
                  {viewMentor.bio && (
                    <div className="p-4 border border-gray-200 dark:border-defaultborder/10 rounded-lg">
                      <h6 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                        <i className="ri-file-text-line text-primary"></i>
                        Bio
                      </h6>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        {viewMentor.bio}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">No mentor selected</div>
              )}
            </div>
            <div className="ti-modal-footer">
              <button 
                type="button" 
                className="ti-btn ti-btn-light" 
                data-hs-overlay="#view-mentor-modal"
                onClick={() => setViewMentor(null)}
              >
                Close
              </button>
              {viewMentor && (
                <Link
                  href={`/training/mentors/edit/?id=${encodeURIComponent(viewMentor.id)}`}
                  className="ti-btn ti-btn-primary"
                  onClick={() => {
                    const trigger = document.getElementById('view-mentor-modal-trigger')
                    if (trigger) {
                      trigger.click()
                    }
                  }}
                >
                  <i className="ri-pencil-line me-1"></i>
                  Edit Mentor
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hidden trigger for profile image modal */}
      <button
        id="mentor-profile-image-modal-trigger"
        type="button"
        style={{ display: 'none' }}
        data-hs-overlay="#mentor-profile-image-modal"
      ></button>

      {/* Mentor profile image modal */}
      <div
        id="mentor-profile-image-modal"
        className="hs-overlay hidden ti-modal"
        tabIndex={-1}
      >
        <div className="hs-overlay-open:mt-7 ti-modal-box mt-0 ease-out">
          <div className="ti-modal-content">
            <div className="ti-modal-header">
              <h6 className="modal-title text-[1rem] font-semibold text-default dark:text-defaulttextcolor/70">
                {profileImageMentor
                  ? `Profile Image – ${profileImageMentor.name}`
                  : 'Profile Image'}
              </h6>
              <button
                type="button"
                className="hs-dropdown-toggle !text-[1rem] !font-semibold"
                data-hs-overlay="#mentor-profile-image-modal"
                onClick={() => {
                  setProfileImageMentor(null)
                  setProfileImageUrl(null)
                  setProfileImageError(null)
                }}
              >
                <span className="sr-only">Close</span>
                <i className="ri-close-line"></i>
              </button>
            </div>
            <div className="ti-modal-body px-6 space-y-4">
              {profileImageLoading ? (
                <p className="text-sm text-defaulttextcolor/70 mb-0">
                  Loading current profile image...
                </p>
              ) : profileImageUrl ? (
                <div className="flex flex-col items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={profileImageUrl}
                    alt={profileImageMentor?.name || 'Profile image'}
                    className="w-24 h-24 rounded-full object-cover border border-defaultborder"
                  />
                  <p className="text-xs text-defaulttextcolor/60 mb-0">
                    This preview URL is temporary and may expire; refresh to get a new one.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-defaulttextcolor/70 mb-0">
                  No profile image has been uploaded for this mentor yet.
                </p>
              )}

              {profileImageError && (
                <div className="p-2 rounded border border-danger/20 bg-danger/5 text-danger text-xs">
                  {profileImageError}
                </div>
              )}

              <div className="space-y-2">
                <label
                  htmlFor="mentor-profile-image-file"
                  className="form-label text-sm font-medium"
                >
                  {profileImageUrl ? 'Change picture' : 'Add picture'}
                </label>
                <input
                  id="mentor-profile-image-file"
                  type="file"
                  accept="image/*"
                  className="form-control"
                  onChange={handleProfileImageFileChange}
                  disabled={profileImageUploading || !profileImageMentor}
                />
                <p className="text-[0.75rem] text-defaulttextcolor/70 mt-1 mb-0">
                  Allowed types: PNG, JPG, JPEG. The image is uploaded securely and stored on the
                  file storage backend.
                </p>
                {profileImageUploading && (
                  <p className="text-[0.75rem] text-primary mt-1 mb-0">
                    Uploading profile image...
                  </p>
                )}
              </div>
            </div>
            <div className="ti-modal-footer">
              <button
                type="button"
                className="ti-btn ti-btn-light align-middle"
                data-hs-overlay="#mentor-profile-image-modal"
                onClick={() => {
                  setProfileImageMentor(null)
                  setProfileImageUrl(null)
                  setProfileImageError(null)
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  )
}

export default Mentors
