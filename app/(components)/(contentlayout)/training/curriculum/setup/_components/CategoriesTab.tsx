"use client"

import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment, useState, useEffect, useCallback, useRef } from 'react'
import Swal from 'sweetalert2'
import { AxiosError } from 'axios'
import * as categoriesApi from '@/shared/lib/api/categories'
import type { Category } from '@/shared/lib/api/categories'
import * as trainingModulesApi from '@/shared/lib/api/training-modules'
import type { TrainingModule } from '@/shared/lib/api/training-modules'
import type { Student } from '@/shared/lib/api/students'
import * as mentorsApi from '@/shared/lib/api/mentors'
import type { Mentor } from '@/shared/lib/api/mentors'
import { useAuth } from '@/shared/contexts/auth-context'
import { hasPermission } from '@/shared/lib/permissions'

interface CategoryRow extends Category {
  categoryName: string
  dateCreated: string
  moduleCount: number
}

type AssignmentAction = '' | 'assign' | 'remove'

interface RowAssignmentState {
  moduleId: string
  studentId: string
  mentorId: string
  action: AssignmentAction
}

const EMPTY_ROW_ASSIGNMENT: RowAssignmentState = {
  moduleId: '',
  studentId: '',
  mentorId: '',
  action: '',
}

function studentLabel(student: Student): string {
  return student.user?.name || student.user?.email || 'Unknown'
}

function modulesForCategory(allModules: TrainingModule[], categoryId: string): TrainingModule[] {
  return allModules.filter((mod) =>
    (mod.categories ?? []).some((c) => c.id === categoryId)
  )
}

function isStudentAssignedToModule(mod: TrainingModule | undefined, studentId: string): boolean {
  if (!mod || !studentId) return false
  return (mod.students ?? []).some(
    (s) => String(s.id ?? (s as { _id?: string })._id) === studentId
  )
}

