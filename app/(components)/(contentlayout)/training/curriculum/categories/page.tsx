"use client"

import Pageheader from '@/shared/layout-components/page-header/pageheader'
import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment, useMemo, useState } from 'react'
import { useTable, useSortBy, usePagination } from 'react-table'

interface Category {
  id: string
  categoryName: string
  dateCreated: string
  courses: number
}

const CATEGORIES_DATA: Category[] = [
  { id: '1', categoryName: 'Technical Skills', dateCreated: '2024-01-15', courses: 12 },
  { id: '2', categoryName: 'Leadership & Management', dateCreated: '2024-01-18', courses: 8 },
  { id: '3', categoryName: 'Compliance & Safety', dateCreated: '2024-01-20', courses: 5 },
  { id: '4', categoryName: 'Soft Skills', dateCreated: '2024-01-22', courses: 15 },
  { id: '5', categoryName: 'Product Knowledge', dateCreated: '2024-01-25', courses: 6 },
  { id: '6', categoryName: 'Sales & Marketing', dateCreated: '2024-02-01', courses: 9 },
  { id: '7', categoryName: 'Customer Service', dateCreated: '2024-02-05', courses: 7 },
  { id: '8', categoryName: 'Onboarding', dateCreated: '2024-02-10', courses: 4 },
]

const TrainingCategories = () => {
  const [categories, setCategories] = useState<Category[]>(CATEGORIES_DATA)
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [categoryName, setCategoryName] = useState('')

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

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this category?')) {
      setCategories((prev) => prev.filter((c) => c.id !== id))
      setSelectedRows((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const handleDeleteSelected = () => {
    if (selectedRows.size === 0) return
    if (confirm(`Are you sure you want to delete ${selectedRows.size} category(ies)?`)) {
      setCategories((prev) => prev.filter((c) => !selectedRows.has(c.id)))
      setSelectedRows(new Set())
    }
  }

  const openCreateModal = () => {
    setEditingCategory(null)
    setCategoryName('')
    setShowCategoryModal(true)
  }

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat)
    setCategoryName(cat.categoryName)
    setShowCategoryModal(true)
  }

  const handleSaveCategory = () => {
    const name = categoryName.trim()
    if (!name) return
    if (editingCategory) {
      setCategories((prev) =>
        prev.map((c) => (c.id === editingCategory.id ? { ...c, categoryName: name } : c))
      )
    } else {
      setCategories((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          categoryName: name,
          dateCreated: new Date().toISOString().split('T')[0],
          courses: 0,
        },
      ])
    }
    setShowCategoryModal(false)
    setCategoryName('')
    setEditingCategory(null)
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
        Cell: ({ row, state }: any) => {
          const { pageIndex, pageSize } = state
          return pageIndex * pageSize + row.index + 1
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
    [selectedRows]
  )

  const tableInstance: any = useTable(
    {
      columns,
      data: categories,
      initialState: { pageIndex: 0, pageSize: 10 },
    },
    useSortBy,
    usePagination
  )

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    state,
    page,
    nextPage,
    previousPage,
    canNextPage,
    canPreviousPage,
    pageOptions,
    gotoPage,
    pageCount,
    setPageSize,
  } = tableInstance

  const { pageIndex, pageSize } = state

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
                  {categories.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  className="form-control !w-auto !py-1 !px-4 !text-[0.75rem] me-2"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
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
                    {page.map((row: any) => {
                      prepareRow(row)
                      return (
                        <tr {...row.getRowProps()} className="border-b border-gray-300 dark:border-gray-600" key={row.getRowProps().key}>
                          {row.cells.map((cell: any) => (
                            <td {...cell.getCellProps()} key={cell.getCellProps().key}>
                              {cell.render('Cell')}
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="box-footer !border-t-0">
              <div className="flex items-center flex-wrap gap-4">
                <div>
                  Showing {pageIndex * pageSize + 1} to {Math.min((pageIndex + 1) * pageSize, categories.length)} of {categories.length} entries{' '}
                  <i className="bi bi-arrow-right ms-2 font-semibold"></i>
                </div>
                <div className="ms-auto">
                  <nav aria-label="Page navigation" className="pagination-style-4">
                    <ul className="ti-pagination mb-0">
                      <li className={`page-item ${!canPreviousPage ? 'disabled' : ''}`}>
                        <button className="page-link px-3 py-[0.375rem]" onClick={() => previousPage()} disabled={!canPreviousPage}>
                          Prev
                        </button>
                      </li>
                      {pageOptions.length <= 7
                        ? pageOptions.map((p: number) => (
                            <li key={p} className={`page-item ${pageIndex === p ? 'active' : ''}`}>
                              <button className="page-link px-3 py-[0.375rem]" onClick={() => gotoPage(p)}>
                                {p + 1}
                              </button>
                            </li>
                          ))
                        : (
                          <>
                            {pageIndex > 2 && (
                              <>
                                <li className="page-item">
                                  <button className="page-link px-3 py-[0.375rem]" onClick={() => gotoPage(0)}>1</button>
                                </li>
                                {pageIndex > 3 && (
                                  <li className="page-item disabled">
                                    <span className="page-link px-3 py-[0.375rem]">...</span>
                                  </li>
                                )}
                              </>
                            )}
                            {Array.from({ length: Math.min(5, pageCount) }, (_, i) => {
                              let pageNum = pageIndex < 3 ? i : pageIndex > pageCount - 4 ? pageCount - 5 + i : pageIndex - 2 + i
                              return (
                                <li key={pageNum} className={`page-item ${pageIndex === pageNum ? 'active' : ''}`}>
                                  <button className="page-link px-3 py-[0.375rem]" onClick={() => gotoPage(pageNum)}>
                                    {pageNum + 1}
                                  </button>
                                </li>
                              )
                            })}
                            {pageIndex < pageCount - 3 && (
                              <>
                                {pageIndex < pageCount - 4 && (
                                  <li className="page-item disabled">
                                    <span className="page-link px-3 py-[0.375rem]">...</span>
                                  </li>
                                )}
                                <li className="page-item">
                                  <button className="page-link px-3 py-[0.375rem]" onClick={() => gotoPage(pageCount - 1)}>
                                    {pageCount}
                                  </button>
                                </li>
                              </>
                            )}
                          </>
                        )}
                      <li className={`page-item ${!canNextPage ? 'disabled' : ''}`}>
                        <button className="page-link px-3 py-[0.375rem] text-primary" onClick={() => nextPage()} disabled={!canNextPage}>
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
