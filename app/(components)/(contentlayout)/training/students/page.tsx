"use client"
import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment, useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { useTable, useSortBy } from 'react-table'
import Link from 'next/link'
import Swal from 'sweetalert2'
import { AxiosError } from 'axios'
import * as studentsApi from '@/shared/lib/api/students'
import type {
  StudentNote,
} from '@/shared/lib/api/students'
import StudentViewModal from './_components/StudentViewModal'
import StudentProfileImageModal from './_components/StudentProfileImageModal'
import StudentFilters from './_components/StudentFilters'
import StudentRowActions from './_components/StudentRowActions'
import StudentColumnHeaderFilter from './_components/StudentColumnHeaderFilter'
import { getInitials } from '@/shared/lib/initials'
import { buildStudentProfileShareUrl } from '@/shared/lib/training/student-share'
import ListPagination from '@/shared/components/ListPagination'
import { downloadStudentProfileXlsx } from '@/shared/lib/student-profile-export'
import {
  MISSING_PROFILE_VALUE,
  mapStudentToRow,
  type StudentListRow,
} from '@/shared/lib/training/student-list-row'
import {
  DEFAULT_STUDENT_SORT_API,
  isStudentSortOption,
  nextStudentColumnSort,
  sortOptionToApiSortBy,
  studentColumnAriaSort,
  studentColumnSortFlags,
  studentHeaderSortColumn,
  studentSortButtonAriaLabel,
  type StudentSortOption,
} from '@/shared/lib/training/student-list-sort'
import { SortHeaderLabel } from '../evaluation/_components/evaluation-table-parts'
import {
  buildStudentExportParams,
  buildStudentListParams,
  studentHeaderFilterKey,
  type StudentHeaderFilterKey,
  type StudentStatusFilter,
} from '@/shared/lib/training/student-list-filters'
import { useAuth } from '@/shared/contexts/auth-context'
import { hasPermission } from '@/shared/lib/permissions'
import { closeHsOverlay, openHsOverlay } from '../evaluation/_components/evaluation-overlay'

interface FilterState {
  name: string[]
  skills: string[]
  education: string[]
  email: string
  experience: [number, number] // [min, max] in years
}

// Default experience range when no data is available
const DEFAULT_EXPERIENCE_RANGE: [number, number] = [0, 50]

function StudentRowAvatar({
  name,
  imageUrl,
  className = 'w-10 h-10 rounded-full',
  onClick,
  onKeyDown,
}: {
  name: string
  imageUrl?: string | null
  className?: string
  onClick?: () => void
  onKeyDown?: (e: React.KeyboardEvent) => void
}) {
  const [imgFailed, setImgFailed] = useState(false)
  const showImg = Boolean(imageUrl) && !imgFailed
  const interactive = Boolean(onClick)

  if (showImg) {
    return (
      <img
        src={imageUrl!}
        alt={name}
        className={`object-cover flex-shrink-0 ${interactive ? 'cursor-pointer' : ''} ${className}`}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        onKeyDown={onKeyDown}
        onClick={onClick}
        onError={() => setImgFailed(true)}
      />
    )
  }

  return (
    <span
      className={`flex items-center justify-center bg-primary/10 text-primary font-semibold text-sm flex-shrink-0 ring-1 ring-primary/15 ${interactive ? 'cursor-pointer' : ''} ${className}`}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={onKeyDown}
      onClick={onClick}
      aria-label={name}
    >
      {getInitials(name)}
    </span>
  )
}

// Interface for display purposes (mapped from User)
type StudentRow = StudentListRow

const missingProfileClass = 'text-sm text-gray-600 dark:text-gray-300'

