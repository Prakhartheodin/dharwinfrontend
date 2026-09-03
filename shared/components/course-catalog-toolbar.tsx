"use client"

import React from "react"
import CourseCatalogSortDropdown, {
  type CourseCatalogSortBy,
} from "@/shared/components/course-catalog-sort-dropdown"

type FilterKey = "category" | "progress" | "instructor"

type CourseCatalogToolbarProps = {
  searchQuery: string
  searchPlaceholder: string
  onSearchQueryChange: (value: string) => void
  categories: string[]
  categoryFilter: string
  onCategoryFilterChange: (value: string) => void
  progressFilter: string
  onProgressFilterChange: (value: string) => void
  instructors: string[]
  instructorFilter: string
  onInstructorFilterChange: (value: string) => void
  sortBy: string
  openSortDropdown: boolean
  onOpenSortChange: (open: boolean) => void
  onSortChange: (sortBy: CourseCatalogSortBy) => void
  openFilter: FilterKey | null
  onOpenFilterChange: (filter: FilterKey | null) => void
}

/** Filter chips: white fill + visible border. */
const CHIP =
  "ti-btn !mb-0 !py-1.5 !px-2.5 !text-[0.75rem] shrink-0 rounded-md border border-solid !border-[#c5cad1] !bg-white !text-[#1c1d1f] shadow-none hover:!bg-[#f4f5f6] dark:!border-white/20 dark:!bg-[#1c1d1f] dark:!text-white dark:hover:!bg-white/10"
const CHIP_ACTIVE =
  "!border-primary !bg-primary/15 !text-primary hover:!bg-primary/20 hover:!text-primary"
const MENU =
  "absolute left-0 top-full mt-1.5 z-[201] min-w-[12.5rem] max-h-[17.5rem] overflow-y-auto rounded-md border border-solid border-defaultborder/70 bg-white py-1 shadow-lg dark:border-defaultborder/20 dark:bg-[#1c1d1f]"
const MENU_ITEM =
  "ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] flex w-full items-center justify-between gap-3 text-left"

/**
 * Visible label for the progress chip given the current filter value.
 */
function progressChipLabel(progressFilter: string): string {
  if (progressFilter === "not-started") return "Not started"
  if (progressFilter === "in-progress") return "In progress"
  if (progressFilter === "completed") return "Completed"
  return "Progress"
}

type FilterMenuProps = {
  iconClass: string
  label: string
  ariaLabel: string
  isOpen: boolean
  isActive: boolean
  onToggle: () => void
  onClose: () => void
  children: React.ReactNode
}

/**
 * Meetings-style outlined filter chip (leading Remix icon + label + caret) with a dropdown menu.
 */
function FilterMenu({
  iconClass,
  label,
  ariaLabel,
  isOpen,
  isActive,
  onToggle,
  onClose,
  children,
}: FilterMenuProps) {
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        onClick={onToggle}
        className={isActive ? `${CHIP} ${CHIP_ACTIVE}` : CHIP}
      >
        <i className={`${iconClass} me-1 align-middle font-semibold`} aria-hidden />
        <span className="max-w-[10rem] truncate">{label}</span>
        <i className="ri-arrow-down-s-line ms-1 inline-block align-middle" aria-hidden />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[200]" aria-hidden onClick={onClose} />
          <div role="listbox" aria-label={ariaLabel} className={MENU}>
            {children}
          </div>
        </>
      )}
    </div>
  )
}

type MenuOptionProps = {
  label: string
  selected: boolean
  onSelect: () => void
}

/**
 * Single option row inside a catalog filter menu.
 */
function MenuOption({ label, selected, onSelect }: MenuOptionProps) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      className={`${MENU_ITEM} ${selected ? "font-semibold bg-primary/10 text-primary" : ""}`}
    >
      {label}
      {selected ? <i className="ti ti-check text-[0.875rem]" aria-hidden /> : null}
    </button>
  )
}

/**
 * Filter, search, and sort bar for candidate My Courses and agent Curriculum.
 */
