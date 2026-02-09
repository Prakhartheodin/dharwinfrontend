"use client"

import Pageheader from '@/shared/layout-components/page-header/pageheader'
import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment, useMemo, useState, useEffect, useCallback } from 'react'
import { useTable, useSortBy, usePagination } from 'react-table'
import Swal from 'sweetalert2'
import { AxiosError } from 'axios'
import * as categoriesApi from '@/shared/lib/api/categories'
import type { Category } from '@/shared/lib/api/categories'

interface CategoryRow extends Category {
  courses: number
  categoryName: string
  dateCreated: string
}

const TrainingCategories = () => {
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryRow | null>(null)
  const [categoryName, setCategoryName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalResults, setTotalResults] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [sortBy, setSortBy] = useState<string>('createdAt:desc')

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
        courses: 0, // API doesn't provide courses count, set to 0 for now
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

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const handleRowSelect = (id: string) => {
    const next = new Set(selectedRows)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedRows(next)
  }

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedRows(new Set(categories.map((c) => c.id)))
    else setSelectedRows(new Set())
  }

  const isAllSelected = categories.length > 0 && selectedRows.size === categories.length
  const isIndeterminate = selectedRows.size > 0 && selectedRows.size < categories.length

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Delete Category?',
      text: 'Are you sure you want to delete this category?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
    })

    if (result.isConfirmed) {
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
        await fetchCategories()
        setSelectedRows((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
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
  }

  const handleDeleteSelected = async () => {
    if (selectedRows.size === 0) return
    
    const result = await Swal.fire({
      title: 'Delete Categories?',
      text: `Are you sure you want to delete ${selectedRows.size} category(ies)?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete them!',
    })

    if (result.isConfirmed) {
      try {
        await Promise.all(Array.from(selectedRows).map((id) => categoriesApi.deleteCategory(id)))
        await Swal.fire({
          icon: 'success',
          title: 'Categories deleted',
          text: `${selectedRows.size} category(ies) have been deleted successfully.`,
          toast: true,
          position: 'top-end',
          timer: 3000,
          showConfirmButton: false,
          timerProgressBar: true,
        })
        setSelectedRows(new Set())
        await fetchCategories()
      } catch (err) {
        const msg =
          err instanceof AxiosError && err.response?.data?.message
            ? String(err.response.data.message)
            : 'Failed to delete categories.'
        await Swal.fire({
          icon: 'error',
          title: 'Failed to delete categories',
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

  const openCreateModal = () => {
    setEditingCategory(null)
    setCategoryName('')
    setShowCategoryModal(true)
  }

  const openEditModal = (cat: CategoryRow) => {
    setEditingCategory(cat)
    setCategoryName(cat.name)
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

    try {
      if (editingCategory) {
        await categoriesApi.updateCategory(editingCategory.id, { name })
        await Swal.fire({
          icon: 'success',
          title: 'Category updated',
          text: `The category "${name}" has been updated successfully.`,
          toast: true,
          position: 'top-end',
          timer: 3000,
          showConfirmButton: false,
          timerProgressBar: true,
        })
      } else {
        await categoriesApi.createCategory({ name })
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
      setCategoryName('')
      setEditingCategory(null)
      await fetchCategories()
    } catch (err) {
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : editingCategory
          ? 'Failed to update category.'
          : 'Failed to create category.'
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    fetchCategories()
  }

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    setCurrentPage(1)
  }

  const handleImportExcel = () => {
    // Placeholder: trigger file input or open import modal
    console.log('Import Excel')
  }

  const handleExportExcel = () => {
    // Placeholder: export current data as CSV/Excel
    console.log('Export Excel')
  }

  const handleDownloadTemplate = () => {
    // Placeholder: download template file
    console.log('Download Template')
  }

  const columns = useMemo(
    () => [
      {
        Header: 'All',
        accessor: 'checkbox',
        disableSortBy: true,
        Cell: ({ row }: any) => (
          <input
            className="form-check-input"
            type="checkbox"
            checked={selectedRows.has(row.original.id)}
            onChange={() => handleRowSelect(row.original.id)}
            aria-label={`Select ${row.original.categoryName}`}
          />
        ),
      },
      {
        Header: 'S.no.',
        accessor: 'sno',
        disableSortBy: true,
        Cell: ({ row }: any) => {
          return (currentPage - 1) * pageSize + row.index + 1
        },
      },
      {
        Header: 'Category Name',
        accessor: 'categoryName',
      },
      {
        Header: 'Date Created',
        accessor: 'dateCreated',
      },
      {
        Header: 'Courses',
        accessor: 'courses',
        Cell: ({ row }: any) => (
          <span className="badge bg-primary/10 text-primary border border-primary/30 px-2 py-0.5 rounded-full text-xs font-medium">
            {row.original.courses}
          </span>
        ),
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
                onClick={() => openEditModal(row.original)}
                className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-info"
              >
                <i className="ri-pencil-line"></i>
                <span className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700" role="tooltip">
                  Edit
                </span>
              </button>
            </div>
            <div className="hs-tooltip ti-main-tooltip">
              <button
                type="button"
                onClick={() => handleDelete(row.original.id)}
                className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-danger"
              >
                <i className="ri-delete-bin-line"></i>
                <span className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700" role="tooltip">
                  Delete
                </span>
              </button>
            </div>
          </div>
        ),
      },
    ],
    [selectedRows, currentPage, pageSize]
  )

  const tableInstance: any = useTable(
    {
      columns,
      data: categories,
      manualPagination: true,
      pageCount: totalPages,
      initialState: { pageIndex: 0, pageSize: 10 },
    },
    useSortBy
  )

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
  } = tableInstance

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
  }

  const startIndex = (currentPage - 1) * pageSize + 1
  const endIndex = Math.min(currentPage * pageSize, totalResults)

  return (
    <Fragment>
      <Seo title="Training Categories" />
   
      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-8rem)]">
        <div className="xl:col-span-12 col-span-12 h-full flex flex-col">
          <div className="box custom-box h-full flex flex-col">
            <div className="box-header flex items-center justify-between flex-wrap gap-4">
              <div className="box-title">
                Categories
                <span className="badge bg-light text-default rounded-full ms-1 text-[0.75rem] align-middle">
                  {totalResults}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <form onSubmit={handleSearch} className="flex items-center gap-2 me-2">
                  <input
                    type="text"
                    className="form-control !w-auto !py-1 !px-4 !text-[0.75rem]"
                    placeholder="Search categories..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="ti-btn ti-btn-light !py-1 !px-2 !text-[0.75rem]"
                  >
                    <i className="ri-search-line"></i>
                  </button>
                </form>
                <select
                  className="form-control !w-auto !py-1 !px-4 !text-[0.75rem] me-2"
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                >
                  {[10, 25, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      Show {size}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="ti-btn ti-btn-primary-full !py-1 !px-2 !text-[0.75rem] me-2"
                  onClick={openCreateModal}
                >
                  <i className="ri-add-line font-semibold align-middle"></i>Create Category
                </button>
                <div className="hs-dropdown ti-dropdown me-2">
                  <button
                    type="button"
                    className="ti-btn ti-btn-primary !py-1 !px-2 !text-[0.75rem] ti-dropdown-toggle"
                    id="excel-dropdown-button"
                    aria-expanded="false"
                  >
                    <i className="ri-file-excel-2-line font-semibold align-middle me-1"></i>Excel
                    <i className="ri-arrow-down-s-line align-middle ms-1 inline-block"></i>
                  </button>
                  <ul className="hs-dropdown-menu ti-dropdown-menu hidden" aria-labelledby="excel-dropdown-button">
                    <li>
                      <button type="button" className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left" onClick={handleImportExcel}>
                        <i className="ri-upload-2-line me-2 align-middle inline-block"></i>Import
                      </button>
                    </li>
                    <li>
                      <button type="button" className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left" onClick={handleExportExcel}>
                        <i className="ri-file-excel-2-line me-2 align-middle inline-block"></i>Export
                      </button>
                    </li>
                    <li>
                      <button type="button" className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left" onClick={handleDownloadTemplate}>
                        <i className="ri-download-line me-2 align-middle inline-block"></i>Template
                      </button>
                    </li>
                  </ul>
                </div>
                {selectedRows.size > 0 && (
                  <button
                    type="button"
                    className="ti-btn ti-btn-danger !py-1 !px-2 !text-[0.75rem]"
                    onClick={handleDeleteSelected}
                  >
                    <i className="ri-delete-bin-line font-semibold align-middle me-1"></i>Delete ({selectedRows.size})
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
                  <table {...getTableProps()} className="table whitespace-nowrap min-w-full table-striped table-hover table-bordered border-gray-300 dark:border-gray-600">
                    <thead>
                      {headerGroups.map((headerGroup: any) => (
                        <tr {...headerGroup.getHeaderGroupProps()} className="bg-primary/10 dark:bg-primary/20 border-b border-gray-300 dark:border-gray-600" key={headerGroup.getHeaderGroupProps().key}>
                          {headerGroup.headers.map((column: any) => (
                            <th
                              {...column.getHeaderProps(column.getSortByToggleProps?.() || column.getHeaderProps())}
                              scope="col"
                              className="text-start sticky top-0 z-10 bg-gray-50 dark:bg-black/20"
                              key={column.getHeaderProps().key}
                              style={{ position: 'sticky', top: 0, zIndex: 10 }}
                            >
                              {column.id === 'checkbox' ? (
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
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="tabletitle">{column.render('Header')}</span>
                                  {column.isSorted && (
                                    <span>
                                      {column.isSortedDesc ? <i className="ri-arrow-down-s-line text-[0.875rem]"></i> : <i className="ri-arrow-up-s-line text-[0.875rem]"></i>}
                                    </span>
                                  )}
                                </div>
                              )}
                            </th>
                          ))}
                        </tr>
                      ))}
                    </thead>
                    <tbody {...getTableBodyProps()}>
                      {categories.map((category: CategoryRow, index: number) => {
                        const row = { original: category, index }
                        return (
                          <tr className="border-b border-gray-300 dark:border-gray-600" key={category.id}>
                            {columns.map((col: any, colIndex: number) => {
                              const cellValue = col.Cell 
                                ? col.Cell({ row, column: col })
                                : category[col.accessor as keyof CategoryRow]
                              return (
                                <td key={colIndex}>
                                  {cellValue}
                                </td>
                              )
                            })}
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
                <div>
                  Showing {startIndex} to {endIndex} of {totalResults} entries{' '}
                  <i className="bi bi-arrow-right ms-2 font-semibold"></i>
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

      {/* Create / Edit Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 dark:bg-black/70" onClick={() => setShowCategoryModal(false)} aria-hidden="true" />
          <div className="relative ti-modal-content bg-white dark:bg-bodybg rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="ti-modal-header flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h6 className="ti-modal-title text-lg font-semibold">{editingCategory ? 'Edit Category' : 'Create Category'}</h6>
              <button type="button" className="ti-modal-close-btn p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => setShowCategoryModal(false)}>
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            <div className="ti-modal-body px-4 py-4">
              <label htmlFor="category-name" className="form-label">Category Name</label>
              <input
                id="category-name"
                type="text"
                className="form-control"
                placeholder="Enter category name"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleSaveCategory()
                  }
                }}
              />
            </div>
            <div className="ti-modal-footer px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
              <button type="button" className="ti-btn ti-btn-light" onClick={() => setShowCategoryModal(false)}>
                Cancel
              </button>
              <button type="button" className="ti-btn ti-btn-primary-full" onClick={handleSaveCategory}>
                {editingCategory ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  )
}

export default TrainingCategories
