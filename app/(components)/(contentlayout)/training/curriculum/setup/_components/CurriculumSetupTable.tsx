"use client"

import React, { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
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
import { pruneSelectedFolderIds } from "../_lib/folderFilter"
import {
  SETUP_PAGE_SIZE_OPTIONS,
  type SetupSortField,
  areSetupListQueryStringsEquivalent,
  buildSetupListHref,
  cycleSetupSort,
  parseSetupListState,
  setupStateAfterFilterChange,
  toSetupApiSortBy,
} from "../_lib/setup-list-query"
import PositionRow, { type PositionFolderChip } from "./PositionRow"
import FoldersDrawer from "./FoldersDrawer"
import FoldersFilterBar from "./FoldersFilterBar"
import BulkAssignDialog from "./BulkAssignDialog"

export interface CurriculumSetupTableProps {
  initialDrawerOpen?: boolean
}

function positionIdOf(pos: PositionRosterItem): string {
  return pos.id || (pos as { _id?: string })._id || ""
}

const SEARCH_DEBOUNCE_MS = 350

export default function CurriculumSetupTable({
  initialDrawerOpen = false,
}: CurriculumSetupTableProps) {
  const auth = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const canViewPositions = hasPermission(auth, "view_training_positions")
  const canViewCategories = hasPermission(auth, "view_training_categories")
  const canEditPosition = hasPermission(auth, "edit_training_position")
  const canEditModule = hasPermission(auth, "edit_training_module")
  const canManageModules = canEditModule || canEditPosition

  const listState = useMemo(() => parseSetupListState(searchParams), [searchParams])

  const [positions, setPositions] = useState<PositionRosterItem[]>([])
  const [totalResults, setTotalResults] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [categories, setCategories] = useState<Category[]>([])
  const [allModules, setAllModules] = useState<TrainingModule[]>([])
  const [mentors, setMentors] = useState<Mentor[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [searchDraft, setSearchDraft] = useState(listState.search)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(initialDrawerOpen)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkPositions, setBulkPositions] = useState<PositionRosterItem[]>([])

  const [manageTarget, setManageTarget] = useState<PositionRosterItem | null>(null)
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([])
  const [modulesLoading, setModulesLoading] = useState(false)
  const [savingModules, setSavingModules] = useState(false)

  const fetchRequestIdRef = useRef(0)
  const searchDebounceRef = useRef<number | null>(null)
  const hasLoadedOnceRef = useRef(false)

  const replaceListUrl = useCallback(
    (next: ReturnType<typeof parseSetupListState>, historyMode: "replace" | "push") => {
      const href = buildSetupListHref(pathname, next, searchParams)
      const current = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`
      if (
        areSetupListQueryStringsEquivalent(
          href.includes("?") ? href.slice(href.indexOf("?")) : "",
          current.includes("?") ? current.slice(current.indexOf("?")) : ""
        )
      ) {
        return
      }
      if (historyMode === "replace") router.replace(href, { scroll: false })
      else router.push(href, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  const fetchPositions = useCallback(async () => {
    const requestId = ++fetchRequestIdRef.current
    const isFirst = !hasLoadedOnceRef.current
    if (isFirst) setInitialLoading(true)
    else setRefreshing(true)
    setLoadError(null)
    try {
      const res = await positionsApi.getPositionRoster({
        page: listState.page,
        limit: listState.limit,
        search: listState.search.trim() || undefined,
        folderIds: listState.folderIds.length ? listState.folderIds.join(",") : undefined,
        sortBy: toSetupApiSortBy(listState.sortBy),
      })
      if (requestId !== fetchRequestIdRef.current) return
      setPositions(res.results ?? [])
      setTotalResults(res.totalResults ?? 0)
      setTotalPages(Math.max(1, res.totalPages ?? 1))
      hasLoadedOnceRef.current = true
    } catch (err) {
      if (requestId !== fetchRequestIdRef.current) return
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : "Failed to load positions."
      setLoadError(msg)
      if (!hasLoadedOnceRef.current) {
        setPositions([])
        setTotalResults(0)
      }
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
      if (requestId === fetchRequestIdRef.current) {
        setInitialLoading(false)
        setRefreshing(false)
      }
    }
  }, [listState.page, listState.limit, listState.search, listState.folderIds, listState.sortBy])

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
    return () => {
      fetchRequestIdRef.current += 1
    }
  }, [fetchPositions])

  useEffect(() => {
    void fetchCategories()
    void fetchModules()
    void fetchMentors()
  }, [fetchCategories, fetchModules, fetchMentors])

  // Keep search input in sync when Back/Forward / bookmark restores the URL.
  useEffect(() => {
    setSearchDraft(listState.search)
  }, [listState.search])

  // Drop stale folder ids from the URL after categories refresh.
  useEffect(() => {
    if (categories.length === 0 || listState.folderIds.length === 0) return
    const pruned = pruneSelectedFolderIds(listState.folderIds, categories)
    if (pruned === listState.folderIds || pruned.length === listState.folderIds.length) return
    replaceListUrl(
      setupStateAfterFilterChange(listState, { folderIds: pruned }),
      "replace"
    )
  }, [categories, listState, replaceListUrl])

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

  const hasActiveFilters =
    Boolean(listState.search.trim()) || listState.folderIds.length > 0

  const clearFilters = () => {
    setSearchDraft("")
    replaceListUrl(
      setupStateAfterFilterChange(listState, { search: "", folderIds: [] }),
      "push"
    )
  }

  const toggleFolder = (id: string) => {
    const nextIds = listState.folderIds.includes(id)
      ? listState.folderIds.filter((x) => x !== id)
      : [...listState.folderIds, id]
    replaceListUrl(setupStateAfterFilterChange(listState, { folderIds: nextIds }), "push")
  }

  const toggleSort = (field: SetupSortField) => {
    replaceListUrl(
      setupStateAfterFilterChange(listState, { sortBy: cycleSetupSort(listState.sortBy, field) }),
      "push"
    )
  }

  const setPage = (page: number) => {
    replaceListUrl({ ...listState, page: Math.max(1, page) }, "push")
  }

  const setPageSize = (limit: number) => {
    replaceListUrl(setupStateAfterFilterChange(listState, { limit }), "push")
  }

  // Debounce search draft → URL (replace, so keystrokes are not history entries).
  useEffect(() => {
    if (searchDraft === listState.search) return
    if (searchDebounceRef.current != null) window.clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = window.setTimeout(() => {
      searchDebounceRef.current = null
      replaceListUrl(setupStateAfterFilterChange(listState, { search: searchDraft }), "replace")
    }, SEARCH_DEBOUNCE_MS)
    return () => {
      if (searchDebounceRef.current != null) window.clearTimeout(searchDebounceRef.current)
    }
  }, [searchDraft, listState, replaceListUrl])

  const sortIcon = (field: string) =>
    listState.sortBy === `${field}:asc`
      ? "ri-arrow-up-s-line"
      : listState.sortBy === `${field}:desc`
        ? "ri-arrow-down-s-line"
        : "ri-arrow-up-down-line"

  const isActiveSort = (field: string) => Boolean(listState.sortBy?.startsWith(`${field}:`))

  const sortAriaSort = (field: string): "none" | "ascending" | "descending" => {
    if (listState.sortBy === `${field}:asc`) return "ascending"
    if (listState.sortBy === `${field}:desc`) return "descending"
    return "none"
  }

  const sortAriaLabel = (field: SetupSortField) => {
    const noun = field === "name" ? "Name" : "Count"
    const state = sortAriaSort(field)
    if (state === "ascending") return `${noun}, sorted ascending`
    if (state === "descending") return `${noun}, sorted descending`
    return `${noun}, not sorted`
  }

  const sortBtnClass = (field: string) =>
    `inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-md px-1.5 py-1 text-[0.68rem] font-semibold leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
      isActiveSort(field)
        ? "bg-primary/10 text-primary"
        : "text-defaulttextcolor/70 hover:bg-primary/5 hover:text-primary"
    }`

  const patchPositionAutoEnroll = (positionId: string, autoEnrollNewHires: boolean) => {
    setPositions((prev) =>
      prev.map((pos) =>
        positionIdOf(pos) === positionId ? { ...pos, autoEnrollNewHires } : pos
      )
    )
  }

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

  const openBulkAssign = async () => {
    try {
      const res = await positionsApi.getPositionRoster()
      setBulkPositions(res.results ?? [])
      setBulkOpen(true)
    } catch (err) {
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : "Failed to load positions for bulk assign."
      await Swal.fire({
        icon: "error",
        title: "Bulk assign unavailable",
        text: msg,
        toast: true,
        position: "top-end",
        timer: 4000,
        showConfirmButton: false,
      })
    }
  }

  const currentPage = listState.page
  const pageSize = listState.limit
  const startIndex = totalResults === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endIndex = Math.min(currentPage * pageSize, totalResults)

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
              <label htmlFor="curriculum-setup-search" className="sr-only">
                Search positions or folders
              </label>
              <input
                id="curriculum-setup-search"
                type="search"
                className="form-control !w-auto !py-1 !ps-3 !pe-7 !text-[0.75rem]"
                placeholder="Search positions or folders"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
              />
              {searchDraft ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchDraft("")
                    replaceListUrl(
                      setupStateAfterFilterChange(listState, { search: "" }),
                      "push"
                    )
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
                onClick={() => void openBulkAssign()}
              >
                Bulk Assign
              </button>
            ) : null}
          </div>
        </div>

        {canViewCategories ? (
          <FoldersFilterBar
            categories={categories}
            selectedFolderIds={listState.folderIds}
            folderQuery={searchDraft}
            onToggleFolder={toggleFolder}
            onClearFolders={() => {
              replaceListUrl(
                setupStateAfterFilterChange(listState, { folderIds: [] }),
                "push"
              )
            }}
          />
        ) : null}

        <div className="box-body !p-0 flex-1 flex flex-col overflow-hidden">
          {initialLoading ? (
            <div className="space-y-2 p-4" role="status" aria-busy="true">
              <span className="sr-only">Loading positions…</span>
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-11 animate-pulse rounded-md bg-black/5 motion-reduce:animate-none dark:bg-white/10"
                  style={{ animationDelay: `${i * 40}ms` }}
                  aria-hidden
                />
              ))}
            </div>
          ) : loadError && positions.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="font-medium text-defaulttextcolor dark:text-white">
                Could not load positions
              </p>
              <p className="mx-auto mt-1 max-w-md text-[0.8125rem] text-defaulttextcolor/65">
                {loadError}
              </p>
              <button
                type="button"
                className="ti-btn ti-btn-primary-full !mb-0 mt-3 !py-1.5 !px-3 !text-sm"
                onClick={() => void fetchPositions()}
              >
                Retry
              </button>
            </div>
          ) : totalResults === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="font-medium text-defaulttextcolor dark:text-white">
                {hasActiveFilters ? "No positions match your filters" : "No positions found"}
              </p>
              <p className="mx-auto mt-1 max-w-md text-[0.8125rem] text-defaulttextcolor/65">
                {hasActiveFilters
                  ? "Try a different search term, or clear the folder filters."
                  : "Positions appear once an employee carries a designation, or once one is added to the catalog."}
              </p>
              {hasActiveFilters ? (
                <button
                  type="button"
                  className="ti-btn ti-btn-light !mb-0 mt-3 !py-1.5 !px-3 !text-sm"
                  onClick={clearFilters}
                >
                  Clear filters
                </button>
              ) : null}
            </div>
          ) : (
            <div
              className={
                refreshing
                  ? "pointer-events-none opacity-60 transition-opacity"
                  : "transition-opacity"
              }
              aria-busy={refreshing}
            >
              <div className="table-responsive flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
                <table className="table min-w-full table-striped table-hover table-bordered border-gray-300 dark:border-gray-600">
                  <thead>
                    <tr className="bg-primary/10 dark:bg-primary/20 border-b border-gray-300 dark:border-gray-600">
                      <th
                        scope="col"
                        className="text-center sticky top-0 z-10 bg-gray-50 dark:bg-black/20 !w-[3rem]"
                      >
                        S.no.
                      </th>
                      <th
                        scope="col"
                        className="text-start sticky top-0 z-10 bg-gray-50 dark:bg-black/20"
                      >
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          <span className="shrink-0">Position</span>
                          <button
                            type="button"
                            className={sortBtnClass("name")}
                            onClick={() => toggleSort("name")}
                            aria-label={sortAriaLabel("name")}
                            aria-sort={sortAriaSort("name")}
                          >
                            Name <i className={`${sortIcon("name")} text-[0.9rem]`} aria-hidden />
                          </button>
                          <button
                            type="button"
                            className={sortBtnClass("employees")}
                            onClick={() => toggleSort("employees")}
                            aria-label={sortAriaLabel("employees")}
                            aria-sort={sortAriaSort("employees")}
                          >
                            Count{" "}
                            <i className={`${sortIcon("employees")} text-[0.9rem]`} aria-hidden />
                          </button>
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="text-start sticky top-0 z-10 bg-gray-50 dark:bg-black/20"
                      >
                        Folders
                      </th>
                      <th
                        scope="col"
                        className="text-start sticky top-0 z-10 bg-gray-50 dark:bg-black/20"
                      >
                        Courses
                      </th>
                      <th
                        scope="col"
                        className="text-start sticky top-0 z-10 bg-gray-50 dark:bg-black/20"
                      >
                        Employees
                      </th>
                      <th
                        scope="col"
                        className="text-start sticky top-0 z-10 bg-gray-50 dark:bg-black/20"
                      >
                        Auto-enrol
                      </th>
                      <th
                        scope="col"
                        className="text-center sticky top-0 z-10 bg-gray-50 dark:bg-black/20"
                      >
                        Manage
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map((pos, index) => {
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
                          onAutoEnrollChange={patchPositionAutoEnroll}
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
                onChange={(e) => setPageSize(Number(e.target.value))}
                aria-label="Entries per page"
                disabled={refreshing}
              >
                {SETUP_PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    Show {size}
                  </option>
                ))}
              </select>
              <span className="text-[0.8125rem] text-defaulttextcolor/70">
                Showing {startIndex} to {endIndex} of {totalResults} entries
              </span>
            </div>
            <div className="ms-auto flex items-center gap-3">
              <span className="text-[0.8125rem] text-defaulttextcolor/70" aria-live="polite">
                Page {currentPage} of {Math.max(1, totalPages)}
              </span>
              <nav aria-label="Page navigation" className="pagination-style-4">
                <ul className="ti-pagination mb-0">
                  <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                    <button
                      className="page-link px-3 py-[0.375rem]"
                      onClick={() => setPage(currentPage - 1)}
                      disabled={currentPage === 1 || refreshing}
                    >
                      Prev
                    </button>
                  </li>
                  <li
                    className={`page-item ${currentPage >= Math.max(1, totalPages) ? "disabled" : ""}`}
                  >
                    <button
                      className="page-link px-3 py-[0.375rem] text-primary"
                      onClick={() => setPage(currentPage + 1)}
                      disabled={currentPage >= Math.max(1, totalPages) || refreshing}
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
        positions={bulkPositions}
        onClose={() => setBulkOpen(false)}
        onDone={() => void refreshAll()}
      />

      {manageTarget
        ? createPortal(
            <div
              className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="manage-modules-title"
            >
              <div
                className="absolute inset-0 bg-black/60 dark:bg-black/75"
                onClick={closeManageModules}
                aria-hidden
              />
              <div className="relative z-[1] ti-modal-content flex max-h-[90vh] w-full max-w-md flex-col rounded-lg bg-white shadow-xl dark:bg-bodybg">
                <div className="ti-modal-header flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                  <h6 id="manage-modules-title" className="ti-modal-title text-lg font-semibold">
                    Modules for {manageTarget.name}
                  </h6>
                  <button
                    type="button"
                    className="ti-modal-close-btn rounded-lg p-2"
                    aria-label="Close manage modules"
                    onClick={closeManageModules}
                  >
                    <i className="ri-close-line text-xl" aria-hidden />
                  </button>
                </div>
                <div className="ti-modal-body flex-1 overflow-y-auto px-4 py-4">
                  {modulesLoading ? (
                    <p className="text-[0.8125rem] text-defaulttextcolor/50">Loading modules…</p>
                  ) : allModules.length === 0 ? (
                    <p className="text-[0.8125rem] text-defaulttextcolor/50">
                      No training modules available.
                    </p>
                  ) : (
                    <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-gray-200 p-2 dark:border-gray-700">
                      {allModules.map((mod) => (
                        <label
                          key={mod.id}
                          className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-black/20"
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
                <div className="ti-modal-footer flex justify-end gap-2 border-t border-gray-200 px-4 py-3 dark:border-gray-700">
                  <button
                    type="button"
                    className="ti-btn ti-btn-light"
                    onClick={closeManageModules}
                    disabled={savingModules}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="ti-btn ti-btn-primary-full disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => void handleSaveModules()}
                    disabled={savingModules}
                  >
                    {savingModules ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </Fragment>
  )
}