const Students = () => {
  const auth = useAuth()
  const canManageStudents = hasPermission(auth, 'manage_training_students')
  const [students, setStudents] = useState<StudentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [studentNotes, setStudentNotes] = useState<StudentNote[]>([])
  const [previewStudent, setPreviewStudent] = useState<any>(null)
  const [viewStudent, setViewStudent] = useState<studentsApi.Student | null>(null)
  const [viewStudentLoading, setViewStudentLoading] = useState(false)
  const [viewingStudentId, setViewingStudentId] = useState<string | null>(null)
  const [notesStudentId, setNotesStudentId] = useState<string | null>(null)
  const [newNote, setNewNote] = useState({ text: '', visibility: 'public' as 'public' | 'private' })
  const [selectedSort, setSelectedSort] = useState<StudentSortOption>('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StudentStatusFilter>('active')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalResults, setTotalResults] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [sortBy, setSortBy] = useState<string>(DEFAULT_STUDENT_SORT_API)
  // Excel + Sort menus: fully React-controlled — Preline hs-dropdown hooks were unreliable here (button never opened).
  const [excelMenuOpen, setExcelMenuOpen] = useState(false)
  const [sortMenuOpen, setSortMenuOpen] = useState(false)
  const [excelExporting, setExcelExporting] = useState(false)
  const [downloadingStudentId, setDownloadingStudentId] = useState<string | null>(null)
  const [bulkDeactivating, setBulkDeactivating] = useState(false)
  const [filtersLoading, setFiltersLoading] = useState(false)
  /** React-controlled filters panel — Preline data-hs-overlay misses registration after SPA navigation. */
  const [filterPanelOpen, setFilterPanelOpen] = useState(false)
  const [toolbarMenuOpen, setToolbarMenuOpen] = useState(false)
  const [openRowActionsMenuId, setOpenRowActionsMenuId] = useState<string | null>(null)
  const excelDropdownRef = useRef<HTMLDivElement | null>(null)
  const sortDropdownRef = useRef<HTMLDivElement | null>(null)
  const toolbarDropdownRef = useRef<HTMLDivElement | null>(null)
  const viewRequestIdRef = useRef(0)
  const fetchGenerationRef = useRef(0)

  // Profile image modal state
  const [profileImageStudent, setProfileImageStudent] = useState<StudentRow | null>(null)
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null)
  const [profileImageLoading, setProfileImageLoading] = useState(false)
  const [profileImageUploading, setProfileImageUploading] = useState(false)
  const [profileImageError, setProfileImageError] = useState<string | null>(null)
  
  const [filters, setFilters] = useState<FilterState>({
    name: [],
    skills: [],
    education: [],
    email: '',
    experience: [DEFAULT_EXPERIENCE_RANGE[0], DEFAULT_EXPERIENCE_RANGE[1]]
  })
  const [filterOptions, setFilterOptions] = useState<studentsApi.StudentFilterOptions>({
    names: [],
    skills: [],
    education: [],
    emails: [],
    experience: { min: DEFAULT_EXPERIENCE_RANGE[0], max: DEFAULT_EXPERIENCE_RANGE[1] },
  })

  const experienceRanges = useMemo(
    () => ({
      min: filterOptions.experience.min ?? DEFAULT_EXPERIENCE_RANGE[0],
      max: filterOptions.experience.max ?? DEFAULT_EXPERIENCE_RANGE[1],
    }),
    [filterOptions.experience.min, filterOptions.experience.max]
  )

  const listQueryInput = useMemo(
    () => ({
      page: currentPage,
      limit: pageSize,
      sortBy,
      search: debouncedSearchQuery,
      statusFilter,
      filters,
      experienceBounds: experienceRanges,
      studentRoleOnly: statusFilter !== 'inactive',
    }),
    [currentPage, pageSize, sortBy, debouncedSearchQuery, statusFilter, filters, experienceRanges]
  )

  // Search states for filter dropdowns
  const [searchName, setSearchName] = useState('')
  const [searchSkills, setSearchSkills] = useState('')
  const [searchEducation, setSearchEducation] = useState('')

  // Handle individual row checkbox
  const handleRowSelect = (id: string) => {
    const newSelected = new Set(selectedRows)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedRows(newSelected)
  }

  const openStudentViewModal = useCallback(() => {
    setTimeout(() => {
      const modalEl = document.querySelector('#view-student-modal')
      const HSOverlay = (window as { HSOverlay?: { open: (target: Element | string) => void } }).HSOverlay
      const HSStaticMethods = (window as { HSStaticMethods?: { autoInit?: () => void } }).HSStaticMethods
      if (HSStaticMethods?.autoInit) HSStaticMethods.autoInit()
      if (modalEl && HSOverlay?.open) {
        HSOverlay.open(modalEl)
      } else if (HSOverlay?.open) {
        HSOverlay.open('#view-student-modal')
      }
    }, 50)
  }, [])

  const closePreviewPanel = useCallback(() => {
    const modalEl = document.querySelector('#student-preview-panel')
    const HSOverlay = (window as { HSOverlay?: { close: (target: Element | string) => void } }).HSOverlay
    if (modalEl && HSOverlay?.close) {
      HSOverlay.close(modalEl)
    } else if (HSOverlay?.close) {
      HSOverlay.close('#student-preview-panel')
    }
    setPreviewStudent(null)
  }, [])

  // Handle view student - open modal immediately, then fetch full details
  const handleViewStudent = async (studentId: string) => {
    const requestId = ++viewRequestIdRef.current
    setViewStudent(null)
    setViewStudentLoading(true)
    setViewingStudentId(studentId)
    openStudentViewModal()
    try {
      const student = await studentsApi.getStudent(studentId)
      if (requestId !== viewRequestIdRef.current) return
      setViewStudent(student)
    } catch (err) {
      if (requestId !== viewRequestIdRef.current) return
      setViewStudent(null)
      const modalEl = document.querySelector('#view-student-modal')
      const HSOverlay = (window as { HSOverlay?: { close: (target: Element | string) => void } }).HSOverlay
      if (modalEl && HSOverlay?.close) {
        HSOverlay.close(modalEl)
      } else if (HSOverlay?.close) {
        HSOverlay.close('#view-student-modal')
      }
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : 'Failed to load student details.'
      await Swal.fire({
        icon: 'error',
        title: 'Failed to load student',
        text: msg,
        toast: true,
        position: 'top-end',
        timer: 4000,
        showConfirmButton: false,
        timerProgressBar: true,
      })
    } finally {
      if (requestId === viewRequestIdRef.current) {
        setViewStudentLoading(false)
        setViewingStudentId(null)
      }
    }
  }

  // Handle add note - open notes sidebar
  const handleAddNote = async (id: string) => {
    setNotesStudentId(id)
    try {
      const response = await studentsApi.listStudentNotes(id)
      setStudentNotes(response.results ?? [])
    } catch {
      setStudentNotes([])
    }

    setTimeout(() => {
      ;(window as any).HSOverlay?.open(document.querySelector('#student-notes-panel'))
    }, 100)
  }

  // Get notes for a specific student
  const getStudentNotes = (studentId: string) => {
    return studentNotes
      .filter((note) => String(note.student) === String(studentId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  // Add a new note
  const handleAddNoteSubmit = async () => {
    if (!notesStudentId || !newNote.text.trim() || !canManageStudents) return

    try {
      const created = await studentsApi.createStudentNote(notesStudentId, {
        note: newNote.text.trim(),
        visibility: newNote.visibility,
      })
      setStudentNotes((prev) => [created, ...prev])
      setNewNote({ text: '', visibility: 'public' })
    } catch (err) {
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : 'Failed to add note.'
      await Swal.fire({ icon: 'error', title: 'Failed to add note', text: msg, toast: true, position: 'top-end', timer: 3000, showConfirmButton: false })
    }
  }

  // Delete a note
  const handleDeleteNote = async (noteId: string) => {
    if (!canManageStudents) return
    try {
      await studentsApi.deleteStudentNote(noteId)
      setStudentNotes((prev) => prev.filter((note) => note.id !== noteId))
    } catch (err) {
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : 'Failed to delete note.'
      await Swal.fire({ icon: 'error', title: 'Failed to delete note', text: msg, toast: true, position: 'top-end', timer: 3000, showConfirmButton: false })
    }
  }

  const openProfileImageModal = useCallback(
    async (student: StudentRow) => {
      setProfileImageStudent(student)
      setProfileImageUrl(null)
      setProfileImageError(null)
      setProfileImageLoading(true)

      try {
        if (!student.hasProfileImage) {
          setProfileImageUrl(null)
        } else {
          const info = await studentsApi.getStudentProfileImage(student.id)
          setProfileImageUrl(info?.url ?? student.displayPicture)
        }
      } catch (err) {
        setProfileImageError('Unable to load profile image. You can still upload a new one.')
      } finally {
        setProfileImageLoading(false)
      }

      setTimeout(() => {
        ;(window as any).HSOverlay?.open(document.querySelector('#student-profile-image-modal'))
      }, 50)
    },
    []
  )

  const handleProfileImageFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0]
    if (!file || !profileImageStudent) return

    setProfileImageUploading(true)
    setProfileImageError(null)

    try {
      await studentsApi.uploadStudentProfileImage(profileImageStudent.id, file)

      const info = await studentsApi.getStudentProfileImage(profileImageStudent.id)
      const nextUrl = info?.url ?? null
      setProfileImageUrl(nextUrl)

      setStudents((prev) =>
        prev.map((row) =>
          row.id === profileImageStudent.id
            ? {
                ...row,
                hasProfileImage: true,
                displayPicture: nextUrl || row.displayPicture,
              }
            : row
        )
      )
      setProfileImageStudent((prev) =>
        prev ? { ...prev, hasProfileImage: true } : prev
      )

      await Swal.fire({
        icon: 'success',
        title: 'Profile image updated',
        text: `The profile image for "${profileImageStudent.name}" has been updated.`,
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

  // Use ref to store fetchStudents to avoid circular dependencies
  const fetchStudentsRef = useRef<() => Promise<void>>()

  // Fetch students from Students API
  const fetchStudents = useCallback(async () => {
    const generation = ++fetchGenerationRef.current
    setLoading(true)
    try {
      const params = buildStudentListParams(listQueryInput)
      const response = await studentsApi.listStudents(params)

      if (generation !== fetchGenerationRef.current) return

      const mappedStudents = response.results.map(mapStudentToRow)
      setStudents(mappedStudents)
      setTotalResults(response.totalResults)
      setTotalPages(response.totalPages)
    } catch (err) {
      if (generation !== fetchGenerationRef.current) return

      console.error('Error fetching students:', err)
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : err instanceof Error
          ? err.message
          : 'Failed to load students.'
      await Swal.fire({
        icon: 'error',
        title: 'Failed to load students',
        text: msg,
        toast: true,
        position: 'top-end',
        timer: 4000,
        showConfirmButton: false,
        timerProgressBar: true,
      })
      setStudents([])
      setTotalResults(0)
      setTotalPages(0)
    } finally {
      if (generation === fetchGenerationRef.current) {
        setLoading(false)
      }
    }
  }, [listQueryInput])

  const fetchFilterOptions = useCallback(async () => {
    setFiltersLoading(true)
    try {
      const options = await studentsApi.getStudentFilterOptions({
        status: statusFilter,
        ...(statusFilter !== 'inactive' ? { studentRoleOnly: true } : {}),
        ...(debouncedSearchQuery.trim() && { search: debouncedSearchQuery.trim() }),
      })
      setFilterOptions(options)
    } catch {
      setFilterOptions({
        names: [],
        skills: [],
        education: [],
        emails: [],
        experience: { min: DEFAULT_EXPERIENCE_RANGE[0], max: DEFAULT_EXPERIENCE_RANGE[1] },
      })
    } finally {
      setFiltersLoading(false)
    }
  }, [statusFilter, debouncedSearchQuery])

  // Close Excel / Sort menus on outside click or Escape.
  useEffect(() => {
    if (!excelMenuOpen && !sortMenuOpen && !toolbarMenuOpen) return
    const onDoc = (e: MouseEvent) => {
      if (excelMenuOpen && !excelDropdownRef.current?.contains(e.target as Node)) {
        setExcelMenuOpen(false)
      }
      if (sortMenuOpen && !sortDropdownRef.current?.contains(e.target as Node)) {
        setSortMenuOpen(false)
      }
      if (toolbarMenuOpen && !toolbarDropdownRef.current?.contains(e.target as Node)) {
        setToolbarMenuOpen(false)
      }
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setExcelMenuOpen(false)
        setSortMenuOpen(false)
        setToolbarMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [excelMenuOpen, sortMenuOpen, toolbarMenuOpen])

  /** Download students (respecting the active search) as an .xlsx file. */
  const handleExportStudents = useCallback(async () => {
    setExcelMenuOpen(false)
    setExcelExporting(true)
    try {
      const { blob, capped, totalResults: exportTotal, exportMax } = await studentsApi.exportStudentsExcel(
        buildStudentExportParams(listQueryInput)
      )
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const date = new Date().toISOString().slice(0, 10)
      a.href = url
      a.download = `students-export-${date}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      const cappedMessage =
        capped && exportTotal != null && exportMax != null
          ? `Export capped at ${exportMax.toLocaleString()} of ${exportTotal.toLocaleString()} matching students.`
          : 'Your students spreadsheet download has started.'
      await Swal.fire({
        icon: capped ? 'warning' : 'success',
        title: capped ? 'Export capped' : 'Export ready',
        text: cappedMessage,
        toast: true,
        position: 'top-end',
        timer: capped ? 4500 : 2500,
        showConfirmButton: false,
        timerProgressBar: true,
      })
    } catch (err) {
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : err instanceof Error
          ? err.message
          : 'Export failed.'
      await Swal.fire({ icon: 'error', title: 'Export failed', text: msg })
    } finally {
      setExcelExporting(false)
    }
  }, [listQueryInput])

  const openFilterPanel = useCallback(() => {
    setFilterPanelOpen(true)
    queueMicrotask(() => openHsOverlay('#students-filter-panel'))
  }, [])

  const closeFilterPanel = useCallback(() => {
    setFilterPanelOpen(false)
    closeHsOverlay('#students-filter-panel')
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchQuery(searchName)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [searchName])

  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, filters, sortBy, pageSize, debouncedSearchQuery])

  useEffect(() => {
    if (!filterPanelOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeFilterPanel()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [filterPanelOpen, closeFilterPanel])

  useEffect(() => {
    fetchFilterOptions()
  }, [fetchFilterOptions])

  // Update ref when fetchStudents changes
  useEffect(() => {
    fetchStudentsRef.current = fetchStudents
  }, [fetchStudents])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const viewId = params.get('view')?.trim()
    if (!viewId) return
    void handleViewStudent(viewId)
    params.delete('view')
    const next = params.toString()
    window.history.replaceState({}, '', next ? `${window.location.pathname}?${next}` : window.location.pathname)
  }, [])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  // Sync experience filter to data bounds when students load
  useEffect(() => {
    setFilters((prev) => {
      const isStillDefault =
        prev.experience[0] === DEFAULT_EXPERIENCE_RANGE[0] &&
        prev.experience[1] === DEFAULT_EXPERIENCE_RANGE[1]
      const needsSync =
        prev.experience[0] !== experienceRanges.min || prev.experience[1] !== experienceRanges.max
      if (isStillDefault && needsSync) {
        return { ...prev, experience: [experienceRanges.min, experienceRanges.max] }
      }
      return prev
    })
  }, [experienceRanges.min, experienceRanges.max])

  // Delete a single student
  const handleDelete = useCallback(async (id: string) => {
    if (!canManageStudents) return
    const result = await Swal.fire({
      title: 'Deactivate student?',
      text: 'This will deactivate the student profile and disable their user account.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, deactivate',
    })

    if (!result.isConfirmed) return

    try {
      await studentsApi.deleteStudent(id)
      await Swal.fire({
        icon: 'success',
        title: 'Deactivated',
        text: 'Student has been deactivated.',
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
      if (fetchStudentsRef.current) {
        await fetchStudentsRef.current()
      }
    } catch (err) {
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : 'Failed to delete student.'
      await Swal.fire({
        icon: 'error',
        title: 'Failed to deactivate student',
        text: msg,
        toast: true,
        position: 'top-end',
        timer: 4000,
        showConfirmButton: false,
        timerProgressBar: true,
      })
    }
  }, [canManageStudents])

  const handleDeleteSelected = useCallback(async () => {
    if (!canManageStudents) return
    if (selectedRows.size === 0) {
      await Swal.fire({
        icon: 'warning',
        title: 'No selection',
        text: 'Please select at least one student to deactivate.',
        toast: true,
        position: 'top-end',
        timer: 3000,
        showConfirmButton: false,
        timerProgressBar: true,
      })
      return
    }

    const result = await Swal.fire({
      title: 'Deactivate selected students?',
      text: `You are about to deactivate ${selectedRows.size} student(s).`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: `Yes, deactivate ${selectedRows.size} student(s)`,
    })

    if (!result.isConfirmed) return

    setBulkDeactivating(true)
    try {
      const ids = Array.from(selectedRows)
      const results = await Promise.allSettled(ids.map((id) => studentsApi.deleteStudent(id)))
      const succeeded = results.filter((r) => r.status === 'fulfilled').length
      const failed = results.length - succeeded

      if (failed === 0) {
        await Swal.fire({
          icon: 'success',
          title: 'Deactivated',
          text: `${succeeded} student(s) have been deactivated.`,
          toast: true,
          position: 'top-end',
          timer: 3000,
          showConfirmButton: false,
          timerProgressBar: true,
        })
        setSelectedRows(new Set())
        if (fetchStudentsRef.current) {
          await fetchStudentsRef.current()
        }
      } else {
        await Swal.fire({
          icon: failed === results.length ? 'error' : 'warning',
          title: failed === results.length ? 'Deactivation failed' : 'Partially deactivated',
          text:
            failed === results.length
              ? 'Failed to deactivate the selected students.'
              : `${succeeded} deactivated, ${failed} failed.`,
          toast: true,
          position: 'top-end',
          timer: 4000,
          showConfirmButton: false,
          timerProgressBar: true,
        })
        if (succeeded > 0 && fetchStudentsRef.current) {
          await fetchStudentsRef.current()
        }
      }
    } finally {
      setBulkDeactivating(false)
    }
  }, [selectedRows, canManageStudents])

  // Get student details for the notes sidebar
  const getStudentDetails = () => {
    if (!notesStudentId) return null
    return students.find(student => student.id === notesStudentId)
  }

  const handleDownloadStudentProfile = async (studentRow: StudentRow) => {
    setDownloadingStudentId(studentRow.id)
    try {
      const student = await studentsApi.getStudent(studentRow.id)
      downloadStudentProfileXlsx(student, studentRow.name)
      await Swal.fire({
        icon: 'success',
        title: 'Download started',
        text: `Student data for "${studentRow.name}" is downloading.`,
        toast: true,
        position: 'top-end',
        timer: 2500,
        showConfirmButton: false,
        timerProgressBar: true,
      })
    } catch (err) {
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : err instanceof Error
          ? err.message
          : 'Failed to download student data.'
      await Swal.fire({ icon: 'error', title: 'Download failed', text: msg })
    } finally {
      setDownloadingStudentId(null)
    }
  }

  const handleShareClick = async (student: StudentRow) => {
    if (typeof window === 'undefined') return
    const shareUrl = buildStudentProfileShareUrl(student.id, window.location.href)
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(shareUrl)
      await Swal.fire({
        icon: 'success',
        title: 'Link copied',
        text: 'Student profile link copied to clipboard.',
        toast: true,
        position: 'top-end',
        timer: 2500,
        showConfirmButton: false,
        timerProgressBar: true,
      })
    } catch {
      await Swal.fire({
        icon: 'error',
        title: 'Copy failed',
        text: 'Unable to copy the profile link.',
        toast: true,
        position: 'top-end',
        timer: 3000,
        showConfirmButton: false,
      })
    }
  }

  // Define columns
  const columns = useMemo(
    () => [
      {
        Header: 'Select',
        id: 'select',
        accessor: 'id',
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
        Header: 'Student Info',
        accessor: 'studentInfo',
        Cell: ({ row }: any) => {
          const student = row.original
          return (
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <StudentRowAvatar
                  name={student.name}
                  imageUrl={student.hasProfileImage ? student.displayPicture : null}
                  onClick={() => openProfileImageModal(student)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      openProfileImageModal(student)
                    }
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div 
                  className="font-semibold text-gray-800 dark:text-white truncate cursor-pointer hover:text-primary"
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setPreviewStudent(student)
                    setTimeout(() => {
                      ;(window as any).HSOverlay?.open(document.querySelector('#student-preview-panel'))
                    }, 100)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setPreviewStudent(student)
                      setTimeout(() => {
                        ;(window as any).HSOverlay?.open(document.querySelector('#student-preview-panel'))
                      }, 100)
                    }
                  }}
                  aria-label={`Preview ${student.name}`}
                >
                  {student.name}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-300 truncate">
                  <div className="flex items-center gap-1">
                    <i className="ri-phone-line" aria-hidden="true"></i>
                    {student.phone.trim() ? (
                      <a href={`tel:${student.phone}`} className="truncate hover:text-primary">{student.phone}</a>
                    ) : (
                      <span className={missingProfileClass}>{MISSING_PROFILE_VALUE}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <i className="ri-mail-line" aria-hidden="true"></i>
                    {student.email.trim() ? student.email : (
                      <span className={missingProfileClass}>{MISSING_PROFILE_VALUE}</span>
                    )}
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
          const student = row.original
          if (!student.skills?.length) {
            return <span className={missingProfileClass}>{MISSING_PROFILE_VALUE}</span>
          }
          return (
            <div className="flex flex-wrap gap-1.5 whitespace-normal">
              {student.skills.slice(0, 3).map((skill: string, index: number) => (
                <span
                  key={index}
                  className="badge bg-primary/10 text-primary border border-primary/30 px-2 py-1 rounded-md text-xs font-medium"
                >
                  {skill}
                </span>
              ))}
              {student.skills.length > 3 && (
                <span
                  className="badge bg-gray-100 dark:bg-black/20 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-md text-xs font-medium"
                  aria-label={`${student.skills.length - 3} more skills: ${student.skills.slice(3).join(', ')}`}
                >
                  +{student.skills.length - 3}
                </span>
              )}
            </div>
          )
        },
      },
      {
        Header: 'Education',
        accessor: 'education',
        disableSortBy: true,
        Cell: ({ row }: any) => {
          const student = row.original
          if (!student.education?.trim()) {
            return <span className={missingProfileClass}>{MISSING_PROFILE_VALUE}</span>
          }
          // Parse education: split by " - " to separate degree and university
          const educationParts = student.education.split(' - ')
          const degree = educationParts[0] || ''
          const university = educationParts.slice(1).join(' - ') || ''
          
          return (
            <div 
              className="text-sm text-gray-800 dark:text-white whitespace-normal" 
              style={{ 
                maxWidth: '280px',
                minHeight: '60px',
                lineHeight: '1.5',
                wordBreak: 'break-word'
              }}
              title={student.education}
            >
              <div className="font-medium flex items-center gap-2">
                <i className="ri-graduation-cap-line text-primary" aria-hidden="true"></i>
                <span>{degree}</span>
              </div>
              {university && (
                <div className="text-gray-600 dark:text-gray-400 mt-0.5 flex items-center gap-2">
                  <i className="ri-building-line text-info" aria-hidden="true"></i>
                  <span>{university}</span>
                </div>
              )}
            </div>
          )
        },
      },
      {
        Header: 'Bio',
        accessor: 'bio',
        disableSortBy: true,
        Cell: ({ row }: any) => {
          const student = row.original
          if (!student.bio?.trim()) {
            return <span className={missingProfileClass}>{MISSING_PROFILE_VALUE}</span>
          }
          return (
            <div 
              className="text-sm text-gray-700 dark:text-gray-300 whitespace-normal" 
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
              title={student.bio}
            >
              {student.bio}
            </div>
          )
        },
      },
      {
        Header: 'Actions',
        accessor: 'id',
        disableSortBy: true,
        Cell: ({ row }: any) => (
          <StudentRowActions
            student={row.original}
            canManageStudents={canManageStudents}
            viewingStudentId={viewingStudentId}
            viewStudentLoading={viewStudentLoading}
            downloadingStudentId={downloadingStudentId}
            menuOpen={openRowActionsMenuId === row.original.id}
            onToggleMenu={() =>
              setOpenRowActionsMenuId((prev) => (prev === row.original.id ? null : row.original.id))
            }
            onCloseMenu={() => setOpenRowActionsMenuId(null)}
            onView={() => { void handleViewStudent(row.original.id) }}
            onDownload={() => { void handleDownloadStudentProfile(row.original) }}
            onShare={() => { void handleShareClick(row.original) }}
            onAddNote={() => { void handleAddNote(row.original.id) }}
            onDelete={() => { void handleDelete(row.original.id) }}
          />
        ),
      },
    ],
    [selectedRows, handleDelete, canManageStudents, viewingStudentId, viewStudentLoading, openProfileImageModal, downloadingStudentId, openRowActionsMenuId]
  )

  const displayData = students

  const allSkills = filterOptions.skills
  const allEducation = filterOptions.education
  const allNames = filterOptions.names
  const allEmails = filterOptions.emails ?? []

  // Filter options based on search terms
  const filteredNames = useMemo(() => {
    if (!searchName) return allNames
    return allNames.filter(name => 
      name.toLowerCase().includes(searchName.toLowerCase())
    )
  }, [allNames, searchName])

  const filteredSkills = useMemo(() => {
    if (!searchSkills) return allSkills
    return allSkills.filter(skill => 
      skill.toLowerCase().includes(searchSkills.toLowerCase())
    )
  }, [allSkills, searchSkills])

  const filteredEducation = useMemo(() => {
    if (!searchEducation) return allEducation
    return allEducation.filter(edu => 
      edu.toLowerCase().includes(searchEducation.toLowerCase())
    )
  }, [allEducation, searchEducation])

  const handleMultiSelectChange = (key: 'name' | 'skills' | 'education', value: string) => {
    setCurrentPage(1)
    setFilters(prev => {
      const currentArray = prev[key]
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value]
      return { ...prev, [key]: newArray }
    })
  }

  const handleRemoveFilter = (key: 'name' | 'skills' | 'education', value: string) => {
    setCurrentPage(1)
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].filter(item => item !== value)
    }))
  }

  const handleClearHeaderFilter = (key: StudentHeaderFilterKey) => {
    setFilters((prev) => ({ ...prev, [key]: [] }))
  }

  const handleResetFilters = () => {
    setCurrentPage(1)
    setStatusFilter('active')
    setFilters({
      name: [],
      skills: [],
      education: [],
      email: '',
      experience: [experienceRanges.min, experienceRanges.max]
    })
    setSearchName('')
    setDebouncedSearchQuery('')
    setSearchSkills('')
    setSearchEducation('')
  }

  const hasActiveFilters = 
    filters.name.length > 0 ||
    filters.skills.length > 0 ||
    filters.education.length > 0 ||
    filters.email !== '' ||
    debouncedSearchQuery.trim() !== '' ||
    statusFilter !== 'active'

  const activeFilterCount = 
    filters.name.length +
    filters.skills.length +
    filters.education.length +
    (filters.email !== '' ? 1 : 0) +
    (debouncedSearchQuery.trim() !== '' ? 1 : 0) +
    (statusFilter !== 'active' ? 1 : 0)

  const data = useMemo(() => displayData, [displayData])

  const tableInstance: any = useTable(
    {
      columns,
      data,
      manualPagination: true, // We're using API pagination
      manualSortBy: true, // We're using API sorting
    },
    useSortBy
  )

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
  } = tableInstance

  // Handle sort selection
  const handleSortChange = (sortOption: string) => {
    if (isStudentSortOption(sortOption)) {
      setSelectedSort(sortOption)
      setSortBy(sortOptionToApiSortBy(sortOption))
      setCurrentPage(1)
      setSortMenuOpen(false)
    }
  }

  const handleColumnSort = (columnId: string) => {
    const column = studentHeaderSortColumn(columnId)
    if (!column) return
    handleSortChange(nextStudentColumnSort(selectedSort, column))
  }

  // Handle select all checkbox - selects all rows on the current page
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = new Set(displayData.map((student) => student.id))
      setSelectedRows(allIds)
    } else {
      setSelectedRows(new Set())
    }
  }

  // Check if all rows on the current page are selected
  const isAllSelected = selectedRows.size === displayData.length && displayData.length > 0
  const isIndeterminate = selectedRows.size > 0 && selectedRows.size < displayData.length

  return (
    <Fragment>
      <Seo title="Students" />

      <div className="mt-5 grid grid-cols-12 gap-6 h-[calc(100vh-8rem)] sm:mt-6">
        <div className="xl:col-span-12 col-span-12 h-full flex flex-col">
          <div className="box custom-box h-full flex flex-col">
            <div className="box-header flex items-center justify-between flex-wrap gap-4">
              <div className="box-title">
                Students
                <span className="badge bg-light text-default rounded-full ms-1 text-[0.75rem] align-middle">
                  {totalResults}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <select
                  className="form-control select-show-page-size !w-auto !py-1 !px-4 !text-[0.75rem] me-2"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                  aria-label="Results per page"
                >
                  {[10, 25, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      Show {size}
                    </option>
                  ))}
                </select>
                <div ref={sortDropdownRef} className="relative me-2 hidden md:block">
                  <button
                    type="button"
                    className="ti-btn ti-btn-light !py-1 !px-2 !text-[0.75rem]"
                    id="sort-dropdown-button"
                    aria-haspopup="menu"
                    aria-expanded={sortMenuOpen}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setSortMenuOpen((prev) => !prev)
                    }}
                  >
                    <i className="ri-arrow-up-down-line font-semibold align-middle me-1"></i>Sort
                    <i className="ri-arrow-down-s-line align-middle ms-1 inline-block"></i>
                  </button>
                  {sortMenuOpen && (
                    <ul
                      className="absolute end-0 top-full z-50 mt-1 min-w-[10rem] rounded-lg border border-defaultborder dark:border-defaultborder/20 bg-white py-1 shadow-lg dark:bg-bodybg"
                      role="menu"
                      aria-labelledby="sort-dropdown-button"
                    >
                      <li role="none">
                        <button
                          type="button"
                          className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${selectedSort === 'name-asc' ? 'active' : ''}`}
                          role="menuitem"
                          onClick={() => handleSortChange('name-asc')}
                        >
                          <i className="ri-sort-asc me-2 align-middle inline-block"></i>Name (A-Z)
                        </button>
                      </li>
                      <li role="none">
                        <button
                          type="button"
                          className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${selectedSort === 'name-desc' ? 'active' : ''}`}
                          role="menuitem"
                          onClick={() => handleSortChange('name-desc')}
                        >
                          <i className="ri-sort-desc me-2 align-middle inline-block"></i>Name (Z-A)
                        </button>
                      </li>
                    </ul>
                  )}
                </div>
                {canManageStudents && (
                <Link
                  href="/training/students/add"
                  className="ti-btn ti-btn-primary-full !py-1 !px-2 !text-[0.75rem] me-2 hidden md:inline-flex"
                >
                  <i className="ri-add-line font-semibold align-middle"></i>Add Student
                </Link>
                )}
                <div ref={excelDropdownRef} className="relative me-2 hidden md:block">
                  <button
                    type="button"
                    className="ti-btn ti-btn-primary !py-1 !px-2 !text-[0.75rem]"
                    id="excel-dropdown-button"
                    aria-haspopup="menu"
                    aria-expanded={excelMenuOpen}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setExcelMenuOpen((prev) => !prev)
                    }}
                  >
                    <i className="ri-file-excel-2-line font-semibold align-middle me-1"></i>Excel
                    <i className="ri-arrow-down-s-line align-middle ms-1 inline-block"></i>
                  </button>
                  {excelMenuOpen && (
                    <ul
                      className="absolute end-0 top-full z-50 mt-1 min-w-[10rem] rounded-lg border border-defaultborder dark:border-defaultborder/20 bg-white py-1 shadow-lg dark:bg-bodybg"
                      role="menu"
                      aria-labelledby="excel-dropdown-button"
                    >
                      <li role="none">
                        <button
                          type="button"
                          className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left disabled:opacity-60"
                          role="menuitem"
                          disabled={excelExporting}
                          onClick={() => { void handleExportStudents() }}
                        >
                          <i className="ri-file-excel-2-line me-2 align-middle inline-block"></i>{excelExporting ? 'Exporting…' : 'Export'}
                        </button>
                      </li>
                    </ul>
                  )}
                </div>
                <button
                  type="button"
                  className={`ti-btn ti-btn-light !py-1 !px-2 !text-[0.75rem] me-2 hidden md:inline-flex ${filterPanelOpen ? 'ring-2 ring-primary/30 bg-primary/[0.06]' : ''}`}
                  aria-expanded={filterPanelOpen}
                  aria-controls="students-filter-panel"
                  onClick={() => (filterPanelOpen ? closeFilterPanel() : openFilterPanel())}
                >
                  <i className={`ri-${filtersLoading ? 'loader-4-line animate-spin' : 'filter-3-line'} font-semibold align-middle me-1`} aria-hidden="true"></i>Filters
                  {hasActiveFilters && (
                    <span className="badge bg-primary text-white rounded-full ms-1 text-[0.65rem]">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              
                {canManageStudents && (
                <button
                  type="button"
                  className="ti-btn ti-btn-danger !py-1 !px-2 !text-[0.75rem] hidden md:inline-flex"
                  onClick={() => { void handleDeleteSelected() }}
                  disabled={selectedRows.size === 0 || bulkDeactivating}
                  aria-busy={bulkDeactivating}
                >
                  <i className={`ri-${bulkDeactivating ? 'loader-4-line animate-spin' : 'user-unfollow-line'} font-semibold align-middle me-1`} aria-hidden="true"></i>{bulkDeactivating ? 'Deactivating…' : 'Deactivate'}
                </button>
                )}
                <div ref={toolbarDropdownRef} className="relative md:hidden">
                  <button
                    type="button"
                    className="ti-btn ti-btn-light !py-1 !px-2 !text-[0.75rem]"
                    aria-haspopup="menu"
                    aria-expanded={toolbarMenuOpen}
                    aria-label="More toolbar actions"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setToolbarMenuOpen((prev) => !prev)
                    }}
                  >
                    <i className="ri-more-2-fill font-semibold align-middle" aria-hidden="true"></i>
                  </button>
                  {toolbarMenuOpen && (
                    <ul
                      className="absolute end-0 top-full z-50 mt-1 min-w-[12rem] rounded-lg border border-defaultborder dark:border-defaultborder/20 bg-white py-1 shadow-lg dark:bg-bodybg"
                      role="menu"
                    >
                      <li role="none">
                        <button type="button" className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${selectedSort === 'name-asc' ? 'active' : ''}`} role="menuitem" onClick={() => { setToolbarMenuOpen(false); handleSortChange('name-asc') }}>
                          <i className="ri-sort-asc me-2" aria-hidden="true"></i>Name (A-Z)
                        </button>
                      </li>
                      <li role="none">
                        <button type="button" className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${selectedSort === 'name-desc' ? 'active' : ''}`} role="menuitem" onClick={() => { setToolbarMenuOpen(false); handleSortChange('name-desc') }}>
                          <i className="ri-sort-desc me-2" aria-hidden="true"></i>Name (Z-A)
                        </button>
                      </li>
                      {canManageStudents && (
                        <li role="none">
                          <Link href="/training/students/add" className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left flex items-center gap-2" role="menuitem" onClick={() => setToolbarMenuOpen(false)}>
                            <i className="ri-add-line" aria-hidden="true"></i>Add Student
                          </Link>
                        </li>
                      )}
                      <li role="none">
                        <button type="button" className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left disabled:opacity-60" role="menuitem" disabled={excelExporting} onClick={() => { setToolbarMenuOpen(false); void handleExportStudents() }}>
                          <i className="ri-file-excel-2-line me-2" aria-hidden="true"></i>{excelExporting ? 'Exporting…' : 'Export Excel'}
                        </button>
                      </li>
                      <li role="none">
                        <button type="button" className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left" role="menuitem" onClick={() => { setToolbarMenuOpen(false); openFilterPanel() }}>
                          <i className={`ri-${filtersLoading ? 'loader-4-line animate-spin' : 'filter-3-line'} me-2`} aria-hidden="true"></i>Filters
                        </button>
                      </li>
                      {canManageStudents && (
                        <li role="none">
                          <button type="button" className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left text-danger disabled:opacity-60" role="menuitem" disabled={selectedRows.size === 0 || bulkDeactivating} aria-busy={bulkDeactivating} onClick={() => { setToolbarMenuOpen(false); void handleDeleteSelected() }}>
                            <i className={`ri-${bulkDeactivating ? 'loader-4-line animate-spin' : 'user-unfollow-line'} me-2`} aria-hidden="true"></i>{bulkDeactivating ? 'Deactivating…' : 'Deactivate Selected'}
                          </button>
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              </div>
            </div>
            <div className="box-body !p-0 flex-1 flex flex-col overflow-hidden">
              <div className="table-responsive flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
                <table {...getTableProps()} className="table whitespace-nowrap min-w-full table-striped table-hover table-bordered border-gray-300 dark:border-gray-600">
                  <thead>
                    {headerGroups.map((headerGroup: any, i: number) => (
                      <tr {...headerGroup.getHeaderGroupProps()} className="bg-primary/10 dark:bg-primary/20 border-b border-gray-300 dark:border-gray-600" key={`header-group-${i}`}>
                        {headerGroup.headers.map((column: any, j: number) => {
                          const sortColumn = studentHeaderSortColumn(column.id)
                          return (
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
                            aria-sort={
                              sortColumn
                                ? studentColumnAriaSort(selectedSort, sortColumn)
                                : undefined
                            }
                          >
                            {column.id === 'select' ? (
                              <input
                                className="form-check-input"
                                type="checkbox"
                                checked={isAllSelected}
                                ref={(input) => {
                                  if (input) input.indeterminate = isIndeterminate
                                }}
                                onChange={handleSelectAll}
                                aria-label="Select all on page"
                              />
                            ) : (() => {
                              const filterKey = studentHeaderFilterKey(column.id)
                              const options =
                                filterKey === 'name'
                                  ? allNames
                                  : filterKey === 'skills'
                                    ? allSkills
                                    : allEducation
                              const filterControl = filterKey ? (
                                <StudentColumnHeaderFilter
                                  filterKey={filterKey}
                                  label={String(column.Header)}
                                  options={options}
                                  selected={filters[filterKey]}
                                  onToggle={(value) => handleMultiSelectChange(filterKey, value)}
                                  onClear={() => handleClearHeaderFilter(filterKey)}
                                  hideLabel={Boolean(sortColumn)}
                                  {...(filterKey === 'name'
                                    ? {
                                        emailOptions: allEmails,
                                        emailSelected: filters.email,
                                        onToggleEmail: (value: string) => {
                                          setCurrentPage(1)
                                          setFilters((prev) => ({
                                            ...prev,
                                            email: prev.email === value ? '' : value,
                                          }))
                                        },
                                        onClearEmail: () => {
                                          setCurrentPage(1)
                                          setFilters((prev) => ({ ...prev, email: '' }))
                                        },
                                      }
                                    : {})}
                                />
                              ) : null
                              if (sortColumn) {
                                const { isSorted, isSortedDesc } = studentColumnSortFlags(
                                  selectedSort,
                                  sortColumn
                                )
                                return (
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      className="tabletitle group/th inline-flex items-center gap-1 text-start cursor-pointer select-none hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
                                      aria-label={studentSortButtonAriaLabel(sortColumn, selectedSort)}
                                      onClick={() => handleColumnSort(column.id)}
                                    >
                                      <SortHeaderLabel
                                        label={column.render('Header')}
                                        isSorted={isSorted}
                                        isSortedDesc={isSortedDesc}
                                      />
                                    </button>
                                    {filterControl}
                                  </div>
                                )
                              }
                              if (filterControl) return filterControl
                              return (
                                <span className="tabletitle">{column.render('Header')}</span>
                              )
                            })()}
                          </th>
                          )
                        })}
                      </tr>
                    ))}
                  </thead>
                  <tbody {...getTableBodyProps()}>
                    {loading ? (
                      <tr>
                        <td colSpan={columns.length} className="text-center py-8">
                          <div className="flex flex-col items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                            <span className="text-gray-600 dark:text-gray-400">Loading students...</span>
                          </div>
                        </td>
                      </tr>
                    ) : displayData.length === 0 ? (
                      <tr>
                        <td colSpan={columns.length} className="text-center py-8">
                          <div className="flex flex-col items-center justify-center">
                            <i className="ri-inbox-line text-4xl text-gray-400 mb-2"></i>
                            <span className="text-gray-600 dark:text-gray-400">No students found</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      displayData.map((student) => {
                        const row = {
                          original: student,
                          getRowProps: () => ({}),
                          cells: columns.map((col: any) => ({
                            render: (type: string) => {
                              if (type === 'Cell') {
                                if (col.id === 'select') {
                                  return (
                                    <input
                                      className="form-check-input"
                                      type="checkbox"
                                      checked={selectedRows.has(student.id)}
                                      onChange={() => handleRowSelect(student.id)}
                                      aria-label={`Select ${student.name}`}
                                    />
                                  )
                                }
                                if (col.Cell) {
                                  return col.Cell({ row: { original: student } })
                                }
                                return student[col.accessor as keyof StudentRow]
                              }
                              return null
                            },
                            getCellProps: () => ({})
                          }))
                        }
                        return (
                          <tr className="border-b border-gray-300 dark:border-gray-600" key={student.id}>
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
              <ListPagination
                page={currentPage}
                totalPages={totalPages}
                totalResults={totalResults}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                gotoInputId="students-goto-page"
              />
            </div>
          </div>
        </div>
      </div>

      <StudentProfileImageModal
        student={profileImageStudent}
        profileImageUrl={profileImageUrl}
        profileImageLoading={profileImageLoading}
        profileImageUploading={profileImageUploading}
        profileImageError={profileImageError}
        onClose={() => {
          setProfileImageStudent(null)
          setProfileImageUrl(null)
          setProfileImageError(null)
        }}
        onFileChange={handleProfileImageFileChange}
      />

      <StudentFilters
        filters={filters}
        setFilters={setFilters}
        onClose={closeFilterPanel}
        allNames={allNames}
        allSkills={allSkills}
        allEducation={allEducation}
        allEmails={allEmails}
        filteredNames={filteredNames}
        filteredSkills={filteredSkills}
        filteredEducation={filteredEducation}
        searchName={searchName}
        setSearchName={setSearchName}
        searchSkills={searchSkills}
        setSearchSkills={setSearchSkills}
        searchEducation={searchEducation}
        setSearchEducation={setSearchEducation}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        handleMultiSelectChange={handleMultiSelectChange}
        handleRemoveFilter={handleRemoveFilter}
        handleResetFilters={handleResetFilters}
      />

      {/* Student Preview Panel (Offcanvas) */}
      <div 
        id="student-preview-panel" 
        className="hs-overlay hidden ti-offcanvas ti-offcanvas-right !z-[105] !max-w-[50rem] lg:!max-w-[60rem]"
        tabIndex={-1}
      >
        <div className="ti-offcanvas-header bg-gray-50 dark:bg-black/20 !py-2.5">
          <h6 className="ti-offcanvas-title text-base font-semibold flex items-center gap-2">
            <i className="ri-user-line text-primary text-base"></i>
            {previewStudent?.name || 'Student Profile'}
          </h6>
          <button 
            type="button" 
            className="hs-dropdown-toggle ti-btn flex-shrink-0 p-0 transition-none text-gray-500 hover:text-gray-700 focus:ring-gray-400 focus:ring-offset-white dark:text-[#8c9097] dark:text-white/50 dark:hover:text-white/80 dark:focus:ring-white/10 dark:focus:ring-offset-white/10 hover:bg-gray-100 dark:hover:bg-black/40 rounded-md p-1" 
            data-hs-overlay="#student-preview-panel"
            onClick={() => setPreviewStudent(null)}
          >
            <span className="sr-only">Close</span>
            <svg className="w-3.5 h-3.5" width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0.258206 1.00652C0.351976 0.912791 0.479126 0.860131 0.611706 0.860131C0.744296 0.860131 0.871447 0.912791 0.965207 1.00652L3.61171 3.65302L6.25822 1.00652C6.30432 0.958771 6.35952 0.920671 6.42052 0.894471C6.48152 0.868271 6.54712 0.854471 6.61352 0.853901C6.67992 0.853321 6.74572 0.865971 6.80722 0.891111C6.86862 0.916251 6.92442 0.953381 6.97142 1.00032C7.01832 1.04727 7.05552 1.1031 7.08062 1.16454C7.10572 1.22599 7.11842 1.29183 7.11782 1.35822C7.11722 1.42461 7.10342 1.49022 7.07722 1.55122C7.05102 1.61222 7.01292 1.6674 6.96522 1.71352L4.31871 4.36002L6.96522 7.00648C7.05632 7.10078 7.10672 7.22708 7.10552 7.35818C7.10442 7.48928 7.05182 7.61468 6.95912 7.70738C6.86642 7.80018 6.74102 7.85268 6.60992 7.85388C6.47882 7.85498 6.35252 7.80458 6.25822 7.71348L3.61171 5.06702L0.965207 7.71348C0.870907 7.80458 0.744606 7.85498 0.613506 7.85388C0.482406 7.85268 0.357007 7.80018 0.264297 7.70738C0.171597 7.61468 0.119017 7.48928 0.117877 7.35818C0.116737 7.22708 0.167126 7.10078 0.258206 7.00648L2.90471 4.36002L0.258206 1.71352C0.164476 1.61976 0.111816 1.4926 0.111816 1.36002C0.111816 1.22744 0.164476 1.10028 0.258206 1.00652Z" fill="currentColor"/>
            </svg>
          </button>
        </div>
        <div className="ti-offcanvas-body !p-4">
          {previewStudent ? (
            <div className="space-y-4">
              {/* Student Header Info */}
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 dark:border-primary/30 rounded-lg">
                <StudentRowAvatar
                  name={previewStudent.name}
                  imageUrl={previewStudent.hasProfileImage ? previewStudent.displayPicture : null}
                  className="w-16 h-16 rounded-full"
                />
                <div className="flex-1">
                  <h6 className="font-bold text-gray-800 dark:text-white text-xl mb-1">{previewStudent.name}</h6>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <i className="ri-mail-line" aria-hidden="true"></i>
                      {previewStudent.email?.trim() ? previewStudent.email : MISSING_PROFILE_VALUE}
                    </span>
                    <span className="flex items-center gap-1">
                      <i className="ri-phone-line" aria-hidden="true"></i>
                      {previewStudent.phone?.trim() ? previewStudent.phone : MISSING_PROFILE_VALUE}
                    </span>
                  </div>
                </div>
              </div>

              {/* Key Details Grid */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-black/20 rounded-lg">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Education</div>
                  {previewStudent.education?.trim() ? (
                    <div className="font-semibold text-gray-800 dark:text-white">{previewStudent.education}</div>
                  ) : (
                    <div className="text-sm font-normal text-gray-600 dark:text-gray-300">{MISSING_PROFILE_VALUE}</div>
                  )}
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Skills</div>
                  <div className="flex flex-wrap gap-1.5">
                    {previewStudent.skills?.length ? (
                      previewStudent.skills.map((skill: string, index: number) => (
                        <span
                          key={index}
                          className="badge bg-primary/10 text-primary border border-primary/30 px-2 py-1 rounded-md text-xs font-medium"
                        >
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm font-normal text-gray-600 dark:text-gray-300">{MISSING_PROFILE_VALUE}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bio Section */}
              <div className="p-4 border border-gray-200 dark:border-defaultborder/10 rounded-lg">
                <h6 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                  <i className="ri-file-text-line text-primary" aria-hidden="true"></i>
                  Bio
                </h6>
                <p className={`text-sm leading-relaxed ${previewStudent.bio?.trim() ? 'text-gray-700 dark:text-gray-300' : 'text-gray-600 dark:text-gray-300'}`}>
                  {previewStudent.bio?.trim() ? previewStudent.bio : MISSING_PROFILE_VALUE}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-gray-200 dark:border-defaultborder/10 flex gap-3">
                <button 
                  type="button" 
                  className="hs-dropdown-toggle ti-btn ti-btn-light flex-1" 
                  data-hs-overlay="#student-preview-panel"
                  onClick={() => setPreviewStudent(null)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="ti-btn ti-btn-primary flex-1"
                  onClick={() => {
                    if (previewStudent?.id) {
                      closePreviewPanel()
                      void handleViewStudent(previewStudent.id)
                    }
                  }}
                >
                  View Full Profile
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">No student selected</div>
          )}
        </div>
      </div>

      {/* Student Notes Panel (Offcanvas) */}
      <div 
        id="student-notes-panel" 
        className="hs-overlay hidden ti-offcanvas ti-offcanvas-right !z-[105]"
        tabIndex={-1}
      >
        <div className="ti-offcanvas-header bg-gray-50 dark:bg-black/20 !py-2.5">
          <h6 className="ti-offcanvas-title text-base font-semibold flex items-center gap-2">
            <i className="ri-file-add-line text-primary text-base"></i>
            {getStudentDetails()?.name || 'Student Notes'}
          </h6>
          <button 
            type="button" 
            className="hs-dropdown-toggle ti-btn flex-shrink-0 p-0 transition-none text-gray-500 hover:text-gray-700 focus:ring-gray-400 focus:ring-offset-white dark:text-[#8c9097] dark:text-white/50 dark:hover:text-white/80 dark:focus:ring-white/10 dark:focus:ring-offset-white/10 hover:bg-gray-100 dark:hover:bg-black/40 rounded-md p-1" 
            data-hs-overlay="#student-notes-panel"
            onClick={() => setNotesStudentId(null)}
          >
            <span className="sr-only">Close</span>
            <svg className="w-3.5 h-3.5" width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0.258206 1.00652C0.351976 0.912791 0.479126 0.860131 0.611706 0.860131C0.744296 0.860131 0.871447 0.912791 0.965207 1.00652L3.61171 3.65302L6.25822 1.00652C6.30432 0.958771 6.35952 0.920671 6.42052 0.894471C6.48152 0.868271 6.54712 0.854471 6.61352 0.853901C6.67992 0.853321 6.74572 0.865971 6.80722 0.891111C6.86862 0.916251 6.92442 0.953381 6.97142 1.00032C7.01832 1.04727 7.05552 1.1031 7.08062 1.16454C7.10572 1.22599 7.11842 1.29183 7.11782 1.35822C7.11722 1.42461 7.10342 1.49022 7.07722 1.55122C7.05102 1.61222 7.01292 1.6674 6.96522 1.71352L4.31871 4.36002L6.96522 7.00648C7.05632 7.10078 7.10672 7.22708 7.10552 7.35818C7.10442 7.48928 7.05182 7.61468 6.95912 7.70738C6.86642 7.80018 6.74102 7.85268 6.60992 7.85388C6.47882 7.85498 6.35252 7.80458 6.25822 7.71348L3.61171 5.06702L0.965207 7.71348C0.870907 7.80458 0.744606 7.85498 0.613506 7.85388C0.482406 7.85268 0.357007 7.80018 0.264297 7.70738C0.171597 7.61468 0.119017 7.48928 0.117877 7.35818C0.116737 7.22708 0.167126 7.10078 0.258206 7.00648L2.90471 4.36002L0.258206 1.71352C0.164476 1.61976 0.111816 1.4926 0.111816 1.36002C0.111816 1.22744 0.164476 1.10028 0.258206 1.00652Z" fill="currentColor"/>
            </svg>
          </button>
        </div>
        <div className="ti-offcanvas-body !p-4">
          {notesStudentId ? (
            <div className="space-y-6">
              {/* Student Info Header */}
              {(() => {
                const studentDetails = getStudentDetails()
                return studentDetails ? (
                  <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 dark:border-primary/30 rounded-lg">
                    <h6 className="font-bold text-gray-800 dark:text-white text-lg mb-2">{studentDetails.name}</h6>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <i className="ri-mail-line" aria-hidden="true"></i>
                        {studentDetails.email?.trim() ? studentDetails.email : MISSING_PROFILE_VALUE}
                      </span>
                      <span className="flex items-center gap-1">
                        <i className="ri-phone-line" aria-hidden="true"></i>
                        {studentDetails.phone?.trim() ? studentDetails.phone : MISSING_PROFILE_VALUE}
                      </span>
                    </div>
                  </div>
                ) : null
              })()}

              {/* Add New Note Form */}
              {canManageStudents && (
              <div className="p-4 border border-gray-200 dark:border-defaultborder/10 rounded-lg bg-gray-50 dark:bg-black/20">
                <h6 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                  <i className="ri-file-add-line text-primary"></i>
                  Add Note
                </h6>
                <div className="space-y-3">
                  <textarea
                    className="form-control"
                    rows={4}
                    placeholder="Write your note here..."
                    value={newNote.text}
                    onChange={(e) => setNewNote({ ...newNote, text: e.target.value })}
                  />
                  <div className="flex items-center gap-4">
                    <label className="form-label mb-0 font-medium text-sm text-gray-700 dark:text-gray-300">Visibility:</label>
                    <div className="flex items-center gap-4">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="noteVisibility"
                          id="note-public"
                          checked={newNote.visibility === 'public'}
                          onChange={() => setNewNote({ ...newNote, visibility: 'public' })}
                        />
                        <label className="form-check-label" htmlFor="note-public">
                          Public
                        </label>
                      </div>
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="noteVisibility"
                          id="note-private"
                          checked={newNote.visibility === 'private'}
                          onChange={() => setNewNote({ ...newNote, visibility: 'private' })}
                        />
                        <label className="form-check-label" htmlFor="note-private">
                          Private
                        </label>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="ti-btn ti-btn-primary"
                    onClick={handleAddNoteSubmit}
                    disabled={!newNote.text.trim()}
                  >
                    <i className="ri-add-line me-1"></i>
                    Add Note
                  </button>
                </div>
              </div>
              )}

              {/* Existing Notes */}
              <div>
                <h6 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                  <i className="ri-file-list-line text-primary"></i>
                  Notes ({getStudentNotes(notesStudentId).length})
                </h6>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {getStudentNotes(notesStudentId).length > 0 ? (
                    getStudentNotes(notesStudentId).map((note) => (
                      <div 
                        key={note.id}
                        className="p-4 border border-gray-200 dark:border-defaultborder/10 rounded-lg bg-white dark:bg-black/40"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`badge ${note.visibility === 'public' ? 'bg-success' : 'bg-secondary'} text-white text-xs`}>
                              <i className={`ri-${note.visibility === 'public' ? 'global' : 'lock'}-line me-1`}></i>
                              {note.visibility === 'public' ? 'Public' : 'Private'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
                              <div>{new Date(note.createdAt).toLocaleDateString()}</div>
                              <div>{new Date(note.createdAt).toLocaleTimeString()}</div>
                            </div>
                            {canManageStudents && (
                            <button
                              type="button"
                              className="ti-btn ti-btn-icon ti-btn-sm ti-btn-danger"
                              onClick={() => { void handleDeleteNote(note.id) }}
                              title="Delete note"
                            >
                              <i className="ri-delete-bin-line"></i>
                            </button>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 whitespace-pre-wrap">
                          {note.note}
                        </p>
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <i className="ri-user-line"></i>
                          Posted by: <span className="font-medium">{note.postedByName || 'Unknown'}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 border border-gray-200 dark:border-defaultborder/10 rounded-lg text-center bg-gray-50 dark:bg-black/20">
                      <i className="ri-file-list-line text-3xl text-gray-400 dark:text-gray-500 mb-2"></i>
                      <p className="text-sm text-gray-500 dark:text-gray-400">No notes yet. Add your first note above.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">No student selected</div>
          )}
        </div>
      </div>

      <StudentViewModal
        student={viewStudent}
        isLoading={viewStudentLoading}
        onClose={() => setViewStudent(null)}
      />
    </Fragment>
  )
}

export default Students
