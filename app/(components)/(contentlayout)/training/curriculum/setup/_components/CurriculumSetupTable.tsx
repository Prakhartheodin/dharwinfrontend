"use client"

import React, { Fragment, useCallback, useEffect, useMemo, useState } from "react"
import Swal from "sweetalert2"
import { AxiosError } from "axios"
import * as positionsApi from "@/shared/lib/api/positions"
import type { PositionRosterItem } from "@/shared/lib/api/positions"
import * as categoriesApi from "@/shared/lib/api/categories"
import type { Category } from "@/shared/lib/api/categories"
import * as trainingModulesApi from "@/shared/lib/api/training-modules"
import type { TrainingModule } from "@/shared/lib/api/training-modules"
import * as mentorsApi from "@/shared/lib/api/mentors"
import type { Mentor } from "@/shared/lib/api/mentors"
import { useAuth } from "@/shared/contexts/auth-context"
import { hasPermission } from "@/shared/lib/permissions"
import { filterPositions } from "../_lib/filterPositions"
import PositionRow, { type PositionFolderChip } from "./PositionRow"
import FoldersDrawer from "./FoldersDrawer"
import BulkAssignDialog from "./BulkAssignDialog"

export interface CurriculumSetupTableProps {
  initialDrawerOpen?: boolean
}

function positionIdOf(pos: PositionRosterItem): string {
  return pos.id || (pos as { _id?: string })._id || ""
}