export default function CourseCatalogToolbar({
  searchQuery,
  searchPlaceholder,
  onSearchQueryChange,
  categories,
  categoryFilter,
  onCategoryFilterChange,
  progressFilter,
  onProgressFilterChange,
  instructors,
  instructorFilter,
  onInstructorFilterChange,
  sortBy,
  openSortDropdown,
  onOpenSortChange,
  onSortChange,
  openFilter,
  onOpenFilterChange,
}: CourseCatalogToolbarProps) {
  /**
   * Opens one filter menu and closes the others, including sort.
   */
  const toggleFilter = (key: FilterKey) => {
    onOpenSortChange(false)
    onOpenFilterChange(openFilter === key ? null : key)
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      <div className="relative min-w-[16rem] max-w-md flex-1">
        <i
          className="ti ti-search pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-[0.875rem] text-[#6a6f73] dark:text-white/50"
          aria-hidden
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          onFocus={() => {
            onOpenFilterChange(null)
            onOpenSortChange(false)
          }}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="form-control !h-auto w-full !min-h-0 !py-1.5 !ps-9 !pe-9 !text-[0.75rem] border border-solid !border-[#c5cad1] !bg-white dark:!border-white/20 dark:!bg-[#1c1d1f]"
        />
        {searchQuery ? (
          <button
            type="button"
            onClick={() => onSearchQueryChange("")}
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-[#6a6f73] hover:bg-black/5 hover:text-[#1c1d1f] dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Clear search"
          >
            <i className="ti ti-x text-[0.9375rem]" aria-hidden />
          </button>
        ) : null}
      </div>
      <FilterMenu
          iconClass="ri-price-tag-3-line"
          label={categoryFilter || "Categories"}
          ariaLabel="Filter by category"
          isOpen={openFilter === "category"}
          isActive={Boolean(categoryFilter)}
          onToggle={() => toggleFilter("category")}
          onClose={() => onOpenFilterChange(null)}
        >
          <MenuOption
            label="All categories"
            selected={!categoryFilter}
            onSelect={() => {
              onCategoryFilterChange("")
              onOpenFilterChange(null)
            }}
          />
          {categories.map((cat) => (
            <MenuOption
              key={cat}
              label={cat}
              selected={categoryFilter === cat}
              onSelect={() => {
                onCategoryFilterChange(cat)
                onOpenFilterChange(null)
              }}
            />
          ))}
        </FilterMenu>
        <FilterMenu
          iconClass="ri-donut-chart-line"
          label={progressChipLabel(progressFilter)}
          ariaLabel="Filter by progress"
          isOpen={openFilter === "progress"}
          isActive={Boolean(progressFilter)}
          onToggle={() => toggleFilter("progress")}
          onClose={() => onOpenFilterChange(null)}
        >
          <MenuOption
            label="All"
            selected={!progressFilter}
            onSelect={() => {
              onProgressFilterChange("")
              onOpenFilterChange(null)
            }}
          />
          <MenuOption
            label="Not started"
            selected={progressFilter === "not-started"}
            onSelect={() => {
              onProgressFilterChange("not-started")
              onOpenFilterChange(null)
            }}
          />
          <MenuOption
            label="In progress"
            selected={progressFilter === "in-progress"}
            onSelect={() => {
              onProgressFilterChange("in-progress")
              onOpenFilterChange(null)
            }}
          />
          <MenuOption
            label="Completed"
            selected={progressFilter === "completed"}
            onSelect={() => {
              onProgressFilterChange("completed")
              onOpenFilterChange(null)
            }}
          />
        </FilterMenu>
        <FilterMenu
          iconClass="ri-user-line"
          label={instructorFilter || "Instructor"}
          ariaLabel="Filter by instructor"
          isOpen={openFilter === "instructor"}
          isActive={Boolean(instructorFilter)}
          onToggle={() => toggleFilter("instructor")}
          onClose={() => onOpenFilterChange(null)}
        >
          <MenuOption
            label="All instructors"
            selected={!instructorFilter}
            onSelect={() => {
              onInstructorFilterChange("")
              onOpenFilterChange(null)
            }}
          />
          {instructors.map((inst) => (
            <MenuOption
              key={inst}
              label={inst}
              selected={instructorFilter === inst}
              onSelect={() => {
                onInstructorFilterChange(inst)
                onOpenFilterChange(null)
              }}
            />
          ))}
        </FilterMenu>
      <CourseCatalogSortDropdown
        sortBy={sortBy}
        open={openSortDropdown}
        onOpenChange={(open) => {
          if (open) onOpenFilterChange(null)
          onOpenSortChange(open)
        }}
        onSortChange={onSortChange}
      />
    </div>
  )
}
