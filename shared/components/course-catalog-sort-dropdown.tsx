"use client"

import React from "react"

export type CourseCatalogSortBy = "recent" | "title" | "title-desc"

export const COURSE_CATALOG_SORT_OPTIONS: { value: CourseCatalogSortBy; label: string }[] = [
  { value: "recent", label: "Recently Accessed" },
  { value: "title", label: "Title A-Z" },
  { value: "title-desc", label: "Title Z-A" },
]

type CourseCatalogSortDropdownProps = {
  sortBy: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSortChange: (sortBy: CourseCatalogSortBy) => void
}

/**
 * Label shown on the catalog sort trigger for the active sort value.
 */
export function getCourseCatalogSortLabel(sortBy: string): string {
  return COURSE_CATALOG_SORT_OPTIONS.find((option) => option.value === sortBy)?.label ?? "Recently Accessed"
}

/**
 * Shared recent / A-Z / Z-A sort menu for candidate My Courses and agent Curriculum.
 */
export default function CourseCatalogSortDropdown({
  sortBy,
  open,
  onOpenChange,
  onSortChange,
}: CourseCatalogSortDropdownProps) {
  return (
    <div className="relative shrink-0 z-[102] overflow-visible">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Sort courses: ${getCourseCatalogSortLabel(sortBy)}`}
        onClick={() => onOpenChange(!open)}
        className="ti-btn !mb-0 !py-1.5 !px-2.5 !text-[0.75rem] shrink-0 rounded-md border border-solid !border-[#c5cad1] !bg-white !text-[#1c1d1f] hover:!bg-[#f4f5f6] dark:!border-white/20 dark:!bg-[#1c1d1f] dark:!text-white dark:hover:!bg-white/10"
      >
        <i className="ri-arrow-up-down-line me-1 align-middle font-semibold" aria-hidden />
        <span className="whitespace-nowrap">{getCourseCatalogSortLabel(sortBy)}</span>
        <i className="ri-arrow-down-s-line ms-1 inline-block align-middle" aria-hidden />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[200]" aria-hidden onClick={() => onOpenChange(false)} />
          <ul
            role="listbox"
            aria-label="Sort courses"
            className="absolute right-0 top-full z-[201] mt-1.5 min-w-[12.5rem] rounded-md border border-solid border-defaultborder/70 bg-white py-1 shadow-lg dark:border-defaultborder/20 dark:bg-[#1c1d1f]"
          >
            {COURSE_CATALOG_SORT_OPTIONS.map((option) => (
              <li key={option.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={sortBy === option.value}
                  onClick={() => {
                    onSortChange(option.value)
                    onOpenChange(false)
                  }}
                  className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] w-full text-left ${
                    sortBy === option.value ? "font-semibold bg-primary/10 text-primary" : ""
                  }`}
                >
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