export default function CategoriesTab() {
  const auth = useAuth()
  const canCreateCategory = hasPermission(auth, 'create_training_category')
  const canUpdateCategory = hasPermission(auth, 'update_training_category')
  const canDeleteCategory = hasPermission(auth, 'delete_training_category')
  const canEditModule = hasPermission(auth, 'edit_training_module')

  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryRow | null>(null)
  const [categoryName, setCategoryName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [totalResults, setTotalResults] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [sortBy, setSortBy] = useState<string>('createdAt:desc')
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const selectAllRef = useRef<HTMLInputElement>(null)

  const [allModules, setAllModules] = useState<TrainingModule[]>([])
  const [mentors, setMentors] = useState<Mentor[]>([])
  const [studentsByModuleId, setStudentsByModuleId] = useState<Record<string, Student[]>>({})
  const [employeesLoadingByModuleId, setEmployeesLoadingByModuleId] = useState<Record<string, boolean>>({})
  const [rowAssignments, setRowAssignments] = useState<Record<string, RowAssignmentState>>({})
  const [savingCategoryId, setSavingCategoryId] = useState<string | null>(null)
  const [supportDataLoading, setSupportDataLoading] = useState(true)

  const fetchSupportData = useCallback(async () => {
    setSupportDataLoading(true)
    const [modulesResult, mentorsResult] = await Promise.allSettled([
      trainingModulesApi.listTrainingModules({ limit: 500, page: 1 }),
      mentorsApi.listMentors({ limit: 500, page: 1 }),
    ])

    if (modulesResult.status === 'fulfilled') {
      setAllModules(modulesResult.value.results ?? [])
    } else {
      setAllModules([])
      const err = modulesResult.reason
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : 'Could not load modules.'
      await Swal.fire({
        icon: 'warning',
        title: 'Support data unavailable',
        text: msg,
        toast: true,
        position: 'top-end',
        timer: 4000,
        showConfirmButton: false,
        timerProgressBar: true,
      })
    }

    if (mentorsResult.status === 'fulfilled') {
      setMentors(mentorsResult.value.results ?? [])
    } else {
      setMentors([])
    }

    setSupportDataLoading(false)
  }, [])

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    try {
      const params: categoriesApi.ListCategoriesParams = {
        page: currentPage,
        limit: pageSize,
        sortBy,
        ...(searchQuery.trim() && { search: searchQuery.trim() }),
      }
      const response = await categoriesApi.listCategories(params)

      const formattedCategories: CategoryRow[] = response.results.map((cat) => ({
        ...cat,
        categoryName: cat.name,
        dateCreated: new Date(cat.createdAt).toISOString().split('T')[0],
        moduleCount: typeof cat.moduleCount === 'number' ? cat.moduleCount : 0,
      }))

      setCategories(formattedCategories)
      setTotalResults(response.totalResults)
      setTotalPages(response.totalPages)
    } catch (err) {
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : 'Failed to load categories.'
      await Swal.fire({
        icon: 'error',
        title: 'Failed to load categories',
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
  }, [currentPage, pageSize, sortBy, searchQuery])

  const loadEmployeesForModule = useCallback(async (moduleId: string, force = false) => {
    if (!moduleId) return
    if (!force && studentsByModuleId[moduleId]) return
    setEmployeesLoadingByModuleId((prev) => ({ ...prev, [moduleId]: true }))
    try {
      const res = await trainingModulesApi.listModuleEmployees(moduleId, { limit: 500, page: 1 })
      setStudentsByModuleId((prev) => ({ ...prev, [moduleId]: res.results ?? [] }))
    } catch {
      setStudentsByModuleId((prev) => ({ ...prev, [moduleId]: [] }))
    } finally {
      setEmployeesLoadingByModuleId((prev) => ({ ...prev, [moduleId]: false }))
    }
  }, [studentsByModuleId])

  useEffect(() => {
    fetchSupportData()
  }, [fetchSupportData])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const isAllSelected = categories.length > 0 && selectedRows.size === categories.length
  const isIndeterminate = selectedRows.size > 0 && selectedRows.size < categories.length

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = isIndeterminate
  }, [isIndeterminate])

  const handleRowSelect = (id: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedRows(e.target.checked ? new Set(categories.map((c) => c.id)) : new Set())
  }

  const handleDeleteSelected = async () => {
    if (!canDeleteCategory || selectedRows.size === 0) return
    const ids = Array.from(selectedRows)

    const result = await Swal.fire({
      title: 'Delete Categories?',
      text: `Are you sure you want to delete ${ids.length} categor${ids.length === 1 ? 'y' : 'ies'}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete them!',
    })
    if (!result.isConfirmed) return

    const outcomes = await Promise.allSettled(ids.map((id) => categoriesApi.deleteCategory(id)))
    const failed = outcomes.filter((o) => o.status === 'rejected').length
    const deleted = ids.length - failed

    setSelectedRows(new Set())
    await fetchCategories()

    if (failed === 0) {
      await Swal.fire({
        icon: 'success',
        title: 'Categories deleted',
        text: `${deleted} categor${deleted === 1 ? 'y' : 'ies'} deleted successfully.`,
        toast: true,
        position: 'top-end',
        timer: 3000,
        showConfirmButton: false,
        timerProgressBar: true,
      })
    } else {
      await Swal.fire({
        icon: deleted > 0 ? 'warning' : 'error',
        title: deleted > 0 ? 'Partially deleted' : 'Delete failed',
        text: `${deleted} deleted, ${failed} could not be deleted (still linked to modules).`,
        toast: true,
        position: 'top-end',
        timer: 5000,
        showConfirmButton: false,
        timerProgressBar: true,
      })
    }
  }

  const toggleSort = (field: 'name' | 'createdAt') => {
    setSortBy((prev) => (prev === `${field}:asc` ? `${field}:desc` : `${field}:asc`))
    setCurrentPage(1)
    setSelectedRows(new Set())
  }

  const sortIcon = (field: string) =>
    sortBy === `${field}:asc`
      ? 'ri-arrow-up-s-line'
      : sortBy === `${field}:desc`
        ? 'ri-arrow-down-s-line'
        : 'ri-arrow-up-down-line'

  const isActiveSort = (field: string) => sortBy.startsWith(`${field}:`)

  const sortBtnClass = (field: string) =>
    `inline-flex items-center gap-0.5 rounded-md px-1.5 py-1 text-[0.68rem] font-semibold leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
      isActiveSort(field)
        ? 'bg-primary/10 text-primary'
        : 'text-defaulttextcolor/55 hover:bg-primary/5 hover:text-primary'
    }`

  const getRowAssignment = (categoryId: string): RowAssignmentState =>
    rowAssignments[categoryId] ?? EMPTY_ROW_ASSIGNMENT

  const updateRowAssignment = (categoryId: string, patch: Partial<RowAssignmentState>) => {
    setRowAssignments((prev) => ({
      ...prev,
      [categoryId]: { ...getRowAssignment(categoryId), ...patch },
    }))
  }

  const refreshModule = async (moduleId: string) => {
    const updated = await trainingModulesApi.getTrainingModule(moduleId)
    setAllModules((prev) => {
      const idx = prev.findIndex((m) => m.id === moduleId)
      if (idx === -1) return [...prev, updated]
      const next = [...prev]
      next[idx] = updated
      return next
    })
    return updated
  }

  const handleDelete = async (id: string) => {
    if (!canDeleteCategory) return

    const result = await Swal.fire({
      title: 'Delete Category?',
      text: 'Are you sure you want to delete this category?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
    })

    if (!result.isConfirmed) return

    try {
      await categoriesApi.deleteCategory(id)
      await Swal.fire({
        icon: 'success',
        title: 'Category deleted',
        text: 'The category has been deleted successfully.',
        toast: true,
        position: 'top-end',
        timer: 3000,
        showConfirmButton: false,
        timerProgressBar: true,
      })
      setRowAssignments((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      setSelectedRows((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      await fetchCategories()
    } catch (err) {
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : 'Failed to delete category.'
      await Swal.fire({
        icon: 'error',
        title: 'Failed to delete category',
        text: msg,
        toast: true,
        position: 'top-end',
        timer: 4000,
        showConfirmButton: false,
        timerProgressBar: true,
      })
    }
  }

  const openCreateModal = () => {
    setEditingCategory(null)
    setCategoryName('')
    setShowCategoryModal(true)
  }

  const openEditModal = (category: CategoryRow) => {
    setEditingCategory(category)
    setCategoryName(category.name)
    setShowCategoryModal(true)
  }

  const handleSaveCategory = async () => {
    const name = categoryName.trim()
    if (!name) {
      await Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Category name is required.',
        toast: true,
        position: 'top-end',
        timer: 3000,
        showConfirmButton: false,
        timerProgressBar: true,
      })
      return
    }

    const payload = { name }

    try {
      if (editingCategory) {
        if (!canUpdateCategory) return
        await categoriesApi.updateCategory(editingCategory.id, payload)
        await Swal.fire({
          icon: 'success',
          title: 'Category updated',
          text: `The category "${name}" has been updated.`,
          toast: true,
          position: 'top-end',
          timer: 3000,
          showConfirmButton: false,
          timerProgressBar: true,
        })
      } else {
        if (!canCreateCategory) return
        await categoriesApi.createCategory(payload)
        await Swal.fire({
          icon: 'success',
          title: 'Category created',
          text: `The category "${name}" has been created successfully.`,
          toast: true,
          position: 'top-end',
          timer: 3000,
          showConfirmButton: false,
          timerProgressBar: true,
        })
      }
      setShowCategoryModal(false)
      setEditingCategory(null)
      setCategoryName('')
      await fetchCategories()
    } catch (err) {
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : editingCategory ? 'Failed to update category.' : 'Failed to create category.'
      await Swal.fire({
        icon: 'error',
        title: editingCategory ? 'Failed to update category' : 'Failed to create category',
        text: msg,
        toast: true,
        position: 'top-end',
        timer: 4000,
        showConfirmButton: false,
        timerProgressBar: true,
      })
    }
  }

  const handleRowUpdate = async (category: CategoryRow) => {
    if (!canEditModule) return

    const row = getRowAssignment(category.id)
    const { moduleId, studentId, mentorId, action } = row

    if (!moduleId) {
      await Swal.fire({
        icon: 'warning',
        title: 'Select a module',
        text: 'Choose a module before updating.',
        toast: true,
        position: 'top-end',
        timer: 3000,
        showConfirmButton: false,
      })
      return
    }
    if (!studentId) {
      await Swal.fire({
        icon: 'warning',
        title: 'Select an employee',
        text: 'Choose an employee before updating.',
        toast: true,
        position: 'top-end',
        timer: 3000,
        showConfirmButton: false,
      })
      return
    }
    if (!action) {
      await Swal.fire({
        icon: 'warning',
        title: 'Select an action',
        text: 'Choose Assign or Remove before updating.',
        toast: true,
        position: 'top-end',
        timer: 3000,
        showConfirmButton: false,
      })
      return
    }

    const alreadyAssigned = isStudentAssignedToModule(
      allModules.find((m) => m.id === moduleId),
      studentId
    )
    if (action === 'assign' && alreadyAssigned) {
      await Swal.fire({
        icon: 'info',
        title: 'Already assigned',
        text: 'This employee is already on the module. Choose Remove to unassign them.',
        toast: true,
        position: 'top-end',
        timer: 3500,
        showConfirmButton: false,
      })
      return
    }
    if (action === 'remove' && !alreadyAssigned) {
      await Swal.fire({
        icon: 'info',
        title: 'Not assigned',
        text: 'This employee is not on the module. Choose Assign to add them.',
        toast: true,
        position: 'top-end',
        timer: 3500,
        showConfirmButton: false,
      })
      return
    }

    setSavingCategoryId(category.id)
    try {
      if (action === 'assign') {
        await trainingModulesApi.addStudentToTrainingModule(moduleId, studentId)
        if (mentorId) {
          await trainingModulesApi.addMentorToTrainingModule(moduleId, mentorId)
        }
      } else {
        await trainingModulesApi.removeStudentFromTrainingModule(moduleId, studentId)
      }
      await refreshModule(moduleId)
      await loadEmployeesForModule(moduleId, true)
      await Swal.fire({
        icon: 'success',
        title: action === 'assign' ? 'Module assigned' : 'Assignment removed',
        toast: true,
        position: 'top-end',
        timer: 2500,
        showConfirmButton: false,
        timerProgressBar: true,
      })
      updateRowAssignment(category.id, {
        studentId: '',
        mentorId: '',
        action: '',
      })
    } catch (err) {
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : 'Failed to save assignment.'
      await Swal.fire({
        icon: 'error',
        title: 'Update failed',
        text: msg,
        toast: true,
        position: 'top-end',
        timer: 4000,
        showConfirmButton: false,
      })
    } finally {
      setSavingCategoryId(null)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    setSelectedRows(new Set())
    fetchCategories()
  }

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    setCurrentPage(1)
    setSelectedRows(new Set())
  }

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    setSelectedRows(new Set())
  }

  const startIndex = totalResults === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endIndex = Math.min(currentPage * pageSize, totalResults)

  const moduleHasPositions = (mod: TrainingModule | undefined) => (mod?.positions?.length ?? 0) > 0

  return (
    <Fragment>
      <Seo title="Course Assignment" />

      <div className="mt-5 grid grid-cols-12 gap-6 h-[calc(100vh-8rem)] sm:mt-6">
        <div className="xl:col-span-12 col-span-12 h-full flex flex-col">
          <div className="box custom-box h-full flex flex-col">
            <div className="box-header flex items-center justify-between flex-wrap gap-4">
              <div className="box-title">
                Course Assignment
                <span className="badge bg-light text-default rounded-full ms-1 text-[0.75rem] align-middle">
                  {totalResults}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <form onSubmit={handleSearch} className="flex items-center gap-2 me-2">
                  <div className="relative">
                    <input
                      type="text"
                      className="form-control !w-auto !py-1 !ps-3 !pe-7 !text-[0.75rem]"
                      placeholder="Search categories..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      aria-label="Search categories"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('')
                          setCurrentPage(1)
                          fetchCategories()
                        }}
                        aria-label="Clear search"
                        className="absolute end-1.5 top-1/2 -translate-y-1/2 inline-flex h-5 w-5 items-center justify-center rounded-full text-defaulttextcolor/45 transition-colors hover:bg-defaulttextcolor/10 hover:text-defaulttextcolor focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        <i className="ri-close-line text-[0.85rem]"></i>
                      </button>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="ti-btn ti-btn-primary-full !py-1 !px-2.5 !text-[0.75rem]"
                    aria-label="Search"
                  >
                    <i className="ri-search-line"></i>
                  </button>
                </form>
                {canDeleteCategory && selectedRows.size > 0 && (
                  <button
                    type="button"
                    className="ti-btn ti-btn-danger !py-1 !px-2 !text-[0.75rem]"
                    onClick={handleDeleteSelected}
                  >
                    <i className="ri-delete-bin-line align-middle"></i> Delete Selected ({selectedRows.size})
                  </button>
                )}
                {canCreateCategory && (
                  <button
                    type="button"
                    className="ti-btn ti-btn-primary-full !py-1 !px-2 !text-[0.75rem]"
                    onClick={openCreateModal}
                  >
                    <i className="ri-add-line font-semibold align-middle"></i>Create Category
                  </button>
                )}
              </div>
            </div>

            <div className="box-body !p-0 flex-1 flex flex-col overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-defaulttextcolor/70">Loading categories...</div>
                </div>
              ) : categories.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-defaulttextcolor/70">No categories found.</div>
                </div>
              ) : (
                <div className="table-responsive flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
                  <table className="table min-w-full table-striped table-hover table-bordered border-gray-300 dark:border-gray-600">
                    <thead>
                      <tr className="bg-primary/10 dark:bg-primary/20 border-b border-gray-300 dark:border-gray-600">
                        {canDeleteCategory && (
                          <th scope="col" className="text-center sticky top-0 z-10 bg-gray-50 dark:bg-black/20 !w-[2.5rem] !min-w-[2.5rem] !max-w-[2.5rem]">
                            <input
                              ref={selectAllRef}
                              type="checkbox"
                              className="form-check-input"
                              checked={isAllSelected}
                              onChange={handleSelectAll}
                              aria-label="Select all categories on this page"
                            />
                          </th>
                        )}
                        <th scope="col" className="text-center sticky top-0 z-10 bg-gray-50 dark:bg-black/20 !w-[3rem] !min-w-[3rem] !max-w-[3rem]">
                          S.no.
                        </th>
                        <th scope="col" className="text-start sticky top-0 z-10 bg-gray-50 dark:bg-black/20 !max-w-[11rem] !w-[11rem]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>Category Name</span>
                            <span className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                className={sortBtnClass('name')}
                                onClick={() => toggleSort('name')}
                                aria-label={`Sort by name${isActiveSort('name') ? (sortBy.endsWith(':asc') ? ', ascending' : ', descending') : ''}`}
                                title="Sort by name"
                              >
                                Name<i className={`${sortIcon('name')} text-[0.9rem]`} aria-hidden="true"></i>
                              </button>
                              <button
                                type="button"
                                className={sortBtnClass('createdAt')}
                                onClick={() => toggleSort('createdAt')}
                                aria-label={`Sort by date created${isActiveSort('createdAt') ? (sortBy.endsWith(':asc') ? ', ascending' : ', descending') : ''}`}
                                title="Sort by date created"
                              >
                                Date<i className={`${sortIcon('createdAt')} text-[0.9rem]`} aria-hidden="true"></i>
                              </button>
                            </span>
                          </div>
                        </th>
                        <th scope="col" className="text-start sticky top-0 z-10 bg-gray-50 dark:bg-black/20 !min-w-[10rem]">
                          Module
                        </th>
                        <th scope="col" className="text-start sticky top-0 z-10 bg-gray-50 dark:bg-black/20 !min-w-[10rem]">
                          Employee
                        </th>
                        <th scope="col" className="text-start sticky top-0 z-10 bg-gray-50 dark:bg-black/20 !min-w-[9rem]">
                          Select Mentor
                        </th>
                        <th scope="col" className="text-start sticky top-0 z-10 bg-gray-50 dark:bg-black/20 !min-w-[8rem]">
                          Action
                        </th>
                        <th scope="col" className="text-center sticky top-0 z-10 bg-gray-50 dark:bg-black/20 !w-[6rem]">
                          Update
                        </th>
                        <th scope="col" className="text-center sticky top-0 z-10 bg-gray-50 dark:bg-black/20 !w-[3.5rem]">
                          Delete
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((category, index) => {
                        const row = getRowAssignment(category.id)
                        const categoryModules = modulesForCategory(allModules, category.id)
                        const selectedModule = categoryModules.find((m) => m.id === row.moduleId)
                        const employees = studentsByModuleId[row.moduleId] ?? []
                        const employeesLoading = employeesLoadingByModuleId[row.moduleId] ?? false
                        const hasPositions = moduleHasPositions(selectedModule)
                        const serial = (currentPage - 1) * pageSize + index + 1
                        const isSaving = savingCategoryId === category.id

                        return (
                          <tr className="border-b border-gray-300 dark:border-gray-600 align-top" key={category.id}>
                            {canDeleteCategory && (
                              <td className="text-center !w-[2.5rem] !min-w-[2.5rem] !max-w-[2.5rem]">
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  checked={selectedRows.has(category.id)}
                                  onChange={() => handleRowSelect(category.id)}
                                  aria-label={`Select ${category.categoryName}`}
                                />
                              </td>
                            )}
                            <td className="text-center !w-[3rem] !min-w-[3rem] !max-w-[3rem] tabular-nums">
                              {serial}
                            </td>
                            <td className="!max-w-[11rem] !w-[11rem]">
                              <div className="flex flex-col gap-1 min-w-0">
                                <div className="flex items-start gap-1 min-w-0">
                                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                                    <div className="flex items-start gap-1.5 min-w-0">
                                      <span className="font-medium text-defaulttextcolor break-words whitespace-normal leading-snug">
                                        {category.categoryName}
                                      </span>
                                      <span className="badge bg-primary/10 text-primary border border-primary/30 px-1.5 py-0 rounded-full text-[0.65rem] font-medium shrink-0">
                                        {categoryModules.length || category.moduleCount}
                                      </span>
                                    </div>
                                    <span className="text-[0.7rem] text-defaulttextcolor/60">
                                      {category.dateCreated}
                                    </span>
                                  </div>
                                  {canUpdateCategory && (
                                    <button
                                      type="button"
                                      className="ti-btn ti-btn-icon ti-btn-sm ti-btn-light !mb-0 shrink-0"
                                      aria-label={`Edit ${category.categoryName}`}
                                      onClick={() => openEditModal(category)}
                                    >
                                      <i className="ri-pencil-line text-[0.875rem]"></i>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td>
                              <select
                                className="form-control form-select !py-1 !text-[0.8125rem]"
                                value={row.moduleId}
                                disabled={supportDataLoading || isSaving || !canEditModule}
                                onChange={(e) => {
                                  const moduleId = e.target.value
                                  updateRowAssignment(category.id, {
                                    moduleId,
                                    studentId: '',
                                  })
                                  if (moduleId) {
                                    void loadEmployeesForModule(moduleId)
                                  }
                                }}
                              >
                                <option value="">
                                  {categoryModules.length ? 'Select module' : 'No modules'}
                                </option>
                                {categoryModules.map((mod) => (
                                  <option key={mod.id} value={mod.id}>
                                    {mod.moduleName}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <select
                                className="form-control form-select !py-1 !text-[0.8125rem]"
                                value={row.studentId}
                                disabled={
                                  supportDataLoading ||
                                  employeesLoading ||
                                  isSaving ||
                                  !canEditModule ||
                                  !row.moduleId ||
                                  !hasPositions
                                }
                                onChange={(e) => {
                                  const studentId = e.target.value
                                  const assigned = isStudentAssignedToModule(selectedModule, studentId)
                                  updateRowAssignment(category.id, {
                                    studentId,
                                    action: studentId
                                      ? assigned
                                        ? 'remove'
                                        : 'assign'
                                      : '',
                                  })
                                }}
                              >
                                <option value="">
                                  {employeesLoading
                                    ? 'Loading employees...'
                                    : !row.moduleId
                                      ? 'Select module first'
                                      : !hasPositions
                                        ? 'No positions mapped to module'
                                        : employees.length
                                          ? 'Select employee'
                                          : 'No employees'}
                                </option>
                                {employees.map((student) => {
                                  const assigned = isStudentAssignedToModule(selectedModule, student.id)
                                  return (
                                    <option key={student.id} value={student.id}>
                                      {studentLabel(student)}
                                      {assigned ? ' (assigned)' : ''}
                                    </option>
                                  )
                                })}
                              </select>
                            </td>
                            <td>
                              <select
                                className="form-control form-select !py-1 !text-[0.8125rem]"
                                value={row.mentorId}
                                disabled={supportDataLoading || isSaving || !canEditModule}
                                onChange={(e) =>
                                  updateRowAssignment(category.id, { mentorId: e.target.value })
                                }
                              >
                                <option value="">Optional</option>
                                {mentors.map((mentor) => (
                                  <option key={mentor.id} value={mentor.id}>
                                    {mentor.user?.name || mentor.user?.email}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <select
                                className="form-control form-select !py-1 !text-[0.8125rem]"
                                value={row.action}
                                disabled={isSaving || !canEditModule}
                                onChange={(e) =>
                                  updateRowAssignment(category.id, {
                                    action: e.target.value as AssignmentAction,
                                  })
                                }
                              >
                                <option value="">Select action</option>
                                <option value="assign">Assign</option>
                                <option value="remove">Remove</option>
                              </select>
                            </td>
                            <td className="text-center">
                              {canEditModule && (
                                <button
                                  type="button"
                                  className="ti-btn ti-btn-primary !py-1 !px-2 !text-[0.75rem] !mb-0"
                                  disabled={isSaving}
                                  onClick={() => handleRowUpdate(category)}
                                >
                                  {isSaving ? 'Saving...' : 'Update'}
                                </button>
                              )}
                            </td>
                            <td className="text-center">
                              {canDeleteCategory && (
                                <div className="hs-tooltip ti-main-tooltip inline-flex">
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(category.id)}
                                    className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-danger !mb-0"
                                    aria-label={`Delete ${category.categoryName}`}
                                  >
                                    <i className="ri-delete-bin-line"></i>
                                    <span
                                      className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700"
                                      role="tooltip"
                                    >
                                      Delete
                                    </span>
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="box-footer !border-t-0">
              <div className="flex items-center flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <select
                    className="form-control select-show-page-size !w-auto !py-1 !px-4 !text-[0.75rem]"
                    value={pageSize}
                    onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                    aria-label="Entries per page"
                  >
                    {[10, 25, 50, 100].map((size) => (
                      <option key={size} value={size}>
                        Show {size}
                      </option>
                    ))}
                  </select>
                  <span className="text-[0.8125rem] text-defaulttextcolor/70">
                    Showing {startIndex} to {endIndex} of {totalResults} entries
                  </span>
                </div>
                <div className="ms-auto">
                  <nav aria-label="Page navigation" className="pagination-style-4">
                    <ul className="ti-pagination mb-0">
                      <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                        <button
                          className="page-link px-3 py-[0.375rem]"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                        >
                          Prev
                        </button>
                      </li>
                      {totalPages <= 7
                        ? Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                            <li key={p} className={`page-item ${currentPage === p ? 'active' : ''}`}>
                              <button className="page-link px-3 py-[0.375rem]" onClick={() => handlePageChange(p)}>
                                {p}
                              </button>
                            </li>
                          ))
                        : (
                          <>
                            {currentPage > 2 && (
                              <>
                                <li className="page-item">
                                  <button className="page-link px-3 py-[0.375rem]" onClick={() => handlePageChange(1)}>1</button>
                                </li>
                                {currentPage > 3 && (
                                  <li className="page-item disabled">
                                    <span className="page-link px-3 py-[0.375rem]">...</span>
                                  </li>
                                )}
                              </>
                            )}
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              let pageNum = currentPage < 3 ? i + 1 : currentPage > totalPages - 3 ? totalPages - 4 + i : currentPage - 2 + i
                              if (pageNum < 1 || pageNum > totalPages) return null
                              return (
                                <li key={pageNum} className={`page-item ${currentPage === pageNum ? 'active' : ''}`}>
                                  <button className="page-link px-3 py-[0.375rem]" onClick={() => handlePageChange(pageNum)}>
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
                                  <button className="page-link px-3 py-[0.375rem]" onClick={() => handlePageChange(totalPages)}>
                                    {totalPages}
                                  </button>
                                </li>
                              </>
                            )}
                          </>
                        )}
                      <li className={`page-item ${currentPage >= totalPages ? 'disabled' : ''}`}>
                        <button
                          className="page-link px-3 py-[0.375rem] text-primary"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage >= totalPages}
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

      {showCategoryModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 dark:bg-black/70" onClick={() => setShowCategoryModal(false)} aria-hidden="true" />
          <div className="relative ti-modal-content bg-white dark:bg-bodybg rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] flex flex-col">
            <div className="ti-modal-header flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h6 className="ti-modal-title text-lg font-semibold">
                {editingCategory ? 'Edit Category' : 'Create Category'}
              </h6>
              <button type="button" className="ti-modal-close-btn p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => setShowCategoryModal(false)}>
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            <div className="ti-modal-body px-4 py-4 overflow-y-auto flex-1">
              <label htmlFor="category-name" className="form-label">Category Name</label>
              <input
                id="category-name"
                type="text"
                className="form-control"
                placeholder="Enter category name"
                value={categoryName}
                autoFocus
                onChange={(e) => setCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleSaveCategory()
                  }
                }}
              />
              <p className="mt-2 text-[0.75rem] text-defaulttextcolor/55">
                A category groups training modules. Assign modules to a category from the module editor, and link positions to modules on the Positions tab.
              </p>
            </div>
            <div className="ti-modal-footer px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
              <button type="button" className="ti-btn ti-btn-light" onClick={() => setShowCategoryModal(false)}>
                Cancel
              </button>
              <button type="button" className="ti-btn ti-btn-primary-full" onClick={handleSaveCategory}>
                {editingCategory ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  )
}


