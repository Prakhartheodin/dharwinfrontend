"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import Swal from "sweetalert2"
import { AxiosError } from "axios"
import * as categoriesApi from "@/shared/lib/api/categories"
import type { Category } from "@/shared/lib/api/categories"
import { useAuth } from "@/shared/contexts/auth-context"
import { hasPermission } from "@/shared/lib/permissions"
import { useModalBehavior } from "@/shared/hooks/useModalBehavior"

export interface FoldersDrawerProps {
  open: boolean
  onClose: () => void
  categories: Category[]
  onChanged: () => void
}

export default function FoldersDrawer({ open, onClose, categories, onChanged }: FoldersDrawerProps) {
  const auth = useAuth()
  const canCreateCategory = hasPermission(auth, "create_training_category")
  const canUpdateCategory = hasPermission(auth, "update_training_category")
  const canDeleteCategory = hasPermission(auth, "delete_training_category")

  const [sortBy, setSortBy] = useState<string>("createdAt:desc")
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const selectAllRef = useRef<HTMLInputElement>(null)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [categoryName, setCategoryName] = useState("")
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const { containerRef, backdropProps } = useModalBehavior({
    isOpen: open,
    onClose,
  })

  useEffect(() => {
    if (!open) {
      setSelectedRows(new Set())
      setShowCategoryModal(false)
      setEditingCategory(null)
      setCategoryName("")
      setStatusMessage(null)
    }
  }, [open])

  const sorted = useMemo(() => {
    const arr = [...categories]
    const [field, dir] = sortBy.split(":")
    arr.sort((a, b) => {
      const cmp =
        field === "name"
          ? a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
          : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      return dir === "desc" ? -cmp : cmp
    })
    return arr
  }, [categories, sortBy])

  const isAllSelected = sorted.length > 0 && selectedRows.size === sorted.length
  const isIndeterminate = selectedRows.size > 0 && selectedRows.size < sorted.length

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = isIndeterminate
  }, [isIndeterminate])

  if (!open) return null

  const toggleSort = (field: "name" | "createdAt") => {
    setSortBy((prev) => (prev === `${field}:asc` ? `${field}:desc` : `${field}:asc`))
    setSelectedRows(new Set())
  }

  const sortIcon = (field: string) =>
    sortBy === `${field}:asc`
      ? "ri-arrow-up-s-line"
      : sortBy === `${field}:desc`
        ? "ri-arrow-down-s-line"
        : "ri-arrow-up-down-line"

  const isActiveSort = (field: string) => sortBy.startsWith(`${field}:`)

  const sortBtnClass = (field: string) =>
    `inline-flex items-center gap-0.5 rounded-md px-1.5 py-1 text-[0.68rem] font-semibold leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
      isActiveSort(field)
        ? "bg-primary/10 text-primary"
        : "text-defaulttextcolor/55 hover:bg-primary/5 hover:text-primary"
    }`

  const handleRowSelect = (id: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedRows(e.target.checked ? new Set(sorted.map((c) => c.id)) : new Set())
  }

  const handleDeleteSelected = async () => {
    if (!canDeleteCategory || selectedRows.size === 0) return
    const ids = Array.from(selectedRows)

    const result = await Swal.fire({
      title: "Delete Categories?",
      text: `Are you sure you want to delete ${ids.length} categor${ids.length === 1 ? "y" : "ies"}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete them!",
    })
    if (!result.isConfirmed) return

    const outcomes = await Promise.allSettled(ids.map((id) => categoriesApi.deleteCategory(id)))
    const failed = outcomes.filter((o) => o.status === "rejected").length
    const deleted = ids.length - failed

    setSelectedRows(new Set())
    onChanged()

    if (failed === 0) {
      setStatusMessage(`${deleted} categor${deleted === 1 ? "y" : "ies"} deleted successfully.`)
      await Swal.fire({
        icon: "success",
        title: "Categories deleted",
        text: `${deleted} categor${deleted === 1 ? "y" : "ies"} deleted successfully.`,
        toast: true,
        position: "top-end",
        timer: 3000,
        showConfirmButton: false,
        timerProgressBar: true,
      })
    } else {
      const msg = `${deleted} deleted, ${failed} could not be deleted (still linked to modules).`
      setStatusMessage(msg)
      await Swal.fire({
        icon: deleted > 0 ? "warning" : "error",
        title: deleted > 0 ? "Partially deleted" : "Delete failed",
        text: msg,
        toast: true,
        position: "top-end",
        timer: 5000,
        showConfirmButton: false,
        timerProgressBar: true,
      })
    }
  }

  const handleDelete = async (id: string) => {
    if (!canDeleteCategory) return
    const result = await Swal.fire({
      title: "Delete Category?",
      text: "Are you sure you want to delete this category?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    })
    if (!result.isConfirmed) return
    try {
      await categoriesApi.deleteCategory(id)
      setSelectedRows((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      onChanged()
      await Swal.fire({
        icon: "success",
        title: "Category deleted",
        text: "The category has been deleted successfully.",
        toast: true,
        position: "top-end",
        timer: 3000,
        showConfirmButton: false,
        timerProgressBar: true,
      })
    } catch (err) {
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : "Failed to delete category."
      await Swal.fire({
        icon: "error",
        title: "Failed to delete category",
        text: msg,
        toast: true,
        position: "top-end",
        timer: 4000,
        showConfirmButton: false,
      })
    }
  }

  const openCreateModal = () => {
    setEditingCategory(null)
    setCategoryName("")
    setShowCategoryModal(true)
  }

  const openEditModal = (category: Category) => {
    setEditingCategory(category)
    setCategoryName(category.name)
    setShowCategoryModal(true)
  }

  const handleSaveCategory = async () => {
    const name = categoryName.trim()
    if (!name) {
      await Swal.fire({
        icon: "error",
        title: "Validation Error",
        text: "Category name is required.",
        toast: true,
        position: "top-end",
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
      } else {
        if (!canCreateCategory) return
        await categoriesApi.createCategory(payload)
      }
      setShowCategoryModal(false)
      setEditingCategory(null)
      setCategoryName("")
      onChanged()
      await Swal.fire({
        icon: "success",
        title: editingCategory ? "Category updated" : "Category created",
        text: editingCategory
          ? `The category "${name}" has been updated.`
          : `The category "${name}" has been created successfully.`,
        toast: true,
        position: "top-end",
        timer: 3000,
        showConfirmButton: false,
        timerProgressBar: true,
      })
    } catch (err) {
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : editingCategory
            ? "Failed to update category."
            : "Failed to create category."
      await Swal.fire({
        icon: "error",
        title: editingCategory ? "Failed to update category" : "Failed to create category",
        text: msg,
        toast: true,
        position: "top-end",
        timer: 4000,
        showConfirmButton: false,
        timerProgressBar: true,
      })
    }
  }

  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label="Folders">
      <div className="absolute inset-0 bg-black/50 dark:bg-black/70" {...backdropProps} />
      <div
        ref={containerRef}
        className="absolute inset-y-0 end-0 flex w-full max-w-xl flex-col bg-white shadow-xl dark:bg-bodybg"
      >
        <div className="flex items-center justify-between border-b border-defaultborder/70 px-4 py-3">
          <div>
            <h2 className="text-lg font-semibold text-defaulttextcolor dark:text-white">Manage folders</h2>
            <p className="text-xs text-defaulttextcolor/55">Create, rename, and delete training categories.</p>
          </div>
          <button
            type="button"
            className="ti-btn ti-btn-icon ti-btn-light !mb-0"
            aria-label="Close folders drawer"
            onClick={onClose}
          >
            <i className="ri-close-line text-xl" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-defaultborder/50 px-4 py-2">
          {canDeleteCategory && selectedRows.size > 0 ? (
            <button
              type="button"
              className="ti-btn ti-btn-danger !py-1 !px-2 !text-[0.75rem] !mb-0"
              onClick={() => void handleDeleteSelected()}
            >
              <i className="ri-delete-bin-line align-middle" /> Delete Selected ({selectedRows.size})
            </button>
          ) : null}
          {canCreateCategory ? (
            <button
              type="button"
              className="ti-btn ti-btn-primary-full !py-1 !px-2 !text-[0.75rem] !mb-0"
              onClick={openCreateModal}
            >
              <i className="ri-add-line font-semibold align-middle" /> Create
            </button>
          ) : null}
          <div className="ms-auto inline-flex items-center gap-1">
            <button
              type="button"
              className={sortBtnClass("name")}
              onClick={() => toggleSort("name")}
              aria-label={`Sort by name${isActiveSort("name") ? (sortBy.endsWith(":asc") ? ", ascending" : ", descending") : ""}`}
            >
              Name <i className={`${sortIcon("name")} text-[0.9rem]`} aria-hidden />
            </button>
            <button
              type="button"
              className={sortBtnClass("createdAt")}
              onClick={() => toggleSort("createdAt")}
              aria-label={`Sort by date created${isActiveSort("createdAt") ? (sortBy.endsWith(":asc") ? ", ascending" : ", descending") : ""}`}
            >
              Date <i className={`${sortIcon("createdAt")} text-[0.9rem]`} aria-hidden />
            </button>
          </div>
        </div>

        {statusMessage ? (
          <div className="border-b border-amber-300/40 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:bg-amber-500/15 dark:text-amber-100" role="status">
            {statusMessage}
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {sorted.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-defaulttextcolor/60">No folders yet.</div>
          ) : (
            <table className="table min-w-full">
              <thead>
                <tr>
                  {canDeleteCategory ? (
                    <th className="!w-10 text-center">
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        className="form-check-input"
                        checked={isAllSelected}
                        onChange={handleSelectAll}
                        aria-label="Select all"
                      />
                    </th>
                  ) : null}
                  <th className="text-start">Folder</th>
                  <th className="text-center !w-16">Modules</th>
                  <th className="text-center !w-20">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((category) => (
                  <tr key={category.id} className="border-b border-defaultborder/40">
                    {canDeleteCategory ? (
                      <td className="text-center">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={selectedRows.has(category.id)}
                          onChange={() => handleRowSelect(category.id)}
                          aria-label={`Select ${category.name}`}
                        />
                      </td>
                    ) : null}
                    <td>
                      <div className="font-medium text-defaulttextcolor dark:text-white">{category.name}</div>
                      <div className="text-[0.7rem] text-defaulttextcolor/50">
                        {category.createdAt ? new Date(category.createdAt).toISOString().split("T")[0] : ""}
                      </div>
                    </td>
                    <td className="text-center tabular-nums">{category.moduleCount ?? 0}</td>
                    <td className="text-center">
                      <div className="inline-flex gap-1">
                        {canUpdateCategory ? (
                          <button
                            type="button"
                            className="ti-btn ti-btn-icon ti-btn-sm ti-btn-light !mb-0"
                            aria-label={`Edit ${category.name}`}
                            onClick={() => openEditModal(category)}
                          >
                            <i className="ri-pencil-line" />
                          </button>
                        ) : null}
                        {canDeleteCategory ? (
                          <button
                            type="button"
                            className="ti-btn ti-btn-icon ti-btn-sm ti-btn-danger !mb-0"
                            aria-label={`Delete ${category.name}`}
                            onClick={() => void handleDelete(category.id)}
                          >
                            <i className="ri-delete-bin-line" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showCategoryModal ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowCategoryModal(false)}
            aria-hidden
          />
          <div className="relative w-full max-w-md rounded-lg bg-white p-4 shadow-xl dark:bg-bodybg mx-4">
            <h3 className="text-lg font-semibold mb-3">
              {editingCategory ? "Edit Category" : "Create Category"}
            </h3>
            <label htmlFor="folder-category-name" className="form-label">
              Category Name
            </label>
            <input
              id="folder-category-name"
              type="text"
              className="form-control"
              placeholder="Enter category name"
              value={categoryName}
              autoFocus
              onChange={(e) => setCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  void handleSaveCategory()
                }
              }}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="ti-btn ti-btn-light" onClick={() => setShowCategoryModal(false)}>
                Cancel
              </button>
              <button type="button" className="ti-btn ti-btn-primary-full" onClick={() => void handleSaveCategory()}>
                {editingCategory ? "Save" : "Create"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