export default function CurriculumSetupTable({
  initialDrawerOpen = false,
}: CurriculumSetupTableProps) {
  const auth = useAuth()
  const canViewPositions = hasPermission(auth, "view_training_positions")
  const canViewCategories = hasPermission(auth, "view_training_categories")
  const canEditPosition = hasPermission(auth, "edit_training_position")
  const canEditModule = hasPermission(auth, "edit_training_module")
  const canManageModules = canEditModule || canEditPosition

  const [positions, setPositions] = useState<PositionRosterItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [allModules, setAllModules] = useState<TrainingModule[]>([])
  const [mentors, setMentors] = useState<Mentor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [sortBy, setSortBy] = useState<string>("name:asc")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(initialDrawerOpen)
  const [bulkOpen, setBulkOpen] = useState(false)

  const [manageTarget, setManageTarget] = useState<PositionRosterItem | null>(null)
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([])
  const [modulesLoading, setModulesLoading] = useState(false)
  const [savingModules, setSavingModules] = useState(false)

  const fetchPositions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await positionsApi.getPositionRoster()
      setPositions(Array.isArray(res) ? res : [])
    } catch (err) {
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : "Failed to load positions."
      await Swal.fire({
        icon: "error",
        title: "Failed to load positions",
        text: msg,
        toast: true,
        position: "top-end",
        timer: 4000,
        showConfirmButton: false,
        timerProgressBar: true,
      })
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchCategories = useCallback(async () => {
    if (!canViewCategories && !canViewPositions) return
    try {
      const res = await categoriesApi.listCategories({ limit: 500, page: 1, sortBy: "name:asc" })
      setCategories(res.results ?? [])
    } catch {
      setCategories([])
    }
  }, [canViewCategories, canViewPositions])

  const fetchModules = useCallback(async () => {
    if (!canManageModules && !canViewPositions) return
    setModulesLoading(true)
    try {
      const res = await trainingModulesApi.listTrainingModules({ limit: 500, page: 1 })
      setAllModules(res.results ?? [])
    } catch {
      setAllModules([])
    } finally {
      setModulesLoading(false)
    }
  }, [canManageModules, canViewPositions])

  const fetchMentors = useCallback(async () => {
    if (!canEditModule) return
    try {
      const res = await mentorsApi.listMentors({ limit: 500, page: 1 })
      setMentors(res.results ?? [])
    } catch {
      setMentors([])
    }
  }, [canEditModule])

  useEffect(() => {
    void fetchPositions()
    void fetchCategories()
    void fetchModules()
    void fetchMentors()
  }, [fetchPositions, fetchCategories, fetchModules, fetchMentors])

  const foldersByModuleId = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const mod of allModules) {
      const ids = (mod.categories ?? []).map((c) => c.id).filter(Boolean)
      if (ids.length) map.set(mod.id, ids)
    }
    return map
  }, [allModules])

  const categoryById = useMemo(() => {
    const map = new Map<string, Category>()
    for (const c of categories) map.set(c.id, c)
    return map
  }, [categories])

  const modulesByCategoryId = useMemo(() => {
    const map = new Map<string, TrainingModule[]>()
    for (const mod of allModules) {
      for (const cat of mod.categories ?? []) {
        const list = map.get(cat.id) ?? []
        list.push(mod)
        map.set(cat.id, list)
      }
    }
    return map
  }, [allModules])

  const filtered = useMemo(
    () => filterPositions(positions, searchQuery, selectedFolderIds, foldersByModuleId),
    [positions, searchQuery, selectedFolderIds, foldersByModuleId]
  )

  const sorted = useMemo(() => {
    const arr = [...filtered]
    const [field, dir] = sortBy.split(":")
    arr.sort((a, b) => {
      const cmp =
        field === "employees"
          ? (a.employeeCount ?? 0) - (b.employeeCount ?? 0)
          : a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      return dir === "desc" ? -cmp : cmp
    })
    return arr
  }, [filtered, sortBy])

  const totalResults = sorted.length
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize))

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1)
  }, [currentPage, totalPages])

  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return sorted.slice(start, start + pageSize)
  }, [sorted, currentPage, pageSize])

  const startIndex = totalResults === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endIndex = Math.min(currentPage * pageSize, totalResults)

  const foldersForPosition = (pos: PositionRosterItem): PositionFolderChip[] => {
    const seen = new Map<string, PositionFolderChip>()
    for (const mod of pos.assignedModules ?? []) {
      for (const folderId of foldersByModuleId.get(mod.id) ?? []) {
        if (seen.has(folderId)) continue
        const cat = categoryById.get(folderId)
        seen.set(folderId, {
          id: folderId,
          name: cat?.name ?? folderId,
          modules: modulesByCategoryId.get(folderId) ?? [],
        })
      }
    }
    return Array.from(seen.values())
  }

  const toggleFolder = (id: string) => {
    setSelectedFolderIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
    setCurrentPage(1)
  }

  const toggleSort = (field: "name" | "employees") => {
    setSortBy((prev) => (prev === `${field}:asc` ? `${field}:desc` : `${field}:asc`))
    setCurrentPage(1)
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

  const openManageModules = (pos: PositionRosterItem) => {
    setManageTarget(pos)
    setSelectedModuleIds((pos.assignedModules ?? []).map((m) => m.id))
  }

  const closeManageModules = () => {
    setManageTarget(null)
    setSelectedModuleIds([])
  }

  const toggleModuleId = (moduleId: string) => {
    setSelectedModuleIds((prev) =>
      prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId]
    )
  }

  const handleSaveModules = async () => {
    if (!manageTarget) return
    const id = positionIdOf(manageTarget)
    setSavingModules(true)
    try {
      await positionsApi.setPositionModules(id, selectedModuleIds)
      await Swal.fire({
        icon: "success",
        title: "Modules updated",
        text: `Training modules for "${manageTarget.name}" saved.`,
        toast: true,
        position: "top-end",
        timer: 3000,
        showConfirmButton: false,
        timerProgressBar: true,
      })
      closeManageModules()
      await fetchPositions()
      await fetchModules()
    } catch (err) {
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : "Failed to update modules."
      await Swal.fire({
        icon: "error",
        title: "Failed to update modules",
        text: msg,
        toast: true,
        position: "top-end",
        timer: 4000,
        showConfirmButton: false,
      })
    } finally {
      setSavingModules(false)
    }
  }

  const refreshAll = async () => {
    await Promise.all([fetchPositions(), fetchCategories(), fetchModules()])
  }

  if (!canViewPositions && !canViewCategories) {
    return (
      <div className="rounded-xl border border-defaultborder/70 bg-white p-8 text-center dark:bg-bodybg2">
        <h2 className="text-lg font-semibold text-defaulttextcolor dark:text-white">
          You do not have access
        </h2>
        <p className="mt-2 text-sm text-defaulttextcolor/65">
          You need training position or category permissions to use Curriculum Setup. Ask an
          administrator if you believe this is a mistake.
        </p>
      </div>
    )
  }

  if (!canViewPositions) {
    return (
      <div className="rounded-xl border border-defaultborder/70 bg-white p-6 dark:bg-bodybg2">
        <p className="text-sm text-defaulttextcolor/70 mb-4">
          You can manage folders but cannot view the position roster.
        </p>
        {canViewCategories ? (
          <button
            type="button"
            className="ti-btn ti-btn-primary-full !py-1.5 !px-3 !text-sm"
            onClick={() => setDrawerOpen(true)}
          >
            Manage folders
          </button>
        ) : null}
        <FoldersDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          categories={categories}
          onChanged={() => void fetchCategories()}
        />
      </div>
    )
  }

  return (
    <Fragment>
      <div className="box custom-box flex h-full flex-col">
        <div className="box-header flex flex-wrap items-center justify-between gap-4">
          <div className="box-title">
            Curriculum Setup
            <span className="badge bg-light text-default rounded-full ms-1 text-[0.75rem] align-middle">
              {totalResults}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <input
                type="text"
                className="form-control !w-auto !py-1 !ps-3 !pe-7 !text-[0.75rem]"
                placeholder="Search positions..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                aria-label="Search"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("")
                    setCurrentPage(1)
                  }}
                  aria-label="Clear search"
                  className="absolute end-1.5 top-1/2 -translate-y-1/2 inline-flex h-5 w-5 items-center justify-center rounded-full text-defaulttextcolor/45 hover:bg-defaulttextcolor/10"
                >
                  <i className="ri-close-line text-[0.85rem]" />
                </button>
              ) : null}
            </div>
            {canViewCategories ? (
              <button
                type="button"
                className="ti-btn ti-btn-light !py-1 !px-2 !text-[0.75rem] !mb-0"
                onClick={() => setDrawerOpen(true)}
              >
                Manage folders
              </button>
            ) : null}
            {canEditPosition ? (
              <button
                type="button"
                className="ti-btn ti-btn-primary-full !py-1 !px-2 !text-[0.75rem] !mb-0"
                onClick={() => setBulkOpen(true)}
              >
                Bulk Assign
              </button>
            ) : null}
          </div>
        </div>

        {canViewCategories && categories.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 border-b border-defaultborder/50 px-4 py-2">
            {categories.map((cat) => {
              const active = selectedFolderIds.includes(cat.id)
              return (
                <button
                  key={cat.id}
                  type="button"
                  aria-pressed={active}
                  className={`rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold transition-colors ${
                    active
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-defaultborder/70 bg-white/10 text-defaulttextcolor/70 hover:border-primary/40"
                  }`}
                  onClick={() => toggleFolder(cat.id)}
                >
                  {cat.name}
                </button>
              )
            })}
          </div>
        ) : null}

        <div className="box-body !p-0 flex-1 flex flex-col overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-defaulttextcolor/70">
              Loading positions...
            </div>
          ) : totalResults === 0 ? (
            <div className="flex items-center justify-center py-12 text-defaulttextcolor/70">
              {searchQuery.trim() || selectedFolderIds.length
                ? "No positions match your filters."
                : "No positions found."}
            </div>
          ) : (
            <div className="table-responsive flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
              <table className="table min-w-full table-striped table-hover table-bordered border-gray-300 dark:border-gray-600">
                <thead>
                  <tr className="bg-primary/10 dark:bg-primary/20 border-b border-gray-300 dark:border-gray-600">
                    <th scope="col" className="text-center sticky top-0 z-10 bg-gray-50 dark:bg-black/20 !w-[3rem]">
                      S.no.
                    </th>
                    <th scope="col" className="text-start sticky top-0 z-10 bg-gray-50 dark:bg-black/20">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>Position</span>
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
                          className={sortBtnClass("employees")}
                          onClick={() => toggleSort("employees")}
                          aria-label={`Sort by employee count${isActiveSort("employees") ? (sortBy.endsWith(":asc") ? ", ascending" : ", descending") : ""}`}
                        >
                          Count <i className={`${sortIcon("employees")} text-[0.9rem]`} aria-hidden />
                        </button>
                      </div>
                    </th>
                    <th scope="col" className="text-start sticky top-0 z-10 bg-gray-50 dark:bg-black/20">
                      Folders
                    </th>
                    <th scope="col" className="text-start sticky top-0 z-10 bg-gray-50 dark:bg-black/20">
                      Courses
                    </th>
                    <th scope="col" className="text-start sticky top-0 z-10 bg-gray-50 dark:bg-black/20">
                      Employees
                    </th>
                    <th scope="col" className="text-start sticky top-0 z-10 bg-gray-50 dark:bg-black/20">
                      Auto-enrol
                    </th>
                    <th scope="col" className="text-center sticky top-0 z-10 bg-gray-50 dark:bg-black/20">
                      Manage
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((pos, index) => {
                    const id = positionIdOf(pos)
                    const serial = (currentPage - 1) * pageSize + index + 1
                    return (
                      <PositionRow
                        key={id || serial}
                        position={pos}
                        serial={serial}
                        expanded={expandedId === id}
                        onToggle={() => setExpandedId((prev) => (prev === id ? null : id))}
                        onPositionsChanged={() => void refreshAll()}
                        canManage={canEditPosition}
                        canAssign={canEditModule}
                        mentors={mentors}
                        folders={foldersForPosition(pos)}
                        onManageModules={canManageModules ? openManageModules : undefined}
                      />
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="box-footer !border-t-0">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <select
                className="form-control select-show-page-size !w-auto !py-1 !px-4 !text-[0.75rem]"
                style={{ colorScheme: "light" }}
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setCurrentPage(1)
                }}
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
                  <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                    <button
                      className="page-link px-3 py-[0.375rem]"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Prev
                    </button>
                  </li>
                  <li className={`page-item ${currentPage >= totalPages ? "disabled" : ""}`}>
                    <button
                      className="page-link px-3 py-[0.375rem] text-primary"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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

      <FoldersDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        categories={categories}
        onChanged={() => void fetchCategories()}
      />

      <BulkAssignDialog
        open={bulkOpen}
        positions={positions}
        onClose={() => setBulkOpen(false)}
        onDone={() => void refreshAll()}
      />

      {manageTarget ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 dark:bg-black/70" onClick={closeManageModules} aria-hidden />
          <div className="relative ti-modal-content bg-white dark:bg-bodybg rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] flex flex-col">
            <div className="ti-modal-header flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h6 className="ti-modal-title text-lg font-semibold">Modules for {manageTarget.name}</h6>
              <button type="button" className="ti-modal-close-btn p-2 rounded-lg" onClick={closeManageModules}>
                <i className="ri-close-line text-xl" />
              </button>
            </div>
            <div className="ti-modal-body px-4 py-4 overflow-y-auto flex-1">
              {modulesLoading ? (
                <p className="text-[0.8125rem] text-defaulttextcolor/50">Loading modules…</p>
              ) : allModules.length === 0 ? (
                <p className="text-[0.8125rem] text-defaulttextcolor/50">No training modules available.</p>
              ) : (
                <div className="border border-gray-200 dark:border-gray-700 rounded-md max-h-64 overflow-y-auto p-2 space-y-1">
                  {allModules.map((mod) => (
                    <label
                      key={mod.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-black/20 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={selectedModuleIds.includes(mod.id)}
                        onChange={() => toggleModuleId(mod.id)}
                      />
                      <span className="text-[0.8125rem]">{mod.moduleName}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="ti-modal-footer px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
              <button type="button" className="ti-btn ti-btn-light" onClick={closeManageModules} disabled={savingModules}>
                Cancel
              </button>
              <button
                type="button"
                className="ti-btn ti-btn-primary-full"
                onClick={() => void handleSaveModules()}
                disabled={savingModules}
              >
                {savingModules ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </Fragment>
  )
}
