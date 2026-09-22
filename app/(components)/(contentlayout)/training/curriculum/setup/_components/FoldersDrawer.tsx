"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import Swal from "sweetalert2"
import { AxiosError } from "axios"
import * as categoriesApi from "@/shared/lib/api/categories"
import type { Category } from "@/shared/lib/api/categories"
import { useAuth } from "@/shared/contexts/auth-context"
import { hasPermission } from "@/shared/lib/permissions"
import { useModalBehavior } from "@/shared/hooks/useModalBehavior"

/** Local calendar day. toISOString() rendered the UTC day, which is off by one for IST evenings. */
function formatCreated(iso?: string): string {
  if (!iso) return "-"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "-"
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })
}

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
  const [savingCategory, setSavingCategory] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  // Escape must dismiss the topmost layer. Without this the drawer's own handler
  // closed the whole drawer while the name modal was open, discarding the input.
  const closeTopLayer = useCallback(() => {
    if (showCategoryModal) setShowCategoryModal(false)
    else onClose()
  }, [showCategoryModal, onClose])

  // While the name modal is open, park the drawer trap so Escape / Tab only
  // hit the top layer. closeTopLayer still covers Escape when the modal is closed.
  const { containerRef, backdropProps } = useModalBehavior({
    isOpen: open && !showCategoryModal,
    onClose: closeTopLayer,
  })

  // The name dialog needs its own trap; the drawer's only spans the drawer panel,
  // so Tab used to walk straight out of the dialog.
  const closeCategoryModal = useCallback(() => setShowCategoryModal(false), [])
  const { containerRef: modalRef, backdropProps: modalBackdropProps } = useModalBehavior({
    isOpen: open && showCategoryModal,
    onClose: closeCategoryModal,
  })

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) {
      setSelectedRows(new Set())
      setShowCategoryModal(false)
      setEditingCategory(null)
      setCategoryName("")
      setSavingCategory(false)
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

  if (!open || !mounted) return null

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

  const ariaSort = (field: string): "ascending" | "descending" | "none" =>
    !isActiveSort(field) ? "none" : sortBy.endsWith(":asc") ? "ascending" : "descending"

  const sortBtnClass = (field: string) =>
    `inline-flex items-center gap-0.5 rounded-md px-1.5 py-1 text-[0.68rem] font-semibold leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
      isActiveSort(field)
        ? "bg-primary/10 text-primary"
        : "text-defaulttextcolor/70 hover:bg-primary/5 hover:text-primary"
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
    if (savingCategory) return
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
    setSavingCategory(true)
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
    } finally {
      setSavingCategory(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[130]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="folders-drawer-title"
    >
      <div
        className="absolute inset-0 bg-black/60 dark:bg-black/75"
        data-testid="folders-drawer-backdrop"
        aria-hidden
        {...backdropProps}
      />
      <div
        ref={containerRef}
        className="absolute inset-y-0 end-0 z-[1] flex w-full max-w-xl flex-col bg-white shadow-xl dark:bg-bodybg"
      >
        <div className="flex items-center justify-between border-b border-defaultborder/70 px-4 py-3">
          <div>
            <h2
              id="folders-drawer-title"
              className="text-lg font-semibold text-defaulttextcolor dark:text-white"
            >
              Manage folders
              <span className="badge bg-light text-default rounded-full ms-2 align-middle text-[0.7rem]">
                {sorted.length}
              </span>
            </h2>
            <p className="text-xs text-defaulttextcolor/70">Create, rename, and delete training categories.</p>
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
          {canCreateCategory ? (
            <button
              type="button"
              className="ti-btn ti-btn-primary-full !py-1 !px-2 !text-[0.75rem] !mb-0"
              onClick={openCreateModal}
            >
              <i className="ri-add-line font-semibold align-middle" /> Create
            </button>
          ) : null}
          {selectedRows.size > 0 ? (
            <div className="ms-auto inline-flex items-center gap-2">
              <span className="text-[0.75rem] font-medium text-defaulttextcolor/70">
                {selectedRows.size} selected
              </span>
              {canDeleteCategory ? (
                <button
                  type="button"
                  className="ti-btn ti-btn-danger !py-1 !px-2 !text-[0.75rem] !mb-0"
                  onClick={() => void handleDeleteSelected()}
                >
                  <i className="ri-delete-bin-line align-middle" /> Delete Selected ({selectedRows.size})
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {statusMessage ? (
          <div
            className="flex items-start gap-2 border-b border-amber-300/40 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:bg-amber-500/15 dark:text-amber-100"
            role="status"
          >
            <span className="flex-1">{statusMessage}</span>
            <button
              type="button"
              className="shrink-0 rounded p-0.5 hover:bg-amber-900/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
              aria-label="Dismiss message"
              onClick={() => setStatusMessage(null)}
            >
              <i className="ri-close-line" aria-hidden />
            </button>
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {sorted.length === 0 ? (
            <div className="px-3 py-10 text-center">
              <p className="font-medium text-defaulttextcolor dark:text-white">No folders yet</p>
              <p className="mx-auto mt-1 max-w-sm text-[0.8125rem] text-defaulttextcolor/65">
                Folders group training modules by category. Create one, then tag modules with it.
              </p>
              {canCreateCategory ? (
                <button
                  type="button"
                  className="ti-btn ti-btn-primary-full !mb-0 mt-3 !py-1.5 !px-3 !text-sm"
                  onClick={openCreateModal}
                >
                  Create folder
                </button>
              ) : null}
            </div>
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
                  <th className="text-start" aria-sort={ariaSort("name")}>
                    <button
                      type="button"
                      className={sortBtnClass("name")}
                      onClick={() => toggleSort("name")}
                      aria-label={`Folder, sort by name${isActiveSort("name") ? (sortBy.endsWith(":asc") ? ", ascending" : ", descending") : ""}`}
                    >
                      Folder <i className={`${sortIcon("name")} text-[0.9rem]`} aria-hidden />
                    </button>
                  </th>
                  <th className="text-start !w-28" aria-sort={ariaSort("createdAt")}>
                    <button
                      type="button"
                      className={sortBtnClass("createdAt")}
                      onClick={() => toggleSort("createdAt")}
                      aria-label={`Created, sort by date${isActiveSort("createdAt") ? (sortBy.endsWith(":asc") ? ", ascending" : ", descending") : ""}`}
                    >
                      Created <i className={`${sortIcon("createdAt")} text-[0.9rem]`} aria-hidden />
                    </button>
                  </th>
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
                    </td>
                    <td className="text-[0.75rem] text-defaulttextcolor/70">
                      {formatCreated(category.createdAt)}
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
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center p-3"
          role="dialog"
          aria-modal="true"
          aria-labelledby="folder-category-title"
        >
          <div
            className="absolute inset-0 bg-black/60 dark:bg-black/75"
            data-testid="folder-category-backdrop"
            {...modalBackdropProps}
            aria-hidden
          />
          <div
            ref={modalRef}
            className="relative z-[1] w-full max-w-md rounded-lg bg-white p-4 shadow-xl dark:bg-bodybg mx-4"
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <h3 id="folder-category-title" className="text-lg font-semibold">
                {editingCategory ? "Edit Category" : "Create Category"}
              </h3>
              <button
                type="button"
                className="ti-btn ti-btn-icon ti-btn-light !mb-0 shrink-0"
                aria-label="Close category dialog"
                disabled={savingCategory}
                onClick={closeCategoryModal}
              >
                <i className="ri-close-line text-xl" aria-hidden />
              </button>
            </div>
            <label htmlFor="folder-category-name" className="form-label">
              Category Name
            </label>
            <input
              id="folder-category-name"
              type="text"
              className="form-control"
              placeholder="e.g. Onboarding"
              value={categoryName}
              autoFocus
              disabled={savingCategory}
              aria-describedby="folder-category-help"
              onChange={(e) => setCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  void handleSaveCategory()
                }
              }}
            />
            <p id="folder-category-help" className="mt-1 text-[0.75rem] text-defaulttextcolor/65">
              Shown as a folder on the modules catalog and as a filter chip here.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="ti-btn ti-btn-light"
                disabled={savingCategory}
                onClick={closeCategoryModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ti-btn ti-btn-primary-full"
                disabled={savingCategory || !categoryName.trim()}
                onClick={() => void handleSaveCategory()}
              >
                {savingCategory ? "Saving…" : editingCategory ? "Save" : "Create"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>,
    document.body
  )
}
